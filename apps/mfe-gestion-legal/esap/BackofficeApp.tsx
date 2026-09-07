/**
 * Backoffice App - Sistema Administrativo ESAP
 * ✅ OPTIMIZADO: Lazy Loading para mejorar performance
 */

import { useState, useEffect, lazy, Suspense, type ComponentType } from 'react';
import { SidebarPremium } from './SidebarPremium';
import { TopBar } from './TopBar';

// ✅ SIEMPRE IMPORTADOS (Core components)
import { ProfileModal } from './ProfileModal';
import { NotificationsProvider } from './NotificationsContext';
import { TourProvider } from './gestion-legal/design-system/TourContext';

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
const CertificadosLaboralesRouter = lazyRemote(() => import('certificados_laborales/Router'), ['CertificadosLaboralesRouter']);
const EstructuraOrganizacionalModule = lazyRemote(() => import('estructura_org/Module'), ['EstructuraOrganizacionalModule']);
const ProgramasAcademicosModule = lazyRemote(() => import('programas_academicos/Module'), ['ProgramasAcademicosModule']);
const GestionUsuariosPasswordTracking = lazyRemote(() => import('gestion_personas/Passwords'), ['GestionUsuariosPasswordTracking']);
const GestionProfesoralApp = lazyRemote(() => import('gestion_profesoral/Module'), ['GestionProfesoralApp']);

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
  | 'users-persons'
  | 'carpeta-digital'
  | 'roles-permissions'
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
  | 'verification-certificates'
  | 'firma-electronica'
  | 'control-interno'
  | 'control-disciplinario'
  | 'gestion-legal'
  | 'certificados-laborales'
  | 'estructura-organizacional'
  | 'programas-academicos'
  | 'gestion-passwords'
  | 'demo-pta-motor'
  | 'gestion-profesoral';

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

