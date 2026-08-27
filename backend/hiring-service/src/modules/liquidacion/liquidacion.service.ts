import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';

import {
  ActaLiquidacion,
  BalanceLiquidacion,
  NUMERAL_LIQUIDACION,
} from '../../entities/acta-liquidacion.entity';
import { InformeFinal } from '../../entities/informe-final.entity';
import { EstadoPago, PagoContrato } from '../../entities/pago-contrato.entity';
import { ActaInicio } from '../../entities/acta-inicio.entity';
import { Contrato, EstadoContrato } from '../../entities/contrato.entity';
import { Proceso } from '../../entities/proceso.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { AccionTraza, Trazabilidad } from '../../entities/trazabilidad.entity';
import { Documento } from '../../entities/documento.entity';
import { Expediente } from '../../entities/expediente.entity';
import { HiringAccess } from '../../auth/hiring-access';
import { AnularLiquidacionDto, LiquidarDto } from './dto/liquidacion.dto';
import {
  alertaDelPlazo,
  MESES_BILATERAL,
  ventanaDeLiquidacion,
  VentanaLiquidacion,
} from './plazos-de-liquidacion';

export { NUMERAL_LIQUIDACION };

const PENDIENTES: EstadoPago[] = ['RADICADO', 'AVALADO', 'DEVUELTO'];

/**
 * Si el contrato admite liquidación.
 *
 * En ejecución, que es donde queda hasta que se liquide. También LIQUIDADO,
 * porque desde EFDS-1175 firmar el acta deja el contrato en ese estado y anular
 * la vigente para rehacerla tiene que seguir siendo posible; que no se liquide
 * dos veces lo impide el acta vigente, no el estado.
 *
 * CERRADO no: ahí el contrato ya se declaró en firme y hay que revertir el
 * cierre definitivo antes de tocar el acta.
 *
 * Lo que de verdad condiciona esta actividad no es el estado sino el informe
 * final, y eso se comprueba aparte.
 */
export function admiteLiquidacion(estado: EstadoContrato): boolean {
  return estado === 'EJECUCION' || estado === 'LIQUIDADO';
}

interface ArchivoCargado {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
}

/**
 * Acta de liquidación — actividad 10.2 (EFDS-1172, RF-LIQ-02 y RF-SIS-03).
 *
 * Con el informe final a la vista, las partes liquidan de común acuerdo dentro
 * de los cuatro meses siguientes a la terminación. Si no lo logran, la entidad
 * puede liquidar unilateralmente en los dos meses adicionales.
 *
 * **La asimetría entre las dos figuras es deliberada** y es lo único delicado
 * de este servicio:
 *
 * - La **unilateral se bloquea** mientras corra el plazo del acuerdo. No es una
 *   política que la entidad pueda relajar: antes de que venzan los cuatro meses
 *   la potestad no existe, y un acto dictado sin ella nace viciado.
 * - La **bilateral se avisa pero no se bloquea** después de los cuatro meses.
 *   Las partes pueden seguir poniéndose de acuerdo, y negarles la pantalla
 *   obligaría a liquidar por fuera del expediente.
 */
@Injectable()
export class LiquidacionService {
  constructor(private readonly dataSource: DataSource) {}

  // ------------------------------------------------------------- consulta --

