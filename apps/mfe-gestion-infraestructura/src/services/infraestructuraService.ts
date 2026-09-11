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
  createdAt: string;
  sede?: Sede;
  espacio?: EspacioFisico;
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

export const infraestructuraService = {
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
    } catch {
      return [
        {
          idSolicitud: 'm1',
          consecutivo: 'MNT-2026-0001',
          idSede: '1',
          tipoMantenimiento: 'CORRECTIVO',
          prioridad: 'ALTA',
          descripcion: 'Mantenimiento del sistema de proyección y cableado HDMI en Auditorio Principal',
          solicitanteEmail: 'direccion.academica@esap.edu.co',
          solicitanteNombre: 'Dirección Académica',
          responsableAsignado: 'Ing. Javier Moreno',
          fechaProgramada: '2026-09-12',
          estado: 'EN_PROCESO',
          costoEstimado: 680000,
          piso: '1',
          salon: 'Auditorio Principal',
          nombreAreaSolicitante: 'Dirección Académica',
          tipoAtencion: 'FISICA',
          createdAt: new Date().toISOString(),
        },
        {
          idSolicitud: 'm2',
          consecutivo: 'MNT-2026-0002',
          idSede: '2',
          tipoMantenimiento: 'PREVENTIVO',
          prioridad: 'MEDIA',
          descripcion: 'Revisión periódica de unidades de aire acondicionado y filtros',
          solicitanteEmail: 'antioquia@esap.edu.co',
          solicitanteNombre: 'Coordinación Territorial',
          responsableAsignado: 'Técnico Climatización S.A.S.',
          fechaProgramada: '2026-09-18',
          estado: 'RECIBIDA',
          costoEstimado: 1200000,
          piso: '3',
          salon: 'Oficina 301',
          nombreAreaSolicitante: 'Coordinación Territorial',
          tipoAtencion: 'FISICA',
          createdAt: new Date().toISOString(),
        },
      ];
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

  async getSedesAlcanceUMI(): Promise<Sede[]> {
    const todas = await this.getSedes();
    return todas.filter(
      (s) => s.isActivo && (s.tipo === 'SEDE_CENTRAL' || s.tipo === 'SEDE_ALTERNA'),
    );
  },
};
