/**
 * App Principal - ComUNIdad Universitaria ESAP
 * Punto de entrada que integra:
 * - Landing Page pública
 * - Portal Transaccional (estudiantes/graduados/docentes)
 * - Backoffice Administrativo
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './components/portal/LandingPage';
import { LoginPage } from './components/portal/LoginPage';
import { PortalDashboard } from './components/portal/PortalDashboard';
import { BackofficeApp } from './components/esap/BackofficeApp';
import { GestionProfesoralApp } from './components/gestion-profesoral/GestionProfesoralApp';
// import { DemoPasswordStrength } from './components/esap/admin/DemoPasswordStrength';
import { DemoProcesosCoactivos } from './components/esap/gestion-legal/DemoProcesosCoactivos';
// import { DemoReprogramacionAudiencia } from './components/esap/gestion-legal/modulos/DemoReprogramacionAudiencia';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';
import { AlertTriangle, Clock } from 'lucide-react';
import { authService } from './services/api/authService';
import { config } from './config/environment';
import { NotificacionesProvider } from './contexts/NotificacionesContext';
import { EditorPlantillasPage } from './pages/EditorPlantillasPage';
import { ExpedienteCompartidoPage } from './pages/ExpedienteCompartidoPage';

// Importar Demo de Control Disciplinario
import { ControlDisciplinarioDemo } from './components/esap/ControlDisciplinarioDemo';

// Importar componentes de servicios públicos
import { EnrollmentQRLandingUnified } from './components/portal/EnrollmentQRLandingUnified';
import { VinculacionForm } from './components/portal/VinculacionForm';
import { PublicTitleVerification } from './components/portal/PublicTitleVerification';
import { SolicitarCertificadoLaboral } from './components/portal/SolicitarCertificadoLaboral';
import { VerificarCertificadoPublico } from './components/portal/VerificarCertificadoPublico';
import ValidarCertificadoGraduado from './components/portal/ValidarCertificadoGraduado';

/** Entrante */
// import { LoginPage } from './components/portal/LoginPage';
import { VisualizadorPTAAjustes } from './components/gestion-profesoral/VisualizadorPTAAjustes';
// import { Toaster } from './components/ui/sonner';

/**
 * ============================================
 * APP PRINCIPAL - ESAP
 * ============================================
 * 
 * Gestiona la navegación entre los 4 ambientes:
 * 1. Landing Page (público)
 * 2. Login (autenticación)
 * 3. Portal Transaccional (usuarios externos)
 * 4. Backoffice Administrativo (usuarios internos)
 * 
 * MÓDULOS ESPECIALES:
 * - Vista 'pta-demo': Visualizador de PTA con Ajustes Solicitados
 * - Vista 'password-demo': Demo de Validación de Contraseñas
 * - Vista 'procesos-coactivos-demo': Demo de Procesos Coactivos
 * 
 * MÓDULO PRINCIPAL OCIG:
 * El Plan Operativo OCIG es el módulo único para gestión de auditorías,
 * accesible desde Control Interno Gestión en el Backoffice.
 * 
 * Features:
 * - Persistencia de sesión en localStorage
 * - Auto-logout por inactividad (15 minutos)
 * - Alerta previa antes de cerrar sesión
 */

type AppView =
  | 'landing'
  | 'login'
  | 'system-selector'
  | 'portal-transaccional'
  | 'backoffice'
  | 'enrollment-qr'
  | 'vinculaciones'
  | 'verificacion'
  | 'solicitar-certificados-laborales'
  | 'verificar-certificado'
  | 'verificar-certificado'
  | 'solicitar-certificados-graduados'
  | 'convocatorias-docentes';

type UserType = 'estudiante' | 'graduado' | 'docente' | 'administrativo' | 'portal' | null;

type Vista = 'landing' | 'login' | 'portal' | 'backoffice' | 'pta-demo' | 'solicitar-certificados-laborales' | 'solicitar-certificados-graduados' | 'password-demo' | 'procesos-coactivos-demo' | 'edicion-foto-perfil-demo';
// type Vista = 'landing' | 'login' | 'portal' | 'backoffice' | 'pta-demo' | 'password-demo' | 'procesos-coactivos-demo' | 'edicion-foto-perfil-demo';

interface Usuario {
  id: string;
  nombre: string;
  tipo: 'externo' | 'interno';
  email: string;
  rol?: string;
}

interface User {
  id: string;
  person: UserPerson;
  roles: UserRoles[];
  modules: string[];
  username?: string;
  email?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  accessToken?: string;
  rememberMe?: boolean;
}

interface UserPerson {
  id: string;
  identification_number: string;
  identification_type: string;
  full_name: string;
  first_name: string;
  last_name: string;
  gender: string;
  email: string;
  phone: string;
  created_at: string;
  updated_at: string;
}

interface UserRoles {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  type: string;
  is_active: boolean;
  requires_2fa: boolean;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
  permissions: UserPermission[]
}

interface UserPermission {
  code: string;
  created_at: string;
  description: string;
  id_module: string;
  id_permission: string;
  is_active: boolean;
  name: string;
  updated_at: string;
}

