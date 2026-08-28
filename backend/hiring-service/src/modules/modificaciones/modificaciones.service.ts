import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, IsNull, Not } from 'typeorm';

import {
  EstadoModificacion,
  ModificacionContrato,
  NUMERAL_MODIFICACIONES,
  PublicacionModificacion,
  TipoModificacion,
  TopeAdicion,
} from '../../entities/modificacion-contrato.entity';
import { Cdp, EstadoCdp } from '../../entities/cdp.entity';
import { EstadoRp, RegistroPresupuestal } from '../../entities/registro-presupuestal.entity';
import { Contrato, EstadoContrato } from '../../entities/contrato.entity';
import { Proceso } from '../../entities/proceso.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { AccionTraza, Trazabilidad } from '../../entities/trazabilidad.entity';
import { Documento } from '../../entities/documento.entity';
import { Expediente } from '../../entities/expediente.entity';
import { HiringAccess } from '../../auth/hiring-access';
import { puedeTransicionar as cdpPuedeTransicionar } from '../cdp/cdp.service';
import { puedeTransicionar as rpPuedeTransicionar } from '../registro-presupuestal/registro-presupuestal.service';
import { margenDeAdicion, MargenDeAdicion } from './margen-de-adicion';
import {
  diasSuspendidos,
  NOMBRE_TIPO,
  plazoConMasDias,
  porQueNoAdmiteTipo,
  TIPOS_CON_TRAMITE,
} from './reglas-por-tipo';
import {
  AprobarModificacionDto,
  ExpedirRespaldoDto,
  PublicarModificacionDto,
  RechazarModificacionDto,
  RechazarRespaldoDto,
  RevocarModificacionDto,
  SolicitarAclaratorioDto,
  SolicitarAdicionDto,
  SolicitarCesionDto,
  SolicitarProrrogaDto,
  SolicitarReanudacionDto,
  SolicitarRespaldoDto,
  SolicitarSuspensionDto,
  SolicitarTerminacionDto,
} from './dto/modificaciones.dto';

export { NUMERAL_MODIFICACIONES, margenDeAdicion };
export { TIPOS_CON_TRAMITE, porQueNoAdmiteTipo } from './reglas-por-tipo';

/** Qué respaldo se está tramitando: el certificado o el compromiso. */
export type TipoRespaldo = 'CDP' | 'RP';

interface ArchivoCargado {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
}

/**
 * Si el estado del contrato admite modificaciones, sea cual sea el tipo.
 *
 * En ejecución, que es lo que dice el criterio de la historia, **y suspendido**
 * desde EFDS-1178: un contrato en pausa tiene que poder reanudarse o terminarse,
 * y las dos cosas son modificaciones. Qué tipo cabe en cada caso lo decide
 * `porQueNoAdmiteTipo`, que además mira si hay una suspensión sin levantar.
 *
 * Ni terminado ni liquidado: el acta cierra las cuentas del contrato y la
 * terminación cierra su ejecución, y en los dos casos lo que sigue no es
 * modificarlo.
 *
 * Función pura para poder probar la regla sin base de datos.
 */
export function admiteModificacion(estado: EstadoContrato): boolean {
  return estado === 'EJECUCION' || estado === 'SUSPENDIDO';
}

/**
 * Modificaciones contractuales — actividad 9.5 (EFDS-1176, RF-MOD-01 y RF-MOD-05).
 *
 * Los siete tipos de la matriz cuelgan de la misma tabla: la adición en dinero
 * (EFDS-1176), la prórroga (EFDS-1177) y la cesión, el aclaratorio, la
 * suspensión/reanudación y la terminación anticipada (EFDS-1178).
 *
 * **El trámite tiene dos momentos a propósito.** La adición se solicita y queda
 * EN_TRAMITE; aprobarla exige el CDP y el RP expedidos. Sin ese estado
 * intermedio no habría un intento que impedir cuando falta el respaldo, que es
 * el segundo criterio de aceptación de la historia.
 */
@Injectable()
export class ModificacionesService {
  constructor(private readonly dataSource: DataSource) {}

  // ------------------------------------------------------------- consulta --

  async estado(procesoId: string, _acceso: HiringAccess) {
    const em = this.dataSource.manager;
    const contrato = await this.contratoDelProceso(em, procesoId);
    const tope = await this.topeConfigurado();

    if (!contrato) {
      return {
        contrato: null,
        tope,
        margen: null as MargenDeAdicion | null,
        puedeSolicitar: false,
        motivoNoPuede: 'el proceso todavía no tiene contrato generado',
        modificaciones: [] as unknown[],
      };
    }

    const modificaciones = await em.getRepository(ModificacionContrato).find({
      where: { contratoId: contrato.id },
      order: { createdAt: 'ASC' },
    });

    const admite = admiteModificacion(contrato.estado);
    const suspension = await this.suspensionVigente(em, contrato.id);

    // Qué tipo cabe ahora y por qué no el resto. Va resuelto desde el servidor
    // y no deducido en la pantalla: la regla vive en un solo sitio y así el
    // panel puede decir el motivo en vez de apagar un botón sin explicación.
    const tipos = TIPOS_CON_TRAMITE.map((tipo) => {
      const motivo = porQueNoAdmiteTipo(
        { estado: contrato.estado, suspendido: suspension !== null },
        tipo,
      );
      return { tipo, nombre: NOMBRE_TIPO[tipo], puede: motivo === null, motivo };
    });

    return {
      contrato: {
        numero: contrato.numero,
        objeto: contrato.objeto,
        estado: contrato.estado,
        valor: contrato.valor,
        plazoDias: contrato.plazoDias,
        contratistaNombre: contrato.contratistaNombre,
        contratistaDocumento: contrato.contratistaDocumento,
      },
      tipos,
      // La suspensión sin levantar, que es lo que la reanudación necesita
      // nombrar: «suspendido desde el 1 de septiembre».
      suspension: suspension
        ? {
            id: suspension.id,
            numero: suspension.numero,
            desde: suspension.suspensionDesde,
            hastaPrevista: suspension.suspensionHasta,
          }
        : null,
      tope,
      // Sin cifra solicitada: es lo que la pantalla necesita para decir cuánto
      // cabe antes de que alguien escriba nada.
      margen: this.margenDe(contrato, modificaciones, 0, tope.porcentaje),
      puedeSolicitar: admite,
      motivoNoPuede: admite ? null : this.porQueNoAdmite(contrato.estado),
      modificaciones: await Promise.all(
        modificaciones.map((m) => this.verModificacion(em, m)),
      ),
    };
  }

