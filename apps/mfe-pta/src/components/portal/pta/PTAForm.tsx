/**
 * PTAForm v2 — Formulario PTA fidedigno al Excel PTA v9
 * 
 * Motor de cálculo según fórmulas Excel:
 * - K15: Horas base por programa (AP=64, Maestría=créd×12, otros=créd×16)
 * - L15: Total horas = horasBase × 3 (con excepciones)
 * - Prorrateo: Doc=100%, Inv=50%, Ext=25%, Comp=25%
 * 
 * Dropdowns en cascada: Territorial → CETAP → Programa → Asignatura
 * 5 Componentes: Docencia, Investigación, Extensión (4 secciones), Complementarias
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronLeft, Save, Send, AlertCircle, Plus, Trash2, Calculator,
  BookOpen, FlaskConical, Globe, Briefcase, CheckCircle2, Info,
  ChevronDown, RotateCcw, AlertTriangle, Search, Shield, Clock, MessageSquare
} from 'lucide-react';
import {
  savePTA, getPTAById, getCatalogoProgramas, getCatalogoAsignaturas,
  getCatalogoTerritoriales, getCatalogoCetaps,
  getCatalogoActividadesInvestigacion, getCatalogoActividadesExtension,
  getCatalogoActividadesComplementarias, getCatalogoActividadesAcademicoAdmin,
  getCatalogoRolesInvestigacion, getConfiguracionPTAGlobal, getCatalogoSeccionesExtension
} from '../../../services/api/ptaApi';
import { getPerfilPortal } from '../portalApi';
import { toast } from 'sonner';
import { useNotifications } from '../../esap/NotificationsContext';
import { FirmaElectronicaModal } from './FirmaElectronicaModal';
import { FirmaDigitalPTA, type FirmaData } from '../../pta/FirmaDigitalPTA';
import { guardarFirmaDigitalPTA } from '../../../services/api/ptaApi';
import { PTA_COLORS } from '../../pta/shared/ptaColors';

// ═══ TYPES ═══════════════════════════════════════════════════════════

interface PTAFormProps {
  onBack: () => void;
  userPersonId: string;
  ptaId?: string | null;
  isAdminEdit?: boolean;
  jefaturaTerritorialId?: string; // bloquear asignaturas de otras territoriales
}

interface AsignaturaItem {
  id: number;
  territorial_id: string;
  cetap_id: string;
  programa_id: string;
  asignatura_id: string;
  asignatura_nombre: string;
  nucleo_tematico: string;
  creditos: number;
  semestre: number;
  total_estudiantes: number;
  horas_base: number;
  total_horas: number;
  porcentaje_pta: number;
  observaciones: string;
  modalidad: string;       // PRESENCIAL | VIRTUAL | MIXTA
  fecha_inicio: string;    // YYYY-MM-DD
  fecha_fin: string;       // YYYY-MM-DD
  _showObs?: boolean;      // UI-only: toggle observaciones
}

interface InvestigacionProyecto {
  nombre: string;
  codigo: string;
  grupo: string;
  linea: string;
  rol: string;
  horas_solicitadas: number;
  fecha_inicio: string;
  fecha_fin: string;
}

interface InvestigacionActividad {
  id: number;
  actividad_id: string;
  nombre: string;
  descripcion: string;
  cantidad: number;
  horas_unitarias: number;
  horas_total: number;
  fecha_inicio: string;
  fecha_fin: string;
}

interface ExtensionActividad {
  id: number;
  seccion: string;
  actividad_id: string;
  nombre: string;
  horas: number;
  horas_ejecutadas?: number;
  descripcion: string;
  fecha_inicio: string;
  fecha_fin: string;
}

interface ComplementariaItem {
  id: number;
  actividad_id: string;
  nombre: string;
  horas: number;
  descripcion: string;
  consumeTotalidad?: boolean;
  fecha_inicio: string;
  fecha_fin: string;
}

type HourConstraintMode = 'fixed' | 'range' | 'upto' | 'exclusive';

interface HourConstraint {
  min: number;
  max: number;
  editable: boolean;
  mode: HourConstraintMode;
}

const FIXED_COMPLEMENTARIA_IDS = new Set(['COMP_01', 'COMP_02', 'COMP_03', 'COMP_04', 'COMP_05']);

function getPositiveRuleNumber(value: any, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function buildHourConstraint(min: number, max: number, editable: boolean, mode: HourConstraintMode): HourConstraint {
  const safeMax = Math.max(0, Number(max) || 0);
  if (!editable) {
    return { min: safeMax, max: safeMax, editable: false, mode };
  }

  const safeMin = safeMax > 0 ? Math.min(Math.max(1, Number(min) || 1), safeMax) : 0;
  return { min: safeMin, max: safeMax, editable: true, mode };
}

function getComplementariaConstraint(activity: any, rules?: any): HourConstraint {
  const id = String(activity?.id || activity?.actividad_id || '');
  const fallbackMax = getPositiveRuleNumber(activity?.max_horas, Number(activity?.horas) || 0);

  if (FIXED_COMPLEMENTARIA_IDS.has(id)) {
    return buildHourConstraint(fallbackMax, fallbackMax, false, 'fixed');
  }

  switch (id) {
    case 'COMP_08':
      return buildHourConstraint(
        getPositiveRuleNumber(rules?.comp_act_unidades_min, 60),
        getPositiveRuleNumber(rules?.comp_act_unidades_max, fallbackMax || 120),
        true,
        'range'
      );
    case 'COMP_13':
      return buildHourConstraint(
        getPositiveRuleNumber(rules?.comp_coord_escuela_doc_min, 40),
        getPositiveRuleNumber(rules?.comp_coord_escuela_doc_max, fallbackMax || 80),
        true,
        'range'
      );
    case 'COMP_15':
      return buildHourConstraint(
        getPositiveRuleNumber(rules?.comp_lider_posgrado_min, 120),
        getPositiveRuleNumber(rules?.comp_lider_posgrado_max, fallbackMax || 200),
        true,
        'range'
      );
    default:
      return buildHourConstraint(1, fallbackMax, true, 'upto');
  }
}

function getAcademicoAdminConstraint(activity: any, rules: any, horasAProgramar: number): HourConstraint {
  const id = String(activity?.id || activity?.actividad_id || '');
  const catalogMax = Number(activity?.max_horas);

  if (activity?.consumeTotalidad) {
    return buildHourConstraint(horasAProgramar, horasAProgramar, false, 'exclusive');
  }

  switch (id) {
    case 'AA_06': {
      const maxPct = getPositiveRuleNumber(rules?.aadm_misiones_pct, 25) / 100;
      const maxHoras = getPositiveRuleNumber(rules?.aadm_misiones_horas, catalogMax || 200);
      return buildHourConstraint(1, Math.min(maxHoras, Math.round(horasAProgramar * maxPct)), true, 'upto');
    }
    case 'AA_07':
      return buildHourConstraint(1, getPositiveRuleNumber(rules?.aadm_acreditacion_max, catalogMax || 64), true, 'upto');
    case 'AA_08':
      return buildHourConstraint(
        getPositiveRuleNumber(rules?.comp_doc_coord_comision, catalogMax || 200),
        getPositiveRuleNumber(rules?.comp_doc_coord_comision, catalogMax || 200),
        false,
        'fixed'
      );
    case 'AA_09':
      return buildHourConstraint(1, getPositiveRuleNumber(rules?.comp_doc_comisionado, catalogMax || 60), true, 'upto');
    case 'AA_10':
      return buildHourConstraint(1, getPositiveRuleNumber(rules?.comp_doc_eval_propuesta, catalogMax || 10), true, 'upto');
    case 'AA_11':
      return buildHourConstraint(1, getPositiveRuleNumber(rules?.comp_doc_ajuste_microcv, catalogMax || 100), true, 'upto');
    case 'AA_12':
      return buildHourConstraint(
        1,
        Math.max(
          getPositiveRuleNumber(rules?.comp_doc_gestor_intl, catalogMax || 100),
          getPositiveRuleNumber(rules?.comp_doc_gestor_ext, catalogMax || 100)
        ),
        true,
        'upto'
      );
    default:
      return buildHourConstraint(1, getPositiveRuleNumber(catalogMax, Number(activity?.horas) || 0), true, 'upto');
  }
}

function getConstraintLabel(constraint: HourConstraint): string {
  if (constraint.mode === 'exclusive') return '100% PTA';
  if (constraint.mode === 'range') return `${constraint.min}-${constraint.max}h`;
  if (constraint.editable) return `máx ${constraint.max}h`;
  return `${constraint.max}h`;
}

function getInitialConstraintValue(constraint: HourConstraint): number {
  if (!constraint.editable) return constraint.max;
  return constraint.mode === 'range' ? constraint.min : constraint.max;
}

function clampConstraintValue(value: any, constraint: HourConstraint): number {
  if (constraint.max <= 0) return 0;
  if (!constraint.editable) return constraint.max;

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < constraint.min) return constraint.min;
  if (parsed > constraint.max) return constraint.max;
  return parsed;
}

function canSelectWithRemaining(constraint: HourConstraint, remaining: number): boolean {
  if (constraint.max <= 0) return false;
  return remaining >= constraint.min;
}

function getConstraintErrorMessage(nombre: string, horas: number, constraint: HourConstraint): string | null {
  if (constraint.max <= 0) return null;

  if (!constraint.editable) {
    if (horas !== constraint.max) {
      return `La actividad "${nombre}" debe registrarse con ${constraint.max}h exactas.`;
    }
    return null;
  }

  if (horas < constraint.min || horas > constraint.max) {
    if (constraint.mode === 'range') {
      return `La actividad "${nombre}" debe concertarse entre ${constraint.min}h y ${constraint.max}h.`;
    }
    return `La actividad "${nombre}" no puede superar ${constraint.max}h.`;
  }

  return null;
}

// ═══ MOTOR DE CÁLCULO FRONTEND (réplica Excel) ═══════════════════

function calcHorasBase(asigNombre: string, programaTipo: string, creditos: number, rules?: any): number {
  // Seminario Sede Central: bloque fijo (128h default)
  if (asigNombre.includes('Seminario De Énfasis')) return rules?.docencia_base_seminario_sc || 128;
  // Pregrado Sede Central (AP/EP): bloque fijo (64h default)
  if (programaTipo === 'AP' || programaTipo === 'EP') return rules?.docencia_base_pregrado_sc || 64;
  // Maestría: base por crédito (12h/cr default)
  if (programaTipo === 'Maestría' || programaTipo === 'MAESTRIA') return creditos * (rules?.docencia_base_maestria || 12);
  // Especialización: base por crédito (16h/cr default)
  if (programaTipo === 'Especialización' || programaTipo === 'ESPECIALIZACION') return creditos * (rules?.docencia_base_especializacion || 16);
  // APT / Pregrado Territorial y cualquier otro: base por crédito (16h/cr default)
  return creditos * (rules?.docencia_base_apt || 16);
}

function calcTotalHoras(asigNombre: string, horasBase: number, rules?: any): number {
  if (asigNombre === 'Opciones De Grado AP') return 20;
  if (asigNombre === 'Seminario De Opciones De Grado APT') return 144;
  return horasBase * (rules?.criterio_multiplicador_docencia || 3);
}

function prorratear(total: number, base: number, pct: number): number {
  return Math.min(total, base * pct);
}

// ═══ CONSTANTS ═══════════════════════════════════════════════════════

// Tipos de vinculación con horas según Circular 003/2025
const TIPOS_VINCULACION = [
  { codigo: 'CARRERA_009', nombre: 'Carrera Profesoral — Acuerdo 009/2004', regimen: '009/2004', horas_tc: 720, horas_mt: 360, calculo: 'fijo' },
  { codigo: 'CARRERA_003', nombre: 'Carrera Profesoral — Acuerdo 003/2018', regimen: '003/2018', horas_tc: 800, horas_mt: 400, calculo: 'fijo' },
  { codigo: 'PERIODO_PRUEBA', nombre: 'Periodo de Prueba', regimen: '003/2018', horas_tc: 800, horas_mt: 400, calculo: 'fijo' },
  { codigo: 'OCASIONAL', nombre: 'Docente Ocasional', regimen: 'no_vinculado', horas_tc: null, horas_mt: null, calculo: 'semanas' },
  { codigo: 'VISITANTE', nombre: 'Docente Visitante', regimen: 'no_vinculado', horas_tc: null, horas_mt: null, calculo: 'semanas' },
  { codigo: 'ESPECIAL', nombre: 'Docente Especial', regimen: 'no_vinculado', horas_tc: null, horas_mt: null, calculo: 'semanas' },
];

function calcHorasProgramables(tipoVinc: string, dedicacion: string, semanas?: number, rules?: any): number {
  const tipo = TIPOS_VINCULACION.find(t => t.codigo === tipoVinc);
  if (!tipo) return dedicacion === 'Medio Tiempo' ? 400 : 800;
  if (tipo.calculo === 'fijo') {
    // Use DB-configured horas base when available
    if (tipo.codigo === 'CARRERA_009') {
      const base = rules?.horas_base_carrera_009 || tipo.horas_tc || 720;
      return dedicacion === 'Medio Tiempo' ? Math.round(base / 2) : base;
    }
    // CARRERA_003 and PERIODO_PRUEBA use 003 base
    const base = rules?.horas_base_carrera_003 || tipo.horas_tc || 800;
    return dedicacion === 'Medio Tiempo' ? Math.round(base / 2) : base;
  }
  const hSem = dedicacion === 'Medio Tiempo' ? (rules?.horas_semanales_mt || 20) : (rules?.horas_semanales_tc || 40);
  return hSem * (semanas || 20);
}

const DEDICACION_HORAS: Record<string, number> = {
  'Tiempo Completo': 800,
  'Medio Tiempo': 400,
};

const ROLES_INVESTIGACION_HORAS: Record<string, number> = {
  'INVESTIGADOR LÍDER DE PROYECTO': 400,
  'COINVESTIGADOR': 300,
  'ASISTENTE DE INVESTIGACIÓN NIVEL II': 200,
  'LÍDER DE SEMILLERO DE INVESTIGACIÓN': 120,
  'ENLACE TERRITORIAL DE INVESTIGACIONES': 200,
};

const DEFAULT_EXT_SECCIONES = [
  { key: 'capacitacion', label: 'Capacitación (SNPI)', color: '#059669', orden: 1 },
  { key: 'seleccion', label: 'Selección (SNPI)', color: '#0284C7', orden: 2 },
  { key: 'fortalecimiento', label: 'Fortalecimiento (SNPI)', color: '#7C3AED', orden: 3 },
  { key: 'laboratorio_innovacion', label: 'Laboratorio de Innovación', color: '#0E7490', orden: 4 },
  { key: 'investigacion_aplicada', label: 'Investigación Aplicada', color: '#15803D', orden: 5 },
  { key: 'alto_gobierno', label: 'Alto Gobierno (EAG)', color: '#B45309', orden: 6 },
];

// ═══ COMPONENT ═══════════════════════════════════════════════════════

export function PTAForm({ onBack, userPersonId, ptaId, isAdminEdit = false, jefaturaTerritorialId }: PTAFormProps) {
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const handleSaveRef = useRef<((enviar?: boolean, silent?: boolean) => Promise<void>) | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<Date | null>(null);
  const [autoSaveCountdown, setAutoSaveCountdown] = useState(120);
  const autoSaveCountdownRef = useRef(120);
  const [loadingPta, setLoadingPta] = useState(!!ptaId);
  const { addNotification } = useNotifications();
  const [slotNode, setSlotNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setSlotNode(document.getElementById('portal-left-sidebar-slot'));
  }, []);

  // Catálogos
  const [programas, setProgramas] = useState<any[]>([]);
  const [asignaturasCat, setAsignaturasCat] = useState<any[]>([]);
  const [territoriales, setTerritoriales] = useState<any[]>([]);
  const [cetapsMap, setCetapsMap] = useState<Record<string, any[]>>({});
  const [actInvestigacion, setActInvestigacion] = useState<any[]>([]);
  const [actExtension, setActExtension] = useState<any>(null);
  const [extSecciones, setExtSecciones] = useState<Array<{ key: string; label: string; color: string; orden: number }>>(DEFAULT_EXT_SECCIONES);
  const [actComplementarias, setActComplementarias] = useState<any[]>([]);
  const [actAcadAdmin, setActAcadAdmin] = useState<any[]>([]);
  const [rolesInvestigacion, setRolesInvestigacion] = useState<any[]>([]);
  const [ptaRules, setPtaRules] = useState<any>(null);

  // Form data
  const [periodo, setPeriodo] = useState('2026-1');
  const [dedicacion, setDedicacion] = useState('Tiempo Completo');
  const [tipoVinculacion, setTipoVinculacion] = useState('CARRERA_003');
  const [semanasVinculacion, setSemanasVinculacion] = useState(20);
  const [semanasProrrateo, setSemanasProrrateo] = useState(16);
  const [horasAProgramar, setHorasAProgramar] = useState(800);
  const [estado, setEstado] = useState('Borrador');
  const [originalEstado, setOriginalEstado] = useState('');
  const [observacionesDocente, setObservacionesDocente] = useState('');
  const [camposModificados, setCamposModificados] = useState<Record<string, boolean>>({});
  const [erroresBloqueantes, setErroresBloqueantes] = useState<any[]>([]);

  // Local user defaults
  const [defaultTerritorial, setDefaultTerritorial] = useState('');
  const [defaultCetap, setDefaultCetap] = useState('');

  // ID interno que se actualiza tras el primer guardado (evita duplicados al guardar múltiples veces)
  const [currentPtaId, setCurrentPtaId] = useState<string | undefined>(ptaId || undefined);

  // Firma digital del docente — requerida antes de cada envío
  const [showFirmaDocente, setShowFirmaDocente] = useState(false);
  const [pendingDocenteAccion, setPendingDocenteAccion] = useState<'via_save' | 'avanzar_sin_cambios' | null>(null);
  const [docenteName, setDocenteName] = useState('');
  // Legacy — conservados por compatibilidad
  const [isFirmaModalOpen, setIsFirmaModalOpen] = useState(false);
  const [savedPtaIdForSignature, setSavedPtaIdForSignature] = useState('');
  const [targetEstado, setTargetEstado] = useState('Pendiente Jefatura');

  // Recalcular horas cuando cambia tipo vinculación
  const tipoVincData = TIPOS_VINCULACION.find(t => t.codigo === tipoVinculacion);
  const esNoVinculado = tipoVincData?.regimen === 'no_vinculado';

  useEffect(() => {
    const base = calcHorasProgramables(tipoVinculacion, dedicacion, semanasVinculacion, ptaRules);
    // Prorrateo: no incrementa topes (máximo factor = 1.0)
    const factor = Math.min((semanasProrrateo || 16) / 16, 1.0);
    setHorasAProgramar(Math.round(base * factor));
  }, [tipoVinculacion, dedicacion, semanasVinculacion, ptaRules, semanasProrrateo]);

  // Componentes
  const [asignaturas, setAsignaturas] = useState<AsignaturaItem[]>([]);
  const [invProyecto, setInvProyecto] = useState<InvestigacionProyecto>({
    nombre: '', codigo: '', grupo: '', linea: '', rol: '',
    horas_solicitadas: 0, fecha_inicio: '', fecha_fin: '',
  });
  const [invActividades, setInvActividades] = useState<InvestigacionActividad[]>([]);
  const [extActividades, setExtActividades] = useState<ExtensionActividad[]>([]);
  const [complementarias, setComplementarias] = useState<ComplementariaItem[]>([]);
  const [academicoAdmin, setAcademicoAdmin] = useState<ComplementariaItem[]>([]);

  const [activeSection, setActiveSection] = useState<'docencia' | 'investigacion' | 'extension' | 'complementarias' | 'academico_admin'>('docencia');
  const [extSubseccion, setExtSubseccion] = useState('capacitacion');

  // Load catálogos
  useEffect(() => {
    Promise.all([
      getCatalogoProgramas(),
      getCatalogoAsignaturas(),
      getCatalogoTerritoriales(),
      getCatalogoActividadesInvestigacion(),
      getCatalogoActividadesExtension(),
      getCatalogoActividadesComplementarias(),
      getCatalogoActividadesAcademicoAdmin(),
      getCatalogoRolesInvestigacion(),
      getConfiguracionPTAGlobal(),
      getCatalogoSeccionesExtension(),
    ]).then(([progs, asigs, terrs, actInv, actExt, actComp, actAcad, roles, config, secciones]) => {
      if (progs.success) setProgramas(progs.data);
      if (asigs.success) setAsignaturasCat(asigs.data);
      if (terrs.success) setTerritoriales(terrs.data);
      if (actInv.success) setActInvestigacion(actInv.data);
      if (actExt.success) setActExtension(actExt.data);
      if (actComp.success) setActComplementarias(actComp.data);
      if (actAcad.success) setActAcadAdmin(actAcad.data);
      if (roles.success) setRolesInvestigacion(roles.data);
      if (config.success && config.data) setPtaRules(config.data);
      if (secciones.success && Array.isArray(secciones.data) && secciones.data.length > 0) {
        const sorted = [...secciones.data].sort((a: any, b: any) => (a.orden ?? 0) - (b.orden ?? 0));
        setExtSecciones(sorted);
        setExtSubseccion(sorted[0]?.key || 'capacitacion');
      }
    });
  }, []);

  const loadingCetapsRef = useRef<Set<string>>(new Set());

  // Load CETAPs when territorial selected
  const loadCetaps = useCallback(async (territorialId: string) => {
    setCetapsMap(prev => {
      if (prev[territorialId] || loadingCetapsRef.current.has(territorialId)) return prev;
      loadingCetapsRef.current.add(territorialId);
      getCatalogoCetaps(territorialId).then(res => {
        loadingCetapsRef.current.delete(territorialId);
        if (res.success) {
          setCetapsMap(curr => ({ ...curr, [territorialId]: res.data }));
        }
      });
      return prev;
    });
  }, []);

  // Sync CETAPs for existing asignaturas
  useEffect(() => {
    if (!asignaturas.length) return;
    asignaturas.forEach(a => {
      const tid = a.territorial_id || defaultTerritorial;
      if (tid) loadCetaps(tid);
    });
  }, [asignaturas, defaultTerritorial, loadCetaps]);

  // Load existing PTA
  useEffect(() => {
    if (!ptaId) return;
    setLoadingPta(true);
    getPTAById(ptaId).then(res => {
      if (res.success && res.data) {
        const d = res.data;
        setPeriodo(d.periodo || '2026-1');
        setDedicacion(d.dedicacion || 'Tiempo Completo');
        setTipoVinculacion(d.tipo_vinculacion || 'CARRERA_003');
        setSemanasVinculacion(d.semanas_vinculacion || 20);
        setSemanasProrrateo(d.semanas_prorrateo || 16);
        setHorasAProgramar(d.horas_a_programar || 800);
        setEstado(d.estado || 'Borrador');
        setOriginalEstado(d.estado || '');
        setAsignaturas(d.asignaturas || []);
        setInvProyecto(d.investigacion_proyecto || invProyecto);
        setInvActividades(d.investigacion_actividades || []);
        setExtActividades(d.extension_actividades || []);
        setComplementarias(d.complementarias || []);
        setAcademicoAdmin(d.academico_admin || []);
        setObservacionesDocente(d.observaciones_docente || '');
        if (d.camposModificadosPorRevisor) setCamposModificados(d.camposModificadosPorRevisor);
      }
      setLoadingPta(false);
    });
  }, [ptaId]);

  // Load Docente User Profile to prepopulate defaults
  useEffect(() => {
    if (!userPersonId) return;
    getPerfilPortal(userPersonId).then(res => {
      if (res && res.success && res.data) {
        const p = res.data;
        // Territorial y CETAP: siempre se cargan del perfil (son fijos del docente)
        const tId = p.territorial_id || p.territorialId;
        if (tId) {
          setDefaultTerritorial(tId);
          loadCetaps(tId);
        }
        if (p.sede_id || p.sedeId) {
          setDefaultCetap(p.sede_id || p.sedeId);
        }
        // Nombre del docente para firma digital
        const nombre = p.nombre || p.primer_nombre || p.fullName || p.name || '';
        if (nombre) setDocenteName(nombre);
        // Tipo de vinculación y dedicación: solo al crear un PTA nuevo (al editar vienen del PTA guardado)
        if (!ptaId) {
          if (p.tipoVinculacion) {
            setTipoVinculacion(p.tipoVinculacion);
          }
          if (p.dedicacion) {
            setDedicacion(p.dedicacion);
            setHorasAProgramar(calcHorasProgramables(p.tipoVinculacion || 'CARRERA_003', p.dedicacion, semanasVinculacion, ptaRules));
          }
        }
      }
    }).catch(console.error);
  }, [userPersonId, ptaId, loadCetaps, semanasVinculacion]);

  // ═══ SOLAPAMIENTO (necesario antes de calcular hDocencia) ════════════════
  const docenciaOverlapInfo = useMemo(() => {
    const presenciales = asignaturas.filter(a =>
      (a.modalidad || 'PRESENCIAL') !== 'VIRTUAL' &&
      a.fecha_inicio && a.fecha_fin
    );
    const conflicts: string[] = [];
    const conflictIds = new Set<number>(); // IDs (a.id) de asignaturas conflictivas
    for (let i = 0; i < presenciales.length; i++) {
      for (let j = i + 1; j < presenciales.length; j++) {
        const a = presenciales[i];
        const b = presenciales[j];
        if (a.territorial_id && b.territorial_id && a.territorial_id === b.territorial_id) continue;
        const aS = new Date(a.fecha_inicio);
        const aE = new Date(a.fecha_fin);
        const bS = new Date(b.fecha_inicio);
        const bE = new Date(b.fecha_fin);
        if (aS <= bE && bS <= aE) {
          conflictIds.add(b.id);
          conflicts.push(
            `"${b.asignatura_nombre || `Asignatura`}" genera un cruce con ` +
            `"${a.asignatura_nombre || `Asignatura`}" ` +
            `(${a.fecha_inicio}–${a.fecha_fin} / ${b.fecha_inicio}–${b.fecha_fin}).`
          );
        }
      }
    }
    return { warnings: conflicts, conflictIds };
  }, [asignaturas]);
  const docenciaOverlapWarnings = docenciaOverlapInfo.warnings;
  const docenciaConflictIds = docenciaOverlapInfo.conflictIds;

  // ═══ CÁLCULOS (réplica fórmulas Excel) ═══════════════════════════

  const hDocencia = useMemo(() =>
    // Excluir asignaturas con conflicto de solapamiento del total
    asignaturas.reduce((t, a) => docenciaConflictIds.has(a.id) ? t : t + (a.total_horas || 0), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [asignaturas, docenciaConflictIds]
  );

  const hInvestigacion_raw = useMemo(() =>
    invActividades.reduce((t, a) => t + (a.horas_total || 0), 0),
    [invActividades]
  );

  const hExtension = useMemo(() =>
    extActividades.reduce((t, e) => t + (e.horas || 0), 0),
    [extActividades]
  );

  const hComplementarias = useMemo(() =>
    complementarias.reduce((t, c) => t + (c.horas || 0), 0),
    [complementarias]
  );

  const hAcademicoAdmin = useMemo(() =>
    academicoAdmin.reduce((t, c) => t + (c.horas || 0), 0),
    [academicoAdmin]
  );

  // Prorrateo según Circular 003/2025 y Configuración Dinámica Backend
  const maxPctExt = ptaRules?.max_pct_extension ? (ptaRules.max_pct_extension / 100) : 0.25;
  const maxPctComp = ptaRules?.max_pct_complementarias ? (ptaRules.max_pct_complementarias / 100) : 0.25;

  // Roles e actividades dinámicos — prioridad: ptaRules (config) > catálogo API
  const rolesParaDropdown: any[] = useMemo(() => {
    if (ptaRules?.inv_roles?.length) return ptaRules.inv_roles.map((r: any) => ({ ...r, horas_max: r.horas_max }));
    return rolesInvestigacion;
  }, [ptaRules, rolesInvestigacion]);

  const actividadesParaDropdown: any[] = useMemo(() => {
    if (ptaRules?.inv_actividades?.length)
      return ptaRules.inv_actividades.map((a: any) => ({ ...a, max_horas: a.horas_max }));
    return actInvestigacion;
  }, [ptaRules, actInvestigacion]);

  // Mapa nombre→horas_max para lookup rápido
  const rolesHorasMap = useMemo((): Record<string, number> => {
    const base: Record<string, number> = { ...ROLES_INVESTIGACION_HORAS };
    rolesParaDropdown.forEach((r: any) => { base[r.nombre] = r.horas_max; });
    return base;
  }, [rolesParaDropdown]);

  const hInvestigacion = useMemo(() => {
    if (invProyecto.rol && rolesHorasMap[invProyecto.rol]) {
      return rolesHorasMap[invProyecto.rol];
    }
    return hInvestigacion_raw;
  }, [hInvestigacion_raw, invProyecto.rol, rolesHorasMap]);

  // Prorrateo según Circular 003/2025 y Configuración Dinámica Backend
  const maxPctInv = useMemo(() => {
    if (invProyecto.rol) {
      const maxRol = rolesHorasMap[invProyecto.rol] || Infinity;
      let rolLimit = maxRol;
      if (tipoVinculacion !== 'CARRERA_009') {
          const base800 = ptaRules?.horas_base_carrera_003 || 800;
          const factor = horasAProgramar / base800;
          rolLimit = Math.round(maxRol * factor);
      }
      return horasAProgramar > 0 ? (rolLimit / horasAProgramar) : 0.5;
    }
    return 0.25; // 25% si no tiene rol
  }, [invProyecto.rol, rolesHorasMap, tipoVinculacion, ptaRules, horasAProgramar]);

  const docProrr = prorratear(hDocencia, horasAProgramar, 1.0);
  const invProrr = prorratear(hInvestigacion, horasAProgramar, maxPctInv);
  const extProrr = prorratear(hExtension, horasAProgramar, maxPctExt);
  const compProrr = prorratear(hComplementarias, horasAProgramar, maxPctComp);
  const acadProrr = hAcademicoAdmin;

  const totalHoras = docProrr + invProrr + extProrr + compProrr + acadProrr;
  const horasRestantes = horasAProgramar - totalHoras;
  const minHoras = Math.round(horasAProgramar * 0.9);
  const porcentaje = horasAProgramar > 0 ? Math.round((totalHoras / horasAProgramar) * 100) : 0;

  // Actividad académico-admin que consume el 100% del PTA (bloquea otras secciones)
  const actividadTotalidad = academicoAdmin.find(a => a.consumeTotalidad);

  // Límites excedidos
  // Límite Extensión: mínimo entre absoluto (ej. 200h) y porcentaje (ej. 25%)
  const maxExtLimit = Math.min(ptaRules?.ext_max_horas_enlace || 200, horasAProgramar * maxPctExt);

  const hCompOrdinary = useMemo(() =>
    complementarias
      .filter(c => !String(c.nombre).toUpperCase().includes('SINDICATO'))
      .reduce((t, c) => t + (c.horas || 0), 0),
    [complementarias]
  );

  const invExcede = !actividadTotalidad && hInvestigacion > horasAProgramar * maxPctInv;
  const extExcede = !actividadTotalidad && hExtension > maxExtLimit;
  const compExcede = !actividadTotalidad && hCompOrdinary > horasAProgramar * maxPctComp;
  const acadExcede = false;

  // ═══ VALIDACIONES COMPLEMENTARIAS ═════════════════════════════════════
  const compWarnings = useMemo(() => {
    const warns: string[] = [];
    const maxCompLimit = horasAProgramar * maxPctComp;
    if (hCompOrdinary > maxCompLimit) {
      warns.push(`La suma de complementarias (${hCompOrdinary}h) supera el tope del ${maxPctComp * 100}% (${maxCompLimit}h), excluyendo Sindicatos.`);
    }
    complementarias.forEach(comp => {
      if (!comp.actividad_id) return;
      const cat = actComplementarias.find((a: any) => a.id === comp.actividad_id) || comp;
      const error = getConstraintErrorMessage(comp.nombre || cat.nombre || comp.actividad_id, Number(comp.horas || 0), getComplementariaConstraint(cat, ptaRules));
      if (error) warns.push(error);
    });
    // Revisar si hay un acto administrativo del 100% que impida cargas complementarias
    if (actividadTotalidad && complementarias.length > 0) {
      warns.push(`No puedes asignar horas complementarias porque tienes un acto administrativo 100% (${actividadTotalidad.nombre}).`);
    }
    return warns;
  }, [hCompOrdinary, maxPctComp, horasAProgramar, actividadTotalidad, complementarias, actComplementarias, ptaRules]);

  // ═══ VALIDACIONES ACADÉMICO ADMINISTRATIVAS ═══════════════════════════
  const acadWarnings = useMemo(() => {
    const warns: string[] = [];
    academicoAdmin.forEach(a => {
      const cat = actAcadAdmin.find((ac: any) => ac.id === a.actividad_id) || a;
      const constraint = getAcademicoAdminConstraint(cat, ptaRules, horasAProgramar);
      const error = getConstraintErrorMessage(a.nombre || cat.nombre || a.actividad_id, Number(a.horas || 0), constraint);
      const isMisiones = cat?.nombre?.includes('Misiones');
      if (error) warns.push(error);
      if ((a.consumeTotalidad || isMisiones) && (!a.descripcion || a.descripcion.trim().length < 3)) {
        warns.push(`La actividad "${a.nombre}" requiere obligatoriamente el Número de Acto Administrativo o Comunicación Oficial en el soporte.`);
      }
    });
    return warns;
  }, [academicoAdmin, actAcadAdmin, ptaRules, horasAProgramar]);

  // ═══ VALIDACIONES EXTENSIÓN ═══════════════════════════════════════════
  const extWarnings = useMemo(() => {
    const warns: string[] = [];
    if (hExtension > maxExtLimit) {
      warns.push(`La suma total de extensión (${hExtension}h) supera el tope global permitido (${maxExtLimit}h). Revisa todas las subsecciones.`);
    }
    return warns;
  }, [hExtension, maxExtLimit]);

  // ═══ VALIDACIONES INVESTIGACIÓN (Circular 003 - Tablas 3 y 4) ═══════════
  const invWarnings = useMemo(() => {
    const warns: string[] = [];
    const rolProyecto = (invProyecto.rol || '').toUpperCase();
    const horasProyecto = hInvestigacion;

    if (!rolProyecto && horasProyecto > horasAProgramar * 0.25) {
      warns.push(`Sin rol en proyecto: las horas solicitadas (${horasProyecto}h) exceden el máximo del 25% permitido (${Math.round(horasAProgramar * 0.25)}h).`);
    }

    // REGLA 1: Proporcionalidad dinámica de topes por rol
    if (rolProyecto && horasProyecto > 0 && tipoVinculacion !== 'CARRERA_009') {
      const base800 = ptaRules?.horas_base_carrera_003 || 800;
      const factor = horasAProgramar / base800;
      let maxH = 0;
      let rolLabel = '';
      if (rolProyecto.includes('LÍDER') || rolProyecto.includes('LIDER')) {
        maxH = Math.round((ptaRules?.max_horas_inv_lider || 400) * factor);
        rolLabel = 'Investigador Líder';
      } else if (rolProyecto.includes('COINVESTIGADOR')) {
        maxH = Math.round((ptaRules?.max_horas_inv_coinvestigador || 300) * factor);
        rolLabel = 'Coinvestigador';
      } else if (rolProyecto.includes('ASISTENTE')) {
        maxH = Math.round((ptaRules?.max_horas_inv_asistente || 200) * factor);
        rolLabel = 'Asistente Nivel II';
      }
      if (maxH > 0 && horasProyecto > maxH) {
        warns.push(`${rolLabel}: máx ${maxH}h para PTA de ${horasAProgramar}h (proporcional). Solicitadas: ${horasProyecto}h.`);
      }
    }

    // REGLA 2: Validación cruzada inv+ext ≤ 50% para Enlace/Director
    const tieneEnlaceODir = invActividades.some(a => {
      const n = (a.nombre || '').toUpperCase();
      return n.includes('ENLACE TERRITORIAL') || n.includes('DIRECTOR DE GRUPO') || n.includes('DIRECTOR GRUPO');
    });
    if (tieneEnlaceODir) {
      const maxCruzado = Math.round(horasAProgramar * 0.5);
      const sumaInvExt = hInvestigacion + hExtension;
      if (sumaInvExt > maxCruzado) {
        warns.push(`Enlace/Director: investigación+extensión (${sumaInvExt}h) excede el 50% del PTA (${maxCruzado}h).`);
      }
    }

    // REGLA 3: omitida — cuando el docente llena el proyecto, las actividades son
    // de libre registro (nombre + horas) y no aplica restricción de fomento.

    return warns;
  }, [invProyecto, invActividades, horasAProgramar, tipoVinculacion, ptaRules, hInvestigacion, hExtension]);

  // ═══ HANDLERS: DOCENCIA ═══════════════════════════════════════════

  const handleAddAsignatura = () => {
    if (asignaturas.length >= 10) {
      toast.error('Máximo 10 asignaturas por PTA');
      return;
    }
    setAsignaturas(prev => [...prev, {
      id: Date.now(),
      territorial_id: defaultTerritorial,
      cetap_id: defaultCetap,
      programa_id: '',
      asignatura_id: '', asignatura_nombre: '', nucleo_tematico: '',
      creditos: 3, semestre: 1, total_estudiantes: 25,
      horas_base: 0, total_horas: 0, porcentaje_pta: 0, observaciones: '',
      modalidad: 'PRESENCIAL', fecha_inicio: '', fecha_fin: '', _showObs: false,
    }]);
  };

  const handleAsigChange = (id: number, field: string, value: any) => {
    setAsignaturas(prev => prev.map(a => {
      if (a.id !== id) return a;
      const updated = { ...a, [field]: value };

      // Cascade: territorial → load CETAPs
      if (field === 'territorial_id' && value) {
        loadCetaps(value);
        updated.cetap_id = '';
        updated.programa_id = '';
        updated.asignatura_id = '';
        updated.asignatura_nombre = '';
      }
      // Reset downstream on CETAP change
      if (field === 'cetap_id') {
        updated.programa_id = '';
        updated.asignatura_id = '';
        updated.asignatura_nombre = '';
      }
      // On programa change
      if (field === 'programa_id') {
        updated.asignatura_id = '';
        updated.asignatura_nombre = '';
      }
      // On asignatura selection - auto-fill fields + calculate hours
      if (field === 'asignatura_id' && value) {
        const asigCat = asignaturasCat.find(ac => ac.id === value);
        if (asigCat) {
          updated.asignatura_nombre = asigCat.nombre;
          updated.nucleo_tematico = asigCat.nucleo || '';
          updated.creditos = asigCat.creditos || 3;
          updated.semestre = asigCat.semestre || 1;
          // Calcular horas según fórmulas Excel (ahora ligadas al motor de configuración)
          const prog = programas.find(p => p.id === updated.programa_id);
          const progTipo = prog?.tipo || 'APT';
          updated.horas_base = calcHorasBase(asigCat.nombre, progTipo, asigCat.creditos || 3, ptaRules);
          updated.total_horas = calcTotalHoras(asigCat.nombre, updated.horas_base, ptaRules);
          updated.porcentaje_pta = horasAProgramar > 0
            ? Number(((updated.total_horas / horasAProgramar) * 100).toFixed(1)) : 0;
        }
      }
      return updated;
    }));
  };

  const handleRemoveAsig = (id: number) => {
    setAsignaturas(prev => prev.filter(a => a.id !== id));
  };

  // ═══ HANDLERS: INVESTIGACIÓN ═══════════════════════════════════════

  // Modo catálogo (sin proyecto): agrega fila con dropdown de catálogo
  // Modo libre (con proyecto): agrega fila de texto libre + horas
  const tieneProyecto = !!(invProyecto.nombre && invProyecto.nombre.trim());

  const handleAddInvActividad = () => {
    // Validar tope general (con o sin rol) antes de dejar agregar fila
    if (invProyecto.rol) {
      const maxRol = rolesHorasMap[invProyecto.rol] || Infinity;
      let rolLimit = maxRol;
      if (tipoVinculacion !== 'CARRERA_009') {
          const base800 = ptaRules?.horas_base_carrera_003 || 800;
          const factor = horasAProgramar / base800;
          rolLimit = Math.round(maxRol * factor);
      }
      if (hInvestigacion >= rolLimit) {
        toast.error(`Máximo alcanzado: el rol "${invProyecto.rol}" permite ${rolLimit}h y ya tienes ${hInvestigacion}h asignadas.`);
        return;
      }
    } else {
      const maxSinRol = Math.round(horasAProgramar * 0.25);
      if (hInvestigacion >= maxSinRol) {
        toast.error(`Máximo alcanzado: sin rol en proyecto puedes registrar hasta el 25% del PTA (${maxSinRol}h) y ya tienes ${hInvestigacion}h asignadas.`);
        return;
      }
    }

    setInvActividades(prev => [...prev, {
      id: Date.now(), actividad_id: '', nombre: '', descripcion: '',
      cantidad: 1, horas_unitarias: 0, horas_total: 0, fecha_inicio: '', fecha_fin: '',
    }]);
  };

  const handleInvActChange = (id: number, field: string, value: any) => {
    setInvActividades(prev => prev.map(a => {
      if (a.id !== id) return a;
      const updated = { ...a, [field]: value };
      
      let maxLimit = 0;
      if (invProyecto.rol) {
          const maxRol = rolesHorasMap[invProyecto.rol] || Infinity;
          let rolLimit = maxRol;
          if (tipoVinculacion !== 'CARRERA_009') {
              const base800 = ptaRules?.horas_base_carrera_003 || 800;
              const factor = horasAProgramar / base800;
              rolLimit = Math.round(maxRol * factor);
          }
          maxLimit = rolLimit;
      } else {
          maxLimit = horasAProgramar * 0.25;
      }

      const otherSum = prev.filter(x => x.id !== id).reduce((sum, x) => sum + (x.horas_total || 0), 0);
      const remainingLimit = Math.max(0, maxLimit - otherSum);
      const isProyecto = !!(invProyecto.nombre && invProyecto.nombre.trim());

      if (field === 'actividad_id') {
        const cat = actividadesParaDropdown.find((c: any) => c.id === value);
        if (cat) {
          updated.nombre = cat.nombre;
          updated.horas_unitarias = cat.max_horas || cat.horas_max || 0;
          let val = updated.horas_unitarias;
          if (val > remainingLimit) val = remainingLimit;
          if (val < 1 && remainingLimit >= 1) val = 1;
          updated.horas_total = val;
          updated.cantidad = 1;
        }
      }
      if (field === 'horas_total') {
        let val = Number(value) || 0;
        
        if (val < 1 && value !== '') val = 1; // Ni negativos ni 0
        
        if (!isProyecto && updated.horas_unitarias > 0 && val > updated.horas_unitarias) {
            val = updated.horas_unitarias; // No mayor al default si viene del catálogo
        }
        
        if (val > remainingLimit) val = remainingLimit; // No superar lo permitido (sumatoria total)
        
        updated.horas_total = val;
      }
      return updated;
    }));
  };

  // ═══ HANDLERS: EXTENSIÓN ═══════════════════════════════════════════

  const handleAddExtActividad = (seccion: string) => {
    setExtActividades(prev => [...prev, {
      id: Date.now(), seccion, actividad_id: '', nombre: '', horas: 0, horas_ejecutadas: 0, descripcion: '', fecha_inicio: '', fecha_fin: '',
    }]);
  };

  const handleExtActChange = (id: number, field: string, value: any) => {
    setExtActividades(prev => prev.map(e => {
      if (e.id !== id) return e;
      
      const maxExtLimit = Math.min(ptaRules?.ext_max_horas_enlace || 200, horasAProgramar * (ptaRules?.max_pct_extension ? (ptaRules.max_pct_extension / 100) : 0.25));
      const otherSum = prev.filter(x => x.id !== id).reduce((sum, x) => sum + (x.horas || 0), 0);
      const cupoExt = Math.max(0, maxExtLimit - otherSum);
      const cupoPta = Math.max(0, horasRestantes + (e.horas || 0)); // horas disponibles en el PTA total (reintegra las de esta actividad)
      const remainingLimit = Math.min(cupoExt, cupoPta);
      
      const updated = { ...e, [field]: value };
      
      if (field === 'actividad_id') {
        const cat = (actExtension?.[e.seccion] || []).find((c: any) => c.id === value);
        if (cat) {
          updated.nombre = cat.nombre;
          const totalCatalogo = cat.max_horas || 0;
          const maxEjecucion = updated.seccion === 'capacitacion' ? totalCatalogo / 2 : totalCatalogo;
          let valEjec = maxEjecucion;
          let valHoras = updated.seccion === 'capacitacion' ? totalCatalogo : maxEjecucion;
          
          if (valHoras > remainingLimit) {
            valHoras = remainingLimit;
            valEjec = updated.seccion === 'capacitacion' ? valHoras / 2 : valHoras;
          }
          
          if (valHoras < 1 && remainingLimit >= 1) {
             valHoras = 1;
             valEjec = updated.seccion === 'capacitacion' ? 0.5 : 1;
          }
          
          updated.horas_ejecutadas = valEjec;
          updated.horas = valHoras;
        }
      }

      if (field === 'horas_ejecutadas') {
        let val = Number(value) || 0;
        if (val < 1 && value !== '') val = 1; // Ni negativos ni 0
        
        const cat = (actExtension?.[updated.seccion] || []).find((c: any) => c.id === updated.actividad_id);
        const defaultMax = cat
          ? (updated.seccion === 'capacitacion' ? (cat.max_horas || 0) / 2 : (cat.max_horas || 0))
          : 0;
        
        if (defaultMax > 0 && val > defaultMax) {
          val = defaultMax; // No mayor al default del catálogo
        }
        
        let valHoras = updated.seccion === 'capacitacion' ? val * 2 : val;
        
        if (valHoras > remainingLimit) {
          valHoras = remainingLimit;
          val = updated.seccion === 'capacitacion' ? valHoras / 2 : valHoras;
        }
        
        updated.horas_ejecutadas = val;
        updated.horas = valHoras;
      }
      
      // Retrocompatibilidad si el input cambia 'horas' directamente
      if (field === 'horas' && updated.seccion !== 'capacitacion') {
        let val = Number(value) || 0;
        if (val < 1 && value !== '') val = 1; // Ni negativos ni 0
        
        const cat = (actExtension?.[updated.seccion] || []).find((c: any) => c.id === updated.actividad_id);
        const defaultMax = cat ? (cat.max_horas || 0) : 0;
        
        if (defaultMax > 0 && val > defaultMax) {
          val = defaultMax; // No mayor al default del catálogo
        }
        
        if (val > remainingLimit) {
          val = remainingLimit; // No superar lo permitido
        }
        
        updated.horas = val;
        updated.horas_ejecutadas = val;
      }
      
      return updated;
    }));
  };

  // ═══ HANDLERS: COMPLEMENTARIAS ═════════════════════════════════════

  const handleAddComplementaria = () => {
    if (complementarias.length >= 17) {
      toast.error('Máximo 17 actividades complementarias por PTA');
      return;
    }
    setComplementarias(prev => [...prev, {
      id: Date.now(), actividad_id: '', nombre: '', horas: 0, descripcion: '', fecha_inicio: '', fecha_fin: '',
    }]);
  };

  const handleCompChange = (id: number, field: string, value: any) => {
    setComplementarias(prev => prev.map(c => {
      if (c.id !== id) return c;
      const updated = { ...c, [field]: value };
      if (field === 'actividad_id') {
        const cat = actComplementarias.find(ac => ac.id === value);
        if (cat) {
          const isSindicato = String(cat.nombre).toUpperCase().includes('SINDICATO');
          const maxCompLimit = horasAProgramar * (ptaRules?.max_pct_complementarias ? (ptaRules.max_pct_complementarias / 100) : 0.25);
          const otherOrdinarySum = prev
            .filter(x => x.id !== id && !String(x.nombre).toUpperCase().includes('SINDICATO'))
            .reduce((sum, x) => sum + (x.horas || 0), 0);
          const remainingLimit = isSindicato ? Infinity : Math.max(0, maxCompLimit - otherOrdinarySum);
          const globalRemainingLimit = Math.max(0, horasAProgramar - totalHoras + (c.horas || 0));
          const trueRemainingLimit = Math.min(remainingLimit, globalRemainingLimit);
          const constraint = getComplementariaConstraint(cat, ptaRules);
          const suggestedHours = getInitialConstraintValue(constraint);

          updated.nombre = cat.nombre;
          updated.horas = constraint.editable && canSelectWithRemaining(constraint, trueRemainingLimit)
            ? Math.min(suggestedHours, trueRemainingLimit)
            : suggestedHours;
        } else {
          updated.nombre = '';
          updated.horas = 0;
        }
      }
      if (field === 'horas') {
        const cat = actComplementarias.find(ac => ac.id === updated.actividad_id);
        if (cat) {
          const constraint = getComplementariaConstraint(cat, ptaRules);
          const isSindicato = String(cat.nombre).toUpperCase().includes('SINDICATO');
          const maxCompLimit = horasAProgramar * (ptaRules?.max_pct_complementarias ? (ptaRules.max_pct_complementarias / 100) : 0.25);
          const otherOrdinarySum = prev
            .filter(x => x.id !== id && !String(x.nombre).toUpperCase().includes('SINDICATO'))
            .reduce((sum, x) => sum + (x.horas || 0), 0);
          const remainingLimit = isSindicato ? Infinity : Math.max(0, maxCompLimit - otherOrdinarySum);
          const globalRemainingLimit = Math.max(0, horasAProgramar - totalHoras + (c.horas || 0));
          const trueRemainingLimit = Math.min(remainingLimit, globalRemainingLimit);
          const boundedConstraint = constraint.editable && canSelectWithRemaining(constraint, trueRemainingLimit)
            ? { ...constraint, max: Math.min(constraint.max, trueRemainingLimit) }
            : constraint;

          updated.horas = clampConstraintValue(value, boundedConstraint);
        }
      }
      return updated;
    }));
  };

  // ═══ HANDLERS: ACADEMICO ADMINISTRATIVO ═══════════════════════════

  const handleAddAcademicoAdmin = () => {
    if (academicoAdmin.length >= 17) {
      toast.error('Máximo 17 actividades académico-administrativas por PTA');
      return;
    }
    setAcademicoAdmin(prev => [...prev, {
      id: Date.now(), actividad_id: '', nombre: '', horas: 0, descripcion: '', fecha_inicio: '', fecha_fin: '',
    }]);
  };

  const handleAcadChange = (id: number, field: string, value: any) => {
    setAcademicoAdmin(prev => prev.map(c => {
      if (c.id !== id) return c;
      const updated = { ...c, [field]: value };
      if (field === 'actividad_id') {
        const cat = actAcadAdmin.find((ac: any) => ac.id === value);
        if (cat) {
          const globalRemainingLimit = Math.max(0, horasAProgramar - totalHoras + (c.horas || 0));
          const constraint = getAcademicoAdminConstraint(cat, ptaRules, horasAProgramar);
          const suggestedHours = getInitialConstraintValue(constraint);

          updated.nombre = cat.nombre;
          updated.consumeTotalidad = cat.consumeTotalidad || false;
          updated.horas = constraint.editable && canSelectWithRemaining(constraint, globalRemainingLimit)
            ? Math.min(suggestedHours, globalRemainingLimit)
            : suggestedHours;

          if (updated.consumeTotalidad) {
            // Limpieza integral automática para evitar cruce de topes con otras secciones
            setAsignaturas([]);
            setInvProyecto({ nombre: '', codigo: '', grupo: '', linea: '', rol: '', horas_solicitadas: 0, fecha_inicio: '', fecha_fin: '' });
            setInvActividades([]);
            setExtActividades([]);
            setComplementarias([]);
            toast.info('Las demás actividades han sido removidas automáticamente debido a la asignación de un rol del 100%.');
          }
        } else {
          updated.nombre = '';
          updated.horas = 0;
          updated.consumeTotalidad = false;
        }
      }
      if (field === 'horas') {
        const cat = actAcadAdmin.find((ac: any) => ac.id === updated.actividad_id);
        if (cat) {
          const constraint = getAcademicoAdminConstraint({ ...cat, consumeTotalidad: updated.consumeTotalidad }, ptaRules, horasAProgramar);
          const globalRemainingLimit = Math.max(0, horasAProgramar - totalHoras + (c.horas || 0));
          const boundedConstraint = constraint.editable && canSelectWithRemaining(constraint, globalRemainingLimit)
            ? { ...constraint, max: Math.min(constraint.max, globalRemainingLimit) }
            : constraint;

          updated.horas = clampConstraintValue(value, boundedConstraint);
        }
      }
      return updated;
    }));
  };

  // ═══ SAVE / SUBMIT ════════════════════════════════════════════════

  const handleSave = async (enviar = false, silent = false) => {
    setSaving(true);
    savingRef.current = true;
    if (!silent) { autoSaveCountdownRef.current = 120; setAutoSaveCountdown(120); }

    // Validación mínima docencia: al menos 1 asignatura
    if (enviar && asignaturas.length === 0) {
      toast.error('Debe incluir al menos una asignatura de docencia.');
      setSaving(false);
      return;
    }

    // Validación: al menos una asignatura con mínimo 3 créditos
    if (enviar && !asignaturas.some(a => (a.creditos || 0) >= 3)) {
      toast.error('Debe incluir al menos una asignatura de mínimo 3 créditos para poder enviar el PTA.');
      setSaving(false);
      return;
    }

    // Validación de solapamiento de fechas en Docencia
    if (docenciaOverlapWarnings.length > 0) {
      toast.error(docenciaOverlapWarnings[0]);
      setSaving(false);
      return;
    }

    // Validación de límites de horas
    if (enviar && totalHoras < minHoras) {
      toast.error(`Aún faltan ${minHoras - totalHoras}h por programar para el mínimo requerido (${minHoras}h).`);
      setSaving(false);
      return;
    }
    if (enviar && totalHoras > horasAProgramar) {
      toast.error(`Te has excedido en ${totalHoras - horasAProgramar}h programables. Verifica tu Plan.`);
      setSaving(false);
      return;
    }

    // Validación de reglas de negocio para Investigación
    if (enviar && invWarnings && invWarnings.length > 0) {
      toast.error('Existen errores en la configuración de Investigación. Revisa las advertencias en la sección y corrígelas antes de enviar.');
      setSaving(false);
      return;
    }

    // Validación de reglas de negocio para Extensión
    if (enviar && extWarnings && extWarnings.length > 0) {
      toast.error('Existen errores en la configuración de Extensión. Revisa las advertencias en la sección y corrígelas antes de enviar.');
      setSaving(false);
      return;
    }

    // Validación de reglas de negocio para Complementarias
    if (enviar && compWarnings && compWarnings.length > 0) {
      toast.error('Existen errores en las Actividades Complementarias. Revisa las advertencias en la sección y corrígelas antes de enviar.');
      setSaving(false);
      return;
    }

    // Validación de reglas de negocio para Académico-Administrativas
    if (enviar && acadWarnings && acadWarnings.length > 0) {
      toast.error('Existen errores en las Actividades Académico-Administrativas. Se requiere documento soporte.');
      setSaving(false);
      return;
    }

    const isReenvio = originalEstado === 'Devuelto' && enviar;

    const payload = {
      id: currentPtaId || undefined,
      docente_id: userPersonId,
      docente_nombre: docenteName || undefined,
      periodo,
      dedicacion,
      tipo_vinculacion: tipoVinculacion,
      semanas_vinculacion: esNoVinculado ? semanasVinculacion : undefined,
      semanas_prorrateo: semanasProrrateo,
      horas_a_programar: horasAProgramar,
      // Admin: preserva estado actual. Docente: si envía usa estado actual, si guarda → Borrador
      estado: isAdminEdit ? estado : (enviar ? estado : 'Borrador'),
      _adminEdit: isAdminEdit || undefined,
      asignaturas: asignaturas.filter(a => a.asignatura_id && a.asignatura_id !== ''),
      investigacion_proyecto: invProyecto.nombre
        ? { ...invProyecto, horas_solicitadas: invProyecto.rol ? hInvestigacion : 0 }
        : undefined,
      investigacion_actividades: invActividades.filter(a => (a.actividad_id && a.actividad_id !== '') || (a.nombre && a.horas_total > 0)),
      extension_actividades: extActividades.filter(e => e.actividad_id && e.actividad_id !== ''),
      complementarias: complementarias.filter(c => c.actividad_id && c.actividad_id !== ''),
      academico_admin: academicoAdmin.filter(c => c.actividad_id && c.actividad_id !== ''),
      observaciones_docente: observacionesDocente,
      _reenvio: isReenvio || undefined,
    };

    let res: any;
    try {
      res = await savePTA(payload);
    } catch (err) {
      setSaving(false);
      savingRef.current = false;
      toast.error('Error de conexión al guardar. Intenta de nuevo.');
      return;
    }
    setSaving(false);
    savingRef.current = false;

    if (res.success) {
      if (res.data?.id) setCurrentPtaId(res.data.id);

      // Modo admin: solo guardar y volver al panel
      if (isAdminEdit) {
        toast.success('Cambios guardados correctamente.');
        onBack();
        return;
      }

      if (enviar || isReenvio) {
        if (isEnRevisionDocente) {
          // Revisión docente: re-enviar corregido directamente (sin firma, ya estaba firmado)
          const { updatePTAStatus } = await import('../../../services/api/ptaApi');
          const reenvio = await updatePTAStatus(res.data.id, { accion: 'reenviar_corregido' });
          if (reenvio.success) {
            toast.success(`PTA re-enviado a revisión (v${reenvio.version}) — ${reenvio.nuevoEstado}`);
            addNotification({ type: 'success', title: 'Re-envío exitoso', message: `Tu PTA versión ${reenvio.version} fue enviado a ${reenvio.nuevoEstado}` });
            onBack();
          } else {
            toast.error(reenvio.message || 'Error al re-enviar el PTA');
          }
        } else {
          // Flujo normal: enviar directamente a Pendiente Jefatura sin firma
          const { updatePTAStatus } = await import('../../../services/api/ptaApi');
          const envio = await updatePTAStatus(res.data.id, {
            estado: 'Pendiente Jefatura',
          });
          if (envio.success) {
            toast.success('PTA enviado a revisión de Jefatura');
            addNotification({ type: 'success', title: 'PTA enviado', message: 'Tu PTA fue enviado exitosamente a Pendiente Jefatura' });

            // Notification if there's a bottleneck
            if (envio.faltaRevisor) {
              toast.warning('Aviso: Actualmente no hay evaluadores asignados para tu territorial. La revisión podría demorar.', { duration: 8000 });
            }

            onBack();
          } else {
            toast.error(envio.message || 'Error al enviar el PTA');
          }
        }
      } else {
        if (!silent) toast.info('Borrador guardado. Puedes continuar editando.');
      }
    } else {
      toast.error(res.message || 'Error al guardar el PTA');
    }
  };

  // Siempre apunta a la versión más reciente de handleSave (evita stale closures en el intervalo)
  handleSaveRef.current = handleSave;

  const handleSignatureSuccess = (certId: string) => {
    setIsFirmaModalOpen(false);
    toast.success('PTA firmado y enviado exitosamente');
    addNotification({ type: 'success', title: 'Firma Exitosa', message: `Tu PTA ha sido firmado y enviado. Certificado: ${certId}` });
    onBack();
  };

  const handleFirmaDocenteCompleta = async (firmaData: FirmaData) => {
    setShowFirmaDocente(false);
    if (currentPtaId) guardarFirmaDigitalPTA(currentPtaId, firmaData).catch(() => { });

    if (pendingDocenteAccion === 'avanzar_sin_cambios') {
      if (!currentPtaId) return;
      const { updatePTAStatus } = await import('../../../services/api/ptaApi');
      const r = await updatePTAStatus(currentPtaId, { accion: 'avanzar_sin_cambios' });
      if (r.success) { toast.success(`PTA firmado y enviado a ${r.nuevoEstado}`); onBack(); }
      else toast.error(r.message || 'Error al avanzar');
    } else {
      // 'via_save': guarda + cambia estado (maneja Borrador, Devuelto, REVISION_DOCENTE_Nx)
      await handleSave(true);
    }
    setPendingDocenteAccion(null);
  };

  const ESTADOS_REVISION_DOCENTE = ['REVISION_DOCENTE_N1', 'REVISION_DOCENTE_N2', 'REVISION_DOCENTE_N3'];
  const isEnRevisionDocente = ESTADOS_REVISION_DOCENTE.includes(estado) || ESTADOS_REVISION_DOCENTE.includes(originalEstado);
  const isEditable = isAdminEdit || estado === 'Borrador' || originalEstado === 'Devuelto' || isEnRevisionDocente;

  // Tick de 1 seg: cronómetro de próximo auto-guardado + dispara el guardado al llegar a 0
  useEffect(() => {
    if (!isEditable || isAdminEdit) return;
    autoSaveCountdownRef.current = 120;
    setAutoSaveCountdown(120);
    const tick = setInterval(async () => {
      autoSaveCountdownRef.current -= 1;
      setAutoSaveCountdown(autoSaveCountdownRef.current);
      if (autoSaveCountdownRef.current <= 0) {
        if (!savingRef.current && handleSaveRef.current) {
          setAutoSaveStatus('saving');
          await handleSaveRef.current(false, true);
          setAutoSaveStatus('saved');
          setLastAutoSaveTime(new Date());
          setTimeout(() => setAutoSaveStatus('idle'), 3000);
        }
        autoSaveCountdownRef.current = 120;
        setAutoSaveCountdown(120);
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [isEditable, isAdminEdit]);

  const labelNivelRevision: Record<string, string> = {
    'REVISION_DOCENTE_N1': 'Jefatura aprobó tu PTA — Revisa y confirma para avanzar a Decanatura',
    'REVISION_DOCENTE_N2': 'Decanatura aprobó tu PTA — Revisa y confirma para avanzar a G. Profesoral',
    'REVISION_DOCENTE_N3': 'G. Profesoral aprobó tu PTA — Confirma para aprobación final',
  };
  const estadoSiguienteRevision: Record<string, string> = {
    'REVISION_DOCENTE_N1': 'Pendiente Decanatura',
    'REVISION_DOCENTE_N2': 'Pendiente Gestión Profesoral',
  };
  const nivelRevisionActual = ESTADOS_REVISION_DOCENTE.includes(estado) ? estado : originalEstado;

  // ═══ RENDER ═══════════════════════════════════════════════════════

  if (loadingPta) {
    return (
      <div className="text-center py-20">
        <div className="w-9 h-9 border-3 border-gray-200 border-t-[#003DA5] rounded-full animate-spin mx-auto mb-4" style={{ borderWidth: 3 }} />
        <p className="text-sm text-gray-500">Cargando PTA...</p>
      </div>
    );
  }

  // Mapping section key → camposModificadosPorRevisor field names
  const CAMPOS_POR_SECCION: Record<string, string[]> = {
    docencia: ['docencia'],
    investigacion: ['investigacion_proyecto', 'investigacion_actividades'],
    extension: ['extension_actividades'],
    complementarias: ['complementarias'],
    academico_admin: ['academico_admin'],
  };
  const seccionModificada = (key: string) =>
    isEnRevisionDocente && Object.keys(camposModificados).length > 0 &&
    (CAMPOS_POR_SECCION[key] || []).some(f => camposModificados[f]);

  const sections = [
    { key: 'docencia' as const, icon: BookOpen, label: 'Docencia', count: asignaturas.length, hours: hDocencia, prorr: docProrr, color: PTA_COLORS.DOCENCIA, limit: '100%', bloqueada: !!actividadTotalidad, modificada: seccionModificada('docencia') },
    { key: 'investigacion' as const, icon: FlaskConical, label: 'Investigación', count: invActividades.length + (invProyecto.nombre ? 1 : 0), hours: hInvestigacion, prorr: invProrr, color: PTA_COLORS.INVESTIGACION, limit: `${ptaRules?.max_pct_investigacion || 50}%`, excede: invExcede, bloqueada: !!actividadTotalidad, modificada: seccionModificada('investigacion') },
    { key: 'extension' as const, icon: Globe, label: 'Extensión', count: extActividades.length, hours: hExtension, prorr: extProrr, color: PTA_COLORS.EXTENSION, limit: `${ptaRules?.max_pct_extension || 25}%`, excede: extExcede, bloqueada: !!actividadTotalidad, modificada: seccionModificada('extension') },
    { key: 'complementarias' as const, icon: Briefcase, label: 'Complementarias', count: complementarias.length, hours: hComplementarias, prorr: compProrr, color: PTA_COLORS.COMPLEMENTARIAS, limit: `${ptaRules?.max_pct_complementarias || 25}%`, excede: compExcede, bloqueada: !!actividadTotalidad, modificada: seccionModificada('complementarias') },
    { key: 'academico_admin' as const, icon: Shield, label: 'Académico-Administrativo', count: academicoAdmin.length, hours: hAcademicoAdmin, prorr: acadProrr, color: PTA_COLORS.ACAD_ADMIN, limit: actividadTotalidad ? '100%' : 'Según actividad', excede: acadExcede, modificada: seccionModificada('academico_admin') },
  ];

  // Nombres del docente (territorial y CETAP fijos)
  const defaultTerritorialNombre = territoriales.find(t => t.id === defaultTerritorial)?.nombre || '—';
  const defaultCetapNombre = (cetapsMap[defaultTerritorial] || []).find((c: any) => c.id === defaultCetap)?.nombre || '—';

  // Helpers for cascading
  const getAsignaturasFiltradas = (programaId: string) => asignaturasCat.filter(a => a.programaId === programaId);
  const getExtCatalog = (sec: string): any[] => {
    if (!actExtension) return [];
    return (actExtension as Record<string, any[]>)[sec] || [];
  };

  return (
    <div className="max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
        <div>
          <button onClick={onBack} className="flex items-center gap-1.5 bg-transparent border-none cursor-pointer text-[13px] text-gray-500 font-medium p-0 mb-1 hover:text-gray-700">
            <ChevronLeft className="w-4 h-4" /> Volver a mis PTAs
          </button>
          <h1 className="text-[1.15rem] font-bold text-gray-900 m-0 leading-tight">
            {ptaId
              ? isEnRevisionDocente
                ? 'Revisar PTA — Aprobado con modificaciones'
                : originalEstado === 'Devuelto'
                  ? 'Corregir PTA Devuelto'
                  : 'Editar PTA'
              : 'Crear Nuevo PTA'}
          </h1>
          <p className="text-[12px] text-gray-500 mt-1">Periodo {periodo} - {dedicacion} - {horasAProgramar}h programables</p>
        </div>

        {isEditable && (
          <div className="flex flex-col sm:flex-row items-end gap-2 w-full md:w-auto">
            {/* Indicador de auto-guardado */}
            {!isAdminEdit && (
              <div className="flex items-center gap-1.5 text-[11px] font-medium self-end mb-0.5"
                style={{ color: autoSaveStatus === 'saving' ? '#D97706' : autoSaveStatus === 'saved' ? '#059669' : '#9CA3AF' }}>
                {autoSaveStatus === 'saving' && (
                  <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                )}
                {autoSaveStatus === 'saved' && <CheckCircle2 className="w-3 h-3" />}
                {autoSaveStatus === 'saving' && 'Guardando...'}
                {autoSaveStatus === 'saved' && `Guardado automáticamente ${lastAutoSaveTime ? `a las ${lastAutoSaveTime.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}` : ''}`}
                {autoSaveStatus === 'idle' && lastAutoSaveTime && `Guardado a las ${lastAutoSaveTime.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`}
              </div>
            )}
            {/* Caso: admin editando PTA en cualquier estado */}
            {isAdminEdit ? (
              <button onClick={() => handleSave(false)} disabled={saving}
                className="flex items-center justify-center gap-1.5 px-5 py-2 min-h-[36px] rounded-xl border-none text-white text-xs font-bold shadow-[0_4px_14px_0_rgba(0,61,165,0.39)] hover:bg-[#003185] active:scale-95 transition-all duration-300 disabled:opacity-50"
                style={{ background: '#003DA5' }}>
                <Save className="w-3.5 h-3.5" /> {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            ) : isEnRevisionDocente ? (
              <>
                {/* Avanzar sin modificar — requiere firma antes de pasar a la siguiente fase */}
                <button
                  onClick={() => { setPendingDocenteAccion('avanzar_sin_cambios'); setShowFirmaDocente(true); }}
                  disabled={saving}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 min-h-[36px] rounded-xl border border-gray-200/80 bg-white/80 backdrop-blur-sm text-gray-700 text-xs font-bold shadow-sm hover:shadow hover:bg-gray-50 active:scale-95 transition-all duration-300 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" /> Avanzar sin cambios
                </button>
                {/* Guardar cambios y re-enviar — requiere firma */}
                <button
                  onClick={() => { setPendingDocenteAccion('via_save'); setShowFirmaDocente(true); }}
                  disabled={saving || totalHoras < minHoras}
                  className="flex items-center justify-center gap-1.5 px-5 py-2 min-h-[36px] rounded-xl border-none text-white text-xs font-bold active:scale-95 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: (saving || totalHoras < minHoras) ? '#9CA3AF' : '#7C3AED' }}
                  title={totalHoras < minHoras ? `Faltan ${minHoras - totalHoras}h por programar` : "Firma y re-envía a la misma fase para nueva aprobación"}
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Corregir y re-enviar
                </button>
              </>
            ) : (
              <>
                <span className={`flex items-center gap-0.5 text-[10px] font-medium ${autoSaveCountdown <= 30 ? 'text-amber-500' : 'text-gray-400'}`}>
                  <Clock className="w-2.5 h-2.5" />
                  Auto en {Math.floor(autoSaveCountdown / 60)}:{String(autoSaveCountdown % 60).padStart(2, '0')}
                </span>
                <button onClick={() => handleSave(false)} disabled={saving}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 min-h-[36px] rounded-xl border border-gray-200/80 bg-white/80 backdrop-blur-sm text-gray-700 text-xs font-bold shadow-sm hover:shadow hover:bg-gray-50 active:scale-95 transition-all duration-300 disabled:opacity-50">
                  <Save className="w-3.5 h-3.5" /> Guardar Borrador
                </button>
                <button
                  onClick={() => {
                    if (asignaturas.length === 0) {
                      toast.error('Debe incluir al menos una asignatura de docencia.');
                      return;
                    }
                    if (!asignaturas.some(a => (a.creditos || 0) >= 3)) {
                      toast.error('Debe incluir al menos una asignatura de mínimo 3 créditos para poder enviar el PTA.');
                      return;
                    }
                    if (totalHoras < minHoras) {
                      toast.error(`No puedes enviar. Faltan ${minHoras - totalHoras}h para el mínimo exigido.`);
                      return;
                    }
                    if (totalHoras > horasAProgramar) {
                      toast.error(`Excedes el tope de ${horasAProgramar}h. Ajusta tus actividades.`);
                      return;
                    }
                    if (invWarnings?.length > 0) {
                      toast.error('Existen errores en Investigación. Corrígelos antes de enviar.');
                      return;
                    }
                    if (extWarnings?.length > 0) {
                      toast.error('Existen errores en Extensión. Corrígelos antes de enviar.');
                      return;
                    }
                    if (compWarnings?.length > 0) {
                      toast.error('Existen errores en Actividades Complementarias. Corrígelos antes de enviar.');
                      return;
                    }
                    if (acadWarnings?.length > 0) {
                      toast.error('Existen errores en Actividades Académico-Administrativas. Corrígelos antes de enviar.');
                      return;
                    }
                    setPendingDocenteAccion('via_save');
                    setShowFirmaDocente(true);
                  }}
                  disabled={saving || totalHoras < minHoras || totalHoras > horasAProgramar}
                  className="flex items-center justify-center gap-1.5 px-5 py-2 min-h-[36px] rounded-xl border-none text-white text-xs font-bold shadow-[0_4px_14px_0_rgba(0,61,165,0.39)] hover:shadow-[0_6px_20px_rgba(0,61,165,0.23)] hover:bg-[#003185] active:scale-95 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                  style={{ background: (saving || totalHoras < minHoras || totalHoras > horasAProgramar) ? '#9CA3AF' : '#003DA5' }}
                  title={totalHoras < minHoras ? `Faltan horas por programar` : (totalHoras > horasAProgramar ? `Sobrecarga de horas` : "")}
                >
                  {originalEstado === 'Devuelto'
                    ? <><RotateCcw className="w-3.5 h-3.5" /> Re-enviar</>
                    : <><Send className="w-3.5 h-3.5" /> Enviar a Aprobación</>}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Firma digital del docente — requerida antes de cada envío */}
      {showFirmaDocente && createPortal(
        <FirmaDigitalPTA
          ptaId={currentPtaId || ''}
          docenteNombre={docenteName}
          periodo={periodo}
          totalHoras={totalHoras}
          firmanteNombre={docenteName}
          firmanteCargo="Docente"
          etapaLabel={
            estado === 'REVISION_DOCENTE_N1' ? 'Revisión Docente N1' :
              estado === 'REVISION_DOCENTE_N2' ? 'Revisión Docente N2' :
                'Envío a Aprobación'
          }
          onFirmaCompleta={handleFirmaDocenteCompleta}
          onCancelar={() => { setShowFirmaDocente(false); setPendingDocenteAccion(null); }}
        />,
        document.body
      )}

      {/* Banner: Revisión docente post-aprobación parcial */}
      {isEnRevisionDocente && (
        <div className="flex flex-col gap-3 p-4 rounded-xl mb-5 bg-violet-50 border border-violet-200">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-violet-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold text-violet-900 text-sm">
                {labelNivelRevision[nivelRevisionActual] || 'PTA aprobado — Revisión requerida'}
              </div>
              <p className="text-sm text-violet-800 mt-1 leading-relaxed">
                Revisa tu PTA. Si <strong>aceptas</strong> haz clic en "Confirmar y avanzar". Si quieres hacer cambios, edita y usa "Corregir y re-enviar".
              </p>
              {observacionesDocente && (
                <div className="mt-2 p-2 bg-violet-100 rounded-lg text-xs text-violet-900 italic">
                  "{observacionesDocente}"
                </div>
              )}
            </div>
          </div>
          {/* Botones de acción prominentes dentro del banner */}
          <div className="flex flex-col sm:flex-row gap-2 mt-1">
            <button
              onClick={() => { setPendingDocenteAccion('avanzar_sin_cambios'); setShowFirmaDocente(true); }}
              disabled={saving}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border-none text-white text-sm font-bold disabled:opacity-50 cursor-pointer"
              style={{ background: '#7C3AED' }}
            >
              <CheckCircle2 className="w-4 h-4" /> Confirmar y avanzar a la siguiente fase
            </button>
            <button
              onClick={() => { setPendingDocenteAccion('via_save'); setShowFirmaDocente(true); }}
              disabled={saving}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-violet-300 bg-white text-violet-700 text-sm font-bold disabled:opacity-50 cursor-pointer hover:bg-violet-50"
            >
              <RotateCcw className="w-4 h-4" /> Corregir y re-enviar al revisor
            </button>
          </div>
        </div>
      )}

      {/* Devuelto alert */}
      {originalEstado === 'Devuelto' && !isEnRevisionDocente && (
        <div className="flex items-start gap-3 p-4 rounded-xl mb-5 bg-amber-50 border border-amber-200">
          <RotateCcw className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-amber-900 text-sm">PTA devuelto para correcciones</div>
            <p className="text-sm text-amber-800 mt-1 leading-relaxed">Revisa las observaciones, realiza los cambios y re-envía.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 items-start">
        {/* Main */}
        <div className="flex-1 flex flex-col gap-6 min-w-0 w-full">
          {/* Datos Vinculación */}
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-gray-200/50 p-5 shadow-[0_2px_12px_rgb(0,0,0,0.03)] transition-all">
            <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
              <div className="w-1 h-4 bg-[#003DA5] rounded-full inline-block" />
              Datos de Vinculación
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <ReadonlyField label="Tipo de Vinculación" value={TIPOS_VINCULACION.find(t => t.codigo === tipoVinculacion)?.nombre || tipoVinculacion} />
              <ReadonlyField label="Dedicación" value={dedicacion} />
              <FormSelect label="Periodo" value={periodo} disabled={!isEditable}
                onChange={v => setPeriodo(v)}
                options={[{ value: '2026-1', label: '2026-1' }, { value: '2026-2', label: '2026-2' }]} />
              {isAdminEdit && (
                <div>
                  <FormInput
                    label="Semanas Prorrateo"
                    value={semanasProrrateo}
                    type="number"
                    onChange={v => {
                      const num = Number(v);
                      if (num >= 1 && num <= 16) {
                        setSemanasProrrateo(num);
                      }
                    }}
                  />
                  {semanasProrrateo < 16 && (
                    <div className="text-[9px] text-amber-600 font-medium mt-1.5 leading-tight flex items-start gap-1">
                      <Calculator className="w-3 h-3 flex-shrink-0" />
                      El tope máximo ha sido recortado.
                    </div>
                  )}
                </div>
              )}
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 tracking-wider uppercase mb-1 ml-1 flex items-center gap-1">
                  Horas Programables
                </label>
                <div className={`flex items-center justify-center h-[36px] px-3 rounded-xl border shadow-inner text-sm font-black transition-colors ${semanasProrrateo < 16
                    ? 'bg-amber-50/50 border-amber-200 text-amber-700'
                    : 'bg-blue-50/50 border-blue-100 text-[#003DA5]'
                  }`}>
                  {horasAProgramar}h {semanasProrrateo < 16 && <span className="text-[10px] opacity-80 font-semibold ml-1">(Prorrateo)</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Status de progreso (encima de tabs) */}
          <div className={`p-3.5 rounded-xl border text-[12px] leading-relaxed flex items-start gap-2 ${totalHoras > horasAProgramar ? 'bg-red-50 border-red-200 text-red-800'
              : totalHoras >= minHoras ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-blue-50 border-blue-200 text-blue-800'
            }`}>
            {totalHoras > horasAProgramar ? <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              : totalHoras >= minHoras ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                : <Info className="w-4 h-4 shrink-0 mt-0.5" />}
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3 flex-1">
              <span className="font-bold">
                {totalHoras > horasAProgramar
                  ? `Excede por ${totalHoras - horasAProgramar}h. Verifica tu Plan.`
                  : totalHoras >= minHoras
                    ? 'Carga completa o dentro del mínimo. Listo para enviar.'
                    : `Faltan ${minHoras - totalHoras}h por programar para el mínimo requerido (${minHoras}h).`}
              </span>
              <span className="text-[11px] opacity-70 mt-0.5 sm:mt-0">{totalHoras}h / {horasAProgramar}h ({porcentaje}%)</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap gap-2 bg-gray-50/50 backdrop-blur-2xl rounded-[1.25rem] p-1.5 border border-gray-200/50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]">
            {sections.map(s => (
              <button key={s.key} onClick={() => setActiveSection(s.key)}
                className={`flex items-center justify-center gap-2.5 px-3 py-3 rounded-xl border-none text-[13px] transition-all whitespace-nowrap cursor-pointer flex-auto ${activeSection === s.key
                    ? 'text-gray-900 font-black bg-white shadow-[0_2px_10px_rgba(0,0,0,0.06)] scale-[1.01]'
                    : s.bloqueada
                      ? 'text-gray-300 font-bold bg-transparent cursor-default opacity-60'
                      : 'text-gray-500 font-bold hover:bg-white/60 hover:text-gray-800 bg-transparent'
                  }`}>
                <s.icon className={`w-4 h-4 ${activeSection === s.key ? '' : 'opacity-70'}`} style={{ color: activeSection === s.key ? s.color : undefined }} />
                <span>{s.label}</span>
                {(s as any).bloqueada && s.key !== 'academico_admin' && <AlertTriangle className="w-3.5 h-3.5 text-amber-400 ml-0.5" />}
                {s.excede && <AlertTriangle className="w-4 h-4 text-amber-500 animate-pulse ml-0.5" />}
                {s.modificada && <span title="Modificado por el revisor" className="w-2 h-2 rounded-full bg-violet-500 animate-pulse ml-0.5 inline-block" />}
                <span className={`text-[0.65rem] tracking-wider font-extrabold px-2 py-0.5 ml-1 rounded-full ${activeSection === s.key ? 'bg-gray-100 text-gray-800' : 'bg-gray-200/50 text-gray-400'}`}>
                  {s.count}
                </span>
              </button>
            ))}
          </div>

          {/* Active section */}
          <div className="bg-white rounded-3xl border border-gray-200/50 overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-8">

            {/* Overlay de sección bloqueada por actividad de totalidad */}
            {actividadTotalidad && activeSection !== 'academico_admin' && (
              <div className="p-8 text-center">
                <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
                <p className="text-sm font-bold text-gray-700 mb-1">Sección bloqueada</p>
                <p className="text-xs text-gray-500">
                  La actividad <span className="font-semibold text-amber-700">«{actividadTotalidad.nombre}»</span> consume el 100% del PTA ({horasAProgramar}h).<br />
                  Elimínala desde la sección Académico-Administrativo para desbloquear.
                </p>
              </div>
            )}

            {/* ─── DOCENCIA ─── */}
            {!actividadTotalidad && activeSection === 'docencia' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <SectionHeader title="Docencia Directa" subtitle={`${hDocencia}h programadas (máx 10 asignaturas)`}
                  color={PTA_COLORS.DOCENCIA} icon={BookOpen}
                  action={isEditable && asignaturas.length < 10 ? { label: 'Agregar Asignatura', onClick: handleAddAsignatura } : undefined} />

                {/* Banner de solapamiento — rojo, prominente */}
                {docenciaOverlapWarnings.length > 0 && (
                  <div className="mx-4 md:mx-6 mt-3 space-y-2">
                    {docenciaOverlapWarnings.map((w, i) => (
                      <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border-2 border-red-400 text-red-800 text-sm font-semibold shadow-sm">
                        <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-bold text-red-700 mb-0.5">Conflicto de fechas presenciales</div>
                          <span className="font-normal text-red-700">{w}</span>
                          <div className="mt-1 text-xs font-medium text-red-500">Las horas de esta asignatura no se suman al total ni se puede enviar el PTA.</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="p-4 md:p-6">
                  {asignaturas.length === 0 ? (
                    <EmptyState icon={BookOpen} text="Sin asignaturas" sub="Agrega asignaturas usando los dropdowns en cascada" />
                  ) : (
                    <div className="flex flex-col gap-3">
                      {asignaturas.map((asig, idx) => {
                        const isComplete = !!asig.asignatura_id;
                        const tieneConflicto = docenciaConflictIds.has(asig.id);
                        // Para bloqueo por jefatura territorial
                        const bloqueadaPorTerritorial = !!(jefaturaTerritorialId && asig.territorial_id && asig.territorial_id !== jefaturaTerritorialId);
                        const rowEditable = isEditable && !bloqueadaPorTerritorial;
                        // Datos de CETAP según la territorial de ESTA asignatura
                        const tIdAsig = asig.territorial_id || defaultTerritorial;
                        const cetapsCargadosAsig = tIdAsig in cetapsMap;
                        const listaCetapsAsig = cetapsMap[tIdAsig] || [];
                        const hasCetapsAsig = listaCetapsAsig.length > 0;
                        const programaHabilitado = hasCetapsAsig ? !!asig.cetap_id : !!tIdAsig;
                        const territorialNombre = territoriales.find(t => t.id === asig.territorial_id)?.nombre
                          || (asig.territorial_id === defaultTerritorial ? defaultTerritorialNombre : asig.territorial_id || '—');

                        return (
                          <div key={asig.id}
                            className={`p-4 rounded-xl border relative transition-all duration-300 ${
                              tieneConflicto
                                ? 'border-red-400 bg-red-50/60 shadow-[0_0_0_3px_rgba(239,68,68,0.12)] border-l-4 border-l-red-500'
                                : bloqueadaPorTerritorial
                                  ? 'border-gray-200 bg-gray-50 opacity-70'
                                  : isComplete
                                    ? 'border-gray-200 bg-white shadow-sm border-l-4 border-l-green-500'
                                    : 'border-blue-300 bg-blue-50/50 shadow-[0_0_0_3px_rgba(59,130,246,0.1)]'
                            }`}>

                            <div className="flex items-center gap-2 mb-4">
                              {isEditable && !bloqueadaPorTerritorial && (
                                <button onClick={() => handleRemoveAsig(asig.id)} title="Eliminar Asignatura"
                                  className="absolute top-3 right-3 min-w-[36px] min-h-[36px] p-2 rounded-lg border border-gray-200 bg-white text-gray-400 cursor-pointer flex items-center justify-center hover:text-red-600 hover:bg-red-50 hover:border-red-200 active:scale-95 transition-all outline-none focus:ring-2 focus:ring-red-500/50">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                              <div className={`text-sm font-black tracking-tight flex items-center gap-2.5 flex-1 ${tieneConflicto ? 'text-red-700' : isComplete ? 'text-gray-900' : 'text-blue-700'}`}>
                                {tieneConflicto ? (
                                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-600">
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                  </div>
                                ) : isComplete ? (
                                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-600">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  </div>
                                ) : (
                                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_0_4px_rgba(59,130,246,0.2)]" />
                                )}
                                Asignatura {idx + 1}
                                {tieneConflicto && (
                                  <span className="text-[0.6rem] uppercase tracking-widest font-black px-2.5 py-1 bg-red-500/10 text-red-600 border border-red-500/30 rounded-full ml-1 flex items-center gap-1">
                                    ⚠ Cruce de fechas — no suma horas
                                  </span>
                                )}
                                {!isComplete && !bloqueadaPorTerritorial && !tieneConflicto && (
                                  <span className="text-[0.55rem] uppercase tracking-widest font-black px-2.5 py-1 bg-blue-500/10 text-blue-600 border border-blue-500/20 rounded-full ml-1">
                                    Por completar
                                  </span>
                                )}
                                {bloqueadaPorTerritorial && (
                                  <span className="text-[0.6rem] font-semibold px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full border border-gray-200 flex items-center gap-1">
                                    🔒 {territorialNombre}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Row 1: Territorial editable + cascada CETAP → Programa → Asignatura */}
                            <div className={`grid grid-cols-1 md:grid-cols-2 ${hasCetapsAsig ? 'xl:grid-cols-4' : 'xl:grid-cols-3'} gap-4 mb-4 pr-10`}>
                              {/* TERRITORIAL — ahora editable */}
                              <FormSelect
                                label="Territorial *"
                                value={asig.territorial_id}
                                disabled={!rowEditable}
                                onChange={v => handleAsigChange(asig.id, 'territorial_id', v)}
                                options={territoriales.map(t => ({ value: t.id, label: t.nombre }))}
                                placeholder="Seleccionar territorial..."
                              />
                              {/* CETAP — dinámico según territorial de la asignatura */}
                              {hasCetapsAsig ? (
                                <FormSelect label="CETAP" value={asig.cetap_id} disabled={!rowEditable}
                                  onChange={v => handleAsigChange(asig.id, 'cetap_id', v)}
                                  options={listaCetapsAsig.map((c: any) => ({ value: c.id, label: c.nombre }))}
                                  placeholder="Seleccionar CETAP..." />
                              ) : cetapsCargadosAsig ? (
                                <div className="flex flex-col">
                                  <label className="block text-[10px] font-semibold text-gray-500 tracking-wider uppercase mb-1 ml-1">CETAP</label>
                                  <div className="px-3 py-2 rounded-xl bg-gray-50/40 border border-dashed border-gray-200 text-[12px] text-gray-400 italic min-h-[36px] flex items-center">Sin CETAPs</div>
                                </div>
                              ) : tIdAsig ? (
                                <div className="flex flex-col">
                                  <label className="block text-[10px] font-semibold text-gray-500 tracking-wider uppercase mb-1 ml-1">CETAP</label>
                                  <div className="px-3 py-2 rounded-xl bg-gray-50/40 border border-dashed border-gray-200 text-[12px] text-gray-400 italic min-h-[36px] flex items-center">Cargando...</div>
                                </div>
                              ) : null}
                              <FormSelect label="Programa" value={asig.programa_id} disabled={!rowEditable || !programaHabilitado}
                                onChange={v => handleAsigChange(asig.id, 'programa_id', v)}
                                options={programas.map(p => ({ value: p.id, label: `${p.nivel} - ${p.nombre}` }))}
                                placeholder={programaHabilitado ? 'Seleccionar...' : hasCetapsAsig ? 'Seleccione CETAP' : 'Seleccione territorial'} />
                              <FormSelect label="Asignatura" value={asig.asignatura_id} disabled={!rowEditable || !asig.programa_id}
                                onChange={v => handleAsigChange(asig.id, 'asignatura_id', v)}
                                options={getAsignaturasFiltradas(asig.programa_id).map(a => ({ value: a.id, label: a.nombre }))}
                                placeholder={asig.programa_id ? 'Seleccionar...' : 'Seleccione programa'} />
                            </div>

                            {/* Row 2: Campos calculados + modalidad + fechas */}
                            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-7 gap-3 mb-3">
                              <ReadonlyField label="Núcleo" value={asig.nucleo_tematico || '—'} />
                              <ReadonlyField label="Semestre" value={asig.semestre ? `${asig.semestre}` : '—'} />
                              <ReadonlyField label="Créditos" value={`${asig.creditos}`} />
                              <FormInput label="Estudiantes" type="number" value={asig.total_estudiantes} disabled={!rowEditable}
                                onChange={v => handleAsigChange(asig.id, 'total_estudiantes', Math.min(50, Math.max(1, Number(v) || 1)))} />
                              <ReadonlyField label="Horas Base" value={`${asig.horas_base}h`} />
                              <div>
                                <label className="block text-[0.68rem] font-semibold text-gray-500 mb-0.5">Total Horas</label>
                                <div className={`px-2 py-1.5 rounded-md text-sm font-bold text-center ${tieneConflicto ? 'bg-red-50 border border-red-300 text-red-600 line-through' : 'bg-blue-50 border border-blue-200 text-[#003DA5]'}`}>
                                  {asig.total_horas}h{tieneConflicto ? ' (excluido)' : ''}
                                </div>
                              </div>
                              {/* Modalidad */}
                              <FormSelect label="Modalidad" value={asig.modalidad || 'PRESENCIAL'} disabled={!rowEditable}
                                onChange={v => handleAsigChange(asig.id, 'modalidad', v)}
                                options={[
                                  { value: 'PRESENCIAL', label: 'Presencial' },
                                  { value: 'VIRTUAL', label: 'Virtual' },
                                  { value: 'MIXTA', label: 'Mixta' },
                                ]} />
                            </div>

                            {/* Row 3: Fechas de la actividad */}
                            <div className="grid grid-cols-2 gap-3 mb-3">
                              <FormInput label="Fecha inicio" type="date" value={asig.fecha_inicio || ''} disabled={!rowEditable}
                                onChange={v => handleAsigChange(asig.id, 'fecha_inicio', v)} />
                              <FormInput label="Fecha fin" type="date" value={asig.fecha_fin || ''} disabled={!rowEditable}
                                onChange={v => handleAsigChange(asig.id, 'fecha_fin', v)} />
                            </div>

                            {/* Row 4: Observaciones toggle */}
                            {rowEditable && (
                              <div className="mt-1">
                                <button
                                  type="button"
                                  onClick={() => handleAsigChange(asig.id, '_showObs', !asig._showObs)}
                                  className={`text-[0.7rem] font-semibold px-3 py-1 rounded-full border transition-all flex items-center gap-1.5 ${
                                    asig.observaciones
                                      ? 'border-blue-200 bg-blue-50 text-blue-700'
                                      : 'border-gray-200 bg-white text-gray-400 hover:text-gray-600'
                                  }`}
                                >
                                  <MessageSquare className="w-3 h-3" />
                                  {asig.observaciones ? `Obs: ${asig.observaciones.length}/50` : '+ Observación'}
                                </button>
                                {asig._showObs && (
                                  <div className="mt-2">
                                    <FormInput
                                      label={`Observación (${(asig.observaciones || '').length}/50 caracteres)`}
                                      value={asig.observaciones || ''}
                                      disabled={!rowEditable}
                                      onChange={v => handleAsigChange(asig.id, 'observaciones', v.slice(0, 50))}
                                      placeholder="Ej: Grupo nocturno, requiere sala específica..."
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                            {/* Mostrar observaciones en modo no editable si existen */}
                            {!rowEditable && asig.observaciones && (
                              <div className="mt-2 text-xs text-gray-500 italic flex items-start gap-1">
                                <MessageSquare className="w-3 h-3 mt-0.5 shrink-0" />
                                {asig.observaciones}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ─── INVESTIGACIÓN ─── */}
            {!actividadTotalidad && activeSection === 'investigacion' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <SectionHeader title="Investigación" subtitle={`${hInvestigacion}h programadas (máx ${ptaRules?.max_pct_investigacion || 50}% = ${horasAProgramar * ((ptaRules?.max_pct_investigacion || 50) / 100)}h)`}
                  color={PTA_COLORS.INVESTIGACION} icon={FlaskConical} excede={invExcede} />

                {invWarnings.length > 0 && (
                  <div className="mx-4 md:mx-6 mt-3 space-y-2">
                    {invWarnings.map((w, i) => (
                      <div key={i} className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <span>{w}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="p-4 md:p-6 space-y-6">
                  {/* Proyecto principal */}
                  <div className="border border-purple-200 rounded-2xl p-4 md:p-5 bg-purple-50/40 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-300/20 rounded-full blur-3xl -mr-10 -mt-10" />
                    <div className="flex items-center justify-between mb-4 relative z-10">
                      <h4 className="text-sm font-extrabold text-purple-900">Proyecto de Investigación</h4>
                      {isEditable && (invProyecto.nombre || invProyecto.codigo || invProyecto.grupo || invProyecto.linea || invProyecto.rol || invActividades.length > 0) && (
                        <button
                          onClick={() => {
                            setInvProyecto({ nombre: '', codigo: '', grupo: '', linea: '', rol: '', horas_solicitadas: 0, fecha_inicio: '', fecha_fin: '' });
                            setInvActividades([]);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-red-200 bg-red-50 text-red-600 text-xs font-semibold cursor-pointer hover:bg-red-100 transition-colors">
                          <Trash2 className="w-3 h-3" /> Limpiar
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                      <FormInput label="Nombre del Proyecto" value={invProyecto.nombre} disabled={!isEditable}
                        onChange={v => setInvProyecto(p => ({ ...p, nombre: v }))} />
                      <FormInput label="Código Proyecto" value={invProyecto.codigo} disabled={!isEditable} placeholder="ESAP-INV-XXXX"
                        onChange={v => setInvProyecto(p => ({ ...p, codigo: v }))} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                      <FormInput label="Grupo de Investigación" value={invProyecto.grupo} disabled={!isEditable}
                        onChange={v => setInvProyecto(p => ({ ...p, grupo: v }))} />
                      <FormInput label="Línea de Investigación" value={invProyecto.linea} disabled={!isEditable}
                        onChange={v => setInvProyecto(p => ({ ...p, linea: v }))} />
                      <FormSelect label="Rol en el Proyecto" value={invProyecto.rol} disabled={!isEditable}
                        onChange={v => {
                          const maxH = rolesHorasMap[v] || 0;
                          setInvProyecto(p => ({ ...p, rol: v, horas_solicitadas: maxH }));
                          if (v) setInvActividades([]);
                        }}
                        options={rolesParaDropdown.map((r: any) => ({ value: r.nombre, label: `${r.nombre} (máx ${r.horas_max}h)` }))}
                        placeholder="Seleccionar rol..." />
                    </div>
                    {invProyecto.rol && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <ReadonlyField label="Máximo por Rol" value={`${rolesHorasMap[invProyecto.rol] || 0}h`} />
                        <ReadonlyField label="% del PTA" value={`${horasAProgramar > 0 ? ((hInvestigacion / horasAProgramar) * 100).toFixed(1) : 0}%`} />
                      </div>
                    )}
                  </div>

                  {/* Actividades — modo depende de si se llenó el proyecto y si tiene rol */}
                  <div>
                    {invProyecto.rol ? (
                      /* ── MODO ROL: horas fijas, sin actividades ── */
                      <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-purple-100 border border-purple-300">
                        <span className="text-xs font-bold text-purple-700 uppercase tracking-wide">Horas asignadas por rol</span>
                        <span className="text-lg font-black text-purple-800">{rolesHorasMap[invProyecto.rol] || 0}h</span>
                      </div>
                    ) : (
                      <>
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <h4 className="text-sm font-bold text-gray-800">Actividades de Investigación</h4>
                        {tieneProyecto && (
                          <p className="text-xs text-purple-600 mt-0.5">
                            Escribe el nombre de cada actividad y sus horas
                          </p>
                        )}
                      </div>
                      {isEditable && (() => {
                        const maxInvLimit = horasAProgramar * ((ptaRules?.max_pct_investigacion || 50) / 100);
                        const cupoInv = Math.max(0, maxInvLimit - hInvestigacion);
                        const cupoPta = Math.max(0, horasRestantes);
                        if (Math.min(cupoInv, cupoPta) <= 0) return null;
                        return (
                          <button onClick={handleAddInvActividad}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border-none text-white text-xs font-semibold cursor-pointer" style={{ background: PTA_COLORS.INVESTIGACION }}>
                            <Plus className="w-3 h-3" /> Agregar
                          </button>
                        );
                      })()}
                    </div>

                    {invActividades.length === 0 ? (
                      <EmptyState icon={FlaskConical}
                        text="Sin actividades"
                        sub={tieneProyecto ? "Agrega actividades relacionadas con el proyecto" : "Ej: Semilleros, publicaciones, pares evaluadores"}
                        small />
                    ) : tieneProyecto ? (
                      /* ── MODO LIBRE: nombre + horas directo ── */
                      <div className="flex flex-col gap-2">
                        {invActividades.map((act, idx) => (
                          <div key={act.id} className="flex flex-col gap-2 p-3 rounded-lg border border-purple-200 bg-purple-50/30 relative">
                            {isEditable && (
                              <button onClick={() => setInvActividades(prev => prev.filter(a => a.id !== act.id))}
                                className="absolute top-2 right-2 w-6 h-6 rounded border border-gray-200 bg-white text-gray-400 cursor-pointer flex items-center justify-center hover:text-red-500">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pr-8">
                              <div className="md:col-span-2">
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                                  Actividad {idx + 1}
                                </label>
                                <input
                                  type="text"
                                  value={act.nombre}
                                  disabled={!isEditable}
                                  placeholder="Ej: Publicación artículo, Semillero de investigación..."
                                  onChange={e => setInvActividades(prev => prev.map(a =>
                                    a.id === act.id ? { ...a, nombre: e.target.value, actividad_id: 'LIBRE_' + act.id } : a
                                  ))}
                                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-300 disabled:bg-gray-50 disabled:text-gray-500"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Horas</label>
                                <input
                                  type="number"
                                  min={0}
                                  value={act.horas_total || ''}
                                  disabled={!isEditable}
                                  placeholder="0"
                                  onChange={e => {
                                    let val = Number(e.target.value) || 0;
                                    if (val < 0) val = 0;
                                    const limiteMax = horasAProgramar * (ptaRules?.max_pct_investigacion ? (ptaRules.max_pct_investigacion / 100) : 0.5);
                                    const otherActsSum = invActividades.filter(a => a.id !== act.id).reduce((sum, a) => sum + (a.horas_total || 0), 0);
                                    const remaining = Math.max(0, limiteMax - otherActsSum);
                                    if (val > remaining) val = remaining;
                                    setInvActividades(prev => prev.map(a =>
                                      a.id === act.id ? { ...a, horas_total: val, horas_unitarias: val, cantidad: 1 } : a
                                    ));
                                  }}
                                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-300 disabled:bg-gray-50 text-right font-bold text-purple-700"
                                />
                              </div>
                            </div>
                            <FormInput label="Descripción" type="text" value={act.descripcion} disabled={!isEditable}
                              placeholder="Describe brevemente la actividad..."
                              onChange={v => setInvActividades(prev => prev.map(a =>
                                a.id === act.id ? { ...a, descripcion: v } : a
                              ))} />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              <FormInput label="Fecha Inicio" type="date" value={act.fecha_inicio} disabled={!isEditable}
                                min={ptaRules?.fecha_inicio_semestre || undefined}
                                max={ptaRules?.fecha_fin_semestre || undefined}
                                onChange={v => setInvActividades(prev => prev.map(a =>
                                  a.id === act.id ? { ...a, fecha_inicio: v } : a
                                ))} />
                              <FormInput label="Fecha Fin" type="date" value={act.fecha_fin} disabled={!isEditable}
                                min={ptaRules?.fecha_inicio_semestre || undefined}
                                max={ptaRules?.fecha_fin_semestre || undefined}
                                onChange={v => setInvActividades(prev => prev.map(a =>
                                  a.id === act.id ? { ...a, fecha_fin: v } : a
                                ))} />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      /* ── MODO CATÁLOGO: dropdown de actividades ── */
                      <div className="flex flex-col gap-2">
                        {invActividades.map(act => (
                          <div key={act.id} className="flex flex-col gap-2 p-3 rounded-lg border border-gray-200 bg-gray-50/50 relative">
                            {isEditable && (
                              <button onClick={() => setInvActividades(prev => prev.filter(a => a.id !== act.id))}
                                className="absolute top-2 right-2 w-6 h-6 rounded border border-gray-200 bg-white text-gray-400 cursor-pointer flex items-center justify-center hover:text-red-500 text-xs">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pr-8">
                              <div className="md:col-span-2">
                                <FormSelect label="Actividad" value={act.actividad_id} disabled={!isEditable}
                                  onChange={v => handleInvActChange(act.id, 'actividad_id', v)}
                                  options={actividadesParaDropdown.map((a: any) => ({ value: a.id, label: `${a.nombre} (${a.max_horas || a.horas_max || 0}h)` }))}
                                  placeholder="Seleccionar..." />
                              </div>
                              <FormInput label="Horas" type="number" value={act.horas_total} disabled={!isEditable}
                                onChange={v => handleInvActChange(act.id, 'horas_total', Number(v))} />
                            </div>
                            <FormInput label="Descripción" type="text" value={act.descripcion} disabled={!isEditable}
                              placeholder="Describe brevemente la actividad..."
                              onChange={v => handleInvActChange(act.id, 'descripcion', v)} />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              <FormInput label="Fecha Inicio" type="date" value={act.fecha_inicio} disabled={!isEditable}
                                min={ptaRules?.fecha_inicio_semestre || undefined}
                                max={ptaRules?.fecha_fin_semestre || undefined}
                                onChange={v => handleInvActChange(act.id, 'fecha_inicio', v)} />
                              <FormInput label="Fecha Fin" type="date" value={act.fecha_fin} disabled={!isEditable}
                                min={ptaRules?.fecha_inicio_semestre || undefined}
                                max={ptaRules?.fecha_fin_semestre || undefined}
                                onChange={v => handleInvActChange(act.id, 'fecha_fin', v)} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Total de Horas */}
                    {hInvestigacion > 0 && (
                      <div className="mt-3 flex items-center justify-between px-4 py-3 rounded-xl bg-purple-50 border border-purple-200">
                        <span className="text-xs font-bold text-purple-700 uppercase tracking-wide">Total Investigación</span>
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-black text-purple-800">
                            {hInvestigacion}h
                          </span>
                        </div>
                      </div>
                    )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ─── EXTENSIÓN (6 subsecciones) ─── */}
            {!actividadTotalidad && activeSection === 'extension' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <SectionHeader title="Extensión" subtitle={`${hExtension}h programadas (máx ${maxExtLimit}h permitidas)`}
                  color={PTA_COLORS.EXTENSION} icon={Globe} excede={extExcede} />

                {extWarnings.length > 0 && (
                  <div className="mx-4 md:mx-6 mt-3 space-y-2">
                    {extWarnings.map((w, i) => (
                      <div key={i} className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <span>{w}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Sub-tabs by direction */}
                <div className="flex flex-wrap gap-2 px-4 md:px-6 pt-5 pb-2">
                  {extSecciones.map(s => (
                    <button key={s.key} onClick={() => setExtSubseccion(s.key)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${extSubseccion === s.key ? 'text-white border-transparent' : 'text-gray-600 border-gray-200 bg-white hover:bg-gray-50'}`}
                      style={{ background: extSubseccion === s.key ? s.color : undefined }}>
                      {s.label} ({extActividades.filter(e => e.seccion === s.key).length})
                    </button>
                  ))}
                </div>

                <div className="p-4 md:px-6 pb-6">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-bold text-gray-800">{extSecciones.find(s => s.key === extSubseccion)?.label}</h4>
                    {isEditable && (() => {
                      const extRemaining = Math.max(0, maxExtLimit - hExtension);
                      const ptaRemaining = Math.max(0, horasRestantes);
                      const cupoDisponible = Math.min(extRemaining, ptaRemaining);
                      if (cupoDisponible <= 0) return null;
                      return (
                        <button onClick={() => handleAddExtActividad(extSubseccion)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border-none text-white text-xs font-semibold cursor-pointer" style={{ background: PTA_COLORS.EXTENSION }}>
                          <Plus className="w-3 h-3" /> Agregar
                        </button>
                      );
                    })()}
                  </div>

                  {extActividades.filter(e => e.seccion === extSubseccion).length === 0 ? (
                    <EmptyState icon={Globe} text={`Sin actividades de ${extSecciones.find(s => s.key === extSubseccion)?.label}`} small />
                  ) : (
                    <div className="flex flex-col gap-2">
                      {extActividades.filter(e => e.seccion === extSubseccion).map(ext => (
                        <div key={ext.id} className="flex flex-col gap-2 p-3 rounded-lg border border-gray-200 bg-gray-50/50 relative">
                          {isEditable && (
                            <button onClick={() => setExtActividades(prev => prev.filter(e => e.id !== ext.id))}
                              className="absolute top-2 right-2 w-6 h-6 rounded border border-gray-200 bg-white text-gray-400 cursor-pointer flex items-center justify-center hover:text-red-500">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                          <div className="flex flex-col sm:flex-row gap-2 pr-8">
                            <div className="flex-1">
                              <FormSelect label="Actividad" value={ext.actividad_id} disabled={!isEditable}
                                onChange={v => handleExtActChange(ext.id, 'actividad_id', v)}
                                options={getExtCatalog(extSubseccion)
                                  .map((a: any) => ({ value: a.id, label: `${a.nombre} (${a.max_horas || 0}h)` }))}
                                placeholder="Seleccionar..." />
                            </div>
                            {ext.seccion === 'capacitacion' ? (
                              <>
                                <div className="w-24">
                                  <FormInput label="Horas Ejec." type="number" value={ext.horas_ejecutadas || 0} disabled={!isEditable}
                                    onChange={v => handleExtActChange(ext.id, 'horas_ejecutadas', Number(v))} />
                                </div>
                                <div className="w-24">
                                  <ReadonlyField label="Total (x2)" value={`${ext.horas}h`} color={PTA_COLORS.EXTENSION} />
                                </div>
                              </>
                            ) : (
                              <div className="w-24">
                                <FormInput label="Horas" type="number" value={ext.horas} disabled={!isEditable}
                                  onChange={v => handleExtActChange(ext.id, 'horas', Number(v))} />
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <div className="flex-1">
                              <FormInput label="Descripción" type="text" value={ext.descripcion} disabled={!isEditable}
                                placeholder="Solo letras..."
                                onChange={v => handleExtActChange(ext.id, 'descripcion', v.replace(/[^a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]/g, ''))} />
                            </div>
                            <div className="w-36">
                              <FormInput label="Fecha Inicio" type="date" value={ext.fecha_inicio} disabled={!isEditable}
                                min={ptaRules?.fecha_inicio_semestre || undefined}
                                max={ptaRules?.fecha_fin_semestre || undefined}
                                onChange={v => handleExtActChange(ext.id, 'fecha_inicio', v)} />
                            </div>
                            <div className="w-36">
                              <FormInput label="Fecha Fin" type="date" value={ext.fecha_fin} disabled={!isEditable}
                                min={ptaRules?.fecha_inicio_semestre || undefined}
                                max={ptaRules?.fecha_fin_semestre || undefined}
                                onChange={v => handleExtActChange(ext.id, 'fecha_fin', v)} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ─── COMPLEMENTARIAS ─── */}
            {!actividadTotalidad && activeSection === 'complementarias' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <SectionHeader title="Actividades Complementarias" subtitle={`${hComplementarias}h programadas (máx ${ptaRules?.max_pct_complementarias || 25}% = ${horasAProgramar * ((ptaRules?.max_pct_complementarias || 25) / 100)}h, máx 17 act.)`}
                  color={PTA_COLORS.COMPLEMENTARIAS} icon={Briefcase} excede={compExcede}
                  action={(() => {
                    if (!isEditable || complementarias.length >= 17) return undefined;
                    const maxCompLimit = horasAProgramar * ((ptaRules?.max_pct_complementarias || 25) / 100);
                    const cupoComp = Math.max(0, maxCompLimit - hComplementarias);
                    const cupoPta = Math.max(0, horasRestantes);
                    if (Math.min(cupoComp, cupoPta) <= 0) return undefined;
                    return { label: 'Agregar Actividad', onClick: handleAddComplementaria };
                  })()} />

                {compWarnings.length > 0 && (
                  <div className="mx-4 md:mx-6 mt-3 space-y-2">
                    {compWarnings.map((w, i) => (
                      <div key={i} className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <span>{w}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="p-4 md:p-6">
                  {complementarias.length === 0 ? (
                    <EmptyState icon={Briefcase} text="Sin actividades complementarias" sub={`Selecciona del catálogo normativo (${actComplementarias.length} actividades disponibles)`} />
                  ) : (
                    <div className="flex flex-col gap-2">
                      {complementarias.map(comp => {
                        const compCat = actComplementarias.find((a: any) => a.id === comp.actividad_id) || comp;
                        const compConstraint = getComplementariaConstraint(compCat, ptaRules);

                        return (
                          <div key={comp.id} className="flex flex-col gap-2 p-3 rounded-lg border border-gray-200 bg-gray-50/50 relative">
                            {isEditable && (
                              <button onClick={() => setComplementarias(prev => prev.filter(c => c.id !== comp.id))}
                                className="absolute top-2 right-2 w-6 h-6 rounded border border-gray-200 bg-white text-gray-400 cursor-pointer flex items-center justify-center hover:text-red-500">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                            <div className="flex flex-col sm:flex-row gap-2 pr-8">
                              <div className="flex-1">
                                <FormSelect label="Actividad" value={comp.actividad_id} disabled={!isEditable}
                                  onChange={v => handleCompChange(comp.id, 'actividad_id', v)}
                                  options={actComplementarias
                                    .filter(a => {
                                      const isSindicato = String(a.nombre).toUpperCase().includes('SINDICATO');
                                      const optionConstraint = getComplementariaConstraint(a, ptaRules);
                                      const maxCompLimit = horasAProgramar * (ptaRules?.max_pct_complementarias ? (ptaRules.max_pct_complementarias / 100) : 0.25);
                                      const otherOrdinarySum = complementarias
                                        .filter(x => x.id !== comp.id && !String(x.nombre).toUpperCase().includes('SINDICATO'))
                                        .reduce((sum, x) => sum + (x.horas || 0), 0);
                                      const remainingLimit = isSindicato ? Infinity : Math.max(0, maxCompLimit - otherOrdinarySum);
                                      const globalRemainingLimit = Math.max(0, horasAProgramar - totalHoras + (comp.horas || 0));
                                      const trueRemainingLimit = Math.min(remainingLimit, globalRemainingLimit);

                                      if (comp.actividad_id === a.id) return true;
                                      return canSelectWithRemaining(optionConstraint, trueRemainingLimit);
                                    })
                                    .map(a => ({ value: a.id, label: `${a.nombre} (${getConstraintLabel(getComplementariaConstraint(a, ptaRules))})` }))}
                                  placeholder="Seleccionar actividad..." />
                              </div>
                              <div className="w-28">
                                {comp.actividad_id && compConstraint.editable ? (
                                  <FormInput
                                    label={`Horas (${getConstraintLabel(compConstraint)})`}
                                    type="number"
                                    value={comp.horas}
                                    min={compConstraint.min}
                                    max={compConstraint.max}
                                    disabled={!isEditable}
                                    onChange={v => handleCompChange(comp.id, 'horas', Number(v))}
                                  />
                                ) : (
                                  <ReadonlyField label="Horas" value={`${comp.horas}h`} color={PTA_COLORS.COMPLEMENTARIAS} />
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2">
                              <div className="flex-1">
                                <FormInput label="Descripción" type="text" value={comp.descripcion} disabled={!isEditable}
                                  placeholder="Solo letras..."
                                  onChange={v => handleCompChange(comp.id, 'descripcion', v.replace(/[^a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]/g, ''))} />
                              </div>
                              <div className="w-36">
                                <FormInput label="Fecha Inicio" type="date" value={comp.fecha_inicio} disabled={!isEditable}
                                  min={ptaRules?.fecha_inicio_semestre || undefined}
                                  max={ptaRules?.fecha_fin_semestre || undefined}
                                  onChange={v => handleCompChange(comp.id, 'fecha_inicio', v)} />
                              </div>
                              <div className="w-36">
                                <FormInput label="Fecha Fin" type="date" value={comp.fecha_fin} disabled={!isEditable}
                                  min={ptaRules?.fecha_inicio_semestre || undefined}
                                  max={ptaRules?.fecha_fin_semestre || undefined}
                                  onChange={v => handleCompChange(comp.id, 'fecha_fin', v)} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ─── ACADEMICO ADMINISTRATIVO ─── */}
            {activeSection === 'academico_admin' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <SectionHeader
                  title="Actividades Académico-Administrativas"
                  subtitle={actividadTotalidad
                    ? `${actividadTotalidad.nombre} — consume el 100% del PTA (${horasAProgramar}h)`
                    : `${hAcademicoAdmin}h programadas (topes definidos por actividad y soporte)`}
                  color={PTA_COLORS.ACAD_ADMIN} icon={Shield} excede={acadExcede}
                  action={(() => {
                    if (!isEditable || !!actividadTotalidad || academicoAdmin.length >= 17) return undefined;
                    if (horasRestantes <= 0) return undefined;
                    return { label: 'Agregar Actividad', onClick: handleAddAcademicoAdmin };
                  })()} />

                {acadWarnings.length > 0 && (
                  <div className="mx-4 md:mx-6 mt-3 space-y-2">
                    {acadWarnings.map((w, i) => (
                      <div key={i} className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <span>{w}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="p-4 md:p-6">
                  {actividadTotalidad && (
                    <div className="flex items-start gap-3 p-3 mb-4 rounded-xl bg-amber-50 border border-amber-300 text-sm text-amber-900">
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold mb-0.5">Secciones bloqueadas</p>
                        <p className="text-xs text-amber-800">La actividad seleccionada consume el 100% del PTA ({horasAProgramar}h). Docencia, Investigación, Extensión y Complementarias quedan inhabilitadas.</p>
                      </div>
                    </div>
                  )}

                  {academicoAdmin.length === 0 ? (
                    <EmptyState icon={Shield} text="Sin actividades académico-administrativas"
                      sub="Comisiones, año sabático, cargos directivos, misiones profesorales, acreditación y organización doctoral" />
                  ) : (
                    <div className="flex flex-col gap-2">
                      {academicoAdmin.map(comp => {
                        const acadCat = actAcadAdmin.find((a: any) => a.id === comp.actividad_id) || comp;
                        const acadConstraint = getAcademicoAdminConstraint(acadCat, ptaRules, horasAProgramar);

                        return (
                          <div key={comp.id} className={`flex flex-col gap-2 p-3 rounded-lg border relative ${comp.consumeTotalidad ? 'border-amber-300 bg-amber-50/60' : 'border-gray-200 bg-gray-50/50'}`}>
                            {isEditable && (
                              <button onClick={() => setAcademicoAdmin(prev => prev.filter(c => c.id !== comp.id))}
                                className="absolute top-2 right-2 w-6 h-6 rounded border border-gray-200 bg-white text-gray-400 cursor-pointer flex items-center justify-center hover:text-red-500">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                            <div className="flex flex-col sm:flex-row gap-2 pr-8">
                              <div className="flex-1">
                                <FormSelect label="Actividad" value={comp.actividad_id} disabled={!isEditable}
                                  onChange={v => handleAcadChange(comp.id, 'actividad_id', v)}
                                  options={actAcadAdmin
                                    .filter((a: any) => {
                                      const optionConstraint = getAcademicoAdminConstraint(a, ptaRules, horasAProgramar);
                                      const globalRemainingLimit = Math.max(0, horasAProgramar - totalHoras + (comp.horas || 0));

                                      if (comp.actividad_id === a.id) return true;
                                      return a.consumeTotalidad || canSelectWithRemaining(optionConstraint, globalRemainingLimit);
                                    })
                                    .map((a: any) => ({ value: a.id, label: a.consumeTotalidad ? `⚠ ${a.nombre} (100% PTA)` : `${a.nombre} (${getConstraintLabel(getAcademicoAdminConstraint(a, ptaRules, horasAProgramar))})` }))}
                                  placeholder="Seleccionar actividad..." />
                              </div>
                              <div className="w-32">
                                {comp.actividad_id && acadConstraint.editable ? (
                                  <FormInput
                                    label={`Horas (${getConstraintLabel(acadConstraint)})`}
                                    type="number"
                                    value={comp.horas}
                                    min={acadConstraint.min}
                                    max={acadConstraint.max}
                                    disabled={!isEditable}
                                    onChange={v => handleAcadChange(comp.id, 'horas', Number(v))}
                                  />
                                ) : (
                                  <ReadonlyField label="Horas" value={comp.consumeTotalidad ? `${horasAProgramar}h (100%)` : `${comp.horas}h`} color={comp.consumeTotalidad ? '#B45309' : PTA_COLORS.ACAD_ADMIN} />
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2">
                              <div className="flex-1">
                                <FormInput
                                  label={(comp.consumeTotalidad || actAcadAdmin.find((a: any) => a.id === comp.actividad_id)?.nombre?.includes('Misiones')) ? "Número de Acto Administrativo / Comunicación Oficial *" : "Descripción"}
                                  type="text" value={comp.descripcion} disabled={!isEditable}
                                  placeholder={(comp.consumeTotalidad || actAcadAdmin.find((a: any) => a.id === comp.actividad_id)?.nombre?.includes('Misiones')) ? "Requerido: Escriba el radicado de soporte..." : "Solo letras..."}
                                  onChange={v => handleAcadChange(comp.id, 'descripcion', (comp.consumeTotalidad || actAcadAdmin.find((a: any) => a.id === comp.actividad_id)?.nombre?.includes('Misiones')) ? v : v.replace(/[^a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]/g, ''))} />
                              </div>
                              <div className="w-36">
                                <FormInput label="Fecha Inicio" type="date" value={comp.fecha_inicio} disabled={!isEditable}
                                  min={ptaRules?.fecha_inicio_semestre || undefined}
                                  max={ptaRules?.fecha_fin_semestre || undefined}
                                  onChange={v => handleAcadChange(comp.id, 'fecha_inicio', v)} />
                              </div>
                              <div className="w-36">
                                <FormInput label="Fecha Fin" type="date" value={comp.fecha_fin} disabled={!isEditable}
                                  min={ptaRules?.fecha_inicio_semestre || undefined}
                                  max={ptaRules?.fecha_fin_semestre || undefined}
                                  onChange={v => handleAcadChange(comp.id, 'fecha_fin', v)} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ─── INLINE WARNINGS & STATUS (visible debajo del contenido) ─── */}
          <div className="flex flex-col gap-3 mt-2 mb-4">

            {/* Prorrateo warnings */}
            {(invExcede || extExcede || compExcede || acadExcede) && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                <div className="font-bold mb-1.5 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> Prorrateo aplicado — Las horas han sido recortadas al tope permitido
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {invExcede && <span>Investigación: {hInvestigacion}h → {invProrr}h ({ptaRules?.max_pct_investigacion || 50}%)</span>}
                  {extExcede && <span>Extensión: {hExtension}h → {extProrr}h ({ptaRules?.max_pct_extension || 25}%)</span>}
                  {compExcede && <span>Complementarias: {hComplementarias}h → {compProrr}h ({ptaRules?.max_pct_complementarias || 25}%)</span>}
                  {acadExcede && <span>Académico-Admin: {hAcademicoAdmin}h → {acadProrr}h (25%)</span>}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── SIDEBAR RESUMEN ─── */}
        {(() => {
          const summaryContent = (
            <div className="w-full shrink-0 z-10 mb-8">
              <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-gray-200/50 overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-shadow">
                <div className="px-6 py-5 bg-gradient-to-b from-white to-gray-50/50 border-b border-gray-100">
                  <h3 className="text-[13px] font-black tracking-widest text-[#003DA5] flex items-center gap-2 uppercase">
                    <Calculator className="w-4 h-4" /> Progreso del PTA
                  </h3>
                </div>

                <div className="p-6">
                  {/* Circular progress */}
                  <div className="text-center mb-4">
                    <div className="relative w-[104px] h-[104px] mx-auto flex items-center justify-center">
                      <svg width="104" height="104" viewBox="0 0 104 104" className="absolute inset-0 drop-shadow-sm">
                        <circle cx="52" cy="52" r="44" fill="none" stroke="#F8FAFC" strokeWidth="8" />
                        <circle cx="52" cy="52" r="44" fill="none"
                          stroke={porcentaje > 100 ? '#EF4444' : porcentaje >= 80 ? '#10B981' : '#2563EB'}
                          strokeWidth="8" strokeLinecap="round"
                          strokeDasharray={`${Math.min(100, porcentaje) * 2.76} 276`}
                          transform="rotate(-90 52 52)"
                          style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                      </svg>
                      <div className="relative z-10 flex flex-col items-center justify-center mt-1">
                        <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-br from-[#003DA5] to-blue-400 tracking-tighter" style={{ WebkitTextStroke: '0.5px rgba(0,0,0,0.05)' }}>
                          {porcentaje}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Breakdown */}
                  <div className="flex flex-col gap-2">
                    {sections.map(s => (
                      <div key={s.key} className="flex justify-between items-center">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                          <span className="text-xs text-gray-600">{s.label}</span>
                          {s.excede && <AlertTriangle className="w-3 h-3 text-amber-500" />}
                        </div>
                        <div className="flex items-center gap-1">
                          {s.hours !== s.prorr && (
                            <span className="text-[0.65rem] text-gray-400 line-through">{s.hours}h</span>
                          )}
                          <span className="text-xs font-bold text-gray-900">{s.prorr}h</span>
                          <span className="text-[0.65rem] text-gray-400">({s.limit})</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="my-3 h-px bg-gray-200" />

                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-gray-900">Total</span>
                    <span className="text-lg font-extrabold text-[#003DA5]">{totalHoras}h</span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-gray-500">Máximo</span>
                    <span className="text-xs text-gray-500">{horasAProgramar}h</span>
                  </div>

                  {/* Status */}
                  <div className={`mt-3 p-2.5 rounded-lg border text-[11px] leading-relaxed flex items-start gap-1.5 ${totalHoras > horasAProgramar ? 'bg-red-50 border-red-200 text-red-800'
                      : totalHoras >= minHoras ? 'bg-green-50 border-green-200 text-green-800'
                        : 'bg-blue-50 border-blue-200 text-blue-800'
                    }`}>
                    {totalHoras > horasAProgramar ? <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      : totalHoras >= minHoras ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        : <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />}
                    <span>
                      {totalHoras > horasAProgramar
                        ? `Excede por ${totalHoras - horasAProgramar}h. Verifica tu Plan.`
                        : totalHoras >= minHoras
                          ? 'Carga completa o dentro del mínimo. Listo para enviar.'
                          : `Faltan ${minHoras - totalHoras}h por programar para el mínimo requerido (${minHoras}h).`}
                    </span>
                  </div>

                  {/* Prorrateo warnings */}
                  {(invExcede || extExcede || compExcede || acadExcede) && (
                    <div className="mt-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                      <div className="font-semibold mb-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Prorrateo aplicado
                      </div>
                      {invExcede && <div>Investigación: {hInvestigacion}h → {invProrr}h (50%)</div>}
                      {extExcede && <div>Extensión: {hExtension}h → {extProrr}h (25%)</div>}
                      {compExcede && <div>Complementarias: {hComplementarias}h → {compProrr}h (25%)</div>}
                      {acadExcede && <div>Académico-Administrativo: {hAcademicoAdmin}h → {acadProrr}h (25%)</div>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );

          return (
            <>
              {/* Si no hay slot (ej. modal de edición del backoffice), mostrar siempre */}
              {!slotNode && (
                <div className="w-full">
                  {summaryContent}
                </div>
              )}
              {/* Para vista móvil, alineado abajo de forma nativa */}
              {slotNode && (
                <div className="w-full lg:hidden">
                  {summaryContent}
                </div>
              )}
              {/* Para vista desktop, incrustado en el sidebar react-portal */}
              {slotNode ? createPortal(<div className="hidden lg:block w-[280px] xl:w-[300px] mt-6">{summaryContent}</div>, slotNode) : null}
            </>
          );
        })()}
      </div>
    </div>
  );
}

// ═══ REUSABLE MINI COMPONENTS ═══════════════════════════════════════

function SectionHeader({ title, subtitle, color, icon: Icon, excede, action }: {
  title: string; subtitle: string; color: string; icon: any; excede?: boolean;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="px-5 py-4 bg-gray-50/50 border-b border-gray-100 flex flex-col md:flex-row justify-between md:items-center gap-3">
      <div>
        <h3 className="text-sm font-bold text-gray-900 m-0 flex items-center gap-2">
          <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${color}15` }}>
            <Icon className="w-4 h-4" style={{ color }} />
          </div>
          {title}
          {excede && <span className="text-[10px] uppercase font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-md ml-1">Excede límite</span>}
        </h3>
        <p className="text-xs font-medium text-gray-500 mt-1">{subtitle}</p>
      </div>
      {action && (
        <button onClick={action.onClick}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border-none text-white text-[13px] font-bold cursor-pointer whitespace-nowrap shadow-sm hover:opacity-90 active:scale-95 transition-all"
          style={{ background: color }}>
          <Plus className="w-4 h-4" /> {action.label}
        </button>
      )}
    </div>
  );
}

function EmptyState({ icon: Icon, text, sub, small }: { icon: any; text: string; sub?: string; small?: boolean }) {
  return (
    <div className={`text-center text-gray-400 ${small ? 'py-6' : 'py-10'}`}>
      <Icon className={`${small ? 'w-6 h-6' : 'w-8 h-8'} mx-auto mb-2 opacity-40`} />
      <p className={`${small ? 'text-xs' : 'text-sm'} font-medium m-0`}>{text}</p>
      {sub && <p className="text-xs mt-1 m-0">{sub}</p>}
    </div>
  );
}

function FormSelect({ label, value, onChange, options, disabled, placeholder }: {
  label: string; value: string | number; onChange: (v: string) => void;
  options: { value: string; label: string }[]; disabled?: boolean; placeholder?: string;
}) {
  return (
    <div className="flex flex-col">
      <label className="block text-[10px] font-semibold text-gray-500 tracking-wider uppercase mb-1 ml-1">{label}</label>
      <div className="relative group">
        <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
          className="w-full px-3 py-2 rounded-xl border border-transparent bg-gray-50/80 hover:bg-gray-100/60 focus:bg-white focus:border-blue-400/50 focus:ring-4 focus:ring-blue-500/10 text-[12px] font-semibold text-gray-700 outline-none disabled:bg-gray-50/50 disabled:text-gray-400 transition-all duration-300 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)] cursor-pointer appearance-none min-h-[36px]">
          {placeholder && <option value="" disabled className="text-gray-400">{placeholder}</option>}
          {options.map(o => <option key={o.value} value={o.value} className="text-gray-900 font-medium">{o.label}</option>)}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none group-hover:text-gray-600 transition-colors" />
      </div>
    </div>
  );
}

function FormInput({ label, value, onChange, disabled, type = 'text', placeholder, min, max, step }: {
  label: string; value: string | number; onChange: (v: string) => void;
  disabled?: boolean; type?: string; placeholder?: string; min?: number | string; max?: number | string; step?: number;
}) {
  return (
    <div className="flex flex-col">
      <label className="block text-[10px] font-semibold text-gray-500 tracking-wider uppercase mb-1 ml-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} disabled={disabled} placeholder={placeholder} min={min} max={max} step={step}
        className="w-full px-3 py-2 rounded-xl border border-transparent bg-gray-50/80 hover:bg-gray-100/60 focus:bg-white focus:border-blue-400/50 focus:ring-4 focus:ring-blue-500/10 text-[12px] font-semibold text-gray-700 outline-none disabled:bg-gray-50/50 disabled:text-gray-400 transition-all duration-300 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)] placeholder:text-gray-400 min-h-[36px]" />
    </div>
  );
}

function ReadonlyField({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col">
      <label className="block text-[10px] font-semibold text-gray-500 tracking-wider uppercase mb-1 ml-1">{label}</label>
      <div className="px-3 py-2 rounded-xl bg-gray-50/40 border border-transparent shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)] text-[12px] font-bold text-center flex items-center justify-center min-h-[36px]"
        style={{ color: color || '#6B7280' }}>
        {value}
      </div>
    </div>
  );
}
