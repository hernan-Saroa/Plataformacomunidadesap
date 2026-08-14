/**
 * Backoffice App - Sistema Administrativo ESAP
 * ✅ OPTIMIZADO: Lazy Loading para mejorar performance
 */

import { useState, useEffect, useCallback, lazy, Suspense, type ComponentType } from 'react';
import { SidebarPremium } from './SidebarPremium';
import { TopBar } from './TopBar';
import { PortalDashboard } from '../portal/PortalDashboard';

// ✅ SIEMPRE IMPORTADOS (Core components)
import { ProfileModal } from './ProfileModal';
import { NotificationsProvider } from './NotificationsContext';
import { TourProvider } from './gestion-legal/design-system/TourContext';
import { modulesService, type ActiveModuleInfo } from '../../services/api/modules.service';

function isReactComponentCandidate(value: unknown): boolean {
  if (typeof value === 'function') {
    return true;
  }

  if (typeof value === 'object' && value !== null && '$$typeof' in value) {
    return true;
  }

  return false;
}

function resolveLazyComponent(moduleNamespace: unknown, exportNames: string[]) {
  const queue: unknown[] = [moduleNamespace];
  const visited = new Set<unknown>();

  while (queue.length > 0) {
    const current = queue.shift();

    if (!current || visited.has(current)) {
      continue;
    }

    visited.add(current);

    if (isReactComponentCandidate(current)) {
      return current;
    }

    if (typeof current !== 'object') {
      continue;
    }

    const record = current as Record<string, unknown>;

    for (const exportName of exportNames) {
      const candidate = record[exportName];
      if (isReactComponentCandidate(candidate)) {
        return candidate;
      }
    }

    if ('default' in record) {
      queue.push(record.default);
    }

    for (const value of Object.values(record)) {
      queue.push(value);
    }
  }

  throw new Error(`No se pudo resolver el componente remoto. Exports intentados: ${exportNames.join(', ')}`);
}

function lazyRemote(loader: () => Promise<unknown>, exportNames: string[]) {
  return lazy(async () => ({
    default: resolveLazyComponent(await loader(), exportNames) as ComponentType<any>,
  }));
}

// ✅ LAZY LOADING - Módulos cargados bajo demanda
const DashboardExecutivo = lazy(() => import('./DashboardExecutivo').then(m => ({ default: m.DashboardExecutivo })));
const UsersPersonsModulePremium = lazyRemote(() => import('gestion_personas/Module'), ['UsersPersonsModulePremium']);
const CarpetaDigitalModule = lazy(() => import('./CarpetaDigitalModule').then(m => ({ default: m.CarpetaDigitalModule })));
const ReportsModuleV2 = lazyRemote(() => import('reportes/Module'), ['ReportsModuleV2']);
const AuditModulePremium = lazyRemote(() => import('auditoria/Module'), ['AuditModulePremium']);
const GraduatesManagementModule = lazyRemote(() => import('registro_academico/Graduates'), ['GraduatesManagementModule']);
const EnrollmentAuditModal = lazy(() => import('./EnrollmentAuditModal').then(m => ({ default: m.EnrollmentAuditModal })));
const EnrollmentManagementModule = lazyRemote(() => import('registro_academico/Enrollment'), ['EnrollmentManagementModule']);
const CommunityManagementModulePremium = lazy(() => import('./CommunityManagementModulePremium').then(m => ({ default: m.CommunityManagementModulePremium })));
const CommunityPostsModuleUnified = lazy(() => import('./CommunityPostsModuleUnified').then(m => ({ default: m.CommunityPostsModuleUnified })));
const CommunityEventsModuleUnified = lazy(() => import('./CommunityEventsModuleUnified').then(m => ({ default: m.CommunityEventsModuleUnified })));
const CommunityAnnouncementsModuleUnified = lazy(() => import('./CommunityAnnouncementsModuleUnified').then(m => ({ default: m.CommunityAnnouncementsModuleUnified })));
const JobBoardManagementModulePremium = lazy(() => import('./JobBoardManagementModulePremium').then(m => ({ default: m.JobBoardManagementModulePremium })));
const CertificateRequestsModule = lazy(() => import('./CertificateRequestsModule').then(m => ({ default: m.CertificateRequestsModule })));
const GraduateCertificatesWrapper = lazy(() => import('./GraduateCertificatesWrapper').then(m => ({ default: m.GraduateCertificatesWrapper })));
const RolesAdministrationModulePremium = lazyRemote(() => import('gestion_personas/Roles'), ['RolesAdministrationModulePremium']);
const ModuloFirmaElectronicaWorldClass = lazyRemote(() => import('firma_electronica/Module'), ['ModuloFirmaElectronicaWorldClass']);
const ControlInternoFull = lazyRemote(() => import('control_interno/Module'), ['ControlInternoFull']);
const PortalTransaccionalUsuarioMD3 = lazy(() => import('./control-interno/PortalTransaccionalUsuarioMD3').then(m => ({ default: m.PortalTransaccionalUsuarioMD3 })));
const ControlDisciplinarioFull = lazyRemote(() => import('control_disciplinario/Module'), ['ControlDisciplinarioFull']);
const GestionLegalFull = lazyRemote(() => import('gestion_legal/Module'), ['GestionLegalFull']);
const PTAModule = lazyRemote(() => import('pta/Module'), ['PTAModule', 'PTAKanbanModule']);
const CertificadosLaboralesRouter = lazyRemote(() => import('certificados_laborales/Router'), ['CertificadosLaboralesRouter']);
const EstructuraOrganizacionalModule = lazyRemote(() => import('estructura_org/Module'), ['EstructuraOrganizacionalModule']);
const ProgramasAcademicosModule = lazyRemote(() => import('programas_academicos/Module'), ['ProgramasAcademicosModule']);
const GestionUsuariosPasswordTracking = lazyRemote(() => import('gestion_personas/Passwords'), ['GestionUsuariosPasswordTracking']);
const GestionProfesoralApp = lazyRemote(() => import('gestion_profesoral/Module'), ['GestionProfesoralApp']);
const ContratacionModulePremium = lazyRemote(() => import('contratacion/Module'), ['ContratacionModulePremium']);
const ViaticosModulePremium = lazyRemote(() => import('viaticos/Module'), ['ViaticosModulePremium']);
const ModulesManagementModulePremium = lazy(() => import('./ModulesManagementModulePremium').then(m => ({ default: m.ModulesManagementModulePremium })));

