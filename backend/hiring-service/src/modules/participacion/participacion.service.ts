import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';

import {
  ParticipacionProceso,
  PapelEnProceso,
} from '../../entities/participacion-proceso.entity';
import { Proceso } from '../../entities/proceso.entity';
import {
  NUMERAL_ESTUDIO_PREVIO,
  ProcesoActividad,
} from '../../entities/proceso-actividad.entity';

/** Actividad 3.3 de la matriz: la radicación en la Dirección. */
export const NUMERAL_RADICACION = '3.3';

import { AccionTraza, Trazabilidad } from '../../entities/trazabilidad.entity';
import { HiringAccess } from '../../auth/hiring-access';
import { PERMISO_PROCESO_ASIGNAR, tienePermiso } from '../../auth/permisos';
import { Accion } from '../../auth/alcance';
import { AlcanceService } from '../../auth/alcance.service';
import { CdpService } from '../cdp/cdp.service';
import { PuestosService } from './puestos.service';

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
 * `CONTRATACION` se **toma**: la bandeja es compartida y quien llega primero
 * se queda con el proceso; nadie se lo entrega. Salir es relevo con motivo,
 * conservando al anterior.
 *
 * El abogado dejó de ser un papel (109): es un puesto del proceso, y los
 * puestos los lleva `PuestosService`.
 */
@Injectable()
export class ParticipacionService {
  constructor(
    private readonly dataSource: DataSource,
    /**
     * Cerrar la 3.3 puede cerrar la etapa 3, y entonces nace el CDP.
     *
     * Se llama explícitamente en vez de por evento para que quien lea `tomar`
     * vea el efecto completo del acto: tomar el proceso puede, en una modalidad
     * corta, dejar la solicitud de CDP radicada.
     */
    private readonly cdp: CdpService,
    /** Quién puede qué en cada punto (migración 083). */
    private readonly alcance: AlcanceService,
    /**
     * Los puestos del proceso (109): quien ocupa uno también está en el
     * proceso. Opcional para las pruebas que construyen el servicio a mano.
     */
    @Optional() puestos?: PuestosService,
  ) {
    this.puestos = puestos ?? new PuestosService(dataSource, alcance);
  }

  private readonly puestos: PuestosService;

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
    const financiera = vigente('FINANCIERA');

    // Quien tomó el proceso es quien asigna los puestos. El Director también,
    // porque `proceso.assign` es suyo y tiene que poder corregir un reparto.
    const soyElDeContratacion = !!contratacion && esSuya(contratacion, acceso);
    const puedeRepartir = soyElDeContratacion || tienePermiso(acceso, PERMISO_PROCESO_ASIGNAR);

