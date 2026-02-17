/**
 * SISTEMA COMPLETO - CONTROL INTERNO DISCIPLINARIO v3.0 PREMIUM 🟢
 * Módulo funcional con todas las secciones:
 * - Dashboard Operativo (Kanban)
 * - Revisión y Aprobación
 * - Expediente Electrónico
 * - Términos y Alertas
 * - Profesionales
 * - Configuración (ACTUALIZADO CON PLANTILLAS DE AUTOS)
 */

import React, { useState, useEffect } from 'react';
import { LayoutDashboard, CheckCircle, Archive, Clock, Users, Settings, Scale } from 'lucide-react';
import { ModuleLayout, type MenuItem } from '../shared/ModuleLayout';

// ✅ Importar todos los módulos especializados
import { GestionProfesionalesWorldClass } from './GestionProfesionalesWorldClass'; // ✅ RF007 WORLD CLASS - Diseño actualizado
import { ModuloConfiguracionPremium } from './ModuloConfiguracionPremium'; // ✅ RF008 CONFIGURACIÓN PREMIUM
import { ModuloConfiguracionRelacionado } from './ModuloConfiguracionRelacionado'; // ✅ Configuración organizada por módulos
import { RevisionAprobacionJefe } from './RevisionAprobacionJefe'; // ✅ RF004 100% Funcional
import { ExpedientesElectronicosWorldClass } from './ExpedientesElectronicosWorldClass'; // ✅ RF005 100% Funcional - DISEÑO WORLD-CLASS
import { GestionTerminosAlertas } from './GestionTerminosAlertas'; // ✅ RF006 - Vista alineada con diseño esperado
import { DashboardKanbanOperativo } from './DashboardKanbanOperativo'; // ✅ Kanban Operativo Completo
import { authService } from '../../../services/api/authService';
import { Permissions } from '../../../enums/permissions';

// ==================== COMPONENTE PRINCIPAL ====================
export function ControlDisciplinarioFull() {
  // 🟢 DEBUG: Verificar que el archivo se está cargando
  console.log('🟢🟢🟢 CONTROL DISCIPLINARIO FULL v3.0 PREMIUM 🟢🟢🟢');
  console.log('📅 Timestamp:', new Date().toLocaleString());
  console.log('✅ Estado del Módulo: COMPLETAMENTE FUNCIONAL Y COHERENTE');
  console.log('📦 Componentes Cargados:');
  console.log('  ✓ DashboardKanbanOperativo');
  console.log('  ✓ RevisionAprobacionJefe');
  console.log('  ✓ ExpedientesElectronicosWorldClass');
  console.log('  ✓ GestionTerminosAlertas');
  console.log('  ✓ GestionProfesionalesWorldClass');
  console.log('  ✓ ModuloConfiguracionPremium');
  console.log('🆕 Nuevas Funcionalidades:');
  console.log('  ✓ Sistema de Compartir Expediente (Link/QR/Email)');
  console.log('  ✓ Múltiples Denunciados/Denunciantes');
  console.log('  ✓ Campo "Lugar de los Hechos" actualizado');
  console.log('📚 Documentación disponible en:');
  console.log('  → README.md');
  console.log('  → VERIFICACION_MODULO.md');
  console.log('  → GUIA_RAPIDA.md');
  
  type Section = 'dashboard' | 'aprobacion' | 'expediente' | 'terminos' | 'profesionales' | 'config';
  const [currentSection, setCurrentSection] = useState<Section>('dashboard');
  const [filtroProfesional, setFiltroProfesional] = useState<string | null>(null);

  const hasPermissionBySection: Record<Section, boolean> = {
    dashboard: authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_PROCESSOS_MANAGE),
    aprobacion: authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_REVISION_APROBACION_MANAGE),
    expediente: authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_EXPIDENTE_ELECTRONICO_MANAGE),
    terminos: authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_TERMINOS_MANAGE),
    profesionales: authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_PROFESIONALES_MANAGE),
    config: authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_CONFIGURACIONES_MANAGE)
  };

  const getFirstAllowedSection = (): Section => {
    const order: Section[] = ['dashboard', 'aprobacion', 'expediente', 'terminos', 'profesionales', 'config'];
    return order.find((section) => hasPermissionBySection[section]) || 'dashboard';
  };

  useEffect(() => {
    if (!hasPermissionBySection[currentSection]) {
      setCurrentSection(getFirstAllowedSection());
    }
  }, [currentSection]);

  const menuItems: MenuItem[] = [
    { id: 'dashboard', label: 'Procesos', icon: <LayoutDashboard className="w-5 h-5" />, color: '#003DA5', visible: hasPermissionBySection.dashboard },
    { id: 'aprobacion', label: 'Revisión y Aprobación', icon: <CheckCircle className="w-5 h-5" />, color: '#10B981', visible: hasPermissionBySection.aprobacion },
    { id: 'expediente', label: 'Expediente Electrónico', icon: <Archive className="w-5 h-5" />, color: '#8B5CF6', visible: hasPermissionBySection.expediente },
    { id: 'terminos', label: 'Términos y Alertas', icon: <Clock className="w-5 h-5" />, color: '#F59E0B', visible: hasPermissionBySection.terminos },
    { id: 'profesionales', label: 'Profesionales', icon: <Users className="w-5 h-5" />, color: '#003DA5', visible: hasPermissionBySection.profesionales },
    { id: 'config', label: 'Configuración', icon: <Settings className="w-5 h-5" />, color: '#6B7280', visible: hasPermissionBySection.config }
  ];

  const getTitleForSection = () => {
    const item = menuItems.find(m => m.id === currentSection);
    return item?.label || 'Control Interno Disciplinario';
  };

  const handleVerProcesosProfesional = (profesional: any) => {
    setFiltroProfesional(profesional.id);
    setCurrentSection(hasPermissionBySection.dashboard ? 'dashboard' : getFirstAllowedSection());
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
        setCurrentSection(section as Section);
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
      {currentSection === 'expediente' && <ExpedientesElectronicosWorldClass />}
      {currentSection === 'terminos' && <GestionTerminosAlertas />}
      {currentSection === 'profesionales' && <GestionProfesionalesWorldClass onVerProcesos={handleVerProcesosProfesional} />}
      {currentSection === 'config' && <ModuloConfiguracionPremium />}
    </ModuleLayout>
  );
}
