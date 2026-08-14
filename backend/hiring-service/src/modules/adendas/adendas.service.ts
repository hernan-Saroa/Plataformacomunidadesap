import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, In, IsNull } from 'typeorm';

import { Adenda } from '../../entities/adenda.entity';
import { PublicacionPliego } from '../../entities/publicacion-pliego.entity';
import { ActividadExcluida } from '../../entities/actividad.entity';
import { Modalidad } from '../../entities/modalidad.entity';
import { Proceso } from '../../entities/proceso.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { AccionTraza, Trazabilidad } from '../../entities/trazabilidad.entity';
import { Documento } from '../../entities/documento.entity';
import { Expediente } from '../../entities/expediente.entity';
import { HiringAccess } from '../../auth/hiring-access';
import { AnularAdendaDto, EmitirAdendaDto, PublicarAdendaDto } from './dto/adendas.dto';

/** Actividad 5.6 de la matriz: las adendas del proceso. */
export const NUMERAL_ADENDAS = '5.6';

/** Etapa en la que el proceso ya está abierto y el pliego definitivo rige. */
const ETAPA_APERTURA = 5;

interface ArchivoCargado {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
}

@Injectable()
export class AdendasService {
  constructor(private readonly dataSource: DataSource) {}

  // ------------------------------------------------------------- consulta --

  async estado(procesoId: string) {
    const proceso = await this.exigirProceso(this.dataSource.manager, procesoId);

    const excluida = await this.dataSource.getRepository(ActividadExcluida).findOne({
      where: { numeral: NUMERAL_ADENDAS, modalidad: proceso.modalidad ?? '' },
    });

    const modalidad = proceso.modalidad
      ? await this.dataSource
          .getRepository(Modalidad)
          .findOne({ where: { codigo: proceso.modalidad } })
      : null;

    const publicacion = await this.publicacionVigente(procesoId);

    const adendas = await this.dataSource.getRepository(Adenda).find({
      where: { procesoId },
      order: { numero: 'ASC' },
    });

    const documentos = await this.archivosDe(
      adendas.flatMap((a) => [a.documentoId, a.evidenciaDocumentoId].filter(Boolean) as string[]),
    );

    const archivo = (id: string | null) => {
      const doc = id ? documentos.get(id) : undefined;
      return doc ? { nombre: doc.archivoNombreOriginal ?? doc.nombre, url: doc.archivoUrl } : null;
    };

    return {
      aplica: !excluida,
      motivoNoAplica: excluida?.motivo ?? null,
      modalidad: proceso.modalidad,
      modalidadNombre: modalidad?.nombre ?? proceso.modalidad,
      // Sin pliego publicado no hay documento público que modificar, y con el
      // proceso ya abierto rige el pliego definitivo.
      publicado: !!publicacion,
      abierto: proceso.etapa >= ETAPA_APERTURA,
      puedeEmitir: !excluida && !!publicacion && proceso.etapa < ETAPA_APERTURA,
      vencimientoVigente: publicacion?.fechaVencimiento ?? null,
      adendas: adendas.map((a) => ({
        id: a.id,
        numero: a.numero,
        tipo: a.tipo,
        objeto: a.objeto,
        estado: a.estado,
        emitidaPor: a.emitidaPor,
        emitidaAt: a.createdAt,
        fechaPublicacion: a.fechaPublicacion,
        publicadaPor: a.publicadaPor,
        vencimientoAnterior: a.vencimientoAnterior,
        vencimientoNuevo: a.vencimientoNuevo,
        motivoAnulacion: a.motivoAnulacion,
        documento: archivo(a.documentoId),
        evidencia: archivo(a.evidenciaDocumentoId),
      })),
    };
  }

  // -------------------------------------------------------------- emisión --

