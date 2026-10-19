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
import {
  AprobacionGuardada,
  LaHaceGuardada,
  asignacionQueRige,
  filasDeVersion,
  versionActiva,
  versionBorrador,
} from '../../flujo/lectura';
import { DEPENDE_DE, SIN_PANEL } from '../notificaciones/secuencia';
import {
  ACTIVIDADES_QUE_ASIGNAN,
  NO_LA_HACE_UN_PUESTO,
  NUMERAL_QUE_ASIGNA_PUESTOS,
  CadenaParaValidar,
  DatosDeValidacion,
  ProblemaFlujo,
  escalonesDe,
  modoDeAsignacion,
  validarModalidad,
} from './flujo';

/** Una versión del flujo, como la ve Configuración. */
export interface VersionFlujo {
  id: string;
  numero: number;
  estado: 'BORRADOR' | 'ACTIVA' | 'RETIRADA';
  nota: string | null;
  creadaPor: string | null;
  createdAt: string;
  activadaPor: string | null;
  activadaAt: string | null;
  /** Procesos en curso que corren con ella. */
  procesosEnCurso: number;
}

/**
 * Las versiones del flujo (migración 111): quién hace y quién aprueba cada
 * actividad, por modalidad.
 *
 * Se edita el borrador —nunca la activa— y se activa de una vez, después de
 * validar las once modalidades. Cada proceso corre con la versión con la que
 * nació, y Contratación puede pasarlo a la activa con un motivo.
 *
 * Lo que se guarda aquí es lo mismo que leen el guard, las cadenas y los
 * avisos (`flujo/lectura.ts`): el diagrama no es una representación aparte,
 * es la configuración que se ejecuta.
 */
