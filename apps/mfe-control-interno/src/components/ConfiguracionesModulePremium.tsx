/**
 * CONFIGURACIONES - VERSIÓN PREMIUM
 * Sistema de configuración para Control Interno
 * VERSIÓN: 4.0 - WORLD CLASS
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, Bell, Sliders, Columns, Users, Layers } from 'lucide-react';
import { ModuleHeaderBar } from './ModuleHeaderBar';
import { NotificacionesModule } from './NotificacionesModule';
import { ConfiguracionAuditoriasModule } from './ConfiguracionAuditoriasModule';
import { ConfiguracionKanbanModule } from './ConfiguracionKanbanModule';
import { ConfiguracionProfesionalesModule } from './ConfiguracionProfesionalesModule';
import { ConfiguracionProcesosModule } from './ConfiguracionProcesosModule';

type TabActiva = 'NOTIFICACIONES' | 'CONFIG_AUDITORIAS' | 'CONFIG_KANBAN' | 'PROFESIONALES_OCI' | 'PROCESOS';

const TABS_CONFIG = [
  { id: 'NOTIFICACIONES' as TabActiva, icon: Bell, label: 'Notificaciones', color: '#F97316' },
  { id: 'CONFIG_AUDITORIAS' as TabActiva, icon: Sliders, label: 'Config. Auditorías', color: '#2962FF' },
  { id: 'CONFIG_KANBAN' as TabActiva, icon: Columns, label: 'Config. Kanban', color: '#7C3AED' },
  { id: 'PROFESIONALES_OCI' as TabActiva, icon: Users, label: 'Profesionales OCI', color: '#0891B2' },
  { id: 'PROCESOS' as TabActiva, icon: Layers, label: 'Procesos', color: '#059669' },
];

export function ConfiguracionesModulePremium() {
  const [tabActiva, setTabActiva] = useState<TabActiva>('NOTIFICACIONES');

  const activeTab = TABS_CONFIG.find(t => t.id === tabActiva) || TABS_CONFIG[0];

  return (
    <div className="min-h-screen bg-gray-50">
      <ModuleHeaderBar title="Configuraciones" subtitle="Notificaciones, auditorías, Kanban y profesionales" icon={<Settings className="w-5 h-5 text-white" />} color="#059669" />

      <div className="p-3">
        {/* ═══ WORLD CLASS TAB SWITCHER ═══ */}
        <div className="mb-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1.5 inline-flex items-center gap-1 flex-wrap">
            {TABS_CONFIG.map(tab => {
              const Icon = tab.icon;
              const isActive = tabActiva === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setTabActiva(tab.id)}
                  className="relative px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
                  style={{
                    background: isActive ? tab.color : 'transparent',
                    color: isActive ? '#fff' : '#6B7280',
                    boxShadow: isActive ? `0 2px 8px ${tab.color}30` : 'none',
                    focusVisibleRingColor: tab.color
                  }}
                  onMouseEnter={e => {
                    if (!isActive) {
                      (e.currentTarget as HTMLButtonElement).style.background = tab.color + '0A';
                      (e.currentTarget as HTMLButtonElement).style.color = tab.color;
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                      (e.currentTarget as HTMLButtonElement).style.color = '#6B7280';
                    }
                  }}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={tabActiva} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            {tabActiva === 'NOTIFICACIONES' && <NotificacionesModule />}
            {tabActiva === 'CONFIG_AUDITORIAS' && <ConfiguracionAuditoriasModule />}
            {tabActiva === 'CONFIG_KANBAN' && <ConfiguracionKanbanModule />}
            {tabActiva === 'PROFESIONALES_OCI' && <ConfiguracionProfesionalesModule />}
            {tabActiva === 'PROCESOS' && <ConfiguracionProcesosModule />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
