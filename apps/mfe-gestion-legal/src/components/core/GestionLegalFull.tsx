/**
 * GestionLegalFull - Sistema Integrado de Gestión Legal (SIGL v5.0)
 * Layout unificado con ModuleLayout compartido
 * DISEÑO 100% COHERENTE CON CONTROL INTERNO Y CONTROL DISCIPLINARIO
 * ✅ CONECTADO CON CONFIGURACIONES CENTRALIZADAS VÍA CONTEXT API
 */

import { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  Scale,
  Gavel,
  FileQuestion,
  Inbox,
  CalendarClock,
  Briefcase,
  Building2,
  DollarSign,
  Target,
  AlertTriangle,
  ClipboardCheck,
  Settings,
  FolderOpen,
  BarChart3
} from 'lucide-react';
import { ModuleLayout, MenuItem } from '../../shared/ModuleLayout';

// ✅ Context API para Configuraciones Centralizadas
import { ConfiguracionesSIGLProvider } from '../config/ConfiguracionesSIGLContext';
import { PermisosProvider } from '../config/PermisosContext';

// Componentes de módulos V3 - DISEÑO UNIFICADO
import { ModuloDefensaJudicialV3 } from '../modulos/ModuloDefensaJudicialV3';
import { ModuloJuzgamientoDisciplinarioV3 } from '../modulos/ModuloJuzgamientoDisciplinarioV3';
import { ModuloAsesoriaJuridicaV3 } from '../modulos/ModuloAsesoriaJuridicaV3';
import { ModuloCentroComunicacionesJuridicasV3 } from '../modulos/CentroComunicacionesJuridicasV3';
import { ModuloTerminosInformesV3 } from '../modulos/ModuloTerminosInformesV3';

// Componentes FASE 2 - 6 MÓDULOS ADICIONALES
import { OrganosControl } from '../modulos/OrganosControl';
import { ModuloProcesosCoactivosV3 } from '../modulos/ProcesosCoactivosV3';
import { ModuloPlanAccionV4 } from '../modulos/PlanAccionV4';
import { Riesgos } from '../modulos/Riesgos';
import { ModuloPlanesMejoramientoV4 } from '../modulos/PlanesMejoramientoV4';
import { ConfiguracionesSIGL } from '../modulos/ConfiguracionesSIGL';
import { ExpedientesModuloSIGL } from '../modulos/ExpedientesModuloSIGL';
import { ReportesGestionLegal } from '../modulos/ReportesGestionLegal';

// ✅ Tour Guiado Multi-Módulo
import { GuidedTour, TourButton, useTourCompleted } from '../design-system/GuidedTour';
import { siglFullTourSteps } from '../design-system/tourStepsMultiModulo';

// Sistema de Notificaciones para Términos (usa el contexto del Backoffice)
import { useNotifications } from '../../../esap/NotificationsContext';
import { legalService } from '../../services/api/legal.service';
import { authService } from '../../services/api/authService';
import { Permissions } from '@esap-mfe/shared-types/permissions';
import { Toaster } from 'sonner';

type VistaDisponible =
  | 'defensa-judicial'
  | 'juzgamiento'
  | 'asesoria'
  | 'centro-comunicaciones'
  | 'terminos'
  | 'organos-control'
  | 'procesos-coactivos'
  | 'expedientes'
  | 'plan-accion'
  | 'riesgos'
  | 'planes-mejoramiento'
  | 'reportes'
  | 'configuraciones';

/**
 * Lee `?modulo=<vista>` del querystring para posicionar la vista inicial cuando
 * el módulo se abre desde una notificación. Acepta los códigos que emite el
 * backend (`legal-notifications.service.ts`: defensa-judicial, juzgamiento, asesoria,
 * organos-control, procesos-coactivos) y cualquier otro valor de `VistaDisponible`.
 */
const VISTAS_VALIDAS: VistaDisponible[] = [
  'defensa-judicial',
  'juzgamiento',
  'asesoria',
  'centro-comunicaciones',
  'terminos',
  'organos-control',
  'procesos-coactivos',
  'expedientes',
  'plan-accion',
  'riesgos',
  'planes-mejoramiento',
  'reportes',
  'configuraciones',
];

