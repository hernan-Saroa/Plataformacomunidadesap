/**
 * ═══════════════════════════════════════════════════════════════
 * MODAL DETALLES DE NOTICIA — World Class
 * ═══════════════════════════════════════════════════════════════
 * 
 * Modal completo que muestra TODOS los datos ingresados durante
 * la creación de una noticia disciplinaria, incluyendo:
 * - Datos básicos (origen, territorial, fechas, conducta)
 * - Múltiples denunciados con apoderados
 * - Múltiples denunciantes con apoderados
 * - Hechos separados
 * - Archivos adjuntos
 * - Proceso asociado
 * 
 * Patrón canónico: createPortal, z-[200], rgba overlay
 * ═══════════════════════════════════════════════════════════════
 */

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import {
  X, FileText, User, AlertTriangle, ClipboardList, Calendar,
  MapPin, Building2, Paperclip, FileEdit, PlusCircle,
  CheckCircle, Phone, Mail, Briefcase,
  Scale, Clock, FileWarning, Download, Eye, Users, Gavel, Loader2, History
} from 'lucide-react';
import { authService } from '../../../services/api/authService';
import { disciplinaryService } from '../../../services/api/disciplinary.service';
import { Permissions } from '@esap-mfe/shared-types/permissions';
import * as mammoth from 'mammoth';

// ═══════════════════════════════════════════════════════════════
// TIPOS (extendidos para datos completos de creación)
// ═══════════════════════════════════════════════════════════════

interface Apoderado {
  nombre: string;
  cedula: string;
  correo?: string;
  celular?: string;
  email?: string;
  telefono?: string;
  direccion?: string;
}

interface DenunciadoCompleto {
  id: string;
  nombre: string;
  identificacion: string;
  cargo: string;
  lugarHechos: string;
  apoderado?: Apoderado;
}

interface DenuncianteCompleto {
  id: string;
  nombre: string;
  identificacion: string;
  direccion: string;
  telefono: string;
  correo: string;
  cargo: string;
  entidad: string;
  tipo: 'Denunciante' | 'Víctima';
  apoderado?: Apoderado;
}

interface HechoSeparado {
  id: string;
  descripcion: string;
  fecha?: string;
}

interface ArchivoAdjunto {
  nombre: string;
  tipo: string;
  tamano: number;
  fechaSubida: string;
  url: string;
  fullUrl?: string;
  seccion?: 'autos' | 'actas_evidencias' | 'soportes_queja';
  categoria?: string;
  subtitulo?: string;
  esRemision?: boolean;
  numeroAuto?: string;
  tipoAutoDetalle?: string;
  estadoAuto?: string;
  contenidoHtml?: string;
}

export interface NoticiaCompleta {
  id: string;
  numero: string;
  fechaRecepcion: string;
  fechaQueja?: string;
  origen: string;
  denunciante: any;
  denunciado: any;
  hechos: string;
  estado: string;
  prioridad: 'alta' | 'media' | 'baja';
  diasPendientes: number;
  tipo: 'noticia';
  procesoAsociado?: {
    id: string;
    numeroProceso: string;
    fechaAsociacion?: string;
    justificacion?: string;
    autos?: any[];
    evidence?: any[];
    pruebas?: any[];
  };
  // Campos extendidos de creación y remisión
  numeroRC?: string;
  entidadRemision?: string;
  descripcionRemision?: any;
  adjuntos?: any;
  soporteRadicadoUrl?: string;
  autos?: any[];
  evidencias?: any[];
  territorial?: string;
  fechaHechos?: string;
  cargo?: string;
  dependencia?: string;
  dependenciaDenunciado?: string;
  conductaSeleccionada?: string;
  conductaPersonalizada?: string;
  conducta?: string;
  conductas?: string[];
  disciplinable?: any;
  disciplinables?: any;
  denunciados?: DenunciadoCompleto[];
  denunciantes?: DenuncianteCompleto[];
  hechosSeparados?: HechoSeparado[];
  archivosAdjuntos?: ArchivoAdjunto[];
  radicador?: string;
  fechaRegistro?: string;
  createdAt?: string;
}

// ✅ Helpers para compilar todos los archivos del expediente (Autos, Actas, Evidencias, Soportes de Queja)
const limpiarNombreArchivo = (nombre?: string | null): string => {
  if (!nombre || typeof nombre !== 'string') return '';
  let limpio = nombre.trim();
  if (limpio.includes('/') || limpio.includes('\\')) {
    const lastPart = limpio.split(/[\/\\]/).pop();
    if (lastPart && lastPart.includes('.')) {
      limpio = lastPart;
    }
  }
  limpio = limpio.replace(/^\d{10,}_(?:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}|[0-9a-fA-F]{32})_/, '');
  limpio = limpio.replace(/^(?:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}|[0-9a-fA-F]{32})_/, '');
  limpio = limpio.replace(/^\d{10,14}_/, '');
  return limpio;
};

const extraerFilename = (p: string): string => {
  if (!p) return '';
  const clean = p.replace(/\\/g, '/');
  return clean.split('/').pop() || clean;
};

const inferirMimeType = (filename: string): string => {
  const ext = (filename || '').split('.').pop()?.toLowerCase() || '';
  if (ext === 'pdf') return 'application/pdf';
  if (['docx', 'doc'].includes(ext)) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (['xlsx', 'xls'].includes(ext)) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return `image/${ext === 'jpg' ? 'jpeg' : ext}`;
  if (['mp4', 'webm', 'ogg', 'mov'].includes(ext)) return 'video/mp4';
  if (['mp3', 'wav'].includes(ext)) return 'audio/mpeg';
  return 'application/octet-stream';
};

const formatTipoAutoDetallado = (tipoRaw?: string): string => {
  if (!tipoRaw) return 'Auto de Trámite Ordinario';
  const t = tipoRaw.trim().toUpperCase();
  if (t === 'AUTO_REMISION_COMPETENCIA' || t === 'AUTO_REMISION' || t.includes('REMISION') || t.includes('REMISIÓN')) {
    return 'Auto de Remisión por Competencia';
  }
  if (t === 'AUTO_APERTURA_INVESTIGACION_DISCIPLINARIA' || t === 'AUTO_APERTURA_INVESTIGACION') {
    return 'Auto de Apertura de Investigación Disciplinaria';
  }
  if (t === 'AUTO_INDAGACION_PRELIMINAR' || t === 'AUTO_APERTURA_INDAGACION' || t.includes('INDAGACION') || t.includes('INDAGACIÓN')) {
    return 'Auto de Apertura de Indagación Previa';
  }
  if (t === 'AUTO_FORMULACION_PLIEGO' || t === 'PLIEGO_CARGOS' || t.includes('PLIEGO')) {
    return 'Auto de Formulación de Pliego de Cargos';
  }
  if (t === 'AUTO_ARCHIVO' || t === 'AUTO_ARCHIVO_DEFINITIVO' || t.includes('ARCHIVO')) {
    return 'Auto de Archivo Definitivo';
  }
  if (t === 'AUTO_PRORROGA' || t.includes('PRORROGA') || t.includes('PRÓRROGA')) {
    return 'Auto de Prórroga';
  }
  if (t === 'AUTO_INHIBITORIO' || t.includes('INHIBITORIO')) {
    return 'Auto Inhibitorio';
  }
  if (t === 'AUTO_CIERRE' || t.includes('CIERRE')) {
    return 'Auto de Cierre de Investigación';
  }
  if (t === 'AUTO_NORMAL') {
    return 'Auto de Trámite Ordinario';
  }
  return t.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
};

interface DossierSections {
  autos: ArchivoAdjunto[];
  actasYEvidencias: ArchivoAdjunto[];
  soportesQueja: ArchivoAdjunto[];
  todos: ArchivoAdjunto[];
}

