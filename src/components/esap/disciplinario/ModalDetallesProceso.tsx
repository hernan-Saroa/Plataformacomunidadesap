/**
 * MODAL DETALLES PROCESO — WORLD CLASS ESAP SIGL v5.1
 * Diseño canónico: pestañas General | Archivos | Actuaciones | Tareas | Notas
 * Usa createPortal para que el backdrop cubra toda la pantalla (bypass motion stacking context)
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Scale, FileText, FolderOpen, Zap, CheckSquare, FileEdit,
  Archive, Mail, FileCheck, History, Download, Upload, Search,
  Bell, Share2, ExternalLink, AlertTriangle, User, Briefcase,
  Calendar, Clock, ChevronRight, Plus,
  CheckCircle, AlertCircle, ClipboardList, MessageSquare, Printer,
  Eye, Image, FileArchive, ZoomIn,
  MapPin, Building2, Phone, Paperclip, Gavel, FileWarning, Users,
  Loader2, XCircle, HardDrive, Shield,
  Send, RotateCcw, RefreshCw,
  Layers, BarChart3, Filter, FileDown, List,
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { ModalRevisionAuto, type BorradorPendiente } from './ModalRevisionAuto';
import { disciplinaryService } from '../../../services/api/disciplinary.service';

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface Persona {
  nombre: string;
  tipoIdentificacion: string;
  numeroIdentificacion: string;
}

interface Apoderado {
  nombre: string;
  cedula: string;
  correo: string;
  celular: string;
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
  // ═══ Campos heredados de la Noticia disciplinaria ═══
  territorial?: string;
  fechaHechos?: string;
  conductaSeleccionada?: string;
  conductaPersonalizada?: string;
  denunciados?: DenunciadoCompleto[];
  denunciantes?: DenuncianteCompleto[];
  hechosSeparados?: { id: string; descripcion: string; fecha?: string }[];
  archivosAdjuntos?: { nombre: string; tipo: string; tamano: number; fechaSubida: string }[];
  origenNoticia?: string;
  fechaRecepcionNoticia?: string;
  prioridadNoticia?: 'alta' | 'media' | 'baja';
  // Campos del mock enriquecido
  origen?: string;
  prioridad?: string;
}

type Tab = 'general' | 'archivos' | 'actuaciones' | 'tareas' | 'notas';
type Extension = 'pdf' | 'jpg' | 'png' | 'zip' | 'docx' | 'xlsx';

interface Archivo {
  id: string;
  nombre: string;
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
  /** Callback para agregar borrador a la lista compartida de Revisión y Aprobación */
  onEnviarARevision?: (borrador: BorradorPendiente) => void;
  /** Callback para navegar al módulo de Revisión y Aprobación */
  onNavigateToRevision?: () => void;
}

// ─── Mock data ───────────────────────────────────────────────────────────────

const MOCK_ACTUACIONES = [
  { id: 'a1', fecha: '2026-02-10', descripcion: 'Apertura de indagación preliminar',        tipo: 'auto',         responsable: 'Dr. Andrés Moreno', etapa: 'Indagación'  },
  { id: 'a2', fecha: '2026-02-05', descripcion: 'Notificación al disciplinado',              tipo: 'notificacion', responsable: 'Dr. Andrés Moreno', etapa: 'Valoración'  },
  { id: 'a3', fecha: '2026-01-28', descripcion: 'Asignación al profesional investigador',   tipo: 'asignacion',   responsable: 'Jefe OCID',         etapa: 'Valoración'  },
  { id: 'a4', fecha: '2026-01-15', descripcion: 'Recepción de la noticia disciplinaria',     tipo: 'recepcion',    responsable: 'Secretaría OCID',  etapa: 'Recepción'   },
];

const MOCK_TAREAS = [
  { id: 't1', titulo: 'Citar al disciplinado a diligencia de versión libre', vencimiento: '2026-03-01', prioridad: 'alta',  completada: false, etapa: 'Indagación'    },
  { id: 't2', titulo: 'Recopilar pruebas documentales',                      vencimiento: '2026-03-10', prioridad: 'media', completada: true,  etapa: 'Valoración'    },
  { id: 't3', titulo: 'Solicitar antecedentes disciplinarios',                vencimiento: '2026-02-28', prioridad: 'alta',  completada: false, etapa: 'Indagación'    },
];

