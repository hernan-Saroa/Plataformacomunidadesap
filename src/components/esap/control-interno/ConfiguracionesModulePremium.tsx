/**
 * CONFIGURACIONES - VERSIÓN PREMIUM
 * Sistema de configuración para Control Interno
 * VERSIÓN: 3.0 - PREMIUM
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, Bell, Activity, Sliders, Columns } from 'lucide-react';
import { HeaderModuloCIG } from './HeaderModuloCIG';
import { NotificacionesModule } from './NotificacionesModule';
import { AuditoriaCambiosModule } from './AuditoriaCambiosModule';
import { ConfiguracionAuditoriasModule } from './ConfiguracionAuditoriasModule';
import { ConfiguracionKanbanModule } from './ConfiguracionKanbanModule';

type TabActiva = 'NOTIFICACIONES' | 'AUDITORIA_CAMBIOS' | 'CONFIG_AUDITORIAS' | 'CONFIG_KANBAN';

export function ConfiguracionesModulePremium() {
  const [tabActiva, setTabActiva] = useState<TabActiva>('NOTIFICACIONES');

  return (
    <div className="min-h-screen bg-gray-50">
      <HeaderModuloCIG titulo="Configuraciones" subtitulo="Control Interno de Gestión" />

      <div className="bg-white border-b sticky top-0 z-40 shadow-sm">
        <div className="mx-auto px-8 max-w-[1920px]">
          <div className="flex gap-1">
            <TabButton active={tabActiva === 'NOTIFICACIONES'} onClick={() => setTabActiva('NOTIFICACIONES')} icon={<Bell className="w-4 h-4" />} label="Notificaciones" />
            <TabButton active={tabActiva === 'AUDITORIA_CAMBIOS'} onClick={() => setTabActiva('AUDITORIA_CAMBIOS')} icon={<Activity className="w-4 h-4" />} label="Auditoría de Cambios" />
            <TabButton active={tabActiva === 'CONFIG_AUDITORIAS'} onClick={() => setTabActiva('CONFIG_AUDITORIAS')} icon={<Sliders className="w-4 h-4" />} label="Config. Auditorías" />
            <TabButton active={tabActiva === 'CONFIG_KANBAN'} onClick={() => setTabActiva('CONFIG_KANBAN')} icon={<Columns className="w-4 h-4" />} label="Config. Kanban" />
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tabActiva} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
          {tabActiva === 'NOTIFICACIONES' && <NotificacionesModule />}
          {tabActiva === 'AUDITORIA_CAMBIOS' && <AuditoriaCambiosModule />}
          {tabActiva === 'CONFIG_AUDITORIAS' && <ConfiguracionAuditoriasModule />}
          {tabActiva === 'CONFIG_KANBAN' && <ConfiguracionKanbanModule />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: any) {
  return (
    <button onClick={onClick} className={`relative px-6 py-4 flex items-center gap-2 text-sm font-medium border-b-2 transition-all ${active ? 'border-[#1e5da8] text-[#1e5da8] bg-blue-50/50' : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}>
      {icon}
      {label}
    </button>
  );
}