const compileDossier = (n: NoticiaCompleta): DossierSections => {
  const autos: ArchivoAdjunto[] = [];
  const actasYEvidencias: ArchivoAdjunto[] = [];
  const soportesQueja: ArchivoAdjunto[] = [];
  const seenUrls = new Set<string>();

  // Parsear descripción remisión si viene como string
  let descRem: any = n.descripcionRemision;
  if (typeof descRem === 'string' && descRem.trim()) {
    try {
      descRem = JSON.parse(descRem);
    } catch {
      descRem = null;
    }
  }

  // 1. AUTOS JURÍDICOS (incluido Auto de Remisión por Competencia)
  const rawAutos: any[] = [
    ...(n.procesoAsociado?.autos || []),
    ...(Array.isArray(descRem?.autos) ? descRem.autos : []),
    ...(Array.isArray(n.autos) ? n.autos : [])
  ];

  rawAutos.forEach((a, idx) => {
    if (!a) return;

    const tipoRaw = a.tipoAuto || a.tipo || a.autoType || '';
    const esRemision = tipoRaw === 'AUTO_REMISION_COMPETENCIA' ||
      tipoRaw === 'AUTO_REMISION' ||
      tipoRaw.toLowerCase().includes('remisi') ||
      Boolean(a.remisionAprobada);

    const tipoAutoFormateado = formatTipoAutoDetallado(tipoRaw || (esRemision ? 'AUTO_REMISION_COMPETENCIA' : 'AUTO_NORMAL'));
    const numeroAuto = a.numero || a.autoNumber || (typeof a.nombre === 'string' && a.nombre.match(/AUTO-\d+/i) ? a.nombre.match(/AUTO-\d+/i)[0] : '');

    // Resolver el nombre de archivo sin caer en /preview ficticio
    let fileBase = '';
    const rawCandidate = a.firmaUrl || a.documentUrl || a.finalPdfPath || a.filePath || a.docxFilePath || a.url || '';
    if (rawCandidate && typeof rawCandidate === 'string' && !rawCandidate.toLowerCase().endsWith('/preview') && rawCandidate.toLowerCase() !== 'preview') {
      fileBase = extraerFilename(rawCandidate);
    }

    if (!fileBase || fileBase.toLowerCase() === 'preview') {
      if (a.documentName && typeof a.documentName === 'string' && a.documentName.toLowerCase() !== 'preview') {
        fileBase = a.documentName;
      } else if (numeroAuto) {
        fileBase = `${numeroAuto.trim()}.pdf`;
      } else if (a.id) {
        fileBase = `Auto_${tipoRaw || 'Juridico'}_${a.id}.pdf`;
      }
    }

    const directUrl = fileBase ? `/files/${encodeURIComponent(fileBase)}` : '';
    const urlKey = directUrl || `auto-${a.id || idx}`;
    if (seenUrls.has(urlKey)) return;
    seenUrls.add(urlKey);

    // Título explícito que especifica Auto Jurídico y el Tipo de Auto
    const displayName = numeroAuto
      ? `Auto Jurídico ${numeroAuto} — ${tipoAutoFormateado}`
      : `Auto Jurídico — ${tipoAutoFormateado}`;

    const estadoAuto = a.estado ? String(a.estado).toUpperCase() : 'APROBADO';
    const subtituloPartes = [
      `Tipo: ${tipoAutoFormateado}`,
      `Estado: ${estadoAuto}`
    ];
    if (a.entidadDestino || descRem?.entidadDestino || n.entidadRemision) {
      subtituloPartes.push(`Destino: ${a.entidadDestino || descRem?.entidadDestino || n.entidadRemision}`);
    }
    if (a.stage || a.etapa) {
      subtituloPartes.push(`Etapa: ${a.stage || a.etapa}`);
    }

    const tipoMime = inferirMimeType(fileBase || a.documentName || 'auto.pdf');

    autos.push({
      nombre: displayName,
      tipo: tipoMime,
      tamano: Number(a.tamano || a.fileSize || 0),
      fechaSubida: a.createdAt || a.fecha || n.createdAt || '',
      url: directUrl,
      fullUrl: directUrl,
      seccion: 'autos',
      categoria: 'Auto Jurídico',
      subtitulo: subtituloPartes.join(' · '),
      esRemision,
      numeroAuto: numeroAuto || undefined,
      tipoAutoDetalle: tipoAutoFormateado,
      estadoAuto,
      contenidoHtml: a.contenido || a.contenidoHtml || undefined,
    });
  });

  // 2. ACTAS, OFICIOS Y EVIDENCIAS DEL PROCESO
  const rawEvidencias: any[] = [
    ...(n.procesoAsociado?.evidence || []),
    ...(Array.isArray(descRem?.actasYEvidencias) ? descRem.actasYEvidencias : []),
    ...(Array.isArray(n.evidencias) ? n.evidencias : []),
    ...(n.procesoAsociado?.pruebas || [])
  ];

  rawEvidencias.forEach((e, idx) => {
    if (!e) return;
    const rawFile = e.fileUrl || e.filePath || e.fileName || e.originalName || e.url || '';
    const fileBase = extraerFilename(rawFile);
    const directUrl = fileBase ? `/files/${encodeURIComponent(fileBase)}` : (typeof rawFile === 'string' && rawFile.startsWith('http') ? rawFile : '');
    const urlKey = directUrl || `evid-${e.id || idx}`;
    if (seenUrls.has(urlKey)) return;
    seenUrls.add(urlKey);

    const nombre = limpiarNombreArchivo(e.originalName || e.fileName || e.nombre || `Documento ${idx + 1}`);
    const tipo = e.fileType || e.tipo || inferirMimeType(nombre);

    actasYEvidencias.push({
      nombre,
      tipo,
      tamano: Number(e.fileSize || e.tamano || 0),
      fechaSubida: e.createdAt || e.fechaSubida || '',
      url: directUrl,
      fullUrl: directUrl,
      seccion: 'actas_evidencias',
      categoria: e.category || e.categoria || 'Acta / Evidencia',
      subtitulo: e.description || e.descripcion || e.category || 'Evidencia del proceso'
    });
  });

  // 3. SOPORTES INICIALES DE LA QUEJA
  if (Array.isArray(n.archivosAdjuntos)) {
    n.archivosAdjuntos.forEach((adj, idx) => {
      if (!adj) return;
      const directUrl = adj.url || adj.fullUrl || '';
      const urlKey = directUrl || `soporte-${idx}`;
      if (seenUrls.has(urlKey)) return;
      seenUrls.add(urlKey);

      soportesQueja.push({
        ...adj,
        nombre: limpiarNombreArchivo(adj.nombre),
        seccion: 'soportes_queja',
        categoria: 'Soporte de Queja',
        subtitulo: 'Anexo presentado con la noticia disciplinaria'
      });
    });
  }

  let rawAdjuntosArray: any[] = [];
  if (Array.isArray(n.adjuntos)) {
    rawAdjuntosArray = n.adjuntos;
  } else if (typeof n.adjuntos === 'string' && n.adjuntos.trim()) {
    try {
      const parsed = JSON.parse(n.adjuntos);
      if (Array.isArray(parsed)) rawAdjuntosArray = parsed;
    } catch {
      rawAdjuntosArray = [n.adjuntos];
    }
  }

  rawAdjuntosArray.forEach((item, idx) => {
    if (!item) return;
    const strPath = typeof item === 'string' ? item : (item.url || item.filePath || item.fileName || item.nombre || '');
    const fileBase = extraerFilename(strPath);
    if (!fileBase) return;
    const directUrl = `/files/${encodeURIComponent(fileBase)}`;
    if (seenUrls.has(directUrl)) return;
    seenUrls.add(directUrl);

    const nombre = limpiarNombreArchivo(typeof item === 'object' ? (item.nombre || item.name || fileBase) : fileBase);
    soportesQueja.push({
      nombre,
      tipo: (typeof item === 'object' && item.tipo) ? item.tipo : inferirMimeType(nombre),
      tamano: typeof item === 'object' ? Number(item.tamano || item.size || 0) : 0,
      fechaSubida: (typeof item === 'object' && item.fechaSubida) ? item.fechaSubida : (n.fechaRegistro || n.createdAt || ''),
      url: directUrl,
      fullUrl: directUrl,
      seccion: 'soportes_queja',
      categoria: 'Soporte de Queja',
      subtitulo: 'Anexo presentado con la noticia disciplinaria'
    });
  });

  if (n.soporteRadicadoUrl) {
    const fileBase = extraerFilename(n.soporteRadicadoUrl);
    const directUrl = fileBase ? `/files/${encodeURIComponent(fileBase)}` : n.soporteRadicadoUrl;
    if (!seenUrls.has(directUrl)) {
      seenUrls.add(directUrl);
      soportesQueja.push({
        nombre: 'Soporte Oficial de Radicación.pdf',
        tipo: 'application/pdf',
        tamano: 0,
        fechaSubida: n.fechaRecepcion || n.fechaRegistro || '',
        url: directUrl,
        fullUrl: directUrl,
        seccion: 'soportes_queja',
        categoria: 'Soporte de Radicación',
        subtitulo: 'Comprobante de radicado oficial'
      });
    }
  }

  return {
    autos,
    actasYEvidencias,
    soportesQueja,
    todos: [...autos, ...actasYEvidencias, ...soportesQueja]
  };
};

interface ModalDetallesNoticiaProps {
  noticia: NoticiaCompleta;
  onClose: () => void;
  onEditar: (noticia: NoticiaCompleta) => void;
  onConvertir: (noticia: NoticiaCompleta) => void;
  onDownload?: (url: string, filename: string) => Promise<void>;
}

type TabNoticia = 'general' | 'personas' | 'hechos' | 'adjuntos' | 'actuaciones' | 'historial';

interface ActuacionNoticia {
  id: string;
  tipo: string;
  etapa?: string | null;
  descripcion: string;
  responsableNombre: string;
  fechaActuacion: string;
  observaciones?: string | null;
  createdAt: string;
}

interface HistorialEntry {
  id: string;
  tipo: string;
  usuario: string;
  fecha: string;
  observaciones?: string;
}

const getApoderadoCorreo = (apoderado?: Apoderado) => apoderado?.correo || apoderado?.email || '';
const getApoderadoCelular = (apoderado?: Apoderado) => apoderado?.celular || apoderado?.telefono || '';

const normalizePersona = (d: any): any => {
  if (!d) return null;
  if (typeof d === 'string') return { nombre: d, identificacion: '', cargo: '', lugarHechos: '' };
  return {
    ...d,
    id: d.id || d.cedula || d.identificacion || d.numeroIdentificacion || '',
    nombre: d.nombre || d.name || 'Sin información',
    identificacion: d.identificacion || d.cedula || d.numeroIdentificacion || '',
    cargo: d.cargo || '',
    lugarHechos: d.lugarHechos || d.dependencia || '',
    dependencia: d.dependencia || d.lugarHechos || '',
    correo: d.correo || d.email || '',
    email: d.email || d.correo || '',
    telefono: d.telefono || d.celular || '',
    direccion: d.direccion || '',
    entidad: d.entidad || '',
    tipo: d.tipo || 'Denunciante',
    apoderado: d.apoderado ? {
      ...d.apoderado,
      nombre: d.apoderado.nombre || '',
      cedula: d.apoderado.cedula || d.apoderado.identificacion || '',
      correo: d.apoderado.correo || d.apoderado.email || '',
      email: d.apoderado.email || d.apoderado.correo || '',
      celular: d.apoderado.celular || d.apoderado.telefono || '',
      telefono: d.apoderado.telefono || d.apoderado.celular || '',
      direccion: d.apoderado.direccion || ''
    } : undefined
  };
};

const normalizePersonaList = (rawSingle: any, rawPlural: any): any[] => {
  const source = rawPlural && (Array.isArray(rawPlural) ? rawPlural.length > 0 : true)
    ? rawPlural
    : rawSingle;
  if (!source) return [];
  if (Array.isArray(source)) {
    return source.map(normalizePersona).filter(Boolean);
  }
  if (typeof source === 'object') {
    const norm = normalizePersona(source);
    return norm ? [norm] : [];
  }
  if (typeof source === 'string') {
    try {
      const parsed = JSON.parse(source);
      return normalizePersonaList(parsed, null);
    } catch {
      return [{ nombre: source, identificacion: '', cargo: '', lugarHechos: '' }];
    }
  }
  return [];
};

const ORIGEN_LABELS: Record<string, string> = {
  ANONIMO: 'Anónimo',
  QUEJOSO: 'Quejoso',
  OFICIO: 'De oficio',
  REMISION: 'Remisión por competencia',
  POR_DETERMINAR: 'Por determinar',
  'Anónimo': 'Anónimo',
  'Quejoso': 'Quejoso',
  'Informante': 'Informante',
  'De oficio': 'De oficio',
  'Remisión por competencia': 'Remisión por competencia',
  'Por determinar': 'Por determinar',
};

const formatOrigenLabel = (origen?: string | null): string => {
  if (!origen) return '—';
  const clean = String(origen).trim();
  if (ORIGEN_LABELS[clean]) return ORIGEN_LABELS[clean];
  const s = clean.toUpperCase();
  if (ORIGEN_LABELS[s]) return ORIGEN_LABELS[s];
  const norm = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (norm.includes('REMISI') || norm.includes('COMPETENC')) return 'Remisión por competencia';
  if (norm.includes('ANONIM')) return 'Anónimo';
  if (norm.includes('QUEJ')) return 'Quejoso';
  if (norm.includes('INFORMANT')) return 'Informante';
  if (norm.includes('OFICIO')) return 'De oficio';
  if (norm.includes('DETERMINAR')) return 'Por determinar';
  return clean;
};

// ═══════════════════════════════════════════════════════════════
// UTILIDADES DE FECHA - Parseo local para fechas sin timezone
// ═══════════════════════════════════════════════════════════════

