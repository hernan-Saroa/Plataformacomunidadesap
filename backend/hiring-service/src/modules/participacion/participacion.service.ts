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

/**
 * Cómo se designa un escalón de la cadena de la 3.1 en la 3.3 (102): el del
 * papel abogado eligiendo al abogado del proceso, uno por rol eligiendo a
 * alguien con el rol. Los que nombran personas ya dicen quién: no se designan.
 */
export function tipoDeEscalon(e: { roles: string[]; papeles: string[] }): 'ROL' | 'ABOGADO' | null {
  if (e.papeles.includes('ABOGADO')) return 'ABOGADO';
  if (e.roles.length) return 'ROL';
  return null;
}
import { AccionTraza, Trazabilidad } from '../../entities/trazabilidad.entity';
import { HiringAccess } from '../../auth/hiring-access';
import { PERMISO_PROCESO_ASIGNAR, tienePermiso } from '../../auth/permisos';
import { Accion } from '../../auth/alcance';
import { AlcanceService } from '../../auth/alcance.service';
import { AsignarAbogadoDto, DesignarEscalonDto, MotivoDto, ReasignarAbogadoDto } from './dto/participacion.dto';
import { CadenaAprobacionService } from '../cadena-aprobacion/cadena-aprobacion.service';
import {
  DesignacionEscalon,
  EscalonRonda,
  EstadoEscalon,
  NUMERAL_CON_DESIGNACION,
} from '../../entities/cadena-aprobacion.entity';
import { CdpService } from '../cdp/cdp.service';
import { respondeElAsignado } from './quien-responde';

/** Una cuenta a la que se le puede dar un papel en un proceso. */
export interface CuentaCandidata {
  usuarioId: string;
  usuarioNombre: string;
  personaId: string | null;
  nombre: string;
  cargo: string | null;
  email: string | null;
}

/** Lo que lleva un abogado, para repartir con criterio. */
export interface CargaDeAbogado {
  /** Procesos en los que es el abogado vigente. */
  procesosACargo: number;
  /** De esos, cuántos tienen el estudio previo esperando su decisión. */
  revisionesPendientes: number;
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

/** Por qué alguien no puede decidir sobre este proceso, o `null` si sí puede. */
export type MotivoNoDecide = 'SIN_ABOGADO' | 'NO_ES_TUYO' | 'SIN_PERMISO';

/**
 * Quién puede resolver una revisión del proceso (EFDS-1183).
 *
 * El abogado repartido en la 3.3, y nadie más. No basta con tener el permiso de
 * aprobar: eso lo tienen todos los revisores de la Dirección, y el flujo dice
 * que de este expediente responde el que lo recibió. El Director que quiera
 * decidir se lo reasigna a sí mismo, que deja constancia de quién lo hizo.
 *
 * Sin abogado repartido no se decide. Es deliberado y no un descuido: el
 * reparto es lo que pone a alguien a responder por el proceso, y aprobar
 * saltándoselo dejaría el expediente sin decir quién revisó. Un proceso en
 * revisión y sin abogado aparece en las alertas para que se reparta.
 *
 * Función pura para poder fijar la regla sin base de datos.
 */
export function motivoParaNoDecidir(
  tienePermisoDeAprobar: boolean,
  hayAbogado: boolean,
  esElAbogado: boolean,
): MotivoNoDecide | null {
  if (!tienePermisoDeAprobar) return 'SIN_PERMISO';
  if (!hayAbogado) return 'SIN_ABOGADO';
  if (!esElAbogado) return 'NO_ES_TUYO';
  return null;
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
     * La cadena de la 3.1, para designar quién decide cada escalón por rol
     * (migración 102). Opcional para que las pruebas que construyen el
     * servicio a mano sigan funcionando con solo la fuente de datos.
     */
    @Optional() cadenas?: CadenaAprobacionService,
  ) {
    this.cadenas = cadenas ?? new CadenaAprobacionService(dataSource);
  }

  private readonly cadenas: CadenaAprobacionService;

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
    const financiera = vigente('FINANCIERA');

