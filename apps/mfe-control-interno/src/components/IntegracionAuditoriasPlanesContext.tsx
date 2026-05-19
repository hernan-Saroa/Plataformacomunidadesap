/**
 * CONTEXT: INTEGRACIÓN COMPLETA - CONTROL INTERNO DE GESTIÓN
 * 
 * Permite compartir datos entre TODOS los módulos de Control Interno:
 * 
 * FLUJO COMPLETO:
 * 1. Planeación → Auditorías (Programa Anual → Kanban)
 * 2. Auditorías → Planes de Mejoramiento (Hallazgos → Formulación)
 * 3. Planes → Expedientes (Plan Completado → Archivo Digital)
 * 4. Todo → Informes de Ley (Actualización automática)
 * 
 * VERSIÓN: 3.0 - INTEGRACIÓN COMPLETA
 * ÚLTIMA ACTUALIZACIÓN: 22 Enero 2025
 */

import { createContext, useContext, useState, ReactNode } from 'react';

// ============ TIPOS ============

export interface HallazgoAuditoria {
  id: string;
  titulo: string;
  gravedad: 'LEVE' | 'MODERADO' | 'GRAVE';
  descripcion: string;
  causas: string[];
  efectos: string[];
  recomendaciones: string[];
}

export interface AuditoriaParaPlan {
  id: string;
  codigo: string;
  nombre: string;
  areaResponsable: string;
  responsable: string;
  cargo: string;
  fechaFinalizacion: string;
  hallazgos: HallazgoAuditoria[];
  estadoPlan?: 'SIN_PLAN' | 'EN_FORMULACION' | 'ENVIADO' | 'APROBADO' | 'EN_SEGUIMIENTO' | 'COMPLETADO';
  fechaLimitePlan?: string; // 30 días después de finalización
  plazoFormulacion?: number; // días
}

export interface PlanMejoramientoCreado {
  auditoriaId: string;
  codigoAuditoria: string;
  fechaCreacion: string;
  estado: 'EN_FORMULACION' | 'ENVIADO' | 'APROBADO' | 'RECHAZADO' | 'EN_SEGUIMIENTO' | 'COMPLETADO';
  accionesCreadas: number;
  progresoGeneral: number;
}

// NUEVO: Interface para auditorías desde Planeación
export interface AuditoriaProgramada {
  codigo: string;
  titulo: string;
  descripcion: string;
  territorial: string;
  auditorLider: {
    nombre: string;
    cargo: string;
    iniciales: string;
  };
  fechaInicio: string;
  fechaFin: string;
  tipo: 'regular' | 'territorial' | 'especial';
  prioridad: 'crítica' | 'alta' | 'media' | 'baja';
  areaObjetivo: string;
  programaId: string;
  planAnualAño: number;
}

// NUEVO: Interface para expedientes
export interface ExpedienteDigital {
  id: string;
  auditoriaId: string;
  codigoAuditoria: string;
  planMejoramientoId?: string;
  fechaGeneracion: string;
  documentos: {
    tipo: string;
    nombre: string;
    url: string;
    fecha: string;
  }[];
  metadatos: {
    duracionTotal: number; // días
    hallazgos: number;
    hallazgosResueltos: number;
    cumplimientoPlan?: number; // porcentaje
  };
  estado: 'GENERADO' | 'ARCHIVADO';
}

interface IntegracionContextType {
  // ━━━━━━━━━━━ AUDITORÍAS ↔ PLANES DE MEJORAMIENTO ━━━━━━━━━━━
  
  // Auditoría seleccionada para crear plan
  auditoriaSeleccionada: AuditoriaParaPlan | null;
  seleccionarAuditoria: (auditoria: AuditoriaParaPlan) => void;
  limpiarSeleccion: () => void;

  // Lista de auditorías que requieren plan
  auditoriasConHallazgos: AuditoriaParaPlan[];
  agregarAuditoriaConHallazgos: (auditoria: AuditoriaParaPlan) => void;
  actualizarEstadoPlan: (auditoriaId: string, estado: AuditoriaParaPlan['estadoPlan']) => void;

  // Planes creados
  planesCreados: PlanMejoramientoCreado[];
  crearPlan: (plan: PlanMejoramientoCreado) => void;
  
  // ━━━━━━━━━━━ PLANEACIÓN → AUDITORÍAS (NUEVO) ━━━━━━━━━━━
  
  // Auditorías programadas (desde Planeación)
  auditoriasProgramadas: AuditoriaProgramada[];
  agregarAuditoriasProgramadas: (auditorias: AuditoriaProgramada[]) => void;
  limpiarAuditoriasProgramadas: () => void;
  
  // ━━━━━━━━━━━ PLANES → EXPEDIENTES (NUEVO) ━━━━━━━━━━━
  
  // Expedientes digitales
  expedientes: ExpedienteDigital[];
  generarExpediente: (expediente: ExpedienteDigital) => void;
  obtenerExpedientePorAuditoria: (auditoriaId: string) => ExpedienteDigital | undefined;

  // ━━━━━━━━━━━ NAVEGACIÓN ━━━━━━━━━━━
  
  navegarAFormulacion: boolean;
  setNavegarAFormulacion: (navegar: boolean) => void;

  // Ir a ver plan existente (sin abrir modal de crear)
  auditoriaIdParaVerPlan: string | null;
  navegarAVerPlan: (auditoriaId: string) => void;
  limpiarVerPlan: () => void;

