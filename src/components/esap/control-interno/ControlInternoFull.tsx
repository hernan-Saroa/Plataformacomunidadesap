/**
 * CONTROL INTERNO DE GESTIÓN - Módulo Completo Optimizado
 * Sistema integrado sin duplicidades con máxima usabilidad
 * Oficina de Control Interno - ESAP
 */

import { useState } from "react";
import {
  Shield,
  ClipboardCheck,
  AlertTriangle,
  CheckCircle,
  FileText,
  Settings,
  Target,
  ListChecks,
  Database,
  CalendarDays,
  FileSearch,
  Calendar,
  PlayCircle,
  CheckSquare,
  Send,
  Activity,
  Scale,
  FolderOpen,
  Bell,
} from "lucide-react";
import { ModuleLayout, MenuItem } from "../shared/ModuleLayout";
import { GestionAuditorias } from "./GestionAuditorias";
import { GestionHallazgosCompleto } from "./GestionHallazgosCompleto";
import { PlanAnual5Roles } from "./PlanAnual5Roles";
import { UniversoAuditoriasIntegrado } from "./UniversoAuditoriasIntegrado";
import { ProgramaAnualIntegrado } from "./ProgramaAnualIntegrado";
import { PlanIndividualIntegrado } from "./PlanIndividualIntegrado";
import { GestionEtapaPlaneacion } from "./GestionEtapaPlaneacion";
import { GestionEtapaEjecucion } from "./GestionEtapaEjecucion";
import { GestionEtapaComunicacion } from "./GestionEtapaComunicacion";
import { ListasChequeoEstandarizadas } from "./ListasChequeoEstandarizadas";
import { FormulacionPlanesMejoramiento } from "./FormulacionPlanesMejoramiento";
import { SeguimientoPlanesMejoramiento } from "./SeguimientoPlanesMejoramiento";
import { GestionInformesLey } from "./GestionInformesLey";
import { GestionDocumental } from "./GestionDocumental";
import { SistemaNotificaciones } from "./SistemaNotificaciones";
import { AprobacionesPendientes } from "./AprobacionesPendientes";
import { DocumentosReportes } from "./DocumentosReportes";
import { ConfiguracionControlInterno } from "./ConfiguracionControlInterno";
import { ControlInternoProvider } from "./ControlInternoContext";
import { FlujoNavegacionVisual } from "./FlujoNavegacionVisual";

type SeccionActiva =
  | "plan-anual"
  | "universo-auditorias"
  | "programa-anual"
  | "plan-individual"
  | "etapa-planeacion"
  | "etapa-ejecucion"
  | "etapa-comunicacion"
  | "listas-chequeo"
  | "auditorias"
  | "hallazgos"
  | "planes-mejoramiento"
  | "seguimiento-planes"
  | "informes-ley"
  | "gestion-documental"
  | "notificaciones"
  | "aprobaciones"
  | "configuracion";

