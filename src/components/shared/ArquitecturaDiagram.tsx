/**
 * DIAGRAMA INTERACTIVO DE ARQUITECTURA
 * Visualización de todos los módulos y sus interacciones
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Users,
  Shield,
  GraduationCap,
  Award,
  UserCheck,
  CalendarDays,
  FileCheck,
  MessageSquare,
  BriefcaseBusiness,
  ClipboardList,
  FolderOpen,
  TrendingUp,
  BarChart3,
  ScrollText,
  Building2,
  Network,
  Settings,
  Database,
  Zap,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  X
} from 'lucide-react';

interface Modulo {
  id: string;
  nombre: string;
  icon: any;
  sistema: 'portal' | 'backoffice' | 'ambos';
  estado: 'completo' | 'parcial' | 'critico';
  interacciones: string[]; // IDs de módulos con los que interactúa
}

const MODULOS: Modulo[] = [
  // CORE
  {
    id: 'users',
    nombre: 'Usuarios y Personas',
    icon: Users,
    sistema: 'backoffice',
    estado: 'completo',
    interacciones: ['roles', 'dashboard', 'profesoral', 'certificados', 'graduados', 'portal-dashboard', 'ae']
  },
  {
    id: 'roles',
    nombre: 'Roles y Permisos',
    icon: Shield,
    sistema: 'backoffice',
    estado: 'completo',
    interacciones: ['users', 'dashboard', 'ae']
  },
  {
    id: 'dashboard',
    nombre: 'Dashboard Ejecutivo',
    icon: TrendingUp,
    sistema: 'backoffice',
    estado: 'completo',
    interacciones: ['users', 'estudiantes', 'graduados', 'certificados', 'ae', 'profesoral']
  },
  {
    id: 'auditoria',
    nombre: 'Auditoría',
    icon: ScrollText,
    sistema: 'backoffice',
    estado: 'parcial',
    interacciones: ['users', 'roles', 'certificados', 'ae', 'portal-dashboard']
  },
  {
    id: 'reportes',
    nombre: 'Reportes',
    icon: BarChart3,
    sistema: 'backoffice',
    estado: 'parcial',
    interacciones: ['users', 'graduados', 'certificados', 'ae', 'profesoral']
  },
  
  // ACADÉMICO
  {
    id: 'estudiantes',
    nombre: 'Estudiantes',
    icon: GraduationCap,
    sistema: 'ambos',
    estado: 'parcial',
    interacciones: ['users', 'dashboard', 'matriculas', 'portal-dashboard']
  },
  {
    id: 'graduados',
    nombre: 'Graduados',
    icon: Award,
    sistema: 'ambos',
    estado: 'completo',
    interacciones: ['users', 'dashboard', 'verificacion', 'certificados']
  },
  {
    id: 'profesoral',
    nombre: 'Gestión Profesoral',
    icon: UserCheck,
    sistema: 'backoffice',
    estado: 'parcial',
    interacciones: ['users', 'calendario', 'portal-horarios']
  },
  {
    id: 'calendario',
    nombre: 'Calendario Académico',
    icon: CalendarDays,
    sistema: 'backoffice',
    estado: 'parcial',
    interacciones: ['profesoral', 'portal-horarios']
  },
  {
    id: 'matriculas',
    nombre: 'Matrículas',
    icon: ClipboardList,
    sistema: 'ambos',
    estado: 'parcial',
    interacciones: ['estudiantes', 'estructura', 'programas', 'portal-dashboard']
  },
  
  // CERTIFICACIÓN
  {
    id: 'certificados',
    nombre: 'Certificados Laborales',
    icon: FileCheck,
    sistema: 'ambos',
    estado: 'parcial',
    interacciones: ['users', 'auditoria', 'reportes', 'portal-solicitudes']
  },
  {
    id: 'verificacion',
    nombre: 'Verificación de Títulos',
    icon: Award,
    sistema: 'ambos',
    estado: 'completo',
    interacciones: ['graduados']
  },
  
  // COMUNIDAD
  {
    id: 'comunidad-back',
    nombre: 'Gestión Comunidad (BO)',
    icon: MessageSquare,
    sistema: 'backoffice',
    estado: 'critico',
    interacciones: ['comunidad-portal'] // DEBE UNIFICARSE
  },
  {
    id: 'comunidad-portal',
    nombre: 'Comunidad ESAP (Portal)',
    icon: MessageSquare,
    sistema: 'portal',
    estado: 'critico',
    interacciones: ['comunidad-back'] // DEBE UNIFICARSE
  },
  {
    id: 'bolsa',
    nombre: 'Bolsa de Trabajo',
    icon: BriefcaseBusiness,
    sistema: 'ambos',
    estado: 'parcial',
    interacciones: ['portal-dashboard']
  },
  
  // ARQUITECTURA EMPRESARIAL
  {
    id: 'ae',
    nombre: 'Arquitectura Empresarial',
    icon: Network,
    sistema: 'backoffice',
    estado: 'completo',
    interacciones: ['users', 'roles', 'dashboard', 'ae-tareas-portal']
  },
  {
    id: 'ae-tareas-portal',
    nombre: 'Tareas AE (Portal)',
    icon: Zap,
    sistema: 'portal',
    estado: 'completo',
    interacciones: ['ae']
  },
  
  // PORTAL
  {
    id: 'portal-dashboard',
    nombre: 'Dashboard Personal',
    icon: TrendingUp,
    sistema: 'portal',
    estado: 'completo',
    interacciones: ['users', 'estudiantes', 'certificados', 'portal-solicitudes']
  },
  {
    id: 'portal-solicitudes',
    nombre: 'Solicitudes (Portal)',
    icon: FileCheck,
    sistema: 'portal',
    estado: 'parcial',
    interacciones: ['certificados']
  },
  {
    id: 'portal-horarios',
    nombre: 'Horarios (Portal)',
    icon: CalendarDays,
    sistema: 'portal',
    estado: 'parcial',
    interacciones: ['calendario', 'profesoral']
  },
  
  // INFRAESTRUCTURA
  {
    id: 'estructura',
    nombre: 'Estructura Organizacional',
    icon: Building2,
    sistema: 'backoffice',
    estado: 'completo',
    interacciones: ['users', 'dashboard', 'matriculas']
  },
  {
    id: 'programas',
    nombre: 'Programas Académicos',
    icon: GraduationCap,
    sistema: 'backoffice',
    estado: 'completo',
    interacciones: ['estudiantes', 'matriculas']
  }
];

export function ArquitecturaDiagram() {
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [showOnlyInteractions, setShowOnlyInteractions] = useState(false);

  const getModuleColor = (estado: string) => {
    switch (estado) {
      case 'completo': return 'bg-green-100 border-green-500 text-green-900';
      case 'parcial': return 'bg-yellow-100 border-yellow-500 text-yellow-900';
      case 'critico': return 'bg-red-100 border-red-500 text-red-900';
      default: return 'bg-gray-100 border-gray-500 text-gray-900';
    }
  };

  const getStatusIcon = (estado: string) => {
    switch (estado) {
      case 'completo': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'parcial': return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case 'critico': return <AlertCircle className="w-4 h-4 text-red-600" />;
      default: return null;
    }
  };

  const filteredModules = showOnlyInteractions && selectedModule
    ? MODULOS.filter(m => 
        m.id === selectedModule || 
        MODULOS.find(mod => mod.id === selectedModule)?.interacciones.includes(m.id) ||
        m.interacciones.includes(selectedModule)
      )
    : MODULOS;

  const modulosPorSistema = {
    backoffice: filteredModules.filter(m => m.sistema === 'backoffice'),
    portal: filteredModules.filter(m => m.sistema === 'portal'),
    ambos: filteredModules.filter(m => m.sistema === 'ambos')
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#003DA5] to-[#0052CC] p-6 text-white">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold">Arquitectura de Módulos ESAP</h2>
              <p className="text-white/90 mt-1">
                Backoffice + Portal Transaccional - Interacciones en tiempo real
              </p>
            </div>
            <button
              onClick={() => setSelectedModule(null)}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Leyenda */}
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">Completo</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-300" />
              <span className="text-sm">Parcial</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-300" />
              <span className="text-sm">Crítico</span>
            </div>
          </div>
        </div>

        {/* Controles */}
        <div className="p-4 border-b-2 border-gray-200 bg-gray-50">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <input
                type="checkbox"
                checked={showOnlyInteractions}
                onChange={(e) => setShowOnlyInteractions(e.target.checked)}
                disabled={!selectedModule}
                className="w-4 h-4"
              />
              Mostrar solo interacciones
            </label>
            {selectedModule && (
              <button
                onClick={() => {
                  setSelectedModule(null);
                  setShowOnlyInteractions(false);
                }}
                className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm font-semibold"
              >
                Limpiar selección
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="space-y-8">
            {/* Backoffice */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#003DA5]" />
                BACKOFFICE ADMINISTRATIVO ({modulosPorSistema.backoffice.length} módulos)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {modulosPorSistema.backoffice.map(modulo => (
                  <ModuleCard
                    key={modulo.id}
                    modulo={modulo}
                    isSelected={selectedModule === modulo.id}
                    isConnected={selectedModule ? modulo.interacciones.includes(selectedModule) : false}
                    onClick={() => setSelectedModule(modulo.id)}
                    getModuleColor={getModuleColor}
                    getStatusIcon={getStatusIcon}
                  />
                ))}
              </div>
            </div>

            {/* Portal */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-[#003DA5]" />
                PORTAL TRANSACCIONAL ({modulosPorSistema.portal.length} módulos)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {modulosPorSistema.portal.map(modulo => (
                  <ModuleCard
                    key={modulo.id}
                    modulo={modulo}
                    isSelected={selectedModule === modulo.id}
                    isConnected={selectedModule ? modulo.interacciones.includes(selectedModule) : false}
                    onClick={() => setSelectedModule(modulo.id)}
                    getModuleColor={getModuleColor}
                    getStatusIcon={getStatusIcon}
                  />
                ))}
              </div>
            </div>

            {/* Ambos */}
            {modulosPorSistema.ambos.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-[#003DA5]" />
                  MÓDULOS COMPARTIDOS ({modulosPorSistema.ambos.length} módulos)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {modulosPorSistema.ambos.map(modulo => (
                    <ModuleCard
                      key={modulo.id}
                      modulo={modulo}
                      isSelected={selectedModule === modulo.id}
                      isConnected={selectedModule ? modulo.interacciones.includes(selectedModule) : false}
                      onClick={() => setSelectedModule(modulo.id)}
                      getModuleColor={getModuleColor}
                      getStatusIcon={getStatusIcon}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Detalle de Interacciones */}
          {selectedModule && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 p-6 bg-blue-50 border-2 border-blue-200 rounded-xl"
            >
              <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <ArrowRight className="w-5 h-5 text-[#003DA5]" />
                Interacciones de: {MODULOS.find(m => m.id === selectedModule)?.nombre}
              </h4>
              <div className="space-y-2">
                {MODULOS.find(m => m.id === selectedModule)?.interacciones.map(interaccionId => {
                  const moduloInteraccion = MODULOS.find(m => m.id === interaccionId);
                  if (!moduloInteraccion) return null;
                  return (
                    <div key={interaccionId} className="flex items-center gap-3 text-sm">
                      <moduloInteraccion.icon className="w-4 h-4 text-[#003DA5]" />
                      <span className="font-semibold">{moduloInteraccion.nombre}</span>
                      <span className={`px-2 py-0.5 rounded text-xs ${getModuleColor(moduloInteraccion.estado)}`}>
                        {moduloInteraccion.estado}
                      </span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </div>

        {/* Footer Stats */}
        <div className="p-4 border-t-2 border-gray-200 bg-gray-50">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-green-600">
                {MODULOS.filter(m => m.estado === 'completo').length}
              </p>
              <p className="text-xs text-gray-600">Completos</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-600">
                {MODULOS.filter(m => m.estado === 'parcial').length}
              </p>
              <p className="text-xs text-gray-600">Parciales</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">
                {MODULOS.filter(m => m.estado === 'critico').length}
              </p>
              <p className="text-xs text-gray-600">Críticos</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-[#003DA5]">
                {MODULOS.reduce((acc, m) => acc + m.interacciones.length, 0)}
              </p>
              <p className="text-xs text-gray-600">Interacciones</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function ModuleCard({ 
  modulo, 
  isSelected, 
  isConnected, 
  onClick, 
  getModuleColor, 
  getStatusIcon 
}: any) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`p-3 rounded-lg border-2 text-left transition-all ${
        isSelected 
          ? 'border-[#003DA5] bg-blue-50 shadow-lg' 
          : isConnected
          ? 'border-blue-300 bg-blue-50'
          : getModuleColor(modulo.estado)
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <modulo.icon className="w-5 h-5" />
        {getStatusIcon(modulo.estado)}
      </div>
      <p className="text-xs font-bold">{modulo.nombre}</p>
      <p className="text-[10px] text-gray-600 mt-1">
        {modulo.interacciones.length} interacciones
      </p>
    </motion.button>
  );
}