  // ------------------------------------------------------------- solicitud --

  /** Registra la adición en trámite. Todavía no toca el valor del contrato. */
  async solicitarAdicion(procesoId: string, dto: SolicitarAdicionDto, acceso: HiringAccess) {
    await this.dataSource.transaction(async (em) => {
      const contrato = await this.exigirContratoModificable(em, procesoId);
      const tope = await this.topeConfigurado(em);
      const previas = await this.modificacionesDe(em, contrato.id);

      // Se juzga ya, para no dejar entrar una adición que nunca se va a poder
      // aprobar y que obligaría a tramitar un CDP en balde.
      const margen = this.margenDe(contrato, previas, dto.valorAdicionado, tope.porcentaje);
      if (!margen.cabe) {
        throw new ConflictException(`No se puede adicionar el contrato: ${margen.motivo}`);
      }

      const registro = await em.save(
        em.create(ModificacionContrato, {
          contratoId: contrato.id,
          tipo: 'ADICION' as const,
          justificacion: dto.justificacion,
          valorAdicionado: dto.valorAdicionado,
          estado: 'EN_TRAMITE' as const,
          solicitadaPor: acceso.userName,
        } as Partial<ModificacionContrato>),
      );

      await this.marcarActividad(em, procesoId, contrato.id, acceso);

      await this.traza(em, procesoId, registro.id, 'SOLICITAR', acceso, {
        actividad: NUMERAL_MODIFICACIONES,
        contrato: contrato.numero,
        tipo: 'ADICION',
        valorAdicionado: dto.valorAdicionado,
        margenDisponible: margen.margenDisponible,
      });
    });

    return this.estado(procesoId, acceso);
  }

  // ------------------------------------------- el CDP y el RP de la adición --

  /**
   * Solicita el CDP o el RP que respalda la adición.
   *
   * Son filas normales de sus tablas, con el mismo ciclo de EFDS-1148 y
   * EFDS-1163. Lo único que los distingue es `modificacionId`.
   */
  async solicitarRespaldo(
    procesoId: string,
    modificacionId: string,
    tipo: TipoRespaldo,
    dto: SolicitarRespaldoDto,
    acceso: HiringAccess,
  ) {
    await this.dataSource.transaction(async (em) => {
      const { contrato, modificacion } = await this.exigirEnTramite(em, procesoId, modificacionId);

      if (await this.respaldoVigente(em, modificacionId, tipo)) {
        throw new ConflictException(
          `La adición ya tiene un ${tipo} en curso: recházalo antes de solicitar otro`,
        );
      }

      const valor = modificacion.valorAdicionado ?? 0;

      if (tipo === 'CDP') {
        await em.save(
          em.create(Cdp, {
            procesoId,
            modificacionId,
            rubro: dto.rubro,
            valor,
            estado: 'SOLICITADO' as EstadoCdp,
            solicitadoPor: acceso.userName,
          } as Partial<Cdp>),
        );
      } else {
        await em.save(
          em.create(RegistroPresupuestal, {
            contratoId: contrato.id,
            modificacionId,
            rubro: dto.rubro,
            valor,
            estado: 'SOLICITADO' as EstadoRp,
            solicitadoPor: acceso.userName,
          } as Partial<RegistroPresupuestal>),
        );
      }

      await this.traza(em, procesoId, modificacionId, 'SOLICITAR', acceso, {
        actividad: NUMERAL_MODIFICACIONES,
        respaldo: tipo,
        rubro: dto.rubro,
        valor,
      });
    });

    return this.estado(procesoId, acceso);
  }

  /** La Financiera confirma que hay disponibilidad. */
  async verificarRespaldo(
    procesoId: string,
    modificacionId: string,
    tipo: TipoRespaldo,
    acceso: HiringAccess,
  ) {
    return this.transicionarRespaldo(procesoId, modificacionId, tipo, 'VERIFICADO', acceso, {});
  }

  /** La Financiera expide el certificado o el compromiso. */
  async expedirRespaldo(
    procesoId: string,
    modificacionId: string,
    tipo: TipoRespaldo,
    dto: ExpedirRespaldoDto,
    acceso: HiringAccess,
  ) {
    return this.transicionarRespaldo(procesoId, modificacionId, tipo, 'EXPEDIDO', acceso, {
      numero: dto.numero,
      valor: dto.valor,
      fechaExpedicion: dto.fechaExpedicion,
      vigenciaFiscal: dto.vigenciaFiscal ?? null,
      expedidoPor: acceso.userName,
    });
  }

  /** No hay disponibilidad en el rubro. */
  async rechazarRespaldo(
    procesoId: string,
    modificacionId: string,
    tipo: TipoRespaldo,
    dto: RechazarRespaldoDto,
    acceso: HiringAccess,
  ) {
    return this.transicionarRespaldo(procesoId, modificacionId, tipo, 'RECHAZADO', acceso, {
      observaciones: dto.observaciones,
    });
  }

  // ------------------------------------------- prorroga (EFDS-1177) --

  /**
   * Registra la prórroga en trámite.
   *
   * No pide CDP ni RP: la prórroga extiende el plazo **sin afectar el
   * presupuesto** (RF-MOD-02). Exigirle respaldo presupuestal la trataría como
   * una adición y obligaría a tramitar un certificado que nada compromete.
   */
  async solicitarProrroga(procesoId: string, dto: SolicitarProrrogaDto, acceso: HiringAccess) {
    return this.crear(procesoId, 'PRORROGA', acceso, dto.justificacion, {
      diasProrroga: dto.diasProrroga,
    }, { dias: dto.diasProrroga });
  }

  // --------------------------- cesion, aclaratorio y suspension (EFDS-1178) --

