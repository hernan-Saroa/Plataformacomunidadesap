import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { basename, extname, join, resolve } from 'path';
import { In, IsNull, Not, Repository } from 'typeorm';
import { CentroAyudaRecurso } from './centro-ayuda-recurso.entity';
import {
  CentroAyudaSeccion,
  type IconoSeccion,
  type TipoSeccion,
} from './centro-ayuda-seccion.entity';
import { GuardarRecursoDto, GuardarSeccionDto } from './dto/centro-ayuda.dto';
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

/** Permisos del Centro de Ayuda; se asignan a los roles desde Roles y Permisos. */
export const PERMISOS_CENTRO_AYUDA = {
  ver: 'centro-ayuda.administracion.ver',
  crearSecciones: 'centro-ayuda.secciones.crear',
  editarSecciones: 'centro-ayuda.secciones.editar',
  eliminarSecciones: 'centro-ayuda.secciones.eliminar',
  crearRecursos: 'centro-ayuda.recursos.crear',
  editarRecursos: 'centro-ayuda.recursos.editar',
  eliminarRecursos: 'centro-ayuda.recursos.eliminar',
} as const;

export type AccionCentroAyuda = keyof typeof PERMISOS_CENTRO_AYUDA;

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

/** Extensiones que se aceptan al subir, sin importar la sección. */
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
  idSeccion: number;
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
  actualizadoPor: string | null;
}

export interface SeccionCentroAyuda {
  id: number;
  nombre: string;
  descripcion: string | null;
  icono: IconoSeccion;
  tipo: TipoSeccion;
  orden: number;
  activo: boolean;
}

/** Sección con lo que ve el usuario en el botón de ayuda. */
export interface SeccionPublicada extends SeccionCentroAyuda {
  recursos: RecursoCentroAyuda[];
}

/** Sección vista desde la administración, con cuántos recursos tiene. */
export interface SeccionAdministrada extends SeccionCentroAyuda {
  totalRecursos: number;
  recursosVisibles: number;
  actualizadoEn: Date;
  actualizadoPor: string | null;
}

export interface ElementoEnPapelera {
  id: number;
  titulo: string;
  /** Para un recurso, la sección a la que vuelve si se restaura. */
  seccion: string | null;
  seccionEnPapelera: boolean;
  eliminadoEn: Date;
  eliminadoPor: string | null;
}

@Injectable()
export class CentroAyudaService {
  constructor(
    @InjectRepository(CentroAyudaRecurso)
    private readonly recursos: Repository<CentroAyudaRecurso>,
    @InjectRepository(CentroAyudaSeccion)
    private readonly secciones: Repository<CentroAyudaSeccion>,
    private readonly onlyOffice: OnlyOfficeService,
  ) {}

  // ── Lo que ven los usuarios ───────────────────────────────────────────────

  /** Secciones visibles, en su orden, con sus recursos visibles. */
  async listarPublicado(): Promise<SeccionPublicada[]> {
    const secciones = await this.secciones.find({
      where: { activo: true },
      order: { orden: 'ASC', nombre: 'ASC' },
    });
    if (secciones.length === 0) return [];
    const recursos = await this.recursos.find({
      where: { activo: true, idSeccion: In(secciones.map((s) => s.id)) },
      order: { orden: 'ASC', titulo: 'ASC' },
    });
    return secciones.map((s) => ({
      ...this.seccionDeSalida(s),
      recursos: recursos.filter((r) => r.idSeccion === s.id).map((r) => this.recursoDeSalida(r)),
    }));
  }

