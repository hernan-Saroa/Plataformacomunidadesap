/**
 * CONTEXTO GLOBAL DE CONTROL INTERNO
 * Maneja el estado compartido entre RF001, RF002, RF003 y RF004
 * Permite navegación fluida y transferencia de datos entre módulos
 */

import { createContext, useContext, useState, ReactNode } from 'react';

// ============ TIPOS ============

export interface ProcesoUniverso {
  id: string;
  codigo: string;
  proceso: string;
  macroproceso: string;
  tipoProceso: 'Misional' | 'Apoyo' | 'Estratégico' | 'Evaluación';
  tipoSede: 'Sede Principal' | 'Territorial';
  territorial?: string;
  nivelRiesgo: 'BAJO' | 'MEDIO' | 'ALTO' | 'CRÍTICO';
  añoPriorizacion: string;
  responsable: string;
  estado: 'Disponible' | 'Programada' | 'En Ejecución';
}

export interface AuditoriaProgramada {
  id: string;
  codigo: string;
  procesoAuditable: string;
  tipoProceso: 'Misional' | 'Apoyo' | 'Estratégico' | 'Evaluación';
  tipoSede: 'Sede Principal' | 'Territorial';
  territorial?: string;
  nivelRiesgo: 'BAJO' | 'MEDIO' | 'ALTO' | 'CRÍTICO';
  añoPriorizacion: string;
  auditorLider?: string;
  equipoAuditor?: string[];
  fechas: {
    planeacion: { inicio: string; fin: string; duracionDias: number };
    ejecucion: { inicio: string; fin: string; duracionDias: number };
    comunicacion: { inicio: string; fin: string; duracionDias: number };
  };
  estado: 'Programada' | 'En Ejecución' | 'Completada' | 'Cancelada';
  observaciones: string;
  responsableArea?: string;
  emailResponsable?: string;
}

export interface PlanIndividual {
  id: string;
  codigo: string;
  auditoriaOrigenId: string;
  procesoAuditable: string;
  alcance: string;
  objetivos: string[];
  riesgos: string[];
  criteriosAuditoria: any[];
  estado: 'Borrador' | 'Aprobado' | 'Notificado' | 'En Ejecución';
  fechaCreacion: string;
  creadoPor: string;
}

export interface FlujoNavegacion {
  desde?: 'plan-anual' | 'universo-auditorias' | 'programa-anual' | 'plan-individual';
  hacia?: 'plan-anual' | 'universo-auditorias' | 'programa-anual' | 'plan-individual';
  datos?: any;
  accion?: string;
}

interface ControlInternoContextType {
  // Estado compartido
  universoProcesos: ProcesoUniverso[];
  auditoriasProgramadas: AuditoriaProgramada[];
  planesIndividuales: PlanIndividual[];
  
  // Selecciones activas
  procesoSeleccionado: ProcesoUniverso | null;
  auditoriaProgramadaSeleccionada: AuditoriaProgramada | null;
  planIndividualSeleccionado: PlanIndividual | null;
  
  // Navegación
  flujoNavegacion: FlujoNavegacion | null;
  
  // Métodos de actualización
  setUniversoProcesos: (procesos: ProcesoUniverso[]) => void;
  setAuditoriasProgramadas: (auditorias: AuditoriaProgramada[]) => void;
  setPlanesIndividuales: (planes: PlanIndividual[]) => void;
  
  setProcesoSeleccionado: (proceso: ProcesoUniverso | null) => void;
  setAuditoriaProgramadaSeleccionada: (auditoria: AuditoriaProgramada | null) => void;
  setPlanIndividualSeleccionado: (plan: PlanIndividual | null) => void;
  
  setFlujoNavegacion: (flujo: FlujoNavegacion | null) => void;
  
  // Métodos de acción
  importarAPrograma: (procesosIds: string[]) => void;
  crearPlanIndividual: (auditoriaId: string) => void;
  
  // Estado del año fiscal
  añoFiscalActivo: number;
  setAñoFiscalActivo: (año: number) => void;
}

const ControlInternoContext = createContext<ControlInternoContextType | undefined>(undefined);

// ============ PROVIDER ============

