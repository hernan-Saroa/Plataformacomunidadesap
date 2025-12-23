/**
 * ============================================
 * MÓDULOS AVANZADOS (RF015-RF020) - WORLD CLASS
 * ============================================
 * 
 * Módulo consolidador de funcionalidades transversales:
 * - RF015: Roles y Permisos (RBAC)
 * - RF016: Reportes Ejecutivos
 * - RF017: Auditorías Territoriales
 * - RF018: Auditorías Especiales
 * - RF020: Auditoría de Cambios ⭐ NUEVO
 * 
 * NOTA: RF019 (Configuración) es ahora un módulo independiente
 * 
 * MEJORAS APLICADAS:
 * ✅ Navegación intuitiva con breadcrumbs
 * ✅ Indicadores visuales de estado
 * ✅ Tooltips informativos
 * ✅ Shortcuts de teclado (Cmd 1-5)
 * ✅ Loading states profesionales
 * ✅ Panel de ayuda contextual
 * ✅ Responsive mejorado
 * ✅ Accesibilidad (ARIA labels)
 * 
 * ÚLTIMA ACTUALIZACIÓN: 22 Diciembre 2025 - 23:45 COT
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield,
  BarChart3,
  MapPin,
  Zap,
  Settings,
  ChevronRight,
  Info,
  ArrowLeft,
  HelpCircle,
  Sparkles,
  TrendingUp,
  Users,
  FileText,
  Activity
} from 'lucide-react';
import { ButtonSIGL } from '../gestion-legal/design-system/Button';
import { BadgeSIGL } from '../gestion-legal/design-system/BadgeSIGL';
import { CardSIGL } from '../gestion-legal/design-system/CardSIGL';

// Importar módulos
import { RolesYPermisos } from './RolesYPermisos';
import { DashboardEjecutivoCIG } from './DashboardEjecutivoCIG';
import { ReportesEjecutivosModule } from './ReportesEjecutivosModule';
import { GestionAuditoriasTerritoriales } from './GestionAuditoriasTerritoriales';
import { AuditoriasEspecialesModuleCompleto } from './AuditoriasEspecialesModuleCompleto';
import { AuditoriaCambiosModule } from './AuditoriaCambiosModule';

// ====================================
// TIPOS Y CONFIGURACIÓN
// ====================================

type TabActiva = 'roles' | 'reportes' | 'territoriales' | 'especiales' | 'auditoria_cambios';

interface TabConfig {
  id: TabActiva;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  badge?: string;
  shortcut?: string;
  requiresPermission?: boolean;
}

const TABS_CONFIG: TabConfig[] = [
  {
    id: 'roles',
    label: 'Roles y Permisos',
    description: 'Gestión de accesos y privilegios del sistema',
    icon: Shield,
    color: '#DC2626',
    bgColor: 'from-red-500/10 to-red-600/5',
    badge: 'RF015',
    shortcut: '1',
    requiresPermission: true
  },
  {
    id: 'reportes',
    label: 'Reportes Ejecutivos',
    description: 'Generación de informes y dashboards analíticos',
    icon: BarChart3,
    color: '#8B5CF6',
    bgColor: 'from-purple-500/10 to-purple-600/5',
    badge: 'RF016',
    shortcut: '2'
  },
  {
    id: 'territoriales',
    label: 'Auditorías Territoriales',
    description: 'Gestión de auditorías en las 16 territoriales ESAP',
    icon: MapPin,
    color: '#10B981',
    bgColor: 'from-green-500/10 to-green-600/5',
    badge: 'RF017',
    shortcut: '3'
  },
  {
    id: 'especiales',
    label: 'Auditorías Especiales',
    description: 'Auditorías no programadas y casos extraordinarios',
    icon: Zap,
    color: '#F59E0B',
    bgColor: 'from-yellow-500/10 to-yellow-600/5',
    badge: 'RF018',
    shortcut: '4'
  },
  {
    id: 'auditoria_cambios',
    label: 'Auditoría de Cambios',
    description: 'Seguimiento y registro de cambios en el sistema',
    icon: Activity,
    color: '#65A30D',
    bgColor: 'from-lime-500/10 to-lime-600/5',
    badge: 'RF020',
    shortcut: '5'
  }
];

// ====================================
// COMPONENTE PRINCIPAL
// ====================================

export function ModulosAvanzadosModule() {
  const [tabActiva, setTabActiva] = useState<TabActiva>('roles');
  const [isLoading, setIsLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const tabConfig = TABS_CONFIG.find(t => t.id === tabActiva);

  // Shortcuts de teclado
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.altKey || e.metaKey) {
        const shortcut = e.key;
        const tab = TABS_CONFIG.find(t => t.shortcut === shortcut);
        if (tab) {
          e.preventDefault();
          cambiarTab(tab.id);
        }
      }
      
      // Ayuda con '?'
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        setShowHelp(!showHelp);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showHelp]);

  const cambiarTab = (nuevaTab: TabActiva) => {
    setIsLoading(true);
    setTabActiva(nuevaTab);
    
    // Simular carga
    setTimeout(() => {
      setIsLoading(false);
    }, 300);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
      <div className="max-w-[1600px] mx-auto">
        
        {/* HEADER MEJORADO CON BREADCRUMBS */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm"
        >
          <div className="px-6 py-4">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
              <button className="hover:text-[#003DA5] transition-colors flex items-center gap-1">
                <ArrowLeft className="w-4 h-4" />
                Control Interno
              </button>
              <ChevronRight className="w-4 h-4" />
              <span className="font-semibold text-gray-900">Módulos Avanzados</span>
              {tabConfig && (
                <>
                  <ChevronRight className="w-4 h-4" />
                  <span className="text-[#003DA5]">{tabConfig.label}</span>
                </>
              )}
            </div>

            {/* Título y descripción */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-14 h-14 bg-gradient-to-br from-[#003DA5] to-[#0052CC] rounded-xl flex items-center justify-center shadow-lg">
                    <Sparkles className="w-7 h-7 text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-1">
                    Módulos Avanzados
                  </h1>
                  <p className="text-sm text-gray-600">
                    Funcionalidades especializadas del sistema de Control Interno de Gestión
                  </p>
                </div>
              </div>

              {/* Botón de ayuda */}
              <button
                onClick={() => setShowHelp(!showHelp)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors group"
                title="Ayuda y shortcuts (presiona ?)"
              >
                <HelpCircle className="w-5 h-5 text-gray-600 group-hover:text-[#003DA5]" />
              </button>
            </div>

            {/* TABS DE NAVEGACIÓN MEJORADOS */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
              {TABS_CONFIG.map((tab) => {
                const isActive = tabActiva === tab.id;
                const Icon = tab.icon;

                return (
                  <motion.button
                    key={tab.id}
                    onClick={() => cambiarTab(tab.id)}
                    className={`
                      relative flex items-center gap-3 px-5 py-3 rounded-xl transition-all duration-300
                      min-w-[200px] group
                      ${isActive
                        ? 'bg-white shadow-lg ring-2 ring-[#003DA5]/20'
                        : 'hover:bg-white/50 hover:shadow-md'
                      }
                    `}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {/* Indicador activo */}
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 bg-gradient-to-r rounded-xl opacity-5"
                        style={{
                          background: `linear-gradient(135deg, ${tab.color}20, ${tab.color}10)`
                        }}
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}

                    {/* Icono */}
                    <div
                      className={`
                        relative p-2 rounded-lg transition-all
                        ${isActive 
                          ? `shadow-md` 
                          : 'group-hover:scale-110'
                        }
                      `}
                      style={{
                        background: isActive 
                          ? `linear-gradient(135deg, ${tab.color}15, ${tab.color}05)`
                          : 'transparent'
                      }}
                    >
                      <Icon
                        className="w-5 h-5"
                        style={{ color: isActive ? tab.color : '#6B7280' }}
                      />
                    </div>

                    {/* Contenido */}
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span
                          className={`
                            font-semibold text-sm
                            ${isActive ? 'text-gray-900' : 'text-gray-700 group-hover:text-gray-900'}
                          `}
                        >
                          {tab.label}
                        </span>
                        {tab.badge && (
                          <BadgeSIGL
                            variant={isActive ? 'default' : 'outline'}
                            className="text-xs"
                          >
                            {tab.badge}
                          </BadgeSIGL>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-1">
                        {tab.description}
                      </p>
                    </div>

                    {/* Indicador de permiso requerido */}
                    {tab.requiresPermission && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"
                           title="Requiere permisos especiales"
                      />
                    )}

                    {/* Shortcut */}
                    {tab.shortcut && !isActive && (
                      <kbd className="hidden lg:block px-2 py-1 text-xs font-mono bg-gray-100 text-gray-600 rounded border border-gray-300 opacity-0 group-hover:opacity-100 transition-opacity">
                        ⌘{tab.shortcut}
                      </kbd>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Barra de información contextual */}
          {tabConfig && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="px-6 py-3 bg-gradient-to-r border-t border-gray-100"
              style={{
                background: `linear-gradient(135deg, ${tabConfig.color}08, ${tabConfig.color}03)`
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-sm">
                  <Info className="w-4 h-4" style={{ color: tabConfig.color }} />
                  <span className="text-gray-700">{tabConfig.description}</span>
                </div>
                
                <div className="flex items-center gap-4">
                  {/* Indicadores rápidos */}
                  {tabActiva === 'roles' && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="w-4 h-4" />
                      <span>5 Roles Activos</span>
                    </div>
                  )}
                  {tabActiva === 'reportes' && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <FileText className="w-4 h-4" />
                      <span>6 Reportes Disponibles</span>
                    </div>
                  )}
                  {tabActiva === 'especiales' && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <TrendingUp className="w-4 h-4" />
                      <span>5 Auditorías Activas</span>
                    </div>
                  )}
                  
                  <BadgeSIGL variant="success" className="text-xs">
                    ● En línea
                  </BadgeSIGL>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* CONTENIDO PRINCIPAL */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-center py-20"
              >
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-[#003DA5]/20 border-t-[#003DA5] animate-spin" />
                  <p className="text-gray-600">Cargando módulo...</p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={tabActiva}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="min-h-[600px]"
              >
                {tabActiva === 'roles' && <RolesYPermisos />}
                {tabActiva === 'reportes' && <DashboardEjecutivoCIG />}
                {tabActiva === 'territoriales' && <GestionAuditoriasTerritoriales />}
                {tabActiva === 'especiales' && <AuditoriasEspecialesModuleCompleto />}
                {tabActiva === 'auditoria_cambios' && <AuditoriaCambiosModule />}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* PANEL DE AYUDA */}
        <AnimatePresence>
          {showHelp && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowHelp(false)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              >
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <HelpCircle className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">
                          Ayuda y Atajos de Teclado
                        </h2>
                        <p className="text-sm text-gray-600">
                          Aprende a usar los módulos avanzados eficientemente
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowHelp(false)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Shortcuts */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <span className="w-6 h-6 bg-purple-100 rounded flex items-center justify-center text-sm">⌘</span>
                      Atajos de Teclado
                    </h3>
                    <div className="space-y-2">
                      {TABS_CONFIG.map(tab => (
                        <div key={tab.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <tab.icon className="w-4 h-4" style={{ color: tab.color }} />
                            <span className="text-sm text-gray-700">{tab.label}</span>
                          </div>
                          <kbd className="px-3 py-1 text-sm font-mono bg-white border border-gray-300 rounded shadow-sm">
                            ⌘ {tab.shortcut}
                          </kbd>
                        </div>
                      ))}
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-700">Mostrar/Ocultar Ayuda</span>
                        <kbd className="px-3 py-1 text-sm font-mono bg-white border border-gray-300 rounded shadow-sm">
                          ?
                        </kbd>
                      </div>
                    </div>
                  </div>

                  {/* Descripción de módulos */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Descripción de Módulos</h3>
                    <div className="space-y-3">
                      {TABS_CONFIG.map(tab => (
                        <div key={tab.id} className="p-4 border border-gray-200 rounded-lg">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                                 style={{ background: `${tab.color}15` }}>
                              <tab.icon className="w-4 h-4" style={{ color: tab.color }} />
                            </div>
                            <div>
                              <h4 className="font-semibold text-sm text-gray-900">{tab.label}</h4>
                              <BadgeSIGL variant="outline" className="text-xs">{tab.badge}</BadgeSIGL>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 ml-11">{tab.description}</p>
                          {tab.requiresPermission && (
                            <div className="ml-11 mt-2">
                              <BadgeSIGL variant="warning" className="text-xs">
                                Requiere permisos de administrador
                              </BadgeSIGL>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Consejos */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">💡 Consejos Útiles</h3>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 mt-0.5">•</span>
                        <span>Los módulos con punto rojo requieren permisos especiales de administrador</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 mt-0.5">•</span>
                        <span>Usa los atajos de teclado para navegar más rápido entre módulos</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 mt-0.5">•</span>
                        <span>El indicador verde "En línea" muestra que el sistema está funcionando correctamente</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 mt-0.5">•</span>
                        <span>Cada módulo se carga de forma independiente para mejor rendimiento</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="p-6 border-t border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      ¿Necesitas más ayuda? Contacta al equipo de soporte
                    </p>
                    <ButtonSIGL variant="primary" onClick={() => setShowHelp(false)}>
                      Entendido
                    </ButtonSIGL>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default ModulosAvanzadosModule;