import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager, IsNull } from 'typeorm';

import {
  CierreFinanciero,
  NUMERAL_CIERRE_FINANCIERO,
} from '../../entities/cierre-financiero.entity';
import { RegistroPresupuestal } from '../../entities/registro-presupuestal.entity';
import { ActaLiquidacion } from '../../entities/acta-liquidacion.entity';
import { PagoContrato } from '../../entities/pago-contrato.entity';
import { Contrato } from '../../entities/contrato.entity';
import { Proceso } from '../../entities/proceso.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { AccionTraza, Trazabilidad } from '../../entities/trazabilidad.entity';
import { Documento } from '../../entities/documento.entity';
import { Expediente } from '../../entities/expediente.entity';
import { HiringAccess } from '../../auth/hiring-access';
import { CerrarFinancieramenteDto, RevertirCierreDto } from './dto/cierre-financiero.dto';

export { NUMERAL_CIERRE_FINANCIERO };

/** El cuadre del contrato contra su respaldo presupuestal. */
export interface CuadrePresupuestal {
  valorRp: number;
  /** Lo efectivamente tramitado, no lo cobrado. */
  valorPagado: number;
  /** Lo que vuelve al presupuesto. Nunca negativo. */
  valorLiberado: number;
  /** Cuánto se pagó por encima del RP, si pasó. */
  sobrepago: number;
  advertencia: string | null;
}

/**
 * El saldo del RP que no se llegó a comprometer.
 *
 * Es la cifra que la entidad reintegra al presupuesto, así que es la que no se
 * puede equivocar: de menos deja plata amarrada a un contrato que ya terminó, y
 * de más libera algo que todavía se debía.
 *
 * Cuando lo pagado supera el RP no se libera nada y se avisa. El aviso es más
 * duro que el del CDP a propósito: allá una cifra alta era un error de
 * digitación sobre un estimado, aquí significa que salió plata sin respaldo
 * presupuestal, que es un hallazgo.
 *
 * Función pura para poder probarla sin base de datos.
 */
export function saldoNoComprometido(valorRp: number, valorPagado: number): CuadrePresupuestal {
  const diferencia = valorRp - valorPagado;

  if (diferencia >= 0) {
    return {
      valorRp,
      valorPagado,
      valorLiberado: diferencia,
      sobrepago: 0,
      advertencia: null,
    };
  }

  const sobrepago = -diferencia;
  return {
    valorRp,
    valorPagado,
    valorLiberado: 0,
    sobrepago,
    advertencia:
      `Se pagaron ${sobrepago.toLocaleString('es-CO')} pesos por encima del registro presupuestal: ` +
      'hubo pagos sin respaldo y no queda saldo que liberar',
  };
}

interface ArchivoCargado {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
}

/**
 * Cierre financiero del contrato — actividad 10.3 (EFDS-1173, RF-LIQ-03).
 *
 * Liquidado el contrato, la Dirección Financiera registra el pago final y
 * libera el saldo del RP que no se comprometió.
 *
 * **La plataforma no mueve presupuesto.** Registra que la liberación se tramitó
 * y con qué soporte; el movimiento ocurre en el sistema financiero de la
 * entidad, igual que el giro de cada pago (EFDS-1170).
 */
@Injectable()
export class CierreFinancieroService {
  constructor(private readonly dataSource: DataSource) {}

  // ------------------------------------------------------------- consulta --

  async estado(procesoId: string, _acceso: HiringAccess) {
    const contrato = await this.contratoDelProceso(this.dataSource.manager, procesoId);

    if (!contrato) {
      return {
        contrato: null,
        tieneLiquidacion: false,
        rp: null,
        puedeCerrar: false,
        motivoNoPuede: 'el proceso todavía no tiene contrato generado',
        cuadre: null as CuadrePresupuestal | null,
        cierre: null as unknown,
        historial: [] as unknown[],
      };
    }

    const liquidacion = await this.liquidacionVigente(contrato.id);
    const rp = await this.rpExpedido(contrato.id);
    const vigente = await this.cierreVigente(contrato.id);

    const cuadre = rp ? await this.calcularCuadre(this.dataSource.manager, contrato, rp) : null;

    const cierres = await this.dataSource.getRepository(CierreFinanciero).find({
      where: { contratoId: contrato.id },
      order: { createdAt: 'DESC' },
    });
    const soporte = vigente?.soporteDocumentoId
      ? await this.dataSource
          .getRepository(Documento)
          .findOne({ where: { id: vigente.soporteDocumentoId } })
      : null;

    return {
      contrato: {
        numero: contrato.numero,
        objeto: contrato.objeto,
        estado: contrato.estado,
        valor: contrato.valor,
      },
      tieneLiquidacion: !!liquidacion,
      rp: rp ? { numero: rp.numero, valor: rp.valor, fechaExpedicion: rp.fechaExpedicion } : null,
      puedeCerrar: !!liquidacion && !!rp && !vigente,
      /** Cuál de las dos cosas falta, en vez de un «no se puede» seco. */
      motivoNoPuede: this.porQueNoPuede(!!liquidacion, !!rp, !!vigente),
      cuadre,
      cierre: vigente
        ? {
            id: vigente.id,
            referenciaPagoFinal: vigente.referenciaPagoFinal,
            fechaPagoFinal: vigente.fechaPagoFinal,
            valorRp: vigente.valorRp,
            valorPagado: vigente.valorPagado,
            valorLiberado: vigente.valorLiberado,
            observaciones: vigente.observaciones,
            cerradoPor: vigente.cerradoPor,
            soporte: soporte
              ? { nombre: soporte.archivoNombreOriginal ?? soporte.nombre, url: soporte.archivoUrl }
              : null,
          }
        : null,
      historial: cierres
        .filter((c) => c.estado === 'REVERTIDO')
        .map((c) => ({
          referenciaPagoFinal: c.referenciaPagoFinal,
          fechaPagoFinal: c.fechaPagoFinal,
          valorLiberado: c.valorLiberado,
          revertidoAt: c.revertidoAt,
          revertidoPor: c.revertidoPor,
          motivoReversion: c.motivoReversion,
        })),
    };
  }