@Injectable()
export class FlujoService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly alcance: AlcanceService,
  ) {}

  // ------------------------------------------------------------ versiones --

  async versiones(): Promise<VersionFlujo[]> {
    const filas = await this.dataSource.query(
      `SELECT v.id::text AS id, v.numero, v.estado, v.nota, v.creada_por AS "creadaPor", v.created_at AS "createdAt",
              v.activada_por AS "activadaPor", v.activada_at AS "activadaAt",
              (SELECT count(*) FROM hiring.procesos p WHERE p.flujo_version_id = v.id AND p.estado = 'EN_CURSO')::int
                AS "procesosEnCurso"
         FROM hiring.flujo_versiones v
        ORDER BY v.numero DESC`,
    );
    return filas;
  }

  /** Crea el borrador como copia de la activa, o devuelve el que ya hay. */
  async crearBorrador(acceso: HiringAccess, em?: EntityManager): Promise<string> {
    const trabajo = async (m: EntityManager) => {
      const existente = await versionBorrador(m);
      if (existente) return existente;
      const activa = await versionActiva(m);
      const [{ numero }] = await m.query(`SELECT COALESCE(MAX(numero), 0) + 1 AS numero FROM hiring.flujo_versiones`);
      const [nueva] = await m.query(
        `INSERT INTO hiring.flujo_versiones (numero, estado, creada_por) VALUES ($1, 'BORRADOR', $2) RETURNING id::text AS id`,
        [numero, acceso.userName],
      );
      if (activa) {
        await m.query(
          `INSERT INTO hiring.flujo_asignaciones (version_id, numeral, modalidad, la_hace, aprobacion, updated_by)
           SELECT $1::uuid, numeral, modalidad, la_hace, aprobacion, $3
             FROM hiring.flujo_asignaciones WHERE version_id::text = $2`,
          [nueva.id, activa, acceso.userName],
        );
      }
      return nueva.id as string;
    };
    return em ? trabajo(em) : this.dataSource.transaction(trabajo);
  }

  /** Descarta el borrador: lo activo sigue como estaba. */
  async descartarBorrador() {
    const borrador = await versionBorrador(this.dataSource.manager);
    if (!borrador) throw new NotFoundException('No hay un borrador del flujo que descartar');
    await this.dataSource.query(`DELETE FROM hiring.flujo_versiones WHERE id::text = $1 AND estado = 'BORRADOR'`, [borrador]);
    return { descartado: true };
  }

  /**
   * Activa el borrador. No se deja si alguna actividad, en alguna modalidad,
   * queda sin quién la haga o sin quién la apruebe: se responde con la lista
   * exacta de lo que hay que corregir.
   */
  async activar(acceso: HiringAccess, nota?: string) {
    return this.dataSource.transaction(async (em) => {
      const borrador = await versionBorrador(em);
      if (!borrador) throw new NotFoundException('No hay un borrador del flujo que activar');
      const errores = (await this.validar(borrador, em)).filter((p) => p.gravedad === 'ERROR');
      if (errores.length) {
        throw new ConflictException({
          message: `El flujo no se puede activar: ${errores.length === 1 ? 'hay 1 actividad' : `hay ${errores.length} problemas`} por corregir`,
          problemas: errores,
        });
      }
      await em.query(
        `UPDATE hiring.flujo_versiones SET estado = 'RETIRADA', retirada_at = now() WHERE estado = 'ACTIVA'`,
      );
      await em.query(
        `UPDATE hiring.flujo_versiones
            SET estado = 'ACTIVA', activada_por = $2, activada_at = now(), nota = COALESCE($3, nota)
          WHERE id::text = $1`,
        [borrador, acceso.userName, nota?.trim() || null],
      );
      return { activada: true };
    });
  }

  // ----------------------------------------------------------- asignaciones --

  /** La versión que se muestra: el borrador si lo hay, si no la activa. */
  private async versionVisible(em: EntityManager, cual?: 'BORRADOR' | 'ACTIVA'): Promise<string | null> {
    if (cual === 'ACTIVA') return versionActiva(em);
    if (cual === 'BORRADOR') return versionBorrador(em);
    return (await versionBorrador(em)) ?? (await versionActiva(em));
  }

  /** Lo que rige en una actividad para la modalidad (o la general), con su origen. */
  async asignacion(numeral: string, modalidad: string | null) {
    const em = this.dataSource.manager;
    const borrador = await versionBorrador(em);
    const version = borrador ?? (await versionActiva(em));
    const filas = await filasDeVersion(em, version, numeral);
    const rige = asignacionQueRige(filas, numeral, modalidad);
    return {
      ...rige,
      general: asignacionQueRige(filas, numeral, null),
      editando: borrador ? ('BORRADOR' as const) : ('ACTIVA' as const),
    };
  }

  /**
   * Cambia quién hace o quién aprueba una actividad, en el borrador (que se
   * crea si no lo hay). Con modalidad, `null` en una parte vuelve a heredar la
   * general; sin modalidad, `null` es «por permiso» o «no requiere».
   */
  async guardarAsignacion(
    numeral: string,
    modalidad: string | null,
    cambios: { laHace?: LaHaceGuardada | null; aprobacion?: AprobacionGuardada | null },
    acceso: HiringAccess,
  ) {
    await this.dataSource.transaction(async (em) => {
      const [actividad] = await em.query(`SELECT 1 FROM hiring.actividades WHERE numeral = $1 AND activa`, [numeral]);
      if (!actividad) throw new NotFoundException(`La actividad ${numeral} no existe o está retirada de la matriz`);
      if (modalidad) {
        const [m] = await em.query(`SELECT 1 FROM hiring.modalidades WHERE codigo = $1`, [modalidad]);
        if (!m) throw new BadRequestException(`La modalidad ${modalidad} no existe`);
      }
      if (cambios.laHace?.tipo === 'PUESTO' && numeral === NUMERAL_QUE_ASIGNA_PUESTOS) {
        throw new BadRequestException(NO_LA_HACE_UN_PUESTO);
      }
      if (cambios.laHace?.tipo === 'PUESTO') {
        const [p] = await em.query(`SELECT 1 FROM hiring.puestos_proceso WHERE id::text = $1 AND activo`, [cambios.laHace.puestoId]);
        if (!p) throw new BadRequestException('El puesto elegido no existe o está archivado');
      }
      if (cambios.aprobacion?.tipo === 'CADENA') {
        const [c] = await em.query(`SELECT 1 FROM hiring.cadenas_aprobacion WHERE id::text = $1 AND activa`, [cambios.aprobacion.cadenaId]);
        if (!c) throw new BadRequestException('La cadena elegida no existe o se archivó');
      }

      const version = await this.crearBorrador(acceso, em);
      const [actual] = await em.query(
        `SELECT la_hace, aprobacion FROM hiring.flujo_asignaciones
          WHERE version_id::text = $1 AND numeral = $2 AND modalidad IS NOT DISTINCT FROM $3`,
        [version, numeral, modalidad],
      );
      const laHace = 'laHace' in cambios ? cambios.laHace ?? null : actual?.la_hace ?? null;
      const aprobacion = 'aprobacion' in cambios ? cambios.aprobacion ?? null : actual?.aprobacion ?? null;

      await em.query(
        `DELETE FROM hiring.flujo_asignaciones
          WHERE version_id::text = $1 AND numeral = $2 AND modalidad IS NOT DISTINCT FROM $3`,
        [version, numeral, modalidad],
      );
      // Una fila de modalidad que ya no reemplaza nada sobra: hereda todo.
      if (laHace || aprobacion || !modalidad) {
        await em.query(
          `INSERT INTO hiring.flujo_asignaciones (version_id, numeral, modalidad, la_hace, aprobacion, updated_by)
           VALUES ($1::uuid, $2, $3, $4::jsonb, $5::jsonb, $6)`,
          [
            version,
            numeral,
            modalidad,
            laHace ? JSON.stringify(laHace) : modalidad ? null : JSON.stringify({ tipo: 'PERMISO' }),
            aprobacion ? JSON.stringify(aprobacion) : modalidad ? null : JSON.stringify({ tipo: 'NINGUNA' }),
            acceso.userName,
          ],
        );
      }
    });
    return this.asignacion(numeral, modalidad);
  }

  // ------------------------------------------------------------- validación --

  /** Lo que hay que corregir en la versión que se ve: el borrador, o la activa. */
  async validarVisible(cual?: 'ACTIVA') {
    const version = await this.versionVisible(this.dataSource.manager, cual);
    return version ? this.validar(version) : [];
  }

  /** Todo lo que hay que corregir en la versión, en las once modalidades. */
  async validar(versionId: string, em: EntityManager = this.dataSource.manager): Promise<ProblemaFlujo[]> {
    const contexto = await this.contexto(em, versionId);
    const problemas: ProblemaFlujo[] = [];
    for (const m of contexto.modalidades) {
      problemas.push(...validarModalidad({ ...contexto.datos, actividades: contexto.aplicanEn(m.codigo), modalidad: m.codigo }));
    }
    // El mismo problema en varias modalidades sale una vez, con todas ellas.
    const unicos = new Map<string, ProblemaFlujo & { modalidades: string[] }>();
    for (const p of problemas) {
      const clave = `${p.numeral}|${p.parte}|${p.mensaje}`;
      const nombre = contexto.modalidades.find((m) => m.codigo === p.modalidad)?.nombre ?? p.modalidad ?? 'General';
      const ya = unicos.get(clave);
      if (ya) ya.modalidades.push(nombre);
      else unicos.set(clave, { ...p, modalidades: [nombre] });
    }
    return [...unicos.values()].sort((a, b) => a.etapa - b.etapa || a.numeral.localeCompare(b.numeral, undefined, { numeric: true }));
  }

  /**
   * Lo que la validación y el diagrama necesitan saber, consultado de una vez:
   * las actividades, los permisos de cada punto, los roles, los puestos y las
   * cadenas.
   */
  private async contexto(em: EntityManager, versionId: string) {
    const actividades: { numeral: string; nombre: string; etapa: number; orden: number }[] = await em.query(
      `SELECT numeral, nombre, etapa, orden FROM hiring.actividades WHERE activa AND etapa >= 3 ORDER BY etapa, orden`,
    );
    const modalidades: { codigo: string; nombre: string }[] = await em.query(
      `SELECT codigo, nombre FROM hiring.modalidades WHERE activa ORDER BY orden, nombre`,
    );
    const excluidas: { modalidad: string; numeral: string }[] = await em.query(
      `SELECT modalidad, numeral FROM hiring.actividades_excluidas`,
    );
    const filas = await filasDeVersion(em, versionId);

    const permisos = new Map<string, Set<string>>();
    for (const a of actividades) {
      for (const accion of new Set<Exclude<Accion, 'ver'>>([accionQueHace(a.numeral), 'aprobar'])) {
        permisos.set(`${accion}|${a.numeral}`, new Set(await this.alcance.cuentasQuePueden(accion, a.numeral)));
      }
    }

    const roles: { code: string; id: string }[] = await em.query(
      `SELECT r.code, ur.id_user::text AS id
         FROM auth.user_roles ur
         JOIN auth.role r ON r.id = ur.id_rol AND r.is_active
         JOIN auth."user" u ON u.id_user = ur.id_user AND u.is_active
        WHERE ur.is_active`,
    );
    const cuentas: { persona: string; id: string }[] = await em.query(
      `SELECT id_person::text AS persona, id_user::text AS id FROM auth."user" WHERE is_active AND id_person IS NOT NULL`,
    );
    const puestos = new Map<string, string>(
      (await em.query(`SELECT id::text AS id, nombre FROM hiring.puestos_proceso WHERE activo`)).map((f: any) => [f.id, f.nombre]),
    );
    const cadenas = new Map<string, CadenaParaValidar & { id: string }>(
      (await em.query(`SELECT id::text AS id, nombre, activa, escalones FROM hiring.cadenas_aprobacion`)).map((f: any) => [
        f.id,
        { id: f.id, nombre: f.nombre, activa: f.activa, escalones: f.escalones ?? [] },
      ]),
    );

    const datos: Omit<DatosDeValidacion, 'actividades' | 'modalidad'> = {
      filas,
      pueden: (accion, numeral) => permisos.get(`${accion}|${numeral}`) ?? new Set(),
      conRol: (rol) => new Set(roles.filter((r) => r.code === rol).map((r) => r.id)),
      cuentaDe: (persona) => cuentas.find((c) => c.persona === persona)?.id ?? null,
      puestos,
      cadenas,
    };
    const aplica = (numeral: string, modalidad: string | null) =>
      !modalidad || !excluidas.some((e) => e.modalidad === modalidad && e.numeral === numeral);
    // Solo se valida lo que se hace en la plataforma: lo que no tiene
    // pantalla pasa fuera y el flujo lo salta.
    const aplicanEn = (modalidad: string | null) =>
      actividades.filter((a) => aplica(a.numeral, modalidad) && !SIN_PANEL.has(a.numeral));

    return { actividades, modalidades, filas, datos, aplica, aplicanEn, puestos, cadenas, roles };
  }

  // ---------------------------------------------------------------- diagrama --

  /**
   * El flujo de una modalidad, etapa por etapa, con quién hace y quién aprueba
   * cada actividad, cómo se asigna, de dónde sale (general o propio de la
   * modalidad) y qué le falta.
   */
  async diagrama(modalidad: string | null, cual?: 'BORRADOR' | 'ACTIVA') {
    const em = this.dataSource.manager;
    const version = await this.versionVisible(em, cual);
    if (!version) throw new NotFoundException('No hay ninguna versión del flujo');
    const ctx = await this.contexto(em, version);
    const problemas = validarModalidad({ ...ctx.datos, actividades: ctx.aplicanEn(modalidad), modalidad });

    const nombresRol = new Map<string, string>(
      (await em.query(`SELECT code, name FROM auth.role`)).map((f: any) => [f.code, f.name]),
    );
    const idsPersona = [
      ...new Set(
        ctx.filas.flatMap((f) => [
          ...(f.laHace?.tipo === 'PERSONAS' ? f.laHace.personas : []),
          ...(f.aprobacion?.tipo === 'ESCALON' ? f.aprobacion.personas : []),
        ]),
      ),
    ];
    const nombresPersona = new Map<string, string>(
      idsPersona.length
        ? (
            await em.query(
              `SELECT id_person::text AS id, COALESCE(nom_largo, nom_tercero) AS nombre FROM auth.personas WHERE id_person::text = ANY($1::text[])`,
              [idsPersona],
            )
          ).map((f: any) => [f.id, f.nombre])
        : [],
    );
    const nombrePuesto = (id: string) => ctx.puestos.get(id) ?? 'Puesto archivado';
    const quienes = (e: { roles: string[]; personas: string[]; papeles?: string[]; puestos?: string[] }) => [
      ...(e.puestos ?? []).map((p) => ({ tipo: 'PUESTO' as const, nombre: nombrePuesto(p) })),
      ...e.roles.map((r) => ({ tipo: 'ROL' as const, nombre: nombresRol.get(r) ?? r })),
      ...e.personas.map((p) => ({ tipo: 'PERSONA' as const, nombre: nombresPersona.get(p) ?? 'Persona del directorio' })),
      ...(e.papeles ?? []).map((p) => ({ tipo: 'PAPEL' as const, nombre: p === 'SUPERVISOR' ? 'El supervisor' : 'Quien lleva el proceso' })),
    ];

    const etapas = new Map<number, any[]>();
    for (const a of ctx.actividades) {
      const rige = asignacionQueRige(ctx.filas, a.numeral, modalidad);
      const accion = accionQueHace(a.numeral);
      const hace = rige.laHace;
      const escalones = escalonesDe(rige.aprobacion, ctx.cadenas);
      const suyos = problemas.filter((p) => p.numeral === a.numeral);
      const nodo = {
        numeral: a.numeral,
        nombre: a.nombre,
        etapa: a.etapa,
        aplica: ctx.aplica(a.numeral, modalidad),
        enLaPlataforma: !SIN_PANEL.has(a.numeral),
        asigna: ACTIVIDADES_QUE_ASIGNAN[a.numeral] ?? null,
        dependeDe: DEPENDE_DE[a.numeral] ?? null,
        hace: {
          modo: modoDeAsignacion(hace),
          accion,
          propia: rige.propiaDeLaModalidad.laHace,
          quien:
            hace.tipo === 'PUESTO'
              ? nombrePuesto(hace.puestoId)
              : hace.tipo === 'PERSONAS'
                ? hace.personas.map((p) => nombresPersona.get(p) ?? 'Persona del directorio').join(', ')
                : [...new Set(
                    ctx.roles
                      .filter((r) => ctx.datos.pueden(accion, a.numeral).has(r.id))
                      .map((r) => nombresRol.get(r.code) ?? r.code),
                  )].join(', ') || null,
        },
        aprueba: {
          tipo: rige.aprobacion.tipo,
          propia: rige.propiaDeLaModalidad.aprobacion,
          cadena: rige.aprobacion.tipo === 'CADENA' ? (ctx.cadenas.get(rige.aprobacion.cadenaId)?.nombre ?? 'Cadena que ya no existe') : null,
          escalones: (escalones ?? []).map((e) => ({ nombre: e.nombre, quienes: quienes(e) })),
        },
        estado: suyos.some((p) => p.gravedad === 'ERROR') ? 'ERROR' : suyos.length ? 'AVISO' : 'OK',
        problemas: suyos.map((p) => ({ parte: p.parte, gravedad: p.gravedad, mensaje: p.mensaje })),
      };
      const lista = etapas.get(a.etapa) ?? [];
      lista.push(nodo);
      etapas.set(a.etapa, lista);
    }

    const [v] = await em.query(
      `SELECT id::text AS id, numero, estado FROM hiring.flujo_versiones WHERE id::text = $1`,
      [version],
    );
    return {
      version: v,
      modalidad,
      modalidades: ctx.modalidades,
      etapas: [...etapas.entries()].map(([etapa, actividades]) => ({ etapa, actividades })),
      problemas,
    };
  }

  // -------------------------------------------------------------- el proceso --

  /** Con qué versión corre el proceso y si se puede pasar a la activa. */
  async deProceso(procesoId: string, acceso: HiringAccess) {
    const [fila] = await this.dataSource.query(
      `SELECT v.numero AS version, (SELECT numero FROM hiring.flujo_versiones WHERE estado = 'ACTIVA') AS activa
         FROM hiring.procesos p LEFT JOIN hiring.flujo_versiones v ON v.id = p.flujo_version_id
        WHERE p.id::text = $1`,
      [procesoId],
    );
    if (!fila) throw new NotFoundException('El proceso no existe');
    return {
      version: fila.version as number | null,
      activa: fila.activa as number | null,
      desactualizado: fila.version !== null && fila.activa !== null && fila.version !== fila.activa,
      puedeActualizar: await this.puedeActualizar(procesoId, acceso),
    };
  }

  /**
   * Pasa el proceso a la versión activa. Lo hace quien lo lleva o quien
   * reparte, con motivo: cambia quién hace y quién aprueba lo que falta. Lo
   * que ya está en revisión sigue con su cadena hasta que se reenvíe.
   */
  async actualizarProceso(procesoId: string, motivo: string, acceso: HiringAccess) {
    if ((motivo ?? '').trim().length < 10) throw new BadRequestException('Explica por qué el proceso pasa a la versión nueva');
    if (!(await this.puedeActualizar(procesoId, acceso))) {
      throw new ForbiddenException('Lo pasa a la versión nueva quien lleva el proceso en Contratación, o quien reparte');
    }
    await this.dataSource.transaction(async (em) => {
      const activa = await versionActiva(em);
      const [antes] = await em.query(
        `SELECT v.numero FROM hiring.procesos p LEFT JOIN hiring.flujo_versiones v ON v.id = p.flujo_version_id WHERE p.id::text = $1`,
        [procesoId],
      );
      await em.query(`UPDATE hiring.procesos SET flujo_version_id = $2::uuid WHERE id::text = $1`, [procesoId, activa]);
      const [ahora] = await em.query(`SELECT numero FROM hiring.flujo_versiones WHERE id::text = $1`, [activa]);
      await em.query(
        `INSERT INTO hiring.trazabilidad (proceso_id, entidad_id, entidad, accion, detalle, usuario_nombre, usuario_id)
         VALUES ($1::uuid, $1::uuid, 'flujo_version', 'ACTUALIZAR', $2::jsonb, $3, $4)`,
        [procesoId, JSON.stringify({ de: antes?.numero ?? null, a: ahora?.numero ?? null, motivo: motivo.trim() }), acceso.userName, acceso.userId],
      );
    });
    return this.deProceso(procesoId, acceso);
  }

  private async puedeActualizar(procesoId: string, acceso: HiringAccess): Promise<boolean> {
    if (tienePermiso(acceso, PERMISO_PROCESO_ASIGNAR)) return true;
    const [c] = await this.dataSource.query(
      `SELECT usuario_id::text AS id, usuario_nombre AS nombre FROM hiring.participaciones_proceso
        WHERE proceso_id::text = $1 AND papel = 'CONTRATACION' AND estado = 'VIGENTE'`,
      [procesoId],
    );
    const igual = (x?: string | null, y?: string | null) => !!x && !!y && x.trim().toLowerCase() === y.trim().toLowerCase();
    return !!c && (igual(c.id, acceso.userId) || igual(c.nombre, acceso.userName));
  }
}