  async estado(procesoId: string, _acceso: HiringAccess) {
    const contrato = await this.contratoDelProceso(this.dataSource.manager, procesoId);

    if (!contrato) {
      return {
        admiteLiquidacion: false,
        motivoNoAdmite: 'el proceso todavía no tiene contrato generado',
        contrato: null,
        tieneInformeFinal: false,
        ventana: null as VentanaLiquidacion | null,
        alerta: null as ReturnType<typeof alertaDelPlazo> | null,
        puedeLiquidarBilateral: false,
        puedeLiquidarUnilateral: false,
        motivoNoUnilateral: null as string | null,
        balanceActual: null as BalanceLiquidacion | null,
        acta: null as unknown,
        historial: [] as unknown[],
      };
    }

    const admite = admiteLiquidacion(contrato.estado);
    const informe = await this.informeFinalVigente(contrato.id);
    const vigente = await this.actaVigente(contrato.id);

    const ventana = await this.ventanaDelContrato(this.dataSource.manager, contrato);
    const alerta = ventana ? alertaDelPlazo(this.hoy(), ventana) : null;

    const actas = await this.dataSource.getRepository(ActaLiquidacion).find({
      where: { contratoId: contrato.id },
      order: { createdAt: 'DESC' },
    });
    const documentos = await this.documentosDe(vigente);

    // Sin informe final no hay nada que liquidar, y sin ventana no hay cómo
    // saber si la unilateral está habilitada.
    const base = admite && !!informe && !vigente && !!ventana;

    return {
      admiteLiquidacion: admite,
      motivoNoAdmite: admite ? null : this.porQueNoAdmite(contrato.estado),
      contrato: {
        numero: contrato.numero,
        objeto: contrato.objeto,
        estado: contrato.estado,
        valor: contrato.valor,
      },
      tieneInformeFinal: !!informe,
      ventana,
      /** La alerta de RF-SIS-03, resuelta aquí para que nadie la recalcule. */
      alerta,
      puedeLiquidarBilateral: base,
      puedeLiquidarUnilateral: base && alerta?.momento !== 'BILATERAL',
      motivoNoUnilateral:
        base && alerta?.momento === 'BILATERAL'
          ? `La liquidación unilateral se habilita cuando venza el plazo del acuerdo, el ${ventana!.bilateralHasta}`
          : null,
      balanceActual: await this.calcularBalance(this.dataSource.manager, contrato),
      acta: vigente
        ? {
            id: vigente.id,
            tipo: vigente.tipo,
            fechaActa: vigente.fechaActa,
            balance: vigente.balance,
            pazYSalvo: vigente.pazYSalvo,
            observaciones: vigente.observaciones,
            fechaTerminacion: vigente.fechaTerminacion,
            bilateralHasta: vigente.bilateralHasta,
            unilateralHasta: vigente.unilateralHasta,
            momentoDelPlazo: vigente.momentoDelPlazo,
            liquidadoPor: vigente.liquidadoPor,
            documento: documentos.get(vigente.actaDocumentoId) ?? null,
            pazYSalvoDocumento: vigente.pazYSalvoDocumentoId
              ? documentos.get(vigente.pazYSalvoDocumentoId) ?? null
              : null,
          }
        : null,
      historial: actas
        .filter((a) => a.estado === 'ANULADO')
        .map((a) => ({
          tipo: a.tipo,
          fechaActa: a.fechaActa,
          momentoDelPlazo: a.momentoDelPlazo,
          anuladoAt: a.anuladoAt,
          anuladoPor: a.anuladoPor,
          motivoAnulacion: a.motivoAnulacion,
        })),
    };
  }

  // ---------------------------------------------------------- liquidación --

