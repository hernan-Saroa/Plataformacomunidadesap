import { ConflictException, ForbiddenException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { DataSource, EntityManager, In, IsNull } from 'typeorm';

import { AlcanceService } from '../../auth/alcance.service';
import { HiringAccess } from '../../auth/hiring-access';
import {
  AccionEscalon,
  CadenaAprobacion,
  EscalonRonda,
  PapelEscalon,
  RondaAprobacion,
} from '../../entities/cadena-aprobacion.entity';
import { AsignacionPuesto, PuestoProceso } from '../../entities/puesto-proceso.entity';
import { EstadoActividad, ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { aConfigDeAprobacion, asignacionPara } from '../../flujo/lectura';
import { Revision } from '../../entities/revision.entity';
import {
  ACCIONES,
  CadenaResuelta,
  DECISION_DE,
  DecisionPrevia,
  Quien,
  TrasDecision,
  escalonCompleto,
  esResponsable,
  leerConfigDeRegla,
  mensajeDePuesto,
  motivoParaNoDecidir,
  trasDecision,
} from './cadena';

/** Cómo se lee cada papel en pantalla. */
export const NOMBRE_PAPEL: Record<PapelEscalon, string> = {
  CONTRATACION: 'Quien lleva el proceso en Contratación',
  SUPERVISOR: 'El supervisor del contrato',
};

/** Lo que `prepararDecision` deja listo para registrar, ya validado. */
export interface DecisionPreparada {
  actividad: ProcesoActividad;
  ronda: RondaAprobacion;
  escalon: EscalonRonda;
  escalones: EscalonRonda[];
  quien: Quien;
  decision: 'APROBADO' | 'DEVUELTO' | 'NEGADO';
  tras: TrasDecision;
}

/**
 * La aprobación por escalones (migración 101): qué cadena rige, abrir una
 * ronda, decidir un escalón y decir quién tiene algo pendiente.
 *
 * Es el único lugar que responde «quién aprueba esta actividad». Esa pregunta
 * vivía copiada en cuatro sitios —la aprobación, el cierre de los paneles, la
 * bandeja y los avisos— y con escalones las copias habrían terminado diciendo
 * cosas distintas.
 *
 * Solo depende de la base, a propósito: el cierre de los paneles lo usa para
 * abrir la ronda, y la aprobación para resolverla, sin cerrar ningún ciclo
 * entre módulos. Los efectos de aprobar del todo —radicar el CDP, cerrar la
 * etapa— no son de aquí: los dispara quien llama, y solo cuando la decisión
 * fue la definitiva.
 */
@Injectable()
export class CadenaAprobacionService {
  constructor(
    private readonly dataSource: DataSource,
    /**
     * Si quien ocupa un puesto todavía puede aprobar la actividad: sin el
     * permiso no decide su escalón (109). Opcional para las pruebas que
     * construyen el servicio a mano.
     */
    @Optional() alcance?: AlcanceService,
  ) {
    this.alcance = alcance ?? new AlcanceService(dataSource);
  }

  private readonly alcance: AlcanceService;

  // ----------------------------------------------------------- qué rige --

  /**
   * La cadena que exige esta actividad en esta modalidad, o `null` si no
   * requiere aprobación.
   *
   * Sale de la versión del flujo con la que corre el proceso (111), o de la
   * activa si no se dice el proceso; lo de la modalidad manda sobre lo general.
   * Una aprobación que apunta a una plantilla archivada o borrada no exige
   * nada: quedarse esperando a una cadena que ya no existe dejaría la
   * actividad sin salida. Activar una versión así no se deja.
   */
  async cadenaPara(
    numeral: string,
    modalidad: string | null,
    em?: EntityManager,
    procesoId?: string | null,
  ): Promise<CadenaResuelta | null> {
    const manager = em ?? this.dataSource.manager;

    const { aprobacion } = await asignacionPara(manager, numeral, modalidad, procesoId);
    const leida = leerConfigDeRegla(aConfigDeAprobacion(aprobacion));
    if (!leida) return null;

    if ('escalon' in leida) {
      return {
        cadenaId: null,
        nombre: leida.escalon.nombre,
        permiteMismoAprobador: false,
        escalones: [leida.escalon],
      };
    }

    const plantilla = await manager
      .getRepository(CadenaAprobacion)
      .findOne({ where: { id: leida.cadenaId, activa: true } });
    if (!plantilla || !plantilla.escalones?.length) return null;

    return {
      cadenaId: plantilla.id,
      nombre: plantilla.nombre,
      permiteMismoAprobador: plantilla.permiteMismoAprobador,
      // Las guardadas antes de la 109 no traen puestos.
      escalones: plantilla.escalones.map((e) => ({ ...e, puestos: e.puestos ?? [] })),
    };
  }

  // ------------------------------------------------------- abrir la ronda --

  /**
   * Abre una ronda para la actividad que se acaba de enviar a aprobación.
   *
   * Si quedaba una ronda abierta —la actividad volvió a borrador por otro
   * camino, como el comité que reabre o un panel que se anula— se cancela:
   * dos rondas a la vez serían dos cadenas peleándose por el mismo estado. Sus
   * decisiones no se tocan; quedan en `revisiones` con su ronda.
   *
   * Recibe la cadena ya resuelta cuando quien llama la consultó para decidir
   * si la actividad entra en revisión: así no se resuelve dos veces con el
   * riesgo de que discrepen.
   */
  async iniciar(
    em: EntityManager,
    actividad: ProcesoActividad,
    cadena: CadenaResuelta,
    acceso: Pick<HiringAccess, 'userId' | 'userName'>,
    origen: 'ENVIO' | 'LEGADA' = 'ENVIO',
  ): Promise<RondaAprobacion> {
    await this.cancelarRonda(em, actividad.id, 'CANCELADA');

    const anteriores = await em
      .getRepository(RondaAprobacion)
      .count({ where: { procesoActividadId: actividad.id } });

    const ahora = new Date();
    const ronda = await em.save(
      em.create(RondaAprobacion, {
        procesoActividadId: actividad.id,
        ronda: anteriores + 1,
        cadenaId: cadena.cadenaId,
        cadenaNombre: cadena.nombre,
        permiteMismoAprobador: cadena.permiteMismoAprobador,
        estado: 'EN_CURSO',
        escalonActual: 1,
        versionEnviada: actividad.version ?? 1,
        origen,
        iniciadaPor: acceso.userName ?? null,
        iniciadaPorId: acceso.userId || null,
      } as Partial<RondaAprobacion>),
    );

    await em.save(
      cadena.escalones.map((e, i) =>
        em.create(EscalonRonda, {
          aprobacionId: ronda.id,
          orden: i + 1,
          nombre: e.nombre,
          roles: e.roles,
          personas: e.personas,
          papeles: e.papeles,
          puestos: e.puestos ?? [],
          reglaDecision: e.reglaDecision,
          acciones: e.acciones,
          estado: i === 0 ? 'PENDIENTE' : 'BLOQUEADO',
          activadoAt: i === 0 ? ahora : null,
        }),
      ),
    );

    return ronda;
  }

  /**
   * Cierra la ronda abierta sin decidirla: quien la envió la retiró, o el
   * proceso la reabrió por otro camino. Los escalones que no decidieron quedan
   * anulados, no aprobados.
   */
  async cancelarRonda(em: EntityManager, procesoActividadId: string, estado: 'RETIRADA' | 'CANCELADA') {
    const abierta = await this.rondaEnCurso(em, procesoActividadId);
    if (!abierta) return;

    abierta.estado = estado;
    abierta.escalonActual = null;
    abierta.cerradaAt = new Date();
    await em.save(abierta);

    await em.update(
      EscalonRonda,
      { aprobacionId: abierta.id, estado: In(['PENDIENTE', 'BLOQUEADO']) },
      { estado: 'ANULADO', resueltoAt: new Date() },
    );
  }

  rondaEnCurso(em: EntityManager, procesoActividadId: string, bloquear = false) {
    return em.getRepository(RondaAprobacion).findOne({
      where: { procesoActividadId, estado: 'EN_CURSO' },
      lock: bloquear ? { mode: 'pessimistic_write' } : undefined,
    });
  }

  // ------------------------------------------------------- puestos (109) --

  /**
   * Quién decide de verdad los puestos de un escalón en este proceso.
   *
   * Un puesto lo decide quien lo ocupa, y solo si tiene el permiso de aprobar
   * la actividad: la asignación nunca da un permiso. `problema` sale cuando el
   * escalón no tiene a nadie más (rol, persona, papel) y ninguno de sus puestos
   * tiene quien pueda decidir; dicho con lo que hay que hacer.
   */
  async puestosDelEscalon(
    em: EntityManager,
    procesoId: string,
    numeral: string,
    escalon: Pick<EscalonRonda, 'roles' | 'personas' | 'papeles' | 'puestos'>,
  ): Promise<{ cuentas: string[]; textos: string[]; problema: string | null }> {
    const ids = escalon.puestos ?? [];
    if (!ids.length) return { cuentas: [], textos: [], problema: null };

    const puestos = await em.getRepository(PuestoProceso).find({ where: { id: In(ids) } });
    const ocupantes = await em
      .getRepository(AsignacionPuesto)
      .find({ where: { procesoId, puestoId: In(ids), estado: 'VIGENTE' } });
    const pueden = new Set(await this.alcance.cuentasQuePueden('aprobar', numeral));

    const cuentas: string[] = [];
    const textos: string[] = [];
    let primerProblema: string | null = null;
    for (const id of ids) {
      const puesto = puestos.find((p) => p.id === id)?.nombre ?? 'que ya no existe';
      const ocupa = ocupantes.find((o) => o.puestoId === id);
      if (!ocupa) {
        textos.push(`Falta asignar (${puesto})`);
        primerProblema ??= mensajeDePuesto('SIN_ASIGNAR', puesto);
      } else if (!pueden.has(ocupa.usuarioId)) {
        textos.push(`${ocupa.nombre} (${puesto}, sin permiso)`);
        primerProblema ??= mensajeDePuesto('SIN_PERMISO', puesto, ocupa.nombre);
      } else {
        textos.push(`${ocupa.nombre} (${puesto})`);
        cuentas.push(ocupa.usuarioId);
      }
    }

    const hayMas = escalon.roles.length > 0 || escalon.personas.length > 0 || escalon.papeles.length > 0;
    return { cuentas, textos, problema: cuentas.length || hayMas ? null : primerProblema };
  }

  // --------------------------------------------------------------- decidir --

  /**
   * Quién es la cuenta en los términos en que se designan los responsables:
   * sus roles, su persona del directorio y los papeles que cumple en este
   * proceso.
   */
  async quienEs(em: EntityManager, procesoId: string, acceso: HiringAccess, numeral: string): Promise<Quien> {
    const roles = acceso.roles ?? [];
    if (!acceso.userId) return { roles, personaId: null, papeles: [], puestos: [], usuarioId: null };

    const [cuenta] = await em.query(`SELECT id_person::text AS id FROM auth."user" WHERE id_user::text = $1`, [
      acceso.userId,
    ]);
    const personaId: string | null = cuenta?.id ?? null;

    const participa: { papel: PapelEscalon }[] = await em.query(
      `SELECT DISTINCT papel
         FROM hiring.participaciones_proceso
        WHERE proceso_id = $1 AND estado = 'VIGENTE' AND usuario_id::text = $2`,
      [procesoId, acceso.userId],
    );
    // Solo los papeles que todavía responden por un escalón: el abogado de
    // antes de la 109 quedó relevado y ahora es un puesto.
    const papeles: PapelEscalon[] = participa.map((f) => f.papel).filter((p) => p === 'CONTRATACION');

    // Los puestos que ocupa, si puede aprobar aquí: el puesto no da permisos.
    const ocupa = await em
      .getRepository(AsignacionPuesto)
      .find({ where: { procesoId, usuarioId: acceso.userId, estado: 'VIGENTE' } });
    const puestos =
      ocupa.length && (await this.alcance.puedeEn(acceso, 'aprobar', numeral)) ? ocupa.map((o) => o.puestoId) : [];

    if (personaId) {
      const [supervisa] = await em.query(
        `SELECT 1
           FROM hiring.supervisiones_contrato s
           JOIN hiring.contratos k ON k.id = s.contrato_id
          WHERE k.proceso_id = $1 AND s.estado = 'VIGENTE' AND s.persona_id::text = $2
          LIMIT 1`,
        [procesoId, personaId],
      );
      if (supervisa) papeles.push('SUPERVISOR');
    }

    return { roles, personaId, papeles, puestos, usuarioId: acceso.userId };
  }

  private async previasDe(em: EntityManager, rondaId: string): Promise<DecisionPrevia[]> {
    const filas = await em.getRepository(Revision).find({ where: { aprobacionId: rondaId } });
    return filas.map((r) => ({
      escalon: r.escalon ?? 0,
      decision: r.decision,
      personaId: r.personaId ?? null,
      usuarioId: r.revisadoPorId ?? null,
    }));
  }

  /**
   * Comprueba que quien mira puede tomar esta decisión ahora, y calcula en qué
   * queda todo. No escribe nada: entre preparar y registrar, quien llama hace
   * sus propias comprobaciones —documentos que faltan, firma— sabiendo ya si
   * la decisión es la definitiva.
   *
   * Bloquea la ronda: dos revisores a la vez no deben hacer avanzar la cadena
   * dos veces.
   *
   * Una actividad en revisión sin ronda —enviada antes de la 101 por un camino
   * que la migración no cubrió— recibe una aquí, con la cadena que rige hoy.
   */
  async prepararDecision(
    em: EntityManager,
    actividad: ProcesoActividad,
    modalidad: string | null,
    accion: AccionEscalon,
    acceso: HiringAccess,
  ): Promise<DecisionPreparada> {
    if (actividad.estado !== 'EN_REVISION') {
      throw new ConflictException('La actividad no está esperando aprobación: no hay nada que decidir');
    }

    let ronda = await this.rondaEnCurso(em, actividad.id, true);
    if (!ronda) {
      const cadena = await this.cadenaPara(actividad.numeral, modalidad, em, actividad.procesoId);
      if (!cadena) {
        throw new ConflictException(
          'Esta actividad ya no requiere aprobación: retírala de revisión para cerrarla',
        );
      }
      ronda = await this.iniciar(
        em,
        actividad,
        cadena,
        { userId: actividad.enviadoPorId ?? '', userName: actividad.enviadoPor },
        'LEGADA',
      );
    }

    const escalones = await em
      .getRepository(EscalonRonda)
      .find({ where: { aprobacionId: ronda.id }, order: { orden: 'ASC' } });
    const escalon = escalones.find((e) => e.estado === 'PENDIENTE');
    if (!escalon) throw new ConflictException('Ningún escalón de esta ronda está esperando decisión');

    const quien = await this.quienEs(em, actividad.procesoId, acceso, actividad.numeral);
    const previas = await this.previasDe(em, ronda.id);

    // Un escalón de puestos sin nadie que pueda decidirlo: se dice qué hacer.
    const { problema } = await this.puestosDelEscalon(em, actividad.procesoId, actividad.numeral, escalon);
    if (problema) throw new ConflictException(problema);

    const motivo = motivoParaNoDecidir({
      escalon,
      accion,
      quien,
      usuarioId: acceso.userId || null,
      previas,
      permiteMismoAprobador: ronda.permiteMismoAprobador,
    });
    if (motivo) {
      throw escalon.estado !== 'PENDIENTE' ? new ConflictException(motivo) : new ForbiddenException(motivo);
    }

    const decision = DECISION_DE[accion];
    const completo = decision === 'APROBADO' ? escalonCompleto(escalon, previas, quien.personaId) : true;
    const tras = trasDecision(
      escalones.map((e) => e.orden),
      escalon.orden,
      decision,
      completo,
    );

    return { actividad, ronda, escalon, escalones, quien, decision, tras };
  }

  /**
   * Registra la decisión preparada: la fila en `revisiones`, el estado de los
   * escalones, el de la ronda y el de la actividad.
   *
   * La actividad solo deja EN_REVISION cuando la ronda se cierra; una
   * aprobación intermedia la deja donde está. Quien decide queda como
   * revisor de la actividad solo con la definitiva o al devolver o negar:
   * sellarlo antes diría que la aprobó quien solo dio el primer visto bueno.
   */
  async registrarDecision(
    em: EntityManager,
    preparada: DecisionPreparada,
    observaciones: string | null,
    acceso: HiringAccess,
    /**
     * En qué estado queda la actividad devuelta. DEVUELTO en las genéricas;
     * el estudio previo vuelve a BORRADOR, que es lo que su formulario edita.
     */
    estadoAlDevolver: EstadoActividad = 'DEVUELTO',
  ): Promise<Revision> {
    const { actividad, ronda, escalon, quien, decision } = preparada;
    const tras =
      decision === 'DEVUELTO' ? { ...preparada.tras, actividad: estadoAlDevolver } : preparada.tras;
    const ahora = new Date();

    const revision = await em.save(
      em.create(Revision, {
        procesoActividadId: actividad.id,
        decision,
        observaciones,
        versionRevisada: actividad.version ?? 1,
        revisadoPor: acceso.userName,
        revisadoPorId: acceso.userId || null,
        aprobacionId: ronda.id,
        escalon: escalon.orden,
        personaId: quien.personaId,
        estadoAnterior: actividad.estado,
        estadoResultante: tras.actividad,
      } as Partial<Revision>),
    );

    for (const [orden, estado] of tras.escalones) {
      await em.update(
        EscalonRonda,
        { aprobacionId: ronda.id, orden },
        estado === 'PENDIENTE' ? { estado, activadoAt: ahora } : { estado, resueltoAt: ahora },
      );
    }

    ronda.estado = tras.ronda;
    ronda.escalonActual = tras.escalonActual;
    if (tras.ronda !== 'EN_CURSO') ronda.cerradaAt = ahora;
    await em.save(ronda);

    if (tras.actividad !== 'EN_REVISION') {
      actividad.estado = tras.actividad;
      actividad.revisadoPor = acceso.userName;
      actividad.revisadoAt = ahora;
      await em.save(actividad);
    }

    return revision;
  }

  // -------------------------------------------------------- lo que se ve --

  /**
   * La ronda en curso de la actividad, o la última si ya se cerró, para pintar
   * el riel de escalones.
   *
   * Una ronda EN_CURSO de una actividad que ya no está en revisión es una que
   * otro camino dejó atrás: no se muestra como viva.
   */
  async rondaParaMostrar(actividad: ProcesoActividad, acceso: HiringAccess) {
    const em = this.dataSource.manager;
    const rondas = await em
      .getRepository(RondaAprobacion)
      .find({ where: { procesoActividadId: actividad.id }, order: { ronda: 'DESC' }, take: 1 });
    const ronda = rondas[0];
    if (!ronda) return null;

    const viva = ronda.estado === 'EN_CURSO' && actividad.estado === 'EN_REVISION';
    const escalones = await em
      .getRepository(EscalonRonda)
      .find({ where: { aprobacionId: ronda.id }, order: { orden: 'ASC' } });
    const previas = await this.previasDe(em, ronda.id);
    const quien = await this.quienEs(em, actividad.procesoId, acceso, actividad.numeral);

    const roles = await this.nombresDeRoles(escalones.flatMap((e) => e.roles));
    const personas = await this.nombresDePersonas(escalones.flatMap((e) => e.personas));
    const decisiones = await em
      .getRepository(Revision)
      .find({ where: { aprobacionId: ronda.id }, order: { createdAt: 'ASC' } });

    // Quién ocupa los puestos de cada escalón y si puede decidirlo (109).
    const dePuestos = new Map<number, { cuentas: string[]; textos: string[]; problema: string | null }>();
    for (const e of escalones) {
      dePuestos.set(e.orden, await this.puestosDelEscalon(em, actividad.procesoId, actividad.numeral, e));
    }

    const pendiente = viva ? escalones.find((e) => e.estado === 'PENDIENTE') : undefined;
    const problemaPendiente = pendiente ? (dePuestos.get(pendiente.orden)?.problema ?? null) : null;
    const faltaDesignar = !!problemaPendiente;
    const puedo = (accion: AccionEscalon) =>
      !!pendiente &&
      !faltaDesignar &&
      motivoParaNoDecidir({
        escalon: pendiente,
        accion,
        quien,
        usuarioId: acceso.userId || null,
        previas,
        permiteMismoAprobador: ronda.permiteMismoAprobador,
      }) === null;

    return {
      id: ronda.id,
      ronda: ronda.ronda,
      nombre: ronda.cadenaNombre,
      estado: viva ? 'EN_CURSO' : ronda.estado === 'EN_CURSO' ? 'CANCELADA' : ronda.estado,
      escalonActual: viva ? ronda.escalonActual : null,
      iniciadaPor: ronda.iniciadaPor,
      iniciadaAt: ronda.iniciadaAt,
      cerradaAt: ronda.cerradaAt,
      /** Lo que quien mira puede hacer ahora mismo, ya resuelto aquí. */
      acciones: ACCIONES.filter(puedo),
      /** Por qué no puede aprobar, cuando es responsable pero algo se lo impide. */
      motivo:
        pendiente && !faltaDesignar && esResponsable(pendiente, quien) && !puedo('APROBAR')
          ? motivoParaNoDecidir({
              escalon: pendiente,
              accion: 'APROBAR',
              quien,
              usuarioId: acceso.userId || null,
              previas,
              permiteMismoAprobador: ronda.permiteMismoAprobador,
            })
          : null,
      /** A quién espera, dicho para cualquiera que mire. */
      espera: problemaPendiente,
      escalones: escalones.map((e) => ({
        orden: e.orden,
        nombre: e.nombre,
        estado: e.estado,
        reglaDecision: e.reglaDecision,
        acciones: e.acciones,
        // Los puestos con el nombre de quien los ocupa: «Andrés Rojas (Abogado)».
        responsables: [
          ...(dePuestos.get(e.orden)?.textos ?? []),
          ...e.roles.map((r) => roles.get(r) ?? r),
          ...e.personas.map((p) => personas.get(p) ?? p),
          ...e.papeles.map((p) => NOMBRE_PAPEL[p] ?? p),
        ],
        activadoAt: e.activadoAt,
        resueltoAt: e.resueltoAt,
        decisiones: decisiones
          .filter((d) => d.escalon === e.orden)
          .map((d) => ({ decision: d.decision, revisadoPor: d.revisadoPor, fecha: d.createdAt })),
      })),
    };
  }

  /**
   * Los responsables de los escalones que esperan decisión, para avisarles.
   * Normalmente uno; la lista existe porque así lo pide quien avisa.
   */
  async responsablesPendientes(procesoId: string, numeral: string) {
    return this.dataSource.query(
      // Los puestos avisan a quien los ocupa en el proceso (109).
      `SELECT e.roles,
              e.personas,
              e.papeles,
              ARRAY(
                SELECT a.usuario_id::text FROM hiring.asignaciones_puesto a
                 WHERE a.proceso_id = pa.proceso_id AND a.estado = 'VIGENTE'
                   AND a.puesto_id::text = ANY (e.puestos)
              ) AS cuentas
         FROM hiring.proceso_actividades pa
         JOIN hiring.aprobaciones r ON r.proceso_actividad_id = pa.id AND r.estado = 'EN_CURSO'
         JOIN hiring.aprobacion_escalones e ON e.aprobacion_id = r.id AND e.estado = 'PENDIENTE'
        WHERE pa.proceso_id = $1 AND pa.numeral = $2 AND pa.estado = 'EN_REVISION'`,
      [procesoId, numeral],
    ) as Promise<{ roles: string[]; personas: string[]; papeles: PapelEscalon[]; cuentas: string[] }[]>;
  }

  /**
   * Lo que espera la decisión de quien consulta: la bandeja «Por revisar» y la
   * alerta de aprobaciones pendientes.
   *
   * Misma regla que `motivoParaNoDecidir`, dicha en SQL: es responsable del
   * escalón pendiente y no aprobó ya ese escalón ni —si la cadena no lo
   * permite— otro de la misma ronda. Las personas se comparan por su
   * `id_person`, que es como las guarda la configuración; antes se comparaban
   * con el id de la cuenta y quien fue designado por su nombre no veía nada.
   */
  async filasPorDecidir(acceso: HiringAccess): Promise<any[]> {
    const roles = acceso.roles ?? [];
    const usuarioId = acceso.userId ?? '';
    const [cuenta] = usuarioId
      ? await this.dataSource.query(`SELECT id_person::text AS id FROM auth."user" WHERE id_user::text = $1`, [
          usuarioId,
        ])
      : [];
    const personaId: string = cuenta?.id ?? '';

    const filas: any[] = await this.dataSource.query(
      `
      SELECT * FROM (
      SELECT DISTINCT ON (pa.id)
             p.id                AS proceso_id,
             p.radicado          AS radicado,
             p.objeto            AS objeto,
             m.nombre            AS modalidad,
             pa.numeral          AS numeral,
             a.nombre            AS actividad,
             a.etapa             AS etapa,
             pa.version          AS version,
             pa.enviado_por      AS enviado_por,
             COALESCE(e.activado_at, pa.updated_at) AS desde,
             e.orden             AS escalon,
             e.nombre            AS escalon_nombre,
             (SELECT count(*) FROM hiring.aprobacion_escalones x WHERE x.aprobacion_id = r.id)::int AS escalones,
             -- Si solo le llega por ocupar un puesto: entonces además tiene
             -- que poder aprobar la actividad, y eso se mira fuera.
             NOT (
               'SUPER_ADMIN' = ANY($1::text[])
               OR e.roles && $1::text[]
               OR ($2 <> '' AND $2 = ANY (e.personas))
               OR EXISTS (
                 SELECT 1 FROM hiring.participaciones_proceso pp
                  WHERE pp.proceso_id = p.id AND pp.estado = 'VIGENTE'
                    AND $3 <> '' AND pp.usuario_id::text = $3
                    AND pp.papel = ANY (e.papeles)
               )
               OR (
                 'SUPERVISOR' = ANY (e.papeles) AND $2 <> '' AND EXISTS (
                   SELECT 1 FROM hiring.supervisiones_contrato s
                   JOIN hiring.contratos k ON k.id = s.contrato_id
                  WHERE k.proceso_id = p.id AND s.estado = 'VIGENTE' AND s.persona_id::text = $2
                 )
               )
             ) AS solo_por_puesto
        FROM hiring.proceso_actividades pa
        JOIN hiring.procesos p ON p.id = pa.proceso_id
        JOIN hiring.actividades a ON a.numeral = pa.numeral
        LEFT JOIN hiring.modalidades m ON m.codigo = p.modalidad
        JOIN hiring.aprobaciones r ON r.proceso_actividad_id = pa.id AND r.estado = 'EN_CURSO'
        JOIN hiring.aprobacion_escalones e ON e.aprobacion_id = r.id AND e.estado = 'PENDIENTE'
       WHERE pa.estado = 'EN_REVISION'
         AND (
           'SUPER_ADMIN' = ANY($1::text[])
           OR e.roles && $1::text[]
           -- Quien ocupa en el proceso alguno de los puestos del escalón (109).
           OR ($3 <> '' AND EXISTS (
             SELECT 1 FROM hiring.asignaciones_puesto ap
              WHERE ap.proceso_id = p.id AND ap.estado = 'VIGENTE'
                AND ap.usuario_id::text = $3 AND ap.puesto_id::text = ANY (e.puestos)
           ))
           OR ($2 <> '' AND $2 = ANY (e.personas))
           OR EXISTS (
             SELECT 1 FROM hiring.participaciones_proceso pp
              WHERE pp.proceso_id = p.id AND pp.estado = 'VIGENTE'
                AND $3 <> '' AND pp.usuario_id::text = $3
                AND pp.papel = ANY (e.papeles)
           )
           OR (
             'SUPERVISOR' = ANY (e.papeles) AND $2 <> '' AND EXISTS (
               SELECT 1 FROM hiring.supervisiones_contrato s
               JOIN hiring.contratos k ON k.id = s.contrato_id
              WHERE k.proceso_id = p.id AND s.estado = 'VIGENTE' AND s.persona_id::text = $2
             )
           )
         )
         AND NOT EXISTS (
           SELECT 1 FROM hiring.revisiones v
            WHERE v.aprobacion_id = r.id
              AND v.decision = 'APROBADO'
              AND (($2 <> '' AND v.persona_id::text = $2) OR ($3 <> '' AND v.revisado_por_id = $3))
              AND (v.escalon = e.orden OR NOT r.permite_mismo_aprobador)
         )
       ORDER BY pa.id
      ) filas
      `,
      [roles, personaId, usuarioId],
    );

    // El puesto no da permisos: sin el de aprobar la actividad, no le toca.
    const quedan: any[] = [];
    for (const f of filas) {
      if (!f.solo_por_puesto || (await this.alcance.puedeEn(acceso, 'aprobar', f.numeral))) quedan.push(f);
    }
    return quedan.map(({ solo_por_puesto: _, ...f }) => f);
  }

  // ---------------------------------------------------------------- nombres --

  async nombresDeRoles(codigos: string[]): Promise<Map<string, string>> {
    const unicos = [...new Set(codigos)];
    if (!unicos.length) return new Map();
    const filas = await this.dataSource.query(`SELECT code, name FROM auth.role WHERE code = ANY($1::text[])`, [
      unicos,
    ]);
    return new Map(filas.map((f: any) => [f.code, f.name]));
  }

  async nombresDePersonas(ids: string[]): Promise<Map<string, string>> {
    const unicos = [...new Set(ids)].filter((id) => /^[0-9a-f-]{36}$/i.test(id));
    if (!unicos.length) return new Map();
    const filas = await this.dataSource.query(
      `SELECT p.id_person::text AS id, COALESCE(p.nom_largo, p.nom_tercero) AS nombre
         FROM auth.personas p
        WHERE p.id_person = ANY($1::uuid[])`,
      [unicos],
    );
    return new Map(filas.map((f: any) => [f.id, f.nombre]));
  }

  /** La actividad del proceso, o 404. */
  async actividad(em: EntityManager, procesoId: string, numeral: string) {
    const actividad = await em.getRepository(ProcesoActividad).findOne({ where: { procesoId, numeral } });
    if (!actividad) throw new NotFoundException(`La actividad ${numeral} no está instanciada en el proceso`);
    return actividad;
  }
}
