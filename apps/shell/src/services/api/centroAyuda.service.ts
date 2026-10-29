/**
 * Centro de Ayuda (EFDS-2399).
 *
 * Las secciones de la pestaña Recursos y su contenido (manuales, videos,
 * documentos, enlaces, textos y atajos) se administran desde "Configuración
 * General > Centro de Ayuda", sin pasar por desarrollo. Viven en auth-service.
 * Eliminar es un borrado suave: lo eliminado queda en la papelera.
 */
import { apiClient } from './apiClient';
import { API_MODE, MICROSERVICE_URLS, config } from '../../config/environment';

const BASE = '/auth/api/v1/centro-ayuda';

/** Qué pide el formulario de un recurso y cómo se muestra la sección. */
export type TipoSeccion = 'general' | 'manual' | 'videos' | 'atajos';

export const TIPOS_SECCION: { id: TipoSeccion; nombre: string; ayuda: string }[] = [
  { id: 'general', nombre: 'General', ayuda: 'Documentos, enlaces o textos. Se agrupan por el módulo del sistema que indique cada uno.' },
  { id: 'videos', nombre: 'Videos', ayuda: 'Archivos de video (MP4, WebM u OGG) o enlaces a videos publicados.' },
  { id: 'atajos', nombre: 'Atajos de teclado', ayuda: 'Combinaciones de teclas, por ejemplo: Ctrl + B.' },
  { id: 'manual', nombre: 'Manual en PDF', ayuda: 'Un PDF con la versión del sistema. Solo uno queda vigente y la opción lo descarga directamente.' },
];

/** Acciones de la administración; cada una es un permiso en Roles y Permisos. */
export interface PermisosCentroAyuda {
  ver: boolean;
  crearSecciones: boolean;
  editarSecciones: boolean;
  eliminarSecciones: boolean;
  crearRecursos: boolean;
  editarRecursos: boolean;
  eliminarRecursos: boolean;
}

export interface SeccionCentroAyuda {
  id: number;
  nombre: string;
  descripcion: string | null;
  icono: string;
  tipo: TipoSeccion;
  orden: number;
  activo: boolean;
}

export interface SeccionPublicada extends SeccionCentroAyuda {
  recursos: RecursoCentroAyuda[];
}

export interface SeccionAdministrada extends SeccionCentroAyuda {
  totalRecursos: number;
  recursosVisibles: number;
  actualizadoEn: string;
  actualizadoPor: string | null;
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
  actualizadoEn: string;
  actualizadoPor?: string | null;
}

export interface DatosSeccion {
  nombre: string;
  descripcion?: string;
  icono: string;
  tipo: TipoSeccion;
  activo?: boolean;
}

export interface DatosRecurso {
  idSeccion: number;
  titulo: string;
  descripcion?: string;
  modulo?: string;
  contenido?: string;
  enlace?: string;
  version?: string;
  orden?: number;
  activo?: boolean;
  archivo?: File | null;
  quitarArchivo?: boolean;
}

export interface ElementoEnPapelera {
  id: number;
  titulo: string;
  seccion: string | null;
  seccionEnPapelera: boolean;
  eliminadoEn: string;
  eliminadoPor: string | null;
}

export interface Papelera {
  secciones: ElementoEnPapelera[];
  recursos: ElementoEnPapelera[];
}

function extraerData<T>(res: unknown): T {
  if (res && typeof res === 'object' && 'data' in (res as Record<string, unknown>)) {
    return (res as Record<string, unknown>).data as T;
  }
  return res as T;
}

const lista = <T>(res: unknown): T[] => {
  const datos = extraerData<T[]>(res);
  return Array.isArray(datos) ? datos : [];
};

function aFormulario(datos: DatosRecurso): FormData {
  const formulario = new FormData();
  formulario.append('idSeccion', String(datos.idSeccion));
  formulario.append('titulo', datos.titulo);
  formulario.append('descripcion', datos.descripcion ?? '');
  formulario.append('modulo', datos.modulo ?? '');
  formulario.append('contenido', datos.contenido ?? '');
  formulario.append('enlace', datos.enlace ?? '');
  formulario.append('version', datos.version ?? '');
  formulario.append('orden', String(datos.orden ?? 0));
  formulario.append('activo', String(datos.activo ?? true));
  if (datos.quitarArchivo) formulario.append('quitarArchivo', 'true');
  if (datos.archivo) formulario.append('archivo', datos.archivo);
  return formulario;
}

