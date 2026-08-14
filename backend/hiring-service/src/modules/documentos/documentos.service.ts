import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, In, IsNull } from 'typeorm';

import { DocumentoRequerido } from '../../entities/documento-requerido.entity';
import { DocumentoProceso } from '../../entities/documento-proceso.entity';
import { ActividadExcluida } from '../../entities/actividad.entity';
import { Modalidad } from '../../entities/modalidad.entity';
import { Proceso } from '../../entities/proceso.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { AccionTraza, Trazabilidad } from '../../entities/trazabilidad.entity';
import { Documento } from '../../entities/documento.entity';
import { Expediente } from '../../entities/expediente.entity';
import { HiringAccess } from '../../auth/hiring-access';
import { CdpService } from '../cdp/cdp.service';

/** Actividad 5.1 de la matriz: la elaboración de documentos del proceso. */
export const NUMERAL_DOCUMENTOS = '5.1';

/**
 * Los documentos del catálogo que una modalidad debe elaborar.
 *
 * Es la regla que separa los dos criterios de EFDS-1149: las modalidades con
 * pliego producen aviso y proyecto de pliego, y la contratación directa produce
 * el acto de justificación en su lugar. Que sea una función aparte y no un
 * `filter` dentro de la consulta permite probarla sin base de datos.
 *
 * Un requisito sin modalidades listadas aplica a todas: es la convención del
 * módulo, y evita reeditar cada fila cuando entra una modalidad nueva.
 */
export function documentosDeModalidad<T extends { modalidades: string[] }>(
  requeridos: T[],
  modalidad: string | null,
): T[] {
  return requeridos.filter(
    (req) => req.modalidades.length === 0 || (!!modalidad && req.modalidades.includes(modalidad)),
  );
}

