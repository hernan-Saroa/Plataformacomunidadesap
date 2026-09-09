import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';

import {
  ParticipacionProceso,
  PapelEnProceso,
} from '../../entities/participacion-proceso.entity';
import { Proceso } from '../../entities/proceso.entity';
import { AccionTraza, Trazabilidad } from '../../entities/trazabilidad.entity';
import { HiringAccess } from '../../auth/hiring-access';
import {
  PERMISO_ACTIVIDAD_APROBAR,
  PERMISO_PROCESO_ASIGNAR,
  PERMISO_PROCESO_TOMAR,
  tienePermiso,
} from '../../auth/permisos';
import { AsignarAbogadoDto, MotivoDto, ReasignarAbogadoDto } from './dto/participacion.dto';

/** Una cuenta a la que se le puede dar un papel en un proceso. */
export interface CuentaCandidata {
  usuarioId: string;
  usuarioNombre: string;
  personaId: string | null;
  nombre: string;
  cargo: string | null;
  email: string | null;
}

/**
 * Si esa participación es de quien pregunta.
 *
 * El token trae dos identificadores de la misma cuenta y ninguno está
 * garantizado: `sub` puede faltar en sesiones de servicio y `username` viene
 * como lo escribió quien inició sesión. Se acepta cualquiera de los dos, y el
 * username sin distinguir mayúsculas, porque `procesos.created_by` ya arrastra
 * la misma cuenta escrita de dos formas.
 *
 * Función pura y exportada porque es el centro de todo: de esto depende que un
 * abogado vea el proceso que le repartieron y que solo él pueda revisarlo.
 */
export function esSuya(
  participacion: Pick<ParticipacionProceso, 'usuarioId' | 'usuarioNombre'>,
  acceso: Pick<HiringAccess, 'userId' | 'userName'>,
): boolean {
  const igual = (a?: string | null, b?: string | null) =>
    !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

  return (
    igual(participacion.usuarioId, acceso.userId) ||
    igual(participacion.usuarioNombre, acceso.userName)
  );
}

/**
 * Quién está en cada proceso (EFDS-1183).
 *
 * Dos papeles con reglas distintas de entrada:
 *
 * - `CONTRATACION` se **toma**. La bandeja es compartida y quien llega primero
 *   se queda con el proceso; nadie se lo entrega.
 * - `ABOGADO` se **asigna**, y lo hace quien tomó el proceso.
 *
 * Salir es igual para los dos: relevo con motivo, conservando al anterior.
 */
@Injectable()
export class ParticipacionService {
  constructor(private readonly dataSource: DataSource) {}

  // ------------------------------------------------------------- consulta --

  async estado(procesoId: string, acceso: HiringAccess) {
    await this.exigirProceso(this.dataSource.manager, procesoId);

    const todas = await this.dataSource.getRepository(ParticipacionProceso).find({
      where: { procesoId },
      order: { asignadoAt: 'DESC' },
    });

    const vigente = (papel: PapelEnProceso) =>
      todas.find((p) => p.papel === papel && p.estado === 'VIGENTE') ?? null;

    const contratacion = vigente('CONTRATACION');
    const abogado = vigente('ABOGADO');

    // Quien tomó el proceso es quien reparte el abogado. El Director también,
    // porque `proceso.assign` es suyo y tiene que poder corregir un reparto.
    const soyElDeContratacion = !!contratacion && esSuya(contratacion, acceso);
    const puedeRepartir = soyElDeContratacion || tienePermiso(acceso, PERMISO_PROCESO_ASIGNAR);

    return {
      /** Sin tomar: el proceso está en la bandeja y nadie responde por él. */
      puedeTomar: !contratacion && tienePermiso(acceso, PERMISO_PROCESO_TOMAR),
      puedeRepartir,
      contratacion: contratacion ? this.aVista(contratacion, acceso) : null,
      abogado: abogado ? this.aVista(abogado, acceso) : null,
      /**
       * No debería pasar, pero quitar un abogado sin poner otro es una
       * situación real. En vez de impedirla se dice, para que el proceso no se
       * quede quieto sin que nadie lo note.
       */
      sinAbogado: !!contratacion && !abogado,
      // Quien llevó el proceso antes respondió por lo que hizo en él: el
      // expediente conserva a los relevados con el motivo del cambio.
      historial: todas
        .filter((p) => p.estado === 'RELEVADO')
        .map((p) => ({
          papel: p.papel,
          nombre: p.nombre,
          cargo: p.cargo,
          asignadoAt: p.asignadoAt,
          asignadoPor: p.asignadoPor,
          relevadoAt: p.relevadoAt,
          relevadoPor: p.relevadoPor,
          motivoRelevo: p.motivoRelevo,
        })),
    };
  }

