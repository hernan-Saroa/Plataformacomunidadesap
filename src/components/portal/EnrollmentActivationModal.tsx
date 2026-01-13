/**
 * MODAL: ACTIVACIÓN DE CUENTA - ENROLAMIENTO QR
 * ═══════════════════════════════════════════════════════════════════
 * 
 * FLUJOS SOPORTADOS:
 * 
 * FLUJO 1 - Usuario NO registrado en BD:
 *   1. Ingresa documento → NO encontrado
 *   2. Formulario de inscripción completo (acorde a módulo Personas)
 *   3. Verificación con código de 6 dígitos enviado al correo
 *   4. Éxito → Usuario inscrito y registrado
 * 
 * FLUJO 2 - Usuario YA inscrito en BD:
 *   1. Ingresa documento → Encontrado
 *   2. Verificación con código de 6 dígitos enviado al correo
 *   3. Creación de contraseña segura
 *   4. Éxito → Cuenta activada
 * 
 * Diseño World-Class siguiendo estándares ESAP
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
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
  Shield,
  UserPlus,
  Send,
  Info,
  User,
  Phone,
  MapPin,
  Calendar,
  Building2,
  FileText,
  IdCard
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { MOCK_USERS_WITH_SEDES } from '@/data/mockUsersWithSedes';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

interface EnrollmentActivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (userData: any) => void;
  initialDocument?: string;
}

// Tipos de pasos
type Step = 
  | 'document'              // Paso 1: Ingresar documento
  | 'registration-form'     // Paso 2a: Formulario de inscripción (si NO está registrado)
  | 'verification'          // Paso 2b/3a: Código de verificación
  | 'password'              // Paso 3b: Crear contraseña (solo si YA está registrado)
  | 'success';              // Paso final: Éxito

type ErrorType = 
  | 'document-not-found'
  | 'already-activated'
  | 'invalid-code'
  | 'expired-code'
  | 'password-mismatch'
  | 'weak-password'
  | 'invalid-email'
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
  const [isNewUser, setIsNewUser] = useState(false); // Flag para saber si es usuario nuevo
  
  // Datos del formulario de inscripción (para usuarios nuevos)
  const [registrationData, setRegistrationData] = useState({
    firstName: '',
    lastName: '',
    documentType: 'CC',
    email: '',
    phone: '',
    address: '',
    city: '',
    birthDate: '',
    gender: ''
  });

  // Tipos de documento
  const documentTypes = [
    { value: 'CC', label: 'Cédula de Ciudadanía' },
    { value: 'CE', label: 'Cédula de Extranjería' },
    { value: 'TI', label: 'Tarjeta de Identidad' },
    { value: 'PAS', label: 'Pasaporte' },
    { value: 'PPT', label: 'Permiso Protección Temporal' }
  ];

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
        setIsNewUser(false);
        setRegistrationData({
          firstName: '',
          lastName: '',
          documentType: 'CC',
          email: '',
          phone: '',
          address: '',
          city: '',
          birthDate: '',
          gender: ''
        });
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
    const user = MOCK_USERS_WITH_SEDES.find(u => u.documentNumber === document);

    if (!user) {
      // Usuario NO encontrado → Flujo de inscripción
      setIsNewUser(true);
      setIsLoading(false);
      setStep('registration-form');
      return;
    }

    // Usuario encontrado → Verificar si ya está activado
    const isAlreadyActivated = user.status === 'active' && user.email.includes('@esap.edu.co');
    
    if (isAlreadyActivated) {
      setError('already-activated');
      setIsLoading(false);
      return;
    }

    // Usuario encontrado pero NO activado → Enviar código
    const code = generateVerificationCode();
    const expiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutos

    setGeneratedCode(code);
    setCodeExpiry(expiry);
    setUserData(user);
    setIsNewUser(false);
    
    console.log(`📧 Código enviado a ${user.email}: ${code}`);
    
    setIsLoading(false);
    setStep('verification');
  };

  // PASO 2a: Enviar formulario de inscripción
  const handleRegistrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validar email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registrationData.email)) {
      setError('invalid-email');
      return;
    }

    setIsLoading(true);

    // Simular llamada a API para crear usuario
    await new Promise(resolve => setTimeout(resolve, 1200));

    // Generar código de verificación
    const code = generateVerificationCode();
    const expiry = new Date(Date.now() + 5 * 60 * 1000);

    setGeneratedCode(code);
    setCodeExpiry(expiry);

    // Crear datos de usuario temporal
    const newUserData = {
      id: `user-new-${Date.now()}`,
      personId: `person-new-${Date.now()}`,
      firstName: registrationData.firstName,
      lastName: registrationData.lastName,
      email: registrationData.email,
      phone: registrationData.phone,
      documentType: registrationData.documentType,
      documentNumber: document,
      birthDate: registrationData.birthDate,
      address: registrationData.address,
      city: registrationData.city,
      gender: registrationData.gender,
      status: 'pending',
      roles: [{ id: 'role-temp', name: 'Usuario Nuevo', code: 'USER_NEW' }]
    };

    setUserData(newUserData);

    console.log(`📧 Código de inscripción enviado a ${registrationData.email}: ${code}`);
    console.log('📝 Datos de inscripción:', newUserData);

    setIsLoading(false);
    setStep('verification');
  };

  // PASO 2b/3a: Verificar código
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

    // Si es usuario nuevo → Ir directamente a éxito (ya está inscrito)
    if (isNewUser) {
      setStep('success');
      setTimeout(() => {
        onSuccess(userData);
        onClose();
      }, 2500);
    } else {
      // Si es usuario existente → Ir a crear contraseña
      setStep('password');
    }
  };

  // PASO 3b: Crear contraseña (solo para usuarios existentes)
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
    
    const email = isNewUser ? registrationData.email : userData?.email;
    console.log(`📧 Nuevo código enviado a ${email}: ${newCode}`);
  };

  // Renderizar error
  const renderError = () => {
    if (!error) return null;

    const errorMessages = {
      'document-not-found': 'Documento no encontrado en el sistema.',
      'already-activated': 'Esta cuenta ya ha sido activada. Usa la opción "Iniciar Sesión".',
      'invalid-code': 'Código de verificación incorrecto. Por favor intenta nuevamente.',
      'expired-code': 'El código ha expirado. Solicita uno nuevo.',
      'password-mismatch': 'Las contraseñas no coinciden. Por favor verifica.',
      'weak-password': 'La contraseña debe tener al menos 8 caracteres.',
      'invalid-email': 'Por favor ingresa un correo electrónico válido.'
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2 mb-4"
      >
        <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-red-800 font-medium">
          {errorMessages[error]}
        </p>
      </motion.div>
    );
  };

  // Obtener información del paso actual
  const getStepInfo = () => {
    switch (step) {
      case 'document':
        return {
          icon: <CreditCard className="w-6 h-6 text-white" />,
          iconBg: 'from-blue-500 to-blue-600',
          title: 'Ingresa tu Documento',
          description: 'Validaremos tu información en el sistema ESAP'
        };
      case 'registration-form':
        return {
          icon: <UserPlus className="w-6 h-6 text-white" />,
          iconBg: 'from-purple-500 to-purple-600',
          title: 'Completa tu Inscripción',
          description: 'Ingresa tus datos personales para registrarte'
        };
      case 'verification':
        return {
          icon: <Mail className="w-6 h-6 text-white" />,
          iconBg: 'from-green-500 to-green-600',
          title: 'Verifica tu Correo',
          description: isNewUser 
            ? `Código enviado a: ${registrationData.email}`
            : `Código enviado a: ${userData?.email || ''}`
        };
      case 'password':
        return {
          icon: <Lock className="w-6 h-6 text-white" />,
          iconBg: 'from-orange-500 to-orange-600',
          title: 'Crea tu Contraseña',
          description: 'Protege tu cuenta con una clave segura'
        };
      case 'success':
        return {
          icon: <CheckCircle2 className="w-6 h-6 text-white" />,
          iconBg: 'from-emerald-500 to-emerald-600',
          title: isNewUser ? '¡Inscripción Exitosa!' : '¡Cuenta Activada!',
          description: 'Bienvenido/a a ComUNIdad ESAP'
        };
    }
  };

  const stepInfo = getStepInfo();

  // RENDERIZAR PASO 1: Documento
  const renderDocumentStep = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
      {renderError()}

      {/* Mensaje informativo con ejemplos de cédulas */}
      {process.env.NODE_ENV === 'development' && !error && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2 mb-4">
          <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs font-medium text-blue-900 mb-1">
              Cédulas de prueba válidas:
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setDocument('52123456')}
                className="text-xs bg-white px-2 py-1 rounded border border-blue-300 hover:bg-blue-100 transition-colors"
              >
                52123456
              </button>
              <button
                type="button"
                onClick={() => setDocument('1098765432')}
                className="text-xs bg-white px-2 py-1 rounded border border-blue-300 hover:bg-blue-100 transition-colors"
              >
                1098765432
              </button>
              <button
                type="button"
                onClick={() => setDocument('31456789')}
                className="text-xs bg-white px-2 py-1 rounded border border-blue-300 hover:bg-blue-100 transition-colors"
              >
                31456789
              </button>
            </div>
            <p className="text-xs text-gray-600 mt-1.5">
              Cédula no registrada: <strong>99999999</strong>
            </p>
          </div>
        </div>
      )}

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
            className="h-11"
            disabled={isLoading}
            autoFocus
          />
          <p className="text-xs text-gray-500 mt-1.5">
            Ingresa tu número de cédula sin puntos ni espacios
          </p>
        </div>

        <Button
          type="submit"
          disabled={document.length < 6 || isLoading}
          className="w-full h-11 bg-gradient-to-r from-[#003DA5] to-[#0052CC] hover:from-[#002d7a] hover:to-[#003DA5] text-white font-medium shadow-lg hover:shadow-xl transition-all duration-300"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Verificando...
            </>
          ) : (
            <>
              Continuar
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </form>
    </motion.div>
  );

  // RENDERIZAR PASO 2a: Formulario de Inscripción
  const renderRegistrationForm = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="max-h-[500px] overflow-y-auto pr-2"
    >
      {renderError()}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2 mb-4">
        <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-800">
          Completa tus datos para inscribirte en ComUNIdad ESAP
        </p>
      </div>

      <form onSubmit={handleRegistrationSubmit} className="space-y-4">
        {/* Documento (readonly) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <IdCard className="w-4 h-4 inline mr-1.5" />
            Número de Documento
          </label>
          <div className="grid grid-cols-3 gap-2">
            <Select
              value={registrationData.documentType}
              onValueChange={(value) => setRegistrationData({ ...registrationData, documentType: value })}
            >
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {documentTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="text"
              value={document}
              className="h-11 col-span-2 bg-gray-100"
              disabled
            />
          </div>
        </div>

        {/* Nombres y Apellidos */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4 inline mr-1.5" />
              Nombres
            </label>
            <Input
              type="text"
              placeholder="Juan Alberto"
              value={registrationData.firstName}
              onChange={(e) => setRegistrationData({ ...registrationData, firstName: e.target.value })}
              className="h-11"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Apellidos
            </label>
            <Input
              type="text"
              placeholder="Pérez González"
              value={registrationData.lastName}
              onChange={(e) => setRegistrationData({ ...registrationData, lastName: e.target.value })}
              className="h-11"
              required
            />
          </div>
        </div>

        {/* Email y Teléfono */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Mail className="w-4 h-4 inline mr-1.5" />
            Correo Electrónico
          </label>
          <Input
            type="email"
            placeholder="tu.correo@ejemplo.com"
            value={registrationData.email}
            onChange={(e) => setRegistrationData({ ...registrationData, email: e.target.value })}
            className="h-11"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Recibirás el código de verificación aquí
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Phone className="w-4 h-4 inline mr-1.5" />
            Teléfono
          </label>
          <Input
            type="tel"
            placeholder="+57 300 123 4567"
            value={registrationData.phone}
            onChange={(e) => setRegistrationData({ ...registrationData, phone: e.target.value })}
            className="h-11"
            required
          />
        </div>

        {/* Dirección y Ciudad */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <MapPin className="w-4 h-4 inline mr-1.5" />
            Dirección
          </label>
          <Input
            type="text"
            placeholder="Cra 7 # 32-45"
            value={registrationData.address}
            onChange={(e) => setRegistrationData({ ...registrationData, address: e.target.value })}
            className="h-11"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Building2 className="w-4 h-4 inline mr-1.5" />
            Ciudad
          </label>
          <Input
            type="text"
            placeholder="Bogotá D.C."
            value={registrationData.city}
            onChange={(e) => setRegistrationData({ ...registrationData, city: e.target.value })}
            className="h-11"
            required
          />
        </div>

        {/* Fecha de Nacimiento y Género */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1.5" />
              Fecha de Nacimiento
            </label>
            <Input
              type="date"
              value={registrationData.birthDate}
              onChange={(e) => setRegistrationData({ ...registrationData, birthDate: e.target.value })}
              className="h-11"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Género
            </label>
            <Select
              value={registrationData.gender}
              onValueChange={(value) => setRegistrationData({ ...registrationData, gender: value })}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Selecciona" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="M">Masculino</SelectItem>
                <SelectItem value="F">Femenino</SelectItem>
                <SelectItem value="O">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Botones */}
        <div className="flex gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep('document')}
            className="flex-1 h-11"
            disabled={isLoading}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            className="flex-1 h-11 bg-gradient-to-r from-[#003DA5] to-[#0052CC] hover:from-[#002d7a] hover:to-[#003DA5] text-white font-medium shadow-lg hover:shadow-xl transition-all duration-300"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                Enviar Código
                <Send className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </form>
    </motion.div>
  );

  // RENDERIZAR PASO 2b/3a: Código de Verificación
  const renderVerificationStep = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
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
            className="h-11 text-center text-2xl font-bold tracking-widest"
            disabled={isLoading}
            autoFocus
          />
          <p className="text-xs text-gray-500 mt-1.5 text-center">
            El código expira en 5 minutos
          </p>
          
          {/* Helper para desarrollo */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-3 p-2.5 bg-yellow-50 border border-yellow-200 rounded-lg">
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
            onClick={() => setStep(isNewUser ? 'registration-form' : 'document')}
            className="flex-1 h-11"
            disabled={isLoading}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          <Button
            type="submit"
            disabled={verificationCode.length !== 6 || isLoading}
            className="flex-1 h-11 bg-gradient-to-r from-[#003DA5] to-[#0052CC] hover:from-[#002d7a] hover:to-[#003DA5] text-white font-medium shadow-lg hover:shadow-xl transition-all duration-300"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verificando...
              </>
            ) : (
              <>
                Verificar
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>

        <div className="text-center pt-1">
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

  // RENDERIZAR PASO 3b: Contraseña
  const renderPasswordStep = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
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
              className="h-11 pr-10"
              disabled={isLoading}
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
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
              className="h-11 pr-10"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showConfirmPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Indicador de fortaleza */}
        {password && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5">
            <div className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-medium text-blue-900 mb-1">
                  Requisitos de seguridad:
                </p>
                <ul className="space-y-0.5">
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
            className="flex-1 h-11"
            disabled={isLoading}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          <Button
            type="submit"
            disabled={!password || !confirmPassword || isLoading}
            className="flex-1 h-11 bg-gradient-to-r from-[#003DA5] to-[#0052CC] hover:from-[#002d7a] hover:to-[#003DA5] text-white font-medium shadow-lg hover:shadow-xl transition-all duration-300"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Activando...
              </>
            ) : (
              <>
                Activar Cuenta
                <CheckCircle2 className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </form>
    </motion.div>
  );

  // RENDERIZAR PASO 4: Éxito
  const renderSuccessStep = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="text-center py-4"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg"
      >
        <CheckCircle2 className="w-8 h-8 text-white" strokeWidth={2.5} />
      </motion.div>

      <h3 className="text-xl font-bold text-gray-900 mb-2">
        {isNewUser ? '¡Inscripción Exitosa!' : '¡Cuenta Activada!'}
      </h3>
      
      <div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-lg p-4 mb-4">
        <p className="text-sm text-gray-700 mb-3">
          Bienvenido/a a ComUNIdad ESAP
        </p>
        <div className="flex flex-col items-center gap-1 text-sm text-gray-600">
          <span className="font-bold text-[#003DA5]">
            {isNewUser 
              ? `${registrationData.firstName} ${registrationData.lastName}`
              : `${userData?.firstName} ${userData?.lastName}`
            }
          </span>
          <span className="text-xs">
            {isNewUser ? registrationData.email : userData?.email}
          </span>
        </div>
      </div>

      {isNewUser && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
          <p className="text-xs text-amber-800">
            Tu solicitud será revisada por Gestión de Personas. Te notificaremos cuando sea aprobada.
          </p>
        </div>
      )}

      <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>{isNewUser ? 'Procesando inscripción...' : 'Redirigiendo a tu cuenta...'}</span>
      </div>
    </motion.div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[520px] p-0 gap-0 overflow-hidden">
        {/* Header con diseño ESAP World-Class */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 px-6 py-5">
          <div className="flex items-start gap-4">
            {/* Icono del paso actual */}
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stepInfo.iconBg} flex items-center justify-center flex-shrink-0 shadow-md`}>
              {stepInfo.icon}
            </div>
            
            {/* Información del paso */}
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl font-bold text-gray-900 mb-1">
                {stepInfo.title}
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600">
                {stepInfo.description}
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Contenido del modal */}
        <div className="px-6 py-5">
          <AnimatePresence mode="wait">
            {step === 'document' && renderDocumentStep()}
            {step === 'registration-form' && renderRegistrationForm()}
            {step === 'verification' && renderVerificationStep()}
            {step === 'password' && renderPasswordStep()}
            {step === 'success' && renderSuccessStep()}
          </AnimatePresence>
        </div>

        {/* Footer con mensaje de seguridad */}
        {step !== 'success' && (
          <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4 text-green-600" />
              </div>
              <p className="text-xs text-gray-600">
                Tus datos están protegidos con encriptación de extremo a extremo
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
