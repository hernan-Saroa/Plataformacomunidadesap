/**
 * GestionLegalFull - Sistema Integrado de Gestión Legal (SIGL v5.0)
 * Layout unificado con ModuleLayout compartido
 * DISEÑO 100% COHERENTE CON CONTROL INTERNO Y CONTROL DISCIPLINARIO
 * ✅ CONECTADO CON CONFIGURACIONES CENTRALIZADAS VÍA CONTEXT API
 */

import { useState } from 'react';
import { 
  Scale,
  Gavel,
  FileQuestion,
  Inbox,
  CalendarClock,
  Briefcase,
  Building2,
  DollarSign,
  Target,
  AlertTriangle,
  ClipboardCheck,
  Settings,
  FolderOpen
} from 'lucide-react';
import { ModuleLayout, MenuItem } from '../../shared/ModuleLayout';

// ✅ Context API para Configuraciones Centralizadas
import { ConfiguracionesSIGLProvider } from '../config/ConfiguracionesSIGLContext';
import { PermisosProvider } from '../config/PermisosContext';

// Componentes de módulos V3 - DISEÑO UNIFICADO
import { ModuloDefensaJudicialV3 } from '../modulos/ModuloDefensaJudicialV3';
import { ModuloJuzgamientoDisciplinarioV3 } from '../modulos/ModuloJuzgamientoDisciplinarioV3';
import { ModuloAsesoriaJuridicaV3 } from '../modulos/ModuloAsesoriaJuridicaV3';
import { ModuloCentroComunicacionesJuridicasV3 } from '../modulos/CentroComunicacionesJuridicasV3';
import { ModuloTerminosInformesV3 } from '../modulos/ModuloTerminosInformesV3';

// Componentes FASE 2 - 6 MÓDULOS ADICIONALES
import { OrganosControl } from '../modulos/OrganosControl';
import { ModuloProcesosCoactivosV3 } from '../modulos/ProcesosCoactivosV3';
import { ModuloPlanAccionV4 } from '../modulos/PlanAccionV4';
import { Riesgos } from '../modulos/Riesgos';
import { ModuloPlanesMejoramientoV4 } from '../modulos/PlanesMejoramientoV4';
import { ConfiguracionesSIGL } from '../modulos/ConfiguracionesSIGL';
import { ExpedientesModuloSIGL } from '../modulos/ExpedientesModuloSIGL';

type VistaDisponible =
  | 'defensa-judicial'
  | 'juzgamiento'
  | 'asesoria'
  | 'centro-comunicaciones'
  | 'terminos'
  | 'organos-control'
  | 'procesos-coactivos'
  | 'expedientes'
  | 'plan-accion'
  | 'riesgos'
  | 'planes-mejoramiento'
  | 'configuraciones';

export function GestionLegalFull() {
  const [vistaActual, setVistaActual] = useState<VistaDisponible>('defensa-judicial');

  // Definir menu items sin Dashboard ni Tour
  const menuItems: MenuItem[] = [
    // 📋 MÓDULOS KANBAN - PRIORIZADOS POR FLUJO E IMPORTANCIA
    {
      id: 'defensa-judicial',
      label: 'Defensa Judicial',
      subtitle: 'Defensa de ESAP ante demandas externas',
      icon: <Scale className="w-5 h-5" />,
      color: '#10B981',
    },
    {
      id: 'juzgamiento',
      label: 'Juzgamiento Disciplinario',
      subtitle: 'Control disciplinario de funcionarios',
      icon: <Gavel className="w-5 h-5" />,
      color: '#DC2626',
    },
    {
      id: 'asesoria',
      label: 'Asesoría Jurídica',
      subtitle: 'Consultas jurídicas de dependencias',
      icon: <FileQuestion className="w-5 h-5" />,
      color: '#8B5CF6',
    },
    
    // MÓDULOS DE SOPORTE
    {
      id: 'centro-comunicaciones',
      label: 'Centro de Comunicaciones Jurídicas',
      subtitle: 'Radicación y notificaciones jurídicas',
      icon: <Inbox className="w-5 h-5" />,
      color: '#3B82F6',
    },
    {
      id: 'terminos',
      label: 'Términos e Informes',
      subtitle: 'Gestión de vencimientos y reportes',
      icon: <CalendarClock className="w-5 h-5" />,
      color: '#6366F1',
    },
    {
      id: 'organos-control',
      label: 'Órganos de Control',
      subtitle: 'Requerimientos externos de control',
      icon: <Building2 className="w-5 h-5" />,
      color: '#2563EB',
    },
    {
      id: 'procesos-coactivos',
      label: 'Procesos Coactivos',
      subtitle: 'Cobro judicial y administrativo',
      icon: <DollarSign className="w-5 h-5" />,
      color: '#F59E0B',
    },
    {
      id: 'expedientes',
      label: 'Expedientes Electrónicos',
      subtitle: 'Gestión documental de procesos',
      icon: <FolderOpen className="w-5 h-5" />,
      color: '#0891B2',
    },
    
    // MÓDULOS DE GESTIÓN ESTRATÉGICA
    {
      id: 'plan-accion',
      label: 'Plan de Acción',
      subtitle: 'Indicadores y metas institucionales',
      icon: <Target className="w-5 h-5" />,
      color: '#7C3AED',
    },
    {
      id: 'riesgos',
      label: 'Gestión de Riesgos',
      subtitle: 'Matriz de riesgos y controles',
      icon: <AlertTriangle className="w-5 h-5" />,
      color: '#DC2626',
    },
    {
      id: 'planes-mejoramiento',
      label: 'Planes de Mejoramiento',
      subtitle: 'Acciones de mejora institucional',
      icon: <ClipboardCheck className="w-5 h-5" />,
      color: '#14B8A6',
    },
    {
      id: 'configuraciones',
      label: 'Configuraciones del Sistema',
      subtitle: 'Ajustes y parámetros del SIGL',
      icon: <Settings className="w-5 h-5" />,
      color: '#94A3B8',
    },
  ];

  // Renderizar vista activa
  const renderVistaActual = () => {
    switch (vistaActual) {
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
      case 'expedientes':
        return <ExpedientesModuloSIGL />;
      case 'plan-accion':
        return <ModuloPlanAccionV4 />;
      case 'riesgos':
        return <Riesgos />;
      case 'planes-mejoramiento':
        return <ModuloPlanesMejoramientoV4 />;
      case 'configuraciones':
        return <ConfiguracionesSIGL />;
      default:
        return <ModuloDefensaJudicialV3 />;
    }
  };

  return (
    <ConfiguracionesSIGLProvider>
      <PermisosProvider>
        <ModuleLayout
          moduleName="GESTIÓN LEGAL"
          moduleDescription="Sistema Integrado de Gestión Legal (SIGL v5.0)"
          moduleIcon={<Briefcase className="w-6 h-6" />}
          moduleColor="#003DA5"
          menuItems={menuItems}
          activeSection={vistaActual}
          onSectionChange={(section) => setVistaActual(section as VistaDisponible)}
          initialSidebarCollapsed={false} // Logo ESAP compacto cuando se colapsa
        >
          {renderVistaActual()}
        </ModuleLayout>
      </PermisosProvider>
    </ConfiguracionesSIGLProvider>
  );
}