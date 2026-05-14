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
 *                     -> Plazo: 10 días hábiles para responder cada hallazgo.
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
} from 'lucide-react';
import { toast } from 'sonner';
import { colors } from '../../esap/shared/designTokens';
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
const PLAZO_RESPUESTA_DIAS_HABILES = 10;

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
  // Etapa "Comunicación": 10 días hábiles desde la Notificación.
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
  | 'notificado'
  | 'aceptado'
  | 'en-controversia'
  | 'ratificado'
  | 'modificado'
  | 'retirado'
  | 'cerrado';

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
  documentoControversiaNombre?: string;
  documentoControversiaUrl?: string;
  fechaPresentacion?: string;
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
    // de 10 días hábiles para responder hallazgos.
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
  const estadoRaw = String(raw.estado ?? 'notificado').toLowerCase().replace('_', '-') as EstadoHallazgo;
  const estado: EstadoHallazgo = (
    ['notificado','aceptado','en-controversia','ratificado','modificado','retirado','cerrado'] as const
  ).includes(estadoRaw as any) ? estadoRaw : 'notificado';
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
    documentoControversiaNombre: raw.documentoControversiaNombre ?? undefined,
    documentoControversiaUrl: raw.documentoControversiaUrl ?? undefined,
    fechaPresentacion: fechaCO(raw.fechaPresentacionControversia ?? raw.fechaAceptacion ?? raw.updatedAt) || undefined,
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
    if (lista.length === 0) {
      // El usuario no figura como responsable de área en ninguna auditoría
      // notificada. Mostramos el mock para mantener UX en demo, pero idealmente
      // este caso debería mostrar un estado vacío explícito.
      return AUDITORIAS_MOCK;
    }
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

const DOC_ESTADO_COLOR: Record<DocumentoItem['estado'], { color: string; bg: string }> = {
  'Aprobado':    { color: '#047857', bg: '#ECFDF5' },
  'Pendiente':   { color: '#B45309', bg: '#FFFBEB' },
  'Rechazado':   { color: '#DC2626', bg: '#FEF2F2' },
  'Solicitado':  { color: '#6B7280', bg: '#F3F4F6' },
};

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

