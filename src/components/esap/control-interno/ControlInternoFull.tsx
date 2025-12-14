/**
 * CONTROL INTERNO DE GESTIÓN - Módulo Completo Optimizado
 * Sistema integrado sin duplicidades con máxima usabilidad
 * Oficina de Control Interno - ESAP
 */

import { useState } from 'react';
import {
  Shield, ClipboardCheck, AlertTriangle, CheckCircle, FileText, Settings, Target, ListChecks
} from 'lucide-react';
import { ModuleLayout, MenuItem } from '../shared/ModuleLayout';
import { GestionAuditorias } from './GestionAuditorias';
import { GestionHallazgos } from './GestionHallazgos';
import { PlanAnual5Roles } from './PlanAnual5Roles';
import { GestionPlanesMejoramiento } from './planes-mejoramiento';
import { AprobacionesPendientes } from './AprobacionesPendientes';
import { DocumentosReportes } from './DocumentosReportes';
import { ConfiguracionControlInterno } from './ConfiguracionControlInterno';

type SeccionActiva = 
  | 'plan-anual'
  | 'auditorias'
  | 'hallazgos'
  | 'planes-mejoramiento'
  | 'aprobaciones'
  | 'documentos'
  | 'configuracion';

export function ControlInternoFull() {
  const [seccionActiva, setSeccionActiva] = useState<SeccionActiva>('plan-anual');

  const menuItems: MenuItem[] = [
    { 
      id: 'plan-anual', 
      label: 'Plan Anual (5 Roles)', 
      icon: <Target className="w-5 h-5" />,
      color: '#3B82F6'
    },
    { 
      id: 'auditorias', 
      label: 'Gestión de Auditorías', 
      icon: <ClipboardCheck className="w-5 h-5" />,
      color: '#F97316'
    },
    { 
      id: 'hallazgos', 
      label: 'Gestión de Hallazgos', 
      icon: <AlertTriangle className="w-5 h-5" />,
      badge: 5,
      color: '#F97316'
    },
    { 
      id: 'planes-mejoramiento', 
      label: 'Planes de Mejoramiento', 
      icon: <ListChecks className="w-5 h-5" />,
      color: '#10B981'
    },
    { 
      id: 'aprobaciones', 
      label: 'Aprobaciones Pendientes', 
      icon: <CheckCircle className="w-5 h-5" />,
      badge: 3,
      color: '#F97316'
    },
    { 
      id: 'documentos', 
      label: 'Documentos y Reportes', 
      icon: <FileText className="w-5 h-5" />,
      color: '#F97316'
    },
    { 
      id: 'configuracion', 
      label: 'Configuración', 
      icon: <Settings className="w-5 h-5" />,
      color: '#6B7280'
    }
  ];

  const renderSeccion = () => {
    switch (seccionActiva) {
      case 'plan-anual':
        return <PlanAnual5Roles />;
      case 'auditorias':
        return <GestionAuditorias />;
      case 'hallazgos':
        return <GestionHallazgos />;
      case 'planes-mejoramiento':
        return <GestionPlanesMejoramiento />;
      case 'aprobaciones':
        return <AprobacionesPendientes />;
      case 'documentos':
        return <DocumentosReportes />;
      case 'configuracion':
        return <ConfiguracionControlInterno />;
      default:
        return <PlanAnual5Roles />;
    }
  };

  const getTitleForSection = () => {
    const item = menuItems.find(m => m.id === seccionActiva);
    return item?.label || 'Control Interno Gestión';
  };

  return (
    <ModuleLayout
      moduleName="CONTROL INTERNO"
      moduleDescription="Gestión"
      moduleIcon={<Shield className="w-6 h-6" />}
      moduleColor="#F97316"
      menuItems={menuItems}
      activeSection={seccionActiva}
      onSectionChange={(section) => setSeccionActiva(section as SeccionActiva)}
      breadcrumb={['Backoffice', 'Control Interno Gestión', getTitleForSection()]}
    >
      {renderSeccion()}
    </ModuleLayout>
  );
}