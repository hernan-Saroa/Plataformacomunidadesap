/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FORMULARIO PROCESO AUDITABLE — EVALUACIÓN DAFP RE-E-GE-034
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Metodología:
 *   Ponderación = RI×0.4 + Tiempo×0.1 + Alta Dirección×0.1 + Obj×0.1 + Hallazgos×0.3
 *
 * SECCIÓN 1: Información Básica (proceso, macroproceso, dependencia, vigencia, corte)
 * SECCIÓN 2: Riesgo Inherente — contadores +/−
 * SECCIÓN 3: Criterios de Priorización (4 criterios con calificación automática)
 * SECCIÓN 4: Resultados DAFP (ponderación, criticidad, ciclo, priorización años 1–4)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Save, Layers, AlertTriangle,
  Info, Activity, BarChart3, Target
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import {
  type NivelRiesgo,
  type ResultadoAuditoria,
  type DecisionRotacion,
  type DecisionFinal,
  calcularPonderacionRiesgo,
} from './dafp-utils';

// ════════════════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════════════════

export interface FormularioDafpData {
  // ENCABEZADO
  nombre: string;
  vigencia: number;
  fechaCorte: string;

  // SECCIÓN 1: Número de Riesgos Inherentes
  riesgosExtremos: number;
  riesgosAltos: number;
  riesgosModerados: number;
  riesgosBajos: number;
  totalRiesgos: number;

  // SECCIÓN 2: Criterios de Priorización DAFP
  tiempoUltimaAuditoria: number;   // 1–5
  temasAltaDireccion: number;      // 2–5
  objetivosEstrategicos: number;   // 2–5
  hallazgosAnteriores: number;     // 1–5

  // Resultados calculados DAFP
  ponderacionFinalDafp: number;
  nivelCriticidadDafp: string;
  cicloRotacionDafp: string;

  // ══ Campos heredados para compatibilidad con el backend / otras vistas ══
  requerimientoComite: boolean;
  requerimientoEntesReg: boolean;
  fechaUltimaAuditoria: string | null;
  resultadoUltimaAuditoria: ResultadoAuditoria;
  ponderacionRiesgo: NivelRiesgo;
  diasTranscurridos: number | null;
  planRotacion: string;
  diasRotacion: number;
  decisionRotacion: DecisionRotacion;
  decisionFinal: DecisionFinal;
  motivoDecision: string;
  prioridadRegla: number;
  criticidad?: number;
  exposicion?: number;
  mitigantes?: number;
  scoreRiesgoCEM?: number;
  nivelRiesgoCEM?: 'Bajo' | 'Moderado' | 'Alto' | 'Crítico';

  // Metadatos
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
  macroproceso?: string;
  dependencia?: string;
  tipo?: string; // 'Misional' | 'Estratégico' | 'Apoyo' | 'Territorial'
}

interface FormularioProcesoDafpProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (proceso: FormularioDafpData, procesoId?: string) => void;
  procesoInicial?: FormularioDafpData | null;
  mode: 'create' | 'edit';
  procesosCatalog?: ProcesoParaSelect[];
}

// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════

/** RI cuantitativo: primer nivel con ≥1 riesgo */
function calcRiCuan(e: number, a: number, m: number, b: number): number {
  if (e >= 1) return 5;
  if (a >= 1) return 4;
  if (m >= 1) return 3;
  if (b >= 1) return 2;
  return 0;
}

/** RI cualitativo */
function calcRiCual(e: number, a: number, m: number, b: number): string {
  if (e >= 1) return 'Extremo';
  if (a >= 1) return 'Alto';
  if (m >= 1) return 'Moderado';
  if (b >= 1) return 'Bajo';
  return '—';
}

/** Fórmula DAFP ponderada */
function calcPonderacion(riCuan: number, tiempo: number, ad: number, obj: number, hall: number): number {
  return +(riCuan * 0.4 + tiempo * 0.1 + ad * 0.1 + obj * 0.1 + hall * 0.3).toFixed(2);
}

function calcNivel(pond: number): string {
  if (pond >= 4.0) return 'Extremo';
  if (pond >= 3.5) return 'Alto';
  if (pond >= 3.0) return 'Moderado';
  return 'Bajo';
}

