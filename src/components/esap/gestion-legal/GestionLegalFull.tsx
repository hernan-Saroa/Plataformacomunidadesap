/**
 * SISTEMA COMPLETO - GESTIÓN LEGAL (SIGL)
 * Módulo funcional con todas las secciones:
 * - 11 submódulos integrados con ModuleLayout
 * - Navegación horizontal similar a Control Disciplinario
 * - Soporte Kanban/Lista para cada submódulo
 */

import { useState } from 'react';
import { Scale } from 'lucide-react';
import { ModuleLayout, MenuItem } from '../shared/ModuleLayout';
import { ToastProvider } from './design-system/ToastSIGL';
import { ModuloConKanban } from './ModuloConKanban';

// Módulos de Lista
import { ModuloDefensaJudicial } from './ModuloDefensaJudicial';
import { ModuloOrganosControl } from './ModuloOrganosControl';
import { ModuloAsesoriaJuridica } from './ModuloAsesoriaJuridica';
import { ModuloJuzgamientoDisciplinario } from './ModuloJuzgamientoDisciplinario';
import { ModuloProcesosCoactivos } from './ModuloProcesosCoactivos';
import { ModuloBuzonNotificaciones } from './ModuloBuzonNotificaciones';
import { ModuloBuzonJuridica } from './ModuloBuzonJuridica';
import { ModuloPlanAccion } from './ModuloPlanAccion';
import { ModuloRiesgos } from './ModuloRiesgos';
import { ModuloMejoramiento } from './ModuloMejoramiento';
import { ModuloTerminos } from './ModuloTerminos';

// Centro de Alertas
import { CentroConfiguracionAlertas } from '../alertas/CentroConfiguracionAlertas';
import { MotorAlertasAutomaticas } from '../alertas/MotorAlertasAutomaticas';

// Kanbans
import { KanbanDefensaJudicial } from './KanbanDefensaJudicial';
import { KanbanOrganosControl } from './KanbanOrganosControlNuevo';
import { KanbanGenerico } from './KanbanGenerico';
import {
  kanbanAsesoriaJuridica,
  kanbanJuzgamiento,
  kanbanCoactivos,
  kanbanNotificaciones,
  kanbanBuzonJuridica,
  kanbanPlanAccion,
  kanbanRiesgos,
  kanbanMejoramiento,
  kanbanTerminos,
} from './kanban-configs';

import {
  Scale as ScaleIcon,
  Shield,
  FileQuestion,
  Gavel,
  DollarSign,
  Mail,
  MessageSquare,
  Target,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Bell,
} from 'lucide-react';

