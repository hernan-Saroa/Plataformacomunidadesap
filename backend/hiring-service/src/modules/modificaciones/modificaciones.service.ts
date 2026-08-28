import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

import {
  Contrato,
  enEjecucion,
  EstadoContrato,
  puedeTransicionar,
} from '../../entities/contrato.entity';
import {
  ModificacionContrato,
  TipoModificacion,
} from '../../entities/modificacion-contrato.entity';
import { Proceso } from '../../entities/proceso.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { AccionTraza, Trazabilidad } from '../../entities/trazabilidad.entity';
import { Documento } from '../../entities/documento.entity';
import { Expediente } from '../../entities/expediente.entity';
import { HiringAccess } from '../../auth/hiring-access';
import {
  AprobarModificacionDto,
  RechazarModificacionDto,
  SolicitarModificacionDto,
  SolicitarProrrogaDto,
} from './dto/modificaciones.dto';

/** Actividad 9.5 de la matriz: las modificaciones contractuales. */
export const NUMERAL_MODIFICACIONES = '9.5';

/**
 * Si el contrato admite que se le tramite una modificación.
 *
 * El criterio de la historia empieza «dado un contrato en ejecución».
 * Prorrogar lo que no ha empezado no extiende nada, y prorrogar lo terminado
 * reviviría un plazo agotado —ahí lo que procede es liquidar—. Un contrato
 * suspendido sí admite modificaciones: la reanudación es una de ellas.
 */
export function admiteModificacion(estado: EstadoContrato): boolean {
  return enEjecucion(estado);
}

/**
 * El plazo que queda tras aprobar la prórroga.
 *
 * Aparte y exportada porque es la regla que la historia pide probar: extiende
 * el plazo sin tocar el presupuesto, y aquí no entra ningún valor.
 */
export function plazoConProrroga(plazoActual: number | null, dias: number): number {
  return (plazoActual ?? 0) + dias;
}

/**
 * A qué estado lleva el contrato aprobar esta modificación.
 *
 * `null` cuando no lo mueve: la prórroga cambia el plazo, la cesión cambia
 * quién ejecuta y la aclaración cambia lo que el contrato dice, pero en los
 * tres el contrato sigue corriendo igual. Solo la suspensión, la reanudación y
 * la terminación anticipada lo mueven, que es el «cuando aplique» del criterio
 * de EFDS-1178.
 */
export function estadoTrasModificacion(
  tipo: TipoModificacion,
): EstadoContrato | null {
  if (tipo === 'SUSPENSION') return 'SUSPENDIDO';
  if (tipo === 'REANUDACION') return 'EJECUCION';
  if (tipo === 'TERMINACION_ANTICIPADA') return 'TERMINADO';
  return null;
}

/**
 * Si el tipo de modificación cabe en el estado en que está el contrato.
 *
 * Un contrato suspendido no se vuelve a suspender, y uno corriendo no se
 * reanuda porque no está detenido. Lo demás se tramita en ambos.
 */
export function admiteTipo(estado: EstadoContrato, tipo: TipoModificacion): boolean {
  if (!admiteModificacion(estado)) return false;
  if (tipo === 'SUSPENSION') return estado === 'EJECUCION';
  if (tipo === 'REANUDACION') return estado === 'SUSPENDIDO';
  return true;
}

interface ArchivoCargado {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
}

/**
 * Modificaciones contractuales — actividad 9.5 (EFDS-1177).
 *
 * El trámite es el mismo para todos los tipos: se solicita, alguien la aprueba
 * con acto administrativo, y solo entonces produce efectos.
 */
@Injectable()
export class ModificacionesService {
  constructor(private readonly dataSource: DataSource) {}

  // ------------------------------------------------------------- consulta --

