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
// import { DemoReprogramacionAudiencia } from './components/esap/gestion-legal/modulos/DemoReprogramacionAudiencia';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';
import { AlertTriangle, Clock } from 'lucide-react';
import { authService } from './services/api/authService';
import { config } from './config/environment';
import { NotificacionesProvider } from './contexts/NotificacionesContext';
import { EditorPlantillasPage } from './pages/EditorPlantillasPage';
import { ExpedienteCompartidoPage } from './pages/ExpedienteCompartidoPage';
import { getAppOnlineStatus } from './utils/connectivity';


// Importar componentes de servicios públicos
import { EnrollmentQRLandingUnified } from './components/portal/EnrollmentQRLandingUnified';
import { VinculacionForm } from './components/portal/VinculacionForm';
import { PublicTitleVerification } from './components/portal/PublicTitleVerification';

const LEGACY_DISCIPLINARY_ROLES = new Set([
  'CONTROL_DISCIPLINARIO',
  'RADICADOR_DISCIPLINARIO',
  'SECRETARIO_DISCIPLINARIO',
  'SECRETARIA_RADICADOR',
  'OPERADOR_DISCIPLINARIO',
  'ABOGADO_DISCIPLINARIO',
  'JEFE_OCID',
  'JEFE_DE_LA_OCID',
  'PROFESIONAL_SUSTANCIADOR',
  'PROFESIONAL_ASIGNADO',
  'PROFESIONAL',
]);

function hasDisciplinaryAccess(roles: string[]): boolean {
  return roles.some(role =>
    LEGACY_DISCIPLINARY_ROLES.has(role) ||
    role.includes('DISCIPLINARIO') ||
    role.includes('OCID')
  );
}
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
 * - Persistencia de sesión en sessionStorage
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
  usuario?: Usuario;
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
  const directCodes = Array.isArray(user?.permissions)
    ? user.permissions
        .map((permission: any) => (typeof permission === 'string' ? permission : permission?.code))
        .filter(Boolean)
    : [];

  const roleCodes = Array.isArray(user?.roles)
    ? user.roles.flatMap((role: any) =>
        Array.isArray(role?.permissions)
          ? role.permissions
              .map((perm: any) => (typeof perm === 'string' ? perm : perm?.code))
              .filter(Boolean)
          : []
      )
    : [];

  return Array.from(new Set([...directCodes, ...roleCodes]));
};

/**
 * Determina destino del usuario a partir del campo `sistema_destino` del rol.
 * Valores posibles: 'Portal' | 'Backoffice' | 'Ambos'
 * Si el usuario tiene roles con distintos destinos, 'Ambos' tiene precedencia.
 */
function resolveDestino(user: any): {
  destino: 'portal' | 'backoffice' | 'ambos';
  hasBoth: boolean;
  roleCodes: string[];
  roleNames: string[];
  roleObjects: any[];
  permissions: string[];
  module?: string;
} {
  const roleObjects: any[] = Array.isArray(user?.roles) ? user.roles : [];
  const roleCodes = roleObjects.map((r: any) => (typeof r === 'string' ? r : r?.code)).filter(Boolean);
  const permissions = extractPermissionCodes(user);

  // Leer sistema_destino de cada rol
  const destinos = roleObjects
    .map((r: any) => (typeof r === 'object' ? (r?.sistema_destino || '').toLowerCase() : ''))
    .filter(Boolean);

  let destino: 'portal' | 'backoffice' | 'ambos' = 'portal'; // default
  if (destinos.includes('ambos')) {
    destino = 'ambos';
  } else if (destinos.includes('backoffice') && destinos.includes('portal')) {
    destino = 'ambos';
  } else if (destinos.includes('backoffice')) {
    destino = 'backoffice';
  } else if (destinos.includes('portal')) {
    destino = 'portal';
  }

  // Si ningún rol tiene sistema_destino, usar fallback por código
  if (!destinos.length) {
    const isAdmin = roleCodes.includes('ADMIN') || roleCodes.includes('SUPER_ADMIN');
    const isPortalOnly = roleCodes.some(c => ['ESTUDIANTE', 'DOCENTE', 'GRADUADO', 'ASPIRANTE', 'USUARIO_AUDITADO'].includes(c));
    if (isAdmin) destino = 'backoffice';
    else if (!isPortalOnly) destino = 'backoffice';
    else destino = 'portal';
  }

  // Nombres de rol para mostrar en el portal/backoffice
  const roleNames = roleObjects
    .map((r: any) => (typeof r === 'object' ? r?.code : null))
    .filter(Boolean) as string[];

  // Módulo principal para backoffice
  const hasGestionLegal = roleCodes.some(c => ['GESTION_LEGAL', 'JEFE_GESTION_LEGAL', 'MONITOREO_GESTION_LEGAL', 'SECRETARIADO_GESTION_LEGAL', 'RESUELVE_GESTION_LEGAL'].includes(c));
  const hasControlInterno = roleCodes.some(c => ['CONTROL_INTERNO', 'JEFE_OCI', 'PROFESIONAL_AUDITOR', 'AUXILIAR_AUDITORIA', 'JEFE_CONTROL_INTERNO', 'AUDITOR_LIDER'].includes(c));
  const module = roleCodes.includes('COORDINADOR_CERT_LABORAL') ? 'certificados-laborales'
    : hasGestionLegal ? 'gestion-legal'
    : hasDisciplinaryAccess(roleCodes) ? 'control-disciplinario'
    : hasControlInterno ? 'control-interno'
    : undefined;

  return { destino, hasBoth: destino === 'ambos', roleCodes, roleNames, roleObjects, permissions, module };
}

