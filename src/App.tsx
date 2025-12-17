/**
 * App Principal - ComUNIdad Universitaria ESAP
 * Punto de entrada que integra:
 * - Landing Page pública
 * - Portal Transaccional (estudiantes/graduados/docentes)
 * - Backoffice Administrativo
 */

import { useState, useEffect } from "react";
import { BackofficeApp } from "./components/esap/BackofficeApp";
import { LandingPage } from "./components/portal/LandingPage";
import { PortalDashboard } from "./components/portal/PortalDashboard";
import { AuthenticatedPortalNavbar } from "./components/portal/AuthenticatedPortalNavbar";
import { LoginPage } from "./components/esap/LoginPage";
import { SystemSelector } from "./components/esap/SystemSelector";
import { Toaster } from "sonner";
import { ErrorBoundary } from "./components/shared";

// Importar componentes de servicios públicos
import { EnrollmentQRLandingUnified } from "./components/portal/EnrollmentQRLandingUnified";
import { VinculacionForm } from "./components/portal/VinculacionForm"
import { PublicTitleVerification } from "./components/portal/PublicTitleVerification";
import { SolicitarCertificadoLaboral } from "./components/portal/SolicitarCertificadoLaboral";

// ⭐ IMPORTAR COMPONENTE DE PRUEBA - HALLAZGOS Y MEJORAMIENTO
import { TestHallazgosYMejoramiento } from "./components/esap/control-interno/TestHallazgosYMejoramiento";

// ⭐ IMPORTAR DEMO DE COMPONENTES UX MEJORADOS
import { DemoComponentesUXMejorados } from "./components/esap/DemoComponentesUXMejorados";

// ⭐ IMPORTAR TEST DE GESTIÓN DE AUDITORÍAS
import { TestGestionAuditorias } from "./components/esap/control-interno/TestGestionAuditorias";

// ============ INTEGRACIÓN FASE 1: Contexto Global de Auditoría ============
import { AuditoriaGlobalProvider } from "./context/AuditoriaGlobalContext";

// ============ UTILIDADES DE PERSISTENCIA DE SESIÓN ============

const SESSION_KEY = "esap-active-session";

interface SessionData {
  isAuthenticated: boolean;
  userData: any;
  userRoles: string[];
  userType: "portal" | "administrativo";
  activeRole: string;
  currentView: AppView;
}

// Guardar sesión en localStorage
const saveSession = (sessionData: SessionData) => {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
  } catch (error) {
    console.error("Error al guardar sesión:", error);
  }
};

// Recuperar sesión desde localStorage
const loadSession = (): SessionData | null => {
  try {
    const sessionJson = localStorage.getItem(SESSION_KEY);
    if (!sessionJson) return null;
    return JSON.parse(sessionJson);
  } catch (error) {
    console.error("Error al cargar sesión:", error);
    return null;
  }
};

// Limpiar sesión del localStorage
const clearSession = () => {
  try {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem("esap-remember-session");
  } catch (error) {
    console.error("Error al limpiar sesión:", error);
  }
};

// ============================================================

type AppView =
  | "landing"
  | "login"
  | "system-selector"
  | "portal-transaccional"
  | "backoffice"
  | "enrollment-qr"
  | "vinculaciones"
  | "verificacion"
  | "solicitar-certificados-laborales"
  | "convocatorias-docentes"
  | "test-hallazgos"
  | "demo-ux"
  | "test-auditorias"; // ⭐ NUEVA VISTA DE PRUEBA

type UserType =
  | "estudiante"
  | "graduado"
  | "docente"
  | "administrativo"
  | null;