function getVistaInicialDesdeQuery(): VistaDisponible {
  if (typeof window === 'undefined') return 'defensa-judicial';
  const moduloParam = new URLSearchParams(window.location.search).get('modulo');
  if (moduloParam && VISTAS_VALIDAS.includes(moduloParam as VistaDisponible)) {
    return moduloParam as VistaDisponible;
  }
  return 'defensa-judicial';
}

export function GestionLegalFull() {
  const [vistaActual, setVistaActual] = useState<VistaDisponible>(getVistaInicialDesdeQuery);

  // ✅ Estados del tour guiado multi-módulo
  const [isTourOpen, setIsTourOpen] = useState(false);
  const { completed: tourCompleted, resetTour } = useTourCompleted('sigl-full-tour');

  // Sistema de notificaciones para términos urgentes/críticos
  const { addNotification } = useNotifications();
  const notificacionesGeneradas = useRef<Set<string>>(new Set());

  // Cargar y verificar términos al entrar a Gestión Legal
  useEffect(() => {
    const verificarTerminosUrgentes = async () => {
      try {
        const terminos = await legalService.getTerminosListado();

        terminos.forEach((t: any) => {
          const diasRestantes = t.calculo?.diasRestantes ?? 0;
          const notifId = `termino-${t.id}`;

          // Solo generar si no fue generada antes
          if (notificacionesGeneradas.current.has(notifId)) return;

          if (diasRestantes <= 2) {
            // Crítico (rojo) - <= 2 días
            addNotification({
              tipo_notificacion: 'termino_critico',
              titulo: '⚠️ Término Crítico',
              mensaje: `El término "${t.nombreActuacion || t.numeroRadicado}" vence en ${diasRestantes} día(s).`,
              descripcion_corta: `Vence en ${diasRestantes} día(s)`,
              icono: 'AlertTriangle',
              color: '#DC2626',
              prioridad: 'Crítica',
              categoria: 'Gestión Legal',
              tiene_accion: true,
              texto_boton_accion: 'Ver Término',
              url_accion: '/gestion-legal?modulo=terminos',
              modulo_origen: 'Control de Términos',
              datos_adicionales: { terminoId: t.id, responsable: t.responsableNombre || 'Sin asignar' }
            });
            notificacionesGeneradas.current.add(notifId);
          } else if (diasRestantes <= 5) {
            // Urgente (amarillo) - 3-5 días
            addNotification({
              tipo_notificacion: 'termino_urgente',
              titulo: '🔔 Término Próximo a Vencer',
              mensaje: `El término "${t.nombreActuacion || t.numeroRadicado}" vence en ${diasRestantes} día(s).`,
              descripcion_corta: `Vence en ${diasRestantes} día(s)`,
              icono: 'Clock',
              color: '#F59E0B',
              prioridad: 'Alta',
              categoria: 'Gestión Legal',
              tiene_accion: true,
              texto_boton_accion: 'Ver Término',
              url_accion: '/gestion-legal?modulo=terminos',
              modulo_origen: 'Control de Términos',
              datos_adicionales: { terminoId: t.id, responsable: t.responsableNombre || 'Sin asignar' }
            });
            notificacionesGeneradas.current.add(notifId);
          }
        });
      } catch (error) {
        console.error('Error verificando términos urgentes:', error);
      }
    };

    verificarTerminosUrgentes();
  }, [addNotification]);

  // ✅ Listener: notificaciones del Jefe Gestión Legal abren expediente in-app sin reload.
  //
  // El backend (`legal-notifications.service.ts`) emite notificaciones con
  // `url_accion='/gestion-legal?modulo=<vista>&radicado=<...>'`. Cuando el usuario hace
  // clic en "Ver proceso", `NotificationsPanelV2` despacha el evento `legal:open-expediente`
  // con `{modulo, radicado, procesoId}`. Aquí cambiamos la vista activa y reemitimos
  // `legal:open-expediente-detail` para que el submódulo correspondiente abra el modal.
  //
  // Mapeo modulo (vista) → submódulo que escucha:
  //   defensa-judicial      → ModuloDefensaJudicialV3
  //   juzgamiento           → ModuloJuzgamientoDisciplinarioV3
  //   asesoria              → ModuloAsesoriaJuridicaV3
  //   organos-control       → OrganosControl
  //   procesos-coactivos    → ProcesosCoactivosV3
  useEffect(() => {
    const moduloAVista: Record<string, VistaDisponible> = {
      'defensa-judicial': 'defensa-judicial',
      'juzgamiento': 'juzgamiento',
      'asesoria': 'asesoria',
      'organos-control': 'organos-control',
      'procesos-coactivos': 'procesos-coactivos',
    };

    const handleOpen = (event: Event) => {
      const detail = (event as CustomEvent).detail || {};
      const vista = moduloAVista[detail.modulo];
      if (!vista) return;
      setVistaActual(vista);
      // Re-emitir con delay para dar tiempo a React a montar el submódulo.
      // 500ms es suficiente incluso en renders lentos; el submódulo guarda el
      // evento en sessionStorage como respaldo adicional por si llega antes de montar.
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent('legal:open-expediente-detail', { detail }),
        );
      }, 500);
    };

    window.addEventListener('legal:open-expediente', handleOpen);

    // Procesar intención pendiente al montar (caso: shell recargó al MFE).
    const pending = sessionStorage.getItem('legal:pendingOpenExpediente');
    if (pending) {
      sessionStorage.removeItem('legal:pendingOpenExpediente');
      try {
        const detail = JSON.parse(pending);
        handleOpen(new CustomEvent('legal:open-expediente', { detail }));
      } catch {
        /* ignore */
      }
    }

    return () => window.removeEventListener('legal:open-expediente', handleOpen);
  }, []);

  // ✅ Handler para navegación automática cuando cambia el paso del tour
  const handleTourStepChange = (stepIndex: number) => {
    const step = siglFullTourSteps[stepIndex];

    // Si el paso tiene navegación, cambiar de módulo con delay
    if (step.navigateTo) {
      const delay = step.navigationDelay || 500;

      setTimeout(() => {
        setVistaActual(step.navigateTo as VistaDisponible);
      }, delay);
    }
  };

  // Definir menu items sin Dashboard ni Tour
  const menuItems: MenuItem[] = [
    // 📋 MÓDULOS KANBAN - PRIORIZADOS POR FLUJO E IMPORTANCIA
    {
      id: 'defensa-judicial',
      label: 'Defensa Judicial',
      subtitle: 'Defensa de ESAP ante demandas externas',
      icon: <Scale className="w-5 h-5" />,
      color: '#10B981',
      visible: authService.hasPermission(Permissions.GESTION_LEGAL_DEFENSA_JUDICIAL_MANAGE),
    },
    {
      id: 'juzgamiento',
      label: 'Juzgamiento Disciplinario',
      subtitle: 'Control disciplinario de funcionarios',
      icon: <Gavel className="w-5 h-5" />,
      color: '#DC2626',
      visible: authService.hasPermission(Permissions.GESTION_LEGAL_JUZGAMIENTO_DISCIPLINARIO_MANAGE),
    },
    {
      id: 'asesoria',
      label: 'Asesoría Jurídica',
      subtitle: 'Consultas jurídicas de dependencias',
      icon: <FileQuestion className="w-5 h-5" />,
      color: '#8B5CF6',
      visible: authService.hasPermission(Permissions.GESTION_LEGAL_ASESORIA_JURIDICA_MANAGE),
    },

    // MÓDULOS DE SOPORTE
    {
      id: 'centro-comunicaciones',
      label: 'Centro de Comunicaciones',
      subtitle: 'Radicación y notificaciones',
      icon: <Inbox className="w-5 h-5" />,
      color: '#3B82F6',
      visible: authService.hasPermission(Permissions.GESTION_LEGAL_COMUNICACIONES_MANAGE),
    },
    {
      id: 'terminos',
      label: 'Términos e Informes',
      subtitle: 'Gestión de vencimientos y reportes',
      icon: <CalendarClock className="w-5 h-5" />,
      color: '#6366F1',
      visible: authService.hasPermission(Permissions.GESTION_LEGAL_TERMINOS_MANAGE),
    },
    {
      id: 'organos-control',
      label: 'Órganos de Control',
      subtitle: 'Requerimientos externos de control',
      icon: <Building2 className="w-5 h-5" />,
      color: '#2563EB',
      visible: authService.hasPermission(Permissions.GESTION_LEGAL_ORGANOS_CONTROL_MANAGE),
    },
    {
      id: 'procesos-coactivos',
      label: 'Procesos Coactivos',
      subtitle: 'Cobro judicial y administrativo',
      icon: <DollarSign className="w-5 h-5" />,
      color: '#F59E0B',
      visible: authService.hasPermission(Permissions.GESTION_LEGAL_PROCESOS_COACTIVOS_MANAGE),
    },
    {
      id: 'expedientes',
      label: 'Expedientes Electrónicos',
      subtitle: 'Gestión documental de procesos',
      icon: <FolderOpen className="w-5 h-5" />,
      color: '#0891B2',
      visible: authService.hasPermission(Permissions.GESTION_LEGAL_EXPEDIENTES_ELECTRONICOS_MANAGE),
    },

    // MÓDULOS DE GESTIÓN ESTRATÉGICA
    {
      id: 'plan-accion',
      label: 'Plan de Acción',
      subtitle: 'Indicadores y metas institucionales',
      icon: <Target className="w-5 h-5" />,
      color: '#7C3AED',
      visible: authService.hasPermission(Permissions.GESTION_LEGAL_PLAN_ACCION_MANAGE),
    },
    {
      id: 'riesgos',
      label: 'Gestión de Riesgos',
      subtitle: 'Matriz de riesgos y controles',
      icon: <AlertTriangle className="w-5 h-5" />,
      color: '#DC2626',
      visible: authService.hasPermission(Permissions.GESTION_LEGAL_RIESGOS_MANAGE),
    },
    {
      id: 'planes-mejoramiento',
      label: 'Planes de Mejoramiento',
      subtitle: 'Acciones de mejora institucional',
      icon: <ClipboardCheck className="w-5 h-5" />,
      color: '#14B8A6',
      visible: authService.hasPermission(Permissions.GESTION_LEGAL_PLANES_MEJORAMIENTO_MANAGE),
    },
    {
      id: 'reportes',
      label: 'Reportes',
      subtitle: 'Analítica y trazabilidad legal',
      icon: <BarChart3 className="w-5 h-5" />,
      color: '#003DA5',
      visible: authService.hasPermission(Permissions.GESTION_LEGAL_REPORTES_MANAGE),
    },
    {
      id: 'configuraciones',
      label: 'Configuraciones del Sistema',
      subtitle: 'Ajustes y parámetros del SIGL',
      icon: <Settings className="w-5 h-5" />,
      color: '#94A3B8',
      visible: authService.hasPermission(Permissions.GESTION_LEGAL_CONFIGURACIONES_MANAGE),
    },
  ];

  // Renderizar vista activa
  const renderVistaActual = () => {
    switch (vistaActual) {
      case 'defensa-judicial':
        return <ModuloDefensaJudicialV3 />;
      case 'juzgamiento':
        return <ModuloJuzgamientoDisciplinarioV3 />;
      case 'asesoria':
        return <ModuloAsesoriaJuridicaV3 />;
      case 'centro-comunicaciones':
        return <ModuloCentroComunicacionesJuridicasV3 />;
      case 'terminos':
        return <ModuloTerminosInformesV3 />;
      case 'organos-control':
        return <OrganosControl />;
      case 'procesos-coactivos':
        return <ModuloProcesosCoactivosV3 />;
      case 'expedientes':
        return <ExpedientesModuloSIGL />;
      case 'plan-accion':
        return <ModuloPlanAccionV4 />;
      case 'riesgos':
        return <Riesgos />;
      case 'planes-mejoramiento':
        return <ModuloPlanesMejoramientoV4 />;
      case 'reportes':
        return <ReportesGestionLegal />;
      case 'configuraciones':
        return <ConfiguracionesSIGL />;
      default:
        return <ModuloDefensaJudicialV3 />;
    }
  };

  return (
    <ConfiguracionesSIGLProvider>
      <PermisosProvider>
        <Toaster position="top-right" richColors closeButton duration={4000} />
        <ModuleLayout
          moduleName="GESTIÓN LEGAL"
          moduleDescription="Sistema Integrado de Gestión Legal (SIGL v5.0)"
          moduleIcon={<Briefcase className="w-6 h-6" />}
          moduleColor="#003DA5"
          menuItems={menuItems}
          activeSection={vistaActual}
          onSectionChange={(section) => setVistaActual(section as VistaDisponible)}
          initialSidebarCollapsed={false} // Logo ESAP compacto cuando se colapsa
        >
          {renderVistaActual()}
        </ModuleLayout>
      </PermisosProvider>
    </ConfiguracionesSIGLProvider>
  );
}