// ✅ Loading Spinner Component
function ModuleLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: '#F8F9FA' }}>
      <div className="text-center">
        <div className="w-16 h-16 border-4 rounded-full animate-spin mx-auto mb-4"
          style={{
            borderColor: '#E5E7EB',
            borderTopColor: '#003DA5'
          }}
        />
        <p className="text-sm font-semibold" style={{ color: '#6B7280' }}>
          Cargando módulo...
        </p>
      </div>
    </div>
  );
}

type ModuleView =
  | 'dashboard'
  | 'executive'
  | 'users-management'
  | 'users-persons'
  | 'carpeta-digital'
  | 'roles-administration'
  | 'reports'
  | 'audit'
  | 'graduates'
  | 'enrollment'
  | 'community'
  | 'community-posts'
  | 'community-events'
  | 'community-announcements'
  | 'job-board'
  | 'certificate-requests'
  | 'graduates-verification'
  | 'graduates-certificates'
  | 'firma-electronica'
  | 'control-interno'
  | 'control-disciplinario'
  | 'gestion-legal'
  | 'certificados-laborales'
  | 'estructura-organizacional'
  | 'programas-academicos'
  | 'gestion-passwords'
  | 'demo-pta-motor'
  | 'pta'
  | 'banco-docentes-pta'
  | 'gestion-profesoral'
  | 'contratacion'
  | 'viaticos'
  | 'modules';

interface BackofficeAppProps {
  onLogout?: () => void;
  onBackToSystemSelector?: () => void;
  onSystemChange?: (system: 'backoffice' | 'portal') => void;
  usuario?: {
    id: string;
    nombre: string;
    tipo: 'externo' | 'interno';
    email: string;
    rol?: string;
  };
  userData?: {
    name: string;
    email: string;
    personId: string;
    module?: string;
    hasBothSystemsAccess?: boolean;
    restrictedAccess?: boolean;
    roles?: string[];
    modules?: string[];
    permissions?: string[];
  };
  userRoles?: string[];
}

const ACADEMIC_ROLE_CODES = new Set(['ESTUDIANTE', 'DOCENTE', 'GRADUADO', 'ASPIRANTE']);
const ACADEMIC_ROLE_LABELS = new Set(['Estudiante', 'Docente', 'Graduado', 'Aspirante']);

