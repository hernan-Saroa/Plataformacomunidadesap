/**
 * Mis Auditorías - Control Interno de Gestión - Portal Transaccional
 *
 * Vista del Portal para usuarios "auditados". El flujo, los estados y los
 * plazos están alineados al backoffice real (ComunicacionAuditoriaModule.tsx,
 * controlInternoService.ts) y a la norma colombiana (Ley 87/1993, Decreto
 * 648/2017, Decreto 1499/2017 - MIPG, Resolución CGR 042/2020).
 *
 * Etapas de la auditoría desde la perspectiva del área auditada:
 *
 *   1. NOTIFICACIÓN   El auditor genera el Informe Preliminar.
 *                     -> Llegan los hallazgos al portal (estado 'notificado').
 *                     -> Plazo: 5 días hábiles para responder cada hallazgo.
 *
 *   2. RESPUESTA      Por cada hallazgo el auditado decide:
 *                       (a) Aceptar  -> hallazgo.estado = 'aceptado'.
 *                       (b) Presentar controversia, con argumentos y
 *                           DOCUMENTO ADJUNTO OBLIGATORIO.
 *                           -> hallazgo.estado = 'en-controversia'.
 *
 *   3. DECISIÓN       El auditor decide cada controversia (ratificado |
 *   AUDITOR           modificado | retirado) con fundamentación técnica.
 *
 *   4. INFORME FINAL  El auditor cierra la etapa de Comunicación.
 *                     -> Inicia plazo de 30 días hábiles para que el área
 *                        formule el Plan de Mejoramiento.
 *                     -> Auditoría pasa a estado 'Revisión' y luego a
 *                        'Seguimiento' cuando el plan se aprueba.
 *
 *   5. SEGUIMIENTO    El área ejecuta acciones, sube evidencias y la OCI
 *                     verifica trimestralmente. Cuando todo está cumplido,
 *                     la auditoría queda 'Finalizada'.
 *
 * Endpoints reales (ya existen en controlInternoService.ts):
 *   GET  /auditorias/{id}/hallazgos                  -> getHallazgosByAuditoria
 *   POST /auditorias/{id}/informe-preliminar/generar -> generarInformePreliminar
 *   POST /hallazgos/{id}/aceptar                     -> aceptarHallazgo
 *   POST /documentos                                 -> subir evidencia (paso 1)
 *   POST /hallazgos/{id}/controversia                -> presentarControversia (paso 2)
 *   POST /hallazgos/{id}/decision-auditor            -> decisionAuditor
 *   POST /auditorias/{id}/informe-final/generar      -> generarInformeFinal
 *
 * Sigue el patrón visual de MisCertificadosLaborales / MisDocumentos
 * (inline styles, design tokens, motion/react, sin shadcn).
 *
 * NOTA: Hoy trabaja con datos mock locales. Los puntos donde se enchufa la
 * API real están marcados con `// API:` en cada handler.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Search,
  RefreshCw,
  Loader2,
  Shield,
  AlertCircle,
  CheckCircle2,
  Upload,
  Send,
  SendHorizontal,
  FileText,
  ChevronRight,
  ChevronDown,
  Paperclip,
  Eye,
  Calendar,
  CalendarDays,
  User,
  User2,
  AlertTriangle,
  Info,
  ClipboardList,
  ThumbsUp,
  Scale,
  XCircle,
  Gavel,
  Target,
  Pencil,
  Trash2,
  Clock,
  Link2,
  BarChart3,
  FileEdit,
  Rocket,
  Trophy,
  Download,
  Lightbulb,
  Building2,
  Tag,
  FileCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { colors } from '../../esap/shared/designTokens';
import { Button } from '@esap-mfe/shared-ui';
import { controlInternoService } from '../../../services/api/controlInternoService';

// ════════════════════════════════════════════════════════════════════════════
// FEATURE FLAGS DE INTEGRACIÓN
// ════════════════════════════════════════════════════════════════════════════
//
// Activar / desactivar el uso del backend real para cada parte del flujo.
// Si el backend devuelve error o un payload inesperado, hacemos fallback
// silencioso a los mocks (para no romper la demo).
//
// Cuando todo el módulo esté validado en producción, dejar todos en `true`
// y eventualmente borrar los mocks.

const USE_API_AUDITORIAS = true;
const USE_API_HALLAZGOS  = true;
const USE_API_DOCUMENTOS = true;
const USE_API_ACEPTAR    = true;
const USE_API_DOCUPLOAD  = true;
const USE_API_CONTROVER  = true;
const USE_API_ESTADO     = true;

// ════════════════════════════════════════════════════════════════════════════
// CONSTANTES NORMATIVAS
// ════════════════════════════════════════════════════════════════════════════

/** Plazo para responder cada hallazgo (Comunicación de la auditoría). */
const PLAZO_RESPUESTA_DIAS_HABILES = 5;

/** Plazo para formular el Plan de Mejoramiento desde el Informe Final. */
const PLAZO_PLAN_DIAS_HABILES = 30;

/** Helper: días hábiles entre dos fechas (descontando sábados y domingos).
 *  No descuenta festivos colombianos por simplicidad; usar API Festivos cuando
 *  esté integrado. */
function diasHabilesEntre(desde: Date, hasta: Date): number {
  const inicio = new Date(desde); inicio.setHours(0, 0, 0, 0);
  const fin = new Date(hasta);    fin.setHours(0, 0, 0, 0);
  let dias = 0;
  const dir = fin >= inicio ? 1 : -1;
  const cursor = new Date(inicio);
  while (cursor.getTime() !== fin.getTime()) {
    cursor.setDate(cursor.getDate() + dir);
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) dias += dir;
  }
  return dias;
}

/** Suma N días hábiles a una fecha base. */
function sumarDiasHabiles(base: Date, n: number): Date {
  const r = new Date(base);
  let restantes = n;
  while (restantes > 0) {
    r.setDate(r.getDate() + 1);
    const dow = r.getDay();
    if (dow !== 0 && dow !== 6) restantes -= 1;
  }
  return r;
}

/** Convierte 'DD/MM/YYYY' o ISO a Date; tolerante. */
function parseFechaCO(s?: string): Date | null {
  if (!s) return null;
  if (s.includes('/')) {
    const [d, m, y] = s.split('/');
    return new Date(Number(y), Number(m) - 1, Number(d));
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function formatearFechaCO(d: Date): string {
  return d.toLocaleDateString('es-CO');
}

/** Resumen del plazo activo de la auditoría según su etapa. */
type PlazoActivo = {
  /** Texto corto: "Plazo: respuesta hallazgos" / "Plazo: formular Plan". */
  etapa: string;
  /** Fecha límite calculada en hábiles. */
  fechaLimite: Date;
  /** Días hábiles que restan (negativo si vencido). */
  diasHabilesRestantes: number;
  /** True si ya pasó el plazo. */
  vencido: boolean;
};

function calcularPlazoActivo(auditoria: AuditoriaItem, hoy: Date = new Date()): PlazoActivo | null {
  // Etapa "Plan de Mejoramiento": 30 días hábiles desde el Informe Final.
  if (auditoria.informeFinalGenerado && auditoria.estado !== 'Finalizada') {
    const base = parseFechaCO(auditoria.fechaInformeFinal);
    if (!base) return null;
    const limite = sumarDiasHabiles(base, PLAZO_PLAN_DIAS_HABILES);
    const restantes = diasHabilesEntre(hoy, limite);
    return {
      etapa: 'Formular Plan de Mejoramiento',
      fechaLimite: limite,
      diasHabilesRestantes: restantes,
      vencido: restantes < 0,
    };
  }
  // Etapa "Comunicación": 5 días hábiles desde la Notificación.
  if (auditoria.estado === 'Notificada' || auditoria.estado === 'En Respuesta') {
    const base = parseFechaCO(auditoria.fechaNotificacion);
    if (!base) return null;
    const limite = sumarDiasHabiles(base, PLAZO_RESPUESTA_DIAS_HABILES);
    const restantes = diasHabilesEntre(hoy, limite);
    return {
      etapa: 'Responder hallazgos',
      fechaLimite: limite,
      diasHabilesRestantes: restantes,
      vencido: restantes < 0,
    };
  }
  return null;
}

// ════════════════════════════════════════════════════════════════════════════
// TIPOS (alineados al backoffice)
// ════════════════════════════════════════════════════════════════════════════

type EstadoAuditoria = 'Notificada' | 'En Respuesta' | 'Revisión' | 'Finalizada';
type Urgencia = 'alta' | 'media' | 'baja';

type EstadoHallazgo =
  | 'borrador'
  | 'notificado'
  | 'aceptado'
  | 'en-controversia'
  | 'ratificado'
  | 'modificado'
  | 'retirado'
  | 'cerrado';

const ESTADOS_HALLAZGO_VALIDOS: ReadonlySet<string> = new Set([
  'borrador',
  'notificado',
  'aceptado',
  'en-controversia',
  'ratificado',
  'modificado',
  'retirado',
  'cerrado',
]);

/** Normaliza el estado del API sin forzar "notificado" cuando el hallazgo sigue en borrador. */
function normalizeEstadoHallazgo(raw?: string | null): EstadoHallazgo {
  const normalized = String(raw ?? '')
    .toLowerCase()
    .replace(/_/g, '-')
    .trim();
  if (ESTADOS_HALLAZGO_VALIDOS.has(normalized)) {
    return normalized as EstadoHallazgo;
  }
  // Sin estado (mocks legacy) → notificado; cualquier otro valor desconocido → borrador (sin acciones)
  return normalized ? 'borrador' : 'notificado';
}

type GravedadHallazgo = 'LEVE' | 'MODERADO' | 'GRAVE' | 'CRITICO';

export interface AuditoriaItem {
  id: string;
  codigo: string;
  titulo: string;
  tipo: string;
  estado: EstadoAuditoria;
  /** Fecha en que el auditor publicó el Informe Preliminar y notificó al área. */
  fechaNotificacion: string;
  auditorLider: string;
  area: string;
  hallazgos: number;
  documentosSolicitados: number;
  documentosSubidos: number;
  descripcion: string;
  urgencia: Urgencia;
  /** Set true cuando el auditor cierra Comunicación con el Informe Final.
   *  A partir de ese momento corre el plazo de 30 días hábiles para
   *  formular el Plan de Mejoramiento. */
  informeFinalGenerado?: boolean;
  fechaInformeFinal?: string;
}

interface HallazgoItem {
  id: string;
  codigo: string;
  titulo: string;
  descripcion: string;
  gravedad: GravedadHallazgo;
  estado: EstadoHallazgo;
  criterioIncumplido?: string;
  causas?: string[];
  efectos?: string[];
  recomendaciones?: string[];
  // Respuesta del auditado (controversia)
  argumentosControversia?: string;
  observacionesControversia?: string;
  documentoControversiaNombre?: string;
  documentoControversiaUrl?: string;
  fechaPresentacion?: string;
  controversiaTurno?: 'auditor' | 'auditado' | null;
  // Decisión del auditor (luego de la controversia)
  decisionAuditor?: 'ratificado' | 'modificado' | 'retirado';
  fundamentacionTecnica?: string;
  fechaDecision?: string;
}

interface DocumentoItem {
  id: string;
  nombre: string;
  tipo: string;
  fechaSubida?: string;
  tamano?: string;
  estado: 'Aprobado' | 'Pendiente' | 'Rechazado' | 'Solicitado';
  observacion?: string;
  /** Indica si el doc fue cargado por el equipo auditor (informe preliminar, oficios, etc.) */
  origen?: 'auditor' | 'auditado';
}

interface MisAuditoriasControlInternoProps {
  personaId: string;
  userName?: string;
  onBack: () => void;
}

// ════════════════════════════════════════════════════════════════════════════
// MOCK DATA (reemplazar por adapters reales cuando el backend esté listo)
// ════════════════════════════════════════════════════════════════════════════

const AUDITORIAS_MOCK: AuditoriaItem[] = [
  {
    // Notificada hace pocos días: el auditado todavía está dentro del plazo
    // de 5 días hábiles para responder hallazgos.
    id: 'aud-001',
    codigo: 'AUD-2026-004',
    titulo: 'Auditoría de Gestión Administrativa',
    tipo: 'Gestión',
    estado: 'En Respuesta',
    fechaNotificacion: '04/05/2026',
    auditorLider: 'Carlos Méndez Rivera',
    area: 'Gestión Administrativa',
    hallazgos: 3,
    documentosSolicitados: 8,
    documentosSubidos: 5,
    descripcion: 'Evaluación de procesos administrativos y de gestión documental.',
    urgencia: 'alta',
  },
  {
    // En revisión: el auditor ya tomó decisiones sobre las controversias.
    // No hay plazo de respuesta corriendo, está esperando Informe Final.
    id: 'aud-002',
    codigo: 'AUD-2026-018',
    titulo: 'Auditoría de Cumplimiento Normativo - Contratación',
    tipo: 'Cumplimiento',
    estado: 'Revisión',
    fechaNotificacion: '15/03/2026',
    auditorLider: 'María González Torres',
    area: 'Contratación',
    hallazgos: 2,
    documentosSolicitados: 12,
    documentosSubidos: 12,
    descripcion: 'Verificación del cumplimiento de normas en procesos de contratación.',
    urgencia: 'media',
    // El auditor ya generó el Informe Final hace 5 días: corre el plazo de
    // 30 días hábiles para formular el Plan de Mejoramiento.
    informeFinalGenerado: true,
    fechaInformeFinal: '01/05/2026',
  },
  {
    id: 'aud-003',
    codigo: 'AUD-2025-012',
    titulo: 'Auditoría de Control Interno - Gestión Financiera',
    tipo: 'Control Interno',
    estado: 'Finalizada',
    fechaNotificacion: '15/09/2025',
    auditorLider: 'Ana López Pérez',
    area: 'Financiera',
    hallazgos: 1,
    documentosSolicitados: 6,
    documentosSubidos: 6,
    descripcion: 'Revisión de procesos financieros y controles internos.',
    urgencia: 'baja',
    informeFinalGenerado: true,
    fechaInformeFinal: '15/10/2025',
  },
];

const HALLAZGOS_MOCK: Record<string, HallazgoItem[]> = {
  'aud-001': [
    {
      id: 'h-001',
      codigo: 'H-001',
      titulo: 'Inconsistencias en archivo documental',
      descripcion:
        'Se evidencian carpetas físicas sin foliación adecuada conforme a la Ley 594 de 2000 (Ley General de Archivos). Se requiere subsanar y aportar evidencia.',
      gravedad: 'GRAVE',
      estado: 'notificado',
      criterioIncumplido: 'Ley 594 de 2000 - Artículos 11, 13 y 22',
      causas: ['Falta de capacitación al personal de archivo', 'Ausencia de procedimiento documentado'],
      efectos: ['Riesgo de pérdida de información', 'Incumplimiento normativo'],
      recomendaciones: ['Elaborar manual de archivo', 'Capacitar al personal', 'Foliar todas las carpetas activas'],
    },
    {
      id: 'h-002',
      codigo: 'H-002',
      titulo: 'Falta de soportes en procedimientos',
      descripcion:
        'Algunos procedimientos administrativos no cuentan con los soportes documentales requeridos por la entidad.',
      gravedad: 'MODERADO',
      estado: 'aceptado',
      criterioIncumplido: 'Manual de procesos institucional - Numeral 4.3',
      causas: ['Procedimientos no estandarizados'],
      efectos: ['Riesgo operativo en auditorías futuras'],
    },
    {
      id: 'h-003',
      codigo: 'H-003',
      titulo: 'Tiempos de respuesta de PQRSD fuera de límite',
      descripcion:
        'Tres (3) PQRSD presentaron tiempos de respuesta superiores a los establecidos por norma.',
      gravedad: 'MODERADO',
      estado: 'notificado',
      criterioIncumplido: 'Ley 1755 de 2015 - Artículo 14',
      causas: ['Sobrecarga del responsable'],
      efectos: ['Incumplimiento de derechos de petición'],
      recomendaciones: ['Redistribuir cargas y reforzar seguimiento'],
    },
  ],
  'aud-002': [
    {
      id: 'h-101',
      codigo: 'H-101',
      titulo: 'Estudios previos incompletos',
      descripcion: 'Dos contratos del periodo 2025 presentan estudios previos incompletos.',
      gravedad: 'GRAVE',
      estado: 'ratificado',
      criterioIncumplido: 'Ley 80 de 1993 - Artículo 25',
      argumentosControversia: 'Se aporta el complemento de estudios previos cargados en SECOP II.',
      documentoControversiaNombre: 'EstudiosPrevios_Complemento.pdf',
      fechaPresentacion: '20/03/2026',
      decisionAuditor: 'ratificado',
      fundamentacionTecnica:
        'El complemento aportado se cargó después del cierre del periodo auditado. El hallazgo se ratifica y se generará plan de mejoramiento.',
      fechaDecision: '25/03/2026',
    },
    {
      id: 'h-102',
      codigo: 'H-102',
      titulo: 'Garantías sin actualizar',
      descripcion: 'Una de las pólizas de cumplimiento no fue actualizada tras prórroga del contrato.',
      gravedad: 'LEVE',
      estado: 'retirado',
      decisionAuditor: 'retirado',
      fundamentacionTecnica: 'Verificada póliza actualizada con fecha previa a la finalización del periodo. Hallazgo retirado.',
      fechaDecision: '23/03/2026',
    },
  ],
  'aud-003': [
    {
      id: 'h-201',
      codigo: 'H-201',
      titulo: 'Conciliación bancaria mensual',
      descripcion: 'Mes de agosto 2025 sin conciliación bancaria firmada por responsable.',
      gravedad: 'MODERADO',
      estado: 'cerrado',
      decisionAuditor: 'ratificado',
      fundamentacionTecnica: 'Se ratifica y se ejecutó plan de mejoramiento. Hallazgo cerrado.',
      fechaDecision: '15/10/2025',
    },
  ],
};

const DOCUMENTOS_MOCK: Record<string, DocumentoItem[]> = {
  'aud-001': [
    { id: 'd-000', nombre: 'Informe_Preliminar_AUD-2026-004.pdf', tipo: 'PDF', fechaSubida: '15/04/2026', tamano: '1.4 MB', estado: 'Aprobado', origen: 'auditor' },
    { id: 'd-001', nombre: 'Inventario_Documental_Territorial.xlsx', tipo: 'Excel', fechaSubida: '02/05/2026', tamano: '1.2 MB', estado: 'Aprobado', origen: 'auditado' },
    { id: 'd-002', nombre: 'Procedimiento_Archivo_v3.pdf', tipo: 'PDF', fechaSubida: '03/05/2026', tamano: '780 KB', estado: 'Pendiente', origen: 'auditado' },
    { id: 'd-003', nombre: 'Acta de comité de archivo', tipo: 'PDF', estado: 'Solicitado' },
    { id: 'd-004', nombre: 'Tabla de Retención Documental (TRD) firmada', tipo: 'PDF', estado: 'Solicitado' },
  ],
  'aud-002': [
    { id: 'd-100', nombre: 'Informe_Preliminar_AUD-2026-018.pdf', tipo: 'PDF', fechaSubida: '01/03/2026', tamano: '900 KB', estado: 'Aprobado', origen: 'auditor' },
    { id: 'd-101', nombre: 'Estudios previos contrato 2025-001.pdf', tipo: 'PDF', fechaSubida: '20/03/2026', tamano: '900 KB', estado: 'Aprobado', origen: 'auditado' },
    { id: 'd-102', nombre: 'Póliza actualizada.pdf', tipo: 'PDF', fechaSubida: '22/03/2026', tamano: '300 KB', estado: 'Aprobado', origen: 'auditado' },
  ],
  'aud-003': [
    { id: 'd-200', nombre: 'Informe_Cierre_AUD-2025-012.pdf', tipo: 'PDF', fechaSubida: '15/10/2025', tamano: '1.1 MB', estado: 'Aprobado', origen: 'auditor' },
    { id: 'd-201', nombre: 'Conciliación bancaria agosto 2025.pdf', tipo: 'PDF', fechaSubida: '10/10/2025', tamano: '450 KB', estado: 'Aprobado', origen: 'auditado' },
  ],
};

// ════════════════════════════════════════════════════════════════════════════
// MAPPERS BACKEND -> UI
// ════════════════════════════════════════════════════════════════════════════
//
// El backend devuelve la auditoría con su shape "auditor" (más amplio).
// Aquí la convertimos al shape `AuditoriaItem` que pinta el portal del auditado.

/** Mapea estado/fase del backend al estado simplificado del portal del auditado. */
function mapEstadoAuditoria(raw: any): EstadoAuditoria {
  const fase = String(raw?.fase ?? raw?.estadoKanban ?? raw?.estado ?? '').toLowerCase();
  if (fase.includes('finaliz')) return 'Finalizada';
  if (fase.includes('seguim') || fase.includes('plan')) return 'Revisión';
  if (fase.includes('comun') || fase.includes('respu')) return 'En Respuesta';
  if (fase.includes('notific')) return 'Notificada';
  return 'En Respuesta';
}

function mapUrgencia(raw: any): Urgencia {
  const p = String(raw?.prioridad ?? '').toLowerCase();
  if (p.includes('alta') || p.includes('urgente') || p.includes('crítica') || p.includes('critica')) return 'alta';
  if (p.includes('baja')) return 'baja';
  return 'media';
}

/**
 * Convierte una fecha del backend a "es-CO" sin perder un día por timezone.
 * - "2026-05-05"            -> 5/5/2026 (parseo manual como fecha local)
 * - "2026-05-05T14:25:07Z"  -> 5/5/2026 (Date estándar)
 */
function fechaCO(iso?: string | null): string {
  if (!iso) return '';
  const s = String(iso).trim();
  const soloFecha = /^\d{4}-\d{2}-\d{2}$/;
  if (soloFecha.test(s)) {
    const [y, m, d] = s.split('-').map((n) => parseInt(n, 10));
    const fecha = new Date(y, m - 1, d);
    return fecha.toLocaleDateString('es-CO');
  }
  const dt = new Date(s);
  return isNaN(dt.getTime()) ? s : dt.toLocaleDateString('es-CO');
}

/**
 * Extrae el nombre del auditor líder a partir del equipo auditor que envía
 * el backend. Si el backend ya entrega un campo legible, se usa primero.
 */
function extraerAuditorLider(raw: any): string {
  const fromTop =
    raw?.auditorLider?.nombre ??
    raw?.auditorLider?.fullName ??
    raw?.auditorLider?.full_name ??
    (typeof raw?.auditorLider === 'string' ? raw.auditorLider : null) ??
    raw?.lider ??
    raw?.responsableAreaCargo;
  if (fromTop && typeof fromTop === 'string') return fromTop;

  const equipo = Array.isArray(raw?.equipoAuditores) ? raw.equipoAuditores : [];
  const lider = equipo.find((e: any) =>
    String(e?.rol ?? '').toLowerCase().includes('lider')
    || String(e?.rol ?? '').toLowerCase().includes('líder'),
  );
  const cualquiera = equipo[0];
  const elegido = lider || cualquiera;
  if (elegido) {
    return (
      elegido.nombre ??
      elegido.fullName ??
      elegido.full_name ??
      `Auditor (${String(elegido.personaId || '').slice(0, 8)}…)`
    );
  }
  return 'Equipo OCI por asignar';
}

/** Determina el "área auditada" mostrable a partir del payload del backend. */
function extraerAreaAuditada(raw: any): string {
  return (
    raw?.areaAuditada ??
    raw?.area ??
    raw?.areaObjetivo ??
    raw?.procesoAuditado ??
    raw?.dependenciaResponsable ??
    raw?.responsableAreaNombre ??
    raw?.territorial ??
    '—'
  );
}

function mapAuditoriaApi(raw: any): AuditoriaItem {
  return {
    id: String(raw.id ?? raw._id ?? raw.uuid ?? ''),
    codigo: raw.codigo ?? '',
    titulo: raw.nombre ?? raw.titulo ?? 'Auditoría',
    tipo: raw.tipo ?? 'Gestión',
    estado: mapEstadoAuditoria(raw),
    fechaNotificacion: fechaCO(
      raw.fechaNotificacionPreliminar
      ?? raw.fechaInicioComunicacion
      ?? raw.fechaInicio
      ?? raw.createdAt,
    ),
    auditorLider: extraerAuditorLider(raw),
    area: extraerAreaAuditada(raw),
    hallazgos: Number(raw.hallazgosCount ?? raw.totalHallazgos ?? raw.hallazgos ?? 0) || 0,
    documentosSolicitados: Number(
      raw.documentosSolicitados ?? raw.totalDocumentosSolicitados ?? 0,
    ) || 0,
    documentosSubidos: Number(
      raw.documentosSubidos ?? raw.totalDocumentos ?? 0,
    ) || 0,
    descripcion: raw.objetivo ?? raw.descripcion ?? '',
    urgencia: mapUrgencia(raw),
    informeFinalGenerado: !!(
      raw.informeFinalGenerado
      ?? raw.checklistCompletados?.informeFinalGenerado
      ?? raw.fechaInformeFinal
    ),
    fechaInformeFinal: fechaCO(raw.fechaInformeFinal ?? raw.fechaFinComunicacion),
  };
}

function mapHallazgoApi(raw: any): HallazgoItem {
  const estado = normalizeEstadoHallazgo(raw.estado);
  const estadoRaw = estado;
  return {
    id: String(raw.id ?? ''),
    codigo: raw.codigo ?? raw.id ?? '',
    titulo: raw.titulo ?? raw.descripcion?.substring(0, 80) ?? 'Hallazgo',
    descripcion: raw.descripcion ?? '',
    gravedad: (String(raw.gravedad ?? 'MODERADO').toUpperCase() as GravedadHallazgo) || 'MODERADO',
    estado,
    criterioIncumplido: raw.criterioIncumplido ?? raw.criterio ?? undefined,
    causas: Array.isArray(raw.causas) ? raw.causas : raw.causa ? [raw.causa] : undefined,
    efectos: Array.isArray(raw.efectos) ? raw.efectos : raw.efecto ? [raw.efecto] : undefined,
    recomendaciones: Array.isArray(raw.recomendaciones) ? raw.recomendaciones : undefined,
    argumentosControversia: raw.argumentosControversia ?? undefined,
    observacionesControversia: raw.observacionesControversia ?? undefined,
    documentoControversiaNombre: raw.documentoControversiaNombre ?? undefined,
    documentoControversiaUrl: raw.documentoControversiaUrl ?? undefined,
    fechaPresentacion: fechaCO(raw.fechaPresentacionControversia ?? raw.fechaAceptacion ?? raw.updatedAt) || undefined,
    controversiaTurno: raw.controversiaTurno ?? undefined,
    decisionAuditor: ['ratificado','modificado','retirado'].includes(estadoRaw) ? estadoRaw as any : raw.decisionAuditor ?? undefined,
    fundamentacionTecnica: raw.fundamentacionTecnica ?? undefined,
    fechaDecision: fechaCO(raw.fechaDecisionAuditor ?? raw.fechaDecision) || undefined,
  };
}

function mapDocumentoApi(raw: any): DocumentoItem {
  const subidoPorAuditor = String(raw.tipoDocumento ?? '').includes('preliminar')
    || String(raw.tipoDocumento ?? '').includes('oficio')
    || String(raw.subidoPor ?? '').toLowerCase().includes('auditor');
  return {
    id: String(raw.id ?? ''),
    nombre: raw.nombre ?? raw.nombreArchivo ?? 'Documento',
    tipo: raw.tipoDocumento ?? raw.tipo ?? 'Archivo',
    fechaSubida: fechaCO(raw.fechaSubida ?? raw.createdAt),
    tamano: raw.tamano ?? raw.tamanoArchivo ?? '',
    estado: (raw.estadoValidacion ?? raw.estado ?? 'Pendiente') as DocumentoItem['estado'],
    observacion: raw.observaciones ?? raw.observacion,
    origen: subidoPorAuditor ? 'auditor' : 'auditado',
  };
}

// ════════════════════════════════════════════════════════════════════════════
// ADAPTERS API  (con fallback a mocks)
// ════════════════════════════════════════════════════════════════════════════

/** Lista las auditorías relevantes para el área del usuario logueado.
 *  Usa el endpoint dedicado del portal del auditado:
 *    GET /auditorias/auditado/mis-auditorias
 *  El backend filtra automáticamente por responsable_area_email = email del JWT
 *  y solo retorna las que ya fueron notificadas al área (fase >= comunicación). */
async function loadMisAuditorias(_personaId: string): Promise<AuditoriaItem[]> {
  if (!USE_API_AUDITORIAS) {
    await new Promise((r) => setTimeout(r, 250));
    return AUDITORIAS_MOCK;
  }
  try {
    const raw = await controlInternoService.getMisAuditoriasAuditado();
    const lista = Array.isArray(raw) ? raw : [];
    return lista.map(mapAuditoriaApi);
  } catch (err) {
    console.warn('[MisAuditorias] API no disponible, usando mock:', err);
    return AUDITORIAS_MOCK;
  }
}

/** Carga hallazgos reales de una de mis auditorías (auditado). */
async function loadHallazgosAuditoria(auditoriaId: string): Promise<HallazgoItem[]> {
  if (!USE_API_HALLAZGOS) return HALLAZGOS_MOCK[auditoriaId] || [];
  try {
    const raw = await controlInternoService.getMisHallazgosAuditoria(auditoriaId);
    const arr = Array.isArray(raw) ? raw : [];
    return arr.map(mapHallazgoApi);
  } catch (err) {
    console.warn('[MisAuditorias] hallazgos: fallback a mock:', err);
    return HALLAZGOS_MOCK[auditoriaId] || [];
  }
}

/** Carga documentos del expediente del área auditada. */
async function loadDocumentosAuditoria(auditoriaId: string): Promise<DocumentoItem[]> {
  if (!USE_API_DOCUMENTOS) return DOCUMENTOS_MOCK[auditoriaId] || [];
  try {
    const raw = await controlInternoService.getMisDocumentosAuditoria(auditoriaId);
    const arr = Array.isArray(raw) ? raw : [];
    return arr.map(mapDocumentoApi);
  } catch (err) {
    console.warn('[MisAuditorias] documentos: fallback a mock:', err);
    return DOCUMENTOS_MOCK[auditoriaId] || [];
  }
}

// ════════════════════════════════════════════════════════════════════════════
// CONFIG VISUAL
// ════════════════════════════════════════════════════════════════════════════

const ESTADO_AUDITORIA: Record<EstadoAuditoria, { color: string; bg: string; border: string }> = {
  'Notificada':   { color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE' },
  'En Respuesta': { color: '#B45309', bg: '#FFFBEB', border: '#FDE68A' },
  'Revisión':     { color: '#6D28D9', bg: '#F5F3FF', border: '#DDD6FE' },
  'Finalizada':   { color: '#047857', bg: '#ECFDF5', border: '#A7F3D0' },
};

const URGENCIA_CONFIG: Record<Urgencia, { color: string; label: string }> = {
  alta:  { color: '#DC2626', label: 'Alta'  },
  media: { color: '#D97706', label: 'Media' },
  baja:  { color: '#059669', label: 'Baja'  },
};

const ESTADO_HALLAZGO: Record<EstadoHallazgo, { color: string; bg: string; label: string }> = {
  'borrador':         { color: '#6B7280', bg: '#F3F4F6', label: 'Borrador' },
  'notificado':       { color: '#B45309', bg: '#FFFBEB', label: 'Notificado' },
  'aceptado':         { color: '#047857', bg: '#ECFDF5', label: 'Aceptado' },
  'en-controversia':  { color: '#1D4ED8', bg: '#EFF6FF', label: 'En controversia' },
  'ratificado':       { color: '#B91C1C', bg: '#FEF2F2', label: 'Ratificado' },
  'modificado':       { color: '#6D28D9', bg: '#F5F3FF', label: 'Modificado' },
  'retirado':         { color: '#475569', bg: '#F1F5F9', label: 'Retirado' },
  'cerrado':          { color: '#047857', bg: '#ECFDF5', label: 'Cerrado' },
};

const GRAVEDAD_COLOR: Record<GravedadHallazgo, string> = {
  LEVE: '#059669',
  MODERADO: '#D97706',
  GRAVE: '#DC2626',
  CRITICO: '#7F1D1D',
};

/** Umbral a partir del cual se activan paginación y modo compacto en listas. */
const AUDITORIAS_PAGE_SIZE = 12;
const HALLAZGOS_PAGE_SIZE = 8;
const HALLAZGOS_COMPACT_THRESHOLD = 5;
const ACCIONES_PAGE_SIZE = 6;

type FiltroHallazgoVista = 'todos' | 'pendientes' | 'respondidos' | 'borrador' | 'cerrados';

const DOC_ESTADO_COLOR: Record<DocumentoItem['estado'], { color: string; bg: string }> = {
  'Aprobado':    { color: '#047857', bg: '#ECFDF5' },
  'Pendiente':   { color: '#B45309', bg: '#FFFBEB' },
  'Rechazado':   { color: '#DC2626', bg: '#FEF2F2' },
  'Solicitado':  { color: '#6B7280', bg: '#F3F4F6' },
};

/** Tarjeta base del módulo (alineada a design tokens ESAP). */
const portalCardStyle: React.CSSProperties = {
  background: colors.bgWhite,
  borderRadius: 14,
  border: `1px solid ${colors.borderLight}`,
  boxShadow: '0 1px 2px rgba(15,23,42,0.04), 0 8px 24px rgba(0,61,165,0.04)',
};

const portalCardNestedStyle: React.CSSProperties = {
  background: colors.bgWhite,
  borderRadius: 12,
  border: `1px solid ${colors.borderLight}`,
  boxShadow: '0 1px 2px rgba(15,23,42,0.03)',
};

/** Barra de herramientas reutilizable: búsqueda, filtros y paginación. */
function ListaToolbar({
  busqueda,
  onBusquedaChange,
  placeholder,
  filtros,
  filtroActivo,
  onFiltroChange,
  total,
  pagina,
  totalPaginas,
  onPaginaAnterior,
  onPaginaSiguiente,
  extra,
}: {
  busqueda: string;
  onBusquedaChange: (v: string) => void;
  placeholder: string;
  filtros: { id: string; label: string; count?: number }[];
  filtroActivo: string;
  onFiltroChange: (id: string) => void;
  total: number;
  pagina: number;
  totalPaginas: number;
  desde: number;
  hasta: number;
  onPaginaAnterior: () => void;
  onPaginaSiguiente: () => void;
  extra?: React.ReactNode;
}) {
  return (
    <div
      style={{
        ...portalCardStyle,
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            flex: 1,
            minWidth: 180,
            height: 38,
            borderRadius: 10,
            border: `1px solid ${colors.border}`,
            background: colors.bgHover,
            paddingLeft: 12,
          }}
        >
          <Search style={{ width: 15, height: 15, color: colors.icon, flexShrink: 0 }} />
          <input
            value={busqueda}
            onChange={(e) => onBusquedaChange(e.target.value)}
            placeholder={placeholder}
            style={{
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: 13,
              color: colors.text,
              flex: 1,
              height: '100%',
              padding: '0 10px',
            }}
          />
        </div>
        {extra}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
        {filtros.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onFiltroChange(f.id)}
            style={{
              height: 32,
              padding: '0 12px',
              borderRadius: 20,
              border: filtroActivo === f.id ? 'none' : `1px solid ${colors.borderLight}`,
              background: filtroActivo === f.id ? colors.brand : colors.bgWhite,
              color: filtroActivo === f.id ? 'white' : colors.textMuted,
              fontSize: 12,
              fontWeight: filtroActivo === f.id ? 700 : 500,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {f.label}
            {typeof f.count === 'number' && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: 10,
                  background: filtroActivo === f.id ? 'rgba(255,255,255,0.25)' : colors.bgMuted,
                  color: filtroActivo === f.id ? 'white' : colors.textSecondary,
                }}
              >
                {f.count}
              </span>
            )}
          </button>
        ))}
        {totalPaginas > 1 && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: colors.textMuted, whiteSpace: 'nowrap' }}>
              {desde}–{hasta} de {total}
            </span>
            <button
              type="button"
              disabled={pagina <= 1}
              onClick={onPaginaAnterior}
              style={{
                height: 30,
                padding: '0 10px',
                borderRadius: 8,
                border: `1px solid ${colors.borderLight}`,
                background: colors.bgWhite,
                fontSize: 11,
                fontWeight: 600,
                cursor: pagina <= 1 ? 'not-allowed' : 'pointer',
                opacity: pagina <= 1 ? 0.45 : 1,
              }}
            >
              Anterior
            </button>
            <span style={{ fontSize: 11, fontWeight: 700, color: colors.brand }}>
              {pagina}/{totalPaginas}
            </span>
            <button
              type="button"
              disabled={pagina >= totalPaginas}
              onClick={onPaginaSiguiente}
              style={{
                height: 30,
                padding: '0 10px',
                borderRadius: 8,
                border: `1px solid ${colors.borderLight}`,
                background: colors.bgWhite,
                fontSize: 11,
                fontWeight: 600,
                cursor: pagina >= totalPaginas ? 'not-allowed' : 'pointer',
                opacity: pagina >= totalPaginas ? 0.45 : 1,
              }}
            >
              Siguiente
            </button>
          </div>
        )}
        {totalPaginas <= 1 && total > 0 && (
          <span style={{ marginLeft: 'auto', fontSize: 11, color: colors.textMuted }}>
            {total} elemento{total === 1 ? '' : 's'}
          </span>
        )}
      </div>
    </div>
  );
}