export function BackofficeApp({ onLogout, onBackToSystemSelector, onSystemChange, usuario, userData, userRoles }: BackofficeAppProps = {}) {
  console.log('BackofficeApp', userData, userRoles)
  const currentUser = userData || {
    name: usuario?.nombre || 'Administrador ESAP',
    email: usuario?.email || 'admin@esap.edu.co',
    personId: usuario?.id || 'admin-001'
  };
  console.log('📋 Usuario actual:', userData?.module);
  const initialModule = userData?.module === 'control-interno' ? 'control-interno'
    : userData?.module === 'control-disciplinario' ? 'control-disciplinario'
      : userData?.module === 'registro-academico' ? 'graduates'
        : userData?.module === 'certificados-laborales' ? 'certificados-laborales'
          : userData?.module === 'gestion-legal' ? 'gestion-legal'
            : userData?.module === 'procesos' ? 'control-interno'
              : userData?.module === 'graduates' ? 'graduates'
                : userData?.module === 'carpeta-digital' ? 'carpeta-digital'
                  : userData?.module === 'estructura-organizacional' ? 'estructura-organizacional'
                    : userData?.module === 'firma-electronica' ? 'firma-electronica'
                      : 'users-persons';
  console.log('📋 Inicial module:', initialModule);

  const [currentModule, setCurrentModule] = useState<ModuleView>(initialModule);
  const [currentSidebarModule, setCurrentSidebarModule] = useState<string>('');

  // 🚀 AUTO-COLAPSO INTELIGENTE: Detectar tamaño de pantalla
  const getInitialCollapsedState = () => {
    // Verificar si hay un estado guardado en localStorage
    const savedState = localStorage.getItem('esap-sidebar-collapsed');
    if (savedState !== null) {
      return savedState === 'true';
    }

    // Si no hay estado guardado, auto-colapsar en pantallas < 1440px
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1440;
    }

    return false;
  };

  const [sidebarCollapsed, setSidebarCollapsed] = useState(getInitialCollapsedState);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [density, setDensity] = useState<'compact' | 'comfortable'>('comfortable');
  const [certificatesPendingCount, setCertificatesPendingCount] = useState(0);
  const [showProfile, setShowProfile] = useState(false);

  const mapSidebarToModule = (sidebarModule: string): ModuleView => {
    const mappings: Record<string, ModuleView> = {
      'executive': 'dashboard',
      'users-management': 'users-persons',
      'carpeta-digital': 'carpeta-digital',
      'roles-administration': 'roles-permissions',
      'audit': 'audit',
      'reports': 'reports',
      'graduates-verification': 'graduates',
      'graduates-certificates': 'verification-certificates',
      'graduates-review-requests': 'certificate-requests',
      'community': 'community-posts', // Por defecto abre Posts
      'community-posts': 'community-posts',
      'community-events': 'community-events',
      'community-announcements': 'community-announcements',
      'certificate-requests': 'certificate-requests', // Certificados Académicos (dentro de Comunidad en sidebar)
      'job-board': 'job-board',
      'certificados-laborales': 'certificados-laborales',
      'estructura-organizacional': 'estructura-organizacional',
      'programas-academicos': 'programas-academicos',
      'firma-electronica': 'firma-electronica',
      'control-interno': 'control-interno',
      'control-disciplinario': 'control-disciplinario',
      'gestion-legal': 'gestion-legal',
      'gestion-passwords': 'gestion-passwords',
      'gestion-profesoral': 'gestion-profesoral'
    };
    return (mappings[sidebarModule] as ModuleView) || 'dashboard';
  };

  // Extraer nombre del usuario, priorizando userData.name, luego usuario.nombre
  const userName = currentUser.name || usuario?.nombre || 'Administrador ESAP';

  const mockUser = {
    name: userName,
    role: 'super-admin' as const,
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
        // Redirigir a Estructura Organizacional como vista principal
        return (
          <Suspense fallback={<ModuleLoader />}>
            <EstructuraOrganizacionalModule />
          </Suspense>
        );

      case 'users-persons':
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

      case 'roles-permissions':
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

      case 'verification-certificates':
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
            <ControlDisciplinarioFull />
          </Suspense>
        );

      case 'gestion-legal':
        return (
          <Suspense fallback={<ModuleLoader />}>
            <GestionLegalFull />
          </Suspense>
        );

      case 'certificados-laborales':
        return (
          <Suspense fallback={<ModuleLoader />}>
            <CertificadosLaboralesRouter 
              userRoles={userRoles || []}
              userEmail={currentUser.email}
              userPermissions={userData?.permissions || []}
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
        {/* ✅ GRID LAYOUT - Mobile First */}
        <div className="min-h-screen bg-gray-50 grid grid-cols-1 md:grid-cols-[auto_1fr]">
          {/* Sidebar - Ocultar para usuario de procesos (auditado) */}
          {userData?.module !== 'procesos' && (
            <>
              {/* Spacer for Fixed Sidebar to prevent content overlap */}
              <div
                className={`hidden md:block shrink-0 transition-[width] duration-300 ${sidebarCollapsed
                    ? 'w-[80px]'
                    : 'w-[280px] md:w-[260px] lg:w-[220px] xl:w-[240px] 2xl:w-[260px]'
                  }`}
              />
              <SidebarPremium
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                isCollapsed={sidebarCollapsed}
                onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
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
                assignedModules={userData?.modules}
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
            </>
          )}

          {/* ✅ MAIN CONTENT - Flexbox Column */}
          <div className="flex flex-col h-screen bg-gray-50 overflow-hidden" style={{marginLeft: sidebarCollapsed ? '70px' : '0'}}>
            {/* Top Bar - Ocultar para usuario de procesos (auditado) */}
            {userData?.module !== 'procesos' && (
              <TopBar
                onToggleSidebar={() => {
                  // En mobile abre el sidebar, en desktop colapsa/expande
                  if (typeof window !== 'undefined' && window.innerWidth < 768) {
                    setSidebarOpen(!sidebarOpen);
                  } else {
                    setSidebarCollapsed(!sidebarCollapsed);
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
              <div className={`min-h-full ${userData?.module === 'procesos' ? '' : 'p-3 sm:p-4 md:p-5 lg:p-6'}`}>
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
              userRole="Super Administrador"
              userInitials={mockUser.initials}
              onLogout={handleLogout}
            />
          )}
        </div>
      </TourProvider>
    </NotificationsProvider>
  );
}
