/**
 * FORMULARIO EXPEDIENTE COMPLETO - REQ-MOD01-001
 * Implementación completa según especificaciones SIGL
 * 4 Jurisdicciones: Contencioso, Ordinaria, Laboral, Constitucional
 * Oficina Asesora Jurídica - ESAP
 */

import { useState, useEffect } from 'react';
import { Check, ChevronRight, ChevronLeft, AlertCircle, Scale, Calendar, User, FileText } from 'lucide-react';

// ⭐ IMPORTAR COMPONENTES DEL DESIGN SYSTEM SIGL
import {
  ButtonSIGL,
  InputSIGL,
  SelectSIGL,
  BadgeSIGL,
  useToast,
} from './design-system';

// ⭐ IMPORTAR UTILIDADES DE DÍAS HÁBILES
import { 
  calcularFechaVencimiento, 
  calcularDiasHabilesRestantes,
  obtenerInfoCalculoVencimiento,
  esFestivo,
  esFinDeSemana 
} from '../../../utils/diasHabiles';

// ⭐ IMPORTAR UTILIDADES DE VALIDACIÓN
import {
  validarDemandadoIncluyeESAP,
  validarFechaNotificacion,
  validarFechaDemandaCoherente,
  detectarExpedienteDuplicado,
  validarPlazo,
  type Expediente as ExpedienteValidacion,
} from '../../../utils/validaciones';

// ========== TIPOS Y CONSTANTES ==========

type Jurisdiccion = 'CONTENCIOSO' | 'ORDINARIA' | 'LABORAL' | 'CONSTITUCIONAL';
type ConceptoTermino = 'CADUCIDAD' | 'PRESCRIPCION';

interface JurisdiccionConfig {
  nombre: string;
  fundamentoLegal: string;
  plazoDefecto: number;
  conceptoTermino: ConceptoTermino;
  mediosControl: Array<{ value: string; label: string; plazo?: number }>;
  etapasProcesales: string[];
  color: string;
}