function MetaChip({
  icon,
  children,
  tone = 'neutral',
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
  tone?: 'neutral' | 'hallazgo' | 'brand';
}) {
  const toneStyle =
    tone === 'hallazgo'
      ? { bg: '#FFFBEB', color: '#92400E', border: '#FDE68A' }
      : tone === 'brand'
        ? { bg: colors.brandLight, color: colors.brand, border: `${colors.brand}22` }
        : { bg: colors.bgMuted, color: colors.textMuted, border: colors.borderLight };
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 11,
        fontWeight: 600,
        padding: '3px 9px',
        borderRadius: 20,
        background: toneStyle.bg,
        color: toneStyle.color,
        border: `1px solid ${toneStyle.border}`,
        maxWidth: '100%',
      }}
    >
      {icon}
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{children}</span>
    </span>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

export function MisAuditoriasControlInterno({ personaId, userName, onBack }: MisAuditoriasControlInternoProps) {
  const [auditorias, setAuditorias] = useState<AuditoriaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState<'todos' | EstadoAuditoria>('todos');
  const [paginaAuditorias, setPaginaAuditorias] = useState(1);
  const [seleccionada, setSeleccionada] = useState<AuditoriaItem | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await loadMisAuditorias(personaId);
      setAuditorias(data);
    } catch (err) {
      console.error('[MisAuditorias] Error cargando auditorías:', err);
      toast.error('No fue posible cargar tus auditorías');
      setAuditorias([]);
    } finally {
      setLoading(false);
    }
  }, [personaId]);

  useEffect(() => { load(); }, [load]);

  const filtradas = useMemo(() => {
    const term = search.trim().toLowerCase();
    return auditorias.filter((a) => {
      const matchEstado = filtroEstado === 'todos' || a.estado === filtroEstado;
      if (!matchEstado) return false;
      if (!term) return true;
      return (
        a.codigo.toLowerCase().includes(term) ||
        a.titulo.toLowerCase().includes(term) ||
        a.area.toLowerCase().includes(term) ||
        a.tipo.toLowerCase().includes(term)
      );
    });
  }, [auditorias, search, filtroEstado]);

  useEffect(() => {
    setPaginaAuditorias(1);
  }, [search, filtroEstado]);

  const totalPaginasAuditorias = Math.max(1, Math.ceil(filtradas.length / AUDITORIAS_PAGE_SIZE));
  const paginaAuditoriasSegura = Math.min(paginaAuditorias, totalPaginasAuditorias);

  const auditoriasPaginadas = useMemo(() => {
    const inicio = (paginaAuditoriasSegura - 1) * AUDITORIAS_PAGE_SIZE;
    return filtradas.slice(inicio, inicio + AUDITORIAS_PAGE_SIZE);
  }, [filtradas, paginaAuditoriasSegura]);

  const rangoAuditorias = useMemo(() => {
    if (filtradas.length === 0) return { desde: 0, hasta: 0 };
    const desde = (paginaAuditoriasSegura - 1) * AUDITORIAS_PAGE_SIZE + 1;
    const hasta = Math.min(paginaAuditoriasSegura * AUDITORIAS_PAGE_SIZE, filtradas.length);
    return { desde, hasta };
  }, [filtradas.length, paginaAuditoriasSegura]);

  const stats = useMemo(() => ({
    total: auditorias.length,
    enRespuesta: auditorias.filter((a) => a.estado === 'En Respuesta').length,
    pendientes: auditorias.reduce(
      (acc, a) => acc + Math.max(a.documentosSolicitados - a.documentosSubidos, 0),
      0,
    ),
    finalizadas: auditorias.filter((a) => a.estado === 'Finalizada').length,
  }), [auditorias]);

  // Vista detalle
  if (seleccionada) {
    return (
      <DetalleAuditoria
        auditoria={seleccionada}
        userName={userName}
        onBack={() => setSeleccionada(null)}
      />
    );
  }

  // Vista lista
  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
        <button
          onClick={onBack}
          aria-label="Volver al portal"
          style={{
            width: 36, height: 36, borderRadius: 10,
            border: '1px solid #E5E7EB', background: 'white', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <ArrowLeft style={{ width: 16, height: 16, color: '#6B7280' }} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#1F2937', letterSpacing: '-0.02em' }}>
            Mis Auditorías
          </div>
          <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Shield style={{ width: 13, height: 13 }} />
            Auditorías de control interno asignadas a tu área
          </div>
        </div>
        <button
          onClick={load}
          aria-label="Recargar"
          style={{
            width: 40, height: 40, borderRadius: 10,
            border: '1px solid #E5E7EB', background: 'white', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <RefreshCw style={{ width: 14, height: 14, color: '#6B7280' }} />
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12, marginBottom: 18 }}>
        <StatCard label="Auditorías"        value={stats.total}        bg="#EFF6FF" color="#1D4ED8" icon={<ClipboardList style={{ width: 16, height: 16 }} />} />
        <StatCard label="En respuesta"      value={stats.enRespuesta}  bg="#FFFBEB" color="#B45309" icon={<AlertCircle    style={{ width: 16, height: 16 }} />} />
        <StatCard label="Docs por subir"    value={stats.pendientes}   bg="#FEF2F2" color="#DC2626" icon={<Upload         style={{ width: 16, height: 16 }} />} />
        <StatCard label="Finalizadas"       value={stats.finalizadas}  bg="#ECFDF5" color="#047857" icon={<CheckCircle2   style={{ width: 16, height: 16 }} />} />
      </div>

      {/* Search + filtros */}
      <div
        style={{
          background: 'white', borderRadius: 14, padding: '16px 20px',
          marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            display: 'flex', alignItems: 'center', flex: 1, minWidth: 200,
            height: 36, borderRadius: 10,
            border: searchFocused ? '1px solid #003DA5' : '1px solid #D1D5DB',
            background: '#F9FAFB', paddingLeft: 12,
            boxShadow: searchFocused ? '0 0 0 3px rgba(0,61,165,0.08)' : 'none',
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
        >
          <Search style={{ width: 15, height: 15, color: '#9CA3AF', flexShrink: 0 }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por código, título, área o tipo..."
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            style={{
              border: 'none', outline: 'none', background: 'transparent',
              fontSize: 13, color: '#1F2937', flex: 1, height: '100%', padding: '0 10px',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(['todos', 'Notificada', 'En Respuesta', 'Revisión', 'Finalizada'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFiltroEstado(f)}
              style={{
                height: 34, padding: '0 14px', borderRadius: 20,
                border: filtroEstado === f ? 'none' : '1px solid #E5E7EB',
                background: filtroEstado === f ? colors.brand : 'white',
                color: filtroEstado === f ? 'white' : '#6B7280',
                fontSize: 12, fontWeight: filtroEstado === f ? 600 : 400,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {f === 'todos' ? 'Todas' : f}
            </button>
          ))}
        </div>
      </div>

      {/* Encabezado de sección */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ClipboardList style={{ width: 16, height: 16, color: '#374151' }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: '#374151' }}>
            Auditorías asignadas
          </span>
          <span style={{
            fontSize: 11, fontWeight: 600, color: '#6B7280',
            background: '#F3F4F6', padding: '2px 8px', borderRadius: 10,
          }}>
            {filtradas.length} proceso{filtradas.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes pulse-urgency { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }`}</style>

      {/* Lista */}
      <div>
        {loading ? (
          <div style={{ padding: '48px 0', textAlign: 'center', background: 'white', borderRadius: 14 }}>
            <Loader2 style={{ width: 28, height: 28, color: colors.brand, margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
            <div style={{ fontSize: 14, color: '#6B7280' }}>Cargando auditorías...</div>
          </div>
        ) : filtradas.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center', background: 'white', borderRadius: 14 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <ClipboardList style={{ width: 24, height: 24, color: '#9CA3AF' }} />
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#374151' }}>Sin auditorías asignadas</div>
            <div style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>
              {search || filtroEstado !== 'todos'
                ? 'No hay resultados que coincidan con los filtros aplicados.'
                : 'Aún no tienes procesos de auditoría asignados a tu área.'}
            </div>
          </div>
        ) : (
          <>
            <div>
              {auditoriasPaginadas.map((a, idx) => (
                <AuditoriaRow
                  key={a.id}
                  auditoria={a}
                  isLast={idx === auditoriasPaginadas.length - 1 && paginaAuditoriasSegura >= totalPaginasAuditorias}
                  onClick={() => setSeleccionada(a)}
                />
              ))}
            </div>
            {filtradas.length > AUDITORIAS_PAGE_SIZE && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 10,
                  padding: '12px 16px',
                  borderTop: `1px solid ${colors.borderLight}`,
                  background: colors.bgSubtle,
                }}
              >
                <span style={{ fontSize: 12, color: colors.textMuted }}>
                  Mostrando {rangoAuditorias.desde}–{rangoAuditorias.hasta} de {filtradas.length} auditorías
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    disabled={paginaAuditoriasSegura <= 1}
                    onClick={() => setPaginaAuditorias((p) => Math.max(1, p - 1))}
                    style={{
                      height: 32,
                      padding: '0 12px',
                      borderRadius: 8,
                      border: `1px solid ${colors.borderLight}`,
                      background: colors.bgWhite,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: paginaAuditoriasSegura <= 1 ? 'not-allowed' : 'pointer',
                      opacity: paginaAuditoriasSegura <= 1 ? 0.5 : 1,
                    }}
                  >
                    Anterior
                  </button>
                  <span style={{ fontSize: 12, fontWeight: 700, color: colors.brand }}>
                    Página {paginaAuditoriasSegura} / {totalPaginasAuditorias}
                  </span>
                  <button
                    type="button"
                    disabled={paginaAuditoriasSegura >= totalPaginasAuditorias}
                    onClick={() => setPaginaAuditorias((p) => Math.min(totalPaginasAuditorias, p + 1))}
                    style={{
                      height: 32,
                      padding: '0 12px',
                      borderRadius: 8,
                      border: `1px solid ${colors.borderLight}`,
                      background: colors.bgWhite,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: paginaAuditoriasSegura >= totalPaginasAuditorias ? 'not-allowed' : 'pointer',
                      opacity: paginaAuditoriasSegura >= totalPaginasAuditorias ? 0.5 : 1,
                    }}
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SUBCOMPONENTES - LISTA
// ════════════════════════════════════════════════════════════════════════════

function StatCard({ label, value, bg, color, icon }: { label: string; value: number; bg: string; color: string; icon: React.ReactNode }) {
  return (
    <div
      style={{
        background: 'white', borderRadius: 14, padding: '14px 16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: 12,
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 10, background: bg, color,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#111827', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.4 }}>
          {label}
        </div>
      </div>
    </div>
  );
}

function AuditoriaRow({
  auditoria, isLast, onClick,
}: { auditoria: AuditoriaItem; isLast: boolean; onClick: () => void }) {
  const estado = ESTADO_AUDITORIA[auditoria.estado];
  const urgencia = URGENCIA_CONFIG[auditoria.urgencia];
  const docPorSubir = Math.max(auditoria.documentosSolicitados - auditoria.documentosSubidos, 0);
  const progreso = auditoria.documentosSolicitados === 0
    ? 0
    : Math.min(100, Math.round((auditoria.documentosSubidos / auditoria.documentosSolicitados) * 100));
  const plazo = calcularPlazoActivo(auditoria);
  const isOverdue = !!plazo?.vencido;

  // Icon por tipo de auditoría
  const tipoIcon = auditoria.tipo?.toLowerCase().includes('seg') ? '🔄'
    : auditoria.tipo?.toLowerCase().includes('reg') ? '📋'
    : '🔍';

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', textAlign: 'left',
        padding: 0,
        background: 'white',
        border: 'none',
        cursor: 'pointer',
        display: 'block',
        marginBottom: 10,
      }}
    >
      <div
        style={{
          display: 'flex',
          borderRadius: 14,
          border: `1px solid ${isOverdue ? '#FCA5A5' : '#E5E7EB'}`,
          overflow: 'hidden',
          transition: 'all 0.2s ease',
          boxShadow: isOverdue
            ? '0 0 0 1px #FCA5A5, 0 2px 8px rgba(220,38,38,0.1)'
            : '0 1px 3px rgba(0,0,0,0.04)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)';
          e.currentTarget.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = isOverdue
            ? '0 0 0 1px #FCA5A5, 0 2px 8px rgba(220,38,38,0.1)'
            : '0 1px 3px rgba(0,0,0,0.04)';
          e.currentTarget.style.transform = 'none';
        }}
      >
        {/* Barra lateral de estado — gruesa y con color */}
        <div style={{
          width: 5, flexShrink: 0,
          background: isOverdue ? '#DC2626' : urgencia.color,
        }} />

        {/* Contenido principal */}
        <div style={{ flex: 1, padding: '16px 18px', minWidth: 0 }}>
          {/* Fila 1: Código + Estado + Tipo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 12, fontWeight: 800, color: '#374151',
              background: '#F3F4F6', padding: '2px 8px', borderRadius: 6,
              letterSpacing: 0.3, fontFamily: 'monospace',
            }}>
              {auditoria.codigo}
            </span>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
              color: estado.color, background: estado.bg, border: `1px solid ${estado.border}`,
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: estado.color }} />
              {auditoria.estado}
            </span>
            <span style={{ fontSize: 11, color: '#9CA3AF', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              {tipoIcon} {auditoria.tipo}
            </span>
          </div>

          {/* Fila 2: Título */}
          <div style={{
            fontSize: 15, fontWeight: 700, color: '#111827',
            marginBottom: 10, lineHeight: 1.4,
          }}>
            {auditoria.titulo}
          </div>

          {/* Fila 3: Metadata chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: '#6B7280', flexWrap: 'wrap' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: '#F9FAFB', padding: '3px 8px', borderRadius: 6,
            }}>
              <User style={{ width: 12, height: 12, color: '#9CA3AF' }} />
              {auditoria.auditorLider}
            </span>
            {plazo && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: '#F9FAFB', padding: '3px 8px', borderRadius: 6,
              }}>
                <Calendar style={{ width: 12, height: 12, color: '#9CA3AF' }} />
                Vence {formatearFechaCO(plazo.fechaLimite)}
              </span>
            )}
            {auditoria.hallazgos > 0 && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: '#FFFBEB', padding: '3px 8px', borderRadius: 6,
                color: '#B45309', fontWeight: 600,
              }}>
                <AlertCircle style={{ width: 12, height: 12 }} />
                {auditoria.hallazgos} hallazgo{auditoria.hallazgos === 1 ? '' : 's'}
              </span>
            )}
          </div>

          {/* Fila 4: Barra de progreso (si aplica) */}
          {auditoria.documentosSolicitados > 0 && (
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, height: 6, borderRadius: 3, background: '#F3F4F6', overflow: 'hidden' }}>
                <div style={{
                  width: `${progreso}%`, height: '100%',
                  background: progreso === 100 ? '#10B981' : '#3B82F6',
                  borderRadius: 3,
                  transition: 'width 0.4s ease',
                }} />
              </div>
              <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 600, minWidth: 36, textAlign: 'right' }}>
                {progreso}%
              </span>
            </div>
          )}
        </div>

        {/* Columna derecha: Urgencia + Chevron */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
          justifyContent: 'center', gap: 8, flexShrink: 0,
          padding: '16px 14px 16px 0',
        }}>
          {plazo && auditoria.estado !== 'Finalizada' && (
            <span style={{
              fontSize: 11, fontWeight: 800,
              padding: '4px 10px', borderRadius: 8,
              color: isOverdue ? 'white' : plazo.diasHabilesRestantes <= 5 ? '#B45309' : '#374151',
              background: isOverdue ? '#DC2626' : plazo.diasHabilesRestantes <= 5 ? '#FEF3C7' : '#F9FAFB',
              display: 'inline-flex', alignItems: 'center', gap: 4,
              ...(isOverdue ? { animation: 'pulse-urgency 2s ease-in-out infinite' } : {}),
            }}>
              {isOverdue ? (
                <><AlertTriangle style={{ width: 12, height: 12 }} /> Vencido</>
              ) : (
                <><Clock style={{ width: 12, height: 12 }} /> {plazo.diasHabilesRestantes} día{plazo.diasHabilesRestantes === 1 ? '' : 's'}</>
              )}
            </span>
          )}
          <ChevronRight style={{ width: 18, height: 18, color: '#D1D5DB' }} />
        </div>
      </div>
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// VISTA DETALLE
// ════════════════════════════════════════════════════════════════════════════

type DetalleTab = 'info' | 'hallazgos' | 'documentos' | 'plan';

const ESTADOS_ACCION_AUDITADO = [
  { value: 'programada',   label: 'Programada' },
  { value: 'en-progreso',  label: 'En progreso' },
  { value: 'implementada', label: 'Implementada' },
  { value: 'vencida',      label: 'Vencida' },
  { value: 'completada',   label: 'Completada' },
] as const;

/** Metadatos premium para badge de estado de acción correctiva */
const ACCION_BADGE_META: Record<string, { bg: string; color: string; border: string; label: string }> = {
  programada:   { label: 'Programada',   bg: '#F5F3FF', color: '#6D28D9', border: '#DDD6FE' },
  'en-progreso':{ label: 'En progreso',  bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  implementada: { label: 'Implementada', bg: '#FFF7ED', color: '#C2410C', border: '#FED7AA' },
  vencida:      { label: 'Vencida',      bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA' },
  completada:   { label: 'Completada',   bg: '#ECFDF5', color: '#047857', border: '#A7F3D0' },
};
const ACCION_BADGE_ICON: Record<string, React.ReactNode> = {
  programada:    <Clock style={{ width: 11, height: 11 }} />,
  'en-progreso': <Loader2 style={{ width: 11, height: 11 }} />,
  implementada:  <CheckCircle2 style={{ width: 11, height: 11 }} />,
  vencida:       <AlertTriangle style={{ width: 11, height: 11 }} />,
  completada:    <CheckCircle2 style={{ width: 11, height: 11 }} />,
};
const getAccionBadge = (estado: string) => {
  const meta = ACCION_BADGE_META[estado] ?? { label: estado || 'Programada', bg: '#F3F4F6', color: '#374151', border: '#E5E7EB' };
  const icon = ACCION_BADGE_ICON[estado] ?? <ClipboardList style={{ width: 11, height: 11 }} />;
  return { ...meta, icon };
};

/** Resumen compacto de acción correctiva bajo un hallazgo (pestaña Hallazgos). */
function AccionCorrectivaResumenCard({ accion }: { accion: any }) {
  const badge = getAccionBadge(accion.estado || 'programada');
  const pct = typeof accion.porcentajeAvance === 'number' ? accion.porcentajeAvance : 0;
  return (
    <div style={{ ...portalCardNestedStyle, padding: '12px 14px', marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: colors.text, lineHeight: 1.4, flex: 1 }}>
          {accion.descripcion}
        </div>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            padding: '3px 9px',
            borderRadius: 20,
            flexShrink: 0,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            background: badge.bg,
            color: badge.color,
            border: `1px solid ${badge.border}`,
          }}
        >
          {badge.icon}
          {badge.label}
        </span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {accion.responsable && (
          <MetaChip icon={<User2 style={{ width: 11, height: 11 }} />}>{accion.responsable}</MetaChip>
        )}
        {accion.fechaInicio && (
          <MetaChip icon={<CalendarDays style={{ width: 11, height: 11 }} />}>
            {accion.fechaInicio} → {accion.fechaFin}
          </MetaChip>
        )}
      </div>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: colors.textMuted, marginBottom: 4 }}>
          <span style={{ fontWeight: 600 }}>Avance</span>
          <span style={{ fontWeight: 700, color: colors.brand }}>{pct}%</span>
        </div>
        <div style={{ height: 6, background: colors.bgMuted, borderRadius: 99, overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${Math.min(100, Math.max(0, pct))}%`,
              background: pct === 100 ? '#10B981' : colors.brand,
              borderRadius: 99,
              transition: 'width 0.25s ease',
            }}
          />
        </div>
      </div>
    </div>
  );
}

/** Bloque de plan vinculado a un hallazgo. */
function PlanVinculadoHallazgo({ plan, acciones }: { plan: any; acciones: any[] }) {
  return (
    <div
      style={{
        marginTop: 10,
        marginLeft: 8,
        paddingLeft: 16,
        borderLeft: `3px solid ${colors.brand}`,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 10,
          padding: '8px 12px',
          borderRadius: 10,
          background: colors.brandLight,
          border: `1px solid ${colors.brand}18`,
        }}
      >
        <ClipboardList style={{ width: 14, height: 14, color: colors.brand, flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: colors.brand, letterSpacing: 0.2 }}>
          Plan {plan.codigo || plan.id}
        </span>
        <span style={{ fontSize: 11, color: colors.textMuted }}>
          · {acciones.length} acción{acciones.length === 1 ? '' : 'es'} correctiva{acciones.length === 1 ? '' : 's'}
        </span>
      </div>
      {acciones.map((accion) => (
        <AccionCorrectivaResumenCard key={accion.id} accion={accion} />
      ))}
    </div>
  );
}

/** Planes y acciones del auditado (GET/PATCH bajo /auditorias/auditado/...). */
function TabPlanMejoramientoAuditado({
  auditoria,
  auditoriaId,
  readOnly,
  hallazgos,
}: {
  auditoria: AuditoriaItem;
  auditoriaId: string;
  readOnly: boolean;
  /** Lista de hallazgos de la auditoría, para vincular cada acción a un hallazgo. */
  hallazgos: HallazgoItem[];
}) {
  const [planes, setPlanes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<
    Record<string, { porcentaje: number; obs: string; estado: string }>
  >({});

  // ── Evidencias por acción ────────────────────────────────────────────────
  // archivosEvidencia: archivos pendientes de subir
  // evidenciasSubidas: objetos completos ya persistidos en el backend
  // subiendoEvidencia / eliminandoEvidencia: IDs de evidencia en operación
  const [archivosEvidencia, setArchivosEvidencia] = useState<Record<string, File[]>>({});
  const [evidenciasSubidas, setEvidenciasSubidas] = useState<Record<string, any[]>>({});
  const [subiendoEvidencia, setSubiendoEvidencia] = useState<string | null>(null);
  const [eliminandoEvidencia, setEliminandoEvidencia] = useState<string | null>(null);
  const [informeFinalGenerado, setInformeFinalGenerado] = useState(false);
  const [creatingPlan, setCreatingPlan] = useState(false);
  const [modalCrearPlanOpen, setModalCrearPlanOpen] = useState(false);

  // Custom confirm modal state (replaces native confirm())
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    accent?: string;
    icon?: 'send' | 'trash' | 'warning';
    onConfirm: () => void;
  }>({ open: false, title: '', message: '', onConfirm: () => {} });

  // Estado del formulario para crear nueva acción
  const [showNewAccion, setShowNewAccion] = useState<Record<string, boolean>>({});
  const [newAccionDraft, setNewAccionDraft] = useState<Record<string, {
    descripcion: string;
    responsable: string;
    fechaInicio: string;
    fechaFin: string;
    indicador: string;
    metaIndicador: string;
    hallazgoId: string;
    tipo: string;
    causaRaiz: string;
    recursos: string;
  }>>({});
  const [savingNew, setSavingNew] = useState<string | null>(null);

  // Estado para el wizard de 5 Porqués por plan
  const [porques, setPorques] = useState<Record<string, string[]>>({});
  const getPorques = (planId: string) => porques[planId] || ['', '', '', '', ''];
  const setPorque = (planId: string, idx: number, val: string) => {
    setPorques((prev) => {
      const arr = [...(prev[planId] || ['', '', '', '', ''])];
      arr[idx] = val;
      return { ...prev, [planId]: arr };
    });
  };

  // Plantillas de acciones correctivas comunes
  const PLANTILLAS_ACCIONES = [
    {
      nombre: 'Foliación de documentos',
      tipo: 'correctiva',
      descripcion: 'Implementar el proceso de foliación de documentos según las Tablas de Retención Documental (TRD) vigentes.',
      indicador: '% de expedientes foliados correctamente',
      metaIndicador: 'Lograr el 100% de expedientes foliados al cierre del trimestre',
      recursos: 'Personal de gestión documental, capacitación en TRD',
    },
    {
      nombre: 'Actualización de procedimientos',
      tipo: 'correctiva',
      descripcion: 'Revisar y actualizar los procedimientos del proceso para alinearlos con la normatividad vigente y las necesidades operativas.',
      indicador: '% de procedimientos actualizados',
      metaIndicador: 'Actualizar el 100% de los procedimientos identificados',
      recursos: 'Líder de proceso, equipo de calidad, sistema de gestión documental',
    },
    {
      nombre: 'Capacitación del equipo',
      tipo: 'preventiva',
      descripcion: 'Diseñar y ejecutar un plan de capacitación para fortalecer las competencias del equipo en las áreas identificadas como debilidades.',
      indicador: '% de funcionarios capacitados',
      metaIndicador: 'Capacitar al 100% de los funcionarios del área',
      recursos: 'Presupuesto de capacitación, facilitadores internos/externos',
    },
    {
      nombre: 'Implementación de controles',
      tipo: 'preventiva',
      descripcion: 'Diseñar e implementar controles preventivos y detectivos para mitigar los riesgos identificados en el hallazgo.',
      indicador: 'N° de controles implementados vs. programados',
      metaIndicador: 'Implementar el 100% de los controles diseñados',
      recursos: 'Líder de proceso, gestión de riesgos',
    },
    {
      nombre: 'Digitalización de expedientes',
      tipo: 'mejora',
      descripcion: 'Digitalizar los expedientes del proceso para garantizar su preservación, acceso y cumplimiento de la política de cero papel.',
      indicador: '% de expedientes digitalizados',
      metaIndicador: 'Digitalizar el 100% de los expedientes activos',
      recursos: 'Escáner, personal TIC, sistema de gestión documental electrónico',
    },
  ];

  const aplicarPlantilla = (planId: string, plantilla: typeof PLANTILLAS_ACCIONES[0]) => {
    setNewAccionDraft((prev) => ({
      ...prev,
      [planId]: {
        ...prev[planId],
        descripcion: plantilla.descripcion,
        tipo: plantilla.tipo,
        indicador: plantilla.indicador,
        metaIndicador: plantilla.metaIndicador,
        recursos: plantilla.recursos,
      },
    }));
    toast.success(`Plantilla "${plantilla.nombre}" aplicada`);
  };

  // Usuarios del sistema para el select de responsable — cargados del auth-service
  const [usuarios, setUsuarios] = useState<Array<{ id: string; nombre: string; email: string; rol: string }>>([]);
  const [busquedaResponsable, setBusquedaResponsable] = useState<Record<string, string>>({});

  useEffect(() => {
    controlInternoService.getUsuariosActivos()
      .then(setUsuarios)
      .catch(() => {
        console.warn('[TabPlanMejoramiento] No se pudieron cargar usuarios del auth-service');
      });
  }, []);


  // Estado edición de acciones existentes en fase de formulación (borrador/revision)
  const [editAccion, setEditAccion] = useState<Record<string, {
    descripcion: string; responsable: string; fechaInicio: string; fechaFin: string; indicador: string;
  } | null>>({});
  const [savingEdit, setSavingEdit] = useState<string | null>(null);

  const hallazgosParaPlan = useMemo(() => hallazgos
    .filter(h => h.estado !== 'retirado')
    .map(h => ({
      id: h.id,
      titulo: h.titulo || h.descripcion?.substring(0, 80) || 'Sin título',
      gravedad: ((h.gravedad || 'MODERADO') === 'CRITICO' ? 'GRAVE' : (h.gravedad || 'MODERADO')) as 'LEVE' | 'MODERADO' | 'GRAVE',
      descripcion: h.descripcion || '',
      causas: h.causas || [],
      efectos: h.efectos || [],
      recomendaciones: h.recomendaciones || []
    })), [hallazgos]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Intentar primero con el endpoint del auditado (valida ownership por JWT)
      let data: any[];
      try {
        data = await controlInternoService.getPlanesMejoramientoAuditado(auditoriaId);
      } catch (ownerErr) {
        // Si falla por ownership (403) o not found, fallback al endpoint general
        console.warn('[TabPlanMejoramiento] Endpoint auditado falló, usando fallback:', ownerErr);
        try {
          data = await controlInternoService.getPlanesMejoramientoByAuditoria(auditoriaId);
        } catch {
          data = [];
        }
      }
      const list = Array.isArray(data) ? data : [];
      setPlanes(list);
      const d: Record<string, { porcentaje: number; obs: string; estado: string }> = {};
      for (const p of list) {
        for (const a of p.acciones || []) {
          d[a.id] = {
            porcentaje: typeof a.porcentajeAvance === 'number' ? a.porcentajeAvance : 0,
            obs: (a.observaciones as string) ?? '',
            estado: String(a.estado ?? 'programada'),
          };
        }
      }
      setDrafts(d);
      try {
        const estadoComunicacion = await controlInternoService
          .getEstadoComunicacionAuditado(auditoriaId)
          .catch(() => controlInternoService.getEstadoComunicacion(auditoriaId));
        setInformeFinalGenerado(estadoComunicacion.informeFinalGenerado ?? false);
      } catch (ownerErr) {
        console.warn('[TabPlanMejoramiento] No se pudo cargar estado de comunicación:', ownerErr);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'No se pudieron cargar los planes';
      setError(msg);
      setPlanes([]);
    } finally {
      setLoading(false);
    }
  }, [auditoriaId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Carga en paralelo los conteos de evidencias cada vez que los planes cambian.
  // Se hace en un effect separado para no bloquear la carga de planes ni perder
  // el contador local si alguna llamada al backend falla.
  useEffect(() => {
    if (!planes.length) return;

    // Construir lista de tareas: { planId, accionId }
    const tareas: { planId: string; accionId: string }[] = [];
    for (const p of planes) {
      for (const a of p.acciones || []) {
        tareas.push({ planId: p.id, accionId: a.id });
      }
    }
    if (!tareas.length) return;

    // Lanzar todas las peticiones en paralelo
    Promise.allSettled(
      tareas.map(({ planId, accionId }) =>
        controlInternoService
          .getEvidenciasAccionAuditado(auditoriaId, planId, accionId)
          .then((evs) => ({ accionId, items: Array.isArray(evs) ? evs : [] }))
      )
    ).then((results) => {
      setEvidenciasSubidas((prev) => {
        const next = { ...prev };
        for (const r of results) {
          if (r.status === 'fulfilled') {
            next[r.value.accionId] = r.value.items;
          }
        }
        return next;
      });
    });
  }, [planes, auditoriaId]);

  /** Calcula el estado automático de una acción según sus fechas y si está completada. */
  const calcEstadoAuto = (accion: any, completada: boolean): string => {
    if (completada) return 'completada';
    const hoy = new Date();
    const fin = accion.fechaFin ? new Date(accion.fechaFin) : null;
    const inicio = accion.fechaInicio ? new Date(accion.fechaInicio) : null;
    if (fin && hoy > fin) return 'vencida';
    if (inicio && hoy >= inicio) return 'en-progreso';
    return 'programada';
  };

  /** Elimina una evidencia del backend y la quita del estado local. */
  const eliminarEvidencia = async (accionId: string, evidenciaId: string) => {
    setConfirmModal({
      open: true,
      title: 'Eliminar evidencia',
      message: '¿Estás seguro de eliminar esta evidencia? Esta acción no se puede deshacer.',
      confirmLabel: 'Sí, eliminar',
      cancelLabel: 'Cancelar',
      accent: '#DC2626',
      icon: 'trash',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, open: false }));
        setEliminandoEvidencia(evidenciaId);
        try {
          await controlInternoService.deleteEvidencia(evidenciaId);
          setEvidenciasSubidas((prev) => ({
            ...prev,
            [accionId]: (prev[accionId] ?? []).filter((e: any) => e.id !== evidenciaId),
          }));
          toast.success('Evidencia eliminada');
        } catch (e: unknown) {
          toast.error(e instanceof Error ? e.message : 'No se pudo eliminar');
        } finally {
          setEliminandoEvidencia(null);
        }
      },
    });
  };

  const setDraft = (accionId: string, patch: Partial<{ porcentaje: number; obs: string; estado: string }>) => {
    setDrafts((prev) => ({
      ...prev,
      [accionId]: { ...prev[accionId], ...patch },
    }));
  };

  /** Sube todos los archivos pendientes de una acción y devuelve cuántos se subieron. */
  const subirEvidenciasPendientes = async (planId: string, accionId: string): Promise<number> => {
    const archivos = archivosEvidencia[accionId] ?? [];
    if (!archivos.length) return 0;
    let subidos = 0;
    setSubiendoEvidencia(accionId);
    for (const archivo of archivos) {
      try {
        // Usa la ruta del portal auditado: POST /auditorias/auditado/:id/planes/:planId/acciones/:accionId/evidencias
        // Solo requiere JWT (no permisos OCI). El backend valida ownership.
        await controlInternoService.uploadEvidenciaAccionAuditado(
          auditoriaId,
          planId,
          accionId,
          archivo,
          { nombre: archivo.name, tipoDocumento: 'evidencia_accion' },
        );
        subidos++;
      } catch (err) {
        console.warn('[subirEvidencia] error en archivo:', archivo.name, err);
      }
    }
    setSubiendoEvidencia(null);
    // Limpiar pendientes y recargar lista completa desde el backend
    setArchivosEvidencia((prev) => ({ ...prev, [accionId]: [] }));
    try {
      const evs = await controlInternoService.getEvidenciasAccionAuditado(auditoriaId, planId, accionId);
      setEvidenciasSubidas((prev) => ({ ...prev, [accionId]: Array.isArray(evs) ? evs : [] }));
    } catch { /* mantiene el estado previo */ }
    return subidos;
  };

  const guardarAccion = async (planId: string, accionId: string) => {
    const d = drafts[accionId];
    if (!d) return;

    // Validar: si intenta marcar como completada, debe haber evidencia
    const totalEvidencias = (evidenciasSubidas[accionId]?.length ?? 0) + (archivosEvidencia[accionId]?.length ?? 0);
    if (d.estado === 'completada' && totalEvidencias === 0) {
      toast.error('Debes subir al menos una evidencia para marcar esta acción como completada');
      return;
    }

    setSavingId(accionId);
    try {
      // 1. Subir archivos pendientes primero
      const subidos = await subirEvidenciasPendientes(planId, accionId);
      if (subidos > 0) {
        toast.success(`${subidos} evidencia${subidos > 1 ? 's' : ''} subida${subidos > 1 ? 's' : ''} correctamente`);
      }

      // 2. Guardar el avance
      await controlInternoService.updateAccionPlanAuditado(auditoriaId, planId, accionId, {
        porcentajeAvance: Math.min(100, Math.max(0, Math.round(d.porcentaje))),
        observaciones: d.obs,
        estado: d.estado,
      });
      toast.success('Avance guardado correctamente');
      await load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'No se pudo guardar';
      toast.error(msg);
    } finally {
      setSavingId(null);
    }
  };


  const crearNuevaAccion = async (planId: string) => {
    const d = newAccionDraft[planId];
    if (!d?.descripcion?.trim()) {
      toast.error('La descripción de la acción es obligatoria');
      return;
    }
    if (!d.responsable?.trim()) {
      toast.error('El responsable de la acción es obligatorio');
      return;
    }
    if (!d.hallazgoId) {
      toast.error('Debe vincular la acción a un hallazgo obligatoriamente');
      return;
    }
    if (!d.fechaInicio || !d.fechaFin) {
      toast.error('Las fechas de inicio y fin son obligatorias');
      return;
    }
    if (d.fechaFin < d.fechaInicio) {
      toast.error('La fecha fin no puede ser anterior a la fecha inicio');
      return;
    }
    setSavingNew(planId);
    try {
      await controlInternoService.crearAccionPlanAuditado(auditoriaId, planId, {
        descripcion: d.descripcion.trim(),
        responsable: d.responsable.trim(),
        fechaInicio: d.fechaInicio,
        fechaFin: d.fechaFin,
        indicador: d.indicador.trim() || undefined,
        metaIndicador: d.metaIndicador?.trim() || undefined,
        hallazgoId: d.hallazgoId || undefined,
        tipo: d.tipo || 'correctiva',
        recursos: d.recursos?.trim() || undefined,
        observaciones: (() => {
          // Combinar los 5 porqués en un texto estructurado
          const pqs = getPorques(planId).filter((p) => p.trim());
          if (pqs.length > 0) {
            return pqs.map((p, i) => `¿Por qué ${i + 1}? ${p}`).join('\n');
          }
          return d.causaRaiz?.trim() || undefined;
        })(),
      });
      toast.success('Acción creada exitosamente');
      setShowNewAccion((prev) => ({ ...prev, [planId]: false }));
      setNewAccionDraft((prev) => ({ ...prev, [planId]: { descripcion: '', responsable: '', fechaInicio: '', fechaFin: '', indicador: '', metaIndicador: '', hallazgoId: '', tipo: 'correctiva', causaRaiz: '', recursos: '' } }));
      await load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'No se pudo crear la acción';
      toast.error(msg);
    } finally {
      setSavingNew(null);
    }
  };

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sendingRevision, setSendingRevision] = useState<string | null>(null);
  const [paginaAccionesPorPlan, setPaginaAccionesPorPlan] = useState<Record<string, number>>({});

  const guardarEdicionAccion = async (planId: string, accionId: string) => {
    const d = editAccion[accionId];
    if (!d) return;
    if (!d.descripcion?.trim()) { toast.error('La descripción es obligatoria'); return; }
    if (!d.responsable?.trim()) { toast.error('El responsable es obligatorio'); return; }
    if (!d.fechaInicio || !d.fechaFin) { toast.error('Las fechas son obligatorias'); return; }
    setSavingEdit(accionId);
    try {
      await controlInternoService.editarAccionPlanAuditado(auditoriaId, planId, accionId, d);
      toast.success('Acción actualizada');
      setEditAccion((prev) => ({ ...prev, [accionId]: null }));
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'No se pudo actualizar');
    } finally {
      setSavingEdit(null);
    }
  };

  const eliminarAccion = async (planId: string, accionId: string) => {
    setConfirmModal({
      open: true,
      title: 'Eliminar acción correctiva',
      message: '¿Estás seguro de eliminar esta acción correctiva? Esta acción no se puede deshacer.',
      confirmLabel: 'Sí, eliminar',
      cancelLabel: 'Cancelar',
      accent: '#DC2626',
      icon: 'trash',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, open: false }));
        setDeletingId(accionId);
        try {
          await controlInternoService.eliminarAccionPlanAuditado(auditoriaId, planId, accionId);
          toast.success('Acción eliminada');
          await load();
        } catch (e: unknown) {
          toast.error(e instanceof Error ? e.message : 'No se pudo eliminar');
        } finally {
          setDeletingId(null);
        }
      },
    });
  };

  const enviarARevision = async (planId: string) => {
    const plan = planes.find(p => p.id === planId);
    if (!plan) return;

    // Verificar que todos los hallazgos requeridos tengan al menos una acción
    const estadosRequeridos = ['aceptado', 'ratificado', 'modificado'];
    const hallazgosRequeridos = hallazgos.filter(h => estadosRequeridos.includes(h.estado.toLowerCase()));
    
    const hallazgosSinAccion = hallazgosRequeridos.filter(h => 
      !plan.acciones?.some((a: any) => a.hallazgoId === h.id)
    );

    if (hallazgosSinAccion.length > 0) {
      toast.error(`Faltan acciones para ${hallazgosSinAccion.length} hallazgo(s)`, {
        description: 'Debe formular al menos una acción para cada hallazgo aceptado/ratificado antes de enviar a revisión.',
      });
      return;
    }

    setConfirmModal({
      open: true,
      title: 'Enviar plan a revisión',
      message: '¿Enviar el plan a revisión por parte de la OCI? Una vez enviado, no podrás agregar más acciones hasta que sea aprobado o devuelto.',
      confirmLabel: 'Sí, enviar a revisión',
      cancelLabel: 'Cancelar',
      accent: colors.brand,
      icon: 'send',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, open: false }));
        setSendingRevision(planId);
        try {
          await controlInternoService.enviarPlanRevision(auditoriaId, planId);
          toast.success('Plan enviado a revisión', { description: 'La OCI revisará tu plan y lo aprobará o devolverá con observaciones.' });
          await load();
        } catch (e: unknown) {
          toast.error(e instanceof Error ? e.message : 'No se pudo enviar a revisión');
        } finally {
          setSendingRevision(null);
        }
      },
    });
  };

  const handleCrearPlanMejoramiento = useCallback(async () => {
    if (hallazgosParaPlan.length === 0) {
      toast.error('No hay hallazgos vigentes para crear el plan de mejoramiento');
      return;
    }

    setCreatingPlan(true);
    try {
      await controlInternoService.crearPlanMejoramientoAuditado(auditoriaId, {
        titulo: `Plan de Mejoramiento - ${auditoria.codigo || 'AUD'}`,
        descripcion: `${hallazgosParaPlan.length} hallazgo(s) vinculado(s) al plan de mejoramiento.`,
        objetivos: hallazgosParaPlan.map((h) =>
          `Formular acciones correctivas para: ${h.titulo}`,
        ),
      });
      toast.success('Plan de Mejoramiento creado', {
        description: `${hallazgosParaPlan.length} hallazgos vinculados. Complete las acciones correctivas para cada uno.`,
        duration: 5000,
      });
      setModalCrearPlanOpen(false);
      await load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'No se pudo crear el plan de mejoramiento');
    } finally {
      setCreatingPlan(false);
    }
  }, [auditoria.codigo, auditoriaId, hallazgosParaPlan, load]);

  if (loading) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center', color: '#6B7280' }}>
        <Loader2 style={{ width: 22, height: 22, color: colors.brand, animation: 'spin 1s linear infinite' }} />
        <div style={{ fontSize: 13, marginTop: 10 }}>Cargando planes de mejoramiento...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ background: 'white', borderRadius: 14, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ color: '#B91C1C', fontSize: 14, marginBottom: 12 }}>{error}</div>
        <button
          type="button"
          onClick={() => void load()}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: '1px solid #E5E7EB',
            background: 'white',
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!planes.length) {
    return (
      <>
        <div style={{ background: 'white', borderRadius: 14, padding: 28, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', textAlign: 'center' }}>
          <ClipboardList style={{ width: 36, height: 36, color: '#9CA3AF', margin: '0 auto 12px' }} />
          <div style={{ fontSize: 15, fontWeight: 700, color: '#374151' }}>Sin plan de mejoramiento aún</div>
          <div style={{ fontSize: 13, color: '#6B7280', marginTop: 8, lineHeight: 1.55 }}>
            Cuando el área de Control Interno registre el plan vinculado a esta auditoría, aparecerá aquí
            con las acciones correctivas. Mientras tanto puedes seguir el plazo de formulación en la pestaña Información.
          </div>
          {informeFinalGenerado && (
            <Button
              onClick={() => setModalCrearPlanOpen(true)}
              disabled={creatingPlan}
              className="bg-amber-600 hover:bg-amber-700 text-white font-medium mt-4"
            >
              <Target className="w-4 h-4 mr-2" />
              Crear Plan de Mejoramiento
            </Button>
          )}
        </div>
        {modalCrearPlanOpen && (
          <ModalCrearPlanDesdeAuditoria
            auditoria={auditoria}
            hallazgos={hallazgosParaPlan}
            creando={creatingPlan}
            onCrear={handleCrearPlanMejoramiento}
            onCerrar={() => {
              if (!creatingPlan) setModalCrearPlanOpen(false);
            }}
          />
        )}
      </>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {planes.map((plan) => {
        const estadoPlan = String(plan.estado || '').toLowerCase();
        const esRechazado = ['rechazado', 'devuelto'].includes(estadoPlan);
        const enFormulacion = estadoPlan === 'borrador' || esRechazado;
        const enRevision = estadoPlan === 'revision';
        const enEjecucion = ['aprobado', 'en_ejecucion', 'en-ejecucion'].includes(estadoPlan);
        const planCerrado = ['completado', 'vencido'].includes(estadoPlan);

        // Colores según estado del plan
        const estadoColor = esRechazado
          ? { bg: '#FEF2F2', border: '#FECACA', color: '#B91C1C', label: 'Rechazado — Requiere ajustes' }
          : (enFormulacion || enRevision)
          ? { bg: '#FFFBEB', border: '#FDE68A', color: '#B45309', label: enRevision ? 'En revisión OCI' : 'En formulación' }
          : enEjecucion
          ? { bg: '#ECFDF5', border: '#A7F3D0', color: '#047857', label: estadoPlan === 'aprobado' ? 'Aprobado — En ejecución' : 'En ejecución' }
          : { bg: '#ECFDF5', border: '#A7F3D0', color: '#047857', label: 'Completado' };

        return (
          <div
            key={plan.id}
            style={{
              ...portalCardStyle,
              padding: 20,
              border: `1px solid ${estadoColor.border}`,
            }}
          >
            {/* Header del plan */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', letterSpacing: 0.4 }}>PLAN</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: '#111827' }}>{plan.codigo || plan.titulo || plan.id}</span>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '3px 12px', borderRadius: 20,
                background: estadoColor.bg, color: estadoColor.color, border: `1px solid ${estadoColor.border}`,
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}>
                {estadoPlan === 'borrador' && <FileEdit style={{ width: 13, height: 13 }} />}
                {estadoPlan === 'revision' && <Eye style={{ width: 13, height: 13 }} />}
                {(estadoPlan === 'aprobado' || estadoPlan === 'en_ejecucion' || estadoPlan === 'en-ejecucion') && <CheckCircle2 style={{ width: 13, height: 13 }} />}
                {estadoPlan === 'rechazado' && <XCircle style={{ width: 13, height: 13 }} />}
                {estadoPlan === 'completado' && <Trophy style={{ width: 13, height: 13 }} />}
                {' '}{estadoColor.label}
              </span>
              {(plan.acciones?.length > 0) && (
                <span style={{ fontSize: 12, color: '#6B7280', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontWeight: 700, color: '#047857' }}>
                    {plan.acciones.filter((a: any) => a.estado === 'completada').length}
                  </span>/{plan.acciones.length} completadas
                </span>
              )}
            </div>

            {/* ═══ STEPPER VISUAL + DASHBOARD RESUMEN ═══ */}
            {(() => {
              const acciones = plan.acciones || [];
              const totalAcc = acciones.length;
              const completadas = acciones.filter((a: any) => a.estado === 'completada').length;
              const conEvidencia = acciones.filter((a: any) => a.evidencias?.length > 0 || a.documentos?.length > 0).length;
              const pctAvance = totalAcc > 0 ? Math.round((completadas / totalAcc) * 100) : 0;

              // Días restantes (desde fecha límite del plan)
              const fechaLimite = plan.fechaLimite || plan.fechaFin || plan.fechaCompromiso;
              let diasRestantes: number | null = null;
              if (fechaLimite) {
                const diff = new Date(fechaLimite).getTime() - Date.now();
                diasRestantes = Math.ceil(diff / (1000 * 60 * 60 * 24));
              }

              // Stepper stages
              const stages = [
                { key: 'formulacion', label: 'Formulación', icon: '📝' },
                { key: 'revision', label: 'Revisión OCI', icon: '👁️' },
                { key: 'aprobado', label: 'Aprobado', icon: '✅' },
                { key: 'ejecucion', label: 'En ejecución', icon: '⚡' },
                { key: 'cierre', label: 'Cierre', icon: '🔒' },
              ];
              const currentStageIdx = estadoPlan === 'borrador' ? 0
                : estadoPlan === 'revision' ? 1
                : estadoPlan === 'aprobado' ? 3
                : ['en_ejecucion', 'en-ejecucion'].includes(estadoPlan) ? 3
                : estadoPlan === 'completado' ? 4
                : estadoPlan === 'rechazado' ? 1
                : 0;

              return (
                <>
                  {/* STEPPER */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 0,
                    padding: '12px 16px', marginBottom: 12,
                    background: '#F9FAFB', borderRadius: 12, border: '1px solid #E5E7EB',
                    overflow: 'hidden',
                  }}>
                    {stages.map((s, i) => {
                      const isCompleted = i < currentStageIdx;
                      const isCurrent = i === currentStageIdx;
                      const isFuture = i > currentStageIdx;

                      return (
                        <React.Fragment key={s.key}>
                          {/* Stage */}
                          <div style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                            flex: 1, minWidth: 0,
                          }}>
                            <div style={{
                              width: 28, height: 28, borderRadius: '50%',
                              background: isCompleted ? '#2563EB' : isCurrent ? '#2563EB' : '#E5E7EB',
                              color: isCompleted || isCurrent ? 'white' : '#9CA3AF',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: isCompleted ? 12 : 11,
                              fontWeight: 800,
                              boxShadow: isCurrent ? '0 0 0 3px #93C5FD' : 'none',
                              transition: 'all 0.3s ease',
                            }}>
                              {isCompleted ? '✓' : s.icon}
                            </div>
                            <span style={{
                              fontSize: 9, fontWeight: isCurrent ? 800 : 600,
                              color: isCurrent ? '#1D4ED8' : isCompleted ? '#2563EB' : '#9CA3AF',
                              textAlign: 'center', lineHeight: 1.2,
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                              maxWidth: '100%',
                            }}>
                              {s.label}
                            </span>
                          </div>
                          {/* Connector line */}
                          {i < stages.length - 1 && (
                            <div style={{
                              flex: '0 0 auto', width: 24, height: 2,
                              background: i < currentStageIdx ? '#2563EB' : '#E5E7EB',
                              borderRadius: 2, marginTop: -12,
                              transition: 'background 0.3s ease',
                            }} />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>

                  {/* DASHBOARD RESUMEN — solo si hay acciones */}
                  {totalAcc > 0 && (
                    <div style={{
                      display: 'grid', gridTemplateColumns: diasRestantes !== null ? '1fr 1fr 1fr 1fr' : '1fr 1fr 1fr',
                      gap: 10, marginBottom: 14,
                    }}>
                      {/* Avance global */}
                      <div style={{
                        padding: '10px 12px', borderRadius: 10,
                        background: '#F9FAFB', border: '1px solid #E5E7EB',
                        textAlign: 'center',
                      }}>
                        <div style={{
                          fontSize: 22, fontWeight: 900,
                          color: pctAvance === 100 ? '#047857' : pctAvance >= 50 ? '#B45309' : '#374151',
                        }}>
                          {pctAvance}%
                        </div>
                        <div style={{ fontSize: 9, fontWeight: 600, color: '#6B7280', marginTop: 2 }}>Avance global</div>
                      </div>

                      {/* Acciones */}
                      <div style={{
                        padding: '10px 12px', borderRadius: 10,
                        background: '#F9FAFB', border: '1px solid #E5E7EB',
                        textAlign: 'center',
                      }}>
                        <div style={{ fontSize: 22, fontWeight: 900, color: '#374151' }}>
                          <span style={{ color: '#047857' }}>{completadas}</span>
                          <span style={{ fontSize: 13, color: '#9CA3AF' }}>/{totalAcc}</span>
                        </div>
                        <div style={{ fontSize: 9, fontWeight: 600, color: '#6B7280', marginTop: 2 }}>Acciones completadas</div>
                      </div>

                      {/* Evidencias */}
                      <div style={{
                        padding: '10px 12px', borderRadius: 10,
                        background: '#F9FAFB', border: '1px solid #E5E7EB',
                        textAlign: 'center',
                      }}>
                        <div style={{ fontSize: 22, fontWeight: 900, color: '#374151' }}>
                          <span style={{ color: '#2563EB' }}>{conEvidencia}</span>
                          <span style={{ fontSize: 13, color: '#9CA3AF' }}>/{totalAcc}</span>
                        </div>
                        <div style={{ fontSize: 9, fontWeight: 600, color: '#6B7280', marginTop: 2 }}>Con evidencia</div>
                      </div>

                      {/* Días restantes */}
                      {diasRestantes !== null && (
                        <div style={{
                          padding: '10px 12px', borderRadius: 10,
                          background: diasRestantes <= 0 ? '#FEF2F2' : diasRestantes <= 10 ? '#FFFBEB' : '#F9FAFB',
                          border: `1px solid ${diasRestantes <= 0 ? '#FCA5A5' : diasRestantes <= 10 ? '#FDE68A' : '#E5E7EB'}`,
                          textAlign: 'center',
                        }}>
                          <div style={{
                            fontSize: 22, fontWeight: 900,
                            color: diasRestantes <= 0 ? '#DC2626' : diasRestantes <= 10 ? '#B45309' : '#047857',
                          }}>
                            {diasRestantes <= 0 ? 'Vencido' : diasRestantes}
                          </div>
                          <div style={{ fontSize: 9, fontWeight: 600, color: '#6B7280', marginTop: 2 }}>
                            {diasRestantes <= 0 ? 'Plazo cumplido' : 'Días restantes'}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              );
            })()}

            {/* ── Banners de fase ─────────────────────────────────── */}
            {esRechazado && (
              <div style={{
                background: '#FEF2F2',
                border: '1.5px solid #F87171', borderRadius: 12, padding: '14px 16px', marginBottom: 14,
                display: 'flex', gap: 14, alignItems: 'flex-start',
              }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><XCircle style={{ width: 20, height: 20, color: '#DC2626' }} /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#7F1D1D', marginBottom: 4 }}>Plan devuelto por la OCI — Requiere ajustes</div>
                  {plan.motivoRechazo || plan.observaciones ? (
                    <div style={{ fontSize: 12, color: '#991B1B', lineHeight: 1.6, marginBottom: 6 }}>
                      <strong>Observaciones:</strong> {plan.motivoRechazo || plan.observaciones}
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: '#991B1B', marginBottom: 6 }}>Consulta con tu área de Control Interno para obtener más información.</div>
                  )}
                  <div style={{ fontSize: 11, color: '#92400E', fontWeight: 600, background: '#FEF3C7', padding: '6px 10px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    ✏️ Edita las acciones según las observaciones y vuelve a enviar a revisión.
                  </div>
                </div>
              </div>
            )}
            {enFormulacion && (
              <div style={{
                background: '#FFFBEB',
                border: '1.5px solid #FDE68A', borderRadius: 12, padding: '14px 16px', marginBottom: 14,
                display: 'flex', gap: 14, alignItems: 'flex-start',
              }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><FileEdit style={{ width: 18, height: 18, color: '#B45309' }} /></div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#78350F', marginBottom: 3 }}>Fase de formulación — Borrador</div>
                  <div style={{ fontSize: 12, color: '#92400E', lineHeight: 1.6 }}>
                    Agrega las acciones correctivas para subsanar cada hallazgo. Cuando termines, <strong>envía el plan a revisión</strong> con el botón de abajo.
                  </div>
                </div>
              </div>
            )}
            {enRevision && (
              <div style={{
                background: '#EFF6FF',
                border: '1.5px solid #93C5FD', borderRadius: 12, padding: '14px 16px', marginBottom: 14,
                display: 'flex', gap: 14, alignItems: 'flex-start',
              }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Eye style={{ width: 18, height: 18, color: '#1D4ED8' }} /></div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#1E40AF', marginBottom: 3 }}>En revisión — OCI evaluando el plan</div>
                  <div style={{ fontSize: 12, color: '#1E3A8A', lineHeight: 1.6 }}>
                    La Oficina de Control Interno está revisando tu plan de mejoramiento. Recibirás una notificación cuando sea <strong>aprobado</strong> o te pidan ajustes.
                  </div>
                </div>
              </div>
            )}
            {enEjecucion && (
              <div style={{
                background: '#ECFDF5',
                border: '1.5px solid #6EE7B7', borderRadius: 12, padding: '14px 16px', marginBottom: 14,
                display: 'flex', gap: 14, alignItems: 'flex-start',
              }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Rocket style={{ width: 18, height: 18, color: '#047857' }} /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#065F46', marginBottom: 3 }}>Plan aprobado — En ejecución</div>
                  <div style={{ fontSize: 12, color: '#047857', lineHeight: 1.6 }}>
                    Tu plan fue aprobado por la OCI. Actualiza el avance de cada acción y sube las evidencias cuando estén listas.
                  </div>
                  {plan.aprobadoPor && (
                    <div style={{ fontSize: 11, color: '#065F46', marginTop: 6, fontWeight: 600 }}>
                      ✅ Aprobado por: {plan.aprobadoPor} {plan.fechaAprobacion ? `· ${plan.fechaAprobacion}` : ''}
                    </div>
                  )}
                </div>
              </div>
            )}
            {estadoPlan === 'completado' && (
              <div style={{
                background: '#ECFDF5',
                border: '1.5px solid #34D399', borderRadius: 12, padding: '14px 16px', marginBottom: 14,
                display: 'flex', gap: 14, alignItems: 'center',
              }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Trophy style={{ width: 20, height: 20, color: '#047857' }} /></div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#065F46' }}>Plan completado</div>
                  <div style={{ fontSize: 12, color: '#047857' }}>Todas las acciones fueron implementadas exitosamente.</div>
                </div>
              </div>
            )}

            {/* Lista de acciones */}
            {!(plan.acciones && plan.acciones.length) ? (
              <div style={{ fontSize: 13, color: '#6B7280', padding: '12px 0' }}>
                {enFormulacion ? 'Aún no hay acciones — usa el botón de abajo para agregar la primera.' : 'Este plan no tiene acciones registradas.'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(() => {
                  const accionesLista = plan.acciones || [];
                  const muchasAcciones = accionesLista.length > ACCIONES_PAGE_SIZE;
                  const pagAcc = paginaAccionesPorPlan[plan.id] || 1;
                  const totalPagAcc = Math.max(1, Math.ceil(accionesLista.length / ACCIONES_PAGE_SIZE));
                  const pagAccSegura = Math.min(pagAcc, totalPagAcc);
                  const inicioAcc = (pagAccSegura - 1) * ACCIONES_PAGE_SIZE;
                  const accionesVisibles = muchasAcciones
                    ? accionesLista.slice(inicioAcc, inicioAcc + ACCIONES_PAGE_SIZE)
                    : accionesLista;
                  return (
                    <>
                      {muchasAcciones && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: 8,
                            padding: '8px 12px',
                            borderRadius: 10,
                            background: colors.bgMuted,
                            border: `1px solid ${colors.borderLight}`,
                          }}
                        >
                          <span style={{ fontSize: 12, fontWeight: 600, color: colors.textSecondary }}>
                            {accionesLista.length} acciones correctivas
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <button
                              type="button"
                              disabled={pagAccSegura <= 1}
                              onClick={() =>
                                setPaginaAccionesPorPlan((prev) => ({
                                  ...prev,
                                  [plan.id]: Math.max(1, pagAccSegura - 1),
                                }))
                              }
                              style={{
                                height: 28,
                                padding: '0 10px',
                                borderRadius: 6,
                                border: `1px solid ${colors.borderLight}`,
                                background: colors.bgWhite,
                                fontSize: 11,
                                fontWeight: 600,
                                cursor: pagAccSegura <= 1 ? 'not-allowed' : 'pointer',
                                opacity: pagAccSegura <= 1 ? 0.5 : 1,
                              }}
                            >
                              Anterior
                            </button>
                            <span style={{ fontSize: 11, fontWeight: 700, color: colors.brand }}>
                              {pagAccSegura}/{totalPagAcc}
                            </span>
                            <button
                              type="button"
                              disabled={pagAccSegura >= totalPagAcc}
                              onClick={() =>
                                setPaginaAccionesPorPlan((prev) => ({
                                  ...prev,
                                  [plan.id]: Math.min(totalPagAcc, pagAccSegura + 1),
                                }))
                              }
                              style={{
                                height: 28,
                                padding: '0 10px',
                                borderRadius: 6,
                                border: `1px solid ${colors.borderLight}`,
                                background: colors.bgWhite,
                                fontSize: 11,
                                fontWeight: 600,
                                cursor: pagAccSegura >= totalPagAcc ? 'not-allowed' : 'pointer',
                                opacity: pagAccSegura >= totalPagAcc ? 0.5 : 1,
                              }}
                            >
                              Siguiente
                            </button>
                          </div>
                        </div>
                      )}
                      {accionesVisibles.map((accion: any) => {
                  const dr = drafts[accion.id] ?? {
                    porcentaje: accion.porcentajeAvance ?? 0,
                    obs: accion.observaciones ?? '',
                    estado: String(accion.estado ?? 'programada'),
                  };
                  const saving = savingId === accion.id;
                  // Solo permite editar avance si el plan está aprobado/en ejecución
                  const puedeEditarAvance = !readOnly && enEjecucion;

                  // Nombre del hallazgo vinculado
                  const hallazgoVinculado = accion.hallazgoId
                    ? hallazgos.find((h) => h.id === accion.hallazgoId)
                    : null;

                  return (
                    <div key={accion.id} style={{ ...portalCardNestedStyle, padding: 0, overflow: 'hidden' }}>
                      <div style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: colors.text, lineHeight: 1.4, flex: 1 }}>
                            {accion.descripcion || 'Acción correctiva'}
                          </div>
                          {(() => {
                            const badge = getAccionBadge(accion.estado || 'programada');
                            return (
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  padding: '4px 10px',
                                  borderRadius: 20,
                                  flexShrink: 0,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  background: badge.bg,
                                  color: badge.color,
                                  border: `1px solid ${badge.border}`,
                                }}
                              >
                                {badge.icon}
                                {badge.label}
                              </span>
                            );
                          })()}
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                          {/* Tipo de acción — badge EM-FO-002 */}
                          {accion.tipo && (() => {
                            const tipoMap: Record<string, { emoji: string; label: string; bg: string; color: string }> = {
                              correctiva: { emoji: '🔧', label: 'Correctiva', bg: '#FEF2F2', color: '#B91C1C' },
                              preventiva: { emoji: '🛡️', label: 'Preventiva', bg: '#EFF6FF', color: '#1D4ED8' },
                              mejora: { emoji: '📈', label: 'De mejora', bg: '#F0FDF4', color: '#047857' },
                            };
                            const t = tipoMap[accion.tipo] || tipoMap.correctiva;
                            return (
                              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: t.bg, color: t.color, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                {t.emoji} {t.label}
                              </span>
                            );
                          })()}
                          {accion.responsable && (
                            <MetaChip icon={<User2 style={{ width: 11, height: 11 }} />}>{accion.responsable}</MetaChip>
                          )}
                          {accion.fechaInicio && (
                            <MetaChip icon={<CalendarDays style={{ width: 11, height: 11 }} />}>
                              {accion.fechaInicio} → {accion.fechaFin}
                            </MetaChip>
                          )}
                          {hallazgoVinculado && (
                            <MetaChip icon={<Link2 style={{ width: 11, height: 11 }} />} tone="hallazgo">
                              Subsana hallazgo: {hallazgoVinculado.codigo} -{' '}
                              {hallazgoVinculado.titulo?.substring(0, 36)}
                              {hallazgoVinculado.titulo && hallazgoVinculado.titulo.length > 36 ? '…' : ''}
                            </MetaChip>
                          )}
                          {accion.indicador && (
                            <MetaChip icon={<BarChart3 style={{ width: 11, height: 11 }} />} tone="brand">
                              {accion.indicador}
                            </MetaChip>
                          )}
                        </div>

                        <div style={{ marginBottom: enFormulacion || editAccion[accion.id] ? 10 : 0 }}>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              fontSize: 11,
                              color: colors.textMuted,
                              marginBottom: 6,
                            }}
                          >
                            <span style={{ fontWeight: 600 }}>Avance</span>
                            <span style={{ fontWeight: 800, color: dr.porcentaje === 100 ? '#047857' : colors.brand }}>
                              {dr.porcentaje}%
                            </span>
                          </div>
                          <div style={{ height: 8, background: colors.bgMuted, borderRadius: 99, overflow: 'hidden' }}>
                            <div
                              style={{
                                height: '100%',
                                width: `${dr.porcentaje}%`,
                                background: dr.porcentaje === 100 ? '#10B981' : colors.brand,
                                borderRadius: 99,
                                transition: 'width 0.3s ease',
                              }}
                            />
                          </div>
                        </div>

                      {/* Botones Editar / Eliminar — solo en formulación */}
                      {!readOnly && enFormulacion && !editAccion[accion.id] && (
                        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                          <button type="button"
                            onClick={() => setEditAccion((prev) => ({ ...prev, [accion.id]: {
                              descripcion: accion.descripcion || '',
                              responsable: accion.responsable || '',
                              fechaInicio: accion.fechaInicio || '',
                              fechaFin: accion.fechaFin || '',
                              indicador: accion.indicador || '',
                            }}))} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #D1D5DB', background: 'white', fontSize: 11, fontWeight: 600, cursor: 'pointer', color: '#374151', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Pencil style={{ width: 12, height: 12 }} /> Editar
                          </button>
                          <button type="button"
                            disabled={deletingId === accion.id}
                            onClick={() => void eliminarAccion(plan.id, accion.id)}
                            style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #FCA5A5', background: '#FEF2F2', fontSize: 11, fontWeight: 600, cursor: deletingId === accion.id ? 'wait' : 'pointer', color: '#DC2626', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            {deletingId === accion.id ? <Loader2 style={{ width: 12, height: 12, animation: 'spin 1s linear infinite' }} /> : <Trash2 style={{ width: 12, height: 12 }} />} {deletingId === accion.id ? '...' : 'Eliminar'}
                          </button>
                        </div>
                      )}

                      {/* Formulario de edición inline */}
                      {!readOnly && enFormulacion && editAccion[accion.id] && (() => {
                        const ed = editAccion[accion.id]!;
                        const saving = savingEdit === accion.id;
                        return (
                          <div style={{ marginTop: 10, background: '#F8FAFF', border: `1.5px solid ${colors.brand}30`, borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#1D4ED8', marginBottom: 2 }}>Editando acción</div>
                            <label style={{ fontSize: 11, color: '#6B7280', display: 'flex', flexDirection: 'column', gap: 3 }}>
                              Descripción *
                              <textarea rows={2} value={ed.descripcion}
                                onChange={(e) => setEditAccion((prev) => ({ ...prev, [accion.id]: { ...prev[accion.id]!, descripcion: e.target.value } }))}
                                style={{ borderRadius: 7, border: '1px solid #D1D5DB', padding: 7, fontSize: 13, resize: 'vertical', fontFamily: 'inherit' }} />
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                              <label style={{ fontSize: 11, color: '#6B7280', display: 'flex', flexDirection: 'column', gap: 3 }}>
                                Responsable *
                                <input type="text" value={ed.responsable}
                                  onChange={(e) => setEditAccion((prev) => ({ ...prev, [accion.id]: { ...prev[accion.id]!, responsable: e.target.value } }))}
                                  style={{ height: 32, borderRadius: 7, border: '1px solid #D1D5DB', padding: '0 8px', fontSize: 13 }} />
                              </label>
                              <label style={{ fontSize: 11, color: '#6B7280', display: 'flex', flexDirection: 'column', gap: 3 }}>
                                Indicador
                                <input type="text" value={ed.indicador}
                                  onChange={(e) => setEditAccion((prev) => ({ ...prev, [accion.id]: { ...prev[accion.id]!, indicador: e.target.value } }))}
                                  style={{ height: 32, borderRadius: 7, border: '1px solid #D1D5DB', padding: '0 8px', fontSize: 13 }} />
                              </label>
                              <label style={{ fontSize: 11, color: '#6B7280', display: 'flex', flexDirection: 'column', gap: 3 }}>
                                Fecha inicio *
                                <input type="date" value={ed.fechaInicio}
                                  onChange={(e) => setEditAccion((prev) => ({ ...prev, [accion.id]: { ...prev[accion.id]!, fechaInicio: e.target.value } }))}
                                  style={{ height: 32, borderRadius: 7, border: '1px solid #D1D5DB', padding: '0 8px', fontSize: 13 }} />
                              </label>
                              <label style={{ fontSize: 11, color: '#6B7280', display: 'flex', flexDirection: 'column', gap: 3 }}>
                                Fecha fin *
                                <input type="date" value={ed.fechaFin}
                                  onChange={(e) => setEditAccion((prev) => ({ ...prev, [accion.id]: { ...prev[accion.id]!, fechaFin: e.target.value } }))}
                                  style={{ height: 32, borderRadius: 7, border: '1px solid #D1D5DB', padding: '0 8px', fontSize: 13 }} />
                              </label>
                            </div>
                            <div style={{ display: 'flex', gap: 7, marginTop: 2 }}>
                              <button type="button" disabled={saving}
                                onClick={() => void guardarEdicionAccion(plan.id, accion.id)}
                                style={{ padding: '7px 16px', borderRadius: 7, border: 'none', background: colors.brand, color: 'white', fontSize: 12, fontWeight: 600, cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                                {saving ? 'Guardando…' : 'Guardar cambios'}
                              </button>
                              <button type="button"
                                onClick={() => setEditAccion((prev) => ({ ...prev, [accion.id]: null }))}
                                style={{ padding: '7px 12px', borderRadius: 7, border: '1px solid #E5E7EB', background: 'white', fontSize: 12, cursor: 'pointer', color: '#6B7280' }}>
                                Cancelar
                              </button>
                            </div>
                          </div>
                        );
                      })()}

                      </div>

                      {/* Controles de edición — solo en ejecución */}
                      {puedeEditarAvance && (() => {
                        const evSubidas: any[] = evidenciasSubidas[accion.id] ?? [];
                        const archivosActuales = archivosEvidencia[accion.id] ?? [];
                        const totalEvidencias = evSubidas.length + archivosActuales.length;
                        const subiendoEste = subiendoEvidencia === accion.id;
                        const guardandoEste = savingId === accion.id;
                        const ocupado = saving || subiendoEste || guardandoEste;
                        const esCompletada = dr.estado === 'completada';
                        return (
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 10,
                            padding: '14px 16px',
                            borderTop: `1px solid ${colors.borderLight}`,
                            background: colors.bgSubtle,
                          }}
                        >

                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'minmax(88px, 100px) 1fr',
                              gap: 10,
                              alignItems: 'start',
                            }}
                          >
                            <label style={{ fontSize: 11, color: colors.textMuted, display: 'flex', flexDirection: 'column', gap: 4 }}>
                              % Avance
                              <input
                                type="number"
                                min={0}
                                max={100}
                                disabled={ocupado}
                                value={dr.porcentaje}
                                onChange={(e) => setDraft(accion.id, { porcentaje: Number(e.target.value) })}
                                style={{
                                  height: 36,
                                  width: '100%',
                                  borderRadius: 8,
                                  border: `1px solid ${colors.border}`,
                                  padding: '0 8px',
                                  fontSize: 13,
                                  fontWeight: 700,
                                  color: colors.brand,
                                }}
                              />
                            </label>
                            <label style={{ fontSize: 11, color: colors.textMuted, display: 'flex', flexDirection: 'column', gap: 4 }}>
                              Observaciones
                              <textarea
                                disabled={ocupado}
                                value={dr.obs}
                                onChange={(e) => setDraft(accion.id, { obs: e.target.value })}
                                rows={6}
                                placeholder="Describe el avance de esta acción..."
                                style={{
                                  borderRadius: 8,
                                  border: `1px solid ${colors.border}`,
                                  padding: '8px 10px',
                                  fontSize: 12,
                                  resize: 'vertical',
                                  fontFamily: 'inherit',
                                  lineHeight: 1.45,
                                  background: colors.bgWhite,
                                }}
                              />
                            </label>
                          </div>

                          <div
                            style={{
                              border: `1px solid ${colors.borderLight}`,
                              borderRadius: 10,
                              background: colors.bgWhite,
                              overflow: 'hidden',
                            }}
                          >
                            {/* Cabecera */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', borderBottom: (evSubidas.length + archivosActuales.length) > 0 ? '1px solid #E5E7EB' : 'none' }}>
                              <span style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Paperclip style={{ width: 11, height: 11 }} />
                                Evidencias
                                {evSubidas.length > 0 && (
                                  <span style={{ background: '#D1FAE5', color: '#065F46', borderRadius: 10, padding: '1px 6px', fontSize: 10, fontWeight: 700 }}>
                                    {evSubidas.length}
                                  </span>
                                )}
                              </span>
                              <label htmlFor={`ev-input-${accion.id}`} style={{
                                display: 'inline-flex', alignItems: 'center', gap: 3,
                                padding: '3px 8px', borderRadius: 5,
                                border: `1px solid ${colors.brand}`,
                                background: 'white', color: colors.brand,
                                fontSize: 10, fontWeight: 600,
                                cursor: ocupado ? 'not-allowed' : 'pointer',
                                opacity: ocupado ? 0.6 : 1,
                              }}>
                                <Upload style={{ width: 10, height: 10 }} />
                                Agregar
                              </label>
                              <input id={`ev-input-${accion.id}`} type="file" multiple disabled={ocupado} style={{ display: 'none' }}
                                onChange={(e) => {
                                  const nuevos = Array.from(e.target.files ?? []);
                                  if (!nuevos.length) return;
                                  setArchivosEvidencia((prev) => ({ ...prev, [accion.id]: [...(prev[accion.id] ?? []), ...nuevos] }));
                                  e.target.value = '';
                                }} />
                            </div>

                            {/* Sin evidencias */}
                            {evSubidas.length === 0 && archivosActuales.length === 0 && (
                              <div style={{ padding: '6px 10px', fontSize: 10, color: '#9CA3AF', fontStyle: 'italic' }}>
                                Sin evidencias — necesitas al menos una para marcar como Completada.
                              </div>
                            )}

                            {/* Ya subidas */}
                            {evSubidas.map((ev: any) => (
                              <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderBottom: '1px solid #F3F4F6', fontSize: 11 }}>
                                <FileText style={{ width: 11, height: 11, color: '#047857', flexShrink: 0 }} />
                                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#065F46' }}>
                                  {ev.nombre || ev.nombreArchivoOriginal || 'Evidencia'}
                                </span>
                                <span style={{ color: '#9CA3AF', fontSize: 10, flexShrink: 0 }}>
                                  {ev.tamanioBytes ? `${(Number(ev.tamanioBytes) / 1024).toFixed(0)} KB` : ''}
                                </span>
                                <button type="button" title="Descargar"
                                  onClick={() => window.open(`http://localhost:3007/evidencias/${ev.id}/download`, '_blank')}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#047857', padding: '0 2px', display: 'flex', alignItems: 'center' }}>
                                  <Download style={{ width: 12, height: 12 }} />
                                </button>
                                <button type="button" title="Eliminar"
                                  disabled={eliminandoEvidencia === ev.id || ocupado}
                                  onClick={() => void eliminarEvidencia(accion.id, ev.id)}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626', padding: '0 2px', display: 'flex', alignItems: 'center', opacity: eliminandoEvidencia === ev.id ? 0.4 : 1 }}>
                                  <Trash2 style={{ width: 11, height: 11 }} />
                                </button>
                              </div>
                            ))}

                            {/* Pendientes de subir */}
                            {archivosActuales.map((f, idx) => (
                              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderBottom: '1px solid #F3F4F6', fontSize: 11, background: '#EFF6FF' }}>
                                <span style={{ color: '#1D4ED8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📎 {f.name}</span>
                                <span style={{ color: '#6B7280', fontSize: 10, flexShrink: 0 }}>{(f.size / 1024).toFixed(0)} KB · pendiente</span>
                                <button type="button" disabled={ocupado}
                                  onClick={() => setArchivosEvidencia((prev) => ({ ...prev, [accion.id]: (prev[accion.id] ?? []).filter((_, i) => i !== idx) }))}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626', fontSize: 13, lineHeight: 1 }}>×</button>
                              </div>
                            ))}
                          </div>

                          {/* Toggle Completada + Guardar en la misma fila */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                            {/* Toggle */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: totalEvidencias === 0 ? 'not-allowed' : 'pointer', opacity: totalEvidencias === 0 ? 0.45 : 1 }}
                              title={totalEvidencias === 0 ? 'Sube al menos una evidencia' : ''}
                              onClick={() => {
                                if (totalEvidencias === 0 || ocupado) return;
                                const next = esCompletada ? calcEstadoAuto(accion, false) : 'completada';
                                setDraft(accion.id, { estado: next, porcentaje: next === 'completada' ? 100 : dr.porcentaje });
                              }}>
                              <div style={{ width: 36, height: 20, borderRadius: 10, background: esCompletada ? '#10B981' : '#D1D5DB', position: 'relative', transition: 'background .2s', flexShrink: 0 }}>
                                <div style={{ position: 'absolute', top: 2, left: esCompletada ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: 'white', transition: 'left .2s', boxShadow: '0 1px 2px rgba(0,0,0,.2)' }} />
                              </div>
                              <span style={{ fontSize: 11, fontWeight: 600, color: esCompletada ? '#047857' : '#374151', whiteSpace: 'nowrap' }}>
                                {esCompletada ? '✓ Completada' : 'Marcar como Completada'}
                              </span>
                            </div>

                            <button
                              type="button"
                              disabled={ocupado}
                              onClick={() => void guardarAccion(plan.id, accion.id)}
                              style={{
                                padding: '8px 18px',
                                borderRadius: 8,
                                border: 'none',
                                background: colors.brand,
                                color: 'white',
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: ocupado ? 'wait' : 'pointer',
                                opacity: ocupado ? 0.7 : 1,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                marginLeft: 'auto',
                                boxShadow: '0 2px 8px rgba(0,61,165,0.2)',
                              }}
                            >
                              {subiendoEste ? (
                                <>
                                  <Loader2 style={{ width: 12, height: 12, animation: 'spin 1s linear infinite' }} /> Subiendo…
                                </>
                              ) : guardandoEste ? (
                                <>
                                  <Loader2 style={{ width: 12, height: 12, animation: 'spin 1s linear infinite' }} /> Guardando…
                                </>
                              ) : (
                                'Guardar avance'
                              )}
                            </button>
                          </div>

                        </div>
                        );
                      })()}

                    </div>
                  );
                })}
                    </>
                  );
                })()}
              </div>
            )}

            {/* Botón + Formulario: solo en planes en formulación */}
            {!readOnly && enFormulacion && (
              <div style={{ marginTop: 16, borderTop: '1px dashed #E5E7EB', paddingTop: 14 }}>
                {!showNewAccion[plan.id] ? (
                  <button type="button"
                    onClick={() => setShowNewAccion((prev) => ({ ...prev, [plan.id]: true }))}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '8px 14px', borderRadius: 8,
                      border: `1.5px dashed ${colors.brand}`,
                      background: 'transparent', color: colors.brand,
                      fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    }}>
                    <span style={{ fontSize: 18, lineHeight: 1 }}>＋</span> Agregar acción correctiva
                  </button>
                ) : (
                  <div style={{ background: '#F8FAFF', borderRadius: 12, border: `1.5px solid ${colors.brand}30`, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#1F2937', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 28, height: 28, borderRadius: 8, background: `${colors.brand}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ClipboardList style={{ width: 15, height: 15, color: colors.brand }} />
                      </span>
                      Nueva acción de mejora
                      <span style={{ fontSize: 10, fontWeight: 600, color: '#6B7280', background: '#F3F4F6', padding: '2px 8px', borderRadius: 10 }}>EM-FO-002</span>
                    </div>

                    {/* ═══ PLANTILLA RÁPIDA — Select discreto ═══ */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Lightbulb style={{ width: 12, height: 12 }} />
                        Inicio rápido:
                      </span>
                      <select
                        value=""
                        onChange={(e) => {
                          const pl = PLANTILLAS_ACCIONES.find((p) => p.nombre === e.target.value);
                          if (pl) aplicarPlantilla(plan.id, pl);
                        }}
                        style={{
                          height: 30, borderRadius: 8, border: '1px solid #E5E7EB',
                          padding: '0 8px', fontSize: 11, color: '#6B7280',
                          background: 'white', cursor: 'pointer', maxWidth: 260,
                        }}
                      >
                        <option value="">Usar plantilla predefinida…</option>
                        {PLANTILLAS_ACCIONES.map((pl) => (
                          <option key={pl.nombre} value={pl.nombre}>
                            {pl.tipo === 'correctiva' ? '🔧' : pl.tipo === 'preventiva' ? '🛡️' : '📈'} {pl.nombre}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Fila 1: Tipo de acción + Hallazgo */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <label style={{ fontSize: 11, color: '#6B7280', display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span>Tipo de acción <span style={{ color: '#DC2626' }}>*</span></span>
                        <select value={newAccionDraft[plan.id]?.tipo ?? 'correctiva'}
                          onChange={(e) => setNewAccionDraft((prev) => ({ ...prev, [plan.id]: { ...prev[plan.id], tipo: e.target.value } }))}
                          style={{ height: 34, borderRadius: 8, border: '1px solid #D1D5DB', padding: '0 8px', fontSize: 13, background: 'white' }}>
                          <option value="correctiva">🔧 Correctiva</option>
                          <option value="preventiva">🛡️ Preventiva</option>
                          <option value="mejora">📈 De mejora</option>
                        </select>
                      </label>
                      {hallazgos.length > 0 && (
                        <label style={{ fontSize: 11, color: '#6B7280', display: 'flex', flexDirection: 'column', gap: 4 }}>
                          Hallazgo que subsana (opcional)
                          <select value={newAccionDraft[plan.id]?.hallazgoId ?? ''}
                            onChange={(e) => setNewAccionDraft((prev) => ({ ...prev, [plan.id]: { ...prev[plan.id], hallazgoId: e.target.value } }))}
                            style={{ height: 34, borderRadius: 8, border: '1px solid #D1D5DB', padding: '0 8px', fontSize: 13 }}>
                            <option value="">— Sin vincular a hallazgo —</option>
                            {hallazgos.map((h) => (
                              <option key={h.id} value={h.id}>{h.codigo}: {h.titulo?.substring(0, 60)}</option>
                            ))}
                          </select>
                        </label>
                      )}
                    </div>

                    {/* Descripción */}
                    <label style={{ fontSize: 11, color: '#6B7280', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span>Descripción de la acción <span style={{ color: '#DC2626' }}>*</span></span>
                      <textarea rows={2} placeholder="Describe la acción que se ejecutará para subsanar el hallazgo..."
                        value={newAccionDraft[plan.id]?.descripcion ?? ''}
                        onChange={(e) => setNewAccionDraft((prev) => ({ ...prev, [plan.id]: { ...prev[plan.id], descripcion: e.target.value } }))}
                        style={{ borderRadius: 8, border: '1px solid #D1D5DB', padding: 8, fontSize: 13, resize: 'vertical', fontFamily: 'inherit' }} />
                    </label>

                    {/* ═══ 5 PORQUÉS — TODOS LOS NIVELES VISIBLES ═══ */}
                    {(() => {
                      const pqs = getPorques(plan.id);
                      const filledCount = pqs.filter((p) => p.trim()).length;
                      const levelLabels = [
                        '¿Por qué ocurrió el hallazgo?',
                        '¿Por qué sucedió eso?',
                        '¿Cuál fue la causa de lo anterior?',
                        '¿Qué originó esa situación?',
                        '¿Cuál es la causa raíz fundamental?',
                      ];

                      return (
                        <div style={{ borderRadius: 12, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
                          {/* Header compacto */}
                          <div style={{
                            padding: '10px 16px',
                            background: '#F9FAFB',
                            borderBottom: '1px solid #E5E7EB',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 14 }}>🔍</span>
                              <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>Análisis de causa raíz</span>
                              <span style={{ fontSize: 9, fontWeight: 600, color: '#6B7280', background: '#F3F4F6', padding: '2px 6px', borderRadius: 6 }}>5 Porqués</span>
                            </div>
                            {filledCount > 0 && (
                              <span style={{
                                fontSize: 10, fontWeight: 700,
                                color: filledCount >= 3 ? '#047857' : '#B45309',
                                background: filledCount >= 3 ? '#ECFDF5' : '#FFFBEB',
                                padding: '2px 8px', borderRadius: 10,
                              }}>
                                {filledCount}/5 completados
                              </span>
                            )}
                          </div>

                          {/* Los 5 niveles — SIEMPRE visibles */}
                          <div style={{ padding: '12px 16px' }}>
                            {pqs.map((val, idx) => {
                              const isFilled = val.trim().length > 0;
                              const isEnabled = idx === 0 || pqs[idx - 1]?.trim();
                              const isDeepest = isFilled && (idx === 4 || !pqs.slice(idx + 1).some((v) => v.trim()));
                              const isNext = !isFilled && isEnabled; // El campo activo donde debe escribir

                              // Pregunta dinámica basada en respuesta anterior
                              const pregunta = idx === 0
                                ? levelLabels[0]
                                : pqs[idx - 1]?.trim()
                                  ? `¿Por qué ${pqs[idx - 1].substring(0, 55).toLowerCase().replace(/[\.\?]$/, '')}${pqs[idx - 1].length > 55 ? '…' : ''}?`
                                  : levelLabels[idx];

                              return (
                                <div key={idx} style={{
                                  display: 'flex', alignItems: 'flex-start', gap: 10,
                                  padding: '8px 0',
                                  borderBottom: idx < 4 ? '1px solid #F3F4F6' : 'none',
                                  opacity: isEnabled ? 1 : 0.35,
                                  transition: 'opacity 0.3s ease',
                                }}>
                                  {/* Número */}
                                  <div style={{
                                    width: 26, minWidth: 26, height: 26, borderRadius: 8,
                                    background: isFilled
                                      ? (isDeepest ? '#DC2626' : '#2563EB')
                                      : isNext ? '#F3F4F6' : '#FAFAFA',
                                    color: isFilled ? 'white' : isNext ? '#374151' : '#D1D5DB',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 11, fontWeight: 800, marginTop: 1,
                                    transition: 'all 0.2s ease',
                                    border: isNext ? '1.5px solid #D1D5DB' : 'none',
                                  }}>
                                    {isFilled && isDeepest ? '✓' : idx + 1}
                                  </div>

                                  {/* Contenido */}
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                      fontSize: 11, fontWeight: 600,
                                      color: isEnabled ? '#374151' : '#D1D5DB',
                                      marginBottom: 4,
                                      display: 'flex', alignItems: 'center', gap: 6,
                                    }}>
                                      {pregunta}
                                      {isDeepest && idx > 0 && (
                                        <span style={{
                                          fontSize: 9, fontWeight: 800, color: 'white',
                                          background: '#DC2626', padding: '1px 7px', borderRadius: 4,
                                        }}>
                                          CAUSA RAÍZ
                                        </span>
                                      )}
                                    </div>
                                    <input
                                      type="text"
                                      disabled={!isEnabled}
                                      value={val}
                                      onChange={(e) => setPorque(plan.id, idx, e.target.value)}
                                      placeholder={
                                        !isEnabled
                                          ? 'Completa el nivel anterior…'
                                          : idx === 0
                                          ? 'Ej: No se realizó la foliación de los documentos'
                                          : 'Profundiza en la causa…'
                                      }
                                      style={{
                                        width: '100%', height: 34, borderRadius: 8,
                                        border: `1.5px solid ${isDeepest ? '#FCA5A5' : isNext ? '#93C5FD' : '#E5E7EB'}`,
                                        background: isDeepest ? '#FEF2F2' : !isEnabled ? '#FAFAFA' : 'white',
                                        padding: '0 10px', fontSize: 12, fontFamily: 'inherit',
                                        boxSizing: 'border-box' as const,
                                        color: !isEnabled ? '#D1D5DB' : isDeepest ? '#991B1B' : '#1F2937',
                                        fontWeight: isDeepest ? 600 : 400,
                                        transition: 'all 0.2s ease',
                                        outline: 'none',
                                      }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Recursos necesarios */}
                    <label style={{ fontSize: 11, color: '#6B7280', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      Recursos necesarios
                      <textarea rows={1} placeholder="Ej: Personal TIC, presupuesto para digitalización, capacitación..."
                        value={newAccionDraft[plan.id]?.recursos ?? ''}
                        onChange={(e) => setNewAccionDraft((prev) => ({ ...prev, [plan.id]: { ...prev[plan.id], recursos: e.target.value } }))}
                        style={{ borderRadius: 8, border: '1px solid #D1D5DB', padding: 8, fontSize: 13, resize: 'vertical', fontFamily: 'inherit' }} />
                    </label>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, alignItems: 'start' }}>
                      {/* Responsable — combobox con filtro en tiempo real */}
                      <label style={{ fontSize: 11, color: '#6B7280', display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span>Responsable <span style={{ color: '#DC2626' }}>*</span></span>
                        {newAccionDraft[plan.id]?.responsable ? (
                          /* Persona seleccionada — mostrar chip con nombre + botón Cambiar */
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', border: '1px solid #D1D5DB', borderRadius: 8, background: '#F9FAFB', minHeight: 34 }}>
                            <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#DBEAFE', color: '#1D4ED8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                              {(newAccionDraft[plan.id]?.responsable || '').split(' ').slice(0,2).map(s=>s[0]).join('').toUpperCase() || 'R'}
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#111827', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {newAccionDraft[plan.id]?.responsable}
                            </span>
                            <button type="button"
                              onClick={() => {
                                setNewAccionDraft((prev) => ({ ...prev, [plan.id]: { ...prev[plan.id], responsable: '' } }));
                                setBusquedaResponsable((prev) => ({ ...prev, [plan.id]: '' }));
                              }}
                              style={{ fontSize: 11, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', flexShrink: 0 }}>
                              Cambiar
                            </button>
                          </div>
                        ) : (
                          /* Sin persona — input con dropdown filtrable */
                          <div style={{ position: 'relative' }}>
                            <div style={{ position: 'relative' }}>
                              <input
                                type="text"
                                placeholder="Buscar o seleccionar responsable…"
                                value={busquedaResponsable[plan.id] ?? ''}
                                autoComplete="off"
                                onChange={(e) => setBusquedaResponsable((prev) => ({ ...prev, [plan.id]: e.target.value }))}
                                onFocus={() => setBusquedaResponsable((prev) => ({ ...prev, [plan.id]: prev[plan.id] ?? '' }))}
                                onBlur={() => setTimeout(() => setBusquedaResponsable((prev) => {
                                  const { [plan.id]: _, ...rest } = prev;
                                  return rest;
                                }), 200)}
                                style={{ height: 34, borderRadius: 8, border: '1px solid #D1D5DB', padding: '0 30px 0 8px', fontSize: 13, width: '100%', boxSizing: 'border-box' }} />
                              {/* Chevron para indicar que es dropdown */}
                              <ChevronDown style={{
                                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                                width: 14, height: 14, color: '#9CA3AF', pointerEvents: 'none',
                              }} />
                            </div>
                            {/* Dropdown — aparece inmediatamente al focus */}
                            {busquedaResponsable[plan.id] !== undefined && (() => {
                              const q = (busquedaResponsable[plan.id] || '').trim().toLowerCase();
                              const lista = q.length > 0
                                ? usuarios.filter(u =>
                                    u.nombre.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.rol.toLowerCase().includes(q)
                                  )
                                : usuarios; // Sin filtro → mostrar todos
                              return (
                                <div style={{ position: 'absolute', top: 36, left: 0, right: 0, background: 'white', border: '1px solid #E5E7EB', borderRadius: 8, boxShadow: '0 6px 16px rgba(0,0,0,0.12)', zIndex: 60, maxHeight: 220, overflowY: 'auto' }}>
                                  {/* Header */}
                                  <div style={{ padding: '6px 10px', background: '#F9FAFB', borderBottom: '1px solid #F3F4F6', fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>{lista.length} resultado{lista.length !== 1 ? 's' : ''}</span>
                                    {q.length === 0 && <span style={{ fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>Escribe para filtrar…</span>}
                                  </div>
                                  {lista.length === 0 && (
                                    <div style={{ padding: '12px 10px', textAlign: 'center', fontSize: 12, color: '#9CA3AF' }}>
                                      Sin resultados para "<strong>{busquedaResponsable[plan.id]}</strong>"
                                    </div>
                                  )}
                                  {lista.map((u) => (
                                    <button key={u.id} type="button"
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        setNewAccionDraft((prev) => ({ ...prev, [plan.id]: { ...prev[plan.id], responsable: u.nombre } }));
                                        setBusquedaResponsable((prev) => { const { [plan.id]: _, ...rest } = prev; return rest; });
                                      }}
                                      style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', padding: '8px 10px', border: 'none', borderBottom: '1px solid #F3F4F6', background: 'transparent', cursor: 'pointer', transition: 'background 0.15s' }}
                                      onMouseEnter={e => (e.currentTarget.style.background = '#EFF6FF')}
                                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#DBEAFE', color: '#1D4ED8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                                        {u.nombre.split(' ').slice(0,2).map(s=>s[0]).join('').toUpperCase() || '?'}
                                      </div>
                                      <div style={{ minWidth: 0, flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                          <span style={{ fontSize: 12, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.nombre}</span>
                                          {u.rol && (
                                            <span style={{
                                              fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
                                              background: '#F3F4F6', color: '#6B7280',
                                              whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: 0.3,
                                            }}>
                                              {u.rol}
                                            </span>
                                          )}
                                        </div>
                                        {u.email && <div style={{ fontSize: 11, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>}
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </label>

                      {/* Indicador */}
                      <label style={{ fontSize: 11, color: '#6B7280', display: 'flex', flexDirection: 'column', gap: 4 }}>
                        Indicador de cumplimiento
                        <input type="text" placeholder="Ej: % de documentos foliados"
                          value={newAccionDraft[plan.id]?.indicador ?? ''}
                          onChange={(e) => setNewAccionDraft((prev) => ({ ...prev, [plan.id]: { ...prev[plan.id], indicador: e.target.value } }))}
                          style={{ height: 34, borderRadius: 8, border: '1px solid #D1D5DB', padding: '0 8px', fontSize: 13, width: '100%', boxSizing: 'border-box' }} />
                      </label>

                      {/* Fecha inicio */}
                      <label style={{ fontSize: 11, color: '#6B7280', display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span>Fecha inicio <span style={{ color: '#DC2626' }}>*</span></span>
                        <input type="date" value={newAccionDraft[plan.id]?.fechaInicio ?? ''}
                          onChange={(e) => setNewAccionDraft((prev) => ({ ...prev, [plan.id]: { ...prev[plan.id], fechaInicio: e.target.value } }))}
                          style={{ height: 34, borderRadius: 8, border: '1px solid #D1D5DB', padding: '0 8px', fontSize: 13, width: '100%', boxSizing: 'border-box' }} />
                      </label>

                      {/* Fecha fin */}
                      <label style={{ fontSize: 11, color: '#6B7280', display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span>Fecha fin (compromiso) <span style={{ color: '#DC2626' }}>*</span></span>
                        <input type="date" value={newAccionDraft[plan.id]?.fechaFin ?? ''}
                          onChange={(e) => setNewAccionDraft((prev) => ({ ...prev, [plan.id]: { ...prev[plan.id], fechaFin: e.target.value } }))}
                          style={{ height: 34, borderRadius: 8, border: '1px solid #D1D5DB', padding: '0 8px', fontSize: 13, width: '100%', boxSizing: 'border-box' }} />
                      </label>

                      {/* Meta del indicador — full width */}
                      <label style={{ fontSize: 11, color: '#6B7280', display: 'flex', flexDirection: 'column', gap: 4, gridColumn: '1 / -1' }}>
                        Meta del indicador
                        <input type="text" placeholder="Ej: Lograr el 100% de documentos foliados al 30/06/2026"
                          value={newAccionDraft[plan.id]?.metaIndicador ?? ''}
                          onChange={(e) => setNewAccionDraft((prev) => ({ ...prev, [plan.id]: { ...prev[plan.id], metaIndicador: e.target.value } }))}
                          style={{ height: 34, borderRadius: 8, border: '1px solid #D1D5DB', padding: '0 8px', fontSize: 13, width: '100%', boxSizing: 'border-box' }} />
                      </label>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                      <button type="button" disabled={savingNew === plan.id}
                        onClick={() => void crearNuevaAccion(plan.id)}
                        style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: colors.brand, color: 'white', fontSize: 13, fontWeight: 600, cursor: savingNew === plan.id ? 'wait' : 'pointer', opacity: savingNew === plan.id ? 0.7 : 1 }}>
                        {savingNew === plan.id ? 'Guardando…' : 'Guardar acción'}
                      </button>
                      <button type="button"
                        onClick={() => setShowNewAccion((prev) => ({ ...prev, [plan.id]: false }))}
                        style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #E5E7EB', background: 'white', fontSize: 13, cursor: 'pointer', color: '#6B7280' }}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* Botón Enviar a revisión: en BORRADOR o RECHAZADO (para reenviar tras correcciones) */}
            {!readOnly && (estadoPlan === 'borrador' || esRechazado) && (
              <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'flex-end' }}>
                <button type="button"
                  disabled={sendingRevision === plan.id}
                  onClick={() => void enviarARevision(plan.id)}
                  style={{
                    padding: '9px 20px', borderRadius: 9, border: 'none',
                    background: sendingRevision === plan.id ? '#9CA3AF' : '#1D4ED8',
                    color: 'white', fontSize: 13, fontWeight: 700,
                    cursor: sendingRevision === plan.id ? 'wait' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: 7,
                  }}>
                  {sendingRevision === plan.id
                    ? <><Clock style={{ width: 14, height: 14 }} /> Enviando...</>
                    : <><SendHorizontal style={{ width: 14, height: 14 }} /> Enviar a revisión OCI</>}
                </button>
              </div>
            )}
            {!readOnly && estadoPlan === 'revision' && (
              <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: '#EFF6FF', border: '1px solid #BFDBFE', fontSize: 12, color: '#1E3A8A', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock style={{ width: 14, height: 14, flexShrink: 0 }} /> <span><strong>Plan en revisión.</strong> La OCI está evaluando tu plan. Recibirás una notificación cuando sea aprobado o devuelto con observaciones.</span>
              </div>
            )}
          </div>
        );
      })}

      {/* Custom confirm modal */}
      <AnimatePresence>
        {confirmModal.open && (
          <motion.div
            key="confirm-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 20,
            }}
            onClick={() => setConfirmModal(prev => ({ ...prev, open: false }))}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 10 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'white', borderRadius: 16, padding: '28px 28px 20px',
                width: '100%', maxWidth: 420,
                boxShadow: '0 20px 60px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.05)',
              }}
            >
              {/* Icon */}
              <div style={{
                width: 48, height: 48, borderRadius: 14, margin: '0 auto 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: confirmModal.icon === 'trash' ? '#FEF2F2'
                  : confirmModal.icon === 'send' ? '#EFF6FF' : '#FFFBEB',
              }}>
                {confirmModal.icon === 'trash' && <Trash2 style={{ width: 22, height: 22, color: '#DC2626' }} />}
                {confirmModal.icon === 'send' && <SendHorizontal style={{ width: 22, height: 22, color: colors.brand }} />}
                {confirmModal.icon === 'warning' && <AlertTriangle style={{ width: 22, height: 22, color: '#D97706' }} />}
              </div>

              {/* Title */}
              <div style={{
                fontSize: 16, fontWeight: 700, color: '#111827',
                textAlign: 'center', marginBottom: 8,
              }}>
                {confirmModal.title}
              </div>

              {/* Message */}
              <div style={{
                fontSize: 13, color: '#6B7280', textAlign: 'center',
                lineHeight: 1.6, marginBottom: 24,
              }}>
                {confirmModal.message}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setConfirmModal(prev => ({ ...prev, open: false }))}
                  style={{
                    flex: 1, height: 40, borderRadius: 10,
                    border: '1px solid #E5E7EB', background: 'white',
                    color: '#374151', fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  {confirmModal.cancelLabel || 'Cancelar'}
                </button>
                <button
                  type="button"
                  onClick={() => confirmModal.onConfirm()}
                  style={{
                    flex: 1, height: 40, borderRadius: 10,
                    border: 'none',
                    background: confirmModal.accent || colors.brand,
                    color: 'white', fontSize: 13, fontWeight: 700,
                    cursor: 'pointer', transition: 'all 0.15s',
                    boxShadow: `0 2px 8px ${confirmModal.accent || colors.brand}40`,
                  }}
                >
                  {confirmModal.confirmLabel || 'Confirmar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ModalCrearPlanDesdeAuditoria({
  auditoria,
  hallazgos,
  creando,
  onCrear,
  onCerrar,
}: {
  auditoria: AuditoriaItem;
  hallazgos: Array<{
    id: string;
    titulo: string;
    gravedad: 'LEVE' | 'MODERADO' | 'GRAVE';
    descripcion: string;
  }>;
  creando: boolean;
  onCrear: () => void | Promise<void>;
  onCerrar: () => void;
}) {
  const totalHallazgos = hallazgos.length;
  const graves = hallazgos.filter((h) => h.gravedad === 'GRAVE').length;
  const moderados = hallazgos.filter((h) => h.gravedad === 'MODERADO').length;
  const leves = hallazgos.filter((h) => h.gravedad === 'LEVE').length;

  return (
    <AnimatePresence>
      <motion.div
        key="crear-plan-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={onCerrar}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: 'rgba(17, 24, 39, 0.48)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 12 }}
          transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: 720,
            maxHeight: '88vh',
            overflowY: 'auto',
            background: 'white',
            borderRadius: 16,
            boxShadow: '0 24px 80px rgba(0,0,0,0.24)',
          }}
        >
          <div style={{ padding: '22px 24px 18px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: '#FFFBEB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Target style={{ width: 21, height: 21, color: '#B45309' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#111827' }}>Crear Plan de Mejoramiento</div>
              <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>
                Revise la auditoría y confirme la creación del borrador.
              </div>
            </div>
          </div>

          <div style={{ padding: 24 }}>
            <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 12, padding: 14, display: 'flex', gap: 10, marginBottom: 18 }}>
              <Info style={{ width: 18, height: 18, color: '#1D4ED8', flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontSize: 13, color: '#1E3A8A', lineHeight: 1.5 }}>
                Se creará un plan en estado borrador para formular acciones correctivas sobre los hallazgos vigentes de esta auditoría.
              </div>
            </div>

            <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 12, padding: 16, marginBottom: 18 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#111827', marginBottom: 12 }}>
                Resumen de la Auditoría Seleccionada
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
                <InfoField icon={<FileText style={{ width: 13, height: 13, color: colors.brand }} />} label="Código" value={auditoria.codigo || 'AUD'} />
                <InfoField icon={<Building2 style={{ width: 13, height: 13, color: '#7C3AED' }} />} label="Área responsable" value={auditoria.area || 'Área auditada'} />
                <InfoField icon={<User style={{ width: 13, height: 13, color: '#2563EB' }} />} label="Responsable" value={auditoria.auditorLider || 'N/A'} />
                <InfoField icon={<AlertTriangle style={{ width: 13, height: 13, color: '#B45309' }} />} label="Total hallazgos" value={String(totalHallazgos)} />
              </div>
              {totalHallazgos > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingTop: 14, marginTop: 14, borderTop: '1px solid #E5E7EB' }}>
                  {graves > 0 && <span style={{ fontSize: 12, padding: '4px 8px', borderRadius: 8, background: '#FEF2F2', color: '#B91C1C', fontWeight: 700 }}>{graves} Graves</span>}
                  {moderados > 0 && <span style={{ fontSize: 12, padding: '4px 8px', borderRadius: 8, background: '#FFFBEB', color: '#B45309', fontWeight: 700 }}>{moderados} Moderados</span>}
                  {leves > 0 && <span style={{ fontSize: 12, padding: '4px 8px', borderRadius: 8, background: '#FEFCE8', color: '#A16207', fontWeight: 700 }}>{leves} Leves</span>}
                </div>
              )}
            </div>

            <div style={{ background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: 12, padding: 14, display: 'flex', gap: 10 }}>
              <ClipboardList style={{ width: 18, height: 18, color: '#7C3AED', flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontSize: 13, color: '#5B21B6', lineHeight: 1.6 }}>
                <strong>Después de crear el plan</strong>, podrá agregar una acción correctiva por cada hallazgo y enviarlo a revisión de la OCI.
              </div>
            </div>
          </div>

          <div style={{ padding: '16px 24px 22px', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              type="button"
              disabled={creando}
              onClick={onCerrar}
              style={{
                height: 40,
                padding: '0 18px',
                borderRadius: 10,
                border: '1px solid #D1D5DB',
                background: 'white',
                color: '#374151',
                fontSize: 13,
                fontWeight: 700,
                cursor: creando ? 'not-allowed' : 'pointer',
                opacity: creando ? 0.6 : 1,
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={creando || totalHallazgos === 0}
              onClick={() => void onCrear()}
              style={{
                height: 40,
                padding: '0 18px',
                borderRadius: 10,
                border: 'none',
                background: creando || totalHallazgos === 0 ? '#9CA3AF' : '#B45309',
                color: 'white',
                fontSize: 13,
                fontWeight: 800,
                cursor: creando || totalHallazgos === 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {creando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
              {creando ? 'Creando plan...' : 'Crear Plan de Mejoramiento'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}


function DetalleAuditoria({
  auditoria: auditoriaInicial, userName, onBack,
}: { auditoria: AuditoriaItem; userName?: string; onBack: () => void }) {
  const [tab, setTab] = useState<DetalleTab>('info');
  const [auditoria, setAuditoria] = useState<AuditoriaItem>(auditoriaInicial);
  const [hallazgos, setHallazgos] = useState<HallazgoItem[]>([]);
  const [documentos, setDocumentos] = useState<DocumentoItem[]>([]);
  const [planesData, setPlanesData] = useState<any[]>([]);
  const [loadingDetalle, setLoadingDetalle] = useState(true);

  // Carga inicial de hallazgos + documentos + estado de comunicación.
  // Si el backend reporta que el Informe Final ya fue generado, enriquecemos
  // la auditoría con esa info para activar el banner del plan.
  useEffect(() => {
    let cancelado = false;
    setLoadingDetalle(true);
    const tasks: Promise<any>[] = [
      loadHallazgosAuditoria(auditoriaInicial.id),
      loadDocumentosAuditoria(auditoriaInicial.id),
      // Cargar planes para mostrar acciones en la pestaña Hallazgos
      // Fallback: si el endpoint auditado falla (ownership), usar el general
      controlInternoService.getPlanesMejoramientoAuditado(auditoriaInicial.id)
        .catch(() => controlInternoService.getPlanesMejoramientoByAuditoria(auditoriaInicial.id))
        .catch(() => []),
    ];
    if (USE_API_ESTADO) {
      tasks.push(
        controlInternoService
          .getEstadoComunicacionAuditado(auditoriaInicial.id)
          .catch((err) => {
            console.warn('[getEstadoComunicacionAuditado] fallback:', err);
            return null;
          }),
      );
    } else {
      tasks.push(Promise.resolve(null));
    }
    Promise.all(tasks)
      .then((results) => {
        if (cancelado) return;
        const [hh, dd, planes] = results as [HallazgoItem[], DocumentoItem[], any[]];
        setHallazgos(hh);
        setDocumentos(dd);
        setPlanesData(Array.isArray(planes) ? planes : []);
        const estadoCom = results[3] as any;
        if (estadoCom?.informeFinalGenerado) {
          setAuditoria((a) => ({
            ...a,
            informeFinalGenerado: true,
            fechaInformeFinal: a.fechaInformeFinal || fechaCO(estadoCom.fechaInformeFinal),
          }));
        }
      })
      .catch((err) => {
        if (cancelado) return;
        console.error('[DetalleAuditoria] error cargando detalle:', err);
        setHallazgos(HALLAZGOS_MOCK[auditoriaInicial.id] || []);
        setDocumentos(DOCUMENTOS_MOCK[auditoriaInicial.id] || []);
      })
      .finally(() => { if (!cancelado) setLoadingDetalle(false); });
    return () => { cancelado = true; };
  }, [auditoriaInicial.id]);

  const estado = ESTADO_AUDITORIA[auditoria.estado];
  const isReadOnly = auditoria.estado === 'Finalizada';
  const hallazgosNotificados = hallazgos.filter((h) => h.estado === 'notificado').length;
  const docsPorSubir = documentos.filter((d) => d.estado === 'Solicitado').length;

  // ── Acción: aceptar hallazgo ──────────────────────────────────────────────
  const handleAceptar = async (hallazgoId: string) => {
    if (USE_API_ACEPTAR) {
      try {
        await controlInternoService.aceptarMiHallazgo(auditoria.id, hallazgoId);
      } catch (err: any) {
        console.error('[aceptarMiHallazgo] error:', err);
        toast.error(err?.message || 'No se pudo aceptar el hallazgo');
        return;
      }
    } else {
      await new Promise((r) => setTimeout(r, 300));
    }
    setHallazgos((prev) => prev.map((h) =>
      h.id === hallazgoId
        ? { ...h, estado: 'aceptado', fechaPresentacion: new Date().toLocaleDateString('es-CO') }
        : h,
    ));
    toast.success('Hallazgo aceptado', {
      description: 'Cuando se publique el Informe Final deberás formular acciones para subsanarlo.',
    });
  };

  // ── Acción: subir documento de controversia (paso 1 de 2) ─────────────────
  // Backend real: uploadDocumentoAuditado -> POST /auditorias/auditado/:id/documentos
  // (multipart) con tipoDocumento='evidencia_controversia', etapa='comunicacion',
  // hallazgoId. La validación de ownership se hace en el backend.
  const handleSubirDocumentoControversia = async (
    file: File,
    hallazgoId: string,
  ): Promise<{ documentoId: string; nombre: string }> => {
    if (USE_API_DOCUPLOAD) {
      try {
        const doc = await controlInternoService.uploadDocumentoAuditado(
          auditoria.id,
          file,
          {
            nombre: `Controversia - ${file.name}`,
            tipoDocumento: 'evidencia_controversia',
            etapa: 'comunicacion',
            hallazgoId,
          },
        );
        const documentoId = String(doc?.id ?? '');
        const nombre = String(doc?.nombreArchivo ?? doc?.nombre ?? file.name);
        if (!documentoId) throw new Error('El backend no devolvió ID de documento');
        // Reflejamos en el expediente local
        setDocumentos((prev) => [
          ...prev,
          {
            id: documentoId,
            nombre,
            tipo: file.type || 'Archivo',
            fechaSubida: new Date().toLocaleDateString('es-CO'),
            tamano: `${(file.size / 1024).toFixed(0)} KB`,
            estado: 'Pendiente',
            origen: 'auditado',
          },
        ]);
        return { documentoId, nombre };
      } catch (err: any) {
        console.error('[subirDocumentoControversia] error:', err);
        toast.error(err?.message || 'No fue posible subir el documento');
        throw err;
      }
    }
    // Modo mock
    await new Promise((r) => setTimeout(r, 600));
    const documentoId = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setDocumentos((prev) => [
      ...prev,
      {
        id: documentoId,
        nombre: file.name,
        tipo: file.type || 'Archivo',
        fechaSubida: new Date().toLocaleDateString('es-CO'),
        tamano: `${(file.size / 1024).toFixed(0)} KB`,
        estado: 'Pendiente',
        origen: 'auditado',
      },
    ]);
    return { documentoId, nombre: file.name };
  };

  // ── Acción: presentar controversia (paso 2 de 2) ──────────────────────────
  const handlePresentarControversia = async (
    hallazgoId: string,
    argumentos: string,
    documentoId: string,
    documentoNombre: string,
  ) => {
    if (!argumentos.trim()) {
      toast.error('Los argumentos son obligatorios');
      return;
    }
    if (!documentoId || !documentoNombre) {
      toast.error('El documento adjunto es obligatorio');
      return;
    }
    if (USE_API_CONTROVER) {
      try {
        await controlInternoService.presentarMiControversia(
          auditoria.id,
          hallazgoId,
          { argumentos, documentoId, documentoNombre },
        );
      } catch (err: any) {
        console.error('[presentarMiControversia] error:', err);
        toast.error(err?.message || 'No se pudo registrar la controversia');
        return;
      }
    } else {
      await new Promise((r) => setTimeout(r, 400));
    }
    setHallazgos((prev) => prev.map((h) =>
      h.id === hallazgoId
        ? {
            ...h,
            estado: 'en-controversia',
            argumentosControversia: argumentos,
            documentoControversiaNombre: documentoNombre,
            fechaPresentacion: new Date().toLocaleDateString('es-CO'),
          }
        : h,
    ));
    toast.success('Controversia presentada al equipo auditor', {
      description: 'El auditor revisará tus argumentos y emitirá una decisión: ratificado, modificado o retirado.',
    });
  };

  if (loadingDetalle) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center', color: '#6B7280' }}>
        <Loader2 style={{ width: 22, height: 22, color: colors.brand, animation: 'spin 1s linear infinite' }} />
        <div style={{ fontSize: 13, marginTop: 10 }}>Cargando información de la auditoría...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Header detalle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <button
          onClick={onBack}
          aria-label="Volver"
          style={{
            width: 36, height: 36, borderRadius: 10,
            border: '1px solid #E5E7EB', background: 'white', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <ArrowLeft style={{ width: 16, height: 16, color: '#6B7280' }} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 600, letterSpacing: 0.3 }}>
            {auditoria.codigo} · {auditoria.tipo}
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#1F2937', letterSpacing: '-0.02em', marginTop: 2 }}>
            {auditoria.titulo}
          </div>
        </div>
        <span style={{
          fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 8,
          color: estado.color, background: estado.bg, border: `1px solid ${estado.border}`,
        }}>
          {auditoria.estado}
        </span>
      </div>

      {/* Banner de etapa actual con plazo */}
      <BannerEtapaActual auditoria={auditoria} />

      {/* Tabs — underline style */}
      <div style={{
        background: 'white', borderRadius: '14px 14px 0 0', padding: '0 4px',
        marginBottom: 16, display: 'flex', gap: 0,
        borderBottom: '2px solid #F3F4F6',
      }}>
        <TabButton active={tab === 'info'}       onClick={() => setTab('info')}       label="Información" icon={<Info style={{ width: 14, height: 14 }} />} />
        <TabButton active={tab === 'hallazgos'}  onClick={() => setTab('hallazgos')}  label={`Hallazgos${hallazgosNotificados ? ` (${hallazgosNotificados})` : ''}`} icon={<AlertTriangle style={{ width: 14, height: 14 }} />} />
        <TabButton active={tab === 'documentos'} onClick={() => setTab('documentos')} label={`Documentos${docsPorSubir ? ` (${docsPorSubir})` : ''}`}                  icon={<FileText style={{ width: 14, height: 14 }} />} />
        <TabButton active={tab === 'plan'} onClick={() => setTab('plan')} label="Plan de mejoramiento" icon={<Target style={{ width: 14, height: 14 }} />} />
      </div>

      <AnimatePresence mode="wait">
        {tab === 'info' && (
          <motion.div key="info"
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            <TabInfo auditoria={auditoria} />
          </motion.div>
        )}
        {tab === 'hallazgos' && (
          <motion.div key="hallazgos"
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            <TabHallazgos
              hallazgos={hallazgos}
              readOnly={isReadOnly}
              plazoVencido={!!calcularPlazoActivo(auditoria)?.vencido && (auditoria.estado === 'Notificada' || auditoria.estado === 'En Respuesta')}
              planes={planesData}
              onAceptar={handleAceptar}
              onSubirDocumentoControversia={handleSubirDocumentoControversia}
              onPresentarControversia={handlePresentarControversia}
            />
          </motion.div>
        )}
        {tab === 'documentos' && (
          <motion.div key="documentos"
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            <TabDocumentos
              documentos={documentos}
              readOnly={isReadOnly}
              onSubir={(id, file) => {
                setDocumentos((prev) => prev.map((d) =>
                  d.id === id
                    ? {
                        ...d,
                        nombre: file.name,
                        estado: 'Pendiente',
                        fechaSubida: new Date().toLocaleDateString('es-CO'),
                        tamano: `${(file.size / 1024).toFixed(0)} KB`,
                        origen: 'auditado',
                      }
                    : d,
                ));
                toast.success('Documento cargado', { description: file.name });
              }}
              onSubirNuevo={(file) => {
                setDocumentos((prev) => [
                  ...prev,
                  {
                    id: `d-extra-${Date.now()}`,
                    nombre: file.name,
                    tipo: file.type || 'Archivo',
                    fechaSubida: new Date().toLocaleDateString('es-CO'),
                    tamano: `${(file.size / 1024).toFixed(0)} KB`,
                    estado: 'Pendiente',
                    origen: 'auditado',
                  },
                ]);
                toast.success('Documento adicional cargado', { description: file.name });
              }}
            />
          </motion.div>
        )}
        {tab === 'plan' && (
          <motion.div
            key="plan"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            <TabPlanMejoramientoAuditado auditoria={auditoria} auditoriaId={auditoria.id} readOnly={isReadOnly} hallazgos={hallazgos} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TabButton({ active, onClick, label, icon }: { active: boolean; onClick: () => void; label: string; icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, height: 44, border: 'none',
        borderBottom: active ? `2px solid ${colors.brand}` : '2px solid transparent',
        background: 'transparent',
        color: active ? colors.brand : '#6B7280',
        fontSize: 13, fontWeight: active ? 700 : 500, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        transition: 'all 0.2s',
        marginBottom: -2, // overlap container border
      }}
    >
      {icon}
      {label}
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB: INFORMACIÓN
// ════════════════════════════════════════════════════════════════════════════

function TabInfo({ auditoria }: { auditoria: AuditoriaItem }) {
  const plazo = calcularPlazoActivo(auditoria);
  const plazoTexto = plazo
    ? `${formatearFechaCO(plazo.fechaLimite)} (${plazo.diasHabilesRestantes < 0
        ? `vencido hace ${Math.abs(plazo.diasHabilesRestantes)} día${Math.abs(plazo.diasHabilesRestantes) === 1 ? '' : 's'} hábil${Math.abs(plazo.diasHabilesRestantes) === 1 ? '' : 'es'}`
        : `${plazo.diasHabilesRestantes} día${plazo.diasHabilesRestantes === 1 ? '' : 's'} hábil${plazo.diasHabilesRestantes === 1 ? '' : 'es'} restantes`})`
    : 'No aplica';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Descripción */}
      {auditoria.descripcion && (
        <div style={{
          background: 'white', borderRadius: 14, padding: '16px 20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)', border: '1px solid #F3F4F6',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <FileText style={{ width: 12, height: 12 }} />
            Descripción de la auditoría
          </div>
          <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.7 }}>
            {auditoria.descripcion}
          </div>
        </div>
      )}

      {/* Sección 1: Datos generales */}
      <div style={{
        background: 'white', borderRadius: 14, padding: '16px 20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)', border: '1px solid #F3F4F6',
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
          <ClipboardList style={{ width: 12, height: 12 }} />
          Datos de la auditoría
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          <InfoField icon={<User style={{ width: 13, height: 13, color: '#2563EB' }} />} label="Auditor líder" value={auditoria.auditorLider} />
          <InfoField icon={<Building2 style={{ width: 13, height: 13, color: '#7C3AED' }} />} label="Área auditada" value={auditoria.area} />
          <InfoField icon={<Tag style={{ width: 13, height: 13, color: '#0891B2' }} />} label="Tipo de auditoría" value={auditoria.tipo} />
          <InfoField icon={<Calendar style={{ width: 13, height: 13, color: '#059669' }} />} label="Fecha de notificación" value={auditoria.fechaNotificacion} />
          {auditoria.informeFinalGenerado && (
            <InfoField icon={<FileCheck style={{ width: 13, height: 13, color: '#047857' }} />} label="Informe final" value={auditoria.fechaInformeFinal || 'Generado'} />
          )}
          {plazo && (
            <InfoField icon={<Clock style={{ width: 13, height: 13, color: plazo.vencido ? '#DC2626' : '#B45309' }} />} label={plazo.etapa} value={plazoTexto} highlight={plazo.vencido ? 'danger' : undefined} />
          )}
        </div>
      </div>

      {/* Sección 2: Métricas clave */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12,
      }}>
        <div style={{
          background: 'white', borderRadius: 14, padding: '16px 20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)', border: '1px solid #F3F4F6',
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: '#FFFBEB', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <AlertCircle style={{ width: 20, height: 20, color: '#B45309' }} />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#B45309' }}>{auditoria.hallazgos}</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#6B7280' }}>Hallazgos</div>
          </div>
        </div>

        <div style={{
          background: 'white', borderRadius: 14, padding: '16px 20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)', border: '1px solid #F3F4F6',
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Upload style={{ width: 20, height: 20, color: '#2563EB' }} />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#2563EB' }}>
              {auditoria.documentosSubidos}<span style={{ fontSize: 14, color: '#9CA3AF' }}>/{auditoria.documentosSolicitados}</span>
            </div>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#6B7280' }}>Documentos subidos</div>
          </div>
        </div>

        <div style={{
          background: 'white', borderRadius: 14, padding: '16px 20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)', border: '1px solid #F3F4F6',
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: auditoria.documentosSolicitados > 0 && auditoria.documentosSubidos >= auditoria.documentosSolicitados ? '#ECFDF5' : '#FEF2F2',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <CheckCircle2 style={{
              width: 20, height: 20,
              color: auditoria.documentosSolicitados > 0 && auditoria.documentosSubidos >= auditoria.documentosSolicitados ? '#047857' : '#DC2626',
            }} />
          </div>
          <div>
            <div style={{
              fontSize: 14, fontWeight: 700,
              color: auditoria.documentosSolicitados > 0 && auditoria.documentosSubidos >= auditoria.documentosSolicitados ? '#047857' : '#DC2626',
            }}>
              {auditoria.documentosSolicitados > 0 && auditoria.documentosSubidos >= auditoria.documentosSolicitados ? 'Completo' : `${Math.max(0, auditoria.documentosSolicitados - auditoria.documentosSubidos)} pendiente${Math.max(0, auditoria.documentosSolicitados - auditoria.documentosSubidos) !== 1 ? 's' : ''}`}
            </div>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#6B7280' }}>Estado documentos</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoField({ label, value, icon, highlight }: { label: string; value: string; icon?: React.ReactNode; highlight?: 'danger' }) {
  return (
    <div style={{
      padding: '10px 12px', borderRadius: 10,
      background: highlight === 'danger' ? '#FEF2F2' : '#F9FAFB',
      border: `1px solid ${highlight === 'danger' ? '#FCA5A5' : '#F3F4F6'}`,
    }}>
      <div style={{
        fontSize: 10, fontWeight: 600, color: '#9CA3AF',
        textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 5,
        display: 'flex', alignItems: 'center', gap: 5,
      }}>
        {icon}
        {label}
      </div>
      <div style={{
        fontSize: 13, color: highlight === 'danger' ? '#DC2626' : '#1F2937',
        fontWeight: 600,
      }}>
        {value || '—'}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// BANNER ETAPA ACTUAL (plazo activo y siguiente paso)
// ════════════════════════════════════════════════════════════════════════════

function BannerEtapaActual({ auditoria }: { auditoria: AuditoriaItem }) {
  const plazo = calcularPlazoActivo(auditoria);

  // Auditoría finalizada
  if (auditoria.estado === 'Finalizada') {
    return (
      <div style={{
        marginBottom: 16, padding: '14px 16px', borderRadius: 12,
        background: '#ECFDF5', border: '1px solid #A7F3D0',
        display: 'flex', alignItems: 'flex-start', gap: 12,
      }}>
        <CheckCircle2 style={{ width: 20, height: 20, color: '#047857', flexShrink: 0, marginTop: 2 }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#047857' }}>Auditoría finalizada</div>
          <div style={{ fontSize: 12, color: '#065F46', marginTop: 2 }}>
            Esta auditoría está cerrada. Solo puedes consultar la información en modo lectura.
          </div>
        </div>
      </div>
    );
  }

  // Etapa Plan: Informe Final ya generado, corre plazo de 30 días hábiles
  if (auditoria.informeFinalGenerado) {
    const venc = plazo?.vencido;
    return (
      <div style={{
        marginBottom: 16, padding: '14px 16px', borderRadius: 12,
        background: venc ? '#FEF2F2' : '#F5F3FF',
        border: `1px solid ${venc ? '#FECACA' : '#DDD6FE'}`,
        display: 'flex', alignItems: 'flex-start', gap: 12,
      }}>
        <ClipboardList style={{
          width: 20, height: 20, flexShrink: 0, marginTop: 2,
          color: venc ? '#DC2626' : '#6D28D9',
        }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: venc ? '#7F1D1D' : '#5B21B6' }}>
            Etapa: Formular Plan de Mejoramiento
          </div>
          <div style={{ fontSize: 12, color: venc ? '#7F1D1D' : '#4C1D95', marginTop: 4, lineHeight: 1.5 }}>
            El equipo auditor publicó el <strong>Informe Final</strong>{auditoria.fechaInformeFinal ? ` el ${auditoria.fechaInformeFinal}` : ''}.
            Tienes <strong>{PLAZO_PLAN_DIAS_HABILES} días hábiles</strong> para formular el plan con
            acciones de mejora por cada hallazgo aceptado, ratificado o modificado.
            {plazo && (
              <>
                {' '}Vence el <strong>{formatearFechaCO(plazo.fechaLimite)}</strong>
                {venc
                  ? ` (vencido hace ${Math.abs(plazo.diasHabilesRestantes)} día${Math.abs(plazo.diasHabilesRestantes) === 1 ? '' : 's'} hábil${Math.abs(plazo.diasHabilesRestantes) === 1 ? '' : 'es'}).`
                  : ` (${plazo.diasHabilesRestantes} día${plazo.diasHabilesRestantes === 1 ? '' : 's'} hábil${plazo.diasHabilesRestantes === 1 ? '' : 'es'} restantes).`}
              </>
            )}
          </div>
          <div style={{ fontSize: 11, color: '#6B7280', marginTop: 6, lineHeight: 1.5 }}>
            La creación formal del plan sigue coordinándose desde Control Interno (OCI). En la pestaña
            <strong> Plan de mejoramiento</strong> puedes ver el plan vinculado a esta auditoría y registrar el avance de tus acciones.
          </div>
        </div>
      </div>
    );
  }

  // Etapa Comunicación: Notificada o En Respuesta
  if (auditoria.estado === 'Notificada' || auditoria.estado === 'En Respuesta') {
    const venc = !!plazo?.vencido;
    return (
      <div style={{
        marginBottom: 16, padding: '14px 16px', borderRadius: 12,
        background: venc ? '#FEF2F2' : '#FFFBEB',
        border: `1px solid ${venc ? '#FECACA' : '#FDE68A'}`,
        display: 'flex', alignItems: 'flex-start', gap: 12,
      }}>
        <AlertCircle style={{
          width: 20, height: 20, flexShrink: 0, marginTop: 2,
          color: venc ? '#DC2626' : '#B45309',
        }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: venc ? '#7F1D1D' : '#92400E' }}>
            Etapa: Responder hallazgos
          </div>
          <div style={{ fontSize: 12, color: venc ? '#7F1D1D' : '#78350F', marginTop: 4, lineHeight: 1.5 }}>
            Tienes <strong>{PLAZO_RESPUESTA_DIAS_HABILES} días hábiles</strong> desde la notificación
            ({auditoria.fechaNotificacion}) para responder cada hallazgo: <strong>aceptar</strong> o
            <strong> presentar controversia</strong> con argumentos y documento adjunto obligatorio.
            {plazo && (
              <>
                {' '}Vence el <strong>{formatearFechaCO(plazo.fechaLimite)}</strong>
                {venc
                  ? ` (vencido hace ${Math.abs(plazo.diasHabilesRestantes)} día${Math.abs(plazo.diasHabilesRestantes) === 1 ? '' : 's'} hábil${Math.abs(plazo.diasHabilesRestantes) === 1 ? '' : 'es'}).`
                  : ` (${plazo.diasHabilesRestantes} día${plazo.diasHabilesRestantes === 1 ? '' : 's'} hábil${plazo.diasHabilesRestantes === 1 ? '' : 'es'} restantes).`}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Etapa Revisión sin Informe Final (auditor decidiendo controversias)
  if (auditoria.estado === 'Revisión') {
    return (
      <div style={{
        marginBottom: 16, padding: '14px 16px', borderRadius: 12,
        background: '#F5F3FF', border: '1px solid #DDD6FE',
        display: 'flex', alignItems: 'flex-start', gap: 12,
      }}>
        <Gavel style={{ width: 20, height: 20, color: '#6D28D9', flexShrink: 0, marginTop: 2 }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#5B21B6' }}>Etapa: Revisión del auditor</div>
          <div style={{ fontSize: 12, color: '#4C1D95', marginTop: 4, lineHeight: 1.5 }}>
            El equipo auditor está evaluando las controversias presentadas. Cuando termine,
            generará el Informe Final y se abrirá el plazo de <strong>{PLAZO_PLAN_DIAS_HABILES} días hábiles</strong> para
            formular el Plan de Mejoramiento.
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// ════════════════════════════════════════════════════════════════════════════
// TAB: HALLAZGOS  (Aceptar / Presentar controversia)
// ════════════════════════════════════════════════════════════════════════════

function grupoFiltroHallazgo(estado: EstadoHallazgo): FiltroHallazgoVista {
  if (estado === 'borrador') return 'borrador';
  if (estado === 'notificado') return 'pendientes';
  if (estado === 'cerrado') return 'cerrados';
  if (['aceptado', 'en-controversia', 'ratificado', 'modificado', 'retirado'].includes(estado)) return 'respondidos';
  return 'todos';
}

function TabHallazgos({
  hallazgos, readOnly, plazoVencido, planes, onAceptar, onSubirDocumentoControversia, onPresentarControversia,
}: {
  hallazgos: HallazgoItem[];
  readOnly: boolean;
  plazoVencido: boolean;
  /** Planes cargados para mostrar acciones vinculadas a cada hallazgo */
  planes: any[];
  onAceptar: (id: string) => Promise<void>;
  onSubirDocumentoControversia: (file: File, hallazgoId: string) => Promise<{ documentoId: string; nombre: string }>;
  onPresentarControversia: (id: string, argumentos: string, documentoId: string, documentoNombre: string) => Promise<void>;
}) {
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<FiltroHallazgoVista>('todos');
  const [pagina, setPagina] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const modoCompacto = hallazgos.length > HALLAZGOS_COMPACT_THRESHOLD;

  const conteos = useMemo(() => ({
    todos: hallazgos.length,
    pendientes: hallazgos.filter((h) => h.estado === 'notificado').length,
    respondidos: hallazgos.filter((h) => grupoFiltroHallazgo(h.estado) === 'respondidos').length,
    borrador: hallazgos.filter((h) => h.estado === 'borrador').length,
    cerrados: hallazgos.filter((h) => h.estado === 'cerrado').length,
  }), [hallazgos]);

  const accionesPorHallazgo = useMemo(() => {
    const map = new Map<string, { plan: any; acciones: any[] }>();
    planes.forEach((plan) => {
      (plan.acciones || []).forEach((accion: any) => {
        if (accion.hallazgoId) {
          if (!map.has(accion.hallazgoId)) {
            map.set(accion.hallazgoId, { plan, acciones: [] });
          }
          map.get(accion.hallazgoId)!.acciones.push(accion);
        }
      });
    });
    return map;
  }, [planes]);

  const hallazgosFiltrados = useMemo(() => {
    const term = busqueda.trim().toLowerCase();
    return hallazgos.filter((h) => {
      if (filtro !== 'todos' && grupoFiltroHallazgo(h.estado) !== filtro) return false;
      if (!term) return true;
      return (
        h.codigo.toLowerCase().includes(term) ||
        h.titulo.toLowerCase().includes(term) ||
        h.descripcion.toLowerCase().includes(term) ||
        h.gravedad.toLowerCase().includes(term)
      );
    });
  }, [hallazgos, busqueda, filtro]);

  useEffect(() => {
    setPagina(1);
  }, [busqueda, filtro]);

  const totalPaginas = Math.max(1, Math.ceil(hallazgosFiltrados.length / HALLAZGOS_PAGE_SIZE));
  const paginaSegura = Math.min(pagina, totalPaginas);

  const hallazgosPagina = useMemo(() => {
    const inicio = (paginaSegura - 1) * HALLAZGOS_PAGE_SIZE;
    return hallazgosFiltrados.slice(inicio, inicio + HALLAZGOS_PAGE_SIZE);
  }, [hallazgosFiltrados, paginaSegura]);

  const rango = useMemo(() => {
    if (hallazgosFiltrados.length === 0) return { desde: 0, hasta: 0 };
    return {
      desde: (paginaSegura - 1) * HALLAZGOS_PAGE_SIZE + 1,
      hasta: Math.min(paginaSegura * HALLAZGOS_PAGE_SIZE, hallazgosFiltrados.length),
    };
  }, [hallazgosFiltrados.length, paginaSegura]);

  // En listas largas: abrir el primer pendiente al cambiar página o filtros (no en cada render).
  useEffect(() => {
    if (!modoCompacto) {
      setExpandedId(null);
      return;
    }
    const inicio = (paginaSegura - 1) * HALLAZGOS_PAGE_SIZE;
    const pagina = hallazgosFiltrados.slice(inicio, inicio + HALLAZGOS_PAGE_SIZE);
    const primeroPendiente = pagina.find((h) => h.estado === 'notificado');
    setExpandedId(primeroPendiente?.id ?? pagina[0]?.id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al cambiar página/filtros, no en cada render del padre
  }, [modoCompacto, paginaSegura, busqueda, filtro, hallazgosFiltrados.length]);

  if (hallazgos.length === 0) {
    return (
      <div style={{ ...portalCardStyle, padding: 48, textAlign: 'center' }}>
        <CheckCircle2 style={{ width: 32, height: 32, color: '#10B981', margin: '0 auto 12px' }} />
        <div style={{ fontSize: 15, fontWeight: 700, color: '#374151' }}>Sin hallazgos</div>
        <div style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>Esta auditoría no presenta hallazgos por responder.</div>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {plazoVencido && (
        <div style={{
          padding: 14, borderRadius: 12,
          background: '#FEF2F2', border: '1px solid #FECACA',
          display: 'flex', alignItems: 'flex-start', gap: 10,
        }}>
          <AlertTriangle style={{ width: 18, height: 18, color: '#DC2626', flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 13, color: '#7F1D1D', lineHeight: 1.5 }}>
            <strong>El plazo de {PLAZO_RESPUESTA_DIAS_HABILES} días hábiles para responder los hallazgos venció.</strong>{' '}
            Los hallazgos sin respuesta podrán ser ratificados por el equipo auditor sin
            controversia, según el procedimiento de Control Interno.
          </div>
        </div>
      )}

      {modoCompacto && (
        <div
          style={{
            ...portalCardStyle,
            padding: '12px 16px',
            background: colors.brandLight,
            border: `1px solid ${colors.brand}22`,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
          }}
        >
          <Info style={{ width: 16, height: 16, color: colors.brand, flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 12, color: '#1E3A8A', lineHeight: 1.5 }}>
            Esta auditoría tiene <strong>{hallazgos.length} hallazgos</strong>.
            Usa los filtros y la paginación; en modo compacto solo un hallazgo queda expandido a la vez para facilitar la lectura.
          </div>
        </div>
      )}

      <ListaToolbar
        busqueda={busqueda}
        onBusquedaChange={setBusqueda}
        placeholder="Buscar por código, título o gravedad..."
        filtros={[
          { id: 'todos', label: 'Todos', count: conteos.todos },
          { id: 'pendientes', label: 'Pendientes', count: conteos.pendientes },
          { id: 'respondidos', label: 'Respondidos', count: conteos.respondidos },
          { id: 'borrador', label: 'Borrador', count: conteos.borrador },
          ...(conteos.cerrados > 0 ? [{ id: 'cerrados', label: 'Cerrados', count: conteos.cerrados }] : []),
        ]}
        filtroActivo={filtro}
        onFiltroChange={(id) => setFiltro(id as FiltroHallazgoVista)}
        total={hallazgosFiltrados.length}
        pagina={paginaSegura}
        totalPaginas={totalPaginas}
        desde={rango.desde}
        hasta={rango.hasta}
        onPaginaAnterior={() => setPagina((p) => Math.max(1, p - 1))}
        onPaginaSiguiente={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
        extra={
          modoCompacto ? (
            <button
              type="button"
              onClick={() => {
                const pendientes = hallazgosFiltrados.filter((h) => h.estado === 'notificado');
                setExpandedId(pendientes[0]?.id ?? null);
              }}
              style={{
                height: 34,
                padding: '0 12px',
                borderRadius: 8,
                border: `1px solid ${colors.brand}`,
                background: colors.bgWhite,
                color: colors.brand,
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Ir al pendiente
            </button>
          ) : undefined
        }
      />

      {hallazgosFiltrados.length === 0 ? (
        <div style={{ ...portalCardStyle, padding: 32, textAlign: 'center' }}>
          <Search style={{ width: 28, height: 28, color: colors.icon, margin: '0 auto 10px' }} />
          <div style={{ fontSize: 14, fontWeight: 700, color: colors.textSecondary }}>Sin coincidencias</div>
          <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>
            Prueba otro filtro o término de búsqueda.
          </div>
        </div>
      ) : (
        hallazgosPagina.map((h) => {
          const vinculado = accionesPorHallazgo.get(h.id);
          const isExpanded = modoCompacto ? expandedId === h.id : undefined;
          return (
            <div key={h.id}>
              <HallazgoCard
                hallazgo={h}
                readOnly={readOnly}
                plazoVencido={plazoVencido}
                onAceptar={onAceptar}
                onSubirDocumentoControversia={onSubirDocumentoControversia}
                onPresentarControversia={onPresentarControversia}
                modoCompacto={modoCompacto}
                expanded={isExpanded}
                onExpandedChange={(open) => {
                  setExpandedId(open ? h.id : null);
                }}
              />
              {isExpanded === true && vinculado && vinculado.acciones.length > 0 && (
                <PlanVinculadoHallazgo plan={vinculado.plan} acciones={vinculado.acciones} />
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

// Mensaje contextual de consecuencia para el auditado según el estado actual
// del hallazgo. Explica qué significa para el Plan de Mejoramiento.
function ConsecuenciaHallazgo({ hallazgo }: { hallazgo: HallazgoItem }) {
  const e = hallazgo.estado;
  type Tone = 'success' | 'info' | 'warn' | 'danger' | 'purple';
  const toneStyles: Record<Tone, { bg: string; border: string; color: string; ico: string }> = {
    success: { bg: '#ECFDF5', border: '#A7F3D0', color: '#065F46', ico: '#047857' },
    info:    { bg: '#EFF6FF', border: '#BFDBFE', color: '#1E3A8A', ico: '#1D4ED8' },
    warn:    { bg: '#FFFBEB', border: '#FDE68A', color: '#78350F', ico: '#B45309' },
    danger:  { bg: '#FEF2F2', border: '#FECACA', color: '#7F1D1D', ico: '#DC2626' },
    purple:  { bg: '#F5F3FF', border: '#DDD6FE', color: '#4C1D95', ico: '#6D28D9' },
  };
  let tone: Tone = 'info';
  let titulo = '';
  let mensaje = '';
  let Icono = Info as typeof Info;

  if (e === 'aceptado') {
    tone = 'success'; Icono = CheckCircle2;
    titulo = 'Aceptaste este hallazgo';
    mensaje = 'Cuando se publique el Informe Final deberás formular acciones correctivas para subsanarlo dentro del Plan de Mejoramiento (30 días hábiles).';
  } else if (e === 'en-controversia') {
    tone = 'info'; Icono = Scale;
    titulo = 'Controversia presentada';
    mensaje = 'El equipo auditor revisará tus argumentos y emitirá una decisión: ratificado, modificado o retirado. Mientras tanto, la auditoría no puede cerrarse.';
  } else if (e === 'ratificado') {
    tone = 'danger'; Icono = AlertCircle;
    titulo = 'Hallazgo ratificado';
    mensaje = 'El auditor mantuvo el hallazgo tal como estaba. Entrará al Plan de Mejoramiento sin modificaciones y deberás formular acciones para subsanarlo.';
  } else if (e === 'modificado') {
    tone = 'purple'; Icono = Gavel;
    titulo = 'Hallazgo modificado';
    mensaje = 'El auditor aceptó parcialmente tu controversia y ajustó el hallazgo. La versión modificada entra al Plan de Mejoramiento con las acciones que deberás formular.';
  } else if (e === 'retirado') {
    tone = 'success'; Icono = CheckCircle2;
    titulo = 'Hallazgo retirado';
    mensaje = 'Tu controversia fue aceptada. Este hallazgo NO entra al Plan de Mejoramiento y no requiere acción correctiva.';
  } else if (e === 'cerrado') {
    tone = 'success'; Icono = CheckCircle2;
    titulo = 'Hallazgo cerrado';
    mensaje = 'Las acciones del Plan de Mejoramiento se ejecutaron y la OCI verificó su cumplimiento.';
  } else if (e === 'borrador') {
    tone = 'warn'; Icono = Clock;
    titulo = 'Hallazgo en preparación';
    mensaje =
      `El equipo auditor aún no ha notificado este hallazgo al área. Cuando se publique el Informe Preliminar podrás aceptarlo o presentar controversia (plazo de ${PLAZO_RESPUESTA_DIAS_HABILES} días hábiles).`;
  } else {
    return null; // 'notificado' no muestra mensaje (los botones se muestran abajo)
  }

  const s = toneStyles[tone];
  return (
    <div style={{
      marginTop: 14, padding: 14, borderRadius: 10,
      background: s.bg, border: `1px solid ${s.border}`,
      display: 'flex', alignItems: 'flex-start', gap: 10,
    }}>
      <Icono style={{ width: 16, height: 16, color: s.ico, flexShrink: 0, marginTop: 2 }} />
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: s.color }}>{titulo}</div>
        <div style={{ fontSize: 12, color: s.color, marginTop: 2, lineHeight: 1.5 }}>{mensaje}</div>
      </div>
    </div>
  );
}

function HallazgoCard({
  hallazgo,
  readOnly,
  plazoVencido = false,
  onAceptar,
  onSubirDocumentoControversia,
  onPresentarControversia,
  modoCompacto = false,
  expanded: expandedControlled,
  onExpandedChange,
}: {
  hallazgo: HallazgoItem;
  readOnly: boolean;
  plazoVencido?: boolean;
  onAceptar: (id: string) => Promise<void>;
  onSubirDocumentoControversia: (file: File, hallazgoId: string) => Promise<{ documentoId: string; nombre: string }>;
  onPresentarControversia: (id: string, argumentos: string, documentoId: string, documentoNombre: string) => Promise<void>;
  modoCompacto?: boolean;
  expanded?: boolean;
  onExpandedChange?: (open: boolean) => void;
}) {
  const [expandedInternal, setExpandedInternal] = useState(
    !modoCompacto && (hallazgo.estado === 'notificado' || hallazgo.estado === 'borrador'),
  );
  const isControlled = expandedControlled !== undefined;
  const expanded = isControlled ? expandedControlled : expandedInternal;
  const setExpanded = (open: boolean) => {
    if (isControlled && onExpandedChange) {
      onExpandedChange(open);
    } else {
      setExpandedInternal(open);
    }
  };
  const [showControversiaForm, setShowControversiaForm] = useState(false);
  const [argumentos, setArgumentos] = useState('');
  const [documento, setDocumento] = useState<File | null>(null);
  /** Resultado del paso 1: subida del documento. Necesario para poder enviar el paso 2. */
  const [documentoSubido, setDocumentoSubido] = useState<{ documentoId: string; nombre: string } | null>(null);
  const [subiendoDoc, setSubiendoDoc] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const estadoCol = ESTADO_HALLAZGO[hallazgo.estado];
  const esTurnoAuditado = hallazgo.estado === 'en-controversia' && hallazgo.controversiaTurno === 'auditado';
  const puedeResponder = !readOnly && !plazoVencido && (hallazgo.estado === 'notificado' || esTurnoAuditado);
  const mostrarBotones = !readOnly && (hallazgo.estado === 'notificado' || esTurnoAuditado);

  const handleAceptar = async () => {
    setSubmitting(true);
    await onAceptar(hallazgo.id);
    setSubmitting(false);
  };

  const handleSeleccionarDoc = async (file: File) => {
    setDocumento(file);
    setSubiendoDoc(true);
    try {
      const result = await onSubirDocumentoControversia(file, hallazgo.id);
      setDocumentoSubido(result);
    } catch (err) {
      toast.error('No fue posible subir el documento. Intenta de nuevo.');
      setDocumento(null);
    } finally {
      setSubiendoDoc(false);
    }
  };

  const handleEnviarControversia = async () => {
    if (!documentoSubido) {
      toast.error('El documento adjunto es obligatorio');
      return;
    }
    setSubmitting(true);
    await onPresentarControversia(hallazgo.id, argumentos, documentoSubido.documentoId, documentoSubido.nombre);
    setSubmitting(false);
    setShowControversiaForm(false);
    setArgumentos('');
    setDocumento(null);
    setDocumentoSubido(null);
  };

  return (
    <div style={{ ...portalCardStyle, padding: 0, overflow: 'hidden' }}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          padding: '16px 18px',
          border: 'none',
          background: expanded ? colors.bgHover : colors.bgWhite,
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'background 0.15s ease',
        }}
      >
        <div
          style={{
            width: 4,
            alignSelf: 'stretch',
            borderRadius: 4,
            background: GRAVEDAD_COLOR[hallazgo.gravedad],
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: colors.brand,
                letterSpacing: 0.4,
                fontFamily: 'ui-monospace, monospace',
              }}
            >
              {hallazgo.codigo}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: 20,
                color: estadoCol.color,
                background: estadoCol.bg,
              }}
            >
              {estadoCol.label}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: 20,
                color: GRAVEDAD_COLOR[hallazgo.gravedad],
                background: `${GRAVEDAD_COLOR[hallazgo.gravedad]}14`,
                border: `1px solid ${GRAVEDAD_COLOR[hallazgo.gravedad]}33`,
              }}
            >
              {hallazgo.gravedad}
            </span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: colors.text, lineHeight: 1.35 }}>
            {hallazgo.titulo}
          </div>
        </div>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 12,
            fontWeight: 600,
            color: colors.brand,
            flexShrink: 0,
          }}
        >
          {expanded ? 'Ocultar' : 'Ver detalle'}
          <ChevronDown
            style={{
              width: 16,
              height: 16,
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
            }}
          />
        </span>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="detalle"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div
              style={{
                padding: '0 18px 18px',
                borderTop: `1px solid ${colors.borderLight}`,
                background: colors.bgSubtle,
              }}
            >
              <DetalleHallazgoCampos hallazgo={hallazgo} />

              {/* Respuesta del auditado (si ya la presentó) */}
              {(hallazgo.observacionesControversia || hallazgo.argumentosControversia || hallazgo.documentoControversiaNombre) && (
                <div style={{
                  marginTop: 14, padding: 14, borderRadius: 10,
                  background: '#EFF6FF', border: '1px solid #BFDBFE',
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#1D4ED8', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Scale style={{ width: 12, height: 12 }} />
                    Historial de la controversia {hallazgo.fechaPresentacion ? `· ${hallazgo.fechaPresentacion}` : ''}
                  </div>
                  {(hallazgo.observacionesControversia || hallazgo.argumentosControversia) && (
                    <div style={{ fontSize: 13, color: '#1F2937', lineHeight: 1.5, marginBottom: hallazgo.documentoControversiaNombre ? 8 : 0, whiteSpace: 'pre-wrap' }}>
                      {hallazgo.observacionesControversia || hallazgo.argumentosControversia}
                    </div>
                  )}
                  {hallazgo.documentoControversiaNombre && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#1D4ED8', fontWeight: 600 }}>
                      <Paperclip style={{ width: 12, height: 12 }} />
                      {hallazgo.documentoControversiaNombre}
                    </div>
                  )}
                </div>
              )}

              {/* Mensaje contextual de consecuencia según estado del hallazgo */}
              <ConsecuenciaHallazgo hallazgo={hallazgo} />

              {/* Decisión del auditor (si ya la tomó) */}
              {hallazgo.decisionAuditor && (
                <div style={{
                  marginTop: 14, padding: 14, borderRadius: 10,
                  background: '#F9FAFB', border: '1px solid #E5E7EB',
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Gavel style={{ width: 12, height: 12 }} />
                    Decisión del auditor: {hallazgo.decisionAuditor.toUpperCase()}
                    {hallazgo.fechaDecision ? ` · ${hallazgo.fechaDecision}` : ''}
                  </div>
                  {hallazgo.fundamentacionTecnica && (
                    <div style={{ fontSize: 13, color: '#1F2937', lineHeight: 1.5 }}>
                      {hallazgo.fundamentacionTecnica}
                    </div>
                  )}
                </div>
              )}

              {/* Acciones del auditado: si está en 'notificado' o es su turno en controversia */}
              {mostrarBotones && !showControversiaForm && (
                <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    onClick={plazoVencido ? undefined : handleAceptar}
                    disabled={submitting || plazoVencido}
                    title={plazoVencido ? 'El plazo de respuesta ha vencido' : undefined}
                    style={{
                      height: 38, padding: '0 16px', borderRadius: 10, border: 'none',
                      background: submitting || plazoVencido ? '#D1D5DB' : '#047857',
                      color: submitting || plazoVencido ? '#9CA3AF' : 'white',
                      fontSize: 13, fontWeight: 600,
                      cursor: submitting ? 'wait' : plazoVencido ? 'not-allowed' : 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      boxShadow: submitting || plazoVencido ? 'none' : '0 2px 8px rgba(4,120,87,0.18)',
                    }}
                  >
                    <ThumbsUp style={{ width: 14, height: 14 }} />
                    {esTurnoAuditado ? 'Aceptar controversia' : 'Aceptar hallazgo'}
                  </button>
                  <button
                    onClick={plazoVencido ? undefined : () => setShowControversiaForm(true)}
                    disabled={submitting || plazoVencido}
                    title={plazoVencido ? 'El plazo de respuesta ha vencido' : undefined}
                    style={{
                      height: 38, padding: '0 16px', borderRadius: 10,
                      border: `1px solid ${plazoVencido ? '#D1D5DB' : '#1D4ED8'}`,
                      background: 'white',
                      color: plazoVencido ? '#9CA3AF' : '#1D4ED8',
                      fontSize: 13, fontWeight: 600,
                      cursor: plazoVencido ? 'not-allowed' : 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                    }}
                  >
                    <Scale style={{ width: 14, height: 14 }} />
                    {esTurnoAuditado ? 'Devolver con observaciones' : 'Presentar controversia'}
                  </button>
                </div>
              )}

              {/* Formulario de controversia */}
              <AnimatePresence>
                {puedeResponder && showControversiaForm && (
                  <motion.div
                    key="form-ctrv"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div style={{
                      marginTop: 14, padding: 16, borderRadius: 12,
                      background: '#F9FAFB', border: '1px solid #E5E7EB',
                    }}>
                      {/* Aviso normativo */}
                      <div style={{
                        marginBottom: 14, padding: '10px 12px', borderRadius: 10,
                        background: '#EFF6FF', border: '1px solid #BFDBFE',
                        display: 'flex', alignItems: 'flex-start', gap: 8,
                      }}>
                        <Info style={{ width: 14, height: 14, color: '#1D4ED8', flexShrink: 0, marginTop: 2 }} />
                        <div style={{ fontSize: 12, color: '#1E3A8A', lineHeight: 1.5 }}>
                          La controversia se evalúa por el equipo auditor y puede resultar en:
                          <strong> Ratificado </strong> (hallazgo se mantiene),
                          <strong> Modificado </strong> (se ajusta) o
                          <strong> Retirado </strong> (se elimina). La fundamentación
                          técnica del auditor será visible aquí mismo.
                        </div>
                      </div>

                      <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8 }}>
                        Argumentos de la controversia <span style={{ color: '#DC2626' }}>*</span>
                      </div>
                      <textarea
                        value={argumentos}
                        onChange={(e) => setArgumentos(e.target.value)}
                        placeholder="Explica los argumentos técnicos, normativos o de hecho por los que cuestionas este hallazgo..."
                        rows={4}
                        style={{
                          width: '100%', padding: '10px 12px', borderRadius: 10,
                          border: '1px solid #D1D5DB', fontSize: 13, color: '#1F2937',
                          outline: 'none', resize: 'vertical', fontFamily: 'inherit',
                          background: 'white',
                        }}
                      />

                      <div style={{ marginTop: 12 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8 }}>
                          Documento de soporte <span style={{ color: '#DC2626' }}>*</span>
                          <span style={{ color: '#9CA3AF', fontWeight: 400, marginLeft: 6 }}>
                            (obligatorio según procedimiento)
                          </span>
                        </div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          hidden
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleSeleccionarDoc(f);
                          }}
                        />
                        {documento ? (
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '10px 14px', borderRadius: 10,
                            background: 'white',
                            border: `1px solid ${documentoSubido ? '#A7F3D0' : '#BFDBFE'}`,
                          }}>
                            {subiendoDoc
                              ? <Loader2 style={{ width: 14, height: 14, color: '#1D4ED8', animation: 'spin 1s linear infinite' }} />
                              : documentoSubido
                                ? <CheckCircle2 style={{ width: 14, height: 14, color: '#047857' }} />
                                : <Paperclip style={{ width: 14, height: 14, color: '#1D4ED8' }} />}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: '#1F2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {documento.name}
                              </div>
                              <div style={{ fontSize: 11, color: subiendoDoc ? '#1D4ED8' : documentoSubido ? '#047857' : '#6B7280' }}>
                                {subiendoDoc
                                  ? 'Subiendo...'
                                  : documentoSubido
                                    ? `${(documento.size / 1024).toFixed(0)} KB · cargado al expediente`
                                    : `${(documento.size / 1024).toFixed(0)} KB`}
                              </div>
                            </div>
                            {!subiendoDoc && (
                              <button
                                onClick={() => { setDocumento(null); setDocumentoSubido(null); }}
                                aria-label="Quitar documento"
                                style={{
                                  width: 28, height: 28, borderRadius: 8, border: 'none',
                                  background: '#F3F4F6', color: '#6B7280', cursor: 'pointer',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}
                              >
                                <XCircle style={{ width: 14, height: 14 }} />
                              </button>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                              height: 40, padding: '0 14px', borderRadius: 10,
                              border: '1px dashed #93C5FD', background: 'white',
                              color: '#1D4ED8', fontSize: 13, fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex', alignItems: 'center', gap: 8,
                            }}
                          >
                            <Upload style={{ width: 14, height: 14 }} />
                            Adjuntar evidencia (PDF, Word, Excel, imagen)
                          </button>
                        )}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
                        <button
                          onClick={() => { setShowControversiaForm(false); setArgumentos(''); setDocumento(null); setDocumentoSubido(null); }}
                          style={{
                            height: 38, padding: '0 16px', borderRadius: 10,
                            border: '1px solid #E5E7EB', background: 'white',
                            color: '#6B7280', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                          }}
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleEnviarControversia}
                          disabled={submitting || subiendoDoc || !argumentos.trim() || !documentoSubido}
                          title={
                            !argumentos.trim() ? 'Escribe los argumentos'
                            : !documentoSubido ? 'Adjunta y sube el documento de soporte'
                            : ''
                          }
                          style={{
                            height: 38, padding: '0 18px', borderRadius: 10, border: 'none',
                            background: (submitting || subiendoDoc || !argumentos.trim() || !documentoSubido) ? '#9CA3AF' : colors.brand,
                            color: 'white', fontSize: 13, fontWeight: 600,
                            cursor: (submitting || subiendoDoc || !argumentos.trim() || !documentoSubido) ? 'not-allowed' : 'pointer',
                            display: 'inline-flex', alignItems: 'center', gap: 8,
                            boxShadow: '0 2px 8px rgba(0,61,165,0.18)',
                          }}
                        >
                          {submitting
                            ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />
                            : <Send style={{ width: 14, height: 14 }} />}
                          Enviar controversia
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DetalleHallazgoCampos({ hallazgo }: { hallazgo: HallazgoItem }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <CampoBloque
        icon={<FileText style={{ width: 14, height: 14, color: '#2563EB' }} />}
        accent="#2563EB"
        label="Descripción"
        value={hallazgo.descripcion}
      />
      {hallazgo.criterioIncumplido && (
        <CampoBloque
          icon={<Scale style={{ width: 14, height: 14, color: '#7C3AED' }} />}
          accent="#7C3AED"
          label="Criterio incumplido"
          value={hallazgo.criterioIncumplido}
        />
      )}
      {hallazgo.causas && hallazgo.causas.length > 0 && (
        <CampoLista
          icon={<AlertTriangle style={{ width: 14, height: 14, color: '#D97706' }} />}
          accent="#D97706"
          label="Causas identificadas"
          items={hallazgo.causas}
        />
      )}
      {hallazgo.efectos && hallazgo.efectos.length > 0 && (
        <CampoLista
          icon={<AlertCircle style={{ width: 14, height: 14, color: '#DC2626' }} />}
          accent="#DC2626"
          label="Efectos y consecuencias"
          items={hallazgo.efectos}
        />
      )}
      {hallazgo.recomendaciones && hallazgo.recomendaciones.length > 0 && (
        <CampoLista
          icon={<Lightbulb style={{ width: 14, height: 14, color: '#059669' }} />}
          accent="#059669"
          label="Recomendaciones del auditor"
          items={hallazgo.recomendaciones}
        />
      )}
    </div>
  );
}

function CampoBloque({ label, value, icon, accent }: { label: string; value: string; icon?: React.ReactNode; accent?: string }) {
  return (
    <div style={{
      display: 'flex', borderRadius: 10, overflow: 'hidden',
      background: '#FAFAFA', border: '1px solid #F3F4F6',
    }}>
      <div style={{ width: 4, background: accent || '#D1D5DB', flexShrink: 0 }} />
      <div style={{ padding: '10px 14px', flex: 1 }}>
        <div style={{
          fontSize: 11, fontWeight: 700, color: accent || '#6B7280',
          marginBottom: 5, display: 'flex', alignItems: 'center', gap: 6,
        }}>
          {icon}
          {label}
        </div>
        <div style={{ fontSize: 13, color: '#1F2937', lineHeight: 1.6 }}>{value}</div>
      </div>
    </div>
  );
}

function CampoLista({ label, items, icon, accent }: { label: string; items: string[]; icon?: React.ReactNode; accent?: string }) {
  return (
    <div style={{
      display: 'flex', borderRadius: 10, overflow: 'hidden',
      background: '#FAFAFA', border: '1px solid #F3F4F6',
    }}>
      <div style={{ width: 4, background: accent || '#D1D5DB', flexShrink: 0 }} />
      <div style={{ padding: '10px 14px', flex: 1 }}>
        <div style={{
          fontSize: 11, fontWeight: 700, color: accent || '#6B7280',
          marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6,
        }}>
          {icon}
          {label}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {items.map((it, i) => (
            <div key={i} style={{
              fontSize: 13, color: '#374151', lineHeight: 1.5,
              display: 'flex', alignItems: 'flex-start', gap: 8,
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: accent || '#D1D5DB',
                marginTop: 7, flexShrink: 0,
              }} />
              {it}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB: DOCUMENTOS  (expediente)
// ════════════════════════════════════════════════════════════════════════════

function TabDocumentos({
  documentos, readOnly, onSubir, onSubirNuevo,
}: {
  documentos: DocumentoItem[];
  readOnly: boolean;
  onSubir: (id: string, file: File) => void;
  onSubirNuevo: (file: File) => void;
}) {
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});
  const newFileInputRef = useRef<HTMLInputElement>(null);

  // Separar lo que envió el equipo auditor de lo que sube el auditado
  const delAuditor = documentos.filter((d) => d.origen === 'auditor');
  const delAuditado = documentos.filter((d) => d.origen !== 'auditor');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Documentos del equipo auditor */}
      {delAuditor.length > 0 && (
        <SeccionDocumentos
          titulo="Enviados por el equipo auditor"
          subtitulo="Informe preliminar, oficios y comunicaciones oficiales del proceso"
          documentos={delAuditor}
          inputs={inputs}
          readOnly
          onSubir={() => {}}
        />
      )}

      {/* Documentos del auditado (solicitados + extras) */}
      <SeccionDocumentos
        titulo="Tu expediente"
        subtitulo="Documentos solicitados al área auditada y soportes adicionales"
        documentos={delAuditado}
        inputs={inputs}
        readOnly={readOnly}
        onSubir={onSubir}
      />

      {/* Subir documento adicional libre */}
      {!readOnly && (
        <div style={{ background: 'white', borderRadius: 14, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <input
            ref={newFileInputRef}
            type="file"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onSubirNuevo(f);
              if (newFileInputRef.current) newFileInputRef.current.value = '';
            }}
          />
          <button
            onClick={() => newFileInputRef.current?.click()}
            style={{
              width: '100%', height: 48, borderRadius: 10,
              border: '1px dashed #93C5FD', background: '#EFF6FF',
              color: '#1D4ED8', fontSize: 13, fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <Upload style={{ width: 16, height: 16 }} />
            Subir un documento adicional al expediente
          </button>
        </div>
      )}
    </div>
  );
}

function SeccionDocumentos({
  titulo, subtitulo, documentos, inputs, readOnly, onSubir,
}: {
  titulo: string;
  subtitulo: string;
  documentos: DocumentoItem[];
  inputs: React.MutableRefObject<Record<string, HTMLInputElement | null>>;
  readOnly: boolean;
  onSubir: (id: string, file: File) => void;
}) {
  if (documentos.length === 0) return null;

  return (
    <div style={{ background: 'white', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #F3F4F6' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1F2937' }}>{titulo}</div>
        <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{subtitulo}</div>
      </div>
      {documentos.map((d, idx) => {
        const col = DOC_ESTADO_COLOR[d.estado];
        const requiereSubir = d.estado === 'Solicitado';
        return (
          <div
            key={d.id}
            style={{
              padding: '14px 20px',
              borderBottom: idx === documentos.length - 1 ? 'none' : '1px solid #F3F4F6',
              display: 'flex', alignItems: 'center', gap: 14,
            }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: '#F3F4F6', color: '#6B7280',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Paperclip style={{ width: 16, height: 16 }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1F2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {d.nombre}
              </div>
              <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
                {d.fechaSubida ? `Subido ${d.fechaSubida}` : 'Pendiente de carga'}
                {d.tamano ? ` · ${d.tamano}` : ''}
                {d.tipo ? ` · ${d.tipo}` : ''}
              </div>
            </div>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 6,
              color: col.color, background: col.bg,
            }}>
              {d.estado}
            </span>
            {!readOnly && requiereSubir ? (
              <>
                <input
                  ref={(el) => { inputs.current[d.id] = el; }}
                  type="file"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onSubir(d.id, f);
                    if (inputs.current[d.id]) inputs.current[d.id]!.value = '';
                  }}
                />
                <button
                  onClick={() => inputs.current[d.id]?.click()}
                  style={{
                    height: 32, padding: '0 12px', borderRadius: 8, border: 'none',
                    background: colors.brand, color: 'white',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <Upload style={{ width: 12, height: 12 }} />
                  Subir
                </button>
              </>
            ) : d.fechaSubida ? (
              <button
                onClick={() => toast.info('Vista previa no disponible (mock)')}
                style={{
                  height: 32, padding: '0 12px', borderRadius: 8,
                  border: '1px solid #E5E7EB', background: 'white',
                  fontSize: 12, fontWeight: 600, color: '#6B7280', cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                }}
              >
                <Eye style={{ width: 12, height: 12 }} />
                Ver
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