interface SesionGuardada {
  usuario: Usuario;
  vista: Vista;
  timestamp: number;
}

interface UserData {
  name: string;
  email: string;
  personId: string;
  hasBothSystemsAccess?: boolean;
  module?: string;
  modules?: string[];
  roles?: string[];
  permissions?: string[];
  datos_por_rol?: any;
}

const extractPermissionCodes = (user: any): string[] => {
  if (!user?.roles || !Array.isArray(user.roles)) return [];
  const codes = user.roles.flatMap((role: any) =>
    Array.isArray(role?.permissions)
      ? role.permissions.map((perm: any) => perm?.code).filter(Boolean)
      : []
  );
  return Array.from(new Set(codes));
};

// Configuración de timeout (15 minutos en milisegundos)
const TIMEOUT_INACTIVIDAD = 15 * 60 * 1000; // 15 minutos
const TIEMPO_ALERTA = 1 * 60 * 1000; // 1 minuto antes de cerrar sesión

export default function App() {
  // DEMO MODE: Cambiar a false para ver aplicativo completo
  const isDemoMode = false;

  const navigate = useNavigate();

  if (isDemoMode) {
    return (
      <>
        <ControlDisciplinarioDemo />
        <Toaster
          position="top-right"
          richColors
          closeButton
          duration={4000}
        />
      </>
    );
  }

  const [currentView, setCurrentView] = useState<AppView>('landing');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userData, setUserData] = useState<any>({ name: '', email: '', personId: '', modules: [], roles: [], permissions: [] });
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [userType, setUserType] = useState<UserType>('portal');
  const [activeRole, setActiveRole] = useState<string>('Estudiante');

  // const [vistaActual, setVistaActual] = useState<Vista>('landing');
  // Leer parámetro de vista desde URL
  const urlParams = new URLSearchParams(window.location.search);
  const viewParam = urlParams.get('view') as Vista | null;

  const [vistaActual, setVistaActual] = useState<Vista>(viewParam || 'landing');
  const [usuarioActual, setUsuarioActual] = useState<Usuario | null>(null);
  const [mostrarAlertaInactividad, setMostrarAlertaInactividad] = useState(false);

  const timerInactividadRef = useRef<NodeJS.Timeout | null>(null);
  const timerAlertaRef = useRef<NodeJS.Timeout | null>(null);

  // ============================================
  // PERSISTENCIA DE SESIÓN
  // ============================================

  // Cargar sesión guardada al iniciar
  useEffect(() => {
    const applySessionFromUser = (user: any) => {
      const userEmail = user?.person?.email || user?.email || '';
      const userName = user?.person?.first_name
        ? `${user.person.first_name} ${user.person.last_name || ''}`.trim()
        : user?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.username || 'Usuario ESAP';

      const roles = Array.isArray(user?.roles)
        ? user.roles.map((role: any) => (typeof role === 'string' ? role : role?.code)).filter(Boolean)
        : [];
      const permissions = extractPermissionCodes(user);
      const hasAdminRole = roles.includes('ADMIN') || roles.includes('SUPER_ADMIN');
      const hasConfigRole = !(roles.includes('ESTUDIANTE') || roles.includes('DOCENTE') || roles.includes('GRADUADO') || roles.includes('ASPIRANTE'))
      // const hasConfigRole = roles.includes('COORDINADOR_CERT_LABORAL') || roles.includes('CONTROL_DISCIPLINARIO') || roles.includes('GESTION_LEGAL');
      const emailLower = userEmail.toLowerCase();

      let nextView: Vista = 'portal';
      let nextCurrentView: AppView = 'portal-transaccional';
      let nextUserType: 'portal' | 'administrativo' = 'portal';
      let module: string | undefined;
      const portalRoles: string[] = [];

      if (hasAdminRole) {
        nextView = 'backoffice';
        nextCurrentView = 'backoffice';
        nextUserType = 'administrativo';
        portalRoles.push('Administrativo');
      } else if (hasConfigRole) {
        nextView = 'backoffice';
        nextCurrentView = 'backoffice';
        nextUserType = 'administrativo';
        // Verificar si tiene acceso a Control Interno (múltiples roles)
        const hasControlInterno = roles.some((role: string) =>
          ['CONTROL_INTERNO', 'JEFE_OCI', 'PROFESIONAL_AUDITOR', 'AUXILIAR_AUDITORIA', 'CONSULTA',
            'JEFE_CONTROL_INTERNO', 'AUDITOR_LIDER'].includes(role)
        );

        module = roles.includes('COORDINADOR_CERT_LABORAL') ? 'certificados-laborales'
          : roles.includes('GESTION_LEGAL') ? 'gestion-legal'
            : roles.includes('CONTROL_DISCIPLINARIO') ? 'control-disciplinario'
              : hasControlInterno ? 'control-interno'
                : 'users-persons';
        const rolStr = roles.includes('COORDINADOR_CERT_LABORAL') ? 'Coordinador de Certificados Laborales'
          : roles.includes('GESTION_LEGAL') ? 'Gestión Legal'
            : roles.includes('CONTROL_DISCIPLINARIO') ? 'Control Disciplinario'
              : roles.includes('JEFE_OCI') ? 'Jefe de Control Interno'
                : roles.includes('PROFESIONAL_AUDITOR') ? 'Profesional Auditor'
                  : roles.includes('AUXILIAR_AUDITORIA') ? 'Auxiliar de Auditoría'
                    : roles.includes('CONSULTA') ? 'Consulta Control Interno'
                      : roles.includes('JEFE_CONTROL_INTERNO') ? 'Jefe de Control Interno'
                        : roles.includes('AUDITOR_LIDER') ? 'Auditor Líder'
                          : 'Control Interno';
        portalRoles.push(rolStr);
      } else {
        if (emailLower.includes('docente') || emailLower.includes('profesor') || emailLower.includes('planta') || emailLower.includes('catedra')) {
          portalRoles.push('Docente');
        } else if (emailLower.includes('graduado') || emailLower.includes('egresado')) {
          portalRoles.push('Graduado');
        } else {
          portalRoles.push('Estudiante');
        }
      }

      setIsAuthenticated(true);
      setUserType(nextUserType);
      setUserRoles(portalRoles);
      setCurrentView(nextCurrentView);
      setVistaActual(nextView);
      setUserData({
        name: userName,
        email: userEmail,
        personId: user?.person?.id || user?.id,
        modules: user?.modules || [],
        roles,
        permissions,
        module
      });
      setUsuarioActual({
        id: user?.id || user?.person?.id || 'unknown',
        nombre: userName,
        email: userEmail,
        tipo: nextView === 'backoffice' ? 'interno' : 'externo'
      });
    };

    const authToken =
      localStorage.getItem(config.STORAGE_KEYS.AUTH_TOKEN) ||
      localStorage.getItem('esap_access_token');
    if (authToken && !localStorage.getItem(config.STORAGE_KEYS.AUTH_TOKEN)) {
      localStorage.setItem(config.STORAGE_KEYS.AUTH_TOKEN, authToken);
    }
    const storedAuthUser = localStorage.getItem(config.STORAGE_KEYS.USER_DATA);
    let sesionGuardada = localStorage.getItem('esap-sesion-activa');
    if (authToken && storedAuthUser) {
      try {
        applySessionFromUser(JSON.parse(storedAuthUser));
        return;
      } catch (error) {
        console.error('Error al restaurar sesión de auth:', error);
      }
    } else {
      if (sesionGuardada) {
        toast.error('Sesión ha expirado', {
          description: 'Por seguridad la sesión se ha cerrado',
          duration: 5000,
        });
        localStorage.clear();
        sesionGuardada = null;
      }
    }

    if (sesionGuardada) {
      try {
        const sesionParsed = JSON.parse(sesionGuardada);
        if (sesionParsed?.usuario && sesionParsed?.vista && sesionParsed?.timestamp) {
          const sesion: SesionGuardada = sesionParsed;

          const tiempoTranscurrido = Date.now() - sesion.timestamp;

          if (tiempoTranscurrido < TIMEOUT_INACTIVIDAD) {
            setUsuarioActual(sesion.usuario);
            setVistaActual(sesion.vista);
            console.log('✅ Sesión restaurada:', sesion.usuario.nombre);

            toast.success('Sesión restaurada', {
              description: `Bienvenido de nuevo, ${sesion.usuario.nombre}`,
            });
          } else {
            // Sesión expirada
            localStorage.removeItem('esap-sesion-activa');
            console.log('⏰ Sesión expirada');
          }
        } else if (sesionParsed?.email || sesionParsed?.person?.email) {
          applySessionFromUser(sesionParsed);
        }
      } catch (error) {
        console.error('Error al restaurar sesión:', error);
        localStorage.removeItem('esap-sesion-activa');
      }
    }
  }, []);

  // Guardar sesión cuando cambie el usuario o vista
  useEffect(() => {
    if (usuarioActual && (vistaActual === 'portal' || vistaActual === 'backoffice')) {
      const sesion: SesionGuardada = {
        usuario: usuarioActual,
        vista: vistaActual,
        timestamp: Date.now(),
      };
      localStorage.setItem('esap-sesion-activa', JSON.stringify(sesion));
    } else {
      localStorage.removeItem('esap-sesion-activa');
    }
  }, [usuarioActual, vistaActual]);

  // Deep links de certificados públicos (laborales y graduados)
  useEffect(() => {
    if (window.location.pathname === '/solicitar-certificado-laboral') {
      setCurrentView('solicitar-certificados-laborales');
      setVistaActual('solicitar-certificados-laborales');
      return;
    }

    if (
      window.location.pathname === '/solicitar-certificado-graduado' ||
      window.location.pathname === '/certificacion-titulos-graduados'
    ) {
      setCurrentView('solicitar-certificados-graduados');
      setVistaActual('solicitar-certificados-graduados');
    }
  }, []);

  // ============================================
  // SISTEMA DE DETECCIÓN DE INACTIVIDAD
  // ============================================

  const resetearTimerInactividad = useCallback(() => {
    // Limpiar timers existentes
    if (timerInactividadRef.current) {
      clearTimeout(timerInactividadRef.current);
    }
    if (timerAlertaRef.current) {
      clearTimeout(timerAlertaRef.current);
    }
    setMostrarAlertaInactividad(false);

    // Solo activar si hay usuario autenticado
    if (!usuarioActual) return;

    // Timer para mostrar alerta (14 minutos)
    timerAlertaRef.current = setTimeout(() => {
      setMostrarAlertaInactividad(true);
      // toast.warning('⚠️ Inactividad detectada', {
      //   description: 'Tu sesión se cerrará en 1 minuto por seguridad',
      //   duration: 10000,
      // });
    }, TIMEOUT_INACTIVIDAD - TIEMPO_ALERTA);

    // Timer para cerrar sesión automáticamente (15 minutos)
    timerInactividadRef.current = setTimeout(() => {
      handleLogoutPorInactividad();
    }, TIMEOUT_INACTIVIDAD);
  }, [usuarioActual]);

  // Detectar actividad del usuario
  useEffect(() => {
    if (!usuarioActual) return;

    const eventos = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

    eventos.forEach((evento) => {
      document.addEventListener(evento, resetearTimerInactividad);
    });

    // Iniciar timer al montar
    resetearTimerInactividad();

    // Cleanup
    return () => {
      eventos.forEach((evento) => {
        document.removeEventListener(evento, resetearTimerInactividad);
      });
      if (timerInactividadRef.current) {
        clearTimeout(timerInactividadRef.current);
      }
      if (timerAlertaRef.current) {
        clearTimeout(timerAlertaRef.current);
      }
    };
  }, [usuarioActual, resetearTimerInactividad]);

  const handleLogoutPorInactividad = () => {
    setMostrarAlertaInactividad(false);
    toast.error('Sesión cerrada por inactividad', {
      description: 'Has estado inactivo durante 15 minutos',
      duration: 5000,
    });

    setUsuarioActual(null);
    setVistaActual('landing');
    handleLogout(false);
    console.log('⏰ Sesión cerrada por inactividad');
  };

  // Handler para mostrar pantalla de login
  const handleLoginClick = () => {
    setCurrentView('login');
    setVistaActual('login');
    navigate('/');
  };

  // ============================================
  // HANDLERS DE NAVEGACIÓN
  // ============================================

  const handleIrALogin = () => {
    setVistaActual('login');
  };

  const handleVolverALanding = () => {
    setVistaActual('landing');
    setUsuarioActual(null);
    localStorage.removeItem('esap-sesion-activa');
  };

  // Handler para login con integración del backend
  const handleLogin = (user: User, accessToken: string, rememberMe?: boolean) => {
    try {
      // console.log('🔐 Login handler called with user:', user);
      // console.log('🔐 Login handler called with roles:', user.roles);
      // console.log('🔐 Login handler called with accessToken:', accessToken);
      // console.log('🔐 Login handler called with rememberMe:', rememberMe);
      user.accessToken = accessToken;
      user.rememberMe = rememberMe || false;

      // Guardar token JWT
      localStorage.setItem('esap_auth_token', accessToken);
      localStorage.setItem('esap_access_token', accessToken);

      // Extraer información del usuario
      const userEmail = user?.person?.email || user?.email || '';
      const userName = user?.person?.first_name
        ? `${user.person.first_name} ${user.person.last_name || ''}`.trim()
        : user?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.username || 'Usuario ESAP';

      console.log('👤 User info extracted:', { userEmail, userName });

      // Determinar tipo de usuario basado en roles del backend
      const roles = user?.roles?.map((role: any) => role.code) || [];
      const permissions = extractPermissionCodes(user);
      const hasAdminRole = roles.includes('ADMIN') || roles.includes('SUPER_ADMIN');
      const hasConfigRole = !(roles.includes('ESTUDIANTE') || roles.includes('DOCENTE') || roles.includes('GRADUADO') || roles.includes('ASPIRANTE'))
      // const hasConfigRole = roles.includes('COORDINADOR_CERT_LABORAL') || roles.includes('CONTROL_DISCIPLINARIO')  || roles.includes('GESTION_LEGAL');

      console.log('🔑 User roles:', roles, 'Has admin role:', hasAdminRole);

      if (hasAdminRole) {
        console.log('🏢 Redirecting to backoffice');
        // Usuario Administrativo → Backoffice
        setUserType('administrativo');
        setIsAuthenticated(true);
        setUserData({
          name: userName,
          email: userEmail,
          personId: user?.person?.id || user?.id,
          modules: user?.modules || [],
          roles,
          permissions
        });
        setUsuarioActual({
          id: user?.id || user?.person?.id || 'unknown',
          nombre: userName,
          email: userEmail,
          tipo: 'interno'
        });
        setUserRoles(['Administrativo']);
        setCurrentView('backoffice');
        setVistaActual('backoffice');
        // toast.success('¡Bienvenido al Backoffice Administrativo!', {
        //   description: `Hola ${userName}`,
        // });
      } else {
        console.log('🎓 Redirecting to portal');
        let vistaActualCurrent: Vista = 'portal'
        // Usuario Estudiante/Graduado/Docente → Portal Transaccional
        // Determinar tipo basado en el email o roles
        const emailLower = userEmail.toLowerCase();
        let userType: UserType = 'estudiante';
        let currentView: AppView = 'portal-transaccional';
        const portalRoles: string[] = [];

        if (hasConfigRole) {
          userType = 'administrativo';
          currentView = 'backoffice'
          vistaActualCurrent = 'backoffice';
          // Verificar si tiene acceso a Control Interno (múltiples roles)
          const hasControlInterno = roles.some((role: string) =>
            ['CONTROL_INTERNO', 'JEFE_OCI', 'PROFESIONAL_AUDITOR', 'AUXILIAR_AUDITORIA', 'CONSULTA',
              'JEFE_CONTROL_INTERNO', 'AUDITOR_LIDER'].includes(role)
          );
          const module = roles.includes('COORDINADOR_CERT_LABORAL') ? 'certificados-laborales'
            : roles.includes('GESTION_LEGAL') ? 'gestion-legal'
              : roles.includes('CONTROL_DISCIPLINARIO') ? 'control-disciplinario'
                : 'control-interno';
          const rolStr = roles.includes('COORDINADOR_CERT_LABORAL') ? 'Coordinador de Certificados Laborales'
            : roles.includes('GESTION_LEGAL') ? 'Gestión Legal'
              : roles.includes('CONTROL_DISCIPLINARIO') ? 'Control Disciplinario'
                : roles.includes('JEFE_OCI') ? 'Jefe de Control Interno'
                  : roles.includes('PROFESIONAL_AUDITOR') ? 'Profesional Auditor'
                    : roles.includes('AUXILIAR_AUDITORIA') ? 'Auxiliar de Auditoría'
                      : roles.includes('CONSULTA') ? 'Consulta Control Interno'
                        : roles.includes('JEFE_CONTROL_INTERNO') ? 'Jefe de Control Interno'
                          : roles.includes('AUDITOR_LIDER') ? 'Auditor Líder'
                            : 'Control Interno';
          const userDataToSave = {
            name: userName,
            email: userEmail,
            personId: user?.person?.id || user?.id,
            modules: user?.modules || [],
            roles,
            permissions,
            module: module // Módulo específico de acceso
          };
          setUserData(userDataToSave);
          // También guardar en esap_user_data para que otros componentes puedan acceder
          localStorage.setItem('esap_user_data', JSON.stringify({
            ...user,
            roles: user?.roles || roles.map((code: string) => ({ code, name: code })),
            permissions
          }));
          portalRoles.push(rolStr);
        } else if (emailLower.includes('docente') || emailLower.includes('profesor') || emailLower.includes('planta') || emailLower.includes('catedra')) {
          userType = 'docente';
          portalRoles.push('Docente');

          // Crear datos simulados para docentes (en producción vendría del backend)
          const userDataWithDetails = {
            name: userName,
            email: userEmail,
            personId: user?.person?.id || user?.id,
            modules: user?.modules || [],
            datos_por_rol: {
              Docente: {
                tipo_vinculacion: emailLower.includes('planta') ? 'Carrera' : emailLower.includes('catedra') ? 'Cátedra' : 'Ocasional',
                dedicacion: emailLower.includes('planta') ? 'Tiempo Completo' : 'Medio Tiempo',
                area: 'Administración Pública',
                codigo_docente: `DOC-${user?.id?.slice(-3).toUpperCase()}`,
                clases_asignadas: emailLower.includes('planta') ? 4 : 2,
                estudiantes_totales: emailLower.includes('planta') ? 112 : 58,
                nivel_educativo: 'Doctorado',
                anos_experiencia: 10,
              }
            },
            roles,
            permissions
          };
          setUserData(userDataWithDetails);
        } else if (emailLower.includes('graduado') || emailLower.includes('egresado')) {
          userType = 'graduado';
          portalRoles.push('Graduado');
          setUserData({
            name: userName,
            email: userEmail,
            personId: user?.person?.id || user?.id,
            modules: user?.modules || [],
            roles,
            permissions
          });
        } else {
          userType = 'estudiante';
          portalRoles.push('Estudiante');
          setUserData({
            name: userName,
            email: userEmail,
            personId: user?.person?.id || user?.id,
            modules: user?.modules || [],
            roles,
            permissions
          });
        }

        setUserType(userType);
        setIsAuthenticated(true);
        setUserRoles(portalRoles);
        setCurrentView(currentView);
        setVistaActual(vistaActualCurrent);
        setUsuarioActual({
          id: user?.id || user?.person?.id || 'unknown',
          nombre: userName,
          email: userEmail,
          tipo: currentView === 'backoffice' ? 'interno' : 'externo'
        });
        toast.success('¡Bienvenido al Portal Transaccional!', {
          description: `Hola ${userName}`,
        });
      }

      // Guardar sesión si rememberMe está activo
      if (rememberMe) {
        localStorage.setItem('esap-remember-session', JSON.stringify({
          email: userEmail,
          token: accessToken
        }));
      }

      localStorage.setItem('esap-sesion-activa', JSON.stringify({
        usuario: {
          id: user?.id || user?.person?.id || 'unknown',
          nombre: userName,
          email: userEmail,
          tipo: (hasAdminRole || currentView === 'backoffice') ? 'interno' : 'externo'
        },
        vista: (hasAdminRole || currentView === 'backoffice') ? 'backoffice' : 'portal',
        timestamp: Date.now(),
        user: {
          id: user?.id,
          email: userEmail,
          person: user?.person,
          roles: user?.roles
        }
      }));

      // Iniciar sistema de detección de inactividad
      resetearTimerInactividad();

      console.log('✅ Login completed successfully');
    } catch (error) {
      console.error('❌ Error in handleLogin:', error);
      // Mostrar error pero no recargar la página
      alert('Error al procesar el login. Revisa la consola para más detalles.');
    }
  };

  // Handler para logout (desde cualquier ambiente)
  const handleLogout = (viewToast = true) => {
    localStorage.clear();
    if (viewToast) {
      toast.success('Sesión cerrada exitosamente', {
        description: 'Has cerrado sesión de forma segura',
      });
    }
    setIsAuthenticated(false);
    setUserType('portal');
    setUserRoles([]);
    setUserData(null);
    setCurrentView('landing');
    setVistaActual('landing');
    // Limpiar timers
    if (timerInactividadRef.current) {
      clearTimeout(timerInactividadRef.current);
    }
    if (timerAlertaRef.current) {
      clearTimeout(timerAlertaRef.current);
    }
    setMostrarAlertaInactividad(false);
  };

  // Handler para volver al home desde login
  const handleBackToHome = () => {
    setCurrentView('landing');
    setVistaActual('landing');
    navigate('/');
  };

  // Handler para selección de sistema (Super Users)
  const handleSelectSystem = (system: 'backoffice' | 'portal') => {
    if (system === 'backoffice') {
      setCurrentView('backoffice');
    } else {
      setCurrentView('portal-transaccional');
    }
  };

  // Handler para cambio directo de sistema (sin pasar por selector)
  const handleSystemChange = (system: 'backoffice' | 'portal') => {
    console.log('🔄 System change requested:', system);
    if (system === 'backoffice') {
      setCurrentView('backoffice');
      setUserType('administrativo');
    } else {
      setCurrentView('portal-transaccional');
      // Para Super Users que van al Portal, necesitan tener un userType válido
      // y roles del Portal para que el PortalDashboard funcione
      if (userType === 'administrativo') {
        setUserType('docente');

        // Si el usuario solo tiene roles administrativos, agregar rol de Docente
        const hasPortalRole = userRoles.some(role =>
          ['Estudiante', 'Docente', 'Graduado', 'Aspirante'].includes(role)
        );

        if (!hasPortalRole) {
          // Agregar rol de Docente para Super Users
          setUserRoles([...userRoles, 'Docente']);

          // Actualizar userData con datos de Docente
          setUserData({
            ...userData,
            datos_por_rol: {
              Docente: {
                tipo_vinculacion: 'Carrera',
                dedicacion: 'Tiempo Completo',
                area: 'Administración Pública y Gestión Territorial',
                codigo_docente: 'DOC-ADMIN-001',
                clases_asignadas: 0,
                estudiantes_totales: 0,
                nivel_educativo: 'Doctorado',
                anos_experiencia: 15,
                funciones_administrativas: ['Dirección', 'Rectoría'],
                investigacion_activa: true,
              }
            }
          });
        }
      }
    }
  };

  // Handler para volver al selector de sistema (Super Users)
  const handleBackToSystemSelector = () => {
    setCurrentView('system-selector');
  };

  // Handler para navegación desde Landing
  const handleNavigate = (section: string) => {
    console.log('Navigate to section:', section);

    // Servicios públicos - cambiar vista
    if (section === 'enrollment-qr') {
      setCurrentView('enrollment-qr');
      return;
    }

    if (section === 'vinculaciones') {
      setCurrentView('vinculaciones');
      return;
    }

    if (section === 'verificacion') {
      setCurrentView('verificacion');
      return;
    }

    if (section === 'solicitar-certificados-laborales') {
      setCurrentView('solicitar-certificados-laborales');
      setVistaActual('solicitar-certificados-laborales');
      navigate('/solicitar-certificado-laboral');
      return;
    }

    if (section === 'solicitar-certificados-graduados') {
      setCurrentView('solicitar-certificados-graduados');
      setVistaActual('solicitar-certificados-graduados');
      navigate('/certificacion-titulos-graduados');
      return;
    }

    if (section === 'convocatorias-docentes') {
      setCurrentView('convocatorias-docentes');
      return;
    }

    // Si la sección es login/portal, ir al login
    if (section === 'portal' || section === 'login') {
      handleLoginClick();
      return;
    }

    // Otras secciones: scroll en landing page
    const element = document.getElementById(section);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleContinuarSesion = () => {
    setMostrarAlertaInactividad(false);
    resetearTimerInactividad();
    toast.success('Sesión extendida', {
      description: 'Has renovado tu sesión exitosamente',
    });
  };

  // ============================================
  // RENDERIZADO CONDICIONAL POR VISTA
  // ============================================

  const renderVista = () => {
    switch (vistaActual) {
      case 'landing':
        return renderViewLanding();

      case 'solicitar-certificados-laborales':
        return <SolicitarCertificadoLaboral onBack={handleBackToHome} onLoginClick={handleLoginClick} />;

      case 'solicitar-certificados-graduados':
        return <PublicTitleVerification onBack={handleBackToHome} onLoginClick={handleLoginClick} />;

      case 'login':
        return (
          <LoginPage
            onLogin={handleLogin}
            onBackToHome={handleBackToHome}
          />
        );

      case 'portal':
        // Determinar roles según el email del usuario
        const portalRoles = usuarioActual?.email === 'gestion.profesoral@esap.edu.co'
          ? ['Docente']
          : usuarioActual?.email === 'estudiantes@esap.edu.co'
            ? ['Estudiante']
            : usuarioActual?.email === 'funcionario@esap.edu.co'
              ? ['Administrativo']
              : ['Estudiante']; // Default

        const teacherData = usuarioActual?.email === 'gestion.profesoral@esap.edu.co'
          ? {
            tipo_vinculacion: 'Carrera',
            dedicacion: 'Tiempo Completo',
            area: 'Administración Pública',
            codigo_docente: 'DOC-GP-001',
            clases_asignadas: 5,
            estudiantes_totales: 120,
            nivel_educativo: 'Doctorado',
            anos_experiencia: 12,
          }
          : undefined;

        const adminData = usuarioActual?.email === 'funcionario@esap.edu.co'
          ? {
            area: 'Planeación',
            cargo: 'Funcionario Administrativo',
            dependencia: 'Oficina de Control Interno',
            codigo_empleado: 'FUNC-001',
            solicitudes_pendientes: 5,
            reportes_generados: 12
          }
          : undefined;

        console.log('📊 Datos para Portal Dashboard:', {
          userName: usuarioActual!.nombre,
          userEmail: usuarioActual!.email,
          userRoles: portalRoles,
          adminData
        });

        return (
          <PortalDashboard
            userName={usuarioActual!.nombre}
            userEmail={usuarioActual!.email}
            userPersonId={usuarioActual!.id}
            userRoles={portalRoles}
            userData={{
              rol_principal: portalRoles[0],
              datos_por_rol: {
                Docente: teacherData,
                Administrativo: adminData
              }
            }}
            onLogout={handleLogout}
          />
        );

      case 'backoffice':
        // Determinar si el usuario tiene acceso restringido a un módulo específico
        // const userData = usuarioActual?.email === 'OCIG@esap.edu.co' || usuarioActual?.email === 'ocig@esap.edu.co'
        //   ? { name: usuarioActual.nombre, email: usuarioActual.email, personId: 'ci-001', restrictedAccess: true, module: 'control-interno' }
        //   : usuarioActual?.email === 'c.disciplinario@esap.edu.co'
        //   ? { name: usuarioActual.nombre, email: usuarioActual.email, personId: 'cd-001', restrictedAccess: true, module: 'control-disciplinario' }
        //   : usuarioActual?.email === 'registro.academico@esap.edu.co'
        //   ? { name: usuarioActual.nombre, email: usuarioActual.email, personId: 'ra-001', restrictedAccess: true, module: 'registro-academico' }
        //   : usuarioActual?.email === 'cerlaboral@esap.edu.co'
        //   ? { name: usuarioActual.nombre, email: usuarioActual.email, personId: 'cl-001', restrictedAccess: true, module: 'certificados-laborales' }
        //   : usuarioActual?.email === 'arqempresarial@esap.edu.co' || usuarioActual?.email === 'ar.empresarial@esap.edu.co'
        //   ? { name: usuarioActual.nombre, email: usuarioActual.email, personId: 'ae-001', restrictedAccess: true, module: 'arquitectura-empresarial' }
        //   : usuarioActual?.email === 'gestion.legal@esap.edu.co'
        //   ? { name: usuarioActual.nombre, email: usuarioActual.email, personId: 'gl-001', restrictedAccess: true, module: 'gestion-legal' }
        //   : usuarioActual?.email === 'gestion.profesoral@esap.edu.co'
        //   ? { name: usuarioActual.nombre, email: usuarioActual.email, personId: 'gp-001', restrictedAccess: true, module: 'gestion-profesoral' }
        //   : usuarioActual?.email === 'funcionario@esap.edu.co'
        //   ? { name: usuarioActual.nombre, email: usuarioActual.email, personId: 'func-001', restrictedAccess: true, module: 'procesos' }
        //   : usuarioActual?.email === 'superuser@esap.edu.co'
        //   ? { name: usuarioActual.nombre, email: usuarioActual.email, personId: 'super-001', hasBothSystemsAccess: true } // ✅ Acceso dual Backoffice + Portal
        //   : undefined;

        return (
          <BackofficeApp
            // usuario={usuarioActual!}
            onLogout={handleLogout}
            onBackToSystemSelector={handleBackToSystemSelector}
            onSystemChange={(system) => {
              if (system === 'portal') {
                setVistaActual('portal');
                toast.success('Cambiado al Portal Transaccional');
              }
            }}
            userData={userData}
            userRoles={userRoles}
          />
        );

      case 'pta-demo':
        return (
          <GestionProfesoralApp
            usuario={usuarioActual as any}
            onLogout={handleLogout}
          />
        );

      // case 'password-demo':
      //   return <DemoPasswordStrength />;

      case 'procesos-coactivos-demo':
        // return <DemoReprogramacionAudiencia />;
        return <DemoProcesosCoactivos />;

      default:
        return <LandingPage onLoginClick={handleLoginClick} onNavigate={handleNavigate} />;
    }
  };

  const renderViewLanding = () => {
    switch (currentView) {
      case 'solicitar-certificados-laborales':
        return <SolicitarCertificadoLaboral onBack={handleBackToHome} onLoginClick={handleLoginClick} />
      case 'solicitar-certificados-graduados':
        return <PublicTitleVerification onBack={handleBackToHome} onLoginClick={handleLoginClick} />
      case 'enrollment-qr':
        return (
          <EnrollmentQRLandingUnified
            onBeginActivation={() => {
              // En producción iniciaría el flujo de activación
              console.log('Iniciando proceso de enrolamiento');
            }}
            onBackToHome={handleBackToHome}
          />
        );
      case 'vinculaciones':
        return <VinculacionForm onBack={handleBackToHome} />;
      case 'verificacion':
        return <PublicTitleVerification onBack={handleBackToHome} onLoginClick={handleLoginClick} />;

      default:
        return <LandingPage onLoginClick={handleLoginClick} onNavigate={handleNavigate} />;
    }
  };

  return (
    <NotificacionesProvider>
      <ErrorBoundary>
        <style>{`
        [data-sonner-toaster] { 
          position: fixed !important; 
          top: 20px !important; 
          right: 20px !important; 
          bottom: auto !important;
          left: auto !important;
          z-index: 100010 !important; 
        }
        [data-sonner-toast] { 
          background: white !important; 
          border: 1px solid #e5e7eb !important; 
          border-radius: 12px !important; 
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15) !important; 
          padding: 16px !important; 
          animation: slideIn 0.3s ease-out !important;
        }
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        [data-sonner-toast][data-type=\"success\"] { border-left: 4px solid #10b981 !important; }
        [data-sonner-toast][data-type=\"error\"] { border-left: 4px solid #ef4444 !important; }
        [data-sonner-toast][data-type=\"warning\"] { border-left: 4px solid #f59e0b !important; }
        [data-sonner-toast][data-type=\"info\"] { border-left: 4px solid #3b82f6 !important; }
        [data-title] { font-weight: 600 !important; color: #111827 !important; font-size: 14px !important; }
        [data-description] { color: #6b7280 !important; font-size: 13px !important; margin-top: 4px !important; }
      `}</style>

        <Routes>
          <Route
            path="/verificar-certificado-graduado"
            element={<ValidarCertificadoGraduado onVolver={() => navigate('/')} />}
          />
          <Route
            path="/certificacion-titulos-graduados"
            element={<PublicTitleVerification onBack={() => navigate('/')} onLoginClick={handleLoginClick} />}
          />
          <Route
            path="/solicitar-certificado-graduado"
            element={<Navigate to="/certificacion-titulos-graduados" replace />}
          />
          <Route
            path="/verificar-certificado/:codigo"
            element={<VerificarCertificadoPublico />}
          />
          <Route
            path="/validar/:codigo"
            element={<VerificarCertificadoPublico />}
          />
          <Route
            path="/editor-plantillas"
            element={<EditorPlantillasPage />}
          />
          <Route
            path="/expediente-compartido/:token"
            element={<ExpedienteCompartidoPage />}
          />
          <Route path="*" element={renderVista()} />
        </Routes>

        {/* Modal de Alerta de Inactividad */}
        {mostrarAlertaInactividad && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6 animate-in zoom-in-95 duration-300">
              {/* Header */}
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    ⚠️ Inactividad Detectada
                  </h3>
                  <p className="text-sm text-gray-600">
                    Tu sesión está por expirar
                  </p>
                </div>
              </div>

              {/* Contenido */}
              <div className="mb-6">
                <div className="flex items-center gap-3 p-4 bg-orange-50 border border-orange-200 rounded-xl mb-4">
                  <Clock className="w-5 h-5 text-orange-600 flex-shrink-0" />
                  <p className="text-sm text-gray-700">
                    Has estado <strong>inactivo durante 14 minutos</strong>. Tu sesión se cerrará automáticamente en <strong className="text-orange-600">1 minuto</strong> por seguridad.
                  </p>
                </div>
                <p className="text-sm text-gray-600">
                  ¿Deseas continuar con tu sesión activa?
                </p>
              </div>

              {/* Botones */}
              <div className="flex gap-3">
                <button
                  onClick={() => handleLogout()}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-medium"
                >
                  Cerrar Sesión
                </button>
                <button
                  onClick={handleContinuarSesion}
                  className="flex-1 px-4 py-3 bg-[#003DA5] text-white rounded-xl hover:bg-[#002870] transition-all font-medium shadow-lg"
                >
                  Continuar Sesión
                </button>
              </div>
            </div>
          </div>
        )}

        <Toaster position="top-right" richColors expand={true} />
      </ErrorBoundary>
    </NotificacionesProvider >
  );

}
