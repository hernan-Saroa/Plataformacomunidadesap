import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { basename, extname, join, resolve } from 'path';
import { Repository } from 'typeorm';
import {
  CentroAyudaRecurso,
  type CategoriaCentroAyuda,
} from './centro-ayuda-recurso.entity';
import { GuardarRecursoDto } from './dto/centro-ayuda.dto';
import { OnlyOfficeService } from './onlyoffice.service';

const EXTENSIONES_DOCUMENTO = [
  'pdf', 'doc', 'docx', 'odt', 'rtf', 'txt',
  'xls', 'xlsx', 'ods', 'csv',
  'ppt', 'pptx', 'odp',
];
const EXTENSIONES_VIDEO = ['mp4', 'webm', 'ogg', 'ogv'];

const MIME_POR_EXTENSION: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  odt: 'application/vnd.oasis.opendocument.text',
  rtf: 'application/rtf',
  txt: 'text/plain; charset=utf-8',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ods: 'application/vnd.oasis.opendocument.spreadsheet',
  csv: 'text/csv; charset=utf-8',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  odp: 'application/vnd.oasis.opendocument.presentation',
  mp4: 'video/mp4',
  webm: 'video/webm',
  ogg: 'video/ogg',
  ogv: 'video/ogg',
};

/** Tamaño máximo de un archivo del Centro de Ayuda (los videos son lo más pesado). */
export const TAMANO_MAXIMO_ARCHIVO = 500 * 1024 * 1024;

export function directorioCentroAyuda(): string {
  const directorio =
    process.env.CENTRO_AYUDA_STORAGE_PATH ||
    join(process.cwd(), 'uploads', 'centro-ayuda');
  if (!existsSync(directorio)) mkdirSync(directorio, { recursive: true });
  return directorio;
}

export function extensionDe(nombreArchivo: string): string {
  return extname(nombreArchivo || '').replace('.', '').toLowerCase();
}

/** Extensiones que se aceptan al subir, sin importar la categoría. */
export function extensionPermitida(nombreArchivo: string): boolean {
  const extension = extensionDe(nombreArchivo);
  return EXTENSIONES_DOCUMENTO.includes(extension) || EXTENSIONES_VIDEO.includes(extension);
}

/**
 * multer entrega el nombre original en latin1, así que "Guía.pdf" llega como
 * "GuÃ­a.pdf". Solo se corrige cuando se nota ese daño.
 */
export function nombreLegible(original: string): string {
  const limpio = basename(String(original || 'archivo')).replace(/[\u0000-\u001F\u007F]/g, '').trim() || 'archivo';
  if (!/[ÃÂ]/.test(limpio)) return limpio;
  const corregido = Buffer.from(limpio, 'latin1').toString('utf8');
  return corregido.includes('�') ? limpio : corregido;
}

export interface ArchivoSubido {
  filename: string;
  originalname: string;
  size: number;
}

export interface RecursoCentroAyuda {
  id: number;
  categoria: CategoriaCentroAyuda;
  titulo: string;
  descripcion: string | null;
  modulo: string | null;
  contenido: string | null;
  enlace: string | null;
  version: string | null;
  orden: number;
  activo: boolean;
  archivo: {
    nombre: string;
    mime: string;
    tamano: number;
    esVideo: boolean;
    previsualizable: boolean;
  } | null;
  actualizadoEn: Date;
}

@Injectable()
export class CentroAyudaService {
  constructor(
    @InjectRepository(CentroAyudaRecurso)
    private readonly repo: Repository<CentroAyudaRecurso>,
    private readonly onlyOffice: OnlyOfficeService,
  ) {}

  async listarActivos(): Promise<RecursoCentroAyuda[]> {
    const recursos = await this.repo.find({
      where: { activo: true },
      order: { categoria: 'ASC', orden: 'ASC', titulo: 'ASC' },
    });
    return recursos.map((r) => this.aSalida(r));
  }

  async listarTodos(): Promise<RecursoCentroAyuda[]> {
    const recursos = await this.repo.find({
      order: { categoria: 'ASC', orden: 'ASC', titulo: 'ASC' },
    });
    return recursos.map((r) => this.aSalida(r));
  }