/** URL directa del archivo (para el reproductor de video y la descarga). */
export function urlArchivoRecurso(id: number, descargar = false): string {
  const ruta = `/recursos/${id}/archivo${descargar ? '?descargar=1' : ''}`;
  const auth = (MICROSERVICE_URLS as Record<string, string>).auth;
  if (API_MODE === 'direct' && auth) return `${auth}/centro-ayuda${ruta}`;
  return `${config.API_BASE_URL}${BASE}${ruta}`;
}

export const centroAyudaService = {
  /** Secciones visibles con sus recursos visibles: lo que ve el usuario en el botón de ayuda. */
  async listarPublicado(): Promise<SeccionPublicada[]> {
    return lista<SeccionPublicada>(await apiClient.get<unknown>(`${BASE}/secciones`, undefined, { skipErrorToast: true }));
  },

  async configOnlyOffice(id: number): Promise<any> {
    const res = await apiClient.get<unknown>(`${BASE}/recursos/${id}/onlyoffice-config`, undefined, {
      skipErrorToast: true,
    });
    return extraerData<any>(res);
  },

  async misPermisos(): Promise<PermisosCentroAyuda> {
    return extraerData<PermisosCentroAyuda>(await apiClient.get<unknown>(`${BASE}/admin/permisos`));
  },

  // ── Secciones ──
  async listarSecciones(): Promise<SeccionAdministrada[]> {
    return lista<SeccionAdministrada>(await apiClient.get<unknown>(`${BASE}/admin/secciones`));
  },

  async crearSeccion(datos: DatosSeccion): Promise<SeccionCentroAyuda> {
    return extraerData<SeccionCentroAyuda>(await apiClient.post<unknown>(`${BASE}/admin/secciones`, datos));
  },

  async actualizarSeccion(id: number, datos: DatosSeccion): Promise<SeccionCentroAyuda> {
    return extraerData<SeccionCentroAyuda>(await apiClient.put<unknown>(`${BASE}/admin/secciones/${id}`, datos));
  },

  async cambiarVisibilidadSeccion(id: number, activo: boolean): Promise<void> {
    await apiClient.patch(`${BASE}/admin/secciones/${id}/visibilidad`, { activo });
  },

  async ordenarSecciones(ids: number[]): Promise<SeccionAdministrada[]> {
    return lista<SeccionAdministrada>(await apiClient.put<unknown>(`${BASE}/admin/secciones/orden`, { ids }));
  },

  async eliminarSeccion(id: number): Promise<void> {
    await apiClient.delete(`${BASE}/admin/secciones/${id}`);
  },

  async restaurarSeccion(id: number): Promise<void> {
    await apiClient.post(`${BASE}/admin/secciones/${id}/restaurar`, {});
  },

  // ── Recursos ──
  async listarRecursos(): Promise<RecursoCentroAyuda[]> {
    return lista<RecursoCentroAyuda>(await apiClient.get<unknown>(`${BASE}/admin/recursos`));
  },

  async crearRecurso(datos: DatosRecurso): Promise<RecursoCentroAyuda> {
    return extraerData<RecursoCentroAyuda>(await apiClient.post<unknown>(`${BASE}/admin/recursos`, aFormulario(datos)));
  },

  async actualizarRecurso(id: number, datos: DatosRecurso): Promise<RecursoCentroAyuda> {
    return extraerData<RecursoCentroAyuda>(await apiClient.put<unknown>(`${BASE}/admin/recursos/${id}`, aFormulario(datos)));
  },

  async cambiarVisibilidadRecurso(id: number, activo: boolean): Promise<void> {
    await apiClient.patch(`${BASE}/admin/recursos/${id}/visibilidad`, { activo });
  },

  async eliminarRecurso(id: number): Promise<void> {
    await apiClient.delete(`${BASE}/admin/recursos/${id}`);
  },

  async restaurarRecurso(id: number): Promise<void> {
    await apiClient.post(`${BASE}/admin/recursos/${id}/restaurar`, {});
  },

  async papelera(): Promise<Papelera> {
    const datos = extraerData<Papelera>(await apiClient.get<unknown>(`${BASE}/admin/papelera`));
    return { secciones: datos?.secciones ?? [], recursos: datos?.recursos ?? [] };
  },
};

export default centroAyudaService;
