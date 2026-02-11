import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, Eye, EyeOff, Loader2, LogIn, Building2, TrendingUp, Sparkles, ArrowLeft, ChevronDown } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { ESAPLogo } from '../assets/ESAPLogo';
import { ModalRecuperarContrasena } from './ModalRecuperarContrasena';

interface Usuario {
  id: string;
  nombre: string;
  tipo: 'externo' | 'interno';
  email: string;
  rol?: string;
}

interface LoginPageProps {
  onLoginExitoso: (usuario: Usuario) => void;
  onVolver: () => void;
}

export function LoginPage({ onLoginExitoso, onVolver }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [isCredentialsOpen, setIsCredentialsOpen] = useState(false);
  const [showRecuperarModal, setShowRecuperarModal] = useState(false);

  // IMPORTANTE: Forzar tema claro en el login SIEMPRE
  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    
    if (!email) {
      newErrors.email = 'El correo electrónico es requerido';
    } else if (!email.includes('@')) {
      newErrors.email = 'Ingrese un correo válido';
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
      // Simular autenticación con delay realista
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      // Validar credenciales específicas
      const emailLower = email.toLowerCase();
      
      // ✅ USUARIOS OPTIMIZADOS - Solo usuarios esenciales para testing
      // Reducido de 18 usuarios a 2 usuarios principales
      const usuariosValidos = [
        'superuser@esap.edu.co',      // Super Administrador - Acceso completo a todos los módulos
        'funcionario@esap.edu.co',    // Funcionario Estándar - Testing de usuario final
      ];

      const todosLosUsuarios = usuariosValidos;

      // Verificar si el email existe
      if (!todosLosUsuarios.includes(emailLower)) {
        toast.error('Usuario no encontrado', {
          description: '❌ El correo electrónico ingresado no está registrado.',
          duration: 5000,
        });
        setErrors({ ...errors, email: 'Este usuario no está registrado' });
        setIsLoading(false);
        return;
      }

      // Verificar contraseña (debe ser exactamente "Esap2026*")
      if (password !== 'Esap2026*') {
        toast.error('Contraseña incorrecta', {
          description: '🔑 La contraseña ingresada no es válida. Por favor verifica tu contraseña.',
          duration: 5000,
        });
        setErrors({ ...errors, password: 'La contraseña es incorrecta' });
        setIsLoading(false);
        return;
      }

      // Determinar tipo de usuario y redirigir
      let usuario: Usuario;
      
      if (emailLower === 'estudiantes@esap.edu.co' || 
          emailLower === 'estudiante@esap.edu.co' || 
          emailLower === 'funcionario@esap.edu.co') {
        // Usuarios específicos del Portal Transaccional
        const nombres: Record<string, string> = {
          'estudiantes@esap.edu.co': 'Estudiante Demo',
          'estudiante@esap.edu.co': 'Estudiante Demo',
          'funcionario@esap.edu.co': 'Diego Trujillo', // ✅ Usuario administrativo de Planeación
        };

        usuario = {
          id: emailLower === 'funcionario@esap.edu.co' ? 'func-001' : 'user-ext-001',
          nombre: nombres[emailLower] || 'Usuario Portal',
          tipo: 'externo', // ✅ Tipo externo para ir al Portal Transaccional
          email: emailLower,
          rol: emailLower === 'funcionario@esap.edu.co' ? 'Administrativo' : 'Estudiante',
        };

        console.log('✅ Usuario creado para Portal Transaccional:', usuario);

        toast.success(`✅ ¡Bienvenido ${nombres[emailLower]}!`, {
          description: 'Acceso al Portal Transaccional concedido',
          duration: 3500,
        });
      } else {
        // Usuario interno → Backoffice
        const roles: Record<string, string> = {
          'docentes@esap.edu.co': 'Docente',
          'director@esap.edu.co': 'Director',
          'admin@esap.edu.co': 'Administrador',
          'superuser@esap.edu.co': 'Super Usuario',
          'rector@esap.edu.co': 'Rector',
          'gestion.legal@esap.edu.co': 'Gestión Legal',
          'ocig@esap.edu.co': 'OCIG',
          'c.disciplinario@esap.edu.co': 'Control Disciplinario',
          'cerlaboral@esap.edu.co': 'Certificados Laborales',
          'arqempresarial@esap.edu.co': 'Arquitectura Empresarial',
          'ar.empresarial@esap.edu.co': 'Arquitectura Empresarial',
          'gestion.profesoral@esap.edu.co': 'Gestión Profesoral',
          'registro.academico@esap.edu.co': 'Registro Académico',
        };

        usuario = {
          id: 'user-int-001',
          nombre: roles[emailLower] || 'Administrador',
          tipo: 'interno',
          email: emailLower,
          rol: roles[emailLower] || 'Administrador',
        };

        console.log('✅ Usuario creado para Backoffice Administrativo:', usuario);

        toast.success(`⚡ ¡Bienvenido ${roles[emailLower] || 'Administrador'}!`, {
          description: 'Acceso al Backoffice Administrativo concedido',
          duration: 3500,
        });
      }

      // Guardar sesión si "Recordarme" está activado
      if (rememberMe) {
        localStorage.setItem('esap-remember-session', JSON.stringify({ email: emailLower }));
      }

      // Llamar al callback con el usuario autenticado
      onLoginExitoso(usuario);
    } catch (error) {
      toast.error('Error al iniciar sesión', {
        description: 'Ocurrió un error inesperado. Intenta nuevamente.',
      });
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
              <ESAPLogo variant="color" className="h-10 w-auto" />
            </div>

            {/* Back to Home Button */}
            <motion.button
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              onClick={onVolver}
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
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mb-5"
            >
              <button
                type="button"
                onClick={() => handleSocialLogin('Microsoft')}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all group"
              >
                <Building2 className="w-5 h-5 text-gray-600 group-hover:text-gray-900" />
                <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Iniciar sesión con Microsoft</span>
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
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">O continúa con tu correo</span>
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
                  
                  {/* Credenciales de Prueba */}
                  <div className="pt-2 border-t border-blue-200 space-y-2">
                    <div>
                      <p className="font-bold text-blue-900 mb-1.5 flex items-center gap-1">
                        🏢 BACKOFFICE ADMINISTRATIVO
                      </p>
                      <code className="block px-2 py-1 bg-white rounded text-[10px]">superuser@esap.edu.co <span className="text-blue-600">(Super Admin - Acceso total)</span></code>
                    </div>

                    <div className="pt-2 border-t border-blue-200">
                      <p className="font-bold text-blue-900 mb-1.5 flex items-center gap-1">
                        👥 PORTAL TRANSACCIONAL
                      </p>
                      <code className="block px-2 py-1 bg-white rounded text-[10px]">funcionario@esap.edu.co <span className="text-blue-600">(Funcionario ESAP)</span></code>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* Footer */}
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