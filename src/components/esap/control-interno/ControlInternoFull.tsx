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
import { useControlInternoPermissions } from "./hooks/useControlInternoPermissions";
import { ListasChequeoProvider } from "./listas-chequeo/ListasChequeoContext";
import { HallazgosProvider } from "./HallazgosContext";
import { TareasProvider } from "./TareasContext";
import { toast } from "sonner";
import { planesMejoramientoApi } from "./services/api";

// ━━━━━━━━━━━ MÓDULOS CONSOLIDADOS ━━━━━━━━━━━
import { GestionAuditoriasKanbanSimple } from "./GestionAuditoriasKanbanSimple";  // DASHBOARD PRINCIPAL
import { DashboardOCIG } from "./components/DashboardOCIG";  // ✨ NUEVO: Dashboard Ejecutivo Oficial
import { TableroKanbanOCIG } from "./components/TableroKanbanOCIG";  // ✨ NUEVO: Tablero Kanban Oficial OCIG
import { PlanificacionModuleRediseno } from "./PlanificacionModuleRediseno";  // RF001-004
// ELIMINADO: ProcesoAuditoriaModuleRediseno - Integrado en Expediente del Kanban (RF005-009)
import { PlanesMejoramientoModuleRediseno } from "./PlanesMejoramientoModuleRediseno";  // RF010-011
import InformesLeyModulePremium from "./InformesLeyModulePremium";  // RF012 - MÓDULO INDEPENDIENTE
import { ExpedientesModulePremium } from "./ExpedientesModulePremium";  // RF013 - MÓDULO INDEPENDIENTE - EXPEDIENTES
// import { RolesYPermisosModulePremium } from "./RolesYPermisosModulePremium";  // RF015 - MÓDULO INDEPENDIENTE - COMENTADO TEMPORALMENTE
import { ConfiguracionesModulePremium } from "./ConfiguracionesModulePremium";  // VERSIÓN PREMIUM
import { authService } from '../../../services/api/authService';
import { Permissions } from '../../../enums/permissions';
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
        <ListasChequeoProvider>
          <HallazgosProvider>
            <TareasProvider>
              <ControlInternoContent
                seccionActiva={seccionActiva}
                setSeccionActiva={setSeccionActiva}
                navegacionManual={navegacionManual}
                setNavegacionManual={setNavegacionManual}
                userData={userData}
                userRoles={userRoles}
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
  const [totalPlanesMejoramiento, setTotalPlanesMejoramiento] = useState<number>(0);
  
  // ✅ Hook de validación de permisos
  const { 
    puedeAcceder, 
    submódulosAccesibles,
    rolDetectado 
  } = useControlInternoPermissions(userRoles, userData);

  // Cargar el contador de planes de mejoramiento
  useEffect(() => {
    const cargarContadorPlanes = async () => {
      try {
        const response = await planesMejoramientoApi.getAll();
        if (response.success && response.data) {
          setTotalPlanesMejoramiento(response.data.length);
        }
      } catch (error) {
        console.error('Error al cargar contador de planes de mejoramiento:', error);
      }
    };
    
    cargarContadorPlanes();
    // Recargar cada 30 segundos para mantener el contador actualizado
    const interval = setInterval(cargarContadorPlanes, 30000);
    return () => clearInterval(interval);
  }, []);

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
      visible: authService.hasPermission(Permissions.CONTROL_INTERNO_PLANEACION_MANAGE)
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
      badge: totalPlanesMejoramiento > 0 ? totalPlanesMejoramiento : undefined,
      visible: authService.hasPermission(Permissions.CONTROL_INTERNO_PLANES_MEJORAMIENTO_MANAGE)
    },
    
    // ━━━━━━━━━━━ 8. EXPEDIENTES (RF013) ━━━━━━━━━━━
    {
      id: "expedientes",
      label: "Expedientes",
      subtitle: "Archivo • Búsqueda • Expedientes",
      icon: <FolderOpen className="w-5 h-5" />,
      color: "#0891B2", // Cyan - Documental
      visible: authService.hasPermission(Permissions.CONTROL_INTERNO_EXPEDIENTES_MANAGE)
    },
    
    // ━━━━━━━━━━━ 9. CONFIGURACIONES ━━━━━━━━━━━
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