  /** Registra la cesión en trámite. El contratista solo cambia al aprobarla. */
  async solicitarCesion(procesoId: string, dto: SolicitarCesionDto, acceso: HiringAccess) {
    return this.crear(procesoId, 'CESION', acceso, dto.justificacion, {
      cesionarioDocumento: dto.cesionarioDocumento,
      cesionarioNombre: dto.cesionarioNombre,
      cesionarioTipo: dto.cesionarioTipo,
    }, { cesionario: dto.cesionarioNombre });
  }

  /**
   * Registra el aclaratorio en trámite.
   *
   * No cambia plazo, valor ni partes: precisa lo que el contrato ya dice. Lo
   * único que produce es el acto que se adjunta al aprobarlo.
   */
  async solicitarAclaratorio(
    procesoId: string,
    dto: SolicitarAclaratorioDto,
    acceso: HiringAccess,
  ) {
    return this.crear(procesoId, 'ACLARATORIO', acceso, dto.justificacion, {}, {});
  }

  /**
   * Registra la terminación anticipada en trámite.
   *
   * El contrato solo queda TERMINADO al aprobarla, con el acta o la resolución
   * adjunta: es el mismo criterio de los demás tipos, y aquí importa más,
   * porque terminar es lo único que no se deshace reanudando.
   */
  async solicitarTerminacion(
    procesoId: string,
    dto: SolicitarTerminacionDto,
    acceso: HiringAccess,
  ) {
    // La fecha es la del hecho: un contrato no deja de ejecutarse en el futuro,
    // y el informe final y la liquidación se cuentan contra ella.
    this.validarFecha(dto.terminacionEl);

    return this.crear(
      procesoId,
      'TERMINACION_ANTICIPADA',
      acceso,
      dto.justificacion,
      { terminacionCausal: dto.terminacionCausal, terminacionEl: dto.terminacionEl },
      { causal: dto.terminacionCausal, terminacionEl: dto.terminacionEl },
    );
  }

  /** Registra la suspensión en trámite. El contrato se pausa al aprobarla. */
  async solicitarSuspension(procesoId: string, dto: SolicitarSuspensionDto, acceso: HiringAccess) {
    if (dto.suspensionHasta && dto.suspensionHasta < dto.suspensionDesde) {
      throw new BadRequestException(
        'La fecha prevista de reanudación no puede ser anterior a la de suspensión',
      );
    }

    return this.crear(procesoId, 'SUSPENSION', acceso, dto.justificacion, {
      suspensionDesde: dto.suspensionDesde,
      suspensionHasta: dto.suspensionHasta ?? null,
    }, { desde: dto.suspensionDesde, hasta: dto.suspensionHasta ?? null });
  }

  /**
   * Registra la reanudación en trámite, contra la suspensión que levanta.
   *
   * La suspensión se busca aquí y no se recibe: hay una sola vigente, y pedirla
   * por parámetro dejaría abierto reanudar una que ya se levantó.
   */
  async solicitarReanudacion(
    procesoId: string,
    dto: SolicitarReanudacionDto,
    acceso: HiringAccess,
  ) {
    await this.dataSource.transaction(async (em) => {
      const { contrato, suspension } = await this.exigirPuedeTramitar(em, procesoId, 'REANUDACION');
      // `porQueNoAdmiteTipo` ya garantiza que exista; esto es para el tipo.
      if (!suspension) throw new ConflictException('El contrato no está suspendido');

      if (dto.reanudadaEl < (suspension.suspensionDesde as string)) {
        throw new BadRequestException(
          'El contrato no puede reanudarse antes de la fecha en que se suspendió',
        );
      }
      this.validarFecha(dto.reanudadaEl);

      const registro = await em.save(
        em.create(ModificacionContrato, {
          contratoId: contrato.id,
          tipo: 'REANUDACION' as TipoModificacion,
          justificacion: dto.justificacion,
          reanudaModificacionId: suspension.id,
          reanudadaEl: dto.reanudadaEl,
          estado: 'EN_TRAMITE' as EstadoModificacion,
          solicitadaPor: acceso.userName,
        } as Partial<ModificacionContrato>),
      );

      await this.marcarActividad(em, procesoId, contrato.id, acceso);
      await this.traza(em, procesoId, registro.id, 'SOLICITAR', acceso, {
        actividad: NUMERAL_MODIFICACIONES,
        contrato: contrato.numero,
        tipo: 'REANUDACION',
        suspendidoDesde: suspension.suspensionDesde,
        reanudadaEl: dto.reanudadaEl,
      });
    });

    return this.estado(procesoId, acceso);
  }

  /** Lo común de los cinco trámites que no son la adición. */
  private async crear(
    procesoId: string,
    tipo: TipoModificacion,
    acceso: HiringAccess,
    justificacion: string,
    propio: Partial<ModificacionContrato>,
    detalle: Record<string, unknown>,
  ) {
    await this.dataSource.transaction(async (em) => {
      const { contrato } = await this.exigirPuedeTramitar(em, procesoId, tipo);

      const registro = await em.save(
        em.create(ModificacionContrato, {
          contratoId: contrato.id,
          tipo,
          justificacion,
          estado: 'EN_TRAMITE' as EstadoModificacion,
          solicitadaPor: acceso.userName,
          ...propio,
        } as Partial<ModificacionContrato>),
      );

      await this.marcarActividad(em, procesoId, contrato.id, acceso);
      await this.traza(em, procesoId, registro.id, 'SOLICITAR', acceso, {
        actividad: NUMERAL_MODIFICACIONES,
        contrato: contrato.numero,
        tipo,
        ...detalle,
      });
    });

    return this.estado(procesoId, acceso);
  }

  // ------------------------------------------------------------ aprobación --

