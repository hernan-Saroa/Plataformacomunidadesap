import { useState, useEffect, useCallback, useRef } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LandingPage } from './components/portal/LandingPage';
import { LoginPage } from './components/portal/LoginPage';
import { PortalDashboard } from './components/portal/PortalDashboard';
import { BackofficeApp } from './components/esap/BackofficeApp';
import { GestionProfesoralApp } from './components/gestion-profesoral/GestionProfesoralApp';
import { DemoPasswordStrength } from './components/esap/admin/DemoPasswordStrength';
import { DemoProcesosCoactivos } from './components/esap/gestion-legal/DemoProcesosCoactivos';
import { DemoEdicionFotoPerfil } from './components/esap/control-interno/DemoEdicionFotoPerfil';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner@2.0.3';
import { AlertTriangle, Clock } from 'lucide-react';

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
 * DEMO ESPECIAL:
 * - Vista 'pta-demo': Visualizador de PTA con Ajustes Solicitados
 * - Vista 'password-demo': Demo de Validación de Contraseñas
 * - Vista 'procesos-coactivos-demo': Demo de Procesos Coactivos
 * - Vista 'edicion-foto-perfil-demo': Demo de Edición de Foto de Perfil
 * 
 * Features:
 * - Persistencia de sesión en localStorage
 * - Auto-logout por inactividad (15 minutos)
 * - Alerta previa antes de cerrar sesión
 */

type Vista = 'landing' | 'login' | 'portal' | 'backoffice' | 'pta-demo' | 'password-demo' | 'procesos-coactivos-demo' | 'edicion-foto-perfil-demo';

interface Usuario {
  id: string;
  nombre: string;
  tipo: 'externo' | 'interno';
  email: string;
  rol?: string;
}

interface SesionGuardada {
  usuario: Usuario;
  vista: Vista;
  timestamp: number;
}

// Configuración de timeout (15 minutos en milisegundos)
const TIMEOUT_INACTIVIDAD = 15 * 60 * 1000; // 15 minutos
const TIEMPO_ALERTA = 1 * 60 * 1000; // 1 minuto antes de cerrar sesión

