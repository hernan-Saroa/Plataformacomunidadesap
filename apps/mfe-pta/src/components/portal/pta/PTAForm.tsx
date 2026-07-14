/**
 * PTAForm v2 — Formulario PTA fidedigno al Excel PTA v9
 * 
 * Motor de cálculo según fórmulas Excel:
 * - K15: Horas base por programa (AP=64, Maestría=créd×12, otros=créd×16)
 * - L15: Total horas = horasBase × 3 (con excepciones)
 * - Topes por componente desde configuracion (defaults: Doc=800h, Inv=400h, Ext=200h, Comp=200h)
 * 
 * Dropdowns en cascada: Territorial → CETAP → Programa → Asignatura
 * 5 Componentes: Docencia, Investigación, Extensión (4 secciones), Complementarias
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronLeft, ChevronRight, Save, Send, AlertCircle, Plus, Trash2, Calculator,
  BookOpen, FlaskConical, Globe, Briefcase, CheckCircle2, Info,
  ChevronDown, RotateCcw, AlertTriangle, Search, Shield, Clock, MessageSquare,
  Paperclip, FileUp, FileCheck2, X as XIcon
} from 'lucide-react';
import {
  savePTA, getPTAById, getCatalogoProgramas, getCatalogoAsignaturas,
  getCatalogoTerritoriales, getCatalogoCetaps,
  getCatalogoActividadesInvestigacion, getCatalogoActividadesExtension,
  getCatalogoActividadesComplementarias, getCatalogoActividadesAcademicoAdmin,
  getCatalogoRolesInvestigacion, getConfiguracionPTAGlobal, getCatalogoSeccionesExtension,
  requestPTAFirmaDocenteCode, verifyPTAFirmaDocenteCode, getActivePeriodoAcademico,
  getRUNDDocente, getPeriodosAcademicos, getCatalogoProgramasCascada,
  getOfertaCetap, getComponentesAprobacion
} from '../../../services/api/ptaApi';
import { getPerfilPortal } from '../portalApi';
import { getBancoDocenteById } from '../../../services/api/ptaApi';
import { toast } from 'sonner';
import { useNotifications } from '../../esap/NotificationsContext';
import { FirmaElectronicaModal } from './FirmaElectronicaModal';
import { FirmaDigitalPTA, type FirmaData } from '../../pta/FirmaDigitalPTA';
import { guardarFirmaDigitalPTA } from '../../../services/api/ptaApi';
import { PTA_COLORS } from '../../pta/shared/ptaColors';
import type { PTAComponentKey } from '../../pta/shared/ptaComponentPermissions';

// ═══ TYPES ═══════════════════════════════════════════════════════════

function DocumentosPendientesAlert({ documentosPendientes }: { documentosPendientes: any[] }) {
  const [expanded, setExpanded] = useState(false);
  
  // Temporarily deactivated - not blocking UI
  if (true) return null;
  
  if (!documentosPendientes || documentosPendientes.length === 0) return null;
  
  return (
    <div className="p-4 rounded-xl bg-orange-50 border border-orange-200 shadow-sm relative overflow-hidden w-full transition-all duration-300">
      <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-400"></div>
      
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-orange-100 border border-orange-200 flex items-center justify-center shrink-0">
            <Shield className="w-4 h-4 text-orange-600" />
          </div>
          <div>
            <h3 className="text-[14px] font-bold text-orange-900 m-0 leading-tight">
              Soportes de Carpeta Digital Incompletos
            </h3>
            <p className="m-0 mt-0.5 text-[12.5px] text-orange-800 font-medium">
              Faltan {documentosPendientes.length} documentos obligatorios.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 lg:ml-auto shrink-0">
          <button
            onClick={() => setExpanded(!expanded)}
            className="px-3 py-2 rounded-lg bg-orange-100/50 hover:bg-orange-100 text-orange-800 text-[12px] font-bold border border-orange-200/50 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            {expanded ? 'Ocultar detalles' : 'Ver pendientes'}
          </button>
          
          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent('portal-view-change', { detail: { view: 'carpeta-digital' } }));
            }}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg border-none cursor-pointer transition-colors shadow-sm text-[12.5px] flex items-center gap-1.5"
          >
            Ir a Carpeta
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-orange-200/60 pl-2 lg:pl-14">
          <p className="text-[12.5px] text-orange-800/90 font-medium mb-3">
            Para poder enviar a revisión tu PTA, debes cargar:
          </p>
          <div className="flex flex-col sm:flex-row flex-wrap gap-2">
            {documentosPendientes.map((doc) => (
              <div key={doc.campo_rund} className="px-3 py-1.5 bg-white border border-orange-200 rounded-lg text-[11.5px] font-semibold text-orange-900 flex items-center gap-2 shadow-sm">
                <AlertCircle className="w-3 h-3 text-orange-500" />
                <span className="uppercase">{doc.campo_rund.replace(/_/g, ' ')}</span>
                <span className="text-orange-300 mx-0.5">—</span>
                <span className="text-orange-700 font-medium">{doc.tipo_documento_soporte}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


interface PTAFormProps {
  onBack: () => void;
  userPersonId: string;
  ptaId?: string | null;
  isAdminEdit?: boolean;
  jefaturaTerritorialId?: string; // bloquear asignaturas de otras territoriales
  allowedComponentKeys?: string[];
  componentEditScopeLabel?: string;
  // Identidad del revisor que concerta (edita+envía) — queda como aprobador/autor del
  // comentario en la devolución del componente que resulte de "Concertar".
  concertacionActorId?: string;
  concertacionActorNombre?: string;
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
  resolucion_nombre: string;
  resolucion_archivo?: File | null;
  resolucion_archivo_url?: string; // URL del archivo ya guardado
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
  resolucion_nombre: string;
  resolucion_archivo?: File | null;
  resolucion_archivo_url?: string;
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
  items_cantidades?: Record<number, number>; // índice del ítem → cantidad (para tipo 'por_unidad')
  fila_seleccionada?: number; // fila horaria elegida cuando el bloque padre no cabe completo en Extensión
  fila_seleccionada_nombre?: string;
  fila_seleccionada_etiqueta?: string;
  fila_seleccionada_detalles?: ExtensionSelectionDetail[];
}

interface ExtensionSelectionDetail {
  nombre: string;
  valores: Array<{ columna: string; valor: string }>;
}

interface ComplementariaItem {
  id: number;
  actividad_id: string;
  nombre: string;
  horas: number;
  descripcion: string;
  consumeTotalidad?: boolean;
  seccion?: 'complementarias_docencia' | 'academico_administrativas';
  /** Cantidades por posición, conservadas para compatibilidad con borradores previos. */
  items_cantidades?: Record<number, number>;
  /** Cantidades por clave estable de la fila configurada (resiste reordenamientos). */
  filas_cantidades?: Record<string, number>;
  fecha_inicio: string;
  fecha_fin: string;
}

type HourConstraintMode = 'fixed' | 'range' | 'upto' | 'exclusive' | 'percentage';

