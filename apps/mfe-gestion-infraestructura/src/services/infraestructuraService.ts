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
  createdAt: string;
  sede?: Sede;
  espacio?: EspacioFisico;
}

export interface EstadisticasInfraestructura {
  total: number;
  disponibles: number;
  enMantenimiento: number;
  reservadas: number;
  porcentajeOcupacion: number;
}

const API_BASE_URL = typeof window !== 'undefined' && (window as any).__ESAP_CONFIG__?.API_URL
  ? `${(window as any).__ESAP_CONFIG__.API_URL}/infraestructura`
  : '/services/infraestructura';

export const infraestructuraService = {
  async getSedes(): Promise<Sede[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/sedes`, { credentials: 'include' });
      if (!res.ok) throw new Error('Error al obtener sedes');
      return await res.json();
    } catch {
      return [
        {
          idSede: '1',
          codigo: 'SEDE-CENTRAL',
          nombre: 'Sede Central - Bogotá D.C.',
          tipo: 'SEDE_CENTRAL',
          departamento: 'Bogotá D.C.',
          municipio: 'Bogotá',
          direccion: 'Calle 44 # 53 - 37 CAN',
          telefono: '(601) 7956110',
          emailContacto: 'infraestructura@esap.edu.co',
          isActivo: true,
        },
        {
          idSede: '2',
          codigo: 'TERR-ANTIOQUIA',
          nombre: 'Territorial Antioquia - Chocó',
          tipo: 'TERRITORIAL',
          departamento: 'Antioquia',
          municipio: 'Medellín',
          direccion: 'Calle 56 # 41 - 147',
          telefono: '(604) 5143300',
          emailContacto: 'antioquia@esap.edu.co',
          isActivo: true,
        },
        {
          idSede: '3',
          codigo: 'TERR-VALLE',
          nombre: 'Territorial Valle del Cauca',
          tipo: 'TERRITORIAL',
          departamento: 'Valle del Cauca',
          municipio: 'Cali',
          direccion: 'Avenida 2N # 24N - 32',
          telefono: '(602) 6612000',
          emailContacto: 'valle@esap.edu.co',
          isActivo: true,
        },
      ];
    }
  },

  async getEspacios(): Promise<EspacioFisico[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/espacios`, { credentials: 'include' });
      if (!res.ok) throw new Error('Error al obtener espacios');
      return await res.json();
    } catch {
      return [
        {
          idEspacio: 'e1',
          idBloque: 'b1',
          codigo: 'AULA-101',
          nombre: 'Aula Magistral Camilo Torres',
          tipo: 'AULA',
          capacidad: 45,
          piso: 1,
          areaM2: 70,
          tieneAireAcondicionado: true,
          tieneVideobeam: true,
          tieneComputadores: false,
          estado: 'DISPONIBLE',
          isActivo: true,
        },
        {
          idEspacio: 'e2',
          idBloque: 'b1',
          codigo: 'AUD-PRINCIPAL',
          nombre: 'Auditorio Mayor ESAP',
          tipo: 'AUDITORIO',
          capacidad: 250,
          piso: 1,
          areaM2: 320,
          tieneAireAcondicionado: true,
          tieneVideobeam: true,
          tieneComputadores: true,
          estado: 'DISPONIBLE',
          isActivo: true,
        },
        {
          idEspacio: 'e3',
          idBloque: 'b2',
          codigo: 'LAB-INFO-01',
          nombre: 'Laboratorio de Informática y Estadística',
          tipo: 'LABORATORIO',
          capacidad: 35,
          piso: 2,
          areaM2: 85,
          tieneAireAcondicionado: true,
          tieneVideobeam: true,
          tieneComputadores: true,
          estado: 'MANTENIMIENTO',
          isActivo: true,
        },
      ];
    }
  },

  async getEstadisticas(): Promise<EstadisticasInfraestructura> {
    try {
      const res = await fetch(`${API_BASE_URL}/espacios/estadisticas`, { credentials: 'include' });
      if (!res.ok) throw new Error('Error al obtener estadísticas');
      return await res.json();
    } catch {
      return {
        total: 128,
        disponibles: 104,
        enMantenimiento: 8,
        reservadas: 16,
        porcentajeOcupacion: 19,
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
          estado: 'PENDIENTE',
          costoEstimado: 1200000,
          createdAt: new Date().toISOString(),
        },
      ];
    }
  },
};
