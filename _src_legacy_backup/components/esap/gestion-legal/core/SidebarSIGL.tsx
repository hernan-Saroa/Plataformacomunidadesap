/**
 * SidebarSIGL - Menú lateral vertical SIGL
 * DISEÑO 100% COHERENTE CON CONTROL DISCIPLINARIO Y CONTROL INTERNO
 * FONDO BLANCO COMO EL RESTO DEL SISTEMA
 * ✅ COLAPSABLE con botón visible en header (igual que SidebarPremium)
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard,
  Scale,
  Gavel,
  FileQuestion,
  Inbox,
  CalendarClock,
  ChevronRight,
  Briefcase,
  Building2,
  DollarSign,
  Mail,
  Target,
  AlertTriangle,
  ClipboardCheck,
  ChevronLeft
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../ui/tooltip';

interface SidebarSIGLProps {
  vistaActual: string;
  onCambiarVista: (vista: string) => void;
}

export function SidebarSIGL({ vistaActual, onCambiarVista }: SidebarSIGLProps) {
  // Estado para controlar si el sidebar está colapsado
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Animación spring premium (igual que SidebarPremium)
  const springTransition = {
    type: "spring" as const,
    stiffness: 300,
    damping: 30,
    mass: 0.8
  };

  const contentTransition = {
    duration: 0.2,
    ease: [0.4, 0, 0.2, 1] as [number, number, number, number]
  };

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      color: '#003DA5',
      descripcion: 'Vista general',
      fase: 'MVP'
    },
    {
      id: 'defensa-judicial',
      label: 'Defensa Judicial',
      icon: Scale,
      color: '#10B981',
      descripcion: '15 expedientes',
      fase: 'MVP'
    },
    {
      id: 'juzgamiento',
      label: 'Juzgamiento',
      icon: Gavel,
      color: '#DC2626',
      descripcion: '12 procesos',
      fase: 'MVP'
    },
    {
      id: 'asesoria',
      label: 'Asesoría Jurídica',
      icon: FileQuestion,
      color: '#8B5CF6',
      descripcion: '12 consultas',
      fase: 'MVP'
    },
    {
      id: 'buzon',
      label: 'Buzón Notif.',
      icon: Inbox,
      color: '#3B82F6',
      descripcion: '13 notificaciones',
      fase: 'MVP'
    },
    {
      id: 'terminos',
      label: 'Términos',
      icon: CalendarClock,
      color: '#6366F1',
      descripcion: '13 términos',
      fase: 'MVP'
    },
    {
      id: 'organos-control',
      label: 'Órganos Control',
      icon: Building2,
      color: '#2563EB',
      descripcion: '6 requerimientos',
      fase: 'FASE2'
    },
    {
      id: 'procesos-coactivos',
      label: 'Procesos Coactivos',
      icon: DollarSign,
      color: '#F59E0B',
      descripcion: '6 procesos',
      fase: 'FASE2'
    },
    {
      id: 'buzon-oj',
      label: 'Buzón OJ',
      icon: Mail,
      color: '#4F46E5',
      descripcion: '8 correos',
      fase: 'FASE2'
    },
    {
      id: 'plan-accion',
      label: 'Plan de Acción',
      icon: Target,
      color: '#7C3AED',
      descripcion: '5 indicadores',
      fase: 'FASE2'
    },
    {
      id: 'riesgos',
      label: 'Riesgos',
      icon: AlertTriangle,
      color: '#DC2626',
      descripcion: '5 riesgos',
      fase: 'FASE2'
    },
    {
      id: 'planes-mejoramiento',
      label: 'Planes Mejora',
      icon: ClipboardCheck,
      color: '#14B8A6',
      descripcion: '5 planes',
      fase: 'FASE2'
    },
  ];

  // Función para renderizar items del menú
  const renderMenuItem = (item: typeof menuItems[0]) => {
    const Icon = item.icon;
    const isActive = vistaActual === item.id;

    const buttonContent = (
      <button
        onClick={() => onCambiarVista(item.id)}
        className={`w-full mb-1 rounded-lg transition-all duration-200 group hover:bg-gray-50 ${
          isActive ? 'bg-gray-50' : ''
        } ${isCollapsed ? 'px-2 py-2' : ''}`}
      >
        <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : 'p-3'}`}>
          <div 
            className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
            style={{ 
              backgroundColor: isActive ? item.color : '#F3F4F6',
            }}
          >
            <Icon 
              size={16} 
              className={isActive ? 'text-white' : 'text-gray-600'}
            />
          </div>
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={contentTransition}
                className="flex-1 text-left"
              >
                <p 
                  className={`text-sm font-medium ${
                    isActive ? 'text-gray-900' : 'text-gray-700'
                  }`}
                >
                  {item.label}
                </p>
                <p className="text-xs text-gray-500">
                  {item.descripcion}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
          {!isCollapsed && isActive && (
            <ChevronRight size={16} className="text-gray-400" />
          )}
        </div>
      </button>
    );

    if (isCollapsed) {
      return (
        <Tooltip key={item.id} delayDuration={200}>
          <TooltipTrigger asChild>
            {buttonContent}
          </TooltipTrigger>
          <TooltipContent 
            side="right" 
            className="text-xs px-3 py-2 bg-gray-900/95 backdrop-blur-xl border-white/10"
            sideOffset={12}
          >
            <div>
              <div className="font-semibold text-white">{item.label}</div>
              <div className="text-white/70 mt-0.5">{item.descripcion}</div>
            </div>
          </TooltipContent>
        </Tooltip>
      );
    }

    return <div key={item.id}>{buttonContent}</div>;
  };

  return (
    <motion.div 
      className="h-full flex flex-col border-r border-gray-200 bg-white relative"
      animate={{ width: isCollapsed ? 80 : 256 }}
      transition={springTransition}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200 relative">
        <AnimatePresence mode="wait">
          {isCollapsed ? (
            <motion.div
              key="collapsed-header"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={springTransition}
              className="flex flex-col items-center"
            >
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: '#003DA5' }}
              >
                <Briefcase size={24} className="text-white" />
              </div>
              <p className="text-[10px] font-bold text-gray-900 mt-2">SIGL</p>
            </motion.div>
          ) : (
            <motion.div
              key="expanded-header"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={springTransition}
            >
              <div className="flex items-center gap-3 mb-2">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: '#003DA5' }}
                >
                  <Briefcase size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">GESTIÓN LEGAL</h3>
                  <p className="text-xs text-gray-500">SIGL v5.0</p>
                </div>
              </div>
              <p className="text-xs mt-2 text-gray-600">
                Sistema Integrado de Gestión Legal
              </p>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Botón Toggle Premium - SIEMPRE VISIBLE */}
        <motion.button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-xl border-2 border-gray-200 z-10"
          style={{ top: '50%', transform: 'translateY(-50%)', color: '#003DA5' }}
          whileHover={{ 
            scale: 1.15,
            boxShadow: '0 8px 24px rgba(0, 61, 165, 0.3)'
          }}
          whileTap={{ scale: 0.9 }}
          transition={springTransition}
        >
          <motion.div
            animate={{ rotate: isCollapsed ? 180 : 0 }}
            transition={springTransition}
          >
            <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
          </motion.div>
        </motion.button>
      </div>

      {/* Navegación */}
      <nav className="flex-1 overflow-y-auto p-2">
        {menuItems.map((item) => renderMenuItem(item))}
      </nav>

      {/* Footer */}
      <AnimatePresence mode="wait">
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={contentTransition}
            className="p-4 border-t border-gray-200"
          >
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
              <p className="text-xs font-semibold text-blue-900 mb-1">
                💡 Ayuda Rápida
              </p>
              <p className="text-xs text-blue-700">
                Presiona <kbd className="px-1 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-200">F1</kbd> para atajos
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