  /**
   * Aprueba la adición y aumenta el valor del contrato.
   *
   * Es donde se cumplen los dos criterios de la historia: exige el CDP y el RP
   * expedidos, y sin ellos lo impide diciendo cuál falta.
   */
  async aprobar(
    procesoId: string,
    modificacionId: string,
    dto: AprobarModificacionDto,
    acto: ArchivoCargado,
    hash: string,
    acceso: HiringAccess,
  ) {
    await this.dataSource.transaction(async (em) => {
      const { contrato, modificacion } = await this.exigirEnTramite(em, procesoId, modificacionId);

      // Solo la adición compromete presupuesto. Exigirle CDP y RP a una
      // prórroga o a un aclaratorio obligaría a tramitar un certificado que no
      // respalda nada: RF-MOD-02 dice expresamente «sin afectar el presupuesto».
      if (modificacion.tipo === 'ADICION') {
        const faltan = await this.respaldoPendiente(em, modificacionId);
        if (faltan.length > 0) {
          throw new ConflictException(
            `No se puede aprobar la adición: ${faltan.join('; ')}`,
          );
        }

        const tope = await this.topeConfigurado(em);
        const previas = await this.modificacionesDe(em, contrato.id);
        // Se vuelve a juzgar: entre la solicitud y la aprobación pudo aprobarse
        // otra adición, y el margen ya no es el mismo.
        const margen = this.margenDe(
          contrato,
          previas.filter((m) => m.id !== modificacionId),
          modificacion.valorAdicionado ?? 0,
          tope.porcentaje,
        );
        if (!margen.cabe) {
          throw new ConflictException(`No se puede aprobar la adición: ${margen.motivo}`);
        }

        modificacion.topePorcentaje = tope.porcentaje;
      }

      this.validarFecha(dto.fechaSuscripcion);

      const expediente = await em.findOne(Expediente, { where: { procesoId } });
      if (!expediente) throw new NotFoundException('El proceso no tiene expediente abierto');

      const documento = await this.guardarDocumento(
        em,
        expediente.id,
        `Contrato ${contrato.numero} · modificación ${dto.numero}`,
        acto,
        hash,
        acceso,
      );

      modificacion.estado = 'APROBADA';
      modificacion.numero = dto.numero;
      modificacion.fechaSuscripcion = dto.fechaSuscripcion;
      modificacion.documentoId = documento.id;
      modificacion.aprobadaPor = acceso.userName;
      modificacion.aprobadaAt = new Date();

      const efecto = await this.aplicarEfecto(em, contrato, modificacion);

      await em.save(modificacion);
      await em.save(contrato);

      await this.marcarActividad(em, procesoId, contrato.id, acceso);

      await this.traza(em, procesoId, modificacion.id, 'APROBAR', acceso, {
        actividad: NUMERAL_MODIFICACIONES,
        contrato: contrato.numero,
        tipo: modificacion.tipo,
        numero: dto.numero,
        ...efecto,
      });
    });

    return this.estado(procesoId, acceso);
  }

  /**
   * Lo que cada tipo le hace al contrato al aprobarse.
   *
   * Un solo sitio con todos los efectos, y no un `if` repartido por el
   * servicio: revocar tiene que deshacer exactamente esto, y tenerlos juntos es
   * lo que permite leerlos en pareja.
   *
   * Devuelve lo que hay que dejar en la trazabilidad, que cambia con el tipo:
   * de una adición importa la plata y de una suspensión las fechas.
   */
  private async aplicarEfecto(
    em: EntityManager,
    contrato: Contrato,
    modificacion: ModificacionContrato,
  ): Promise<Record<string, unknown>> {
    switch (modificacion.tipo) {
      case 'ADICION': {
        const cdp = await this.respaldoExpedido(em, modificacion.id, 'CDP');
        const rp = await this.respaldoExpedido(em, modificacion.id, 'RP');

        const valorAntes = contrato.valor;
        const valorDespues = valorAntes + (modificacion.valorAdicionado ?? 0);

        modificacion.cdpId = (cdp as Cdp).id;
        modificacion.rpId = (rp as RegistroPresupuestal).id;
        modificacion.valorContratoAntes = valorAntes;
        modificacion.valorContratoDespues = valorDespues;

        // Lo que hace real la adición: el balance del informe final, el cuadre
        // del cierre financiero y el aviso de sobrepago de los pagos leen esto.
        contrato.valor = valorDespues;

        return { valorAdicionado: modificacion.valorAdicionado, valorAntes, valorDespues };
      }

      case 'PRORROGA': {
        const plazo = plazoConMasDias(contrato.plazoDias, modificacion.diasProrroga ?? 0);
        modificacion.plazoDiasAntes = plazo.antes;
        modificacion.plazoDiasDespues = plazo.despues;
        contrato.plazoDias = plazo.despues;

        return { diasProrroga: modificacion.diasProrroga, plazoAntes: plazo.antes, plazoDespues: plazo.despues };
      }

      case 'CESION': {
        // El cedente se guarda al aprobar y no al solicitar: si el contrato se
        // cediera dos veces, la segunda tiene que registrar a quien de verdad
        // era el contratista ese día.
        modificacion.cedenteDocumento = contrato.contratistaDocumento;
        modificacion.cedenteNombre = contrato.contratistaNombre;
        modificacion.cedenteTipo = contrato.contratistaTipo;

        contrato.contratistaDocumento = modificacion.cesionarioDocumento as string;
        contrato.contratistaNombre = modificacion.cesionarioNombre as string;
        contrato.contratistaTipo = modificacion.cesionarioTipo as typeof contrato.contratistaTipo;

        return { cedente: modificacion.cedenteNombre, cesionario: modificacion.cesionarioNombre };
      }

      case 'SUSPENSION': {
        contrato.estado = 'SUSPENDIDO';
        return {
          suspensionDesde: modificacion.suspensionDesde,
          suspensionHasta: modificacion.suspensionHasta,
        };
      }

      case 'TERMINACION_ANTICIPADA': {
        // Se guarda de dónde venía: un contrato suspendido puede terminarse, y
        // revocar la terminación tiene que devolverlo a la pausa en la que
        // estaba, no a una ejecución que no se había retomado.
        modificacion.estadoContratoAntes = contrato.estado;
        contrato.estado = 'TERMINADO';

        return {
          causal: modificacion.terminacionCausal,
          terminacionEl: modificacion.terminacionEl,
          estadoAntes: modificacion.estadoContratoAntes,
        };
      }

      case 'REANUDACION': {
        const suspension = await em.getRepository(ModificacionContrato).findOne({
          where: { id: modificacion.reanudaModificacionId as string },
        });
        if (!suspension) throw new NotFoundException('No se encuentra la suspensión que se reanuda');

        const dias = diasSuspendidos(
          suspension.suspensionDesde as string,
          modificacion.reanudadaEl as string,
        );

        // Los días suspendidos se le devuelven al plazo. Criterio del equipo:
        // ninguna fuente lo dice, pero si el plazo corriera durante la pausa el
        // contratista pagaría con su término una detención que no causó.
        const plazo = plazoConMasDias(contrato.plazoDias, dias);
        modificacion.plazoDiasAntes = plazo.antes;
        modificacion.plazoDiasDespues = plazo.despues;
        contrato.plazoDias = plazo.despues;
        contrato.estado = 'EJECUCION';

        return {
          suspendidoDesde: suspension.suspensionDesde,
          reanudadaEl: modificacion.reanudadaEl,
          diasSuspendidos: dias,
          plazoAntes: plazo.antes,
          plazoDespues: plazo.despues,
        };
      }

      // El aclaratorio precisa lo que el contrato ya dice: no toca nada.
      default:
        return {};
    }
  }