  /**
   * Elabora el acta de liquidación y congela el balance.
   *
   * La ventana se guarda con el acta: es la que estaba vigente ese día.
   */
  async liquidar(
    procesoId: string,
    dto: LiquidarDto,
    acta: ArchivoCargado,
    hashActa: string,
    pazYSalvo: ArchivoCargado | null,
    hashPazYSalvo: string | null,
    acceso: HiringAccess,
  ) {
    await this.dataSource.transaction(async (em) => {
      const contrato = await this.exigirContratoLiquidable(em, procesoId);

      if (!(await this.informeFinalVigente(contrato.id, em))) {
        throw new ConflictException(
          'El contrato no tiene informe final: la liquidación va sobre el informe que dice cómo se ejecutó (10.1)',
        );
      }

      if (await this.actaVigente(contrato.id, em)) {
        throw new ConflictException(
          'El contrato ya está liquidado: para rehacer el acta se anula la vigente y se elabora otra',
        );
      }

      const ventana = await this.ventanaDelContrato(em, contrato);
      if (!ventana) {
        throw new ConflictException(
          'No se puede establecer la fecha de terminación del contrato: falta el acta de inicio o el plazo',
        );
      }

      const alerta = alertaDelPlazo(this.hoy(), ventana);

      // Lo único que se bloquea: antes de que venza el acuerdo la potestad
      // unilateral no existe, y un acto dictado sin ella nace viciado.
      if (dto.tipo === 'UNILATERAL' && alerta.momento === 'BILATERAL') {
        throw new ConflictException(
          `Todavía corre el plazo para liquidar de común acuerdo, hasta el ${ventana.bilateralHasta}: ` +
            'la liquidación unilateral solo procede cuando ese plazo vence',
        );
      }

      if (dto.pazYSalvo && !pazYSalvo) {
        throw new BadRequestException(
          'Adjunta el soporte del paz y salvo: declararlo sin documento deja al expediente afirmando algo que no puede probar',
        );
      }

      const expediente = await em.findOne(Expediente, { where: { procesoId } });
      if (!expediente) throw new NotFoundException('El proceso no tiene expediente abierto');

      const docActa = await this.guardarDocumento(
        em,
        expediente.id,
        `Contrato ${contrato.numero} · acta de liquidación ${dto.tipo.toLowerCase()}`,
        acta,
        hashActa,
        acceso,
      );

      let docPazYSalvo: Documento | null = null;
      if (pazYSalvo && hashPazYSalvo) {
        docPazYSalvo = await this.guardarDocumento(
          em,
          expediente.id,
          `Contrato ${contrato.numero} · paz y salvo`,
          pazYSalvo,
          hashPazYSalvo,
          acceso,
        );
      }

      const balance = await this.calcularBalance(em, contrato);

      const registro = await em.save(
        em.create(ActaLiquidacion, {
          contratoId: contrato.id,
          tipo: dto.tipo,
          actaDocumentoId: docActa.id,
          fechaActa: dto.fechaActa,
          balance,
          pazYSalvo: dto.pazYSalvo ?? false,
          pazYSalvoDocumentoId: docPazYSalvo?.id ?? null,
          observaciones: dto.observaciones ?? null,
          fechaTerminacion: ventana.fechaTerminacion,
          bilateralHasta: ventana.bilateralHasta,
          unilateralHasta: ventana.unilateralHasta,
          momentoDelPlazo: alerta.momento,
          estado: 'VIGENTE' as const,
          liquidadoPor: acceso.userName,
        } as Partial<ActaLiquidacion>),
      );

      // RF-SIS-01: el acta firmada es lo que deja el contrato liquidado. Se
      // derivó aquí y no en el cierre definitivo (EFDS-1175) porque son dos
      // hechos distintos: aquí se liquida, allá se cierra en firme.
      contrato.estado = 'LIQUIDADO';
      await em.save(contrato);

      await this.marcarActividad(em, procesoId, contrato.id, acceso);

      await this.traza(em, procesoId, registro.id, 'CERRAR', acceso, {
        actividad: NUMERAL_LIQUIDACION,
        contrato: contrato.numero,
        tipo: dto.tipo,
        // Que se liquidó tarde queda en la traza, no solo en el acta.
        momentoDelPlazo: alerta.momento,
        valorPagado: balance.valorPagado,
        saldo: balance.saldo,
        pazYSalvo: dto.pazYSalvo ?? false,
      });
    });

    return this.estado(procesoId, acceso);
  }

  /**
   * Anula el acta vigente para poder rehacerla.
   *
   * No se borra: el acta pudo publicarse y notificarse al contratista, y el
   * balance que declaró es lo que explica que ahora haya otro.
   */
  async anular(procesoId: string, dto: AnularLiquidacionDto, acceso: HiringAccess) {
    await this.dataSource.transaction(async (em) => {
      const contrato = await this.exigirContratoLiquidable(em, procesoId);

      const acta = await this.actaVigente(contrato.id, em);
      if (!acta) throw new NotFoundException('El contrato no tiene acta de liquidación vigente');

      acta.estado = 'ANULADO';
      acta.anuladoAt = new Date();
      acta.anuladoPor = acceso.userName;
      acta.motivoAnulacion = dto.motivo;
      await em.save(acta);

      // Sin acta vigente el contrato ya no está liquidado: vuelve a ejecución,
      // que es de donde salió (EFDS-1175).
      contrato.estado = 'EJECUCION';
      await em.save(contrato);

      await this.marcarActividad(em, procesoId, contrato.id, acceso);

      await this.traza(em, procesoId, acta.id, 'ANULAR', acceso, {
        actividad: NUMERAL_LIQUIDACION,
        contrato: contrato.numero,
        tipo: acta.tipo,
        motivo: dto.motivo,
      });
    });

    return this.estado(procesoId, acceso);
  }

  // ----------------------------------------------- lo que consumen otras --

  /**
   * El acta vigente del contrato, o nula si no se ha liquidado.
   *
   * La consultará el cierre definitivo (EFDS-1175): no se archiva un
   * expediente cuyo contrato sigue sin liquidar.
   */
  actaVigente(contratoId: string, em?: EntityManager) {
    const manager = em ?? this.dataSource.manager;
    return manager
      .getRepository(ActaLiquidacion)
      .findOne({ where: { contratoId, estado: 'VIGENTE' } });
  }

