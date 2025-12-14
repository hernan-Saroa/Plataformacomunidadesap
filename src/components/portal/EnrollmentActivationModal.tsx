/**
 * MODAL: ACTIVACIÓN DE CUENTA - ENROLAMIENTO QR
 * Flujo completo de 3 pasos para activación de usuarios
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  CreditCard, 
  Mail, 
  Lock, 
  CheckCircle2, 
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  Shield
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { MOCK_USERS } from '@/data/mockUsers';

interface EnrollmentActivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (userData: any) => void;
  initialDocument?: string;
}

type Step = 'document' | 'verification' | 'password' | 'success';

type ErrorType = 
  | 'document-not-found'
  | 'already-activated'
  | 'invalid-code'
  | 'expired-code'
  | 'password-mismatch'
  | 'weak-password'
  | null;

export function EnrollmentActivationModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  initialDocument = '' 
}: EnrollmentActivationModalProps) {
  const [step, setStep] = useState<Step>('document');
  const [document, setDocument] = useState(initialDocument);
  const [verificationCode, setVerificationCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<ErrorType>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [generatedCode, setGeneratedCode] = useState('');
  const [codeExpiry, setCodeExpiry] = useState<Date | null>(null);

  // Actualizar documento cuando cambie initialDocument
  useEffect(() => {
    if (initialDocument) {
      setDocument(initialDocument);
    }
  }, [initialDocument]);

  // Reset modal cuando se cierra
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setStep('document');
        setDocument(initialDocument || '');
        setVerificationCode('');
        setPassword('');
        setConfirmPassword('');
        setError(null);
        setUserData(null);
        setGeneratedCode('');
        setCodeExpiry(null);
      }, 300);
    }
  }, [isOpen, initialDocument]);

  // Función para generar código de 6 dígitos
  const generateVerificationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  // PASO 1: Validar documento
  const handleDocumentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // Simular llamada a API
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Buscar usuario por documento
    const user = MOCK_USERS.find(u => u.document === document);

    if (!user) {
      setError('document-not-found');
      setIsLoading(false);
      return;
    }

    // Verificar si ya está activado (simulamos que si tiene status 'active' ya está activado)
    // En producción, esto vendría del backend
    const isAlreadyActivated = user.status === 'active' && user.email.includes('@esap.edu.co');
    
    if (isAlreadyActivated) {
      setError('already-activated');
      setIsLoading(false);
      return;
    }

    // Usuario encontrado, generar código
    const code = generateVerificationCode();
    const expiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutos

    setGeneratedCode(code);
    setCodeExpiry(expiry);
    setUserData(user);
    
    // Simular envío de correo
    console.log(`📧 Código enviado a ${user.email}: ${code}`);
    
    setIsLoading(false);
    setStep('verification');
  };

  // PASO 2: Verificar código
  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    await new Promise(resolve => setTimeout(resolve, 800));

    // Verificar expiración
    if (codeExpiry && new Date() > codeExpiry) {
      setError('expired-code');
      setIsLoading(false);
      return;
    }

    // Verificar código
    if (verificationCode !== generatedCode) {
      setError('invalid-code');
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
    setStep('password');
  };

  // PASO 3: Crear contraseña
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validar contraseñas coincidan
    if (password !== confirmPassword) {
      setError('password-mismatch');
      return;
    }

    // Validar fortaleza de contraseña
    if (password.length < 8) {
      setError('weak-password');
      return;
    }

    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1200));

    // Activación exitosa
    setIsLoading(false);
    setStep('success');

    // Notificar éxito después de 2 segundos
    setTimeout(() => {
      onSuccess(userData);
      onClose();
    }, 2500);
  };

  // Reenviar código
  const handleResendCode = () => {
    const newCode = generateVerificationCode();
    const newExpiry = new Date(Date.now() + 5 * 60 * 1000);
    
    setGeneratedCode(newCode);
    setCodeExpiry(newExpiry);
    setVerificationCode('');
    setError(null);
    
    console.log(`📧 Nuevo código enviado: ${newCode}`);
  };

  // Renderizar error
  const renderError = () => {
    if (!error) return null;

    const errorMessages = {
      'document-not-found': 'Documento no encontrado en el sistema. Por favor verifica el número ingresado.',
      'already-activated': 'Esta cuenta ya ha sido activada. Usa la opción "Iniciar Sesión".',
      'invalid-code': 'Código de verificación incorrecto. Por favor intenta nuevamente.',
      'expired-code': 'El código ha expirado. Solicita uno nuevo.',
      'password-mismatch': 'Las contraseñas no coinciden. Por favor verifica.',
      'weak-password': 'La contraseña debe tener al menos 8 caracteres.'
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 mb-4"
      >
        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm text-red-800 font-medium">
            {errorMessages[error]}
          </p>
        </div>
      </motion.div>
    );
  };

  // Renderizar paso 1: Documento
  const renderDocumentStep = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <CreditCard className="w-8 h-8 text-white" strokeWidth={2.5} />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          Ingresa tu Documento
        </h3>
        <p className="text-sm text-gray-600">
          Validaremos tu información en el sistema ESAP
        </p>
      </div>

      {renderError()}

      <form onSubmit={handleDocumentSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Número de Identificación
          </label>
          <Input
            type="text"
            placeholder="Ej: 1001234567"
            value={document}
            onChange={(e) => {
              setDocument(e.target.value.replace(/\D/g, ''));
              setError(null);
            }}
            maxLength={12}
            className="h-12 text-base"
            disabled={isLoading}
            autoFocus
          />
          <p className="text-xs text-gray-500 mt-2">
            Ingresa tu número de cédula sin puntos ni espacios
          </p>
        </div>

        <Button
          type="submit"
          disabled={document.length < 6 || isLoading}
          className="w-full h-12 bg-gradient-to-r from-[#003DA5] to-[#0052CC] hover:from-[#002d7a] hover:to-[#003DA5] text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Verificando...
            </>
          ) : (
            <>
              Continuar
              <ArrowRight className="w-5 h-5 ml-2" />
            </>
          )}
        </Button>
      </form>
    </motion.div>
  );

  // Renderizar paso 2: Código de verificación
  const renderVerificationStep = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Mail className="w-8 h-8 text-white" strokeWidth={2.5} />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          Verifica tu Correo
        </h3>
        <p className="text-sm text-gray-600 mb-1">
          Hemos enviado un código de 6 dígitos a:
        </p>
        <p className="text-sm font-bold text-[#003DA5]">
          {userData?.email}
        </p>
      </div>

      {renderError()}

      <form onSubmit={handleCodeSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Código de Verificación
          </label>
          <Input
            type="text"
            placeholder="000000"
            value={verificationCode}
            onChange={(e) => {
              setVerificationCode(e.target.value.replace(/\D/g, ''));
              setError(null);
            }}
            maxLength={6}
            className="h-12 text-center text-2xl font-bold tracking-widest"
            disabled={isLoading}
            autoFocus
          />
          <p className="text-xs text-gray-500 mt-2 text-center">
            El código expira en 5 minutos
          </p>
          
          {/* Helper para desarrollo - REMOVER EN PRODUCCIÓN */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs font-mono text-yellow-800 text-center">
                🔐 Código de prueba: <strong>{generatedCode}</strong>
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep('document')}
            className="flex-1 h-12 rounded-xl"
            disabled={isLoading}
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Volver
          </Button>
          <Button
            type="submit"
            disabled={verificationCode.length !== 6 || isLoading}
            className="flex-1 h-12 bg-gradient-to-r from-[#003DA5] to-[#0052CC] hover:from-[#002d7a] hover:to-[#003DA5] text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Verificando...
              </>
            ) : (
              <>
                Verificar
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>
        </div>

        <div className="text-center pt-2">
          <button
            type="button"
            onClick={handleResendCode}
            className="text-sm text-[#003DA5] hover:underline font-medium"
            disabled={isLoading}
          >
            ¿No recibiste el código? Reenviar
          </button>
        </div>
      </form>
    </motion.div>
  );

  // Renderizar paso 3: Contraseña
  const renderPasswordStep = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Lock className="w-8 h-8 text-white" strokeWidth={2.5} />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          Crea tu Contraseña
        </h3>
        <p className="text-sm text-gray-600">
          Protege tu cuenta con una clave segura
        </p>
      </div>

      {renderError()}

      <form onSubmit={handlePasswordSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Contraseña
          </label>
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Mínimo 8 caracteres"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              className="h-12 text-base pr-12"
              disabled={isLoading}
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Confirmar Contraseña
          </label>
          <div className="relative">
            <Input
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Repite tu contraseña"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setError(null);
              }}
              className="h-12 text-base pr-12"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showConfirmPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Indicador de fortaleza */}
        {password && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
            <div className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-medium text-blue-900 mb-1">
                  Requisitos de seguridad:
                </p>
                <ul className="space-y-1">
                  <li className={`text-xs flex items-center gap-1 ${password.length >= 8 ? 'text-green-700' : 'text-gray-600'}`}>
                    {password.length >= 8 ? '✓' : '○'} Mínimo 8 caracteres
                  </li>
                  <li className={`text-xs flex items-center gap-1 ${password && confirmPassword && password === confirmPassword ? 'text-green-700' : 'text-gray-600'}`}>
                    {password && confirmPassword && password === confirmPassword ? '✓' : '○'} Las contraseñas coinciden
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep('verification')}
            className="flex-1 h-12 rounded-xl"
            disabled={isLoading}
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Volver
          </Button>
          <Button
            type="submit"
            disabled={!password || !confirmPassword || isLoading}
            className="flex-1 h-12 bg-gradient-to-r from-[#003DA5] to-[#0052CC] hover:from-[#002d7a] hover:to-[#003DA5] text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Activando...
              </>
            ) : (
              <>
                Activar Cuenta
                <CheckCircle2 className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>
        </div>
      </form>
    </motion.div>
  );

  // Renderizar paso 4: Éxito
  const renderSuccessStep = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, type: "spring" }}
      className="text-center py-6"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl"
      >
        <CheckCircle2 className="w-10 h-10 text-white" strokeWidth={2.5} />
      </motion.div>

      <h3 className="text-2xl font-bold text-gray-900 mb-3">
        ¡Cuenta Activada!
      </h3>
      
      <div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-2xl p-6 mb-6">
        <p className="text-base text-gray-700 mb-4">
          Bienvenido/a a ComUNIdad ESAP
        </p>
        <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
          <span className="font-bold text-[#003DA5]">{userData?.firstName}</span>
          <span>•</span>
          <span>{userData?.email}</span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Redirigiendo a tu cuenta...</span>
      </div>
    </motion.div>
  );

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
        >
          {/* Header */}
          <div className="relative bg-gradient-to-r from-[#003DA5] to-[#0052CC] p-6 pb-12">
            {/* Close button */}
            {step !== 'success' && (
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors duration-200"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            )}

            {/* Progress indicator */}
            <div className="flex items-center justify-center gap-2 mb-4">
              {['document', 'verification', 'password'].map((s, index) => (
                <div
                  key={s}
                  className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                    step === s || 
                    (s === 'document' && ['verification', 'password', 'success'].includes(step)) ||
                    (s === 'verification' && ['password', 'success'].includes(step))
                      ? 'bg-white'
                      : 'bg-white/30'
                  }`}
                />
              ))}
            </div>

            {/* Logo */}
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-2xl font-bold text-[#003DA5]">E</span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 -mt-6">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <AnimatePresence mode="wait">
                {step === 'document' && renderDocumentStep()}
                {step === 'verification' && renderVerificationStep()}
                {step === 'password' && renderPasswordStep()}
                {step === 'success' && renderSuccessStep()}
              </AnimatePresence>
            </div>
          </div>

          {/* Footer info */}
          {step !== 'success' && (
            <div className="px-6 pb-6">
              <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-2">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Shield className="w-4 h-4 text-green-600" />
                </div>
                <p className="text-xs text-gray-600">
                  Tus datos están protegidos con encriptación de extremo a extremo
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
