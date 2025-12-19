/**
 * LAYOUT UNIFICADO PARA MÓDULOS
 * Sistema de diseño compartido entre Control Interno, Control Disciplinario y Gestión Legal
 * Garantiza coherencia visual y experiencia de usuario consistente
 */

import { useState, ReactNode, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Menu, X } from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { useKeyboardNavigation } from '../../../hooks/useKeyboardNavigation';
import { KeyboardShortcutsHelper } from './KeyboardShortcutsHelper';

export interface MenuItem {
  id: string;
  label: string;
  icon: ReactNode;
  badge?: number;
  color?: string;
}

interface ModuleLayoutProps {
  // Configuración del módulo
  moduleName: string;
  moduleDescription: string;
  moduleIcon: ReactNode;
  moduleColor: string; // Color principal del módulo (#F97316, #003DA5, #8B5CF6)
  
  // Menú y navegación
  menuItems: MenuItem[];
  activeSection: string;
  onSectionChange: (section: string) => void;
  
  // Breadcrumb
  breadcrumb: string[];
  
  // Contenido
  children: ReactNode;
  
  // Opciones
  initialSidebarCollapsed?: boolean;
}

export function ModuleLayout({
  moduleName,
  moduleDescription,
  moduleIcon,
  moduleColor,
  menuItems,
  activeSection,
  onSectionChange,
  breadcrumb,
  children,
  initialSidebarCollapsed = false
}: ModuleLayoutProps) {
  // Detectar tamaño de pantalla
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );
  
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 768;
  const isSmallTablet = windowWidth >= 768 && windowWidth < 1024;
  
  // Auto-colapsar en pantallas pequeñas (tablets)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    initialSidebarCollapsed || isSmallTablet
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Auto-colapsar cuando la pantalla es pequeña
  useEffect(() => {
    if (isSmallTablet && !sidebarCollapsed) {
      setSidebarCollapsed(true);
    }
  }, [isSmallTablet]);

  // Cerrar menú mobile al cambiar de sección
  const handleSectionChange = (section: string) => {
    onSectionChange(section);
    setMobileMenuOpen(false);
  };

  // ✅ NAVEGACIÓN POR TECLADO
  useKeyboardNavigation({
    menuItems,
    activeSection,
    onSectionChange: handleSectionChange,
    mobileMenuOpen,
    setMobileMenuOpen,
    isMobile
  });

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#F9FAFB' }}>
      {/* OVERLAY para Mobile Menu */}
      <AnimatePresence>
        {isMobile && mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* SIDEBAR MOBILE - Drawer desde la izquierda */}
      <AnimatePresence>
        {isMobile && mobileMenuOpen && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed left-0 top-0 bottom-0 w-[280px] z-50 flex flex-col"
            style={{ 
              background: '#FFFFFF',
              boxShadow: '4px 0 12px rgba(0, 0, 0, 0.1)'
            }}
          >
            {/* Header del Sidebar Mobile */}
            <div className="p-4 border-b-2" style={{ borderColor: '#E5E7EB' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className="p-2 rounded-xl" style={{ background: `${moduleColor}15` }}>
                    <div style={{ color: moduleColor }}>
                      {moduleIcon}
                    </div>
                  </div>
                  <div className="flex-1">
                    <h2 className="font-black text-sm leading-tight" style={{ color: moduleColor }}>
                      {moduleName}
                    </h2>
                    <p className="text-xs" style={{ color: '#9CA3AF' }}>
                      {moduleDescription}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => setMobileMenuOpen(false)}
                  variant="ghost"
                  size="sm"
                  className="flex-shrink-0"
                  style={{ color: moduleColor }}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Menu Items Mobile */}
            <nav className="flex-1 overflow-y-auto p-3">
              <div className="space-y-1">
                {menuItems.map((item) => {
                  const isActive = activeSection === item.id;
                  const itemColor = item.color || moduleColor;
                  
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSectionChange(item.id)}
                      className="w-full rounded-xl p-3 transition-all relative"
                      style={{
                        background: isActive ? `${itemColor}15` : 'transparent',
                        color: isActive ? itemColor : '#6B7280'
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                          {item.icon}
                        </div>
                        <span className="font-bold text-sm flex-1 text-left">
                          {item.label}
                        </span>
                        {item.badge && (
                          <Badge 
                            className="text-xs font-bold"
                            style={{ 
                              background: itemColor,
                              color: '#FFFFFF'
                            }}
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </div>

                      {/* Indicador activo */}
                      {isActive && (
                        <div
                          className="absolute left-0 top-0 bottom-0 w-1 rounded-r-full"
                          style={{ background: itemColor }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </nav>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* SIDEBAR DESKTOP/TABLET */}
      <motion.aside
        initial={false}
        animate={{ 
          width: sidebarCollapsed ? 64 : (isSmallTablet ? 200 : 280)
        }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        className="hidden md:flex flex-shrink-0 border-r-2 flex-col"
        style={{ 
          background: '#FFFFFF',
          borderColor: '#E5E7EB'
        }}
      >
        {/* Header del Sidebar */}
        <div className="p-4 border-b-2" style={{ borderColor: '#E5E7EB' }}>
          <div className="flex items-center justify-between">
            <AnimatePresence mode="wait">
              {!sidebarCollapsed && (
                <motion.div
                  key="expanded"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
                  className="flex items-center gap-3 flex-1"
                >
                  <div className="p-2 rounded-xl" style={{ background: `${moduleColor}15` }}>
                    <div style={{ color: moduleColor }}>
                      {moduleIcon}
                    </div>
                  </div>
                  <div className="flex-1">
                    <h2 className="font-black text-sm leading-tight" style={{ color: moduleColor }}>
                      {moduleName}
                    </h2>
                    <p className="text-xs" style={{ color: '#9CA3AF' }}>
                      {moduleDescription}
                    </p>
                  </div>
                  <Button
                    onClick={() => setSidebarCollapsed(true)}
                    variant="ghost"
                    size="sm"
                    className="flex-shrink-0"
                    style={{ color: moduleColor }}
                    title="Contraer menú"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                </motion.div>
              )}
              {sidebarCollapsed && (
                <motion.div
                  key="collapsed"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
                  className="mx-auto relative group"
                >
                  <button
                    onClick={() => setSidebarCollapsed(false)}
                    className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
                    style={{ background: `${moduleColor}15` }}
                    title="Expandir menú"
                  >
                    <div style={{ color: moduleColor }}>
                      {moduleIcon}
                    </div>
                  </button>
                  {/* Tooltip */}
                  <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50" 
                       style={{ background: '#1F2937', color: '#FFFFFF', fontSize: '12px' }}>
                    Expandir menú
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 overflow-y-auto p-3">
          <div className="space-y-1">
            {menuItems.map((item) => {
              const isActive = activeSection === item.id;
              const itemColor = item.color || moduleColor;
              
              return (
                <motion.button
                  key={item.id}
                  onClick={() => onSectionChange(item.id)}
                  className="w-full rounded-xl p-3 transition-all relative group"
                  style={{
                    background: isActive ? `${itemColor}15` : 'transparent',
                    color: isActive ? itemColor : '#6B7280'
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex-shrink-0 ${sidebarCollapsed ? 'mx-auto' : ''}`}>
                      {item.icon}
                    </div>
                    {!sidebarCollapsed && (
                      <span className="font-bold text-sm flex-1 text-left truncate">
                        {item.label}
                      </span>
                    )}
                    {!sidebarCollapsed && item.badge && (
                      <Badge 
                        className="text-xs font-bold"
                        style={{ 
                          background: itemColor,
                          color: '#FFFFFF'
                        }}
                      >
                        {item.badge}
                      </Badge>
                    )}
                  </div>

                  {/* Indicador activo */}
                  {isActive && (
                    <motion.div
                      layoutId={`activeIndicator-${moduleName}`}
                      className="absolute left-0 top-0 bottom-0 w-1 rounded-r-full"
                      style={{ background: itemColor }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}

                  {/* Tooltip para sidebar colapsado */}
                  {sidebarCollapsed && (
                    <div className="absolute left-full ml-2 px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50" 
                         style={{ background: '#1F2937', color: '#FFFFFF', fontSize: '12px' }}>
                      {item.label}
                      {item.badge && (
                        <span className="ml-2 px-2 py-0.5 rounded-full" style={{ background: itemColor }}>
                          {item.badge}
                        </span>
                      )}
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </nav>

        {/* Toggle Button */}
        <div className="p-3 border-t-2" style={{ borderColor: '#E5E7EB' }}>
          <Button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            variant="outline"
            className="w-full border-2"
            style={{ borderColor: '#E5E7EB' }}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-5 h-5 mx-auto" />
            ) : (
              <>
                <ChevronLeft className="w-5 h-5 mr-2" />
                <span className="font-bold text-sm">Contraer</span>
              </>
            )}
          </Button>
        </div>
      </motion.aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 overflow-hidden flex flex-col w-full">
        {/* Breadcrumb Unificado CON BOTÓN HAMBURGUESA MOBILE */}
        <div className="p-3 sm:p-4 md:p-6 border-b-2" style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}>
          <div className="flex items-center gap-3">
            {/* Botón Hamburguesa - Solo Mobile */}
            {isMobile && (
              <Button
                onClick={() => setMobileMenuOpen(true)}
                variant="ghost"
                size="sm"
                className="flex-shrink-0 md:hidden -ml-2"
                style={{ color: moduleColor }}
              >
                <Menu className="w-6 h-6" />
              </Button>
            )}
            
            {/* Breadcrumb */}
            <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm overflow-x-auto flex-1">
              {breadcrumb.map((item, index) => (
                <div key={index} className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                  {index > 0 && <span style={{ color: '#D1D5DB' }}>/</span>}
                  <span 
                    className={index === breadcrumb.length - 1 ? 'font-bold' : ''}
                    style={{ color: index === breadcrumb.length - 1 ? moduleColor : '#9CA3AF' }}
                  >
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Área de Contenido con Scroll */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-3 sm:p-4 md:p-6 h-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="h-full"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* ⌨️ HELPER DE ATAJOS DE TECLADO */}
      <KeyboardShortcutsHelper moduleColor={moduleColor} />
    </div>
  );
}