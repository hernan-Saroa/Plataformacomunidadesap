import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';

import { HiringAccess } from '../../auth/hiring-access';
import { Documento } from '../../entities/documento.entity';
import { Expediente } from '../../entities/expediente.entity';
import { Plantilla } from '../../entities/plantilla.entity';
import { Proceso } from '../../entities/proceso.entity';
import { AccionTraza, Trazabilidad } from '../../entities/trazabilidad.entity';
import { PermisosService } from '../../auth/permisos.service';
import { access } from 'fs/promises';
import { basename, join } from 'path';
import { STORAGE_PATH } from '../archivos';

/** Un documento que la actividad pide, con lo que se haya entregado de él. */
export interface DocumentoDeLaActividad {
  plantillaId: string;
  codigo: string;
  nombre: string;
  version: string;
  /** Ruta del formato en blanco; null mientras Contratación no lo suba. */
  formatoUrl: string | null;
  cargado: {
    id: string;
    nombre: string;
    descargaUrl: string | null;
    subidoPor: string | null;
    cargadoAt: string;
  } | null;
}

/** El permiso con el que se cargan y retiran documentos del módulo. */
const PERMISO_CARGAR = 'contratacion.documento.upload';

/**
 * Los documentos que una actividad entrega, según sus formatos (EFDS-1183).
 *
 * Asignarle un formato a una actividad es decir que ahí se entrega ese
 * documento, así que cada formato aplicable es una fila que hay que resolver.
 * Lo que se sube sin formato detrás se guarda igual pero no cuenta como
 * requisito: la diferencia la marca `plantilla_id`, y sin ella solo se podría
 * decir «falta un adjunto» en lugar de «falta el BS-FO-047».
 */