export function ControlInternoProvider({ children }: { children: ReactNode }) {
  // Estado compartido
  const [universoProcesos, setUniversoProcesos] = useState<ProcesoUniverso[]>([]);
  const [auditoriasProgramadas, setAuditoriasProgramadas] = useState<AuditoriaProgramada[]>([]);
  const [planesIndividuales, setPlanesIndividuales] = useState<PlanIndividual[]>([]);
  
  // Selecciones activas
  const [procesoSeleccionado, setProcesoSeleccionado] = useState<ProcesoUniverso | null>(null);
  const [auditoriaProgramadaSeleccionada, setAuditoriaProgramadaSeleccionada] = useState<AuditoriaProgramada | null>(null);
  const [planIndividualSeleccionado, setPlanIndividualSeleccionado] = useState<PlanIndividual | null>(null);
  
  // Navegación
  const [flujoNavegacion, setFlujoNavegacion] = useState<FlujoNavegacion | null>(null);
  
  // Año fiscal
  const [añoFiscalActivo, setAñoFiscalActivo] = useState(2025);
  
  // Método para importar procesos del Universo al Programa Anual
  const importarAPrograma = (procesosIds: string[]) => {
    const procesosAImportar = universoProcesos.filter(p => procesosIds.includes(p.id));
    
    const nuevasAuditorias: AuditoriaProgramada[] = procesosAImportar.map(proceso => ({
      id: `aud-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      codigo: `AUD-${añoFiscalActivo}-${String(auditoriasProgramadas.length + 1).padStart(3, '0')}`,
      procesoAuditable: proceso.proceso,
      tipoProceso: proceso.tipoProceso,
      tipoSede: proceso.tipoSede,
      territorial: proceso.territorial,
      nivelRiesgo: proceso.nivelRiesgo,
      añoPriorizacion: proceso.añoPriorizacion,
      auditorLider: undefined,
      equipoAuditor: undefined,
      fechas: {
        planeacion: {
          inicio: '',
          fin: '',
          duracionDias: 0
        },
        ejecucion: {
          inicio: '',
          fin: '',
          duracionDias: 0
        },
        comunicacion: {
          inicio: '',
          fin: '',
          duracionDias: 0
        }
      },
      estado: 'Programada',
      observaciones: '',
      responsableArea: proceso.responsable,
      emailResponsable: ''
    }));
    
    setAuditoriasProgramadas([...auditoriasProgramadas, ...nuevasAuditorias]);
    
    // Actualizar estado en el universo
    setUniversoProcesos(
      universoProcesos.map(p => 
        procesosIds.includes(p.id) 
          ? { ...p, estado: 'Programada' as const }
          : p
      )
    );
  };
  
  // Método para crear plan individual desde auditoría programada
  const crearPlanIndividual = (auditoriaId: string) => {
    const auditoria = auditoriasProgramadas.find(a => a.id === auditoriaId);
    if (!auditoria) return;
    
    // Este método será llamado cuando se complete el wizard
    // El plan real se crea en el componente del wizard
    setAuditoriaProgramadaSeleccionada(auditoria);
  };
  
  const value: ControlInternoContextType = {
    universoProcesos,
    auditoriasProgramadas,
    planesIndividuales,
    procesoSeleccionado,
    auditoriaProgramadaSeleccionada,
    planIndividualSeleccionado,
    flujoNavegacion,
    setUniversoProcesos,
    setAuditoriasProgramadas,
    setPlanesIndividuales,
    setProcesoSeleccionado,
    setAuditoriaProgramadaSeleccionada,
    setPlanIndividualSeleccionado,
    setFlujoNavegacion,
    importarAPrograma,
    crearPlanIndividual,
    añoFiscalActivo,
    setAñoFiscalActivo
  };
  
  return (
    <ControlInternoContext.Provider value={value}>
      {children}
    </ControlInternoContext.Provider>
  );
}

// ============ HOOK ============

export function useControlInterno() {
  const context = useContext(ControlInternoContext);
  if (context === undefined) {
    throw new Error('useControlInterno debe usarse dentro de ControlInternoProvider');
  }
  return context;
}
