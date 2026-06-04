/**
 * Wizard y Dashboard del Plan Anual de Auditoría
 * Componentes complementarios para PlanAnualAuditoriaDefinitivo.tsx
 * v2.0 - Con soporte para puntos de control
 */

import { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback, useId, type MouseEvent, type WheelEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, ArrowRight, Check, Shield, Users, CheckCircle2, 
  TrendingUp, FileCheck, AlertCircle, AlertTriangle, BookOpen, Download, FileText,
  Paperclip, Upload, Trash2, X, Eye, Plus, CalendarClock, Loader2, FileSpreadsheet, RefreshCw, Settings,
  ChevronDown, ChevronUp, Calendar, Clock, Search, Edit3, GripVertical, Lock, Save, Bell
} from 'lucide-react';
import { toast } from 'sonner';
import { ModalGestionAdjuntos } from './ModalGestionAdjuntosActividades';
import { SemaforoSeguimientoPAI } from '../plan-anual-auditoria/components/SemaforoSeguimientoPAI';
import {
  calcularAvanceActividad,
  calcularAvancePromedioActividades,
  calcularPorcentajeCortes,
  corteEstaCumplido,
  normalizarTareasConCortes,
  estadoActividadDesdePorcentaje,
  estadoBackendDesdePorcentaje,
  textoEvaluacionDesdeAvance,
  resumenEvidenciasObservacionesTareas,
} from '../utils/avancePlanAnual';
import { ConfiguracionEvidencias, CONFIGURACIONES_PREDEFINIDAS } from './SistemaEvidenciasActividades';
import { 
  ModalConfiguracionPuntosControl, 
  type PuntoControl, 
  type FrecuenciaPuntoControl 
} from './ModalConfiguracionPuntosControl';
import { ModalFirmaOTP, type FirmaElectronicaMetadata } from './ModalFirmaOTP';

// a️ IMPORTACIN OBLIGATORIA DE REGLAS DE NEGOCIO Y CUMPLIMIENTO NORMATIVO
import { REGLAS_NEGOCIO_OCIG } from '../config/reglas-negocio-ocig';
import { createPortal } from 'react-dom';
// Hook para sincronizar evidencias con backend y API de auditores
import { useSaveEvidencias, actividadesApi, planAnualApi, type CreateActividadDto } from './services/plan-anual';
import { configuracionesProfesionalesOCIApi } from './services/api';
// Servicio para vinculación de auditorías con Rol 4
import { controlInternoService } from '../../../services/api/controlInternoService';
import { apiClient } from '../../../services/api/apiClient';
import { useControlInternoPermissions } from './hooks/useControlInternoPermissions';
import { cargarConfiguracionPDF } from './utils/configuracionHelper';
import { 
  dibujarEncabezadoInstitucional, 
  dibujarPieInstitucional, 
  DOCUMENTOS_PREDEFINIDOS,
  LOGO_ESAP_URL
} from './services/pdfESAPHeader';
// S& NUEVO: Exportación Excel con logo
import { exportarPlanAnualExcel, COLUMNAS_DISPONIBLES } from './services/exportarPlanAnualExcel';
import { exportarCertificadoAprobacionPDF } from './services/exportarCertificadoPDF';
import { idPersonaParaPlanAnual, type ReferenciaPersonaPlan } from '../utils/persona-id-plan-anual';

// Tipos re-exportados (deben coincidir con el archivo principal)
type EstadoPlan = 'BORRADOR' | 'EN_REVISION' | 'APROBADO' | 'VIGENTE' | 'CERRADO' | 'DEVUELTO';

type EstadoActividad = 'PENDIENTE' | 'EN_EJECUCION' | 'COMPLETADA';

interface Auditor {
  id: string;
  nombre: string;
  cargo: string;
  email: string;
  /** id_person (auth.personas); igual que id cuando viene de profesionales OCI */
  idPerson?: string;
  idTercero?: string;
  configId?: string;
}

const NOMBRES_PERSONA_INVALIDOS = new Set(['usuario sin nombre', 'sin nombre']);

/** Plan en estado borrador (editable en el wizard; no bloquea la vigencia). */
export function esEstadoPlanBorrador(estado?: string | null): boolean {
  const e = String(estado ?? '')
    .toLowerCase()
    .replace(/_/g, '-')
    .trim();
  return e === 'borrador';
}

function nombreProfesionalOCIVisible(nombre?: string | null): boolean {
  const n = String(nombre || '').trim();
  if (!n) return false;
  return !NOMBRES_PERSONA_INVALIDOS.has(n.toLowerCase());
}

function inicialesDesdeNombre(nombre: string): string {
  return nombre
    .split(' ')
    .filter(Boolean)
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function BotonQuitarResponsable({
  onClick,
  soloLectura = false,
}: {
  onClick: (e: MouseEvent) => void;
  soloLectura?: boolean;
}) {
  if (soloLectura) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-[10px] font-semibold text-red-700 bg-white border border-red-200 rounded px-1.5 py-0.5 hover:bg-red-50 transition-colors flex-shrink-0"
    >
      Quitar
    </button>
  );
}

/** Mismo chip que antes; solo «Quitar» va fuera, al final de la fila. */
function FilaResponsableAsignado({
  nombre,
  rolColor,
  onQuitar,
  className = '',
  soloLectura = false,
}: {
  nombre: string;
  rolColor?: string;
  onQuitar: () => void;
  className?: string;
  soloLectura?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-1.5 w-full ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 flex-1 min-w-0 ${
        soloLectura ? 'bg-slate-100 border border-slate-300' : 'bg-blue-50 border border-blue-200'
      }`}>
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
          style={{ backgroundColor: rolColor || '#2563eb' }}
        >
          {inicialesDesdeNombre(nombre)}
        </div>
        <span className="text-sm font-medium text-gray-900 truncate flex-1">{nombre}</span>
      </div>
      <BotonQuitarResponsable
        soloLectura={soloLectura}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onQuitar();
        }}
      />
    </div>
  );
}

function filtrarAuditoresParaAsignacion(auditores: Auditor[]): Auditor[] {
  return auditores.filter((a) => nombreProfesionalOCIVisible(a.nombre));
}

function mapearAprobadoresPlanAnualDesdeApi(data: any[]): Auditor[] {
  const seen = new Set<string>();
  const result: Auditor[] = [];
  for (const p of data) {
    const id = String(p.idTercero || p.id || '').trim();
    if (!id || seen.has(id)) continue;
    const nombre = String(p.nombre || '').trim();
    if (!nombreProfesionalOCIVisible(nombre)) continue;
    seen.add(id);
    result.push({
      id,
      nombre,
      cargo: p.cargo || p.roles?.[0] || 'Aprobador plan anual',
      email: p.email || '',
    });
  }
  return result;
}

async function cargarListaAprobadoresComite(): Promise<Auditor[]> {
  const response = await configuracionesProfesionalesOCIApi.getAprobadoresPlanAnual();
  if (response.success && response.data?.length) {
    return mapearAprobadoresPlanAnualDesdeApi(response.data);
  }
  return [];
}

function mapearProfesionalesOCIGDesdeApi(data: any[]): Auditor[] {
  const seen = new Set<string>();
  const result: Auditor[] = [];
  for (const config of data) {
    if (config?.activo === false) continue;
    if (!nombreProfesionalOCIVisible(config.nombre)) continue;
    const id = String(config.idTercero || config.id_tercero || '').trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    result.push({
      id,
      idPerson: id,
      idTercero: id,
      nombre: String(config.nombre).trim(),
      cargo: config.rolOcig || config.rolOCI || config.cargo || 'Auditor',
      email: config.email || '',
      configId: config.id,
    });
  }
  return result;
}

// Tarea de seguimiento estructurada
interface TareaSeguimiento {
  id: string;
  descripcion: string;
  completada: boolean;
  fechaCompletado?: string;
  responsables?: string[];
  observaciones?: string;
  // S& Requisitos por tarea (antes estaban al nivel de actividad)
  requiereObservaciones?: boolean;
  requiereAdjuntos?: boolean;
  adjuntosTarea?: { nombre: string; url: string; fecha: string }[];
  // S& Fecha de entrega opcional
  fechaEntrega?: string;
  // S& Evaluación por el responsable
  evaluada?: boolean;
  aceptada?: boolean;
  observacionesEvaluacion?: string;
  fechaEvaluacion?: string;
  // S& Vinculación a punto de control (corte) específico
  puntoControlId?: string;
}

interface Actividad {
  id: number | string;
  nombre: string;
  descripcion: string;
  fechaInicio: string;
  fechaFin: string;
  responsable: Auditor | null; // RESPONSABLE PRINCIPAL - Asignado en la programación (no modificable en seguimiento)
  responsablesApoyo?: Auditor[]; // Responsables adicionales agregados como apoyo en el seguimiento
  porcentajeAvance: number;
  estado: EstadoActividad;
  control: string;
  evaluacion: string;
  seguimiento: string;
  tareasSeguimiento?: TareaSeguimiento[];
  adjuntos?: ArchivoAdjunto[]; // Archivos adjuntos para evidencia de cumplimiento
  observacionesCumplimiento?: ObservacionCumplimiento[] | string; // FLEXIBILIDAD: array para múltiples o string simple
  
  // """""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
  // CONFIGURACIN DE EVIDENCIAS - Define si adjuntos/observaciones son requeridos
  // """""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
  configuracionEvidencias?: ConfiguracionEvidencias;
  
  // Sistema de autorización del Jefe OCI - Configurado en creación del plan
  requiereAutorizacionJefeOCI?: boolean; // Indica si requiere autorización del Jefe OCI para completar
  autorizadaPorJefeOCI?: boolean; // Indica si fue autorizada por el Jefe OCI
  fechaAutorizacion?: string; // Fecha de autorización del Jefe OCI
  observacionesJefeOCI?: string; // Observaciones del Jefe OCI al autorizar
  
  // Sistema de verificación del Director (legacy)
  requiereVerificacionDirector: boolean; // Indica si requiere verificación del Director OCI
  verificadaPorDirector?: boolean; // Indica si fue verificada por el Director
  fechaVerificacion?: string; // Fecha de verificación del Director
  observacionesDirector?: string; // Observaciones del Director al verificar
  
  // S& NUEVO: Sistema de puntos de control
  puntosControl?: PuntoControl[]; // Puntos de control configurados
  frecuenciaPuntosControl?: FrecuenciaPuntoControl; // Frecuencia configurada

  // S& NUEVO: Entradas de seguimiento vinculadas a puntos de control
  entradasSeguimiento?: EntradaSeguimiento[];

  // Soft delete
  activo?: boolean;

  /** Origen del %: manual, auditorías (backend) o planes de mejoramiento */
  tipoCalculo?: 'manual' | 'auditorias' | 'planes_mejoramiento';
  totalAuditoriasProgramadas?: number;
  totalAuditoriasFinalizadas?: number;
}

interface EntradaSeguimiento {
  id: string;
  puntoControlId: string;   // ID del punto de control (pc-auto-1, etc.)
  fechaRegistro: string;    // ISO date  se compara con fechaProgramada del corte
  registradoPor: string;
  usuarioId?: string;
  texto?: string;           // observación escrita (opcional)
  archivos?: Array<{        // evidencias adjuntas (opcional)
    nombre: string;
    url: string;
    tipo: string;
    tamanio: number;
  }>;
  tipo: 'seguimiento' | 'hallazgo' | 'cierre';
}

interface ArchivoAdjunto {
  id: string;
  nombre: string;
  tipo: string;
  tamaño: number;
  fechaCarga: string;
  cargadoPor: string;
  url?: string;
}

interface ObservacionCumplimiento {
  id: string;
  texto: string;
  fechaRegistro: string;
  registradoPor: string;
}

// """""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
// FUNCIONES HELPER - Manejar diferentes formatos de datos
// """""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""

/**
 * Obtiene el conteo correcto de observaciones
 * Maneja tanto string (del backend) como array (del frontend)
 */
function escapeHtml(s: string): string {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function contarObservaciones(obs: ObservacionCumplimiento[] | string | undefined): number {
  if (!obs) return 0;
  if (Array.isArray(obs)) return obs.length;
  // Es string: cuenta como 1 si tiene contenido
  return typeof obs === 'string' && obs.trim().length > 0 ? 1 : 0;
}

/**
 * Verifica si hay observaciones
 */
function tieneObservaciones(obs: ObservacionCumplimiento[] | string | undefined): boolean {
  return contarObservaciones(obs) > 0;
}

/** Días restantes hasta una fecha (negativo = ya venció) */
function diasHastaFecha(fechaISO: string): number {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const f = new Date(fechaISO + 'T00:00:00');
  return Math.round((f.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
}

interface Rol {
  id?: string; // ID del rol desde el backend (requerido para crear actividades)
  numero: number;
  nombre: string;
  color: string;
  icono: string;
  descripcion: string;
  actividades: Actividad[];
}

interface HistorialAprobacion {
  auditorId: string;
  auditorNombre: string;
  estado: 'PENDIENTE' | 'OBSERVADA' | 'APROBADA';
  observacion?: string;
  fecha?: string;
  firmaElectronica?: FirmaElectronicaMetadata;
  respuestaSubsanacion?: string;
  fechaRespuesta?: string;
}

interface PlanAnual {
  id: string;
  vigencia: number;
  version: number;
  estado: EstadoPlan;
  jefeOCI: Auditor;
  fechaCreacion: string;
  fechaAprobacion: string | null;
  actaCICC: string | null;
  roles: Rol[];
  equipoAprobacion?: Auditor[];
  ordenAprobacion?: 'secuencial' | 'paralelo';
  historialAprobaciones?: HistorialAprobacion[];
}

// Auditores - Valor por defecto mientras se cargan del backend
const AUDITORES_DEFAULT: Auditor[] = [
  { id: '1', nombre: 'Cargando...', cargo: 'Auditor', email: '' }
];

// Roles (debe coincidir con el principal)
const ROLES_DECRETO_648: Omit<Rol, 'actividades'>[] = [
  { numero: 1, nombre: 'Liderazgo estratégico', color: '#2962FF', icono: '🎯', descripcion: 'Asesorar y acompañar a la alta dirección' },
  { numero: 2, nombre: 'Enfoque hacia la prevención', color: '#00C853', icono: '🛡️', descripcion: 'Promover actividades preventivas' },
  { numero: 3, nombre: 'Evaluación de la gestión del riesgo', color: '#FF6D00', icono: '⚠️', descripcion: 'Evaluar sistema de gestión de riesgos' },
  { numero: 4, nombre: 'Evaluación y seguimiento', color: '#AA00FF', icono: '✔', descripcion: 'Evaluar diseño y efectividad del sistema de control interno' },
  { numero: 5, nombre: 'Relación con entes externos de control', color: '#C62828', icono: '⚖️', descripcion: 'Coordinar con entes externos' }
];

// Tipo para configuración de roles en el wizard
interface ActividadBase {
  id?: string; // a ID único para identificar cada actividad
  nombre: string;
  descripcion: string;
  fechaInicio: string;
  fechaFin: string;
  control: string;
  evaluacion: string;
  seguimiento: string;
  tareasSeguimiento?: TareaSeguimiento[];
  requiereAutorizacionJefeOCI?: boolean; // Checkbox      por actividad
  tipoEvidencia?: 'SOLO_CHECK' | 'OBSERVACIONES' | 'ADJUNTOS' | 'COMPLETO'; // Tipo de evidencia requerida
  responsables?: Auditor[]; // S& Responsables por actividad (múltiples)
  fechaCorte?: string; // Fecha límite de corte para la actividad
  // S& NUEVO: Configuración de puntos de control
  puntosControl?: PuntoControl[];
  frecuenciaPuntosControl?: FrecuenciaPuntoControl;
  /** Si es `false`, la actividad no entra en el plan guardado pero se conserva lo configurado hasta volver a marcarla. */
  incluidaEnPlan?: boolean;
}

/** Actividades desmarcadas en el checklist conservan datos; solo `incluidaEnPlan === false` las excluye del envío al backend. */
function actividadIncluidaEnPlan(a: ActividadBase): boolean {
  return a.incluidaEnPlan !== false;
}

/**
 * Interruptores del Paso 2 usan `tipoEvidencia`. Al abrir un plan cargado desde el dashboard,
 * la config viene como `adjuntosRequeridos` / `observacionRequerida` (sin `documentos`/`observaciones`),
 * por lo que la inferencia antigua devolvía siempre SOLO_CHECK y el switch grande quedaba apagado.
 * Coincide con el mapeo que envía `handleCrearPlan` (OBLIGATORIO = caso wizard).
 */
function inferirTipoEvidenciaParaWizard(act: ActividadBase & { configuracionEvidencias?: any }): NonNullable<ActividadBase['tipoEvidencia']> {
  if (act.tipoEvidencia) return act.tipoEvidencia;
  const c = act.configuracionEvidencias;
  let desdeConfig: NonNullable<ActividadBase['tipoEvidencia']> | null = null;
  if (c) {
    if (typeof c.documentos === 'boolean' || typeof c.observaciones === 'boolean') {
      const doc = !!c.documentos;
      const obs = !!c.observaciones;
      if (doc && obs) desdeConfig = 'COMPLETO';
      else if (doc) desdeConfig = 'ADJUNTOS';
      else if (obs) desdeConfig = 'OBSERVACIONES';
      else desdeConfig = 'SOLO_CHECK';
    } else if (c.adjuntosRequeridos !== undefined || c.observacionRequerida !== undefined) {
      const adj = c.adjuntosRequeridos ?? 'NO_REQUERIDO';
      const obs = c.observacionRequerida ?? 'NO_REQUERIDO';
      const adjOb = adj === 'OBLIGATORIO';
      const obsOb = obs === 'OBLIGATORIO';
      if (adjOb && obsOb) desdeConfig = 'COMPLETO';
      else if (adjOb && !obsOb) desdeConfig = 'ADJUNTOS';
      else if (obsOb && !adjOb) desdeConfig = 'OBSERVACIONES';
      else desdeConfig = 'SOLO_CHECK';
    }
  }
  if (desdeConfig && desdeConfig !== 'SOLO_CHECK') return desdeConfig;

  const tareas = act.tareasSeguimiento;
  if (Array.isArray(tareas) && tareas.length > 0) {
    const anyObs = tareas.some((t) => t.requiereObservaciones);
    const anyAdj = tareas.some((t) => t.requiereAdjuntos);
    const allObs = tareas.every((t) => t.requiereObservaciones);
    const allAdj = tareas.every((t) => t.requiereAdjuntos);
    if (allObs && allAdj && (anyObs || anyAdj)) return 'COMPLETO';
    if (allAdj && !anyObs) return 'ADJUNTOS';
    if (allObs && !anyAdj) return 'OBSERVACIONES';
  }

  return desdeConfig ?? 'SOLO_CHECK';
}

/** Ajusta solo el año de una fecha ISO YYYY-MM-DD (preserva mes/día). */
function reemplazarAnioEnFechaIso(iso: string | undefined | null, año: number): string {
  if (!iso || iso.length < 10) return iso || '';
  if (!/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso;
  return `${año}${iso.slice(4)}`;
}

/** DATE del backend / ISO → YYYY-MM-DD de calendario (UTC en Date de PostgreSQL; sin corrimiento de día). */
function fechaCalendarioParaInput(
  fechaRaw: string | Date | undefined | null,
  fallback: string,
): string {
  if (fechaRaw == null || fechaRaw === '') return fallback;
  if (typeof fechaRaw === 'string') {
    const trimmed = fechaRaw.trim();
    const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
    const dt = new Date(trimmed.includes('T') ? trimmed : `${trimmed.slice(0, 10)}T12:00:00`);
    if (!Number.isNaN(dt.getTime())) {
      return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
    }
    return fallback;
  }
  if (fechaRaw instanceof Date && !Number.isNaN(fechaRaw.getTime())) {
    return `${fechaRaw.getUTCFullYear()}-${String(fechaRaw.getUTCMonth() + 1).padStart(2, '0')}-${String(fechaRaw.getUTCDate()).padStart(2, '0')}`;
  }
  return fallback;
}

/** Autorización Jefe OCI: el wizard usa `requiereAutorizacionJefeOCI`; la BD usa `requiere_verificacion_director`. */
function leerRequiereAutorizacionJefeOCIDesdeActividad(act: any): boolean {
  return !!(
    act?.requiereAutorizacionJefeOCI
    ?? act?.requiere_verificacion_director
    ?? act?.requiereVerificacionDirector
  );
}

function aplicarFlagsAutorizacionJefeOCI<T extends Record<string, unknown>>(act: T, valor: boolean): T {
  return {
    ...act,
    requiereAutorizacionJefeOCI: valor,
    requiereVerificacionDirector: valor,
  };
}

/** Estilos del área de pasos en solo consulta (icono ojo del listado o «Vista previa»). */
const WRAPPER_PASOS_SOLO_LECTURA =
  'select-none grayscale-[0.92] saturate-[0.15] contrast-[0.98] ' +
  '[&_input]:!bg-gray-100 [&_input]:!border-gray-300 [&_textarea]:!bg-gray-100 ' +
  '[&_button]:!cursor-default [&_label]:!cursor-default ' +
  '[&_.border-blue-400]:!border-gray-400 [&_.border-blue-200]:!border-gray-300 ' +
  '[&_.bg-blue-50]:!bg-gray-100 [&_.from-blue-50]:!from-gray-100 [&_.to-indigo-50]:!to-gray-100 ' +
  '[&_.bg-blue-600]:!bg-gray-500 [&_.text-blue-600]:!text-gray-600 [&_.text-blue-700]:!text-gray-600 ' +
  '[&_.text-blue-900]:!text-gray-700 [&_.text-indigo-800]:!text-gray-700 ' +
  '[&_.text-orange-600]:!text-gray-500 [&_.text-orange-900]:!text-gray-700 ' +
  '[&_.text-red-700]:!text-gray-600 [&_.border-red-200]:!border-gray-300 [&_.bg-green-100]:!bg-gray-200';

function descargarEvidenciaTarea(adj: { nombre: string; url?: string }) {
  if (!adj.url) {
    toast.info('No hay archivo disponible para descargar');
    return;
  }
  const enlace = document.createElement('a');
  enlace.href = adj.url;
  enlace.download = adj.nombre || 'evidencia';
  enlace.rel = 'noopener noreferrer';
  enlace.target = '_blank';
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
}

function truncarNombreArchivo(nombre: string, maxLen = 42): string {
  const n = (nombre || '').trim() || 'Archivo';
  if (n.length <= maxLen) return n;
  const dot = n.lastIndexOf('.');
  if (dot > 0 && n.length - dot <= 10) {
    const ext = n.slice(dot);
    const base = n.slice(0, dot);
    const keep = Math.max(maxLen - ext.length - 1, 10);
    return `${base.slice(0, keep)}…${ext}`;
  }
  return `${n.slice(0, maxLen - 1)}…`;
}

function ListaEvidenciasTarea({
  adjuntos,
  className = 'ml-7',
}: {
  adjuntos: Array<{ nombre: string; url?: string }>;
  className?: string;
}) {
  if (!adjuntos.length) return null;
  return (
    <div className={`${className} mt-1.5 rounded-md border border-slate-200 bg-slate-50 overflow-hidden`}>
      <p className="px-2 py-1 text-[9px] font-semibold text-slate-600 border-b border-slate-200 bg-white/60">
        {adjuntos.length} evidencia{adjuntos.length !== 1 ? 's' : ''}
      </p>
      <ul className="max-h-36 overflow-y-auto overscroll-contain">
        {adjuntos.map((adj, i) => (
          <li
            key={`${adj.nombre}-${i}`}
            className="flex items-center gap-2 px-2 py-1.5 border-b border-slate-100 last:border-b-0 min-w-0 hover:bg-white"
          >
            <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" aria-hidden />
            <span className="flex-1 min-w-0 text-[11px] text-gray-800 truncate" title={adj.nombre}>
              {truncarNombreArchivo(adj.nombre)}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                descargarEvidenciaTarea(adj);
              }}
              className="shrink-0 p-1 rounded-md hover:bg-blue-100 text-blue-700"
              title="Descargar archivo"
              aria-label={`Descargar ${adj.nombre}`}
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function enriquecerActividadDesdeBackend(act: any, vigencia: number) {
  const puntosControlActividad = ((act as any).puntosControl || (act as any).puntos_control || []) as any[];
  const tareasOriginales = ((act as any).tareasSeguimiento || (act as any).tareas_seguimiento || []) as any[];
  const tareasConCorte = normalizarTareasConCortes(tareasOriginales, puntosControlActividad).map((t: any) => ({
    ...t,
    responsables: normalizarResponsablesTarea(t.responsables),
  }));
  const actBase = act as ActividadBase & { fecha_corte?: string };
  const reqAuth = leerRequiereAutorizacionJefeOCIDesdeActividad(act);
  return {
    ...act,
    tareasSeguimiento: tareasConCorte,
    tipoEvidencia: inferirTipoEvidenciaParaWizard(act as ActividadBase & { configuracionEvidencias?: any }),
    fechaCorte: resolverFechaCorteActividad(
      { ...actBase, puntosControl: puntosControlActividad },
      vigencia,
    ),
    requiereAutorizacionJefeOCI: reqAuth,
    requiereVerificacionDirector: reqAuth,
    autorizadaPorJefeOCI: !!(
      act.verificada_por_director
      || act.verificadaPorDirector
      || act.autorizadaPorJefeOCI
    ),
  };
}

/** Alinea fechas del paso 1 al año de vigencia (corrige legacy y desfase UTC). */
function alinearFechaPlanConVigencia(
  iso: string,
  vigencia: number,
  tipo: 'inicio' | 'fin',
): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const año = parseInt(iso.slice(0, 4), 10);
  if (año === vigencia) return iso;
  if (tipo === 'inicio' && iso === `${vigencia - 1}-12-31`) {
    return `${vigencia}-01-01`;
  }
  return reemplazarAnioEnFechaIso(iso, vigencia);
}

function sumarAniosIso(iso: string, años: number): string {
  const parts = iso.split('-').map(Number);
  if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) return iso;
  const [y, m, d] = parts;
  const nd = new Date(y + años, m - 1, d);
  if (Number.isNaN(nd.getTime())) return iso;
  const yyyy = nd.getFullYear();
  const mm = String(nd.getMonth() + 1).padStart(2, '0');
  const dd = String(nd.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Desplaza todas las fechas de entrega para que la más temprana caiga en `vigencia`
 * (conserva separación entre tareas, p. ej. julio vs enero siguiente).
 */
function alinearTareasFechasEntregaAVigencia(
  tareas: TareaSeguimiento[] | undefined,
  vigencia: number
): TareaSeguimiento[] | undefined {
  if (!tareas?.length) return tareas;
  const años = tareas
    .map((t) => t.fechaEntrega?.slice(0, 4))
    .filter((y): y is string => !!y && /^\d{4}$/.test(y))
    .map((y) => parseInt(y, 10));
  if (años.length === 0) return tareas;
  const minAño = Math.min(...años);
  const delta = vigencia - minAño;
  if (delta === 0) return tareas;
  return tareas.map((t) => ({
    ...t,
    fechaEntrega: t.fechaEntrega ? sumarAniosIso(t.fechaEntrega, delta) : t.fechaEntrega,
  }));
}

/** Fecha de corte mostrada: último cierre del último punto de control si existe. */
function fechaCorteDisplayDesdeActividad(act: ActividadBase): string | undefined {
  const pcs = act.puntosControl;
  if (pcs && pcs.length > 0) {
    const ult = pcs[pcs.length - 1];
    return ult.fechaSeguimiento || ult.fechaProgramada;
  }
  return act.fechaCorte;
}

/** Resuelve fecha de corte para validación y guardado (campo, puntos de control o fin de vigencia). */
function normalizarArrayResponsablesBackend(raw: unknown): unknown[] {
  if (raw == null) return [];
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return Array.isArray(raw) ? raw : [];
}

/** Tareas Rol 4 (sync backend): responsables vienen como { id, nombre, cargo } */
function nombreResponsableTarea(resp: unknown): string {
  if (typeof resp === 'string') return resp.trim();
  if (resp && typeof resp === 'object') {
    const o = resp as { nombre?: string; name?: string; email?: string };
    return String(o.nombre || o.name || o.email || '').trim();
  }
  return '';
}

function normalizarResponsablesTarea(raw: unknown): string[] {
  return normalizarArrayResponsablesBackend(raw)
    .map((r) => nombreResponsableTarea(r))
    .filter(Boolean);
}

function inferirResponsablesRolDesdeActividades(rol: any): Auditor[] {
  const acts = rol?.actividades || [];
  for (const act of acts) {
    const list = normalizarArrayResponsablesBackend(act?.responsables);
    if (list.length > 0) {
      const r = list[0] as any;
      return [
        {
          id: String(r.id || r.idPerson || r.id_person || ''),
          idPerson: String(r.idPerson || r.id_person || r.id || '').trim() || undefined,
          nombre: String(r.nombre || r.name || ''),
          cargo: r.cargo || 'Auditor',
          email: r.email || '',
        },
      ].filter((a) => a.nombre);
    }
    const respObj = act?.responsable;
    if (respObj && typeof respObj === 'object' && respObj.nombre) {
      return [
        {
          id: String(respObj.id || respObj.idPerson || ''),
          idPerson: String(respObj.idPerson || respObj.id || '').trim() || undefined,
          nombre: String(respObj.nombre),
          cargo: respObj.cargo || 'Auditor',
          email: respObj.email || '',
        },
      ];
    }
    if (typeof act?.responsable === 'string' && act.responsable !== 'Por asignar') {
      return [
        {
          id: `temp-${act.responsable}`,
          nombre: act.responsable,
          cargo: 'Auditor',
          email: '',
        },
      ];
    }
  }
  return [];
}

/** Responsable del rol desde BD (jsonb, varchar o actividades del mismo rol). */
function mapResponsablesRolDesdeBackend(rol: any): Auditor[] {
  const list = normalizarArrayResponsablesBackend(rol?.responsables);
  if (list.length > 0) {
    const mapped = list.slice(0, 1).map((r: any) => ({
      id: String(r.id || r.idPerson || r.id_person || ''),
      idPerson: String(r.idPerson || r.id_person || r.id || '').trim() || undefined,
      idTercero: String(r.idTercero || r.id_tercero || r.idPerson || r.id || '').trim() || undefined,
      nombre: String(r.nombre || r.name || ''),
      cargo: r.cargo || 'Auditor',
      email: r.email || '',
    }));
    if (mapped[0]?.nombre) return mapped;
  }
  if (rol?.responsable && rol.responsable !== 'Por asignar') {
    const rid = String(rol.responsable_id || '').trim();
    return [
      {
        id: rid || `temp-${rol.responsable}`,
        idPerson: rid || undefined,
        idTercero: rid || undefined,
        nombre: String(rol.responsable),
        cargo: rol.responsable_cargo || 'Auditor',
        email: rol.responsable_email || '',
      },
    ];
  }
  const ridSolo = String(rol?.responsable_id || '').trim();
  if (ridSolo) {
    return [
      {
        id: ridSolo,
        idPerson: ridSolo,
        idTercero: ridSolo,
        nombre: String(rol.responsable || rol.responsable_nombre || 'Responsable asignado'),
        cargo: 'Auditor',
        email: '',
      },
    ];
  }
  return inferirResponsablesRolDesdeActividades(rol);
}

function resolverResponsablesRolDesdeProfesionales(rol: any, profesionales: Auditor[]): Auditor[] {
  const refs = mapResponsablesRolDesdeBackend(rol);
  if (refs.length === 0) return [];
  const ref = refs[0];
  const encontrado = profesionales.find((p) => coincideAuditorConReferencia(p, ref));
  if (encontrado) return [encontrado];
  const rid = idPersonaParaPlanAnual(ref as ReferenciaPersonaPlan) || String(ref.id || '').trim();
  if (!ref.nombre) return [];
  return [
    {
      ...ref,
      id: rid || ref.id,
      idPerson: rid || ref.idPerson,
      idTercero: rid || ref.idTercero || ref.id,
    },
  ];
}

function mergeRolesConfigResponsablesFromDraft(base: RolConfig[], draft: RolConfig[]): RolConfig[] {
  const draftByNum = new Map(draft.map((r) => [r.numero, r]));
  return base.map((rol) => {
    const d = draftByNum.get(rol.numero);
    const draftResp = (d?.responsables || []).filter((r): r is Auditor => Boolean(r?.nombre));
    const baseResp = (rol.responsables || []).filter((r): r is Auditor => Boolean(r?.nombre));
    return {
      ...rol,
      responsables: draftResp.length > 0 ? draftResp.slice(0, 1) : baseResp,
    };
  });
}

/** Reconstruye roles del paso 2 desde un plan ya guardado (edición / borrador cargado). */
function buildRolesConfigFromPlanAnual(plan: PlanAnual): RolConfig[] {
  if (!plan?.roles?.length) {
    return ROLES_DECRETO_648.map((rolDef) => ({
      ...rolDef,
      actividadesSeleccionadas: getActividadesPorRol(rolDef.numero).map((act, idx) => ({
        ...act,
        id: `rol-${rolDef.numero}-act-${idx}`,
        tipoEvidencia: 'SOLO_CHECK' as const,
        fechaCorte: `${plan.vigencia}-09-30`,
        puntosControl: [],
        frecuenciaPuntosControl: 'trimestral' as const,
      })),
      actividadesCustom: [],
      responsables: [],
    }));
  }

  return ROLES_DECRETO_648.map((rolDef) => {
    const rolEdit = plan.roles.find((r) => r.numero === rolDef.numero);
    if (!rolEdit) {
      const actividades = getActividadesPorRol(rolDef.numero);
      return {
        ...rolDef,
        actividadesSeleccionadas: actividades.map((act, idx) => ({
          ...act,
          id: `rol-${rolDef.numero}-act-${idx}`,
          tipoEvidencia: 'SOLO_CHECK' as const,
          fechaCorte: `${plan.vigencia}-09-30`,
          puntosControl: [],
          frecuenciaPuntosControl: 'trimestral' as const,
        })),
        actividadesCustom: [],
        responsables: [],
      };
    }

    const actividadesConfiguradas = rolEdit.actividades.map((act) =>
      enriquecerActividadDesdeBackend(act, plan.vigencia),
    );

    const actividadesTemplate = getActividadesPorRol(rolDef.numero);
    const nombresTemplate = actividadesTemplate.map((a) => a.nombre);
    const actividadesSeleccionadas = actividadesConfiguradas.filter((a) => nombresTemplate.includes(a.nombre));
    const actividadesCustom = actividadesConfiguradas.filter((a) => !nombresTemplate.includes(a.nombre));

    return {
      ...rolDef,
      id: rolEdit.id,
      actividadesSeleccionadas: actividadesSeleccionadas as any,
      actividadesCustom: actividadesCustom as any,
      responsables: mapResponsablesRolDesdeBackend(rolEdit),
    };
  });
}

function coincideAuditorConReferencia(a: Auditor, ref: Auditor | null | undefined): boolean {
  if (!ref) return false;
  const idRef = idPersonaParaPlanAnual(ref) || String(ref.id || '').trim();
  const idA = idPersonaParaPlanAnual(a) || String(a.id || '').trim();
  if (idRef && idA && idRef === idA) return true;
  return String(a.id) === String(ref.id) || String(a.idTercero || '') === String(ref.id);
}

/** Sustituye responsable del rol/actividad solo si coincidía con el responsable del plan anterior. */
function reemplazarResponsableSiEraAnterior(
  responsables: Auditor[] | undefined,
  anterior: Auditor,
  nuevo: Auditor,
): Auditor[] {
  const lista = (responsables || []).filter(Boolean);
  if (lista.length === 0) return lista;
  if (lista.some((r) => coincideAuditorConReferencia(r, anterior))) return [nuevo];
  return lista;
}

function aplicarCambioResponsablePlanEnRoles(
  roles: RolConfig[],
  anterior: Auditor | null,
  nuevo: Auditor,
  modo: 'rellenar-vacios' | 'solo-reemplazar-anterior',
): RolConfig[] {
  return roles.map((rol) => {
    if (modo === 'rellenar-vacios') {
      const validResponsables = (rol.responsables || []).filter(Boolean);
      if (validResponsables.length > 0) return rol;
      return {
        ...rol,
        responsables: [nuevo],
        actividadesSeleccionadas: (rol.actividadesSeleccionadas || []).map((act) => {
          const actValidResp = (act.responsables || []).filter(Boolean);
          return actValidResp.length === 0 ? { ...act, responsables: [nuevo] } : act;
        }),
        actividadesCustom: (rol.actividadesCustom || []).map((act) => {
          const actValidResp = (act.responsables || []).filter(Boolean);
          return actValidResp.length === 0 ? { ...act, responsables: [nuevo] } : act;
        }),
      };
    }

    if (!anterior) return rol;
    return {
      ...rol,
      responsables: reemplazarResponsableSiEraAnterior(rol.responsables, anterior, nuevo),
      actividadesSeleccionadas: (rol.actividadesSeleccionadas || []).map((act) => ({
        ...act,
        responsables: reemplazarResponsableSiEraAnterior(act.responsables, anterior, nuevo),
      })),
      actividadesCustom: (rol.actividadesCustom || []).map((act) => ({
        ...act,
        responsables: reemplazarResponsableSiEraAnterior(act.responsables, anterior, nuevo),
      })),
    };
  });
}

function resolverJefePlanDesdeProfesionales(plan: PlanAnual, profesionales: Auditor[]): Auditor | null {
  if (!plan.jefeOCI) return null;
  const encontrado = profesionales.find((p) => coincideAuditorConReferencia(p, plan.jefeOCI));
  if (encontrado) return encontrado;
  if (plan.jefeOCI.nombre) {
    const rid = idPersonaParaPlanAnual(plan.jefeOCI as ReferenciaPersonaPlan) || String(plan.jefeOCI.id || '').trim();
    return {
      ...plan.jefeOCI,
      id: rid || plan.jefeOCI.id,
      idPerson: rid || plan.jefeOCI.idPerson,
      idTercero: rid || plan.jefeOCI.idTercero || plan.jefeOCI.id,
    };
  }
  return null;
}

function resolverFechaCorteActividad(act: ActividadBase, vigencia: number): string {
  const raw = act.fechaCorte || (act as { fecha_corte?: string }).fecha_corte;
  if (raw != null && String(raw).trim() !== '') {
    const s = String(raw).includes('T') ? String(raw).split('T')[0] : String(raw).slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  }
  const desdePuntos = fechaCorteDisplayDesdeActividad(act);
  if (desdePuntos) {
    const s = desdePuntos.includes('T') ? desdePuntos.split('T')[0] : desdePuntos.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  }
  if (act.fechaFin) {
    const s = act.fechaFin.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  }
  return `${vigencia}-12-31`;
}

function esFechaIso(valor: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(valor);
}

/**
 * Tabla de cortes oficiales según el formato ESAP/Decreto 648.
 * Cada entrada: [fechaProgramada (fin del período), fechaSeguimiento (entrega del informe)].
 * Mes en base 1. Usa año+1 cuando el mes de seguimiento es enero/feb/mar del año siguiente.
 */
function generarCortesOficiales(
  frecuencia: string,
  año: number,
): Array<{ fechaProgramada: string; fechaSeguimiento: string }> {
  const fmt = (y: number, m: number, d: number) =>
    `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const mesUltimoDia = (y: number, m: number) => new Date(y, m, 0).getDate();

  const ctrl = frecuencia.toLowerCase();

  if (ctrl.includes('semestral')) {
    return [
      { fechaProgramada: fmt(año, 6, 30),  fechaSeguimiento: fmt(año,   7, 31) },
      { fechaProgramada: fmt(año, 12, 31), fechaSeguimiento: fmt(año+1, 1, 31) },
    ];
  }
  if (ctrl.includes('cuatrimestral')) {
    return [
      { fechaProgramada: fmt(año, 4, 30),  fechaSeguimiento: fmt(año,   5, 31) },
      { fechaProgramada: fmt(año, 8, 31),  fechaSeguimiento: fmt(año,   9, 30) },
      { fechaProgramada: fmt(año, 12, 31), fechaSeguimiento: fmt(año+1, 1, 31) },
    ];
  }
  if (ctrl.includes('trimestral')) {
    return [
      { fechaProgramada: fmt(año, 3, 31),  fechaSeguimiento: fmt(año,  4, 30) },
      { fechaProgramada: fmt(año, 6, 30),  fechaSeguimiento: fmt(año,  7, 31) },
      { fechaProgramada: fmt(año, 9, 30),  fechaSeguimiento: fmt(año, 10, 31) },
      { fechaProgramada: fmt(año, 12, 31), fechaSeguimiento: fmt(año+1, 1, 31) },
    ];
  }
  if (ctrl.includes('anual')) {
    return [
      { fechaProgramada: fmt(año, 12, 31), fechaSeguimiento: fmt(año+1, 2, mesUltimoDia(año+1, 2)) },
    ];
  }
  if (ctrl.includes('mensual')) {
    return Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      const ld = mesUltimoDia(año, m);
      const nextM = m === 12 ? 1 : m + 1;
      const nextY = m === 12 ? año + 1 : año;
      const nextLd = mesUltimoDia(nextY, nextM);
      return {
        fechaProgramada: fmt(año, m, ld),
        fechaSeguimiento: fmt(nextY, nextM, nextLd),
      };
    });
  }
  return [];
}

/**
 * Rol 4: auditorías (universo) y planes de mejoramiento generan tareas_seguimiento en backend.
 * No precargar 12 cortes mensuales ni cortes trimestrales vacíos al crear el plan.
 */
function actividadRol4SinCortesPrecargados(
  rolNumero: number,
  act: { nombre?: string },
): boolean {
  if (rolNumero !== 4) return false;
  const n = (act.nombre || '').toLowerCase();
  return (
    n.includes('auditor') ||
    n.includes('programa de auditor') ||
    (n.includes('plan') && n.includes('mejoramiento'))
  );
}

function alinearCortesConFechasOficiales(
  puntos: PuntoControl[],
  actividad: ActividadBase,
  añoOverride?: number,
): PuntoControl[] {
  const ctrl = actividad.control || '';
  const año = añoOverride
    ?? (actividad.fechaInicio ? parseInt(actividad.fechaInicio.slice(0, 4), 10) : new Date().getFullYear());
  if (isNaN(año)) return puntos;

  const oficiales = generarCortesOficiales(ctrl, año);
  if (oficiales.length === 0) return puntos;

  // Preferir las fechas oficiales sobre las calculadas por periodicidad genérica.
  // Si hay más puntos que entradas oficiales, los sobrantes conservan sus fechas.
  return puntos.map((pc, idx) => {
    const oficial = oficiales[idx];
    if (!oficial) return pc;
    return {
      ...pc,
      fechaProgramada: oficial.fechaProgramada,
      fechaSeguimiento: oficial.fechaSeguimiento,
    };
  });
}

function contarActividadesIncluidas(rol: RolConfig): number {
  return rol.actividadesSeleccionadas.filter(actividadIncluidaEnPlan).length;
}

interface RolConfig extends Omit<Rol, 'actividades'> {
  actividadesSeleccionadas: ActividadBase[];
  actividadesCustom: ActividadBase[];
  responsables: Auditor[];
}

// Función para obtener actividades por rol desde el archivo principal
function getActividadesPorRol(numeroRol: number): ActividadBase[] {
  // """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
  // ACTIVIDADES OFICIALES DECRETO 648/2017 - SINCRONIZADO CON EXCEL ESAP
  // """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
  const actividadesPorRol: Record<number, ActividadBase[]> = {
    // """"""""""""""""""" ROL 1: LIDERAZGO ESTRATÉGICO (46) """""""""""""""""""
    1: [
      { 
        nombre: 'Establecer canales de comunicación directa con el Director Nacional de la ESAP', 
        descripcion: 'Mantener comunicación permanente con la dirección sobre temas estratégicos de control interno', 
        fechaInicio: '2026-01-01', fechaFin: '2026-12-31', 
        control: 'Se hace seguimiento semestral.', evaluacion: '0% avance', 
        seguimiento: 'Publicar todos los informes de gestión en la página web institucional y allegar al correo del Director.',
        tareasSeguimiento: [
          { id: 'r1-a1-t1', descripcion: 'Publicar todos los informes de gestión en la página web institucional y allegar al correo del Director.', completada: false, fechaEntrega: '2026-07-31' },
          { id: 'r1-a1-t2', descripcion: 'Enviar comunicaciones internas hechas a los procesos de la ESAP al Señor Director.', completada: false, fechaEntrega: '2027-01-31' },
        ]
      },
      { 
        nombre: 'Verificar a través del Plan anual de auditorías, el cumplimiento de metas, indicadores, procesos estratégicos de la entidad y riesgos asociados a estos', 
        descripcion: 'Revisar cumplimiento de objetivos institucionales y riesgos asociados', 
        fechaInicio: '2026-01-01', fechaFin: '2026-12-31', 
        control: 'Se hace seguimiento cuatrimestral.', evaluacion: '0% avance', 
        seguimiento: 'Socializar resultados en el Comité Institucional de Coordinación de Control Interno',
        tareasSeguimiento: [
          { id: 'r1-a2-t1', descripcion: 'Socializar resultados en el Comité Institucional de Coordinación de Control Interno', completada: false, fechaEntrega: '2026-05-31' },
          { id: 'r1-a2-t2', descripcion: 'Socializar resultados en el Comité Institucional de Coordinación de Control Interno', completada: false, fechaEntrega: '2026-09-30' },
          { id: 'r1-a2-t3', descripcion: 'Socializar resultados en el Comité Institucional de Coordinación de Control Interno', completada: false, fechaEntrega: '2027-01-31' },
        ]
      },
      { 
        nombre: 'Establecer en el Comité de Gestión y Desempeño la periodicidad y alcance de rendición de informes estratégicos', 
        descripcion: 'Definir en el comité de gestión y desempeño la periodicidad de rendición de informes', 
        fechaInicio: '2026-01-01', fechaFin: '2026-12-31', 
        control: 'Se hace seguimiento anual.', evaluacion: '100% avance', 
        seguimiento: 'Socializar Plan Anual de Auditoría en el Comité Institucional de Gestión y Desempeño.',
        tareasSeguimiento: [
          { id: 'r1-a3-t1', descripcion: 'Socializar Plan Anual de Auditoría en el Comité Institucional de Gestión y Desempeño.', completada: true, fechaEntrega: '2026-02-28' },
        ]
      },
      { 
        nombre: 'Presentar ante el Comité Institucional de Coordinación de Control Interno los resultados de la evaluación de la operación de la primera y segunda línea de defensa. Analizar las variaciones del ambiente organizacional y del entorno, identificando procesos críticos, controles y servicios que tengan un impacto significativo en el cumplimiento de los objetivos institucionales', 
        descripcion: 'Evaluar operación de primera y segunda línea de defensa ante el CICC', 
        fechaInicio: '2026-01-01', fechaFin: '2026-12-31', 
        control: 'Se hace seguimiento semestral.', evaluacion: '0% avance', 
        seguimiento: 'Hacer informe de los resultados de la evaluación independiente del Estado del Sistema de Control Interno',
        tareasSeguimiento: [
          { id: 'r1-a4-t1', descripcion: 'Hacer informe de los resultados de la evaluación independiente del Estado del Sistema de Control Interno, a través de sus cinco (5) componentes y publicar en la página web.', completada: false, fechaEntrega: '2026-07-31' },
          { id: 'r1-a4-t2', descripcion: 'Hacer informe de los resultados de la evaluación independiente del Estado del Sistema de Control Interno, a través de sus cinco (5) componentes y publicar en la página web.', completada: false, fechaEntrega: '2027-01-31' },
        ]
      },
      { 
        nombre: 'Informar al Director Nacional de la ESAP sobre las alertas de riesgo fiscal identificadas y en general los resultados de los ejercicios de auditoría y se planteen recomendaciones estratégicas para el fortalecimiento y la prevención', 
        descripcion: 'Comunicar al Director sobre alertas de riesgo fiscal identificadas en auditorías', 
        fechaInicio: '2026-01-01', fechaFin: '2026-12-31', 
        control: 'Se hace informe cuatrimestral.', evaluacion: '0% avance', 
        seguimiento: 'Hacer informe, publicar en la página web, diligenciar el seguimiento como tercera línea en ISOLUCION.',
        tareasSeguimiento: [
          { id: 'r1-a5-t1', descripcion: 'Hacer informe, publicar en la página web, diligenciar el seguimiento como tercera línea en ISOLUCION.', completada: false, fechaEntrega: '2026-05-31' },
          { id: 'r1-a5-t2', descripcion: 'Hacer informe, publicar en la página web, diligenciar el seguimiento como tercera línea en ISOLUCION.', completada: false, fechaEntrega: '2026-09-30' },
          { id: 'r1-a5-t3', descripcion: 'Hacer informe, publicar en la página web, diligenciar el seguimiento como tercera línea en ISOLUCION.', completada: false, fechaEntrega: '2027-01-31' },
        ]
      },
      { 
        nombre: 'Participación frente a los procesos de empalme cuando se dan cambios de administración', 
        descripcion: 'Acompañar procesos de transición cuando hay cambios de administración', 
        fechaInicio: '2026-08-08', fechaFin: '2026-10-31', 
        control: 'Cuando se aplique', evaluacion: '0% avance', 
        seguimiento: 'Se hace seguimiento el último año.',
        tareasSeguimiento: [
          { id: 'r1-a6-t1', descripcion: 'Se hace seguimiento el último año.', completada: false, fechaEntrega: '2026-10-31' },
        ]
      }
    ],
    // """"""""""""""""""" ROL 2: ENFOQUE HACIA LA PREVENCIN (60) """""""""""""""""""
    2: [
      { nombre: 'Programar en los comités institucionales más estratégicos sesiones que sensibilicen sobre la articulación del sistema de control interno y el control externo', 
        descripcion: 'Programar sesiones en comités estratégicos sobre articulación del SCI', fechaInicio: '2026-01-01', fechaFin: '2026-12-31', 
        control: 'Se hace seguimiento semestral.', evaluacion: '0% avance', seguimiento: 'Socializar articulación del sistema de control interno y el control externo (Guía de auditoría).',
        tareasSeguimiento: [
          { id: 'r2-a1-t1', descripcion: 'Socializar articulación del sistema de control interno y el control externo (Guía de auditoría).', completada: false, fechaEntrega: '2026-08-31' },
          { id: 'r2-a1-t2', descripcion: 'Socializar articulación del sistema de control interno y el control externo (Guía de auditoría).', completada: false, fechaEntrega: '2027-02-28' },
        ]
      },
      { nombre: 'Acompañar a los procesos en la formulación de planes de mejoramiento', 
        descripcion: 'Asesorar a los procesos en la formulación de planes de mejoramiento', fechaInicio: '2026-01-01', fechaFin: '2026-12-31', 
        control: 'Se hace seguimiento trimestral.', evaluacion: '0% avance', seguimiento: 'Revisión metodológica',
        tareasSeguimiento: [
          { id: 'r2-a2-t1', descripcion: 'Revisión metodológica', completada: false, fechaEntrega: '2026-04-30' },
          { id: 'r2-a2-t2', descripcion: 'Revisión metodológica', completada: false, fechaEntrega: '2026-07-31' },
          { id: 'r2-a2-t3', descripcion: 'Revisión metodológica', completada: false, fechaEntrega: '2026-10-31' },
          { id: 'r2-a2-t4', descripcion: 'Revisión metodológica', completada: false, fechaEntrega: '2027-01-31' },
        ]
      },
      { nombre: 'Adoptar formalmente un procedimiento para el seguimiento al Plan de Mejoramiento, con esquema de semaforización que genere informe de alertas a los responsables internos. Hacer mesas de trabajo con los responsables de las acciones que se encuentren en alguna de las alertas', 
        descripcion: 'Formalizar procedimiento con semaforización y alertas a responsables', fechaInicio: '2026-01-01', fechaFin: '2026-12-31', 
        control: 'Se hace seguimiento anual.', evaluacion: '0% avance', seguimiento: 'Incluir en el módulo de control interno las alertas para los planes de mejoramiento',
        tareasSeguimiento: [
          { id: 'r2-a3-t1', descripcion: 'Incluir en el módulo de control interno las alertas para los planes de mejoramiento', completada: false, fechaEntrega: '2027-01-31' },
        ]
      },
      { nombre: 'Elaborar y presentar, en el marco del Comité Institucional de Coordinación de Control Interno un informe en relación con el avance del plan de mejoramiento', 
        descripcion: 'Informar sobre el estado de avance del plan de mejoramiento institucional', fechaInicio: '2026-01-01', fechaFin: '2026-12-31', 
        control: 'Se hace seguimiento trimestral.', evaluacion: '0% avance', seguimiento: 'Socializar resultados en el Comité Institucional de Coordinación de Control Interno.',
        tareasSeguimiento: [
          { id: 'r2-a4-t1', descripcion: 'Socializar resultados en el Comité Institucional de Coordinación de Control Interno.', completada: false, fechaEntrega: '2026-05-29' },
          { id: 'r2-a4-t2', descripcion: 'Socializar resultados en el Comité Institucional de Coordinación de Control Interno.', completada: false, fechaEntrega: '2026-08-28' },
          { id: 'r2-a4-t3', descripcion: 'Socializar resultados en el Comité Institucional de Coordinación de Control Interno.', completada: false, fechaEntrega: '2026-11-20' },
          { id: 'r2-a4-t4', descripcion: 'Socializar resultados en el Comité Institucional de Coordinación de Control Interno.', completada: false, fechaEntrega: '2027-03-31' },
        ]
      },
      { nombre: 'Desarrollar diagnósticos para la mejora en la gestión del riesgo en todos sus ámbitos', 
        descripcion: 'Realizar diagnósticos en todos los ámbitos de gestión del riesgo', fechaInicio: '2026-01-01', fechaFin: '2026-12-31', 
        control: 'Se hace seguimiento semestral.', evaluacion: '0% avance', seguimiento: 'Establecer a través de la auditoría interna la efectividad de los controles.',
        tareasSeguimiento: [
          { id: 'r2-a5-t1', descripcion: 'Establecer a través de la auditoría interna la efectividad de los controles para evitar la materialización de riesgos y socializar en el Comité Institucional de Coordinación de Control Interno.', completada: false, fechaEntrega: '2026-08-31' },
          { id: 'r2-a5-t2', descripcion: 'Establecer a través de la auditoría interna la efectividad de los controles para evitar la materialización de riesgos y socializar en el Comité Institucional de Coordinación de Control Interno.', completada: false, fechaEntrega: '2027-02-28' },
        ]
      },
      { nombre: 'Asesorar a la alta dirección para la articulación del esquema de líneas de defensa', 
        descripcion: 'Acompañar a la alta dirección en la implementación de las tres líneas de defensa', fechaInicio: '2026-01-01', fechaFin: '2026-12-31', 
        control: 'Se hace seguimiento semestral.', evaluacion: '0% avance', seguimiento: 'Realizar capacitaciones del esquema de tres líneas de defensa del Sistema de Control Interno.',
        tareasSeguimiento: [
          { id: 'r2-a6-t1', descripcion: 'Realizar capacitaciones del esquema de tres líneas de defensa del Sistema de Control Interno.', completada: false, fechaEntrega: '2026-08-31' },
          { id: 'r2-a6-t2', descripcion: 'Realizar capacitaciones del esquema de tres líneas de defensa del Sistema de Control Interno.', completada: false, fechaEntrega: '2027-02-28' },
        ]
      },
      { nombre: 'Alertas tempranas', 
        descripcion: 'Emitir alertas tempranas cuando se requieran', fechaInicio: '2026-01-01', fechaFin: '2026-12-31', 
        control: 'Cuando se aplique', evaluacion: '0% avance', seguimiento: 'Emitir alertas cuando se requieran',
        tareasSeguimiento: [
          { id: 'r2-a7-t1', descripcion: 'Emitir alertas cuando se requieran', completada: false },
        ]
      }
    ],
    // """"""""""""""""""" ROL 3: EVALUACIN DE LA GESTIN DEL RIESGO (48) """""""""""""""""""
    3: [
      { nombre: 'Revisar la adecuación y/o actualización de la política de administración del riesgo y si se evalúa periódicamente su implementación', 
        descripcion: 'Evaluar actualización y cumplimiento de la política de gestión del riesgo', fechaInicio: '2026-01-01', fechaFin: '2026-12-31', 
        control: 'Se hace seguimiento cuatrimestral.', evaluacion: '0% avance', seguimiento: 'Revisar que está formalizada a través de acto administrativo.',
        tareasSeguimiento: [
          { id: 'r3-a1-t1', descripcion: 'Revisar que está formalizada a través de acto administrativo o actuación administrativa y que contenga (objetivo, alcance, niveles de aceptación del riesgo, niveles para calificar el impacto, tratamiento del riesgo) de conformidad con la Guía para la Administración del Riesgo y el diseño de controles en entidades públicas.', completada: false, fechaEntrega: '2026-05-31' },
          { id: 'r3-a1-t2', descripcion: 'Revisar que está formalizada a través de acto administrativo o actuación administrativa y que contenga (objetivo, alcance, niveles de aceptación del riesgo, niveles para calificar el impacto, tratamiento del riesgo) de conformidad con la Guía para la Administración del Riesgo y el diseño de controles en entidades públicas.', completada: false, fechaEntrega: '2026-09-30' },
          { id: 'r3-a1-t3', descripcion: 'Revisar que está formalizada a través de acto administrativo o actuación administrativa y que contenga (objetivo, alcance, niveles de aceptación del riesgo, niveles para calificar el impacto, tratamiento del riesgo) de conformidad con la Guía para la Administración del Riesgo y el diseño de controles en entidades públicas.', completada: false, fechaEntrega: '2027-01-31' },
        ]
      },
      { nombre: 'Promover escenarios para que la dirección comprenda el valor de la gestión de riesgos como paso previo para promover el proceso en toda la organización. Proporcionar la información de riesgos para que la alta dirección la utilice en la toma de decisiones', 
        descripcion: 'Generar escenarios para que la dirección comprenda la importancia de la gestión de riesgos', fechaInicio: '2026-01-01', fechaFin: '2026-12-31', 
        control: 'Se hace seguimiento cuatrimestral.', evaluacion: '0% avance', seguimiento: 'Socializar resultados en el Comité Institucional de Coordinación de Control Interno.',
        tareasSeguimiento: [
          { id: 'r3-a2-t1', descripcion: 'Socializar resultados en el Comité Institucional de Coordinación de Control Interno.', completada: false, fechaEntrega: '2026-05-31' },
          { id: 'r3-a2-t2', descripcion: 'Socializar resultados en el Comité Institucional de Coordinación de Control Interno.', completada: false, fechaEntrega: '2026-09-30' },
          { id: 'r3-a2-t3', descripcion: 'Socializar resultados en el Comité Institucional de Coordinación de Control Interno.', completada: false, fechaEntrega: '2027-01-31' },
        ]
      },
      { nombre: 'Evaluar prácticas actuales de gestión del riesgo para migrar a esquemas más efectivos. Articular ejercicios de seguimiento y monitoreo en el marco del Esquema de las líneas de defensa', 
        descripcion: 'Migrar a esquemas más efectivos de gestión del riesgo', fechaInicio: '2026-01-01', fechaFin: '2026-12-31', 
        control: 'Se hace seguimiento cuatrimestral.', evaluacion: '0% avance', seguimiento: 'Socializar resultados en el Comité Institucional de Coordinación de Control Interno.',
        tareasSeguimiento: [
          { id: 'r3-a3-t1', descripcion: 'Socializar resultados en el Comité Institucional de Coordinación de Control Interno.', completada: false, fechaEntrega: '2026-05-31' },
          { id: 'r3-a3-t2', descripcion: 'Socializar resultados en el Comité Institucional de Coordinación de Control Interno.', completada: false, fechaEntrega: '2026-09-30' },
          { id: 'r3-a3-t3', descripcion: 'Socializar resultados en el Comité Institucional de Coordinación de Control Interno.', completada: false, fechaEntrega: '2027-01-31' },
        ]
      }
    ],
    // """"""""""""""""""" ROL 4: EVALUACIN Y SEGUIMIENTO (60) """""""""""""""""""
    4: [
      { nombre: 'Efectuar auditorías internas con enfoque preventivo y las especiales acorde al programa de auditoria', 
        descripcion: 'Realizar auditorías internas y especiales conforme al programa anual', fechaInicio: '2026-01-01', fechaFin: '2026-12-31', 
        control: 'Se hace seguimiento mensual.', evaluacion: '0% avance', seguimiento: 'Realizar seguimiento al cumplimiento de ejecución de las auditorías establecidas en el Programa de Auditoría.',
      },
      { nombre: 'Seguimiento a planes de mejoramiento internos y externos', 
        descripcion: 'Monitorear cumplimiento de planes de mejoramiento derivados de auditorías', fechaInicio: '2026-01-01', fechaFin: '2026-12-31', 
        control: 'Se hace seguimiento trimestral.', evaluacion: '0% avance', seguimiento: 'Evaluar el cumplimiento de los planes de mejoramiento',
      }
    ],
    // """"""""""""""""""" ROL 5: RELACIN CON ENTES EXTERNOS DE CONTROL """""""""""""""""""
    5: [
      { nombre: 'Brindar asesoría y generar alertas oportunas a los líderes de los procesos o responsables del suministro de información, para evitar la entrega no acorde o inconsistente con las solicitudes del organismo de control. Alertar a la primera línea de defensa, y en general, a los responsables del aporte de información requerida por órganos de control sobre estos efectos (Conductas generadoras de sanciones)', 
        descripcion: 'Alertar a responsables sobre información requerida por organismos de control', fechaInicio: '2026-01-01', fechaFin: '2026-12-31', 
        control: 'Se hace seguimiento semestral.', evaluacion: '0% avance', seguimiento: 'Comunicación interna a la Dirección Nacional y responsables de los procesos.',
        tareasSeguimiento: [
          { id: 'r5-a1-t1', descripcion: 'Comunicación interna a la Dirección Nacional y responsables de los proceso del cargue del plan de mejoramiento en el aplicativo SIRECI - CGR', completada: false, fechaEntrega: '2026-12-31' },
        ]
      },
      { nombre: 'Presentar informes y seguimientos de ley', 
        descripcion: 'Cumplimiento de todos los informes obligatorios establecidos en el cronograma anual', fechaInicio: '2026-01-01', fechaFin: '2026-12-31', 
        control: 'Se hace seguimiento semestral.', evaluacion: '0% avance', seguimiento: 'Realizar seguimiento al cumplimiento de ejecución de los informes establecidos en el cronograma de informes.',
        tareasSeguimiento: [
          { id: 'r5-a2-t1', descripcion: 'Realizar seguimiento al cumplimiento de ejecución de los informes establecidos en el cronograma de informes.', completada: false, fechaEntrega: '2026-07-31' },
          { id: 'r5-a2-t2', descripcion: 'Realizar seguimiento al cumplimiento de ejecución de los informes establecidos en el cronograma de informes.', completada: false, fechaEntrega: '2027-01-31' },
        ]
      },
    ]
  };
  
  return actividadesPorRol[numeroRol] || [];
}

// """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
// COMPONENTE: SELECTOR DE PROFESIONAL DISEADO (Combobox)
// """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""

function SelectorProfesional({
  auditores,
  onSelect,
  placeholder = "+ Agregar responsable…",
  disabled = false,
  className = ""
}: {
  auditores: Auditor[];
  onSelect: (id: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const popupId = useId().replace(/:/g, '');

  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, listMaxHeight: 260 });

  const updatePosition = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const listMax = 260;
      const headerApprox = 56;
      const gap = 4;
      const spaceBelow = window.innerHeight - rect.bottom - gap;
      const spaceAbove = rect.top - gap;
      const openAbove = spaceBelow < listMax + headerApprox && spaceAbove > spaceBelow;
      const available = Math.max(120, openAbove ? spaceAbove : spaceBelow) - headerApprox;
      const listHeight = Math.min(listMax, Math.max(100, available));

      setCoords({
        top: openAbove ? rect.top - gap - headerApprox - listHeight : rect.bottom + gap,
        left: rect.left,
        width: rect.width,
        listMaxHeight: listHeight,
      });
    }
  }, []);

  useLayoutEffect(() => {
    if (isOpen) updatePosition();
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (isOpen) {
      const handleScroll = (e: Event) => {
        const popup = document.getElementById(popupId);
        if (popup && e.target instanceof Node && popup.contains(e.target)) {
          return;
        }
        updatePosition();
      };
      document.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        document.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isOpen, updatePosition, popupId]);

  const handleListWheel = (e: WheelEvent<HTMLDivElement>) => {
    const el = listRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const canScrollUp = scrollTop > 0;
    const canScrollDown = scrollTop + clientHeight < scrollHeight - 1;
    if ((e.deltaY < 0 && canScrollUp) || (e.deltaY > 0 && canScrollDown)) {
      e.stopPropagation();
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const popup = document.getElementById(popupId);
      if (popup && popup.contains(e.target as Node)) return;
      
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      setTimeout(() => document.addEventListener('mousedown', handleClickOutside), 0);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, popupId]);

  const filtrados = auditores.filter(a => 
    a.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
    (a.email || '').toLowerCase().includes(busqueda.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const getRoleBadgeColor = (role: string) => {
    const r = role.toLowerCase();
    if (r.includes('jefe') || r.includes('super') || r.includes('director')) return 'bg-purple-100 text-purple-700';
    if (r.includes('líder') || r.includes('lider') || r.includes('senior') || r.includes('sénior')) return 'bg-cyan-100 text-cyan-700';
    if (r.includes('junior') || r.includes('júnior')) return 'bg-green-100 text-green-700';
    if (r.includes('auditado')) return 'bg-amber-100 text-amber-700';
    return 'bg-blue-100 text-blue-700';
  };

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!isOpen) {
            updatePosition();
            setIsOpen(true);
          } else {
            setIsOpen(false);
          }
        }}
        className={`w-full px-3 py-1.5 border-2 border-dashed border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm text-gray-500 bg-white text-left flex justify-between items-center transition-colors hover:border-blue-400 hover:bg-blue-50 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span className="truncate">{placeholder}</span>
        <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
      </button>

      {isOpen && createPortal(
        <AnimatePresence>
          <motion.div 
            id={popupId}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'fixed',
              top: coords.top,
              left: coords.left,
              width: coords.width,
              zIndex: 99999,
            }}
            className="bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="p-2 border-b border-gray-100 shrink-0 bg-gray-50 shadow-sm z-10 flex gap-2 items-center relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-4" />
              <input
                type="text"
                autoFocus
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre o email..."
                className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={e => e.stopPropagation()}
                onKeyDown={e => {
                  if (e.key === 'Enter' && filtrados.length > 0) {
                     e.preventDefault();
                     onSelect(filtrados[0].id);
                     setIsOpen(false);
                     setBusqueda('');
                  }
                }}
              />
            </div>
            <div
              ref={listRef}
              onWheel={handleListWheel}
              style={{ maxHeight: coords.listMaxHeight }}
              className="overflow-y-auto overscroll-contain divide-y divide-gray-50 py-1"
            >
              {filtrados.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-500">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 text-amber-400" />
                  No hay profesionales disponibles
                </div>
              ) : (
                filtrados.map(auditor => (
                  <button
                    key={auditor.id}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onSelect(auditor.id);
                      setIsOpen(false);
                      setBusqueda('');
                    }}
                    className="w-full text-left p-2 hover:bg-blue-50 transition-colors flex items-center gap-3 group"
                  >
                    <div className="w-9 h-9 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-[11px] font-black shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      {getInitials(auditor.nombre)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{auditor.nombre}</p>
                      <p className="text-[11px] text-gray-400 truncate">{auditor.email || 'jefe.oci@esap.edu.co'}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${getRoleBadgeColor(auditor.cargo || 'Funcionario')}`}>
                      {auditor.cargo || 'Funcionario'}
                    </span>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

/** Mismo patrón que «Responsables del rol»: chip con × o selector para asignar. */
function ResponsableActividadPicker({
  responsable,
  auditores,
  rolColor,
  onAsignar,
  onQuitar,
  soloLectura = false,
}: {
  responsable?: Auditor | null;
  auditores: Auditor[];
  rolColor?: string;
  onAsignar: (auditor: Auditor) => void;
  onQuitar: () => void;
  soloLectura?: boolean;
}) {
  const resp = responsable?.id ? responsable : null;
  const auditoresFiltrados = filtrarAuditoresParaAsignacion(auditores);

  return (
    <div className="w-full mt-2 pt-2 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
        <Users className="w-3.5 h-3.5" />
        Responsable de la actividad
      </p>
      <div className="flex flex-col gap-1.5">
        {resp ? (
          <FilaResponsableAsignado
            nombre={resp.nombre}
            rolColor={rolColor}
            soloLectura={soloLectura}
            onQuitar={onQuitar}
          />
        ) : soloLectura ? (
          <p className="text-xs text-slate-500 italic">Sin responsable asignado</p>
        ) : (
          <SelectorProfesional
            auditores={auditoresFiltrados}
            placeholder="+ Asignar responsable…"
            onSelect={(id) => {
              if (!id) return;
              const auditor = auditoresFiltrados.find((a) => a.id === id);
              if (auditor) onAsignar(auditor);
            }}
          />
        )}
      </div>
    </div>
  );
}

/** Responsable de tarea de seguimiento (mismo chip + selector; guarda nombre en tarea.responsables). */
function ResponsableTareaPicker({
  responsablesNombres,
  auditores,
  rolColor,
  onAsignar,
  onQuitar,
  soloLectura = false,
}: {
  responsablesNombres?: string[];
  auditores: Auditor[];
  rolColor?: string;
  onAsignar: (auditor: Auditor) => void;
  onQuitar: () => void;
  soloLectura?: boolean;
}) {
  const nombreAsignado = (responsablesNombres || []).filter(Boolean)[0];
  const auditoresFiltrados = filtrarAuditoresParaAsignacion(auditores);

  return (
    <div className="mt-1.5" onClick={(e) => e.stopPropagation()}>
      {nombreAsignado ? (
        <FilaResponsableAsignado nombre={nombreAsignado} rolColor={rolColor} soloLectura={soloLectura} onQuitar={onQuitar} />
      ) : soloLectura ? (
        <p className="text-xs text-slate-500 italic">Sin responsable</p>
      ) : (
        <SelectorProfesional
          auditores={auditoresFiltrados}
          placeholder="+ Asignar responsable…"
          className="max-w-xs"
          onSelect={(id) => {
            if (!id) return;
            const auditor = auditoresFiltrados.find((a) => a.id === id);
            if (auditor) onAsignar(auditor);
          }}
        />
      )}
    </div>
  );
}

// """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
// WIZARD DE CREACIN
// """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""

interface WizardCreacionProps {
  planAEditar?: PlanAnual;
  /** Mismo asistente que edición, sin persistir cambios (solo consulta). */
  soloLectura?: boolean;
  /** Permiso approve/activate/super — muestra acceso rápido a la pestaña Aprobación del dashboard. */
  puedeIrAAprobacion?: boolean;
  /** Cierra el wizard y debe abrir el dashboard en la pestaña Aprobación. */
  onIrAAprobacion?: () => void;
  onCancelar: () => void;
  onCrear: (
    vigencia: number,
    jefeOCI: Auditor,
    rolesConfig: RolConfig[],
    fechaInicio: string,
    fechaFin: string,
    comiteAprobacion?: Auditor[],
    ordenAprobacion?: 'secuencial' | 'paralelo',
  ) => Promise<boolean>;
  /** Guarda el plan en BD como borrador y permanece en el asistente (sin modal de éxito). */
  onGuardarBorrador?: (
    vigencia: number,
    jefeOCI: Auditor,
    rolesConfig: RolConfig[],
    fechaInicio: string,
    fechaFin: string,
    comiteAprobacion?: Auditor[],
    ordenAprobacion?: 'secuencial' | 'paralelo',
  ) => Promise<boolean>;
  onTerminado?: () => void;
  planesExistentes?: PlanAnual[];
  /** Si la vigencia ya tiene plan en borrador, abrirlo para edición (no crear duplicado). */
  onCargarPlanBorrador?: (plan: PlanAnual) => void | Promise<void>;
}

export function WizardCreacion({ planAEditar, soloLectura = false, puedeIrAAprobacion = false, onIrAAprobacion, onCancelar, onCrear, onGuardarBorrador, onTerminado, planesExistentes = [], onCargarPlanBorrador }: WizardCreacionProps) {
  // x Cargar borrador de localStorage
  const draftKey = planAEditar ? `esap:wizard_plan_anual_edit_${planAEditar.id}` : 'esap:wizard_plan_anual_draft';
  const draftStr = typeof window !== 'undefined' ? localStorage.getItem(draftKey) : null;
  let draft = null;
  try {
    draft = draftStr ? JSON.parse(draftStr) : null;
  } catch(e) {}
  // En modo edición usamos SIEMPRE la fuente del backend para evitar
  // que un borrador local viejo deje actividades desmarcadas o sin responsables.
  if (planAEditar) {
    draft = null;
  }

  const normalizarResponsables = (roles: RolConfig[]): RolConfig[] =>
    (roles || []).map((rol) => ({
      ...rol,
      // Regla de negocio: un solo responsable principal por rol.
      responsables: Array.isArray(rol.responsables) ? rol.responsables.slice(0, 1) : [],
      // Regla de negocio: una sola persona responsable principal por actividad.
      actividadesSeleccionadas: (rol.actividadesSeleccionadas || []).map((act) => ({
        ...act,
        responsables: Array.isArray(act.responsables) ? act.responsables.slice(0, 1) : []
      })),
      actividadesCustom: (rol.actividadesCustom || []).map((act) => ({
        ...act,
        responsables: Array.isArray(act.responsables) ? act.responsables.slice(0, 1) : []
      }))
    }));

  const [paso, setPaso] = useState(draft?.paso || 1);
  const [lastSaved, setLastSaved] = useState<Date | null>(draft ? new Date() : null);
  /** Indica si el último guardado llegó al backend (solo «Nuevo plan») */
  const [serverDraftSynced, setServerDraftSynced] = useState(false);
  const serverBorradorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Evita fusionar dos veces si cambian props tras el primer montaje */
  const mergeWizardDesdeServidorHecho = useRef(false);
  const wizardHydrationCompletedRef = useRef(false);
  /** Evita sobreescribir cambios manuales con hidratación tardía de borrador remoto. */
  const wizardTouchedByUserRef = useRef(false);
  const controlInternoServiceApi = controlInternoService as any;
  const wizardBorradorApi = {
    get: async (): Promise<{ payload: Record<string, unknown> | null; updatedAt: string | null }> => {
      if (typeof controlInternoServiceApi.getWizardBorradorPlanAnual === 'function') {
        return controlInternoServiceApi.getWizardBorradorPlanAnual();
      }
      return apiClient.get('/control-institucional/api/v1/plan-anual-5-roles/wizard-borrador/me');
    },
    save: async (payload: Record<string, unknown>): Promise<{ ok: boolean; savedAt: string }> => {
      if (typeof controlInternoServiceApi.saveWizardBorradorPlanAnual === 'function') {
        return controlInternoServiceApi.saveWizardBorradorPlanAnual(payload);
      }
      return apiClient.put('/control-institucional/api/v1/plan-anual-5-roles/wizard-borrador/me', { payload });
    },
    delete: async (): Promise<void> => {
      if (typeof controlInternoServiceApi.deleteWizardBorradorPlanAnual === 'function') {
        await controlInternoServiceApi.deleteWizardBorradorPlanAnual();
        return;
      }
      await apiClient.delete('/control-institucional/api/v1/plan-anual-5-roles/wizard-borrador/me');
    },
  };
  const planesOtros = useMemo(
    () => (planesExistentes || []).filter((p) => !planAEditar || p.id !== planAEditar.id),
    [planesExistentes, planAEditar],
  );
  /** Vigencias con plan ya formalizado (no borrador): no se puede crear otro. */
  const vigenciasBloqueadas = useMemo(
    () =>
      planesOtros
        .filter((p) => !esEstadoPlanBorrador(p.estado))
        .map((p) => p.vigencia),
    [planesOtros],
  );
  const vigenciaEstaBloqueada = useCallback(
    (anio: number) => vigenciasBloqueadas.includes(anio),
    [vigenciasBloqueadas],
  );
  const anioActual = new Date().getFullYear();
  // Mismo rango que la validación de vigencia en el wizard (2020–2100)
  const vigenciasDisponibles = Array.from({ length: 2100 - 2020 + 1 }, (_, i) => 2020 + i)
    .filter((y) => !vigenciasBloqueadas.includes(y));

  const [vigencia, setVigencia] = useState(() => {
    if (planAEditar?.vigencia) return planAEditar.vigencia;
    // Si hay draft, usarlo SOLO si la vigencia sigue disponible
    if (draft?.vigencia && !vigenciasBloqueadas.includes(draft.vigencia)) return draft.vigencia;
    
    // Auto-seleccionar el primer año disponible
    return vigenciasDisponibles[0] || anioActual;
  });
  
  const vigenciaInicial = planAEditar?.vigencia ?? vigencia;
  const defaultFechaInicio = `${vigenciaInicial}-01-01`;
  const defaultFechaFin = `${vigenciaInicial}-12-31`;

  const resolverFechaPaso1 = (
    fechaRaw: string | Date | undefined,
    defaultDate: string,
    tipo: 'inicio' | 'fin',
  ) => {
    const parsed = fechaCalendarioParaInput(fechaRaw, defaultDate);
    const v = planAEditar?.vigencia ?? vigenciaInicial;
    return v ? alinearFechaPlanConVigencia(parsed, v, tipo) : parsed;
  };

  const [fechaInicio, setFechaInicio] = useState(() => {
    return resolverFechaPaso1(
      draft?.fechaInicio || planAEditar?.fecha_inicio || planAEditar?.fechaInicio,
      defaultFechaInicio,
      'inicio',
    );
  });

  const [fechaFin, setFechaFin] = useState(() => {
    return resolverFechaPaso1(
      draft?.fechaFin || planAEditar?.fecha_fin || planAEditar?.fechaFin,
      defaultFechaFin,
      'fin',
    );
  });

  const [comiteAprobacion, setComiteAprobacion] = useState<Auditor[]>(() => {
    if (planAEditar && planAEditar.equipoAprobacion) {
      return planAEditar.equipoAprobacion;
    }
    return draft?.comiteAprobacion || [];
  });
  const [ordenAprobacion, setOrdenAprobacion] = useState<'secuencial' | 'paralelo'>(planAEditar?.ordenAprobacion || draft?.ordenAprobacion || 'secuencial');
  
  // Estado para auditores cargados desde backend (profesionales OCI configurados)
  const [auditores, setAuditores] = useState<Auditor[]>(AUDITORES_DEFAULT);
  const [aprobadoresComite, setAprobadoresComite] = useState<Auditor[]>([]);
  const [jefesOCI, setJefesOCI] = useState<Auditor[]>([]);
  const [cargandoAuditores, setCargandoAuditores] = useState(true);
  const [jefeSeleccionado, setJefeSeleccionado] = useState<Auditor | null>(() => {
    if (draft?.jefeSeleccionado) return draft.jefeSeleccionado as Auditor;
    if (planAEditar?.jefeOCI?.nombre) {
      const rid =
        idPersonaParaPlanAnual(planAEditar.jefeOCI as ReferenciaPersonaPlan)
        || String(planAEditar.jefeOCI.id || '').trim();
      return {
        ...planAEditar.jefeOCI,
        id: rid || planAEditar.jefeOCI.id,
        idPerson: rid || planAEditar.jefeOCI.idPerson,
        idTercero: rid || planAEditar.jefeOCI.idTercero || planAEditar.jefeOCI.id,
      };
    }
    return null;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  /** Modal de solo lectura: resumen del plan en el asistente (no confundir con «Ver» del listado inicial). */
  const [mostrarVistaPrevia, setMostrarVistaPrevia] = useState(false);
  /** «Vista previa»: recorre pasos 1–3 en gris sin editar (distinto del ojo del listado = soloLectura). */
  const [vistaPreviaActiva, setVistaPreviaActiva] = useState(false);
  const enModoSoloConsulta = soloLectura || vistaPreviaActiva;

  const { puedeRealizar: puedeRealizarWizard, esSuperUsuario: esSuperUsuarioWizard } = useControlInternoPermissions();
  const puedeVerPlanAnual = puedeRealizarWizard('plan-anual', 'view');
  const puedeMostrarVistaPrevia = puedeVerPlanAnual || esSuperUsuarioWizard;

  useEffect(() => {
    if (!puedeMostrarVistaPrevia) {
      setMostrarVistaPrevia(false);
      setVistaPreviaActiva(false);
    }
  }, [puedeMostrarVistaPrevia]);

  useEffect(() => {
    if (soloLectura) setVistaPreviaActiva(false);
  }, [soloLectura]);
  
  const [draggedAprobadorIndex, setDraggedAprobadorIndex] = useState<number | null>(null);
  
  const handleDragStartAprobador = (e: React.DragEvent, index: number) => {
    setDraggedAprobadorIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOverAprobador = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropAprobador = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedAprobadorIndex === null || draggedAprobadorIndex === dropIndex) return;
    
    const newComite = [...comiteAprobacion];
    const [draggedItem] = newComite.splice(draggedAprobadorIndex, 1);
    newComite.splice(dropIndex, 0, draggedItem);
    
    setComiteAprobacion(newComite);
    setDraggedAprobadorIndex(null);
  };

  // Función para cargar profesionales OCI (reutilizable)
  const cargarAuditores = async () => {
    setCargandoAuditores(true);
    try {
      // Usar profesionales OCI configurados en lugar de personas disponibles
      const response = await configuracionesProfesionalesOCIApi.getAll();
      console.log('[PlanAnual] Profesionales OCI response:', response);
      
      if (response.success && response.data && response.data.length > 0) {
        // Transformar a formato Auditor
        const profesionales = mapearProfesionalesOCIGDesdeApi(response.data);
        
        setAuditores(profesionales);
        
        // Filtrar solo los que son Jefe OCI
        const jefes = profesionales.filter((a: Auditor) => 
          a.cargo === 'Jefe OCI' || a.cargo.toLowerCase().includes('jefe')
        );
        setJefesOCI(jefes.length > 0 ? jefes : profesionales);
        
        // NO auto-seleccionar: el usuario debe elegir explícitamente el responsable
        
        console.log('[PlanAnual] Profesionales OCI cargados:', profesionales.length);
        return profesionales;
      } else {
        console.warn('[PlanAnual] No hay profesionales OCI configurados');
        toast.warning('No hay profesionales OCI configurados', {
          description: 'Configura el equipo en el módulo de Configuración'
        });
        setAuditores([]);
        setJefesOCI([]);
        return [];
      }
    } catch (error) {
      console.error('[PlanAnual] Error cargando profesionales OCI:', error);
      toast.error('Error al cargar profesionales OCI');
      return [];
    } finally {
      setCargandoAuditores(false);
    }
  };
  
  useEffect(() => {
    void cargarListaAprobadoresComite().then(setAprobadoresComite);
  }, []);

  // Cargar profesionales OCI configurados al montar el componente
  useEffect(() => {
    cargarAuditores().then((profesionales) => {
      // Priorizar el jefe guardado en el borrador local
      if (draft && draft.jefeSeleccionado) {
        const jefeDraft = profesionales.find(p => p.id === draft.jefeSeleccionado.id) || draft.jefeSeleccionado;
        setJefeSeleccionado(jefeDraft);
      } else if (planAEditar) {
        const jefe = resolverJefePlanDesdeProfesionales(planAEditar, profesionales);
        if (jefe) setJefeSeleccionado(jefe);
      }
    });
  }, [planAEditar?.id]); // draft no está como dependencia para que evalúe el closure inicial

  // Tras cargar profesionales OCI, re-vincular responsable guardado en BD (id_person).
  useEffect(() => {
    if (!planAEditar?.jefeOCI || auditores.length === 0 || cargandoAuditores) return;
    const jefe = resolverJefePlanDesdeProfesionales(planAEditar, auditores);
    if (jefe) setJefeSeleccionado(jefe);
  }, [planAEditar?.id, planAEditar?.jefeOCI?.id, auditores, cargandoAuditores]);

  const [rolesConfig, setRolesConfig] = useState<RolConfig[]>(() => {
    // 1. Si existe un borrador, recuperar configuracion de roles (PRIORIDAD: progreso más reciente)
    if (draft && draft.rolesConfig) {
      return normalizarResponsables(draft.rolesConfig as RolConfig[]);
    }

    // 2. Si no hay borrador pero hay un plan para editar, mapearlo desde el backend
    if (planAEditar && planAEditar.roles) {
      return ROLES_DECRETO_648.map(rolDef => {
        const rolEdit = planAEditar.roles.find(r => r.numero === rolDef.numero);
        if (!rolEdit) {
          // Si por alguna razón no existe el rol en el plan a editar, lo inicializamos por defecto
          const actividades = getActividadesPorRol(rolDef.numero);
          return {
            ...rolDef,
            actividadesSeleccionadas: actividades.map((act, idx) => ({
              ...act,
              id: `rol-${rolDef.numero}-act-${idx}`,
              tipoEvidencia: 'SOLO_CHECK' as const,
              fechaCorte: `${planAEditar.vigencia}-09-30`,
              puntosControl: [],
              frecuenciaPuntosControl: 'trimestral' as const,
            })),
            actividadesCustom: [],
            responsables: []
          };
        }

        // Mapear actividades del plan existente
        const actividadesConfiguradas = rolEdit.actividades.map((act) =>
          enriquecerActividadDesdeBackend(act, planAEditar.vigencia),
        );

        // Separar entre seleccionadas (del template) y custom (creadas manualmente)
        const actividadesTemplate = getActividadesPorRol(rolDef.numero);
        const nombresTemplate = actividadesTemplate.map(a => a.nombre);
        
        const actividadesSeleccionadas = actividadesConfiguradas.filter(a => nombresTemplate.includes(a.nombre));
        const actividadesCustom = actividadesConfiguradas.filter(a => !nombresTemplate.includes(a.nombre));

        return {
          ...rolDef,
          id: rolEdit.id,
          actividadesSeleccionadas: actividadesSeleccionadas as any,
          actividadesCustom: actividadesCustom as any,
          responsables: mapResponsablesRolDesdeBackend(rolEdit),
        };
      });
    }

    // Comportamiento por defecto (nuevo plan sin borrador)
    return ROLES_DECRETO_648.map(rol => {
      const actividades = getActividadesPorRol(rol.numero);
      
      // a Auto-generar puntos de control según la periodicidad de cada actividad
      const actividadesConPuntos = actividades.map((act, idx) => {
        const uniqueId = `rol-${rol.numero}-act-${idx}`;
        const año = Number(vigencia || new Date().getFullYear());

        if (actividadRol4SinCortesPrecargados(rol.numero, act)) {
          return {
            ...act,
            id: uniqueId,
            tipoEvidencia: 'SOLO_CHECK' as const,
            fechaInicio: act.fechaInicio || `${año}-01-01`,
            fechaFin: act.fechaFin || `${año}-12-31`,
            fechaCorte: act.fechaFin || `${año}-12-31`,
            puntosControl: [],
            frecuenciaPuntosControl: undefined,
            tareasSeguimiento: [],
          };
        }

        const mkPC = (pcId: string, orden: number, fi: string, ff: string): PuntoControl => ({
          id: pcId, orden, nombre: `Corte ${orden}`, descripcion: '',
          fechaProgramada: fi, fechaSeguimiento: ff,
          fechaReal: null, responsable: '', estado: 'pendiente' as const, observaciones: '', evidencias: []
        });
        const ctrl = (act.control || '').toLowerCase();
        let puntosDefault: PuntoControl[];
        let frecuencia: FrecuenciaPuntoControl = 'trimestral';
        if (ctrl.includes('semestral')) {
          frecuencia = 'semestral';
          puntosDefault = [
            mkPC(`pc-${uniqueId}-1`, 1, `${año}-01-01`, `${año}-06-30`),
            mkPC(`pc-${uniqueId}-2`, 2, `${año}-07-01`, `${año}-12-31`),
          ];
        } else if (ctrl.includes('cuatrimestral')) {
          frecuencia = 'cuatrimestral';
          puntosDefault = [
            mkPC(`pc-${uniqueId}-1`, 1, `${año}-01-01`, `${año}-04-30`),
            mkPC(`pc-${uniqueId}-2`, 2, `${año}-05-01`, `${año}-08-31`),
            mkPC(`pc-${uniqueId}-3`, 3, `${año}-09-01`, `${año}-12-31`),
          ];
        } else if (ctrl.includes('trimestral')) {
          frecuencia = 'trimestral';
          puntosDefault = [
            mkPC(`pc-${uniqueId}-1`, 1, `${año}-01-01`, `${año}-03-31`),
            mkPC(`pc-${uniqueId}-2`, 2, `${año}-04-01`, `${año}-06-30`),
            mkPC(`pc-${uniqueId}-3`, 3, `${año}-07-01`, `${año}-09-30`),
            mkPC(`pc-${uniqueId}-4`, 4, `${año}-10-01`, `${año}-12-31`),
          ];
        } else if (ctrl.includes('anual')) {
          frecuencia = 'anual';
          puntosDefault = [
            mkPC(`pc-${uniqueId}-1`, 1, `${año}-01-01`, `${año}-12-31`),
          ];
        } else if (ctrl.includes('mensual')) {
          frecuencia = 'mensual';
          puntosDefault = Array.from({length: 12}, (_, i) => {
            const m = (i+1).toString().padStart(2, '0');
            const lastDay = new Date(año, i+1, 0).getDate().toString().padStart(2, '0');
            return mkPC(`pc-${uniqueId}-${i+1}`, i+1, `${año}-${m}-01`, `${año}-${m}-${lastDay}`);
          });
        } else {
          // Default: anual para actividades sin periodicidad definida
          frecuencia = 'anual';
          puntosDefault = [
            mkPC(`pc-${uniqueId}-1`, 1, act.fechaInicio || `${año}-01-01`, act.fechaFin || `${año}-12-31`),
          ];
        }
        puntosDefault = alinearCortesConFechasOficiales(puntosDefault, act, año);

        // Auto-asignar tareas al corte correspondiente (tarea N -> corte N)
        const tareasConCorte = (act.tareasSeguimiento || []).map((t, tIdx) => ({
          ...t,
          puntoControlId: puntosDefault[tIdx % puntosDefault.length]?.id,
        }));
        return {
          ...act,
          id: uniqueId,
          tipoEvidencia: 'SOLO_CHECK' as const,
          fechaInicio: act.fechaInicio || `${año}-01-01`,
          fechaFin: act.fechaFin || `${año}-12-31`,
          fechaCorte: puntosDefault[puntosDefault.length - 1]?.fechaSeguimiento || `${año}-12-31`,
          puntosControl: puntosDefault,
          frecuenciaPuntosControl: frecuencia,
          tareasSeguimiento: tareasConCorte,
        };
      });
      
      return {
        ...rol,
        actividadesSeleccionadas: actividadesConPuntos,
        actividadesCustom: [],
        responsables: []
      };
    })
  });

  // Re-vincular responsables de cada rol con profesionales OCI al editar (id_person vs config OCI).
  useEffect(() => {
    if (!planAEditar?.roles?.length || auditores.length === 0 || cargandoAuditores) return;
    setRolesConfig((prev) =>
      prev.map((rolCfg) => {
        const rolPlan = planAEditar.roles.find((r) => r.numero === rolCfg.numero);
        const fuente = rolPlan || rolCfg;
        const resolved = resolverResponsablesRolDesdeProfesionales(fuente, auditores);
        if (resolved.length === 0) return rolCfg;
        return { ...rolCfg, responsables: resolved.slice(0, 1) };
      }),
    );
  }, [planAEditar?.id, planAEditar?.roles, auditores, cargandoAuditores]);

  // Sincronizar fechas solo cuando el usuario cambia la vigencia (no al abrir edición/creación).
  const vigenciaPrevRef = useRef<number | null>(null);
  const omitirSyncVigenciaInicialRef = useRef(true);

  useEffect(() => {
    if (!vigencia || isNaN(vigencia) || vigencia < 2020 || vigencia > 2100) return;

    if (omitirSyncVigenciaInicialRef.current) {
      omitirSyncVigenciaInicialRef.current = false;
      vigenciaPrevRef.current = vigencia;
      return;
    }
    if (vigenciaPrevRef.current === vigencia) return;
    vigenciaPrevRef.current = vigencia;

    // Solo ajustar el año de las fechas del paso 1 (conservar mes/día elegidos por el usuario).
    setFechaInicio((prevInicio) => {
      const fi = prevInicio
        ? reemplazarAnioEnFechaIso(prevInicio, vigencia)
        : `${vigencia}-01-01`;
      setFechaFin((prevFin) => {
        let ff = prevFin
          ? reemplazarAnioEnFechaIso(prevFin, vigencia)
          : `${vigencia}-12-31`;
        if (ff < fi) ff = fi;
        return ff;
      });
      return fi;
    });

    setRolesConfig((prev) =>
      prev.map((rol) => ({
        ...rol,
        actividadesSeleccionadas: rol.actividadesSeleccionadas.map((act) => {
          const año = vigencia;
          if (actividadRol4SinCortesPrecargados(rol.numero, act)) {
            return {
              ...act,
              fechaInicio: act.fechaInicio
                ? reemplazarAnioEnFechaIso(act.fechaInicio, año)
                : act.fechaInicio,
              fechaFin: act.fechaFin
                ? reemplazarAnioEnFechaIso(act.fechaFin, año)
                : act.fechaFin,
              fechaCorte: act.fechaCorte
                ? reemplazarAnioEnFechaIso(act.fechaCorte, año)
                : resolverFechaCorteActividad(act, vigencia),
              puntosControl: [],
              tareasSeguimiento: alinearTareasFechasEntregaAVigencia(
                act.tareasSeguimiento,
                vigencia,
              ),
            };
          }
          const puntos = act.puntosControl || [];
          // Para actividades con periodicidad definida regeneramos cortes oficiales
          // para no romper fechas que caen en año+1 (p.ej. 31/01 del año siguiente).
          const cortesRegenerados = generarCortesOficiales(act.control || '', año);
          const nuevosPuntos = cortesRegenerados.length > 0 && cortesRegenerados.length === puntos.length
            ? puntos.map((pc, i) => ({
                ...pc,
                fechaProgramada: cortesRegenerados[i].fechaProgramada,
                fechaSeguimiento: cortesRegenerados[i].fechaSeguimiento,
              }))
            : puntos.map((pc) => ({
                ...pc,
                fechaProgramada: reemplazarAnioEnFechaIso(pc.fechaProgramada, año),
                fechaSeguimiento: pc.fechaSeguimiento
                  ? reemplazarAnioEnFechaIso(pc.fechaSeguimiento, año)
                  : pc.fechaSeguimiento,
              }));
          const ultimoSeg =
            nuevosPuntos.length > 0
              ? nuevosPuntos[nuevosPuntos.length - 1].fechaSeguimiento
              : undefined;
          return {
            ...act,
            fechaInicio: act.fechaInicio
              ? reemplazarAnioEnFechaIso(act.fechaInicio, año)
              : act.fechaInicio,
            fechaFin: act.fechaFin
              ? reemplazarAnioEnFechaIso(act.fechaFin, año)
              : act.fechaFin,
            fechaCorte:
              ultimoSeg ||
              act.fechaCorte ||
              resolverFechaCorteActividad(act, vigencia),
            puntosControl: nuevosPuntos.length > 0 ? nuevosPuntos : act.puntosControl,
            tareasSeguimiento: alinearTareasFechasEntregaAVigencia(act.tareasSeguimiento, vigencia),
          };
        }),
        actividadesCustom: (rol.actividadesCustom || []).map((act) => {
          const puntos = act.puntosControl || [];
          const nuevosPuntos = puntos.map((pc) => ({
            ...pc,
            fechaProgramada: reemplazarAnioEnFechaIso(pc.fechaProgramada, vigencia),
            fechaSeguimiento: pc.fechaSeguimiento
              ? reemplazarAnioEnFechaIso(pc.fechaSeguimiento, vigencia)
              : pc.fechaSeguimiento,
          }));
          const ultimoSeg =
            nuevosPuntos.length > 0
              ? nuevosPuntos[nuevosPuntos.length - 1].fechaSeguimiento
              : undefined;
          return {
            ...act,
            fechaInicio: act.fechaInicio
              ? reemplazarAnioEnFechaIso(act.fechaInicio, vigencia)
              : act.fechaInicio,
            fechaFin: act.fechaFin
              ? reemplazarAnioEnFechaIso(act.fechaFin, vigencia)
              : act.fechaFin,
            fechaCorte:
              ultimoSeg ||
              act.fechaCorte ||
              resolverFechaCorteActividad(act, vigencia),
            puntosControl: nuevosPuntos.length > 0 ? nuevosPuntos : act.puntosControl,
            tareasSeguimiento: alinearTareasFechasEntregaAVigencia(act.tareasSeguimiento, vigencia),
          };
        }),
      }))
    );
  }, [vigencia]);

  // Refuerzo de integridad para datos heredados: nunca permitir más de 1 responsable por rol/actividad.
  useEffect(() => {
    const hayMultiples = rolesConfig.some((rol) =>
      (rol.responsables?.length || 0) > 1 ||
      (rol.actividadesSeleccionadas || []).some((act) => (act.responsables?.length || 0) > 1) ||
      (rol.actividadesCustom || []).some((act) => (act.responsables?.length || 0) > 1)
    );
    if (!hayMultiples) return;
    setRolesConfig((prev) => normalizarResponsables(prev));
  }, [rolesConfig]);

  // Plan nuevo: pre-asignar responsable del plan solo en roles/actividades aún sin responsable.
  useEffect(() => {
    if (!jefeSeleccionado || planAEditar) return;
    setRolesConfig((prev) =>
      aplicarCambioResponsablePlanEnRoles(prev, null, jefeSeleccionado, 'rellenar-vacios'),
    );
  }, [jefeSeleccionado, planAEditar]);

  /**
   * Paso 1 → Paso 2:
   * - Primera vez: rellena roles/actividades vacíos con el responsable del plan.
   * - Si vuelve al paso 1 y cambia el responsable: solo sustituye donde estaba el anterior;
   *   no pisa asignaciones manuales a otra persona.
   */
  const handleJefeChange = (nuevoJefe: Auditor | null) => {
    const responsableAnterior = jefeSeleccionado;
    setJefeSeleccionado(nuevoJefe);
    wizardTouchedByUserRef.current = true;

    if (!nuevoJefe) return;

    const esCambioDeResponsable =
      !!responsableAnterior
      && !coincideAuditorConReferencia(responsableAnterior, nuevoJefe);

    setRolesConfig((prev) =>
      aplicarCambioResponsablePlanEnRoles(
        prev,
        esCambioDeResponsable ? responsableAnterior : null,
        nuevoJefe,
        esCambioDeResponsable ? 'solo-reemplazar-anterior' : 'rellenar-vacios',
      ),
    );
  };

  const handleRolesChange = (config: RolConfig[]) => {
    if (enModoSoloConsulta) return;
    wizardTouchedByUserRef.current = true;
    setRolesConfig(normalizarResponsables(config));
  };

  const [cargandoPlanBorrador, setCargandoPlanBorrador] = useState(false);

  const handleVigenciaChange = (nuevaVigencia: number) => {
    if (planAEditar?.id) return;
    if (nuevaVigencia === vigencia) return;

    if (!wizardHydrationCompletedRef.current) {
      setVigencia(nuevaVigencia);
      return;
    }

    wizardTouchedByUserRef.current = true;
    setVigencia(nuevaVigencia);

    // En "Nuevo plan", al cambiar vigencia se descarta el borrador temporal del wizard (no el plan en BD).
    if (!planAEditar) {
      localStorage.removeItem(draftKey);
      setServerDraftSynced(false);
      wizardBorradorApi.delete().catch(() => {});
    }
  };

  const planBorradorVigenciaActual = useMemo(() => {
    if (planAEditar?.vigencia === vigencia) return undefined;
    if (planAEditar) return undefined;
    return planesOtros.find(
      (p) => p.vigencia === vigencia && esEstadoPlanBorrador(p.estado),
    );
  }, [planesOtros, planAEditar, vigencia]);

  const handleContinuarBorrador = async () => {
    if (!planBorradorVigenciaActual || !onCargarPlanBorrador || cargandoPlanBorrador) return;
    setCargandoPlanBorrador(true);
    try {
      await onCargarPlanBorrador(planBorradorVigenciaActual);
    } catch {
      toast.error('No se pudo cargar el borrador');
    } finally {
      setCargandoPlanBorrador(false);
    }
  };

  /** Misma regla que «Editar plan»: vigencia fija al editar un plan ya guardado (incl. borrador en BD). */
  const vigenciaSoloLecturaEdicion =
    Boolean(planAEditar?.id) || cargandoPlanBorrador;

  /** Al abrir/editar un plan guardado, sincronizar paso 1 con datos del backend (el estado inicial no se recalcula solo). */
  useEffect(() => {
    if (!planAEditar?.id) return;
    const v = planAEditar.vigencia;
    if (v && !isNaN(v)) {
      setVigencia(v);
      vigenciaPrevRef.current = v;
      omitirSyncVigenciaInicialRef.current = true;
    }
    const vigenciaPlan = v || vigencia;
    const fi = alinearFechaPlanConVigencia(
      fechaCalendarioParaInput(
        (planAEditar as any).fecha_inicio ?? planAEditar.fechaInicio,
        `${vigenciaPlan}-01-01`,
      ),
      vigenciaPlan,
      'inicio',
    );
    let ff = alinearFechaPlanConVigencia(
      fechaCalendarioParaInput(
        (planAEditar as any).fecha_fin ?? planAEditar.fechaFin,
        `${vigenciaPlan}-12-31`,
      ),
      vigenciaPlan,
      'fin',
    );
    if (ff < fi) ff = fi;
    setFechaInicio(fi);
    setFechaFin(ff);
    if (planAEditar.jefeOCI && auditores.length > 0) {
      const jefe = resolverJefePlanDesdeProfesionales(planAEditar, auditores);
      if (jefe) setJefeSeleccionado(jefe);
    } else if (planAEditar.jefeOCI) {
      setJefeSeleccionado(planAEditar.jefeOCI);
    }
    if (planAEditar.equipoAprobacion) {
      setComiteAprobacion(planAEditar.equipoAprobacion);
    }
    if (planAEditar.ordenAprobacion) {
      setOrdenAprobacion(planAEditar.ordenAprobacion);
    }
  }, [
    planAEditar?.id,
    planAEditar?.vigencia,
    planAEditar?.fechaInicio,
    planAEditar?.fechaFin,
    (planAEditar as any)?.fecha_inicio,
    (planAEditar as any)?.fecha_fin,
    auditores,
  ]);

  useEffect(() => {
    if (!planAEditar?.id || !Array.isArray(planAEditar.roles) || planAEditar.roles.length === 0) return;
    let config = buildRolesConfigFromPlanAnual(planAEditar);
    try {
      const editRaw = localStorage.getItem(`esap:wizard_plan_anual_edit_${planAEditar.id}`);
      if (editRaw) {
        const editDraft = JSON.parse(editRaw);
        if (
          editDraft?.vigencia === planAEditar.vigencia &&
          Array.isArray(editDraft.rolesConfig)
        ) {
          config = mergeRolesConfigResponsablesFromDraft(config, editDraft.rolesConfig as RolConfig[]);
        }
      }
    } catch {
      /* ignore */
    }
    setRolesConfig(normalizarResponsables(config));
    mergeWizardDesdeServidorHecho.current = true;
  }, [planAEditar?.id, planAEditar?.vigencia, planAEditar?.roles?.length]);

  // Al abrir «Nuevo plan»: fusionar borrador del servidor con localStorage (gana el más reciente por timestamp).
  useEffect(() => {
    if (planAEditar) {
      wizardHydrationCompletedRef.current = true;
      return;
    }
    if (mergeWizardDesdeServidorHecho.current) return;
    mergeWizardDesdeServidorHecho.current = true;
    console.log('[WizardDraft][Hydration] inicio hidratacion Nuevo Plan');

    let cancelled = false;
    (async () => {
      try {
        const remote = await wizardBorradorApi.get();
        console.log('[WizardDraft][Hydration] respuesta backend:', remote);
        if (cancelled) return;

        const serverPayload = remote?.payload as Record<string, unknown> | null | undefined;
        let localDraft: any = null;
        try {
          const localStr = localStorage.getItem('esap:wizard_plan_anual_draft');
          localDraft = localStr ? JSON.parse(localStr) : null;
        } catch {
          localDraft = null;
        }

        const tsServer = Number(serverPayload?.timestamp ?? 0);
        const tsLocal = Number(localDraft?.timestamp ?? 0);

        const tieneServidor =
          !!serverPayload &&
          typeof serverPayload === 'object' &&
          Object.keys(serverPayload).length > 0 &&
          (serverPayload.paso !== undefined || serverPayload.rolesConfig !== undefined);

        let winner: any = localDraft;
        if (tieneServidor && (!localDraft || tsServer >= tsLocal)) {
          winner = serverPayload;
        }

        if (wizardTouchedByUserRef.current) {
          console.log('[WizardDraft][Hydration] cancelada por interacción de usuario');
          return;
        }
        if (!winner) {
          console.log('[WizardDraft][Hydration] sin winner (local/server vacíos)');
          return;
        }

        console.log('[WizardDraft][Hydration] aplicando winner', {
          tsServer,
          tsLocal,
          tieneServidor,
          winnerVigencia: (winner as any)?.vigencia,
          winnerPaso: (winner as any)?.paso,
        });

        const ocupadas = vigenciasBloqueadas;

        if (typeof winner.paso === 'number') setPaso(winner.paso);
        if (typeof winner.vigencia === 'number' && !ocupadas.includes(winner.vigencia)) {
          setVigencia(winner.vigencia);
        }
        if (typeof winner.fechaInicio === 'string') setFechaInicio(winner.fechaInicio);
        if (typeof winner.fechaFin === 'string') setFechaFin(winner.fechaFin);
        if (winner.ordenAprobacion === 'secuencial' || winner.ordenAprobacion === 'paralelo') {
          setOrdenAprobacion(winner.ordenAprobacion);
        }
        if (Array.isArray(winner.comiteAprobacion)) setComiteAprobacion(winner.comiteAprobacion);
        if (winner.jefeSeleccionado) setJefeSeleccionado(winner.jefeSeleccionado as Auditor);
        if (winner.rolesConfig) {
          setRolesConfig(normalizarResponsables(winner.rolesConfig as RolConfig[]));
        }

        const savedAtStr =
          (typeof serverPayload?.savedAt === 'string' && serverPayload.savedAt) ||
          (typeof (winner as any).savedAt === 'string' && (winner as any).savedAt);
        setLastSaved(savedAtStr ? new Date(savedAtStr) : new Date());
        setServerDraftSynced(!!tieneServidor);

        if (localDraft && tsLocal > tsServer && tieneServidor) {
          await wizardBorradorApi.save({
              ...localDraft,
              timestamp: localDraft.timestamp ?? Date.now(),
            })
            .then(() => setServerDraftSynced(true))
            .catch(() => {});
        }
      } catch (e) {
        console.warn('[Wizard Plan Anual] Borrador servidor no disponible:', e);
      } finally {
        wizardHydrationCompletedRef.current = true;
        console.log('[WizardDraft][Hydration] finalizada', {
          hydrationReady: wizardHydrationCompletedRef.current,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [planAEditar]);

  // Autoguardado: localStorage siempre; servidor además en «Nuevo plan» (debounce).
  useEffect(() => {
    if (soloLectura) return;
    if (isSubmitting || showSuccessModal) return;
    // Evita que el primer render (estado vacío por defecto) pise el borrador
    // que llega del backend antes de completar la hidratación inicial.
    if (!planAEditar && !wizardHydrationCompletedRef.current) {
      console.log('[WizardDraft][Autosave] omitido hasta terminar hidratación');
      return;
    }

    const borrador: Record<string, unknown> = {
      paso,
      vigencia,
      fechaInicio,
      fechaFin,
      ordenAprobacion,
      jefeSeleccionado,
      rolesConfig,
      comiteAprobacion,
      timestamp: Date.now(),
    };

    localStorage.setItem(draftKey, JSON.stringify(borrador));
    setLastSaved(new Date());

    if (planAEditar) return;

    if (serverBorradorTimerRef.current) clearTimeout(serverBorradorTimerRef.current);
    serverBorradorTimerRef.current = setTimeout(() => {
      wizardBorradorApi.save(borrador)
        .then(() => {
          setServerDraftSynced(true);
          setLastSaved(new Date());
        })
        .catch((err: unknown) => {
          console.warn('[Wizard Plan Anual] Autoguardado en servidor falló:', err);
          setServerDraftSynced(false);
        });
    }, 2800);

    return () => {
      if (serverBorradorTimerRef.current) clearTimeout(serverBorradorTimerRef.current);
    };
  }, [
    paso,
    vigencia,
    fechaInicio,
    fechaFin,
    ordenAprobacion,
    jefeSeleccionado,
    rolesConfig,
    comiteAprobacion,
    planAEditar,
    isSubmitting,
    showSuccessModal,
    draftKey,
    soloLectura,
  ]);

  // Validación del Paso 1: Fechas y vigencia
  const validarPaso1 = () => {
    const planBorrador = planesOtros.find(
      (p) => p.vigencia === vigencia && esEstadoPlanBorrador(p.estado),
    );
    if (planBorrador && !planAEditar) {
      toast.info(`Ya hay un borrador para ${vigencia}`, {
        description: 'Use el botón «Continuar editando borrador» para cargar el plan antes de continuar.',
      });
      return false;
    }

    if (vigenciaEstaBloqueada(vigencia)) {
      const planFormal = planesOtros.find((p) => p.vigencia === vigencia);
      toast.error(`Ya existe un plan para la vigencia ${vigencia}`, {
        description: planFormal
          ? `Estado: ${planFormal.estado}. Elija otra vigencia o consulte ese plan desde inicio.`
          : 'Seleccione otra vigencia.',
      });
      return false;
    }
    
    // Extraer año directamente del string YYYY-MM-DD para evitar problemas de zona horaria
    const anioFechaInicio = fechaInicio ? parseInt(fechaInicio.split('-')[0], 10) : 0;
    const anioFechaFin = fechaFin ? parseInt(fechaFin.split('-')[0], 10) : 0;
    
    // Validar que la fecha fin no sea anterior a fecha inicio (comparación string funciona para YYYY-MM-DD)
    if (fechaFin < fechaInicio) {
      toast.error('Error de fechas', {
        description: 'La fecha de finalización no puede ser anterior a la fecha de inicio'
      });
      return false;
    }
    
    // Validar que las fechas coincidan con la vigencia
    if (anioFechaInicio !== vigencia || anioFechaFin !== vigencia) {
      toast.error('Error de vigencia', {
        description: `Las fechas deben estar dentro de la vigencia ${vigencia}. Fecha inicio: ${anioFechaInicio}, Fecha fin: ${anioFechaFin}`
      });
      return false;
    }
    
    // Validar que haya un responsable seleccionado
    if (!jefeSeleccionado) {
      toast.error('Responsable requerido', {
        description: 'Debe seleccionar un responsable del Plan Anual'
      });
      return false;
    }
    
    return true;
  };

  const validarPaso2 = () => {
    // Validar que hay actividades seleccionadas (incluidas en el plan, no solo guardadas por soft-uncheck)
    const tieneActividades = rolesConfig.some(rol => 
      contarActividadesIncluidas(rol) > 0 || rol.actividadesCustom.length > 0
    );
    if (!tieneActividades) {
      toast.error('Debe seleccionar al menos una actividad en algún rol');
      return false;
    }
    
    // a️ VALIDACIN OBLIGATORIA: Todos los roles con actividades DEBEN tener responsables
    const rolesConActividades = rolesConfig.filter(rol => 
      contarActividadesIncluidas(rol) + (rol.actividadesCustom?.length || 0) > 0
    );
    const rolesSinResponsables = rolesConActividades.filter(rol => (rol.responsables?.length || 0) === 0);
    
    if (rolesSinResponsables.length > 0) {
      const nombresRoles = rolesSinResponsables.map(r => `Rol ${r.numero}`).join(', ');
      toast.error('Responsables requeridos', {
        description: `Los siguientes roles tienen actividades pero no tienen responsables asignados: ${nombresRoles}. Debe asignar al menos un responsable por rol.`,
        duration: 6000
      });
      return false;
    }

    // Validar que cada actividad tenga fecha de corte (campo o último punto de control)
    const actividadesSinFechaCorte: string[] = [];
    for (const rol of rolesConActividades) {
      for (const act of (rol.actividadesSeleccionadas || []).filter(actividadIncluidaEnPlan)) {
        if (!resolverFechaCorteActividad(act, vigencia)) {
          actividadesSinFechaCorte.push(`"${act.nombre.slice(0, 40)}" (Rol ${rol.numero})`);
        }
      }
      for (const act of (rol.actividadesCustom || [])) {
        if (!resolverFechaCorteActividad(act, vigencia)) {
          actividadesSinFechaCorte.push(`"${act.nombre.slice(0, 40)}" (Rol ${rol.numero} personalizada)`);
        }
      }
    }
    if (actividadesSinFechaCorte.length > 0) {
      toast.error('Fecha de corte requerida', {
        description: `Las siguientes actividades no tienen fecha de corte: ${actividadesSinFechaCorte.slice(0, 3).join(', ')}${actividadesSinFechaCorte.length > 3 ? ` y ${actividadesSinFechaCorte.length - 3} más` : ''}.`,
        duration: 7000
      });
      return false;
    }
    
    // Contar total de actividades y responsables
    const totalActividades = rolesConActividades.reduce((sum, rol) => 
      sum + contarActividadesIncluidas(rol) + (rol.actividadesCustom?.length || 0), 0
    );
    const totalResponsables = rolesConActividades.reduce((sum, rol) => 
      sum + (rol.responsables?.length || 0), 0
    );
    
    console.log(`S& [validarPaso2] Validación exitosa:`);
    console.log(`   - ${rolesConActividades.length} roles con actividades`);
    console.log(`   - ${totalActividades} actividades totales`);
    console.log(`   - ${totalResponsables} responsables asignados`);
    
    return true;
  };

  const validarComiteParaGuardar = () => {
    if (comiteAprobacion.length > 0) return true;
    toast.error('Comité de aprobación requerido', {
      description:
        'Agregue al menos un miembro al comité aprobador del plan (paso 3) antes de guardar.',
      duration: 6000,
    });
    if (paso !== 3) setPaso(3);
    return false;
  };

  const avanzarPaso = () => {
    if (!enModoSoloConsulta) {
      if (paso === 1 && !validarPaso1()) return;
      if (paso === 2 && !validarPaso2()) return;
    }
    setPaso(paso + 1);
  };

  /** Flecha del encabezado: paso anterior; en paso 1 sale del asistente (como Cancelar). */
  const handleAtrasEncabezado = () => {
    if (paso > 1) {
      setPaso(paso - 1);
      return;
    }
    onCancelar();
  };

    const handleFinalizar = async () => {
    if (soloLectura) return;
    if (!validarComiteParaGuardar()) return;
    // Validación final de seguridad antes de crear el plan
    const rolesConActividades = rolesConfig.filter(rol => 
      contarActividadesIncluidas(rol) + (rol.actividadesCustom?.length || 0) > 0
    );
    const totalResponsables = rolesConActividades.reduce((sum, rol) => 
      sum + (rol.responsables?.length || 0), 0
    );
    
    if (totalResponsables === 0) {
      toast.error('No se puede crear el Plan Anual', {
        description: 'Debe asignar al menos un responsable a las actividades antes de crear el plan.',
        duration: 5000
      });
      return;
    }
    
    // Validación de seguridad para TypeScript (ya se validó en validarPaso1)
    if (!jefeSeleccionado) {
      toast.error('Debe seleccionar un responsable del Plan');
      return;
    }
    
    try {
      setIsSubmitting(true);
      const exito = await onCrear(vigencia, jefeSeleccionado, rolesConfig, fechaInicio, fechaFin, comiteAprobacion, ordenAprobacion);
      setIsSubmitting(false);
      
      if (exito) {
        // Limpiar el borrador local y el del servidor al crear plan nuevo con éxito
        localStorage.removeItem(draftKey);
        if (!planAEditar) {
          try {
            await wizardBorradorApi.delete();
          } catch (delErr) {
            console.warn('[Wizard Plan Anual] No se pudo borrar borrador en servidor:', delErr);
          }
        }
        setShowSuccessModal(true);
      }
    } catch (e: any) {
      setIsSubmitting(false);
      toast.error('Error al enviar el plan', { description: e?.message || 'Error desconocido' });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex-1 flex flex-col bg-white relative"
    >
      {/* Success Modal Overlay (Portaled to body to cover whole screen) */}
      {showSuccessModal && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          {/* Fondo blanco difuminado intenso */}
          <div className="absolute inset-0 bg-white/70 backdrop-blur-md" />
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="relative bg-white rounded-2xl shadow-2xl border-2 border-gray-200 w-full max-w-md p-8 text-center z-10"
          >
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {planAEditar ? '¡Plan actualizado con éxito!' : '¡Plan creado con éxito!'}
            </h2>
            <p className="text-gray-600 mb-8 border-b pb-8">
              El Plan Anual de Auditoría {vigencia} ha sido guardado correctamente. Ahora puedes revisarlo desde el Dashboard.
            </p>
            <button
              onClick={() => onTerminado?.()}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow hover:shadow-md flex items-center justify-center gap-2"
            >
              Ir al Dashboard <ArrowRight className="w-5 h-5" />
            </button>
          </motion.div>
        </div>,
        document.body
      )}
      {mostrarVistaPrevia && puedeMostrarVistaPrevia && createPortal(
        <div className="fixed inset-0 z-[99998] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            aria-label="Cerrar vista previa"
            onClick={() => setMostrarVistaPrevia(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-white rounded-2xl shadow-2xl border-2 border-gray-200 w-full max-w-2xl max-h-[88vh] flex flex-col z-10 overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between gap-3 bg-slate-50">
              <div className="flex items-center gap-2 min-w-0">
                <BookOpen className="w-5 h-5 text-blue-600 shrink-0" />
                <div>
                  <h2 className="text-lg font-bold text-gray-900 truncate">Vista previa del plan</h2>
                  <p className="text-xs text-gray-500">Solo lectura · Paso {paso} de 3</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMostrarVistaPrevia(false)}
                className="p-2 rounded-lg hover:bg-gray-200 text-gray-600 transition-colors"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-4 overflow-y-auto text-sm space-y-5">
              {planAEditar?.id && (
                <p className="text-xs text-gray-500 font-mono break-all">ID plan: {planAEditar.id}</p>
              )}
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Vigencia</p>
                  <p className="font-bold text-gray-900">{vigencia}</p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Periodo</p>
                  <p className="font-bold text-gray-900">{fechaInicio || '—'} → {fechaFin || '—'}</p>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-100">
                <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide mb-1">Responsable del plan</p>
                <p className="font-semibold text-gray-900">{jefeSeleccionado?.nombre || 'Sin asignar'}</p>
                {jefeSeleccionado?.cargo && (
                  <p className="text-xs text-gray-600 mt-0.5">{jefeSeleccionado.cargo}</p>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Roles y actividades incluidas</p>
                <ul className="space-y-2">
                  {[...rolesConfig].sort((a, b) => a.numero - b.numero).map((rol) => {
                    const nSel = contarActividadesIncluidas(rol);
                    const nCustom = (rol.actividadesCustom || []).filter(actividadIncluidaEnPlan).length;
                    const total = nSel + nCustom;
                    return (
                      <li key={rol.numero} className="flex justify-between gap-2 py-2 border-b border-gray-100 last:border-0">
                        <span className="text-gray-800"><span className="font-bold text-blue-700">Rol {rol.numero}</span> · {rol.nombre}</span>
                        <span className="text-gray-600 whitespace-nowrap">{total} actividad{total !== 1 ? 'es' : ''}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div className="p-3 rounded-xl bg-amber-50/90 border border-amber-100">
                <p className="text-xs font-semibold text-amber-900 uppercase tracking-wide mb-1">Comité de aprobación (obligatorio al finalizar)</p>
                <p className="text-gray-800">
                  {comiteAprobacion.length === 0
                    ? 'Sin comité configurado'
                    : `${comiteAprobacion.length} miembro(s) · orden ${ordenAprobacion === 'paralelo' ? 'paralelo' : 'secuencial'}`}
                </p>
              </div>
            </div>
            <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button
                type="button"
                onClick={() => setMostrarVistaPrevia(false)}
                className="px-5 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-semibold text-sm"
              >
                Cerrar
              </button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}
      {/* Header */}
      <div className="border-b-2 border-gray-200 px-8 py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleAtrasEncabezado}
              title={paso > 1 ? `Volver al paso ${paso - 1}` : 'Salir del asistente'}
              className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {soloLectura && planAEditar
                  ? 'Consultar definición del Plan Anual'
                  : planAEditar
                    ? 'Editar Plan Anual'
                    : 'Crear Plan Anual'}
              </h1>
              <p className="text-sm text-gray-600">Paso {paso} de 3</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            {puedeMostrarVistaPrevia && !soloLectura && (
              <button
                type="button"
                onClick={() => {
                  setVistaPreviaActiva((v) => !v);
                  setMostrarVistaPrevia(false);
                }}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg border transition-colors ${
                  vistaPreviaActiva
                    ? 'text-gray-800 bg-gray-200 border-gray-400 ring-2 ring-gray-300'
                    : 'text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border-indigo-200'
                }`}
                title={
                  vistaPreviaActiva
                    ? 'Salir de vista previa y volver a editar'
                    : 'Recorrer los 3 pasos en solo lectura (escala de grises, sin editar)'
                }
              >
                <Eye className="w-4 h-4 shrink-0" />
                {vistaPreviaActiva ? 'Salir de vista previa' : 'Vista previa'}
              </button>
            )}

          {/* Zona de guardado (Borrador) */}
          {!soloLectura && (
          <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg p-1.5">
            <AnimatePresence>
              {lastSaved && (
                <motion.div 
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 rounded-md border border-green-200"
                >
                  <Check className="w-3.5 h-3.5" />
                  {planAEditar
                    ? `Plan en borrador (${lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`
                    : !planAEditar && serverDraftSynced
                      ? `Borrador temporal (${lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`
                      : `Guardado (${lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`}
                </motion.div>
              )}
            </AnimatePresence>
            <button 
              onClick={async () => {
                if (!jefeSeleccionado || !fechaInicio || !fechaFin) {
                  toast.error('Complete el paso 1', {
                    description: 'Indique vigencia, responsable del plan y fechas antes de guardar.',
                  });
                  return;
                }
                // Guardar borrador: no exige comité (se valida al finalizar / Crear).
                if (onGuardarBorrador) {
                  setIsSubmitting(true);
                  const ok = await onGuardarBorrador(
                    vigencia,
                    jefeSeleccionado,
                    rolesConfig,
                    fechaInicio,
                    fechaFin,
                    comiteAprobacion,
                    ordenAprobacion,
                  );
                  setIsSubmitting(false);
                  if (ok) setLastSaved(new Date());
                  return;
                }
                const borradorActual = {
                  idPlan: planAEditar?.id,
                  vigencia,
                  jefeSeleccionado,
                  fechaInicio,
                  fechaFin,
                  rolesConfig,
                  paso,
                  comiteAprobacion,
                  ordenAprobacion,
                  timestamp: Date.now(),
                };
                localStorage.setItem(draftKey, JSON.stringify(borradorActual));
                setLastSaved(new Date());
                if (!planAEditar) {
                  try {
                    await wizardBorradorApi.save(borradorActual);
                    setServerDraftSynced(true);
                    toast.success('Borrador guardado', {
                      description: 'Guardado en este equipo y en el servidor.',
                    });
                  } catch (e: any) {
                    setServerDraftSynced(false);
                    toast.warning('Borrador guardado solo en el equipo', {
                      description: e?.message || 'No se pudo sincronizar con el servidor.',
                    });
                  }
                } else {
                  toast.success('Borrador guardado manualmente', {
                    description: 'Tu progreso está seguro en este equipo.',
                  });
                }
              }}
              title={
                onGuardarBorrador
                  ? 'Guardar plan en borrador (base de datos). No requiere comité configurado.'
                  : 'Guardar borrador local'
              }
              className="p-2 text-gray-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
              disabled={isSubmitting}
            >
              <Save className="w-5 h-5" />
            </button>
          </div>
          )}
          </div>
        </div>

        {vistaPreviaActiva && !soloLectura && (
          <div className="mb-4 rounded-xl border border-slate-400 bg-slate-200 px-4 py-2.5 text-sm text-slate-800 flex items-start gap-2">
            <Eye className="w-4 h-4 shrink-0 mt-0.5 text-slate-600" />
            <p>
              <strong className="font-semibold">Vista previa activa.</strong> Los pasos se muestran en gris y no se
              pueden editar. Use <strong>Salir de vista previa</strong> o los botones Anterior/Siguiente para revisar;
              luego desactive para seguir editando.
            </p>
          </div>
        )}

        {/* Progress */}
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((num) => (
            <div
              key={num}
              className={`flex-1 h-2 rounded-full ${
                num <= paso
                  ? enModoSoloConsulta
                    ? 'bg-gray-500'
                    : 'bg-blue-600'
                  : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div
        className={`flex-1 overflow-y-auto p-8 transition-colors ${
          enModoSoloConsulta ? 'bg-slate-200' : 'bg-gray-50'
        }`}
      >
        <div className={`max-w-7xl mx-auto ${enModoSoloConsulta ? WRAPPER_PASOS_SOLO_LECTURA : ''}`}>
          <AnimatePresence mode="wait">
            {paso === 1 && (
              <Paso1 
                key="paso1" 
                vigencia={vigencia} 
                onVigenciaChange={handleVigenciaChange} 
                jefeOCI={jefeSeleccionado} 
                onJefeChange={handleJefeChange}
                fechaInicio={fechaInicio}
                onFechaInicioChange={setFechaInicio}
                fechaFin={fechaFin}
                onFechaFinChange={setFechaFin}
                auditores={auditores}
                cargandoAuditores={cargandoAuditores}
                onRecargarAuditores={cargarAuditores}
                vigenciasExistentes={vigenciasBloqueadas}
                vigenciasDisponibles={vigenciasDisponibles}
                planBorradorVigencia={planBorradorVigenciaActual}
                cargandoPlanBorrador={cargandoPlanBorrador}
                onContinuarBorrador={
                  planBorradorVigenciaActual && onCargarPlanBorrador
                    ? handleContinuarBorrador
                    : undefined
                }
                soloLectura={enModoSoloConsulta}
                vigenciaSoloLecturaEdicion={vigenciaSoloLecturaEdicion}
              />
            )}
            {paso === 2 && (
              <Paso2
                key="paso2"
                rolesConfig={rolesConfig}
                onRolesChange={handleRolesChange}
                fechaInicio={fechaInicio}
                fechaFin={fechaFin}
                auditores={auditores}
                jefeOCI={jefeSeleccionado}
                soloLectura={enModoSoloConsulta}
              />
            )}
            {paso === 3 && (
              <Paso3 
                key="paso3" 
                vigencia={vigencia} 
                jefeOCI={jefeSeleccionado} 
                rolesConfig={rolesConfig}
                soloLectura={enModoSoloConsulta}
                aprobadoresComite={aprobadoresComite}
                comiteAprobacion={comiteAprobacion}
                setComiteAprobacion={setComiteAprobacion}
                ordenAprobacion={ordenAprobacion}
                setOrdenAprobacion={setOrdenAprobacion}
                handleDragStartAprobador={handleDragStartAprobador}
                handleDragOverAprobador={handleDragOverAprobador}
                handleDropAprobador={handleDropAprobador}
                draggedAprobadorIndex={draggedAprobadorIndex}
                setDraggedAprobadorIndex={setDraggedAprobadorIndex}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t-2 border-gray-200 px-8 py-4 bg-white">
        {soloLectura && (
          <p className="mb-3 text-sm text-amber-950 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5">
            <strong className="font-semibold">Solo consulta.</strong>{' '}
            No puede modificar la definición del plan; revise los tres pasos y use los botones de abajo para salir o ir a aprobación.
          </p>
        )}
        <div className="flex justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <button type="button" onClick={onCancelar} className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium">
            {soloLectura ? 'Volver' : 'Cancelar'}
          </button>
        </div>
        
        <div className="flex flex-wrap items-center justify-end gap-3">
          {soloLectura ? (
            <>
              {puedeIrAAprobacion && typeof onIrAAprobacion === 'function' && (
                <button
                  type="button"
                  onClick={onIrAAprobacion}
                  className="inline-flex items-center gap-2 px-6 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm transition-colors"
                >
                  <FileCheck className="w-4 h-4 shrink-0" />
                  Ir a aprobación
                </button>
              )}
              {paso > 1 && (
                <button type="button" onClick={() => setPaso(paso - 1)} className="px-6 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium">
                  Anterior
                </button>
              )}
              {paso < 3 ? (
                <button type="button" onClick={avanzarPaso} className="px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors bg-gray-600 hover:bg-gray-700 text-white cursor-pointer">
                  Siguiente <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button type="button" onClick={onCancelar} className="px-6 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-medium">
                  Volver al panel
                </button>
              )}
            </>
          ) : (
            <>
              {paso > 1 && (
                <button type="button" onClick={() => setPaso(paso - 1)} className="px-6 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium">
                  Anterior
                </button>
              )}
              {paso < 3 ? (
                <button 
                  type="button"
                  onClick={avanzarPaso} 
                  disabled={
                    (paso === 1 && (!jefeSeleccionado || !fechaInicio || !fechaFin || fechaFin < fechaInicio || parseInt(fechaInicio.split('-')[0], 10) !== vigencia || parseInt(fechaFin.split('-')[0], 10) !== vigencia || vigenciaEstaBloqueada(vigencia) || (!!planBorradorVigenciaActual && !planAEditar) || isNaN(vigencia) || vigencia < 2020 || vigencia > 2100)) ||
                    (paso === 2 && rolesConfig.some(r => (contarActividadesIncluidas(r) + (r.actividadesCustom?.length || 0) > 0) && (r.responsables?.length || 0) === 0))
                  }
                  className={`px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${
                    (paso === 1 && (!jefeSeleccionado || !fechaInicio || !fechaFin || fechaFin < fechaInicio || parseInt(fechaInicio.split('-')[0], 10) !== vigencia || parseInt(fechaFin.split('-')[0], 10) !== vigencia || vigenciaEstaBloqueada(vigencia) || (!!planBorradorVigenciaActual && !planAEditar) || isNaN(vigencia) || vigencia < 2020 || vigencia > 2100)) ||
                    (paso === 2 && rolesConfig.some(r => (contarActividadesIncluidas(r) + (r.actividadesCustom?.length || 0) > 0) && (r.responsables?.length || 0) === 0))
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                  }`}
                >
                  Siguiente <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button 
                  type="button"
                  onClick={handleFinalizar} 
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      {planAEditar ? 'Guardando...' : 'Creando...'}
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" /> {planAEditar ? 'Guardar Cambios' : 'Crear'}
                    </>
                  )}
                </button>
              )}
            </>
          )}
        </div>
        </div>
      </div>
    </motion.div>
  );
}

// Paso 1: Configuración básica
function Paso1({ vigencia, onVigenciaChange, jefeOCI, onJefeChange, fechaInicio, onFechaInicioChange, fechaFin, onFechaFinChange, auditores, cargandoAuditores, vigenciasExistentes = [], vigenciasDisponibles = [], planBorradorVigencia, cargandoPlanBorrador = false, onContinuarBorrador, soloLectura = false, vigenciaSoloLecturaEdicion = false }: any) {
  const vigenciaCampoSoloLectura = soloLectura || vigenciaSoloLecturaEdicion;
  const anioFechaInicio = fechaInicio ? parseInt(fechaInicio.split('-')[0], 10) : vigencia;
  const anioFechaFin = fechaFin ? parseInt(fechaFin.split('-')[0], 10) : vigencia;
  const errorFechaFinAnterior = fechaFin && fechaInicio && fechaFin < fechaInicio;
  const errorVigenciaNoCoincide = (anioFechaInicio !== vigencia || anioFechaFin !== vigencia);
  
  const handleFechaInicioChange = (nuevaFechaInicio: string) => {
    onFechaInicioChange(nuevaFechaInicio);
    if (fechaFin && fechaFin < nuevaFechaInicio) onFechaFinChange(nuevaFechaInicio);
  };

  const handleVigenciaSelect = (nuevaVigencia: number) => {
    if (vigenciaCampoSoloLectura) return;
    if (isNaN(nuevaVigencia)) return;
    onVigenciaChange(nuevaVigencia);
    if (nuevaVigencia >= 2020 && nuevaVigencia <= 2100) {
      const anioActual = fechaInicio ? parseInt(fechaInicio.split('-')[0], 10) : nuevaVigencia;
      // Solo ajustar mes/día si cambió el año; no pisar fechas ya elegidas en la misma vigencia.
      if (anioActual !== nuevaVigencia) {
        const fi = fechaInicio
          ? reemplazarAnioEnFechaIso(fechaInicio, nuevaVigencia)
          : `${nuevaVigencia}-01-01`;
        const ff = fechaFin
          ? reemplazarAnioEnFechaIso(fechaFin, nuevaVigencia)
          : `${nuevaVigencia}-12-31`;
        onFechaInicioChange(fi);
        onFechaFinChange(ff < fi ? fi : ff);
      }
    }
  };

  // Combobox state
  const [inputText, setInputText] = useState(String(vigencia));
  const [showDropdown, setShowDropdown] = useState(false);
  const comboRef = useRef<HTMLDivElement>(null);

  const filteredOptions = vigenciasDisponibles.filter((y: number) => String(y).includes(inputText));

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => { setInputText(String(vigencia)); }, [vigencia]);

  const handleInputChange = (val: string) => {
    if (vigenciaCampoSoloLectura) return;
    setInputText(val);
    setShowDropdown(true);
    const num = parseInt(val, 10);
    // Solo aplicar vigencia con año completo (evita 2 → 20 → 204 → 2043 mientras escribe).
    if (!isNaN(num) && val.trim().length === 4 && num >= 2020 && num <= 2100) {
      handleVigenciaSelect(num);
    }
  };

  const handleOptionClick = (y: number) => {
    handleVigenciaSelect(y);
    setInputText(String(y));
    setShowDropdown(false);
  };

  const vigenciaInvalida = !vigencia || isNaN(vigencia) || vigencia < 2020 || vigencia > 2100;
  const vigenciaConBorrador = !vigenciaInvalida && !!planBorradorVigencia;
  const vigenciaOcupada = !vigenciaInvalida && vigenciasExistentes.includes(vigencia);
  const vigenciaDisponible = !vigenciaInvalida && !vigenciaOcupada && !vigenciaConBorrador;

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-3">Configuración básica</h2>
        <p className="text-gray-600">Define la vigencia, periodo de ejecución y el responsable del plan</p>
      </div>

      <div className="bg-white rounded-xl border-2 border-gray-200 p-8 space-y-6">
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">Vigencia <span className="text-red-500">*</span></label>
          {vigenciaCampoSoloLectura ? (
            <div className="rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1">
                {soloLectura ? 'Vigencia del plan (solo consulta)' : 'Vigencia del plan'}
              </p>
              <p className="text-3xl font-black text-slate-900 tabular-nums">{vigencia}</p>
              <p className="text-xs text-slate-600 mt-2">
                {soloLectura ? (
                  <>No puede modificarse en modo consulta. Use <strong>Siguiente</strong> para ver roles y actividades.</>
                ) : cargandoPlanBorrador ? (
                  <>Cargando borrador… La vigencia quedará fijada al del plan guardado.</>
                ) : (
                  <>No puede modificarse al editar un plan existente. Para otra vigencia, cree un plan nuevo desde inicio.</>
                )}
              </p>
            </div>
          ) : (
          <>
          <div className="relative" ref={comboRef}>
            <input 
              type="text"
              inputMode="numeric"
              value={inputText} 
              onChange={(e) => handleInputChange(e.target.value)}
              onFocus={() => setShowDropdown(true)}
              placeholder="Escribe o selecciona un año..."
              className={`w-full px-4 py-3 border-2 rounded-lg text-lg font-bold focus:outline-none pr-32 ${
                vigenciaOcupada ? 'border-red-500 bg-red-50 focus:border-red-500'
                : vigenciaConBorrador ? 'border-amber-500 bg-amber-50 focus:border-amber-500'
                : vigenciaDisponible ? 'border-green-500 bg-green-50 focus:border-green-500'
                : 'border-gray-300 focus:border-blue-500'
              }`}
            />
            <button type="button" onClick={() => setShowDropdown(!showDropdown)} className="absolute right-24 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600">
              <svg className={`w-5 h-5 transition-transform ${showDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {vigenciaDisponible && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs font-semibold px-2 py-1 rounded-full border border-green-300">Disponible</span>
            )}
            {vigenciaConBorrador && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-xs font-semibold px-2 py-1 rounded-full border border-amber-300">Borrador</span>
            )}
            {vigenciaOcupada && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 bg-red-100 text-red-700 text-xs font-semibold px-2 py-1 rounded-full border border-red-300">Ya existe</span>
            )}
            {showDropdown && (
              <div
                className="absolute z-50 w-full mt-1 bg-white border-2 border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto overscroll-contain"
                onWheel={(e) => {
                  const el = e.currentTarget;
                  const canScrollUp = el.scrollTop > 0;
                  const canScrollDown = el.scrollTop + el.clientHeight < el.scrollHeight - 1;
                  if ((e.deltaY < 0 && canScrollUp) || (e.deltaY > 0 && canScrollDown)) {
                    e.stopPropagation();
                  }
                }}
              >
                {filteredOptions.length > 0 ? filteredOptions.map((y: number) => (
                  <button key={y} type="button" onClick={() => handleOptionClick(y)}
                    className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${
                      y === vigencia ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-lg font-bold">{y}</span>
                    {y === vigencia && <span className="ml-2 text-blue-500 text-xs">  seleccionado</span>}
                  </button>
                )) : (
                  <div className="px-4 py-3 text-sm text-gray-500 italic">No hay años disponibles que coincidan</div>
                )}
              </div>
            )}
          </div>
          {!vigenciaCampoSoloLectura && vigenciaConBorrador ? (
            <div className="mt-2 p-3 rounded-lg border border-amber-200 bg-amber-50/80 space-y-2">
              <p className="text-xs text-amber-900 font-medium">
                Ya hay un plan en borrador para {vigencia}. Puede continuar editándolo (no se creará un duplicado).
              </p>
              {onContinuarBorrador && (
                <button
                  type="button"
                  disabled={cargandoPlanBorrador}
                  onClick={() => void onContinuarBorrador()}
                  className="text-xs font-bold text-amber-900 bg-white border border-amber-300 hover:bg-amber-100 disabled:opacity-60 disabled:cursor-wait px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5"
                >
                  {cargandoPlanBorrador && <Loader2 className="w-3 h-3 animate-spin" />}
                  Continuar editando borrador {vigencia}
                </button>
              )}
            </div>
          ) : vigenciaOcupada ? (
            <p className="text-xs text-red-600 mt-1 font-medium">Ya existe un plan formalizado para {vigencia}. Selecciona otro año del listado.</p>
          ) : vigenciaDisponible ? (
            <p className="text-xs text-green-600 mt-1 font-medium">✅ Año {vigencia} disponible. Las fechas se ajustan automáticamente.</p>
          ) : (
            <p className="text-xs text-gray-500 mt-1">Escribe un año o despliega la lista para ver los disponibles.</p>
          )}
          </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Fecha de inicio <span className="text-red-500">*</span></label>
            <input 
              type="date" 
              value={fechaInicio} 
              readOnly={soloLectura}
              disabled={soloLectura}
              onChange={(e) => handleFechaInicioChange(e.target.value)}
              min={`${vigencia}-01-01`}
              max={`${vigencia}-12-31`}
              className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none ${
                errorVigenciaNoCoincide && anioFechaInicio !== vigencia
                  ? 'border-red-500 bg-red-50 focus:border-red-500' 
                  : 'border-gray-300 focus:border-blue-500'
              }`}
            />
            {errorVigenciaNoCoincide && anioFechaInicio !== vigencia && (
              <p className="text-xs text-red-600 mt-1 font-medium">
                a️ El año de la fecha ({anioFechaInicio}) debe coincidir con la vigencia ({vigencia})
              </p>
            )}
            {!errorVigenciaNoCoincide && (
              <p className="text-xs text-gray-500 mt-1">Ajusta al calendario académico o institucional</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Fecha de finalización <span className="text-red-500">*</span></label>
            <input 
              type="date" 
              value={fechaFin} 
              readOnly={soloLectura}
              disabled={soloLectura}
              onChange={(e) => onFechaFinChange(e.target.value)}
              min={fechaInicio || `${vigencia}-01-01`}
              max={`${vigencia}-12-31`}
              className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none ${
                errorFechaFinAnterior || (errorVigenciaNoCoincide && anioFechaFin !== vigencia)
                  ? 'border-red-500 bg-red-50 focus:border-red-500' 
                  : 'border-gray-300 focus:border-blue-500'
              }`}
            />
            {errorFechaFinAnterior && (
              <p className="text-xs text-red-600 mt-1 font-medium">
                a️ La fecha de finalización no puede ser anterior a la fecha de inicio
              </p>
            )}
            {!errorFechaFinAnterior && errorVigenciaNoCoincide && anioFechaFin !== vigencia && (
              <p className="text-xs text-red-600 mt-1 font-medium">
                a️ El año de la fecha ({anioFechaFin}) debe coincidir con la vigencia ({vigencia})
              </p>
            )}
            {!errorFechaFinAnterior && !errorVigenciaNoCoincide && (
              <p className="text-xs text-gray-500 mt-1">Define el cierre del plan anual</p>
            )}
          </div>
        </div>

        {/* Alerta de errores de validación */}
        {(errorFechaFinAnterior || errorVigenciaNoCoincide) && (
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800">Corrige los errores para continuar</p>
              <ul className="text-sm text-red-700 mt-1 space-y-1">
                {errorFechaFinAnterior && (
                  <li>• La fecha de finalización debe ser igual o posterior a la fecha de inicio</li>
                )}
                {errorVigenciaNoCoincide && (
                  <li>• Las fechas de inicio y fin deben estar dentro de la vigencia {vigencia}</li>
                )}
              </ul>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">Responsable del Plan <span className="text-red-500">*</span></label>
          {cargandoAuditores ? (
            <div className="flex items-center gap-2 px-4 py-3 border-2 border-gray-300 rounded-lg bg-gray-50">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              <span className="text-gray-600">Cargando profesionales OCI...</span>
            </div>
          ) : (() => {
            // Solo mostrar profesionales con base en las reglas de negocio y perfil normativo
            const responsablesAutorizados = auditores.filter((a: any) =>
              nombreProfesionalOCIVisible(a.nombre) &&
              REGLAS_NEGOCIO_OCIG.ROLES_RESPONSABLES_PLAN_ANUAL.esAutorizadoParaResponsablePlan(a.cargo)
            );
            const opcionesResponsable = [...responsablesAutorizados];
            if (
              jefeOCI?.nombre
              && !opcionesResponsable.some((a) => coincideAuditorConReferencia(a, jefeOCI))
            ) {
              opcionesResponsable.unshift(jefeOCI);
            }
            const valorSelect = jefeOCI
              ? (opcionesResponsable.find((a) => coincideAuditorConReferencia(a, jefeOCI))?.id
                || jefeOCI.id
                || '')
              : '';
            return opcionesResponsable.length === 0 ? (
              <div className="flex items-center gap-2 px-4 py-3 border-2 border-orange-300 rounded-lg bg-orange-50">
                <AlertCircle className="w-5 h-5 text-orange-600" />
                <span className="text-orange-700">No hay profesionales con rol Jefe OCIG o Auditor Líder configurados. Configure uno en Profesionales OCI.</span>
              </div>
            ) : (
              <select 
                value={valorSelect} 
                disabled={soloLectura}
                onChange={(e) => onJefeChange(opcionesResponsable.find((a: any) => a.id === e.target.value))} 
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Seleccionar responsable...</option>
                {opcionesResponsable.map((a: any) => (
                  <option key={a.id} value={a.id}>{a.nombre} - {a.cargo || 'Jefe OCIG'}</option>
                ))}
              </select>
            );
          })()}
          <p className="text-xs text-gray-500 mt-1">Solo profesionales con rol Jefe OCIG o Auditor Líder pueden ser responsables del Plan Anual</p>
        </div>
      </div>
    </motion.div>
  );
}

// Paso 2: Configuración de roles, actividades y responsables
function Paso2({ 
  rolesConfig, 
  onRolesChange,
  fechaInicio,
  fechaFin,
  auditores,
  jefeOCI,
  soloLectura = false,
}: { 
  rolesConfig: RolConfig[]; 
  onRolesChange: (config: RolConfig[]) => void;
  fechaInicio: string;
  fechaFin: string;
  auditores: Auditor[];
  jefeOCI?: Auditor | null;
  soloLectura?: boolean;
}) {
  const [rolExpandido, setRolExpandido] = useState<number | string | null>(1);
  const [mostrarFormActividad, setMostrarFormActividad] = useState<number | string | null>(null);
  const [nuevaActividad, setNuevaActividad] = useState<ActividadBase>({
    nombre: '',
    descripcion: '',
    fechaInicio: fechaInicio,
    fechaFin: fechaFin,
    control: 'Seguimiento trimestral',
    evaluacion: '0% avance',
    seguimiento: 'Por definir'
  });

  // S& NUEVO: Estado para configuración de puntos de control
  const [modalPuntosControlAbierto, setModalPuntosControlAbierto] = useState(false);
  const [actividadConfigurando, setActividadConfigurando] = useState<{
    numeroRol: number;
    nombreActividad: string;
    esCustom: boolean;
    indexCustom?: number;
  } | null>(null);

  // Permisos para editar configuraciones
  const { puedeRealizar } = useControlInternoPermissions();
  const puedeEditarActividadesBase = puedeRealizar('configuraciones', 'edit');

  const [editandoActividadBase, setEditandoActividadBase] = useState<{rolNumero: number, actId: string} | null>(null);

  const toggleActividad = (numeroRol: number, actId: string, nombreActividad: string) => {
    if (soloLectura) return;
    const nuevaConfig = rolesConfig.map(rol => {
      if (rol.numero !== numeroRol) return rol;

      const idx = rol.actividadesSeleccionadas.findIndex(a => a.id === actId || a.nombre === nombreActividad);
      const existente = idx >= 0 ? rol.actividadesSeleccionadas[idx] : undefined;

      if (existente) {
        if (actividadIncluidaEnPlan(existente)) {
          // Desmarcar sin borrar: se conserva evidencias, puntos de control, etc.
          return {
            ...rol,
            actividadesSeleccionadas: rol.actividadesSeleccionadas.map((a, i) =>
              i === idx ? { ...a, incluidaEnPlan: false } : a
            ),
          };
        }
        // Reactivar entrada existente
        const añoVig = Number(fechaInicio ? fechaInicio.split('-')[0] : new Date().getFullYear());
        return {
          ...rol,
          actividadesSeleccionadas: rol.actividadesSeleccionadas.map((a, i) =>
            i === idx
              ? {
                  ...a,
                  incluidaEnPlan: true,
                  fechaCorte: a.fechaCorte || resolverFechaCorteActividad(a, añoVig),
                }
              : a
          ),
        };
      }

      // Primera vez en el plan: alta nueva con valores por defecto
      const actividadBase = getActividadesPorRol(numeroRol)?.find(a => a.nombre === nombreActividad);
      if (!actividadBase) return rol;

      const año = Number(fechaInicio ? fechaInicio.split('-')[0] : new Date().getFullYear());

      if (actividadRol4SinCortesPrecargados(numeroRol, actividadBase)) {
        return {
          ...rol,
          actividadesSeleccionadas: [...rol.actividadesSeleccionadas, {
            ...actividadBase,
            id: actId,
            incluidaEnPlan: true,
            tipoEvidencia: 'SOLO_CHECK' as const,
            fechaCorte: actividadBase.fechaFin || `${año}-12-31`,
            responsables: [],
            puntosControl: [],
            frecuenciaPuntosControl: undefined,
            tareasSeguimiento: [],
          }],
        };
      }

      const mkPC = (pcId: string, orden: number, fi: string, ff: string): PuntoControl => ({
        id: pcId, orden, nombre: `Corte ${orden}`, descripcion: '',
        fechaProgramada: fi, fechaSeguimiento: ff,
        fechaReal: null, responsable: '', estado: 'pendiente' as const, observaciones: '', evidencias: []
      });
      const ctrl = (actividadBase.control || '').toLowerCase();
      let puntosDefault: PuntoControl[];
      let frecuencia: FrecuenciaPuntoControl = 'trimestral';
      if (ctrl.includes('semestral')) {
        frecuencia = 'semestral';
        puntosDefault = [mkPC(`pc-${actId}-1`, 1, `${año}-01-01`, `${año}-06-30`), mkPC(`pc-${actId}-2`, 2, `${año}-07-01`, `${año}-12-31`)];
      } else if (ctrl.includes('cuatrimestral')) {
        frecuencia = 'cuatrimestral';
        puntosDefault = [mkPC(`pc-${actId}-1`, 1, `${año}-01-01`, `${año}-04-30`), mkPC(`pc-${actId}-2`, 2, `${año}-05-01`, `${año}-08-31`), mkPC(`pc-${actId}-3`, 3, `${año}-09-01`, `${año}-12-31`)];
      } else if (ctrl.includes('trimestral')) {
        frecuencia = 'trimestral';
        puntosDefault = [mkPC(`pc-${actId}-1`, 1, `${año}-01-01`, `${año}-03-31`), mkPC(`pc-${actId}-2`, 2, `${año}-04-01`, `${año}-06-30`), mkPC(`pc-${actId}-3`, 3, `${año}-07-01`, `${año}-09-30`), mkPC(`pc-${actId}-4`, 4, `${año}-10-01`, `${año}-12-31`)];
      } else if (ctrl.includes('anual')) {
        frecuencia = 'anual';
        puntosDefault = [mkPC(`pc-${actId}-1`, 1, `${año}-01-01`, `${año}-12-31`)];
      } else if (ctrl.includes('mensual')) {
        frecuencia = 'mensual';
        puntosDefault = Array.from({length: 12}, (_, i) => { const m = (i+1).toString().padStart(2, '0'); const ld = new Date(año, i+1, 0).getDate().toString().padStart(2, '0'); return mkPC(`pc-${actId}-${i+1}`, i+1, `${año}-${m}-01`, `${año}-${m}-${ld}`); });
      } else {
        frecuencia = 'anual';
        puntosDefault = [mkPC(`pc-${actId}-1`, 1, actividadBase.fechaInicio || `${año}-01-01`, actividadBase.fechaFin || `${año}-12-31`)];
      }
      puntosDefault = alinearCortesConFechasOficiales(puntosDefault, actividadBase, año);
      const tareasConCorte = (actividadBase.tareasSeguimiento || []).map((t, tIdx) => ({ ...t, puntoControlId: puntosDefault[tIdx % puntosDefault.length]?.id }));
      return {
        ...rol,
        actividadesSeleccionadas: [...rol.actividadesSeleccionadas, {
          ...actividadBase,
          id: actId,
          incluidaEnPlan: true,
          tipoEvidencia: 'SOLO_CHECK' as const,
          fechaCorte: puntosDefault[puntosDefault.length - 1]?.fechaSeguimiento || `${año}-12-31`,
          responsables: [],
          puntosControl: puntosDefault,
          frecuenciaPuntosControl: frecuencia,
          tareasSeguimiento: tareasConCorte,
        }]
      };
    });
    onRolesChange(nuevaConfig);
  };

  const estaSeleccionada = (actId: string, nombreActividad?: string) => {
    return rolesConfig.some(rol =>
      rol.actividadesSeleccionadas.some(
        a =>
          (a.id === actId || (!!nombreActividad && a.nombre === nombreActividad)) &&
          actividadIncluidaEnPlan(a)
      )
    );
  };

  const toggleAutorizacionJefeOCI = (actId: string) => {
    const nuevaConfig = rolesConfig.map(rol => {
      return {
        ...rol,
        actividadesSeleccionadas: rol.actividadesSeleccionadas.map(act => {
          if (act.id === actId) {
            const nuevo = !leerRequiereAutorizacionJefeOCIDesdeActividad(act);
            return aplicarFlagsAutorizacionJefeOCI(act, nuevo);
          }
          return act;
        })
      };
    });
    onRolesChange(nuevaConfig);
  };

  const cambiarTipoEvidencia = (actId: string, tipo: 'SOLO_CHECK' | 'OBSERVACIONES' | 'ADJUNTOS' | 'COMPLETO') => {
    const nuevaConfig = rolesConfig.map(rol => {
      return {
        ...rol,
        actividadesSeleccionadas: rol.actividadesSeleccionadas.map(act => {
          if (act.id === actId) {
            return {
              ...act,
              tipoEvidencia: tipo
            };
          }
          return act;
        })
      };
    });
    onRolesChange(nuevaConfig);
  };

  const agregarActividadCustom = (numeroRol: number) => {
    if (!nuevaActividad.nombre.trim()) {
      toast.error('El nombre de la actividad es obligatorio');
      return;
    }

    const nuevaConfig = rolesConfig.map(rol => {
      if (rol.numero === numeroRol) {
        return {
          ...rol,
          actividadesCustom: [...rol.actividadesCustom, { 
            ...nuevaActividad,
            // a Valor por defecto: SOLO_CHECK (sin requisitos de documentos/observaciones)
            tipoEvidencia: 'SOLO_CHECK' as const
          }]
        };
      }
      return rol;
    });

    onRolesChange(nuevaConfig);
    toast.success('Actividad personalizada agregada');
    setNuevaActividad({
      nombre: '',
      descripcion: '',
      fechaInicio: fechaInicio,
      fechaFin: fechaFin,
      control: 'Seguimiento trimestral',
      evaluacion: '0% avance',
      seguimiento: 'Por definir'
    });
    setMostrarFormActividad(null);
  };

  const eliminarActividadCustom = (numeroRol: number, index: number) => {
    const nuevaConfig = rolesConfig.map(rol => {
      if (rol.numero === numeroRol) {
        return {
          ...rol,
          actividadesCustom: rol.actividadesCustom.filter((_, i) => i !== index)
        };
      }
      return rol;
    });
    onRolesChange(nuevaConfig);
    toast.success('Actividad eliminada');
  };

  const toggleAutorizacionCustom = (numeroRol: number, index: number) => {
    const nuevaConfig = rolesConfig.map(rol => {
      if (rol.numero === numeroRol) {
        return {
          ...rol,
          actividadesCustom: rol.actividadesCustom.map((act, i) => {
            if (i === index) {
              const nuevo = !leerRequiereAutorizacionJefeOCIDesdeActividad(act);
              return aplicarFlagsAutorizacionJefeOCI(act, nuevo);
            }
            return act;
          })
        };
      }
      return rol;
    });
    onRolesChange(nuevaConfig);
  };

  const cambiarTipoEvidenciaCustom = (numeroRol: number, index: number, tipo: 'SOLO_CHECK' | 'OBSERVACIONES' | 'ADJUNTOS' | 'COMPLETO') => {
    const nuevaConfig = rolesConfig.map(rol => {
      if (rol.numero === numeroRol) {
        return {
          ...rol,
          actividadesCustom: rol.actividadesCustom.map((act, i) => {
            if (i === index) {
              return {
                ...act,
                tipoEvidencia: tipo
              };
            }
            return act;
          })
        };
      }
      return rol;
    });
    onRolesChange(nuevaConfig);
  };

  // S& Funciones para asignar responsables por actividad
  const agregarResponsableActividad = (actId: string, auditor: Auditor) => {
    const nuevaConfig = rolesConfig.map(rol => ({
      ...rol,
      actividadesSeleccionadas: rol.actividadesSeleccionadas.map(act => {
        if (act.id === actId) {
          const yaAsignado = (act.responsables || []).some(r => r.id === auditor.id);
          if (yaAsignado) return act;
          // Solo permitir un responsable por actividad
          return { ...act, responsables: [auditor] };
        }
        return act;
      })
    }));
    onRolesChange(nuevaConfig);
  };

  const quitarResponsableActividad = (actId: string, auditorId: string) => {
    const nuevaConfig = rolesConfig.map(rol => ({
      ...rol,
      actividadesSeleccionadas: rol.actividadesSeleccionadas.map(act => {
        if (act.id === actId) {
          return { ...act, responsables: (act.responsables || []).filter(r => r.id !== auditorId) };
        }
        return act;
      })
    }));
    onRolesChange(nuevaConfig);
  };

  const agregarResponsableCustom = (numeroRol: number, index: number, auditor: Auditor) => {
    const nuevaConfig = rolesConfig.map(rol => {
      if (rol.numero !== numeroRol) return rol;
      return {
        ...rol,
        actividadesCustom: rol.actividadesCustom.map((act, i) => {
          if (i !== index) return act;
          const yaAsignado = (act.responsables || []).some(r => r.id === auditor.id);
          if (yaAsignado) return act;
          // Solo permitir un responsable por actividad personalizada
          return { ...act, responsables: [auditor] };
        })
      };
    });
    onRolesChange(nuevaConfig);
  };

  const quitarResponsableCustom = (numeroRol: number, index: number, auditorId: string) => {
    const nuevaConfig = rolesConfig.map(rol => {
      if (rol.numero !== numeroRol) return rol;
      return {
        ...rol,
        actividadesCustom: rol.actividadesCustom.map((act, i) => {
          if (i !== index) return act;
          return { ...act, responsables: (act.responsables || []).filter(r => r.id !== auditorId) };
        })
      };
    });
    onRolesChange(nuevaConfig);
  };

  const setFechaCorteActividad = (actId: string, fecha: string) => {
    const nuevaConfig = rolesConfig.map(rol => ({
      ...rol,
      actividadesSeleccionadas: rol.actividadesSeleccionadas.map(act =>
        act.id === actId ? { ...act, fechaCorte: fecha } : act
      )
    }));
    onRolesChange(nuevaConfig);
  };

  const setFechaCorteCustom = (numeroRol: number, index: number, fecha: string) => {
    const nuevaConfig = rolesConfig.map(rol => {
      if (rol.numero !== numeroRol) return rol;
      return {
        ...rol,
        actividadesCustom: rol.actividadesCustom.map((act, i) =>
          i === index ? { ...act, fechaCorte: fecha } : act
        )
      };
    });
    onRolesChange(nuevaConfig);
  };

  // S& NUEVO: Funciones para configurar puntos de control
  const abrirConfiguracionPuntosControl = (numeroRol: number, nombreActividad: string, esCustom: boolean, indexCustom?: number) => {
    if (soloLectura) return;
    setActividadConfigurando({ numeroRol, nombreActividad, esCustom, indexCustom });
    setModalPuntosControlAbierto(true);
  };

  const guardarPuntosControl = (puntos: PuntoControl[], frecuencia: FrecuenciaPuntoControl, fechaCorteModal: string) => {
    if (!actividadConfigurando) return;

    const { numeroRol, nombreActividad, esCustom, indexCustom } = actividadConfigurando;

    const nuevaConfig = rolesConfig.map(rol => {
      if (rol.numero === numeroRol) {
        if (esCustom && indexCustom !== undefined) {
          // Actualizar actividad custom
          return {
            ...rol,
            actividadesCustom: rol.actividadesCustom.map((act, i) => {
              if (i === indexCustom) {
                return {
                  ...act,
                  puntosControl: puntos,
                  frecuenciaPuntosControl: frecuencia,
                  fechaCorte: fechaCorteModal
                };
              }
              return act;
            })
          };
        } else {
          // Actualizar actividad seleccionada
          return {
            ...rol,
            actividadesSeleccionadas: rol.actividadesSeleccionadas.map(act => {
              if (act.nombre === nombreActividad) {
                return {
                  ...act,
                  puntosControl: puntos,
                  frecuenciaPuntosControl: frecuencia,
                  fechaCorte: fechaCorteModal
                };
              }
              return act;
            })
          };
        }
      }
      return rol;
    });

    onRolesChange(nuevaConfig);
    setModalPuntosControlAbierto(false);
    setActividadConfigurando(null);
  };

  const totalActividades = rolesConfig.reduce((sum, rol) => 
    sum + contarActividadesIncluidas(rol) + rol.actividadesCustom.length, 0
  );

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
      <div className="text-center mb-8">
        <h2 className={`text-3xl font-bold mb-3 ${soloLectura ? 'text-slate-800' : 'text-gray-900'}`}>
          Configuración de roles y actividades
        </h2>
        <p className={soloLectura ? 'text-slate-600' : 'text-gray-600'}>
          {soloLectura
            ? 'Solo consulta: revise actividades, responsables y cortes de seguimiento sin modificar datos.'
            : 'Selecciona las actividades del Decreto 648/2017 y asigna los responsables para cada rol estratégico'}
        </p>
      </div>

      {soloLectura && (
        <div className="rounded-xl border-2 border-slate-300 bg-slate-100 px-4 py-3 text-sm text-slate-800">
          <strong className="font-semibold">Modo solo consulta.</strong> No puede marcar actividades, asignar responsables ni configurar cortes.
          Use <strong>Anterior</strong> / <strong>Siguiente</strong> para revisar el plan completo.
        </div>
      )}

      {/* Resumen */}
      <div className={`rounded-xl p-6 border-2 ${
        soloLectura
          ? 'bg-slate-100 border-slate-300'
          : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-sm mb-1 ${soloLectura ? 'text-slate-600' : 'text-blue-700'}`}>
              Total de actividades configuradas
            </p>
            <p className={`text-3xl font-bold ${soloLectura ? 'text-slate-900' : 'text-blue-900'}`}>{totalActividades}</p>
          </div>
          <CheckCircle2 className={`w-12 h-12 ${soloLectura ? 'text-slate-500' : 'text-blue-600'}`} />
        </div>
      </div>

      {/* Roles configurables */}
      <div className="space-y-4">
        {[...rolesConfig].sort((a, b) => a.numero - b.numero).map((rol) => {
          const isExpanded = rolExpandido === rol.numero;
          const actividadesBase = getActividadesPorRol(rol.numero);
          const totalRol = contarActividadesIncluidas(rol) + rol.actividadesCustom.length;
          const responsablesRol = Array.isArray(rol.responsables)
            ? rol.responsables.filter((resp): resp is Auditor => Boolean(resp))
            : [];
          const responsablePrincipal = responsablesRol[0] || null;
          const faltaResponsable = totalRol > 0 && !responsablePrincipal;

          return (
            <div key={rol.numero} className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
              {/* Header */}
              <div
                className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setRolExpandido(isExpanded ? null : rol.numero)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl" style={{ backgroundColor: rol.color + '20' }}>
                    {rol.icono}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Rol {rol.numero}: {rol.nombre}</h3>
                    <p className="text-sm text-gray-600">
                      {totalRol} actividades • {(() => {
                        const totalTareas = [...rol.actividadesSeleccionadas.filter(actividadIncluidaEnPlan), ...rol.actividadesCustom]
                          .reduce((sum, a) => sum + (a.tareasSeguimiento?.length || 0), 0);
                        return totalTareas > 0 ? `${totalTareas} tareas • ` : '';
                      })()}{responsablePrincipal ? 1 : 0} responsables
                    </p>
                    {/* Avatar chips for assigned responsibles */}
                    {responsablePrincipal && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <div className="flex -space-x-1">
                          <div
                            key={responsablePrincipal.id}
                            title={responsablePrincipal.nombre}
                            className="w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-white text-[9px] font-bold"
                            style={{ backgroundColor: rol.color }}
                          >
                            {responsablePrincipal.nombre.split(' ').filter(Boolean).map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                        </div>
                        <span className="text-xs text-gray-500">{responsablePrincipal.nombre.split(' ')[0]}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded-lg text-sm font-semibold" style={{ 
                    backgroundColor: rol.color + '20', 
                    color: rol.color 
                  }}>
                    {totalRol}/{actividadesBase.length}
                  </span>
                  <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </motion.div>
                </div>
              </div>

              {/* Content expandible */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5 space-y-4 border-t-2 border-gray-200">
                      {/* Sección de responsables del rol */}
                      <div className="pt-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5" />
                          Responsables del rol
                        </p>
                        <div className="flex flex-col gap-1.5">
                          {/* Chips de responsables asignados */}
                          {(responsablePrincipal ? [responsablePrincipal] : []).map((auditor: Auditor) => (
                            <FilaResponsableAsignado
                              key={auditor.id}
                              nombre={auditor.nombre}
                              rolColor={rol.color}
                              soloLectura={soloLectura}
                              onQuitar={() => {
                                const nuevaConfig = rolesConfig.map((r) => {
                                  if (r.numero === rol.numero) {
                                    return {
                                      ...r,
                                      responsables: r.responsables.filter(
                                        (resp: any) => resp.id !== auditor.id,
                                      ),
                                    };
                                  }
                                  return r;
                                });
                                onRolesChange(nuevaConfig);
                              }}
                            />
                          ))}
                          {/* Dropdown para agregar  solo si no hay responsables */}
                          {!soloLectura && !responsablePrincipal && (
                            <SelectorProfesional
                              auditores={filtrarAuditoresParaAsignacion(auditores).filter(
                                (a) => !responsablesRol.some((r: any) => r.id === a.id),
                              )}
                              onSelect={(id) => {
                                if (!id) return;
                                const auditor = auditores.find(a => a.id === id);
                                if (auditor) {
                                  const nuevaConfig = rolesConfig.map(r => {
                                    if (r.numero === rol.numero) {
                                      // Regla: el rol conserva solo un responsable principal
                                      return {
                                        ...r,
                                        responsables: [auditor],
                                      };
                                    }
                                    return r;
                                  });
                                  onRolesChange(nuevaConfig);
                                  toast.success(`${auditor.nombre} asignado al rol`);
                                }
                              }}
                            />
                          )}
                        </div>
                      </div>

                      {/* Actividades del Decreto 648 */}
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          Actividades del Decreto 648/2017
                        </h4>
                        <div className="space-y-2">
                          {actividadesBase.map((actividad, index) => {
                            // a Generar ID único para esta actividad
                            const actId = `rol-${rol.numero}-act-${index}`;
                            const seleccionada = estaSeleccionada(actId, actividad.nombre);
                            const actividadData = rol.actividadesSeleccionadas.find(a => a.id === actId || a.nombre === actividad.nombre);
                            /** UUID del backend vs id sintético del template  las mutaciones deben usar el id real en estado */
                            const idActividadEnEstado = actividadData?.id ?? actId;
                            const fechaCorteMostrar = actividadData ? fechaCorteDisplayDesdeActividad(actividadData) : undefined;
                            return (
                              <div
                                key={actId}
                                style={{ contentVisibility: 'auto', containIntrinsicSize: '150px' }}
                                className={`border-2 rounded-lg transition-colors ${
                                  seleccionada
                                    ? soloLectura
                                      ? 'border-slate-400 bg-slate-100'
                                      : 'border-blue-400 bg-blue-50'
                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <label className={`flex items-start gap-3 p-3 ${soloLectura ? 'cursor-default' : 'cursor-pointer'}`}>
                                  <input
                                    type="checkbox"
                                    checked={seleccionada}
                                    disabled={soloLectura}
                                    onChange={() => toggleActividad(rol.numero, actId, actividad.nombre)}
                                    className={`w-5 h-5 rounded border-gray-300 mt-0.5 flex-shrink-0 ${
                                      soloLectura
                                        ? 'text-slate-500 accent-slate-500'
                                        : 'text-blue-600 focus:ring-2 focus:ring-blue-500'
                                    }`}
                                  />
                                  <div className="flex-1 min-w-0">
                                    {editandoActividadBase?.rolNumero === rol.numero && editandoActividadBase?.actId === idActividadEnEstado ? (
                                      <div className="space-y-2 mb-2 bg-white p-3 rounded-lg border border-blue-200 shadow-sm" onClick={e => e.stopPropagation()}>
                                        <input 
                                          type="text" 
                                          className="w-full font-semibold text-gray-900 text-sm border-b-2 border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none bg-gray-50 focus:bg-white px-2 py-1 rounded-t transition-colors"
                                          defaultValue={actividadData?.nombre || actividad.nombre}
                                          placeholder="Nombre de la actividad"
                                          onBlur={(e) => {
                                            const nuevoNombre = e.target.value.trim();
                                            if (nuevoNombre && actividadData) {
                                              const nuevaConfig = rolesConfig.map(r => r.numero === rol.numero ? {
                                                ...r,
                                                actividadesSeleccionadas: r.actividadesSeleccionadas.map(a => 
                                                  a.id === idActividadEnEstado ? { ...a, nombre: nuevoNombre } : a
                                                )
                                              } : r);
                                              onRolesChange(nuevaConfig);
                                            }
                                          }}
                                        />
                                        <textarea 
                                          className="w-full text-xs text-gray-600 border border-gray-300 rounded p-2 focus:border-blue-500 focus:outline-none bg-gray-50 focus:bg-white transition-colors"
                                          defaultValue={actividadData?.descripcion || actividad.descripcion}
                                          placeholder="Descripción de la actividad"
                                          rows={2}
                                          onBlur={(e) => {
                                            const nuevaDesc = e.target.value.trim();
                                            if (actividadData) {
                                              const nuevaConfig = rolesConfig.map(r => r.numero === rol.numero ? {
                                                ...r,
                                                actividadesSeleccionadas: r.actividadesSeleccionadas.map(a => 
                                                  a.id === idActividadEnEstado ? { ...a, descripcion: nuevaDesc } : a
                                                )
                                              } : r);
                                              onRolesChange(nuevaConfig);
                                            }
                                          }}
                                        />
                                        <div className="flex justify-end mt-2">
                                          <button 
                                            className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md font-medium transition-colors" 
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setEditandoActividadBase(null);
                                            }}
                                          >
                                            Guardar
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="group relative pr-8">
                                        <p className="font-semibold text-gray-900 text-sm">{actividadData?.nombre || actividad.nombre}</p>
                                        <p className="text-xs text-gray-600 mt-1">{actividadData?.descripcion || actividad.descripcion}</p>
                                        
                                        {puedeEditarActividadesBase && seleccionada && (
                                          <button 
                                            className="absolute top-0 right-0 p-1.5 text-gray-400 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 rounded-md opacity-0 group-hover:opacity-100 transition-all shadow-sm border border-transparent hover:border-blue-200"
                                            title="Editar texto de actividad"
                                            onClick={(e) => { 
                                              e.stopPropagation(); 
                                              setEditandoActividadBase({rolNumero: rol.numero, actId: idActividadEnEstado}); 
                                            }}
                                          >
                                            <Edit3 className="w-4 h-4" />
                                          </button>
                                        )}
                                      </div>
                                    )}
                                    {seleccionada && actividadData && (
                                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                        {(actividadData.tipoEvidencia === 'OBSERVACIONES' || actividadData.tipoEvidencia === 'COMPLETO') && (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-[10px] font-medium">
                                            <FileText className="w-2.5 h-2.5" />
                                            Observaciones
                                          </span>
                                        )}
                                        {(actividadData.tipoEvidencia === 'ADJUNTOS' || actividadData.tipoEvidencia === 'COMPLETO') && (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-[10px] font-medium">
                                            <Paperclip className="w-2.5 h-2.5" />
                                            Adjuntos
                                          </span>
                                        )}
                                        {actividadData.requiereAutorizacionJefeOCI && (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-800 rounded text-[10px] font-medium">
                                            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                                              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                            </svg>
                                            Requiere autorización
                                          </span>
                                        )}
                                        {fechaCorteMostrar && (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-[10px] font-medium">
                                            📅 Corte: {fechaCorteMostrar}
                                          </span>
                                        )}
                                        <ResponsableActividadPicker
                                          responsable={actividadData.responsables?.[0]}
                                          auditores={auditores}
                                          rolColor={rol.color}
                                          soloLectura={soloLectura}
                                          onAsignar={(auditor) => {
                                            const nuevaConfig = rolesConfig.map((r) => {
                                              if (r.numero !== rol.numero) return r;
                                              return {
                                                ...r,
                                                actividadesSeleccionadas: r.actividadesSeleccionadas.map((a) =>
                                                  a.id === idActividadEnEstado ? { ...a, responsables: [auditor] } : a,
                                                ),
                                              };
                                            });
                                            onRolesChange(nuevaConfig);
                                          }}
                                          onQuitar={() => {
                                            const nuevaConfig = rolesConfig.map((r) => {
                                              if (r.numero !== rol.numero) return r;
                                              return {
                                                ...r,
                                                actividadesSeleccionadas: r.actividadesSeleccionadas.map((a) =>
                                                  a.id === idActividadEnEstado ? { ...a, responsables: [] } : a,
                                                ),
                                              };
                                            });
                                            onRolesChange(nuevaConfig);
                                          }}
                                        />
                                      </div>
                                    )}
                                  </div>
                                </label>
                                
                                {/* Configuración de evidencias - Solo visible si actividad está seleccionada */}
                                {seleccionada && (
                                  <div className="px-3 pb-3 pt-2 border-t border-blue-200 mt-2 space-y-3">
                                    {/* Checkbox de autorización Jefe OCI */}
                                    <label className="flex items-start gap-2 cursor-pointer p-2 hover:bg-blue-100/50 rounded-lg transition-colors">
                                      <input
                                        type="checkbox"
                                        checked={leerRequiereAutorizacionJefeOCIDesdeActividad(actividadData)}
                                        onChange={(e) => {
                                          e.stopPropagation();
                                          toggleAutorizacionJefeOCI(idActividadEnEstado);
                                        }}
                                        className="w-4 h-4 text-orange-600 rounded border-gray-300 focus:ring-2 focus:ring-orange-500 mt-0.5"
                                      />
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          <svg className="w-4 h-4 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                          </svg>
                                          <span className="text-xs font-semibold text-orange-900">
                                            Requiere autorización del Jefe OCI
                                          </span>
                                        </div>
                                        <p className="text-xs text-orange-700 mt-1">
                                          Esta actividad no podrá completarse al 100% sin la autorización del Jefe de la OCI
                                        </p>
                                      </div>
                                    </label>

                                    {/* Selector de tipo de evidencia - Switches que propagan a todas las tareas */}
                                    <div className="p-2 bg-blue-50/50 rounded-lg" onClick={e => e.stopPropagation()}>
                                      <div className="block text-xs font-semibold text-gray-900 mb-1">
                                        Requisitos para todas las tareas de seguimiento
                                      </div>
                                      <p className="text-[10px] text-gray-500 mb-2">Al activar, se habilita en todas las tareas de esta actividad.</p>
                                      <div className="flex flex-col gap-2">
                                        {/* Switch: Observaciones */}
                                        <div 
                                          className="flex items-center gap-2.5 cursor-pointer hover:bg-white/50 p-1.5 rounded transition-colors"
                                          onClick={() => {
                                            const obsActivo = actividadData?.tipoEvidencia === 'OBSERVACIONES' || actividadData?.tipoEvidencia === 'COMPLETO';
                                            const adjActivo = actividadData?.tipoEvidencia === 'ADJUNTOS' || actividadData?.tipoEvidencia === 'COMPLETO';
                                            const nuevoObs = !obsActivo;
                                            const nuevoTipo = (nuevoObs && adjActivo) ? 'COMPLETO'
                                              : nuevoObs ? 'OBSERVACIONES'
                                              : adjActivo ? 'ADJUNTOS'
                                              : 'SOLO_CHECK';
                                            onRolesChange(rolesConfig.map(r => ({
                                              ...r,
                                              actividadesSeleccionadas: r.actividadesSeleccionadas.map(a =>
                                                a.id === idActividadEnEstado ? {
                                                  ...a,
                                                  tipoEvidencia: nuevoTipo,
                                                  tareasSeguimiento: (a.tareasSeguimiento || []).map(t => ({ ...t, requiereObservaciones: nuevoObs }))
                                                } : a
                                              )
                                            })));
                                          }}
                                        >
                                          <div style={{
                                            width: 32, height: 18, borderRadius: 9999, position: 'relative', flexShrink: 0, cursor: 'pointer',
                                            backgroundColor: (actividadData?.tipoEvidencia === 'OBSERVACIONES' || actividadData?.tipoEvidencia === 'COMPLETO') ? '#3b82f6' : '#d1d5db',
                                            transition: 'background-color 0.2s'
                                          }}>
                                            <div style={{
                                              width: 14, height: 14, borderRadius: 9999, backgroundColor: '#fff', position: 'absolute', top: 2,
                                              left: (actividadData?.tipoEvidencia === 'OBSERVACIONES' || actividadData?.tipoEvidencia === 'COMPLETO') ? 15 : 2,
                                              transition: 'left 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                            }} />
                                          </div>
                                          <FileText className="w-3.5 h-3.5 text-blue-600" />
                                          <span style={{
                                            fontSize: 12,
                                            color: (actividadData?.tipoEvidencia === 'OBSERVACIONES' || actividadData?.tipoEvidencia === 'COMPLETO') ? '#1d4ed8' : '#6b7280',
                                            fontWeight: (actividadData?.tipoEvidencia === 'OBSERVACIONES' || actividadData?.tipoEvidencia === 'COMPLETO') ? 600 : 400
                                          }}>Requiere observaciones en cada tarea</span>
                                        </div>

                                        {/* Switch: Adjuntos */}
                                        <div 
                                          className="flex items-center gap-2.5 cursor-pointer hover:bg-white/50 p-1.5 rounded transition-colors"
                                          onClick={() => {
                                            const obsActivo = actividadData?.tipoEvidencia === 'OBSERVACIONES' || actividadData?.tipoEvidencia === 'COMPLETO';
                                            const adjActivo = actividadData?.tipoEvidencia === 'ADJUNTOS' || actividadData?.tipoEvidencia === 'COMPLETO';
                                            const nuevoAdj = !adjActivo;
                                            const nuevoTipo = (obsActivo && nuevoAdj) ? 'COMPLETO'
                                              : nuevoAdj ? 'ADJUNTOS'
                                              : obsActivo ? 'OBSERVACIONES'
                                              : 'SOLO_CHECK';
                                            onRolesChange(rolesConfig.map(r => ({
                                              ...r,
                                              actividadesSeleccionadas: r.actividadesSeleccionadas.map(a =>
                                                a.id === idActividadEnEstado ? {
                                                  ...a,
                                                  tipoEvidencia: nuevoTipo,
                                                  tareasSeguimiento: (a.tareasSeguimiento || []).map(t => ({ ...t, requiereAdjuntos: nuevoAdj }))
                                                } : a
                                              )
                                            })));
                                          }}
                                        >
                                          <div style={{
                                            width: 32, height: 18, borderRadius: 9999, position: 'relative', flexShrink: 0, cursor: 'pointer',
                                            backgroundColor: (actividadData?.tipoEvidencia === 'ADJUNTOS' || actividadData?.tipoEvidencia === 'COMPLETO') ? '#a855f7' : '#d1d5db',
                                            transition: 'background-color 0.2s'
                                          }}>
                                            <div style={{
                                              width: 14, height: 14, borderRadius: 9999, backgroundColor: '#fff', position: 'absolute', top: 2,
                                              left: (actividadData?.tipoEvidencia === 'ADJUNTOS' || actividadData?.tipoEvidencia === 'COMPLETO') ? 15 : 2,
                                              transition: 'left 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                            }} />
                                          </div>
                                          <Paperclip className="w-3.5 h-3.5 text-purple-600" />
                                          <span style={{
                                            fontSize: 12,
                                            color: (actividadData?.tipoEvidencia === 'ADJUNTOS' || actividadData?.tipoEvidencia === 'COMPLETO') ? '#7e22ce' : '#6b7280',
                                            fontWeight: (actividadData?.tipoEvidencia === 'ADJUNTOS' || actividadData?.tipoEvidencia === 'COMPLETO') ? 600 : 400
                                          }}>Requiere archivos adjuntos en cada tarea</span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* S& Sección de puntos de control  vista profesional */}
                                    <div className="border-2 border-blue-200 rounded-xl overflow-hidden" onClick={e => e.stopPropagation()}>
                                      {/* Header con resumen y botón configurar */}
                                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-3 py-2.5 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <CalendarClock className="w-4 h-4 text-blue-600" />
                                          <span className="text-xs font-bold text-blue-900">
                                            {actividadData?.puntosControl && actividadData.puntosControl.length > 0
                                              ? `${actividadData.puntosControl.length} Cortes de Seguimiento`
                                              : 'Sin cortes configurados'}
                                          </span>
                                          {actividadData?.frecuenciaPuntosControl && (
                                            <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-semibold capitalize">
                                              {actividadData.frecuenciaPuntosControl}
                                            </span>
                                          )}
                                        </div>
                                        <button
                                          type="button"
                                          disabled={soloLectura}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            abrirConfiguracionPuntosControl(rol.numero, actividad.nombre, false);
                                          }}
                                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                                            soloLectura
                                              ? 'bg-slate-400 text-slate-100 cursor-default'
                                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                                          }`}
                                        >
                                          <Settings className="w-3 h-3" />
                                          {soloLectura ? 'Ver cortes' : 'Configurar'}
                                        </button>
                                      </div>

                                      {/* Timeline de cortes */}
                                      {actividadData?.puntosControl && actividadData.puntosControl.length > 0 && (
                                        <div className="divide-y divide-gray-100">
                                          {actividadData.puntosControl.map((pc: PuntoControl, pcIdx: number) => {
                                            const hoyDate = new Date();
                                            hoyDate.setHours(0,0,0,0);
                                            const fechaCorte = new Date(pc.fechaProgramada + 'T00:00:00');
                                            const fechaSeg = pc.fechaSeguimiento ? new Date(pc.fechaSeguimiento + 'T00:00:00') : null;
                                            const esCompletado = pc.estado === 'completado';
                                            const enSeguimiento = !esCompletado && fechaCorte < hoyDate && fechaSeg !== null && hoyDate <= fechaSeg;
                                            const esVencido = !esCompletado && !enSeguimiento && fechaCorte < hoyDate && (fechaSeg === null || hoyDate > fechaSeg);
                                            const esActivo = !esCompletado && !esVencido && !enSeguimiento && fechaCorte >= hoyDate && (pcIdx === 0 || new Date(actividadData.puntosControl![pcIdx-1].fechaProgramada + 'T00:00:00') < hoyDate);
                                            return (
                                              <div key={pc.id} className={`px-3 py-2.5 ${esActivo ? 'bg-blue-50/50' : enSeguimiento ? 'bg-purple-50/50' : esVencido ? 'bg-red-50/30' : 'bg-white'}`}>
                                                <div className="flex items-start gap-3">
                                                {/* Indicador lateral */}
                                                <div className="flex flex-col items-center pt-0.5">
                                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 ${
                                                    esCompletado ? 'bg-green-500 border-green-500 text-white' :
                                                    enSeguimiento ? 'bg-purple-500 border-purple-500 text-white' :
                                                    esVencido ? 'bg-red-100 border-red-400 text-red-700' :
                                                    esActivo ? 'bg-blue-500 border-blue-500 text-white' :
                                                    'bg-gray-100 border-gray-300 text-gray-500'
                                                  }`}>
                                                    {esCompletado ? 'S' : pcIdx + 1}
                                                  </div>
                                                  {pcIdx < actividadData.puntosControl!.length - 1 && (
                                                    <div className={`w-0.5 flex-1 mt-1 min-h-[20px] ${
                                                      esCompletado ? 'bg-green-300' : 'bg-gray-200'
                                                    }`} />
                                                  )}
                                                </div>

                                                {/* Contenido del corte */}
                                                <div className="flex-1 min-w-0">
                                                  <div className="flex items-center justify-between mb-1">
                                                    <span className="text-xs font-bold text-gray-900">{pc.nombre}</span>
                                                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                                      esCompletado ? 'bg-green-100 text-green-700' :
                                                      enSeguimiento ? 'bg-purple-100 text-purple-700' :
                                                      esVencido ? 'bg-red-100 text-red-700' :
                                                      esActivo ? 'bg-blue-100 text-blue-700' :
                                                      'bg-gray-100 text-gray-500'
                                                    }`}>
                                                      {esCompletado ? 'Completado' : enSeguimiento ? 'En seguimiento' : esVencido ? 'Vencido' : esActivo ? 'Activo' : 'Futuro'}
                                                    </span>
                                                  </div>
                                                  <div className="grid grid-cols-2 gap-2">
                                                    <div className="flex items-center gap-1.5">
                                                      <Calendar className="w-3 h-3 text-orange-500 flex-shrink-0" />
                                                      <span className="text-[11px] text-gray-700">
                                                        <span className="text-[9px] text-gray-400 uppercase">Inicio: </span>
                                                        <span className="font-semibold">{new Date(pc.fechaProgramada + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                                      </span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                      <Clock className="w-3 h-3 text-purple-500 flex-shrink-0" />
                                                      <span className="text-[11px] text-gray-700">
                                                        <span className="text-[9px] text-gray-400 uppercase">Fin: </span>
                                                        <span className="font-semibold">{pc.fechaSeguimiento ? new Date(pc.fechaSeguimiento + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}</span>
                                                      </span>
                                                    </div>
                                                  </div>
                                                </div>
                                                </div>
                                                {/* S& Tareas de seguimiento DENTRO del corte  ANCHO COMPLETO */}
                                                {(() => {
                                                  const tareasDelCorte = (actividadData?.tareasSeguimiento || []).filter(t => t.puntoControlId === pc.id);
                                                  return (
                                                    <div className="mt-3 bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
                                                      <div className="flex items-center justify-between mb-2">
                                                        <p className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                                                          <span className="w-5 h-5 rounded-md bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                                                            <Check className="w-3 h-3 text-white" />
                                                          </span>
                                                          Tareas de este corte
                                                          {tareasDelCorte.length > 0 && (
                                                            <span className="ml-1 px-1 py-0.5 rounded-full bg-green-100 text-green-700 text-[9px] font-bold">
                                                              {tareasDelCorte.length}
                                                            </span>
                                                          )}
                                                        </p>
                                                      </div>
                                                      <div className="space-y-2">
                                                        {tareasDelCorte.map((tarea) => {
                                                          const updateTareaCorte = (updates: Partial<TareaSeguimiento>) => {
                                                            const nuevaConfig = rolesConfig.map(r => ({
                                                              ...r,
                                                              actividadesSeleccionadas: r.actividadesSeleccionadas.map(a =>
                                                                a.id === idActividadEnEstado ? { ...a, tareasSeguimiento: (a.tareasSeguimiento || []).map(t => t.id === tarea.id ? { ...t, ...updates } : t) } : a
                                                              )
                                                            }));
                                                            onRolesChange(nuevaConfig);
                                                          };
                                                          return (
                                                            <div key={tarea.id} className="group bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-lg hover:border-blue-300 transition-all shadow-sm">
                                                              <div className="px-3 py-2.5 flex items-start gap-2.5">
                                                                <div className="w-4 h-4 mt-0.5 rounded bg-green-100 flex items-center justify-center flex-shrink-0">
                                                                  <Check className="w-2.5 h-2.5 text-green-600" />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                  <p className="text-xs font-medium text-gray-900 leading-snug">{tarea.descripcion}</p>
                                                                  <ResponsableTareaPicker
                                                soloLectura={soloLectura}
                                                                    responsablesNombres={tarea.responsables}
                                                                    auditores={auditores}
                                                                    rolColor={rol.color}
                                                                    onAsignar={(aud) => updateTareaCorte({ responsables: [aud.nombre] })}
                                                                    onQuitar={() => updateTareaCorte({ responsables: [] })}
                                                                  />
                                                                </div>
                                                                <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                                                  <button
                                                                    onClick={() => {
                                                                      const nuevaConfig = rolesConfig.map(r => ({ ...r, actividadesSeleccionadas: r.actividadesSeleccionadas.map(a => a.id === idActividadEnEstado ? { ...a, tareasSeguimiento: (a.tareasSeguimiento || []).filter(t => t.id !== tarea.id) } : a) }));
                                                                      onRolesChange(nuevaConfig);
                                                                    }}
                                                                    className="w-5 h-5 flex items-center justify-center rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                                                                    title="Eliminar tarea"
                                                                  >
                                                                    <Trash2 className="w-3 h-3" />
                                                                  </button>
                                                                </div>
                                                              </div>
                                                              <div className="px-3 pb-2 flex items-center gap-4 border-t border-gray-100 pt-1.5">
                                                                <label className="flex items-center gap-1.5 cursor-pointer" title="Requiere observaciones al completar">
                                                                  <div className={`w-7 h-4 rounded-full transition-colors relative ${tarea.requiereObservaciones ? 'bg-blue-500' : 'bg-gray-300'}`} onClick={() => updateTareaCorte({ requiereObservaciones: !tarea.requiereObservaciones })}>
                                                                    <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-all shadow-sm ${tarea.requiereObservaciones ? 'left-3.5' : 'left-0.5'}`} />
                                                                  </div>
                                                                  <span className={`text-[11px] ${tarea.requiereObservaciones ? 'text-blue-700 font-semibold' : 'text-gray-500'}`}>📝 Observaciones</span>
                                                                </label>
                                                                <label className="flex items-center gap-1.5 cursor-pointer" title="Requiere archivos adjuntos">
                                                                  <div className={`w-7 h-4 rounded-full transition-colors relative ${tarea.requiereAdjuntos ? 'bg-purple-500' : 'bg-gray-300'}`} onClick={() => updateTareaCorte({ requiereAdjuntos: !tarea.requiereAdjuntos })}>
                                                                    <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-all shadow-sm ${tarea.requiereAdjuntos ? 'left-3.5' : 'left-0.5'}`} />
                                                                  </div>
                                                                  <span className={`text-[11px] ${tarea.requiereAdjuntos ? 'text-purple-700 font-semibold' : 'text-gray-500'}`}>📎 Adjuntos</span>
                                                                </label>
                                                                <div className="flex items-center gap-1 ml-auto">
                                                                  <input
                                                                    type="date"
                                                                    value={tarea.fechaEntrega || ''}
                                                                    min={pc.fechaProgramada}
                                                                    max={pc.fechaSeguimiento || undefined}
                                                                    onChange={(e) => updateTareaCorte({ fechaEntrega: e.target.value })}
                                                                    className="text-[10px] border border-gray-200 rounded px-1 py-0.5 bg-white w-[100px]"
                                                                    title="Fecha de entrega (dentro del período del corte)"
                                                                  />
                                                                </div>
                                                              </div>
                                                            </div>
                                                          );
                                                        })}
                                                        {/* Agregar tarea al corte */}
                                                        <div className="flex gap-1.5 mt-1">
                                                          <input
                                                            type="text"
                                                            data-tarea-corte={`${idActividadEnEstado}-${pc.id}`}
                                                            placeholder="✏️ Nueva tarea…"
                                                            className="flex-1 px-2 py-1.5 border border-dashed border-gray-300 rounded-md focus:outline-none focus:border-green-500 text-[11px] text-gray-600 bg-gray-50/50 placeholder:text-gray-400 transition-all"
                                                            onClick={e => e.stopPropagation()}
                                                            onKeyDown={(e) => {
                                                              if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                                                                const desc = (e.target as HTMLInputElement).value.trim();
                                                                const nuevaConfig = rolesConfig.map(r => ({ ...r, actividadesSeleccionadas: r.actividadesSeleccionadas.map(a => a.id === idActividadEnEstado ? { ...a, tareasSeguimiento: [...(a.tareasSeguimiento || []), { id: `tarea-${Date.now()}`, descripcion: desc, completada: false, responsables: [], puntoControlId: pc.id }] } : a) }));
                                                                onRolesChange(nuevaConfig);
                                                                (e.target as HTMLInputElement).value = '';
                                                              }
                                                            }}
                                                          />
                                                          <button
                                                            onClick={() => {
                                                              const input = document.querySelector<HTMLInputElement>(`[data-tarea-corte="${idActividadEnEstado}-${pc.id}"]`);
                                                              if (input && input.value.trim()) {
                                                                const nuevaConfig = rolesConfig.map(r => ({ ...r, actividadesSeleccionadas: r.actividadesSeleccionadas.map(a => a.id === idActividadEnEstado ? { ...a, tareasSeguimiento: [...(a.tareasSeguimiento || []), { id: `tarea-${Date.now()}`, descripcion: input.value.trim(), completada: false, responsables: [], puntoControlId: pc.id }] } : a) }));
                                                                onRolesChange(nuevaConfig);
                                                                input.value = '';
                                                              }
                                                            }}
                                                            className="px-2.5 py-1.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-md text-[10px] font-semibold flex items-center gap-1 shadow-sm transition-all flex-shrink-0"
                                                          >
                                                            <Plus className="w-3 h-3" /> Agregar
                                                          </button>
                                                        </div>
                                                      </div>
                                                    </div>
                                                  );
                                                })()}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}

                                      {/* Estado vacío */}
                                      {(!actividadData?.puntosControl || actividadData.puntosControl.length === 0) && (
                                        <div className="px-3 py-4 text-center">
                                          <p className="text-xs text-gray-400">Haz clic en "Configurar" para definir los cortes de seguimiento</p>
                                        </div>
                                      )}
                                    </div>




                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Actividades personalizadas */}
                      {rol.actividadesCustom.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            ⭐ Actividades personalizadas
                          </h4>
                          <div className="space-y-2">
                            {rol.actividadesCustom.map((actividad, index) => {
                              const fechaCorteCustom = fechaCorteDisplayDesdeActividad(actividad);
                              return (
                              <div
                                key={`rol-${rol.numero}-custom-${index}-${actividad.nombre.slice(0, 20)}`}
                                className="border-2 border-green-200 bg-green-50 rounded-lg"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex items-start gap-3 p-3">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-gray-900 text-sm">{actividad.nombre}</p>
                                    <p className="text-xs text-gray-600 mt-1">{actividad.descripcion}</p>
                                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                      {(actividad.tipoEvidencia === 'OBSERVACIONES' || actividad.tipoEvidencia === 'COMPLETO') && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-[10px] font-medium">
                                          <FileText className="w-2.5 h-2.5" />
                                          Observaciones
                                        </span>
                                      )}
                                      {(actividad.tipoEvidencia === 'ADJUNTOS' || actividad.tipoEvidencia === 'COMPLETO') && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-[10px] font-medium">
                                          <Paperclip className="w-2.5 h-2.5" />
                                          Adjuntos
                                        </span>
                                      )}
                                      {actividad.requiereAutorizacionJefeOCI && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-800 rounded text-[10px] font-medium">
                                          <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                          </svg>
                                          Requiere autorización
                                        </span>
                                      )}
                                      {fechaCorteCustom && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-[10px] font-medium">
                                          📅 Corte: {fechaCorteCustom}
                                        </span>
                                      )}
                                      <ResponsableActividadPicker
                                        responsable={actividad.responsables?.[0]}
                                        auditores={auditores}
                                        rolColor={rol.color}
                                        soloLectura={soloLectura}
                                        onAsignar={(auditor) => {
                                          const nuevaConfig = rolesConfig.map((r) => {
                                            if (r.numero !== rol.numero) return r;
                                            return {
                                              ...r,
                                              actividadesCustom: r.actividadesCustom.map((act, i) =>
                                                i === index ? { ...act, responsables: [auditor] } : act,
                                              ),
                                            };
                                          });
                                          onRolesChange(nuevaConfig);
                                        }}
                                        onQuitar={() => {
                                          const nuevaConfig = rolesConfig.map((r) => {
                                            if (r.numero !== rol.numero) return r;
                                            return {
                                              ...r,
                                              actividadesCustom: r.actividadesCustom.map((act, i) =>
                                                i === index ? { ...act, responsables: [] } : act,
                                              ),
                                            };
                                          });
                                          onRolesChange(nuevaConfig);
                                        }}
                                      />
                                    </div>
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (confirm('¿Eliminar esta actividad personalizada?')) {
                                        eliminarActividadCustom(rol.numero, index);
                                      }
                                    }}
                                    className="text-red-600 hover:text-red-800 p-1"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                                
                                {/* Configuración de evidencias */}
                                <div className="px-3 pb-3 pt-2 border-t border-green-300 mt-2 space-y-3">
                                  {/* Checkbox de autorización Jefe OCI */}
                                  <label className="flex items-start gap-2 cursor-pointer p-2 hover:bg-green-100/50 rounded-lg transition-colors">
                                    <input
                                      type="checkbox"
                                      checked={leerRequiereAutorizacionJefeOCIDesdeActividad(actividad)}
                                      onChange={(e) => {
                                        e.stopPropagation();
                                        toggleAutorizacionCustom(rol.numero, index);
                                      }}
                                      className="w-4 h-4 text-orange-600 rounded border-gray-300 focus:ring-2 focus:ring-orange-500 mt-0.5"
                                    />
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <svg className="w-4 h-4 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                        </svg>
                                        <span className="text-xs font-semibold text-orange-900">
                                          Requiere autorización del Jefe OCI
                                        </span>
                                      </div>
                                      <p className="text-xs text-orange-700 mt-1">
                                        Esta actividad no podrá completarse al 100% sin la autorización del Jefe de la OCI
                                      </p>
                                    </div>
                                  </label>

                                  {/* Selector de tipo de evidencia */}
                                  <div className="p-2 bg-green-50/50 rounded-lg">
                                    <label className="block text-xs font-semibold text-gray-900 mb-2">
                                      Requisitos para completar
                                    </label>
                                    <div className="flex flex-col gap-1.5">
                                      <label className="flex items-center gap-2 cursor-pointer hover:bg-white/50 p-1.5 rounded transition-colors">
                                        <input
                                          type="checkbox"
                                          checked={actividad.tipoEvidencia === 'OBSERVACIONES' || actividad.tipoEvidencia === 'COMPLETO'}
                                          onChange={(e) => {
                                            e.stopPropagation();
                                            const requiereAdjuntos = actividad.tipoEvidencia === 'ADJUNTOS' || actividad.tipoEvidencia === 'COMPLETO';
                                            const requiereObservaciones = e.target.checked;
                                            
                                            if (requiereObservaciones && requiereAdjuntos) {
                                              cambiarTipoEvidenciaCustom(rol.numero, index, 'COMPLETO');
                                            } else if (requiereObservaciones) {
                                              cambiarTipoEvidenciaCustom(rol.numero, index, 'OBSERVACIONES');
                                            } else if (requiereAdjuntos) {
                                              cambiarTipoEvidenciaCustom(rol.numero, index, 'ADJUNTOS');
                                            } else {
                                              cambiarTipoEvidenciaCustom(rol.numero, index, 'SOLO_CHECK');
                                            }
                                          }}
                                          className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300 focus:ring-2 focus:ring-blue-500"
                                        />
                                        <FileText className="w-3.5 h-3.5 text-blue-600" />
                                        <span className="text-xs text-gray-900">Requiere observaciones</span>
                                      </label>

                                      <label className="flex items-center gap-2 cursor-pointer hover:bg-white/50 p-1.5 rounded transition-colors">
                                        <input
                                          type="checkbox"
                                          checked={actividad.tipoEvidencia === 'ADJUNTOS' || actividad.tipoEvidencia === 'COMPLETO'}
                                          onChange={(e) => {
                                            e.stopPropagation();
                                            const requiereObservaciones = actividad.tipoEvidencia === 'OBSERVACIONES' || actividad.tipoEvidencia === 'COMPLETO';
                                            const requiereAdjuntos = e.target.checked;
                                            
                                            if (requiereObservaciones && requiereAdjuntos) {
                                              cambiarTipoEvidenciaCustom(rol.numero, index, 'COMPLETO');
                                            } else if (requiereAdjuntos) {
                                              cambiarTipoEvidenciaCustom(rol.numero, index, 'ADJUNTOS');
                                            } else if (requiereObservaciones) {
                                              cambiarTipoEvidenciaCustom(rol.numero, index, 'OBSERVACIONES');
                                            } else {
                                              cambiarTipoEvidenciaCustom(rol.numero, index, 'SOLO_CHECK');
                                            }
                                          }}
                                          className="w-3.5 h-3.5 text-purple-600 rounded border-gray-300 focus:ring-2 focus:ring-purple-500"
                                        />
                                        <Paperclip className="w-3.5 h-3.5 text-purple-600" />
                                        <span className="text-xs text-gray-900">Requiere archivos adjuntos</span>
                                      </label>
                                    </div>
                                  </div>

                                  {/* S& Sección de puntos de control  vista profesional (custom) */}
                                  <div className="border-2 border-blue-200 rounded-xl overflow-hidden" onClick={e => e.stopPropagation()}>
                                    {/* Header con resumen y botón configurar */}
                                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-3 py-2.5 flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <CalendarClock className="w-4 h-4 text-blue-600" />
                                        <span className="text-xs font-bold text-blue-900">
                                          {actividad.puntosControl && actividad.puntosControl.length > 0
                                            ? `${actividad.puntosControl.length} Cortes de Seguimiento`
                                            : 'Sin cortes configurados'}
                                        </span>
                                        {actividad.frecuenciaPuntosControl && (
                                          <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-semibold capitalize">
                                            {actividad.frecuenciaPuntosControl}
                                          </span>
                                        )}
                                      </div>
                                      <button
                                        type="button"
                                        disabled={soloLectura}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          abrirConfiguracionPuntosControl(rol.numero, actividad.nombre, true, index);
                                        }}
                                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                                          soloLectura
                                            ? 'bg-slate-400 text-slate-100 cursor-default'
                                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                                        }`}
                                      >
                                        <Settings className="w-3 h-3" />
                                        {soloLectura ? 'Ver cortes' : 'Configurar'}
                                      </button>
                                    </div>

                                    {/* Timeline de cortes */}
                                    {actividad.puntosControl && actividad.puntosControl.length > 0 && (
                                      <div className="divide-y divide-gray-100">
                                        {actividad.puntosControl.map((pc: PuntoControl, pcIdx: number) => {
                                          const hoyDate = new Date();
                                          hoyDate.setHours(0,0,0,0);
                                          const fechaCorte = new Date(pc.fechaProgramada + 'T00:00:00');
                                          const fechaSeg = pc.fechaSeguimiento ? new Date(pc.fechaSeguimiento + 'T00:00:00') : null;
                                          const esCompletado = pc.estado === 'completado';
                                          const enSeguimiento = !esCompletado && fechaCorte < hoyDate && fechaSeg !== null && hoyDate <= fechaSeg;
                                          const esVencido = !esCompletado && !enSeguimiento && fechaCorte < hoyDate && (fechaSeg === null || hoyDate > fechaSeg);
                                          const esActivo = !esCompletado && !esVencido && !enSeguimiento && fechaCorte >= hoyDate && (pcIdx === 0 || new Date(actividad.puntosControl![pcIdx-1].fechaProgramada + 'T00:00:00') < hoyDate);
                                          return (
                                            <div key={pc.id} className={`px-3 py-2.5 ${esActivo ? 'bg-blue-50/50' : enSeguimiento ? 'bg-purple-50/50' : esVencido ? 'bg-red-50/30' : 'bg-white'}`}>
                                              <div className="flex items-start gap-3">
                                              {/* Indicador lateral */}
                                              <div className="flex flex-col items-center pt-0.5">
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 ${
                                                  esCompletado ? 'bg-green-500 border-green-500 text-white' :
                                                  enSeguimiento ? 'bg-purple-500 border-purple-500 text-white' :
                                                  esVencido ? 'bg-red-100 border-red-400 text-red-700' :
                                                  esActivo ? 'bg-blue-500 border-blue-500 text-white' :
                                                  'bg-gray-100 border-gray-300 text-gray-500'
                                                }`}>
                                                  {esCompletado ? 'S' : pcIdx + 1}
                                                </div>
                                                {pcIdx < actividad.puntosControl!.length - 1 && (
                                                  <div className={`w-0.5 flex-1 mt-1 min-h-[20px] ${
                                                    esCompletado ? 'bg-green-300' : 'bg-gray-200'
                                                  }`} />
                                                )}
                                              </div>

                                              {/* Contenido del corte */}
                                              <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1">
                                                  <span className="text-xs font-bold text-gray-900">{pc.nombre}</span>
                                                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                                    esCompletado ? 'bg-green-100 text-green-700' :
                                                    enSeguimiento ? 'bg-purple-100 text-purple-700' :
                                                    esVencido ? 'bg-red-100 text-red-700' :
                                                    esActivo ? 'bg-blue-100 text-blue-700' :
                                                    'bg-gray-100 text-gray-500'
                                                  }`}>
                                                    {esCompletado ? 'Completado' : enSeguimiento ? 'En seguimiento' : esVencido ? 'Vencido' : esActivo ? 'Activo' : 'Futuro'}
                                                  </span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                  <div className="flex items-center gap-1.5">
                                                    <Calendar className="w-3 h-3 text-orange-500 flex-shrink-0" />
                                                    <span className="text-[11px] text-gray-700">
                                                      <span className="text-[9px] text-gray-400 uppercase">Inicio: </span>
                                                      <span className="font-semibold">{new Date(pc.fechaProgramada + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                                    </span>
                                                  </div>
                                                  <div className="flex items-center gap-1.5">
                                                    <Clock className="w-3 h-3 text-purple-500 flex-shrink-0" />
                                                    <span className="text-[11px] text-gray-700">
                                                      <span className="text-[9px] text-gray-400 uppercase">Fin: </span>
                                                      <span className="font-semibold">{pc.fechaSeguimiento ? new Date(pc.fechaSeguimiento + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}</span>
                                                    </span>
                                                  </div>
                                                </div>
                                              </div>
                                              </div>

                                                {/* S& Tareas de seguimiento DENTRO del corte (custom)  ANCHO COMPLETO */}
                                                {(() => {
                                                  const tareasDelCorte = (actividad.tareasSeguimiento || []).filter(t => t.puntoControlId === pc.id);
                                                  return (
                                                    <div className="mt-2 bg-white border border-gray-200 rounded-lg p-2 shadow-sm">
                                                      <div className="flex items-center justify-between mb-2">
                                                        <p className="text-[10px] font-bold text-gray-700 flex items-center gap-1">
                                                          <span className="w-4 h-4 rounded bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                                                            <Check className="w-2.5 h-2.5 text-white" />
                                                          </span>
                                                          Tareas de este corte
                                                          {tareasDelCorte.length > 0 && (
                                                            <span className="ml-1 px-1 py-0.5 rounded-full bg-green-100 text-green-700 text-[9px] font-bold">
                                                              {tareasDelCorte.length}
                                                            </span>
                                                          )}
                                                        </p>
                                                      </div>
                                                      <div className="space-y-1.5">
                                                        {tareasDelCorte.map((tarea) => {
                                                          const updateTareaCorteCustom = (updates: Partial<TareaSeguimiento>) => {
                                                            const nuevaConfig = rolesConfig.map(r => {
                                                              if (r.numero !== rol.numero) return r;
                                                              return { ...r, actividadesCustom: r.actividadesCustom.map((a, i) =>
                                                                i === index ? { ...a, tareasSeguimiento: (a.tareasSeguimiento || []).map(t => t.id === tarea.id ? { ...t, ...updates } : t) } : a
                                                              )};
                                                            });
                                                            onRolesChange(nuevaConfig);
                                                          };
                                                          return (
                                                            <div key={tarea.id} className="group bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-md hover:border-blue-300 transition-all">
                                                              <div className="px-2 py-1.5 flex items-start gap-2">
                                                                <div className="w-4 h-4 mt-0.5 rounded bg-green-100 flex items-center justify-center flex-shrink-0">
                                                                  <Check className="w-2.5 h-2.5 text-green-600" />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                  <p className="text-[11px] font-medium text-gray-900 leading-tight">{tarea.descripcion}</p>
                                                                  <ResponsableTareaPicker
                                                soloLectura={soloLectura}
                                                                    responsablesNombres={tarea.responsables}
                                                                    auditores={auditores}
                                                                    rolColor={rol.color}
                                                                    onAsignar={(aud) => updateTareaCorteCustom({ responsables: [aud.nombre] })}
                                                                    onQuitar={() => updateTareaCorteCustom({ responsables: [] })}
                                                                  />
                                                                </div>
                                                                <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                                                  <button
                                                                    onClick={() => {
                                                                      const nuevaConfig = rolesConfig.map(r => { if (r.numero !== rol.numero) return r; return { ...r, actividadesCustom: r.actividadesCustom.map((a, i) => i === index ? { ...a, tareasSeguimiento: (a.tareasSeguimiento || []).filter(t => t.id !== tarea.id) } : a) }; });
                                                                      onRolesChange(nuevaConfig);
                                                                    }}
                                                                    className="w-5 h-5 flex items-center justify-center rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                                                                    title="Eliminar tarea"
                                                                  >
                                                                    <Trash2 className="w-3 h-3" />
                                                                  </button>
                                                                </div>
                                                              </div>
                                                              <div className="px-2 pb-1.5 flex items-center gap-3 border-t border-gray-100 pt-1">
                                                                <label className="flex items-center gap-1 cursor-pointer" title="Requiere observaciones">
                                                                  <div className={`w-6 h-3.5 rounded-full transition-colors relative ${tarea.requiereObservaciones ? 'bg-blue-500' : 'bg-gray-300'}`} onClick={() => updateTareaCorteCustom({ requiereObservaciones: !tarea.requiereObservaciones })}>
                                                                    <div className={`w-2.5 h-2.5 bg-white rounded-full absolute top-0.5 transition-all shadow-sm ${tarea.requiereObservaciones ? 'left-3' : 'left-0.5'}`} />
                                                                  </div>
                                                                  <span className={`text-[10px] ${tarea.requiereObservaciones ? 'text-blue-700 font-semibold' : 'text-gray-500'}`}>📝</span>
                                                                </label>
                                                                <label className="flex items-center gap-1 cursor-pointer" title="Requiere adjuntos">
                                                                  <div className={`w-6 h-3.5 rounded-full transition-colors relative ${tarea.requiereAdjuntos ? 'bg-purple-500' : 'bg-gray-300'}`} onClick={() => updateTareaCorteCustom({ requiereAdjuntos: !tarea.requiereAdjuntos })}>
                                                                    <div className={`w-2.5 h-2.5 bg-white rounded-full absolute top-0.5 transition-all shadow-sm ${tarea.requiereAdjuntos ? 'left-3' : 'left-0.5'}`} />
                                                                  </div>
                                                                  <span className={`text-[10px] ${tarea.requiereAdjuntos ? 'text-purple-700 font-semibold' : 'text-gray-500'}`}>📎</span>
                                                                </label>
                                                                <div className="flex items-center gap-1 ml-auto">
                                                                  <input
                                                                    type="date"
                                                                    value={tarea.fechaEntrega || ''}
                                                                    min={pc.fechaProgramada}
                                                                    max={pc.fechaSeguimiento || undefined}
                                                                    onChange={(e) => updateTareaCorteCustom({ fechaEntrega: e.target.value })}
                                                                    className="text-[10px] border border-gray-200 rounded px-1 py-0.5 bg-white w-[100px]"
                                                                    title="Fecha de entrega (dentro del período del corte)"
                                                                  />
                                                                </div>
                                                              </div>
                                                            </div>
                                                          );
                                                        })}
                                                        {/* Agregar tarea al corte (custom) */}
                                                        <div className="flex gap-1.5 mt-1">
                                                          <input
                                                            type="text"
                                                            data-tarea-corte-custom={`${rol.numero}-${index}-${pc.id}`}
                                                            placeholder="✏️ Nueva tarea…"
                                                            className="flex-1 px-2 py-1.5 border border-dashed border-gray-300 rounded-md focus:outline-none focus:border-green-500 text-[11px] text-gray-600 bg-gray-50/50 placeholder:text-gray-400 transition-all"
                                                            onClick={e => e.stopPropagation()}
                                                            onKeyDown={(e) => {
                                                              if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                                                                const desc = (e.target as HTMLInputElement).value.trim();
                                                                const nuevaConfig = rolesConfig.map(r => { if (r.numero !== rol.numero) return r; return { ...r, actividadesCustom: r.actividadesCustom.map((a, i) => i === index ? { ...a, tareasSeguimiento: [...(a.tareasSeguimiento || []), { id: `tarea-${Date.now()}`, descripcion: desc, completada: false, responsables: [], puntoControlId: pc.id }] } : a) }; });
                                                                onRolesChange(nuevaConfig);
                                                                (e.target as HTMLInputElement).value = '';
                                                              }
                                                            }}
                                                          />
                                                          <button
                                                            onClick={() => {
                                                              const input = document.querySelector<HTMLInputElement>(`[data-tarea-corte-custom="${rol.numero}-${index}-${pc.id}"]`);
                                                              if (input && input.value.trim()) {
                                                                const nuevaConfig = rolesConfig.map(r => { if (r.numero !== rol.numero) return r; return { ...r, actividadesCustom: r.actividadesCustom.map((a, i) => i === index ? { ...a, tareasSeguimiento: [...(a.tareasSeguimiento || []), { id: `tarea-${Date.now()}`, descripcion: input.value.trim(), completada: false, responsables: [], puntoControlId: pc.id }] } : a) }; });
                                                                onRolesChange(nuevaConfig);
                                                                input.value = '';
                                                              }
                                                            }}
                                                            className="px-2.5 py-1.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-md text-[10px] font-semibold flex items-center gap-1 shadow-sm transition-all flex-shrink-0"
                                                          >
                                                            <Plus className="w-3 h-3" /> Agregar
                                                          </button>
                                                        </div>
                                                      </div>
                                                    </div>
                                                  );
                                                })()}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}

                                    {/* Estado vacío */}
                                    {(!actividad.puntosControl || actividad.puntosControl.length === 0) && (
                                      <div className="px-3 py-4 text-center">
                                        <p className="text-xs text-gray-400">Haz clic en "Configurar" para definir los cortes de seguimiento</p>
                                      </div>
                                    )}
                                  </div>



                                  {/* S& Tareas de seguimiento  World-class design (custom) */}
                                  <div className="mt-3 bg-white border border-gray-200 rounded-xl p-3 shadow-sm" onClick={e => e.stopPropagation()}>
                                    <div className="flex items-center justify-between mb-3">
                                      <p className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                                        <span className="w-5 h-5 rounded-md bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                                          <Check className="w-3 h-3 text-white" />
                                        </span>
                                        Tareas de seguimiento
                                        {(actividad.tareasSeguimiento || []).length > 0 && (
                                          <span className="ml-1 px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold">
                                            {(actividad.tareasSeguimiento || []).length}
                                          </span>
                                        )}
                                      </p>
                                    </div>

                                    <div className="space-y-2">
                                      {(actividad.tareasSeguimiento || []).map((tarea) => {
                                        const updateTareaCustom = (updates: Partial<TareaSeguimiento>) => {
                                          const nuevaConfig = rolesConfig.map(r => {
                                            if (r.numero !== rol.numero) return r;
                                            return { ...r, actividadesCustom: r.actividadesCustom.map((a, i) =>
                                              i === index ? { ...a, tareasSeguimiento: (a.tareasSeguimiento || []).map(t => t.id === tarea.id ? { ...t, ...updates } : t) } : a
                                            )};
                                          });
                                          onRolesChange(nuevaConfig);
                                        };
                                        return (
                                        <div key={tarea.id} className="group bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all">
                                          {/* Header de la tarea */}
                                          <div className="px-3 py-2.5 flex items-start gap-2.5">
                                            <div className="w-5 h-5 mt-0.5 rounded bg-green-100 flex items-center justify-center flex-shrink-0">
                                              <Check className="w-3 h-3 text-green-600" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <p className="text-sm font-medium text-gray-900 leading-tight">{tarea.descripcion}</p>
                                              <ResponsableTareaPicker
                                                soloLectura={soloLectura}
                                                responsablesNombres={tarea.responsables}
                                                auditores={auditores}
                                                rolColor={rol.color}
                                                onAsignar={(aud) => updateTareaCustom({ responsables: [aud.nombre] })}
                                                onQuitar={() => updateTareaCustom({ responsables: [] })}
                                              />
                                            </div>
                                            {/* Acciones */}
                                            <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                              <button
                                                onClick={() => {
                                                  const nuevaConfig = rolesConfig.map(r => {
                                                    if (r.numero !== rol.numero) return r;
                                                    return { ...r, actividadesCustom: r.actividadesCustom.map((a, i) =>
                                                      i === index ? { ...a, tareasSeguimiento: (a.tareasSeguimiento || []).filter(t => t.id !== tarea.id) } : a
                                                    )};
                                                  });
                                                  onRolesChange(nuevaConfig);
                                                }}
                                                className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                                                title="Eliminar tarea"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            </div>
                                          </div>

                                          {/* Footer: opciones compactas */}
                                          <div className="px-3 pb-2 flex items-center gap-4 border-t border-gray-100 pt-1.5">
                                            <label className="flex items-center gap-1.5 cursor-pointer" title="Requiere observaciones al completar">
                                              <div className={`w-7 h-4 rounded-full transition-colors relative ${tarea.requiereObservaciones ? 'bg-blue-500' : 'bg-gray-300'}`} onClick={() => updateTareaCustom({ requiereObservaciones: !tarea.requiereObservaciones })}>
                                                <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-all shadow-sm ${tarea.requiereObservaciones ? 'left-3.5' : 'left-0.5'}`} />
                                              </div>
                                              <span className={`text-[11px] ${tarea.requiereObservaciones ? 'text-blue-700 font-semibold' : 'text-gray-500'}`}>📝 Observaciones</span>
                                            </label>
                                            <label className="flex items-center gap-1.5 cursor-pointer" title="Requiere archivos adjuntos">
                                              <div className={`w-7 h-4 rounded-full transition-colors relative ${tarea.requiereAdjuntos ? 'bg-purple-500' : 'bg-gray-300'}`} onClick={() => updateTareaCustom({ requiereAdjuntos: !tarea.requiereAdjuntos })}>
                                                <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-all shadow-sm ${tarea.requiereAdjuntos ? 'left-3.5' : 'left-0.5'}`} />
                                              </div>
                                              <span className={`text-[11px] ${tarea.requiereAdjuntos ? 'text-purple-700 font-semibold' : 'text-gray-500'}`}>📎 Adjuntos</span>
                                            </label>
                                            <div className="flex items-center gap-1.5 ml-auto">
                                              <span className="text-[11px] text-gray-500">📅</span>
                                              <input
                                                type="date"
                                                value={tarea.fechaEntrega || (tarea as any).fechaLimite || ''}
                                                onChange={(e) => updateTareaCustom({ fechaEntrega: e.target.value })}
                                                className="text-[11px] border border-gray-200 rounded-md px-1.5 py-0.5 bg-white hover:border-blue-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none w-[120px]"
                                                title="Fecha de entrega (opcional)"
                                              />
                                            </div>
                                          </div>
                                        </div>
                                        );
                                      })}

                                      {/* Agregar nueva tarea  diseño premium */}
                                      <div className="flex gap-2 mt-1">
                                        <input
                                          type="text"
                                          data-tarea-wizard-custom={`${rol.numero}-${index}`}
                                          placeholder="✍ Escribir nueva tarea…"
                                          className="flex-1 px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg focus:outline-none focus:border-green-500 focus:bg-green-50/30 text-sm text-gray-600 bg-gray-50/50 placeholder:text-gray-400 transition-all"
                                          onClick={e => e.stopPropagation()}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                                              const desc = (e.target as HTMLInputElement).value.trim();
                                              const nuevaConfig = rolesConfig.map(r => {
                                                if (r.numero !== rol.numero) return r;
                                                return { ...r, actividadesCustom: r.actividadesCustom.map((a, i) =>
                                                  i === index ? { ...a, tareasSeguimiento: [...(a.tareasSeguimiento || []), { id: `tarea-${Date.now()}`, descripcion: desc, completada: false, responsables: [] }] } : a
                                                )};
                                              });
                                              onRolesChange(nuevaConfig);
                                              (e.target as HTMLInputElement).value = '';
                                            }
                                          }}
                                        />
                                        <button
                                          onClick={() => {
                                            const input = document.querySelector<HTMLInputElement>(`[data-tarea-wizard-custom="${rol.numero}-${index}"]`);
                                            if (input && input.value.trim()) {
                                              const nuevaConfig = rolesConfig.map(r => {
                                                if (r.numero !== rol.numero) return r;
                                                return { ...r, actividadesCustom: r.actividadesCustom.map((a, i) =>
                                                  i === index ? { ...a, tareasSeguimiento: [...(a.tareasSeguimiento || []), { id: `tarea-${Date.now()}`, descripcion: input.value.trim(), completada: false, responsables: [] }] } : a
                                                )};
                                              });
                                              onRolesChange(nuevaConfig);
                                              input.value = '';
                                            }
                                          }}
                                          className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm hover:shadow transition-all flex-shrink-0"
                                        >
                                          <Plus className="w-3.5 h-3.5" /> Agregar
                                        </button>
                                      </div>
                                    </div>
                                  </div>

                                </div>
                              </div>
                            );
                          })}

                          </div>
                        </div>
                      )}

                      {/* Formulario nueva actividad */}
                      {mostrarFormActividad === rol.numero ? (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-4 border-2 border-blue-300 bg-blue-50 rounded-lg space-y-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-blue-900">Nueva actividad personalizada</h4>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setMostrarFormActividad(null);
                              }}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              ×
                            </button>
                          </div>
                          <input
                            type="text"
                            value={nuevaActividad.nombre}
                            onChange={(e) => setNuevaActividad({ ...nuevaActividad, nombre: e.target.value })}
                            placeholder="Nombre de la actividad"
                            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <textarea
                            value={nuevaActividad.descripcion}
                            onChange={(e) => setNuevaActividad({ ...nuevaActividad, descripcion: e.target.value })}
                            placeholder="Descripción"
                            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                            rows={2}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                agregarActividadCustom(rol.numero);
                              }}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                            >
                              ➕ Agregar
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setMostrarFormActividad(null);
                              }}
                              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium"
                            >
                              Cancelar
                            </button>
                          </div>
                        </motion.div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMostrarFormActividad(rol.numero);
                          }}
                          className="w-full px-4 py-3 border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 rounded-lg text-gray-600 hover:text-blue-600 font-medium flex items-center justify-center gap-2 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Agregar actividad personalizada
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* S& NUEVO: Modal de configuración de puntos de control */}
      {modalPuntosControlAbierto && actividadConfigurando && (
        <ModalConfiguracionPuntosControl
          isOpen={modalPuntosControlAbierto}
          onClose={() => {
            setModalPuntosControlAbierto(false);
            setActividadConfigurando(null);
          }}
          nombreActividad={actividadConfigurando.nombreActividad}
          fechaInicioActividad={fechaInicio}
          fechaFinActividad={fechaFin}
          fechaCorte={
            (() => {
              const rol = rolesConfig.find(r => r.numero === actividadConfigurando.numeroRol);
              if (!rol) {
                console.log('[Wizard] R Rol no encontrado');
                return undefined;
              }
              let fechaCorteActividad;
              if (actividadConfigurando.esCustom && actividadConfigurando.indexCustom !== undefined) {
                fechaCorteActividad = rol.actividadesCustom[actividadConfigurando.indexCustom]?.fechaCorte;
              } else {
                fechaCorteActividad = rol.actividadesSeleccionadas.find(a => a.nombre === actividadConfigurando.nombreActividad)?.fechaCorte;
              }
              console.log('[Wizard] 📅 Pasando fechaCorte al modal:', fechaCorteActividad);
              return fechaCorteActividad;
            })()
          }
          puntosControlExistentes={
            (() => {
              const rol = rolesConfig.find(r => r.numero === actividadConfigurando.numeroRol);
              if (!rol) return [];
              
              if (actividadConfigurando.esCustom && actividadConfigurando.indexCustom !== undefined) {
                const actividad = rol.actividadesCustom[actividadConfigurando.indexCustom];
                return actividad?.puntosControl || [];
              } else {
                const actividad = rol.actividadesSeleccionadas.find(
                  a => a.nombre === actividadConfigurando.nombreActividad
                );
                return actividad?.puntosControl || [];
              }
            })()
          }
          frecuenciaActual={
            (() => {
              const rol = rolesConfig.find(r => r.numero === actividadConfigurando.numeroRol);
              if (!rol) return undefined;
              
              if (actividadConfigurando.esCustom && actividadConfigurando.indexCustom !== undefined) {
                const actividad = rol.actividadesCustom[actividadConfigurando.indexCustom];
                return actividad?.frecuenciaPuntosControl;
              } else {
                const actividad = rol.actividadesSeleccionadas.find(
                  a => a.nombre === actividadConfigurando.nombreActividad
                );
                return actividad?.frecuenciaPuntosControl;
              }
            })()
          }
          onGuardar={guardarPuntosControl}
        />
      )}
    </motion.div>
  );
}

// Paso 3: Confirmación
function Paso3({ 
  vigencia, 
  jefeOCI, 
  rolesConfig,
  soloLectura = false,
  aprobadoresComite = [],
  comiteAprobacion = [],
  setComiteAprobacion,
  ordenAprobacion,
  setOrdenAprobacion,
  handleDragStartAprobador,
  handleDragOverAprobador,
  handleDropAprobador,
  draggedAprobadorIndex,
  setDraggedAprobadorIndex
}: any) {
  const totalActividades = rolesConfig.reduce((total: number, rol: any) => {
    const sel = (rol.actividadesSeleccionadas || []).filter((a: ActividadBase) => actividadIncluidaEnPlan(a)).length;
    return total + sel + (rol.actividadesCustom?.length || 0);
  }, 0);

  const totalResponsables = rolesConfig.reduce((total: number, rol: any) => {
    return total + (rol.responsables?.length || 0);
  }, 0);

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
      <div className="text-center mb-8">
        <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
          soloLectura ? 'bg-slate-200' : 'bg-green-100'
        }`}>
          <Check className={`w-8 h-8 ${soloLectura ? 'text-slate-600' : 'text-green-600'}`} />
        </div>
        <h2 className={`text-3xl font-bold mb-3 ${soloLectura ? 'text-slate-800' : 'text-gray-900'}`}>Confirmación</h2>
        <p className={soloLectura ? 'text-slate-600' : 'text-gray-600'}>
          {soloLectura
            ? 'Solo consulta: resumen del plan y comité aprobador (sin modificar).'
            : 'Revisa la información antes de crear el plan'}
        </p>
      </div>

      {soloLectura && (
        <div className="rounded-xl border-2 border-slate-300 bg-slate-100 px-4 py-3 text-sm text-slate-800">
          <strong className="font-semibold">Modo solo consulta.</strong> El comité aprobador y el orden de firma se muestran únicamente para revisión.
        </div>
      )}

      <div className={`rounded-xl border-2 p-8 ${soloLectura ? 'bg-slate-50 border-slate-300' : 'bg-white border-gray-200'}`}>
        <h3 className="font-bold text-gray-900 mb-4">Resumen del plan</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between py-2 border-b border-gray-200">
            <span className="text-gray-600">Vigencia:</span>
            <span className="font-bold text-gray-900">{vigencia}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-200">
            <span className="text-gray-600">Responsable del Plan:</span>
            <span className="font-bold text-gray-900">{jefeOCI.nombre}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-200">
            <span className="text-gray-600">Roles configurados:</span>
            <span className="font-bold text-gray-900">5 roles obligatorios</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-200">
            <span className="text-gray-600">Total actividades:</span>
            <span className="font-bold text-gray-900">{totalActividades} actividades</span>
          </div>
          {(() => {
            const totalTareas = rolesConfig.reduce((sum: number, rol: any) => {
              const incl = (rol.actividadesSeleccionadas || []).filter((a: ActividadBase) => actividadIncluidaEnPlan(a));
              return sum + [...incl, ...(rol.actividadesCustom || [])]
                .reduce((s: number, a: any) => s + (a.tareasSeguimiento?.length || 0), 0);
            }, 0);
            return totalTareas > 0 ? (
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">Total tareas:</span>
                <span className="font-bold text-gray-900">{totalTareas} tareas de seguimiento</span>
              </div>
            ) : null;
          })()}
          <div className="flex justify-between py-2">
            <span className="text-gray-600">Total responsables:</span>
            <span className="font-bold text-gray-900">{totalResponsables} auditores asignados</span>
          </div>
        </div>

        {/* COMIT0 DE APROBACIN */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-bold text-gray-900 flex items-center gap-2">
                <Users className={`w-5 h-5 ${soloLectura ? 'text-slate-600' : 'text-blue-600'}`} />
                Comité Aprobador del Plan
              </h4>
              <p className="text-xs text-gray-500 mt-1">
                Solo usuarios con permiso <strong>Aprobar plan anual</strong> (<code className="text-[10px]">control-interno.plan-anual.approve</code>). No es el equipo operativo de auditorías.
              </p>
            </div>
            
            {soloLectura ? (
              <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-200 text-slate-800 border border-slate-300">
                Orden: {ordenAprobacion === 'paralelo' ? 'Paralelo' : 'Secuencial'}
              </span>
            ) : (
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setOrdenAprobacion?.('secuencial')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${ordenAprobacion === 'secuencial' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                🔄 Secuencial
              </button>
              <button
                type="button"
                onClick={() => setOrdenAprobacion?.('paralelo')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${ordenAprobacion === 'paralelo' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                ⚡ Paralelo
              </button>
            </div>
            )}
          </div>

          <div className={`rounded-xl p-5 shadow-inner border ${
            soloLectura ? 'bg-slate-100 border-slate-300' : 'bg-blue-50 border-blue-100'
          }`}>
            <div className={`grid grid-cols-1 gap-8 ${soloLectura ? '' : 'md:grid-cols-2'}`}>
              
              {/* Buscador */}
              {!soloLectura && (
              <div className="space-y-3">
                <label className="text-xs font-bold text-blue-900 uppercase tracking-wider">Agregar Miembro</label>
                <div className="relative">
                  <SelectorProfesional
                    auditores={aprobadoresComite.filter((a: any) => {
                      const yaSeleccionado = comiteAprobacion.find((c: any) => String(c.id) === String(a.id));
                      return !yaSeleccionado;
                    })}
                    onSelect={(id) => {
                      if (!id) return;
                      const auditor = aprobadoresComite.find((a: any) => String(a.id) === String(id));
                      if (auditor && setComiteAprobacion) {
                        setComiteAprobacion([...comiteAprobacion, auditor]);
                      }
                    }}
                    placeholder="+ Agregar miembro del comité..."
                    className="w-full bg-white shadow-sm"
                  />
                </div>
                <p className="text-[10px] text-gray-500 leading-tight bg-white/50 p-2 rounded border border-blue-100">
                  <span className="font-semibold text-blue-600">Tip:</span> Solo aparecen usuarios con permiso <code className="text-[9px]">control-interno.plan-anual.approve</code>. El orden importa si el flujo es secuencial.
                </p>
              </div>
              )}

              {/* Lista Seleccionada */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className={`text-xs font-bold uppercase tracking-wider ${soloLectura ? 'text-slate-700' : 'text-blue-900'}`}>
                    Flujo de Aprobación
                  </label>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    soloLectura ? 'bg-slate-200 text-slate-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {comiteAprobacion.length} miembro(s)
                  </span>
                </div>
                
                {comiteAprobacion.length === 0 ? (
                  <div className="text-sm text-gray-400 italic text-center p-6 border-2 border-dashed border-blue-200 rounded-xl bg-white shadow-sm flex flex-col items-center justify-center">
                    <Users className="w-8 h-8 text-blue-200 mb-2" />
                    El comité está vacío
                  </div>
                ) : (
                  <div className="space-y-2 relative">
                    {/* Línea conectora si es secuencial */}
                    {ordenAprobacion === 'secuencial' && comiteAprobacion.length > 1 && (
                      <div className="absolute left-3 top-4 bottom-4 w-0.5 bg-blue-200" />
                    )}
                    
                    {comiteAprobacion.map((miembro: any, index: number) => {
                      const getInitials = (name: string) => name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
                      const getRoleBadgeColor = (role: string) => {
                        const r = role.toLowerCase();
                        if (r.includes('jefe') || r.includes('super') || r.includes('director')) return 'bg-purple-100 text-purple-700';
                        if (r.includes('líder') || r.includes('lider') || r.includes('senior') || r.includes('sénior')) return 'bg-cyan-100 text-cyan-700';
                        if (r.includes('junior') || r.includes('júnior')) return 'bg-green-100 text-green-700';
                        if (r.includes('auditado')) return 'bg-amber-100 text-amber-700';
                        if (r.includes('aprobador pai')) return 'bg-orange-100 text-orange-700';
                        return 'bg-blue-100 text-blue-700';
                      };

                      return (
                        <div 
                          key={miembro.id} 
                          draggable={!soloLectura}
                          onDragStart={soloLectura ? undefined : (e) => handleDragStartAprobador(e, index)}
                          onDragOver={soloLectura ? undefined : handleDragOverAprobador}
                          onDrop={soloLectura ? undefined : (e) => handleDropAprobador(e, index)}
                          onDragEnd={soloLectura ? undefined : () => setDraggedAprobadorIndex(null)}
                          className={`relative flex items-center gap-3 p-2.5 bg-white border rounded-xl shadow-sm group transition-all z-10 ${
                            soloLectura
                              ? 'border-slate-200 cursor-default'
                              : `cursor-grab active:cursor-grabbing ${draggedAprobadorIndex === index ? 'opacity-50 border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`
                          }`}
                        >
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                            soloLectura
                              ? 'bg-slate-500 text-white'
                              : ordenAprobacion === 'secuencial'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-blue-100 text-blue-700'
                          }`}>
                            {ordenAprobacion === 'secuencial' ? index + 1 : '•'}
                          </div>
                          
                          <div className="w-9 h-9 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-[11px] font-black shrink-0">
                            {getInitials(miembro.nombre)}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{miembro.nombre}</p>
                            <p className="text-[11px] text-gray-400 truncate">{miembro.email || 'jefe.oci@esap.edu.co'}</p>
                          </div>

                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${getRoleBadgeColor(miembro.cargo || 'Funcionario')}`}>
                            {miembro.cargo || 'Funcionario'}
                          </span>

                          {!soloLectura && (
                            <>
                              <button
                                type="button"
                                onClick={() => setComiteAprobacion && setComiteAprobacion(comiteAprobacion.filter((c: any) => c.id !== miembro.id))}
                                className="w-7 h-7 shrink-0 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all ml-1"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                              <div className="text-gray-300 cursor-grab active:cursor-grabbing hover:text-blue-500">
                                <GripVertical className="w-5 h-5" />
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
// DASHBOARD DEL PLAN - VERSION SIMPLIFICADA
// """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""

interface DashboardPlanProps {
  plan: PlanAnual;
  onActualizar: (plan: PlanAnual) => void;
  onRefetchPlan?: () => Promise<void>; // Recargar plan desde backend tras guardar (para reflejar datos y adjuntos)
  onVolver: () => void;
  onAbrirRol4?: () => void;
  onCrearNuevo?: () => void; // Nueva prop para crear un nuevo plan
  planesAnteriores?: PlanAnual[]; // Historial de planes anteriores
  planesDisponibles?: PlanAnual[]; // Lista de todos los planes para selector
  onCambiarPlan?: (planId: string) => void; // Callback para cambiar de plan activo
  onEditarPlan?: (plan: PlanAnual) => void | Promise<void>; // Callback para editar el plan actual
  /** Mismo asistente que edición, sin poder guardar (solo consulta). */
  onVerDefinicionPlan?: (plan: PlanAnual) => void | Promise<void>;
  /** Tras volver del asistente en solo lectura: abrir esta pestaña una vez. */
  seccionForzada?: 'gestion' | 'aprobar' | null;
  onSeccionForzadaAplicada?: () => void;
  /** Tras eliminar un plan: el padre decide a qué plan / pantalla ir. */
  onPlanEliminado?: (planId: string) => void | Promise<void>;
}

const PLAN_ANUAL_STORAGE_KEY = 'esap:plan_anual_activo';

export function DashboardPlan({ plan, onActualizar, onRefetchPlan, onVolver, onAbrirRol4, onCrearNuevo, planesAnteriores = [], planesDisponibles = [], onCambiarPlan, onEditarPlan, onVerDefinicionPlan, seccionForzada, onSeccionForzadaAplicada, onPlanEliminado }: DashboardPlanProps) {
  const [seccion, setSeccion] = useState<'gestion' | 'asignar' | 'aprobar'>('gestion');
  const [mostrarModalExportacion, setMostrarModalExportacion] = useState(false);
  const [exportando, setExportando] = useState<'excel' | 'pdf' | null>(null);
  const [columnasExcel, setColumnasExcel] = useState<string[]>(
    () => COLUMNAS_DISPONIBLES.filter(c => c.defaultVisible).map(c => c.key)
  );
  const [mostrarModalEliminar, setMostrarModalEliminar] = useState(false);
  const [modalOTPEliminar, setModalOTPEliminar] = useState(false);
  const [eliminandoPlan, setEliminandoPlan] = useState(false);
  const [planObjetivoEliminar, setPlanObjetivoEliminar] = useState<{ id: string; vigencia: number } | null>(null);
  
  // Estado para auditores cargados desde backend
  const [auditores, setAuditores] = useState<Auditor[]>([]);
  const [aprobadoresComite, setAprobadoresComite] = useState<Auditor[]>([]);
  const [cargandoAuditores, setCargandoAuditores] = useState(true);

  // Cargar usuario actual para filtros de visibilidad
  const [currentUser, setCurrentUser] = useState<any>(null);
  useEffect(() => {
    try {
      const userData = (window as any).__esap_auth_cache;
      if (userData) {
        const normalized: any = { ...userData };
        if (userData.person?.first_name) {
          normalized.nombre = `${userData.person.first_name} ${userData.person.last_name || ''}`.trim();
        }
        if (!normalized.nombre && !normalized.nombres) {
          normalized.nombre = userData.fullName || userData.name || userData.username || '';
        }
        if (!normalized.email && userData.person?.email) {
          normalized.email = userData.person.email;
        }
        if (userData.person?.id && !normalized.idPerson) {
          normalized.idPerson = userData.person.id;
        }
        setCurrentUser(normalized);
      }
    } catch (e) {
      console.error('Error cargando usuario:', e);
    }
  }, []);
  
  // Permisos del Plan Anual (sistema flexible basado en permisos, no roles)
  const { puedeRealizar, esSuperUsuario } = useControlInternoPermissions();
  const puedeAprobarPlan = puedeRealizar('plan-anual', 'approve');
  const puedeActivarPlan = puedeRealizar('plan-anual', 'activate');
  const puedeEditarPlan = puedeRealizar('plan-anual', 'edit');
  const puedeAsignarActividades = puedeRealizar('plan-anual', 'assign');
  const puedeExportarPlan = puedeRealizar('plan-anual', 'export');
  const puedeSeguimiento = puedeRealizar('plan-anual', 'follow-up');
  const puedeEliminarPlan = puedeRealizar('plan-anual', 'delete');
  /** Backend permite DELETE con permiso edit o delete; la UI debe coincidir. */
  const puedeEliminarPlanEnUI = puedeEliminarPlan || puedeEditarPlan || esSuperUsuario;
  const puedeVerPlan = puedeRealizar('plan-anual', 'view');
  // Permiso compuesto: editar O seguimiento para gestionar evidencias
  const puedeGestionarEvidencias = puedeEditarPlan || puedeSeguimiento;
  // Tab Gestión: quienes pueden ver el plan O hacer seguimiento
  const puedeVerGestion = puedeVerPlan || puedeSeguimiento || puedeEditarPlan || puedeAsignarActividades || esSuperUsuario;

  // Tab Aprobación: aprobadores, activadores y editores (notificar al responsable / enviar al comité)
  const puedeVerAprobacion =
    puedeAprobarPlan ||
    puedeActivarPlan ||
    esSuperUsuario ||
    puedeEditarPlan;

  useEffect(() => {
    if (!seccionForzada) return;
    if (seccionForzada === 'aprobar' && !puedeVerAprobacion) {
      onSeccionForzadaAplicada?.();
      return;
    }
    setSeccion(seccionForzada);
    onSeccionForzadaAplicada?.();
  }, [seccionForzada, puedeVerAprobacion, onSeccionForzadaAplicada]);

  // Cargar auditores desde backend al montar el componente (profesionales OCI configurados)
  useEffect(() => {
    const cargarAuditores = async () => {
      setCargandoAuditores(true);
      try {
        const response = await configuracionesProfesionalesOCIApi.getAll();
        if (response.success && response.data) {
          // Mapear profesionales OCI a formato Auditor
          const auditoresMapeados = mapearProfesionalesOCIGDesdeApi(response.data);
          console.log('[useAuditores] Profesionales mapeados:', auditoresMapeados.map(a => `${a.nombre} (${a.cargo})`));
          setAuditores(auditoresMapeados);
        }
      } catch (error) {
        console.error('Error cargando auditores:', error);
      } finally {
        setCargandoAuditores(false);
      }
    };
    
    cargarAuditores();
    void cargarListaAprobadoresComite().then(setAprobadoresComite);
  }, []);

  // Sincronizar plan activo en localStorage cuando el plan cambia
  useEffect(() => {
    localStorage.setItem(PLAN_ANUAL_STORAGE_KEY, JSON.stringify({
      id: plan.id,
      vigencia: plan.vigencia,
      estado: plan.estado,
      version: plan.version,
      jefeOCINombre: plan.jefeOCI?.nombre ?? '',
      fechaCorte: `${plan.vigencia}-12-31`
    }));
  }, [plan.id]);

  // Estadísticas
  // Estadísticas cacheadas para mejorar rendimiento y scroll
  const { totalActividades, actividadesAsignadas, actividadesCompletadas, actividadesEnEjecucion, avancePromedio } = useMemo(() => {
    const total = plan.roles.reduce((sum, rol) => sum + rol.actividades.length, 0);
    const asignadas = plan.roles.reduce((sum, rol) => sum + rol.actividades.filter(a => a.responsable !== null).length, 0);
    const completadas = plan.roles.reduce((sum, rol) => sum + rol.actividades.filter(a => a.estado === 'COMPLETADA').length, 0);
    const enEjecucion = plan.roles.reduce((sum, rol) => sum + rol.actividades.filter(a => a.estado === 'EN_EJECUCION').length, 0);
    
    const todasActividades = plan.roles.flatMap((rol) => rol.actividades.filter((a) => a.activo !== false));
    const avance = calcularAvancePromedioActividades(todasActividades);

    return { totalActividades: total, actividadesAsignadas: asignadas, actividadesCompletadas: completadas, actividadesEnEjecucion: enEjecucion, avancePromedio: avance };
  }, [plan.roles]);



  const cerrarFlujoEliminar = () => {
    if (eliminandoPlan) return;
    setMostrarModalEliminar(false);
    setModalOTPEliminar(false);
    setPlanObjetivoEliminar(null);
  };

  const solicitarEliminarPlan = (planObjetivo: PlanAnual) => {
    if (!esEstadoPlanBorrador(planObjetivo.estado)) {
      toast.error('Solo se pueden eliminar planes en borrador');
      return;
    }
    setPlanObjetivoEliminar({ id: planObjetivo.id, vigencia: planObjetivo.vigencia });
    setMostrarModalEliminar(true);
  };

  const abrirVerificacionEliminar = () => {
    setMostrarModalEliminar(false);
    setModalOTPEliminar(true);
  };

  const handleOTPEliminacionExitosa = (_metadata: FirmaElectronicaMetadata) => {
    setModalOTPEliminar(false);
    void ejecutarEliminacionPlan();
  };

  const ejecutarEliminacionPlan = async () => {
    const idEliminar = planObjetivoEliminar?.id;
    if (!idEliminar) return;

    setEliminandoPlan(true);
    try {
      const { planAnualApi } = await import('./services/plan-anual/api');
      const res = await planAnualApi.delete(idEliminar);
      if (res.success) {
        const vig = planObjetivoEliminar?.vigencia ?? plan.vigencia;
        toast.success('Plan eliminado exitosamente', {
          description: `Plan de vigencia ${vig} eliminado de la base de datos.`,
        });
        cerrarFlujoEliminar();
        if (onPlanEliminado) {
          await onPlanEliminado(idEliminar);
        } else if (idEliminar === plan.id) {
          onActualizar(null as any);
        }
      } else {
        toast.error('Error al eliminar', { description: res.error || 'No se pudo eliminar el plan' });
      }
    } catch (error) {
      toast.error('Error al eliminar', { description: 'Ocurrió un error inesperado' });
    } finally {
      setEliminandoPlan(false);
    }
  };

  const handleExportarExcel = async () => {
    setExportando('excel');
    setMostrarModalExportacion(false);
    
    // S& NUEVO: Usar exportación local con ExcelJS + Logo (no depende del backend)
    try {
      // x DEBUG: Mostrar datos EXACTOS que se envían al Excel
      console.log('');
      console.log('[handleExportarExcel] DATOS DEL PLAN para Excel:');
      console.log('   plan.id:', plan.id);
      console.log('   plan.vigencia:', plan.vigencia);
      console.log('   plan.fecha_inicio:', (plan as any).fecha_inicio);
      console.log('   plan.fechaInicio:', (plan as any).fechaInicio);
      console.log('   plan.roles:', plan.roles?.length, 'roles');
      plan.roles?.forEach((rol, ri) => {
        console.log(`   ROL ${ri + 1} (${rol.nombre}): ${rol.actividades?.length || 0} actividades`);
        if (rol.actividades?.length > 0) {
          const act = rol.actividades[0] as any;
          console.log(`       Primera actividad: "${act.nombre}"`);
          console.log(`       responsable:`, act.responsable);
          console.log(`       responsables:`, act.responsables);
          console.log(`       fechaInicio:`, act.fechaInicio);
          console.log(`       fecha_inicio:`, act.fecha_inicio);
          console.log(`       fechaFin:`, act.fechaFin);
          console.log(`       fecha_fin:`, act.fecha_fin);
        }
      });
      console.log('');
      const resultado = await exportarPlanAnualExcel(plan, { columnasSeleccionadas: columnasExcel });
      if (resultado.exito) {
        toast.success('Exportado', { description: 'Excel descargado correctamente con logo ESAP' });
      } else {
        toast.error('Error al exportar Excel', { description: resultado.error || 'Error desconocido' });
      }
    } catch (e) {
      console.error('Error al exportar Excel:', e);
      toast.error('Error al exportar Excel', { description: e instanceof Error ? e.message : 'Error desconocido' });
    }
    setExportando(null);
  };

  const handleExportarPDF = async () => {
    setExportando('pdf');
    setMostrarModalExportacion(false);
    try {
      const jsPDF = (await import('jspdf')).default;
      const autoTable = (await import('jspdf-autotable')).default;
      const vigencia = plan.vigencia ?? (plan as { año?: number }).año ?? new Date().getFullYear();
      
      // Crear documento PDF con jsPDF - Paisaje para más columnas
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'letter'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 10;

      // Header institucional estandarizado  datos dinámicos del plan (NO hardcodeados)
      const alturaEncabezado = dibujarEncabezadoInstitucional(doc, {
        ...DOCUMENTOS_PREDEFINIDOS.PLAN_ANUAL,
        version: (plan as any).version ?? 1,
        fecha: plan.fechaCreacion 
          ? new Date(plan.fechaCreacion).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
          : new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }),
        logoImg: LOGO_ESAP_URL
      });
      
      let currentY = alturaEncabezado + 5;

      // Vigencia y Título
      doc.setTextColor(0, 61, 165);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`PLAN ANUAL DE AUDITORÍA - VIGENCIA ${vigencia}`, pageWidth / 2, currentY, { align: 'center' });
      currentY += 10;

      const formatearFechaExportacion = (valor: unknown): string => {
        if (!valor || typeof valor !== 'string') return '-';
        const limpio = valor.trim();
        if (!limpio || limpio === '-') return '-';
        const soloFecha = /^\d{4}-\d{2}-\d{2}$/.test(limpio);
        const isoConHora = /^\d{4}-\d{2}-\d{2}T/.test(limpio);
        const fechaBase = soloFecha
          ? limpio
          : (isoConHora ? limpio.slice(0, 10) : limpio);
        const fecha = new Date(/^\d{4}-\d{2}-\d{2}$/.test(fechaBase) ? `${fechaBase}T12:00:00` : fechaBase);
        if (Number.isNaN(fecha.getTime())) return limpio;
        return fecha.toLocaleDateString('es-CO');
      };

      const obtenerFechaTareaExport = (tarea: any, actividad: any): string => {
        // Prioridad: fecha real de seguimiento/evaluación de la tarea.
        const fechaSeguimiento =
          tarea?.fechaSeguimiento
          || tarea?.fecha_seguimiento
          || tarea?.fechaEvaluacion
          || tarea?.fecha_evaluacion
          || tarea?.fechaCompletado
          || tarea?.fechaCompletada
          || tarea?.fecha_completada;
        if (fechaSeguimiento) return formatearFechaExportacion(fechaSeguimiento);

        // Fallback: fecha objetivo/límite.
        const fechaLimite = tarea?.fechaLimite || tarea?.fecha_limite || tarea?.fechaEntrega;
        if (fechaLimite) return formatearFechaExportacion(fechaLimite);
        const tieneDatosTarea = !!tarea && typeof tarea === 'object' && Object.keys(tarea).length > 0;
        if (tieneDatosTarea) return '-';

        const puntosControl = actividad?.puntosControl || actividad?.puntos_control || [];
        if (Array.isArray(puntosControl) && puntosControl.length > 0) {
          const fechas = puntosControl
            .map((pc: any) => pc?.fechaSeguimiento || pc?.fecha_seguimiento)
            .filter(Boolean)
            .map((f: any) => formatearFechaExportacion(f))
            .filter((f: string) => f !== '-');
          if (fechas.length > 0) return fechas.join('\n');
        }
        return '-';
      };

      const obtenerResponsableTareaExport = (tarea: any): string => {
        const fuente = tarea?.responsables ?? tarea?.responsable;
        if (Array.isArray(fuente)) {
          const valores = fuente
            .map((r: any) => (typeof r === 'string' ? r : r?.nombre || r?.name || r?.email || ''))
            .filter(Boolean);
          return valores.length ? valores.join(', ') : '-';
        }
        if (typeof fuente === 'object' && fuente) return fuente.nombre || fuente.name || fuente.email || '-';
        if (typeof fuente === 'string' && fuente.trim()) return fuente;
        return '-';
      };

      const obtenerResponsableActividadExport = (actividad: any): string => {
        const candidatos: string[] = [];
        if (Array.isArray(actividad?.responsables)) {
          candidatos.push(
            ...actividad.responsables
              .map((r: any) => (typeof r === 'string' ? r : r?.nombre || r?.name || ''))
              .filter(Boolean)
          );
        }
        if (actividad?.responsable) {
          const principal = typeof actividad.responsable === 'string'
            ? actividad.responsable
            : actividad.responsable?.nombre || actividad.responsable?.name || '';
          if (principal) candidatos.push(principal);
        }
        return candidatos.length ? Array.from(new Set(candidatos)).join(', ') : 'No asignado';
      };

      // Definición de columnas solicitadas
      const tableHead = [[
        'Rol / Macroproceso',
        'Lista de actividades',
        'Inicio',
        'Fin',
        'Responsable',
        'Control',
        'Est.',
        'Resp. Tarea',
        'Seguimiento y evaluación tareas',
        'Fecha de seguimiento',
        'Eval.'
      ]];

      const tableBody: any[] = [];
      let totalActividadesCount = 0;
      let totalAvanceSuma = 0;
      let sumaAvanceTotal = 0;

      // Procesar datos para la tabla plana
      [...plan.roles].sort((a, b) => a.numero - b.numero).forEach((rol) => {
        rol.actividades.forEach((act, actIdx) => {
          totalActividadesCount++;
          const pctActividad = calcularAvanceActividad(act).porcentaje;
          totalAvanceSuma += pctActividad;

          const fInicio = act.fechaInicio ? formatearFechaExportacion(act.fechaInicio) : '';
          const fFin = act.fechaFin ? formatearFechaExportacion(act.fechaFin) : '';
          const responsableActividad = obtenerResponsableActividadExport(act);
          
          const tareas = act.tareasSeguimiento || [];
          
          if (tareas.length === 0) {
            // Fila única si no hay tareas
            const fechaDesdePuntos = obtenerFechaTareaExport({}, act);
            tableBody.push([
              `${rol.numero}. ${rol.nombre}`,
              act.nombre,
              fInicio,
              fFin,
              responsableActividad,
              act.control || 'Seguimiento periódico',
              `${pctActividad}%`,
              '-',
              'Sin tareas registradas',
              fechaDesdePuntos,
              '0%'
            ]);
          } else {
            // Una fila por tarea (celdas separadas)
            tareas.forEach((tarea) => {
              const fEntrega = obtenerFechaTareaExport(tarea, act);
              const respTarea = obtenerResponsableTareaExport(tarea);
              const pctTarea = tarea.completada ? '100%' : '0%';

              tableBody.push([
                `${rol.numero}. ${rol.nombre}`,
                act.nombre,
                fInicio,
                fFin,
                responsableActividad,
                act.control || 'Seguimiento',
                `${pctActividad}%`,
                respTarea,
                tarea.descripcion || '-',
                fEntrega,
                pctTarea
              ]);
            });
          }
        });
      });

      // Generar tabla principal
      autoTable(doc, {
        startY: currentY,
        head: tableHead,
        body: tableBody,
        theme: 'grid',
        headStyles: {
          fillColor: [0, 61, 165],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 7,
          halign: 'center'
        },
        styles: { 
          fontSize: 6, 
          cellPadding: 1.5,
          overflow: 'linebreak',
          cellWidth: 'wrap'
        },
        columnStyles: {
          0: { cellWidth: 30 }, // Rol
          1: { cellWidth: 42 }, // Actividades
          2: { cellWidth: 15, halign: 'center' }, // Inicio
          3: { cellWidth: 15, halign: 'center' }, // Fin
          4: { cellWidth: 22 }, // Responsable
          5: { cellWidth: 20 }, // Control
          6: { cellWidth: 10, halign: 'center' }, // Est.
          7: { cellWidth: 18 }, // Resp. Tarea
          8: { cellWidth: 42 }, // Seguimiento tareas
          9: { cellWidth: 15, halign: 'center' }, // Fecha
          10: { cellWidth: 10, halign: 'center' } // Eval.
        },
        margin: { left: margin, right: margin, top: alturaEncabezado + 20 },
        pageBreak: 'auto',
        rowPageBreak: 'avoid',
        didDrawPage: (data) => {
          // Footer en cada página
          dibujarPieInstitucional(doc, doc.getNumberOfPages(), true);
        }
      });

      currentY = (doc as any).lastAutoTable.finalY + 10;
      
      [...plan.roles].sort((a, b) => a.numero - b.numero).forEach((rol, rolIdx) => {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 61, 165);
        doc.text(`ROL ${rol.numero}: ${rol.nombre.toUpperCase()}`, margin, currentY);
        currentY += 7;

        // Calcular avance promedio del rol
        const sumaAvanceRol = rol.actividades.reduce(
          (s, a) => s + calcularAvanceActividad(a).porcentaje,
          0,
        );
        const promedioRol = rol.actividades.length > 0 ? Math.round(sumaAvanceRol / rol.actividades.length) : 0;

        sumaAvanceTotal += sumaAvanceRol;
        totalActividadesCount += rol.actividades.length;

        const actividadesData = rol.actividades.map((act, idx) => {
          const pctFinal = calcularAvanceActividad(act).porcentaje;
          // Responsable: prioridad responsables[]   responsable   'No asignado'
          const actX = act as any;
          let responsablePdf = '';
          if (Array.isArray(actX.responsables) && actX.responsables.length > 0) {
            responsablePdf = actX.responsables.map((r: any) => typeof r === 'string' ? r : r.nombre || '').filter(Boolean).join(', ');
          } else if (actX.responsable) {
            responsablePdf = typeof actX.responsable === 'string' ? actX.responsable : actX.responsable?.nombre || '';
          }
          if (!responsablePdf) responsablePdf = 'No asignado';
          
          return [
            (idx + 1).toString(),
            act.nombre,
            responsablePdf,
            act.estado === 'COMPLETADA' ? 'Completada' : 
            act.estado === 'EN_EJECUCION' ? 'En ejecución' : 'Pendiente',
            `${pctFinal}%`
          ];
        });
        
        // Agregar fila de subtotal del rol
        actividadesData.push([
          '',
          `SUBTOTAL ROL (${rol.actividades.length} actividades)`,
          '',
          'PROMEDIO:',
          `${promedioRol}%`
        ]);

        autoTable(doc, {
          startY: currentY,
          head: [['#', 'Actividad', 'Responsable', 'Estado', 'Avance']],
          body: actividadesData,
          theme: 'striped',
          headStyles: {
            fillColor: [0, 61, 165],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 9
          },
          styles: { fontSize: 8, cellPadding: 2 },
          columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 40 },
            3: { cellWidth: 30, halign: 'center' },
            4: { cellWidth: 20, halign: 'center' }
          },
          margin: { left: margin, right: margin },
          didParseCell: function(data) {
            // Destacar la fila de subtotal
            if (data.row.index === actividadesData.length - 1) {
              data.cell.styles.fillColor = [41, 98, 255];
              data.cell.styles.textColor = [255, 255, 255];
              data.cell.styles.fontStyle = 'bold';
            }
          }
        });

        currentY = (doc as any).lastAutoTable.finalY + 8;

        if (currentY > pageHeight - 40 && rolIdx < plan.roles.length - 1) {
          doc.addPage();
          currentY = margin;
        }
      });
      
      // Total general del plan
      // Resumen final
      const promedioGral = totalActividadesCount > 0 ? Math.round(totalAvanceSuma / totalActividadesCount) : 0;
      
      if (currentY > pageHeight - 30) {
        doc.addPage();
        currentY = margin + 20;
      }

      doc.setFillColor(240, 240, 240);
      doc.rect(margin, currentY, pageWidth - (margin * 2), 12, 'F');
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(`AVANCE GLOBAL DEL PLAN: ${promedioGral}%  (Total Actividades: ${totalActividadesCount})`, margin + 5, currentY + 8);

      doc.save(`Plan-Anual-Auditoria-${vigencia}-Detallado.pdf`);
      toast.success('PDF detallado generado', { description: 'Incluye todas las tareas de seguimiento y evaluación.' });
    } catch (error) {
      console.error('Error generando PDF:', error);
      toast.error('Error al generar PDF', { description: 'Ocurrió un error al procesar el documento' });
    }
    setExportando(null);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="bg-white border-b-2 border-gray-200 px-8 py-6">
        <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          {/* Izquierda: icono + título + badge de estado */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center flex-shrink-0 shadow-lg">
              <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 truncate tracking-tight">Plan Anual de Auditoría {plan.vigencia}</h1>
                <span className={`px-2.5 py-0.5 rounded-full font-bold border text-xs whitespace-nowrap ${plan.estado === 'VIGENTE' ? 'bg-green-100 text-green-700 border-green-300' : plan.estado === 'APROBADO' ? 'bg-blue-100 text-blue-700 border-blue-300' : plan.estado === 'EN_REVISION' ? 'bg-orange-100 text-orange-700 border-orange-300' : 'bg-gray-100 text-gray-600 border-gray-300'}`}>
                  {plan.estado === 'BORRADOR' ? 'Borrador' : plan.estado === 'EN_REVISION' ? 'En revisión' : plan.estado === 'APROBADO' ? 'Aprobado' : plan.estado === 'VIGENTE' ? 'Vigente' : 'Cerrado'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 truncate mt-0.5">Versión {plan.version} • {plan.jefeOCI.nombre}</p>
            </div>
          </div>

          {/* Derecha: selector de plan + botones de acción */}
          <div className="flex flex-row flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
            {planesDisponibles.length > 0 && onCambiarPlan && (
              <div className="flex items-center gap-2" style={{display: 'none'}}>
                <label
                  htmlFor="dashboard-plan-vigencia-select"
                  className="text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap"
                >
                  Vigencia plan anual
                </label>
                <select
                  id="dashboard-plan-vigencia-select"
                  value={plan.id}
                  onChange={(e) => {
                    const planSeleccionado = planesDisponibles.find(p => p.id === e.target.value);
                    if (planSeleccionado) {
                      localStorage.setItem(PLAN_ANUAL_STORAGE_KEY, JSON.stringify({
                        id: planSeleccionado.id,
                        vigencia: planSeleccionado.vigencia,
                        estado: planSeleccionado.estado,
                        version: planSeleccionado.version,
                        jefeOCINombre: planSeleccionado.jefeOCI?.nombre ?? '',
                        fechaCorte: `${planSeleccionado.vigencia}-12-31`
                      }));
                    }
                    onCambiarPlan(e.target.value);
                  }}
                  className="px-3 py-1.5 sm:py-2 border-2 border-blue-300 rounded-lg text-sm font-medium bg-blue-50 text-blue-900 focus:outline-none focus:border-blue-500 min-w-[140px]"
                >
                  {planesDisponibles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.vigencia} - {p.estado} (v{p.version})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {onCrearNuevo && (
              <button 
                onClick={onCrearNuevo}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg text-xs sm:text-sm whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                Nuevo Plan
              </button>
            )}

            <button
              type="button"
              onClick={async () => {
                if (onVerDefinicionPlan) {
                  await onVerDefinicionPlan(plan);
                  return;
                }
                // Fallback: si no hay handler de solo-consulta, abrir edición.
                if (onEditarPlan) {
                  await onEditarPlan(plan);
                }
              }}
              className="flex-1 sm:flex-none px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg font-bold flex items-center justify-center gap-2 transition-all hover:bg-blue-100 text-xs sm:text-sm whitespace-nowrap"
            >
              <Eye className="w-4 h-4" />
              Ver Plan Anual
            </button>

            {(puedeExportarPlan || puedeSeguimiento || esSuperUsuario) && (
            <button
              type="button"
              onClick={() => setMostrarModalExportacion(true)}
              className="flex-1 sm:flex-none px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-700 hover:to-green-800 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg text-xs sm:text-sm whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              Exportar
            </button>
            )}

          </div>
        </div>

        {mostrarModalExportacion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4"
            onClick={() => setMostrarModalExportacion(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              <div className="bg-gradient-to-r from-[#2962FF] to-[#003DA5] px-6 py-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                      <Download className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-white">Exportar Plan Anual</h2>
                      <p className="text-sm text-blue-100">Vigencia {plan.vigencia} • {plan.id}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setMostrarModalExportacion(false)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    disabled={!!exportando}
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                <p className="text-sm text-gray-600 mb-6">
                  Selecciona el formato de exportación. El documento incluirá toda la información del Plan Anual según normativa (Decreto 648/2017).
                </p>

                <div className="space-y-3">
                  <button
                    onClick={handleExportarPDF}
                    disabled={!!exportando}
                    className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-[#2962FF] hover:bg-blue-50 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-red-100 group-hover:bg-red-200 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors">
                        <FileText className="w-6 h-6 text-red-600" />
                      </div>
                      <div className="flex-1 text-left">
                        <h3 className="text-base font-bold text-gray-900 mb-1">📄 Exportar a PDF</h3>
                        <p className="text-sm text-gray-600 mb-2">
                          Documento oficial con diseño corporativo ESAP. Incluye portada, roles, actividades y firmas.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">✅ Diseño corporativo</span>
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">✅ Normativa 648/2017</span>
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-semibold">✅ Listo para firmar</span>
                        </div>
                      </div>
                      <div className="flex items-center">
                        {exportando === 'pdf' ? (
                          <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                        ) : (
                          <Download className="w-5 h-5 text-gray-400 group-hover:text-[#2962FF]" />
                        )}
                      </div>
                    </div>
                  </button>

                  <div className="border-2 border-gray-200 rounded-xl hover:border-green-600 transition-all">
                    <button
                      onClick={handleExportarExcel}
                      disabled={!!exportando || columnasExcel.length === 0}
                      className="w-full p-4 hover:bg-green-50 transition-all group disabled:opacity-50 disabled:cursor-not-allowed rounded-t-xl"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-green-100 group-hover:bg-green-200 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors">
                          <FileSpreadsheet className="w-6 h-6 text-green-600" />
                        </div>
                        <div className="flex-1 text-left">
                          <h3 className="text-base font-bold text-gray-900 mb-1">Exportar a Excel</h3>
                          <p className="text-sm text-gray-600 mb-2">
                            Tabla estructurada con datos reales del plan. Selecciona las columnas a incluir.
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">✅ Datos reales</span>
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">{columnasExcel.length} columnas</span>
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-semibold">✏️ Editable</span>
                          </div>
                        </div>
                        <div className="flex items-center">
                          {exportando === 'excel' ? (
                            <Loader2 className="w-5 h-5 text-green-600 animate-spin" />
                          ) : (
                            <Download className="w-5 h-5 text-gray-400 group-hover:text-green-600" />
                          )}
                        </div>
                      </div>
                    </button>
                    {/* Selector de columnas */}
                    <div className="border-t border-gray-200 p-3 bg-gray-50 rounded-b-xl" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Columnas del informe</span>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => setColumnasExcel(COLUMNAS_DISPONIBLES.map(c => c.key))}
                            className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-semibold hover:bg-blue-200 transition-colors"
                          >Todos</button>
                          <button
                            type="button"
                            onClick={() => setColumnasExcel([])}
                            className="text-[10px] px-2 py-0.5 bg-gray-200 text-gray-600 rounded font-semibold hover:bg-gray-300 transition-colors"
                          >Ninguno</button>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-1">
                        {COLUMNAS_DISPONIBLES.map(col => (
                          <label key={col.key} className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-white cursor-pointer transition-colors">
                            <input
                              type="checkbox"
                              checked={columnasExcel.includes(col.key)}
                              onChange={() => {
                                setColumnasExcel(prev =>
                                  prev.includes(col.key)
                                    ? prev.filter(k => k !== col.key)
                                    : [...prev, col.key]
                                );
                              }}
                              className="w-3.5 h-3.5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                            />
                            <span className="text-xs text-gray-700">{col.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-blue-900 mb-1">Información incluida en ambos formatos:</p>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• 5 Roles del Decreto 648/2017</li>
                        <li>• {plan.roles.reduce((sum, rol) => sum + rol.actividades.length, 0)} actividades programadas</li>
                        <li>• Responsables asignados y fechas</li>
                        <li>• Estado de cumplimiento y avances</li>
                        <li>• Información del Jefe OCI: {plan.jefeOCI.nombre}</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Modal de Confirmación de Eliminación */}
        {mostrarModalEliminar && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm"
            onClick={cerrarFlujoEliminar}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative"
            >
              <div className="p-6 text-center pt-8">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  ¿Eliminar este Plan Anual?
                </h3>
                <p className="text-sm text-gray-600 mb-2">
                  Estás a punto de eliminar permanentemente el Plan Anual de Auditoría <strong>{planObjetivoEliminar?.vigencia ?? plan.vigencia}</strong>.
                  Esta acción no tiene marcha atrás y eliminará todas sus actividades configuradas.
                </p>
                <p className="text-xs text-gray-500 mb-6">
                  Deberás validar tu identidad con el código OTP enviado a tu correo institucional (mismo proceso que al aprobar).
                </p>
                
                <div className="flex gap-3 mt-8">
                  <button
                    onClick={cerrarFlujoEliminar}
                    disabled={eliminandoPlan}
                    className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors disabled:opacity-50"
                  >
                    Mantener plan
                  </button>
                  <button
                    onClick={abrirVerificacionEliminar}
                    disabled={eliminandoPlan}
                    className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Shield className="w-4 h-4" />
                    Continuar y verificar
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        <ModalFirmaOTP
          isOpen={modalOTPEliminar}
          onClose={() => !eliminandoPlan && cerrarFlujoEliminar()}
          onSuccess={handleOTPEliminacionExitosa}
          userName={
            currentUser?.nombre
            || currentUser?.fullName
            || currentUser?.name
            || 'Usuario OCI'
          }
          userEmail={
            currentUser?.email
            || currentUser?.person?.email
            || currentUser?.usuario?.email
            || ''
          }
          accionDetalle={`Eliminación del Plan Anual de Auditoría ${planObjetivoEliminar?.vigencia ?? plan.vigencia}`}
        />

        {/* KPIs */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-blue-600 uppercase mb-1">Total</p>
            <p className="text-2xl font-bold text-blue-900">{totalActividades}</p>
            <p className="text-xs text-blue-600">Actividades</p>
          </div>
          <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-purple-600 uppercase mb-1">Asignadas</p>
            <p className="text-2xl font-bold text-purple-900">{actividadesAsignadas}</p>
            <p className="text-xs text-purple-600">de {totalActividades}</p>
          </div>
          <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-orange-600 uppercase mb-1">En ejecución</p>
            <p className="text-2xl font-bold text-orange-900">{actividadesEnEjecucion}</p>
            <p className="text-xs text-orange-600">Actividades</p>
          </div>
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-green-600 uppercase mb-1">Completadas</p>
            <p className="text-2xl font-bold text-green-900">{actividadesCompletadas}</p>
            <p className="text-xs text-green-600">Actividades</p>
          </div>
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-300 rounded-lg p-4 flex items-center justify-center">
            <SemaforoSeguimientoPAI 
              porcentaje={avancePromedio}
              variant="circular"
              size="lg"
              showIcon={false}
            />
          </div>
        </div>

        {/* Banner informativo - Sistema en uso */}
        {plan.estado === 'VIGENTE' && (
          <div className="mt-4 bg-green-50 border-2 border-green-200 rounded-lg p-3 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-green-900">
                <strong>Plan Vigente:</strong> Este es el plan actual en ejecución. 
                {onCrearNuevo && <span className="ml-1">Puedes crear un nuevo plan para la próxima vigencia usando el botón "Crear Nuevo Plan" arriba.</span>}
              </p>
            </div>
          </div>
        )}

        {/* Tabs - Filtradas según permisos */}
        <div className="flex gap-2 border-b border-gray-200">
          {[
            { id: 'gestion', label: 'Gestión y Seguimiento', icon: <TrendingUp className="w-4 h-4" />, visible: puedeVerGestion },
            { id: 'aprobar', label: 'Aprobación', icon: <FileCheck className="w-4 h-4" />, visible: puedeVerAprobacion }
          ].filter(tab => tab.visible).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSeccion(tab.id as any)}
              className={`px-5 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-all ${seccion === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'}`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
        </div>{/* cierre max-w-7xl */}
      </div>

      <div className="flex-1 overflow-y-auto bg-gray-50 px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            {seccion === 'gestion' && <SeccionGestionYSeguimiento key="gestion" plan={plan} planesAnteriores={planesAnteriores} onActualizar={onActualizar} onRefetchPlan={onRefetchPlan} onAbrirRol4={onAbrirRol4} auditores={auditores} cargandoAuditores={cargandoAuditores} onEditarPlan={onEditarPlan} onVerDefinicionPlan={onVerDefinicionPlan} onSolicitarEliminarPlan={solicitarEliminarPlan} puedeEliminarPlan={puedeEliminarPlanEnUI} />}
            {seccion === 'aprobar' && <SeccionAprobacion key="aprobar" plan={plan} onActualizar={onActualizar} onRefetchPlan={onRefetchPlan} puedeAprobarPlan={puedeAprobarPlan} puedeActivarPlan={puedeActivarPlan} puedeEditarPlan={puedeEditarPlan} aprobadoresComite={aprobadoresComite} />}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
// SECCIN 1: GESTIN Y SEGUIMIENTO (UNIFICADA)
// """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
// Esta sección combina el resumen ejecutivo con el seguimiento detallado
// permitiendo al usuario ver el estado general y hacer seguimiento sin cambiar de pestaña

function SeccionGestionYSeguimiento({ 
  plan, 
  planesAnteriores = [], 
  onActualizar, 
  onRefetchPlan,
  onAbrirRol4,
  auditores,
  cargandoAuditores = false,
  onEditarPlan,
  onVerDefinicionPlan,
  onSolicitarEliminarPlan,
  puedeEliminarPlan = false,
}: { 
  plan: PlanAnual; 
  planesAnteriores?: PlanAnual[]; 
  onActualizar: (plan: PlanAnual) => void; 
  onRefetchPlan?: () => Promise<void>;
  onAbrirRol4?: () => void;
  auditores: Auditor[];
  cargandoAuditores?: boolean;
  onEditarPlan?: (plan: PlanAnual) => void | Promise<void>;
  onVerDefinicionPlan?: (plan: PlanAnual) => void | Promise<void>;
  onSolicitarEliminarPlan?: (planObjetivo: PlanAnual) => void;
  puedeEliminarPlan?: boolean;
}) {

  // Estados para el seguimiento
  const [rolExpandido, setRolExpandido] = useState<number | string | null>(null);
  const [actividadExpandida, setActividadExpandida] = useState<number | string | null>(null);
  const [modoCardExpandida, setModoCardExpandida] = useState<'seguimiento' | 'edicion'>('seguimiento');
  const [modalAdjuntos, setModalAdjuntos] = useState<{ actividadId: number | string; rolNumero: number } | null>(null);
  const [nuevaObservacion, setNuevaObservacion] = useState('');
  const [mostrarSelectorApoyo, setMostrarSelectorApoyo] = useState(false);

  // Estado para formulario de nueva actividad inline
  const [mostrarFormNuevaActividad, setMostrarFormNuevaActividad] = useState<number | null>(null);
  const [nuevaActividad, setNuevaActividad] = useState<ActividadBase>({
    nombre: '',
    descripcion: '',
    fechaInicio: new Date().toISOString().split('T')[0],
    fechaFin: new Date().toISOString().split('T')[0],
    control: 'Seguimiento trimestral',
    evaluacion: '0% avance',
    seguimiento: 'Por definir'
  });

  // Asignar responsables integrados
  const [asignandoId, setAsignandoId] = useState<string | number | null>(null);

  // """""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
  // TAREAS DE SEGUIMIENTO  Monitoreo (no modifica el plan)
  // """""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
  const [formTareaActividadId, setFormTareaActividadId] = useState<string | number | null>(null);
  const [formTareaCorteKey, setFormTareaCorteKey] = useState<string | null>(null);
  const [nuevaTarea, setNuevaTarea] = useState({ descripcion: '', responsable: '', fechaLimite: '', requiereAdjuntos: false, requiereObservaciones: false });
  const [guardandoTarea, setGuardandoTarea] = useState(false);
  const [comentarioTareaId, setComentarioTareaId] = useState<string | null>(null);
  const [textoComentarioTarea, setTextoComentarioTarea] = useState('');

  const mapTareasParaBackend = (tareas: TareaSeguimiento[]) =>
    tareas.map(t => ({
      id: t.id,
      descripcion: t.descripcion,
      completada: t.completada,
      responsables: (t.responsables || []).map(r => typeof r === 'string' ? { id: r, nombre: r } : r),
      fechaLimite: t.fechaEntrega || (t as any).fechaLimite || (t as any).fecha_limite || null,
      fechaCompletada: t.fechaCompletado || (t as any).fechaCompletada || (t as any).fecha_completada || null,
      // Campos extendidos para no perder requisitos/evidencias al recargar
      requiereAdjuntos: !!t.requiereAdjuntos,
      requiereObservaciones: !!t.requiereObservaciones,
      observaciones: t.observaciones || '',
      adjuntosTarea: t.adjuntosTarea || [],
      puntoControlId: t.puntoControlId || null,
    }));

  // Verificar si el usuario actual puede gestionar tareas de seguimiento
  // (Director OCI + responsables del rol)
  const puedeGestionarTareas = (rol: any) => {
    if (!currentUser) return false;
    // Super usuario siempre puede
    if (esSuperUsuario) return true;
    // Director OCI (jefe del plan)
    if (plan.jefeOCI?.id === currentUser.idPerson || plan.jefeOCI?.id === currentUser.id) return true;
    // Responsable asignado al rol
    if ((rol as any).responsables?.some((r: Auditor) => r.id === currentUser.idPerson || r.id === currentUser.id)) return true;
    // Permiso de seguimiento
    return puedeEditarPlan || puedeSeguimiento;
  };

  // Agregar nueva tarea de seguimiento a una actividad
  const agregarTareaSeguimiento = async (
    rolNumero: number,
    actividadId: string | number,
    puntoControlId?: string,
  ) => {
    if (!nuevaTarea.descripcion.trim()) {
      toast.error('La descripción de la tarea es obligatoria');
      return;
    }
    setGuardandoTarea(true);
    try {
      const actividadActual = plan.roles.find(r => r.numero === rolNumero)?.actividades.find(a => a.id === actividadId);
      if (!actividadActual) throw new Error('Actividad no encontrada');
      const tareasActuales: TareaSeguimiento[] = (actividadActual as any).tareasSeguimiento || [];
      const nuevaTareaObj: TareaSeguimiento = {
        id: `tarea-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        descripcion: nuevaTarea.descripcion.trim(),
        completada: false,
        responsables: nuevaTarea.responsable ? [nuevaTarea.responsable] : [],
        fechaEntrega: nuevaTarea.fechaLimite || undefined,
        observaciones: '',
        requiereAdjuntos: nuevaTarea.requiereAdjuntos,
        requiereObservaciones: nuevaTarea.requiereObservaciones,
        ...(puntoControlId ? { puntoControlId } : {}),
      };
      const tareasActualizadas = [...tareasActuales, nuevaTareaObj];
      // Actualizar en el plan local
      const planActualizado = {
        ...plan,
        roles: plan.roles.map(rol => {
          if (rol.numero === rolNumero) {
            return { ...rol, actividades: rol.actividades.map(act => 
              act.id === actividadId ? { ...act, tareasSeguimiento: tareasActualizadas } : act
            )};
          }
          return rol;
        })
      };
      onActualizar(planActualizado);
      // Persistir en backend
      if (typeof actividadId === 'string' && actividadId.length >= 32) {
        const backendTareas = mapTareasParaBackend(tareasActualizadas);
        await actividadesApi.update(String(actividadId), { tareas_seguimiento: backendTareas } as any);
      }
      toast.success('Tarea de seguimiento agregada');
      setNuevaTarea({ descripcion: '', responsable: '', fechaLimite: '', requiereAdjuntos: false, requiereObservaciones: false });
      setFormTareaActividadId(null);
      setFormTareaCorteKey(null);
    } catch (err) {
      console.error('Error al agregar tarea:', err);
      toast.error('Error al agregar la tarea');
    }
    setGuardandoTarea(false);
  };

  // Toggle completar tarea (verifica requisitos)
  const toggleCompletarTarea = async (rolNumero: number, actividadId: string | number, tareaId: string) => {
    const actividadActual = plan.roles.find(r => r.numero === rolNumero)?.actividades.find(a => a.id === actividadId);
    if (!actividadActual) return;
    const tareasActuales: TareaSeguimiento[] = (actividadActual as any).tareasSeguimiento || [];
    const tarea = tareasActuales.find(t => t.id === tareaId);
    if (!tarea) return;
    // Si quiere completar, verificar requisitos
    if (!tarea.completada) {
      if (tarea.requiereAdjuntos && (!tarea.adjuntosTarea || tarea.adjuntosTarea.length === 0)) {
        toast.error('Esta tarea requiere al menos un adjunto para ser completada');
        return;
      }
      if (tarea.requiereObservaciones && (!tarea.observaciones || !tarea.observaciones.trim())) {
        toast.error('Esta tarea requiere una observación para ser completada');
        return;
      }
    }
    const tareasActualizadas = tareasActuales.map(t => 
      t.id === tareaId ? { ...t, completada: !t.completada, fechaCompletado: !t.completada ? new Date().toISOString() : undefined } : t
    );

    const actividadConTareas = { ...actividadActual, tareasSeguimiento: tareasActualizadas } as Actividad;
    const avanceRes = calcularAvanceActividad(actividadConTareas, opcionesCalculoAvance);
    let pctActividad = avanceRes.porcentaje;
    let estadoActividad = estadoActividadDesdePorcentaje(pctActividad);
    if (
      pctActividad >= 100 &&
      actividadActual.requiereAutorizacionJefeOCI &&
      !actividadActual.autorizadaPorJefeOCI
    ) {
      pctActividad = 99;
      estadoActividad = 'EN_EJECUCION';
    }
    const evaluacionTexto =
      avanceRes.fuente === 'tareas' || avanceRes.fuente === 'cortes'
        ? textoEvaluacionDesdeAvance(pctActividad, avanceRes.fuente)
        : actividadActual.evaluacion;

    const planActualizado = {
      ...plan,
      roles: plan.roles.map(rol => {
        if (rol.numero === rolNumero) {
          return { ...rol, actividades: rol.actividades.map(act => 
            act.id === actividadId
              ? {
                  ...act,
                  tareasSeguimiento: tareasActualizadas,
                  ...(avanceRes.fuente === 'tareas' || avanceRes.fuente === 'cortes'
                    ? {
                        porcentajeAvance: pctActividad,
                        evaluacion: evaluacionTexto,
                        estado: estadoActividad,
                      }
                    : {}),
                }
              : act
          )};
        }
        return rol;
      })
    };
    onActualizar(planActualizado);
    // Persistir
    if (typeof actividadId === 'string' && actividadId.length >= 32) {
      const backendTareas = mapTareasParaBackend(tareasActualizadas);
      const payload: Record<string, unknown> = { tareas_seguimiento: backendTareas };
      if (
        (avanceRes.fuente === 'tareas' || avanceRes.fuente === 'cortes') &&
        avanceRes.puedePersistirDesdeFront
      ) {
        payload.porcentaje_avance = pctActividad;
        payload.evaluacion = evaluacionTexto;
        payload.estado = estadoBackendDesdePorcentaje(pctActividad);
      }
      actividadesApi.update(String(actividadId), payload as any)
        .catch(e => console.error('Error persistiendo tarea:', e));
    }
    toast.success(tareasActualizadas.find(t => t.id === tareaId)?.completada ? 'Tarea completada' : 'Tarea reabierta');
  };

  const persistirTareasYRecalcularAvance = async (
    rolNumero: number,
    actividadId: string | number,
    tareasActualizadas: TareaSeguimiento[],
  ) => {
    const actividadActual = plan.roles
      .find((r) => r.numero === rolNumero)
      ?.actividades.find((a) => a.id === actividadId);
    if (!actividadActual) return;

    const actividadConTareas = { ...actividadActual, tareasSeguimiento: tareasActualizadas } as Actividad;
    const avanceRes = calcularAvanceActividad(actividadConTareas, opcionesCalculoAvance);
    let pctActividad = avanceRes.porcentaje;
    let estadoActividad = estadoActividadDesdePorcentaje(pctActividad);
    if (
      pctActividad >= 100 &&
      actividadActual.requiereAutorizacionJefeOCI &&
      !actividadActual.autorizadaPorJefeOCI
    ) {
      pctActividad = 99;
      estadoActividad = 'EN_EJECUCION';
    }
    const evaluacionTexto =
      avanceRes.fuente === 'tareas' || avanceRes.fuente === 'cortes'
        ? textoEvaluacionDesdeAvance(pctActividad, avanceRes.fuente)
        : actividadActual.evaluacion;

    const planActualizado = {
      ...plan,
      roles: plan.roles.map((rol) => {
        if (rol.numero !== rolNumero) return rol;
        return {
          ...rol,
          actividades: rol.actividades.map((act) =>
            act.id === actividadId
              ? {
                  ...act,
                  tareasSeguimiento: tareasActualizadas,
                  ...(avanceRes.fuente === 'tareas' || avanceRes.fuente === 'cortes'
                    ? {
                        porcentajeAvance: pctActividad,
                        evaluacion: evaluacionTexto,
                        estado: estadoActividad,
                      }
                    : {}),
                }
              : act,
          ),
        };
      }),
    };
    onActualizar(planActualizado);

    if (typeof actividadId === 'string' && actividadId.length >= 32) {
      const payload: Record<string, unknown> = {
        tareas_seguimiento: mapTareasParaBackend(tareasActualizadas),
      };
      if (
        (avanceRes.fuente === 'tareas' || avanceRes.fuente === 'cortes') &&
        avanceRes.puedePersistirDesdeFront
      ) {
        payload.porcentaje_avance = pctActividad;
        payload.evaluacion = evaluacionTexto;
        payload.estado = estadoBackendDesdePorcentaje(pctActividad);
      }
      await actividadesApi.update(String(actividadId), payload as any).catch((e) =>
        console.error('Error persistiendo tarea:', e),
      );
    }
  };

  // Agregar comentario/observación a una tarea
  const agregarComentarioTarea = async (rolNumero: number, actividadId: string | number, tareaId: string, comentario: string) => {
    if (!comentario.trim()) return;
    const actividadActual = plan.roles.find(r => r.numero === rolNumero)?.actividades.find(a => a.id === actividadId);
    if (!actividadActual) return;
    const tareasActuales: TareaSeguimiento[] = (actividadActual as any).tareasSeguimiento || [];
    const lineaNueva = `[${new Date().toLocaleString('es-CO')}] ${comentario.trim()}`;
    const tareasActualizadas = tareasActuales.map((t) => {
      if (t.id !== tareaId) return t;
      const prev = (t.observaciones || '').trim();
      return {
        ...t,
        observaciones: prev ? `${prev}\n\n${lineaNueva}` : lineaNueva,
        evaluada: true,
        fechaEvaluacion: new Date().toISOString(),
      };
    });
    await persistirTareasYRecalcularAvance(rolNumero, actividadId, tareasActualizadas);
    toast.success('Observación agregada a la tarea');
    setComentarioTareaId(null);
    setTextoComentarioTarea('');
  };

  const agregarAdjuntosTarea = async (
    rolNumero: number,
    actividadId: string | number,
    tareaId: string,
    files: FileList | null
  ) => {
    if (!files || files.length === 0) return;
    const actividadActual = plan.roles.find(r => r.numero === rolNumero)?.actividades.find(a => a.id === actividadId);
    if (!actividadActual) return;
    const tareasActuales: TareaSeguimiento[] = (actividadActual as any).tareasSeguimiento || [];
    const nuevosAdjuntos = Array.from(files).map(file => ({
      nombre: file.name,
      url: URL.createObjectURL(file),
      fecha: new Date().toISOString(),
    }));
    const tareasActualizadas = tareasActuales.map(t =>
      t.id === tareaId
        ? { ...t, adjuntosTarea: [...(t.adjuntosTarea || []), ...nuevosAdjuntos] }
        : t
    );
    await persistirTareasYRecalcularAvance(rolNumero, actividadId, tareasActualizadas);
    toast.success(`${nuevosAdjuntos.length} evidencia(s) agregada(s) a la tarea`);
  };

  
  const asignarResponsableInline = async (rolNumero: number, actividadId: number | string, auditor: Auditor) => {
    setAsignandoId(actividadId);
    const actividadActual = plan.roles.find(r => r.numero === rolNumero)?.actividades.find(a => a.id === actividadId);
    const responsablesActuales = actividadActual?.responsables?.length ? actividadActual.responsables : (actividadActual?.responsable ? [actividadActual.responsable] : []);
    
    if (responsablesActuales.some((r: Auditor) => r.id === auditor.id)) {
      toast.info('Ya asignado', { description: `${auditor.nombre} ya es responsable de esta actividad` });
      setAsignandoId(null);
      return;
    }
    
    // Regla de negocio: solo un responsable principal por actividad
    const nuevosResponsables = [auditor];
    const planActualizado = {
      ...plan,
      roles: plan.roles.map(rol => {
        if (rol.numero === rolNumero) {
          return { ...rol, actividades: rol.actividades.map(act => act.id === actividadId ? { ...act, responsables: nuevosResponsables, responsable: nuevosResponsables[0] } : act) };
        }
        return rol;
      })
    };
    onActualizar(planActualizado as any);
    
    try {
      const res = await actividadesApi.update(String(actividadId), { responsable: nuevosResponsables[0].nombre, responsables: nuevosResponsables });
      if (res.success) { toast.success('Responsable actualizado'); onRefetchPlan?.(); } else { toast.error('Error', { description: res.error }); }
    } catch (e) { toast.error('Error al guardar en el servidor'); }
    finally { setAsignandoId(null); }
  };

  const quitarResponsableInline = async (rolNumero: number, actividadId: number | string, auditorId: string) => {
    setAsignandoId(actividadId);
    const actividadActual = plan.roles.find(r => r.numero === rolNumero)?.actividades.find(a => a.id === actividadId);
    const responsablesActuales = actividadActual?.responsables?.length ? actividadActual.responsables : (actividadActual?.responsable ? [actividadActual.responsable] : []);
    const nuevosResponsables = responsablesActuales.filter((r: Auditor) => r.id !== auditorId);
    
    const planActualizado = {
      ...plan,
      roles: plan.roles.map(rol => {
        if (rol.numero === rolNumero) {
          return { ...rol, actividades: rol.actividades.map(act => act.id === actividadId ? { ...act, responsables: nuevosResponsables, responsable: nuevosResponsables[0] || null } : act) };
        }
        return rol;
      })
    };
    onActualizar(planActualizado as any);
    
    try {
      const res = await actividadesApi.update(String(actividadId), { responsable: nuevosResponsables[0]?.nombre || '', responsables: nuevosResponsables });
      if (res.success) { toast.success('Asignación removida'); onRefetchPlan?.(); } else { toast.error('Error', { description: res.error }); }
    } catch (e) { toast.error('Error al guardar en el servidor'); }
    finally { setAsignandoId(null); }
  };

  //  AGREGAR ACTIVIDAD INLINE 
  const agregarActividadInline = async (rolNumero: number) => {
    if (!nuevaActividad.nombre.trim()) {
      toast.error('El nombre de la actividad es obligatorio');
      return;
    }

    try {
      const payload = {
        nombre: nuevaActividad.nombre.trim(),
        descripcion: nuevaActividad.descripcion.trim(),
        fecha_inicio: nuevaActividad.fechaInicio,
        fecha_fin: nuevaActividad.fechaFin,
        rol_numero: rolNumero,
        plan_anual_id: plan.id,
        estado: 'pendiente',
        porcentaje_avance: 0,
      };

      const res = await actividadesApi.create(payload);
      if (res.success) {
        toast.success('Actividad agregada', { description: `"${nuevaActividad.nombre}" añadida al Rol ${rolNumero}` });
        setNuevaActividad({
          nombre: '',
          descripcion: '',
          fechaInicio: fechaInicio || `${plan.vigencia || new Date().getFullYear()}-01-01`,
          fechaFin: fechaFin || `${plan.vigencia || new Date().getFullYear()}-12-31`,
          control: 'Seguimiento trimestral',
          evaluacion: '0% avance',
          seguimiento: 'Por definir'
        });
        setMostrarFormNuevaActividad(null);
        onRefetchPlan?.();
      } else {
        toast.error('Error al crear actividad', { description: res.error || 'Inténtalo de nuevo' });
      }
    } catch (error: any) {
      console.error('[agregarActividadInline] Error:', error);
      toast.error('Error al crear actividad', { description: error?.message || 'Error de red' });
    }
  };

  //  ENTRADAS DE SEGUIMIENTO POR CORTE 
  const [corteConFormAbierto, setCorteConFormAbierto] = useState<string | null>(null);
  const [formEntrada, setFormEntrada] = useState<{ texto: string; tipo: 'seguimiento' | 'hallazgo' | 'cierre' }>({ texto: '', tipo: 'seguimiento' });
  const [guardandoEntrada, setGuardandoEntrada] = useState(false);
  const [modalEntradaCorte, setModalEntradaCorte] = useState<{
    rolNumero: number;
    actividadId: number | string;
    puntoControlId: string;
  } | null>(null);

  // Modal de confirmación para desactivar/activar actividades
  const [modalConfirmacion, setModalConfirmacion] = useState<{
    visible: boolean;
    tipo: 'desactivar' | 'activar';
    rolNumero: number;
    actividadId: number | string;
    actividadNombre: string;
  } | null>(null);
  
  // S& NUEVO: Modal de edición de actividad (Decreto 648/2017)
  const [modalEdicion, setModalEdicion] = useState<{
    visible: boolean;
    rolNumero: number;
    actividad: Actividad;
  } | null>(null);
  const [formularioEdicion, setFormularioEdicion] = useState({
    nombre: '',
    descripcion: '',
    control: '',
    evaluacion: '',
    seguimiento: '',
    fechaInicio: '',
    fechaFin: '',
    tareas: [] as any[],
    puntosControl: [] as any[],
    frecuenciaPuntosControl: 'trimestral',
    fechaCorte: ''
  });
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [modalCortesConfig, setModalCortesConfig] = useState(false);
  
  // S& Modificado: roles colapsados por defecto (true)
  const [rolesColapsados, setRolesColapsados] = useState<Record<number, boolean>>(() => {
    const estado: Record<number, boolean> = {};
    if (plan?.roles) plan.roles.forEach(r => estado[r.numero] = true);
    return estado;
  });
  // Historial: expandido si hay algún borrador (acción eliminar por fila)
  const [historialColapsado, setHistorialColapsado] = useState(true);

  const planesEnHistorial = useMemo(() => {
    const porId = new Map<string, PlanAnual>();
    for (const p of planesAnteriores) {
      porId.set(p.id, p);
    }
    if (!porId.has(plan.id)) {
      porId.set(plan.id, plan);
    }
    return Array.from(porId.values()).sort((a, b) => (b.vigencia ?? 0) - (a.vigencia ?? 0));
  }, [planesAnteriores, plan]);

  const hayBorradoresEnLista = useMemo(
    () => planesEnHistorial.some((p) => esEstadoPlanBorrador(p.estado)),
    [planesEnHistorial],
  );

  useEffect(() => {
    if (hayBorradoresEnLista) {
      setHistorialColapsado(false);
    }
  }, [hayBorradoresEnLista]);

  const [formulario, setFormulario] = useState({
    control: '',
    evaluacion: '',
    seguimiento: '',
    porcentaje: 0
  });
  
  // Hook para sincronizar evidencias con backend
  const { guardar: guardarEvidencias } = useSaveEvidencias();
  
  // Estado para indicar que se está guardando
  const [guardando, setGuardando] = useState(false);

  // """""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
  // PERMISOS: Sistema flexible basado en permisos para Control Interno
  // """""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
  const { puedeRealizar, esSuperUsuario } = useControlInternoPermissions();
  const puedeEditarPlan = puedeRealizar('plan-anual', 'edit');
  const puedeSeguimiento = puedeRealizar('plan-anual', 'follow-up');
  const puedeAprobarPlan = puedeRealizar('plan-anual', 'approve');
  const puedeAsignarActividades = puedeRealizar('plan-anual', 'assign');
  const puedeVerPlan = puedeRealizar('plan-anual', 'view') || esSuperUsuario;
  // Permiso compuesto: editar O seguimiento para gestionar evidencias
  const puedeGestionarEvidencias = puedeEditarPlan || puedeSeguimiento;

  // S& Usuario para visualización condicional
  const [currentUser, setCurrentUser] = useState<any>(null);
  useEffect(() => {
    try {
      const userData = (window as any).__esap_auth_cache;
      if (userData) setCurrentUser(userData);
    } catch (e) {}
  }, []);

  // """""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
  // NUEVO: Estado para cumplimiento de auditorías (Rol 4)
  // """""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
  const [cumplimientoAuditorias, setCumplimientoAuditorias] = useState<{
    totalProgramadas: number;
    totalFinalizadas: number;
    porcentajeCumplimiento: number;
    desglosePorTipo: Record<string, { programadas: number; finalizadas: number; en_proceso: number; pendientes: number }>;
    actividadId?: string;
    cargando: boolean;
  }>({
    totalProgramadas: 0,
    totalFinalizadas: 0,
    porcentajeCumplimiento: 0,
    desglosePorTipo: {},
    actividadId: undefined,
    cargando: true
  });

  const opcionesCalculoAvance = useMemo(
    () =>
      cumplimientoAuditorias.cargando
        ? undefined
        : {
            cumplimientoAuditorias: {
              porcentajeCumplimiento: cumplimientoAuditorias.porcentajeCumplimiento,
              totalProgramadas: cumplimientoAuditorias.totalProgramadas,
              totalFinalizadas: cumplimientoAuditorias.totalFinalizadas,
              actividadId: cumplimientoAuditorias.actividadId,
            },
          },
    [cumplimientoAuditorias],
  );

  const avanceSincronizadoRef = useRef<string | null>(null);

  // Alinear % guardado en BD con el cálculo por cortes/tareas (evita 0% obsoleto en pantalla)
  useEffect(() => {
    if (plan.estado === 'BORRADOR') return;
    const firma = `${plan.id ?? ''}-${plan.roles.reduce((n, r) => n + r.actividades.length, 0)}`;
    if (avanceSincronizadoRef.current === firma) return;

    let huboCambio = false;
    const rolesActualizados = plan.roles.map((rol) => ({
      ...rol,
      actividades: rol.actividades.map((act) => {
        if (act.activo === false) return act;
        const av = calcularAvanceActividad(act, opcionesCalculoAvance);
        if (!av.puedePersistirDesdeFront) return act;
        const guardado = act.porcentajeAvance ?? 0;
        if (av.porcentaje === guardado) return act;
        huboCambio = true;
        return {
          ...act,
          porcentajeAvance: av.porcentaje,
          evaluacion: textoEvaluacionDesdeAvance(av.porcentaje, av.fuente),
          estado: estadoActividadDesdePorcentaje(av.porcentaje),
        };
      }),
    }));

    if (huboCambio) {
      onActualizar({ ...plan, roles: rolesActualizados });
      rolesActualizados.forEach((rol) => {
        rol.actividades.forEach((act) => {
          const av = calcularAvanceActividad(act, opcionesCalculoAvance);
          if (
            typeof act.id === 'string' &&
            act.id.length >= 32 &&
            av.puedePersistirDesdeFront &&
            (act.porcentajeAvance ?? 0) === av.porcentaje
          ) {
            actividadesApi
              .update(String(act.id), {
                porcentaje_avance: av.porcentaje,
                evaluacion: textoEvaluacionDesdeAvance(av.porcentaje, av.fuente),
                estado: estadoBackendDesdePorcentaje(av.porcentaje),
              } as any)
              .catch(() => undefined);
          }
        });
      });
    }
    avanceSincronizadoRef.current = firma;
  }, [plan, opcionesCalculoAvance, onActualizar]);

  // Vigencia con fallback (plan puede tener vigencia o año)
  const vigenciaPlan = plan.vigencia ?? (plan as { año?: number }).año ?? new Date().getFullYear();

  // Cargar datos de cumplimiento de auditorías al montar y al refrescar
  const cargarCumplimiento = async () => {
    setCumplimientoAuditorias(prev => ({ ...prev, cargando: true }));
    try {
      const resultado = await controlInternoService.getCumplimientoAuditorias(vigenciaPlan);
      setCumplimientoAuditorias({
        ...resultado,
        cargando: false
      });
    } catch (error) {
      console.error('[AUDITORÍAS] Error cargando cumplimiento:', error);
      setCumplimientoAuditorias(prev => ({
        ...prev,
        totalProgramadas: 0,
        totalFinalizadas: 0,
        porcentajeCumplimiento: 0,
        desglosePorTipo: {},
        cargando: false
      }));
    }
  };

  useEffect(() => {
    cargarCumplimiento();
  }, [vigenciaPlan]);

  // Refrescar cumplimiento y recargar plan (para sincronizar actividades con tipo_calculo=auditorias)
  const handleRefrescarCumplimiento = async () => {
    await cargarCumplimiento();
    onRefetchPlan?.();
  };

  // S& NUEVO: Función para toggle del colapso de un rol específico
  const toggleRolColapsado = (numeroRol: number) => {
    setRolesColapsados(prev => ({
      ...prev,
      [numeroRol]: !prev[numeroRol]
    }));
  };

  // S& NUEVO: Función para expandir/colapsar todos los roles
  const toggleTodosRoles = (colapsar: boolean) => {
    const nuevoEstado: Record<number, boolean> = {};
    plan.roles.forEach(rol => {
      nuevoEstado[rol.numero] = colapsar;
    });
    setRolesColapsados(nuevoEstado);
  };

  const obtenerTotalActividadesPlanAnterior = (planAnterior: any): number => {
    if (Array.isArray(planAnterior?.roles) && planAnterior.roles.length > 0) {
      return planAnterior.roles.reduce((sum: number, rol: any) => {
        const actividades = Array.isArray(rol?.actividades) ? rol.actividades.length : 0;
        return sum + actividades;
      }, 0);
    }
    if (typeof planAnterior?.total_actividades === 'number') return planAnterior.total_actividades;
    if (typeof planAnterior?.totalActividades === 'number') return planAnterior.totalActividades;
    return 0;
  };

  // Funciones de seguimiento
  const abrirSeguimiento = (actividad: Actividad) => {
    // DEBUG: Ver datos de la actividad incluyendo configuracionEvidencias
    console.log('[SEGUIMIENTO] Abriendo actividad:', {
      id: actividad.id,
      nombre: actividad.nombre,
      estado: actividad.estado,
      porcentajeAvance: actividad.porcentajeAvance,
      configuracionEvidencias: actividad.configuracionEvidencias,
      adjuntos: actividad.adjuntos?.length || 0,
      observaciones: contarObservaciones(actividad.observacionesCumplimiento),
      actividadCompleta: actividad
    });
    
    const porcentajeCalculado = calcularPorcentajeAutomatico(actividad);
    const controlAutomatico = actividad.frecuenciaPuntosControl 
      ? obtenerTextoPeriodicidad(actividad.frecuenciaPuntosControl)
      : actividad.control;
    
    setFormulario({
      control: controlAutomatico,
      evaluacion: actividad.evaluacion,
      seguimiento: actividad.seguimiento,
      porcentaje: porcentajeCalculado
    });
    setNuevaObservacion('');
    setMostrarSelectorApoyo(false);
    setActividadExpandida(actividad.id);
  };

  // Función para desactivar una actividad (soft delete)
  const desactivarActividad = async (rolNumero: number, actividadId: number | string) => {
    console.log('xa [desactivarActividad] Desactivando actividad:', { rolNumero, actividadId });
    
    try {
      const res = await actividadesApi.delete(String(actividadId));
      console.log('xa [desactivarActividad] Respuesta del backend:', res);

      if (res.success) {
        // Actualizar estado local - marcar como inactiva
        const planActualizado = {
          ...plan,
          roles: plan.roles.map(rol => {
            if (rol.numero === rolNumero) {
              return {
                ...rol,
                actividades: rol.actividades.map(act => 
                  act.id === actividadId ? { ...act, activo: false } : act
                )
              };
            }
            return rol;
          })
        };
        onActualizar(planActualizado);
        toast.success('Actividad desactivada', { description: 'La actividad ha sido marcada como inactiva' });
        
        // Refrescar plan completo desde el backend
        onRefetchPlan?.();
      } else {
        toast.error('Error al desactivar', { description: res.error || 'No se pudo desactivar en el servidor' });
      }
    } catch (error) {
      console.error('Error desactivando actividad:', error);
      toast.error('Error', { description: 'No se pudo desactivar la actividad' });
    }
  };

  // Función para REACTIVAR una actividad
  const reactivarActividad = async (rolNumero: number, actividadId: number | string) => {
    console.log('S& [reactivarActividad] Reactivando actividad:', { rolNumero, actividadId });
    
    try {
      // Llamar al endpoint de actualización para cambiar activo a true
      const res = await actividadesApi.update(String(actividadId), { activo: true } as any);
      console.log('S& [reactivarActividad] Respuesta del backend:', res);

      if (res.success) {
        // Actualizar estado local - marcar como activa
        const planActualizado = {
          ...plan,
          roles: plan.roles.map(rol => {
            if (rol.numero === rolNumero) {
              return {
                ...rol,
                actividades: rol.actividades.map(act => 
                  act.id === actividadId ? { ...act, activo: true } : act
                )
              };
            }
            return rol;
          })
        };
        onActualizar(planActualizado);
        toast.success('Actividad reactivada', { description: 'La actividad está activa nuevamente' });
        
        // Refrescar plan completo desde el backend
        onRefetchPlan?.();
      } else {
        toast.error('Error al reactivar', { description: res.error || 'No se pudo reactivar en el servidor' });
      }
    } catch (error) {
      console.error('Error reactivando actividad:', error);
      toast.error('Error', { description: 'No se pudo reactivar la actividad' });
    }
  };

  // S& NUEVO: Abrir edición de actividad inline
  const abrirModalEdicion = (actividad: Actividad, rolNumero: number) => {
    setFormularioEdicion({
      nombre: actividad.nombre || '',
      descripcion: actividad.descripcion || '',
      control: actividad.control || '',
      evaluacion: actividad.evaluacion || '',
      seguimiento: actividad.seguimiento || '',
      fechaInicio: actividad.fechaInicio || '',
      fechaFin: actividad.fechaFin || '',
      tareas: actividad.tareasSeguimiento || [],
      puntosControl: actividad.puntosControl || [],
      frecuenciaPuntosControl: actividad.frecuenciaPuntosControl || 'trimestral',
      fechaCorte: (actividad.puntosControl && actividad.puntosControl.length > 0) ? actividad.puntosControl[actividad.puntosControl.length - 1].fechaProgramada : (actividad.fechaFin || '')
    });
    setModalEdicion({ visible: true, rolNumero, actividad });
    setActividadExpandida(actividad.id || null);
    setModoCardExpandida('edicion');
  };

  // S& NUEVO: Guardar edición de actividad
  const guardarEdicionActividad = async () => {
    if (!modalEdicion) return;
    
    setGuardandoEdicion(true);
    try {
      const payload = {
        nombre: formularioEdicion.nombre,
        descripcion: formularioEdicion.descripcion,
        control: formularioEdicion.control,
        evaluacion: formularioEdicion.evaluacion,
        seguimiento: formularioEdicion.seguimiento,
        fecha_inicio: formularioEdicion.fechaInicio,
        fecha_fin: formularioEdicion.fechaFin,
        tareas_seguimiento: formularioEdicion.tareas,
        puntos_control: formularioEdicion.puntosControl,
        frecuencia_puntos_control: formularioEdicion.frecuenciaPuntosControl
      };
      
      console.log('S️ [guardarEdicionActividad] Guardando:', payload);
      const res = await actividadesApi.update(String(modalEdicion.actividad.id), payload as any);
      
      if (res.success) {
        // Actualizar estado local
        const planActualizado = {
          ...plan,
          roles: plan.roles.map(rol => {
            if (rol.numero === modalEdicion.rolNumero) {
              return {
                ...rol,
                actividades: rol.actividades.map(act => 
                  act.id === modalEdicion.actividad.id 
                    ? { 
                        ...act, 
                        nombre: formularioEdicion.nombre,
                        descripcion: formularioEdicion.descripcion,
                        control: formularioEdicion.control,
                        evaluacion: formularioEdicion.evaluacion,
                        seguimiento: formularioEdicion.seguimiento,
                        fechaInicio: formularioEdicion.fechaInicio,
                        fechaFin: formularioEdicion.fechaFin,
                        tareasSeguimiento: formularioEdicion.tareas,
                        puntosControl: formularioEdicion.puntosControl,
                        frecuenciaPuntosControl: formularioEdicion.frecuenciaPuntosControl
                      } 
                    : act
                )
              };
            }
            return rol;
          })
        };
        onActualizar(planActualizado);
        toast.success('Actividad actualizada', { description: 'Los cambios se guardaron correctamente' });
        setModalEdicion(null);
        setModoCardExpandida('seguimiento');
        onRefetchPlan?.();
      } else {
        toast.error('Error al guardar', { description: res.error || 'No se pudieron guardar los cambios' });
      }
    } catch (error) {
      console.error('Error guardando edición:', error);
      toast.error('Error', { description: 'No se pudo guardar la edición' });
    } finally {
      setGuardandoEdicion(false);
    }
  };

  // Handler para confirmar acción desde modal
  const confirmarAccionActividad = () => {
    console.log('S& confirmarAccionActividad llamado, modalConfirmacion:', modalConfirmacion);
    if (!modalConfirmacion) return;
    
    if (modalConfirmacion.tipo === 'desactivar') {
      desactivarActividad(modalConfirmacion.rolNumero, modalConfirmacion.actividadId);
    } else {
      reactivarActividad(modalConfirmacion.rolNumero, modalConfirmacion.actividadId);
    }
    setModalConfirmacion(null);
  };

  const agregarObservacion = (rolNumero: number, actividadId: number | string) => {
    if (!nuevaObservacion.trim()) {
      toast.error('Observación vacía', { description: 'Debes escribir una observación' });
      return;
    }

    const nuevaObs: ObservacionCumplimiento = {
      id: `obs-${Date.now()}`,
      texto: nuevaObservacion.trim(),
      fechaRegistro: new Date().toISOString(),
      registradoPor: plan.jefeOCI.nombre
    };

    const planActualizado = {
      ...plan,
      roles: plan.roles.map(rol => {
        if (rol.numero === rolNumero) {
          return {
            ...rol,
            actividades: rol.actividades.map(act => {
              if (act.id === actividadId) {
                const obsActuales = Array.isArray(act.observacionesCumplimiento) 
                  ? act.observacionesCumplimiento 
                  : [];
                return { 
                  ...act,
                  observacionesCumplimiento: [
                    ...obsActuales,
                    nuevaObs
                  ]
                };
              }
              return act;
            })
          };
        }
        return rol;
      })
    };

    onActualizar(planActualizado);
    setNuevaObservacion('');
    toast.success('Observación agregada', { description: 'Se registró exitosamente' });
  };

  const eliminarObservacion = (rolNumero: number, actividadId: number | string, observacionId: string) => {
    const planActualizado = {
      ...plan,
      roles: plan.roles.map(rol => {
        if (rol.numero === rolNumero) {
          return {
            ...rol,
            actividades: rol.actividades.map(act => {
              if (act.id === actividadId) {
                const obsActuales = Array.isArray(act.observacionesCumplimiento) 
                  ? act.observacionesCumplimiento 
                  : [];
                return { 
                  ...act,
                  observacionesCumplimiento: obsActuales.filter((obs: ObservacionCumplimiento) => obs.id !== observacionId)
                };
              }
              return act;
            })
          };
        }
        return rol;
      })
    };

    onActualizar(planActualizado);
    toast.success('Observación eliminada');
  };

  const agregarResponsableApoyo = (rolNumero: number, actividadId: number | string, auditor: Auditor) => {
    const planActualizado = {
      ...plan,
      roles: plan.roles.map(rol => {
        if (rol.numero === rolNumero) {
          return {
            ...rol,
            actividades: rol.actividades.map(act => {
              if (act.id === actividadId) {
                const apoyoExiste = (act.responsablesApoyo || []).some(r => r.id === auditor.id);
                const esPrincipal = act.responsable?.id === auditor.id;
                
                if (apoyoExiste || esPrincipal) {
                  toast.error('Responsable ya asignado', { 
                    description: esPrincipal ? 'Ya es el responsable principal' : 'Ya está en el equipo de apoyo'
                  });
                  return act;
                }
                
                return { 
                  ...act,
                  responsablesApoyo: [
                    ...(act.responsablesApoyo || []),
                    auditor
                  ]
                };
              }
              return act;
            })
          };
        }
        return rol;
      })
    };

    onActualizar(planActualizado);
    setMostrarSelectorApoyo(false);
    toast.success('Responsable de apoyo agregado', { description: `${auditor.nombre} se agregó al equipo` });
  };

  const eliminarResponsableApoyo = (rolNumero: number, actividadId: number | string, auditorId: string) => {
    const planActualizado = {
      ...plan,
      roles: plan.roles.map(rol => {
        if (rol.numero === rolNumero) {
          return {
            ...rol,
            actividades: rol.actividades.map(act => {
              if (act.id === actividadId) {
                return { 
                  ...act,
                  responsablesApoyo: (act.responsablesApoyo || []).filter(r => r.id !== auditorId)
                };
              }
              return act;
            })
          };
        }
        return rol;
      })
    };

    onActualizar(planActualizado);
    toast.success('Responsable de apoyo eliminado');
  };

  const claveFormCorte = (actividadId: number | string, puntoControlId: string) =>
    `${actividadId}:${puntoControlId}`;

  const registrarEntradaCorte = async (
    rolNumero: number,
    actividadId: number | string,
    puntoControlId: string,
    datos: {
      texto: string;
      tipo?: 'seguimiento' | 'hallazgo' | 'cierre';
      archivos?: EntradaSeguimiento['archivos'];
    },
  ) => {
    const texto = datos.texto.trim();
    const tieneArchivos = (datos.archivos?.length ?? 0) > 0;
    if (!texto && !tieneArchivos) {
      toast.error('Registro requerido', {
        description: 'Escribe una observación o adjunta al menos un archivo para cerrar el corte.',
      });
      return false;
    }

    const actividadActual = plan.roles
      .find((r) => r.numero === rolNumero)
      ?.actividades.find((a) => a.id === actividadId);

    if (!actividadActual) {
      toast.error('Actividad no encontrada');
      return false;
    }

    setGuardandoEntrada(true);
    try {
      const nombreUsuarioActual =
        currentUser?.nombre || currentUser?.nombre_completo || plan.jefeOCI?.nombre || 'Usuario';
      const nuevaEntrada: EntradaSeguimiento = {
        id: crypto.randomUUID(),
        puntoControlId,
        fechaRegistro: new Date().toISOString().split('T')[0],
        registradoPor: nombreUsuarioActual,
        usuarioId: currentUser?.id || currentUser?.userId || plan.jefeOCI?.id,
        texto: texto || 'Evidencia adjunta al corte',
        tipo: datos.tipo || 'seguimiento',
        ...(tieneArchivos ? { archivos: datos.archivos } : {}),
      };

      const entradasActualizadas = [...(actividadActual.entradasSeguimiento || []), nuevaEntrada];
      const actividadConEntradas = {
        ...actividadActual,
        entradasSeguimiento: entradasActualizadas,
      } as Actividad;
      let nuevoPct = calcularPorcentajeCortes(actividadConEntradas) ?? actividadActual.porcentajeAvance ?? 0;

      let nuevoEstado: EstadoActividad = estadoActividadDesdePorcentaje(nuevoPct);
      if (
        nuevoPct >= 100 &&
        actividadActual.requiereAutorizacionJefeOCI &&
        !actividadActual.autorizadaPorJefeOCI
      ) {
        nuevoPct = 99;
        nuevoEstado = 'EN_EJECUCION';
      }

      const evaluacionTexto = textoEvaluacionDesdeAvance(nuevoPct, 'cortes');
      const estadoBackend = estadoBackendDesdePorcentaje(nuevoPct);

      const response = await actividadesApi.update(String(actividadId), {
        entradas_seguimiento: entradasActualizadas,
        porcentaje_avance: nuevoPct,
        evaluacion: evaluacionTexto,
        estado: estadoBackend as any,
      });

      if (!response.success) {
        toast.error('Error al guardar', { description: response.error || 'No se pudo guardar la entrada.' });
        return false;
      }

      const planActualizado = {
        ...plan,
        roles: plan.roles.map((rol) => {
          if (rol.numero === rolNumero) {
            return {
              ...rol,
              actividades: rol.actividades.map((act) => {
                if (act.id === actividadId) {
                  return {
                    ...act,
                    entradasSeguimiento: entradasActualizadas,
                    porcentajeAvance: nuevoPct,
                    evaluacion: evaluacionTexto,
                    estado: nuevoEstado,
                  };
                }
                return act;
              }),
            };
          }
          return rol;
        }),
      };
      onActualizar(planActualizado);
      setCorteConFormAbierto(null);
      setModalEntradaCorte(null);
      setFormEntrada({ texto: '', tipo: 'seguimiento' });
      toast.success('Corte registrado', {
        description: `Avance actualizado a ${nuevoPct}% según cortes de seguimiento.`,
      });
      try {
        await onRefetchPlan?.();
      } catch {
        /* opcional */
      }
      return true;
    } catch (e: any) {
      toast.error('Error inesperado', { description: e?.message || 'Intenta de nuevo.' });
      return false;
    } finally {
      setGuardandoEntrada(false);
    }
  };

  const agregarEntrada = async (
    rolNumero: number,
    actividadId: number | string,
    puntoControlId: string,
  ) => {
    await registrarEntradaCorte(rolNumero, actividadId, puntoControlId, {
      texto: formEntrada.texto,
      tipo: formEntrada.tipo,
    });
  };

  const guardarEntradaCorteDesdeModal = async (
    adjuntos: ArchivoAdjunto[],
    observacionesRaw: string,
  ) => {
    if (!modalEntradaCorte) return;
    const { rolNumero, actividadId, puntoControlId } = modalEntradaCorte;

    let parsed: Array<{ id?: string; texto?: string }> = [];
    try {
      const p = JSON.parse(observacionesRaw);
      if (Array.isArray(p)) parsed = p;
    } catch {
      if (observacionesRaw.trim()) parsed = [{ id: 'obs-legacy', texto: observacionesRaw.trim() }];
    }

    const archivos = adjuntos
      .filter((a) => a.id.startsWith('adj-'))
      .filter((a) => !a.puntoControlId || a.puntoControlId === puntoControlId)
      .map((a) => ({
        nombre: a.nombre,
        url: a.url,
        tipo: a.tipo,
        tamanio: a.tamaño,
      }));

    if (archivos.length === 0) {
      toast.error('Sube al menos un archivo');
      return;
    }

    await registrarEntradaCorte(rolNumero, actividadId, puntoControlId, {
      texto: '',
      tipo: 'seguimiento',
      archivos,
    });
  };

  const guardarSeguimiento = async (rolNumero: number, actividadId: number | string) => {
    const actividadActual = plan.roles
      .find(r => r.numero === rolNumero)
      ?.actividades.find(a => a.id === actividadId);

    if (
      formulario.porcentaje === 100 && 
      actividadActual?.requiereAutorizacionJefeOCI && 
      !actividadActual?.autorizadaPorJefeOCI
    ) {
      toast.error('Autorización requerida', { 
        description: 'Esta actividad requiere autorización del Jefe OCI antes de completarse al 100%' 
      });
      return;
    }

    // Si tiene cortes configurados, el % se calcula automáticamente; si no, conservar el actual
    const pctCortes = actividadActual ? calcularPorcentajeCortes(actividadActual) : null;
    const avanceCalc = actividadActual
      ? calcularAvanceActividad(actividadActual)
      : { porcentaje: 0, fuente: 'manual' as const, etiqueta: '', desglose: {}, puedePersistirDesdeFront: true };
    const pctFinal = pctCortes !== null ? pctCortes : avanceCalc.porcentaje;

    const nuevoEstado: EstadoActividad = 
      pctFinal === 100 ? 'COMPLETADA' :
      pctFinal > 0 ? 'EN_EJECUCION' :
      'PENDIENTE';

    // Mapear estado del frontend al formato del backend
    const estadoBackend = 
      nuevoEstado === 'COMPLETADA' ? 'completada' :
      nuevoEstado === 'EN_EJECUCION' ? 'en-progreso' :
      'pendiente';

    setGuardando(true);
    
    try {
      // Preparar payload - Backend espera estos campos exactos
      const payload = {
        estado: estadoBackend as any,
        porcentaje_avance: pctFinal,
        control: formulario.control,
        evaluacion: formulario.evaluacion,
        seguimiento: formulario.seguimiento,
        ...(actividadActual?.entradasSeguimiento ? { entradas_seguimiento: actividadActual.entradasSeguimiento } : {})
      };
      
      console.log('[GUARDAR] Payload:', payload);
      
      const response = await actividadesApi.update(String(actividadId), payload);
      
      console.log('[GUARDAR] Respuesta backend:', response);
      
      if (!response.success) {
        const errorMsg = response.error || 'No se pudo actualizar la actividad';
        toast.error('No se puede completar', { 
          description: errorMsg,
          duration: 6000 
        });
        setGuardando(false);
        return;
      }
    } catch (error: any) {
      console.error('[GUARDAR] Error al guardar en backend:', error);
      const errorMsg = error?.response?.data?.message || error?.message || 'Error al guardar el seguimiento';
      toast.error('Error al guardar', { 
        description: errorMsg,
        duration: 6000 
      });
      setGuardando(false);
      return;
    }

    const planActualizado = {
      ...plan,
      roles: plan.roles.map(rol => {
        if (rol.numero === rolNumero) {
          return {
            ...rol,
            actividades: rol.actividades.map(act => {
              if (act.id === actividadId) {
                return { 
                  ...act,
                  control: formulario.control,
                  evaluacion: formulario.evaluacion,
                  seguimiento: formulario.seguimiento,
                  porcentajeAvance: pctFinal,
                  estado: nuevoEstado
                };
              }
              return act;
            })
          };
        }
        return rol;
      })
    };
    
    onActualizar(planActualizado);
    setGuardando(false);
    toast.success('Seguimiento registrado', { description: 'Información actualizada correctamente' });
    setActividadExpandida(null);
    setNuevaObservacion('');
    setMostrarSelectorApoyo(false);
    // Recargar plan desde backend para que adjuntos y datos queden sincronizados
    try {
      await onRefetchPlan?.();
    } catch (e) {
      console.warn('[SeccionGestionYSeguimiento] Error al recargar plan tras guardar:', e);
    }
  };

  const renderBotonToggleRoles = () => {
    const todosColapsados = plan.roles.length > 0 && plan.roles.every(r => rolesColapsados[r.numero] === true);
    return (
      <button
        onClick={() => toggleTodosRoles(!todosColapsados)}
        className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-md font-semibold text-xs flex items-center gap-2 transition-all shadow-sm"
      >
        {todosColapsados ? (
          <>
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            Expandir todos los roles
          </>
        ) : (
          <>
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
            Colapsar todos los roles
          </>
        )}
      </button>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
          PARTE 1: CONTEXTO DEL PLAN
          """""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""" */}
      

      {/* Información general - RESPONSIVE GRID */}
      <div className="bg-white rounded-xl border-2 border-gray-200 p-6 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
          Información general
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-gray-600 mb-1">Vigencia</p>
            <p className="text-2xl font-bold text-gray-900">{plan.vigencia}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Versión</p>
            <p className="text-2xl font-bold text-gray-900">V{plan.version}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Jefe responsable</p>
            <p className="font-semibold text-gray-900">{plan.jefeOCI.nombre}</p>
            <p className="text-sm text-gray-600">{plan.jefeOCI.cargo}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Fecha de creación</p>
            <p className="font-semibold text-gray-900">
              {new Date(plan.fechaCreacion).toLocaleDateString('es-CO', { 
                day: '2-digit', 
                month: 'long', 
                year: 'numeric' 
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Alertas y recomendaciones (Colapsable para ahorrar espacio) */}
      <details className="bg-blue-50 border border-blue-200 rounded-lg overflow-hidden group mb-6 [&_summary::-webkit-details-marker]:hidden">
        <summary className="flex items-center justify-between p-3 cursor-pointer hover:bg-blue-100/50 transition-colors select-none">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <h3 className="font-semibold text-blue-900 text-sm m-0">
              {plan.estado === 'BORRADOR' ? 'Instrucciones: Modo Borrador' : 'Información y Gestión del Plan'}
            </h3>
          </div>
          <div className="flex items-center gap-3">
             <span className="text-[10px] font-mono text-blue-400 opacity-70">ID: {plan.id}</span>
             <svg className="w-4 h-4 text-blue-600 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </div>
        </summary>
        
        <div className="px-4 pb-4 pt-2 border-t border-blue-100 bg-white/40">
          <p className="text-xs text-blue-800 mb-3 leading-relaxed">
            {plan.estado === 'BORRADOR'
              ? 'Tu plan está en Borrador. Asegúrate de desplegar los roles, asignar responsables y definir la periodicidad (fechas y cortes) antes de solicitar su aprobación para iniciar ejecución.'
              : 'Estás visualizando un plan en ejecución. Este sistema permite gestionar el plan completo, asignar responsables, hacer seguimiento y aprobar actividades.'}
          </p>
          <div className="flex flex-wrap gap-3">
            <div className="bg-white border border-blue-200 shadow-sm rounded-md p-2 inline-flex items-start gap-1.5 flex-1 min-w-[250px]">
              <span className="text-sm leading-none">✓</span>
              <p className="text-[10px] text-blue-800 leading-tight">
                <strong>Cumplimiento Normativo:</strong> Estructura obligatoria del Decreto 648 de 2017 empleando 5 roles estratégicos fijos.
              </p>
            </div>
            <div className="bg-white border border-blue-200 shadow-sm rounded-md p-2 inline-flex items-start gap-1.5 flex-1 min-w-[250px]">
              <span className="text-sm leading-none">ℹ️</span>
              <p className="text-[10px] text-blue-800 leading-tight">
                 <strong>Sistema Automático:</strong> El porcentaje de avance se calcula automáticamente conforme a las evidencias y cortes.
              </p>
            </div>
          </div>
        </div>
      </details>

      {/* Planes registrados (historial + plan actual) */}
      {planesEnHistorial.length > 0 && (
        <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
          {hayBorradoresEnLista && !puedeEliminarPlan && (
            <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
              Hay planes en borrador, pero tu usuario no tiene permiso <code className="text-[10px]">control-interno.plan-anual.delete</code> ni <code className="text-[10px]">.edit</code>. Pide al administrador que te asigne uno de esos permisos para ver el botón eliminar.
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between mb-4 gap-4">
            <div>
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-600" />
                Planes registrados
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                El plan que estás viendo está marcado. Cada fila en <strong>borrador</strong> puede eliminarse (verificación OTP por correo).
                {historialColapsado && hayBorradoresEnLista && (
                  <span className="block mt-1 text-amber-700 font-medium">Expande el historial para ver el botón eliminar.</span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-sm text-gray-500 font-medium">{planesEnHistorial.length} plan(es)</span>
              <button
                onClick={() => setHistorialColapsado(!historialColapsado)}
                className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-md font-semibold text-xs flex items-center gap-2 transition-all shadow-sm"
              >
                {historialColapsado ? (
                  <>
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    Expandir historial
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                    Colapsar historial
                  </>
                )}
              </button>
            </div>
          </div>
          
          {!historialColapsado && (
          <div className="space-y-3">
            {planesEnHistorial.map((planAnterior) => {
              const esPlanActual = planAnterior.id === plan.id;
              const puedeEliminarEste =
                esEstadoPlanBorrador(planAnterior.estado)
                && puedeEliminarPlan
                && !!onSolicitarEliminarPlan;
              return (
              <div 
                key={planAnterior.id}
                className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                  esPlanActual
                    ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-200'
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    esPlanActual
                      ? 'bg-gradient-to-br from-blue-600 to-blue-700'
                      : 'bg-gradient-to-br from-gray-500 to-gray-600'
                  }`}>
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 flex flex-wrap items-center gap-2">
                      <span>{(planAnterior as any).nombrePlan || `Plan Anual de Auditoría ${planAnterior.vigencia}`}</span>
                      {esPlanActual && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-600 text-white">
                          Viendo ahora
                        </span>
                      )}
                    </h4>
                    <p className="text-sm text-gray-600">
                      Vigencia {planAnterior.vigencia} • Jefe OCI: {planAnterior.jefeOCI?.nombre || '—'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    planAnterior.estado === 'BORRADOR' || planAnterior.estado === 'EN_REVISION'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {esEstadoPlanBorrador(planAnterior.estado) ? 'Borrador' : planAnterior.estado === 'EN_REVISION' ? 'En revisión' : planAnterior.estado}
                  </span>
                  <div className="text-right text-xs text-gray-500">
                    <p>Aprobado: {planAnterior.fechaAprobacion || 'N/A'}</p>
                    <p>{obtenerTotalActividadesPlanAnterior(planAnterior)} actividades</p>
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0">
                    {onVerDefinicionPlan && puedeVerPlan && planAnterior.id !== plan.id && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onVerDefinicionPlan(planAnterior);
                        }}
                        className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg transition-colors flex items-center justify-center border border-gray-200"
                        title="Ver el plan en el asistente (pasos 1 a 3, solo consulta — igual que editar pero sin cambiar vigencia ni datos)"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                    {esEstadoPlanBorrador(planAnterior.estado) && onEditarPlan && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onEditarPlan(planAnterior); }}
                        className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors flex items-center justify-center group"
                        title="Editar plan en formato de creación"
                      >
                        <Edit3 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                      </button>
                    )}
                    {puedeEliminarEste && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSolicitarEliminarPlan!(planAnterior);
                        }}
                        className="p-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition-colors flex items-center justify-center border border-red-200"
                        title="Eliminar este plan en borrador (verificación por correo)"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
            })}
          </div>
          )}
        </div>
      )}

      {/* """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
          GESTIN Y SEGUIMIENTO POR ROL
          Vista unificada: estadísticas + seguimiento detallado
          """""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""" */}
      
      {plan.estado === 'BORRADOR' || plan.estado === 'EN_REVISION' ? (
        <div className="bg-amber-50 border-2 border-amber-200 border-dashed rounded-xl p-8 text-center mt-6">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-amber-900 mb-2">Módulo de Seguimiento Inactivo</h3>
          <p className="text-amber-800 max-w-2xl mx-auto">
            Esta sección es exclusiva para realizar el seguimiento de las actividades de auditoría. 
            Actualmente el plan se encuentra en estado <strong>{plan.estado}</strong>. Para configurar los roles y actividades, utiliza el botón de edición (el lápiz azul) en el historial de arriba.
          </p>
        </div>
      ) : (
        <>
          {/* S& NUEVO: Botones de control global reubicados en 1 solo botón para ahorrar espacio */}
          {planesAnteriores.length === 0 && (
            <div className="flex justify-end mb-2">
              {renderBotonToggleRoles()}
            </div>
          )}

          {/* Lista de roles y actividades con seguimiento */}
          {[...plan.roles].sort((a, b) => a.numero - b.numero).map((rol) => {
        // Solo contar actividades activas (activo !== false) para estadísticas
        const actividadesActivas = rol.actividades.filter(a => a.activo !== false);

        // S& DEFINIR SI EL USUARIO PUEDE VER TODO EL PLAN
        const liderazgoVerTodos = puedeAprobarPlan || esSuperUsuario || puedeEditarPlan || puedeAsignarActividades;

        // S& FILTRAR ACTIVIDADES PARA QUE EL AUDITOR SOLO VEA LAS PROPIAS
        const actividadesVisibles = actividadesActivas.filter(actividad => {
          if (liderazgoVerTodos) return true; // Líderes o planificadores ven todo
          
          // Leer datos del usuario - usar fallback si currentUser no tiene campos de identidad
          const hasIdentity = currentUser?.nombre || currentUser?.email || currentUser?.nombres;
          const user = hasIdentity ? currentUser : (() => {
            try {
              const u = (window as any).__esap_auth_cache;
              if (!u) return currentUser;
              return {
                ...(currentUser || {}),
                ...u,
                nombre: u?.person?.first_name ? `${u.person.first_name} ${u.person.last_name || ''}`.trim() : u?.fullName || u?.name || u?.username || u?.nombre || '',
                email: u?.person?.email || u?.email || '',
                idPerson: u?.person?.id || u?.idPerson || currentUser?.idPerson,
              };
            } catch (_e) { return currentUser; }
          })();
          if (!user) return false;
          
          const currentName = user.nombre || user.nombres || user.name || '';
          const currentEmail = user.email || user.correo || '';
          // Recopilar todos los posibles IDs del usuario actual
          const possibleIds = [
            user.id, user.idPerson, user.idPersona, 
            user.documento, user.sub, user.userId
          ].filter(Boolean).map(String);

          // Función helper para comparar identidad (acepta objeto O string)
          const matchesUser = (r: any) => {
            if (!r) return false;
            // Si r es un string directo (nombre), comparar por palabras
            if (typeof r === 'string') {
              if (!currentName) return false;
              const rWords = r.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2);
              const cWords = currentName.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2);
              const shorterWords = cWords.length <= rWords.length ? cWords : rWords;
              const longerName = cWords.length <= rWords.length ? r.toLowerCase() : currentName.toLowerCase();
              return shorterWords.length > 0 && shorterWords.every((w: string) => longerName.includes(w));
            }
            // Comparar por ID
            if (r.id && possibleIds.includes(String(r.id))) return true;
            // Comparar por email
            if (r.email && currentEmail && r.email.toLowerCase() === currentEmail.toLowerCase()) return true;
            // Comparar por nombre (basado en palabras)
            const rName = r.nombre || r.name || r.fullName || '';
            if (rName && currentName) {
              const rWords = rName.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2);
              const cWords = currentName.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2);
              const shorterWords = cWords.length <= rWords.length ? cWords : rWords;
              const longerName = cWords.length <= rWords.length ? rName.toLowerCase() : currentName.toLowerCase();
              if (shorterWords.length > 0 && shorterWords.every((w: string) => longerName.includes(w))) return true;
            }
            return false;
          };

          const isMainResp = matchesUser(actividad.responsable);
          const isRespAdicional = actividad.responsables?.some(matchesUser);
          const isApoyo = actividad.responsablesApoyo?.some(matchesUser);
          // También verificar si el usuario es responsable del ROL (hereda visibilidad)
          const isRolResp = (rol as any).responsables?.some(matchesUser);

          return isMainResp || isRespAdicional || isApoyo || isRolResp;
        });

        // Diagnóstico de matching (solo primer rol, primera actividad)
        if (rol.numero === 1 && !liderazgoVerTodos && actividadesActivas.length > 0) {
          const a0 = actividadesActivas[0];
          const r = a0.responsable;
          console.log('x [MATCH-DEBUG] responsable.id=' + (r?.id || 'null') + 
            ' | responsable.nombre=' + (r?.nombre || r?.name || (typeof r === 'string' ? r : 'null')) +
            ' | responsable.email=' + (r?.email || 'null') +
            ' | responsables[0]=' + JSON.stringify(a0.responsables?.[0] || null) +
            ' | rolResp=' + JSON.stringify((rol as any).responsables?.[0] || null) +
            ' | currentUser.nombre=' + (currentUser?.nombre || 'null') +
            ' | currentUser.email=' + (currentUser?.email || 'null') +
            ' | currentUser.ids=' + JSON.stringify([currentUser?.id, currentUser?.idPerson, currentUser?.sub].filter(Boolean)) +
            ' | visibles=' + actividadesVisibles.length + '/' + actividadesActivas.length);
        }

        // Si el usuario no tiene capacidad de gestión/análisis y no tiene actividades en este rol, lo ocultamos
        if (!liderazgoVerTodos && actividadesVisibles.length === 0) {
           return null;
        }

        const totalActividades = actividadesVisibles.length;
        const asignadas = actividadesVisibles.filter(a => a.responsable !== null).length;
        const completadas = actividadesVisibles.filter(a => a.estado === 'COMPLETADA').length;
        const enProgreso = actividadesVisibles.filter(a => a.estado === 'EN_EJECUCION').length;
        const avance = calcularAvancePromedioActividades(actividadesVisibles, opcionesCalculoAvance);
        const estaColapsado = rolesColapsados[rol.numero] || false;
        const isExpanded = rolExpandido === rol.numero;
        
        return (
          <div key={rol.numero} className="bg-white rounded-xl border-2 border-gray-200 p-6">
            {/* Header del rol - Clickeable para expandir/colapsar */}
            <div 
              className="flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setRolExpandido(isExpanded ? null : rol.numero)}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl" style={{ backgroundColor: rol.color + '20' }}>
                  {rol.icono}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Rol {rol.numero}: {rol.nombre}</h3>
                  <p className="text-sm text-gray-600">
                    {rol.actividades.length} actividades{(() => {
                      const totalTareas = rol.actividades.reduce((sum: number, a: any) => sum + (a.tareasSeguimiento?.length || 0), 0);
                      return totalTareas > 0 ? ` • ${totalTareas} tareas` : '';
                    })()} • {asignadas} asignadas • {rol.actividades.length - asignadas} pendientes
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {/* x Responsable(s) del rol */}
                {(() => {
                  const responsablesRol = (rol as any).responsables?.length > 0
                    ? (rol as any).responsables
                    : null;
                  if (responsablesRol) {
                    return (
                      <div className="hidden sm:flex items-center gap-1.5">
                        {responsablesRol.slice(0, 2).map((r: any, i: number) => (
                          <span key={r.id || i} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium border border-blue-200">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            {r.nombre || r}
                          </span>
                        ))}
                        {responsablesRol.length > 2 && (
                          <span className="text-xs text-blue-500 font-medium">+{responsablesRol.length - 2}</span>
                        )}
                      </div>
                    );
                  }
                  // Fallback: mostrar Jefe OCI del plan
                  if (plan.jefeOCI?.nombre) {
                    return (
                      <span className="hidden sm:inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium border border-gray-200">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        {plan.jefeOCI.nombre}
                        <span className="text-[9px] text-gray-400 ml-0.5">OCI</span>
                      </span>
                    );
                  }
                  return null;
                })()}
                <span className="px-3 py-1 rounded-lg text-sm font-semibold" style={{ 
                  backgroundColor: rol.color + '20', 
                  color: rol.color 
                }}>
                  {Math.round((asignadas / (rol.actividades.length || 1)) * 100)}% asignado
                </span>
                <span
                  className="px-3 py-1 rounded-lg text-sm font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200"
                  title="Promedio de cumplimiento de actividades visibles"
                >
                  {avance}% cumplimiento
                </span>
                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </motion.div>
              </div>
            </div>

            {/* Lista de actividades - Expandible */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="px-6 pb-6 pt-2 space-y-3 border-t-2 border-gray-200">
                    {rol.actividades.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        No hay actividades en este rol.{plan.estado === 'BORRADOR' ? ' Haz clic en "Agregar actividad" para crear una.' : ''}
                      </div>
                    ) : (
                      rol.actividades.map((actividad, index) => {
                        const avanceActividad = calcularAvanceActividad(actividad, opcionesCalculoAvance);
                        const resumenTareas = resumenEvidenciasObservacionesTareas(actividad);
                        const evaluacionNotaLibre =
                          actividad.evaluacion &&
                          !/^\d+\s*%/.test(actividad.evaluacion.trim())
                            ? actividad.evaluacion
                            : null;
                        return (
                        <div 
                          key={`${rol.numero}-${index}-${actividad.id}`} 
                          style={{ contentVisibility: 'auto', containIntrinsicSize: '150px' }}
                          className={`p-4 border-2 rounded-lg transition-colors ${actividad.activo === false ? 'border-red-200 bg-red-50/30 opacity-60' : 'border-gray-200 hover:border-gray-300'}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600">
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className={`font-semibold ${actividad.activo === false ? 'text-gray-500 line-through' : 'text-gray-900'}`}>{actividad.nombre}</p>
                                {actividad.activo === false && (
                                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700 border border-red-300">
                                    Inactiva
                                  </span>
                                )}
                                {/* Badge de estado */}
                                {actividad.estado && actividad.estado !== 'PENDIENTE' && (
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                    actividad.estado === 'COMPLETADA' ? 'bg-green-100 text-green-700' :
                                    actividad.estado === 'EN_EJECUCION' ? 'bg-blue-100 text-blue-700' :
                                    'bg-gray-100 text-gray-600'
                                  }`}>
                                    {actividad.estado === 'COMPLETADA' ? 'Completada' : actividad.estado === 'EN_EJECUCION' ? 'En ejecución' : actividad.estado}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 mb-2">{actividad.descripcion}</p>
                              <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                                <span>📅 Inicio: {new Date(actividad.fechaInicio).toLocaleDateString('es-CO')}</span>
                                {actividad.fechaFin && (
                                  <span>📅 Fin: {new Date(actividad.fechaFin).toLocaleDateString('es-CO')}</span>
                                )}
                                {actividad.fecha_corte && (
                                  <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full font-medium">📅 Corte: {new Date(actividad.fecha_corte + 'T00:00:00').toLocaleDateString('es-CO')}</span>
                                )}
                              </div>
                              <div className="mt-2 max-w-md">
                                <SemaforoSeguimientoPAI
                                  porcentaje={avanceActividad.porcentaje}
                                  variant="bar"
                                  size="sm"
                                  showLabel
                                  showIcon
                                />
                                <p className="text-[10px] text-gray-500 mt-1 leading-snug" title="Origen del porcentaje de cumplimiento">
                                  {avanceActividad.etiqueta}
                                </p>
                                {avanceActividad.fuente === 'auditorias' && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRefrescarCumplimiento();
                                    }}
                                    className="mt-1 text-[10px] font-semibold text-purple-700 hover:text-purple-900 underline"
                                  >
                                    Sincronizar con programa de auditorías
                                  </button>
                                )}
                              </div>
                              {/* Resumen evidencias/observaciones (en tareas del plan) */}
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                                    resumenTareas.totalEvidenciasTareas > 0
                                      ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                      : 'bg-gray-50 text-gray-400 border border-dashed border-gray-300'
                                  }`}
                                  title="Evidencias subidas en las tareas de cada corte"
                                >
                                  <Paperclip className="w-3 h-3" />
                                  {resumenTareas.totalEvidenciasTareas > 0
                                    ? `${resumenTareas.totalEvidenciasTareas} evidencia${resumenTareas.totalEvidenciasTareas !== 1 ? 's' : ''} en tareas`
                                    : 'Sin evidencias en tareas'}
                                </span>
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                                    resumenTareas.tareasConObservacion > 0
                                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                      : 'bg-gray-50 text-gray-400 border border-dashed border-gray-300'
                                  }`}
                                  title="Observaciones escritas en las tareas"
                                >
                                  <FileText className="w-3 h-3" />
                                  {resumenTareas.tareasConObservacion > 0
                                    ? `Observaciones en ${resumenTareas.tareasConObservacion} tarea${resumenTareas.tareasConObservacion !== 1 ? 's' : ''}`
                                    : 'Sin observaciones en tareas'}
                                </span>
                                {/* S& Tareas */}
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                                  actividad.tareasSeguimiento && actividad.tareasSeguimiento.length > 0 
                                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' 
                                    : 'bg-gray-50 text-gray-400 border border-dashed border-gray-300'
                                }`}>
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                                  {actividad.tareasSeguimiento && actividad.tareasSeguimiento.length > 0 
                                    ? `${actividad.tareasSeguimiento.filter(t => t.completada).length}/${actividad.tareasSeguimiento.length} tareas`
                                    : 'Sin tareas'}
                                </span>
                              </div>
                            </div>
                            {/* Responsables: editable SOLO en BORRADOR */}
                            {(() => {
                              // Normalizar responsables de actividad para soportar:
                              // - actividad.responsables: Auditor[]
                              // - actividad.responsable: Auditor | string (nombre legacy)
                              const responsablesActividadRaw = actividad.responsables?.length
                                ? actividad.responsables
                                : (actividad.responsable ? [actividad.responsable as any] : []);
                              const responsablesActividadNormalizados = (responsablesActividadRaw || [])
                                .map((resp: any, idx: number) => {
                                  if (!resp) return null;
                                  if (typeof resp === 'string') {
                                    const nombre = resp.trim();
                                    if (!nombre) return null;
                                    return { id: `legacy-resp-${actividad.id}-${idx}`, nombre } as Auditor;
                                  }
                                  const nombre = (resp.nombre || resp.name || '').toString().trim();
                                  if (!nombre) return null;
                                  return {
                                    ...resp,
                                    id: resp.id || `legacy-resp-${actividad.id}-${idx}`,
                                    nombre
                                  } as Auditor;
                                })
                                .filter(Boolean)
                                .slice(0, 1) as Auditor[];

                              if (puedeAsignarActividades && plan.estado === 'BORRADOR') {
                                return (
                              <div className="flex flex-col gap-1.5 min-w-[220px]" onClick={(e) => e.stopPropagation()}>
                                {responsablesActividadNormalizados.map((resp) => (
                                  <div key={resp.id} className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-full px-3 py-1">
                                    <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                      {resp.nombre.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                                    </div>
                                    <span className="text-sm font-medium text-gray-900 whitespace-nowrap flex-1">{resp.nombre}</span>
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); quitarResponsableInline(rol.numero, actividad.id, resp.id); }}
                                      className="text-blue-400 hover:text-red-600 leading-none ml-0.5 flex-shrink-0"
                                      disabled={asignandoId === actividad.id}
                                    >×</button>
                                  </div>
                                ))}
                                <SelectorProfesional
                                  disabled={cargandoAuditores || asignandoId === actividad.id}
                                  auditores={auditores.filter(a => !responsablesActividadNormalizados.some(r => r.id === a.id))}
                                  onSelect={(id) => {
                                    if (!id) return;
                                    const auditor = auditores.find(a => a.id === id);
                                    if (auditor) asignarResponsableInline(rol.numero, actividad.id, auditor);
                                  }}
                                />
                              </div>
                                );
                              }
                              return (
                              <div className="flex flex-col gap-1.5 min-w-[180px]">
                                {responsablesActividadNormalizados.map((resp) => (
                                  <div key={resp.id} className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-full px-3 py-1">
                                    <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                      {resp.nombre.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                                    </div>
                                    <span className="text-sm font-medium text-gray-900 whitespace-nowrap">{resp.nombre}</span>
                                  </div>
                                ))}
                                {responsablesActividadNormalizados.length === 0 && (
                                  /* Fallback: mostrar responsable(s) del rol */
                                  (rol as any).responsables && (rol as any).responsables.length > 0 ? (
                                    <>
                                      {(rol as any).responsables.slice(0, 1).map((resp: Auditor) => (
                                        <div key={resp.id} className="flex items-center gap-1.5 bg-teal-50 border border-teal-200 rounded-full px-3 py-1">
                                          <div className="w-5 h-5 rounded-full bg-teal-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                            {resp.nombre.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                                          </div>
                                          <span className="text-sm font-medium text-gray-900 whitespace-nowrap">{resp.nombre}</span>
                                          <span className="text-[9px] bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded font-bold uppercase">Resp. del Rol</span>
                                        </div>
                                      ))}
                                    </>
                                  ) : (
                                    <span className="text-sm text-gray-400 italic">Sin asignar</span>
                                  )
                                )}
                              </div>
                              );
                            })()}
                          </div>

                          {/* "" DETALLES DE LA PROGRAMACIN Y OBSERVACIONES "" */}
                          <div className="mt-3 ml-11 space-y-3">
                            {/*  Detalles de la Programación del Plan Anual  */}
                            {(actividad.control || actividad.evaluacion || actividad.seguimiento) && (
                              <div className="border border-blue-200 rounded-lg overflow-hidden">
                                <div className="bg-blue-50 px-3 py-2 border-b border-blue-200">
                                  <p className="text-xs font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1.5">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                    Detalles de la Programación
                                  </p>
                                </div>
                                <div className="p-3 bg-white space-y-2">
                                  {actividad.control && (
                                    <div>
                                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Control</span>
                                      <p className="text-xs text-gray-800 leading-relaxed mt-0.5">{actividad.control}</p>
                                    </div>
                                  )}
                                  <div>
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Evaluación (cumplimiento)</span>
                                    <p className="text-sm font-semibold text-gray-800 mt-1">
                                      {avanceActividad.porcentaje}% cumplimiento
                                    </p>
                                    <p className="text-[10px] text-gray-500">{avanceActividad.etiqueta}</p>
                                    {evaluacionNotaLibre && (
                                      <p className="text-xs text-gray-700 leading-relaxed mt-1 border-t border-gray-100 pt-1">
                                        {evaluacionNotaLibre}
                                      </p>
                                    )}
                                  </div>
                                  {actividad.seguimiento && (
                                    <div>
                                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Seguimiento</span>
                                      <p className="text-xs text-gray-800 leading-relaxed mt-0.5">{actividad.seguimiento}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/*  Observaciones de Cumplimiento (texto completo)  */}
                            {(() => {
                              const obs = actividad.observacionesCumplimiento;
                              const obsArray: ObservacionCumplimiento[] = Array.isArray(obs) ? obs : (typeof obs === 'string' && obs.trim() ? [{ id: 'legacy', texto: obs, fechaRegistro: '', registradoPor: '' }] : []);
                              if (obsArray.length === 0) return null;
                              return (
                                <div className="border border-amber-200 rounded-lg overflow-hidden">
                                  <div className="bg-amber-50 px-3 py-2 border-b border-amber-200">
                                    <p className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
                                      Observaciones ({obsArray.length})
                                    </p>
                                  </div>
                                  <div className="p-3 bg-white space-y-2">
                                    {obsArray.map((ob, idx) => (
                                      <div key={ob.id || idx} className="flex gap-2.5 items-start">
                                        <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 text-[10px] font-bold flex-shrink-0 mt-0.5">
                                          {idx + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs text-gray-800 leading-relaxed">{ob.texto}</p>
                                          {(ob.registradoPor || ob.fechaRegistro) && (
                                            <p className="text-[10px] text-gray-400 mt-1">
                                              {ob.registradoPor && <span> {ob.registradoPor}</span>}
                                              {ob.fechaRegistro && <span> • {new Date(ob.fechaRegistro).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Cortes de seguimiento (puntos de control) */}
                            {actividad.puntosControl && actividad.puntosControl.length > 0 && (
                              <div className="border border-orange-200 rounded-lg overflow-hidden">
                                <div className="bg-orange-50 px-3 py-2 border-b border-orange-200 flex items-center justify-between gap-2">
                                  <p className="text-xs font-bold text-orange-900 uppercase tracking-wider flex items-center gap-1.5">
                                    <CalendarClock className="w-3.5 h-3.5" />
                                    Cortes de seguimiento ({actividad.puntosControl.filter((pc) => corteEstaCumplido(actividad, pc.id)).length}/{actividad.puntosControl.length})
                                  </p>
                                  {avanceActividad.fuente === 'cortes' && (
                                    <span className="text-[10px] font-semibold text-orange-800 bg-white/80 px-2 py-0.5 rounded-full border border-orange-200">
                                      Avance por cortes
                                    </span>
                                  )}
                                </div>
                                <div className="p-3 bg-white space-y-2">
                                  {actividad.frecuenciaPuntosControl && (
                                    <p className="text-[10px] text-gray-500 mb-1">
                                      Periodicidad: <span className="font-semibold text-gray-700">{obtenerTextoPeriodicidad(actividad.frecuenciaPuntosControl)}</span>
                                    </p>
                                  )}
                                  {actividad.puntosControl.map((pc, pcIdx) => {
                                    const hoyDate = new Date();
                                    hoyDate.setHours(0, 0, 0, 0);
                                    const fechaCorte = new Date(pc.fechaProgramada + 'T00:00:00');
                                    const fechaSeg = pc.fechaSeguimiento ? new Date(pc.fechaSeguimiento + 'T00:00:00') : null;
                                    const cumplido = corteEstaCumplido(actividad, pc.id);
                                    const enSeguimiento = !cumplido && fechaCorte < hoyDate && fechaSeg !== null && hoyDate <= fechaSeg;
                                    const esVencido = !cumplido && !enSeguimiento && fechaCorte < hoyDate;
                                    const tareasDelCorte = (actividad.tareasSeguimiento || []).filter(
                                      (t) => t.puntoControlId === pc.id,
                                    );
                                    const tareasHechas = tareasDelCorte.filter((t) => t.completada).length;
                                    const formKey = claveFormCorte(actividad.id, pc.id);
                                    return (
                                      <div
                                        key={pc.id}
                                        className={`rounded-lg border p-2.5 ${
                                          cumplido
                                            ? 'border-green-200 bg-green-50/50'
                                            : esVencido
                                              ? 'border-red-200 bg-red-50/30'
                                              : enSeguimiento
                                                ? 'border-purple-200 bg-purple-50/40'
                                                : 'border-gray-200 bg-gray-50/50'
                                        }`}
                                      >
                                        <div className="flex items-start gap-2">
                                          <div
                                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                              cumplido
                                                ? 'bg-green-500 text-white'
                                                : esVencido
                                                  ? 'bg-red-100 text-red-700 border border-red-300'
                                                  : 'bg-orange-100 text-orange-800 border border-orange-300'
                                            }`}
                                          >
                                            {cumplido ? <Check className="w-3.5 h-3.5" /> : pcIdx + 1}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                                              <span className="text-xs font-bold text-gray-900">{pc.nombre}</span>
                                              <span
                                                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                                  cumplido
                                                    ? 'bg-green-100 text-green-700'
                                                    : esVencido
                                                      ? 'bg-red-100 text-red-700'
                                                      : enSeguimiento
                                                        ? 'bg-purple-100 text-purple-700'
                                                        : 'bg-gray-100 text-gray-600'
                                                }`}
                                              >
                                                {cumplido
                                                  ? 'Cumplido'
                                                  : esVencido
                                                    ? 'Vencido'
                                                    : enSeguimiento
                                                      ? 'En seguimiento'
                                                      : 'Pendiente'}
                                              </span>
                                            </div>
                                            <div className="flex flex-wrap gap-3 text-[10px] text-gray-600">
                                              <span className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3 text-orange-500" />
                                                Corte: {fechaCorte.toLocaleDateString('es-CO')}
                                              </span>
                                              {fechaSeg && (
                                                <span className="flex items-center gap-1">
                                                  <Clock className="w-3 h-3 text-purple-500" />
                                                  Seguimiento hasta: {fechaSeg.toLocaleDateString('es-CO')}
                                                </span>
                                              )}
                                              {tareasDelCorte.length > 0 && (
                                                <span className="text-indigo-700 font-medium">
                                                  Tareas del corte: {tareasHechas}/{tareasDelCorte.length}
                                                  {tareasHechas === tareasDelCorte.length && tareasDelCorte.length > 0 && !cumplido && (
                                                    <span className="text-amber-700 ml-1">(marca todas completadas)</span>
                                                  )}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </div>

                                        {/* Tareas del corte: observaciones y evidencias por tarea */}
                                        <div className="mt-2 pt-2 border-t border-dashed border-indigo-100 space-y-2">
                                          <p className="text-[10px] font-bold text-indigo-700 uppercase">
                                            Tareas del corte ({tareasHechas}/{tareasDelCorte.length})
                                          </p>
                                          {tareasDelCorte.length === 0 && (
                                            <p className="text-[10px] text-gray-500 italic">Sin tareas. Usa «+ Agregar tarea».</p>
                                          )}
                                          {tareasDelCorte.map((tarea) => {
                                            const cantAdj = tarea.adjuntosTarea?.length || 0;
                                            const tieneObs = !!(tarea.observaciones || '').trim();
                                            return (
                                              <div
                                                key={tarea.id}
                                                className={`p-2.5 rounded-lg border ${
                                                  tarea.completada ? 'bg-green-50/70 border-green-200' : 'bg-white border-gray-200'
                                                }`}
                                                onClick={(e) => e.stopPropagation()}
                                              >
                                                <div className="flex items-start gap-2">
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      puedeGestionarTareas(rol) &&
                                                      toggleCompletarTarea(rol.numero, actividad.id, tarea.id)
                                                    }
                                                    disabled={!puedeGestionarTareas(rol)}
                                                    className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                                                      tarea.completada
                                                        ? 'bg-green-500 border-green-500 text-white'
                                                        : 'border-gray-300 bg-white'
                                                    }`}
                                                  >
                                                    {tarea.completada && <Check className="w-3 h-3" />}
                                                  </button>
                                                  <p
                                                    className={`text-xs font-medium flex-1 ${
                                                      tarea.completada ? 'line-through text-gray-500' : 'text-gray-900'
                                                    }`}
                                                  >
                                                    {tarea.descripcion}
                                                  </p>
                                                </div>
                                                <div className="ml-7 mt-2 flex flex-wrap gap-1.5">
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      const input = document.createElement('input');
                                                      input.type = 'file';
                                                      input.multiple = true;
                                                      input.accept = '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.zip';
                                                      input.onchange = () =>
                                                        agregarAdjuntosTarea(
                                                          rol.numero,
                                                          actividad.id,
                                                          tarea.id,
                                                          input.files,
                                                        );
                                                      input.click();
                                                    }}
                                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] border ${
                                                      cantAdj > 0
                                                        ? 'bg-purple-50 text-purple-700 border-purple-200 font-medium'
                                                        : 'bg-gray-50 text-gray-600 border-dashed border-gray-300'
                                                    }`}
                                                  >
                                                    <Upload className="w-3 h-3" />
                                                    {cantAdj > 0 ? `${cantAdj} evidencia(s)` : 'Subir evidencia'}
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      setComentarioTareaId(tarea.id);
                                                      setTextoComentarioTarea('');
                                                    }}
                                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] border ${
                                                      tieneObs
                                                        ? 'bg-amber-50 text-amber-800 border-amber-200 font-medium'
                                                        : 'bg-gray-50 text-gray-600 border-dashed border-gray-300'
                                                    }`}
                                                  >
                                                    {tieneObs ? 'Añadir otra observación' : 'Observación'}
                                                  </button>
                                                </div>
                                                <ListaEvidenciasTarea adjuntos={tarea.adjuntosTarea || []} />
                                                {tieneObs && (
                                                  <div className="ml-7 mt-1.5 rounded-md border border-amber-100 bg-amber-50/50 overflow-hidden">
                                                    <p className="px-2 py-0.5 text-[9px] font-semibold text-amber-800 border-b border-amber-100">
                                                      Observaciones
                                                    </p>
                                                    <p className="px-2 py-1.5 text-[11px] text-gray-700 whitespace-pre-wrap max-h-28 overflow-y-auto">
                                                      {tarea.observaciones}
                                                    </p>
                                                  </div>
                                                )}
                                                {comentarioTareaId === tarea.id && (
                                                  <div className="ml-7 mt-2 space-y-1">
                                                    <textarea
                                                      value={textoComentarioTarea}
                                                      onChange={(e) => setTextoComentarioTarea(e.target.value)}
                                                      rows={2}
                                                      placeholder="Nueva observación (se añade al historial)..."
                                                      className="w-full px-2 py-1 text-xs border border-amber-300 rounded"
                                                    />
                                                    <div className="flex gap-2">
                                                      <button
                                                        type="button"
                                                        onClick={() =>
                                                          agregarComentarioTarea(
                                                            rol.numero,
                                                            actividad.id,
                                                            tarea.id,
                                                            textoComentarioTarea,
                                                          )
                                                        }
                                                        className="px-2 py-1 text-[10px] font-bold bg-amber-600 text-white rounded"
                                                      >
                                                        Guardar
                                                      </button>
                                                      <button
                                                        type="button"
                                                        onClick={() => {
                                                          setComentarioTareaId(null);
                                                          setTextoComentarioTarea('');
                                                        }}
                                                        className="px-2 py-1 text-[10px] border rounded"
                                                      >
                                                        Cancelar
                                                      </button>
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>

                                        {puedeGestionarTareas(rol) && plan.estado !== 'BORRADOR' && (
                                          formTareaCorteKey === formKey ? (
                                            <div className="mt-2 p-2 bg-teal-50 border border-teal-200 rounded-lg space-y-2" onClick={(e) => e.stopPropagation()}>
                                              <input
                                                type="text"
                                                value={nuevaTarea.descripcion}
                                                onChange={(e) => setNuevaTarea({ ...nuevaTarea, descripcion: e.target.value })}
                                                placeholder="Descripción de la tarea *"
                                                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md"
                                              />
                                              <div className="flex justify-end gap-2">
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setFormTareaCorteKey(null);
                                                    setNuevaTarea({ descripcion: '', responsable: '', fechaLimite: '', requiereAdjuntos: false, requiereObservaciones: false });
                                                  }}
                                                  className="px-2 py-1 text-xs border border-gray-300 rounded"
                                                >
                                                  Cancelar
                                                </button>
                                                <button
                                                  type="button"
                                                  disabled={guardandoTarea}
                                                  onClick={() => agregarTareaSeguimiento(rol.numero, actividad.id, pc.id)}
                                                  className="px-2 py-1 text-xs font-bold text-white bg-teal-600 rounded disabled:opacity-50"
                                                >
                                                  {guardandoTarea ? 'Guardando...' : 'Guardar tarea'}
                                                </button>
                                              </div>
                                            </div>
                                          ) : (
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setFormTareaCorteKey(formKey);
                                                setFormTareaActividadId(null);
                                              }}
                                              className="mt-2 text-[10px] font-semibold text-teal-700 hover:text-teal-900"
                                            >
                                              + Agregar tarea a este corte
                                            </button>
                                          )
                                        )}

                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>


                          {(() => {
                            const tieneCortes = actividad.puntosControl && actividad.puntosControl.length > 0;
                            // Con cortes, las tareas solo se muestran dentro de cada corte
                            if (tieneCortes) return null;
                            const tareasVisibles = actividad.tareasSeguimiento || [];
                            if (tareasVisibles.length === 0) return null;
                            return (
                            <div className="mt-3 ml-11 border-t border-dashed border-gray-200 pt-3">
                              <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                                Tareas ({tareasVisibles.filter(t => t.completada).length}/{tareasVisibles.length} completadas)
                              </p>
                              <div className="space-y-1.5">
                                {tareasVisibles.map((tarea) => {
                                  const fechaTarea = tarea.fechaEntrega || (tarea as any).fechaLimite || null;
                                  const fechaLimite = fechaTarea ? new Date(fechaTarea) : null;
                                  const hoy = new Date();
                                  const diasRestantes = fechaLimite ? Math.ceil((fechaLimite.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)) : null;
                                  const estaVencida = diasRestantes !== null && diasRestantes < 0 && !tarea.completada;
                                  const estaProxima = diasRestantes !== null && diasRestantes >= 0 && diasRestantes <= 7 && !tarea.completada;
                                  const cantAdjuntos = tarea.adjuntosTarea?.length || 0;
                                  const tieneObservacion = tarea.observaciones && tarea.observaciones.trim();
                                  
                                  return (
                                    <div key={tarea.id} className={`p-3 rounded-lg border transition-colors ${
                                      tarea.completada ? 'bg-green-50/60 border-green-200' : 
                                      estaVencida ? 'bg-red-50/60 border-red-200' :
                                      estaProxima ? 'bg-amber-50/60 border-amber-200' :
                                      'bg-white border-gray-200'
                                    }`}>
                                      {/* Fila 1: Checkbox + Descripción */}
                                      <div className="flex items-start gap-2.5">
                                        <button
                                          onClick={(e) => { e.stopPropagation(); puedeGestionarTareas(rol) && toggleCompletarTarea(rol.numero, actividad.id, tarea.id); }}
                                          disabled={!puedeGestionarTareas(rol)}
                                          className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                            tarea.completada ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 bg-white hover:border-blue-400'
                                          } ${puedeGestionarTareas(rol) ? 'cursor-pointer' : 'cursor-default'}`}
                                        >
                                          {tarea.completada && (
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                          )}
                                        </button>
                                        <div className="flex-1 min-w-0">
                                          <p className={`text-sm font-medium leading-snug ${tarea.completada ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                                            {tarea.descripcion}
                                          </p>
                                        </div>
                                      </div>

                                      {/* Fila 2: Metadatos SIEMPRE visibles */}
                                      <div className="ml-7 mt-2 flex items-center gap-2 flex-wrap">
                                        {/* ⏰ Fecha límite  SIEMPRE visible */}
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                                          !fechaLimite ? 'bg-gray-100 text-gray-400 border border-dashed border-gray-300' :
                                          tarea.completada ? 'bg-gray-100 text-gray-400' :
                                          estaVencida ? 'bg-red-100 text-red-700 border border-red-300' :
                                          estaProxima ? 'bg-amber-100 text-amber-700 border border-amber-300' :
                                          'bg-gray-100 text-gray-600'
                                        }`}>
                                          ⏰ {!fechaLimite ? 'Sin fecha límite' : estaVencida ? `Vencida (${Math.abs(diasRestantes!)} días)` : `Límite: ${fechaLimite.toLocaleDateString('es-CO')}`}
                                        </span>

                                        {/* x Responsables  SIEMPRE visible (fallback: responsable del rol) */}
                                        {(() => {
                                          const tieneResp = tarea.responsables && tarea.responsables.length > 0;
                                          const rolResps = (rol as any).responsables as Auditor[] | undefined;
                                          const respNames = tieneResp
                                            ? tarea.responsables!
                                                .map((r: any) => (typeof r === 'string' ? r : r?.nombre || r?.name || r?.email || ''))
                                                .filter(Boolean)
                                                .join(', ')
                                            : (rolResps && rolResps.length > 0 ? rolResps.map(r => r.nombre).join(', ') : null);
                                          const esFallback = !tieneResp && respNames;
                                          return (
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] ${
                                              tieneResp ? 'bg-blue-50 text-blue-700 border border-blue-200 font-medium' :
                                              esFallback ? 'bg-teal-50 text-teal-700 border border-teal-200 font-medium' :
                                              'bg-gray-100 text-gray-400 border border-dashed border-gray-300'
                                            }`}>
                                              👤 {respNames || 'Sin responsable'}
                                              {esFallback && <span className="text-[8px] bg-teal-100 text-teal-600 px-1 rounded font-bold ml-0.5">ROL</span>}
                                            </span>
                                          );
                                        })()}

                                        {/* 📎 Adjuntos  SIEMPRE visible */}
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const input = document.createElement('input');
                                            input.type = 'file';
                                            input.multiple = true;
                                            input.accept = '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.zip';
                                            input.onchange = () => {
                                              agregarAdjuntosTarea(rol.numero, actividad.id, tarea.id, input.files);
                                            };
                                            input.click();
                                          }}
                                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] border ${
                                            cantAdjuntos > 0
                                              ? 'bg-purple-50 text-purple-700 border-purple-200 font-medium hover:bg-purple-100'
                                              : 'bg-gray-100 text-gray-500 border-dashed border-gray-300 hover:bg-gray-200'
                                          }`}
                                          title="Subir archivos de evidencia para esta tarea"
                                        >
                                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                          {cantAdjuntos > 0 ? `${cantAdjuntos} evidencia${cantAdjuntos !== 1 ? 's' : ''}` : 'Adjuntar evidencia'}
                                        </button>

                                        {/* Observación de la tarea */}
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setComentarioTareaId(tarea.id);
                                            setTextoComentarioTarea('');
                                          }}
                                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] border ${
                                            tieneObservacion
                                              ? 'bg-amber-50 text-amber-700 border-amber-200 font-medium hover:bg-amber-100'
                                              : 'bg-gray-100 text-gray-500 border-dashed border-gray-300 hover:bg-gray-200'
                                          }`}
                                          title="Escribir observación de esta tarea"
                                        >
                                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
                                          {tieneObservacion ? 'Añadir otra observación' : 'Observación'}
                                        </button>

                                        {/* S& Completada */}
                                        {tarea.completada && (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded text-[11px] font-semibold border border-green-200">
                                            {tarea.fechaCompletado ? new Date(tarea.fechaCompletado).toLocaleDateString('es-CO') : 'Completada'}
                                          </span>
                                        )}

                                        {/* x Requisitos para completar */}
                                        {!tarea.completada && (tarea.requiereAdjuntos || tarea.requiereObservaciones) && (
                                          <>
                                            {tarea.requiereAdjuntos && (
                                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${
                                                cantAdjuntos > 0 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-orange-50 text-orange-700 border-orange-300'
                                              }`}>
                                                📎 {cantAdjuntos > 0 ? '✅ Evidencia OK' : 'Evidencia requerida'}
                                              </span>
                                            )}
                                            {tarea.requiereObservaciones && (
                                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${
                                                tieneObservacion ? 'bg-green-50 text-green-700 border-green-200' : 'bg-orange-50 text-orange-700 border-orange-300'
                                              }`}>
                                                📝 {tieneObservacion ? '✅ Observación OK' : 'Observación requerida'}
                                              </span>
                                            )}
                                          </>
                                        )}
                                      </div>

                                      <ListaEvidenciasTarea adjuntos={tarea.adjuntosTarea || []} />

                                      {/* Observaciones registradas */}
                                      {tieneObservacion && (
                                        <div className="ml-7 mt-2 px-3 py-2 bg-white border border-gray-200 rounded-lg max-h-32 overflow-y-auto">
                                          <p className="text-[11px] font-bold text-gray-500 mb-0.5 flex items-center gap-1 uppercase tracking-wider sticky top-0 bg-white">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
                                            Observaciones
                                          </p>
                                          <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{tarea.observaciones}</p>
                                        </div>
                                      )}

                                      {/* Nueva observación de tarea */}
                                      {comentarioTareaId === tarea.id && (
                                        <div className="ml-7 mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                                          <textarea
                                            value={textoComentarioTarea}
                                            onChange={(e) => setTextoComentarioTarea(e.target.value)}
                                            className="w-full px-2 py-1.5 border border-amber-300 rounded text-xs resize-none"
                                            rows={2}
                                            placeholder="Nueva observación de cumplimiento..."
                                          />
                                          <div className="mt-2 flex items-center gap-2">
                                            <button
                                              type="button"
                                              onClick={() => agregarComentarioTarea(rol.numero, actividad.id, tarea.id, textoComentarioTarea)}
                                              className="px-2 py-1 text-xs bg-amber-600 hover:bg-amber-700 text-white rounded"
                                            >
                                              Guardar observación
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setComentarioTareaId(null);
                                                setTextoComentarioTarea('');
                                              }}
                                              className="px-2 py-1 text-xs bg-white border border-gray-300 rounded"
                                            >
                                              Cancelar
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Botón + Agregar tarea de seguimiento (solo nivel actividad, sin cortes) */}
                              {puedeGestionarTareas(rol) && (
                                formTareaActividadId === actividad.id ? (
                                  <div className="mt-3 p-3 bg-teal-50 border-2 border-teal-300 rounded-lg" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center justify-between mb-2">
                                      <h5 className="text-xs font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                        Nueva tarea de seguimiento
                                      </h5>
                                      <button onClick={() => { setFormTareaActividadId(null); setNuevaTarea({ descripcion: '', responsable: '', fechaLimite: '', requiereAdjuntos: false, requiereObservaciones: false }); }} className="text-teal-600 hover:text-teal-800 text-sm">×</button>
                                    </div>
                                    <div className="space-y-2">
                                      <input
                                        type="text"
                                        value={nuevaTarea.descripcion}
                                        onChange={(e) => setNuevaTarea({ ...nuevaTarea, descripcion: e.target.value })}
                                        placeholder="Descripción de la tarea *"
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:border-teal-500"
                                      />
                                      <div className="grid grid-cols-2 gap-2">
                                        <select
                                          value={nuevaTarea.responsable}
                                          onChange={(e) => setNuevaTarea({ ...nuevaTarea, responsable: e.target.value })}
                                          className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:border-teal-500"
                                        >
                                          <option value="">Responsable (opcional)</option>
                                          {auditores.map(a => <option key={a.id} value={a.nombre}>{a.nombre}</option>)}
                                          {/* Fallback: responsables del rol */}
                                          {(rol as any).responsables?.filter((r: Auditor) => !auditores.some(a => a.id === r.id)).map((r: Auditor) => (
                                            <option key={r.id} value={r.nombre}>{r.nombre} (Rol)</option>
                                          ))}
                                        </select>
                                        <input
                                          type="date"
                                          value={nuevaTarea.fechaLimite}
                                          onChange={(e) => setNuevaTarea({ ...nuevaTarea, fechaLimite: e.target.value })}
                                          className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:border-teal-500"
                                        />
                                      </div>
                                      {/* Requisitos para completar la tarea */}
                                      <div className="flex items-center gap-4 py-1">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                          <button
                                            type="button"
                                            onClick={() => setNuevaTarea({ ...nuevaTarea, requiereAdjuntos: !nuevaTarea.requiereAdjuntos })}
                                            className={`relative w-8 h-4 rounded-full transition-colors ${
                                              nuevaTarea.requiereAdjuntos ? 'bg-teal-500' : 'bg-gray-300'
                                            }`}
                                          >
                                            <span className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${
                                              nuevaTarea.requiereAdjuntos ? 'translate-x-4' : ''
                                            }`} />
                                          </button>
                                          <span className="text-xs text-gray-700">📎 Requiere adjunto</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                          <button
                                            type="button"
                                            onClick={() => setNuevaTarea({ ...nuevaTarea, requiereObservaciones: !nuevaTarea.requiereObservaciones })}
                                            className={`relative w-8 h-4 rounded-full transition-colors ${
                                              nuevaTarea.requiereObservaciones ? 'bg-teal-500' : 'bg-gray-300'
                                            }`}
                                          >
                                            <span className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${
                                              nuevaTarea.requiereObservaciones ? 'translate-x-4' : ''
                                            }`} />
                                          </button>
                                          <span className="text-xs text-gray-700">📝 Requiere observación</span>
                                        </label>
                                      </div>
                                      <div className="flex justify-end gap-2">
                                        <button
                                          onClick={() => { setFormTareaActividadId(null); setNuevaTarea({ descripcion: '', responsable: '', fechaLimite: '', requiereAdjuntos: false, requiereObservaciones: false }); }}
                                          className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-400 rounded-md hover:bg-gray-100"
                                        >Cancelar</button>
                                        <button
                                          onClick={() => agregarTareaSeguimiento(rol.numero, actividad.id)}
                                          disabled={guardandoTarea || !nuevaTarea.descripcion.trim()}
                                          className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${
                                            guardandoTarea || !nuevaTarea.descripcion.trim()
                                              ? 'bg-gray-300 text-gray-500 border border-gray-400 cursor-not-allowed'
                                              : 'bg-teal-700 text-white border border-teal-800 hover:bg-teal-800 shadow-sm'
                                          }`}
                                        >{guardandoTarea ? 'Guardando...' : '+ Agregar tarea'}</button>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setFormTareaActividadId(actividad.id); }}
                                    className="mt-3 w-full py-2 text-xs font-semibold text-teal-700 bg-teal-50 border-2 border-dashed border-teal-300 rounded-lg hover:bg-teal-100 hover:border-teal-400 transition-colors flex items-center justify-center gap-1.5"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                    Agregar tarea de seguimiento
                                  </button>
                                )
                              )}
                            </div>
                            );
                          })()}
                          {(!actividad.tareasSeguimiento || actividad.tareasSeguimiento.length === 0) && puedeGestionarTareas(rol) && !(actividad.puntosControl && actividad.puntosControl.length > 0) && plan.estado !== 'BORRADOR' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setFormTareaActividadId(actividad.id); }}
                              className="mt-3 ml-11 w-[calc(100%-2.75rem)] py-2 text-xs font-semibold text-teal-700 bg-teal-50 border-2 border-dashed border-teal-300 rounded-lg hover:bg-teal-100 hover:border-teal-400 transition-colors flex items-center justify-center gap-1.5"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                              Agregar tarea de seguimiento
                            </button>
                          )}
                        </div>
                      );
                      })
                    )}

                    {/* Formulario para nueva actividad  SOLO en BORRADOR */}
                    {plan.estado === 'BORRADOR' && (
                      mostrarFormNuevaActividad === rol.numero ? (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-4 border-2 border-blue-300 bg-blue-50 rounded-lg space-y-3"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-blue-900">Nueva actividad para Rol {rol.numero}</h4>
                            <button
                              onClick={(e) => { e.stopPropagation(); setMostrarFormNuevaActividad(null); }}
                              className="text-blue-600 hover:text-blue-800"
                            >×</button>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-1">Nombre de la actividad *</label>
                            <input type="text" value={nuevaActividad.nombre} onChange={(e) => setNuevaActividad({ ...nuevaActividad, nombre: e.target.value })} className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500" placeholder="Ej: Auditoría al proceso de contratación" onClick={(e) => e.stopPropagation()} />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-1">Descripción</label>
                            <textarea value={nuevaActividad.descripcion} onChange={(e) => setNuevaActividad({ ...nuevaActividad, descripcion: e.target.value })} className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500" placeholder="Descripción detallada" rows={2} onClick={(e) => e.stopPropagation()} />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-sm font-semibold text-gray-900 mb-1">Fecha inicio</label>
                              <input type="date" value={nuevaActividad.fechaInicio} onChange={(e) => setNuevaActividad({ ...nuevaActividad, fechaInicio: e.target.value })} className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500" onClick={(e) => e.stopPropagation()} />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-900 mb-1">Fecha fin</label>
                              <input type="date" value={nuevaActividad.fechaFin} onChange={(e) => setNuevaActividad({ ...nuevaActividad, fechaFin: e.target.value })} className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500" onClick={(e) => e.stopPropagation()} />
                            </div>
                          </div>
                          <div className="flex gap-2 pt-2">
                            <button onClick={(e) => { e.stopPropagation(); agregarActividadInline(rol.numero); }} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2">
                              <Check className="w-4 h-4" /> Guardar actividad
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setMostrarFormNuevaActividad(null); }} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium">
                              Cancelar
                            </button>
                          </div>
                        </motion.div>
                      ) : (
                        puedeAsignarActividades && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setMostrarFormNuevaActividad(rol.numero); }}
                            className="w-full px-4 py-3 border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 rounded-lg text-gray-600 hover:text-blue-600 font-medium flex items-center justify-center gap-2 transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            Agregar actividad adicional
                          </button>
                        )
                      )
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
        </>
      )}

    </motion.div>
  );
}

// """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
// FUNCIONES HELPER PARA SEGUIMIENTO
// """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""

// Función para calcular porcentaje automático basado en puntos de control
function calcularPorcentajeAutomatico(actividad: Actividad): number {
  if (!actividad.puntosControl || actividad.puntosControl.length === 0) {
    return actividad.porcentajeAvance; // Si no hay puntos, usar el valor manual existente
  }
  
  const puntosCompletados = actividad.puntosControl.filter(p => p.estado === 'completado').length;
  const totalPuntos = actividad.puntosControl.length;
  
  return Math.round((puntosCompletados / totalPuntos) * 100);
}

// Función para obtener texto de periodicidad desde frecuencia configurada
function obtenerTextoPeriodicidad(frecuencia?: FrecuenciaPuntoControl): string {
  if (!frecuencia) return '';
  
  const mapeo: Record<FrecuenciaPuntoControl, string> = {
    'semanal': 'Seguimiento semanal',
    'mensual': 'Seguimiento mensual',
    'bimensual': 'Seguimiento bimestral',
    'trimestral': 'Seguimiento trimestral',
    'cuatrimestral': 'Seguimiento cuatrimestral',
    'semestral': 'Seguimiento semestral',
    'anual': 'Seguimiento anual',
    'personalizada': 'Seguimiento personalizado'
  };
  
  return mapeo[frecuencia] || '';
}

// """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
// [DEPRECATED - ELIMINADA] SECCIN 3: SEGUIMIENTO Y CONTROL
// Esta sección fue unificada con la Sección de Resumen en "SeccionGestionYSeguimiento"
// """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""

function __DEPRECATED__SeccionSeguimiento({ plan, onActualizar, onAbrirRol4, auditores = [] }: { plan: PlanAnual; onActualizar: (plan: PlanAnual) => void; onAbrirRol4?: () => void; auditores?: Auditor[] }) {
  const [actividadExpandida, setActividadExpandida] = useState<number | string | null>(null);
  const [modalAdjuntos, setModalAdjuntos] = useState<{ actividadId: number | string; rolNumero: number } | null>(null);
  const [nuevaObservacion, setNuevaObservacion] = useState('');
  const [mostrarSelectorApoyo, setMostrarSelectorApoyo] = useState(false);
  const [formulario, setFormulario] = useState({
    control: '',
    evaluacion: '',
    seguimiento: '',
    porcentaje: 0
  });

  const abrirSeguimiento = (actividad: Actividad) => {
    // Calcular porcentaje automático si tiene puntos de control
    const porcentajeCalculado = calcularPorcentajeAutomatico(actividad);
    
    // Obtener periodicidad automática si tiene frecuencia configurada
    const controlAutomatico = actividad.frecuenciaPuntosControl 
      ? obtenerTextoPeriodicidad(actividad.frecuenciaPuntosControl)
      : actividad.control;
    
    setFormulario({
      control: controlAutomatico,
      evaluacion: actividad.evaluacion,
      seguimiento: actividad.seguimiento,
      porcentaje: porcentajeCalculado
    });
    setNuevaObservacion(''); // Limpiar el campo de nueva observación
    setMostrarSelectorApoyo(false); // Cerrar selector de apoyo
    setActividadExpandida(actividad.id);
  };

  // Función para desactivar una actividad (soft delete)
  const desactivarActividad = async (rolNumero: number, actividadId: number | string) => {
    console.log('xa [desactivarActividad] Desactivando actividad:', { rolNumero, actividadId });
    
    try {
      const res = await actividadesApi.delete(String(actividadId));
      console.log('xa [desactivarActividad] Respuesta del backend:', res);

      if (res.success) {
        // Actualizar estado local - marcar como inactiva
        const planActualizado = {
          ...plan,
          roles: plan.roles.map(rol => {
            if (rol.numero === rolNumero) {
              return {
                ...rol,
                actividades: rol.actividades.map(act => 
                  act.id === actividadId ? { ...act, activo: false } : act
                )
              };
            }
            return rol;
          })
        };
        onActualizar(planActualizado);
        toast.success('Actividad desactivada', { description: 'La actividad ha sido marcada como inactiva' });
      } else {
        toast.error('Error al desactivar', { description: res.error || 'No se pudo desactivar en el servidor' });
      }
    } catch (error) {
      console.error('Error desactivando actividad:', error);
      toast.error('Error', { description: 'No se pudo desactivar la actividad' });
    }
  };

  const agregarObservacion = (rolNumero: number, actividadId: number | string) => {
    if (!nuevaObservacion.trim()) {
      toast.error('Observación vacía', { description: 'Debes escribir una observación' });
      return;
    }

    const nuevaObs: ObservacionCumplimiento = {
      id: `obs-${Date.now()}`,
      texto: nuevaObservacion.trim(),
      fechaRegistro: new Date().toISOString(),
      registradoPor: plan.jefeOCI.nombre
    };

    const planActualizado = {
      ...plan,
      roles: plan.roles.map(rol => {
        if (rol.numero === rolNumero) {
          return {
            ...rol,
            actividades: rol.actividades.map(act => {
              if (act.id === actividadId) {
                const obsActuales = Array.isArray(act.observacionesCumplimiento) 
                  ? act.observacionesCumplimiento 
                  : [];
                return { 
                  ...act,
                  observacionesCumplimiento: [
                    ...obsActuales,
                    nuevaObs
                  ]
                };
              }
              return act;
            })
          };
        }
        return rol;
      })
    };

    onActualizar(planActualizado);
    setNuevaObservacion('');
    toast.success('Observación agregada', { description: 'Se registró exitosamente' });
  };

  const eliminarObservacion = (rolNumero: number, actividadId: number | string, observacionId: string) => {
    const planActualizado = {
      ...plan,
      roles: plan.roles.map(rol => {
        if (rol.numero === rolNumero) {
          return {
            ...rol,
            actividades: rol.actividades.map(act => {
              if (act.id === actividadId) {
                const obsActuales = Array.isArray(act.observacionesCumplimiento) 
                  ? act.observacionesCumplimiento 
                  : [];
                return { 
                  ...act,
                  observacionesCumplimiento: obsActuales.filter((obs: ObservacionCumplimiento) => obs.id !== observacionId)
                };
              }
              return act;
            })
          };
        }
        return rol;
      })
    };

    onActualizar(planActualizado);
    toast.success('Observación eliminada');
  };

  const agregarResponsableApoyo = (rolNumero: number, actividadId: number | string, auditor: Auditor) => {
    const planActualizado = {
      ...plan,
      roles: plan.roles.map(rol => {
        if (rol.numero === rolNumero) {
          return {
            ...rol,
            actividades: rol.actividades.map(act => {
              if (act.id === actividadId) {
                const apoyoExiste = (act.responsablesApoyo || []).some(r => r.id === auditor.id);
                const esPrincipal = act.responsable?.id === auditor.id;
                
                if (apoyoExiste || esPrincipal) {
                  toast.error('Responsable ya asignado', { 
                    description: esPrincipal ? 'Ya es el responsable principal' : 'Ya está en el equipo de apoyo'
                  });
                  return act;
                }
                
                return { 
                  ...act,
                  responsablesApoyo: [
                    ...(act.responsablesApoyo || []),
                    auditor
                  ]
                };
              }
              return act;
            })
          };
        }
        return rol;
      })
    };

    onActualizar(planActualizado);
    setMostrarSelectorApoyo(false);
    toast.success('Responsable de apoyo agregado', { description: `${auditor.nombre} se agregó al equipo` });
  };

  const eliminarResponsableApoyo = (rolNumero: number, actividadId: number | string, auditorId: string) => {
    const planActualizado = {
      ...plan,
      roles: plan.roles.map(rol => {
        if (rol.numero === rolNumero) {
          return {
            ...rol,
            actividades: rol.actividades.map(act => {
              if (act.id === actividadId) {
                return { 
                  ...act,
                  responsablesApoyo: (act.responsablesApoyo || []).filter(r => r.id !== auditorId)
                };
              }
              return act;
            })
          };
        }
        return rol;
      })
    };

    onActualizar(planActualizado);
    toast.success('Responsable de apoyo eliminado');
  };

  const guardarSeguimiento = async (rolNumero: number, actividadId: number | string) => {
    // Validar si la actividad requiere autorización y está al 100%
    const actividadActual = plan.roles
      .find(r => r.numero === rolNumero)
      ?.actividades.find(a => a.id === actividadId);

    if (
      formulario.porcentaje === 100 && 
      actividadActual?.requiereAutorizacionJefeOCI && 
      !actividadActual?.autorizadaPorJefeOCI
    ) {
      toast.error('Autorización requerida', { 
        description: 'Esta actividad requiere autorización del Jefe OCI antes de completarse al 100%' 
      });
      return;
    }

    const nuevoEstado: EstadoActividad = 
      formulario.porcentaje === 100 ? 'COMPLETADA' :
      formulario.porcentaje > 0 ? 'EN_EJECUCION' :
      'PENDIENTE';

    // Mapear estado del frontend al formato del backend
    const estadoBackend = 
      nuevoEstado === 'COMPLETADA' ? 'completada' :
      nuevoEstado === 'EN_EJECUCION' ? 'en-progreso' :
      'pendiente';

    setGuardando(true);
    
    try {
      // Preparar payload - Backend espera estos campos exactos
      const payload = {
        estado: estadoBackend as any,
        porcentaje_avance: formulario.porcentaje,
        control: formulario.control,
        evaluacion: formulario.evaluacion,
        seguimiento: formulario.seguimiento
      };
      
      console.log('[GUARDAR] Payload:', payload);
      const response = await actividadesApi.update(String(actividadId), payload);
      console.log('[GUARDAR] Respuesta backend:', response);
      
      if (!response.success) {
        const errorMsg = response.error || 'No se pudo actualizar la actividad';
        toast.error('No se puede completar', { 
          description: errorMsg,
          duration: 6000 
        });
        setGuardando(false);
        return;
      }
    } catch (error: any) {
      console.error('[GUARDAR] Error al guardar en backend:', error);
      const errorMsg = error?.response?.data?.message || error?.message || 'Error al guardar el seguimiento';
      toast.error('Error al guardar', { 
        description: errorMsg,
        duration: 6000 
      });
      setGuardando(false);
      return;
    }

    const planActualizado = {
      ...plan,
      roles: plan.roles.map(rol => {
        if (rol.numero === rolNumero) {
          return {
            ...rol,
            actividades: rol.actividades.map(act => {
              if (act.id === actividadId) {
                return { 
                  ...act,
                  control: formulario.control,
                  evaluacion: formulario.evaluacion,
                  seguimiento: formulario.seguimiento,
                  porcentajeAvance: formulario.porcentaje,
                  estado: nuevoEstado
                };
              }
              return act;
            })
          };
        }
        return rol;
      })
    };
    onActualizar(planActualizado);
    setGuardando(false);
    toast.success('Seguimiento registrado', { description: 'Información actualizada correctamente' });
    setActividadExpandida(null);
    setNuevaObservacion('');
    setMostrarSelectorApoyo(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Info header */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">Sistema de seguimiento y control</h3>
            <p className="text-sm text-blue-700 mb-2">
              Registra el <strong>control</strong> (periodicidad), la <strong>evaluación</strong> (estado), 
              y el <strong>seguimiento</strong> (acciones y evidencias) de cada actividad.
            </p>
            <p className="text-sm text-blue-700 flex items-center gap-1.5">
              <CalendarClock className="w-4 h-4" />
              <strong>Automático:</strong> El porcentaje de avance y la periodicidad se calculan automáticamente 
              en actividades con puntos de control configurados.
            </p>
          </div>
        </div>
      </div>

      {[...plan.roles].sort((a, b) => a.numero - b.numero).map((rol) => (
        <div key={rol.numero} className="bg-white rounded-xl border-2 border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-5 pb-4 border-b-2 border-gray-200">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl" style={{ backgroundColor: rol.color + '20' }}>
              {rol.icono}
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900">Rol {rol.numero}: {rol.nombre}</h3>
              <p className="text-sm text-gray-600">{rol.actividades.length} actividades</p>
            </div>
            {/* Botón especial para Rol 4: Programa de Auditorías */}
            {rol.numero === 4 && onAbrirRol4 && (
              <button
                onClick={() => {
                  onAbrirRol4();
                }}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:shadow-xl text-white rounded-lg font-semibold text-sm flex items-center gap-2 transition-all"
                title="Acceder al Programa de Auditoría"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Programa Integrado
              </button>
            )}
            <SemaforoSeguimientoPAI 
              porcentaje={Math.round(rol.actividades.reduce((s, a) => s + a.porcentajeAvance, 0) / rol.actividades.length)}
              variant="circular"
              size="lg"
              showIcon={false}
            />
          </div>

          <div className="space-y-3">
            {rol.actividades.map((actividad, idx) => (
              <div 
                key={`${rol.numero}-${idx}-${actividad.id}`} 
                style={{ contentVisibility: 'auto', containIntrinsicSize: '250px' }}
                className={`border-2 rounded-lg overflow-hidden ${actividad.activo === false ? 'border-red-200 bg-red-50/30 opacity-60' : 'border-gray-200'}`}
              >
                {/* Header */}
                <div className={`p-4 ${actividad.activo === false ? 'bg-red-50' : 'bg-gray-50'}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="w-6 h-6 bg-gray-200 rounded-lg flex items-center justify-center text-xs font-bold">
                          {idx + 1}
                        </span>
                        <p className={`font-semibold ${actividad.activo === false ? 'text-gray-500 line-through' : 'text-gray-900'}`}>{actividad.nombre}</p>
                        {actividad.activo === false && (
                          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700 border border-red-300">
                            Inactiva
                          </span>
                        )}
                        {actividad.requiereAutorizacionJefeOCI && (
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-1 ${
                            actividad.autorizadaPorJefeOCI
                              ? 'bg-green-100 text-green-700 border border-green-300'
                              : 'bg-orange-100 text-orange-700 border border-orange-300'
                          }`}>
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                            </svg>
                            {actividad.autorizadaPorJefeOCI ? 'Autorizada Jefe OCI' : 'Requiere Autorización OCI'}
                          </span>
                        )}
                        {actividad.requiereVerificacionDirector && (
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-1 ${
                            actividad.verificadaPorDirector
                              ? 'bg-green-100 text-green-700 border border-green-300'
                              : 'bg-amber-100 text-amber-700 border border-amber-300'
                          }`}>
                            <Shield className="w-3 h-3" />
                            {actividad.verificadaPorDirector ? 'Verificada Director' : 'Requiere Verificación'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <p className="text-sm text-gray-900 flex items-center gap-1.5">
                          <span className="font-semibold text-blue-700">👤 Principal:</span>
                          <strong>{actividad.responsable?.nombre || 'Sin asignar'}</strong>
                        </p>
                        {actividad.responsablesApoyo && actividad.responsablesApoyo.length > 0 && (
                          <p className="text-sm text-gray-600 flex items-center gap-1.5">
                            <span className="font-semibold text-purple-700">🤝 Apoyo:</span>
                            <span>{actividad.responsablesApoyo.map(r => r.nombre).join(', ')}</span>
                          </p>
                        )}
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                      actividad.estado === 'COMPLETADA' ? 'bg-green-100 text-green-700' :
                      actividad.estado === 'EN_EJECUCION' ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {actividad.estado === 'COMPLETADA' ? 'Completada' : 
                       actividad.estado === 'EN_EJECUCION' ? '⏳ En ejecución' : '⏸ Pendiente'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <SemaforoSeguimientoPAI 
                        porcentaje={actividad.porcentajeAvance}
                        variant="bar"
                        size="md"
                        showLabel={true}
                        showIcon={true}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (actividadExpandida === actividad.id) {
                            setActividadExpandida(null);
                            setNuevaObservacion(''); // Limpiar al cerrar
                            setMostrarSelectorApoyo(false); // Cerrar selector de apoyo
                          } else {
                            abrirSeguimiento(actividad);
                          }
                        }}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-medium"
                      >
                        {actividadExpandida === actividad.id ? '× Cerrar' : 'Seguimiento'}
                      </button>
                      {/* Botón Desactivar - siempre visible si activo no es false */}
                      <button
                        onClick={() => {
                          if (actividad.activo === false) {
                            toast.info('Esta actividad ya está inactiva');
                            return;
                          }
                          if (confirm('¿Desactivar esta actividad? Quedará marcada como inactiva y no contará en los avances.')) {
                            desactivarActividad(rol.numero, actividad.id);
                          }
                        }}
                        className={`px-3 py-2 text-sm rounded-lg font-medium border-2 flex items-center gap-1 ${
                          actividad.activo === false 
                            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' 
                            : 'bg-red-100 hover:bg-red-200 text-red-700 border-red-300'
                        }`}
                        title={actividad.activo === false ? 'Actividad ya inactiva' : 'Desactivar actividad'}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                        {actividad.activo === false ? 'Inactiva' : 'Desactivar'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Info actual */}
                <div className="p-4 border-t-2 border-gray-200 bg-white">
                  <div className="grid grid-cols-3 gap-4 mb-3">
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-1">🔍 CONTROL</p>
                      <p className="text-sm text-gray-900">{actividad.control || 'Sin definir'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-1">Evaluación</p>
                      <p className="text-sm text-gray-900">{actividad.evaluacion || 'Sin evaluar'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-1">SEGUIMIENTO (Tareas)</p>
                      {actividad.tareasSeguimiento && actividad.tareasSeguimiento.length > 0 ? (
                        <ul className="space-y-1.5 mt-1">
                          {actividad.tareasSeguimiento.map((tarea) => (
                            <li key={tarea.id} className="flex items-start gap-2 text-sm">
                              <span className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center ${
                                tarea.completada ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 bg-white'
                              }`}>
                                {tarea.completada && (
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </span>
                              <span className={tarea.completada ? 'line-through text-gray-400' : 'text-gray-900'}>
                                {tarea.descripcion}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-gray-900">{actividad.seguimiento || 'Sin registrar'}</p>
                      )}
                    </div>
                  </div>

                  {/* Contador de observaciones y adjuntos */}
                  <div className="flex items-center gap-3 pt-3 border-t border-gray-200">
                    {tieneObservaciones(actividad.observacionesCumplimiento) && (
                      <div className="flex items-center gap-1.5 text-blue-700 text-xs">
                        <FileText className="w-3.5 h-3.5" />
                        <span className="font-semibold">{contarObservaciones(actividad.observacionesCumplimiento)}</span>
                        <span>observación{contarObservaciones(actividad.observacionesCumplimiento) !== 1 ? 'es' : ''}</span>
                      </div>
                    )}
                    {actividad.adjuntos && actividad.adjuntos.length > 0 && (
                      <div className="flex items-center gap-1.5 text-purple-700 text-xs">
                        <Paperclip className="w-3.5 h-3.5" />
                        <span className="font-semibold">{actividad.adjuntos.length}</span>
                        <span>adjunto{actividad.adjuntos.length !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                    {!tieneObservaciones(actividad.observacionesCumplimiento) && 
                     (!actividad.adjuntos || actividad.adjuntos.length === 0) && (
                      <span className="text-xs text-gray-400 italic">Sin evidencias registradas</span>
                    )}
                  </div>
                </div>

                {/* Formulario */}
                <AnimatePresence>
                  {actividadExpandida === actividad.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-t-2 border-blue-200">
                        <h4 className="font-bold mb-4 flex items-center gap-2">
                          <FileCheck className="w-5 h-5 text-blue-600" />
                          Registro de seguimiento
                        </h4>

                        <div className="space-y-4">
                          {/* Mensaje informativo sobre puntos de control */}
                          {actividad.puntosControl && actividad.puntosControl.length > 0 && (
                            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 flex items-start gap-3">
                              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <p className="font-semibold text-green-900 text-sm mb-1">
                                  Actividad con puntos de control configurados
                                </p>
                                <p className="text-xs text-green-700">
                                  <strong>{actividad.puntosControl.filter(p => p.estado === 'completado').length}</strong> de <strong>{actividad.puntosControl.length}</strong> puntos completados • 
                                  Periodicidad: <strong>{actividad.frecuenciaPuntosControl}</strong>
                                </p>
                                <p className="text-xs text-green-600 mt-1">
                                  El porcentaje y la periodicidad se calculan automáticamente según los puntos de control
                                </p>
                              </div>
                            </div>
                          )}

                          {/* % Avance - AUTOMÁTICO si hay puntos de control */}
                          <div className="bg-white rounded-lg border-2 border-gray-200 p-4">
                            <label className="block text-sm font-semibold mb-3 flex items-center gap-2">
                              Porcentaje de avance
                              {actividad.puntosControl && actividad.puntosControl.length > 0 && (
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded uppercase">
                                  Automático
                                </span>
                              )}
                            </label>
                            <div className="flex items-center gap-4">
                              <input
                                type="range"
                                min="0"
                                max="100"
                                step="5"
                                value={formulario.porcentaje}
                                onChange={(e) => setFormulario({ ...formulario, porcentaje: parseInt(e.target.value) })}
                                disabled={!!(actividad.puntosControl && actividad.puntosControl.length > 0)}
                                className="flex-1"
                              />
                              <div className={`w-20 px-4 py-2 border-2 rounded-lg text-center ${
                                actividad.puntosControl && actividad.puntosControl.length > 0 
                                  ? 'bg-green-100 border-green-300' 
                                  : 'bg-gray-100 border-gray-300'
                              }`}>
                                <span className="text-2xl font-bold">{formulario.porcentaje}</span>
                                <span className="text-sm">%</span>
                              </div>
                            </div>
                            {actividad.puntosControl && actividad.puntosControl.length > 0 && (
                              <p className="text-xs text-gray-500 mt-2 italic">
                                Calculado automáticamente: {actividad.puntosControl.filter(p => p.estado === 'completado').length}/{actividad.puntosControl.length} puntos completados
                              </p>
                            )}
                          </div>

                          {/* Control - AUTOMÁTICO si hay frecuencia configurada */}
                          <div className="bg-white rounded-lg border-2 border-gray-200 p-4">
                            <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
                              🔍 Control (periodicidad)
                              {actividad.frecuenciaPuntosControl && (
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded uppercase">
                                  Configurado
                                </span>
                              )}
                            </label>
                            {actividad.frecuenciaPuntosControl ? (
                              <div className="w-full px-4 py-3 bg-blue-50 border-2 border-blue-300 rounded-lg">
                                <p className="font-bold text-blue-900">{formulario.control}</p>
                                <p className="text-xs text-blue-600 mt-1">
                                  Definido en la configuración de puntos de control
                                </p>
                              </div>
                            ) : (
                              <select
                                value={formulario.control}
                                onChange={(e) => setFormulario({ ...formulario, control: e.target.value })}
                                className="w-full px-4 py-2 border-2 rounded-lg"
                              >
                                <option value="">Seleccionar...</option>
                                <option value="Seguimiento mensual">Mensual</option>
                                <option value="Seguimiento bimestral">Bimestral</option>
                                <option value="Seguimiento trimestral">Trimestral</option>
                                <option value="Seguimiento cuatrimestral">Cuatrimestral</option>
                                <option value="Seguimiento semestral">Semestral</option>
                                <option value="Seguimiento anual">Anual</option>
                                <option value="Según necesidad">Según necesidad</option>
                              </select>
                            )}
                          </div>

                          {/* Evaluación */}
                          <div className="bg-white rounded-lg border-2 border-gray-200 p-4">
                            <label className="block text-sm font-semibold mb-2">Evaluación</label>
                            <textarea
                              value={formulario.evaluacion}
                              onChange={(e) => setFormulario({ ...formulario, evaluacion: e.target.value })}
                              className="w-full px-4 py-3 border-2 rounded-lg"
                              placeholder="Estado actual y observaciones..."
                              rows={3}
                            />
                          </div>

                          {/* Seguimiento - Tareas interactivas */}
                          <div className="bg-white rounded-lg border-2 border-green-200 p-4">
                            <label className="text-sm font-semibold mb-3 flex items-center gap-2">
                              Tareas de seguimiento
                              <span className="text-xs text-gray-500 font-normal">({(actividad.tareasSeguimiento || []).filter(t => t.completada).length}/{(actividad.tareasSeguimiento || []).length} completadas)</span>
                            </label>

                            {/* Lista de tareas */}
                            <div className="space-y-2 mt-3">
                              {(actividad.tareasSeguimiento || []).map((tarea) => (
                                <div key={tarea.id} className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                                  tarea.completada ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200 hover:border-blue-300'
                                }`}>
                                  <button
                                    onClick={async () => {
                                      const nombreUsuario = currentUser?.nombre || currentUser?.nombre_completo || plan.jefeOCI?.nombre || 'Usuario';
                                      const nuevasTareas = (actividad.tareasSeguimiento || []).map(t =>
                                        t.id === tarea.id ? { 
                                          ...t, 
                                          completada: !t.completada, 
                                          fechaCompletada: !t.completada ? new Date().toISOString().split('T')[0] : undefined,
                                          completadaPor: !t.completada ? nombreUsuario : undefined 
                                        } : t
                                      );
                                      const nuevoRoles = plan.roles.map(r => ({
                                        ...r,
                                        actividades: r.actividades.map(a =>
                                          a.id === actividad.id ? { ...a, tareasSeguimiento: nuevasTareas } : a
                                        )
                                      }));
                                      onActualizar({ ...plan, roles: nuevoRoles });
                                      // Persistir al backend
                                      try {
                                        await actividadesApi.update(String(actividad.id), {
                                          tareas_seguimiento: nuevasTareas
                                        });
                                      } catch (e) {
                                        console.warn('[Tareas] Error al persistir:', e);
                                      }
                                    }}
                                    className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                      tarea.completada ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 bg-white hover:border-blue-400'
                                    }`}
                                  >
                                    {tarea.completada && (
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                      </svg>
                                    )}
                                  </button>
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-sm ${tarea.completada ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                                      {tarea.descripcion}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                      {(tarea.responsables || []).map((resp, ri) => {
                                        const nombreResp = nombreResponsableTarea(resp);
                                        if (!nombreResp) return null;
                                        return (
                                        <div key={ri} className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5 text-[10px] font-medium">
                                          <div className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center text-white text-[7px] font-bold flex-shrink-0">
                                            {nombreResp.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                          </div>
                                          <span className="text-gray-700">{nombreResp}</span>
                                          <button
                                            onClick={async () => {
                                              const nuevasTareas = (actividad.tareasSeguimiento || []).map(t =>
                                                t.id === tarea.id ? { ...t, responsables: (t.responsables || []).filter((_, idx) => idx !== ri) } : t
                                              );
                                              const nuevoRoles = plan.roles.map(r => ({
                                                ...r,
                                                actividades: r.actividades.map(a =>
                                                  a.id === actividad.id ? { ...a, tareasSeguimiento: nuevasTareas } : a
                                                )
                                              }));
                                              onActualizar({ ...plan, roles: nuevoRoles });
                                              try {
                                                await actividadesApi.update(String(actividad.id), {
                                                  tareas_seguimiento: mapTareasParaBackend(nuevasTareas),
                                                } as any);
                                              } catch (e) {
                                                console.warn('[Tareas] Error al quitar responsable de tarea:', e);
                                              }
                                            }}
                                            className="w-3.5 h-3.5 flex items-center justify-center rounded-full hover:bg-red-100 text-gray-400 hover:text-red-600 text-[8px] transition-colors"
                                          >×</button>
                                        </div>
                                      );
                                      })}
                                      {tarea.fechaCompletado && (
                                        <span className="text-xs text-green-600">Completada: {tarea.fechaCompletado}</span>
                                      )}
                                      {(tarea.responsables || []).length === 0 && (
                                        <select
                                          className="text-xs border-2 border-dashed border-gray-300 rounded-lg px-2 py-0.5 text-gray-500 bg-white"
                                          value=""
                                          onChange={async (e) => {
                                            if (!e.target.value) return;
                                            const auditorSeleccionado = auditores.find(a => a.id === e.target.value);
                                            if (!auditorSeleccionado) return;
                                            const nuevasTareas = (actividad.tareasSeguimiento || []).map(t =>
                                              // Solo permitir un responsable por tarea
                                              t.id === tarea.id ? { ...t, responsables: [auditorSeleccionado.nombre] } : t
                                            );
                                            const nuevoRoles = plan.roles.map(r => ({
                                              ...r,
                                              actividades: r.actividades.map(a =>
                                                a.id === actividad.id ? { ...a, tareasSeguimiento: nuevasTareas } : a
                                              )
                                            }));
                                            onActualizar({ ...plan, roles: nuevoRoles });
                                            try {
                                              await actividadesApi.update(String(actividad.id), {
                                                tareas_seguimiento: mapTareasParaBackend(nuevasTareas),
                                              } as any);
                                            } catch (e2) {
                                              console.warn('[Tareas] Error al asignar responsable de tarea:', e2);
                                            }
                                          }}
                                        >
                                          <option value="">+ Responsable</option>
                                          {auditores
                                            .filter(a => !(tarea.responsables || []).some(r => nombreResponsableTarea(r) === a.nombre))
                                            .map(a => (
                                              <option key={a.id} value={a.id}>{a.nombre} - {a.cargo || 'Profesional'}</option>
                                            ))}
                                        </select>
                                      )}
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => {
                                      const nuevasTareas = (actividad.tareasSeguimiento || []).filter(t => t.id !== tarea.id);
                                      const nuevoRoles = plan.roles.map(r => ({
                                        ...r,
                                        actividades: r.actividades.map(a =>
                                          a.id === actividad.id ? { ...a, tareasSeguimiento: nuevasTareas } : a
                                        )
                                      }));
                                      onActualizar({ ...plan, roles: nuevoRoles });
                                    }}
                                    className="mt-0.5 w-6 h-6 flex items-center justify-center rounded-full bg-red-50 border border-red-200 text-red-400 hover:bg-red-100 hover:text-red-600 transition-colors flex-shrink-0"
                                    title="Eliminar tarea"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>

                            {/* Agregar nueva tarea */}
                            <div className="mt-3 flex gap-2">
                              <input
                                type="text"
                                data-tarea-input-dep={actividad.id}
                                placeholder="Agregar nueva tarea de seguimiento..."
                                className="flex-1 px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm focus:border-green-400 focus:outline-none"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                                    const descripcion = (e.target as HTMLInputElement).value.trim();
                                    const nuevaTarea: TareaSeguimiento = {
                                      id: `tarea-${Date.now()}`,
                                      descripcion,
                                      completada: false,
                                    };
                                    const nuevasTareas = [...(actividad.tareasSeguimiento || []), nuevaTarea];
                                    const nuevoRoles = plan.roles.map(r => ({
                                      ...r,
                                      actividades: r.actividades.map(a =>
                                        a.id === actividad.id ? { ...a, tareasSeguimiento: nuevasTareas } : a
                                      )
                                    }));
                                    onActualizar({ ...plan, roles: nuevoRoles });
                                    (e.target as HTMLInputElement).value = '';
                                  }
                                }}
                              />
                              <button
                                onClick={() => {
                                  const input = document.querySelector<HTMLInputElement>(`[data-tarea-input-dep="${actividad.id}"]`);
                                  if (input && input.value.trim()) {
                                    const nuevaTarea: TareaSeguimiento = {
                                      id: `tarea-${Date.now()}`,
                                      descripcion: input.value.trim(),
                                      completada: false,
                                    };
                                    const nuevasTareas = [...(actividad.tareasSeguimiento || []), nuevaTarea];
                                    const nuevoRoles = plan.roles.map(r => ({
                                      ...r,
                                      actividades: r.actividades.map(a =>
                                        a.id === actividad.id ? { ...a, tareasSeguimiento: nuevasTareas } : a
                                      )
                                    }));
                                    onActualizar({ ...plan, roles: nuevoRoles });
                                    input.value = '';
                                  }
                                }}
                                className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium flex items-center gap-1"
                              >
                                <Plus className="w-4 h-4" /> Agregar
                              </button>
                            </div>

                            {/* Campo de texto libre para seguimiento general */}
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <label className="text-xs text-gray-500 mb-1 block">Notas generales de seguimiento</label>
                              <textarea
                                value={formulario.seguimiento}
                                onChange={(e) => setFormulario({ ...formulario, seguimiento: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg text-sm"
                                placeholder="Notas adicionales..."
                                rows={2}
                              />
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                              ️ Este campo es diferente de las <strong>Observaciones</strong> del botón "Gestionar evidencias" (abajo). Aquí registra las acciones concretas realizadas.
                            </p>
                          </div>

                          {/* RESPONSABLES - fila compacta */}
                          <div className="flex flex-wrap items-center gap-1.5 text-xs">
                            <Users className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="text-[10px] font-bold text-blue-500 uppercase shrink-0">Principal:</span>
                            <span className="font-medium text-gray-800">{actividad.responsable?.nombre || 'Sin asignar'}</span>
                            {actividad.responsablesApoyo && actividad.responsablesApoyo.length > 0 && (
                              <>
                                <span className="text-gray-300">·</span>
                                <span className="text-[10px] font-bold text-purple-500 uppercase shrink-0">Apoyo:</span>
                                {actividad.responsablesApoyo.map((resp) => (
                                  <span key={resp.id} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-purple-50 border border-purple-200 rounded-full text-[10px] text-purple-800">
                                    {resp.nombre}
                                    <button onClick={() => { if (confirm(`¿Eliminar a ${resp.nombre}?`)) eliminarResponsableApoyo(rol.numero, actividad.id, resp.id); }} className="text-purple-400 hover:text-red-500 leading-none ml-0.5">×</button>
                                  </span>
                                ))}
                              </>
                            )}
                            <button
                              onClick={() => setMostrarSelectorApoyo(!mostrarSelectorApoyo)}
                              className="px-1.5 py-0.5 bg-purple-100 hover:bg-purple-200 text-purple-700 text-[10px] rounded font-medium"
                            >+ apoyo</button>
                            {mostrarSelectorApoyo && (
                              <div className="w-full mt-1 flex flex-wrap gap-1">
                                {auditores.filter(aud => aud.id !== actividad.responsable?.id && !(actividad.responsablesApoyo || []).some(r => r.id === aud.id)).map((auditor) => (
                                  <button
                                    key={auditor.id}
                                    onClick={() => { agregarResponsableApoyo(rol.numero, actividad.id, auditor); setMostrarSelectorApoyo(false); }}
                                    className="px-2 py-0.5 bg-white hover:bg-purple-50 border border-purple-200 rounded text-[11px] text-gray-700"
                                  >{auditor.nombre}</button>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Archivos Adjuntos y Observaciones */}
                          <div className="bg-white rounded-lg border-2 border-gray-200 p-4">
                            <div className="flex items-center justify-between mb-3">
                              <label className="block text-sm font-semibold flex items-center gap-2">
                                <Paperclip className="w-4 h-4 text-gray-600" />
                                Evidencias de cumplimiento
                              </label>
                              <button
                                onClick={() => setModalAdjuntos({ actividadId: actividad.id, rolNumero: rol.numero })}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-medium flex items-center gap-2"
                              >
                                <Upload className="w-4 h-4" />
                                Gestionar evidencias
                              </button>
                            </div>
                            
                            {/* Archivos */}
                            <div className="text-sm mb-3">
                              {actividad.adjuntos && actividad.adjuntos.length > 0 ? (
                                <div className="flex items-center gap-2 text-green-700">
                                  <FileText className="w-4 h-4" />
                                  <span className="font-semibold">{actividad.adjuntos.length} archivo(s) adjunto(s)</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 text-gray-500">
                                  <AlertCircle className="w-4 h-4" />
                                  Sin archivos adjuntos
                                </div>
                              )}
                            </div>

                            {/* Observaciones de Cumplimiento - SISTEMA DE MaLTIPLES ENTRADAS */}
                            <div className="bg-white rounded-lg border-2 border-gray-200 p-4">
                              <label className="block text-sm font-semibold mb-3 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-blue-600" />
                                📝 Observaciones de cumplimiento
                              </label>

                              {/* Historial de observaciones */}
                              {Array.isArray(actividad.observacionesCumplimiento) && tieneObservaciones(actividad.observacionesCumplimiento) && (
                                <div className="space-y-2 mb-3 max-h-64 overflow-y-auto">
                                  {actividad.observacionesCumplimiento.map((obs: ObservacionCumplimiento) => (
                                    <div key={obs.id} className="bg-blue-50 border border-blue-200 rounded-lg p-3 relative group">
                                      <div className="flex items-start gap-2 mb-2">
                                        <div className="flex-1">
                                          <p className="text-xs font-semibold text-blue-900 flex items-center gap-2">
                                            <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                                            {obs.registradoPor}
                                          </p>
                                          <p className="text-[10px] text-blue-600">
                                            {new Date(obs.fechaRegistro).toLocaleString('es-CO', { 
                                              dateStyle: 'short', 
                                              timeStyle: 'short' 
                                            })}
                                          </p>
                                        </div>
                                        <button
                                          onClick={() => {
                                            if (confirm('¿Eliminar esta observación?')) {
                                              eliminarObservacion(rol.numero, actividad.id, obs.id);
                                            }
                                          }}
                                          className="opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-800 p-1"
                                          title="Eliminar observación"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                      <p className="text-sm text-blue-900 whitespace-pre-wrap">{obs.texto}</p>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Formulario para nueva observación */}
                              <div className="flex gap-2">
                                <textarea
                                  value={nuevaObservacion}
                                  onChange={(e) => setNuevaObservacion(e.target.value)}
                                  className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                                  placeholder="Escribe una nueva observación..."
                                  rows={2}
                                />
                                <button
                                  onClick={() => agregarObservacion(rol.numero, actividad.id)}
                                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-medium flex items-center gap-2 self-start"
                                >
                                  <Plus className="w-4 h-4" />
                                  Agregar
                                </button>
                              </div>

                              {!tieneObservaciones(actividad.observacionesCumplimiento) && (
                                <p className="text-xs text-gray-500 italic mt-2">No hay observaciones registradas</p>
                              )}
                            </div>
                          </div>

                          {/* Sistema de Autorización del Jefe OCI - CONFIGURADO EN CREACIN */}
                          {actividad.requiereAutorizacionJefeOCI && (
                            <div className="bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-300 rounded-lg p-4">
                              <div className="flex items-start gap-3 mb-3">
                                <svg className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                </svg>
                                <div className="flex-1">
                                  <p className="font-semibold text-orange-900 mb-1">
                                    🔒 Requiere Autorización del Jefe OCI
                                  </p>
                                  <p className="text-xs text-orange-700">
                                    Esta actividad fue configurada en la creación del Plan para requerir autorización del Jefe de la OCI antes de completarse al 100%
                                  </p>
                                </div>
                              </div>

                              {/* Estado de Autorización */}
                              {formulario.porcentaje === 100 && (
                                <div className="mt-3 pt-3 border-t-2 border-orange-300">
                                  {actividad.autorizadaPorJefeOCI ? (
                                    <div className="bg-green-50 border-2 border-green-300 rounded-lg p-3">
                                      <div className="flex items-center gap-2 text-green-800 mb-2">
                                        <CheckCircle2 className="w-5 h-5" />
                                        <p className="font-bold">✅ Autorizada por el Jefe OCI</p>
                                      </div>
                                      <p className="text-xs text-green-700">
                                        Fecha: {actividad.fechaAutorizacion ? new Date(actividad.fechaAutorizacion).toLocaleString('es-CO') : 'N/A'}
                                      </p>
                                      {actividad.observacionesJefeOCI && (
                                        <div className="mt-2 pt-2 border-t border-green-200">
                                          <p className="text-xs font-semibold text-green-900">Observaciones del Jefe OCI:</p>
                                          <p className="text-sm text-green-800 mt-1">{actividad.observacionesJefeOCI}</p>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-3">
                                      <p className="text-sm font-bold text-yellow-900 mb-2 flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4" />
                                        ⏳ Pendiente de autorización del Jefe OCI
                                      </p>
                                      <p className="text-xs text-yellow-800 mb-3">
                                        Esta actividad alcanzará el 100% pero requiere la autorización del Jefe OCI para considerarse completada.
                                      </p>
                                      
                                      {/* Solo el Jefe OCI puede autorizar */}
                                      <div className="space-y-2">
                                        <textarea
                                          placeholder="Observaciones del Jefe OCI (opcional)..."
                                          className="w-full px-3 py-2 border-2 border-yellow-300 rounded-lg text-sm"
                                          rows={2}
                                          id={`obs-jefe-OCI-${actividad.id}`}
                                        />
                                        <button
                                          onClick={() => {
                                            const observaciones = (document.getElementById(`obs-jefe-OCI-${actividad.id}`) as HTMLTextAreaElement)?.value || '';
                                            const planActualizado = {
                                              ...plan,
                                              roles: plan.roles.map(r => {
                                                if (r.numero === rol.numero) {
                                                  return {
                                                    ...r,
                                                    actividades: r.actividades.map(act => {
                                                      if (act.id === actividad.id) {
                                                        return {
                                                          ...act,
                                                          autorizadaPorJefeOCI: true,
                                                          fechaAutorizacion: new Date().toISOString(),
                                                          observacionesJefeOCI: observaciones
                                                        };
                                                      }
                                                      return act;
                                                    })
                                                  };
                                                }
                                                return r;
                                              })
                                            };
                                            onActualizar(planActualizado);
                                            toast.success('Actividad autorizada por el Jefe OCI');
                                          }}
                                          className="w-full px-4 py-2 bg-gradient-to-r from-orange-600 to-orange-700 hover:shadow-lg text-white rounded-lg font-semibold flex items-center justify-center gap-2"
                                        >
                                          <CheckCircle2 className="w-4 h-4" />
                                          Autorizar como Jefe OCI
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Configuración de Verificación del Director */}
                          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-lg p-4">
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={actividad.requiereVerificacionDirector}
                                onChange={(e) => {
                                  const planActualizado = {
                                    ...plan,
                                    roles: plan.roles.map(r => {
                                      if (r.numero === rol.numero) {
                                        return {
                                          ...r,
                                          actividades: r.actividades.map(act => {
                                            if (act.id === actividad.id) {
                                              return { ...act, requiereVerificacionDirector: e.target.checked };
                                            }
                                            return act;
                                          })
                                        };
                                      }
                                      return r;
                                    })
                                  };
                                  onActualizar(planActualizado);
                                }}
                                className="w-5 h-5 text-orange-600 border-2 border-gray-300 rounded focus:ring-2 focus:ring-orange-500"
                              />
                              <div className="flex-1">
                                <p className="font-semibold text-orange-900 flex items-center gap-2">
                                  <Shield className="w-4 h-4" />
                                  Requiere verificación del Director OCI
                                </p>
                                <p className="text-xs text-orange-700 mt-1">
                                  Si se marca, esta actividad solo se considerará completada después de la verificación y aprobación del Director de la Oficina de Control Interno
                                </p>
                              </div>
                            </label>

                            {/* Estado de Verificación */}
                            {actividad.requiereVerificacionDirector && actividad.porcentajeAvance === 100 && (
                              <div className="mt-4 pt-4 border-t-2 border-amber-300">
                                {actividad.verificadaPorDirector ? (
                                  <div className="bg-green-50 border-2 border-green-300 rounded-lg p-3">
                                    <div className="flex items-center gap-2 text-green-800 mb-2">
                                      <CheckCircle2 className="w-5 h-5" />
                                      <p className="font-bold">✅ Verificada por el Director OCI</p>
                                    </div>
                                    <p className="text-xs text-green-700">
                                      Fecha: {actividad.fechaVerificacion ? new Date(actividad.fechaVerificacion).toLocaleString('es-CO') : 'N/A'}
                                    </p>
                                    {actividad.observacionesDirector && (
                                      <div className="mt-2 pt-2 border-t border-green-200">
                                        <p className="text-xs font-semibold text-green-900">Observaciones del Director:</p>
                                        <p className="text-sm text-green-800 mt-1">{actividad.observacionesDirector}</p>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-3">
                                    <p className="text-sm font-bold text-yellow-900 mb-2 flex items-center gap-2">
                                      <AlertCircle className="w-4 h-4" />
                                      ⏳ Pendiente de verificación del Director
                                    </p>
                                    <p className="text-xs text-yellow-800 mb-3">
                                      Esta actividad ha sido completada pero requiere la verificación y aprobación del Director de Control Interno para ser considerada finalizada.
                                    </p>
                                    
                                    {/* Solo el Director puede verificar - simulación de permisos */}
                                    <div className="space-y-2">
                                      <textarea
                                        placeholder="Observaciones del Director (opcional)..."
                                        className="w-full px-3 py-2 border-2 border-yellow-300 rounded-lg text-sm"
                                        rows={2}
                                        id={`obs-director-${actividad.id}`}
                                      />
                                      <button
                                        onClick={() => {
                                          const observaciones = (document.getElementById(`obs-director-${actividad.id}`) as HTMLTextAreaElement)?.value || '';
                                          const planActualizado = {
                                            ...plan,
                                            roles: plan.roles.map(r => {
                                              if (r.numero === rol.numero) {
                                                return {
                                                  ...r,
                                                  actividades: r.actividades.map(act => {
                                                    if (act.id === actividad.id) {
                                                      return {
                                                        ...act,
                                                        verificadaPorDirector: true,
                                                        fechaVerificacion: new Date().toISOString(),
                                                        observacionesDirector: observaciones
                                                      };
                                                    }
                                                    return act;
                                                  })
                                                };
                                              }
                                              return r;
                                            })
                                          };
                                          onActualizar(planActualizado);
                                          toast.success('Actividad verificada por el Director');
                                        }}
                                        className="w-full px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:shadow-lg text-white rounded-lg font-semibold flex items-center justify-center gap-2"
                                      >
                                        <CheckCircle2 className="w-4 h-4" />
                                        Verificar como Director OCI
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Botones */}
                          <div className="flex gap-3">
                            <button
                              onClick={() => guardarSeguimiento(rol.numero, actividad.id)}
                              className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2"
                            >
                              <Check className="w-5 h-5" />
                              Guardar
                            </button>
                            <button
                              onClick={() => {
                                setActividadExpandida(null);
                                setNuevaObservacion('');
                                setMostrarSelectorApoyo(false);
                              }}
                              className="px-6 py-3 bg-gray-200 hover:bg-gray-300 rounded-lg font-semibold"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      ))}
      {/* Modal de Adjuntos */}
      {modalAdjuntos && (
        <ModalGestionAdjuntos
          actividad={plan.roles
            .find(r => r.numero === modalAdjuntos.rolNumero)
            ?.actividades.find(a => a.id === modalAdjuntos.actividadId)!}
          autorNombre={currentUser?.nombre || currentUser?.nombre_completo || plan.jefeOCI?.nombre || 'Usuario'}
          onCerrar={() => setModalAdjuntos(null)}
          onActualizar={(adjuntos, observaciones) => {
            const planActualizado = {
              ...plan,
              roles: plan.roles.map(rol => {
                if (rol.numero === modalAdjuntos.rolNumero) {
                  return {
                    ...rol,
                    actividades: rol.actividades.map(act => {
                      if (act.id === modalAdjuntos.actividadId) {
                        return { ...act, adjuntos, observacionesCumplimiento: observaciones };
                      }
                      return act;
                    })
                  };
                }
                return rol;
              })
            };
            onActualizar(planActualizado);
            toast.success('Evidencias y observaciones actualizadas correctamente');
          }}
        />
      )}
    </motion.div>
  );
}

// """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
// SECCIN 3: APROBACIN (antes Sección 4)
// """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""

const ESTADO_PLAN_A_BACKEND: Record<EstadoPlan, string> = {
  BORRADOR: 'borrador',
  EN_REVISION: 'en-revision',
  APROBADO: 'aprobado',
  VIGENTE: 'en-ejecucion',
  CERRADO: 'completado',
  DEVUELTO: 'borrador', // Backend doesn't have devuelto yet, fallback to borrador
};

function SeccionAprobacion({ plan, onActualizar, onRefetchPlan, puedeAprobarPlan = false, puedeActivarPlan = false, puedeEditarPlan = false, aprobadoresComite = [] }: { plan: PlanAnual; onActualizar: (plan: PlanAnual) => void; onRefetchPlan?: () => void; puedeAprobarPlan?: boolean; puedeActivarPlan?: boolean; puedeEditarPlan?: boolean; aprobadoresComite?: Auditor[]; }) {
  const [guardando, setGuardando] = useState(false);
  const [notificandoResponsable, setNotificandoResponsable] = useState(false);
  const currentUser = (window as any).__esap_auth_cache || null;

  const emailSesion = (currentUser?.email || currentUser?.person?.email || currentUser?.usuario?.email || '').trim().toLowerCase();
  const emailResponsablePlan = (plan.jefeOCI?.email || '').trim().toLowerCase();
  const idsSesion = [currentUser?.idPerson, currentUser?.id, currentUser?.userId, currentUser?.sub, currentUser?.documento, currentUser?.person?.id, currentUser?.usuario?.id]
    .filter((v: unknown) => v != null && String(v).length > 0)
    .map((v: unknown) => String(v));
  const idResponsablePlan = plan.jefeOCI?.id != null && plan.jefeOCI.id !== '' && plan.jefeOCI.id !== '1' ? String(plan.jefeOCI.id) : '';

  // Normalizar nombres para comparación (quitar tildes, espacios extra, minúsculas)
  const normalizarNombre = (n: string) => (n || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
  const nombreSesion = normalizarNombre(
    currentUser?.nombre || currentUser?.nombre_completo || currentUser?.fullName || currentUser?.full_name
    || currentUser?.person?.full_name || currentUser?.person?.fullName || currentUser?.person?.nombre
    || ((currentUser?.person?.first_name || currentUser?.firstName || '') + ' ' + (currentUser?.person?.last_name || currentUser?.lastName || '')).trim()
    || currentUser?.usuario?.nombre || ''
  );
  const nombreResponsablePlan = normalizarNombre(plan.jefeOCI?.nombre || '');

  const textoPerfilSesion = [
    currentUser?.cargo,
    currentUser?.rol,
    currentUser?.role,
    currentUser?.perfil,
    currentUser?.profile,
    currentUser?.person?.cargo,
    currentUser?.person?.rol,
    currentUser?.usuario?.cargo,
    currentUser?.usuario?.rol,
  ]
    .filter((v: unknown) => typeof v === 'string' && String(v).trim().length > 0)
    .map((v: unknown) => String(v).toLowerCase())
    .join(' | ');
  const esUsuarioJefeOCI = puedeActivarPlan
    || textoPerfilSesion.includes('jefe oci')
    || textoPerfilSesion.includes('jefe ocig')
    || textoPerfilSesion.includes('jefe')
    || textoPerfilSesion.includes('director');


  const esResponsableDelPlan = !!currentUser && (
    // 1. Match por ID (responsable_id del plan vs IDs del usuario en sesión)
    (idResponsablePlan && idsSesion.some((x) => x === idResponsablePlan))
    // 2. Match por email (si ambos tienen email)
    || (emailSesion && emailResponsablePlan && emailSesion === emailResponsablePlan)
    // 3. Fallback: Match por nombre completo normalizado (cuando backend no provee email ni IDs coinciden)
    || (nombreSesion && nombreResponsablePlan && nombreSesion.length > 3 && nombreSesion === nombreResponsablePlan)
  );
  const puedeEnviarComiteComoResponsable = esResponsableDelPlan && esUsuarioJefeOCI;

  // DEBUG: Diagnóstico de por qué no sale el botón de enviar a comité
  console.log('[SeccionAprobacion] DEBUG responsable:', {
    esResponsableDelPlan,
    puedeEditarPlan,
    estadoPlan: plan.estado,
    emailSesion,
    emailResponsablePlan,
    coincidenEmails: emailSesion === emailResponsablePlan,
    idsSesion,
    idResponsablePlan,
    coincidenIds: idResponsablePlan ? idsSesion.some((x) => x === idResponsablePlan) : 'no hay idResponsable',
    nombreSesion,
    nombreResponsablePlan,
    coincidenNombres: nombreSesion === nombreResponsablePlan,
    jefeOCI_raw: plan.jefeOCI,
    currentUser_raw: { email: currentUser?.email, personEmail: currentUser?.person?.email, id: currentUser?.id, idPerson: currentUser?.idPerson, userId: currentUser?.userId, sub: currentUser?.sub, nombre: currentUser?.nombre, fullName: currentUser?.fullName, personFullName: currentUser?.person?.full_name, firstName: currentUser?.person?.first_name, lastName: currentUser?.person?.last_name, personId: currentUser?.person?.id },

  });


  const [modalObservacion, setModalObservacion] = useState<{ isOpen: boolean, auditorId: string | null, texto: string }>({ isOpen: false, auditorId: null, texto: '' });
  const [modalSubsanar, setModalSubsanar] = useState({ isOpen: false, texto: '' });

  const [modalOTPConfig, setModalOTPConfig] = useState<{
    isOpen: boolean;
    accion: 'enviar_comite' | 'aprobar_auditor' | null;
    auditorId: string | null;
    userName: string;
    userEmail: string;
    detalle: string;
  }>({
    isOpen: false,
    accion: null,
    auditorId: null,
    userName: '',
    userEmail: '',
    detalle: '',
  });

  const [isEditingCommittee, setIsEditingCommittee] = useState(false);
  const [comiteDraft, setComiteDraft] = useState<Auditor[]>(plan.equipoAprobacion || []);
  const [ordenDraft, setOrdenDraft] = useState<'secuencial' | 'paralelo'>(plan.ordenAprobacion || 'secuencial');
  const [isTraceExpanded, setIsTraceExpanded] = useState(true);

  // Aplicar el comité real o usar vacío
  const equipo = plan.equipoAprobacion || [];
  
  const currentUserIsMember = equipo.some(a => {
    const emA = (a.email || '').trim().toLowerCase();
    if (emailSesion && emA && emailSesion === emA) return true;
    const aid = a.id != null ? String(a.id) : '';
    return !!(aid && idsSesion.some((id) => id === aid));
  });
  const esComitePuro = puedeAprobarPlan && !puedeEditarPlan;

  if (esComitePuro && !currentUserIsMember && plan.estado === 'EN_REVISION') {
    return (
      <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 m-6 mt-2">
        <Shield className="w-12 h-12 mx-auto mb-3 text-gray-400" />
        <h3 className="text-lg font-bold text-gray-900 mb-2">Sin asignación pendiente</h3>
        <p>Este plan se encuentra en revisión, pero no has sido designado como miembro del comité de aprobación para esta vigencia.</p>
      </div>
    );
  }
  const historial = (plan.equipoAprobacion || []).map(a => ({
    ...a,
    auditorId: a.id || a.auditorId,
    auditorNombre: a.nombre || a.auditorNombre,
    estado: (a.estado as any) || 'PENDIENTE'
  }));

  const fueDevuelto = plan.estado === 'DEVUELTO' || historial.some(h => h.estado === 'OBSERVADA');

  const { esMiTurnoComoAprobador, aprobadorMiTurno } = useMemo(() => {
    const coincideSesionConAprobador = (a: Auditor) => {
      const emA = (a.email || '').trim().toLowerCase();
      if (emailSesion && emA && emailSesion === emA) return true;
      const aid = a.id != null ? String(a.id) : '';
      return !!(aid && idsSesion.some((id) => id === aid));
    };
    if (plan.estado !== 'EN_REVISION' || !equipo.length) {
      return { esMiTurnoComoAprobador: false, aprobadorMiTurno: null as Auditor | null };
    }
    const idxUsuario = equipo.findIndex(coincideSesionConAprobador);
    if (idxUsuario === -1) {
      return { esMiTurnoComoAprobador: false, aprobadorMiTurno: null as Auditor | null };
    }
    const aprobador = equipo[idxUsuario];
    const track = historial.find(h => h.auditorId === aprobador.id) || { estado: 'PENDIENTE' };
    const isPendiente = track.estado === 'PENDIENTE';
    if (!isPendiente) {
      return { esMiTurnoComoAprobador: false, aprobadorMiTurno: null as Auditor | null };
    }
    const isSecuencial = plan.ordenAprobacion === 'secuencial';
    let isWaitingTurn = false;
    if (isSecuencial) {
      const firstPendingIdx = equipo.findIndex((ap) => {
        const t = historial.find(hi => hi.auditorId === ap.id);
        return !t || t.estado === 'PENDIENTE';
      });
      if (firstPendingIdx !== -1 && idxUsuario > firstPendingIdx) isWaitingTurn = true;
    }
    const isActiveTurn = !isWaitingTurn && isPendiente;
    return {
      esMiTurnoComoAprobador: isActiveTurn,
      aprobadorMiTurno: isActiveTurn ? aprobador : null,
    };
  }, [plan.estado, plan.ordenAprobacion, equipo, historial, emailSesion, idsSesion]);

  const cambiarEstadoGeneral = async (nuevoEstado: EstadoPlan, historialPersonalizado?: any[]) => {
    const arrHistorial = historialPersonalizado || plan.historialAprobaciones || historial;
    const planActualizado = {
      ...plan,
      estado: nuevoEstado,
      historialAprobaciones: arrHistorial,
      fechaAprobacion: nuevoEstado === 'APROBADO' ? new Date().toISOString() : plan.fechaAprobacion
    };
    onActualizar(planActualizado);
    setGuardando(true);
    try {
      const estadoBackend = ESTADO_PLAN_A_BACKEND[nuevoEstado];
      const payload: any = { 
        estado: estadoBackend as any,
        equipo_aprobacion: arrHistorial
      };
      
      const res = await planAnualApi.update(plan.id, payload);
      if (res.success) {
        toast.success('Cambio Registrado', { description: `Trazabilidad guardada en la base de datos.` });
        onRefetchPlan?.();
      } else {
        toast.error('Error al guardar', { description: res.error });
        onRefetchPlan?.();
      }
    } catch (e: any) {
      console.error("Excepción en cambiarEstadoGeneral:", e);
      let msg = 'No se pudo guardar el estado en el servidor. ';
      if (e?.response?.data?.message) {
        msg += typeof e.response.data.message === 'string' 
          ? e.response.data.message 
          : JSON.stringify(e.response.data.message);
      } else if (e?.message) {
        msg += e.message;
      }
      
      const status = e?.response?.status;
      if (status === 403) {
        msg = `Operación denegada (403 Forbidden). Por favor repórtele al administrador del sistema que verifique sus permisos (ej. CIP.PLAN_ANUAL_APPROVE).`;
      }

      toast.error('Operación Fallida', { description: msg, duration: 10000 });
      onRefetchPlan?.();
    } finally {
      setGuardando(false);
    }
  };

  const handleAprobarAuditor = (auditorId: string, nombre: string, email?: string) => {
    const sessionUser = (window as any).__esap_auth_cache || {};
    setModalOTPConfig({
      isOpen: true,
      accion: 'aprobar_auditor',
      auditorId,
      userName: sessionUser.nombre || nombre,
      userEmail: sessionUser.email || email || '',
      detalle: 'Aprobación de Miembro de Comité PAI',
    });
  };

  const nombreSolicitanteSesion = () => {
    const u = (window as any).__esap_auth_cache || {};
    return (
      u.nombre ||
      u.nombre_completo ||
      u.fullName ||
      u.full_name ||
      u.person?.full_name ||
      `${u.person?.first_name || ''} ${u.person?.last_name || ''}`.trim() ||
      u.email ||
      'Colaborador OCI'
    );
  };

  const handleNotificarResponsable = async () => {
    if (!plan.jefeOCI?.nombre && !plan.jefeOCI?.email) {
      toast.error('No hay responsable asignado al plan');
      return;
    }
    if (puedeEnviarComiteComoResponsable) {
      toast.info('Tú eres el responsable del plan', {
        description: 'Usa el botón «Enviar a Comité de Aprobación» cuando el plan esté completo.',
      });
      return;
    }

    setNotificandoResponsable(true);
    try {
      const res = await planAnualApi.notificarResponsable(plan.id, {
        solicitanteNombre: nombreSolicitanteSesion(),
        responsableEmail: plan.jefeOCI?.email?.trim() || undefined,
      });
      if (!res.success || !res.data) {
        toast.error('No se pudo notificar al responsable', {
          description: res.error || 'Error desconocido',
        });
        return;
      }
      const { destinatarioNombre, porcentajeAsignacion, listoParaEnvio } = res.data;
      toast.success(`Notificación enviada a ${destinatarioNombre}`, {
        description: listoParaEnvio
          ? 'El plan está al 100% de asignación. El responsable puede enviarlo al comité PAI.'
          : `Asignación al ${porcentajeAsignacion}%. El responsable debe completar pendientes antes del envío.`,
        duration: 8000,
      });
      onRefetchPlan?.();
    } catch (e: any) {
      console.error('Error notificando responsable:', e);
      toast.error('Error al notificar al responsable', {
        description: e?.message || 'Intente nuevamente',
      });
    } finally {
      setNotificandoResponsable(false);
    }
  };

  const handleEnviarComiteOTP = () => {
    if (!puedeEnviarComiteComoResponsable) {
      toast.error('Solo el Jefe OCI responsable puede enviar al comité', {
        description: `Coordina con ${plan.jefeOCI?.nombre || 'el responsable asignado'} o usa «Notificar al responsable».`,
      });
      return;
    }
    if (fueDevuelto) {
      setModalSubsanar({ isOpen: true, texto: '' });
    } else {
      const sessionUser = (window as any).__esap_auth_cache || {};
      setModalOTPConfig({
        isOpen: true,
        accion: 'enviar_comite',
        auditorId: null,
        userName: sessionUser.nombre || plan.responsable || 'Responsable del Plan',
        userEmail: sessionUser.email || '',
        detalle: 'Envío del Proyecto al Comité de Aprobación',
      });
    }
  };

  const procesarAccionOTP = (metadata: FirmaElectronicaMetadata) => {
    if (modalOTPConfig.accion === 'aprobar_auditor' && modalOTPConfig.auditorId) {
      ejecutarAprobacionReal(modalOTPConfig.auditorId, metadata);
    } else if (modalOTPConfig.accion === 'enviar_comite') {
      cambiarEstadoGeneral('EN_REVISION');
    }
  };

  const handleConfirmarSubsanacion = () => {
    if (!modalSubsanar.texto.trim()) return;
    
    // Convertir de OBSERVADA a PENDIENTE, guardando el comentario de subsanación
    const nuevoHistorial = historial.map(h => 
      h.estado === 'OBSERVADA' 
        ? { ...h, estado: 'PENDIENTE' as const, respuestaSubsanacion: modalSubsanar.texto, fechaRespuesta: new Date().toISOString() } 
        : h
    );
    
    setModalSubsanar({ isOpen: false, texto: '' });
    toast.success('Subsanación enviada exitosamente', { description: 'El plan regresó a fase de revisión de firmas.' });
    
    // Al re-enviarlo por subsanación no requiere firma OTP, va directo a revisión
    cambiarEstadoGeneral('EN_REVISION', nuevoHistorial);
  };

  const ejecutarAprobacionReal = (auditorId: string, metadata: FirmaElectronicaMetadata) => {
    const nuevoHistorial = historial.map(h => 
      h.auditorId === auditorId ? { 
        ...h, 
        estado: 'APROBADA' as const, 
        fecha: metadata.fechaFirma,
        firmaElectronica: metadata
      } : h
    );
    
    if (nuevoHistorial.every(h => h.estado === 'APROBADA')) {
      cambiarEstadoGeneral('APROBADO', nuevoHistorial);
    } else {
      // Guardar trazabilidad intermedia sin cambiar el estado general (sigue EN_REVISION)
      cambiarEstadoGeneral('EN_REVISION', nuevoHistorial);
    }
  };

  const handleRechazarObservacion = () => {
    if (!modalObservacion.auditorId || !modalObservacion.texto.trim()) return;
    
    const nuevoHistorial = historial.map(h => 
      h.auditorId === modalObservacion.auditorId 
        ? { ...h, estado: 'OBSERVADA' as const, observacion: modalObservacion.texto, fecha: new Date().toISOString() } 
        : h
    );
    
    setModalObservacion({ isOpen: false, auditorId: null, texto: '' });
    toast.error('Plan devuelto con observaciones', { description: 'El plan regresó a fase de ajustes.' });
    
    // Almacenar forzosamente la observación en el payload del equipo
    cambiarEstadoGeneral('DEVUELTO', nuevoHistorial);
  };

  const exportarTrazabilidadAprobacionCSV = () => {
    try {
      const escapeCSV = (str?: string) => {
        if (!str) return '""';
        return `"${str.replace(/"/g, '""')}"`;
      };

      const cabeceras = [
        'Fase',
        'Nombre del Actor',
        'Rol',
        'Estado',
        'Fecha de Accion',
        'Observacion',
        'Respuesta de Subsanacion',
        'ID Firma Electronica',
        'IP Origen'
      ].join(';');

      const fase1 = [
        '"Fase 1: Creación y Formulación Inicial"',
        escapeCSV(plan.jefeOCI?.nombre || 'Administrador OCI'),
        '"Autor del Plan"',
        '"COMPLETADO"',
        escapeCSV(plan.fechaCreacion ? new Date(plan.fechaCreacion).toLocaleString('es-CO') : ''),
        '""',
        '""',
        '""',
        '""'
      ].join(';');

      const filasAprobadores = equipo.map(aprobador => {
        const track = historial.find(h => h.auditorId === aprobador.id) || { estado: 'PENDIENTE' } as any;
        return [
          '"Fase 2: Aprobación PAI"',
          escapeCSV(aprobador.nombre),
          escapeCSV(aprobador.cargo || 'Comité'),
          escapeCSV(track.estado),
          escapeCSV(track.fecha ? new Date(track.fecha).toLocaleString('es-CO') : ''),
          escapeCSV(track.observacion),
          escapeCSV(track.respuestaSubsanacion),
          escapeCSV(track.firmaElectronica?.hash || track.firmaElectronica?.id),
          escapeCSV(track.firmaElectronica?.ip)
        ].join(';');
      });

      const fase3 = [
        '"Fase 3: Activación Oficial"',
        '"Sistema"',
        '"Plataforma"',
        `"${plan.estado === 'VIGENTE' ? 'VIGENTE' : 'PENDIENTE'}"`,
        escapeCSV(plan.fechaAprobacion ? new Date(plan.fechaAprobacion).toLocaleString('es-CO') : ''),
        '""',
        '""',
        '""',
        '""'
      ].join(';');

      const csvContent = ['sep=;', cabeceras, fase1, ...filasAprobadores, fase3].join('\n');
      
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Trazabilidad_Aprobacion_Plan_Anual_${plan.vigencia || new Date().getFullYear()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Trazabilidad de aprobación exportada correctamente');
    } catch (e) {
      toast.error('Error al exportar la trazabilidad en CSV');
      console.error(e);
    }
  };

  const totalActividades = plan.roles.reduce((sum, rol) => sum + rol.actividades.length, 0);
  const actividadesAsignadas = plan.roles.reduce((sum, rol) => sum + rol.actividades.filter(a => a.responsable !== null).length, 0);
  const porcentajeAsignacion = totalActividades ? Math.round((actividadesAsignadas / totalActividades) * 100) : 0;

  const puedeEnviarRevision = porcentajeAsignacion === 100 && equipo.length > 0;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6 relative">
      
      {/* Estado general y timeline */}
      <div className="bg-white rounded-xl border-2 border-gray-200 p-6 shadow-sm relative z-0">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FileCheck className="w-6 h-6 text-blue-600" />
            Trazabilidad de Aprobación
          </h2>
          <button 
            type="button"
            onClick={exportarTrazabilidadAprobacionCSV}
            className="flex items-center justify-center gap-2 px-4 py-2 text-sm bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 border border-emerald-200 hover:border-emerald-300 rounded-xl transition-all font-semibold shadow-sm w-fit active:scale-95"
            title="Descargar trazabilidad completa de aprobación en formato CSV"
          >
            <Download className="w-4 h-4" />
            Descargar trazabilidad de aprobación (CSV)
          </button>
        </div>

        {/* Cintas de estado general */}
        <div className="mb-8 flex gap-4 text-sm font-semibold text-center border-b border-gray-100 pb-6 overflow-x-auto">
          <div className={`px-4 py-2 rounded-lg flex-1 whitespace-nowrap ${plan.estado === 'BORRADOR' || plan.estado === 'DEVUELTO' ? 'bg-orange-100 text-orange-700 border-2 border-orange-300' : 'bg-gray-50 text-gray-400'}`}>
            1. Formulación 
            {plan.estado === 'DEVUELTO' && <span className="ml-2 bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-xs">DEVUELTO</span>}
          </div>
          <div className={`px-4 py-2 rounded-lg flex-1 whitespace-nowrap ${plan.estado === 'EN_REVISION' ? 'bg-blue-100 text-blue-700 border-2 border-blue-300' : 'bg-gray-50 text-gray-400'}`}>
            2. Comité PAI (En Revisión)
          </div>
          <div className={`px-4 py-2 rounded-lg flex-1 whitespace-nowrap ${plan.estado === 'APROBADO' || plan.estado === 'VIGENTE' ? 'bg-green-100 text-green-700 border-2 border-green-300' : 'bg-gray-50 text-gray-400'}`}>
            3. Autorizado / Vigente
          </div>
        </div>

        {/* Cartas de estado simples */}
        {plan.estado === 'BORRADOR' && !fueDevuelto && (
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-3 mb-6 shadow-sm">
            <AlertCircle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-orange-900 mb-1">Plan en fase de preparación</p>
              <p className="text-sm text-orange-800">
                Asegúrate de configurar todas las actividades y asignar todos los responsables antes de enviar el plan al comité de aprobación PAI.
              </p>
            </div>
          </div>
        )}

        {(plan.estado === 'DEVUELTO' || fueDevuelto) && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 mb-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="w-full">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-1">
                <p className="font-bold text-red-900">Plan Devuelto por Observaciones al Comité</p>
                <div className="inline-flex items-center gap-1.5 bg-red-600 text-white text-[10px] uppercase font-black px-2 py-0.5 rounded-full shadow-sm w-max">
                  <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  Turno Actual: Jefe / Configuración OCI
                </div>
              </div>
              <p className="text-sm text-red-800 leading-relaxed">
                El comité ha revisado el plan y registrado observaciones. En este estado, <strong>solo el usuario responsable del plan o el Jefe OCI</strong> puede realizar las modificaciones pertinentes, contestar (subsanar) los comentarios de los evaluadores y re-enviar el plan al Comité para retomar el flujo de aprobación.
              </p>
            </div>
          </div>
        )}

        {/* Comité UI */}
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-3 border-b pb-2 border-gray-100">
            <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-400" />
              Comité de aprobación del PAI ({equipo.length})
            </h3>
            {(plan.estado === 'BORRADOR' || plan.estado === 'DEVUELTO') && puedeEditarPlan && esResponsableDelPlan && !isEditingCommittee && (
              <button 
                onClick={() => {
                  setComiteDraft(plan.equipoAprobacion || []);
                  setOrdenDraft(plan.ordenAprobacion || 'secuencial');
                  setIsEditingCommittee(true);
                }}
                className="text-blue-600 text-sm font-bold hover:text-blue-800 flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors border border-blue-100"
              >
                <Settings className="w-4 h-4" /> Editar Comité
              </button>
            )}
          </div>

          {isEditingCommittee ? (
            <div className="bg-blue-50/50 p-5 rounded-xl border-2 border-blue-100 border-dashed animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-bold text-gray-900">Configuración del Comité</h4>
                  <p className="text-xs text-gray-500">Usuarios con permiso <code className="text-[10px]">control-interno.plan-anual.approve</code>. Añade los miembros que participarán en la aprobación.</p>
                </div>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                  <button onClick={() => setOrdenDraft('secuencial')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${ordenDraft === 'secuencial' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>Secuencial</button>
                  <button onClick={() => setOrdenDraft('paralelo')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${ordenDraft === 'paralelo' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>Paralelo</button>
                </div>
              </div>

              {/* Autocomplete para añadir (simplificado) */}
              <div className="mb-4">
                <SelectorProfesional
                  auditores={aprobadoresComite.filter((a: any) => {
                    const yaSeleccionado = comiteDraft.find(c => String(c.id) === String(a.id));
                    return !yaSeleccionado;
                  })}
                  onSelect={(id) => {
                    if (!id) return;
                    const auditor = aprobadoresComite.find(a => String(a.id) === String(id));
                    if (auditor) setComiteDraft([...comiteDraft, auditor]);
                  }}
                  placeholder="+ Agregar miembro del comité..."
                />
              </div>

              {/* Lista Draft */}
              <div className="space-y-2 mb-6">
                {comiteDraft.length === 0 ? (
                  <p className="text-center text-sm text-gray-400 italic py-4">No hay miembros seleccionados</p>
                ) : (
                  comiteDraft.map((miembro: any, index: number) => {
                    const getInitials = (name: string) => name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
                    return (
                      <div key={miembro.id} className="relative flex items-center gap-3 p-2.5 bg-white border border-gray-200 rounded-xl shadow-sm z-10 group">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${ordenDraft === 'secuencial' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'}`}>
                          {ordenDraft === 'secuencial' ? index + 1 : '•'}
                        </div>
                        <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-[10px] font-black shrink-0">
                          {getInitials(miembro.nombre)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{miembro.nombre}</p>
                          <p className="text-[10px] text-gray-400 truncate">{miembro.email || 'aprobador@esap.edu.co'}</p>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 bg-orange-100 text-orange-700 mr-2">
                          {miembro.cargo || 'Funcionario'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setComiteDraft(comiteDraft.filter(c => c.id !== miembro.id))}
                          className="w-7 h-7 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg flex items-center justify-center transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="flex items-center gap-3 justify-end pt-4 border-t border-blue-100">
                <button onClick={() => setIsEditingCommittee(false)} className="px-4 py-2 bg-white border-2 border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg text-sm font-bold transition-colors">
                  Cancelar
                </button>
                <button 
                  onClick={async () => {
                    if (comiteDraft.length === 0) {
                      toast.error('Debe seleccionar al menos un aprobador');
                      return;
                    }

                    // a NUEVO: Persistencia REAL en Base de Datos
                    const isSavingId = toast.loading('Guardando en base de datos...');
                    try {
                      const res = await planAnualApi.update(plan.id, { 
                        equipo_aprobacion: comiteDraft, 
                        orden_aprobacion: ordenDraft 
                      });
                      
                      toast.dismiss(isSavingId);
                      
                      if (res.success) {
                        onActualizar({ ...plan, equipoAprobacion: comiteDraft, ordenAprobacion: ordenDraft });
                        setIsEditingCommittee(false);
                        toast.success('Comité actualizado de forma permanente');
                      } else {
                        throw new Error(res.error || 'Error del backend al guardar el comité');
                      }
                    } catch (e: any) {
                      toast.dismiss(isSavingId);
                      toast.error(e.message || 'Error al persistir cambios en el comité');
                      console.error('Error actualizando comité:', e);
                    }
                  }} 
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-2"
                >
                  <Check className="w-4 h-4" /> Guardar Cambios
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {equipo.length === 0 ? (
                <div className="col-span-full p-8 text-center bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-gray-500 font-medium mb-4">No se ha designado un comité aprobador para este plan.</p>
                  {(plan.estado === 'BORRADOR' || plan.estado === 'DEVUELTO') && puedeEditarPlan && esResponsableDelPlan && (
                    <button 
                      onClick={() => { setComiteDraft([]); setOrdenDraft('secuencial'); setIsEditingCommittee(true); }}
                      className="px-5 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold rounded-lg transition-colors border border-blue-200"
                    >
                      + Configurar Comité PAI
                    </button>
                  )}
                </div>
              ) : ([
                /* Resumen de progreso del comité  visible para TODOS */
                plan.estado === 'EN_REVISION' && equipo.length > 0 && (() => {
                    const totalVotos = equipo.length;
                    const votosAprobados = historial.filter(h => h.estado === 'APROBADA').length;
                    const votosObservados = historial.filter(h => h.estado === 'OBSERVADA').length;
                    const votosPendientes = totalVotos - votosAprobados - votosObservados;
                    const porcentaje = totalVotos > 0 ? Math.round((votosAprobados / totalVotos) * 100) : 0;
                    const esParalelo = plan.ordenAprobacion !== 'secuencial';
                    return (
                      <div key="__progress_header" className="col-span-full mb-2 p-4 bg-gradient-to-r from-blue-50 via-white to-blue-50 border-2 border-blue-100 rounded-xl">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Shield className="w-5 h-5 text-blue-600" />
                            <span className="font-bold text-sm text-blue-900">
                              Progreso de Aprobación  <span className="text-blue-600">{esParalelo ? 'Paralelo' : 'Secuencial'}</span>
                            </span>
                          </div>
                          <span className="text-sm font-black text-blue-700">{porcentaje}%</span>
                        </div>
                        <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden mb-3">
                          <div 
                            className="h-full bg-gradient-to-r from-blue-500 via-green-400 to-emerald-500 rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${porcentaje}%` }}
                          />
                        </div>
                        <div className="flex items-center gap-4 text-xs font-semibold">
                          <span className="flex items-center gap-1.5 text-green-700">
                            <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                            {votosAprobados} Aprobada{votosAprobados !== 1 ? 's' : ''}
                          </span>
                          <span className="flex items-center gap-1.5 text-red-600">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                            {votosObservados} Observada{votosObservados !== 1 ? 's' : ''}
                          </span>
                          <span className="flex items-center gap-1.5 text-blue-600">
                            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                            {votosPendientes} Pendiente{votosPendientes !== 1 ? 's' : ''}
                          </span>
                          <span className="ml-auto text-gray-400 text-[10px]">
                            {esParalelo ? 'Todos firman simultáneamente' : `Turno ${votosAprobados + 1} de ${totalVotos}`}
                          </span>
                        </div>
                      </div>
                    );
                  })(),
                  ...equipo.map((aprobador, idx) => {
                  const track = historial.find(h => h.auditorId === aprobador.id) || { estado: 'PENDIENTE', auditorNombre: aprobador.nombre };
                  const isPendiente = track.estado === 'PENDIENTE';
                  const isAprobado = track.estado === 'APROBADA';
                  const isObservado = track.estado === 'OBSERVADA';
                  const isSecuencial = plan.ordenAprobacion === 'secuencial';
                  const isParalelo = !isSecuencial;
                  
                  // Calcular si el usuario está bloqueado por el flujo secuencial
                  let isWaitingTurn = false;
                  if (isSecuencial) {
                    const firstPendingIdx = equipo.findIndex(a => {
                      const t = historial.find(hi => hi.auditorId === a.id);
                      return !t || t.estado === 'PENDIENTE';
                    });
                    if (firstPendingIdx !== -1 && idx > firstPendingIdx) isWaitingTurn = true;
                  }
                  // En paralelo NUNCA hay bloqueo de turno
                  
                  const getInitials = (name: string) => name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();

                  // En paralelo: todos los pendientes están activos simultáneamente
                  const isActiveTurn = !isWaitingTurn && isPendiente && plan.estado === 'EN_REVISION';

                  // Estadísticas de progreso (para mostrar en cada card en modo paralelo)
                  const totalEquipo = equipo.length;
                  const aprobados = historial.filter(h => h.estado === 'APROBADA').length;
                  const observados = historial.filter(h => h.estado === 'OBSERVADA').length;
                  const pendientes = totalEquipo - aprobados - observados;

                  return (
                    <div key={aprobador.id} className={`p-4 border-2 rounded-xl flex flex-col gap-3 relative transition-all duration-500 ${
                      isAprobado ? 'border-green-200 bg-green-50' : 
                      isObservado ? 'border-red-200 bg-red-50' : 
                      isActiveTurn ? 'border-blue-400 bg-blue-50/60 shadow-lg shadow-blue-100/60 scale-[1.02] z-10' :
                      'border-gray-200 bg-gray-50/40 opacity-70 grayscale-[15%]'
                    }`}>
                      
                      {/* Badge: Turno Actual (secuencial) o Pendiente de Firma (paralelo) */}
                      {isActiveTurn && (
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white text-[9px] font-black uppercase tracking-wider py-0.5 px-3 text-center rounded-full shadow border border-blue-400 z-20 flex items-center justify-center gap-1.5 whitespace-nowrap">
                          <div className="w-1 h-1 rounded-full bg-white animate-pulse" />
                          {isSecuencial ? 'Turno Actual' : 'Pendiente de Firma'}
                        </div>
                      )}

                      {isObservado && plan.estado === 'DEVUELTO' && (
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-600 text-white text-[9px] font-black uppercase tracking-wider py-0.5 px-3 text-center rounded-full shadow border border-red-400 z-20 flex items-center justify-center gap-1.5 whitespace-nowrap">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          Requiere Subsanación
                        </div>
                      )}

                      <div className={`flex items-center justify-between ${(isActiveTurn || (isObservado && plan.estado === 'DEVUELTO')) ? 'mt-1' : ''}`}>
                        <div className="flex items-center gap-3 relative">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-sm shrink-0 ${
                            isAprobado ? 'bg-green-600 text-white' : 
                            isObservado ? 'bg-red-600 text-white' : 
                            isActiveTurn ? 'bg-blue-600 text-white ring-4 ring-blue-100 shadow-md' :
                            'bg-gray-400 text-white opacity-80'
                          }`}>
                            {isAprobado ? <Check className="w-4 h-4"/> : isObservado ? <X className="w-4 h-4"/> : (isSecuencial ? idx + 1 : idx + 1)}
                          </div>
                          
                          {track.firmaElectronica && (
                            <div className="absolute -top-2 -right-2 text-yellow-500 bg-white rounded-full p-0.5 shadow-sm" title="Firmado Electrónicamente">
                              <Shield className="w-4 h-4 fill-yellow-100" />
                            </div>
                          )}

                          <div className={`w-9 h-9 rounded-full bg-white border ${isActiveTurn ? 'border-blue-300 text-blue-600' : 'border-gray-200 text-gray-500'} flex items-center justify-center text-[11px] font-black shrink-0 shadow-sm`}>
                            {getInitials(aprobador.nombre)}
                          </div>

                          <div className="min-w-0 pr-2">
                            <p className={`font-bold text-sm truncate ${isActiveTurn ? 'text-blue-950' : 'text-gray-900'}`}>{aprobador.nombre}</p>
                            <p className="text-[11px] text-gray-500 truncate">{aprobador.email || 'aprobador@esap.edu.co'}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          {/* Status badge  premium pill */}
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-[10px] uppercase font-black tracking-wider rounded-lg border backdrop-blur-sm transition-all ${
                            isAprobado ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white border-green-400 shadow-sm shadow-green-200' :
                            isObservado ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white border-red-400 shadow-sm shadow-red-200' :
                            isActiveTurn ? 'bg-gradient-to-r from-blue-500 to-blue-700 text-white border-blue-400 shadow-md shadow-blue-200 animate-pulse' :
                            'bg-gray-50 text-gray-400 border-gray-200'
                          }`}>
                            {isAprobado && <Check className="w-3 h-3" />}
                            {isObservado && <AlertTriangle className="w-3 h-3" />}
                            {isActiveTurn && <div className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />}
                            {isWaitingTurn ? 'En espera' : track.estado}
                          </span>
                          {/* Role chip  subtle */}
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md shrink-0 ${
                            isActiveTurn ? 'bg-blue-50 text-blue-700 border border-blue-100' : 
                            isAprobado ? 'bg-green-50 text-green-700 border border-green-100' :
                            'bg-gray-50 text-gray-500 border border-gray-100'
                          }`}>
                            {aprobador.cargo || 'Aprobador plan anual'}
                          </span>
                        </div>
                      </div>

                      {/* Progreso general visible para todos en modo paralelo */}
                      {isParalelo && plan.estado === 'EN_REVISION' && (
                        <div className="mt-1">
                          <div className="flex items-center gap-2 mb-1.5">
                            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all duration-700"
                                style={{ width: `${totalEquipo > 0 ? (aprobados / totalEquipo) * 100 : 0}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-bold text-gray-500 whitespace-nowrap">
                              {aprobados}/{totalEquipo} firmas
                            </span>
                          </div>
                          {observados > 0 && (
                            <p className="text-[10px] text-red-500 font-medium">
                              a {observados} observación{observados > 1 ? 'es' : ''} registrada{observados > 1 ? 's' : ''}
                            </p>
                          )}
                        </div>
                      )}

                      {track?.observacion && (
                        <div className="mt-1 p-3 bg-white border border-red-100 rounded-lg shadow-sm text-sm text-red-900">
                          <span className="font-semibold block mb-1">Observación ({track.fecha ? new Date(track.fecha).toLocaleDateString() : ''}):</span>
                          {track.observacion}
                        </div>
                      )}

                      {track.respuestaSubsanacion && (
                        <div className="mt-1 p-3 bg-white border border-green-100 rounded-lg shadow-sm text-sm text-green-900">
                          <span className="font-semibold block mb-1">Respuesta de Subsanación ({track.fechaRespuesta ? new Date(track.fechaRespuesta).toLocaleDateString() : ''}):</span>
                          {track.respuestaSubsanacion}
                        </div>
                      )}

                      {/* Acciones del Aprobador */}
                      {plan.estado === 'EN_REVISION' && isPendiente && (
                        !isWaitingTurn ? (
                          (currentUser && (currentUser.email || currentUser.person?.email || currentUser.usuario?.email)?.trim().toLowerCase() === aprobador.email?.trim().toLowerCase()) ? (
                            <div className="flex gap-2 mt-2 pt-3 border-t border-gray-200">
                              <button onClick={() => handleAprobarAuditor(aprobador.id, aprobador.nombre, aprobador.email)} className="flex-1 bg-white hover:bg-green-50 text-green-700 border border-green-200 text-sm font-medium py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1 shadow-sm">
                                <Shield className="w-4 h-4"/> Aprobar (Firma)
                              </button>
                              <button onClick={() => setModalObservacion({ isOpen: true, auditorId: aprobador.id, texto: '' })} className="flex-1 bg-white hover:bg-red-50 text-red-700 border border-red-200 text-sm font-medium py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1 shadow-sm">
                                <X className="w-4 h-4"/> Observar
                              </button>
                            </div>
                          ) : (
                            <div className="mt-2 pt-3 border-t border-gray-200 text-center">
                              <div className="bg-gray-50 text-gray-500 text-[11px] font-semibold py-2 px-3 rounded-lg flex items-center justify-center border border-gray-200">
                                <Shield className="w-3 h-3 mr-2 opacity-60 text-blue-500"/> 
                                {track?.respuestaSubsanacion 
                                  ? `El usuario se encuentra verificando la respuesta de subsanación...` 
                                  : isParalelo 
                                    ? `Esperando firma de ${aprobador.nombre.split(' ')[0]}...`
                                    : `Esperando revisión de este usuario...`}
                              </div>
                            </div>
                          )
                        ) : (
                          <div className="mt-2 pt-3 border-t border-gray-200">
                            <div className="bg-gray-100 text-gray-500 text-[11px] font-semibold py-2 px-3 rounded-lg flex items-center gap-2 justify-center italic border border-gray-200/60">
                              <Loader2 className="w-3 h-3 animate-spin"/> Esperando turno previo...
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  );
                })
              ])}
            </div>
          )}
        </div>
      </div>

      {/* Checklist de validación (Solo modo borrador/devuelto) */}
      {(plan.estado === 'BORRADOR' || plan.estado === 'DEVUELTO') && puedeEditarPlan && (
        <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Validación para envío a comité</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span className="text-gray-700">5 roles obligatorios del Decreto 648/2017</span>
            </div>
            <div className="flex items-center gap-3">
              {porcentajeAsignacion === 100 ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <AlertCircle className="w-5 h-5 text-orange-600" />}
              <span className="text-gray-700">Responsables asignados: <strong>{actividadesAsignadas}/{totalActividades}</strong> ({porcentajeAsignacion}%)</span>
            </div>
          </div>
        </div>
      )}

      {/* Botoneras Generales */}
      <div className="bg-white rounded-xl border-2 border-gray-200 p-6 relative z-0">
        <div className="flex items-center justify-between mb-4 gap-3">
          <h2 className="text-xl font-bold text-gray-900 m-0">Acciones de Flujo</h2>
          <div />
        </div>
        
        <div className="space-y-3 relative z-0">
          {plan.estado === 'EN_REVISION' && puedeAprobarPlan && esMiTurnoComoAprobador && aprobadorMiTurno && (
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl shadow-sm">
              <p className="text-sm font-bold text-blue-950 mb-1 flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600 shrink-0" />
                Tu turno de aprobación (comité PAI)
              </p>
              <p className="text-xs text-blue-900/90 mb-4">
                Puedes firmar electrónicamente como <strong>{aprobadorMiTurno.nombre}</strong>. El plan permanece en revisión hasta completar todas las firmas del comité.
              </p>
              <button
                type="button"
                onClick={() =>
                  handleAprobarAuditor(aprobadorMiTurno.id, aprobadorMiTurno.nombre, aprobadorMiTurno.email)
                }
                disabled={guardando}
                className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-50 shadow-md"
              >
                {guardando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Shield className="w-5 h-5" />}
                Aprobar plan (firma electrónica)
              </button>
            </div>
          )}

          {plan.estado === 'EN_REVISION' && !puedeAprobarPlan && esMiTurnoComoAprobador && aprobadorMiTurno && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700">
              <p className="font-semibold text-gray-900 mb-1">Es tu turno en el comité</p>
              <p className="text-xs text-gray-600">
                Tu usuario coincide con un firmante pendiente, pero no tienes permiso de aprobación del plan anual en la plataforma. Solicita el permiso correspondiente o que otro miembro con facultad complete la firma.
              </p>
            </div>
          )}

          {(plan.estado === 'BORRADOR' || plan.estado === 'DEVUELTO') && puedeEditarPlan && !puedeEnviarComiteComoResponsable && (
            <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-xl space-y-4 text-amber-950">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
                <div className="text-sm leading-relaxed flex-1">
                  <p className="font-bold text-amber-900 mb-1">Aún no se envía al comité de aprobación</p>
                  <p className="text-amber-900/90">
                    El <strong>envío y firma</strong> ante el comité PAI solo lo hace el <strong>Jefe OCI responsable del plan</strong>
                    {plan.jefeOCI?.nombre ? (
                      <> (<span className="font-semibold">{plan.jefeOCI.nombre}</span>)</>
                    ) : null}
                    . Si ya terminaste la formulación, notifícale para que revise y envíe desde esta pestaña.
                  </p>
                  {porcentajeAsignacion < 100 && (
                    <p className="text-xs text-amber-800 mt-2">
                      Asignación actual: <strong>{actividadesAsignadas}/{totalActividades}</strong> ({porcentajeAsignacion}%).
                      El responsable no podrá enviar al comité hasta el 100%.
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => void handleNotificarResponsable()}
                disabled={notificandoResponsable || guardando}
                className="w-full px-6 py-3.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm transition-colors"
              >
                {notificandoResponsable ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Bell className="w-5 h-5" />
                )}
                Notificar al responsable para revisión y envío
              </button>
            </div>
          )}
          {(plan.estado === 'BORRADOR' || plan.estado === 'DEVUELTO') && puedeEditarPlan && puedeEnviarComiteComoResponsable && (
            <button onClick={handleEnviarComiteOTP} disabled={!puedeEnviarRevision || guardando} className="w-full px-6 py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
              {guardando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Shield className="w-5 h-5" />}
              {fueDevuelto ? 'Subsanar y Re-enviar a Comité de Aprobación (Firma)' : 'Enviar a Comité de Aprobación (Firma)'}
            </button>
          )}

          {plan.estado === 'APROBADO' && puedeActivarPlan && (
            <button onClick={() => cambiarEstadoGeneral('VIGENTE')} disabled={guardando} className="w-full px-6 py-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 shadow-md">
              <CheckCircle2 className="w-5 h-5" />
              Activar Plan (Hacer Vigente)
            </button>
          )}
          
          {plan.estado === 'APROBADO' && !puedeActivarPlan && (
            <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg flex items-start gap-3 text-green-800">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold mb-1">Plan Aprobado</p>
                <p className="text-sm">El comité ha autorizado este plan. Esperando Activación por el Jefe OCI.</p>
              </div>
            </div>
          )}

          {plan.estado === 'VIGENTE' && (
            <div className="bg-white border text-left border-gray-200 rounded-2xl overflow-hidden transition-all duration-300 shadow-sm">
              <button 
                onClick={() => setIsTraceExpanded(!isTraceExpanded)}
                className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-bold text-gray-800 text-sm">Trazabilidad Final de Activación</h3>
                    <p className="text-xs text-gray-500">Histórico del flujo de aprobación PAI</p>
                  </div>
                </div>
                <div className={`w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 transition-transform duration-300 shrink-0 ${isTraceExpanded ? 'rotate-180' : ''}`}>
                  <ChevronDown className="w-4 h-4" />
                </div>
              </button>
              
              <AnimatePresence>
                {isTraceExpanded && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-gray-100 bg-white overflow-hidden"
                  >
                    <div className="px-4 md:px-8 py-8 bg-gray-50/50 rounded-b-2xl">
                      <div className="relative border-l-2 border-indigo-200 ml-4 flex flex-col gap-10">
                        
                        {/* Paso 1: Creación */}
                        <div className="relative pl-8">
                          <div className="absolute -left-[13px] top-0 w-6 h-6 rounded-full bg-white border-4 border-indigo-300 shadow-sm flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-indigo-500" />
                          </div>
                          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow relative">
                            <div className="absolute w-3 h-3 bg-white border-l border-t border-gray-200 rotate-[-45deg] -left-[6px] top-3"></div>
                            <h4 className="font-bold text-gray-900 text-sm flex justify-between items-center">
                              Creación y Formulación Inicial
                              <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100">Fase 1</span>
                            </h4>
                            <div className="mt-2 text-xs text-gray-600 flex items-center gap-2">
                              <div className="w-6 h-6 bg-indigo-100 text-indigo-700 rounded-full flex justify-center items-center font-bold text-[10px]">
                                {plan.jefeOCI?.nombre ? plan.jefeOCI.nombre.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : 'AD'}
                              </div>
                              <span className="font-medium text-gray-800">{plan.jefeOCI?.nombre || 'Administrador OCI'}</span>
                              <span className="mx-1 text-gray-300">|</span>
                              <span className="text-gray-500">Autor del Plan</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Paso 2: Aprobaciones Comité */}
                        {equipo.map((aprobador, idx) => {
                          const track = historial.find(h => h.auditorId === aprobador.id) || { estado: 'PENDIENTE' } as any;
                          const isAprobado = track.estado === 'APROBADA';
                          const isObservado = track.estado === 'OBSERVADA';
                          const isPendiente = track.estado === 'PENDIENTE';
                          
                          const dotColor = isAprobado ? 'border-green-400 bg-green-500' : isObservado ? 'border-red-400 bg-red-500' : 'border-blue-300 bg-white';
                          const innerDot = isPendiente ? 'bg-blue-400' : '';
                          
                          return (
                            <div key={`trace-${aprobador.id}`} className="relative pl-8">
                              <div className={`absolute -left-[13px] top-2 w-6 h-6 rounded-full border-4 ${dotColor} shadow-md flex items-center justify-center z-10`}>
                                {isAprobado && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                                {isObservado && <X className="w-3 h-3 text-white" strokeWidth={3} />}
                                {isPendiente && <div className={`w-2 h-2 rounded-full ${innerDot}`} />}
                              </div>
                              <div className={`p-5 rounded-2xl border-2 transition-all shadow-sm ${
                                isAprobado ? 'bg-white border-green-100 hover:border-green-300' : 
                                isObservado ? 'bg-red-50/30 border-red-100 hover:border-red-300' : 
                                'bg-white border-gray-100 hover:border-blue-100'
                              } relative`}>
                                <div className={`absolute w-3 h-3 rotate-[-45deg] -left-[7px] top-3 ${
                                  isAprobado ? 'bg-white border-l-2 border-t-2 border-green-100' : 
                                  isObservado ? 'bg-red-50/30 border-l-2 border-t-2 border-red-100' : 
                                  'bg-white border-l-2 border-t-2 border-gray-100'
                                }`}></div>
                                
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 pb-3 border-b border-gray-100/60">
                                  <div>
                                    <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                                      Aprobación PAI: {aprobador.nombre}
                                      {track.firmaElectronica && (
                                        <div className="flex items-center gap-1 text-[10px] bg-green-50 text-green-700 border border-green-200 px-1.5 py-0.5 rounded shadow-sm" title="Firma Electrónica Válida">
                                          <Shield className="w-3 h-3" /> F.E.
                                        </div>
                                      )}
                                    </h4>
                                    <p className="text-xs text-gray-500 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                                      <span className="font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">{aprobador.cargo || 'Comité'}</span>
                                      <span className="text-gray-300">•</span>
                                      <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3 text-gray-400" />
                                        {track.fecha ? new Date(track.fecha).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' }) : 'Esperando revisión...'}
                                      </span>
                                    </p>
                                  </div>
                                  <div className="shrink-0">
                                    <span className={`px-3 py-1 text-[11px] font-bold uppercase tracking-wider rounded-lg border ${
                                      isAprobado ? 'bg-green-100 text-green-800 border-green-200' :
                                      isObservado ? 'bg-red-100 text-red-800 border-red-200' :
                                      'bg-gray-100 text-gray-600 border-gray-200'
                                    }`}>
                                      {track.estado}
                                    </span>
                                  </div>
                                </div>

                                {/* Observations & Answers */}
                                {track.observacion && (
                                  <div className="mt-3 bg-red-50/50 rounded-xl p-4 border border-red-100 shadow-inner">
                                    <h5 className="text-[11px] font-bold text-red-800 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                      <AlertCircle className="w-3.5 h-3.5" /> Observación Realizada
                                    </h5>
                                    <p className="text-sm text-red-900 leading-relaxed italic border-l-2 border-red-300 pl-3">
                                      "{track.observacion}"
                                    </p>
                                  </div>
                                )}

                                {track.respuestaSubsanacion && (
                                  <div className="mt-3 bg-emerald-50/50 rounded-xl p-4 border border-emerald-100 shadow-inner relative">
                                    <div className="absolute -top-3 left-8 text-emerald-300">
                                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 10 20 15 15 20"></polyline><path d="M4 4v7a4 4 0 0 0 4 4h12"></path></svg>
                                    </div>
                                    <h5 className="text-[11px] font-bold text-emerald-800 uppercase tracking-widest mb-1.5 flex items-center gap-1.5 mt-1">
                                      <FileCheck className="w-3.5 h-3.5" /> Respuesta a Observación
                                      {track.fechaRespuesta && <span className="text-[9px] text-emerald-600 font-normal ml-auto bg-emerald-100 px-2 py-0.5 rounded-full">{new Date(track.fechaRespuesta).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}</span>}
                                    </h5>
                                    <p className="text-sm text-emerald-900 leading-relaxed border-l-2 border-emerald-300 pl-3 bg-white p-2 border rounded shadow-sm">
                                      {track.respuestaSubsanacion}
                                    </p>
                                  </div>
                                )}

                                {/* Detalles de la firma */}
                                {track.firmaElectronica && (
                                  <div className="mt-4 pt-3 border-t border-dashed border-gray-200">
                                    <div className="flex bg-gray-50 rounded-lg p-2.5 items-center justify-between border border-gray-100">
                                      <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 bg-blue-100 rounded text-blue-700 flex items-center justify-center">
                                          <FileText className="w-3.5 h-3.5" />
                                        </div>
                                        <div>
                                          <p className="text-[10px] font-bold text-gray-700 uppercase">Detalle de Firma</p>
                                          <p className="text-[10px] text-gray-500 font-mono tracking-tighter">ID: {track.firmaElectronica.hash || track.firmaElectronica.id || 'N/A'}</p>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-[9px] text-gray-400 uppercase font-bold">Dirección IP / Origen</p>
                                        <p className="text-[10px] font-mono text-gray-600">{track.firmaElectronica.ip || 'Intranet (Local)'}</p>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        {/* Paso 3: Activación Oficial */}
                        <div className="relative pl-8">
                          <div className="absolute -left-[17px] top-0 w-8 h-8 rounded-full bg-green-500 ring-4 ring-green-100 shadow-lg flex items-center justify-center z-10">
                            <CheckCircle2 className="w-5 h-5 text-white" />
                          </div>
                          <div className="bg-gradient-to-br from-green-50 to-emerald-100/50 p-5 rounded-2xl border-2 border-green-200 shadow-md relative overflow-hidden">
                            <div className="absolute w-4 h-4 rotate-[-45deg] -left-[9px] top-2 bg-green-50 border-l-2 border-t-2 border-green-200"></div>
                            
                            <div className="relative z-10">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="font-extrabold text-green-900 text-base">Activación Oficial</h4>
                                  <p className="text-xs text-green-700 font-medium mt-1">El PAI se encuentra 100% aprobado y en fase de ejecución</p>
                                </div>
                                <Shield className="w-8 h-8 text-green-500/30" />
                              </div>
                              <div className="inline-flex flex-wrap items-stretch mt-4 bg-white rounded-xl border border-green-200 shadow-sm overflow-hidden group">
                                <div className="px-3 py-2 bg-green-50/50 flex items-center border-r border-green-100">
                                  <CalendarClock className="w-4 h-4 text-green-600" />
                                  <span className="text-[12px] text-green-800 font-bold uppercase tracking-wider ml-2">
                                    {plan.fechaAprobacion 
                                      ? new Date(plan.fechaAprobacion).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }) 
                                      : 'Confirmado'}
                                  </span>
                                </div>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); exportarCertificadoAprobacionPDF(plan, equipo, historial); }}
                                  className="px-4 py-2 flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white transition-colors focus:outline-none"
                                  title="Generar Certificado Digital PDF"
                                >
                                  <FileText className="w-4 h-4" />
                                  <span className="text-[11px] font-bold uppercase tracking-wider">Certificado PDF</span>
                                </button>
                              </div>
                            </div>
                            
                            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-green-500/10 rounded-full blur-2xl"></div>
                          </div>
                        </div>
                        
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
      
      {/* Modal / Dialogo de Observación (Render Flotante Top-Level Z-Index) */}
      <AnimatePresence>
        {modalObservacion.isOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg border-2 border-red-100"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2 text-red-700">
                <AlertCircle className="w-5 h-5"/> Registrar Observación
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                El plan será devuelto al estado inicial (DEVUELTO) para que el responsable lo corrija y lo vuelva a enviar.
              </p>
              <textarea
                className="w-full h-32 p-3 border-2 border-gray-200 rounded-xl focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none resize-none text-sm transition-all"
                placeholder="Detalle exactamente los ajustes requeridos..."
                value={modalObservacion.texto}
                onChange={(e) => setModalObservacion(prev => ({ ...prev, texto: e.target.value }))}
                autoFocus
              />
              <div className="flex gap-3 justify-end mt-6">
                <button 
                  onClick={() => setModalObservacion({ isOpen: false, auditorId: null, texto: '' })} 
                  className="px-5 py-2.5 font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                >
                  Cancelar
                </button>
                <button 
                  disabled={!modalObservacion.texto.trim()} 
                  onClick={handleRechazarObservacion} 
                  className="px-5 py-2.5 font-medium bg-red-600 text-white hover:bg-red-700 rounded-lg disabled:opacity-50 transition-colors shadow-sm"
                >
                  Confirmar y Devolver
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {modalSubsanar.isOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 text-green-600">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Ajustes Realizados y Subsanación</h3>
                  <p className="text-sm text-gray-500">Comunique los ajustes a los miembros del comité</p>
                </div>
              </div>
              
              <p className="text-sm text-gray-600 mb-4 bg-gray-50 p-3 rounded-lg border border-gray-100 italic">
                Dado que el plan ya fue firmado por usted y las firmas previas aún son vinculantes, su re-envío de ajustes omitirá una doble validación de OTP y pasará de inmediato a la fase de revisión.
              </p>
              <textarea
                className="w-full h-32 p-3 border-2 border-gray-200 rounded-xl focus:border-green-400 focus:ring-2 focus:ring-green-100 outline-none resize-none text-sm transition-all"
                placeholder="Detalle exactamente los ajustes que ha realizado en respuesta a las observaciones planteadas..."
                value={modalSubsanar.texto}
                onChange={(e) => setModalSubsanar(prev => ({ ...prev, texto: e.target.value }))}
                autoFocus
              />
              <div className="flex gap-3 justify-end mt-6">
                <button 
                  onClick={() => setModalSubsanar({ isOpen: false, texto: '' })} 
                  className="px-5 py-2.5 font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                >
                  Cancelar
                </button>
                <button 
                  disabled={!modalSubsanar.texto.trim()} 
                  onClick={handleConfirmarSubsanacion} 
                  className="px-5 py-2.5 font-medium bg-green-600 text-white hover:bg-green-700 rounded-lg disabled:opacity-50 transition-colors shadow-sm"
                >
                  Confirmar y Re-enviar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ModalFirmaOTP
        isOpen={modalOTPConfig.isOpen}
        onClose={() => setModalOTPConfig(prev => ({ ...prev, isOpen: false }))}
        onSuccess={procesarAccionOTP}
        userName={modalOTPConfig.userName}
        userEmail={modalOTPConfig.userEmail}
        accionDetalle={modalOTPConfig.detalle}
      />
    </motion.div>
  );
}
