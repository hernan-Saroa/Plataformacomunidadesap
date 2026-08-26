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
  AprobarModificacionDto,
  ExpedirRespaldoDto,
  PublicarModificacionDto,
  RechazarModificacionDto,
  RechazarRespaldoDto,
  RevocarModificacionDto,
  SolicitarAdicionDto,
  SolicitarRespaldoDto,
} from './dto/modificaciones.dto';

export { NUMERAL_MODIFICACIONES, margenDeAdicion };

/** Qué respaldo se está tramitando: el certificado o el compromiso. */
export type TipoRespaldo = 'CDP' | 'RP';

interface ArchivoCargado {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
}

/**
 * Si el contrato admite modificaciones.
 *
 * En ejecución, que es lo que dice el criterio de la historia. No liquidado: el
 * acta cierra las cuentas del contrato, y adicionarlo después sería modificar
 * algo que las partes ya dieron por terminado.
 *
 * Función pura para poder probar la regla sin base de datos.
 */
export function admiteModificacion(estado: EstadoContrato): boolean {
  return estado === 'EJECUCION';
}

/**
 * Modificaciones contractuales — actividad 9.5 (EFDS-1176, RF-MOD-01 y RF-MOD-05).
 *
 * Hoy solo la adición en dinero tiene trámite; la prórroga (EFDS-1177) y la
 * cesión, el aclaratorio y la suspensión (EFDS-1178) cuelgan de la misma tabla.
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

    return {
      contrato: {
        numero: contrato.numero,
        objeto: contrato.objeto,
        estado: contrato.estado,
        valor: contrato.valor,
      },
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

      const cdp = await this.respaldoExpedido(em, modificacionId, 'CDP');
      const rp = await this.respaldoExpedido(em, modificacionId, 'RP');

      const valorAntes = contrato.valor;
      const valorDespues = valorAntes + (modificacion.valorAdicionado ?? 0);

      modificacion.estado = 'APROBADA';
      modificacion.numero = dto.numero;
      modificacion.fechaSuscripcion = dto.fechaSuscripcion;
      modificacion.documentoId = documento.id;
      modificacion.cdpId = (cdp as Cdp).id;
      modificacion.rpId = (rp as RegistroPresupuestal).id;
      modificacion.valorContratoAntes = valorAntes;
      modificacion.valorContratoDespues = valorDespues;
      modificacion.topePorcentaje = tope.porcentaje;
      modificacion.aprobadaPor = acceso.userName;
      modificacion.aprobadaAt = new Date();
      await em.save(modificacion);

      // Lo que hace real la adición: el balance del informe final, el cuadre
      // del cierre financiero y el aviso de sobrepago de los pagos leen esto.
      contrato.valor = valorDespues;
      await em.save(contrato);

      await this.marcarActividad(em, procesoId, contrato.id, acceso);

      await this.traza(em, procesoId, modificacion.id, 'APROBAR', acceso, {
        actividad: NUMERAL_MODIFICACIONES,
        contrato: contrato.numero,
        tipo: 'ADICION',
        numero: dto.numero,
        valorAdicionado: modificacion.valorAdicionado,
        valorAntes,
        valorDespues,
      });
    });

    return this.estado(procesoId, acceso);
  }

  /** Deja sin curso una modificación en trámite. */
  async rechazar(
    procesoId: string,
    modificacionId: string,
    dto: RechazarModificacionDto,
    acceso: HiringAccess,
  ) {
    await this.dataSource.transaction(async (em) => {
      const { contrato, modificacion } = await this.exigirEnTramite(em, procesoId, modificacionId);

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

      const valorAntes = contrato.valor;
      const valorDespues = valorAntes - (modificacion.valorAdicionado ?? 0);

      modificacion.estado = 'REVOCADA';
      modificacion.revocadaAt = new Date();
      modificacion.revocadaPor = acceso.userName;
      modificacion.motivoRevocacion = dto.motivo;
      await em.save(modificacion);

      contrato.valor = valorDespues;
      await em.save(contrato);

      await this.marcarActividad(em, procesoId, contrato.id, acceso);

      await this.traza(em, procesoId, modificacion.id, 'REVOCAR', acceso, {
        actividad: NUMERAL_MODIFICACIONES,
        contrato: contrato.numero,
        valorAntes,
        valorDespues,
        motivo: dto.motivo,
      });
    });

    return this.estado(procesoId, acceso);
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

  private async exigirEnTramite(em: EntityManager, procesoId: string, modificacionId: string) {
    const contrato = await this.exigirContratoModificable(em, procesoId);

    const modificacion = await em
      .getRepository(ModificacionContrato)
      .findOne({ where: { id: modificacionId, contratoId: contrato.id } });

    if (!modificacion) throw new NotFoundException('La modificación no existe');
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
