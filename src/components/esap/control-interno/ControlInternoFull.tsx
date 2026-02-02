import { useState, useEffect } from "react";
import {
  Shield,
  LayoutDashboard,
  ClipboardList,
  AlertTriangle,
  FolderOpen,
  Settings,
  FileText,
  Columns3,
  Layers
} from "lucide-react";
import { ModuleLayout, MenuItem } from "../shared/ModuleLayout";
import { ControlInternoProvider } from "./ControlInternoContext";
import { IntegracionAuditoriasPlanesProvider, useIntegracionAuditoriaPlanes } from "./IntegracionAuditoriasPlanesContext";
import { ListasChequeoProvider } from "./listas-chequeo/ListasChequeoContext";
import { HallazgosProvider } from "./HallazgosContext";
import { TareasProvider } from "./TareasContext";
import { toast } from "sonner";

// ━━━━━━━━━━━ MÓDULOS CONSOLIDADOS ━━━━━━━━━━━
import { GestionAuditoriasKanbanSimple } from "./GestionAuditoriasKanbanSimple";  // DASHBOARD PRINCIPAL
import { DashboardOCIG } from "./components/DashboardOCIG";  // ✨ NUEVO: Dashboard Ejecutivo Oficial
import { TableroKanbanOCIG } from "./components/TableroKanbanOCIG";  // ✨ NUEVO: Tablero Kanban Oficial OCIG
import { PlanificacionModuleRediseno } from "./PlanificacionModuleRediseno";  // RF001-004
// ELIMINADO: ProcesoAuditoriaModuleRediseno - Integrado en Expediente del Kanban (RF005-009)
import { PlanesMejoramientoModuleRediseno } from "./PlanesMejoramientoModuleRediseno";  // RF010-011
import { ExpedientesModulePremium } from "./ExpedientesModulePremium";  // RF013 - MÓDULO INDEPENDIENTE - EXPEDIENTES
import { ConfiguracionesModulePremium } from "./ConfiguracionesModulePremium";  // VERSIÓN PREMIUM
import { ListasChequeoModule } from "./listas-chequeo/ListasChequeoModuleComplete";  // RF007 - LISTAS DE CHEQUEO DIGITALES - VERSIÓN COMPLETA

type SeccionActiva =
  | "dashboard"                      // KANBAN DASHBOARD - CENTRO DE COMANDO
  | "dashboard-ocig"                 // ✨ NUEVO: Dashboard Ejecutivo Oficial
  | "kanban-ocig"                    // ✨ NUEVO: Tablero Kanban Oficial OCIG
  | "universo-auditable"             // ✨ NUEVO: Universo Auditable + Programa Anual
  | "plan-operativo"                 // ✨ NUEVO: Plan Operativo (independiente)
  | "listas-chequeo"                 // RF007 - LISTAS DE CHEQUEO DIGITALES
  | "planes-mejoramiento"            // RF010-011 (2 tabs)
  | "expedientes"                    // RF013 - MÓDULO INDEPENDIENTE - EXPEDIENTES
  | "config-auditorias";             // RF019-B - Config Auditorías (Tipos + Listas)

export function ControlInternoFull() {
  const [seccionActiva, setSeccionActiva] =
    useState<SeccionActiva>("dashboard"); // 🎯 DASHBOARD DE PRIMERAS
  const [navegacionManual, setNavegacionManual] = useState<number>(0); // ← NUEVO: Timestamp de última navegación manual

  return (
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
    
    // ━━━━━━━━━━━ 2. DASHBOARD OCIG ━━━━━━━━━━━
    {
      id: "dashboard-ocig",
      label: "Dashboard OCIG",
      subtitle: "Ejecutivo oficial de OCIG",
      icon: <Columns3 className="w-5 h-5" />,
      color: "#1B4F72", // Azul ESAP Oscuro
    },
    
    // ━━━━━━━━━━━ 3. KANBAN OCIG ━━━━━━━━━━━
    {
      id: "kanban-ocig",
      label: "Kanban OCIG",
      subtitle: "Tablero oficial de OCIG",
      icon: <Columns3 className="w-5 h-5" />,
      color: "#1B4F72", // Azul ESAP Oscuro
    },
    
    // ━━━━━━━━━━━ 4. PLAN OPERATIVO ━━━━━━━━━━━
    {
      id: "plan-operativo",
      label: "Plan Operativo",
      subtitle: "QUÉ auditar • Plan de trabajo",
      icon: <ClipboardList className="w-5 h-5" />,
      color: "#2962FF", // Azul corporativo
    },
    
    // ━━━━━━━━━━━ 5. UNIVERSO AUDITABLE ━━━━━━━━━━━
    {
      id: "universo-auditable",
      label: "Universo Auditable",
      subtitle: "DÓNDE auditar • Programa Anual",
      icon: <Layers className="w-5 h-5" />,
      color: "#003DA5", // Azul ESAP
    },
    
    // ━━━━━━━━━━━ 6. LISTAS DE CHEQUEO (RF007) ━━━━━━━━━━━
    {
      id: "listas-chequeo",
      label: "Listas de Chequeo",
      subtitle: "Digitales • Requisitos • Cumplimiento",
      icon: <FileText className="w-5 h-5" />,
      color: "#6366F1", // Azul claro - Requisitos
    },
    
    // ━━━━━━━━━━━ 7. PLANES DE MEJORAMIENTO (RF010-011) ━━━━━━━━━━━
    {
      id: "planes-mejoramiento",
      label: "Planes de Mejoramiento",
      subtitle: "Formulación • Seguimiento",
      icon: <AlertTriangle className="w-5 h-5" />,
      color: "#EF4444", // Rojo - Hallazgos
      badge: auditoriaSeleccionada ? auditoriaSeleccionada.hallazgos.length : 0
    },
    
    // ━━━━━━━━━━━ 8. EXPEDIENTES (RF013) ━━━━━━━━━━━
    {
      id: "expedientes",
      label: "Expedientes",
      subtitle: "Archivo • Búsqueda • Expedientes",
      icon: <FolderOpen className="w-5 h-5" />,
      color: "#0891B2", // Cyan - Documental
    },
    
    // ━━━━━━━━━━━ 9. CONFIGURACIONES ━━━━━━━━━━━
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
      
      case "dashboard-ocig":
        return <DashboardOCIG />;
      
      case "kanban-ocig":
        return <TableroKanbanOCIG />;
      
      case "universo-auditable":
        return <PlanificacionModuleRediseno vista="universo-programa" />;
      
      case "plan-operativo":
        return <PlanificacionModuleRediseno vista="plan-operativo" />;
      
      case "listas-chequeo":
        return <ListasChequeoModule />;
      
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