// Configuración de las 4 jurisdicciones según REQ-MOD01-001
const JURISDICCIONES: Record<Jurisdiccion, JurisdiccionConfig> = {
  CONTENCIOSO: {
    nombre: 'Contencioso Administrativo',
    fundamentoLegal: 'Ley 1437/2011',
    plazoDefecto: 30,
    conceptoTermino: 'CADUCIDAD',
    mediosControl: [
      { value: 'nulidad', label: 'Acción de Nulidad', plazo: 30 },
      { value: 'nulidad_electoral', label: 'Acción de Nulidad Contencioso Electoral', plazo: 30 },
      { value: 'restablecimiento', label: 'Acción de Restablecimiento del Derecho', plazo: 30 },
      { value: 'perdida_oportunidad', label: 'Acción de Pérdida de Oportunidad', plazo: 30 },
      { value: 'lesion_carga', label: 'Acción de Lesión a Carga Financiera', plazo: 30 },
      { value: 'repeticion', label: 'Acción de Repetición', plazo: 30 },
      { value: 'mandato_constitucional', label: 'Acción de Mandato Constitucional', plazo: 30 },
    ],
    etapasProcesales: [
      'Demanda presentada',
      'Auto de admisión/inadmisión',
      'Contestación demanda',
      'Pruebas (sustanciación)',
      'Audiencia de juzgamiento',
      'Sentencia',
    ],
    color: '#1F4788',
  },
  ORDINARIA: {
    nombre: 'Ordinaria',
    fundamentoLegal: 'Ley 1564/2012 (Código General del Proceso)',
    plazoDefecto: 30,
    conceptoTermino: 'CADUCIDAD',
    mediosControl: [
      { value: 'declarativo_ordinario', label: 'Proceso Declarativo Ordinario', plazo: 30 },
      { value: 'declarativo_sumario', label: 'Proceso Declarativo Sumario', plazo: 30 },
      { value: 'declarativo_monitorio', label: 'Proceso Declarativo Monitorio', plazo: 20 },
      { value: 'ejecutivo_unico', label: 'Proceso Ejecutivo Único Acreedor', plazo: 20 },
      { value: 'ejecutivo_multiple', label: 'Proceso Ejecutivo Múltiples Acreedores', plazo: 20 },
      { value: 'monitorio', label: 'Proceso Monitorio', plazo: 20 },
      { value: 'cautelar', label: 'Proceso Cautelar', plazo: 10 },
    ],
    etapasProcesales: [
      'Demanda/petición',
      'Admisión/inadmisión',
      'Audiencia inicial (Art. 372 CGP)',
      'Práctica de pruebas',
      'Audiencia de juzgamiento',
      'Sentencia',
    ],
    color: '#6F42C1',
  },
  LABORAL: {
    nombre: 'Laboral',
    fundamentoLegal: 'Ley 141/1961 (Código Procesal Laboral)',
    plazoDefecto: 30,
    conceptoTermino: 'PRESCRIPCION',
    mediosControl: [
      { value: 'ordinario', label: 'Proceso Ordinario Laboral', plazo: 30 },
      { value: 'sumario', label: 'Proceso Sumario', plazo: 20 },
      { value: 'ejecutivo_laboral', label: 'Proceso Ejecutivo Laboral', plazo: 15 },
      { value: 'fuero_sindical', label: 'Fuero Sindical', plazo: 30 },
      { value: 'calificacion_despido', label: 'Calificación de Despido', plazo: 30 },
    ],
    etapasProcesales: [
      'Demanda/petición',
      'Auto de admisión',
      'Conciliación prejudicial',
      'Audiencia de conciliación/juzgamiento (Art. 101 CPL)',
      'Práctica de pruebas',
      'Sentencia',
    ],
    color: '#17A2B8',
  },
  CONSTITUCIONAL: {
    nombre: 'Constitucional',
    fundamentoLegal: 'Constitución Política Art. 86, Decreto 2591/1991',
    plazoDefecto: 10,
    conceptoTermino: 'CADUCIDAD',
    mediosControl: [
      { value: 'tutela', label: 'Acción de Tutela', plazo: 10 }, // TAXATIVO
      { value: 'accion_publica', label: 'Acción Pública de Inconstitucionalidad', plazo: 60 },
      { value: 'conflicto_competencia', label: 'Conflicto de Competencia', plazo: 30 },
      { value: 'accion_cumplimiento', label: 'Acción de Cumplimiento', plazo: 30 },
    ],
    etapasProcesales: [
      'Presentación acción',
      'Admisión/inadmisión',
      'Respuesta de demandado',
      'Audiencia oral (si se convoca)',
      'Decisión (fallo, sentencia, auto)',
    ],
    color: '#DC3545',
  },
};

// Lista de abogados (mock - debería venir de BD)
const ABOGADOS_MOCK = [
  { value: 'mendoza', label: 'Dr. Carlos Mendoza', activo: true },
  { value: 'torres', label: 'Dra. María Torres', activo: true },
  { value: 'ramirez', label: 'Dr. Luis Ramírez', activo: true },
  { value: 'gonzalez', label: 'Dra. Patricia González', activo: true },
  { value: 'castillo', label: 'Dr. Andrés Castillo', activo: true },
];

interface ExpedienteFormData {
  // Paso 1: Jurisdicción
  jurisdiccion: Jurisdiccion | '';
  
  // Paso 2: Información Básica
  demandante: string;
  demandado: string;
  juzgado: string;
  medioControl: string;
  
  // Paso 3: Información de Demanda
  pretensionDemandante: string;
  actoAdministrativo: string;
  fechaNotificacion: string;
  fechaDemandaPresentada: string;
  valorDemanda: string;
  
  // Paso 4: Asignación y Plazo
  abogadoLitigante: string;
  abogadoSustanciador: string;
  plazoAutomatico: number;
  plazoEspecial: string;
  justificacionPlazo: string;
  fechaVencimiento: string;
}

interface Props {
  mode?: 'create' | 'edit';
  initialData?: Partial<ExpedienteFormData>;
  onGuardar?: (data: ExpedienteFormData) => void;
  onCancelar?: () => void;
  onSubmit?: (data: ExpedienteFormData) => void;
  onCancel?: () => void;
  userRole?: 'ABOGADO' | 'JEFE_OJ'; // Para validar permisos de plazo especial
}

