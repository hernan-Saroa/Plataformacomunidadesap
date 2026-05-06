import { useState, useEffect, useMemo, useRef } from "react";
import { Toaster } from 'sonner';
import {
  Shield,
  LayoutDashboard,
  ClipboardList,
  AlertTriangle,
  FolderOpen,
  Settings,
  FileText,
  Layers,
  Bell
} from "lucide-react";
import { ModuleLayout, MenuItem } from "../shared/ModuleLayout";
import { ControlInternoProvider } from "./ControlInternoContext";
import { IntegracionAuditoriasPlanesProvider, useIntegracionAuditoriaPlanes } from "./IntegracionAuditoriasPlanesContext";
import { ListasChequeoProvider } from "./listas-chequeo/ListasChequeoContext";
import { HallazgosProvider } from "./HallazgosContext";
import { TareasProvider } from "./TareasContext";
import { toast } from "sonner";
import { KanbanConfigProvider } from "./context/KanbanConfigContext";
import { NotificacionesControlInternoDropdown } from "./NotificacionesControlInternoDropdown";
import { useNotificacionesControlInterno } from "./hooks/useNotificacionesControlInterno";

import { useControlInternoPermissions } from './hooks/useControlInternoPermissions';

// ✅ HOOK DE BACKEND - Planes de mejoramiento para badge
import { usePlanesMejoramiento } from './services/usePlanesMejoramiento';

// ━━━━━━━━━━━ MÓDULOS CONSOLIDADOS ━━━━━━━━━━━
import { GestionAuditoriasKanbanSimple } from "./GestionAuditoriasKanbanSimple";  // DASHBOARD PRINCIPAL
import { PlanificacionModuleRediseno } from "./PlanificacionModuleRediseno";  // RF001-004
// ELIMINADO: ProcesoAuditoriaModuleRediseno - Integrado en Expediente del Kanban (RF005-009)
import { PlanesMejoramientoModuleRediseno } from "./PlanesMejoramientoModuleRediseno";  // RF010-011
import { ExpedientesModulePremium } from "./ExpedientesModulePremium";  // RF013 - MÓDULO INDEPENDIENTE - EXPEDIENTES
import { ConfiguracionesModulePremium } from "./ConfiguracionesModulePremium";  // VERSIÓN PREMIUM
import { ListasChequeoModule } from "./ListasChequeoModule";  // RF007 - Biblioteca (vista 18_feb)
import { UniversoAuditableUnificado } from "./UniversoAuditableUnificado";  // ✨ NUEVO: Programa de Auditoría (incluye Universo Auditable)

type SeccionActiva =
  | "dashboard"                      // KANBAN DASHBOARD - CENTRO DE COMANDO
  | "universo-auditable"             // ✨ NUEVO: Programa de Auditoría (incluye Universo Auditable)
  | "plan-operativo"                 // ✨ NUEVO: Plan Anual (independiente)
  | "listas-chequeo"                 // RF007 - LISTAS DE CHEQUEO DIGITALES
  | "planes-mejoramiento"            // RF010-011 (2 tabs)
  | "expedientes"                    // RF013 - MÓDULO INDEPENDIENTE - EXPEDIENTES
  | "config-auditorias";             // RF019-B - Config Auditorías (Tipos + Listas)

export function ControlInternoFull() {
  const [seccionActiva, setSeccionActiva] =
    useState<SeccionActiva>("dashboard"); // 🎯 DASHBOARD DE PRIMERAS
  const [navegacionManual, setNavegacionManual] = useState<number>(0); // ← NUEVO: Timestamp de última navegación manual

  return (
    <KanbanConfigProvider>
      <ControlInternoProvider>
        <IntegracionAuditoriasPlanesProvider>
          <ListasChequeoProvider>
            <HallazgosProvider>
              <TareasProvider>
                <ControlInternoContent
                  seccionActiva={seccionActiva}
                  setSeccionActiva={setSeccionActiva}
                  navegacionManual={navegacionManual}
                  setNavegacionManual={setNavegacionManual}
                />
              </TareasProvider>
            </HallazgosProvider>
          </ListasChequeoProvider>
        </IntegracionAuditoriasPlanesProvider>
      </ControlInternoProvider>
    </KanbanConfigProvider>
  );
}

// ============ COMPONENTE INTERNO CON ACCESO AL CONTEXT ============

