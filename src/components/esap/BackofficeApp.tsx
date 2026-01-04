/**
 * Backoffice App - Sistema Administrativo ESAP
 */

import { useState } from 'react';
import { SidebarPremium } from './SidebarPremium';
import { TopBar } from './TopBar';
import { ExecutiveDashboard } from './ExecutiveDashboard';
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

// Importar Portal del Usuario Auditado
import { PortalTransaccionalUsuario } from './control-interno/PortalTransaccionalUsuario';

// Importar módulo de Control Interno Disciplinario
import { ControlDisciplinarioFull } from './disciplinario/ControlDisciplinarioFull';

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

// Importar Provider de Notificaciones
import { NotificationsProvider } from './NotificationsContext';

// ✅ NUEVO: Provider de Tour Guiado
import { TourProvider } from './gestion-legal/design-system/TourContext';

// ✅ NUEVO: Módulo de Gestión de Contraseñas
import { GestionUsuariosPasswordTracking } from './admin/GestionUsuariosPasswordTracking';

// Importar Visualizador PTA (versión original)
import { GestionProfesoralApp } from '../gestion-profesoral/GestionProfesoralApp';

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
  | 'arquitectura-empresarial'
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
  };
  userRoles?: string[];
}

export function BackofficeApp({ onLogout, onBackToSystemSelector, onSystemChange, usuario, userData, userRoles }: BackofficeAppProps = {}) {
  // Si el usuario tiene acceso restringido, abrir directamente su módulo específico
  const initialModule = userData?.module === 'control-interno'
    ? 'control-interno'
    : userData?.module === 'control-disciplinario'
    ? 'control-disciplinario'
    : userData?.module === 'registro-academico'
    ? 'graduates'
    : userData?.module === 'certificados-laborales' 
    ? 'certificados-laborales' 
    : userData?.module === 'arquitectura-empresarial'
    ? 'dashboard' // Abrir en Dashboard Ejecutivo que muestra métricas de Arquitectura
    : userData?.module === 'gestion-legal' 
    ? 'gestion-legal'
    : userData?.module === 'procesos'
    ? 'control-interno' // Portal del Usuario Auditado
    : 'dashboard';
  const [currentModule, setCurrentModule] = useState<ModuleView>(initialModule);
  const [currentSidebarModule, setCurrentSidebarModule] = useState<string>(''); // Nuevo: Guardar el módulo del sidebar
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false); // Estado para mobile sidebar
  const [density, setDensity] = useState<'compact' | 'comfortable'>('comfortable');
  const [certificatesPendingCount, setCertificatesPendingCount] = useState(0);
  const [showProfile, setShowProfile] = useState(false);

  // Verificar si el usuario tiene acceso restringido solo a Control Interno
  const hasRestrictedAccess = userData?.restrictedAccess === true;
  const restrictedModule = userData?.module;

  // Mapeo de IDs del Sidebar a módulos del BackofficeApp
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
      'arquitectura-empresarial': 'arquitectura-empresarial',
      'gestion-passwords': 'gestion-passwords',
      'gestion-profesoral': 'gestion-profesoral'
    };
    return (mappings[sidebarModule] as ModuleView) || 'dashboard';
  };

  // Mock user data - en producción vendría del contexto de autenticación
  // Si se pasan datos del usuario (userData), usar esos, sino usar mockUser
  const currentUser = userData || {
    name: 'Administrador ESAP',
    email: 'admin@esap.edu.co',
    personId: 'admin-001'
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
        return <ExecutiveDashboard 
          userRole={mockUser.role} 
          restrictedMode={
            userData?.module === 'certificados-laborales' 
              ? 'certificados-laborales' 
              : userData?.module === 'arquitectura-empresarial'
              ? 'arquitectura-empresarial'
              : undefined
          }
        />;
      
      case 'users-persons':
        return <UsersPersonsModulePremium />;
      
      case 'carpeta-digital':
        return <CarpetaDigitalModule />;
      
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
          return <PortalTransaccionalUsuario onLogout={handleLogout} />;
        }
        // Si es usuario de Control Interno (auditor), mostrar dashboard completo
        return <ControlInternoFull />;
      
      case 'control-disciplinario':
        return <ControlDisciplinarioFull />;
      
      case 'gestion-legal':
        return <GestionLegalFull />;
      
      case 'certificados-laborales':
        return <CertificadosLaboralesRouter />;
      
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
        return <ExecutiveDashboard userRole={mockUser.role} />;
    }
  };

  return (
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
                console.log('🔍 Sidebar module clicked:', sidebarModule);
                const mappedModule = mapSidebarToModule(sidebarModule);
                console.log('📍 Mapped to:', mappedModule);
                setCurrentSidebarModule(sidebarModule);
                setCurrentModule(mappedModule);
                setSidebarOpen(false); // Cerrar sidebar en mobile después de seleccionar módulo
              }}
              certificatesPendingCount={certificatesPendingCount}
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
  );
}