// Configuración de timeout (15 minutos en milisegundos)
const TIMEOUT_INACTIVIDAD = 15 * 60 * 1000; // 15 minutos
const AUTH_TOKEN_STORAGE_KEYS = [
  config.STORAGE_KEYS.AUTH_TOKEN,
  'esap_access_token',
  config.STORAGE_KEYS.REFRESH_TOKEN,
  'token',
  'esap-auth-token',
];
const USER_DATA_STORAGE_KEY = config.STORAGE_KEYS.USER_DATA;
const ACTIVE_SESSION_STORAGE_KEY = 'esap-sesion-activa';
/** Persiste la elección manual del usuario (portal ↔ backoffice) entre recargas */
const SYSTEM_OVERRIDE_KEY = 'esap-system-override';
const SENSITIVE_SESSION_STORAGE_KEYS = [
  USER_DATA_STORAGE_KEY,
];
const CLEAR_SESSION_STATE_STORAGE_KEYS = [
  USER_DATA_STORAGE_KEY,
  ACTIVE_SESSION_STORAGE_KEY,
  SYSTEM_OVERRIDE_KEY,
];

function migrateAuthTokensToSessionStorage() {
  // OTIC-001: los tokens ya no se almacenan en sessionStorage ni localStorage.
  // Solo limpiamos residuos de versiones anteriores.
  for (const key of AUTH_TOKEN_STORAGE_KEYS) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }

  const rememberedSession = localStorage.getItem('esap-remember-session');
  if (!rememberedSession) return;

  try {
    const parsed = JSON.parse(rememberedSession);
    if (parsed?.token || parsed?.accessToken || parsed?.refreshToken) {
      delete parsed.token;
      delete parsed.accessToken;
      delete parsed.refreshToken;
      localStorage.setItem('esap-remember-session', JSON.stringify(parsed));
    }
  } catch {
    localStorage.removeItem('esap-remember-session');
  }
}

function migrateSensitiveSessionDataToSessionStorage() {
  // OTIC-002: datos sensibles del usuario ya no se almacenan en sessionStorage/localStorage.
  // Solo limpiamos residuos de versiones anteriores.
  for (const key of SENSITIVE_SESSION_STORAGE_KEYS) {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
  }
}

function clearSensitiveSessionState() {
  for (const key of CLEAR_SESSION_STATE_STORAGE_KEYS) {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
  }
}


const TIEMPO_ALERTA = 1 * 60 * 1000; // 1 minuto antes de cerrar sesión

function DemoNoDisponible({ title }: { title: string }) {
  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        <p className="mt-3 text-sm text-slate-600">
          Esta vista demo no fue migrada al shell. Revise el MFE correspondiente.
        </p>
      </div>
    </div>
  );
}