  async estado(procesoId: string, _acceso: HiringAccess) {
    const em = this.dataSource.manager;
    const contrato = await this.contratoDelProceso(em, procesoId);

    if (!contrato) {
      return {
        puedeSolicitar: false,
        motivoNoPuede: 'el proceso todavía no tiene contrato generado',
        contrato: null,
        modificaciones: [],
      };
    }

    const admite = admiteModificacion(contrato.estado);

    const modificaciones = await em.getRepository(ModificacionContrato).find({
      where: { contratoId: contrato.id },
      order: { createdAt: 'DESC' },
    });

    return {
      puedeSolicitar: admite,
      motivoNoPuede: admite ? null : this.motivoNoPuede(contrato.estado),

      contrato: {
        numero: contrato.numero,
        objeto: contrato.objeto,
        estado: contrato.estado,
        /** El plazo vigente, que ya incluye las prórrogas aprobadas. */
        plazoDias: contrato.plazoDias,
        ejecucionDesde: contrato.ejecucionDesde,
        /** Se responde aparte para que la pantalla no tenga que sumarlo. */
        diasProrrogados: modificaciones
          .filter((m) => m.tipo === 'PRORROGA' && m.estado === 'APROBADA')
          .reduce((total, m) => total + (m.diasProrroga ?? 0), 0),
      },

      modificaciones: modificaciones.map((m) => ({
        id: m.id,
        tipo: m.tipo,
        estado: m.estado,
        justificacion: m.justificacion,
        diasProrroga: m.diasProrroga,
        fechaEfecto: m.fechaEfecto,
        plazoAnteriorDias: m.plazoAnteriorDias,
        solicitadaPor: m.solicitadaPor,
        resueltaPor: m.resueltaPor,
        resueltaAt: m.resueltaAt,
        motivoRechazo: m.motivoRechazo,
        publicadaAt: m.publicadaAt,
        createdAt: m.createdAt,
      })),
    };
  }

  // ---------------------------------------------------------- solicitud --

  /**
   * Pide la prórroga. No la concede.
   *
   * Sin acto administrativo: lo produce quien aprueba, y exigirlo aquí
   * obligaría a conseguir la firma antes de saber si se la van a dar.
   */
  async solicitarProrroga(
    procesoId: string,
    dto: SolicitarProrrogaDto,
    acceso: HiringAccess,
  ) {
    await this.dataSource.transaction(async (em) => {
      const contrato = await this.exigirContratoEnEjecucion(em, procesoId);

      if (contrato.plazoDias === null) {
        throw new ConflictException(
          'El contrato no tiene plazo registrado: no hay plazo que prorrogar',
        );
      }

      this.validarFechaEfecto(dto.fechaEfecto);

      // Dos prórrogas en curso sobre el mismo contrato dejarían sin saber cuál
      // se aprueba primero y con qué plazo queda la segunda.
      const enCurso = await em.getRepository(ModificacionContrato).findOne({
        where: { contratoId: contrato.id, tipo: 'PRORROGA', estado: 'SOLICITADA' },
      });
      if (enCurso) {
        throw new ConflictException(
          'El contrato ya tiene una prórroga solicitada pendiente de resolver',
        );
      }

      const modificacion = await em.save(
        em.create(ModificacionContrato, {
          contratoId: contrato.id,
          tipo: 'PRORROGA',
          justificacion: dto.justificacion.trim(),
          diasProrroga: dto.diasProrroga,
          fechaEfecto: dto.fechaEfecto,
          estado: 'SOLICITADA',
          solicitadaPor: acceso.userName,
        } as Partial<ModificacionContrato>),
      );

      await this.marcarActividad(em, procesoId, acceso);

      await this.traza(em, procesoId, modificacion.id, 'CREAR', acceso, {
        actividad: NUMERAL_MODIFICACIONES,
        contrato: contrato.numero,
        tipo: 'PRORROGA',
        dias: dto.diasProrroga,
      });
    });

    return this.estado(procesoId, acceso);
  }

