/**
 * CONFIGURACIONES - CONTROL INTERNO DISCIPLINARIO - VERSIÓN PREMIUM
 * Sistema de configuración para Control Interno Disciplinario
 * Diseño coherente con Control Interno de Gestión
 * VERSIÓN: 3.0 - PREMIUM
 */

import { useState } from 'react';
import { useResponsive } from './hooks/useResponsive';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutGrid, Users, Shield, FileText, Mail, Bell, ClipboardList, Clock, ArrowRightLeft, Lock } from 'lucide-react';
import { authService } from '../../../services/api/authService';
import { Permissions } from '@esap-mfe/shared-types/permissions';

// Importar secciones individuales
import { ConfiguracionEstadosKanban } from './configuracion/ConfiguracionEstadosKanban';
import { ConfiguracionCargos } from './configuracion/ConfiguracionCargos';
import { ConfiguracionPlantillasAutos } from './configuracion/ConfiguracionPlantillasAutos';
import { ConfiguracionPlantillasOficios } from './configuracion/ConfiguracionPlantillasOficios';
import { ConfiguracionPlantillasActas } from './configuracion/ConfiguracionPlantillasActas';
import { ConfiguracionEntidadesRemision } from './configuracion/ConfiguracionEntidadesRemision';
import { ConfiguracionTiposRemision } from './configuracion/ConfiguracionTiposRemision';
import { ConfiguracionNotificacionesAlertas } from './configuracion/ConfiguracionNotificacionesAlertas';
import { ConfiguracionPrescripcion } from './configuracion/ConfiguracionPrescripcion';
import { ConfiguracionConductasDisciplinarias } from './configuracion/ConfiguracionConductasDisciplinarias';

type TabActiva = 'ESTADOS_KANBAN' | 'CARGOS' | 'CONDUCTAS_DISCIPLINARIAS' | 'PLANTILLAS_AUTOS' | 'PLANTILLAS_OFICIOS' | 'PLANTILLAS_ACTAS' | 'ENTIDADES' | 'TIPOS_REMISION' | 'NOTIFICACIONES' | 'PRESCRIPCION';

export function ModuloConfiguracionPremium() {
  const [tabActiva, setTabActiva] = useState<TabActiva>('CONDUCTAS_DISCIPLINARIAS'); // Por defecto en Conductas Disciplinarias
  const { isMobile } = useResponsive();

  const hasAccess = authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_CONFIGURACIONES_MANAGE);

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center bg-white rounded-2xl shadow-sm border m-8">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <Lock className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Acceso Denegado</h2>
        <p className="text-gray-600 max-w-md">
          No tiene los permisos necesarios para acceder al módulo de configuraciones disciplinarias.
          Por favor, contacte al administrador del sistema si cree que esto es un error.
        </p>
      </div>
    );
  }

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
        <div className={`w-full ${isMobile ? 'px-4' : 'px-8'}`}>
          <div className={`flex gap-1 ${isMobile ? 'overflow-x-auto scrollbar-hide' : 'overflow-x-auto'}`}>
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
              active={tabActiva === 'CONDUCTAS_DISCIPLINARIAS'}
              onClick={() => setTabActiva('CONDUCTAS_DISCIPLINARIAS')}
              icon={<Shield className="w-4 h-4" />}
              label="Conductas Disciplinarias"
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
              active={tabActiva === 'TIPOS_REMISION'}
              onClick={() => setTabActiva('TIPOS_REMISION')}
              icon={<ArrowRightLeft className="w-4 h-4" />}
              label="Tipos de Remisión"
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
          {tabActiva === 'CONDUCTAS_DISCIPLINARIAS' && <ConfiguracionConductasDisciplinarias />}
          {tabActiva === 'PLANTILLAS_AUTOS' && <ConfiguracionPlantillasAutos />}
          {tabActiva === 'PLANTILLAS_OFICIOS' && <ConfiguracionPlantillasOficios />}
          {tabActiva === 'PLANTILLAS_ACTAS' && <ConfiguracionPlantillasActas />}
          {tabActiva === 'ENTIDADES' && <ConfiguracionEntidadesRemision />}
          {tabActiva === 'TIPOS_REMISION' && <ConfiguracionTiposRemision />}
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
      className={`relative px-4 py-3 flex items-center gap-2 text-sm font-medium border-b-2 transition-all flex-shrink-0 ${active
          ? 'border-[#1e5da8] text-[#1e5da8] bg-blue-50/50'
          : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
        }`}
    >
      {icon}
      {label}
    </button>
  );
}