  /**
   * Las cuentas a las que se les puede dar el papel de abogado.
   *
   * Se resuelven por permiso y no por código de rol —quien pueda aprobar una
   * actividad es quien puede revisar el proceso—, igual que hacen los
   * endpoints. Nombrar aquí `REVISOR_CONTRATACION` ataría el reparto a un rol
   * que el administrador puede renombrar o desdoblar mañana desde el
   * backoffice, que es justo lo que la migración 060 vino a quitar del código.
   */
  async abogados(termino = ''): Promise<CuentaCandidata[]> {
    return this.cuentasCon(PERMISO_ACTIVIDAD_APROBAR, termino);
  }

  // ------------------------------------------------------------ el proceso --

  /**
   * Tomar el proceso de la bandeja.
   *
   * No lo entrega nadie: quien abre la 3.3 se queda con él. Se descartó que un
   * coordinador repartiera porque convierte a esa persona en un cuello de
   * botella y obliga a decidir quién reparte cuando no está.
   *
   * Dos personas que lo tomen a la vez no producen dos filas: la transacción
   * bloquea el proceso y el índice parcial rechaza la segunda.
   */
  async tomar(procesoId: string, acceso: HiringAccess) {
    await this.dataSource.transaction(async (em) => {
      await this.exigirProceso(em, procesoId, true);

      const actual = await this.vigente(procesoId, 'CONTRATACION', em);
      if (actual) {
        throw new ConflictException(
          esSuya(actual, acceso)
            ? 'Ya habías tomado este proceso'
            : `${actual.nombre} tomó este proceso antes que tú`,
        );
      }

      const cuenta = await this.exigirCuenta(acceso.userId, acceso.userName);
      const nueva = await this.guardar(em, procesoId, 'CONTRATACION', cuenta, acceso);

      await this.traza(em, procesoId, nueva.id, 'RADICAR', acceso, {
        papel: 'CONTRATACION',
        quien: cuenta.nombre,
      });
    });

    return this.estado(procesoId, acceso);
  }

  // ------------------------------------------------------------- el abogado --

  async asignarAbogado(procesoId: string, dto: AsignarAbogadoDto, acceso: HiringAccess) {
    await this.dataSource.transaction(async (em) => {
      await this.exigirProceso(em, procesoId, true);
      await this.exigirQuePuedaRepartir(em, procesoId, acceso);

      if (await this.vigente(procesoId, 'ABOGADO', em)) {
        throw new ConflictException(
          'El proceso ya tiene abogado: para cambiarlo se reasigna, que releva al actual con su motivo',
        );
      }

      const cuenta = await this.exigirCuenta(dto.usuarioId);
      const nueva = await this.guardar(em, procesoId, 'ABOGADO', cuenta, acceso);

      await this.traza(em, procesoId, nueva.id, 'DESIGNAR', acceso, {
        papel: 'ABOGADO',
        abogado: cuenta.nombre,
        usuario: cuenta.usuarioNombre,
      });
    });

    return this.estado(procesoId, acceso);
  }

