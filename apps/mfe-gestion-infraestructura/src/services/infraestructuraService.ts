export interface Sede {
  idSede: string;
  codigo: string;
  nombre: string;
  tipo: string;
  departamento: string;
  municipio: string;
  direccion: string;
  telefono?: string;
  emailContacto?: string;
  isActivo: boolean;
  alcanceUmi?: boolean;
  bloques?: BloqueEdificio[];
}

export interface BloqueEdificio {
  idBloque: string;
  idSede: string;
  codigo: string;
  nombre: string;
  pisos: number;
  descripcion?: string;
  isActivo: boolean;
  sede?: Sede;
  espacios?: EspacioFisico[];
}

export interface EspacioFisico {
  idEspacio: string;
  idBloque: string;
  codigo: string;
  nombre: string;
  tipo: string;
  capacidad: number;
  piso: number;
  areaM2?: number;
  tieneAireAcondicionado: boolean;
  tieneVideobeam: boolean;
  tieneComputadores: boolean;
  estado: string;
  isActivo: boolean;
  bloque?: BloqueEdificio;
}

export interface CatalogoItem {
  idCatalogo: number;
  catalogo: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  orden: number;
  isActivo: boolean;
  metadata: Record<string, any>;
}

export interface SolicitudEvidencia {
  idEvidencia: string;
  idSolicitud?: string;
  nombreOriginal: string;
  nombreAlmacenado: string;
  rutaObjeto: string;
  bucket: string;
  urlPublica?: string;
  urlPresigned?: string;
  vencimientoPresigned?: string;
  mimeType?: string;
  tamanoBytes: number;
  usuarioQueSubioId?: string;
  usuarioQueSubioEmail?: string;
  orden?: number;
  notas?: string;
  fechaSubida: string;
}

export interface SolicitudMantenimiento {
  idSolicitud: string;
  consecutivo: string;
  idEspacio?: string;
  idSede: string;
  tipoMantenimiento: string;
  prioridad: string;
  descripcion: string;
  solicitanteEmail: string;
  solicitanteNombre: string;
  responsableAsignado?: string;
  fechaProgramada?: string;
  fechaEjecucion?: string;
  estado: string;
  observaciones?: string;
  costoEstimado?: number;
  idAreaSolicitante?: string;
  nombreAreaSolicitante?: string;
  piso?: string;
  salon?: string;
  ubicacionDetalle?: string;
  tipoAtencion: string;
  idCategoria?: string;
  fechaRadicacion?: string;
  usuarioSolicitanteId?: string;
  usuarioSolicitanteEmail?: string;
  evidenciaInicialUrl?: string;
  createdAt: string;
  sede?: Sede;
  espacio?: EspacioFisico;
  evidencias?: SolicitudEvidencia[];
}

export interface CreateMantenimientoPayload {
  idSede: string;
  idEspacio?: string;
  nombreAreaSolicitante: string;
  idAreaSolicitante?: string;
  piso: string;
  salon: string;
  ubicacionDetalle?: string;
  tipoMantenimiento: string;
  descripcion: string;
  evidenciaInicialUrl?: string;
  uploadedEvidenciaIds?: string[];
  prioridad?: string;
}

export interface EstadisticasInfraestructura {
  total: number;
  disponibles: number;
  enMantenimiento: number;
  reservadas: number;
  porcentajeOcupacion: number;
}

const GATEWAY_BASE: string = (typeof window !== 'undefined' && (window as any).__ESAP_CONFIG__?.API_URL)
  ? (window as any).__ESAP_CONFIG__.API_URL.replace(/\/$/, '')
  : 'http://localhost:4000';

const API_BASE_URL = `${GATEWAY_BASE}/infraestructura/api/v1`;

export type NombreCatalogo = 'TIPO_MANTENIMIENTO' | 'PRIORIDAD' | 'TIPO_ATENCION' | 'ESTADO_SOLICITUD';