export function MisAuditoriasControlInterno({ personaId, userName, onBack }: MisAuditoriasControlInternoProps) {
  const [auditorias, setAuditorias] = useState<AuditoriaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState<'todos' | EstadoAuditoria>('todos');
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
            Control Interno de Gestión
          </div>
          <div style={{ fontSize: 13, color: '#9CA3AF', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Shield style={{ width: 13, height: 13 }} />
            Mis auditorías y hallazgos
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
        <StatCard label="Total"          value={stats.total}        bg="#EFF6FF" color="#1D4ED8" icon={<ClipboardList style={{ width: 16, height: 16 }} />} />
        <StatCard label="En Respuesta"   value={stats.enRespuesta}  bg="#FFFBEB" color="#B45309" icon={<AlertCircle    style={{ width: 16, height: 16 }} />} />
        <StatCard label="Docs por subir" value={stats.pendientes}   bg="#FEF2F2" color="#DC2626" icon={<Upload         style={{ width: 16, height: 16 }} />} />
        <StatCard label="Finalizadas"    value={stats.finalizadas}  bg="#ECFDF5" color="#047857" icon={<CheckCircle2   style={{ width: 16, height: 16 }} />} />
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

      {/* Lista */}
      <div style={{ background: 'white', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '48px 0', textAlign: 'center' }}>
            <Loader2 style={{ width: 28, height: 28, color: colors.brand, margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
            <div style={{ fontSize: 14, color: '#6B7280' }}>Cargando auditorías...</div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : filtradas.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <ClipboardList style={{ width: 24, height: 24, color: '#9CA3AF' }} />
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#374151' }}>Sin auditorías</div>
            <div style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>
              {search || filtroEstado !== 'todos'
                ? 'No hay resultados que coincidan con los filtros aplicados.'
                : 'Aún no tienes procesos de auditoría asignados.'}
            </div>
          </div>
        ) : (
          <div>
            {filtradas.map((a, idx) => (
              <AuditoriaRow
                key={a.id}
                auditoria={a}
                isLast={idx === filtradas.length - 1}
                onClick={() => setSeleccionada(a)}
              />
            ))}
          </div>
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

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', textAlign: 'left',
        padding: '18px 20px',
        background: 'white',
        border: 'none',
        borderBottom: isLast ? 'none' : '1px solid #F3F4F6',
        cursor: 'pointer', transition: 'background 0.15s',
        display: 'flex', alignItems: 'center', gap: 16,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = '#FAFAFA')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
    >
      <div style={{ width: 4, height: 56, borderRadius: 4, background: urgencia.color, flexShrink: 0 }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 600, letterSpacing: 0.3 }}>
            {auditoria.codigo}
          </span>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
            color: estado.color, background: estado.bg, border: `1px solid ${estado.border}`,
          }}>
            {auditoria.estado}
          </span>
          <span style={{ fontSize: 11, color: '#9CA3AF' }}>•</span>
          <span style={{ fontSize: 11, color: '#6B7280' }}>{auditoria.tipo}</span>
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#1F2937', marginBottom: 6 }}>
          {auditoria.titulo}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 12, color: '#6B7280', flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <User style={{ width: 12, height: 12 }} />
            {auditoria.auditorLider}
          </span>
          {plazo && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Calendar style={{ width: 12, height: 12 }} />
              Vence {formatearFechaCO(plazo.fechaLimite)}
            </span>
          )}
          {auditoria.hallazgos > 0 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#D97706' }}>
              <AlertCircle style={{ width: 12, height: 12 }} />
              {auditoria.hallazgos} hallazgo{auditoria.hallazgos === 1 ? '' : 's'}
            </span>
          )}
          {docPorSubir > 0 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#B45309' }}>
              <Upload style={{ width: 12, height: 12 }} />
              {docPorSubir} doc{docPorSubir === 1 ? '' : 's'} pendientes
            </span>
          )}
        </div>

        {auditoria.documentosSolicitados > 0 && (
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, height: 6, borderRadius: 3, background: '#F3F4F6', overflow: 'hidden' }}>
              <div style={{
                width: `${progreso}%`, height: '100%',
                background: progreso === 100 ? '#10B981' : '#3B82F6',
                transition: 'width 0.4s ease',
              }} />
            </div>
            <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 600, minWidth: 36, textAlign: 'right' }}>
              {progreso}%
            </span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
        {plazo && auditoria.estado !== 'Finalizada' && (
          <span style={{
            fontSize: 11, fontWeight: 700,
            color: isOverdue ? '#DC2626' : '#1F2937',
          }}>
            {isOverdue
              ? 'Plazo vencido'
              : `${plazo.diasHabilesRestantes} día${plazo.diasHabilesRestantes === 1 ? '' : 's'} hábil${plazo.diasHabilesRestantes === 1 ? '' : 'es'}`}
          </span>
        )}
        <ChevronRight style={{ width: 18, height: 18, color: '#9CA3AF' }} />
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

