/**
 * GestionLegalFull - Sistema Integrado de Gestión Legal (SIGL v5.0)
 * Layout unificado con ModuleLayout compartido
 * DISEÑO 100% COHERENTE CON CONTROL INTERNO Y CONTROL DISCIPLINARIO
 */

import { useState, useEffect } from 'react';
import { 
  LayoutDashboard,
  Scale,
  Gavel,
  FileQuestion,
  Inbox,
  CalendarClock,
  Briefcase,
  Building2,
  DollarSign,
  Mail,
  Target,
  AlertTriangle,
  ClipboardCheck
} from 'lucide-react';
import { ModuleLayout, MenuItem } from '../../shared/ModuleLayout';

// Componentes de módulos V3 - DISEÑO UNIFICADO
import { DashboardEjecutivoSIGL } from './DashboardEjecutivoSIGL';
import { ModuloDefensaJudicialV3 } from '../modulos/ModuloDefensaJudicialV3';
import { ModuloJuzgamientoDisciplinarioV3 } from '../modulos/ModuloJuzgamientoDisciplinarioV3';
import { ModuloAsesoriaJuridicaV3 } from '../modulos/ModuloAsesoriaJuridicaV3';
import { ModuloCentroComunicacionesJuridicasV3 } from '../modulos/CentroComunicacionesJuridicasV3';
import { ModuloTerminosInformesV3 } from '../modulos/ModuloTerminosInformesV3';

// Componentes FASE 2 - 6 MÓDULOS ADICIONALES
import { OrganosControl } from '../modulos/OrganosControl';
import { ModuloProcesosCoactivosV3 } from '../modulos/ProcesosCoactivosV3';
import { ModuloPlanAccionV3 } from '../modulos/PlanAccionV3';
import { Riesgos } from '../modulos/Riesgos';
import { PlanesMejoramiento } from '../modulos/PlanesMejoramiento';

// ✅ Tour Guiado Multi-Módulo
import { GuidedTour, TourButton, useTourCompleted } from '../design-system/GuidedTour';
import { siglFullTourSteps } from '../design-system/tourStepsMultiModulo';

type VistaDisponible =
  | 'dashboard'
  | 'defensa-judicial'
  | 'juzgamiento'
  | 'asesoria'
  | 'centro-comunicaciones'
  | 'terminos'
  | 'organos-control'
  | 'procesos-coactivos'
  | 'plan-accion'
  | 'riesgos'
  | 'planes-mejoramiento';

