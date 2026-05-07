/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FORMULARIO UNIFICADO DE AUDITORÍA - VERSIÓN CORPORATIVA ESAP
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * FORMULARIO MANDATORIO ÚNICO para todo Control Interno de Gestión OCI
 * 
 * CARACTERÍSTICAS:
 * - Formulario completo con TODAS las secciones de auditoría
 * - Incluye gestión de hallazgos desde la creación
 * - Validación robusta en tiempo real
 * - Diseño corporativo ESAP
 * - Mobile-first responsive
 * - Wizard paso a paso para mejor UX
 * 
 * SECCIONES:
 * 1. Información Básica (tipo, título, descripción)
 * 2. Clasificación y Alcance (territorial, área, proceso)
 * 3. Equipo Auditor (líder, asignado, equipo completo)
 * 4. Programación (fechas, periodicidad, hitos)
 * 5. Objetivos y Criterios (objetivos, normas, metodología)
 * 6. Recursos y Productos (presupuesto, equipos, entregables)
 * 7. Riesgos y Controles (nivel, controles)
 * 8. Hallazgos Identificados (opcional - para auditorías en ejecución)
 * 9. Vinculación Plan Anual (relación con planificación)
 * 
 * ÚLTIMA ACTUALIZACIÓN: 24 Diciembre 2025
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Save, AlertCircle, CheckCircle, Plus, Trash2, ChevronRight, ChevronLeft,
  User, Calendar, Target, FileText, Shield, Info, Users, Building2,
  ClipboardCheck, DollarSign, TrendingUp, FileCheck, MapPin, Clock,
  AlertTriangle, CheckSquare, Layers, Zap, BookOpen, Settings
} from 'lucide-react';
import { Button } from '@esap-mfe/shared-ui/button';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { Input } from '@esap-mfe/shared-ui/input';
import { Card } from '@esap-mfe/shared-ui/card';
import { toast } from 'sonner';
import { configuracionesProfesionalesOCIApi, auditoriasApi } from './services/api';
import { controlInternoService, type ProcesoAuditable, type EvaluacionProceso } from '../../../services/api/controlInternoService';
import { REGLAS_NEGOCIO_OCIG } from '../config/reglas-negocio-ocig';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

export interface Hallazgo {
  id: string;
  tipo: 'observacion' | 'hallazgo_administrativo' | 'hallazgo_disciplinario' | 'hallazgo_fiscal' | 'hallazgo_penal';
  descripcion: string;
  criterio: string;
  causa: string;
  efecto: string;
  recomendacion: string;
  estado: 'identificado' | 'comunicado' | 'en_mejoramiento' | 'cerrado';
  fechaIdentificacion: string;
}

export interface RecursoAuditoria {
  tipo: 'humano' | 'tecnologico' | 'financiero' | 'logistico';
  descripcion: string;
  cantidad: string;
  costo?: string;
}

export interface ProductoEsperado {
  nombre: string;
  descripcion: string;
  fechaEntrega: string;
}

export interface HitoAuditoria {
  nombre: string;
  descripcion: string;
  fechaProgramada: string;
  responsable: string;
}

export interface AuditoriaUnificadaFormData {
  // 1. INFORMACIÓN BÁSICA
  codigo?: string;
  tipoAuditoria: 'regular' | 'territorial' | 'especial' | 'seguimiento';
  titulo: string;
  descripcion: string;
  
  // 2. CLASIFICACIÓN Y ALCANCE
  territorial: string;
  areaObjetivo: string;
  procesoAuditado: string;
  alcance: string;
  focos?: string[]; // Focos de la auditoría (opcional, multi-select)
  
  // 3. EQUIPO AUDITOR
  auditorLider: string;
  auditorAsignado: string;
  equipoAuditores: string[];
  supervisorAsignado: string;
  
  // 4. PROGRAMACIÓN (3 etapas: Planeación, Ejecución, Comunicación)
  // Etapa 1: Planeación
  fechaInicioPlaneacion: string;
  fechaFinPlaneacion: string;
  // Etapa 2: Ejecución (se habilita al completar Planeación)
  fechaInicioEjecucion?: string;
  fechaFinEjecucion?: string;
  // Etapa 3: Comunicación (se habilita al completar Ejecución)
  fechaInicioComunicacion?: string;
  fechaFinComunicacion?: string;
  // Campos legacy para compatibilidad
  fechaInicio?: string;
  fechaFin?: string;
  hitos: HitoAuditoria[];
  
  // 5. OBJETIVOS Y CRITERIOS
  objetivos: string[];
  criteriosAuditoria: string[];
  normatividadAplicable: string[];
  metodologia: string;
  
  // 6. RECURSOS Y PRODUCTOS
  recursos: RecursoAuditoria[];
  presupuestoEstimado: string;
  productosEsperados: ProductoEsperado[];
  
  // 7. RIESGOS Y CONTROLES
  nivelRiesgo: 'Bajo' | 'Medio' | 'Alto' | 'Crítico';
  riesgosIdentificados: string[];
  controlesAplicar: string[];
  
  // 8. HALLAZGOS (opcional - para auditorías en ejecución)
  hallazgos: Hallazgo[];
  incluirHallazgosPreliminares: boolean; // 🆕 Indica si se incluyen hallazgos preliminares
  
  // 9. VINCULACIÓN PLAN ANUAL
  vinculadaPlanAnual: boolean;
  planAnualId?: string;
  planAnualAño?: number;
  rolDecretoAsociado?: string;
  
  // 10. ESTADO KANBAN (para crear auditoria en columna correcta)
  estadoKanban?: 'Plan Anual' | 'Planeación' | 'Trabajo de Campo' | 'Elaboración Informe' | 'Informe Final' | 'Seguimiento' | 'Cerrada';
}

interface FormularioAuditoriaUnificadoProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: AuditoriaUnificadaFormData) => void;
  initialData?: Partial<AuditoriaUnificadaFormData>;
  mode: 'create' | 'edit';
}

// ═══════════════════════════════════════════════════════════════════════════
// DATOS MOCK
// ═══════════════════════════════════════════════════════════════════════════

const TERRITORIALES = [
  'Nacional', 'Antioquia', 'Atlántico', 'Bogotá', 'Bolívar', 'Boyacá', 'Caldas',
  'Caquetá', 'Cauca', 'Cesar', 'Chocó', 'Córdoba', 'Cundinamarca', 'Huila',
  'La Guajira', 'Magdalena', 'Meta', 'Nariño', 'Norte de Santander', 'Quindío',
  'Risaralda', 'Santander', 'Sucre', 'Tolima', 'Valle del Cauca'
];

const AREAS_INSTITUCIONALES = [
  'Gestión Administrativa',
  'Gestión Financiera',
  'Gestión Talento Humano',
  'Gestión Académica',
  'Gestión Tecnológica',
  'Gestión Contractual',
  'Gestión Documental',
  'Gestión Riesgos',
  'Gestión Ambiental',
  'Atención al Ciudadano',
  'Control Interno',
  'Planeación Estratégica'
];

// Datos fallback si no se cargan del backend
const PROCESOS_INSTITUCIONALES_FALLBACK = [
  'Contratación',
  'Presupuesto',
  'Tesorería',
  'Contabilidad',
  'Nómina',
  'Selección y Vinculación',
  'Capacitación',
  'Evaluación Desempeño',
  'Admisiones',
  'Registro Académico',
  'Infraestructura TI',
  'Archivo y Correspondencia',
  'PQRS',
  'Inventarios',
  'Almacén'
];

// Datos fallback si no se cargan del backend
const AUDITORES_FALLBACK = [
  { id: 'aud-001', nombre: 'Juan Pérez Gómez', cargo: 'Auditor Senior' },
  { id: 'aud-002', nombre: 'Ana María López Silva', cargo: 'Auditor Junior' },
  { id: 'aud-003', nombre: 'Carlos Ramírez Díaz', cargo: 'Auditor Senior' },
  { id: 'aud-004', nombre: 'Diana López Vargas', cargo: 'Auditor Senior' },
  { id: 'aud-005', nombre: 'Roberto Torres Sánchez', cargo: 'Auditor Líder' },
  { id: 'aud-006', nombre: 'Fernando Ávila García', cargo: 'Jefe OCI' }
];

// Tipo para auditor
interface AuditorOption {
  id: string;
  nombre: string;
  cargo: string;
}

const ROLES_DECRETO_648 = [
  'Liderazgo Estratégico',
  'Enfoque Prevención',
  'Relación Entes Control',
  'Evaluación Gestión Riesgos',
  'Evaluación y Seguimiento'
];

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE AUXILIAR: FIELD WRAPPER
// ═══════════════════════════════════════════════════════════════════════════

