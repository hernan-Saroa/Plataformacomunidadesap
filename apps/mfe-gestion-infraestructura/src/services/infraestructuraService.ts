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
  idCategoria?: number;
  idSubcategoria?: number;
  fechaRadicacion?: string;
  fechaLimiteAtencion?: string;
  usuarioSolicitanteId?: string;
  usuarioSolicitanteEmail?: string;
  evidenciaInicialUrl?: string;
  createdAt: string;
  areaResponsableActual?: 'UMI' | 'TI' | 'PENDIENTE_CLASIFICACION';
  remisiones?: Array<Record<string, any>>;
  asignaciones?: HistoricoAsignacionEntry[];
  motivoRechazo?: string | null;
  __meta?: { warning?: string };
  sede?: Sede;
  espacio?: EspacioFisico;
  evidencias?: SolicitudEvidencia[];
}

export interface HistoricoAsignacionEntry {
  id: string;
  fecha: string;
  accion: 'APROBADA_Y_ASIGNADA' | 'RECHAZADA' | 'REDISTRIBUIDA';
  tecnico_codigo: string | null;
  tecnico_nombre_display: string | null;
  motivo: string | null;
  observaciones: string | null;
  usuario_id: string | null;
  usuario_email: string | null;
  usuario_roles: string | null;
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
  tipoAtencion: 'FISICA' | 'TECNOLOGICA';
  idCategoria?: number;
  idSubcategoria?: number;
}

export interface RemitirATIPayload {
  motivo: string;
  consecutivoCruzadoTi?: string;
  canalRemision?: 'EMAIL_SIN_INTEGRAR' | 'MANUAL';
}

export interface CategoriaServicioPayload {
  codigo: string;
  nombre: string;
  descripcion?: string;
  orden?: number;
  isActivo?: boolean;
  color?: string;
}

export interface TecnicoMantenimientoPayload {
  codigo: string;
  nombre: string;
  email?: string;
  telefono?: string;
  especialidades?: string[];
  orden?: number;
  isActivo?: boolean;
}

export interface SugerenciaAsignacion {
  regla: 'ESPECIALIZACION' | 'EQUIDAD_DISPONIBILIDAD_CARGA_MENOR' | 'SIN_REGLA';
  idCategoria: number | null;
  sugerido: (CatalogoItem & { cargaVigente?: number }) | null;
  obligatorio: boolean;
  opciones: Array<CatalogoItem & { cargaVigente?: number }>;
  advertencia?: string;
}

export interface AprobarAsignarPayload {
  tecnicoCodigo?: string | null;
  observaciones?: string | null;
}

export interface RechazarPayload {
  motivo: string;
  observaciones?: string | null;
}

export interface RedistribuirPayload {
  tecnicoCodigo: string;
  motivoRedistribucion?: string | null;
  observaciones?: string | null;
}

export interface EstadisticasInfraestructura {
  total: number;
  disponibles: number;
  enMantenimiento: number;
  reservadas: number;
  porcentajeOcupacion: number;
}

export function clasificarSLA(fechaLimiteISO?: string | number | Date | null):
  | { clase: 'vencido' | 'alerta' | 'ok' | 'sin'; horasRestantes: number | null; texto: string } {
  if (!fechaLimiteISO) return { clase: 'sin', horasRestantes: null, texto: 'Sin fecha límite' };
  const ms = new Date(fechaLimiteISO as any).getTime();
  if (!isFinite(ms)) return { clase: 'sin', horasRestantes: null, texto: 'Fecha inválida' };
  const diff = ms - Date.now();
  const horas = diff / (1000 * 60 * 60);
  if (horas < 0) {
    const h = Math.round(-1 * horas);
    return { clase: 'vencido', horasRestantes: Math.round(horas), texto: `Vencida · ${h} h` };
  }
  if (horas <= 24) return { clase: 'alerta', horasRestantes: Math.round(horas), texto: `Urgente · ≤24 h (${Math.round(horas)} h)` };
  if (horas <= 48) return { clase: 'alerta', horasRestantes: Math.round(horas), texto: `Próximo · ≤48 h (${Math.round(horas)} h)` };
  return { clase: 'ok', horasRestantes: Math.round(horas), texto: `Dentro plazo · ${Math.round(horas)} h` };
}

