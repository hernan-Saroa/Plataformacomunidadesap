import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, In, IsNull } from 'typeorm';

import { DocumentoRequerido } from '../../entities/documento-requerido.entity';
import { DocumentoProceso } from '../../entities/documento-proceso.entity';
import { Documento } from '../../entities/documento.entity';
import { Modalidad } from '../../entities/modalidad.entity';
import { Proceso } from '../../entities/proceso.entity';
import { NUMERAL_ESTUDIO_PREVIO } from '../../entities/proceso-actividad.entity';
import { AccionTraza, Trazabilidad } from '../../entities/trazabilidad.entity';
import { HiringAccess } from '../../auth/hiring-access';
import { documentosDeModalidad } from '../documentos/documentos.service';
import { exigirExpedienteAbierto } from '../archivo-expediente/expediente-archivado';

/**
 * La lista de chequeo con la que el área radica en la Dirección de
 * Contratación.
 *
 * El procedimiento dice que se remiten «los documentos previstos en la lista
 * de chequeo que resulten aplicables, según la modalidad de contratación». Se
 * pide en la 3.1 y no en la 3.3 porque desde EFDS-1183 la 3.3 la cumple quien
 * **recibe** —tomar el proceso de la bandeja—, y lo que el área hace es enviar
 * el estudio previo: ese envío es lo que hace aparecer el proceso en la
 * bandeja, así que es el acto de radicar.
 *
 * Reusa las dos tablas de EFDS-1149 en vez de estrenar unas propias:
 * `documentos_requeridos` ya sabe decir qué pide una actividad y a qué
 * modalidades, y `documentos_proceso` ya sabe qué requisito cubre cada
 * archivo. Lo que cambia es el numeral.
 */
export const NUMERAL_RADICACION = NUMERAL_ESTUDIO_PREVIO;

/** Un requisito de la lista, con lo poco que hace falta para decidir. */
export interface RequisitoDeLaLista {
  codigo: string;
  obligatorio: boolean;
}

/**
 * Qué falta del paquete para poder radicar.
 *
 * Función aparte y exportada porque es la regla, no la consulta: de ella
 * depende que un proceso entre a la Dirección con lo que el procedimiento
 * exige, y tiene que poder fijarse sin una base de datos delante.
 *
 * Una lista vacía no bloquea, al revés que en la 5.1. Allí `completa` exige al
 * menos un requisito porque la actividad **se cumple** cargando documentos, y
 * darla por terminada sin ninguno la aprobaría sola. Aquí la lista es un
 * candado añadido sobre un envío que ya valida sus campos y su estudio previo:
 * si la Dirección desactiva todas las filas, lo que quiere es dejar de exigir
 * el paquete, no trabar la radicación para siempre.
 */
export function loQueFaltaParaRadicar<T extends RequisitoDeLaLista>(
  requeridos: T[],
  entregados: string[],
): T[] {
  const hay = new Set(entregados);
  return requeridos.filter((r) => r.obligatorio && !hay.has(r.codigo));
}

@Injectable()
export class ListaChequeoService {
  constructor(private readonly dataSource: DataSource) {}

  // -------------------------------------------------------------- catálogo --

  /** Los documentos que esta modalidad debe remitir al radicar. */
  private async requeridosDe(modalidad: string | null, em?: EntityManager) {
    const manager = em ?? this.dataSource.manager;

    const todos = await manager.getRepository(DocumentoRequerido).find({
      where: { numeral: NUMERAL_RADICACION, activo: true },
      order: { orden: 'ASC' },
    });

    return documentosDeModalidad(todos, modalidad);
  }

  /** Lo entregado y vigente; lo sustituido queda fuera por `anuladoAt`. */
  private entregadosDe(procesoId: string, em?: EntityManager) {
    const manager = em ?? this.dataSource.manager;

    return manager.getRepository(DocumentoProceso).find({
      where: { procesoId, numeral: NUMERAL_RADICACION, anuladoAt: IsNull() },
    });
  }

  /**
   * Lo que falta para radicar, para el candado del envío.
   *
   * Lo consulta `EstudioPrevioService.enviar()` dentro de su transacción, así
   * que recibe el manager: preguntarlo por el del DataSource no vería lo que
   * esa misma transacción acaba de escribir.
   */
  async pendientes(
    procesoId: string,
    modalidad: string | null,
    em?: EntityManager,
  ): Promise<DocumentoRequerido[]> {
    const requeridos = await this.requeridosDe(modalidad, em);
    const entregados = await this.entregadosDe(procesoId, em);

    return loQueFaltaParaRadicar(
      requeridos,
      entregados.map((e) => e.codigo),
    );
  }

  // -------------------------------------------------------------- consulta --

