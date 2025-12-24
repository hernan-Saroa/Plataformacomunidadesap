/**
 * CONFIGURACIONES - VERSIÓN PREMIUM
 * Sistema de configuración para Control Interno
 * VERSIÓN: 3.0 - PREMIUM
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, Bell, Activity, Sliders, HelpCircle, Book, Mail, Phone, Columns } from 'lucide-react';
import { HeaderModuloCIG } from './HeaderModuloCIG';
import { NotificacionesModule } from './NotificacionesModule';
import { AuditoriaCambiosModule } from './AuditoriaCambiosModule';
import { ConfiguracionAuditoriasModule } from './ConfiguracionAuditoriasModule';
import { ConfiguracionKanbanModule } from './ConfiguracionKanbanModule';

type TabActiva = 'NOTIFICACIONES' | 'AUDITORIA_CAMBIOS' | 'CONFIG_AUDITORIAS' | 'CONFIG_KANBAN' | 'SOPORTE';

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
            <TabButton active={tabActiva === 'SOPORTE'} onClick={() => setTabActiva('SOPORTE')} icon={<HelpCircle className="w-4 h-4" />} label="Soporte" />
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tabActiva} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
          {tabActiva === 'NOTIFICACIONES' && <NotificacionesModule />}
          {tabActiva === 'AUDITORIA_CAMBIOS' && <AuditoriaCambiosModule />}
          {tabActiva === 'CONFIG_AUDITORIAS' && <ConfiguracionAuditoriasModule />}
          {tabActiva === 'CONFIG_KANBAN' && <ConfiguracionKanbanModule />}
          {tabActiva === 'SOPORTE' && <VistaSoporte />}
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

function VistaSoporte() {
  return (
    <div className="mx-auto px-8 py-8 max-w-[1800px]">
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-8 text-center border border-gray-200"><div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4"><Book className="w-7 h-7 text-[#1e5da8]" /></div><h3 className="text-base text-gray-900 mb-2 font-medium">Documentación</h3><p className="text-sm text-gray-600 mb-4">Guías de configuración</p><button className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm">Descargar</button></div>
        <div className="bg-white rounded-xl shadow-sm p-8 text-center border border-gray-200"><div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4"><Mail className="w-7 h-7 text-[#1e5da8]" /></div><h3 className="text-base text-gray-900 mb-2 font-medium">Correo</h3><p className="text-sm text-gray-600 mb-4">controlinterno@esap.edu.co</p><button className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm">Contactar</button></div>
        <div className="bg-white rounded-xl shadow-sm p-8 text-center border border-gray-200"><div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4"><Phone className="w-7 h-7 text-[#1e5da8]" /></div><h3 className="text-base text-gray-900 mb-2 font-medium">Teléfono</h3><p className="text-sm text-gray-600 mb-4">Ext. 2450 - 2451</p><button className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm">Llamar</button></div>
      </div>
    </div>
  );
}