  // --------------------------------------------------------------- cierre --

  /**
   * Registra el pago final y libera el saldo.
   *
   * El cuadre se calcula aquí y se guarda: lo que queda en el cierre es la
   * cifra que se reintegró, no la forma de obtenerla.
   */
  async cerrar(
    procesoId: string,
    dto: CerrarFinancieramenteDto,
    soporte: ArchivoCargado | null,
    hash: string | null,
    acceso: HiringAccess,
  ) {
    await this.dataSource.transaction(async (em) => {
      const contrato = await this.exigirContrato(em, procesoId);

      if (!(await this.liquidacionVigente(contrato.id, em))) {
        throw new ConflictException(
          'El contrato todavía no está liquidado: el cierre financiero va sobre el acta de liquidación (10.2)',
        );
      }

      const rp = await this.rpExpedido(contrato.id, em);
      if (!rp) {
        throw new ConflictException(
          'El contrato no tiene registro presupuestal expedido: sin RP no hay saldo que liberar (8.3)',
        );
      }

      if (await this.cierreVigente(contrato.id, em)) {
        throw new ConflictException(
          'El contrato ya tiene cierre financiero: para rehacerlo se revierte el vigente y se registra otro',
        );
      }

      const cuadre = await this.calcularCuadre(em, contrato, rp);

      let documentoId: string | null = null;
      if (soporte && hash) {
        const expediente = await em.findOne(Expediente, { where: { procesoId } });
        if (!expediente) throw new NotFoundException('El proceso no tiene expediente abierto');

        const doc = await this.guardarDocumento(
          em,
          expediente.id,
          `Contrato ${contrato.numero} · cierre financiero`,
          soporte,
          hash,
          acceso,
        );
        documentoId = doc.id;
      }

      const registro = await em.save(
        em.create(CierreFinanciero, {
          contratoId: contrato.id,
          rpId: rp.id,
          referenciaPagoFinal: dto.referenciaPagoFinal,
          fechaPagoFinal: dto.fechaPagoFinal,
          soporteDocumentoId: documentoId,
          valorRp: cuadre.valorRp,
          valorPagado: cuadre.valorPagado,
          valorLiberado: cuadre.valorLiberado,
          observaciones: dto.observaciones ?? null,
          estado: 'VIGENTE' as const,
          cerradoPor: acceso.userName,
        } as Partial<CierreFinanciero>),
      );

      await this.marcarActividad(em, procesoId, contrato.id, acceso);

      await this.traza(em, procesoId, registro.id, 'CERRAR', acceso, {
        actividad: NUMERAL_CIERRE_FINANCIERO,
        contrato: contrato.numero,
        rp: rp.numero,
        valorPagado: cuadre.valorPagado,
        valorLiberado: cuadre.valorLiberado,
        // Que se haya cerrado con sobrepago queda en la traza, no solo en la
        // advertencia que vio quien cerró.
        sobrepago: cuadre.sobrepago,
      });
    });

    return this.estado(procesoId, acceso);
  }