const HISTORIAL_ETAPAS = [
  { id: 'h1', desde: '—',           hacia: 'Recepción',    fecha: '2026-01-10', responsable: 'Secretaría OCID',  motivo: 'Registro de noticia disciplinaria en el sistema'                      },
  { id: 'h2', desde: 'Recepción',   hacia: 'Valoración',   fecha: '2026-01-20', responsable: 'Jefe OCID',        motivo: 'Competencia verificada, se ordena valoración de la noticia'           },
  { id: 'h3', desde: 'Valoración',  hacia: 'Indagación',   fecha: '2026-02-05', responsable: 'Dr. Andrés Moreno', motivo: 'Mérito suficiente para abrir indagación preliminar (Auto ID-2026-042)' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getNombre(p: Persona | string | null | undefined): string {
  if (!p) return 'Sin información';
  return typeof p === 'string' ? p : (p.nombre || 'Sin información');
}
function getId(p: Persona | string | null | undefined): string {
  if (!p || typeof p === 'string') return '';
  return p.numeroIdentificacion ? `${p.tipoIdentificacion}: ${p.numeroIdentificacion}` : '';
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
  'pdf','doc','docx','xls','xlsx','ppt','pptx',
  'jpg','jpeg','png','gif','bmp','tiff','svg',
  'zip','rar','7z','tar','gz',
  'mp4','avi','mov','wmv','mkv',
  'mp3','wav','ogg','txt','csv','json','xml',
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
  if (bytes === 0) return '0 B';
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

function PreviewDocumento({ archivo, onClose }: { archivo: Archivo; onClose: () => void }) {
  const isZip   = archivo.extension === 'zip';
  const isImage = ['jpg', 'png', 'jpeg'].includes(archivo.extension);

  const TIPO_META: Record<string, { color: string; bg: string; label: string }> = {
    auto:      { color: '#7C3AED', bg: '#F5F3FF', label: 'Auto'      },
    evidencia: { color: '#D97706', bg: '#FFFBEB', label: 'Evidencia' },
    oficio:    { color: '#0891B2', bg: '#ECFEFF', label: 'Oficio'    },
    acta:      { color: '#DC2626', bg: '#FEF2F2', label: 'Acta'      },
  };
  const meta = TIPO_META[archivo.tipo];

  return createPortal(
    <motion.div
      key="preview-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[300] flex items-center justify-center p-6"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 10 }}
        transition={{ duration: 0.15 }}
        className="bg-white rounded-2xl shadow-2xl w-full flex flex-col overflow-hidden"
        style={{ maxWidth: 780, maxHeight: '85vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header preview */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0"
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
          <div className="flex items-center gap-2 flex-shrink-0 ml-3">
            {!isZip && (
              <button
                onClick={() => toast.success(`Descargando: ${archivo.nombre}`)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold rounded-lg transition-all"
                style={{ background: 'rgba(255,255,255,0.15)', color: '#FFFFFF' }}
              >
                <Download className="w-3 h-3" />Descargar
              </button>
            )}
            <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* Área de vista previa */}
        <div className="flex-1 overflow-hidden flex items-center justify-center bg-gray-100 min-h-0" style={{ minHeight: 380 }}>
          {isZip ? (
            /* ZIP: sin vista disponible */
            <div className="flex flex-col items-center gap-4 py-12 px-8 text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: '#FEF3C7', border: '2px solid #FCD34D' }}>
                <FileArchive className="w-8 h-8" style={{ color: '#D97706' }} />
              </div>
              <div>
                <p className="text-sm font-black text-gray-800 mb-1">No hay vista previa disponible</p>
                <p className="text-xs text-gray-500 max-w-xs leading-relaxed">
                  Los archivos <span className="font-bold text-gray-700">.ZIP</span> no pueden visualizarse directamente. Descárguelo para acceder a su contenido.
                </p>
              </div>
              <button
                onClick={() => toast.success(`Descargando: ${archivo.nombre}`)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #D97706 0%, #F59E0B 100%)' }}
              >
                <Download className="w-4 h-4" />
                Descargar archivo .ZIP
              </button>
            </div>
          ) : isImage ? (
            /* Imagen */
            <div className="flex flex-col items-center gap-4 py-8 px-6 w-full">
              <div className="relative w-full rounded-xl overflow-hidden border-2 border-gray-200 bg-gray-200 flex items-center justify-center"
                style={{ minHeight: 280 }}>
                {/* Placeholder imagen (sin URL real en mock) */}
                <div className="flex flex-col items-center gap-3 py-12">
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
          ) : (
            /* PDF / DOCX / Otros — visor simulado */
            <div className="w-full h-full flex flex-col" style={{ minHeight: 380 }}>
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
          )}
        </div>

        {/* Footer preview */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[9px] font-bold rounded-full" style={{ backgroundColor: meta.bg, color: meta.color }}>{meta.label}</span>
            <span className="text-[10px] text-gray-500">{archivo.tamaño} · .{archivo.extension.toUpperCase()}</span>
          </div>
          <button onClick={onClose}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 transition-all">
            <X className="w-3 h-3" />Cerrar vista
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
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
  return createPortal(
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[500] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.60)', padding: '4vh 4vw' }}
      onClick={(e) => e.target === e.currentTarget && onCancelar()}>
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 12 }} transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ width: '92vw', maxWidth: 540, minHeight: 320 }}>
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
    </motion.div>,
    document.body
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export function ModalDetallesProceso({
  proceso, onClose, onReabrir,
  onGestionAutos, onGestionEvidencias, onGestionOficios, onGestionActas,
  onHistorial, onExpediente,
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
  const [notas,     setNotas]     = useState<{ id: string; texto: string; fecha: string; etapa: string }[]>([]);
  const [previewArchivo, setPreviewArchivo] = useState<Archivo | null>(null);
  const [cargasActivas, setCargasActivas] = useState<CargaActiva[]>([]);
  const [mostrarAlertaCierre, setMostrarAlertaCierre] = useState(false);
  const [archivosSubidos, setArchivosSubidos] = useState<Archivo[]>([]);
  const [archivosBackend, setArchivosBackend] = useState<Archivo[]>([]);
  const [dragging, setDragging] = useState(false);
  const [autoEnviarRevision, setAutoEnviarRevision] = useState<Archivo | null>(null);
  const [autoRecargar, setAutoRecargar] = useState<Archivo | null>(null);
  const [autoEnRevisionModal, setAutoEnRevisionModal] = useState<BorradorPendiente | null>(null);
  const [observacionesEnvio, setObservacionesEnvio] = useState('');
  const [busquedaGlobal, setBusquedaGlobal] = useState('');
  const inputArchivoRef = useRef<HTMLInputElement>(null);
  const inputRecargarRef = useRef<HTMLInputElement>(null);
  const cargasRef = useRef<CargaActiva[]>([]);
  cargasRef.current = cargasActivas;

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

  // ═══ Cargar documentos del expediente desde el backend ═══
  useEffect(() => {
    if (!proceso?.id) return;
    disciplinaryService.getDocumentosExpediente(proceso.id)
      .then(res => {
        const mapped: Archivo[] = (res.documentos || []).map((doc: any) => {
          const ext = (doc.archivoNombre || doc.nombre || '').split('.').pop()?.toLowerCase() || 'pdf';
          const tipoValido = (['auto', 'evidencia', 'oficio', 'acta'] as const).includes(doc.tipo)
            ? doc.tipo as 'auto' | 'evidencia' | 'oficio' | 'acta'
            : 'evidencia';
          const estadoAuto = doc.metadatos?.estado;
          const estado: Archivo['estado'] = estadoAuto === 'FIRMADO' || estadoAuto === 'NOTIFICADO' || estadoAuto === 'APROBADO'
            ? 'aprobado'
            : estadoAuto === 'EN_REVISION' ? 'en_revision'
            : estadoAuto === 'DEVUELTO' ? 'devuelto'
            : estadoAuto === 'BORRADOR' ? 'borrador'
            : 'aprobado';
          return {
            id: doc.id,
            nombre: doc.nombre,
            tipo: tipoValido,
            fecha: doc.fechaCarga ? doc.fechaCarga.split('T')[0] : '',
            firmante: doc.usuarioCarga || 'Sistema',
            estado,
            tamaño: doc.tamaño || '0 KB',
            extension: ext as any,
            version: doc.version || 1,
            etapaProceso: doc.etapa,
          };
        });
        setArchivosBackend(mapped);
      })
      .catch(err => console.error('[ModalDetallesProceso] Error cargando documentos:', err));
  }, [proceso?.id]);

  // ═══ Navegación rápida desde Scorecard ═══
  const navigateToTab = useCallback((tab: Tab, etapa: string) => {
    setTabActiva(tab);
    if (tab === 'archivos')    { setFiltroEtapa(etapa);     setVistaAgrupada(false); }
    if (tab === 'actuaciones') { setFiltroEtapaAct(etapa);  setVistaAgrupadaAct(false); }
    if (tab === 'tareas')      { setFiltroEtapaTar(etapa);  setVistaAgrupadaTar(false); }
    if (tab === 'notas')       { setFiltroEtapaNota(etapa); setVistaAgrupadaNota(false); }
  }, []);

  // ═══ Protección beforeunload ═══
  useEffect(() => {
    const cargasEnCurso = cargasActivas.filter(c => c.estado === 'subiendo' || c.estado === 'procesando' || c.estado === 'validando');
    if (cargasEnCurso.length === 0) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Hay archivos en proceso de carga. Si cierra la ventana, se perderán.';
      return e.returnValue;
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [cargasActivas]);

  // ═══ Cierre protegido ═══
  const cargasEnCursoCount = cargasActivas.filter(c => c.estado === 'subiendo' || c.estado === 'procesando' || c.estado === 'validando').length;

  const handleIntentoCerrar = useCallback(() => {
    if (cargasEnCursoCount > 0) {
      setMostrarAlertaCierre(true);
    } else {
      onClose();
    }
  }, [cargasEnCursoCount, onClose]);

  const handleCancelarYCerrar = useCallback(() => {
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

    // Notificar y comenzar carga
    const grandes = validos.filter(f => f.size > LIMITE_CARGA_DIRECTA);
    if (grandes.length > 0) {
      toast.info(`${grandes.length} archivo(s) > 200 MB`, {
        description: 'Se cargarán en segundo plano. El progreso se mostrará en un toast persistente.',
        duration: 5000,
      });
    }

    validos.forEach(archivo => simularCargaArchivo(archivo));

    // Reset input
    if (inputArchivoRef.current) inputArchivoRef.current.value = '';
  }, [simularCargaArchivo]);

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

  const pct             = Math.min(proceso.porcentajeTiempo, 100);
  const diasTranscurridos = Math.max(0, 90 - proceso.diasRestantes);
  const sc              = SEMAFORO[proceso.semaforo] ?? SEMAFORO.rojo;
  const ec              = etapaColor(proceso.etapaActual);
  const barColor        = proceso.semaforo === 'verde' ? '#10B981' : proceso.semaforo === 'amarillo' ? '#F59E0B' : '#EF4444';

  const TODOS_ARCHIVOS = [...archivosBackend, ...archivosSubidos];

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
  const etapasActuaciones = Array.from(new Set(MOCK_ACTUACIONES.map(a => a.etapa).filter(Boolean)));
  const etapasActOrdenadas = etapasActuaciones.sort((a, b) => {
    const ia = ORDEN_ETAPAS.indexOf(a); const ib = ORDEN_ETAPAS.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
  const actuacionesFiltradas = MOCK_ACTUACIONES.filter(a =>
    (filtroEtapaAct === 'TODAS' || a.etapa === filtroEtapaAct) &&
    (!bgActivo || a.descripcion.toLowerCase().includes(bg) || a.responsable.toLowerCase().includes(bg) || a.tipo.toLowerCase().includes(bg) || a.etapa.toLowerCase().includes(bg))
  );
  const actuacionesAgrupadas = etapasActOrdenadas.reduce<Record<string, typeof MOCK_ACTUACIONES>>((acc, etapa) => {
    const items = actuacionesFiltradas.filter(a => a.etapa === etapa);
    if (items.length > 0) acc[etapa] = items;
    return acc;
  }, {});

  // ═══ Tareas: etapas, filtrado y agrupación ═══
  const etapasTareas = Array.from(new Set(MOCK_TAREAS.map(t => t.etapa).filter(Boolean)));
  const etapasTarOrdenadas = etapasTareas.sort((a, b) => {
    const ia = ORDEN_ETAPAS.indexOf(a); const ib = ORDEN_ETAPAS.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
  const tareasFiltradas = MOCK_TAREAS.filter(t =>
    (filtroEtapaTar === 'TODAS' || t.etapa === filtroEtapaTar) &&
    (!bgActivo || t.titulo.toLowerCase().includes(bg) || t.prioridad.toLowerCase().includes(bg) || t.etapa.toLowerCase().includes(bg))
  );
  const tareasAgrupadas = etapasTarOrdenadas.reduce<Record<string, typeof MOCK_TAREAS>>((acc, etapa) => {
    const items = tareasFiltradas.filter(t => t.etapa === etapa);
    if (items.length > 0) acc[etapa] = items;
    return acc;
  }, {});

  // ═══ Notas: etapas, filtrado y agrupación ═══
  const etapasNotas = Array.from(new Set(notas.map(n => n.etapa).filter(Boolean)));
  const etapasNotasOrdenadas = etapasNotas.sort((a, b) => {
    const ia = ORDEN_ETAPAS.indexOf(a); const ib = ORDEN_ETAPAS.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
  const notasFiltradas = notas.filter(n =>
    (filtroEtapaNota === 'TODAS' || n.etapa === filtroEtapaNota) &&
    (!bgActivo || n.texto.toLowerCase().includes(bg) || n.etapa.toLowerCase().includes(bg))
  );
  const notasAgrupadas = etapasNotasOrdenadas.reduce<Record<string, typeof notas>>((acc, etapa) => {
    const items = notasFiltradas.filter(n => n.etapa === etapa);
    if (items.length > 0) acc[etapa] = items;
    return acc;
  }, {});

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
    MOCK_ACTUACIONES.forEach(a => {
      lines.push([a.fecha, a.descripcion, a.tipo, a.responsable, a.etapa || '-'].join(sep));
    });
    lines.push(`Total Actuaciones: ${MOCK_ACTUACIONES.length}`);
    lines.push('');

    // ── Sección 3: Tareas
    lines.push('═══ TAREAS ═══');
    lines.push(['Título', 'Vencimiento', 'Prioridad', 'Estado', 'Etapa'].join(sep));
    MOCK_TAREAS.forEach(t => {
      lines.push([t.titulo, t.vencimiento, t.prioridad, t.completada ? 'Completada' : 'Pendiente', t.etapa || '-'].join(sep));
    });
    lines.push(`Total Tareas: ${MOCK_TAREAS.length} (${MOCK_TAREAS.filter(t => t.completada).length} completadas)`);
    lines.push('');

    // ── Sección 4: Notas
    lines.push('═══ NOTAS INTERNAS ═══');
    lines.push(['Fecha', 'Etapa', 'Contenido'].join(sep));
    notas.forEach(n => {
      lines.push([n.fecha, n.etapa || '-', `"${n.texto.replace(/"/g, '""')}"`].join(sep));
    });
    lines.push(`Total Notas: ${notas.length}`);
    lines.push('');

    // ── Sección 5: Historial de Etapas
    lines.push('═══ HISTORIAL DE CAMBIOS DE ETAPA ═══');
    lines.push(['Fecha', 'Desde', 'Hacia', 'Responsable', 'Motivo'].join(sep));
    HISTORIAL_ETAPAS.forEach(h => {
      lines.push([h.fecha, h.desde, h.hacia, h.responsable, `"${h.motivo.replace(/"/g, '""')}"`].join(sep));
    });
    lines.push(`Total Transiciones: ${HISTORIAL_ETAPAS.length}`);
    lines.push('');

    // ── Resumen por Etapa
    lines.push('═══ RESUMEN POR ETAPA ═══');
    lines.push(['Etapa', 'Archivos', 'Actuaciones', 'Tareas', 'Notas'].join(sep));
    ORDEN_ETAPAS.forEach(etapa => {
      const nArch = TODOS_ARCHIVOS.filter(a => a.etapaProceso === etapa).length;
      const nAct  = MOCK_ACTUACIONES.filter(a => a.etapa === etapa).length;
      const nTar  = MOCK_TAREAS.filter(t => t.etapa === etapa).length;
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
      description: `${TODOS_ARCHIVOS.length} archivos · ${MOCK_ACTUACIONES.length} actuaciones · ${MOCK_TAREAS.length} tareas · ${notas.length} notas`,
      duration: 5000,
    });
  }, [TODOS_ARCHIVOS, notas, proceso]);

  // Conteos globales para búsqueda
  const bgArchivos = bgActivo ? archivosFiltrados.length : TODOS_ARCHIVOS.length + cargasEnCursoCount;
  const bgActuaciones = bgActivo ? actuacionesFiltradas.length : MOCK_ACTUACIONES.length;
  const bgTareas = bgActivo ? tareasFiltradas.length : MOCK_TAREAS.length;
  const bgNotas = bgActivo ? notasFiltradas.length : notas.length;

  const TABS: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'general',     label: 'General',     icon: <FileText     className="w-3.5 h-3.5" /> },
    { id: 'archivos',    label: 'Archivos',    icon: <FolderOpen   className="w-3.5 h-3.5" />, badge: bgArchivos },
    { id: 'actuaciones', label: 'Actuaciones', icon: <Zap          className="w-3.5 h-3.5" />, badge: bgActuaciones },
    { id: 'tareas',      label: 'Tareas',      icon: <CheckSquare  className="w-3.5 h-3.5" />, badge: bgTareas },
    { id: 'notas',       label: 'Notas',       icon: <FileEdit     className="w-3.5 h-3.5" />, badge: bgNotas || undefined },
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
    auto:         { color: '#7C3AED', label: 'Auto'         },
    notificacion: { color: '#0891B2', label: 'Notificación' },
    asignacion:   { color: '#10B981', label: 'Asignación'   },
    recepcion:    { color: '#F59E0B', label: 'Recepción'    },
  };

  const guardarNota = () => {
    if (!notaTexto.trim()) return;
    setNotas(prev => [{ id: Date.now().toString(), texto: notaTexto, fecha: new Date().toLocaleDateString('es-CO'), etapa: proceso.etapaActual }, ...prev]);
    setNotaTexto('');
    toast.success('Nota guardada');
  };

  // ═══ Enviar Auto a Revisión y Aprobación ═══
  // Estado para rastrear si debemos reopen el modal después de cerrar el de confirmación
  const [debeReabrir, setDebeReabrir] = useState(false);

  const handleEnviarARevision = useCallback((archivo: Archivo) => {
    console.log('[DEBUG] handleEnviarARevision llamado con archivo:', archivo);
    // Primero mostrar el modal de confirmación SIN cerrar el modal principal
    // Esto evita que el componente se desmonte antes de mostrar la confirmación
    setAutoEnviarRevision(archivo);
    setObservacionesEnvio('');
    console.log('[DEBUG] autoEnviarRevision establecido, valor actual:', archivo);
  }, []);

  const confirmarEnvioRevision = useCallback(() => {
    if (!autoEnviarRevision) return;
    const id = autoEnviarRevision.id;
    const ahora = new Date().toISOString();

    // Actualizar estado del archivo a "en_revision"
    const actualizarArchivo = (prev: Archivo[]) =>
      prev.map(a => a.id === id ? { ...a, estado: 'en_revision' as const, fechaEnvioRevision: ahora } : a);

    // Verificar si el archivo está en archivos reales o subidos
    const enReal = archivosReales.find(a => a.id === id);
    if (enReal) {
      enReal.estado = 'en_revision';
      enReal.fechaEnvioRevision = ahora;
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
        numeroProceso: proceso.numeroProceso,
        titulo: autoEnviarRevision.nombre,
        plantilla: `Plantilla ${proceso.etapaActual}`,
        version: autoEnviarRevision.version || 1,
        fechaEnvio: ahora,
        profesional: { nombre: profNombre, email: profEmail },
        observacionesProfesional: observacionesEnvio || 'Documento listo para revisión y aprobación del Jefe de OCID.',
        contenido: `${autoEnviarRevision.nombre.toUpperCase()}\n\nPROCESO No: ${proceso.numeroProceso}\nETAPA: ${proceso.etapaActual}\n\n[Contenido del auto cargado en el sistema]`,
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
  }, [autoEnviarRevision, observacionesEnvio, proceso, onEnviarARevision, onNavigateToRevision]);

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
      contenido: `${archivo.nombre.toUpperCase()}\n\nPROCESO No: ${proceso.numeroProceso}\nETAPA: ${proceso.etapaActual}\n\n[Contenido del auto cargado en el sistema]`,
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

  const handleAutoAprobado = useCallback((archivoId: string, comentarios: string) => {
    // Actualizar estado a aprobado
    const enReal = archivosReales.find(a => a.id === archivoId);
    if (enReal) {
      enReal.estado = 'aprobado';
      enReal.version = (enReal.version || 1) + 1;
    } else {
      setArchivosSubidos(prev => prev.map(a =>
        a.id === archivoId ? { ...a, estado: 'aprobado' as const, version: (a.version || 1) + 1 } : a
      ));
    }
    toast.success('Auto aprobado exitosamente', {
      description: `El auto ha sido aprobado y firmado por el Jefe OCID`,
      duration: 5000,
    });
    setAutoEnRevisionModal(null);
  }, []);

  const handleAutoDevuelto = useCallback((archivoId: string, motivo: string, comentarios: string) => {
    const enReal = archivosReales.find(a => a.id === archivoId);
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
    const id = autoRecargar.id;
    const nuevaVersion = (autoRecargar.version || 1) + 1;

    // Actualizar el archivo existente con nueva versión
    const enReal = archivosReales.find(a => a.id === id);
    if (enReal) {
      enReal.estado = 'borrador';
      enReal.version = nuevaVersion;
      enReal.fecha = new Date().toISOString().split('T')[0];
      enReal.tamaño = formatBytes(nuevoArchivo.size);
      enReal.observacionesDevolucion = undefined;
    } else {
      setArchivosSubidos(prev => prev.map(a =>
        a.id === id ? {
          ...a,
          estado: 'borrador' as const,
          version: nuevaVersion,
          fecha: new Date().toISOString().split('T')[0],
          tamaño: formatBytes(nuevoArchivo.size),
          observacionesDevolucion: undefined,
        } : a
      ));
    }

    toast.success(`Auto reemplazado — Versión ${nuevaVersion}`, {
      description: `${nuevoArchivo.name} (${formatBytes(nuevoArchivo.size)}) · Listo para enviar a revisión`,
      duration: 5000,
    });
    setAutoRecargar(null);
    if (inputRecargarRef.current) inputRecargarRef.current.value = '';
  }, [autoRecargar]);

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
              <p className="text-xs font-semibold text-gray-900 truncate">{archivo.nombre}</p>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 flex-shrink-0">.{archivo.extension.toUpperCase()}</span>
              {archivo.version && archivo.version > 1 && (
                <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-indigo-100 text-indigo-600 flex-shrink-0">v{archivo.version}</span>
              )}
            </div>
            <p className="text-[10px] text-gray-500 mt-0.5">{archivo.firmante} · {archivo.fecha} · {archivo.tamaño}</p>
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
            {estaEnRevision && (
              <button onClick={() => handleAbrirRevision(archivo)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all text-white"
                style={{ background: '#003DA5' }}
                onMouseEnter={e => e.currentTarget.style.background = '#002870'}
                onMouseLeave={e => e.currentTarget.style.background = '#003DA5'}
                title="Ver estado de revisión y aprobación">
                <Shield className="w-3 h-3" /><span className="hidden sm:inline">Revisión</span>
              </button>
            )}
            {puedeEnviarRevision && (
              <button onClick={() => handleEnviarARevision(archivo)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all text-white"
                style={{ background: '#003DA5' }}
                onMouseEnter={e => e.currentTarget.style.background = '#002870'}
                onMouseLeave={e => e.currentTarget.style.background = '#003DA5'}
                title="Enviar a Revisión y Aprobación del Jefe OCID">
                <Send className="w-3 h-3" /><span className="hidden sm:inline">Enviar a Revisión</span>
              </button>
            )}
            {puedeRecargar && (
              <button onClick={() => handleRecargarArchivo(archivo)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-bold transition-all"
                style={{ borderColor: '#D97706', color: '#92400E', background: '#FFFBEB' }}
                onMouseEnter={e => e.currentTarget.style.background = '#FEF3C7'}
                onMouseLeave={e => e.currentTarget.style.background = '#FFFBEB'}
                title="Recargar archivo corregido">
                <RefreshCw className="w-3 h-3" /><span className="hidden sm:inline">Recargar</span>
              </button>
            )}
            <button onClick={() => setPreviewArchivo(archivo)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-bold transition-all"
              style={{ borderColor: '#2962FF', color: '#003DA5', background: '#EFF6FF' }}
              onMouseEnter={e => e.currentTarget.style.background = '#DBEAFE'}
              onMouseLeave={e => e.currentTarget.style.background = '#EFF6FF'}
              title={isZip ? 'No hay vista disponible para .ZIP' : 'Ver documento'}>
              <Eye className="w-3 h-3" /><span className="hidden sm:inline">Ver</span>
            </button>
            <button onClick={() => toast.success(`Descargando: ${archivo.nombre}.${archivo.extension}`)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-bold transition-all border-gray-300 text-gray-600 bg-white hover:bg-gray-50"
              title="Descargar archivo">
              <Download className="w-3 h-3" /><span className="hidden sm:inline">Descargar</span>
            </button>
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
        className="fixed inset-0 z-[200] flex items-center justify-center"
        style={{ backgroundColor: 'rgba(0,0,0,0.60)', padding: '4vh 4vw' }}
        onClick={(e) => e.target === e.currentTarget && handleIntentoCerrar()}
      >
        <motion.div
          className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
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

          {/* ══ BARRA PROGRESO ══ */}
          <div className="px-5 py-2.5 border-b border-gray-100 flex-shrink-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-gray-600">Progreso del Proceso</span>
              <span className="text-[11px] font-black" style={{ color: proceso.porcentajeTiempo > 100 ? '#EF4444' : '#2962FF' }}>
                {proceso.porcentajeTiempo}%
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
              <motion.div className="h-full rounded-full" style={{ backgroundColor: barColor }}
                initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }} />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-gray-400">{diasTranscurridos} días transcurridos</span>
              <span className="text-[10px] font-semibold"
                style={{ color: proceso.diasRestantes < 0 ? '#EF4444' : '#6B7280' }}>
                {proceso.diasRestantes < 0
                  ? `${Math.abs(proceso.diasRestantes)}d vencido`
                  : `${proceso.diasRestantes}d restantes`}
              </span>
            </div>
          </div>

          {/* ══ PESTAÑAS ══ */}
          <div className="flex items-center gap-0.5 px-4 pt-2 border-b border-gray-200 flex-shrink-0 overflow-x-auto">
            {TABS.map(tab => {
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
                  const cantDenunciados = proceso.denunciados?.length || (proceso.denunciado ? 1 : 0);
                  const cantDenunciantes = proceso.denunciantes?.length || (proceso.denunciante ? 1 : 0);
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
                            { label: 'FECHA RECEPCIÓN', value: fechaRecNoticia ? new Date(fechaRecNoticia).toLocaleDateString('es-CO') : '—' },
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
                    {proceso.conductaSeleccionada && (
                      <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Gavel className="w-3.5 h-3.5 text-red-600" />
                          <span className="text-[9px] font-bold text-red-600 uppercase tracking-widest">Presunta Conducta Disciplinaria</span>
                        </div>
                        <p className="text-xs font-bold text-gray-900">{proceso.conductaSeleccionada}</p>
                        {proceso.conductaPersonalizada && (
                          <p className="text-[11px] text-gray-600 mt-1 italic">{proceso.conductaPersonalizada}</p>
                        )}
                      </div>
                    )}

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
                        <p className="text-sm font-bold text-gray-900">{getNombre(proceso.denunciado)}</p>
                        {getId(proceso.denunciado) && (
                          <p className="text-xs text-gray-500 mt-0.5">{getId(proceso.denunciado)}</p>
                        )}
                        {cargo && <p className="text-xs text-gray-600 mt-1">{cargo}</p>}
                        {proceso.denunciados && proceso.denunciados.length > 1 && (
                          <div className="mt-2 pt-2 border-t border-orange-200 space-y-1">
                            {proceso.denunciados.slice(1).map((d, i) => (
                              <div key={d.id || i} className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ backgroundColor: '#EA580C' }}>{i + 2}</div>
                                <div>
                                  <p className="text-xs font-semibold text-gray-800">{d.nombre}</p>
                                  {d.cargo && <p className="text-[10px] text-gray-500">{d.cargo}</p>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
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
                        <p className="text-sm font-bold text-gray-900">{getNombre(proceso.denunciante)}</p>
                        {getId(proceso.denunciante) && (
                          <p className="text-xs text-gray-500 mt-0.5">{getId(proceso.denunciante)}</p>
                        )}
                        {proceso.denunciantes && proceso.denunciantes.length > 1 && (
                          <div className="mt-2 pt-2 border-t border-gray-200 space-y-1">
                            {proceso.denunciantes.slice(1).map((d, i) => (
                              <div key={d.id || i} className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ backgroundColor: '#003DA5' }}>{i + 2}</div>
                                <div>
                                  <p className="text-xs font-semibold text-gray-800">{d.nombre}</p>
                                  {d.tipo && <span className="text-[9px] text-blue-600 font-medium">{d.tipo}</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Profesional Asignado */}
                      <div className="rounded-xl border border-gray-200 bg-white p-3">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Briefcase className="w-3.5 h-3.5" style={{ color: '#2962FF' }} />
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Profesional Asignado</span>
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
                          {proceso.ultimaActuacion || <span className="text-gray-400 italic">Sin registros</span>}
                        </p>
                      </div>
                    </div>

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
                            <div key={h.id || idx} className="flex items-start gap-2">
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

                    {/* Archivos Adjuntos de la Noticia */}
                    {cantAdjuntos > 0 && (
                      <div className="rounded-xl border border-gray-200 p-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Paperclip className="w-3.5 h-3.5 text-gray-500" />
                          <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                            Adjuntos de la Noticia ({cantAdjuntos})
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {proceso.archivosAdjuntos!.map((archivo, idx) => {
                            const esImagen = archivo.tipo.includes('image');
                            const esPdf = archivo.tipo.includes('pdf');
                            return (
                              <div key={idx} className="flex items-center gap-2.5 p-2 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                                  style={{ backgroundColor: esPdf ? '#FEE2E2' : esImagen ? '#EDE9FE' : '#F3F4F6' }}>
                                  <FileText className="w-3.5 h-3.5" style={{ color: esPdf ? '#DC2626' : esImagen ? '#7C3AED' : '#6B7280' }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-gray-900 truncate">{archivo.nombre}</p>
                                  <p className="text-[10px] text-gray-400">
                                    {archivo.tamano < 1024 * 1024 ? `${(archivo.tamano / 1024).toFixed(0)} KB` : `${(archivo.tamano / (1024 * 1024)).toFixed(1)} MB`}
                                    {' · '}{new Date(archivo.fechaSubida).toLocaleDateString('es-CO')}
                                  </p>
                                </div>
                                <button className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors" onClick={() => toast.success(`Descargando: ${archivo.nombre}`)}>
                                  <Download className="w-3.5 h-3.5 text-gray-400" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

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
                            const nAct = MOCK_ACTUACIONES.filter(a => a.etapa === etapa).length;
                            const nTar = MOCK_TAREAS.filter(t => t.etapa === etapa).length;
                            const nTarDone = MOCK_TAREAS.filter(t => t.etapa === etapa && t.completada).length;
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
                            <div className="px-2 py-1.5 text-center font-black text-gray-900">{MOCK_ACTUACIONES.length}</div>
                            <div className="px-2 py-1.5 text-center font-black text-gray-900">{MOCK_TAREAS.length}</div>
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
                          {HISTORIAL_ETAPAS.length} transiciones
                        </span>
                      </div>
                      <div className="p-3 bg-white">
                        <div className="relative">
                          {/* Línea vertical de timeline */}
                          <div className="absolute left-[9px] top-2 bottom-2 w-px bg-gradient-to-b from-purple-300 via-blue-300 to-green-300" />
                          <div className="space-y-3">
                            {HISTORIAL_ETAPAS.map((h, idx) => {
                              const epcHacia = etapaColor(h.hacia);
                              const epcDesde = h.desde !== '—' ? etapaColor(h.desde) : null;
                              const isLast = idx === HISTORIAL_ETAPAS.length - 1;
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
                                        <Calendar className="w-2.5 h-2.5" />{new Date(h.fecha).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })}
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
                    {/* Acceso rápido — chips inline */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {TIPO_ARCHIVO.map(({ tipo, label, icon: Icon, color, bg, border, onClick }) => {
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
                      <button onClick={() => inputArchivoRef.current?.click()}
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
                      </button>
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

                    {/* Zona Drag & Drop */}
                    <div
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
                          <Zap className="w-2.5 h-2.5" />Se marcará como: {proceso.etapaActual}
                        </span>
                      </div>
                    </div>

                    {/* Cargas activas */}
                    {cargasActivas.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                          <Loader2 className="w-3 h-3 animate-spin" style={{ color: '#003DA5' }} />
                          <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#003DA5' }}>
                            Cargas en progreso ({cargasActivas.filter(c => c.estado === 'subiendo' || c.estado === 'procesando' || c.estado === 'validando').length})
                          </span>
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
                    )}

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
                  // Helper render fila actuación
                  const renderActFila = (act: typeof MOCK_ACTUACIONES[0], idx: number, total: number, ocultarEtapa = false) => {
                    const at = TIPO_ACT[act.tipo] || { color: '#6B7280', label: act.tipo };
                    return (
                      <div key={act.id} className="flex gap-2.5">
                        <div className="flex flex-col items-center flex-shrink-0">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: at.color }}>{idx + 1}</div>
                          {idx < total - 1 && <div className="w-px flex-1 bg-gray-200 my-1" />}
                        </div>
                        <div className="flex-1 pb-3">
                          <div className="bg-white border border-gray-100 rounded-xl p-2.5 hover:border-blue-200 transition-colors">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <p className="text-xs font-semibold text-gray-900 leading-tight">{act.descripcion}</p>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                {!ocultarEtapa && act.etapa && (() => {
                                  const epc = etapaColor(act.etapa);
                                  return (
                                    <span className="px-1.5 py-0.5 text-[8px] font-bold rounded inline-flex items-center gap-0.5"
                                      style={{ backgroundColor: epc.bg, color: epc.text, border: `1px solid ${epc.text}22` }}>
                                      <Zap className="w-2.5 h-2.5" />{act.etapa}
                                    </span>
                                  );
                                })()}
                                <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full text-white" style={{ backgroundColor: at.color }}>{at.label}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 text-[10px] text-gray-500">
                              <span className="flex items-center gap-1"><Calendar className="w-2.5 h-2.5" />{act.fecha}</span>
                              <span className="flex items-center gap-1"><User className="w-2.5 h-2.5" />{act.responsable}</span>
                            </div>
                          </div>
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
                      <button onClick={() => toast.info('Nueva actuación')}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold rounded-lg text-white"
                        style={{ background: '#003DA5' }}>
                        <Plus className="w-3 h-3" />Nueva
                      </button>
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
                        Todas ({MOCK_ACTUACIONES.length})
                      </button>
                      {etapasActOrdenadas.map(etapa => {
                        const epc = etapaColor(etapa);
                        const count = MOCK_ACTUACIONES.filter(a => a.etapa === etapa).length;
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
                      {actuacionesFiltradas.length} de {MOCK_ACTUACIONES.length} actuaciones
                      {filtroEtapaAct !== 'TODAS' && <span className="text-gray-500 font-semibold ml-1">(filtrado: {filtroEtapaAct})</span>}
                    </p>

                    {actuacionesFiltradas.length === 0 ? (
                      <div className="flex flex-col items-center py-8 text-gray-400">
                        <Zap className="w-8 h-8 text-gray-300 mb-2" />
                        <p className="text-xs text-gray-500 font-medium">Sin actuaciones en esta etapa</p>
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
                  // Helper render fila tarea
                  const renderTareaFila = (tarea: typeof MOCK_TAREAS[0], ocultarEtapa = false) => {
                    const pcolor = tarea.prioridad === 'alta' ? '#EF4444' : '#F59E0B';
                    return (
                      <div key={tarea.id}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all ${tarea.completada ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-gray-200 hover:border-blue-200'}`}>
                        <button
                          className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${tarea.completada ? 'border-green-500 bg-green-500' : 'border-gray-300 hover:border-green-400'}`}
                          onClick={() => toast.success(tarea.completada ? 'Marcada pendiente' : 'Completada')}>
                          {tarea.completada && <CheckCircle className="w-2.5 h-2.5 text-white" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-semibold ${tarea.completada ? 'line-through text-gray-400' : 'text-gray-900'}`}>{tarea.titulo}</p>
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-500 flex-wrap">
                            <span className="flex items-center gap-0.5"><Calendar className="w-2.5 h-2.5" />Vence: {tarea.vencimiento}</span>
                            <span className="px-1.5 py-0.5 font-bold rounded-full text-white" style={{ backgroundColor: pcolor }}>{tarea.prioridad.toUpperCase()}</span>
                            {!ocultarEtapa && tarea.etapa && (() => {
                              const epc = etapaColor(tarea.etapa);
                              return (
                                <span className="px-1.5 py-0.5 text-[8px] font-bold rounded inline-flex items-center gap-0.5"
                                  style={{ backgroundColor: epc.bg, color: epc.text, border: `1px solid ${epc.text}22` }}>
                                  <Zap className="w-2.5 h-2.5" />{tarea.etapa}
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    );
                  };

                  return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                        <CheckSquare className="w-3.5 h-3.5" style={{ color: '#2962FF' }} />Tareas
                      </span>
                      <button onClick={() => toast.info('Nueva tarea')}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold rounded-lg text-white"
                        style={{ background: '#003DA5' }}>
                        <Plus className="w-3 h-3" />Nueva
                      </button>
                    </div>

                    {/* Filtro por etapa + toggle agrupado */}
                    <div className="flex items-center gap-1.5 flex-wrap mb-2">
                      <Filter className="w-3 h-3 text-gray-400" />
                      <button onClick={() => setFiltroEtapaTar('TODAS')}
                        className="px-2 py-0.5 text-[10px] font-bold rounded-lg border transition-all"
                        style={{
                          backgroundColor: filtroEtapaTar === 'TODAS' ? '#003DA5' : '#F9FAFB',
                          color: filtroEtapaTar === 'TODAS' ? '#FFFFFF' : '#6B7280',
                          borderColor: filtroEtapaTar === 'TODAS' ? '#003DA5' : '#E5E7EB',
                        }}>
                        Todas ({MOCK_TAREAS.length})
                      </button>
                      {etapasTarOrdenadas.map(etapa => {
                        const epc = etapaColor(etapa);
                        const count = MOCK_TAREAS.filter(t => t.etapa === etapa).length;
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

                    {/* Stats badges (basados en datos filtrados) */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {[
                        { label: 'Mostrando',   value: tareasFiltradas.length,                                cl: 'bg-blue-50 border-blue-200 text-blue-700'   },
                        { label: 'Completadas', value: tareasFiltradas.filter(t => t.completada).length,      cl: 'bg-green-50 border-green-200 text-green-700' },
                        { label: 'Pendientes',  value: tareasFiltradas.filter(t => !t.completada).length,     cl: 'bg-amber-50 border-amber-200 text-amber-700' },
                      ].map(s => (
                        <span key={s.label} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold ${s.cl}`}>
                          <span className="text-sm font-black">{s.value}</span>{s.label}
                        </span>
                      ))}
                      {filtroEtapaTar !== 'TODAS' && (
                        <span className="text-[10px] font-semibold text-gray-500">(filtrado: {filtroEtapaTar})</span>
                      )}
                    </div>

                    {tareasFiltradas.length === 0 ? (
                      <div className="flex flex-col items-center py-8 text-gray-400">
                        <CheckSquare className="w-8 h-8 text-gray-300 mb-2" />
                        <p className="text-xs text-gray-500 font-medium">Sin tareas en esta etapa</p>
                        <button onClick={() => setFiltroEtapaTar('TODAS')} className="mt-1.5 text-[11px] font-bold underline" style={{ color: '#003DA5' }}>Limpiar filtro</button>
                      </div>
                    ) : vistaAgrupadaTar ? (
                      /* Vista agrupada */
                      <div className="space-y-3">
                        {Object.entries(tareasAgrupadas).map(([etapa, tareas]) => {
                          const epc = etapaColor(etapa);
                          const completadas = tareas.filter(t => t.completada).length;
                          return (
                            <div key={etapa} className="rounded-xl border overflow-hidden" style={{ borderColor: `${epc.text}33` }}>
                              <div className="flex items-center gap-2 px-3 py-1.5" style={{ backgroundColor: epc.bg }}>
                                <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ backgroundColor: epc.text }}>
                                  <Zap className="w-2.5 h-2.5 text-white" />
                                </div>
                                <p className="text-[11px] font-black flex-1" style={{ color: epc.text }}>{etapa}</p>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: epc.text }}>
                                  {tareas.length}
                                </span>
                                <span className="text-[9px] font-semibold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">
                                  ✓ {completadas}/{tareas.length}
                                </span>
                              </div>
                              <div className="p-1.5 space-y-1.5 bg-white">
                                {tareas.map(tarea => renderTareaFila(tarea, true))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* Vista lista plana */
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
                  const renderNotaFila = (nota: typeof notas[0], ocultarEtapa = false) => {
                    const epc = etapaColor(nota.etapa);
                    return (
                      <div key={nota.id} className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl">
                        <p className="text-xs text-gray-800 leading-relaxed">{nota.texto}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <p className="text-[10px] text-gray-400 flex items-center gap-0.5">
                            <Calendar className="w-2.5 h-2.5" />{nota.fecha}
                          </p>
                          {!ocultarEtapa && (
                            <span className="px-1.5 py-0.5 text-[8px] font-bold rounded inline-flex items-center gap-0.5"
                              style={{ backgroundColor: epc.bg, color: epc.text, border: `1px solid ${epc.text}22` }}>
                              <Zap className="w-2.5 h-2.5" />{nota.etapa}
                            </span>
                          )}
                        </div>
                      </div>
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

                    {/* Composición de nota */}
                    <div className="border border-dashed border-blue-200 rounded-xl p-3 bg-blue-50/30">
                      <textarea value={notaTexto} onChange={e => setNotaTexto(e.target.value)} rows={3}
                        placeholder={`Nota interna para ${proceso.numeroProceso}...`}
                        className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 resize-none" />
                      <div className="flex items-center justify-between mt-2">
                        <span className="px-2 py-0.5 text-[9px] font-bold rounded inline-flex items-center gap-1"
                          style={{ backgroundColor: etapaColor(proceso.etapaActual).bg, color: etapaColor(proceso.etapaActual).text, border: `1px solid ${etapaColor(proceso.etapaActual).text}22` }}>
                          <Zap className="w-2.5 h-2.5" />Se marcará: {proceso.etapaActual}
                        </span>
                        <button onClick={guardarNota} disabled={!notaTexto.trim()}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg text-white disabled:opacity-40"
                          style={{ background: '#003DA5' }}>
                          <Plus className="w-3 h-3" />Guardar Nota
                        </button>
                      </div>
                    </div>

                    {/* Filtro por etapa (solo si hay notas) */}
                    {notas.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Filter className="w-3 h-3 text-gray-400" />
                        <button onClick={() => setFiltroEtapaNota('TODAS')}
                          className="px-2 py-0.5 text-[10px] font-bold rounded-lg border transition-all"
                          style={{
                            backgroundColor: filtroEtapaNota === 'TODAS' ? '#003DA5' : '#F9FAFB',
                            color: filtroEtapaNota === 'TODAS' ? '#FFFFFF' : '#6B7280',
                            borderColor: filtroEtapaNota === 'TODAS' ? '#003DA5' : '#E5E7EB',
                          }}>
                          Todas ({notas.length})
                        </button>
                        {etapasNotasOrdenadas.map(etapa => {
                          const epc = etapaColor(etapa);
                          const count = notas.filter(n => n.etapa === etapa).length;
                          const activo = filtroEtapaNota === etapa;
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
                    {notas.length === 0 ? (
                      <div className="flex flex-col items-center py-8 text-gray-400">
                        <MessageSquare className="w-8 h-8 mb-2 text-gray-300" />
                        <p className="text-xs text-gray-500 font-medium">Sin notas aún</p>
                      </div>
                    ) : notasFiltradas.length === 0 ? (
                      <div className="flex flex-col items-center py-6 text-gray-400">
                        <MessageSquare className="w-7 h-7 text-gray-300 mb-1.5" />
                        <p className="text-xs text-gray-500 font-medium">Sin notas en esta etapa</p>
                        <button onClick={() => setFiltroEtapaNota('TODAS')} className="mt-1.5 text-[11px] font-bold underline" style={{ color: '#003DA5' }}>Limpiar filtro</button>
                      </div>
                    ) : vistaAgrupadaNota ? (
                      /* Vista agrupada */
                      <div className="space-y-3">
                        {Object.entries(notasAgrupadas).map(([etapa, grupoNotas]) => {
                          const epc = etapaColor(etapa);
                          return (
                            <div key={etapa} className="rounded-xl border overflow-hidden" style={{ borderColor: `${epc.text}33` }}>
                              <div className="flex items-center gap-2 px-3 py-1.5" style={{ backgroundColor: epc.bg }}>
                                <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ backgroundColor: epc.text }}>
                                  <Zap className="w-2.5 h-2.5 text-white" />
                                </div>
                                <p className="text-[11px] font-black flex-1" style={{ color: epc.text }}>{etapa}</p>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: epc.text }}>
                                  {grupoNotas.length}
                                </span>
                              </div>
                              <div className="p-1.5 space-y-1.5 bg-white">
                                {grupoNotas.map(nota => renderNotaFila(nota, true))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* Vista lista plana */
                      <div className="space-y-2">
                        {notasFiltradas.map(nota => renderNotaFila(nota, false))}
                      </div>
                    )}
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
              {' · '}<span style={{ color: '#7C3AED' }}>{MOCK_ACTUACIONES.length} actuaciones</span>
              {' · '}<span style={{ color: '#D97706' }}>{MOCK_TAREAS.length} tareas</span>
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
        </motion.div>
      </div>

      {/* Vista previa de documento (portal anidado, z-[300]) */}
      <AnimatePresence>
        {previewArchivo && (
          <PreviewDocumento
            archivo={previewArchivo}
            onClose={() => setPreviewArchivo(null)}
          />
        )}
      </AnimatePresence>

      {/* Input oculto para recargar archivo de auto */}
      <input
        ref={inputRecargarRef}
        type="file"
        accept=".pdf,.doc,.docx"
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
          createPortal(
            <ModalConfirmarEnvioRevision
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
            />,
            document.body
          )
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
    </>,
    document.body
  );
}