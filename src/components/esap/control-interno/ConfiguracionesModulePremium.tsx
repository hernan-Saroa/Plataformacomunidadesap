/**
 * CONFIGURACIONES - VERSIÓN PREMIUM
 * Sistema de configuración para Control Interno
 * VERSIÓN: 3.0 - PREMIUM
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, Bell, Sliders, Columns, Users } from 'lucide-react';
import { HeaderModuloCIG } from './HeaderModuloCIG';
import { NotificacionesModule } from './NotificacionesModule';
import { ConfiguracionAuditoriasModule } from './ConfiguracionAuditoriasModule';
import { ConfiguracionKanbanModule } from './ConfiguracionKanbanModule';
import { ConfiguracionProfesionalesModule } from './ConfiguracionProfesionalesModule';

type TabActiva = 'NOTIFICACIONES' | 'CONFIG_AUDITORIAS' | 'CONFIG_KANBAN' | 'PROFESIONALES_OCIG';

export function ConfiguracionesModulePremium() {
  const [tabActiva, setTabActiva] = useState<TabActiva>('NOTIFICACIONES');

  return (
    <div className="min-h-screen bg-gray-50">
      <HeaderModuloCIG titulo="Configuraciones" subtitulo="Control Interno de Gestión" />

      <div className="bg-white border-b sticky top-0 z-40 shadow-sm">
        <div className="w-full px-8">
          <div className="flex gap-1">
            <TabButton active={tabActiva === 'NOTIFICACIONES'} onClick={() => setTabActiva('NOTIFICACIONES')} icon={<Bell className="w-4 h-4" />} label="Notificaciones" />
            <TabButton active={tabActiva === 'CONFIG_AUDITORIAS'} onClick={() => setTabActiva('CONFIG_AUDITORIAS')} icon={<Sliders className="w-4 h-4" />} label="Config. Auditorías" />
            <TabButton active={tabActiva === 'CONFIG_KANBAN'} onClick={() => setTabActiva('CONFIG_KANBAN')} icon={<Columns className="w-4 h-4" />} label="Config. Kanban" />
            <TabButton active={tabActiva === 'PROFESIONALES_OCIG'} onClick={() => setTabActiva('PROFESIONALES_OCIG')} icon={<Users className="w-4 h-4" />} label="Profesionales OCIG" />
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tabActiva} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
          {tabActiva === 'NOTIFICACIONES' && <NotificacionesModule />}
          {tabActiva === 'CONFIG_AUDITORIAS' && <ConfiguracionAuditoriasModule />}
          {tabActiva === 'CONFIG_KANBAN' && <ConfiguracionKanbanModule />}
          {tabActiva === 'PROFESIONALES_OCIG' && <ConfiguracionProfesionalesModule />}
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