  /**
   * Registra una adenda con su documento firmado.
   *
   * Emitir no publica: la adenda queda en el expediente con su consecutivo,
   * pero no produce efectos hasta que se publique. Es lo que permite prepararla
   * y publicarla el día que corresponda.
   */
  async emitir(
    procesoId: string,
    dto: EmitirAdendaDto,
    documento: ArchivoCargado,
    hash: string,
    acceso: HiringAccess,
  ) {
    await this.dataSource.transaction(async (em) => {
      const proceso = await this.exigirProceso(em, procesoId);

      const excluida = await em.getRepository(ActividadExcluida).findOne({
        where: { numeral: NUMERAL_ADENDAS, modalidad: proceso.modalidad ?? '' },
      });
      if (excluida) {
        throw new BadRequestException(`Esta modalidad no admite adendas: ${excluida.motivo}`);
      }

      const publicacion = await this.publicacionVigente(procesoId, em);
      if (!publicacion) {
        throw new ConflictException(
          'No hay proyecto de pliego publicado: una adenda modifica algo que ya se hizo público',
        );
      }

      if (proceso.etapa >= ETAPA_APERTURA) {
        throw new ConflictException(
          'El proceso ya fue abierto: a partir de la apertura rige el pliego definitivo',
        );
      }

      if (dto.tipo === 'CRONOGRAMA') {
        this.validarNuevoVencimiento(dto.vencimientoNuevo!, publicacion);
      }

      const expediente = await em.findOne(Expediente, { where: { procesoId } });
      if (!expediente) throw new NotFoundException('El proceso no tiene expediente abierto');

      const doc = await this.guardarDocumento(
        em,
        expediente.id,
        `Adenda ${dto.tipo === 'FONDO' ? 'de requisitos' : 'de cronograma'}`,
        documento,
        hash,
        acceso,
      );

      const adenda = await em.save(
        em.create(Adenda, {
          procesoId,
          numero: await this.siguienteNumero(em, procesoId),
          tipo: dto.tipo,
          objeto: dto.objeto,
          documentoId: doc.id,
          estado: 'EMITIDA' as const,
          emitidaPor: acceso.userName,
          vencimientoNuevo: dto.tipo === 'CRONOGRAMA' ? dto.vencimientoNuevo! : null,
        }),
      );

      // La actividad queda en curso: hay adendas, pero mientras alguna esté sin
      // publicar el trabajo no está terminado.
      await this.marcarActividad(em, procesoId, acceso);

      await this.traza(em, procesoId, adenda.id, 'CREAR', acceso, {
        actividad: NUMERAL_ADENDAS,
        adenda: adenda.numero,
        tipo: dto.tipo,
      });
    });

    return this.estado(procesoId);
  }

  // ---------------------------------------------------------- publicación --

  /**
   * Publica una adenda emitida y, si es de cronograma, mueve el plazo.
   *
   * Aquí es donde la adenda produce efectos: el segundo criterio de la historia
   * dice que al publicarse una de cronograma el sistema actualiza las fechas
   * del proceso. Se hace en la misma transacción que la publicación, porque una
   * adenda publicada cuyo plazo no se movió dejaría el expediente diciendo una
   * cosa y el control de términos contando otra.
   */
  async publicar(
    procesoId: string,
    adendaId: string,
    dto: PublicarAdendaDto,
    evidencia: ArchivoCargado,
    hash: string,
    acceso: HiringAccess,
  ) {
    await this.dataSource.transaction(async (em) => {
      const adenda = await em.getRepository(Adenda).findOne({ where: { id: adendaId, procesoId } });
      if (!adenda) throw new NotFoundException('La adenda no existe en este proceso');

      if (adenda.estado === 'PUBLICADA') {
        throw new ConflictException(`La adenda ${adenda.numero} ya fue publicada`);
      }
      if (adenda.estado === 'ANULADA') {
        throw new ConflictException(`La adenda ${adenda.numero} fue anulada`);
      }

      const publicacion = await this.publicacionVigente(procesoId, em);
      if (!publicacion) {
        throw new ConflictException('El proceso ya no tiene una publicación vigente');
      }

      this.validarFechaPublicacion(dto.fechaPublicacion, publicacion.fechaPublicacion);

      const expediente = await em.findOne(Expediente, { where: { procesoId } });
      if (!expediente) throw new NotFoundException('El proceso no tiene expediente abierto');

      const soporte = await this.guardarDocumento(
        em,
        expediente.id,
        `Evidencia de la publicación de la adenda ${adenda.numero}`,
        evidencia,
        hash,
        acceso,
      );

      adenda.estado = 'PUBLICADA';
      adenda.fechaPublicacion = dto.fechaPublicacion;
      adenda.evidenciaDocumentoId = soporte.id;
      adenda.publicadaPor = acceso.userName;

      if (adenda.tipo === 'CRONOGRAMA') {
        // Se revalida contra el vencimiento de hoy y no contra el de cuando se
        // emitió: entre una cosa y otra pudo publicarse otra adenda.
        this.validarNuevoVencimiento(adenda.vencimientoNuevo!, publicacion);

        adenda.vencimientoAnterior = publicacion.fechaVencimiento;
        publicacion.fechaVencimiento = adenda.vencimientoNuevo;
        await em.save(publicacion);
      }

      await em.save(adenda);
      await this.marcarActividad(em, procesoId, acceso);

      await this.traza(em, procesoId, adenda.id, 'PUBLICAR', acceso, {
        actividad: NUMERAL_ADENDAS,
        adenda: adenda.numero,
        tipo: adenda.tipo,
        fechaPublicacion: dto.fechaPublicacion,
        ...(adenda.tipo === 'CRONOGRAMA'
          ? {
              vencimientoAnterior: adenda.vencimientoAnterior,
              vencimientoNuevo: adenda.vencimientoNuevo,
            }
          : {}),
      });
    });

    return this.estado(procesoId);
  }

