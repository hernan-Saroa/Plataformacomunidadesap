import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Mail, Lock, Eye, EyeOff, Loader2, LogIn, Building2, GraduationCap, TrendingUp, Users, Award, Sparkles, Home, ArrowLeft, ChevronDown } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import esapLogo from 'figma:asset/1a688049d0ee8e121a6f2fff3a4cd08b5a2451ba.png';
import esapLogoWhite from 'figma:asset/2eabfe85218557ad27ece74d963c4a3b61b716be.png';
import { ChangePasswordModal } from './ChangePasswordModal';
import { authService } from '../../services/api/authService';

interface LoginPageProps {
  onLogin: (user: any, accessToken: string, rememberMe?: boolean) => void;
  onBackToHome?: () => void;
}

export function LoginPage({ onLogin, onBackToHome }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [isCredentialsOpen, setIsCredentialsOpen] = useState(false);

  // IMPORTANTE: Forzar tema claro en el login SIEMPRE
  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  // Pre-llenar email si había una sesión recordada (opcional)
  useEffect(() => {
    const savedSession = localStorage.getItem('esap-remember-session');
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        setEmail(session.email);
        setRememberMe(true);
      } catch (error) {
        console.error('Error al cargar sesión guardada:', error);
      }
    }
  }, []);

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

    console.log('🚀 Starting login process');

    if (!validateForm()) {
      console.log('❌ Form validation failed');
      toast.error('Por favor corrija los errores en el formulario');
      return;
    }

    setIsLoading(true);

    try {
      console.log('📡 Calling authService.login with:', {
        email: email.toLowerCase(),
        password: password ? '***' : '',
        rememberMe
      });

      // Llamar a la API de autenticación real
      const response = await authService.login({
        email: email.toLowerCase(),
        password,
        rememberMe,
      });

      console.log('✅ Auth service response:', response);

      // Determinar el tipo de usuario basado en el email para mostrar mensaje personalizado
      const emailLower = email.toLowerCase();
      const validCredentials = [
        { email: 'superuser@esap.edu.co', password: '123456', type: 'superuser' },
        { email: 'rector@esap.edu.co', password: 'rector123', type: 'rector' },
        { email: 'director@esap.edu.co', password: 'director123', type: 'director' },
        { email: 'admin@esap.edu.co', password: '123456', type: 'admin' },
        { email: 'estudiantes@esap.edu.co', password: '123456', type: 'student' },
        { email: 'cerlaboral@esap.edu.co', password: '123456', type: 'certificados' },
        { email: 'funcionario@esap.edu.co', password: '123456', type: 'funcionario' },
        { email: 'ar.empresarial@esap.edu.co', password: '123456', type: 'arquitectura' },
        { email: 'arqempresarial@esap.edu.co', password: '123456', type: 'arquitectura' },
        { email: 'planta@esap.edu.co', password: '123456', type: 'planta-profesoral' }, // ✅ NUEVO: Gestión Profesoral
      ];

      // // Verificar si el email existe en las credenciales válidas
      // const userExists = validCredentials.find(cred => cred.email === emailLower);

      // if (!userExists) {
      //   // El usuario no existe
      //   toast.error('Usuario no encontrado', {
      //     description: '❌ El correo electrónico ingresado no está registrado. Por favor verifica tu usuario.',
      //     duration: 5000,
      //   });
      //   setErrors({ ...errors, email: 'Este usuario no está registrado' });
      //   setIsLoading(false);
      //   return;
      // }

      // // El usuario existe, verificar la contraseña
      // if (userExists.password !== password) {
      //   // La contraseña es incorrecta
      //   toast.error('Contraseña incorrecta', {
      //     description: '🔑 La contraseña ingresada no es válida. Por favor verifica tu contraseña.',
      //     duration: 5000,
      //   });
      //   setErrors({ ...errors, password: 'La contraseña es incorrecta' });
      //   setIsLoading(false);
      //   return;
      // }

      // // Si llegamos aquí, las credenciales son válidas
      // if (emailLower === 'superuser@esap.edu.co' || emailLower === 'rector@esap.edu.co' || emailLower === 'director@esap.edu.co') {
      //   toast.success('⭐ ¡Bienvenido Super User!', {
      //     description: 'Acceso a AMBOS sistemas concedido - Backoffice + Portal',
      //     duration: 3500,
      //   });
      // } else if (emailLower === 'admin@esap.edu.co') {
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
      } else if (emailLower === 'estudiante@esap.edu.co') {
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
      }

      console.log('🔄 Calling onLogin handler with user data');
      // Pasar los datos del usuario autenticado al handler de login
      onLogin(response.user, response.accessToken, rememberMe);
      console.log('✅ onLogin handler completed');

    } catch (error: any) {
      console.error('❌ Error de autenticación:', error);

      // Manejar diferentes tipos de errores
      if (error.response?.status === 401) {
        toast.error('Credenciales incorrectas', {
          description: 'El correo electrónico o contraseña son incorrectos.',
          duration: 5000,
        });
        setErrors({
          email: 'Verifica tu correo electrónico',
          password: 'Verifica tu contraseña'
        });
      } else if (error.response?.status === 400) {
        toast.error('Datos inválidos', {
          description: 'Por favor verifica la información ingresada.',
          duration: 5000,
        });
      } else {
        toast.error('Error de conexión', {
          description: `Error: ${error.message || 'Desconocido'}`,
          duration: 5000,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = (provider: string) => {
    toast.info(`Inicio de sesión con ${provider} próximamente disponible`);
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
              <img 
                src={esapLogo} 
                alt="ESAP" 
                className="h-12 w-auto object-contain"
              />
            </div>

            {/* Back to Home Button - Solo si onBackToHome está disponible */}
            {onBackToHome && (
              <motion.button
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                onClick={onBackToHome}
                className="flex items-center gap-2 text-[--esap-gray-600] hover:text-[--esap-primary] transition-colors mb-6 group"
              >
                <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
                <span className="font-medium">Volver al inicio</span>
              </motion.button>
            )}

            {/* Header */}
            <div className="mb-5">
              <motion.h1 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-[--esap-gray-900] mb-2"
              >
                Iniciar Sesión
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-[--esap-gray-600]"
              >
                Ingresa con tus credenciales institucionales para continuar
              </motion.p>
            </div>

            {/* Social Login Button */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mb-5"
            >
              <button
                type="button"
                onClick={() => handleSocialLogin('Microsoft')}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-[--esap-gray-300] rounded-xl hover:bg-[--esap-gray-50] hover:border-[--esap-gray-400] transition-all group"
              >
                <Building2 className="w-5 h-5 text-[--esap-gray-600] group-hover:text-[--esap-gray-900]" />
                <span className="text-sm font-medium text-[--esap-gray-700] group-hover:text-[--esap-gray-900]">Iniciar sesión con Microsoft</span>
              </button>
            </motion.div>

            {/* Divider */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="relative mb-5"
            >
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[--esap-gray-300]" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-[--esap-gray-500]">O continúa con tu correo</span>
              </div>
            </motion.div>

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
                <label className="block text-sm font-medium text-[--esap-gray-900] mb-2">
                  Correo Institucional
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[--esap-gray-400]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setErrors({ ...errors, email: undefined });
                    }}
                    placeholder="usuario@esap.edu.co"
                    className={`w-full pl-12 pr-4 py-2.5 border-2 rounded-xl transition-all outline-none ${
                      errors.email
                        ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                        : 'border-[--esap-gray-300] focus:border-[--esap-primary] focus:ring-4 focus:ring-[--esap-primary]/10'
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
                <label className="block text-sm font-medium text-[--esap-gray-900] mb-2">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[--esap-gray-400]" />
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
                        : 'border-[--esap-gray-300] focus:border-[--esap-primary] focus:ring-4 focus:ring-[--esap-primary]/10'
                    }`}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[--esap-gray-400] hover:text-[--esap-gray-600] transition-colors"
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
                    className="w-4 h-4 rounded border-2 border-[--esap-gray-300] text-[--esap-primary] focus:ring-2 focus:ring-[--esap-primary]/20 cursor-pointer"
                  />
                  <span className="text-sm text-[--esap-gray-700] group-hover:text-[--esap-gray-900] transition-colors">
                    Recordarme
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsForgotPasswordOpen(true)}
                  className="text-sm text-[--esap-primary] hover:text-[#1a4d8a] transition-colors font-semibold"
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
                    <span>Verificando...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    <span>Iniciar Sesión</span>
                  </>
                )}
              </button>
            </motion.form>

            {/* Credenciales de Prueba - Collapsible */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="mt-5 bg-blue-50 border-2 border-blue-200 rounded-xl overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setIsCredentialsOpen(!isCredentialsOpen)}
                className="w-full p-3 flex items-center justify-between hover:bg-blue-100/50 transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-900" />
                  <span className="text-xs font-semibold text-blue-900">Credenciales de Prueba</span>
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
                  <div className="flex items-center justify-between bg-gradient-to-r from-purple-100 to-blue-100 px-2 py-1 rounded border border-purple-300">
                    <span className="font-bold text-purple-900">⭐ Super User:</span>
                    <code className="px-2 py-0.5 bg-white rounded font-mono text-[10px] sm:text-xs font-bold text-purple-700">superuser@esap.edu.co</code>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">🔧 Administrador:</span>
                    <code className="px-2 py-0.5 bg-white rounded font-mono text-[10px] sm:text-xs">admin@esap.edu.co</code>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">🎓 Estudiante:</span>
                    <code className="px-2 py-0.5 bg-white rounded font-mono text-[10px] sm:text-xs">estudiante@esap.edu.co</code>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">🟣 Docente Planta:</span>
                    <code className="px-2 py-0.5 bg-white rounded font-mono text-[10px] sm:text-xs">planta@esap.edu.co</code>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">🔵 Docente Cátedra:</span>
                    <code className="px-2 py-0.5 bg-white rounded font-mono text-[10px] sm:text-xs">catedra@esap.edu.co</code>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">📋 Certificados:</span>
                    <code className="px-2 py-0.5 bg-white rounded font-mono text-[10px] sm:text-xs">cerlaboral@esap.edu.co</code>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">🏛️ Arq. Empresarial:</span>
                    <code className="px-2 py-0.5 bg-white rounded font-mono text-[10px] sm:text-xs">arqempresarial@esap.edu.co</code>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">⚖️ Gestión Legal:</span>
                    <code className="px-2 py-0.5 bg-white rounded font-mono text-[10px] sm:text-xs">gestion.legal@esap.edu.co</code>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">🔍 Control Interno:</span>
                    <code className="px-2 py-0.5 bg-white rounded font-mono text-[10px] sm:text-xs">c.internoge@esap.edu.co</code>
                  </div>
                  <div className="flex items-center justify-between bg-gradient-to-r from-purple-50 to-purple-100 px-2 py-1 rounded border border-purple-300">
                    <span className="font-bold text-purple-900">⚖️ Funcionario (Procesos):</span>
                    <code className="px-2 py-0.5 bg-white rounded font-mono text-[10px] sm:text-xs font-bold text-purple-700">funcionario@esap.edu.co</code>
                  </div>
                  <div className="flex items-center justify-between pt-1.5 border-t border-blue-200">
                    <span className="font-medium">🔑 Contraseña:</span>
                    <code className="px-2 py-0.5 bg-white rounded font-mono font-bold">123456</code>
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* Footer */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
              className="text-center text-sm text-[--esap-gray-600] mt-5"
            >
              ¿No tienes cuenta?{' '}
              <button className="text-[--esap-primary] hover:text-[#1a4d8a] transition-colors">
                Contáctanos
              </button>
            </motion.p>
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
            >
              <img 
                src={esapLogoWhite} 
                alt="ESAP" 
                className="h-12 lg:h-14 xl:h-16 2xl:h-20 w-auto object-contain drop-shadow-2xl"
              />
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

              {/* Stats Grid */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="grid grid-cols-3 gap-3 lg:gap-4 xl:gap-6 max-w-xl"
              >



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

        {/* Modal de Recuperar Contraseña */}
        <ChangePasswordModal
          isOpen={isForgotPasswordOpen}
          onClose={() => setIsForgotPasswordOpen(false)}
          mode="forgot-password"
        />
      </div>
    </div>
  );
}
