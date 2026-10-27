/**
 * Recursos del Centro de Ayuda (EFDS-2399).
 *
 * Manuales, videos, documentación, cursos, atajos y mejores prácticas que se
 * cargan desde "Configuración General > Centro de Ayuda", sin pasar por
 * desarrollo. Viven en auth-service.
 */
import { apiClient } from './apiClient';
import { API_MODE, MICROSERVICE_URLS, config } from '../../config/environment';

const BASE = '/auth/api/v1/centro-ayuda';

export const PERMISO_GESTIONAR_CENTRO_AYUDA = 'centro-ayuda.recursos.gestionar';

export type CategoriaCentroAyuda =
  | 'documentacion'
  | 'videos'
  | 'atajos'
  | 'manual'
  | 'cursos'
  | 'practicas';

export const CATEGORIAS_CENTRO_AYUDA: { id: CategoriaCentroAyuda; nombre: string }[] = [
  { id: 'documentacion', nombre: 'Documentación completa' },
  { id: 'videos', nombre: 'Video tutoriales' },
  { id: 'atajos', nombre: 'Atajos de teclado' },
  { id: 'manual', nombre: 'Manual de usuario' },
  { id: 'cursos', nombre: 'Cursos de capacitación' },
  { id: 'practicas', nombre: 'Mejores prácticas' },
];

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
  actualizadoEn: string;
}

export interface DatosRecurso {
  categoria: CategoriaCentroAyuda;
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

function extraerData<T>(res: unknown): T {
  if (res && typeof res === 'object' && 'data' in (res as Record<string, unknown>)) {
    return (res as Record<string, unknown>).data as T;
  }
  return res as T;
}

function aFormulario(datos: DatosRecurso): FormData {
  const formulario = new FormData();
  formulario.append('categoria', datos.categoria);
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
  async listar(): Promise<RecursoCentroAyuda[]> {
    const res = await apiClient.get<unknown>(`${BASE}/recursos`, undefined, { skipErrorToast: true });
    const lista = extraerData<RecursoCentroAyuda[]>(res);
    return Array.isArray(lista) ? lista : [];
  },

  async configOnlyOffice(id: number): Promise<any> {
    const res = await apiClient.get<unknown>(`${BASE}/recursos/${id}/onlyoffice-config`, undefined, {
      skipErrorToast: true,
    });
    return extraerData<any>(res);
  },

  async listarParaAdministrar(): Promise<RecursoCentroAyuda[]> {
    const res = await apiClient.get<unknown>(`${BASE}/admin/recursos`);
    const lista = extraerData<RecursoCentroAyuda[]>(res);
    return Array.isArray(lista) ? lista : [];
  },

  async crear(datos: DatosRecurso): Promise<RecursoCentroAyuda> {
    const res = await apiClient.post<unknown>(`${BASE}/admin/recursos`, aFormulario(datos));
    return extraerData<RecursoCentroAyuda>(res);
  },

  async actualizar(id: number, datos: DatosRecurso): Promise<RecursoCentroAyuda> {
    const res = await apiClient.put<unknown>(`${BASE}/admin/recursos/${id}`, aFormulario(datos));
    return extraerData<RecursoCentroAyuda>(res);
  },

  async eliminar(id: number): Promise<void> {
    await apiClient.delete(`${BASE}/admin/recursos/${id}`);
  },
};

export default centroAyudaService;