  /**
   * Reasigna el proceso a otro abogado.
   *
   * Releva al vigente y asigna al nuevo en un solo acto, como la reasignación
   * de la supervisión (EFDS-1169): en dos pasos el proceso se queda sin revisor
   * entre uno y otro, y si el segundo falla queda así.
   */
  async reasignarAbogado(procesoId: string, dto: ReasignarAbogadoDto, acceso: HiringAccess) {
    await this.dataSource.transaction(async (em) => {
      await this.exigirProceso(em, procesoId, true);
      await this.exigirQuePuedaRepartir(em, procesoId, acceso);

      const actual = await this.vigente(procesoId, 'ABOGADO', em);
      if (!actual) {
        throw new NotFoundException(
          'El proceso no tiene abogado: no hay a quién relevar, se asigna uno',
        );
      }

      const cuenta = await this.exigirCuenta(dto.usuarioId);
      if (esSuya(actual, { userId: cuenta.usuarioId, userName: cuenta.usuarioNombre })) {
        throw new ConflictException(
          'Ese abogado ya lleva el proceso: reasignar exige designar a otro',
        );
      }

      await this.relevar(em, actual, dto.motivo, acceso);
      const nueva = await this.guardar(em, procesoId, 'ABOGADO', cuenta, acceso);

      await this.traza(em, procesoId, nueva.id, 'DESIGNAR', acceso, {
        papel: 'ABOGADO',
        reasignacion: true,
        abogadoAnterior: actual.nombre,
        abogado: cuenta.nombre,
        motivo: dto.motivo,
      });
    });

    return this.estado(procesoId, acceso);
  }

  /**
   * Quita al abogado sin poner otro.
   *
   * «No debería, pero puede pasar»: el abogado se va de la entidad, o el
   * reparto estaba mal. Se permite en vez de obligar a nombrar un sustituto
   * ahí mismo —que sería inventar un responsable—, y el proceso queda marcado
   * como pendiente de reasignar para que no se pierda.
   */
  async quitarAbogado(procesoId: string, dto: MotivoDto, acceso: HiringAccess) {
    await this.dataSource.transaction(async (em) => {
      await this.exigirProceso(em, procesoId, true);
      await this.exigirQuePuedaRepartir(em, procesoId, acceso);

      const actual = await this.vigente(procesoId, 'ABOGADO', em);
      if (!actual) throw new NotFoundException('El proceso no tiene abogado que quitar');

      await this.relevar(em, actual, dto.motivo, acceso);

      await this.traza(em, procesoId, actual.id, 'REVOCAR', acceso, {
        papel: 'ABOGADO',
        abogado: actual.nombre,
        motivo: dto.motivo,
        sinReemplazo: true,
      });
    });

    return this.estado(procesoId, acceso);
  }

  // ------------------------------------------------ lo que consumen otras --

  /** Quién ocupa ese papel en el proceso, o nulo si nadie. */
  vigente(procesoId: string, papel: PapelEnProceso, em?: EntityManager) {
    const manager = em ?? this.dataSource.manager;
    return manager
      .getRepository(ParticipacionProceso)
      .findOne({ where: { procesoId, papel, estado: 'VIGENTE' } });
  }

  /**
   * Los procesos en los que está quien pregunta, en cualquier papel.
   *
   * Lo consulta el listado para que «los míos» deje de ser solo «los que
   * radiqué». La consulta trae las candidatas por cualquiera de los dos
   * identificadores y `esSuya` decide: es la misma función que usa el resto del
   * módulo, y tenerla una sola vez evita que el filtro del listado y el rótulo
   * de la pantalla acaben respondiendo distinto sobre el mismo proceso.
   */
  async procesosDe(acceso: HiringAccess): Promise<string[]> {
    const nombre = (acceso.userName ?? '').trim();
    const id = (acceso.userId ?? '').trim();
    if (!nombre && !id) return [];

    const consulta = this.dataSource
      .getRepository(ParticipacionProceso)
      .createQueryBuilder('p')
      .where('p.estado = :estado', { estado: 'VIGENTE' });

    // Se filtra por lo que haya: con el id vacío, `usuario_id::text = ''`
    // reventaría la comparación de uuid en vez de no coincidir con nada.
    if (nombre && id) {
      consulta.andWhere(
        '(LOWER(p.usuario_nombre) = LOWER(:nombre) OR p.usuario_id::text = :id)',
        { nombre, id },
      );
    } else if (nombre) {
      consulta.andWhere('LOWER(p.usuario_nombre) = LOWER(:nombre)', { nombre });
    } else {
      consulta.andWhere('p.usuario_id::text = :id', { id });
    }

    const suyas = await consulta.getMany();
    return [...new Set(suyas.filter((p) => esSuya(p, acceso)).map((p) => p.procesoId))];
  }