    // Quien tomó el proceso es quien reparte el abogado. El Director también,
    // porque `proceso.assign` es suyo y tiene que poder corregir un reparto.
    const soyElDeContratacion = !!contratacion && esSuya(contratacion, acceso);
    const puedeRepartir = soyElDeContratacion || tienePermiso(acceso, PERMISO_PROCESO_ASIGNAR);

    /**
     * Ofrecer tomar la solicitud solo donde hay una que tomar.
     *
     * Se comprueba contra la bandeja y no solo contra el permiso porque si no
     * la pantalla enseñaría el botón en todos los procesos, incluidos los que
     * no han pedido CDP y los que ya lo tienen expedido, y la API lo rechazaría
     * cuando ya es tarde.
     */
    const puedeTomarFinanciera =
      !financiera &&
      (await this.alcance.puedeEn(acceso, 'editar', '4.2')) &&
      (await this.estaEnLaBandejaFinanciera(procesoId));

    return {
      /** Sin tomar: el proceso está en la bandeja y nadie responde por él. */
      puedeTomar: !contratacion && (await this.alcance.puedeEn(acceso, 'editar', NUMERAL_RADICACION)),
      puedeRepartir,
      contratacion: contratacion ? this.aVista(contratacion, acceso) : null,
      abogado: abogado ? this.aVista(abogado, acceso) : null,
      /** Quién responde por el CDP en la etapa 4, o nulo si nadie lo ha tomado. */
      financiera: financiera ? this.aVista(financiera, acceso) : null,
      puedeTomarFinanciera,
      /**
       * No debería pasar, pero quitar un abogado sin poner otro es una
       * situación real. En vez de impedirla se dice, para que el proceso no se
       * quede quieto sin que nadie lo note.
       */
      sinAbogado: !!contratacion && !abogado,
      /** Si el abogado se elige en su escalón de la cadena de la 3.1 (102). */
      abogadoEnCadena: await this.abogadoEnCadena(procesoId),
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
   * Se resuelven por alcance y no por código de rol —quien pueda aprobar la
   * 3.4 es quien puede revisar el proceso—, igual que hacen los endpoints. Nombrar aquí `REVISOR_CONTRATACION` ataría el reparto a un rol
   * que el administrador puede renombrar o desdoblar mañana desde el
   * backoffice, que es justo lo que la migración 060 vino a quitar del código.
   */
  async abogados(termino = ''): Promise<(CuentaCandidata & CargaDeAbogado)[]> {
    const cuentas = await this.cuentasCon('aprobar', '3.4', termino);
    const carga = await this.cargaDeAbogados();

    /*
     * Con su carga, como la sección «Profesionales» del módulo disciplinario:
     * quien reparte elige mejor si ve que uno lleva diez procesos y otro dos,
     * y cuántos estudios previos le esperan ahora mismo.
     */
    return cuentas.map((c) => {
      const suya =
        carga.get(`id:${c.usuarioId}`) ?? carga.get(`nombre:${c.usuarioNombre.trim().toLowerCase()}`);
      return { ...c, procesosACargo: suya?.procesos ?? 0, revisionesPendientes: suya?.pendientes ?? 0 };
    });
  }

  /** Cuántos procesos lleva cada abogado y cuántos estudios previos le esperan. */
  private async cargaDeAbogados(): Promise<Map<string, { procesos: number; pendientes: number }>> {
    const filas: { usuario_id: string | null; usuario_nombre: string; procesos: string; pendientes: string }[] =
      await this.dataSource.query(
        `SELECT pp.usuario_id::text AS usuario_id,
                pp.usuario_nombre,
                count(DISTINCT pp.proceso_id) AS procesos,
                count(DISTINCT pp.proceso_id) FILTER (WHERE pa.estado = 'EN_REVISION') AS pendientes
           FROM hiring.participaciones_proceso pp
           LEFT JOIN hiring.proceso_actividades pa
                  ON pa.proceso_id = pp.proceso_id AND pa.numeral = '3.1'
          WHERE pp.papel = 'ABOGADO' AND pp.estado = 'VIGENTE'
          GROUP BY pp.usuario_id, pp.usuario_nombre`,
      );

    const carga = new Map<string, { procesos: number; pendientes: number }>();
    for (const f of filas) {
      const valor = { procesos: Number(f.procesos), pendientes: Number(f.pendientes) };
      if (f.usuario_id) carga.set(`id:${f.usuario_id}`, valor);
      carga.set(`nombre:${f.usuario_nombre.trim().toLowerCase()}`, valor);
    }
    return carga;
  }

  /**
   * Las cuentas de la Dirección Financiera que pueden resolver un CDP.
   *
   * Por alcance y no por rol, igual que los abogados: quien pueda editar la
   * 4.2 es quien verifica la disponibilidad y expide. Nombrar aquí
   * `ESTRUCTURADOR_FINANCIERO` ataría la etapa 4 a un código de rol que el
   * administrador puede renombrar o desdoblar mañana desde el backoffice.
   *
   * No lo consume un desplegable —la solicitud no se reparte, se toma— sino el
   * aviso: mientras nadie la ha tomado no hay responsable a quien notificar, y
   * esta es la lista a la que se le manda.
   */
  async financieros(termino = ''): Promise<CuentaCandidata[]> {
    return this.cuentasCon('editar', '4.2', termino);
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

      // Dentro de la transacción: si la creación del CDP falla, tomar el
      // proceso tampoco queda hecho, y no hay un estado intermedio en el que la
      // etapa 3 esté cerrada sin su solicitud.
      await this.cdp.crearSolicitudSiCerroLaEtapa3(em, procesoId, acceso);
    });

