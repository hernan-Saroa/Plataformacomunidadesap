import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';

import { ActividadExcluida } from '../../entities/actividad.entity';
import { Proceso } from '../../entities/proceso.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { Documento } from '../../entities/documento.entity';
import { Expediente } from '../../entities/expediente.entity';
import { RecepcionOfertas } from '../../entities/recepcion-ofertas.entity';
import { Oferente } from '../../entities/oferente.entity';
import { InformeEvaluacion } from '../../entities/informe-evaluacion.entity';
import { AccionTraza, Trazabilidad } from '../../entities/trazabilidad.entity';
import { HiringAccess } from '../../auth/hiring-access';

/** Numerales de la etapa 7, tal como los numera la matriz oficial. */
export const NUMERAL_AUDIENCIA = '7.1';
export const NUMERAL_SOBRE_ECONOMICO = '7.2';
export const NUMERAL_INFORME_DEFINITIVO = '7.3';
export const NUMERAL_ACTO = '7.4';

export interface ArchivoCargado {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
  path: string;
}

/**
 * Lo que comparten las tres actividades de la adjudicación.
 *
 * Base propia del módulo y no herencia del traslado: aquel servicio carga las
 * reglas de la 6.4, y una audiencia no es un traslado. Lo que sí se repite —el
 * proceso, el expediente, los documentos, la traza y el riel— vive aquí una
 * sola vez.
 */
@Injectable()
export class AdjudicacionBase {
  constructor(protected readonly dataSource: DataSource) {}

  protected async exigirProceso(em: EntityManager, procesoId: string): Promise<Proceso> {
    const proceso = await em.getRepository(Proceso).findOne({ where: { id: procesoId } });
    if (!proceso) throw new NotFoundException('El proceso no existe');
    return proceso;
  }

  protected excluida(em: EntityManager, proceso: Proceso, numeral: string) {
    return em.getRepository(ActividadExcluida).findOne({
      where: { numeral, modalidad: proceso.modalidad ?? '' },
    });
  }

  protected async exigirQueAplique(em: EntityManager, proceso: Proceso, numeral: string) {
    const excluida = await this.excluida(em, proceso, numeral);
    if (excluida) {
      throw new BadRequestException(
        `Esta modalidad no adelanta la actividad ${numeral}: ${excluida.motivo}`,
      );
    }
  }

  /**
   * El traslado tiene que estar cerrado antes de adjudicar.
   *
   * Es la cadena de la etapa 6: mientras el término corra o queden escritos sin
   * responder, la evaluación todavía se puede mover, y adjudicar sobre algo que
   * se puede mover es lo que el debido proceso quiere evitar. El mensaje dice
   * cuál de las dos cosas falta, en vez de un "no se puede" seco.
   */
  protected async exigirTrasladoCerrado(
    em: EntityManager,
    procesoId: string,
  ): Promise<InformeEvaluacion> {
    const informes = await em
      .getRepository(InformeEvaluacion)
      .find({ where: { procesoId }, order: { numero: 'DESC' } });
    const informe = informes.find((i) => i.estado !== 'ANULADO');

    if (!informe) {
      throw new BadRequestException(
        'El proceso no tiene informe de evaluación: la adjudicación va después del traslado (6.4)',
      );
    }
    if (informe.estado === 'BORRADOR') {
      throw new BadRequestException(
        'El informe de evaluación todavía no se ha trasladado: los oferentes no han podido reclamar',
      );
    }
    if (informe.estado !== 'CERRADO') {
      throw new BadRequestException(
        'El traslado del informe sigue abierto: ciérralo antes de adjudicar (6.6)',
      );
    }

    return informe;
  }

  /** Las ofertas que el proceso recibió, por número. */
  protected async ofertasDe(em: EntityManager, procesoId: string): Promise<Oferente[]> {
    const recepcion = await em.getRepository(RecepcionOfertas).findOne({ where: { procesoId } });
    if (!recepcion) return [];

    return em
      .getRepository(Oferente)
      .find({ where: { recepcionId: recepcion.id }, order: { numero: 'ASC' } });
  }

  protected async documentosDe(ids: (string | null)[]): Promise<Map<string, Documento>> {
    const unicos = [...new Set(ids.filter((id): id is string => !!id))];
    if (unicos.length === 0) return new Map();

    const documentos = await this.dataSource
      .getRepository(Documento)
      .find({ where: { id: In(unicos) } });

    return new Map(documentos.map((d) => [d.id, d]));
  }

  protected async guardarDocumento(
    em: EntityManager,
    procesoId: string,
    numeral: string,
    nombre: string,
    archivo: ArchivoCargado,
    hash: string,
    acceso: HiringAccess,
  ) {
    const expediente = await em.findOne(Expediente, { where: { procesoId } });
    if (!expediente) throw new NotFoundException('El proceso no tiene expediente abierto');

    return em.save(
      em.create(Documento, {
        expedienteId: expediente.id,
        numeral,
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

  /** Crea o actualiza la fila del riel para un numeral de la etapa 7. */
  protected async marcarActividad(
    em: EntityManager,
    procesoId: string,
    numeral: string,
    cumplida: boolean,
    acceso: HiringAccess,
  ) {
    const estado = cumplida ? 'APROBADO' : 'BORRADOR';
    const actividad = await em
      .getRepository(ProcesoActividad)
      .findOne({ where: { procesoId, numeral } });

    if (!actividad) {
      await em.save(
        em.create(ProcesoActividad, {
          procesoId,
          numeral,
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

  protected traza(
    em: EntityManager,
    procesoId: string,
    entidadId: string,
    entidad: string,
    accion: AccionTraza,
    acceso: HiringAccess,
    detalle: Record<string, unknown>,
  ) {
    return em.save(
      em.create(Trazabilidad, {
        procesoId,
        entidadId,
        entidad,
        accion,
        detalle,
        usuarioNombre: acceso.userName,
        usuarioId: acceso.userId,
      } as Partial<Trazabilidad>),
    );
  }
}
