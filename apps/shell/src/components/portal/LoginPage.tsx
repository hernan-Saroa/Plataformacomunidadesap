import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, Eye, EyeOff, Loader2, LogIn, Building2, TrendingUp, Sparkles, ArrowLeft, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { ESAPLogo } from '../assets/ESAPLogo';
import { ModalRecuperarContrasena } from './ModalRecuperarContrasena';
import { authService } from '../../services/api/authService';
import { de } from 'date-fns/locale';

interface MicrosoftCallbackResponse {
  code: string;
  state: string;
  error?: string;
  errorDescription?: string;
}

interface Usuario {
  id: string;
  nombre: string;
  tipo: 'externo' | 'interno';
  email: string;
  rol?: string;
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
  const showMicrosoftLogin = false;
  const showCredentialLogin = !showMicrosoftLogin || loginOptions !== 'microsoft';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [isCredentialsOpen, setIsCredentialsOpen] = useState(false);
  const [showRecuperarModal, setShowRecuperarModal] = useState(false);
  const [isMicrosoftLoading, setIsMicrosoftLoading] = useState(false);
  const [microsoftLoginError, setMicrosoftLoginError] = useState<string | null>(null);

  // IMPORTANTE: Forzar tema claro en el login SIEMPRE
  useEffect(() => {
    document.documentElement.classList.remove('dark');
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
        console.error('Error en callback de Microsoft:', error);
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
    localStorage.removeItem('esap-sesion-activa');
    console.log('🗑️ LocalStorage limpiado');

    try {
      console.log('📡 Llamando a authService.login');
      
      // Llamar a la API de autenticación real
      const response = await authService.login({
        email: email.toLowerCase(),
        password,
        rememberMe,
      });

      console.log('✅ [6] Auth service response received:', response);

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

      console.log('🔄 [7] Calling onLogin handler with user data');
      // Pasar los datos del usuario autenticado al handler de login (igual que el LoginPage de esap)
      onLogin(response.user, response.accessToken, rememberMe);
      console.log('✅ [8] onLogin handler completed');
    } catch (error: any) {
      console.error('❌ Error de autenticación:', error);
      const statusCode =
        error?.statusCode ??
        error?.response?.data?.statusCode ??
        error?.response?.status;
      const errorMessage =
        typeof error?.message === 'string' && error.message.trim()
          ? error.message
          : 'Ocurrió un error inesperado. Intenta nuevamente.';

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
        console.error('Error iniciando OAuth Microsoft:', error);
        setIsMicrosoftLoading(false);
        toast.error('No se pudo iniciar el login con Microsoft', {
          description: error?.message || 'Revisa la configuración OAuth.',
        });
      }
    };

    void launchMicrosoftAuth();
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      {/* Contenedor con max-width para pantallas grandes */}
      <div className="w-full max-w-[1600px] mx-auto flex min-h-screen">
        {/* Left Side - Login Form */}
        <div className="flex-1 flex items-center justify-center py-8 px-4 lg:px-8 xl:justify-end xl:pr-20 2xl:pr-32 relative overflow-hidden">
          {/* Subtle background decoration */}
          <div className="absolute inset-0 opacity-[0.015]">
            <div className="absolute top-1/4 -left-20 w-96 h-96 bg-[#1e5da8] rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-[#1e5da8] rounded-full blur-3xl" />
          </div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full max-w-md relative z-10"
          >
            {/* Logo - Mobile Only */}
            <div className="lg:hidden flex justify-center mb-6">
              <ESAPLogo variant="color" className="h-10 w-auto" />
            </div>

            {/* Back to Home Button */}
            <motion.button
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              onClick={onBackToHome}
              className="flex items-center gap-2 text-gray-600 hover:text-[#003DA5] transition-colors mb-6 group"
            >
              <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
              <span className="font-medium">Volver al inicio</span>
            </motion.button>

            {/* Header */}
            <div className="mb-5">
              <motion.h1 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-gray-900 mb-2"
              >
                Iniciar Sesión
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-gray-600"
              >
                Accede a tu cuenta ESAP
              </motion.p>
            </div>

            {/* Social Login Button */}
            {showMicrosoftLogin && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mb-5"
              >
                {microsoftLoginError && (
                  <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    {microsoftLoginError}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => handleSocialLogin('Microsoft')}
                  disabled={isLoading || isMicrosoftLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all group"
                >
                  <Building2 className="w-5 h-5 text-gray-600 group-hover:text-gray-900" />
                  <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                    {isMicrosoftLoading ? 'Conectando con Microsoft...' : 'Iniciar sesión con Microsoft'}
                  </span>
                </button>
              </motion.div>
            )}

            {showCredentialLogin && (
              <>
                {/* Divider */}
                {showMicrosoftLogin && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="relative mb-5"
                  >
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-white text-gray-500">O continúa con tu correo</span>
                    </div>
                  </motion.div>
                )}

                {/* Login Form */}
                <motion.form
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  onSubmit={handleSubmit}
                  className="space-y-4"
                >
                  {/* Email Field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Correo Electrónico
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setErrors({ ...errors, email: undefined });
                        }}
                        placeholder="correo@esap.edu.co"
                        className={`w-full pl-12 pr-4 py-2.5 border-2 rounded-xl transition-all outline-none ${
                          errors.email
                            ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                            : 'border-gray-300 focus:border-[#003DA5] focus:ring-4 focus:ring-[#003DA5]/10'
                        }`}
                        disabled={isLoading}
                      />
                    </div>
                    {errors.email && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="text-red-500 text-sm mt-1.5"
                      >
                        {errors.email}
                      </motion.p>
                    )}
                  </div>

                  {/* Password Field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Contraseña
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setErrors({ ...errors, password: undefined });
                        }}
                        placeholder="••••••••"
                        className={`w-full pl-12 pr-12 py-2.5 border-2 rounded-xl transition-all outline-none ${
                          errors.password
                            ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                            : 'border-gray-300 focus:border-[#003DA5] focus:ring-4 focus:ring-[#003DA5]/10'
                        }`}
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {errors.password && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="text-red-500 text-sm mt-1.5"
                      >
                        {errors.password}
                      </motion.p>
                    )}
                  </div>

                  {/* Remember Me & Forgot Password */}
                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded border-2 border-gray-300 text-[#003DA5] focus:ring-2 focus:ring-[#003DA5]/20 cursor-pointer"
                      />
                      <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
                        Recordarme
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowRecuperarModal(true)}
                      className="text-sm text-[#003DA5] hover:text-[#1a4d8a] transition-colors font-semibold"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-[#1e5da8] hover:bg-[#1a4d8a] active:bg-[#164078] text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 shadow-lg shadow-[#1e5da8]/20 hover:shadow-xl hover:shadow-[#1e5da8]/30 active:scale-[0.98]"
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
                </motion.form>

                {/* Credenciales de Prueba - Collapsible */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  style={{ display: 'none' }}
                  className="mt-5 bg-blue-50 border-2 border-blue-200 rounded-xl overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setIsCredentialsOpen(!isCredentialsOpen)}
                    className="w-full p-3 flex items-center justify-between hover:bg-blue-100/50 transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-blue-900" />
                      <span className="text-xs font-semibold text-blue-900">Credenciales de prueba</span>
                    </div>
                    <ChevronDown 
                      className={`w-4 h-4 text-blue-900 transition-transform duration-300 ${
                        isCredentialsOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  
                  <motion.div
                    initial={false}
                    animate={{
                      height: isCredentialsOpen ? 'auto' : 0,
                      opacity: isCredentialsOpen ? 1 : 0
                    }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 pb-3 space-y-1.5 text-xs text-blue-800">
                      <p className="font-semibold text-blue-900 mb-2">📧 Email: cualquier correo válido</p>
                      <p className="font-semibold text-blue-900 mb-2">🔒 Contraseña: cualquier texto (min. 6 caracteres)</p>
                      
                      {/* Usuarios Externos - Portal */}
                      <div className="pt-2 border-t border-blue-200">
                        <p className="font-bold text-blue-900 mb-1.5 flex items-center gap-1">
                          👥 PORTAL TRANSACCIONAL (Externos)
                        </p>
                        <code className="block px-2 py-1 bg-white rounded text-[10px] mb-1">estudiantes@esap.edu.co</code>
                        <code className="block px-2 py-1 bg-white rounded text-[10px] mb-1">egresados@esap.edu.co</code>
                        <code className="block px-2 py-1 bg-white rounded text-[10px] mb-1">docentes@esap.edu.co</code>
                        <code className="block px-2 py-1 bg-white rounded text-[10px] mb-1">funcionario@esap.edu.co <span className="text-blue-600">(Funcionario)</span></code>
                        <code className="block px-2 py-1 bg-white rounded text-[10px]">planta@esap.edu.co <span className="text-blue-600">(Docente Planta)</span></code>
                      </div>

                      {/* Usuarios Internos - Backoffice */}
                      <div className="pt-2 border-t border-blue-200">
                        <p className="font-bold text-blue-900 mb-1.5 flex items-center gap-1">
                          🏢 BACKOFFICE ADMINISTRATIVO (Internos)
                        </p>
                        <p className="text-[10px] text-blue-700 mb-1.5 italic">✅ Acceso total a todos los módulos:</p>
                        <code className="block px-2 py-1 bg-white rounded text-[10px] mb-1">superuser@esap.edu.co <span className="text-blue-600">(Super Admin)</span></code>
                        <code className="block px-2 py-1 bg-white rounded text-[10px] mb-1">rector@esap.edu.co <span className="text-blue-600">(Rector)</span></code>
                        <code className="block px-2 py-1 bg-white rounded text-[10px] mb-1">director@esap.edu.co <span className="text-blue-600">(Director)</span></code>
                        <code className="block px-2 py-1 bg-white rounded text-[10px] mb-1">admin@esap.edu.co <span className="text-blue-600">(Administrador)</span></code>
                        <code className="block px-2 py-1 bg-white rounded text-[10px] mb-1">cerlaboral@esap.edu.co <span className="text-blue-600">(Certificados)</span></code>
                        <code className="block px-2 py-1 bg-white rounded text-[10px] mb-1">ar.empresarial@esap.edu.co <span className="text-blue-600">(Arq. Empresarial)</span></code>
                        <code className="block px-2 py-1 bg-white rounded text-[10px] mb-1">arqempresarial@esap.edu.co <span className="text-blue-600">(Arq. Empresarial)</span></code>
                        
                        <p className="text-[10px] text-orange-700 mb-1.5 mt-3 italic">⚠️ Acceso exclusivo a un solo módulo:</p>
                        <code className="block px-2 py-1 bg-orange-50 border border-orange-200 rounded text-[10px] mb-1">ocig@esap.edu.co <span className="text-orange-700">(🔍 Solo Control Interno OCIG)</span></code>
                        <code className="block px-2 py-1 bg-orange-50 border border-orange-200 rounded text-[10px] mb-1">c.disciplinario@esap.edu.co <span className="text-orange-700">(⚖️ Solo Control Disciplinario)</span></code>
                        <code className="block px-2 py-1 bg-orange-50 border border-orange-200 rounded text-[10px] mb-1">gestion.profesoral@esap.edu.co <span className="text-orange-700">(📚 Solo Gestión Profesoral)</span></code>
                        <code className="block px-2 py-1 bg-orange-50 border border-orange-200 rounded text-[10px] mb-1">gestion.legal@esap.edu.co <span className="text-orange-700">(⚖️ Solo Gestión Legal)</span></code>
                        <code className="block px-2 py-1 bg-orange-50 border border-orange-200 rounded text-[10px] mb-1">registro.academico@esap.edu.co <span className="text-orange-700">(📚 Solo Registro Académico)</span></code>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              </>
            )}

            {/* Footer */}
            {showCredentialLogin && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
                className="text-center text-sm text-gray-600 mt-5"
              >
                ¿No tienes cuenta?{' '}
                <button className="text-[#003DA5] hover:text-[#1a4d8a] transition-colors">
                  Regístrate aquí
                </button>
              </motion.p>
            )}
          </motion.div>
        </div>

        {/* Right Side - Welcome Section (Desktop Only) */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="hidden lg:flex flex-1 bg-gradient-to-br from-[#1e5da8] via-[#2563a8] to-[#1a4d8a] relative overflow-hidden"
        >
          {/* Animated Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <motion.div
              className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
            <motion.div
              className="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl"
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.2, 0.4, 0.2],
              }}
              transition={{
                duration: 10,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          </div>

          {/* Grid Pattern */}
          <div className="absolute inset-0 opacity-5" style={{
            backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
            backgroundSize: '50px 50px'
          }} />

          {/* Content */}
          <div className="relative z-10 flex flex-col justify-between p-6 lg:p-8 xl:p-12 2xl:p-16 text-white w-full">
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex items-start"
            >
              <ESAPLogo variant="white" className="h-16 w-auto" />
            </motion.div>

            {/* Main Content */}
            <div className="space-y-4 lg:space-y-6 xl:space-y-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="space-y-3 lg:space-y-4"
              >
                <h2 className="text-2xl lg:text-3xl xl:text-4xl 2xl:text-5xl text-white/95 leading-tight max-w-lg">
                  Bienvenido a La Comunidad ESAP
                </h2>
              </motion.div>

              {/* Social Proof */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                className="flex items-center gap-3 lg:gap-4 pt-3 lg:pt-4"
              >
                <div className="flex -space-x-2 lg:-space-x-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="w-8 h-8 lg:w-9 lg:h-9 xl:w-10 xl:h-10 rounded-full bg-white/20 backdrop-blur-sm border-2 border-[#1e5da8] flex items-center justify-center text-xs lg:text-sm text-white"
                    >
                      {String.fromCharCode(64 + i)}
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-1.5 lg:gap-2">
                  <TrendingUp className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-white/80" />
                  <span className="text-xs lg:text-sm text-white/90">Más de 17k personas confían en ESAP</span>
                </div>
              </motion.div>
            </div>

            {/* Footer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1 }}
              className="text-xs lg:text-sm text-white/60"
            >
              © {new Date().getFullYear()} ESAP - Escuela Superior de Administración Pública
            </motion.div>
          </div>
        </motion.div>
      </div>
      
      {/* Modal de Recuperar Contraseña */}
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
