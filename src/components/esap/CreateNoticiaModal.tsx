/**
 * MODAL: CREAR NOTICIA DISCIPLINARIA
 * RF001 – Gestión de Noticias Disciplinarias
 * Formulario completo con validación y generación automática de número único
 */

import { useState } from 'react';
import { 
  X, 
  AlertCircle, 
  User, 
  Calendar, 
  Building2, 
  FileText,
  Upload,
  Plus,
  Trash2,
  MapPin
} from 'lucide-react';
import { Button } from '../ui/button';
import { toast } from 'sonner@2.0.3';

interface Denunciante {
  id: string;
  nombre: string;
  identificacion: string;
  direccion: string;
  telefono: string;
  correo: string;
  cargo: string;
  entidad: string;
}

interface CreateNoticiaModalProps {
  onClose: () => void;
  onSave: (data: any) => void;
}

const ORIGENES_NOTICIA = [
  'Anónimo',
  'Quejoso',
  'Informante',
  'De oficio',
  'Remisión por competencia'
];

const TERRITORIALES_ESAP = [
  'Dirección Nacional',
  'Territorial Amazonas',
  'Territorial Antioquia',
  'Territorial Atlántico',
  'Territorial Bogotá',
  'Territorial Bolívar',
  'Territorial Boyacá',
  'Territorial Caldas',
  'Territorial Caquetá',
  'Territorial Casanare',
  'Territorial Cauca',
  'Territorial Cesar',
  'Territorial Chocó',
  'Territorial Córdoba',
  'Territorial Cundinamarca',
  'Territorial Huila',
  'Territorial La Guajira',
  'Territorial Magdalena',
  'Territorial Meta',
  'Territorial Nariño',
  'Territorial Norte de Santander',
  'Territorial Putumayo',
  'Territorial Quindío',
  'Territorial Risaralda',
  'Territorial Santander',
  'Territorial Sucre',
  'Territorial Tolima',
  'Territorial Valle del Cauca'
];

const DEPENDENCIAS_ESAP = [
  'Por determinar',
  'Dirección Nacional',
  'Subdirección Académica',
  'Subdirección Administrativa y Financiera',
  'Oficina Control Interno Disciplinario (OCID)',
  'Oficina Asesora Jurídica',
  'Oficina de Control Interno',
  'Talento Humano',
  'Sistemas de Información',
  'Comunicaciones',
  ...TERRITORIALES_ESAP
];

const CONDUCTAS_INDISCIPLINARIAS = [
  'Abandono del cargo',
  'Acoso laboral',
  'Acoso sexual',
  'Conflicto de intereses',
  'Desconocimiento de jerarquía',
  'Incumplimiento de deberes',
  'Inasistencia injustificada',
  'Irregularidades en contratación',
  'Mal uso de recursos públicos',
  'Negligencia en funciones',
  'Omisión de denunciar',
  'Retardo injustificado',
  'Trato descortés al ciudadano',
  'Violación de reserva',
  'Otro (especificar en descripción)'
];

