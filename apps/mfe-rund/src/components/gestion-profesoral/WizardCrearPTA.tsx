/**
 * WIZARD DE CREACIÓN DE PTA - ESAP
 * 
 * Componente principal para que los docentes creen su Plan de Trabajo Académico
 * siguiendo un flujo guiado de 5 pasos con validaciones en tiempo real.
 * 
 * ✅ INTEGRADO CON MÓDULO DE PERSONAS
 * Versión: 2.0.0 - Usa hook usePTAConPersonas
 * Fecha: 2026-01-03
 * 
 * Pasos:
 * 1. Información Docente (auto-cargada desde Personas)
 * 2. Actividades de Docencia
 * 3. Actividades de Investigación
 * 4. Actividades de Extensión y Complementarias
 * 5. Revisión y Envío
 * 
 * Features:
 * - ✅ Datos del docente pre-cargados desde Personas
 * - ✅ Horas programables automáticas según vinculación
 * - Autoguardado cada 30 segundos
 * - Validaciones en tiempo real
 * - Cálculo automático Criterio 1+2
 * - Prorrateo automático si excede horas
 * - Barra de progreso visual
 * - Tooltips de ayuda contextual
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText,
  BookOpen,
  FlaskConical,
  Users,
  Briefcase,
  CheckCircle,
  Clock,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  Save,
  Send,
  User,
  Mail,
  MapPin,
  Award,
  GraduationCap,
  Briefcase as BriefcaseIcon,
  Calendar,
  TrendingUp,
  Calculator,
  Building2,
  Info,
  X
} from 'lucide-react';
import { FormularioDocencia, type ActividadDocencia } from './FormularioDocencia';
import { FormularioInvestigacion, type ActividadInvestigacion } from './FormularioInvestigacion';
import { FormularioExtension, type ActividadExtension } from './FormularioExtension';
import { FormularioComplementarias, type ActividadComplementaria } from './FormularioComplementarias';
import { PanelRevision } from './PanelRevision';
import { ModalProrrateo } from './ModalProrrateo';
import { periodParametersService } from '../../services/periodParametersService';
import { usePTAConPersonas } from '../../hooks/usePTAConPersonas'; // ✅ NUEVO
import { toast } from 'sonner'; // ✅ NUEVO

// ============================================================================
// TIPOS Y CONSTANTES
// ============================================================================

interface DocenteInfo {
  cedula: string;
  nombreCompleto: string;
  perfilAcademico: 'Especialización' | 'Maestría' | 'Doctorado';
  categoria: 'Auxiliar' | 'Asistente' | 'Asociado' | 'Titular';
  sedeVinculacion: string;
  tipoVinculacion: 'Carrera1' | 'Carrera2' | 'Periodo Prueba' | 'Ocasional' | 'Visitante' | 'Especial';
  tipoDedicacion: 'TC' | 'MT';
  nucleoTematico: string;
  horasProgramables: number;
}

interface ActividadDocencia {
  id: string;
  territorial: string;
  programa: string;
  asignatura: string;
  nucleoTematico: string;
  ubicacionSemestral: number;
  totalEstudiantes: number;
  creditos: number;
  horasBase: number;
  horasPTA: number; // Calculado: horasBase × 3
  fechaInicio: string;
  fechaTerminacion: string;
  observaciones: string;
}

interface ActividadInvestigacion {
  id: string;
  tipo: 'proyecto' | 'apoyo';
  nombreProyecto?: string;
  grupoInvestigacion?: string;
  lineaInvestigacion?: string;
  rol?: 'Líder' | 'Coinvestigador' | 'Asistente II';
  recibeEstimulo: boolean;
  actividad?: string;
  horas: number;
  fechaInicio: string;
  fechaTerminacion: string;
  observaciones: string;
}

interface ActividadExtension {
  id: string;
  tipo: 'Capacitación' | 'Procesos Selección' | 'Gestión Estatal' | 'Alto Gobierno';
  actividad: string;
  entidadTerritorial?: string;
  horas: number;
  fechaInicio: string;
  fechaTerminacion: string;
  observaciones: string;
}

interface ActividadComplementaria {
  id: string;
  actividad: string;
  descripcion: string;
  horas: number;
  fechaInicio: string;
  fechaTerminacion: string;
  observaciones: string;
}

interface PTADraft {
  docente: DocenteInfo;
  periodoAcademico: string;
  actividadesDocencia: ActividadDocencia[];
  actividadesInvestigacion: ActividadInvestigacion[];
  actividadesExtension: ActividadExtension[];
  actividadesComplementarias: ActividadComplementaria[];
  estado: 'construccion' | 'enviado';
  fechaCreacion: string;
  fechaUltimaModificacion: string;
}

interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

const PASOS = [
  { id: 1, nombre: 'Información Docente', icono: User },
  { id: 2, nombre: 'Docencia', icono: BookOpen },
  { id: 3, nombre: 'Investigación', icono: FlaskConical },
  { id: 4, nombre: 'Extensión y Complementarias', icono: Users },
  { id: 5, nombre: 'Revisión y Envío', icono: CheckCircle }
];

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

interface WizardCrearPTAProps {
  docenteInfo: DocenteInfo;
  onGuardar: (pta: PTADraft) => void;
  onEnviar: (pta: PTADraft) => void;
  onCancelar: () => void;
}

export function WizardCrearPTA({
  docenteInfo,
  onGuardar,
  onEnviar,
  onCancelar
}: WizardCrearPTAProps) {
  const [pasoActual, setPasoActual] = useState(1);
  
  // Obtener período activo y horas programables del sistema de parámetros
  const parametroActivo = periodParametersService.getParametroActivo();
  const horasProgramablesDelSistema = parametroActivo?.horasTotales || 800;
  const periodoAcademicoActivo = parametroActivo?.periodoAcademico || '2025-1';
  
  const [ptaDraft, setPTADraft] = useState<PTADraft>({
    docente: { ...docenteInfo, horasProgramables: horasProgramablesDelSistema },
    periodoAcademico: periodoAcademicoActivo,
    actividadesDocencia: [],
    actividadesInvestigacion: [],
    actividadesExtension: [],
    actividadesComplementarias: [],
    estado: 'construccion',
    fechaCreacion: new Date().toISOString(),
    fechaUltimaModificacion: new Date().toISOString()
  });
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [ultimoAutoguardado, setUltimoAutoguardado] = useState<Date | null>(null);
  const [mostrarModalProrrateo, setMostrarModalProrrateo] = useState(false);

  // ============================================================================
  // CÁLCULOS Y VALIDACIONES
  // ============================================================================

  // Calcular horas totales por componente
  const calcularHoras = () => {
    const horasDocencia = ptaDraft.actividadesDocencia.reduce((sum, act) => sum + act.horasPTA, 0);
    const horasInvestigacion = ptaDraft.actividadesInvestigacion
      .filter(act => !act.recibeEstimulo)
      .reduce((sum, act) => sum + act.horas, 0);
    const horasExtension = ptaDraft.actividadesExtension.reduce((sum, act) => sum + act.horas, 0);
    const horasComplementarias = ptaDraft.actividadesComplementarias.reduce((sum, act) => sum + act.horas, 0);
    
    const totalHoras = horasDocencia + horasInvestigacion + horasExtension + horasComplementarias;
    
    return {
      docencia: horasDocencia,
      investigacion: horasInvestigacion,
      extension: horasExtension,
      complementarias: horasComplementarias,
      total: totalHoras
    };
  };

  const horas = calcularHoras();
  // Usar las horas programables del draft (que vienen del sistema de parámetros)
  const porcentajeProgreso = (horas.total / ptaDraft.docente.horasProgramables) * 100;

  // Validar PTA
  const validarPTA = (): ValidationError[] => {
    const errors: ValidationError[] = [];
    const { docencia, investigacion, extension, complementarias, total } = horas;

    // RN-001: Total horas debe igualar horas programables
    if (total !== docenteInfo.horasProgramables) {
      const diff = docenteInfo.horasProgramables - total;
      errors.push({
        field: 'total',
        message: diff > 0 
          ? `Faltan ${diff} horas para completar tu PTA`
          : `Excedes ${Math.abs(diff)} horas. Se aplicará prorrateo automático`,
        severity: diff > 0 ? 'warning' : 'info'
      });
    }

    // RN-002: Docencia mínimo 50% para Ocasionales/Visitantes/Especiales
    if (['Ocasional', 'Visitante', 'Especial'].includes(docenteInfo.tipoVinculacion)) {
      const minimoDocencia = docenteInfo.horasProgramables * 0.5;
      if (docencia < minimoDocencia) {
        errors.push({
          field: 'docencia',
          message: `Tu tipo de vinculación requiere mínimo 50% en Docencia (${minimoDocencia} hrs). Tienes ${docencia} hrs`,
          severity: 'error'
        });
      }
    }

    // RN-003: Investigación máximo 50%
    const maxInvestigacion = docenteInfo.horasProgramables * 0.5;
    if (investigacion > maxInvestigacion) {
      errors.push({
        field: 'investigacion',
        message: `Investigación no puede exceder 50% (${maxInvestigacion} hrs). Tienes ${investigacion} hrs`,
        severity: 'error'
      });
    }

    // RN-004: Extensión máximo 25%
    const maxExtension = docenteInfo.horasProgramables * 0.25;
    if (extension > maxExtension) {
      errors.push({
        field: 'extension',
        message: `Extensión no puede exceder 25% (${maxExtension} hrs). Tienes ${extension} hrs`,
        severity: 'error'
      });
    }

    // RN-005: Complementarias máximo 25%
    const maxComplementarias = docenteInfo.horasProgramables * 0.25;
    if (complementarias > maxComplementarias) {
      errors.push({
        field: 'complementarias',
        message: `Actividades Complementarias no puede exceder 25% (${maxComplementarias} hrs). Tienes ${complementarias} hrs`,
        severity: 'error'
      });
    }

    // RN-006: Mínimo 1 asignatura de 3 créditos
    const tieneAsignaturaMinima = ptaDraft.actividadesDocencia.some(act => act.creditos >= 3);
    if (!tieneAsignaturaMinima && ptaDraft.actividadesDocencia.length > 0) {
      errors.push({
        field: 'docencia',
        message: 'Debes tener al menos 1 asignatura de 3 créditos',
        severity: 'error'
      });
    }

    return errors;
  };

  // Autoguardado cada 30 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      onGuardar(ptaDraft);
      setUltimoAutoguardado(new Date());
    }, 30000);

    return () => clearInterval(interval);
  }, [ptaDraft, onGuardar]);

  // Validar en tiempo real
  useEffect(() => {
    const errors = validarPTA();
    setValidationErrors(errors);
  }, [ptaDraft]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleSiguiente = () => {
    if (pasoActual < PASOS.length) {
      setPasoActual(pasoActual + 1);
    }
  };

  const handleAnterior = () => {
    if (pasoActual > 1) {
      setPasoActual(pasoActual - 1);
    }
  };

  const handleGuardarBorrador = () => {
    onGuardar(ptaDraft);
    setUltimoAutoguardado(new Date());
  };

  const handleEnviarAprobacion = () => {
    const erroresCriticos = validationErrors.filter(e => e.severity === 'error');
    
    if (erroresCriticos.length > 0) {
      alert('No puedes enviar el PTA con errores críticos. Por favor revisa las alertas.');
      return;
    }

    if (confirm('¿Estás seguro de enviar tu PTA a aprobación? No podrás editarlo después.')) {
      onEnviar({ ...ptaDraft, estado: 'enviado' });
    }
  };

  const handleProrrateo = () => {
    setMostrarModalProrrateo(true);
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  const renderErrores = () => {
    if (validationErrors.length === 0) return null;

    return (
      <div className="bg-white border-l-4 border-amber-500 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 mb-2">
              Validaciones ({validationErrors.length})
            </h4>
            <div className="space-y-2">
              {validationErrors.map((error, index) => (
                <div
                  key={index}
                  className={`text-sm flex items-start gap-2 ${
                    error.severity === 'error'
                      ? 'text-red-700'
                      : error.severity === 'warning'
                      ? 'text-amber-700'
                      : 'text-blue-700'
                  }`}
                >
                  <span className="font-medium">•</span>
                  <span>{error.message}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header con Progreso */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={onCancelar}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold">Crear Plan de Trabajo Académico</h1>
                <p className="text-blue-100 text-sm mt-1">
                  {docenteInfo.nombreCompleto} • Período {ptaDraft.periodoAcademico}
                </p>
              </div>
            </div>

            {ultimoAutoguardado && (
              <div className="flex items-center gap-2 text-sm text-blue-100">
                <Save className="w-4 h-4" />
                Guardado {ultimoAutoguardado.toLocaleTimeString()}
              </div>
            )}
          </div>

          {/* Pasos del Wizard (Escritorio / Tablet) */}
          <div className="hidden md:flex items-center justify-between">
            {PASOS.map((paso, index) => {
              const Icon = paso.icono;
              const esActual = paso.id === pasoActual;
              const esCompletado = paso.id < pasoActual;

              return (
                <div key={paso.id} className="flex items-center flex-1">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        esActual
                          ? 'bg-white text-blue-600'
                          : esCompletado
                          ? 'bg-blue-500 text-white'
                          : 'bg-blue-500/30 text-blue-200'
                      }`}
                    >
                      {esCompletado ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <Icon className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <p
                        className={`text-sm font-medium ${
                          esActual ? 'text-white' : 'text-blue-200'
                        }`}
                      >
                        Paso {paso.id}
                      </p>
                      <p
                        className={`text-xs ${
                          esActual ? 'text-blue-100' : 'text-blue-300'
                        }`}
                      >
                        {paso.nombre}
                      </p>
                    </div>
                  </div>
                  {index < PASOS.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-4 ${
                        esCompletado ? 'bg-blue-400' : 'bg-blue-500/30'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Pasos del Wizard (Móvil) */}
          <div className="flex md:hidden flex-col gap-2 w-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-200 uppercase tracking-wider">
                Paso {pasoActual} de 5
              </span>
              <span className="text-xs font-bold text-white">
                {PASOS[pasoActual - 1].nombre}
              </span>
            </div>
            <div className="h-1.5 w-full bg-blue-500/30 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white transition-all duration-300"
                style={{ width: `${(pasoActual / PASOS.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Panel Principal (Pasos) */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <AnimatePresence mode="wait">
                {pasoActual === 1 && (
                  <motion.div
                    key="paso-1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <Paso1InformacionDocente docente={docenteInfo} />
                  </motion.div>
                )}
                {pasoActual === 2 && (
                  <motion.div
                    key="paso-2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <Paso2Docencia
                      actividades={ptaDraft.actividadesDocencia}
                      onChange={(actividades) =>
                        setPTADraft({ ...ptaDraft, actividadesDocencia: actividades })
                      }
                    />
                  </motion.div>
                )}
                {pasoActual === 3 && (
                  <motion.div
                    key="paso-3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <Paso3Investigacion
                      actividades={ptaDraft.actividadesInvestigacion}
                      horasProgramables={docenteInfo.horasProgramables}
                      onChange={(actividades) =>
                        setPTADraft({ ...ptaDraft, actividadesInvestigacion: actividades })
                      }
                    />
                  </motion.div>
                )}
                {pasoActual === 4 && (
                  <motion.div
                    key="paso-4"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <Paso4ExtensionComplementarias
                      actividadesExtension={ptaDraft.actividadesExtension}
                      actividadesComplementarias={ptaDraft.actividadesComplementarias}
                      horasProgramables={docenteInfo.horasProgramables}
                      onChangeExtension={(actividades) =>
                        setPTADraft({ ...ptaDraft, actividadesExtension: actividades })
                      }
                      onChangeComplementarias={(actividades) =>
                        setPTADraft({ ...ptaDraft, actividadesComplementarias: actividades })
                      }
                    />
                  </motion.div>
                )}
                {pasoActual === 5 && (
                  <motion.div
                    key="paso-5"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <Paso5Revision
                      pta={ptaDraft}
                      horas={horas}
                      validationErrors={validationErrors}
                      onEnviar={handleEnviarAprobacion}
                      onVolver={() => setPasoActual(4)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Navegación */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={handleAnterior}
                  disabled={pasoActual === 1}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 text-gray-700 hover:bg-gray-50 border border-gray-300 sm:border-0 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Anterior
                </button>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                  <button
                    onClick={handleGuardarBorrador}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm sm:text-base"
                  >
                    <Save className="w-4 h-4" />
                    Guardar Borrador
                  </button>

                  {pasoActual === PASOS.length ? (
                    <button
                      onClick={handleEnviarAprobacion}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-semibold text-sm sm:text-base"
                    >
                      <Send className="w-4 h-4" />
                      Enviar a Aprobación
                    </button>
                  ) : (
                    <button
                      onClick={handleSiguiente}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm sm:text-base"
                    >
                      Siguiente
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Panel Lateral - Resumen y Alertas */}
          <div className="space-y-6">
            {/* Progreso de Horas */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900">Progreso de Horas</h3>
              </div>

              {/* Barra de Progreso */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Total Asignado</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {horas.total} / {docenteInfo.horasProgramables} hrs
                  </span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      porcentajeProgreso >= 100
                        ? 'bg-green-500'
                        : porcentajeProgreso >= 75
                        ? 'bg-blue-500'
                        : 'bg-amber-500'
                    }`}
                    style={{ width: `${Math.min(porcentajeProgreso, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {porcentajeProgreso.toFixed(1)}% completado
                </p>
              </div>

              {/* Distribución por Componente */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-blue-500" />
                    <span className="text-gray-700">Docencia</span>
                  </div>
                  <span className="font-medium text-gray-900">{horas.docencia} hrs</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-purple-500" />
                    <span className="text-gray-700">Investigación</span>
                  </div>
                  <span className="font-medium text-gray-900">{horas.investigacion} hrs</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-teal-500" />
                    <span className="text-gray-700">Extensión</span>
                  </div>
                  <span className="font-medium text-gray-900">{horas.extension} hrs</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-orange-500" />
                    <span className="text-gray-700">Complementarias</span>
                  </div>
                  <span className="font-medium text-gray-900">{horas.complementarias} hrs</span>
                </div>
              </div>
            </div>

            {/* Alertas de Validación */}
            {renderErrores()}

            {/* Botón de Prorrateo Automático */}
            {horas.total !== docenteInfo.horasProgramables && pasoActual >= 2 && (
              <button
                onClick={handleProrrateo}
                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-xl p-4 flex items-center justify-between transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <div className="flex items-center gap-3">
                  <Calculator className="w-6 h-6" />
                  <div className="text-left">
                    <p className="font-bold">Prorrateo Automático</p>
                    <p className="text-sm text-purple-100">
                      {horas.total > docenteInfo.horasProgramables 
                        ? `Reducir ${horas.total - docenteInfo.horasProgramables} hrs`
                        : `Ajustar ${docenteInfo.horasProgramables - horas.total} hrs`}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5" />
              </button>
            )}

            {/* Ayuda Contextual */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-blue-900 mb-2">
                    ¿Necesitas ayuda?
                  </h4>
                  <p className="text-sm text-blue-700 mb-3">
                    Recuerda que el sistema calcula automáticamente las horas según el
                    Criterio 1+2 de la Circular 003/2025.
                  </p>
                  <button className="text-sm font-medium text-blue-600 hover:text-blue-700 underline">
                    Ver guía completa
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Prorrateo */}
      {mostrarModalProrrateo && (
        <ModalProrrateo
          isOpen={mostrarModalProrrateo}
          onClose={() => setMostrarModalProrrateo(false)}
          distribucionActual={{
            docencia: horas.docencia,
            investigacion: horas.investigacion,
            extension: horas.extension,
            complementarias: horas.complementarias,
            total: horas.total
          }}
          horasProgramables={docenteInfo.horasProgramables}
          tipoVinculacion={docenteInfo.tipoVinculacion}
          onAplicar={(distribucionNueva) => {
            // Aplicar prorrateo a las actividades
            const factorDocencia = distribucionNueva.docencia / horas.docencia;
            const factorInvestigacion = distribucionNueva.investigacion / horas.investigacion;
            const factorExtension = distribucionNueva.extension / horas.extension;
            const factorComplementarias = distribucionNueva.complementarias / horas.complementarias;

            // Prorratear actividades de docencia
            const nuevasActividadesDocencia = ptaDraft.actividadesDocencia.map(act => ({
              ...act,
              horasPTA: Math.round(act.horasPTA * factorDocencia)
            }));

            // Prorratear actividades de investigación
            const nuevasActividadesInvestigacion = ptaDraft.actividadesInvestigacion.map(act => ({
              ...act,
              horas: Math.round(act.horas * (act.recibeEstimulo ? 1 : factorInvestigacion))
            }));

            // Prorratear actividades de extensión
            const nuevasActividadesExtension = ptaDraft.actividadesExtension.map(act => ({
              ...act,
              horas: Math.round(act.horas * factorExtension)
            }));

            // Prorratear actividades complementarias
            const nuevasActividadesComplementarias = ptaDraft.actividadesComplementarias.map(act => ({
              ...act,
              horas: Math.round(act.horas * factorComplementarias)
            }));

            setPTADraft({
              ...ptaDraft,
              actividadesDocencia: nuevasActividadesDocencia,
              actividadesInvestigacion: nuevasActividadesInvestigacion,
              actividadesExtension: nuevasActividadesExtension,
              actividadesComplementarias: nuevasActividadesComplementarias
            });

            setMostrarModalProrrateo(false);
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// COMPONENTES DE PASOS (Simplificados - se expandirán después)
// ============================================================================

function Paso1InformacionDocente({ docente }: { docente: DocenteInfo }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Información del Docente</h2>
      <p className="text-gray-600 mb-6">
        Verifica que tu información sea correcta. Si encuentras errores, contacta a Talento Humano.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InfoField label="Cédula" value={docente.cedula} icon={User} />
        <InfoField label="Nombre Completo" value={docente.nombreCompleto} icon={User} />
        <InfoField label="Perfil Académico" value={docente.perfilAcademico} icon={Award} />
        <InfoField label="Categoría" value={docente.categoria} icon={Award} />
        <InfoField label="Sede de Vinculación" value={docente.sedeVinculacion} icon={Building2} />
        <InfoField label="Tipo de Vinculación" value={docente.tipoVinculacion} icon={Calendar} />
        <InfoField label="Dedicación" value={docente.tipoDedicacion === 'TC' ? 'Tiempo Completo' : 'Medio Tiempo'} icon={Clock} />
        <InfoField label="Horas Programables" value={`${docente.horasProgramables} horas`} icon={TrendingUp} />
      </div>
    </div>
  );
}

function InfoField({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-gray-500" />
        <p className="text-sm text-gray-600">{label}</p>
      </div>
      <p className="font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function Paso2Docencia({
  actividades,
  onChange
}: {
  actividades: ActividadDocencia[];
  onChange: (actividades: ActividadDocencia[]) => void;
}) {
  return <FormularioDocencia actividades={actividades} onChange={onChange} />;
}

function Paso3Investigacion({
  actividades,
  horasProgramables,
  onChange
}: {
  actividades: ActividadInvestigacion[];
  horasProgramables: number;
  onChange: (actividades: ActividadInvestigacion[]) => void;
}) {
  return (
    <FormularioInvestigacion
      actividades={actividades}
      horasProgramables={horasProgramables}
      onChange={onChange}
    />
  );
}

function Paso4ExtensionComplementarias({
  actividadesExtension,
  actividadesComplementarias,
  horasProgramables,
  onChangeExtension,
  onChangeComplementarias
}: {
  actividadesExtension: ActividadExtension[];
  actividadesComplementarias: ActividadComplementaria[];
  horasProgramables: number;
  onChangeExtension: (actividades: ActividadExtension[]) => void;
  onChangeComplementarias: (actividades: ActividadComplementaria[]) => void;
}) {
  return (
    <div className="space-y-8">
      {/* Extensión */}
      <FormularioExtension
        actividades={actividadesExtension}
        horasProgramables={horasProgramables}
        onChange={onChangeExtension}
      />

      {/* Separador */}
      <div className="border-t border-gray-300 my-8" />

      {/* Complementarias */}
      <FormularioComplementarias
        actividades={actividadesComplementarias}
        horasProgramables={horasProgramables}
        onChange={onChangeComplementarias}
      />
    </div>
  );
}

function Paso5Revision({
  pta,
  horas,
  validationErrors,
  onEnviar,
  onVolver
}: {
  pta: PTADraft;
  horas: any;
  validationErrors: ValidationError[];
  onEnviar: () => void;
  onVolver: () => void;
}) {
  // Convertir ValidationError a Validacion
  const validaciones = validationErrors.map((error, index) => ({
    id: `val-${index}`,
    descripcion: error.message,
    estado: error.severity === 'error' ? 'error' as const : 
            error.severity === 'warning' ? 'warning' as const : 'ok' as const,
    severidad: error.severity === 'error' ? 'bloqueante' as const : 
              error.severity === 'warning' ? 'advertencia' as const : 'info' as const
  }));

  return (
    <PanelRevision
      docenteInfo={pta.docente}
      actividadesDocencia={pta.actividadesDocencia}
      actividadesInvestigacion={pta.actividadesInvestigacion}
      actividadesExtension={pta.actividadesExtension}
      actividadesComplementarias={pta.actividadesComplementarias}
      validaciones={validaciones}
      onEnviar={onEnviar}
      onVolver={onVolver}
    />
  );
}
