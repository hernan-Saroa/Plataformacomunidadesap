/**
 * GESTIÓN LEGAL FULL - Módulo Completo de Juzgamiento Disciplinario
 * Sistema completo de gestión de expedientes en primera instancia
 * Oficina Asesora Jurídica - ESAP
 */

import { useState } from 'react';
import {
  Scale, Home, Users, Calendar, History, Bell, BookOpen, BarChart3, Settings
} from 'lucide-react';
import { ModuleLayout, MenuItem } from '../shared/ModuleLayout';
import { DashboardJuzgamiento } from './DashboardJuzgamiento';
import { GestionAbogados } from './GestionAbogados';
import { ModuloDocumentos } from './ModuloDocumentos';
import { ModuloReportes } from './ModuloReportes';
import { ModuloConfiguracion } from './ModuloConfiguracion';
import { CalendarioAudiencias } from './CalendarioAudiencias';
import { HistorialActuaciones } from './HistorialActuaciones';
import { SistemaNotificaciones } from './SistemaNotificaciones';

type SeccionActiva = 
  | 'dashboard' 
  | 'abogados'
  | 'calendario'
  | 'historial'
  | 'notificaciones'
  | 'documentos' 
  | 'reportes' 
  | 'configuracion';

export function GestionLegalFull() {
  const [seccionActiva, setSeccionActiva] = useState<SeccionActiva>('dashboard');

  const menuItems: MenuItem[] = [
    { 
      id: 'dashboard', 
      label: 'Gestión de expedientes', 
      icon: <Home className="w-5 h-5" />,
      color: '#6F42C1'
    },
    { 
      id: 'abogados', 
      label: 'Abogados Sustanciadores', 
      icon: <Users className="w-5 h-5" />,
      color: '#6F42C1'
    },
    { 
      id: 'calendario', 
      label: 'Calendario de Audiencias', 
      icon: <Calendar className="w-5 h-5" />,
      color: '#6F42C1'
    },
    { 
      id: 'historial', 
      label: 'Historial de Actuaciones', 
      icon: <History className="w-5 h-5" />,
      color: '#6F42C1'
    },
    { 
      id: 'notificaciones', 
      label: 'Sistema de Notificaciones', 
      icon: <Bell className="w-5 h-5" />,
      color: '#6F42C1'
    },
    { 
      id: 'documentos', 
      label: 'Generación de Documentos', 
      icon: <BookOpen className="w-5 h-5" />,
      color: '#6F42C1'
    },
    { 
      id: 'reportes', 
      label: 'Reportes Estadísticos', 
      icon: <BarChart3 className="w-5 h-5" />,
      color: '#6F42C1'
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
      case 'dashboard':
        return <DashboardJuzgamiento />;
      case 'abogados':
        return <GestionAbogados />;
      case 'calendario':
        return <CalendarioAudiencias />;
      case 'historial':
        return <HistorialActuaciones />;
      case 'notificaciones':
        return <SistemaNotificaciones />;
      case 'documentos':
        return <ModuloDocumentos />;
      case 'reportes':
        return <ModuloReportes />;
      case 'configuracion':
        return <ModuloConfiguracion />;
      default:
        return <DashboardJuzgamiento />;
    }
  };

  const getTitleForSection = () => {
    const item = menuItems.find(m => m.id === seccionActiva);
    return item?.label || 'Gestión Legal';
  };

  return (
    <ModuleLayout
      moduleName="GESTIÓN LEGAL"
      moduleDescription="Juzgamiento Disciplinario"
      moduleIcon={<Scale className="w-6 h-6" />}
      moduleColor="#6F42C1"
      menuItems={menuItems}
      activeSection={seccionActiva}
      onSectionChange={(section) => setSeccionActiva(section as SeccionActiva)}
      breadcrumb={['Backoffice', 'Gestión Legal', getTitleForSection()]}
    >
      {renderSeccion()}
    </ModuleLayout>
  );
}