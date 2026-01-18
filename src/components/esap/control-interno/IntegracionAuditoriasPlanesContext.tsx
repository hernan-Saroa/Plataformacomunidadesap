/**
 * CONTEXT: INTEGRACIÓN AUDITORÍAS ↔ PLANES DE MEJORAMIENTO
 * 
 * Permite compartir datos entre el Dashboard Kanban y Planes de Mejoramiento
 * para implementar el flujo completo:
 * 
 * Auditoría Finalizada → Crear Plan → Formular Acciones → Seguimiento
 */

import { createContext, useContext, useState, ReactNode, useMemo } from 'react';

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

interface IntegracionContextType {
  // Auditoría seleccionada para crear plan
  auditoriaSeleccionada: AuditoriaParaPlan | null;
  seleccionarAuditoria: (auditoria: AuditoriaParaPlan) => void;
  limpiarSeleccion: () => void;

  // Lista de auditorías que requieren plan
  auditoriasConHallazgos: AuditoriaParaPlan[];
  agregarAuditoriaConHallazgos: (auditoria: AuditoriaParaPlan) => void;
  limpiarAuditoriasConHallazgos: () => void; // Nuevo método para limpiar
  actualizarEstadoPlan: (auditoriaId: string, estado: AuditoriaParaPlan['estadoPlan']) => void;

  // Planes creados
  planesCreados: PlanMejoramientoCreado[];
  crearPlan: (plan: PlanMejoramientoCreado) => void;

  // Navegación
  navegarAFormulacion: boolean;
  setNavegarAFormulacion: (navegar: boolean) => void;
}

// ============ CONTEXT ============

const IntegracionContext = createContext<IntegracionContextType | undefined>(undefined);

// ============ PROVIDER ============

export function IntegracionAuditoriasPlanesProvider({ children }: { children: ReactNode }) {
  const [auditoriaSeleccionada, setAuditoriaSeleccionada] = useState<AuditoriaParaPlan | null>(null);
  const [auditoriasConHallazgos, setAuditoriasConHallazgos] = useState<AuditoriaParaPlan[]>([]);
  const [planesCreados, setPlanesCreados] = useState<PlanMejoramientoCreado[]>([]);
  const [navegarAFormulacion, setNavegarAFormulacion] = useState(false);

  const seleccionarAuditoria = (auditoria: AuditoriaParaPlan) => {
    setAuditoriaSeleccionada(auditoria);
    setNavegarAFormulacion(true);
  };

  const limpiarSeleccion = () => {
    setAuditoriaSeleccionada(null);
    setNavegarAFormulacion(false);
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

  const limpiarAuditoriasConHallazgos = () => {
    setAuditoriasConHallazgos([]);
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

  const value = useMemo(() => ({
    auditoriaSeleccionada,
    seleccionarAuditoria,
    limpiarSeleccion,
    auditoriasConHallazgos,
    agregarAuditoriaConHallazgos,
    limpiarAuditoriasConHallazgos,
    actualizarEstadoPlan,
    planesCreados,
    crearPlan,
    navegarAFormulacion,
    setNavegarAFormulacion,
  }), [
    auditoriaSeleccionada,
    auditoriasConHallazgos,
    planesCreados,
    navegarAFormulacion
  ]);

  return (
    <IntegracionContext.Provider value={value}>
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
