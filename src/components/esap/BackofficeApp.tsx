/**
 * Backoffice App - Sistema Administrativo ESAP
 */

import { useState } from 'react';
import { SidebarPremium } from './SidebarPremium';
import { TopBar } from './TopBar';
import { NotificationsProvider } from './NotificationsContext';
// import { ExecutiveDashboard } from './ExecutiveDashboard';
import { UsersPersonsModulePremium } from './UsersPersonsModulePremium';
import { CarpetaDigitalModule } from './CarpetaDigitalModule';
import { ReportsModuleV2 } from './ReportsModuleV2';
import { AuditModulePremium } from './AuditModulePremium';
import { GraduatesManagementModule } from './GraduatesManagementModule';
import { EnrollmentManagementModule } from './EnrollmentManagementModule';
import { CommunityManagementModulePremium } from './CommunityManagementModulePremium';
import { CommunityPostsModuleUnified } from './CommunityPostsModuleUnified';
import { CommunityEventsModuleUnified } from './CommunityEventsModuleUnified';
import { CommunityAnnouncementsModuleUnified } from './CommunityAnnouncementsModuleUnified';
import { JobBoardManagementModulePremium } from './JobBoardManagementModulePremium';
import { CertificateRequestsModule } from './CertificateRequestsModule';
import { GraduateCertificatesWrapper } from './GraduateCertificatesWrapper';
import { RolesAdministrationModulePremium } from './RolesAdministrationModulePremium';

// Importar módulo de Firma Electrónica (World-Class)
import { ModuloFirmaElectronicaWorldClass } from './firma-electronica/ModuloFirmaElectronicaWorldClass';

// Importar módulo de Control Interno
import { ControlInternoFull } from './control-interno/ControlInternoFull';

// Importar Portal del Usuario Auditado (Material Design 3)
import { PortalTransaccionalUsuarioMD3 } from './control-interno/PortalTransaccionalUsuarioMD3';

// Importar módulo de Control Interno Disciplinario
import { ControlDisciplinarioFull } from './disciplinario/ControlDisciplinarioFull';

// Importar módulo de Gestión Legal (Juzgamiento Disciplinario)
// import { GestionLegalFull } from './gestion-legal/GestionLegalFull';
// ✅ NUEVO: Módulo de Gestión Legal SIGL v5.0
import { GestionLegalFull } from './gestion-legal/core/GestionLegalFull';

// Importar módulo de Certificados Laborales
import { CertificadosLaboralesRouter } from '../certificados-laborales/CertificadosLaboralesRouter';

// Importar módulo de Estructura Organizacional
import { EstructuraOrganizacionalModule } from '../estructura-organizacional/EstructuraOrganizacionalModule';

// Importar módulo de Programas Académicos
import { ProgramasAcademicosModule } from './ProgramasAcademicosModule';

// Importar ProfileModal
import { ProfileModal } from './ProfileModal';

// Importar módulo de Arquitectura Empresarial
import { ArquitecturaEmpresarialModule } from '../arquitectura-empresarial/ArquitecturaEmpresarialModule';

// ✅ NUEVO: Provider de Tour Guiado
import { TourProvider } from './gestion-legal/design-system/TourContext';

// ✅ NUEVO: Módulo de Gestión de Contraseñas
import { GestionUsuariosPasswordTracking } from './admin/GestionUsuariosPasswordTracking';

// Importar Visualizador PTA (versión original)
import { GestionProfesoralApp } from '../gestion-profesoral/GestionProfesoralApp';
import { PermissionsProvider } from '../../contexts/PermissionsContext';

type ModuleView = 
  | 'dashboard'
  | 'users-persons' 
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
  | 'arquitectura-empresarial'
  | 'gestion-passwords'
  | 'demo-pta-motor'
  | 'gestion-profesoral'
  | 'none';

interface BackofficeAppProps {
  onLogout?: () => void;
  onBackToSystemSelector?: () => void;
  onSystemChange?: (system: 'backoffice' | 'portal') => void;
  userData?: {
    name: string;
    email: string;
    personId: string;
    module?: string;
    hasBothSystemsAccess?: boolean;
    roles?: string[];
    modules?: string[];
  };
  userRoles?: string[];
}