const GATEWAY_BASE: string = (typeof window !== 'undefined' && (window as any).__ESAP_CONFIG__?.API_URL)
  ? (window as any).__ESAP_CONFIG__.API_URL.replace(/\/$/, '')
  : (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:4000' : '/services');

const API_BASE_URL = `${GATEWAY_BASE}/infraestructura/api/v1`;

export type NombreCatalogo = 'TIPO_MANTENIMIENTO' | 'PRIORIDAD' | 'TIPO_ATENCION' | 'ESTADO_SOLICITUD' | 'CATEGORIA_SERVICIO';

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

  async getEspacios(params?: { idBloque?: string; tipo?: string; estado?: string }): Promise<EspacioFisico[]> {
    try {
      const q = new URLSearchParams();
      if (params?.idBloque) q.append('idBloque', params.idBloque);
      if (params?.tipo) q.append('tipo', params.tipo);
      if (params?.estado) q.append('estado', params.estado);
      const qs = q.toString() ? ('?' + q.toString()) : '';
      const res = await fetch(`${API_BASE_URL}/espacios${qs}`, { credentials: 'include' });
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

  async getMantenimientos(params?: { incluirTI?: boolean; estado?: string; prioridad?: string; idCategoria?: number }): Promise<SolicitudMantenimiento[]> {
    try {
      const q = new URLSearchParams();
      if (params?.incluirTI === true) q.append('incluirTI', 'true');
      if (params?.estado) q.append('estado', params.estado);
      if (params?.prioridad) q.append('prioridad', params.prioridad);
      if (Number.isInteger(params?.idCategoria)) q.append('idCategoria', String(params?.idCategoria));
      const qs = q.toString() ? ('?' + q.toString()) : '';
      const res = await fetch(`${API_BASE_URL}/mantenimiento${qs}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Error al obtener mantenimientos');
      return await res.json();
    } catch (err) {
      console.warn('[infraestructuraService] getMantenimientos falló, retornando []:', err);
      return [];
    }
  },

  async getRemisiones(idSolicitud: string): Promise<Array<Record<string, any>>> {
    try {
      const res = await fetch(`${API_BASE_URL}/mantenimiento/${encodeURIComponent(idSolicitud)}/remisiones`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`Error al obtener remisiones (${res.status})`);
      return await res.json();
    } catch (err) {
      console.warn(`[infraestructuraService] getRemisiones(${idSolicitud}):`, err);
      return [];
    }
  },

  async remitirATI(idSolicitud: string, payload: RemitirATIPayload): Promise<SolicitudMantenimiento> {
    const res = await fetch(`${API_BASE_URL}/mantenimiento/${encodeURIComponent(idSolicitud)}/remitir-a-ti`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      let mensaje = 'Error al remitir a TI';
      try {
        const errorBody = await res.json();
        if (errorBody?.message) {
          mensaje = Array.isArray(errorBody.message) ? errorBody.message.join(', ') : String(errorBody.message);
        }
      } catch {}
      throw new Error(mensaje);
    }
    return await res.json();
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

  async getCategoriasServicio(opts?: { soloActivos?: boolean }): Promise<CatalogoItem[]> {
    try {
      const q = new URLSearchParams();
      if (opts?.soloActivos === true) q.append('soloActivos', 'true');
      const qs = q.toString() ? ('?' + q.toString()) : '';
      const res = await fetch(`${API_BASE_URL}/mantenimiento/categorias-servicio${qs}`, { credentials: 'include' });
      if (!res.ok) throw new Error(`Listar categorías ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('[getCategoriasServicio] falló:', err);
      return [];
    }
  },

  async crearCategoriaServicio(payload: CategoriaServicioPayload): Promise<CatalogoItem> {
    const res = await fetch(`${API_BASE_URL}/mantenimiento/categorias-servicio`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      let m = 'Error creando categoría';
      try { const b = await res.json(); if (b?.message) m = Array.isArray(b.message) ? b.message.join(', ') : String(b.message); } catch {}
      throw new Error(m);
    }
    return await res.json();
  },

  async actualizarCategoriaServicio(idCatalogo: number, payload: Partial<CategoriaServicioPayload>): Promise<CatalogoItem> {
    const res = await fetch(`${API_BASE_URL}/mantenimiento/categorias-servicio/${encodeURIComponent(String(idCatalogo))}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      let m = 'Error actualizando categoría';
      try { const b = await res.json(); if (b?.message) m = Array.isArray(b.message) ? b.message.join(', ') : String(b.message); } catch {}
      throw new Error(m);
    }
    return await res.json();
  },

  async toggleCategoriaServicio(idCatalogo: number): Promise<CatalogoItem> {
    const res = await fetch(`${API_BASE_URL}/mantenimiento/categorias-servicio/${encodeURIComponent(String(idCatalogo))}/toggle`, {
      method: 'PATCH',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Toggle categoría falló');
    return await res.json();
  },

  async eliminarCategoriaServicio(idCatalogo: number): Promise<{ idCatalogo: number; eliminado: boolean }> {
    const res = await fetch(`${API_BASE_URL}/mantenimiento/categorias-servicio/${encodeURIComponent(String(idCatalogo))}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Eliminar categoría falló');
    return await res.json();
  },

  async getSedesAlcanceUMI(): Promise<Sede[]> {
    const todas = await this.getSedes();
    const conBandera = todas.filter((s) => s.isActivo && s.alcanceUmi === true);
    if (conBandera.length > 0) {
      return conBandera;
    }
    return todas.filter(
      (s) => s.isActivo && (s.tipo === 'SEDE_CENTRAL' || s.tipo === 'SEDE_ALTERNA'),
    );
  },

  async crearSede(payload: Partial<Sede> & { codigo: string; nombre: string; departamento: string; municipio: string; direccion: string }): Promise<Sede> {
    const res = await fetch(`${API_BASE_URL}/sedes`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      let m = 'Error creando la sede';
      try { const b = await res.json(); if (b?.message) m = Array.isArray(b.message) ? b.message.join(', ') : String(b.message); } catch {}
      throw new Error(m);
    }
    return await res.json();
  },

  async actualizarSede(idSede: string, payload: Partial<Sede>): Promise<Sede> {
    const res = await fetch(`${API_BASE_URL}/sedes/${encodeURIComponent(idSede)}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      let m = 'Error actualizando la sede';
      try { const b = await res.json(); if (b?.message) m = Array.isArray(b.message) ? b.message.join(', ') : String(b.message); } catch {}
      throw new Error(m);
    }
    return await res.json();
  },

  async toggleSedeActiva(idSede: string): Promise<Sede> {
    const res = await fetch(`${API_BASE_URL}/sedes/${encodeURIComponent(idSede)}/toggle`, {
      method: 'PATCH',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Activar/desactivar sede falló');
    return await res.json();
  },

  async eliminarSede(idSede: string): Promise<{ idSede: string; eliminado: boolean }> {
    const res = await fetch(`${API_BASE_URL}/sedes/${encodeURIComponent(idSede)}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) {
      let m = 'Error eliminando la sede';
      try { const b = await res.json(); if (b?.message) m = Array.isArray(b.message) ? b.message.join(', ') : String(b.message); } catch {}
      throw new Error(m);
    }
    return await res.json();
  },

  async crearEspacio(payload: Partial<EspacioFisico> & { idBloque: string; codigo: string; nombre: string; tipo: string }): Promise<EspacioFisico> {
    const res = await fetch(`${API_BASE_URL}/espacios`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      let m = 'Error creando el espacio físico';
      try { const b = await res.json(); if (b?.message) m = Array.isArray(b.message) ? b.message.join(', ') : String(b.message); } catch {}
      throw new Error(m);
    }
    return await res.json();
  },

  async actualizarEspacio(idEspacio: string, payload: Partial<EspacioFisico>): Promise<EspacioFisico> {
    const res = await fetch(`${API_BASE_URL}/espacios/${encodeURIComponent(idEspacio)}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      let m = 'Error actualizando el espacio físico';
      try { const b = await res.json(); if (b?.message) m = Array.isArray(b.message) ? b.message.join(', ') : String(b.message); } catch {}
      throw new Error(m);
    }
    return await res.json();
  },

  async toggleEspacioActivo(idEspacio: string): Promise<EspacioFisico> {
    const res = await fetch(`${API_BASE_URL}/espacios/${encodeURIComponent(idEspacio)}/toggle`, {
      method: 'PATCH',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Activar/desactivar espacio falló');
    return await res.json();
  },

  async eliminarEspacio(idEspacio: string): Promise<{ idEspacio: string; eliminado: boolean }> {
    const res = await fetch(`${API_BASE_URL}/espacios/${encodeURIComponent(idEspacio)}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) {
      let m = 'Error eliminando el espacio';
      try { const b = await res.json(); if (b?.message) m = Array.isArray(b.message) ? b.message.join(', ') : String(b.message); } catch {}
      throw new Error(m);
    }
    return await res.json();
  },

  // ---------------------------------------------------------------------------
  // Bloques / Edificios por sede (EFDS 1732)
  // ---------------------------------------------------------------------------
  async getBloquesPorSede(idSede: string, soloActivos: boolean = true): Promise<BloqueEdificio[]> {
    const qs = new URLSearchParams();
    if (!soloActivos) qs.set('soloActivos', 'false');
    const res = await fetch(`${API_BASE_URL}/sedes/${encodeURIComponent(idSede)}/bloques?${qs.toString()}`, {
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Error cargando bloques de la sede');
    return await res.json();
  },

  async crearBloque(payload: Partial<BloqueEdificio> & { idSede: string; codigo: string; nombre: string }): Promise<BloqueEdificio> {
    const res = await fetch(`${API_BASE_URL}/sedes/bloques`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      let m = 'Error creando el bloque';
      try { const b = await res.json(); if (b?.message) m = Array.isArray(b.message) ? b.message.join(', ') : String(b.message); } catch {}
      throw new Error(m);
    }
    return await res.json();
  },

  async actualizarBloque(idBloque: string, payload: Partial<BloqueEdificio>): Promise<BloqueEdificio> {
    const res = await fetch(`${API_BASE_URL}/sedes/bloques/${encodeURIComponent(idBloque)}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      let m = 'Error actualizando el bloque';
      try { const b = await res.json(); if (b?.message) m = Array.isArray(b.message) ? b.message.join(', ') : String(b.message); } catch {}
      throw new Error(m);
    }
    return await res.json();
  },

  async toggleBloqueActivo(idBloque: string): Promise<BloqueEdificio> {
    const res = await fetch(`${API_BASE_URL}/sedes/bloques/${encodeURIComponent(idBloque)}/toggle`, {
      method: 'PATCH',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Activar/desactivar bloque falló');
    return await res.json();
  },

  async eliminarBloque(idBloque: string): Promise<{ idBloque: string; eliminado: boolean }> {
    const res = await fetch(`${API_BASE_URL}/sedes/bloques/${encodeURIComponent(idBloque)}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) {
      let m = 'Error eliminando el bloque';
      try { const b = await res.json(); if (b?.message) m = Array.isArray(b.message) ? b.message.join(', ') : String(b.message); } catch {}
      throw new Error(m);
    }
    return await res.json();
  },

  // ---------------------------------------------------------------------------
  // EFDS-1733: Parámetros UMI / Reglas / Técnicos / Sugerir asignación
  // ---------------------------------------------------------------------------
  async getParametroTiempoRespuesta(): Promise<CatalogoItem | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/mantenimiento/parametros/tiempo-respuesta`, { credentials: 'include' });
      if (!res.ok) throw new Error(`GET param tiempo ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('[infra] getParametroTiempoRespuesta fail:', err);
      return null;
    }
  },

  async setParametroTiempoRespuesta(dias: number): Promise<CatalogoItem> {
    const res = await fetch(`${API_BASE_URL}/mantenimiento/parametros/tiempo-respuesta`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dias }),
    });
    if (!res.ok) {
      let m = 'Error actualizando parámetro días respuesta';
      try { const b = await res.json(); if (b?.message) m = Array.isArray(b.message) ? b.message.join(', ') : String(b.message); } catch {}
      throw new Error(m);
    }
    return await res.json();
  },

  async getReglasEscalamiento(): Promise<CatalogoItem[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/mantenimiento/parametros/reglas-escalamiento`, { credentials: 'include' });
      if (!res.ok) throw new Error(`GET reglas ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('[infra] reglas falló:', err);
      return [];
    }
  },

  async actualizarReglaEscalamiento(
    idRegla: number,
    body: { tecnicoCodigo?: string | null; isActivo?: boolean; metadata?: Record<string, any> },
  ): Promise<CatalogoItem> {
    const res = await fetch(`${API_BASE_URL}/mantenimiento/parametros/reglas-escalamiento/${encodeURIComponent(String(idRegla))}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      let m = 'Error actualizando regla escalamiento';
      try { const b = await res.json(); if (b?.message) m = Array.isArray(b.message) ? b.message.join(', ') : String(b.message); } catch {}
      throw new Error(m);
    }
    return await res.json();
  },

  async getTecnicos(soloActivos: boolean = true): Promise<CatalogoItem[]> {
    try {
      const q = new URLSearchParams();
      if (!soloActivos) q.append('soloActivos', 'false');
      const qs = q.toString() ? ('?' + q.toString()) : '';
      const res = await fetch(`${API_BASE_URL}/mantenimiento/tecnicos${qs}`, { credentials: 'include' });
      if (!res.ok) throw new Error(`GET técnicos ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('[infra] getTecnicos falló:', err);
      return [];
    }
  },

  async getTecnicosConCargaVigente(opts?: { incluirInactivos?: boolean }): Promise<Array<CatalogoItem & { cargaVigente?: number }>> {
    try {
      const qs = new URLSearchParams();
      if (opts?.incluirInactivos) qs.set('incluirInactivos', 'true');
      const q = qs.toString();
      const res = await fetch(`${API_BASE_URL}/mantenimiento/tecnicos/con-carga-vigente${q ? `?${q}` : ''}`, { credentials: 'include' });
      if (!res.ok) throw new Error(`GET técnicos carga ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('[infra] técnicos carga falló:', err);
      return [];
    }
  },

  async crearTecnico(payload: TecnicoMantenimientoPayload): Promise<CatalogoItem> {
    const res = await fetch(`${API_BASE_URL}/mantenimiento/tecnicos`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      let m = 'Error creando técnico';
      try { const b = await res.json(); if (b?.message) m = Array.isArray(b.message) ? b.message.join(', ') : String(b.message); } catch {}
      throw new Error(m);
    }
    return await res.json();
  },

  async actualizarTecnico(idCatalogo: number, payload: Partial<TecnicoMantenimientoPayload>): Promise<CatalogoItem> {
    const res = await fetch(`${API_BASE_URL}/mantenimiento/tecnicos/${encodeURIComponent(String(idCatalogo))}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      let m = 'Error actualizando técnico';
      try { const b = await res.json(); if (b?.message) m = Array.isArray(b.message) ? b.message.join(', ') : String(b.message); } catch {}
      throw new Error(m);
    }
    return await res.json();
  },

  async toggleTecnico(idCatalogo: number): Promise<CatalogoItem> {
    const res = await fetch(`${API_BASE_URL}/mantenimiento/tecnicos/${encodeURIComponent(String(idCatalogo))}/toggle`, {
      method: 'PATCH', credentials: 'include',
    });
    if (!res.ok) throw new Error('Toggle técnico falló');
    return await res.json();
  },

  async eliminarTecnico(idCatalogo: number): Promise<{ idCatalogo: number; eliminado: boolean }> {
    const res = await fetch(`${API_BASE_URL}/mantenimiento/tecnicos/${encodeURIComponent(String(idCatalogo))}`, {
      method: 'DELETE', credentials: 'include',
    });
    if (!res.ok) throw new Error('Eliminar técnico falló');
    return await res.json();
  },

  async sugerirAsignacion(idSolicitud: string): Promise<SugerenciaAsignacion | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/mantenimiento/${encodeURIComponent(idSolicitud)}/sugerir-asignacion`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`sugerir-asignacion ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn(`[infra] sugerirAsignacion ${idSolicitud}:`, err);
      return null;
    }
  },

  // ---------------------------------------------------------------------------
  // EFDS-1733 bis HUECO 1 (RF-INF-004 L104): Tiempo POR CATEGORÍA (47..54)
  // ---------------------------------------------------------------------------
  async listarParametrosTiempoPorCategoria(opts?: { idCategoria?: number }): Promise<CatalogoItem[] | CatalogoItem | null> {
    try {
      const q = new URLSearchParams();
      if (Number.isInteger(opts?.idCategoria)) q.append('idCategoria', String(opts?.idCategoria));
      const qs = q.toString() ? ('?' + q.toString()) : '';
      const res = await fetch(`${API_BASE_URL}/mantenimiento/parametros/tiempo-respuesta${qs}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`GET param tiempo por categoría ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('[infra] listarParametrosTiempoPorCategoria fail:', err);
      return Number.isInteger(opts?.idCategoria) ? null : [];
    }
  },

  async actualizarParametroTiempoRespuestaPorCategoria(
    idCategoria: number,
    dias: number,
  ): Promise<CatalogoItem> {
    const res = await fetch(`${API_BASE_URL}/mantenimiento/parametros/tiempo-respuesta`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idCategoria: Number(idCategoria), dias: Number(dias) }),
    });
    if (!res.ok) {
      let m = 'Error actualizando parámetro días respuesta por categoría';
      try { const b = await res.json(); if (b?.message) m = Array.isArray(b.message) ? b.message.join(', ') : String(b.message); } catch {}
      throw new Error(m);
    }
    return await res.json();
  },

  // ---------------------------------------------------------------------------
  // EFDS-1734 RF-INF-005: 3 acciones análisis (aprobar-asignar / rechazar / redistribuir)
  // Requieren rol SUPER_ADMIN o GESTOR_MANTENIMIENTO; de lo contrario 403 Forbidden.
  // ---------------------------------------------------------------------------
  async aprobarYAsignar(
    idSolicitud: string,
    payload: AprobarAsignarPayload,
  ): Promise<SolicitudMantenimiento> {
    const res = await fetch(`${API_BASE_URL}/mantenimiento/${encodeURIComponent(idSolicitud)}/aprobar-asignar`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      let m = 'Error al aprobar y asignar la solicitud';
      try { const b = await res.json(); if (b?.message) m = Array.isArray(b.message) ? b.message.join(', ') : String(b.message); } catch {}
      throw new Error(m);
    }
    return await res.json();
  },

  async rechazarSolicitud(
    idSolicitud: string,
    payload: RechazarPayload,
  ): Promise<SolicitudMantenimiento> {
    const res = await fetch(`${API_BASE_URL}/mantenimiento/${encodeURIComponent(idSolicitud)}/rechazar`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      let m = 'Error al rechazar la solicitud';
      try { const b = await res.json(); if (b?.message) m = Array.isArray(b.message) ? b.message.join(', ') : String(b.message); } catch {}
      throw new Error(m);
    }
    return await res.json();
  },

  async redistribuirAsignacion(
    idSolicitud: string,
    payload: RedistribuirPayload,
  ): Promise<SolicitudMantenimiento> {
    const res = await fetch(`${API_BASE_URL}/mantenimiento/${encodeURIComponent(idSolicitud)}/redistribuir`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      let m = 'Error al redistribuir la asignación';
      try { const b = await res.json(); if (b?.message) m = Array.isArray(b.message) ? b.message.join(', ') : String(b.message); } catch {}
      throw new Error(m);
    }
    return await res.json();
  },
};
