import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, Shield, Activity, BarChart3, TrendingUp, Zap, 
  GraduationCap, CheckCircle, Award, FolderOpen, FileCheck, 
  BookOpen, ClipboardList, Scale, Bell, Layout, Building2,
  ChevronDown, ChevronLeft, Briefcase
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import esapLogoWhite from 'figma:asset/2eabfe85218557ad27ece74d963c4a3b61b716be.png';
import esapLogoSimple from 'figma:asset/1a688049d0ee8e121a6f2fff3a4cd08b5a2451ba.png';

type ModuleType = 'users' | 'users-management' | 'carpeta-digital' | 'roles-permissions-complete' | 'roles-administration' | 'audit' | 'executive' | 'reports' | 'control-interno' | 'gestion-legal' | 'graduates' | 'graduates-management' | 'graduates-verification' | 'graduates-certificates' | 'graduates-review-requests' | 'aspirantes' | 'gestion-profesoral' | 'motor-reglas' | 'reportes' | 'documental' | 'notificaciones' | 'configuracion' | 'integraciones' | 'certificados-laborales' | 'estructura-organizacional' | 'programas-academicos' | 'arquitectura-empresarial' | 'centro-alertas';

interface SidebarProps {
  isOpen: boolean;
  currentModule?: string;
  currentSidebarModule?: string; // NUEVO: Para saber qué submódulo específico está activo
  onModuleChange?: (module: ModuleType) => void;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  forceCollapse?: boolean; // Auto-colapsar cuando modal de perfil esté abierto
  userRole?: string; // Rol del usuario para permisos
  certificatesPendingCount?: number; // Número de solicitudes pendientes en Certificados
  restrictedMode?: 'certificados-laborales' | 'arquitectura-empresarial' | 'control-interno' | 'gestion-profesoral' | 'gestion-legal'; // Modo restringido para usuarios especiales
}

const STORAGE_KEY = 'esap-sidebar-collapsed';

// Animación spring premium
const springTransition = {
  type: "spring",
  stiffness: 300,
  damping: 30,
  mass: 0.8
};

// Animación suave para el contenido
const contentTransition = {
  duration: 0.2,
  ease: [0.4, 0, 0.2, 1] // easing personalizado
};

