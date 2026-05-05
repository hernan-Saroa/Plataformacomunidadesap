/**
 * PTA Context - Estado Global del Plan de Trabajo Académico
 * Maneja toda la lógica de estado y persistencia del PTA
 * 
 * ✅ INTEGRADO CON MÓDULO DE PERSONAS
 * Versión: 2.0.0 - Integración Personas ↔ PTA
 * Fecha: 2026-01-03
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { personasPTAIntegrationService } from '../services/personasPTAIntegrationService';
import type { DocentePTA } from '../types/integracion-personas-pta';

// ============================================================================
// TYPES
// ============================================================================

export interface Asignatura {
  id: string;
  asignaturaId: string;
  asignaturaNombre: string;
  codigo: string;
  programa: string;
  territorial: string;
  grupo: string;
  cetap: string;
  creditos: number;
  horasCalculadas: number;
  evidencias: Archivo[];
  fechaCreacion: string;
}

export interface ActividadInvestigacion {
  id: string;
  tipo: 'proyecto' | 'articulo' | 'libro' | 'grupo';
  nombre: string;
  descripcion: string;
  horas: number;
  evidencias: Archivo[];
  fechaCreacion: string;
}

export interface ActividadExtension {
  id: string;
  tipo: 'capacitacion' | 'asesoria' | 'consultoria' | 'extension';
  nombre: string;
  descripcion: string;
  horas: number;
  evidencias: Archivo[];
  fechaCreacion: string;
}

export interface ActividadComplementaria {
  id: string;
  tipo: 'tutoria' | 'comite' | 'direccion' | 'representacion' | 'otra';
  nombre: string;
  descripcion: string;
  horas: number;
  evidencias: Archivo[];
  fechaCreacion: string;
}

export interface Archivo {
  id: string;
  nombre: string;
  tamaño: number;
  tipo: string;
  url?: string;
  estado: 'cargando' | 'completado' | 'error';
  progreso: number;
  mensajeError?: string;
  fechaCarga: string;
}

export interface PTAData {
  id: string;
  docenteId: string; // Mantener por compatibilidad
  personId: string; // ✅ NUEVO: ID de la persona en el módulo de Personas
  periodo: string;
  horasBase: number;
  estado: 'Borrador' | 'En Concertación' | 'En Aprobación' | 'Aprobado' | 'En Firme' | 'Rechazado';
  fechaCreacion: string;
  fechaActualizacion: string;
  fechaLimite: string;
  
  // ✅ NUEVO: Información del docente desde Personas
  docenteInfo?: DocentePTA;
  
  // Componentes
  asignaturas: Asignatura[];
  actividadesInvestigacion: ActividadInvestigacion[];
  actividadesExtension: ActividadExtension[];
  actividadesComplementarias: ActividadComplementaria[];
  
  // Radicado (cuando se envía)
  radicado?: string;
  fechaEnvio?: string;
}

// ============================================================================
// CONTEXT
// ============================================================================

interface PTAContextType {
  pta: PTAData | null;
  
  // ✅ NUEVO: Información del docente actual
  docenteActual: DocentePTA | null;
  
  // Acciones generales
  inicializarPTA: (docenteId: string, periodo: string, horasBase: number) => void;
  inicializarPTAConPersonId: (personId: string, periodo: string) => Promise<void>; // ✅ NUEVO
  cargarPTA: (ptaId: string) => Promise<void>;
  guardarPTA: () => Promise<void>;
  
  // Asignaturas (Docencia)
  agregarAsignatura: (asignatura: Omit<Asignatura, 'id' | 'evidencias' | 'fechaCreacion'>) => void;
  editarAsignatura: (id: string, cambios: Partial<Asignatura>) => void;
  eliminarAsignatura: (id: string) => void;
  
  // Investigación
  agregarActividadInvestigacion: (actividad: Omit<ActividadInvestigacion, 'id' | 'evidencias' | 'fechaCreacion'>) => void;
  editarActividadInvestigacion: (id: string, cambios: Partial<ActividadInvestigacion>) => void;
  eliminarActividadInvestigacion: (id: string) => void;
  
  // Extensión
  agregarActividadExtension: (actividad: Omit<ActividadExtension, 'id' | 'evidencias' | 'fechaCreacion'>) => void;
  editarActividadExtension: (id: string, cambios: Partial<ActividadExtension>) => void;
  eliminarActividadExtension: (id: string) => void;
  
  // Complementarias
  agregarActividadComplementaria: (actividad: Omit<ActividadComplementaria, 'id' | 'evidencias' | 'fechaCreacion'>) => void;
  editarActividadComplementaria: (id: string, cambios: Partial<ActividadComplementaria>) => void;
  eliminarActividadComplementaria: (id: string) => void;
  
  // Evidencias
  agregarEvidencias: (componenteId: string, tipo: 'asignatura' | 'investigacion' | 'extension' | 'complementaria', archivos: Archivo[]) => void;
  eliminarEvidencia: (componenteId: string, tipo: 'asignatura' | 'investigacion' | 'extension' | 'complementaria', archivoId: string) => void;
  
  // Envío
  enviarAAprobacion: () => Promise<string>; // Retorna radicado
  
  // Cálculos
  calcularHorasTotales: () => number;
  calcularHorasDocencia: () => number;
  calcularHorasInvestigacion: () => number;
  calcularHorasExtension: () => number;
  calcularHorasComplementarias: () => number;
  calcularEvidenciasCompletas: () => { completas: number; totales: number };
  
  // Loading states
  isLoading: boolean;
  isSaving: boolean;
}

const PTAContext = createContext<PTAContextType | undefined>(undefined);

// ============================================================================
// PROVIDER
// ============================================================================

export function PTAProvider({ children }: { children: ReactNode }) {
  const [pta, setPTA] = useState<PTAData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [docenteActual, setDocenteActual] = useState<DocentePTA | null>(null);

  // Guardar en localStorage automáticamente
  useEffect(() => {
    if (pta) {
      localStorage.setItem(`pta_${pta.id}`, JSON.stringify(pta));
    }
  }, [pta]);

  // Inicializar nuevo PTA
  const inicializarPTA = (docenteId: string, periodo: string, horasBase: number) => {
    const nuevoPTA: PTAData = {
      id: `PTA-${Date.now()}`,
      docenteId,
      personId: '', // ✅ NUEVO: Inicializar vacío
      periodo,
      horasBase,
      estado: 'Borrador',
      fechaCreacion: new Date().toISOString(),
      fechaActualizacion: new Date().toISOString(),
      fechaLimite: '2025-12-15',
      asignaturas: [],
      actividadesInvestigacion: [],
      actividadesExtension: [],
      actividadesComplementarias: []
    };
    
    setPTA(nuevoPTA);
  };

  // Inicializar PTA con personId
  const inicializarPTAConPersonId = async (personId: string, periodo: string) => {
    setIsLoading(true);
    try {
      // Obtener información del docente desde Personas
      const docenteInfo = personasPTAIntegrationService.buscarDocente({ personId });
      if (!docenteInfo) {
        throw new Error('No se pudo obtener la información del docente');
      }
      
      const nuevoPTA: PTAData = {
        id: `PTA-${Date.now()}`,
        docenteId: docenteInfo.userId, // ID del usuario
        personId,
        periodo,
        horasBase: docenteInfo.horasProgramables,
        estado: 'Borrador',
        fechaCreacion: new Date().toISOString(),
        fechaActualizacion: new Date().toISOString(),
        fechaLimite: '2025-12-15',
        docenteInfo, // ✅ Información completa del docente
        asignaturas: [],
        actividadesInvestigacion: [],
        actividadesExtension: [],
        actividadesComplementarias: []
      };
      
      setPTA(nuevoPTA);
      setDocenteActual(docenteInfo);
    } catch (error: any) {
      console.error('[PTAContext] Error al inicializar PTA:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar PTA existente
  const cargarPTA = async (ptaId: string) => {
    setIsLoading(true);
    try {
      // Simular carga desde API
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Intentar cargar desde localStorage
      const stored = localStorage.getItem(`pta_${ptaId}`);
      if (stored) {
        setPTA(JSON.parse(stored));
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Guardar PTA
  const guardarPTA = async () => {
    if (!pta) return;
    
    setIsSaving(true);
    try {
      // Simular guardado en API
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Actualizar fecha de modificación
      setPTA(prev => prev ? {
        ...prev,
        fechaActualizacion: new Date().toISOString()
      } : null);
    } finally {
      setIsSaving(false);
    }
  };

  // ============================================================================
  // ASIGNATURAS
  // ============================================================================

  const agregarAsignatura = (asignatura: Omit<Asignatura, 'id' | 'evidencias' | 'fechaCreacion'>) => {
    if (!pta) return;
    
    const nueva: Asignatura = {
      ...asignatura,
      id: `ASG-${Date.now()}`,
      evidencias: [],
      fechaCreacion: new Date().toISOString()
    };
    
    setPTA(prev => prev ? {
      ...prev,
      asignaturas: [...prev.asignaturas, nueva],
      fechaActualizacion: new Date().toISOString()
    } : null);
  };

  const editarAsignatura = (id: string, cambios: Partial<Asignatura>) => {
    if (!pta) return;
    
    setPTA(prev => prev ? {
      ...prev,
      asignaturas: prev.asignaturas.map(a => 
        a.id === id ? { ...a, ...cambios } : a
      ),
      fechaActualizacion: new Date().toISOString()
    } : null);
  };

  const eliminarAsignatura = (id: string) => {
    if (!pta) return;
    
    setPTA(prev => prev ? {
      ...prev,
      asignaturas: prev.asignaturas.filter(a => a.id !== id),
      fechaActualizacion: new Date().toISOString()
    } : null);
  };

  // ============================================================================
  // INVESTIGACIÓN
  // ============================================================================

  const agregarActividadInvestigacion = (actividad: Omit<ActividadInvestigacion, 'id' | 'evidencias' | 'fechaCreacion'>) => {
    if (!pta) return;
    
    const nueva: ActividadInvestigacion = {
      ...actividad,
      id: `INV-${Date.now()}`,
      evidencias: [],
      fechaCreacion: new Date().toISOString()
    };
    
    setPTA(prev => prev ? {
      ...prev,
      actividadesInvestigacion: [...prev.actividadesInvestigacion, nueva],
      fechaActualizacion: new Date().toISOString()
    } : null);
  };

  const editarActividadInvestigacion = (id: string, cambios: Partial<ActividadInvestigacion>) => {
    if (!pta) return;
    
    setPTA(prev => prev ? {
      ...prev,
      actividadesInvestigacion: prev.actividadesInvestigacion.map(a => 
        a.id === id ? { ...a, ...cambios } : a
      ),
      fechaActualizacion: new Date().toISOString()
    } : null);
  };

  const eliminarActividadInvestigacion = (id: string) => {
    if (!pta) return;
    
    setPTA(prev => prev ? {
      ...prev,
      actividadesInvestigacion: prev.actividadesInvestigacion.filter(a => a.id !== id),
      fechaActualizacion: new Date().toISOString()
    } : null);
  };

  // ============================================================================
  // EXTENSIÓN
  // ============================================================================

  const agregarActividadExtension = (actividad: Omit<ActividadExtension, 'id' | 'evidencias' | 'fechaCreacion'>) => {
    if (!pta) return;
    
    const nueva: ActividadExtension = {
      ...actividad,
      id: `EXT-${Date.now()}`,
      evidencias: [],
      fechaCreacion: new Date().toISOString()
    };
    
    setPTA(prev => prev ? {
      ...prev,
      actividadesExtension: [...prev.actividadesExtension, nueva],
      fechaActualizacion: new Date().toISOString()
    } : null);
  };

  const editarActividadExtension = (id: string, cambios: Partial<ActividadExtension>) => {
    if (!pta) return;
    
    setPTA(prev => prev ? {
      ...prev,
      actividadesExtension: prev.actividadesExtension.map(a => 
        a.id === id ? { ...a, ...cambios } : a
      ),
      fechaActualizacion: new Date().toISOString()
    } : null);
  };

  const eliminarActividadExtension = (id: string) => {
    if (!pta) return;
    
    setPTA(prev => prev ? {
      ...prev,
      actividadesExtension: prev.actividadesExtension.filter(a => a.id !== id),
      fechaActualizacion: new Date().toISOString()
    } : null);
  };

  // ============================================================================
  // COMPLEMENTARIAS
  // ============================================================================

  const agregarActividadComplementaria = (actividad: Omit<ActividadComplementaria, 'id' | 'evidencias' | 'fechaCreacion'>) => {
    if (!pta) return;
    
    const nueva: ActividadComplementaria = {
      ...actividad,
      id: `COM-${Date.now()}`,
      evidencias: [],
      fechaCreacion: new Date().toISOString()
    };
    
    setPTA(prev => prev ? {
      ...prev,
      actividadesComplementarias: [...prev.actividadesComplementarias, nueva],
      fechaActualizacion: new Date().toISOString()
    } : null);
  };

  const editarActividadComplementaria = (id: string, cambios: Partial<ActividadComplementaria>) => {
    if (!pta) return;
    
    setPTA(prev => prev ? {
      ...prev,
      actividadesComplementarias: prev.actividadesComplementarias.map(a => 
        a.id === id ? { ...a, ...cambios } : a
      ),
      fechaActualizacion: new Date().toISOString()
    } : null);
  };

  const eliminarActividadComplementaria = (id: string) => {
    if (!pta) return;
    
    setPTA(prev => prev ? {
      ...prev,
      actividadesComplementarias: prev.actividadesComplementarias.filter(a => a.id !== id),
      fechaActualizacion: new Date().toISOString()
    } : null);
  };

  // ============================================================================
  // EVIDENCIAS
  // ============================================================================

  const agregarEvidencias = (
    componenteId: string,
    tipo: 'asignatura' | 'investigacion' | 'extension' | 'complementaria',
    archivos: Archivo[]
  ) => {
    if (!pta) return;
    
    setPTA(prev => {
      if (!prev) return null;
      
      const actualizar = (items: any[]) => 
        items.map(item => 
          item.id === componenteId
            ? { ...item, evidencias: [...item.evidencias, ...archivos] }
            : item
        );
      
      switch (tipo) {
        case 'asignatura':
          return { ...prev, asignaturas: actualizar(prev.asignaturas) };
        case 'investigacion':
          return { ...prev, actividadesInvestigacion: actualizar(prev.actividadesInvestigacion) };
        case 'extension':
          return { ...prev, actividadesExtension: actualizar(prev.actividadesExtension) };
        case 'complementaria':
          return { ...prev, actividadesComplementarias: actualizar(prev.actividadesComplementarias) };
        default:
          return prev;
      }
    });
  };

  const eliminarEvidencia = (
    componenteId: string,
    tipo: 'asignatura' | 'investigacion' | 'extension' | 'complementaria',
    archivoId: string
  ) => {
    if (!pta) return;
    
    setPTA(prev => {
      if (!prev) return null;
      
      const actualizar = (items: any[]) => 
        items.map(item => 
          item.id === componenteId
            ? { ...item, evidencias: item.evidencias.filter((e: Archivo) => e.id !== archivoId) }
            : item
        );
      
      switch (tipo) {
        case 'asignatura':
          return { ...prev, asignaturas: actualizar(prev.asignaturas) };
        case 'investigacion':
          return { ...prev, actividadesInvestigacion: actualizar(prev.actividadesInvestigacion) };
        case 'extension':
          return { ...prev, actividadesExtension: actualizar(prev.actividadesExtension) };
        case 'complementaria':
          return { ...prev, actividadesComplementarias: actualizar(prev.actividadesComplementarias) };
        default:
          return prev;
      }
    });
  };

  // ============================================================================
  // ENVÍO
  // ============================================================================

  const enviarAAprobacion = async (): Promise<string> => {
    if (!pta) throw new Error('No hay PTA para enviar');
    
    setIsSaving(true);
    try {
      // Simular envío a API
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const radicado = `PTA-${pta.periodo}-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;
      
      setPTA(prev => prev ? {
        ...prev,
        estado: 'En Aprobación',
        radicado,
        fechaEnvio: new Date().toISOString(),
        fechaActualizacion: new Date().toISOString()
      } : null);
      
      return radicado;
    } finally {
      setIsSaving(false);
    }
  };

  // ============================================================================
  // CÁLCULOS
  // ============================================================================

  const calcularHorasDocencia = () => {
    if (!pta) return 0;
    return pta.asignaturas.reduce((total, a) => total + a.horasCalculadas, 0);
  };

  const calcularHorasInvestigacion = () => {
    if (!pta) return 0;
    return pta.actividadesInvestigacion.reduce((total, a) => total + a.horas, 0);
  };

  const calcularHorasExtension = () => {
    if (!pta) return 0;
    return pta.actividadesExtension.reduce((total, a) => total + a.horas, 0);
  };

  const calcularHorasComplementarias = () => {
    if (!pta) return 0;
    return pta.actividadesComplementarias.reduce((total, a) => total + a.horas, 0);
  };

  const calcularHorasTotales = () => {
    return (
      calcularHorasDocencia() +
      calcularHorasInvestigacion() +
      calcularHorasExtension() +
      calcularHorasComplementarias()
    );
  };

  const calcularEvidenciasCompletas = () => {
    if (!pta) return { completas: 0, totales: 0 };
    
    const totales = 
      pta.asignaturas.length +
      pta.actividadesInvestigacion.length +
      pta.actividadesExtension.length +
      pta.actividadesComplementarias.length;
    
    const completas = 
      pta.asignaturas.filter(a => a.evidencias.some(e => e.estado === 'completado')).length +
      pta.actividadesInvestigacion.filter(a => a.evidencias.some(e => e.estado === 'completado')).length +
      pta.actividadesExtension.filter(a => a.evidencias.some(e => e.estado === 'completado')).length +
      pta.actividadesComplementarias.filter(a => a.evidencias.some(e => e.estado === 'completado')).length;
    
    return { completas, totales };
  };

  // ============================================================================
  // CONTEXT VALUE
  // ============================================================================

  const value: PTAContextType = {
    pta,
    docenteActual,
    inicializarPTA,
    inicializarPTAConPersonId,
    cargarPTA,
    guardarPTA,
    agregarAsignatura,
    editarAsignatura,
    eliminarAsignatura,
    agregarActividadInvestigacion,
    editarActividadInvestigacion,
    eliminarActividadInvestigacion,
    agregarActividadExtension,
    editarActividadExtension,
    eliminarActividadExtension,
    agregarActividadComplementaria,
    editarActividadComplementaria,
    eliminarActividadComplementaria,
    agregarEvidencias,
    eliminarEvidencia,
    enviarAAprobacion,
    calcularHorasTotales,
    calcularHorasDocencia,
    calcularHorasInvestigacion,
    calcularHorasExtension,
    calcularHorasComplementarias,
    calcularEvidenciasCompletas,
    isLoading,
    isSaving
  };

  return <PTAContext.Provider value={value}>{children}</PTAContext.Provider>;
}

// ============================================================================
// HOOK
// ============================================================================

export function usePTA() {
  const context = useContext(PTAContext);
  if (context === undefined) {
    throw new Error('usePTA must be used within a PTAProvider');
  }
  return context;
}