  /** Archivo de un recurso activo, listo para enviarlo. */
  async obtenerArchivo(id: number) {
    const recurso = await this.repo.findOne({ where: { id, activo: true } });
    if (!recurso?.archivoRuta || !recurso.archivoNombre) {
      throw new NotFoundException('Contenido no disponible por el momento');
    }
    const ruta = this.rutaAbsoluta(recurso.archivoRuta);
    if (!existsSync(ruta)) {
      throw new NotFoundException('El archivo ya no está disponible en el servidor');
    }
    return {
      ruta,
      nombre: recurso.archivoNombre,
      mime: this.mimeDe(recurso.archivoNombre),
    };
  }

  async configOnlyOffice(id: number, usuario: { id: string; nombre: string }) {
    const recurso = await this.repo.findOne({ where: { id, activo: true } });
    if (!recurso?.archivoRuta || !recurso.archivoNombre) {
      throw new NotFoundException('Contenido no disponible por el momento');
    }
    if (!this.onlyOffice.puedePrevisualizar(recurso.archivoNombre)) {
      throw new BadRequestException(
        `Este tipo de archivo no se puede previsualizar: ${recurso.archivoNombre}`,
      );
    }
    if (!existsSync(this.rutaAbsoluta(recurso.archivoRuta))) {
      throw new NotFoundException('El archivo ya no está disponible en el servidor');
    }
    return this.onlyOffice.generarConfigVista(
      `/centro-ayuda/recursos/${recurso.id}/archivo`,
      `ca${recurso.id}${basename(recurso.archivoRuta, extname(recurso.archivoRuta))}`,
      recurso.archivoNombre,
      usuario,
    );
  }

  async crear(
    dto: GuardarRecursoDto,
    archivo: ArchivoSubido | undefined,
    usuario: string,
  ): Promise<RecursoCentroAyuda> {
    try {
      const recurso = this.repo.create({
        categoria: dto.categoria,
        titulo: dto.titulo,
        descripcion: dto.descripcion || null,
        modulo: dto.modulo || null,
        contenido: dto.contenido || null,
        enlace: dto.enlace || null,
        version: dto.version || null,
        orden: dto.orden ?? 0,
        activo: dto.activo ?? true,
        creadoPor: usuario,
        actualizadoPor: usuario,
      });
      if (archivo) this.asignarArchivo(recurso, archivo);

      this.validar(recurso);
      const guardado = await this.repo.save(recurso);
      await this.dejarUnSoloManualVigente(guardado);
      return this.aSalida(guardado);
    } catch (error) {
      if (archivo) this.borrarArchivo(archivo.filename);
      throw error;
    }
  }

  async actualizar(
    id: number,
    dto: GuardarRecursoDto,
    archivo: ArchivoSubido | undefined,
    usuario: string,
  ): Promise<RecursoCentroAyuda> {
    const recurso = await this.repo.findOne({ where: { id } });
    if (!recurso) {
      if (archivo) this.borrarArchivo(archivo.filename);
      throw new NotFoundException('El recurso no existe');
    }

    const archivoAnterior = recurso.archivoRuta;
    try {
      recurso.categoria = dto.categoria;
      recurso.titulo = dto.titulo;
      recurso.descripcion = dto.descripcion || null;
      recurso.modulo = dto.modulo || null;
      recurso.contenido = dto.contenido || null;
      recurso.enlace = dto.enlace || null;
      recurso.version = dto.version || null;
      recurso.orden = dto.orden ?? recurso.orden;
      recurso.activo = dto.activo ?? recurso.activo;
      recurso.actualizadoPor = usuario;

      if (archivo) {
        this.asignarArchivo(recurso, archivo);
      } else if (dto.quitarArchivo) {
        recurso.archivoRuta = null;
        recurso.archivoNombre = null;
        recurso.archivoMime = null;
        recurso.archivoTamano = null;
      }

      this.validar(recurso);
      const guardado = await this.repo.save(recurso);
      await this.dejarUnSoloManualVigente(guardado);

      if (archivoAnterior && archivoAnterior !== guardado.archivoRuta) {
        this.borrarArchivo(archivoAnterior);
      }
      return this.aSalida(guardado);
    } catch (error) {
      if (archivo) this.borrarArchivo(archivo.filename);
      throw error;
    }
  }

  async eliminar(id: number): Promise<{ id: number }> {
    const recurso = await this.repo.findOne({ where: { id } });
    if (!recurso) throw new NotFoundException('El recurso no existe');
    await this.repo.delete(id);
    if (recurso.archivoRuta) this.borrarArchivo(recurso.archivoRuta);
    return { id };
  }