// ==================== COMPONENTE PRINCIPAL ====================
export function GestionLegalFull() {
  const [currentSection, setCurrentSection] = useState<
    | 'defensa-judicial'
    | 'organos-control'
    | 'asesoria'
    | 'juzgamiento'
    | 'coactivos'
    | 'notificaciones'
    | 'buzon'
    | 'plan-accion'
    | 'riesgos'
    | 'mejoramiento'
    | 'terminos'
    | 'centro-alertas'
  >('defensa-judicial');

  const menuItems: MenuItem[] = [
    {
      id: 'defensa-judicial',
      label: 'Defensa Judicial',
      icon: <ScaleIcon className="w-5 h-5" />,
      color: '#003DA5',
    },
    {
      id: 'organos-control',
      label: 'Órganos de Control',
      icon: <Shield className="w-5 h-5" />,
      color: '#DC2626',
    },
    {
      id: 'asesoria',
      label: 'Asesoría Jurídica',
      icon: <FileQuestion className="w-5 h-5" />,
      color: '#7C3AED',
    },
    {
      id: 'juzgamiento',
      label: 'Juzgamiento Disciplinario',
      icon: <Gavel className="w-5 h-5" />,
      color: '#059669',
    },
    {
      id: 'coactivos',
      label: 'Procesos Coactivos',
      icon: <DollarSign className="w-5 h-5" />,
      color: '#F59E0B',
    },
    {
      id: 'notificaciones',
      label: 'Buzón de Notificaciones',
      icon: <Mail className="w-5 h-5" />,
      color: '#6366F1',
    },
    {
      id: 'buzon',
      label: 'Buzón Oficina Jurídica',
      icon: <MessageSquare className="w-5 h-5" />,
      color: '#8B5CF6',
    },
    {
      id: 'plan-accion',
      label: 'Plan de Acción',
      icon: <Target className="w-5 h-5" />,
      color: '#10B981',
    },
    {
      id: 'riesgos',
      label: 'Riesgos',
      icon: <AlertTriangle className="w-5 h-5" />,
      color: '#EF4444',
    },
    {
      id: 'mejoramiento',
      label: 'Planes de Mejoramiento',
      icon: <TrendingUp className="w-5 h-5" />,
      color: '#3B82F6',
    },
    {
      id: 'terminos',
      label: 'Términos para Informes',
      icon: <Calendar className="w-5 h-5" />,
      color: '#0066CC',
    },
    {
      id: 'centro-alertas',
      label: 'Centro de Alertas',
      icon: <Bell className="w-5 h-5" />,
      color: '#FF9900',
    },
  ];

  const getTitleForSection = () => {
    const item = menuItems.find((m) => m.id === currentSection);
    return item?.label || 'Gestión Legal';
  };

  return (
    <ToastProvider>
      <ModuleLayout
        moduleName="GESTIÓN LEGAL (SIGL)"
        moduleDescription="Sistema Integrado de Gestión Legal"
        moduleIcon={<Scale className="w-6 h-6" />}
        moduleColor="#003DA5"
        menuItems={menuItems}
        activeSection={currentSection}
        onSectionChange={(section) => setCurrentSection(section as any)}
        breadcrumb={['Backoffice', 'Gestión Legal', getTitleForSection()]}
      >
        {/* Contenido Principal con soporte Kanban */}
        {currentSection === 'defensa-judicial' && (
          <ModuloConKanban
            vistaLista={<ModuloDefensaJudicial />}
            vistaKanban={<KanbanDefensaJudicial />}
          />
        )}
        {currentSection === 'organos-control' && (
          <ModuloConKanban
            vistaLista={<ModuloOrganosControl />}
            vistaKanban={<KanbanOrganosControl />}
          />
        )}
        {currentSection === 'asesoria' && (
          <ModuloConKanban
            vistaLista={<ModuloAsesoriaJuridica />}
            vistaKanban={<KanbanGenerico config={kanbanAsesoriaJuridica} />}
          />
        )}
        {currentSection === 'juzgamiento' && (
          <ModuloConKanban
            vistaLista={<ModuloJuzgamientoDisciplinario />}
            vistaKanban={<KanbanGenerico config={kanbanJuzgamiento} />}
          />
        )}
        {currentSection === 'coactivos' && (
          <ModuloConKanban
            vistaLista={<ModuloProcesosCoactivos />}
            vistaKanban={<KanbanGenerico config={kanbanCoactivos} />}
          />
        )}
        {currentSection === 'notificaciones' && (
          <ModuloConKanban
            vistaLista={<ModuloBuzonNotificaciones />}
            vistaKanban={<KanbanGenerico config={kanbanNotificaciones} />}
          />
        )}
        {currentSection === 'buzon' && (
          <ModuloConKanban
            vistaLista={<ModuloBuzonJuridica />}
            vistaKanban={<KanbanGenerico config={kanbanBuzonJuridica} />}
          />
        )}
        {currentSection === 'plan-accion' && (
          <ModuloConKanban
            vistaLista={<ModuloPlanAccion />}
            vistaKanban={<KanbanGenerico config={kanbanPlanAccion} />}
          />
        )}
        {currentSection === 'riesgos' && (
          <ModuloConKanban
            vistaLista={<ModuloRiesgos />}
            vistaKanban={<KanbanGenerico config={kanbanRiesgos} />}
          />
        )}
        {currentSection === 'mejoramiento' && (
          <ModuloConKanban
            vistaLista={<ModuloMejoramiento />}
            vistaKanban={<KanbanGenerico config={kanbanMejoramiento} />}
          />
        )}
        {currentSection === 'terminos' && (
          <ModuloConKanban
            vistaLista={<ModuloTerminos />}
            vistaKanban={<KanbanGenerico config={kanbanTerminos} />}
          />
        )}
        {currentSection === 'centro-alertas' && (
          <CentroConfiguracionAlertas />
        )}
      </ModuleLayout>
    </ToastProvider>
  );
}