export function CreateNoticiaModal({ onClose, onSave }: CreateNoticiaModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    origen: '',
    fechaQueja: new Date().toISOString().split('T')[0], // Fecha actual por defecto
    usarFechaActual: true,
    territorial: '',
    denunciado: {
      nombre: '',
      identificacion: '',
      cargo: '',
      dependencia: ''
    },
    descripcionHechos: '',
    conductasSeleccionadas: [] as string[],
    procesosRelacionados: [] as string[]
  });

  const [denunciantes, setDenunciantes] = useState<Denunciante[]>([]);
  const [currentDenunciante, setCurrentDenunciante] = useState<Denunciante>({
    id: '',
    nombre: '',
    identificacion: '',
    direccion: '',
    telefono: '',
    correo: '',
    cargo: '',
    entidad: ''
  });

  const [archivosAdjuntos, setArchivosAdjuntos] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: string, value: any) => {
    if (field.startsWith('denunciado.')) {
      const subField = field.split('.')[1];
      setFormData({
        ...formData,
        denunciado: {
          ...formData.denunciado,
          [subField]: value
        }
      });
    } else {
      setFormData({
        ...formData,
        [field]: value
      });
    }
    // Limpiar error del campo
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  const handleConductaToggle = (conducta: string) => {
    const isSelected = formData.conductasSeleccionadas.includes(conducta);
    if (isSelected) {
      setFormData({
        ...formData,
        conductasSeleccionadas: formData.conductasSeleccionadas.filter(c => c !== conducta)
      });
    } else {
      setFormData({
        ...formData,
        conductasSeleccionadas: [...formData.conductasSeleccionadas, conducta]
      });
    }
  };

  const handleAgregarDenunciante = () => {
    if (!currentDenunciante.nombre || !currentDenunciante.identificacion) {
      toast.error('Campos requeridos', {
        description: 'Nombre e identificación son obligatorios'
      });
      return;
    }

    const nuevoDenunciante = {
      ...currentDenunciante,
      id: Date.now().toString()
    };

    setDenunciantes([...denunciantes, nuevoDenunciante]);
    setCurrentDenunciante({
      id: '',
      nombre: '',
      identificacion: '',
      direccion: '',
      telefono: '',
      correo: '',
      cargo: '',
      entidad: ''
    });

    toast.success('Denunciante agregado');
  };

  const handleEliminarDenunciante = (id: string) => {
    setDenunciantes(denunciantes.filter(d => d.id !== id));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setArchivosAdjuntos([...archivosAdjuntos, ...Array.from(e.target.files)]);
    }
  };

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.origen) newErrors.origen = 'Debe seleccionar el origen de la noticia';
    if (!formData.territorial) newErrors.territorial = 'Debe seleccionar la territorial';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.denunciado.nombre) newErrors['denunciado.nombre'] = 'Nombre es obligatorio';
    if (!formData.denunciado.identificacion) newErrors['denunciado.identificacion'] = 'Identificación es obligatoria';
    if (!formData.denunciado.dependencia) newErrors['denunciado.dependencia'] = 'Dependencia es obligatoria';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = () => {
    // El paso 3 (denunciantes) es opcional, no requiere validación
    // Los denunciantes pueden agregarse opcionalmente
    return true;
  };

  const validateStep4 = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.descripcionHechos || formData.descripcionHechos.length < 20) {
      newErrors.descripcionHechos = 'Debe describir los hechos (mínimo 20 caracteres)';
    }
    if (formData.conductasSeleccionadas.length === 0) {
      newErrors.conductas = 'Debe seleccionar al menos una conducta';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    let isValid = false;

    switch (currentStep) {
      case 1:
        isValid = validateStep1();
        break;
      case 2:
        isValid = validateStep2();
        break;
      case 3:
        isValid = validateStep3();
        break;
      default:
        isValid = true;
    }

    if (isValid) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleSave = () => {
    if (!validateStep4()) return;

    const dataToSave = {
      ...formData,
      denunciantes,
      archivosAdjuntos,
      fechaRegistro: new Date().toISOString(),
      radicador: 'Usuario Actual' // En producción vendría del contexto
    };

    onSave(dataToSave);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[111] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div 
          className="px-6 py-4 border-b border-gray-200 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg, #003DA5 0%, #0052CC 100%)' }}
        >
          <div>
            <h2 className="text-xl font-bold text-white">Nueva Noticia Disciplinaria</h2>
            <p className="text-sm text-white/80 mt-1">RF001 – Sistema de radicación automática</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Stepper */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {[
              { num: 1, label: 'Datos Básicos' },
              { num: 2, label: 'Denunciado' },
              { num: 3, label: 'Denunciantes' },
              { num: 4, label: 'Hechos y Documentos' }
            ].map((step, idx) => (
              <div key={step.num} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                      currentStep >= step.num
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {step.num}
                  </div>
                  <span className="text-xs mt-2 text-gray-600">{step.label}</span>
                </div>
                {idx < 3 && (
                  <div
                    className={`w-16 h-1 mx-2 ${
                      currentStep > step.num ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* PASO 1: Datos Básicos */}
          {currentStep === 1 && (
            <div className="space-y-6 max-w-2xl mx-auto">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Origen de la Noticia *
                </label>
                <select
                  value={formData.origen}
                  onChange={(e) => handleChange('origen', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.origen ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Seleccione el origen...</option>
                  {ORIGENES_NOTICIA.map(origen => (
                    <option key={origen} value={origen}>{origen}</option>
                  ))}
                </select>
                {errors.origen && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.origen}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Fecha de la Queja *
                </label>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50"
                    style={{ borderColor: formData.usarFechaActual ? '#003DA5' : '#D1D5DB' }}
                  >
                    <input
                      type="radio"
                      checked={formData.usarFechaActual}
                      onChange={() => {
                        handleChange('usarFechaActual', true);
                        handleChange('fechaQueja', new Date().toISOString().split('T')[0]);
                      }}
                    />
                    <div>
                      <p className="font-medium text-gray-900">Fecha actual (automática)</p>
                      <p className="text-xs text-gray-500">El sistema registrará la fecha de hoy</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50"
                    style={{ borderColor: !formData.usarFechaActual ? '#003DA5' : '#D1D5DB' }}
                  >
                    <input
                      type="radio"
                      checked={!formData.usarFechaActual}
                      onChange={() => handleChange('usarFechaActual', false)}
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 mb-2">Fecha específica</p>
                      {!formData.usarFechaActual && (
                        <input
                          type="date"
                          value={formData.fechaQueja}
                          onChange={(e) => handleChange('fechaQueja', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      )}
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Territorial *
                </label>
                <select
                  value={formData.territorial}
                  onChange={(e) => handleChange('territorial', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.territorial ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Seleccione territorial...</option>
                  {TERRITORIALES_ESAP.map(territorial => (
                    <option key={territorial} value={territorial}>{territorial}</option>
                  ))}
                </select>
                {errors.territorial && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.territorial}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* PASO 2: Datos del Denunciado */}
          {currentStep === 2 && (
            <div className="space-y-6 max-w-2xl mx-auto">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <User className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-blue-900 mb-1">Datos del Denunciado</h3>
                    <p className="text-sm text-blue-700">
                      Información de la persona señalada en la noticia disciplinaria
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    value={formData.denunciado.nombre}
                    onChange={(e) => handleChange('denunciado.nombre', e.target.value)}
                    placeholder="Nombres y apellidos completos"
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors['denunciado.nombre'] ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors['denunciado.nombre'] && (
                    <p className="text-xs text-red-600 mt-1">{errors['denunciado.nombre']}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Identificación *
                  </label>
                  <input
                    type="text"
                    value={formData.denunciado.identificacion}
                    onChange={(e) => handleChange('denunciado.identificacion', e.target.value)}
                    placeholder="Número de cédula"
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors['denunciado.identificacion'] ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors['denunciado.identificacion'] && (
                    <p className="text-xs text-red-600 mt-1">{errors['denunciado.identificacion']}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Cargo
                  </label>
                  <input
                    type="text"
                    value={formData.denunciado.cargo}
                    onChange={(e) => handleChange('denunciado.cargo', e.target.value)}
                    placeholder="Cargo del denunciado"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <Building2 className="w-4 h-4 inline mr-1" />
                    Dependencia del Denunciado *
                  </label>
                  <select
                    value={formData.denunciado.dependencia}
                    onChange={(e) => handleChange('denunciado.dependencia', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors['denunciado.dependencia'] ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Seleccione dependencia...</option>
                    {DEPENDENCIAS_ESAP.map(dep => (
                      <option key={dep} value={dep}>{dep}</option>
                    ))}
                  </select>
                  {errors['denunciado.dependencia'] && (
                    <p className="text-xs text-red-600 mt-1">{errors['denunciado.dependencia']}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* PASO 3: Denunciantes */}
          {currentStep === 3 && (
            <div className="space-y-6 max-w-3xl mx-auto">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-amber-900 mb-1">Denunciantes Opcionales</h3>
                    <p className="text-sm text-amber-700">
                      Puede agregar uno o varios denunciantes. Si el origen es "Anónimo", puede omitir esta sección.
                    </p>
                  </div>
                </div>
              </div>

              {/* Formulario para agregar denunciante */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-4">Agregar Denunciante</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre Completo
                    </label>
                    <input
                      type="text"
                      value={currentDenunciante.nombre}
                      onChange={(e) => setCurrentDenunciante({ ...currentDenunciante, nombre: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Identificación
                    </label>
                    <input
                      type="text"
                      value={currentDenunciante.identificacion}
                      onChange={(e) => setCurrentDenunciante({ ...currentDenunciante, identificacion: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dirección
                    </label>
                    <input
                      type="text"
                      value={currentDenunciante.direccion}
                      onChange={(e) => setCurrentDenunciante({ ...currentDenunciante, direccion: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Teléfono
                    </label>
                    <input
                      type="text"
                      value={currentDenunciante.telefono}
                      onChange={(e) => setCurrentDenunciante({ ...currentDenunciante, telefono: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Correo Electrónico
                    </label>
                    <input
                      type="email"
                      value={currentDenunciante.correo}
                      onChange={(e) => setCurrentDenunciante({ ...currentDenunciante, correo: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cargo
                    </label>
                    <input
                      type="text"
                      value={currentDenunciante.cargo}
                      onChange={(e) => setCurrentDenunciante({ ...currentDenunciante, cargo: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Entidad
                    </label>
                    <input
                      type="text"
                      value={currentDenunciante.entidad}
                      onChange={(e) => setCurrentDenunciante({ ...currentDenunciante, entidad: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <Button
                    onClick={handleAgregarDenunciante}
                    variant="outline"
                    className="w-full border-blue-600 text-blue-700 hover:bg-blue-50"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar Denunciante
                  </Button>
                </div>
              </div>

              {/* Lista de denunciantes agregados */}
              {denunciantes.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">
                    Denunciantes Registrados ({denunciantes.length})
                  </h3>
                  <div className="space-y-2">
                    {denunciantes.map(denunciante => (
                      <div key={denunciante.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{denunciante.nombre}</p>
                          <p className="text-sm text-gray-600">
                            {denunciante.identificacion} • {denunciante.entidad || 'Sin entidad'}
                          </p>
                        </div>
                        <button
                          onClick={() => handleEliminarDenunciante(denunciante.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PASO 4: Hechos y Documentos */}
          {currentStep === 4 && (
            <div className="space-y-6 max-w-2xl mx-auto">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Descripción Detallada de los Hechos *
                </label>
                <textarea
                  value={formData.descripcionHechos}
                  onChange={(e) => handleChange('descripcionHechos', e.target.value)}
                  rows={6}
                  placeholder="Describa de manera clara y detallada los hechos que originan la noticia disciplinaria..."
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.descripcionHechos ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                <div className="flex justify-between items-center mt-1">
                  {errors.descripcionHechos && (
                    <p className="text-xs text-red-600">{errors.descripcionHechos}</p>
                  )}
                  <p className="text-xs text-gray-500 ml-auto">
                    {formData.descripcionHechos.length} caracteres
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Conductas Presuntamente Indisciplinarias *
                </label>
                <div className="border border-gray-300 rounded-lg p-4 max-h-64 overflow-auto">
                  <div className="grid grid-cols-1 gap-2">
                    {CONDUCTAS_INDISCIPLINARIAS.map(conducta => (
                      <label
                        key={conducta}
                        className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formData.conductasSeleccionadas.includes(conducta)}
                          onChange={() => handleConductaToggle(conducta)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm text-gray-700">{conducta}</span>
                      </label>
                    ))}
                  </div>
                </div>
                {errors.conductas && (
                  <p className="text-xs text-red-600 mt-1">{errors.conductas}</p>
                )}
                {formData.conductasSeleccionadas.length > 0 && (
                  <p className="text-xs text-gray-600 mt-2">
                    {formData.conductasSeleccionadas.length} conducta(s) seleccionada(s)
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Upload className="w-4 h-4 inline mr-1" />
                  Documentos Soporte
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">
                      Click para seleccionar archivos
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      PDF, Word, Excel, imágenes
                    </p>
                  </label>
                </div>
                {archivosAdjuntos.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {archivosAdjuntos.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                        <span className="text-sm text-gray-700">{file.name}</span>
                        <button
                          onClick={() => setArchivosAdjuntos(archivosAdjuntos.filter((_, i) => i !== idx))}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between bg-gray-50">
          <Button
            onClick={currentStep === 1 ? onClose : () => setCurrentStep(currentStep - 1)}
            variant="outline"
          >
            {currentStep === 1 ? 'Cancelar' : 'Anterior'}
          </Button>
          
          {currentStep < 4 ? (
            <Button
              onClick={handleNextStep}
              style={{ background: '#003DA5', color: '#FFFFFF' }}
            >
              Siguiente
            </Button>
          ) : (
            <Button
              onClick={handleSave}
              style={{ background: '#10B981', color: '#FFFFFF' }}
            >
              Guardar Noticia
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}