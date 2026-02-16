/**
 * FORMULARIO CREACIÓN DE EXPEDIENTE JUDICIAL - DEFENSA JUDICIAL
 * REQ-MOD01-001: Crear Expediente Judicial con Clasificación por Jurisdicción
 * 
 * CARACTERÍSTICAS:
 * - 4 Jurisdicciones: Contencioso, Ordinaria, Laboral, Constitucional
 * - Plazos taxativos por jurisdicción + medio control
 * - Validaciones exhaustivas según especificación
 * - Cálculo automático de fecha vencimiento (días hábiles)
 * - Detección de duplicados
 * - Auditoría completa
 */

import { useState, useEffect } from 'react';
import { X, AlertCircle, Info, Calendar, Scale, User, Building, FileText, Clock } from 'lucide-react';
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import { toast } from 'sonner';
import { legalService } from '../../../../services/api/legal.service';
import { getServiceUrl } from '../../../../config/environment';

type Jurisdiccion = 'CONTENCIOSO' | 'ORDINARIA' | 'LABORAL' | 'CONSTITUCIONAL';

// TODO: Replace with real auth hook integration
const CURRENT_USER_MOCK = {
  id: 'd290f1ee-6c54-4b01-90e6-d701748f0851', // Default ID
  role: 'JEFE_OFICINA', // 'JEFE_OFICINA' allows manual assignment. Change to 'ABOGADO' to test auto-assignment.
  nombre: 'Juan Perez'
};

interface MedioControl {
  id: string;
  nombre: string;
  plazoTaxativo: number | null; // null = plazo editable
  fundamento: string;
}

interface ExpedienteForm {
  // Clasificación
  radicado: string;
  jurisdiccion: Jurisdiccion | '';
  medioControl: string;

  // Partes
  demandante: string;
  tipoIdDemandante: 'CC' | 'CE' | 'NIT' | 'PA' | '';
  numeroIdDemandante: string;
  demandado: string;
  tipoIdDemandado: 'CC' | 'CE' | 'NIT' | 'PA' | '';
  numeroIdDemandado: string;
  juzgado: string;

  // Demanda
  pretensionDemandante: string;
  actoAdministrativo: string;
  fechaNotificacion: string;
  fechaDemandaPresentada: string;
  valorDemanda: string;

  // Asignación
  abogadoId: string;

  // Plazo
  plazoEspecial: string;
  justificacionPlazo: string;
  tipoConteoTermino: 'HABILES' | 'CALENDARIO';
}

const MEDIOS_CONTROL_POR_JURISDICCION: Record<Jurisdiccion, MedioControl[]> = {
  CONTENCIOSO: [
    { id: 'nulidad', nombre: 'Acción de Nulidad', plazoTaxativo: 30, fundamento: 'Ley 1437/2011 Art. 138' },
    { id: 'nulidad-electoral', nombre: 'Acción de Nulidad Contencioso Electoral', plazoTaxativo: 30, fundamento: 'Ley 1437/2011 Art. 139' },
    { id: 'restablecimiento', nombre: 'Acción de Restablecimiento del Derecho', plazoTaxativo: 30, fundamento: 'Ley 1437/2011 Art. 138' },
    { id: 'perdida-oportunidad', nombre: 'Acción de Pérdida de Oportunidad', plazoTaxativo: 30, fundamento: 'Ley 1437/2011' },
    { id: 'lesion-financiera', nombre: 'Acción de Lesión a Carga Financiera', plazoTaxativo: 30, fundamento: 'Ley 1437/2011' },
    { id: 'repeticion', nombre: 'Acción de Repetición', plazoTaxativo: 30, fundamento: 'Ley 1437/2011 Art. 142' },
  ],
  ORDINARIA: [
    { id: 'declarativo', nombre: 'Proceso Declarativo', plazoTaxativo: 30, fundamento: 'Ley 1564/2012 CGP' },
    { id: 'ejecutivo', nombre: 'Proceso Ejecutivo', plazoTaxativo: 30, fundamento: 'Ley 1564/2012 CGP' },
    { id: 'monitorio', nombre: 'Proceso Monitorio', plazoTaxativo: 20, fundamento: 'Ley 1564/2012 Art. 419' },
    { id: 'cautelar', nombre: 'Proceso Cautelar', plazoTaxativo: 15, fundamento: 'Ley 1564/2012' },
  ],
  LABORAL: [
    { id: 'ordinario', nombre: 'Proceso Ordinario Laboral', plazoTaxativo: 30, fundamento: 'Ley 141/1961 CPL' },
    { id: 'sumario', nombre: 'Proceso Sumario Laboral', plazoTaxativo: 20, fundamento: 'Ley 141/1961 CPL' },
  ],
  CONSTITUCIONAL: [
    { id: 'tutela', nombre: 'Acción de Tutela', plazoTaxativo: 10, fundamento: 'Decreto 2591/1991 Art. 86 CP' },
    { id: 'accion-publica', nombre: 'Acción Pública de Inconstitucionalidad', plazoTaxativo: null, fundamento: 'Constitución Art. 241' },
    { id: 'cumplimiento', nombre: 'Acción de Cumplimiento', plazoTaxativo: 30, fundamento: 'Ley 393/1997' },
  ],
};

