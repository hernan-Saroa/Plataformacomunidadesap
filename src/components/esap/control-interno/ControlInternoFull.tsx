import { useState, useEffect } from "react";
import {
  Shield,
  LayoutDashboard,
  ClipboardList,
  AlertTriangle,
  FolderOpen,
  Settings,
  FileText,
} from "lucide-react";
import { ModuleLayout, MenuItem } from "../shared/ModuleLayout";
import { ControlInternoProvider } from "./ControlInternoContext";
import { IntegracionAuditoriasPlanesProvider, useIntegracionAuditoriaPlanes } from "./IntegracionAuditoriasPlanesContext";
import { toast } from "sonner";

// ━━━━━━━━━━━ MÓDULOS CONSOLIDADOS ━━━━━━━━━━━
import { GestionAuditoriasKanbanSimple } from "./GestionAuditoriasKanbanSimple";  // DASHBOARD PRINCIPAL
import { PlanificacionModuleRediseno } from "./PlanificacionModuleRediseno";  // RF001-004
// ELIMINADO: ProcesoAuditoriaModuleRediseno - Integrado en Expediente del Kanban (RF005-009)
import { PlanesMejoramientoModuleRediseno } from "./PlanesMejoramientoModuleRediseno";  // RF010-011
import InformesLeyModulePremium from "./InformesLeyModulePremium";  // RF012 - MÓDULO INDEPENDIENTE
import { ExpedientesModulePremium } from "./ExpedientesModulePremium";  // RF013 - MÓDULO INDEPENDIENTE - EXPEDIENTES
import { RolesYPermisosModulePremium } from "./RolesYPermisosModulePremium";  // RF015 - MÓDULO INDEPENDIENTE
import { ConfiguracionesModulePremium } from "./ConfiguracionesModulePremium";  // VERSIÓN PREMIUM

type SeccionActiva =
  | "dashboard"                      // KANBAN DASHBOARD - CENTRO DE COMANDO
  | "planificacion"                  // RF001-004 (4 tabs)
  | "planes-mejoramiento"            // RF010-011 (2 tabs)
  | "informes-ley"                   // RF012 - MÓDULO INDEPENDIENTE
  | "expedientes"                    // RF013 - MÓDULO INDEPENDIENTE - EXPEDIENTES
  | "roles-permisos"                 // RF015 - MÓDULO INDEPENDIENTE
  | "config-auditorias";             // RF019-B - Config Auditorías (Tipos + Listas)

export function ControlInternoFull() {
  const [seccionActiva, setSeccionActiva] =
    useState<SeccionActiva>("dashboard"); // 🎯 DASHBOARD DE PRIMERAS
  const [navegacionManual, setNavegacionManual] = useState<number>(0); // ← NUEVO: Timestamp de última navegación manual

  return (
    <ControlInternoProvider>
      <IntegracionAuditoriasPlanesProvider>
        <ControlInternoContent
          seccionActiva={seccionActiva}
          setSeccionActiva={setSeccionActiva}
          navegacionManual={navegacionManual}
          setNavegacionManual={setNavegacionManual}
        />
      </IntegracionAuditoriasPlanesProvider>
    </ControlInternoProvider>
  );
}

// ============ COMPONENTE INTERNO CON ACCESO AL CONTEXT ============

interface ControlInternoContentProps {
  seccionActiva: SeccionActiva;
  setSeccionActiva: (seccion: SeccionActiva) => void;
  navegacionManual: number;
  setNavegacionManual: (timestamp: number) => void;
}

