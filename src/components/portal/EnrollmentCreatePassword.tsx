/**
 * PANTALLA 5: CREAR CONTRASEÑA
 * Usuario crea su contraseña con validación de fortaleza en tiempo real
 */

import { motion, AnimatePresence } from 'motion/react';
import { Lock, ArrowLeft, Eye, EyeOff, CheckCircle, XCircle, Sparkles, RefreshCw, Copy } from 'lucide-react';
import { Button } from '../ui/button';
import { useState } from 'react';
import { toast } from 'sonner@2.0.3';
import { copyToClipboard } from '@/utils/browser';

interface EnrollmentCreatePasswordProps {
  userName: string;
  email: string;
  onBack: () => void;
  onCreate: (password: string) => void;
  isCreating: boolean;
}

type PasswordStrength = 'weak' | 'medium' | 'strong';

interface PasswordRequirement {
  label: string;
  met: boolean;
  regex: RegExp;
}

export function EnrollmentCreatePassword({ 
  userName,
  email,
  onBack,
  onCreate,
  isCreating 
}: EnrollmentCreatePasswordProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');

  // Requisitos de contraseña
  const requirements: PasswordRequirement[] = [
    { label: 'Mínimo 8 caracteres', met: password.length >= 8, regex: /.{8,}/ },
    { label: 'Una letra mayúscula', met: /[A-Z]/.test(password), regex: /[A-Z]/ },
    { label: 'Una letra minúscula', met: /[a-z]/.test(password), regex: /[a-z]/ },
    { label: 'Un número', met: /[0-9]/.test(password), regex: /[0-9]/ },
    { label: 'Un carácter especial (!@#$%^&*)', met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password), regex: /[!@#$%^&*]/ },
  ];

  const metRequirements = requirements.filter(r => r.met).length;
  
  // Calcular fortaleza
  const getPasswordStrength = (): PasswordStrength => {
    if (metRequirements <= 2) return 'weak';
    if (metRequirements <= 4) return 'medium';
    return 'strong';
  };

  const strength = getPasswordStrength();

  const strengthConfig = {
    weak: { 
      color: 'bg-red-500', 
      text: 'Débil', 
      textColor: 'text-red-600',
      width: '33%' 
    },
    medium: { 
      color: 'bg-yellow-500', 
      text: 'Media', 
      textColor: 'text-yellow-600',
      width: '66%' 
    },
    strong: { 
      color: 'bg-green-500', 
      text: 'Fuerte', 
      textColor: 'text-green-600',
      width: '100%' 
    },
  };

  // Generar contraseña segura
  const generateSecurePassword = () => {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*';
    
    const all = uppercase + lowercase + numbers + special;
    
    let password = '';
    // Asegurar al menos uno de cada tipo
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];
    
    // Completar hasta 12 caracteres
    for (let i = 0; i < 8; i++) {
      password += all[Math.floor(Math.random() * all.length)];
    }
    
    // Mezclar
    return password.split('').sort(() => Math.random() - 0.5).join('');
  };

  const handleGeneratePassword = () => {
    const generated = generateSecurePassword();
    setPassword(generated);
    setConfirmPassword(generated);
    setShowPassword(true);
    setShowConfirmPassword(true);
    setError('');
    
    toast.success('Contraseña generada', {
      description: 'Usa esta contraseña segura o crea la tuya propia',
      duration: 4000
    });
  };

  const handleCopyPassword = async () => {
    const success = await copyToClipboard(password);
    if (success) {
      toast.success('Contraseña copiada', {
        description: 'Guárdala en un lugar seguro'
      });
    } else {
      toast.error('Error al copiar', {
        description: 'No se pudo copiar la contraseña'
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones
    if (!password) {
      setError('Por favor crea una contraseña');
      return;
    }
    
    if (metRequirements < 5) {
      setError('La contraseña debe cumplir todos los requisitos');
      return;
    }
    
    if (!confirmPassword) {
      setError('Por favor confirma tu contraseña');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    
    // Todo OK, proceder
    onCreate(password);
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (error) setError('');
  };

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    if (error) setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex flex-col">
      {/* Header con logo */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full bg-white shadow-sm py-6"
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between max-w-md mx-auto">
            {/* Botón Atrás */}
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-600 hover:text-[#003DA5] transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Atrás</span>
            </button>

            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#003DA5] to-[#0052CC] rounded-lg flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">E</span>
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold text-gray-900">ESAP</span>
              </div>
            </div>

            {/* Espaciador */}
            <div className="w-16" />
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-md">
          {/* Progress Indicator */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-8"
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div className="w-16 h-1 bg-green-500" />
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div className="w-16 h-1 bg-[#003DA5]" />
              <div className="w-8 h-8 bg-[#003DA5] rounded-full flex items-center justify-center text-white text-sm font-bold">
                3
              </div>
            </div>
            <p className="text-center text-xs text-gray-500">
              Paso 3 de 3: Crear contraseña
            </p>
          </motion.div>

          {/* Card Principal */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
          >
            {/* Header Card */}
            <div className="bg-gradient-to-br from-green-600 to-green-700 p-8 text-white text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl mb-4"
              >
                <Lock className="w-10 h-10" strokeWidth={2.5} />
              </motion.div>
              
              <h2 className="text-2xl font-bold mb-2">
                Crea tu Contraseña
              </h2>
              <p className="text-white/90 text-sm">
                ¡Hola {userName}! Protege tu cuenta con una contraseña segura
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 sm:p-8">
              {/* Generate Password Button */}
              <div className="mb-6">
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  className="w-full h-12 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-medium text-sm rounded-xl transition-all duration-300 flex items-center justify-center gap-2 group"
                >
                  <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                  <span>Generar Contraseña Segura</span>
                  <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                </button>
              </div>

              {/* Password Input */}
              <div className="mb-6">
                <label 
                  htmlFor="password" 
                  className="block text-sm font-semibold text-gray-900 mb-3"
                >
                  Contraseña
                </label>
                
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    placeholder="Crea tu contraseña"
                    disabled={isCreating}
                    className={`w-full h-14 pl-14 pr-24 text-base font-medium border-2 rounded-xl transition-all ${
                      error && error.includes('contraseña')
                        ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-100' 
                        : password
                          ? `border-${strengthConfig[strength].color.replace('bg-', '')} focus:ring-4 focus:ring-${strength === 'weak' ? 'red' : strength === 'medium' ? 'yellow' : 'green'}-100`
                          : 'border-gray-200 focus:border-[#003DA5] focus:ring-4 focus:ring-blue-100'
                    } ${isCreating ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}`}
                    style={{ outline: 'none' }}
                    autoFocus
                  />

                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    {password && (
                      <button
                        type="button"
                        onClick={handleCopyPassword}
                        className="text-gray-400 hover:text-[#003DA5] transition-colors"
                        title="Copiar contraseña"
                      >
                        <Copy className="w-5 h-5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Password Strength Indicator */}
                {password && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-600">Fortaleza:</span>
                      <span className={`text-xs font-bold ${strengthConfig[strength].textColor}`}>
                        {strengthConfig[strength].text}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: strengthConfig[strength].width }}
                        transition={{ duration: 0.3 }}
                        className={`h-full ${strengthConfig[strength].color} transition-all duration-300`}
                      />
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Requirements Checklist */}
              {password && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200"
                >
                  <p className="text-xs font-semibold text-gray-700 mb-3">Requisitos:</p>
                  <div className="space-y-2">
                    {requirements.map((req, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center gap-2"
                      >
                        {req.met ? (
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-gray-300 flex-shrink-0" />
                        )}
                        <span className={`text-xs ${req.met ? 'text-green-700 font-medium' : 'text-gray-500'}`}>
                          {req.label}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Confirm Password Input */}
              <div className="mb-6">
                <label 
                  htmlFor="confirmPassword" 
                  className="block text-sm font-semibold text-gray-900 mb-3"
                >
                  Confirmar Contraseña
                </label>
                
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                    placeholder="Confirma tu contraseña"
                    disabled={isCreating}
                    className={`w-full h-14 pl-14 pr-14 text-base font-medium border-2 rounded-xl transition-all ${
                      error && error.includes('coinciden')
                        ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-100' 
                        : confirmPassword && password === confirmPassword
                          ? 'border-green-500 focus:border-green-500 focus:ring-4 focus:ring-green-100'
                          : 'border-gray-200 focus:border-[#003DA5] focus:ring-4 focus:ring-blue-100'
                    } ${isCreating ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}`}
                    style={{ outline: 'none' }}
                  />

                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                {/* Match Indicator */}
                {confirmPassword && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 flex items-center gap-2"
                  >
                    {password === confirmPassword ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm font-medium text-green-700">Las contraseñas coinciden</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-red-500" />
                        <span className="text-sm font-medium text-red-600">Las contraseñas no coinciden</span>
                      </>
                    )}
                  </motion.div>
                )}
              </div>

              {/* Error Message */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mb-6 p-4 bg-red-50 rounded-xl border border-red-200 flex items-start gap-3"
                  >
                    <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm font-medium text-red-700">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isCreating || metRequirements < 5 || password !== confirmPassword}
                className="w-full h-14 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 flex items-center justify-center gap-3 group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Creando tu cuenta...</span>
                  </>
                ) : (
                  <>
                    <span>Crear Mi Cuenta</span>
                    <CheckCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  </>
                )}
              </Button>
            </form>
          </motion.div>

          {/* Security Note */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100"
          >
            <div className="flex gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <svg className="w-5 h-5 text-[#003DA5]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-[#003DA5] mb-1">Tu seguridad es importante</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• Usa una contraseña única que no uses en otros sitios</li>
                  <li>• Guárdala en un lugar seguro</li>
                  <li>• Nunca la compartas con nadie</li>
                </ul>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}