  // NUEVO: Foco automático para abrir expedientes/planes desde notificaciones
  auditoriaIdFoco: string | null;
  setAuditoriaIdFoco: (id: string | null) => void;
  faseFoco: string | null;
  setFaseFoco: (fase: string | null) => void;
}

// ============ CONTEXT ============

const IntegracionContext = createContext<IntegracionContextType | undefined>(undefined);

// ============ PROVIDER ============

export function IntegracionAuditoriasPlanesProvider({ children }: { children: ReactNode }) {
  // Estados existentes
  const [auditoriaSeleccionada, setAuditoriaSeleccionada] = useState<AuditoriaParaPlan | null>(null);
  const [auditoriasConHallazgos, setAuditoriasConHallazgos] = useState<AuditoriaParaPlan[]>([]);
  const [planesCreados, setPlanesCreados] = useState<PlanMejoramientoCreado[]>([]);
  const [navegarAFormulacion, setNavegarAFormulacion] = useState(false);
  const [auditoriaIdParaVerPlan, setAuditoriaIdParaVerPlan] = useState<string | null>(null);
  const [auditoriaIdFoco, setAuditoriaIdFoco] = useState<string | null>(null);
  const [faseFoco, setFaseFoco] = useState<string | null>(null);
  
  // NUEVO: Estados para Planeación → Auditorías
  const [auditoriasProgramadas, setAuditoriasProgramadas] = useState<AuditoriaProgramada[]>([]);
  
  // NUEVO: Estados para Planes → Expedientes
  const [expedientes, setExpedientes] = useState<ExpedienteDigital[]>([]);

  // Funciones existentes
  const seleccionarAuditoria = (auditoria: AuditoriaParaPlan) => {
    setAuditoriaSeleccionada(auditoria);
    setNavegarAFormulacion(true);
  };

  const limpiarSeleccion = () => {
    setAuditoriaSeleccionada(null);
    setNavegarAFormulacion(false);
  };

  const navegarAVerPlan = (auditoriaId: string) => {
    setAuditoriaIdParaVerPlan(auditoriaId);
  };

  const limpiarVerPlan = () => {
    setAuditoriaIdParaVerPlan(null);
  };

  const agregarAuditoriaConHallazgos = (auditoria: AuditoriaParaPlan) => {
    setAuditoriasConHallazgos((prev) => {
      const existe = prev.find((a) => a.id === auditoria.id);
      if (existe) {
        return prev.map((a) => (a.id === auditoria.id ? auditoria : a));
      }
      return [...prev, auditoria];
    });
  };

  const actualizarEstadoPlan = (auditoriaId: string, estado: AuditoriaParaPlan['estadoPlan']) => {
    setAuditoriasConHallazgos((prev) =>
      prev.map((a) => (a.id === auditoriaId ? { ...a, estadoPlan: estado } : a))
    );
  };

  const crearPlan = (plan: PlanMejoramientoCreado) => {
    setPlanesCreados((prev) => [...prev, plan]);
    actualizarEstadoPlan(plan.auditoriaId, 'EN_FORMULACION');
  };
  
  // NUEVO: Funciones para Planeación → Auditorías
  const agregarAuditoriasProgramadas = (auditorias: AuditoriaProgramada[]) => {
    console.log('📋 Context: Agregando', auditorias.length, 'auditorías programadas');
    setAuditoriasProgramadas((prev) => [...prev, ...auditorias]);
  };
  
  const limpiarAuditoriasProgramadas = () => {
    setAuditoriasProgramadas([]);
  };
  
  // NUEVO: Funciones para Planes → Expedientes
  const generarExpediente = (expediente: ExpedienteDigital) => {
    console.log('📁 Context: Generando expediente', expediente.codigoAuditoria);
    setExpedientes((prev) => {
      // Evitar duplicados
      const existe = prev.find((e) => e.auditoriaId === expediente.auditoriaId);
      if (existe) {
        return prev.map((e) => 
          e.auditoriaId === expediente.auditoriaId ? expediente : e
        );
      }
      return [...prev, expediente];
    });
  };
  
  const obtenerExpedientePorAuditoria = (auditoriaId: string) => {
    return expedientes.find((e) => e.auditoriaId === auditoriaId);
  };

  return (
    <IntegracionContext.Provider
      value={{
        // Existentes
        auditoriaSeleccionada,
        seleccionarAuditoria,
        limpiarSeleccion,
        auditoriasConHallazgos,
        agregarAuditoriaConHallazgos,
        actualizarEstadoPlan,
        planesCreados,
        crearPlan,
        navegarAFormulacion,
        setNavegarAFormulacion,
        auditoriaIdParaVerPlan,
        navegarAVerPlan,
        limpiarVerPlan,

        // NUEVO: Planeación → Auditorías
        auditoriasProgramadas,
        agregarAuditoriasProgramadas,
        limpiarAuditoriasProgramadas,
        
        // NUEVO: Planes → Expedientes
        expedientes,
        generarExpediente,
        obtenerExpedientePorAuditoria,

        // NUEVO: Foco
        auditoriaIdFoco,
        setAuditoriaIdFoco,
        faseFoco,
        setFaseFoco,
      }}
    >
      {children}
    </IntegracionContext.Provider>
  );
}

// ============ HOOK ============

export function useIntegracionAuditoriaPlanes() {
  const context = useContext(IntegracionContext);
  if (context === undefined) {
    throw new Error('useIntegracionAuditoriaPlanes debe usarse dentro de IntegracionAuditoriasPlanesProvider');
  }
  return context;
}