    return this.estado(procesoId, acceso);
  }

  /**
   * Tomar la solicitud de CDP de la bandeja de la Financiera (actividad 4.1).
   *
   * Mismo acto que `tomar` y por el mismo motivo: nadie la entrega, la toma
   * quien va a resolverla. Lo que cambia es de qué bandeja sale —una solicitud
   * sin atender, no un proceso sin recibir— y que aquí no se cierra ninguna
   * actividad: la 4.1 la cumple la solicitud misma, no el hecho de tomarla.
   *
   * Tomarla es lo que pone nombre al responsable, y con eso el aviso deja de ir
   * a toda la Dirección Financiera y pasa a ser suyo.
   */
  async tomarFinanciera(procesoId: string, acceso: HiringAccess) {
    await this.dataSource.transaction(async (em) => {
      await this.exigirProceso(em, procesoId, true);

      const actual = await this.vigente(procesoId, 'FINANCIERA', em);
      if (actual) {
        throw new ConflictException(
          esSuya(actual, acceso)
            ? 'Ya habías tomado esta solicitud'
            : `${actual.nombre} tomó esta solicitud antes que tú`,
        );
      }

      // Que la solicitud exista y siga sin resolver. Sin esto se podría tomar
      // el CDP de un proceso que no lo ha pedido —o uno ya expedido—, y el
      // responsable quedaría puesto sobre algo que nadie tiene que atender.
      const [solicitud] = await em.query(
        `SELECT 1
           FROM hiring.cdp
          WHERE proceso_id = $1
            AND modificacion_id IS NULL
            AND estado = 'SOLICITADO'
          LIMIT 1`,
        [procesoId],
      );
      if (!solicitud) {
        throw new ConflictException(
          'Este proceso no tiene una solicitud de CDP esperando a que la atiendan',
        );
      }

      const cuenta = await this.exigirCuenta(acceso.userId, acceso.userName);
      const nueva = await this.guardar(em, procesoId, 'FINANCIERA', cuenta, acceso);

      // RADICAR y no DESIGNAR, con el criterio con que se eligió para la 3.3:
      // designar es poner a otro, y aquí nadie entrega nada.
      await this.traza(em, procesoId, nueva.id, 'RADICAR', acceso, {
        papel: 'FINANCIERA',
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

  // ------------------------------- quién decide cada escalón de la 3.1 (102) --

  /**
   * Los escalones por rol de la cadena de la 3.1, con su estado en la ronda en
   * curso si la hay.
   *
   * Con el estudio previo ya enviado manda la copia de la ronda: es la cadena
   * con la que de verdad se va a decidir. Antes del envío, la que rige hoy,
   * para que la Dirección pueda repartir desde que toma el proceso.
   */
  private async escalonesPorRol(
    em: EntityManager,
    proceso: Proceso,
  ): Promise<
    { orden: number; nombre: string; roles: string[]; estado: EstadoEscalon | null; tipo: 'ROL' | 'ABOGADO' }[]
  > {
    const actividad = await em
      .getRepository(ProcesoActividad)
      .findOne({ where: { procesoId: proceso.id, numeral: NUMERAL_CON_DESIGNACION } });

    const ronda = actividad ? await this.cadenas.rondaEnCurso(em, actividad.id) : null;
    if (ronda) {
      const escalones = await em
        .getRepository(EscalonRonda)
        .find({ where: { aprobacionId: ronda.id }, order: { orden: 'ASC' } });
      return escalones
        .map((e) => ({ orden: e.orden, nombre: e.nombre, roles: e.roles, estado: e.estado, tipo: tipoDeEscalon(e) }))
        .filter((e): e is typeof e & { tipo: 'ROL' | 'ABOGADO' } => e.tipo !== null);
    }

    const cadena = await this.cadenas.cadenaPara(NUMERAL_CON_DESIGNACION, proceso.modalidad ?? null, em);
    // Con la regla de siempre no hay escalones que repartir: decide el abogado.
    if (!cadena?.cadenaId) return [];
    return cadena.escalones
      .map((e, i) => ({ orden: i + 1, nombre: e.nombre, roles: e.roles, estado: null, tipo: tipoDeEscalon(e) }))
      .filter((e): e is typeof e & { tipo: 'ROL' | 'ABOGADO' } => e.tipo !== null);
  }

  /**
   * Si el abogado se elige como un escalón de la cadena de la 3.1.
   *
   * Entonces la 3.3 no tiene un paso aparte para el abogado: se elige en su
   * escalón, y elegirlo ahí es asignarlo como abogado del proceso, que sigue
   * siendo quien decide la 3.6, la 3.7 y las revisiones del PAA (Juan,
   * 2026-10-14).
   */
  async abogadoEnCadena(procesoId: string): Promise<boolean> {
    const proceso = await this.exigirProceso(this.dataSource.manager, procesoId);
    return (await this.escalonesPorRol(this.dataSource.manager, proceso)).some((e) => e.tipo === 'ABOGADO');
  }

  /** Lo que la 3.3 enseña de los escalones: quién está designado y si se puede cambiar. */
  async escalones(procesoId: string, acceso: HiringAccess) {
    const proceso = await this.exigirProceso(this.dataSource.manager, procesoId);
    const em = this.dataSource.manager;
    const escalones = await this.escalonesPorRol(em, proceso);
    const vigentes = await this.cadenas.designacionesDe(em, procesoId, NUMERAL_CON_DESIGNACION);
    const nombres = await this.cadenas.nombresDeRoles(escalones.flatMap((e) => e.roles));
    const relevados = await em.getRepository(DesignacionEscalon).find({
      where: { procesoId, numeral: NUMERAL_CON_DESIGNACION, estado: 'RELEVADO' },
      order: { relevadoAt: 'DESC' },
    });

    const contratacion = await this.vigente(procesoId, 'CONTRATACION', em);
    const abogado = await this.vigente(procesoId, 'ABOGADO', em);
    // Si el rol sigue existiendo y el designado lo sigue teniendo; si el
    // abogado todavía puede revisar.
    const validadas = await this.cadenas.designacionesValidadas(em, procesoId, NUMERAL_CON_DESIGNACION, escalones);
    const abogadoSinPermiso = abogado ? await this.cadenas.abogadoSinPermiso(em, procesoId) : null;
    const puedeDesignar =
      (!!contratacion && esSuya(contratacion, acceso)) || tienePermiso(acceso, PERMISO_PROCESO_ASIGNAR);

    return {
      puedeDesignar,
      escalones: escalones.map((e) => {
        // El escalón del abogado muestra al abogado del proceso.
        const d =
          e.tipo === 'ABOGADO'
            ? abogado
              ? { usuarioId: abogado.usuarioId, nombre: abogado.nombre, usuarioNombre: abogado.usuarioNombre, asignadoAt: abogado.asignadoAt, asignadoPor: abogado.asignadoPor }
              : null
            : vigentes.get(e.orden);
        return {
          orden: e.orden,
          nombre: e.nombre,
          tipo: e.tipo,
          roles: e.tipo === 'ABOGADO' ? ['Abogado del proceso'] : e.roles.map((r) => nombres.get(r) ?? r),
          designado: d
            ? { usuarioId: d.usuarioId, nombre: d.nombre, usuarioNombre: d.usuarioNombre, asignadoAt: d.asignadoAt, asignadoPor: d.asignadoPor }
            : null,
          /*
           * Lo que ya decidió en la ronda en curso queda como está. El abogado
           * se puede cambiar siempre, como hasta ahora: también responde por la
           * 3.6, la 3.7 y el PAA, y su decisión ya tomada no se reescribe.
           */
          cambiable: e.tipo === 'ABOGADO' || e.estado === null || e.estado === 'PENDIENTE' || e.estado === 'BLOQUEADO',
          leToca: e.estado === 'PENDIENTE',
          /** Qué impide que alguien decida el escalón, dicho con lo que hay que hacer. */
          problema:
            e.tipo === 'ABOGADO'
              ? abogadoSinPermiso
                ? `${abogadoSinPermiso} ya no tiene permiso para revisar: asigna otro abogado`
                : null
              : validadas.get(e.orden)?.problema === 'SIN_DESIGNAR'
                ? null
                : (validadas.get(e.orden)?.mensaje ?? null),
          /** El rol ya no existe: no se arregla designando, sino corrigiendo la cadena. */
          rolInexistente: e.tipo === 'ROL' && validadas.get(e.orden)?.problema === 'ROL_INEXISTENTE',
        };
      }),
      historial: relevados.map((d) => ({
        escalon: d.escalon,
        escalonNombre: d.escalonNombre,
        nombre: d.nombre,
        asignadoAt: d.asignadoAt,
        relevadoAt: d.relevadoAt,
        relevadoPor: d.relevadoPor,
        motivoRelevo: d.motivoRelevo,
      })),
    };
  }

  /** Las cuentas activas con alguno de los roles del escalón, para el desplegable. */
  async candidatosDeEscalon(procesoId: string, orden: number, termino = ''): Promise<CuentaCandidata[]> {
    const proceso = await this.exigirProceso(this.dataSource.manager, procesoId);
    const escalon = (await this.escalonesPorRol(this.dataSource.manager, proceso)).find((e) => e.orden === orden);
    if (!escalon) throw new NotFoundException('Ese escalón no se designa: no está definido por un rol');
    // Para el escalón del abogado, los mismos de siempre, con su carga.
    if (escalon.tipo === 'ABOGADO') return this.abogados(termino);
    return this.cuentasConRol(escalon.roles, termino);
  }

  private cuentasConRol(roles: string[], termino: string, soloEsta?: string): Promise<CuentaCandidata[]> {
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
         -- Solo roles y asignaciones activas: un rol desactivado no designa.
         JOIN auth.user_roles ur ON ur.id_user = u.id_user AND ur.is_active = true
         JOIN auth.role r ON r.id = ur.id_rol AND r.is_active = true
         LEFT JOIN auth.personas p ON p.id_person = u.id_person
        WHERE u.is_active = true
          AND r.code = ANY($1::text[])
          AND ($3::text IS NULL OR u.id_user::text = $3)
          AND ($2 = ''
               OR COALESCE(p.nom_largo, p.nom_tercero, u.username) ILIKE '%' || $2 || '%'
               OR u.username ILIKE '%' || $2 || '%')
        ORDER BY nombre
        LIMIT 50`,
      [roles, termino.trim(), soloEsta ?? null],
    );
  }

  /**
   * Designa quién decide un escalón por rol de la 3.1 en este proceso, o
   * cambia al que estaba.
   *
   * Lo hace quien reparte el abogado —quien tomó el proceso, o el Director—,
   * en el mismo lugar. Cambiar exige motivo y releva al anterior en vez de
   * borrarlo: respondió por su tramo. Lo que ya decidió en la ronda en curso no
   * se cambia: la designación nueva no reescribe quién aprobó.
   */
  async designarEscalon(procesoId: string, orden: number, dto: DesignarEscalonDto, acceso: HiringAccess) {
    /*
     * El escalón del abogado se designa asignando al abogado del proceso: es
     * el mismo acto, con sus mismas reglas, y así la 3.6, la 3.7 y el PAA
     * siguen sabiendo quién es.
     */
    const previo = await this.exigirProceso(this.dataSource.manager, procesoId);
    const delAbogado = (await this.escalonesPorRol(this.dataSource.manager, previo)).find(
      (e) => e.orden === orden && e.tipo === 'ABOGADO',
    );
    if (delAbogado) {
      if (await this.vigente(procesoId, 'ABOGADO')) {
        if ((dto.motivo ?? '').trim().length < 10) {
          throw new BadRequestException('Explica por qué se cambia de abogado');
        }
        await this.reasignarAbogado(procesoId, { usuarioId: dto.usuarioId, motivo: dto.motivo!.trim() }, acceso);
      } else {
        await this.asignarAbogado(procesoId, { usuarioId: dto.usuarioId }, acceso);
      }
      return this.escalones(procesoId, acceso);
    }

    await this.dataSource.transaction(async (em) => {
      const proceso = await this.exigirProceso(em, procesoId, true);
      await this.exigirQuePuedaRepartir(em, procesoId, acceso);

      const escalon = (await this.escalonesPorRol(em, proceso)).find((e) => e.orden === orden);
      if (!escalon) {
        throw new NotFoundException('Ese escalón no se designa: no está definido por un rol');
      }
      if (escalon.estado && escalon.estado !== 'PENDIENTE' && escalon.estado !== 'BLOQUEADO') {
        throw new ConflictException(
          `El escalón ${orden} ya decidió en esta revisión: la designación queda como está hasta el próximo envío`,
        );
      }

      const [cuenta] = await this.cuentasConRol(escalon.roles, '', dto.usuarioId);
      if (!cuenta) {
        throw new BadRequestException(
          'Esa persona no tiene el rol del escalón: solo se designa a quien lo tiene',
        );
      }

      const repo = em.getRepository(DesignacionEscalon);
      const actual = await repo.findOne({
        where: { procesoId, numeral: NUMERAL_CON_DESIGNACION, escalon: orden, estado: 'VIGENTE' },
      });
      if (actual?.usuarioId === cuenta.usuarioId) {
        throw new ConflictException('Esa persona ya está designada para este escalón');
      }
      if (actual) {
        if ((dto.motivo ?? '').trim().length < 10) {
          throw new BadRequestException('Explica por qué cambia quien revisa este escalón');
        }
        actual.estado = 'RELEVADO';
        actual.relevadoAt = new Date();
        actual.relevadoPor = acceso.userName;
        actual.motivoRelevo = dto.motivo!.trim();
        await repo.save(actual);
      }

      const nueva = await repo.save(
        repo.create({
          procesoId,
          numeral: NUMERAL_CON_DESIGNACION,
          escalon: orden,
          escalonNombre: escalon.nombre,
          usuarioId: cuenta.usuarioId,
          usuarioNombre: cuenta.usuarioNombre,
          personaId: cuenta.personaId ?? null,
          nombre: cuenta.nombre,
          estado: 'VIGENTE',
          asignadoPor: acceso.userName,
        }),
      );

      await em.save(
        em.create(Trazabilidad, {
          procesoId,
          entidadId: nueva.id,
          entidad: 'designacion_escalon',
          accion: 'DESIGNAR',
          detalle: {
            numeral: NUMERAL_CON_DESIGNACION,
            escalon: orden,
            escalonNombre: escalon.nombre,
            designado: cuenta.nombre,
            anterior: actual?.nombre ?? null,
            motivo: actual ? dto.motivo!.trim() : null,
            // Si al designado ya le toca, el aviso le dice que tiene algo esperando.
            pendiente: escalon.estado === 'PENDIENTE',
          },
          usuarioNombre: acceso.userName,
          usuarioId: acceso.userId,
        } as Partial<Trazabilidad>),
      );
    });

    return this.escalones(procesoId, acceso);
  }

  // ------------------------------------------------ lo que consumen otras --

  /**
   * Quién resuelve las revisiones de este proceso, y si le toca a quien
   * pregunta.
   *
   * Vive aquí y no en el estudio previo porque ya son dos las actividades que
   * lo preguntan —la revisión del estudio previo y la de la modalidad— y con
   * una copia en cada una acabarían discrepando sobre el mismo proceso.
   *
   * `numeral` es la actividad que se decide (3.4, 3.5, 3.6 o 3.7): el permiso
   * de aprobar se mira con el alcance de ese punto, no en general.
   */
  async quienDecide(procesoId: string, acceso: HiringAccess, numeral: string) {
    // La regla sale de `RESPONDE_EL_ASIGNADO`, que es también lo que la
    // pantalla lee para decir a quién le toca: si una actividad decidiera por
    // el abogado sin figurar ahí, la pantalla nombraría a otro.
    const regla = respondeElAsignado(numeral);
    if (regla?.papel !== 'ABOGADO') {
      throw new Error(`La ${numeral} no figura en RESPONDE_EL_ASIGNADO como del abogado`);
    }
    const abogado = await this.vigente(procesoId, 'ABOGADO');
    const motivo = motivoParaNoDecidir(
      await this.alcance.puedeEn(acceso, regla.accion, numeral),
      !!abogado,
      !!abogado && esSuya(abogado, acceso),
    );
    return { abogado, motivo };
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
    return [...new Set(suyas.filter((p) => esSuya(p, acceso)).map((p) => p.procesoId))];
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

  /**
   * Las solicitudes de CDP que están en la bandeja de la Financiera.
   *
   * «Estar» es tener un CDP en SOLICITADO que nadie ha tomado. Se define por el
   * estado del CDP y no por la etapa del proceso a propósito: `procesos.etapa`
   * es dónde se está trabajando, y un proceso puede haber avanzado mientras la
   * solicitud sigue sin resolver.
   *
   * `modificacion_id IS NULL` con el criterio de `delProceso`: el CDP de una
   * adición es suyo y no entra a esta bandeja.
   */
  async idsEnBandejaFinanciera(soloEste?: string): Promise<string[]> {
    const filas: { id: string }[] = await this.dataSource.query(
      `SELECT p.id
         FROM hiring.procesos p
         JOIN hiring.cdp c
           ON c.proceso_id = p.id
          AND c.modificacion_id IS NULL
          AND c.estado = 'SOLICITADO'
        WHERE p.estado = 'EN_CURSO'
          AND ($1::uuid IS NULL OR p.id = $1::uuid)
          AND NOT EXISTS (
            SELECT 1 FROM hiring.participaciones_proceso pp
             WHERE pp.proceso_id = p.id
               AND pp.papel = 'FINANCIERA'
               AND pp.estado = 'VIGENTE'
          )`,
      [soloEste ?? null],
    );
    return filas.map((f) => f.id);
  }

  /** Si esa solicitud concreta sigue en la bandeja de la Financiera. */
  async estaEnLaBandejaFinanciera(procesoId: string): Promise<boolean> {
    return (await this.idsEnBandejaFinanciera(procesoId)).length > 0;
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

  /**
   * Las cuentas que pueden hacer esa acción en ese punto, para los
   * desplegables.
   *
   * Quién puede lo decide `AlcanceService`, que es donde vive la regla de qué
   * alcance cubre qué punto; aquí solo se les pone nombre y correo. Repetir
   * esa regla en esta consulta haría que el desplegable y el guard pudieran
   * discrepar sobre la misma persona.
   */
  private async cuentasCon(
    accion: Accion,
    numeral: string,
    termino: string,
  ): Promise<CuentaCandidata[]> {
    const ids = await this.alcance.cuentasQuePueden(accion, numeral);
    if (!ids.length) return [];

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
         LEFT JOIN auth.personas p ON p.id_person = u.id_person
        WHERE u.id_user::text = ANY($1::text[])
          AND ($2 = ''
               OR COALESCE(p.nom_largo, p.nom_tercero, u.username) ILIKE '%' || $2 || '%'
               OR u.username ILIKE '%' || $2 || '%')
        ORDER BY nombre
        LIMIT 50`,
      [ids, termino.trim()],
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
