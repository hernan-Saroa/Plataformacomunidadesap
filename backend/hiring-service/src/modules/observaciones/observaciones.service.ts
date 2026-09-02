import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, IsNull } from 'typeorm';

import { ObservacionPliego } from '../../entities/observacion-pliego.entity';
import { ActividadExcluida } from '../../entities/actividad.entity';
import { Proceso } from '../../entities/proceso.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { AccionTraza, Trazabilidad } from '../../entities/trazabilidad.entity';
import { Documento } from '../../entities/documento.entity';
import { Expediente } from '../../entities/expediente.entity';
import { HiringAccess } from '../../auth/hiring-access';
import { PERMISO_ACTIVIDAD_EDITAR, tienePermiso } from '../../auth/permisos';
import { PublicacionService } from '../publicacion/publicacion.service';
import {
  RegistrarObservacionDto,
  ResponderObservacionDto,
} from './dto/observacion.dto';

/** Actividad 5.3 de la matriz: las observaciones al proyecto de pliego. */
export const NUMERAL_OBSERVACIONES = '5.3';

@Injectable()
export class ObservacionesService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly publicacion: PublicacionService,
  ) {}

  /** Hoy en Bogotá, que es la zona en la que corren los términos. */
  private hoy(): string {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  }

  /** Si la modalidad del proceso pasa por la recepción de observaciones. */
  async aplicaObservaciones(modalidad: string | null, em?: EntityManager): Promise<boolean> {
    if (!modalidad) return true;
    const manager = em ?? this.dataSource.manager;
    const excluida = await manager.getRepository(ActividadExcluida).findOne({
      where: { numeral: NUMERAL_OBSERVACIONES, modalidad },
    });
    return !excluida;
  }

  // ------------------------------------------------------------- consulta --

  /**
   * Observaciones del proceso con el resumen que necesita la pantalla.
   *
   * El resumen se calcula aquí y no en el cliente porque de él depende si la
   * actividad está cumplida, y esa cuenta no debería existir en dos sitios.
   */
  async listar(procesoId: string, em?: EntityManager, acceso?: HiringAccess) {
    const manager = em ?? this.dataSource.manager;
    const proceso = await this.exigirProceso(manager, procesoId);

    const puedeGestionar = tienePermiso(acceso, PERMISO_ACTIVIDAD_EDITAR);

    if (!(await this.aplicaObservaciones(proceso.modalidad, em))) {
      return {
        aplica: false,
        publicado: false,
        observaciones: [],
        resumen: { total: 0, pendientes: 0, fueraDeTermino: 0 },
        plazoVencido: false,
        cumplida: false,
        puedeCerrarse: false,
        puedeGestionar,
      };
    }

    const publicacion = await this.publicacion.delProceso(procesoId, em);

    const observaciones = await manager.getRepository(ObservacionPliego).find({
      where: { procesoId },
      order: { fechaPresentacion: 'ASC', createdAt: 'ASC' },
    });

    const pendientes = observaciones.filter((o) => o.respondidaAt === null).length;
    const plazoVencido =
      publicacion?.fechaVencimiento !== undefined &&
      publicacion?.fechaVencimiento !== null &&
      publicacion.fechaVencimiento < this.hoy();

    const actividad = await manager.getRepository(ProcesoActividad).findOne({
      where: { procesoId, numeral: NUMERAL_OBSERVACIONES },
    });
    const cumplida = actividad?.estado === 'APROBADO';

    return {
      aplica: true,
      /** Sin pliego publicado no hay sobre qué observar. */
      publicado: publicacion !== null,
      observaciones,
      resumen: {
        total: observaciones.length,
        pendientes,
        fueraDeTermino: observaciones.filter((o) => o.fueraDeTermino).length,
      },
      plazoVencido,
      /** La actividad 5.3 ya está dada por cumplida. */
      cumplida,
      /**
       * Cerrar sin observaciones solo tiene sentido cuando ya no pueden llegar
       * más. Antes del vencimiento, que no haya ninguna no significa nada; y
       * una vez cerrada, ofrecerlo otra vez sería un botón que no hace nada.
       */
      puedeCerrarse:
        observaciones.length === 0 && plazoVencido && publicacion !== null && !cumplida,
      puedeGestionar,
    };
  }

  // ------------------------------------------------------------- registro --

  /**
   * Actividad 5.3: se registra una observación recibida.
   *
   * El soporte es opcional, a diferencia de la evidencia de la publicación: una
   * observación puede haber llegado por un canal que no deja documento, y
   * exigirlo obligaría a inventarse un archivo o a no registrarla.
   */
  async registrar(
    procesoId: string,
    dto: RegistrarObservacionDto,
    archivo: { filename: string; originalname: string; mimetype: string; size: number } | null,
    hash: string | null,
    acceso: HiringAccess,
  ) {
    return this.dataSource.transaction(async (em) => {
      const proceso = await this.exigirProceso(em, procesoId);

      if (!(await this.aplicaObservaciones(proceso.modalidad, em))) {
        throw new BadRequestException(
          'Esta modalidad no recibe observaciones al proyecto de pliego',
        );
      }

      const publicacion = await this.publicacion.delProceso(procesoId, em);
      if (!publicacion) {
        throw new ConflictException(
          'El proyecto de pliego no está publicado: no hay sobre qué observar',
        );
      }

      if (dto.fechaPresentacion > this.hoy()) {
        throw new BadRequestException(
          'La fecha de presentación no puede ser futura: se registra lo que ya se recibió',
        );
      }
      if (dto.fechaPresentacion < publicacion.fechaPublicacion) {
        throw new BadRequestException(
          `La observación no puede ser anterior a la publicación del pliego (${publicacion.fechaPublicacion})`,
        );
      }

      // Se congela al registrar: depende del vencimiento que tiene la
      // publicación hoy, y ese dato no debe cambiar después. Llegar tarde no
      // impide registrarla, solo la marca.
      const fueraDeTermino =
        publicacion.fechaVencimiento !== null &&
        dto.fechaPresentacion > publicacion.fechaVencimiento;

      const documento = archivo
        ? await this.guardarSoporte(em, procesoId, archivo, hash!, acceso)
        : null;

      const observacion = await em.save(
        em.create(ObservacionPliego, {
          procesoId,
          publicacionId: publicacion.id,
          presentadoPor: dto.presentadoPor,
          identificacion: dto.identificacion ?? null,
          fechaPresentacion: dto.fechaPresentacion,
          asunto: dto.asunto,
          contenido: dto.contenido,
          fueraDeTermino,
          documentoId: documento?.id ?? null,
          registradoPor: acceso.userName,
        }),
      );

      // Entra una observación sin responder, así que la actividad queda abierta
      // aunque antes estuviera cerrada.
      await this.marcarActividad(em, procesoId, 'BORRADOR', acceso);

      await this.traza(em, procesoId, observacion.id, 'CREAR', acceso, {
        presentadoPor: dto.presentadoPor,
        fechaPresentacion: dto.fechaPresentacion,
        fueraDeTermino,
      });

      return this.listar(procesoId, em, acceso);
    });
  }

  /** La entidad responde. Es lo que cierra la observación. */
  async responder(
    procesoId: string,
    observacionId: string,
    dto: ResponderObservacionDto,
    acceso: HiringAccess,
  ) {
    return this.dataSource.transaction(async (em) => {
      const observacion = await em.getRepository(ObservacionPliego).findOne({
        where: { id: observacionId, procesoId },
      });
      if (!observacion) throw new NotFoundException('La observación no existe en este proceso');

      if (observacion.respondidaAt) {
        throw new ConflictException(
          'La observación ya fue respondida. Su respuesta hace parte del expediente y no se reescribe.',
        );
      }

      observacion.respuesta = dto.respuesta;
      observacion.modificoPliego = dto.modificoPliego;
      observacion.respondidaPor = acceso.userName;
      observacion.respondidaAt = new Date();
      observacion.updatedAt = new Date();
      await em.save(observacion);

      await this.sincronizarActividad(em, procesoId, acceso);

      await this.traza(em, procesoId, observacion.id, 'APROBAR', acceso, {
        accion: 'RESPONDER',
        modificoPliego: dto.modificoPliego,
      });

      return this.listar(procesoId, em, acceso);
    });
  }

  /**
   * Da por cumplida la recepción cuando no llegó ninguna observación.
   *
   * Existe porque no recibir observaciones es un resultado legítimo, no un
   * pendiente eterno en el riel. Se exige que el plazo haya vencido: antes de
   * eso, que no haya ninguna no significa nada.
   */
  async cerrarSinObservaciones(procesoId: string, acceso: HiringAccess) {
    return this.dataSource.transaction(async (em) => {
      const estado = await this.listar(procesoId, em, acceso);

      if (estado.resumen.total > 0) {
        throw new ConflictException(
          'El proceso tiene observaciones registradas: se cierra respondiéndolas, no declarando que no hubo',
        );
      }
      if (!estado.publicado) {
        throw new ConflictException('El proyecto de pliego no está publicado');
      }
      if (!estado.plazoVencido) {
        throw new ConflictException(
          'El plazo de publicidad sigue corriendo: todavía pueden presentarse observaciones',
        );
      }

      await this.marcarActividad(em, procesoId, 'APROBADO', acceso);
      await this.traza(em, procesoId, procesoId, 'APROBAR', acceso, {
        accion: 'CERRAR_SIN_OBSERVACIONES',
      });

      return this.listar(procesoId, em, acceso);
    });
  }

  // ------------------------------------------------------------ auxiliares --

  /** La actividad se cumple cuando ninguna observación queda sin responder. */
  private async sincronizarActividad(
    em: EntityManager,
    procesoId: string,
    acceso: HiringAccess,
  ) {
    const pendientes = await em.getRepository(ObservacionPliego).count({
      where: { procesoId, respondidaAt: IsNull() },
    });
    await this.marcarActividad(em, procesoId, pendientes === 0 ? 'APROBADO' : 'BORRADOR', acceso);
  }

  private async guardarSoporte(
    em: EntityManager,
    procesoId: string,
    archivo: { filename: string; originalname: string; mimetype: string; size: number },
    hash: string,
    acceso: HiringAccess,
  ) {
    const expediente = await em.findOne(Expediente, { where: { procesoId } });
    if (!expediente) throw new NotFoundException('El proceso no tiene expediente abierto');

    return em.save(
      em.create(Documento, {
        expedienteId: expediente.id,
        numeral: NUMERAL_OBSERVACIONES,
        tipo: 'ADJUNTO',
        nombre: archivo.originalname,
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

  /** Crea o actualiza la actividad 5.3; no se instancia en ningún paso previo. */
  private async marcarActividad(
    em: EntityManager,
    procesoId: string,
    estado: 'BORRADOR' | 'APROBADO',
    acceso: HiringAccess,
  ) {
    const cumplida = estado === 'APROBADO';
    const revisadoPor = (cumplida ? acceso.userName : null) as any;
    const revisadoAt = (cumplida ? new Date() : null) as any;

    const actividad = await em.getRepository(ProcesoActividad).findOne({
      where: { procesoId, numeral: NUMERAL_OBSERVACIONES },
    });

    if (!actividad) {
      await em.save(
        em.create(ProcesoActividad, {
          procesoId,
          numeral: NUMERAL_OBSERVACIONES,
          estado,
          datos: {},
          revisadoPor,
          revisadoAt,
        }),
      );
      return;
    }

    actividad.estado = estado;
    actividad.revisadoPor = revisadoPor;
    actividad.revisadoAt = revisadoAt;
    await em.save(actividad);
  }

  private traza(
    em: EntityManager,
    procesoId: string,
    entidadId: string,
    accion: AccionTraza,
    acceso: HiringAccess,
    detalle?: Record<string, any>,
  ) {
    return em.save(Trazabilidad, {
      procesoId,
      entidad: 'observacion_pliego',
      entidadId,
      accion,
      detalle,
      usuarioId: acceso.userId,
      usuarioNombre: acceso.userName,
    } as Partial<Trazabilidad>);
  }
}
