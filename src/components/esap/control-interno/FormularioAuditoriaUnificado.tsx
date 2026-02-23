/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FORMULARIO UNIFICADO DE AUDITORÍA - VERSIÓN CORPORATIVA ESAP
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * FORMULARIO MANDATORIO ÚNICO para todo Control Interno de Gestión OCIG
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
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import { Card } from '../../ui/card';
import { toast } from 'sonner';
import { configuracionesProfesionalesOCIGApi } from './services/api';

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
  
  // 3. EQUIPO AUDITOR
  auditorLider: string;
  auditorAsignado: string;
  equipoAuditores: string[];
  supervisorAsignado: string;
  
  // 4. PROGRAMACIÓN
  fechaInicio: string;
  fechaFin: string;
  periodicidad: 'unica' | 'trimestral' | 'semestral' | 'anual';
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

const PROCESOS_INSTITUCIONALES = [
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
    fechaInicio: initialData?.fechaInicio || '',
    fechaFin: initialData?.fechaFin || '',
    periodicidad: initialData?.periodicidad || 'unica',
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
  const [controlTemporal, setControlTemporal] = useState('');
  
  // Estado para auditores cargados del backend
  const [auditoresDisponibles, setAuditoresDisponibles] = useState<AuditorOption[]>(AUDITORES_FALLBACK);
  const [cargandoAuditores, setCargandoAuditores] = useState(false);

  const TOTAL_PASOS = 9;
  
  // Cargar profesionales OCIG configurados del backend
  useEffect(() => {
    const cargarAuditores = async () => {
      if (!open) return;
      
      setCargandoAuditores(true);
      try {
        // Usar profesionales configurados en OCIG en lugar de personas disponibles genéricas
        const response = await configuracionesProfesionalesOCIGApi.getAll();
        console.log('[FormularioAuditoria] Profesionales OCIG Response:', response);
        
        if (response.success && response.data && response.data.length > 0) {
          const auditores = response.data
            .filter((config: any) => config.activo)
            .map((config: any) => ({
              id: String(config.idTercero),
              nombre: config.nombre || `Profesional ${config.idTercero}`,
              cargo: config.rolOcig || 'Auditor'
            }));
          setAuditoresDisponibles(auditores);
          console.log('[FormularioAuditoria] Profesionales OCIG cargados:', auditores.length, auditores);
        } else {
          console.warn('[FormularioAuditoria] No hay profesionales OCIG configurados, usando fallback');
        }
      } catch (error) {
        console.error('[FormularioAuditoria] Error al cargar profesionales OCIG:', error);
        // Mantener los datos fallback
      } finally {
        setCargandoAuditores(false);
      }
    };
    
    cargarAuditores();
  }, [open]);

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
    if (riesgoTemporal.trim().length < 10) {
      toast.error('El riesgo debe tener al menos 10 caracteres');
      return;
    }
    setFormData(prev => ({
      ...prev,
      riesgosIdentificados: [...prev.riesgosIdentificados, riesgoTemporal.trim()]
    }));
    setRiesgoTemporal('');
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

    // Validaciones básicas
    if (!formData.titulo || formData.titulo.length < 10) {
      toast.error('El título debe tener al menos 10 caracteres');
      setPasoActual(1);
      return;
    }

    if (!formData.territorial) {
      toast.error('Debe seleccionar una territorial');
      setPasoActual(2);
      return;
    }

    if (!formData.auditorLider || !formData.auditorAsignado) {
      toast.error('Debe asignar auditor líder y auditor asignado');
      setPasoActual(3);
      return;
    }

    if (!formData.fechaInicio || !formData.fechaFin) {
      toast.error('Debe especificar las fechas de inicio y fin');
      setPasoActual(4);
      return;
    }

    if (formData.objetivos.length === 0) {
      toast.error('Debe agregar al menos un objetivo');
      setPasoActual(5);
      return;
    }

    setIsSubmitting(true);

    try {
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
        return <Paso1InformacionBasica formData={formData} onChange={handleChange} />;
      case 2:
        return <Paso2ClasificacionAlcance formData={formData} onChange={handleChange} />;
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
            onAgregarRiesgo={handleAgregarRiesgo}
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
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[110]"
            onClick={onClose}
          />

          {/* MODAL CONTENT */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[111] flex items-center justify-center p-4"
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
                      {mode === 'create' ? 'Nueva Auditoría OCIG' : 'Editar Auditoría OCIG'}
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

function Paso1InformacionBasica({ formData, onChange }: PasoProps) {
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { value: 'regular', label: 'Regular', icono: <Shield className="w-5 h-5" /> },
                { value: 'territorial', label: 'Territorial', icono: <MapPin className="w-5 h-5" /> },
                { value: 'especial', label: 'Especial', icono: <Zap className="w-5 h-5" /> },
                { value: 'seguimiento', label: 'Seguimiento', icono: <Clock className="w-5 h-5" /> }
              ].map(tipo => (
                <button
                  key={tipo.value}
                  type="button"
                  onClick={() => onChange('tipoAuditoria', tipo.value)}
                  className={`
                    px-4 py-3 rounded-lg border-2 transition-all duration-200
                    flex flex-col items-center justify-center gap-2 font-medium
                    ${
                      formData.tipoAuditoria === tipo.value
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400'
                    }
                  `}
                >
                  {tipo.icono}
                  <span className="text-sm">{tipo.label}</span>
                </button>
              ))}
            </div>
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

          {/* Título */}
          <FieldWrapper
            label="Título de la Auditoría"
            required
            helpText="Mínimo 10 caracteres - Sea claro y específico"
          >
            <Input
              value={formData.titulo}
              onChange={(e) => onChange('titulo', e.target.value)}
              placeholder="Ej: Auditoría de Gestión Administrativa Territorial Antioquia 2025"
              className="border-gray-300"
            />
            <div className="text-xs text-gray-500 text-right mt-1">
              {formData.titulo.length}/200
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

function Paso2ClasificacionAlcance({ formData, onChange }: PasoProps) {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="text-center mb-6">
        <Building2 className="w-12 h-12 mx-auto mb-3" style={{ color: '#003DA5' }} />
        <h3 className="text-xl font-black text-gray-900">Clasificación y Alcance</h3>
        <p className="text-sm text-gray-600 mt-1">
          Defina el ámbito territorial, área y proceso a auditar
        </p>
      </div>

      <Card className="p-6 border-2 border-gray-200">
        <div className="space-y-4">
          {/* Territorial */}
          <FieldWrapper label="Territorial" required>
            <select
              value={formData.territorial}
              onChange={(e) => onChange('territorial', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccione una territorial...</option>
              {TERRITORIALES.map(territorial => (
                <option key={territorial} value={territorial}>
                  {territorial}
                </option>
              ))}
            </select>
          </FieldWrapper>

          {/* Área Objetivo */}
          <FieldWrapper label="Área Institucional" required>
            <select
              value={formData.areaObjetivo}
              onChange={(e) => onChange('areaObjetivo', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccione un área...</option>
              {AREAS_INSTITUCIONALES.map(area => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </FieldWrapper>

          {/* Proceso Auditado */}
          <FieldWrapper label="Proceso Específico" required>
            <select
              value={formData.procesoAuditado}
              onChange={(e) => onChange('procesoAuditado', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccione un proceso...</option>
              {PROCESOS_INSTITUCIONALES.map(proceso => (
                <option key={proceso} value={proceso}>
                  {proceso}
                </option>
              ))}
            </select>
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
          {/* Auditor Líder */}
          <FieldWrapper label="Auditor Líder" required>
            <select
              value={formData.auditorLider}
              onChange={(e) => onChange('auditorLider', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccione el auditor líder...</option>
              {auditores.map(auditor => (
                <option key={auditor.id} value={auditor.id}>
                  {auditor.nombre} - {auditor.cargo}
                </option>
              ))}
            </select>
          </FieldWrapper>

          {/* Auditor Asignado */}
          <FieldWrapper label="Auditor Asignado" required>
            <select
              value={formData.auditorAsignado}
              onChange={(e) => onChange('auditorAsignado', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccione el auditor asignado...</option>
              {auditores.filter(a => a.id !== formData.auditorLider).map(auditor => (
                <option key={auditor.id} value={auditor.id}>
                  {auditor.nombre} - {auditor.cargo}
                </option>
              ))}
            </select>
          </FieldWrapper>

          {/* Supervisor */}
          <FieldWrapper label="Supervisor / Jefe OCI" required>
            <select
              value={formData.supervisorAsignado}
              onChange={(e) => onChange('supervisorAsignado', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccione el supervisor...</option>
              {auditores.filter(a =>
                a.id !== formData.auditorLider && a.id !== formData.auditorAsignado
              ).map(auditor => (
                <option key={auditor.id} value={auditor.id}>
                  {auditor.nombre} - {auditor.cargo}
                </option>
              ))}
            </select>
          </FieldWrapper>

          {/* Equipo Adicional */}
          <FieldWrapper
            label="Equipo Auditor Adicional (Opcional)"
            helpText="Seleccione otros auditores que participarán"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {auditores.filter(a =>
                a.id !== formData.auditorLider &&
                a.id !== formData.auditorAsignado &&
                a.id !== formData.supervisorAsignado
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
                      <p className="text-xs text-gray-600">{auditor.cargo}</p>
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
// PASO 4: PROGRAMACIÓN
// ═══════════════════════════════════════════════════════════════════════════

function Paso4Programacion({ formData, onChange }: PasoProps) {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="text-center mb-6">
        <Calendar className="w-12 h-12 mx-auto mb-3" style={{ color: '#003DA5' }} />
        <h3 className="text-xl font-black text-gray-900">Programación y Fechas</h3>
        <p className="text-sm text-gray-600 mt-1">
          Defina el periodo de ejecución y periodicidad
        </p>
      </div>

      <Card className="p-6 border-2 border-gray-200">
        <div className="space-y-4">
          {/* Fechas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FieldWrapper label="Fecha de Inicio" required>
              <Input
                type="date"
                value={formData.fechaInicio}
                onChange={(e) => onChange('fechaInicio', e.target.value)}
                className="border-gray-300"
              />
            </FieldWrapper>

            <FieldWrapper label="Fecha de Finalización" required>
              <Input
                type="date"
                value={formData.fechaFin}
                onChange={(e) => onChange('fechaFin', e.target.value)}
                className="border-gray-300"
              />
            </FieldWrapper>
          </div>

          {/* Periodicidad */}
          <FieldWrapper
            label="Periodicidad"
            required
            helpText="Frecuencia de ejecución de la auditoría"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { value: 'unica', label: 'Única' },
                { value: 'trimestral', label: 'Trimestral' },
                { value: 'semestral', label: 'Semestral' },
                { value: 'anual', label: 'Anual' }
              ].map(periodo => (
                <button
                  key={periodo.value}
                  type="button"
                  onClick={() => onChange('periodicidad', periodo.value)}
                  className={`
                    px-4 py-3 rounded-lg border-2 transition-all font-medium text-sm
                    ${
                      formData.periodicidad === periodo.value
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400'
                    }
                  `}
                >
                  {periodo.label}
                </button>
              ))}
            </div>
          </FieldWrapper>

          {/* Duración estimada */}
          {formData.fechaInicio && formData.fechaFin && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-700">
                <strong>Duración estimada:</strong>{' '}
                {Math.ceil(
                  (new Date(formData.fechaFin).getTime() - new Date(formData.fechaInicio).getTime()) /
                    (1000 * 60 * 60 * 24)
                )}{' '}
                días
              </p>
            </div>
          )}
        </div>
      </Card>
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
  onAgregarRiesgo: () => void;
  controlTemporal: string;
  setControlTemporal: (value: string) => void;
  onAgregarControl: () => void;
}

function Paso7RiesgosControles({
  formData,
  onChange,
  riesgoTemporal,
  setRiesgoTemporal,
  onAgregarRiesgo,
  controlTemporal,
  setControlTemporal,
  onAgregarControl
}: Paso7Props) {
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

          {/* Riesgos Identificados */}
          <div>
            <h4 className="font-bold text-gray-900 mb-3">Riesgos Identificados</h4>
            
            {formData.riesgosIdentificados.length > 0 && (
              <div className="space-y-2 mb-3">
                {formData.riesgosIdentificados.map((riesgo, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 p-3 bg-red-50 rounded-lg border border-red-200"
                  >
                    <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700 flex-1">{riesgo}</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        onChange(
                          'riesgosIdentificados',
                          formData.riesgosIdentificados.filter((_, i) => i !== index)
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
                value={riesgoTemporal}
                onChange={(e) => setRiesgoTemporal(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    onAgregarRiesgo();
                  }
                }}
                placeholder="Ej: Riesgo de pérdida de información por falta de respaldo"
                className="flex-1"
              />
              <Button
                type="button"
                onClick={onAgregarRiesgo}
                disabled={riesgoTemporal.trim().length < 10}
                style={{ backgroundColor: '#DC2626' }}
              >
                <Plus className="w-4 h-4 mr-1" />
                Agregar
              </Button>
            </div>
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
                    <p className="text-sm text-gray-700 flex-1">{control}</p>
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
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
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
          Relacione esta auditoría con la planificación anual OCIG
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
                Esta auditoría forma parte del Plan Anual OCIG
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
                  al Plan Anual OCIG bajo el rol seleccionado
                </p>
              </div>
            </div>
          )}

          {!formData.vinculadaPlanAnual && (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600">
                Esta auditoría será una <strong>auditoría especial no programada</strong> y no formará
                parte del Plan Anual OCIG
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
          <div>
            <p className="text-gray-600">Periodo:</p>
            <p className="font-bold text-gray-900">
              {formData.fechaInicio && formData.fechaFin
                ? `${formData.fechaInicio} - ${formData.fechaFin}`
                : 'Sin asignar'}
            </p>
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
