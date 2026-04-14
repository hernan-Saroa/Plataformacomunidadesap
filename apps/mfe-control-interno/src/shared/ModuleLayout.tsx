/**
 * LAYOUT UNIFICADO PARA MÓDULOS
 * Sistema de diseño compartido entre Control Interno, Control Disciplinario y Gestión Legal
 * Garantiza coherencia visual y experiencia de usuario consistente
 */

import { useState, ReactNode, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Menu, X } from 'lucide-react';
import { Button } from '@esap-mfe/shared-ui/button';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { useKeyboardNavigation } from '../../../hooks/useKeyboardNavigation';
import { KeyboardShortcutsHelper } from './KeyboardShortcutsHelper';
import { ESAPLogo } from '../../assets/ESAPLogo';

export interface MenuItem {
  id: string;
  label: string;
  subtitle?: string; // Subtítulo opcional para mostrar en tooltips
  icon: ReactNode;
  badge?: number;
  color?: string;
  visible?: boolean; // Si es false, no se muestra en el menú (por defecto true)
}

interface ModuleLayoutProps {
  // Configuración del módulo
  moduleName?: string; // Opcional para ocultar header
  moduleDescription?: string; // Opcional para ocultar header
  moduleIcon: ReactNode;
  moduleColor: string; // Color principal del módulo (#F97316, #003DA5, #8B5CF6)
  
  // Menú y navegación
  menuItems: MenuItem[];
  activeSection: string;
  onSectionChange: (section: string) => void;
  
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
                {moduleName ? (
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
                ) : (
                  <div className="p-2 rounded-xl flex-1 flex justify-center" style={{ background: `${moduleColor}15` }}>
                    <div style={{ color: moduleColor }}>
                      {moduleIcon}
                    </div>
                  </div>
                )}
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
                  if (item.visible != undefined && !item.visible) return null;
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
        className="hidden md:flex flex-shrink-0 border-r-2 flex-col relative h-screen"
        style={{ 
          background: '#FFFFFF',
          borderColor: '#E5E7EB'
        }}
      >
        {/* Header del Sidebar */}
        <div className="p-4 border-b-2 relative" style={{ borderColor: '#E5E7EB' }}>
          <AnimatePresence mode="wait">
            {!sidebarCollapsed ? (
              <motion.div
                key="expanded"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
                className="flex items-center gap-3"
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
              </motion.div>
            ) : (
              <motion.div
                key="collapsed"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
                className="w-full flex items-center justify-center"
              >
                {/* ✅ Ícono del módulo cuando está colapsado (centrado y más grande) */}
                <div 
                  className="p-3 rounded-xl" 
                  style={{ background: `${moduleColor}15` }}
                >
                  <div style={{ color: moduleColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {moduleIcon}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* ✅ Botón Toggle Premium - SIEMPRE VISIBLE (Igual que SidebarPremium) */}
          <motion.button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="absolute -right-3 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-xl border-2 z-10"
            style={{ 
              top: '50%', 
              transform: 'translateY(-50%)', 
              borderColor: '#E5E7EB',
              color: moduleColor
            }}
            whileHover={{ 
              scale: 1.15,
              boxShadow: `0 8px 24px ${moduleColor}30`
            }}
            whileTap={{ scale: 0.9 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
              mass: 0.8
            }}
            title={sidebarCollapsed ? 'Expandir menú' : 'Contraer menú'}
          >
            <motion.div
              animate={{ rotate: sidebarCollapsed ? 180 : 0 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 30,
                mass: 0.8
              }}
            >
              <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
            </motion.div>
          </motion.button>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 overflow-y-auto p-3">
          <div className="space-y-1">
            {menuItems.map((item) => {
              const isActive = activeSection === item.id;
              const itemColor = item.color || moduleColor;
              if (item.visible != undefined && !item.visible) return null;
              return (
                <motion.button
                  key={item.id}
                  onClick={() => onSectionChange(item.id)}
                  className={`w-full rounded-xl transition-all relative group ${
                    sidebarCollapsed ? 'p-2.5' : 'p-3'
                  }`}
                  style={{
                    background: isActive ? `${itemColor}15` : 'transparent',
                    color: isActive ? itemColor : '#6B7280'
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {sidebarCollapsed ? (
                    // ✅ MODO COLAPSADO: Ícono centrado perfectamente
                    <div className="flex items-center justify-center w-full">
                      {item.icon}
                    </div>
                  ) : (
                    // MODO EXPANDIDO: Layout normal con texto
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        {item.icon}
                      </div>
                      <span className="font-bold text-sm flex-1 text-left truncate">
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
                  )}

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
                    <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg whitespace-nowrap" 
                         style={{ background: '#1F2937', color: '#FFFFFF', fontSize: '12px', maxWidth: '250px' }}>
                      <div className="font-semibold">{item.label}</div>
                      {item.subtitle && (
                        <div className="text-xs opacity-80 mt-0.5 whitespace-normal">{item.subtitle}</div>
                      )}
                      {item.badge && (
                        <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: itemColor }}>
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
      </motion.aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col w-full overflow-y-auto">
        {/* Header CON BOTÓN HAMBURGUESA MOBILE */}
        {isMobile && (
          <div className="p-3 border-b-2" style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}>
            <Button
              onClick={() => setMobileMenuOpen(true)}
              variant="ghost"
              size="sm"
              className="flex-shrink-0 -ml-2"
              style={{ color: moduleColor }}
            >
              <Menu className="w-6 h-6" />
            </Button>
          </div>
        )}

        {/* Área de Contenido con Scroll - PADDING REDUCIDO */}
        <div className="flex-1">
          <div className="p-3 sm:p-4 md:p-5 lg:p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}