function calcCiclo(nivel: string): string {
  if (nivel === 'Extremo') return 'Cada año';
  if (nivel === 'Alto' || nivel === 'Moderado') return 'Cada 2 años';
  return 'Cada 3 años';
}

/** Priorización años 1–4 según ciclo (lógica del cuestionario DAFP) */
function calcAnos(ciclo: string): [boolean, boolean, boolean, boolean] {
  return [
    ciclo === 'Cada año',
    ciclo === 'Cada año' || ciclo === 'Cada 2 años',
    ciclo === 'Cada año' || ciclo === 'Cada 3 años',
    ciclo === 'Cada año' || ciclo === 'Cada 2 años',
  ];
}

function nivelColorClasses(nivel: string) {
  switch (nivel) {
    case 'Extremo': return { box: 'bg-red-50 border-red-300', badge: 'bg-red-100 text-red-800', score: 'text-red-700' };
    case 'Alto':    return { box: 'bg-orange-50 border-orange-300', badge: 'bg-orange-100 text-orange-800', score: 'text-orange-700' };
    case 'Moderado':return { box: 'bg-yellow-50 border-yellow-300', badge: 'bg-yellow-100 text-yellow-800', score: 'text-yellow-700' };
    default:        return { box: 'bg-green-50 border-green-300', badge: 'bg-green-100 text-green-800', score: 'text-green-700' };
  }
}

const TIEMPO_OPTIONS = [
  { value: 1, label: '<= 1 año' },
  { value: 2, label: '> 1 año <= 2 años' },
  { value: 3, label: '> 2 años <= 3 años' },
  { value: 4, label: '> 3 años <= 4 años' },
  { value: 5, label: '> 4 años / Nunca auditado' },
];

const AD_OPTIONS = [
  { value: 2, label: 'Interés bajo' },
  { value: 3, label: 'Interés medio' },
  { value: 4, label: 'Interés alto' },
  { value: 5, label: 'Interés muy relevante' },
];

const OBJ_OPTIONS = [
  { value: 2, label: '1 objetivo estratégico' },
  { value: 3, label: '2 objetivos estratégicos' },
  { value: 4, label: '3 objetivos estratégicos' },
  { value: 5, label: '4 o más objetivos estratégicos' },
];

const HALL_OPTIONS = [
  { value: 1, label: 'Sin hallazgos' },
  { value: 2, label: '1 a 2 hallazgos' },
  { value: 3, label: '3 a 4 hallazgos' },
  { value: 4, label: '5 a 6 hallazgos' },
  { value: 5, label: '7 o más hallazgos' },
];