export function GestionLegalFull() {
  const [vistaActual, setVistaActual] = useState<VistaDisponible>('defensa-judicial');
  
  // ✅ Estados del tour guiado multi-módulo
  const [isTourOpen, setIsTourOpen] = useState(false);
  const { completed: tourCompleted, resetTour } = useTourCompleted('sigl-full-tour');

  // ✅ Handler para navegación automática cuando cambia el paso del tour
  const handleTourStepChange = (stepIndex: number) => {
    const step = siglFullTourSteps[stepIndex];
    
    // Si el paso tiene navegación, cambiar de módulo con delay
    if (step.navigateTo) {
      const delay = step.navigationDelay || 500;
      
      setTimeout(() => {
        setVistaActual(step.navigateTo as VistaDisponible);
      }, delay);
    }
  };

  // Definir menu items igual que Control Interno
  const menuItems: MenuItem[] = [
    // 📊 DASHBOARD - Vista general siempre primero
    {
      id: 'dashboard',
      label: 'Dashboard',
      subtitle: 'Vista general',
      icon: <LayoutDashboard className="w-5 h-5" />,
      color: '#003DA5',
    },
    
    // ═══════════════════════════════════════════════════════════
    // 📋 MÓDULOS KANBAN - PRIORIZADOS POR FLUJO E IMPORTANCIA
    // ═══════════════════════════════════════════════════════════
    
    // 🥇 PRIORIDAD CRÍTICA: Defensa Judicial
    // Defensa de ESAP ante demandas externas (máxima prioridad)
    {
      id: 'defensa-judicial',
      label: 'Defensa Judicial',
      subtitle: '15 expedientes • KANBAN',
      icon: <Scale className="w-5 h-5" />,
      color: '#10B981',
    },
    
    // 🥈 PRIORIDAD ALTA: Juzgamiento Disciplinario
    // Control disciplinario interno de funcionarios
    {
      id: 'juzgamiento',
      label: 'Juzgamiento',
      subtitle: '12 procesos • KANBAN',
      icon: <Gavel className="w-5 h-5" />,
      color: '#DC2626',
    },
    
    // 🥉 PRIORIDAD MEDIA: Asesoría Jurídica
    // Consultas jurídicas internas de las dependencias
    {
      id: 'asesoria',
      label: 'Asesoría Jurídica',
      subtitle: '12 consultas • KANBAN',
      icon: <FileQuestion className="w-5 h-5" />,
      color: '#8B5CF6',
    },
    
    // ═══════════════════════════════════════════════════════════
    // 📦 MÓDULOS DE SOPORTE - Ordenados por relación con Kanban
    // ═══════════════════════════════════════════════════════════
    
    // Comunicaciones - Alimenta los módulos Kanban
    {
      id: 'centro-comunicaciones',
      label: 'Centro Comunicaciones Jurídicas',
      subtitle: '13 notificaciones',
      icon: <Inbox className="w-5 h-5" />,
      color: '#3B82F6',
    },
    
    // Términos - Crítico para gestión de vencimientos Kanban
    {
      id: 'terminos',
      label: 'Términos',
      subtitle: '13 términos',
      icon: <CalendarClock className="w-5 h-5" />,
      color: '#6366F1',
    },
    
    // Órganos Control - Requerimientos externos
    {
      id: 'organos-control',
      label: 'Órganos Control',
      subtitle: '6 requerimientos',
      icon: <Building2 className="w-5 h-5" />,
      color: '#2563EB',
    },
    
    // Procesos Coactivos - Cobro judicial
    {
      id: 'procesos-coactivos',
      label: 'Procesos Coactivos',
      subtitle: '6 procesos',
      icon: <DollarSign className="w-5 h-5" />,
      color: '#F59E0B',
    },
    
    // ═══════════════════════════════════════════════════════════
    // 📈 MÓDULOS DE GESTIÓN ESTRATÉGICA
    // ═══════════════════════════════════════════════════════════
    
    {
      id: 'plan-accion',
      label: 'Plan de Acción',
      subtitle: '5 indicadores',
      icon: <Target className="w-5 h-5" />,
      color: '#7C3AED',
    },
    {
      id: 'riesgos',
      label: 'Riesgos',
      subtitle: '5 riesgos',
      icon: <AlertTriangle className="w-5 h-5" />,
      color: '#DC2626',
    },
    {
      id: 'planes-mejoramiento',
      label: 'Planes Mejoramiento',
      subtitle: '5 planes',
      icon: <ClipboardCheck className="w-5 h-5" />,
      color: '#14B8A6',
    },
  ];

  // Renderizar vista activa
  const renderVistaActual = () => {
    switch (vistaActual) {
      case 'dashboard':
        return <DashboardEjecutivoSIGL onNavigateToModule={(moduleId) => setVistaActual(moduleId as VistaDisponible)} />;
      case 'defensa-judicial':
        return <ModuloDefensaJudicialV3 />;
      case 'juzgamiento':
        return <ModuloJuzgamientoDisciplinarioV3 />;
      case 'asesoria':
        return <ModuloAsesoriaJuridicaV3 />;
      case 'centro-comunicaciones':
        return <ModuloCentroComunicacionesJuridicasV3 />;
      case 'terminos':
        return <ModuloTerminosInformesV3 />;
      case 'organos-control':
        return <OrganosControl />;
      case 'procesos-coactivos':
        return <ModuloProcesosCoactivosV3 />;
      case 'plan-accion':
        return <ModuloPlanAccionV3 />;
      case 'riesgos':
        return <Riesgos />;
      case 'planes-mejoramiento':
        return <PlanesMejoramiento />;
      default:
        return <DashboardEjecutivoSIGL onNavigateToModule={(moduleId) => setVistaActual(moduleId as VistaDisponible)} />;
    }
  };

  return (
    <ModuleLayout
      moduleName="GESTIÓN LEGAL"
      moduleDescription="Sistema Integrado de Gestión Legal (SIGL v5.0)"
      moduleIcon={<Briefcase className="w-6 h-6" />}
      moduleColor="#003DA5"
      menuItems={menuItems}
      activeSection={vistaActual}
      onSectionChange={(section) => setVistaActual(section as VistaDisponible)}
      initialSidebarCollapsed={false}
    >
      {renderVistaActual()}
      
      {/* Tour Guiado Multi-Módulo */}
      <GuidedTour
        steps={siglFullTourSteps}
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
        onComplete={() => {
          console.log('✅ Tour completo de 11 módulos completado!');
          setIsTourOpen(false);
        }}
        tourId="sigl-full-tour"
        onStepChange={handleTourStepChange}
      />

      {/* Botón Flotante del Tour */}
      <TourButton
        onClick={() => {
          setIsTourOpen(true);
        }}
        variant="floating"
        label="Tour Completo"
      />
    </ModuleLayout>
  );
}