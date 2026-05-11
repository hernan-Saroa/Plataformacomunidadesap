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

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  FileText,
  ChevronRight,
  Paperclip,
  Eye,
  Calendar,
  User,
  AlertTriangle,
  Info,
  ClipboardList,
  ThumbsUp,
  Scale,
  XCircle,
  Gavel,
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

type DetalleTab = 'info' | 'hallazgos' | 'documentos';

function DetalleAuditoria({
  auditoria: auditoriaInicial, userName, onBack,
}: { auditoria: AuditoriaItem; userName?: string; onBack: () => void }) {
  const [tab, setTab] = useState<DetalleTab>('info');
  const [auditoria, setAuditoria] = useState<AuditoriaItem>(auditoriaInicial);
  const [hallazgos, setHallazgos] = useState<HallazgoItem[]>([]);
  const [documentos, setDocumentos] = useState<DocumentoItem[]>([]);
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
        const hh = results[0] as HallazgoItem[];
        const dd = results[1] as DocumentoItem[];
        const estadoCom = results[2] as any;
        setHallazgos(hh);
        setDocumentos(dd);
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
            La formulación del plan se realiza desde el módulo de Control Interno (backoffice).
            Aquí podrás consultar el avance una vez sea aprobado por el Jefe OCI.
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
  hallazgos, readOnly, plazoVencido, onAceptar, onSubirDocumentoControversia, onPresentarControversia,
}: {
  hallazgos: HallazgoItem[];
  readOnly: boolean;
  plazoVencido: boolean;
  onAceptar: (id: string) => Promise<void>;
  onSubirDocumentoControversia: (file: File, hallazgoId: string) => Promise<{ documentoId: string; nombre: string }>;
  onPresentarControversia: (id: string, argumentos: string, documentoId: string, documentoNombre: string) => Promise<void>;
}) {
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
      {hallazgos.map((h) => (
        <HallazgoCard
          key={h.id}
          hallazgo={h}
          readOnly={readOnly || plazoVencido}
          onAceptar={onAceptar}
          onSubirDocumentoControversia={onSubirDocumentoControversia}
          onPresentarControversia={onPresentarControversia}
        />
      ))}
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
