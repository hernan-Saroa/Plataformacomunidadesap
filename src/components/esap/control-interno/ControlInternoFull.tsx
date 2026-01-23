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
import { useControlInternoPermissions } from "./hooks/useControlInternoPermissions";
import { toast } from "sonner";

// ━━━━━━━━━━━ MÓDULOS CONSOLIDADOS ━━━━━━━━━━━
import { GestionAuditoriasKanbanSimple } from "./GestionAuditoriasKanbanSimple";  // DASHBOARD PRINCIPAL
import { PlanificacionModuleRediseno } from "./PlanificacionModuleRediseno";  // RF001-004
// ELIMINADO: ProcesoAuditoriaModuleRediseno - Integrado en Expediente del Kanban (RF005-009)
import { PlanesMejoramientoModuleRediseno } from "./PlanesMejoramientoModuleRediseno";  // RF010-011
import InformesLeyModulePremium from "./InformesLeyModulePremium";  // RF012 - MÓDULO INDEPENDIENTE
import { ExpedientesModulePremium } from "./ExpedientesModulePremium";  // RF013 - MÓDULO INDEPENDIENTE - EXPEDIENTES
// import { RolesYPermisosModulePremium } from "./RolesYPermisosModulePremium";  // RF015 - MÓDULO INDEPENDIENTE - COMENTADO TEMPORALMENTE
import { ConfiguracionesModulePremium } from "./ConfiguracionesModulePremium";  // VERSIÓN PREMIUM
import { authService } from '../../../services/api/authService';
import { Permissions } from '../../../enums/permissions';

type SeccionActiva =
  | "dashboard"                      // KANBAN DASHBOARD - CENTRO DE COMANDO
  | "planificacion"                  // RF001-004 (4 tabs)
  | "planes-mejoramiento"            // RF010-011 (2 tabs)
  | "informes-ley"                   // RF012 - MÓDULO INDEPENDIENTE
  | "expedientes"                    // RF013 - MÓDULO INDEPENDIENTE - EXPEDIENTES
  | "roles-permisos"                 // RF015 - MÓDULO INDEPENDIENTE
  | "config-auditorias";             // RF019-B - Config Auditorías (Tipos + Listas)

interface ControlInternoFullProps {
  userData?: { roles?: string[] };
  userRoles?: string[];
}

export function ControlInternoFull({ userData, userRoles }: ControlInternoFullProps = {}) {
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
          userData={userData}
          userRoles={userRoles}
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
  userData?: { roles?: string[] };
  userRoles?: string[];
}