  /**
   * Deja sin curso una modificación en trámite.
   *
   * No exige que el contrato siga admitiendo modificaciones, a diferencia de
   * aprobar: rechazar es justamente cómo se cierra un trámite que ya no
   * procede, y si terminar el contrato dejara sus solicitudes pendientes
   * atrapadas, el expediente quedaría con adiciones en trámite para siempre.
   */
  async rechazar(
    procesoId: string,
    modificacionId: string,
    dto: RechazarModificacionDto,
    acceso: HiringAccess,
  ) {
    await this.dataSource.transaction(async (em) => {
      const contrato = await this.exigirContrato(em, procesoId);

      const modificacion = await em
        .getRepository(ModificacionContrato)
        .findOne({ where: { id: modificacionId, contratoId: contrato.id } });

      if (!modificacion) throw new NotFoundException('La modificación no existe');
      if (modificacion.estado !== 'EN_TRAMITE') {
        throw new ConflictException(
          `La modificación está ${modificacion.estado.toLowerCase().replace('_', ' ')} y ya no se puede rechazar`,
        );
      }

      modificacion.estado = 'RECHAZADA';
      modificacion.motivoRevocacion = dto.motivo;
      await em.save(modificacion);

      await this.marcarActividad(em, procesoId, contrato.id, acceso);

      await this.traza(em, procesoId, modificacion.id, 'RECHAZAR', acceso, {
        actividad: NUMERAL_MODIFICACIONES,
        contrato: contrato.numero,
        motivo: dto.motivo,
      });
    });

    return this.estado(procesoId, acceso);
  }

  /**
   * Revoca una modificación aprobada y devuelve el valor del contrato.
   *
   * Los informes y las actas ya firmados no cambian: congelaron lo que era
   * cierto ese día, con el criterio del resto del módulo.
   */
  async revocar(
    procesoId: string,
    modificacionId: string,
    dto: RevocarModificacionDto,
    acceso: HiringAccess,
  ) {
    await this.dataSource.transaction(async (em) => {
      const contrato = await this.exigirContrato(em, procesoId);

      const modificacion = await em
        .getRepository(ModificacionContrato)
        .findOne({ where: { id: modificacionId, contratoId: contrato.id } });

      if (!modificacion) throw new NotFoundException('La modificación no existe');
      if (modificacion.estado !== 'APROBADA') {
        throw new ConflictException('Solo se revoca una modificación aprobada');
      }

      const deshecho = this.deshacerEfecto(contrato, modificacion);

      modificacion.estado = 'REVOCADA';
      modificacion.revocadaAt = new Date();
      modificacion.revocadaPor = acceso.userName;
      modificacion.motivoRevocacion = dto.motivo;
      await em.save(modificacion);
      await em.save(contrato);

      await this.marcarActividad(em, procesoId, contrato.id, acceso);

      await this.traza(em, procesoId, modificacion.id, 'REVOCAR', acceso, {
        actividad: NUMERAL_MODIFICACIONES,
        contrato: contrato.numero,
        tipo: modificacion.tipo,
        motivo: dto.motivo,
        ...deshecho,
      });
    });

    return this.estado(procesoId, acceso);
  }

  /**
   * Lo que revocar le devuelve al contrato, tipo por tipo.
   *
   * Se lee en pareja con `aplicarEfecto`: lo que uno hace, este lo deshace. El
   * plazo y el contratista vuelven de las columnas «antes» que la aprobación
   * guardó, no recalculando, porque entre una cosa y la otra pudo haber otra
   * modificación y restar a ciegas dejaría el contrato en un estado que nunca
   * tuvo.
   *
   * Lo que **no** vuelve atrás son los informes y las actas ya firmados:
   * congelaron lo que era cierto ese día, con el criterio del resto del módulo.
   */
  private deshacerEfecto(
    contrato: Contrato,
    modificacion: ModificacionContrato,
  ): Record<string, unknown> {
    switch (modificacion.tipo) {
      case 'ADICION': {
        const valorAntes = contrato.valor;
        const valorDespues = valorAntes - (modificacion.valorAdicionado ?? 0);
        contrato.valor = valorDespues;
        return { valorAntes, valorDespues };
      }

      case 'PRORROGA':
      case 'REANUDACION': {
        // La reanudación revocada devuelve además el contrato a suspendido: la
        // suspensión que levantaba vuelve a quedar sin levantar.
        if (modificacion.tipo === 'REANUDACION') contrato.estado = 'SUSPENDIDO';
        if (modificacion.plazoDiasAntes !== null) {
          const plazoDespues = modificacion.plazoDiasAntes;
          const plazoAntes = contrato.plazoDias;
          contrato.plazoDias = plazoDespues;
          return { plazoAntes, plazoDespues };
        }
        return {};
      }

      case 'CESION': {
        const cesionario = contrato.contratistaNombre;
        contrato.contratistaDocumento = modificacion.cedenteDocumento as string;
        contrato.contratistaNombre = modificacion.cedenteNombre as string;
        contrato.contratistaTipo = modificacion.cedenteTipo as typeof contrato.contratistaTipo;
        return { cesionario, vuelveA: modificacion.cedenteNombre };
      }

      case 'SUSPENSION': {
        // Revocar la suspensión es decir que nunca debió pausarse.
        contrato.estado = 'EJECUCION';
        return { suspensionDesde: modificacion.suspensionDesde };
      }

      case 'TERMINACION_ANTICIPADA': {
        // Vuelve al estado guardado y no a EJECUCION a secas: si el contrato
        // estaba suspendido cuando se terminó, sigue suspendido.
        const vuelveA = (modificacion.estadoContratoAntes as EstadoContrato) ?? 'EJECUCION';
        contrato.estado = vuelveA;
        return { terminacionEl: modificacion.terminacionEl, vuelveA };
      }

      default:
        return {};
    }
  }

