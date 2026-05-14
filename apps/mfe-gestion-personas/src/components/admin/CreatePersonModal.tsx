import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, User, Mail, Phone, MapPin, Calendar, FileText, GraduationCap,
  Briefcase, CheckCircle, AlertCircle, ArrowRight, ArrowLeft, IdCard,
  Building2, Users as UsersIcon, Layers, UserCheck, Monitor,
  MessageSquare, LogOut, Clock, Hash, Tag
} from 'lucide-react';
import { toast } from 'sonner';
import { TERRITORIALES_ESAP } from '../../data/territoriales-cetap-completo';

interface CreatePersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (person: any) => Promise<void> | void;
  editMode?: boolean;
  initialData?: any;
}

const EMPTY_FORM = {
  // Paso 1 — Identificación
  firstName: '',
  lastName: '',
  documentType: 'CC',
  documentNumber: '',
  birthDate: '',
  gender: '',
  // Paso 2 — Contacto
  email: '',
  phone: '',
  address: '',
  city: '',
  // Paso 3 — Datos Institucionales
  empresaContratista: '',
  dependenciaGrupoPrograma: '',
  ubicacionFisica: '',
  cargoSemestre: '',
  nombreJefeDependencia: '',
  aplicacion: '',
  contrato: '',
  tiempoContratoResolucion: '',
  enrollmentDate: '',
  fechaFinContrato: '',
  observaciones: '',
  // Paso 4 — Rol y Vinculación
  role: 'Estudiante',
  program: '',
  department: '',
  tipoVinculacion: '',
  dedicacion: '',
  escalafon: '',
  horasAsignables: '',
  territorial: '',
  nucleoTematico: '',
  nivelFormacion: '',
  perfilAcademicoPro: '',
  perfilAcademico: '',
  pregradoDetalle: '',
  especializacionDetalle: '',
  maestriaDetalle: '',
  doctoradoDetalle: '',
  posDoctorado: '',
  investigacion: '',
  origenVinculacion: '',
  actoAdministrativoVinculacion: '',
  ultimaEvaluacion: '',
  situacionAdministrativa: '',
  fechaInicioVinculacion: '',
  fechaFinVinculacion: '',
  puntajeSalarial: '',
  generoDocente: '',
  rangoEdad: '',
};

