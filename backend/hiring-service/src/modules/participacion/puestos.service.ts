import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

import { Accion } from '../../auth/alcance';
import { AlcanceService } from '../../auth/alcance.service';
import { HiringAccess } from '../../auth/hiring-access';
import { accionQueHace } from '../../auth/la-hace';
import { PERMISO_PROCESO_ASIGNAR, tienePermiso } from '../../auth/permisos';
import { AsignacionPuesto, PuestoProceso } from '../../entities/puesto-proceso.entity';
import { ParticipacionProceso } from '../../entities/participacion-proceso.entity';
import { Proceso } from '../../entities/proceso.entity';
import { Trazabilidad } from '../../entities/trazabilidad.entity';
import {
  AprobacionGuardada,
  LaHaceGuardada,
  asignacionQueRige,
  filasDeVersion,
  versionActiva,
  versionBorrador,
  versionDelProceso,
} from '../../flujo/lectura';

/** Lo que hace un puesto en una actividad: hacerla o aprobarla. */
export interface UsoDePuesto {
  puestoId: string;
  numeral: string;
  nombreActividad: string;
  modalidad: string | null;
  como: 'HACE' | 'APRUEBA';
  /** El permiso que tiene que tener quien lo ocupe para hacer eso ahí. */
  accion: Exclude<Accion, 'ver'>;
}

/** Una cuenta que puede ocupar un puesto. */
export interface Candidato {
  usuarioId: string;
  usuarioNombre: string;
  personaId: string | null;
  nombre: string;
  email: string | null;
  /** Cuántos procesos lleva ya en ese puesto, para repartir con criterio. */
  procesosEnElPuesto: number;
}

const ACCION_NOMBRE: Record<string, string> = { editar: 'editar', aprobar: 'aprobar', decidir: 'decidir' };

/**
 * Los puestos del proceso (migración 109).
 *
 * Un puesto es un lugar que ocupa una persona en cada proceso. La Dirección
 * los crea en Configuración, las actividades apuntan a ellos para decir quién
 * las hace o quién aprueba un escalón, y en la 3.3 se pone a una persona en
 * cada uno.
 *
 * La regla de fondo: los permisos por etapa dicen quién PUEDE; el puesto dice
 * quién lo HACE en este proceso, y nunca da un permiso. Por eso los candidatos
 * de un puesto salen de los permisos de todo lo que el puesto hace, y quien lo
 * ocupa y pierde un permiso deja de poder actuar hasta que se le devuelva o
 * se reasigne.
 */