  // ------------------------------------------------- publicación (RF-MOD-05) --

  /**
   * Registra que la modificación se publicó en SECOP II.
   *
   * Sin integración, como todo el módulo: la publicación ocurre por fuera y
   * aquí se transcribe con su evidencia, que es obligatoria.
   */
  async publicar(
    procesoId: string,
    modificacionId: string,
    dto: PublicarModificacionDto,
    evidencia: ArchivoCargado,
    hash: string,
    acceso: HiringAccess,
  ) {
    await this.dataSource.transaction(async (em) => {
      const contrato = await this.exigirContrato(em, procesoId);

      const modificacion = await em
        .getRepository(ModificacionContrato)
        .findOne({ where: { id: modificacionId, contratoId: contrato.id } });

      if (!modificacion) throw new NotFoundException('La modificación no existe');
      if (modificacion.estado !== 'APROBADA') {
        throw new ConflictException(
          'La modificación todavía no está aprobada: no hay nada publicado que registrar',
        );
      }

      const repetida = await em
        .getRepository(PublicacionModificacion)
        .findOne({ where: { modificacionId } });
      if (repetida) {
        throw new ConflictException('La modificación ya se registró como publicada');
      }

      this.validarFecha(dto.fechaPublicacion);

      const expediente = await em.findOne(Expediente, { where: { procesoId } });
      if (!expediente) throw new NotFoundException('El proceso no tiene expediente abierto');

      const documento = await this.guardarDocumento(
        em,
        expediente.id,
        `Modificación ${modificacion.numero ?? ''} · evidencia de publicación`,
        evidencia,
        hash,
        acceso,
      );

      const publicacion = await em.save(
        em.create(PublicacionModificacion, {
          modificacionId,
          fechaPublicacion: dto.fechaPublicacion,
          secopNumero: dto.secopNumero ?? null,
          secopUrl: dto.secopUrl ?? null,
          documentoId: documento.id,
          publicadaPor: acceso.userName,
        } as Partial<PublicacionModificacion>),
      );

      await this.traza(em, procesoId, publicacion.id, 'PUBLICAR', acceso, {
        actividad: NUMERAL_MODIFICACIONES,
        contrato: contrato.numero,
        modificacion: modificacion.numero,
        fechaPublicacion: dto.fechaPublicacion,
      });
    });

    return this.estado(procesoId, acceso);
  }

  // ----------------------------------------------------------- auxiliares --

  /**
   * El margen contra el tope.
   *
   * El valor inicial se **deriva** restando las adiciones aprobadas al valor
   * vigente, en vez de guardarse en una columna: así no hay dos sitios que
   * puedan discrepar, y el tope se cuenta siempre sobre el mismo número.
   */
  private margenDe(
    contrato: Contrato,
    modificaciones: ModificacionContrato[],
    solicitado: number,
    topePorcentaje: number,
  ): MargenDeAdicion {
    const yaAdicionado = modificaciones
      .filter((m) => m.tipo === 'ADICION' && m.estado === 'APROBADA')
      .reduce((suma, m) => suma + (m.valorAdicionado ?? 0), 0);

    return margenDeAdicion(
      contrato.valor - yaAdicionado,
      yaAdicionado,
      solicitado,
      topePorcentaje,
    );
  }

  private async topeConfigurado(em?: EntityManager) {
    const manager = em ?? this.dataSource.manager;
    const tope = await manager.getRepository(TopeAdicion).findOne({ where: { id: 1 } });

    // Si la fila no está sembrada se usa el tope legal, marcado sin confirmar:
    // dejar la actividad sin tope la volvería inutilizable en el sentido
    // contrario, permitiéndolo todo.
    return {
      porcentaje: tope?.porcentaje ?? 50,
      fundamento: tope?.fundamento ?? null,
      confirmado: tope?.confirmado ?? false,
    };
  }

  private modificacionesDe(em: EntityManager, contratoId: string) {
    return em.getRepository(ModificacionContrato).find({ where: { contratoId } });
  }

  /** Qué respaldo falta para poder aprobar, dicho uno por uno. */
  private async respaldoPendiente(em: EntityManager, modificacionId: string) {
    const faltan: string[] = [];

    if (!(await this.respaldoExpedido(em, modificacionId, 'CDP'))) {
      faltan.push('la adición no tiene CDP expedido');
    }
    if (!(await this.respaldoExpedido(em, modificacionId, 'RP'))) {
      faltan.push('la adición no tiene RP expedido');
    }

    return faltan;
  }

  private respaldoExpedido(em: EntityManager, modificacionId: string, tipo: TipoRespaldo) {
    return tipo === 'CDP'
      ? em.getRepository(Cdp).findOne({ where: { modificacionId, estado: 'EXPEDIDO' } })
      : em
          .getRepository(RegistroPresupuestal)
          .findOne({ where: { modificacionId, estado: 'EXPEDIDO' } });
  }

  /** El que está en curso: ni rechazado ni anulado. */
  private async respaldoVigente(em: EntityManager, modificacionId: string, tipo: TipoRespaldo) {
    if (tipo === 'CDP') {
      return em
        .getRepository(Cdp)
        .createQueryBuilder('c')
        .where('c.modificacion_id = :modificacionId', { modificacionId })
        .andWhere("c.estado IN ('SOLICITADO', 'VERIFICADO', 'EXPEDIDO')")
        .getOne();
    }

    return em
      .getRepository(RegistroPresupuestal)
      .createQueryBuilder('r')
      .where('r.modificacion_id = :modificacionId', { modificacionId })
      .andWhere("r.estado NOT IN ('RECHAZADO', 'ANULADO')")
      .getOne();
  }

