/**
 * CONTROL INTERNO DE GESTIÓN - OPTIMIZADO
 * ACTUALIZADO: 22 Diciembre 2025
 * Consolidación: De 14 módulos a 6 módulos gruesos con tabs
 */

import { useState } from "react";
import {
  Shield,
  LayoutDashboard,
  ClipboardList,
  Target,
  AlertTriangle,
  FolderOpen,
  Settings,
  Sliders,
} from "lucide-react";
import { ModuleLayout, MenuItem } from "../shared/ModuleLayout";
import { ControlInternoProvider } from "./ControlInternoContext";

// ━━━━━━━━━━━ MÓDULOS CONSOLIDADOS ━━━━━━━━━━━
import { GestionAuditoriasKanbanSimple } from "./GestionAuditoriasKanbanSimple";  // DASHBOARD PRINCIPAL
import { PlanificacionModule } from "./PlanificacionModule";  // RF001-004 (Plan Anual + Universo + Programa + Inicio)
import { ProcesoAuditoriaModule } from "./ProcesoAuditoriaModule";  // RF005-009 (Planeación + Ejecución + Comunicación)
import { PlanesMejoramientoModule } from "./PlanesMejoramientoModule";  // RF010-011 (Formulación + Seguimiento)
import { SoporteModule } from "./SoporteModule";  // RF012-014 (Informes + Documental + Notificaciones)
import { ModulosAvanzadosModule } from "./ModulosAvanzadosModule";  // RF015-018 (Roles + Reportes + Territoriales + Especiales)
import { ConfiguracionSistemaCompleto } from "./ConfiguracionSistemaCompleto";  // RF019 (General + Auditorías + Informes + Notificaciones)

type SeccionActiva =
  | "dashboard"              // KANBAN DASHBOARD - CENTRO DE COMANDO
  | "planificacion"          // RF001-004 (4 tabs)
  | "proceso-auditoria"      // RF005-009 (3 tabs)
  | "planes-mejoramiento"    // RF010-011 (2 tabs)
  | "soporte"                // RF012-014 (3 tabs)
  | "modulos-avanzados"      // RF015-018 (4 tabs)
  | "configuracion";         // Configuración del sistema

export function ControlInternoFull() {
  const [seccionActiva, setSeccionActiva] =
    useState<SeccionActiva>("dashboard"); // 🎯 DASHBOARD DE PRIMERAS

  const menuItems: MenuItem[] = [
    // ━━━━━━━━━━━ 1. CENTRO DE COMANDO ━━━━━━━━━━━
    {
      id: "dashboard",
      label: "Dashboard Kanban",
      subtitle: "Centro de comando integrado",
      icon: <LayoutDashboard className="w-5 h-5" />,
      color: "#10B981", // Verde - Principal
    },
    
    // ━━━━━━━━━━━ 2. PLANIFICACIÓN (RF001-004) ━━━━━━━━━━━
    {
      id: "planificacion",
      label: "Planificación",
      subtitle: "Plan Anual • Universo • Programa • Inicio",
      icon: <ClipboardList className="w-5 h-5" />,
      color: "#003DA5", // Azul ESAP
    },
    
    // ━━━━━━━━━━━ 3. PROCESO DE AUDITORÍA (RF005-009) ━━━━━━━━━━━
    {
      id: "proceso-auditoria",
      label: "Proceso de Auditoría",
      subtitle: "Planeación • Ejecución • Comunicación",
      icon: <Target className="w-5 h-5" />,
      color: "#F59E0B", // Naranja - En proceso
    },
    
    // ━━━━━━━━━━━ 4. PLANES DE MEJORAMIENTO (RF010-011) ━━━━━━━━━━━
    {
      id: "planes-mejoramiento",
      label: "Planes de Mejoramiento",
      subtitle: "Formulación • Seguimiento",
      icon: <AlertTriangle className="w-5 h-5" />,
      color: "#EF4444", // Rojo - Hallazgos
    },
    
    // ━━━━━━━━━━━ 5. MÓDULOS DE SOPORTE (RF012-014) ━━━━━━━━━━━
    {
      id: "soporte",
      label: "Módulos de Soporte",
      subtitle: "Informes • Documental • Notificaciones",
      icon: <FolderOpen className="w-5 h-5" />,
      color: "#8B5CF6", // Púrpura - Soporte
    },
    
    // ━━━━━━━━━━━ 6. MÓDULOS AVANZADOS (RF015-018) ━━━━━━━━━━━
    {
      id: "modulos-avanzados",
      label: "Módulos Avanzados",
      subtitle: "Roles • Reportes • Territoriales • Especiales",
      icon: <Settings className="w-5 h-5" />,
      color: "#6B7280", // Gris - Admin
    },
    
    // ━━━━━━━━━━━ 7. CONFIGURACIÓN (RF019) ━━━━━━━━━━━
    {
      id: "configuracion",
      label: "Configuración",
      subtitle: "General • Auditorías • Informes • Notificaciones",
      icon: <Sliders className="w-5 h-5" />,
      color: "#059669", // Verde oscuro - Config
    },
  ];

  const renderSeccion = () => {
    switch (seccionActiva) {
      case "dashboard":
        return <GestionAuditoriasKanbanSimple />;
      
      case "planificacion":
        return <PlanificacionModule />;
      
      case "proceso-auditoria":
        return <ProcesoAuditoriaModule />;
      
      case "planes-mejoramiento":
        return <PlanesMejoramientoModule />;
      
      case "soporte":
        return <SoporteModule />;
      
      case "modulos-avanzados":
        return <ModulosAvanzadosModule />;
      
      case "configuracion":
        return <ConfiguracionSistemaCompleto />;
      
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
      onSectionChange={(section) =>
        setSeccionActiva(section as SeccionActiva)
      }
    >
      <ControlInternoProvider>
        {/* Contenido de la sección */}
        {renderSeccion()}
      </ControlInternoProvider>
    </ModuleLayout>
  );
}