export function BackofficeApp({ onLogout, onBackToSystemSelector, onSystemChange, userData, userRoles }: BackofficeAppProps = {}) {
  // Si el usuario tiene acceso restringido, abrir directamente su módulo específico
  // console.log('🚀 BackofficeApp: userData:', userData);
  // const initialModule = userData?.module === 'control-interno'
  //   ? 'control-interno'
  //   : userData?.module === 'control-disciplinario'
  //   ? 'control-disciplinario'
  //   : userData?.module === 'registro-academico'
  //   ? 'graduates'
  //   : userData?.module === 'certificados-laborales' 
  //   ? 'certificados-laborales' 
  //   : userData?.module === 'arquitectura-empresarial'
  //   ? 'dashboard' // Abrir en Dashboard Ejecutivo que muestra métricas de Arquitectura
  //   : userData?.module === 'gestion-legal' 
  //   ? 'gestion-legal'
  //   : userData?.module === 'gestion-profesoral'
  //   ? 'gestion-profesoral'
  //   : 'dashboard';
  // const initialModule = userData?.roles?.includes('CONTROL_INTERNO') 
  //   ? 'control-interno'
  //   : userData?.roles?.includes('CONTROL_DISCIPLINARIO')
  //   ? 'control-disciplinario'
  //   : userData?.roles?.includes('REGISTRO_ACADEMICO')
  //   ? 'graduates'
  //   : userData?.roles?.includes('COORDINADOR_CERT_LABORAL')
  //   ? 'certificados-laborales'
  //   : userData?.roles?.includes('GESTION_LEGAL')
  //   ? 'gestion-legal'
  //   : userData?.module === 'procesos'
  //   ? 'control-interno'
  //   : 'users-persons';
  console.log('🚀 BackofficeApp: userData:', userData);
  let initialModule =  userData && userData.modules && userData.modules.length > 0 ? userData.modules[0] : 'none';
  initialModule = initialModule === 'all' ? 'users-management' : initialModule;
    
  const [currentSidebarModule, setCurrentSidebarModule] = useState<string>('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [density, setDensity] = useState<'compact' | 'comfortable'>('comfortable');
  const [certificatesPendingCount, setCertificatesPendingCount] = useState(0);
  const [showProfile, setShowProfile] = useState(false);

  // Mapeo de IDs del Sidebar a módulos del BackofficeApp
  // verification-certificates
  const mapSidebarToModule = (sidebarModule: string): ModuleView => {
    const mappings: Record<string, ModuleView> = {
      'executive': 'dashboard',
      'users-management': 'users-persons',
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
      'arquitectura-empresarial': 'arquitectura-empresarial',
      'gestion-passwords': 'gestion-passwords',
      'gestion-profesoral': 'gestion-profesoral'
    };
    return (mappings[sidebarModule] as ModuleView) || 'dashboard';
  };
  console.log('🚀 BackofficeApp: initialModule:', initialModule, ', mapSidebar:', mapSidebarToModule(initialModule));
  const [currentModule, setCurrentModule] = useState<ModuleView>(mapSidebarToModule(initialModule));

  const currentUser = userData || {
    name: 'Administrador ESAP',
    email: 'admin@esap.edu.co',
    personId: 'admin-001'
  };

  // Extraer nombre del usuario, priorizando userData.name, luego usuario.nombre
  const userName = currentUser.name || 'Administrador ESAP';

  const mockUser = {
    name: userName,
    role: 'super-admin' as const,
    email: currentUser.email,
    avatar: undefined,
    initials: userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  };

  // Handlers
  const handleLogout = () => {
    console.log('Logout clicked - Cerrando sesión...');
    // Llamar al handler de logout del padre (App.tsx) si existe
    if (onLogout) {
      onLogout();
    }
  };

  const handleViewProfile = () => {
    console.log('View profile clicked');
    setShowProfile(true);
  };

  const renderModule = () => {
    console.log('Current module:', currentModule);
    // setCurrentModule(undefined);
    switch (currentModule) {
      case 'none':
        return (
          <div className="min-h-[60vh] flex items-center justify-center">
            <div className="max-w-lg w-full bg-white shadow-xl rounded-2xl border border-gray-200 p-8 text-center space-y-4">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full text-4xl font-bold badge-esap-warning">
                !
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Sin módulos asignados</h1>
              <p className="text-gray-600 text-base">
                Tu cuenta no tiene módulos habilitados todavía.
              </p>
              <p className="text-gray-600 text-base">
                Solicita a un administrador que te asigne un rol con los accesos necesarios.
              </p>
              <div className="flex flex-wrap gap-3 justify-center pt-2">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 px-2 py-1 md:px-2.5 md:py-1.5 text-[9px] md:text-[10px] font-bold text-red-600 hover:text-red-700 hover:bg-red-50 border-2 border-transparent hover:border-red-200 rounded-lg transition-all active:scale-95 shadow-sm hover:shadow-md cursor-pointer"
                >
                  Cerrar sesión
                </button>
              </div>
            </div>
          </div>
        );
      case 'dashboard':
        // Redirigir a Estructura Organizacional como vista principal
        return <EstructuraOrganizacionalModule />;
      
      case 'users-persons':
        return <UsersPersonsModulePremium />;
      
      case 'roles-permissions':
        return <RolesAdministrationModulePremium />;
      
      case 'reports':
        return <ReportsModuleV2 />;
      
      case 'audit':
        return <AuditModulePremium />;
      
      case 'graduates':
        return <GraduatesManagementModule />;
      
      case 'enrollment':
        return <EnrollmentManagementModule />;
      
      case 'community':
        return <CommunityManagementModulePremium />;
      
      case 'community-posts':
        return <CommunityPostsModuleUnified />;
      
      case 'community-events':
        return <CommunityEventsModuleUnified />;
      
      case 'community-announcements':
        return <CommunityAnnouncementsModuleUnified />;
      
      case 'job-board':
        return <JobBoardManagementModulePremium />;
      
      case 'certificate-requests':
        return <CertificateRequestsModule />;
      
      case 'verification-certificates':
        return <GraduateCertificatesWrapper onPendingCountChange={setCertificatesPendingCount} />;
      
      case 'firma-electronica':
        return <ModuloFirmaElectronicaWorldClass />;
      
      case 'control-interno':
        // Si es usuario de procesos (auditado), mostrar portal del usuario
        if (userData?.module === 'procesos') {
          return <PortalTransaccionalUsuarioMD3 onLogout={handleLogout} />;
        }
        // Si es usuario de Control Interno (auditor), mostrar dashboard completo
        return (
          <ControlInternoFull 
            userData={userData}
            userRoles={userRoles}
          />
        );
      
      case 'control-disciplinario':
        return <ControlDisciplinarioFull />;
      
      case 'gestion-legal':
        return <GestionLegalFull />;
      
      case 'certificados-laborales':
        return (
          <CertificadosLaboralesRouter 
            userRoles={userRoles || []}
            userEmail={currentUser.email}
          />
        );
      
      case 'estructura-organizacional':
        return <EstructuraOrganizacionalModule />;
      
      case 'programas-academicos':
        return <ProgramasAcademicosModule />;
      
      case 'arquitectura-empresarial':
        return <ArquitecturaEmpresarialModule />;
      
      case 'gestion-passwords':
        return <GestionUsuariosPasswordTracking />;
      
      case 'gestion-profesoral':
        return <GestionProfesoralApp 
          usuario={{ 
            nombre: currentUser.name, 
            email: currentUser.email,
            rol: 'admin' // Por defecto admin, puede ser 'docente', 'coordinador', etc.
          }} 
          onLogout={handleLogout}
        />;      
      default:
        return <EstructuraOrganizacionalModule />;
    }
  };

  return (
    <PermissionsProvider
      modules={userData?.modules}
      permissions={userData?.permissions}
    >
      <NotificationsProvider>
        <TourProvider>
          <div className="min-h-screen bg-gray-50">
          {/* Sidebar - Ocultar para usuario de procesos (auditado) */}
          {userData?.module !== 'procesos' && (
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
                  : userData?.module === 'arquitectura-empresarial'
                  ? 'arquitectura-empresarial'
                  : userData?.module === 'gestion-legal'
                  ? 'gestion-legal'
                  : undefined
              }
            />
          )}

          {/* Main Content - Con margen izquierdo para el sidebar */}
          <div 
            className={`transition-all duration-300 ${
              userData?.module === 'procesos' 
                ? '' // Sin margen para usuario auditado
                : sidebarCollapsed 
                ? 'md:ml-[80px]' 
                : 'md:ml-[260px] lg:ml-[220px] xl:ml-[240px] 2xl:ml-[260px]'
            }`}
          >
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

            {/* Module Content */}
            <main className={userData?.module === 'procesos' ? '' : 'p-4 md:p-6 lg:p-8 min-h-screen'}>
              {renderModule()}
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
    </PermissionsProvider>
  );
}