  /**
   * Mueve el CDP o el RP de la adición por su ciclo.
   *
   * Las transiciones válidas son **las mismas funciones puras** de EFDS-1148 y
   * EFDS-1163: la Financiera no tiene que aprender un segundo trámite, y dos
   * implementaciones del mismo ciclo terminarían separándose.
   */
  private async transicionarRespaldo(
    procesoId: string,
    modificacionId: string,
    tipo: TipoRespaldo,
    hacia: string,
    acceso: HiringAccess,
    datos: Record<string, unknown>,
  ) {
    await this.dataSource.transaction(async (em) => {
      await this.exigirEnTramite(em, procesoId, modificacionId);

      const respaldo = await this.respaldoVigente(em, modificacionId, tipo);
      if (!respaldo) {
        throw new NotFoundException(`La adición no tiene ${tipo} en curso`);
      }

      const permitido =
        tipo === 'CDP'
          ? cdpPuedeTransicionar(respaldo.estado as EstadoCdp, hacia as EstadoCdp)
          : rpPuedeTransicionar(respaldo.estado as EstadoRp, hacia as EstadoRp);

      if (!permitido) {
        throw new ConflictException(
          `El ${tipo} de la adición está ${respaldo.estado.toLowerCase()} y no puede pasar a ${hacia.toLowerCase()}`,
        );
      }

      Object.assign(respaldo, datos, { estado: hacia });
      await em.save(respaldo);

      const accion: AccionTraza =
        hacia === 'EXPEDIDO' ? 'EXPEDIR' : hacia === 'RECHAZADO' ? 'RECHAZAR' : 'VERIFICAR';

      await this.traza(em, procesoId, modificacionId, accion, acceso, {
        actividad: NUMERAL_MODIFICACIONES,
        respaldo: tipo,
        estado: hacia,
        ...datos,
      });
    });

    return this.estado(procesoId, acceso);
  }

  private async verModificacion(em: EntityManager, m: ModificacionContrato) {
    const [cdp, rp, publicacion, documento] = await Promise.all([
      em.getRepository(Cdp).findOne({ where: { modificacionId: m.id } }),
      em.getRepository(RegistroPresupuestal).findOne({ where: { modificacionId: m.id } }),
      em.getRepository(PublicacionModificacion).findOne({ where: { modificacionId: m.id } }),
      m.documentoId
        ? em.getRepository(Documento).findOne({ where: { id: m.documentoId } })
        : null,
    ]);

    return {
      id: m.id,
      tipo: m.tipo,
      estado: m.estado,
      numero: m.numero,
      fechaSuscripcion: m.fechaSuscripcion,
      justificacion: m.justificacion,
      valorAdicionado: m.valorAdicionado,
      valorContratoAntes: m.valorContratoAntes,
      valorContratoDespues: m.valorContratoDespues,
      topePorcentaje: m.topePorcentaje,
      // Lo propio de cada tipo. Va siempre, nulo donde no aplica: una respuesta
      // con forma distinta por tipo obligaría a la pantalla a adivinar cuál lee.
      diasProrroga: m.diasProrroga,
      plazoDiasAntes: m.plazoDiasAntes,
      plazoDiasDespues: m.plazoDiasDespues,
      suspensionDesde: m.suspensionDesde,
      suspensionHasta: m.suspensionHasta,
      reanudaModificacionId: m.reanudaModificacionId,
      reanudadaEl: m.reanudadaEl,
      terminacionCausal: m.terminacionCausal,
      terminacionEl: m.terminacionEl,
      estadoContratoAntes: m.estadoContratoAntes,
      cedenteNombre: m.cedenteNombre,
      cedenteDocumento: m.cedenteDocumento,
      cesionarioNombre: m.cesionarioNombre,
      cesionarioDocumento: m.cesionarioDocumento,
      cesionarioTipo: m.cesionarioTipo,
      solicitadaPor: m.solicitadaPor,
      aprobadaPor: m.aprobadaPor,
      aprobadaAt: m.aprobadaAt,
      revocadaAt: m.revocadaAt,
      revocadaPor: m.revocadaPor,
      motivoRevocacion: m.motivoRevocacion,
      documento: documento
        ? { nombre: documento.archivoNombreOriginal ?? documento.nombre, url: documento.archivoUrl }
        : null,
      // El estado del respaldo, para que la pantalla diga qué falta antes de
      // poder aprobar en vez de deshabilitar un botón sin explicación.
      cdp: cdp
        ? { id: cdp.id, numero: cdp.numero, valor: cdp.valor, estado: cdp.estado, rubro: cdp.rubro }
        : null,
      rp: rp
        ? { id: rp.id, numero: rp.numero, valor: rp.valor, estado: rp.estado, rubro: rp.rubro }
        : null,
      publicacion: publicacion
        ? {
            fechaPublicacion: publicacion.fechaPublicacion,
            secopNumero: publicacion.secopNumero,
            secopUrl: publicacion.secopUrl,
            publicadaPor: publicacion.publicadaPor,
          }
        : null,
    };
  }

  /** La actividad 9.5 se cumple cuando hay al menos una modificación aprobada. */
  private async marcarActividad(
    em: EntityManager,
    procesoId: string,
    contratoId: string,
    acceso: HiringAccess,
  ) {
    const aprobada = await em
      .getRepository(ModificacionContrato)
      .findOne({ where: { contratoId, estado: 'APROBADA' as EstadoModificacion } });

    const cumplida = !!aprobada;
    const estado = cumplida ? 'APROBADO' : 'BORRADOR';

    const actividad = await em
      .getRepository(ProcesoActividad)
      .findOne({ where: { procesoId, numeral: NUMERAL_MODIFICACIONES } });

    if (!actividad) {
      await em.save(
        em.create(ProcesoActividad, {
          procesoId,
          numeral: NUMERAL_MODIFICACIONES,
          estado: estado as any,
          datos: {},
          ...(cumplida ? { revisadoPor: acceso.userName, revisadoAt: new Date() } : {}),
        }),
      );
      return;
    }

    actividad.estado = estado as any;
    actividad.revisadoPor = cumplida ? acceso.userName : null;
    actividad.revisadoAt = cumplida ? new Date() : null;
    await em.save(actividad);
  }