  /**
   * Anula una adenda emitida por error.
   *
   * Solo antes de publicarla: una vez publicada ya produjo efectos frente a
   * terceros, y deshacerla es otra adenda, no un borrado.
   */
  async anular(procesoId: string, adendaId: string, dto: AnularAdendaDto, acceso: HiringAccess) {
    await this.dataSource.transaction(async (em) => {
      const adenda = await em.getRepository(Adenda).findOne({ where: { id: adendaId, procesoId } });
      if (!adenda) throw new NotFoundException('La adenda no existe en este proceso');

      if (adenda.estado === 'PUBLICADA') {
        throw new ConflictException(
          `La adenda ${adenda.numero} ya fue publicada: para dejarla sin efecto se emite otra adenda`,
        );
      }
      if (adenda.estado === 'ANULADA') {
        throw new ConflictException(`La adenda ${adenda.numero} ya está anulada`);
      }

      adenda.estado = 'ANULADA';
      adenda.anuladaAt = new Date();
      adenda.anuladaPor = acceso.userName;
      adenda.motivoAnulacion = dto.motivo;
      await em.save(adenda);

      await this.marcarActividad(em, procesoId, acceso);

      await this.traza(em, procesoId, adenda.id, 'ANULAR', acceso, {
        actividad: NUMERAL_ADENDAS,
        adenda: adenda.numero,
        motivo: dto.motivo,
      });
    });

    return this.estado(procesoId);
  }

  // ----------------------------------------------------------- auxiliares --

  /**
   * Una adenda de cronograma prorroga: no puede llevar el vencimiento al
   * pasado ni acortarlo.
   *
   * Acortar un plazo de publicidad ya anunciado recortaría el término de quien
   * todavía puede observar el pliego, y el módulo cuenta las observaciones
   * fuera de término contra esa misma fecha.
   */
  private validarNuevoVencimiento(nuevo: string, publicacion: PublicacionPliego) {
    if (nuevo <= publicacion.fechaPublicacion) {
      throw new BadRequestException(
        'El nuevo vencimiento debe ser posterior a la fecha de publicación del pliego',
      );
    }

    if (publicacion.fechaVencimiento && nuevo <= publicacion.fechaVencimiento) {
      throw new BadRequestException(
        `El nuevo vencimiento (${nuevo}) debe ser posterior al vigente (${publicacion.fechaVencimiento}): una adenda de cronograma prorroga el plazo`,
      );
    }
  }

  /** La adenda se publica el día que se publica; no en el futuro. */
  private validarFechaPublicacion(fecha: string, fechaPublicacionPliego: string) {
    const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });

    if (fecha > hoy) {
      throw new BadRequestException(
        'La fecha de publicación de la adenda no puede ser posterior a hoy',
      );
    }
    if (fecha < fechaPublicacionPliego) {
      throw new BadRequestException(
        'La adenda no puede publicarse antes que el pliego que modifica',
      );
    }
  }

  private async siguienteNumero(em: EntityManager, procesoId: string): Promise<number> {
    // Cuenta todas, incluidas las anuladas: el consecutivo de una adenda que
    // llegó a existir no se reutiliza, o dos documentos distintos acabarían
    // citándose como "adenda 2".
    const [{ maximo }] = await em.query(
      `SELECT COALESCE(MAX(numero), 0)::int AS maximo FROM hiring.adendas WHERE proceso_id = $1`,
      [procesoId],
    );
    return maximo + 1;
  }

  private publicacionVigente(procesoId: string, em?: EntityManager) {
    const manager = em ?? this.dataSource.manager;
    return manager.getRepository(PublicacionPliego).findOne({
      where: { procesoId, anuladaAt: IsNull() },
    });
  }

  /**
   * La actividad se da por cumplida cuando ninguna adenda queda sin publicar.
   *
   * Un proceso sin adendas no la necesita, así que solo se marca desde que se
   * emite la primera: antes de eso no hay nada pendiente que señalar.
   */
  private async marcarActividad(em: EntityManager, procesoId: string, acceso: HiringAccess) {
    const pendientes = await em.getRepository(Adenda).count({
      where: { procesoId, estado: 'EMITIDA' },
    });

    const estado = pendientes === 0 ? 'APROBADO' : 'BORRADOR';
    const aprobado = estado === 'APROBADO';

    const actividad = await em.getRepository(ProcesoActividad).findOne({
      where: { procesoId, numeral: NUMERAL_ADENDAS },
    });

    if (!actividad) {
      await em.save(
        em.create(ProcesoActividad, {
          procesoId,
          numeral: NUMERAL_ADENDAS,
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

  private async archivosDe(ids: string[]): Promise<Map<string, Documento>> {
    if (ids.length === 0) return new Map();

    const documentos = await this.dataSource.getRepository(Documento).find({
      where: { id: In(ids) },
    });
    return new Map(documentos.map((d) => [d.id, d]));
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
        numeral: NUMERAL_ADENDAS,
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

  private async exigirProceso(em: EntityManager, procesoId: string): Promise<Proceso> {
    const proceso = await em.getRepository(Proceso).findOne({ where: { id: procesoId } });
    if (!proceso) throw new NotFoundException('El proceso no existe');
    return proceso;
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
        entidad: 'adendas',
        accion,
        detalle,
        usuarioNombre: acceso.userName,
        usuarioId: acceso.userId,
      } as Partial<Trazabilidad>),
    );
  }
}