  // ----------------------------------------------------------- auxiliares --

  private hoy(): string {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  }

  /**
   * Cuándo terminó el contrato, que es desde donde corre todo el plazo.
   *
   * Sale del acta de inicio más el plazo pactado. Nula si falta cualquiera de
   * los dos: sin fecha de terminación no hay ventana que calcular, y suponerla
   * sería inventar un término legal.
   */
  private async ventanaDelContrato(
    em: EntityManager,
    contrato: Contrato,
  ): Promise<VentanaLiquidacion | null> {
    const acta = await em
      .getRepository(ActaInicio)
      .findOne({ where: { contratoId: contrato.id } });

    if (!acta || contrato.plazoDias === null) return null;

    const inicio = new Date(`${acta.fechaInicio}T00:00:00Z`);
    inicio.setUTCDate(inicio.getUTCDate() + contrato.plazoDias);
    return ventanaDeLiquidacion(inicio.toISOString().slice(0, 10));
  }

  private async calcularBalance(
    em: EntityManager,
    contrato: Contrato,
  ): Promise<BalanceLiquidacion> {
    const pagos = await em
      .getRepository(PagoContrato)
      .find({ where: { contratoId: contrato.id } });

    const tramitados = pagos.filter((p) => p.estado === 'TRAMITADO');
    const valorPagado = tramitados.reduce((total, p) => total + Number(p.valor), 0);

    return {
      valorContrato: contrato.valor,
      valorPagado,
      saldo: contrato.valor - valorPagado,
      cuentasTramitadas: tramitados.length,
      cuentasPendientes: pagos.filter((p) => PENDIENTES.includes(p.estado)).length,
    };
  }

  private porQueNoAdmite(estado: EstadoContrato): string {
    if (estado === 'RECHAZADO') return 'el proponente rechazó la minuta y no hay contrato';
    if (estado === 'LEGALIZADO') {
      return 'el contrato todavía no tiene acta de inicio: no ha empezado a ejecutarse (9.1)';
    }
    return 'el contrato todavía no está legalizado';
  }

  private informeFinalVigente(contratoId: string, em?: EntityManager) {
    const manager = em ?? this.dataSource.manager;
    return manager
      .getRepository(InformeFinal)
      .findOne({ where: { contratoId, estado: 'VIGENTE' } });
  }

  private async documentosDe(acta: ActaLiquidacion | null) {
    const ids = [acta?.actaDocumentoId, acta?.pazYSalvoDocumentoId].filter(Boolean) as string[];
    if (ids.length === 0) return new Map<string, { nombre: string; url: string }>();

    const docs = await this.dataSource
      .getRepository(Documento)
      .find({ where: { id: In(ids) } });

    return new Map(
      docs.map((d) => [
        d.id,
        { nombre: d.archivoNombreOriginal ?? d.nombre, url: d.archivoUrl },
      ]),
    );
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

  private async exigirContratoLiquidable(em: EntityManager, procesoId: string) {
    const contrato = await this.contratoDelProceso(em, procesoId, true);
    if (!contrato) throw new NotFoundException('El proceso no tiene contrato generado');

    if (!admiteLiquidacion(contrato.estado)) {
      throw new ConflictException(
        `No se puede liquidar el contrato: ${this.porQueNoAdmite(contrato.estado)}`,
      );
    }

    return contrato;
  }

  /** La actividad se cumple cuando hay acta vigente. */
  private async marcarActividad(
    em: EntityManager,
    procesoId: string,
    contratoId: string,
    acceso: HiringAccess,
  ) {
    const cumplida = !!(await this.actaVigente(contratoId, em));
    const estado = cumplida ? 'APROBADO' : 'BORRADOR';

    const actividad = await em.getRepository(ProcesoActividad).findOne({
      where: { procesoId, numeral: NUMERAL_LIQUIDACION },
    });

    if (!actividad) {
      await em.save(
        em.create(ProcesoActividad, {
          procesoId,
          numeral: NUMERAL_LIQUIDACION,
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
        numeral: NUMERAL_LIQUIDACION,
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
        entidad: 'acta_liquidacion',
        accion,
        detalle,
        usuarioNombre: acceso.userName,
        usuarioId: acceso.userId,
      } as Partial<Trazabilidad>),
    );
  }
}

/** Se reexporta para que las pruebas no tengan que conocer el archivo interno. */
export { MESES_BILATERAL };
