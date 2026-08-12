import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, In, IsNull } from 'typeorm';

import {
  AudienciaRiesgos,
  AudienciaRiesgosConfig,
} from '../../entities/audiencia-riesgos.entity';
import { ActividadExcluida } from '../../entities/actividad.entity';
import { Modalidad } from '../../entities/modalidad.entity';
import { Proceso } from '../../entities/proceso.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { AccionTraza, Trazabilidad } from '../../entities/trazabilidad.entity';
import { Documento } from '../../entities/documento.entity';
import { Expediente } from '../../entities/expediente.entity';
import { HiringAccess } from '../../auth/hiring-access';
import { AnularAudienciaDto, RegistrarAudienciaDto } from './dto/riesgos.dto';

/** Actividad 5.5 de la matriz: la audiencia de asignación de riesgos. */
export const NUMERAL_AUDIENCIA = '5.5';

interface ArchivoCargado {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
}

@Injectable()
export class RiesgosService {
  constructor(private readonly dataSource: DataSource) {}

  // ------------------------------------------------------- aplicabilidad ---

  /**
   * Si la modalidad exige la audiencia, y si además es obligatoria.
   *
   * Son dos preguntas distintas: donde aplica sin ser obligatoria la audiencia
   * puede celebrarse y registrarse, pero no impide abrir el proceso. Meterlas
   * en un solo booleano obligaría a elegir entre ocultar la actividad o
   * bloquear procesos que la ley no bloquea.
   */
  async aplicabilidad(modalidad: string | null, em?: EntityManager) {
    const manager = em ?? this.dataSource.manager;

    const excluida = modalidad
      ? await manager.getRepository(ActividadExcluida).findOne({
          where: { numeral: NUMERAL_AUDIENCIA, modalidad },
        })
      : null;

    const config = modalidad
      ? await manager.getRepository(AudienciaRiesgosConfig).findOne({ where: { modalidad } })
      : null;

    return {
      aplica: !excluida,
      motivoNoAplica: excluida?.motivo ?? null,
      obligatoria: !excluida && !!config?.obligatoria,
      fundamento: config?.fundamento ?? null,
      // Que la regla no esté ratificada por Contratación no impide trabajar,
      // pero el gestor tiene que saber sobre qué se le está bloqueando.
      confirmado: config?.confirmado ?? false,
    };
  }

  /** La audiencia vigente del proceso, si se celebró y no se anuló. */
  private vigente(procesoId: string, em?: EntityManager) {
    const manager = em ?? this.dataSource.manager;
    return manager.getRepository(AudienciaRiesgos).findOne({
      where: { procesoId, anuladaAt: IsNull() },
    });
  }

  /**
   * Si la audiencia obligatoria está pendiente, y por qué.
   *
   * Lo consume la apertura del proceso (EFDS-1402): el segundo criterio de la
   * historia dice que sin la audiencia obligatoria no se puede avanzar, y
   * avanzar en la etapa 5 es abrir.
   */
  async requisitoParaApertura(procesoId: string, em?: EntityManager) {
    const manager = em ?? this.dataSource.manager;
    const proceso = await this.exigirProceso(manager, procesoId);

    const { obligatoria, confirmado } = await this.aplicabilidad(proceso.modalidad, em);
    if (!obligatoria) return { cumplido: true, motivo: null };

    const audiencia = await this.vigente(procesoId, em);
    if (audiencia) return { cumplido: true, motivo: null };

    return {
      cumplido: false,
      motivo: confirmado
        ? 'La audiencia de asignación de riesgos es obligatoria en esta modalidad y no se ha celebrado'
        : 'La audiencia de asignación de riesgos figura como obligatoria en esta modalidad, pendiente de confirmar con Contratación, y no se ha celebrado',
    };
  }

  // ------------------------------------------------------------- consulta --

  async estado(procesoId: string) {
    const proceso = await this.exigirProceso(this.dataSource.manager, procesoId);

    const aplicabilidad = await this.aplicabilidad(proceso.modalidad);
    const modalidad = proceso.modalidad
      ? await this.dataSource
          .getRepository(Modalidad)
          .findOne({ where: { codigo: proceso.modalidad } })
      : null;

    const audiencia = await this.vigente(procesoId);
    const archivos = audiencia
      ? await this.dataSource.getRepository(Documento).find({
          where: { id: In([audiencia.actaDocumentoId, audiencia.matrizDocumentoId]) },
        })
      : [];

    const archivo = (id: string) => {
      const doc = archivos.find((d) => d.id === id);
      return doc ? { nombre: doc.archivoNombreOriginal ?? doc.nombre, url: doc.archivoUrl } : null;
    };

    return {
      ...aplicabilidad,
      modalidad: proceso.modalidad,
      modalidadNombre: modalidad?.nombre ?? proceso.modalidad,
      celebrada: !!audiencia,
      audiencia: audiencia
        ? {
            id: audiencia.id,
            fechaCelebracion: audiencia.fechaCelebracion,
            observaciones: audiencia.observaciones,
            registradoPor: audiencia.registradoPor,
            registradoAt: audiencia.createdAt,
            acta: archivo(audiencia.actaDocumentoId),
            matriz: archivo(audiencia.matrizDocumentoId),
          }
        : null,
    };
  }