interface FieldWrapperProps {
  label: string;
  error?: string | null;
  required?: boolean;
  children: React.ReactNode;
  helpText?: string;
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
        <p className="text-xs text-gray-500 flex items-center gap-1">
          <Info className="w-3 h-3" />
          {helpText}
        </p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

export function FormularioAuditoriaUnificado({
  open,
  onClose,
  onSubmit,
  initialData,
  mode
}: FormularioAuditoriaUnificadoProps) {
  const [pasoActual, setPasoActual] = useState(1);
  const [formData, setFormData] = useState<AuditoriaUnificadaFormData>({
    codigo: initialData?.codigo || '',
    tipoAuditoria: initialData?.tipoAuditoria || 'regular',
    titulo: initialData?.titulo || '',
    descripcion: initialData?.descripcion || '',
    territorial: initialData?.territorial || '',
    areaObjetivo: initialData?.areaObjetivo || '',
    procesoAuditado: initialData?.procesoAuditado || '',
    alcance: initialData?.alcance || '',
    auditorLider: initialData?.auditorLider || '',
    auditorAsignado: initialData?.auditorAsignado || '',
    equipoAuditores: initialData?.equipoAuditores || [],
    supervisorAsignado: initialData?.supervisorAsignado || '',
    // Etapas del cronograma
    fechaInicioPlaneacion: initialData?.fechaInicioPlaneacion || initialData?.fechaInicio || '',
    fechaFinPlaneacion: initialData?.fechaFinPlaneacion || '',
    fechaInicioEjecucion: initialData?.fechaInicioEjecucion || '',
    fechaFinEjecucion: initialData?.fechaFinEjecucion || '',
    fechaInicioComunicacion: initialData?.fechaInicioComunicacion || '',
    fechaFinComunicacion: initialData?.fechaFinComunicacion || initialData?.fechaFin || '',
    // Legacy
    fechaInicio: initialData?.fechaInicio || '',
    fechaFin: initialData?.fechaFin || '',
    hitos: initialData?.hitos || [],
    objetivos: initialData?.objetivos || [],
    criteriosAuditoria: initialData?.criteriosAuditoria || [],
    normatividadAplicable: initialData?.normatividadAplicable || [],
    metodologia: initialData?.metodologia || '',
    recursos: initialData?.recursos || [],
    presupuestoEstimado: initialData?.presupuestoEstimado || '',
    productosEsperados: initialData?.productosEsperados || [],
    nivelRiesgo: initialData?.nivelRiesgo || 'Medio',
    riesgosIdentificados: initialData?.riesgosIdentificados || [],
    riesgosAsociados: initialData?.riesgosAsociados || [],
    controlesAplicar: initialData?.controlesAplicar || [],
    hallazgos: initialData?.hallazgos || [],
    incluirHallazgosPreliminares: initialData?.incluirHallazgosPreliminares || false,
    vinculadaPlanAnual: initialData?.vinculadaPlanAnual || false,
    planAnualId: initialData?.planAnualId || '',
    planAnualAño: initialData?.planAnualAño || new Date().getFullYear(),
    rolDecretoAsociado: initialData?.rolDecretoAsociado || '',
    estadoKanban: initialData?.estadoKanban || 'Plan Anual' // Por defecto crear en Plan Anual
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [objetivoTemporal, setObjetivoTemporal] = useState('');
  const [criterioTemporal, setCriterioTemporal] = useState('');
  const [normaTemporal, setNormaTemporal] = useState('');
  const [riesgoTemporal, setRiesgoTemporal] = useState('');
  const [procesoRiesgoTemporal, setProcesoRiesgoTemporal] = useState('');
  const [controlTemporal, setControlTemporal] = useState('');
  const [editandoRiesgoIndex, setEditandoRiesgoIndex] = useState<number | null>(null);
  const [textoEditadoRiesgo, setTextoEditadoRiesgo] = useState('');
  
  // Estado para auditores cargados del backend
  const [auditoresDisponibles, setAuditoresDisponibles] = useState<AuditorOption[]>(AUDITORES_FALLBACK);
  const [cargandoAuditores, setCargandoAuditores] = useState(false);

  // Estado para tipos de auditoría cargados del backend
  const [tiposAuditoria, setTiposAuditoria] = useState<{ id: string; codigo: string; nombre: string; color?: string; descripcion?: string }[]>([]);
  const [cargandoTipos, setCargandoTipos] = useState(false);
  
  // Estado para procesos auditables cargados del backend
  const [procesosAuditables, setProcesosAuditables] = useState<string[]>(PROCESOS_INSTITUCIONALES_FALLBACK);
  const [cargandoProcesos, setCargandoProcesos] = useState(false);
  
  // Estado para búsqueda de procesos
  const [busquedaProceso, setBusquedaProceso] = useState('');
  const [mostrarSugerenciasProcesos, setMostrarSugerenciasProcesos] = useState(false);
  
  // Estado para evaluaciones completas (incluye datos de riesgo)
  const [evaluacionesDisponibles, setEvaluacionesDisponibles] = useState<EvaluacionProceso[]>([]);

  const TOTAL_PASOS = 9;
  
  // Cargar profesionales OCI configurados del backend
  useEffect(() => {
    const cargarAuditores = async () => {
      if (!open) return;
      
      setCargandoAuditores(true);
      try {
        // Usar profesionales configurados en OCI en lugar de personas disponibles genéricas
        const response = await configuracionesProfesionalesOCIApi.getAll();
        
        if (response.success && response.data && response.data.length > 0) {
          const auditores = response.data
            .filter((config: any) => config.activo)
            .map((config: any) => ({
              id: String(config.idTercero),
              nombre: config.nombre || `Profesional ${config.idTercero}`,
              cargo: config.rolOcig || config.rolOCI || config.cargo || 'Auditor'
            }));
          setAuditoresDisponibles(auditores);
        } else {
          console.warn('[FormularioAuditoria] No hay profesionales OCI configurados, usando fallback');
        }
      } catch (error) {
        console.error('[FormularioAuditoria] Error al cargar profesionales OCI:', error);
        // Mantener los datos fallback
      } finally {
        setCargandoAuditores(false);
      }
    };
    
    cargarAuditores();
  }, [open]);
  
  // Cargar tipos de auditoría desde la API de configuración
  useEffect(() => {
    const cargarTipos = async () => {
      if (!open) return;
      setCargandoTipos(true);
      try {
        const response = await auditoriasApi.getTiposAuditoria(true);
        if (response.success && Array.isArray(response.data) && response.data.length > 0) {
          const activos = response.data.filter((t: any) => t.activo !== false && t.activa !== false);
          setTiposAuditoria(activos.map((t: any) => ({
            id: t.id,
            codigo: t.codigo || t.id,
            nombre: t.nombre,
            color: t.color,
            descripcion: t.descripcion
          })));
        }
      } catch (error) {
        console.error('[FormularioAuditoria] Error al cargar tipos de auditoría:', error);
      } finally {
        setCargandoTipos(false);
      }
    };
    cargarTipos();
  }, [open]);

  // Cargar procesos auditables desde el universo de auditorías
  useEffect(() => {
    const cargarProcesos = async () => {
      if (!open) return;
      
      setCargandoProcesos(true);
      try {
        // Obtener evaluaciones del universo de auditorías
        const evaluaciones = await controlInternoService.getEvaluaciones();
        
        if (evaluaciones && evaluaciones.length > 0) {
          // Guardar evaluaciones completas para acceder a datos de riesgo
          setEvaluacionesDisponibles(evaluaciones);
          
          // Extraer procesos únicos de las evaluaciones
          const procesosUnicos = new Set<string>();
          
          evaluaciones.forEach((evaluacion: EvaluacionProceso) => {
            // Si la evaluación tiene proceso asociado, agregarlo
            if (evaluacion.proceso && evaluacion.proceso.nombre) {
              procesosUnicos.add(evaluacion.proceso.nombre);
            }
          });
          
          // Convertir Set a array ordenado
          const procesosArray = Array.from(procesosUnicos).sort();
          
          if (procesosArray.length > 0) {
            setProcesosAuditables(procesosArray);
            console.log(`[FormularioAuditoria] ✅ ${procesosArray.length} procesos auditables cargados desde el universo`);
          } else {
            console.warn('[FormularioAuditoria] No se encontraron procesos en las evaluaciones, usando fallback');
          }
        } else {
          console.warn('[FormularioAuditoria] No hay evaluaciones registradas, usando procesos fallback');
        }
      } catch (error) {
        console.error('[FormularioAuditoria] Error al cargar procesos auditables:', error);
        // Mantener los datos fallback
      } finally {
        setCargandoProcesos(false);
      }
    };
    
    cargarProcesos();
  }, [open]);

  // Auto-calcular etapas del cronograma (PROMPT: 4-4-5 semanas)
  useEffect(() => {
    if (formData.fechaInicioPlaneacion && !formData.fechaFinPlaneacion && mode === 'create') {
      const inicioP = new Date(formData.fechaInicioPlaneacion);
      
      // 1. Planeación: 4 semanas (28 días)
      const finP = new Date(inicioP);
      finP.setDate(finP.getDate() + 27);
      const fechaFinP = finP.toISOString().split('T')[0];
      
      // 2. Ejecución: 4 semanas (28 días)
      const inicioE = new Date(finP);
      inicioE.setDate(inicioE.getDate() + 1);
      const fechaInicioE = inicioE.toISOString().split('T')[0];
      
      const finE = new Date(inicioE);
      finE.setDate(finE.getDate() + 27);
      const fechaFinE = finE.toISOString().split('T')[0];
      
      // 3. Comunicación: 5 semanas (35 días)
      const inicioC = new Date(finE);
      inicioC.setDate(inicioC.getDate() + 1);
      const fechaInicioC = inicioC.toISOString().split('T')[0];
      
      const finC = new Date(inicioC);
      finC.setDate(finC.getDate() + 34);
      const fechaFinC = finC.toISOString().split('T')[0];
      
      setFormData(prev => ({
        ...prev,
        fechaFinPlaneacion: fechaFinP,
        fechaInicioEjecucion: fechaInicioE,
        fechaFinEjecucion: fechaFinE,
        fechaInicioComunicacion: fechaInicioC,
        fechaFinComunicacion: fechaFinC,
        fechaFin: fechaFinC // Compatibilidad legacy
      }));
    }
  }, [formData.fechaInicioPlaneacion, mode]);

  // Inicializar búsqueda con el proceso/título actual si existe
  useEffect(() => {
    if (formData.titulo && !busquedaProceso) {
      setBusquedaProceso(formData.titulo);
    } else if (formData.procesoAuditado && !busquedaProceso) {
      setBusquedaProceso(formData.procesoAuditado);
    }
  }, [formData.titulo, formData.procesoAuditado, busquedaProceso]);

  // Handlers
  const handleChange = (field: keyof AuditoriaUnificadaFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
  };

  const handleEliminarObjetivo = (index: number) => {
    setFormData(prev => ({
      ...prev,
      objetivos: prev.objetivos.filter((_, i) => i !== index)
    }));
  };

  const handleAgregarCriterio = () => {
    if (criterioTemporal.trim().length < 5) {
      toast.error('El criterio debe tener al menos 5 caracteres');
      return;
    }
    setFormData(prev => ({
      ...prev,
      criteriosAuditoria: [...prev.criteriosAuditoria, criterioTemporal.trim()]
    }));
    setCriterioTemporal('');
  };

  const handleAgregarNorma = () => {
    if (normaTemporal.trim().length < 5) {
      toast.error('La norma debe tener al menos 5 caracteres');
      return;
    }
    setFormData(prev => ({
      ...prev,
      normatividadAplicable: [...prev.normatividadAplicable, normaTemporal.trim()]
    }));
    setNormaTemporal('');
  };

  const handleAgregarRiesgo = () => {
    const textoRiesgo = riesgoTemporal.trim();
    if (textoRiesgo.length < 5) {
      toast.error('El riesgo debe tener al menos 5 caracteres');
      return;
    }
    
    // Si hay un proceso en el campo temporal, lo concatenamos
    const prefijo = procesoRiesgoTemporal.trim() ? `${procesoRiesgoTemporal.trim()}: ` : '';
    const riesgoCompleto = `${prefijo}${textoRiesgo}`;

    handleChange('riesgosIdentificados', [...formData.riesgosIdentificados, riesgoCompleto]);
    setRiesgoTemporal('');
    setProcesoRiesgoTemporal('');
  };

  const handleEditarRiesgo = (index: number) => {
    if (index < 0) {
      setEditandoRiesgoIndex(null);
      setTextoEditadoRiesgo('');
      return;
    }
    setEditandoRiesgoIndex(index);
    setTextoEditadoRiesgo(formData.riesgosIdentificados[index]);
  };

  const handleGuardarRiesgoEditado = (index: number) => {
    if (textoEditadoRiesgo.trim().length < 5) {
      toast.error('El riesgo debe tener al menos 5 caracteres');
      return;
    }
    const nuevos = [...formData.riesgosIdentificados];
    nuevos[index] = textoEditadoRiesgo.trim();
    handleChange('riesgosIdentificados', nuevos);
    setEditandoRiesgoIndex(null);
  };

  const handleEliminarRiesgo = (index: number) => {
    const nuevos = formData.riesgosIdentificados.filter((_, i) => i !== index);
    handleChange('riesgosIdentificados', nuevos);
  };

  const handleAgregarControl = () => {
    if (controlTemporal.trim().length < 10) {
      toast.error('El control debe tener al menos 10 caracteres');
      return;
    }
    setFormData(prev => ({
      ...prev,
      controlesAplicar: [...prev.controlesAplicar, controlTemporal.trim()]
    }));
    setControlTemporal('');
  };

  const handleAgregarHallazgo = () => {
    const nuevoHallazgo: Hallazgo = {
      id: `hall-${Date.now()}`,
      tipo: 'observacion',
      descripcion: '',
      criterio: '',
      causa: '',
      efecto: '',
      recomendacion: '',
      estado: 'identificado',
      fechaIdentificacion: new Date().toISOString().split('T')[0]
    };
    setFormData(prev => ({
      ...prev,
      hallazgos: [...prev.hallazgos, nuevoHallazgo]
    }));
  };

  const handleEliminarHallazgo = (id: string) => {
    setFormData(prev => ({
      ...prev,
      hallazgos: prev.hallazgos.filter(h => h.id !== id)
    }));
  };

  const handleActualizarHallazgo = (id: string, campo: keyof Hallazgo, valor: any) => {
    setFormData(prev => ({
      ...prev,
      hallazgos: prev.hallazgos.map(h =>
        h.id === id ? { ...h, [campo]: valor } : h
      )
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones básicas - titulo contiene el proceso seleccionado
    if (!formData.titulo || formData.titulo.length < 5) {
      toast.error('Debe seleccionar un proceso auditable como título');
      setPasoActual(1);
      return;
    }

    if (!formData.auditorLider) {
      toast.error('Debe asignar un auditor líder');
      setPasoActual(3);
      return;
    }

    // Validar Etapa 1: Planeación (obligatoria)
    if (!formData.fechaInicioPlaneacion || !formData.fechaFinPlaneacion) {
      toast.error('Debe especificar las fechas de inicio y fin de la etapa de Planeación');
      setPasoActual(4);
      return;
    }
    
    const inicioPlaneacion = new Date(formData.fechaInicioPlaneacion);
    const finPlaneacion = new Date(formData.fechaFinPlaneacion);
    if (finPlaneacion <= inicioPlaneacion) {
      toast.error('La fecha de fin de Planeación debe ser posterior a la fecha de inicio');
      setPasoActual(4);
      return;
    }
    
    // Validar Etapa 2: Ejecución (obligatoria si Planeación está completa)
    if (formData.fechaInicioEjecucion || formData.fechaFinEjecucion) {
      if (!formData.fechaInicioEjecucion || !formData.fechaFinEjecucion) {
        toast.error('Debe especificar ambas fechas (inicio y fin) para la etapa de Ejecución');
        setPasoActual(4);
        return;
      }
      const inicioEjecucion = new Date(formData.fechaInicioEjecucion);
      const finEjecucion = new Date(formData.fechaFinEjecucion);
      if (inicioEjecucion < finPlaneacion) {
        toast.error('La fecha de inicio de Ejecución debe ser igual o posterior al fin de Planeación');
        setPasoActual(4);
        return;
      }
      if (finEjecucion <= inicioEjecucion) {
        toast.error('La fecha de fin de Ejecución debe ser posterior a la fecha de inicio');
        setPasoActual(4);
        return;
      }
    }
    
    // Validar Etapa 3: Comunicación (obligatoria si Ejecución está completa)
    if (formData.fechaInicioComunicacion || formData.fechaFinComunicacion) {
      if (!formData.fechaInicioEjecucion || !formData.fechaFinEjecucion) {
        toast.error('Debe completar la etapa de Ejecución antes de la etapa de Comunicación');
        setPasoActual(4);
        return;
      }
      if (!formData.fechaInicioComunicacion || !formData.fechaFinComunicacion) {
        toast.error('Debe especificar ambas fechas (inicio y fin) para la etapa de Comunicación');
        setPasoActual(4);
        return;
      }
      const finEjecucion = new Date(formData.fechaFinEjecucion);
      const inicioComunicacion = new Date(formData.fechaInicioComunicacion);
      const finComunicacion = new Date(formData.fechaFinComunicacion);
      if (inicioComunicacion < finEjecucion) {
        toast.error('La fecha de inicio de Comunicación debe ser igual o posterior al fin de Ejecución');
        setPasoActual(4);
        return;
      }
      if (finComunicacion <= inicioComunicacion) {
        toast.error('La fecha de fin de Comunicación debe ser posterior a la fecha de inicio');
        setPasoActual(4);
        return;
      }
    }

    if (formData.objetivos.length === 0) {
      toast.error('Debe agregar al menos un objetivo');
      setPasoActual(5);
      return;
    }

    setIsSubmitting(true);

    try {
      // 🔍 DEBUG: Log de fechas antes de enviar
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('📤 FormularioAuditoriaUnificado - DATOS A ENVIAR:');
      console.log('   fechaInicioPlaneacion:', formData.fechaInicioPlaneacion);
      console.log('   fechaFinPlaneacion:', formData.fechaFinPlaneacion);
      console.log('   fechaInicioEjecucion:', formData.fechaInicioEjecucion);
      console.log('   fechaFinEjecucion:', formData.fechaFinEjecucion);
      console.log('   fechaInicioComunicacion:', formData.fechaInicioComunicacion);
      console.log('   fechaFinComunicacion:', formData.fechaFinComunicacion);
      console.log('═══════════════════════════════════════════════════════════════');
      
      await onSubmit(formData);
      
      // Log detallado en consola si incluye hallazgos preliminares
      if (formData.incluirHallazgosPreliminares && formData.hallazgos.length > 0) {
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('✅ AUDITORÍA GUARDADA CON HALLAZGOS PRELIMINARES');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log(`📋 Auditoría: ${formData.titulo}`);
        console.log(`⚠️  Hallazgos preliminares: ${formData.hallazgos.length}`);
        console.log('');
        formData.hallazgos.forEach((h, idx) => {
          console.log(`   ${idx + 1}. ${h.tipo.toUpperCase()}: ${h.descripcion.substring(0, 60)}...`);
        });
        console.log('');
        console.log('⚡ IMPORTANTE: Los hallazgos son PRELIMINARES y deben ser comunicados al auditado');
        console.log('═══════════════════════════════════════════════════════════════');
      }
      
      // Toast personalizado si incluye hallazgos preliminares
      if (formData.incluirHallazgosPreliminares && formData.hallazgos.length > 0) {
        toast.success(
          mode === 'create'
            ? `✅ Auditoría creada exitosamente con ${formData.hallazgos.length} hallazgo${formData.hallazgos.length > 1 ? 's' : ''} preliminar${formData.hallazgos.length > 1 ? 'es' : ''}`
            : `✅ Auditoría actualizada exitosamente con ${formData.hallazgos.length} hallazgo${formData.hallazgos.length > 1 ? 's' : ''} preliminar${formData.hallazgos.length > 1 ? 'es' : ''}`,
          {
            description: '⚠️ Recuerda: Los hallazgos tienen carácter preliminar y deben ser comunicados al auditado'
          }
        );
      } else {
        toast.success(
          mode === 'create'
            ? '✅ Auditoría creada exitosamente'
            : '✅ Auditoría actualizada exitosamente'
        );
      }
      
      onClose();
    } catch (error) {
      toast.error('Error al guardar la auditoría');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSiguiente = () => {
    if (pasoActual < TOTAL_PASOS) {
      setPasoActual(pasoActual + 1);
    }
  };

  const handleAnterior = () => {
    if (pasoActual > 1) {
      setPasoActual(pasoActual - 1);
    }
  };

  const renderPaso = () => {
    switch (pasoActual) {
      case 1:
        return (
          <Paso1InformacionBasica 
            formData={formData} 
            onChange={handleChange} 
            procesos={procesosAuditables} 
            cargandoProcesos={cargandoProcesos}
            busquedaProceso={busquedaProceso}
            setBusquedaProceso={setBusquedaProceso}
            mostrarSugerenciasProcesos={mostrarSugerenciasProcesos}
            setMostrarSugerenciasProcesos={setMostrarSugerenciasProcesos}
            evaluaciones={evaluacionesDisponibles}
            tiposAuditoria={tiposAuditoria}
            cargandoTipos={cargandoTipos}
          />
        );
      case 2:
        return <Paso2ClasificacionAlcance formData={formData} onChange={handleChange} evaluaciones={evaluacionesDisponibles} />;
      case 3:
        return <Paso3EquipoAuditor formData={formData} onChange={handleChange} auditores={auditoresDisponibles} />;
      case 4:
        return <Paso4Programacion formData={formData} onChange={handleChange} />;
      case 5:
        return (
          <Paso5ObjetivosCriterios
            formData={formData}
            onChange={handleChange}
            objetivoTemporal={objetivoTemporal}
            setObjetivoTemporal={setObjetivoTemporal}
            onAgregarObjetivo={handleAgregarObjetivo}
            onEliminarObjetivo={handleEliminarObjetivo}
            criterioTemporal={criterioTemporal}
            setCriterioTemporal={setCriterioTemporal}
            onAgregarCriterio={handleAgregarCriterio}
            normaTemporal={normaTemporal}
            setNormaTemporal={setNormaTemporal}
            onAgregarNorma={handleAgregarNorma}
          />
        );
      case 6:
        return <Paso6RecursosProductos formData={formData} onChange={handleChange} />;
      case 7:
        return (
          <Paso7RiesgosControles
            formData={formData}
            onChange={handleChange}
            riesgoTemporal={riesgoTemporal}
            setRiesgoTemporal={setRiesgoTemporal}
            procesoRiesgoTemporal={procesoRiesgoTemporal}
            setProcesoRiesgoTemporal={setProcesoRiesgoTemporal}
            onAgregarRiesgo={handleAgregarRiesgo}
            onEditarRiesgo={handleEditarRiesgo}
            onGuardarRiesgo={handleGuardarRiesgoEditado}
            onEliminarRiesgo={handleEliminarRiesgo}
            editandoRiesgoIndex={editandoRiesgoIndex}
            textoEditadoRiesgo={textoEditadoRiesgo}
            setTextoEditadoRiesgo={setTextoEditadoRiesgo}
            controlTemporal={controlTemporal}
            setControlTemporal={setControlTemporal}
            onAgregarControl={handleAgregarControl}
          />
        );
      case 8:
        return (
          <Paso8Hallazgos
            formData={formData}
            onAgregarHallazgo={handleAgregarHallazgo}
            onEliminarHallazgo={handleEliminarHallazgo}
            onActualizarHallazgo={handleActualizarHallazgo}
            onChange={handleChange}
          />
        );
      case 9:
        return <Paso9VinculacionPlan formData={formData} onChange={handleChange} />;
      default:
        return null;
    }
  };

  const pasos = [
    { numero: 1, titulo: 'Información Básica', icono: <FileText className="w-4 h-4" /> },
    { numero: 2, titulo: 'Clasificación y Alcance', icono: <Building2 className="w-4 h-4" /> },
    { numero: 3, titulo: 'Equipo Auditor', icono: <Users className="w-4 h-4" /> },
    { numero: 4, titulo: 'Programación', icono: <Calendar className="w-4 h-4" /> },
    { numero: 5, titulo: 'Objetivos y Criterios', icono: <Target className="w-4 h-4" /> },
    { numero: 6, titulo: 'Recursos y Productos', icono: <DollarSign className="w-4 h-4" /> },
    { numero: 7, titulo: 'Riesgos y Controles', icono: <Shield className="w-4 h-4" /> },
    { numero: 8, titulo: 'Hallazgos Preliminares', icono: <AlertTriangle className="w-4 h-4" /> },
    { numero: 9, titulo: 'Vinculación Plan', icono: <ClipboardCheck className="w-4 h-4" /> }
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* OVERLAY */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[9999]"
            onClick={onClose}
          />

          {/* MODAL CONTENT */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
          >
            <div
              className="bg-white rounded-lg shadow-2xl w-full h-full max-h-[90vh] flex flex-col max-w-5xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* HEADER */}
              <div className="flex items-start justify-between p-6 border-b border-gray-200">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Shield className="w-6 h-6" style={{ color: '#003DA5' }} />
                    <h2 className="text-2xl font-black" style={{ color: '#003DA5' }}>
                      {mode === 'create' ? 'Nueva Auditoría OCI' : 'Editar Auditoría OCI'}
                    </h2>
                  </div>
                  <p className="text-sm text-gray-600">
                    Formulario Unificado de Control Interno de Gestión - ESAP
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="ml-4"
                  aria-label="Cerrar modal"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* INDICADOR DE PROGRESO */}
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-gray-700">
                    Paso {pasoActual} de {TOTAL_PASOS}
                  </span>
                  <Badge
                    className="bg-blue-100 text-blue-700 border-blue-200"
                    variant="outline"
                  >
                    {Math.round((pasoActual / TOTAL_PASOS) * 100)}% Completado
                  </Badge>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <motion.div
                    className="h-2 rounded-full"
                    style={{ backgroundColor: '#003DA5' }}
                    initial={{ width: 0 }}
                    animate={{ width: `${(pasoActual / TOTAL_PASOS) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>

                {/* Breadcrumb de pasos - Solo móvil */}
                <div className="mt-3 lg:hidden">
                  <p className="text-xs text-gray-600 flex items-center gap-1">
                    {pasos[pasoActual - 1].icono}
                    {pasos[pasoActual - 1].titulo}
                  </p>
                </div>

                {/* Tabs de pasos - Desktop */}
                <div className="hidden lg:flex gap-2 mt-3 overflow-x-auto pb-2">
                  {pasos.map((paso) => (
                    <button
                      key={paso.numero}
                      onClick={() => setPasoActual(paso.numero)}
                      className={`
                        flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium
                        transition-all whitespace-nowrap
                        ${
                          pasoActual === paso.numero
                            ? 'bg-blue-600 text-white'
                            : pasoActual > paso.numero
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }
                      `}
                    >
                      {paso.icono}
                      {paso.titulo}
                    </button>
                  ))}
                </div>
              </div>

              {/* CONTENIDO DEL PASO */}
              <div className="flex-1 overflow-y-auto p-6">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={pasoActual}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    {renderPaso()}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* FOOTER */}
              <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    onClick={handleAnterior}
                    disabled={pasoActual === 1}
                    className="gap-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Anterior
                  </Button>
                  
                  {/* Badge de hallazgos preliminares */}
                  {formData.incluirHallazgosPreliminares && (
                    <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 px-3 py-1.5 text-xs font-bold">
                      <AlertTriangle className="w-3 h-3 mr-1 inline" />
                      {formData.hallazgos.length} Hallazgo{formData.hallazgos.length !== 1 ? 's' : ''} Preliminar{formData.hallazgos.length !== 1 ? 'es' : ''}
                    </Badge>
                  )}
                </div>

                <div className="flex gap-2">
                  {pasoActual < TOTAL_PASOS ? (
                    <Button
                      onClick={handleSiguiente}
                      style={{ background: '#003DA5' }}
                      className="gap-2"
                    >
                      Siguiente
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      style={{ background: '#10B981' }}
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
                          <CheckCircle className="w-4 h-4" />
                          {mode === 'create' ? 'Crear Auditoría' : 'Guardar Cambios'}
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PASO 1: INFORMACIÓN BÁSICA
// ═══════════════════════════════════════════════════════════════════════════

interface PasoProps {
  formData: AuditoriaUnificadaFormData;
  onChange: (field: keyof AuditoriaUnificadaFormData, value: any) => void;
}

interface Paso1Props extends PasoProps {
  procesos: string[];
  cargandoProcesos: boolean;
  busquedaProceso: string;
  setBusquedaProceso: (value: string) => void;
  mostrarSugerenciasProcesos: boolean;
  setMostrarSugerenciasProcesos: (value: boolean) => void;
  evaluaciones: EvaluacionProceso[];
  tiposAuditoria: { id: string; codigo: string; nombre: string; color?: string; descripcion?: string }[];
  cargandoTipos: boolean;
}

function Paso1InformacionBasica({ 
  formData, 
  onChange, 
  procesos, 
  cargandoProcesos,
  busquedaProceso,
  setBusquedaProceso,
  mostrarSugerenciasProcesos,
  setMostrarSugerenciasProcesos,
  evaluaciones,
  tiposAuditoria,
  cargandoTipos
}: Paso1Props) {
  // Filtrar procesos según búsqueda
  const procesosFiltrados = procesos.filter(proceso =>
    proceso.toLowerCase().includes(busquedaProceso.toLowerCase())
  );

  const handleSeleccionarProceso = (proceso: string) => {
    // Guardar en ambos campos: titulo (para BD) y procesoAuditado
    onChange('titulo', proceso);
    onChange('procesoAuditado', proceso);
    setBusquedaProceso(proceso);
    setMostrarSugerenciasProcesos(false);
    
    // 🔍 Buscar la evaluación asociada al proceso seleccionado
    const evaluacionProceso = evaluaciones.find(
      (ev: EvaluacionProceso) => ev.proceso?.nombre === proceso
    );
    
    if (evaluacionProceso && evaluacionProceso.proceso?.evaluacionRiesgo) {
      const riesgo = evaluacionProceso.proceso.evaluacionRiesgo;
      
      // Mapear nivelRiesgo del backend al formato del formulario
      let nivelRiesgoForm: 'Bajo' | 'Medio' | 'Alto' | 'Crítico' = 'Medio';
      if (riesgo.nivelRiesgo) {
        const nivel = riesgo.nivelRiesgo.toLowerCase();
        if (nivel === 'bajo') nivelRiesgoForm = 'Bajo';
        else if (nivel === 'medio') nivelRiesgoForm = 'Medio';
        else if (nivel === 'alto') nivelRiesgoForm = 'Alto';
        else if (nivel === 'critico' || nivel === 'crítico' || nivel === 'extremo') nivelRiesgoForm = 'Crítico';
      }
      
      // Actualizar nivel de riesgo automáticamente
      onChange('nivelRiesgo', nivelRiesgoForm);
      
      // Construir lista de riesgos identificados basados en la evaluación
      const riesgosIdentificadosArr: string[] = [];
      
      if (riesgo.totalRiesgos > 0) {
        riesgosIdentificadosArr.push(`Evaluación DAFP: ${riesgo.totalRiesgos} riesgos totales (${riesgo.riesgosExtremos || 0} Extremos, ${riesgo.riesgosAltos || 0} Altos, ${riesgo.riesgosModerados || 0} Moderados, ${riesgo.riesgosBajos || 0} Bajos)`);
      }

      if (riesgo.riesgoInherente > 6) {
        riesgosIdentificadosArr.push(`Riesgo inherente ALTO (${riesgo.riesgoInherente}/9) - Requiere controles reforzados`);
      }
      
      if (riesgo.riesgoResidual > 4) {
        riesgosIdentificadosArr.push(`Riesgo residual ELEVADO (${riesgo.riesgoResidual}/9) - Los controles actuales son insuficientes`);
      }
      
      if (riesgo.nivelControl < 2) {
        riesgosIdentificadosArr.push(`Controles actuales DÉBILES (nivel ${riesgo.nivelControl}/3) - Se requiere fortalecer el ambiente de control`);
      }
      
      if (riesgo.probabilidad >= 3) {
        riesgosIdentificadosArr.push(`Probabilidad de materialización ALTA (${riesgo.probabilidad}/3) - Se requiere monitoreo continuo`);
      }
      
      if (riesgo.impacto >= 3) {
        riesgosIdentificadosArr.push(`Impacto potencial ALTO (${riesgo.impacto}/3) - Puede afectar significativamente los objetivos institucionales`);
      }
      
      // Agregar información de decisión si existe
      if (riesgo.decisionFinal && riesgo.motivoDecision) {
        riesgosIdentificadosArr.push(`Decisión DAFP: ${riesgo.decisionFinal} - ${riesgo.motivoDecision}`);
      }
      
      // Actualizar riesgos identificados
      if (riesgosIdentificadosArr.length > 0) {
        onChange('riesgosIdentificados', riesgosIdentificadosArr);
      }
      
      // Construir controles a aplicar basados en la evaluación
      const controles: string[] = [];
      
      if (riesgo.nivelControl < 2) {
        controles.push('Implementar mapa de riesgos actualizado del proceso');
        controles.push('Documentar y formalizar controles existentes');
      }
      
      if (riesgo.probabilidad >= 2) {
        controles.push('Establecer indicadores de alerta temprana');
        controles.push('Realizar pruebas de eficacia de controles preventivos');
      }
      
      if (riesgo.impacto >= 3) {
        controles.push('Verificar existencia de planes de contingencia');
        controles.push('Evaluar segregación de funciones y responsabilidades');
      }
      
      controles.push('Revisión documental de políticas y procedimientos');
      controles.push('Entrevistas con responsables del proceso');
      controles.push('Muestreo estadístico de transacciones');
      
      // Actualizar controles a aplicar
      if (controles.length > 0) {
        onChange('controlesAplicar', controles);
      }
      
      console.log('✅ Riesgos y controles cargados automáticamente desde evaluación del proceso');
      console.log(`   - Nivel de riesgo: ${nivelRiesgoForm}`);
      console.log(`   - Riesgos identificados: ${riesgosIdentificadosArr.length}`);
      console.log(`   - Controles a aplicar: ${controles.length}`);
      
      // Notificar al usuario
      toast.success('Riesgos y controles cargados automáticamente', {
        description: `Nivel: ${nivelRiesgoForm} | ${riesgosIdentificadosArr.length} riesgos | ${controles.length} controles`
      });
    }
  };

  const handleChangeBusqueda = (value: string) => {
    setBusquedaProceso(value);
    // Actualizar ambos campos mientras se escribe
    onChange('titulo', value);
    onChange('procesoAuditado', value);
    setMostrarSugerenciasProcesos(true);
  };
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="text-center mb-6">
        <FileText className="w-12 h-12 mx-auto mb-3" style={{ color: '#003DA5' }} />
        <h3 className="text-xl font-black text-gray-900">Información Básica de la Auditoría</h3>
        <p className="text-sm text-gray-600 mt-1">
          Defina el tipo y propósito general de la auditoría
        </p>
      </div>

      <Card className="p-6 border-2 border-gray-200">
        <div className="space-y-4">
          {/* Tipo de Auditoría */}
          <FieldWrapper
            label="Tipo de Auditoría"
            required
            helpText="Seleccione el tipo de auditoría según su naturaleza"
          >
            {cargandoTipos ? (
              <div className="flex items-center gap-2 py-3 text-sm text-gray-500">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full" />
                Cargando tipos de auditoría...
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {(tiposAuditoria.length > 0 ? tiposAuditoria : [
                  { id: 'regular', codigo: 'regular', nombre: 'Regular', color: undefined },
                  { id: 'territorial', codigo: 'territorial', nombre: 'Territorial', color: undefined },
                  { id: 'especial', codigo: 'especial', nombre: 'Especial', color: undefined },
                  { id: 'seguimiento', codigo: 'seguimiento', nombre: 'Seguimiento', color: undefined }
                ]).map(tipo => (
                  <button
                    key={tipo.id}
                    type="button"
                    onClick={() => onChange('tipoAuditoria', tipo.codigo.toLowerCase() as any)}
                    className={`
                      px-4 py-3 rounded-lg border-2 transition-all duration-200
                      flex flex-col items-center justify-center gap-2 font-medium
                      ${
                        formData.tipoAuditoria === tipo.codigo.toLowerCase()
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400'
                      }
                    `}
                  >
                    {tipo.color && (
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: tipo.color }} />
                    )}
                    <span className="text-sm">{tipo.nombre}</span>
                  </button>
                ))}
              </div>
            )}
          </FieldWrapper>

          {/* Información contextual según tipo */}
          {formData.tipoAuditoria === 'especial' && (
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-bold text-amber-900 mb-1">Auditoría Especial</p>
                  <p className="text-amber-700">
                    Las auditorías especiales se realizan por solicitudes específicas, denuncias o necesidades urgentes no contempladas en el Plan Anual. Requieren justificación detallada.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Título de Auditoría - BÚSQUEDA CON AUTOCOMPLETADO */}
          <FieldWrapper 
            label="Título de Auditoría" 
            required
            helpText={
              cargandoProcesos 
                ? "Cargando procesos del Universo de Auditorías..." 
                : `${procesos.length} procesos disponibles - Escribe para buscar`
            }
          >
            <div className="relative">
              <Input
                value={busquedaProceso}
                onChange={(e) => handleChangeBusqueda(e.target.value)}
                onFocus={() => setMostrarSugerenciasProcesos(true)}
                placeholder="Escribe para buscar y seleccionar el proceso a auditar..."
                className="border-gray-300"
                disabled={cargandoProcesos}
                autoComplete="off"
              />
              
              {cargandoProcesos && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full"
                  />
                </div>
              )}

              {/* Lista de sugerencias con información de riesgo */}
              {mostrarSugerenciasProcesos && busquedaProceso && procesosFiltrados.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute z-50 w-full mt-1 bg-white border-2 border-blue-300 rounded-lg shadow-xl max-h-80 overflow-y-auto"
                >
                  {procesosFiltrados.map((proceso, index) => {
                    // Buscar evaluación para mostrar nivel de riesgo
                    const evaluacion = evaluaciones.find(
                      (ev: EvaluacionProceso) => ev.proceso?.nombre === proceso
                    );
                    const nivelRiesgo = evaluacion?.proceso?.evaluacionRiesgo?.nivelRiesgo || 'medio';
                    const riesgoInherente = evaluacion?.proceso?.evaluacionRiesgo?.riesgoInherente || 0;
                    
                    // Colores según nivel de riesgo
                    const colorRiesgo = 
                      nivelRiesgo === 'bajo' ? 'bg-green-100 text-green-700 border-green-300' :
                      nivelRiesgo === 'medio' ? 'bg-yellow-100 text-yellow-700 border-yellow-300' :
                      nivelRiesgo === 'alto' ? 'bg-orange-100 text-orange-700 border-orange-300' :
                      'bg-red-100 text-red-700 border-red-300';
                    
                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleSeleccionarProceso(proceso)}
                        className="w-full px-4 py-3 text-left hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 flex-1">
                            <CheckCircle className="w-4 h-4 text-blue-600 shrink-0" />
                            <span className="text-sm font-medium text-gray-900">{proceso}</span>
                          </div>
                          {evaluacion && (
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-2 py-1 rounded-full border font-bold ${colorRiesgo}`}>
                                {nivelRiesgo.toUpperCase()}
                              </span>
                              {riesgoInherente > 0 && (
                                <span className="text-xs text-gray-500 font-medium">
                                  {riesgoInherente}/9
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </motion.div>
              )}

              {/* Mensaje si no hay resultados */}
              {mostrarSugerenciasProcesos && busquedaProceso && procesosFiltrados.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute z-50 w-full mt-1 bg-white border-2 border-gray-300 rounded-lg shadow-xl p-4 text-center"
                >
                  <p className="text-sm text-gray-600">
                    <AlertCircle className="w-4 h-4 inline mr-2" />
                    No se encontraron procesos que coincidan con "{busquedaProceso}"
                  </p>
                </motion.div>
              )}
            </div>
          
          </FieldWrapper>

          {/* Descripción */}
          <FieldWrapper
            label="Descripción General"
            required
            helpText="Mínimo 20 caracteres - Describa el propósito de la auditoría"
          >
            <textarea
              value={formData.descripcion}
              onChange={(e) => onChange('descripcion', e.target.value)}
              placeholder="Describa brevemente el propósito, justificación y enfoque general de la auditoría..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <div className="text-xs text-gray-500 text-right mt-1">
              {formData.descripcion.length}/500
            </div>
          </FieldWrapper>
        </div>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PASO 2: CLASIFICACIÓN Y ALCANCE
// ═══════════════════════════════════════════════════════════════════════════

interface Paso2Props extends PasoProps {
  evaluaciones: EvaluacionProceso[];
}

function Paso2ClasificacionAlcance({ formData, onChange, evaluaciones }: Paso2Props) {
  // Buscar la evaluación del proceso seleccionado para obtener la dependencia
  const evaluacionProceso = evaluaciones.find(
    (ev: EvaluacionProceso) => ev.proceso?.nombre === formData.titulo || ev.proceso?.nombre === formData.procesoAuditado
  );
  
  const dependenciaProceso = evaluacionProceso?.proceso?.dependencia || 'No especificada';
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="text-center mb-6">
        <Building2 className="w-12 h-12 mx-auto mb-3" style={{ color: '#003DA5' }} />
        <h3 className="text-xl font-black text-gray-900">Clasificación y Alcance</h3>
        <p className="text-sm text-gray-600 mt-1">
          Defina la dependencia, focos de revisión y alcance de la auditoría
        </p>
      </div>

      <Card className="p-6 border-2 border-gray-200">
        <div className="space-y-4">
          {/* Dependencia del Proceso - Se obtiene automáticamente */}
          <FieldWrapper 
            label="Dependencia Responsable" 
            required
            helpText={formData.titulo ? "Obtenida automáticamente del proceso seleccionado" : "Seleccione primero un proceso en el Paso 1"}
          >
            <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700 font-medium">
              {formData.titulo ? (
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <span>{dependenciaProceso}</span>
                </div>
              ) : (
                <span className="text-gray-400">Primero seleccione un proceso en el Paso 1</span>
              )}
            </div>
          </FieldWrapper>

          {/* Foco de la Auditoría */}
          <FieldWrapper 
            label="Foco de la Auditoría"
            helpText="Seleccione los focos de revisión que aplicarán a esta auditoría"
          >
            <div className="relative">
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    const focosActuales = formData.focos || [];
                    if (!focosActuales.includes(e.target.value)) {
                      onChange('focos', [...focosActuales, e.target.value]);
                    }
                  }
                }}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm appearance-none bg-white cursor-pointer"
              >
                <option value="">Agregar un foco de revisión...</option>
                {[
                  { value: 'autoevaluacion_calidad_academica', label: 'Autoevaluación de la Calidad Académica', icon: '🎓' },
                  { value: 'formacion', label: 'Formación (Foco)', icon: '📚' },
                  { value: 'capacitacion', label: 'Capacitación', icon: '🧑‍🏫' },
                  { value: 'proceso_seleccion', label: 'Proceso de Selección', icon: '✅' },
                  { value: 'alto_gobierno', label: 'Fortalecimiento del Alto Gobierno y la Alta Gerencia Pública', icon: '🏛️' },
                  { value: 'gestion_estatal', label: 'Fortalecimiento Integral a la Gestión Estatal', icon: '🏢' },
                  { value: 'investigacion', label: 'Investigación', icon: '🔬' },
                  { value: 'atencion_personas', label: 'Atención a las Personas', icon: '🤝' },
                  { value: 'direccionamiento_estrategico', label: 'Direccionamiento Estratégico', icon: '🎯' },
                  { value: 'gestion_integrada', label: 'Gestión Integrada', icon: '🔗' },
                  { value: 'gestion_documental', label: 'Gestión Documental', icon: '📁' },
                  { value: 'gestion_comunicacion', label: 'Gestión de la Comunicación', icon: '📢' },
                  { value: 'gestion_tecnologica', label: 'Gestión Tecnológica', icon: '💻' },
                  { value: 'gestion_internacional', label: 'Gestión Internacional', icon: '🌐' },
                  { value: 'bienestar_universitario', label: 'Bienestar Universitario', icon: '🏫' },
                  { value: 'gestion_administrativa', label: 'Gestión Administrativa', icon: '⚙️' },
                  { value: 'gestion_financiera', label: 'Gestión Financiera', icon: '💰' },
                  { value: 'gestion_juridica', label: 'Gestión Jurídica', icon: '⚖️' },
                  { value: 'gestion_contratacion', label: 'Gestión de Contratación', icon: '📝' },
                  { value: 'gestion_talento_humano', label: 'Gestión del Talento Humano', icon: '👥' },
                  { value: 'gestion_entornos_virtuales', label: 'Gestión de Entornos Virtuales', icon: '🖥️' },
                  { value: 'control_interno_disciplinario', label: 'Control Interno Disciplinario', icon: '⚠️' },
                  { value: 'territorial_antioquia', label: 'Territorial Antioquia', icon: '📍' },
                  { value: 'territorial_atlantico', label: 'Territorial Atlántico - Cesar - Magdalena - La Guajira', icon: '📍' },
                  { value: 'territorial_bolivar', label: 'Territorial Bolívar - Córdoba - Sucre - San Andrés', icon: '📍' },
                  { value: 'territorial_boyaca', label: 'Territorial Boyacá - Casanare', icon: '📍' },
                  { value: 'territorial_caldas', label: 'Territorial Caldas', icon: '📍' },
                  { value: 'territorial_cauca', label: 'Territorial Cauca', icon: '📍' },
                  { value: 'territorial_choco', label: 'Territorial Chocó', icon: '📍' },
                  { value: 'territorial_cundinamarca', label: 'Territorial Cundinamarca', icon: '📍' },
                  { value: 'territorial_huila', label: 'Territorial Huila - Caquetá - Putumayo', icon: '📍' },
                  { value: 'territorial_meta', label: 'Territorial Meta - Guaviare - Guainía - Vaupés - Vichada - Amazonas', icon: '📍' },
                  { value: 'territorial_narino', label: 'Territorial Nariño - Alto Putumayo', icon: '📍' },
                  { value: 'territorial_norte_santander', label: 'Territorial Norte de Santander - Arauca', icon: '📍' },
                  { value: 'territorial_quindio', label: 'Territorial Quindío - Risaralda', icon: '📍' },
                  { value: 'territorial_santander', label: 'Territorial Santander', icon: '📍' },
                  { value: 'territorial_tolima', label: 'Territorial Tolima', icon: '📍' },
                  { value: 'territorial_valle', label: 'Territorial Valle', icon: '📍' },
                ].filter(o => !(formData.focos || []).includes(o.value)).map(o => (
                  <option key={o.value} value={o.value}>{o.icon}  {o.label}</option>
                ))}
              </select>
              <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 rotate-90 pointer-events-none" />
            </div>

            <AnimatePresence>
              {formData.focos && formData.focos.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="mt-3 flex flex-wrap gap-2"
                >
                  {formData.focos.map((foco) => {
                    const focoConfig: Record<string, { label: string; color: string }> = {
                      autoevaluacion_calidad_academica: { label: 'Autoevaluación Calidad Académica', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
                      formacion: { label: 'Formación (Foco)', color: 'bg-blue-100 text-blue-800 border-blue-300' },
                      capacitacion: { label: 'Capacitación', color: 'bg-amber-100 text-amber-800 border-amber-300' },
                      proceso_seleccion: { label: 'Proceso de Selección', color: 'bg-purple-100 text-purple-800 border-purple-300' },
                      alto_gobierno: { label: 'Alto Gobierno y Alta Gerencia', color: 'bg-rose-100 text-rose-800 border-rose-300' },
                      gestion_estatal: { label: 'Gestión Estatal', color: 'bg-teal-100 text-teal-800 border-teal-300' },
                      investigacion: { label: 'Investigación', color: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
                      atencion_personas: { label: 'Atención a las Personas', color: 'bg-pink-100 text-pink-800 border-pink-300' },
                      direccionamiento_estrategico: { label: 'Direccionamiento Estratégico', color: 'bg-cyan-100 text-cyan-800 border-cyan-300' },
                      gestion_integrada: { label: 'Gestión Integrada', color: 'bg-lime-100 text-lime-800 border-lime-300' },
                      gestion_documental: { label: 'Gestión Documental', color: 'bg-orange-100 text-orange-800 border-orange-300' },
                      gestion_comunicacion: { label: 'Gestión Comunicación', color: 'bg-sky-100 text-sky-800 border-sky-300' },
                      gestion_tecnologica: { label: 'Gestión Tecnológica', color: 'bg-violet-100 text-violet-800 border-violet-300' },
                      gestion_internacional: { label: 'Gestión Internacional', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
                      bienestar_universitario: { label: 'Bienestar Universitario', color: 'bg-blue-100 text-blue-800 border-blue-300' },
                      gestion_administrativa: { label: 'Gestión Administrativa', color: 'bg-amber-100 text-amber-800 border-amber-300' },
                      gestion_financiera: { label: 'Gestión Financiera', color: 'bg-green-100 text-green-800 border-green-300' },
                      gestion_juridica: { label: 'Gestión Jurídica', color: 'bg-purple-100 text-purple-800 border-purple-300' },
                      gestion_contratacion: { label: 'Gestión Contratación', color: 'bg-rose-100 text-rose-800 border-rose-300' },
                      gestion_talento_humano: { label: 'Gestión Talento Humano', color: 'bg-teal-100 text-teal-800 border-teal-300' },
                      gestion_entornos_virtuales: { label: 'Entornos Virtuales', color: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
                      control_interno_disciplinario: { label: 'Control Interno Disciplinario', color: 'bg-red-100 text-red-800 border-red-300' },
                      territorial_antioquia: { label: 'Territorial Antioquia', color: 'bg-slate-100 text-slate-800 border-slate-300' },
                      territorial_atlantico: { label: 'Territorial Atlántico', color: 'bg-slate-100 text-slate-800 border-slate-300' },
                      territorial_bolivar: { label: 'Territorial Bolívar', color: 'bg-slate-100 text-slate-800 border-slate-300' },
                      territorial_boyaca: { label: 'Territorial Boyacá', color: 'bg-slate-100 text-slate-800 border-slate-300' },
                      territorial_caldas: { label: 'Territorial Caldas', color: 'bg-slate-100 text-slate-800 border-slate-300' },
                      territorial_cauca: { label: 'Territorial Cauca', color: 'bg-slate-100 text-slate-800 border-slate-300' },
                      territorial_choco: { label: 'Territorial Chocó', color: 'bg-slate-100 text-slate-800 border-slate-300' },
                      territorial_cundinamarca: { label: 'Territorial Cundinamarca', color: 'bg-slate-100 text-slate-800 border-slate-300' },
                      territorial_huila: { label: 'Territorial Huila', color: 'bg-slate-100 text-slate-800 border-slate-300' },
                      territorial_meta: { label: 'Territorial Meta', color: 'bg-slate-100 text-slate-800 border-slate-300' },
                      territorial_narino: { label: 'Territorial Nariño', color: 'bg-slate-100 text-slate-800 border-slate-300' },
                      territorial_norte_santander: { label: 'Territorial Norte de Santander', color: 'bg-slate-100 text-slate-800 border-slate-300' },
                      territorial_quindio: { label: 'Territorial Quindío', color: 'bg-slate-100 text-slate-800 border-slate-300' },
                      territorial_santander: { label: 'Territorial Santander', color: 'bg-slate-100 text-slate-800 border-slate-300' },
                      territorial_tolima: { label: 'Territorial Tolima', color: 'bg-slate-100 text-slate-800 border-slate-300' },
                      territorial_valle: { label: 'Territorial Valle', color: 'bg-slate-100 text-slate-800 border-slate-300' },
                    };
                    const config = focoConfig[foco] || { label: foco, color: 'bg-gray-100 text-gray-800 border-gray-300' };

                    return (
                      <motion.span
                        key={foco}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold ${config.color}`}
                      >
                        {config.label}
                        <button
                          type="button"
                          onClick={() => onChange('focos', formData.focos!.filter(f => f !== foco))}
                          className="ml-0.5 hover:opacity-70 transition-opacity rounded-full"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </motion.span>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>

            {(formData.focos || []).length === 5 && (
              <p className="text-xs text-green-600 font-medium flex items-center gap-1 mt-2">
                <CheckCircle className="w-3 h-3" />
                Todos los focos seleccionados
              </p>
            )}
          </FieldWrapper>

          {/* Alcance */}
          <FieldWrapper
            label="Alcance Detallado"
            required
            helpText="Describa específicamente qué aspectos serán evaluados"
          >
            <textarea
              value={formData.alcance}
              onChange={(e) => onChange('alcance', e.target.value)}
              placeholder="Defina el alcance: áreas incluidas, periodo de evaluación, documentos a revisar, actividades a verificar..."
              rows={5}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </FieldWrapper>
        </div>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PASO 3: EQUIPO AUDITOR
// ═══════════════════════════════════════════════════════════════════════════

interface Paso3Props extends PasoProps {
  auditores: AuditorOption[];
}

function Paso3EquipoAuditor({ formData, onChange, auditores }: Paso3Props) {
  const handleToggleAuditor = (auditorId: string) => {
    const existe = formData.equipoAuditores.includes(auditorId);
    if (existe) {
      onChange('equipoAuditores', formData.equipoAuditores.filter(id => id !== auditorId));
    } else {
      onChange('equipoAuditores', [...formData.equipoAuditores, auditorId]);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="text-center mb-6">
        <Users className="w-12 h-12 mx-auto mb-3" style={{ color: '#003DA5' }} />
        <h3 className="text-xl font-black text-gray-900">Equipo Auditor</h3>
        <p className="text-sm text-gray-600 mt-1">
          Asigne el equipo responsable de ejecutar la auditoría
        </p>
      </div>

      <Card className="p-6 border-2 border-gray-200">
        <div className="space-y-4">
          {/* Jefe OCI / Supervisor - PRIMERO */}
          <FieldWrapper label="Jefe OCI / Supervisor" required>
            <select
              value={formData.supervisorAsignado}
              onChange={(e) => onChange('supervisorAsignado', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccione el jefe OCI / supervisor...</option>
              {auditores
                .filter(a => REGLAS_NEGOCIO_OCIG.ROLES_RESPONSABLES_PLAN_ANUAL.esJefeOCISupervisor(a.cargo))
                .map(auditor => (
                <option key={auditor.id} value={auditor.id}>
                  {auditor.nombre}
                </option>
              ))}
            </select>
          </FieldWrapper>

          {/* Auditor Líder - SEGUNDO */}
          <FieldWrapper label="Auditor Líder" required>
            <select
              value={formData.auditorLider}
              onChange={(e) => onChange('auditorLider', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccione el auditor líder...</option>
              {auditores
                .filter(a => a.id !== formData.supervisorAsignado && REGLAS_NEGOCIO_OCIG.ROLES_RESPONSABLES_PLAN_ANUAL.esAuditorLider(a.cargo))
                .map(auditor => (
                <option key={auditor.id} value={auditor.id}>
                  {auditor.nombre}
                </option>
              ))}
            </select>
          </FieldWrapper>

          {/* Auditor Asignado - NUEVO */}
          <FieldWrapper label="Auditor Asignado" required helpText="Persona encargada de la ejecución técnica de la auditoría">
            <select
              value={formData.auditorAsignado}
              onChange={(e) => onChange('auditorAsignado', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccione el auditor asignado...</option>
              {auditores
                .filter(a => a.id !== formData.supervisorAsignado && REGLAS_NEGOCIO_OCIG.ROLES_RESPONSABLES_PLAN_ANUAL.esEquipoAuditor(a.cargo))
                .map(auditor => (
                <option key={auditor.id} value={auditor.id}>
                  {auditor.nombre}
                </option>
              ))}
            </select>
          </FieldWrapper>

          {/* Equipo Adicional - TERCERO */}
          <FieldWrapper
            label="Equipo Auditor Adicional (Opcional)"
            helpText="Seleccione otros auditores que participarán"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {auditores.filter(a =>
                a.id !== formData.supervisorAsignado &&
                a.id !== formData.auditorLider &&
                a.id !== formData.auditorAsignado &&
                REGLAS_NEGOCIO_OCIG.ROLES_RESPONSABLES_PLAN_ANUAL.esEquipoAuditor(a.cargo)
              ).map(auditor => (
                <button
                  key={auditor.id}
                  type="button"
                  onClick={() => handleToggleAuditor(auditor.id)}
                  className={`
                    p-3 rounded-lg border-2 transition-all text-left
                    ${
                      formData.equipoAuditores.includes(auditor.id)
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-300 hover:border-blue-400'
                    }
                  `}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`
                        w-5 h-5 rounded border-2 flex items-center justify-center
                        ${
                          formData.equipoAuditores.includes(auditor.id)
                            ? 'border-blue-600 bg-blue-600'
                            : 'border-gray-400'
                        }
                      `}
                    >
                      {formData.equipoAuditores.includes(auditor.id) && (
                        <CheckSquare className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-900">{auditor.nombre}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            {formData.equipoAuditores.length > 0 && (
              <p className="text-xs text-blue-600 mt-2">
                {formData.equipoAuditores.length} auditor(es) adicional(es) seleccionado(s)
              </p>
            )}
          </FieldWrapper>
        </div>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PASO 4: PROGRAMACIÓN - 3 ETAPAS CON FECHAS ESPECÍFICAS
// ═══════════════════════════════════════════════════════════════════════════

function Paso4Programacion({ formData, onChange }: PasoProps) {
  // Verificar si las etapas anteriores están completas (convertir a boolean)
  const planeacionCompleta = !!(formData.fechaInicioPlaneacion && formData.fechaFinPlaneacion);
  const ejecucionCompleta = !!(formData.fechaInicioEjecucion && formData.fechaFinEjecucion);

  // Calcular días de cada etapa
  const calcularDias = (inicio: string, fin: string) => {
    if (!inicio || !fin) return 0;
    return Math.ceil((new Date(fin).getTime() - new Date(inicio).getTime()) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="text-center mb-6">
        <Calendar className="w-12 h-12 mx-auto mb-3" style={{ color: '#003DA5' }} />
        <h3 className="text-xl font-black text-gray-900">Cronograma de Auditoría</h3>
        <p className="text-sm text-gray-600 mt-1">
          Defina las fechas específicas para cada etapa. El sistema calcula automáticamente el ciclo estándar de 13 semanas (4-4-5).
        </p>
      </div>

      {/* Info Ciclo Estándar */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <Zap className="w-5 h-5 text-blue-600" />
          <h4 className="font-black text-blue-900 uppercase text-sm tracking-tight">Modelo de Ciclo de Vida OCI (13 Semanas)</h4>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white p-3 rounded-lg border border-blue-200">
            <p className="text-[10px] font-black text-blue-600 uppercase">Planeación</p>
            <p className="text-xs font-bold text-gray-800">4 Semanas</p>
          </div>
          <div className="bg-white p-3 rounded-lg border border-amber-200">
            <p className="text-[10px] font-black text-amber-600 uppercase">Ejecución</p>
            <p className="text-xs font-bold text-gray-800">4 Semanas</p>
          </div>
          <div className="bg-white p-3 rounded-lg border border-emerald-200">
            <p className="text-[10px] font-black text-emerald-600 uppercase">Comunicación</p>
            <p className="text-xs font-bold text-gray-800">5 Semanas</p>
          </div>
        </div>
      </div>

      {/* ETAPA 1: PLANEACIÓN - Siempre habilitada */}
      <Card className="p-6 border-2 border-blue-200 bg-blue-50/30">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">1</div>
          <div>
            <h4 className="font-bold text-gray-900">Etapa de Planeación</h4>
            <p className="text-xs text-gray-600">Fase inicial de preparación de la auditoría</p>
          </div>
          {planeacionCompleta && (
            <Badge className="ml-auto bg-green-100 text-green-700 border-green-300">
              <CheckCircle className="w-3 h-3 mr-1" />
              Completa
            </Badge>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FieldWrapper 
            label="Fecha de Inicio" 
            required
            helpText="Inicio de la etapa de Planeación"
          >
            <Input
              type="date"
              value={formData.fechaInicioPlaneacion || ''}
              onChange={(e) => {
                onChange('fechaInicioPlaneacion', e.target.value);
                // También actualizar fechaInicio para compatibilidad
                onChange('fechaInicio', e.target.value);
              }}
              className="border-gray-300"
            />
          </FieldWrapper>

          <FieldWrapper 
            label="Fecha de Fin" 
            required
            helpText="Finalización de la etapa de Planeación"
          >
            <Input
              type="date"
              value={formData.fechaFinPlaneacion || ''}
              onChange={(e) => onChange('fechaFinPlaneacion', e.target.value)}
              className="border-gray-300"
              min={formData.fechaInicioPlaneacion || undefined}
            />
          </FieldWrapper>
        </div>

        {planeacionCompleta && (
          <div className="mt-3 p-2 bg-blue-100 rounded text-sm text-blue-700">
            <strong>Duración:</strong> {calcularDias(formData.fechaInicioPlaneacion!, formData.fechaFinPlaneacion!)} días
          </div>
        )}
      </Card>

      {/* ETAPA 2: EJECUCIÓN - Se habilita al completar Planeación */}
      <Card className={`p-6 border-2 ${planeacionCompleta ? 'border-amber-200 bg-amber-50/30' : 'border-gray-200 bg-gray-50 opacity-60'}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-8 h-8 rounded-full ${planeacionCompleta ? 'bg-amber-600' : 'bg-gray-400'} text-white flex items-center justify-center font-bold text-sm`}>2</div>
          <div>
            <h4 className="font-bold text-gray-900">Etapa de Ejecución</h4>
            <p className="text-xs text-gray-600">Trabajo de campo y desarrollo de la auditoría</p>
          </div>
          {!planeacionCompleta && (
            <Badge className="ml-auto bg-gray-100 text-gray-600 border-gray-300">
              <AlertCircle className="w-3 h-3 mr-1" />
              Complete la etapa de Planeación primero
            </Badge>
          )}
          {ejecucionCompleta && (
            <Badge className="ml-auto bg-green-100 text-green-700 border-green-300">
              <CheckCircle className="w-3 h-3 mr-1" />
              Completa
            </Badge>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FieldWrapper 
            label="Fecha de Inicio" 
            required={planeacionCompleta}
            helpText="Inicio de la etapa de Ejecución"
          >
            <Input
              type="date"
              value={formData.fechaInicioEjecucion || ''}
              onChange={(e) => onChange('fechaInicioEjecucion', e.target.value)}
              className="border-gray-300"
              disabled={!planeacionCompleta}
              min={formData.fechaFinPlaneacion || undefined}
            />
          </FieldWrapper>

          <FieldWrapper 
            label="Fecha de Fin" 
            required={planeacionCompleta}
            helpText="Finalización de la etapa de Ejecución"
          >
            <Input
              type="date"
              value={formData.fechaFinEjecucion || ''}
              onChange={(e) => onChange('fechaFinEjecucion', e.target.value)}
              className="border-gray-300"
              disabled={!planeacionCompleta}
              min={formData.fechaInicioEjecucion || formData.fechaFinPlaneacion || undefined}
            />
          </FieldWrapper>
        </div>

        {ejecucionCompleta && (
          <div className="mt-3 p-2 bg-amber-100 rounded text-sm text-amber-700">
            <strong>Duración:</strong> {calcularDias(formData.fechaInicioEjecucion!, formData.fechaFinEjecucion!)} días
          </div>
        )}
      </Card>

      {/* ETAPA 3: COMUNICACIÓN - Se habilita al completar Ejecución */}
      <Card className={`p-6 border-2 ${ejecucionCompleta ? 'border-green-200 bg-green-50/30' : 'border-gray-200 bg-gray-50 opacity-60'}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-8 h-8 rounded-full ${ejecucionCompleta ? 'bg-green-600' : 'bg-gray-400'} text-white flex items-center justify-center font-bold text-sm`}>3</div>
          <div>
            <h4 className="font-bold text-gray-900">Etapa de Comunicación</h4>
            <p className="text-xs text-gray-600">Elaboración y entrega del informe final</p>
          </div>
          {!ejecucionCompleta && (
            <Badge className="ml-auto bg-gray-100 text-gray-600 border-gray-300">
              <AlertCircle className="w-3 h-3 mr-1" />
              Complete la etapa de Ejecución primero
            </Badge>
          )}
          {formData.fechaInicioComunicacion && formData.fechaFinComunicacion && (
            <Badge className="ml-auto bg-green-100 text-green-700 border-green-300">
              <CheckCircle className="w-3 h-3 mr-1" />
              Completa
            </Badge>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FieldWrapper 
            label="Fecha de Inicio" 
            required={ejecucionCompleta}
            helpText="Inicio de la etapa de Comunicación"
          >
            <Input
              type="date"
              value={formData.fechaInicioComunicacion || ''}
              onChange={(e) => onChange('fechaInicioComunicacion', e.target.value)}
              className="border-gray-300"
              disabled={!ejecucionCompleta}
              min={formData.fechaFinEjecucion || undefined}
            />
          </FieldWrapper>

          <FieldWrapper 
            label="Fecha de Fin" 
            required={ejecucionCompleta}
            helpText="Finalización de la auditoría"
          >
            <Input
              type="date"
              value={formData.fechaFinComunicacion || ''}
              onChange={(e) => {
                onChange('fechaFinComunicacion', e.target.value);
                // También actualizar fechaFin para compatibilidad
                onChange('fechaFin', e.target.value);
              }}
              className="border-gray-300"
              disabled={!ejecucionCompleta}
              min={formData.fechaInicioComunicacion || formData.fechaFinEjecucion || undefined}
            />
          </FieldWrapper>
        </div>

        {formData.fechaInicioComunicacion && formData.fechaFinComunicacion && (
          <div className="mt-3 p-2 bg-green-100 rounded text-sm text-green-700">
            <strong>Duración:</strong> {calcularDias(formData.fechaInicioComunicacion, formData.fechaFinComunicacion)} días
          </div>
        )}
      </Card>

      {/* Resumen de duración total */}
      {formData.fechaInicioPlaneacion && formData.fechaFinComunicacion && (
        <Card className="p-4 border-2 border-blue-300 bg-blue-50">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <h4 className="font-bold text-blue-800">Resumen del Cronograma</h4>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Duración Total</p>
              <p className="font-bold text-blue-700">
                {calcularDias(formData.fechaInicioPlaneacion, formData.fechaFinComunicacion)} días
              </p>
            </div>
            {planeacionCompleta && (
              <div>
                <p className="text-gray-600">Planeación</p>
                <p className="font-bold text-blue-600">
                  {calcularDias(formData.fechaInicioPlaneacion!, formData.fechaFinPlaneacion!)} días
                </p>
              </div>
            )}
            {ejecucionCompleta && (
              <div>
                <p className="text-gray-600">Ejecución</p>
                <p className="font-bold text-amber-600">
                  {calcularDias(formData.fechaInicioEjecucion!, formData.fechaFinEjecucion!)} días
                </p>
              </div>
            )}
            {formData.fechaInicioComunicacion && formData.fechaFinComunicacion && (
              <div>
                <p className="text-gray-600">Comunicación</p>
                <p className="font-bold text-green-600">
                  {calcularDias(formData.fechaInicioComunicacion!, formData.fechaFinComunicacion!)} días
                </p>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PASO 5: OBJETIVOS Y CRITERIOS
// ═══════════════════════════════════════════════════════════════════════════

interface Paso5Props extends PasoProps {
  objetivoTemporal: string;
  setObjetivoTemporal: (value: string) => void;
  onAgregarObjetivo: () => void;
  onEliminarObjetivo: (index: number) => void;
  criterioTemporal: string;
  setCriterioTemporal: (value: string) => void;
  onAgregarCriterio: () => void;
  normaTemporal: string;
  setNormaTemporal: (value: string) => void;
  onAgregarNorma: () => void;
}

function Paso5ObjetivosCriterios({
  formData,
  onChange,
  objetivoTemporal,
  setObjetivoTemporal,
  onAgregarObjetivo,
  onEliminarObjetivo,
  criterioTemporal,
  setCriterioTemporal,
  onAgregarCriterio,
  normaTemporal,
  setNormaTemporal,
  onAgregarNorma
}: Paso5Props) {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="text-center mb-6">
        <Target className="w-12 h-12 mx-auto mb-3" style={{ color: '#003DA5' }} />
        <h3 className="text-xl font-black text-gray-900">Objetivos y Criterios</h3>
        <p className="text-sm text-gray-600 mt-1">
          Defina qué se evaluará y bajo qué parámetros
        </p>
      </div>

      <Card className="p-6 border-2 border-gray-200">
        <div className="space-y-6">
          {/* Objetivos */}
          <div>
            <h4 className="font-bold text-gray-900 mb-3">Objetivos de la Auditoría *</h4>
            
            {formData.objetivos.length > 0 && (
              <div className="space-y-2 mb-3">
                {formData.objetivos.map((objetivo, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 p-3 bg-green-50 rounded-lg border border-green-200"
                  >
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700 flex-1">{objetivo}</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onEliminarObjetivo(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Input
                value={objetivoTemporal}
                onChange={(e) => setObjetivoTemporal(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    onAgregarObjetivo();
                  }
                }}
                placeholder="Escriba un objetivo (mín. 10 caracteres)"
                className="flex-1"
              />
              <Button
                type="button"
                onClick={onAgregarObjetivo}
                disabled={objetivoTemporal.trim().length < 10}
                style={{ backgroundColor: '#003DA5' }}
              >
                <Plus className="w-4 h-4 mr-1" />
                Agregar
              </Button>
            </div>
          </div>

          {/* Criterios de Auditoría */}
          <div>
            <h4 className="font-bold text-gray-900 mb-3">Criterios de Auditoría</h4>
            
            {formData.criteriosAuditoria.length > 0 && (
              <div className="space-y-2 mb-3">
                {formData.criteriosAuditoria.map((criterio, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200"
                  >
                    <CheckSquare className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700 flex-1">{criterio}</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        onChange(
                          'criteriosAuditoria',
                          formData.criteriosAuditoria.filter((_, i) => i !== index)
                        );
                      }}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Input
                value={criterioTemporal}
                onChange={(e) => setCriterioTemporal(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    onAgregarCriterio();
                  }
                }}
                placeholder="Ej: Cumplimiento de procedimientos internos"
                className="flex-1"
              />
              <Button
                type="button"
                onClick={onAgregarCriterio}
                disabled={criterioTemporal.trim().length < 5}
                style={{ backgroundColor: '#003DA5' }}
              >
                <Plus className="w-4 h-4 mr-1" />
                Agregar
              </Button>
            </div>
          </div>

          {/* Normatividad Aplicable */}
          <div>
            <h4 className="font-bold text-gray-900 mb-3">Normatividad Aplicable</h4>
            
            {formData.normatividadAplicable.length > 0 && (
              <div className="space-y-2 mb-3">
                {formData.normatividadAplicable.map((norma, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 p-3 bg-purple-50 rounded-lg border border-purple-200"
                  >
                    <BookOpen className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700 flex-1">{norma}</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        onChange(
                          'normatividadAplicable',
                          formData.normatividadAplicable.filter((_, i) => i !== index)
                        );
                      }}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Input
                value={normaTemporal}
                onChange={(e) => setNormaTemporal(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    onAgregarNorma();
                  }
                }}
                placeholder="Ej: Decreto 648 de 2017 - Modelo Estándar de Control Interno MECI"
                className="flex-1"
              />
              <Button
                type="button"
                onClick={onAgregarNorma}
                disabled={normaTemporal.trim().length < 5}
                style={{ backgroundColor: '#003DA5' }}
              >
                <Plus className="w-4 h-4 mr-1" />
                Agregar
              </Button>
            </div>
          </div>

          {/* Metodología */}
          <FieldWrapper
            label="Metodología de Auditoría"
            helpText="Describa el enfoque y técnicas que se utilizarán"
          >
            <textarea
              value={formData.metodologia}
              onChange={(e) => onChange('metodologia', e.target.value)}
              placeholder="Ej: Enfoque basado en riesgos, entrevistas a responsables, revisión documental, pruebas de cumplimiento..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </FieldWrapper>
        </div>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PASO 6: RECURSOS Y PRODUCTOS
// ═══════════════════════════════════════════════════════════════════════════

function Paso6RecursosProductos({ formData, onChange }: PasoProps) {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="text-center mb-6">
        <DollarSign className="w-12 h-12 mx-auto mb-3" style={{ color: '#003DA5' }} />
        <h3 className="text-xl font-black text-gray-900">Recursos y Productos Esperados</h3>
        <p className="text-sm text-gray-600 mt-1">
          Especifique los recursos necesarios y entregables
        </p>
      </div>

      <Card className="p-6 border-2 border-gray-200">
        <div className="space-y-4">
          {/* Presupuesto Estimado */}
          <FieldWrapper
            label="Presupuesto Estimado (Opcional)"
            helpText="Costo aproximado de la auditoría"
          >
            <Input
              type="text"
              value={formData.presupuestoEstimado}
              onChange={(e) => onChange('presupuestoEstimado', e.target.value)}
              placeholder="Ej: $5,000,000 COP"
              className="border-gray-300"
            />
          </FieldWrapper>

          {/* Productos Esperados Info */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-700">
              <strong>Productos esperados típicos:</strong> Informe de auditoría, matriz de hallazgos,
              plan de mejoramiento, acta de cierre, evidencias documentales
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PASO 7: RIESGOS Y CONTROLES
// ═══════════════════════════════════════════════════════════════════════════

interface Paso7Props extends PasoProps {
  riesgoTemporal: string;
  setRiesgoTemporal: (value: string) => void;
  procesoRiesgoTemporal: string;
  setProcesoRiesgoTemporal: (value: string) => void;
  onAgregarRiesgo: () => void;
  onEditarRiesgo: (index: number) => void;
  onGuardarRiesgo: (index: number) => void;
  onEliminarRiesgo: (index: number) => void;
  editandoRiesgoIndex: number | null;
  textoEditadoRiesgo: string;
  setTextoEditadoRiesgo: (value: string) => void;
  controlTemporal: string;
  setControlTemporal: (value: string) => void;
  onAgregarControl: () => void;
}

function Paso7RiesgosControles({
  formData,
  onChange,
  riesgoTemporal,
  setRiesgoTemporal,
  procesoRiesgoTemporal,
  setProcesoRiesgoTemporal,
  onAgregarRiesgo,
  onEditarRiesgo,
  onGuardarRiesgo,
  onEliminarRiesgo,
  editandoRiesgoIndex,
  textoEditadoRiesgo,
  setTextoEditadoRiesgo,
  controlTemporal,
  setControlTemporal,
  onAgregarControl
}: Paso7Props) {
  const [editandoControl, setEditandoControl] = useState<number | null>(null);
  const [textoEditadoControl, setTextoEditadoControl] = useState('');

  const handleEditarControl = (index: number) => {
    setEditandoControl(index);
    setTextoEditadoControl(formData.controlesAplicar[index]);
  };

  const handleGuardarControl = (index: number) => {
    if (textoEditadoControl.trim().length >= 10) {
      const nuevosControles = [...formData.controlesAplicar];
      nuevosControles[index] = textoEditadoControl.trim();
      onChange('controlesAplicar', nuevosControles);
      setEditandoControl(null);
      setTextoEditadoControl('');
    }
  };

  const handleCancelarControl = () => {
    setEditandoControl(null);
    setTextoEditadoControl('');
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="text-center mb-6">
        <Shield className="w-12 h-12 mx-auto mb-3" style={{ color: '#003DA5' }} />
        <h3 className="text-xl font-black text-gray-900">Riesgos y Controles</h3>
        <p className="text-sm text-gray-600 mt-1">
          Identifique riesgos y controles asociados a la auditoría
        </p>
      </div>

      <Card className="p-6 border-2 border-gray-200">
        <div className="space-y-6">
          {/* Nivel de Riesgo */}
          <FieldWrapper label="Nivel de Riesgo Institucional" required>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(['Bajo', 'Medio', 'Alto', 'Crítico'] as const).map(nivel => (
                <button
                  key={nivel}
                  type="button"
                  onClick={() => onChange('nivelRiesgo', nivel)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    formData.nivelRiesgo === nivel
                      ? nivel === 'Crítico'
                        ? 'border-red-700 bg-red-100'
                        : nivel === 'Alto'
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
                        formData.nivelRiesgo === nivel
                          ? nivel === 'Crítico'
                            ? 'bg-red-700'
                            : nivel === 'Alto'
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

          {/* Riesgos Identificados Asociados al Proceso */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-gray-900">Riesgos Asociados al Proceso *</h4>
              <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                Mandatorio para Informe Preliminar
              </Badge>
            </div>
            
            {formData.riesgosIdentificados.length > 0 && (
              <div className="space-y-2 mb-4">
                {formData.riesgosIdentificados.map((riesgo, index) => (
                  <div
                    key={index}
                    className="flex flex-col gap-2 p-3 bg-red-50 rounded-lg border border-red-200"
                  >
                    <div className="flex items-start gap-2">
                       <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                       
                       {editandoRiesgoIndex === index ? (
                         <div className="flex-1 space-y-3">
                            <textarea
                              value={textoEditadoRiesgo}
                              onChange={e => setTextoEditadoRiesgo(e.target.value)}
                              className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 text-sm"
                              rows={3}
                              placeholder="Descripción del riesgo"
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => onGuardarRiesgo(index)}
                                disabled={textoEditadoRiesgo.trim().length < 5}
                                className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                Guardar
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => onEditarRiesgo(-1)}
                              >
                                Cancelar
                              </Button>
                            </div>
                         </div>
                       ) : (
                         <>
                            <div className="flex-1">
                               <p className="text-sm text-gray-700 leading-relaxed font-medium">
                                 {riesgo}
                               </p>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => onEditarRiesgo(index)}
                                className="text-blue-600 hover:bg-blue-100"
                              >
                                <Settings className="w-4 h-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => onEliminarRiesgo(index)}
                                className="text-red-600 hover:bg-red-100"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                         </>
                       )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-gray-50 p-4 rounded-xl border-2 border-dashed border-gray-300 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-1">
                  <Input
                    value={procesoRiesgoTemporal}
                    onChange={(e) => setProcesoRiesgoTemporal(e.target.value)}
                    placeholder="Proceso/Momento (Ej: Contratación)"
                    className="border-gray-300 bg-white"
                  />
                </div>
                <div className="md:col-span-2">
                  <Input
                    value={riesgoTemporal}
                    onChange={(e) => setRiesgoTemporal(e.target.value)}
                    placeholder="Descripción del riesgo (mín. 5 caracteres)"
                    className="border-gray-300 bg-white"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={onAgregarRiesgo}
                  disabled={riesgoTemporal.trim().length < 5}
                  className="bg-red-600 hover:bg-red-700 text-white shadow-md"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Agregar Riesgo
                </Button>
              </div>
            </div>
            <p className="text-[10px] text-gray-500 mt-2 italic px-1">
              * Estos riesgos se verán reflejados en el Informe Preliminar de Auditoría.
            </p>
          </div>

          {/* Controles a Aplicar */}
          <div>
            <h4 className="font-bold text-gray-900 mb-3">Controles a Aplicar</h4>
            
            {formData.controlesAplicar.length > 0 && (
              <div className="space-y-2 mb-3">
                {formData.controlesAplicar.map((control, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 p-3 bg-green-50 rounded-lg border border-green-200"
                  >
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    
                    {editandoControl === index ? (
                      // MODO EDICIÓN
                      <div className="flex-1 space-y-2">
                        <textarea
                          value={textoEditadoControl}
                          onChange={(e) => setTextoEditadoControl(e.target.value)}
                          className="w-full px-3 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                          rows={3}
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleGuardarControl(index)}
                            disabled={textoEditadoControl.trim().length < 10}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Guardar
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={handleCancelarControl}
                            className="text-gray-600"
                          >
                            <X className="w-3 h-3 mr-1" />
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // MODO VISTA
                      <>
                        <p className="text-sm text-gray-700 flex-1">{control}</p>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditarControl(index)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            title="Editar control"
                          >
                            <Settings className="w-4 h-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              onChange(
                                'controlesAplicar',
                                formData.controlesAplicar.filter((_, i) => i !== index)
                              );
                            }}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Eliminar control"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Input
                value={controlTemporal}
                onChange={(e) => setControlTemporal(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    onAgregarControl();
                  }
                }}
                placeholder="Ej: Verificación cruzada de documentos con múltiples fuentes"
                className="flex-1"
              />
              <Button
                type="button"
                onClick={onAgregarControl}
                disabled={controlTemporal.trim().length < 10}
                style={{ backgroundColor: '#10B981' }}
              >
                <Plus className="w-4 h-4 mr-1" />
                Agregar
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PASO 8: HALLAZGOS
// ═══════════════════════════════════════════════════════════════════════════

interface Paso8Props {
  formData: AuditoriaUnificadaFormData;
  onAgregarHallazgo: () => void;
  onEliminarHallazgo: (id: string) => void;
  onActualizarHallazgo: (id: string, campo: keyof Hallazgo, valor: any) => void;
  onChange: (field: keyof AuditoriaUnificadaFormData, value: any) => void;
}

function Paso8Hallazgos({
  formData,
  onAgregarHallazgo,
  onEliminarHallazgo,
  onActualizarHallazgo,
  onChange
}: Paso8Props) {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="text-center mb-6">
        <AlertTriangle className="w-12 h-12 mx-auto mb-3" style={{ color: '#EF4444' }} />
        <h3 className="text-xl font-black text-gray-900">Hallazgos Identificados</h3>
        <p className="text-sm text-gray-600 mt-1">
          Sección opcional - Agregue hallazgos si la auditoría ya está en ejecución
        </p>
      </div>

      {/* ✅ CHECKBOX PARA INCLUIR HALLAZGOS PRELIMINARES */}
      <Card className="p-6 border-2 border-blue-200 bg-blue-50">
        <div className="flex items-start gap-4">
          <input
            type="checkbox"
            id="incluirHallazgosPreliminares"
            checked={formData.incluirHallazgosPreliminares}
            onChange={(e) => onChange('incluirHallazgosPreliminares', e.target.checked)}
            className="w-5 h-5 mt-1 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex-1">
            <label htmlFor="incluirHallazgosPreliminares" className="font-bold text-blue-900 cursor-pointer">
              ✍️ Incluir hallazgos preliminares identificados durante la auditoría
            </label>
            <p className="text-sm text-blue-800 mt-2">
              <strong>Nota:</strong> Los hallazgos incluidos aquí tienen carácter{' '}
              <span className="font-bold underline">PRELIMINAR</span> y están sujetos a validación,
              verificación y comunicación formal al auditado antes de ser considerados definitivos.
            </p>
          </div>
        </div>
      </Card>

      {/* BANNER DE HALLAZGOS PRELIMINARES */}
      {formData.incluirHallazgosPreliminares && (
        <div className="p-4 bg-yellow-50 rounded-lg border-2 border-yellow-400">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-700 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-yellow-900">
                ⚠️ HALLAZGOS PRELIMINARES
              </p>
              <p className="text-sm text-yellow-800 mt-1">
                Los hallazgos registrados a continuación tienen carácter <strong>preliminar</strong>.
                Deben ser comunicados al auditado para el derecho de contradicción antes de su
                formalización en el informe final de auditoría.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SECCIÓN DE HALLAZGOS (solo visible si el checkbox está activado) */}
      {formData.incluirHallazgosPreliminares && (
        <>
          {formData.hallazgos.length === 0 ? (
            <Card className="p-8 text-center border-2 border-dashed border-gray-300">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="text-gray-600 mb-4">No hay hallazgos preliminares registrados</p>
              <Button
                type="button"
                onClick={onAgregarHallazgo}
                style={{ background: '#EF4444' }}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Agregar Primer Hallazgo Preliminar
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {formData.hallazgos.map((hallazgo, index) => (
                <Card key={hallazgo.id} className="p-6 border-2 border-yellow-300 bg-yellow-50/30">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <h4 className="font-bold text-gray-900">Hallazgo Preliminar #{index + 1}</h4>
                      <span className="px-2 py-1 bg-yellow-200 text-yellow-800 text-xs font-bold rounded-full">
                        PRELIMINAR
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onEliminarHallazgo(hallazgo.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

              <div className="space-y-4">
                {/* Tipo de Hallazgo */}
                <FieldWrapper label="Tipo de Hallazgo" required>
                  <select
                    value={hallazgo.tipo}
                    onChange={(e) => onActualizarHallazgo(hallazgo.id, 'tipo', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="observacion">Observación</option>
                    <option value="hallazgo_administrativo">Hallazgo Administrativo</option>
                    <option value="hallazgo_disciplinario">Hallazgo Disciplinario</option>
                    <option value="hallazgo_fiscal">Hallazgo Fiscal</option>
                    <option value="hallazgo_penal">Hallazgo Penal</option>
                  </select>
                </FieldWrapper>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Descripción */}
                  <FieldWrapper label="Descripción del Hallazgo" required>
                    <textarea
                      value={hallazgo.descripcion}
                      onChange={(e) => onActualizarHallazgo(hallazgo.id, 'descripcion', e.target.value)}
                      placeholder="Describa el hallazgo identificado..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </FieldWrapper>

                  {/* Criterio */}
                  <FieldWrapper label="Criterio" required>
                    <textarea
                      value={hallazgo.criterio}
                      onChange={(e) => onActualizarHallazgo(hallazgo.id, 'criterio', e.target.value)}
                      placeholder="Norma o estándar incumplido..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </FieldWrapper>

                  {/* Causa */}
                  <FieldWrapper label="Causa" required>
                    <textarea
                      value={hallazgo.causa}
                      onChange={(e) => onActualizarHallazgo(hallazgo.id, 'causa', e.target.value)}
                      placeholder="Razón del hallazgo..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </FieldWrapper>

                  {/* Efecto */}
                  <FieldWrapper label="Efecto" required>
                    <textarea
                      value={hallazgo.efecto}
                      onChange={(e) => onActualizarHallazgo(hallazgo.id, 'efecto', e.target.value)}
                      placeholder="Consecuencia del hallazgo..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </FieldWrapper>
                </div>

                {/* Recomendación */}
                <FieldWrapper label="Recomendación" required>
                  <textarea
                    value={hallazgo.recomendacion}
                    onChange={(e) => onActualizarHallazgo(hallazgo.id, 'recomendacion', e.target.value)}
                    placeholder="Acción correctiva recomendada..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </FieldWrapper>
              </div>
            </Card>
          ))}

          <Button
            type="button"
            onClick={onAgregarHallazgo}
            variant="outline"
            className="w-full gap-2 border-2 border-yellow-400 text-yellow-700 hover:bg-yellow-50"
          >
            <Plus className="w-4 h-4" />
            Agregar Otro Hallazgo Preliminar
          </Button>
        </div>
      )}
    </>
    )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PASO 9: VINCULACIÓN PLAN ANUAL
// ═══════════════════════════════════════════════════════════════════════════

function Paso9VinculacionPlan({ formData, onChange }: PasoProps) {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="text-center mb-6">
        <ClipboardCheck className="w-12 h-12 mx-auto mb-3" style={{ color: '#003DA5' }} />
        <h3 className="text-xl font-black text-gray-900">Vinculación con Plan Anual</h3>
        <p className="text-sm text-gray-600 mt-1">
          Relacione esta auditoría con la planificación anual OCI
        </p>
      </div>

      <Card className="p-6 border-2 border-gray-200">
        <div className="space-y-4">
          {/* ¿Vinculada a Plan Anual? */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.vinculadaPlanAnual}
                onChange={(e) => onChange('vinculadaPlanAnual', e.target.checked)}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="font-bold text-gray-900">
                Esta auditoría forma parte del Plan Anual OCI
              </span>
            </label>
          </div>

          {formData.vinculadaPlanAnual && (
            <div className="space-y-4 pl-8 border-l-4 border-blue-500">
              {/* Año del Plan */}
              <FieldWrapper label="Año del Plan Anual">
                <Input
                  type="number"
                  value={formData.planAnualAño || ''}
                  onChange={(e) => onChange('planAnualAño', parseInt(e.target.value))}
                  placeholder="2025"
                  className="border-gray-300"
                />
              </FieldWrapper>

              {/* Rol del Decreto 648 */}
              <FieldWrapper label="Rol del Decreto 648/2017 Asociado">
                <select
                  value={formData.rolDecretoAsociado || ''}
                  onChange={(e) => onChange('rolDecretoAsociado', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccione un rol...</option>
                  {ROLES_DECRETO_648.map(rol => (
                    <option key={rol} value={rol}>
                      {rol}
                    </option>
                  ))}
                </select>
              </FieldWrapper>

              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-700">
                  <strong>Decreto 648/2017:</strong> Esta auditoría se vinculará automáticamente
                  al Plan Anual OCI bajo el rol seleccionado
                </p>
              </div>
            </div>
          )}

          {!formData.vinculadaPlanAnual && (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600">
                Esta auditoría será una <strong>auditoría especial no programada</strong> y no formará
                parte del Plan Anual OCI
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Resumen Final */}
      <Card className="p-6 bg-gradient-to-br from-blue-50 to-green-50 border-2 border-blue-200">
        <h4 className="font-black text-gray-900 mb-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          Resumen de la Auditoría
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="md:col-span-2">
            <p className="text-gray-600">Título (Proceso):</p>
            <p className="font-bold text-gray-900">{formData.titulo || 'Sin seleccionar'}</p>
          </div>
          <div>
            <p className="text-gray-600">Tipo:</p>
            <p className="font-bold text-gray-900 capitalize">{formData.tipoAuditoria}</p>
          </div>
          <div>
            <p className="text-gray-600">Territorial:</p>
            <p className="font-bold text-gray-900">{formData.territorial || 'Sin asignar'}</p>
          </div>
          <div>
            <p className="text-gray-600">Área:</p>
            <p className="font-bold text-gray-900">{formData.areaObjetivo || 'Sin asignar'}</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-gray-600 mb-1">Cronograma de Etapas:</p>
            <div className="space-y-1">
              {formData.fechaInicioPlaneacion && formData.fechaFinPlaneacion && (
                <p className="text-xs text-gray-700">
                  <strong>Planeación:</strong> {formData.fechaInicioPlaneacion} → {formData.fechaFinPlaneacion}
                </p>
              )}
              {formData.fechaInicioEjecucion && formData.fechaFinEjecucion && (
                <p className="text-xs text-gray-700">
                  <strong>Ejecución:</strong> {formData.fechaInicioEjecucion} → {formData.fechaFinEjecucion}
                </p>
              )}
              {formData.fechaInicioComunicacion && formData.fechaFinComunicacion && (
                <p className="text-xs text-gray-700">
                  <strong>Comunicación:</strong> {formData.fechaInicioComunicacion} → {formData.fechaFinComunicacion}
                </p>
              )}
            </div>
          </div>
          <div>
            <p className="text-gray-600">Objetivos:</p>
            <p className="font-bold text-gray-900">{formData.objetivos.length} definidos</p>
          </div>
          <div>
            <p className="text-gray-600">Hallazgos Preliminares:</p>
            <p className="font-bold text-gray-900">
              {formData.incluirHallazgosPreliminares 
                ? `${formData.hallazgos.length} registrado${formData.hallazgos.length !== 1 ? 's' : ''}`
                : 'Sin hallazgos'
              }
            </p>
          </div>
        </div>
        
        {/* Alerta de hallazgos preliminares en resumen */}
        {formData.incluirHallazgosPreliminares && formData.hallazgos.length > 0 && (
          <div className="mt-4 p-4 bg-yellow-50 rounded-lg border-2 border-yellow-300">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-700 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-yellow-900">
                  ⚠️ Esta auditoría incluye {formData.hallazgos.length} hallazgo{formData.hallazgos.length !== 1 ? 's' : ''} preliminar{formData.hallazgos.length !== 1 ? 'es' : ''}
                </p>
                <p className="text-sm text-yellow-800 mt-1">
                  Recuerde que estos hallazgos deben ser comunicados formalmente al auditado
                  para el ejercicio del derecho de contradicción antes de su inclusión en el
                  informe final.
                </p>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