@Injectable()
export class DocumentosActividadService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly permisos: PermisosService,
  ) {}

  /**
   * Qué pide la actividad y qué se ha entregado ya.
   *
   * Responde aunque no haya formatos asignados: la lista vacía es la respuesta
   * correcta para las actividades que no exigen ningún documento, y obliga a
   * la pantalla a distinguirlo de un fallo.
   */
  async estado(procesoId: string, numeral: string, acceso?: HiringAccess) {
    const em = this.dataSource.manager;

    const proceso = await em.getRepository(Proceso).findOne({ where: { id: procesoId } });
    if (!proceso) throw new NotFoundException('El proceso no existe');

    const formatos = await em.getRepository(Plantilla).find({
      where: { numeral, activo: true },
      order: { codigo: 'ASC' },
    });

    // Alcance vacío significa todas; si el formato declara modalidades, la de
    // este proceso tiene que estar. Sin filtrar, configurando una mínima
    // cuantía se pedirían los formatos que solo existen para licitación.
    const aplicables = formatos.filter(
      (f) =>
        f.modalidades.length === 0 ||
        (proceso.modalidad !== null && f.modalidades.includes(proceso.modalidad)),
    );

    const expediente = await em.getRepository(Expediente).findOne({ where: { procesoId } });
    const documentos = expediente
      ? await em.getRepository(Documento).find({
          where: { expedienteId: expediente.id, numeral, tipo: 'ADJUNTO' },
          order: { createdAt: 'DESC' },
        })
      : [];

    const requeridos: DocumentoDeLaActividad[] = await Promise.all(
      aplicables.map(async (f) => {
        // El más reciente de ese formato: al sustituir uno se guarda otro, y
        // lo que la fila debe mostrar es lo que vale ahora.
        const cargado = documentos.find((d) => d.plantillaId === f.id);
        return {
          plantillaId: f.id,
          codigo: f.codigo,
          nombre: f.nombre,
          version: f.version,
          // Solo si el archivo está de verdad en disco. Un enlace que devuelve
          // 404 es peor que no ofrecerlo: el gestor no sabe si falló la red,
          // si perdió el permiso o si el formato no existe.
          formatoUrl: (await this.archivoExiste(f.archivoUrl)) ? f.archivoUrl : null,
          cargado: cargado
            ? {
                id: cargado.id,
                nombre: cargado.archivoNombreOriginal ?? cargado.nombre,
                descargaUrl: cargado.archivoUrl ?? null,
                subidoPor: cargado.subidoPor ?? null,
                cargadoAt: cargado.createdAt.toISOString(),
              }
            : null,
        };
      }),
    );

    // Lo que se subió sin formato detrás. Se lista aparte y no se pierde: son
    // anexos legítimos, pero no son lo que la actividad exige.
    const adicionales = documentos
      .filter((d) => !d.plantillaId)
      .map((d) => ({
        id: d.id,
        nombre: d.archivoNombreOriginal ?? d.nombre,
        descargaUrl: d.archivoUrl ?? null,
        subidoPor: d.subidoPor ?? null,
        cargadoAt: d.createdAt.toISOString(),
      }));

    return {
      numeral,
      modalidad: proceso.modalidad,
      requeridos,
      adicionales,
      /** Si falta algún documento exigido por un formato. */
      completo: requeridos.every((r) => r.cargado !== null),
      /*
       * Si quien mira puede cargar y retirar.
       *
       * Lo resuelve el servidor y no la pantalla: ofrecerle «Cargar documento»
       * a quien solo aprueba es ofrecerle un botón que el servicio va a
       * rechazarle con un 403, y el gestor no sabría por qué no pasa nada.
       */
      puedeCargar: acceso ? await this.puedeCargar(acceso) : true,
    };
  }

  /**
   * Si el archivo del formato está en disco.
   *
   * La ruta guardada y el archivo pueden separarse: una restauración de base
   * sin los adjuntos, un despliegue con volumen nuevo, o un borrado a mano.
   * Ofrecer entonces «Descargar el formato en blanco» lleva a un 404 crudo, y
   * el gestor no puede distinguirlo de un fallo de la plataforma.
   */
  private async archivoExiste(url: string | null | undefined): Promise<boolean> {
    if (!url) return false;

    // Solo el nombre: la ruta pública es `/files/<archivo>` y el disco es
    // STORAGE_PATH. Quedarse con el basename evita que una ruta manipulada
    // salga del directorio.
    const nombre = basename(url);
    try {
      await access(join(STORAGE_PATH, nombre));
      return true;
    } catch {
      return false;
    }
  }

  /** Si el usuario tiene el permiso de cargar documentos del módulo. */
  private async puedeCargar(acceso: HiringAccess): Promise<boolean> {
    if (acceso.roles?.includes('SUPER_ADMIN')) return true;

    const permisos = await this.permisos.permisosDeRoles(acceso.roles ?? []);
    return permisos.includes(PERMISO_CARGAR);
  }

  /**
   * Guarda un documento de la actividad.
   *
   * `plantillaId` opcional: con él, el documento queda atado al formato que lo
   * exigía; sin él, es un anexo adicional. Es la misma carga en los dos casos
   * —lo que cambia es si cumple un requisito o no.
   */
  async cargar(
    procesoId: string,
    numeral: string,
    plantillaId: string | undefined,
    archivo: { filename: string; originalname: string; mimetype: string; size: number },
    hash: string,
    acceso: HiringAccess,
  ) {
    return this.dataSource.transaction(async (em) => {
      const proceso = await em.getRepository(Proceso).findOne({ where: { id: procesoId } });
      if (!proceso) throw new NotFoundException('El proceso no existe');

      let plantilla: Plantilla | null = null;
      if (plantillaId) {
        plantilla = await em.getRepository(Plantilla).findOne({ where: { id: plantillaId } });
        if (!plantilla) throw new NotFoundException('El formato indicado no existe');

        // Cargar el formato de otra actividad dejaría el requisito de esta sin
        // cumplir y el de la otra cumplido desde el sitio equivocado.
        if (plantilla.numeral !== numeral) {
          throw new BadRequestException(
            `El formato ${plantilla.codigo} pertenece a la actividad ${plantilla.numeral}, no a la ${numeral}`,
          );
        }
      }

      const expediente = await em.getRepository(Expediente).findOne({ where: { procesoId } });
      if (!expediente) {
        throw new NotFoundException('El proceso no tiene expediente abierto');
      }

      // Un mismo formato no se entrega dos veces: para reemplazarlo hay que
      // anular el anterior, y así el expediente conserva por qué cambió.
      if (plantilla) {
        const yaHay = await em.getRepository(Documento).findOne({
          where: { expedienteId: expediente.id, numeral, plantillaId: plantilla.id },
        });
        if (yaHay) {
          throw new ConflictException(
            `El documento del formato ${plantilla.codigo} ya está cargado. Sustitúyelo si necesitas cambiarlo.`,
          );
        }
      }

      const documento = await em.save(
        em.create(Documento, {
          expedienteId: expediente.id,
          numeral,
          tipo: 'ADJUNTO',
          nombre: plantilla?.nombre ?? archivo.originalname,
          archivoUrl: `/archivos/${archivo.filename}`,
          archivoNombreOriginal: archivo.originalname,
          archivoMimeType: archivo.mimetype,
          archivoTamano: archivo.size,
          hashSha256: hash,
          plantillaId: plantilla?.id ?? null,
          subidoPor: acceso.userName,
        } as Partial<Documento>),
      );

      await this.traza(em, procesoId, documento.id, 'ADJUNTAR', acceso, {
        numeral,
        formato: plantilla?.codigo ?? null,
        archivo: archivo.originalname,
      });

      return { id: documento.id, nombre: documento.nombre };
    });
  }

  /**
   * Retira un documento de la actividad.
   *
   * Se borra la fila y no se marca como anulada porque el expediente ya guarda
   * la traza de que se cargó y de que se retiró, con quién y cuándo: dejar
   * además el registro haría que la actividad siguiera contando como entregada
   * un documento que ya no está.
   */
  async retirar(procesoId: string, documentoId: string, acceso: HiringAccess) {
    return this.dataSource.transaction(async (em) => {
      const expediente = await em.getRepository(Expediente).findOne({ where: { procesoId } });
      if (!expediente) throw new NotFoundException('El proceso no tiene expediente abierto');

      const documento = await em.getRepository(Documento).findOne({
        where: { id: documentoId, expedienteId: expediente.id },
      });
      if (!documento) throw new NotFoundException('El documento no está en este expediente');

      // El snapshot del formulario no es un adjunto que alguien pueda quitar:
      // es la copia de lo que se envió, y sin ella la revisión no prueba nada.
      if (documento.tipo !== 'ADJUNTO') {
        throw new BadRequestException(
          'Este registro no es un adjunto: es la copia de lo que se envió a revisión',
        );
      }

      await this.traza(em, procesoId, documento.id, 'ANULAR', acceso, {
        numeral: documento.numeral,
        archivo: documento.archivoNombreOriginal ?? documento.nombre,
      });

      await em.getRepository(Documento).remove(documento);

      return { retirado: true };
    });
  }

  private traza(
    em: any,
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
        entidad: 'documento_actividad',
        accion,
        detalle,
        usuarioNombre: acceso.userName,
        usuarioId: acceso.userId,
      } as Partial<Trazabilidad>),
    );
  }
}