function getVigenciaFromStorage(): number {
  try {
    const raw = localStorage.getItem('esap:plan_anual_activo');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.vigencia && typeof parsed.vigencia === 'number') return parsed.vigencia;
    }
  } catch {
    // ignore
  }
  return new Date().getFullYear();
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

  const defaultData = (): FormularioDafpData => ({
    nombre: '',
    vigencia: getVigenciaFromStorage(),
    fechaCorte: new Date().toISOString().split('T')[0],
    riesgosExtremos: 0,
    riesgosAltos: 0,
    riesgosModerados: 0,
    riesgosBajos: 0,
    totalRiesgos: 0,
    tiempoUltimaAuditoria: 0,
    temasAltaDireccion: 0,
    objetivosEstrategicos: 0,
    hallazgosAnteriores: 0,
    ponderacionFinalDafp: 0,
    nivelCriticidadDafp: '',
    cicloRotacionDafp: '',
    // compatibilidad
    requerimientoComite: false,
    requerimientoEntesReg: false,
    fechaUltimaAuditoria: null,
    resultadoUltimaAuditoria: 'Sin auditoría previa',
    ponderacionRiesgo: 'MUY BAJO',
    diasTranscurridos: null,
    planRotacion: '1 año',
    diasRotacion: 360,
    decisionRotacion: 'Incluir',
    decisionFinal: 'AUDITORÍA POSTERIOR',
    motivoDecision: '',
    prioridadRegla: 5,
    codigo: '',
    macroproceso: '',
    tipoProceso: 'Apoyo',
    dependenciaResponsable: '',
    horasEstimadas: 60,
    auditable: true,
  });

  const fromInicial = (p: FormularioDafpData): FormularioDafpData => ({
    ...defaultData(),
    nombre: p.nombre || '',
    vigencia: p.vigencia ?? new Date().getFullYear(),
    fechaCorte: p.fechaCorte || new Date().toISOString().split('T')[0],
    riesgosExtremos: p.riesgosExtremos ?? 0,
    riesgosAltos: p.riesgosAltos ?? 0,
    riesgosModerados: p.riesgosModerados ?? 0,
    riesgosBajos: p.riesgosBajos ?? 0,
    totalRiesgos: p.totalRiesgos ?? 0,
    tiempoUltimaAuditoria: p.tiempoUltimaAuditoria ?? 0,
    temasAltaDireccion: p.temasAltaDireccion ?? 0,
    objetivosEstrategicos: p.objetivosEstrategicos ?? 0,
    hallazgosAnteriores: p.hallazgosAnteriores ?? 0,
    ponderacionFinalDafp: p.ponderacionFinalDafp ?? 0,
    nivelCriticidadDafp: p.nivelCriticidadDafp ?? '',
    cicloRotacionDafp: p.cicloRotacionDafp ?? '',
    codigo: p.codigo || '',
    macroproceso: p.macroproceso || '',
    tipoProceso: p.tipoProceso || 'Apoyo',
    dependenciaResponsable: p.dependenciaResponsable || '',
    horasEstimadas: p.horasEstimadas ?? 60,
    auditable: p.auditable !== undefined ? p.auditable : true,
    // compat
    requerimientoComite: p.requerimientoComite ?? false,
    requerimientoEntesReg: p.requerimientoEntesReg ?? false,
    fechaUltimaAuditoria: p.fechaUltimaAuditoria ?? null,
    resultadoUltimaAuditoria: p.resultadoUltimaAuditoria || 'Sin auditoría previa',
    ponderacionRiesgo: p.ponderacionRiesgo || 'MUY BAJO',
    diasTranscurridos: p.diasTranscurridos ?? null,
    planRotacion: p.planRotacion || '1 año',
    diasRotacion: p.diasRotacion ?? 360,
    decisionRotacion: p.decisionRotacion || 'Incluir',
    decisionFinal: p.decisionFinal || 'AUDITORÍA POSTERIOR',
    motivoDecision: p.motivoDecision || '',
    prioridadRegla: p.prioridadRegla ?? 5,
  });

  const [formData, setFormData] = useState<FormularioDafpData>(
    procesoInicial ? fromInicial(procesoInicial) : defaultData()
  );

  // ══ Sincronizar al abrir / cambiar proceso ══
  const prevOpenRef = useRef(false);
  const prevProcesoIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const justOpened = open && !prevOpenRef.current;
    const procesoChanged = open && procesoInicial?.id && procesoInicial.id !== prevProcesoIdRef.current;
    prevOpenRef.current = open;
    if (procesoInicial?.id) prevProcesoIdRef.current = procesoInicial.id;
    if (!open || !procesoInicial) return;
    if (!justOpened && !procesoChanged) return;
    setFormData(fromInicial(procesoInicial));
    if (procesoInicial.id) setProcesoIdSeleccionado(procesoInicial.id);
  }, [open, procesoInicial?.id, procesoInicial]);

  // ══ Cálculo DAFP en tiempo real ══
  useEffect(() => {
    const { riesgosExtremos: e, riesgosAltos: a, riesgosModerados: m, riesgosBajos: b } = formData;
    const total = e + a + m + b;
    const riCuan = calcRiCuan(e, a, m, b);
    const tiempo = formData.tiempoUltimaAuditoria;
    const ad = formData.temasAltaDireccion;
    const obj = formData.objetivosEstrategicos;
    const hall = formData.hallazgosAnteriores;

    const allFilled = total > 0 && tiempo > 0 && ad > 0 && obj > 0 && hall > 0;
    if (!allFilled) {
      setFormData(prev => ({
        ...prev,
        totalRiesgos: total,
        ponderacionFinalDafp: 0,
        nivelCriticidadDafp: '',
        cicloRotacionDafp: '',
      }));
      return;
    }

    const pond = calcPonderacion(riCuan, tiempo, ad, obj, hall);
    const nivel = calcNivel(pond);
    const ciclo = calcCiclo(nivel);

    // También actualizar campos legacy para compatibilidad con el resto del sistema
    const ponderacionRiesgo = calcularPonderacionRiesgo(e, a, m, total);

    setFormData(prev => ({
      ...prev,
      totalRiesgos: total,
      ponderacionFinalDafp: pond,
      nivelCriticidadDafp: nivel,
      cicloRotacionDafp: ciclo,
      ponderacionRiesgo,
      decisionFinal: pond >= 3.0 ? 'INCLUIR PLAN ANUAL' : 'AUDITORÍA POSTERIOR',
      motivoDecision: `${nivel} — ${ciclo}. Aprobado por el Comité Institucional de Coordinación de Control Interno.`,
      prioridadRegla: pond >= 4.0 ? 1 : pond >= 3.5 ? 2 : pond >= 3.0 ? 3 : 4,
    }));
  }, [
    formData.riesgosExtremos, formData.riesgosAltos, formData.riesgosModerados, formData.riesgosBajos,
    formData.tiempoUltimaAuditoria, formData.temasAltaDireccion,
    formData.objetivosEstrategicos, formData.hallazgosAnteriores,
  ]);

  const handleChange = (field: keyof FormularioDafpData, value: any) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  const adjRiesgo = (campo: keyof FormularioDafpData, delta: number) =>
    setFormData(prev => ({ ...prev, [campo]: Math.max(0, (prev[campo] as number) + delta) }));

  // ══ Derivados para el render ══
  const riCuan = calcRiCuan(
    formData.riesgosExtremos, formData.riesgosAltos,
    formData.riesgosModerados, formData.riesgosBajos
  );
  const riCual = calcRiCual(
    formData.riesgosExtremos, formData.riesgosAltos,
    formData.riesgosModerados, formData.riesgosBajos
  );
  const allFilled =
    formData.totalRiesgos > 0 &&
    formData.tiempoUltimaAuditoria > 0 &&
    formData.temasAltaDireccion > 0 &&
    formData.objetivosEstrategicos > 0 &&
    formData.hallazgosAnteriores > 0;

  const nivel = formData.nivelCriticidadDafp;
  const ciclo = formData.cicloRotacionDafp;
  const pond = formData.ponderacionFinalDafp;
  const [a1, a2, a3, a4] = allFilled ? calcAnos(ciclo) : [false, false, false, false];
  const colores = allFilled ? nivelColorClasses(nivel) : { box: 'bg-gray-50 border-gray-200', badge: 'bg-gray-100 text-gray-500', score: 'text-gray-400' };

  // ══ Submit ══
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (procesosCatalog.length > 0 && !procesoIdSeleccionado && !procesoInicial) {
      toast.error('Debe seleccionar un proceso del catálogo');
      return;
    }
    if (!formData.nombre?.trim()) {
      toast.error('El nombre del proceso es obligatorio');
      return;
    }
    if (mode === 'edit' && !allFilled) {
      toast.error('Complete todos los criterios para guardar la evaluación');
      return;
    }
    if (allFilled) {
      toast.success('Proceso evaluado exitosamente', {
        description: `Criticidad: ${nivel} | ${ciclo} | Ponderación: ${pond.toFixed(2)}`,
        duration: 5000,
      });
    } else {
      toast.success('Proceso creado exitosamente', {
        description: 'Puede evaluarlo después con el botón "Evaluar"',
        duration: 5000,
      });
    }
    onSubmit(formData, procesoIdSeleccionado || undefined);
  };

  if (!open) return null;

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        >
          {/* ═══ HEADER ═══ */}
          <div className="bg-gradient-to-r from-[#003DA5] to-[#2962FF] px-5 py-4 rounded-t-2xl flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <Layers className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white leading-tight">
                  {mode === 'create' ? 'Agregar Proceso' : 'Editar Proceso'} — Universo de Auditoría
                </h2>
                <p className="text-[11px] text-white">
                  Evaluación DAFP · RE-E-GE-034 · Cálculo Automático
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-all" type="button">
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* ═══ BODY ═══ */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
            <div className="p-5 space-y-4">

              {/* ─── SECCIÓN 1: Información Básica ─── */}
              <div className="border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Info className="w-3.5 h-3.5 text-[#003DA5]" />
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Información básica</span>
                </div>

                {/* Proceso */}
                <div className="mb-3">
                  <label className="block text-[11px] text-gray-600 mb-1">
                    Proceso / Proyecto / Procedimiento <span className="text-red-500">*</span>
                  </label>
                  {procesoInicial ? (
                    <input
                      type="text"
                      value={formData.nombre}
                      readOnly
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
                    />
                  ) : procesosCatalog.length > 0 ? (
                    <select
                      value={procesoIdSeleccionado}
                      onChange={(e) => {
                        const id = e.target.value;
                        setProcesoIdSeleccionado(id);
                        const proc = procesosCatalog.find(p => p.id === id);
                        if (proc) {
                          setFormData(prev => ({
                            ...prev,
                            nombre: proc.nombre,
                            codigo: proc.codigo,
                            macroproceso: proc.macroproceso || prev.macroproceso,
                            dependenciaResponsable: proc.dependencia || prev.dependenciaResponsable,
                          }));
                        }
                      }}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-[#2962FF] focus:ring-2 focus:ring-[#2962FF]/10 outline-none bg-white"
                      required
                    >
                      <option value="">-- Seleccione un proceso --</option>
                      {(['Misional', 'Estratégico', 'Apoyo', 'Territorial'] as const).map(tipo => {
                        const grupo = procesosCatalog.filter(p =>
                          (p.tipo || 'Apoyo') === tipo
                        );
                        if (grupo.length === 0) return null;
                        const labels: Record<string, string> = {
                          'Misional':    'MISIONALES',
                          'Estratégico': 'ESTRATÉGICOS',
                          'Apoyo':       'DE APOYO',
                          'Territorial': 'TERRITORIALES',
                        };
                        return (
                          <optgroup key={tipo} label={labels[tipo]}>
                            {grupo.map(p => (
                              <option key={p.id} value={p.id}>{p.nombre}</option>
                            ))}
                          </optgroup>
                        );
                      })}
                    </select>
                  ) : (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      Cree procesos en Configuración → Procesos primero.
                    </div>
                  )}
                </div>

                {/* Macroproceso + Dependencia (auto o editable) */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-[11px] text-gray-600 mb-1">
                      Macroproceso
                      <span className="ml-1 text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-medium">AUTO</span>
                    </label>
                    <input
                      type="text"
                      value={formData.macroproceso || ''}
                      onChange={(e) => handleChange('macroproceso', e.target.value)}
                      placeholder="Ej: Gestión Financiera"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-[#2962FF] outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-600 mb-1">
                      Dependencia responsable
                      <span className="ml-1 text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-medium">AUTO</span>
                    </label>
                    <input
                      type="text"
                      value={formData.dependenciaResponsable || ''}
                      onChange={(e) => handleChange('dependenciaResponsable', e.target.value)}
                      placeholder="Ej: Dirección Financiera"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-[#2962FF] outline-none bg-white"
                    />
                  </div>
                </div>

                {/* Vigencia + Fecha de corte */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-gray-600 mb-1">
                      Vigencia
                      <span className="ml-1 text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-medium">AUTO</span>
                    </label>
                    <div className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-center font-semibold text-[#003DA5]">
                      {formData.vigencia}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-600 mb-1">Fecha de Corte <span className="text-red-500">*</span></label>
                    <input
                      type="date"
                      value={formData.fechaCorte}
                      onChange={(e) => handleChange('fechaCorte', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-[#2962FF] outline-none"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* ─── SECCIÓN 2: Riesgo Inherente ─── */}
              <div className="border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="w-3.5 h-3.5 text-[#003DA5]" />
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    Riesgo inherente — Digite la cantidad de riesgos por nivel
                  </span>
                </div>

                {/* Contadores */}
                <div className="grid grid-cols-4 gap-3 mb-3">
                  {[
                    { campo: 'riesgosExtremos' as const, label: 'EXTREMO', dot: 'bg-red-500', card: 'border-red-200 bg-red-50' },
                    { campo: 'riesgosAltos' as const,    label: 'ALTO',    dot: 'bg-orange-400', card: 'border-orange-200 bg-orange-50' },
                    { campo: 'riesgosModerados' as const,label: 'MODERADO',dot: 'bg-yellow-400', card: 'border-yellow-200 bg-yellow-50' },
                    { campo: 'riesgosBajos' as const,    label: 'BAJO',    dot: 'bg-green-500',  card: 'border-green-200 bg-green-50' },
                  ].map(({ campo, label, dot, card }) => (
                    <div key={campo} className={`rounded-xl p-3 text-center border ${card}`}>
                      <div className={`w-3 h-3 rounded-full ${dot} mx-auto mb-1.5`} />
                      <div className="text-[9px] font-semibold text-gray-500 tracking-wide mb-2">{label}</div>
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => adjRiesgo(campo, -1)}
                          className="w-5 h-5 rounded border border-gray-300 bg-white hover:bg-gray-100 flex items-center justify-center text-sm leading-none text-gray-600"
                        >−</button>
                        <span className="text-base font-bold min-w-[18px] text-center">{formData[campo]}</span>
                        <button
                          type="button"
                          onClick={() => adjRiesgo(campo, 1)}
                          className="w-5 h-5 rounded border border-gray-300 bg-white hover:bg-gray-100 flex items-center justify-center text-sm leading-none text-gray-600"
                        >+</button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total + RI auto */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 flex justify-between items-center mb-3 text-sm font-medium">
                  <span className="text-gray-600">Total riesgos:</span>
                  <span className="font-bold text-[#003DA5]">{formData.totalRiesgos}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-gray-600 mb-1">
                      RI Ponderación Cualitativa
                      <span className="ml-1 text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-medium">AUTO</span>
                    </label>
                    <div className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 flex justify-between items-center min-h-[34px]">
                      <span className="text-[11px] text-gray-500">Nivel consolidado</span>
                      <span className="text-sm font-bold text-gray-800">{formData.totalRiesgos > 0 ? riCual : '—'}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-600 mb-1">
                      RI Ponderación Cuantitativa
                      <span className="ml-1 text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-medium">AUTO</span>
                    </label>
                    <div className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 flex justify-between items-center min-h-[34px]">
                      <span className="text-[11px] text-gray-500">Calificación 1–5</span>
                      <span className="text-sm font-bold text-gray-800">{formData.totalRiesgos > 0 ? riCuan : '—'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ─── SECCIÓN 3: Criterios de Priorización ─── */}
              <div className="border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-3.5 h-3.5 text-[#003DA5]" />
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    Criterios de priorización — Seleccione cada campo
                  </span>
                </div>

                {[
                  {
                    campo: 'tiempoUltimaAuditoria' as const,
                    label: 'Tiempo desde última auditoría (Criterio)',
                    options: TIEMPO_OPTIONS,
                    calId: 'calTiempo',
                  },
                  {
                    campo: 'temasAltaDireccion' as const,
                    label: 'Temas de interés de la Alta Dirección (Criterio)',
                    options: AD_OPTIONS,
                    calId: 'calAD',
                  },
                  {
                    campo: 'objetivosEstrategicos' as const,
                    label: 'Cantidad de objetivos estratégicos asociados (Criterio)',
                    options: OBJ_OPTIONS,
                    calId: 'calObj',
                  },
                  {
                    campo: 'hallazgosAnteriores' as const,
                    label: 'Resultados auditorías anteriores internas y externas (Criterio)',
                    options: HALL_OPTIONS,
                    calId: 'calHall',
                  },
                ].map(({ campo, label, options }) => (
                  <div key={campo} className="grid grid-cols-2 gap-3 mb-3 last:mb-0">
                    <div>
                      <label className="block text-[11px] text-gray-600 mb-1">{label} <span className="text-red-500">*</span></label>
                      <select
                        value={formData[campo] || ''}
                        onChange={(e) => handleChange(campo, parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-[#2962FF] focus:ring-2 focus:ring-[#2962FF]/10 outline-none bg-white"
                      >
                        <option value="">-- Seleccione --</option>
                        {options.map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-600 mb-1">
                        Calificación
                        <span className="ml-1 text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-medium">AUTO</span>
                      </label>
                      <div className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 flex justify-between items-center min-h-[36px]">
                        <span className="text-[11px] text-gray-500">Puntaje 1–5</span>
                        <span className="text-sm font-bold text-gray-800">{formData[campo] || '—'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* ─── SECCIÓN 4: Resultados DAFP ─── */}
              <div className="border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="w-3.5 h-3.5 text-[#003DA5]" />
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    Resultados del cálculo DAFP
                  </span>
                  <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-medium">TODO AUTOMÁTICO</span>
                </div>

                {/* Métricas */}
                <div className="grid grid-cols-3 gap-3 mb-3">
                  {[
                    { label: 'Ponderación final', desc: '0.0 – 5.0', val: allFilled ? pond.toFixed(2) : '—' },
                    { label: 'Nivel de criticidad', desc: 'Semáforo', val: allFilled ? nivel : '—' },
                    { label: 'Ciclo de rotación', desc: 'Cada N años', val: allFilled ? ciclo : '—' },
                  ].map(({ label, desc, val }) => (
                    <div key={label}>
                      <label className="block text-[11px] text-gray-600 mb-1">{label}
                        <span className="ml-1 text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-medium">AUTO</span>
                      </label>
                      <div className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 flex justify-between items-center min-h-[34px]">
                        <span className="text-[10px] text-gray-400">{desc}</span>
                        <span className="text-sm font-bold text-gray-800">{val}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Result box */}
                <div className={`rounded-xl p-4 border mb-4 ${colores.box}`}>
                  {allFilled ? (
                    <>
                      <div className="flex items-baseline gap-3 mb-2">
                        <span className={`text-2xl font-bold ${colores.score}`}>{pond.toFixed(2)} / 5.0</span>
                        <span className={`px-3 py-0.5 rounded-full text-xs font-semibold ${colores.badge}`}>{nivel}</span>
                      </div>
                      <p className="text-[11px] text-gray-500 mb-2">
                        RI({riCuan})×0.4 + Tiempo({formData.tiempoUltimaAuditoria})×0.1 + Alta Dir.({formData.temasAltaDireccion})×0.1 + Obj.({formData.objetivosEstrategicos})×0.1 + Hallazgos({formData.hallazgosAnteriores})×0.3 = {pond.toFixed(2)}
                      </p>
                      <p className="text-[11px] text-gray-500 border-t border-gray-200 pt-2 mt-1">
                        Criticidad {nivel} — {ciclo}. Aprobado por el Comité Institucional de Coordinación de Control Interno.
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-400">Complete todos los criterios para obtener el cálculo.</p>
                  )}
                </div>

                {/* Priorización años 1–4 */}
                <div>
                  <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Priorización de Auditorías Basadas en Riesgos
                    <span className="ml-1 text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-medium">AUTO</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { ano: 'Año 1', incluido: a1 },
                      { ano: 'Año 2', incluido: a2 },
                      { ano: 'Año 3', incluido: a3 },
                      { ano: 'Año 4', incluido: a4 },
                    ].map(({ ano, incluido }) => (
                      <div
                        key={ano}
                        className={`rounded-lg p-2.5 text-center border transition-all ${
                          incluido
                            ? 'border-[#003DA5] bg-blue-50'
                            : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div className={`text-[10px] font-semibold mb-1 ${incluido ? 'text-[#003DA5]' : 'text-gray-500'}`}>{ano}</div>
                        <div className={`text-[11px] leading-tight ${incluido ? 'text-[#003DA5] font-medium' : 'text-gray-300'}`}>
                          {incluido && allFilled ? formData.macroproceso || formData.nombre || 'Este proceso' : '—'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>

            {/* ═══ FOOTER ═══ */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-5 py-3 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2 transition-all"
              >
                <X className="w-4 h-4" /> Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#003DA5] hover:bg-[#002d7d] text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-all"
              >
                <Save className="w-4 h-4" />
                {mode === 'create' ? 'Guardar Proceso' : 'Actualizar Proceso'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