/** Planes y acciones del auditado (GET/PATCH bajo /auditorias/auditado/...). */
function TabPlanMejoramientoAuditado({
  auditoriaId,
  readOnly,
  hallazgos,
}: {
  auditoriaId: string;
  readOnly: boolean;
  /** Lista de hallazgos de la auditoría, para vincular cada acción a un hallazgo. */
  hallazgos: Array<{ id: string; codigo: string; titulo: string; estado: string }>;
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
  }>>({});
  const [savingNew, setSavingNew] = useState<string | null>(null);

  // Usuarios del sistema para el select de responsable — cargados del auth-service
  const [usuarios, setUsuarios] = useState<Array<{ id: string; nombre: string; email: string }>>([]);
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

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await controlInternoService.getPlanesMejoramientoAuditado(auditoriaId);
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
    if (!window.confirm('¿Eliminar esta evidencia?')) return;
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
      });
      toast.success('Acción creada exitosamente');
      setShowNewAccion((prev) => ({ ...prev, [planId]: false }));
      setNewAccionDraft((prev) => ({ ...prev, [planId]: { descripcion: '', responsable: '', fechaInicio: '', fechaFin: '', indicador: '', metaIndicador: '', hallazgoId: '' } }));
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
    if (!confirm('¿Eliminar esta acción correctiva? Esta acción no se puede deshacer.')) return;
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
  };

  const enviarARevision = async (planId: string) => {
    if (!confirm('¿Enviar el plan a revisión por parte de la OCI? Una vez enviado, no podrás agregar más acciones hasta que sea aprobado o devuelto.')) return;
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
  };

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
      <div style={{ background: 'white', borderRadius: 14, padding: 28, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', textAlign: 'center' }}>
        <ClipboardList style={{ width: 36, height: 36, color: '#9CA3AF', margin: '0 auto 12px' }} />
        <div style={{ fontSize: 15, fontWeight: 700, color: '#374151' }}>Sin plan de mejoramiento aún</div>
        <div style={{ fontSize: 13, color: '#6B7280', marginTop: 8, lineHeight: 1.55 }}>
          Cuando el área de Control Interno registre el plan vinculado a esta auditoría, aparecerá aquí
          con las acciones correctivas. Mientras tanto puedes seguir el plazo de formulación en la pestaña Información.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {planes.map((plan) => {
        const estadoPlan = String(plan.estado || '').toLowerCase();
        const enFormulacion = estadoPlan === 'borrador';
        const enRevision = estadoPlan === 'revision';
        const enEjecucion = ['aprobado', 'en_ejecucion', 'en-ejecucion'].includes(estadoPlan);
        const planCerrado = ['completado', 'vencido', 'rechazado'].includes(estadoPlan);

        // Colores según estado del plan
        const estadoColor = (enFormulacion || enRevision)
          ? { bg: '#FFFBEB', border: '#FDE68A', color: '#B45309', label: enRevision ? 'En revisión OCI' : 'En formulación' }
          : enEjecucion
          ? { bg: '#ECFDF5', border: '#A7F3D0', color: '#047857', label: estadoPlan === 'aprobado' ? 'Aprobado — En ejecución' : 'En ejecución' }
          : planCerrado && estadoPlan === 'rechazado'
          ? { bg: '#FEF2F2', border: '#FECACA', color: '#B91C1C', label: 'Rechazado' }
          : { bg: '#ECFDF5', border: '#A7F3D0', color: '#047857', label: 'Completado' };

        return (
          <div
            key={plan.id}
            style={{
              background: 'white', borderRadius: 14, padding: 20,
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
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

            {/* ── Banners de fase ─────────────────────────────────── */}
            {estadoPlan === 'rechazado' && (
              <div style={{
                background: 'linear-gradient(135deg, #FEF2F2 0%, #FFF5F5 100%)',
                border: '1.5px solid #F87171', borderRadius: 12, padding: '14px 16px', marginBottom: 14,
                display: 'flex', gap: 14, alignItems: 'flex-start',
              }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><XCircle style={{ width: 20, height: 20, color: '#DC2626' }} /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#7F1D1D', marginBottom: 4 }}>Plan rechazado por la OCI</div>
                  {plan.motivoRechazo || plan.observaciones ? (
                    <div style={{ fontSize: 12, color: '#991B1B', lineHeight: 1.6 }}>
                      <strong>Motivo:</strong> {plan.motivoRechazo || plan.observaciones}
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: '#991B1B' }}>Consulta con tu área de Control Interno para obtener más información.</div>
                  )}
                  <div style={{ marginTop: 8, fontSize: 11, color: '#B91C1C', fontWeight: 600 }}>
                    ↩️ Puedes crear un nuevo plan corrigiendo los puntos observados.
                  </div>
                </div>
              </div>
            )}
            {enFormulacion && (
              <div style={{
                background: 'linear-gradient(135deg, #FFFBEB 0%, #FEFCE8 100%)',
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
                background: 'linear-gradient(135deg, #EFF6FF 0%, #F0F9FF 100%)',
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
                background: 'linear-gradient(135deg, #ECFDF5 0%, #F0FDF4 100%)',
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
                background: 'linear-gradient(135deg, #F0FDF4 0%, #ECFDF5 100%)',
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
                {plan.acciones.map((accion: any) => {
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
                    <div
                      key={accion.id}
                      style={{ border: '1px solid #E5E7EB', borderRadius: 10, padding: 14, background: '#FAFAFA' }}
                    >
                      {/* Cabecera acción */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#1F2937', lineHeight: 1.4, flex: 1 }}>
                          {accion.descripcion || 'Acción correctiva'}
                        </div>
                        {(() => {
                          const badge = getAccionBadge(accion.estado || 'programada');
                          return (
                            <span style={{
                              fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20,
                              marginLeft: 10, flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 4,
                              background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`,
                            }}>
                              {badge.icon} {badge.label}
                            </span>
                          );
                        })()}
                      </div>

                      {/* Meta info: responsable, fechas, hallazgo */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10, fontSize: 11, color: '#6B7280' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><User2 style={{ width: 11, height: 11 }} /> <strong>{accion.responsable}</strong></span>
                        {accion.fechaInicio && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><CalendarDays style={{ width: 11, height: 11 }} /> {accion.fechaInicio} → {accion.fechaFin}</span>}
                        {hallazgoVinculado && (
                          <span style={{ background: '#FEF3C7', color: '#92400E', padding: '1px 6px', borderRadius: 4, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            <Link2 style={{ width: 11, height: 11 }} /> {hallazgoVinculado.codigo}: {hallazgoVinculado.titulo?.substring(0, 40)}{hallazgoVinculado.titulo?.length > 40 ? '…' : ''}
                          </span>
                        )}
                        {accion.indicador && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><BarChart3 style={{ width: 11, height: 11 }} /> {accion.indicador}</span>}
                      </div>

                      {/* Barra de progreso visual */}
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6B7280', marginBottom: 4 }}>
                          <span>Avance</span><span>{dr.porcentaje}%</span>
                        </div>
                        <div style={{ height: 6, background: '#E5E7EB', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${dr.porcentaje}%`, background: dr.porcentaje === 100 ? '#10B981' : colors.brand, borderRadius: 3, transition: 'width 0.3s' }} />
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>

                          {/* Fila: % Avance + Observaciones en horizontal */}
                          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                            <label style={{ fontSize: 11, color: '#6B7280', display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                              % Avance
                              <input type="number" min={0} max={100} disabled={ocupado}
                                value={dr.porcentaje}
                                onChange={(e) => setDraft(accion.id, { porcentaje: Number(e.target.value) })}
                                style={{ height: 28, width: 68, borderRadius: 6, border: '1px solid #D1D5DB', padding: '0 6px', fontSize: 12 }} />
                            </label>
                            <label style={{ fontSize: 11, color: '#6B7280', display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
                              Observaciones
                              <textarea disabled={ocupado} value={dr.obs}
                                onChange={(e) => setDraft(accion.id, { obs: e.target.value })}
                                rows={2}
                                style={{ borderRadius: 6, border: '1px solid #D1D5DB', padding: '4px 7px', fontSize: 12, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.4 }} />
                            </label>
                          </div>

                          {/* Evidencias */}
                          <div style={{ border: '1px solid #E5E7EB', borderRadius: 7, background: '#F9FAFB', overflow: 'hidden' }}>
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

                            {/* Botón guardar */}
                            <button type="button" disabled={ocupado}
                              onClick={() => void guardarAccion(plan.id, accion.id)}
                              style={{ padding: '5px 14px', borderRadius: 6, border: 'none', background: colors.brand, color: 'white', fontSize: 11, fontWeight: 600, cursor: ocupado ? 'wait' : 'pointer', opacity: ocupado ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 5, marginLeft: 'auto' }}>
                              {subiendoEste ? <><Loader2 style={{ width: 11, height: 11, animation: 'spin 1s linear infinite' }} /> Subiendo…</> :
                               guardandoEste ? <><Loader2 style={{ width: 11, height: 11, animation: 'spin 1s linear infinite' }} /> Guardando…</> :
                               'Guardar avance'}
                            </button>
                          </div>

                        </div>
                        );
                      })()}

                    </div>
                  );
                })}
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
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1F2937', marginBottom: 4 }}>Nueva acción correctiva</div>

                    {/* Vincular a hallazgo */}
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

                    <label style={{ fontSize: 11, color: '#6B7280', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      Descripción <span style={{ color: '#DC2626' }}>*</span>
                      <textarea rows={2} placeholder="Describe la acción que se ejecutará para subsanar el hallazgo..."
                        value={newAccionDraft[plan.id]?.descripcion ?? ''}
                        onChange={(e) => setNewAccionDraft((prev) => ({ ...prev, [plan.id]: { ...prev[plan.id], descripcion: e.target.value } }))}
                        style={{ borderRadius: 8, border: '1px solid #D1D5DB', padding: 8, fontSize: 13, resize: 'vertical', fontFamily: 'inherit' }} />
                    </label>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <label style={{ fontSize: 11, color: '#6B7280', display: 'flex', flexDirection: 'column', gap: 4 }}>
                        Responsable <span style={{ color: '#DC2626' }}>*</span>
                        <div style={{ position: 'relative' }}>
                          <input type="text"
                            placeholder={usuarios.length ? 'Buscar persona del sistema...' : 'Nombre del responsable'}
                            value={busquedaResponsable[plan.id] ?? newAccionDraft[plan.id]?.responsable ?? ''}
                            onChange={(e) => {
                              const v = e.target.value;
                              setBusquedaResponsable((prev) => ({ ...prev, [plan.id]: v }));
                              setNewAccionDraft((prev) => ({ ...prev, [plan.id]: { ...prev[plan.id], responsable: v } }));
                            }}
                            style={{ height: 34, borderRadius: 8, border: '1px solid #D1D5DB', padding: '0 8px', fontSize: 13, width: '100%', boxSizing: 'border-box' }} />
                          {/* Dropdown de sugerencias */}
                          {usuarios.length > 0 && (busquedaResponsable[plan.id] || '').length >= 1 && (() => {
                            const q = (busquedaResponsable[plan.id] || '').toLowerCase();
                            const sugs = usuarios.filter((u) => u.nombre.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)).slice(0, 6);
                            if (!sugs.length) return null;
                            return (
                              <div style={{ position: 'absolute', top: 36, left: 0, right: 0, background: 'white', border: '1px solid #E5E7EB', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 50, maxHeight: 180, overflowY: 'auto' }}>
                                {sugs.map((u) => (
                                  <button key={u.id} type="button"
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      setNewAccionDraft((prev) => ({ ...prev, [plan.id]: { ...prev[plan.id], responsable: u.nombre } }));
                                      setBusquedaResponsable((prev) => ({ ...prev, [plan.id]: u.nombre }));
                                    }}
                                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 10px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12, borderBottom: '1px solid #F3F4F6' }}>
                                    <strong>{u.nombre}</strong>
                                    <span style={{ color: '#9CA3AF', marginLeft: 6 }}>{u.email}</span>
                                  </button>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                      </label>
                      <label style={{ fontSize: 11, color: '#6B7280', display: 'flex', flexDirection: 'column', gap: 4 }}>
                        Indicador de cumplimiento
                        <input type="text" placeholder="Ej: % de documentos foliados"
                          value={newAccionDraft[plan.id]?.indicador ?? ''}
                          onChange={(e) => setNewAccionDraft((prev) => ({ ...prev, [plan.id]: { ...prev[plan.id], indicador: e.target.value } }))}
                          style={{ height: 34, borderRadius: 8, border: '1px solid #D1D5DB', padding: '0 8px', fontSize: 13 }} />
                      </label>
                      <label style={{ fontSize: 11, color: '#6B7280', display: 'flex', flexDirection: 'column', gap: 4 }}>
                        Fecha inicio <span style={{ color: '#DC2626' }}>*</span>
                        <input type="date" value={newAccionDraft[plan.id]?.fechaInicio ?? ''}
                          onChange={(e) => setNewAccionDraft((prev) => ({ ...prev, [plan.id]: { ...prev[plan.id], fechaInicio: e.target.value } }))}
                          style={{ height: 34, borderRadius: 8, border: '1px solid #D1D5DB', padding: '0 8px', fontSize: 13 }} />
                      </label>
                      <label style={{ fontSize: 11, color: '#6B7280', display: 'flex', flexDirection: 'column', gap: 4 }}>
                        Fecha fin (compromiso) <span style={{ color: '#DC2626' }}>*</span>
                        <input type="date" value={newAccionDraft[plan.id]?.fechaFin ?? ''}
                          onChange={(e) => setNewAccionDraft((prev) => ({ ...prev, [plan.id]: { ...prev[plan.id], fechaFin: e.target.value } }))}
                          style={{ height: 34, borderRadius: 8, border: '1px solid #D1D5DB', padding: '0 8px', fontSize: 13 }} />
                      </label>
                      <label style={{ fontSize: 11, color: '#6B7280', display: 'flex', flexDirection: 'column', gap: 4, gridColumn: '1 / -1' }}>
                        Meta del indicador
                        <input type="text" placeholder="Ej: Lograr el 100% de documentos foliados al 30/06/2026"
                          value={newAccionDraft[plan.id]?.metaIndicador ?? ''}
                          onChange={(e) => setNewAccionDraft((prev) => ({ ...prev, [plan.id]: { ...prev[plan.id], metaIndicador: e.target.value } }))}
                          style={{ height: 34, borderRadius: 8, border: '1px solid #D1D5DB', padding: '0 8px', fontSize: 13 }} />
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
            {/* Botón Enviar a revisión: solo en BORRADOR (no en revision, ya fue enviado) */}
            {!readOnly && estadoPlan === 'borrador' && (
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
    </div>
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
      controlInternoService.getPlanesMejoramientoAuditado(auditoriaInicial.id).catch(() => []),
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

      {/* Tabs */}
      <div style={{
        background: 'white', borderRadius: 14, padding: 4,
        marginBottom: 16, display: 'flex', gap: 2,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
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
            <TabPlanMejoramientoAuditado auditoriaId={auditoria.id} readOnly={isReadOnly} hallazgos={hallazgos} />
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
        flex: 1, height: 38, borderRadius: 10, border: 'none',
        background: active ? colors.brand : 'transparent',
        color: active ? 'white' : '#6B7280',
        fontSize: 12, fontWeight: active ? 600 : 500, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        transition: 'all 0.15s',
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
    <div style={{ background: 'white', borderRadius: 14, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.6, marginBottom: 20 }}>
        {auditoria.descripcion}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
        <InfoField label="Auditor líder"    value={auditoria.auditorLider} />
        <InfoField label="Área auditada"    value={auditoria.area} />
        <InfoField label="Tipo"             value={auditoria.tipo} />
        <InfoField label="Notificada"       value={auditoria.fechaNotificacion} />
        {plazo && <InfoField label={plazo.etapa} value={plazoTexto} />}
        {auditoria.informeFinalGenerado && (
          <InfoField label="Informe Final" value={auditoria.fechaInformeFinal || 'Generado'} />
        )}
        <InfoField label="Hallazgos"        value={String(auditoria.hallazgos)} />
        <InfoField label="Docs solicitados" value={String(auditoria.documentosSolicitados)} />
        <InfoField label="Docs subidos"     value={String(auditoria.documentosSubidos)} />
      </div>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 14, color: '#1F2937', fontWeight: 500 }}>{value}</div>
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
  // Construye mapa rápido hallazgoId -> {plan, acciones[]}
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

  if (hallazgos.length === 0) {
    return (
      <div style={{ background: 'white', borderRadius: 14, padding: 48, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <CheckCircle2 style={{ width: 32, height: 32, color: '#10B981', margin: '0 auto 12px' }} />
        <div style={{ fontSize: 15, fontWeight: 700, color: '#374151' }}>Sin hallazgos</div>
        <div style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>Esta auditoría no presenta hallazgos por responder.</div>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {plazoVencido && (
        <div style={{
          padding: 14, borderRadius: 12,
          background: '#FEF2F2', border: '1px solid #FECACA',
          display: 'flex', alignItems: 'flex-start', gap: 10,
        }}>
          <AlertTriangle style={{ width: 18, height: 18, color: '#DC2626', flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 13, color: '#7F1D1D', lineHeight: 1.5 }}>
            <strong>El plazo de 10 días hábiles para responder los hallazgos venció.</strong>{' '}
            Los hallazgos sin respuesta podrán ser ratificados por el equipo auditor sin
            controversia, según el procedimiento de Control Interno.
          </div>
        </div>
      )}
      {hallazgos.map((h) => {
        const vinculado = accionesPorHallazgo.get(h.id);
        return (
          <div key={h.id}>
            <HallazgoCard
              hallazgo={h}
              readOnly={readOnly || plazoVencido}
              onAceptar={onAceptar}
              onSubirDocumentoControversia={onSubirDocumentoControversia}
              onPresentarControversia={onPresentarControversia}
            />
            {/* Acciones del plan de mejoramiento vinculadas a este hallazgo */}
            {vinculado && vinculado.acciones.length > 0 && (
              <div style={{ margin: '4px 0 0 16px', borderLeft: '3px solid #E5E7EB', paddingLeft: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', marginBottom: 6, letterSpacing: 0.3 }}>
                  PLAN {vinculado.plan.codigo} — {vinculado.acciones.length} acción(es) correctiva(s)
                </div>
                {vinculado.acciones.map((accion: any) => (
                  <div key={accion.id} style={{ background: '#F8FAFF', border: '1px solid #E0E7FF', borderRadius: 8, padding: '8px 12px', marginBottom: 6, fontSize: 12 }}>
                    <div style={{ fontWeight: 600, color: '#1F2937', marginBottom: 3 }}>{accion.descripcion}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, color: '#6B7280', fontSize: 11 }}>
                      <span>👤 {accion.responsable}</span>
                      {accion.fechaInicio && <span>📅 {accion.fechaInicio} → {accion.fechaFin}</span>}
                      <span style={{
                        padding: '1px 7px', borderRadius: 4, fontWeight: 600, fontSize: 10,
                        background: accion.estado === 'completada' ? '#ECFDF5' : accion.estado === 'en-progreso' ? '#EFF6FF' : '#F3F4F6',
                        color: accion.estado === 'completada' ? '#047857' : accion.estado === 'en-progreso' ? '#1D4ED8' : '#4B5563',
                      }}>
                        {accion.estado || 'programada'}
                      </span>
                      {accion.porcentajeAvance != null && (
                        <span style={{ color: '#374151' }}>▶ {accion.porcentajeAvance}% avance</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
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
  hallazgo, readOnly, onAceptar, onSubirDocumentoControversia, onPresentarControversia,
}: {
  hallazgo: HallazgoItem;
  readOnly: boolean;
  onAceptar: (id: string) => Promise<void>;
  onSubirDocumentoControversia: (file: File, hallazgoId: string) => Promise<{ documentoId: string; nombre: string }>;
  onPresentarControversia: (id: string, argumentos: string, documentoId: string, documentoNombre: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(hallazgo.estado === 'notificado');
  const [showControversiaForm, setShowControversiaForm] = useState(false);
  const [argumentos, setArgumentos] = useState('');
  const [documento, setDocumento] = useState<File | null>(null);
  /** Resultado del paso 1: subida del documento. Necesario para poder enviar el paso 2. */
  const [documentoSubido, setDocumentoSubido] = useState<{ documentoId: string; nombre: string } | null>(null);
  const [subiendoDoc, setSubiendoDoc] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const estadoCol = ESTADO_HALLAZGO[hallazgo.estado];
  const puedeResponder = !readOnly && hallazgo.estado === 'notificado';

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
    <div style={{ background: 'white', borderRadius: 14, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
        <div style={{
          minWidth: 6, alignSelf: 'stretch', borderRadius: 4,
          background: GRAVEDAD_COLOR[hallazgo.gravedad],
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', letterSpacing: 0.3 }}>
              {hallazgo.codigo}
            </span>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
              color: estadoCol.color, background: estadoCol.bg,
            }}>
              {estadoCol.label}
            </span>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
              color: GRAVEDAD_COLOR[hallazgo.gravedad],
              background: `${GRAVEDAD_COLOR[hallazgo.gravedad]}12`,
            }}>
              {hallazgo.gravedad}
            </span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1F2937' }}>{hallazgo.titulo}</div>
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          style={{
            border: 'none', background: 'transparent', cursor: 'pointer',
            color: '#6B7280', fontSize: 12, fontWeight: 600,
          }}
        >
          {expanded ? 'Ocultar' : 'Ver detalle'}
        </button>
      </div>

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
            <div style={{ paddingLeft: 18, marginTop: 6 }}>
              <DetalleHallazgoCampos hallazgo={hallazgo} />

              {/* Respuesta del auditado (si ya la presentó) */}
              {(hallazgo.argumentosControversia || hallazgo.documentoControversiaNombre) && (
                <div style={{
                  marginTop: 14, padding: 14, borderRadius: 10,
                  background: '#EFF6FF', border: '1px solid #BFDBFE',
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#1D4ED8', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Scale style={{ width: 12, height: 12 }} />
                    Tu controversia {hallazgo.fechaPresentacion ? `· ${hallazgo.fechaPresentacion}` : ''}
                  </div>
                  {hallazgo.argumentosControversia && (
                    <div style={{ fontSize: 13, color: '#1F2937', lineHeight: 1.5, marginBottom: hallazgo.documentoControversiaNombre ? 8 : 0 }}>
                      {hallazgo.argumentosControversia}
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

              {/* Acciones del auditado: solo si está en 'notificado' */}
              {puedeResponder && !showControversiaForm && (
                <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    onClick={handleAceptar}
                    disabled={submitting}
                    style={{
                      height: 38, padding: '0 16px', borderRadius: 10, border: 'none',
                      background: submitting ? '#9CA3AF' : '#047857',
                      color: 'white', fontSize: 13, fontWeight: 600,
                      cursor: submitting ? 'wait' : 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      boxShadow: '0 2px 8px rgba(4,120,87,0.18)',
                    }}
                  >
                    <ThumbsUp style={{ width: 14, height: 14 }} />
                    Aceptar hallazgo
                  </button>
                  <button
                    onClick={() => setShowControversiaForm(true)}
                    disabled={submitting}
                    style={{
                      height: 38, padding: '0 16px', borderRadius: 10,
                      border: '1px solid #1D4ED8', background: 'white',
                      color: '#1D4ED8', fontSize: 13, fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                    }}
                  >
                    <Scale style={{ width: 14, height: 14 }} />
                    Presentar controversia
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <CampoBloque label="Descripción" value={hallazgo.descripcion} />
      {hallazgo.criterioIncumplido && (
        <CampoBloque label="Criterio incumplido" value={hallazgo.criterioIncumplido} />
      )}
      {hallazgo.causas && hallazgo.causas.length > 0 && (
        <CampoLista label="Causas identificadas" items={hallazgo.causas} />
      )}
      {hallazgo.efectos && hallazgo.efectos.length > 0 && (
        <CampoLista label="Efectos / consecuencias" items={hallazgo.efectos} />
      )}
      {hallazgo.recomendaciones && hallazgo.recomendaciones.length > 0 && (
        <CampoLista label="Recomendaciones del auditor" items={hallazgo.recomendaciones} />
      )}
    </div>
  );
}

function CampoBloque({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.55 }}>{value}</div>
    </div>
  );
}

function CampoLista({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>
        {label}
      </div>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: '#374151', lineHeight: 1.55 }}>
        {items.map((it, i) => <li key={i}>{it}</li>)}
      </ul>
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
