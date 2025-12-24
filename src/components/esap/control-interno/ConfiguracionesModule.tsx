import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Settings, Bell, Activity, Sliders } from 'lucide-react';
import { CardSIGL } from '../gestion-legal/design-system/CardSIGL';
import { NotificacionesModule } from './NotificacionesModule';
import { AuditoriaCambiosModule } from './AuditoriaCambiosModule';
import { ConfiguracionAuditoriasModule } from './ConfiguracionAuditoriasModule';

type TabActiva = 'NOTIFICACIONES' | 'AUDITORIA_CAMBIOS' | 'CONFIG_AUDITORIAS';

/**
 * MÓDULO DE CONFIGURACIONES
 * Consolida 3 submódulos de configuración del sistema:
 * - Notificaciones (Alertas, Recordatorios, Automatizadas)
 * - Auditoría de Cambios (Trazabilidad y Logs)
 * - Configuración Auditorías (Tipos y Listas de Chequeo)
 */
export const ConfiguracionesModule: React.FC = () => {
  const [tabActiva, setTabActiva] = useState<TabActiva>('NOTIFICACIONES');

  const tabs = [
    {
      id: 'NOTIFICACIONES' as TabActiva,
      label: 'Notificaciones',
      icon: <Bell className="w-4 h-4" />,
      descripcion: 'Alertas y recordatorios del sistema',
      color: '#F59E0B'
    },
    {
      id: 'AUDITORIA_CAMBIOS' as TabActiva,
      label: 'Auditoría de Cambios',
      icon: <Activity className="w-4 h-4" />,
      descripcion: 'Trazabilidad y registro de cambios',
      color: '#65A30D'
    },
    {
      id: 'CONFIG_AUDITORIAS' as TabActiva,
      label: 'Configuración Auditorías',
      icon: <Sliders className="w-4 h-4" />,
      descripcion: 'Tipos de auditoría y listas de chequeo',
      color: '#059669'
    }
  ];

  const renderContenido = () => {
    switch (tabActiva) {
      case 'NOTIFICACIONES':
        return <NotificacionesModule />;
      
      case 'AUDITORIA_CAMBIOS':
        return <AuditoriaCambiosModule />;
      
      case 'CONFIG_AUDITORIAS':
        return <ConfiguracionAuditoriasModule />;
      
      default:
        return <NotificacionesModule />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header del Módulo */}
      <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg">
          <Settings className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl text-gray-900">Configuraciones</h1>
          <p className="text-sm text-gray-600">
            Gestión centralizada de configuraciones del sistema
          </p>
        </div>
      </div>

      {/* Tabs de Navegación */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tabs.map((tab) => {
          const isActive = tabActiva === tab.id;
          
          return (
            <motion.button
              key={tab.id}
              onClick={() => setTabActiva(tab.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="relative"
            >
              <CardSIGL
                className={`p-6 cursor-pointer transition-all ${
                  isActive
                    ? 'ring-2 ring-offset-2 shadow-lg'
                    : 'hover:shadow-md'
                }`}
                style={{
                  borderLeftWidth: '4px',
                  borderLeftColor: isActive ? tab.color : '#E5E7EB',
                  ...(isActive && { ringColor: tab.color })
                }}
              >
                <div className="flex items-start gap-4">
                  {/* Icono */}
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      isActive ? 'shadow-md' : 'bg-gray-100'
                    }`}
                    style={{
                      backgroundColor: isActive ? `${tab.color}15` : undefined
                    }}
                  >
                    <div style={{ color: isActive ? tab.color : '#6B7280' }}>
                      {tab.icon}
                    </div>
                  </div>

                  {/* Contenido */}
                  <div className="flex-1 text-left">
                    <h3
                      className={`text-base mb-1 ${
                        isActive ? 'font-medium' : ''
                      }`}
                      style={{ color: isActive ? tab.color : '#111827' }}
                    >
                      {tab.label}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {tab.descripcion}
                    </p>
                  </div>

                  {/* Indicador Activo */}
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute top-0 right-0 w-2 h-2 rounded-full"
                      style={{ backgroundColor: tab.color }}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                </div>
              </CardSIGL>
            </motion.button>
          );
        })}
      </div>

      {/* Contenido del Tab Activo */}
      <motion.div
        key={tabActiva}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        {renderContenido()}
      </motion.div>
    </div>
  );
};
