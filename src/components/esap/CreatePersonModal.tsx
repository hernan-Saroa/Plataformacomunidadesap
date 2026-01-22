import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  FileText,
  GraduationCap,
  Briefcase,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  IdCard,
  Building2,
  Users as UsersIcon
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface CreatePersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (person: any) => void;
  editMode?: boolean;
  initialData?: any;
}

export function CreatePersonModal({ 
  isOpen, 
  onClose, 
  onCreate, 
  editMode = false,
  initialData = null 
}: CreatePersonModalProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    // Personal Info
    firstName: '',
    lastName: '',
    documentType: 'CC',
    documentNumber: '',
    birthDate: '',
    gender: '',
    // Contact Info
    email: '',
    phone: '',
    address: '',
    city: '',
    // Role & Academic
    role: 'Estudiante',
    program: '',
    department: '',
    enrollmentDate: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Inicializar con datos de edición si existen
  useEffect(() => {
    if (editMode && initialData) {
      const nameParts = initialData.fullName?.split(' ') || ['', ''];
      const firstName = nameParts.slice(0, Math.ceil(nameParts.length / 2)).join(' ');
      const lastName = nameParts.slice(Math.ceil(nameParts.length / 2)).join(' ');
      
      setFormData({
        firstName: firstName || '',
        lastName: lastName || '',
        documentType: initialData.documentType || 'CC',
        documentNumber: initialData.documentNumber || '',
        birthDate: initialData.birthDate || '',
        gender: initialData.gender || '',
        email: initialData.email || '',
        phone: initialData.phone || '',
        address: initialData.address || '',
        city: initialData.address?.split(',').pop()?.trim() || '',
        role: initialData.role || 'Estudiante',
        program: initialData.program || '',
        department: initialData.department || '',
        enrollmentDate: initialData.enrollmentDate || '',
      });
    }
  }, [editMode, initialData, isOpen]);

  const documentTypes = [
    { value: 'CC', label: 'Cédula de Ciudadanía' },
    { value: 'CE', label: 'Cédula de Extranjería' },
    { value: 'TI', label: 'Tarjeta de Identidad' },
    { value: 'PAS', label: 'Pasaporte' },
    { value: 'PPT', label: 'Permiso Protección Temporal' }
  ];
  
  const roles = ['Estudiante', 'Docente', 'Administrativo'];
  
  const programs = [
    'Administración Pública',
    'Gestión Pública',
    'Ciencias Políticas',
    'Derecho Público',
  ];
  
  const departments = [
    'Ciencias Políticas',
    'Ciencias Económicas',
    'Derecho Público',
    'Recursos Humanos',
    'Administración',
  ];

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateStep = (stepNumber: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (stepNumber === 1) {
      if (!formData.firstName.trim()) newErrors.firstName = 'El nombre es requerido';
      if (!formData.lastName.trim()) newErrors.lastName = 'El apellido es requerido';
      if (!formData.documentNumber.trim()) newErrors.documentNumber = 'El número de documento es requerido';
    }

    if (stepNumber === 2) {
      if (!formData.email.trim()) {
        newErrors.email = 'El email es requerido';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = 'Email inválido';
      } else if (!formData.email.toLowerCase().endsWith('@esap.edu.co')) {
        newErrors.email = 'Solo se permiten correos institucionales @esap.edu.co';
      }
      if (!formData.phone.trim()) newErrors.phone = 'El teléfono es requerido';
      if (!formData.city.trim()) newErrors.city = 'La ciudad es requerida';
    }

    if (stepNumber === 3) {
      if (!formData.role) newErrors.role = 'El rol es requerido';
      if (formData.role === 'Estudiante' && !formData.program) {
        newErrors.program = 'El programa es requerido para estudiantes';
      }
      if (!formData.department) newErrors.department = 'El departamento es requerido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSubmit = () => {
    if (validateStep(step)) {
      // Mostrar toast de carga
      toast.loading('Creando usuario...', { id: 'create-user' });
      
      // Simular creación (en producción esto sería un API call)
      setTimeout(() => {
        onCreate({
          ...formData,
          id: initialData?.id || `user-${Date.now()}`, // Generar ID único
          fullName: `${formData.firstName} ${formData.lastName}`,
          status: 'active',
          createdAt: new Date().toISOString(),
        });
        
        // Cerrar el toast de carga y mostrar éxito
        toast.success(editMode ? 'Usuario actualizado' : 'Usuario creado exitosamente', {
          id: 'create-user',
          description: `${formData.firstName} ${formData.lastName} ha sido ${editMode ? 'actualizado' : 'registrado'} correctamente.`
        });
        
        onClose();
        if (!editMode) {
          resetForm();
        }
      }, 1000); // Simular tiempo de procesamiento
    } else {
      toast.error('Formulario incompleto', {
        description: 'Por favor completa todos los campos requeridos.'
      });
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      documentType: 'CC',
      documentNumber: '',
      birthDate: '',
      gender: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      role: 'Estudiante',
      program: '',
      department: '',
      enrollmentDate: '',
    });
    setStep(1);
    setErrors({});
  };

  if (!isOpen) return null;

  const totalSteps = 3;

  const stepTitles = [
    { number: 1, title: 'Datos básicos de identificación' },
    { number: 2, title: 'Información de Contacto' },
    { number: 3, title: 'Información Institucional' }
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header - ESAP Blue */}
          <div className="relative px-6 py-5 bg-[#003DA5]">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-5 h-5" strokeWidth={2} />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-white">
                <User className="w-6 h-6" strokeWidth={2} />
              </div>
              <div>
                <h2 className="text-xl font-black text-white">
                  {editMode ? 'Editar Persona' : 'Agregar Nueva Persona'}
                </h2>
                <p className="text-sm text-white/80 mt-0.5">
                  {stepTitles[step - 1].title}
                </p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 bg-gray-50">
            <div className="flex">
              {stepTitles.map((s) => (
                <button
                  key={s.number}
                  onClick={() => {
                    // Solo permitir navegar a pasos anteriores o al paso actual
                    if (s.number <= step) {
                      setStep(s.number);
                    }
                  }}
                  disabled={s.number > step}
                  className={`flex-1 px-4 py-3 text-sm font-bold transition-colors relative ${
                    step === s.number
                      ? 'text-[#003DA5] bg-white'
                      : step > s.number
                      ? 'text-gray-600 hover:text-[#003DA5] bg-gray-50 hover:bg-gray-100 cursor-pointer'
                      : 'text-gray-400 bg-gray-50 cursor-not-allowed'
                  }`}
                >
                  Paso {s.number}
                  {step === s.number && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#003DA5]" />
                  )}
                  {step > s.number && (
                    <CheckCircle className="w-4 h-4 inline-block ml-1 text-green-600" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[55vh] overflow-y-auto bg-white">
            <AnimatePresence mode="wait">
              {/* Step 1: Personal Information */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-5"
                >
                  {/* Nombres y Apellidos */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        <User className="w-4 h-4 inline-block mr-1.5 text-[#003DA5]" />
                        Nombres <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.firstName}
                        onChange={(e) => handleChange('firstName', e.target.value)}
                        className={`w-full px-3 py-2.5 border ${
                          errors.firstName 
                            ? 'border-red-500 bg-red-50' 
                            : 'border-gray-300 focus:border-[#003DA5]'
                        } rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 transition-all text-gray-900`}
                        placeholder="Ej: Juan Carlos"
                      />
                      {errors.firstName && (
                        <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {errors.firstName}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        <User className="w-4 h-4 inline-block mr-1.5 text-[#003DA5]" />
                        Apellidos <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.lastName}
                        onChange={(e) => handleChange('lastName', e.target.value)}
                        className={`w-full px-3 py-2.5 border ${
                          errors.lastName 
                            ? 'border-red-500 bg-red-50' 
                            : 'border-gray-300 focus:border-[#003DA5]'
                        } rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 transition-all text-gray-900`}
                        placeholder="Ej: Pérez Martínez"
                      />
                      {errors.lastName && (
                        <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {errors.lastName}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Tipo y Número de Documento */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        <IdCard className="w-4 h-4 inline-block mr-1.5 text-[#003DA5]" />
                        Tipo de Documento <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.documentType}
                        onChange={(e) => handleChange('documentType', e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-300 focus:border-[#003DA5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 transition-all text-gray-900 bg-white"
                      >
                        {documentTypes.map(type => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        <FileText className="w-4 h-4 inline-block mr-1.5 text-[#003DA5]" />
                        Número de Documento <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.documentNumber}
                        onChange={(e) => handleChange('documentNumber', e.target.value)}
                        className={`w-full px-3 py-2.5 border ${
                          errors.documentNumber 
                            ? 'border-red-500 bg-red-50' 
                            : 'border-gray-300 focus:border-[#003DA5]'
                        } rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 transition-all text-gray-900`}
                        placeholder="Ej: 1234567890"
                      />
                      {errors.documentNumber && (
                        <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {errors.documentNumber}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Fecha de Nacimiento y Género */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        <Calendar className="w-4 h-4 inline-block mr-1.5 text-[#003DA5]" />
                        Fecha de Nacimiento
                      </label>
                      <input
                        type="date"
                        value={formData.birthDate}
                        onChange={(e) => handleChange('birthDate', e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-300 focus:border-[#003DA5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 transition-all text-gray-900"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        <UsersIcon className="w-4 h-4 inline-block mr-1.5 text-[#003DA5]" />
                        Género
                      </label>
                      <select
                        value={formData.gender}
                        onChange={(e) => handleChange('gender', e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-300 focus:border-[#003DA5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 transition-all text-gray-900 bg-white"
                      >
                        <option value="">Seleccionar</option>
                        <option value="M">Masculino</option>
                        <option value="F">Femenino</option>
                        <option value="O">Otro</option>
                      </select>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 2: Contact Information */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-5"
                >
                  {/* Email */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      <Mail className="w-4 h-4 inline-block mr-1.5 text-[#003DA5]" />
                      Correo Electrónico <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      className={`w-full px-3 py-2.5 border ${
                        errors.email 
                          ? 'border-red-500 bg-red-50' 
                          : 'border-gray-300 focus:border-[#003DA5]'
                      } rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 transition-all text-gray-900`}
                      placeholder="Ej: juan.perez@esap.edu.co"
                      style={{ textTransform: 'lowercase' }}
                    />
                    {errors.email && (
                      <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {errors.email}
                      </p>
                    )}
                  </div>

                  {/* Teléfono */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      <Phone className="w-4 h-4 inline-block mr-1.5 text-[#003DA5]" />
                      Teléfono <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      className={`w-full px-3 py-2.5 border ${
                        errors.phone 
                          ? 'border-red-500 bg-red-50' 
                          : 'border-gray-300 focus:border-[#003DA5]'
                      } rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 transition-all text-gray-900`}
                      placeholder="Ej: 300 123 4567"
                    />
                    {errors.phone && (
                      <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {errors.phone}
                      </p>
                    )}
                  </div>

                  {/* Dirección */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      <MapPin className="w-4 h-4 inline-block mr-1.5 text-[#003DA5]" />
                      Dirección
                    </label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => handleChange('address', e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 focus:border-[#003DA5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 transition-all text-gray-900"
                      placeholder="Ej: Calle 123 # 45-67"
                    />
                  </div>

                  {/* Ciudad */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      <Building2 className="w-4 h-4 inline-block mr-1.5 text-[#003DA5]" />
                      Ciudad <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => handleChange('city', e.target.value)}
                      className={`w-full px-3 py-2.5 border ${
                        errors.city 
                          ? 'border-red-500 bg-red-50' 
                          : 'border-gray-300 focus:border-[#003DA5]'
                      } rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 transition-all text-gray-900`}
                      placeholder="Ej: Bogotá D.C."
                    />
                    {errors.city && (
                      <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {errors.city}
                      </p>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Step 3: Role & Academic */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-5"
                >
                  {/* Rol */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      <UsersIcon className="w-4 h-4 inline-block mr-1.5 text-[#003DA5]" />
                      Rol en la Institución <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => handleChange('role', e.target.value)}
                      className={`w-full px-3 py-2.5 border ${
                        errors.role 
                          ? 'border-red-500 bg-red-50' 
                          : 'border-gray-300 focus:border-[#003DA5]'
                      } rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 transition-all text-gray-900 bg-white`}
                    >
                      {roles.map(role => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                    {errors.role && (
                      <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {errors.role}
                      </p>
                    )}
                  </div>

                  {/* Programa (solo para Estudiante) */}
                  {formData.role === 'Estudiante' && (
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        <GraduationCap className="w-4 h-4 inline-block mr-1.5 text-[#003DA5]" />
                        Programa <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.program}
                        onChange={(e) => handleChange('program', e.target.value)}
                        className={`w-full px-3 py-2.5 border ${
                          errors.program 
                            ? 'border-red-500 bg-red-50' 
                            : 'border-gray-300 focus:border-[#003DA5]'
                        } rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 transition-all text-gray-900 bg-white`}
                      >
                        <option value="">Seleccionar programa</option>
                        {programs.map(program => (
                          <option key={program} value={program}>{program}</option>
                        ))}
                      </select>
                      {errors.program && (
                        <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {errors.program}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Departamento */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      <Building2 className="w-4 h-4 inline-block mr-1.5 text-[#003DA5]" />
                      Departamento <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.department}
                      onChange={(e) => handleChange('department', e.target.value)}
                      className={`w-full px-3 py-2.5 border ${
                        errors.department 
                          ? 'border-red-500 bg-red-50' 
                          : 'border-gray-300 focus:border-[#003DA5]'
                      } rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 transition-all text-gray-900 bg-white`}
                    >
                      <option value="">Seleccionar departamento</option>
                      {departments.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                    {errors.department && (
                      <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {errors.department}
                      </p>
                    )}
                  </div>

                  {/* Fecha de Ingreso */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      <Calendar className="w-4 h-4 inline-block mr-1.5 text-[#003DA5]" />
                      Fecha de Ingreso
                    </label>
                    <input
                      type="date"
                      value={formData.enrollmentDate}
                      onChange={(e) => handleChange('enrollmentDate', e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 focus:border-[#003DA5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 transition-all text-gray-900"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between gap-3">
            <button
              onClick={step === 1 ? onClose : handleBack}
              className="px-5 py-2.5 border border-gray-300 bg-white text-gray-700 rounded-lg font-bold hover:bg-gray-50 transition-colors"
            >
              {step === 1 ? 'Cancelar' : 'Atrás'}
            </button>

            <button
              onClick={step === totalSteps ? handleSubmit : handleNext}
              className="px-5 py-2.5 bg-[#003DA5] text-white rounded-lg font-bold hover:bg-[#002d7a] transition-colors flex items-center gap-2"
            >
              {step === totalSteps ? (
                <>
                  <CheckCircle className="w-4 h-4" strokeWidth={2.5} />
                  {editMode ? 'Actualizar' : 'Crear Persona'}
                </>
              ) : (
                <>
                  Siguiente
                  <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