  /** Quién está en cada proceso del listado, en una sola consulta. */
  async vigentesDe(procesoIds: string[]): Promise<Map<string, ParticipacionProceso[]>> {
    if (procesoIds.length === 0) return new Map();

    const filas = await this.dataSource.getRepository(ParticipacionProceso).find({
      where: { procesoId: In(procesoIds), estado: 'VIGENTE' },
    });

    const porProceso = new Map<string, ParticipacionProceso[]>();
    for (const fila of filas) {
      const lista = porProceso.get(fila.procesoId) ?? [];
      lista.push(fila);
      porProceso.set(fila.procesoId, lista);
    }
    return porProceso;
  }

  // ----------------------------------------------------------- auxiliares --

  private aVista(p: ParticipacionProceso, acceso: HiringAccess) {
    return {
      id: p.id,
      usuarioId: p.usuarioId,
      usuarioNombre: p.usuarioNombre,
      personaId: p.personaId,
      nombre: p.nombre,
      cargo: p.cargo,
      email: p.email,
      asignadoPor: p.asignadoPor,
      asignadoAt: p.asignadoAt,
      /** Si le toca a quien está mirando. */
      esMio: esSuya(p, acceso),
    };
  }

  /**
   * Repartir el abogado lo hace quien tomó el proceso.
   *
   * Y el Director, porque `proceso.assign` es suyo: tiene que poder corregir un
   * reparto sin quitarle el proceso a quien lo lleva. Cualquier otro con el
   * permiso general no basta —eso lo hace todo el mundo repartidor de todo—,
   * por eso se comprueba contra la participación y no solo contra el permiso.
   */
  private async exigirQuePuedaRepartir(
    em: EntityManager,
    procesoId: string,
    acceso: HiringAccess,
  ) {
    if (tienePermiso(acceso, PERMISO_PROCESO_ASIGNAR)) return;

    const contratacion = await this.vigente(procesoId, 'CONTRATACION', em);
    if (!contratacion) {
      throw new ConflictException(
        'Nadie ha tomado este proceso todavía: primero se toma de la bandeja y luego se reparte',
      );
    }
    if (!esSuya(contratacion, acceso)) {
      throw new ForbiddenException(
        `Este proceso lo lleva ${contratacion.nombre}: el abogado lo reparte quien lo tomó`,
      );
    }
  }

  private async exigirProceso(em: EntityManager, procesoId: string, bloquear = false) {
    const consulta = em
      .getRepository(Proceso)
      .createQueryBuilder('p')
      .where('p.id = :procesoId', { procesoId });

    // Dentro de la transacción se bloquea la fila: dos personas tomando el
    // mismo proceso leerían ambas «no hay nadie» y el índice parcial rechazaría
    // la segunda con un error de llave, no de negocio.
    if (bloquear) consulta.setLock('pessimistic_write');

    const proceso = await consulta.getOne();
    if (!proceso) throw new NotFoundException('El proceso no existe');
    return proceso;
  }

  private relevar(
    em: EntityManager,
    participacion: ParticipacionProceso,
    motivo: string,
    acceso: HiringAccess,
  ) {
    // No se borra: respondió por lo que hizo en su tramo.
    participacion.estado = 'RELEVADO';
    participacion.relevadoAt = new Date();
    participacion.relevadoPor = acceso.userName;
    participacion.motivoRelevo = motivo;
    return em.save(participacion);
  }