@Injectable()
export class DocumentosService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly cdp: CdpService,
  ) {}

  // ------------------------------------------------------- aplicabilidad ---

  /**
   * Si la modalidad elabora los documentos ordinarios del proceso.
   *
   * La exclusión vive en actividades_excluidas, igual que para el resto de la
   * etapa: es la misma matriz la que decide, y duplicar la regla aquí haría que
   * cambiarla en un sitio dejara el otro mintiendo.
   */
  private async exclusion(modalidad: string | null, em?: EntityManager) {
    const manager = em ?? this.dataSource.manager;
    if (!modalidad) return null;

    return manager.getRepository(ActividadExcluida).findOne({
      where: { numeral: NUMERAL_DOCUMENTOS, modalidad },
    });
  }

  /** Los documentos del catálogo que esta modalidad debe elaborar. */
  private async requeridosDe(modalidad: string | null, em?: EntityManager) {
    const manager = em ?? this.dataSource.manager;

    const todos = await manager.getRepository(DocumentoRequerido).find({
      where: { numeral: NUMERAL_DOCUMENTOS, activo: true },
      order: { orden: 'ASC' },
    });

    return documentosDeModalidad(todos, modalidad);
  }

  // ------------------------------------------------------------- consulta --

  /**
   * Estado de la actividad: qué documentos exige la modalidad y cuáles ya están.
   *
   * Devuelve los requisitos aunque la actividad no se haya iniciado, porque
   * saber qué va a pedirse es lo que permite prepararlo. Iniciarla es un acto
   * de trazabilidad, no un permiso para consultar.
   */
  async estado(procesoId: string) {
    const proceso = await this.exigirProceso(this.dataSource.manager, procesoId);

    const excluida = await this.exclusion(proceso.modalidad);
    const modalidad = proceso.modalidad
      ? await this.dataSource
          .getRepository(Modalidad)
          .findOne({ where: { codigo: proceso.modalidad } })
      : null;

    const actividad = await this.dataSource.getRepository(ProcesoActividad).findOne({
      where: { procesoId, numeral: NUMERAL_DOCUMENTOS },
    });

    const requeridos = await this.requeridosDe(proceso.modalidad);
    const cargados = await this.dataSource.getRepository(DocumentoProceso).find({
      where: { procesoId, numeral: NUMERAL_DOCUMENTOS, anuladoAt: IsNull() },
    });

    const archivos = await this.archivosDe(cargados.map((c) => c.documentoId));

    const items = requeridos.map((req) => {
      const cargado = cargados.find((c) => c.codigo === req.codigo);
      const archivo = cargado ? archivos.get(cargado.documentoId) : undefined;

      return {
        codigo: req.codigo,
        nombre: req.nombre,
        descripcion: req.descripcion,
        obligatorio: req.obligatorio,
        cargado: cargado
          ? {
              id: cargado.id,
              nombre: archivo?.archivoNombreOriginal ?? archivo?.nombre ?? '',
              archivoUrl: archivo?.archivoUrl ?? '',
              cargadoPor: cargado.cargadoPor,
              cargadoAt: cargado.createdAt,
            }
          : null,
      };
    });

    return {
      aplica: !excluida,
      motivoNoAplica: excluida?.motivo ?? null,
      modalidad: proceso.modalidad,
      modalidadNombre: modalidad?.nombre ?? proceso.modalidad,
      iniciada: !!actividad,
      estado: actividad?.estado ?? 'PENDIENTE',
      documentos: items,
      // Misma cautela que en sincronizarActividad: una lista vacía de
      // requisitos no es una actividad completa.
      completa:
        items.some((i) => i.obligatorio) &&
        items.every((i) => !i.obligatorio || i.cargado),
    };
  }

  // --------------------------------------------------------------- carga ---

  /**
   * Registra uno de los documentos que la actividad exige.
   *
   * Inicia la actividad si hacía falta, en vez de exigir que se haya pulsado
   * "iniciar" antes: cargar el primer documento ya demuestra que la elaboración
   * empezó, y bloquearla por un paso administrativo previo no protege nada.
   */
  async cargar(
    procesoId: string,
    codigo: string,
    archivo: { filename: string; originalname: string; mimetype: string; size: number },
    hash: string,
    acceso: HiringAccess,
  ) {
    await this.dataSource.transaction(async (em) => {
      const proceso = await this.exigirProceso(em, procesoId);

      const excluida = await this.exclusion(proceso.modalidad, em);
      if (excluida) {
        throw new BadRequestException(
          `Esta modalidad no elabora los documentos ordinarios del proceso: ${excluida.motivo}`,
        );
      }

      // En contratación directa el CDP se exige antes de elaborar (RF-EST-06).
      // La misma validación que protege el "iniciar": entrar por la carga
      // directa no puede ser una forma de saltársela.
      await this.cdp.exigirCdpParaDocumentos(procesoId, em);

      const requeridos = await this.requeridosDe(proceso.modalidad, em);
      const requisito = requeridos.find((r) => r.codigo === codigo);
      if (!requisito) {
        throw new BadRequestException(
          `El documento "${codigo}" no corresponde a la modalidad ${proceso.modalidad}`,
        );
      }

      const vigente = await em.getRepository(DocumentoProceso).findOne({
        where: { procesoId, numeral: NUMERAL_DOCUMENTOS, codigo, anuladoAt: IsNull() },
      });
      if (vigente) {
        throw new ConflictException(
          `${requisito.nombre} ya está cargado. Anúlalo si necesitas sustituirlo.`,
        );
      }

      const expediente = await em.findOne(Expediente, { where: { procesoId } });
      if (!expediente) throw new NotFoundException('El proceso no tiene expediente abierto');

      const documento = await em.save(
        em.create(Documento, {
          expedienteId: expediente.id,
          numeral: NUMERAL_DOCUMENTOS,
          tipo: 'ADJUNTO',
          nombre: requisito.nombre,
          archivoUrl: `hiring/files/${archivo.filename}`,
          archivoNombreOriginal: archivo.originalname,
          archivoMimeType: archivo.mimetype,
          archivoTamano: archivo.size,
          hashSha256: hash,
          subidoPor: acceso.userName,
        } as Partial<Documento>),
      );

      await em.save(
        em.create(DocumentoProceso, {
          procesoId,
          numeral: NUMERAL_DOCUMENTOS,
          codigo,
          documentoId: documento.id,
          cargadoPor: acceso.userName,
        }),
      );

      await this.traza(em, procesoId, documento.id, 'ADJUNTAR', acceso, {
        actividad: NUMERAL_DOCUMENTOS,
        documento: codigo,
        archivo: archivo.originalname,
      });

      await this.sincronizarActividad(em, procesoId, proceso.modalidad);
    });

    // Fuera de la transacción: `estado` lee por el manager propio del
    // DataSource, que no ve lo escrito hasta el commit y devolvería la
    // actividad sin el documento que se acaba de cargar.
    return this.estado(procesoId);
  }

  /**
   * Deja sin efecto un documento cargado para poder sustituirlo.
   *
   * No lo borra: el expediente responde ante entes de control, y que hubo una
   * versión anterior es parte de lo que el expediente prueba.
   */
  async anular(procesoId: string, documentoProcesoId: string, acceso: HiringAccess) {
    await this.dataSource.transaction(async (em) => {
      const proceso = await this.exigirProceso(em, procesoId);

      const cargado = await em.getRepository(DocumentoProceso).findOne({
        where: { id: documentoProcesoId, procesoId, anuladoAt: IsNull() },
      });
      if (!cargado) {
        throw new NotFoundException('El documento no existe o ya fue sustituido');
      }

      cargado.anuladoAt = new Date();
      cargado.anuladoPor = acceso.userName;
      await em.save(cargado);

      await this.traza(em, procesoId, cargado.documentoId, 'ANULAR', acceso, {
        actividad: NUMERAL_DOCUMENTOS,
        documento: cargado.codigo,
      });

      await this.sincronizarActividad(em, procesoId, proceso.modalidad);
    });

    return this.estado(procesoId);
  }

  // ----------------------------------------------------------- auxiliares --

  /**
   * Pone la actividad en el estado que reflejan sus documentos.
   *
   * Se recalcula en cada carga y en cada anulación en vez de avanzar en un solo
   * sentido: sustituir un documento devuelve la actividad a borrador, que es la
   * verdad —le falta uno— y no un retroceso que haya que explicar.
   */
  private async sincronizarActividad(
    em: EntityManager,
    procesoId: string,
    modalidad: string | null,
  ) {
    const requeridos = await this.requeridosDe(modalidad, em);
    const cargados = await em.getRepository(DocumentoProceso).find({
      where: { procesoId, numeral: NUMERAL_DOCUMENTOS, anuladoAt: IsNull() },
    });

    const obligatorios = requeridos.filter((r) => r.obligatorio);

    // Sin un solo requisito la actividad NO está completa. `every` sobre una
    // lista vacía devuelve true, así que un proceso cuya modalidad no esté en
    // el catálogo —o que aún no la tenga— se daría por aprobado sin haber
    // cargado nada, y con el nombre de quien pasó por ahí como revisor.
    const completa =
      obligatorios.length > 0 &&
      obligatorios.every((r) => cargados.some((c) => c.codigo === r.codigo));

    const estado = completa ? 'APROBADO' : 'BORRADOR';

    const actividad = await em.getRepository(ProcesoActividad).findOne({
      where: { procesoId, numeral: NUMERAL_DOCUMENTOS },
    });

    // No se toca revisadoPor: cargar el último documento no es revisarlo, y
    // firmar el expediente con el nombre de quien solo adjuntó atribuiría una
    // revisión que nadie hizo. La actividad queda completa; quién la aprueba
    // es el acto de revisión, que vive en su propio flujo.
    if (!actividad) {
      await em.save(
        em.create(ProcesoActividad, {
          procesoId,
          numeral: NUMERAL_DOCUMENTOS,
          estado: estado as any,
          datos: {},
        }),
      );
      return;
    }

    actividad.estado = estado as any;
    await em.save(actividad);
  }

  /** Los archivos de hiring.documentos, indexados para no consultarlos en bucle. */
  private async archivosDe(ids: string[]): Promise<Map<string, Documento>> {
    if (ids.length === 0) return new Map();

    const documentos = await this.dataSource.getRepository(Documento).find({
      where: { id: In(ids) },
    });
    return new Map(documentos.map((d) => [d.id, d]));
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
        entidad: 'documentos_proceso',
        accion,
        detalle,
        usuarioNombre: acceso.userName,
        usuarioId: acceso.userId,
      } as Partial<Trazabilidad>),
    );
  }
}