  /**
   * Revierte el cierre vigente.
   *
   * No se borra: el saldo liberado pudo haberse reintegrado al presupuesto, y
   * deshacerlo tiene consecuencias fuera de la plataforma.
   */
  async revertir(procesoId: string, dto: RevertirCierreDto, acceso: HiringAccess) {
    await this.dataSource.transaction(async (em) => {
      const contrato = await this.exigirContrato(em, procesoId);

      const cierre = await this.cierreVigente(contrato.id, em);
      if (!cierre) throw new NotFoundException('El contrato no tiene cierre financiero vigente');

      cierre.estado = 'REVERTIDO';
      cierre.revertidoAt = new Date();
      cierre.revertidoPor = acceso.userName;
      cierre.motivoReversion = dto.motivo;
      await em.save(cierre);

      await this.marcarActividad(em, procesoId, contrato.id, acceso);

      await this.traza(em, procesoId, cierre.id, 'ANULAR', acceso, {
        actividad: NUMERAL_CIERRE_FINANCIERO,
        contrato: contrato.numero,
        valorLiberado: cierre.valorLiberado,
        motivo: dto.motivo,
      });
    });

    return this.estado(procesoId, acceso);
  }

  // ----------------------------------------------------------- auxiliares --

  /**
   * El cuadre de hoy.
   *
   * Se usa dos veces y con sentidos distintos —en la consulta es lo que el
   * Estructurador ve antes de firmar, y al cerrar es lo que se congela—, así
   * que vive en una sola función para que no puedan discrepar.
   */
  private async calcularCuadre(
    em: EntityManager,
    contrato: Contrato,
    rp: RegistroPresupuestal,
  ): Promise<CuadrePresupuestal> {
    const pagos = await em
      .getRepository(PagoContrato)
      .find({ where: { contratoId: contrato.id, estado: 'TRAMITADO' } });

    // Lo tramitado y no lo cobrado: el RP se libera contra la plata que salió.
    const valorPagado = pagos.reduce((total, p) => total + Number(p.valor), 0);
    // Contra el respaldo total, adiciones incluidas, y no solo contra el RP al
    // que apunta el cierre.
    return saldoNoComprometido(await this.respaldoTotal(contrato.id, em), valorPagado);
  }

  private porQueNoPuede(hayLiquidacion: boolean, hayRp: boolean, hayCierre: boolean) {
    if (hayCierre) return 'el contrato ya tiene cierre financiero vigente';
    if (!hayLiquidacion) return 'falta el acta de liquidación del contrato (10.2)';
    if (!hayRp) return 'falta el registro presupuestal expedido (8.3)';
    return null;
  }

  private liquidacionVigente(contratoId: string, em?: EntityManager) {
    const manager = em ?? this.dataSource.manager;
    return manager
      .getRepository(ActaLiquidacion)
      .findOne({ where: { contratoId, estado: 'VIGENTE' } });
  }

  /**
   * El RP del contrato, que es al que apunta el cierre.
   *
   * `modificacionId` nulo: desde EFDS-1176 una adición aprobada trae su propio
   * RP, y sin el filtro el cierre podría quedar apuntando al de la adición.
   */
  private rpExpedido(contratoId: string, em?: EntityManager) {
    const manager = em ?? this.dataSource.manager;
    return manager
      .getRepository(RegistroPresupuestal)
      .findOne({ where: { contratoId, estado: 'EXPEDIDO', modificacionId: IsNull() } });
  }

  /**
   * El respaldo presupuestal total del contrato.
   *
   * Suma el RP del contrato y los de cada adición aprobada (EFDS-1176). Liberar
   * solo contra el primero dejaría comprometido el saldo del segundo, que es
   * plata de la entidad amarrada a un contrato que ya terminó.
   */
  private async respaldoTotal(contratoId: string, em?: EntityManager) {
    const manager = em ?? this.dataSource.manager;
    const expedidos = await manager
      .getRepository(RegistroPresupuestal)
      .find({ where: { contratoId, estado: 'EXPEDIDO' } });

    return expedidos.reduce((total, rp) => total + Number(rp.valor ?? 0), 0);
  }

  cierreVigente(contratoId: string, em?: EntityManager) {
    const manager = em ?? this.dataSource.manager;
    return manager
      .getRepository(CierreFinanciero)
      .findOne({ where: { contratoId, estado: 'VIGENTE' } });
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

  /** La actividad se cumple cuando hay cierre vigente. */
  private async marcarActividad(
    em: EntityManager,
    procesoId: string,
    contratoId: string,
    acceso: HiringAccess,
  ) {
    const cumplida = !!(await this.cierreVigente(contratoId, em));
    const estado = cumplida ? 'APROBADO' : 'BORRADOR';

    const actividad = await em.getRepository(ProcesoActividad).findOne({
      where: { procesoId, numeral: NUMERAL_CIERRE_FINANCIERO },
    });

    if (!actividad) {
      await em.save(
        em.create(ProcesoActividad, {
          procesoId,
          numeral: NUMERAL_CIERRE_FINANCIERO,
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
        numeral: NUMERAL_CIERRE_FINANCIERO,
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
        entidad: 'cierre_financiero',
        accion,
        detalle,
        usuarioNombre: acceso.userName,
        usuarioId: acceso.userId,
      } as Partial<Trazabilidad>),
    );
  }
}
