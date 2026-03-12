/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FORMULARIO PROCESO AUDITABLE - CUESTIONARIO DAFP VISUAL
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * ✅ IMPLEMENTACIÓN EXACTA según CUESTIONARIO_FLUJO_DAFP_VISUAL.md
 * 
 * ENCABEZADO:
 * - Proceso/Proyecto/Procedimiento
 * - Vigencia
 * - Fecha de Corte
 * 
 * SECCIÓN 1: Número de Riesgos Inherentes (D, E, F, G, H)
 * SECCIÓN 2: Requerimientos Especiales (J, K)
 * SECCIÓN 3: Información de Auditoría Anterior (L, N)
 * 
 * CÁLCULO AUTOMÁTICO EN TIEMPO REAL
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Save, Layers, AlertTriangle, Calendar, TrendingUp,
  CheckCircle2, Clock, Info, Activity, BarChart3, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import {
  type NivelRiesgo,
  type ResultadoAuditoria,
  type DecisionRotacion,
  type DecisionFinal,
  calcularPonderacionRiesgo,
  calcularDiasTranscurridos,
  obtenerPlanRotacion,
  calcularDecisionRotacion,
  calcularDecisionFinal,
  getColorRiesgo,
  getEmojiRiesgo
} from './dafp-utils';

// ════════════════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════════════════

export interface FormularioDafpData {
  // ENCABEZADO
  nombre: string;                        // Proceso/Proyecto/Procedimiento
  vigencia: number;                      // Año
  fechaCorte: string;                    // Fecha de corte

  // SECCIÓN 1: Número de Riesgos Inherentes
  riesgosExtremos: number;               // D
  riesgosAltos: number;                  // E
  riesgosModerados: number;              // F
  riesgosBajos: number;                  // G
  totalRiesgos: number;                  // H (auto-calculado)

  // SECCIÓN 2: Requerimientos Especiales
  requerimientoComite: boolean;          // J
  requerimientoEntesReg: boolean;        // K

  // SECCIÓN 3: Información de Auditoría Anterior
  fechaUltimaAuditoria: string | null;   // L
  resultadoUltimaAuditoria: ResultadoAuditoria;  // N

  // CÁLCULOS AUTOMÁTICOS
  ponderacionRiesgo: NivelRiesgo;        // I12
  diasTranscurridos: number | null;      // M12
  planRotacion: string;                  // O12
  diasRotacion: number;                  // P12
  decisionRotacion: DecisionRotacion;    // Q12
  decisionFinal: DecisionFinal;          // R12
  motivoDecision: string;
  prioridadRegla: number;                // 1-5

  // Metadatos (opcionales para compatibilidad)
  id?: string;
  codigo?: string;
  macroproceso?: string;
  tipoProceso?: string;
  dependenciaResponsable?: string;
  nivelRiesgo?: string;
  scoreRiesgo?: number;
  ultimaAuditoria?: string;
  numeroAuditorias?: number;
  frecuenciaSugerida?: string;
  horasEstimadas?: number;
  auditable?: boolean;
}

export interface ProcesoParaSelect {
  id: string;
  nombre: string;
  codigo: string;
}

interface FormularioProcesoDafpProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (proceso: FormularioDafpData, procesoId?: string) => void;
  procesoInicial?: FormularioDafpData | null;
  mode: 'create' | 'edit';
  /** Procesos activos del catálogo (para dropdown obligatorio) */
  procesosCatalog?: ProcesoParaSelect[];
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