export function CreatePersonModal({
  isOpen,
  onClose,
  onCreate,
  editMode = false,
  initialData = null,
}: CreatePersonModalProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const documentTypes = [
    { value: 'CC', label: 'Cédula de Ciudadanía' },
    { value: 'CE', label: 'Cédula de Extranjería' },
    { value: 'TI', label: 'Tarjeta de Identidad' },
    { value: 'PAS', label: 'Pasaporte' },
    { value: 'PPT', label: 'Permiso Protección Temporal' },
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

  // Cargar datos de edición
  useEffect(() => {
    if (editMode && initialData) {
      const nameParts = initialData.fullName?.split(' ') || ['', ''];
      const firstName = nameParts.slice(0, Math.ceil(nameParts.length / 2)).join(' ');
      const lastName = nameParts.slice(Math.ceil(nameParts.length / 2)).join(' ');
      setFormData(prev => ({
        ...prev,
        firstName: initialData.firstName || firstName || '',
        lastName: initialData.lastName || lastName || '',
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
      }));
    }
  }, [editMode, initialData, isOpen]);

  // Resetear al abrir
  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setErrors({});
    if (!editMode || !initialData) {
      setFormData({ ...EMPTY_FORM });
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const e = { ...prev };
        delete e[field];
        return e;
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
      }
      if (!formData.phone.trim()) newErrors.phone = 'El teléfono es requerido';
      if (!formData.city.trim()) newErrors.city = 'La ciudad es requerida';
    }

    // Paso 3: Datos Institucionales — todos opcionales

    if (stepNumber === 4) {
      if (!formData.role) newErrors.role = 'El rol es requerido';
      if (formData.role === 'Estudiante' && !formData.program) {
        newErrors.program = 'El programa es requerido para estudiantes';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) setStep(step + 1);
  };

  const handleBack = () => setStep(step - 1);

  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (validateStep(step)) {
      try {
        setIsSubmitting(true);
        await onCreate({
          ...formData,
          id: initialData?.id || `user-${Date.now()}`,
          fullName: `${formData.firstName} ${formData.lastName}`,
          status: 'active',
          createdAt: new Date().toISOString(),
        });
        if (!editMode) setFormData({ ...EMPTY_FORM });
      } catch {
        // el contenedor maneja el error
      } finally {
        setIsSubmitting(false);
      }
    } else {
      toast.error('Formulario incompleto', {
        description: 'Por favor completa todos los campos requeridos.',
      });
    }
  };

  if (!isOpen) return null;

  const totalSteps = 4;

  const stepTitles = [
    { number: 1, title: 'Datos de identificación' },
    { number: 2, title: 'Información de Contacto' },
    { number: 3, title: 'Datos Institucionales' },
    { number: 4, title: 'Rol y Vinculación' },
  ];

  const inputCls = (err?: string) =>
    `w-full px-3 py-2.5 border ${err ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:border-[#003DA5]'} rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 transition-all text-gray-900`;
  const selectCls = (err?: string) =>
    `w-full px-3 py-2.5 border ${err ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:border-[#003DA5]'} rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 transition-all text-gray-900 bg-white`;
  const labelCls = 'block text-sm font-bold text-gray-700 mb-2';
  const errorMsg = (msg?: string) => msg ? (
    <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
      <AlertCircle className="w-3.5 h-3.5" />{msg}
    </p>
  ) : null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={isSubmitting ? undefined : onClose}
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
          {/* Header */}
          <div className="relative px-6 py-5 bg-[#003DA5]">
            <button
              onClick={isSubmitting ? undefined : onClose}
              disabled={isSubmitting}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors disabled:opacity-60"
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
                <p className="text-sm text-white/80 mt-0.5">{stepTitles[step - 1].title}</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 bg-gray-50">
            <div className="flex">
              {stepTitles.map((s) => (
                <button
                  key={s.number}
                  onClick={() => { if (s.number <= step) setStep(s.number); }}
                  disabled={s.number > step}
                  className={`flex-1 px-2 py-3 text-xs font-bold transition-colors relative ${
                    step === s.number
                      ? 'text-[#003DA5] bg-white'
                      : step > s.number
                      ? 'text-gray-600 hover:text-[#003DA5] bg-gray-50 cursor-pointer'
                      : 'text-gray-400 bg-gray-50 cursor-not-allowed'
                  }`}
                >
                  Paso {s.number}
                  {step === s.number && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#003DA5]" />}
                  {step > s.number && <CheckCircle className="w-3.5 h-3.5 inline-block ml-1 text-green-600" />}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[55vh] overflow-y-auto bg-white">
            <AnimatePresence mode="wait">

              {/* Paso 1: Datos de identificación */}
              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }} className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}><User className="w-4 h-4 inline-block mr-1.5 text-[#003DA5]" />Nombres <span className="text-red-500">*</span></label>
                      <input type="text" value={formData.firstName} onChange={(e) => handleChange('firstName', e.target.value)} className={inputCls(errors.firstName)} placeholder="Ej: Juan Carlos" />
                      {errorMsg(errors.firstName)}
                    </div>
                    <div>
                      <label className={labelCls}><User className="w-4 h-4 inline-block mr-1.5 text-[#003DA5]" />Apellidos <span className="text-red-500">*</span></label>
                      <input type="text" value={formData.lastName} onChange={(e) => handleChange('lastName', e.target.value)} className={inputCls(errors.lastName)} placeholder="Ej: Pérez Martínez" />
                      {errorMsg(errors.lastName)}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}><IdCard className="w-4 h-4 inline-block mr-1.5 text-[#003DA5]" />Tipo de Documento <span className="text-red-500">*</span></label>
                      <select value={formData.documentType} onChange={(e) => handleChange('documentType', e.target.value)} className={selectCls()}>
                        {documentTypes.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}><FileText className="w-4 h-4 inline-block mr-1.5 text-[#003DA5]" />Número de Documento <span className="text-red-500">*</span></label>
                      <input type="text" value={formData.documentNumber} onChange={(e) => handleChange('documentNumber', e.target.value)} className={inputCls(errors.documentNumber)} placeholder="Ej: 1234567890" />
                      {errorMsg(errors.documentNumber)}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}><Calendar className="w-4 h-4 inline-block mr-1.5 text-[#003DA5]" />Fecha de Nacimiento</label>
                      <input type="date" value={formData.birthDate} onChange={(e) => handleChange('birthDate', e.target.value)} className={inputCls()} />
                    </div>
                    <div>
                      <label className={labelCls}><UsersIcon className="w-4 h-4 inline-block mr-1.5 text-[#003DA5]" />Género</label>
                      <select value={formData.gender} onChange={(e) => handleChange('gender', e.target.value)} className={selectCls()}>
                        <option value="">Seleccionar</option>
                        <option value="M">Masculino</option>
                        <option value="F">Femenino</option>
                        <option value="O">Otro</option>
                      </select>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Paso 2: Información de Contacto */}
              {step === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }} className="space-y-5">
                  <div>
                    <label className={labelCls}><Mail className="w-4 h-4 inline-block mr-1.5 text-[#003DA5]" />Correo Electrónico <span className="text-red-500">*</span></label>
                    <input type="email" value={formData.email} onChange={(e) => handleChange('email', e.target.value)} className={inputCls(errors.email)} placeholder="Ej: juan.perez@esap.edu.co" style={{ textTransform: 'lowercase' }} />
                    {errorMsg(errors.email)}
                  </div>
                  <div>
                    <label className={labelCls}><Phone className="w-4 h-4 inline-block mr-1.5 text-[#003DA5]" />Teléfono <span className="text-red-500">*</span></label>
                    <input type="tel" value={formData.phone} onChange={(e) => handleChange('phone', e.target.value)} className={inputCls(errors.phone)} placeholder="Ej: 300 123 4567" />
                    {errorMsg(errors.phone)}
                  </div>
                  <div>
                    <label className={labelCls}><MapPin className="w-4 h-4 inline-block mr-1.5 text-[#003DA5]" />Dirección</label>
                    <input type="text" value={formData.address} onChange={(e) => handleChange('address', e.target.value)} className={inputCls()} placeholder="Ej: Calle 123 # 45-67" />
                  </div>
                  <div>
                    <label className={labelCls}><Building2 className="w-4 h-4 inline-block mr-1.5 text-[#003DA5]" />Ciudad <span className="text-red-500">*</span></label>
                    <input type="text" value={formData.city} onChange={(e) => handleChange('city', e.target.value)} className={inputCls(errors.city)} placeholder="Ej: Bogotá D.C." />
                    {errorMsg(errors.city)}
                  </div>
                </motion.div>
              )}

              {/* Paso 3: Datos Institucionales */}
              {step === 3 && (
                <motion.div key="step3" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}><Building2 className="w-4 h-4 inline-block mr-1.5 text-[#003DA5]" />Empresa Contratista</label>
                      <input type="text" value={formData.empresaContratista} onChange={(e) => handleChange('empresaContratista', e.target.value)} className={inputCls()} placeholder="Ej: Empresa S.A.S." />
                    </div>
                    <div>
                      <label className={labelCls}><Layers className="w-4 h-4 inline-block mr-1.5 text-[#003DA5]" />Dependencia / Grupo / Programa</label>
                      <input type="text" value={formData.dependenciaGrupoPrograma} onChange={(e) => handleChange('dependenciaGrupoPrograma', e.target.value)} className={inputCls()} placeholder="Ej: Talento Humano" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}><MapPin className="w-4 h-4 inline-block mr-1.5 text-[#003DA5]" />Ubicación Física</label>
                      <input type="text" value={formData.ubicacionFisica} onChange={(e) => handleChange('ubicacionFisica', e.target.value)} className={inputCls()} placeholder="Ej: Piso 3 Oficina 302" />
                    </div>
                    <div>
                      <label className={labelCls}><Briefcase className="w-4 h-4 inline-block mr-1.5 text-[#003DA5]" />Cargo / Semestre</label>
                      <input type="text" value={formData.cargoSemestre} onChange={(e) => handleChange('cargoSemestre', e.target.value)} className={inputCls()} placeholder="Ej: Profesional Universitario" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}><UserCheck className="w-4 h-4 inline-block mr-1.5 text-[#003DA5]" />Nombre Jefe Dependencia</label>
                      <input type="text" value={formData.nombreJefeDependencia} onChange={(e) => handleChange('nombreJefeDependencia', e.target.value)} className={inputCls()} placeholder="Ej: María García" />
                    </div>
                    <div>
                      <label className={labelCls}><Monitor className="w-4 h-4 inline-block mr-1.5 text-[#003DA5]" />Aplicación</label>
                      <input type="text" value={formData.aplicacion} onChange={(e) => handleChange('aplicacion', e.target.value)} className={inputCls()} placeholder="Ej: SIGEP, SAP, SIIF..." />
                    </div>
                  </div>

                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2 pt-1">
                    <FileText className="w-3.5 h-3.5" /> Información de Contrato
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}><FileText className="w-4 h-4 inline-block mr-1.5 text-[#003DA5]" />Contrato</label>
                      <input type="text" value={formData.contrato} onChange={(e) => handleChange('contrato', e.target.value)} className={inputCls()} placeholder="Ej: Contrato 123-2026" />
                    </div>
                    <div>
                      <label className={labelCls}><Clock className="w-4 h-4 inline-block mr-1.5 text-[#003DA5]" />Tiempo de Contrato / Resolución</label>
                      <input type="text" value={formData.tiempoContratoResolucion} onChange={(e) => handleChange('tiempoContratoResolucion', e.target.value)} className={inputCls()} placeholder="Ej: 6 meses / Res. 045-2026" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}><Calendar className="w-4 h-4 inline-block mr-1.5 text-[#003DA5]" />Fecha de Ingreso</label>
                      <input type="date" value={formData.enrollmentDate} onChange={(e) => handleChange('enrollmentDate', e.target.value)} className={inputCls()} />
                    </div>
                    <div>
                      <label className={labelCls}><LogOut className="w-4 h-4 inline-block mr-1.5 text-[#003DA5]" />Fecha Fin Contrato / Retiro</label>
                      <input type="date" value={formData.fechaFinContrato} onChange={(e) => handleChange('fechaFinContrato', e.target.value)} className={inputCls()} />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}><MessageSquare className="w-4 h-4 inline-block mr-1.5 text-[#003DA5]" />Observaciones</label>
                    <textarea value={formData.observaciones} onChange={(e) => handleChange('observaciones', e.target.value)} rows={3} className="w-full px-3 py-2.5 text-sm border border-gray-300 focus:border-[#003DA5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 transition-all text-gray-900 resize-none" placeholder="Notas adicionales sobre el usuario..." />
                  </div>
                </motion.div>
              )}

              {/* Paso 4: Rol y Vinculación */}
              {step === 4 && (
                <motion.div key="step4" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}><UsersIcon className="w-4 h-4 inline-block mr-1.5 text-[#003DA5]" />Rol en la Institución <span className="text-red-500">*</span></label>
                      <select value={formData.role} onChange={(e) => handleChange('role', e.target.value)} className={selectCls(errors.role)}>
                        {roles.map(role => <option key={role} value={role}>{role}</option>)}
                      </select>
                      {errorMsg(errors.role)}
                    </div>
                    <div>
                      <label className={labelCls}><Building2 className="w-4 h-4 inline-block mr-1.5 text-[#003DA5]" />Departamento</label>
                      <select value={formData.department} onChange={(e) => handleChange('department', e.target.value)} className={selectCls()}>
                        <option value="">Seleccionar departamento</option>
                        {departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Campos para Estudiante */}
                  {formData.role === 'Estudiante' && (
                    <div>
                      <label className={labelCls}><GraduationCap className="w-4 h-4 inline-block mr-1.5 text-[#003DA5]" />Programa <span className="text-red-500">*</span></label>
                      <select value={formData.program} onChange={(e) => handleChange('program', e.target.value)} className={selectCls(errors.program)}>
                        <option value="">Seleccionar programa</option>
                        {programs.map(program => <option key={program} value={program}>{program}</option>)}
                      </select>
                      {errorMsg(errors.program)}
                    </div>
                  )}

                  {/* Campos para Docente */}
                  {formData.role === 'Docente' && (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className={labelCls}><Briefcase className="w-4 h-4 inline-block mr-1.5 text-[#003DA5]" />Tipo de Vinculación</label>
                          <select value={formData.tipoVinculacion} onChange={(e) => handleChange('tipoVinculacion', e.target.value)} className={selectCls()}>
                            <option value="">Seleccionar vinculación</option>
                            <option value="CARRERA">Carrera Docente</option>
                            <option value="OCASIONAL">Ocasional</option>
                            <option value="CATEDRA">Hora Cátedra</option>
                            <option value="VISITANTE">Visitante</option>
                            <option value="ESPECIAL">Especial</option>
                          </select>
                        </div>
                        <div>
                          <label className={labelCls}><FileText className="w-4 h-4 inline-block mr-1.5 text-[#003DA5]" />Dedicación</label>
                          <select value={formData.dedicacion} onChange={(e) => handleChange('dedicacion', e.target.value)} className={selectCls()}>
                            <option value="">Seleccionar dedicación</option>
                            <option value="TC">Tiempo Completo</option>
                            <option value="MT">Medio Tiempo</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className={labelCls}><GraduationCap className="w-4 h-4 inline-block mr-1.5 text-[#003DA5]" />Escalafón</label>
                          <select value={formData.escalafon} onChange={(e) => handleChange('escalafon', e.target.value)} className={selectCls()}>
                            <option value="">Seleccionar escalafón</option>
                            <option value="Titular">Titular</option>
                            <option value="Asociado">Asociado</option>
                            <option value="Asistente">Asistente</option>
                            <option value="Auxiliar">Auxiliar</option>
                            <option value="No Aplica">No Aplica</option>
                          </select>
                        </div>
                        <div>
                          <label className={labelCls}><Clock className="w-4 h-4 inline-block mr-1.5 text-[#003DA5]" />Horas Asignables</label>
                          <input type="number" value={formData.horasAsignables} onChange={(e) => handleChange('horasAsignables', e.target.value)} className={inputCls()} placeholder="Ej: 800" min="0" />
                        </div>
                      </div>

                      <p className="text-xs font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2 pt-1">
                        <FileText className="w-3.5 h-3.5" /> Datos Extendidos Banco de Docentes
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className={labelCls}><MapPin className="w-4 h-4 inline-block mr-1.5 text-[#003DA5]" />Territorial</label>
                          <select value={formData.territorial} onChange={(e) => handleChange('territorial', e.target.value)} className={selectCls()}>
                            <option value="">Seleccionar territorial</option>
                            {TERRITORIALES_ESAP.map(t => <option key={t.codigo} value={t.nombre}>{t.nombre}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className={labelCls}><GraduationCap className="w-4 h-4 inline-block mr-1.5 text-[#003DA5]" />Nivel de Formación</label>
                          <input type="text" value={formData.nivelFormacion} onChange={(e) => handleChange('nivelFormacion', e.target.value)} className={inputCls()} placeholder="Ej: Maestría" />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className={labelCls}><GraduationCap className="w-4 h-4 inline-block mr-1.5 text-[#003DA5]" />Pregrado</label>
                          <input type="text" value={formData.pregradoDetalle} onChange={(e) => handleChange('pregradoDetalle', e.target.value)} className={inputCls()} placeholder="Título de pregrado" />
                        </div>
                        <div>
                          <label className={labelCls}><GraduationCap className="w-4 h-4 inline-block mr-1.5 text-[#003DA5]" />Especialización</label>
                          <input type="text" value={formData.especializacionDetalle} onChange={(e) => handleChange('especializacionDetalle', e.target.value)} className={inputCls()} placeholder="Especialización" />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className={labelCls}><GraduationCap className="w-4 h-4 inline-block mr-1.5 text-[#003DA5]" />Maestría</label>
                          <input type="text" value={formData.maestriaDetalle} onChange={(e) => handleChange('maestriaDetalle', e.target.value)} className={inputCls()} placeholder="Maestría" />
                        </div>
                        <div>
                          <label className={labelCls}><GraduationCap className="w-4 h-4 inline-block mr-1.5 text-[#003DA5]" />Doctorado</label>
                          <input type="text" value={formData.doctoradoDetalle} onChange={(e) => handleChange('doctoradoDetalle', e.target.value)} className={inputCls()} placeholder="Doctorado" />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className={labelCls}><Calendar className="w-4 h-4 inline-block mr-1.5 text-[#003DA5]" />Fecha Inicio Vinculación</label>
                          <input type="date" value={formData.fechaInicioVinculacion} onChange={(e) => handleChange('fechaInicioVinculacion', e.target.value)} className={inputCls()} />
                        </div>
                        <div>
                          <label className={labelCls}><Calendar className="w-4 h-4 inline-block mr-1.5 text-[#003DA5]" />Fecha Fin Vinculación</label>
                          <input type="date" value={formData.fechaFinVinculacion} onChange={(e) => handleChange('fechaFinVinculacion', e.target.value)} className={inputCls()} />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className={labelCls}><Tag className="w-4 h-4 inline-block mr-1.5 text-[#003DA5]" />Última Evaluación</label>
                          <input type="text" value={formData.ultimaEvaluacion} onChange={(e) => handleChange('ultimaEvaluacion', e.target.value)} className={inputCls()} placeholder="Ej: Excelente 2025-2" />
                        </div>
                        <div>
                          <label className={labelCls}><Hash className="w-4 h-4 inline-block mr-1.5 text-[#003DA5]" />Puntaje Salarial</label>
                          <input type="number" step="0.01" value={formData.puntajeSalarial} onChange={(e) => handleChange('puntajeSalarial', e.target.value)} className={inputCls()} placeholder="Ej: 420.5" />
                        </div>
                      </div>
                    </>
                  )}
                </motion.div>
              )}

            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between gap-3">
            <button
              onClick={step === 1 ? onClose : handleBack}
              disabled={isSubmitting}
              className="px-5 py-2.5 border border-gray-300 bg-white text-gray-700 rounded-lg font-bold hover:bg-gray-50 transition-colors disabled:opacity-60"
            >
              {step === 1 ? 'Cancelar' : (
                <span className="flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" strokeWidth={2.5} /> Atrás
                </span>
              )}
            </button>

            <button
              onClick={step === totalSteps ? handleSubmit : handleNext}
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-[#003DA5] text-white rounded-lg font-bold hover:bg-[#002d7a] transition-colors flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {step === totalSteps ? (
                <>
                  <CheckCircle className="w-4 h-4" strokeWidth={2.5} />
                  {isSubmitting
                    ? editMode ? 'Actualizando...' : 'Creando...'
                    : editMode ? 'Actualizar' : 'Crear Persona'}
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