  /**
   * La cuenta, resuelta contra el directorio.
   *
   * No se acepta el username que mande el cliente: es el dato con el que los
   * listados deciden a quién le toca el proceso, y uno inventado no falla
   * ninguna validación —deja el proceso en manos de una cuenta que no existe—.
   *
   * `nombreDeRespaldo` es para quien toma su propio proceso: si el token no
   * trae `sub`, se busca por username, y si tampoco aparece en el directorio se
   * usa lo que el token diga, porque negarle tomar a un usuario autenticado por
   * un hueco del directorio sería peor que guardar un nombre pobre.
   */
  private async exigirCuenta(
    usuarioId?: string,
    nombreDeRespaldo?: string,
  ): Promise<CuentaCandidata> {
    const [cuenta] = await this.dataSource.query(
      `SELECT u.id_user   AS "usuarioId",
              u.username  AS "usuarioNombre",
              p.id_person AS "personaId",
              COALESCE(p.nom_largo, p.nom_tercero, u.username) AS nombre,
              NULL::varchar                     AS cargo,
              COALESCE(p.dir_email, u.username) AS email
         FROM auth."user" u
         LEFT JOIN auth.personas p ON p.id_person = u.id_person
        WHERE u.is_active = true
          AND ($1::uuid IS NULL OR u.id_user = $1::uuid)
          AND ($1::uuid IS NOT NULL OR LOWER(u.username) = LOWER($2))`,
      [usuarioId || null, nombreDeRespaldo ?? ''],
    );

    if (cuenta) return cuenta;

    if (nombreDeRespaldo) {
      return {
        usuarioId: usuarioId ?? '',
        usuarioNombre: nombreDeRespaldo,
        personaId: null,
        nombre: nombreDeRespaldo,
        cargo: null,
        email: null,
      };
    }

    throw new NotFoundException('Esa cuenta no existe o está inactiva');
  }

  /** Las cuentas cuyos roles otorgan ese permiso, para los desplegables. */
  private cuentasCon(permiso: string, termino: string): Promise<CuentaCandidata[]> {
    // Parámetros ligados, nunca interpolados: el término viene del navegador.
    return this.dataSource.query(
      `SELECT DISTINCT
              u.id_user   AS "usuarioId",
              u.username  AS "usuarioNombre",
              p.id_person AS "personaId",
              COALESCE(p.nom_largo, p.nom_tercero, u.username) AS nombre,
              NULL::varchar                     AS cargo,
              COALESCE(p.dir_email, u.username) AS email
         FROM auth."user" u
         LEFT JOIN auth.personas p     ON p.id_person = u.id_person
         JOIN auth.user_roles ur       ON ur.id_user = u.id_user AND ur.is_active = true
         JOIN auth.role r              ON r.id = ur.id_rol AND r.is_active = true
         JOIN auth.role_permissions rp ON rp.id_rol = r.id AND rp.is_active = true
         JOIN auth.permission perm     ON perm.id_permission = rp.id_permission
                                      AND perm.is_active = true
        WHERE u.is_active = true
          AND perm.code = $1
          AND ($2 = ''
               OR COALESCE(p.nom_largo, p.nom_tercero, u.username) ILIKE '%' || $2 || '%'
               OR u.username ILIKE '%' || $2 || '%')
        ORDER BY nombre
        LIMIT 50`,
      [permiso, termino.trim()],
    );
  }

  private guardar(
    em: EntityManager,
    procesoId: string,
    papel: PapelEnProceso,
    cuenta: CuentaCandidata,
    acceso: HiringAccess,
  ) {
    return em.save(
      em.create(ParticipacionProceso, {
        procesoId,
        papel,
        usuarioId: cuenta.usuarioId || null,
        usuarioNombre: cuenta.usuarioNombre,
        personaId: cuenta.personaId,
        // Copia del nombre al entrar: el reparto se hizo sobre esa persona ese
        // día, y si mañana el directorio lo corrige el expediente sigue
        // diciendo a quién se le encargó.
        nombre: cuenta.nombre,
        cargo: cuenta.cargo,
        email: cuenta.email,
        asignadoPor: acceso.userName,
        asignadoAt: new Date(),
        estado: 'VIGENTE' as const,
      } as Partial<ParticipacionProceso>),
    );
  }

  private traza(
    em: EntityManager,
    procesoId: string,
    entidadId: string,
    accion: AccionTraza,
    acceso: HiringAccess,
    detalle: Record<string, unknown>,
  ) {
    return em.save(
      em.create(Trazabilidad, {
        procesoId,
        entidadId,
        entidad: 'participacion_proceso',
        accion,
        detalle,
        usuarioNombre: acceso.userName,
        usuarioId: acceso.userId,
      } as Partial<Trazabilidad>),
    );
  }
}