  private porQueNoAdmite(estado: EstadoContrato): string {
    if (estado === 'LIQUIDADO' || estado === 'CERRADO') {
      return 'el contrato ya está liquidado: modificarlo cambiaría algo que las partes dieron por terminado';
    }
    if (estado === 'TERMINADO') {
      return 'el contrato está terminado anticipadamente: lo que queda es liquidar lo ejecutado';
    }
    return 'el contrato todavía no está en ejecución: falta el acta de inicio (9.1)';
  }

  private hoy() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  }

  private validarFecha(fecha: string) {
    if (fecha > this.hoy()) {
      throw new BadRequestException(
        'La fecha no puede ser posterior a hoy: es la del hecho ya ocurrido',
      );
    }
  }

  private async contratoDelProceso(em: EntityManager, procesoId: string, bloquear = false) {
    const proceso = await em.getRepository(Proceso).findOne({ where: { id: procesoId } });
    if (!proceso) throw new NotFoundException('El proceso no existe');

    const consulta = em
      .getRepository(Contrato)
      .createQueryBuilder('c')
      .where('c.proceso_id = :procesoId', { procesoId })
      .andWhere("c.estado <> 'RECHAZADO'");

    if (bloquear) consulta.setLock('pessimistic_write');

    return consulta.getOne();
  }

  private async exigirContrato(em: EntityManager, procesoId: string) {
    const contrato = await this.contratoDelProceso(em, procesoId, true);
    if (!contrato) throw new NotFoundException('El proceso no tiene contrato generado');
    return contrato;
  }

  private async exigirContratoModificable(em: EntityManager, procesoId: string) {
    const contrato = await this.exigirContrato(em, procesoId);

    if (!admiteModificacion(contrato.estado)) {
      throw new ConflictException(
        `No se puede modificar el contrato: ${this.porQueNoAdmite(contrato.estado)}`,
      );
    }

    return contrato;
  }

  /**
   * La suspensión aprobada que todavía nadie ha levantado, si la hay.
   *
   * Se deriva de las modificaciones y no de una columna en `contratos`: el
   * estado dice que está suspendido, y esto dice por cuál acto. Guardarlo dos
   * veces daría dos sitios que pueden discrepar.
   */
  private async suspensionVigente(em: EntityManager, contratoId: string) {
    const suspensiones = await em.getRepository(ModificacionContrato).find({
      where: { contratoId, tipo: 'SUSPENSION' as TipoModificacion, estado: 'APROBADA' as EstadoModificacion },
      order: { createdAt: 'ASC' },
    });

    for (const suspension of suspensiones) {
      const levantada = await em.getRepository(ModificacionContrato).findOne({
        where: {
          reanudaModificacionId: suspension.id,
          // Solo la aprobada levanta: la que está en trámite es justamente la
          // que necesita ver la suspensión viva para poder aprobarse.
          estado: 'APROBADA' as EstadoModificacion,
        },
      });
      if (!levantada) return suspension;
    }

    return null;
  }

  /**
   * El contrato, comprobando que admite **este** tipo de modificación ahora.
   *
   * Es la puerta única: la usan tanto solicitar como aprobar, porque entre una
   * cosa y la otra el contrato pudo suspenderse.
   */
  private async exigirPuedeTramitar(
    em: EntityManager,
    procesoId: string,
    tipo: TipoModificacion,
  ) {
    const contrato = await this.exigirContrato(em, procesoId);
    const suspension = await this.suspensionVigente(em, contrato.id);

    const motivo = porQueNoAdmiteTipo(
      { estado: contrato.estado, suspendido: suspension !== null },
      tipo,
    );
    if (motivo) {
      throw new ConflictException(`No se puede tramitar ${NOMBRE_TIPO[tipo]}: ${motivo}`);
    }

    return { contrato, suspension };
  }

  private async exigirEnTramite(em: EntityManager, procesoId: string, modificacionId: string) {
    const contrato = await this.exigirContratoModificable(em, procesoId);

    const modificacion = await em
      .getRepository(ModificacionContrato)
      .findOne({ where: { id: modificacionId, contratoId: contrato.id } });

    if (!modificacion) throw new NotFoundException('La modificación no existe');

    // Se vuelve a juzgar con el tipo que la modificación ya tiene: entre la
    // solicitud y la aprobación el contrato pudo suspenderse, y una adición en
    // trámite no puede aprobarse sobre un contrato en pausa.
    const suspension = await this.suspensionVigente(em, contrato.id);
    const motivo = porQueNoAdmiteTipo(
      { estado: contrato.estado, suspendido: suspension !== null },
      modificacion.tipo,
    );
    if (motivo) {
      throw new ConflictException(
        `No se puede tramitar ${NOMBRE_TIPO[modificacion.tipo]}: ${motivo}`,
      );
    }

    if (modificacion.estado !== 'EN_TRAMITE') {
      throw new ConflictException(
        `La modificación está ${modificacion.estado.toLowerCase().replace('_', ' ')} y ya no se puede tramitar`,
      );
    }

    return { contrato, modificacion };
  }

  private guardarDocumento(
    em: EntityManager,
    expedienteId: string,
    nombre: string,
    archivo: ArchivoCargado,
    hash: string,
    acceso: HiringAccess,
  ) {
    return em.save(
      em.create(Documento, {
        expedienteId,
        numeral: NUMERAL_MODIFICACIONES,
        tipo: 'ADJUNTO',
        nombre,
        archivoUrl: `hiring/files/${archivo.filename}`,
        archivoNombreOriginal: archivo.originalname,
        archivoMimeType: archivo.mimetype,
        archivoTamano: archivo.size,
        hashSha256: hash,
        subidoPor: acceso.userName,
      } as Partial<Documento>),
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
        entidad: 'modificacion_contrato',
        accion,
        detalle,
        usuarioNombre: acceso.userName,
        usuarioId: acceso.userId,
      } as Partial<Trazabilidad>),
    );
  }
}
