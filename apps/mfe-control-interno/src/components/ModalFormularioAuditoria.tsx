/**
 * ============================================
 * FORMULARIO DE AUDITORÍA CON VALIDACIÓN ROBUSTA
 * ============================================
 * 
 * Formulario completo para crear/editar auditorías
 * con validación en tiempo real y feedback visual.
 * 
 * FUNCIONALIDADES:
 * 1. Validación en tiempo real
 * 2. Feedback visual inmediato
 * 3. Mensajes de error descriptivos
 * 4. Prevención de envío con errores
 * 5. Autoguardado de borrador
 * 6. Confirmación al salir con cambios
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Save, AlertCircle, CheckCircle, Plus, Trash2,
  User, Calendar, Target, FileText, Shield, Info, MapPin, Zap, Clock,
  Layers, Search, ChevronDown, ChevronUp
} from 'lucide-react';
import { Button } from '@esap-mfe/shared-ui/button';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { Input } from '@esap-mfe/shared-ui/input';
import { toast } from 'sonner';
import {
  validateAuditoriaForm,
  getFieldError,
  hasFieldError,
  type AuditoriaFormData,
  type ValidationError
} from '../../../utils/validation';
import { controlInternoService, type EvaluacionProceso } from '../../../services/api/controlInternoService';

// ============ TIPOS ============

interface Persona {
  id: string;
  nombre: string;
  cargo: string;
  tipoIdentificacion: 'CC' | 'CE' | 'TI' | 'PA';
  numeroIdentificacion: string;
}

interface ModalFormularioAuditoriaProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: AuditoriaFormData) => void;
  initialData?: Partial<AuditoriaFormData>;
  mode: 'create' | 'edit';
}

// ============ DATOS MOCK ============

const TERRITORIALES = [
  'Nacional',
  'Antioquia',
  'Atlántico',
  'Bogotá',
  'Bolívar',
  'Boyacá',
  'Caldas',
  'Caquetá',
  'Cauca',
  'Cesar',
  'Chocó',
  'Córdoba',
  'Cundinamarca',
  'Huila',
  'La Guajira',
  'Magdalena',
  'Meta',
  'Nariño',
  'Norte de Santander',
  'Quindío',
  'Risaralda',
  'Santander',
  'Sucre',
  'Tolima',
  'Valle del Cauca'
];

const AUDITORES_MOCK: Persona[] = [
  {
    id: '1',
    nombre: 'Juan Pérez Gómez',
    cargo: 'Auditor Senior',
    tipoIdentificacion: 'CC',
    numeroIdentificacion: '80123456'
  },
  {
    id: '2',
    nombre: 'Ana María López Silva',
    cargo: 'Auditor Junior',
    tipoIdentificacion: 'CC',
    numeroIdentificacion: '52987654'
  },
  {
    id: '3',
    nombre: 'Carlos Ramírez Díaz',
    cargo: 'Auditor Senior',
    tipoIdentificacion: 'CC',
    numeroIdentificacion: '94123456'
  },
  {
    id: '4',
    nombre: 'Diana López Vargas',
    cargo: 'Auditor Senior',
    tipoIdentificacion: 'CC',
    numeroIdentificacion: '72123456'
  },
  {
    id: '5',
    nombre: 'Roberto Torres Sánchez',
    cargo: 'Auditor Líder',
    tipoIdentificacion: 'CC',
    numeroIdentificacion: '79456789'
  }
];

// ============ COMPONENTE DE CAMPO CON ERROR ============

interface FieldWrapperProps {
  label: string;
  error?: string | null;
  required?: boolean;
  children: React.ReactNode;
  helpText?: React.ReactNode;
}

function FieldWrapper({ label, error, required, children, helpText }: FieldWrapperProps) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-bold text-gray-700 flex items-center gap-1">
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="flex items-center gap-1 text-red-600 text-xs"
          >
            <AlertCircle className="w-3 h-3 flex-shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>
      {!error && helpText && (
        <div className="text-xs text-gray-500 flex items-start gap-1 mt-1">
          <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <div className="flex-1">{helpText}</div>
        </div>
      )}
    </div>
  );
}

// ============ COMPONENTE PRINCIPAL ============

export function ModalFormularioAuditoria({
  open,
  onClose,
  onSubmit,
  initialData,
  mode
}: ModalFormularioAuditoriaProps) {
  // Función auxiliar para normalizar ID de auditor
  const normalizarAuditorId = (value: any): string => {
    if (!value) return '';
    // Si viene como número, convertir a string
    if (typeof value === 'number') {
      return value.toString();
    }
    // Si viene como string numérico, devolver tal cual
    if (typeof value === 'string' && !isNaN(Number(value))) {
      return value;
    }
    return '';
  };

  // Función auxiliar para normalizar tipo de auditoría
  const normalizarTipo = (tipo: any): string => {
    if (!tipo) return '';
    return String(tipo);
  };

  // Estado del formulario
  const [formData, setFormData] = useState<AuditoriaFormData>({
    tipo: normalizarTipo(initialData?.tipo),
    titulo: initialData?.titulo || '',
    descripcion: initialData?.descripcion || '',
    territorial: initialData?.territorial || '',
    auditorLider: normalizarAuditorId(initialData?.auditorLider),
    auditorAsignado: normalizarAuditorId(initialData?.auditorAsignado),
    fechaInicio: initialData?.fechaInicio || '',
    fechaFinPlaneacion: (initialData as any)?.fechaFinPlaneacion || '',
    fechaFinEjecucion: (initialData as any)?.fechaFinEjecucion || '',
    fechaFin: initialData?.fechaFin || '',
    objetivos: initialData?.objetivos || [],
    alcance: initialData?.alcance || '',
    riesgo: initialData?.riesgo || 'Medio',
    procesoAuditadoId: (initialData as any)?.procesoAuditadoId || '',
    procesoAuditadoNombre: (initialData as any)?.procesoAuditadoNombre || ''
  } as AuditoriaFormData);

  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [objetivoTemporal, setObjetivoTemporal] = useState('');
  const [auditoresDisponibles, setAuditoresDisponibles] = useState<Persona[]>([]);
  const [cargandoAuditores, setCargandoAuditores] = useState(false);

  // Tipos de auditoría desde configuración
  const [tiposAuditoria, setTiposAuditoria] = useState<{ id: string; nombre: string; color?: string; descripcion?: string }[]>([]);
  const [cargandoTipos, setCargandoTipos] = useState(false);

  // Evaluaciones y procesos del universo auditable
  const [evaluacionesDisponibles, setEvaluacionesDisponibles] = useState<EvaluacionProceso[]>([]);
  const [cargandoEvaluaciones, setCargandoEvaluaciones] = useState(false);
  const [busquedaProceso, setBusquedaProceso] = useState('');
  const [selectorProcesoAbierto, setSelectorProcesoAbierto] = useState(false);

  // Cargar tipos de auditoría desde configuración
  useEffect(() => {
    const cargarTipos = async () => {
      setCargandoTipos(true);
      try {
        const { auditoriasApi } = await import('./services/api');
        const response = await auditoriasApi.getTiposAuditoria(true);
        if (response.success && Array.isArray(response.data) && response.data.length > 0) {
          const activos = response.data.filter((t: any) => t.activo !== false && t.activa !== false);
          setTiposAuditoria(activos.map((t: any) => ({
            id: t.id,
            nombre: t.nombre,
            color: t.color,
            descripcion: t.descripcion
          })));
        }
      } catch (error) {
        console.error('[ModalFormularioAuditoria] Error cargando tipos:', error);
      } finally {
        setCargandoTipos(false);
      }
    };
    if (open) cargarTipos();
  }, [open]);

  // Cargar evaluaciones del universo auditable desde la API
  useEffect(() => {
    const cargarEvaluaciones = async () => {
      setCargandoEvaluaciones(true);
      try {
        const data = await controlInternoService.getEvaluaciones();
        // Filtrar solo las que tienen proceso asociado y están activas
        const conProceso = (data || []).filter(
          (ev: EvaluacionProceso) => ev.proceso && ev.activo !== false
        );
        setEvaluacionesDisponibles(conProceso);
      } catch (error) {
        console.error('[ModalFormularioAuditoria] Error cargando evaluaciones:', error);
        setEvaluacionesDisponibles([]);
      } finally {
        setCargandoEvaluaciones(false);
      }
    };

    if (open) {
      cargarEvaluaciones();
    }
  }, [open]);

  // Cargar auditores disponibles desde la API
  useEffect(() => {
    const cargarAuditores = async () => {
      console.log('[ModalFormularioAuditoria] Iniciando carga de auditores...');
      setCargandoAuditores(true);
      try {
        const { auditoriasApi } = await import('./services/api');
        const response = await auditoriasApi.getPersonasDisponibles();
        console.log('[ModalFormularioAuditoria] Response status:', response.success);
        
        if (response.success && response.data) {
          const personas = response.data;
          console.log('[ModalFormularioAuditoria] Personas recibidas:', personas.length, personas);
          console.log('[ModalFormularioAuditoria] Primera persona:', personas[0]);
          
          // Convertir personas a formato de auditores
          // El backend ya transformó y devuelve id, idPersona en lugar de id_tercero
          const auditores = personas
            .filter((persona: any) => {
              const personaId = persona.idPersona || persona.id_tercero || persona.id;
              if (!personaId) {
                console.warn('[ModalFormularioAuditoria] Persona sin ID:', persona);
                return false;
              }
              return true;
            })
            .map((persona: any) => {
              const personaId = persona.idPersona || persona.id_tercero || persona.id;
              return {
                id: String(personaId),
                nombre: persona.nombre || persona.nom_largo || 'Sin nombre',
                cargo: 'Auditor',
                tipoIdentificacion: persona.tipoIdentificacion || persona.tip_identificacion || 'CC',
                numeroIdentificacion: persona.numeroIdentificacion || persona.num_identificacion || 'Sin identificación'
              };
            });
          
          console.log('[ModalFormularioAuditoria] Auditores mapeados:', auditores.length, auditores);
          setAuditoresDisponibles(auditores);
          console.log('[ModalFormularioAuditoria] Estado auditoresDisponibles actualizado');
          
          // Después de cargar auditores, verificar si initialData tiene numeroIdentificacion
          if (initialData) {
            const auditorLiderValue = initialData.auditorLider;
            const auditorAsignadoValue = initialData.auditorAsignado;
            
            // Si auditorLider no existe como ID en la lista, buscar por numeroIdentificacion
            if (auditorLiderValue) {
              const existeComoId = auditores.some(a => a.id === auditorLiderValue);
              
              if (!existeComoId) {
                const auditorEncontrado = auditores.find(a => a.numeroIdentificacion === auditorLiderValue);
                if (auditorEncontrado) {
                  console.log('[ModalFormularioAuditoria] Auditor Líder encontrado por numeroIdentificacion:', auditorEncontrado.id, auditorEncontrado.nombre);
                  setFormData(prev => ({ ...prev, auditorLider: auditorEncontrado.id }));
                } else {
                  console.warn('[ModalFormularioAuditoria] No se encontró auditor líder con numeroIdentificacion:', auditorLiderValue);
                }
              }
            }
            
            // Si auditorAsignado no existe como ID en la lista, buscar por numeroIdentificacion
            if (auditorAsignadoValue) {
              const existeComoId = auditores.some(a => a.id === auditorAsignadoValue);
              
              if (!existeComoId) {
                const auditorEncontrado = auditores.find(a => a.numeroIdentificacion === auditorAsignadoValue);
                if (auditorEncontrado) {
                  console.log('[ModalFormularioAuditoria] Auditor Asignado encontrado por numeroIdentificacion:', auditorEncontrado.id, auditorEncontrado.nombre);
                  setFormData(prev => ({ ...prev, auditorAsignado: auditorEncontrado.id }));
                } else {
                  console.warn('[ModalFormularioAuditoria] No se encontró auditor asignado con numeroIdentificacion:', auditorAsignadoValue);
                }
              }
            }
          }
        } else {
          console.warn('[ModalFormularioAuditoria] Error al cargar auditores:', response.error);
          toast.error('Error al cargar auditores disponibles', {
            description: response.error || 'No se pudieron cargar los auditores'
          });
          setAuditoresDisponibles([]);
        }
      } catch (error) {
        console.error('[ModalFormularioAuditoria] Error al cargar auditores:', error);
        setAuditoresDisponibles([]);
      } finally {
        setCargandoAuditores(false);
        console.log('[ModalFormularioAuditoria] Carga finalizada. Total auditores:', auditoresDisponibles.length);
      }
    };

    if (open) {
      cargarAuditores();
    }
  }, [open, initialData]);

  // Actualizar formulario cuando cambian los datos iniciales
  useEffect(() => {
    if (open && initialData) {
      // Normalizar objetivos: convertir objetos a strings si es necesario
      const normalizedObjetivos = initialData.objetivos
        ? initialData.objetivos.map((obj: any) => 
            typeof obj === 'string' ? obj : obj.descripcion || ''
          )
        : [];
      
      const newFormData = {
        codigo: initialData.codigo || '',
        tipo: initialData.tipo || '',
        titulo: initialData.titulo || '',
        descripcion: initialData.descripcion || '',
        territorial: initialData.territorial || '',
        auditorLider: normalizarAuditorId(initialData.auditorLider),
        auditorAsignado: normalizarAuditorId(initialData.auditorAsignado),
        fechaInicio: initialData.fechaInicio || '',
        fechaFin: initialData.fechaFin || '',
        objetivos: normalizedObjetivos,
        alcance: initialData.alcance || '',
        riesgo: initialData.riesgo || 'Medio',
        procesoAuditadoId: (initialData as any)?.procesoAuditadoId || '',
        procesoAuditadoNombre: (initialData as any)?.procesoAuditadoNombre || ''
      };
      
      console.log('[ModalFormularioAuditoria] Actualizando formData con initialData:', {
        tipoForm: newFormData.tipo,
        initialDataTipo: initialData.tipo
      });
      
      console.log('[ModalFormularioAuditoria] Actualizando formData con initialData:', {
        auditorLider: newFormData.auditorLider,
        auditorAsignado: newFormData.auditorAsignado,
        initialData_auditorLider: initialData.auditorLider,
        initialData_auditorAsignado: initialData.auditorAsignado
      });
      
      setFormData(newFormData);
      setTouched({});
      setErrors([]);
      setHasChanges(false);
    }
  }, [open, initialData]);

  // Detectar cambios
  useEffect(() => {
    const hasAnyChanges = Object.keys(formData).some(key => {
      const fieldKey = key as keyof AuditoriaFormData;
      return formData[fieldKey] !== (initialData?.[fieldKey] || '');
    });
    setHasChanges(hasAnyChanges);
  }, [formData, initialData]);

  // Validar formulario en tiempo real
  useEffect(() => {
    if (Object.keys(touched).length > 0) {
      const result = validateAuditoriaForm(formData);
      setErrors(result.errors);
    }
  }, [formData, touched]);

  // Handlers
  const handleChange = (field: keyof AuditoriaFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleBlur = (field: keyof AuditoriaFormData) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleAgregarObjetivo = () => {
    if (objetivoTemporal.trim().length < 10) {
      toast.error('El objetivo debe tener al menos 10 caracteres');
      return;
    }

    setFormData(prev => ({
      ...prev,
      objetivos: [...prev.objetivos, objetivoTemporal.trim()]
    }));
    setObjetivoTemporal('');
    setTouched(prev => ({ ...prev, objetivos: true }));
  };

  const handleEliminarObjetivo = (index: number) => {
    setFormData(prev => ({
      ...prev,
      objetivos: prev.objetivos.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Marcar todos los campos como tocados
    const allFields = Object.keys(formData).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {} as Record<string, boolean>);
    setTouched(allFields);

    // Validar
    const result = validateAuditoriaForm(formData);
    setErrors(result.errors);

    if (!result.isValid) {
      toast.error('Por favor corrige los errores antes de continuar');
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit(formData);
      toast.success(
        mode === 'create'
          ? '✅ Auditoría creada exitosamente'
          : '✅ Auditoría actualizada exitosamente'
      );
      // Cerrar directamente sin mostrar modal de confirmación
      setHasChanges(false);
      onClose();
    } catch (error) {
      toast.error('Error al guardar la auditoría');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  // ⚠️ NO RETORNAR NULL - AnimatePresence maneja el montaje/desmontaje
  // if (!open) return null;

  // Calcular progreso de completado
  const camposRequeridos = [
    'titulo',
    'descripcion',
    'territorial',
    'auditorLider',
    'auditorAsignado',
    'fechaInicio',
    'fechaFin',
    'objetivos',
    'alcance',
    'riesgo'
  ];
  const camposCompletados = camposRequeridos.filter(campo => {
    const value = formData[campo as keyof AuditoriaFormData];
    if (Array.isArray(value)) return value.length > 0;
    return value && value !== '';
  }).length;
  const progresoCompletado = Math.round((camposCompletados / camposRequeridos.length) * 100);

  console.log('[ModalFormularioAuditoria] RENDER - auditoresDisponibles:', auditoresDisponibles.length, 'open:', open, 'cargando:', cargandoAuditores);
  console.log('[ModalFormularioAuditoria] RENDER - formData.auditorLider:', formData.auditorLider, 'formData.auditorAsignado:', formData.auditorAsignado);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* OVERLAY */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[110]"
            onClick={handleClose}
          />

          {/* MODAL CONTENT */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[111] flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-lg shadow-2xl w-full h-full max-h-[90vh] flex flex-col max-w-4xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* HEADER */}
              <div className="flex items-start justify-between p-6 border-b border-gray-200">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <FileText className="w-6 h-6" style={{ color: '#003DA5' }} />
                    <h2 className="text-2xl font-black" style={{ color: '#003DA5' }}>
                      {mode === 'create' ? 'Nueva Auditoría' : 'Editar Auditoría'}
                    </h2>
                  </div>
                  <p className="text-sm text-gray-600">
                    {mode === 'create'
                      ? 'Complete todos los campos obligatorios para crear la auditoría'
                      : 'Modifique los campos necesarios y guarde los cambios'}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClose}
                  className="ml-4"
                  aria-label="Cerrar modal"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* BARRA DE PROGRESO */}
              <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-gray-700">
                    Progreso de completado
                  </span>
                  <Badge
                    className={
                      progresoCompletado === 100
                        ? 'bg-green-100 text-green-700 border-green-200'
                        : 'bg-yellow-100 text-yellow-700 border-yellow-200'
                    }
                    variant="outline"
                  >
                    {progresoCompletado}%
                  </Badge>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <motion.div
                    className="h-2 rounded-full"
                    style={{
                      backgroundColor: progresoCompletado === 100 ? '#22c55e' : '#eab308'
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${progresoCompletado}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {camposCompletados} de {camposRequeridos.length} campos completados
                </p>
              </div>

              {/* FORMULARIO */}
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6 max-w-4xl mx-auto">
                  {/* INFORMACIÓN BÁSICA */}
                  <div className="bg-white rounded-lg border-2 border-gray-200 p-5">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5" style={{ color: '#003DA5' }} />
                      Información Básica
                    </h3>

                    <div className="space-y-4">
                      {/* Tipo de Auditoría */}
                      <FieldWrapper
                        label="Tipo de Auditoría"
                        error={touched.tipo ? getFieldError(errors, 'Tipo de auditoría') : null}
                        required
                        helpText="Seleccione el tipo de auditoría según su naturaleza"
                      >
                        {cargandoTipos ? (
                          <div className="flex items-center gap-2 py-3 text-gray-500 text-sm">
                            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            Cargando tipos de auditoría...
                          </div>
                        ) : tiposAuditoria.length > 0 ? (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {tiposAuditoria.map(tipo => (
                              <button
                                key={tipo.id}
                                type="button"
                                onClick={() => {
                                  handleChange('tipo', tipo.codigo.toLowerCase());
                                  handleBlur('tipo');
                                }}
                                className={`
                                  px-4 py-3 rounded-lg border-2 transition-all duration-200
                                  flex flex-col items-center justify-center gap-2 font-medium
                                  ${
                                    formData.tipo === tipo.codigo.toLowerCase()
                                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                                      : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400'
                                  }
                                  ${
                                    hasFieldError(errors, 'Tipo de auditoría') && touched.tipo
                                      ? 'border-red-500'
                                      : ''
                                  }
                                `}
                              >
                                <div
                                  className="w-5 h-5 rounded-full"
                                  style={{ backgroundColor: tipo.color || '#003DA5' }}
                                />
                                <span className="text-sm">{tipo.nombre}</span>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {[
                              { value: 'regular', label: 'Regular', icono: <Shield className="w-5 h-5" /> },
                              { value: 'territorial', label: 'Territorial', icono: <MapPin className="w-5 h-5" /> },
                              { value: 'especial', label: 'Especial', icono: <Zap className="w-5 h-5" /> }
                            ].map(tipo => (
                              <button
                                key={tipo.value}
                                type="button"
                                onClick={() => {
                                  handleChange('tipo', tipo.value);
                                  handleBlur('tipo');
                                }}
                                className={`
                                  px-4 py-3 rounded-lg border-2 transition-all duration-200
                                  flex flex-col items-center justify-center gap-2 font-medium
                                  ${
                                    formData.tipo === tipo.value
                                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                                      : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400'
                                  }
                                  ${
                                    hasFieldError(errors, 'Tipo de auditoría') && touched.tipo
                                      ? 'border-red-500'
                                      : ''
                                  }
                                `}
                              >
                                {tipo.icono}
                                <span className="text-sm">{tipo.label}</span>
                              </button>
                            ))}
                          </div>
                        )}
                        {/* Descripción contextual del tipo seleccionado */}
                        {formData.tipo && (() => {
                          const tipoSel = tiposAuditoria.find(t => t.codigo.toLowerCase() === formData.tipo);
                          if (tipoSel?.descripcion) {
                            return (
                              <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <p className="text-sm text-blue-800">
                                  <span className="font-semibold">{tipoSel.nombre}: </span>
                                  {tipoSel.descripcion}
                                </p>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </FieldWrapper>

                      {/* Título */}
                      <FieldWrapper
                        label="Título de la Auditoría"
                        error={touched.titulo ? getFieldError(errors, 'Título') : null}
                        required
                        helpText="Mínimo 10 caracteres, máximo 200"
                      >
                        <Input
                          value={formData.titulo}
                          onChange={(e) => handleChange('titulo', e.target.value)}
                          onBlur={() => handleBlur('titulo')}
                          placeholder="Ej: Auditoría de Gestión Administrativa Territorial"
                          className={
                            hasFieldError(errors, 'Título') && touched.titulo
                              ? 'border-red-500 focus:ring-red-500'
                              : ''
                          }
                        />
                        <div className="text-xs text-gray-500 text-right mt-1">
                          {formData.titulo.length}/200
                        </div>
                      </FieldWrapper>

                      {/* Descripción */}
                      <FieldWrapper
                        label="Descripción"
                        error={touched.descripcion ? getFieldError(errors, 'Descripción') : null}
                        required
                        helpText="Mínimo 20 caracteres, máximo 500"
                      >
                        <textarea
                          value={formData.descripcion}
                          onChange={(e) => handleChange('descripcion', e.target.value)}
                          onBlur={() => handleBlur('descripcion')}
                          placeholder="Describa brevemente el propósito y alcance de la auditoría..."
                          rows={4}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 resize-none ${
                            hasFieldError(errors, 'Descripción') && touched.descripcion
                              ? 'border-red-500 focus:ring-red-500'
                              : 'border-gray-300'
                          }`}
                        />
                        <div className="text-xs text-gray-500 text-right mt-1">
                          {formData.descripcion.length}/500
                        </div>
                      </FieldWrapper>

                      {/* Territorial */}
                      <FieldWrapper
                        label="Territorial"
                        error={touched.territorial ? getFieldError(errors, 'Territorial') : null}
                        required
                      >
                        <select
                          value={formData.territorial}
                          onChange={(e) => handleChange('territorial', e.target.value)}
                          onBlur={() => handleBlur('territorial')}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                            hasFieldError(errors, 'Territorial') && touched.territorial
                              ? 'border-red-500 focus:ring-red-500'
                              : 'border-gray-300'
                          }`}
                        >
                          <option value="">Seleccione una territorial...</option>
                          {TERRITORIALES.map(territorial => (
                            <option key={territorial} value={territorial}>
                              {territorial}
                            </option>
                          ))}
                        </select>
                      </FieldWrapper>
                    </div>
                  </div>

                  {/* PROCESO AUDITADO */}
                  <div className="bg-white rounded-lg border-2 border-gray-200 p-5">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Layers className="w-5 h-5" style={{ color: '#003DA5' }} />
                      Proceso Auditado
                      <span className="text-xs font-normal text-gray-500 ml-1">(del Universo Auditable)</span>
                    </h3>

                    {(formData as any).procesoAuditadoId ? (
                      // Proceso seleccionado: mostrar resumen
                      (() => {
                        const evSel = evaluacionesDisponibles.find(
                          ev => ev.proceso?.id === (formData as any).procesoAuditadoId
                        );
                        const proc = evSel?.proceso;
                        const criticidadColors: Record<string, string> = {
                          Extremo: 'bg-red-100 text-red-800 border-red-300',
                          Alto: 'bg-orange-100 text-orange-800 border-orange-300',
                          Moderado: 'bg-yellow-100 text-yellow-800 border-yellow-300',
                          Bajo: 'bg-blue-100 text-blue-800 border-blue-300',
                        };
                        const criticidadClass =
                          criticidadColors[evSel?.nivelCriticidadDafp || ''] ||
                          'bg-gray-100 text-gray-700 border-gray-200';
                        return (
                          <div className="p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-gray-900 text-sm">
                                  {proc?.codigo && (
                                    <span className="font-mono text-xs text-gray-500 mr-2">{proc.codigo}</span>
                                  )}
                                  {proc?.nombre || (formData as any).procesoAuditadoNombre}
                                </p>
                                {proc?.macroproceso && (
                                  <p className="text-xs text-gray-500 mt-0.5">{proc.macroproceso}</p>
                                )}
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {proc?.tipo && (
                                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700">
                                      {proc.tipo}
                                    </span>
                                  )}
                                  {evSel?.nivelCriticidadDafp && (
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${criticidadClass}`}>
                                      {evSel.nivelCriticidadDafp}
                                    </span>
                                  )}
                                  {evSel?.cicloRotacionDafp && (
                                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                      {evSel.cicloRotacionDafp}
                                    </span>
                                  )}
                                  {evSel?.ponderacionFinalDafp != null && (
                                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#003DA5] text-white">
                                      DAFP: {Number(evSel.ponderacionFinalDafp).toFixed(2)}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  setFormData(prev => ({
                                    ...prev,
                                    procesoAuditadoId: '',
                                    procesoAuditadoNombre: ''
                                  } as AuditoriaFormData))
                                }
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                                title="Quitar proceso seleccionado"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      // Selector de proceso
                      <div>
                        {/* Buscador */}
                        <div className="relative mb-3">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="text"
                            value={busquedaProceso}
                            onChange={e => setBusquedaProceso(e.target.value)}
                            onFocus={() => setSelectorProcesoAbierto(true)}
                            placeholder={cargandoEvaluaciones ? 'Cargando procesos...' : 'Buscar proceso por nombre, código o dependencia...'}
                            disabled={cargandoEvaluaciones}
                            className="w-full pl-9 pr-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-sm disabled:bg-gray-50 disabled:text-gray-400"
                          />
                          {cargandoEvaluaciones && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            </div>
                          )}
                        </div>

                        {/* Lista de procesos */}
                        {!cargandoEvaluaciones && (() => {
                          const evaluacionesFiltradas = evaluacionesDisponibles.filter(ev => {
                            if (!busquedaProceso.trim()) return true;
                            const q = busquedaProceso.toLowerCase();
                            const p = ev.proceso;
                            return (
                              p?.nombre?.toLowerCase().includes(q) ||
                              p?.codigo?.toLowerCase().includes(q) ||
                              p?.macroproceso?.toLowerCase().includes(q) ||
                              ev.dependenciaResponsable?.toLowerCase().includes(q)
                            );
                          });

                          if (evaluacionesDisponibles.length === 0) {
                            return (
                              <div className="text-center py-8 text-gray-400">
                                <Layers className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                <p className="text-sm">No hay evaluaciones registradas en el universo auditable</p>
                              </div>
                            );
                          }

                          if (evaluacionesFiltradas.length === 0) {
                            return (
                              <p className="text-sm text-gray-400 text-center py-4">
                                Sin resultados para "<em>{busquedaProceso}</em>"
                              </p>
                            );
                          }

                          const criticidadColors: Record<string, string> = {
                            Extremo: 'bg-red-100 text-red-800',
                            Alto: 'bg-orange-100 text-orange-800',
                            Moderado: 'bg-yellow-100 text-yellow-800',
                            Bajo: 'bg-blue-100 text-blue-800',
                          };

                          return (
                            <div className="max-h-64 overflow-y-auto space-y-1.5 border-2 border-gray-100 rounded-lg p-1">
                              {evaluacionesFiltradas.map(ev => {
                                const proc = ev.proceso;
                                const criticidadClass =
                                  criticidadColors[ev.nivelCriticidadDafp || ''] ||
                                  'bg-gray-100 text-gray-600';
                                return (
                                  <button
                                    key={ev.id}
                                    type="button"
                                    onClick={() => {
                                      setFormData(prev => ({
                                        ...prev,
                                        procesoAuditadoId: proc?.id || ev.procesoId,
                                        procesoAuditadoNombre: proc?.nombre || ''
                                      } as AuditoriaFormData));
                                      setBusquedaProceso('');
                                      setSelectorProcesoAbierto(false);
                                    }}
                                    className="w-full text-left px-3 py-2.5 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-200"
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 truncate">
                                          {proc?.codigo && (
                                            <span className="font-mono text-xs text-gray-400 mr-1.5">{proc.codigo}</span>
                                          )}
                                          {proc?.nombre || 'Sin nombre'}
                                        </p>
                                        {proc?.macroproceso && (
                                          <p className="text-xs text-gray-500 truncate">{proc.macroproceso}</p>
                                        )}
                                      </div>
                                      <div className="flex flex-col items-end gap-1 shrink-0">
                                        {ev.nivelCriticidadDafp && (
                                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${criticidadClass}`}>
                                            {ev.nivelCriticidadDafp}
                                          </span>
                                        )}
                                        {ev.ponderacionFinalDafp != null && (
                                          <span className="text-[10px] font-bold text-[#003DA5]">
                                            {Number(ev.ponderacionFinalDafp).toFixed(2)}/5.0
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  {/* EQUIPO AUDITOR */}
                  <div className="bg-white rounded-lg border-2 border-gray-200 p-5">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <User className="w-5 h-5" style={{ color: '#003DA5' }} />
                      Equipo Auditor
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Auditor Líder */}
                      <FieldWrapper
                        label="Auditor Líder"
                        error={touched.auditorLider ? getFieldError(errors, 'Auditor Líder') : null}
                        required
                      >
                        <select
                          value={formData.auditorLider || ''}
                          onChange={(e) => handleChange('auditorLider', e.target.value)}
                          onBlur={() => handleBlur('auditorLider')}
                          disabled={cargandoAuditores}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                            hasFieldError(errors, 'Auditor Líder') && touched.auditorLider
                              ? 'border-red-500 focus:ring-red-500'
                              : 'border-gray-300'
                          }`}
                        >
                          <option value="">{cargandoAuditores ? 'Cargando auditores...' : 'Seleccione un auditor...'}</option>
                          {auditoresDisponibles.map(auditor => (
                            <option key={auditor.id} value={auditor.id}>
                              {auditor.nombre} - {auditor.cargo}
                            </option>
                          ))}
                        </select>
                      </FieldWrapper>

                      {/* Auditor Asignado */}
                      <FieldWrapper
                        label="Auditor Asignado"
                        error={touched.auditorAsignado ? getFieldError(errors, 'Auditor Asignado') : null}
                        required
                      >
                        <select
                          value={formData.auditorAsignado || ''}
                          onChange={(e) => handleChange('auditorAsignado', e.target.value)}
                          onBlur={() => handleBlur('auditorAsignado')}
                          disabled={cargandoAuditores}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                            hasFieldError(errors, 'Auditor Asignado') && touched.auditorAsignado
                              ? 'border-red-500 focus:ring-red-500'
                              : 'border-gray-300'
                          }`}
                        >
                          <option value="">{cargandoAuditores ? 'Cargando auditores...' : 'Seleccione un auditor...'}</option>
                          {auditoresDisponibles.filter(a => a.id !== formData.auditorLider).map(auditor => (
                            <option key={auditor.id} value={auditor.id}>
                              {auditor.nombre} - {auditor.cargo}
                            </option>
                          ))}
                        </select>
                      </FieldWrapper>
                    </div>

                    {/* Error de auditor duplicado */}
                    {getFieldError(errors, 'auditorAsignado')?.includes('mismo') && (
                      <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                        <p className="text-sm text-red-700 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          El auditor líder y el auditor asignado deben ser personas diferentes
                        </p>
                      </div>
                    )}
                  </div>

                  {/* FECHAS */}
                  <div className="bg-white rounded-lg border-2 border-gray-200 p-5">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Calendar className="w-5 h-5" style={{ color: '#003DA5' }} />
                      Periodo de Ejecución
                    </h3>

                    <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-xs text-blue-800 font-medium mb-1">📋 Cronograma de 3 Etapas</p>
                      <p className="text-xs text-blue-700">Planeación → Ejecución → Comunicación</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Fecha Inicio de Planeación */}
                      <FieldWrapper
                        label="Inicio de Planeación"
                        error={touched.fechaInicio ? getFieldError(errors, 'Fecha de inicio') : null}
                        required
                        helpText="Fecha de inicio de la auditoría"
                      >
                        <Input
                          type="date"
                          value={formData.fechaInicio}
                          onChange={(e) => handleChange('fechaInicio', e.target.value)}
                          onBlur={() => handleBlur('fechaInicio')}
                          className={
                            hasFieldError(errors, 'Fecha de inicio') && touched.fechaInicio
                              ? 'border-red-500 focus:ring-red-500'
                              : ''
                          }
                        />
                      </FieldWrapper>

                      {/* Fecha Fin de Planeación / Inicio de Ejecución */}
                      <FieldWrapper
                        label="Fin Planeación / Inicio Ejecución"
                        helpText="Marca el inicio del trabajo de campo"
                      >
                        <Input
                          type="date"
                          value={(formData as any).fechaFinPlaneacion || ''}
                          onChange={(e) => handleChange('fechaFinPlaneacion', e.target.value)}
                          min={formData.fechaInicio || undefined}
                        />
                      </FieldWrapper>

                      {/* Fecha Fin de Ejecución / Inicio de Comunicación */}
                      <FieldWrapper
                        label="Fin Ejecución / Inicio Comunicación"
                        helpText="Marca el inicio de elaboración del informe"
                      >
                        <Input
                          type="date"
                          value={(formData as any).fechaFinEjecucion || ''}
                          onChange={(e) => handleChange('fechaFinEjecucion', e.target.value)}
                          min={(formData as any).fechaFinPlaneacion || formData.fechaInicio || undefined}
                        />
                      </FieldWrapper>

                      {/* Fecha Fin de la Auditoría */}
                      <FieldWrapper
                        label="Finalización de la Auditoría"
                        error={touched.fechaFin ? getFieldError(errors, 'Fecha de fin') : null}
                        required
                        helpText="Fin de la etapa de Comunicación"
                      >
                        <Input
                          type="date"
                          value={formData.fechaFin}
                          onChange={(e) => handleChange('fechaFin', e.target.value)}
                          onBlur={() => handleBlur('fechaFin')}
                          min={(formData as any).fechaFinEjecucion || (formData as any).fechaFinPlaneacion || formData.fechaInicio || undefined}
                          className={
                            hasFieldError(errors, 'Fecha de fin') && touched.fechaFin
                              ? 'border-red-500 focus:ring-red-500'
                              : ''
                          }
                        />
                      </FieldWrapper>
                    </div>
                  </div>

                  {/* OBJETIVOS */}
                  <div className="bg-white rounded-lg border-2 border-gray-200 p-5">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Target className="w-5 h-5" style={{ color: '#003DA5' }} />
                      Objetivos de la Auditoría
                    </h3>

                    {/* Lista de objetivos */}
                    {formData.objetivos.length > 0 && (
                      <div className="space-y-2 mb-4">
                        {formData.objetivos.map((objetivo, index) => (
                          <div
                            key={index}
                            className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200"
                          >
                            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-gray-700 flex-1">{objetivo}</p>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEliminarObjetivo(index)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Agregar objetivo */}
                    <FieldWrapper
                      label="Agregar Objetivo"
                      error={touched.objetivos ? getFieldError(errors, 'Objetivos') : null}
                      required={formData.objetivos.length === 0}
                      helpText="Mínimo 10 caracteres por objetivo"
                    >
                      <div className="flex gap-2">
                        <Input
                          value={objetivoTemporal}
                          onChange={(e) => setObjetivoTemporal(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAgregarObjetivo();
                            }
                          }}
                          placeholder="Escriba un objetivo y presione Enter o haga clic en Agregar"
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          onClick={handleAgregarObjetivo}
                          disabled={objetivoTemporal.trim().length < 10}
                          style={{ backgroundColor: '#003DA5' }}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Agregar
                        </Button>
                      </div>
                    </FieldWrapper>
                  </div>

                  {/* ALCANCE Y RIESGO */}
                  <div className="bg-white rounded-lg border-2 border-gray-200 p-5">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Shield className="w-5 h-5" style={{ color: '#003DA5' }} />
                      Alcance y Evaluación de Riesgo
                    </h3>

                    <div className="space-y-4">
                      {/* Alcance */}
                      <FieldWrapper
                        label="Alcance de la Auditoría"
                        error={touched.alcance ? getFieldError(errors, 'Alcance') : null}
                        required
                        helpText="Mínimo 20 caracteres"
                      >
                        <textarea
                          value={formData.alcance}
                          onChange={(e) => handleChange('alcance', e.target.value)}
                          onBlur={() => handleBlur('alcance')}
                          placeholder="Defina el alcance de la auditoría, áreas a evaluar, procesos incluidos..."
                          rows={4}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 resize-none ${
                            hasFieldError(errors, 'Alcance') && touched.alcance
                              ? 'border-red-500 focus:ring-red-500'
                              : 'border-gray-300'
                          }`}
                        />
                      </FieldWrapper>

                      {/* Nivel de Riesgo */}
                      <FieldWrapper
                        label="Nivel de Riesgo"
                        error={touched.riesgo ? getFieldError(errors, 'Nivel de riesgo') : null}
                        required
                      >
                        <div className="grid grid-cols-3 gap-3">
                          {(['Bajo', 'Medio', 'Alto'] as const).map(nivel => (
                            <button
                              key={nivel}
                              type="button"
                              onClick={() => handleChange('riesgo', nivel)}
                              className={`p-4 rounded-lg border-2 transition-all ${
                                formData.riesgo === nivel
                                  ? nivel === 'Alto'
                                    ? 'border-red-500 bg-red-50'
                                    : nivel === 'Medio'
                                    ? 'border-yellow-500 bg-yellow-50'
                                    : 'border-green-500 bg-green-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <div className="text-center">
                                <div
                                  className={`w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center ${
                                    formData.riesgo === nivel
                                      ? nivel === 'Alto'
                                        ? 'bg-red-500'
                                        : nivel === 'Medio'
                                        ? 'bg-yellow-500'
                                        : 'bg-green-500'
                                      : 'bg-gray-300'
                                  }`}
                                >
                                  <Shield className="w-4 h-4 text-white" />
                                </div>
                                <div className="font-bold text-sm">{nivel}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </FieldWrapper>
                    </div>
                  </div>
                </div>
              </form>

              {/* FOOTER */}
              <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
                <div className="text-sm text-gray-600">
                  {hasChanges && (
                    <span className="flex items-center gap-1 text-yellow-600">
                      <AlertCircle className="w-4 h-4" />
                      Tienes cambios sin guardar
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting || errors.length > 0}
                    style={{ backgroundColor: '#003DA5' }}
                    className="gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        >
                          <Save className="w-4 h-4" />
                        </motion.div>
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        {mode === 'create' ? 'Crear Auditoría' : 'Guardar Cambios'}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}