interface ControlInternoContentProps {
  seccionActiva: SeccionActiva;
  setSeccionActiva: (seccion: SeccionActiva) => void;
  navegacionManual: number;
  setNavegacionManual: (timestamp: number) => void;
}

/** Navegación programática al módulo de Listas de Chequeo (desde expediente/Comunicación) */
interface NavegacionListasChequeo {
  tabInicial: 'BIBLIOTECA' | 'LISTAS_CHEQUEO';
  auditoriaId?: string;
}

function ControlInternoContent({
  seccionActiva,
  setSeccionActiva,
  navegacionManual,
  setNavegacionManual
}: ControlInternoContentProps) {
  const { auditoriaSeleccionada } = useIntegracionAuditoriaPlanes();
  const [navegacionListasChequeo, setNavegacionListasChequeo] = useState<NavegacionListasChequeo | null>(null);
  const refTabListasChequeo = useRef<NavegacionListasChequeo | null>(null);
  const [listasChequeoTabActiva, setListasChequeoTabActiva] = useState<'BIBLIOTECA' | 'LISTAS_CHEQUEO'>('BIBLIOTECA');

  const handleNavegarAListasChequeo = (nav: NavegacionListasChequeo | null) => {
    refTabListasChequeo.current = nav;
    setNavegacionListasChequeo(nav);
    if (nav?.tabInicial === 'LISTAS_CHEQUEO') {
      setListasChequeoTabActiva('LISTAS_CHEQUEO');
    }
  };

  // ✅ HOOK DE PERMISOS - Para filtrar submódulos
  const { puedeAcceder, esSuperUsuario } = useControlInternoPermissions();
  
  // ✅ HOOK DE BACKEND - Total de planes para badge
  const { planes: planesBackend, loading: loadingPlanes } = usePlanesMejoramiento();

  // ✅ HOOK DE NOTIFICACIONES - Bell icon con conteo
  const {
    conteoNoLeidas,
    cargarNotificaciones,
  } = useNotificacionesControlInterno();
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);

  // Polling: recargar conteo cada 60 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      cargarNotificaciones();
    }, 60000);
    return () => clearInterval(interval);
  }, [cargarNotificaciones]);


  // Mapeo de IDs de sección a módulos de permisos
  const MAPEO_SECCION_MODULO: Record<string, string> = {
    'plan-operativo': 'plan-anual',
    'universo-auditable': 'planificacion',
    'dashboard': 'auditorias',
    'listas-chequeo': 'listas-chequeo',
    'planes-mejoramiento': 'planes-mejoramiento',
    'expedientes': 'expedientes',
    'config-auditorias': 'configuraciones',
  };

  // Calcular menuItems dinámicamente con badge y filtrado por permisos
  const menuItems: MenuItem[] = useMemo(() => {
    const todosLosMenus: MenuItem[] = [
      // ━━━━━━━━━━━ 1. PLAN ANUAL ━━━━━━━━━━━
      {
        id: "plan-operativo",
        label: "Plan Anual",
        subtitle: "QUÉ auditar • Plan de trabajo anual",
        icon: <ClipboardList className="w-5 h-5" />,
        color: "#2962FF", // Azul corporativo
      },
      
      // ━━━━━━━━━━━ 2. PROGRAMA DE AUDITORÍA ━━━━━━━━━━━
      {
        id: "universo-auditable",
        label: "Programa de Auditoría",
        subtitle: "DÓNDE auditar • Programa Anual",
        icon: <Layers className="w-5 h-5" />,
        color: "#003DA5", // Azul ESAP
      },
      
      // ━━━━━━━━━━━ 3. AUDITORÍAS OCI ━━━━━━━━━━━
      {
        id: "dashboard",
        label: "Auditorías OCI",
        subtitle: "Centro de comando integrado",
        icon: <LayoutDashboard className="w-5 h-5" />,
        color: "#10B981", // Verde - Principal
      },
      
      // ━━━━━━━━━━━ 4. BIBLIOTECA (RF007) ━━━━━━━━━━━
      {
        id: "listas-chequeo",
        label: "Biblioteca",
        subtitle: "Plantillas • Requisitos • Cumplimiento",
        icon: <FileText className="w-5 h-5" />,
        color: "#6366F1", // Azul claro - Requisitos
      },
      
      // ━━━━━━━━━━━ 5. PLANES DE MEJORAMIENTO (RF010-011) ━━━━━━━━━━━
      {
        id: "planes-mejoramiento",
        label: "Planes de Mejoramiento",
        subtitle: "Formulación • Seguimiento",
        icon: <AlertTriangle className="w-5 h-5" />,
        color: "#EF4444", // Rojo - Hallazgos
        badge: loadingPlanes ? 0 : planesBackend.length // ✅ Total de planes del backend
      },
      
      // ━━━━━━━━━━━ 6. EXPEDIENTES (RF013) ━━━━━━━━━━━
      {
        id: "expedientes",
        label: "Expedientes",
        subtitle: "Archivo • Búsqueda • Expedientes",
        icon: <FolderOpen className="w-5 h-5" />,
        color: "#0891B2", // Cyan - Documental
      },
      
      // ━━━━━━━━━━━ 7. CONFIGURACIONES ━━━━━━━━━━━
      {
        id: "config-auditorias",
        label: "Configuraciones",
        subtitle: "Notificaciones • Auditoría • Kanban • Config",
        icon: <Settings className="w-5 h-5" />,
        color: "#059669", // Verde oscuro - Config
      },
    ];

    // Si es superusuario, mostrar todo
    if (esSuperUsuario) {
      return todosLosMenus;
    }

    // Filtrar menús según permisos
    return todosLosMenus.filter(menu => {
      const modulo = MAPEO_SECCION_MODULO[menu.id];
      if (!modulo) return false;
      return puedeAcceder(modulo);
    });
  }, [esSuperUsuario, puedeAcceder, loadingPlanes, planesBackend.length]);



  // Si la sección activa no está en los menús disponibles, navegar a la primera disponible
  useEffect(() => {
    if (menuItems.length > 0) {
      const seccionDisponible = menuItems.some(m => m.id === seccionActiva);
      if (!seccionDisponible) {
        console.log('⚠️ [ControlInternoFull] Sección no accesible, redirigiendo a:', menuItems[0].id);
        setSeccionActiva(menuItems[0].id as SeccionActiva);
      }
    }
  }, [menuItems, seccionActiva, setSeccionActiva]);

  const renderSeccion = () => {
    switch (seccionActiva) {
      case "dashboard":
        return <GestionAuditoriasKanbanSimple />;
      
      case "universo-auditable":
        return <UniversoAuditableUnificado vigencia={new Date().getFullYear()} />;
      
      case "plan-operativo":
        return <PlanificacionModuleRediseno vista="plan-operativo" onNavegarModulo={(seccion) => setSeccionActiva(seccion as SeccionActiva)} />;
      
      case "listas-chequeo": {
        const nav = navegacionListasChequeo ?? refTabListasChequeo.current;
        return (
          <ListasChequeoModule
            tabActiva={listasChequeoTabActiva}
            onTabChange={setListasChequeoTabActiva}
            auditoriaIdFoco={nav?.auditoriaId}
            onNavegacionAplicada={() => {
              refTabListasChequeo.current = null;
              setNavegacionListasChequeo(null);
            }}
          />
        );
      }
      
      case "planes-mejoramiento":
        return <PlanesMejoramientoModuleRediseno />;
      
      case "expedientes":
        return <ExpedientesModulePremium />;
      
      case "config-auditorias":
        return <ConfiguracionesModulePremium />;
      
      default:
        return <GestionAuditoriasKanbanSimple />;
    }
  };

  return (
    <>
    <Toaster position="top-right" richColors />
    <ModuleLayout
      moduleName="CONTROL INTERNO DE GESTIÓN"
      moduleDescription="Sistema de Gestión"
      moduleIcon={<Shield className="w-6 h-6" />}
      moduleColor="#F97316"
      menuItems={menuItems}
      activeSection={seccionActiva}
      onSectionChange={(section) => {
        setSeccionActiva(section as SeccionActiva);
        setNavegacionManual(Date.now());
        if (section !== 'listas-chequeo') setListasChequeoTabActiva('BIBLIOTECA');
      }}
      headerActions={
        <div className="relative">
          <button
            onClick={() => setNotifDropdownOpen(prev => !prev)}
            className="relative flex items-center justify-center w-9 h-9 rounded-xl hover:bg-orange-50 transition-colors border border-gray-200 hover:border-orange-300"
            title="Notificaciones de Control Interno"
            id="btn-notificaciones-ci"
          >
            <Bell className="w-5 h-5 text-gray-600" />
            {conteoNoLeidas > 0 && (
              <span
                className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 shadow-lg animate-pulse"
              >
                {conteoNoLeidas > 99 ? '99+' : conteoNoLeidas}
              </span>
            )}
          </button>
          <NotificacionesControlInternoDropdown
            isOpen={notifDropdownOpen}
            onClose={() => setNotifDropdownOpen(false)}
          />
        </div>
      }
    >
      {/* Navegación automática */}
      <MenuDinamicoWrapper
        seccionActiva={seccionActiva}
        onCambiarSeccion={setSeccionActiva}
        navegacionManual={navegacionManual}
        onNavegarAListasChequeo={handleNavegarAListasChequeo}
      />
      
      {/* Contenido de la sección */}
      {renderSeccion()}
    </ModuleLayout>
    </>
  );
}

