import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

import { alMenos, Contrato, EstadoContrato } from '../../entities/contrato.entity';
import { EstadoRp, RegistroPresupuestal } from '../../entities/registro-presupuestal.entity';
import { Proceso } from '../../entities/proceso.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { AccionTraza, Trazabilidad } from '../../entities/trazabilidad.entity';
import { Documento } from '../../entities/documento.entity';
import { Expediente } from '../../entities/expediente.entity';
import { HiringAccess } from '../../auth/hiring-access';
import { ExpedirRpDto, RechazarRpDto, SolicitarRpDto } from './dto/registro-presupuestal.dto';

/** Actividad 8.3 de la matriz: la expedición del registro presupuestal. */
export const NUMERAL_RP = '8.3';

/**
 * Si el contrato admite que se le tramite el RP.
 *
 * La historia dice «dado un contrato suscrito». El RP compromete recursos con
 * alguien concreto, así que no se puede expedir sobre un contrato que las
 * partes todavía no han firmado: no habría con quién comprometerlos.
 */
export function admiteRp(estado: EstadoContrato): boolean {
  return alMenos(estado, 'PERFECCIONADO');
}

/**
 * El orden del ciclo, calcado del CDP.
 *
 * Es la garantía de que un RP no se dé por expedido sin que la Financiera haya
 * verificado la disponibilidad: si el salto pasara, el contrato quedaría con un
 * compromiso que nadie revisó.
 */
const TRANSICIONES: Record<EstadoRp, EstadoRp[]> = {
  SOLICITADO: ['VERIFICADO', 'RECHAZADO', 'ANULADO'],
  VERIFICADO: ['EXPEDIDO', 'RECHAZADO', 'ANULADO'],
  EXPEDIDO: ['ANULADO'],
  RECHAZADO: [],
  ANULADO: [],
};

export function puedeTransicionar(desde: EstadoRp, hacia: EstadoRp): boolean {
  return TRANSICIONES[desde].includes(hacia);
}

/**
 * Si el RP alcanza a cubrir el valor del contrato.
 *
 * Se advierte en vez de bloquear: un contrato puede comprometerse por partes
 * —en vigencias distintas, con adiciones— y decidir si el monto basta es de la
 * Dirección Financiera, no del sistema.
 */
export function cubreElContrato(valorRp: number | null, valorContrato: number): boolean {
  return valorRp !== null && valorRp >= valorContrato;
}

interface ArchivoCargado {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
}

/**
 * Registro presupuestal del contrato — actividad 8.3 (EFDS-1163).
 *
 * Mismo ciclo que el CDP porque es el mismo trámite en otro momento: el CDP
 * aparta la partida, el RP la compromete.
 */
@Injectable()
export class RegistroPresupuestalService {
  constructor(private readonly dataSource: DataSource) {}

  // ------------------------------------------------------------- consulta --

  async estado(procesoId: string, _acceso: HiringAccess) {
    const contrato = await this.contratoDelProceso(this.dataSource.manager, procesoId);

    if (!contrato) {
      return {
        suscrito: false,
        motivoNoSuscrito: 'el proceso todavía no tiene contrato generado',
        rp: null,
        expedido: false,
        advertencia: null as string | null,
      };
    }

    const suscrito = admiteRp(contrato.estado);
    const rp = await this.rpVigente(contrato.id);

    return {
      suscrito,
      motivoNoSuscrito: suscrito
        ? null
        : contrato.estado === 'RECHAZADO'
          ? 'el proponente no aceptó la minuta'
          : 'el contrato todavía no lo han firmado las dos partes',
      contrato: { numero: contrato.numero, valor: contrato.valor },
      puedeSolicitar: suscrito && !rp,
      rp: rp
        ? {
            id: rp.id,
            numero: rp.numero,
            valor: rp.valor,
            rubro: rp.rubro,
            fechaExpedicion: rp.fechaExpedicion,
            vigenciaFiscal: rp.vigenciaFiscal,
            estado: rp.estado,
            observaciones: rp.observaciones,
            solicitadoPor: rp.solicitadoPor,
            expedidoPor: rp.expedidoPor,
          }
        : null,
      expedido: rp?.estado === 'EXPEDIDO',
      // Se advierte, no se bloquea: decidir si el monto basta es de la
      // Dirección Financiera, no del sistema.
      advertencia:
        rp?.estado === 'EXPEDIDO' && !cubreElContrato(rp.valor, contrato.valor)
          ? 'El registro presupuestal no alcanza a cubrir el valor del contrato'
          : null,
    };
  }