const parseLocalDateTime = (dateString: string): Date | null => {
  if (!dateString) return null;
  // Manejar formato "YYYY-MM-DD HH:MM:SS" como fecha local
  const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}):(\d{2}):(\d{2}))?$/);
  if (match) {
    const [, year, month, day, hour = '0', minute = '0', second = '0'] = match;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute), parseInt(second));
  }
  // Intentar parsear como ISO
  const isoMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(:(\d{2}))?/);
  if (isoMatch) {
    const [, year, month, day, hour, minute, , second = '0'] = isoMatch;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute), parseInt(second));
  }
  return null;
};

const formatFechaLocal = (dateString: string | undefined | null): string => {
  if (!dateString) return '0000';
  const date = parseLocalDateTime(dateString);
  if (!date) return '0000';
  // Formato explícito sin timezone para preservar la fecha exacta
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

// ═══════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════

export function ModalDetallesNoticia({ noticia, onClose, onEditar, onConvertir, onDownload }: ModalDetallesNoticiaProps) {
  const [tabActiva, setTabActiva] = useState<TabNoticia>('general');
  const [viewingFile, setViewingFile] = useState<ArchivoAdjunto | null>(null);
  const [fileBlobUrl, setFileBlobUrl] = useState<string | null>(null);
  const [fullNoticia, setFullNoticia] = useState<any>(null);

  // ✅ Combinar props con datos frescos del backend si están disponibles
  const baseNoticia = noticia || {
    id: '',
    numero: '',
    fechaRecepcion: '',
    origen: '',
    denunciante: null,
    denunciado: null,
    hechos: '',
    estado: 'pendiente',
    prioridad: 'media',
    conducta: '',
    diasPendientes: 0,
    tipo: 'noticia'
  };

  const n = {
    ...baseNoticia,
    ...(fullNoticia || {}),
    // Asegurar que campos clave respeten nombres de frontend y backend
    numero: fullNoticia?.radicado || fullNoticia?.numero || baseNoticia.numero,
    fechaQueja: fullNoticia?.fechaQueja || baseNoticia.fechaQueja,
    fechaRecepcion: fullNoticia?.fechaRecepcion || baseNoticia.fechaRecepcion,
    fechaHechos: fullNoticia?.fechaHechos || baseNoticia.fechaHechos,
    territorial: fullNoticia?.territorial || baseNoticia.territorial,
    dependenciaDenunciado: fullNoticia?.dependenciaDenunciado || (baseNoticia as any).dependenciaDenunciado,
    hechos: fullNoticia?.hechos || baseNoticia.hechos,
    origen: fullNoticia?.origen || baseNoticia.origen,
    denunciante: fullNoticia?.denunciante ?? baseNoticia.denunciante,
    denunciantes: fullNoticia?.denunciantes ?? fullNoticia?.denunciante ?? baseNoticia.denunciantes,
    denunciado: fullNoticia?.disciplinable ?? fullNoticia?.denunciado ?? baseNoticia.denunciado,
    denunciados: fullNoticia?.disciplinables ?? fullNoticia?.disciplinable ?? baseNoticia.denunciados,
    disciplinable: fullNoticia?.disciplinable ?? (baseNoticia as any).disciplinable,
    conductas: fullNoticia?.conductas || baseNoticia.conductas,
    conducta: fullNoticia?.conducta || baseNoticia.conducta,
    numeroRC: fullNoticia?.numeroRC || (baseNoticia as any).numeroRC,
    entidadRemision: fullNoticia?.entidadRemision || (baseNoticia as any).entidadRemision,
    descripcionRemision: fullNoticia?.descripcionRemision || (baseNoticia as any).descripcionRemision,
    procesoAsociado: fullNoticia?.procesoAsociado || (baseNoticia as any).procesoAsociado,
    adjuntos: fullNoticia?.adjuntos || (baseNoticia as any).adjuntos,
    soporteRadicadoUrl: fullNoticia?.soporteRadicadoUrl || (baseNoticia as any).soporteRadicadoUrl,
    autos: fullNoticia?.autos || (baseNoticia as any).autos,
    evidencias: fullNoticia?.evidencias || (baseNoticia as any).evidencias,
  };

  // ✅ Historial de auditoría — se trae aparte porque no viene en el objeto
  // mapeado que usa el Kanban, solo en la respuesta completa del backend.
  const [historial, setHistorial] = useState<HistorialEntry[]>([]);
  const [historialLoading, setHistorialLoading] = useState(false);
  const [historialError, setHistorialError] = useState<string | null>(null);

  useEffect(() => {
    if (!baseNoticia.id) return;
    let cancelled = false;
    setHistorialLoading(true);
    setHistorialError(null);
    disciplinaryService.getNoticiaById(baseNoticia.id)
      .then((data) => {
        if (cancelled) return;
        if (data) {
          setFullNoticia(data);
          setHistorial(data.historialAuditoria || []);
        }
      })
      .catch((error: any) => {
        if (cancelled) return;
        console.error('[ModalDetallesNoticia] Error cargando historial:', error);
        setHistorialError(error?.message || 'No fue posible cargar el historial');
      })
      .finally(() => {
        if (!cancelled) setHistorialLoading(false);
      });
    return () => { cancelled = true; };
  }, [baseNoticia.id]);

  // ✅ EFDS-1562 — Actuaciones registradas contra la noticia (desde radicación).
  const [actuaciones, setActuaciones] = useState<ActuacionNoticia[]>([]);
  const [actuacionesLoading, setActuacionesLoading] = useState(false);
  const [actuacionesError, setActuacionesError] = useState<string | null>(null);
  const [refreshActuaciones, setRefreshActuaciones] = useState(0);

  useEffect(() => {
    if (!n.id) return;
    let cancelled = false;
    setActuacionesLoading(true);
    setActuacionesError(null);
    disciplinaryService.getActuacionesNoticia(n.id)
      .then((data) => {
        if (cancelled) return;
        setActuaciones(Array.isArray(data) ? data : []);
      })
      .catch((error: any) => {
        if (cancelled) return;
        console.error('[ModalDetallesNoticia] Error cargando actuaciones:', error);
        setActuacionesError(error?.message || 'No fue posible cargar las actuaciones');
      })
      .finally(() => {
        if (!cancelled) setActuacionesLoading(false);
      });
    return () => { cancelled = true; };
  }, [n.id, refreshActuaciones]);

  // El registro de actuaciones desde la noticia lo habilita el permiso de crear
  // actuaciones (Radicador y Jefe de la OCID). El backend además lo restringe por
  // rol en el endpoint (@Roles Jefe / Radicador).
  const puedeAgregarActuacion = authService.hasPermission(
    Permissions.CONTROL_DISCIPLINARIO_PROCESOS_ACTUACIONES_CREATE,
  );

  const denunciadosList = normalizePersonaList(n.disciplinable || n.denunciado, n.disciplinables || n.denunciados);
  const denunciantesList = normalizePersonaList(n.denunciante, n.denunciantes);

  // Extraer datos de persona (compatibilidad con formato string, objeto único o array)
  const getDenuncianteNombre = () => {
    return denunciantesList[0]?.nombre || 'Sin información';
  };
  const getDenunciadoNombre = () => {
    return denunciadosList[0]?.nombre || 'Sin información';
  };
  const getDenunciadoId = () => {
    const d = denunciadosList[0];
    if (d?.identificacion) {
      return `${d.tipoIdentificacion || 'CC'}: ${d.identificacion}`;
    }
    return '';
  };
  const getDenuncianteId = () => {
    const d = denunciantesList[0];
    if (d?.identificacion) {
      return `${d.tipoIdentificacion || 'CC'}: ${d.identificacion}`;
    }
    return '';
  };

  const prioridadMeta: Record<string, { bg: string; text: string; border: string; label: string }> = {
    alta:  { bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5', label: 'ALTA' },
    media: { bg: '#FEF3C7', text: '#92400E', border: '#FCD34D', label: 'MEDIA' },
    baja:  { bg: '#D1FAE5', text: '#065F46', border: '#6EE7B7', label: 'BAJA' },
  };
  const prioridadValue = n.prioridad || 'media';
  const pm = prioridadMeta[prioridadValue] || prioridadMeta.media;

  const estadoMeta: Record<string, { bg: string; text: string; label: string }> = {
    'pendiente':      { bg: '#FEF3C7', text: '#92400E', label: 'Pendiente' },
    'en-valoracion':  { bg: '#DBEAFE', text: '#1E40AF', label: 'En Valoración' },
    'asignada':       { bg: '#D1FAE5', text: '#065F46', label: 'Asignada' },
    'archivada':      { bg: '#F3F4F6', text: '#374151', label: 'Archivada' },
    'remitida':       { bg: '#EDE9FE', text: '#7C3AED', label: 'Remitida' },
  };
  const estadoValue = n.estado || 'pendiente';
  const em = estadoMeta[estadoValue] || estadoMeta.pendiente;

  // Conteos para badges en tabs y compilación del dossier completo (Autos, Actas/Evidencias, Queja)
  const cantDenunciados = denunciadosList.length;
  const cantDenunciantes = denunciantesList.length;
  const cantHechos = n.hechosSeparados?.length || (n.hechos ? 1 : 0);
  const dossier = compileDossier(n);
  const cantAdjuntos = dossier.todos.length;

  const tabs: { id: TabNoticia; label: string; icon: any; count?: number }[] = [
    { id: 'general', label: 'General', icon: FileText },
    { id: 'personas', label: 'Personas', icon: Users, count: cantDenunciados + cantDenunciantes },
    { id: 'hechos', label: 'Hechos', icon: ClipboardList, count: cantHechos },
    { id: 'adjuntos', label: 'Adjuntos', icon: Paperclip, count: cantAdjuntos },
    { id: 'actuaciones', label: 'Actuaciones', icon: Gavel, count: actuaciones.length },
    { id: 'historial', label: 'Historial', icon: History, count: historial.length },
  ];

  // Fecha de caducidad (5 años desde fecha de hechos)
  const fechaCaducidad = n.fechaHechos ? (() => {
    const f = parseLocalDateTime(n.fechaHechos);
    if (!f) return null;
    f.setFullYear(f.getFullYear() + 5);
    return f.toISOString().split('T')[0];
  })() : null;

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Modal para ver archivos
  const renderFileViewer = () => {
    if (!viewingFile) return null;

    const { nombre, tipo } = viewingFile;

    if (!fileBlobUrl) {
      return createPortal(
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 flex items-center justify-center"
          style={{
            backgroundColor: 'rgba(0,0,0,0.80)',
            padding: '2vh 2vw',
            zIndex: 10000
          }}
          onClick={(e) => e.target === e.currentTarget && closeFileViewer()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            style={{ width: '90vw', height: '90vh', maxWidth: 1000, maxHeight: '95vh' }}
          >
            <div className="px-4 py-3 flex items-center justify-between border-b border-gray-200">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-bold text-gray-900 truncate">{nombre}</span>
              </div>
              <button
                onClick={closeFileViewer}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden p-4 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-gray-600" />
                <p className="text-sm text-gray-600">Cargando archivo...</p>
              </div>
            </div>
          </motion.div>
        </motion.div>,
        document.body
      );
    }

    return createPortal(
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 flex items-center justify-center"
        style={{
          backgroundColor: 'rgba(0,0,0,0.80)',
          padding: '2vh 2vw',
          zIndex: 10000
        }}
        onClick={(e) => e.target === e.currentTarget && closeFileViewer()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{ width: '90vw', height: '90vh', maxWidth: 1000, maxHeight: '95vh' }}
        >
          <div className="px-4 py-3 flex items-center justify-between border-b border-gray-200">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-bold text-gray-900 truncate">{nombre}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  if (viewingFile) {
                    await handleDownloadFileDirecto(viewingFile);
                  }
                }}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50 transition-colors"
              >
                Descargar
              </button>
              <button
                onClick={closeFileViewer}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden p-4">
{fileBlobUrl && (
            <>
              {tipo.includes('pdf') || (nombre || '').toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={fileBlobUrl}
                  className="w-full h-full border-0"
                  title={`Vista previa de ${nombre}`}
                />
              ) : tipo.includes('image') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(nombre || '') ? (
                <img
                  src={fileBlobUrl}
                  alt={nombre}
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                />
              ) : tipo.includes('video') || /\.(mp4|webm|ogg|mov)$/i.test(nombre || '') ? (
                <video
                  src={fileBlobUrl}
                  controls
                  style={{ maxWidth: '100%', maxHeight: '100%' }}
                />
              ) : (nombre || '').toLowerCase().endsWith('.docx') || (nombre || '').toLowerCase().endsWith('.doc') || tipo.includes('html') || tipo.includes('word') ? (
                <iframe
                  src={fileBlobUrl}
                  className="w-full h-full border-0 bg-white"
                  title={`Vista previa de ${nombre}`}
                  sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <FileText className="w-16 h-16 text-gray-300 mb-4" />
                  <p className="text-lg font-bold text-gray-600 mb-2">No se puede previsualizar este tipo de archivo</p>
                  <p className="text-sm text-gray-500 mb-4">Formato no soportado: {tipo || 'desconocido'}</p>
                  <button
                    onClick={async () => {
                      if (viewingFile) {
                        await handleDownloadFileDirecto(viewingFile);
                      }
                    }}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50 transition-colors"
                  >
                    Descargar
                  </button>
                </div>
              )}
            </>
          )}
          </div>
        </motion.div>
      </motion.div>,
      document.body
    );
  };

  const closeFileViewer = () => {
    if (fileBlobUrl) {
      URL.revokeObjectURL(fileBlobUrl);
    }
    setViewingFile(null);
    setFileBlobUrl(null);
  };

  const handleDownloadFileDirecto = async (archivo: ArchivoAdjunto) => {
    const rawUrl = archivo.url || (archivo as any).fullUrl || '';
    const cleanFilename = archivo.nombre.endsWith('.pdf') || archivo.nombre.endsWith('.html') || archivo.nombre.endsWith('.docx')
      ? archivo.nombre
      : `${archivo.nombre}.pdf`;

    // 1. Probar onDownload si existe y la URL no contiene 'preview' ficticio
    if (onDownload && rawUrl && !rawUrl.toLowerCase().includes('/preview') && rawUrl.toLowerCase() !== 'preview') {
      try {
        await onDownload(rawUrl, cleanFilename);
        return;
      } catch (err) {
        console.warn('[ModalDetallesNoticia] onDownload falló, usando descarga directa de fallback:', err);
      }
    }

    // 2. Probar fetch directo de la URL
    try {
      if (rawUrl && !rawUrl.toLowerCase().includes('/preview') && rawUrl.toLowerCase() !== 'preview') {
        const absoluteUrl = disciplinaryService.getAbsoluteFileUrl(rawUrl);
        const res = await fetch(absoluteUrl, { credentials: 'include' });
        if (res.ok) {
          const blob = await res.blob();
          const blobUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = cleanFilename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(blobUrl);
          return;
        }
      }

      // 3. Fallback a contenido HTML si el archivo físico no estuvo disponible
      if (archivo.contenidoHtml) {
        const docHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>${archivo.nombre}</title>
            <style>
              body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; line-height: 1.6; color: #111; max-width: 850px; margin: 0 auto; background: #fff; }
              .header { text-align: center; border-bottom: 2px solid #001A6E; padding-bottom: 12px; margin-bottom: 24px; }
              .header h2 { margin: 0; color: #001A6E; font-size: 16px; font-weight: 800; }
              .header p { margin: 4px 0 0; color: #555; font-size: 13px; font-weight: 600; }
              .content { font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA - ESAP</h2>
              <p>OFICINA DE CONTROL DISCIPLINARIO INTERNO</p>
            </div>
            <div class="content">
              ${archivo.contenidoHtml}
            </div>
          </body>
          </html>
        `;
        const blob = new Blob([docHtml], { type: 'text/html;charset=utf-8' });
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = cleanFilename.replace(/\.pdf$/i, '.html');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
        return;
      }
    } catch (err) {
      console.error('[ModalDetallesNoticia] Error descargando archivo:', err);
      if (rawUrl && !rawUrl.toLowerCase().includes('/preview')) {
        window.open(disciplinaryService.getAbsoluteFileUrl(rawUrl), '_blank');
      }
    }
  };

  const handleViewFile = async (archivo: ArchivoAdjunto) => {
    setViewingFile(archivo);
    setFileBlobUrl(null);
    try {
      const rawUrl = archivo.url || (archivo as any).fullUrl || '';

      // Si la URL es inválida o /preview ficticio y hay contenidoHtml disponible, mostrarlo inmediatamente
      if ((!rawUrl || rawUrl.toLowerCase().includes('/preview') || rawUrl.toLowerCase() === 'preview') && archivo.contenidoHtml) {
        const docHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: 'Segoe UI', Arial, sans-serif; padding: 25px; line-height: 1.6; color: #111; max-width: 850px; margin: 0 auto; background: #fff; }
              .header { text-align: center; border-bottom: 2px solid #001A6E; padding-bottom: 12px; margin-bottom: 24px; }
              .header h2 { margin: 0; color: #001A6E; font-size: 16px; font-weight: 800; }
              .header p { margin: 4px 0 0; color: #555; font-size: 13px; font-weight: 600; }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA - ESAP</h2>
              <p>OFICINA DE CONTROL DISCIPLINARIO INTERNO · EXPEDIENTE OFICIAL</p>
            </div>
            ${archivo.contenidoHtml}
          </body>
          </html>
        `;
        const htmlBlob = new Blob([docHtml], { type: 'text/html;charset=utf-8' });
        const blobUrl = URL.createObjectURL(htmlBlob);
        setFileBlobUrl(blobUrl);
        return;
      }

      if (rawUrl && !rawUrl.toLowerCase().includes('/preview') && rawUrl.toLowerCase() !== 'preview') {
        const absoluteUrl = disciplinaryService.getAbsoluteFileUrl(rawUrl);
        const response = await fetch(absoluteUrl, {
          credentials: 'include',
        });
        if (response.ok) {
          let blob = await response.blob();
          const tipo = archivo.tipo || '';

          // Soporte para previsualización de DOCX igual que evidencias (usando mammoth)
          const isDocx = (archivo.nombre || '').toLowerCase().endsWith('.docx') || tipo.includes('word') || tipo.includes('docx');
          if (isDocx) {
            try {
              const arrayBuffer = await blob.arrayBuffer();
              const result = await mammoth.convertToHtml({ arrayBuffer });
              const htmlContent = result.value;
              const docxHtml = `
                <div style="font-family: Arial, sans-serif; padding: 20px; background: white; min-height: 100vh;">
                  <style>
                    .docx-content { max-width: 800px; margin: 0 auto; }
                    .docx-content p { margin-bottom: 10px; line-height: 1.5; }
                    .docx-content h1, .docx-content h2, .docx-content h3 { margin-top: 20px; margin-bottom: 10px; }
                    .docx-content ul, .docx-content ol { margin-left: 20px; }
                    .docx-content table { border-collapse: collapse; width: 100%; margin: 10px 0; }
                    .docx-content td, .docx-content th { border: 1px solid #ddd; padding: 8px; }
                    .docx-content th { background-color: #f5f5f5; }
                  </style>
                  <div class="docx-content">
                    ${htmlContent}
                  </div>
                </div>
              `;
              blob = new Blob([docxHtml], { type: 'text/html' });
            } catch (convErr) {
              console.error('Error convirtiendo DOCX para preview en noticia:', convErr);
            }
          } else {
            // Asignar tipo MIME explícito para PDFs e imágenes
            const isPdf = tipo.includes('pdf') || (archivo.nombre || '').toLowerCase().endsWith('.pdf');
            const isImage = tipo.includes('image') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(archivo.nombre || '');
            if (isPdf && blob.type !== 'application/pdf') {
              blob = blob.slice(0, blob.size, 'application/pdf');
            } else if (isImage && blob.type.startsWith('application/')) {
              const ext = (archivo.nombre || '').split('.').pop()?.toLowerCase() || '';
              const mimeMap: Record<string, string> = {
                jpg: 'image/jpeg',
                jpeg: 'image/jpeg',
                png: 'image/png',
                gif: 'image/gif',
                webp: 'image/webp',
                svg: 'image/svg+xml'
              };
              blob = blob.slice(0, blob.size, mimeMap[ext] || 'image/png');
            }
          }

          const blobUrl = URL.createObjectURL(blob);
          setFileBlobUrl(blobUrl);
          return;
        }
      }

      // Si fetch no fue ok pero tenemos contenidoHtml, fallback limpio
      if (archivo.contenidoHtml) {
        const docHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: 'Segoe UI', Arial, sans-serif; padding: 25px; line-height: 1.6; color: #111; max-width: 850px; margin: 0 auto; background: #fff; }
              .header { text-align: center; border-bottom: 2px solid #001A6E; padding-bottom: 12px; margin-bottom: 24px; }
              .header h2 { margin: 0; color: #001A6E; font-size: 16px; font-weight: 800; }
              .header p { margin: 4px 0 0; color: #555; font-size: 13px; font-weight: 600; }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA - ESAP</h2>
              <p>OFICINA DE CONTROL DISCIPLINARIO INTERNO · EXPEDIENTE OFICIAL</p>
            </div>
            ${archivo.contenidoHtml}
          </body>
          </html>
        `;
        const htmlBlob = new Blob([docHtml], { type: 'text/html;charset=utf-8' });
        const blobUrl = URL.createObjectURL(htmlBlob);
        setFileBlobUrl(blobUrl);
        return;
      }

      throw new Error('Failed to load file');
    } catch (error) {
      console.error('Error loading file:', error);
      closeFileViewer();
    }
  };

  return (
    <>
      {renderFileViewer()}
      {createPortal(
        <motion.div
          key="noticia-detalles-wc-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 flex items-center justify-center"
          style={{
            backgroundColor: 'rgba(0,0,0,0.60)',
            padding: '4vh 4vw',
            zIndex: 9998
          }}
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 12 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ width: '92vw', height: '88vh', maxWidth: 720, maxHeight: '95vh', minHeight: 'min(480px, 80vh)' }}
      >
        {/* ── Header ── */}
        <div
          className="px-5 py-3 flex items-center justify-between flex-shrink-0 border-b border-gray-200"
          style={{ background: 'linear-gradient(135deg, #001A6E 0%, #003DA5 100%)' }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-white/10">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-black text-white">{n.numero}</span>
                <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase"
                  style={{ backgroundColor: em.bg, color: em.text }}>
                  {em.label}
                </span>
                <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase border"
                  style={{ backgroundColor: pm.bg, color: pm.text, borderColor: pm.border }}>
                  {pm.label}
                </span>
              </div>
              <p className="text-[11px] text-blue-200 mt-0.5 truncate">
                {formatOrigenLabel(n.origen)} · {getDenunciadoNombre()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0 ml-2"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* ── Tabs ── */}
        <div className="flex items-center gap-1 px-6 py-2 border-b border-gray-200 bg-gray-50 flex-shrink-0 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setTabActiva(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                tabActiva === tab.id
                  ? 'text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
              style={tabActiva === tab.id ? { backgroundColor: '#003DA5' } : {}}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`px-1.5 py-0.5 text-[10px] rounded-full font-bold ${
                  tabActiva === tab.id ? 'bg-white/20 text-white' : 'bg-gray-300 text-gray-700'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Contenido ── */}
        <div className="flex-1 overflow-y-auto p-5 min-h-0">
          {tabActiva === 'general' && (
            <TabGeneral
              n={n}
              pm={pm}
              em={em}
              fechaCaducidad={fechaCaducidad}
              cantAdjuntos={cantAdjuntos}
              getDenuncianteNombre={getDenuncianteNombre}
              getDenunciadoNombre={getDenunciadoNombre}
              getDenuncianteId={getDenuncianteId}
              getDenunciadoId={getDenunciadoId}
              onVerAdjuntos={() => setTabActiva('adjuntos')}
            />
          )}
          {tabActiva === 'personas' && (
            <TabPersonas
              n={n}
              getDenuncianteNombre={getDenuncianteNombre}
              getDenunciadoNombre={getDenunciadoNombre}
              getDenuncianteId={getDenuncianteId}
              getDenunciadoId={getDenunciadoId}
            />
          )}
          {tabActiva === 'hechos' && <TabHechos n={n} />}
           {tabActiva === 'adjuntos' && (
             <TabAdjuntos
               n={n}
               dossier={dossier}
               formatFileSize={formatFileSize}
               onDownload={onDownload}
               onDownloadFileDirecto={handleDownloadFileDirecto}
               onView={handleViewFile}
             />
           )}
           {tabActiva === 'actuaciones' && (
             <TabActuaciones
               noticiaId={n.id}
               actuaciones={actuaciones}
               loading={actuacionesLoading}
               error={actuacionesError}
               puedeAgregar={puedeAgregarActuacion}
               onCreada={() => setRefreshActuaciones((v) => v + 1)}
             />
           )}
           {tabActiva === 'historial' && <TabHistorial historial={historial} loading={historialLoading} error={historialError} />}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-5 py-2.5 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 transition-all"
            >
              <X className="w-3.5 h-3.5" />
              Cerrar
            </button>
<span className="text-[10px] text-gray-400">
               Radicado {formatFechaLocal(n.fechaRegistro) || formatFechaLocal(n.fechaRecepcion)}
               {n.radicador && ` por ${n.radicador}`}
             </span>
          </div>
          <div className="flex items-center gap-2">
            {authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_NOTICIAS_DISCIPLINARIAS_EDIT) && !(n.numeroRC || n.entidadRemision || n.estado === 'remitida' || n.estado === 'archivada' || n.estado === 'archivado') && (
              <button
                onClick={() => { onClose(); onEditar(n); }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg border text-gray-700 hover:bg-gray-100 transition-all"
                style={{ borderColor: '#003DA5', color: '#003DA5' }}
              >
                <FileEdit className="w-3.5 h-3.5" />
                Editar
              </button>
            )}
            {authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_PROCESOS_CONVERTIR) && !(n.numeroRC || n.entidadRemision || n.estado === 'remitida' || n.estado === 'archivada' || n.estado === 'archivado') && (
              <button
                onClick={() => { onClose(); onConvertir(n); }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg text-white transition-all hover:opacity-90"
                style={{ backgroundColor: '#003DA5' }}
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Convertir a Proceso
              </button>
            )}
          </div>
        </div>
        </motion.div>
      </motion.div>,
      document.body
    )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB: GENERAL
// ═══════════════════════════════════════════════════════════════

function TabGeneral({
  n, pm, em, fechaCaducidad,
  cantAdjuntos,
  getDenuncianteNombre, getDenunciadoNombre, getDenuncianteId, getDenunciadoId,
  onVerAdjuntos
}: {
  n: NoticiaCompleta;
  pm: any; em: any;
  fechaCaducidad: string | null;
  cantAdjuntos: number;
  getDenuncianteNombre: () => string;
  getDenunciadoNombre: () => string;
  getDenuncianteId: () => string;
  getDenunciadoId: () => string;
  onVerAdjuntos?: () => void;
}) {


  // Preparar datos de personas para mostrar al inicio
  const denunciados = normalizePersonaList(n.disciplinable || n.denunciado, n.disciplinables || n.denunciados);
  const denunciantes = normalizePersonaList(n.denunciante, n.denunciantes);

  



  return (
    <div className="space-y-4">
      {/* Personas: Denunciados y Denunciantes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Disciplinados */}
        <div className="rounded-xl border-2 border-orange-200 bg-orange-50/30 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-orange-600" />
            <h3 className="text-xs font-black text-orange-700 uppercase tracking-wider">
              Disciplinado{denunciados.length > 1 ? `s (${denunciados.length})` : ''}
            </h3>
            {denunciados.length > 1 && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-orange-200 text-orange-700">
                {denunciados.length}
              </span>
            )}
          </div>
          <div className="space-y-3">
            {denunciados.length > 0 ? denunciados.map((d, idx) => (
              <div key={d.id || idx} className={`${idx > 0 ? 'pt-3 border-t border-orange-200' : ''}`}>
                <div className="flex items-center gap-2 mb-2">
                  {denunciados.length > 1 && (
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white bg-orange-500">{idx + 1}</div>
                  )}
                  <p className="text-sm font-bold text-gray-900">{d.nombre || 'Sin información'}</p>
                </div>
                <div className="grid grid-cols-1 gap-1 text-xs">
                  {d.identificacion && <p><span className="font-bold text-gray-500">ID:</span> {d.identificacion}</p>}
                  {d.cargo && <p><span className="font-bold text-gray-500">Cargo:</span> {d.cargo}</p>}
                  {d.lugarHechos && <p><span className="font-bold text-gray-500">Lugar de Hechos:</span> {d.lugarHechos}</p>}
                </div>

                {d.apoderado && (
                  <div className="mt-2 p-2 rounded-md bg-orange-50 border border-orange-100">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Scale className="w-3 h-3 text-orange-600" />
                      <span className="text-[9px] font-bold text-orange-600 uppercase">Apoderado</span>
                    </div>
                    <div className="text-[10px] text-gray-700 space-y-0.5">
                      <p><span className="font-bold">Nombre:</span> {d.apoderado.nombre || '—'}</p>
                      <p><span className="font-bold">Cédula:</span> {d.apoderado.cedula || '—'}</p>
                      <p><span className="font-bold">Correo:</span> {getApoderadoCorreo(d.apoderado) || '—'}</p>
                      <p><span className="font-bold">Celular:</span> {getApoderadoCelular(d.apoderado) || '—'}</p>
                      {d.apoderado.direccion && <p><span className="font-bold">Dirección:</span> {d.apoderado.direccion}</p>}
                    </div>
                  </div>
                )}
              </div>
            )) : (
              <p className="text-sm text-gray-500 italic">No hay información de disciplinados</p>
            )}
          </div>
        </div>

        {/* Denunciantes */}
        <div className="rounded-xl border-2 border-blue-200 bg-blue-50/30 p-4">
          <div className="flex items-center gap-2 mb-3">
            <User className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-black text-blue-700 uppercase tracking-wider">
              Denunciante{denunciantes.length > 1 ? `s (${denunciantes.length})` : ''}
            </h3>
            {denunciantes.length > 1 && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-blue-200 text-blue-700">
                {denunciantes.length}
              </span>
            )}
          </div>
          <div className="space-y-3">
            {denunciantes.length > 0 ? denunciantes.map((d, idx) => (
              <div key={d.id || idx} className={`${idx > 0 ? 'pt-3 border-t border-blue-200' : ''}`}>
                <div className="flex items-center gap-2 mb-2">
                  {denunciantes.length > 1 && (
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white bg-blue-600">{idx + 1}</div>
                  )}
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-gray-900">{d.nombre || 'Sin información'}</p>
                    {d.tipo && (
                      <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded-full ${
                        d.tipo === 'Víctima' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {d.tipo}
                      </span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-1 text-xs">
                  {d.identificacion && <p><span className="font-bold text-gray-500">ID:</span> {d.identificacion}</p>}
                  {d.cargo && <p><span className="font-bold text-gray-500">Cargo:</span> {d.cargo}</p>}
                  {d.entidad && <p><span className="font-bold text-gray-500">Entidad:</span> {d.entidad}</p>}
                  {d.telefono && <p><span className="font-bold text-gray-500">Teléfono:</span> {d.telefono}</p>}
                  {d.correo && <p><span className="font-bold text-gray-500">Correo:</span> {d.correo}</p>}
                  {d.direccion && <p><span className="font-bold text-gray-500">Dirección:</span> {d.direccion}</p>}
                </div>

                {d.apoderado && (
                  <div className="mt-2 p-2 rounded-md bg-blue-50 border border-blue-100">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Scale className="w-3 h-3 text-blue-600" />
                      <span className="text-[9px] font-bold text-blue-600 uppercase">Apoderado</span>
                    </div>
                    <div className="text-[10px] text-gray-700 space-y-0.5">
                      <p><span className="font-bold">Nombre:</span> {d.apoderado.nombre || '—'}</p>
                      <p><span className="font-bold">Cédula:</span> {d.apoderado.cedula || '—'}</p>
                      <p><span className="font-bold">Correo:</span> {getApoderadoCorreo(d.apoderado) || '—'}</p>
                      <p><span className="font-bold">Celular:</span> {getApoderadoCelular(d.apoderado) || '—'}</p>
                      {d.apoderado.direccion && <p><span className="font-bold">Dirección:</span> {d.apoderado.direccion}</p>}
                    </div>
                  </div>
                )}
              </div>
            )) : (
              <p className="text-sm text-gray-500 italic">No hay información de denunciantes</p>
            )}
          </div>
        </div>
      </div>

      {/* Datos de radicación */}
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
          <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider">Datos de Radicación</h3>
        </div>
<div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-100">
            {[
              { label: 'NÚMERO', value: n.numero },
              { label: 'ORIGEN', value: formatOrigenLabel(n.origen) },
              { label: 'FECHA RECEPCIÓN', value: formatFechaLocal(n.fechaRecepcion) },
              { label: 'FECHA QUEJA / NOTIFICACIÓN', value: formatFechaLocal(n.fechaQueja || n.fechaRecepcion || n.fechaRegistro || n.createdAt) },
            ].map(({ label, value }) => (
            <div key={label} className="px-4 py-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
              <p className="text-sm font-bold text-gray-900">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Datos geográficos y temporales */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {n.territorial && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Territorial</span>
            </div>
            <p className="text-sm font-bold text-gray-900">{n.territorial}</p>
          </div>
        )}
        {n.dependencia && (
          <div className="rounded-xl border border-purple-200 bg-purple-50 p-3">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-4 h-4 text-purple-600" />
              <span className="text-[10px] font-bold text-purple-600 uppercase tracking-widest">Dependencia</span>
            </div>
            <p className="text-sm font-bold text-gray-900">{n.dependencia}</p>
          </div>
        )}
        {n.fechaHechos && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-amber-600" />
              <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Fecha de Hechos</span>
            </div>
<p className="text-sm font-bold text-gray-900">
               {parseLocalDateTime(n.fechaHechos) ? `${parseLocalDateTime(n.fechaHechos)!.getDate().toString().padStart(2, '0')}/${(parseLocalDateTime(n.fechaHechos)!.getMonth() + 1).toString().padStart(2, '0')}/${parseLocalDateTime(n.fechaHechos)!.getFullYear()}` : '0000'}
             </p>
             {fechaCaducidad && (
               <p className="text-[11px] text-amber-700 mt-1">
                 Caducidad: {parseLocalDateTime(fechaCaducidad) ? `${parseLocalDateTime(fechaCaducidad)!.getDate().toString().padStart(2, '0')}/${(parseLocalDateTime(fechaCaducidad)!.getMonth() + 1).toString().padStart(2, '0')}/${parseLocalDateTime(fechaCaducidad)!.getFullYear()}` : ''}
               </p>
             )}
          </div>
        )}
      </div>

      {/* Conducta */}
      <div className="rounded-xl border border-red-200 bg-red-50 p-3">
        <div className="flex items-center gap-2 mb-2">
          <Gavel className="w-4 h-4 text-red-600" />
          <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest">Presunta Conducta Disciplinaria</span>
        </div>
        {Array.isArray(n.conductas) && n.conductas.length > 0 ? (
          <ul className="space-y-1">
            {n.conductas.map((c, i) => (
              <li key={i} className="text-sm text-gray-900 flex items-start gap-1.5">
                <span className="text-red-400 leading-5">•</span>
                <span className={i === 0 ? 'font-bold' : ''}>{c}</span>
              </li>
            ))}
          </ul>
        ) : n.conductaSeleccionada || n.conductaPersonalizada || n.conducta ? (
          <>
            {n.conductaSeleccionada && (
              <p className="text-sm font-bold text-gray-900">{n.conductaSeleccionada}</p>
            )}
            {n.conductaPersonalizada && (
              <p className="text-xs text-gray-600 mt-1 italic">{n.conductaPersonalizada}</p>
            )}
            {n.conducta && (!n.conductaSeleccionada || n.conducta !== n.conductaSeleccionada) && (
              <p className="text-xs text-gray-700 mt-1">{n.conducta}</p>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-500 italic">No se ha especificado conducta disciplinaria</p>
        )}
      </div>



      {/* Remisión por competencia si aplica */}
      {(n.estado === 'remitida' || Boolean(n.numeroRC) || Boolean(n.entidadRemision)) && (
        <div className="rounded-xl border-2 border-purple-300 bg-gradient-to-r from-purple-50 via-indigo-50/40 to-purple-50 p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-purple-600 flex items-center justify-center text-white flex-shrink-0 mt-0.5 shadow-sm">
                <Scale className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xs font-black text-purple-900 uppercase tracking-wider">
                    Expediente Remitido por Competencia
                  </h3>
                  {n.numeroRC && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-200 text-purple-900">
                      RC: {n.numeroRC}
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800">
                    Auto Aprobado
                  </span>
                </div>
                <p className="text-xs text-purple-950 font-bold mt-1">
                  Entidad receptora: {n.entidadRemision || n.descripcionRemision?.entidadDestino || 'Entidad competente'}
                </p>
                <p className="text-[11px] text-purple-700 mt-0.5 leading-relaxed">
                  Se conservan todos los documentos oficiales generados (Autos, Actas y Evidencias) y los soportes iniciales de la queja.
                </p>
              </div>
            </div>
            {onVerAdjuntos && (
              <button
                type="button"
                onClick={onVerAdjuntos}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors shadow-sm ml-auto"
              >
                <Paperclip className="w-3.5 h-3.5" />
                Ver Documentos ({cantAdjuntos})
              </button>
            )}
          </div>
        </div>
      )}

      {/* Hechos (resumen) */}
      {n.hechos && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <div className="flex items-center gap-2 mb-2">
            <ClipboardList className="w-4 h-4 text-amber-700" />
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">Hechos</span>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">{n.hechos}</p>
        </div>
      )}

      {/* Info adicional: proceso asociado, días */}
      <div className="flex items-center gap-2 flex-wrap pt-1">
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-blue-200 bg-blue-50 text-xs font-bold" style={{ color: '#003DA5' }}>
          <Clock className="w-3.5 h-3.5" />
          {n.diasPendientes} días pendientes
        </span>
        {n.procesoAsociado && (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-green-200 bg-green-50 text-xs font-bold text-green-700">
            <CheckCircle className="w-3.5 h-3.5" />
            Proceso: {n.procesoAsociado.numeroProceso}
          </span>
        )}
        {cantAdjuntos > 0 && (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-purple-200 bg-purple-50 text-xs font-bold text-purple-700">
            <Paperclip className="w-3.5 h-3.5" />
            {cantAdjuntos} adjunto{cantAdjuntos !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB: PERSONAS
// ═══════════════════════════════════════════════════════════════

function TabPersonas({
  n,
  getDenuncianteNombre, getDenunciadoNombre, getDenuncianteId, getDenunciadoId
}: {
  n: NoticiaCompleta;
  getDenuncianteNombre: () => string;
  getDenunciadoNombre: () => string;
  getDenuncianteId: () => string;
  getDenunciadoId: () => string;
}) {
  // Preparar datos de personas para mostrar al inicio
  const denunciados = normalizePersonaList(n.disciplinable || n.denunciado, n.disciplinables || n.denunciados);
  const denunciantes = normalizePersonaList(n.denunciante, n.denunciantes);

  return (
    <div className="space-y-5">
      {/* Disciplinados */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-orange-600" />
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">
            Disciplinado{denunciados.length > 1 ? `s (${denunciados.length})` : ''}
          </h3>
        </div>
        <div className="space-y-3">
          {denunciados.length > 0 ? (
            denunciados.map((d, idx) => (
              <div key={d.id || idx} className="rounded-xl border-2 border-orange-200 bg-orange-50/30 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white"
                    style={{ backgroundColor: '#EA580C' }}>
                    {idx + 1}
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-900">{d.nombre || 'Sin información'}</p>
                    {d.identificacion && <p className="text-xs text-gray-500">{d.identificacion}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {d.cargo && (
                    <div className="flex items-start gap-2">
                      <Briefcase className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Cargo</p>
                        <p className="text-xs font-semibold text-gray-700">{d.cargo}</p>
                      </div>
                    </div>
                  )}
                  {d.lugarHechos && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Lugar de Hechos / Dependencia</p>
                        <p className="text-xs font-semibold text-gray-700">{d.lugarHechos}</p>
                      </div>
                    </div>
                  )}
                  {d.correo && (
                    <div className="flex items-start gap-2">
                      <Mail className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Correo</p>
                        <p className="text-xs font-semibold text-gray-700">{d.correo}</p>
                      </div>
                    </div>
                  )}
                  {d.telefono && (
                    <div className="flex items-start gap-2">
                      <Phone className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Teléfono</p>
                        <p className="text-xs font-semibold text-gray-700">{d.telefono}</p>
                      </div>
                    </div>
                  )}
                </div>
                {d.apoderado && (
                  <div className="mt-3 pt-3 border-t border-orange-200">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Scale className="w-3.5 h-3.5 text-orange-600" />
                      <span className="text-[10px] font-bold text-orange-600 uppercase">Apoderado</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                      <div><span className="text-gray-400 text-[10px] font-bold">NOMBRE</span><p className="font-semibold text-gray-700">{d.apoderado.nombre}</p></div>
                      <div><span className="text-gray-400 text-[10px] font-bold">CÉDULA</span><p className="font-semibold text-gray-700">{d.apoderado.cedula}</p></div>
                      <div><span className="text-gray-400 text-[10px] font-bold">CORREO</span><p className="font-semibold text-gray-700">{getApoderadoCorreo(d.apoderado) || 'Sin información'}</p></div>
                      <div><span className="text-gray-400 text-[10px] font-bold">CELULAR</span><p className="font-semibold text-gray-700">{getApoderadoCelular(d.apoderado) || 'Sin información'}</p></div>
                      <div><span className="text-gray-400 text-[10px] font-bold">DIRECCIÓN</span><p className="font-semibold text-gray-700">{d.apoderado.direccion || 'Sin información'}</p></div>
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 text-center">
              <p className="text-sm text-gray-500 italic">No hay información de disciplinados registrada</p>
            </div>
          )}
        </div>
      </div>

      {/* Denunciantes */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <User className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">
            Denunciante{denunciantes.length > 1 ? `s (${denunciantes.length})` : ''}
          </h3>
        </div>
        <div className="space-y-3">
          {denunciantes.length > 0 ? (
            denunciantes.map((d, idx) => (
              <div key={d.id || idx} className="rounded-xl border-2 border-blue-200 bg-blue-50/30 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white"
                    style={{ backgroundColor: '#003DA5' }}>
                    {idx + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-black text-gray-900">{d.nombre || 'Sin información'}</p>
                      {'tipo' in d && d.tipo && (
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                          d.tipo === 'Víctima' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {d.tipo}
                        </span>
                      )}
                    </div>
                    {d.identificacion && <p className="text-xs text-gray-500">{d.identificacion}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {d.correo && (
                    <div className="flex items-start gap-2">
                      <Mail className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Correo</p>
                        <p className="text-xs font-semibold text-gray-700">{d.correo}</p>
                      </div>
                    </div>
                  )}
                  {d.telefono && (
                    <div className="flex items-start gap-2">
                      <Phone className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Teléfono</p>
                        <p className="text-xs font-semibold text-gray-700">{d.telefono}</p>
                      </div>
                    </div>
                  )}
                  {d.direccion && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Dirección</p>
                        <p className="text-xs font-semibold text-gray-700">{d.direccion}</p>
                      </div>
                    </div>
                  )}
                  {d.cargo && (
                    <div className="flex items-start gap-2">
                      <Briefcase className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Cargo</p>
                        <p className="text-xs font-semibold text-gray-700">{d.cargo}</p>
                      </div>
                    </div>
                  )}
                  {d.entidad && (
                    <div className="flex items-start gap-2">
                      <Building2 className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Entidad</p>
                        <p className="text-xs font-semibold text-gray-700">{d.entidad}</p>
                      </div>
                    </div>
                  )}
                </div>
                {d.apoderado && (
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Scale className="w-3.5 h-3.5 text-blue-600" />
                      <span className="text-[10px] font-bold text-blue-600 uppercase">Apoderado</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                      <div><span className="text-gray-400 text-[10px] font-bold">NOMBRE</span><p className="font-semibold text-gray-700">{d.apoderado.nombre}</p></div>
                      <div><span className="text-gray-400 text-[10px] font-bold">CÉDULA</span><p className="font-semibold text-gray-700">{d.apoderado.cedula}</p></div>
                      <div><span className="text-gray-400 text-[10px] font-bold">CORREO</span><p className="font-semibold text-gray-700">{getApoderadoCorreo(d.apoderado) || 'Sin información'}</p></div>
                      <div><span className="text-gray-400 text-[10px] font-bold">CELULAR</span><p className="font-semibold text-gray-700">{getApoderadoCelular(d.apoderado) || 'Sin información'}</p></div>
                      <div><span className="text-gray-400 text-[10px] font-bold">DIRECCIÓN</span><p className="font-semibold text-gray-700">{d.apoderado.direccion || 'Sin información'}</p></div>
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 text-center">
              <p className="text-sm text-gray-500 italic">No hay información de denunciantes registrada</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB: HECHOS
// ═══════════════════════════════════════════════════════════════

function TabHechos({ n }: { n: NoticiaCompleta }) {
  return (
    <div className="space-y-4">
      {/* Descripción general de hechos */}
      {n.hechos && (
        <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-5">
          <div className="flex items-center gap-2 mb-3">
            <ClipboardList className="w-4 h-4 text-amber-700" />
            <h3 className="text-xs font-black text-amber-700 uppercase tracking-wider">Descripción General de los Hechos</h3>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{n.hechos}</p>
        </div>
      )}

      {/* Hechos separados */}
      {n.hechosSeparados && n.hechosSeparados.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <FileWarning className="w-4 h-4 text-orange-600" />
            <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">
              Hechos Individualizados ({n.hechosSeparados.length})
            </h3>
          </div>
          <div className="space-y-3">
            {n.hechosSeparados.map((hecho, idx) => (
              <div key={hecho.id || idx} className="rounded-xl border-2 border-gray-200 p-4 bg-white">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: '#003DA5' }}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 leading-relaxed">{hecho.descripcion}</p>
{hecho.fecha && (
                       <p className="text-[11px] text-gray-400 mt-2 flex items-center gap-1">
                         <Calendar className="w-3 h-3" />
                         {formatFechaLocal(hecho.fecha)}
                       </p>
                     )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Conducta presunta */}
      {n.conductaSeleccionada && (
        <div className="rounded-xl border-2 border-red-200 bg-red-50 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Gavel className="w-4 h-4 text-red-600" />
            <h3 className="text-xs font-black text-red-700 uppercase tracking-wider">Presunta Conducta Disciplinaria</h3>
          </div>
          <p className="text-sm font-bold text-gray-900">{n.conductaSeleccionada}</p>
          {n.conductaPersonalizada && (
            <p className="text-xs text-gray-600 mt-2 italic bg-white rounded-lg p-3 border border-red-100">
              {n.conductaPersonalizada}
            </p>
          )}
        </div>
      )}

      {/* Estado vacío */}
      {!n.hechos && (!n.hechosSeparados || n.hechosSeparados.length === 0) && (
        <div className="text-center py-12">
          <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-gray-400">No se registraron hechos</p>
          <p className="text-xs text-gray-300 mt-1">Los hechos se ingresan durante la creación de la noticia</p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB: ADJUNTOS Y EXPEDIENTE
// ═══════════════════════════════════════════════════════════════

function TabAdjuntos({
  n,
  dossier,
  formatFileSize,
  onDownload,
  onDownloadFileDirecto,
  onView
}: {
  n: NoticiaCompleta;
  dossier: DossierSections;
  formatFileSize: (b: number) => string;
  onDownload?: (url: string, filename: string) => Promise<void>;
  onDownloadFileDirecto?: (archivo: ArchivoAdjunto) => Promise<void>;
  onView?: (archivo: ArchivoAdjunto) => void;
}) {
  const { autos, actasYEvidencias, soportesQueja, todos } = dossier;
  const esRemitida = n.estado === 'remitida' || Boolean(n.numeroRC) || Boolean(n.entidadRemision);

  const getIconByType = (tipo: string, nombre: string) => {
    const t = (tipo || '').toLowerCase();
    const name = (nombre || '').toLowerCase();
    if (t.includes('pdf') || name.endsWith('.pdf')) return { icon: FileText, color: '#DC2626', bg: '#FEE2E2' };
    if (t.includes('image') || /\.(png|jpe?g|gif|webp|svg)$/i.test(name)) return { icon: Eye, color: '#7C3AED', bg: '#EDE9FE' };
    if (t.includes('word') || t.includes('doc') || /\.(docx?|rtf|odt)$/i.test(name)) return { icon: FileText, color: '#2563EB', bg: '#DBEAFE' };
    if (t.includes('excel') || t.includes('xls') || t.includes('sheet') || /\.(xlsx?|csv)$/i.test(name)) return { icon: FileText, color: '#059669', bg: '#D1FAE5' };
    return { icon: Paperclip, color: '#6B7280', bg: '#F3F4F6' };
  };

  const handleDownloadFile = async (url: string, filename: string) => {
    if (onDownload && url && !url.toLowerCase().includes('/preview')) {
      try {
        await onDownload(url, filename);
        return;
      } catch (err) {
        console.warn('[TabAdjuntos] onDownload falló, usando descarga directa:', err);
      }
    }
    try {
      if (url && !url.toLowerCase().includes('/preview')) {
        const absoluteUrl = disciplinaryService.getAbsoluteFileUrl(url);
        const res = await fetch(absoluteUrl, { credentials: 'include' });
        if (res.ok) {
          const blob = await res.blob();
          const blobUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(blobUrl);
          return;
        }
      }
    } catch (err) {
      console.error('Error descargando archivo:', err);
      if (url && !url.toLowerCase().includes('/preview')) {
        window.open(disciplinaryService.getAbsoluteFileUrl(url), '_blank');
      }
    }
  };

  if (todos.length === 0) {
    return (
      <div className="space-y-4">
        {esRemitida && (
          <div className="rounded-xl border-2 border-purple-200 bg-purple-50/70 p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-purple-600 flex items-center justify-center text-white flex-shrink-0">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-black text-purple-900 uppercase tracking-wider">
                  Expediente Remitido por Competencia
                </h3>
                <p className="text-xs text-purple-800 font-semibold">
                  Radicado: {n.numeroRC || 'En trámite'} · Destino: {n.entidadRemision || n.descripcionRemision?.entidadDestino || 'Entidad competente'}
                </p>
              </div>
            </div>
          </div>
        )}
        <div className="text-center py-12">
          <Paperclip className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-gray-400">No hay archivos adjuntos ni documentos registrados</p>
          <p className="text-xs text-gray-300 mt-1">Los documentos se adjuntan o generan durante el trámite de la noticia y del proceso</p>
        </div>
      </div>
    );
  }

  const renderArchivoCard = (archivo: ArchivoAdjunto, idx: number) => {
    const { icon: Icon, color, bg } = getIconByType(archivo.tipo, archivo.nombre);
    return (
      <div key={`${archivo.url}-${idx}`} className="flex items-center gap-3 rounded-xl border-2 border-gray-200 p-3 hover:bg-gray-50 transition-colors group">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 shadow-xs"
          style={{ backgroundColor: bg }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-gray-900 truncate">{archivo.nombre}</p>
            {archivo.seccion === 'autos' ? (
              <>
                <span className="px-2 py-0.5 text-[9px] font-black rounded-md uppercase bg-blue-100 text-blue-900 border border-blue-300 flex items-center gap-1 shadow-2xs">
                  <Scale className="w-2.5 h-2.5 text-blue-700" />
                  Auto Jurídico
                </span>
                {archivo.tipoAutoDetalle && (
                  <span className={`px-2 py-0.5 text-[9px] font-black rounded-md uppercase border shadow-2xs ${
                    archivo.esRemision
                      ? 'bg-purple-100 text-purple-900 border-purple-300'
                      : 'bg-indigo-50 text-indigo-900 border-indigo-200'
                  }`}>
                    {archivo.tipoAutoDetalle}
                  </span>
                )}
                {archivo.estadoAuto && (
                  <span className="px-2 py-0.5 text-[9px] font-black rounded-md uppercase bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs">
                    {archivo.estadoAuto}
                  </span>
                )}
              </>
            ) : archivo.categoria ? (
              <span className={`px-2 py-0.5 text-[9px] font-black rounded-md uppercase ${
                archivo.seccion === 'actas_evidencias' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                'bg-gray-100 text-gray-700 border border-gray-200'
              }`}>
                {archivo.categoria}
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {archivo.tamano > 0 && (
              <>
                <span className="text-[11px] text-gray-400">{formatFileSize(archivo.tamano)}</span>
                <span className="text-gray-300">·</span>
              </>
            )}
            {archivo.fechaSubida && (
              <>
                <span className="text-[11px] text-gray-400">
                  {formatFechaLocal(archivo.fechaSubida)}
                </span>
                <span className="text-gray-300">·</span>
              </>
            )}
            <span className="text-[11px] text-gray-500 font-medium truncate max-w-md">
              {archivo.subtitulo || 'Documento oficial del expediente'}
            </span>
          </div>
        </div>
        <div className="flex gap-1" style={{ opacity: 1 }}>
          {onView && (
            <button
              onClick={() => onView(archivo)}
              className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
              title="Previsualizar"
            >
              <Eye className="w-4 h-4 text-gray-500" />
            </button>
          )}
          <button
            onClick={() => onDownloadFileDirecto ? onDownloadFileDirecto(archivo) : handleDownloadFile(archivo.url, archivo.nombre)}
            className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
            title="Descargar"
          >
            <Download className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Banner de remisión destacada */}
      {esRemitida && (
        <div className="rounded-xl border-2 border-purple-300 bg-gradient-to-r from-purple-50 via-indigo-50/50 to-purple-50 p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-white flex-shrink-0 shadow-sm mt-0.5">
              <Scale className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xs font-black text-purple-900 uppercase tracking-wider">
                  Expediente Completo Remitido por Competencia
                </h3>
                {n.numeroRC && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-200 text-purple-800">
                    RC: {n.numeroRC}
                  </span>
                )}
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800">
                  {todos.length} archivos preservados
                </span>
              </div>
              <p className="text-xs text-purple-950 font-bold mt-1">
                Entidad receptora: {n.entidadRemision || n.descripcionRemision?.entidadDestino || 'Entidad competente'}
              </p>
              <p className="text-[11px] text-purple-800 mt-1 leading-relaxed">
                Este expediente conserva íntegramente los autos jurídicos aprobados (incluido el Auto de Remisión por Competencia), las actas, oficios y evidencias del proceso disciplinario, así como los soportes de la queja inicial.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 1. AUTOS JURÍDICOS */}
      {autos.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Scale className="w-4 h-4 text-purple-700" />
            <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">
              Autos Jurídicos del Proceso ({autos.length})
            </h3>
          </div>
          <div className="space-y-2">
            {autos.map(renderArchivoCard)}
          </div>
        </div>
      )}

      {/* 2. ACTAS, OFICIOS Y EVIDENCIAS */}
      {actasYEvidencias.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <ClipboardList className="w-4 h-4 text-amber-700" />
            <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">
              Actas, Oficios y Evidencias ({actasYEvidencias.length})
            </h3>
          </div>
          <div className="space-y-2">
            {actasYEvidencias.map(renderArchivoCard)}
          </div>
        </div>
      )}

      {/* 3. SOPORTES INICIALES DE LA QUEJA */}
      {soportesQueja.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Paperclip className="w-4 h-4 text-blue-700" />
            <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">
              Soportes Iniciales de la Noticia / Queja ({soportesQueja.length})
            </h3>
          </div>
          <div className="space-y-2">
            {soportesQueja.map(renderArchivoCard)}
          </div>
        </div>
      )}
    </div>
  );
}

const ACTUACION_TIPOS: { value: string; label: string }[] = [
  { value: 'actuacion', label: 'Actuación' },
  { value: 'auto', label: 'Auto' },
  { value: 'oficio', label: 'Oficio' },
  { value: 'comunicacion', label: 'Comunicación' },
  { value: 'requerimiento', label: 'Requerimiento' },
  { value: 'otro', label: 'Otro' },
];

const hoyISO = (): string => {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().split('T')[0];
};

function TabActuaciones({
  noticiaId,
  actuaciones,
  loading,
  error,
  puedeAgregar,
  onCreada,
}: {
  noticiaId: string;
  actuaciones: ActuacionNoticia[];
  loading: boolean;
  error: string | null;
  puedeAgregar: boolean;
  onCreada: () => void;
}) {
  const [mostrarForm, setMostrarForm] = useState(false);
  const [tipo, setTipo] = useState('actuacion');
  const [descripcion, setDescripcion] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [fecha, setFecha] = useState(hoyISO());
  const [guardando, setGuardando] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const resetForm = () => {
    setTipo('actuacion');
    setDescripcion('');
    setObservaciones('');
    setFecha(hoyISO());
    setFormError(null);
  };

  const handleGuardar = async () => {
    if (!descripcion.trim()) {
      setFormError('La descripción es obligatoria');
      return;
    }
    const currentUser = authService.getCurrentUser();
    const responsableNombre =
      currentUser?.fullName || currentUser?.firstName || 'Sin identificar';
    try {
      setGuardando(true);
      setFormError(null);
      const hoy = hoyISO();
      const fechaEnvio = (!fecha || fecha === hoy) ? new Date().toISOString() : fecha;
      await disciplinaryService.createActuacionNoticia(noticiaId, {
        tipo,
        descripcion: descripcion.trim(),
        responsableNombre,
        fechaActuacion: fechaEnvio,
        observaciones: observaciones.trim() || undefined,
      });
      resetForm();
      setMostrarForm(false);
      onCreada();
    } catch (e: any) {
      console.error('[ModalDetallesNoticia] Error creando actuación:', e);
      setFormError(e?.message || 'No fue posible registrar la actuación');
    } finally {
      setGuardando(false);
    }
  };

  const ordenado = [...actuaciones].sort(
    (a, b) => new Date(b.fechaActuacion).getTime() - new Date(a.fechaActuacion).getTime(),
  );

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Gavel className="w-4 h-4 text-gray-600" />
          <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">
            Actuaciones ({ordenado.length})
          </h3>
        </div>
        {puedeAgregar && (
          <button
            onClick={() => { setMostrarForm((v) => !v); setFormError(null); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg text-white transition-all"
            style={{ background: '#003DA5' }}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            {mostrarForm ? 'Cancelar' : 'Agregar actuación'}
          </button>
        )}
      </div>

      {puedeAgregar && mostrarForm && (
        <div className="rounded-xl border-2 border-gray-200 p-3 mb-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-gray-600">Tipo</label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="w-full mt-1 px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
              >
                {ACTUACION_TIPOS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-gray-600">Fecha</label>
              <input
                type="date"
                value={fecha}
                max={hoyISO()}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full mt-1 px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
              />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-bold text-gray-600">Descripción *</label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={2}
              className="w-full mt-1 px-2 py-1.5 text-sm border border-gray-300 rounded-lg resize-none"
              placeholder="Descripción de la actuación"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-gray-600">Observaciones</label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={2}
              className="w-full mt-1 px-2 py-1.5 text-sm border border-gray-300 rounded-lg resize-none"
              placeholder="Opcional"
            />
          </div>
          {formError && (
            <div className="text-xs text-red-700 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              {formError}
            </div>
          )}
          <div className="flex justify-end">
            <button
              onClick={handleGuardar}
              disabled={guardando}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg text-white disabled:opacity-60"
              style={{ background: '#059669' }}
            >
              {guardando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
              Guardar actuación
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Cargando actuaciones...
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-xs text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span className="font-semibold">{error}</span>
        </div>
      ) : ordenado.length === 0 ? (
        <div className="text-center py-12">
          <Gavel className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-gray-400">Sin actuaciones registradas</p>
        </div>
      ) : (
        <div className="space-y-2">
          {ordenado.map((act) => {
            const tipoLabel = ACTUACION_TIPOS.find((t) => t.value === (act.tipo || '').toLowerCase())?.label
              || act.tipo || 'Actuación';
            return (
              <div key={act.id} className="rounded-xl border-2 border-gray-200 p-3">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full" style={{ backgroundColor: '#DBEAFE', color: '#2563EB' }}>
                    {tipoLabel}
                  </span>
                  <span className="text-[11px] text-gray-400">{formatFechaHistorial(act.fechaActuacion)}</span>
                </div>
                <p className="text-sm text-gray-800 leading-relaxed">{act.descripcion}</p>
                {act.observaciones && (
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{act.observaciones}</p>
                )}
                <p className="text-[11px] text-gray-400 mt-1">Por: {act.responsableNombre || 'Sin identificar'}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const HISTORIAL_TIPO_META: Record<string, { label: string; color: string; bg: string }> = {
  radicacion: { label: 'Radicación', color: '#2563EB', bg: '#DBEAFE' },
  edicion: { label: 'Edición', color: '#7C3AED', bg: '#EDE9FE' },
  devolucion: { label: 'Devolución', color: '#D97706', bg: '#FEF3C7' },
  archivo: { label: 'Archivo', color: '#374151', bg: '#F3F4F6' },
  restauracion: { label: 'Restauración', color: '#059669', bg: '#D1FAE5' },
  asociacion: { label: 'Asociación', color: '#0891B2', bg: '#CFFAFE' },
  remision_competencia: { label: 'Remisión por Competencia', color: '#DB2777', bg: '#FCE7F3' },
};

const formatFechaHistorial = (fecha: string): string => {
  if (!fecha) return 'Sin fecha';
  const soloFecha = fecha.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const d = soloFecha
    ? new Date(Date.UTC(Number(soloFecha[1]), Number(soloFecha[2]) - 1, Number(soloFecha[3]), 12))
    : new Date(fecha);
  if (isNaN(d.getTime())) return 'Sin fecha';
  const tieneHora = !soloFecha && (fecha.includes('T') || fecha.includes(':'));
  return d.toLocaleString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(tieneHora ? { hour: '2-digit', minute: '2-digit' } : {}),
    timeZone: 'America/Bogota',
  });
};

function TabHistorial({ historial, loading, error }: { historial: HistorialEntry[]; loading: boolean; error: string | null }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        Cargando historial...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-xs text-red-700 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4" />
        <span className="font-semibold">{error}</span>
      </div>
    );
  }

  if (historial.length === 0) {
    return (
      <div className="text-center py-12">
        <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-sm font-bold text-gray-400">Sin historial registrado</p>
      </div>
    );
  }

  // Más reciente primero
  const ordenado = [...historial].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <History className="w-4 h-4 text-gray-600" />
        <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">
          Historial ({ordenado.length})
        </h3>
      </div>
      <div className="space-y-2">
        {ordenado.map((entry) => {
          const meta = HISTORIAL_TIPO_META[entry.tipo] || { label: entry.tipo, color: '#6B7280', bg: '#F3F4F6' };
          return (
            <div key={entry.id} className="rounded-xl border-2 border-gray-200 p-3">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span
                  className="px-2 py-0.5 text-[10px] font-bold rounded-full"
                  style={{ backgroundColor: meta.bg, color: meta.color }}
                >
                  {meta.label}
                </span>
                <span className="text-[11px] text-gray-400">{formatFechaHistorial(entry.fecha)}</span>
              </div>
              {entry.observaciones && (
                <p className="text-sm text-gray-700 leading-relaxed">{entry.observaciones}</p>
              )}
              <p className="text-[11px] text-gray-400 mt-1">Por: {entry.usuario || 'Sistema'}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