  /**
   * Pide una cesión, aclaración, suspensión, reanudación o terminación.
   *
   * Comparten trámite con la prórroga y se separan del método anterior por lo
   * que cada una exige: la cesión necesita cesionario, la reanudación necesita
   * saber qué suspensión levanta, y ninguna de las cinco toca el plazo.
   */
  async solicitar(
    procesoId: string,
    dto: SolicitarModificacionDto,
    acceso: HiringAccess,
  ) {
    await this.dataSource.transaction(async (em) => {
      const contrato = await this.exigirContratoEnEjecucion(em, procesoId);

      if (!admiteTipo(contrato.estado, dto.tipo)) {
        throw new ConflictException(
          dto.tipo === 'SUSPENSION'
            ? 'El contrato ya está suspendido'
            : 'El contrato no está suspendido: no hay nada que reanudar',
        );
      }

      if (dto.tipo === 'CESION' && !(dto.cesionarioNombre && dto.cesionarioDocumento)) {
        throw new BadRequestException(
          'La cesión necesita el nombre y la identificación de quien recibe el contrato',
        );
      }

      const enCurso = await em.getRepository(ModificacionContrato).findOne({
        where: { contratoId: contrato.id, tipo: dto.tipo, estado: 'SOLICITADA' },
      });
      if (enCurso) {
        throw new ConflictException(
          'El contrato ya tiene una modificación de ese tipo pendiente de resolver',
        );
      }

      // La reanudación cuelga de la suspensión que levanta: de ahí salen los
      // días que el contrato estuvo detenido.
      let suspensionId: string | null = null;
      if (dto.tipo === 'REANUDACION') {
        const suspension = await em.getRepository(ModificacionContrato).findOne({
          where: { contratoId: contrato.id, tipo: 'SUSPENSION', estado: 'APROBADA' },
          order: { resueltaAt: 'DESC' },
        });
        if (!suspension) {
          throw new ConflictException('No hay una suspensión aprobada que reanudar');
        }
        suspensionId = suspension.id;
      }

      const modificacion = await em.save(
        em.create(ModificacionContrato, {
          contratoId: contrato.id,
          tipo: dto.tipo,
          justificacion: dto.justificacion.trim(),
          fechaEfecto: dto.fechaEfecto,
          estado: 'SOLICITADA',
          cesionarioNombre: dto.tipo === 'CESION' ? dto.cesionarioNombre!.trim() : null,
          cesionarioDocumento:
            dto.tipo === 'CESION' ? dto.cesionarioDocumento!.trim() : null,
          fechaReanudacionPrevista: dto.fechaReanudacionPrevista ?? null,
          suspensionId,
          solicitadaPor: acceso.userName,
        } as Partial<ModificacionContrato>),
      );

      await this.marcarActividad(em, procesoId, acceso);

      await this.traza(em, procesoId, modificacion.id, 'CREAR', acceso, {
        actividad: NUMERAL_MODIFICACIONES,
        contrato: contrato.numero,
        tipo: dto.tipo,
      });
    });

    return this.estado(procesoId, acceso);
  }

  // ---------------------------------------------------------- aprobación --

  /** Aprueba la prórroga y extiende el plazo. El valor del contrato no se toca. */
  async aprobar(
    procesoId: string,
    modificacionId: string,
    dto: AprobarModificacionDto,
    archivo: ArchivoCargado,
    hash: string,
    acceso: HiringAccess,
  ) {
    await this.dataSource.transaction(async (em) => {
      const contrato = await this.exigirContratoEnEjecucion(em, procesoId);
      const modificacion = await this.exigirPendiente(em, contrato.id, modificacionId);

      const expediente = await em.findOne(Expediente, { where: { procesoId } });
      if (!expediente) throw new NotFoundException('El proceso no tiene expediente abierto');

      const doc = await this.guardarDocumento(
        em,
        expediente.id,
        `Contrato ${contrato.numero} · acto de la modificación`,
        archivo,
        hash,
        acceso,
      );

      const plazoAnterior = contrato.plazoDias;

      modificacion.plazoAnteriorDias = plazoAnterior;
      modificacion.documentoId = doc.id;
      modificacion.estado = 'APROBADA';
      modificacion.resueltaPor = acceso.userName;
      modificacion.resueltaAt = new Date();
      await em.save(modificacion);

      if (modificacion.tipo === 'PRORROGA') {
        contrato.plazoDias = plazoConProrroga(plazoAnterior, modificacion.diasProrroga ?? 0);
      }

      // Solo la suspensión, la reanudación y la terminación mueven el estado.
      // Es el «cuando aplique» del criterio de EFDS-1178.
      const estadoNuevo = estadoTrasModificacion(modificacion.tipo);
      if (estadoNuevo) {
        if (!puedeTransicionar(contrato.estado, estadoNuevo)) {
          throw new ConflictException(
            `El contrato no puede pasar de ${contrato.estado} a ${estadoNuevo}`,
          );
        }
        contrato.estado = estadoNuevo;
      }

      await em.save(contrato);

      await this.traza(em, procesoId, modificacion.id, 'APROBAR', acceso, {
        actividad: NUMERAL_MODIFICACIONES,
        contrato: contrato.numero,
        tipo: modificacion.tipo,
        plazoAnterior,
        plazoNuevo: contrato.plazoDias,
        estadoNuevo: estadoNuevo ?? contrato.estado,
        observacion: dto.observacion ?? null,
      });
    });

    return this.estado(procesoId, acceso);
  }