@Injectable()
export class PuestosService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly alcance: AlcanceService,
  ) {}

  // -------------------------------------------------------- configuración --

  async listar(incluirArchivados = false) {
    const puestos = await this.dataSource.getRepository(PuestoProceso).find({
      where: incluirArchivados ? {} : { activo: true },
      order: { orden: 'ASC', nombre: 'ASC' },
    });
    const usos = await this.usos();
    return puestos.map((p) => ({
      ...p,
      usos: usos.filter((u) => u.puestoId === p.id),
    }));
  }

  async crear(dto: { nombre: string; descripcion?: string | null; obligatorio?: boolean; orden?: number }, acceso: HiringAccess) {
    const nombre = this.nombreValido(dto.nombre);
    await this.exigirNombreLibre(nombre);
    const repo = this.dataSource.getRepository(PuestoProceso);
    return repo.save(
      repo.create({
        nombre,
        descripcion: dto.descripcion?.trim() || null,
        obligatorio: !!dto.obligatorio,
        orden: dto.orden ?? 100,
        activo: true,
        createdBy: acceso.userName,
        updatedBy: acceso.userName,
      }),
    );
  }

  async actualizar(
    id: string,
    dto: { nombre?: string; descripcion?: string | null; obligatorio?: boolean; orden?: number },
    acceso: HiringAccess,
  ) {
    const repo = this.dataSource.getRepository(PuestoProceso);
    const puesto = await repo.findOne({ where: { id, activo: true } });
    if (!puesto) throw new NotFoundException('Ese puesto no existe o está archivado');
    if (dto.nombre !== undefined) {
      const nombre = this.nombreValido(dto.nombre);
      if (nombre.toLowerCase() !== puesto.nombre.toLowerCase()) await this.exigirNombreLibre(nombre);
      puesto.nombre = nombre;
    }
    if (dto.descripcion !== undefined) puesto.descripcion = dto.descripcion?.trim() || null;
    if (dto.obligatorio !== undefined) puesto.obligatorio = dto.obligatorio;
    if (dto.orden !== undefined) puesto.orden = dto.orden;
    puesto.updatedBy = acceso.userName;
    return repo.save(puesto);
  }

  /**
   * Archiva el puesto. No se deja mientras alguna actividad lo use: quedaría
   * apuntando a un lugar que nadie puede ocupar, y la actividad sin quien la
   * haga. Primero se cambia la actividad, después se archiva.
   */
  async archivar(id: string, acceso: HiringAccess) {
    const repo = this.dataSource.getRepository(PuestoProceso);
    const puesto = await repo.findOne({ where: { id, activo: true } });
    if (!puesto) throw new NotFoundException('Ese puesto no existe o ya está archivado');
    const usos = (await this.usos()).filter((u) => u.puestoId === id);
    // Ni si lo usa la versión con la que corre algún proceso en curso: ahí
    // todavía hay quien lo ocupa y actúa por él.
    const enUso: { version: string }[] = await this.dataSource.query(
      `SELECT DISTINCT flujo_version_id::text AS version FROM hiring.procesos
        WHERE estado = 'EN_CURSO' AND flujo_version_id IS NOT NULL`,
    );
    for (const { version } of enUso) {
      usos.push(...(await this.usos(undefined, undefined, version)).filter((u) => u.puestoId === id));
    }
    if (usos.length) {
      throw new ConflictException(
        `El puesto ${puesto.nombre} todavía lo usan ${[...new Set(usos.map((u) => u.numeral))].join(', ')}: cámbialas antes de archivarlo`,
      );
    }
    puesto.activo = false;
    puesto.updatedBy = acceso.userName;
    await repo.save(puesto);
    return { archivado: true };
  }

  /**
   * Dónde se usa cada puesto: las actividades que hace y las que aprueba (un
   * escalón suelto o de una cadena), según una versión del flujo (111).
   *
   * - Sin `modalidad`: todo lo que dice la versión, general y por modalidad.
   * - Con `modalidad`: lo que rige en ella.
   * - Sin `versionId`: el borrador si lo hay, si no la activa —lo que se está
   *   configurando—. Para un proceso, la versión con la que corre.
   */
  async usos(modalidad?: string | null, em?: EntityManager, versionId?: string | null): Promise<UsoDePuesto[]> {
    const manager = em ?? this.dataSource.manager;
    const version = versionId ?? (await versionBorrador(manager)) ?? (await versionActiva(manager));
    const filas = await filasDeVersion(manager, version);
    const nombres = new Map<string, string>(
      (await manager.query(`SELECT numeral, nombre FROM hiring.actividades WHERE activa`)).map((f: any) => [f.numeral, f.nombre]),
    );
    const cadenas = new Map<string, { puestos?: string[] }[]>(
      (await manager.query(`SELECT id::text AS id, escalones FROM hiring.cadenas_aprobacion WHERE activa`)).map((f: any) => [
        f.id,
        f.escalones ?? [],
      ]),
    );
    const puestosDe = (a: AprobacionGuardada | null): string[] =>
      !a || a.tipo === 'NINGUNA'
        ? []
        : a.tipo === 'ESCALON'
          ? (a.puestos ?? [])
          : (cadenas.get(a.cadenaId) ?? []).flatMap((e) => e.puestos ?? []);

    const usos: UsoDePuesto[] = [];
    const sumar = (u: UsoDePuesto) => {
      if (!usos.some((x) => x.puestoId === u.puestoId && x.numeral === u.numeral && x.como === u.como && x.modalidad === u.modalidad)) {
        usos.push(u);
      }
    };
    const desde = (numeral: string, mod: string | null, laHace: LaHaceGuardada | null, aprobacion: AprobacionGuardada | null) => {
      const nombreActividad = nombres.get(numeral);
      if (!nombreActividad) return;
      if (laHace?.tipo === 'PUESTO') {
        sumar({ puestoId: laHace.puestoId, numeral, nombreActividad, modalidad: mod, como: 'HACE', accion: accionQueHace(numeral) });
      }
      for (const puestoId of new Set(puestosDe(aprobacion))) {
        sumar({ puestoId, numeral, nombreActividad, modalidad: mod, como: 'APRUEBA', accion: 'aprobar' });
      }
    };

    if (modalidad === undefined) {
      for (const f of filas) desde(f.numeral, f.modalidad, f.laHace, f.aprobacion);
    } else {
      for (const numeral of new Set(filas.map((f) => f.numeral))) {
        const rige = asignacionQueRige(filas, numeral, modalidad);
        desde(numeral, null, rige.laHace, rige.aprobacion);
      }
    }
    return usos;
  }

  /**
   * Lo que hay que arreglar en la configuración, dicho con lo que hay que
   * hacer: puestos que nadie puede ocupar porque ninguna cuenta tiene todos
   * los permisos que piden, y actividades que apuntan a un puesto archivado.
   */
  async diagnostico() {
    const puestos = await this.dataSource.getRepository(PuestoProceso).find();
    const usos = await this.usos();
    const problemas: { puestoId: string | null; numeral: string | null; mensaje: string }[] = [];

    for (const u of usos) {
      const puesto = puestos.find((p) => p.id === u.puestoId);
      if (!puesto || !puesto.activo) {
        problemas.push({
          puestoId: u.puestoId,
          numeral: u.numeral,
          mensaje: `La ${u.numeral} (${u.nombreActividad}) apunta a un puesto que ya no existe: elige otro en su ficha`,
        });
      }
    }

    for (const p of puestos.filter((x) => x.activo)) {
      const suyos = usos.filter((u) => u.puestoId === p.id);
      if (!suyos.length) continue;
      const candidatos = await this.idsCandidatos(suyos);
      if (!candidatos.length) {
        problemas.push({
          puestoId: p.id,
          numeral: null,
          mensaje: `Nadie puede ocupar el puesto ${p.nombre}: ninguna cuenta tiene a la vez ${this.permisosQuePide(suyos)}. Dalo en Permisos por etapa o quita alguna de esas actividades del puesto`,
        });
      }
    }
    return problemas;
  }

  // ------------------------------------------------------------ el proceso --

  /** Los puestos y quién los ocupa en el proceso, con lo que falta. */
  async delProceso(procesoId: string, acceso: HiringAccess) {
    const proceso = await this.exigirProceso(this.dataSource.manager, procesoId);
    const puestos = await this.dataSource
      .getRepository(PuestoProceso)
      .find({ where: { activo: true }, order: { orden: 'ASC', nombre: 'ASC' } });
    const asignaciones = await this.dataSource
      .getRepository(AsignacionPuesto)
      .find({ where: { procesoId }, order: { asignadoAt: 'DESC' } });
    const usos = await this.usos(proceso.modalidad ?? null, undefined, await versionDelProceso(this.dataSource.manager, procesoId));

    const lista = [];
    for (const p of puestos) {
      const suyos = usos.filter((u) => u.puestoId === p.id);
      const ocupa = asignaciones.find((a) => a.puestoId === p.id && a.estado === 'VIGENTE') ?? null;
      // Un puesto que en esta modalidad no hace nada y nadie ocupa no se enseña.
      if (!suyos.length && !ocupa && !p.obligatorio) continue;
      const faltan = ocupa ? await this.permisosQueLeFaltan(ocupa.usuarioId, suyos) : [];
      lista.push({
        id: p.id,
        nombre: p.nombre,
        descripcion: p.descripcion,
        obligatorio: p.obligatorio,
        usos: suyos.map((u) => ({ numeral: u.numeral, nombreActividad: u.nombreActividad, como: u.como })),
        ocupante: ocupa
          ? {
              usuarioId: ocupa.usuarioId,
              usuarioNombre: ocupa.usuarioNombre,
              nombre: ocupa.nombre,
              asignadoAt: ocupa.asignadoAt,
              asignadoPor: ocupa.asignadoPor,
              esMio: this.esDe(ocupa, acceso),
            }
          : null,
        /** Lo que le impide actuar a quien lo ocupa, dicho con lo que hay que hacer. */
        problema:
          ocupa && faltan.length
            ? `${ocupa.nombre} ya no puede ${faltan.join(', ')}: reasígnalo o devuélvele el permiso en Permisos por etapa`
            : null,
      });
    }

    return {
      puedeAsignar: await this.puedeAsignar(procesoId, acceso),
      puestos: lista,
      historial: asignaciones
        .filter((a) => a.estado === 'RELEVADO')
        .map((a) => ({
          puesto: puestos.find((p) => p.id === a.puestoId)?.nombre ?? 'Puesto archivado',
          nombre: a.nombre,
          asignadoAt: a.asignadoAt,
          relevadoAt: a.relevadoAt,
          relevadoPor: a.relevadoPor,
          motivoRelevo: a.motivoRelevo,
        })),
    };
  }

  /**
   * Quiénes pueden ocupar el puesto en este proceso: las cuentas que tienen
   * todos los permisos de lo que el puesto hace en su modalidad. Si el puesto
   * no hace nada todavía, cualquiera que vea la 3.3.
   */
  async candidatos(procesoId: string, puestoId: string, termino = ''): Promise<Candidato[]> {
    const proceso = await this.exigirProceso(this.dataSource.manager, procesoId);
    await this.exigirPuesto(puestoId);
    const usos = (
      await this.usos(proceso.modalidad ?? null, undefined, await versionDelProceso(this.dataSource.manager, procesoId))
    ).filter((u) => u.puestoId === puestoId);
    const ids = await this.idsCandidatos(usos);
    if (!ids.length) return [];

    return this.dataSource.query(
      `SELECT u.id_user::text AS "usuarioId",
              u.username      AS "usuarioNombre",
              p.id_person::text AS "personaId",
              COALESCE(p.nom_largo, p.nom_tercero, u.username) AS nombre,
              COALESCE(p.dir_email, u.username) AS email,
              (SELECT count(*) FROM hiring.asignaciones_puesto a
                 JOIN hiring.procesos x ON x.id = a.proceso_id AND x.estado = 'EN_CURSO'
                WHERE a.usuario_id = u.id_user AND a.puesto_id::text = $3 AND a.estado = 'VIGENTE')::int
                AS "procesosEnElPuesto"
         FROM auth."user" u
         LEFT JOIN auth.personas p ON p.id_person = u.id_person
        WHERE u.is_active = true
          AND u.id_user::text = ANY($1::text[])
          AND ($2 = ''
               OR COALESCE(p.nom_largo, p.nom_tercero, u.username) ILIKE '%' || $2 || '%'
               OR u.username ILIKE '%' || $2 || '%')
        ORDER BY nombre
        LIMIT 50`,
      [ids, termino.trim(), puestoId],
    );
  }

  /**
   * Pone a una persona en el puesto, o la cambia. Cambiar exige motivo y
   * releva a la anterior: respondió por su tramo.
   */
  async asignar(procesoId: string, puestoId: string, usuarioId: string, motivo: string | undefined, acceso: HiringAccess) {
    await this.dataSource.transaction(async (em) => {
      const proceso = await this.exigirProceso(em, procesoId, true);
      await this.exigirQuePuedaAsignar(em, procesoId, acceso);
      const puesto = await this.exigirPuesto(puestoId, em);

      const usos = (await this.usos(proceso.modalidad ?? null, em, await versionDelProceso(em, procesoId))).filter(
        (u) => u.puestoId === puestoId,
      );
      const candidatos = await this.idsCandidatos(usos);
      if (!candidatos.includes(usuarioId)) {
        throw new BadRequestException(
          `Esa persona no puede ocupar el puesto ${puesto.nombre}: le falta poder ${this.permisosQuePide(usos)}`,
        );
      }

      const repo = em.getRepository(AsignacionPuesto);
      const actual = await repo.findOne({ where: { procesoId, puestoId, estado: 'VIGENTE' } });
      if (actual?.usuarioId === usuarioId) {
        throw new ConflictException('Esa persona ya ocupa ese puesto en el proceso');
      }
      if (actual) {
        const razon = (motivo ?? '').trim();
        if (razon.length < 10) throw new BadRequestException('Explica por qué cambia quien ocupa el puesto');
        actual.estado = 'RELEVADO';
        actual.relevadoAt = new Date();
        actual.relevadoPor = acceso.userName;
        actual.motivoRelevo = razon;
        await repo.save(actual);
      }

      const [cuenta] = await em.query(
        `SELECT u.id_user::text AS "usuarioId", u.username AS "usuarioNombre", p.id_person::text AS "personaId",
                COALESCE(p.nom_largo, p.nom_tercero, u.username) AS nombre
           FROM auth."user" u LEFT JOIN auth.personas p ON p.id_person = u.id_person
          WHERE u.id_user::text = $1 AND u.is_active = true`,
        [usuarioId],
      );
      if (!cuenta) throw new NotFoundException('Esa cuenta no existe o está inactiva');

      const nueva = await repo.save(
        repo.create({
          procesoId,
          puestoId,
          usuarioId: cuenta.usuarioId,
          usuarioNombre: cuenta.usuarioNombre,
          personaId: cuenta.personaId ?? null,
          // Copia del nombre: se le encargó a esa persona ese día.
          nombre: cuenta.nombre,
          estado: 'VIGENTE',
          asignadoPor: acceso.userName,
        }),
      );

      // Si un escalón de ese puesto ya espera decisión, al que entra le toca
      // decidir ya: el aviso se lo dice.
      const [pendiente] = await em.query(
        `SELECT pa.numeral
           FROM hiring.proceso_actividades pa
           JOIN hiring.aprobaciones r ON r.proceso_actividad_id = pa.id AND r.estado = 'EN_CURSO'
           JOIN hiring.aprobacion_escalones e ON e.aprobacion_id = r.id AND e.estado = 'PENDIENTE'
          WHERE pa.proceso_id = $1 AND pa.estado = 'EN_REVISION' AND $2 = ANY (e.puestos)
          LIMIT 1`,
        [procesoId, puestoId],
      );

      await this.traza(em, procesoId, nueva.id, 'DESIGNAR', acceso, {
        pendiente: pendiente?.numeral ?? null,
        puesto: puesto.nombre,
        puestoId,
        designado: cuenta.nombre,
        anterior: actual?.nombre ?? null,
        motivo: actual ? motivo?.trim() : null,
        // Para los avisos: lo que le toca hacer al que entra.
        numerales: [...new Set(usos.map((u) => u.numeral))],
      });
    });
    return this.delProceso(procesoId, acceso);
  }

  /** Deja el puesto vacío, con motivo. Pasa: la persona se va de la entidad. */
  async quitar(procesoId: string, puestoId: string, motivo: string, acceso: HiringAccess) {
    await this.dataSource.transaction(async (em) => {
      await this.exigirProceso(em, procesoId, true);
      await this.exigirQuePuedaAsignar(em, procesoId, acceso);
      const puesto = await this.exigirPuesto(puestoId, em);
      const repo = em.getRepository(AsignacionPuesto);
      const actual = await repo.findOne({ where: { procesoId, puestoId, estado: 'VIGENTE' } });
      if (!actual) throw new NotFoundException(`Nadie ocupa el puesto ${puesto.nombre} en este proceso`);
      const razon = (motivo ?? '').trim();
      if (razon.length < 10) throw new BadRequestException('Explica por qué el puesto queda vacío');
      actual.estado = 'RELEVADO';
      actual.relevadoAt = new Date();
      actual.relevadoPor = acceso.userName;
      actual.motivoRelevo = razon;
      await repo.save(actual);
      await this.traza(em, procesoId, actual.id, 'QUITAR', acceso, {
        puesto: puesto.nombre,
        quien: actual.nombre,
        motivo: razon,
      });
    });
    return this.delProceso(procesoId, acceso);
  }

  /** Los procesos en los que quien pregunta ocupa algún puesto. */
  async procesosDe(acceso: HiringAccess): Promise<string[]> {
    const id = (acceso.userId ?? '').trim();
    const nombre = (acceso.userName ?? '').trim();
    if (!id && !nombre) return [];
    const filas: { proceso_id: string }[] = await this.dataSource.query(
      `SELECT DISTINCT proceso_id FROM hiring.asignaciones_puesto
        WHERE estado = 'VIGENTE'
          AND (($1 <> '' AND usuario_id::text = $1) OR ($2 <> '' AND LOWER(usuario_nombre) = LOWER($2)))`,
      [id, nombre],
    );
    return filas.map((f) => f.proceso_id);
  }

  /** Quién ocupa cada puesto en cada proceso del listado. */
  async ocupantesDe(procesoIds: string[]) {
    if (!procesoIds.length) return new Map<string, { puesto: string; nombre: string; usuarioId: string; usuarioNombre: string }[]>();
    const filas: { proceso_id: string; puesto: string; nombre: string; usuario_id: string; usuario_nombre: string }[] =
      await this.dataSource.query(
        `SELECT a.proceso_id, pu.nombre AS puesto, a.nombre, a.usuario_id::text AS usuario_id, a.usuario_nombre
           FROM hiring.asignaciones_puesto a
           JOIN hiring.puestos_proceso pu ON pu.id = a.puesto_id
          WHERE a.estado = 'VIGENTE' AND a.proceso_id = ANY($1::uuid[])
          ORDER BY pu.orden, pu.nombre`,
        [procesoIds],
      );
    const mapa = new Map<string, { puesto: string; nombre: string; usuarioId: string; usuarioNombre: string }[]>();
    for (const f of filas) {
      const lista = mapa.get(f.proceso_id) ?? [];
      lista.push({ puesto: f.puesto, nombre: f.nombre, usuarioId: f.usuario_id, usuarioNombre: f.usuario_nombre });
      mapa.set(f.proceso_id, lista);
    }
    return mapa;
  }

  // ----------------------------------------------------------- auxiliares --

  /** Las cuentas que tienen todos los permisos que piden esos usos. */
  private async idsCandidatos(usos: UsoDePuesto[]): Promise<string[]> {
    const pedidos = [...new Map(usos.map((u) => [`${u.accion}|${u.numeral}`, u])).values()];
    if (!pedidos.length) return this.alcance.cuentasQuePueden('ver', '3.3');
    let ids: string[] | null = null;
    for (const u of pedidos) {
      const pueden = new Set(await this.alcance.cuentasQuePueden(u.accion, u.numeral));
      ids = ids === null ? [...pueden] : ids.filter((id) => pueden.has(id));
      if (!ids.length) break;
    }
    return ids ?? [];
  }

  private async permisosQueLeFaltan(usuarioId: string, usos: UsoDePuesto[]): Promise<string[]> {
    const faltan: string[] = [];
    for (const u of usos) {
      const pueden = await this.alcance.cuentasQuePueden(u.accion, u.numeral);
      if (!pueden.includes(usuarioId)) faltan.push(`${ACCION_NOMBRE[u.accion]} la ${u.numeral}`);
    }
    return [...new Set(faltan)];
  }

  private permisosQuePide(usos: UsoDePuesto[]): string {
    return [...new Set(usos.map((u) => `${ACCION_NOMBRE[u.accion]} la ${u.numeral}`))].join(', ');
  }

  private nombreValido(nombre: string): string {
    const limpio = (nombre ?? '').trim();
    if (limpio.length < 3) throw new BadRequestException('El puesto necesita un nombre de al menos tres letras');
    if (limpio.length > 120) throw new BadRequestException('El nombre del puesto es demasiado largo');
    return limpio;
  }

  private async exigirNombreLibre(nombre: string) {
    const [otro] = await this.dataSource.query(
      `SELECT 1 FROM hiring.puestos_proceso WHERE activo AND lower(nombre) = lower($1)`,
      [nombre],
    );
    if (otro) throw new ConflictException(`Ya hay un puesto llamado ${nombre}`);
  }

  private async exigirPuesto(id: string, em?: EntityManager) {
    const puesto = await (em ?? this.dataSource.manager)
      .getRepository(PuestoProceso)
      .findOne({ where: { id, activo: true } });
    if (!puesto) throw new NotFoundException('Ese puesto no existe o está archivado');
    return puesto;
  }

  private async exigirProceso(em: EntityManager, procesoId: string, bloquear = false) {
    const consulta = em.getRepository(Proceso).createQueryBuilder('p').where('p.id = :procesoId', { procesoId });
    if (bloquear) consulta.setLock('pessimistic_write');
    const proceso = await consulta.getOne();
    if (!proceso) throw new NotFoundException('El proceso no existe');
    return proceso;
  }

  private esDe(a: Pick<AsignacionPuesto, 'usuarioId' | 'usuarioNombre'>, acceso: Pick<HiringAccess, 'userId' | 'userName'>) {
    const igual = (x?: string | null, y?: string | null) =>
      !!x && !!y && x.trim().toLowerCase() === y.trim().toLowerCase();
    return igual(a.usuarioId, acceso.userId) || igual(a.usuarioNombre, acceso.userName);
  }

  /** Asigna quien tomó el proceso, o quien tiene el permiso de repartir. */
  private async puedeAsignar(procesoId: string, acceso: HiringAccess): Promise<boolean> {
    if (tienePermiso(acceso, PERMISO_PROCESO_ASIGNAR)) return true;
    const contratacion = await this.dataSource
      .getRepository(ParticipacionProceso)
      .findOne({ where: { procesoId, papel: 'CONTRATACION', estado: 'VIGENTE' } });
    return !!contratacion && this.esDe(contratacion, acceso);
  }

  private async exigirQuePuedaAsignar(em: EntityManager, procesoId: string, acceso: HiringAccess) {
    if (tienePermiso(acceso, PERMISO_PROCESO_ASIGNAR)) return;
    const contratacion = await em
      .getRepository(ParticipacionProceso)
      .findOne({ where: { procesoId, papel: 'CONTRATACION', estado: 'VIGENTE' } });
    if (!contratacion) {
      throw new ConflictException('Nadie ha tomado este proceso todavía: primero se toma de la bandeja y luego se asigna');
    }
    if (!this.esDe(contratacion, acceso)) {
      throw new ForbiddenException(`Este proceso lo lleva ${contratacion.nombre}: los puestos los asigna quien lo tomó`);
    }
  }

  private traza(
    em: EntityManager,
    procesoId: string,
    entidadId: string,
    accion: 'DESIGNAR' | 'QUITAR',
    acceso: HiringAccess,
    detalle: Record<string, unknown>,
  ) {
    return em.save(
      em.create(Trazabilidad, {
        procesoId,
        entidadId,
        entidad: 'asignacion_puesto',
        accion,
        detalle,
        usuarioNombre: acceso.userName,
        usuarioId: acceso.userId,
      } as Partial<Trazabilidad>),
    );
  }
}

