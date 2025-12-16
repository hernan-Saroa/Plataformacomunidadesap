/**
 * CONTROL INTERNO DE GESTIÓN - Sistema Consolidado
 * 8 Módulos Robustos e Integrados
 * Oficina de Control Interno - ESAP
 */

import { useState } from "react";
import {
  Shield,
  Target,
  AlertTriangle,
  Scale,
  FolderOpen,
  Bell,
  Settings,
  MapPin,
  Layers,
  ListChecks,  // ✅ Agregado
} from "lucide-react";
import { ModuleLayout, MenuItem } from "../shared/ModuleLayout";
import { ControlInternoProvider } from "./ControlInternoContext";
import { GestionAuditoriasKanban } from "./GestionAuditoriasKanban";  // ✅ MÓDULO 1 CONSOLIDADO
import { PlanificacionAnualIntegrada } from "./PlanificacionAnualIntegrada";  // ✅ MÓDULO 2 CONSOLIDADO
import { HallazgosYMejoramientoCompleto } from "./HallazgosYMejoramientoCompleto";  // ✅ MÓDULO 3 CONSOLIDADO
import { InformesYDocumentalCompleto } from "./InformesYDocumentalCompleto";  // ✅ MÓDULO 4 CONSOLIDADO
import { AprobacionesYNotificacionesCompleto } from "./AprobacionesYNotificacionesCompleto";  // ✅ MÓDULO 5 CONSOLIDADO
import { GestionAuditoriasTerritoriales } from "./GestionAuditoriasTerritoriales";  // ✅ MÓDULO 6 (RF018)
import { ConfiguracionSistemaCompleto } from "./ConfiguracionSistemaCompleto";  // ✅ MÓDULO 7 (RF020)

type SeccionActiva =
  | "auditorias-kanban"  // ✅ MÓDULO 1
  | "planificacion-anual-integrada"  // ✅ MÓDULO 2
  | "hallazgos-mejoramiento-completo"  // ✅ MÓDULO 3
  | "informes-documental-completo"  // ✅ MÓDULO 4
  | "aprobaciones-notificaciones-completo"  // ✅ MÓDULO 5
  | "auditorias-territoriales"  // ✅ MÓDULO 6
  | "configuracion";  // ✅ MÓDULO 7

export function ControlInternoFull() {
  const [seccionActiva, setSeccionActiva] =
    useState<SeccionActiva>("auditorias-kanban");

  const menuItems: MenuItem[] = [
    {
      id: "auditorias-kanban",  // ✅ MÓDULO 1
      label: "Auditorías Kanban (RF018)",
      icon: <MapPin className="w-5 h-5" />,  // ✅ Ícono de mapa
      color: "#10B981",  // Verde para diferenciar
    },
    {
      id: "planificacion-anual-integrada",  // ✅ MÓDULO 2
      label: "Planificación Anual Integrada",
      icon: <Target className="w-5 h-5" />,
      color: "#3B82F6",
    },
    {
      id: "hallazgos-mejoramiento-completo",  // ✅ MÓDULO 3
      label: "Hallazgos y Mejoramiento Completo",
      icon: <ListChecks className="w-5 h-5" />,
      color: "#3B82F6",
    },
    {
      id: "informes-documental-completo",  // ✅ MÓDULO 4
      label: "Informes y Documental Completo",
      icon: <FolderOpen className="w-5 h-5" />,
      color: "#3B82F6",
    },
    {
      id: "aprobaciones-notificaciones-completo",  // ✅ MÓDULO 5
      label: "Aprobaciones y Notificaciones Completo",
      icon: <Bell className="w-5 h-5" />,
      color: "#3B82F6",
    },
    {
      id: "auditorias-territoriales",  // ✅ MÓDULO 6
      label: "Auditorías Territoriales (RF018)",
      icon: <MapPin className="w-5 h-5" />,  // ✅ Ícono de mapa
      color: "#10B981",  // Verde para diferenciar
    },
    {
      id: "configuracion",  // ✅ MÓDULO 7
      label: "Configuración",
      icon: <Settings className="w-5 h-5" />,
      color: "#6B7280",
    },
  ];

  const renderSeccion = () => {
    const handleNavegar = (seccion: string) =>
      setSeccionActiva(seccion as SeccionActiva);

    switch (seccionActiva) {
      case "auditorias-kanban":  // ✅ MÓDULO 1
        return <GestionAuditoriasKanban />;
      case "planificacion-anual-integrada":  // ✅ MÓDULO 2
        return <PlanificacionAnualIntegrada />;
      case "hallazgos-mejoramiento-completo":  // ✅ MÓDULO 3
        return <HallazgosYMejoramientoCompleto />;
      case "informes-documental-completo":  // ✅ MÓDULO 4
        return <InformesYDocumentalCompleto />;
      case "aprobaciones-notificaciones-completo":  // ✅ MÓDULO 5
        return <AprobacionesYNotificacionesCompleto />;
      case "auditorias-territoriales":  // ✅ MÓDULO 6
        return <GestionAuditoriasTerritoriales />;
      case "configuracion":  // ✅ MÓDULO 7
        return <ConfiguracionSistemaCompleto />;
      default:
        return <GestionAuditoriasKanban />;  // ✅ Por defecto, mostrar Auditorías Kanban
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