  // ------------------------------------------------------------- el ciclo --

  /** Radica la solicitud del RP ante la Dirección Financiera. */
  async solicitar(procesoId: string, dto: SolicitarRpDto, acceso: HiringAccess) {
    await this.dataSource.transaction(async (em) => {
      const contrato = await this.exigirContratoSuscrito(em, procesoId);

      if (await this.rpVigente(contrato.id, em)) {
        throw new ConflictException(
          'El contrato ya tiene un registro presupuestal en trámite o expedido',
        );
      }

      const rp = await em.save(
        em.create(RegistroPresupuestal, {
          contratoId: contrato.id,
          rubro: dto.rubro ?? null,
          valor: dto.valor ?? contrato.valor,
          vigenciaFiscal: dto.vigenciaFiscal ?? null,
          estado: 'SOLICITADO' as const,
          solicitadoPor: acceso.userName,
          solicitadoAt: new Date(),
        } as Partial<RegistroPresupuestal>),
      );

      await this.marcarActividad(em, procesoId, contrato.id, acceso);

      await this.traza(em, procesoId, rp.id, 'SOLICITAR', acceso, {
        actividad: NUMERAL_RP,
        contrato: contrato.numero,
        rubro: dto.rubro,
      });
    });

    return this.estado(procesoId, acceso);
  }

  /** La Financiera confirma que hay disponibilidad para comprometer. */
  async verificar(procesoId: string, acceso: HiringAccess) {
    await this.dataSource.transaction(async (em) => {
      const contrato = await this.exigirContratoSuscrito(em, procesoId);
      const rp = await this.exigirRp(contrato.id, em);

      this.exigirTransicion(rp.estado, 'VERIFICADO');

      rp.estado = 'VERIFICADO';
      await em.save(rp);

      await this.traza(em, procesoId, rp.id, 'VERIFICAR', acceso, {
        actividad: NUMERAL_RP,
        contrato: contrato.numero,
      });
    });

    return this.estado(procesoId, acceso);
  }

  /**
   * Expide el RP con su número y su soporte.
   *
   * Con esto el compromiso queda firme: el número y la fecha son lo que lo hace
   * verificable ante los entes de control, así que no son opcionales.
   */
  async expedir(
    procesoId: string,
    dto: ExpedirRpDto,
    soporte: ArchivoCargado | null,
    hash: string | null,
    acceso: HiringAccess,
  ) {
    await this.dataSource.transaction(async (em) => {
      const contrato = await this.exigirContratoSuscrito(em, procesoId);
      const rp = await this.exigirRp(contrato.id, em);

      this.exigirTransicion(rp.estado, 'EXPEDIDO');
      this.validarFecha(dto.fechaExpedicion);

      if (soporte && hash) {
        const expediente = await em.findOne(Expediente, { where: { procesoId } });
        if (!expediente) throw new NotFoundException('El proceso no tiene expediente abierto');

        const doc = await this.guardarDocumento(
          em,
          expediente.id,
          `Contrato ${contrato.numero} · registro presupuestal ${dto.numero}`,
          soporte,
          hash,
          acceso,
        );
        rp.documentoId = doc.id;
      }

      rp.estado = 'EXPEDIDO';
      rp.numero = dto.numero;
      rp.valor = dto.valor;
      rp.fechaExpedicion = dto.fechaExpedicion;
      if (dto.rubro) rp.rubro = dto.rubro;
      if (dto.vigenciaFiscal) rp.vigenciaFiscal = dto.vigenciaFiscal;
      rp.expedidoPor = acceso.userName;
      await em.save(rp);

      await this.marcarActividad(em, procesoId, contrato.id, acceso);

      await this.traza(em, procesoId, rp.id, 'EXPEDIR', acceso, {
        actividad: NUMERAL_RP,
        contrato: contrato.numero,
        numero: dto.numero,
        valor: dto.valor,
        cubreElContrato: cubreElContrato(dto.valor, contrato.valor),
      });
    });

    return this.estado(procesoId, acceso);
  }

