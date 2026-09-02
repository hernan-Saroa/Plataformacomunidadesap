/**
 * SidebarPremium - Navegación principal del Backoffice ESAP
 * Actualizado: Módulo de Gestión Profesoral restaurado en v2
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  Shield,
  Activity,
  GraduationCap,
  Briefcase,
  MessageSquare,
  Calendar,
  Bell,
  Award,
  CheckCircle,
  FolderOpen,
  BookOpen,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Menu,
  Eye,
  BadgeCheck,
  Scale,
  ClipboardList,
  Folder,
  PenTool,
  Zap,
  TrendingUp,
  FileCheck,
  Layout,
  Building2,
  BarChart3,
  Gavel,
  Rows4,
  Plane
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { ESAPLogo } from '../assets/ESAPLogo';

// Importar isotipo oficial de ESAP (OPTIMIZADO: SVG en lugar de PNG)
import { IsotipoESAP } from '../assets/ESAPLogoSVG';

type ModuleType = 'modules' | 'users' | 'users-management' | 'carpeta-digital' | 'roles-permissions-complete' | 'roles-administration' | 'audit' | 'executive' | 'dashboard' | 'reports' | 'control-interno' | 'control-disciplinario' | 'gestion-legal' | 'graduates' | 'graduates-management' | 'graduates-verification' | 'graduates-certificates' | 'graduates-review-requests' | 'motor-reglas' | 'reportes' | 'documental' | 'notificaciones' | 'configuracion' | 'integraciones' | 'certificados-laborales' | 'estructura-organizacional' | 'programas-academicos' | 'arquitectura-empresarial' | 'centro-alertas' | 'procesos' | 'gestion-profesoral' | 'firma-electronica' | 'pta' | 'banco-docentes-pta' | 'contratacion' | 'viaticos';

export interface ActiveModuleItem {
  code: string;
  name: string;
  description?: string;
}

interface SidebarProps {
  isOpen: boolean;
  currentModule?: string;
  currentSidebarModule?: string; // NUEVO: Para saber qué submódulo específico está activo
  onModuleChange?: (module: ModuleType) => void;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  forceCollapse?: boolean; // Auto-colapsar cuando modal de perfil esté abierto
  userRole?: string[]; // Rol del usuario para permisos
  userEmail?: string; // Email del usuario para restricciones específicas
  certificatesPendingCount?: number; // Número de solicitudes pendientes en Certificados
  restrictedMode?: 'certificados-laborales' | 'arquitectura-empresarial' | 'control-interno' | 'control-disciplinario' | 'registro-academico' | 'gestion-legal'; // Modo restringido para usuarios especiales
  assignedModules?: string[]; // Códigos de módulos asignados al rol/usuario (puede incluir 'all')
  activeModules?: ActiveModuleItem[]; // Módulos activos con name y description desde BD
  activeModuleCodes?: string[]; // Códigos de módulos activos en la base de datos (is_active = true)
  userPermissions?: string[]; // Permisos del usuario
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

function getModuleAliases(module: string): string[] {
  const map: Record<string, string[]> = {
    'executive': ['executive', 'dashboard', 'principal'],
    'dashboard': ['executive', 'dashboard', 'principal'],
    'reports': ['reports', 'reportes'],
    'reportes': ['reports', 'reportes'],
    'audit': ['audit', 'auditoria'],
    'auditoria': ['audit', 'auditoria'],
    'contratacion': ['contratacion', 'hiring'],
    'hiring': ['contratacion', 'hiring'],
    'viaticos': ['viaticos', 'travel-expenses'],
    'users-management': ['users-management', 'users'],
    'roles-administration': ['roles-administration', 'roles'],
    'graduates': ['graduates'],
    'graduates-verification': ['graduates-verification', 'graduates'],
    'graduates-certificates': ['graduates-certificates'],
    'verification-certificates': ['verification-certificates'],
    'banco-docentes-pta': ['banco-docentes-pta', 'banco-docentes', 'gestion-profesoral', 'rund'],
    // 'gestion-profesoral': ['gestion-profesoral', 'banco-docentes-pta', 'rund'],
  };
  return map[module] || [module];
}

const DEFAULT_MODULE_CONFIG: Record<string, { name: string; description?: string }> = {
  'executive': { name: 'Dashboard Ejecutivo', description: 'Nivel gerencial' },
  'users-management': { name: 'Personas', description: 'Gestión de usuarios' },
  'banco-docentes-pta': { name: 'Registro Único Nacional Docente (RUND)', description: 'Gestión y carga masiva' },
  'carpeta-digital': { name: 'Carpeta Digital', description: 'Documentos del usuario' },
  'estructura-organizacional': { name: 'Estructura Organizacional', description: 'Sedes y territoriales' },
  'programas-academicos': { name: 'Programas Académicos', description: 'Gestión de programas' },
  'roles-administration': { name: 'Roles y Permisos', description: 'Gestión de roles del sistema y generación de QR' },
  'audit': { name: 'Auditoría', description: 'Auditoría de cambios' },
  'reports': { name: 'Reportes', description: 'Analytics avanzado' },
  'graduates': { name: 'Verificación de títulos', description: '2 submódulos' },
  'graduates-verification': { name: 'Graduados', description: 'Lista de graduados' },
  'graduates-certificates': { name: 'Verificación de títulos', description: 'Verificación y solicitudes' },
  'pta': { name: 'Plan de Trabajo Académico', description: 'Gestión y aprobación de PTAs' },
  'certificados-laborales': { name: 'Certificados Laborales', description: 'Certificación laboral' },
  'firma-electronica': { name: 'Firma Electrónica', description: 'Firma de documentos' },
  'control-interno': { name: 'Control Interno Gestión', description: 'Auditorías y hallazgos' },
  'control-disciplinario': { name: 'Control Interno Disciplinario', description: 'Procesos disciplinarios' },
  'gestion-legal': { name: 'Gestión Legal (SIGL)', description: 'Sistema Integrado Legal' },
  'contratacion': { name: 'Contratación', description: 'Licitaciones y Contratos' },
  'viaticos': { name: 'Viáticos y Gastos de Viaje', description: 'Comisiones de Servicios y Tiquetes' },
};

export function SidebarPremium({ isOpen, currentModule, currentSidebarModule, onModuleChange, onClose, isCollapsed = false, onToggleCollapse, forceCollapse, userRole, userEmail, certificatesPendingCount = 0, restrictedMode, assignedModules = [], activeModules = [], activeModuleCodes: propsActiveModuleCodes, userPermissions = [] }: SidebarProps) {
  const activeModuleCodes = (propsActiveModuleCodes && propsActiveModuleCodes.length > 0)
    ? propsActiveModuleCodes
    : activeModules.map((m) => m.code);

  const getModuleMetadata = (module: ModuleType, overrideTitle?: string, overrideSubtitle?: string) => {
    const aliases = getModuleAliases(module);
    if (activeModules && activeModules.length > 0) {
      const dbModule = activeModules.find((m) => aliases.includes(m.code));
      if (dbModule && dbModule.name && dbModule.name.trim() !== '') {
        return {
          title: dbModule.name,
          subtitle: (dbModule.description && dbModule.description.trim() !== '')
            ? dbModule.description
            : (overrideSubtitle || DEFAULT_MODULE_CONFIG[module]?.description),
        };
      }
    }

    return {
      title: '...',
      subtitle: '...',
    };
  };

  const hasAllModules = assignedModules.includes('all');
  const graduates = assignedModules.includes('graduates');
  if (graduates && !assignedModules.includes('graduates-verification')) {
    assignedModules.push('graduates-verification');
  }
  restrictedMode = undefined; // Nuevo: No restringir módulos en modo de desarrollo
  const canShowModule = (module: ModuleType): boolean => {
    // console.log('module', module);
    if (module === 'executive' || module === 'dashboard') {
      // Mantener compatibilidad con sesiones antiguas sin modules, pero respetar
      // la asignación explícita cuando el backend sí la entrega.
      if (!assignedModules || assignedModules.length === 0) return true;
      const aliases = getModuleAliases(module);
      return hasAllModules || aliases.some((alias) => assignedModules.includes(alias));
    }
    if (userRole?.includes('SUPER_ADMIN') && module === 'modules') return true;

    // 1. Si la API devolvió los módulos activos de la DB (is_active = true),
    // verificar que el módulo no esté desactivado globalmente en auth.module.
    if (activeModuleCodes && activeModuleCodes.length > 0) {
      const aliases = getModuleAliases(module);
      const isSystemActive = aliases.some(alias => activeModuleCodes.includes(alias));
      if (!isSystemActive) {
        return false; // Desactivado globalmente en DB (is_active = false)
      }
    }

    // 2. Segmentación del RUND según permisos de usuario o si no se especifican permisos
    if (module === 'banco-docentes-pta') {
      if (userPermissions && userPermissions.length > 0) {
        const hasRundPerm = userPermissions.some(p => p.startsWith('banco-docentes.rund.'));
        if (hasRundPerm) return true;
      }
    }

    // 3. Verificación por permisos de usuario (assignedModules)
    if (hasAllModules) return true;
    if (import.meta.env.MODE === 'development' && (!assignedModules || assignedModules.length === 0)) return true;
    if (!assignedModules || assignedModules.length === 0) return false;

    const aliases = getModuleAliases(module);
    return aliases.some(alias => assignedModules.includes(alias) || assignedModules.includes(module));
  };

  // Secciones y visibilidad basada en módulos asignados
  const gestionPersonasModules: ModuleType[] = [
    'users-management',
    'banco-docentes-pta',
    'carpeta-digital',
    'estructura-organizacional',
    'programas-academicos',
    'roles-administration',
    'audit',
    'reports',
    'firma-electronica',
  ];
  const hasGestionPersonas = gestionPersonasModules.some(canShowModule);

  const gestionAcademicaModules: ModuleType[] = [
    'graduates',
    'graduates-verification',
    'graduates-certificates',
    'gestion-profesoral',
    'pta',
    'certificados-laborales',
    'control-interno',
    'control-disciplinario',
    'gestion-legal',
    'centro-alertas',
    'contratacion',
    'viaticos',
  ];
  const hasGestionAcademica = gestionAcademicaModules.some(canShowModule);

  const hasArquitectura = canShowModule('arquitectura-empresarial');

  // Determinar si el sidebar debe estar colapsado
  // When the drawer is open (mobile/tablet), show expanded sidebar with text.
  // When closed on tablet, show collapsed icons. Desktop follows user preference.
  const effectiveCollapsed = isOpen ? false : (isCollapsed || forceCollapse);

  // Estado para controlar qué menús padre están expandidos
  let moduleGraduate = false
  if (assignedModules.includes('graduates-verification') || assignedModules.includes('graduates-certificates')) {
    moduleGraduate = assignedModules[0] == 'graduates' || assignedModules[0] == 'graduates-certificates'
  }
  
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    users: false,           // Menú Usuarios Admin cerrado por defecto
    graduates: moduleGraduate,       // Menú Graduados cerrado por defecto
    'roles-security': false, // Menú Roles y Permisos cerrado por defecto
    'users-management-menu': false, // Menú Gestión Personas cerrado por defecto
  });

  // Estado para controlar el menú flotante en modo colapsado (NUEVO)
  const [hoveredMenu, setHoveredMenu] = useState<string | null>(null);

  // Estado para controlar qué SECCIONES principales están expandidas (NUEVO)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    dashboard: true,            // Dashboard siempre visible
    'estructura-org': true,     // Estructura Organizacional ABIERTA por defecto
    'gestion-usuarios': true,  // Gestión Académica ABIERTA por defecto (cambiado de false a true)
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
    // No need to close sidebar since it's always visible
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
            key={`header-collapsed-${sectionId}`}
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
        key={`header-expanded-${sectionId}`}
        onClick={() => toggleSectionExpansion(sectionId)}
        className={`w-full flex items-center gap-2 px-2 py-2.5 mb-2 transition-colors group relative rounded-lg ${isExpanded ? 'text-white bg-white/8' : 'text-white/80 hover:text-white hover:bg-white/5'
          }`}
        whileHover={{ x: 1 }}
        whileTap={{ scale: 0.99 }}
        transition={springTransition}
      >
        {/* Indicador visual de expansión (borde izquierdo MÁS GRUESO) */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              key={`indicator-${sectionId}`}
              initial={{ scaleY: 0, opacity: 0 }}
              animate={{ scaleY: 1, opacity: 1 }}
              exit={{ scaleY: 0, opacity: 0 }}
              className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-300 to-blue-500 rounded-r-full"
              style={{ boxShadow: '0 0 8px rgba(96, 165, 250, 0.5)' }}
            />
          )}
        </AnimatePresence>

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
    label?: string,
    subtitle?: string,
    badge?: string
  ) => {
    if (!canShowModule(module)) return null;
    const isActive = currentModule === module;
    const meta = module !== 'modules' ? getModuleMetadata(module, label, subtitle) : { title: 'Gestión módulos', subtitle: 'Administración de módulos' };
    const displayLabel = meta.title;
    const displaySubtitle = meta.subtitle;

    const buttonContent = (
      <motion.button
        onClick={() => handleModuleClick(module)}
        className={`w-full flex items-center gap-2 px-2 md:px-2.5 py-1.5 md:py-2 rounded-xl mb-1.5 transition-colors duration-200 relative overflow-hidden group ${isActive
            ? 'text-white font-semibold shadow-lg'
            : 'text-white/80 hover:text-white'
          } ${effectiveCollapsed ? 'justify-center px-2' : ''}`}
        style={isActive ? {
          backgroundColor: 'rgba(255, 255, 255, 0.22)',
          backdropFilter: 'blur(10px)'
        } : {
          backgroundColor: 'rgba(0, 0, 0, 0)',
          backdropFilter: 'blur(10px)'
        }}
        whileHover={{
          backgroundColor: 'rgba(255, 255, 255, 0.3)',
          x: effectiveCollapsed ? 0 : 2,
          scale: 1.01
        }}
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
              animate={{ height: '100%', y: '-50%', opacity: 1 }}
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
                <span className="text-[10px] font-medium block leading-tight">{displayLabel}</span>
                {displaySubtitle && (
                  <span className="text-[9px] text-white/60 block mt-0.5">{displaySubtitle}</span>
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
              <div className="font-semibold text-white">{displayLabel}</div>
              {displaySubtitle && <div className="text-white/70 mt-0.5">{displaySubtitle}</div>}
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
    label?: string,
    subtitle?: string,
    submenuItems?: Array<{
      module: ModuleType,
      icon: React.ReactNode,
      label?: string,
      subtitle?: string,
      badge?: string
    }>
  ) => {
    const parentMeta = getModuleMetadata(module, label, subtitle);
    const displayParentLabel = parentMeta.title;
    const displayParentSubtitle = parentMeta.subtitle;

    const visibleSubmenu = submenuItems?.filter(item => canShowModule(item.module)) || [];
    const isActive = currentModule === module || visibleSubmenu.some(item => currentModule === item.module || currentSidebarModule === item.module);
    const isExpanded = expandedMenus[menuId];
    const hasSubmenu = visibleSubmenu.length > 0;
    
    // Ocultar menú si ni el principal ni algún submenú están permitidos
    if (!canShowModule(module) && !hasSubmenu) return null;

    if (effectiveCollapsed) {
      return (
        <Tooltip key={menuId} delayDuration={200}>
          <TooltipTrigger asChild>
            <motion.button
              onClick={() => handleModuleClick(module)}
              className={`w-full flex items-center justify-center px-2 py-2.5 rounded-xl mb-1.5 transition-colors duration-200 relative overflow-hidden ${isActive
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
            className="p-0 bg-white backdrop-blur-xl border-2 border-gray-200 shadow-2xl"
            sideOffset={16}
          >
            <div className="p-3 min-w-[200px]">
              <div className="font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-2">
                {displayParentLabel}
              </div>
              {hasSubmenu && (
                <div className="space-y-1">
                  {visibleSubmenu.map((item) => {
                    const isSubmenuActive = currentSidebarModule === item.module || currentModule === item.module;
                    const subMeta = getModuleMetadata(item.module, item.label, item.subtitle);
                    const subLabel = subMeta.title;
                    const subSubtitle = subMeta.subtitle;
                    return (
                      <button
                        key={item.module}
                        onClick={() => handleModuleClick(item.module)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 transition-all duration-200 ${
                          isSubmenuActive
                            ? 'bg-blue-50 text-blue-700 font-semibold'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex-shrink-0 opacity-80">
                          {item.icon}
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <div className="text-sm font-medium truncate">{subLabel}</div>
                          {subSubtitle && (
                            <div className="text-xs text-gray-500 truncate mt-0.5">{subSubtitle}</div>
                          )}
                        </div>
                        {item.badge && (
                          <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-red-500 text-white flex-shrink-0">
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
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
            className={`flex-1 flex items-center gap-3 px-3 py-2.5 transition-colors duration-200 relative overflow-hidden group ${currentModule === module
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
              <span className="text-sm font-medium block truncate leading-tight">{displayParentLabel}</span>
              {displayParentSubtitle && <span className="text-[11px] text-white/60 block truncate mt-0.5">{displayParentSubtitle}</span>}
            </div>
            {visibleSubmenu.some(item => item.badge) && (
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
              className={`flex-shrink-0 px-2.5 transition-colors duration-200 rounded-r-xl ${isActive
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
                {visibleSubmenu.map((item, idx) => {
                  // Comparar con currentSidebarModule para subitems SIGL
                  const isSubmenuActive = currentSidebarModule === item.module || currentModule === item.module;
                  const subMeta = getModuleMetadata(item.module, item.label, item.subtitle);
                  const subLabel = subMeta.title;
                  const subSubtitle = subMeta.subtitle;
                  return (
                    <motion.button
                      key={idx}
                      onClick={() => handleModuleClick(item.module)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors duration-200 relative group ${isSubmenuActive
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
                        <span className="text-sm font-medium block truncate">{subLabel}</span>
                        {subSubtitle && <span className="text-[11px] text-white/50 block truncate mt-0.5">{subSubtitle}</span>}
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
      {/* Backdrop para móviles */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[998] lg:hidden transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        id="sidebar-navigation"
        className={`fixed left-0 top-0 h-screen transition-all duration-300 flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 ${
          effectiveCollapsed ? 'w-[80px]' : 'w-[280px] lg:w-[260px]'
        }`}
        style={{
          background: 'linear-gradient(to bottom, #1e5da8 0%, #154a85 100%)',
          boxShadow: '0 0 40px rgba(30, 93, 168, 0.3)',
          zIndex: 999,
        }}
        role="navigation"
        aria-label="Navegación principal"
      >
        {/* Header */}
        <div className="border-b border-white/10 p-3 relative flex-shrink-0">
          {/* Botón Cerrar en Mobile */}
          {onClose && (
            <button
              onClick={onClose}
              className="absolute right-3 top-3 p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 lg:hidden z-20"
              aria-label="Cerrar menú"
            >
              <X className="w-5 h-5" />
            </button>
          )}

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
                  <motion.div
                    key="logo-isotipo"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={springTransition}
                    className="w-14 h-14 flex items-center justify-center shrink-0"
                  >
                    {/* Isotipo oficial ESAP */}
                    <ESAPLogo 
                      variant="icon"
                      className="shrink-0 object-contain drop-shadow-lg"
                      style={{ width: '35px', height: '40px' }}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="logo-complete"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={springTransition}
                    className="w-full flex justify-center shrink-0 px-2"
                  >
                    <ESAPLogo 
                      variant="white"
                      className="shrink-0 object-contain drop-shadow-lg"
                      style={{ width: '135px', height: '40px' }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
          
          {/* Botón Toggle Premium - SIEMPRE visible en md+ */}
          <motion.button
            onClick={onToggleCollapse}
            className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full items-center justify-center shadow-xl border-2 border-[#1e5da8]"
            style={{ zIndex: 1001, color: '#1e5da8' }}
            whileHover={{ 
              scale: 1.15,
              boxShadow: '0 8px 24px rgba(30, 93, 168, 0.4)'
            }}
            whileTap={{ scale: 0.9 }}
            transition={springTransition}
            title={isCollapsed ? 'Expandir menú (Ctrl+B)' : 'Contraer menú (Ctrl+B)'}
          >
            {/* Gradient background en hover */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-50 to-white opacity-0 hover:opacity-100 transition-opacity" />
            
            <motion.div
              animate={{ rotate: isCollapsed ? 180 : 0 }}
              transition={springTransition}
              className="relative z-10"
            >
              <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
            </motion.div>
          </motion.button>
        </div>

        {/* Navigation */}
        <nav className={`flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar p-3 ${effectiveCollapsed ? 'px-2' : 'px-4'}`}>
          {/* ✅ FILTRO ESPECIAL: Si es admin@esap.edu.co, solo mostrar Gestión Personas */}
          {userEmail === 'admin@esap.edu.co' ? (
            <>
              {/* SOLO MÓDULO DE GESTIÓN PERSONAS */}
              <div className="mb-8">
                <AnimatePresence mode="wait">
                  {!effectiveCollapsed && renderSectionHeader('estructura-org', <Building2 className="w-3 h-3" />, 'GESTIÓN PERSONAS', 6)}
                </AnimatePresence>
                
                <AnimatePresence>
                  {(effectiveCollapsed || expandedSections['estructura-org']) && (
                <motion.div
                  key="estructura-org-content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                  className="overflow-hidden"
                >
                      {/* Gestión de usuarios */}
                      {renderMenuItem('users-management', <Users className="w-4 h-4" />)}
                      {/* Banco de Docentes PTA */}
                      {renderMenuItem('banco-docentes-pta', <GraduationCap className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2} />)}
                      {/* Documentos del usuario */}
                      {renderMenuItem('carpeta-digital', <FolderOpen className="w-4 h-4" />)}
                      {/* Estructura Organizacional */}
                      {renderMenuItem('estructura-organizacional', <Building2 className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2} />)}
                      {/* Programas Académicos */}
                      {renderMenuItem('programas-academicos', <GraduationCap className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2} />)}
                      {/* Roles y Permisos */}
                      {renderMenuItem('roles-administration', <Shield className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2} />)}
                      {renderMenuItem('audit', <Activity className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2} />)}
                      {renderMenuItem('reports', <BarChart3 className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2} />)}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : restrictedMode === 'certificados-laborales' ? (
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
          ) : restrictedMode === 'control-interno' ? (
            <>
              {/* Módulo de Control Interno de Gestión - Único módulo visible */}
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
                  <ClipboardList className="w-5 h-5" strokeWidth={2} />,
                  'Control Interno Gestión',
                  'Auditorías y hallazgos'
                )}
              </div>
            </>
          ) : restrictedMode === 'control-disciplinario' ? (
            <>
              {/* Módulo de Control Interno Disciplinario - Único módulo visible */}
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
                      <Gavel className="w-3 h-3" />
                      Control Interno Disciplinario
                    </motion.div>
                  )}
                </AnimatePresence>
                
                {renderMenuItem(
                  'control-disciplinario',
                  <Gavel className="w-5 h-5" strokeWidth={2} />,
                  'Control Interno Disciplinario',
                  'Procesos disciplinarios'
                )}
              </div>
            </>
          ) : restrictedMode === 'registro-academico' ? (
            <>
              {/* Módulo de Verificación de títulos - Único módulo visible */}
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
                      <GraduationCap className="w-3 h-3" />
                      Verificación de títulos
                    </motion.div>
                  )}
                </AnimatePresence>
                
                {renderMenuItem(
                  'graduates-verification',
                  <CheckCircle className="w-5 h-5" strokeWidth={2} />,
                  'Graduados',
                  'Lista de graduados'
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
                  <Scale className="w-5 h-5" strokeWidth={2} />,
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
                
                {renderMenuItem('executive', <TrendingUp className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2} />)}
                {renderMenuItem('modules', <Rows4 className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2} />)}
              </div>

              {/* Módulos Administrativos (GESTIÓN PERSONAS) */}
              {hasGestionPersonas && (
                <div className="mb-8">
            <AnimatePresence mode="wait">
              {!effectiveCollapsed && renderSectionHeader('estructura-org', <Building2 className="w-3 h-3" />, 'GESTIÓN PERSONAS', 6)}
            </AnimatePresence>
            
            <AnimatePresence>
              {(effectiveCollapsed || expandedSections['estructura-org']) && (
                <motion.div
                  key="estructura-org-content-2"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                  className="overflow-hidden"
                >
                  {/* Gestión de usuarios */}
                  {renderMenuItem('users-management', <Users className="w-4 h-4" />)}
                  {/* Banco de Docentes PTA */}
                  {renderMenuItem('banco-docentes-pta', <GraduationCap className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2} />)}
                  {/* Documentos del usuario */}
                  {renderMenuItem('carpeta-digital', <FolderOpen className="w-4 h-4" />)}
                  {/* Estructura Organizacional */}
                  {renderMenuItem('estructura-organizacional', <Building2 className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2} />)}
                  {/* Programas Académicos */}
                  {renderMenuItem('programas-academicos', <GraduationCap className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2} />)}
                  {/* Roles y Permisos */}
                  {renderMenuItem('roles-administration', <Shield className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2} />)}
                  {renderMenuItem('audit', <Activity className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2} />)}
                  {renderMenuItem('reports', <BarChart3 className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2} />)}
                  {renderMenuItem('firma-electronica', <PenTool className="w-5 h-5" strokeWidth={2} />)}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          )}

          {/* Gestión Académica */}
          {hasGestionAcademica && (
            <div className="mb-8">
            <AnimatePresence mode="wait">
              {!effectiveCollapsed && renderSectionHeader('gestion-usuarios', <GraduationCap className="w-3 h-3" />, 'GESTIÓN ACADÉMICA', 7)}
            </AnimatePresence>
            
            <AnimatePresence>
              {(effectiveCollapsed || expandedSections['gestion-usuarios']) && (
                <motion.div
                  key="gestion-usuarios-content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                  className="overflow-hidden"
                >
                  {/* Graduados - Con Submenús */}
                  {/* {renderMenuWithSubmenu(
                    'graduates',
                    'graduates',
                    <GraduationCap className="w-5 h-5" strokeWidth={2} />,
                    undefined,
                    undefined,
                    [
                      {
                        module: 'graduates-verification',
                        icon: <CheckCircle className="w-4 h-4" />,
                      },
                      {
                        module: 'graduates-certificates',
                        icon: <Award className="w-4 h-4" />,
                        badge: certificatesPendingCount > 0 ? certificatesPendingCount.toString() : undefined
                      }
                    ]
                  )} */}

                  {/* Gestión Profesoral - PTA */}
                  {/* {renderMenuItem(
                    'gestion-profesoral',
                    <BookOpen className="w-5 h-5" strokeWidth={2} />,
                    'Gestión Profesoral',
                    'PTAs y docentes'
                  )} */}
                  {renderMenuItem('graduates-verification', <CheckCircle className="w-5 h-5" strokeWidth={2} />)}
                  {renderMenuItem('graduates-certificates', <Award className="w-5 h-5" strokeWidth={2} />)}

                  {renderMenuItem('pta', <Briefcase className="w-5 h-5" strokeWidth={2} />)}
                  {renderMenuItem('certificados-laborales', <FileCheck className="w-5 h-5" strokeWidth={2} />)}

                  {/* Separador visual - Módulos de Control y Gestión Legal */}
                  {( canShowModule('control-interno') || canShowModule('control-disciplinario') || canShowModule('gestion-legal') || canShowModule('contratacion')) && (
                  <AnimatePresence mode="wait">|
                    {!effectiveCollapsed && (
                      <motion.div
                        initial={{ opacity: 0, scaleX: 0 }}
                        animate={{ opacity: 1, scaleX: 1 }}
                        exit={{ opacity: 0, scaleX: 0 }}
                        transition={{ duration: 0.3 }}
                        className="my-4 mx-2"
                      >
                        <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                        <div className="text-[9px] text-white/40 uppercase tracking-widest text-center mt-2 font-semibold">
                          Control y Legal
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  )}

                  {renderMenuItem('control-interno', <ClipboardList className="w-5 h-5" strokeWidth={2} />)}
                  {renderMenuItem('control-disciplinario', <Gavel className="w-5 h-5" strokeWidth={2} />)}
                  {renderMenuItem('gestion-legal', <Scale className="w-5 h-5" strokeWidth={2} />)}
                  {renderMenuItem('contratacion', <FileText className="w-5 h-5" strokeWidth={2} />)}
                  {renderMenuItem('viaticos', <Plane className="w-5 h-5" strokeWidth={2} />)}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          )}
            </>
          )}
        </nav>

        {/* Footer con keyboard hint */}
        <div className="mt-auto flex-shrink-0 border-t border-white/10">
        <AnimatePresence mode="wait">
          {!effectiveCollapsed ? (
            <motion.div
              key="footer-expanded"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={contentTransition}
              className="px-4 py-3"
            >
              {/* COPYRIGHT FOOTER ESAP - SIMPLIFICADO */}
              <div className="text-center">
                <p className="text-[10px] text-white/70 leading-relaxed">
                  © 2026 Esap - Todos los derechos reservados
                </p>
                <p className="text-[9px] text-white/70 leading-relaxed">
                  Última actualización: {__ESAP_BUILD_DATE__}
                </p>
              </div> 
            </motion.div>
          ) : (
            <motion.div
              key="footer-collapsed"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={contentTransition}
              className="p-2 flex items-center justify-center"
            >
              <div className="w-8 h-8 flex items-center justify-center" title="@Esap 2026 - Todos los derechos reservados">
                <ESAPLogo variant="icon" className="drop-shadow-lg" style={{ width: '28px', height: '32px' }} />
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
