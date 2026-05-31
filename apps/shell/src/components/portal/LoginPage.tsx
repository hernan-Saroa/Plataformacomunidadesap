import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, Eye, EyeOff, Loader2, LogIn, Building2, TrendingUp, Sparkles, ArrowLeft, ChevronDown, AlertTriangle, Shield, GraduationCap, Users, BookOpen, MapPin, User } from 'lucide-react';
import { toast } from 'sonner';
import { ESAPLogo } from '../assets/ESAPLogo';
import { ModalRecuperarContrasena } from './ModalRecuperarContrasena';
import { authService } from '../../services/api/authService';
import loginHeroImage from '../../assets/photo-1623156167557-281309073eef.png';

interface MicrosoftCallbackResponse {
  code: string;
  state: string;
  error?: string;
  errorDescription?: string;
}

interface LoginPageProps {
  onLogin: (user: any, accessToken: string, rememberMe?: boolean) => void;
  onBackToHome?: () => void;
}

export function LoginPage({ onLogin, onBackToHome }: LoginPageProps) {
  const loginOptions =
    ((import.meta.env.VITE_LOGIN_OPTIONS as string | undefined) || 'both')
      .trim()
      .toLowerCase();
  const showMicrosoftLogin = true;
  const showCredentialLogin = !showMicrosoftLogin || loginOptions !== 'microsoft';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [isCredentialsOpen, setIsCredentialsOpen] = useState(false);
  const [showRecuperarModal, setShowRecuperarModal] = useState(false);
  const [isMicrosoftLoading, setIsMicrosoftLoading] = useState(false);
  const [microsoftLoginError, setMicrosoftLoginError] = useState<string | null>(null);
  const [bgLoaded, setBgLoaded] = useState(false);

  // IMPORTANTE: Forzar tema claro en el login SIEMPRE
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    const img = new Image();
    img.onload = () => setBgLoaded(true);
    img.src = loginHeroImage;
  }, []);

  useEffect(() => {
    const search = window.location.search;
    if (!search || (!search.includes('code=') && !search.includes('error='))) return;

    const processMicrosoftCallback = async () => {
      setIsMicrosoftLoading(true);
      setMicrosoftLoginError(null);
      try {
        const response = parseMicrosoftCallback(window.location.search);

        if (response.error) {
          throw new Error(resolveMicrosoftErrorMessage(response.error, response.errorDescription));
        }

        if (!response.code) {
          throw new Error('Microsoft no retornó código de autorización.');
        }

        const expectedState = sessionStorage.getItem('ms_oauth_state');
        if (!expectedState || expectedState !== response.state) {
          throw new Error('Respuesta inválida de Microsoft (state).');
        }

        const clientId = import.meta.env.VITE_MICROSOFT_CLIENT_ID as string | undefined;
        const tenantId = (import.meta.env.VITE_MICROSOFT_TENANT_ID as string | undefined) || 'common';
        const redirectUri =
          (import.meta.env.VITE_MICROSOFT_REDIRECT_URI as string | undefined) ||
          window.location.origin + window.location.pathname;
        const codeVerifier = sessionStorage.getItem('ms_pkce_verifier');

        if (!clientId || !codeVerifier) {
          throw new Error('No hay contexto PKCE para completar el login.');
        }

        const tokenResponse = await exchangeMicrosoftCode({
          tenantId,
          clientId,
          code: response.code,
          redirectUri,
          codeVerifier,
        });

        if (!tokenResponse.id_token) {
          throw new Error('Microsoft no retornó id_token.');
        }

        const payload = decodeJwtPayload(tokenResponse.id_token);
        const email = (payload.preferred_username || payload.email || payload.upn || '').toLowerCase();

        if (!email) {
          throw new Error('Microsoft no retornó correo electrónico.');
        }

        const expectedNonce = sessionStorage.getItem('ms_oauth_nonce');
        if (expectedNonce && payload.nonce && expectedNonce !== payload.nonce) {
          throw new Error('Respuesta inválida de Microsoft (nonce).');
        }

        if (!email.endsWith('@esap.edu.co')) {
          throw new Error('Solo se permiten cuentas institucionales @esap.edu.co.');
        }

        // Limpiar query de callback y datos temporales
        history.replaceState(null, '', window.location.pathname);
        sessionStorage.removeItem('ms_oauth_state');
        sessionStorage.removeItem('ms_oauth_nonce');
        sessionStorage.removeItem('ms_pkce_verifier');

        const loginResponse = await authService.loginWithMicrosoft({
          email,
          idToken: tokenResponse.id_token,
        });

        toast.success('Inicio de sesión con Microsoft exitoso', {
          description: `Bienvenido ${payload.name || email}`,
          duration: 3500,
        });

        onLogin(loginResponse.user, loginResponse.accessToken, rememberMe);
      } catch (error: any) {
        // console.error('Error en callback de Microsoft:', error);
        setMicrosoftLoginError(error?.message || 'No fue posible completar el inicio de sesión con Microsoft.');
        toast.error('No fue posible iniciar sesión con Microsoft', {
          description: error?.message || 'Intenta nuevamente.',
          duration: 5000,
        });
      } finally {
        setIsMicrosoftLoading(false);
      }
    };

    void processMicrosoftCallback();
  }, [onLogin, rememberMe]);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    
    if (!email) {
      newErrors.email = 'El correo electrónico es requerido';
    } else if (!email.includes('@')) {
      newErrors.email = 'Ingrese un correo válido';
    } else if (!email.toLowerCase().endsWith('@esap.edu.co')) {
      newErrors.email = 'Solo se permiten correos institucionales @esap.edu.co';
    }
    
    if (!password) {
      newErrors.password = 'La contraseña es requerida';
    } else if (password.length < 6) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Por favor corrija los errores en el formulario');
      return;
    }

    setIsLoading(true);

    // 🔥 LIMPIAR CACHÉ COMPLETAMENTE AL HACER LOGIN
    sessionStorage.removeItem('esap-sesion-activa');

    try {
      // Llamar a la API de autenticación real
      const response = await authService.login({
        email: email.toLowerCase(),
        password,
        rememberMe,
      });

      // Determinar el tipo de usuario basado en el email para mostrar mensaje personalizado
      const emailLower = email.toLowerCase();

      // Mostrar mensajes personalizados (opcional, igual que el LoginPage de esap)
      if (emailLower === 'superuser@esap.edu.co') {
        toast.success('⭐ ¡Bienvenido Super User!', {
          description: 'Acceso al Backoffice Administrativo concedido',
          duration: 3500,
        });
      } else if (emailLower === 'admin@esap.edu.co') {
        toast.success('🎯 ¡Bienvenido Administrador!', {
          description: 'Acceso al Backoffice Administrativo concedido',
          duration: 3500,
        });
      } else if (emailLower === 'estudiantes@esap.edu.co') {
        toast.success('🎓 ¡Bienvenido Estudiante!', {
          description: 'Acceso al Portal Transaccional concedido',
          duration: 3500,
        });
      } else if (emailLower === 'cerlaboral@esap.edu.co') {
        toast.success('📋 ¡Bienvenido Gestor de Certificados!', {
          description: 'Acceso al Módulo de Certificados Laborales concedido',
          duration: 3500,
        });
      } else if (emailLower === 'funcionario@esap.edu.co') {
        toast.success('⚖️ ¡Bienvenido Funcionario!', {
          description: 'Acceso al Portal Transaccional - Procesos Legales disponibles',
          duration: 3500,
        });
      } else if (emailLower === 'ar.empresarial@esap.edu.co' || emailLower === 'arqempresarial@esap.edu.co') {
        toast.success('🏛️ ¡Bienvenido Coordinador de Arquitectura Empresarial!', {
          description: 'Acceso al Módulo de Arquitectura Empresarial MRAE concedido',
          duration: 3500,
        });
      } else if (emailLower === 'planta@esap.edu.co') {
        toast.success('💼 ¡Bienvenido Docente Planta!', {
          description: 'Acceso a la Gestión Profesoral concedido',
          duration: 3500,
        });
      } else if (emailLower === 'gestion.legal@esap.edu.co') {
        toast.success('⚖️ ¡Bienvenido Gestión Legal!', {
          description: 'Acceso a la Gestión Legal concedido',
          duration: 3500,
        });
      } else if (emailLower === 'ocig@esap.edu.co') {
        toast.success('🔍 ¡Bienvenido OCIG!', {
          description: 'Acceso al Módulo de Control Interno de Gestión concedido',
          duration: 3500,
        });
      } else if (emailLower === 'c.disciplinario@esap.edu.co') {
        toast.success('🔍 ¡Bienvenido Control Disciplinario!', {
          description: 'Acceso al Módulo de Control Disciplinario concedido',
          duration: 3500,
        });
      } else if (emailLower === 'registro.academico@esap.edu.co') {
        toast.success('📚 ¡Bienvenido Registro Académico!', {
          description: 'Acceso al Módulo de Registro Académico concedido',
          duration: 3500,
        });
      }

      // Pasar los datos del usuario autenticado al handler de login (igual que el LoginPage de esap)
      setRemainingAttempts(null);
      onLogin(response.user, response.accessToken, rememberMe);
    } catch (error: any) {
      const statusCode =
        error?.status ??
        error?.statusCode ??
        error?.response?.status ??
        error?.response?.data?.statusCode ??
        null;
      let errorMessage =
        typeof error?.message === 'string' && error.message.trim()
          ? error.message
          : 'Ocurrió un error inesperado. Intenta nuevamente.';

      if (errorMessage === 'Error' || errorMessage === 'Failed to fetch') {
        errorMessage = 'No se pudo conectar con el servidor. Verifica tu conexión o intenta más tarde.';
      }

      // Log para desarrolladores (sin spam)
      if (process.env.NODE_ENV === 'development') {
        console.error(`[Login Error] Status: ${statusCode || 'Network/CORS'}, Message:`, error?.message || error);
      }

      // Manejar diferentes tipos de errores
      if (statusCode === 429) {
        toast.error('Demasiados intentos', {
          description: errorMessage,
          duration: 7000,
        });
      } else if (statusCode === 401) {
        if (errorMessage === 'El usuario no tiene roles asignados') {
          toast.error('Acceso denegado', {
            description: 'El usuario no tiene roles asignados. Por favor, solicita que te asignen un rol e intenta nuevamente.',
            duration: 10000,
          });
        } else {
          const match = errorMessage.match(/Te (?:queda|quedan) (\d+) intento/);
          const parsed = match ? parseInt(match[1], 10) : null;
          if (parsed !== null && parsed <= 3) setRemainingAttempts(parsed);
          toast.error('Credenciales incorrectas', {
            description: errorMessage,
            duration: 5000,
          });
          setErrors({
            email: 'Verifica tu correo electrónico',
            password: 'Verifica tu contraseña'
          });
        }
      } else if (statusCode === 400) {
        toast.error('Datos inválidos', {
          description: 'Por favor verifica la información ingresada.',
          duration: 5000,
        });
      } else {
        toast.error('Error de conexión', {
          description: errorMessage,
          duration: 5000,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = (provider: string) => {
    setMicrosoftLoginError(null);

    if (provider !== 'Microsoft') {
      toast.info(`Inicio de sesión con ${provider} próximamente disponible`);
      return;
    }

    const clientId = import.meta.env.VITE_MICROSOFT_CLIENT_ID as string | undefined;
    const tenantId = (import.meta.env.VITE_MICROSOFT_TENANT_ID as string | undefined) || 'common';
    const redirectUri =
      (import.meta.env.VITE_MICROSOFT_REDIRECT_URI as string | undefined) ||
      window.location.origin + window.location.pathname;

    if (!clientId) {
      toast.error('Falta configurar Microsoft OAuth', {
        description: 'Define VITE_MICROSOFT_CLIENT_ID en tu entorno.',
      });
      return;
    }

    const launchMicrosoftAuth = async () => {
      try {
        const state = generateUuid();
        const nonce = generateUuid();
        const codeVerifier = generateCodeVerifier();
        const codeChallenge = await generateCodeChallenge(codeVerifier);

        sessionStorage.setItem('ms_oauth_state', state);
        sessionStorage.setItem('ms_oauth_nonce', nonce);
        sessionStorage.setItem('ms_pkce_verifier', codeVerifier);

        const query = new URLSearchParams({
          client_id: clientId,
          response_type: 'code',
          redirect_uri: redirectUri,
          response_mode: 'query',
          scope: 'openid profile email',
          state,
          nonce,
          prompt: 'select_account',
          code_challenge: codeChallenge,
          code_challenge_method: 'S256',
        });

        setIsMicrosoftLoading(true);
        window.location.assign(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${query.toString()}`);
      } catch (error: any) {
        // console.error('Error iniciando OAuth Microsoft:', error);
        setIsMicrosoftLoading(false);
        toast.error('No se pudo iniciar el login con Microsoft', {
          description: error?.message || 'Revisa la configuración OAuth.',
        });
      }
    };

    void launchMicrosoftAuth();
  };

  return (
    <div
      data-login-page-root
      className="esap-login-root fixed inset-0 grid h-screen w-screen max-w-none overflow-hidden bg-white"
      style={{
        width: '100dvw',
        minWidth: '100dvw',
        height: '100dvh',
        minHeight: '100dvh',
        margin: 0,
        maxWidth: 'none',
        position: 'fixed',
        inset: 0,
        display: 'grid',
        overflow: 'hidden',
        backgroundColor: '#fff',
        zIndex: 0,
      }}
    >
      <div data-login-left-pane className="esap-login-left flex flex-col min-h-screen lg:min-h-0 bg-white relative">
        <div className="flex-shrink-0 px-6 sm:px-10 pt-6 sm:pt-8">
          <motion.button
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            onClick={onBackToHome}
            className="inline-flex items-center gap-2 text-gray-400 hover:text-[#1e5da8] transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
            <span style={{ fontSize: '15px' }} className="font-medium">Volver al inicio</span>
          </motion.button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-start px-6 sm:px-10 py-8 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-[420px] my-auto"
          >
            <div className="flex justify-center mb-8 sm:mb-10">
              <ESAPLogo variant="color" className="h-12 sm:h-14 w-auto" />
            </div>


            <div style={{ marginBottom: '32px' }}>
              <h1 style={{ fontSize: '32px', lineHeight: '1.15' }} className="font-extrabold text-gray-900 mb-2">
                Iniciar Sesión
              </h1>
              <p style={{ fontSize: '16px', lineHeight: '1.5' }} className="text-gray-400">
                Accede a tu cuenta ESAP
              </p>
            </div>

            {showMicrosoftLogin && (
              <div style={{ marginBottom: '24px' }}>
                {microsoftLoginError && (
                  <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    {microsoftLoginError}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => handleSocialLogin('Microsoft')}
                  disabled={isLoading || isMicrosoftLoading}
                  style={{ height: '52px', fontSize: '15px', borderRadius: '12px' }}
                  className="w-full flex items-center justify-center gap-2.5 border-2 border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-gray-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Building2 className="w-5 h-5" />
                  <span className="font-semibold">
                    {isMicrosoftLoading ? 'Conectando con Microsoft...' : 'Iniciar sesión con Microsoft'}
                  </span>
                </button>
              </div>
            )}

            {showCredentialLogin && (
              <>
                <div className="relative" style={{ marginBottom: '28px' }}>
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center">
                    <span style={{ fontSize: '13px' }} className="px-4 bg-white text-gray-400 font-medium">
                      {showMicrosoftLogin ? 'O continúa con tu correo' : 'Continúa con tu correo'}
                    </span>
                  </div>
                </div>

                <form onSubmit={handleSubmit}>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ fontSize: '14px', marginBottom: '8px' }} className="block font-semibold text-gray-700">
                      Correo Electrónico
                    </label>
                    <div
                      className={`flex items-center transition-all ${
                        errors.email
                          ? 'border-red-300 bg-red-50/50 focus-within:border-red-500 focus-within:ring-4 focus-within:ring-red-100'
                          : 'border-gray-200 bg-gray-50/60 focus-within:bg-white focus-within:border-[#1e5da8] focus-within:ring-4 focus-within:ring-[#1e5da8]/10'
                      }`}
                      style={{ height: '52px', borderRadius: '12px', borderWidth: '2px', borderStyle: 'solid' }}
                    >
                      <div className="flex items-center justify-center flex-shrink-0 pointer-events-none" style={{ width: '52px' }}>
                        <Mail style={{ width: '18px', height: '18px' }} className="text-gray-400" />
                      </div>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setErrors({ ...errors, email: undefined });
                          setRemainingAttempts(null);
                        }}
                        placeholder="correo@esap.edu.co"
                        disabled={isLoading}
                        style={{ fontSize: '15px', border: 'none', outline: 'none', background: 'transparent', padding: '0 16px 0 0', width: '100%', height: '100%' }}
                      />
                    </div>
                    {errors.email && (
                      <p style={{ fontSize: '13px', marginTop: '6px' }} className="text-red-500">{errors.email}</p>
                    )}
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ fontSize: '14px', marginBottom: '8px' }} className="block font-semibold text-gray-700">
                      Contraseña
                    </label>
                    <div
                      className={`flex items-center transition-all ${
                        errors.password
                          ? 'border-red-300 bg-red-50/50 focus-within:border-red-500 focus-within:ring-4 focus-within:ring-red-100'
                          : 'border-gray-200 bg-gray-50/60 focus-within:bg-white focus-within:border-[#1e5da8] focus-within:ring-4 focus-within:ring-[#1e5da8]/10'
                      }`}
                      style={{ height: '52px', borderRadius: '12px', borderWidth: '2px', borderStyle: 'solid' }}
                    >
                      <div className="flex items-center justify-center flex-shrink-0 pointer-events-none" style={{ width: '52px' }}>
                        <Lock style={{ width: '18px', height: '18px' }} className="text-gray-400" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setErrors({ ...errors, password: undefined });
                        }}
                        placeholder="••••••••"
                        disabled={isLoading}
                        style={{ fontSize: '15px', border: 'none', outline: 'none', background: 'transparent', padding: '0', width: '100%', height: '100%', flex: '1' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="flex items-center justify-center flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
                        style={{ width: '52px', height: '100%' }}
                        tabIndex={-1}
                      >
                        {showPassword
                          ? <EyeOff style={{ width: '18px', height: '18px' }} />
                          : <Eye style={{ width: '18px', height: '18px' }} />
                        }
                      </button>
                    </div>
                    {errors.password && (
                      <p style={{ fontSize: '13px', marginTop: '6px' }} className="text-red-500">{errors.password}</p>
                    )}
                    {remainingAttempts !== null && remainingAttempts > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-2 p-2.5 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2"
                      >
                        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        <p className="text-red-600 text-xs leading-snug">
                          <span className="font-semibold">
                            Te {remainingAttempts === 1 ? 'queda' : 'quedan'} {remainingAttempts} intento{remainingAttempts === 1 ? '' : 's'}.
                          </span>{' '}
                          Tu cuenta será bloqueada temporalmente por 15 minutos o deberás restablecer tu contraseña.
                        </p>
                      </motion.div>
                    )}
                  </div>

                  <div className="flex items-center justify-between" style={{ marginBottom: '24px' }}>
                    <label className="flex items-center gap-2.5 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        style={{ width: '18px', height: '18px' }}
                        className="rounded border-2 border-gray-300 text-[#1e5da8] focus:ring-2 focus:ring-[#1e5da8]/20 cursor-pointer"
                      />
                      <span style={{ fontSize: '14px' }} className="text-gray-600 group-hover:text-gray-900 transition-colors">
                        Recordarme
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowRecuperarModal(true)}
                      style={{ fontSize: '14px' }}
                      className="text-[#1e5da8] hover:text-[#164078] transition-colors font-semibold"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    style={{ height: '52px', fontSize: '16px', borderRadius: '12px' }}
                    className="w-full font-semibold bg-[#1e5da8] hover:bg-[#164078] active:bg-[#0f3562] text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 shadow-lg shadow-[#1e5da8]/25 hover:shadow-xl hover:shadow-[#1e5da8]/35 active:scale-[0.98]"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Ingresando...</span>
                      </>
                    ) : (
                      <>
                        <LogIn className="w-5 h-5" />
                        <span>Ingresar</span>
                      </>
                    )}
                  </button>
                </form>

                <div
                  className="bg-blue-50/80 border border-blue-200 overflow-hidden"
                  style={{ marginTop: '28px', borderRadius: '12px', display: 'none' }}
                >
                  <button
                    type="button"
                    onClick={() => setIsCredentialsOpen(!isCredentialsOpen)}
                    style={{ padding: '14px 16px'}}
                    className="w-full flex items-center justify-between hover:bg-blue-100/50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Sparkles style={{ width: '18px', height: '18px' }} className="text-blue-700 flex-shrink-0" />
                      <span style={{ fontSize: '14px' }} className="font-semibold text-blue-800">Credenciales de prueba</span>
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 text-blue-700 transition-transform duration-300 flex-shrink-0 ${isCredentialsOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  <AnimatePresence>
                    {isCredentialsOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div style={{ padding: '0 16px 16px', fontSize: '13px' }} className="text-blue-800">
                          <p style={{ fontSize: '11px', marginBottom: '8px', marginTop: '4px' }} className="text-blue-600 italic">
                            Clic en cualquier perfil para auto-llenar el formulario
                          </p>
                          <div className="space-y-1.5">
                            {[
                              { email: 'superuser@esap.edu.co', label: 'Super Admin', sublabel: 'Backoffice - Acceso total', icon: <Shield style={{ width: 13, height: 13 }} />, color: '#DC2626', bg: '#FEF2F2' },
                              { email: 'funcionario@esap.edu.co', label: 'Administrativo', sublabel: 'Backoffice - Operaciones', icon: <Users style={{ width: 13, height: 13 }} />, color: '#FF6D00', bg: '#FFF7ED' },
                            ].map(cred => (
                              <button
                                key={cred.email}
                                type="button"
                                onClick={() => {
                                  setEmail(cred.email);
                                  setPassword('Esap2026*');
                                  setErrors({});
                                  setRemainingAttempts(null);
                                  toast.success(`Credenciales de ${cred.label} cargadas`);
                                }}
                                className="w-full text-left flex items-center gap-2.5 hover:bg-blue-100/80 transition-all rounded-lg group"
                                style={{ padding: '7px 10px' }}
                              >
                                <div style={{ width: 28, height: 28, borderRadius: 7, background: cred.bg, color: cred.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                  {cred.icon}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#1E3A5F' }} className="truncate">{cred.email}</div>
                                  <div style={{ fontSize: '11px', color: '#6B7280' }}>{cred.sublabel}</div>
                                </div>
                                <div style={{ fontSize: '10px', padding: '2px 6px', borderRadius: 5, background: cred.bg, color: cred.color, fontWeight: 700, flexShrink: 0 }}>
                                  {cred.label}
                                </div>
                              </button>
                            ))}

                            <div style={{ padding: '6px 0 2px', display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ flex: 1, height: 1, background: '#BFDBFE' }} />
                              <span style={{ fontSize: '10px', fontWeight: 800, color: '#1E40AF' }}>MODULO PTA - FLUJO MULTINIVEL</span>
                              <div style={{ flex: 1, height: 1, background: '#BFDBFE' }} />
                            </div>

                            {[
                              { email: 'gestion.profesoral@esap.edu.co', label: 'G. Profesoral', sublabel: 'N3 - Aprobacion final', icon: <Shield style={{ width: 13, height: 13 }} />, color: '#059669', bg: '#D1FAE5' },
                              { email: 'director.academico@esap.edu.co', label: 'Director Acad.', sublabel: 'Dashboard directivo + SNA', icon: <GraduationCap style={{ width: 13, height: 13 }} />, color: '#7C3AED', bg: '#F3E8FF' },
                              { email: 'decanatura@esap.edu.co', label: 'Decanatura', sublabel: 'N2 - Aprob. por programa', icon: <BookOpen style={{ width: 13, height: 13 }} />, color: '#003DA5', bg: '#EFF6FF' },
                              { email: 'jefatura.antioquia@esap.edu.co', label: 'Jef. Antioquia', sublabel: 'N1 - Territorial Antioquia', icon: <MapPin style={{ width: 13, height: 13 }} />, color: '#D97706', bg: '#FEF3C7' },
                              { email: 'jefatura.valle@esap.edu.co', label: 'Jef. Valle', sublabel: 'N1 - Territorial Valle', icon: <MapPin style={{ width: 13, height: 13 }} />, color: '#D97706', bg: '#FEF3C7' },
                              { email: 'docente@esap.edu.co', label: 'Docente', sublabel: 'Portal - Crea y gestiona PTA', icon: <User style={{ width: 13, height: 13 }} />, color: '#6B7280', bg: '#F3F4F6' },
                            ].map(cred => (
                              <button
                                key={cred.email}
                                type="button"
                                onClick={() => {
                                  setEmail(cred.email);
                                  setPassword('Esap2026*');
                                  setErrors({});
                                  setRemainingAttempts(null);
                                  toast.success(`Credenciales de ${cred.label} cargadas`);
                                }}
                                className="w-full text-left flex items-center gap-2.5 hover:bg-blue-100/80 transition-all rounded-lg group"
                                style={{ padding: '7px 10px' }}
                              >
                                <div style={{ width: 28, height: 28, borderRadius: 7, background: cred.bg, color: cred.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                  {cred.icon}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#1E3A5F' }} className="truncate">{cred.email}</div>
                                  <div style={{ fontSize: '11px', color: '#6B7280' }}>{cred.sublabel}</div>
                                </div>
                                <div style={{ fontSize: '10px', padding: '2px 6px', borderRadius: 5, background: cred.bg, color: cred.color, fontWeight: 700, flexShrink: 0 }}>
                                  {cred.label}
                                </div>
                              </button>
                            ))}
                          </div>

                          <div style={{ marginTop: 10, padding: '8px 10px', borderRadius: 8, background: '#EFF6FF', border: '1px solid #BFDBFE' }} className="flex items-center gap-2">
                            <Lock style={{ width: 13, height: 13 }} className="text-blue-700 flex-shrink-0" />
                            <span style={{ fontSize: '12px', color: '#1E40AF', fontWeight: 600 }}>
                              Contraseña universal: <code className="bg-white px-1.5 py-0.5 rounded text-blue-900 ml-1 font-bold">Esap2026*</code>
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <p style={{ fontSize: '14px', marginTop: '28px' }} className="text-center text-gray-400">
                  ¿No tienes cuenta?{' '}
                  <button className="text-[#1e5da8] hover:text-[#164078] transition-colors font-semibold">
                    Regístrate aquí
                  </button>
                </p>
              </>
            )}
          </motion.div>
        </div>

        <div className="flex-shrink-0 lg:hidden px-6 pb-6">
          <p style={{ fontSize: '12px' }} className="text-center text-gray-300">
            © {new Date().getFullYear()} ESAP - Escuela Superior de Administración Pública
          </p>
        </div>
      </div>

      <motion.div
        data-login-hero-pane
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="esap-login-hero relative overflow-hidden"
      >
        <div className="absolute inset-0">
          <img
            src={loginHeroImage}
            alt=""
            className={`w-full h-full object-cover transition-opacity duration-1000 ${bgLoaded ? 'opacity-100' : 'opacity-0'}`}
          />
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(90deg, rgba(10, 31, 66, 0.7) 0%, rgba(38, 93, 165, 0.8) 46%, rgba(28, 53, 94, 0.8) 100%)',
            }}
          />
        </div>

        <div className="absolute inset-0" style={{
          opacity: 0.075,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.75) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.75) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />

        <div className="relative z-10 flex flex-col justify-between w-full p-10 xl:p-14 2xl:p-20" style={{ padding: '75px' }}>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <ESAPLogo variant="white" className="h-16 xl:h-[74px] w-auto" />
          </motion.div>

          <div className="space-y-8 xl:space-y-10">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
            >
              <h2
                style={{ fontSize: '26px', lineHeight: '1.12' }}
                className="font-extrabold text-white max-w-[360px]"
              >
                Bienvenido a la
                <span
                  className="block"
                  style={{ color: '#67d7f2', fontSize: '26px', lineHeight: '1.12' }}
                >
                  ComUNIdad ESAP
                </span>
              </h2>
              <p style={{ fontSize: '16px', lineHeight: '1.55', marginTop: '24px', color: 'rgba(229, 238, 252, 0.86)' }} className="max-w-[590px]">
                Tu plataforma integral para todos los servicios académicos, administrativos y comunitarios de la ESAP.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="flex flex-wrap gap-3"
            >
              {[
                { icon: <Users style={{ width: '16px', height: '16px' }} />, label: '+17 mil', sub: 'Estudiantes' },
                { icon: <GraduationCap style={{ width: '16px', height: '16px' }} />, label: '66 años', sub: 'de Historia' },
                { icon: <Shield style={{ width: '16px', height: '16px' }} />, label: '84%', sub: 'Cobertura' },
              ].map((s) => (
                <div
                  key={s.label}
                  className="flex items-center gap-3 text-white"
                  style={{
                    padding: '12px 20px',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.12)',
                    border: '1px solid rgba(255, 255, 255, 0.18)',
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  <div className="opacity-70">{s.icon}</div>
                  <div>
                    <div style={{ fontSize: '17px' }} className="font-bold leading-none">{s.label}</div>
                    <div style={{ fontSize: '13px', color: 'rgba(219, 230, 248, 0.78)' }} className="mt-1">{s.sub}</div>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="space-y-5"
          >
            <div className="flex items-center gap-4">
              <div className="flex -space-x-2.5">
                {['A', 'B', 'C', 'D', 'E'].map((letter) => (
                  <div
                    key={letter}
                    className="w-9 h-9 rounded-full bg-white/15 backdrop-blur-sm border-2 border-white/20 flex items-center justify-center"
                    style={{ fontSize: '13px' }}
                  >
                    <span className="text-white font-semibold">{letter}</span>
                  </div>
                ))}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <TrendingUp style={{ width: '14px', height: '14px' }} className="text-emerald-400" />
                  <span style={{ fontSize: '14px' }} className="text-white/90 font-medium">Más de 17,000 usuarios activos</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10">
              <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.38)' }}>
                © {new Date().getFullYear()} ESAP - Escuela Superior de Administración Pública. Todos los derechos reservados.
              </p>
            </div>
          </motion.div>
        </div>
      </motion.div>

      <ModalRecuperarContrasena
        isOpen={showRecuperarModal}
        onClose={() => setShowRecuperarModal(false)}
      />
    </div>
  );
}

function parseMicrosoftCallback(search: string): MicrosoftCallbackResponse {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);

  return {
    code: params.get('code') || '',
    state: params.get('state') || '',
    error: params.get('error') || undefined,
    errorDescription: params.get('error_description') || undefined,
  };
}

function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  // UUID v4 format
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function generateCodeVerifier(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  if (typeof crypto !== 'undefined' && crypto.subtle && typeof crypto.subtle.digest === 'function') {
    const digest = await crypto.subtle.digest('SHA-256', data);
    return base64UrlEncode(new Uint8Array(digest));
  }
  return base64UrlEncode(sha256Bytes(data));
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function rightRotate(value: number, amount: number): number {
  return (value >>> amount) | (value << (32 - amount));
}

function sha256Bytes(input: Uint8Array): Uint8Array {
  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];
  const h = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];

  const bitLenHi = Math.floor((input.length * 8) / 0x100000000);
  const bitLenLo = (input.length * 8) >>> 0;

  const withOne = input.length + 1;
  const paddedLen = ((withOne + 8 + 63) >> 6) << 6;
  const msg = new Uint8Array(paddedLen);
  msg.set(input);
  msg[input.length] = 0x80;

  msg[paddedLen - 8] = (bitLenHi >>> 24) & 0xff;
  msg[paddedLen - 7] = (bitLenHi >>> 16) & 0xff;
  msg[paddedLen - 6] = (bitLenHi >>> 8) & 0xff;
  msg[paddedLen - 5] = bitLenHi & 0xff;
  msg[paddedLen - 4] = (bitLenLo >>> 24) & 0xff;
  msg[paddedLen - 3] = (bitLenLo >>> 16) & 0xff;
  msg[paddedLen - 2] = (bitLenLo >>> 8) & 0xff;
  msg[paddedLen - 1] = bitLenLo & 0xff;

  const w = new Uint32Array(64);

  for (let offset = 0; offset < msg.length; offset += 64) {
    for (let i = 0; i < 16; i += 1) {
      const j = offset + i * 4;
      w[i] = ((msg[j] << 24) | (msg[j + 1] << 16) | (msg[j + 2] << 8) | msg[j + 3]) >>> 0;
    }

    for (let i = 16; i < 64; i += 1) {
      const s0 = rightRotate(w[i - 15], 7) ^ rightRotate(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rightRotate(w[i - 2], 17) ^ rightRotate(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let a = h[0];
    let b = h[1];
    let c = h[2];
    let d = h[3];
    let e = h[4];
    let f = h[5];
    let g = h[6];
    let hh = h[7];

    for (let i = 0; i < 64; i += 1) {
      const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (hh + S1 + ch + k[i] + w[i]) >>> 0;
      const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      hh = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h[0] = (h[0] + a) >>> 0;
    h[1] = (h[1] + b) >>> 0;
    h[2] = (h[2] + c) >>> 0;
    h[3] = (h[3] + d) >>> 0;
    h[4] = (h[4] + e) >>> 0;
    h[5] = (h[5] + f) >>> 0;
    h[6] = (h[6] + g) >>> 0;
    h[7] = (h[7] + hh) >>> 0;
  }

  const out = new Uint8Array(32);
  for (let i = 0; i < h.length; i += 1) {
    out[i * 4] = (h[i] >>> 24) & 0xff;
    out[i * 4 + 1] = (h[i] >>> 16) & 0xff;
    out[i * 4 + 2] = (h[i] >>> 8) & 0xff;
    out[i * 4 + 3] = h[i] & 0xff;
  }
  return out;
}

async function exchangeMicrosoftCode(params: {
  tenantId: string;
  clientId: string;
  code: string;
  redirectUri: string;
  codeVerifier: string;
}): Promise<{ id_token?: string }> {
  const body = new URLSearchParams({
    client_id: params.clientId,
    grant_type: 'authorization_code',
    code: params.code,
    redirect_uri: params.redirectUri,
    code_verifier: params.codeVerifier,
    scope: 'openid profile email',
  });

  const response = await fetch(
    `https://login.microsoftonline.com/${params.tenantId}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    },
  );

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_description || data.error || 'No se pudo obtener token de Microsoft.');
  }

  return data as { id_token?: string };
}

function resolveMicrosoftErrorMessage(errorCode?: string, errorDescription?: string): string {
  const code = (errorCode || '').toLowerCase();

  const messages: Record<string, string> = {
    access_denied: 'Cancelaste el inicio de sesión con Microsoft.',
    temporarily_unavailable: 'Microsoft no está disponible en este momento. Intenta nuevamente en unos minutos.',
    invalid_request: 'La solicitud de inicio de sesión es inválida. Revisa la configuración de la aplicación.',
    unauthorized_client: 'La aplicación no está autorizada en Microsoft Entra ID.',
    interaction_required: 'Microsoft requiere una interacción adicional. Intenta iniciar sesión nuevamente.',
    login_required: 'Debes autenticarte en Microsoft para continuar.',
    consent_required: 'Debes autorizar permisos de Microsoft para continuar.',
  };

  if (messages[code]) {
    return messages[code];
  }

  return errorDescription || errorCode || 'No fue posible completar el inicio de sesión con Microsoft.';
}

function decodeJwtPayload(token: string): Record<string, any> {
  const parts = token.split('.');
  if (parts.length < 2) throw new Error('Token de Microsoft inválido.');

  const base64Url = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64Url.padEnd(Math.ceil(base64Url.length / 4) * 4, '=');
  const decoded = atob(padded);
  return JSON.parse(decoded) as Record<string, any>;
}