  /** La Financiera no encuentra disponibilidad; se dice por qué. */
  async rechazar(procesoId: string, dto: RechazarRpDto, acceso: HiringAccess) {
    await this.dataSource.transaction(async (em) => {
      const contrato = await this.exigirContratoSuscrito(em, procesoId);
      const rp = await this.exigirRp(contrato.id, em);

      this.exigirTransicion(rp.estado, 'RECHAZADO');

      rp.estado = 'RECHAZADO';
      rp.observaciones = dto.observaciones;
      await em.save(rp);

      await this.marcarActividad(em, procesoId, contrato.id, acceso);

      await this.traza(em, procesoId, rp.id, 'RECHAZAR', acceso, {
        actividad: NUMERAL_RP,
        contrato: contrato.numero,
        observaciones: dto.observaciones,
      });
    });

    return this.estado(procesoId, acceso);
  }

  // ----------------------------------------------------------- auxiliares --

  private exigirTransicion(desde: EstadoRp, hacia: EstadoRp) {
    if (puedeTransicionar(desde, hacia)) return;

    if (desde === 'SOLICITADO' && hacia === 'EXPEDIDO') {
      throw new ConflictException(
        'El registro presupuestal se verifica antes de expedirse: es lo que certifica que hay recursos que comprometer',
      );
    }
    throw new ConflictException(
      `Un registro presupuestal ${desde.toLowerCase()} no puede pasar a ${hacia.toLowerCase()}`,
    );
  }

  /** El acto ya ocurrió; no se expide hacia el futuro. */
  private validarFecha(fecha: string) {
    const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });

    if (fecha > hoy) {
      throw new BadRequestException(
        'La fecha de expedición no puede ser posterior a hoy: es la del registro ya expedido',
      );
    }
  }

  /** La actividad se cumple cuando el RP queda expedido. */
  private async marcarActividad(
    em: EntityManager,
    procesoId: string,
    contratoId: string,
    acceso: HiringAccess,
  ) {
    const rp = await this.rpVigente(contratoId, em);
    const aprobado = rp?.estado === 'EXPEDIDO';
    const estado = aprobado ? 'APROBADO' : 'BORRADOR';

    const actividad = await em
      .getRepository(ProcesoActividad)
      .findOne({ where: { procesoId, numeral: NUMERAL_RP } });

    if (!actividad) {
      await em.save(
        em.create(ProcesoActividad, {
          procesoId,
          numeral: NUMERAL_RP,
          estado: estado as any,
          datos: {},
          ...(aprobado ? { revisadoPor: acceso.userName, revisadoAt: new Date() } : {}),
        }),
      );
      return;
    }

    actividad.estado = estado as any;
    actividad.revisadoPor = aprobado ? acceso.userName : null;
    actividad.revisadoAt = aprobado ? new Date() : null;
    await em.save(actividad);
  }

  /**
   * El RP en trámite o expedido; los rechazados y anulados no cuentan.
   *
   * Solo el del contrato: desde EFDS-1176 cada adición trae el suyo, y sin el
   * filtro esta consulta empezaría a devolver cualquiera de los dos.
   */
  rpVigente(contratoId: string, em?: EntityManager) {
    const manager = em ?? this.dataSource.manager;
    return manager
      .getRepository(RegistroPresupuestal)
      .createQueryBuilder('rp')
      .where('rp.contrato_id = :contratoId', { contratoId })
      .andWhere("rp.estado NOT IN ('RECHAZADO', 'ANULADO')")
      .andWhere('rp.modificacion_id IS NULL')
      .getOne();
  }

  private async exigirRp(contratoId: string, em?: EntityManager) {
    const rp = await this.rpVigente(contratoId, em);
    if (!rp) throw new NotFoundException('El contrato no tiene registro presupuestal en trámite');
    return rp;
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

  private async exigirContratoSuscrito(em: EntityManager, procesoId: string) {
    const contrato = await this.contratoDelProceso(em, procesoId, true);
    if (!contrato) throw new NotFoundException('El proceso no tiene contrato generado');

    if (!admiteRp(contrato.estado)) {
      throw new ConflictException(
        'El contrato todavía no está suscrito: el registro presupuestal compromete recursos con quien ya firmó',
      );
    }

    return contrato;
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
        numeral: NUMERAL_RP,
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
        entidad: 'registro_presupuestal',
        accion,
        detalle,
        usuarioNombre: acceso.userName,
        usuarioId: acceso.userId,
      } as Partial<Trazabilidad>),
    );
  }
}