function shouldUseAcademicLayout(userData: any, userRoles?: string[]) {
  // Con acceso dual el usuario elige el sistema desde SystemSwitcher; no forzar portal aquí.
  if (userData?.hasBothSystemsAccess) return false;

  const roleCodes = Array.isArray(userData?.roles)
    ? (userData.roles as unknown[]).map((r) => String(r))
    : [];
  const hasOnlyAcademicCodes = roleCodes.length > 0 && roleCodes.every((role) => ACADEMIC_ROLE_CODES.has(role));

  const roleLabels = Array.isArray(userRoles) ? userRoles.map((r) => String(r)) : [];
  const hasOnlyAcademicLabels = roleLabels.length > 0 && roleLabels.every((role) => ACADEMIC_ROLE_LABELS.has(role));

  return hasOnlyAcademicCodes || hasOnlyAcademicLabels;
}

const SIDEBAR_TO_MODULE: Record<string, ModuleView> = {
  'executive': 'executive',
  'dashboard': 'dashboard',
  'users-management': 'users-management',
  'carpeta-digital': 'carpeta-digital',
  'roles-administration': 'roles-administration',
  'audit': 'audit',
  'reports': 'reports',
  'graduates': 'graduates',
  'graduates-management': 'graduates',
  'graduates-verification': 'graduates-verification',
  'graduates-certificates': 'graduates-certificates',
  'graduates-review-requests': 'certificate-requests',
  'community': 'community-posts',
  'community-posts': 'community-posts',
  'community-events': 'community-events',
  'community-announcements': 'community-announcements',
  'certificate-requests': 'certificate-requests',
  'job-board': 'job-board',
  'certificados-laborales': 'certificados-laborales',
  'estructura-organizacional': 'estructura-organizacional',
  'programas-academicos': 'programas-academicos',
  'firma-electronica': 'firma-electronica',
  'control-interno': 'control-interno',
  'control-disciplinario': 'control-disciplinario',
  'gestion-legal': 'gestion-legal',
  'pta': 'pta',
  'contratacion': 'contratacion',
  'viaticos': 'viaticos',
  'banco-docentes-pta': 'banco-docentes-pta',
  'gestion-passwords': 'gestion-passwords',
  'gestion-profesoral': 'gestion-profesoral',
  'registro-academico': 'graduates',
  'modules': 'modules'
};

const SIDEBAR_VIEW_ORDER: ModuleView[] = [
  'users-management',
  'banco-docentes-pta',
  'carpeta-digital',
  'estructura-organizacional',
  'programas-academicos',
  'roles-administration',
  'audit',
  'reports',
  'firma-electronica',
  'graduates-verification',
  'graduates-certificates',
  'pta',
  'certificados-laborales',
  'control-interno',
  'control-disciplinario',
  'gestion-legal',
  'contratacion',
  'viaticos',
];

const MODULE_TO_DEFAULT_SIDEBAR: Partial<Record<ModuleView, string>> = {
  dashboard: 'executive',
  executive: 'executive',
  'users-management': 'users-management',
  'carpeta-digital': 'carpeta-digital',
  'roles-administration': 'roles-administration',
  reports: 'reports',
  audit: 'audit',
  graduates: 'graduates-verification',
  'certificate-requests': 'graduates-review-requests',
  'graduates-certificates': 'graduates-certificates',
  'firma-electronica': 'firma-electronica',
  'control-interno': 'control-interno',
  'control-disciplinario': 'control-disciplinario',
  'gestion-legal': 'gestion-legal',
  'certificados-laborales': 'certificados-laborales',
  'estructura-organizacional': 'estructura-organizacional',
  'programas-academicos': 'programas-academicos',
  'gestion-passwords': 'gestion-passwords',
  pta: 'pta',
  'banco-docentes-pta': 'banco-docentes-pta',
  'gestion-profesoral': 'gestion-profesoral',
};

const CONTROL_INTERNO_ROLE_CODES = new Set([
  'CONTROL_INTERNO',
  'JEFE_OCI',
  'PROFESIONAL_AUDITOR',
  'AUXILIAR_AUDITORIA',
  'CONSULTA',
  'JEFE_CONTROL_INTERNO',
  'AUDITOR_LIDER',
]);

function normalizeRoleCode(role: string) {
  return role
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
}

function resolveModuleView(module?: string): ModuleView | undefined {
  if (!module) return undefined;
  return SIDEBAR_TO_MODULE[module] || (SIDEBAR_VIEW_ORDER.includes(module as ModuleView) ? module as ModuleView : undefined);
}