  /**
   * La lista con su estado, se haya enviado o no.
   *
   * Responde aunque el estudio previo esté a medias: saber qué va a pedirse es
   * lo que permite ir armando el paquete, y es justo lo que hoy no se sabe
   * hasta que el envío lo rechaza.
   */
  async estado(procesoId: string) {
    const proceso = await this.exigirProceso(this.dataSource.manager, procesoId);

    const modalidad = proceso.modalidad
      ? await this.dataSource
          .getRepository(Modalidad)
          .findOne({ where: { codigo: proceso.modalidad } })
      : null;

    const requeridos = await this.requeridosDe(proceso.modalidad);
    const entregados = await this.entregadosDe(procesoId);
    const archivos = await this.archivosDe(entregados.map((e) => e.documentoId));

    const documentos = requeridos.map((req) => {
      const entregado = entregados.find((e) => e.codigo === req.codigo);
      const archivo = entregado ? archivos.get(entregado.documentoId) : undefined;

      return {
        codigo: req.codigo,
        nombre: req.nombre,
        descripcion: req.descripcion,
        obligatorio: req.obligatorio,
        /**
         * Si el requisito es cita del formato oficial o lectura del equipo.
         * Viaja hasta la pantalla a propósito: a quien se le exige un
         * documento le corresponde saber si se lo exige el formato de la ESAP
         * o la interpretación de quien construyó esto.
         */
        confirmado: req.confirmado,
        cargado: entregado
          ? {
              id: entregado.id,
              nombre: archivo?.archivoNombreOriginal ?? archivo?.nombre ?? '',
              archivoUrl: archivo?.archivoUrl ?? '',
              cargadoPor: entregado.cargadoPor,
              cargadoAt: entregado.createdAt,
            }
          : null,
      };
    });

    return {
      modalidad: proceso.modalidad,
      modalidadNombre: modalidad?.nombre ?? proceso.modalidad,
      documentos,
      faltantes: loQueFaltaParaRadicar(
        requeridos,
        entregados.map((e) => e.codigo),
      ).map((r) => ({ codigo: r.codigo, nombre: r.nombre })),
    };
  }

  // ----------------------------------------------------------------- carga --

  /**
   * Registra uno de los documentos de la lista.
   *
   * Quién puede hacerlo lo comprueba antes `EstudioPrevioService`: el paquete
   * lo arma el área que radicó el proceso, y es la misma regla que protege el
   * borrador y el envío. Aquí solo se valida que el documento pertenezca a la
   * lista de esta modalidad.
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

      const requeridos = await this.requeridosDe(proceso.modalidad, em);
      const requisito = requeridos.find((r) => r.codigo === codigo);
      if (!requisito) {
        throw new BadRequestException(
          `El documento "${codigo}" no está en la lista de chequeo de esta modalidad`,
        );
      }

      const vigente = await em.getRepository(DocumentoProceso).findOne({
        where: { procesoId, numeral: NUMERAL_RADICACION, codigo, anuladoAt: IsNull() },
      });
      if (vigente) {
        throw new ConflictException(
          `${requisito.nombre} ya está cargado. Sustitúyelo si necesitas cambiarlo.`,
        );
      }

      const expediente = await exigirExpedienteAbierto(em, procesoId);
      if (!expediente) throw new NotFoundException('El proceso no tiene expediente abierto');

      const documento = await em.save(
        em.create(Documento, {
          expedienteId: expediente.id,
          numeral: NUMERAL_RADICACION,
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
          numeral: NUMERAL_RADICACION,
          codigo,
          documentoId: documento.id,
          cargadoPor: acceso.userName,
        }),
      );

      await this.traza(em, procesoId, documento.id, 'ADJUNTAR', acceso, {
        actividad: NUMERAL_RADICACION,
        documento: codigo,
        archivo: archivo.originalname,
      });
    });

    // Fuera de la transacción, como en la 5.1: `estado` lee por el manager del
    // DataSource y no vería lo que acaba de escribirse.
    return this.estado(procesoId);
  }

  /**
   * Deja sin efecto uno de los documentos para poder sustituirlo.
   *
   * No lo borra, con el criterio del resto del módulo: el expediente responde
   * ante entes de control, y que hubo una versión anterior es parte de lo que
   * prueba.
   */
  async anular(procesoId: string, documentoProcesoId: string, acceso: HiringAccess) {
    await this.dataSource.transaction(async (em) => {
      await this.exigirProceso(em, procesoId);
      await exigirExpedienteAbierto(em, procesoId);

      const entregado = await em.getRepository(DocumentoProceso).findOne({
        where: {
          id: documentoProcesoId,
          procesoId,
          numeral: NUMERAL_RADICACION,
          anuladoAt: IsNull(),
        },
      });
      if (!entregado) {
        throw new NotFoundException('El documento no existe o ya fue sustituido');
      }

      entregado.anuladoAt = new Date();
      entregado.anuladoPor = acceso.userName;
      await em.save(entregado);

      await this.traza(em, procesoId, entregado.documentoId, 'ANULAR', acceso, {
        actividad: NUMERAL_RADICACION,
        documento: entregado.codigo,
      });
    });

    return this.estado(procesoId);
  }

  // ------------------------------------------------------------ auxiliares --

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