    return {
      /** Sin tomar: el proceso está en la bandeja y nadie responde por él. */
      puedeTomar: !contratacion && (await this.alcance.puedeEn(acceso, 'editar', NUMERAL_RADICACION)),
      puedeRepartir,
      contratacion: contratacion ? this.aVista(contratacion, acceso) : null,
      /**
       * Quién tomó la solicitud de CDP antes de la 103. Desde entonces el CDP
       * se tramita por fuera y nadie lo toma: queda como historia.
       */
      financiera: financiera ? this.aVista(financiera, acceso) : null,
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

      // Tomarlo **es** cumplir la 3.3: sin esto la actividad se quedaría en
      // BORRADOR para siempre y el riel no dejaría pasar a la 3.4, que es lo
      // que ocurría cuando la 3.3 se cumplía dejando una constancia.
      await this.marcarRadicacion(em, procesoId, acceso);

      await this.traza(em, procesoId, nueva.id, 'RADICAR', acceso, {
        papel: 'CONTRATACION',
        quien: cuenta.nombre,
      });

      // Dentro de la transacción: si abrir la etapa 4 falla, tomar el proceso
      // tampoco queda hecho, y no hay un estado intermedio en el que la etapa 3
      // esté cerrada sin que el proceso haya pasado a la 4.
      await this.cdp.abrirEtapa4SiCerroLaEtapa3(em, procesoId, acceso);
    });

    return this.estado(procesoId, acceso);
  }

  // ------------------------------------------------ lo que consumen otras --

  /**
   * Quién hace esa actividad en este proceso y, si no es quien pregunta, por
   * qué (regla `LA_HACE`, 109). Lo usan la causal (3.6) y el comité (3.7),
   * que son las que se hacen fuera del guard.
   */
  quienHace(procesoId: string, acceso: HiringAccess, numeral: string) {
    return this.alcance.quienHace(acceso, procesoId, numeral);
  }

  /** Quién ocupa ese papel en el proceso, o nulo si nadie. */
  vigente(procesoId: string, papel: PapelEnProceso, em?: EntityManager) {
    const manager = em ?? this.dataSource.manager;
    return manager
      .getRepository(ParticipacionProceso)
      .findOne({ where: { procesoId, papel, estado: 'VIGENTE' } });
  }

  /**
   * Los procesos en cuyo comité evaluador vigente está quien pregunta.
   *
   * Aparte de `procesosDe` a propósito: estar en el proceso da para escribir
   * el estudio previo (`exigirQueSeaSuyo`), y evaluar no. Esto solo abre la
   * puerta para ver el proceso y llegar a la 6.3, que es donde trabaja.
   *
   * En crudo por `auth."user"`, que es de otro equipo: es el mismo enlace
   * cuenta → persona que usa `ComiteService`, sin mapear su tabla aquí.
   */
  async procesosDondeEvalua(acceso: HiringAccess): Promise<string[]> {
    const id = (acceso.userId ?? '').trim();
    if (!id) return [];

    const filas: { proceso_id: string }[] = await this.dataSource.query(
      `SELECT DISTINCT c.proceso_id
         FROM hiring.comites_evaluadores c
         JOIN hiring.miembros_comite m ON m.comite_id = c.id
         JOIN auth."user" u ON u.id_person = m.persona_id
        WHERE c.estado = 'VIGENTE'
          AND u.id_user::text = $1`,
      [id],
    );

    return filas.map((f) => f.proceso_id);
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
    // Y los procesos en los que ocupa un puesto (109): quien decide un escalón
    // tiene que poder ver el proceso que decide.
    return [
      ...new Set([
        ...suyas.filter((p) => esSuya(p, acceso)).map((p) => p.procesoId),
        ...(await this.puestos.procesosDe(acceso)),
      ]),
    ];
  }

  /**
   * Los procesos que están en la bandeja: llegaron y nadie los ha tomado.
   *
   * «Llegaron» es que el área los envió a revisión, no que existan: un estudio
   * previo a medio diligenciar sigue siendo del área y no tiene nada que hacer
   * en la bandeja de la Dirección.
   *
   * Es lo que hace posible el reparto por bandeja compartida: sin esto el
   * listado solo devuelve los procesos en los que ya estás, así que nadie podría
   * ver —ni tomar— uno que todavía no es de nadie.
   */
  async idsEnBandeja(soloEste?: string): Promise<string[]> {
    const filas: { id: string }[] = await this.dataSource.query(
      `SELECT p.id
         FROM hiring.procesos p
         JOIN hiring.proceso_actividades a
           ON a.proceso_id = p.id AND a.numeral = $1 AND a.estado = 'EN_REVISION'
        WHERE p.estado = 'EN_CURSO'
          AND ($2::uuid IS NULL OR p.id = $2::uuid)
          AND NOT EXISTS (
            SELECT 1 FROM hiring.participaciones_proceso pp
             WHERE pp.proceso_id = p.id
               AND pp.papel = 'CONTRATACION'
               AND pp.estado = 'VIGENTE'
          )`,
      [NUMERAL_ESTUDIO_PREVIO, soloEste ?? null],
    );
    return filas.map((f) => f.id);
  }

  /**
   * Si ese proceso concreto está en la bandeja.
   *
   * Misma consulta con un filtro, y no una segunda escrita a mano: qué cuenta
   * como «estar en la bandeja» tiene que decirlo un solo sitio, o el listado y
   * el control de acceso acabarán discrepando sobre el mismo proceso.
   */
  async estaEnLaBandeja(procesoId: string): Promise<boolean> {
    return (await this.idsEnBandeja(procesoId)).length > 0;
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
   * Deja la 3.3 cumplida al tomar el proceso.
   *
   * La actividad ya no se cierra registrando fecha y documento: se cierra
   * cuando alguien de la Dirección la recibe, que es lo que la matriz llama
   * radicar. Quien la cumple queda sellado como revisor porque no hay nadie más
   * a quien esperar: aquí no hay envío ni aprobación, el acto es uno solo.
   */
  private async marcarRadicacion(em: EntityManager, procesoId: string, acceso: HiringAccess) {
    const actividad = await em
      .getRepository(ProcesoActividad)
      .findOne({ where: { procesoId, numeral: NUMERAL_RADICACION } });

    // Una 3.3 que la modalidad excluyó no se toca: NO_APLICA no es un estado
    // del que se pueda salir cumpliendo.
    if (actividad?.estado === 'NO_APLICA') return;

    if (!actividad) {
      await em.save(
        em.create(ProcesoActividad, {
          procesoId,
          numeral: NUMERAL_RADICACION,
          estado: 'APROBADO' as const,
          datos: {},
          enviadoPor: acceso.userName,
          revisadoPor: acceso.userName,
          revisadoAt: new Date(),
        } as Partial<ProcesoActividad>),
      );
      return;
    }

    actividad.estado = 'APROBADO';
    actividad.enviadoPor = acceso.userName;
    actividad.revisadoPor = acceso.userName;
    actividad.revisadoAt = new Date();
    await em.save(ProcesoActividad, actividad);
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
