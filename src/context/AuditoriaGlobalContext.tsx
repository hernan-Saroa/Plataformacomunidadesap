/**
 * CONTEXTO GLOBAL DE AUDITORÍA
 * Integración Fase 1 - Modelo único compartido por todos los módulos
 * Control Interno de Gestión - ESAP
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// ============ TIPOS CENTRALIZADOS ============

export type EstadoAuditoria = 
  | 'Programada'
  | 'Planeación'
  | 'Ejecución'
  | 'Comunicación'
  | 'Seguimiento'
  | 'Finalizada'
  | 'Cancelada'
  | 'Reprogramada';

export type TipoAuditoria = 
  | 'Gestión'
  | 'Cumplimiento'
  | 'Financiera'
  | 'Sistemas'
  | 'Ambiental'
  | 'Desempeño';

export type CategoriaRiesgo = 'Muy Alto' | 'Alto' | 'Medio' | 'Bajo' | 'Muy Bajo';

export interface MiembroEquipo {
  id: string;
  nombre: string;
  rol: 'Auditor Líder' | 'Auditor' | 'Auditor Junior' | 'Especialista';
  email: string;
  telefono?: string;
}

export interface ProcesoAuditado {
  id: string;
  codigo: string;
  nombre: string;
  responsable: string;
  emailResponsable: string;
  direccion: string;
  categoriaRiesgo: CategoriaRiesgo;
}

export interface Cronograma {
  fechaInicio: string;
  fechaFin: string;
  duracionDias: number;
  hitos: Hito[];
}

export interface Hito {
  id: string;
  nombre: string;
  descripcion: string;
  fechaInicio: string;
  fechaFin: string;
  responsable: string;
  estado: 'Pendiente' | 'En Progreso' | 'Completado' | 'Retrasado';
  porcentajeAvance: number;
}

export interface ObjetivoAuditoria {
  id: string;
  descripcion: string;
  tipo: 'General' | 'Específico';
  alcance?: string;
}

export interface CriterioAuditoria {
  id: string;
  norma: string;
  descripcion: string;
  referencia?: string;
}

export interface DocumentoAuditoria {
  id: string;
  nombre: string;
  tipo: string;
  fechaCreacion: string;
  creadoPor: string;
  url?: string;
  carpetaId?: string; // Referencia a Gestión Documental (RF014)
}

// ============ MODELO PRINCIPAL ============

export interface AuditoriaGlobal {
  // Identificación
  id: string;
  codigo: string;
  nombre: string;
  tipo: TipoAuditoria;
  
  // Estado y fechas
  estado: EstadoAuditoria;
  fechaCreacion: string;
  fechaActualizacion: string;
  
  // Proceso auditado
  proceso: ProcesoAuditado;
  
  // Equipo auditor
  equipoAuditor: MiembroEquipo[];
  auditorLider: MiembroEquipo;
  
  // Planificación
  cronograma: Cronograma;
  objetivos: ObjetivoAuditoria[];
  alcance: string;
  criterios: CriterioAuditoria[];
  
  // Riesgos
  riesgosIdentificados: string[];
  nivelesRiesgo: {
    inherente: CategoriaRiesgo;
    residual: CategoriaRiesgo;
  };
  
  // Documentos
  documentos: DocumentoAuditoria[];
  
  // Metadata
  creadoPor: string;
  actualizadoPor: string;
  
  // Referencias
  planAnualId?: string; // Origen en RF001
  programaAnualId?: string; // Origen en RF003
  planIndividualId?: string; // Detalle en RF004
  
  // Resultados
  hallazgosIds: string[]; // Referencias a RF010
  planesIds: string[]; // Referencias a RF011
  
  // Observaciones
  observaciones: string;
  notas: string[];
}

// ============ CONTEXTO ============

interface AuditoriaContextType {
  // Estado actual
  auditoria: AuditoriaGlobal | null;
  auditorias: AuditoriaGlobal[];
  cargando: boolean;
  
  // Acciones CRUD
  seleccionarAuditoria: (id: string) => void;
  crearAuditoria: (auditoria: Partial<AuditoriaGlobal>) => Promise<AuditoriaGlobal>;
  actualizarAuditoria: (id: string, datos: Partial<AuditoriaGlobal>) => Promise<void>;
  eliminarAuditoria: (id: string) => Promise<void>;
  
  // Acciones de estado
  cambiarEstado: (id: string, nuevoEstado: EstadoAuditoria) => Promise<void>;
  avanzarEtapa: (id: string) => Promise<void>;
  
  // Acciones de equipo
  agregarMiembro: (auditoriaId: string, miembro: MiembroEquipo) => Promise<void>;
  removerMiembro: (auditoriaId: string, miembroId: string) => Promise<void>;
  cambiarAuditorLider: (auditoriaId: string, nuevoLider: MiembroEquipo) => Promise<void>;
  
  // Acciones de documentos
  agregarDocumento: (auditoriaId: string, documento: DocumentoAuditoria) => Promise<void>;
  
  // Acciones de hallazgos y planes
  vincularHallazgo: (auditoriaId: string, hallazgoId: string) => Promise<void>;
  vincularPlan: (auditoriaId: string, planId: string) => Promise<void>;
  
  // Utilidades
  obtenerPorCodigo: (codigo: string) => AuditoriaGlobal | undefined;
  obtenerPorEstado: (estado: EstadoAuditoria) => AuditoriaGlobal[];
  limpiarSeleccion: () => void;
}

const AuditoriaContext = createContext<AuditoriaContextType | undefined>(undefined);

// ============ PROVIDER ============

export function AuditoriaGlobalProvider({ children }: { children: ReactNode }) {
  const [auditoria, setAuditoria] = useState<AuditoriaGlobal | null>(null);
  const [auditorias, setAuditorias] = useState<AuditoriaGlobal[]>([]);
  const [cargando, setCargando] = useState(false);

  // Cargar auditorías (simularía una llamada a API)
  useEffect(() => {
    cargarAuditorias();
  }, []);

  const cargarAuditorias = async () => {
    setCargando(true);
    // Aquí iría la llamada a la API
    // Por ahora usamos datos mock
    setCargando(false);
  };

  const seleccionarAuditoria = (id: string) => {
    const auditoriaEncontrada = auditorias.find(a => a.id === id);
    if (auditoriaEncontrada) {
      setAuditoria(auditoriaEncontrada);
      // Guardar en localStorage para persistencia entre módulos
      localStorage.setItem('auditoriaActual', JSON.stringify(auditoriaEncontrada));
    }
  };

  const crearAuditoria = async (datos: Partial<AuditoriaGlobal>): Promise<AuditoriaGlobal> => {
    const nuevaAuditoria: AuditoriaGlobal = {
      id: `aud-${Date.now()}`,
      codigo: datos.codigo || `AUD-${new Date().getFullYear()}-${String(auditorias.length + 1).padStart(3, '0')}`,
      nombre: datos.nombre || '',
      tipo: datos.tipo || 'Gestión',
      estado: 'Programada',
      fechaCreacion: new Date().toISOString().split('T')[0],
      fechaActualizacion: new Date().toISOString().split('T')[0],
      proceso: datos.proceso || {} as ProcesoAuditado,
      equipoAuditor: datos.equipoAuditor || [],
      auditorLider: datos.auditorLider || {} as MiembroEquipo,
      cronograma: datos.cronograma || { fechaInicio: '', fechaFin: '', duracionDias: 0, hitos: [] },
      objetivos: datos.objetivos || [],
      alcance: datos.alcance || '',
      criterios: datos.criterios || [],
      riesgosIdentificados: datos.riesgosIdentificados || [],
      nivelesRiesgo: datos.nivelesRiesgo || { inherente: 'Medio', residual: 'Bajo' },
      documentos: datos.documentos || [],
      creadoPor: datos.creadoPor || 'Sistema',
      actualizadoPor: datos.actualizadoPor || 'Sistema',
      hallazgosIds: [],
      planesIds: [],
      observaciones: datos.observaciones || '',
      notas: datos.notas || [],
      ...datos
    };

    setAuditorias(prev => [...prev, nuevaAuditoria]);
    setAuditoria(nuevaAuditoria);
    
    return nuevaAuditoria;
  };

  const actualizarAuditoria = async (id: string, datos: Partial<AuditoriaGlobal>) => {
    setAuditorias(prev => prev.map(a => 
      a.id === id 
        ? { ...a, ...datos, fechaActualizacion: new Date().toISOString().split('T')[0] }
        : a
    ));

    if (auditoria?.id === id) {
      setAuditoria(prev => prev ? { ...prev, ...datos } : null);
    }
  };

  const eliminarAuditoria = async (id: string) => {
    setAuditorias(prev => prev.filter(a => a.id !== id));
    if (auditoria?.id === id) {
      setAuditoria(null);
    }
  };

  const cambiarEstado = async (id: string, nuevoEstado: EstadoAuditoria) => {
    await actualizarAuditoria(id, { estado: nuevoEstado });
  };

  const avanzarEtapa = async (id: string) => {
    const aud = auditorias.find(a => a.id === id);
    if (!aud) return;

    const siguienteEstado: Record<EstadoAuditoria, EstadoAuditoria> = {
      'Programada': 'Planeación',
      'Planeación': 'Ejecución',
      'Ejecución': 'Comunicación',
      'Comunicación': 'Seguimiento',
      'Seguimiento': 'Finalizada',
      'Finalizada': 'Finalizada',
      'Cancelada': 'Cancelada',
      'Reprogramada': 'Planeación'
    };

    await cambiarEstado(id, siguienteEstado[aud.estado]);
  };

  const agregarMiembro = async (auditoriaId: string, miembro: MiembroEquipo) => {
    const aud = auditorias.find(a => a.id === auditoriaId);
    if (!aud) return;

    await actualizarAuditoria(auditoriaId, {
      equipoAuditor: [...aud.equipoAuditor, miembro]
    });
  };

  const removerMiembro = async (auditoriaId: string, miembroId: string) => {
    const aud = auditorias.find(a => a.id === auditoriaId);
    if (!aud) return;

    await actualizarAuditoria(auditoriaId, {
      equipoAuditor: aud.equipoAuditor.filter(m => m.id !== miembroId)
    });
  };

  const cambiarAuditorLider = async (auditoriaId: string, nuevoLider: MiembroEquipo) => {
    await actualizarAuditoria(auditoriaId, { auditorLider: nuevoLider });
  };

  const agregarDocumento = async (auditoriaId: string, documento: DocumentoAuditoria) => {
    const aud = auditorias.find(a => a.id === auditoriaId);
    if (!aud) return;

    await actualizarAuditoria(auditoriaId, {
      documentos: [...aud.documentos, documento]
    });
  };

  const vincularHallazgo = async (auditoriaId: string, hallazgoId: string) => {
    const aud = auditorias.find(a => a.id === auditoriaId);
    if (!aud) return;

    await actualizarAuditoria(auditoriaId, {
      hallazgosIds: [...aud.hallazgosIds, hallazgoId]
    });
  };

  const vincularPlan = async (auditoriaId: string, planId: string) => {
    const aud = auditorias.find(a => a.id === auditoriaId);
    if (!aud) return;

    await actualizarAuditoria(auditoriaId, {
      planesIds: [...aud.planesIds, planId]
    });
  };

  const obtenerPorCodigo = (codigo: string) => {
    return auditorias.find(a => a.codigo === codigo);
  };

  const obtenerPorEstado = (estado: EstadoAuditoria) => {
    return auditorias.filter(a => a.estado === estado);
  };

  const limpiarSeleccion = () => {
    setAuditoria(null);
    localStorage.removeItem('auditoriaActual');
  };

  const value: AuditoriaContextType = {
    auditoria,
    auditorias,
    cargando,
    seleccionarAuditoria,
    crearAuditoria,
    actualizarAuditoria,
    eliminarAuditoria,
    cambiarEstado,
    avanzarEtapa,
    agregarMiembro,
    removerMiembro,
    cambiarAuditorLider,
    agregarDocumento,
    vincularHallazgo,
    vincularPlan,
    obtenerPorCodigo,
    obtenerPorEstado,
    limpiarSeleccion
  };

  return (
    <AuditoriaContext.Provider value={value}>
      {children}
    </AuditoriaContext.Provider>
  );
}

// ============ HOOK ============

export function useAuditoria() {
  const context = useContext(AuditoriaContext);
  if (context === undefined) {
    throw new Error('useAuditoria debe usarse dentro de AuditoriaGlobalProvider');
  }
  return context;
}

// ============ UTILIDADES ============

export const estadosAuditoria: EstadoAuditoria[] = [
  'Programada',
  'Planeación',
  'Ejecución',
  'Comunicación',
  'Seguimiento',
  'Finalizada',
  'Cancelada',
  'Reprogramada'
];

export const tiposAuditoria: TipoAuditoria[] = [
  'Gestión',
  'Cumplimiento',
  'Financiera',
  'Sistemas',
  'Ambiental',
  'Desempeño'
];

export const categoriasRiesgo: CategoriaRiesgo[] = [
  'Muy Alto',
  'Alto',
  'Medio',
  'Bajo',
  'Muy Bajo'
];

export function getColorEstado(estado: EstadoAuditoria): string {
  const colores: Record<EstadoAuditoria, string> = {
    'Programada': '#3B82F6',
    'Planeación': '#F59E0B',
    'Ejecución': '#10B981',
    'Comunicación': '#8B5CF6',
    'Seguimiento': '#06B6D4',
    'Finalizada': '#6B7280',
    'Cancelada': '#EF4444',
    'Reprogramada': '#F97316'
  };
  return colores[estado];
}

export function calcularProgreso(auditoria: AuditoriaGlobal): number {
  const estadosProgreso: Record<EstadoAuditoria, number> = {
    'Programada': 0,
    'Planeación': 25,
    'Ejecución': 50,
    'Comunicación': 75,
    'Seguimiento': 90,
    'Finalizada': 100,
    'Cancelada': 0,
    'Reprogramada': 0
  };
  return estadosProgreso[auditoria.estado];
}