export function SidebarPremium({ isOpen, currentModule, currentSidebarModule, onModuleChange, onClose, isCollapsed = false, onToggleCollapse, forceCollapse, userRole, certificatesPendingCount = 0, restrictedMode }: SidebarProps) {
  // Determinar si el sidebar debe estar colapsado (manual o forzado)
  const effectiveCollapsed = isCollapsed || forceCollapse;
  
  // Estado para controlar qué menús padre están expandidos
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    users: false,           // Menú Usuarios Admin cerrado por defecto
    graduates: false,       // Menú Graduados cerrado por defecto
    'roles-security': false, // Menú Roles y Permisos cerrado por defecto
    'users-management-menu': false, // Menú Gestión Personas cerrado por defecto
  });

  // Estado para controlar qué SECCIONES principales están expandidas (NUEVO)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    dashboard: true,            // Dashboard siempre visible
    'estructura-org': true,     // Estructura Organizacional ABIERTA por defecto
    'gestion-usuarios': false,  // Gestión Académica CERRADA por defecto
    'arquitectura': false,      // Arquitectura Empresarial CERRADA por defecto
  });
  
  // Persistir estado colapsado en localStorage
  useEffect(() => {
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState !== null && onToggleCollapse) {
      const shouldBeCollapsed = savedState === 'true';
      if (shouldBeCollapsed !== isCollapsed) {
        onToggleCollapse();
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(isCollapsed));
  }, [isCollapsed]);

  // Keyboard shortcut: Cmd/Ctrl + B para toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        onToggleCollapse?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onToggleCollapse]);

  const handleModuleClick = (module: ModuleType) => {
    onModuleChange?.(module);
    // Close sidebar on mobile after selecting a module
    if (window.innerWidth < 768) {
      onClose?.();
    }
  };

  const toggleMenuExpansion = (menuId: string) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuId]: !prev[menuId]
    }));
  };

  // Toggle de secciones principales (NUEVO)
  const toggleSectionExpansion = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };



  // Renderizar header de sección con toggle (NUEVO)
  const renderSectionHeader = (
    sectionId: string,
    icon: React.ReactNode,
    title: string,
    itemCount?: number
  ) => {
    if (effectiveCollapsed) {
      return (
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={contentTransition}
            className="text-white text-[11px] font-bold uppercase tracking-wider px-3 pb-2 flex items-center gap-2"
          >
            {icon}
            {title}
          </motion.div>
        </AnimatePresence>
      );
    }

    const isExpanded = expandedSections[sectionId];

    return (
      <motion.button
        onClick={() => toggleSectionExpansion(sectionId)}
        className={`w-full flex items-center gap-2 px-2 py-2.5 mb-2 transition-all group relative rounded-lg ${
          isExpanded ? 'text-white bg-white/8' : 'text-white/80 hover:text-white hover:bg-white/5'
        }`}
        whileHover={{ x: 1 }}
        whileTap={{ scale: 0.99 }}
        transition={springTransition}
      >
        {/* Indicador visual de expansión (borde izquierdo MÁS GRUESO) */}
        {isExpanded && (
          <motion.div
            initial={{ scaleY: 0, opacity: 0 }}
            animate={{ scaleY: 1, opacity: 1 }}
            exit={{ scaleY: 0, opacity: 0 }}
            className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-300 to-blue-500 rounded-r-full"
            style={{ boxShadow: '0 0 8px rgba(96, 165, 250, 0.5)' }}
          />
        )}
        
        <div className="flex-shrink-0">
          {icon}
        </div>
        <span className="text-[11px] font-bold uppercase tracking-wider text-left flex-1 leading-tight">
          {title}
        </span>
        
        {/* Flecha pequeña pero visible a la DERECHA */}
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={springTransition}
          className="flex-shrink-0 opacity-60 group-hover:opacity-90"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </motion.div>
      </motion.button>
    );
  };

  // Renderizar botón de menú simple con microinteracciones premium
  const renderMenuItem = (
    module: ModuleType,
    icon: React.ReactNode,
    label: string,
    subtitle?: string,
    badge?: string
  ) => {
    const isActive = currentModule === module;
    
    const buttonContent = (
      <motion.button
        onClick={() => handleModuleClick(module)}
        className={`w-full flex items-center gap-2 px-2 md:px-2.5 py-1.5 md:py-2 rounded-xl mb-1.5 transition-all duration-200 relative overflow-hidden group ${
          isActive
            ? 'text-white font-semibold shadow-lg'
            : 'text-white/80 hover:text-white'
        } ${effectiveCollapsed ? 'justify-center px-2' : ''}`}
        style={isActive ? { 
          backgroundColor: 'rgba(255, 255, 255, 0.12)',
          backdropFilter: 'blur(10px)'
        } : {}}
        whileHover={!isActive ? { 
          backgroundColor: 'rgba(255, 255, 255, 0.08)',
          x: effectiveCollapsed ? 0 : 2,
          scale: 1.01
        } : {}}
        whileTap={{ scale: 0.98 }}
        transition={springTransition}
      >
        {/* Barra lateral activa con animación */}
        <AnimatePresence>
          {isActive && (
            <motion.div 
              className="absolute left-0 top-1/2 w-1 rounded-r-full"
              style={{ 
                backgroundColor: '#60a5fa',
                boxShadow: '0 0 12px rgba(96, 165, 250, 0.6)'
              }}
              initial={{ height: 0, y: '-50%', opacity: 0 }}
              animate={{ height: '70%', y: '-50%', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={springTransition}
            />
          )}
        </AnimatePresence>

        {/* Glow effect en hover */}
        {!isActive && (
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent rounded-xl" />
          </div>
        )}
        
        <motion.div 
          className="flex-shrink-0 relative"
          animate={isActive ? { scale: [1, 1.1, 1] } : {}}
          transition={{ duration: 0.3 }}
        >
          {icon}
          {/* Pulse effect para items activos */}
          {isActive && (
            <motion.div
              className="absolute inset-0 rounded-lg"
              style={{ backgroundColor: 'rgba(96, 165, 250, 0.3)' }}
              animate={{ 
                scale: [1, 1.5, 1],
                opacity: [0.5, 0, 0.5]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          )}
        </motion.div>

        <AnimatePresence mode="wait">
          {!effectiveCollapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={contentTransition}
              className="flex-1 text-left min-w-0 flex items-center gap-2"
            >
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-medium block truncate leading-tight">{label}</span>
                {subtitle && (
                  <span className="text-[9px] text-white/60 block truncate mt-0.5">{subtitle}</span>
                )}
              </div>
              {badge && (
                <motion.span 
                  className="px-1.5 md:px-2 py-0.5 text-[9px] md:text-[10px] font-bold rounded-full flex-shrink-0"
                  style={{ 
                    backgroundColor: 'rgba(239, 68, 68, 0.95)',
                    color: '#ffffff',
                    boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)'
                  }}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  whileHover={{ scale: 1.1 }}
                  transition={springTransition}
                >
                  {badge}
                </motion.span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    );

    if (effectiveCollapsed) {
      return (
        <Tooltip key={module} delayDuration={200}>
          <TooltipTrigger asChild>
            {buttonContent}
          </TooltipTrigger>
          <TooltipContent 
            side="right" 
            className="text-xs px-3 py-2 bg-gray-900/95 backdrop-blur-xl border-white/10"
            sideOffset={12}
          >
            <div>
              <div className="font-semibold text-white">{label}</div>
              {subtitle && <div className="text-white/70 mt-0.5">{subtitle}</div>}
              {badge && (
                <div className="mt-1.5 pt-1.5 border-t border-white/10">
                  <span className="text-red-400 font-semibold">{badge} pendientes</span>
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      );
    }

    return buttonContent;
  };

  // Renderizar menú con submenús (optimizado)
  const renderMenuWithSubmenu = (
    menuId: string,
    module: ModuleType,
    icon: React.ReactNode,
    label: string,
    subtitle?: string,
    submenuItems?: Array<{
      module: ModuleType,
      icon: React.ReactNode,
      label: string,
      subtitle?: string,
      badge?: string
    }>
  ) => {
    const isActive = currentModule === module || submenuItems?.some(item => currentModule === item.module || currentSidebarModule === item.module);
    const isExpanded = expandedMenus[menuId];
    const hasSubmenu = submenuItems && submenuItems.length > 0;

    if (effectiveCollapsed) {
      return (
        <Tooltip key={menuId} delayDuration={200}>
          <TooltipTrigger asChild>
            <motion.button
              onClick={() => handleModuleClick(module)}
              className={`w-full flex items-center justify-center px-2 py-2.5 rounded-xl mb-1.5 transition-all duration-200 relative overflow-hidden ${
                isActive
                  ? 'text-white font-semibold'
                  : 'text-white/80 hover:bg-white/8 hover:text-white'
              }`}
              style={isActive ? { backgroundColor: 'rgba(255, 255, 255, 0.12)' } : {}}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={springTransition}
            >
              <AnimatePresence>
                {isActive && (
                  <motion.div 
                    className="absolute left-0 top-1/2 w-1 rounded-r-full"
                    style={{ backgroundColor: '#60a5fa' }}
                    initial={{ height: 0, y: '-50%' }}
                    animate={{ height: '70%', y: '-50%' }}
                    exit={{ height: 0 }}
                    transition={springTransition}
                  />
                )}
              </AnimatePresence>
              <div className="flex-shrink-0">
                {icon}
              </div>
            </motion.button>
          </TooltipTrigger>
          <TooltipContent 
            side="right" 
            className="text-xs px-3 py-2 bg-gray-900/95 backdrop-blur-xl border-white/10"
            sideOffset={12}
          >
            <div>
              <div className="font-semibold text-white">{label}</div>
              {subtitle && <div className="text-white/70 mt-0.5">{subtitle}</div>}
              {submenuItems && submenuItems.length > 0 && (
                <div className="mt-2 pt-2 border-t border-white/10 space-y-1">
                  {submenuItems.map((item, idx) => (
                    <div key={idx} className="text-white/80 text-xs flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1 h-1 rounded-full bg-white/40" />
                        {item.label}
                      </div>
                      {item.badge && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-red-500 text-white">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      );
    }

    return (
      <div key={menuId} className="mb-1.5">
        {/* Menú Padre */}
        <div className="relative flex items-stretch gap-0.5">
          <motion.button
            onClick={() => handleModuleClick(module)}
            className={`flex-1 flex items-center gap-3 px-3 py-2.5 transition-all duration-200 relative overflow-hidden group ${
              currentModule === module
                ? 'text-white font-semibold'
                : 'text-white/80 hover:text-white'
            } ${hasSubmenu ? 'rounded-l-xl' : 'rounded-xl'}`}
            style={currentModule === module ? { backgroundColor: 'rgba(255, 255, 255, 0.12)' } : {}}
            whileHover={currentModule !== module ? { 
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              x: 2 
            } : {}}
            whileTap={{ scale: 0.98 }}
            transition={springTransition}
          >
            <AnimatePresence>
              {currentModule === module && (
                <motion.div 
                  className="absolute left-0 top-1/2 w-1 rounded-r-full"
                  style={{ backgroundColor: '#60a5fa' }}
                  initial={{ height: 0, y: '-50%' }}
                  animate={{ height: '70%', y: '-50%' }}
                  exit={{ height: 0 }}
                  transition={springTransition}
                />
              )}
            </AnimatePresence>

            <div className="flex-shrink-0">
              {icon}
            </div>
            <div className="flex-1 text-left min-w-0">
              <span className="text-sm font-medium block truncate leading-tight">{label}</span>
              {subtitle && <span className="text-[11px] text-white/60 block truncate mt-0.5">{subtitle}</span>}
            </div>
            {submenuItems?.some(item => item.badge) && (
              <motion.div
                className="flex-shrink-0 w-2 h-2 rounded-full bg-red-500"
                animate={{
                  opacity: [1, 0.5, 1],
                  scale: [1, 1.2, 1]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
              />
            )}
          </motion.button>
          
          {hasSubmenu && (
            <motion.button
              onClick={() => toggleMenuExpansion(menuId)}
              className={`flex-shrink-0 px-2.5 transition-all duration-200 rounded-r-xl ${
                isActive
                  ? 'text-white bg-white/8'
                  : 'text-white/70 hover:bg-white/8 hover:text-white'
              }`}
              whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
              whileTap={{ scale: 0.95 }}
              transition={springTransition}
            >
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={springTransition}
              >
                <ChevronDown className="w-4 h-4" />
              </motion.div>
            </motion.button>
          )}
        </div>

        {/* Submenús con animación stagger */}
        <AnimatePresence>
          {hasSubmenu && isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden"
            >
              <div className="ml-4 pl-3 border-l-2 border-white/10 mt-1.5 space-y-0.5">
                {submenuItems.map((item, idx) => {
                  // Comparar con currentSidebarModule para subitems SIGL
                  const isSubmenuActive = currentSidebarModule === item.module || currentModule === item.module;
                  return (
                    <motion.button
                      key={idx}
                      onClick={() => handleModuleClick(item.module)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-200 relative group ${
                        isSubmenuActive
                          ? 'text-white font-semibold bg-white/8'
                          : 'text-white/70 hover:text-white'
                      }`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03, ...springTransition }}
                      whileHover={!isSubmenuActive ? { 
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        x: 2 
                      } : {}}
                      whileTap={{ scale: 0.98 }}
                    >
                      {isSubmenuActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-1/2 bg-white/70 rounded-r" />
                      )}
                      <div className="flex-shrink-0 opacity-90">
                        {item.icon}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <span className="text-sm font-medium block truncate">{item.label}</span>
                        {item.subtitle && <span className="text-[11px] text-white/50 block truncate mt-0.5">{item.subtitle}</span>}
                      </div>
                      {item.badge && (
                        <motion.span 
                          className="px-2 py-0.5 text-[10px] font-bold rounded-full flex-shrink-0"
                          style={{ 
                            backgroundColor: 'rgba(239, 68, 68, 0.95)',
                            color: '#ffffff'
                          }}
                          animate={{
                            scale: [1, 1.1, 1],
                            boxShadow: [
                              '0 2px 6px rgba(239, 68, 68, 0.3)',
                              '0 4px 12px rgba(239, 68, 68, 0.5)',
                              '0 2px 6px rgba(239, 68, 68, 0.3)'
                            ]
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: 'easeInOut'
                          }}
                          whileHover={{ scale: 1.15 }}
                        >
                          {item.badge}
                        </motion.span>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <>
      {/* Overlay para mobile */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[99] md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        id="sidebar-navigation"
        className={`fixed left-0 top-0 h-screen z-[100] overflow-hidden transition-all duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 ${
          effectiveCollapsed ? 'w-[80px]' : 'w-[280px] md:w-[260px] lg:w-[220px] xl:w-[240px] 2xl:w-[260px]'
        }`}
        style={{
          background: 'linear-gradient(to bottom, #1e5da8 0%, #154a85 100%)',
          boxShadow: '0 0 40px rgba(30, 93, 168, 0.3)',
        }}
        role="navigation"
        aria-label="Navegación principal"
      >
        {/* Scrollable content */}
        <div className="h-full overflow-y-auto overflow-x-hidden custom-scrollbar">
          {/* Header */}
          <div className="border-b border-white/10 p-3 relative">
            <motion.div 
              className="flex flex-col items-center gap-2"
              animate={{ gap: effectiveCollapsed ? 0 : 8 }}
              transition={contentTransition}
            >
              <motion.div 
                className="flex items-center justify-center w-full relative"
                animate={{ scale: effectiveCollapsed ? 0.9 : 1 }}
                transition={springTransition}
              >
                <AnimatePresence mode="wait">
                  {effectiveCollapsed ? (
                    <motion.img
                      key="logo-simple"
                      src={esapLogoSimple}
                      alt="ESAP"
                      className="object-contain h-12"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={springTransition}
                      style={{ filter: 'brightness(1.2) drop-shadow(0 2px 8px rgba(0,0,0,0.2))' }}
                    />
                  ) : (
                    <motion.img
                      key="logo-complete"
                      src={esapLogoWhite}
                      alt="ESAP"
                      className="object-contain h-10"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={springTransition}
                      style={{ filter: 'brightness(1.2) drop-shadow(0 2px 8px rgba(0,0,0,0.2))' }}
                    />
                  )}
                </AnimatePresence>
              </motion.div>
              
              <AnimatePresence mode="wait">
                {!effectiveCollapsed && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={contentTransition}
                    className="text-center overflow-hidden"
                  >

                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
            
            {/* Botón Toggle Premium */}
            <motion.button
              onClick={onToggleCollapse}
              className="hidden md:flex absolute -right-3 w-7 h-7 bg-white rounded-full items-center justify-center shadow-xl border-2 border-[#1e5da8] z-10 overflow-hidden"
              style={{ top: '50%', transform: 'translateY(-50%)', color: '#1e5da8' }}
              whileHover={{ 
                scale: 1.15,
                boxShadow: '0 8px 24px rgba(30, 93, 168, 0.4)'
              }}
              whileTap={{ scale: 0.9 }}
              transition={springTransition}
            >
              {/* Gradient background en hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-white opacity-0 hover:opacity-100 transition-opacity" />
              
              <motion.div
                animate={{ rotate: isCollapsed ? 0 : 180 }}
                transition={springTransition}
                className="relative z-10"
              >
                <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
              </motion.div>
            </motion.button>
          </div>

          {/* Navigation */}
          <nav className={`p-3 ${effectiveCollapsed ? 'px-2' : 'px-4'}`}>
            {/* Si es modo restringido (cerlaboral@esap.edu.co), solo mostrar Dashboard y Certificados Laborales */}
            {restrictedMode === 'certificados-laborales' ? (
              <>
                {/* Dashboard Ejecutivo - Solo estadísticas de certificados */}
                <div className="mb-8">
                  <AnimatePresence mode="wait">
                    {!effectiveCollapsed && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={contentTransition}
                        className="text-white/50 text-[10px] font-bold uppercase tracking-wider px-3 pb-3 flex items-center gap-2"
                      >
                        <Zap className="w-3 h-3" />
                        Principal
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  {renderMenuItem(
                    'executive',
                    <TrendingUp className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2} />,
                    'Dashboard Ejecutivo',
                    'Métricas generales'
                  )}
                </div>

                {/* Módulo de Certificados */}
                <div className="mb-8">
                  <AnimatePresence mode="wait">
                    {!effectiveCollapsed && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={contentTransition}
                        className="text-white/50 text-[10px] font-bold uppercase tracking-wider px-3 pb-3 flex items-center gap-2"
                      >
                        <Briefcase className="w-3 h-3" />
                        Gestión Laboral
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  {renderMenuItem(
                    'certificados-laborales',
                    <FileCheck className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2} />,
                    'Certificados Laborales',
                    'Certificación laboral'
                  )}
                </div>
              </>
            ) : restrictedMode === 'arquitectura-empresarial' ? (
              <>
                {/* Dashboard Ejecutivo - Solo estadísticas de arquitectura */}
                <div className="mb-8">
                  <AnimatePresence mode="wait">
                    {!effectiveCollapsed && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={contentTransition}
                        className="text-white/50 text-[10px] font-bold uppercase tracking-wider px-3 pb-3 flex items-center gap-2"
                      >
                        <Zap className="w-3 h-3" />
                        Principal
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  {renderMenuItem(
                    'executive',
                    <TrendingUp className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2} />,
                    'Dashboard Ejecutivo',
                    'Métricas de Arquitectura'
                  )}
                </div>

                {/* Módulo de Arquitectura Empresarial */}
                <div className="mb-8">
                  <AnimatePresence mode="wait">
                    {!effectiveCollapsed && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={contentTransition}
                        className="text-white/50 text-[10px] font-bold uppercase tracking-wider px-3 pb-3 flex items-center gap-2"
                      >
                        <Layout className="w-3 h-3" />
                        Arquitectura TI
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  {renderMenuItem(
                    'arquitectura-empresarial',
                    <Layout className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2} />,
                    'Arquitectura Empresarial',
                    'MRAE MinTIC Colombia'
                  )}
                </div>
              </>
            ) : restrictedMode === 'control-interno' ? (
              <>
                {/* Módulo de Control Interno - Único módulo visible */}
                <div className="mb-8">
                  <AnimatePresence mode="wait">
                    {!effectiveCollapsed && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={contentTransition}
                        className="text-white/50 text-[10px] font-bold uppercase tracking-wider px-3 pb-3 flex items-center gap-2"
                      >
                        <ClipboardList className="w-3 h-3" />
                        Control Interno
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  {renderMenuItem(
                    'control-interno',
                    <ClipboardList className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2} />,
                    'Control Interno Gestión',
                    'Auditorías y hallazgos'
                  )}
                </div>
              </>
            ) : restrictedMode === 'gestion-profesoral' ? (
              <>
                {/* Módulo de Gestión Profesoral - Único módulo visible */}
                <div className="mb-8">
                  <AnimatePresence mode="wait">
                    {!effectiveCollapsed && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={contentTransition}
                        className="text-white/50 text-[10px] font-bold uppercase tracking-wider px-3 pb-3 flex items-center gap-2"
                      >
                        <BookOpen className="w-3 h-3" />
                        Gestión Profesoral
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  {renderMenuItem(
                    'gestion-profesoral',
                    <BookOpen className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2} />,
                    'Gestión Profesoral',
                    'Administrar profesores'
                  )}
                </div>
              </>
            ) : restrictedMode === 'gestion-legal' ? (
              <>
                {/* Módulo de Gestión Legal - Único módulo visible */}
                <div className="mb-8">
                  <AnimatePresence mode="wait">
                    {!effectiveCollapsed && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={contentTransition}
                        className="text-white/50 text-[10px] font-bold uppercase tracking-wider px-3 pb-3 flex items-center gap-2"
                      >
                        <Scale className="w-3 h-3" />
                        Gestión Legal
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  {renderMenuItem(
                    'gestion-legal',
                    <Scale className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2} />,
                    'Gestión Legal (SIGL)',
                    'Sistema Integrado Legal'
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Principal Section */}
                <div className="mb-8">
                  <AnimatePresence mode="wait">
                    {!effectiveCollapsed && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={contentTransition}
                        className="text-white/50 text-[10px] font-bold uppercase tracking-wider px-3 pb-3 flex items-center gap-2"
                      >
                        <Zap className="w-3 h-3" />
                        Principal
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  {renderMenuItem(
                    'executive',
                    <TrendingUp className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2} />,
                    'Dashboard Ejecutivo',
                    'Nivel gerencial'
                  )}
                </div>

                {/* Módulos Administrativos */}
                <div className="mb-8">
              <AnimatePresence mode="wait">
                {!effectiveCollapsed && renderSectionHeader('estructura-org', <Building2 className="w-3 h-3" />, 'GESTIÓN PERSONAS', 6)}
              </AnimatePresence>
              
              <AnimatePresence>
                {(effectiveCollapsed || expandedSections['estructura-org']) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                    className="overflow-hidden"
                  >
                    {/* Usuarios - Gestión Simplificada CON SUBMENÚ */}
                    {renderMenuWithSubmenu(
                      'users-management-menu',
                      'users-management',
                      <Users className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2} />,
                      'Personas',
                      '2 submódulos',
                      [
                        {
                          module: 'users-management',
                          icon: <Users className="w-4 h-4" />,
                          label: 'Administración de Perfiles',
                          subtitle: 'Gestión de usuarios'
                        },
                        {
                          module: 'carpeta-digital',
                          icon: <FolderOpen className="w-4 h-4" />,
                          label: 'Carpeta Digital',
                          subtitle: 'Documentos del usuario'
                        }
                      ]
                    )}

                    {/* Estructura Organizacional - NUEVO MÓDULO */}
                    {renderMenuItem(
                      'estructura-organizacional',
                      <Building2 className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2} />,
                      'Estructura Organizacional',
                      'Sedes y territoriales'
                    )}

                    {/* Programas Académicos - NUEVO MÓDULO */}
                    {renderMenuItem(
                      'programas-academicos',
                      <GraduationCap className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2} />,
                      'Programas Académicos',
                      'Gestión de programas'
                    )}

                    {/* Roles y Permisos - Administración completa con QR */}
                    {renderMenuItem(
                      'roles-administration',
                      <Shield className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2} />,
                      'Roles y Permisos',
                      'Gestión de roles del sistema y generación de QR'
                    )}

                    {renderMenuItem(
                      'audit',
                      <Activity className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2} />,
                      'Auditoría'
                    )}

                    {renderMenuItem(
                      'reports',
                      <BarChart3 className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2} />,
                      'Reportes',
                      'Analytics avanzado'
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Gestión Académica */}
            <div className="mb-8">
              <AnimatePresence mode="wait">
                {!effectiveCollapsed && renderSectionHeader('gestion-usuarios', <GraduationCap className="w-3 h-3" />, 'GESTIÓN ACADÉMICA', 7)}
              </AnimatePresence>
              
              <AnimatePresence>
                {(effectiveCollapsed || expandedSections['gestion-usuarios']) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                    className="overflow-hidden"
                  >
                    {/* Graduados - Con Submenús */}
                    {renderMenuWithSubmenu(
                      'graduates',
                      'graduates-verification',
                      <GraduationCap className="w-5 h-5" strokeWidth={2} />,
                      'Registro Académico',
                      '2 submódulos',
                      [
                        {
                          module: 'graduates-verification',
                          icon: <CheckCircle className="w-4 h-4" />,
                          label: 'Graduados',
                          subtitle: 'Lista de graduados'
                        },
                        {
                          module: 'graduates-certificates',
                          icon: <Award className="w-4 h-4" />,
                          label: 'Verificación de títulos',
                          subtitle: 'Verificación y solicitudes',
                          badge: certificatesPendingCount > 0 ? certificatesPendingCount.toString() : undefined
                        }
                      ]
                    )}

                    {renderMenuItem(
                      'aspirantes',
                      <FolderOpen className="w-5 h-5" strokeWidth={2} />,
                      'Aspirantes',
                      'Vinculación de nuevos'
                    )}

                    {renderMenuItem(
                      'certificados-laborales',
                      <FileCheck className="w-5 h-5" strokeWidth={2} />,
                      'Certificados Laborales',
                      'Certificación laboral'
                    )}

                    {renderMenuItem(
                      'gestion-profesoral',
                      <BookOpen className="w-5 h-5" strokeWidth={2} />,
                      'Gestión Profesoral',
                      'Administrar profesores'
                    )}

                    {renderMenuItem(
                      'control-interno',
                      <ClipboardList className="w-5 h-5" strokeWidth={2} />,
                      'Control Interno Gestión',
                      'Auditorías y hallazgos'
                    )}
                    
                    {/* ✅ NUEVO: Gestión Legal (SIGL) v5.0 */}
                    {renderMenuItem(
                      'gestion-legal',
                      <Scale className="w-5 h-5" strokeWidth={2} />,
                      'Gestión Legal (SIGL)',
                      'Sistema Integrado Legal'
                    )}
                    
                    {renderMenuItem(
                      'centro-alertas',
                      <Bell className="w-5 h-5" strokeWidth={2} />,
                      'Centro de Alertas',
                      'Configuración centralizada'
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Arquitectura Empresarial - SECCIÓN INDEPENDIENTE */}
            <div className="mb-8">
              <AnimatePresence mode="wait">
                {!effectiveCollapsed && renderSectionHeader('arquitectura', <Layout className="w-3 h-3" />, 'ARQUITECTURA EMPRESARIAL', 1)}
              </AnimatePresence>

              <AnimatePresence>
                {(effectiveCollapsed || expandedSections['arquitectura']) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                    className="overflow-hidden"
                  >
                    {/* Arquitectura Empresarial - Clickeable directo */}
                    {renderMenuItem(
                      'arquitectura-empresarial',
                      <Layout className="w-5 h-5" strokeWidth={2} />,
                      'Arquitectura Empresarial',
                      'MRAE MinTIC Colombia'
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
              </>
            )}
          </nav>

          {/* Footer con keyboard hint */}
          <AnimatePresence mode="wait">
            {!effectiveCollapsed && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={contentTransition}
                className="px-5 pb-5 mt-auto"
              >
                <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/10">
                  <div className="flex items-center gap-2 text-white/60 text-xs">
                    <kbd className="px-2 py-1 bg-white/10 rounded text-[10px] font-mono">⌘B</kbd>
                    <span>Toggle sidebar</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </aside>

      {/* Custom scrollbar styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </>
  );
}