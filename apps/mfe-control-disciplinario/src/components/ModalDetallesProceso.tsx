/**
 * MODAL DETALLES PROCESO — WORLD CLASS ESAP SIGL v5.1
 * Diseño canónico: pestañas General | Archivos | Actuaciones | Tareas | Notas
 * Usa createPortal para que el backdrop cubra toda la pantalla (bypass motion stacking context)
 * PLANTILLA REAL- USADA
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Scale, FileText, FolderOpen, Zap, CheckSquare, FileEdit,
  Archive, Mail, FileCheck, History, Download, Upload, Search,
  Bell, Share2, ExternalLink, AlertTriangle, User, Briefcase,
  Calendar, Clock, ChevronRight, ChevronDown, ChevronUp, Plus,
  CheckCircle, AlertCircle, ClipboardList, MessageSquare, Printer,
  Eye, Image, FileArchive, ZoomIn,
  MapPin, Building2, Phone, Paperclip, Gavel, FileWarning, Users,
  Loader2, XCircle, HardDrive, Shield,
  Send, RotateCcw, RefreshCw, Trash2,
  Layers, BarChart3, Filter, FileDown, List,
} from 'lucide-react';
import { toast } from 'sonner';
import * as mammoth from 'mammoth';
import { ModalRevisionAuto, type BorradorPendiente } from './ModalRevisionAuto';
import { ModalReasignarProfesional } from './ModalReasignarProfesional';
import { ModalPliegoCargos } from './ModalPliegoCargos';
import { authService } from '../../../services/api';
import { Permissions } from '@esap-mfe/shared-types/permissions';
import {
  disciplinaryService,
  type CreateDisciplinaryProcessActuacionDto,
  type CreateDisciplinaryProcessNoteDto,
  type CreateDisciplinaryProcessTaskDto,
  type DisciplinaryProcessActuacion,
  type DisciplinaryProcessNote,
  type DisciplinaryProcessTask,
} from '../../../services/api/disciplinary.service';
import { API_MODE, buildApiUrl } from '../../../config/environment';

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface Persona {
  nombre: string;
  tipoIdentificacion: string;
  numeroIdentificacion: string;
}

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
  dependencia?: string;
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

interface Proceso {
  id: string;
  numeroProceso: string;
  noticiaOrigen: string;
  denunciante: Persona | string;
  denunciado: Persona | string;
  cedula: string;
  etapaActual: string;
  estadoActual: string;
  profesionalAsignado: Persona | string | null;
  semaforo: 'verde' | 'amarillo' | 'rojo';
  diasRestantes: number;
  porcentajeTiempo: number;
  borradores: any[];
  documentos: any[];
  pendienteAprobacion: boolean;
  ultimaActuacion: string;
  fechaCreacion: string;
  tipo: 'proceso';
  hechos?: string;
  cargo?: string;
  dependencia?: string;
  historialAuditoria?: any[];
  tasksCount?: number;
  completedTasksCount?: number;
  pendingTasksCount?: number;
  notesCount?: number;
  // ═══ Campos heredados de la Noticia disciplinaria ═══
  territorial?: string;
  fechaHechos?: string;
  conductaSeleccionada?: string;
  conductaPersonalizada?: string;
  denunciados?: DenunciadoCompleto[];
  denunciantes?: DenuncianteCompleto[];
  hechosSeparados?: { id: string; descripcion: string; fecha?: string }[];
  archivosAdjuntos?: { nombre: string; tipo: string; tamano: number; fechaSubida: string; url?: string }[];
  origenNoticia?: string;
  fechaRecepcionNoticia?: string;
  prioridadNoticia?: 'alta' | 'media' | 'baja';
  // Campos del mock enriquecido
  origen?: string;
  prioridad?: string;
}

type Tab = 'general' | 'archivos' | 'actuaciones' | 'tareas' | 'notas';
type Extension =
  | 'pdf'
  | 'doc'
  | 'docx'
  | 'xls'
  | 'xlsx'
  | 'jpg'
  | 'jpeg'
  | 'png'
  | 'gif'
  | 'webp'
  | 'heic'
  | 'mp4'
  | 'webm'
  | 'mov'
  | 'avi'
  | 'mp3'
  | 'wav'
  | 'ogg'
  | 'html'
  | 'zip';

interface ActuacionItem {
  id: string;
  fecha: string;
  descripcion: string;
  tipo: string;
  responsable: string;
  etapa: string;
  observaciones?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface TaskItem {
  id: string;
  titulo: string;
  descripcion?: string;
  prioridad: 'alta' | 'media' | 'baja';
  completada: boolean;
  etapa: string;
  responsable?: string;
  vencimiento: string;
  fechaCompletada?: string | null;
  observaciones?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface NoteItem {
  id: string;
  texto: string;
  fecha: string;
  etapa: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Archivo {
  id: string;
  nombre: string;
  numero?: string;
  tipo: 'auto' | 'evidencia' | 'oficio' | 'acta';
  fecha: string;
  firmante: string;
  estado: 'aprobado' | 'borrador' | 'pendiente' | 'en_revision' | 'devuelto';
  tamaño: string;
  extension: Extension;
  version?: number;
  observacionesDevolucion?: string;
  fechaEnvioRevision?: string;
  etapaProceso?: string;
  downloadUrl?: string | null;
  urlExterna?: string | null;
  archivoNombre?: string;
  fileType?: string | null;
}

interface ModalDetallesProcesoProps {
  proceso: Proceso;
  onClose: () => void;
  onReabrir?: () => void; // Callback para reopen el modal después de confirmar envío a revisión
  onGestionAutos: () => void;
  onGestionEvidencias: () => void;
  onGestionOficios: () => void;
  onGestionActas: () => void;
  onHistorial: () => void;
  onExpediente: () => void;
  onActualizarProceso?: (updates: Partial<Proceso>) => void;
  /** Callback para agregar borrador a la lista compartida de Revisión y Aprobación */
  onEnviarARevision?: (borrador: BorradorPendiente) => void;
  /** Callback para navegar al módulo de Revisión y Aprobación */
  onNavigateToRevision?: () => void;
}


// ─── Helpers ─────────────────────────────────────────────────────────────────

function getNombre(p: Persona | string | null | undefined): string {
  if (!p) return 'Sin información';
  return typeof p === 'string' ? p : (p.nombre || 'Sin información');
}
function getId(p: Persona | string | null | undefined): string {
  if (!p || typeof p === 'string') return '';
  return p.numeroIdentificacion ? `${p.tipoIdentificacion}: ${p.numeroIdentificacion}` : '';
}
function getApoderadoCorreo(apoderado?: Apoderado): string {
  return apoderado?.correo || apoderado?.email || '';
}
function getApoderadoCelular(apoderado?: Apoderado): string {
  return apoderado?.celular || apoderado?.telefono || '';
}

const SEMAFORO: Record<string, { bg: string; text: string; border: string; label: string }> = {
  verde:    { bg: '#D1FAE5', text: '#065F46', border: '#6EE7B7', label: 'Al día'      },
  amarillo: { bg: '#FEF3C7', text: '#92400E', border: '#FCD34D', label: 'Por vencer'  },
  rojo:     { bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5', label: 'Vencido'     },
};

const ETAPA_COLOR: Record<string, { bg: string; text: string }> = {
  'Recepción':      { bg: '#DBEAFE', text: '#1E40AF' },
  'Valoración':     { bg: '#EDE9FE', text: '#5B21B6' },
  'Indagación':     { bg: '#FEF3C7', text: '#92400E' },
  'Investigación':  { bg: '#FEE2E2', text: '#991B1B' },
  'Juzgamiento':    { bg: '#FCE7F3', text: '#9D174D' },
  'Fallo':          { bg: '#D1FAE5', text: '#065F46' },
};
function etapaColor(e: string) { return ETAPA_COLOR[e] || { bg: '#F3F4F6', text: '#374151' }; }

// ─── Sistema de Carga de Archivos World Class ─────────────────────────────────

const LIMITE_CARGA_DIRECTA = 200 * 1024 * 1024; // 200 MB
const MAX_FILE_SIZE = 10 * 1024 * 1024 * 1024; // 10 GB
const EXTENSIONES_PERMITIDAS = [
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'html',
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'heic',
  'mp4', 'webm', 'mov', 'avi',
  'mp3', 'wav', 'ogg',
];

type EstadoCarga = 'validando' | 'subiendo' | 'procesando' | 'completado' | 'error' | 'cancelado';

interface CargaActiva {
  id: string;
  archivo: File;
  nombre: string;
  tamano: number;
  progreso: number;
  estado: EstadoCarga;
  velocidad: string;
  tiempoRestante: string;
  error?: string;
  abortController: AbortController;
  iniciadoEn: number;
  bytesSubidos: number;
  esGrande: boolean;
}

function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function obtenerExtension(nombre: string): string {
  return nombre.split('.').pop()?.toLowerCase() || '';
}

function validarArchivo(archivo: File): { valido: boolean; error?: string } {
  if (archivo.size > MAX_FILE_SIZE) {
    return { valido: false, error: `El archivo supera el límite de ${formatBytes(MAX_FILE_SIZE)}` };
  }
  if (archivo.size === 0) {
    return { valido: false, error: 'El archivo está vacío' };
  }
  const ext = obtenerExtension(archivo.name);
  if (!ext || !EXTENSIONES_PERMITIDAS.includes(ext)) {
    return { valido: false, error: `Extensión .${ext || '?'} no permitida` };
  }
  return { valido: true };
}

type PreviewKind = 'zip' | 'image' | 'video' | 'audio' | 'pdf' | 'html' | 'office' | 'other';

function getPreviewKind(extension: Extension): PreviewKind {
  if (extension === 'zip') return 'zip';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) return 'image';
  if (['mp4', 'webm', 'mov', 'avi'].includes(extension)) return 'video';
  if (['mp3', 'wav', 'ogg'].includes(extension)) return 'audio';
  if (extension === 'pdf') return 'pdf';
  if (extension === 'html') return 'html';
  if (['doc', 'docx', 'xls', 'xlsx'].includes(extension)) return 'office';
  return 'other';
}

function getMimeTypeFromExtension(extension: Extension): string {
  switch (extension) {
    case 'pdf':
      return 'application/pdf';
    case 'doc':
      return 'application/msword';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'xls':
      return 'application/vnd.ms-excel';
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'mp4':
      return 'video/mp4';
    case 'webm':
      return 'video/webm';
    case 'mov':
      return 'video/quicktime';
    case 'avi':
      return 'video/x-msvideo';
    case 'mp3':
      return 'audio/mpeg';
    case 'wav':
      return 'audio/wav';
    case 'ogg':
      return 'audio/ogg';
    case 'html':
      return 'text/html';
    case 'zip':
      return 'application/zip';
    default:
      return 'application/octet-stream';
  }
}

function getArchivoDownloadName(archivo: Archivo): string {
  const nombreBase = (archivo.archivoNombre || archivo.nombre || 'documento').trim();
  const sufijo = `.${archivo.extension}`;
  return nombreBase.toLowerCase().endsWith(sufijo.toLowerCase())
    ? nombreBase
    : `${nombreBase}${sufijo}`;
}

function appendQueryParam(url: string, key: string, value: string): string {
  const [urlWithoutHash, hash = ''] = url.split('#', 2);
  const existing = new RegExp(`([?&])${key}=`);

  if (existing.test(urlWithoutHash)) {
    return url;
  }

  const separator = urlWithoutHash.includes('?') ? '&' : '?';
  return `${urlWithoutHash}${separator}${key}=${encodeURIComponent(value)}${hash ? `#${hash}` : ''}`;
}

function normalizeControlDisciplinarioPath(rawUrl: string): string {
  let path = rawUrl.trim();

  if (/^https?:\/\//i.test(path)) {
    try {
      const url = new URL(path);
      const normalizedPathname = url.pathname.replace(/\/{2,}/g, '/');
      const managedPath =
        normalizedPathname.startsWith('/control-disciplinario/') ||
        normalizedPathname.startsWith('/api/v1/') ||
        normalizedPathname.startsWith('/disciplinary-processes/') ||
        normalizedPathname.startsWith('/files/') ||
        normalizedPathname.startsWith('/uploads/');

      if (!managedPath) {
        return rawUrl;
      }

      path = `${normalizedPathname}${url.search}${url.hash}`;
    } catch {
      return rawUrl;
    }
  }

  path = path.replace(/\/{2,}/g, '/');

  if (path.startsWith('/control-disciplinario/')) {
    path = path.replace(/^\/control-disciplinario/, '');
  }

  path = path.replace(/\/{2,}/g, '/');

  if (API_MODE === 'direct' && /^\/api\/v1(\/|$)/.test(path)) {
    path = path.replace(/^\/api\/v1/, '');
  }

  path = path.replace(/\/{2,}/g, '/');

  return path.startsWith('/') ? path : `/${path}`;
}

function resolveControlDisciplinarioUrl(rawUrl: string): string {
  const normalizedPath = normalizeControlDisciplinarioPath(rawUrl);

  if (/^https?:\/\//i.test(normalizedPath)) {
    return normalizedPath;
  }

  return buildApiUrl('control-disciplinario', normalizedPath);
}

function resolveArchivoRequestUrl(archivo: Archivo, procesoId: string, inline = false): string {
  if (archivo.urlExterna) {
    return archivo.urlExterna;
  }

  let rawUrl = archivo.downloadUrl;

  if (!rawUrl) {
    rawUrl = API_MODE === 'direct'
      ? `/disciplinary-processes/${procesoId}/documents/${archivo.id}/download`
      : `/api/v1/disciplinary-processes/${procesoId}/documents/${archivo.id}/download`;
  }

  const resolvedUrl = resolveControlDisciplinarioUrl(rawUrl);
  const shouldForceInline = inline && /\/disciplinary-processes\/.+\/documents\/.+\/download/.test(rawUrl);

  return shouldForceInline
    ? appendQueryParam(resolvedUrl, 'view', 'true')
    : resolvedUrl;
}

// ─── Toast Progreso de Carga ──────────────────────────────────────────────────

function ToastProgresoCarga({ carga }: { carga: CargaActiva }) {
  const pct = Math.round(carga.progreso);
  const activo = carga.estado === 'subiendo' || carga.estado === 'validando' || carga.estado === 'procesando';
  return (
    <div className="w-full min-w-[320px]">
      <div className="flex items-start gap-2.5 mb-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            backgroundColor: carga.estado === 'completado' ? '#D1FAE5'
              : carga.estado === 'error' || carga.estado === 'cancelado' ? '#FEE2E2' : '#DBEAFE'
          }}>
          {activo ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#003DA5' }} />
            : carga.estado === 'completado' ? <CheckCircle className="w-4 h-4 text-green-600" />
            : <XCircle className="w-4 h-4 text-red-500" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-gray-900 truncate">{carga.nombre}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">
            {carga.estado === 'validando' && 'Validando archivo...'}
            {carga.estado === 'subiendo' && `${formatBytes(carga.bytesSubidos)} de ${formatBytes(carga.tamano)}`}
            {carga.estado === 'procesando' && 'Procesando en servidor...'}
            {carga.estado === 'completado' && `${formatBytes(carga.tamano)} — Completado`}
            {carga.estado === 'error' && (carga.error || 'Error')}
            {carga.estado === 'cancelado' && 'Cancelado por el usuario'}
          </p>
        </div>
        {activo && <span className="text-xs font-black flex-shrink-0" style={{ color: '#003DA5' }}>{pct}%</span>}
      </div>
      {activo && (
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-300"
            style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #003DA5, #2962FF)' }} />
        </div>
      )}
      {carga.estado === 'subiendo' && carga.esGrande && (
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[10px] text-gray-400 flex items-center gap-1"><HardDrive className="w-2.5 h-2.5" />{carga.velocidad}</span>
          <span className="text-[10px] text-gray-400 flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{carga.tiempoRestante}</span>
        </div>
      )}
      {carga.esGrande && activo && (
        <div className="flex items-center gap-1 mt-1.5 px-2 py-1 rounded-md bg-amber-50 border border-amber-200">
          <Shield className="w-2.5 h-2.5 text-amber-600" />
          <span className="text-[9px] font-semibold text-amber-700">Carga en segundo plano · No cierre la ventana</span>
        </div>
      )}
    </div>
  );
}

// ─── Modal Alerta al Cerrar durante Carga ─────────────────────────────────────

function ModalAlertaCierreUpload({ cantidadCargas, onCancelarYCerrar, onContinuar }: {
  cantidadCargas: number; onCancelarYCerrar: () => void; onContinuar: () => void;
}) {
  return createPortal(
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[300] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.60)', padding: '4vh 4vw' }}
      onClick={(e) => e.target === e.currentTarget && onContinuar()}>
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 12 }} transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ width: '92vw', maxWidth: 480, minHeight: 240 }}>
        <div className="flex items-center gap-3 px-5 pt-5 pb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: '#FEF3C7', border: '2px solid #FCD34D' }}>
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-base font-black text-gray-900">Carga en progreso</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {cantidadCargas === 1 ? 'Hay 1 archivo' : `Hay ${cantidadCargas} archivos`} subiendo actualmente
            </p>
          </div>
        </div>
        <div className="px-5 py-3">
          <div className="p-3 rounded-xl bg-red-50 border border-red-200">
            <div className="flex items-start gap-2">
              <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-red-800">Si cierra esta ventana, se cancelarán las cargas activas.</p>
                <p className="text-[11px] text-red-600 mt-1">Los archivos que no se completaron se perderán y deberá subirlos nuevamente.</p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 pb-5 pt-2">
          <button onClick={onContinuar}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg text-white transition-all hover:opacity-90"
            style={{ background: '#003DA5' }}>
            <Upload className="w-3.5 h-3.5" />Continuar carga
          </button>
          <button onClick={onCancelarYCerrar}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg border-2 border-red-300 text-red-600 bg-white hover:bg-red-50 transition-all">
            <XCircle className="w-3.5 h-3.5" />Cancelar y cerrar
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}

// ─── Sub-componente: Vista previa de documento ───────────────────────────────

