/**
 * SystemSwitcher - Selector compacto para cambiar entre sistemas
 * Permite a usuarios con acceso dual cambiar entre Backoffice y Portal
 */

import { useState, useRef, useEffect } from 'react';
import { Building2, Users, ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SystemSwitcherProps {
  currentSystem: 'backoffice' | 'portal';
  onSystemChange: (system: 'backoffice' | 'portal') => void;
}

export function SystemSwitcher({ currentSystem, onSystemChange }: SystemSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const systems = [
    {
      id: 'backoffice' as const,
      name: 'Backoffice',
      fullName: 'Backoffice Administrativo',
      icon: Building2,
      color: '#003DA5',
      bgColor: 'bg-[#003DA5]',
      bgHover: 'hover:bg-[#002d7a]',
      lightBg: 'bg-blue-50',
      description: 'Sistema de gestión interna'
    },
    {
      id: 'portal' as const,
      name: 'Portal',
      fullName: 'Portal Transaccional',
      icon: Users,
      color: '#10b981',
      bgColor: 'bg-emerald-500',
      bgHover: 'hover:bg-emerald-600',
      lightBg: 'bg-emerald-50',
      description: 'Red social universitaria'
    }
  ];

  const currentSystemData = systems.find(s => s.id === currentSystem);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSystemChange = (systemId: 'backoffice' | 'portal') => {
    if (systemId !== currentSystem) {
      setIsOpen(false);
      onSystemChange(systemId);
    }
  };

  if (!currentSystemData) return null;

  const CurrentIcon = currentSystemData.icon;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botón principal */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl ${currentSystemData.bgColor} ${currentSystemData.bgHover} text-white transition-all duration-200 shadow-md hover:shadow-lg group`}
      >
        <CurrentIcon className="w-5 h-5" />
        <span className="font-semibold hidden sm:inline">{currentSystemData.name}</span>
        <ChevronDown 
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border-2 border-slate-200 overflow-hidden z-50"
          >
            <div className="p-2">
              <div className="px-3 py-2 border-b border-slate-200 mb-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Cambiar de sistema
                </p>
              </div>

              {systems.map((system) => {
                const Icon = system.icon;
                const isActive = system.id === currentSystem;

                return (
                  <button
                    key={system.id}
                    onClick={() => handleSystemChange(system.id)}
                    className={`w-full flex items-start gap-3 px-3 py-3 rounded-xl transition-all duration-200 ${
                      isActive
                        ? `${system.lightBg} border-2 border-current`
                        : 'hover:bg-slate-50 border-2 border-transparent'
                    }`}
                    style={{ 
                      color: isActive ? system.color : undefined 
                    }}
                  >
                    {/* Icon container */}
                    <div 
                      className={`p-2 rounded-lg flex-shrink-0 ${
                        isActive ? system.bgColor : 'bg-slate-100'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-600'}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 text-left">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className={`font-bold text-sm ${
                          isActive ? '' : 'text-slate-800'
                        }`}>
                          {system.fullName}
                        </h3>
                        {isActive && (
                          <Check className="w-5 h-5 flex-shrink-0" />
                        )}
                      </div>
                      <p className={`text-xs mt-0.5 ${
                        isActive ? 'opacity-80' : 'text-slate-600'
                      }`}>
                        {system.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Info footer */}
            <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-emerald-50 border-t border-slate-200">
              <p className="text-xs text-slate-600 text-center">
                Tienes acceso a <span className="font-bold text-[#003DA5]">ambos sistemas</span>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
