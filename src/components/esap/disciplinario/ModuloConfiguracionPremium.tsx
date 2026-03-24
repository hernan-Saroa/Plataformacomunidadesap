/**
 * CONFIGURACIONES - CONTROL INTERNO DISCIPLINARIO - VERSIÓN PREMIUM
 * Sistema de configuración para Control Interno Disciplinario
 * Diseño coherente con Control Interno de Gestión
 * VERSIÓN: 3.0 - PREMIUM
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutGrid, Users, FileText, Mail, Bell, ClipboardList, Clock } from 'lucide-react';

// Importar secciones individuales
import { ConfiguracionEstadosKanban } from './configuracion/ConfiguracionEstadosKanban';
import { ConfiguracionCargos } from './configuracion/ConfiguracionCargos';
import { ConfiguracionPlantillasAutos } from './configuracion/ConfiguracionPlantillasAutos';
import { ConfiguracionPlantillasOficios } from './configuracion/ConfiguracionPlantillasOficios';
import { ConfiguracionPlantillasActas } from './configuracion/ConfiguracionPlantillasActas';
import { ConfiguracionEntidadesRemision } from './configuracion/ConfiguracionEntidadesRemision';
import { ConfiguracionNotificacionesAlertas } from './configuracion/ConfiguracionNotificacionesAlertas';
import { ConfiguracionPrescripcion } from './configuracion/ConfiguracionPrescripcion';

type TabActiva = 'ESTADOS_KANBAN' | 'CARGOS' | 'PLANTILLAS_AUTOS' | 'PLANTILLAS_OFICIOS' | 'PLANTILLAS_ACTAS' | 'ENTIDADES' | 'NOTIFICACIONES' | 'PRESCRIPCION';

export function ModuloConfiguracionPremium() {
  const [tabActiva, setTabActiva] = useState<TabActiva>('PLANTILLAS_AUTOS'); // Por defecto en Plantillas

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header estilo Control Interno de Gestión */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 px-8 pt-6">
        <div className="flex-1">
          <h2
            className="font-black leading-tight text-xl sm:text-2xl"
            style={{ color: '#F97316' }}
          >
            Configuraciones
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
            Control Interno Disciplinario
          </p>
        </div>
      </div>

      {/* Tabs de navegación con diseño limpio */}
      <div className="bg-white border-b sticky top-0 z-40 shadow-sm">
        <div className="w-full px-8">
          <div className="flex gap-1">
            <TabButton
              active={tabActiva === 'ESTADOS_KANBAN'}
              onClick={() => setTabActiva('ESTADOS_KANBAN')}
              icon={<LayoutGrid className="w-4 h-4" />}
              label="Estados Kanban"
            />
            <TabButton
              active={tabActiva === 'CARGOS'}
              onClick={() => setTabActiva('CARGOS')}
              icon={<Users className="w-4 h-4" />}
              label="Cargos y Capacidad"
            />
            <TabButton
              active={tabActiva === 'PLANTILLAS_AUTOS'}
              onClick={() => setTabActiva('PLANTILLAS_AUTOS')}
              icon={<FileText className="w-4 h-4" />}
              label="Plantillas de Autos"
            />
            <TabButton
              active={tabActiva === 'PLANTILLAS_OFICIOS'}
              onClick={() => setTabActiva('PLANTILLAS_OFICIOS')}
              icon={<ClipboardList className="w-4 h-4" />}
              label="Plantillas de Oficios"
            />
            <TabButton
              active={tabActiva === 'PLANTILLAS_ACTAS'}
              onClick={() => setTabActiva('PLANTILLAS_ACTAS')}
              icon={<ClipboardList className="w-4 h-4" />}
              label="Plantillas de Actas"
            />
            <TabButton
              active={tabActiva === 'ENTIDADES'}
              onClick={() => setTabActiva('ENTIDADES')}
              icon={<Mail className="w-4 h-4" />}
              label="Entidades de Remisión"
            />
            <TabButton
              active={tabActiva === 'NOTIFICACIONES'}
              onClick={() => setTabActiva('NOTIFICACIONES')}
              icon={<Bell className="w-4 h-4" />}
              label="Notificaciones y Alertas"
            />
            <TabButton
              active={tabActiva === 'PRESCRIPCION'}
              onClick={() => setTabActiva('PRESCRIPCION')}
              icon={<Clock className="w-4 h-4" />}
              label="Prescripción"
            />
          </div>
        </div>
      </div>

      {/* Contenido animado */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tabActiva}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {tabActiva === 'ESTADOS_KANBAN' && <ConfiguracionEstadosKanban />}
          {tabActiva === 'CARGOS' && <ConfiguracionCargos />}
          {tabActiva === 'PLANTILLAS_AUTOS' && <ConfiguracionPlantillasAutos />}
          {tabActiva === 'PLANTILLAS_OFICIOS' && <ConfiguracionPlantillasOficios />}
          {tabActiva === 'PLANTILLAS_ACTAS' && <ConfiguracionPlantillasActas />}
          {tabActiva === 'ENTIDADES' && <ConfiguracionEntidadesRemision />}
          {tabActiva === 'NOTIFICACIONES' && <ConfiguracionNotificacionesAlertas />}
          {tabActiva === 'PRESCRIPCION' && <ConfiguracionPrescripcion />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// Componente de botón de tab reutilizable
function TabButton({ active, onClick, icon, label }: any) {
  return (
    <button
      onClick={onClick}
      className={`relative px-6 py-4 flex items-center gap-2 text-sm font-medium border-b-2 transition-all ${active
          ? 'border-[#1e5da8] text-[#1e5da8] bg-blue-50/50'
          : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
        }`}
    >
      {icon}
      {label}
    </button>
  );
}