export function FormularioExpedienteCompleto({ 
  mode = 'create', 
  initialData, 
  onGuardar,
  onCancelar,
  onSubmit, 
  onCancel,
  userRole = 'ABOGADO'
}: Props) {
  const { showToast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<ExpedienteFormData>({
    jurisdiccion: '',
    demandante: '',
    demandado: '',
    juzgado: '',
    medioControl: '',
    pretensionDemandante: '',
    actoAdministrativo: '',
    fechaNotificacion: '',
    fechaDemandaPresentada: '',
    valorDemanda: '',
    abogadoLitigante: '',
    abogadoSustanciador: '',
    plazoAutomatico: 0,
    plazoEspecial: '',
    justificacionPlazo: '',
    fechaVencimiento: '',
    ...initialData,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [isDuplicateCheck, setIsDuplicateCheck] = useState(false);

  const totalSteps = 4;

  // Configuración actual de jurisdicción
  const jurisdiccionConfig = formData.jurisdiccion 
    ? JURISDICCIONES[formData.jurisdiccion as Jurisdiccion] 
    : null;

  // ========== VALIDACIONES ==========

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1: // Jurisdicción
        if (!formData.jurisdiccion) {
          newErrors.jurisdiccion = 'Debe seleccionar una jurisdicción';
        }
        break;

      case 2: // Información Básica
        if (!formData.demandante?.trim()) {
          newErrors.demandante = 'Campo requerido';
        } else if (formData.demandante.length > 255) {
          newErrors.demandante = 'Máximo 255 caracteres';
        }

        if (!formData.demandado?.trim()) {
          newErrors.demandado = 'Campo requerido';
        } else {
          // RN-002: Demandado DEBE incluir ESAP
          const validacionDemandado = validarDemandadoIncluyeESAP(formData.demandado, userRole);
          if (!validacionDemandado.isValid) {
            newErrors.demandado = validacionDemandado.error || 'El demandado debe incluir "ESAP"';
          }
          
          if (formData.demandado.length > 255) {
            newErrors.demandado = 'Máximo 255 caracteres';
          }
        }

        if (!formData.juzgado?.trim()) {
          newErrors.juzgado = 'Campo requerido';
        } else if (formData.juzgado.length > 255) {
          newErrors.juzgado = 'Máximo 255 caracteres';
        }

        if (!formData.medioControl) {
          newErrors.medioControl = 'Debe seleccionar un medio de control';
        }
        break;

      case 3: // Información de Demanda
        if (!formData.pretensionDemandante?.trim()) {
          newErrors.pretensionDemandante = 'Campo requerido';
        } else if (formData.pretensionDemandante.length > 1000) {
          newErrors.pretensionDemandante = 'Máximo 1000 caracteres';
        }

        if (formData.actoAdministrativo && formData.actoAdministrativo.length > 500) {
          newErrors.actoAdministrativo = 'Máximo 500 caracteres';
        }

        if (!formData.fechaNotificacion) {
          newErrors.fechaNotificacion = 'Campo requerido';
        } else {
          // RN-003: Fecha no puede ser futura
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const fechaNotif = new Date(formData.fechaNotificacion);
          fechaNotif.setHours(0, 0, 0, 0);
          
          if (fechaNotif > today) {
            newErrors.fechaNotificacion = 'La fecha no puede ser futura';
          }
          
          // No puede ser más de 2 años atrás
          const dosAñosAtras = new Date();
          dosAñosAtras.setFullYear(dosAñosAtras.getFullYear() - 2);
          dosAñosAtras.setHours(0, 0, 0, 0);
          
          if (fechaNotif < dosAñosAtras) {
            newErrors.fechaNotificacion = 'La fecha no puede ser mayor a 2 años atrás';
          }
        }

        if (!formData.fechaDemandaPresentada) {
          newErrors.fechaDemandaPresentada = 'Campo requerido';
        } else {
          // RN-005: Fecha de demanda debe ser posterior a la notificación
          const fechaNotif = new Date(formData.fechaNotificacion);
          const fechaDemanda = new Date(formData.fechaDemandaPresentada);
          fechaNotif.setHours(0, 0, 0, 0);
          fechaDemanda.setHours(0, 0, 0, 0);
          
          if (fechaDemanda < fechaNotif) {
            newErrors.fechaDemandaPresentada = 'La fecha de demanda debe ser posterior a la notificación';
          }
        }

        // Validar valor demanda si se ingresó
        if (formData.valorDemanda) {
          const valor = parseFloat(formData.valorDemanda);
          if (isNaN(valor) || valor < 0) {
            newErrors.valorDemanda = 'Debe ser un valor numérico válido';
          }
        }
        break;

      case 4: // Asignación y Plazo
        if (!formData.abogadoLitigante) {
          newErrors.abogadoLitigante = 'Debe asignar un abogado litigante';
        }

        // RN-009: Plazo no puede ser 0 o negativo
        if (formData.plazoEspecial) {
          const plazo = parseInt(formData.plazoEspecial);
          if (isNaN(plazo) || plazo <= 0) {
            newErrors.plazoEspecial = 'El plazo debe ser mayor a 0 días';
          }
          
          // Si hay plazo especial, debe haber justificación (solo Jefe OJ)
          if (userRole === 'JEFE_OJ' && !formData.justificacionPlazo?.trim()) {
            newErrors.justificacionPlazo = 'Debe justificar el plazo especial';
          }
        }

        if (!formData.fechaVencimiento) {
          newErrors.fechaVencimiento = 'Debe calcularse la fecha de vencimiento';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ========== CÁLCULO AUTOMÁTICO DE PLAZOS ==========

  // Efecto para calcular plazo automático al cambiar jurisdicción o medio
  useEffect(() => {
    if (formData.jurisdiccion && formData.medioControl) {
      const config = JURISDICCIONES[formData.jurisdiccion as Jurisdiccion];
      const medio = config.mediosControl.find(m => m.value === formData.medioControl);
      
      if (medio && medio.plazo) {
        setFormData(prev => ({ ...prev, plazoAutomatico: medio.plazo! }));
      } else {
        setFormData(prev => ({ ...prev, plazoAutomatico: config.plazoDefecto }));
      }
    }
  }, [formData.jurisdiccion, formData.medioControl]);

  // Efecto para calcular fecha de vencimiento
  useEffect(() => {
    if (formData.fechaNotificacion) {
      const plazoFinal = formData.plazoEspecial 
        ? parseInt(formData.plazoEspecial) 
        : formData.plazoAutomatico;
      
      if (plazoFinal > 0) {
        const fechaNotif = new Date(formData.fechaNotificacion);
        const fechaVenc = calcularFechaVencimiento(fechaNotif, plazoFinal);
        const fechaVencStr = fechaVenc.toISOString().split('T')[0];
        setFormData(prev => ({ ...prev, fechaVencimiento: fechaVencStr }));
      }
    }
  }, [formData.fechaNotificacion, formData.plazoAutomatico, formData.plazoEspecial]);

  // ========== VERIFICACIÓN DE DUPLICADOS (RN-004) ==========

  const verificarDuplicado = async () => {
    // Simular verificación (en producción sería llamada a API)
    if (formData.demandante && formData.demandado && formData.fechaNotificacion) {
      // Mock: detectar duplicado
      const esDuplicado = false; // Aquí iría lógica real
      
      if (esDuplicado) {
        setShowDuplicateWarning(true);
        return true;
      }
    }
    return false;
  };

  // ========== HANDLERS ==========

  const handleNext = async () => {
    if (validateStep(currentStep)) {
      // En paso 3, verificar duplicados antes de avanzar
      if (currentStep === 3 && !isDuplicateCheck) {
        const esDuplicado = await verificarDuplicado();
        if (esDuplicado) {
          return; // No avanza si hay duplicado
        }
      }
      
      if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1);
      }
    } else {
      showToast({
        variant: 'warning',
        title: 'Campos Requeridos',
        message: 'Por favor complete todos los campos obligatorios',
      });
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    if (validateStep(currentStep)) {
      // Redondear valor demanda a 2 decimales (EDGE CASE 10)
      if (formData.valorDemanda) {
        const valor = parseFloat(formData.valorDemanda);
        formData.valorDemanda = valor.toFixed(2);
      }
      
      onSubmit && onSubmit(formData as ExpedienteFormData);
      onGuardar && onGuardar(formData as ExpedienteFormData);
    }
  };

  const handleInputChange = (field: keyof ExpedienteFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Limpiar error del campo
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Determinar si el plazo es taxativo
  const esPlazoTaxativo = () => {
    if (!formData.jurisdiccion || !formData.medioControl) return false;
    
    // TUTELA es SIEMPRE taxativo (10 días)
    if (formData.jurisdiccion === 'CONSTITUCIONAL' && formData.medioControl === 'tutela') {
      return true;
    }
    
    return false;
  };

  const plazoTaxativo = esPlazoTaxativo();

  return (
    <div className="space-y-6">
      {/* Stepper Header */}
      <div className="flex items-center justify-between">
        {[1, 2, 3, 4].map((step) => (
          <div key={step} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: currentStep >= step ? '#1F4788' : '#E5E7EB',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  transition: 'all 0.3s',
                }}
              >
                {currentStep > step ? <Check size={20} /> : step}
              </div>
              <span
                style={{
                  fontSize: '12px',
                  marginTop: '8px',
                  color: currentStep >= step ? '#1F4788' : '#9CA3AF',
                  fontWeight: currentStep === step ? 600 : 400,
                  textAlign: 'center',
                }}
              >
                {step === 1 && 'Jurisdicción'}
                {step === 2 && 'Información Básica'}
                {step === 3 && 'Demanda'}
                {step === 4 && 'Asignación y Plazo'}
              </span>
            </div>
            {step < 4 && (
              <div
                style={{
                  flex: 1,
                  height: '2px',
                  backgroundColor: currentStep > step ? '#1F4788' : '#E5E7EB',
                  margin: '0 8px',
                  marginBottom: '28px',
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Contenido del Paso */}
      <div className="min-h-[500px]">
        {/* PASO 1: JURISDICCIÓN */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Scale className="w-6 h-6 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-blue-900 text-lg">Selección de Jurisdicción</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    La jurisdicción determina los plazos y procedimientos aplicables según la legislación colombiana
                  </p>
                </div>
              </div>
            </div>

            <SelectSIGL
              label="Jurisdicción"
              placeholder="Seleccione la jurisdicción del proceso"
              options={[
                { value: 'CONTENCIOSO', label: '⚖️ Contencioso Administrativo' },
                { value: 'ORDINARIA', label: '📋 Ordinaria' },
                { value: 'LABORAL', label: '👔 Laboral' },
                { value: 'CONSTITUCIONAL', label: '📜 Constitucional' },
              ]}
              value={formData.jurisdiccion}
              onChange={(value) => handleInputChange('jurisdiccion', value)}
              required
              error={errors.jurisdiccion}
            />

            {/* Info de la jurisdicción seleccionada */}
            {jurisdiccionConfig && (
              <div 
                className="rounded-lg p-6 border-2"
                style={{ 
                  backgroundColor: `${jurisdiccionConfig.color}10`,
                  borderColor: jurisdiccionConfig.color 
                }}
              >
                <h4 className="font-bold text-lg mb-4" style={{ color: jurisdiccionConfig.color }}>
                  {jurisdiccionConfig.nombre}
                </h4>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Fundamento Legal:</p>
                    <p className="text-sm text-gray-900">{jurisdiccionConfig.fundamentoLegal}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Plazo por Defecto:</p>
                    <p className="text-sm text-gray-900">{jurisdiccionConfig.plazoDefecto} días hábiles</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Concepto de Término:</p>
                    <BadgeSIGL variant={jurisdiccionConfig.conceptoTermino === 'CADUCIDAD' ? 'danger' : 'warning'}>
                      {jurisdiccionConfig.conceptoTermino}
                    </BadgeSIGL>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Cálculo:</p>
                    <p className="text-sm text-gray-900">Días HÁBILES (Lun-Vie, excluye festivos)</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Etapas Procesales:</p>
                  <div className="flex flex-wrap gap-2">
                    {jurisdiccionConfig.etapasProcesales.map((etapa, index) => (
                      <span 
                        key={index}
                        className="text-xs px-2 py-1 rounded"
                        style={{ 
                          backgroundColor: 'white',
                          border: `1px solid ${jurisdiccionConfig.color}`,
                          color: jurisdiccionConfig.color
                        }}
                      >
                        {index + 1}. {etapa}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PASO 2: INFORMACIÓN BÁSICA */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="bg-purple-50 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-purple-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-purple-900">Información Básica del Proceso</h4>
                  <p className="text-sm text-purple-700 mt-1">
                    Ingrese los datos principales de las partes y el despacho judicial
                  </p>
                </div>
              </div>
            </div>

            <InputSIGL
              label="Demandante / Investigado"
              placeholder="Nombre completo de la persona o entidad"
              value={formData.demandante}
              onChange={(e) => handleInputChange('demandante', e.target.value)}
              required
              error={errors.demandante}
              helperText="Máximo 255 caracteres"
            />

            <InputSIGL
              label="Demandado"
              placeholder="ESAP o dependencia específica"
              value={formData.demandado}
              onChange={(e) => handleInputChange('demandado', e.target.value)}
              required
              error={errors.demandado}
              helperText="Debe incluir 'ESAP' en el nombre"
            />

            <InputSIGL
              label="Juzgado / Tribunal / Entidad Competente"
              placeholder={
                formData.jurisdiccion === 'CONTENCIOSO' 
                  ? 'Ej: Juzgado 3º Administrativo de Bogotá'
                  : formData.jurisdiccion === 'LABORAL'
                  ? 'Ej: Juzgado Laboral del Circuito de Bogotá'
                  : 'Nombre completo del despacho judicial'
              }
              value={formData.juzgado}
              onChange={(e) => handleInputChange('juzgado', e.target.value)}
              required
              error={errors.juzgado}
              helperText="Máximo 255 caracteres"
            />

            {jurisdiccionConfig && (
              <SelectSIGL
                label="Tipo de Medio de Control / Proceso"
                placeholder="Seleccione el tipo de proceso"
                options={jurisdiccionConfig.mediosControl}
                value={formData.medioControl}
                onChange={(value) => handleInputChange('medioControl', value)}
                required
                error={errors.medioControl}
              />
            )}
          </div>
        )}

        {/* PASO 3: INFORMACIÓN DE DEMANDA */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div className="bg-amber-50 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-amber-900">Detalles de la Demanda</h4>
                  <p className="text-sm text-amber-700 mt-1">
                    Complete la información específica del proceso judicial
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pretensión del Demandante <span className="text-red-500">*</span>
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={5}
                placeholder="Describa las pretensiones de la demanda..."
                value={formData.pretensionDemandante}
                onChange={(e) => handleInputChange('pretensionDemandante', e.target.value)}
                maxLength={1000}
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.pretensionDemandante.length}/1000 caracteres
              </p>
              {errors.pretensionDemandante && (
                <p className="text-sm text-red-600 mt-1">{errors.pretensionDemandante}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Acto Administrativo Cuestionado (Opcional)
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
                placeholder="Si aplica, describa el acto administrativo objeto de controversia..."
                value={formData.actoAdministrativo}
                onChange={(e) => handleInputChange('actoAdministrativo', e.target.value)}
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.actoAdministrativo.length}/500 caracteres
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <InputSIGL
                label="Fecha de Notificación"
                type="date"
                value={formData.fechaNotificacion}
                onChange={(e) => handleInputChange('fechaNotificacion', e.target.value)}
                required
                error={errors.fechaNotificacion}
                helperText="Fecha en que se recibió la notificación oficial"
                max={new Date().toISOString().split('T')[0]}
              />

              <InputSIGL
                label="Fecha Demanda Presentada"
                type="date"
                value={formData.fechaDemandaPresentada}
                onChange={(e) => handleInputChange('fechaDemandaPresentada', e.target.value)}
                required
                error={errors.fechaDemandaPresentada}
                helperText="Puede diferir de la fecha de notificación"
              />
            </div>

            <InputSIGL
              label="Valor de la Demanda (Opcional)"
              type="number"
              placeholder="0.00"
              value={formData.valorDemanda}
              onChange={(e) => handleInputChange('valorDemanda', e.target.value)}
              error={errors.valorDemanda}
              helperText="Si aplica, ingrese la cuantía reclamada"
              step="0.01"
            />

            {/* Alerta de duplicado */}
            {showDuplicateWarning && (
              <div className="bg-red-50 border-2 border-red-500 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-red-900">⚠️ Expediente Duplicado Detectado</h4>
                    <p className="text-sm text-red-700 mt-1">
                      Ya existe un expediente con el mismo demandante, demandado y fecha similar
                    </p>
                    <p className="text-sm text-red-700 font-semibold mt-2">
                      Expediente existente: PJ-2025-00147
                    </p>
                    <div className="flex gap-3 mt-3">
                      <ButtonSIGL
                        variant="secondary"
                        size="small"
                        onClick={() => {
                          // Ver expediente existente
                          showToast({
                            variant: 'info',
                            title: 'Expediente Existente',
                            message: 'Abriendo PJ-2025-00147...',
                          });
                        }}
                      >
                        Ver Existente
                      </ButtonSIGL>
                      <ButtonSIGL
                        variant="danger"
                        size="small"
                        onClick={() => {
                          setShowDuplicateWarning(false);
                          setIsDuplicateCheck(true);
                          showToast({
                            variant: 'warning',
                            title: 'Crear de Todas Formas',
                            message: 'Se registrará como expediente duplicado deliberado',
                          });
                        }}
                      >
                        Crear de Todas Formas
                      </ButtonSIGL>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PASO 4: ASIGNACIÓN Y PLAZO */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <div className="bg-green-50 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-green-900">Asignación y Determinación de Plazo</h4>
                  <p className="text-sm text-green-700 mt-1">
                    Asigne el abogado responsable y configure los plazos procesales
                  </p>
                </div>
              </div>
            </div>

            <SelectSIGL
              label="Abogado Litigante"
              placeholder="Seleccione abogado sustanciador"
              options={ABOGADOS_MOCK.filter(a => a.activo)}
              value={formData.abogadoLitigante}
              onChange={(value) => handleInputChange('abogadoLitigante', value)}
              required
              error={errors.abogadoLitigante}
              helperText="RN-007: Un expediente = exactamente 1 abogado litigante"
            />

            <SelectSIGL
              label="Abogado Sustanciador (Opcional)"
              placeholder="Seleccione abogado auxiliar"
              options={[
                { value: '', label: 'Sin asignar' },
                ...ABOGADOS_MOCK.filter(a => a.activo),
              ]}
              value={formData.abogadoSustanciador}
              onChange={(value) => handleInputChange('abogadoSustanciador', value)}
              helperText="Rol futuro - opcional"
            />

            {/* Banner de Plazo Automático */}
            {formData.plazoAutomatico > 0 && (
              <div 
                className={`rounded-lg p-4 border-2 ${
                  plazoTaxativo 
                    ? 'bg-red-50 border-red-500' 
                    : 'bg-blue-50 border-blue-500'
                }`}
              >
                <div className="flex items-start gap-3">
                  <AlertCircle 
                    className={`w-5 h-5 mt-0.5 ${
                      plazoTaxativo ? 'text-red-600' : 'text-blue-600'
                    }`}
                  />
                  <div>
                    <h4 className={`font-semibold ${
                      plazoTaxativo ? 'text-red-900' : 'text-blue-900'
                    }`}>
                      {plazoTaxativo ? '🔒 Plazo Taxativo de Ley' : '📋 Plazo Automático Calculado'}
                    </h4>
                    <p className={`text-sm mt-1 ${
                      plazoTaxativo ? 'text-red-700' : 'text-blue-700'
                    }`}>
                      {plazoTaxativo 
                        ? `Este plazo está anclado en ley (${jurisdiccionConfig?.fundamentoLegal}) y NO es editable`
                        : `Plazo calculado según jurisdicción ${formData.jurisdiccion}: ${formData.plazoAutomatico} días hábiles`
                      }
                    </p>
                    <div className="mt-2">
                      <span className={`text-2xl font-bold ${
                        plazoTaxativo ? 'text-red-900' : 'text-blue-900'
                      }`}>
                        {formData.plazoAutomatico} días hábiles
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Plazo Especial (solo si NO es taxativo y usuario es Jefe OJ) */}
            {!plazoTaxativo && userRole === 'JEFE_OJ' && (
              <div className="bg-yellow-50 border-2 border-yellow-500 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-900 mb-3">
                  ⚠️ Plazo Especial (Solo Jefe OJ)
                </h4>
                
                <InputSIGL
                  label="Plazo Especial (días hábiles)"
                  type="number"
                  placeholder={formData.plazoAutomatico.toString()}
                  value={formData.plazoEspecial}
                  onChange={(e) => handleInputChange('plazoEspecial', e.target.value)}
                  error={errors.plazoEspecial}
                  helperText="Solo para casos extraordinarios no previstos en ley"
                  min="1"
                />

                {formData.plazoEspecial && (
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Justificación del Plazo Especial <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent resize-none"
                      rows={3}
                      placeholder="¿Por qué se modifica el plazo? (Obligatorio)"
                      value={formData.justificacionPlazo}
                      onChange={(e) => handleInputChange('justificacionPlazo', e.target.value)}
                    />
                    {errors.justificacionPlazo && (
                      <p className="text-sm text-red-600 mt-1">{errors.justificacionPlazo}</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Fecha de Vencimiento Calculada */}
            {formData.fechaVencimiento && (
              <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-6 border-2 border-purple-300">
                <h4 className="font-bold text-purple-900 mb-3 text-lg">
                  📅 Fecha de Vencimiento Calculada
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-purple-700">Notificación:</p>
                    <p className="text-lg font-bold text-purple-900">
                      {new Date(formData.fechaNotificacion).toLocaleDateString('es-CO', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-purple-700">Plazo:</p>
                    <p className="text-lg font-bold text-purple-900">
                      {formData.plazoEspecial || formData.plazoAutomatico} días hábiles
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-purple-700">Vencimiento:</p>
                    <p className="text-lg font-bold text-red-600">
                      {new Date(formData.fechaVencimiento).toLocaleDateString('es-CO', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-purple-600 mt-3">
                  * Cálculo en días hábiles (Lun-Vie), excluyendo festivos colombianos
                </p>
              </div>
            )}

            {/* Resumen Final */}
            <div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-lg p-6 border-2 border-blue-300">
              <h4 className="font-bold text-gray-900 mb-4 text-lg">📋 Resumen del Expediente</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Jurisdicción:</span>
                  <p className="font-semibold text-gray-900">
                    {formData.jurisdiccion ? JURISDICCIONES[formData.jurisdiccion as Jurisdiccion].nombre : '-'}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">Demandante:</span>
                  <p className="font-semibold text-gray-900">{formData.demandante || '-'}</p>
                </div>
                <div>
                  <span className="text-gray-600">Demandado:</span>
                  <p className="font-semibold text-gray-900">{formData.demandado || '-'}</p>
                </div>
                <div>
                  <span className="text-gray-600">Juzgado:</span>
                  <p className="font-semibold text-gray-900">{formData.juzgado || '-'}</p>
                </div>
                <div>
                  <span className="text-gray-600">Abogado:</span>
                  <p className="font-semibold text-gray-900">
                    {formData.abogadoLitigante 
                      ? ABOGADOS_MOCK.find(a => a.value === formData.abogadoLitigante)?.label
                      : '-'}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">Concepto:</span>
                  <BadgeSIGL variant={
                    jurisdiccionConfig?.conceptoTermino === 'CADUCIDAD' ? 'danger' : 'warning'
                  }>
                    {jurisdiccionConfig?.conceptoTermino || '-'}
                  </BadgeSIGL>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Botones de Navegación */}
      <div className="flex justify-between items-center pt-6 border-t">
        <div>
          {currentStep > 1 && (
            <ButtonSIGL
              variant="secondary"
              icon={<ChevronLeft size={16} />}
              onClick={handleBack}
            >
              Anterior
            </ButtonSIGL>
          )}
        </div>

        <div className="flex gap-3">
          <ButtonSIGL variant="secondary" onClick={onCancelar || onCancel}>
            Cancelar
          </ButtonSIGL>
          
          {currentStep < totalSteps ? (
            <ButtonSIGL
              variant="primary"
              icon={<ChevronRight size={16} />}
              iconPosition="right"
              onClick={handleNext}
            >
              Siguiente
            </ButtonSIGL>
          ) : (
            <ButtonSIGL
              variant="success"
              icon={<Check size={16} />}
              onClick={handleSubmit}
            >
              {mode === 'create' ? 'Crear Expediente' : 'Guardar Cambios'}
            </ButtonSIGL>
          )}
        </div>
      </div>
    </div>
  );
}