  /** Lo mínimo que necesita cada opción del Centro de Ayuda para mostrarse. */
  private validar(recurso: CentroAyudaRecurso): void {
    if (!recurso.titulo?.trim()) {
      throw new BadRequestException('El título es obligatorio');
    }
    if (recurso.enlace && !/^https?:\/\/\S+$/i.test(recurso.enlace)) {
      throw new BadRequestException('El enlace debe empezar por http:// o https://');
    }

    const extension = recurso.archivoNombre ? extensionDe(recurso.archivoNombre) : '';
    const tieneArchivo = Boolean(recurso.archivoRuta);

    switch (recurso.categoria) {
      case 'manual':
        if (!tieneArchivo || extension !== 'pdf') {
          throw new BadRequestException('El manual de usuario debe ser un archivo PDF');
        }
        if (!recurso.version?.trim()) {
          throw new BadRequestException('Indique la versión del sistema a la que corresponde el manual');
        }
        return;
      case 'videos':
        if (tieneArchivo && !EXTENSIONES_VIDEO.includes(extension)) {
          throw new BadRequestException('El video debe ser MP4, WebM u OGG');
        }
        if (!tieneArchivo && !recurso.enlace) {
          throw new BadRequestException('Cargue el archivo del video o indique su enlace');
        }
        return;
      case 'atajos':
        if (!recurso.contenido?.trim()) {
          throw new BadRequestException('Indique la combinación de teclas del atajo');
        }
        return;
      default:
        if (!tieneArchivo && !recurso.enlace && !recurso.contenido?.trim()) {
          throw new BadRequestException('Cargue un archivo, un enlace o un texto con el contenido');
        }
    }
  }

  private async dejarUnSoloManualVigente(recurso: CentroAyudaRecurso): Promise<void> {
    if (recurso.categoria !== 'manual' || !recurso.activo) return;
    await this.repo
      .createQueryBuilder()
      .update(CentroAyudaRecurso)
      .set({ activo: false })
      .where('categoria = :categoria', { categoria: 'manual' })
      .andWhere('activo = true')
      .andWhere('id <> :id', { id: recurso.id })
      .execute();
  }

  private asignarArchivo(recurso: CentroAyudaRecurso, archivo: ArchivoSubido): void {
    const nombre = nombreLegible(archivo.originalname);
    recurso.archivoRuta = archivo.filename;
    recurso.archivoNombre = nombre;
    recurso.archivoMime = this.mimeDe(nombre);
    recurso.archivoTamano = String(archivo.size);
  }

  private mimeDe(nombreArchivo: string): string {
    return MIME_POR_EXTENSION[extensionDe(nombreArchivo)] || 'application/octet-stream';
  }

  /** Solo se guarda el nombre del archivo; nunca se sale del directorio. */
  private rutaAbsoluta(archivoRuta: string): string {
    return resolve(directorioCentroAyuda(), basename(archivoRuta));
  }

  private borrarArchivo(archivoRuta: string): void {
    try {
      const ruta = this.rutaAbsoluta(archivoRuta);
      if (existsSync(ruta)) unlinkSync(ruta);
    } catch (error) {
      console.warn('[CentroAyuda] No se pudo borrar el archivo', archivoRuta, error);
    }
  }

  private aSalida(r: CentroAyudaRecurso): RecursoCentroAyuda {
    const extension = r.archivoNombre ? extensionDe(r.archivoNombre) : '';
    return {
      id: r.id,
      categoria: r.categoria,
      titulo: r.titulo,
      descripcion: r.descripcion,
      modulo: r.modulo,
      contenido: r.contenido,
      enlace: r.enlace,
      version: r.version,
      orden: r.orden,
      activo: r.activo,
      archivo:
        r.archivoRuta && r.archivoNombre
          ? {
              nombre: r.archivoNombre,
              mime: r.archivoMime || this.mimeDe(r.archivoNombre),
              tamano: Number(r.archivoTamano || 0),
              esVideo: EXTENSIONES_VIDEO.includes(extension),
              previsualizable: this.onlyOffice.puedePrevisualizar(r.archivoNombre),
            }
          : null,
      actualizadoEn: r.actualizadoEn,
    };
  }
}
