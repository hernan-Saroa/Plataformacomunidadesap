import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Toaster } from './components/ui/sonner';

// ========================================
// PORTAL TRANSACCIONAL UNIFICADO
// ========================================
import { 
  PortalDashboard, 
  PortalNavbar, 
  PortalRoute 
} from './modules/portal-transaccional';

// Componentes Portal - Lazy Loading
const MiPTA = lazy(() => import('./modules/gestion-profesoral/components/portal/MiPTA').then(m => ({ default: m.MiPTA })));
const MisAuditorias = lazy(() => import('./modules/control-interno/components/portal/MisAuditorias').then(m => ({ default: m.MisAuditorias })));

// ========================================
// PORTAL PÚBLICO
// ========================================
const LandingPage = lazy(() => import('./components/portal/LandingPage').then(m => ({ default: m.LandingPage })));
const LoginPage = lazy(() => import('./components/portal/LoginPage').then(m => ({ default: m.LoginPage })));
const PublicCertificateValidation = lazy(() => import('./components/portal/PublicCertificateValidation').then(m => ({ default: m.PublicCertificateValidation })));
const PublicTitleVerification = lazy(() => import('./components/portal/PublicTitleVerification').then(m => ({ default: m.PublicTitleVerification })));

// ========================================
// BACKOFFICE ADMINISTRATIVO
// ========================================
const BackofficeApp = lazy(() => import('./components/esap/BackofficeApp').then(m => ({ default: m.BackofficeApp })));

/**
 * App Principal - Arquitectura Micro-Frontends ESAP
 * 
 * Estructura:
 * - /publico/* - Portal Público (sin autenticación)
 * - /login - Página de login
 * - /portal/* - Portal Transaccional Unificado (usuario@esap.edu.co)
 * - /admin/* - Backoffice Administrativo (administradores)
 */
function App() {
  // 🔒 SEGURIDAD: Usar validador de sesión seguro
  const [user, setUser] = React.useState<any>(null);

  // Cargar usuario con validación de seguridad
  React.useEffect(() => {
    // Importar funciones de seguridad
    import('./modules/portal-transaccional/security/sessionValidator').then(
      ({ validateSession }) => {
        const validatedUser = validateSession();
        setUser(validatedUser);
      }
    ).catch(() => {
      setUser(null);
    });
  }, []);

  const handleLogout = () => {
    // 🔒 SEGURIDAD: Usar función de logout seguro
    import('./modules/portal-transaccional/security/sessionValidator').then(
      ({ clearSession, safeRedirect }) => {
        clearSession();
        setUser(null);
        safeRedirect('/login');
      }
    );
  };

  // Loading fallback
  const LoadingFallback = () => (
    <div className="min-h-screen bg-gradient-to-br from-[#E0EDFF] via-white to-[#FFF8E1] flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-[#2962FF] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Cargando...</p>
      </div>
    </div>
  );

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          {/* ========================================
              PORTAL PÚBLICO (Sin autenticación)
              ======================================== */}
          <Route path="/" element={
            <Suspense fallback={<LoadingFallback />}>
              <LandingPage />
            </Suspense>
          } />

          <Route path="/publico/validar-certificado" element={
            <Suspense fallback={<LoadingFallback />}>
              <PublicCertificateValidation />
            </Suspense>
          } />

          <Route path="/publico/verificar-titulo" element={
            <Suspense fallback={<LoadingFallback />}>
              <PublicTitleVerification />
            </Suspense>
          } />

          {/* ========================================
              LOGIN
              ======================================== */}
          <Route path="/login" element={
            <Suspense fallback={<LoadingFallback />}>
              <LoginPage />
            </Suspense>
          } />

          {/* ========================================
              PORTAL TRANSACCIONAL UNIFICADO
              (Usuarios autenticados @esap.edu.co)
              ======================================== */}
          <Route path="/portal" element={
            <PortalLayout user={user} onLogout={handleLogout} />
          }>
            {/* Dashboard Principal */}
            <Route index element={
              <PortalRoute user={user}>
                <PortalDashboard user={user} />
              </PortalRoute>
            } />

            {/* Mi PTA (Solo DOCENTES) */}
            <Route path="pta/*" element={
              <PortalRoute user={user} requiredRole="DOCENTE">
                <Suspense fallback={<LoadingFallback />}>
                  <MiPTA />
                </Suspense>
              </PortalRoute>
            } />

            {/* Mis Auditorías (Solo JEFE_AREA) */}
            <Route path="auditorias/*" element={
              <PortalRoute user={user} requiredRole="JEFE_AREA">
                <Suspense fallback={<LoadingFallback />}>
                  <MisAuditorias />
                </Suspense>
              </PortalRoute>
            } />

            {/* Mis Certificados (Todos los usuarios) */}
            <Route path="certificados" element={
              <PortalRoute user={user}>
                <div className="p-8 text-center">
                  <h1 className="text-2xl text-gray-600">Mis Certificados</h1>
                  <p className="text-gray-500 mt-2">En desarrollo...</p>
                </div>
              </PortalRoute>
            } />

            {/* Mi Perfil (Todos los usuarios) */}
            <Route path="perfil" element={
              <PortalRoute user={user}>
                <div className="p-8 text-center">
                  <h1 className="text-2xl text-gray-600">Mi Perfil</h1>
                  <p className="text-gray-500 mt-2">En desarrollo...</p>
                </div>
              </PortalRoute>
            } />

            {/* Ayuda */}
            <Route path="ayuda" element={
              <div className="p-8 text-center">
                <h1 className="text-2xl text-gray-600">Centro de Ayuda</h1>
                <p className="text-gray-500 mt-2">En desarrollo...</p>
              </div>
            } />

            {/* Catch-all: redirect a dashboard */}
            <Route path="*" element={<Navigate to="/portal" replace />} />
          </Route>

          {/* ========================================
              BACKOFFICE ADMINISTRATIVO
              (Solo administradores)
              ======================================== */}
          <Route path="/admin/*" element={
            <Suspense fallback={<LoadingFallback />}>
              <BackofficeApp />
            </Suspense>
          } />

          {/* ========================================
              CATCH-ALL: Redirect a landing
              ======================================== */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {/* Toast Notifications */}
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#fff',
              color: '#1f2937',
              border: '1px solid #e5e7eb',
            },
          }}
        />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

/**
 * Layout del Portal Transaccional
 * Incluye Navbar y Outlet para subrutas
 */
function PortalLayout({ user, onLogout }: { user: any; onLogout: () => void }) {
  const [notificacionesCount, setNotificacionesCount] = React.useState(0);

  // TODO: Cargar notificaciones desde API
  React.useEffect(() => {
    // Mock
    setNotificacionesCount(5);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <PortalNavbar 
        user={user} 
        notificacionesCount={notificacionesCount}
        onLogout={onLogout}
      />
      <main>
        <Suspense fallback={
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-[#2962FF] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Cargando...</p>
            </div>
          </div>
        }>
          {React.createElement(require('react-router-dom').Outlet)}
        </Suspense>
      </main>
    </div>
  );
}

export default App;