function PreviewDocumento({ archivo, procesoId, onClose }: { archivo: Archivo; procesoId: string; onClose: () => void }) {
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [documentMimeType, setDocumentMimeType] = useState<string>(getMimeTypeFromExtension(archivo.extension));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const previewKind = getPreviewKind(archivo.extension);
  const isZip = previewKind === 'zip';
  const isImage = previewKind === 'image';
  const isPdf = previewKind === 'pdf';
  const isVideo = previewKind === 'video';
  const isAudio = previewKind === 'audio';
  const isHtml = previewKind === 'html';

  useEffect(() => {
    let blobUrl: string | null = null;
    let cancelled = false;

    if (isZip) {
      setDocumentUrl(null);
      setError(null);
      setLoading(false);
      return;
    }

    const loadDocument = async () => {
      setLoading(true);
      setError(null);
      setDocumentUrl(null);
      setDocumentMimeType(archivo.fileType || getMimeTypeFromExtension(archivo.extension));

      try {
        if (archivo.urlExterna) {
          if (cancelled) return;
          setDocumentUrl(archivo.urlExterna);
          return;
        }

        const requestUrl = resolveArchivoRequestUrl(archivo, procesoId, true);
        const response = await fetch(requestUrl, {
          method: 'GET',
          credentials: 'include',
          headers: { Accept: '*/*' },
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = `Error ${response.status}: ${response.statusText}`;

          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.message || errorMessage;
          } catch {
            if (errorText) {
              errorMessage = errorText;
            }
          }

          throw new Error(errorMessage);
        }

        const blob = await response.blob();

        if (cancelled) {
          return;
        }

        // Special handling for .docx files
        if (archivo.extension === 'docx') {
          const arrayBuffer = await blob.arrayBuffer();
          try {
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
            const htmlBlob = new Blob([docxHtml], { type: 'text/html' });
            blobUrl = window.URL.createObjectURL(htmlBlob);
            setDocumentUrl(blobUrl);
            setDocumentMimeType('text/html');
          } catch (conversionError) {
            console.error('Error converting DOCX to HTML:', conversionError);
            // Fallback to object tag
            blobUrl = window.URL.createObjectURL(blob);
            setDocumentUrl(blobUrl);
            setDocumentMimeType(blob.type || archivo.fileType || getMimeTypeFromExtension(archivo.extension));
          }
        } else {
          blobUrl = window.URL.createObjectURL(blob);
          setDocumentUrl(blobUrl);
          setDocumentMimeType(blob.type || archivo.fileType || getMimeTypeFromExtension(archivo.extension));
        }
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.message || 'No se pudo cargar el documento');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadDocument();

    return () => {
      cancelled = true;
      if (blobUrl) {
        window.URL.revokeObjectURL(blobUrl);
      }
    };
  }, [archivo.downloadUrl, archivo.extension, archivo.fileType, archivo.id, archivo.urlExterna, isZip, procesoId, reloadKey]);

  const TIPO_META: Record<string, { color: string; bg: string; label: string }> = {
    auto:      { color: '#7C3AED', bg: '#F5F3FF', label: 'Auto'      },
    evidencia: { color: '#D97706', bg: '#FFFBEB', label: 'Evidencia' },
    oficio:    { color: '#0891B2', bg: '#ECFEFF', label: 'Oficio'    },
    acta:      { color: '#DC2626', bg: '#FEF2F2', label: 'Acta'      },
  };
  const meta = TIPO_META[archivo.tipo];

  return (
    <motion.div
      key="preview-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="absolute inset-0 z-[80] flex items-center justify-center p-4 sm:p-5"
      style={{ backgroundColor: 'rgba(15,23,42,0.44)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.96, y: 8, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.96, y: 8, opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="relative w-full flex flex-col overflow-hidden rounded-[30px] border border-slate-200/75 bg-white ring-1 ring-black/5"
        style={{
          maxWidth: 'min(100%, 940px)',
          height: 'min(calc(100% - 24px), 712px)',
          boxShadow: '0 22px 58px rgba(15, 23, 42, 0.20), 0 8px 20px rgba(15, 23, 42, 0.10)',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.985) 0%, rgba(248,250,252,0.97) 100%)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header preview */}
        <div className="flex items-center justify-between px-5 py-3.5 flex-shrink-0 rounded-t-[30px] border-b border-white/10"
          style={{ background: 'linear-gradient(135deg, #003DA5 0%, #1565C0 100%)' }}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
              {isZip
                ? <FileArchive className="w-3.5 h-3.5 text-white" />
                : isImage
                  ? <Image className="w-3.5 h-3.5 text-white" />
                  : <FileText className="w-3.5 h-3.5 text-white" />
              }
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-white truncate">{archivo.nombre}</p>
              <p className="text-[10px] text-white/70 mt-0.5">
                {archivo.firmante} · {archivo.fecha} · {archivo.tamaño} · .{archivo.extension.toUpperCase()}
              </p>
            </div>
          </div>
          <div className="flex items-center flex-shrink-0 ml-3">
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl transition-colors hover:bg-white/12 focus:outline-none focus:ring-2 focus:ring-white/30"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* Área de vista previa */}
        <div className="flex-1 overflow-hidden flex items-center justify-center min-h-0" style={{ minHeight: 380, background: 'linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)' }}>
          {loading ? (
            <div className="flex flex-col items-center gap-4 py-12 px-8 text-center">
              <Loader2 className="w-10 h-10 animate-spin" style={{ color: '#003DA5' }} />
              <div>
                <p className="text-sm font-black text-gray-800 mb-1">Cargando documento</p>
                <p className="text-xs text-gray-500">Se estÃ¡ preparando la vista previa de {archivo.nombre}</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-4 py-12 px-8 text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: '#FEE2E2', border: '2px solid #FCA5A5' }}>
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <div>
                <p className="text-sm font-black text-gray-800 mb-1">No se pudo cargar el documento</p>
                <p className="text-xs text-gray-500 max-w-sm leading-relaxed">{error}</p>
                <p className="text-[11px] text-gray-400 mt-2">Puede cerrar esta vista y usar el boton de descarga del documento.</p>
              </div>
              <button
                type="button"
                onClick={() => setReloadKey(prev => prev + 1)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #003DA5 0%, #1565C0 100%)' }}
              >
                <RefreshCw className="w-4 h-4" />
                Reintentar
              </button>
            </div>
          ) : isZip ? (
            /* ZIP: sin vista disponible */
            <div className="flex flex-col items-center gap-4 py-12 px-8 text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: '#FEF3C7', border: '2px solid #FCD34D' }}>
                <FileArchive className="w-8 h-8" style={{ color: '#D97706' }} />
              </div>
              <div>
                <p className="text-sm font-black text-gray-800 mb-1">No hay vista previa disponible</p>
                <p className="text-xs text-gray-500 max-w-xs leading-relaxed">
                  Los archivos <span className="font-bold text-gray-700">.ZIP</span> no pueden visualizarse directamente. Use el boton de descarga de la lista para acceder a su contenido.
                </p>
              </div>
            </div>
          ) : !documentUrl ? (
            <div className="flex flex-col items-center gap-4 py-12 px-8 text-center">
              <AlertCircle className="w-10 h-10 text-amber-500" />
              <div>
                <p className="text-sm font-black text-gray-800 mb-1">No hay una vista disponible</p>
                <p className="text-xs text-gray-500">No se encontro una URL valida para mostrar este archivo.</p>
              </div>
            </div>
          ) : isImage ? (
            /* Imagen */
            <div className="flex h-full w-full flex-col items-center gap-4 px-5 py-5">
              <div className="relative w-full max-w-5xl rounded-[26px] overflow-hidden border border-slate-200/80 bg-[radial-gradient(circle_at_top,#FFFFFF_0%,#E2E8F0_100%)] shadow-[0_18px_45px_rgba(15,23,42,0.14)] flex items-center justify-center"
                style={{ minHeight: 280 }}>
                <img
                  src={documentUrl}
                  alt={archivo.nombre}
                  className="absolute inset-0 h-full w-full object-contain p-3"
                />
                {/* Placeholder imagen (sin URL real en mock) */}
                <div className="hidden flex-col items-center gap-3 py-12">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: '#FFFBEB', border: '2px solid #FDE68A' }}>
                    <Image className="w-7 h-7" style={{ color: '#D97706' }} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-gray-700">{archivo.nombre}</p>
                    <p className="text-xs text-gray-500 mt-1">Vista previa de imagen · {archivo.tamaño}</p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-[10px] font-bold text-white" style={{ background: '#D97706' }}>
                    .{archivo.extension.toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-gray-500">
                <ZoomIn className="w-3.5 h-3.5" />
                <span>Firmado por: <strong>{archivo.firmante}</strong> · {archivo.fecha}</span>
              </div>
            </div>
          ) : isVideo ? (
            <div className="flex h-full w-full items-center justify-center px-5 py-5">
              <div className="flex h-full w-full max-w-5xl overflow-hidden rounded-[26px] bg-[#020617] shadow-[0_24px_60px_rgba(2,6,23,0.26)] ring-1 ring-black/10">
                <video
                  src={documentUrl}
                  controls
                  className="h-full w-full object-contain"
                  style={{ maxHeight: '100%' }}
                >
                  Tu navegador no soporta la reproduccion de este video.
                </video>
              </div>
            </div>
          ) : isAudio ? (
            <div className="flex flex-col items-center gap-6 py-12 px-8 text-center w-full">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: '#E0EDFF', border: '2px solid #BFDBFE' }}>
                <FileText className="w-8 h-8" style={{ color: '#003DA5' }} />
              </div>
              <div>
                <p className="text-sm font-black text-gray-800 mb-1">{archivo.nombre}</p>
                <p className="text-xs text-gray-500">Reproductor de audio</p>
              </div>
              <audio src={documentUrl} controls className="w-full max-w-xl">
                Tu navegador no soporta la reproduccion de audio.
              </audio>
            </div>
          ) : isPdf ? (
            <div className="h-full w-full px-5 py-5">
              <div className="h-full w-full overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.12)]">
                <iframe
                  src={documentUrl}
                  className="w-full h-full border-0 bg-white"
                  title={`Vista previa de ${archivo.nombre}`}
                />
              </div>
            </div>
          ) : isHtml || (documentMimeType === 'text/html' && archivo.extension === 'docx') ? (
            <div className="h-full w-full px-5 py-5">
              <div className="h-full w-full overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.12)]">
                <iframe
                  src={documentUrl}
                  className="w-full h-full border-0 bg-white"
                  title={`Vista previa de ${archivo.nombre}`}
                  sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                />
              </div>
            </div>
          ) : previewKind === 'office' || previewKind === 'other' ? (
            <div className="h-full w-full px-5 py-5">
              <div className="h-full w-full overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.12)]">
                <object
                  data={documentUrl}
                  type={documentMimeType}
                  className="w-full h-full"
                >
                  <div className="flex flex-col items-center gap-4 py-12 px-8 text-center">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: '#EFF6FF', border: '2px solid #BFDBFE' }}>
                      <FileText className="w-8 h-8" style={{ color: '#003DA5' }} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-gray-800 mb-1">Vista previa limitada en navegador</p>
                      <p className="text-xs text-gray-500 max-w-sm leading-relaxed">
                        Este tipo de archivo no siempre puede mostrarse embebido. Si necesita el archivo completo, use el boton de descarga del documento.
                      </p>
                    </div>
                  </div>
                </object>
              </div>
            </div>
          ) : (
            /* PDF / DOCX / Otros — visor simulado */
            <div className="h-full w-full px-5 py-5" style={{ minHeight: 380 }}>
              <div className="w-full h-full flex flex-col overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.12)]">
              {/* Barra de PDF viewer */}
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-300 bg-gray-200 flex-shrink-0">
                <span className="text-[10px] text-gray-600 font-medium">{archivo.nombre}.{archivo.extension}</span>
                <div className="flex items-center gap-1">
                  {['1', '2', '3'].map(n => (
                    <div key={n} className="w-5 h-5 rounded text-[9px] font-bold flex items-center justify-center bg-white border border-gray-300 text-gray-600">{n}</div>
                  ))}
                  <span className="text-[10px] text-gray-500 ml-1">/ 3</span>
                </div>
              </div>
              {/* Página simulada */}
              <div className="flex-1 overflow-y-auto bg-gray-400 flex items-start justify-center py-4 px-6 gap-4">
                {/* Hoja de papel */}
                <div className="bg-white rounded-sm shadow-xl w-full mx-auto flex flex-col" style={{ maxWidth: 520, minHeight: 340, padding: '2rem' }}>
                  {/* Logo y membrete ESAP */}
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b-2" style={{ borderColor: '#003DA5' }}>
                    <div className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0" style={{ background: '#003DA5' }}>
                      <Scale className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-900 leading-tight">ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA — ESAP</p>
                      <p className="text-[9px] text-gray-500">Oficina de Control Interno Disciplinario</p>
                    </div>
                  </div>
                  {/* Contenido simulado */}
                  <div className="space-y-3 flex-1">
                    <div className="text-center mb-3">
                      <p className="text-[11px] font-black text-gray-900 uppercase">{meta.label}</p>
                      <p className="text-[10px] font-bold" style={{ color: meta.color }}>{archivo.nombre}</p>
                      <p className="text-[9px] text-gray-400 mt-0.5">{archivo.fecha}</p>
                    </div>
                    {[60, 90, 75, 50, 85, 40, 70].map((w, i) => (
                      <div key={i} className="h-1.5 rounded-full bg-gray-200" style={{ width: `${w}%` }} />
                    ))}
                    <div className="h-px bg-gray-200 my-2" />
                    {[55, 80, 65].map((w, i) => (
                      <div key={i} className="h-1.5 rounded-full bg-gray-200" style={{ width: `${w}%` }} />
                    ))}
                  </div>
                  {/* Firma */}
                  <div className="mt-4 pt-3 border-t border-gray-200 text-center">
                    <p className="text-[9px] text-gray-500">Firmado por:</p>
                    <p className="text-[10px] font-bold text-gray-800">{archivo.firmante}</p>
                    <div className="flex items-center justify-center gap-1 mt-1">
                      <span className="px-1.5 py-0.5 text-[8px] font-bold rounded-full text-white" style={{ background: meta.color }}>{meta.label}</span>
                      <span className="text-[8px] text-gray-400">{archivo.tamaño}</span>
                    </div>
                  </div>
                </div>
              </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer preview */}
        <div
          className="flex items-center justify-between px-5 py-3 border-t border-slate-200/70 rounded-b-[30px] bg-white flex-shrink-0"
          style={{ background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)' }}
        >
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[9px] font-bold rounded-full" style={{ backgroundColor: meta.bg, color: meta.color }}>{meta.label}</span>
            <span className="text-[10px] text-gray-500">{archivo.tamaño} · .{archivo.extension.toUpperCase()}</span>
          </div>
          <button type="button" onClick={onClose}
            className="flex items-center gap-1 px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-all">
            <X className="w-3 h-3" />Cerrar vista
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Sub-modal: Confirmar envío a Revisión y Aprobación ───────────────────────

function ModalConfirmarEnvioRevision({
  archivo, proceso, observaciones, onObservacionesChange, onConfirmar, onCancelar,
}: {
  archivo: Archivo;
  proceso: { numeroProceso: string; etapaActual: string; profesionalAsignado?: { nombre: string } };
  observaciones: string;
  onObservacionesChange: (v: string) => void;
  onConfirmar: () => void;
  onCancelar: () => void;
}) {
  console.log('[DEBUG] ModalConfirmarEnvioRevision render archivo:', archivo);
  return createPortal(
    archivo ? (
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center"
        style={{ backgroundColor: 'rgba(0,0,0,0.60)', padding: '4vh 4vw' }}
        onClick={(e) => e.target === e.currentTarget && onCancelar()}
      >
        <motion.div
          key={`modal-confirmar-envio-revision-${archivo.id}`}
          initial={{ opacity: 0, scale: 0.97, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 12 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{ width: '92vw', maxWidth: 540, minHeight: 320 }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-5 pt-5 pb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: '#EFF6FF', border: '2px solid #93C5FD' }}>
              <Send className="w-5 h-5" style={{ color: '#003DA5' }} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-black text-gray-900">Enviar a Revisión y Aprobación</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                El documento será enviado al Jefe OCID para revisión
              </p>
            </div>
            <button onClick={onCancelar}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {/* Información del auto */}
          <div className="px-5 py-3">
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: '#F5F3FF' }}>
                  <Scale className="w-4 h-4" style={{ color: '#7C3AED' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-900 truncate">{archivo.nombre}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {archivo.firmante} · {archivo.fecha} · {archivo.tamaño}
                    {archivo.version && archivo.version > 1 && ` · Versión ${archivo.version}`}
                  </p>
                </div>
              </div>
            </div>

            {/* Flujo visual */}
            <div className="flex items-center gap-2 mt-3 px-1">
              <div className="flex items-center gap-1.5 text-[10px] font-bold" style={{ color: '#7C3AED' }}>
                <FileText className="w-3 h-3" />
                <span>Auto</span>
              </div>
              <div className="flex-1 h-px bg-gray-200 relative">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-gradient-to-r from-purple-300 to-blue-400" />
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold" style={{ color: '#003DA5' }}>
                <Shield className="w-3 h-3" />
                <span>Revisión Jefe OCID</span>
              </div>
              <div className="flex-1 h-px bg-gray-200 relative">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-gradient-to-r from-blue-300 to-green-300" />
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-green-600">
                <CheckCircle className="w-3 h-3" />
                <span>Aprobado</span>
              </div>
            </div>

            {/* Observaciones opcionales */}
            <div className="mt-3">
              <label className="text-[11px] font-bold text-gray-700 mb-1.5 block">
                Observaciones para el revisor <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <textarea
                value={observaciones}
                onChange={(e) => onObservacionesChange(e.target.value)}
                rows={3}
                placeholder="Ej: Se adjuntan todos los documentos soporte. La conducta presunta está claramente configurada..."
                className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 resize-none"
              />
            </div>

            {/* Info box */}
            <div className="mt-3 p-2.5 rounded-lg border" style={{ background: '#FFFBEB', borderColor: '#FCD34D' }}>
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-800 leading-relaxed">
                  Una vez enviado, el documento no podrá ser modificado hasta que el Jefe OCID lo apruebe o devuelva.
                  El estado cambiará a <strong>"En Revisión"</strong> y aparecerá en el módulo <strong>Revisión y Aprobación</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-5 pb-5 pt-2 border-t border-gray-100 mt-auto">
            <button onClick={onCancelar}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-all">
              Cancelar
            </button>
            <button onClick={onConfirmar}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg text-white transition-all hover:opacity-90"
              style={{ background: '#003DA5' }}>
              <Send className="w-3.5 h-3.5" />
              Enviar a Revisión y Aprobación
            </button>
          </div>
        </motion.div>
      </div>
    ) : null,
    document.body
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────

function formatFechaActuacion(fecha?: string | null, withTime = false): string {
  if (!fecha) return 'Sin fecha';

  // Evita el desfase por zona horaria cuando la fecha viene como YYYY-MM-DD.
  const soloFecha = fecha.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const parsed = soloFecha
    ? new Date(Number(soloFecha[1]), Number(soloFecha[2]) - 1, Number(soloFecha[3]))
    : new Date(fecha);

  if (Number.isNaN(parsed.getTime())) return fecha;

  return parsed.toLocaleString(
    'es-CO',
    withTime
      ? { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }
      : { year: 'numeric', month: 'short', day: '2-digit' }
  );
}

function mapActuacionFromApi(actuacion: DisciplinaryProcessActuacion): ActuacionItem {
  return {
    id: actuacion.id,
    fecha: actuacion.fechaActuacion ? actuacion.fechaActuacion.split('T')[0] : '',
    descripcion: actuacion.descripcion,
    tipo: (actuacion.tipo || 'actuacion').toLowerCase(),
    responsable: actuacion.responsableNombre || 'Sin responsable',
    etapa: normalizarEtapaActuacion(actuacion.etapa),
    observaciones: actuacion.observaciones || '',
    createdAt: actuacion.createdAt,
    updatedAt: actuacion.updatedAt,
  };
}

function mapTaskFromApi(task: DisciplinaryProcessTask): TaskItem {
  return {
    id: task.id,
    titulo: task.titulo,
    descripcion: task.descripcion || '',
    prioridad: (task.prioridad || 'media').toLowerCase() as TaskItem['prioridad'],
    completada: Boolean(task.completada),
    etapa: normalizarEtapaActuacion(task.etapa),
    responsable: task.responsableNombre || 'Sin responsable',
    vencimiento: task.fechaVencimiento ? task.fechaVencimiento.split('T')[0] : '',
    fechaCompletada: task.fechaCompletada || null,
    observaciones: task.observaciones || '',
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}

function mapNoteFromApi(note: DisciplinaryProcessNote): NoteItem {
  return {
    id: note.id,
    texto: note.texto,
    fecha: note.createdAt,
    etapa: normalizarEtapaActuacion(note.etapa),
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  };
}

function normalizarFechaInput(fecha: string): string {
  if (!fecha) return new Date().toISOString().split('T')[0];
  return fecha.includes('T') ? fecha.split('T')[0] : fecha;
}

const ETAPA_ACTUACION_LABELS: Record<string, string> = {
  RECEPCION: 'Recepción',
  EVALUACION: 'Valoración',
  VALORACION: 'Valoración',
  INDAGACION: 'Indagación',
  INDAGACION_PREVIA: 'Indagación previa',
  INVESTIGACION: 'Investigación',
  JUZGAMIENTO: 'Juzgamiento',
  FALLO: 'Fallo',
  SEGUNDA_INSTANCIA: 'Segunda instancia',
  SIN_ETAPA: 'Sin etapa',
};

function normalizarEtapaActuacion(etapa?: string | null): string {
  if (!etapa?.trim()) return 'Sin etapa';
  const limpia = etapa.trim();
  const clave = limpia
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .toUpperCase();

  if (ETAPA_ACTUACION_LABELS[clave]) {
    return ETAPA_ACTUACION_LABELS[clave];
  }

  if (clave === 'SIN' || clave === 'NINGUNA') {
    return 'Sin etapa';
  }

  return limpia
    .replace(/_/g, ' ')
    .toLocaleLowerCase('es-CO')
    .replace(/\b\w/g, (letra) => letra.toLocaleUpperCase('es-CO'));
}

const ACTUACION_TYPE_OPTIONS = [
  {
    value: 'actuacion',
    label: 'Actuación',
    hint: 'Registro general del proceso',
    icon: Zap,
    color: '#003DA5',
    bg: '#EAF2FF',
    border: '#B9D0FF',
  },
  {
    value: 'auto',
    label: 'Auto',
    hint: 'Decisión o providencia',
    icon: FileCheck,
    color: '#7C3AED',
    bg: '#F4EEFF',
    border: '#D8C2FF',
  },
  {
    value: 'notificacion',
    label: 'Notificación',
    hint: 'Comunicación formal',
    icon: Bell,
    color: '#0F766E',
    bg: '#E8FFFB',
    border: '#A7F3D0',
  },
  {
    value: 'asignacion',
    label: 'Asignación',
    hint: 'Responsable o reparto',
    icon: Users,
    color: '#C2410C',
    bg: '#FFF1E8',
    border: '#FED7AA',
  },
  {
    value: 'recepcion',
    label: 'Recepción',
    hint: 'Ingreso o radicación',
    icon: Archive,
    color: '#4F46E5',
    bg: '#EEF2FF',
    border: '#C7D2FE',
  },
] as const;

const TASK_PRIORITY_META: Record<TaskItem['prioridad'], { label: string; color: string; bg: string; border: string; icon: any; hint: string }> = {
  alta: {
    label: 'Alta',
    color: '#DC2626',
    bg: '#FEF2F2',
    border: '#FECACA',
    icon: AlertTriangle,
    hint: 'Requiere atencion prioritaria',
  },
  media: {
    label: 'Media',
    color: '#D97706',
    bg: '#FFFBEB',
    border: '#FDE68A',
    icon: Clock,
    hint: 'Seguimiento operativo normal',
  },
  baja: {
    label: 'Baja',
    color: '#059669',
    bg: '#ECFDF5',
    border: '#A7F3D0',
    icon: Shield,
    hint: 'Puede resolverse sin urgencia',
  },
};

function getTaskDueMeta(task: TaskItem): { label: string; color: string; bg: string; border: string } | null {
  if (task.completada || !task.vencimiento) return null;

  const match = task.vencimiento.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return {
      label: 'Pendiente',
      color: '#475569',
      bg: '#F8FAFC',
      border: '#CBD5E1',
    };
  }

  const dueDate = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      label: `Vencida ${Math.abs(diffDays)}d`,
      color: '#B91C1C',
      bg: '#FEF2F2',
      border: '#FECACA',
    };
  }

  if (diffDays === 0) {
    return {
      label: 'Vence hoy',
      color: '#B45309',
      bg: '#FFFBEB',
      border: '#FDE68A',
    };
  }

  if (diffDays <= 3) {
    return {
      label: `Vence ${diffDays}d`,
      color: '#C2410C',
      bg: '#FFF7ED',
      border: '#FDBA74',
    };
  }

  return {
    label: `En ${diffDays}d`,
    color: '#1D4ED8',
    bg: '#EFF6FF',
    border: '#BFDBFE',
  };
}

function ModalNuevaActuacion({
  open,
  etapas,
  etapaActual,
  responsableInicial,
  saving,
  onClose,
  onSubmit,
}: {
  open: boolean;
  etapas: string[];
  etapaActual: string;
  responsableInicial: string;
  saving: boolean;
  onClose: () => void;
  onSubmit: (data: CreateDisciplinaryProcessActuacionDto) => Promise<void>;
}) {
  const etapasNormalizadas = Array.from(
    new Set(
      etapas
        .map((item) => normalizarEtapaActuacion(item))
        .filter(Boolean)
    )
  );
  const etapaActualNormalizada = normalizarEtapaActuacion(etapaActual);
  const [tipo, setTipo] = useState('actuacion');
  const [etapa, setEtapa] = useState(etapaActualNormalizada);
  const [descripcion, setDescripcion] = useState('');
  const [responsableNombre, setResponsableNombre] = useState(responsableInicial);
  const [fechaActuacion, setFechaActuacion] = useState(new Date().toISOString().split('T')[0]);
  const [observaciones, setObservaciones] = useState('');

  useEffect(() => {
    if (!open) return;
    setTipo('actuacion');
    setEtapa(etapaActualNormalizada);
    setDescripcion('');
    setResponsableNombre(responsableInicial);
    setFechaActuacion(new Date().toISOString().split('T')[0]);
    setObservaciones('');
  }, [open, etapaActualNormalizada, responsableInicial]);

  if (!open) return null;

  const tipoSeleccionado = ACTUACION_TYPE_OPTIONS.find((item) => item.value === tipo) || ACTUACION_TYPE_OPTIONS[0];

  const handleSubmit = async () => {
    if (!descripcion.trim()) {
      toast.error('La descripcion es obligatoria');
      return;
    }

    if (!responsableNombre.trim()) {
      toast.error('El responsable es obligatorio');
      return;
    }

    await onSubmit({
      tipo,
      etapa: normalizarEtapaActuacion(etapa),
      descripcion,
      responsableNombre,
      fechaActuacion,
      observaciones,
    });
  };

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="fixed inset-0 flex items-center justify-center"
      style={{
        zIndex: 9999,
        backgroundColor: 'rgba(15, 23, 42, 0.68)',
        padding: '24px',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 12 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="w-full bg-white rounded-[30px] shadow-2xl border border-slate-200 overflow-hidden"
        style={{ maxWidth: 900, maxHeight: '92vh', boxShadow: '0 30px 90px rgba(15, 23, 42, 0.24)', borderRadius: '20px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-r from-blue-50 via-white to-slate-50"
          style={{ borderTopLeftRadius: '20px', borderTopRightRadius: '20px' }}
        >
          <div
            className="absolute inset-x-0 top-0 h-1"
            style={{ background: 'linear-gradient(90deg, #003DA5 0%, #2962FF 55%, #8BB8FF 100%)' }}
          />
          <div className="flex items-start gap-4 px-6 py-6 md:px-7">
            <div
              className="w-12 h-12 rounded-[20px] flex items-center justify-center shadow-sm flex-shrink-0"
              style={{ backgroundColor: '#EAF2FF', border: '1px solid #B9D0FF', borderRadius: '999px' }}
            >
              <tipoSeleccionado.icon className="w-5 h-5" style={{ color: tipoSeleccionado.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-black text-slate-900">Nueva actuación</h3>
                <span
                  className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em]"
                  style={{ color: tipoSeleccionado.color, backgroundColor: tipoSeleccionado.bg, border: `1px solid ${tipoSeleccionado.border}`, borderRadius: '999px' }}
                >
                  {tipoSeleccionado.label}
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Registra una actuación persistente del proceso y actualiza su historial dinámico.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold"
                  style={{ color: '#003DA5', backgroundColor: '#EAF2FF', border: '1px solid #B9D0FF', borderRadius: '999px' }}
                >
                  <Zap className="w-3 h-3" />
                  Etapa actual: {etapaActualNormalizada}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500" style={{ borderRadius: '999px' }}>
                  <Calendar className="w-3 h-3" />
                  Fecha sugerida: {fechaActuacion}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-11 h-11 rounded-[20px] border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:bg-slate-50"
              style={{ borderRadius: '999px' }}
              disabled={saving}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-6 py-6 md:px-7 overflow-y-auto space-y-6" style={{ maxHeight: 'calc(90vh - 184px)' }}>
          <div className="rounded-[26px] border border-blue-100 bg-gradient-to-r from-blue-50/90 to-slate-50 p-5" style={{ borderRadius: '28px' }}>
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-[18px] flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: tipoSeleccionado.bg, border: `1px solid ${tipoSeleccionado.border}`, borderRadius: '999px' }}
              >
                <tipoSeleccionado.icon className="w-4 h-4" style={{ color: tipoSeleccionado.color }} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Contexto del registro</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  La actuación quedará asociada al proceso y se reflejará en la tarjeta del kanban.
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Usa un tipo claro, una descripción concreta y la etapa procesal correcta.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Tipo de actuación</span>
              <span className="text-[11px] font-semibold text-slate-400">Selecciona la categoría que mejor describa el registro</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2.5">
              {ACTUACION_TYPE_OPTIONS.map((option) => {
                const activo = tipo === option.value;
                const Icon = option.icon;
                return (
                  <motion.button
                    key={option.value}
                    type="button"
                    onClick={() => setTipo(option.value)}
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.985 }}
                    transition={{ duration: 0.15 }}
                    className="rounded-[24px] border px-3.5 py-3.5 text-left transition-all"
                    style={{
                      backgroundColor: activo ? option.bg : '#FFFFFF',
                      borderColor: activo ? option.border : '#E2E8F0',
                      boxShadow: activo ? `0 0 0 1px ${option.border}, 0 10px 24px ${option.color}14` : 'none',
                      borderRadius: '24px',
                    }}
                  >
                    <div className="flex items-start gap-2.5">
                      <div
                        className="mt-0.5 w-9 h-9 rounded-[14px] flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: activo ? '#FFFFFF' : option.bg, border: `1px solid ${option.border}`, borderRadius: '14px' }}
                      >
                        <Icon className="w-4 h-4" style={{ color: option.color }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black" style={{ color: activo ? option.color : '#0F172A' }}>{option.label}</p>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">{option.hint}</p>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-4">
            <label className="space-y-1.5">
              <span className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Etapa del proceso</span>
              <div className="relative">
                <select
                  value={etapa}
                  onChange={(e) => setEtapa(normalizarEtapaActuacion(e.target.value))}
                  className="w-full appearance-none rounded-[22px] border border-slate-200 bg-white px-4 py-3.5 pr-10 text-sm font-semibold text-slate-800 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                  style={{ borderRadius: '22px' }}
                >
                  {etapasNormalizadas.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
                <ChevronRight className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-slate-400" />
              </div>
            </label>

            <label className="space-y-1.5">
              <span className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Fecha de la actuación</span>
              <input
                type="date"
                value={fechaActuacion}
                onChange={(e) => setFechaActuacion(normalizarFechaInput(e.target.value))}
                className="w-full rounded-[22px] border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-800 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                style={{ borderRadius: '22px' }}
              />
            </label>
          </div>

          <label className="space-y-1.5 block">
            <span className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Descripción</span>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={5}
              placeholder="Describe la actuación realizada, el motivo y el resultado esperado."
              className="w-full rounded-[24px] border border-slate-200 bg-white px-4 py-4 text-sm text-slate-800 outline-none resize-y transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
              style={{ borderRadius: '24px' }}
            />
            <p className="text-[11px] text-slate-400">Este texto alimenta el historial y la última actuación visible del proceso.</p>
          </label>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <label className="space-y-1.5">
              <span className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Responsable</span>
              <input
                value={responsableNombre}
                onChange={(e) => setResponsableNombre(e.target.value)}
                className="w-full rounded-[22px] border border-slate-200 bg-white px-4 py-3.5 text-sm font-medium text-slate-800 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                style={{ borderRadius: '22px' }}
                placeholder="Nombre del profesional o responsable"
              />
              <p className="text-[11px] text-slate-400">Se usará como responsable visible en la línea de tiempo.</p>
            </label>

            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5" style={{ borderRadius: '24px' }}>
              <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Resumen del registro</p>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">Tipo</span>
                  <span className="font-bold" style={{ color: tipoSeleccionado.color }}>{tipoSeleccionado.label}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">Etapa</span>
                  <span className="font-bold text-slate-800">{etapa}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">Fecha</span>
                  <span className="font-bold text-slate-800">{fechaActuacion}</span>
                </div>
              </div>
            </div>
          </div>

          <label className="space-y-1.5 block">
            <span className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Observaciones</span>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={3}
              placeholder="Campo opcional para dejar contexto adicional del registro."
              className="w-full rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-800 outline-none resize-y transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
              style={{ borderRadius: '24px' }}
            />
          </label>
        </div>

        <div
          className="flex items-center justify-end gap-2 px-6 py-5 md:px-7 border-t border-slate-200 bg-slate-50"
          style={{ borderBottomLeftRadius: '32px', borderBottomRightRadius: '32px' }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-5 py-2.5 rounded-[20px] border border-slate-300 text-sm font-semibold text-slate-600 hover:bg-white disabled:opacity-60"
            style={{ borderRadius: '999px' }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2.5 rounded-[20px] text-sm font-bold text-white inline-flex items-center gap-2 disabled:opacity-70"
            style={{ background: 'linear-gradient(135deg, #003DA5 0%, #2962FF 100%)', borderRadius: '999px' }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Guardar actuación
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}

function ModalNuevaTarea({
  open,
  etapas,
  etapaActual,
  profesionales,
  loadingProfesionales,
  responsableInicial,
  saving,
  onClose,
  onSubmit,
  onEnsureProfesionales,
}: {
  open: boolean;
  etapas: string[];
  etapaActual: string;
  profesionales: any[];
  loadingProfesionales: boolean;
  responsableInicial: string;
  saving: boolean;
  onClose: () => void;
  onSubmit: (data: CreateDisciplinaryProcessTaskDto) => Promise<void>;
  onEnsureProfesionales?: () => void | Promise<void>;
}) {
  const etapasNormalizadas = Array.from(
    new Set(
      etapas
        .map((item) => normalizarEtapaActuacion(item))
        .filter(Boolean)
    )
  );
  const etapaActualNormalizada = normalizarEtapaActuacion(etapaActual);
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [prioridad, setPrioridad] = useState<TaskItem['prioridad']>('media');
  const [etapa, setEtapa] = useState(etapaActualNormalizada);
  const [responsableNombre, setResponsableNombre] = useState(responsableInicial);
  const [fechaVencimiento, setFechaVencimiento] = useState(new Date().toISOString().split('T')[0]);
  const [observaciones, setObservaciones] = useState('');

  useEffect(() => {
    if (!open) return;
    setTitulo('');
    setDescripcion('');
    setPrioridad('media');
    setEtapa(etapaActualNormalizada);
    setResponsableNombre(responsableInicial);
    setFechaVencimiento(new Date().toISOString().split('T')[0]);
    setObservaciones('');
  }, [open, etapaActualNormalizada, responsableInicial]);

  useEffect(() => {
    if (!open) return;
    if (profesionales.length > 0) return;
    void onEnsureProfesionales?.();
  }, [open, profesionales.length, onEnsureProfesionales]);

  if (!open) return null;

  const prioridadMeta = TASK_PRIORITY_META[prioridad];
  const PriorityIcon = prioridadMeta.icon;

  const handleSubmit = async () => {
    if (!titulo.trim()) {
      toast.error('El titulo de la tarea es obligatorio');
      return;
    }

    if (!responsableNombre.trim()) {
      toast.error('El responsable es obligatorio');
      return;
    }

    if (!fechaVencimiento) {
      toast.error('La fecha de vencimiento es obligatoria');
      return;
    }

    await onSubmit({
      titulo,
      descripcion,
      prioridad,
      etapa: normalizarEtapaActuacion(etapa),
      responsableNombre,
      fechaVencimiento,
      observaciones,
    });
  };

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="fixed inset-0 flex items-center justify-center"
      style={{
        zIndex: 9999,
        backgroundColor: 'rgba(15, 23, 42, 0.68)',
        padding: '24px',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 12 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="w-full bg-white rounded-[30px] shadow-2xl border border-slate-200 overflow-hidden"
        style={{ maxWidth: 920, maxHeight: '92vh', boxShadow: '0 30px 90px rgba(15, 23, 42, 0.24)', borderRadius: '20px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-r from-blue-50 via-white to-slate-50"
          style={{ borderTopLeftRadius: '20px', borderTopRightRadius: '20px' }}
        >
          <div
            className="absolute inset-x-0 top-0 h-1"
            style={{ background: 'linear-gradient(90deg, #003DA5 0%, #2962FF 55%, #8BB8FF 100%)' }}
          />
          <div className="flex items-start gap-4 px-6 py-6 md:px-7">
            <div
              className="w-12 h-12 rounded-[20px] flex items-center justify-center shadow-sm flex-shrink-0"
              style={{ backgroundColor: '#EAF2FF', border: '1px solid #B9D0FF', borderRadius: '999px' }}
            >
              <ClipboardList className="w-5 h-5" style={{ color: '#003DA5' }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-black text-slate-900">Nueva tarea</h3>
                <span
                  className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em]"
                  style={{ color: prioridadMeta.color, backgroundColor: prioridadMeta.bg, border: `1px solid ${prioridadMeta.border}`, borderRadius: '999px' }}
                >
                  Prioridad {prioridadMeta.label}
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Registra una tarea persistente del proceso y permite controlar su cumplimiento.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold"
                  style={{ color: '#003DA5', backgroundColor: '#EAF2FF', border: '1px solid #B9D0FF', borderRadius: '999px' }}
                >
                  <Zap className="w-3 h-3" />
                  Etapa actual: {etapaActualNormalizada}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500" style={{ borderRadius: '999px' }}>
                  <Calendar className="w-3 h-3" />
                  Vence: {fechaVencimiento}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-11 h-11 rounded-[20px] border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:bg-slate-50"
              style={{ borderRadius: '999px' }}
              disabled={saving}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-6 py-6 md:px-7 overflow-y-auto space-y-6" style={{ maxHeight: 'calc(90vh - 184px)' }}>
          <div className="rounded-[26px] border border-blue-100 bg-gradient-to-r from-blue-50/90 to-slate-50 p-5" style={{ borderRadius: '28px' }}>
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-[18px] flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: prioridadMeta.bg, border: `1px solid ${prioridadMeta.border}`, borderRadius: '999px' }}
              >
                <PriorityIcon className="w-4 h-4" style={{ color: prioridadMeta.color }} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Contexto de la tarea</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  La tarea quedara vinculada al proceso y podra marcarse como completada desde esta misma pestana.
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Define un titulo claro, prioridad, fecha de vencimiento y contexto operativo suficiente.
                </p>
              </div>
            </div>
          </div>

          <label className="space-y-1.5 block">
            <span className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Titulo de la tarea</span>
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="w-full rounded-[22px] border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-800 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
              style={{ borderRadius: '22px' }}
              placeholder="Ej: Solicitar antecedentes disciplinarios"
            />
          </label>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Prioridad</span>
              <span className="text-[11px] font-semibold text-slate-400">Selecciona el nivel de atencion requerido</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {(Object.entries(TASK_PRIORITY_META) as Array<[TaskItem['prioridad'], typeof TASK_PRIORITY_META[TaskItem['prioridad']]]>).map(([value, meta]) => {
                const activo = prioridad === value;
                const Icon = meta.icon;
                return (
                  <motion.button
                    key={value}
                    type="button"
                    onClick={() => setPrioridad(value)}
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.985 }}
                    transition={{ duration: 0.15 }}
                    className="rounded-[24px] border px-3.5 py-3.5 text-left transition-all"
                    style={{
                      backgroundColor: activo ? meta.bg : '#FFFFFF',
                      borderColor: activo ? meta.border : '#E2E8F0',
                      boxShadow: activo ? `0 0 0 1px ${meta.border}, 0 10px 24px ${meta.color}14` : 'none',
                      borderRadius: '24px',
                    }}
                  >
                    <div className="flex items-start gap-2.5">
                      <div
                        className="mt-0.5 w-9 h-9 rounded-[14px] flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: activo ? '#FFFFFF' : meta.bg, border: `1px solid ${meta.border}`, borderRadius: '14px' }}
                      >
                        <Icon className="w-4 h-4" style={{ color: meta.color }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black" style={{ color: activo ? meta.color : '#0F172A' }}>{meta.label}</p>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">{meta.hint}</p>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <label className="space-y-1.5">
              <span className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Etapa del proceso</span>
              <div className="relative">
                <select
                  value={etapa}
                  onChange={(e) => setEtapa(normalizarEtapaActuacion(e.target.value))}
                  className="w-full appearance-none rounded-[22px] border border-slate-200 bg-white px-4 py-3.5 pr-10 text-sm font-semibold text-slate-800 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                  style={{ borderRadius: '22px' }}
                >
                  {etapasNormalizadas.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
                <ChevronRight className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-slate-400" />
              </div>
            </label>

            <label className="space-y-1.5">
              <span className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Fecha de vencimiento</span>
              <input
                type="date"
                value={fechaVencimiento}
                onChange={(e) => setFechaVencimiento(normalizarFechaInput(e.target.value))}
                className="w-full rounded-[22px] border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-800 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                style={{ borderRadius: '22px' }}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <label className="space-y-1.5 block">
              <span className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Descripcion</span>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={5}
                placeholder="Explica que se debe hacer, con que criterio o soporte."
                className="w-full rounded-[24px] border border-slate-200 bg-white px-4 py-4 text-sm text-slate-800 outline-none resize-y transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                style={{ borderRadius: '24px' }}
              />
            </label>

            <div className="space-y-4">
              <label className="space-y-1.5 block">
                <span className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Responsable</span>
                <div className="relative">
                  <select
                    value={responsableNombre}
                    onChange={(e) => setResponsableNombre(e.target.value)}
                    disabled={loadingProfesionales}
                    className="w-full appearance-none rounded-[22px] border border-slate-200 bg-white px-4 py-3.5 pr-10 text-sm font-medium text-slate-800 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-50 disabled:opacity-60"
                    style={{ borderRadius: '22px' }}
                  >
                    <option value="">Seleccionar responsable</option>
                    {profesionales.map((prof, index) => {
                      const displayName = prof.nombre || prof.nombreCompleto || prof.name || `Profesional ${prof.id || index}`;
                      return (
                        <option key={prof.id || index} value={displayName}>
                          {displayName}
                        </option>
                      );
                    })}
                  </select>
                  <ChevronRight className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-slate-400" />
                  {loadingProfesionales && (
                    <Loader2 className="absolute right-8 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
                  )}
                </div>
              </label>

              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5" style={{ borderRadius: '24px' }}>
                <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Resumen</p>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">Prioridad</span>
                    <span className="font-bold" style={{ color: prioridadMeta.color }}>{prioridadMeta.label}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">Etapa</span>
                    <span className="font-bold text-slate-800">{etapa}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">Vence</span>
                    <span className="font-bold text-slate-800">{fechaVencimiento}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <label className="space-y-1.5 block">
            <span className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Observaciones</span>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={3}
              placeholder="Campo opcional para dejar un contexto adicional o criterio de seguimiento."
              className="w-full rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-800 outline-none resize-y transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
              style={{ borderRadius: '24px' }}
            />
          </label>
        </div>

        <div
          className="flex items-center justify-end gap-2 px-6 py-5 md:px-7 border-t border-slate-200 bg-slate-50"
          style={{ borderBottomLeftRadius: '32px', borderBottomRightRadius: '32px' }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-5 py-2.5 rounded-[20px] border border-slate-300 text-sm font-semibold text-slate-600 hover:bg-white disabled:opacity-60"
            style={{ borderRadius: '999px' }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2.5 rounded-[20px] text-sm font-bold text-white inline-flex items-center gap-2 disabled:opacity-70"
            style={{ background: 'linear-gradient(135deg, #003DA5 0%, #2962FF 100%)', borderRadius: '999px' }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Guardar tarea
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}

export function ModalDetallesProceso({
  proceso, onClose, onReabrir,
  onGestionAutos, onGestionEvidencias, onGestionOficios, onGestionActas,
  onHistorial, onExpediente, onActualizarProceso,
  onEnviarARevision, onNavigateToRevision,
}: ModalDetallesProcesoProps) {
  const [tabActiva, setTabActiva] = useState<Tab>('general');
  const [busqueda,  setBusqueda]  = useState('');
  const [filtro,    setFiltro]    = useState<'TODOS' | 'auto' | 'evidencia' | 'oficio' | 'acta'>('TODOS');
  const [filtroEtapa, setFiltroEtapa] = useState<string>('TODAS');
  const [vistaAgrupada, setVistaAgrupada] = useState(false);
  const [filtroEtapaAct, setFiltroEtapaAct] = useState<string>('TODAS');
  const [vistaAgrupadaAct, setVistaAgrupadaAct] = useState(false);
  const [filtroEtapaTar, setFiltroEtapaTar] = useState<string>('TODAS');
  const [vistaAgrupadaTar, setVistaAgrupadaTar] = useState(false);
  const [filtroEtapaNota, setFiltroEtapaNota] = useState<string>('TODAS');
  const [vistaAgrupadaNota, setVistaAgrupadaNota] = useState(false);
  const [notaTexto, setNotaTexto] = useState('');
  const [notas, setNotas] = useState<NoteItem[]>([]);
  const [notasLoading, setNotasLoading] = useState(false);
  const [notasError, setNotasError] = useState<string | null>(null);
  const [creandoNota, setCreandoNota] = useState(false);
  const [notaPendienteEliminarId, setNotaPendienteEliminarId] = useState<string | null>(null);
  const [eliminandoNotaId, setEliminandoNotaId] = useState<string | null>(null);
  const [noticiasAsociadas, setNoticiasAsociadas] = useState<any[]>([]);
  const [noticiasAsociadasLoading, setNoticiasAsociadasLoading] = useState(false);
  const [noticiasAsociadasError, setNoticiasAsociadasError] = useState<string | null>(null);
  const [previewArchivo, setPreviewArchivo] = useState<Archivo | null>(null);
  const [cargasActivas, setCargasActivas] = useState<CargaActiva[]>([]);
  const [mostrarAlertaCierre, setMostrarAlertaCierre] = useState(false);
  const [archivosSubidos, setArchivosSubidos] = useState<Archivo[]>([]);
  const [archivosBackend, setArchivosBackend] = useState<Archivo[]>([]);
  const [noticia, setNoticia] = useState<ApiNoticia | null>(null);
  const [actuaciones, setActuaciones] = useState<ActuacionItem[]>([]);
  const [actuacionesLoading, setActuacionesLoading] = useState(false);
  const [actuacionesError, setActuacionesError] = useState<string | null>(null);
  const [actuacionExpandidaId, setActuacionExpandidaId] = useState<string | null>(null);
  const [mostrarModalNuevaActuacion, setMostrarModalNuevaActuacion] = useState(false);
  const [creandoActuacion, setCreandoActuacion] = useState(false);
  const [tareas, setTareas] = useState<TaskItem[]>([]);
  const [tareasLoading, setTareasLoading] = useState(false);
  const [tareasError, setTareasError] = useState<string | null>(null);
  const [tareaExpandidaId, setTareaExpandidaId] = useState<string | null>(null);
  const [mostrarModalNuevaTarea, setMostrarModalNuevaTarea] = useState(false);
  const [profesionales, setProfesionales] = useState<any[]>([]);
  const [loadingProfesionales, setLoadingProfesionales] = useState(false);
  const [creandoTarea, setCreandoTarea] = useState(false);
  const [actualizandoTareaId, setActualizandoTareaId] = useState<string | null>(null);
  const [mostrarModalReasignar, setMostrarModalReasignar] = useState(false);
  const [mostrarModalPliego, setMostrarModalPliego] = useState(false);
  const [mostrarModalEnvioJuridica, setMostrarModalEnvioJuridica] = useState(false);
  const [enviandoJuridica, setEnviandoJuridica] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [autoEnviarRevision, setAutoEnviarRevision] = useState<Archivo | null>(null);
  const [autoRecargar, setAutoRecargar] = useState<Archivo | null>(null);
  const [autoEnRevisionModal, setAutoEnRevisionModal] = useState<BorradorPendiente | null>(null);
  const [observacionesEnvio, setObservacionesEnvio] = useState('');
  const [busquedaGlobal, setBusquedaGlobal] = useState('');
  const inputArchivoRef = useRef<HTMLInputElement>(null);
  const inputRecargarRef = useRef<HTMLInputElement>(null);
  const cargasRef = useRef<CargaActiva[]>([]);
  const colaCargasRef = useRef<Promise<void>>(Promise.resolve());
  const cancelarPendientesRef = useRef(false);
  const cargandoProfesionalesRef = useRef(false);
  const mountedRef = useRef(false);
  const [archivosEnColaCount, setArchivosEnColaCount] = useState(0);
  cargasRef.current = cargasActivas;
  const currentUser = authService.getCurrentUser();
  const usuarioCargaActual = currentUser?.fullName
    || [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(' ').trim()
    || currentUser?.email
    || 'Sistema';

  // ═══ Cargar noticia asociada ═══
  useEffect(() => {
    console.log('[ModalDetallesProceso] useEffect ejecutándose, proceso:', proceso?.id);
    if (!proceso?.id) {
      console.log('[ModalDetallesProceso] No hay proceso.id, limpiando noticia');
      setNoticia(null);
      return;
    }

    console.log('[ModalDetallesProceso] Cargando noticia para proceso:', proceso.id);
    disciplinaryService.getAssociatedNewsToProcess(proceso.id)
      .then((noticias) => {
        console.log('[ModalDetallesProceso] ✅ API llamada exitosa, noticias recibidas:', noticias);
        // Asumimos que hay solo una noticia asociada
        const noticiaRecibida = noticias[0] || null;
        console.log('[ModalDetallesProceso] Noticia seleccionada:', noticiaRecibida);
        if (noticiaRecibida) {
          console.log('[ModalDetallesProceso] Campos de noticia:', {
            id: noticiaRecibida.id,
            radicado: noticiaRecibida.radicado,
            origen: noticiaRecibida.origen,
            hechos: noticiaRecibida.hechos,
            disciplinable: noticiaRecibida.disciplinable,
            denunciante: noticiaRecibida.denunciante,
            territorial: noticiaRecibida.territorial,
            dependenciaDenunciado: noticiaRecibida.dependenciaDenunciado,
            fechaQueja: noticiaRecibida.fechaQueja,
            fechaRecepcion: noticiaRecibida.fechaRecepcion,
            fechaHechos: noticiaRecibida.fechaHechos
          });
        } else {
          console.log('[ModalDetallesProceso] ⚠️ No hay noticia asociada para este proceso');
        }
        setNoticia(noticiaRecibida);
      })
      .catch((err) => {
        console.error('[ModalDetallesProceso] ❌ Error cargando noticia:', err);
        console.error('[ModalDetallesProceso] Detalles del error:', {
          message: err?.message,
          status: err?.status,
          response: err?.response
        });
        setNoticia(null);
      });
  }, [proceso?.id]);

  // ═══ Persistencia de filtros en localStorage ═══
  const STORAGE_KEY = `mdp_filtros_${proceso.numeroProceso}`;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const s = JSON.parse(saved);
      if (s.filtro) setFiltro(s.filtro);
      if (s.filtroEtapa) setFiltroEtapa(s.filtroEtapa);
      if (s.vistaAgrupada !== undefined) setVistaAgrupada(s.vistaAgrupada);
      if (s.filtroEtapaAct) setFiltroEtapaAct(s.filtroEtapaAct);
      if (s.vistaAgrupadaAct !== undefined) setVistaAgrupadaAct(s.vistaAgrupadaAct);
      if (s.filtroEtapaTar) setFiltroEtapaTar(s.filtroEtapaTar);
      if (s.vistaAgrupadaTar !== undefined) setVistaAgrupadaTar(s.vistaAgrupadaTar);
      if (s.filtroEtapaNota) setFiltroEtapaNota(s.filtroEtapaNota);
      if (s.vistaAgrupadaNota !== undefined) setVistaAgrupadaNota(s.vistaAgrupadaNota);
      if (s.tabActiva) setTabActiva(s.tabActiva);
    } catch { /* ignorar errores de parse */ }
  }, []); // Solo al montar

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        filtro, filtroEtapa, vistaAgrupada,
        filtroEtapaAct, vistaAgrupadaAct,
        filtroEtapaTar, vistaAgrupadaTar,
        filtroEtapaNota, vistaAgrupadaNota,
        tabActiva,
      }));
    } catch { /* quota excedida — ignorar */ }
  }, [filtro, filtroEtapa, vistaAgrupada, filtroEtapaAct, vistaAgrupadaAct, filtroEtapaTar, vistaAgrupadaTar, filtroEtapaNota, vistaAgrupadaNota, tabActiva, STORAGE_KEY]);

  const cargarDocumentosExpediente = useCallback(async () => {
    if (!proceso?.id) {
      setArchivosBackend([]);
      return;
    }

    try {
      const res = await disciplinaryService.getDocumentosExpediente(proceso.id);
      const mapped: Archivo[] = (res.documentos || []).map((doc: any) => {
        const ext = (doc.archivoNombre || doc.nombre || '').split('.').pop()?.toLowerCase() || 'pdf';
        const tipoValido = (['auto', 'evidencia', 'oficio', 'acta'] as const).includes(doc.tipo)
          ? doc.tipo as 'auto' | 'evidencia' | 'oficio' | 'acta'
          : 'evidencia';
        const estadoAuto = doc.metadatos?.estado;
        const estado: Archivo['estado'] = estadoAuto === 'FIRMADO' || estadoAuto === 'NOTIFICADO' || estadoAuto === 'APROBADO'
          ? 'aprobado'
          : estadoAuto === 'EN_REVISION' || estadoAuto === 'REVISION_JEFE' ? 'en_revision'
          : estadoAuto === 'DEVUELTO' ? 'devuelto'
          : estadoAuto === 'BORRADOR' ? 'borrador'
          : 'aprobado';
        return {
          id: doc.id,
          nombre: doc.metadatos?.tipoAuto || doc.nombre,
          numero: doc.metadatos?.numero || undefined,
          tipo: tipoValido,
          fecha: doc.fechaCarga ? doc.fechaCarga.split('T')[0] : '',
          firmante: doc.usuarioCarga || 'Sistema',
          estado,
          tamaño: doc.tamano || formatBytes(doc.fileSize || 0),
          extension: ext as Extension,
          version: doc.version || 1,
          etapaProceso: doc.etapa,
          downloadUrl: doc.downloadUrl || null,
          urlExterna: doc.urlExterna || null,
          archivoNombre: doc.archivoNombre || doc.nombre,
          fileType: doc.fileType || null,
        };
      });

      // ═══ Incluir archivos adjuntos de la noticia ═══ no se lo trporque duplica la evidencia
      console.log('[ModalDetallesProceso] archivosAdjuntos recibidos:', proceso.archivosAdjuntos);
      const archivosNoticia: Archivo[] = (proceso.archivosAdjuntos || []).map((adj, index) => {
        const ext = adj.nombre.split('.').pop()?.toLowerCase() || 'pdf';
        const url = adj.url || noticia?.adjuntos?.[index] || null;
        console.log('[ModalDetallesProceso] evidencia noticia', index, { nombre: adj.nombre, url, adj });
        return {
          id: `noticia-${index}`,
          nombre: adj.nombre,
          tipo: 'evidencia' as const,
          fecha: adj.fechaSubida,
          firmante: 'Archivo de la noticia',
          estado: 'aprobado' as const,
          tamaño: formatBytes(adj.tamano),
          extension: ext as Extension,
          version: 1,
          etapaProceso: 'Recepción',
          downloadUrl: url,
          urlExterna: url,
          archivoNombre: adj.nombre,
          fileType: null,
        };
      });

      console.log('[ModalDetallesProceso] total archivos:', mapped.length, ' + noticia:', archivosNoticia.length);
      setArchivosBackend(mapped);
    } catch (err) {
      console.error('[ModalDetallesProceso] Error cargando documentos:', err);
      setArchivosBackend([]);
    }
  }, [proceso?.id, noticia]);

  // ═══ Cargar documentos del expediente desde el backend ═══
  useEffect(() => {
    void cargarDocumentosExpediente();
  }, [cargarDocumentosExpediente]);

  useEffect(() => {
    if (!proceso?.id) return;

    let cancelled = false;
    setActuacionesLoading(true);
    setActuacionesError(null);

    disciplinaryService.getActuacionesProceso(proceso.id)
      .then((data) => {
        if (cancelled) return;
        const mapped = (data || []).map(mapActuacionFromApi);
        setActuaciones(mapped);
        setActuacionExpandidaId(mapped[0]?.id || null);

        const ultima = mapped[0]?.descripcion || 'Sin actuaciones registradas';
        onActualizarProceso?.({
          ultimaActuacion: ultima,
        });
      })
      .catch((error: any) => {
        if (cancelled) return;
        console.error('[ModalDetallesProceso] Error cargando actuaciones:', error);
        setActuaciones([]);
        setActuacionExpandidaId(null);
        setActuacionesError(error?.message || 'No fue posible cargar las actuaciones');
      })
      .finally(() => {
        if (!cancelled) {
          setActuacionesLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [proceso?.id]);

  useEffect(() => {
    if (!proceso?.id) return;

    let cancelled = false;
    setTareasLoading(true);
    setTareasError(null);

    disciplinaryService.getTareasProceso(proceso.id)
      .then((data) => {
        if (cancelled) return;
        const mapped = (data || []).map(mapTaskFromApi);
        setTareas(mapped);
        setTareaExpandidaId(mapped.find((item) => !item.completada)?.id || mapped[0]?.id || null);
      })
      .catch((error: any) => {
        if (cancelled) return;
        console.error('[ModalDetallesProceso] Error cargando tareas:', error);
        setTareas([]);
        setTareaExpandidaId(null);
        setTareasError(error?.message || 'No fue posible cargar las tareas');
      })
      .finally(() => {
        if (!cancelled) {
          setTareasLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [proceso?.id]);

  useEffect(() => {
    if (!proceso?.id) return;

    let cancelled = false;
    setNotasLoading(true);
    setNotasError(null);

    disciplinaryService.getNotasProceso(proceso.id)
      .then((data) => {
        if (cancelled) return;
        const mapped = (data || []).map(mapNoteFromApi);
        setNotas(mapped);
      })
      .catch((error: any) => {
        if (cancelled) return;
        console.error('[ModalDetallesProceso] Error cargando notas:', error);
        setNotas([]);
        setNotasError(error?.message || 'No fue posible cargar las notas');
      })
      .finally(() => {
        if (!cancelled) {
          setNotasLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [proceso?.id]);

  useEffect(() => {
    if (!proceso?.id) return;

    let cancelled = false;
    setNoticiasAsociadasLoading(true);
    setNoticiasAsociadasError(null);

    disciplinaryService.getAssociatedNewsToProcess(proceso.id)
      .then((data) => {
        if (cancelled) return;
        setNoticiasAsociadas(data || []);
      })
      .catch((error: any) => {
        if (cancelled) return;
        console.error('[ModalDetallesProceso] Error cargando noticias asociadas:', error);
        setNoticiasAsociadas([]);
        setNoticiasAsociadasError(error?.message || 'No fue posible cargar las noticias asociadas');
      })
      .finally(() => {
        if (!cancelled) {
          setNoticiasAsociadasLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [proceso?.id]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const ensureProfesionales = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (cargandoProfesionalesRef.current) return;
    cargandoProfesionalesRef.current = true;
    if (mountedRef.current) setLoadingProfesionales(true);

    try {
      const response = await disciplinaryService.getProfesionales();
      let profs = response;
      if (!Array.isArray(response)) {
        if (response?.data && Array.isArray(response.data)) {
          profs = response.data;
        } else if (response?.data?.data && Array.isArray(response.data.data)) {
          profs = response.data.data;
        } else {
          profs = [];
        }
      }
      if (mountedRef.current) setProfesionales(profs);
    } catch (error) {
      console.error('[ModalDetallesProceso] Error cargando profesionales:', error);
      if (!silent) {
        toast.error('No se pudieron cargar los profesionales disponibles');
      }
    } finally {
      cargandoProfesionalesRef.current = false;
      if (mountedRef.current) setLoadingProfesionales(false);
    }
  }, []);

  // ═══ Pre-cargar profesionales para creación de tareas ═══
  useEffect(() => {
    if (!proceso?.id) return;

    if (profesionales.length > 0) return;
    void ensureProfesionales({ silent: true });
  }, [proceso?.id, profesionales.length, ensureProfesionales]);

  // ═══ Navegación rápida desde Scorecard ═══
  const navigateToTab = useCallback((tab: Tab, etapa: string) => {
    setTabActiva(tab);
    if (tab === 'archivos')    { setFiltroEtapa(etapa);     setVistaAgrupada(false); }
    if (tab === 'actuaciones') { setFiltroEtapaAct(etapa);  setVistaAgrupadaAct(false); }
    if (tab === 'tareas')      { setFiltroEtapaTar(etapa);  setVistaAgrupadaTar(false); }
    if (tab === 'notas')       { setFiltroEtapaNota(etapa); setVistaAgrupadaNota(false); }
  }, []);

  const handleCrearActuacion = useCallback(async (data: CreateDisciplinaryProcessActuacionDto) => {
    if (!proceso?.id) return;

    try {
      setCreandoActuacion(true);
      const created = await disciplinaryService.createActuacionProceso(proceso.id, data);
      const mapped = mapActuacionFromApi(created);
      let nextActuaciones: ActuacionItem[] = [];

      setActuaciones((prev) => {
        nextActuaciones = [mapped, ...prev].sort((a, b) => `${b.fecha} ${b.id}`.localeCompare(`${a.fecha} ${a.id}`));
        return nextActuaciones;
      });

      setActuacionesError(null);
      setActuacionExpandidaId(mapped.id);
      setMostrarModalNuevaActuacion(false);
      setTabActiva('actuaciones');
      onActualizarProceso?.({
        ultimaActuacion: nextActuaciones[0]?.descripcion || mapped.descripcion,
      });
      toast.success('Actuacion creada correctamente');
    } catch (error: any) {
      console.error('[ModalDetallesProceso] Error creando actuacion:', error);
      toast.error(error?.message || 'No fue posible crear la actuacion');
    } finally {
      setCreandoActuacion(false);
    }
  }, [proceso?.id, onActualizarProceso]);

  const handleCrearTarea = useCallback(async (data: CreateDisciplinaryProcessTaskDto) => {
    if (!proceso?.id) return;

    try {
      setCreandoTarea(true);
      const created = await disciplinaryService.createTareaProceso(proceso.id, data);
      const mapped = mapTaskFromApi(created);
      let nextTasks: TaskItem[] = [];

      setTareas((prev) => {
        nextTasks = [mapped, ...prev].sort((a, b) => {
          if (a.completada !== b.completada) return Number(a.completada) - Number(b.completada);
          const diff = a.vencimiento.localeCompare(b.vencimiento);
          if (diff !== 0) return diff;
          return `${b.createdAt || ''}${b.id}`.localeCompare(`${a.createdAt || ''}${a.id}`);
        });
        return nextTasks;
      });

      setTareasError(null);
      setTareaExpandidaId(mapped.id);
      setMostrarModalNuevaTarea(false);
      setTabActiva('tareas');
      onActualizarProceso?.({
        tasksCount: nextTasks.length,
        completedTasksCount: nextTasks.filter((item) => item.completada).length,
        pendingTasksCount: nextTasks.filter((item) => !item.completada).length,
      });
      toast.success('Tarea creada correctamente');
    } catch (error: any) {
      console.error('[ModalDetallesProceso] Error creando tarea:', error);
      toast.error(error?.message || 'No fue posible crear la tarea');
    } finally {
      setCreandoTarea(false);
    }
  }, [proceso?.id, onActualizarProceso]);

  const handleToggleTarea = useCallback(async (tarea: TaskItem) => {
    if (!proceso?.id) return;

    const completada = !tarea.completada;
    setActualizandoTareaId(tarea.id);

    try {
      const updated = await disciplinaryService.updateEstadoTareaProceso(proceso.id, tarea.id, completada);
      const mapped = mapTaskFromApi(updated);
      let nextTasks: TaskItem[] = [];

      setTareas((prev) => {
        nextTasks = prev
          .map((item) => item.id === tarea.id ? mapped : item)
          .sort((a, b) => {
            if (a.completada !== b.completada) return Number(a.completada) - Number(b.completada);
            const diff = a.vencimiento.localeCompare(b.vencimiento);
            if (diff !== 0) return diff;
            return `${b.createdAt || ''}${b.id}`.localeCompare(`${a.createdAt || ''}${a.id}`);
          });
        return nextTasks;
      });

      if (completada) {
        setTareaExpandidaId(mapped.id);
      }

      onActualizarProceso?.({
        tasksCount: nextTasks.length,
        completedTasksCount: nextTasks.filter((item) => item.completada).length,
        pendingTasksCount: nextTasks.filter((item) => !item.completada).length,
      });
      toast.success(completada ? 'Tarea marcada como completada' : 'Tarea marcada como pendiente');
    } catch (error: any) {
      console.error('[ModalDetallesProceso] Error actualizando tarea:', error);
      toast.error(error?.message || 'No fue posible actualizar la tarea');
    } finally {
      setActualizandoTareaId(null);
    }
  }, [proceso?.id, onActualizarProceso]);

  // ═══ Protección beforeunload ═══
  useEffect(() => {
    const cargasEnCurso = cargasActivas.filter(c => c.estado === 'subiendo' || c.estado === 'procesando' || c.estado === 'validando');
    if (cargasEnCurso.length === 0 && archivosEnColaCount === 0) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Hay archivos en proceso de carga. Si cierra la ventana, se perderán.';
      return e.returnValue;
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [archivosEnColaCount, cargasActivas]);

  // ═══ Cierre protegido ═══
  const cargasEnCursoCount = cargasActivas.filter(c => c.estado === 'subiendo' || c.estado === 'procesando' || c.estado === 'validando').length;
  const cargasPendientesCount = cargasEnCursoCount + archivosEnColaCount;

  const handleIntentoCerrar = useCallback(() => {
    if (cargasPendientesCount > 0) {
      setMostrarAlertaCierre(true);
    } else {
      onClose();
    }
  }, [cargasPendientesCount, onClose]);

  const handleCancelarYCerrar = useCallback(() => {
    cancelarPendientesRef.current = true;
    setArchivosEnColaCount(0);
    // Cancelar todas las cargas activas
    cargasRef.current.forEach(c => {
      if (c.estado === 'subiendo' || c.estado === 'procesando' || c.estado === 'validando') {
        c.abortController.abort();
      }
    });
    setCargasActivas(prev => prev.map(c =>
      (c.estado === 'subiendo' || c.estado === 'procesando' || c.estado === 'validando')
        ? { ...c, estado: 'cancelado' as EstadoCarga, progreso: c.progreso }
        : c
    ));
    setMostrarAlertaCierre(false);
    toast.error('Cargas canceladas', { description: 'Se cancelaron todas las cargas en progreso' });
    setTimeout(() => onClose(), 200);
  }, [onClose]);

  // ═══ Simulación de carga robusta ═══
  const simularCargaArchivo = useCallback((archivo: File) => {
    const id = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const esGrande = archivo.size > LIMITE_CARGA_DIRECTA;
    const ac = new AbortController();

    const carga: CargaActiva = {
      id, archivo, nombre: archivo.name, tamano: archivo.size,
      progreso: 0, estado: 'validando', velocidad: 'Calculando...',
      tiempoRestante: 'Calculando...', abortController: ac,
      iniciadoEn: Date.now(), bytesSubidos: 0, esGrande,
    };

    setCargasActivas(prev => [...prev, carga]);

    // Toast persistente con ID (se actualiza durante la carga)
    const toastId = `toast-upload-${id}`;

    if (esGrande) {
      toast.loading(
        <ToastProgresoCarga carga={carga} />,
        { id: toastId, duration: Infinity, position: 'bottom-right' }
      );
    }

    // Simular upload chunked con velocidad variable
    const totalChunks = Math.max(1, Math.ceil(archivo.size / (5 * 1024 * 1024)));
    // Archivos pequeños: intervalo corto. Grandes: intervalo más realista
    const baseInterval = esGrande ? 150 : 60;
    let currentChunk = 0;

    // Fase 1: Validación (breve)
    setTimeout(() => {
      if (ac.signal.aborted) return;

      const uploadStartTime = Date.now();
      setCargasActivas(prev => prev.map(c =>
        c.id === id ? { ...c, estado: 'subiendo' as EstadoCarga, iniciadoEn: uploadStartTime } : c
      ));

      // Fase 2: Carga progresiva
      const interval = setInterval(() => {
        if (ac.signal.aborted) {
          clearInterval(interval);
          setCargasActivas(prev => prev.map(c =>
            c.id === id ? { ...c, estado: 'cancelado' as EstadoCarga } : c
          ));
          if (esGrande) {
            toast.error('Carga cancelada', {
              id: toastId, duration: 4000,
              description: `${archivo.name} — Cancelado por el usuario`,
            });
          }
          return;
        }

        currentChunk++;
        const bytesSubidos = Math.min(currentChunk * (5 * 1024 * 1024), archivo.size);
        const progreso = Math.min((bytesSubidos / archivo.size) * 100, 99);
        const elapsed = (Date.now() - uploadStartTime) / 1000;
        const bps = elapsed > 0.5 ? bytesSubidos / elapsed : 0;
        const velocidad = bps > 0 ? `${formatBytes(bps)}/s` : 'Calculando...';
        const restante = bps > 0 ? archivo.size - bytesSubidos : 0;
        const segsRestante = bps > 0 ? restante / bps : 0;
        const tiempoRestante = segsRestante < 60 ? `~${Math.ceil(segsRestante)}s`
          : segsRestante < 3600 ? `~${Math.ceil(segsRestante / 60)} min`
          : `~${(segsRestante / 3600).toFixed(1)}h`;

        const updatedCarga: CargaActiva = {
          ...carga, progreso, bytesSubidos, velocidad, tiempoRestante,
          estado: 'subiendo' as EstadoCarga, iniciadoEn: uploadStartTime,
        };

        setCargasActivas(prev => prev.map(c => c.id === id ? updatedCarga : c));

        if (esGrande) {
          toast.loading(<ToastProgresoCarga carga={updatedCarga} />, { id: toastId, duration: Infinity, position: 'bottom-right' });
        }

        if (currentChunk >= totalChunks) {
          clearInterval(interval);
          // Fase 3: Procesamiento en servidor
          const processingCarga: CargaActiva = { ...updatedCarga, estado: 'procesando' as EstadoCarga, progreso: 99 };
          setCargasActivas(prev => prev.map(c => c.id === id ? processingCarga : c));
          if (esGrande) {
            toast.loading(<ToastProgresoCarga carga={processingCarga} />, { id: toastId, duration: Infinity, position: 'bottom-right' });
          }

          setTimeout(() => {
            if (ac.signal.aborted) return;
            const finalCarga: CargaActiva = {
              ...processingCarga, estado: 'completado' as EstadoCarga,
              progreso: 100, bytesSubidos: archivo.size,
            };
            setCargasActivas(prev => prev.map(c => c.id === id ? finalCarga : c));

            // Agregar a lista de archivos subidos
            const ext = obtenerExtension(archivo.name) as Extension;
            const nuevoArchivo: Archivo = {
              id: `subido-${id}`,
              nombre: archivo.name,
              tipo: 'evidencia',
              fecha: new Date().toISOString().split('T')[0],
              firmante: 'Usuario Actual',
              estado: 'pendiente',
              tamaño: formatBytes(archivo.size),
              extension: (['pdf','jpg','png','zip','docx','xlsx'].includes(ext) ? ext : 'pdf') as Extension,
              etapaProceso: proceso.etapaActual,
            };
            setArchivosSubidos(prev => [...prev, nuevoArchivo]);

            if (esGrande) {
              toast.success(
                <ToastProgresoCarga carga={finalCarga} />,
                { id: toastId, duration: 6000, position: 'bottom-right' }
              );
            } else {
              toast.success(`${archivo.name} subido correctamente`, {
                description: `${formatBytes(archivo.size)} · Listo para revisión`,
                duration: 4000,
              });
            }

            // Limpiar la carga del estado después de 8 segundos
            setTimeout(() => {
              setCargasActivas(prev => prev.filter(c => c.id !== id));
            }, 8000);
          }, esGrande ? 1500 : 500);
        }
      }, baseInterval + Math.random() * (baseInterval * 0.5));
    }, esGrande ? 800 : 300);
  }, []);

  // ═══ Handler de selección de archivos ═══
  const subirArchivoReal = useCallback((archivo: File): Promise<void> => {
    if (!proceso?.id) {
      toast.error('No se pudo identificar el proceso para cargar el archivo');
      return Promise.resolve();
    }

    const id = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const esGrande = archivo.size > LIMITE_CARGA_DIRECTA;
    const ac = new AbortController();
    const cargaInicial: CargaActiva = {
      id,
      archivo,
      nombre: archivo.name,
      tamano: archivo.size,
      progreso: 0,
      estado: 'validando',
      velocidad: 'Calculando...',
      tiempoRestante: 'Calculando...',
      abortController: ac,
      iniciadoEn: Date.now(),
      bytesSubidos: 0,
      esGrande,
    };

    setCargasActivas(prev => [...prev, cargaInicial]);

    const toastId = `toast-upload-${id}`;
    if (esGrande) {
      toast.loading(<ToastProgresoCarga carga={cargaInicial} />, {
        id: toastId,
        duration: Infinity,
        position: 'bottom-right',
      });
    }

    const uploadStartTime = Date.now();
    const actualizarCarga = (transform: (actual: CargaActiva) => CargaActiva) => {
      let siguiente: CargaActiva | null = null;
      setCargasActivas(prev => prev.map(c => {
        if (c.id !== id) return c;
        siguiente = transform(c);
        return siguiente;
      }));
      return siguiente;
    };

    actualizarCarga(actual => ({
      ...actual,
      estado: 'subiendo',
      iniciadoEn: uploadStartTime,
    }));

    return disciplinaryService.uploadDocumento(
      proceso.id,
      archivo,
      'EVIDENCIA',
      undefined,
      archivo.name,
      proceso.etapaActual || undefined,
      usuarioCargaActual,
      undefined,
      undefined,
      undefined,
      undefined,
      {
        signal: ac.signal,
        timeoutMs: 0,
        onProgressDetail: ({ progress, loaded, total }) => {
          const totalBytes = total || archivo.size;
          const elapsed = Math.max((Date.now() - uploadStartTime) / 1000, 0.1);
          const bps = loaded / elapsed;
          const restante = Math.max(totalBytes - loaded, 0);
          const segsRestante = bps > 0 ? restante / bps : 0;
          const tiempoRestante = segsRestante <= 0
            ? 'Calculando...'
            : segsRestante < 60
              ? `~${Math.ceil(segsRestante)}s`
              : segsRestante < 3600
                ? `~${Math.ceil(segsRestante / 60)} min`
                : `~${(segsRestante / 3600).toFixed(1)}h`;
          const cargaActualizada = actualizarCarga(actual => ({
            ...actual,
            estado: 'subiendo',
            progreso: Math.min(progress, 99),
            bytesSubidos: loaded,
            velocidad: bps > 0 ? `${formatBytes(bps)}/s` : 'Calculando...',
            tiempoRestante,
          }));

          if (esGrande && cargaActualizada) {
            toast.loading(<ToastProgresoCarga carga={cargaActualizada} />, {
              id: toastId,
              duration: Infinity,
              position: 'bottom-right',
            });
          }
        },
      },
    )
      .then(async () => {
        const procesamiento = actualizarCarga(actual => ({
          ...actual,
          estado: 'procesando',
          progreso: 99,
          bytesSubidos: archivo.size,
          velocidad: 'Completado',
          tiempoRestante: 'Finalizando...',
        }));

        if (esGrande && procesamiento) {
          toast.loading(<ToastProgresoCarga carga={procesamiento} />, {
            id: toastId,
            duration: Infinity,
            position: 'bottom-right',
          });
        }

        await cargarDocumentosExpediente();

        const finalCarga = actualizarCarga(actual => ({
          ...actual,
          estado: 'completado',
          progreso: 100,
          bytesSubidos: archivo.size,
          velocidad: 'Completado',
          tiempoRestante: '0s',
        }));

        if (esGrande && finalCarga) {
          toast.success(<ToastProgresoCarga carga={finalCarga} />, {
            id: toastId,
            duration: 6000,
            position: 'bottom-right',
          });
        } else {
          toast.success(`${archivo.name} subido correctamente`, {
            description: `${formatBytes(archivo.size)} · Disponible en el expediente`,
            duration: 4000,
          });
        }
      })
      .catch((error: any) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          const cancelada = actualizarCarga(actual => ({
            ...actual,
            estado: 'cancelado',
          }));

          if (esGrande && cancelada) {
            toast.error('Carga cancelada', {
              id: toastId,
              duration: 4000,
              description: `${archivo.name} · Cancelado por el usuario`,
            });
          }
          return;
        }

        const mensaje = error?.message || 'No fue posible subir el archivo';
        const conError = actualizarCarga(actual => ({
          ...actual,
          estado: 'error',
          error: mensaje,
        }));

        if (esGrande && conError) {
          toast.error(<ToastProgresoCarga carga={conError} />, {
            id: toastId,
            duration: 6000,
            position: 'bottom-right',
          });
        } else {
          toast.error(`Error subiendo ${archivo.name}`, {
            description: mensaje,
            duration: 6000,
          });
        }
      })
      .finally(() => {
        setTimeout(() => {
          setCargasActivas(prev => prev.filter(c => c.id !== id));
        }, 8000);
      });
  }, [cargarDocumentosExpediente, proceso?.etapaActual, proceso?.id, usuarioCargaActual]);

  const encolarCargaArchivo = useCallback((archivo: File) => {
    setArchivosEnColaCount(prev => prev + 1);

    const siguiente = colaCargasRef.current
      .catch(() => undefined)
      .then(async () => {
        if (cancelarPendientesRef.current) {
          setArchivosEnColaCount(prev => Math.max(prev - 1, 0));
          return;
        }

        setArchivosEnColaCount(prev => Math.max(prev - 1, 0));
        await subirArchivoReal(archivo);
      });

    colaCargasRef.current = siguiente.catch(() => undefined);
    return siguiente;
  }, [subirArchivoReal]);

  const handleFilesSelected = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const archivos = Array.from(files);

    // Validar todos
    const errores: string[] = [];
    const validos: File[] = [];
    archivos.forEach(archivo => {
      const result = validarArchivo(archivo);
      if (result.valido) {
        validos.push(archivo);
      } else {
        errores.push(`${archivo.name}: ${result.error}`);
      }
    });

    if (errores.length > 0) {
      toast.error(`${errores.length} archivo(s) rechazado(s)`, {
        description: errores.slice(0, 3).join(' | '),
        duration: 6000,
      });
    }

    if (validos.length === 0) return;
    cancelarPendientesRef.current = false;

    // Notificar y comenzar carga
    const grandes = validos.filter(f => f.size > LIMITE_CARGA_DIRECTA);
    if (grandes.length > 0) {
      toast.info(`${grandes.length} archivo(s) > 200 MB`, {
        description: 'Se cargarán en segundo plano. El progreso se mostrará en un toast persistente.',
        duration: 5000,
      });
    }

    if (validos.length > 1) {
      toast.info(`${validos.length} archivos agregados a la cola`, {
        description: 'Se subirÃ¡n uno por uno para respetar el patrÃ³n estable de carga del servidor.',
        duration: 5000,
      });
    }

    validos.forEach(archivo => {
      void encolarCargaArchivo(archivo);
    });

    // Reset input
    if (inputArchivoRef.current) inputArchivoRef.current.value = '';
  }, [encolarCargaArchivo]);

  // ═══ Cancelar una carga individual ═══
  const cancelarCarga = useCallback((id: string) => {
    const carga = cargasRef.current.find(c => c.id === id);
    if (carga) {
      carga.abortController.abort();
      toast.error(`Carga cancelada: ${carga.nombre}`, { duration: 3000 });
    }
  }, []);

  // ═══ Drag & Drop ═══
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  }, []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    handleFilesSelected(e.dataTransfer.files);
  }, [handleFilesSelected]);

  const sc              = SEMAFORO[proceso.semaforo] ?? SEMAFORO.rojo;
  const ec              = etapaColor(proceso.etapaActual);
  const barColor        = proceso.semaforo === 'verde' ? '#10B981' : proceso.semaforo === 'amarillo' ? '#F59E0B' : '#EF4444';
  const isArchivado     = proceso.estadoActual === 'ARCHIVADO' || proceso.estadoActual === 'CERRADO' || proceso.etapaActual === 'Archivo';

  const TODOS_ARCHIVOS = archivosBackend;
  const ultimaActuacionActual = actuaciones[0]?.descripcion || proceso.ultimaActuacion;

  // Extraer etapas únicas de los archivos para el filtro
  const etapasUnicas = Array.from(new Set(TODOS_ARCHIVOS.map(a => a.etapaProceso).filter(Boolean))) as string[];
  const ORDEN_ETAPAS = ['Recepción', 'Valoración', 'Indagación', 'Investigación', 'Juzgamiento', 'Fallo'];
  const etapasOrdenadas = etapasUnicas.sort((a, b) => {
    const ia = ORDEN_ETAPAS.indexOf(a);
    const ib = ORDEN_ETAPAS.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  const bg = busquedaGlobal.toLowerCase();
  const bgActivo = bg.length > 0;

  const archivosFiltrados = TODOS_ARCHIVOS.filter(a =>
    (filtro === 'TODOS' || a.tipo === filtro) &&
    (filtroEtapa === 'TODAS' || a.etapaProceso === filtroEtapa) &&
    (a.nombre.toLowerCase().includes(busqueda.toLowerCase()) || a.firmante.toLowerCase().includes(busqueda.toLowerCase())) &&
    (!bgActivo || a.nombre.toLowerCase().includes(bg) || a.firmante.toLowerCase().includes(bg) || (a.etapaProceso || '').toLowerCase().includes(bg) || a.estado.toLowerCase().includes(bg))
  );

  // Agrupación por etapa
  const archivosAgrupados = etapasOrdenadas.reduce<Record<string, Archivo[]>>((acc, etapa) => {
    const items = archivosFiltrados.filter(a => a.etapaProceso === etapa);
    if (items.length > 0) acc[etapa] = items;
    return acc;
  }, {});
  const sinEtapa = archivosFiltrados.filter(a => !a.etapaProceso);
  if (sinEtapa.length > 0) archivosAgrupados['Sin etapa'] = sinEtapa;

  // ═══ Actuaciones: etapas, filtrado y agrupación ═══
  const etapasActuaciones = Array.from(new Set(actuaciones.map(a => a.etapa).filter(Boolean)));
  const etapasActOrdenadas = etapasActuaciones.sort((a, b) => {
    const ia = ORDEN_ETAPAS.indexOf(a); const ib = ORDEN_ETAPAS.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
  const actuacionesFiltradas = actuaciones.filter(a =>
    (filtroEtapaAct === 'TODAS' || a.etapa === filtroEtapaAct) &&
    (!bgActivo || a.descripcion.toLowerCase().includes(bg) || a.responsable.toLowerCase().includes(bg) || a.tipo.toLowerCase().includes(bg) || a.etapa.toLowerCase().includes(bg))
  );
  const actuacionesAgrupadas = etapasActOrdenadas.reduce<Record<string, (typeof actuaciones)>>((acc, etapa) => {
    const items = actuacionesFiltradas.filter(a => a.etapa === etapa);
    if (items.length > 0) acc[etapa] = items;
    return acc;
  }, {});

  // ═══ Historial real de cambios de etapa (derivado de actuaciones) ═══
  const historialEtapas = actuaciones
    .filter(a => a.tipo === 'cambio_etapa')
    .slice()
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
    .map((a, idx, arr) => {
      // Extraer etapa anterior desde la descripción "Etapa anterior: X."
      const matchDesde = a.descripcion.match(/[Ee]tapa anterior[:\s]+([^.]+)/);
      const desde = matchDesde
        ? normalizarEtapaActuacion(matchDesde[1].trim())
        : (idx > 0 ? arr[idx - 1].etapa : '—');
      return {
        id: a.id,
        desde,
        hacia: a.etapa,
        fecha: a.fecha,
        responsable: a.responsable,
        motivo: a.descripcion,
      };
    });

  // ═══ Tareas: etapas, filtrado y agrupación ═══
  const etapasTareas = Array.from(new Set(tareas.map(t => t.etapa).filter(Boolean)));
  const etapasTarOrdenadas = etapasTareas.sort((a, b) => {
    const ia = ORDEN_ETAPAS.indexOf(a); const ib = ORDEN_ETAPAS.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
  const tareasFiltradas = tareas.filter(t =>
    (filtroEtapaTar === 'TODAS' || t.etapa === filtroEtapaTar) &&
    (!bgActivo
      || t.titulo.toLowerCase().includes(bg)
      || t.prioridad.toLowerCase().includes(bg)
      || t.etapa.toLowerCase().includes(bg)
      || (t.responsable || '').toLowerCase().includes(bg)
      || (t.descripcion || '').toLowerCase().includes(bg))
  );
  const tareasAgrupadas = etapasTarOrdenadas.reduce<Record<string, typeof tareas>>((acc, etapa) => {
    const items = tareasFiltradas.filter(t => t.etapa === etapa);
    if (items.length > 0) acc[etapa] = items;
    return acc;
  }, {});

  // ═══ Notas: etapas, filtrado y agrupación ═══
  const filtroEtapaNotaNormalizado = filtroEtapaNota === 'TODAS' ? 'TODAS' : normalizarEtapaActuacion(filtroEtapaNota);
  const notasNormalizadas: NoteItem[] = notas.map((nota) => ({
    ...nota,
    etapa: normalizarEtapaActuacion(nota.etapa),
  }));
  const etapasNotas = Array.from(new Set(notasNormalizadas.map((n) => n.etapa).filter(Boolean)));
  const etapasNotasOrdenadas = etapasNotas.sort((a, b) => {
    const ia = ORDEN_ETAPAS.indexOf(a); const ib = ORDEN_ETAPAS.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
  const notasTienenVariasEtapas = etapasNotasOrdenadas.length > 1;
  const notasFiltradas = notasNormalizadas.filter(n =>
    (filtroEtapaNotaNormalizado === 'TODAS' || n.etapa === filtroEtapaNotaNormalizado) &&
    (!bgActivo || n.texto.toLowerCase().includes(bg) || n.etapa.toLowerCase().includes(bg))
  );
  const notasAgrupadas = etapasNotasOrdenadas.reduce<Record<string, NoteItem[]>>((acc, etapa) => {
    const items = notasFiltradas.filter(n => n.etapa === etapa);
    if (items.length > 0) acc[etapa] = items;
    return acc;
  }, {});

  useEffect(() => {
    if (!notasTienenVariasEtapas) {
      if (filtroEtapaNota !== 'TODAS') setFiltroEtapaNota('TODAS');
      if (vistaAgrupadaNota) setVistaAgrupadaNota(false);
    }
  }, [filtroEtapaNota, notasTienenVariasEtapas, vistaAgrupadaNota]);

  // ═══ Exportar resumen a CSV ═══
  const exportarResumenCSV = useCallback(() => {
    const BOM = '\uFEFF';
    const headers = ['Etapa', 'Total Docs', 'Aprobados', 'Borradores', 'En Revisión', 'Devueltos', 'Pendientes', '% del Total'];
    const rows = etapasOrdenadas.map(etapa => {
      const docs = TODOS_ARCHIVOS.filter(a => a.etapaProceso === etapa);
      const total = docs.length;
      return [
        etapa,
        total,
        docs.filter(a => a.estado === 'aprobado').length,
        docs.filter(a => a.estado === 'borrador').length,
        docs.filter(a => a.estado === 'en_revision').length,
        docs.filter(a => a.estado === 'devuelto').length,
        docs.filter(a => a.estado === 'pendiente').length,
        TODOS_ARCHIVOS.length > 0 ? `${Math.round((total / TODOS_ARCHIVOS.length) * 100)}%` : '0%',
      ];
    });
    // Totales
    rows.push([
      'TOTAL',
      TODOS_ARCHIVOS.length,
      TODOS_ARCHIVOS.filter(a => a.estado === 'aprobado').length,
      TODOS_ARCHIVOS.filter(a => a.estado === 'borrador').length,
      TODOS_ARCHIVOS.filter(a => a.estado === 'en_revision').length,
      TODOS_ARCHIVOS.filter(a => a.estado === 'devuelto').length,
      TODOS_ARCHIVOS.filter(a => a.estado === 'pendiente').length,
      '100%',
    ]);
    // Header info
    const info = [
      `Proceso: ${proceso.numeroProceso}`,
      `Etapa Actual: ${proceso.etapaActual}`,
      `Generado: ${new Date().toLocaleString('es-CO')}`,
      '',
    ];
    const csv = BOM + info.join('\n') + '\n' + headers.join(';') + '\n' + rows.map(r => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Resumen_Etapas_${proceso.numeroProceso.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Resumen exportado como CSV', { description: 'Compatible con Excel y Google Sheets', duration: 4000 });
  }, [TODOS_ARCHIVOS, etapasOrdenadas, proceso]);

  // ═══ Exportar expediente consolidado a CSV ═══
  const exportarExpedienteCompleto = useCallback(() => {
    const BOM = '\uFEFF';
    const sep = ';';
    const fecha = new Date().toLocaleString('es-CO');
    const safeProceso = proceso.numeroProceso.replace(/[^a-zA-Z0-9]/g, '_');
    const lines: string[] = [];

    // ── Encabezado general
    lines.push(`EXPEDIENTE CONSOLIDADO — ${proceso.numeroProceso}`);
    lines.push(`Etapa Actual: ${proceso.etapaActual}`);
    lines.push(`Generado: ${fecha}`);
    lines.push('');

    // ── Sección 1: Archivos
    lines.push('═══ ARCHIVOS ═══');
    lines.push(['Nombre', 'Tipo', 'Estado', 'Etapa', 'Firmante', 'Fecha', 'Tamaño', 'Extensión'].join(sep));
    TODOS_ARCHIVOS.forEach(a => {
      lines.push([
        a.nombre, a.tipo, a.estado, a.etapaProceso || '-', a.firmante, a.fecha, a.tamaño, a.extension,
      ].join(sep));
    });
    lines.push(`Total Archivos: ${TODOS_ARCHIVOS.length}`);
    lines.push('');

    // ── Sección 2: Actuaciones
    lines.push('═══ ACTUACIONES ═══');
    lines.push(['Fecha', 'Descripción', 'Tipo', 'Responsable', 'Etapa'].join(sep));
    actuaciones.forEach(a => {
      lines.push([a.fecha, a.descripcion, a.tipo, a.responsable, a.etapa || '-'].join(sep));
    });
    lines.push(`Total Actuaciones: ${actuaciones.length}`);
    lines.push('');

    // ── Sección 3: Tareas
    lines.push('═══ TAREAS ═══');
    lines.push(['Título', 'Vencimiento', 'Prioridad', 'Estado', 'Etapa'].join(sep));
    tareas.forEach(t => {
      lines.push([t.titulo, t.vencimiento, t.prioridad, t.completada ? 'Completada' : 'Pendiente', t.etapa || '-'].join(sep));
    });
    lines.push(`Total Tareas: ${tareas.length} (${tareas.filter(t => t.completada).length} completadas)`);
    lines.push('');

    // ── Sección 4: Notas
    lines.push('═══ NOTAS INTERNAS ═══');
    lines.push(['Fecha', 'Etapa', 'Contenido'].join(sep));
    notas.forEach(n => {
      lines.push([formatFechaActuacion(n.fecha, true), n.etapa || '-', `"${n.texto.replace(/"/g, '""')}"`].join(sep));
    });
    lines.push(`Total Notas: ${notas.length}`);
    lines.push('');

    // ── Sección 5: Historial de Etapas
    lines.push('═══ HISTORIAL DE CAMBIOS DE ETAPA ═══');
    lines.push(['Fecha', 'Desde', 'Hacia', 'Responsable', 'Motivo'].join(sep));
    historialEtapas.forEach(h => {
      lines.push([h.fecha, h.desde, h.hacia, h.responsable, `"${h.motivo.replace(/"/g, '""')}"`].join(sep));
    });
    lines.push(`Total Transiciones: ${historialEtapas.length}`);
    lines.push('');

    // ── Resumen por Etapa
    lines.push('═══ RESUMEN POR ETAPA ═══');
    lines.push(['Etapa', 'Archivos', 'Actuaciones', 'Tareas', 'Notas'].join(sep));
    ORDEN_ETAPAS.forEach(etapa => {
      const nArch = TODOS_ARCHIVOS.filter(a => a.etapaProceso === etapa).length;
      const nAct  = actuaciones.filter(a => a.etapa === etapa).length;
      const nTar  = tareas.filter(t => t.etapa === etapa).length;
      const nNot  = notas.filter(n => n.etapa === etapa).length;
      if (nArch + nAct + nTar + nNot > 0) {
        lines.push([etapa, nArch, nAct, nTar, nNot].join(sep));
      }
    });

    const csv = BOM + lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Expediente_${safeProceso}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Expediente completo exportado', {
      description: `${TODOS_ARCHIVOS.length} archivos · ${actuaciones.length} actuaciones · ${tareas.length} tareas · ${notas.length} notas`,
      duration: 5000,
    });
  }, [TODOS_ARCHIVOS, actuaciones.length, notas, proceso, tareas]);

  // Conteos globales para búsqueda
  const bgArchivos = bgActivo ? archivosFiltrados.length : TODOS_ARCHIVOS.length + cargasEnCursoCount;
  const bgActuaciones = bgActivo ? actuacionesFiltradas.length : actuaciones.length;
  const bgTareas = bgActivo ? tareasFiltradas.length : tareas.length;
  const bgNotas = bgActivo ? notasFiltradas.length : notas.length;

  const TABS: { id: Tab; label: string; icon: React.ReactNode; badge?: number; permission?: string }[] = [
    { id: 'general',     label: 'General',     icon: <FileText     className="w-3.5 h-3.5" /> },
    { id: 'archivos',    label: 'Archivos',    icon: <FolderOpen   className="w-3.5 h-3.5" />, badge: bgArchivos },
    { id: 'actuaciones', label: 'Actuaciones', icon: <Zap          className="w-3.5 h-3.5" />, badge: bgActuaciones, permission: Permissions.CONTROL_DISCIPLINARIO_PROCESOS_ACTUACIONES_VIEW },
    { id: 'tareas',      label: 'Tareas',      icon: <CheckSquare  className="w-3.5 h-3.5" />, badge: bgTareas,      permission: Permissions.CONTROL_DISCIPLINARIO_PROCESOS_TASKS_VIEW },
    { id: 'notas',       label: 'Notas',       icon: <FileEdit     className="w-3.5 h-3.5" />, badge: bgNotas || undefined, permission: Permissions.CONTROL_DISCIPLINARIO_PROCESOS_NOTES_VIEW },
  ];

  const TIPO_ARCHIVO = [
    { tipo: 'auto'      as const, label: 'Autos',     icon: Scale,     color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE', onClick: onGestionAutos      },
    { tipo: 'evidencia' as const, label: 'Evidencias', icon: Archive,  color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', onClick: onGestionEvidencias },
    { tipo: 'oficio'    as const, label: 'Oficios',   icon: Mail,       color: '#0891B2', bg: '#ECFEFF', border: '#A5F3FC', onClick: onGestionOficios    },
    { tipo: 'acta'      as const, label: 'Actas',     icon: FileCheck,  color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', onClick: onGestionActas      },
  ];

  const TIPO_META: Record<string, { color: string; bg: string; label: string }> = {
    auto:      { color: '#7C3AED', bg: '#F5F3FF', label: 'Auto'      },
    evidencia: { color: '#D97706', bg: '#FFFBEB', label: 'Evidencia' },
    oficio:    { color: '#0891B2', bg: '#ECFEFF', label: 'Oficio'    },
    acta:      { color: '#DC2626', bg: '#FEF2F2', label: 'Acta'      },
  };

  const ESTADO_META: Record<string, { icon: React.ReactNode; text: string; color: string }> = {
    aprobado:    { icon: <CheckCircle  className="w-3 h-3" />, text: 'Aprobado',    color: '#059669' },
    borrador:    { icon: <FileEdit     className="w-3 h-3" />, text: 'Borrador',    color: '#D97706' },
    pendiente:   { icon: <AlertCircle  className="w-3 h-3" />, text: 'Pendiente',   color: '#EF4444' },
    en_revision: { icon: <Clock        className="w-3 h-3" />, text: 'En Revisión', color: '#003DA5' },
    devuelto:    { icon: <RotateCcw    className="w-3 h-3" />, text: 'Devuelto',    color: '#DC2626' },
  };

  const TIPO_ACT: Record<string, { color: string; label: string }> = {
    actuacion:    { color: '#2563EB', label: 'Actuacion'    },
    auto:         { color: '#7C3AED', label: 'Auto'         },
    notificacion: { color: '#0891B2', label: 'Notificación' },
    asignacion:   { color: '#10B981', label: 'Asignación'   },
    recepcion:    { color: '#F59E0B', label: 'Recepción'    },
  };

  const guardarNota = useCallback(async () => {
    if (!notaTexto.trim() || !proceso?.id) return;

    const payload: CreateDisciplinaryProcessNoteDto = {
      texto: notaTexto.trim(),
      etapa: proceso.etapaActual,
    };

    try {
      setCreandoNota(true);
      const created = await disciplinaryService.createNotaProceso(proceso.id, payload);
      const mapped = mapNoteFromApi(created);
      let nextNotes: NoteItem[] = [];

      setNotas((prev) => {
        nextNotes = [mapped, ...prev].sort((a, b) => `${b.createdAt || b.fecha}${b.id}`.localeCompare(`${a.createdAt || a.fecha}${a.id}`));
        return nextNotes;
      });

      setNotasError(null);
      setNotaTexto('');
      setTabActiva('notas');
      toast.success('Nota guardada');
    } catch (error: any) {
      console.error('[ModalDetallesProceso] Error guardando nota:', error);
      toast.error(error?.message || 'No fue posible guardar la nota');
    } finally {
      setCreandoNota(false);
    }
  }, [notaTexto, proceso?.etapaActual, proceso?.id, onActualizarProceso]);

  const handleEliminarNota = useCallback(async (nota: NoteItem) => {
    if (!proceso?.id) return;

    try {
      setEliminandoNotaId(nota.id);
      await disciplinaryService.deleteNotaProceso(proceso.id, nota.id);

      let nextNotes: NoteItem[] = [];
      setNotas((prev) => {
        nextNotes = prev.filter((item) => item.id !== nota.id);
        return nextNotes;
      });
      setNotaPendienteEliminarId((current) => current === nota.id ? null : current);
      toast.success('Nota eliminada');
    } catch (error: any) {
      console.error('[ModalDetallesProceso] Error eliminando nota:', error);
      toast.error(error?.message || 'No fue posible eliminar la nota');
    } finally {
      setEliminandoNotaId(null);
    }
  }, [proceso?.id]);

  // ═══ Enviar Auto a Revisión y Aprobación ═══
  // Estado para rastrear si debemos reopen el modal después de cerrar el de confirmación
  const [debeReabrir, setDebeReabrir] = useState(false);

  const handleEnviarARevision = useCallback((archivo: Archivo) => {
    console.log('[DEBUG] handleEnviarARevision recibido archivo:', archivo);
    // Primero mostrar el modal de confirmación SIN cerrar el modal principal
    // Esto evita que el componente se desmonte antes de mostrar la confirmación
    setAutoEnviarRevision(archivo);
    setObservacionesEnvio('');
  }, []);

  useEffect(() => {
    console.log('[DEBUG] autoEnviarRevision cambió:', autoEnviarRevision);
  }, [autoEnviarRevision]);

  const confirmarEnvioRevision = useCallback(async () => {
    if (!autoEnviarRevision) return;
    const id = autoEnviarRevision.id;
    const ahora = new Date().toISOString();

    // Llamar al backend para cambiar estado a REVISION_JEFE
    try {
      await disciplinaryService.sendToReview(id);
    } catch (error) {
      console.error('[EFDS-702] Error al enviar auto a revisión:', error);
      toast.error('No se pudo enviar a revisión', {
        description: 'Error al comunicarse con el servidor. Intente nuevamente.',
      });
      setAutoEnviarRevision(null);
      setObservacionesEnvio('');
      return;
    }

    // Actualizar estado local del archivo
    const actualizarArchivo = (prev: Archivo[]) =>
      prev.map(a => a.id === id ? { ...a, estado: 'en_revision' as const, fechaEnvioRevision: ahora } : a);

    const enReal = archivosBackend.find(a => a.id === id);
    if (enReal) {
      setArchivosBackend(actualizarArchivo);
    } else {
      setArchivosSubidos(actualizarArchivo);
    }

    // ═══ COMPARTIR CON MÓDULO DE REVISIÓN Y APROBACIÓN ═══
    if (onEnviarARevision) {
      const denunciado = typeof proceso.denunciado === 'string'
        ? proceso.denunciado
        : (proceso.denunciado as any)?.nombre || 'Sin información';
      const profNombre = typeof proceso.profesionalAsignado === 'string'
        ? proceso.profesionalAsignado
        : (proceso.profesionalAsignado as any)?.nombre || autoEnviarRevision.firmante;
      const profEmail = typeof proceso.profesionalAsignado === 'object' && proceso.profesionalAsignado
        ? ((proceso.profesionalAsignado as any).email || '')
        : '';

      const borrador: BorradorPendiente = {
        id: `rev-${id}-${Date.now()}`,
        autoId: id,
        numeroProceso: proceso.numeroProceso,
        titulo: autoEnviarRevision.nombre,
        plantilla: `Plantilla ${proceso.etapaActual}`,
        version: autoEnviarRevision.version || 1,
        fechaEnvio: ahora,
        profesional: { nombre: profNombre, email: profEmail },
        observacionesProfesional: observacionesEnvio || 'Documento listo para revisión y aprobación del Jefe de OCID.',
        contenido: '',
        denunciado,
        etapa: proceso.etapaActual,
        prioridad: (proceso.prioridad as 'alta' | 'media' | 'baja') || 'media',
        estado: 'pendiente_revision',
        historial: [{
          id: `h-${Date.now()}`,
          tipo: 'recibido',
          usuario: profNombre,
          fecha: ahora,
          descripcion: `Borrador enviado para revisión · ${observacionesEnvio || 'Sin observaciones adicionales'}`,
          detalles: { version: autoEnviarRevision.version || 1 },
        }],
        tiempoEspera: '0m',
      };
      onEnviarARevision(borrador);
    }

    // Toast con acción de navegar a Revisión y Aprobación
    if (onNavigateToRevision) {
      toast.success('Auto enviado a Revisión y Aprobación', {
        description: `${autoEnviarRevision.nombre} — Enviado al Jefe OCID para revisión`,
        duration: 8000,
        action: {
          label: 'Ir a Revisión →',
          onClick: () => onNavigateToRevision(),
        },
      });
    } else {
      toast.success('Auto enviado a Revisión y Aprobación', {
        description: `${autoEnviarRevision.nombre} — Enviado al Jefe OCID para revisión`,
        duration: 5000,
      });
    }

    setAutoEnviarRevision(null);
    setObservacionesEnvio('');
  }, [autoEnviarRevision, observacionesEnvio, proceso, archivosBackend, onEnviarARevision, onNavigateToRevision]);

  // Abrir el modal de revisión (conectado a ModalRevisionAuto)
  const handleAbrirRevision = useCallback((archivo: Archivo) => {
    const denunciado = typeof proceso.denunciado === 'string'
      ? proceso.denunciado
      : (proceso.denunciado as any)?.nombre || 'Sin información';

    const profNombre = typeof proceso.profesionalAsignado === 'string'
      ? proceso.profesionalAsignado
      : (proceso.profesionalAsignado as any)?.nombre || archivo.firmante;
    const profEmail = typeof proceso.profesionalAsignado === 'object' && proceso.profesionalAsignado
      ? ((proceso.profesionalAsignado as any).email || '')
      : '';

    const borrador: BorradorPendiente = {
      id: archivo.id,
      autoId: archivo.id,
      numeroProceso: proceso.numeroProceso,
      titulo: archivo.nombre,
      plantilla: `Plantilla ${proceso.etapaActual}`,
      version: archivo.version || 1,
      fechaEnvio: archivo.fechaEnvioRevision || archivo.fecha,
      profesional: {
        nombre: profNombre,
        email: profEmail,
      },
      observacionesProfesional: 'Documento listo para revisión y aprobación del Jefe de OCID.',
      contenido: '',
      denunciado,
      etapa: proceso.etapaActual,
      prioridad: (proceso.prioridad as 'alta' | 'media' | 'baja') || 'media',
      estado: 'pendiente_revision',
      historial: [{
        id: `h-${Date.now()}`,
        tipo: 'recibido',
        usuario: archivo.firmante,
        fecha: archivo.fechaEnvioRevision || archivo.fecha,
        descripcion: 'Borrador enviado para revisión',
        detalles: { version: archivo.version || 1 },
      }],
      tiempoEspera: '—',
    };
    setAutoEnRevisionModal(borrador);
  }, [proceso]);

  const handleAutoAprobado = useCallback(async (archivoId: string, _comentarios: string) => {
    const userId = authService.getCurrentUser()?.id;
    if (!userId) {
      toast.error('No se pudo obtener el usuario actual');
      return;
    }
    try {
      const autoActualizado = await disciplinaryService.aprobarAuto(archivoId, userId);
      const numeroAsignado = autoActualizado?.numero;
      const actualizarArchivo = (prev: Archivo[]) =>
        prev.map(a => a.id === archivoId
          ? { ...a, estado: 'aprobado' as const, version: (a.version || 1) + 1, numero: numeroAsignado }
          : a
        );
      setArchivosBackend(actualizarArchivo);
      setArchivosSubidos(actualizarArchivo);
      toast.success('Auto aprobado exitosamente', {
        description: numeroAsignado
          ? `Consecutivo asignado: ${numeroAsignado}`
          : 'El auto ha sido aprobado por el Jefe OCID',
        duration: 5000,
      });
    } catch (err: any) {
      toast.error('Error al aprobar el auto', {
        description: err?.message || 'Intente de nuevo',
        duration: 5000,
      });
    }
    setAutoEnRevisionModal(null);
  }, []);

  const handleAutoDevuelto = useCallback((archivoId: string, motivo: string, comentarios: string) => {
    const enReal = archivosBackend.find(a => a.id === archivoId);
    if (enReal) {
      enReal.estado = 'devuelto';
      enReal.observacionesDevolucion = `${motivo}: ${comentarios}`;
    } else {
      setArchivosSubidos(prev => prev.map(a =>
        a.id === archivoId ? { ...a, estado: 'devuelto' as const, observacionesDevolucion: `${motivo}: ${comentarios}` } : a
      ));
    }
    toast.warning('Auto devuelto para corrección', {
      description: `El profesional debe corregir y reenviar el documento`,
      duration: 5000,
    });
    setAutoEnRevisionModal(null);
  }, []);

  const handleReasignacionInmediata = useCallback(async (
    nuevoProfesionalId: string,
    nuevoProfesionalNombre: string,
    justificacion: string,
    prioridad: 'NORMAL' | 'URGENTE'
  ) => {
    if (!proceso?.id) return;
    try {
      const user = authService.getCurrentUser();
      const solicitud = await disciplinaryService.createReassignmentRequest({
        processId: proceso.id,
        newProfessionalId: nuevoProfesionalId,
        justification: justificacion,
        priority: prioridad,
        requestedBy: user?.fullName || user?.email || 'Usuario del Sistema',
        requestedById: user?.id,
      });
      await disciplinaryService.approveReassignmentRequest(solicitud.id, { approved: true });
      toast.success('Profesional reasignado exitosamente', {
        description: `El proceso ha sido reasignado a ${nuevoProfesionalNombre}`,
        duration: 4000,
      });
      setMostrarModalReasignar(false);
    } catch (error: any) {
      console.error('[ModalDetallesProceso] Error en reasignación inmediata:', error);
      toast.error(error?.message || 'No fue posible realizar la reasignación');
    }
  }, [proceso?.id]);

  // ─── Handlers para documentos ───────────────────────────────────────────────────

  const handleVerDocumento = useCallback((archivo: Archivo) => {
    if (!proceso?.id) return;

    // Para PDFs e imágenes, abrir visor
    setPreviewArchivo(archivo);
  }, [proceso?.id]);

  const handleDescargarDocumento = useCallback(async (archivo: Archivo) => {
    if (!proceso?.id) return;

    try {
      const nombreArchivo = getArchivoDownloadName(archivo);

      if (archivo.urlExterna && !archivo.downloadUrl) {
        window.open(archivo.urlExterna, '_blank', 'noopener,noreferrer');
        return;
      }

      if (archivo.downloadUrl) {
        const normalizedUrl = disciplinaryService.getFileUrl(archivo.downloadUrl);
        await disciplinaryService.downloadFileFromUrl(normalizedUrl, nombreArchivo);
      } else {
        await disciplinaryService.downloadDocument(proceso.id, archivo.id, nombreArchivo);
      }

      toast.success('Documento descargado correctamente');
    } catch (error: any) {
      console.error('[ModalDetallesProceso] Error descargando documento:', error);
      toast.error(error?.message || 'No fue posible descargar el documento');
    }
  }, [proceso?.id]);

  // ═══ Recargar Archivo (reemplazar auto corregido) ═══
  const handleRecargarArchivo = useCallback((archivo: Archivo) => {
    setAutoRecargar(archivo);
    // Disparar el input file oculto
    setTimeout(() => inputRecargarRef.current?.click(), 100);
  }, []);

  const handleArchivoReemplazado = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!autoRecargar || !e.target.files || e.target.files.length === 0) {
      setAutoRecargar(null);
      return;
    }
    const nuevoArchivo = e.target.files[0];
    const extension = `.${nuevoArchivo.name.split('.').pop()?.toLowerCase() || ''}`;

    if (!['.doc', '.docx'].includes(extension)) {
      toast.error('Formato no permitido para autos', {
        description: 'Solo se permiten archivos Word (.doc, .docx) para recargar autos.',
      });
      setAutoRecargar(null);
      if (inputRecargarRef.current) inputRecargarRef.current.value = '';
      return;
    }

    const id = autoRecargar.id;
    
    // Iniciar subida real al backend
    toast.promise(
      disciplinaryService.uploadDocumentoRevision(id, nuevoArchivo, 'Recarga de archivo corregido'),
      {
        loading: 'Subiendo nueva versión del auto...',
        success: (data) => {
          // Recargar los documentos del expediente desde el backend
          void cargarDocumentosExpediente();
          
          setAutoRecargar(null);
          if (inputRecargarRef.current) inputRecargarRef.current.value = '';
          
          return `Auto reemplazado — Versión ${data.currentVersion || (autoRecargar.version || 1) + 1}`;
        },
        error: (err) => {
          console.error('Error al recargar auto:', err);
          setAutoRecargar(null);
          if (inputRecargarRef.current) inputRecargarRef.current.value = '';
          return 'Error al subir la nueva versión del documento';
        }
      }
    );
  }, [autoRecargar, cargarDocumentosExpediente]);

  // ── Helper: Renderizar fila de archivo ────────────────────────────────────────
  const renderArchivoFila = (archivo: Archivo, ocultarBadgeEtapa = false) => {
    const meta = TIPO_META[archivo.tipo];
    const est  = ESTADO_META[archivo.estado] || ESTADO_META['pendiente'];
    const isZip = archivo.extension === 'zip';
    const esAuto = archivo.tipo === 'auto';
    const puedeEnviarRevision = esAuto && (archivo.estado === 'borrador' || archivo.estado === 'pendiente' || archivo.estado === 'devuelto');
    const puedeRecargar = esAuto && (archivo.estado === 'borrador' || archivo.estado === 'devuelto');
    const estaEnRevision = esAuto && archivo.estado === 'en_revision';
    const fueDevuelto = esAuto && archivo.estado === 'devuelto';
    return (
      <div key={archivo.id}
        className={`rounded-xl border transition-all ${
          fueDevuelto ? 'border-red-200 bg-red-50/30 hover:border-red-300'
            : estaEnRevision ? 'border-blue-200 bg-blue-50/20 hover:border-blue-300'
            : 'border-gray-100 hover:border-blue-200 hover:bg-blue-50/20'
        }`}>
        <div className="flex items-center gap-2.5 p-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: meta.bg }}>
            {isZip ? <FileArchive className="w-4 h-4" style={{ color: meta.color }} /> : <FileText className="w-4 h-4" style={{ color: meta.color }} />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              {esAuto ? (
                <p className="text-xs font-semibold text-gray-900 truncate">
                  {archivo.numero || 'Sin número'}
                </p>
              ) : (
                <p className="text-xs font-semibold text-gray-900 truncate">{archivo.nombre}</p>
              )}
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 flex-shrink-0">.{archivo.extension.toUpperCase()}</span>
              {archivo.version && archivo.version > 1 && (
                <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-indigo-100 text-indigo-600 flex-shrink-0">v{archivo.version}</span>
              )}
            </div>
            {esAuto && (
              <p className="text-[10px] text-gray-600 font-medium truncate">{archivo.nombre.replace(/_/g, ' ')}</p>
            )}
            <div className="flex items-center gap-1 mt-0.5">
              <p className="text-[10px] text-gray-500">{archivo.firmante} · {archivo.fecha} · {archivo.tamaño}</p>
              {archivo.firmante === 'Radicador' && (
                <span className="px-1 py-0.5 text-[8px] font-bold rounded bg-purple-100 text-purple-700 border border-purple-300">
                  De la noticia
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {!ocultarBadgeEtapa && archivo.etapaProceso && (() => {
              const epc = etapaColor(archivo.etapaProceso);
              return (
                <span className="px-1.5 py-0.5 text-[8px] font-bold rounded flex-shrink-0 hidden sm:inline-flex items-center gap-0.5"
                  style={{ backgroundColor: epc.bg, color: epc.text, border: `1px solid ${epc.text}22` }}>
                  <Zap className="w-2.5 h-2.5" />{archivo.etapaProceso}
                </span>
              );
            })()}
            <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full hidden sm:inline"
              style={{ backgroundColor: meta.bg, color: meta.color }}>{meta.label}</span>
            <span className="flex items-center gap-0.5 text-[9px] font-semibold" style={{ color: est.color }}>
              {est.icon}{est.text}
            </span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0 ml-1">
            {/* {estaEnRevision && (
              <button type="button" onClick={(e) => { e.stopPropagation(); handleAbrirRevision(archivo); }}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all text-white"
                style={{ background: '#003DA5' }}
                onMouseEnter={e => e.currentTarget.style.background = '#002870'}
                onMouseLeave={e => e.currentTarget.style.background = '#003DA5'}
                title="Ver estado de revisión y aprobación">
                <Shield className="w-3 h-3" /><span className="hidden sm:inline">Revisión</span>
              </button>
            )} */}
            {!isArchivado && puedeEnviarRevision && authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_PROCESOS_FILES_SEND_TO_REVIEW) && (
              <button type="button" onClick={(e) => { e.stopPropagation(); handleEnviarARevision(archivo); }}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all text-white"
                style={{ background: '#003DA5' }}
                onMouseEnter={e => e.currentTarget.style.background = '#002870'}
                onMouseLeave={e => e.currentTarget.style.background = '#003DA5'}
                title="Enviar a Revisión y Aprobación del Jefe OCID">
                <Send className="w-3 h-3" /><span className="hidden sm:inline">Enviar a Revisión</span>
              </button>
            )}
            {!isArchivado && puedeRecargar && authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_PROCESOS_FILES_UPLOAD) && (
              <button type="button" onClick={(e) => { e.stopPropagation(); handleRecargarArchivo(archivo); }}
                className="flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-bold transition-all"
                style={{ borderColor: '#D97706', color: '#92400E', background: '#FFFBEB' }}
                onMouseEnter={e => e.currentTarget.style.background = '#FEF3C7'}
                onMouseLeave={e => e.currentTarget.style.background = '#FFFBEB'}
                title="Recargar archivo corregido">
                <RefreshCw className="w-3 h-3" /><span className="hidden sm:inline">Recargar</span>
              </button>
            )}
            {archivo.firmante === 'Archivo de la noticia' || isZip ? (
              <button type="button" onClick={(e) => { e.stopPropagation(); void handleDescargarDocumento(archivo); }}
                className="flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-bold transition-all"
                style={{ borderColor: '#D97706', color: '#92400E', background: '#FFFBEB' }}
                onMouseEnter={e => e.currentTarget.style.background = '#FEF3C7'}
                onMouseLeave={e => e.currentTarget.style.background = '#FFFBEB'}
                title={isZip ? 'Descargar archivo .ZIP' : 'Descargar evidencia de la noticia'}>
                <Download className="w-3 h-3" /><span className="hidden sm:inline">Descargar</span>
              </button>
            ) : (
              <button type="button" onClick={(e) => { e.stopPropagation(); handleVerDocumento(archivo); }}
                className="flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-bold transition-all"
                style={{ borderColor: '#2962FF', color: '#003DA5', background: '#EFF6FF' }}
                onMouseEnter={e => e.currentTarget.style.background = '#DBEAFE'}
                onMouseLeave={e => e.currentTarget.style.background = '#EFF6FF'}
                title="Ver documento">
                <Eye className="w-3 h-3" /><span className="hidden sm:inline">Ver</span>
              </button>
            )}
            {archivo.firmante !== 'Archivo de la noticia' && (
              <button type="button" onClick={(e) => { e.stopPropagation(); void handleDescargarDocumento(archivo); }}
                className="flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-bold transition-all border-gray-300 text-gray-600 bg-white hover:bg-gray-50"
                title="Descargar archivo">
                <Download className="w-3 h-3" /><span className="hidden sm:inline">Descargar</span>
              </button>
            )}
          </div>
        </div>
        {fueDevuelto && archivo.observacionesDevolucion && (
          <div className="mx-2.5 mb-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-bold text-red-800">Observaciones de devolución:</p>
                <p className="text-[10px] text-red-700 mt-0.5 leading-relaxed">{archivo.observacionesDevolucion}</p>
              </div>
            </div>
          </div>
        )}
        {estaEnRevision && (
          <div className="mx-2.5 mb-2 px-3 py-2 rounded-lg border" style={{ background: '#EFF6FF', borderColor: '#BFDBFE' }}>
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#003DA5' }} />
              <p className="text-[10px] font-semibold" style={{ color: '#003DA5' }}>
                Enviado a revisión del Jefe OCID
                {archivo.fechaEnvioRevision && ` · ${archivo.fechaEnvioRevision}`}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── Renderizado (via portal para que el backdrop cubra toda la pantalla) ──

  return createPortal(
    <>
      {/* Backdrop principal del modal */}
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={{
          backgroundColor: 'rgba(0,0,0,0.60)',
          padding: '4vh 4vw',
          zIndex: 9998
        }}
        onClick={(e) => e.target === e.currentTarget && handleIntentoCerrar()}
      >
        <motion.div
          className="relative bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{ width: '92vw', height: '88vh', maxWidth: 840, maxHeight: '95vh', minHeight: 'min(480px, 80vh)' }}
          initial={{ opacity: 0, scale: 0.97, y: 12 }}
          animate={{ opacity: 1, scale: 1,    y: 0  }}
          exit={{ opacity: 0, scale: 0.97, y: 12 }}
          transition={{ duration: 0.2 }}
        >
          {/* ══ HEADER ══ */}
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)', border: '1.5px solid #BFDBFE' }}>
                <Scale className="w-4 h-4" style={{ color: '#2962FF' }} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-base font-black leading-tight" style={{ color: '#003DA5' }}>
                    {proceso.numeroProceso}
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full uppercase"
                    style={{ backgroundColor: ec.bg, color: ec.text }}>
                    {proceso.etapaActual}
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full border flex items-center gap-1"
                    style={{ backgroundColor: sc.bg, color: sc.text, borderColor: sc.border }}>
                    <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: sc.text }} />
                    {sc.label}
                  </span>
                  {proceso.pendienteAprobacion && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                      ⚠ Pendiente
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5 truncate">
                  {proceso.noticiaOrigen} · <span className="font-semibold text-gray-700">{getNombre(proceso.denunciado)}</span>
                </p>
              </div>
            </div>
            <button onClick={handleIntentoCerrar} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg flex-shrink-0 ml-2 transition-colors">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* ══ SEMÁFORO DE TIEMPO ══ */}
          <div className="px-5 py-2.5 border-b border-gray-100 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: barColor }} />
                <span className="text-[13px] font-black" style={{ color: proceso.diasRestantes < 0 ? '#EF4444' : sc.text }}>
                  {proceso.diasRestantes < 0
                    ? `${Math.abs(proceso.diasRestantes)} días vencido`
                    : `${proceso.diasRestantes} días restantes`}
                </span>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full border"
                style={{ backgroundColor: sc.bg, borderColor: sc.border, color: sc.text }}>
                {sc.label}
              </span>
            </div>
          </div>

          {/* ══ PESTAÑAS ══ */}
          <div className="flex items-center gap-0.5 px-4 pt-2 border-b border-gray-200 flex-shrink-0 overflow-x-auto">
            {TABS.map(tab => {
              // Validar permiso de pestaña
              if (tab.permission && !authService.hasPermission(tab.permission)) return null;

              const active = tabActiva === tab.id;
              return (
                <button key={tab.id} onClick={() => setTabActiva(tab.id)}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg transition-all whitespace-nowrap flex-shrink-0"
                  style={active
                    ? { background: '#003DA5', color: '#FFF' }
                    : { color: '#6B7280' }
                  }
                >
                  {tab.icon}
                  {tab.label}
                  {tab.badge !== undefined && (
                    <span className="px-1.5 py-0.5 text-[9px] font-black rounded-full"
                      style={active
                        ? { background: 'rgba(255,255,255,0.2)', color: '#FFF' }
                        : { background: '#DBEAFE', color: '#1E40AF' }
                      }>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
            {/* Búsqueda global inline */}
            <div className="ml-auto flex items-center gap-1.5 px-2 flex-shrink-0">
              <div className="relative">
                <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" value={busquedaGlobal} onChange={e => setBusquedaGlobal(e.target.value)}
                  placeholder="Buscar en todo..."
                  className="pl-6 pr-6 py-1.5 text-[11px] bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 w-36 sm:w-44 transition-all focus:w-52"
                />
                {bgActivo && (
                  <button onClick={() => setBusquedaGlobal('')}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-gray-200 transition-colors">
                    <X className="w-2.5 h-2.5 text-gray-400" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Indicador de búsqueda global activa */}
          {bgActivo && (
            <div className="flex items-center gap-2 px-4 py-1.5 bg-blue-50 border-b border-blue-100 flex-shrink-0">
              <Search className="w-3 h-3" style={{ color: '#003DA5' }} />
              <span className="text-[10px] font-bold" style={{ color: '#003DA5' }}>
                Buscando "{busquedaGlobal}":
              </span>
              {[
                { label: 'Archivos', count: archivosFiltrados.length, tab: 'archivos' as Tab },
                { label: 'Actuaciones', count: actuacionesFiltradas.length, tab: 'actuaciones' as Tab },
                { label: 'Tareas', count: tareasFiltradas.length, tab: 'tareas' as Tab },
                { label: 'Notas', count: notasFiltradas.length, tab: 'notas' as Tab },
              ].map(s => (
                <button key={s.tab} onClick={() => setTabActiva(s.tab)}
                  className={`px-1.5 py-0.5 text-[9px] font-bold rounded-md border transition-all ${s.count > 0 ? 'bg-white border-blue-300 text-blue-700 hover:bg-blue-100' : 'bg-gray-100 border-gray-200 text-gray-400'}`}>
                  {s.count} {s.label}
                </button>
              ))}
              <button onClick={() => setBusquedaGlobal('')}
                className="ml-auto text-[10px] font-bold underline" style={{ color: '#003DA5' }}>
                Limpiar
              </button>
            </div>
          )}

          {/* ══ CONTENIDO ══ */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <AnimatePresence mode="wait">
              <motion.div key={tabActiva}
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }} className="p-5">

                {/* ── GENERAL ── */}
                {tabActiva === 'general' && (() => {
                  const origenVal = proceso.origenNoticia || (proceso as any).origen || '';
                  const fechaRecNoticia = proceso.fechaRecepcionNoticia || '';


                  const cantDenunciados = proceso.denunciados?.length ||
                    (Array.isArray(proceso.denunciado) ? proceso.denunciado.length : (proceso.denunciado ? 1 : 0));
                  const cantDenunciantes = proceso.denunciantes?.length ||
                    (Array.isArray(proceso.denunciante) ? proceso.denunciante.length : (proceso.denunciante ? 1 : 0));

                  console.log('[ModalDetallesProceso] Cantidades calculadas:', {
                    cantDenunciados,
                    cantDenunciantes
                  });
                  const cantHechos = proceso.hechosSeparados?.length || (proceso.hechos ? 1 : 0);
                  const cantAdjuntos = proceso.archivosAdjuntos?.length || 0;
                  const territorial = proceso.territorial || (proceso.denunciado && typeof proceso.denunciado !== 'string' ? (proceso.denunciado as any).dependencia : '');
                  const cargo = proceso.cargo || (proceso.denunciado && typeof proceso.denunciado !== 'string' ? (proceso.denunciado as any).cargo : '');
                  const dependencia = proceso.dependencia || '';
                  const fechaCaducidad = proceso.fechaHechos ? (() => {
                    const f = new Date(proceso.fechaHechos!);
                    f.setFullYear(f.getFullYear() + 5);
                    return f.toISOString().split('T')[0];
                  })() : null;
                  return (
                  <div className="space-y-3">
                    {/* Datos del Proceso */}
                    <div className="rounded-xl border border-gray-200 bg-gray-50 overflow-hidden">
                      <div className="px-3 py-1.5 border-b border-gray-200">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Datos del Proceso</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-200">
                        {[
                          { label: 'NÚMERO',         value: proceso.numeroProceso },
                          { label: 'ETAPA',          value: proceso.etapaActual   },
                          { label: 'NOTICIA ORIGEN', value: proceso.noticiaOrigen  },
                          { label: 'APERTURA',       value: proceso.fechaCreacion  },
                        ].map(({ label, value }) => (
                          <div key={label} className="px-3 py-2.5">
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">{label}</p>
                            <p className="text-xs font-bold text-gray-900 truncate">{value || '—'}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Datos de la Noticia Origen */}
                    {(origenVal || fechaRecNoticia || proceso.prioridadNoticia) && (
                      <div className="rounded-xl border border-blue-200 bg-blue-50/30 overflow-hidden">
                        <div className="px-3 py-1.5 border-b border-blue-200" style={{ background: 'rgba(0,61,165,0.05)' }}>
                          <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#003DA5' }}>Datos de la Noticia Disciplinaria</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-blue-100">
                          {[
                            { label: 'ORIGEN', value: origenVal || '—' },
                            { label: 'FECHA RECEPCIÓN', value: fechaRecNoticia ? new Date(fechaRecNoticia).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' }) : '—' },
                            { label: 'PRIORIDAD', value: (proceso.prioridadNoticia || (proceso as any).prioridad || '—').toString().toUpperCase() },
                            { label: 'NOTICIA', value: proceso.noticiaOrigen || '—' },
                          ].map(({ label, value }) => (
                            <div key={label} className="px-3 py-2.5">
                              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">{label}</p>
                              <p className="text-xs font-bold text-gray-900 truncate">{value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Territorial / Dependencia / Fecha Hechos */}
                    {(territorial || dependencia || proceso.fechaHechos) && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {territorial && (
                          <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <MapPin className="w-3.5 h-3.5 text-blue-600" />
                              <span className="text-[9px] font-bold text-blue-600 uppercase tracking-widest">Territorial</span>
                            </div>
                            <p className="text-xs font-bold text-gray-900">{territorial}</p>
                          </div>
                        )}
                        {dependencia && (
                          <div className="rounded-xl border border-purple-200 bg-purple-50 p-3">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <Building2 className="w-3.5 h-3.5 text-purple-600" />
                              <span className="text-[9px] font-bold text-purple-600 uppercase tracking-widest">Dependencia</span>
                            </div>
                            <p className="text-xs font-bold text-gray-900">{dependencia}</p>
                          </div>
                        )}
                        {proceso.fechaHechos && (
                          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <Calendar className="w-3.5 h-3.5 text-amber-600" />
                              <span className="text-[9px] font-bold text-amber-600 uppercase tracking-widest">Fecha de Hechos</span>
                            </div>
                            <p className="text-xs font-bold text-gray-900">
                              {new Date(proceso.fechaHechos).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                            {fechaCaducidad && (
                              <p className="text-[10px] text-amber-700 mt-1">Caducidad: {new Date(fechaCaducidad).toLocaleDateString('es-CO')}</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Conducta Disciplinaria */}
                     <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                       <div className="flex items-center gap-1.5 mb-1.5">
                         <Gavel className="w-3.5 h-3.5 text-red-600" />
                         <span className="text-[9px] font-bold text-red-600 uppercase tracking-widest">Presunta Conducta Disciplinaria</span>
                       </div>
                       {proceso.conductaSeleccionada ? (
                         <>
                           <p className="text-xs font-bold text-gray-900">{proceso.conductaSeleccionada}</p>
                           {proceso.conductaPersonalizada && (
                             <p className="text-[11px] text-gray-600 mt-1 italic">{proceso.conductaPersonalizada}</p>
                           )}
                         </>
                       ) : (
                         <p className="text-xs text-gray-500 italic">Sin conducta disciplinaria especificada</p>
                       )}
                     </div>

                    {/* Personas: Denunciante, Disciplinado, Profesional, Última Actuación */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Disciplinado(s) */}
                      <div className="rounded-xl border border-orange-200 bg-orange-50/30 p-3">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                            Disciplinado{cantDenunciados > 1 ? 's' : ''}
                          </span>
                          {cantDenunciados > 1 && (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-orange-200 text-orange-700">{cantDenunciados}</span>
                          )}
                        </div>
                        
                        <div className="space-y-4">
                            
                            {(() => {
                              // Use proceso.denunciados if available, otherwise try proceso.denunciado if it's an array,
                              // otherwise try noticia.disciplinable, otherwise fallback to proceso.denunciado as single object

                              let denunciados: any[] = [];

                              if (proceso.denunciados && proceso.denunciados.length > 0) {
                                denunciados = proceso.denunciados;
                              } else if (Array.isArray(proceso.denunciado) && proceso.denunciado.length > 0) {
                                denunciados = proceso.denunciado;
                              } else if (noticia?.disciplinable) {
                                denunciados = [{
                                  id: 'noticia-disciplinable',
                                  nombre: noticia.disciplinable.nombre,
                                  identificacion: noticia.disciplinable.documento || noticia.disciplinable.cedula || '',
                                  cargo: noticia.disciplinable.cargo || '',
                                  lugarHechos: noticia.disciplinable.lugarHechos || '',
                                  dependencia: noticia.disciplinable.dependencia || '',
                                  apoderado: noticia.disciplinable.apoderado
                                }];
                              } else if (proceso.denunciado && !Array.isArray(proceso.denunciado)) {
                                denunciados = [{
                                  id: 'fallback-denunciado',
                                  nombre: getNombre(proceso.denunciado),
                                  identificacion: getId(proceso.denunciado),
                                  cargo: cargo || '',
                                  lugarHechos: '',
                                  dependencia: proceso.dependencia || '',
                                }];
                              }





                              return denunciados.length > 0 ? (
                                denunciados.map((d, idx) => (
                                  <div key={`${d.id || 'no-id'}-${idx}`} className={`${idx > 0 ? 'pt-4 border-t border-orange-100' : ''}`}>
                                   <div className="flex items-center gap-2 mb-2">
                                     {denunciados.length > 1 && (
                                       <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white bg-orange-500">{idx + 1}</div>
                                     )}
                                     <p className="text-sm font-bold text-gray-900">{d.nombre}</p>
                                   </div>

                                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">
                                     <p><span className="font-bold text-gray-500">ID:</span> {d.identificacion || '—'}</p>
                                     <p><span className="font-bold text-gray-500">Cargo:</span> {d.cargo || '—'}</p>
                                     {d.dependencia && <p className="sm:col-span-2"><span className="font-bold text-gray-500">Dependencia:</span> {d.dependencia}</p>}
                                     {d.lugarHechos && (
                                       <p className="sm:col-span-2 flex items-start gap-1">
                                         <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0 text-gray-400" />
                                         <span>{d.lugarHechos}</span>
                                       </p>
                                     )}
                                   </div>

                                   {d.apoderado && (
                                     <div className="mt-3 p-2.5 rounded-lg bg-white border border-orange-100">
                                       <div className="flex items-center gap-1.5 mb-1.5">
                                         <Scale className="w-3 h-3 text-orange-600" />
                                         <span className="text-[9px] font-bold text-orange-600 uppercase tracking-widest">Apoderado</span>
                                       </div>
                                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 text-[10px] text-gray-700">
                                         <p><span className="font-bold text-gray-500">Nombre:</span> {d.apoderado.nombre || '—'}</p>
                                         <p><span className="font-bold text-gray-500">Cédula:</span> {d.apoderado.cedula || '—'}</p>
                                         <p><span className="font-bold text-gray-500">Correo:</span> {getApoderadoCorreo(d.apoderado) || '—'}</p>
                                         <p><span className="font-bold text-gray-500">Celular:</span> {getApoderadoCelular(d.apoderado) || '—'}</p>
                                         {d.apoderado.direccion && <p className="sm:col-span-2"><span className="font-bold text-gray-500">Dirección:</span> {d.apoderado.direccion}</p>}
                                       </div>
                                     </div>
                                   )}
                                 </div>
                               ))
                             ) : (
                               <div>
                                 <p className="text-sm font-bold text-gray-900 text-gray-400 italic">Sin información de denunciado</p>
                               </div>
                             );
                           })()}
                        </div>
                      </div>
                      
                      {/* Denunciante(s) */}
                      <div className="rounded-xl border border-gray-200 bg-white p-3">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <User className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                            Denunciante{cantDenunciantes > 1 ? 's' : ''}
                          </span>
                          {cantDenunciantes > 1 && (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-gray-200 text-gray-700">{cantDenunciantes}</span>
                          )}
                        </div>
                        
                        <div className="space-y-4">
                            
                            {(() => {
                              // Use proceso.denunciantes if available, otherwise try proceso.denunciante if it's an array,
                              // otherwise try noticia.denunciante, otherwise fallback to proceso.denunciante as single object

                              let denunciantes: any[] = [];

                              if (proceso.denunciantes && proceso.denunciantes.length > 0) {
                                denunciantes = proceso.denunciantes;
                              } else if (Array.isArray(proceso.denunciante) && proceso.denunciante.length > 0) {
                                denunciantes = proceso.denunciante;
                              } else if (noticia?.denunciante) {
                                denunciantes = [{
                                  id: 'noticia-denunciante',
                                  nombre: noticia.denunciante.nombre,
                                  identificacion: noticia.denunciante.documento || noticia.denunciante.cedula || '',
                                  direccion: noticia.denunciante.direccion || '',
                                  telefono: noticia.denunciante.telefono || '',
                                  correo: noticia.denunciante.email || '',
                                  cargo: noticia.denunciante.cargo || '',
                                  entidad: noticia.denunciante.entidad || '',
                                  tipo: (noticia.denunciante.tipo as 'Denunciante' | 'Víctima') || 'Denunciante',
                                  apoderado: noticia.denunciante.apoderado
                                }];
                              } else if (proceso.denunciante && !Array.isArray(proceso.denunciante)) {
                                denunciantes = [{
                                  id: 'fallback-denunciante',
                                  nombre: getNombre(proceso.denunciante),
                                  identificacion: getId(proceso.denunciante),
                                  direccion: '',
                                  telefono: '',
                                  correo: '',
                                  cargo: '',
                                  entidad: '',
                                  tipo: 'Denunciante' as const,
                                }];
                              }





                              return denunciantes.length > 0 ? (
                                denunciantes.map((d, idx) => (
                                  <div key={`${d.id || 'no-id'}-${idx}`} className={`${idx > 0 ? 'pt-4 border-t border-gray-100' : ''}`}>
                                   <div className="flex items-center gap-2 mb-2">
                                     {denunciantes.length > 1 && (
                                       <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white bg-blue-600">{idx + 1}</div>
                                     )}
                                     <p className="text-sm font-bold text-gray-900">{d.nombre}</p>
                                   </div>

                                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">
                                     <p><span className="font-bold text-gray-500">ID:</span> {d.identificacion || '—'}</p>
                                     {d.tipo && <p><span className="font-bold text-gray-500 text-blue-600">{d.tipo}</span></p>}
                                     {d.cargo && <p><span className="font-bold text-gray-500">Cargo:</span> {d.cargo}</p>}
                                     {d.entidad && <p><span className="font-bold text-gray-500">Entidad:</span> {d.entidad}</p>}
                                     {d.telefono && (
                                       <p className="flex items-start gap-1">
                                         <Phone className="w-3 h-3 mt-0.5 flex-shrink-0 text-gray-400" />
                                         <span>{d.telefono}</span>
                                       </p>
                                     )}
                                     {d.correo && (
                                       <p className="flex items-start gap-1">
                                         <Mail className="w-3 h-3 mt-0.5 flex-shrink-0 text-gray-400" />
                                         <span className="truncate">{d.correo}</span>
                                       </p>
                                     )}
                                     {d.direccion && (
                                       <p className="sm:col-span-2 flex items-start gap-1">
                                         <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0 text-gray-400" />
                                         <span>{d.direccion}</span>
                                       </p>
                                     )}
                                   </div>

                                   {d.apoderado && (
                                     <div className="mt-3 p-2.5 rounded-lg bg-blue-50 border border-blue-100">
                                       <div className="flex items-center gap-1.5 mb-1.5">
                                         <Scale className="w-3 h-3 text-blue-600" />
                                         <span className="text-[9px] font-bold text-blue-600 uppercase tracking-widest">Apoderado</span>
                                       </div>
                                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 text-[10px] text-gray-700">
                                         <p><span className="font-bold text-gray-500">Nombre:</span> {d.apoderado.nombre || '—'}</p>
                                         <p><span className="font-bold text-gray-500">Cédula:</span> {d.apoderado.cedula || '—'}</p>
                                         <p><span className="font-bold text-gray-500">Correo:</span> {getApoderadoCorreo(d.apoderado) || '—'}</p>
                                         <p><span className="font-bold text-gray-500">Celular:</span> {getApoderadoCelular(d.apoderado) || '—'}</p>
                                         {d.apoderado.direccion && <p className="sm:col-span-2"><span className="font-bold text-gray-500">Dirección:</span> {d.apoderado.direccion}</p>}
                                       </div>
                                     </div>
                                   )}
                                 </div>
                               ))
                             ) : (
                               <div>
                                 <p className="text-sm font-bold text-gray-900 text-gray-400 italic">Sin información de denunciante</p>
                               </div>
                             );
                           })()}
                        </div>
                      </div>


                      {/* Profesional Asignado */}
                      <div className="rounded-xl border border-gray-200 bg-white p-3">
                        <div className="flex items-center justify-between gap-1.5 mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <Briefcase className="w-3.5 h-3.5" style={{ color: '#2962FF' }} />
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Profesional Asignado</span>
                          </div>
                          {!isArchivado && authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_PROCESOS_REASIGNACION_INMEDIATA) && (
                            <button
                              onClick={() => setMostrarModalReasignar(true)}
                              className="flex items-center gap-1 px-2 py-1 text-[9px] font-bold rounded-lg border transition-all"
                              style={{ borderColor: '#2962FF', color: '#2962FF', background: '#EFF6FF' }}
                              onMouseEnter={e => { e.currentTarget.style.background = '#DBEAFE'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = '#EFF6FF'; }}
                              title="Solicitar reasignación del profesional">
                              <Users className="w-2.5 h-2.5" />
                              Reasignar
                            </button>
                          )}
                        </div>
                        <p className="text-sm font-bold text-gray-900">{getNombre(proceso.profesionalAsignado)}</p>
                        {getId(proceso.profesionalAsignado as any) && (
                          <p className="text-xs text-gray-500 mt-0.5">{getId(proceso.profesionalAsignado as any)}</p>
                        )}
                      </div>

                      {/* Última Actuación */}
                      <div className="rounded-xl border border-gray-200 bg-white p-3">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Última Actuación</span>
                        </div>
                        <p className="text-xs text-gray-700 leading-relaxed">
                          {ultimaActuacionActual || <span className="text-gray-400 italic">Sin registros</span>}
                        </p>
                      </div>
                    </div>

                    {/* Acciones del Proceso — botón dinámico según estado del auto de pliego */}
                    {proceso.estadoActual === 'ACTIVO' && (() => {
                      const autoPliego = archivosBackend.find(a =>
                        a.nombre?.includes('AUTO_FORMULACION_PLIEGO') ||
                        a.nombre?.includes('PLIEGO_CARGOS') ||
                        a.nombre?.toLowerCase().includes('pliego')
                      );

                      if (!autoPliego) {
                        return authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_PROCESOS_CREATE_PLIEGO) ? (
                            // <div className="rounded-xl border-2 border-dashed p-3" style={{ borderColor: '#D97706', background: '#FFFBEB' }}>
                            //   <button
                            //     onClick={() => setMostrarModalPliego(true)}
                            //     className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-bold text-sm transition-all hover:opacity-90"
                            //     style={{ background: '#D97706', color: 'white' }}
                            //   >
                            //     <FileText className="w-4 h-4" />
                            //     Auto Pliego de Cargos
                            //   </button>
                            //   <p className="text-[10px] text-center mt-1.5" style={{ color: '#92400E' }}>
                            //     Cierra el proceso y traslada a Oficina Jurídica
                            //   </p>
                            // </div>
                            null
                        ) : null;
                      }

                      if (autoPliego.estado === 'borrador') {
                        return authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_PROCESOS_FILES_SEND_TO_REVIEW) ? (
                            <div className="rounded-xl border-2 border-dashed p-3" style={{ borderColor: '#7C3AED', background: '#F5F3FF' }}>
                              <button
                                onClick={() => handleEnviarARevision(autoPliego)}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-bold text-sm transition-all hover:opacity-90"
                                style={{ background: '#7C3AED', color: 'white' }}
                              >
                                <Send className="w-4 h-4" />
                                Enviar a Revisión
                              </button>
                              <p className="text-[10px] text-center mt-1.5" style={{ color: '#5B21B6' }}>
                                Auto creado — envíalo al Jefe para aprobación
                              </p>
                            </div>
                        ) : null;
                      }

                      if (autoPliego.estado === 'en_revision') {
                        return (
                          <div className="rounded-xl border-2 border-dashed p-3" style={{ borderColor: '#9CA3AF', background: '#F9FAFB' }}>
                            <button
                              disabled
                              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-bold text-sm cursor-not-allowed"
                              style={{ background: '#9CA3AF', color: 'white' }}
                            >
                              <Clock className="w-4 h-4" />
                              En Revisión
                            </button>
                            <p className="text-[10px] text-center mt-1.5 text-gray-500">
                              Auto enviado al Jefe para aprobación
                            </p>
                          </div>
                        );
                      }

                      if (autoPliego.estado === 'aprobado') {
                        return authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_PROCESOS_SEND_TO_JURIDICA) ? (
                            <div className="rounded-xl border-2 border-dashed p-3" style={{ borderColor: '#2563EB', background: '#EFF6FF' }}>
                              <button
                                onClick={() => setMostrarModalEnvioJuridica(true)}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-bold text-sm transition-all hover:opacity-90"
                                style={{ background: '#2563EB', color: 'white' }}
                              >
                                <Send className="w-4 h-4" />
                                Enviar a Jurídica
                              </button>
                              <p className="text-[10px] text-center mt-1.5" style={{ color: '#1E40AF' }}>
                                Auto aprobado — listo para enviar a Oficina Jurídica
                              </p>
                            </div>
                        ) : null;
                      }

                      return null;
                    })()}

                    {/* Badge CERRADO */}
                    {proceso.estadoActual === 'CERRADO' && (
                      <div className="rounded-xl border-2 p-4" style={{ borderColor: '#D97706', background: '#FEF3C7' }}>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#D97706' }}>
                            <FileText className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-black" style={{ color: '#92400E' }}>PROCESO CERRADO</p>
                            <p className="text-[10px]" style={{ color: '#B45309' }}>Trasladado a Oficina Jurídica por Pliego de Cargos</p>
                          </div>
                        </div>
                        <p className="text-[10px]" style={{ color: '#92400E' }}>
                          Este proceso está bloqueado para modificaciones.
                        </p>
                      </div>
                    )}

                    {/* Hechos */}
                    {proceso.hechos && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <ClipboardList className="w-3.5 h-3.5 text-amber-700" />
                          <span className="text-[9px] font-bold text-amber-700 uppercase tracking-widest">Hechos</span>
                        </div>
                        <p className="text-xs text-gray-700 leading-relaxed">{proceso.hechos}</p>
                      </div>
                    )}

                    {/* Hechos Separados */}
                    {proceso.hechosSeparados && proceso.hechosSeparados.length > 0 && (
                      <div className="rounded-xl border border-gray-200 p-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <FileWarning className="w-3.5 h-3.5 text-orange-600" />
                          <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                            Hechos Individualizados ({proceso.hechosSeparados.length})
                          </span>
                        </div>
                        <div className="space-y-2">
                          {proceso.hechosSeparados.map((h, idx) => (
                            <div key={`${h.id || 'no-id'}-${idx}`} className="flex items-start gap-2">
                              <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white flex-shrink-0 mt-0.5" style={{ backgroundColor: '#003DA5' }}>{idx + 1}</div>
                              <div>
                                <p className="text-xs text-gray-700 leading-relaxed">{h.descripcion}</p>
                                {h.fecha && <p className="text-[10px] text-gray-400 mt-0.5">{new Date(h.fecha).toLocaleDateString('es-CO')}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Documentos del Expediente desde DB */}
                    {TODOS_ARCHIVOS.length > 0 && (
                      <div className="rounded-xl border border-gray-200 p-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Paperclip className="w-3.5 h-3.5 text-gray-500" />
                          <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                            Documentos del Expediente ({TODOS_ARCHIVOS.length})
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {TODOS_ARCHIVOS.slice(0, 3).map((archivo) => {
                            const esImagen = archivo.extension === 'jpg' || archivo.extension === 'png' || archivo.extension === 'jpeg' || archivo.extension === 'gif';
                            const esPdf = archivo.extension === 'pdf';
                            return (
                              <div key={archivo.id} className="flex items-center gap-2.5 p-2 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                                  style={{ backgroundColor: esPdf ? '#FEE2E2' : esImagen ? '#EDE9FE' : '#F3F4F6' }}>
                                  <FileText className="w-3.5 h-3.5" style={{ color: esPdf ? '#DC2626' : esImagen ? '#7C3AED' : '#6B7280' }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-gray-900 truncate">{archivo.nombre}</p>
                                  <p className="text-[10px] text-gray-400">
                                    {archivo.tamaño} · {archivo.fecha} · {archivo.firmante}
                                  </p>
                                </div>
                                <button className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors" onClick={() => handleDescargarDocumento(archivo)}>
                                  <Download className="w-3.5 h-3.5 text-gray-400" />
                                </button>
                              </div>
                            );
                          })}
                          {TODOS_ARCHIVOS.length > 3 && (
                            <button
                              onClick={() => setTabActiva('archivos')}
                              className="w-full flex items-center gap-1 px-3 py-2 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors text-xs font-semibold text-blue-700"
                            >
                              <FolderOpen className="w-3.5 h-3.5" />
                              Ver todos los {TODOS_ARCHIVOS.length} documentos
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* ═══ NOTICIAS ASOCIADAS ═══ */}
                    <div className="rounded-xl border border-purple-200 bg-purple-50/30 overflow-hidden">
                      <div className="px-3 py-2 border-b border-purple-200" style={{ background: 'rgba(147, 51, 234, 0.05)' }}>
                        <div className="flex items-center gap-2">
                          <Share2 className="w-3.5 h-3.5" style={{ color: '#7C3AED' }} />
                          <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#7C3AED' }}>
                            Noticias Asociadas
                          </span>
                          {noticiasAsociadasLoading && (
                            <Loader2 className="w-3 h-3 animate-spin" style={{ color: '#7C3AED' }} />
                          )}
                        </div>
                      </div>
                      <div className="p-3">
                        {noticiasAsociadasLoading ? (
                          <div className="flex items-center justify-center py-4 text-sm text-gray-500">
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            Cargando noticias asociadas...
                          </div>
                        ) : noticiasAsociadasError ? (
                          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-xs text-red-700">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4" />
                              <span className="font-semibold">{noticiasAsociadasError}</span>
                            </div>
                          </div>
                        ) : noticiasAsociadas.length === 0 ? (
                          <div className="text-center py-4">
                            <Share2 className="w-8 h-8 text-purple-200 mx-auto mb-2" />
                            <p className="text-xs text-gray-500 font-medium">Sin noticias asociadas</p>
                            <p className="text-[10px] text-gray-400 mt-1">Las noticias asociadas aparecerán aquí cuando se vinculen al proceso</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {noticiasAsociadas.map((noticia: any, idx: number) => (
                              <div key={`${noticia.id || 'no-id'}-${idx}`} className="flex items-start gap-3 p-3 rounded-lg border border-purple-100 bg-white hover:bg-purple-50/30 transition-colors">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#F3E8FF' }}>
                                  <Share2 className="w-4 h-4" style={{ color: '#7C3AED' }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold text-gray-900">{noticia.radicado || 'Sin título'}</p>
                                  <p className="text-[10px] text-gray-600 mt-0.5 leading-relaxed">{noticia.hechos || 'Sin descripción'}</p>
                                  <div className="flex items-center gap-3 mt-1.5 text-[9px] text-gray-500">
                                    <span className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      {noticia.fechaRecepcion ? new Date(noticia.fechaRecepcion).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' }) : 'Sin fecha'}
                                    </span>
                                    {noticia.prioridad && (
                                      <span className="px-1.5 py-0.5 rounded-full text-[8px] font-bold"
                                        style={{
                                          backgroundColor: noticia.prioridad === 'alta' ? '#FEE2E2' : noticia.prioridad === 'media' ? '#FEF3C7' : '#ECFDF5',
                                          color: noticia.prioridad === 'alta' ? '#991B1B' : noticia.prioridad === 'media' ? '#92400E' : '#065F46'
                                        }}>
                                        {noticia.prioridad.toUpperCase()}
                                      </span>
                                    )}
                                  </div>
                                  {noticia.fechaAsociacion && (
                                    <p className="text-[9px] text-purple-600 mt-1 font-medium">
                                      Asociada el {new Date(noticia.fechaAsociacion).toLocaleDateString('es-CO', {
                                        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                      })}
                                    </p>
                                  )}
                                  {noticia.justificacion && (
                                    <div className="mt-2 p-2 rounded-md bg-purple-50 border border-purple-100">
                                      <p className="text-[9px] font-medium text-purple-800">Justificación:</p>
                                      <p className="text-[9px] text-purple-700 mt-0.5">{noticia.justificacion}</p>
                                    </div>
                                  )}
                                  {noticia.observaciones && (
                                    <div className="mt-2 p-2 rounded-md bg-amber-50 border border-amber-100">
                                      <p className="text-[9px] font-medium text-amber-800">Observaciones:</p>
                                      <p className="text-[9px] text-amber-700 mt-0.5">{noticia.observaciones}</p>
                                    </div>
                                  )}
                                  {/* Disciplinable(s) / Denunciado(s) */}
                                  {(noticia.disciplinable || (noticia.denunciados && noticia.denunciados.length > 0)) && (
                                    <div className="mt-2 p-2 rounded-md bg-red-50 border border-red-100">
                                      <p className="text-[9px] font-medium text-red-800">
                                        Disciplinado{((noticia.denunciados?.length || 0) > 1) ? 's' : ''}:
                                      </p>
                                      <div className="mt-1 space-y-2">
                                        {noticia.denunciados && noticia.denunciados.length > 0 ? (
                                          noticia.denunciados.map((d: any, dIdx: number) => (
                                            <div key={dIdx} className={dIdx > 0 ? 'pt-1.5 border-t border-red-100/50' : ''}>
                                              <p className="text-[8px] font-bold text-red-700">{d.nombre || 'Sin información'}</p>
                                              <div className="grid grid-cols-2 gap-x-2 text-[7px] text-red-600">
                                                {d.identificacion && <p>ID: {d.identificacion}</p>}
                                                {d.cargo && <p>Cargo: {d.cargo}</p>}
                                                {d.dependencia && <p className="col-span-2">Dep: {d.dependencia}</p>}
                                              </div>
                                              {d.apoderado && (
                                                <p className="text-[7px] text-red-800 font-medium mt-0.5">Apoderado: {d.apoderado.nombre}</p>
                                              )}
                                            </div>
                                          ))
                                        ) : (
                                          <div>
                                            <p className="text-[8px] text-red-700">Nombre: {noticia.disciplinable.nombre || 'Sin información'}</p>
                                            {noticia.disciplinable.cargo && <p className="text-[8px] text-red-700">Cargo: {noticia.disciplinable.cargo}</p>}
                                            {noticia.disciplinable.dependencia && <p className="text-[8px] text-red-700">Dependencia: {noticia.disciplinable.dependencia}</p>}
                                            {noticia.disciplinable.numeroIdentificacion && (
                                              <p className="text-[8px] text-red-700">
                                                ID: {noticia.disciplinable.tipoIdentificacion || ''} {noticia.disciplinable.numeroIdentificacion}
                                              </p>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                  {/* Denunciante(s) */}
                                  {(noticia.denunciante || (noticia.denunciantes && noticia.denunciantes.length > 0)) && (
                                    <div className="mt-2 p-2 rounded-md bg-blue-50 border border-blue-100">
                                      <p className="text-[9px] font-medium text-blue-800">
                                        Denunciante{((noticia.denunciantes?.length || 0) > 1) ? 's' : ''}:
                                      </p>
                                      <div className="mt-1 space-y-2">
                                        {noticia.denunciantes && noticia.denunciantes.length > 0 ? (
                                          noticia.denunciantes.map((d: any, dIdx: number) => (
                                            <div key={dIdx} className={dIdx > 0 ? 'pt-1.5 border-t border-blue-100/50' : ''}>
                                              <p className="text-[8px] font-bold text-blue-700">{d.nombre || 'Sin información'}</p>
                                              <div className="grid grid-cols-2 gap-x-2 text-[7px] text-blue-600">
                                                {d.identificacion && <p>ID: {d.identificacion}</p>}
                                                {d.tipo && <p className="font-medium">{d.tipo}</p>}
                                                {d.cargo && <p>Cargo: {d.cargo}</p>}
                                                {d.entidad && <p>Entidad: {d.entidad}</p>}
                                                {d.correo && <p className="col-span-2 truncate">Email: {d.correo}</p>}
                                              </div>
                                              {d.apoderado && (
                                                <p className="text-[7px] text-blue-800 font-medium mt-0.5">Apoderado: {d.apoderado.nombre}</p>
                                              )}
                                            </div>
                                          ))
                                        ) : (
                                          <div>
                                            <p className="text-[8px] text-blue-700">Nombre: {noticia.denunciante.nombre || 'Sin información'}</p>
                                            {noticia.denunciante.cargo && <p className="text-[8px] text-blue-700">Cargo: {noticia.denunciante.cargo}</p>}
                                            {noticia.denunciante.entidad && <p className="text-[8px] text-blue-700">Entidad: {noticia.denunciante.entidad}</p>}
                                            {noticia.denunciante.numeroIdentificacion && (
                                              <p className="text-[8px] text-blue-700">
                                                ID: {noticia.denunciante.tipoIdentificacion || ''} {noticia.denunciante.numeroIdentificacion}
                                              </p>
                                            )}
                                            {noticia.denunciante.telefono && <p className="text-[8px] text-blue-700">Teléfono: {noticia.denunciante.telefono}</p>}
                                            {noticia.denunciante.correo && <p className="text-[8px] text-blue-700">Correo: {noticia.denunciante.correo}</p>}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                  {(noticia.origen) && (
                                    <div className="mt-2 p-2 rounded-md bg-green-50 border border-green-100">
                                      
                                      <div className="mt-1 space-y-0.5">
                                        {noticia.origen && <p className="text-[8px] text-green-700">Origen: {noticia.origen}</p>}
                                        
                                      </div>
                                    </div>
                                  )}
                                  {(noticia.territorial) && (
                                    <div className="mt-2 p-2 rounded-md bg-green-50 border border-green-100">
                                      
                                      <div className="mt-1 space-y-0.5">
                                        
                                        {noticia.territorial && <p className="text-[8px] text-green-700">Territorial: {noticia.territorial}</p>}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ═══ SCORECARD: Progreso por Etapa ═══ */}
                    <div className="rounded-xl border border-gray-200 overflow-hidden">
                      <div className="px-3 py-2 border-b border-gray-200 flex items-center gap-2" style={{ background: 'linear-gradient(135deg, #F0F4FF 0%, #E8F5E9 100%)' }}>
                        <BarChart3 className="w-3.5 h-3.5" style={{ color: '#003DA5' }} />
                        <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#003DA5' }}>
                          Scorecard del Proceso por Etapa
                        </span>
                        <button onClick={exportarExpedienteCompleto}
                          className="ml-auto flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold rounded-md border transition-all"
                          style={{ borderColor: '#059669', color: '#065F46', background: '#ECFDF5' }}
                          title="Exportar expediente completo">
                          <FileDown className="w-2.5 h-2.5" />CSV
                        </button>
                      </div>
                      <div className="p-3 bg-white">
                        {/* Etapa actual indicator */}
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-[9px] font-bold text-gray-500 uppercase">Etapa actual:</span>
                          {(() => {
                            const epcA = etapaColor(proceso.etapaActual);
                            const etapaIdx = ORDEN_ETAPAS.indexOf(proceso.etapaActual);
                            return (
                              <span className="px-2 py-0.5 text-[10px] font-black rounded-lg inline-flex items-center gap-1"
                                style={{ backgroundColor: epcA.bg, color: epcA.text, border: `1px solid ${epcA.text}33` }}>
                                <Zap className="w-2.5 h-2.5" />{proceso.etapaActual}
                                {etapaIdx >= 0 && <span className="opacity-60 ml-1">({etapaIdx + 1}/{ORDEN_ETAPAS.length})</span>}
                              </span>
                            );
                          })()}
                        </div>

                        {/* Progress bar visual */}
                        <div className="flex items-center gap-0.5 mb-3">
                          {ORDEN_ETAPAS.map((etapa, idx) => {
                            const epc = etapaColor(etapa);
                            const isCurrent = etapa === proceso.etapaActual;
                            const isPast = ORDEN_ETAPAS.indexOf(proceso.etapaActual) > idx;
                            return (
                              <div key={etapa} className="flex-1 relative group">
                                <div className="h-2 rounded-full transition-all"
                                  style={{
                                    backgroundColor: isCurrent ? epc.text : isPast ? epc.text : '#E5E7EB',
                                    opacity: isCurrent ? 1 : isPast ? 0.6 : 0.3,
                                  }} />
                                {isCurrent && (
                                  <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-white shadow-sm"
                                    style={{ backgroundColor: epc.text }} />
                                )}
                                <p className="text-center text-[7px] font-bold mt-1 leading-tight truncate"
                                  style={{ color: isCurrent ? epc.text : isPast ? epc.text : '#9CA3AF' }}>
                                  {etapa}
                                </p>
                              </div>
                            );
                          })}
                        </div>

                        {/* Tabla scorecard */}
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                          <div className="grid grid-cols-5 text-[8px] font-black text-gray-500 uppercase tracking-wider bg-gray-50 border-b border-gray-200">
                            <div className="px-2 py-1.5 col-span-1">Etapa</div>
                            <div className="px-2 py-1.5 text-center">Docs</div>
                            <div className="px-2 py-1.5 text-center">Actuac.</div>
                            <div className="px-2 py-1.5 text-center">Tareas</div>
                            <div className="px-2 py-1.5 text-center">Notas</div>
                          </div>
                          {ORDEN_ETAPAS.map(etapa => {
                            const epc = etapaColor(etapa);
                            const nDocs = TODOS_ARCHIVOS.filter(a => a.etapaProceso === etapa).length;
                            const nAprobados = TODOS_ARCHIVOS.filter(a => a.etapaProceso === etapa && a.estado === 'aprobado').length;
                            const nAct = actuaciones.filter(a => a.etapa === etapa).length;
                            const nTar = tareas.filter(t => t.etapa === etapa).length;
                            const nTarDone = tareas.filter(t => t.etapa === etapa && t.completada).length;
                            const nNot = notas.filter(n => n.etapa === etapa).length;
                            const hasData = nDocs + nAct + nTar + nNot > 0;
                            const isCurrent = etapa === proceso.etapaActual;
                            return (
                              <div key={etapa} className={`grid grid-cols-5 text-[10px] border-b border-gray-100 last:border-b-0 transition-colors ${isCurrent ? 'bg-blue-50/40' : hasData ? 'bg-white' : 'bg-gray-50/50 opacity-50'}`}>
                                <div className="px-2 py-1.5 col-span-1 flex items-center gap-1 min-w-0">
                                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: hasData || isCurrent ? epc.text : '#D1D5DB' }} />
                                  <span className="font-bold truncate" style={{ color: isCurrent ? epc.text : '#374151' }}>{etapa}</span>
                                  {isCurrent && <span className="text-[7px] font-black px-1 rounded text-white flex-shrink-0" style={{ backgroundColor: '#003DA5' }}>ACT</span>}
                                </div>
                                <div className={`px-2 py-1.5 text-center font-bold ${nDocs > 0 ? 'cursor-pointer hover:bg-blue-50 rounded transition-colors' : ''}`}
                                  onClick={() => nDocs > 0 && navigateToTab('archivos', etapa)} title={nDocs > 0 ? `Ver ${nDocs} documentos en ${etapa}` : ''}>
                                  {nDocs > 0 ? (
                                    <span className="underline decoration-dotted decoration-blue-300">
                                      <span className="text-gray-900">{nDocs}</span>
                                      {nAprobados > 0 && <span className="text-green-600 ml-0.5">({nAprobados}✓)</span>}
                                    </span>
                                  ) : <span className="text-gray-300">&mdash;</span>}
                                </div>
                                <div className={`px-2 py-1.5 text-center font-bold ${nAct > 0 ? 'cursor-pointer hover:bg-purple-50 rounded transition-colors' : ''}`}
                                  onClick={() => nAct > 0 && navigateToTab('actuaciones', etapa)} title={nAct > 0 ? `Ver ${nAct} actuaciones en ${etapa}` : ''}>
                                  {nAct > 0 ? <span className="text-gray-900 underline decoration-dotted decoration-purple-300">{nAct}</span> : <span className="text-gray-300">&mdash;</span>}
                                </div>
                                <div className={`px-2 py-1.5 text-center font-bold ${nTar > 0 ? 'cursor-pointer hover:bg-amber-50 rounded transition-colors' : ''}`}
                                  onClick={() => nTar > 0 && navigateToTab('tareas', etapa)} title={nTar > 0 ? `Ver ${nTar} tareas en ${etapa}` : ''}>
                                  {nTar > 0 ? (
                                    <span className="underline decoration-dotted decoration-amber-300">
                                      <span className="text-gray-900">{nTar}</span>
                                      {nTarDone > 0 && <span className="text-green-600 ml-0.5">({nTarDone}✓)</span>}
                                    </span>
                                  ) : <span className="text-gray-300">&mdash;</span>}
                                </div>
                                <div className={`px-2 py-1.5 text-center font-bold ${nNot > 0 ? 'cursor-pointer hover:bg-orange-50 rounded transition-colors' : ''}`}
                                  onClick={() => nNot > 0 && navigateToTab('notas', etapa)} title={nNot > 0 ? `Ver ${nNot} notas en ${etapa}` : ''}>
                                  {nNot > 0 ? <span className="text-gray-900 underline decoration-dotted decoration-orange-300">{nNot}</span> : <span className="text-gray-300">&mdash;</span>}
                                </div>
                              </div>
                            );
                          })}
                          {/* Totals row */}
                          <div className="grid grid-cols-5 text-[10px] bg-gray-100 border-t border-gray-300">
                            <div className="px-2 py-1.5 col-span-1 font-black text-gray-700">TOTAL</div>
                            <div className="px-2 py-1.5 text-center font-black text-gray-900">{TODOS_ARCHIVOS.length}</div>
                            <div className="px-2 py-1.5 text-center font-black text-gray-900">{actuaciones.length}</div>
                            <div className="px-2 py-1.5 text-center font-black text-gray-900">{tareas.length}</div>
                            <div className="px-2 py-1.5 text-center font-black text-gray-900">{notas.length}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ═══ HISTORIAL DE CAMBIOS DE ETAPA ═══ */}
                    <div className="rounded-xl border border-gray-200 overflow-hidden">
                      <div className="px-3 py-2 border-b border-gray-200 flex items-center gap-2 bg-gradient-to-r from-purple-50 to-blue-50">
                        <History className="w-3.5 h-3.5 text-purple-600" />
                        <span className="text-[10px] font-black text-purple-700 uppercase tracking-widest">
                          Historial de Cambios de Etapa
                        </span>
                        <span className="ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full text-white bg-purple-500">
                          {historialEtapas.length} transiciones
                        </span>
                      </div>
                      <div className="p-3 bg-white">
                        <div className="relative">
                          {/* Línea vertical de timeline */}
                          <div className="absolute left-[9px] top-2 bottom-2 w-px bg-gradient-to-b from-purple-300 via-blue-300 to-green-300" />
                          <div className="space-y-3">
                            {historialEtapas.map((h, idx) => {
                              const epcHacia = etapaColor(h.hacia);
                              const epcDesde = h.desde !== '—' ? etapaColor(h.desde) : null;
                              const isLast = idx === historialEtapas.length - 1;
                              return (
                                <div key={h.id} className="flex items-start gap-3 relative pl-6">
                                  {/* Nodo del timeline */}
                                  <div className="absolute left-0 top-1 w-[19px] h-[19px] rounded-full border-2 border-white shadow-sm flex items-center justify-center"
                                    style={{ backgroundColor: epcHacia.text }}>
                                    {isLast ? (
                                      <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                                    ) : (
                                      <CheckCircle className="w-2.5 h-2.5 text-white" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      {epcDesde && (
                                        <>
                                          <span className="px-1.5 py-0.5 text-[8px] font-bold rounded inline-flex items-center gap-0.5"
                                            style={{ backgroundColor: epcDesde.bg, color: epcDesde.text, border: `1px solid ${epcDesde.text}22` }}>
                                            {h.desde}
                                          </span>
                                          <ChevronRight className="w-3 h-3 text-gray-400" />
                                        </>
                                      )}
                                      <span className="px-1.5 py-0.5 text-[8px] font-bold rounded inline-flex items-center gap-0.5"
                                        style={{ backgroundColor: epcHacia.bg, color: epcHacia.text, border: `1px solid ${epcHacia.text}22` }}>
                                        <Zap className="w-2 h-2" />{h.hacia}
                                      </span>
                                      {isLast && (
                                        <span className="text-[7px] font-black px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: '#003DA5' }}>
                                          ETAPA ACTUAL
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-gray-700 mt-1 leading-relaxed">{h.motivo}</p>
                                    <div className="flex items-center gap-3 mt-1">
                                      <span className="text-[9px] text-gray-400 flex items-center gap-0.5">
                                        <Calendar className="w-2.5 h-2.5" />{formatFechaActuacion(h.fecha)}
                                      </span>
                                      <span className="text-[9px] text-gray-400 flex items-center gap-0.5">
                                        <User className="w-2.5 h-2.5" />{h.responsable}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Badges resumen */}
                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-purple-200 bg-purple-50 text-xs font-bold text-purple-700">
                        <span className="font-black">{proceso.borradores?.length || 0}</span> Borradores
                      </span>
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-blue-200 bg-blue-50 text-xs font-bold" style={{ color: '#003DA5' }}>
                        <span className="font-black">{proceso.documentos?.length || 0}</span> Documentos
                      </span>
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold"
                        style={{ backgroundColor: sc.bg, borderColor: sc.border, color: sc.text }}>
                        <span className="font-black">{proceso.diasRestantes}d</span> restantes
                      </span>
                      {cantDenunciados > 0 && (
                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-orange-200 bg-orange-50 text-xs font-bold text-orange-700">
                          <Users className="w-3 h-3" />
                          <span className="font-black">{cantDenunciados}</span> disciplinado{cantDenunciados !== 1 ? 's' : ''}
                        </span>
                      )}
                      {cantAdjuntos > 0 && (
                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-gray-200 bg-gray-50 text-xs font-bold text-gray-600">
                          <Paperclip className="w-3 h-3" />
                          <span className="font-black">{cantAdjuntos}</span> adjunto{cantAdjuntos !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  );
                })()}

                {/* ── ARCHIVOS ── */}
                {tabActiva === 'archivos' && (
                  <div className="space-y-3">
                    {/* Acceso rápido — chips inline (solo si no está archivado) */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {!isArchivado && TIPO_ARCHIVO.map(({ tipo, label, icon: Icon, color, bg, border, onClick }) => {
                        const count = TODOS_ARCHIVOS.filter(a => a.tipo === tipo).length;
                        return (
                          <button key={tipo} onClick={onClick}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all hover:shadow-sm"
                            style={{ backgroundColor: bg, borderColor: border }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.boxShadow = `0 0 0 1px ${color}20`; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = border; e.currentTarget.style.boxShadow = 'none'; }}>
                            <Icon className="w-3.5 h-3.5" style={{ color }} />
                            <span className="text-[11px] font-semibold text-gray-700">{label}</span>
                            <span className="min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold rounded-md text-white"
                              style={{ backgroundColor: color }}>{count}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Búsqueda y filtro */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex-1 min-w-40 relative">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
                          placeholder="Buscar por nombre o firmante..."
                          className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 bg-gray-50" />
                      </div>
                      <select value={filtro} onChange={e => setFiltro(e.target.value as any)}
                        className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 bg-gray-50 font-semibold">
                        <option value="TODOS">TODOS</option>
                        <option value="auto">Autos</option>
                        <option value="evidencia">Evidencias</option>
                        <option value="oficio">Oficios</option>
                        <option value="acta">Actas</option>
                      </select>
                       {/* <button onClick={() => inputArchivoRef.current?.click()}
                         className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg text-white"
                         style={{ background: '#003DA5' }}>
                         <Upload className="w-3.5 h-3.5" />Cargar
                       </button>
                       <input ref={inputArchivoRef} type="file" multiple className="hidden"
                         accept={EXTENSIONES_PERMITIDAS.map(e => `.${e}`).join(',')}
                         onChange={(e) => handleFilesSelected(e.target.files)} />
                       <button onClick={() => toast.info('Descargando todos...')}
                         className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50">
                         <Download className="w-3.5 h-3.5" />Todos
                       </button> */}
                    </div>

                    {/* ═══ Filtro por Etapa + Toggle vista agrupada ═══ */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1 mr-1">
                          <Filter className="w-3 h-3 text-gray-400" />
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Etapa:</span>
                        </div>
                        <button
                          onClick={() => setFiltroEtapa('TODAS')}
                          className="px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all"
                          style={{
                            backgroundColor: filtroEtapa === 'TODAS' ? '#003DA5' : '#F9FAFB',
                            color: filtroEtapa === 'TODAS' ? '#FFFFFF' : '#6B7280',
                            borderColor: filtroEtapa === 'TODAS' ? '#003DA5' : '#E5E7EB',
                          }}>
                          Todas ({TODOS_ARCHIVOS.length})
                        </button>
                        {etapasOrdenadas.map(etapa => {
                          const epc = etapaColor(etapa);
                          const count = TODOS_ARCHIVOS.filter(a => a.etapaProceso === etapa).length;
                          const activo = filtroEtapa === etapa;
                          return (
                            <button key={etapa}
                              onClick={() => setFiltroEtapa(activo ? 'TODAS' : etapa)}
                              className="px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all inline-flex items-center gap-1"
                              style={{
                                backgroundColor: activo ? epc.text : epc.bg,
                                color: activo ? '#FFFFFF' : epc.text,
                                borderColor: activo ? epc.text : `${epc.text}33`,
                              }}>
                              <Zap className="w-2.5 h-2.5" />
                              {etapa} ({count})
                            </button>
                          );
                        })}
                        <div className="ml-auto flex items-center">
                          <button
                            onClick={() => setVistaAgrupada(!vistaAgrupada)}
                            className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all"
                            style={{
                              backgroundColor: vistaAgrupada ? '#003DA5' : '#F9FAFB',
                              color: vistaAgrupada ? '#FFFFFF' : '#6B7280',
                              borderColor: vistaAgrupada ? '#003DA5' : '#E5E7EB',
                            }}
                            title={vistaAgrupada ? 'Cambiar a vista lista' : 'Cambiar a vista agrupada por etapa'}>
                            <Layers className="w-3 h-3" />
                            <span className="hidden sm:inline">{vistaAgrupada ? 'Agrupado' : 'Agrupar'}</span>
                          </button>
                        </div>
                      </div>

                      {/* ═══ Resumen visual por etapa ═══ */}
                      {vistaAgrupada && etapasOrdenadas.length > 0 && (
                        <div className="p-3 rounded-xl border border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                          <div className="flex items-center gap-1.5 mb-2.5">
                            <BarChart3 className="w-3.5 h-3.5" style={{ color: '#003DA5' }} />
                            <span className="text-[10px] font-black text-gray-700 uppercase tracking-wider">
                              Distribución por Etapa del Proceso
                            </span>
                            <button onClick={exportarResumenCSV}
                              className="ml-auto flex items-center gap-1 px-2 py-1 text-[9px] font-bold rounded-lg border transition-all hover:shadow-sm"
                              style={{ borderColor: '#003DA5', color: '#003DA5', background: '#EFF6FF' }}
                              onMouseEnter={e => { e.currentTarget.style.background = '#DBEAFE'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = '#EFF6FF'; }}
                              title="Exportar distribución a CSV (compatible con Excel)">
                              <FileDown className="w-3 h-3" />Exportar CSV
                            </button>
                          </div>
                          <div className="space-y-1.5">
                            {etapasOrdenadas.map(etapa => {
                              const epc = etapaColor(etapa);
                              const total = TODOS_ARCHIVOS.filter(a => a.etapaProceso === etapa).length;
                              const aprobados = TODOS_ARCHIVOS.filter(a => a.etapaProceso === etapa && a.estado === 'aprobado').length;
                              const pctBar = TODOS_ARCHIVOS.length > 0 ? (total / TODOS_ARCHIVOS.length) * 100 : 0;
                              return (
                                <button key={etapa}
                                  onClick={() => setFiltroEtapa(filtroEtapa === etapa ? 'TODAS' : etapa)}
                                  className="w-full group">
                                  <div className="flex items-center gap-2">
                                    <span className="w-[80px] text-[10px] font-bold text-right flex-shrink-0 truncate"
                                      style={{ color: epc.text }}>{etapa}</span>
                                    <div className="flex-1 h-5 rounded-md bg-gray-100 overflow-hidden relative">
                                      <div className="h-full rounded-md transition-all duration-500 flex items-center"
                                        style={{ width: `${Math.max(pctBar, 8)}%`, backgroundColor: epc.text }}>
                                      </div>
                                      <div className="absolute inset-0 flex items-center px-2 justify-between">
                                        <span className="text-[9px] font-black" style={{ color: pctBar > 40 ? '#FFFFFF' : epc.text }}>
                                          {total} doc{total !== 1 ? 's' : ''}
                                        </span>
                                        <span className="text-[8px] font-bold" style={{ color: pctBar > 60 ? 'rgba(255,255,255,0.8)' : '#9CA3AF' }}>
                                          {aprobados}/{total} aprobados
                                        </span>
                                      </div>
                                    </div>
                                    <span className="text-[10px] font-black w-[32px] text-right flex-shrink-0"
                                      style={{ color: epc.text }}>
                                      {Math.round(pctBar)}%
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                          {/* Totales mini */}
                          <div className="flex items-center gap-3 mt-2.5 pt-2 border-t border-gray-200">
                            <span className="text-[9px] font-bold text-gray-500">
                              Total: <span className="font-black text-gray-800">{TODOS_ARCHIVOS.length}</span> docs
                            </span>
                            <span className="text-[9px] font-bold text-green-600">
                              ✓ {TODOS_ARCHIVOS.filter(a => a.estado === 'aprobado').length} aprobados
                            </span>
                            <span className="text-[9px] font-bold text-amber-600">
                              ✎ {TODOS_ARCHIVOS.filter(a => a.estado === 'borrador').length} borradores
                            </span>
                            <span className="text-[9px] font-bold" style={{ color: '#003DA5' }}>
                              ⏱ {TODOS_ARCHIVOS.filter(a => a.estado === 'en_revision').length} en revisión
                            </span>
                            <span className="text-[9px] font-bold text-red-600">
                              ↩ {TODOS_ARCHIVOS.filter(a => a.estado === 'devuelto').length} devueltos
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                     {/* Zona Drag & Drop - OCULTADO */}
                     {/* <div
                       onDragOver={handleDragOver}
                       onDragLeave={handleDragLeave}
                       onDrop={handleDrop}
                       onClick={() => inputArchivoRef.current?.click()}
                       className="relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all"
                       style={{
                         borderColor: dragging ? '#003DA5' : '#D1D5DB',
                         backgroundColor: dragging ? '#EFF6FF' : '#FAFAFA',
                       }}
                     >
                       <div className="flex flex-col items-center gap-1.5">
                         <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                           style={{ backgroundColor: dragging ? '#DBEAFE' : '#F3F4F6' }}>
                           <Upload className="w-4 h-4" style={{ color: dragging ? '#003DA5' : '#9CA3AF' }} />
                         </div>
                         <p className="text-xs font-semibold" style={{ color: dragging ? '#003DA5' : '#6B7280' }}>
                           {dragging ? 'Suelte aquí para cargar' : 'Arrastre archivos aquí o haga clic para seleccionar'}
                         </p>
                         <p className="text-[10px] text-gray-400">
                           Máximo 10 GB por archivo · Archivos grandes (&gt;200 MB) se cargan en segundo plano
                         </p>
                         <span className="px-2 py-0.5 text-[9px] font-bold rounded inline-flex items-center gap-1 mt-0.5"
                           style={{ backgroundColor: ec.bg, color: ec.text, border: `1px solid ${ec.text}22` }}>
                           <Zap className="w-2.5 h-2.5" />Se marcara como: {proceso.etapaActual}
                         </span>
                       </div>
                     </div> */}

                     {/* Cargas activas - OCULTADO */}
                     {/* {(cargasActivas.length > 0 || archivosEnColaCount > 0) && (
                       <div className="space-y-2">
                         <div className="flex items-center gap-1.5">
                           <Loader2 className="w-3 h-3 animate-spin" style={{ color: '#003DA5' }} />
                           <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#003DA5' }}>
                             Cargas en progreso ({cargasActivas.filter(c => c.estado === 'subiendo' || c.estado === 'procesando' || c.estado === 'validando').length})
                           </span>
                           {archivosEnColaCount > 0 && (
                             <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide bg-amber-100 text-amber-700">
                               En cola: {archivosEnColaCount}
                             </span>
                           )}
                         </div>
                         {cargasActivas.map(carga => {
                           const activo = carga.estado === 'subiendo' || carga.estado === 'procesando' || carga.estado === 'validando';
                           const pctRound = Math.round(carga.progreso);
                           return (
                             <div key={carga.id}
                               className="flex items-center gap-2.5 p-2.5 rounded-xl border transition-all"
                               style={{
                                 borderColor: carga.estado === 'completado' ? '#6EE7B7'
                                   : carga.estado === 'error' || carga.estado === 'cancelado' ? '#FCA5A5'
                                   : '#93C5FD',
                                 backgroundColor: carga.estado === 'completado' ? '#F0FDF4'
                                   : carga.estado === 'error' || carga.estado === 'cancelado' ? '#FEF2F2'
                                   : '#EFF6FF',
                               }}>
                               <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                 style={{ backgroundColor: activo ? '#DBEAFE' : carga.estado === 'completado' ? '#D1FAE5' : '#FEE2E2' }}>
                                 {activo ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#003DA5' }} />
                                   : carga.estado === 'completado' ? <CheckCircle className="w-4 h-4 text-green-600" />
                                   : <XCircle className="w-4 h-4 text-red-500" />}
                               </div>
                               <div className="flex-1 min-w-0">
                                 <div className="flex items-center gap-2">
                                   <p className="text-xs font-semibold text-gray-900 truncate">{carga.nombre}</p>
                                   {carga.esGrande && (
                                     <span className="px-1.5 py-0.5 text-[8px] font-bold rounded bg-amber-100 text-amber-700 flex-shrink-0">GRANDE</span>
                                   )}
                                 </div>
                                 <p className="text-[10px] text-gray-500 mt-0.5">
                                   {carga.estado === 'subiendo' && `${formatBytes(carga.bytesSubidos)} / ${formatBytes(carga.tamano)} · ${carga.velocidad}`}
                                   {carga.estado === 'validando' && 'Validando...'}
                                   {carga.estado === 'procesando' && 'Procesando en servidor...'}
                                   {carga.estado === 'completado' && `${formatBytes(carga.tamano)} · Completado`}
                                   {carga.estado === 'error' && (carga.error || 'Error')}
                                   {carga.estado === 'cancelado' && 'Cancelado'}
                                 </p>
                                 {activo && (
                                   <div className="w-full h-1.5 bg-white/60 rounded-full overflow-hidden mt-1.5">
                                     <div className="h-full rounded-full transition-all duration-300"
                                       style={{ width: `${pctRound}%`, background: '#003DA5' }} />
                                   </div>
                                 )}
                               </div>
                               {activo && (
                                 <div className="flex items-center gap-2 flex-shrink-0">
                                   <span className="text-xs font-black" style={{ color: '#003DA5' }}>{pctRound}%</span>
                                   <button onClick={() => cancelarCarga(carga.id)}
                                     className="p-1 rounded-lg hover:bg-red-100 transition-colors" title="Cancelar carga">
                                     <XCircle className="w-3.5 h-3.5 text-red-400 hover:text-red-600" />
                                   </button>
                                 </div>
                               )}
                             </div>
                           );
                         })}
                       </div>
                     )} */}

                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold" style={{ color: archivosFiltrados.length === 0 ? '#F59E0B' : '#003DA5' }}>
                        {archivosFiltrados.length} de {TODOS_ARCHIVOS.length} documentos
                        {filtroEtapa !== 'TODAS' && (
                          <span className="ml-1 text-[10px] font-semibold text-gray-500">
                            (filtrado: {filtroEtapa})
                          </span>
                        )}
                      </p>
                      {(filtro !== 'TODOS' || filtroEtapa !== 'TODAS' || busqueda) && (
                        <button onClick={() => { setFiltro('TODOS'); setFiltroEtapa('TODAS'); setBusqueda(''); }}
                          className="text-[10px] font-bold underline" style={{ color: '#003DA5' }}>
                          Limpiar filtros
                        </button>
                      )}
                    </div>

                    {archivosFiltrados.length === 0 ? (
                      <div className="flex flex-col items-center py-10 text-gray-400">
                        <FileText className="w-10 h-10 text-blue-200 mb-2" />
                        <p className="text-sm font-medium text-gray-500">Sin documentos</p>
                        {filtroEtapa !== 'TODAS' && (
                          <button onClick={() => setFiltroEtapa('TODAS')}
                            className="mt-2 text-[11px] font-bold underline" style={{ color: '#003DA5' }}>
                            Limpiar filtro de etapa
                          </button>
                        )}
                      </div>
                    ) : vistaAgrupada ? (
                      /* ═══ VISTA AGRUPADA POR ETAPA ═══ */
                      <div className="space-y-3">
                        {Object.entries(archivosAgrupados).map(([etapa, archivosGrupo]) => {
                          const epc = etapa === 'Sin etapa'
                            ? { bg: '#F3F4F6', text: '#374151' }
                            : etapaColor(etapa);
                          const aprobados = archivosGrupo.filter(a => a.estado === 'aprobado').length;
                          return (
                            <div key={etapa} className="rounded-xl border overflow-hidden" style={{ borderColor: `${epc.text}33` }}>
                              {/* Encabezado de grupo */}
                              <div className="flex items-center gap-2.5 px-3 py-2" style={{ backgroundColor: epc.bg }}>
                                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: epc.text }}>
                                  <Zap className="w-3 h-3 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[11px] font-black" style={{ color: epc.text }}>{etapa}</p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: epc.text }}>
                                    {archivosGrupo.length} doc{archivosGrupo.length !== 1 ? 's' : ''}
                                  </span>
                                  <span className="text-[9px] font-semibold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">
                                    ✓ {aprobados}
                                  </span>
                                </div>
                              </div>
                              {/* Archivos del grupo */}
                              <div className="p-1.5 space-y-1.5 bg-white">
                                {archivosGrupo.map(archivo => renderArchivoFila(archivo, true))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* ═══ VISTA LISTA PLANA ═══ */
                      <div className="space-y-2">
                        {archivosFiltrados.map(archivo => renderArchivoFila(archivo, false))}
                      </div>
                    )}

                    <div className="pt-2 border-t border-gray-100">
                      <button onClick={onHistorial}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all text-xs font-semibold text-gray-600">
                        <History className="w-3.5 h-3.5 text-gray-400" />
                        Ver Historial de Auditoría
                        <ChevronRight className="w-3.5 h-3.5 ml-auto text-gray-400" />
                      </button>
                    </div>
                  </div>
                )}

                {/* ── ACTUACIONES ── */}
                {tabActiva === 'actuaciones' && (() => {
                  // Helper render fila actuacion
                  const renderActFila = (act: ActuacionItem, idx: number, total: number, ocultarEtapa = false) => {
                    const at = TIPO_ACT[act.tipo] || { color: '#6B7280', label: act.tipo };
                    const expandida = actuacionExpandidaId === act.id;
                    const fechaVisible = formatFechaActuacion(act.fecha);
                    const fechaRegistro = act.createdAt ? formatFechaActuacion(act.createdAt, true) : null;
                    const tieneObservaciones = !!act.observaciones?.trim();

                    return (
                      <div key={act.id} className="flex gap-2.5">
                        <div className="flex flex-col items-center flex-shrink-0">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: at.color }}>{idx + 1}</div>
                          {idx < total - 1 && <div className="w-px flex-1 bg-gray-200 my-1" />}
                        </div>
                        <div className="flex-1 pb-3">
                          <motion.div
                            layout
                            className="overflow-hidden rounded-2xl border border-gray-200 bg-white transition-all"
                            style={{ boxShadow: expandida ? `0 0 0 1px ${at.color}22, 0 12px 30px rgba(15, 23, 42, 0.08)` : 'none' }}
                          >
                            <motion.button
                              layout="position"
                              type="button"
                              onClick={() => setActuacionExpandidaId(expandida ? null : act.id)}
                              className="w-full px-3 py-3 text-left hover:bg-gray-50/80 transition-colors"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                                    {!ocultarEtapa && act.etapa && (() => {
                                      const epc = etapaColor(act.etapa);
                                      return (
                                        <span
                                          className="px-2 py-0.5 text-[9px] font-bold rounded-full inline-flex items-center gap-1"
                                          style={{ backgroundColor: epc.bg, color: epc.text, border: `1px solid ${epc.text}22` }}
                                        >
                                          <Zap className="w-2.5 h-2.5" />{act.etapa}
                                        </span>
                                      );
                                    })()}
                                    <span className="px-2 py-0.5 text-[9px] font-bold rounded-full text-white" style={{ backgroundColor: at.color }}>
                                      {at.label}
                                    </span>
                                  </div>
                                  <p className="text-sm font-semibold text-gray-900 leading-snug">{act.descripcion}</p>
                                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500">
                                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{fechaVisible}</span>
                                    <span className="flex items-center gap-1"><User className="w-3 h-3" />{act.responsable}</span>
                                    {tieneObservaciones && (
                                      <span className="text-[10px] font-bold" style={{ color: at.color }}>
                                        Con observaciones
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 pl-2 flex-shrink-0">
                                  <span className="hidden sm:inline text-[10px] font-bold text-gray-400">
                                    {expandida ? 'Ocultar detalle' : 'Ver detalle'}
                                  </span>
                                  <div className="w-8 h-8 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-500">
                                    {expandida ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                  </div>
                                </div>
                              </div>
                            </motion.button>

                            <AnimatePresence initial={false}>
                              {expandida && (
                                <motion.div
                                  key={`actuacion-detalle-${act.id}`}
                                  initial={{ opacity: 0, height: 0, y: -6 }}
                                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                                  exit={{ opacity: 0, height: 0, y: -4 }}
                                  transition={{ duration: 0.18, ease: 'easeOut' }}
                                  className="overflow-hidden border-t border-gray-100 bg-gradient-to-b from-white to-slate-50"
                                >
                                  <div className="px-3 pb-3 pt-2.5">
                                <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-3">
                                  <div className="space-y-3">
                                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Descripcion completa</p>
                                      <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{act.descripcion}</p>
                                    </div>
                                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Observaciones</p>
                                      <p className={`mt-1.5 text-sm leading-relaxed ${tieneObservaciones ? 'text-slate-700' : 'text-slate-400 italic'}`}>
                                        {tieneObservaciones ? act.observaciones : 'No se registraron observaciones adicionales para esta actuacion.'}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Datos del registro</p>
                                    <div className="mt-2.5 space-y-2.5 text-sm">
                                      <div className="flex items-start justify-between gap-3">
                                        <span className="text-slate-500">Tipo</span>
                                        <span className="font-bold" style={{ color: at.color }}>{at.label}</span>
                                      </div>
                                      <div className="flex items-start justify-between gap-3">
                                        <span className="text-slate-500">Etapa</span>
                                        <span className="font-bold text-slate-800">{act.etapa || 'Sin etapa'}</span>
                                      </div>
                                      <div className="flex items-start justify-between gap-3">
                                        <span className="text-slate-500">Fecha actuacion</span>
                                        <span className="font-bold text-slate-800 text-right">{fechaVisible}</span>
                                      </div>
                                      <div className="flex items-start justify-between gap-3">
                                        <span className="text-slate-500">Responsable</span>
                                        <span className="font-bold text-slate-800 text-right">{act.responsable}</span>
                                      </div>
                                      {fechaRegistro && (
                                        <div className="flex items-start justify-between gap-3 border-t border-slate-200 pt-2.5">
                                          <span className="text-slate-500">Registrada en sistema</span>
                                          <span className="font-bold text-slate-800 text-right">{fechaRegistro}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        </div>
                      </div>
                    );
                  };

                  return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5" style={{ color: '#2962FF' }} />Historial
                      </span>
                      {!isArchivado && authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_PROCESOS_ACTUACIONES_CREATE) && (
                      <button onClick={() => setMostrarModalNuevaActuacion(true)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold rounded-lg text-white"
                        style={{ background: '#003DA5' }}>
                        <Plus className="w-3 h-3" />Nueva
                      </button>
                      )}
                    </div>

                    {/* Filtro por etapa + toggle agrupado */}
                    <div className="flex items-center gap-1.5 flex-wrap mb-2">
                      <Filter className="w-3 h-3 text-gray-400" />
                      <button onClick={() => setFiltroEtapaAct('TODAS')}
                        className="px-2 py-0.5 text-[10px] font-bold rounded-lg border transition-all"
                        style={{
                          backgroundColor: filtroEtapaAct === 'TODAS' ? '#003DA5' : '#F9FAFB',
                          color: filtroEtapaAct === 'TODAS' ? '#FFFFFF' : '#6B7280',
                          borderColor: filtroEtapaAct === 'TODAS' ? '#003DA5' : '#E5E7EB',
                        }}>
                        Todas ({actuaciones.length})
                      </button>
                      {etapasActOrdenadas.map(etapa => {
                        const epc = etapaColor(etapa);
                        const count = actuaciones.filter(a => a.etapa === etapa).length;
                        const activo = filtroEtapaAct === etapa;
                        return (
                          <button key={etapa} onClick={() => setFiltroEtapaAct(activo ? 'TODAS' : etapa)}
                            className="px-2 py-0.5 text-[10px] font-bold rounded-lg border transition-all inline-flex items-center gap-0.5"
                            style={{
                              backgroundColor: activo ? epc.text : epc.bg,
                              color: activo ? '#FFFFFF' : epc.text,
                              borderColor: activo ? epc.text : `${epc.text}33`,
                            }}>
                            <Zap className="w-2.5 h-2.5" />{etapa} ({count})
                          </button>
                        );
                      })}
                      <button onClick={() => setVistaAgrupadaAct(!vistaAgrupadaAct)}
                        className="ml-auto flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-lg border transition-all"
                        style={{
                          backgroundColor: vistaAgrupadaAct ? '#003DA5' : '#F9FAFB',
                          color: vistaAgrupadaAct ? '#FFFFFF' : '#6B7280',
                          borderColor: vistaAgrupadaAct ? '#003DA5' : '#E5E7EB',
                        }}
                        title={vistaAgrupadaAct ? 'Vista cronológica' : 'Agrupar por etapa'}>
                        {vistaAgrupadaAct ? <Layers className="w-3 h-3" /> : <List className="w-3 h-3" />}
                        <span className="hidden sm:inline">{vistaAgrupadaAct ? 'Agrupado' : 'Agrupar'}</span>
                      </button>
                    </div>

                    {/* Contador */}
                    <p className="text-[10px] font-bold mb-1" style={{ color: '#003DA5' }}>
                      {actuacionesFiltradas.length} de {actuaciones.length} actuaciones
                      {filtroEtapaAct !== 'TODAS' && <span className="text-gray-500 font-semibold ml-1">(filtrado: {filtroEtapaAct})</span>}
                    </p>

                    {actuacionesLoading ? (
                      <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-500">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Cargando actuaciones...
                      </div>
                    ) : actuacionesError ? (
                      <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-xs text-red-700">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          <span className="font-semibold">{actuacionesError}</span>
                        </div>
                      </div>
                    ) : actuacionesFiltradas.length === 0 ? (
                      <div className="flex flex-col items-center py-8 text-gray-400">
                        <Zap className="w-8 h-8 text-gray-300 mb-2" />
                        <p className="text-xs text-gray-500 font-medium">
                          {actuaciones.length === 0 ? 'Aun no hay actuaciones registradas' : 'Sin actuaciones en esta etapa'}
                        </p>
                        <button onClick={() => setFiltroEtapaAct('TODAS')} className="mt-1.5 text-[11px] font-bold underline" style={{ color: '#003DA5' }}>Limpiar filtro</button>
                      </div>
                    ) : vistaAgrupadaAct ? (
                      /* Vista agrupada */
                      <div className="space-y-3">
                        {Object.entries(actuacionesAgrupadas).map(([etapa, acts]) => {
                          const epc = etapaColor(etapa);
                          return (
                            <div key={etapa} className="rounded-xl border overflow-hidden" style={{ borderColor: `${epc.text}33` }}>
                              <div className="flex items-center gap-2 px-3 py-1.5" style={{ backgroundColor: epc.bg }}>
                                <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ backgroundColor: epc.text }}>
                                  <Zap className="w-2.5 h-2.5 text-white" />
                                </div>
                                <p className="text-[11px] font-black flex-1" style={{ color: epc.text }}>{etapa}</p>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: epc.text }}>
                                  {acts.length}
                                </span>
                              </div>
                              <div className="p-2 bg-white">
                                {acts.map((act, idx) => renderActFila(act, idx, acts.length, true))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* Vista cronológica */
                      <>
                        {actuacionesFiltradas.map((act, idx) => renderActFila(act, idx, actuacionesFiltradas.length, false))}
                      </>
                    )}
                  </div>
                  );
                })()}

                {/* ── TAREAS ── */}
                {tabActiva === 'tareas' && (() => {
                  const renderTareaFila = (tarea: TaskItem, ocultarEtapa = false) => {
                    const prioridadMeta = TASK_PRIORITY_META[tarea.prioridad] || TASK_PRIORITY_META.media;
                    const PriorityIcon = prioridadMeta.icon;
                    const dueMeta = getTaskDueMeta(tarea);
                    const expandida = tareaExpandidaId === tarea.id;
                    const actualizando = actualizandoTareaId === tarea.id;
                    const fechaVencimiento = formatFechaActuacion(tarea.vencimiento);
                    const fechaCompletada = tarea.fechaCompletada ? formatFechaActuacion(tarea.fechaCompletada, true) : null;
                    const fechaRegistro = tarea.createdAt ? formatFechaActuacion(tarea.createdAt, true) : null;
                    const epc = etapaColor(tarea.etapa);

                    return (
                      <motion.div
                        key={tarea.id}
                        layout
                        className={`rounded-[22px] border transition-all overflow-hidden ${tarea.completada ? 'bg-slate-50/90 border-slate-200' : 'bg-white border-slate-200 hover:border-blue-200 hover:shadow-sm'}`}
                        style={{ borderRadius: '22px' }}
                      >
                        <div className="flex items-start gap-3 p-3">
                          <button
                            type="button"
                            disabled={actualizando || !authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_PROCESOS_TASKS_EDIT)}
                            onClick={() => handleToggleTarea(tarea)}
                            className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${tarea.completada ? 'border-green-500 bg-green-500' : 'border-slate-300 hover:border-green-400'} disabled:opacity-60`}
                            title={tarea.completada ? 'Marcar como pendiente' : 'Marcar como completada'}
                          >
                            {actualizando ? (
                              <Loader2 className="w-3 h-3 animate-spin text-white" />
                            ) : tarea.completada ? (
                              <CheckCircle className="w-3 h-3 text-white" />
                            ) : null}
                          </button>

                          <button
                            type="button"
                            onClick={() => setTareaExpandidaId(expandida ? null : tarea.id)}
                            className="flex-1 min-w-0 text-left"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className={`text-sm font-semibold ${tarea.completada ? 'line-through text-slate-400' : 'text-slate-900'}`}>{tarea.titulo}</p>
                                <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-500 flex-wrap">
                                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Vence: {fechaVencimiento}</span>
                                  <span
                                    className="px-2 py-0.5 font-bold rounded-full inline-flex items-center gap-1"
                                    style={{ color: prioridadMeta.color, backgroundColor: prioridadMeta.bg, border: `1px solid ${prioridadMeta.border}` }}
                                  >
                                    <PriorityIcon className="w-3 h-3" />
                                    {prioridadMeta.label}
                                  </span>
                                  {dueMeta && (
                                    <span
                                      className="px-2 py-0.5 font-bold rounded-full inline-flex items-center gap-1"
                                      style={{ color: dueMeta.color, backgroundColor: dueMeta.bg, border: `1px solid ${dueMeta.border}` }}
                                    >
                                      <Clock className="w-3 h-3" />
                                      {dueMeta.label}
                                    </span>
                                  )}
                                  {!ocultarEtapa && tarea.etapa && (
                                    <span
                                      className="px-2 py-0.5 text-[10px] font-bold rounded-full inline-flex items-center gap-1"
                                      style={{ backgroundColor: epc.bg, color: epc.text, border: `1px solid ${epc.text}22` }}
                                    >
                                      <Zap className="w-2.5 h-2.5" />
                                      {tarea.etapa}
                                    </span>
                                  )}
                                  {tarea.completada && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-green-700 bg-green-100 border border-green-200">
                                      Completada
                                    </span>
                                  )}
                                </div>
                              </div>
                              {expandida ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                            </div>
                          </button>
                        </div>

                        <AnimatePresence initial={false}>
                          {expandida && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2, ease: 'easeOut' }}
                              className="overflow-hidden"
                            >
                              <div className="px-4 pb-4 pt-1 border-t border-slate-100 bg-gradient-to-b from-white to-slate-50/80">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                  <div className="rounded-[18px] border border-slate-200 bg-white p-3">
                                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Descripcion</p>
                                    <p className="mt-2 text-sm text-slate-700 leading-relaxed">
                                      {tarea.descripcion?.trim() || 'Sin descripcion adicional.'}
                                    </p>
                                  </div>
                                  <div className="rounded-[18px] border border-slate-200 bg-white p-3">
                                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Detalle operativo</p>
                                    <div className="mt-2 space-y-2 text-sm text-slate-700">
                                      <div className="flex items-center justify-between gap-3">
                                        <span className="text-slate-500">Responsable</span>
                                        <span className="font-semibold text-right">{tarea.responsable || 'Sin responsable'}</span>
                                      </div>
                                      <div className="flex items-center justify-between gap-3">
                                        <span className="text-slate-500">Vencimiento</span>
                                        <span className="font-semibold text-right">{fechaVencimiento}</span>
                                      </div>
                                      <div className="flex items-center justify-between gap-3">
                                        <span className="text-slate-500">Estado</span>
                                        <span className={`font-semibold text-right ${tarea.completada ? 'text-green-700' : 'text-amber-700'}`}>
                                          {tarea.completada ? 'Completada' : 'Pendiente'}
                                        </span>
                                      </div>
                                      {fechaCompletada && (
                                        <div className="flex items-center justify-between gap-3">
                                          <span className="text-slate-500">Fecha completada</span>
                                          <span className="font-semibold text-right">{fechaCompletada}</span>
                                        </div>
                                      )}
                                      {fechaRegistro && (
                                        <div className="flex items-center justify-between gap-3">
                                          <span className="text-slate-500">Registro</span>
                                          <span className="font-semibold text-right">{fechaRegistro}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                {tarea.observaciones?.trim() && (
                                  <div className="mt-3 rounded-[18px] border border-blue-100 bg-blue-50/70 p-3">
                                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-blue-700">Observaciones</p>
                                    <p className="mt-1.5 text-sm text-slate-700 leading-relaxed">{tarea.observaciones}</p>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  };

                  return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                        <CheckSquare className="w-3.5 h-3.5" style={{ color: '#2962FF' }} />Tareas
                      </span>
                      {!isArchivado && authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_PROCESOS_TAREAS_CREATE) && (
                      <button onClick={() => setMostrarModalNuevaTarea(true)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold rounded-lg text-white"
                        style={{ background: '#003DA5' }}>
                        <Plus className="w-3 h-3" />Nueva
                      </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap mb-2">
                      <Filter className="w-3 h-3 text-gray-400" />
                      <button onClick={() => setFiltroEtapaTar('TODAS')}
                        className="px-2 py-0.5 text-[10px] font-bold rounded-lg border transition-all"
                        style={{
                          backgroundColor: filtroEtapaTar === 'TODAS' ? '#003DA5' : '#F9FAFB',
                          color: filtroEtapaTar === 'TODAS' ? '#FFFFFF' : '#6B7280',
                          borderColor: filtroEtapaTar === 'TODAS' ? '#003DA5' : '#E5E7EB',
                        }}>
                        Todas ({tareas.length})
                      </button>
                      {etapasTarOrdenadas.map(etapa => {
                        const epc = etapaColor(etapa);
                        const count = tareas.filter(t => t.etapa === etapa).length;
                        const activo = filtroEtapaTar === etapa;
                        return (
                          <button key={etapa} onClick={() => setFiltroEtapaTar(activo ? 'TODAS' : etapa)}
                            className="px-2 py-0.5 text-[10px] font-bold rounded-lg border transition-all inline-flex items-center gap-0.5"
                            style={{
                              backgroundColor: activo ? epc.text : epc.bg,
                              color: activo ? '#FFFFFF' : epc.text,
                              borderColor: activo ? epc.text : `${epc.text}33`,
                            }}>
                            <Zap className="w-2.5 h-2.5" />{etapa} ({count})
                          </button>
                        );
                      })}
                      <button onClick={() => setVistaAgrupadaTar(!vistaAgrupadaTar)}
                        className="ml-auto flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-lg border transition-all"
                        style={{
                          backgroundColor: vistaAgrupadaTar ? '#003DA5' : '#F9FAFB',
                          color: vistaAgrupadaTar ? '#FFFFFF' : '#6B7280',
                          borderColor: vistaAgrupadaTar ? '#003DA5' : '#E5E7EB',
                        }}
                        title={vistaAgrupadaTar ? 'Vista lista' : 'Agrupar por etapa'}>
                        {vistaAgrupadaTar ? <Layers className="w-3 h-3" /> : <List className="w-3 h-3" />}
                        <span className="hidden sm:inline">{vistaAgrupadaTar ? 'Agrupado' : 'Agrupar'}</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {[
                        { label: 'Mostrando', value: tareasFiltradas.length, cl: 'bg-blue-50 border-blue-200 text-blue-700' },
                        { label: 'Completadas', value: tareasFiltradas.filter(t => t.completada).length, cl: 'bg-green-50 border-green-200 text-green-700' },
                        { label: 'Pendientes', value: tareasFiltradas.filter(t => !t.completada).length, cl: 'bg-amber-50 border-amber-200 text-amber-700' },
                      ].map(s => (
                        <span key={s.label} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold ${s.cl}`}>
                          <span className="text-sm font-black">{s.value}</span>{s.label}
                        </span>
                      ))}
                      {filtroEtapaTar !== 'TODAS' && (
                        <span className="text-[10px] font-semibold text-gray-500">(filtrado: {filtroEtapaTar})</span>
                      )}
                    </div>

                    {tareasLoading ? (
                      <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-500">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Cargando tareas...
                      </div>
                    ) : tareasError ? (
                      <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-xs text-red-700">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          <span className="font-semibold">{tareasError}</span>
                        </div>
                      </div>
                    ) : tareasFiltradas.length === 0 ? (
                      <div className="flex flex-col items-center py-8 text-gray-400">
                        <CheckSquare className="w-8 h-8 text-gray-300 mb-2" />
                        <p className="text-xs text-gray-500 font-medium">
                          {tareas.length === 0 ? 'Aun no hay tareas registradas' : 'Sin tareas en esta etapa'}
                        </p>
                        <button onClick={() => setFiltroEtapaTar('TODAS')} className="mt-1.5 text-[11px] font-bold underline" style={{ color: '#003DA5' }}>Limpiar filtro</button>
                      </div>
                    ) : vistaAgrupadaTar ? (
                      <div className="space-y-3">
                        {Object.entries(tareasAgrupadas).map(([etapa, grupoTareas]) => {
                          const epc = etapaColor(etapa);
                          const completadas = grupoTareas.filter(t => t.completada).length;
                          return (
                            <div key={etapa} className="rounded-xl border overflow-hidden" style={{ borderColor: `${epc.text}33` }}>
                              <div className="flex items-center gap-2 px-3 py-1.5" style={{ backgroundColor: epc.bg }}>
                                <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ backgroundColor: epc.text }}>
                                  <Zap className="w-2.5 h-2.5 text-white" />
                                </div>
                                <p className="text-[11px] font-black flex-1" style={{ color: epc.text }}>{etapa}</p>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: epc.text }}>
                                  {grupoTareas.length}
                                </span>
                                <span className="text-[9px] font-semibold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">
                                  Completadas {completadas}/{grupoTareas.length}
                                </span>
                              </div>
                              <div className="p-1.5 space-y-1.5 bg-white">
                                {grupoTareas.map(tarea => renderTareaFila(tarea, true))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {tareasFiltradas.map(tarea => renderTareaFila(tarea, false))}
                      </div>
                    )}
                  </div>
                  );
                })()}

                {/* ── NOTAS ── */}
                {tabActiva === 'notas' && (() => {
                  // Helper render fila nota
                  const renderNotaFila = (nota: NoteItem, ocultarEtapa = false) => {
                    const etapaHumana = normalizarEtapaActuacion(nota.etapa);
                    const epc = etapaColor(etapaHumana);
                    const fechaVisible = formatFechaActuacion(nota.fecha, true);
                    const confirmandoEliminacion = notaPendienteEliminarId === nota.id;
                    return (
                      <motion.div
                        key={nota.id}
                        layout
                        initial={{ opacity: 0, y: 8, scale: 0.985 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.985 }}
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                        className="relative overflow-hidden rounded-[26px] border border-slate-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] shadow-[0_14px_34px_rgba(15,23,42,0.06)]"
                      >
                        <div className="absolute inset-y-0 left-0 w-1.5 rounded-l-[26px]" style={{ background: 'linear-gradient(180deg, #93C5FD 0%, #2563EB 100%)' }} />
                        <div className="px-4 py-3.5 pl-5">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-2xl border border-blue-100 bg-[linear-gradient(180deg,#EFF6FF_0%,#DBEAFE_100%)] flex items-center justify-center shadow-sm flex-shrink-0">
                            <MessageSquare className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0 pt-0.5">
                            <p className="text-[12px] font-semibold text-slate-800 leading-6 break-words">{nota.texto}</p>
                          </div>
                          {!isArchivado && authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_PROCESOS_NOTES_DELETE) && (
                            <button
                              type="button"
                              onClick={() => setNotaPendienteEliminarId((current) => current === nota.id ? null : nota.id)}
                              disabled={eliminandoNotaId === nota.id}
                              className="flex items-center justify-center w-9 h-9 rounded-2xl border border-red-200/80 text-red-500 bg-white hover:bg-red-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 shadow-sm"
                              title="Eliminar nota"
                            >
                              {eliminandoNotaId === nota.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                        <div className="mt-3 flex items-center gap-2 flex-wrap pl-12">
                          <span className="px-2.5 py-1 text-[10px] font-semibold rounded-full inline-flex items-center gap-1 bg-slate-50 text-slate-500 border border-slate-200">
                            <Calendar className="w-3 h-3" />{fechaVisible}
                          </span>
                          {!ocultarEtapa && (
                            <span className="px-2.5 py-1 text-[10px] font-bold rounded-full inline-flex items-center gap-1"
                              style={{ backgroundColor: epc.bg, color: epc.text, border: `1px solid ${epc.text}22` }}>
                              <Zap className="w-3 h-3" />{etapaHumana}
                            </span>
                          )}
                        </div>
                        <AnimatePresence initial={false}>
                          {confirmandoEliminacion && (
                            <motion.div
                              initial={{ opacity: 0, height: 0, y: -4 }}
                              animate={{ opacity: 1, height: 'auto', y: 0 }}
                              exit={{ opacity: 0, height: 0, y: -4 }}
                              transition={{ duration: 0.16, ease: 'easeOut' }}
                              className="overflow-hidden"
                            >
                              <div className="mt-3 rounded-2xl border border-red-200 bg-[linear-gradient(180deg,rgba(254,242,242,0.96),rgba(255,255,255,0.98))] px-3 py-2.5 shadow-[0_10px_24px_rgba(220,38,38,0.08)]">
                                <div className="flex items-start gap-2.5">
                                  <div className="w-7 h-7 rounded-xl bg-red-100 border border-red-200 flex items-center justify-center flex-shrink-0">
                                    <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-black text-red-700">Eliminar nota</p>
                                    <p className="text-[11px] text-slate-600 mt-0.5">Esta accion quitara la nota del historial interno del proceso.</p>
                                  </div>
                                </div>
                                <div className="mt-3 flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setNotaPendienteEliminarId(null)}
                                    disabled={eliminandoNotaId === nota.id}
                                    className="px-3 py-1.5 text-[11px] font-bold rounded-xl border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 transition-all disabled:opacity-50"
                                  >
                                    Cancelar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleEliminarNota(nota)}
                                    disabled={eliminandoNotaId === nota.id}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-xl text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{ background: 'linear-gradient(135deg, #DC2626 0%, #EF4444 100%)' }}
                                  >
                                    {eliminandoNotaId === nota.id ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Trash2 className="w-3.5 h-3.5" />
                                    )}
                                    Eliminar
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                        </div>
                      </motion.div>
                    );
                  };

                  return (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <FileEdit className="w-3.5 h-3.5" style={{ color: '#2962FF' }} />
                        <span className="text-xs font-black text-gray-700 uppercase tracking-wide">Notas Internas</span>
                      </div>
                      {notas.length > 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: '#003DA5' }}>
                          {notas.length}
                        </span>
                      )}
                    </div>

                    {/* Composición de nota (solo si no está archivado) */}
                    {!isArchivado && <motion.div
                      layout
                      className="rounded-[28px] border border-blue-100 bg-[linear-gradient(180deg,rgba(248,250,255,0.98),rgba(255,255,255,0.98))] p-4 md:p-5 shadow-[0_18px_40px_rgba(0,61,165,0.07)]"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-11 h-11 rounded-2xl border border-blue-100 bg-[linear-gradient(180deg,#EFF6FF_0%,#DBEAFE_100%)] flex items-center justify-center shadow-sm flex-shrink-0">
                          <FileEdit className="w-4.5 h-4.5 text-blue-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-black text-slate-800">Nueva nota interna</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Registra un apunte rapido del proceso para dejar trazabilidad.
                          </p>
                        </div>
                      </div>
                      <div className="rounded-[24px] border border-slate-200 bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_8px_24px_rgba(15,23,42,0.05)]">
                        <textarea value={notaTexto} onChange={e => setNotaTexto(e.target.value)} rows={4}
                          placeholder={`Escribe una nota interna para ${proceso.numeroProceso}...`}
                          className="w-full px-4 py-3.5 text-[13px] text-slate-700 bg-transparent border-0 rounded-[24px] focus:outline-none focus:ring-0 resize-none placeholder:text-slate-400" />
                      </div>
                      <div className="flex items-center justify-between mt-3.5 gap-2 flex-wrap">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-[11px] text-slate-500 font-medium">
                          <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                          Visible solo dentro del expediente
                        </div>
                        {authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_PROCESOS_NOTAS_CREATE) && (
                        <button onClick={guardarNota} disabled={!notaTexto.trim() || creandoNota}
                          className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold rounded-full text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.01] shadow-[0_14px_30px_rgba(37,99,235,0.28)]"
                          style={{ background: 'linear-gradient(135deg, #003DA5 0%, #2962FF 100%)' }}>
                          {creandoNota ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                          {creandoNota ? 'Guardando...' : 'Guardar Nota'}
                        </button>
                        )}
                      </div>
                    </motion.div>}

                    {/* Filtro por etapa (solo si hay notas) */}
                    {notas.length > 0 && notasTienenVariasEtapas && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Filter className="w-3 h-3 text-gray-400" />
                        <button onClick={() => setFiltroEtapaNota('TODAS')}
                          className="px-2 py-0.5 text-[10px] font-bold rounded-lg border transition-all"
                          style={{
                            backgroundColor: filtroEtapaNotaNormalizado === 'TODAS' ? '#003DA5' : '#F9FAFB',
                            color: filtroEtapaNotaNormalizado === 'TODAS' ? '#FFFFFF' : '#6B7280',
                            borderColor: filtroEtapaNotaNormalizado === 'TODAS' ? '#003DA5' : '#E5E7EB',
                          }}>
                          Todas ({notas.length})
                        </button>
                        {etapasNotasOrdenadas.map(etapa => {
                          const epc = etapaColor(etapa);
                          const count = notasNormalizadas.filter(n => n.etapa === etapa).length;
                          const activo = filtroEtapaNotaNormalizado === etapa;
                          return (
                            <button key={etapa} onClick={() => setFiltroEtapaNota(activo ? 'TODAS' : etapa)}
                              className="px-2 py-0.5 text-[10px] font-bold rounded-lg border transition-all inline-flex items-center gap-0.5"
                              style={{
                                backgroundColor: activo ? epc.text : epc.bg,
                                color: activo ? '#FFFFFF' : epc.text,
                                borderColor: activo ? epc.text : `${epc.text}33`,
                              }}>
                              <Zap className="w-2.5 h-2.5" />{etapa} ({count})
                            </button>
                          );
                        })}
                        {notas.length > 1 && (
                          <button onClick={() => setVistaAgrupadaNota(!vistaAgrupadaNota)}
                            className="ml-auto flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-lg border transition-all"
                            style={{
                              backgroundColor: vistaAgrupadaNota ? '#003DA5' : '#F9FAFB',
                              color: vistaAgrupadaNota ? '#FFFFFF' : '#6B7280',
                              borderColor: vistaAgrupadaNota ? '#003DA5' : '#E5E7EB',
                            }}
                            title={vistaAgrupadaNota ? 'Vista lista' : 'Agrupar por etapa'}>
                            {vistaAgrupadaNota ? <Layers className="w-3 h-3" /> : <List className="w-3 h-3" />}
                            <span className="hidden sm:inline">{vistaAgrupadaNota ? 'Agrupado' : 'Agrupar'}</span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Listado de notas */}
                    <div
                      className="min-h-[220px] max-h-[340px] overflow-y-auto pr-1"
                      style={{ scrollbarGutter: 'stable' as any }}
                    >
                      {notasLoading ? (
                        <div className="h-[220px] flex flex-col items-center justify-center text-gray-400">
                          <Loader2 className="w-8 h-8 mb-2 text-blue-400 animate-spin" />
                          <p className="text-xs text-gray-500 font-medium">Cargando notas...</p>
                        </div>
                      ) : notasError ? (
                        <div className="h-[220px] flex flex-col items-center justify-center text-gray-400">
                          <AlertCircle className="w-8 h-8 mb-2 text-red-400" />
                          <p className="text-xs text-red-500 font-medium text-center">{notasError}</p>
                        </div>
                      ) : notas.length === 0 ? (
                        <div className="h-[220px] flex flex-col items-center justify-center text-gray-400">
                          <MessageSquare className="w-8 h-8 mb-2 text-gray-300" />
                          <p className="text-xs text-gray-500 font-medium">Sin notas aun</p>
                        </div>
                      ) : notasFiltradas.length === 0 ? (
                        <div className="h-[220px] flex flex-col items-center justify-center text-gray-400">
                          <MessageSquare className="w-7 h-7 text-gray-300 mb-1.5" />
                          <p className="text-xs text-gray-500 font-medium">Sin notas en esta etapa</p>
                          <button onClick={() => setFiltroEtapaNota('TODAS')} className="mt-1.5 text-[11px] font-bold underline" style={{ color: '#003DA5' }}>Limpiar filtro</button>
                        </div>
                      ) : vistaAgrupadaNota && notasTienenVariasEtapas ? (
                        <div className="space-y-3">
                          {Object.entries(notasAgrupadas).map(([etapa, grupoNotas]) => {
                            const epc = etapaColor(etapa);
                            return (
                              <motion.div
                                key={etapa}
                                layout
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                className="rounded-2xl border overflow-hidden shadow-sm"
                                style={{ borderColor: `${epc.text}33` }}
                              >
                                <div className="flex items-center gap-2 px-3 py-1.5" style={{ backgroundColor: epc.bg }}>
                                  <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ backgroundColor: epc.text }}>
                                    <Zap className="w-2.5 h-2.5 text-white" />
                                  </div>
                                  <p className="text-[11px] font-black flex-1" style={{ color: epc.text }}>{etapa}</p>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: epc.text }}>
                                    {grupoNotas.length}
                                  </span>
                                </div>
                                <div className="p-2 space-y-2 bg-white">
                                  <AnimatePresence initial={false}>
                                    {grupoNotas.map(nota => renderNotaFila(nota, true))}
                                  </AnimatePresence>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <AnimatePresence initial={false}>
                            {notasFiltradas.map(nota => renderNotaFila(nota, !notasTienenVariasEtapas))}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>
                  </div>
                  );
                })()}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* ══ FOOTER ══ */}
          <div className="flex items-center justify-between px-5 py-2.5 border-t border-gray-200 bg-gray-50 flex-shrink-0 flex-wrap gap-2">
            <button onClick={handleIntentoCerrar}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 transition-all">
              <X className="w-3.5 h-3.5" />Cerrar
            </button>

            <p className="text-[10px] text-gray-500 font-medium hidden lg:block">
              Expediente{' '}
              <span className="font-black" style={{ color: '#2962FF' }}>{proceso.numeroProceso}</span>
              {' · '}<span style={{ color: '#2962FF' }}>{TODOS_ARCHIVOS.length} docs</span>
              {' · '}<span style={{ color: '#7C3AED' }}>{actuaciones.length} actuaciones</span>
              {' · '}<span style={{ color: '#D97706' }}>{tareas.length} tareas</span>
            </p>

            <div className="flex items-center gap-1.5">
              {[
                { label: 'Notificar', icon: <Bell    className="w-3.5 h-3.5" />, fn: () => toast.info('Notificar',           { description: proceso.numeroProceso }) },
                { label: 'Compartir', icon: <Share2  className="w-3.5 h-3.5" />, fn: () => toast.info('Compartir')           },
                { label: 'PDF',       icon: <Printer className="w-3.5 h-3.5" />, fn: () => toast.success('Generando PDF...') },
              ].map(({ label, icon, fn }) => (
                <button key={label} onClick={fn}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-gray-300 text-gray-600 hover:bg-white hover:border-gray-400 transition-all">
                  {icon}<span className="hidden sm:inline">{label}</span>
                </button>
              ))}
              <button onClick={exportarExpedienteCompleto}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border transition-all"
                style={{ borderColor: '#059669', color: '#065F46', background: '#ECFDF5' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#D1FAE5'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#ECFDF5'; }}
                title="Exportar expediente completo (Archivos + Actuaciones + Tareas + Notas)">
                <FileDown className="w-3.5 h-3.5" /><span className="hidden sm:inline">Exportar Todo</span>
              </button>
              <button onClick={onExpediente}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg text-white transition-all hover:opacity-90"
                style={{ background: '#003DA5' }}>
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Abrir en Pestaña</span>
              </button>
            </div>
          </div>
          <AnimatePresence>
            {previewArchivo && (
              <PreviewDocumento
                archivo={previewArchivo}
                procesoId={proceso.id}
                onClose={() => setPreviewArchivo(null)}
              />
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Input oculto para recargar archivo de auto */}
      <input
        ref={inputRecargarRef}
        type="file"
        accept=".doc,.docx"
        className="hidden"
        onChange={handleArchivoReemplazado}
      />

      {/* Modal de alerta al cerrar durante carga activa */}
      <AnimatePresence>
        {mostrarAlertaCierre && (
          <ModalAlertaCierreUpload
            cantidadCargas={cargasEnCursoCount}
            onCancelarYCerrar={handleCancelarYCerrar}
            onContinuar={() => setMostrarAlertaCierre(false)}
          />
        )}
      </AnimatePresence>

      {/* ═══ Sub-modal: Confirmar envío a Revisión y Aprobación (z-[600]) ═══ */}
      <AnimatePresence>
        {autoEnviarRevision && (
          <ModalConfirmarEnvioRevision
              key={`confirmar-envio-revision-${autoEnviarRevision.id}`}
              archivo={autoEnviarRevision}
              proceso={{
              numeroProceso: proceso.numeroProceso,
              etapaActual: proceso.etapaActual,
              profesionalAsignado: typeof proceso.profesionalAsignado === 'object' && proceso.profesionalAsignado
                ? { nombre: (proceso.profesionalAsignado as any)?.nombre || '' }
                : typeof proceso.profesionalAsignado === 'string'
                  ? { nombre: proceso.profesionalAsignado }
                  : undefined
            }}
            observaciones={observacionesEnvio}
            onObservacionesChange={setObservacionesEnvio}
            onConfirmar={() => {
              confirmarEnvioRevision();
              // Cerrar el modal principal después de confirmar
              onClose();
            }}
            onCancelar={() => {
              setAutoEnviarRevision(null);
              setObservacionesEnvio('');
              // Cerrar el modal principal cuando se cancela
              onClose();
            }}
          />
        )}
      </AnimatePresence>

      {/* ═══ Modal: Revisión y Aprobación (conectado a ModalRevisionAuto, z-[250]) ═══ */}
      <AnimatePresence>
        {autoEnRevisionModal && (
          <ModalRevisionAuto
            borrador={autoEnRevisionModal}
            onClose={() => setAutoEnRevisionModal(null)}
            onAprobar={(comentarios) => handleAutoAprobado(autoEnRevisionModal.id, comentarios)}
            onDevolver={(motivo, comentarios, _archivos) => handleAutoDevuelto(autoEnRevisionModal.id, motivo, comentarios)}
            mostrarBotonDevolver={true}
            tituloModal="Revisión y Aprobación de Auto"
            descripcionModal="Revisar documento antes de aprobar o devolver al profesional"
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {mostrarModalNuevaActuacion && (
          <ModalNuevaActuacion
            open={mostrarModalNuevaActuacion}
            etapas={Array.from(new Set([...ORDEN_ETAPAS, proceso.etapaActual, ...etapasActOrdenadas, 'Sin etapa']))}
            etapaActual={proceso.etapaActual}
            responsableInicial={getNombre(proceso.profesionalAsignado)}
            saving={creandoActuacion}
            onClose={() => setMostrarModalNuevaActuacion(false)}
            onSubmit={handleCrearActuacion}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {mostrarModalNuevaTarea && (
          <ModalNuevaTarea
            open={mostrarModalNuevaTarea}
            etapas={Array.from(new Set([...ORDEN_ETAPAS, proceso.etapaActual, ...etapasTarOrdenadas, 'Sin etapa']))}
            etapaActual={proceso.etapaActual}
            profesionales={profesionales}
            loadingProfesionales={loadingProfesionales}
            responsableInicial={getNombre(proceso.profesionalAsignado)}
            saving={creandoTarea}
            onClose={() => setMostrarModalNuevaTarea(false)}
            onSubmit={handleCrearTarea}
            onEnsureProfesionales={ensureProfesionales}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {mostrarModalReasignar && (
          <ModalReasignarProfesional
            proceso={proceso}
            onClose={() => setMostrarModalReasignar(false)}
            onSolicitarReasignacion={handleReasignacionInmediata}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {/* Modal confirmación envío a jurídica */}
        {mostrarModalEnvioJuridica && (() => {
          const autoPliego = archivosBackend.find(a =>
            a.nombre?.includes('AUTO_FORMULACION_PLIEGO') ||
            a.nombre?.includes('PLIEGO_CARGOS') ||
            a.nombre?.toLowerCase().includes('pliego')
          );
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100000]"
              onClick={(e) => e.target === e.currentTarget && setMostrarModalEnvioJuridica(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-xl shadow-xl w-full max-w-md"
              >
                <div className="flex items-center gap-3 p-4 border-b border-gray-200">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#DBEAFE' }}>
                    <Scale style={{ width: 20, height: 20, color: '#2563EB' }} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Envío a Oficina Jurídica</h3>
                    <p className="text-xs text-gray-500">Confirmar envío del auto a jurídica</p>
                  </div>
                </div>
                <div className="p-4 space-y-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText style={{ width: 14, height: 14, color: '#2563EB' }} />
                      <span className="text-sm font-bold text-gray-900">Auto Pliego de Cargos</span>
                    </div>
                    <p className="text-xs text-gray-600">Proceso: {proceso.numeroProceso}</p>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle style={{ width: 16, height: 16, color: '#D97706', marginTop: 1, flexShrink: 0 }} />
                      <div className="text-sm text-amber-800">
                        <p className="font-medium mb-1">Esta acción cerrará permanentemente el proceso</p>
                        <p className="text-xs leading-relaxed">Al enviar a la Oficina Jurídica, el proceso disciplinario será archivado y ya no podrá ser modificado.</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setMostrarModalEnvioJuridica(false)}
                      disabled={enviandoJuridica}
                      className="flex-1 px-4 py-2 text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      disabled={enviandoJuridica}
                      onClick={async () => {
                        if (!autoPliego?.id) {
                          toast.error('Error: No se pudo identificar el auto');
                          return;
                        }
                        try {
                          setEnviandoJuridica(true);
                           const currentUser = authService.getCurrentUser();
                           const userId = currentUser?.id || '';
                           await disciplinaryService.sendJuridica(
                               autoPliego.id, 
                               userId, 
                               currentUser?.email, 
                               currentUser?.fullName || currentUser?.firstName
                           );
                          toast.success('Auto enviado a jurídica exitosamente', {
                            description: `El proceso ${proceso.numeroProceso} ha sido cerrado y archivado`,
                            duration: 5000,
                          });
                          setMostrarModalEnvioJuridica(false);
                          onClose();
                        } catch (error: any) {
                          toast.error('Error al enviar a jurídica', {
                            description: error?.message || 'No se pudo conectar con el servidor.',
                          });
                        } finally {
                          setEnviandoJuridica(false);
                        }
                      }}
                      className="flex-1 px-4 py-2 text-sm font-bold text-white rounded-lg transition-colors"
                      style={{ background: enviandoJuridica ? '#93C5FD' : '#2563EB' }}
                    >
                      {enviandoJuridica ? 'Enviando...' : 'Confirmar Envío'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}

        {mostrarModalPliego && (
          <ModalPliegoCargos
            proceso={{
              id: proceso.id,
              radicadoProceso: proceso.numeroProceso,
              etapaActual: proceso.etapaActual,
              estado: proceso.estadoActual || 'ACTIVO',
              news: proceso as any,
              abogadoAsignado: typeof proceso.profesionalAsignado === 'object'
                ? { nombreCompleto: (proceso.profesionalAsignado as any)?.nombre }
                : { nombreCompleto: proceso.profesionalAsignado as string },
            }}
            onClose={() => setMostrarModalPliego(false)}
            onSuccess={() => {
              setMostrarModalPliego(false);
              toast.success('Auto Pliego de Cargos creado. Envíalo a revisión del Jefe.');
              onClose();
            }}
          />
        )}
      </AnimatePresence>
    </>,
    document.body
  );
}