  /** Archivo de un recurso publicado, listo para enviarlo. */
  async obtenerArchivo(id: number) {
    const recurso = await this.recursoPublicado(id);
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
    const recurso = await this.recursoPublicado(id);
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

  /** Qué puede hacer el usuario en la administración, según los permisos de sus roles. */
  async permisosDe(roles: string[]): Promise<Record<AccionCentroAyuda, boolean>> {
    const codigos = Object.values(PERMISOS_CENTRO_AYUDA);
    const filas: { code: string }[] = roles.length
      ? await this.secciones.manager.query(
          `SELECT DISTINCT LOWER(p.code) AS code
             FROM auth.permission p
             JOIN auth.role_permissions rp ON rp.id_permission = p.id_permission
             JOIN auth.role r ON r.id = rp.id_rol
            WHERE UPPER(r.code) = ANY($1::text[])
              AND COALESCE(rp.is_active, true) = true
              AND p.is_active = true
              AND LOWER(p.code) = ANY($2::text[])`,
          [roles.map((r) => r.toUpperCase()), codigos],
        )
      : [];
    const tiene = new Set(filas.map((f) => f.code));
    const resultado = {} as Record<AccionCentroAyuda, boolean>;
    (Object.keys(PERMISOS_CENTRO_AYUDA) as AccionCentroAyuda[]).forEach((accion) => {
      resultado[accion] = tiene.has(PERMISOS_CENTRO_AYUDA[accion]);
    });
    return resultado;
  }

  // ── Secciones ─────────────────────────────────────────────────────────────

  async listarSecciones(): Promise<SeccionAdministrada[]> {
    const [secciones, recursos] = await Promise.all([
      this.secciones.find({ order: { orden: 'ASC', nombre: 'ASC' } }),
      this.recursos.find({ select: { id: true, idSeccion: true, activo: true } }),
    ]);
    return secciones.map((s) => {
      const propios = recursos.filter((r) => r.idSeccion === s.id);
      return {
        ...this.seccionDeSalida(s),
        totalRecursos: propios.length,
        recursosVisibles: propios.filter((r) => r.activo).length,
        actualizadoEn: s.actualizadoEn,
        actualizadoPor: s.actualizadoPor,
      };
    });
  }

  async crearSeccion(dto: GuardarSeccionDto, usuario: string): Promise<SeccionCentroAyuda> {
    await this.exigirNombreLibre(dto.nombre);
    const [ultima] = await this.secciones.find({ order: { orden: 'DESC' }, take: 1 });
    const seccion = this.secciones.create({
      nombre: dto.nombre,
      descripcion: dto.descripcion || null,
      icono: dto.icono,
      tipo: dto.tipo,
      orden: (ultima?.orden ?? 0) + 1,
      activo: dto.activo ?? true,
      creadoPor: usuario,
      actualizadoPor: usuario,
    });
    return this.seccionDeSalida(await this.secciones.save(seccion));
  }

  async actualizarSeccion(id: number, dto: GuardarSeccionDto, usuario: string): Promise<SeccionCentroAyuda> {
    const seccion = await this.secciones.findOne({ where: { id } });
    if (!seccion) throw new NotFoundException('La sección no existe');
    await this.exigirNombreLibre(dto.nombre, id);

    if (dto.tipo !== seccion.tipo) {
      const total = await this.recursos.count({ where: { idSeccion: id } });
      if (total > 0) {
        throw new BadRequestException(
          'No se puede cambiar el tipo de una sección que ya tiene recursos. Muévalos a otra sección o elimínelos primero.',
        );
      }
    }

    seccion.nombre = dto.nombre;
    seccion.descripcion = dto.descripcion || null;
    seccion.icono = dto.icono;
    seccion.tipo = dto.tipo;
    seccion.activo = dto.activo ?? seccion.activo;
    seccion.actualizadoPor = usuario;
    return this.seccionDeSalida(await this.secciones.save(seccion));
  }

  /** Oculta o muestra la sección; oculta, sus recursos tampoco se ven. */
  async cambiarVisibilidadSeccion(id: number, activo: boolean, usuario: string): Promise<SeccionCentroAyuda> {
    const seccion = await this.secciones.findOne({ where: { id } });
    if (!seccion) throw new NotFoundException('La sección no existe');
    seccion.activo = activo;
    seccion.actualizadoPor = usuario;
    return this.seccionDeSalida(await this.secciones.save(seccion));
  }

  /** Guarda el orden en que aparecen las secciones en el Centro de Ayuda. */
  async ordenarSecciones(ids: number[], usuario: string): Promise<SeccionAdministrada[]> {
    const secciones = await this.secciones.find({ where: { id: In(ids) } });
    if (secciones.length !== new Set(ids).size) {
      throw new BadRequestException('Alguna de las secciones ya no existe. Recargue la página.');
    }
    const posicion = new Map(ids.map((id, i) => [id, i + 1]));
    secciones.forEach((s) => {
      s.orden = posicion.get(s.id) ?? s.orden;
      s.actualizadoPor = usuario;
    });
    await this.secciones.save(secciones);
    return this.listarSecciones();
  }

  /** Envía la sección a la papelera. Solo se puede si ya no tiene recursos. */
  async eliminarSeccion(id: number, usuario: string): Promise<{ id: number }> {
    const seccion = await this.secciones.findOne({ where: { id } });
    if (!seccion) throw new NotFoundException('La sección no existe');
    const total = await this.recursos.count({ where: { idSeccion: id } });
    if (total > 0) {
      throw new ConflictException(
        `La sección tiene ${total} ${total === 1 ? 'recurso' : 'recursos'}. Muévalos a otra sección o elimínelos primero.`,
      );
    }
    seccion.eliminadoPor = usuario;
    await this.secciones.save(seccion);
    await this.secciones.softDelete(id);
    return { id };
  }

  /** Saca la sección de la papelera; vuelve oculta para revisarla antes de publicarla. */
  async restaurarSeccion(id: number, usuario: string): Promise<SeccionCentroAyuda> {
    const seccion = await this.secciones.findOne({ where: { id, eliminadoEn: Not(IsNull()) }, withDeleted: true });
    if (!seccion) throw new NotFoundException('La sección no está en la papelera');
    await this.exigirNombreLibre(seccion.nombre, id);
    await this.secciones.restore(id);
    seccion.eliminadoEn = null;
    seccion.eliminadoPor = null;
    seccion.activo = false;
    seccion.actualizadoPor = usuario;
    return this.seccionDeSalida(await this.secciones.save(seccion));
  }

  // ── Recursos ──────────────────────────────────────────────────────────────

  async listarRecursos(): Promise<RecursoCentroAyuda[]> {
    const recursos = await this.recursos.find({ order: { orden: 'ASC', titulo: 'ASC' } });
    return recursos.map((r) => this.recursoDeSalida(r));
  }

  async crearRecurso(
    dto: GuardarRecursoDto,
    archivo: ArchivoSubido | undefined,
    usuario: string,
  ): Promise<RecursoCentroAyuda> {
    try {
      const seccion = await this.seccionVigente(dto.idSeccion);
      const recurso = this.recursos.create({
        idSeccion: seccion.id,
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

      this.validar(recurso, seccion.tipo);
      const guardado = await this.recursos.save(recurso);
      await this.dejarUnSoloManualVigente(guardado, seccion.tipo);
      return this.recursoDeSalida(guardado);
    } catch (error) {
      if (archivo) this.borrarArchivo(archivo.filename);
      throw error;
    }
  }

  async actualizarRecurso(
    id: number,
    dto: GuardarRecursoDto,
    archivo: ArchivoSubido | undefined,
    usuario: string,
  ): Promise<RecursoCentroAyuda> {
    const recurso = await this.recursos.findOne({ where: { id } });
    if (!recurso) {
      if (archivo) this.borrarArchivo(archivo.filename);
      throw new NotFoundException('El recurso no existe');
    }

    const archivoAnterior = recurso.archivoRuta;
    try {
      const seccion = await this.seccionVigente(dto.idSeccion);
      recurso.idSeccion = seccion.id;
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

      this.validar(recurso, seccion.tipo);
      const guardado = await this.recursos.save(recurso);
      await this.dejarUnSoloManualVigente(guardado, seccion.tipo);

      if (archivoAnterior && archivoAnterior !== guardado.archivoRuta) {
        this.borrarArchivo(archivoAnterior);
      }
      return this.recursoDeSalida(guardado);
    } catch (error) {
      if (archivo) this.borrarArchivo(archivo.filename);
      throw error;
    }
  }

  /** Oculta o muestra el recurso sin cambiar su contenido. */
  async cambiarVisibilidadRecurso(id: number, activo: boolean, usuario: string): Promise<RecursoCentroAyuda> {
    const recurso = await this.recursos.findOne({ where: { id } });
    if (!recurso) throw new NotFoundException('El recurso no existe');
    const seccion = await this.seccionVigente(recurso.idSeccion);
    recurso.activo = activo;
    recurso.actualizadoPor = usuario;
    const guardado = await this.recursos.save(recurso);
    await this.dejarUnSoloManualVigente(guardado, seccion.tipo);
    return this.recursoDeSalida(guardado);
  }

  /** Envía el recurso a la papelera; el archivo se conserva para poder restaurarlo. */
  async eliminarRecurso(id: number, usuario: string): Promise<{ id: number }> {
    const recurso = await this.recursos.findOne({ where: { id } });
    if (!recurso) throw new NotFoundException('El recurso no existe');
    recurso.eliminadoPor = usuario;
    await this.recursos.save(recurso);
    await this.recursos.softDelete(id);
    return { id };
  }

  /** Saca el recurso de la papelera; vuelve oculto para revisarlo antes de publicarlo. */
  async restaurarRecurso(id: number, usuario: string): Promise<RecursoCentroAyuda> {
    const recurso = await this.recursos.findOne({ where: { id, eliminadoEn: Not(IsNull()) }, withDeleted: true });
    if (!recurso) throw new NotFoundException('El recurso no está en la papelera');
    const seccion = await this.secciones.findOne({ where: { id: recurso.idSeccion }, withDeleted: true });
    if (seccion?.eliminadoEn) {
      throw new ConflictException(`Restaure primero la sección «${seccion.nombre}»`);
    }
    await this.recursos.restore(id);
    recurso.eliminadoEn = null;
    recurso.eliminadoPor = null;
    recurso.activo = false;
    recurso.actualizadoPor = usuario;
    return this.recursoDeSalida(await this.recursos.save(recurso));
  }

  async papelera(): Promise<{ secciones: ElementoEnPapelera[]; recursos: ElementoEnPapelera[] }> {
    const [secciones, recursos, todas] = await Promise.all([
      this.secciones.find({ where: { eliminadoEn: Not(IsNull()) }, withDeleted: true, order: { eliminadoEn: 'DESC' } }),
      this.recursos.find({ where: { eliminadoEn: Not(IsNull()) }, withDeleted: true, order: { eliminadoEn: 'DESC' } }),
      this.secciones.find({ withDeleted: true }),
    ]);
    const seccionPorId = new Map(todas.map((s) => [s.id, s]));
    return {
      secciones: secciones.map((s) => ({
        id: s.id,
        titulo: s.nombre,
        seccion: null,
        seccionEnPapelera: false,
        eliminadoEn: s.eliminadoEn as Date,
        eliminadoPor: s.eliminadoPor,
      })),
      recursos: recursos.map((r) => {
        const seccion = seccionPorId.get(r.idSeccion);
        return {
          id: r.id,
          titulo: r.titulo,
          seccion: seccion?.nombre ?? null,
          seccionEnPapelera: Boolean(seccion?.eliminadoEn),
          eliminadoEn: r.eliminadoEn as Date,
          eliminadoPor: r.eliminadoPor,
        };
      }),
    };
  }

  // ── Reglas ────────────────────────────────────────────────────────────────

  /** Lo mínimo que necesita cada tipo de sección para mostrar el recurso. */
  private validar(recurso: CentroAyudaRecurso, tipo: TipoSeccion): void {
    if (!recurso.titulo?.trim()) {
      throw new BadRequestException('El título es obligatorio');
    }
    if (recurso.enlace && !/^https?:\/\/\S+$/i.test(recurso.enlace)) {
      throw new BadRequestException('El enlace debe empezar por http:// o https://');
    }

    const extension = recurso.archivoNombre ? extensionDe(recurso.archivoNombre) : '';
    const tieneArchivo = Boolean(recurso.archivoRuta);

    switch (tipo) {
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

  /** En una sección de manual solo hay un manual vigente: el último que se publicó. */
  private async dejarUnSoloManualVigente(recurso: CentroAyudaRecurso, tipo: TipoSeccion): Promise<void> {
    if (tipo !== 'manual' || !recurso.activo) return;
    await this.recursos
      .createQueryBuilder()
      .update(CentroAyudaRecurso)
      .set({ activo: false })
      .where('id_seccion = :idSeccion', { idSeccion: recurso.idSeccion })
      .andWhere('activo = true')
      .andWhere('id <> :id', { id: recurso.id })
      .execute();
  }

  private async seccionVigente(id: number): Promise<CentroAyudaSeccion> {
    const seccion = id ? await this.secciones.findOne({ where: { id } }) : null;
    if (!seccion) throw new BadRequestException('La sección elegida no existe');
    return seccion;
  }

  /** Dos secciones vigentes no pueden llamarse igual; las de la papelera no cuentan. */
  private async exigirNombreLibre(nombre: string, excepto?: number): Promise<void> {
    const consulta = this.secciones
      .createQueryBuilder('s')
      .where('LOWER(s.nombre) = LOWER(:nombre)', { nombre: nombre.trim() });
    if (excepto) consulta.andWhere('s.id <> :excepto', { excepto });
    const repetida = await consulta.getOne();
    if (repetida) throw new ConflictException(`Ya existe una sección llamada «${repetida.nombre}»`);
  }

  /** Recurso visible dentro de una sección visible; lo demás no se entrega. */
  private async recursoPublicado(id: number): Promise<CentroAyudaRecurso | null> {
    const recurso = await this.recursos.findOne({ where: { id, activo: true }, relations: { seccion: true } });
    if (!recurso?.seccion?.activo || recurso.seccion.eliminadoEn) return null;
    return recurso;
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

  private seccionDeSalida(s: CentroAyudaSeccion): SeccionCentroAyuda {
    return {
      id: s.id,
      nombre: s.nombre,
      descripcion: s.descripcion,
      icono: s.icono,
      tipo: s.tipo,
      orden: s.orden,
      activo: s.activo,
    };
  }

  private recursoDeSalida(r: CentroAyudaRecurso): RecursoCentroAyuda {
    const extension = r.archivoNombre ? extensionDe(r.archivoNombre) : '';
    return {
      id: r.id,
      idSeccion: r.idSeccion,
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
      actualizadoPor: r.actualizadoPor,
    };
  }
}
