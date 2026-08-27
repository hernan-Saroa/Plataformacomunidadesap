import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Activity,
  BarChart3,
  ClipboardList,
  Info,
  Layers,
  Save,
  Search,
  ChevronDown,
  Sparkles,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent } from '@esap-mfe/shared-ui/dialog';

type PonderacionRiesgo = 'EXTREMO' | 'ALTO' | 'MODERADO' | 'BAJO' | 'MUY BAJO';
type ModoProcesoEspecial = 'ponderacion' | 'todos_los_anos';
type RiesgoInherenteCualitativo = 'Extremo' | 'Alto' | 'Moderado' | 'Bajo';

export interface FormularioDafpData {
  nombre: string;
  vigencia: number;
  fechaCorte: string;

  riesgosExtremos: number;
  riesgosAltos: number;
  riesgosModerados: number;
  riesgosBajos: number;
  totalRiesgos: number;

  requerimientoComite: boolean;
  requerimientoEntesReg: boolean;

  fechaUltimaAuditoria: string | null;
  resultadoUltimaAuditoria: string;

  ponderacionRiesgo: PonderacionRiesgo;
  diasTranscurridos: number | null;
  planRotacion: string;
  diasRotacion: number;
  decisionRotacion: string;
  decisionFinal: 'INCLUIR_PLAN_ANUAL' | 'INCLUIR_AUDITORIA_POSTERIOR';
  motivoDecision: string;
  prioridadRegla: number;

  criticidad?: number;
  exposicion?: number;
  mitigantes?: number;
  scoreRiesgoCEM?: number;
  nivelRiesgoCEM?: 'Bajo' | 'Moderado' | 'Alto' | 'Crítico';

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

  selectorProcesoCodificado?: string;
  procesoEspecial?: boolean;
  modoProcesoEspecial?: ModoProcesoEspecial;
  riesgoInherenteCualitativo?: RiesgoInherenteCualitativo;
  riesgoInherenteCuantitativo?: number;
  tiempoUltimaAuditoria: number;
  temasAltaDireccion: number;
  objetivosEstrategicos: number;
  hallazgosAnteriores: number;
  ponderacionFinalDafp: number;
  nivelCriticidadDafp?: string;
  cicloRotacionDafp?: string;
  priorizacionAnos?: number[];
}

export interface ProcesoParaSelect {
  id: string;
  nombre: string;
  codigo: string;
  tipo?: string;
  dependencia?: string;
  macroproceso?: string;
  esEspecial?: boolean;
}

interface FormularioProcesoDafpProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (proceso: FormularioDafpData, procesoId?: string) => void | Promise<void>;
  procesoInicial?: FormularioDafpData | null;
  mode: 'create' | 'edit';
  procesosCatalog?: ProcesoParaSelect[];
  vigenciaPlan?: number;
  fechaCortePlan?: string;
}

interface ProcesoCatalogoExtendido extends ProcesoParaSelect {
  encodedValue: string;
  groupLabel: string;
}

interface OpcionCriterio {
  value: number;
  label: string;
}

const CRITERIOS_TIEMPO: OpcionCriterio[] = [
  { value: 1, label: '<= 1 año' },
  { value: 2, label: '> 1 año y <= 2 años' },
  { value: 3, label: '> 2 años y <= 3 años' },
  { value: 4, label: '> 3 años y <= 4 años' },
  { value: 5, label: '> 4 años' },
];

const CRITERIOS_ALTA_DIRECCION: OpcionCriterio[] = [
  { value: 1, label: 'Interés poco relevante' },
  { value: 2, label: 'Interés bajo' },
  { value: 3, label: 'Interés medio' },
  { value: 4, label: 'Interés alto' },
  { value: 5, label: 'Interés muy relevante' },
];

const CRITERIOS_OBJETIVOS: OpcionCriterio[] = [
  { value: 1, label: 'No tiene objetivo asociado' },
  { value: 2, label: '1 objetivo estratégico asociado' },
  { value: 3, label: '2 objetivos estratégicos asociados' },
  { value: 4, label: '3 objetivos estratégicos asociados' },
  { value: 5, label: '4 o más objetivos estratégicos asociados' },
];

const CRITERIOS_HALLAZGOS: OpcionCriterio[] = [
  { value: 1, label: 'Sin hallazgos' },
  { value: 2, label: '1 a 2 hallazgos abiertos' },
  { value: 3, label: '3 a 4 hallazgos abiertos' },
  { value: 4, label: '5 a 6 hallazgos abiertos' },
  { value: 5, label: '7 o más hallazgos abiertos' },
];

const GROUP_ORDER = [
  'Estratégicos',
  'Misionales',
  'Apoyo / Transversales',
  'Evaluación y Control',
  'Otros',
];