export function FormularioProcesoDafpVisual({
  open,
  onClose,
  onSubmit,
  procesoInicial,
  mode,
  procesosCatalog = [],
}: FormularioProcesoDafpProps) {
  
  const [procesoIdSeleccionado, setProcesoIdSeleccionado] = useState<string>(procesoInicial?.id || '');
  const [formData, setFormData] = useState<FormularioDafpData>({
    nombre: procesoInicial?.nombre || '',
    vigencia: procesoInicial?.vigencia || new Date().getFullYear(),
    fechaCorte: procesoInicial?.fechaCorte || new Date().toISOString().split('T')[0],

    riesgosExtremos: procesoInicial?.riesgosExtremos || 0,
    riesgosAltos: procesoInicial?.riesgosAltos || 0,
    riesgosModerados: procesoInicial?.riesgosModerados || 0,
    riesgosBajos: procesoInicial?.riesgosBajos || 0,
    totalRiesgos: procesoInicial?.totalRiesgos || 0,

    requerimientoComite: procesoInicial?.requerimientoComite || false,
    requerimientoEntesReg: procesoInicial?.requerimientoEntesReg || false,

    fechaUltimaAuditoria: procesoInicial?.fechaUltimaAuditoria || null,
    resultadoUltimaAuditoria: procesoInicial?.resultadoUltimaAuditoria || 'Sin auditoría previa',

    ponderacionRiesgo: procesoInicial?.ponderacionRiesgo || 'MUY BAJO',
    diasTranscurridos: procesoInicial?.diasTranscurridos || null,
    planRotacion: procesoInicial?.planRotacion || '1 año',
    diasRotacion: procesoInicial?.diasRotacion || 360,
    decisionRotacion: procesoInicial?.decisionRotacion || 'Incluir',
    decisionFinal: procesoInicial?.decisionFinal || 'AUDITORÍA POSTERIOR',
    motivoDecision: procesoInicial?.motivoDecision || '',
    prioridadRegla: procesoInicial?.prioridadRegla || 5,

    // Campos de compatibilidad
    codigo: procesoInicial?.codigo || '',
    macroproceso: procesoInicial?.macroproceso || '',
    tipoProceso: procesoInicial?.tipoProceso || 'Apoyo',
    dependenciaResponsable: procesoInicial?.dependenciaResponsable || '',
    horasEstimadas: procesoInicial?.horasEstimadas || 60,
    auditable: procesoInicial?.auditable !== undefined ? procesoInicial.auditable : true
  });

  // ═══ CÁLCULOS AUTOMÁTICOS EN TIEMPO REAL ═══
  useEffect(() => {
    const total = formData.riesgosExtremos + formData.riesgosAltos + formData.riesgosModerados + formData.riesgosBajos;
    const ponderacion = calcularPonderacionRiesgo(
      formData.riesgosExtremos,
      formData.riesgosAltos,
      formData.riesgosModerados,
      formData.riesgosBajos,
      total
    );
    const dias = calcularDiasTranscurridos(formData.fechaUltimaAuditoria, formData.fechaCorte);
    const { plan, dias: diasRot } = obtenerPlanRotacion(ponderacion, formData.resultadoUltimaAuditoria);
    const decisionRot = calcularDecisionRotacion(dias, diasRot);
    const { decision, motivo, prioridad } = calcularDecisionFinal(
      formData.requerimientoComite,
      ponderacion,
      formData.requerimientoEntesReg,
      decisionRot
    );

    setFormData(prev => ({
      ...prev,
      totalRiesgos: total,
      ponderacionRiesgo: ponderacion,
      diasTranscurridos: dias,
      planRotacion: plan,
      diasRotacion: diasRot,
      decisionRotacion: decisionRot,
      decisionFinal: decision,
      motivoDecision: motivo,
      prioridadRegla: prioridad
    }));
  }, [
    formData.riesgosExtremos,
    formData.riesgosAltos,
    formData.riesgosModerados,
    formData.riesgosBajos,
    formData.requerimientoComite,
    formData.requerimientoEntesReg,
    formData.fechaUltimaAuditoria,
    formData.resultadoUltimaAuditoria,
    formData.fechaCorte
  ]);

  useEffect(() => {
    if (procesoInicial?.id) setProcesoIdSeleccionado(procesoInicial.id);
  }, [procesoInicial?.id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const usarCatalogo = procesosCatalog.length > 0;
    if (usarCatalogo && !procesoIdSeleccionado) {
      toast.error('Debe seleccionar un proceso del catálogo');
      return;
    }
    if (!formData.nombre) {
      toast.error('El nombre del proceso es obligatorio');
      return;
    }

    // Solo validar riesgos en modo EDICIÓN (evaluación)
    // En modo CREACIÓN, los riesgos son opcionales
    if (mode === 'edit' && formData.totalRiesgos === 0) {
      toast.error('Debe ingresar al menos un riesgo para evaluar');
      return;
    }
    
    // Mensaje diferente según si tiene evaluación o no
    if (formData.totalRiesgos > 0) {
      toast.success('✅ Proceso evaluado exitosamente', {
        description: `Decisión: ${formData.decisionFinal}`,
        duration: 5000
      });
    } else {
      toast.success('✅ Proceso creado exitosamente', {
        description: 'Puede evaluarlo después con el botón "Evaluar"',
        duration: 5000
      });
    }

    onSubmit(formData, procesoIdSeleccionado || undefined);
  };

  const handleChange = (field: keyof FormularioDafpData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Calcular porcentajes para detalle del cálculo
  const detalleCalculo = useMemo(() => {
    const total = formData.totalRiesgos;
    if (total === 0) return null;

    const porcExtremos = (formData.riesgosExtremos / total) * 100;
    const porcExtremosAltos = ((formData.riesgosExtremos + formData.riesgosAltos) / total) * 100;
    const porcExtremosAltosMod = ((formData.riesgosExtremos + formData.riesgosAltos + formData.riesgosModerados) / total) * 100;
    const porcTodos = 100;

    return {
      extremos: porcExtremos.toFixed(2),
      extremosAltos: porcExtremosAltos.toFixed(2),
      extremosAltosMod: porcExtremosAltosMod.toFixed(2),
      todos: porcTodos.toFixed(2),
      reglaAplicada: porcExtremos >= 20 ? 1 : porcExtremosAltos >= 30 ? 2 : porcExtremosAltosMod >= 40 ? 3 : porcTodos >= 50 ? 4 : 5
    };
  }, [formData.riesgosExtremos, formData.riesgosAltos, formData.riesgosModerados, formData.riesgosBajos, formData.totalRiesgos]);

  if (!open) return null;

  const colorRiesgo = getColorRiesgo(formData.ponderacionRiesgo);
  const emojiRiesgo = getEmojiRiesgo(formData.ponderacionRiesgo);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col"
        >
          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* HEADER PREMIUM COMPACTO */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <div className="bg-gradient-to-r from-[#003DA5] to-[#2962FF] px-6 py-4 rounded-t-2xl flex items-center justify-between flex-shrink-0 border-b-4 border-[#F57C00]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                <Layers className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white leading-tight">
                  {mode === 'create' ? 'Agregar Proceso' : 'Editar Proceso'}
                </h2>
                <p className="text-xs text-white/80 font-medium">
                  Evaluación DAFP • Cálculo Automático
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-all"
              type="button"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* CONTENIDO SCROLLEABLE */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-5">
              
              {/* ═══ ENCABEZADO ═══ */}
              <div className="bg-gradient-to-br from-gray-50 to-blue-50/50 border-2 border-gray-200 rounded-xl p-5">
                <h3 className="text-sm font-black mb-4 flex items-center gap-2 text-[#003DA5]">
                  <Info className="w-4 h-4" />
                  INFORMACIÓN BÁSICA
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Proceso/Proyecto/Procedimiento <span className="text-red-500">*</span>
                    </label>
                    {procesosCatalog.length > 0 ? (
                      <select
                        value={procesoIdSeleccionado}
                        onChange={(e) => {
                          const id = e.target.value;
                          setProcesoIdSeleccionado(id);
                          const proc = procesosCatalog.find(p => p.id === id);
                          if (proc) {
                            setFormData(prev => ({ ...prev, nombre: proc.nombre, codigo: proc.codigo }));
                          }
                        }}
                        className="w-full px-3 py-2.5 text-sm border-2 border-gray-300 rounded-lg focus:border-[#2962FF] focus:ring-2 focus:ring-[#2962FF]/20 outline-none transition-all bg-white"
                        required
                      >
                        <option value="">-- Seleccione un proceso --</option>
                        {procesosCatalog.map((p) => (
                          <option key={p.id} value={p.id}>{p.nombre}</option>
                        ))}
                      </select>
                    ) : procesoInicial ? (
                      <input
                        type="text"
                        value={formData.nombre}
                        readOnly
                        className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-lg bg-gray-50"
                      />
                    ) : (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                        <AlertTriangle className="w-4 h-4 inline mr-2" />
                        Cree procesos en Configuración → Procesos primero.
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">
                        Vigencia <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={formData.vigencia}
                        onChange={(e) => handleChange('vigencia', parseInt(e.target.value))}
                        className="w-full px-3 py-2.5 text-sm border-2 border-gray-300 rounded-lg focus:border-[#2962FF] outline-none text-center font-bold transition-all"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">
                        Fecha de Corte <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={formData.fechaCorte}
                        onChange={(e) => handleChange('fechaCorte', e.target.value)}
                        className="w-full px-3 py-2.5 text-sm border-2 border-gray-300 rounded-lg focus:border-[#2962FF] outline-none transition-all"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* ═══ SECCIÓN 1: RIESGOS INHERENTES ═══ */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 border-2 border-blue-200 rounded-xl p-5">
                <h3 className="text-sm font-black mb-3 flex items-center gap-2 text-[#003DA5]">
                  <Activity className="w-4 h-4" />
                  RIESGOS INHERENTES
                </h3>
                <p className="text-xs text-gray-600 mb-4">
                  Número de riesgos por nivel de impacto y probabilidad:
                </p>
                
                <div className="grid grid-cols-4 gap-3 mb-3">
                  <div className="text-center">
                    <div className="text-2xl mb-1.5">🔴</div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      EXTREMO
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.riesgosExtremos}
                      onChange={(e) => handleChange('riesgosExtremos', parseInt(e.target.value) || 0)}
                      className="w-full px-2 py-2 text-base font-black border-2 border-red-300 rounded-lg focus:border-red-500 outline-none text-center transition-all"
                    />
                  </div>
                  <div className="text-center">
                    <div className="text-2xl mb-1.5">🟠</div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      ALTO
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.riesgosAltos}
                      onChange={(e) => handleChange('riesgosAltos', parseInt(e.target.value) || 0)}
                      className="w-full px-2 py-2 text-base font-black border-2 border-orange-300 rounded-lg focus:border-orange-500 outline-none text-center transition-all"
                    />
                  </div>
                  <div className="text-center">
                    <div className="text-2xl mb-1.5">🟡</div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      MODERADO
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.riesgosModerados}
                      onChange={(e) => handleChange('riesgosModerados', parseInt(e.target.value) || 0)}
                      className="w-full px-2 py-2 text-base font-black border-2 border-yellow-300 rounded-lg focus:border-yellow-500 outline-none text-center transition-all"
                    />
                  </div>
                  <div className="text-center">
                    <div className="text-2xl mb-1.5">🟢</div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      BAJO
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.riesgosBajos}
                      onChange={(e) => handleChange('riesgosBajos', parseInt(e.target.value) || 0)}
                      className="w-full px-2 py-2 text-base font-black border-2 border-green-300 rounded-lg focus:border-green-500 outline-none text-center transition-all"
                    />
                  </div>
                </div>

                <div className="bg-white rounded-lg p-3 border-2 border-blue-300">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-700">TOTAL:</span>
                    <span className="text-2xl font-black text-[#003DA5]">
                      {formData.totalRiesgos}
                    </span>
                  </div>
                </div>
              </div>

              {/* ═══ SECCIÓN 2: REQUERIMIENTOS ESPECIALES ═══ */}
              <div className="bg-gradient-to-br from-orange-50 to-red-50/50 border-2 border-orange-200 rounded-xl p-5">
                <h3 className="text-sm font-black mb-3 flex items-center gap-2 text-[#003DA5]">
                  <AlertTriangle className="w-4 h-4" />
                  REQUERIMIENTOS ESPECIALES
                </h3>
                <div className="bg-orange-100 border-2 border-orange-400 rounded-lg p-3 mb-4">
                  <p className="text-sm font-bold text-orange-800 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    ⚠️ Si alguno es "SÍ", el proceso se incluye AUTOMÁTICAMENTE en el Plan Anual
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="bg-white rounded-lg p-4 border-2 border-orange-300">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-bold text-gray-700">
                        ¿Requerimiento del Comité de Auditoría o la Dirección? (J)
                      </label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="requerimientoComite"
                            checked={formData.requerimientoComite === true}
                            onChange={() => handleChange('requerimientoComite', true)}
                            className="w-5 h-5"
                          />
                          <span className="text-base font-bold">Sí</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="requerimientoComite"
                            checked={formData.requerimientoComite === false}
                            onChange={() => handleChange('requerimientoComite', false)}
                            className="w-5 h-5"
                          />
                          <span className="text-base font-bold">No</span>
                        </label>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-4 border-2 border-orange-300">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-bold text-gray-700">
                        ¿Requerimiento de Entes Reguladores? (K)
                      </label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="requerimientoEntesReg"
                            checked={formData.requerimientoEntesReg === true}
                            onChange={() => handleChange('requerimientoEntesReg', true)}
                            className="w-5 h-5"
                          />
                          <span className="text-base font-bold">Sí</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="requerimientoEntesReg"
                            checked={formData.requerimientoEntesReg === false}
                            onChange={() => handleChange('requerimientoEntesReg', false)}
                            className="w-5 h-5"
                          />
                          <span className="text-base font-bold">No</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ═══ SECCIÓN 3: INFORMACIÓN DE AUDITORÍA ANTERIOR ═══ */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50/50 border-2 border-purple-200 rounded-xl p-5">
                <h3 className="text-sm font-black mb-3 flex items-center gap-2 text-[#003DA5]">
                  <Calendar className="w-4 h-4" />
                  INFORMACIÓN DE AUDITORÍA ANTERIOR
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Fecha de Última Auditoría (L)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="date"
                        value={formData.fechaUltimaAuditoria || ''}
                        onChange={(e) => {
                          const valor = e.target.value || null;
                          handleChange('fechaUltimaAuditoria', valor);
                          if (!valor) {
                            handleChange('resultadoUltimaAuditoria', 'Sin auditoría previa');
                          }
                        }}
                        max={formData.fechaCorte}
                        className="flex-1 px-3 py-2.5 text-sm border-2 border-gray-300 rounded-lg focus:border-[#003DA5] outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          handleChange('fechaUltimaAuditoria', null);
                          handleChange('resultadoUltimaAuditoria', 'Sin auditoría previa');
                        }}
                        className="px-3 py-2.5 bg-gray-200 hover:bg-gray-300 rounded-lg text-xs font-bold transition-colors whitespace-nowrap"
                      >
                        Sin auditoría previa
                      </button>
                    </div>
                  </div>

                  {formData.fechaUltimaAuditoria && (
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        Resultado de la Última Auditoría (N)
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <label className="flex items-center justify-center gap-2 p-3 bg-white rounded-lg border-2 border-purple-300 cursor-pointer hover:bg-purple-50 transition-colors">
                          <input
                            type="radio"
                            name="resultadoUltimaAuditoria"
                            checked={formData.resultadoUltimaAuditoria === 'Adecuado'}
                            onChange={() => handleChange('resultadoUltimaAuditoria', 'Adecuado')}
                            className="w-4 h-4"
                          />
                          <span className="text-sm font-bold">✅ Adecuado</span>
                        </label>
                        <label className="flex items-center justify-center gap-2 p-3 bg-white rounded-lg border-2 border-purple-300 cursor-pointer hover:bg-purple-50 transition-colors">
                          <input
                            type="radio"
                            name="resultadoUltimaAuditoria"
                            checked={formData.resultadoUltimaAuditoria === 'Inadecuado'}
                            onChange={() => handleChange('resultadoUltimaAuditoria', 'Inadecuado')}
                            className="w-4 h-4"
                          />
                          <span className="text-sm font-bold">❌ Inadecuado</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ═══════════════════════════════════════════════════════════════ */}
              {/* PANEL DE RESULTADOS COMPACTO */}
              {/* ═══════════════════════════════════════════════════════════════ */}
              {formData.totalRiesgos > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-br from-green-50 to-emerald-50/50 border-2 border-green-300 rounded-xl p-5"
                >
                  <h3 className="text-sm font-black mb-4 flex items-center gap-2 text-[#003DA5]">
                    <BarChart3 className="w-4 h-4" />
                    RESULTADOS DEL CÁLCULO DAFP
                  </h3>

                  {/* Resultados en Grid Compacto */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                    {/* Ponderación de Riesgo */}
                    <div className="bg-white rounded-lg p-3 border-2 border-green-300">
                      <div className="text-xs font-bold text-gray-600 mb-1">Ponderación Riesgo</div>
                      <div 
                        className="text-lg font-black flex items-center gap-1"
                        style={{ color: colorRiesgo }}
                      >
                        {emojiRiesgo} {formData.ponderacionRiesgo}
                      </div>
                    </div>

                    {/* Días Transcurridos */}
                    <div className="bg-white rounded-lg p-3 border-2 border-green-300">
                      <div className="text-xs font-bold text-gray-600 mb-1">Días Transcurridos</div>
                      <div className="text-lg font-black text-[#003DA5]">
                        {formData.diasTranscurridos !== null ? formData.diasTranscurridos : 'N/A'}
                      </div>
                    </div>

                    {/* Plan de Rotación */}
                    <div className="bg-white rounded-lg p-3 border-2 border-green-300">
                      <div className="text-xs font-bold text-gray-600 mb-1">Plan Rotación</div>
                      <div className="text-lg font-black text-[#003DA5]">
                        {formData.planRotacion}
                      </div>
                    </div>

                    {/* Decisión Rotación */}
                    <div className="bg-white rounded-lg p-3 border-2 border-green-300">
                      <div className="text-xs font-bold text-gray-600 mb-1">Decisión Rotación</div>
                      <div className={`text-sm font-black ${
                        formData.decisionRotacion === 'Incluir' ? 'text-green-600' : 'text-orange-600'
                      }`}>
                        {formData.decisionRotacion === 'Incluir' ? '✅' : '⏱️'} {formData.decisionRotacion}
                      </div>
                    </div>

                    {/* Prioridad */}
                    <div className="bg-white rounded-lg p-3 border-2 border-green-300">
                      <div className="text-xs font-bold text-gray-600 mb-1">Prioridad</div>
                      <div className="text-lg font-black text-[#003DA5]">
                        Regla {formData.prioridadRegla}
                      </div>
                    </div>

                    {/* Decisión Final */}
                    <div className="bg-white rounded-lg p-3 border-2 border-green-300 col-span-1">
                      <div className="text-xs font-bold text-gray-600 mb-1">Decisión Final</div>
                      <div className={`text-xs font-black ${
                        formData.decisionFinal === 'AUDITORÍA INMEDIATA' ? 'text-red-600' :
                        formData.decisionFinal === 'AUDITORÍA POSTERIOR' ? 'text-orange-600' :
                        'text-gray-600'
                      }`}>
                        {formData.decisionFinal}
                      </div>
                    </div>
                  </div>

                  {/* Motivo de la Decisión */}
                  {formData.motivoDecision && (
                    <div className="bg-blue-100 border-2 border-blue-300 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="text-xs font-bold text-blue-800 mb-1">Motivo de la Decisión:</div>
                          <div className="text-xs text-blue-700 leading-relaxed">
                            {formData.motivoDecision}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Detalle del Cálculo (Opcional - Colapsable) */}
                  {detalleCalculo && (
                    <details className="mt-3">
                      <summary className="text-xs font-bold text-gray-600 cursor-pointer hover:text-[#003DA5] transition-colors">
                        Ver detalle del cálculo de ponderación
                      </summary>
                      <div className="mt-2 bg-white rounded-lg p-3 border border-gray-300 text-xs space-y-1">
                        <div className="flex justify-between">
                          <span>Extremos ({formData.riesgosExtremos}/{formData.totalRiesgos}):</span>
                          <span className="font-bold">{detalleCalculo.extremos}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Extremos + Altos ({formData.riesgosExtremos + formData.riesgosAltos}/{formData.totalRiesgos}):</span>
                          <span className="font-bold">{detalleCalculo.extremosAltos}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>E + A + Moderados ({formData.riesgosExtremos + formData.riesgosAltos + formData.riesgosModerados}/{formData.totalRiesgos}):</span>
                          <span className="font-bold">{detalleCalculo.extremosAltosMod}%</span>
                        </div>
                        <div className="pt-2 border-t border-gray-200 flex justify-between text-[#003DA5]">
                          <span className="font-bold">Regla Aplicada:</span>
                          <span className="font-black">#{detalleCalculo.reglaAplicada}</span>
                        </div>
                      </div>
                    </details>
                  )}
                </motion.div>
              )}
            </div>

            {/* Footer con botones */}
            <div className="sticky bottom-0 bg-gradient-to-t from-white via-white to-transparent px-8 py-5 border-t-2 border-gray-200 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 bg-gray-200 hover:bg-gray-300 rounded-xl font-bold transition-all flex items-center gap-2"
              >
                <X className="w-5 h-5" />
                Cancelar
              </button>
              <button
                type="submit"
                className="px-8 py-3 bg-gradient-to-r from-[#003DA5] to-[#0055CC] text-white rounded-xl font-bold hover:shadow-xl transition-all flex items-center gap-2"
              >
                <Save className="w-5 h-5" />
                {mode === 'create' ? 'Guardar Proceso' : 'Actualizar Proceso'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}