// ============ COMPONENTE WRAPPER PARA NAVEGACIÓN AUTOMÁTICA ============

interface MenuDinamicoWrapperProps {
  seccionActiva: SeccionActiva;
  onCambiarSeccion: (seccion: SeccionActiva) => void;
  navegacionManual: number;
  onNavegarAListasChequeo: (nav: NavegacionListasChequeo | null) => void;
}

function MenuDinamicoWrapper({ 
  seccionActiva, 
  onCambiarSeccion,
  navegacionManual,
  onNavegarAListasChequeo
}: MenuDinamicoWrapperProps) {
  const { auditoriaSeleccionada, auditoriaIdParaVerPlan } = useIntegracionAuditoriaPlanes();
  const [yaNavego, setYaNavego] = useState(false);
  const [yaNavegoVerPlan, setYaNavegoVerPlan] = useState(false);

  // Navegación: Crear plan (desde auditoría con hallazgos)
  useEffect(() => {
    const tiempoActual = Date.now();
    const navegacionReciente = (tiempoActual - navegacionManual) < 500;
    
    if (auditoriaSeleccionada && 
        seccionActiva !== 'planes-mejoramiento' && 
        !yaNavego && 
        !navegacionReciente) {
      
      setYaNavego(true);
      onCambiarSeccion('planes-mejoramiento');
      
      toast.success(
        `Navegando a Planes de Mejoramiento`,
        {
          description: `Auditoría ${auditoriaSeleccionada.codigo} - ${auditoriaSeleccionada.hallazgos.length} hallazgos detectados`,
          duration: 3000
        }
      );
    }
    
    if (!auditoriaSeleccionada && yaNavego) {
      setYaNavego(false);
    }
  }, [auditoriaSeleccionada, seccionActiva, onCambiarSeccion, navegacionManual, yaNavego]);

  // Navegación: Ir a ver plan existente (sin abrir modal crear)
  useEffect(() => {
    const tiempoActual = Date.now();
    const navegacionReciente = (tiempoActual - navegacionManual) < 500;
    
    if (auditoriaIdParaVerPlan && 
        seccionActiva !== 'planes-mejoramiento' && 
        !yaNavegoVerPlan && 
        !navegacionReciente) {
      
      setYaNavegoVerPlan(true);
      onCambiarSeccion('planes-mejoramiento');
      
      toast.success('Ir a ver plan', { description: 'Navegando al detalle del plan', duration: 2000 });
    }
    
    if (!auditoriaIdParaVerPlan && yaNavegoVerPlan) {
      setYaNavegoVerPlan(false);
    }
  }, [auditoriaIdParaVerPlan, seccionActiva, onCambiarSeccion, navegacionManual, yaNavegoVerPlan]);

  // ✅ Navegación: Ir a módulo de Listas de Chequeo (desde expediente/Comunicación)
  useEffect(() => {
    const handler = (e: CustomEvent<{ seccion: string; auditoriaId?: string }>) => {
      const seccion = e.detail?.seccion;
      if (seccion === 'listas-chequeo') {
        const nav = { tabInicial: 'LISTAS_CHEQUEO' as const, auditoriaId: e.detail?.auditoriaId };
        onNavegarAListasChequeo(nav);
        onCambiarSeccion('listas-chequeo');
        toast.success('Navegando a Listas de Chequeo', {
          description: e.detail?.auditoriaId ? 'Mostrando listas de la auditoría' : undefined,
          duration: 2000,
        });
      }
    };
    window.addEventListener('navegarModuloControlInterno', handler as EventListener);
    return () => window.removeEventListener('navegarModuloControlInterno', handler as EventListener);
  }, [onCambiarSeccion, onNavegarAListasChequeo]);

  return null;
}