const LEVEL_STYLES: Record<RiesgoInherenteCualitativo, string> = {
  Extremo: 'bg-red-50 text-red-700 border-red-200',
  Alto: 'bg-orange-50 text-orange-700 border-orange-200',
  Moderado: 'bg-amber-50 text-amber-700 border-amber-200',
  Bajo: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const RISK_COUNTER_STYLES = {
  Extremo: 'border-red-200 bg-red-50 text-red-700',
  Alto: 'border-orange-200 bg-orange-50 text-orange-700',
  Moderado: 'border-amber-200 bg-amber-50 text-amber-700',
  Bajo: 'border-emerald-200 bg-emerald-50 text-emerald-700',
} as const;

function normalizarTipoGrupo(tipo?: string): string {
  const normalized = (tipo || '').trim().toLowerCase();
  if (normalized.includes('estrat')) return 'Estratégicos';
  if (normalized.includes('mision')) return 'Misionales';
  if (normalized.includes('evalu')) return 'Evaluación y Control';
  if (normalized.includes('apoyo') || normalized.includes('transversal') || normalized.includes('territorial')) {
    return 'Apoyo / Transversales';
  }
  return 'Otros';
}

function sanitizeCatalogValue(value?: string): string {
  return (value || '').replace(/\|/g, '/').trim() || 'Sin dato';
}

function parseUnidades(macroproceso?: string): string[] {
  if (!macroproceso) return [];
  return macroproceso.split(';').map(u => u.trim()).filter(Boolean);
}

function buildEncodedValue(proceso: ProcesoParaSelect): string {
  return [
    sanitizeCatalogValue(proceso.codigo || proceso.id),
    sanitizeCatalogValue(proceso.nombre),
    sanitizeCatalogValue(proceso.tipo),
    sanitizeCatalogValue(proceso.dependencia),
    sanitizeCatalogValue(proceso.macroproceso),
    proceso.esEspecial ? 'ESP' : null,
  ]
    .filter(Boolean)
    .join(' | ');
}

function buildInitialData(
  procesoInicial: FormularioDafpData | null | undefined,
  vigenciaPlan?: number,
  fechaCortePlan?: string
): FormularioDafpData {
  const currentYear = new Date().getFullYear();
  let vigenciaStorage: number | undefined;
  let fechaCorteStorage: string | undefined;

  if (typeof window !== 'undefined') {
    try {
      const rawPlanActivo = window.localStorage.getItem('esap:plan_anual_activo');
      if (rawPlanActivo) {
        const planActivo = JSON.parse(rawPlanActivo);
        const v = Number(planActivo?.vigencia);
        if (!isNaN(v) && v >= 2020 && v <= 2100) {
          vigenciaStorage = v;
        }
        if (typeof planActivo?.fechaCorte === 'string' && planActivo.fechaCorte.trim()) {
          fechaCorteStorage = planActivo.fechaCorte.trim();
        }
      }
    } catch {
      // Ignorar errores de parseo de localStorage
    }
  }

  let vigencia: number;
  let fechaCorte: string;

  if (procesoInicial?.vigencia) {
    // Modo EDIT: conservar la vigencia del registro guardado
    vigencia = procesoInicial.vigencia;
    fechaCorte = procesoInicial.fechaCorte || `${vigencia}-12-31`;
  } else if (vigenciaPlan) {
    // Modo CREATE: usar vigencia que pasa el componente padre
    vigencia = vigenciaPlan;
    fechaCorte = fechaCortePlan || `${vigenciaPlan}-12-31`;
  } else {
    // Fallback: localStorage o año actual
    vigencia = vigenciaStorage ?? currentYear;
    fechaCorte = fechaCorteStorage || `${vigencia}-12-31`;
  }
  
  const modoProcesoEspecial = inferirModoEspecial(procesoInicial);

  return {
    nombre: procesoInicial?.nombre || '',
    vigencia,
    fechaCorte,
    riesgosExtremos: procesoInicial?.riesgosExtremos ?? 0,
    riesgosAltos: procesoInicial?.riesgosAltos ?? 0,
    riesgosModerados: procesoInicial?.riesgosModerados ?? 0,
    riesgosBajos: procesoInicial?.riesgosBajos ?? 0,
    totalRiesgos: procesoInicial?.totalRiesgos ?? 0,
    requerimientoComite: procesoInicial?.requerimientoComite ?? false,
    requerimientoEntesReg: procesoInicial?.requerimientoEntesReg ?? false,
    fechaUltimaAuditoria: procesoInicial?.fechaUltimaAuditoria ?? null,
    resultadoUltimaAuditoria: procesoInicial?.resultadoUltimaAuditoria || 'Sin auditoría previa',
    ponderacionRiesgo: procesoInicial?.ponderacionRiesgo || 'MUY BAJO',
    diasTranscurridos: procesoInicial?.diasTranscurridos ?? null,
    planRotacion: procesoInicial?.planRotacion || '',
    diasRotacion: procesoInicial?.diasRotacion ?? 0,
    decisionRotacion: procesoInicial?.decisionRotacion || '',
    decisionFinal: procesoInicial?.decisionFinal || 'INCLUIR_AUDITORIA_POSTERIOR',
    motivoDecision: procesoInicial?.motivoDecision || '',
    prioridadRegla: procesoInicial?.prioridadRegla ?? 5,
    criticidad: procesoInicial?.criticidad ?? 0,
    exposicion: procesoInicial?.exposicion ?? 0,
    mitigantes: procesoInicial?.mitigantes ?? 0,
    scoreRiesgoCEM: procesoInicial?.scoreRiesgoCEM ?? 0,
    nivelRiesgoCEM: procesoInicial?.nivelRiesgoCEM ?? 'Bajo',
    id: procesoInicial?.id,
    codigo: procesoInicial?.codigo || '',
    macroproceso: procesoInicial?.macroproceso || '',
    tipoProceso: procesoInicial?.tipoProceso || '',
    dependenciaResponsable: procesoInicial?.dependenciaResponsable || '',
    nivelRiesgo: procesoInicial?.nivelRiesgo || '',
    scoreRiesgo: procesoInicial?.scoreRiesgo ?? 0,
    ultimaAuditoria: procesoInicial?.ultimaAuditoria,
    numeroAuditorias: procesoInicial?.numeroAuditorias,
    frecuenciaSugerida: procesoInicial?.frecuenciaSugerida,
    horasEstimadas: procesoInicial?.horasEstimadas,
    auditable: procesoInicial?.auditable ?? false,
    selectorProcesoCodificado: procesoInicial?.selectorProcesoCodificado,
    procesoEspecial: procesoInicial?.procesoEspecial ?? modoProcesoEspecial !== 'ponderacion',
    modoProcesoEspecial,
    riesgoInherenteCualitativo: procesoInicial?.riesgoInherenteCualitativo,
    riesgoInherenteCuantitativo: procesoInicial?.riesgoInherenteCuantitativo ?? 0,
    tiempoUltimaAuditoria: procesoInicial?.tiempoUltimaAuditoria ?? 0,
    temasAltaDireccion: procesoInicial?.temasAltaDireccion ?? 0,
    objetivosEstrategicos: procesoInicial?.objetivosEstrategicos ?? 0,
    hallazgosAnteriores: procesoInicial?.hallazgosAnteriores ?? 0,
    ponderacionFinalDafp: procesoInicial?.ponderacionFinalDafp ?? 0,
    nivelCriticidadDafp: procesoInicial?.nivelCriticidadDafp || '',
    cicloRotacionDafp: procesoInicial?.cicloRotacionDafp || '',
    priorizacionAnos: procesoInicial?.priorizacionAnos ?? [],
  };
}

function inferirModoEspecial(procesoInicial?: FormularioDafpData | null): ModoProcesoEspecial {
  if (procesoInicial?.modoProcesoEspecial) return procesoInicial.modoProcesoEspecial;
  const motivo = (procesoInicial?.motivoDecision || '').toLowerCase();
  if (motivo.includes('[especial:todos_los_anos]')) return 'todos_los_anos';
  return 'ponderacion';
}

function getRiCualitativo(data: FormularioDafpData): RiesgoInherenteCualitativo {
  if (data.riesgosExtremos > 0) return 'Extremo';
  if (data.riesgosAltos > 0) return 'Alto';
  if (data.riesgosModerados > 0) return 'Moderado';
  return 'Bajo';
}

function getRiCuantitativo(ri: RiesgoInherenteCualitativo): number {
  if (ri === 'Extremo') return 5;
  if (ri === 'Alto') return 4;
  if (ri === 'Moderado') return 3;
  if (ri === 'Bajo') return 2;
  return 0;
}

function getRiCuantitativoDesdeConteo(data: FormularioDafpData): number {
  const total = data.riesgosExtremos + data.riesgosAltos + data.riesgosModerados + data.riesgosBajos;
  if (total === 0) return 1;
  return getRiCuantitativo(getRiCualitativo(data));
}

function getPonderacionRiesgo(ri: RiesgoInherenteCualitativo): PonderacionRiesgo {
  if (ri === 'Extremo') return 'EXTREMO';
  if (ri === 'Alto') return 'ALTO';
  if (ri === 'Moderado') return 'MODERADO';
  return 'BAJO';
}

function resolverResultadoDafp(ponderacion: number) {
  if (ponderacion < 1.5) return { nivel: 'Bajo', ciclo: 'No auditar', diasRotacion: 0, prioridad: 5 };
  if (ponderacion < 2) return { nivel: 'Bajo (Priorizado)', ciclo: 'Cada 4 años', diasRotacion: 1460, prioridad: 4 };
  if (ponderacion < 3) return { nivel: 'Moderado', ciclo: 'Cada 3 años', diasRotacion: 1095, prioridad: 3 };
  if (ponderacion < 4) return { nivel: 'Alto', ciclo: 'Cada 2 años', diasRotacion: 730, prioridad: 2 };
  return { nivel: 'Extremo', ciclo: 'Cada año', diasRotacion: 365, prioridad: 1 };
}

function calcularPriorizacionAnos(ciclo?: string): number[] {
  if (ciclo === 'Cada año' || ciclo === 'Todos los años') return [1, 2, 3, 4];
  if (ciclo === 'Cada 2 años') return [2, 4];
  if (ciclo === 'Cada 3 años') return [3];
  if (ciclo === 'Cada 4 años') return [4];
  return [];
}

function calcHorasEstimadas(nivel?: string, ciclo?: string): number {
  if (ciclo === 'No auditar') return 0;
  if (nivel === 'Extremo') return 80;
  if (nivel === 'Alto') return 60;
  if (nivel === 'Moderado') return 40;
  if (nivel === 'Bajo' || nivel === 'Bajo (Priorizado)') return 24;
  return 0;
}

function pillClassForValue(value: number): string {
  if (value >= 5) return 'bg-red-50 text-red-700 border-red-200';
  if (value >= 4) return 'bg-orange-50 text-orange-700 border-orange-200';
  if (value >= 3) return 'bg-amber-50 text-amber-700 border-amber-200';
  if (value >= 1) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  return 'bg-gray-50 text-gray-500 border-gray-200';
}

function AutoScorePill({ value }: { value: number }) {
  return (
    <span className={`inline-flex min-w-11 justify-center rounded-full border px-2.5 py-1 font-black ${pillClassForValue(value)}`}>
      {value || '—'}
    </span>
  );
}

export function FormularioProcesoDafpVisual({
  open,
  onClose,
  onSubmit,
  procesoInicial,
  mode,
  procesosCatalog = [],
  vigenciaPlan,
  fechaCortePlan,
}: FormularioProcesoDafpProps) {
  const [formData, setFormData] = useState<FormularioDafpData>(() =>
    buildInitialData(procesoInicial, vigenciaPlan, fechaCortePlan)
  );
  const [procesoIdSeleccionado, setProcesoIdSeleccionado] = useState<string>(procesoInicial?.id || '');
  const [valorProcesoSeleccionado, setValorProcesoSeleccionado] = useState<string>(procesoInicial?.selectorProcesoCodificado || '');

  // ── Multi-select para Unidades Auditables ──
  const [unidadesDisponibles, setUnidadesDisponibles] = useState<string[]>(() => {
    const selectedFromCatalog = procesosCatalog?.find(p => p.id === procesoInicial?.id) || procesosCatalog?.find(p => p.nombre === procesoInicial?.nombre);
    return parseUnidades(selectedFromCatalog?.macroproceso || procesoInicial?.macroproceso);
  });
  const [unidadesSeleccionadas, setUnidadesSeleccionadas] = useState<Set<string>>(() => {
    return new Set(parseUnidades(procesoInicial?.macroproceso));
  });
  const [unidadDropdownOpen, setUnidadDropdownOpen] = useState(false);
  const unidadDropdownRef = useRef<HTMLDivElement>(null);

  // ── Searchable Select para Proceso ──
  const [procesoDropdownOpen, setProcesoDropdownOpen] = useState(false);
  const [procesoSearchTerm, setProcesoSearchTerm] = useState('');
  const procesoDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (unidadDropdownRef.current && !unidadDropdownRef.current.contains(event.target as Node)) {
        setUnidadDropdownOpen(false);
      }
      if (procesoDropdownRef.current && !procesoDropdownRef.current.contains(event.target as Node)) {
        setProcesoDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const prevOpenRef = useRef(false);
  const prevProcesoIdRef = useRef<string | undefined>(undefined);

  const catalogoProcesos = useMemo<ProcesoCatalogoExtendido[]>(
    () =>
      procesosCatalog.map((proceso) => ({
        ...proceso,
        encodedValue: buildEncodedValue(proceso),
        groupLabel: normalizarTipoGrupo(proceso.tipo),
      })),
    [procesosCatalog]
  );

  const procesosAgrupados = useMemo(() => {
    const grouped = new Map<string, ProcesoCatalogoExtendido[]>();
    catalogoProcesos.forEach((proceso) => {
      const group = proceso.groupLabel;
      const current = grouped.get(group) || [];
      current.push(proceso);
      grouped.set(group, current);
    });
    return GROUP_ORDER.map((groupLabel) => ({
      groupLabel,
      items: (grouped.get(groupLabel) || []).sort((a, b) => a.nombre.localeCompare(b.nombre)),
    })).filter((group) => group.items.length > 0);
  }, [catalogoProcesos]);

  const procesoCatalogoSeleccionado = useMemo(() => {
    if (procesoIdSeleccionado) {
      return catalogoProcesos.find((proceso) => proceso.id === procesoIdSeleccionado) || null;
    }
    if (valorProcesoSeleccionado) {
      return catalogoProcesos.find((proceso) => proceso.encodedValue === valorProcesoSeleccionado) || null;
    }
    return null;
  }, [catalogoProcesos, procesoIdSeleccionado, valorProcesoSeleccionado]);

  const riesgoInherenteCualitativo = useMemo(() => getRiCualitativo(formData), [formData]);
  const riesgoInherenteCuantitativo = useMemo(
    () => getRiCuantitativoDesdeConteo(formData),
    [formData]
  );
  const totalRiesgos = useMemo(
    () => formData.riesgosExtremos + formData.riesgosAltos + formData.riesgosModerados + formData.riesgosBajos,
    [formData.riesgosAltos, formData.riesgosBajos, formData.riesgosExtremos, formData.riesgosModerados]
  );

  const criteriosCompletos =
    formData.tiempoUltimaAuditoria > 0 &&
    formData.temasAltaDireccion > 0 &&
    formData.objetivosEstrategicos > 0 &&
    formData.hallazgosAnteriores > 0;

  const ponderacionFinalDafp = useMemo(() => {
    if (!criteriosCompletos) return 0;
    return Number(
      (
        riesgoInherenteCuantitativo * 0.4 +
        formData.tiempoUltimaAuditoria * 0.1 +
        formData.temasAltaDireccion * 0.1 +
        formData.objetivosEstrategicos * 0.1 +
        formData.hallazgosAnteriores * 0.3
      ).toFixed(2)
    );
  }, [
    criteriosCompletos,
    formData.hallazgosAnteriores,
    formData.objetivosEstrategicos,
    formData.temasAltaDireccion,
    formData.tiempoUltimaAuditoria,
    riesgoInherenteCuantitativo,
  ]);

  const resultadoBase = useMemo(
    () => (criteriosCompletos ? resolverResultadoDafp(ponderacionFinalDafp) : null),
    [criteriosCompletos, ponderacionFinalDafp]
  );

  const procesoEspecialActivo = Boolean(procesoCatalogoSeleccionado?.esEspecial || formData.procesoEspecial);
  const modoEspecialActivo: ModoProcesoEspecial = procesoEspecialActivo
    ? formData.modoProcesoEspecial || 'todos_los_anos'
    : 'ponderacion';

  const cicloRotacionDafp = useMemo(() => {
    if (!resultadoBase) return '';
    if (procesoEspecialActivo && modoEspecialActivo === 'todos_los_anos') return 'Todos los años';
    return resultadoBase.ciclo;
  }, [modoEspecialActivo, procesoEspecialActivo, resultadoBase]);

  const nivelCriticidadDafp = resultadoBase?.nivel || '';
  const priorizacionAnos = useMemo(
    () => calcularPriorizacionAnos(cicloRotacionDafp),
    [cicloRotacionDafp]
  );
  const nombreProcesoPriorizado = formData.nombre.trim() || 'Proceso no seleccionado';
  const decisionFinal = priorizacionAnos.includes(1) ? 'INCLUIR_PLAN_ANUAL' : 'INCLUIR_AUDITORIA_POSTERIOR';
  const motivoDecision = useMemo(() => {
    if (!criteriosCompletos) return '';
    const base = `Ponderación DAFP ${ponderacionFinalDafp.toFixed(2)}. Nivel ${nivelCriticidadDafp}. Ciclo ${cicloRotacionDafp}.`;
    if (procesoEspecialActivo && modoEspecialActivo === 'todos_los_anos') {
      return `[ESPECIAL:todos_los_anos] ${base} Proceso especial forzado a auditoría anual en los años 1, 2, 3 y 4.`;
    }
    if (procesoEspecialActivo) {
      return `[ESPECIAL:ponderacion] ${base} Proceso especial evaluado según la ponderación DAFP.`;
    }
    if (decisionFinal === 'INCLUIR_PLAN_ANUAL') {
      return `${base} El proceso queda incluido en el año 1 del plan.`;
    }
    return `${base} El proceso se programa para años posteriores según la rotación definida.`;
  }, [
    criteriosCompletos,
    cicloRotacionDafp,
    decisionFinal,
    modoEspecialActivo,
    nivelCriticidadDafp,
    ponderacionFinalDafp,
    procesoEspecialActivo,
  ]);

  useEffect(() => {
    const justOpened = open && !prevOpenRef.current;
    const procesoChanged = open && procesoInicial?.id && procesoInicial.id !== prevProcesoIdRef.current;
    prevOpenRef.current = open;
    if (procesoInicial?.id) prevProcesoIdRef.current = procesoInicial.id;

    if (!open) return;
    if (!justOpened && !procesoChanged) return;

    const nextForm = buildInitialData(procesoInicial, vigenciaPlan, fechaCortePlan);
    const selectedFromCatalog =
      catalogoProcesos.find((proceso) => proceso.id === nextForm.id) ||
      catalogoProcesos.find((proceso) => proceso.nombre === nextForm.nombre);

    setFormData((prev) => ({
      ...prev,
      ...nextForm,
      selectorProcesoCodificado: selectedFromCatalog?.encodedValue || nextForm.selectorProcesoCodificado || '',
      procesoEspecial: selectedFromCatalog?.esEspecial ?? nextForm.procesoEspecial ?? false,
      modoProcesoEspecial:
        selectedFromCatalog?.esEspecial && !nextForm.modoProcesoEspecial
          ? 'todos_los_anos'
          : nextForm.modoProcesoEspecial,
    }));
    setProcesoIdSeleccionado(selectedFromCatalog?.id || nextForm.id || '');
    setValorProcesoSeleccionado(selectedFromCatalog?.encodedValue || nextForm.selectorProcesoCodificado || '');

    // Inicializar el dropdown de unidades auditables en modo edición
    const disponibles = parseUnidades(selectedFromCatalog?.macroproceso || nextForm.macroproceso);
    setUnidadesDisponibles(disponibles);

    const seleccionadas = parseUnidades(nextForm.macroproceso);
    setUnidadesSeleccionadas(new Set(seleccionadas));
  }, [catalogoProcesos, fechaCortePlan, open, procesoInicial, vigenciaPlan]);

  const handleChange = <K extends keyof FormularioDafpData>(field: K, value: FormularioDafpData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSeleccionProceso = (encodedValue: string) => {
    setValorProcesoSeleccionado(encodedValue);
    const proceso = catalogoProcesos.find((item) => item.encodedValue === encodedValue);
    if (!proceso) {
      setProcesoIdSeleccionado('');
      return;
    }

    const [, nombre, tipo, dependencia, macroproceso, flagEspecial] = encodedValue.split('|').map((part) => part.trim());
    const esEspecial = flagEspecial === 'ESP' || Boolean(proceso.esEspecial);

    setProcesoIdSeleccionado(proceso.id);
    // Parse unidades auditables y auto-seleccionar todas
    const unidadesParsed = parseUnidades(macroproceso);
    setUnidadesDisponibles(unidadesParsed);
    setUnidadesSeleccionadas(new Set(unidadesParsed));
    setFormData((prev) => ({
      ...prev,
      selectorProcesoCodificado: encodedValue,
      codigo: proceso.codigo,
      nombre,
      tipoProceso: tipo,
      dependenciaResponsable: dependencia,
      macroproceso: unidadesParsed.join('; '),
      procesoEspecial: esEspecial,
      modoProcesoEspecial: esEspecial ? 'todos_los_anos' : 'ponderacion',
    }));
  };

  const ajustarRiesgo = (
    field: 'riesgosExtremos' | 'riesgosAltos' | 'riesgosModerados' | 'riesgosBajos',
    delta: number
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: Math.max(0, Number(prev[field] || 0) + delta),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!procesoIdSeleccionado) {
      toast.error('Debe seleccionar un proceso del catálogo.');
      return;
    }
    if (!formData.nombre.trim()) {
      toast.error('No fue posible resolver el nombre del proceso seleccionado.');
      return;
    }
    if (!formData.dependenciaResponsable?.trim() || !formData.macroproceso?.trim()) {
      toast.error('El proceso debe autocompletar dependencia y macroproceso.');
      return;
    }
    if (!criteriosCompletos) {
      toast.error('Complete los cuatro criterios de priorización para calcular el resultado DAFP.');
      return;
    }

    const payload: FormularioDafpData = {
      ...formData,
      totalRiesgos,
      ponderacionRiesgo: getPonderacionRiesgo(riesgoInherenteCualitativo),
      planRotacion: cicloRotacionDafp,
      diasRotacion: resultadoBase?.diasRotacion || 0,
      decisionRotacion: priorizacionAnos.includes(1) ? 'Incluir en año 1' : 'Programar según rotación',
      decisionFinal,
      motivoDecision,
      prioridadRegla: resultadoBase?.prioridad || 5,
      scoreRiesgoCEM: ponderacionFinalDafp,
      nivelRiesgoCEM:
        nivelCriticidadDafp === 'Extremo'
          ? 'Crítico'
          : nivelCriticidadDafp === 'Alto'
          ? 'Alto'
          : nivelCriticidadDafp === 'Moderado'
          ? 'Moderado'
          : 'Bajo',
      scoreRiesgo: ponderacionFinalDafp,
      auditable: priorizacionAnos.includes(1),
      horasEstimadas: calcHorasEstimadas(nivelCriticidadDafp, cicloRotacionDafp),
      procesoEspecial: procesoEspecialActivo,
      modoProcesoEspecial: modoEspecialActivo,
      riesgoInherenteCualitativo,
      riesgoInherenteCuantitativo,
      tiempoUltimaAuditoria: formData.tiempoUltimaAuditoria,
      temasAltaDireccion: formData.temasAltaDireccion,
      objetivosEstrategicos: formData.objetivosEstrategicos,
      hallazgosAnteriores: formData.hallazgosAnteriores,
      ponderacionFinalDafp,
      nivelCriticidadDafp,
      cicloRotacionDafp,
      priorizacionAnos,
      selectorProcesoCodificado: valorProcesoSeleccionado,
    };

    // ✅ FIX: await onSubmit para que el guardado se complete antes del toast
    await Promise.resolve(onSubmit(payload, procesoIdSeleccionado));
  };

  // if (!open) return null;

  const nivelBadgeClass = LEVEL_STYLES[riesgoInherenteCualitativo];
  const readonlyProcesoValue =
    valorProcesoSeleccionado ||
    [
      sanitizeCatalogValue(formData.codigo || formData.id),
      sanitizeCatalogValue(formData.nombre),
      sanitizeCatalogValue(formData.tipoProceso),
      sanitizeCatalogValue(formData.dependenciaResponsable),
      sanitizeCatalogValue(formData.macroproceso),
      formData.procesoEspecial ? 'ESP' : null,
    ]
      .filter(Boolean)
      .join(' | ');

  return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-hidden flex flex-col">
          {/* HEADER */}
          <div className="flex items-start justify-between p-6 border-b border-gray-200">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Layers className="w-6 h-6" style={{ color: '#003DA5' }} />
                <h2 className="text-2xl font-black" style={{ color: '#003DA5' }}>
                  {mode === 'create' ? 'Agregar Proceso' : 'Editar Proceso'}
                </h2>
              </div>
                <p className="text-sm text-gray-600">
                  Universo de Auditoría Basada en Riesgos · RE-E-GE-034
                </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
            <div className="space-y-5 p-6">
              <section className={`rounded-xl border-2 border-gray-200 bg-gradient-to-br from-gray-50 to-blue-50/40 p-5 transition-all ${procesoDropdownOpen || unidadDropdownOpen ? 'relative z-40' : 'relative z-10'}`}>
                <h3 className="mb-4 flex items-center gap-2 text-sm font-black text-[#003DA5]">
                  <Info className="h-4 w-4" />
                  INFORMACIÓN BÁSICA
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-gray-700">
                      Proceso / Proyecto / Procedimiento <span className="text-red-500">*</span>
                    </label>
                    {catalogoProcesos.length === 0 ? (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">
                        No hay procesos parametrizados en el catálogo de Universo de Auditoría.
                      </div>
                    ) : mode === 'edit' ? (
                      <input
                        type="text"
                        readOnly
                        value={readonlyProcesoValue}
                        className="w-full rounded-lg border-2 border-gray-200 bg-gray-50 px-3 py-2.5 text-sm"
                      />
                    ) : (
                      <div className={`relative ${procesoDropdownOpen ? 'z-50' : 'z-10'}`} ref={procesoDropdownRef}>
                        <button
                          type="button"
                          onClick={() => setProcesoDropdownOpen(!procesoDropdownOpen)}
                          className={`w-full rounded-lg border-2 px-3 py-2.5 text-sm text-left flex items-center justify-between transition-all ${
                            procesoDropdownOpen ? 'border-[#2962FF] ring-2 ring-[#2962FF]/20 bg-white' : 'border-gray-300 bg-white hover:border-[#2962FF]/50'
                          }`}
                        >
                          <span className="truncate pr-4 text-gray-700">
                            {valorProcesoSeleccionado ? 
                              (() => {
                                const p = catalogoProcesos.find(c => c.encodedValue === valorProcesoSeleccionado);
                                return p ? `${p.codigo} · ${p.nombre}` : '-- Seleccione un proceso del catálogo --';
                              })()
                              : '-- Seleccione un proceso del catálogo --'}
                          </span>
                          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform flex-shrink-0 ${procesoDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {procesoDropdownOpen && (
                          <div className="absolute top-full left-0 z-[100] mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-2xl flex flex-col overflow-hidden">
                            <div className="p-2 border-b border-gray-100 sticky top-0 bg-white rounded-t-lg">
                              <div className="flex items-center w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 focus-within:border-[#2962FF] focus-within:ring-1 focus-within:ring-[#2962FF] transition-all">
                                <Search className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                                <input
                                  type="text"
                                  autoFocus
                                  placeholder="Buscar proceso, proyecto o procedimiento..."
                                  value={procesoSearchTerm}
                                  onChange={(e) => setProcesoSearchTerm(e.target.value)}
                                  className="w-full bg-transparent text-sm outline-none text-gray-700 placeholder-gray-400"
                                />
                              </div>
                            </div>
                            <div className="max-h-60 overflow-y-auto p-1">
                              {procesosAgrupados.map((group) => {
                                const filteredItems = group.items.filter((proceso) => 
                                  `${proceso.codigo} ${proceso.nombre}`.toLowerCase().includes(procesoSearchTerm.toLowerCase())
                                );
                                
                                if (filteredItems.length === 0) return null;

                                return (
                                  <div key={group.groupLabel} className="mb-2">
                                    <div className="px-2 py-1 text-xs font-bold text-gray-500 bg-gray-50/80 sticky top-0 backdrop-blur-sm z-10">
                                      {group.groupLabel}
                                    </div>
                                    {filteredItems.map((proceso) => (
                                      <button
                                        key={proceso.id}
                                        type="button"
                                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors flex items-start gap-2 ${
                                          valorProcesoSeleccionado === proceso.encodedValue 
                                            ? 'bg-blue-50 text-blue-700 font-medium' 
                                            : 'text-gray-700 hover:bg-gray-50'
                                        }`}
                                        onClick={() => {
                                          handleSeleccionProceso(proceso.encodedValue);
                                          setProcesoDropdownOpen(false);
                                          setProcesoSearchTerm('');
                                        }}
                                      >
                                        <span className="font-mono text-xs text-gray-500 mt-0.5">{proceso.codigo}</span>
                                        <span>{proceso.nombre}</span>
                                      </button>
                                    ))}
                                  </div>
                                );
                              })}
                              {procesosAgrupados.every(group => 
                                group.items.filter(p => `${p.codigo} ${p.nombre}`.toLowerCase().includes(procesoSearchTerm.toLowerCase())).length === 0
                              ) && (
                                <div className="p-4 text-center text-sm text-gray-500">
                                  No se encontraron resultados para "{procesoSearchTerm}"
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    <p className="mt-1.5 text-[11px] text-gray-500">
                      Valor codificado: <code>{valorProcesoSeleccionado || 'código | nombre | tipo | dependencia | macroproceso'}</code>
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-gray-700">Tipo</label>
                      <input
                        type="text"
                        readOnly
                        value={formData.tipoProceso || ''}
                        className="w-full rounded-lg border-2 border-gray-200 bg-gray-50 px-3 py-2.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-gray-700">Dependencia</label>
                      <input
                        type="text"
                        readOnly
                        value={formData.dependenciaResponsable || ''}
                        className="w-full rounded-lg border-2 border-gray-200 bg-gray-50 px-3 py-2.5 text-sm"
                      />
                    </div>
                    <div className={`relative ${unidadDropdownOpen ? 'z-50' : 'z-10'}`} ref={unidadDropdownRef}>
                      <label className="mb-1.5 block text-xs font-bold text-gray-700">Unidad auditable</label>
                      <button
                        type="button"
                        onClick={() => setUnidadDropdownOpen(!unidadDropdownOpen)}
                        className={`w-full rounded-lg border-2 px-3 py-2.5 text-sm text-left flex items-center justify-between transition-all ${
                          unidadDropdownOpen ? 'border-[#2962FF] ring-2 ring-[#2962FF]/20 bg-white' : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                        }`}
                      >
                        <span className={unidadesSeleccionadas.size > 0 ? 'text-gray-900' : 'text-gray-400'}>
                          {unidadesSeleccionadas.size > 0
                            ? `${unidadesSeleccionadas.size} unidad${unidadesSeleccionadas.size > 1 ? 'es' : ''} seleccionada${unidadesSeleccionadas.size > 1 ? 's' : ''}`
                            : 'Seleccione unidades...'}
                        </span>
                        <svg className={`w-4 h-4 text-gray-500 transition-transform ${unidadDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      </button>
                      {unidadDropdownOpen && unidadesDisponibles.length > 0 && (
                        <div className="absolute top-full left-0 z-[100] mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-2xl max-h-48 overflow-y-auto">
                          <div className="p-1">
                            <button
                              type="button"
                              className="w-full text-left px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded"
                              onClick={() => {
                                const allSelected = unidadesSeleccionadas.size === unidadesDisponibles.length;
                                const next = allSelected ? new Set<string>() : new Set(unidadesDisponibles);
                                setUnidadesSeleccionadas(next);
                                setFormData(prev => ({ ...prev, macroproceso: allSelected ? '' : unidadesDisponibles.join('; ') }));
                              }}
                            >
                              {unidadesSeleccionadas.size === unidadesDisponibles.length ? '✕ Deseleccionar todas' : '✓ Seleccionar todas'}
                            </button>
                            <div className="border-t border-gray-100 my-1" />
                            {unidadesDisponibles.map((u) => (
                              <label
                                key={u}
                                className="flex items-center gap-2 px-3 py-2 hover:bg-blue-50 rounded cursor-pointer transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={unidadesSeleccionadas.has(u)}
                                  onChange={() => {
                                    const next = new Set(unidadesSeleccionadas);
                                    if (next.has(u)) next.delete(u);
                                    else next.add(u);
                                    setUnidadesSeleccionadas(next);
                                    setFormData(prev => ({ ...prev, macroproceso: Array.from(next).join('; ') }));
                                  }}
                                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700">{u}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                      {unidadesSeleccionadas.size > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {Array.from(unidadesSeleccionadas).map((u) => (
                            <span key={u} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[11px] font-medium">
                              {u}
                              <button
                                type="button"
                                onClick={() => {
                                  const next = new Set(unidadesSeleccionadas);
                                  next.delete(u);
                                  setUnidadesSeleccionadas(next);
                                  setFormData(prev => ({ ...prev, macroproceso: Array.from(next).join('; ') }));
                                }}
                                className="hover:text-blue-900 font-bold"
                              >×</button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-gray-700">Vigencia <span className="text-red-500">*</span></label>
                      <input
                        type="number"
                        readOnly
                        value={formData.vigencia}
                        className="w-full rounded-lg border-2 border-gray-200 bg-gray-50 px-3 py-2.5 text-center text-sm font-bold outline-none"
                        title="La vigencia se hereda automáticamente del Plan Anual seleccionado"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-gray-700">Fecha de corte <span className="text-red-500">*</span></label>
                      <input
                        type="date"
                        value={formData.fechaCorte}
                        onChange={(e) => handleChange('fechaCorte', e.target.value)}
                        className="w-full rounded-lg border-2 border-gray-300 px-3 py-2.5 text-sm outline-none transition-all focus:border-[#2962FF]"
                        required
                      />
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50/40 p-5">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-black text-[#003DA5]">
                  <Activity className="h-4 w-4" />
                  RIESGO INHERENTE
                </h3>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    { field: 'riesgosExtremos', label: 'Extremo', value: formData.riesgosExtremos },
                    { field: 'riesgosAltos', label: 'Alto', value: formData.riesgosAltos },
                    { field: 'riesgosModerados', label: 'Moderado', value: formData.riesgosModerados },
                    { field: 'riesgosBajos', label: 'Bajo', value: formData.riesgosBajos },
                  ].map((item) => (
                    <div key={item.field} className="rounded-xl border-2 border-white bg-white p-4 shadow-sm">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wide text-gray-600">{item.label}</span>
                        <span className="text-2xl font-black text-[#003DA5]">{item.value}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => ajustarRiesgo(item.field as keyof FormularioDafpData & 'riesgosExtremos', -1)}
                          className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-gray-200 text-lg font-black text-gray-700 transition-colors hover:bg-gray-50"
                        >
                          −
                        </button>
                        <div className={`flex-1 rounded-lg border-2 py-2 text-center text-sm font-black ${RISK_COUNTER_STYLES[item.label]}`}>
                          {item.value}
                        </div>
                        <button
                          type="button"
                          onClick={() => ajustarRiesgo(item.field as keyof FormularioDafpData & 'riesgosExtremos', 1)}
                          className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-gray-200 text-lg font-black text-gray-700 transition-colors hover:bg-gray-50"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
                  <div className="rounded-xl border-2 border-blue-200 bg-white p-4">
                    <div className="text-xs font-bold text-gray-500">Total riesgos</div>
                    <div className="mt-1 text-2xl font-black text-[#003DA5]">{totalRiesgos}</div>
                  </div>
                  <div className="rounded-xl border-2 border-blue-200 bg-white p-4">
                    <div className="text-xs font-bold text-gray-500">Riesgo inherente cualitativo</div>
                    <div className="mt-2">
                      <span className={`rounded-full border px-3 py-1 text-sm font-black ${nivelBadgeClass}`}>
                        {riesgoInherenteCualitativo}
                      </span>
                    </div>
                    {totalRiesgos === 0 && (
                      <div className="mt-1 text-[11px] text-gray-500">
                        Sin riesgos asociados: el Excel DAFP asigna calificación 1.
                      </div>
                    )}
                  </div>
                  <div className="rounded-xl border-2 border-blue-200 bg-white p-4">
                    <div className="text-xs font-bold text-gray-500">Riesgo inherente cuantitativo</div>
                    <div className="mt-1 text-2xl font-black text-[#003DA5]">{riesgoInherenteCuantitativo || '—'}</div>
                  </div>
                </div>
              </section>

              <section className="rounded-xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50/40 p-4">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-black text-[#003DA5]">
                  <ClipboardList className="h-4 w-4" />
                  CRITERIOS DE PRIORIZACIÓN
                </h3>

                <div className="space-y-2.5">
                  {[
                    {
                      key: 'tiempoUltimaAuditoria' as const,
                      titulo: 'Tiempo última auditoría',
                      peso: '10%',
                      options: CRITERIOS_TIEMPO,
                      helper: 'Rango desde la última auditoría realizada.',
                    },
                    {
                      key: 'temasAltaDireccion' as const,
                      titulo: 'Interés Alta Dirección',
                      peso: '10%',
                      options: CRITERIOS_ALTA_DIRECCION,
                      helper: 'Nivel de relevancia institucional del proceso.',
                    },
                    {
                      key: 'objetivosEstrategicos' as const,
                      titulo: 'Objetivos estratégicos',
                      peso: '10%',
                      options: CRITERIOS_OBJETIVOS,
                      helper: 'Cantidad de objetivos asociados al proceso.',
                    },
                    {
                      key: 'hallazgosAnteriores' as const,
                      titulo: 'Hallazgos anteriores',
                      peso: '30%',
                      options: CRITERIOS_HALLAZGOS,
                      helper: 'Hallazgos abiertos internos y externos.',
                    },
                  ].map((criterio) => (
                    <div key={criterio.key} className="rounded-lg border-2 border-white bg-white p-3 shadow-sm">
                      <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1.2fr)_88px_minmax(0,1fr)_56px] md:items-center">
                        <div>
                          <div className="text-[13px] font-black leading-tight text-gray-800">{criterio.titulo}</div>
                          <div className="mt-0.5 text-[11px] leading-tight text-gray-500 sm:truncate">
                            {criterio.helper}
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <div className="rounded-md bg-gray-100 px-2 py-1.5 text-center text-[11px] font-black text-gray-700">
                            {criterio.peso}
                          </div>
                          <select
                            value={formData[criterio.key]}
                            onChange={(e) => handleChange(criterio.key, Number(e.target.value))}
                            className="w-full rounded-lg border-2 border-gray-300 bg-white px-3 py-2 text-sm outline-none transition-all focus:border-[#2962FF]"
                          >
                            <option value={0}>-- Seleccione --</option>
                            {criterio.options.map((option) => (
                              <option key={option.label} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <div className="flex items-center justify-start md:justify-end">
                            <AutoScorePill value={Number(formData[criterio.key])} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="rounded-lg border-2 border-white bg-white p-3 shadow-sm">
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1.2fr)_88px_minmax(0,1fr)_56px] md:items-center">
                      <div>
                        <div className="text-[13px] font-black leading-tight text-gray-800">Riesgo inherente</div>
                        <div className="mt-0.5 text-[11px] leading-tight text-gray-500 sm:truncate">
                          Valor automático según el mayor nivel presente. Si no hay riesgos, el libro asigna 1.
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <div className="rounded-md bg-gray-100 px-2 py-1.5 text-center text-[11px] font-black text-gray-700">
                          40%
                        </div>
                        <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700 w-full">
                          {riesgoInherenteCualitativo}
                        </div>
                        <div className="flex items-center justify-start md:justify-end">
                          <AutoScorePill value={riesgoInherenteCuantitativo} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {procesoEspecialActivo && (
                <section className="rounded-xl border-2 border-cyan-200 bg-gradient-to-br from-cyan-50 to-sky-50/50 p-5">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-black text-[#003DA5]">
                    <Sparkles className="h-4 w-4" />
                    PROCESO ESPECIAL
                  </h3>
                  <p className="mb-4 text-xs text-gray-600">
                    Este proceso tiene habilitada la regla especial. Puede seguir la ponderación DAFP o forzar auditoría en los 4 años.
                  </p>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <label className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${
                      modoEspecialActivo === 'ponderacion'
                        ? 'border-[#003DA5] bg-blue-50'
                        : 'border-cyan-200 bg-white hover:bg-cyan-50'
                    }`}>
                      <input
                        type="radio"
                        className="sr-only"
                        checked={modoEspecialActivo === 'ponderacion'}
                        onChange={() => handleChange('modoProcesoEspecial', 'ponderacion')}
                      />
                      <div className="text-sm font-black text-gray-800">Según ponderación DAFP</div>
                      <div className="mt-1 text-xs text-gray-500">Aplica el ciclo calculado por la fórmula oficial.</div>
                    </label>
                    <label className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${
                      modoEspecialActivo === 'todos_los_anos'
                        ? 'border-[#003DA5] bg-blue-50'
                        : 'border-cyan-200 bg-white hover:bg-cyan-50'
                    }`}>
                      <input
                        type="radio"
                        className="sr-only"
                        checked={modoEspecialActivo === 'todos_los_anos'}
                        onChange={() => handleChange('modoProcesoEspecial', 'todos_los_anos')}
                      />
                      <div className="text-sm font-black text-gray-800">Auditar todos los años</div>
                      <div className="mt-1 text-xs text-gray-500">Fuerza inclusión en los años 1, 2, 3 y 4 del plan.</div>
                    </label>
                  </div>
                </section>
              )}

              <section className="rounded-xl border-2 border-green-300 bg-gradient-to-br from-green-50 to-emerald-50/50 p-5">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-black text-[#003DA5]">
                  <BarChart3 className="h-4 w-4" />
                  RESULTADOS DAFP
                </h3>

                <div className="rounded-xl border-2 border-white bg-white p-4 shadow-sm">
                  <div className="text-xs font-bold text-gray-500">Fórmula aplicada</div>
                  <div className="mt-2 text-sm font-semibold text-gray-700">
                    RI×0.4 + Tiempo×0.1 + Alta Dirección×0.1 + Objetivos×0.1 + Hallazgos×0.3
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    {riesgoInherenteCuantitativo || 0}×0.4 + {formData.tiempoUltimaAuditoria || 0}×0.1 + {formData.temasAltaDireccion || 0}×0.1 + {formData.objetivosEstrategicos || 0}×0.1 + {formData.hallazgosAnteriores || 0}×0.3 = <span className="font-bold text-[#003DA5]">{criteriosCompletos ? ponderacionFinalDafp.toFixed(1) : '—'}</span>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl border-2 border-green-200 bg-white p-4">
                    <div className="text-xs font-bold text-gray-500">Ponderación</div>
                    <div className="mt-1 text-2xl font-black text-[#003DA5]">
                      {criteriosCompletos ? ponderacionFinalDafp.toFixed(1) : '—'}
                    </div>
                  </div>
                  <div className="rounded-xl border-2 border-green-200 bg-white p-4">
                    <div className="text-xs font-bold text-gray-500">Nivel criticidad</div>
                    <div className="mt-2">
                      {criteriosCompletos ? (
                        <span className={`rounded-full border px-3 py-1 text-sm font-black ${pillClassForValue(
                          resolverResultadoDafp(ponderacionFinalDafp).prioridad === 1
                            ? 5
                            : resolverResultadoDafp(ponderacionFinalDafp).prioridad === 2
                            ? 4
                            : resolverResultadoDafp(ponderacionFinalDafp).prioridad === 3
                            ? 3
                            : 2
                        )}`}>
                          {nivelCriticidadDafp}
                        </span>
                      ) : (
                        <span className="text-sm font-semibold text-gray-400">Pendiente</span>
                      )}
                    </div>
                  </div>
                  <div className="rounded-xl border-2 border-green-200 bg-white p-4">
                    <div className="text-xs font-bold text-gray-500">Ciclo rotación</div>
                    <div className="mt-1 text-lg font-black text-[#003DA5]">{cicloRotacionDafp || '—'}</div>
                    {cicloRotacionDafp === 'No auditar' && (
                      <div className="mt-2 text-[11px] text-gray-500">
                        El Excel ubica esta ponderación por debajo de 1.5.
                      </div>
                    )}
                  </div>
                  <div className="rounded-xl border-2 border-green-200 bg-white p-4">
                    <div className="text-xs font-bold text-gray-500">Decisión</div>
                    <div className={`mt-1 text-sm font-black ${decisionFinal === 'INCLUIR_PLAN_ANUAL' ? 'text-emerald-700' : 'text-orange-700'}`}>
                      {criteriosCompletos ? (decisionFinal === 'INCLUIR_PLAN_ANUAL' ? 'INCLUIR EN PLAN ANUAL' : 'AUDITORÍA POSTERIOR') : 'Pendiente'}
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border-2 border-white bg-white p-4 shadow-sm">
                  <div className="mb-3 text-xs font-bold text-gray-500">Priorización años 1-4</div>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {[1, 2, 3, 4].map((ano) => {
                      const activo = priorizacionAnos.includes(ano);
                      return (
                        <div
                          key={ano}
                          className={`rounded-xl border-2 px-4 py-5 text-center transition-all ${
                            activo
                              ? 'border-[#003DA5] bg-blue-50 text-[#003DA5]'
                              : 'border-gray-200 bg-gray-50 text-gray-400'
                          }`}
                        >
                          <div className="text-xs font-bold uppercase tracking-wide">Año {ano}</div>
                          <div className="mt-2 text-sm font-black">
                            {activo ? nombreProcesoPriorizado : 'No aplica'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {!criteriosCompletos && (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    Complete riesgo inherente y los cuatro criterios para desbloquear el cálculo automático.
                  </div>
                )}
              </section>
            </div>

            <div className="flex flex-col gap-3 border-t border-gray-200 bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-gray-500">
                La priorización se calcula automáticamente con la metodología DAFP del instructivo RE-E-GE-034.
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border-2 border-gray-300 px-4 py-2 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#003DA5] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#002b75]"
                >
                  <Save className="h-4 w-4" />
                  {mode === 'create' ? 'Guardar evaluación' : 'Actualizar evaluación'}
                </button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
  );
}