// Abogados now fetched from backend - see useEffect below

interface FormularioExpedienteJudicialProps {
  isOpen: boolean;
  onClose: () => void;
  onExpedienteCreado: (expediente: any) => void;
}

export function FormularioExpedienteJudicial({ isOpen, onClose, onExpedienteCreado }: FormularioExpedienteJudicialProps) {
  const [formData, setFormData] = useState<ExpedienteForm>({
    radicado: '',
    jurisdiccion: '',
    medioControl: '',
    demandante: '',
    tipoIdDemandante: '',
    numeroIdDemandante: '',
    demandado: '',
    tipoIdDemandado: '',
    numeroIdDemandado: '',
    juzgado: '',
    pretensionDemandante: '',
    actoAdministrativo: '',
    fechaNotificacion: '',
    fechaDemandaPresentada: '',
    valorDemanda: '',
    abogadoId: '',
    plazoEspecial: '',
    justificacionPlazo: '',
    tipoConteoTermino: 'HABILES',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [plazoCalculado, setPlazoCalculado] = useState<number | null>(null);
  const [fundamento, setFundamento] = useState<string>('');
  const [esPlazoTaxativo, setEsPlazoTaxativo] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Abogados from API
  const [abogados, setAbogados] = useState<{ id: string; nombre: string; identificacion: string; status: string }[]>([]);
  const [loadingAbogados, setLoadingAbogados] = useState(false);

  // Fetch abogados from backend on mount
  useEffect(() => {
    const fetchAbogados = async () => {
      setLoadingAbogados(true);
      try {
        const data = await legalService.getAbogadosDashboard();
        // Map API response to expected format
        const mapped = data.map((a: any) => ({
          id: a.id,
          nombre: a.nombreCompleto || a.nombre || 'Sin nombre',
          identificacion: a.email || '',
          status: a.estado || 'ACTIVO'
        }));
        setAbogados(mapped);
      } catch (error) {
        console.error('Error fetching abogados:', error);
        toast.error('No se pudieron cargar los abogados');
      } finally {
        setLoadingAbogados(false);
      }
    };
    fetchAbogados();
  }, []);

  // Calcular plazo automáticamente cuando cambia jurisdicción o medio control
  const [files, setFiles] = useState<FileList | null>(null);

  useEffect(() => {
    if (formData.jurisdiccion && formData.medioControl) {
      const medios = MEDIOS_CONTROL_POR_JURISDICCION[formData.jurisdiccion];
      const medioSeleccionado = medios.find(m => m.id === formData.medioControl);

      if (medioSeleccionado) {
        if (medioSeleccionado.plazoTaxativo !== null) {
          setPlazoCalculado(medioSeleccionado.plazoTaxativo);
          setFundamento(medioSeleccionado.fundamento);
          setEsPlazoTaxativo(true);
          setFormData(prev => ({ ...prev, plazoEspecial: '', justificacionPlazo: '' }));
        } else {
          setPlazoCalculado(null);
          setFundamento(medioSeleccionado.fundamento);
          setEsPlazoTaxativo(false);
        }
      }
    }
  }, [formData.jurisdiccion, formData.medioControl]);

  const handleInputChange = (field: keyof ExpedienteForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Limpiar error del campo al escribir
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validarFormulario = (): boolean => {
    const newErrors: Record<string, string> = {};

    // RN-001: Radicado 23 dígitos
    if (!formData.radicado) {
      newErrors.radicado = 'El código de radicación es obligatorio';
    } else if (!/^\d{23}$/.test(formData.radicado)) {
      newErrors.radicado = 'Debe tener exactamente 23 dígitos numéricos';
    }

    // RN-001: Jurisdicción requerida
    if (!formData.jurisdiccion) {
      newErrors.jurisdiccion = 'Jurisdicción es obligatoria';
    }

    // RN-001: Medio control requerido
    if (!formData.medioControl) {
      newErrors.medioControl = 'Medio de control es obligatorio';
    }

    // RN-002: Demandante requerido
    if (!formData.demandante.trim()) {
      newErrors.demandante = 'Demandante es obligatorio';
    } else if (formData.demandante.length > 255) {
      newErrors.demandante = 'Máximo 255 caracteres';
    }

    // Identificación demandante
    if (!formData.tipoIdDemandante) {
      newErrors.tipoIdDemandante = 'Tipo de identificación requerido';
    }
    if (!formData.numeroIdDemandante.trim()) {
      newErrors.numeroIdDemandante = 'Número de identificación requerido';
    }

    // RN-002: Demandado DEBE incluir ESAP
    if (!formData.demandado.trim()) {
      newErrors.demandado = 'Demandado es obligatorio';
    } else if (!formData.demandado.toUpperCase().includes('ESAP')) {
      newErrors.demandado = 'El demandado debe incluir "ESAP"';
    } else if (formData.demandado.length > 255) {
      newErrors.demandado = 'Máximo 255 caracteres';
    }

    // Identificación demandado
    if (!formData.tipoIdDemandado) {
      newErrors.tipoIdDemandado = 'Tipo de identificación requerido';
    }
    if (!formData.numeroIdDemandado.trim()) {
      newErrors.numeroIdDemandado = 'Número de identificación requerido';
    }

    // Juzgado requerido
    if (!formData.juzgado.trim()) {
      newErrors.juzgado = 'Juzgado/Tribunal es obligatorio';
    } else if (formData.juzgado.length > 255) {
      newErrors.juzgado = 'Máximo 255 caracteres';
    }

    // Pretensión requerida
    if (!formData.pretensionDemandante.trim()) {
      newErrors.pretensionDemandante = 'Pretensión del demandante es obligatoria';
    } else if (formData.pretensionDemandante.length > 1000) {
      newErrors.pretensionDemandante = 'Máximo 1000 caracteres';
    }

    // RN-003: Fecha notificación
    if (!formData.fechaNotificacion) {
      newErrors.fechaNotificacion = 'Fecha de notificación es obligatoria';
    } else {
      const fechaNotif = new Date(formData.fechaNotificacion);
      const hoy = new Date();
      const dosAnosAtras = new Date();
      dosAnosAtras.setFullYear(dosAnosAtras.getFullYear() - 2);

      if (fechaNotif > hoy) {
        newErrors.fechaNotificacion = 'La fecha no puede ser futura';
      } else if (fechaNotif < dosAnosAtras) {
        newErrors.fechaNotificacion = 'La fecha no puede ser mayor a 2 años atrás';
      }
    }

    // Fecha demanda presentada
    if (!formData.fechaDemandaPresentada) {
      newErrors.fechaDemandaPresentada = 'Fecha de presentación de demanda es obligatoria';
    }

    // RN-005: Abogado DEBE ser activo
    if (!formData.abogadoId) {
      newErrors.abogadoId = 'Abogado litigante es obligatorio';
    }

    // RN-009: Plazo especial si no es taxativo
    if (!esPlazoTaxativo) {
      if (!formData.plazoEspecial || parseInt(formData.plazoEspecial) <= 0) {
        newErrors.plazoEspecial = 'Plazo especial debe ser mayor a 0';
      }
      if (!formData.justificacionPlazo.trim()) {
        newErrors.justificacionPlazo = 'Justificación es obligatoria para plazo especial';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validarFormulario()) {
      toast.error('Por favor corrija los errores en el formulario');
      return;
    }

    setIsSubmitting(true);

    try {
      const formDataToSend = new FormData();

      // Append fields
      formDataToSend.append('radicado', formData.radicado);
      formDataToSend.append('jurisdiccion', formData.jurisdiccion);
      formDataToSend.append('medioControl', formData.medioControl);
      formDataToSend.append('tipoProceso', formData.medioControl); // Required by DB NOT NULL constraint
      formDataToSend.append('demandante', formData.demandante);
      formDataToSend.append('tipoIdDemandante', formData.tipoIdDemandante);
      formDataToSend.append('numeroIdDemandante', formData.numeroIdDemandante);
      formDataToSend.append('demandado', formData.demandado);
      formDataToSend.append('tipoIdDemandado', formData.tipoIdDemandado);
      formDataToSend.append('numeroIdDemandado', formData.numeroIdDemandado);
      formDataToSend.append('juzgadoConocimiento', formData.juzgado);
      formDataToSend.append('pretensionDemandante', formData.pretensionDemandante);
      formDataToSend.append('actoAdministrativoDemandado', formData.actoAdministrativo);
      formDataToSend.append('fechaNotificacion', new Date(formData.fechaNotificacion).toISOString());
      formDataToSend.append('fechaDemandaPresentada', new Date(formData.fechaDemandaPresentada).toISOString());
      if (formData.valorDemanda) formDataToSend.append('cuantia', formData.valorDemanda);

      // RN-009: Plazo (Taxativo o Especial)
      const diasTermino = plazoCalculado ? plazoCalculado : (formData.plazoEspecial ? formData.plazoEspecial : '30');
      formDataToSend.append('terminoProcesalDias', String(diasTermino));
      formDataToSend.append('tipoConteoTermino', formData.tipoConteoTermino || 'HABILES');

      // Enviar datos del usuario actual para asignación automática (Backend Logic)
      formDataToSend.append('userId', CURRENT_USER_MOCK.id);
      formDataToSend.append('userRole', CURRENT_USER_MOCK.role);

      // Si se seleccionó un abogado manualmente (Caso Jefe Oficina)
      if (formData.abogadoId) {
        formDataToSend.append('abogadoId', formData.abogadoId);
      }

      formDataToSend.append('estado', 'ACTIVO');
      formDataToSend.append('etapaProcesal', 'RADICACION');
      formDataToSend.append('fechaRadicacion', new Date().toISOString()); // Required by DB NOT NULL constraint

      // Append files
      if (files) {
        Array.from(files).forEach((file) => {
          formDataToSend.append('files', file);
        });
      }


      const baseUrl = getServiceUrl('legal');
      const response = await fetch(`${baseUrl}/legal/expedientes`, {
        method: 'POST',
        // No Content-Type header needed for FormData, browser sets it with boundary
        body: formDataToSend,
      });

      if (!response.ok) {
        throw new Error('Error en la petición al servidor');
      }

      const data = await response.json();

      toast.success(
        `✓ Expediente creado exitosamente`,
        {
          description: `Radicado: ${data.radicado}`,
          duration: 5000,
        }
      );

      if (onExpedienteCreado) {
        onExpedienteCreado(data);
      }

      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Error al crear expediente', {
        description: 'No se pudo conectar con el servidor',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const mediosDisponibles = formData.jurisdiccion ? MEDIOS_CONTROL_POR_JURISDICCION[formData.jurisdiccion] : [];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Scale className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Crear Expediente Judicial</h2>
              <p className="text-sm text-gray-600">REQ-MOD01-001: 4 Jurisdicciones con plazos taxativos</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* SECCIÓN 1: CLASIFICACIÓN */}
          <div className="space-y-4">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Scale className="w-5 h-5 text-blue-600" />
              1. Clasificación Jurisdiccional
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Código Único de Radicación (23 dígitos) <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                maxLength={23}
                value={formData.radicado}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, ''); // Solo números
                  handleInputChange('radicado', val);
                }}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-lg tracking-wide ${errors.radicado ? 'border-red-500' : 'border-gray-300'
                  }`}
                placeholder="Ej: 11001333500220250012500"
              />
              {errors.radicado && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.radicado}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Formato oficial Rama Judicial (23 dígitos)
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Jurisdicción */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Jurisdicción <span className="text-red-600">*</span>
                </label>
                <select
                  value={formData.jurisdiccion}
                  onChange={(e) => handleInputChange('jurisdiccion', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.jurisdiccion ? 'border-red-500' : 'border-gray-300'
                    }`}
                >
                  <option value="">Seleccione jurisdicción...</option>
                  <option value="CONTENCIOSO">Contencioso Administrativo</option>
                  <option value="ORDINARIA">Ordinaria</option>
                  <option value="LABORAL">Laboral</option>
                  <option value="CONSTITUCIONAL">Constitucional</option>
                </select>
                {errors.jurisdiccion && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.jurisdiccion}
                  </p>
                )}
              </div>

              {/* Medio de Control */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Medio de Control <span className="text-red-600">*</span>
                </label>
                <select
                  value={formData.medioControl}
                  onChange={(e) => handleInputChange('medioControl', e.target.value)}
                  disabled={!formData.jurisdiccion}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.medioControl ? 'border-red-500' : 'border-gray-300'
                    } ${!formData.jurisdiccion ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                >
                  <option value="">Seleccione medio de control...</option>
                  {mediosDisponibles.map((medio) => (
                    <option key={medio.id} value={medio.id}>
                      {medio.nombre}
                      {medio.plazoTaxativo && ` (${medio.plazoTaxativo} días hábiles)`}
                    </option>
                  ))}
                </select>
                {errors.medioControl && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.medioControl}
                  </p>
                )}
              </div>
            </div>

            {/* Banner de Plazo Taxativo */}
            {esPlazoTaxativo && plazoCalculado && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-blue-900">Plazo Taxativo de Ley: {plazoCalculado} días hábiles</p>
                  <p className="text-sm text-blue-700 mt-1">Fundamento legal: {fundamento}</p>
                  <p className="text-xs text-blue-600 mt-1">Este plazo NO es editable (establecido por ley)</p>
                </div>
              </div>
            )}

            {/* Plazo Especial (solo si no es taxativo) */}
            {!esPlazoTaxativo && formData.medioControl && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-yellow-900">Plazo Especial Requerido</p>
                    <p className="text-sm text-yellow-700 mt-1">
                      Este medio de control no tiene plazo taxativo. Debe especificar el plazo y justificarlo.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Plazo Especial (días hábiles) <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.plazoEspecial}
                      onChange={(e) => handleInputChange('plazoEspecial', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.plazoEspecial ? 'border-red-500' : 'border-gray-300'
                        }`}
                      placeholder="Ej: 60"
                    />
                    {errors.plazoEspecial && (
                      <p className="text-xs text-red-600 mt-1">{errors.plazoEspecial}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Justificación <span className="text-red-600">*</span>
                    </label>
                    <textarea
                      value={formData.justificacionPlazo}
                      onChange={(e) => handleInputChange('justificacionPlazo', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.justificacionPlazo ? 'border-red-500' : 'border-gray-300'
                        }`}
                      rows={2}
                      placeholder="Justifique el plazo especial..."
                    />
                    {errors.justificacionPlazo && (
                      <p className="text-xs text-red-600 mt-1">{errors.justificacionPlazo}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Configuración de Tipo de Conteo */}
            {formData.medioControl && (
              <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-gray-500 mt-0.5" />
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Tipo de Conteo de Plazo
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      Define cómo se calculará la fecha de vencimiento y los días restantes.
                    </p>
                    <select
                      value={formData.tipoConteoTermino || 'HABILES'}
                      onChange={(e) => handleInputChange('tipoConteoTermino', e.target.value as any)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    >
                      <option value="HABILES">Días Hábiles (Lunes a Viernes)</option>
                      <option value="CALENDARIO">Días Calendario (Todos los días)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECCIÓN 2: PARTES DEL PROCESO */}
          <div className="space-y-4 border-t pt-6">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              2. Partes del Proceso
            </h3>

            {/* Demandante */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <p className="font-semibold text-gray-700">👤 Demandante</p>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nombre Completo <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={255}
                    value={formData.demandante}
                    onChange={(e) => handleInputChange('demandante', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.demandante ? 'border-red-500' : 'border-gray-300'
                      }`}
                    placeholder="Ej: Juan Pérez Gómez"
                  />
                  {errors.demandante && (
                    <p className="text-xs text-red-600 mt-1">{errors.demandante}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Tipo ID <span className="text-red-600">*</span>
                    </label>
                    <select
                      value={formData.tipoIdDemandante}
                      onChange={(e) => handleInputChange('tipoIdDemandante', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.tipoIdDemandante ? 'border-red-500' : 'border-gray-300'
                        }`}
                    >
                      <option value="">Seleccione...</option>
                      <option value="CC">Cédula de Ciudadanía (CC)</option>
                      <option value="CE">Cédula de Extranjería (CE)</option>
                      <option value="NIT">NIT</option>
                      <option value="PA">Pasaporte (PA)</option>
                    </select>
                    {errors.tipoIdDemandante && (
                      <p className="text-xs text-red-600 mt-1">{errors.tipoIdDemandante}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Número ID <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.numeroIdDemandante}
                      onChange={(e) => handleInputChange('numeroIdDemandante', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.numeroIdDemandante ? 'border-red-500' : 'border-gray-300'
                        }`}
                      placeholder="Ej: 80123456"
                    />
                    {errors.numeroIdDemandante && (
                      <p className="text-xs text-red-600 mt-1">{errors.numeroIdDemandante}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Demandado */}
            <div className="bg-blue-50 rounded-lg p-4 space-y-3 border border-blue-200">
              <p className="font-semibold text-blue-900">⚖️ Demandado (debe incluir "ESAP")</p>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nombre Completo <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={255}
                    value={formData.demandado}
                    onChange={(e) => handleInputChange('demandado', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.demandado ? 'border-red-500' : 'border-gray-300'
                      }`}
                    placeholder="Ej: ESAP - Rectoría Nacional"
                  />
                  {errors.demandado && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.demandado}
                    </p>
                  )}
                  <p className="text-xs text-blue-600 mt-1">
                    <Info className="w-3 h-3 inline mr-1" />
                    RN-002: El demandado debe contener la palabra "ESAP"
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Tipo ID <span className="text-red-600">*</span>
                    </label>
                    <select
                      value={formData.tipoIdDemandado}
                      onChange={(e) => handleInputChange('tipoIdDemandado', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.tipoIdDemandado ? 'border-red-500' : 'border-gray-300'
                        }`}
                    >
                      <option value="">Seleccione...</option>
                      <option value="NIT">NIT</option>
                      <option value="CC">Cédula de Ciudadanía (CC)</option>
                      <option value="CE">Cédula de Extranjería (CE)</option>
                      <option value="PA">Pasaporte (PA)</option>
                    </select>
                    {errors.tipoIdDemandado && (
                      <p className="text-xs text-red-600 mt-1">{errors.tipoIdDemandado}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Número ID <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.numeroIdDemandado}
                      onChange={(e) => handleInputChange('numeroIdDemandado', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.numeroIdDemandado ? 'border-red-500' : 'border-gray-300'
                        }`}
                      placeholder="Ej: 899999027-1"
                    />
                    {errors.numeroIdDemandado && (
                      <p className="text-xs text-red-600 mt-1">{errors.numeroIdDemandado}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Juzgado */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Building className="w-4 h-4" />
                Juzgado/Tribunal <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                maxLength={255}
                value={formData.juzgado}
                onChange={(e) => handleInputChange('juzgado', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.juzgado ? 'border-red-500' : 'border-gray-300'
                  }`}
                placeholder="Ej: Juzgado 3º Administrativo de Bogotá"
              />
              {errors.juzgado && (
                <p className="text-xs text-red-600 mt-1">{errors.juzgado}</p>
              )}
            </div>
          </div>

          {/* SECCIÓN 3: INFORMACIÓN DE LA DEMANDA */}
          <div className="space-y-4 border-t pt-6">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              3. Información de la Demanda
            </h3>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Pretensión del Demandante <span className="text-red-600">*</span>
              </label>
              <textarea
                maxLength={1000}
                value={formData.pretensionDemandante}
                onChange={(e) => handleInputChange('pretensionDemandante', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.pretensionDemandante ? 'border-red-500' : 'border-gray-300'
                  }`}
                rows={3}
                placeholder="Describa la pretensión principal del demandante..."
              />
              <div className="flex justify-between items-center mt-1">
                {errors.pretensionDemandante && (
                  <p className="text-xs text-red-600">{errors.pretensionDemandante}</p>
                )}
                <p className="text-xs text-gray-500 ml-auto">{formData.pretensionDemandante.length}/1000</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Acto Administrativo Cuestionado (opcional)
              </label>
              <textarea
                maxLength={500}
                value={formData.actoAdministrativo}
                onChange={(e) => handleInputChange('actoAdministrativo', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={2}
                placeholder="Ej: Resolución 123 de 2024..."
              />
              <p className="text-xs text-gray-500 mt-1">{formData.actoAdministrativo.length}/500</p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Fecha Notificación <span className="text-red-600">*</span>
                </label>
                <input
                  type="date"
                  value={formData.fechaNotificacion}
                  onChange={(e) => handleInputChange('fechaNotificacion', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.fechaNotificacion ? 'border-red-500' : 'border-gray-300'
                    }`}
                />
                {errors.fechaNotificacion && (
                  <p className="text-xs text-red-600 mt-1">{errors.fechaNotificacion}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Fecha Demanda Presentada <span className="text-red-600">*</span>
                </label>
                <input
                  type="date"
                  value={formData.fechaDemandaPresentada}
                  onChange={(e) => handleInputChange('fechaDemandaPresentada', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.fechaDemandaPresentada ? 'border-red-500' : 'border-gray-300'
                    }`}
                />
                {errors.fechaDemandaPresentada && (
                  <p className="text-xs text-red-600 mt-1">{errors.fechaDemandaPresentada}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Valor Demanda COP (opcional)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formData.valorDemanda ? Number(formData.valorDemanda).toLocaleString('es-CO') : ''}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '');
                      handleInputChange('valorDemanda', raw);
                    }}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Formato: Pesos Colombianos (COP)</p>
              </div>
            </div>
          </div>

          {/* SECCIÓN 4: ASIGNACIÓN */}
          <div className="space-y-4 border-t pt-6">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              4. Asignación de Abogado
            </h3>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Abogado Litigante <span className="text-red-600">*</span>
              </label>
              <select
                value={formData.abogadoId}
                onChange={(e) => handleInputChange('abogadoId', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.abogadoId ? 'border-red-500' : 'border-gray-300'
                  }`}
              >
                <option value="">
                  {loadingAbogados ? 'Cargando abogados...' : 'Seleccione abogado...'}
                </option>
                {abogados.filter(a => a.status === 'ACTIVO').map((abogado) => (
                  <option key={abogado.id} value={abogado.id}>
                    {abogado.nombre} - {abogado.identificacion}
                  </option>
                ))}
              </select>
              {errors.abogadoId && (
                <p className="text-xs text-red-600 mt-1">{errors.abogadoId}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                RN-007: Un expediente tiene exactamente 1 abogado litigante
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Info className="w-4 h-4" />
            <span>Los campos marcados con <span className="text-red-600">*</span> son obligatorios</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSubmitting ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Guardar Expediente
                </>
              )}
            </Button>
          </div>
        </div>
      </div >
    </div >
  );
}