  // -------------------------------------------------------------- registro -

  /**
   * Registra la audiencia celebrada con su acta y su matriz consolidada.
   *
   * Los dos documentos entran juntos porque el criterio de la historia es uno
   * solo: la audiencia se exige *y* su resultado se consolida. Un acta sin
   * matriz dejaría la actividad a medias sin que nada lo señalara.
   */
  async registrar(
    procesoId: string,
    dto: RegistrarAudienciaDto,
    acta: ArchivoCargado,
    hashActa: string,
    matriz: ArchivoCargado,
    hashMatriz: string,
    acceso: HiringAccess,
  ) {
    await this.dataSource.transaction(async (em) => {
      const proceso = await this.exigirProceso(em, procesoId);

      const { aplica, motivoNoAplica } = await this.aplicabilidad(proceso.modalidad, em);
      if (!aplica) {
        throw new BadRequestException(
          `Esta modalidad no adelanta audiencia de asignación de riesgos: ${motivoNoAplica}`,
        );
      }

      if (await this.vigente(procesoId, em)) {
        throw new ConflictException(
          'El proceso ya tiene una audiencia registrada. Anúlala si necesitas corregirla.',
        );
      }

      this.validarFecha(dto.fechaCelebracion);

      const expediente = await em.findOne(Expediente, { where: { procesoId } });
      if (!expediente) throw new NotFoundException('El proceso no tiene expediente abierto');

      const documentoActa = await this.guardarDocumento(
        em,
        expediente.id,
        'Acta de la audiencia de riesgos',
        acta,
        hashActa,
        acceso,
      );
      const documentoMatriz = await this.guardarDocumento(
        em,
        expediente.id,
        'Matriz de riesgos consolidada',
        matriz,
        hashMatriz,
        acceso,
      );

      const audiencia = await em.save(
        em.create(AudienciaRiesgos, {
          procesoId,
          fechaCelebracion: dto.fechaCelebracion,
          actaDocumentoId: documentoActa.id,
          matrizDocumentoId: documentoMatriz.id,
          observaciones: dto.observaciones ?? null,
          registradoPor: acceso.userName,
        }),
      );

      // La actividad se cierra de una: el registro ya trae el acta y la matriz,
      // que es todo lo que la actividad exige.
      await this.marcarActividad(em, procesoId, 'APROBADO', acceso);

      await this.traza(em, procesoId, audiencia.id, 'APROBAR', acceso, {
        actividad: NUMERAL_AUDIENCIA,
        fechaCelebracion: dto.fechaCelebracion,
        acta: acta.originalname,
        matriz: matriz.originalname,
      });
    });

    return this.estado(procesoId);
  }

  /**
   * Anula la audiencia registrada para poder corregirla.
   *
   * En una modalidad donde es obligatoria, esto vuelve a bloquear la apertura:
   * es la consecuencia correcta, porque mientras no haya audiencia vigente el
   * requisito no está cumplido.
   */
  async anular(procesoId: string, dto: AnularAudienciaDto, acceso: HiringAccess) {
    await this.dataSource.transaction(async (em) => {
      const audiencia = await this.vigente(procesoId, em);
      if (!audiencia) {
        throw new NotFoundException('El proceso no tiene una audiencia registrada');
      }

      audiencia.anuladaAt = new Date();
      audiencia.anuladaPor = acceso.userName;
      audiencia.motivoAnulacion = dto.motivo;
      await em.save(audiencia);

      await this.marcarActividad(em, procesoId, 'BORRADOR', acceso);

      await this.traza(em, procesoId, audiencia.id, 'ANULAR', acceso, {
        actividad: NUMERAL_AUDIENCIA,
        motivo: dto.motivo,
      });
    });

    return this.estado(procesoId);
  }

  // ----------------------------------------------------------- auxiliares --

  /**
   * La audiencia no puede ser del futuro: se registra un hecho ya ocurrido.
   *
   * Sin esto, una fecha adelantada permitiría abrir el proceso apoyándose en
   * una audiencia que todavía no se celebró.
   */
  private validarFecha(fecha: string) {
    const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });

    if (fecha > hoy) {
      throw new BadRequestException(
        'La fecha de la audiencia no puede ser posterior a hoy: se registra una audiencia ya celebrada',
      );
    }
  }

  private async marcarActividad(
    em: EntityManager,
    procesoId: string,
    estado: 'APROBADO' | 'BORRADOR',
    acceso: HiringAccess,
  ) {
    const actividad = await em.getRepository(ProcesoActividad).findOne({
      where: { procesoId, numeral: NUMERAL_AUDIENCIA },
    });

    const aprobado = estado === 'APROBADO';

    if (!actividad) {
      await em.save(
        em.create(ProcesoActividad, {
          procesoId,
          numeral: NUMERAL_AUDIENCIA,
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
        numeral: NUMERAL_AUDIENCIA,
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
        entidad: 'audiencias_riesgos',
        accion,
        detalle,
        usuarioNombre: acceso.userName,
        usuarioId: acceso.userId,
      } as Partial<Trazabilidad>),
    );
  }
}