export default function App() {
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
    const sesionGuardada = localStorage.getItem('esap-sesion-activa');
    if (sesionGuardada) {
      try {
        const sesion: SesionGuardada = JSON.parse(sesionGuardada);
        
        // Verificar que la sesión no haya expirado (24 horas)
        const tiempoTranscurrido = Date.now() - sesion.timestamp;
        const EXPIRACION_SESION = 24 * 60 * 60 * 1000; // 24 horas
        
        if (tiempoTranscurrido < EXPIRACION_SESION) {
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
      toast.warning('⚠️ Inactividad detectada', {
        description: 'Tu sesión se cerrará en 1 minuto por seguridad',
        duration: 10000,
      });
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

  const handleLoginExitoso = (usuario: Usuario) => {
    setUsuarioActual(usuario);
    
    // Redirigir según tipo de usuario
    if (usuario.tipo === 'externo') {
      setVistaActual('portal');
      toast.success('¡Bienvenido al Portal Transaccional!', {
        description: `Hola ${usuario.nombre}`,
      });
    } else {
      setVistaActual('backoffice');
      toast.success('¡Bienvenido al Backoffice Administrativo!', {
        description: `Hola ${usuario.nombre}`,
      });
    }

    // Iniciar sistema de detección de inactividad
    resetearTimerInactividad();
  };

  const handleLogout = () => {
    toast.success('Sesión cerrada exitosamente', {
      description: 'Has cerrado sesión de forma segura',
    });
    
    setUsuarioActual(null);
    setVistaActual('landing');
    localStorage.removeItem('esap-sesion-activa');
    
    // Limpiar timers
    if (timerInactividadRef.current) {
      clearTimeout(timerInactividadRef.current);
    }
    if (timerAlertaRef.current) {
      clearTimeout(timerAlertaRef.current);
    }
    setMostrarAlertaInactividad(false);
    
    console.log('🔒 Sesión cerrada');
  };

  const handleLogoutPorInactividad = () => {
    toast.error('Sesión cerrada por inactividad', {
      description: 'Has estado inactivo durante 15 minutos',
      duration: 5000,
    });
    
    setUsuarioActual(null);
    setVistaActual('landing');
    localStorage.removeItem('esap-sesion-activa');
    setMostrarAlertaInactividad(false);
    
    console.log('⏰ Sesión cerrada por inactividad');
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
        return <LandingPage onIrALogin={handleIrALogin} />;
      
      case 'login':
        return (
          <LoginPage
            onLoginExitoso={handleLoginExitoso}
            onVolver={handleVolverALanding}
          />
        );
      
      case 'portal':
        // Determinar roles según el email del usuario
        const userRoles = usuarioActual?.email === 'gestion.profesoral@esap.edu.co' 
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
          userRoles,
          adminData
        });

        return (
          <PortalDashboard
            userName={usuarioActual!.nombre}
            userEmail={usuarioActual!.email}
            userPersonId={usuarioActual!.id}
            userRoles={userRoles}
            userData={{
              rol_principal: userRoles[0],
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
        const userData = usuarioActual?.email === 'OCIG@esap.edu.co' || usuarioActual?.email === 'ocig@esap.edu.co'
          ? { name: usuarioActual.nombre, email: usuarioActual.email, personId: 'ci-001', restrictedAccess: true, module: 'control-interno' }
          : usuarioActual?.email === 'c.disciplinario@esap.edu.co'
          ? { name: usuarioActual.nombre, email: usuarioActual.email, personId: 'cd-001', restrictedAccess: true, module: 'control-disciplinario' }
          : usuarioActual?.email === 'registro.academico@esap.edu.co'
          ? { name: usuarioActual.nombre, email: usuarioActual.email, personId: 'ra-001', restrictedAccess: true, module: 'registro-academico' }
          : usuarioActual?.email === 'cerlaboral@esap.edu.co'
          ? { name: usuarioActual.nombre, email: usuarioActual.email, personId: 'cl-001', restrictedAccess: true, module: 'certificados-laborales' }
          : usuarioActual?.email === 'arqempresarial@esap.edu.co' || usuarioActual?.email === 'ar.empresarial@esap.edu.co'
          ? { name: usuarioActual.nombre, email: usuarioActual.email, personId: 'ae-001', restrictedAccess: true, module: 'arquitectura-empresarial' }
          : usuarioActual?.email === 'gestion.legal@esap.edu.co'
          ? { name: usuarioActual.nombre, email: usuarioActual.email, personId: 'gl-001', restrictedAccess: true, module: 'gestion-legal' }
          : usuarioActual?.email === 'gestion.profesoral@esap.edu.co'
          ? { name: usuarioActual.nombre, email: usuarioActual.email, personId: 'gp-001', restrictedAccess: true, module: 'gestion-profesoral' }
          : usuarioActual?.email === 'funcionario@esap.edu.co'
          ? { name: usuarioActual.nombre, email: usuarioActual.email, personId: 'func-001', restrictedAccess: true, module: 'procesos' }
          : usuarioActual?.email === 'superuser@esap.edu.co'
          ? { name: usuarioActual.nombre, email: usuarioActual.email, personId: 'super-001', hasBothSystemsAccess: true } // ✅ Acceso dual Backoffice + Portal
          : undefined;

        return (
          <BackofficeApp
            usuario={usuarioActual!}
            userData={userData}
            onLogout={handleLogout}
            onSystemChange={(system) => {
              if (system === 'portal') {
                setVistaActual('portal');
                toast.success('Cambiado al Portal Transaccional');
              }
            }}
          />
        );
      
      case 'pta-demo':
        return (
          <GestionProfesoralApp
            usuario={usuarioActual!}
            onLogout={handleLogout}
          />
        );
      
      case 'password-demo':
        return <DemoPasswordStrength />;
      
      case 'procesos-coactivos-demo':
        return <DemoProcesosCoactivos />;
      
      case 'edicion-foto-perfil-demo':
        return <DemoEdicionFotoPerfil />;
      
      default:
        return <LandingPage onIrALogin={handleIrALogin} />;
    }
  };

  return (
    <ErrorBoundary>
      <style>{`
        [data-sonner-toaster] { 
          position: fixed !important; 
          bottom: 20px !important; 
          right: 20px !important; 
          z-index: 9999 !important; 
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
      
      {renderVista()}
      
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
                onClick={handleLogout}
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
      
      <Toaster position="bottom-right" richColors expand={true} />
    </ErrorBoundary>
  );
}