interface HourConstraint {
  min: number;
  max: number;
  editable: boolean;
  mode: HourConstraintMode;
  percentage?: number;
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

function getConfiguredExtensionLimit(rules: any, horasAProgramar: number): number {
  const absoluteLimit = getPositiveRuleNumber(
    rules?.max_horas_extension_global ?? rules?.ext_max_horas_enlace,
    200,
  );
  return Math.min(
    absoluteLimit,
    horasAProgramar * (getPositiveRuleNumber(rules?.max_pct_extension, 25) / 100),
  );
}

function getPTAPercentage(activity: any): number {
  const parsed = Number(activity?.porcentaje_pta);
  return Number.isFinite(parsed) ? Math.min(100, Math.max(1, parsed)) : 1;
}

function isFullPTAActivity(activity: any): boolean {
  return Boolean(activity?.consumeTotalidad) || (
    String(activity?.tipo || '').trim().toLowerCase() === 'porcentaje' &&
    getPTAPercentage(activity) === 100
  );
}

function getPercentageHours(activity: any, horasAProgramar: number): number {
  return Math.round(Math.max(0, Number(horasAProgramar) || 0) * getPTAPercentage(activity) / 100);
}

function getConfiguredActivityConstraint(activity: any, horasAProgramar?: number): HourConstraint | null {
  const recognitionRows = Array.isArray(activity?.filas_reconocimiento)
    ? activity.filas_reconocimiento
    : [];
  if (recognitionRows.length > 0) {
    const constraints = recognitionRows
      .map((row: any) => {
        const constraint = getConfiguredActivityConstraint(row, horasAProgramar);
        // En un bloque con varias alternativas "Hasta", cada alternativa puede
        // omitirse (0h); el bloque completo conserva un mínimo efectivo de 1h.
        return constraint && recognitionRows.length > 1 && constraint.mode === 'upto'
          ? { ...constraint, min: 0 }
          : constraint;
      })
      .filter((constraint: HourConstraint | null): constraint is HourConstraint => Boolean(constraint));
    if (constraints.length === recognitionRows.length) {
      if (constraints.length === 1) return constraints[0];
      const rawMin = constraints.reduce((sum, constraint) => sum + constraint.min, 0);
      const min = Math.max(1, rawMin);
      const max = constraints.reduce((sum, constraint) => sum + constraint.max, 0);
      return min === max
        ? buildHourConstraint(max, max, false, 'fixed')
        : buildHourConstraint(min, max, true, 'range');
    }
  }
  const configuredType = String(activity?.tipo || '').trim().toLowerCase();
  if (configuredType === 'porcentaje') {
    const percentage = getPTAPercentage(activity);
    const hours = getPercentageHours(activity, Number(horasAProgramar) || 0);
    return { ...buildHourConstraint(hours, hours, false, 'percentage'), percentage };
  }
  const configuredMax = Number(activity?.max_horas);
  if (!Number.isFinite(configuredMax) || configuredMax <= 0) return null;

  if (configuredType === 'fija') {
    return buildHourConstraint(configuredMax, configuredMax, false, 'fixed');
  }
  if (configuredType === 'intervalo') {
    return buildHourConstraint(
      getPositiveRuleNumber(activity?.min_horas, 1),
      configuredMax,
      true,
      'range',
    );
  }
  if (configuredType === 'hasta') {
    return buildHourConstraint(1, configuredMax, true, 'upto');
  }
  return null;
}

function getComplementariaConstraint(activity: any, rules?: any, horasAProgramar?: number): HourConstraint {
  const id = String(activity?.id || activity?.actividad_id || '');
  const fallbackMax = getPositiveRuleNumber(activity?.max_horas, Number(activity?.horas) || 0);
  const configuredConstraint = getConfiguredActivityConstraint(activity, horasAProgramar);
  if (configuredConstraint) return configuredConstraint;

  if (FIXED_COMPLEMENTARIA_IDS.has(id)) {
    return buildHourConstraint(fallbackMax, fallbackMax, false, 'fixed');
  }

  // Para actividades de rango, el máximo por actividad configurado (fallbackMax = catalog
  // max_horas) manda; el escalar legacy solo es fallback. El mínimo conserva el piso normativo.
  switch (id) {
    case 'COMP_08':
      return buildHourConstraint(
        getPositiveRuleNumber(rules?.comp_act_unidades_min, 60),
        getPositiveRuleNumber(fallbackMax, getPositiveRuleNumber(rules?.comp_act_unidades_max, 120)),
        true,
        'range'
      );
    case 'COMP_13':
      return buildHourConstraint(
        getPositiveRuleNumber(rules?.comp_coord_escuela_doc_min, 40),
        getPositiveRuleNumber(fallbackMax, getPositiveRuleNumber(rules?.comp_coord_escuela_doc_max, 80)),
        true,
        'range'
      );
    case 'COMP_15':
      return buildHourConstraint(
        getPositiveRuleNumber(rules?.comp_lider_posgrado_min, 120),
        getPositiveRuleNumber(fallbackMax, getPositiveRuleNumber(rules?.comp_lider_posgrado_max, 200)),
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

  if (isFullPTAActivity(activity)) {
    return buildHourConstraint(horasAProgramar, horasAProgramar, false, 'exclusive');
  }

  const configuredConstraint = getConfiguredActivityConstraint(activity, horasAProgramar);
  if (configuredConstraint) return configuredConstraint;

  // Nota: el máximo por actividad configurado en la Configuración de Reglas (catalogMax,
  // proveniente de aadm_actividades[].max_horas) manda. Los campos escalares legacy
  // (aadm_misiones_horas, comp_doc_*) solo se usan como fallback cuando el catálogo no trae valor.
  switch (id) {
    case 'AA_06': {
      const maxPct = getPositiveRuleNumber(rules?.aadm_misiones_pct, 25) / 100;
      const maxHoras = getPositiveRuleNumber(catalogMax, getPositiveRuleNumber(rules?.aadm_misiones_horas, 200));
      return buildHourConstraint(1, Math.min(maxHoras, Math.round(horasAProgramar * maxPct)), true, 'upto');
    }
    case 'AA_07':
      return buildHourConstraint(1, getPositiveRuleNumber(catalogMax, getPositiveRuleNumber(rules?.aadm_acreditacion_max, 64)), true, 'upto');
    case 'AA_08': {
      const aa08 = getPositiveRuleNumber(catalogMax, getPositiveRuleNumber(rules?.comp_doc_coord_comision, 200));
      return buildHourConstraint(aa08, aa08, false, 'fixed');
    }
    case 'AA_09':
      return buildHourConstraint(1, getPositiveRuleNumber(catalogMax, getPositiveRuleNumber(rules?.comp_doc_comisionado, 60)), true, 'upto');
    case 'AA_10':
      return buildHourConstraint(1, getPositiveRuleNumber(catalogMax, getPositiveRuleNumber(rules?.comp_doc_eval_propuesta, 10)), true, 'upto');
    case 'AA_11':
      return buildHourConstraint(1, getPositiveRuleNumber(catalogMax, getPositiveRuleNumber(rules?.comp_doc_ajuste_microcv, 100)), true, 'upto');
    case 'AA_12':
      return buildHourConstraint(
        1,
        getPositiveRuleNumber(
          catalogMax,
          Math.max(
            getPositiveRuleNumber(rules?.comp_doc_gestor_intl, 100),
            getPositiveRuleNumber(rules?.comp_doc_gestor_ext, 100)
          )
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
  if (constraint.mode === 'percentage') return `${constraint.percentage}% PTA = ${constraint.max}h`;
  if (constraint.mode === 'fixed') return `fija ${constraint.max}h`;
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
      if (constraint.mode === 'percentage') {
        return `La actividad "${nombre}" corresponde al ${constraint.percentage}% del PTA (${constraint.max}h).`;
      }
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

function getSectionValidationToast(section: string, warnings: string[]): string {
  const messages = warnings
    .map(message => String(message || '').trim())
    .filter(Boolean);
  if (messages.length === 0) return `Revisa la sección ${section} antes de enviar.`;

  const remaining = messages.length - 1;
  return `Revisa ${section}: ${messages[0]}${remaining > 0
    ? ` Además, ${remaining} ${remaining === 1 ? 'corrección adicional' : 'correcciones adicionales'}.`
    : ''}`;
}

// ═══ MOTOR DE CÁLCULO FRONTEND (réplica Excel) ═══════════════════

// Resuelve el id de programa disponible (desde el objeto programa o desde la asignatura).
function resolveProgramaId(prog: any, asigCat: any): string | undefined {
  if (prog?.id != null) return String(prog.id);
  if (asigCat?.programaId != null) return String(asigCat.programaId);
  if (asigCat?.programa_real_id != null) return String(asigCat.programa_real_id);
  return undefined;
}

// Distingue Pregrado Territorial (APT → por crédito) de Sede Central (AP/EP → bloque fijo).
// Señales robustas del propio programa: código APT*, nombre con "territorial" o modalidad a distancia.
function esPregradoTerritorial(prog: any, asigCat: any): boolean {
  const codigo = String(prog?.codigo || asigCat?.programa_codigo || '').toUpperCase();
  const nombre = String(prog?.nombre || asigCat?.programa_nombre || '').toLowerCase();
  const modalidad = String(prog?.modalidad || asigCat?.programa_modalidad || '').toLowerCase();
  return codigo.startsWith('APT') || nombre.includes('territorial') || modalidad === 'distancia';
}

// ═══ MOTOR DE CÁLCULO — 100% parametrizado desde la config del backoffice (ptaRules) ═══
// Las horas base y el multiplicador se toman SIEMPRE de ptaRules (Tabla 1 Circular 003).
// La entidad `programa` solo se usa para CATEGORIZAR (nivel + Sede Central vs Territorial),
// nunca para aportar valores numéricos.
function calcHorasBase(asigCat: any, prog: any, rules?: any): number {
  const creditos = Number(asigCat?.creditos) || 3;
  const excepcion = String(asigCat?.tipo ?? asigCat?.tipo_excepcion ?? '');
  const nombre = String(asigCat?.nombre || '');

  // 1) Seminario de Énfasis → bloque fijo de config (por excepción; nombre como respaldo)
  if (excepcion === 'seminario_enfasis' || nombre.includes('Seminario De Énfasis')) {
    return Number(rules?.docencia_base_seminario_sc) || 128;
  }

  // 2) Override por programa parametrizado en config (Matriz Paramétrica — docencia_por_programa)
  const programaId = resolveProgramaId(prog, asigCat);
  const progCfg = programaId ? rules?.docencia_por_programa?.[programaId] : undefined;
  if (progCfg && Number(progCfg.base) > 0) {
    return progCfg.esVariable ? creditos * Number(progCfg.base) : Number(progCfg.base);
  }

  // 3) Categoría según nivel del programa → valor de config (Tabla 1)
  const nivel = String(prog?.tipo || asigCat?.programa_nivel || '').toLowerCase();
  if (nivel === 'maestria') return creditos * (Number(rules?.docencia_base_maestria) || 12);
  if (nivel === 'especializacion') return creditos * (Number(rules?.docencia_base_especializacion) || 16);
  if (nivel === 'pregrado') {
    return esPregradoTerritorial(prog, asigCat)
      ? creditos * (Number(rules?.docencia_base_apt) || 16)      // Territorial (APT) → por crédito
      : (Number(rules?.docencia_base_pregrado_sc) || 64);        // Sede Central (AP/EP) → bloque fijo
  }
  // 4) Cualquier otro → APT/Otros por crédito
  return creditos * (Number(rules?.docencia_base_apt) || 16);
}

function calcTotalHoras(asigCat: any, horasBase: number, rules?: any, prog?: any): number {
  const nombre = String(asigCat?.nombre || '');
  const excepcion = String(asigCat?.tipo ?? asigCat?.tipo_excepcion ?? '');
  // Excepciones con total fijo (Circular 003) — por excepción; nombre como respaldo
  if (excepcion === 'opciones_grado_ap' || nombre === 'Opciones De Grado AP') return 20;
  if (excepcion === 'seminario_opciones_apt' || nombre === 'Seminario De Opciones De Grado APT' || nombre === 'Seminario Opciones APT') return 144;
  // Multiplicador SIEMPRE desde config: override por programa si existe; si no, el global.
  const programaId = resolveProgramaId(prog, asigCat);
  const progCfg = programaId ? rules?.docencia_por_programa?.[programaId] : undefined;
  const mult = (progCfg && Number(progCfg.multiplicador) > 0)
    ? Number(progCfg.multiplicador)
    : (Number(rules?.criterio_multiplicador_docencia) || 3);
  return horasBase * mult;
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
    // Excepción RN-003: No aplica proporcionalidad para docentes Carrera1 (Acuerdo 009/2004)
    if (tipo.codigo === 'CARRERA_009') {
      const base = rules?.horas_base_carrera_009 || tipo.horas_tc || 720;
      return dedicacion === 'Medio Tiempo' ? Math.round(base / 2) : base;
    }
    // CARRERA_003 and PERIODO_PRUEBA apply proportionality RN-003
    const base = rules?.horas_base_carrera_003 || tipo.horas_tc || 800;
    const baseDedicacion = dedicacion === 'Medio Tiempo' ? Math.round(base / 2) : base;
    // La clave correcta en PTARules es `semanas_periodo_academico` (TabGenerales la edita).
    // Se conserva `semanas_periodo` como fallback defensivo por si hubiera datos legacy.
    const semanasPeriodo = rules?.semanas_periodo_academico || rules?.semanas_periodo || 20;
    const sEfectivas = semanas || semanasPeriodo;
    return Math.round((sEfectivas / semanasPeriodo) * baseDedicacion);
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

// Fallback sincrónico que coincide con los defaults del backend (pta.service.ts).
// Elimina la race condition: el formulario conoce el multiplicador x2 de capacitación
// desde el primer render, antes de que responda la API.
type ExtensionSectionConfig = {
  key: string;
  label: string;
  color: string;
  orden: number;
  multiplicador?: number;
  columnas?: string[];
  columna_raiz_nombre?: string;
  columna_items_nombre?: string;
};

const DEFAULT_EXT_SECCIONES: ExtensionSectionConfig[] = [
  { key: 'capacitacion',         label: '3.1.1. Dirección de Capacitación', color: '#059669', orden: 1, multiplicador: 2 },
  { key: 'seleccion',            label: '3.1.2. Dirección de Procesos de Selección', color: '#0284C7', orden: 2, multiplicador: 1 },
  { key: 'fortalecimiento',      label: '3.1.3. Dirección de Fortalecimiento y Apoyo a la Gestión Estatal', color: '#7C3AED', orden: 3, multiplicador: 1 },
  { key: 'alto_gobierno',        label: '3.2. Escuela de Alto Gobierno', color: '#B45309', orden: 4, multiplicador: 1 },
];

const EXT_ITEMS_COLUMN_KEY = '_items_';

function getExtensionRowDisplayLabel(section: ExtensionSectionConfig | undefined): string {
  const firstColumn = String(section?.columnas?.[0] || '').trim();
  if (firstColumn === EXT_ITEMS_COLUMN_KEY) {
    return String(section?.columna_items_nombre || 'Actividad / Ítem').trim();
  }
  // Las claves rodeadas por guiones bajos son metadatos internos y nunca deben
  // filtrarse a las etiquetas visibles del formulario docente.
  if (!firstColumn || /^_.*_$/.test(firstColumn)) return 'Opción del bloque';
  return firstColumn;
}

function getExtensionRowSnapshot(row: any, section: ExtensionSectionConfig | undefined) {
  if (!row) {
    return {
      fila_seleccionada_nombre: undefined,
      fila_seleccionada_etiqueta: undefined,
      fila_seleccionada_detalles: undefined,
    };
  }
  const details: ExtensionSelectionDetail[] = Array.isArray(row?._detailGroups)
    ? row._detailGroups
        .map((group: any) => ({
          nombre: String(group?.name || group?.nombre || '').trim(),
          valores: (Array.isArray(group?.values) ? group.values : [])
            .map((value: any) => ({
              columna: String(value?.column || value?.columna || '').trim(),
              valor: String(value?.value || value?.valor || '').trim(),
            }))
            .filter((value: any) => value.valor),
        }))
        .filter((group: ExtensionSelectionDetail) => group.nombre || group.valores.length > 0)
    : [];
  return {
    fila_seleccionada_nombre: String(row?.nombre || '').trim() || undefined,
    fila_seleccionada_etiqueta: getExtensionRowDisplayLabel(section),
    fila_seleccionada_detalles: details,
  };
}

/**
 * La presencia histórica de `items: []` no basta para afirmar que una actividad
 * tiene desglose. Las configuraciones nuevas pueden declarar explícitamente una
 * tabla de solo columna raíz mediante `columnas: []`.
 */
function extensionActivityUsesItems(section: ExtensionSectionConfig | undefined, activity: any): boolean {
  if (Array.isArray(section?.columnas)) return section.columnas.includes(EXT_ITEMS_COLUMN_KEY);
  return Array.isArray(activity?.items);
}

function getRootActivityHourType(activity: any): 'fija' | 'hasta' | 'intervalo' | 'porcentaje' {
  const type = String(activity?.tipo || 'hasta').toLowerCase();
  return type === 'fija' || type === 'intervalo' || type === 'porcentaje' ? type : 'hasta';
}

function hasConfiguredCatalogHours(activity: any, horasAProgramar: number): boolean {
  if (!activity || typeof activity !== 'object') return false;
  if (isFullPTAActivity(activity)) return horasAProgramar > 0;
  if (String(activity.tipo || '').toLowerCase() === 'porcentaje') {
    return getPercentageHours(activity, horasAProgramar) > 0;
  }
  return [activity.max_horas, activity.horas_max, activity.horas]
    .some(value => Number.isFinite(Number(value)) && Number(value) > 0);
}

function getExtensionItemDetailGroups(item: any, detailColumns: string[]): any[] {
  if (!detailColumns.length) return [];
  const primaryColumn = detailColumns[0];
  const primaryValues = Array.isArray(item?.col_valores?.[primaryColumn])
    ? item.col_valores[primaryColumn]
    : [];
  const groups = primaryValues.map((value: any) => {
    const name = String(value || '').trim();
    return name ? { name, values: [] as Array<{ column: string; value: string }> } : null;
  });

  for (let columnIndex = 1; columnIndex < detailColumns.length; columnIndex += 1) {
    const column = detailColumns[columnIndex];
    const values = Array.isArray(item?.col_valores?.[column]) ? item.col_valores[column] : [];
    const parentIndexes = Array.isArray(item?.col_parents?.[column]) ? item.col_parents[column] : [];
    values.forEach((rawValue: any, valueIndex: number) => {
      const value = String(rawValue || '').trim();
      if (!value) return;
      let primaryIndex = Number(parentIndexes[valueIndex] ?? valueIndex);
      for (let parentColumnIndex = columnIndex - 1; parentColumnIndex > 0; parentColumnIndex -= 1) {
        const parentColumn = detailColumns[parentColumnIndex];
        const ancestors = Array.isArray(item?.col_parents?.[parentColumn]) ? item.col_parents[parentColumn] : [];
        primaryIndex = Number(ancestors[primaryIndex] ?? primaryIndex);
      }
      if (!Number.isInteger(primaryIndex) || primaryIndex < 0 || primaryIndex >= groups.length) return;
      groups[primaryIndex]?.values.push({ column, value });
    });
  }

  // Configuraciones de una sola columna de detalle conservan esa información
  // como grupos; si no hay valores primarios no se inventa contenido.
  return groups.filter((group): group is NonNullable<typeof group> => Boolean(group));
}

/**
 * Convierte la jerarquía editable del constructor en las filas que realmente
 * gobiernan las horas en el formulario docente. Si la primera columna es una
 * Línea (u otra dimensión), sus metadatos son la fuente de verdad; si las horas
 * viven en Actividad/Ítem, se toman únicamente los ítems asociados a esa fila.
 */
function getExtensionConfiguredHourRows(
  activity: any,
  section: ExtensionSectionConfig | undefined,
): any[] {
  const normalizeRow = (row: any, name?: string) => ({
    ...row,
    nombre: name || row?.nombre || 'Actividad',
    min: row?.min ?? row?.horas_min,
  });
  const columns = section?.columnas;

  if (Array.isArray(columns) && columns.length > 0 && columns[0] !== EXT_ITEMS_COLUMN_KEY) {
    const controllingColumn = columns[0];
    const itemsPosition = columns.indexOf(EXT_ITEMS_COLUMN_KEY);
    const detailColumns = itemsPosition >= 0 ? columns.slice(itemsPosition + 1) : [];
    const values = Array.isArray(activity?.columnas_valores?.[controllingColumn])
      ? activity.columnas_valores[controllingColumn]
      : [];
    const metadata = Array.isArray(activity?.columnas_meta?.[controllingColumn])
      ? activity.columnas_meta[controllingColumn]
      : [];
    const items = Array.isArray(activity?.items) ? activity.items : [];
    const rowCount = Math.max(values.length, metadata.length);
    const rows: any[] = [];
    const decorateItem = (item: any) => ({
      ...item,
      _detailValues: detailColumns.flatMap(column => {
        const columnValues = Array.isArray(item?.col_valores?.[column]) ? item.col_valores[column] : [];
        return columnValues
          .filter((value: any) => String(value || '').trim())
          .map((value: any) => ({ column, value: String(value) }));
      }),
    });

    for (let index = 0; index < rowCount; index += 1) {
      const valueName = String(values[index] || `${controllingColumn} ${index + 1}`);
      const meta = metadata[index] || {};
      const childItems = items
        .filter((item: any) => (item?.parent_col_idx === undefined ? 0 : Number(item.parent_col_idx)) === index)
        .map(decorateItem);
      if (String(meta?.horas_en || 'linea') === 'actividad') {
        childItems.forEach((item: any) => rows.push({
          ...normalizeRow(item, `${valueName} — ${item?.nombre || 'Actividad'}`),
          _detailGroups: [{ name: item?.nombre || 'Actividad', values: item._detailValues || [] }],
        }));
      } else {
        rows.push({
          ...normalizeRow(meta, valueName),
          _detailGroups: childItems.map((item: any) => ({
            name: item?.nombre || 'Actividad',
            values: item._detailValues || [],
          })),
        });
      }
    }
    return rows;
  }

  if (Array.isArray(columns) && columns.length === 0) return [];
  if (Array.isArray(activity?.items)) {
    const detailColumns = Array.isArray(columns) && columns[0] === EXT_ITEMS_COLUMN_KEY
      ? columns.slice(1)
      : [];
    return activity.items.map((item: any) => ({
      ...normalizeRow(item),
      _detailGroups: getExtensionItemDetailGroups(item, detailColumns),
    }));
  }
  return [];
}

function hasExtensionConfiguredHours(
  activity: any,
  section: ExtensionSectionConfig | undefined,
  horasAProgramar: number,
): boolean {
  const rows = getExtensionConfiguredHourRows(activity, section);
  if (rows.length > 0) return rows.some(row => hasConfiguredCatalogHours(row, horasAProgramar));
  if (Array.isArray(section?.columnas) && section.columnas.length > 0) return false;
  return hasConfiguredCatalogHours(activity, horasAProgramar);
}

function getExtensionRowInitialHours(row: any, horasAProgramar: number): number {
  const type = String(row?.tipo || 'fija').toLowerCase();
  if (type === 'porcentaje') return getPercentageHours(row, horasAProgramar);
  if (type === 'fija') return Math.max(0, Number(row?.horas) || 0);
  if (type === 'intervalo') return Math.max(1, Number(row?.min ?? row?.horas_min) || 1);
  if (type === 'hasta') return Number(row?.horas) > 0 ? 1 : 0;
  return 0;
}

function extensionRowAllowsZero(row: any, rowCount: number): boolean {
  return rowCount > 1 && String(row?.tipo || '').toLowerCase() === 'hasta';
}

function getConfiguredRecognitionRows(activity: any, horasAProgramar: number): any[] {
  if (!Array.isArray(activity?.filas_reconocimiento)) return [];
  return activity.filas_reconocimiento.filter((row: any) => {
    const constraint = getConfiguredActivityConstraint(row, horasAProgramar);
    return Boolean(constraint && constraint.max > 0);
  });
}

function getRecognitionRowConstraint(row: any, rowCount: number, horasAProgramar: number): HourConstraint | null {
  const constraint = getConfiguredActivityConstraint(row, horasAProgramar);
  if (!constraint) return null;
  return rowCount > 1 && constraint.mode === 'upto'
    ? { ...constraint, min: 0 }
    : constraint;
}

function getRecognitionRowKey(row: any, index: number): string {
  const configuredKey = String(row?.clave || '').trim();
  if (configuredKey) return configuredKey;
  const normalizedName = String(row?.nombre || `fila-${index + 1}`)
    .trim()
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-');
  return `${normalizedName || 'fila'}#${index + 1}`;
}

interface RecognitionRowsState {
  items_cantidades: Record<number, number>;
  filas_cantidades: Record<string, number>;
  total: number;
}

/**
 * Reconcilia las cantidades del docente con las filas vigentes de configuración.
 * Las claves conservan el valor al reordenar; filas nuevas parten de su mínimo y
 * filas eliminadas dejan de participar del total. Los borradores antiguos, que solo
 * guardaban el total agregado, se distribuyen dentro de los límites sin perderlo.
 */
function reconcileRecognitionRows(
  activity: any,
  horasAProgramar: number,
  existingTotal?: number,
  existingByKey?: Record<string, number>,
  existingByIndex?: Record<number, number>,
): RecognitionRowsState | null {
  const rows = getConfiguredRecognitionRows(activity, horasAProgramar);
  if (rows.length <= 1) return null;

  const constraints = rows.map((row: any) => getRecognitionRowConstraint(row, rows.length, horasAProgramar)!);
  const hasStoredRows = Boolean(
    (existingByKey && Object.keys(existingByKey).length > 0)
    || (existingByIndex && Object.keys(existingByIndex).length > 0),
  );
  const values = constraints.map((constraint, index) => {
    const key = getRecognitionRowKey(rows[index], index);
    const stored = existingByKey?.[key] ?? existingByIndex?.[index];
    if (stored !== undefined && stored !== null) return clampConstraintValue(stored, constraint);
    return constraint.editable ? constraint.min : constraint.max;
  });

  // Un borrador anterior solo tiene el total. Se reparte determinísticamente entre
  // las filas actuales, respetando primero sus mínimos y luego sus capacidades.
  if (!hasStoredRows && Number(existingTotal) > 0) {
    const minTotal = constraints.reduce((sum, constraint) => sum + constraint.min, 0);
    const maxTotal = constraints.reduce((sum, constraint) => sum + constraint.max, 0);
    const target = Math.min(maxTotal, Math.max(minTotal, Number(existingTotal) || minTotal));
    let remaining = target - minTotal;
    constraints.forEach((constraint, index) => {
      const capacity = Math.max(0, constraint.max - constraint.min);
      const increment = Math.min(capacity, remaining);
      values[index] = constraint.min + increment;
      remaining -= increment;
    });
  }
  if (!hasStoredRows && values.reduce((sum, value) => sum + value, 0) <= 0) {
    const firstAvailable = constraints.findIndex(constraint => constraint.max > 0);
    if (firstAvailable >= 0) values[firstAvailable] = Math.min(1, constraints[firstAvailable].max);
  }

  const items_cantidades: Record<number, number> = {};
  const filas_cantidades: Record<string, number> = {};
  values.forEach((value, index) => {
    items_cantidades[index] = value;
    filas_cantidades[getRecognitionRowKey(rows[index], index)] = value;
  });
  return {
    items_cantidades,
    filas_cantidades,
    total: values.reduce((sum, value) => sum + value, 0),
  };
}

function extensionRowCanFit(row: any, horasAProgramar: number, maxExtensionHours: number): boolean {
  if (!hasConfiguredCatalogHours(row, horasAProgramar)) return false;
  const type = String(row?.tipo || 'fija').toLowerCase();
  if (type === 'fija' || type === 'porcentaje') {
    return getExtensionRowInitialHours(row, horasAProgramar) <= maxExtensionHours;
  }
  if (type === 'intervalo') {
    return getExtensionRowInitialHours(row, horasAProgramar) <= maxExtensionHours;
  }
  return maxExtensionHours > 0;
}

/**
 * Un bloque jerárquico no puede precargar todas sus filas como obligatorias si
 * esa suma ya supera por sí sola el tope del componente. En ese caso las filas
 * se convierten en alternativas para el docente y debe elegir una explícitamente.
 */
function extensionRequiresRowSelection(
  activity: any,
  section: ExtensionSectionConfig | undefined,
  horasAProgramar: number,
  maxExtensionHours: number,
): boolean {
  if (!extensionActivityUsesItems(section, activity)) return false;
  const rows = getExtensionConfiguredHourRows(activity, section)
    .filter(row => hasConfiguredCatalogHours(row, horasAProgramar));
  if (rows.length <= 1) return false;
  const mandatoryInitialHours = rows.reduce(
    (sum, row) => sum + (
      extensionRowAllowsZero(row, rows.length)
        ? 0
        : getExtensionRowInitialHours(row, horasAProgramar)
    ),
    0,
  );
  return mandatoryInitialHours > Math.max(0, maxExtensionHours);
}

function getEffectiveExtensionRows(
  activity: any,
  section: ExtensionSectionConfig | undefined,
  selectedRow: number | undefined,
  horasAProgramar: number,
  maxExtensionHours: number,
): any[] {
  const rows = getExtensionConfiguredHourRows(activity, section);
  if (!extensionRequiresRowSelection(activity, section, horasAProgramar, maxExtensionHours)) return rows;
  return Number.isInteger(selectedRow) && selectedRow! >= 0 && selectedRow! < rows.length
    ? [rows[selectedRow!]]
    : [];
}

function getInitialExtensionRowsState(rows: any[], horasAProgramar: number): {
  items_cantidades: Record<number, number>;
  total: number;
} {
  const items_cantidades: Record<number, number> = {};
  let total = 0;
  const multipleRows = rows.length > 1;
  rows.forEach((row, index) => {
    const type = String(row?.tipo || 'fija').toLowerCase();
    if (type === 'fija') {
      items_cantidades[index] = Math.max(0, Number(row?.horas) || 0);
      total += items_cantidades[index];
    } else if (type === 'porcentaje') {
      items_cantidades[index] = getPercentageHours(row, horasAProgramar);
      total += items_cantidades[index];
    } else if (type === 'intervalo') {
      items_cantidades[index] = Math.max(1, Number(row?.min ?? row?.horas_min) || 1);
      total += items_cantidades[index];
    } else if (type === 'hasta') {
      items_cantidades[index] = Number(row?.horas) > 0 && !multipleRows ? 1 : 0;
      total += items_cantidades[index];
    } else {
      items_cantidades[index] = 0;
    }
  });
  if (total <= 0 && multipleRows) {
    const firstOptionalIndex = rows.findIndex(row => extensionRowAllowsZero(row, rows.length));
    if (firstOptionalIndex >= 0) {
      items_cantidades[firstOptionalIndex] = 1;
      total = 1;
    }
  }
  return { items_cantidades, total };
}

const EXT_SECTION_ALIASES: Record<string, string> = {
  laboratorio_innovacion: 'fortalecimiento',
  investigacion_aplicada: 'fortalecimiento',
};

function normalizeExtensionSectionKey(section: unknown): string {
  const key = String(section || '');
  if (DEFAULT_EXT_SECCIONES.some(s => s.key === key)) return key;
  return EXT_SECTION_ALIASES[key] || 'fortalecimiento';
}

// ═══ COMPONENT ═══════════════════════════════════════════════════════

type PTAFormSectionKey = 'docencia' | 'investigacion' | 'extension' | 'complementarias';

// Secciones fijas de Complementarias (espejo de la config comp_secciones). AADM es
// ahora la sub-sección 'academico_administrativas' de Complementarias.
const COMP_SECCION_DOCENCIA = 'complementarias_docencia';
const COMP_SECCION_AADM = 'academico_administrativas';
const DEFAULT_COMP_SECCIONES = [
  { key: COMP_SECCION_DOCENCIA, label: 'ACTIVIDADES COMPLEMENTARIAS A LA DOCENCIA', color: PTA_COLORS.COMPLEMENTARIAS, orden: 1 },
  { key: COMP_SECCION_AADM, label: 'ACTIVIDADES ACADÉMICO-ADMINISTRATIVAS', color: PTA_COLORS.ACAD_ADMIN, orden: 2 },
];

type RepeatedEntryTone = 'investigacion' | 'extension' | 'complementarias' | 'academico';

function repeatedEntryCardClass(index: number, tone: RepeatedEntryTone): string {
  const alternating = index % 2 === 0 ? 'bg-white' : 'bg-slate-50/70';
  const toneBorder: Record<RepeatedEntryTone, string> = {
    investigacion: 'border-purple-200 border-l-purple-500',
    extension: 'border-slate-200 border-l-sky-500',
    complementarias: 'border-amber-200 border-l-amber-500',
    academico: 'border-blue-200 border-l-blue-600',
  };
  return `flex flex-col gap-3 p-3.5 md:p-4 rounded-xl border border-l-4 ${alternating} ${toneBorder[tone]} relative shadow-[0_2px_8px_rgba(15,23,42,0.06)] hover:shadow-[0_5px_16px_rgba(15,23,42,0.10)] transition-all duration-200`;
}

function RepeatedEntryHeader({ index, label, color }: { index: number; label: string; color: string }) {
  return (
    <div className="flex items-center gap-2.5 min-h-7 pr-10 pb-2 border-b border-slate-200/80">
      <span
        className="inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] font-extrabold text-white shadow-sm"
        style={{ backgroundColor: color }}
      >
        {index + 1}
      </span>
      <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-600">
        {label}
      </span>
    </div>
  );
}

const COMPONENT_TO_FORM_SECTION: Record<PTAComponentKey, PTAFormSectionKey> = {
  academica: 'docencia',
  investigacion: 'investigacion',
  ext_capacitacion: 'extension',
  ext_procesos: 'extension',
  ext_fortalecimiento: 'extension',
  ext_gobierno: 'extension',
  complementarias: 'complementarias',
};
const ALL_COMPONENT_KEYS = Object.keys(COMPONENT_TO_FORM_SECTION) as PTAComponentKey[];

// Etiquetas legibles por componente (para banners de devolución, etc.).
const COMPONENT_LABEL: Record<string, string> = {
  academica: 'Docencia',
  investigacion: 'Investigación',
  ext_capacitacion: 'Extensión — Capacitación',
  ext_procesos: 'Extensión — Procesos de Selección',
  ext_fortalecimiento: 'Extensión — Fortalecimiento',
  ext_gobierno: 'Extensión — Alto Gobierno',
  complementarias: 'Complementarias',
  // Legacy
  academicas_admin: 'Actividades Académico-Administrativas',
  academico_admin: 'Actividades Académico-Administrativas',
};
function componentLabel(key: string): string {
  return COMPONENT_LABEL[key] || key;
}

const EXT_SUBSECTION_TO_COMPONENT: Record<string, PTAComponentKey> = {
  capacitacion: 'ext_capacitacion',
  seleccion: 'ext_procesos',
  fortalecimiento: 'ext_fortalecimiento',
  alto_gobierno: 'ext_gobierno',
  laboratorio_innovacion: 'ext_fortalecimiento',
  investigacion_aplicada: 'ext_fortalecimiento',
};

function componentKeyForExtensionSubsection(section: string): PTAComponentKey {
  return EXT_SUBSECTION_TO_COMPONENT[section] || 'ext_fortalecimiento';
}

export function PTAForm({ onBack, userPersonId, ptaId, isAdminEdit = false, jefaturaTerritorialId, allowedComponentKeys, componentEditScopeLabel, concertacionActorId, concertacionActorNombre }: PTAFormProps) {
  const [saving, setSaving] = useState(false);
  // Comentario obligatorio al "Concertar" (editar y enviar como admin/revisor): editar y
  // mandar un PTA de un docente es, en la práctica, devolver el/los componente(s)
  // afectados — el docente debe ver qué se devolvió y por qué, igual que en el flujo de
  // devolución por componente.
  const [comentarioConcertacion, setComentarioConcertacion] = useState('');
  // Selección explícita del/los componente(s) a devolver cuando el revisor NO tiene
  // permiso restringido (aprueba todo / sin restricción): evita adivinar por la pestaña
  // abierta, que podía no coincidir con lo que realmente se quería devolver.
  const [componentesSeleccionadosDevolver, setComponentesSeleccionadosDevolver] = useState<string[]>([]);
  // Respuesta obligatoria del docente al reenviar un componente devuelto: por qué lo
  // reenvía / qué corrigió. El revisor la ve junto a su comentario original al volver
  // a concertar/aprobar ese componente.
  const [respuestasDevolucionDocente, setRespuestasDevolucionDocente] = useState<Record<string, string>>({});
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
    const el = document.getElementById('portal-left-sidebar-slot');
    if (el) setSlotNode(el);
  }, []);

  // Catálogos
  const [programas, setProgramas] = useState<any[]>([]);
  // Programas filtrados por CETAP (clave: cetap_id, valor: array de programas)
  const [programasPorCetap, setProgramasPorCetap] = useState<Record<string, any[]>>({});
  const [asignaturasCat, setAsignaturasCat] = useState<any[]>([]);
  const [territoriales, setTerritoriales] = useState<any[]>([]);
  const [cetapsMap, setCetapsMap] = useState<Record<string, any[]>>({});
  const [actInvestigacion, setActInvestigacion] = useState<any[]>([]);
  const [actExtension, setActExtension] = useState<any>(null);
  const [extSecciones, setExtSecciones] = useState<ExtensionSectionConfig[]>(DEFAULT_EXT_SECCIONES);
  const [actComplementarias, setActComplementarias] = useState<any[]>([]);
  const [actAcadAdmin, setActAcadAdmin] = useState<any[]>([]);
  const [rolesInvestigacion, setRolesInvestigacion] = useState<any[]>([]);
  const [ptaRules, setPtaRules] = useState<any>(null);
  const [periodosDisponibles, setPeriodosDisponibles] = useState<any[]>([]);
  // Fechas del período académico activo — usadas como min/max en los date-pickers
  const [periodoFechaMin, setPeriodoFechaMin] = useState<string | undefined>(undefined);
  const [periodoFechaMax, setPeriodoFechaMax] = useState<string | undefined>(undefined);


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
  // En modo admin, preserva el docente_id real del PTA (no el del admin logueado)
  const [docenteIdFromPta, setDocenteIdFromPta] = useState<string>('');

  // Firma digital del docente — requerida antes de cada envío
  const [showFirmaDocente, setShowFirmaDocente] = useState(false);
  const [pendingDocenteAccion, setPendingDocenteAccion] = useState<'via_save' | 'avanzar_sin_cambios' | null>(null);
  const [docenteName, setDocenteName] = useState('');
  const [requestingFirmaCode, setRequestingFirmaCode] = useState(false);
  const [firmaVerificationId, setFirmaVerificationId] = useState('');
  const [firmaCorreoDestino, setFirmaCorreoDestino] = useState('');
  // Modal de confirmación PTA incompleto (reemplaza window.confirm nativo)
  const [showConfirmIncompleto, setShowConfirmIncompleto] = useState(false);
  const [confirmIncompletoData, setConfirmIncompletoData] = useState<{ totalHoras: number; horasRequeridas: number; porcentaje: number } | null>(null);
  // Confirmación de horas de EXCESO (el PTA supera el límite programable).
  const [showConfirmExceso, setShowConfirmExceso] = useState(false);
  const [confirmExcesoData, setConfirmExcesoData] = useState<{ totalHoras: number; horasRequeridas: number; horasExceso: number; porcentaje: number } | null>(null);

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
    resolucion_nombre: '', resolucion_archivo: null, resolucion_archivo_url: '',
  });
  const [invActividades, setInvActividades] = useState<InvestigacionActividad[]>([]);
  const [extActividades, setExtActividades] = useState<ExtensionActividad[]>([]);
  const [complementarias, setComplementarias] = useState<ComplementariaItem[]>([]);
  const [academicoAdmin, setAcademicoAdmin] = useState<ComplementariaItem[]>([]);

  const [activeSection, setActiveSection] = useState<'docencia' | 'investigacion' | 'extension' | 'complementarias'>('docencia');
  const [extSubseccion, setExtSubseccion] = useState('capacitacion');
  const [complementariasSubseccion, setComplementariasSubseccion] = useState(COMP_SECCION_DOCENCIA);
  const [documentosPendientes, setDocumentosPendientes] = useState<any[]>([]);

  // Aprobaciones por componente — para detectar devoluciones y mostrar sus comentarios.
  const [componentesAprobacion, setComponentesAprobacion] = useState<any[]>([]);
  const componentesDevueltos = useMemo(
    () => (componentesAprobacion || []).filter(c => String(c?.estado || '').toLowerCase() === 'devuelto'),
    [componentesAprobacion],
  );
  const devueltoComponentKeys = useMemo(
    () => Array.from(new Set(componentesDevueltos.map(c => String(c?.componente || '')).filter(Boolean))),
    [componentesDevueltos],
  );
  // Devolución por componente: el revisor devolvió uno o más componentes al docente.
  // (No aplica en modo admin.)
  const esDevolucionComponentes = !isAdminEdit && devueltoComponentKeys.length > 0;
  const respuestasDocentePorComponente = useMemo(() => {
    const entries = devueltoComponentKeys
      .map(key => [key, (respuestasDevolucionDocente[key] || '').trim()] as const)
      .filter(([, value]) => Boolean(value));
    return Object.fromEntries(entries);
  }, [devueltoComponentKeys, respuestasDevolucionDocente]);
  const respuestasDevolucionCompletas = useMemo(
    () => devueltoComponentKeys.every(key => Boolean((respuestasDevolucionDocente[key] || '').trim())),
    [devueltoComponentKeys, respuestasDevolucionDocente],
  );
  const resumenRespuestasDevolucion = useMemo(
    () => devueltoComponentKeys
      .map(key => {
        const value = (respuestasDevolucionDocente[key] || '').trim();
        return value ? `${componentLabel(key)}: ${value}` : '';
      })
      .filter(Boolean)
      .join('\n'),
    [devueltoComponentKeys, respuestasDevolucionDocente],
  );

  const adminAllowedComponentKeys = useMemo(
    () => (allowedComponentKeys || []).map(key => String(key)).filter(Boolean),
    [allowedComponentKeys],
  );
  const isAdminComponentRestricted = isAdminEdit && adminAllowedComponentKeys.length > 0;

  // Componentes ya resueltos (aprobados o devueltos POR UN REVISOR) — dejan de ser
  // editables en el modal de "Concertar" en cuanto se resuelven, sin esperar a que el
  // botón "Concertar" desaparezca (nunca desaparece mientras quede algo pendiente).
  // Se excluye la auto-aprobación del sistema (subcomponentes de Extensión sin
  // actividades, ej. Fortalecimiento/Alto Gobierno cuando el docente no cargó nada ahí):
  // no es una decisión real de un revisor y no debe bloquear agregar contenido nuevo.
  const componentesResueltos = useMemo(
    () => new Set(
      (componentesAprobacion || [])
        .filter(c => {
          const est = String(c?.estado || '').toLowerCase();
          if (est === 'devuelto') return true;
          if (est === 'aprobado') return c?.aprobadorNombre !== 'Sistema';
          return false;
        })
        .map(c => String(c?.componente || '')),
    ),
    [componentesAprobacion],
  );
  // Lo editable AHORA para un admin/revisor = su alcance de permiso (o todos los
  // componentes, si no tiene restricción de permiso) menos lo ya resuelto.
  const adminEditableComponentKeysNow = useMemo(() => {
    if (!isAdminEdit) return [];
    const base = adminAllowedComponentKeys.length > 0 ? adminAllowedComponentKeys : ALL_COMPONENT_KEYS;
    return base.filter(key => !componentesResueltos.has(key));
  }, [isAdminEdit, adminAllowedComponentKeys, componentesResueltos]);

  // Restricción de edición por componente. Aplica a: (a) admin/revisor → su alcance de
  // permiso menos lo ya resuelto; (b) docente corrigiendo una devolución → solo puede
  // editar los componentes devueltos.
  const restrictedComponentKeys = useMemo(() => {
    if (isAdminEdit) return adminEditableComponentKeysNow;
    if (esDevolucionComponentes) return devueltoComponentKeys;
    return [];
  }, [isAdminEdit, adminEditableComponentKeysNow, esDevolucionComponentes, devueltoComponentKeys]);
  // En modo admin SIEMPRE se filtra por lo editable ahora (puede ser un array vacío si
  // ya se resolvió todo lo que le correspondía a este revisor) — a diferencia del resto
  // de casos, donde un array vacío significa "sin restricción".
  const isComponentRestricted = isAdminEdit ? true : restrictedComponentKeys.length > 0;

  const allowedComponentKeySet = useMemo(
    () => new Set(restrictedComponentKeys),
    [restrictedComponentKeys],
  );
  const allowedFormSectionSet = useMemo(() => {
    if (!isComponentRestricted) return null;
    const sections = new Set<PTAFormSectionKey>();
    restrictedComponentKeys.forEach(key => {
      const section = COMPONENT_TO_FORM_SECTION[key as PTAComponentKey];
      if (section) sections.add(section);
    });
    return sections;
  }, [restrictedComponentKeys, isComponentRestricted]);
  const canEditFormSection = useCallback((section: PTAFormSectionKey) => {
    return !allowedFormSectionSet || allowedFormSectionSet.has(section);
  }, [allowedFormSectionSet]);
  const canEditExtensionSubsection = useCallback((section: string) => {
    return !isComponentRestricted || allowedComponentKeySet.has(componentKeyForExtensionSubsection(section));
  }, [allowedComponentKeySet, isComponentRestricted]);

  useEffect(() => {
    const activeDocenteId = userPersonId || docenteIdFromPta;
    if (!activeDocenteId) return;
    getRUNDDocente(activeDocenteId)
      .then((res) => {
        if (res.success && res.data) {
          const criticos = ['DOCUMENTO_IDENTIDAD', 'VINCULACION', 'DEDICACION', 'ACTO_ADMINISTRATIVO'];
          const validaciones = Array.isArray(res.data) ? res.data : (res.data.validaciones || []);
          const noAceptados = validaciones.filter((v: any) =>
            criticos.includes(v.campo_rund) && v.estado_documento !== 'Aceptado'
          );
          setDocumentosPendientes(noAceptados);
        }
      })
      .catch((err) => console.warn('[PTAForm] RUND no disponible (no crítico):', err?.message || err));
  }, [userPersonId, docenteIdFromPta]);

  // Load catálogos
  useEffect(() => {
    Promise.all([
      getCatalogoProgramas(),
      getCatalogoAsignaturas(),
      getCatalogoActividadesInvestigacion(),
      getCatalogoActividadesExtension(),
      getCatalogoActividadesComplementarias(),
      getCatalogoActividadesAcademicoAdmin(),
      getCatalogoRolesInvestigacion(),
      getConfiguracionPTAGlobal(),
      getCatalogoSeccionesExtension(),
      getPeriodosAcademicos(),
    ]).then(([progs, asigs, actInv, actExt, actComp, actAcad, roles, config, secciones, periodos]) => {
      if (progs.success) setProgramas(progs.data);
      if (asigs.success) setAsignaturasCat(asigs.data);
      if (actInv.success) setActInvestigacion(actInv.data);
      if (actExt.success && actExt.data) {
        const normalized: Record<string, any[]> = {};
        Object.entries(actExt.data).forEach(([key, val]) => {
          const sectionKey = normalizeExtensionSectionKey(key);
          // No inferir el modelo por la sección ni fabricar `items: []`.
          // La presencia de `items` es el discriminador compatible con datos legacy.
          const acts = Array.isArray(val) ? val : [];
          normalized[sectionKey] = [...(normalized[sectionKey] || []), ...acts];
        });
        // De-duplicar actividades por id dentro de cada sección. Distintas claves de
        // configuración (p.ej. alias legacy que normalizan a 'fortalecimiento') pueden
        // aportar una misma actividad, generando opciones con id repetido — lo que causaba
        // la advertencia de React "two children with the same key (LAB_12)" y selección
        // ambigua en el dropdown de Extensión. Se conserva la primera aparición.
        Object.keys(normalized).forEach((sec) => {
          const seen = new Set<string>();
          normalized[sec] = normalized[sec].filter((a: any) => {
            const id = String(a?.id ?? '');
            if (!id) return true;
            if (seen.has(id)) return false;
            seen.add(id);
            return true;
          });
        });
        setActExtension(normalized);
      }
      // Catálogos de Complementarias por sección. El backend los deriva de la
      // configuración v2 y conserva juntos tipo, mínimo, máximo y porcentaje.
      setActComplementarias(actComp.success && Array.isArray(actComp.data) ? actComp.data : []);
      setActAcadAdmin(actAcad.success && Array.isArray(actAcad.data) ? actAcad.data : []);
      if (roles.success) setRolesInvestigacion(roles.data);
      if (config.success && config.data) setPtaRules(config.data);
      if (periodos.success) setPeriodosDisponibles(periodos.data);
      if (secciones.success && Array.isArray(secciones.data) && secciones.data.length > 0) {
        // El multiplicador de la config (ext_secciones[].multiplicador) es la fuente de verdad
        // y el backend ya lo aplica. Solo usamos el default por key si la config NO trae el campo,
        // respetando un multiplicador explícito (incluido 1) configurado por el admin.
        const savedByKey = new Map<string, any>();
        secciones.data.forEach((s: any) => {
          const key = normalizeExtensionSectionKey(s.key);
          if (!savedByKey.has(key)) savedByKey.set(key, s);
        });
        const merged = DEFAULT_EXT_SECCIONES.map((def) => {
          const s = savedByKey.get(def.key) || {};
          const mult = (s.multiplicador != null && Number(s.multiplicador) > 0)
            ? Number(s.multiplicador)
            : (def.multiplicador || 1);
          return {
            ...def,
            color: s.color || def.color,
            // Un arreglo vacío es significativo: describe una tabla simple sin filas.
            columnas: Array.isArray(s.columnas) ? s.columnas : def.columnas,
            columna_raiz_nombre: s.columna_raiz_nombre || def.columna_raiz_nombre,
            columna_items_nombre: s.columna_items_nombre || def.columna_items_nombre,
            multiplicador: mult,
          };
        });
        const sorted = merged.sort((a: any, b: any) => (a.orden ?? 0) - (b.orden ?? 0));
        setExtSecciones(sorted);
        setExtSubseccion(sorted[0]?.key || 'capacitacion');
      }
    });
  }, []);

  // Load territoriales based on period
  useEffect(() => {
    if (!periodo) return;
    let active = true;
    (async () => {
      try {
        const terrs = await getCatalogoTerritoriales(periodo);
        if (active && terrs.success) {
          setTerritoriales(terrs.data);
        }
      } catch (err) {
        console.warn('[PTAForm] No se pudieron cargar territoriales para el período:', err?.message || err);
      }
    })();
    return () => {
      active = false;
    };
  }, [periodo]);

  // Cuando extSecciones carga, corregir actividades cuyas horas no fueron multiplicadas
  // por race condition (actividad agregada antes de que llegara la config del backend)
  useEffect(() => {
    if (!extSecciones.length) return;
    setExtActividades(prev => prev.map(e => {
      const normalizedSection = normalizeExtensionSectionKey(e.seccion);
      const baseAct = normalizedSection === e.seccion ? e : { ...e, seccion: normalizedSection };
      const secConfig = extSecciones.find(s => s.key === normalizedSection);
      const mult = secConfig?.multiplicador || 1;
      if (mult <= 1) return baseAct;
      const ejec = Number(baseAct.horas_ejecutadas ?? 0);
      const horas = Number(baseAct.horas ?? 0);
      // Si horas === horas_ejecutadas en una sección con multiplicador, no se aplicó el x2
      if (ejec > 0 && horas === ejec) {
        return { ...baseAct, horas: ejec * mult };
      }
      return baseAct;
    }));
  }, [extSecciones]);

  // Recalcular y sincronizar horas para etapas con desglose de ítems (como Procesos de Selección)
  // cuando el catálogo de actividades de extensión o la lista de actividades del docente terminen de cargar.
  useEffect(() => {
    if (!actExtension) return;
    const configuredExtensionLimit = getConfiguredExtensionLimit(ptaRules, horasAProgramar);
    setExtActividades(prev => {
      let changed = false;
      const next = prev.map(e => {
        const sectionKey = normalizeExtensionSectionKey(e.seccion);
        const baseAct = sectionKey === e.seccion ? e : { ...e, seccion: sectionKey };
        if (baseAct !== e) changed = true;
        const cat = (actExtension[sectionKey] || []).find((c: any) => c.id === baseAct.actividad_id);
        const section = extSecciones.find(s => s.key === sectionKey);
        const requiresRowSelection = Boolean(cat && extensionRequiresRowSelection(
          cat,
          section,
          horasAProgramar,
          configuredExtensionLimit,
        ));
        const configuredRows = cat
          ? getEffectiveExtensionRows(
              cat,
              section,
              baseAct.fila_seleccionada,
              horasAProgramar,
              configuredExtensionLimit,
            )
          : [];
        if (requiresRowSelection && configuredRows.length === 0) {
          if (baseAct.horas !== 0 || baseAct.horas_ejecutadas !== 0 || baseAct.items_cantidades
            || baseAct.fila_seleccionada_nombre || baseAct.fila_seleccionada_etiqueta
            || baseAct.fila_seleccionada_detalles) {
            changed = true;
            return {
              ...baseAct,
              horas: 0,
              horas_ejecutadas: 0,
              items_cantidades: undefined,
              ...getExtensionRowSnapshot(null, section),
            };
          }
          return baseAct;
        }
        if (cat && extensionActivityUsesItems(section, cat) && configuredRows.length > 0) {
          const selectionSnapshot = Number.isInteger(baseAct.fila_seleccionada)
            ? getExtensionRowSnapshot(configuredRows[0], section)
            : {};
          const snapshotChanged = Object.keys(selectionSnapshot).some((key) =>
            JSON.stringify((baseAct as any)[key]) !== JSON.stringify((selectionSnapshot as any)[key]),
          );
          const hasStoredQuantities = Boolean(
            baseAct.items_cantidades && Object.keys(baseAct.items_cantidades).length > 0,
          );
          const newCantidades: Record<number, number> = hasStoredQuantities
            ? { ...(baseAct.items_cantidades || {}) }
            : getInitialExtensionRowsState(configuredRows, horasAProgramar).items_cantidades;
          const totalHoras = configuredRows.reduce((sum: number, item: any, i: number) => {
            const tipo = (item.tipo || 'fija').toLowerCase();
            if (tipo === 'fija') {
              newCantidades[i] = Math.max(0, Number(item.horas) || 0);
              return sum + newCantidades[i];
            }
            if (tipo === 'porcentaje') {
              newCantidades[i] = getPercentageHours(item, horasAProgramar);
              return sum + newCantidades[i];
            }
            if (tipo === 'hasta') {
              const minimum = extensionRowAllowsZero(item, configuredRows.length) ? 0 : 1;
              const stored = Number(newCantidades[i]);
              const value = Number.isFinite(stored) ? stored : 1;
              newCantidades[i] = Math.min(item.horas || 0, Math.max(minimum, value));
              return sum + newCantidades[i];
            }
            // 'intervalo': el valor ES las horas (acotado a [min, max]); NO se multiplica
            // por item.horas (eso daba totales absurdos, p.ej. 40 × 120 = 4800h).
            if (tipo === 'intervalo') {
              newCantidades[i] = Math.min(item.horas || 0, Math.max(item.min ?? 1, Number(newCantidades[i]) || 1));
              return sum + newCantidades[i];
            }
            const qty = Math.max(0, Number(newCantidades[i]) || 0);
            newCantidades[i] = qty;
            return sum + (qty * (item.horas || 0));
          }, 0);
          const quantitiesChanged = JSON.stringify(baseAct.items_cantidades || {}) !== JSON.stringify(newCantidades);
          if (baseAct.horas !== totalHoras || baseAct.horas_ejecutadas !== totalHoras || snapshotChanged || quantitiesChanged) {
            changed = true;
            return {
              ...baseAct,
              ...selectionSnapshot,
              items_cantidades: newCantidades,
              horas: totalHoras,
              horas_ejecutadas: totalHoras,
            };
          }
        }
        if (cat && !extensionActivityUsesItems(section, cat)) {
          const mult = Math.max(1, Number(section?.multiplicador) || 1);
          const type = getRootActivityHourType(cat);
          const maxPta = type === 'porcentaje'
            ? getPercentageHours(cat, horasAProgramar)
            : Math.max(1, Number(cat.max_horas) || 1);
          const minPta = type === 'intervalo'
            ? Math.min(maxPta, Math.max(1, Number(cat.min_horas) || 1))
            : (type === 'fija' ? maxPta : 1);
          const maxExec = maxPta / mult;
          const minExec = minPta / mult;
          const savedExec = Number(baseAct.horas_ejecutadas ?? (Number(baseAct.horas) / mult));
          let nextExec = Number.isFinite(savedExec) ? savedExec : 0;
          if (type === 'fija' || type === 'porcentaje') nextExec = maxExec;
          else if (nextExec <= 0) nextExec = type === 'intervalo' ? minExec : maxExec;
          else nextExec = Math.min(maxExec, Math.max(type === 'intervalo' ? minExec : 0, nextExec));
          const nextHours = nextExec * mult;
          if (baseAct.horas_ejecutadas !== nextExec || baseAct.horas !== nextHours || baseAct.items_cantidades) {
            changed = true;
            return { ...baseAct, horas_ejecutadas: nextExec, horas: nextHours, items_cantidades: undefined };
          }
        }
        return baseAct;
      });
      return changed ? next : prev;
    });
  }, [actExtension, extActividades, extSecciones, horasAProgramar, ptaRules]);

  // Reconciliar borradores creados antes de que el portal conservara `tipo`.
  // Una regla fija nunca debe permanecer con el valor parcial que dejó el antiguo
  // comportamiento de "hasta".
  useEffect(() => {
    if (actComplementarias.length > 0) {
      setComplementarias(previous => {
        let changed = false;
        const next = previous.map(item => {
          const catalog = actComplementarias.find((activity: any) => activity.id === item.actividad_id);
          if (!catalog) return item;
          const constraint = getComplementariaConstraint(catalog, ptaRules, horasAProgramar);
          const rowsState = reconcileRecognitionRows(
            catalog,
            horasAProgramar,
            item.horas,
            item.filas_cantidades,
            item.items_cantidades,
          );
          const reconciledHours = rowsState?.total ?? clampConstraintValue(item.horas, constraint);
          if (
            Number(item.horas) !== reconciledHours
            || item.nombre !== catalog.nombre
            || (rowsState && (
              JSON.stringify(item.items_cantidades || {}) !== JSON.stringify(rowsState.items_cantidades)
              || JSON.stringify(item.filas_cantidades || {}) !== JSON.stringify(rowsState.filas_cantidades)
            ))
            || (!rowsState && (item.items_cantidades || item.filas_cantidades))
          ) {
            changed = true;
            return {
              ...item,
              nombre: catalog.nombre,
              horas: reconciledHours,
              items_cantidades: rowsState?.items_cantidades,
              filas_cantidades: rowsState?.filas_cantidades,
            };
          }
          return item;
        });
        return changed ? next : previous;
      });
    }

    if (actAcadAdmin.length > 0) {
      setAcademicoAdmin(previous => {
        let changed = false;
        const next = previous.map(item => {
          const catalog = actAcadAdmin.find((activity: any) => activity.id === item.actividad_id);
          if (!catalog) return item;
          const constraint = getAcademicoAdminConstraint(catalog, ptaRules, horasAProgramar);
          const consumesFullPTA = isFullPTAActivity(catalog);
          const rowsState = reconcileRecognitionRows(
            catalog,
            horasAProgramar,
            item.horas,
            item.filas_cantidades,
            item.items_cantidades,
          );
          const reconciledHours = rowsState?.total ?? clampConstraintValue(item.horas, constraint);
          if (
            Number(item.horas) !== reconciledHours ||
            Boolean(item.consumeTotalidad) !== consumesFullPTA ||
            item.nombre !== catalog.nombre ||
            (rowsState && (
              JSON.stringify(item.items_cantidades || {}) !== JSON.stringify(rowsState.items_cantidades)
              || JSON.stringify(item.filas_cantidades || {}) !== JSON.stringify(rowsState.filas_cantidades)
            )) ||
            (!rowsState && (item.items_cantidades || item.filas_cantidades))
          ) {
            changed = true;
            return {
              ...item,
              nombre: catalog.nombre,
              horas: reconciledHours,
              consumeTotalidad: consumesFullPTA,
              items_cantidades: rowsState?.items_cantidades,
              filas_cantidades: rowsState?.filas_cantidades,
            };
          }
          return item;
        });
        return changed ? next : previous;
      });
    }
  }, [actComplementarias, actAcadAdmin, ptaRules, horasAProgramar]);

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

  const loadingProgramasRef = useRef<Set<string>>(new Set());

  // Carga (una sola vez) los programas ofertados por un CETAP, para poblar el
  // dropdown "Programa". Necesario al recargar un borrador: la asignatura ya trae
  // su programa_id, pero sin la lista de opciones el select no puede mostrarlo.
  const loadProgramasCetap = useCallback(async (cetapId: string) => {
    if (!cetapId) return;
    setProgramasPorCetap(prev => {
      if (prev[cetapId] || loadingProgramasRef.current.has(cetapId)) return prev;
      loadingProgramasRef.current.add(cetapId);
      getCatalogoProgramasCascada(cetapId, periodo)
        .then(result => {
          loadingProgramasRef.current.delete(cetapId);
          setProgramasPorCetap(curr => ({
            ...curr,
            [cetapId]: result.success && result.data.length > 0 ? result.data : [],
          }));
        })
        .catch(() => {
          loadingProgramasRef.current.delete(cetapId);
          setProgramasPorCetap(curr => ({ ...curr, [cetapId]: [] }));
        });
      return prev;
    });
  }, [periodo]);

  // Sync CETAPs + Programas for existing asignaturas
  useEffect(() => {
    if (!asignaturas.length) return;
    asignaturas.forEach(a => {
      const tid = a.territorial_id || defaultTerritorial;
      if (tid) loadCetaps(tid);
      // Poblar las opciones de "Programa" del CETAP de cada asignatura guardada
      // para que el programa persistido se muestre tras "Guardar Borrador" + recargar.
      if (a.cetap_id) loadProgramasCetap(String(a.cetap_id));
    });
  }, [asignaturas, defaultTerritorial, loadCetaps, loadProgramasCetap]);

  // Load existing PTA
  useEffect(() => {
    if (!ptaId) return;
    setLoadingPta(true);
    getPTAById(ptaId).then(res => {
      if (res.success && res.data) {
        const d = res.data;
        setPeriodo(d.periodo || '2025-2');
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
        // Normalizar actividades de extensión al cargar: aplicar multiplicador x2 si no se hizo
        // (puede pasar con PTAs guardados antes del fix o en race condition)
        const rawExtActs: ExtensionActividad[] = d.extension_actividades || [];
        const normalizedExtActs = rawExtActs.map(e => {
          const normalizedSection = normalizeExtensionSectionKey(e.seccion);
          const baseAct = normalizedSection === e.seccion ? e : { ...e, seccion: normalizedSection };
          const secConfig = extSecciones.find(s => s.key === normalizedSection);
          const mult = secConfig?.multiplicador || 1;
          if (mult <= 1) return baseAct;
          const ejec = Number(baseAct.horas_ejecutadas ?? 0);
          const horas = Number(baseAct.horas ?? 0);
          if (ejec > 0 && horas === ejec) {
            // Guardado sin multiplicar (simple input) → corregir
            return { ...baseAct, horas: ejec * mult };
          }
          if (ejec === 0 && horas > 0) {
            // Solo horas seteado (formato antiguo) → tratar como ejecutadas
            return { ...baseAct, horas_ejecutadas: horas, horas: horas * mult };
          }
          return baseAct;
        });
        setExtActividades(normalizedExtActs);
        // Complementarias unificado: separar por sección. IMPORTANTE: no fusionar el array
        // legacy academico_admin con los ítems ya taggeados en complementarias (evita duplicados).
        {
          const rawComp = Array.isArray(d.complementarias) ? d.complementarias : [];
          const isAadm = (c: any) => c?.seccion === COMP_SECCION_AADM
            || (c?.seccion == null && c?.consumeTotalidad !== undefined);
          const compAadm = rawComp.filter((c: any) => isAadm(c));
          const legacyAadm = Array.isArray(d.academico_admin) ? d.academico_admin : [];
          setComplementarias(rawComp.filter((c: any) => !isAadm(c)));
          // Si complementarias ya trae la sección AADM se usa esa (PTA migrado/guardado nuevo);
          // el array legacy solo aplica a PTAs viejos sin la sección dentro de complementarias.
          setAcademicoAdmin(compAadm.length > 0 ? compAadm : legacyAadm);
        }
        setObservacionesDocente(d.observaciones_docente || '');
        if (d.camposModificadosPorRevisor) setCamposModificados(d.camposModificadosPorRevisor);
        // Guardar docente_id del PTA para usarlo en modo admin
        if (d.docente_id) setDocenteIdFromPta(d.docente_id);
      } else {
        toast.error('No se pudo cargar el PTA.');
      }
      setLoadingPta(false);
    });
  }, [ptaId]);

  // Cargar aprobaciones por componente (para detectar devoluciones + comentarios del revisor).
  useEffect(() => {
    if (!ptaId) { setComponentesAprobacion([]); return; }
    let cancelado = false;
    getComponentesAprobacion(ptaId)
      .then((res: any) => {
        if (!cancelado && res?.success) setComponentesAprobacion(Array.isArray(res.data) ? res.data : []);
      })
      .catch((err: any) => console.warn('[PTAForm] No se pudieron cargar aprobaciones por componente:', err?.message || err));
    return () => { cancelado = true; };
  }, [ptaId]);

  // Load active period codigo — solo para PTAs nuevos
  useEffect(() => {
    if (ptaId) return;
    (async () => {
      try {
        const activePer = await getActivePeriodoAcademico();
        if (activePer && activePer.codigo) {
          setPeriodo(activePer.codigo);
        }
      } catch (err) {
        console.warn('[PTAForm] No se pudo obtener el período activo (codigo):', err?.message || err);
      }
    })();
  }, [ptaId]);

  // Rango de fechas para los date-pickers de los componentes.
  // Se deriva del PERÍODO DEL PTA (no de un único "período activo" global), de modo
  // que corresponda al semestre real del plan (alineado con la Circular 003: las
  // actividades se registran dentro del período académico del PTA). Si el período no
  // existe en BD o no tiene fechas, se usa el rango del semestre según el código
  // (YYYY-1 => ene–jun; YYYY-2 => jul–dic), evitando quedar topado a un período viejo.
  useEffect(() => {
    let cancelado = false;

    // Fallback determinístico por código de período.
    const rangoPorCodigo = (cod: string): { min?: string; max?: string } => {
      const m = /^(\d{4})-([12])$/.exec(String(cod || '').trim());
      if (!m) return {};
      const anio = m[1];
      return m[2] === '1'
        ? { min: `${anio}-01-01`, max: `${anio}-06-30` }
        : { min: `${anio}-07-01`, max: `${anio}-12-31` };
    };

    (async () => {
      const codigoPeriodo = String(periodo || '').trim();
      try {
        const res = await getPeriodosAcademicos();
        const lista = Array.isArray(res?.data) ? res.data : [];
        const match = codigoPeriodo
          ? lista.find((p: any) => String(p.codigo) === codigoPeriodo)
          : lista.find((p: any) => p.estado === 'en_curso');
        const fi = match?.fecha_inicio || match?.fechaInicio;
        const ff = match?.fecha_fin || match?.fechaFin;
        if (!cancelado && fi && ff) {
          setPeriodoFechaMin(String(fi).substring(0, 10));
          setPeriodoFechaMax(String(ff).substring(0, 10));
          return;
        }
      } catch (err) {
        console.warn('[PTAForm] No se pudieron cargar periodos académicos:', err?.message || err);
      }
      // Sin período en BD (o sin fechas): usar el rango del semestre según el código.
      if (!cancelado) {
        const rango = rangoPorCodigo(codigoPeriodo);
        setPeriodoFechaMin(rango.min);
        setPeriodoFechaMax(rango.max);
      }
    })();

    return () => { cancelado = true; };
  }, [periodo]); // Re-evalúa cuando cambia el período del PTA

    // Load Docente User Profile and Banco Docentes info to prepopulate defaults
    useEffect(() => {
      const activeDocenteId = userPersonId || docenteIdFromPta;
      if (!activeDocenteId) return;
      Promise.all([
        getPerfilPortal(activeDocenteId).catch(() => null),
        getBancoDocenteById(activeDocenteId).catch(() => null)
      ]).then(([resPerfil, resBanco]) => {
        let p: any = {};
        
        if (resPerfil && resPerfil.success && resPerfil.data) {
          p = { ...p, ...resPerfil.data };
        }
        
        if (resBanco && resBanco.success && resBanco.data) {
          const bd = resBanco.data;
          p.territorial_id = bd.territorial_id || bd.territorialId || p.territorial_id;
          p.sede_id = bd.cetap_id || bd.cetapId || p.sede_id;
          p.nombre = bd.nombre_completo || bd.nombreCompleto || p.nombre;
          p.dedicacion = bd.dedicacion || p.dedicacion;
          
          let mappedTipoVinc = bd.tipo_vinculacion || bd.tipoVinculacion;
          if (mappedTipoVinc === 'CARRERA') {
             const regNorm = bd.regimen_normativo || bd.regimenNormativo;
             if (regNorm === '009/2004') mappedTipoVinc = 'CARRERA_009';
             else if (regNorm === '003/2018') mappedTipoVinc = 'CARRERA_003';
          }
          p.tipoVinculacion = mappedTipoVinc || p.tipoVinculacion;
        }

        // Territorial y CETAP: siempre se cargan del perfil (son fijos del docente)
        const tId = p.territorial_id || p.territorialId;
        if (tId) {
          setDefaultTerritorial(tId);
          loadCetaps(tId);
        }
        if (p.sede_id || p.sedeId) {
          const cetapDefault = String(p.sede_id || p.sedeId);
          setDefaultCetap(cetapDefault);
          // Pre-cargar programas filtrados para el CETAP del docente (Nota: el periodo puede no estar final aquí si el PTA es existente y carga lento, pero el onChange lo manejará)
          getCatalogoProgramasCascada(cetapDefault, periodo).then(result => {
            if (result.success) {
              setProgramasPorCetap(prev => ({ ...prev, [cetapDefault]: result.data || [] }));
            }
          }).catch(() => { setProgramasPorCetap(prev => ({ ...prev, [cetapDefault]: [] })); });
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
      }).catch((e) => console.warn('[PTAForm] Error loading docente profile data (non-critical):', e?.message || e));
    }, [userPersonId, docenteIdFromPta, ptaId, loadCetaps, semanasVinculacion, ptaRules]);

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

  // Recargar programas filtrados si el periodo cambia y ya hay un CETAP por defecto
  useEffect(() => {
    if (defaultCetap && periodo) {
      getCatalogoProgramasCascada(defaultCetap, periodo).then(result => {
        if (result.success) {
          setProgramasPorCetap(prev => ({ ...prev, [defaultCetap]: result.data || [] }));
        }
      }).catch(() => { setProgramasPorCetap(prev => ({ ...prev, [defaultCetap]: [] })); });
    }
  }, [periodo, defaultCetap]);

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
    extActividades.reduce((t, e) => {
      const sectionKey = normalizeExtensionSectionKey(e.seccion);
      const secConfig = extSecciones.find(s => s.key === sectionKey);
      const mult = secConfig?.multiplicador || 1;
      // Siempre calcular desde horas_ejecutadas para evitar inconsistencias
      // cuando horas no fue correctamente multiplicado (race condition con extSecciones)
      const ejec = Number(e.horas_ejecutadas ?? e.horas ?? 0);
      return t + (mult > 1 ? ejec * mult : (Number(e.horas) || 0));
    }, 0),
    [extActividades, extSecciones]
  );

  const hComplementarias = useMemo(() =>
    complementarias.reduce((t, c) => t + (c.horas || 0), 0),
    [complementarias]
  );

  const hAcademicoAdmin = useMemo(() =>
    academicoAdmin.reduce((t, c) => t + (c.horas || 0), 0),
    [academicoAdmin]
  );

  // Catalogos dinamicos segun la configuracion backend.
  // Roles e actividades dinámicos — prioridad: ptaRules (config) > catálogo API
  const rolesParaDropdown: any[] = useMemo(() => {
    if (ptaRules?.inv_roles?.length) return ptaRules.inv_roles.map((r: any) => ({ ...r, horas_max: r.horas_max }));
    return rolesInvestigacion;
  }, [ptaRules, rolesInvestigacion]);

  const actividadesParaDropdown: any[] = useMemo(() => {
    const configured = ptaRules?.inv_actividades?.length
      ? ptaRules.inv_actividades.map((a: any) => ({ ...a, max_horas: a.horas_max }))
      : actInvestigacion;
    return configured.filter((activity: any) => hasConfiguredCatalogHours(activity, horasAProgramar));
  }, [ptaRules, actInvestigacion, horasAProgramar]);

  // Mapa nombre→horas_max para lookup rápido
  const rolesHorasMap = useMemo((): Record<string, number> => {
    const base: Record<string, number> = { ...ROLES_INVESTIGACION_HORAS };
    rolesParaDropdown.forEach((r: any) => { base[r.nombre] = r.horas_max; });
    return base;
  }, [rolesParaDropdown]);

  const hInvestigacion = useMemo(() => {
    // 1. Prioridad: horas del rol en catálogo (si ptaRules/rolesHorasMap ya cargó)
    if (invProyecto.rol && rolesHorasMap[invProyecto.rol]) {
      return rolesHorasMap[invProyecto.rol];
    }
    // 2. Fallback: horas_solicitadas guardadas (al editar un PTA existente antes de que
    //    cargue ptaRules; así el display de tabs muestra el valor correcto de la BD)
    if (invProyecto.horas_solicitadas && Number(invProyecto.horas_solicitadas) > 0) {
      return Number(invProyecto.horas_solicitadas);
    }
    // 3. Último recurso: suma de actividades individuales
    return hInvestigacion_raw;
  }, [hInvestigacion_raw, invProyecto.rol, invProyecto.horas_solicitadas, rolesHorasMap]);

  // La dedicación exclusiva prevalece sobre la bolsa no docente; Docencia mantiene
  // su cálculo independiente y puede producir carga adicional/prorrateo.
  const actividadTotalidadGuardada = academicoAdmin.find(item => {
    const catalog = actAcadAdmin.find((activity: any) => activity.id === item.actividad_id);
    return isFullPTAActivity(catalog || item);
  });
  const actividadTotalidadCatalogo = actividadTotalidadGuardada
    ? actAcadAdmin.find((activity: any) => activity.id === actividadTotalidadGuardada.actividad_id)
    : undefined;
  const actividadTotalidad = actividadTotalidadGuardada
    ? {
        ...actividadTotalidadGuardada,
        nombre: actividadTotalidadCatalogo?.nombre || actividadTotalidadGuardada.nombre,
        horas: horasAProgramar,
        consumeTotalidad: true,
      }
    : undefined;
  const hasFullPTAActivity = Boolean(actividadTotalidad);

  // El 100% reemplaza la bolsa conjunta de Investigación, Extensión y
  // Complementarias. Docencia es independiente y se conserva. La limpieza es
  // deliberada para que no queden formularios parciales ocultos en el borrador.
  useEffect(() => {
    if (!actividadTotalidadGuardada) return;

    setInvProyecto(previous => {
      const alreadyEmpty = !previous.nombre && !previous.codigo && !previous.grupo && !previous.linea &&
        !previous.rol && !previous.horas_solicitadas && !previous.resolucion_nombre &&
        !previous.resolucion_archivo && !previous.resolucion_archivo_url;
      return alreadyEmpty ? previous : {
        nombre: '', codigo: '', grupo: '', linea: '', rol: '', horas_solicitadas: 0,
        fecha_inicio: '', fecha_fin: '', resolucion_nombre: '', resolucion_archivo: null,
        resolucion_archivo_url: '',
      };
    });
    setInvActividades(previous => previous.length > 0 ? [] : previous);
    setExtActividades(previous => previous.length > 0 ? [] : previous);
    setComplementarias(previous => previous.length > 0 ? [] : previous);
    setAcademicoAdmin(previous => {
      const selected = previous.find(item => item.id === actividadTotalidadGuardada.id);
      if (!selected) return previous;
      const catalog = actAcadAdmin.find((activity: any) => activity.id === selected.actividad_id);
      const normalized = {
        ...selected,
        nombre: catalog?.nombre || selected.nombre,
        horas: horasAProgramar,
        consumeTotalidad: true,
      };
      const isAlreadyNormalized = previous.length === 1 &&
        previous[0].id === normalized.id && previous[0].nombre === normalized.nombre &&
        Number(previous[0].horas) === horasAProgramar && previous[0].consumeTotalidad === true;
      return isAlreadyNormalized ? previous : [normalized];
    });
  }, [actividadTotalidadGuardada?.id, actAcadAdmin, horasAProgramar]);

  const docProrr = hDocencia;
  const invProrr = hasFullPTAActivity ? 0 : hInvestigacion;
  const extProrr = hasFullPTAActivity ? 0 : hExtension;
  const compProrr = hasFullPTAActivity ? 0 : hComplementarias;
  const acadProrr = hasFullPTAActivity ? horasAProgramar : hAcademicoAdmin;

  const totalHoras = docProrr + invProrr + extProrr + compProrr + acadProrr;
  const horasRestantes = horasAProgramar - totalHoras;
  const porcentaje = horasAProgramar > 0 ? Math.round((totalHoras / horasAProgramar) * 100) : 0;
  // Horas por encima del límite programable (0 si no hay exceso).
  const horasExceso = Math.max(0, totalHoras - horasAProgramar);

  const hasDocencia = asignaturas.length > 0;

  // Secciones de Complementarias (parametrizables desde config). AADM es una sección.
  const compSecciones = (Array.isArray(ptaRules?.comp_secciones) && ptaRules.comp_secciones.length > 0)
    ? ptaRules.comp_secciones
    : DEFAULT_COMP_SECCIONES;
  // Catálogo de actividades por sección de Complementarias (para el selector de sub-tabs).
  const getCompCatalog = (secKey: string): any[] =>
    secKey === COMP_SECCION_AADM ? actAcadAdmin : actComplementarias;

  // Bloqueo: la resolución y/o adjunto son obligatorios pero no se han llenado
  const invResolucionPendiente = useMemo(() => {
    const faltaResolucion = ptaRules?.inv_resolucion_obligatoria && !invProyecto.resolucion_nombre?.trim();
    const faltaAdjunto = ptaRules?.inv_adjunto_obligatorio && !invProyecto.resolucion_archivo && !invProyecto.resolucion_archivo_url;
    return !!(faltaResolucion || faltaAdjunto);
  }, [ptaRules, invProyecto.resolucion_nombre, invProyecto.resolucion_archivo, invProyecto.resolucion_archivo_url]);

  // Límites excedidos
  // Límite Extensión: mínimo entre absoluto (ej. 200h) y porcentaje (ej. 25%)
  const maxDocenciaLimit = getPositiveRuleNumber(ptaRules?.max_horas_docencia_global ?? ptaRules?.horas_base_carrera_003, 800);
  const maxExtLimit = getConfiguredExtensionLimit(ptaRules, horasAProgramar);
  // Límite Investigación: mínimo entre absoluto global (ej. 400h) y porcentaje por rol
  const maxInvLimit = getPositiveRuleNumber(ptaRules?.max_horas_investigacion_global, 400);
  // Límite Complementarias: mínimo entre el tope absoluto (ej. 200h) y el porcentaje
  // configurado sobre el PTA total (ej. 25% de 800h = 200h). Espejo del flujo de
  // Extensión/AADM: la config expresa el límite como % de las horas del PTA.
  const maxCompLimit = Math.min(
    getPositiveRuleNumber(ptaRules?.max_horas_complementarias_global, 200),
    horasAProgramar * (getPositiveRuleNumber(ptaRules?.max_pct_complementarias, 25) / 100),
  );
  const maxAadmLimit = Math.min(ptaRules?.max_horas_aadm_global ?? 200, horasAProgramar * ((ptaRules?.max_pct_aadm ?? 25) / 100));

  const hCompOrdinary = useMemo(() =>
    complementarias
      .filter(c => !String(c.nombre).toUpperCase().includes('SINDICATO'))
      .reduce((t, c) => t + (c.horas || 0), 0),
    [complementarias]
  );

  // Excedentes: se comparan las horas reales contra el tope máximo del componente.
  // Cada componente usa SU total contra SU tope (dinámico, sin mezclar). Complementarias
  // usa el total (hComplementarias), consistente con el recorte compProrr, para que el
  // aviso de prorrateo dispare igual que en Extensión/Investigación.
  // Excedentes: se comparan las horas reales contra el tope maximo del componente.
  // El tope de Complementarias (config: % o tope absoluto) aplica al COMPONENTE completo,
  // es decir la suma de sus dos secciones (Complementarias a la Docencia + Académico-
  // Administrativas). No se valida cada sección por separado sino su total combinado.
  const hComplementariasComponente = hComplementarias + hAcademicoAdmin;

  const docExcede = !actividadTotalidad && hDocencia > maxDocenciaLimit;
  const invExcede = !actividadTotalidad && hInvestigacion > maxInvLimit;
  const extExcede = !actividadTotalidad && hExtension > maxExtLimit;
  const compExcede = !actividadTotalidad && hComplementariasComponente > maxCompLimit;
  // Sub-tope propio de Académico-Administrativas (independiente del tope del componente).
  const acadExcede = !actividadTotalidad && hAcademicoAdmin > maxAadmLimit;

  const componentLimitViolations = useMemo(() => {
    if (actividadTotalidad) return [];
    const violations: Array<{
      section: 'docencia' | 'investigacion' | 'extension' | 'complementarias' | 'academico_admin';
      label: string;
      hours: number;
      limit: number;
      message: string;
    }> = [];

    const addViolation = (
      section: 'docencia' | 'investigacion' | 'extension' | 'complementarias' | 'academico_admin',
      label: string,
      hours: number,
      limit: number,
    ) => {
      if (hours > limit) {
        violations.push({
          section,
          label,
          hours,
          limit,
          message: `El componente ${label} excede el limite permitido: ${hours}h / ${limit}h.`,
        });
      }
    };

    addViolation('docencia', 'Docencia', hDocencia, maxDocenciaLimit);
    addViolation('investigacion', 'Investigacion', hInvestigacion, maxInvLimit);
    addViolation('extension', 'Extension', hExtension, maxExtLimit);
    addViolation('complementarias', 'Complementarias', hComplementariasComponente, maxCompLimit);
    addViolation('academico_admin', 'Academico-Administrativo', hAcademicoAdmin, maxAadmLimit);

    return violations;
  }, [
    actividadTotalidad,
    hDocencia,
    hInvestigacion,
    hExtension,
    hComplementarias,
    hAcademicoAdmin,
    maxDocenciaLimit,
    maxInvLimit,
    maxExtLimit,
    maxCompLimit,
    maxAadmLimit,
  ]);
  const hasBlockingHourLimits = componentLimitViolations.length > 0;

  // ═══ VALIDACIONES COMPLEMENTARIAS ═════════════════════════════════════
  const compWarnings = useMemo(() => {
    const warns: string[] = [];
    // Valida restricciones propias de cada actividad complementaria.
    complementarias.forEach(comp => {
      if (!comp.actividad_id) return;
      const cat = actComplementarias.find((a: any) => a.id === comp.actividad_id) || comp;
      const error = getConstraintErrorMessage(comp.nombre || cat.nombre || comp.actividad_id, Number(comp.horas || 0), getComplementariaConstraint(cat, ptaRules, horasAProgramar));
      if (error) warns.push(error);
    });
    return warns;
  }, [hCompOrdinary, maxCompLimit, complementarias, actComplementarias, ptaRules, actividadTotalidad, horasAProgramar]);

  // ═══ VALIDACIONES ACADÉMICO ADMINISTRATIVAS ═══════════════════════════
  const acadWarnings = useMemo(() => {
    const warns: string[] = [];
    academicoAdmin.forEach(a => {
      const cat = actAcadAdmin.find((ac: any) => ac.id === a.actividad_id) || a;
      const constraint = getAcademicoAdminConstraint(cat, ptaRules, horasAProgramar);
      const activityHours = isFullPTAActivity(cat) ? horasAProgramar : Number(a.horas || 0);
      const error = getConstraintErrorMessage(cat.nombre || a.nombre || a.actividad_id, activityHours, constraint);
      const isMisiones = cat?.nombre?.includes('Misiones');
      if (error) warns.push(error);
      if ((isFullPTAActivity(cat) || isMisiones) && (!a.descripcion || a.descripcion.trim().length < 3)) {
        warns.push(`La actividad "${cat?.nombre || a.nombre}" requiere obligatoriamente el Número de Acto Administrativo o Comunicación Oficial en el soporte.`);
      }
    });
    if (!actividadTotalidad && hAcademicoAdmin > maxAadmLimit) {
      warns.push(`Las actividades académico-administrativas (${hAcademicoAdmin}h) superan el tope global permitido (${maxAadmLimit}h).`);
    }
    return warns;
  }, [academicoAdmin, actAcadAdmin, ptaRules, horasAProgramar, actividadTotalidad, hAcademicoAdmin, maxAadmLimit]);

  // ═══ VALIDACIONES EXTENSIÓN ═══════════════════════════════════════════
  const extWarnings = useMemo(() => {
    const warns: string[] = [];
    if (hasFullPTAActivity) return warns;
    extActividades.forEach(activity => {
      if (!activity.actividad_id) return;
      const sectionKey = normalizeExtensionSectionKey(activity.seccion);
      const section = extSecciones.find(item => item.key === sectionKey);
      const catalogActivity = (actExtension?.[sectionKey] || [])
        .find((item: any) => item.id === activity.actividad_id);
      if (!catalogActivity) return;
      const effectiveRows = getEffectiveExtensionRows(
        catalogActivity,
        section,
        activity.fila_seleccionada,
        horasAProgramar,
        maxExtLimit,
      );
      if (
        effectiveRows.length > 1
        && effectiveRows.some(row => extensionRowAllowsZero(row, effectiveRows.length))
        && Number(activity.horas || 0) <= 0
      ) {
        warns.push(`Asigna al menos 1h en una de las filas de "${catalogActivity.nombre}".`);
      }
      if (!extensionRequiresRowSelection(
        catalogActivity,
        section,
        horasAProgramar,
        maxExtLimit,
      )) return;
      const rows = getExtensionConfiguredHourRows(catalogActivity, section);
      if (!Number.isInteger(activity.fila_seleccionada)
        || activity.fila_seleccionada! < 0
        || activity.fila_seleccionada! >= rows.length) {
        const columnLabel = getExtensionRowDisplayLabel(section);
        warns.push(`Selecciona una ${columnLabel.toLowerCase()} dentro de "${catalogActivity.nombre}".`);
      }
    });
    return warns;
  }, [
    hasFullPTAActivity,
    extActividades,
    extSecciones,
    actExtension,
    horasAProgramar,
    maxExtLimit,
  ]);

  const firstExtensionWarningSection = useMemo(() => {
    const firstWarning = extWarnings[0];
    if (!firstWarning) return undefined;

    const matchingActivity = extActividades.find(activity => {
      const sectionKey = normalizeExtensionSectionKey(activity.seccion);
      const catalogActivity = (actExtension?.[sectionKey] || [])
        .find((item: any) => item.id === activity.actividad_id);
      return catalogActivity?.nombre && firstWarning.includes(`"${catalogActivity.nombre}"`);
    });
    return matchingActivity
      ? normalizeExtensionSectionKey(matchingActivity.seccion)
      : undefined;
  }, [extWarnings, extActividades, actExtension]);

  // ═══ VALIDACIONES INVESTIGACIÓN (Circular 003 - Tablas 3 y 4) ═══════════
  const invWarnings = useMemo(() => {
    const warns: string[] = [];
    const rolProyecto = (invProyecto.rol || '').toUpperCase();
    const horasProyecto = hInvestigacion;

    // Validaciones documentales propias de investigacion.

    // REGLA 3: omitida — cuando el docente llena el proyecto, las actividades son
    // de libre registro (nombre + horas) y no aplica restricción de fomento.

    // REGLA 4: Resolución obligatoria (configurable desde Configuración de Reglas)
    if (horasProyecto > 0 && invProyecto.nombre) {
      if (ptaRules?.inv_resolucion_obligatoria && !invProyecto.resolucion_nombre?.trim()) {
        warns.push('La resolución que respalda la investigación es obligatoria. Ingresa el N° o nombre de la resolución.');
      }
      if (ptaRules?.inv_adjunto_obligatorio && !invProyecto.resolucion_archivo && !invProyecto.resolucion_archivo_url) {
        warns.push('El archivo adjunto de la resolución es obligatorio. Carga el documento de soporte (PDF, DOC).');
      }
    }

    return warns;
  }, [invProyecto, invActividades, horasAProgramar, tipoVinculacion, ptaRules, hInvestigacion, hExtension]);

  // ═══ HANDLERS: DOCENCIA ═══════════════════════════════════════════

  const handleAddAsignatura = () => {
    if (asignaturas.length >= 10) {
      toast.error('Máximo 10 asignaturas por PTA');
      return;
    }
    setAsignaturas(prev => [{
      id: Date.now(),
      territorial_id: '',
      cetap_id: '',
      programa_id: '',
      asignatura_id: '', asignatura_nombre: '', nucleo_tematico: '',
      creditos: 3, semestre: 1, total_estudiantes: 25,
      horas_base: 0, total_horas: 0, porcentaje_pta: 0, observaciones: '',
      modalidad: 'PRESENCIAL', fecha_inicio: '', fecha_fin: '', _showObs: false,
    }, ...prev]);
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
      // Reset downstream on CETAP change + cargar programas filtrados por CETAP
      if (field === 'cetap_id') {
        updated.programa_id = '';
        updated.asignatura_id = '';
        updated.asignatura_nombre = '';
        if (value && !programasPorCetap[value]) {
          // Cargar programas del CETAP desde Programas Académicos
          getCatalogoProgramasCascada(value, periodo).then(result => {
            if (result.success && result.data.length > 0) {
              setProgramasPorCetap(prev => ({ ...prev, [value]: result.data }));
            } else {
              // Fallback: marcar que se cargó pero sin resultados específicos → usar todos (o ninguno si es estricto)
              setProgramasPorCetap(prev => ({ ...prev, [value]: [] }));
            }
          }).catch(() => {
            setProgramasPorCetap(prev => ({ ...prev, [value]: [] }));
          });
        }
      }
      // On programa change
      if (field === 'programa_id') {
        updated.asignatura_id = '';
        updated.asignatura_nombre = '';
        // La cantidad de estudiantes NO es editable en el PTA: se rellena
        // automáticamente con los cupos configurados en "Programas Académicos"
        // para la combinación (CETAP, Programa). Es la fuente única y dinámica.
        const cetapForOferta = updated.cetap_id;
        if (value && cetapForOferta) {
          getOfertaCetap(String(cetapForOferta), String(value), periodo)
            .then(res => {
              const cupos = Number(res?.data?.cupos_estimados);
              if (Number.isFinite(cupos) && cupos > 0) {
                setAsignaturas(prev =>
                  prev.map(x =>
                    x.id === id ? { ...x, total_estudiantes: cupos } : x,
                  ),
                );
              }
            })
            .catch(() => {
              /* silencioso: si no hay oferta se conserva el valor actual */
            });
        }
      }
      // On asignatura selection - auto-fill fields + calculate hours
      if (field === 'asignatura_id' && value) {
        const asigCat = asignaturasCat.find(ac => ac.id === value);
        if (asigCat) {
          updated.asignatura_nombre = asigCat.nombre;
          updated.nucleo_tematico = asigCat.nucleo || '';
          updated.creditos = asigCat.creditos || 3;
          updated.semestre = asigCat.semestre || 1;
            // Map the modality from catalog to PTA Form format
            const rawMod = String(asigCat.modalidad || '').toLowerCase();
            let mappedMod = 'PRESENCIAL';
            if (rawMod.includes('virtual')) mappedMod = 'VIRTUAL';
            else if (rawMod.includes('mixta')) mappedMod = 'MIXTA';
            updated.modalidad = mappedMod;
          // Calcular horas: base y multiplicador salen SIEMPRE de la config (ptaRules); el
          // programa solo se usa para categorizar (nivel + Sede Central vs Territorial).
          const prog = programas.find(p => p.id === updated.programa_id);
          updated.horas_base = calcHorasBase(asigCat, prog, ptaRules);
          updated.total_horas = calcTotalHoras(asigCat, updated.horas_base, ptaRules, prog);
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
    if (hasFullPTAActivity) return;
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
      resolucion_nombre: '', resolucion_archivo: null, resolucion_archivo_url: '',
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
    if (hasFullPTAActivity) return;
    const normalizedSection = normalizeExtensionSectionKey(seccion);
    const sectionConfig = extSecciones.find(section => section.key === normalizedSection);
    const hasConfiguredOptions = (actExtension?.[normalizedSection] || [])
      .some((activity: any) => hasExtensionConfiguredHours(activity, sectionConfig, horasAProgramar));
    if (!hasConfiguredOptions) {
      toast.info('Esta sección todavía no tiene actividades con horas configuradas.');
      return;
    }
    setExtActividades(prev => [...prev, {
      id: Date.now(), seccion: normalizedSection, actividad_id: '', nombre: '', horas: 0, horas_ejecutadas: 0, descripcion: '', fecha_inicio: '', fecha_fin: '',
    }]);
  };

  const handleExtActChange = (id: number, field: string, value: any) => {
    setExtActividades(prev => prev.map(e => {
      if (e.id !== id) return e;

      // Clave de sección canónica (maneja alias legacy, ej. laboratorio_innovacion → fortalecimiento).
      // Debe definirse aquí: se usa más abajo para leer el catálogo y guardar la sección.
      const sectionKey = normalizeExtensionSectionKey(e.seccion);

      const otherSum = prev.filter(x => x.id !== id).reduce((sum, x) => sum + (x.horas || 0), 0);
      const cupoExt = Math.max(0, maxExtLimit - otherSum);
      // El tope del PTA total es informativo (ya hay advertencia "Excede").
      // Aqui solo respetamos el tope de extensión para no bloquear el ingreso de actividades.
      const remainingLimit = cupoExt;

      // Multiplicador dinámico desde configuración de la sección
      const secConfig = extSecciones.find(s => s.key === sectionKey);
      const mult = (secConfig?.multiplicador && secConfig.multiplicador > 1) ? secConfig.multiplicador : 1;
      const tieneMultiplicador = mult > 1;

      const updated = { ...e, seccion: sectionKey, [field]: value };
      
      if (field === 'actividad_id') {
        const cat = (actExtension?.[sectionKey] || []).find((c: any) => c.id === value);
        if (cat) {
          updated.nombre = cat.nombre;
          updated.fila_seleccionada = undefined;
          updated.fila_seleccionada_nombre = undefined;
          updated.fila_seleccionada_etiqueta = undefined;
          updated.fila_seleccionada_detalles = undefined;
          // La estructura de columnas de la sección manda. `items: []` puede ser
          // solo un vestigio del modelo de edición y no implica que existan filas.
          const configuredRows = getExtensionConfiguredHourRows(cat, secConfig);
          if (extensionActivityUsesItems(secConfig, cat) && configuredRows.length > 0) {
            const requiresRowSelection = extensionRequiresRowSelection(
              cat,
              secConfig,
              horasAProgramar,
              maxExtLimit,
            );
            const initialState = getInitialExtensionRowsState(
              requiresRowSelection ? [] : configuredRows,
              horasAProgramar,
            );
            updated.items_cantidades = initialState.items_cantidades;
            updated.horas_ejecutadas = initialState.total;
            updated.horas = initialState.total;
          } else {
            // Tabla simple de columna raíz: las horas viven directamente en el bloque.
            const rootType = getRootActivityHourType(cat);
            const maxPta = rootType === 'porcentaje'
              ? getPercentageHours(cat, horasAProgramar)
              : Math.max(1, Number(cat.max_horas) || 1);
            const minPta = rootType === 'intervalo'
              ? Math.min(maxPta, Math.max(1, Number(cat.min_horas) || 1))
              : (rootType === 'fija' ? maxPta : 1);
            let valHoras = rootType === 'intervalo' ? minPta : maxPta;
            let valEjec = tieneMultiplicador ? valHoras / mult : valHoras;
            
            if (valHoras > remainingLimit && rootType !== 'porcentaje') {
              valHoras = remainingLimit;
              valEjec = tieneMultiplicador ? valHoras / mult : valHoras;
            }
            
            if (valHoras < 1 && remainingLimit >= 1) {
               valHoras = 1;
               valEjec = tieneMultiplicador ? 1 / mult : 1;
            }
            
            updated.horas_ejecutadas = valEjec;
            updated.horas = valHoras;
            updated.items_cantidades = undefined;
          }
        }
      }

      if (field === 'fila_seleccionada') {
        const cat = (actExtension?.[sectionKey] || []).find((c: any) => c.id === updated.actividad_id);
        const selectedRow = value === '' || value === null || value === undefined
          ? undefined
          : Number(value);
        updated.fila_seleccionada = Number.isInteger(selectedRow) ? selectedRow : undefined;
        const selectedRows = cat
          ? getEffectiveExtensionRows(cat, secConfig, updated.fila_seleccionada, horasAProgramar, maxExtLimit)
          : [];
        Object.assign(updated, getExtensionRowSnapshot(selectedRows[0], secConfig));
        const initialState = getInitialExtensionRowsState(selectedRows, horasAProgramar);
        updated.items_cantidades = selectedRows.length > 0 ? initialState.items_cantidades : undefined;
        updated.horas_ejecutadas = initialState.total;
        updated.horas = initialState.total;
      }

      if (field === 'horas_ejecutadas') {
        let val = Number(value) || 0;
        if (val < 1 && value !== '') val = 1; // Ni negativos ni 0
        
        const cat = (actExtension?.[updated.seccion] || []).find((c: any) => c.id === updated.actividad_id);
        const defaultMaxPta = cat && getRootActivityHourType(cat) === 'porcentaje'
          ? getPercentageHours(cat, horasAProgramar)
          : (cat?.max_horas || 0);
        const defaultMax = cat
          ? (tieneMultiplicador ? defaultMaxPta / mult : defaultMaxPta)
          : 0;
        const rootType = getRootActivityHourType(cat);
        const defaultMin = cat
          ? (tieneMultiplicador ? (cat.min_horas || 1) / mult : (cat.min_horas || 1))
          : 1;
        
        if (defaultMax > 0 && val > defaultMax) {
          val = defaultMax; // No mayor al default del catálogo
        }
        if ((rootType === 'fija' || rootType === 'porcentaje') && defaultMax > 0) val = defaultMax;
        if (rootType === 'intervalo' && value !== '' && val < defaultMin) val = defaultMin;
        
        let valHoras = tieneMultiplicador ? val * mult : val;
        
        if (valHoras > remainingLimit && rootType !== 'porcentaje') {
          valHoras = remainingLimit;
          val = tieneMultiplicador ? valHoras / mult : valHoras;
        }
        
        updated.horas_ejecutadas = val;
        updated.horas = valHoras;
      }
      
      // Retrocompatibilidad si el input cambia 'horas' directamente (secciones sin multiplicador)
      if (field === 'horas' && !tieneMultiplicador) {
        let val = Number(value) || 0;
        if (val < 1 && value !== '') val = 1; // Ni negativos ni 0
        
        const cat = (actExtension?.[updated.seccion] || []).find((c: any) => c.id === updated.actividad_id);
        const defaultMax = cat
          ? (getRootActivityHourType(cat) === 'porcentaje' ? getPercentageHours(cat, horasAProgramar) : (cat.max_horas || 0))
          : 0;
        const rootType = getRootActivityHourType(cat);
        const defaultMin = cat ? (cat.min_horas || 1) : 1;
        
        if (defaultMax > 0 && val > defaultMax) {
          val = defaultMax; // No mayor al default del catálogo
        }
        if ((rootType === 'fija' || rootType === 'porcentaje') && defaultMax > 0) val = defaultMax;
        if (rootType === 'intervalo' && value !== '' && val < defaultMin) val = defaultMin;
        
        if (val > remainingLimit && rootType !== 'porcentaje') {
          val = remainingLimit; // No superar lo permitido
        }
        
        updated.horas = val;
        updated.horas_ejecutadas = val;
      }
      
      return updated;
    }));
  };

  // Actualiza la cantidad / valor de un ítem dentro de una etapa de extensión
  const handleExtItemQtyChange = (extId: number, itemIdx: number, val: number) => {
    setExtActividades(prev => prev.map(e => {
      if (e.id !== extId) return e;
      const sectionKey = normalizeExtensionSectionKey(e.seccion);
      const baseAct = sectionKey === e.seccion ? e : { ...e, seccion: sectionKey };
      const cat = (actExtension?.[sectionKey] || []).find((c: any) => c.id === baseAct.actividad_id);
      const section = extSecciones.find(item => item.key === sectionKey);
      const configuredRows = cat
        ? getEffectiveExtensionRows(
            cat,
            section,
            baseAct.fila_seleccionada,
            horasAProgramar,
            maxExtLimit,
          )
        : [];
      if (!cat || configuredRows.length === 0) return baseAct;
      
      const item = configuredRows[itemIdx];
      const itemTipo = (item.tipo || 'fija').toLowerCase();
      if (itemTipo === 'porcentaje') return baseAct;
      const untilMinimum = extensionRowAllowsZero(item, configuredRows.length) ? 0 : 1;
      let cleanedVal = Math.max(
        itemTipo === 'intervalo' ? (item.min ?? 1) : (itemTipo === 'hasta' ? untilMinimum : 0),
        val,
      );
      if (itemTipo === 'hasta' || itemTipo === 'intervalo') {
        cleanedVal = Math.min(item.horas || 0, cleanedVal);
      }
      
      const newCantidades = { ...(baseAct.items_cantidades || {}), [itemIdx]: cleanedVal };
      const totalHoras = configuredRows.reduce((sum: number, it: any, i: number) => {
        const tipo = (it.tipo || 'fija').toLowerCase();
        if (tipo === 'fija') return sum + (it.horas || 0);
        if (tipo === 'porcentaje') return sum + getPercentageHours(it, horasAProgramar);
        if (tipo === 'hasta' || tipo === 'intervalo') return sum + (newCantidades[i] || 0);
        const qty = newCantidades[i] || 0;
        return sum + (qty * (it.horas || 0));
      }, 0);
      return { ...baseAct, items_cantidades: newCantidades, horas: totalHoras, horas_ejecutadas: totalHoras };
    }));
  };

  // ═══ HANDLERS: COMPLEMENTARIAS ═════════════════════════════════════

  const handleAddComplementaria = () => {
    if (hasFullPTAActivity) return;
    if (maxCompLimit - hComplementarias - hAcademicoAdmin <= 0) {
      toast.info('La bolsa de Complementarias ya no tiene horas disponibles.');
      return;
    }
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
          const otherOrdinarySum = prev
            .filter(x => x.id !== id && !String(x.nombre).toUpperCase().includes('SINDICATO'))
            .reduce((sum, x) => sum + (x.horas || 0), 0);
          const remainingLimit = isSindicato
            ? Infinity
            : Math.max(0, maxCompLimit - hAcademicoAdmin - otherOrdinarySum);
          const trueRemainingLimit = remainingLimit;
          const constraint = getComplementariaConstraint(cat, ptaRules, horasAProgramar);
          const suggestedHours = getInitialConstraintValue(constraint);
          const rowsState = reconcileRecognitionRows(cat, horasAProgramar);

          updated.nombre = cat.nombre;
          updated.items_cantidades = rowsState?.items_cantidades;
          updated.filas_cantidades = rowsState?.filas_cantidades;
          updated.horas = rowsState?.total ?? (
            constraint.editable && canSelectWithRemaining(constraint, trueRemainingLimit)
              ? Math.min(suggestedHours, trueRemainingLimit)
              : suggestedHours
          );
        } else {
          updated.nombre = '';
          updated.horas = 0;
          updated.items_cantidades = undefined;
          updated.filas_cantidades = undefined;
        }
      }
      if (field === 'horas') {
        const cat = actComplementarias.find(ac => ac.id === updated.actividad_id);
        if (cat) {
          const constraint = getComplementariaConstraint(cat, ptaRules, horasAProgramar);
          const isSindicato = String(cat.nombre).toUpperCase().includes('SINDICATO');
          const otherOrdinarySum = prev
            .filter(x => x.id !== id && !String(x.nombre).toUpperCase().includes('SINDICATO'))
            .reduce((sum, x) => sum + (x.horas || 0), 0);
          const remainingLimit = isSindicato
            ? Infinity
            : Math.max(0, maxCompLimit - hAcademicoAdmin - otherOrdinarySum);
          const trueRemainingLimit = remainingLimit;
          const boundedConstraint = constraint.editable && canSelectWithRemaining(constraint, trueRemainingLimit)
            ? { ...constraint, max: Math.min(constraint.max, trueRemainingLimit) }
            : constraint;

          updated.horas = clampConstraintValue(value, boundedConstraint);
        }
      }
      return updated;
    }));
  };

  const handleCompRowHoursChange = (id: number, rowIndex: number, value: any) => {
    setComplementarias(previous => previous.map(item => {
      if (item.id !== id) return item;
      const catalog = actComplementarias.find((activity: any) => activity.id === item.actividad_id);
      const rows = getConfiguredRecognitionRows(catalog, horasAProgramar);
      const row = rows[rowIndex];
      const constraint = getRecognitionRowConstraint(row, rows.length, horasAProgramar);
      if (!row || !constraint) return item;

      const reconciled = reconcileRecognitionRows(
        catalog,
        horasAProgramar,
        item.horas,
        item.filas_cantidades,
        item.items_cantidades,
      );
      if (!reconciled) return item;
      const nextValue = clampConstraintValue(value, constraint);
      reconciled.items_cantidades[rowIndex] = nextValue;
      reconciled.filas_cantidades[getRecognitionRowKey(row, rowIndex)] = nextValue;
      reconciled.total = Object.values(reconciled.items_cantidades)
        .reduce((sum, hours) => sum + (Number(hours) || 0), 0);
      return {
        ...item,
        horas: reconciled.total,
        items_cantidades: reconciled.items_cantidades,
        filas_cantidades: reconciled.filas_cantidades,
      };
    }));
  };

  // ═══ HANDLERS: ACADEMICO ADMINISTRATIVO ═══════════════════════════

  const handleAddAcademicoAdmin = () => {
    if (hasFullPTAActivity) return;
    if (Math.min(
      maxAadmLimit - hAcademicoAdmin,
      maxCompLimit - hComplementarias - hAcademicoAdmin,
    ) <= 0) {
      toast.info('La bolsa de Complementarias ya no tiene horas disponibles.');
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
      const otherAcadSum = prev
        .filter(x => x.id !== id)
        .reduce((sum, x) => sum + (x.horas || 0), 0);
      const acadRemainingLimit = Math.max(0, Math.min(
        maxAadmLimit - otherAcadSum,
        maxCompLimit - hComplementarias - otherAcadSum,
      ));
      if (field === 'actividad_id') {
        const cat = actAcadAdmin.find((ac: any) => ac.id === value);
        if (cat) {
          const constraint = getAcademicoAdminConstraint(cat, ptaRules, horasAProgramar);
          const suggestedHours = getInitialConstraintValue(constraint);
          const consumesFullPTA = isFullPTAActivity(cat);
          const rowsState = reconcileRecognitionRows(cat, horasAProgramar);

          updated.nombre = cat.nombre;
          updated.consumeTotalidad = consumesFullPTA;
          updated.items_cantidades = rowsState?.items_cantidades;
          updated.filas_cantidades = rowsState?.filas_cantidades;
          updated.horas = rowsState?.total ?? (
            constraint.editable && canSelectWithRemaining(constraint, acadRemainingLimit)
              ? Math.min(suggestedHours, acadRemainingLimit)
              : suggestedHours
          );
          // No se eliminan datos de las demás secciones: mientras esta actividad esté
          // seleccionada, su dedicación exclusiva prevalece en el total efectivo.
        } else {
          updated.nombre = '';
          updated.horas = 0;
          updated.consumeTotalidad = false;
          updated.items_cantidades = undefined;
          updated.filas_cantidades = undefined;
        }
      }
      if (field === 'horas') {
        const cat = actAcadAdmin.find((ac: any) => ac.id === updated.actividad_id);
        if (cat) {
          const constraint = getAcademicoAdminConstraint(cat, ptaRules, horasAProgramar);
          const boundedConstraint = constraint.editable && canSelectWithRemaining(constraint, acadRemainingLimit)
            ? { ...constraint, max: Math.min(constraint.max, acadRemainingLimit) }
            : constraint;

          updated.horas = clampConstraintValue(value, boundedConstraint);
        }
      }
      return updated;
    }));
  };

  const handleAcadRowHoursChange = (id: number, rowIndex: number, value: any) => {
    setAcademicoAdmin(previous => previous.map(item => {
      if (item.id !== id) return item;
      const catalog = actAcadAdmin.find((activity: any) => activity.id === item.actividad_id);
      const rows = getConfiguredRecognitionRows(catalog, horasAProgramar);
      const row = rows[rowIndex];
      const constraint = getRecognitionRowConstraint(row, rows.length, horasAProgramar);
      if (!row || !constraint) return item;

      const reconciled = reconcileRecognitionRows(
        catalog,
        horasAProgramar,
        item.horas,
        item.filas_cantidades,
        item.items_cantidades,
      );
      if (!reconciled) return item;
      const nextValue = clampConstraintValue(value, constraint);
      reconciled.items_cantidades[rowIndex] = nextValue;
      reconciled.filas_cantidades[getRecognitionRowKey(row, rowIndex)] = nextValue;
      reconciled.total = Object.values(reconciled.items_cantidades)
        .reduce((sum, hours) => sum + (Number(hours) || 0), 0);
      return {
        ...item,
        horas: reconciled.total,
        items_cantidades: reconciled.items_cantidades,
        filas_cantidades: reconciled.filas_cantidades,
      };
    }));
  };

  // ═══ SAVE / SUBMIT ════════════════════════════════════════════════

  const validarAsignaturasParaEnvio = useCallback((asignaturasParaValidar = asignaturas.filter(a => a.asignatura_id && a.asignatura_id !== '')) => {
    for (const [idx, asig] of asignaturasParaValidar.entries()) {
      const label = asig.asignatura_nombre ? `"${asig.asignatura_nombre}"` : `Asignatura ${idx + 1}`;
      if (!(asig.territorial_id || defaultTerritorial)) {
        toast.error(`Completa la territorial de ${label}.`);
        setActiveSection('docencia');
        return false;
      }
      if (!asig.programa_id) {
        toast.error(`Completa el programa de ${label}.`);
        setActiveSection('docencia');
        return false;
      }
      if (!asig.fecha_inicio || !asig.fecha_fin) {
        toast.error(`Completa las fechas de inicio y fin de ${label}.`);
        setActiveSection('docencia');
        return false;
      }
      const inicio = new Date(`${asig.fecha_inicio}T00:00:00`);
      const fin = new Date(`${asig.fecha_fin}T00:00:00`);
      if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime()) || fin < inicio) {
        toast.error(`El rango de fechas de ${label} no es válido.`);
        setActiveSection('docencia');
        return false;
      }
      if (!Number.isFinite(Number(asig.total_horas)) || Number(asig.total_horas) <= 0) {
        toast.error(`La asignatura ${label} no tiene horas calculadas. Revisa programa y asignatura.`);
        setActiveSection('docencia');
        return false;
      }
      if (!Number.isFinite(Number(asig.total_estudiantes)) || Number(asig.total_estudiantes) < 1) {
        toast.error(`Registra al menos un estudiante en ${label}.`);
        setActiveSection('docencia');
        return false;
      }
    }
    return true;
  }, [asignaturas, defaultTerritorial]);

  const validarComposicionParaEnvio = useCallback(() => {
    const tieneTotalidad = hasFullPTAActivity;
    if (tieneTotalidad) return true;

    if (hComplementarias <= 0) {
      toast.error('El PTA debe incluir actividades complementarias a la docencia antes de enviarse.');
      setActiveSection('complementarias');
      return false;
    }

    if (hInvestigacion <= 0 && hExtension <= 0) {
      toast.error('El PTA debe incluir al menos una función misional adicional: Investigación o Extensión.');
      setActiveSection('investigacion');
      return false;
    }

    return true;
  }, [hasFullPTAActivity, hComplementarias, hInvestigacion, hExtension]);

  const handleSave = async (enviar = false, silent = false) => {
    setSaving(true);
    savingRef.current = true;
    if (!silent) { autoSaveCountdownRef.current = 120; setAutoSaveCountdown(120); }

    // Validación mínima docencia: al menos 1 asignatura con catálogo seleccionado
    const _tieneTotalidad = hasFullPTAActivity;
    const _asignaturasValidas = asignaturas.filter(a => a.asignatura_id && a.asignatura_id !== '');
    if (enviar && !_tieneTotalidad && _asignaturasValidas.length === 0) {
      toast.error(asignaturas.length > 0
        ? 'Las filas de docencia no tienen asignatura seleccionada del catálogo. Completa la selección antes de enviar.'
        : 'Debe incluir al menos una asignatura de docencia.');
      setSaving(false);
      return;
    }

    // Validación: al menos una asignatura con mínimo 3 créditos
    if (enviar && !_tieneTotalidad && !_asignaturasValidas.some(a => (a.creditos || 0) >= 3)) {
      toast.error('Debe incluir al menos una asignatura de mínimo 3 créditos para poder enviar el PTA.');
      setSaving(false);
      return;
    }

    if (enviar && !validarComposicionParaEnvio()) {
      setSaving(false);
      return;
    }

    // Validación de solapamiento de fechas en Docencia
    if ((!isComponentRestricted || canEditFormSection('docencia')) && docenciaOverlapWarnings.length > 0) {
      toast.error(docenciaOverlapWarnings[0]);
      setSaving(false);
      return;
    }

    // Bloqueo por topes individuales de componente, no por suma global del PTA.
    if (enviar && hasBlockingHourLimits) {
      const firstViolation = componentLimitViolations[0];
      toast.error(firstViolation?.message || 'Hay componentes que exceden el limite permitido de horas.');
      if (firstViolation?.section) setActiveSection(firstViolation.section);
      setSaving(false);
      return;
    }

    // Validación: si se seleccionó rol en investigación, los campos del proyecto son obligatorios
    if (enviar && (!isComponentRestricted || canEditFormSection('investigacion')) && invProyecto.rol) {
      const faltantes: string[] = [];
      if (!invProyecto.nombre?.trim()) faltantes.push('nombre del proyecto');
      if (!invProyecto.codigo?.trim()) faltantes.push('código del proyecto');
      if (!invProyecto.grupo?.trim()) faltantes.push('grupo de investigación');
      if (!invProyecto.linea?.trim()) faltantes.push('línea de investigación');
      if (faltantes.length > 0) {
        toast.error(`Completa la sección Investigación: ${faltantes.join(', ')}.`);
        setActiveSection('investigacion');
        setSaving(false);
        return;
      }
    }

    // Validación de reglas de negocio para Investigación
    if (enviar && (!isComponentRestricted || canEditFormSection('investigacion')) && invWarnings && invWarnings.length > 0) {
      toast.error(getSectionValidationToast('Investigación', invWarnings));
      setActiveSection('investigacion');
      setSaving(false);
      return;
    }

    // Validación de reglas de negocio para Extensión
    if (enviar && (!isComponentRestricted || canEditFormSection('extension')) && extWarnings && extWarnings.length > 0) {
      toast.error(getSectionValidationToast('Extensión', extWarnings));
      setActiveSection('extension');
      if (firstExtensionWarningSection) setExtSubseccion(firstExtensionWarningSection);
      setSaving(false);
      return;
    }

    // Validación de reglas de negocio para Complementarias
    if (enviar && (!isComponentRestricted || canEditFormSection('complementarias')) && compWarnings && compWarnings.length > 0) {
      toast.error(getSectionValidationToast('Actividades Complementarias', compWarnings));
      setActiveSection('complementarias');
      setComplementariasSubseccion(COMP_SECCION_DOCENCIA);
      setSaving(false);
      return;
    }

    // Validación de reglas de negocio para Académico-Administrativas (sub-sección de Complementarias)
    if (enviar && (!isComponentRestricted || canEditFormSection('complementarias')) && acadWarnings && acadWarnings.length > 0) {
      toast.error(getSectionValidationToast('Actividades Académico-Administrativas', acadWarnings));
      setActiveSection('complementarias');
      setComplementariasSubseccion(COMP_SECCION_AADM);
      setSaving(false);
      return;
    }

    // "Concertar": editar y guardar como revisor/admin equivale a devolver al docente
    // el/los componente(s) seleccionados — se exige el comentario que verá el docente.
    if (isAdminEdit && currentPtaId && !comentarioConcertacion.trim()) {
      toast.error('Debe ingresar un comentario para el docente antes de guardar.');
      setSaving(false);
      return;
    }
    // Sin restricción de permiso y con más de un componente disponible: exige elegir
    // explícitamente cuáles se devuelven (no se adivina por la pestaña abierta).
    if (isAdminEdit && currentPtaId && !isAdminComponentRestricted && adminEditableComponentKeysNow.length > 1
      && componentesSeleccionadosDevolver.length === 0) {
      toast.error('Selecciona qué componente(s) estás devolviendo.');
      setSaving(false);
      return;
    }

    const isReenvio = originalEstado === 'Devuelto' && enviar;
    if (enviar && esDevolucionComponentes && !respuestasDevolucionCompletas) {
      toast.error('Debes explicar tu respuesta para cada componente devuelto antes de reenviar.');
      setSaving(false);
      savingRef.current = false;
      return;
    }

    // Componente(s) a devolver cuando el revisor no tiene permiso restringido: la
    // selección explícita del admin, o el único componente disponible si no hay
    // ambigüedad.
    const componentesConcertacionSeleccionados = isAdminEdit && !isAdminComponentRestricted
      ? (adminEditableComponentKeysNow.length <= 1 ? adminEditableComponentKeysNow : componentesSeleccionadosDevolver)
      : [];

    const payload = {
      id: currentPtaId || undefined,
      docente_id: isAdminEdit ? (docenteIdFromPta || userPersonId) : (userPersonId || docenteIdFromPta),
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
      _allowed_component_keys: isAdminComponentRestricted ? adminAllowedComponentKeys : undefined,
      _comentario_concertacion: isAdminEdit ? (comentarioConcertacion.trim() || undefined) : undefined,
      _concertacion_actor_id: isAdminEdit ? concertacionActorId : undefined,
      _concertacion_actor_nombre: isAdminEdit ? concertacionActorNombre : undefined,
      _concertacion_componentes: componentesConcertacionSeleccionados,
      asignaturas: asignaturas.filter(a => a.asignatura_id && a.asignatura_id !== ''),
      // Guardar si hay cualquier campo significativo (rol, nombre, código, horas)
      // Antes sólo se guardaba si había nombre → perdiendo datos cuando solo había rol.
      investigacion_proyecto: (invProyecto.nombre || invProyecto.rol || invProyecto.codigo || invProyecto.horas_solicitadas)
        ? { ...invProyecto, horas_solicitadas: invProyecto.rol ? hInvestigacion : 0 }
        : null,  // null explícito → backend borra los datos anteriores
      investigacion_actividades: invActividades.filter(a => (a.actividad_id && a.actividad_id !== '') || (a.nombre && a.horas_total > 0)),
      extension_actividades: extActividades.filter(e => (e.actividad_id && e.actividad_id !== '') || (e.seccion && (e.horas > 0 || (e.horas_ejecutadas ?? 0) > 0))),
      // Complementarias unificado: UN SOLO array con tag de sección. NO se envía el alias
      // legacy academico_admin (evita duplicados al recargar; el backend lee las secciones
      // desde complementarias).
      complementarias: [
        ...complementarias
          .filter(c => (c.actividad_id && c.actividad_id !== '') || (c.nombre && c.horas > 0))
          .map(c => ({ ...c, seccion: COMP_SECCION_DOCENCIA })),
        ...academicoAdmin
          .filter(c => (c.actividad_id && c.actividad_id !== '') || (c.nombre && c.horas > 0))
          .map(c => {
            const catalog = actAcadAdmin.find((activity: any) => activity.id === c.actividad_id);
            const consumesFullPTA = isFullPTAActivity(catalog || c);
            return {
              ...c,
              nombre: catalog?.nombre || c.nombre,
              horas: consumesFullPTA ? horasAProgramar : c.horas,
              consumeTotalidad: consumesFullPTA,
              seccion: COMP_SECCION_AADM,
            };
          }),
      ],
      // Se envía vacío explícito para que el backend borre cualquier academico_admin previo.
      academico_admin: [],
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
      const savedId = res.data?.id || res.id || currentPtaId;
      if (savedId) setCurrentPtaId(savedId);

      // Modo admin: solo guardar y volver al panel
      if (isAdminEdit) {
        toast.success('Cambios guardados correctamente.');
        onBack();
        return;
      }

      if (enviar || isReenvio) {
        if (!savedId) {
          toast.error('No se pudo obtener el ID del PTA guardado. Intenta de nuevo.');
          return;
        }
        const { updatePTAStatus } = await import('../../../services/api/ptaApi');
        if (isEnRevisionDocente) {
          // Revisión docente: re-enviar corregido al nivel que lo devolvió. Si es una
          // devolución por componente, se adjunta la respuesta del docente para que el
          // revisor la vea junto a su comentario original al volver a concertar.
          const reenvio = await updatePTAStatus(savedId, {
            accion: 'reenviar_corregido',
            comentario_docente: esDevolucionComponentes ? resumenRespuestasDevolucion : undefined,
            respuestas_docente_componentes: esDevolucionComponentes ? respuestasDocentePorComponente : undefined,
          });
          if (reenvio.success) {
            toast.success(`PTA re-enviado (v${reenvio.version}) → ${reenvio.nuevoEstado}`);
            addNotification({ type: 'success', title: 'Re-envío exitoso', message: `Tu PTA versión ${reenvio.version} fue enviado a ${reenvio.nuevoEstado}` });
            onBack();
          } else {
            toast.error(reenvio.message || 'Error al re-enviar el PTA');
          }
        } else {
          // Flujo normal Borrador -> Pendiente Jefatura (inicio del circuito oficial por roles)
          const envio = await updatePTAStatus(savedId, { estado: 'Pendiente Jefatura' });
          if (envio.success) {
            toast.success('PTA enviado a aprobación');
            addNotification({ type: 'success', title: 'PTA enviado', message: 'Tu PTA fue enviado exitosamente a aprobación' });
            if (envio.faltaRevisor) {
              toast.warning('Aviso: no hay evaluadores asignados para tu territorial. La revisión podría demorar.', { duration: 8000 });
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
    setFirmaVerificationId('');
    setFirmaCorreoDestino('');
    if (currentPtaId) guardarFirmaDigitalPTA(currentPtaId, {
      hash: firmaData.hash,
      firmado_por: firmaData.firmante || userPersonId || docenteIdFromPta,
      firmado_por_nombre: firmaData.firmante || docenteName,
      firmado_por_rol: firmaData.cargo || 'Docente',
      certificado: firmaData.certificado_id,
      metadata: { timestamp: firmaData.timestamp, pin_verificado: firmaData.pin_verificado },
    }).catch(() => { });

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

  const validateEnvioDocente = useCallback(() => {
    const tieneTotalidad = hasFullPTAActivity;

    const asignaturasValidas = asignaturas.filter(a => a.asignatura_id && a.asignatura_id !== '');
    if (!tieneTotalidad && asignaturasValidas.length === 0) {
      toast.error(asignaturas.length > 0
        ? 'Las filas de docencia no tienen asignatura seleccionada del catálogo. Completa la selección antes de enviar.'
        : 'Debe incluir al menos una asignatura de docencia.');
      return false;
    }
    if (!tieneTotalidad && !asignaturasValidas.some(a => (a.creditos || 0) >= 3)) {
      toast.error('Debe incluir al menos una asignatura de mínimo 3 créditos para poder enviar el PTA.');
      return false;
    }
    if (!tieneTotalidad && !validarAsignaturasParaEnvio(asignaturasValidas)) {
      return false;
    }
    if (!tieneTotalidad && ['OCASIONAL', 'VISITANTE', 'ESPECIAL'].includes(tipoVinculacion)) {
      const hDocenciaTotal = asignaturasValidas.reduce((t, a) => t + (a.total_horas || 0), 0);
      if (hDocenciaTotal < horasAProgramar * 0.5) {
        toast.error('Los profesores Ocasionales, Visitantes y Especiales deben dedicar al menos el 50% de su PTA a docencia.');
        return false;
      }
    }
    if (!validarComposicionParaEnvio()) {
      return false;
    }
    // Bloqueo por topes individuales de componente, no por suma global del PTA.
    if (hasBlockingHourLimits) {
      const firstViolation = componentLimitViolations[0];
      toast.error(firstViolation?.message || 'Hay componentes que exceden el limite permitido de horas.');
      if (firstViolation?.section) setActiveSection(firstViolation.section);
      return false;
    }
    if (invWarnings?.length > 0) {
      toast.error(getSectionValidationToast('Investigación', invWarnings));
      setActiveSection('investigacion');
      return false;
    }
    if (extWarnings?.length > 0) {
      toast.error(getSectionValidationToast('Extensión', extWarnings));
      setActiveSection('extension');
      if (firstExtensionWarningSection) setExtSubseccion(firstExtensionWarningSection);
      return false;
    }
    if (compWarnings?.length > 0) {
      toast.error(getSectionValidationToast('Actividades Complementarias', compWarnings));
      setActiveSection('complementarias');
      setComplementariasSubseccion(COMP_SECCION_DOCENCIA);
      return false;
    }
    if (acadWarnings?.length > 0) {
      toast.error(getSectionValidationToast('Actividades Académico-Administrativas', acadWarnings));
      setActiveSection('complementarias');
      setComplementariasSubseccion(COMP_SECCION_AADM);
      return false;
    }
    
    if (totalHoras < horasAProgramar) {
      const porcentajeReal = horasAProgramar > 0 ? Math.round((totalHoras / horasAProgramar) * 100) : 0;
      setConfirmIncompletoData({ totalHoras, horasRequeridas: horasAProgramar, porcentaje: porcentajeReal });
      setShowConfirmIncompleto(true);
      return false; // Detener el flujo — el modal se encargará de continuar si el usuario acepta
    }

    // Horas de exceso: si el PTA supera el límite programable, se pide
    // confirmación explícita (no bloquea; el docente decide enviarlo así).
    const horasExcesoEnvio = totalHoras - horasAProgramar;
    if (horasExcesoEnvio > 0) {
      const porcentajeReal = horasAProgramar > 0 ? Math.round((totalHoras / horasAProgramar) * 100) : 0;
      setConfirmExcesoData({ totalHoras, horasRequeridas: horasAProgramar, horasExceso: horasExcesoEnvio, porcentaje: porcentajeReal });
      setShowConfirmExceso(true);
      return false; // Detener el flujo — el modal continúa si el usuario acepta
    }

    return true;
  }, [hasFullPTAActivity, academicoAdmin, asignaturas, tipoVinculacion, horasAProgramar, totalHoras, hasBlockingHourLimits, componentLimitViolations, invWarnings, extWarnings, firstExtensionWarningSection, compWarnings, acadWarnings, validarAsignaturasParaEnvio, validarComposicionParaEnvio]);

  const getFirmaEtapaLabel = useCallback(() => {
    if (estado === 'REVISION_DOCENTE_N1') return 'Revisión Docente N1';
    if (estado === 'REVISION_DOCENTE_N2') return 'Revisión Docente N2';
    return 'Envío a Aprobación';
  }, [estado]);

  const resetFirmaDocente = useCallback(() => {
    setShowFirmaDocente(false);
    setPendingDocenteAccion(null);
    setFirmaVerificationId('');
    setFirmaCorreoDestino('');
  }, []);

  const solicitarFirmaDocente = useCallback(async (accion: 'via_save' | 'avanzar_sin_cambios') => {
    if (requestingFirmaCode) return;

    setRequestingFirmaCode(true);
    try {
      const etapaLabel = getFirmaEtapaLabel();
      const res = await requestPTAFirmaDocenteCode({
        ptaId: currentPtaId,
        docenteId: isAdminEdit ? (docenteIdFromPta || userPersonId) : (userPersonId || docenteIdFromPta),
        periodo,
        etapaLabel,
      });

      if (!res.success || !res.data?.verificationId) {
        throw new Error((res as any).message || 'No se pudo enviar el código de validación.');
      }

      setFirmaVerificationId(res.data.verificationId);
      setFirmaCorreoDestino(res.data.email || 'tu correo institucional');
      setPendingDocenteAccion(accion);
      setShowFirmaDocente(true);
      if (res.data.devCode) {
        console.log('🔑 [PRUEBAS] Código de validación OTP recibido:', res.data.devCode);
        toast.info(`[PRUEBAS] Código de validación: ${res.data.devCode}`, { duration: Infinity });
      }
      toast.success('Código de validación enviado al correo registrado.');
    } catch (error: any) {
      setPendingDocenteAccion(null);
      setFirmaVerificationId('');
      setFirmaCorreoDestino('');
      toast.error(error?.message || 'No se pudo enviar el código de validación.');
    } finally {
      setRequestingFirmaCode(false);
    }
  }, [currentPtaId, docenteIdFromPta, getFirmaEtapaLabel, isAdminEdit, periodo, requestingFirmaCode, userPersonId]);

  const verificarCodigoFirmaDocente = useCallback(async (codigo: string) => {
    if (!firmaVerificationId) throw new Error('No hay código activo. Solicita uno nuevo.');
    const res = await verifyPTAFirmaDocenteCode({ verificationId: firmaVerificationId, code: codigo });
    if (!res.success) {
      throw new Error((res as any).message || 'Código incorrecto. Verifica e intenta nuevamente.');
    }
  }, [firmaVerificationId]);

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
    // Complementarias cubre ambas sub-secciones (incl. la legacy academico_admin).
    complementarias: ['complementarias', 'academico_admin'],
  };
  const seccionModificada = (key: string) =>
    isEnRevisionDocente && Object.keys(camposModificados).length > 0 &&
    (CAMPOS_POR_SECCION[key] || []).some(f => camposModificados[f]);

  const allSections = [
    { key: 'docencia' as const, icon: BookOpen, label: 'Docencia', count: asignaturas.length, hours: docProrr, prorr: docProrr, color: PTA_COLORS.DOCENCIA, limit: `${maxDocenciaLimit}h`, excede: docExcede, bloqueada: false, modificada: seccionModificada('docencia') },
    { key: 'investigacion' as const, icon: FlaskConical, label: 'Investigación', count: invActividades.length + (invProyecto.nombre ? 1 : 0), hours: invProrr, prorr: invProrr, color: PTA_COLORS.INVESTIGACION, limit: `${Math.round(maxInvLimit)}h`, excede: invExcede, bloqueada: !!actividadTotalidad || (!hasDocencia && !actividadTotalidad), modificada: seccionModificada('investigacion') },
    { key: 'extension' as const, icon: Globe, label: 'Extensión', count: extActividades.length, hours: extProrr, prorr: extProrr, color: PTA_COLORS.EXTENSION, limit: `${maxExtLimit}h`, excede: extExcede, bloqueada: !!actividadTotalidad || (!hasDocencia && !actividadTotalidad), modificada: seccionModificada('extension') },
    //{ key: 'complementarias' as const, icon: Briefcase, label: 'Complementarias', count: complementarias.length, hours: hComplementarias, prorr: compProrr, color: PTA_COLORS.COMPLEMENTARIAS, limit: `${maxCompLimit}h`, excede: compExcede, bloqueada: !!actividadTotalidad || (!hasDocencia && !actividadTotalidad), modificada: seccionModificada('complementarias') },
    { key: 'complementarias' as const, icon: Briefcase, label: 'Complementarias', count: complementarias.length + academicoAdmin.length, hours: compProrr + acadProrr, prorr: compProrr + acadProrr, color: PTA_COLORS.COMPLEMENTARIAS, limit: `${ptaRules?.max_pct_complementarias || 25}%`, excede: compExcede || acadExcede, bloqueada: false, modificada: seccionModificada('complementarias') },
  ];
  const sections = isComponentRestricted
    ? allSections.filter(s => canEditFormSection(s.key))
    : allSections;
  const activeVisibleSection = canEditFormSection(activeSection)
    ? activeSection
    : (sections[0]?.key || activeSection);
  const visibleExtSecciones = isComponentRestricted
    ? extSecciones.filter(s => canEditExtensionSubsection(s.key))
    : extSecciones;
  const currentExtSubseccion = visibleExtSecciones.some(s => s.key === extSubseccion)
    ? extSubseccion
    : (visibleExtSecciones[0]?.key || extSubseccion);

  const currentCompSubseccion = compSecciones.some((s: any) => s.key === complementariasSubseccion)
    ? complementariasSubseccion
    : (compSecciones[0]?.key || COMP_SECCION_DOCENCIA);

  // Nombres del docente (territorial y CETAP fijos)
  const defaultTerritorialNombre = territoriales.find(t => t.id === defaultTerritorial)?.nombre || '—';
  const defaultCetapNombre = (cetapsMap[defaultTerritorial] || []).find((c: any) => c.id === defaultCetap)?.nombre || '—';

  // Helpers for cascading
  const getAsignaturasFiltradas = (programaId: string) => asignaturasCat.filter(a => a.programaId === programaId);
  const getExtCatalog = (sec: string): any[] => {
    if (!actExtension) return [];
    return (actExtension as Record<string, any[]>)[normalizeExtensionSectionKey(sec)] || [];
  };

  return (
    <div className={`mx-auto w-full animate-in fade-in duration-500 ${isAdminEdit ? 'px-6 pt-2 pb-0' : 'pb-32'}`}>
      {/* Header — solo título, sin botones de acción (movidos al sticky footer) */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
        <div>
          <button onClick={onBack} className="flex items-center gap-1.5 bg-transparent border-none cursor-pointer text-[13px] text-gray-500 font-medium p-0 mb-1 hover:text-gray-700">
            <ChevronLeft className="w-4 h-4" /> Volver a mis PTAs
          </button>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 m-0 leading-tight tracking-tight">
            {ptaId
              ? esDevolucionComponentes
                ? (componentesDevueltos.length === 1 ? 'Corregir componente devuelto' : 'Corregir componentes devueltos')
                : isEnRevisionDocente
                  ? 'Revisar PTA — Aprobado con modificaciones'
                  : originalEstado === 'Devuelto'
                    ? 'Corregir PTA Devuelto'
                    : isAdminEdit
                      ? (isAdminComponentRestricted ? 'Concertar componente' : 'Concertar PTA')
                      : 'Editar PTA'
              : 'Crear Nuevo PTA'}
          </h1>
          <p className="text-[13px] text-gray-500 mt-2 font-medium">Periodo {periodo} • {dedicacion}</p>
          {isAdminComponentRestricted && (
            <p className="mt-2 inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-bold text-blue-700">
              Edicion limitada: {componentEditScopeLabel || 'componentes autorizados'}
            </p>
          )}
          {esDevolucionComponentes && (
            <p className="mt-2 inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-700">
              Edición limitada a: {restrictedComponentKeys.map(componentLabel).join(', ')}
            </p>
          )}
        </div>
      </div>

      {/* Comentario de Concertación — editar y guardar como revisor/admin equivale a
          devolver al docente el/los componente(s) seleccionados, con este comentario.
          Si el revisor tiene permiso restringido a ciertos componentes, se devuelven
          esos automáticamente. Si no (aprueba todo / sin restricción), debe elegir
          explícitamente cuáles — evita adivinar por la pestaña que tenga abierta, que
          podía fallar en silencio si no coincidía con lo que realmente quería devolver. */}
      {isAdminEdit && ptaId && (
        <div className="mb-5 p-4 rounded-xl bg-blue-50 border border-blue-200">
          {!isAdminComponentRestricted && adminEditableComponentKeysNow.length > 1 && (
            <div className="mb-3">
              <label className="block text-[13px] font-bold text-blue-900 mb-1.5">
                ¿Qué componente(s) estás devolviendo? (obligatorio)
              </label>
              <div className="flex flex-wrap gap-2">
                {adminEditableComponentKeysNow.map(key => {
                  const checked = componentesSeleccionadosDevolver.includes(key);
                  return (
                    <label
                      key={key}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[12px] font-semibold cursor-pointer ${checked ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-blue-300 text-blue-800'}`}
                    >
                      <input
                        type="checkbox"
                        className="accent-blue-600"
                        checked={checked}
                        onChange={e => setComponentesSeleccionadosDevolver(prev =>
                          e.target.checked ? [...prev, key] : prev.filter(k => k !== key))}
                      />
                      {componentLabel(key)}
                    </label>
                  );
                })}
              </div>
            </div>
          )}
          <label className="block text-[13px] font-bold text-blue-900 mb-1.5">
            Comentario para el docente (obligatorio)
          </label>
          <p className="text-[12px] text-blue-700 mb-2">
            Al guardar, el/los componente(s) {isAdminComponentRestricted || adminEditableComponentKeysNow.length <= 1 ? 'que edites' : 'seleccionados arriba'} se devolverán al docente con este comentario para que los corrija y reenvíe.
          </p>
          <textarea
            value={comentarioConcertacion}
            onChange={e => setComentarioConcertacion(e.target.value)}
            rows={2}
            placeholder="Ej: Ajustar horas de la asignatura X, no coinciden con el catálogo."
            className="w-full rounded-xl border border-blue-300 bg-white px-3 py-2 text-[13px] font-medium text-slate-800 shadow-sm placeholder:text-slate-400 hover:border-blue-400 hover:shadow-md focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 transition-all duration-200 resize-y"
          />
        </div>
      )}

      {/* Firma digital del docente — requerida antes de cada envío y enviar código de aprobación por email */}
      {showFirmaDocente && (
        <FirmaDigitalPTA
          ptaId={currentPtaId || ''}
          docenteNombre={docenteName}
          periodo={periodo}
          totalHoras={totalHoras}
          firmanteNombre={docenteName}
          firmanteCargo="Docente"
          correoDestino={firmaCorreoDestino}
          onVerifyCodigo={verificarCodigoFirmaDocente}
          etapaLabel={
            estado === 'REVISION_DOCENTE_N1' ? 'Revisión Docente N1' :
              estado === 'REVISION_DOCENTE_N2' ? 'Revisión Docente N2' :
                'Envío a Aprobación'
          }
          onFirmaCompleta={handleFirmaDocenteCompleta}
          onCancelar={resetFirmaDocente}
        />
      )}

      {/* Modal de confirmación PTA incompleto — reemplaza window.confirm nativo */}
      {showConfirmIncompleto && confirmIncompletoData && createPortal(
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
          animation: 'fadeIn 0.2s ease'
        }}>
          <div style={{
            background: '#fff', borderRadius: '20px', maxWidth: '460px', width: '92%',
            boxShadow: '0 25px 60px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)',
            overflow: 'hidden', animation: 'scaleIn 0.25s ease'
          }}>
            {/* Header con icono de advertencia */}
            <div style={{
              background: 'linear-gradient(135deg, #FFF7ED 0%, #FEF3C7 100%)',
              padding: '28px 28px 20px', borderBottom: '1px solid #FDE68A',
              display: 'flex', alignItems: 'flex-start', gap: '16px'
            }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '14px', flexShrink: 0,
                background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(245,158,11,0.3)'
              }}>
                <AlertTriangle style={{ width: '24px', height: '24px', color: '#fff' }} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#92400E', lineHeight: 1.3 }}>
                  PTA Incompleto
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#B45309', fontWeight: 500 }}>
                  El plan no alcanza las horas requeridas
                </p>
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: '24px 28px' }}>
              {/* Indicador visual de progreso */}
              <div style={{
                background: '#F9FAFB', borderRadius: '14px', padding: '16px 20px',
                border: '1px solid #E5E7EB', marginBottom: '20px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#374151' }}>
                    {confirmIncompletoData.totalHoras}h programadas
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#9CA3AF' }}>
                    de {confirmIncompletoData.horasRequeridas}h requeridas
                  </span>
                </div>
                <div style={{
                  width: '100%', height: '10px', borderRadius: '999px',
                  background: '#E5E7EB', overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${Math.min(confirmIncompletoData.porcentaje, 100)}%`,
                    height: '100%', borderRadius: '999px',
                    background: confirmIncompletoData.porcentaje >= 80
                      ? 'linear-gradient(90deg, #F59E0B, #EAB308)'
                      : 'linear-gradient(90deg, #EF4444, #F97316)',
                    transition: 'width 0.5s ease'
                  }} />
                </div>
                <div style={{ textAlign: 'center', marginTop: '8px' }}>
                  <span style={{
                    fontSize: '22px', fontWeight: 800,
                    color: confirmIncompletoData.porcentaje >= 80 ? '#D97706' : '#DC2626'
                  }}>
                    {confirmIncompletoData.porcentaje}%
                  </span>
                  <span style={{ fontSize: '12px', color: '#9CA3AF', marginLeft: '4px', fontWeight: 600 }}>
                    completado
                  </span>
                </div>
              </div>

              <p style={{
                margin: 0, fontSize: '13.5px', lineHeight: 1.65, color: '#4B5563', fontWeight: 500
              }}>
                Un PTA incompleto <strong style={{ color: '#DC2626' }}>incide negativamente</strong> en la evaluación de desempeño docente.
              </p>
              <p style={{
                margin: '12px 0 0', fontSize: '13.5px', lineHeight: 1.65, color: '#6B7280', fontWeight: 500
              }}>
                ¿Desea enviarlo de todas formas?
              </p>
            </div>

            {/* Footer con botones */}
            <div style={{
              padding: '0 28px 24px', display: 'flex', gap: '12px', justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => { setShowConfirmIncompleto(false); setConfirmIncompletoData(null); }}
                style={{
                  padding: '10px 22px', borderRadius: '12px', fontSize: '13px', fontWeight: 700,
                  border: '2px solid #E5E7EB', background: '#fff', color: '#374151',
                  cursor: 'pointer', transition: 'all 0.2s'
                }}
                onMouseOver={e => { (e.target as HTMLElement).style.background = '#F3F4F6'; }}
                onMouseOut={e => { (e.target as HTMLElement).style.background = '#fff'; }}
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setShowConfirmIncompleto(false);
                  setConfirmIncompletoData(null);
                  solicitarFirmaDocente('via_save');
                }}
                style={{
                  padding: '10px 22px', borderRadius: '12px', fontSize: '13px', fontWeight: 700,
                  border: 'none', background: '#D97706', color: '#fff',
                  cursor: 'pointer', transition: 'all 0.2s',
                  boxShadow: '0 4px 12px rgba(217,119,6,0.3)'
                }}
                onMouseOver={e => { (e.target as HTMLElement).style.background = '#B45309'; }}
                onMouseOut={e => { (e.target as HTMLElement).style.background = '#D97706'; }}
              >
                Sí, enviar de todas formas
              </button>
            </div>
          </div>
          <style>{`
            @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
            @keyframes scaleIn { from { opacity: 0; transform: scale(0.95) } to { opacity: 1; transform: scale(1) } }
          `}</style>
        </div>,
        document.body
      )}

      {/* Modal: confirmación de HORAS DE EXCESO (supera el límite programable) */}
      {showConfirmExceso && confirmExcesoData && createPortal(
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
          animation: 'fadeIn 0.2s ease'
        }}>
          <div style={{
            background: '#fff', borderRadius: '20px', maxWidth: '460px', width: '92%',
            boxShadow: '0 25px 60px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)',
            overflow: 'hidden', animation: 'scaleIn 0.25s ease'
          }}>
            {/* Header con icono de advertencia */}
            <div style={{
              background: 'linear-gradient(135deg, #FFF7ED 0%, #FEF3C7 100%)',
              padding: '28px 28px 20px', borderBottom: '1px solid #FDE68A',
              display: 'flex', alignItems: 'flex-start', gap: '16px'
            }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '14px', flexShrink: 0,
                background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(245,158,11,0.3)'
              }}>
                <AlertTriangle style={{ width: '24px', height: '24px', color: '#fff' }} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#92400E', lineHeight: 1.3 }}>
                  PTA con horas de exceso
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#B45309', fontWeight: 500 }}>
                  El plan supera el límite programable
                </p>
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: '24px 28px' }}>
              <div style={{
                background: '#FFFBEB', borderRadius: '14px', padding: '16px 20px',
                border: '1px solid #FDE68A', marginBottom: '20px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#374151' }}>
                    {confirmExcesoData.totalHoras}h programadas
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#9CA3AF' }}>
                    límite {confirmExcesoData.horasRequeridas}h
                  </span>
                </div>
                <div style={{ textAlign: 'center', marginTop: '8px' }}>
                  <span style={{ fontSize: '26px', fontWeight: 800, color: '#D97706' }}>
                    +{confirmExcesoData.horasExceso}h
                  </span>
                  <span style={{ fontSize: '12px', color: '#9CA3AF', marginLeft: '6px', fontWeight: 600 }}>
                    de exceso ({confirmExcesoData.porcentaje}%)
                  </span>
                </div>
              </div>

              <p style={{
                margin: 0, fontSize: '13.5px', lineHeight: 1.65, color: '#4B5563', fontWeight: 500
              }}>
                Este PTA tiene <strong style={{ color: '#D97706' }}>{confirmExcesoData.horasExceso} horas de exceso</strong> por encima de las {confirmExcesoData.horasRequeridas}h del límite programable.
              </p>
              <p style={{
                margin: '12px 0 0', fontSize: '13.5px', lineHeight: 1.65, color: '#6B7280', fontWeight: 500
              }}>
                ¿Desea enviarlo de todas formas?
              </p>
            </div>

            {/* Footer con botones */}
            <div style={{
              padding: '0 28px 24px', display: 'flex', gap: '12px', justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => { setShowConfirmExceso(false); setConfirmExcesoData(null); }}
                style={{
                  padding: '10px 22px', borderRadius: '12px', fontSize: '13px', fontWeight: 700,
                  border: '2px solid #E5E7EB', background: '#fff', color: '#374151',
                  cursor: 'pointer', transition: 'all 0.2s'
                }}
                onMouseOver={e => { (e.target as HTMLElement).style.background = '#F3F4F6'; }}
                onMouseOut={e => { (e.target as HTMLElement).style.background = '#fff'; }}
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setShowConfirmExceso(false);
                  setConfirmExcesoData(null);
                  solicitarFirmaDocente('via_save');
                }}
                style={{
                  padding: '10px 22px', borderRadius: '12px', fontSize: '13px', fontWeight: 700,
                  border: 'none', background: '#D97706', color: '#fff',
                  cursor: 'pointer', transition: 'all 0.2s',
                  boxShadow: '0 4px 12px rgba(217,119,6,0.3)'
                }}
                onMouseOver={e => { (e.target as HTMLElement).style.background = '#B45309'; }}
                onMouseOut={e => { (e.target as HTMLElement).style.background = '#D97706'; }}
              >
                Sí, enviar de todas formas
              </button>
            </div>
          </div>
          <style>{`
            @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
            @keyframes scaleIn { from { opacity: 0; transform: scale(0.95) } to { opacity: 1; transform: scale(1) } }
          `}</style>
        </div>,
        document.body
      )}

      {/* Banner: Devolución de componente(s) — el revisor devolvió componentes para corrección.
          Muestra QUÉ componente se devolvió y el comentario del revisor; el docente solo
          puede editar esos componentes y re-enviar. */}
      {esDevolucionComponentes && (
        <div className="flex flex-col gap-3 p-4 rounded-xl mb-5 bg-amber-50 border border-amber-200">
          <div className="flex items-start gap-3">
            <RotateCcw className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold text-amber-900 text-sm">
                {componentesDevueltos.length === 1
                  ? 'Un componente de tu PTA fue devuelto para corrección'
                  : `${componentesDevueltos.length} componentes de tu PTA fueron devueltos para corrección`}
              </div>
              <p className="text-sm text-amber-800 mt-1 leading-relaxed">
                Corrige únicamente {componentesDevueltos.length === 1 ? 'el componente indicado' : 'los componentes indicados'} y usa
                "Corregir y re-enviar". Los demás componentes quedan bloqueados.
              </p>
              <div className="mt-3 flex flex-col gap-2">
                {componentesDevueltos.map((c: any) => (
                  <div key={c.componente} className="rounded-lg bg-white border border-amber-200 p-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-xs font-bold">
                        {componentLabel(String(c.componente))}
                      </span>
                      {(c.aprobadorNombre || c.aprobador_nombre) && (
                        <span className="text-[11px] text-amber-700">
                          Devuelto por {c.aprobadorNombre || c.aprobador_nombre}
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 text-sm text-amber-900">
                      <span className="font-semibold">Comentario del revisor: </span>
                      {c.comentarios?.trim() ? c.comentarios : 'Sin comentario.'}
                    </div>
                    <div className="mt-3">
                      <label className="block text-xs font-bold text-amber-900 mb-1">
                        Tu respuesta para este componente (obligatoria)
                      </label>
                      <textarea
                        value={respuestasDevolucionDocente[String(c.componente)] || ''}
                        onChange={e => {
                          const key = String(c.componente);
                          setRespuestasDevolucionDocente(prev => ({ ...prev, [key]: e.target.value }));
                        }}
                        rows={2}
                        placeholder="Explica que corregiste en este componente, o por que lo reenvias asi..."
                        className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm placeholder:text-slate-400 hover:border-amber-400 hover:shadow-md focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15 transition-all duration-200 resize-y"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 mt-1">
            <button
              onClick={() => {
                if (!respuestasDevolucionCompletas) {
                  toast.error('Debes explicar tu respuesta para cada componente devuelto antes de reenviar.');
                  return;
                }
                solicitarFirmaDocente('via_save');
              }}
              disabled={saving || requestingFirmaCode}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border-none text-white text-sm font-bold disabled:opacity-50 cursor-pointer"
              style={{ background: '#D97706' }}
            >
              <RotateCcw className="w-4 h-4" /> Corregir y re-enviar al revisor
            </button>
          </div>
        </div>
      )}

      {/* Banner: Revisión docente post-aprobación parcial (flujo legacy: aprobado, confirma para avanzar).
          Solo aplica a la vista del docente: se oculta en modo admin ("Concertar") y
          cuando en realidad es una devolución por componente. */}
      {!isAdminEdit && isEnRevisionDocente && !esDevolucionComponentes && (
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
              onClick={() => solicitarFirmaDocente('avanzar_sin_cambios')}
              disabled={saving || requestingFirmaCode}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border-none text-white text-sm font-bold disabled:opacity-50 cursor-pointer"
              style={{ background: '#7C3AED' }}
            >
              <CheckCircle2 className="w-4 h-4" /> Confirmar y avanzar a la siguiente fase
            </button>
            <button
              onClick={() => solicitarFirmaDocente('via_save')}
              disabled={saving || requestingFirmaCode}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-violet-300 bg-white text-violet-700 text-sm font-bold disabled:opacity-50 cursor-pointer hover:bg-violet-50"
            >
              <RotateCcw className="w-4 h-4" /> Corregir y re-enviar al revisor
            </button>
          </div>
        </div>
      )}

      {/* Devuelto alert (vista docente) */}
      {!isAdminEdit && originalEstado === 'Devuelto' && !isEnRevisionDocente && (
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
            <div className={`grid grid-cols-1 sm:grid-cols-2 ${isAdminEdit ? 'lg:grid-cols-6' : 'lg:grid-cols-5'} gap-4`}>
              <ReadonlyField label="Tipo de Vinculación" value={TIPOS_VINCULACION.find(t => t.codigo === tipoVinculacion)?.nombre || tipoVinculacion} />
              <ReadonlyField label="Dedicación" value={dedicacion} />
              <FormSelect label="Periodo" value={periodo} disabled={!isEditable || !!ptaId}
                onChange={v => setPeriodo(v)}
                options={(() => {
                  const filtered = periodosDisponibles.filter(p => {
                    const codigo = p.codigo || `${p.anio}-${p.semestre}`;
                    if (ptaId) {
                      return codigo === periodo || p.estado === 'en_curso';
                    }
                    return p.estado === 'en_curso';
                  });
                  const opts = filtered.map(p => {
                    const codigo = p.codigo || `${p.anio}-${p.semestre}`;
                    const esActual = p.estado === 'en_curso';
                    return {
                      value: codigo,
                      label: `${codigo}${esActual ? ' (Actual)' : ''}`
                    };
                  });
                  if (opts.length === 0 || !opts.some(o => o.value === periodo)) {
                    opts.unshift({ value: periodo, label: periodo });
                  }
                  return opts;
                })()} />
              {isAdminEdit && (
                <div>
                  <FormInput
                    label="Semanas Prorrateo"
                    value={semanasProrrateo}
                    type="number"
                    disabled={isAdminComponentRestricted}
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
              <div className="flex flex-col">
                <label className="block text-[10px] font-semibold text-gray-500 tracking-wider uppercase mb-1 ml-1 flex items-center gap-1">
                  Horas Programables
                </label>
                <div className={`w-full px-3 py-2 rounded-xl border border-transparent flex items-center min-h-[36px] text-[12px] font-extrabold shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)] ${
                  semanasProrrateo < 16
                    ? 'bg-amber-50/50 text-amber-700 shadow-[inset_0_0_0_1px_rgba(217,119,6,0.15)]'
                    : 'bg-blue-50/50 text-[#003DA5] shadow-[inset_0_0_0_1px_rgba(0,61,165,0.15)]'
                }`}>
                  {horasAProgramar}h {semanasProrrateo < 16 && <span className="text-[10px] opacity-80 font-semibold ml-1.5">(Prorrateo)</span>}
                </div>
              </div>
              <div className="flex flex-col">
                <label className="block text-[10px] font-semibold text-gray-500 tracking-wider uppercase mb-1 ml-1 flex items-center gap-1">
                  Total Horas PTA
                </label>
                <div className={`w-full px-3 py-2 rounded-xl border border-transparent flex items-center min-h-[36px] text-[12px] font-extrabold shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)] ${
                  hasBlockingHourLimits
                    ? 'bg-red-50/50 text-red-700 shadow-[inset_0_0_0_1px_rgba(239,68,68,0.15)]'
                    : horasExceso > 0
                      ? 'bg-amber-50/50 text-amber-700 shadow-[inset_0_0_0_1px_rgba(217,119,6,0.15)]'
                      : totalHoras >= horasAProgramar
                        ? 'bg-green-50/50 text-green-700 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.15)]'
                        : 'bg-blue-50/50 text-blue-700 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.15)]'
                }`}>
                  {totalHoras}h / {horasAProgramar}h ({porcentaje}%)
                </div>
              </div>
            </div>
          </div>

          {/* Layout de una sola columna: tabs horizontales + contenido */}
          <div className="flex flex-col gap-5 items-start w-full">

            {/* ─── CONTENIDO PRINCIPAL ─── */}
            <div className="flex-1 flex flex-col gap-4 min-w-0 w-full">
              <DocumentosPendientesAlert documentosPendientes={documentosPendientes} />

              {/* Status banner */}
              <div className={`p-3.5 rounded-xl border text-[12px] leading-relaxed flex items-start gap-2 ${hasBlockingHourLimits ? 'bg-red-50 border-red-200 text-red-800' : horasExceso > 0 ? 'bg-amber-50 border-amber-200 text-amber-800' : totalHoras >= horasAProgramar ? 'bg-green-50 border-green-200 text-green-800' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
                {hasBlockingHourLimits ? <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> : totalHoras >= horasAProgramar ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <Info className="w-4 h-4 shrink-0 mt-0.5" />}
                <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3 flex-1">
                  <span className="font-bold">
                    {hasBlockingHourLimits ? componentLimitViolations[0]?.message : totalHoras >= horasAProgramar ? 'Topes por componente cumplidos. Listo para enviar.' : `PTA Incompleto: Faltan ${horasAProgramar - totalHoras}h por programar para el 100% (${horasAProgramar}h).`}
                  </span>
                  <span className="text-[11px] opacity-70 mt-0.5 sm:mt-0">{totalHoras}h / {horasAProgramar}h ({porcentaje}%)</span>
                </div>
              </div>

              {hasBlockingHourLimits && (
                <div className="rounded-xl border border-red-200 bg-red-50/70 px-3.5 py-2.5 text-[11px] text-red-800">
                  <div className="flex items-center gap-1.5 font-bold mb-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Limites de horas excedidos
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {componentLimitViolations.map(v => (
                      <span key={v.section} className="rounded-lg bg-white/80 border border-red-100 px-2 py-1 font-semibold">
                        {v.label}: {v.hours}h / {v.limit}h
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* ─── TABS HORIZONTALES (Módulos del PTA) ─── */}
              <div className="w-full bg-white/70 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-[0_2px_12px_rgb(0,0,0,0.03)] p-1.5">
                <div className="flex flex-wrap gap-1">
                  {sections.map(s => (
                    <button key={s.key} disabled={s.bloqueada} onClick={() => { if (!s.bloqueada) setActiveSection(s.key); }}
                      className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border-none text-[12px] transition-all duration-200 cursor-pointer relative ${
                        activeVisibleSection === s.key
                          ? 'bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)] font-bold text-gray-900'
                          : s.bloqueada
                            ? 'text-gray-400 bg-transparent cursor-default opacity-50'
                            : 'text-gray-600 font-medium bg-transparent hover:bg-gray-50 hover:text-gray-900'
                      }`}>
                      <div className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center relative"
                        style={{ backgroundColor: activeVisibleSection === s.key ? `${s.color}20` : 'transparent' }}>
                        <s.icon className="w-3.5 h-3.5" style={{ color: activeVisibleSection === s.key ? s.color : '#9CA3AF' }} />
                      </div>
                      <span className="truncate">{s.label}</span>
                      <span className={`text-[10px] font-bold tabular-nums ${
                        activeVisibleSection === s.key ? 'text-gray-500' : s.excede ? 'text-red-500' : 'text-gray-400'
                      }`}>{s.hours}h</span>
                      {s.excede && <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />}
                      {s.bloqueada && <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />}
                      {s.modificada && <span title="Modificado por el revisor" className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse shrink-0" />}
                      {activeVisibleSection === s.key && (
                        <div className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full" style={{ backgroundColor: s.color }} />
                      )}
                    </button>
                  ))}
                </div>
              </div>

          {/* ─── PROGRESO DEL PTA (renderizado en sidebar izquierdo del portal via createPortal) ─── */}
          {(() => {
            const progressContent = (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                <div className="px-4 py-3 bg-gradient-to-b from-white to-slate-50/40 border-b border-gray-100">
                  <h3 className="text-[10px] font-extrabold tracking-wider text-[#003DA5] flex items-center gap-1.5 uppercase m-0">
                    <Calculator className="w-3.5 h-3.5 text-[#003DA5]" /> Distribución de Horas
                  </h3>
                </div>
                <div className="p-4">
                  {/* Donut Chart (top, centered) */}
                  <div className="flex justify-center mb-5">
                    {(() => {
                      const size = 130;
                      const sw = 12;
                      const donutR = (size - sw) / 2;
                      const donutC = 2 * Math.PI * donutR;
                      const donutWithData = sections.filter(s => s.prorr > 0);
                      let cumOff = 0;
                      const segs = donutWithData.map(s => {
                        const pct = totalHoras > 0 ? s.prorr / totalHoras : 0;
                        const dl = pct * donutC;
                        const dashOffset = -cumOff;
                        cumOff += dl;
                        return { ...s, dl, dashOffset };
                      });
                      return (
                        <div className="relative shrink-0" style={{ width: size, height: size }}>
                          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90 absolute inset-0">
                            <circle cx={size / 2} cy={size / 2} r={donutR} fill="none" stroke="#F1F5F9" strokeWidth={sw} />
                            {segs.map(seg => (
                              <circle
                                key={seg.key}
                                cx={size / 2}
                                cy={size / 2}
                                r={donutR}
                                fill="none"
                                stroke={seg.color}
                                strokeWidth={sw}
                                strokeDasharray={`${seg.dl} ${donutC - seg.dl}`}
                                strokeDashoffset={seg.dashOffset}
                                strokeLinecap="butt"
                                style={{ transition: 'stroke-dasharray 0.5s ease-out, stroke-dashoffset 0.5s ease-out' }}
                              />
                            ))}
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-2xl font-black text-slate-800 leading-none tabular-nums">{totalHoras}</span>
                            <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase mt-1">Horas</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Component list with icons and progress (bottom, full width) */}
                  <div className="flex flex-col gap-2.5 mb-4">
                    {sections.map(s => {
                      const pct = horasAProgramar > 0 ? Math.min((s.prorr / horasAProgramar) * 100, 100) : 0;
                      return (
                        <div key={s.key} className="flex items-center gap-2">
                          <div className="rounded-md flex items-center justify-center shrink-0" style={{ width: '24px', height: '24px', backgroundColor: `${s.color}15` }}>
                            <s.icon className="w-3.5 h-3.5" style={{ color: s.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center text-[10px] leading-tight mb-0.5">
                              <span className="font-semibold text-slate-600 truncate">{s.label}</span>
                              <span className="font-bold tabular-nums" style={{ color: s.color }}>
                                {s.hours}h
                                {s.hours !== s.prorr && (
                                  <span className="text-[8.5px] text-slate-400 ml-1 font-normal" title="Horas efectivas con prorrateo">→{s.prorr}h</span>
                                )}
                              </span>
                            </div>
                            <div className="h-[4px] bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: s.color }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="my-2.5 h-px bg-slate-100" />
                  <div className="flex justify-between items-center text-[10px] font-semibold text-slate-500">
                    <span>Límite programable:</span>
                    <span className="font-bold text-slate-700">{horasAProgramar}h</span>
                  </div>
                  {horasExceso > 0 && (
                    <div className="mt-1.5 flex justify-between items-center text-[10px] font-semibold text-amber-600">
                      <span className="flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Horas de exceso:
                      </span>
                      <span className="font-bold text-amber-700">+{horasExceso}h</span>
                    </div>
                  )}
                  <div className={`mt-3 p-2.5 rounded-lg border text-[10px] leading-relaxed flex items-start gap-1.5 ${
                    hasBlockingHourLimits ? 'bg-red-50 border-red-200 text-red-800'
                    : totalHoras >= horasAProgramar ? 'bg-green-50 border-green-200 text-green-800'
                    : 'bg-blue-50 border-blue-200 text-blue-800'
                  }`}>
                    {hasBlockingHourLimits ? <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                      : totalHoras >= horasAProgramar ? <CheckCircle2 className="w-3 h-3 shrink-0 mt-0.5" />
                      : <Info className="w-3 h-3 shrink-0 mt-0.5" />}
                    <span>
                      {hasBlockingHourLimits
                        ? (componentLimitViolations[0]?.message || 'Hay componentes que exceden el limite permitido.')
                        : totalHoras >= horasAProgramar
                          ? 'Carga completa. Listo para enviar.'
                          : `Faltan ${horasAProgramar - totalHoras}h por programar.`}
                    </span>
                  </div>
                  {hasBlockingHourLimits && (
                    <div className="mt-2 p-2 rounded-lg bg-red-50 border border-red-200 text-[10px] text-red-800">
                      <div className="font-semibold mb-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Limites excedidos
                      </div>
                      {componentLimitViolations.map(v => (
                        <div key={v.section}>{v.label}: {v.hours}h / {v.limit}h</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
            return slotNode ? createPortal(progressContent, slotNode) : null;
          })()}

          {/* Active section */}
          <div className="bg-white rounded-3xl border border-gray-200/50 overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-8">

            {/* Overlay de sección bloqueada por falta de asignaturas en Docencia.
                Complementarias queda accesible: su sub-sección AADM permite el 100% sin docencia. */}
            {!hasDocencia && activeVisibleSection !== 'docencia' && activeVisibleSection !== 'complementarias' && (
              <div className="p-12 text-center flex flex-col items-center justify-center min-h-[350px] animate-in fade-in duration-300">
                <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mb-4 border border-amber-200">
                  <AlertTriangle className="w-8 h-8 text-amber-500" />
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-2">Sección Inhabilitada</h3>
                <p className="text-sm text-gray-500 max-w-md mx-auto leading-relaxed text-center">
                  De acuerdo con las reglas de negocio del PTA, debe configurar al menos una asignatura en la sección de <span className="font-bold text-[#003DA5]">Docencia Directa</span> antes de poder registrar actividades en otros componentes.
                </p>
              </div>
            )}

            {/* ─── DOCENCIA ─── */}
            {activeVisibleSection === 'docencia' && (
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
                    <div className="flex flex-col gap-4">
                      {asignaturas.map((asig, idx) => {
                        const isComplete = !!asig.asignatura_id;
                        const tieneConflicto = docenciaConflictIds.has(asig.id);
                        // Para bloqueo por jefatura territorial
                        const bloqueadaPorTerritorial = !!(jefaturaTerritorialId && asig.territorial_id && asig.territorial_id !== jefaturaTerritorialId);
                        const rowEditable = isEditable && !bloqueadaPorTerritorial;
                        // Datos de CETAP según la territorial de ESTA asignatura
                        const tIdAsig = asig.territorial_id;
                        const cetapsCargadosAsig = tIdAsig in cetapsMap;
                        const listaCetapsAsig = cetapsMap[tIdAsig] || [];
                        const hasCetapsAsig = listaCetapsAsig.length > 0;
                        const programaHabilitado = hasCetapsAsig ? !!asig.cetap_id : !!tIdAsig;
                        const territorialNombre = territoriales.find(t => t.id === asig.territorial_id)?.nombre
                          || (asig.territorial_id === defaultTerritorial ? defaultTerritorialNombre : asig.territorial_id || '—');

                        const catAsig = asignaturasCat.find(ac => String(ac.id) === String(asig.asignatura_id));
                        const displayNucleo = catAsig?.nucleo || asig.nucleo_tematico || '—';
                        const displaySemestre = catAsig?.semestre || asig.semestre || '—';
                        const displayCreditos = catAsig?.creditos != null ? catAsig.creditos : asig.creditos != null ? asig.creditos : 0;
                        const displayModalidad = asig.modalidad || 'PRESENCIAL';

                        return (
                          <div key={asig.id}
                            className={`p-4 md:p-5 rounded-2xl border relative transition-all duration-300 group ${
                              tieneConflicto
                                ? 'border-red-200 bg-red-50/30 shadow-sm border-l-4 border-l-red-500 hover:shadow-md'
                                : bloqueadaPorTerritorial
                                  ? 'border-gray-200 bg-gray-50/80 opacity-75'
                                  : isComplete
                                    ? `border-slate-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'} shadow-[0_2px_10px_rgba(15,23,42,0.07)] border-l-4 border-l-emerald-500 hover:shadow-md hover:border-slate-300`
                                    : 'border-blue-200 bg-blue-50/30 shadow-[0_0_0_3px_rgba(59,130,246,0.08)]'
                            }`}>

                            {/* Card Header */}
                            <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100/80">
                              <div className="flex items-center gap-2.5 flex-wrap">
                                {tieneConflicto ? (
                                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-600 shadow-sm">
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                  </div>
                                ) : isComplete ? (
                                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 shadow-sm">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 shadow-sm">
                                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                  </div>
                                )}
                                <span className={`text-[15px] font-extrabold tracking-tight ${tieneConflicto ? 'text-red-700' : isComplete ? 'text-slate-800' : 'text-blue-700'}`}>
                                  Asignatura {idx + 1}
                                </span>
                                {tieneConflicto && (
                                  <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 bg-red-100 text-red-700 rounded-md ml-1 flex items-center gap-1 shadow-sm">
                                    ⚠ Cruce de fechas
                                  </span>
                                )}
                                {!isComplete && !bloqueadaPorTerritorial && !tieneConflicto && (
                                  <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md ml-1 shadow-sm">
                                    En progreso
                                  </span>
                                )}
                                {bloqueadaPorTerritorial && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-200 text-slate-600 rounded-md flex items-center gap-1 shadow-sm">
                                    🔒 {territorialNombre}
                                  </span>
                                )}
                              </div>

                              {isEditable && !bloqueadaPorTerritorial && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveAsig(asig.id)}
                                  title="Eliminar Asignatura"
                                  aria-label={`Eliminar Asignatura ${idx + 1}`}
                                  className="w-8 h-8 rounded-lg border border-red-200 bg-red-50 text-red-500 shadow-sm cursor-pointer flex items-center justify-center hover:text-red-700 hover:bg-red-100 hover:border-red-300 hover:shadow-md active:scale-95 transition-all outline-none focus:ring-2 focus:ring-red-500/40 focus:ring-offset-1"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>

                            {/* Main Selects Grid: 4 columns on desktop to save vertical space */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                              <FormSelect
                                label="Territorial *"
                                value={asig.territorial_id}
                                disabled={!rowEditable}
                                onChange={v => handleAsigChange(asig.id, 'territorial_id', v)}
                                options={territoriales.map(t => ({ value: t.id, label: t.nombre }))}
                                placeholder="Seleccionar..."
                              />
                              {hasCetapsAsig ? (
                                <FormSelect label="CETAP" value={asig.cetap_id} disabled={!rowEditable}
                                  onChange={v => handleAsigChange(asig.id, 'cetap_id', v)}
                                  options={listaCetapsAsig.map((c: any) => ({ value: c.id, label: c.nombre }))}
                                  placeholder="Seleccionar..." />
                              ) : cetapsCargadosAsig ? (
                                <div className="flex flex-col">
                                  <label className="block text-[10px] font-semibold text-slate-500 tracking-wider uppercase mb-1 ml-1">CETAP</label>
                                  <div className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-[12px] text-slate-500 italic min-h-[36px] flex items-center shadow-sm">Sin CETAPs</div>
                                </div>
                              ) : tIdAsig ? (
                                <div className="flex flex-col">
                                  <label className="block text-[10px] font-semibold text-slate-500 tracking-wider uppercase mb-1 ml-1">CETAP</label>
                                  <div className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-[12px] text-slate-500 italic min-h-[36px] flex items-center shadow-sm">Cargando...</div>
                                </div>
                              ) : (
                                <div className="flex flex-col hidden md:flex">
                                  {/* Empty placeholder to maintain grid layout when no territorial selected */}
                                </div>
                              )}

                              <FormSelect label="Programa" value={asig.programa_id} disabled={!rowEditable || !programaHabilitado}
                                onChange={v => handleAsigChange(asig.id, 'programa_id', v)}
                                options={(() => {
                                  // Usar programas filtrados por CETAP si hay un CETAP seleccionado
                                  const cetapId = asig.cetap_id;
                                  // Si hay CETAP, mostrar estrictamente sus programas. Si está undefined (cargando) o vacío, mostrar vacío.
                                  // Solo mostramos 'programas' si por alguna razón extraña no hay cetap (aunque el select está disableado)
                                  const lista = cetapId ? (programasPorCetap[cetapId] || []) : programas;
                                  return lista.map(p => ({ value: p.id, label: `${p.nivel} - ${p.nombre}` }));
                                })()}
                                placeholder={programaHabilitado ? 'Seleccionar...' : 'Pendiente...'} />
                              <FormSelect label="Asignatura" value={asig.asignatura_id} disabled={!rowEditable || !asig.programa_id}
                                onChange={v => handleAsigChange(asig.id, 'asignatura_id', v)}
                                options={getAsignaturasFiltradas(asig.programa_id).map(a => ({ value: a.id, label: a.nombre }))}
                                placeholder={asig.programa_id ? 'Seleccionar...' : 'Pendiente...'} />
                            </div>

                            {/* Read-only Metrics Panel */}
                            {asig.asignatura_id && (
                              <div className="rounded-xl bg-slate-50 border border-slate-200/60 p-3 mb-4 transition-all duration-300">
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                                  {/* Núcleo Temático - Takes more space */}
                                  <div className="flex flex-col col-span-2 sm:col-span-3 lg:col-span-2">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-1">
                                      Núcleo Temático
                                    </span>
                                    <span className="text-[12px] font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-1.5 min-h-[34px] flex items-center shadow-sm truncate" title={displayNucleo}>
                                      {displayNucleo}
                                    </span>
                                  </div>
                                  
                                  {/* Smaller metric blocks */}
                                  <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-1 text-center">Semestre</span>
                                    <span className="text-[12px] font-bold text-slate-700 bg-white border border-slate-200 rounded-lg px-2 py-1.5 min-h-[34px] flex items-center justify-center shadow-sm">
                                      {displaySemestre}
                                    </span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-1 text-center">Créditos</span>
                                    <span className="text-[12px] font-bold text-slate-700 bg-white border border-slate-200 rounded-lg px-2 py-1.5 min-h-[34px] flex items-center justify-center shadow-sm">
                                      {displayCreditos}
                                    </span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-1 text-center">Horas Base</span>
                                    <span className="text-[12px] font-bold text-slate-700 bg-white border border-slate-200 rounded-lg px-2 py-1.5 min-h-[34px] flex items-center justify-center shadow-sm">
                                      {asig.horas_base}h
                                    </span>
                                  </div>
                                  
                                  {/* Total Horas Highlight */}
                                  <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-1 text-center">
                                      Total Horas
                                    </span>
                                    <span className={`text-[13px] font-extrabold rounded-lg px-2 py-1.5 min-h-[34px] flex items-center justify-center border shadow-sm ${
                                      tieneConflicto 
                                        ? 'bg-red-50 border-red-200 text-red-600 line-through' 
                                        : 'bg-blue-50/80 border-blue-200 text-blue-700'
                                    }`}>
                                      {asig.total_horas}h{tieneConflicto ? '*' : ''}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Additional Info: Dates & Students */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-1">
                              <FormInput label="Fecha inicio" type="date" value={asig.fecha_inicio || ''} disabled={!rowEditable}
                                min={periodoFechaMin}
                                max={periodoFechaMax}
                                onChange={v => handleAsigChange(asig.id, 'fecha_inicio', v)} />
                              <FormInput label="Fecha fin" type="date" value={asig.fecha_fin || ''} disabled={!rowEditable}
                                min={asig.fecha_inicio || periodoFechaMin}
                                max={periodoFechaMax}
                                onChange={v => handleAsigChange(asig.id, 'fecha_fin', v)} />
                              {/* Estudiantes: NO editable. Se rellena automáticamente con los
                                  cupos configurados por (CETAP, Programa) en Programas Académicos. */}
                              <FormInput label="Estudiantes (automático)" type="number" value={asig.total_estudiantes} disabled
                                onChange={() => { /* solo lectura: valor dinámico desde Programas Académicos */ }} />
                              
                              {/* Modalidad moved here to save space */}
                              {asig.asignatura_id && (
                                <div className="flex flex-col">
                                  <span className="block text-[10px] font-semibold text-slate-500 tracking-wider uppercase mb-1 ml-1">Modalidad</span>
                                  <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-[12px] font-semibold text-slate-700 min-h-[36px] flex items-center shadow-sm">
                                    {displayModalidad === 'PRESENCIAL' ? 'Presencial'
                                     : displayModalidad === 'VIRTUAL' ? 'Virtual'
                                     : displayModalidad === 'MIXTA' ? 'Mixta'
                                     : displayModalidad || 'Presencial'}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Observaciones */}
                            {rowEditable && (
                              <div className="mt-3 pt-3 border-t border-slate-100/80">
                                {!asig._showObs ? (
                                  <button
                                    type="button"
                                    onClick={() => handleAsigChange(asig.id, '_showObs', true)}
                                    className={`text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
                                      asig.observaciones
                                        ? 'border-blue-200 bg-blue-50 text-blue-700 shadow-sm'
                                        : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 shadow-sm'
                                    }`}
                                  >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                    {asig.observaciones ? `Observación: ${asig.observaciones.length}/50` : '+ Agregar Observación'}
                                  </button>
                                ) : (
                                  <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                                    <div className="flex items-center gap-2 mb-1">
                                      <label className="block text-[10px] font-semibold text-slate-500 tracking-wider uppercase ml-1">
                                        Observación ({ (asig.observaciones || '').length }/50)
                                      </label>
                                      <button onClick={() => handleAsigChange(asig.id, '_showObs', false)} className="text-slate-400 hover:text-slate-600">
                                        <XIcon className="w-3 h-3" />
                                      </button>
                                    </div>
                                    <input
                                      type="text"
                                      value={asig.observaciones || ''}
                                      disabled={!rowEditable}
                                      onChange={e => handleAsigChange(asig.id, 'observaciones', e.target.value.slice(0, 50))}
                                      placeholder="Ej: Grupo nocturno, requiere sala específica..."
                                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-[12px] font-medium text-slate-700 outline-none transition-all shadow-sm placeholder:text-slate-400"
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                            {!rowEditable && asig.observaciones && (
                              <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-600 flex items-start gap-2 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                                <MessageSquare className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                                <div>
                                  <span className="font-bold text-slate-700 block uppercase text-[9px] tracking-widest mb-0.5">Observación</span>
                                  {asig.observaciones}
                                </div>
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
            {hasDocencia && activeVisibleSection === 'investigacion' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <SectionHeader title="Investigación" subtitle={`${hInvestigacion}h programadas (máx ${Math.round(maxInvLimit)}h)`}
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
                            setInvProyecto({ nombre: '', codigo: '', grupo: '', linea: '', rol: '', horas_solicitadas: 0, fecha_inicio: '', fecha_fin: '', resolucion_nombre: '', resolucion_archivo: null, resolucion_archivo_url: '' });
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

                    {/* ── Resolución y soporte documental ── */}
                    <div className="mt-3 pt-3 border-t border-purple-200/60">
                      <div className="flex items-center gap-2 mb-2.5">
                        <FileCheck2 className="w-3.5 h-3.5 text-purple-600" />
                        <span className="text-xs font-bold text-purple-800 uppercase tracking-wide">Resolución que respalda la investigación</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <FormInput
                          label={`N° / Nombre de la Resolución${ptaRules?.inv_resolucion_obligatoria ? ' *' : ''}`}
                          value={invProyecto.resolucion_nombre}
                          disabled={!isEditable}
                          placeholder="Ej: Resolución No. 0234 de 2026"
                          onChange={v => setInvProyecto(p => ({ ...p, resolucion_nombre: v }))}
                        />
                        <div>
                          <label className="block text-[10px] font-semibold text-gray-500 tracking-wider uppercase mb-1 ml-1">
                            Archivo adjunto (Resolución){ptaRules?.inv_adjunto_obligatorio && <span className="text-red-500 ml-0.5">*</span>}
                          </label>
                          {invProyecto.resolucion_archivo || invProyecto.resolucion_archivo_url ? (
                            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-50 border border-green-200 min-h-[36px]">
                              <Paperclip className="w-3.5 h-3.5 text-green-600 shrink-0" />
                              <span className="text-xs text-green-800 font-medium truncate flex-1">
                                {invProyecto.resolucion_archivo?.name || invProyecto.resolucion_archivo_url || 'Archivo cargado'}
                              </span>
                              {isEditable && (
                                <button
                                  type="button"
                                  onClick={() => setInvProyecto(p => ({ ...p, resolucion_archivo: null, resolucion_archivo_url: '' }))}
                                  className="p-0.5 rounded hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors"
                                  title="Quitar archivo"
                                >
                                  <XIcon className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ) : (
                            <label className={`flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed min-h-[36px] transition-colors ${
                              isEditable
                                ? 'border-purple-300 bg-white shadow-sm hover:border-purple-400 hover:bg-purple-50/40 hover:shadow-md cursor-pointer'
                                : 'border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed'
                            }`}>
                              <FileUp className="w-4 h-4 text-purple-400" />
                              <span className="text-xs text-purple-500 font-medium">
                                {isEditable ? 'Seleccionar archivo PDF...' : 'Sin archivo'}
                              </span>
                              {isEditable && (
                                <input
                                  type="file"
                                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                                  className="hidden"
                                  onChange={e => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      setInvProyecto(p => ({ ...p, resolucion_archivo: file, resolucion_archivo_url: '' }));
                                    }
                                    e.target.value = '';
                                  }}
                                />
                              )}
                            </label>
                          )}
                          <p className="text-[9px] text-gray-400 mt-1 ml-1">PDF, DOC, DOCX, PNG, JPG (máx 10MB)</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actividades — modo depende de si se llenó el proyecto y si tiene rol */}
                  <div>
                    {invProyecto.rol ? (
                      /* ── MODO ROL: horas fijas, sin actividades ── */
                      invResolucionPendiente ? (
                        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-300">
                          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                          <div>
                            <p className="text-xs font-bold text-amber-800">Completa la documentación de resolución para habilitar las horas</p>
                            <p className="text-[10px] text-amber-600 mt-0.5">
                              {ptaRules?.inv_resolucion_obligatoria && !invProyecto.resolucion_nombre?.trim() ? 'Falta: N° / Nombre de la Resolución. ' : ''}
                              {ptaRules?.inv_adjunto_obligatorio && !invProyecto.resolucion_archivo && !invProyecto.resolucion_archivo_url ? 'Falta: Archivo adjunto.' : ''}
                            </p>
                          </div>
                        </div>
                      ) : (
                      <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-purple-100 border border-purple-300">
                        <span className="text-xs font-bold text-purple-700 uppercase tracking-wide">Horas asignadas por rol</span>
                        <span className="text-lg font-black text-purple-800">{rolesHorasMap[invProyecto.rol] || 0}h</span>
                      </div>
                      )
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
                        const cupoInv = Math.max(0, maxInvLimit - hInvestigacion);
                        if (cupoInv <= 0) return null;
                        return (
                          <button onClick={handleAddInvActividad}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border-none text-white text-xs font-semibold cursor-pointer"
                            style={{ background: PTA_COLORS.INVESTIGACION }}>
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
                      <div className="flex flex-col gap-3">
                        {invActividades.map((act, idx) => (
                          <div key={act.id} className={repeatedEntryCardClass(idx, 'investigacion')}>
                            <RepeatedEntryHeader index={idx} label="Actividad de investigación" color={PTA_COLORS.INVESTIGACION} />
                            {isEditable && (
                              <button type="button" onClick={() => setInvActividades(prev => prev.filter(a => a.id !== act.id))}
                                title={`Eliminar Actividad ${idx + 1}`}
                                aria-label={`Eliminar Actividad ${idx + 1}`}
                                className="absolute top-2 right-2 w-7 h-7 rounded-lg border border-red-200 bg-red-50 text-red-500 shadow-sm cursor-pointer flex items-center justify-center hover:bg-red-100 hover:border-red-300 hover:text-red-700 hover:shadow-md active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-red-500/40">
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
                                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white shadow-sm hover:border-purple-300 focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/15 disabled:bg-slate-100 disabled:border-slate-200 disabled:text-slate-500 disabled:shadow-none transition-all"
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
                                    const limiteMax = maxInvLimit;
                                    const otherActsSum = invActividades.filter(a => a.id !== act.id).reduce((sum, a) => sum + (a.horas_total || 0), 0);
                                    const remaining = Math.max(0, limiteMax - otherActsSum);
                                    if (val > remaining) val = remaining;
                                    setInvActividades(prev => prev.map(a =>
                                      a.id === act.id ? { ...a, horas_total: val, horas_unitarias: val, cantidad: 1 } : a
                                    ));
                                  }}
                                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white shadow-sm hover:border-purple-300 focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/15 disabled:bg-slate-100 disabled:border-slate-200 disabled:shadow-none text-right font-bold text-purple-700 transition-all"
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
                                min={periodoFechaMin || undefined}
                                max={periodoFechaMax || undefined}
                                onChange={v => setInvActividades(prev => prev.map(a =>
                                  a.id === act.id ? { ...a, fecha_inicio: v } : a
                                ))} />
                              <FormInput label="Fecha Fin" type="date" value={act.fecha_fin} disabled={!isEditable}
                                min={periodoFechaMin || undefined}
                                max={periodoFechaMax || undefined}
                                onChange={v => setInvActividades(prev => prev.map(a =>
                                  a.id === act.id ? { ...a, fecha_fin: v } : a
                                ))} />
                            </div>
                            {/* ── Resolución de la actividad ── */}
                            <div className="mt-1 pt-2 border-t border-purple-100/80">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                <FormInput
                                  label="N° / Nombre Resolución"
                                  value={act.resolucion_nombre || ''}
                                  disabled={!isEditable}
                                  placeholder="Ej: Res. 0234/2026"
                                  onChange={v => setInvActividades(prev => prev.map(a =>
                                    a.id === act.id ? { ...a, resolucion_nombre: v } : a
                                  ))}
                                />
                                <div>
                                  <label className="block text-[10px] font-semibold text-gray-500 tracking-wider uppercase mb-1 ml-1">
                                    Adjunto Resolución
                                  </label>
                                  {act.resolucion_archivo || act.resolucion_archivo_url ? (
                                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-50 border border-green-200 min-h-[36px]">
                                      <Paperclip className="w-3.5 h-3.5 text-green-600 shrink-0" />
                                      <span className="text-xs text-green-800 font-medium truncate flex-1">
                                        {act.resolucion_archivo?.name || act.resolucion_archivo_url || 'Archivo cargado'}
                                      </span>
                                      {isEditable && (
                                        <button type="button"
                                          onClick={() => setInvActividades(prev => prev.map(a =>
                                            a.id === act.id ? { ...a, resolucion_archivo: null, resolucion_archivo_url: '' } : a
                                          ))}
                                          className="p-0.5 rounded hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors"
                                          title="Quitar archivo">
                                          <XIcon className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  ) : (
                                    <label className={`flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed min-h-[36px] transition-colors ${
                                      isEditable ? 'border-purple-300 bg-white shadow-sm hover:border-purple-400 hover:bg-purple-50/40 hover:shadow-md cursor-pointer' : 'border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed'
                                    }`}>
                                      <FileUp className="w-4 h-4 text-purple-400" />
                                      <span className="text-xs text-purple-500 font-medium">
                                        {isEditable ? 'Adjuntar resolución...' : 'Sin archivo'}
                                      </span>
                                      {isEditable && (
                                        <input type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" className="hidden"
                                          onChange={e => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                              setInvActividades(prev => prev.map(a =>
                                                a.id === act.id ? { ...a, resolucion_archivo: file, resolucion_archivo_url: '' } : a
                                              ));
                                            }
                                            e.target.value = '';
                                          }} />
                                      )}
                                    </label>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      /* ── MODO CATÁLOGO: dropdown de actividades ── */
                      <div className="flex flex-col gap-3">
                        {invActividades.map((act, idx) => (
                          <div key={act.id} className={repeatedEntryCardClass(idx, 'investigacion')}>
                            <RepeatedEntryHeader index={idx} label="Actividad de investigación" color={PTA_COLORS.INVESTIGACION} />
                            {isEditable && (
                              <button type="button" onClick={() => setInvActividades(prev => prev.filter(a => a.id !== act.id))}
                                title="Eliminar Actividad de Investigación"
                                aria-label="Eliminar Actividad de Investigación"
                                className="absolute top-2 right-2 w-7 h-7 rounded-lg border border-red-200 bg-red-50 text-red-500 shadow-sm cursor-pointer flex items-center justify-center hover:bg-red-100 hover:border-red-300 hover:text-red-700 hover:shadow-md active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-red-500/40 text-xs">
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
                                min={periodoFechaMin || undefined}
                                max={periodoFechaMax || undefined}
                                onChange={v => handleInvActChange(act.id, 'fecha_inicio', v)} />
                              <FormInput label="Fecha Fin" type="date" value={act.fecha_fin} disabled={!isEditable}
                                min={periodoFechaMin || undefined}
                                max={periodoFechaMax || undefined}
                                onChange={v => handleInvActChange(act.id, 'fecha_fin', v)} />
                            </div>
                            {/* ── Resolución de la actividad ── */}
                            <div className="mt-1 pt-2 border-t border-gray-100">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                <FormInput
                                  label="N° / Nombre Resolución"
                                  value={act.resolucion_nombre || ''}
                                  disabled={!isEditable}
                                  placeholder="Ej: Res. 0234/2026"
                                  onChange={v => handleInvActChange(act.id, 'resolucion_nombre', v)}
                                />
                                <div>
                                  <label className="block text-[10px] font-semibold text-gray-500 tracking-wider uppercase mb-1 ml-1">
                                    Adjunto Resolución
                                  </label>
                                  {act.resolucion_archivo || act.resolucion_archivo_url ? (
                                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-50 border border-green-200 min-h-[36px]">
                                      <Paperclip className="w-3.5 h-3.5 text-green-600 shrink-0" />
                                      <span className="text-xs text-green-800 font-medium truncate flex-1">
                                        {act.resolucion_archivo?.name || act.resolucion_archivo_url || 'Archivo cargado'}
                                      </span>
                                      {isEditable && (
                                        <button type="button"
                                          onClick={() => setInvActividades(prev => prev.map(a =>
                                            a.id === act.id ? { ...a, resolucion_archivo: null, resolucion_archivo_url: '' } : a
                                          ))}
                                          className="p-0.5 rounded hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors"
                                          title="Quitar archivo">
                                          <XIcon className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  ) : (
                                    <label className={`flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed min-h-[36px] transition-colors ${
                                    isEditable ? 'border-purple-300 bg-white shadow-sm hover:border-purple-400 hover:bg-purple-50/40 hover:shadow-md cursor-pointer' : 'border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed'
                                    }`}>
                                      <FileUp className="w-4 h-4 text-purple-400" />
                                      <span className="text-xs text-purple-500 font-medium">
                                        {isEditable ? 'Adjuntar resolución...' : 'Sin archivo'}
                                      </span>
                                      {isEditable && (
                                        <input type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" className="hidden"
                                          onChange={e => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                              setInvActividades(prev => prev.map(a =>
                                                a.id === act.id ? { ...a, resolucion_archivo: file, resolucion_archivo_url: '' } : a
                                              ));
                                            }
                                            e.target.value = '';
                                          }} />
                                      )}
                                    </label>
                                  )}
                                </div>
                              </div>
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

            {/* ─── EXTENSIÓN (4 subsecciones fijas) ─── */}
            {hasDocencia && activeVisibleSection === 'extension' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <SectionHeader title="Extensión" subtitle={`${hExtension}h programadas (máx ${maxExtLimit}h)`}
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
                  {visibleExtSecciones.map(s => (
                    <button key={s.key} onClick={() => setExtSubseccion(s.key)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${currentExtSubseccion === s.key ? 'text-white border-transparent' : 'text-gray-600 border-gray-200 bg-white hover:bg-gray-50'}`}
                      style={{ background: currentExtSubseccion === s.key ? s.color : undefined }}>
                      {s.label} ({extActividades.filter(e => normalizeExtensionSectionKey(e.seccion) === s.key).length})
                    </button>
                  ))}
                </div>

                <div className="p-4 md:px-6 pb-6">
                  {(() => {
                    const secActual = visibleExtSecciones.find(s => s.key === currentExtSubseccion);
                    const secMult = secActual?.multiplicador || 1;
                    const actsSec = extActividades.filter(e => normalizeExtensionSectionKey(e.seccion) === currentExtSubseccion);
                    const horasEjecSec = actsSec.reduce((t, e) => t + (Number(e.horas_ejecutadas) || 0), 0);
                    const horasPtaSec = secMult > 1
                      ? horasEjecSec * secMult
                      : actsSec.reduce((t, e) => t + (Number(e.horas) || 0), 0);
                    const maxEjecSec = secMult > 1 ? Math.floor(maxExtLimit / secMult) : maxExtLimit;
                    return (
                  <div className="flex justify-between items-start mb-2 gap-2 flex-wrap">
                    <div className="flex flex-col gap-0.5">
                      <h4 className="text-sm font-bold text-gray-800">{secActual?.label}</h4>
                      {secMult > 1 ? (
                        <span className="text-xs text-emerald-700 font-semibold">
                          ×{secMult} — {horasEjecSec}h ejecutadas = <strong>{horasPtaSec}h PTA</strong>
                          <span className="ml-1 text-gray-400 font-normal">(máx {maxEjecSec}h ejecutadas)</span>
                        </span>
                      ) : horasPtaSec > 0 ? (
                        <span className="text-xs text-gray-500">{horasPtaSec}h programadas</span>
                      ) : null}
                    </div>
                    {isEditable && (() => {
                      const extRemaining = maxExtLimit - hExtension;
                      const hasConfiguredOptions = getExtCatalog(currentExtSubseccion)
                        .some((activity: any) => hasExtensionConfiguredHours(activity, secActual, horasAProgramar));
                      // Solo ocultar si se alcanzó el tope de extensión; el excedente
                      // del PTA total es informativo pero no bloquea agregar actividades.
                      if (extRemaining <= 0 || !hasConfiguredOptions) return null;
                      return (
                        <button onClick={() => handleAddExtActividad(currentExtSubseccion)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border-none text-white text-xs font-semibold cursor-pointer shrink-0" style={{ background: PTA_COLORS.EXTENSION }}>
                          <Plus className="w-3 h-3" /> Agregar
                        </button>
                      );
                    })()}
                  </div>
                    );
                  })()}


                  {extActividades.filter(e => normalizeExtensionSectionKey(e.seccion) === currentExtSubseccion).length === 0 ? (
                    <EmptyState icon={Globe} text={`Sin actividades de ${visibleExtSecciones.find(s => s.key === currentExtSubseccion)?.label}`} small />
                  ) : (
                    <div className="flex flex-col gap-3">
                      {extActividades.filter(e => normalizeExtensionSectionKey(e.seccion) === currentExtSubseccion).map((ext, extIdx) => {
                        const extSectionKey = normalizeExtensionSectionKey(ext.seccion);
                        const catExt = (actExtension?.[extSectionKey] || []).find((c: any) => c.id === ext.actividad_id);
                        const sectionConfig = extSecciones.find(s => s.key === extSectionKey);
                        const hasItemsExt = Boolean(catExt && extensionActivityUsesItems(sectionConfig, catExt));
                        const allExtCatalogItems = catExt ? getExtensionConfiguredHourRows(catExt, sectionConfig) : [];
                        const requiresRowSelection = Boolean(catExt && extensionRequiresRowSelection(
                          catExt,
                          sectionConfig,
                          horasAProgramar,
                          maxExtLimit,
                        ));
                        const extCatalogItems = catExt
                          ? getEffectiveExtensionRows(
                              catExt,
                              sectionConfig,
                              ext.fila_seleccionada,
                              horasAProgramar,
                              maxExtLimit,
                            )
                          : [];
                        const secMult = sectionConfig?.multiplicador || 1;
                        const rootHourType = getRootActivityHourType(catExt);
                        const extensionRowsNeedPositiveValue = extCatalogItems.length > 1
                          && extCatalogItems.some(row => extensionRowAllowsZero(row, extCatalogItems.length))
                          && Number(ext.horas || 0) <= 0;
                        return (
                          <div
                            key={ext.id}
                            className={repeatedEntryCardClass(extIdx, 'extension')}
                            style={{ borderLeftColor: sectionConfig?.color || PTA_COLORS.EXTENSION }}
                          >
                            <RepeatedEntryHeader
                              index={extIdx}
                              label="Actividad de extensión"
                              color={sectionConfig?.color || PTA_COLORS.EXTENSION}
                            />
                            {isEditable && (
                              <button type="button" onClick={() => setExtActividades(prev => prev.filter(e => e.id !== ext.id))}
                                title="Eliminar Actividad de Extensión"
                                aria-label="Eliminar Actividad de Extensión"
                                className="absolute top-2 right-2 w-7 h-7 rounded-lg border border-red-200 bg-red-50 text-red-500 shadow-sm cursor-pointer flex items-center justify-center hover:bg-red-100 hover:border-red-300 hover:text-red-700 hover:shadow-md active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-red-500/40">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                            {/* Selector de Actividad / Etapa */}
                            <div className="flex flex-col sm:flex-row gap-2 pr-8">
                              <div className="flex-1">
                                <FormSelect
                                  label={Array.isArray(sectionConfig?.columnas) && !sectionConfig.columnas.includes(EXT_ITEMS_COLUMN_KEY) ? 'Actividad' : 'Actividad / Etapa'}
                                  value={ext.actividad_id}
                                  disabled={!isEditable}
                                  onChange={v => handleExtActChange(ext.id, 'actividad_id', v)}
                                  options={getExtCatalog(currentExtSubseccion).filter((a: any) => {
                                    const optionSection = extSecciones.find(
                                      s => s.key === normalizeExtensionSectionKey(currentExtSubseccion),
                                    );
                                    // La disponibilidad del catálogo depende de que la configuración
                                    // tenga horas reales. El saldo restante se controla al editar y al
                                    // enviar; no debe ocultar una estructura normativa válida completa.
                                    return hasExtensionConfiguredHours(a, optionSection, horasAProgramar);
                                  }).map((a: any) => {
                                    const optionSection = extSecciones.find(s => s.key === normalizeExtensionSectionKey(currentExtSubseccion));
                                    const hasItems = extensionActivityUsesItems(optionSection, a);
                                    if (hasItems) {
                                      const configuredRows = getExtensionConfiguredHourRows(a, optionSection);
                                      const chooseSingleRow = extensionRequiresRowSelection(
                                        a,
                                        optionSection,
                                        horasAProgramar,
                                        maxExtLimit,
                                      );
                                      const totalPercentage = configuredRows.reduce((sum: number, it: any) =>
                                        it.tipo === 'porcentaje' ? sum + getPTAPercentage(it) : sum, 0);
                                      const totalHorasItems = configuredRows.reduce((s: number, it: any) => {
                                        if (it.tipo === 'porcentaje') return s + getPercentageHours(it, horasAProgramar);
                                        if (it.tipo === 'fija' || it.tipo === 'hasta') return s + (it.horas || 0);
                                        return s + (it.horas || 0); // por_unidad: 1 unidad base
                                      }, 0);
                                      const itemSummary = chooseSingleRow
                                        ? `selecciona una ${getExtensionRowDisplayLabel(optionSection).toLowerCase()}`
                                        : totalPercentage > 0
                                          ? `${totalPercentage}% PTA = ${totalHorasItems}h${configuredRows.some((it: any) => it.tipo !== 'porcentaje') ? ' con otras filas' : ''}`
                                          : `máx ${a.max_horas || totalHorasItems}h`;
                                      return { value: a.id, label: `${a.nombre} (${itemSummary})` };
                                    }
                                    const type = getRootActivityHourType(a);
                                    const maxPta = type === 'porcentaje'
                                      ? getPercentageHours(a, horasAProgramar)
                                      : Math.max(1, Number(a.max_horas) || 1);
                                    const minPta = Math.min(maxPta, Math.max(1, Number(a.min_horas) || 1));
                                    const maxExec = secMult > 1 ? maxPta / secMult : maxPta;
                                    const minExec = secMult > 1 ? minPta / secMult : minPta;
                                    const typeLabel = type === 'fija'
                                      ? `fija ${maxExec}h`
                                      : type === 'porcentaje'
                                        ? `${getPTAPercentage(a)}% PTA = ${maxPta}h`
                                      : type === 'intervalo'
                                        ? `${minExec}–${maxExec}h`
                                        : `hasta ${maxExec}h`;
                                    return {
                                      value: a.id,
                                      label: type === 'porcentaje'
                                        ? `${a.nombre} (${typeLabel})`
                                        : secMult > 1
                                        ? `${a.nombre} (${typeLabel} ejec. = ${maxPta}h PTA)`
                                        : `${a.nombre} (${typeLabel})`,
                                    };
                                  })}
                                  placeholder="Seleccionar..." />
                              </div>
                              {requiresRowSelection && (
                                <div className="flex-1 min-w-[260px]">
                                  <FormSelect
                                    label={getExtensionRowDisplayLabel(sectionConfig)}
                                    value={ext.fila_seleccionada === undefined ? '' : String(ext.fila_seleccionada)}
                                    disabled={!isEditable}
                                    onChange={v => handleExtActChange(ext.id, 'fila_seleccionada', v)}
                                    options={allExtCatalogItems
                                      .map((row: any, rowIndex: number) => ({ row, rowIndex }))
                                      .filter(({ row }) => extensionRowCanFit(row, horasAProgramar, maxExtLimit))
                                      .map(({ row, rowIndex }) => {
                                        const type = String(row?.tipo || 'fija').toLowerCase();
                                        const maxHours = type === 'porcentaje'
                                          ? getPercentageHours(row, horasAProgramar)
                                          : Math.max(0, Number(row?.horas) || 0);
                                        const minHours = Math.max(1, Number(row?.min ?? row?.horas_min) || 1);
                                        const hoursLabel = type === 'fija'
                                          ? `${maxHours}h fijas`
                                          : type === 'porcentaje'
                                            ? `${getPTAPercentage(row)}% PTA = ${maxHours}h`
                                            : type === 'intervalo'
                                              ? `${minHours}–${maxHours}h`
                                              : `hasta ${maxHours}h`;
                                        return {
                                          value: String(rowIndex),
                                          label: `${row.nombre} (${hoursLabel})`,
                                        };
                                      })}
                                    placeholder="Seleccionar una opción..."
                                  />
                                </div>
                              )}
                              {/* Para actividades PLANAS (sin items): mostrar inputs de horas como antes */}
                              {!hasItemsExt && (() => {
                                if (secMult > 1) {
                                  const configuredPtaHours = rootHourType === 'porcentaje'
                                    ? getPercentageHours(catExt, horasAProgramar)
                                    : Number(catExt?.max_horas || 0);
                                  const maxEjecCat = configuredPtaHours > 0 ? configuredPtaHours / secMult : undefined;
                                  const minEjecCat = rootHourType === 'intervalo'
                                    ? Math.max(1, Number(catExt?.min_horas) || 1) / secMult
                                    : (rootHourType === 'fija' ? maxEjecCat : 1);
                                  const maxEjecSec = Math.floor(maxExtLimit / secMult);
                                  const maxEjec = maxEjecCat !== undefined ? Math.min(maxEjecCat, maxEjecSec) : maxEjecSec;
                                  return (
                                    <>
                                      <div className="w-24">
                                        <FormInput label={rootHourType === 'porcentaje' ? `${getPTAPercentage(catExt)}% PTA` : 'Horas Ejec.'} type="number" value={ext.horas_ejecutadas || 0}
                                          min={minEjecCat} max={maxEjec} disabled={!isEditable || rootHourType === 'fija' || rootHourType === 'porcentaje'}
                                          onChange={v => handleExtActChange(ext.id, 'horas_ejecutadas', Number(v))} />
                                      </div>
                                      <div className="w-28">
                                        <ReadonlyField label="Horas PTA" value={`${ext.horas}h`} color={PTA_COLORS.EXTENSION} />
                                      </div>
                                    </>
                                  );
                                }
                                return (
                                  <>
                                    <div className="w-24">
                                      <FormInput label="Horas" type="number" value={ext.horas}
                                        min={rootHourType === 'porcentaje'
                                          ? getPercentageHours(catExt, horasAProgramar)
                                          : rootHourType === 'intervalo' ? (catExt?.min_horas || 1) : (rootHourType === 'fija' ? (catExt?.max_horas || 1) : 1)}
                                        max={rootHourType === 'porcentaje' ? getPercentageHours(catExt, horasAProgramar) : (catExt?.max_horas || maxExtLimit)}
                                        disabled={!isEditable || rootHourType === 'fija' || rootHourType === 'porcentaje'}
                                        onChange={v => handleExtActChange(ext.id, 'horas', Number(v))} />
                                    </div>
                                    <div className="w-28">
                                      <ReadonlyField label="Horas PTA" value={`${ext.horas}h`} color={PTA_COLORS.EXTENSION} />
                                    </div>
                                  </>
                                );
                              })()}
                              {hasItemsExt && (
                                <div className="w-28 shrink-0">
                                  <ReadonlyField label="Horas PTA" value={`${ext.horas}h`} color={PTA_COLORS.EXTENSION} />
                                </div>
                              )}
                            </div>

                            {/* Para etapas CON ÍTEMS: mostrar desglose por ítem */}
                            {hasItemsExt && (
                              <div className={`mt-1 rounded-lg border bg-white overflow-hidden ${extensionRowsNeedPositiveValue
                                ? 'border-red-300 ring-2 ring-red-100'
                                : 'border-sky-100'}`}>
                                <div className={`px-3 py-1.5 border-b ${extensionRowsNeedPositiveValue
                                  ? 'bg-red-50 border-red-200'
                                  : 'bg-sky-50 border-sky-100'}`}>
                                  <span className={`text-[10px] font-bold uppercase tracking-wide ${extensionRowsNeedPositiveValue ? 'text-red-700' : 'text-sky-600'}`}>
                                    Desglose de ítems
                                  </span>
                                </div>
                                <div className="p-3 space-y-2">
                                  {extCatalogItems.length === 0 && (
                                    <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-800">
                                      <AlertTriangle className="h-4 w-4 shrink-0" />
                                      {requiresRowSelection
                                        ? `Selecciona una ${getExtensionRowDisplayLabel(sectionConfig).toLowerCase()} para asignar únicamente sus horas.`
                                        : 'Esta etapa no tiene filas configuradas y no permite asignar horas hasta que se parametrice.'}
                                    </div>
                                  )}
                                  {extCatalogItems.map((item: any, iIdx: number) => {
                                    const itemTipo = (item.tipo || 'fija').toLowerCase();
                                    return (
                                    <div key={iIdx} className="flex items-start gap-3">
                                      <div className="flex-1 min-w-0 text-[12px] text-slate-600">
                                        <span className="font-semibold text-slate-700">{item.nombre}</span>
                                        {Array.isArray(item._detailGroups) && item._detailGroups.length > 0 && (
                                          <div className="mt-1.5 space-y-1 rounded-md border border-slate-100 bg-slate-50/70 px-2 py-1.5">
                                            {item._detailGroups.map((group: any, groupIndex: number) => (
                                              <div key={groupIndex} className="text-[10px] leading-relaxed text-slate-500">
                                                <span className="font-semibold text-slate-600">{group.name}</span>
                                                {Array.isArray(group.values) && group.values.map((detail: any, detailIndex: number) => (
                                                  <span key={detailIndex} className="ml-1">
                                                    · <span className="font-medium text-violet-600">{detail.column}:</span> {detail.value}
                                                  </span>
                                                ))}
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                      {itemTipo === 'porcentaje' ? (
                                        <span className="px-2.5 py-0.5 rounded-full bg-violet-50 border border-violet-200 text-violet-700 text-[11px] font-bold">
                                          {getPTAPercentage(item)}% PTA = {getPercentageHours(item, horasAProgramar)}h
                                        </span>
                                      ) : itemTipo === 'fija' ? (
                                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold">
                                          {item.horas}h fija
                                        </span>
                                      ) : itemTipo === 'hasta' ? (
                                        <div className="flex items-center gap-1.5 shrink-0">
                                          <span className="text-[11px] text-slate-400">Hasta {item.horas}h</span>
                                          <input type="number" min={extensionRowAllowsZero(item, extCatalogItems.length) ? 0 : 1} max={item.horas}
                                            value={(ext.items_cantidades || {})[iIdx] ?? (extensionRowAllowsZero(item, extCatalogItems.length) ? 0 : 1)}
                                            disabled={!isEditable}
                                            onChange={e => handleExtItemQtyChange(ext.id, iIdx, Number(e.target.value))}
                                            className="w-16 text-center border border-amber-300 rounded-md px-2 py-1 text-[12px] font-bold text-amber-700 shadow-sm hover:border-amber-400 focus:ring-4 focus:ring-amber-500/15 outline-none bg-white disabled:bg-slate-100 disabled:border-slate-200 disabled:text-slate-500 disabled:shadow-none transition-all" />
                                          <span className="text-[11px] font-semibold text-amber-700 min-w-[36px] text-right">
                                            = {((ext.items_cantidades || {})[iIdx] ?? (extensionRowAllowsZero(item, extCatalogItems.length) ? 0 : 1))}h
                                          </span>
                                        </div>
                                      ) : itemTipo === 'intervalo' ? (
                                        <div className="flex items-center gap-1.5 shrink-0">
                                          <span className="text-[11px] text-slate-400">{item.min ?? 1}–{item.horas}h</span>
                                          <input type="number" min={item.min ?? 1} max={item.horas}
                                            value={(ext.items_cantidades || {})[iIdx] ?? (item.min ?? 1)}
                                            disabled={!isEditable}
                                            onChange={e => handleExtItemQtyChange(ext.id, iIdx, Number(e.target.value))}
                                            className="w-16 text-center border border-indigo-300 rounded-md px-2 py-1 text-[12px] font-bold text-indigo-700 shadow-sm hover:border-indigo-400 focus:ring-4 focus:ring-indigo-500/15 outline-none bg-white disabled:bg-slate-100 disabled:border-slate-200 disabled:text-slate-500 disabled:shadow-none transition-all" />
                                          <span className="text-[11px] font-semibold text-indigo-700 min-w-[36px] text-right">
                                            = {((ext.items_cantidades || {})[iIdx] ?? (item.min ?? 1))}h
                                          </span>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-1.5 shrink-0">
                                          <input type="number" min={0}
                                            value={(ext.items_cantidades || {})[iIdx] || 0}
                                            disabled={!isEditable}
                                            onChange={e => handleExtItemQtyChange(ext.id, iIdx, Number(e.target.value))}
                                            className="w-16 text-center border border-sky-300 rounded-md px-2 py-1 text-[12px] font-bold text-sky-700 shadow-sm hover:border-sky-400 focus:ring-4 focus:ring-sky-500/15 outline-none bg-white disabled:bg-slate-100 disabled:border-slate-200 disabled:text-slate-500 disabled:shadow-none transition-all" />
                                          <span className="text-[11px] text-slate-400">
                                            uds. (×{item.horas}h)
                                          </span>
                                          <span className="text-[11px] font-semibold text-sky-700 min-w-[36px] text-right">
                                            = {((ext.items_cantidades || {})[iIdx] || 0) * (item.horas || 0)}h
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                    );
                                  })}
                                  {extensionRowsNeedPositiveValue && (
                                    <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-700">
                                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                                      <span>
                                        Esta actividad todavía suma 0h. Puedes dejar filas sin usar en 0, pero debes asignar al menos 1h en una de las opciones anteriores.
                                      </span>
                                    </div>
                                  )}
                                  {/* Fila de total */}
                                  {extCatalogItems.length > 0 && (
                                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                                      <span className="text-[11px] font-bold text-slate-500">Total PTA:</span>
                                      <span className="px-3 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[13px] font-bold border border-sky-200">
                                        {ext.horas}h
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Evidencias de la Etapa */}
                            {catExt && Array.isArray(catExt.evidencias) && catExt.evidencias.length > 0 && (
                              <div className="mt-1 rounded-lg border border-violet-100 bg-violet-50 overflow-hidden">
                                <div className="px-3 py-1.5 bg-violet-100/50 border-b border-violet-100">
                                  <span className="text-[10px] font-bold text-violet-700 uppercase tracking-wide">Evidencias requeridas</span>
                                </div>
                                <ul className="p-3 space-y-1">
                                  {catExt.evidencias.map((ev: string, evIdx: number) => (
                                    <li key={evIdx} className="flex items-start gap-2 text-[11px] text-violet-900">
                                      <span className="text-violet-400 mt-0.5">•</span>
                                      <span>{ev || 'Sin descripción'}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Descripción y Fechas */}
                            <div className="flex flex-col sm:flex-row gap-2">
                              <div className="flex-1">
                                <FormInput label="Descripción" type="text" value={ext.descripcion} disabled={!isEditable}
                                  placeholder="Solo letras..."
                                  onChange={v => handleExtActChange(ext.id, 'descripcion', v.replace(/[^a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]/g, ''))} />
                              </div>
                              <div className="w-36">
                                <FormInput label="Fecha Inicio" type="date" value={ext.fecha_inicio} disabled={!isEditable}
                                  min={periodoFechaMin || undefined}
                                  max={periodoFechaMax || undefined}
                                  onChange={v => handleExtActChange(ext.id, 'fecha_inicio', v)} />
                              </div>
                              <div className="w-36">
                                <FormInput label="Fecha Fin" type="date" value={ext.fecha_fin} disabled={!isEditable}
                                  min={periodoFechaMin || undefined}
                                  max={periodoFechaMax || undefined}
                                  onChange={v => handleExtActChange(ext.id, 'fecha_fin', v)} />
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


            {/* ─── COMPLEMENTARIAS: sub-tabs por sección (parametrizables desde config) ─── */}
            {activeVisibleSection === 'complementarias' && (
              <div className="flex flex-wrap gap-2 px-4 md:px-6 pt-5 pb-2">
                {compSecciones.map((s: any) => {
                  const count = s.key === COMP_SECCION_AADM ? academicoAdmin.length : complementarias.length;
                  return (
                    <button key={s.key} onClick={() => setComplementariasSubseccion(s.key)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${currentCompSubseccion === s.key ? 'text-white border-transparent' : 'text-gray-600 border-gray-200 bg-white hover:bg-gray-50'}`}
                      style={{ background: currentCompSubseccion === s.key ? s.color : undefined }}>
                      {s.label} ({count})
                    </button>
                  );
                })}
              </div>
            )}

            {/* ─── COMPLEMENTARIAS · Sub-sección: Complementarias a la Docencia ─── */}
            {activeVisibleSection === 'complementarias' && currentCompSubseccion === COMP_SECCION_DOCENCIA && (!hasDocencia ? (
              <div className="p-12 text-center flex flex-col items-center justify-center min-h-[300px] animate-in fade-in duration-300">
                <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mb-4 border border-amber-200">
                  <AlertTriangle className="w-8 h-8 text-amber-500" />
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-2">Requiere Docencia</h3>
                <p className="text-sm text-gray-500 max-w-md mx-auto leading-relaxed text-center">
                  Configure al menos una asignatura en <span className="font-bold text-[#003DA5]">Docencia Directa</span> para registrar actividades complementarias a la docencia. Las actividades <span className="font-semibold">Académico-Administrativas</span> del 100% pueden registrarse sin docencia en su sub-sección.
                </p>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <SectionHeader title="Actividades Complementarias a la Docencia" subtitle={`${hComplementarias}h programadas (máx ${maxCompLimit}h — ${ptaRules?.max_pct_complementarias || 25}% o ${ptaRules?.max_horas_complementarias_global ?? 200}h global, máx 17 act.)`}
                  color={PTA_COLORS.COMPLEMENTARIAS} icon={Briefcase} excede={compExcede}
                  action={(() => {
                    if (!isEditable || hasFullPTAActivity || complementarias.length >= 17) return undefined;
                    const cupoComp = Math.max(0, maxCompLimit - hComplementarias - hAcademicoAdmin);
                    // Solo ocultar si se alcanzó el tope de complementarias; excedente total es sólo informativo.
                    if (cupoComp <= 0) return undefined;
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
                    <div className="flex flex-col gap-3">
                      {complementarias.map((comp, compIdx) => {
                        const compCat = actComplementarias.find((a: any) => a.id === comp.actividad_id) || comp;
                        const compConstraint = getComplementariaConstraint(compCat, ptaRules, horasAProgramar);
                        const compRecognitionRows = getConfiguredRecognitionRows(compCat, horasAProgramar);

                        return (
                          <div key={comp.id} className={repeatedEntryCardClass(compIdx, 'complementarias')}>
                            <RepeatedEntryHeader
                              index={compIdx}
                              label="Actividad complementaria"
                              color={PTA_COLORS.COMPLEMENTARIAS}
                            />
                            {isEditable && (
                              <button type="button" onClick={() => setComplementarias(prev => prev.filter(c => c.id !== comp.id))}
                                title="Eliminar Actividad Complementaria"
                                aria-label="Eliminar Actividad Complementaria"
                                className="absolute top-2 right-2 w-7 h-7 rounded-lg border border-red-200 bg-red-50 text-red-500 shadow-sm cursor-pointer flex items-center justify-center hover:bg-red-100 hover:border-red-300 hover:text-red-700 hover:shadow-md active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-red-500/40">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                            <div className="flex flex-col sm:flex-row gap-2 pr-8">
                              <div className="flex-1">
                                <FormSelect label="Actividad" value={comp.actividad_id} disabled={!isEditable}
                                  onChange={v => handleCompChange(comp.id, 'actividad_id', v)}
                                  options={actComplementarias
                                    .filter(a => {
                                      if (!hasConfiguredCatalogHours(a, horasAProgramar)) return false;
                                      const isSindicato = String(a.nombre).toUpperCase().includes('SINDICATO');
                                      const optionConstraint = getComplementariaConstraint(a, ptaRules, horasAProgramar);
                                      const otherOrdinarySum = complementarias
                                        .filter(x => x.id !== comp.id && !String(x.nombre).toUpperCase().includes('SINDICATO'))
                                        .reduce((sum, x) => sum + (x.horas || 0), 0);
                                      const remainingLimit = isSindicato
                                        ? Infinity
                                        : Math.max(0, maxCompLimit - hAcademicoAdmin - otherOrdinarySum);
                                      const trueRemainingLimit = remainingLimit;

                                      if (comp.actividad_id === a.id) return true;
                                      return canSelectWithRemaining(optionConstraint, trueRemainingLimit);
                                    })
                                    .map(a => ({ value: a.id, label: `${a.nombre} (${getConstraintLabel(getComplementariaConstraint(a, ptaRules, horasAProgramar))})` }))}
                                  placeholder="Seleccionar actividad..." />
                              </div>
                              <div className="w-28">
                                {comp.actividad_id && compRecognitionRows.length <= 1 && compConstraint.editable ? (
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
                                  <ReadonlyField
                                    label={compConstraint.mode === 'percentage' ? `${compConstraint.percentage}% PTA` : 'Horas'}
                                    value={`${comp.horas}h`}
                                    color={PTA_COLORS.COMPLEMENTARIAS}
                                  />
                                )}
                              </div>
                            </div>
                            {comp.actividad_id && compRecognitionRows.length > 1 && (
                              <RecognitionRowsBreakdown
                                activity={compCat}
                                item={comp}
                                horasAProgramar={horasAProgramar}
                                disabled={!isEditable}
                                onChange={(rowIndex, value) => handleCompRowHoursChange(comp.id, rowIndex, value)}
                              />
                            )}
                            <div className="flex flex-col sm:flex-row gap-2">
                              <div className="flex-1">
                                <FormInput label="Descripción" type="text" value={comp.descripcion} disabled={!isEditable}
                                  placeholder="Solo letras..."
                                  onChange={v => handleCompChange(comp.id, 'descripcion', v.replace(/[^a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]/g, ''))} />
                              </div>
                              <div className="w-36">
                                <FormInput label="Fecha Inicio" type="date" value={comp.fecha_inicio} disabled={!isEditable}
                                  min={periodoFechaMin || undefined}
                                  max={periodoFechaMax || undefined}
                                  onChange={v => handleCompChange(comp.id, 'fecha_inicio', v)} />
                              </div>
                              <div className="w-36">
                                <FormInput label="Fecha Fin" type="date" value={comp.fecha_fin} disabled={!isEditable}
                                  min={periodoFechaMin || undefined}
                                  max={periodoFechaMax || undefined}
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
            ))}

            {/* ─── COMPLEMENTARIAS · Sub-sección: Académico-Administrativas ─── */}
            {activeVisibleSection === 'complementarias' && currentCompSubseccion === COMP_SECCION_AADM && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <SectionHeader
                  title="Actividades Académico-Administrativas"
                  subtitle={`${acadProrr}h programadas (topes definidos por actividad y soporte)`}
                  color={PTA_COLORS.ACAD_ADMIN} icon={Shield} excede={acadExcede}
                  action={isEditable && !hasFullPTAActivity && Math.min(
                    maxAadmLimit - hAcademicoAdmin,
                    maxCompLimit - hComplementarias - hAcademicoAdmin,
                  ) > 0 ? { label: 'Agregar Actividad', onClick: handleAddAcademicoAdmin } : undefined} />

                {!hasDocencia && (
                  <div className="mx-4 md:mx-6 mt-3 p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-sm flex items-start gap-2.5">
                    <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Sección en modo restringido:</span> Dado que no tiene asignaturas registradas en Docencia Directa, solo se permite registrar actividades de dedicación exclusiva al 100% (ej. Comisión de Estudios, Año Sabático). Configure asignaturas en Docencia para habilitar las actividades administrativas ordinarias.
                    </div>
                  </div>
                )}

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
                    <div className="flex items-start gap-3 p-3 mb-4 rounded-xl bg-blue-50 border border-blue-200 text-sm text-blue-900">
                      <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold mb-0.5">Actividad de dedicación exclusiva (100%)</p>
                        <p className="text-xs text-blue-800">«{actividadTotalidad.nombre}» ocupa el 100% de la bolsa de Investigación, Extensión y Complementarias ({horasAProgramar}h). Esas actividades incompatibles se limpiaron; Docencia permanece independiente y sus horas se suman como carga adicional.</p>
                      </div>
                    </div>
                  )}

                  {academicoAdmin.length === 0 ? (
                    <EmptyState icon={Shield} text="Sin actividades académico-administrativas"
                      sub="Comisiones, año sabático, cargos directivos, misiones profesorales, acreditación y organización doctoral" />
                  ) : (
                    <div className="flex flex-col gap-3">
                      {academicoAdmin.map((comp, acadIdx) => {
                        const acadCat = actAcadAdmin.find((a: any) => a.id === comp.actividad_id) || comp;
                        const acadConstraint = getAcademicoAdminConstraint(acadCat, ptaRules, horasAProgramar);
                        const acadConsumesFullPTA = isFullPTAActivity(acadCat);
                        const acadRecognitionRows = getConfiguredRecognitionRows(acadCat, horasAProgramar);

                        return (
                          <div
                            key={comp.id}
                            className={acadConsumesFullPTA
                              ? 'flex flex-col gap-3 p-3.5 md:p-4 rounded-xl border border-l-4 border-amber-300 border-l-amber-500 bg-amber-50/70 relative shadow-[0_2px_8px_rgba(15,23,42,0.06)] hover:shadow-[0_5px_16px_rgba(15,23,42,0.10)] transition-all duration-200'
                              : repeatedEntryCardClass(acadIdx, 'academico')}
                          >
                            <RepeatedEntryHeader
                              index={acadIdx}
                              label="Actividad académico-administrativa"
                              color={acadConsumesFullPTA ? '#D97706' : PTA_COLORS.ACAD_ADMIN}
                            />
                            {isEditable && (
                              <button type="button" onClick={() => setAcademicoAdmin(prev => prev.filter(c => c.id !== comp.id))}
                                title="Eliminar Actividad Académico-Administrativa"
                                aria-label="Eliminar Actividad Académico-Administrativa"
                                className="absolute top-2 right-2 w-7 h-7 rounded-lg border border-red-200 bg-red-50 text-red-500 shadow-sm cursor-pointer flex items-center justify-center hover:bg-red-100 hover:border-red-300 hover:text-red-700 hover:shadow-md active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-red-500/40">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                            <div className="flex flex-col sm:flex-row gap-2 pr-8">
                              <div className="flex-1">
                                <FormSelect label="Actividad" value={comp.actividad_id} disabled={!isEditable}
                                  onChange={v => handleAcadChange(comp.id, 'actividad_id', v)}
                                  options={actAcadAdmin
                                    .filter((a: any) => {
                                      if (!hasConfiguredCatalogHours(a, horasAProgramar)) return false;
                                      // Sin docencia solo se permiten actividades de dedicación exclusiva (100%).
                                      const isFull = isFullPTAActivity(a);
                                      if (!hasDocencia && !isFull) return false;
                                      if (isFull || comp.actividad_id === a.id) return true;
                                      const otherAcadSum = academicoAdmin
                                        .filter(item => item.id !== comp.id)
                                        .reduce((sum, item) => sum + (item.horas || 0), 0);
                                      const remaining = Math.max(0, Math.min(
                                        maxAadmLimit - otherAcadSum,
                                        maxCompLimit - hComplementarias - otherAcadSum,
                                      ));
                                      return canSelectWithRemaining(
                                        getAcademicoAdminConstraint(a, ptaRules, horasAProgramar),
                                        remaining,
                                      );
                                    })
                                    .map((a: any) => ({ value: a.id, label: isFullPTAActivity(a) ? `⚠ ${a.nombre} (100% PTA)` : `${a.nombre} (${getConstraintLabel(getAcademicoAdminConstraint(a, ptaRules, horasAProgramar))})` }))}
                                  placeholder="Seleccionar actividad..." />
                              </div>
                              <div className="w-32">
                                {comp.actividad_id && acadRecognitionRows.length <= 1 && acadConstraint.editable ? (
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
                                  <ReadonlyField label="Horas" value={acadConsumesFullPTA ? `${horasAProgramar}h (100%)` : `${comp.horas}h`} color={acadConsumesFullPTA ? '#B45309' : PTA_COLORS.ACAD_ADMIN} />
                                )}
                              </div>
                            </div>
                            {comp.actividad_id && acadRecognitionRows.length > 1 && (
                              <RecognitionRowsBreakdown
                                activity={acadCat}
                                item={comp}
                                horasAProgramar={horasAProgramar}
                                disabled={!isEditable}
                                onChange={(rowIndex, value) => handleAcadRowHoursChange(comp.id, rowIndex, value)}
                              />
                            )}
                            <div className="flex flex-col sm:flex-row gap-2">
                              <div className="flex-1">
                                <FormInput
                                  label={(acadConsumesFullPTA || actAcadAdmin.find((a: any) => a.id === comp.actividad_id)?.nombre?.includes('Misiones')) ? "Número de Acto Administrativo / Comunicación Oficial *" : "Descripción"}
                                  type="text" value={comp.descripcion} disabled={!isEditable}
                                  placeholder={(acadConsumesFullPTA || actAcadAdmin.find((a: any) => a.id === comp.actividad_id)?.nombre?.includes('Misiones')) ? "Requerido: Escriba el radicado de soporte..." : "Solo letras..."}
                                  onChange={v => handleAcadChange(comp.id, 'descripcion', (acadConsumesFullPTA || actAcadAdmin.find((a: any) => a.id === comp.actividad_id)?.nombre?.includes('Misiones')) ? v : v.replace(/[^a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]/g, ''))} />
                              </div>
                              <div className="w-36">
                                <FormInput label="Fecha Inicio" type="date" value={comp.fecha_inicio} disabled={!isEditable}
                                  min={periodoFechaMin || undefined}
                                  max={periodoFechaMax || undefined}
                                  onChange={v => handleAcadChange(comp.id, 'fecha_inicio', v)} />
                              </div>
                              <div className="w-36">
                                <FormInput label="Fecha Fin" type="date" value={comp.fecha_fin} disabled={!isEditable}
                                  min={periodoFechaMin || undefined}
                                  max={periodoFechaMax || undefined}
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

            {/* Component limit warnings */}
            {hasBlockingHourLimits && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
                <div className="font-bold mb-1.5 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> Limites de horas excedidos
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {componentLimitViolations.map(v => (
                    <span key={v.section}>{v.label}: {v.hours}h / {v.limit}h</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        </div>{/* cierra Active section bg-white */}
            </div>{/* cierra contenido principal flex-1 */}
          </div>{/* cierra wrapper layout columna */}

      {/* ─── STICKY FOOTER ─── (fixed al viewport en portal; sticky dentro del modal en edición admin) */}
      <div className={`${isAdminEdit ? 'sticky -mx-6 rounded-b-2xl' : 'fixed left-0 right-0'} bottom-0 z-50 bg-white/90 backdrop-blur-2xl border-t border-gray-200/50 p-4 px-6 md:px-8 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]`} style={{borderTop: '1px solid darkgray'}}>
        <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto w-full">
          {/* Status compacto */}
          <div className={`hidden sm:flex items-center gap-3 px-4 py-2.5 rounded-2xl border ${hasBlockingHourLimits ? 'bg-red-50/80 border-red-200 text-red-800' : totalHoras >= horasAProgramar ? 'bg-green-50/80 border-green-200 text-green-800' : 'bg-blue-50/80 border-blue-200 text-blue-800'}`}>
            {hasBlockingHourLimits ? <AlertCircle className="w-4 h-4 shrink-0" /> : totalHoras >= horasAProgramar ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <Info className="w-4 h-4 shrink-0" />}
            <div className="flex flex-col">
              <span className="text-[12px] font-bold leading-tight">
                {hasBlockingHourLimits ? 'Limite excedido' : totalHoras >= horasAProgramar ? 'Horas completas' : `Faltan ${horasAProgramar - totalHoras}h`}
              </span>
              <span className="text-[10px] font-medium opacity-80">{totalHoras}h / {horasAProgramar}h ({porcentaje}%)</span>
            </div>
          </div>

          <div className="flex-1" />

          {isEditable && (
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
              {/* Auto-guardado */}
              {!isAdminEdit && (
                <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-medium"
                  style={{ color: autoSaveStatus === 'saving' ? '#D97706' : autoSaveStatus === 'saved' ? '#059669' : '#9CA3AF' }}>
                  {autoSaveStatus === 'saving' && (
                    <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                  )}
                  {autoSaveStatus === 'saved' && <CheckCircle2 className="w-3 h-3" />}
                  {autoSaveStatus === 'saving' && 'Guardando...'}
                  {autoSaveStatus === 'saved' && `Guardado a las ${lastAutoSaveTime?.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) ?? ''}`}
                  {autoSaveStatus === 'idle' && lastAutoSaveTime && `Guardado a las ${lastAutoSaveTime.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`}
                </div>
              )}

              {isAdminEdit ? (
                <button onClick={() => handleSave(false)} disabled={saving}
                  className="flex items-center justify-center gap-1.5 px-5 py-2 min-h-[36px] rounded-xl border-none text-white text-xs font-bold shadow-[0_4px_14px_0_rgba(0,61,165,0.39)] hover:bg-[#003185] active:scale-95 transition-all duration-300 disabled:opacity-50"
                  style={{ background: '#003DA5' }}>
                  <Save className="w-3.5 h-3.5" /> {saving ? 'Guardando...' : 'Concertar'}
                </button>
              ) : esDevolucionComponentes ? (
                // Devolución por componente: solo corregir y re-enviar (no se puede
                // "avanzar sin cambios" un componente que el revisor devolvió).
                <button onClick={() => {
                  if (!respuestasDevolucionCompletas) {
                    toast.error('Debes explicar tu respuesta para cada componente devuelto antes de reenviar.');
                    return;
                  }
                  solicitarFirmaDocente('via_save');
                }}
                  disabled={saving || requestingFirmaCode || hasBlockingHourLimits}
                  className="flex items-center justify-center gap-1.5 px-5 py-2 min-h-[36px] rounded-xl border-none text-white text-xs font-bold active:scale-95 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: (saving || requestingFirmaCode || hasBlockingHourLimits) ? '#9CA3AF' : '#D97706' }}>
                  <RotateCcw className="w-3.5 h-3.5" /> Corregir y re-enviar
                </button>
              ) : isEnRevisionDocente ? (
                <>
                  <button onClick={() => solicitarFirmaDocente('avanzar_sin_cambios')} disabled={saving || requestingFirmaCode}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 min-h-[36px] rounded-xl border border-gray-200/80 bg-white/80 backdrop-blur-sm text-gray-700 text-xs font-bold shadow-sm hover:bg-gray-50 active:scale-95 transition-all duration-300 disabled:opacity-50">
                    <Send className="w-3.5 h-3.5" /> Avanzar sin cambios
                  </button>
                  <button onClick={() => solicitarFirmaDocente('via_save')}
                    disabled={saving || requestingFirmaCode || hasBlockingHourLimits}
                    className="flex items-center justify-center gap-1.5 px-5 py-2 min-h-[36px] rounded-xl border-none text-white text-xs font-bold active:scale-95 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: (saving || requestingFirmaCode || hasBlockingHourLimits) ? '#9CA3AF' : '#7C3AED' }}>
                    <RotateCcw className="w-3.5 h-3.5" /> Corregir y re-enviar
                  </button>
                </>
              ) : (
                <>
                  <span className={`hidden sm:flex items-center gap-0.5 text-[10px] font-medium ${autoSaveCountdown <= 30 ? 'text-amber-500' : 'text-gray-400'}`}>
                    <Clock className="w-2.5 h-2.5" />
                    Auto en {Math.floor(autoSaveCountdown / 60)}:{String(autoSaveCountdown % 60).padStart(2, '0')}
                  </span>
                  <button onClick={() => handleSave(false)} disabled={saving}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 min-h-[36px] rounded-xl border border-gray-200/80 bg-white/80 backdrop-blur-sm text-gray-700 text-xs font-bold shadow-sm hover:bg-gray-50 active:scale-95 transition-all duration-300 disabled:opacity-50">
                    <Save className="w-3.5 h-3.5" /> Guardar Borrador
                  </button>
                  <button
                    onClick={() => { if (!validateEnvioDocente()) return; solicitarFirmaDocente('via_save'); }}
                    disabled={saving || requestingFirmaCode || hasBlockingHourLimits}
                    className="flex items-center justify-center gap-1.5 px-5 py-2 min-h-[36px] rounded-xl border-none text-white text-xs font-bold shadow-[0_4px_14px_0_rgba(0,61,165,0.39)] hover:bg-[#003185] active:scale-95 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                    style={{ background: (saving || requestingFirmaCode || hasBlockingHourLimits) ? '#9CA3AF' : '#003DA5' }}>
                    {requestingFirmaCode ? <><Clock className="w-3.5 h-3.5" /> Enviando...</>
                      : originalEstado === 'Devuelto' ? <><RotateCcw className="w-3.5 h-3.5" /> Re-enviar</>
                      : <><Send className="w-3.5 h-3.5" /> Enviar a Aprobación</>}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
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

function RecognitionRowsBreakdown({
  activity,
  item,
  horasAProgramar,
  disabled,
  onChange,
}: {
  activity: any;
  item: ComplementariaItem;
  horasAProgramar: number;
  disabled: boolean;
  onChange: (rowIndex: number, value: number) => void;
}) {
  const rows = getConfiguredRecognitionRows(activity, horasAProgramar);
  if (rows.length <= 1) return null;
  const rowsNeedPositiveValue = rows.some(row => {
    const constraint = getRecognitionRowConstraint(row, rows.length, horasAProgramar);
    return constraint?.mode === 'upto' && constraint.min === 0;
  }) && Number(item.horas || 0) <= 0;

  return (
    <div className={`mt-1 rounded-lg border bg-white overflow-hidden ${rowsNeedPositiveValue
      ? 'border-red-300 ring-2 ring-red-100'
      : 'border-sky-100'}`}>
      <div className={`px-3 py-1.5 border-b ${rowsNeedPositiveValue
        ? 'bg-red-50 border-red-200'
        : 'bg-sky-50 border-sky-100'}`}>
        <span className={`text-[10px] font-bold uppercase tracking-wide ${rowsNeedPositiveValue ? 'text-red-700' : 'text-sky-600'}`}>
          Desglose de ítems
        </span>
      </div>
      <div className="p-3 space-y-2">
        {rows.map((row: any, rowIndex: number) => {
          const constraint = getRecognitionRowConstraint(row, rows.length, horasAProgramar)!;
          const rowKey = getRecognitionRowKey(row, rowIndex);
          const storedValue = item.filas_cantidades?.[rowKey]
            ?? item.items_cantidades?.[rowIndex]
            ?? (constraint.editable ? constraint.min : constraint.max);
          return (
            <div key={rowKey} className="flex items-center gap-3">
              <div className="flex-1 min-w-0 text-[12px] text-slate-600">
                <span className="font-semibold text-slate-700">{row.nombre || `Fila ${rowIndex + 1}`}</span>
              </div>
              {constraint.mode === 'percentage' ? (
                <span className="px-2.5 py-0.5 rounded-full bg-violet-50 border border-violet-200 text-violet-700 text-[11px] font-bold">
                  {constraint.percentage}% PTA = {storedValue}h
                </span>
              ) : constraint.mode === 'fixed' ? (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold">
                  {storedValue}h fija
                </span>
              ) : (
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[11px] text-slate-400">
                    {constraint.mode === 'range' ? `${constraint.min}–${constraint.max}h` : `Hasta ${constraint.max}h`}
                  </span>
                  <input
                    type="number"
                    min={constraint.min}
                    max={constraint.max}
                    value={storedValue}
                    disabled={disabled}
                    onChange={event => onChange(rowIndex, Number(event.target.value))}
                    className={`w-16 text-center border rounded-md px-2 py-1 text-[12px] font-bold shadow-sm focus:ring-4 outline-none bg-white disabled:bg-slate-100 disabled:border-slate-200 disabled:text-slate-500 disabled:shadow-none transition-all ${constraint.mode === 'range'
                      ? 'border-indigo-300 text-indigo-700 hover:border-indigo-400 focus:ring-indigo-500/15'
                      : 'border-amber-300 text-amber-700 hover:border-amber-400 focus:ring-amber-500/15'}`}
                  />
                  <span className={`text-[11px] font-semibold min-w-[36px] text-right ${constraint.mode === 'range' ? 'text-indigo-700' : 'text-amber-700'}`}>
                    = {storedValue}h
                  </span>
                </div>
              )}
            </div>
          );
        })}
        {rowsNeedPositiveValue && (
          <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-700">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              Esta actividad todavía suma 0h. Puedes dejar filas sin usar en 0, pero debes asignar al menos 1h en una de las opciones anteriores.
            </span>
          </div>
        )}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <span className="text-[11px] font-bold text-slate-500">Total PTA:</span>
          <span className="px-3 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[13px] font-bold border border-sky-200">
            {item.horas}h
          </span>
        </div>
      </div>
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
          className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white hover:border-blue-300 hover:shadow-md focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 text-[12px] font-semibold text-slate-800 outline-none disabled:bg-slate-100 disabled:border-slate-200 disabled:text-slate-500 disabled:shadow-none disabled:cursor-not-allowed transition-all duration-200 shadow-sm cursor-pointer appearance-none min-h-[36px]">
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
        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white hover:border-blue-300 hover:shadow-md focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 text-[12px] font-semibold text-slate-800 outline-none disabled:bg-slate-100 disabled:border-slate-200 disabled:text-slate-600 disabled:shadow-none disabled:cursor-not-allowed transition-all duration-200 shadow-sm placeholder:text-slate-400 min-h-[36px]" />
    </div>
  );
}

function ReadonlyField({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col">
      <label className="block text-[10px] font-semibold text-gray-500 tracking-wider uppercase mb-1 ml-1">{label}</label>
      <div className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 text-[12px] font-semibold text-slate-700 flex items-center min-h-[36px] shadow-sm cursor-not-allowed select-none transition-all"
        style={{ color: color || '#374151' }}>
        {value}
      </div>
    </div>
  );
}