export const infraestructuraService = {
  async getCatalogo(nombre: NombreCatalogo): Promise<CatalogoItem[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/mantenimiento/catalogos/${nombre}`, { credentials: 'include' });
      if (!res.ok) throw new Error(`Error al obtener catálogo ${nombre} (${res.status})`);
      return await res.json();
    } catch (err) {
      console.warn(`[infraestructuraService] getCatalogo(${nombre}) falló:`, err);
      return [];
    }
  },

  async getSedes(): Promise<Sede[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/sedes`, { credentials: 'include' });
      if (!res.ok) throw new Error(`Error al obtener sedes (${res.status})`);
      return await res.json();
    } catch (err) {
      console.warn('[infraestructuraService] getSedes fallback a lista vacía:', err);
      return [];
    }
  },

  async getEspacios(): Promise<EspacioFisico[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/espacios`, { credentials: 'include' });
      if (!res.ok) throw new Error(`Error al obtener espacios (${res.status})`);
      return await res.json();
    } catch (err) {
      console.warn('[infraestructuraService] getEspacios fallback a lista vacía:', err);
      return [];
    }
  },

  async getEstadisticas(): Promise<EstadisticasInfraestructura> {
    try {
      const res = await fetch(`${API_BASE_URL}/espacios/estadisticas`, { credentials: 'include' });
      if (!res.ok) throw new Error(`Error al obtener estadísticas (${res.status})`);
      return await res.json();
    } catch (err) {
      console.warn('[infraestructuraService] getEstadisticas fallback a default:', err);
      return {
        total: 0,
        disponibles: 0,
        enMantenimiento: 0,
        reservadas: 0,
        porcentajeOcupacion: 0,
      };
    }
  },

  async getMantenimientos(): Promise<SolicitudMantenimiento[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/mantenimiento`, { credentials: 'include' });
      if (!res.ok) throw new Error('Error al obtener mantenimientos');
      return await res.json();
    } catch (err) {
      console.warn('[infraestructuraService] getMantenimientos falló, retornando []:', err);
      return [];
    }
  },

  async getMantenimientoById(idSolicitud: string): Promise<SolicitudMantenimiento | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/mantenimiento/${encodeURIComponent(idSolicitud)}`, {
        credentials: 'include',
      });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`Error al obtener detalle (${res.status})`);
      return await res.json();
    } catch (err) {
      console.warn(`[infraestructuraService] getMantenimientoById(${idSolicitud}):`, err);
      return null;
    }
  },

  async getMisSolicitudes(): Promise<SolicitudMantenimiento[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/mantenimiento/mis-solicitudes`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Error al obtener mis solicitudes');
      return await res.json();
    } catch (err) {
      console.warn('No se pudieron cargar mis solicitudes (sin sesion o endpoint indisponible). Retornando placeholder.', err);
      return [];
    }
  },

  async createMantenimiento(payload: CreateMantenimientoPayload): Promise<SolicitudMantenimiento> {
    const res = await fetch(`${API_BASE_URL}/mantenimiento`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      let mensaje = 'Error al radicar la solicitud';
      try {
        const errorBody = await res.json();
        if (errorBody?.message) {
          mensaje = Array.isArray(errorBody.message) ? errorBody.message.join(', ') : String(errorBody.message);
        }
      } catch {
        // Ignorar error de parseo del body
      }
      throw new Error(mensaje);
    }
    return await res.json();
  },

  async uploadEvidencia(
    file: File,
    opts?: { onProgress?: (porcentaje: number) => void; idSolicitud?: string; orden?: number; notas?: string },
  ): Promise<SolicitudEvidencia> {
    return new Promise<SolicitudEvidencia>((resolve, reject) => {
      const form = new FormData();
      form.append('file', file);
      if (opts?.idSolicitud) form.append('idSolicitud', opts.idSolicitud);
      if (opts?.orden != null) form.append('orden', String(opts.orden));
      if (opts?.notas) form.append('notas', opts.notas);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE_URL}/mantenimiento/evidencias/upload`, true);
      xhr.withCredentials = true;
      if (opts?.onProgress && xhr.upload) {
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) {
            const p = Math.round((ev.loaded / ev.total) * 100);
            opts.onProgress?.(p);
          }
        };
      }
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText) as SolicitudEvidencia);
          } catch (err) {
            reject(new Error('Respuesta inválida al subir evidencia'));
          }
        } else {
          let mensaje = `Error al subir evidencia (${xhr.status})`;
          try {
            const errorBody = JSON.parse(xhr.responseText);
            if (errorBody?.message) {
              mensaje = Array.isArray(errorBody.message) ? errorBody.message.join(', ') : String(errorBody.message);
            }
          } catch {
            // ignore
          }
          reject(new Error(mensaje));
        }
      };
      xhr.onerror = () => reject(new Error('Error de red al subir evidencia'));
      xhr.send(form);
    });
  },

  async getEvidenciasBySolicitud(idSolicitud: string): Promise<SolicitudEvidencia[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/mantenimiento/${idSolicitud}/evidencias`, { credentials: 'include' });
      if (!res.ok) throw new Error(`Error al obtener evidencias (${res.status})`);
      return await res.json();
    } catch (err) {
      console.warn(`[infraestructuraService] getEvidenciasBySolicitud(${idSolicitud}):`, err);
      return [];
    }
  },

  async getSedesAlcanceUMI(): Promise<Sede[]> {
    const todas = await this.getSedes();
    // Preferencia 1: columna nueva sede.alcanceUmi (migración 004)
    const conBandera = todas.filter((s) => s.isActivo && s.alcanceUmi === true);
    if (conBandera.length > 0) {
      return conBandera;
    }
    // Fallback: strings quemados (backward compat si la migración aún no se aplicó)
    return todas.filter(
      (s) => s.isActivo && (s.tipo === 'SEDE_CENTRAL' || s.tipo === 'SEDE_ALTERNA'),
    );
  },
};