  /** Niega la prórroga. El plazo del contrato no se toca. */
  async rechazar(
    procesoId: string,
    modificacionId: string,
    dto: RechazarModificacionDto,
    acceso: HiringAccess,
  ) {
    await this.dataSource.transaction(async (em) => {
      const contrato = await this.exigirContratoEnEjecucion(em, procesoId);
      const modificacion = await this.exigirPendiente(em, contrato.id, modificacionId);

      modificacion.estado = 'RECHAZADA';
      modificacion.motivoRechazo = dto.motivo.trim();
      modificacion.resueltaPor = acceso.userName;
      modificacion.resueltaAt = new Date();
      await em.save(modificacion);

      await this.traza(em, procesoId, modificacion.id, 'RECHAZAR', acceso, {
        actividad: NUMERAL_MODIFICACIONES,
        contrato: contrato.numero,
        tipo: 'PRORROGA',
        motivo: dto.motivo,
      });
    });

    return this.estado(procesoId, acceso);
  }

  // ---------------------------------------------------------- auxiliares --

  private motivoNoPuede(estado: EstadoContrato): string {
    if (estado === 'TERMINADO' || estado === 'LIQUIDADO' || estado === 'CERRADO') {
      // Prorrogar lo terminado reviviría un plazo agotado; lo que procede es
      // la liquidación.
      return 'la ejecución del contrato ya terminó';
    }
    return 'el contrato todavía no está en ejecución';
  }

  /**
   * La modificación rige desde una fecha cierta.
   *
   * Puede ser futura, a diferencia de los soportes del seguimiento: una
   * prórroga se pacta antes de que venza el plazo, que es justamente cuando
   * sirve. Lo que no puede es regir desde antes de que el contrato empezara.
   */
  private validarFechaEfecto(fechaEfecto: string) {
    if (!fechaEfecto) {
      throw new BadRequestException('La modificación necesita una fecha de efecto');
    }
  }

  private async exigirPendiente(
    em: EntityManager,
    contratoId: string,
    modificacionId: string,
  ) {
    const modificacion = await em.getRepository(ModificacionContrato).findOne({
      where: { id: modificacionId, contratoId },
    });

    if (!modificacion) throw new NotFoundException('La modificación no existe');

    if (modificacion.estado !== 'SOLICITADA') {
      throw new ConflictException(
        modificacion.estado === 'APROBADA'
          ? 'La modificación ya fue aprobada'
          : 'La modificación ya fue rechazada',
      );
    }

    return modificacion;
  }

  private async exigirContratoEnEjecucion(em: EntityManager, procesoId: string) {
    const contrato = await this.contratoDelProceso(em, procesoId);
    if (!contrato) throw new NotFoundException('El proceso no tiene contrato generado');

    if (!admiteModificacion(contrato.estado)) {
      throw new ConflictException(
        `No se puede modificar el contrato: ${this.motivoNoPuede(contrato.estado)}`,
      );
    }

    return contrato;
  }

  private async contratoDelProceso(em: EntityManager, procesoId: string) {
    await this.exigirProceso(em, procesoId);

    return em
      .getRepository(Contrato)
      .createQueryBuilder('c')
      .where('c.proceso_id = :procesoId', { procesoId })
      .andWhere("c.estado <> 'RECHAZADO'")
      .orderBy('c.created_at', 'DESC')
      .getOne();
  }

  private async exigirProceso(em: EntityManager, procesoId: string) {
    const proceso = await em.getRepository(Proceso).findOne({ where: { id: procesoId } });
    if (!proceso) throw new NotFoundException('El proceso no existe');
    return proceso;
  }

  /**
   * La actividad queda en curso, no aprobada.
   *
   * Las modificaciones pueden darse en cualquier momento de la ejecución, así
   * que darla por cumplida con la primera haría que el riel dijera que ya no
   * hay nada que hacer. Mismo criterio del seguimiento (EFDS-1168).
   */
  private async marcarActividad(
    em: EntityManager,
    procesoId: string,
    acceso: HiringAccess,
  ) {
    const actividad = await em.getRepository(ProcesoActividad).findOne({
      where: { procesoId, numeral: NUMERAL_MODIFICACIONES },
    });

    if (!actividad) {
      await em.save(
        em.create(ProcesoActividad, {
          procesoId,
          numeral: NUMERAL_MODIFICACIONES,
          estado: 'BORRADOR' as any,
          datos: {},
          enviadoPor: acceso.userName,
          enviadoAt: new Date(),
        }),
      );
    }
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