function ControlInternoContent({
  seccionActiva,
  setSeccionActiva,
  navegacionManual,
  setNavegacionManual,
  userData,
  userRoles
}: ControlInternoContentProps) {
  const { auditoriaSeleccionada } = useIntegracionAuditoriaPlanes();
  
  // ✅ Hook de validación de permisos
  const { 
    puedeAcceder, 
    submódulosAccesibles,
    rolDetectado 
  } = useControlInternoPermissions(userRoles, userData);

  // Calcular menuItems dinámicamente con badge y filtrado por permisos
  const menuItems: MenuItem[] = [
    // ━━━━━━━━━━━ 1. CENTRO DE COMANDO ━━━━━━━━━━━
    {
      id: "dashboard",
      label: "Auditorías OCIG",
      subtitle: "Centro de comando integrado",
      icon: <LayoutDashboard className="w-5 h-5" />,
      color: "#10B981", // Verde - Principal
      visible: authService.hasPermission(Permissions.CONTROL_INTERNO_AUDITORIA_MANAGE)
    },
    
    // ━━━━━━━━━━━ 2. PLANIFICACIÓN (RF001-004) ━━━━━━━━━━━
    {
      id: "planificacion",
      label: "Planeación OCIG",
      subtitle: "Plan Anual • Universo • Programa",
      icon: <ClipboardList className="w-5 h-5" />,
      color: "#003DA5", // Azul ESAP
      visible: authService.hasPermission(Permissions.CONTROL_INTERNO_PLANEACION_MANAGE)
    },
    
    // ━━━━━━━━━━━ 3. PLANES DE MEJORAMIENTO (RF010-011) ━━━━━━━━━━━
    {
      id: "planes-mejoramiento",
      label: "Planes de Mejoramiento",
      subtitle: "Formulación • Seguimiento",
      icon: <AlertTriangle className="w-5 h-5" />,
      color: "#EF4444", // Rojo - Hallazgos
      badge: auditoriaSeleccionada ? auditoriaSeleccionada.hallazgos.length : 0,
      visible: authService.hasPermission(Permissions.CONTROL_INTERNO_PLANES_MEJORAMIENTO_MANAGE)
    },
    
    // ━━━━━━━━━━━ 4. INFORMES DE LEY (RF012) ━━━━━━━━━━━
    {
      id: "informes-ley",
      label: "Informes de Ley",
      subtitle: "Ejecutivo Anual • Pormenorizado • Formatos",
      icon: <FileText className="w-5 h-5" />,
      color: "#8B5CF6", // Púrpura - Informes
      visible: authService.hasPermission(Permissions.CONTROL_INTERNO_INFORMES_DE_LEY_MANAGE)
    },
    
    // ━━━━━━━━━━━ 5. EXPEDIENTES (RF013) ━━━━━━━━━━━
    {
      id: "expedientes",
      label: "Expedientes",
      subtitle: "Archivo • Búsqueda • Expedientes",
      icon: <FolderOpen className="w-5 h-5" />,
      color: "#0891B2", // Cyan - Documental
      visible: authService.hasPermission(Permissions.CONTROL_INTERNO_EXPEDIENTES_MANAGE)
    },
    
    // ━━━━━━━━━━━ 6. ROLES Y PERMISOS (RF015) ━━━━━━━━━━━
    // COMENTADO TEMPORALMENTE
    // {
    //   id: "roles-permisos",
    //   label: "Roles y Permisos",
    //   subtitle: "RBAC • Seguridad • Accesos",
    //   icon: <Shield className="w-5 h-5" />,
    //   color: "#DC2626", // Rojo - Seguridad
    //   visible: puedeAcceder('roles-permisos'),
    // },
    
    // ━━━━━━━━━━━ 7. CONFIGURACIONES ━━━━━━━━━━━
    {
      id: "config-auditorias",
      label: "Configuraciones",
      subtitle: "Notificaciones • Auditoría • Kanban • Config",
      icon: <Settings className="w-5 h-5" />,
      color: "#059669", // Verde oscuro - Config
      visible: authService.hasPermission(Permissions.CONTROL_INTERNO_CONFIGURACIONES_MANAGE)
    },
  ].filter(item => item.visible !== false); // ✅ Filtrar opciones sin acceso

  // ✅ Validar acceso antes de cambiar de sección
  const handleSectionChange = (section: SeccionActiva) => {
    if (!puedeAcceder(section)) {
      toast.error('Acceso denegado', {
        description: `No tienes permisos para acceder a "${section}"`,
      });
      return;
    }
    
    setSeccionActiva(section);
    setNavegacionManual(Date.now());
  };

  // ✅ Validar sección inicial al cargar
  useEffect(() => {
    if (seccionActiva && !puedeAcceder(seccionActiva)) {
      // Redirigir al primer submódulo accesible
      const primeraAccesible = submódulosAccesibles[0] || 'dashboard';
      if (primeraAccesible && primeraAccesible !== seccionActiva) {
        setSeccionActiva(primeraAccesible as SeccionActiva);
        toast.warning('Redirigiendo', {
          description: `No tienes acceso a esta sección. Mostrando "${primeraAccesible}"`,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Solo ejecutar al montar

  const renderSeccion = () => {
    // ✅ Validar acceso antes de renderizar
    if (!puedeAcceder(seccionActiva)) {
      return (
        <div className="p-8 text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">Acceso Denegado</h3>
          <p className="text-gray-600 mb-2">
            No tienes permisos para acceder a esta sección.
          </p>
          <p className="text-sm text-gray-500">
            Tu rol detectado: {rolDetectado || 'No asignado'}
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Roles recibidos: {JSON.stringify(userRoles || userData?.roles || [])}
          </p>
          {submódulosAccesibles.length > 0 && (
            <p className="text-sm text-blue-600 mt-4">
              Submódulos disponibles: {submódulosAccesibles.join(', ')}
            </p>
          )}
        </div>
      );
    }

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
        handleSectionChange(section as SeccionActiva);
      }}
    >
      {/* Navegación automática */}
      <MenuDinamicoWrapper
        seccionActiva={seccionActiva}
        onCambiarSeccion={(section) => handleSectionChange(section as SeccionActiva)}
        navegacionManual={navegacionManual}
        puedeAcceder={puedeAcceder}
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
  navegacionManual,
  puedeAcceder // ✅ Recibir función de validación
}: MenuDinamicoWrapperProps & { puedeAcceder: (submodulo: string) => boolean }) {
  const { auditoriaSeleccionada } = useIntegracionAuditoriaPlanes();
  const [yaNavego, setYaNavego] = useState(false); // ← Control de navegación única

  // Navegación automática (solo la primera vez y si tiene permisos)
  useEffect(() => {
    const tiempoActual = Date.now();
    const navegacionReciente = (tiempoActual - navegacionManual) < 500; // 500ms después de navegación manual
    
    // ✅ Validar que tiene acceso antes de navegar automáticamente
    if (auditoriaSeleccionada && 
        seccionActiva !== 'planes-mejoramiento' && 
        !yaNavego && 
        !navegacionReciente &&
        puedeAcceder('planes-mejoramiento')) { // ✅ Nueva validación
      
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
  }, [auditoriaSeleccionada, seccionActiva, onCambiarSeccion, navegacionManual, yaNavego, puedeAcceder]);

  return null;
}