function ControlInternoContent({
  seccionActiva,
  setSeccionActiva,
  navegacionManual,
  setNavegacionManual
}: ControlInternoContentProps) {
  const { auditoriaSeleccionada } = useIntegracionAuditoriaPlanes();

  // Calcular menuItems dinámicamente con badge
  const menuItems: MenuItem[] = [
    // ━━━━━━━━━━━ 1. CENTRO DE COMANDO ━━━━━━━━━━━
    {
      id: "dashboard",
      label: "Auditorías OCIG",
      subtitle: "Centro de comando integrado",
      icon: <LayoutDashboard className="w-5 h-5" />,
      color: "#10B981", // Verde - Principal
    },
    
    // ━━━━━━━━━━━ 2. PLANIFICACIÓN (RF001-004) ━━━━━━━━━━━
    {
      id: "planificacion",
      label: "Planeación OCIG",
      subtitle: "Plan Anual • Universo • Programa",
      icon: <ClipboardList className="w-5 h-5" />,
      color: "#003DA5", // Azul ESAP
    },
    
    // ━━━━━━━━━━━ 3. PLANES DE MEJORAMIENTO (RF010-011) ━━━━━━━━━━━
    {
      id: "planes-mejoramiento",
      label: "Planes de Mejoramiento",
      subtitle: "Formulación • Seguimiento",
      icon: <AlertTriangle className="w-5 h-5" />,
      color: "#EF4444", // Rojo - Hallazgos
      badge: auditoriaSeleccionada ? auditoriaSeleccionada.hallazgos.length : 0
    },
    
    // ━━━━━━━━━━━ 4. INFORMES DE LEY (RF012) ━━━━━━━━━━━
    {
      id: "informes-ley",
      label: "Informes de Ley",
      subtitle: "Ejecutivo Anual • Pormenorizado • Formatos",
      icon: <FileText className="w-5 h-5" />,
      color: "#8B5CF6", // Púrpura - Informes
    },
    
    // ━━━━━━━━━━━ 5. EXPEDIENTES (RF013) ━━━━━━━━━━━
    {
      id: "expedientes",
      label: "Expedientes",
      subtitle: "Archivo • Búsqueda • Expedientes",
      icon: <FolderOpen className="w-5 h-5" />,
      color: "#0891B2", // Cyan - Documental
    },
    
    // ━━━━━━━━━━━ 6. ROLES Y PERMISOS (RF015) ━━━━━━━━━━━
    {
      id: "roles-permisos",
      label: "Roles y Permisos",
      subtitle: "RBAC • Seguridad • Accesos",
      icon: <Shield className="w-5 h-5" />,
      color: "#DC2626", // Rojo - Seguridad
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

  const renderSeccion = () => {
    switch (seccionActiva) {
      case "dashboard":
        return <GestionAuditoriasKanbanSimple />;
      
      case "planificacion":
        return <PlanificacionModuleRediseno />;
      
      case "planes-mejoramiento":
        return <PlanesMejoramientoModuleRediseno />;
      
      case "informes-ley":
        return <InformesLeyModulePremium />;
      
      case "expedientes":
        return <ExpedientesModulePremium />;
      
      case "roles-permisos":
        return <RolesYPermisosModulePremium />;
      
      case "config-auditorias":
        return <ConfiguracionesModulePremium />;
      
      default:
        return <GestionAuditoriasKanbanSimple />;
    }
  };

  return (
    <ModuleLayout
      moduleName="CONTROL INTERNO DE GESTIÓN"
      moduleDescription="Sistema de Gestión"
      moduleIcon={<Shield className="w-6 h-6" />}
      moduleColor="#F97316"
      menuItems={menuItems}
      activeSection={seccionActiva}
      onSectionChange={(section) => {
        setSeccionActiva(section as SeccionActiva);
        setNavegacionManual(Date.now()); // ← NUEVO: Actualizar timestamp de navegación manual
      }}
    >
      {/* Navegación automática */}
      <MenuDinamicoWrapper
        seccionActiva={seccionActiva}
        onCambiarSeccion={setSeccionActiva}
        navegacionManual={navegacionManual}
      />
      
      {/* Contenido de la sección */}
      {renderSeccion()}
    </ModuleLayout>
  );
}

// ============ COMPONENTE WRAPPER PARA NAVEGACIÓN AUTOMÁTICA ============

interface MenuDinamicoWrapperProps {
  seccionActiva: SeccionActiva;
  onCambiarSeccion: (seccion: SeccionActiva) => void;
  navegacionManual: number;
}

function MenuDinamicoWrapper({ 
  seccionActiva, 
  onCambiarSeccion,
  navegacionManual
}: MenuDinamicoWrapperProps) {
  const { auditoriaSeleccionada } = useIntegracionAuditoriaPlanes();
  const [yaNavego, setYaNavego] = useState(false); // ← Control de navegación única

  // Navegación automática (solo la primera vez)
  useEffect(() => {
    const tiempoActual = Date.now();
    const navegacionReciente = (tiempoActual - navegacionManual) < 500; // 500ms después de navegación manual
    
    if (auditoriaSeleccionada && 
        seccionActiva !== 'planes-mejoramiento' && 
        !yaNavego && 
        !navegacionReciente) {
      
      console.log('🚀 Navegación automática activada:', {
        auditoria: auditoriaSeleccionada.codigo,
        seccionActual: seccionActiva,
        seccionDestino: 'planes-mejoramiento'
      });
      
      setYaNavego(true); // ← Marcar que ya navegó
      onCambiarSeccion('planes-mejoramiento');
      
      // Toast informativo mejorado
      toast.success(
        `Navegando a Planes de Mejoramiento`,
        {
          description: `Auditoría ${auditoriaSeleccionada.codigo} - ${auditoriaSeleccionada.hallazgos.length} hallazgos detectados`,
          duration: 3000
        }
      );
    }
    
    // Reset del flag cuando se limpia la selección
    if (!auditoriaSeleccionada && yaNavego) {
      setYaNavego(false);
    }
  }, [auditoriaSeleccionada, seccionActiva, onCambiarSeccion, navegacionManual, yaNavego]);

  return null;
}