export default function App() {
  // DEMO MODE: Cambiar a false para ver aplicativo completo
  const isDemoMode = false;

  const navigate = useNavigate();

  if (isDemoMode) {
    return (
      <>
        <DemoNoDisponible title="Demo de Control Disciplinario" />
        <Toaster
          position="bottom-right"
          richColors
          closeButton
          duration={4000}
        />
      </>
    );
  }

  const [isOnline, setIsOnline] = useState(getAppOnlineStatus);
  const [currentView, setCurrentView] = useState<AppView>('landing');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userData, setUserData] = useState<any>({ name: '', email: '', personId: '', modules: [], roles: [], permissions: [] });
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [userType, setUserType] = useState<UserType>('portal');
  const [activeRole, setActiveRole] = useState<string>('Estudiante');

  // const [vistaActual, setVistaActual] = useState<Vista>('landing');
  // Leer parámetros desde URL
  const urlParams = new URLSearchParams(window.location.search);
  const viewParam = urlParams.get('view') as Vista | null;
  const hasMicrosoftOAuthCallback = urlParams.has('code') || urlParams.has('error');

  // Si Microsoft retorna con ?code= o ?error=, forzar vista de login para procesar callback
  const [vistaActual, setVistaActual] = useState<Vista>(
    viewParam || (hasMicrosoftOAuthCallback ? 'login' : 'landing'),
  );
  const [usuarioActual, setUsuarioActual] = useState<Usuario | null>(null);
  const [mostrarAlertaInactividad, setMostrarAlertaInactividad] = useState(false);
  // OTIC-002: true mientras se verifica la cookie con el backend al recargar
  const [isRestoringSession, setIsRestoringSession] = useState(true);

  const timerInactividadRef = useRef<NodeJS.Timeout | null>(null);
  const timerAlertaRef = useRef<NodeJS.Timeout | null>(null);

  // ============================================
  // PERSISTENCIA DE SESIÓN
  // ============================================

  // Detector de conexión a internet
  useEffect(() => {
    const refreshOnlineStatus = () => setIsOnline(getAppOnlineStatus());

    refreshOnlineStatus();
    window.addEventListener('online', refreshOnlineStatus);
    window.addEventListener('offline', refreshOnlineStatus);
    window.addEventListener('focus', refreshOnlineStatus);
    document.addEventListener('visibilitychange', refreshOnlineStatus);

    return () => {
      window.removeEventListener('online', refreshOnlineStatus);
      window.removeEventListener('offline', refreshOnlineStatus);
      window.removeEventListener('focus', refreshOnlineStatus);
      document.removeEventListener('visibilitychange', refreshOnlineStatus);
    };
  }, []);

  // Cargar sesión guardada al iniciar
  useEffect(() => {
    // No restaurar sesión para rutas públicas de expediente compartido
    if (window.location.pathname.startsWith('/expediente-compartido/')) {
      setIsRestoringSession(false);
      return;
    }
    // Priorizar procesamiento de callback OAuth de Microsoft antes de restaurar sesión local
    if (hasMicrosoftOAuthCallback) {
      setIsRestoringSession(false);
      return;
    }

    const applySessionFromUser = (user: any) => {
      const userEmail = user?.person?.email || user?.email || '';
      const userName = user?.person?.first_name
        ? `${user.person.first_name} ${user.person.last_name || ''}`.trim()
        : user?.fullName || user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.username || 'Usuario ESAP';

      const { destino, hasBoth, roleCodes, roleNames, permissions, module } = resolveDestino(user);

      const portalRoles = roleNames.length > 0 ? roleNames : (destino !== 'backoffice' ? ['Estudiante'] : ['Administrativo']);

      // Respetar la elección manual del usuario si tiene acceso a ambos sistemas
      const savedOverride = sessionStorage.getItem(SYSTEM_OVERRIDE_KEY) as 'portal' | 'backoffice' | null;
      const effectiveDestino = (hasBoth && savedOverride) ? savedOverride : (destino === 'ambos' ? 'backoffice' : destino);

      const goToBackoffice = effectiveDestino === 'backoffice';
      const nextView: Vista = goToBackoffice ? 'backoffice' : 'portal';
      const nextCurrentView: AppView = goToBackoffice ? 'backoffice' : 'portal-transaccional';

      setIsAuthenticated(true);
      setUserType(goToBackoffice ? 'administrativo' : 'portal');
      setUserRoles(portalRoles);
      setCurrentView(nextCurrentView);
      setVistaActual(nextView);
      setUserData({
        name: userName,
        email: userEmail,
        personId: user?.person?.id || user?.id || user?.userId,
        modules: user?.modules || [],
        roles: roleCodes,
        permissions,
        module,
        hasBothSystemsAccess: hasBoth,
      });
      setUsuarioActual({
        id: user?.id || user?.person?.id || user?.userId || 'unknown',
        nombre: userName,
        email: userEmail,
        tipo: goToBackoffice ? 'interno' : 'externo'
      });
    };

    migrateAuthTokensToSessionStorage();
    migrateSensitiveSessionDataToSessionStorage();

    // Limpiar cualquier token residual de versiones anteriores (OTIC-001)
    AUTH_TOKEN_STORAGE_KEYS.forEach((key) => {
      sessionStorage.removeItem(key);
      localStorage.removeItem(key);
    });

    // OTIC-002: los datos de usuario ya no se guardan en sessionStorage.
    // Usamos ACTIVE_SESSION_STORAGE_KEY solo como señal de que hubo sesión,
    // y verificamos con el backend para restaurar los datos de usuario.
    const sesionGuardada = sessionStorage.getItem(ACTIVE_SESSION_STORAGE_KEY);

    // Si esta pestana no tiene senal de sesion, no consultar /verify.
    // Evita un 401 esperado antes del login sin exponer ni guardar tokens en JS.
    if (!sesionGuardada) {
      setIsRestoringSession(false);
      return;
    }

    (async () => {
      try {
        // Si hay señal de sesión y el timeout de inactividad ya pasó, cerrar sin llamar al backend
        if (sesionGuardada) {
          const sesionParsed = JSON.parse(sesionGuardada);
          const tiempoTranscurrido = Date.now() - (sesionParsed.timestamp || 0);
          if (tiempoTranscurrido >= TIMEOUT_INACTIVIDAD) {
            clearSensitiveSessionState();
            console.log('⏰ Sesión expirada');
            setIsRestoringSession(false);
            return;
          }
        }
        // Verificar con el backend solo si hubo sesion previa en esta pestana.
        const user = await authService.verifyToken();
        authService.setCurrentUserCache(user as any);
        applySessionFromUser(user);
        console.log('✅ Sesión restaurada desde backend');
      } catch {
        // Cookie inexistente, expirada o inválida
        if (sesionGuardada) {
          toast.error('Sesión ha expirado', {
            description: 'Por seguridad la sesión se ha cerrado',
            duration: 5000,
          });
        }
        clearSensitiveSessionState();
      } finally {
        setIsRestoringSession(false);
      }
    })();
  }, []);

  // Guardar sesión cuando cambie el usuario o vista
  useEffect(() => {
    if (isRestoringSession) {
      return;
    }

    if (usuarioActual && (vistaActual === 'portal' || vistaActual === 'backoffice')) {
      const sesion: SesionGuardada = {
        vista: vistaActual,
        timestamp: Date.now(),
      };
      sessionStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, JSON.stringify(sesion));
      localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
    } else {
      sessionStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
      localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
    }
  }, [usuarioActual, vistaActual, isRestoringSession]);

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
      return;
    }

    // Expediente compartido: no restaurar sesión, ir directamente a la página pública
    if (window.location.pathname.startsWith('/expediente-compartido/')) {
      // No restaurar sesión para rutas públicas de expediente compartido
      // Esto permite ver el expediente sin necesidad de login
      return;
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
    sessionStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
    localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
  };

  // Handler para login con integración del backend
  const handleLogin = (user: User, _accessToken: string, rememberMe?: boolean) => {
    try {
      authService.setCurrentUserCache(user as any);

      const userEmail = user?.person?.email || user?.email || '';
      const userName = user?.person?.first_name
        ? `${user.person.first_name} ${user.person.last_name || ''}`.trim()
        : user?.fullName || user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.username || 'Usuario ESAP';

      console.log('👤 User info extracted:', { userEmail, userName });

      // ── Usar sistema_destino del rol para decidir dónde va el usuario ──
      const { destino, hasBoth, roleCodes, roleNames, permissions, module } = resolveDestino(user);
      console.log('🔑 User roles:', roleCodes, '| sistema_destino resuelto:', destino, '| hasBoth:', hasBoth);

      const goToBackoffice = destino === 'backoffice' || destino === 'ambos';
      const vistaActualNext: Vista = goToBackoffice ? 'backoffice' : 'portal';
      const currentViewNext: AppView = goToBackoffice ? 'backoffice' : 'portal-transaccional';

      // Nombres de rol para el Portal (RoleSelector)
      const portalRoles = roleNames.length > 0 ? roleNames : (goToBackoffice ? ['Administrativo'] : ['Estudiante']);

      setUserType(goToBackoffice ? 'administrativo' : 'portal');
      setIsAuthenticated(true);
      setUserData({
        name: userName,
        email: userEmail,
        personId: user?.person?.id || user?.id || (user as any)?.userId,
        modules: (user as any)?.modules || [],
        roles: roleCodes,
        permissions,
        module,
        hasBothSystemsAccess: hasBoth,
      });
      setUsuarioActual({
        id: user?.id || user?.person?.id || (user as any)?.userId || 'unknown',
        nombre: userName,
        email: userEmail,
        tipo: goToBackoffice ? 'interno' : 'externo'
      });
      setUserRoles(portalRoles);
      setCurrentView(currentViewNext);
      setVistaActual(vistaActualNext);

      toast.success(goToBackoffice ? '¡Bienvenido al Backoffice!' : '¡Bienvenido al Portal!', {
        description: `Hola ${userName}`,
      });

      if (rememberMe) {
        localStorage.setItem('esap-remember-session', JSON.stringify({ email: userEmail }));
      }
      sessionStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, JSON.stringify({
        vista: vistaActualNext,
        timestamp: Date.now(),
      }));
      localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
      resetearTimerInactividad();
      console.log('✅ Login completed successfully');
    } catch (error) {
      console.error('❌ Error in handleLogin:', error);
      alert('Error al procesar el login. Revisa la consola para más detalles.');
    }
  };

  // Handler para logout (desde cualquier ambiente)
  const handleLogout = (viewToast = true) => {
    // Limpiar la cookie HttpOnly en el backend (OTIC-001)
    authService.logout().catch(() => {/* el servidor puede estar caído; la cookie expira sola */});
    delete (window as any).__esap_auth_cache;
    window.dispatchEvent(new CustomEvent('esap:auth-user-changed', { detail: { user: null } }));
    localStorage.clear();
    AUTH_TOKEN_STORAGE_KEYS.forEach((key) => sessionStorage.removeItem(key));
    clearSensitiveSessionState();
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
    // Persistir la elección del usuario para que sobreviva recargas
    sessionStorage.setItem(SYSTEM_OVERRIDE_KEY, system);
    if (system === 'backoffice') {
      setVistaActual('backoffice');
      setCurrentView('backoffice');
      setUserType('administrativo');
    } else {
      setVistaActual('portal');
      setCurrentView('portal-transaccional');
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
      case 'portal-transaccional': {
        // Usar los roles y permisos reales del login (no hardcoded por email)
        const activePortalRoles = userRoles.length > 0 ? userRoles : ['Estudiante'];
        // hasBothSystemsAccess viene de resolveDestino() guardado en userData
        const hasBothAccess = userData?.hasBothSystemsAccess ?? false;

        return (
          <PortalDashboard
            userName={usuarioActual!.nombre}
            userEmail={usuarioActual!.email}
            userPersonId={usuarioActual!.id}
            userRoles={activePortalRoles}
            userPermissions={userData?.permissions || []}
            userData={userData}
            onLogout={handleLogout}
            hasBothSystemsAccess={hasBothAccess}
            onSystemChange={handleSystemChange}
            onActiveRoleChange={(role) => setActiveRole(role)}
          />
        );
      }


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
            key={[
              userData?.personId || usuarioActual?.id || 'anon',
              ...(userData?.roles || []),
              ...(userData?.permissions || []),
            ].join(':')}
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
        return <DemoNoDisponible title="Demo de Procesos Coactivos" />;

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
          bottom: 20px !important; 
          right: 20px !important; 
          top: auto !important;
          left: auto !important;
          z-index: 100010 !important; 
        }
        [data-sonner-toast] { 
          background: white !important; 
          border: 1px solid #e5e7eb !important; 
          border-radius: 8px !important; 
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08) !important; 
          padding: 10px 14px !important; 
          width: 320px !important;
          max-width: 100% !important;
          animation: slideInBottom 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        @keyframes slideInBottom {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        [data-sonner-toast][data-type=\"success\"] { border-left: 4px solid #10b981 !important; }
        [data-sonner-toast][data-type=\"error\"] { border-left: 4px solid #ef4444 !important; }
        [data-sonner-toast][data-type=\"warning\"] { border-left: 4px solid #f59e0b !important; }
        [data-sonner-toast][data-type=\"info\"] { border-left: 4px solid #3b82f6 !important; }
        [data-title] { font-weight: 600 !important; color: #111827 !important; font-size: 12px !important; }
        [data-description] { color: #4b5563 !important; font-size: 11px !important; margin-top: 2px !important; }
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
          <Route path="*" element={isRestoringSession ? (
            <div className="min-h-screen flex items-center justify-center bg-white">
              <div className="text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto mb-3" />
                <p className="text-sm text-slate-500">Verificando sesión...</p>
              </div>
            </div>
          ) : renderVista()} />
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

      <Toaster position="bottom-right" richColors expand={true} closeButton />

        {/* INDICADOR GLOBAL DE MODO OFFLINE */}
        {!isOnline && (
          <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-orange-500 text-white p-2 text-center text-sm font-medium flex items-center justify-center gap-2 shadow-lg animate-in slide-in-from-bottom-2">
            <AlertTriangle className="w-4 h-4" />
            Sin conexión a internet. Estás en modo offline. Los cambios se guardarán localmente y se sincronizarán al reconectar.
          </div>
        )}
      </ErrorBoundary>
    </NotificacionesProvider >
  );

}