export function ControlInternoFull() {
  const [seccionActiva, setSeccionActiva] =
    useState<SeccionActiva>("plan-anual");

  const menuItems: MenuItem[] = [
    {
      id: "plan-anual",
      label: "Plan Anual (5 Roles)",
      icon: <Target className="w-5 h-5" />,
      color: "#3B82F6",
    },
    {
      id: "universo-auditorias",
      label: "Universo de Auditorías",
      icon: <Database className="w-5 h-5" />,
      color: "#F97316",
    },
    {
      id: "programa-anual",
      label: "Programa Anual de Auditorías",
      icon: <CalendarDays className="w-5 h-5" />,
      color: "#10B981",
    },
    {
      id: "plan-individual",
      label: "Plan Individual de Auditoría",
      icon: <FileSearch className="w-5 h-5" />,
      color: "#8B5CF6",
    },
    {
      id: "etapa-planeacion",
      label: "Etapa de Planeación",
      icon: <Calendar className="w-5 h-5" />,
      color: "#6B7280",
    },
    {
      id: "etapa-ejecucion",
      label: "Etapa de Ejecución",
      icon: <PlayCircle className="w-5 h-5" />,
      color: "#6B7280",
    },
    {
      id: "etapa-comunicacion",
      label: "Etapa de Comunicación",
      icon: <Send className="w-5 h-5" />,
      color: "#6B7280",
    },
    {
      id: "listas-chequeo",
      label: "Listas de Chequeo",
      icon: <CheckSquare className="w-5 h-5" />,
      color: "#6B7280",
    },
    {
      id: "auditorias",
      label: "Gestión de Auditorías",
      icon: <ClipboardCheck className="w-5 h-5" />,
      color: "#F97316",
    },
    {
      id: "hallazgos",
      label: "Gestión de Hallazgos",
      icon: <AlertTriangle className="w-5 h-5" />,
      badge: 5,
      color: "#F97316",
    },
    {
      id: "planes-mejoramiento",
      label: "Planes de Mejoramiento",
      icon: <ListChecks className="w-5 h-5" />,
      color: "#10B981",
    },
    {
      id: "seguimiento-planes",
      label: "Seguimiento de Planes",
      icon: <Activity className="w-5 h-5" />,
      badge: 2,
      color: "#3B82F6",
    },
    {
      id: "informes-ley",
      label: "Informes de Ley",
      icon: <Scale className="w-5 h-5" />,
      badge: 1,
      color: "#8B5CF6",
    },
    {
      id: "gestion-documental",
      label: "Gestión Documental",
      icon: <FolderOpen className="w-5 h-5" />,
      color: "#F97316",
    },
    {
      id: "notificaciones",
      label: "Sistema de Notificaciones",
      icon: <Bell className="w-5 h-5" />,
      badge: 3,
      color: "#EF4444",
    },
    {
      id: "aprobaciones",
      label: "Aprobaciones Pendientes",
      icon: <CheckCircle className="w-5 h-5" />,
      badge: 3,
      color: "#F97316",
    },
    {
      id: "configuracion",
      label: "Configuración",
      icon: <Settings className="w-5 h-5" />,
      color: "#6B7280",
    },
  ];

  const renderSeccion = () => {
    const handleNavegar = (seccion: string) =>
      setSeccionActiva(seccion as SeccionActiva);

    switch (seccionActiva) {
      case "plan-anual":
        return <PlanAnual5Roles />;
      case "universo-auditorias":
        return (
          <UniversoAuditoriasIntegrado
            onNavegar={handleNavegar}
          />
        );
      case "programa-anual":
        return (
          <ProgramaAnualIntegrado onNavegar={handleNavegar} />
        );
      case "plan-individual":
        return (
          <PlanIndividualIntegrado onNavegar={handleNavegar} />
        );
      case "etapa-planeacion":
        return <GestionEtapaPlaneacion />;
      case "etapa-ejecucion":
        return <GestionEtapaEjecucion />;
      case "etapa-comunicacion":
        return <GestionEtapaComunicacion />;
      case "listas-chequeo":
        return <ListasChequeoEstandarizadas />;
      case "auditorias":
        return <GestionAuditorias />;
      case "hallazgos":
        return <GestionHallazgosCompleto />;
      case "planes-mejoramiento":
        return <FormulacionPlanesMejoramiento />;
      case "seguimiento-planes":
        return <SeguimientoPlanesMejoramiento />;
      case "informes-ley":
        return <GestionInformesLey />;
      case "gestion-documental":
        return <GestionDocumental />;
      case "notificaciones":
        return <SistemaNotificaciones />;
      case "aprobaciones":
        return <AprobacionesPendientes />;
      case "configuracion":
        return <ConfiguracionControlInterno />;
      default:
        return <PlanAnual5Roles />;
    }
  };

  const getTitleForSection = () => {
    const item = menuItems.find((m) => m.id === seccionActiva);
    return item?.label || "Control Interno Gestión";
  };

  return (
    <ModuleLayout
      moduleName="CONTROL INTERNO"
      moduleDescription="Gestión"
      moduleIcon={<Shield className="w-6 h-6" />}
      moduleColor="#F97316"
      menuItems={menuItems}
      activeSection={seccionActiva}
      onSectionChange={(section) =>
        setSeccionActiva(section as SeccionActiva)
      }
      breadcrumb={[
        "Backoffice",
        "Control Interno Gestión",
        getTitleForSection(),
      ]}
    >
      <ControlInternoProvider>
        {/* Contenido de la sección */}
        {renderSeccion()}
      </ControlInternoProvider>
    </ModuleLayout>
  );
}