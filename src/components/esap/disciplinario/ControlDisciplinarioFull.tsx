/**
 * SISTEMA COMPLETO - CONTROL INTERNO DISCIPLINARIO
 * Módulo funcional con todas las secciones:
 * - Dashboard Operativo (Kanban)
 * - Revisión y Aprobación
 * - Expediente Electrónico
 * - Términos y Alertas
 * - Profesionales
 * - Configuración
 */

import { useState } from 'react';
import { Scale, LayoutDashboard, CheckCircle, Archive, Clock, Users, Settings } from 'lucide-react';
import { ModuleLayout, MenuItem } from '../shared/ModuleLayout';
import { GestionProfesionales } from './GestionProfesionales';
import { ModuloConfiguracion } from './ModuloConfiguracion';
import { RevisionAprobacionJefe } from './RevisionAprobacionJefe'; // ✅ RF004 100% Funcional
import { ExpedientesElectronicos } from './ExpedientesElectronicos'; // ✅ RF005 100% Funcional
import { GestionTerminosAlertas } from './GestionTerminosAlertas'; // ✅ RF006 100% Funcional
import { DashboardKanbanOperativo } from './DashboardKanbanOperativo'; // ✅ Kanban Operativo Completo

// ==================== COMPONENTE PRINCIPAL ====================
export function ControlDisciplinarioFull() {
  const [currentSection, setCurrentSection] = useState<'dashboard' | 'aprobacion' | 'expediente' | 'terminos' | 'profesionales' | 'config'>('dashboard');
  const [filtroProfesional, setFiltroProfesional] = useState<string | null>(null);

  const menuItems: MenuItem[] = [
    { id: 'dashboard', label: 'Procesos', icon: <LayoutDashboard className="w-5 h-5" />, color: '#003DA5' },
    { id: 'aprobacion', label: 'Revisión y Aprobación', icon: <CheckCircle className="w-5 h-5" />, color: '#10B981' },
    { id: 'expediente', label: 'Expediente Electrónico', icon: <Archive className="w-5 h-5" />, color: '#8B5CF6' },
    { id: 'terminos', label: 'Términos y Alertas', icon: <Clock className="w-5 h-5" />, color: '#F59E0B' },
    { id: 'profesionales', label: 'Profesionales', icon: <Users className="w-5 h-5" />, color: '#003DA5' },
    { id: 'config', label: 'Configuración', icon: <Settings className="w-5 h-5" />, color: '#6B7280' }
  ];

  const getTitleForSection = () => {
    const item = menuItems.find(m => m.id === currentSection);
    return item?.label || 'Control Interno Disciplinario';
  };

  const handleVerProcesosProfesional = (profesional: any) => {
    setFiltroProfesional(profesional.id);
    setCurrentSection('dashboard');
  };

  const handleLimpiarFiltroProfesional = () => {
    setFiltroProfesional(null);
  };

  return (
    <ModuleLayout
      moduleName="CONTROL INTERNO DISCIPLINARIO"
      moduleDescription="Sistema de Gestión"
      moduleIcon={<Scale className="w-6 h-6" />}
      moduleColor="#003DA5"
      menuItems={menuItems}
      activeSection={currentSection}
      onSectionChange={(section) => {
        setCurrentSection(section as any);
        // Limpiar filtro al cambiar de sección
        if (section !== 'dashboard') {
          handleLimpiarFiltroProfesional();
        }
      }}
      breadcrumb={['Backoffice', 'Control Interno Disciplinario', getTitleForSection()]}
    >
      {/* Contenido Principal */}
      {currentSection === 'dashboard' && (
        <DashboardKanbanOperativo 
          onNavigateToExpediente={() => setCurrentSection('expediente')} 
          filtroProfesionalId={filtroProfesional} 
        />
      )}
      {currentSection === 'aprobacion' && <RevisionAprobacionJefe />}
      {currentSection === 'expediente' && <ExpedientesElectronicos />}
      {currentSection === 'terminos' && <GestionTerminosAlertas />}
      {currentSection === 'profesionales' && <GestionProfesionales onVerProcesos={handleVerProcesosProfesional} />}
      {currentSection === 'config' && <ModuloConfiguracion />}
    </ModuleLayout>
  );
}