export function BackofficeApp({ onLogout, onBackToSystemSelector, onSystemChange, usuario, userData, userRoles }: BackofficeAppProps = {}) {

  const currentUser = userData || {
    name: usuario?.nombre || 'Administrador ESAP',
    email: usuario?.email || 'admin@esap.edu.co',
    personId: usuario?.id || 'admin-001'
  };


  // Layout por rol: Docentes/Estudiantes (Portal) vs Administrativo (Backoffice)
  if (shouldUseAcademicLayout(userData, userRoles)) {
    const portalUserRoles = Array.isArray(userRoles) && userRoles.length > 0
      ? userRoles
      : (Array.isArray(userData?.roles) && userData.roles.length > 0
        ? userData.roles
          .map((role: any) => String(role))
          .filter((role: string) => ACADEMIC_ROLE_CODES.has(role))
          .map((role: string) => (role === 'DOCENTE' ? 'Docente' : role === 'ESTUDIANTE' ? 'Estudiante' : role === 'GRADUADO' ? 'Graduado' : 'Aspirante'))
        : ['Estudiante']);

    return (
      <PortalDashboard
        userName={currentUser.name}
        userEmail={currentUser.email}
        userPersonId={currentUser.personId}
        userRoles={portalUserRoles}
        hasBothSystemsAccess={!!userData?.hasBothSystemsAccess}
        onSystemChange={onSystemChange}
        userData={{
          ...(userData && typeof userData === 'object' ? userData : {}),
          rol_principal: portalUserRoles[0],
          datos_por_rol: (userData && typeof userData === 'object' && 'datos_por_rol' in userData) ? (userData as any).datos_por_rol : {},
        }}
        onLogout={onLogout}
      />
    );
  }

  const userPermissionsList = (userData?.permissions as string[]) || [];
  const normalizedRoleCodes = ((userData?.roles || []) as string[]).map(normalizeRoleCode);
  const normalizedEmail = String(currentUser.email || userData?.email || '').trim().toLowerCase();
  const isSuperAdmin =
    normalizedRoleCodes.some((role) => ['SUPER_ADMIN', 'SUPERADMIN', 'SUPER_ADMINISTRADOR'].includes(role)) ||
    normalizedEmail === 'superuser@esap.edu.co';
  const isSystemAdmin =
    isSuperAdmin ||
    normalizedRoleCodes.some((role) => ['ADMIN', 'ADMINISTRADOR'].includes(role)) ||
    normalizedEmail === 'admin@esap.edu.co';
  const usesPeopleOnlySidebar = normalizedEmail === 'admin@esap.edu.co';

  // Esta misma lista alimenta el sidebar y la resolucion de la pantalla inicial.
  const computedAssignedModules = (() => {
    let modules = [...(((userData?.modules || []) as string[]).filter(Boolean))];

    if (isSystemAdmin) return ['all'];

    const hasCertLaborales = modules.includes('certificados-laborales');
    const hasSignPermission =
      userPermissionsList.includes('certificados-laborales.certificate.sign') ||
      userPermissionsList.includes('cl.certificate.sign');

    if (hasCertLaborales && hasSignPermission && !modules.includes('firma-electronica')) {
      modules = [...modules, 'firma-electronica'];
    } else if (hasCertLaborales && !hasSignPermission) {
      modules = modules.filter((module) => module !== 'firma-electronica');
    }

    // En el menu, el acceso historico `graduates` se presenta como esta vista.
    if (modules.includes('graduates') && !modules.includes('graduates-verification')) {
      modules = [...modules, 'graduates-verification'];
    }

    return modules;
  })();

  // Compute first accessible module respecting sidebar display order (not backend array order)
  const assignedModuleCodes = computedAssignedModules;
  const hasAllAssignedModules = assignedModuleCodes.includes('all');
  const accessibleViews = new Set<ModuleView>();

  for (const moduleCode of assignedModuleCodes) {
    const view = resolveModuleView(moduleCode);
    if (view) accessibleViews.add(view);
  }

  const isViewAccessible = (view?: ModuleView) => {
    if (!view) return false;
    if (hasAllAssignedModules) return true;
    // Sesiones antiguas o mock pueden no traer modules. En ese caso se respeta el module explicito.
    if (assignedModuleCodes.length === 0) return true;
    return accessibleViews.has(view);
  };

  const moduleFromArray: ModuleView | undefined = assignedModuleCodes.length > 0
    ? SIDEBAR_VIEW_ORDER.find((view) => isViewAccessible(view))
    : undefined;

  const hasDashboardAccess = !usesPeopleOnlySidebar && (
    isSuperAdmin ||
    hasAllAssignedModules ||
    assignedModuleCodes.some((module) => ['executive', 'dashboard', 'principal'].includes(module))
  );

  const initialModule: ModuleView = userData?.module === 'control-interno' ? 'control-interno'
    : userData?.module === 'control-disciplinario' ? 'control-disciplinario'
      : userData?.module === 'registro-academico' ? 'graduates'
        : userData?.module === 'certificados-laborales' ? 'certificados-laborales'
          : userData?.module === 'gestion-legal' ? 'gestion-legal'
            : userData?.module === 'pta' ? 'pta'
              : userData?.module === 'pta-portal' ? 'pta'
                : userData?.module === 'procesos' ? 'control-interno'
                  : userData?.module === 'graduates' ? 'graduates'
                    : userData?.module === 'carpeta-digital' ? 'carpeta-digital'
                      : userData?.module === 'estructura-organizacional' ? 'estructura-organizacional'
                        : userData?.module === 'firma-electronica' ? 'firma-electronica'
                          : moduleFromArray ?? 'dashboard'; // Fallback: primer modulo asignado, luego dashboard
  // Asegurarnos de que el Jefe OCI o Auditores NUNCA aterricen en users-management
  const esRolAuditOTipoJefe = ((userData?.roles || []) as string[])
    .map(normalizeRoleCode)
    .some((role) => CONTROL_INTERNO_ROLE_CODES.has(role));
  
  const finalInitialModule =
    (hasDashboardAccess ? 'executive' : undefined) ??
    moduleFromArray ??
    (isViewAccessible(initialModule as ModuleView) ? initialModule : undefined) ??
    (esRolAuditOTipoJefe ? 'control-interno' : 'dashboard');

  const getDefaultSidebarModule = (view: ModuleView) => MODULE_TO_DEFAULT_SIDEBAR[view] || '';



  // Siempre iniciar en la primera vista habilitada del menu visible para el rol.
  const [currentModule, setCurrentModule] = useState<ModuleView>(
    () => finalInitialModule as ModuleView,
  );

  const [currentSidebarModule, setCurrentSidebarModule] = useState<string>(
    () => getDefaultSidebarModule(finalInitialModule as ModuleView),
  );

  // Guardar el módulo actual cada vez que cambie
  useEffect(() => {
    if (currentModule) {
      localStorage.setItem('esap-last-module', currentModule);
    }
  }, [currentModule]);

  useEffect(() => {
    if (currentSidebarModule) {
      localStorage.setItem('esap-last-sidebar-module', currentSidebarModule);
    }
  }, [currentSidebarModule]);

  // 🚀 RESPONSIVE: Reactive viewport breakpoints via matchMedia
  type ViewportSize = 'mobile' | 'tablet' | 'desktop';
  const getViewportSize = useCallback((): ViewportSize => {
    if (typeof window === 'undefined') return 'desktop';
    const w = window.innerWidth;
    return w < 768 ? 'mobile' : w < 1024 ? 'tablet' : 'desktop';
  }, []);

  const [viewportSize, setViewportSize] = useState<ViewportSize>(getViewportSize);

  useEffect(() => {
    const mql768 = window.matchMedia('(min-width: 768px)');
    const mql1024 = window.matchMedia('(min-width: 1024px)');
    const update = () => setViewportSize(getViewportSize());
    mql768.addEventListener('change', update);
    mql1024.addEventListener('change', update);
    return () => {
      mql768.removeEventListener('change', update);
      mql1024.removeEventListener('change', update);
    };
  }, [getViewportSize]);

  // Sidebar collapse: mobile/tablet = forced collapse, desktop = user preference
  const forceCollapseSidebar = viewportSize !== 'desktop';

  const [userSidebarCollapsed, setUserSidebarCollapsed] = useState(() => {
    const savedState = localStorage.getItem('esap-sidebar-collapsed');
    if (savedState !== null) return savedState === 'true';
    return typeof window !== 'undefined' ? window.innerWidth < 1440 : false;
  });

  // Effective collapsed state: forced on mobile/tablet, user choice on desktop
  const sidebarCollapsed = forceCollapseSidebar || userSidebarCollapsed;
  const setSidebarCollapsed = (value: boolean | ((prev: boolean) => boolean)) => {
    setUserSidebarCollapsed(value);
  };

  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Auto-close sidebar drawer when switching from mobile to desktop
  useEffect(() => {
    if (viewportSize === 'desktop') setSidebarOpen(false);
  }, [viewportSize]);

    useEffect(() => {
      const handleSidebarCollapse = (e: Event) => {
        const customEvent = e as CustomEvent;
        if (customEvent.detail && typeof customEvent.detail.collapsed === 'boolean') {
          setSidebarCollapsed(customEvent.detail.collapsed);
        }
      };

      const handlePortalViewChange = (e: Event) => {
        const customEvent = e as CustomEvent;
        if (customEvent.detail && customEvent.detail.view === 'carpeta-digital') {
          setCurrentModule('carpeta-digital');
          setCurrentSidebarModule('carpeta-digital');
        }
      };

      window.addEventListener('esap:sidebar:collapse', handleSidebarCollapse);
      window.addEventListener('portal-view-change', handlePortalViewChange);
      return () => {
        window.removeEventListener('esap:sidebar:collapse', handleSidebarCollapse);
        window.removeEventListener('portal-view-change', handlePortalViewChange);
      };
    }, []);

  const [density, setDensity] = useState<'compact' | 'comfortable'>('comfortable');
  const [certificatesPendingCount, setCertificatesPendingCount] = useState(0);
  const [showProfile, setShowProfile] = useState(false);
  const [activeModules, setActiveModules] = useState<ActiveModuleInfo[]>([]);

  const loadActiveModules = useCallback(() => {
    modulesService.getActiveModules().then((modules) => {
      if (Array.isArray(modules)) {
        setActiveModules(modules);
      }
    });
  }, []);

  useEffect(() => {
    loadActiveModules();
  }, [loadActiveModules]);

  const mapSidebarToModule = (sidebarModule: string): ModuleView => {
    return (SIDEBAR_TO_MODULE[sidebarModule] as ModuleView) || 'dashboard';
  };

  // Extraer nombre del usuario, priorizando userData.name, luego usuario.nombre
  const userName = currentUser.name || usuario?.nombre || 'Administrador ESAP';

  const mockUser = {
    name: userName,
    role: (userData?.roles?.[0] || usuario?.rol || 'Administrador') as string,
    email: currentUser.email,
    avatar: undefined,
    initials: userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  };

  // Handlers
  const handleLogout = () => {
    // Llamar al handler de logout del padre (App.tsx) si existe
    if (onLogout) {
      onLogout();
    }
  };

  const handleViewProfile = () => {
    setShowProfile(true);
  };

  const renderModule = () => {
    switch (currentModule) {
      case 'dashboard':
      case 'executive':
        return (
          <Suspense fallback={<ModuleLoader />}>
            <DashboardExecutivo onNavigateToModule={(sid) => setCurrentModule(sid as ModuleView)} />
          </Suspense>
        );

      case 'users-persons':
      case 'users-management':
        return (
          <Suspense fallback={<ModuleLoader />}>
            <UsersPersonsModulePremium />
          </Suspense>
        );

      case 'carpeta-digital':
        return (
          <Suspense fallback={<ModuleLoader />}>
            <CarpetaDigitalModule />
          </Suspense>
        );

      case 'roles-administration':
        return (
          <Suspense fallback={<ModuleLoader />}>
            <RolesAdministrationModulePremium />
          </Suspense>
        );

      case 'reports':
        return (
          <Suspense fallback={<ModuleLoader />}>
            <ReportsModuleV2 />
          </Suspense>
        );

      case 'audit':
        // Si es usuario de procesos (auditado), mostrar portal del usuario
        if (userData?.module === 'procesos') {
          return (
            <Suspense fallback={<ModuleLoader />}>
              <PortalTransaccionalUsuarioMD3 onLogout={handleLogout} />
            </Suspense>
          );
        }
        // Si es usuario de Control Interno (auditor), mostrar dashboard completo
        return (
          <Suspense fallback={<ModuleLoader />}>
            <AuditModulePremium />
          </Suspense>
        );

      case 'graduates':
      case 'graduates-verification':
        return (
          <Suspense fallback={<ModuleLoader />}>
            <GraduatesManagementModule />
          </Suspense>
        );

      case 'enrollment':
        return (
          <Suspense fallback={<ModuleLoader />}>
            <EnrollmentManagementModule />
          </Suspense>
        );

      case 'community':
        return (
          <Suspense fallback={<ModuleLoader />}>
            <CommunityManagementModulePremium />
          </Suspense>
        );

      case 'community-posts':
        return (
          <Suspense fallback={<ModuleLoader />}>
            <CommunityPostsModuleUnified />
          </Suspense>
        );

      case 'community-events':
        return (
          <Suspense fallback={<ModuleLoader />}>
            <CommunityEventsModuleUnified />
          </Suspense>
        );

      case 'community-announcements':
        return (
          <Suspense fallback={<ModuleLoader />}>
            <CommunityAnnouncementsModuleUnified />
          </Suspense>
        );

      case 'job-board':
        return (
          <Suspense fallback={<ModuleLoader />}>
            <JobBoardManagementModulePremium />
          </Suspense>
        );

      case 'certificate-requests':
        return (
          <Suspense fallback={<ModuleLoader />}>
            <CertificateRequestsModule />
          </Suspense>
        );

      case 'graduates-certificates':
        return (
          <Suspense fallback={<ModuleLoader />}>
            <GraduateCertificatesWrapper onPendingCountChange={setCertificatesPendingCount} />
          </Suspense>
        );

      case 'firma-electronica':
        return (
          <Suspense fallback={<ModuleLoader />}>
            <ModuloFirmaElectronicaWorldClass />
          </Suspense>
        );

      case 'control-interno':
        // Si es usuario de procesos (auditado), mostrar portal del usuario
        if (userData?.module === 'procesos') {
          return (
            <Suspense fallback={<ModuleLoader />}>
              <PortalTransaccionalUsuarioMD3 onLogout={handleLogout} />
            </Suspense>
          );
        }
        // Si es usuario de Control Interno (auditor), mostrar dashboard completo
        return (
          <Suspense fallback={<ModuleLoader />}>
            <ControlInternoFull />
          </Suspense>
        );

      case 'control-disciplinario':
        return (
          <Suspense fallback={<ModuleLoader />}>
            <ControlDisciplinarioFull
              key={[
                userData?.personId || currentUser.id || currentUser.email || 'anon',
                ...(userData?.roles || []),
                ...(userData?.permissions || []),
              ].join(':')}
            />
          </Suspense>
        );

      case 'gestion-legal':
        return (
          <Suspense fallback={<ModuleLoader />}>
            <GestionLegalFull />
          </Suspense>
        );

      case 'pta':
        return (
          <Suspense fallback={<ModuleLoader />}>
            <PTAModule
              key="pta-gestion"
              userPersonId={currentUser.personId}
              userName={currentUser.name}
              userEmail={currentUser.email}
              userRoles={userData?.roles || userRoles || []}
              userPermissions={userPermissionsList}
              embedded
            />
          </Suspense>
        );

      case 'banco-docentes-pta':
        return (
          <Suspense fallback={<ModuleLoader />}>
            <PTAModule
              key="pta-banco-docentes"
              userPersonId={currentUser.personId}
              userName={currentUser.name}
              userEmail={currentUser.email}
              userRoles={userData?.roles || userRoles || []}
              userPermissions={userPermissionsList}
              embedded
              initialView="banco_docentes"
            />
          </Suspense>
        );

      case 'certificados-laborales':
        return (
          <Suspense fallback={<ModuleLoader />}>
            <CertificadosLaboralesRouter
              userRoles={userRoles || []}
              userEmail={currentUser.email}
              userPermissions={userPermissionsList}
            />
          </Suspense>
        );

      case 'estructura-organizacional':
        return (
          <Suspense fallback={<ModuleLoader />}>
            <EstructuraOrganizacionalModule />
          </Suspense>
        );

      case 'programas-academicos':
        return (
          <Suspense fallback={<ModuleLoader />}>
            <ProgramasAcademicosModule />
          </Suspense>
        );

      case 'gestion-passwords':
        return (
          <Suspense fallback={<ModuleLoader />}>
            <GestionUsuariosPasswordTracking />
          </Suspense>
        );

      case 'gestion-profesoral':
        return (
          <Suspense fallback={<ModuleLoader />}>
            <GestionProfesoralApp
              usuario={{
                nombre: currentUser.name,
                email: currentUser.email,
                rol: 'admin' // Por defecto admin, puede ser 'docente', 'coordinador', etc.
              }}
              onLogout={handleLogout}
            />
          </Suspense>
        );

      case 'contratacion':
        return (
          <Suspense fallback={<ModuleLoader />}>
            <ContratacionModulePremium />
          </Suspense>
        );

      case 'viaticos':
        return (
          <Suspense fallback={<ModuleLoader />}>
            <ViaticosModulePremium />
          </Suspense>
        );

      case 'modules':
        return (
          <Suspense fallback={<ModuleLoader />}>
            <ModulesManagementModulePremium
              onModuleUpdated={loadActiveModules}
              userRoles={(userData?.roles || (usuario?.rol ? [usuario.rol] : [])) as string[]}
            />
          </Suspense>
        );

      default:
        return (
          <Suspense fallback={<ModuleLoader />}>
            <EstructuraOrganizacionalModule />
          </Suspense>
        );
    }
  };

  return (
    <NotificationsProvider>
      <TourProvider>
        {/* ✅ APP LAYOUT - Mobile First */}
        <div className="backoffice-shell-layout min-h-screen bg-gray-50">
          {/* Sidebar - Ocultar para usuario de procesos (auditado) */}
          {userData?.module !== 'procesos' && (
            <SidebarPremium
              isOpen={sidebarOpen}
              userRole={userData?.roles}
              onClose={() => setSidebarOpen(false)}
              isCollapsed={sidebarCollapsed}
              onToggleCollapse={() => setSidebarCollapsed(!userSidebarCollapsed)}
              forceCollapse={forceCollapseSidebar}
              currentModule={currentModule}
              currentSidebarModule={currentSidebarModule}
              onModuleChange={(sidebarModule) => {
                const mappedModule = mapSidebarToModule(sidebarModule);
                setCurrentSidebarModule(sidebarModule);
                setCurrentModule(mappedModule);
                setSidebarOpen(false); // Cerrar sidebar en mobile después de seleccionar módulo
              }}
              userEmail={currentUser.email}
              certificatesPendingCount={certificatesPendingCount}
              assignedModules={computedAssignedModules}
              activeModules={activeModules}
              userPermissions={userPermissionsList}
              restrictedMode={
                userData?.module === 'control-interno'
                  ? 'control-interno'
                  : userData?.module === 'control-disciplinario'
                  ? 'control-disciplinario'
                  : userData?.module === 'registro-academico'
                  ? 'registro-academico'
                  : userData?.module === 'certificados-laborales' 
                  ? 'certificados-laborales' 
                  : userData?.module === 'gestion-legal'
                  ? 'gestion-legal'
                  : undefined
              }
            />
          )}

          {/* ✅ MAIN CONTENT - Flexbox Column */}
          <div
            className={`backoffice-main-shell flex flex-col h-screen bg-gray-50 overflow-hidden ${
              sidebarCollapsed ? 'backoffice-main-shell--collapsed' : ''
            } ${
              sidebarOpen ? 'backoffice-main-shell--sidebar-open' : ''
            } ${userData?.module === 'procesos' ? 'backoffice-main-shell--no-sidebar' : ''}`}
          >

            {/* Top Bar - Ocultar para usuario de procesos (auditado) */}
            {userData?.module !== 'procesos' && (
              <TopBar
                onToggleSidebar={() => {
                  // Mobile: toggle drawer open/close. Tablet/Desktop: toggle collapse.
                  if (viewportSize === 'mobile') {
                    setSidebarOpen(!sidebarOpen);
                  } else if (viewportSize === 'desktop') {
                    setSidebarCollapsed(!userSidebarCollapsed);
                  } else {
                    // Tablet: open drawer (since sidebar is auto-collapsed to icons)
                    setSidebarOpen(!sidebarOpen);
                  }
                }}
                density={density}
                onDensityChange={setDensity}
                onLogout={handleLogout}
                onViewProfile={handleViewProfile}
                userName={mockUser.name}
                userEmail={mockUser.email}
                userInitials={mockUser.initials}
                onBackToSystemSelector={onBackToSystemSelector}
                hasBothSystemsAccess={userData?.hasBothSystemsAccess}
                onSystemChange={onSystemChange}
                currentSystem="backoffice"
              />
            )}

            {/* Module Content - Contenedor con scroll vertical óptimo */}
            <main className={`flex-1 overflow-y-auto overflow-x-hidden bg-gray-50 ${userData?.module === 'procesos' ? '' : ''}`}>
              <div className={`min-h-full ${
                userData?.module === 'procesos' || ['gestion-legal', 'control-interno', 'control-disciplinario'].includes(currentModule)
                  ? ''
                  : 'p-3 sm:p-4 md:p-5 lg:p-6 xl:p-8'
              }`}>
                {renderModule()}
              </div>
            </main>
          </div>

          {/* Profile Modal */}
          {showProfile && (
            <ProfileModal
              isOpen={showProfile}
              onClose={() => setShowProfile(false)}
              userName={mockUser.name}
              userEmail={mockUser.email}
              userRole={mockUser.role}
              userInitials={mockUser.initials}
              onLogout={handleLogout}
            />
          )}
        </div>
      </TourProvider>
    </NotificationsProvider>
  );
}