export default function App() {
  const [currentView, setCurrentView] =
    useState<AppView>("landing"); // ✅ Volver al flujo normal
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userData, setUserData] = useState<any>({
    name: "",
    email: "",
    personId: "",
  });
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [userType, setUserType] = useState<
    "portal" | "administrativo"
  >("portal");
  const [activeRole, setActiveRole] =
    useState<string>("Estudiante");

  // ========== PERSISTENCIA DE SESIÓN ==========
  
  // Cargar sesión al montar el componente
  useEffect(() => {
    const savedSession = loadSession();
    
    if (savedSession && savedSession.isAuthenticated) {
      console.log('📂 Cargando sesión guardada...');
      setIsAuthenticated(savedSession.isAuthenticated);
      setUserData(savedSession.userData);
      setUserRoles(savedSession.userRoles);
      setUserType(savedSession.userType);
      setActiveRole(savedSession.activeRole);
      setCurrentView(savedSession.currentView);
      console.log('✅ Sesión restaurada exitosamente');
    }
  }, []);

  // Guardar sesión cada vez que cambia el estado de autenticación
  useEffect(() => {
    if (isAuthenticated) {
      const sessionData: SessionData = {
        isAuthenticated,
        userData,
        userRoles,
        userType,
        activeRole,
        currentView
      };
      
      saveSession(sessionData);
      console.log('💾 Sesión guardada en localStorage');
    } else {
      // Si el usuario no está autenticado, limpiar la sesión
      clearSession();
    }
  }, [isAuthenticated, userData, userRoles, userType, activeRole, currentView]);

  // ============================================

  // Handler para mostrar pantalla de login
  const handleLoginClick = () => {
    setCurrentView("login");
  };

  // Handler para login con discriminación automática por dominio
  const handleLogin = (
    email: string,
    password: string,
    rememberMe?: boolean,
  ) => {
    // Validación de correo @esap.edu.co
    if (!email.toLowerCase().endsWith("@esap.edu.co")) {
      return; // El LoginPage ya muestra el error
    }

    // DISCRIMINACIÓN AUTOMÁTICA POR DOMINIO:
    // - superuser@esap.edu.co → SELECTOR DE SISTEMA (Acceso a ambos)
    // - admin@esap.edu.co, hadmin@esap.edu.co → Backoffice Administrativo
    // - cerlaboral@esap.edu.co → Backoffice con acceso a Certificados Laborales
    // - ar.empresarial@esap.edu.co, arqempresarial@esap.edu.co → Backoffice con acceso a Arquitectura Empresarial
    // - gestion.legal@esap.edu.co → Backoffice con acceso a Gestión Legal
    // - estudiante@esap.edu.co, docente@esap.edu.co → Portal Transaccional

    const emailLower = email.toLowerCase();

    // ============================================
    // SUPER USER - Acceso a Ambos Sistemas
    // ============================================
    if (
      emailLower === "superuser@esap.edu.co" ||
      emailLower === "rector@esap.edu.co" ||
      emailLower === "director@esap.edu.co"
    ) {
      setUserType("administrativo");
      setIsAuthenticated(true);

      // Configurar nombre según el usuario
      const name =
        emailLower === "rector@esap.edu.co"
          ? "Dr. Andrés Felipe Mora Cortés"
          : emailLower === "director@esap.edu.co"
            ? "Dr. Carlos Eduardo Rincón"
            : "Super Administrador ESAP";

      setUserData({
        name,
        email,
        personId: "super-001",
        hasBothSystemsAccess: true, // Flag para indicar acceso dual
      });

      const roleName =
        emailLower === "rector@esap.edu.co"
          ? "Rector Nacional"
          : emailLower === "director@esap.edu.co"
            ? "Director Nacional"
            : "Super Admin";

      setUserRoles([roleName]);

      // Redirigir DIRECTAMENTE al BACKOFFICE
      // Desde ahí pueden cambiar al Portal usando el System Switcher
      setCurrentView("backoffice");
      return;
    }

    // ============================================
    // USUARIO CONTROL INTERNO DE GESTIÓN
    // Acceso exclusivo al módulo de Control Interno
    // ============================================
    if (emailLower === "c.internoge@esap.edu.co") {
      // Validar contraseña específica
      if (password !== "123456") {
        // El LoginPage mostrará el error genérico
        return;
      }

      setUserType("administrativo");
      setIsAuthenticated(true);
      setUserData({
        name: "Jefe Oficina de Control Interno",
        email,
        personId: "control-interno-001",
        module: "control-interno", // ⭐ Módulo específico de acceso
        restrictedAccess: true, // ⭐ Flag para acceso restringido
      });
      setUserRoles(["Jefe de Control Interno"]);
      setCurrentView("backoffice");
      return;
    }

    if (
      emailLower.includes("admin") ||
      emailLower.includes("hadmin") ||
      emailLower === "cerlaboral@esap.edu.co" ||
      emailLower === "ar.empresarial@esap.edu.co" ||
      emailLower === "arqempresarial@esap.edu.co" ||
      emailLower === "gestion.legal@esap.edu.co"
    ) {
      // Usuario Administrativo → Backoffice
      setUserType("administrativo");
      setIsAuthenticated(true);

      // Configurar datos según el tipo de usuario administrativo
      if (emailLower === "cerlaboral@esap.edu.co") {
        setUserData({
          name: "Coordinador Certificados Laborales",
          email,
          personId: "cerlaboral-001",
          module: "certificados-laborales", // Módulo específico de acceso
        });
        setUserRoles(["Coordinador de Certificados Laborales"]);
      } else if (
        emailLower === "ar.empresarial@esap.edu.co" ||
        emailLower === "arqempresarial@esap.edu.co"
      ) {
        setUserData({
          name: "Coordinador Arquitectura Empresarial",
          email,
          personId: "ar.empresarial-001",
          module: "arquitectura-empresarial", // Módulo específico de acceso
        });
        setUserRoles([
          "Coordinador de Arquitectura Empresarial",
        ]);
      } else if (emailLower === "gestion.legal@esap.edu.co") {
        setUserData({
          name: "Coordinador Gestión Legal",
          email,
          personId: "gestion.legal-001",
          module: "gestion-legal", // Módulo específico de acceso
        });
        setUserRoles(["Coordinador de Gestión Legal"]);
      } else {
        setUserData({
          name: "Administrador ESAP",
          email,
          personId: "admin-001",
        });
        setUserRoles(["Administrativo"]);
      }

      setCurrentView("backoffice");
    } else {
      // Usuario Estudiante/Graduado/Docente → Portal Transaccional
      // Simular múltiples roles para demo (en producción viene del backend)
      const roles: string[] = [];
      let name = "Usuario ESAP";
      let userData: any = {};

      if (
        emailLower.includes("docente") ||
        emailLower.includes("profesor")
      ) {
        setUserType("docente");
        roles.push("Docente");

        // Discriminación por tipo de vinculación docente
        if (
          emailLower.includes("planta") ||
          emailLower.includes("carrera")
        ) {
          // Docente de PLANTA - Tiempo Completo
          name = "Dr. Juan Carlos Pérez";
          userData = {
            name,
            email,
            personId: `persona-${Date.now()}`,
            datos_por_rol: {
              Docente: {
                tipo_vinculacion: "Carrera",
                dedicacion: "Tiempo Completo",
                area: "Administración Pública y Gestión Territorial",
                codigo_docente: "DOC-PLANTA-001",
                clases_asignadas: 4,
                estudiantes_totales: 112,
                nivel_educativo: "Doctorado",
                anos_experiencia: 15,
                funciones_administrativas: [
                  "Coordinador de Programa",
                  "Miembro Comité Curricular",
                ],
                investigacion_activa: true,
                coordinacion:
                  "Especialización en Gestión Pública",
              },
            },
          };
        } else if (emailLower.includes("catedra")) {
          // Docente de CÁTEDRA - Medio Tiempo/Horas
          name = "Mg. Ana María López";
          userData = {
            name,
            email,
            personId: `persona-${Date.now()}`,
            datos_por_rol: {
              Docente: {
                tipo_vinculacion: "Cátedra",
                dedicacion: "Medio Tiempo",
                area: "Políticas Públicas",
                codigo_docente: "DOC-CATEDRA-456",
                clases_asignadas: 2,
                estudiantes_totales: 58,
                nivel_educativo: "Maestría",
                anos_experiencia: 8,
              },
            },
          };
        } else {
          // Por defecto: Docente Ocasional (planta temporal)
          name = "Dr. Carlos Hernández";
          userData = {
            name,
            email,
            personId: `persona-${Date.now()}`,
            datos_por_rol: {
              Docente: {
                tipo_vinculacion: "Ocasional",
                dedicacion: "Tiempo Completo",
                area: "Derecho Público",
                codigo_docente: "DOC-OCAS-789",
                clases_asignadas: 3,
                estudiantes_totales: 87,
                nivel_educativo: "Doctorado",
                anos_experiencia: 12,
                investigacion_activa: true,
              },
            },
          };
        }
      } else if (
        emailLower.includes("funcionario") ||
        emailLower.includes("administrativo")
      ) {
        setUserType("administrativo");
        roles.push("Administrativo");
        name = "Patricia Herrera Gómez";
        userData = {
          name,
          email,
          personId: `persona-${Date.now()}`,
          cedula: "33445556",
          datos_por_rol: {
            Administrativo: {
              area: "Dirección Académica",
              cargo: "Secretaria Ejecutiva",
              dependencia: "Vicerrectoría Académica",
              codigo_empleado: "EMP-00234",
              solicitudes_pendientes: 12,
              reportes_generados: 8,
            },
          },
        };
      } else if (
        emailLower.includes("graduado") ||
        emailLower.includes("egresado")
      ) {
        setUserType("graduado");
        roles.push("Graduado");
        name = "María González Pérez";
        userData = {
          name,
          email,
          personId: `persona-${Date.now()}`,
          cedula: "52789456",
          datos_por_rol: {
            Graduado: {
              programa_graduado: "Administración Pública",
              ano_graduacion: "2022",
              titulo_obtenido:
                "Profesional en Administración Pública",
              grado_academico: "Pregrado",
            },
          },
        };
      } else {
        setUserType("estudiante");
        roles.push("Estudiante");
        name = "Carlos Ramírez";
        userData = {
          name,
          email,
          personId: `persona-${Date.now()}`,
          cedula: "1234567890",
          datos_por_rol: {
            Estudiante: {
              programa: "Administración Pública Territorial",
              semestre: 6,
              creditos_aprobados: 64,
              promedio_acumulado: 4.2,
              estado_matricula: "Activo",
            },
          },
        };
      }

      // Demo: algunos usuarios pueden tener múltiples roles
      if (emailLower.includes("multi")) {
        roles.push("Estudiante", "Graduado");
      }

      setIsAuthenticated(true);
      setUserData(
        userData.name
          ? userData
          : { name, email, personId: `persona-${Date.now()}` },
      );
      setUserRoles(roles);
      setCurrentView("portal-transaccional");
    }

    // Guardar sesión si rememberMe está activo
    if (rememberMe) {
      localStorage.setItem(
        "esap-remember-session",
        JSON.stringify({ email }),
      );
    }
  };

  // Handler para logout (desde cualquier ambiente)
  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserType("portal");
    setUserRoles([]);
    setUserData({
      name: "Usuario ESAP",
      email: "usuario@esap.edu.co",
      personId: "",
    });
    localStorage.removeItem("esap-remember-session");
    setCurrentView("landing");
  };

  // Handler para volver al home desde login
  const handleBackToHome = () => {
    setCurrentView("landing");
  };

  // Handler para selección de sistema (Super Users)
  const handleSelectSystem = (
    system: "backoffice" | "portal",
  ) => {
    if (system === "backoffice") {
      setCurrentView("backoffice");
    } else {
      setCurrentView("portal-transaccional");
    }
  };

  // Handler para cambio directo de sistema (sin pasar por selector)
  const handleSystemChange = (
    system: "backoffice" | "portal",
  ) => {
    if (system === "backoffice") {
      setCurrentView("backoffice");
      setUserType("administrativo");
    } else {
      setCurrentView("portal-transaccional");
      // Para Super Users que van al Portal, necesitan tener un userType válido
      // y roles del Portal para que el PortalDashboard funcione
      if (userType === "administrativo") {
        setUserType("docente");

        // Si el usuario solo tiene roles administrativos, agregar rol de Docente
        const hasPortalRole = userRoles.some((role) =>
          [
            "Estudiante",
            "Docente",
            "Graduado",
            "Aspirante",
          ].includes(role),
        );

        if (!hasPortalRole) {
          // Agregar rol de Docente para Super Users
          setUserRoles([...userRoles, "Docente"]);

          // Actualizar userData con datos de Docente
          setUserData({
            ...userData,
            datos_por_rol: {
              Docente: {
                tipo_vinculacion: "Carrera",
                dedicacion: "Tiempo Completo",
                area: "Administración Pública y Gestión Territorial",
                codigo_docente: "DOC-ADMIN-001",
                clases_asignadas: 0,
                estudiantes_totales: 0,
                nivel_educativo: "Doctorado",
                anos_experiencia: 15,
                funciones_administrativas: [
                  "Dirección",
                  "Rectoría",
                ],
                investigacion_activa: true,
              },
            },
          });
        }
      }
    }
  };

  // Handler para volver al selector de sistema (Super Users)
  const handleBackToSystemSelector = () => {
    setCurrentView("system-selector");
  };

  // Handler para navegación desde Landing
  const handleNavigate = (section: string) => {
    // Servicios públicos - cambiar vista
    if (section === "enrollment-qr") {
      setCurrentView("enrollment-qr");
      return;
    }

    if (section === "vinculaciones") {
      setCurrentView("vinculaciones");
      return;
    }

    if (section === "verificacion") {
      setCurrentView("verificacion");
      return;
    }

    if (section === "solicitar-certificados-laborales") {
      setCurrentView("solicitar-certificados-laborales");
      return;
    }

    if (section === "convocatorias-docentes") {
      setCurrentView("convocatorias-docentes");
      return;
    }

    // Si la sección es login/portal, ir al login
    if (section === "portal" || section === "login") {
      handleLoginClick();
      return;
    }

    // Otras secciones: scroll en landing page
    const element = document.getElementById(section);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <AuditoriaGlobalProvider>
      <ErrorBoundary>
        {/* Landing Page - Vista Pública */}
        {currentView === "landing" && (
          <LandingPage
            onLoginClick={handleLoginClick}
            onNavigate={handleNavigate}
          />
        )}

        {/* Login Page - Sistema de Login Dual con Discriminación Automática */}
        {currentView === "login" && (
          <LoginPage
            onLogin={handleLogin}
            onBackToHome={handleBackToHome}
          />
        )}

        {/* System Selector - Para Super Users con Acceso a Ambos Sistemas */}
        {currentView === "system-selector" && isAuthenticated && (
          <SystemSelector
            userName={userData.name}
            userEmail={userData.email}
            userRoles={userRoles}
            onSelectSystem={handleSelectSystem}
            onLogout={handleLogout}
          />
        )}

        {/* Portal Transaccional - Estudiantes/Graduados/Docentes */}
        {currentView === "portal-transaccional" &&
          isAuthenticated && (
            <div className="min-h-screen bg-gray-50">
              {/* Navbar Autenticado con Logout */}
              <AuthenticatedPortalNavbar
                userName={userData.name}
                userEmail={userData.email}
                userRoles={userRoles}
                activeRole={activeRole}
                onLogout={handleLogout}
                onSystemChange={handleSystemChange}
                hasBothSystemsAccess={
                  userData.hasBothSystemsAccess
                }
              />

              {/* Portal Dashboard con Sistema de Roles */}
              <PortalDashboard
                userName={userData.name}
                userEmail={userData.email}
                userPersonId={userData.personId}
                userRoles={userRoles}
                userData={userData}
                onActiveRoleChange={setActiveRole}
              />
            </div>
          )}

        {/* Backoffice Administrativo - Personal Administrativo */}
        {currentView === "backoffice" &&
          isAuthenticated &&
          userType === "administrativo" && (
            <BackofficeApp
              onLogout={handleLogout}
              onBackToSystemSelector={handleBackToSystemSelector}
              onSystemChange={handleSystemChange}
              userData={userData}
              userRoles={userRoles}
            />
          )}

        {/* SERVICIOS PÚBLICOS - Sin autenticación requerida */}

        {/* 1. Enrolamiento QR - Proceso de auto-enrolamiento */}
        {currentView === "enrollment-qr" && (
          <EnrollmentQRLandingUnified
            onBeginActivation={() => {
              // En producción iniciaría el flujo de activación
              console.log("Iniciando proceso de enrolamiento");
            }}
            onBackToHome={handleBackToHome}
            onLoginClick={handleLoginClick}
          />
        )}

        {/* 2. Formulario de Vinculaciones - Formulario de interés (alimenta módulo Aspirantes) */}
        {currentView === "vinculaciones" && (
          <VinculacionForm
            onBack={handleBackToHome}
            onLoginClick={handleLoginClick}
          />
        )}

        {/* 3. Verificación de Títulos - Certificados públicos de verificación con QR */}
        {currentView === "verificacion" && (
          <PublicTitleVerification
            onBack={handleBackToHome}
            onLoginClick={handleLoginClick}
          />
        )}

        {/* 4. Solicitar Certificados Laborales - Sistema de solicitud con validación 2FA */}
        {currentView === "solicitar-certificados-laborales" && (
          <SolicitarCertificadoLaboral
            onBack={handleBackToHome}
            onLoginClick={handleLoginClick}
          />
        )}

        {/* 5. Convocatorias Docentes - Pendiente de implementar */}
        {currentView === "convocatorias-docentes" && (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
            <div className="max-w-2xl w-full bg-white rounded-2xl shadow-lg p-8 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg
                  className="w-10 h-10 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
                  />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Convocatorias Docentes
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                El módulo de Convocatorias Docentes estará
                disponible próximamente. Aquí podrás aplicar a
                convocatorias abiertas para docentes de ESAP.
              </p>
              <button
                onClick={handleBackToHome}
                className="px-6 py-3 bg-gradient-to-r from-[#003DA5] to-[#0052CC] text-white rounded-lg font-semibold hover:shadow-lg transition-all"
              >
                Volver al Inicio
              </button>
            </div>
          </div>
        )}

        {/* 6. Test Hallazgos y Mejoramiento - Componente de prueba */}
        {currentView === "test-hallazgos" && (
          <TestHallazgosYMejoramiento
            onBack={handleBackToHome}
          />
        )}

        {/* 7. Demo Componentes UX Mejorados - Componente de prueba */}
        {currentView === "demo-ux" && (
          <DemoComponentesUXMejorados
            onBack={handleBackToHome}
          />
        )}

        {/* 8. Test Gestion de Auditorias - Componente de prueba */}
        {currentView === "test-auditorias" && (
          <TestGestionAuditorias
            onBack={handleBackToHome}
          />
        )}

        {/* Toast Global */}
        <Toaster
          position="top-right"
          richColors
          closeButton
          duration={4000}
        />
      </ErrorBoundary>
    </AuditoriaGlobalProvider>
  );
}