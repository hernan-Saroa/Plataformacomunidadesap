/**
 * Backoffice App - Sistema Administrativo ESAP
 * Integra todos los módulos del backoffice incluyendo Gestión Profesoral
 */

import { useState } from 'react';
import { SidebarPremium } from './SidebarPremium';
import { TopBar } from './TopBar';
import { NotificationsProvider } from './NotificationsContext';
import { ExecutiveDashboard } from './ExecutiveDashboard';
import { UsersPersonsModulePremium } from './UsersPersonsModulePremium';
import { CarpetaDigitalModule } from './CarpetaDigitalModule';
import { ReportsModuleV2 } from './ReportsModuleV2';
import { AuditModulePremium } from './AuditModulePremium';
import { GraduatesManagementModule } from './GraduatesManagementModule';
import { EnrollmentManagementModule } from './EnrollmentManagementModule';
import { CommunityManagementModulePremium } from './CommunityManagementModulePremium';
import { CommunityPostsModule } from './CommunityPostsModule';
import { CommunityEventsModule } from './CommunityEventsModule';
import { CommunityAnnouncementsModule } from './CommunityAnnouncementsModule';
import { JobBoardManagementModulePremium } from './JobBoardManagementModulePremium';
import { CertificateRequestsModule } from './CertificateRequestsModule';
import { GraduateCertificatesWrapper } from './GraduateCertificatesWrapper';
import { RolesAdministrationModulePremium } from './RolesAdministrationModulePremium';

// Importar módulos de Gestión Profesoral
import { GestionProfesoralModule } from '../gestion-profesoral/GestionProfesoralModule';

// Importar módulo de Control Interno
import { ControlInternoFull } from './control-interno/ControlInternoFull';

// Importar módulo de Control Disciplinario Completo (Sistema Full)
import { ControlDisciplinarioFull } from './disciplinario/ControlDisciplinarioFull';

// Importar módulo de Gestión Legal (Juzgamiento Disciplinario)
import { GestionLegalFull } from './gestion-legal/GestionLegalFull';

// Importar módulo de Certificados Laborales
import { CertificadosLaboralesRouter } from '../certificados-laborales/CertificadosLaboralesRouter';

// Importar módulo de Estructura Organizacional
import { EstructuraOrganizacionalModule } from '../estructura-organizacional/EstructuraOrganizacionalModule';

// Importar módulo de Programas Académicos
import { ProgramasAcademicosModule } from './ProgramasAcademicosModule';

// Importar módulo de Aspirantes
import { AspirantesModule } from './AspirantesModule';

// Importar ProfileModal
import { ProfileModal } from './ProfileModal';

// Importar módulo de Arquitectura Empresarial
import { ArquitecturaEmpresarialModule } from '../arquitectura-empresarial/ArquitecturaEmpresarialModule';

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
  | 'gestion-profesoral'
  | 'control-interno'
  | 'control-disciplinario'
  | 'gestion-legal'
  | 'certificados-laborales'
  | 'estructura-organizacional'
  | 'programas-academicos'
  | 'aspirantes'
  | 'arquitectura-empresarial'
  | 'demo-pta-motor';

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
  };
  userRoles?: string[];
}

export function BackofficeApp({ onLogout, onBackToSystemSelector, onSystemChange, userData, userRoles }: BackofficeAppProps = {}) {
  // Si el usuario es cerlaboral@esap.edu.co o ar.empresarial@esap.edu.co, abrir automáticamente su módulo específico
  const initialModule = userData?.module === 'certificados-laborales' 
    ? 'certificados-laborales' 
    : userData?.module === 'arquitectura-empresarial'
    ? 'dashboard' // Abrir en Dashboard Ejecutivo que muestra métricas de Arquitectura
    : 'dashboard';
  const [currentModule, setCurrentModule] = useState<ModuleView>(initialModule);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false); // Estado para mobile sidebar
  const [density, setDensity] = useState<'compact' | 'comfortable'>('comfortable');
  const [certificatesPendingCount, setCertificatesPendingCount] = useState(0);
  const [showProfile, setShowProfile] = useState(false);

  // Mapeo de IDs del Sidebar a módulos del BackofficeApp
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
      'aspirantes': 'aspirantes',
      'community': 'community-posts', // Por defecto abre Posts
      'community-posts': 'community-posts',
      'community-events': 'community-events',
      'community-announcements': 'community-announcements',
      'certificate-requests': 'certificate-requests', // Certificados Académicos (dentro de Comunidad en sidebar)
      'job-board': 'job-board',
      'certificados-laborales': 'certificados-laborales',
      'estructura-organizacional': 'estructura-organizacional',
      'programas-academicos': 'programas-academicos',
      'gestion-profesoral': 'gestion-profesoral',
      'control-interno': 'control-interno',
      'control-disciplinario': 'control-disciplinario',
      'gestion-legal': 'gestion-legal',
      'arquitectura-empresarial': 'arquitectura-empresarial',
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

  const mockUser = {
    name: currentUser.name,
    role: 'super-admin' as const,
    email: currentUser.email,
    avatar: undefined,
    initials: currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
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
        return <CommunityPostsModule />;
      
      case 'community-events':
        return <CommunityEventsModule />;
      
      case 'community-announcements':
        return <CommunityAnnouncementsModule />;
      
      case 'job-board':
        return <JobBoardManagementModulePremium />;
      
      case 'certificate-requests':
        return <CertificateRequestsModule />;
      
      case 'verification-certificates':
        return <GraduateCertificatesWrapper onPendingCountChange={setCertificatesPendingCount} />;
      
      case 'gestion-profesoral':
        return <GestionProfesoralModule />;
      
      case 'control-interno':
        return <ControlInternoFull />;
      
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
      
      case 'aspirantes':
        return <AspirantesModule />;
      
      case 'arquitectura-empresarial':
        return <ArquitecturaEmpresarialModule />;
      
      default:
        return <ExecutiveDashboard userRole={mockUser.role} />;
    }
  };

  return (
    <NotificationsProvider>
      <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <SidebarPremium
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        currentModule={currentModule}
        onModuleChange={(sidebarModule) => {
          const mappedModule = mapSidebarToModule(sidebarModule);
          setCurrentModule(mappedModule);
          setSidebarOpen(false); // Cerrar sidebar en mobile después de seleccionar módulo
        }}
        certificatesPendingCount={certificatesPendingCount}
        restrictedMode={
          userData?.module === 'certificados-laborales' 
            ? 'certificados-laborales' 
            : userData?.module === 'arquitectura-empresarial'
            ? 'arquitectura-empresarial'
            : undefined
        }
      />

      {/* Main Content */}
      <div
        className="transition-all duration-300 md:ml-20 lg:ml-20"
        style={{
          marginLeft: typeof window !== 'undefined' && window.innerWidth >= 768 
            ? (sidebarCollapsed ? '80px' : '260px')
            : '0px',
        }}
      >
        {/* Top Bar */}
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

        {/* Module Content - Con espacio superior para evitar superposición */}
        <main className="p-4 md:p-6 lg:p-8 min-h-screen">
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
    </NotificationsProvider>
  );
}