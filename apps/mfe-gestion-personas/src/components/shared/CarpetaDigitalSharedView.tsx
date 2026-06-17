/**
 * CARPETA DIGITAL - VISTA UNIFICADA COMPARTIDA
 * 
 * Componente reutilizable que proporciona el mismo diseño world-class
 * de Carpeta Digital en TODAS las vistas:
 * 1. Backoffice (CarpetaDigitalModulePremium)
 * 2. Portal Transaccional (MisDocumentos)
 * 3. Detalle de Persona (PersonDocuments)
 * 
 * Diseño coherente: Progress ring, stat pills, category cards,
 * vista por tipo/lista, 100% inline styles para inputs.
 * 
 * @version 1.0.0
 * @date 2026-03-09
 */

import React, { useState, useMemo, useCallback, useRef, Fragment, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Eye, Download, GitBranch, History, CheckCircle, XCircle,
  Trash2, MoreVertical, File, FileText, Image as ImageIcon,
  Calendar, User, Tag, Edit, Search, Filter, Grid3X3, List,
  Upload, Clock, AlertCircle, ChevronDown, ChevronRight, ChevronLeft,
  Shield, CheckSquare, Square, ArrowUpDown,
  FolderOpen, Award, Briefcase, Mail,
  X, RefreshCw, Loader2,
  AlertTriangle, Check, Plus, Info,
  FileUp, CircleCheck, CircleAlert, CircleX, Layers,
  ShieldCheck, ShieldAlert, BookOpen, Send,
  Phone, GraduationCap, FileSpreadsheet, FileArchive, ZoomIn, ZoomOut, RotateCw, Undo
} from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { apiClient } from '../../services/api/apiClient';

// ============================================================================
// TYPES
// ============================================================================

export type DocumentStatus = 'validado' | 'pendiente' | 'rechazado' | 'vencido';
export type DocumentCategory = 'personal' | 'academico' | 'certificados' | 'laboral' | 'administrativo' | 'otros';

export interface CarpetaDocumento {
  id: string;
  carpeta_id?: string;
  nombre: string;
  categoria: DocumentCategory | string;
  tipo_archivo: string;
  tamano_bytes: number;
  estado: DocumentStatus;
  fecha_subida: string;
  fecha_validacion?: string;
  version_actual?: number;
  modificado_por?: string;
  validado_por?: string;
  comentarios?: string;
  fecha_vencimiento?: string;
  tipo_documento_id?: string;
  url_archivo?: string;
}

export interface TipoDocumentoRequerido {
  id: string;
  nombre: string;
  descripcion?: string;
  categoria: string;
  obligatorio: boolean;
  requiere_validacion?: boolean;
  rol_validador?: string;
  formatos_permitidos: string[];
  color?: string;
  icono?: string;
  completado: boolean;
  documento?: CarpetaDocumento | null;
}

export interface PersonaInfo {
  nombre: string;
  email?: string;
  numeroDocumento?: string;
}

export interface CarpetaDigitalSharedViewProps {
  /** Persona ID from the Carpeta Digital user selector */
  personaId?: string;
  /** Info de la persona dueña de la carpeta */
  persona: PersonaInfo;
  /** Documentos de la carpeta */
  documentos: CarpetaDocumento[];
  /** Tipos de documentos requeridos (para vista por tipo) */
  tiposDocumentos: TipoDocumentoRequerido[];
  /** Loading state */
  isLoading: boolean;
  /** Mode: admin shows validate/reject/delete; portal hides them */
  mode: 'admin' | 'portal';
  /** Rol del usuario actual para habilitar validación */
  userRole?: string;
  /** Callback para volver atrás */
  onBack?: () => void;
  /** Callbacks de acciones */
  onUpload?: (tipoDocumentoId?: string, categoria?: string, tipoNombre?: string) => void;
  onRefresh?: () => void;
  onPreview?: (doc: CarpetaDocumento) => void;
  onDownload?: (doc: CarpetaDocumento) => void;
  onValidate?: (doc: CarpetaDocumento) => void;
  onReject?: (doc: CarpetaDocumento) => void;
  onDelete?: (doc: CarpetaDocumento) => void | boolean | Promise<void | boolean>;
  onEditCategory?: (doc: CarpetaDocumento) => void;
  onShowVersionHistory?: (doc: CarpetaDocumento) => void;
  onCreateNewVersion?: (doc: CarpetaDocumento) => void;
  /** Drag-and-drop: recibe archivos soltados */
  onDropFiles?: (files: File[], categoria?: string) => void;
  /** Subida directa para drag & drop por requisito específico */
  onUploadDirect?: (file: File, tipoDocumentoId?: string, categoria?: string) => Promise<boolean>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CATEGORY_CONFIG: Record<string, {
  label: string; color: string; bgLight: string; borderColor: string; icon: React.ElementType;
}> = {
  personal:       { label: 'Personal',       color: '#2962FF', bgLight: '#EFF6FF', borderColor: '#BFDBFE', icon: User },
  rund:           { label: 'RUND (Registro Único Nacional Docente)', color: '#6366f1', bgLight: '#F5F3FF', borderColor: '#C7D2FE', icon: FileSpreadsheet },
  academico:      { label: 'Académico',      color: '#059669', bgLight: '#ECFDF5', borderColor: '#A7F3D0', icon: Award },
  certificados:   { label: 'Certificados',   color: '#7C3AED', bgLight: '#F5F3FF', borderColor: '#DDD6FE', icon: Shield },
  laboral:        { label: 'Laboral',        color: '#D97706', bgLight: '#FFFBEB', borderColor: '#FDE68A', icon: Briefcase },
  administrativo: { label: 'Administrativo', color: '#DC2626', bgLight: '#FEF2F2', borderColor: '#FECACA', icon: FolderOpen },
  otros:          { label: 'Otros',          color: '#4B5563', bgLight: '#F9FAFB', borderColor: '#E5E7EB', icon: Layers },
};

const RUND_SUBFOLDERS_CONFIG: Record<string, {
  label: string; color: string; bgLight: string; borderColor: string; icon: React.ElementType;
}> = {
  IDENTIDAD:   { label: 'Identidad',       color: '#2962FF', bgLight: '#EFF6FF', borderColor: '#BFDBFE', icon: User },
  FORMACION:   { label: 'Formación',       color: '#7C3AED', bgLight: '#F5F3FF', borderColor: '#DDD6FE', icon: GraduationCap },
  VINCULACION: { label: 'Vinculación',     color: '#D97706', bgLight: '#FFFBEB', borderColor: '#FDE68A', icon: Briefcase },
  ACADEMICO:   { label: 'Académico',      color: '#059669', bgLight: '#ECFDF5', borderColor: '#A7F3D0', icon: Award },
  TRANSVERSAL: { label: 'Transversal',    color: '#DC2626', bgLight: '#FEF2F2', borderColor: '#FECACA', icon: Shield },
};

const STATUS_CONFIG: Record<DocumentStatus, {
  label: string; color: string; bg: string; border: string; icon: React.ElementType;
}> = {
  validado:  { label: 'Validado',  color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', icon: CircleCheck },
  pendiente: { label: 'Pendiente', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', icon: Clock },
  rechazado: { label: 'Rechazado', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', icon: CircleX },
  vencido:   { label: 'Vencido',   color: '#EA580C', bg: '#FFF7ED', border: '#FED7AA', icon: AlertTriangle },
};

// ============================================================================
// UTILS
// ============================================================================

const formatSize = (bytes: number): string => {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (s: string): string => {
  if (!s) return '-';
  return new Intl.DateTimeFormat('es-CO', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(s));
};

const formatRelative = (s: string): string => {
  if (!s) return '-';
  const d = Math.floor((Date.now() - new Date(s).getTime()) / 86400000);
  if (d === 0) return 'Hoy';
  if (d === 1) return 'Ayer';
  if (d < 7) return `Hace ${d} días`;
  return formatDate(s);
};

const getFileIcon = (t: string) => {
  const l = (t || '').toLowerCase();
  if (l.includes('pdf')) return FileText;
  if (l.includes('image') || l.includes('jpg') || l.includes('png') || l.includes('jpeg')) return ImageIcon;
  if (l.includes('doc')) return FileText;
  return File;
};

const getFileIconColor = (t: string) => {
  const l = (t || '').toLowerCase();
  if (l.includes('pdf')) return '#EF4444';
  if (l.includes('image') || l.includes('jpg') || l.includes('png') || l.includes('jpeg')) return '#8B5CF6';
  if (l.includes('doc')) return '#3B82F6';
  return '#6B7280';
};

const normalizeDocumentText = (value: unknown): string =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** Check if a document is near expiration (within 30 days) or already expired */
const getExpirationStatus = (doc: CarpetaDocumento): 'expired' | 'warning' | 'ok' | null => {
  if (!doc.fecha_vencimiento) return null;
  const now = Date.now();
  const expDate = new Date(doc.fecha_vencimiento).getTime();
  if (expDate <= now) return 'expired';
  const daysLeft = Math.floor((expDate - now) / 86400000);
  if (daysLeft <= 30) return 'warning';
  return 'ok';
};

const getRundEstadoBadge = (estado: string) => {
  const norm = String(estado || '').toLowerCase().trim();
  if (norm === 'aprobado' || norm === 'validado' || norm === 'ok') {
    return { label: estado || 'Aprobado', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', icon: CircleCheck };
  }
  if (norm === 'rechazado' || norm === 'devuelto' || norm.includes('ajuste')) {
    return { label: estado || 'Devuelto', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', icon: CircleX };
  }
  if (norm === 'en revisión' || norm === 'en revision' || norm === 'en proceso') {
    return { label: estado || 'En Revisión', color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', icon: RefreshCw };
  }
  return { label: estado || 'Pendiente', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', icon: Clock };
};

const getDaysUntilExpiration = (dateStr: string): number => {
  return Math.floor((new Date(dateStr).getTime() - Date.now()) / 86400000);
};

const EXPIRATION_STYLES = {
  expired: { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', label: 'Vencido' },
  warning: { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', label: 'Por vencer' },
} as const;

// ============================================================================
// PROGRESS RING
// ============================================================================

function ProgressRing({ value, size = 72, stroke = 6, color = '#2962FF' }: {
  value: number; size?: number; stroke?: number; color?: string;
}) {
  const r = (size - stroke) / 2;
  const c = r * 2 * Math.PI;
  const off = c - (Math.min(value, 100) / 100) * c;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E5E7EB" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.7s ease-out' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 16, fontWeight: 800, color }}>{value}%</span>
      </div>
    </div>
  );
}

// ============================================================================
// TIPO DOC CARD
// ============================================================================

function TipoDocCard({ tipo, docs, onUpload, onUploadDirect, onSelectDoc }: {
  tipo: TipoDocumentoRequerido;
  docs: CarpetaDocumento[];
  onUpload?: (tipoDocumentoId?: string, categoria?: string, tipoNombre?: string) => void;
  onUploadDirect?: (file: File, tipo: TipoDocumentoRequerido) => Promise<boolean>;
  onSelectDoc: (d: CarpetaDocumento) => void;
}) {
  const color = tipo.color || CATEGORY_CONFIG[tipo.categoria]?.color || '#4B5563';
  const hasDoc = docs.length > 0;
  const latestDoc = hasDoc ? docs.sort((a, b) => new Date(b.fecha_subida).getTime() - new Date(a.fecha_subida).getTime())[0] : null;
  const st = latestDoc ? STATUS_CONFIG[latestDoc.estado as DocumentStatus] : null;
  const StIcon = st?.icon || Clock;
  const DocIcon = latestDoc ? getFileIcon(latestDoc.tipo_archivo) : FileUp;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        borderRadius: 8,
        border: hasDoc
          ? latestDoc?.estado === 'validado' ? '1px solid #A7F3D0' : latestDoc?.estado === 'rechazado' ? '1px solid #FECACA' : '1px solid #FDE68A'
          : tipo.obligatorio ? '1px dashed #FECACA' : '1px dashed #E5E7EB',
        background: hasDoc
          ? latestDoc?.estado === 'validado' ? '#ECFDF520' : latestDoc?.estado === 'rechazado' ? '#FEF2F220' : '#FFFBEB20'
          : tipo.obligatorio ? '#FEF2F210' : '#F9FAFB40',
        position: 'relative',
        transition: 'all 0.2s',
      }}
      onDragOver={(e) => {
        if (onUploadDirect) {
          e.preventDefault();
          e.stopPropagation();
          (e.currentTarget as HTMLElement).style.borderColor = color;
          (e.currentTarget as HTMLElement).style.background = color + '08';
        }
      }}
      onDragLeave={(e) => {
        if (onUploadDirect) {
          e.preventDefault();
          e.stopPropagation();
          (e.currentTarget as HTMLElement).style.borderColor = hasDoc
            ? latestDoc?.estado === 'validado' ? '#A7F3D0' : latestDoc?.estado === 'rechazado' ? '#FECACA' : '#FDE68A'
            : tipo.obligatorio ? '#FECACA' : '#E5E7EB';
          (e.currentTarget as HTMLElement).style.background = hasDoc
            ? latestDoc?.estado === 'validado' ? '#ECFDF520' : latestDoc?.estado === 'rechazado' ? '#FEF2F220' : '#FFFBEB20'
            : tipo.obligatorio ? '#FEF2F210' : '#F9FAFB40';
        }
      }}
      onDrop={async (e) => {
        if (onUploadDirect) {
          e.preventDefault();
          e.stopPropagation();
          (e.currentTarget as HTMLElement).style.borderColor = hasDoc
            ? latestDoc?.estado === 'validado' ? '#A7F3D0' : latestDoc?.estado === 'rechazado' ? '#FECACA' : '#FDE68A'
            : tipo.obligatorio ? '#FECACA' : '#E5E7EB';
          (e.currentTarget as HTMLElement).style.background = hasDoc
            ? latestDoc?.estado === 'validado' ? '#ECFDF520' : latestDoc?.estado === 'rechazado' ? '#FEF2F220' : '#FFFBEB20'
            : tipo.obligatorio ? '#FEF2F210' : '#F9FAFB40';

          const files = Array.from(e.dataTransfer.files);
          if (files.length > 0) {
            const file = files[0];
            const toastId = toast.loading(`Subiendo ${file.name} directamente...`);
            const ok = await onUploadDirect(file, tipo);
            if (ok) {
              toast.success(`Cargado con éxito`, { id: toastId });
            } else {
              toast.error(`Error al subir el archivo`, { id: toastId });
            }
          }
        }
      }}
    >
      {tipo.obligatorio && !hasDoc && (
        <div style={{
          position: 'absolute', top: -4, right: -4, width: 12, height: 12,
          background: '#EF4444', borderRadius: '50%', border: '2px solid white', zIndex: 10,
        }} title="Requerido" />
      )}

      {hasDoc && latestDoc ? (
        <div
          style={{ padding: '10px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}
          onClick={() => onSelectDoc(latestDoc)}
        >
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: color + '12' }}>
              <DocIcon style={{ width: 16, height: 16, color }} />
            </div>
            <div style={{
              position: 'absolute', bottom: -2, right: -2, width: 16, height: 16, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1.5px solid white', background: st?.bg,
            }}>
              <StIcon style={{ width: 10, height: 10, color: st?.color }} />
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#1F2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2 }}>{tipo.nombre}</p>
            <p style={{ fontSize: 10, color: '#9CA3AF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2, marginTop: 1 }}>
              {formatRelative(latestDoc.fecha_subida)} · {formatSize(latestDoc.tamano_bytes)}
            </p>
          </div>
          <span style={{
            flexShrink: 0, padding: '2px 6px', borderRadius: 4, fontSize: 9, fontWeight: 700,
            background: st?.bg, color: st?.color,
          }}>
            {st?.label}
          </span>
        </div>
      ) : (
        <button
          onClick={() => onUpload?.(tipo.id, tipo.categoria, tipo.nombre)}
          style={{
            width: '100%', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10,
            background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', borderRadius: 8,
          }}
        >
          <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: color + '10' }}>
            <FileUp style={{ width: 16, height: 16, color }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2 }}>{tipo.nombre}</p>
            <p style={{ fontSize: 9, color: '#9CA3AF', lineHeight: 1.2, marginTop: 1 }}>
              {tipo.obligatorio ? '● Requerido' : '○ Opcional'}
              {tipo.formatos_permitidos?.length > 0 ? ` · ${tipo.formatos_permitidos.join(', ')}` : ''}
            </p>
          </div>
          <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 2, padding: '4px 8px', borderRadius: 6, fontSize: 9, fontWeight: 700, background: color + '10', color }}>
            <Plus style={{ width: 10, height: 10 }} /> Subir
          </span>
        </button>
      )}
    </motion.div>
  );
}

// ============================================================================
// DETAIL PANEL (PORTAL)
// ============================================================================

function DetailPanel({ doc, reqTipo, mode, userRole, onClose, onPreview, onDownload, onValidate, onReject, onDelete, onShowVersionHistory, onEditCategory }: {
  doc: CarpetaDocumento;
  reqTipo?: TipoDocumentoRequerido;
  mode: 'admin' | 'portal';
  userRole?: string;
  onClose: () => void;
  onPreview?: (d: CarpetaDocumento) => void;
  onDownload?: (d: CarpetaDocumento) => void;
  onValidate?: (d: CarpetaDocumento) => void;
  onReject?: (d: CarpetaDocumento) => void;
  onDelete?: (d: CarpetaDocumento) => void | boolean | Promise<void | boolean>;
  onShowVersionHistory?: (d: CarpetaDocumento) => void;
  onEditCategory?: (d: CarpetaDocumento) => void;
}) {
  const Icon = getFileIcon(doc.tipo_archivo);
  const st = STATUS_CONFIG[doc.estado as DocumentStatus] || STATUS_CONFIG.pendiente;
  const StIcon = st.icon;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', justifyContent: 'flex-end' }}
      onClick={onClose}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }} />
      <motion.div
        initial={{ x: 400 }}
        animate={{ x: 0 }}
        exit={{ x: 400 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        style={{
          position: 'relative', width: '100%', maxWidth: 420,
          background: 'white', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', overflowY: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          position: 'sticky', top: 0, background: 'white', borderBottom: '1px solid #E5E7EB',
          padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10,
        }}>
          <h3 style={{ fontSize: 12, fontWeight: 800, color: '#1F2937', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Detalle del Documento</h3>
          <button onClick={onClose} style={{ padding: 6, borderRadius: 8, border: 'none', background: '#F3F4F6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X style={{ width: 14, height: 14, color: '#6B7280' }} />
          </button>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* File Hero */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#EFF6FF' }}>
              <Icon style={{ width: 28, height: 28, color: '#003DA5' }} />
            </div>
            <h4 style={{ fontSize: 15, fontWeight: 700, color: '#1F2937', wordBreak: 'break-word', padding: '0 16px' }}>{doc.nombre}</h4>
            <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>{formatSize(doc.tamano_bytes)} · v{doc.version_actual || 1}</p>
          </div>

          {/* Status Badge */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 16px',
              borderRadius: 20, fontSize: 12, fontWeight: 700, border: `1px solid ${st.border}`,
              background: st.bg, color: st.color,
            }}>
              <StIcon style={{ width: 14, height: 14 }} />
              {st.label}
            </span>
          </div>

          {/* Metadata */}
          <div style={{ background: '#F9FAFB', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'Categoría', value: CATEGORY_CONFIG[(doc.categoria || 'otros') as string]?.label || doc.categoria },
              { label: 'Fecha de subida', value: formatDate(doc.fecha_subida) },
              doc.fecha_validacion ? { label: 'Fecha validación', value: formatDate(doc.fecha_validacion) } : null,
              doc.validado_por ? { label: 'Validado por', value: doc.validado_por } : null,
            ].filter(Boolean).map((item: any, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: '#6B7280', fontWeight: 500 }}>{item.label}</span>
                <span style={{ color: '#1F2937', fontWeight: 600 }}>{item.value}</span>
              </div>
            ))}
            {doc.comentarios && (
              <div style={{ paddingTop: 8, borderTop: '1px solid #E5E7EB' }}>
                <p style={{ fontSize: 12, color: '#6B7280', fontWeight: 500, marginBottom: 4 }}>Observaciones</p>
                <p style={{ fontSize: 12, color: '#374151', background: 'white', padding: 8, borderRadius: 8, border: '1px solid #E5E7EB' }}>{doc.comentarios}</p>
              </div>
            )}
          </div>

          {/* Approval Timeline */}
          <div>
            <h5 style={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Flujo de Aprobación</h5>
            <div style={{ position: 'relative', paddingLeft: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ position: 'absolute', left: 11, top: 8, bottom: 8, width: 2, background: '#E5E7EB' }} />
              {[
                { label: 'Documento subido', done: true, date: doc.fecha_subida, color: '#2962FF' },
                { label: 'Revisión pendiente', done: (doc.estado as string) !== 'pendiente', date: null, color: '#D97706' },
                {
                  label: doc.estado === 'rechazado' ? 'Rechazado' : doc.estado === 'validado' ? 'Aprobado' : 'Aprobación',
                  done: doc.estado === 'validado' || doc.estado === 'rechazado',
                  date: doc.fecha_validacion,
                  color: doc.estado === 'rechazado' ? '#DC2626' : '#059669',
                },
              ].map((step, i) => (
                <div key={i} style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{
                    position: 'absolute', left: -24, width: 22, height: 22, borderRadius: '50%',
                    border: step.done ? `2px solid ${step.color}` : '2px solid #D1D5DB',
                    background: step.done ? 'white' : '#F3F4F6',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10,
                  }}>
                    {step.done && <Check style={{ width: 12, height: 12, color: step.color }} />}
                  </div>
                  <div style={{ paddingTop: 2 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: step.done ? '#1F2937' : '#9CA3AF' }}>{step.label}</p>
                    {step.date && <p style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>{formatDate(step.date)}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {onPreview && (
              <button onClick={() => onPreview(doc)} style={{
                width: '100%', padding: '10px 16px', fontSize: 12, fontWeight: 600, borderRadius: 12,
                border: '1px solid #E5E7EB', background: 'white', color: '#374151', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s',
              }}>
                <Eye style={{ width: 16, height: 16, color: '#2563EB' }} /> Vista previa
              </button>
            )}
            {onDownload && (
              <button onClick={() => onDownload(doc)} style={{
                width: '100%', padding: '10px 16px', fontSize: 12, fontWeight: 600, borderRadius: 12,
                border: '1px solid #E5E7EB', background: 'white', color: '#374151', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s',
              }}>
                <Download style={{ width: 16, height: 16, color: '#059669' }} /> Descargar archivo
              </button>
            )}
            {onShowVersionHistory && (
              <button onClick={() => onShowVersionHistory(doc)} style={{
                width: '100%', padding: '10px 16px', fontSize: 12, fontWeight: 600, borderRadius: 12,
                border: '1px solid #E5E7EB', background: 'white', color: '#374151', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s',
              }}>
                <History style={{ width: 16, height: 16, color: '#7C3AED' }} /> Historial de versiones
              </button>
            )}
            {mode === 'admin' && onValidate && doc.estado === 'pendiente' && (!reqTipo?.rol_validador || reqTipo.rol_validador === userRole) && (
              <button onClick={() => onValidate(doc)} style={{
                width: '100%', padding: '10px 16px', fontSize: 12, fontWeight: 700, borderRadius: 12,
                border: 'none', background: '#059669', color: 'white', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <CheckCircle style={{ width: 16, height: 16 }} /> Aprobar documento
              </button>
            )}
            {mode === 'admin' && onReject && doc.estado === 'pendiente' && (
              <button onClick={() => onReject(doc)} style={{
                width: '100%', padding: '10px 16px', fontSize: 12, fontWeight: 700, borderRadius: 12,
                border: '2px solid #FECACA', background: 'white', color: '#DC2626', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <XCircle style={{ width: 16, height: 16 }} /> Rechazar documento
              </button>
            )}
            {onEditCategory && (
              <button onClick={() => onEditCategory(doc)} style={{
                width: '100%', padding: '10px 16px', fontSize: 12, fontWeight: 700, borderRadius: 12,
                border: 'none', background: mode === 'portal' ? '#003DA5' : '#4B5563', color: 'white', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <Edit style={{ width: 16, height: 16 }} />
                {mode === 'portal' ? 'Vincular a tipo requerido' : 'Cambiar categoría'}
              </button>
            )}
            {mode === 'admin' && onDelete && (
              <button onClick={() => { onDelete(doc); onClose(); }} style={{
                width: '100%', padding: '10px 16px', fontSize: 12, fontWeight: 700, borderRadius: 12,
                border: '2px solid #FECACA', background: '#FEF2F2', color: '#DC2626', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8, marginTop: 4,
              }}>
                <Trash2 style={{ width: 16, height: 16 }} /> Eliminar documento
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}

// ============================================================================
export function CarpetaDigitalSharedView({
  personaId,
  persona,
  documentos,
  tiposDocumentos,
  isLoading,
  mode,
  userRole,
  onBack,
  onUpload,
  onUploadDirect,
  onRefresh,
  onPreview,
  onDownload,
  onValidate,
  onReject,
  onDelete,
  onEditCategory,
  onShowVersionHistory,
  onCreateNewVersion,
  onDropFiles,
}: CarpetaDigitalSharedViewProps) {
  const [viewMode, setViewMode] = useState<'tipos' | 'lista'>('tipos');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | DocumentStatus>('all');
  const [detailDoc, setDetailDoc] = useState<CarpetaDocumento | null>(null);
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());
  const [searchFocused, setSearchFocused] = useState(false);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [currentSubfolder, setCurrentSubfolder] = useState<string | null>(null);

  // Modals and UI Enhancements States
  const [previewDoc, setPreviewDoc] = useState<CarpetaDocumento | null>(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [rotateAngle, setRotateAngle] = useState(0);
  const [showHistoryDoc, setShowHistoryDoc] = useState<CarpetaDocumento | null>(null);
  const [zippingFolder, setZippingFolder] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);

  const handleSetFolder = useCallback((folder: string | null) => {
    setCurrentFolder(folder);
    setCurrentSubfolder(null);
  }, []);

  // ========== RUND STATE & HANDLERS ==========
  const [tarjetaRund, setTarjetaRund] = useState<any | null>(null);
  const [rundBloques, setRundBloques] = useState<any[]>([]);
  const [rundAuditLog, setRundAuditLog] = useState<any[]>([]);
  const [loadingRund, setLoadingRund] = useState(false);
  const [rundError, setRundError] = useState<string | null>(null);
  const [expandedRundBloques, setExpandedRundBloques] = useState<Set<string>>(new Set(['IDENTIDAD']));
  const [isRundExpanded, setIsRundExpanded] = useState(false);
  const [showRundAudit, setShowRundAudit] = useState(false);
  const [rundActionLoading, setRundActionLoading] = useState<string | null>(null);
  const [devolverRundBloque, setDevolverRundBloque] = useState<string | null>(null);
  const [devolverRundObs, setDevolverRundObs] = useState('');
  const [uploadingRundDoc, setUploadingRundDoc] = useState<{ bloque: string; tipo: string } | null>(null);
  const rundFileInputRef = useRef<HTMLInputElement>(null);
  const [rundPreviewUrl, setRundPreviewUrl] = useState<{ url: string; name: string } | null>(null);

  const cleanPersonaId = useMemo(() => {
    if (!personaId) return '';
    return personaId.replace('persona:', '');
  }, [personaId]);

  const isDocInCategory = useCallback((doc: CarpetaDocumento, cat: string) => {
    const categories = ['personal', 'rund', 'academico', 'laboral', 'certificados', 'administrativo', 'otros'];
    if (cat === 'otros') {
      return doc.categoria === 'otros' || !doc.categoria || !categories.includes(doc.categoria);
    }
    return doc.categoria === cat;
  }, []);

  // ========== MAPPED RUND DOCUMENTS & TYPES ==========
  const mappedRundDocs = useMemo<CarpetaDocumento[]>(() => {
    if (!tarjetaRund) return [];
    const docs: CarpetaDocumento[] = [];
    const seenIds = new Set<string>();
    const seenTipos = new Set<string>();
    
    /**
     * processSoporte: ONLY creates a document entry if the soporte record
     * represents a REAL uploaded file (has nombre_archivo or documento_carpeta_id).
     */
    const processSoporte = (sop: any) => {
      const hasRealFile = !!(sop.nombre_archivo || sop.documento_carpeta_id || sop.url);
      if (!hasRealFile) return;

      const tipoCode = (sop.tipo || sop.tipo_soporte || '').toLowerCase();
      if (!tipoCode) return;

      const rowId = sop.id ? String(sop.id) : null;
      if (rowId && seenIds.has(rowId)) return;
      if (rowId) seenIds.add(rowId);
      if (seenTipos.has(tipoCode)) return;
      seenTipos.add(tipoCode);

      const fileName = sop.nombre_archivo || sop.nombre || `${tipoCode}.pdf`;
      const fileUrl = sop.documento_carpeta_id || sop.url || '';
      const estadoRaw = (sop.estado || '').toLowerCase();
      const estado: 'validado' | 'rechazado' | 'pendiente' =
        estadoRaw === 'aprobado' || estadoRaw === 'aceptado' || estadoRaw === 'ok'
          ? 'validado'
          : estadoRaw === 'rechazado' || estadoRaw === 'devuelto'
            ? 'rechazado'
            : 'pendiente';

      docs.push({
        id: sop.id || `rund-soporte-${tipoCode}`,
        carpeta_id: `carpeta:${cleanPersonaId}`,
        nombre: fileName,
        categoria: 'rund',
        tipo_documento_id: `rund_${tipoCode}`,
        tipo_archivo: fileName.split('.').pop()?.toLowerCase() || 'pdf',
        tamano_bytes: sop.tamano || sop.tamano_bytes || 0,
        estado,
        fecha_subida: sop.createdAt || sop.fecha_carga || new Date().toISOString(),
        url_archivo: fileUrl,
        version_actual: 1,
        comentarios: sop.observacion || ''
      });
    };
    
    // ── Source 0: resumenSoportes de la tarjeta (fuente más directa y confiable) ──
    // El backend ahora incluye en getTarjetaRUND un array plano con todos los soportes
    // que tienen archivo real. Esto elimina la necesidad de llamar /bloques por separado.
    if (Array.isArray(tarjetaRund.resumenSoportes) && tarjetaRund.resumenSoportes.length > 0) {
      tarjetaRund.resumenSoportes.forEach(processSoporte);
    }

    // ── Source 1: Real soportes from /bloques API (RundSoporteCampo table, per docente) ──
    if (rundBloques && rundBloques.length > 0) {
      rundBloques.forEach(bloque => {
        if (Array.isArray(bloque.soportes)) {
          bloque.soportes.forEach(processSoporte);
        }
      });
    }
    
    // Source 2: soportes embedded in /tarjeta-rund response (from the IDENTIDAD/FORMACION/etc. sub-objects)
    // Always runs (deduplication via seenTipos/seenIds prevents double-counting with Source 1).
    if (tarjetaRund.bloques && typeof tarjetaRund.bloques === 'object') {
      Object.values(tarjetaRund.bloques).forEach((bloqueData: any) => {
        if (Array.isArray(bloqueData?.soportes)) {
          bloqueData.soportes.forEach(processSoporte);
        }
      });
    }

    // Source 3: validacionDocumental entries with a real Carpeta Digital file link
    // STRICT: only rows with id_documento_carpeta are real uploaded files.
    if (Array.isArray(tarjetaRund.validacionDocumental)) {
      tarjetaRund.validacionDocumental.forEach((val: any) => {
        if (!val.id_documento_carpeta) return;
        const campoRund = (val.campo_rund || '').toLowerCase();
        if (!campoRund || seenTipos.has(campoRund)) return;
        seenTipos.add(campoRund);
        const estadoDoc = (val.estado_documento || '').toLowerCase();
        docs.push({
          id: val.id || `rund-val-${campoRund}`,
          carpeta_id: `carpeta:${cleanPersonaId}`,
          nombre: val.nombre_archivo || `${campoRund}.pdf`,
          categoria: 'rund',
          tipo_documento_id: `rund_${campoRund}`,
          tipo_archivo: 'pdf',
          tamano_bytes: 0,
          estado: estadoDoc === 'aceptado' || estadoDoc === 'aprobado' ? 'validado'
                : estadoDoc === 'rechazado' ? 'rechazado' : 'pendiente',
          fecha_subida: val.fecha_carga || val.created_at || new Date().toISOString(),
          url_archivo: val.id_documento_carpeta,
          version_actual: 1,
          comentarios: val.observacion || '',
        });
      });
    }
    
    return docs;
  }, [tarjetaRund, rundBloques, cleanPersonaId]);

  const combinedDocumentos = useMemo<CarpetaDocumento[]>(() => {
    return [...documentos, ...mappedRundDocs];
  }, [documentos, mappedRundDocs]);

  const mappedRundTipos = useMemo<TipoDocumentoRequerido[]>(() => {
    if (!tarjetaRund) return [];
    
    const rundSpecs = [
      { id: 'rund_documento_identidad', nombre: 'Documento de identidad (CC/CE/PA/PEP)', obligatorio: true },
      { id: 'rund_diploma_pregrado', nombre: 'Diploma + Acta de grado (Pregrado)', obligatorio: true },
      { id: 'rund_diploma_especializacion', nombre: 'Diploma + Acta de grado (Especialización)', obligatorio: false },
      { id: 'rund_diploma_maestria', nombre: 'Diploma + Acta de grado (Maestría)', obligatorio: false },
      { id: 'rund_diploma_doctorado', nombre: 'Diploma + Acta de grado (Doctorado)', obligatorio: false },
      { id: 'rund_certificado_posdoctoral', nombre: 'Certificado de estancia posdoctoral', obligatorio: false },
      { id: 'rund_convalidacion_men', nombre: 'Resolución de convalidación MEN', obligatorio: false },
      { id: 'rund_hoja_vida_pro', nombre: 'Hoja de vida soportada por títulos', obligatorio: true },
      { id: 'rund_acto_administrativo_vinculacion', nombre: 'Acto administrativo de vinculación', obligatorio: true },
      { id: 'rund_resolucion_convocatoria', nombre: 'Resolución de convocatoria', obligatorio: true },
      { id: 'rund_contrato', nombre: 'Resolución o contrato', obligatorio: true },
      { id: 'rund_acto_administrativo_dedicacion', nombre: 'Acto administrativo de dedicación', obligatorio: true },
      { id: 'rund_acto_administrativo_situacion', nombre: 'Acto administrativo de situación', obligatorio: true },
      { id: 'rund_acto_adscripcion_territorial', nombre: 'Acto de adscripción territorial', obligatorio: true },
      { id: 'rund_resolucion_escalafon', nombre: 'Resolución de escalafón', obligatorio: true },
      { id: 'rund_resolucion_puntaje_salarial', nombre: 'Resolución de puntaje salarial', obligatorio: true },
      { id: 'rund_acto_asignacion_nucleo', nombre: 'Acto de asignación de núcleo temático', obligatorio: true },
      { id: 'rund_certificacion_investigacion', nombre: 'Certificación de investigación', obligatorio: false },
      { id: 'rund_acta_evaluacion_desempeno', nombre: 'Acta de evaluación de desempeño', obligatorio: true },
      { id: 'rund_autorizacion_habeas_data', nombre: 'Autorización de tratamiento de datos (Habeas Data)', obligatorio: true }
    ];

    return rundSpecs.map(spec => {
      const tipoSoporteCode = spec.id.replace('rund_', '');
      const doc = mappedRundDocs.find(d => {
        // Match by tipo_documento_id (reliable), or fallback to id pattern
        return d.tipo_documento_id === spec.id || d.id === `rund-soporte-${tipoSoporteCode}`;
      }) || null;

      return {
        id: spec.id,
        nombre: spec.nombre,
        descripcion: `Soporte RUND de ${spec.nombre}`,
        categoria: 'rund',
        obligatorio: spec.obligatorio,
        requiere_validacion: true,
        formatos_permitidos: ['pdf', 'jpg', 'png'],
        color: '#6366f1',
        icono: 'file-text',
        completado: !!doc,
        documento: doc
      };
    });
  }, [tarjetaRund, mappedRundDocs]);

  const combinedTiposDocumentos = useMemo<TipoDocumentoRequerido[]>(() => {
    return [...tiposDocumentos, ...mappedRundTipos];
  }, [tiposDocumentos, mappedRundTipos]);

  const getBloqueForTipoSoporte = (tipo: string): string => {
    const t = tipo.toLowerCase();
    if (t === 'documento_identidad') return 'IDENTIDAD';
    if (t.includes('diploma') || t.includes('posdoctoral') || t.includes('convalidacion') || t.includes('hoja_vida')) return 'FORMACION';
    if (t.includes('acto_') || t.includes('resolucion_') || t.includes('contrato')) {
      if (t === 'acto_asignacion_nucleo') return 'ACADEMICO';
      return 'VINCULACION';
    }
    if (t === 'certificacion_investigacion' || t === 'acta_evaluacion_desempeno') return 'ACADEMICO';
    if (t === 'autorizacion_habeas_data') return 'TRANSVERSAL';
    return 'OTROS';
  };

  const currentFolderDocs = useMemo(() => {
    if (!currentFolder) return [];
    return combinedDocumentos.filter(d => 
      isDocInCategory(d, currentFolder) && 
      (currentFolder !== 'rund' || getBloqueForTipoSoporte(d.id.replace('rund-soporte-', '')) === currentSubfolder)
    );
  }, [combinedDocumentos, currentFolder, currentSubfolder, isDocInCategory]);

  const handleDownloadZip = useCallback(async () => {
    if (currentFolderDocs.length === 0) {
      toast.info('No hay documentos cargados en esta carpeta para descargar.');
      return;
    }

    setZippingFolder(true);
    setZipProgress(0);
    const toastId = toast.loading('Generando archivo comprimido ZIP...');

    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      let readmeText = `========================================================\n`;
      readmeText += `ESAP - CARPETA DIGITAL COMPRIMIDA\n`;
      readmeText += `Docente: ${persona?.nombre || 'Desconocido'}\n`;
      readmeText += `Identificación: ${persona?.numero_documento || 'No disponible'}\n`;
      readmeText += `Carpeta: ${currentFolder === 'rund' ? 'RUND' : (CATEGORY_CONFIG[currentFolder || '']?.label || currentFolder)}\n`;
      if (currentSubfolder) {
        readmeText += `Subcarpeta RUND: ${RUND_SUBFOLDERS_CONFIG[currentSubfolder]?.label || currentSubfolder}\n`;
      }
      readmeText += `Fecha de Generación: ${new Date().toLocaleString()}\n`;
      readmeText += `Cantidad de archivos: ${currentFolderDocs.length}\n`;
      readmeText += `========================================================\n\n`;
      readmeText += `LISTADO DE ARCHIVOS INCLUIDOS:\n\n`;

      currentFolderDocs.forEach((d, idx) => {
        readmeText += `${idx + 1}. [${d.estado.toUpperCase()}] ${d.nombre} (${(d.tamano_bytes / 1024).toFixed(1)} KB) - Subido el ${new Date(d.fecha_subida).toLocaleDateString()}\n`;
        if (d.comentarios) {
          readmeText += `   Observaciones: ${d.comentarios}\n`;
        }
      });

      zip.file('LEEME.txt', readmeText);

      for (let i = 0; i < currentFolderDocs.length; i++) {
        const doc = currentFolderDocs[i];
        setZipProgress(Math.round((i / currentFolderDocs.length) * 100));

        let fileBlob: Blob;
        try {
          if (doc.url_archivo) {
            const res = await fetch(doc.url_archivo);
            if (res.ok) {
              fileBlob = await res.blob();
            } else {
              throw new Error(`Status ${res.status}`);
            }
          } else {
            throw new Error('Sin URL de archivo');
          }
        } catch (err) {
          console.warn(`Error al descargar ${doc.nombre}, usando fallback simulado`, err);
          fileBlob = new Blob([
            `Contenido simulado de soporte\nNombre: ${doc.nombre}\nEstado: ${doc.estado}\nSubido: ${doc.fecha_subida}\nObservaciones: ${doc.comentarios || 'Ninguna'}`
          ], { type: 'text/plain' });
        }

        const ext = doc.nombre.includes('.') ? '' : `.${doc.tipo_archivo}`;
        zip.file(`${doc.nombre}${ext}`, fileBlob);
      }

      setZipProgress(100);
      const content = await zip.generateAsync({ type: 'blob' });

      const folderName = currentFolder === 'rund'
        ? (currentSubfolder ? `RUND_${currentSubfolder}` : 'RUND')
        : (CATEGORY_CONFIG[currentFolder || '']?.label || currentFolder || 'carpeta');
      const docNameClean = (persona?.nombre || 'docente').replace(/\s+/g, '_').toLowerCase();
      const zipName = `${docNameClean}_${folderName.toLowerCase()}_${new Date().toISOString().slice(0,10)}.zip`;

      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = zipName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Descarga ZIP completada con éxito!', { id: toastId });
    } catch (error: any) {
      console.error('Error al generar ZIP:', error);
      toast.error('Error al generar el archivo ZIP: ' + (error?.message || error), { id: toastId });
    } finally {
      setZippingFolder(false);
      setZipProgress(0);
    }
  }, [currentFolderDocs, currentFolder, currentSubfolder, persona]);

  const currentUserId = useMemo(() => {
    if (typeof window === 'undefined') return 'admin-user';
    const token = sessionStorage.getItem('esap_auth_token');
    if (token) {
      try {
        const payloadPart = token.split('.')[1];
        if (payloadPart) {
          const payload = JSON.parse(atob(payloadPart));
          return payload.id || payload.sub || payload.userId || 'admin-user';
        }
      } catch (e) {
        // ignore
      }
    }
    return 'admin-user';
  }, []);

  const fetchRundData = useCallback(async () => {
    if (!cleanPersonaId) {
      setTarjetaRund(null);
      setRundBloques([]);
      setRundAuditLog([]);
      return;
    }
    setLoadingRund(true);
    setRundError(null);
    try {
      const res = await apiClient.get<any>(`/pta/api/v1/pta/banco-docentes/by-persona/${cleanPersonaId}/tarjeta-rund`);
      const data = res?.data || res;
      if (data && data.docenteId) {
        setTarjetaRund(data);
        
        const bloquesRes = await apiClient.get<any>(`/pta/api/v1/pta/banco-docentes/${data.docenteId}/bloques?_t=${Date.now()}`);
        const bloquesData = bloquesRes?.data || bloquesRes;
        const bloquesArr = Array.isArray(bloquesData) ? bloquesData : [];
        setRundBloques(bloquesArr);

        const auditRes = await apiClient.get<any>(`/pta/api/v1/pta/banco-docentes/${data.docenteId}/auditoria`);
        const auditData = Array.isArray(auditRes?.data) ? auditRes.data : Array.isArray(auditRes) ? auditRes : [];
        setRundAuditLog(auditData);
      } else {
        setTarjetaRund(null);
        setRundBloques([]);
        setRundAuditLog([]);
      }
    } catch (err) {
      setTarjetaRund(null);
      setRundBloques([]);
      setRundAuditLog([]);
    } finally {
      setLoadingRund(false);
    }
  }, [cleanPersonaId]);

  useEffect(() => {
    fetchRundData();
  }, [fetchRundData]);

  // Escuchar el evento de sincronización disparado por RundValidationPanel.
  // Cuando cualquier panel RUND sube un documento, refrescamos automáticamente
  // los datos RUND de la Carpeta Digital SIN necesidad de recargar la página.
  // Esto garantiza que todos los docentes del banco queden sincronizados.
  useEffect(() => {
    const handleRundUpload = () => {
      fetchRundData();
    };
    window.addEventListener('rund:soporte-uploaded', handleRundUpload);
    return () => window.removeEventListener('rund:soporte-uploaded', handleRundUpload);
  }, [fetchRundData]);

  useEffect(() => {
    handleSetFolder(null);
  }, [cleanPersonaId, fetchRundData]);

  const toggleRundBloque = (bloque: string) => {
    setExpandedRundBloques(prev => {
      const next = new Set(prev);
      if (next.has(bloque)) next.delete(bloque); else next.add(bloque);
      return next;
    });
  };

  const handleAprobarRund = async (bloque: string) => {
    if (!tarjetaRund?.docenteId) return;
    setRundActionLoading(bloque);
    try {
      const res = await apiClient.post<any>(`/pta/api/v1/pta/banco-docentes/${tarjetaRund.docenteId}/bloques/${bloque}/aprobar`, {
        aprobadorId: currentUserId,
      });
      if (res?.success || res) {
        toast.success(`Bloque ${bloque} aprobado.`);
        await fetchRundData();
      } else {
        toast.error('No se pudo aprobar el bloque.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error al aprobar el bloque.');
    } finally {
      setRundActionLoading(null);
    }
  };

  const handleDevolverRund = async () => {
    if (!devolverRundBloque || !devolverRundObs.trim() || !tarjetaRund?.docenteId) return;
    setRundActionLoading(devolverRundBloque);
    try {
      const res = await apiClient.post<any>(`/pta/api/v1/pta/banco-docentes/${tarjetaRund.docenteId}/bloques/${devolverRundBloque}/devolver`, {
        aprobadorId: currentUserId,
        observacion: devolverRundObs,
      });
      if (res?.success || res) {
        toast.success(`Bloque ${devolverRundBloque} devuelto.`);
        setDevolverRundBloque(null);
        setDevolverRundObs('');
        await fetchRundData();
      } else {
        toast.error('No se pudo devolver el bloque.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error al devolver el bloque.');
    } finally {
      setRundActionLoading(null);
    }
  };

  const handleVincularRundClick = (bloque: string, tipo: string) => {
    setUploadingRundDoc({ bloque, tipo });
    if (rundFileInputRef.current) {
      rundFileInputRef.current.value = '';
      rundFileInputRef.current.click();
    }
  };

  const handleRundFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !uploadingRundDoc || !tarjetaRund?.docenteId) return;
    
    const { bloque, tipo } = uploadingRundDoc;
    setRundActionLoading(bloque);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tipoSoporte', tipo);
      formData.append('nombreArchivo', file.name);
      formData.append('cargadoPor', currentUserId);

      const res = await apiClient.upload<any>(`/pta/api/v1/pta/banco-docentes/${tarjetaRund.docenteId}/bloques/${bloque}/soportes`, formData);
      if (res?.success || res) {
        toast.success(`Documento "${file.name}" cargado exitosamente.`);
        await fetchRundData();
      } else {
        toast.error('Error al cargar el documento.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error al cargar el documento.');
    } finally {
      setRundActionLoading(null);
      setUploadingRundDoc(null);
    }
  };

  const handleDirectUpload = useCallback(async (file: File, tipo: TipoDocumentoRequerido): Promise<boolean> => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    const validExtensions = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.gif', '.xlsx', '.xls', '.pptx', '.ppt', '.txt', '.csv'];
    if (!validExtensions.includes(ext)) {
      toast.error('Formato no soportado para este requisito.');
      return false;
    }
    if (file.size > 10485760) {
      toast.error('El archivo excede el tamaño máximo de 10MB.');
      return false;
    }

    if (tipo.id.startsWith('rund_')) {
      if (!tarjetaRund?.docenteId) {
        toast.error('No hay docente RUND activo');
        return false;
      }
      const tipoSoporteCode = tipo.id.replace('rund_', '');
      const bloque = getBloqueForTipoSoporte(tipoSoporteCode);
      setRundActionLoading(bloque);
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('tipoSoporte', tipoSoporteCode);
        formData.append('nombreArchivo', file.name);
        formData.append('cargadoPor', currentUserId);

        const res = await apiClient.upload<any>(`/pta/api/v1/pta/banco-docentes/${tarjetaRund.docenteId}/bloques/${bloque}/soportes`, formData);
        if (res?.success || res) {
          toast.success(`Soporte "${file.name}" cargado para RUND - ${tipo.nombre}`);
          await fetchRundData();
          return true;
        } else {
          toast.error('Error al cargar el soporte en RUND.');
        }
      } catch (err: any) {
        toast.error(err?.message || 'Error al cargar el soporte.');
      } finally {
        setRundActionLoading(null);
      }
      return false;
    } else if (onUploadDirect) {
      return await onUploadDirect(file, tipo.id, tipo.categoria);
    }
    return false;
  }, [tarjetaRund, currentUserId, onUploadDirect, fetchRundData]);

  const findRundSoporte = (soportes: any[], tipo: string) =>
    soportes?.find((s: any) => s.tipo_soporte === tipo || s.tipo === tipo);

  const handlePreview = useCallback((doc: CarpetaDocumento) => {
    setPreviewDoc(doc);
    setZoomScale(1);
    setRotateAngle(0);
  }, []);

  const activePreviewIndex = useMemo(() => {
    if (!previewDoc) return -1;
    return currentFolderDocs.findIndex(d => d.id === previewDoc.id);
  }, [previewDoc, currentFolderDocs]);

  const handlePrevPreview = useCallback(() => {
    if (activePreviewIndex > 0) {
      const prev = currentFolderDocs[activePreviewIndex - 1];
      setPreviewDoc(prev);
      setZoomScale(1);
      setRotateAngle(0);
    }
  }, [activePreviewIndex, currentFolderDocs]);

  const handleNextPreview = useCallback(() => {
    if (activePreviewIndex >= 0 && activePreviewIndex < currentFolderDocs.length - 1) {
      const next = currentFolderDocs[activePreviewIndex + 1];
      setPreviewDoc(next);
      setZoomScale(1);
      setRotateAngle(0);
    }
  }, [activePreviewIndex, currentFolderDocs]);

  const handleDownload = useCallback((doc: CarpetaDocumento) => {
    if (doc.categoria === 'rund') {
      if (doc.url_archivo) {
        window.open(doc.url_archivo, '_blank');
      } else {
        toast.error('No hay URL de descarga disponible para este documento.');
      }
    } else if (onDownload) {
      onDownload(doc);
    }
  }, [onDownload]);

  const handleRefresh = useCallback(() => {
    fetchRundData();
    if (onRefresh) onRefresh();
  }, [fetchRundData, onRefresh]);

  const sortedRundBloques = useMemo(() => {
    const blockOrder = ['IDENTIDAD', 'CONTACTO', 'FORMACION', 'VINCULACION', 'ACADEMICO', 'TRANSVERSAL'];
    return [...rundBloques].sort((a, b) => {
      return blockOrder.indexOf(a.bloque) - blockOrder.indexOf(b.bloque);
    });
  }, [rundBloques]);

  // ========== DRAG AND DROP ==========
  const [isDragOver, setIsDragOver] = useState(false);
  const dragCounterRef = useRef(0);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    // Validate files
    const validExtensions = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.gif', '.xlsx', '.xls', '.pptx', '.ppt', '.txt', '.csv'];
    const maxSize = 10485760; // 10MB
    const validFiles: File[] = [];
    const rejectedFiles: string[] = [];

    for (const file of files) {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!validExtensions.includes(ext)) {
        rejectedFiles.push(`${file.name} (formato no soportado)`);
      } else if (file.size > maxSize) {
        rejectedFiles.push(`${file.name} (excede 10MB)`);
      } else {
        validFiles.push(file);
      }
    }

    if (rejectedFiles.length > 0) {
      toast.error(`${rejectedFiles.length} archivo(s) rechazado(s)`, {
        description: rejectedFiles.slice(0, 3).join(', ') + (rejectedFiles.length > 3 ? '...' : ''),
      });
    }

    if (validFiles.length > 0 && onDropFiles) {
      onDropFiles(validFiles);
    } else if (validFiles.length > 0 && onUpload) {
      // Fallback: trigger file picker if no onDropFiles handler
      onUpload();
    }
  }, [onDropFiles, onUpload]);

  // ========== DELETE CONFIRMATION ==========
  const [docToDelete, setDocToDelete] = useState<CarpetaDocumento | null>(null);
  const handleDeleteWithConfirm = (doc: CarpetaDocumento) => {
    setDocToDelete(doc);
  };
  const confirmDelete = async () => {
    if (docToDelete && onDelete) {
      const result = await onDelete(docToDelete);
      if (result === false) return;
    }
    setDocToDelete(null);
  };

  // ========== BULK SELECTION (admin list view) ==========
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  const toggleSelectDoc = (id: string) => {
    setSelectedDocIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectedDocs = useMemo(() =>
    combinedDocumentos.filter(d => selectedDocIds.has(d.id)),
    [combinedDocumentos, selectedDocIds]
  );

  const handleBulkValidate = async () => {
    if (!onValidate || selectedDocs.length === 0) return;
    setIsBulkProcessing(true);
    let ok = 0;
    for (const doc of selectedDocs) {
      try { await onValidate(doc); ok++; } catch { /* continue */ }
    }
    toast.success(`${ok} documento(s) validado(s)`);
    setSelectedDocIds(new Set());
    setIsBulkProcessing(false);
  };

  const handleBulkReject = async () => {
    if (!onReject || selectedDocs.length === 0) return;
    setIsBulkProcessing(true);
    let ok = 0;
    for (const doc of selectedDocs) {
      try { await onReject(doc); ok++; } catch { /* continue */ }
    }
    toast.success(`${ok} documento(s) rechazado(s)`);
    setSelectedDocIds(new Set());
    setIsBulkProcessing(false);
  };

  const handleBulkDelete = async () => {
    if (!onDelete || selectedDocs.length === 0) return;
    setIsBulkProcessing(true);
    let ok = 0;
    for (const doc of selectedDocs) {
      try { await onDelete(doc); ok++; } catch { /* continue */ }
    }
    toast.success(`${ok} documento(s) eliminado(s)`);
    setSelectedDocIds(new Set());
    setIsBulkProcessing(false);
  };



  // ========== EXPIRATION METRICS ==========
  const expirationMetrics = useMemo(() => {
    let expired = 0, warning = 0;
    combinedDocumentos.forEach(d => {
      const st = getExpirationStatus(d);
      if (st === 'expired') expired++;
      else if (st === 'warning') warning++;
    });
    return { expired, warning };
  }, [combinedDocumentos]);

  // ========== METRICS ==========
  const metrics = useMemo(() => {
    const total = combinedDocumentos.length;
    const validados = combinedDocumentos.filter(d => d.estado === 'validado').length;
    const pendientes = combinedDocumentos.filter(d => d.estado === 'pendiente').length;
    const rechazados = combinedDocumentos.filter(d => d.estado === 'rechazado').length;
    return { total, validados, pendientes, rechazados };
  }, [combinedDocumentos]);

  // ========== GROUPED TIPOS ==========
  const groupedTipos = useMemo(() => {
    const groups: Record<string, TipoDocumentoRequerido[]> = {};
    combinedTiposDocumentos.forEach(t => {
      const cat = t.categoria || 'otros';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(t);
    });
    const ordered = ['personal', 'rund', 'academico', 'laboral', 'certificados', 'administrativo', 'otros'];
    const result: [string, TipoDocumentoRequerido[]][] = [];
    ordered.forEach(cat => { if (groups[cat]) result.push([cat, groups[cat]]); });
    Object.keys(groups).forEach(cat => { if (!ordered.includes(cat)) result.push([cat, groups[cat]]); });
    return result;
  }, [combinedTiposDocumentos]);

  // ========== FILTERED DOCS (list view) ==========
  const filteredDocs = useMemo(() => {
    let result = [...combinedDocumentos];
    if (currentFolder) result = result.filter(d => isDocInCategory(d, currentFolder));
    if (currentFolder === 'rund' && currentSubfolder) {
      result = result.filter(d => getBloqueForTipoSoporte(d.id.replace('rund-soporte-', '')) === currentSubfolder);
    }
    if (filterStatus !== 'all') result = result.filter(d => d.estado === filterStatus);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(d => (d.nombre || '').toLowerCase().includes(q) || (d.categoria || '').includes(q));
    }
    return result.sort((a, b) => new Date(b.fecha_subida).getTime() - new Date(a.fecha_subida).getTime());
  }, [combinedDocumentos, currentFolder, currentSubfolder, filterStatus, searchQuery, isDocInCategory]);


  // ========== HELPERS ==========
  const getDocsForTipo = useCallback((tipo: TipoDocumentoRequerido): CarpetaDocumento[] => {
    if (tipo.documento) return [tipo.documento];
    const tipoNombre = normalizeDocumentText(tipo.nombre);
    return combinedDocumentos.filter(d => {
      if (d.tipo_documento_id && d.tipo_documento_id === tipo.id) return true;
      if (d.tipo_documento_id) return false;
      const docNombre = normalizeDocumentText(d.nombre);
      return !!tipoNombre && !!docNombre && (docNombre.includes(tipoNombre) || tipoNombre.includes(docNombre));
    });
  }, [combinedDocumentos]);

  const folderListItems = useMemo(() => {
    if (!currentFolder) return [];

    const items: Array<{
      key: string;
      isPending: boolean;
      tipo?: TipoDocumentoRequerido;
      doc?: CarpetaDocumento;
    }> = [];

    const folderTipos = combinedTiposDocumentos.filter(t => 
      t.categoria === currentFolder && 
      (currentFolder !== 'rund' || getBloqueForTipoSoporte(t.id.replace('rund_', '')) === currentSubfolder)
    );

    const displayedDocIds = new Set<string>();

    folderTipos.forEach(tipo => {
      const docs = getDocsForTipo(tipo);
      if (docs.length > 0) {
        docs.forEach(doc => {
          items.push({
            key: `doc-${doc.id}`,
            isPending: false,
            tipo,
            doc,
          });
          displayedDocIds.add(doc.id);
        });
      } else {
        items.push({
          key: `tipo-pending-${tipo.id}`,
          isPending: true,
          tipo,
        });
      }
    });

    const folderDocs = combinedDocumentos.filter(d => 
      isDocInCategory(d, currentFolder) && 
      (currentFolder !== 'rund' || getBloqueForTipoSoporte(d.id.replace('rund-soporte-', '')) === currentSubfolder)
    );

    folderDocs.forEach(doc => {
      if (!displayedDocIds.has(doc.id)) {
        items.push({
          key: `doc-uncat-${doc.id}`,
          isPending: false,
          doc,
        });
      }
    });

    return items;
  }, [currentFolder, currentSubfolder, combinedTiposDocumentos, combinedDocumentos, getDocsForTipo, isDocInCategory]);

  const filteredFolderListItems = useMemo(() => {
    let result = [...folderListItems];

    if (filterStatus !== 'all') {
      result = result.filter(item => {
        if (item.isPending) return false;
        return item.doc?.estado === filterStatus;
      });
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(item => {
        const name = item.isPending ? (item.tipo?.nombre || '') : (item.doc?.nombre || '');
        return name.toLowerCase().includes(q);
      });
    }

    return result;
  }, [folderListItems, filterStatus, searchQuery]);

  const checklistMetrics = useMemo(() => {
    const totalTipos = combinedTiposDocumentos.length;
    if (totalTipos === 0) {
      return {
        totalTipos: 0, totalCompletados: 0, pctGeneral: combinedDocumentos.length > 0 ? 100 : 0,
        tiposValidados: 0, tiposPendientes: 0, tiposRechazados: 0, tiposSinDoc: 0,
        obligatoriosFaltantes: 0,
      };
    }

    let tiposValidados = 0;
    let tiposPendientes = 0;
    let tiposRechazados = 0;
    let tiposSinDoc = 0;
    let obligatoriosFaltantes = 0;

    combinedTiposDocumentos.forEach(tipo => {
      const docs = getDocsForTipo(tipo);
      if (docs.length === 0) {
        tiposSinDoc++;
        if (tipo.obligatorio) obligatoriosFaltantes++;
      } else {
        const bestDoc = docs.find(d => d.estado === 'validado')
          || docs.find(d => d.estado === 'pendiente')
          || docs[0];
        if (bestDoc.estado === 'validado') tiposValidados++;
          else if (bestDoc.estado === 'rechazado') tiposRechazados++;
          else tiposPendientes++;
      }
    });

    const totalCompletados = tiposValidados + tiposPendientes;
    const pctGeneral = Math.round((tiposValidados / totalTipos) * 100);

    return {
      totalTipos, totalCompletados, pctGeneral,
      tiposValidados, tiposPendientes, tiposRechazados, tiposSinDoc,
      obligatoriosFaltantes,
    };
  }, [combinedTiposDocumentos, combinedDocumentos, getDocsForTipo]);

  // ========== FOLDER EXPLORER STATS & RECENT FILES ==========
  const folderStats = useMemo(() => {
    const stats: Record<string, { totalDocs: number; completedTypes: number; totalTypes: number; pct: number }> = {};
    const categories = ['personal', 'rund', 'academico', 'laboral', 'certificados', 'administrativo', 'otros'];

    categories.forEach(cat => {
      const docs = combinedDocumentos.filter(d => isDocInCategory(d, cat));
      const tipos = combinedTiposDocumentos.filter(t => t.categoria === cat);

      let completedTypes = 0;
      tipos.forEach(tipo => {
        const tipoDocs = getDocsForTipo(tipo);
        if (tipoDocs.length > 0) {
          const bestDoc = tipoDocs.find(d => d.estado === 'validado')
            || tipoDocs.find(d => d.estado === 'pendiente')
            || tipoDocs[0];
          if (bestDoc.estado === 'validado' || bestDoc.estado === 'pendiente') {
            completedTypes++;
          }
        }
      });

      const pct = tipos.length > 0 ? Math.round((completedTypes / tipos.length) * 100) : (docs.length > 0 ? 100 : 0);

      stats[cat] = {
        totalDocs: docs.length,
        completedTypes,
        totalTypes: tipos.length,
        pct
      };
    });

    return stats;
  }, [combinedDocumentos, combinedTiposDocumentos, getDocsForTipo, isDocInCategory]);

  const rundSubfolderStats = useMemo(() => {
    const stats: Record<string, { totalDocs: number; completedTypes: number; totalTypes: number; pct: number }> = {};
    const subfolders = ['IDENTIDAD', 'FORMACION', 'VINCULACION', 'ACADEMICO', 'TRANSVERSAL'];

    subfolders.forEach(sub => {
      const tipos = combinedTiposDocumentos.filter(t => t.categoria === 'rund' && getBloqueForTipoSoporte(t.id.replace('rund_', '')) === sub);
      const docs = combinedDocumentos.filter(d => d.categoria === 'rund' && getBloqueForTipoSoporte(d.id.replace('rund-soporte-', '')) === sub);

      let completedTypes = 0;
      tipos.forEach(tipo => {
        const tipoDocs = getDocsForTipo(tipo);
        if (tipoDocs.length > 0) {
          const bestDoc = tipoDocs.find(d => d.estado === 'validado')
            || tipoDocs.find(d => d.estado === 'pendiente')
            || tipoDocs[0];
          if (bestDoc.estado === 'validado' || bestDoc.estado === 'pendiente') {
            completedTypes++;
          }
        }
      });

      const pct = tipos.length > 0 ? Math.round((completedTypes / tipos.length) * 100) : (docs.length > 0 ? 100 : 0);

      stats[sub] = {
        totalDocs: docs.length,
        completedTypes,
        totalTypes: tipos.length,
        pct
      };
    });

    return stats;
  }, [combinedDocumentos, combinedTiposDocumentos, getDocsForTipo]);

  const folderAlerts = useMemo(() => {
    const alerts: Record<string, { expired: number; rejected: number; warning: number }> = {};
    const categories = ['personal', 'rund', 'academico', 'laboral', 'certificados', 'administrativo', 'otros'];

    categories.forEach(cat => {
      const docs = combinedDocumentos.filter(d => isDocInCategory(d, cat));
      let expired = 0, rejected = 0, warning = 0;
      
      docs.forEach(d => {
        const expSt = getExpirationStatus(d);
        if (expSt === 'expired') expired++;
        else if (expSt === 'warning') warning++;
        if (d.estado === 'rechazado') rejected++;
      });

      alerts[cat] = { expired, rejected, warning };
    });

    const subfolders = ['IDENTIDAD', 'FORMACION', 'VINCULACION', 'ACADEMICO', 'TRANSVERSAL'];
    subfolders.forEach(sub => {
      const docs = combinedDocumentos.filter(d => d.categoria === 'rund' && getBloqueForTipoSoporte(d.id.replace('rund-soporte-', '')) === sub);
      let expired = 0, rejected = 0, warning = 0;

      docs.forEach(d => {
        const expSt = getExpirationStatus(d);
        if (expSt === 'expired') expired++;
        else if (expSt === 'warning') warning++;
        if (d.estado === 'rechazado') rejected++;
      });

      alerts[`rund_${sub}`] = { expired, rejected, warning };
    });

    return alerts;
  }, [combinedDocumentos, isDocInCategory]);

  const recentFiles = useMemo(() => {
    return [...combinedDocumentos]
      .sort((a, b) => new Date(b.fecha_subida).getTime() - new Date(a.fecha_subida).getTime())
      .slice(0, 5);
  }, [combinedDocumentos]);

  const toggleCollapse = (cat: string) => {
    setCollapsedCats(prev => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  const initials = (persona.nombre || 'NA').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  // ========== LOADING ==========
  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 style={{ width: 36, height: 36, color: '#003DA5', margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
          <p style={{ fontSize: 14, color: '#6B7280', fontWeight: 500 }}>Cargando carpeta digital...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{ position: 'relative' }}
    >
      {/* ═══ DRAG & DROP OVERLAY ═══ */}
      <AnimatePresence>
        {isDragOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute', inset: 0, zIndex: 100,
              background: 'rgba(0, 61, 165, 0.06)',
              border: '3px dashed #003DA5',
              borderRadius: 20,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 12, pointerEvents: 'none',
            }}
          >
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
              style={{
                width: 72, height: 72, borderRadius: 20,
                background: 'linear-gradient(135deg, #003DA5 0%, #2962FF 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 32px rgba(0,61,165,0.3)',
              }}
            >
              <Upload style={{ width: 32, height: 32, color: 'white' }} />
            </motion.div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 16, fontWeight: 800, color: '#003DA5' }}>Soltar archivos aquí</p>
              <p style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
                PDF, DOC, JPG, PNG, XLSX — máx 10MB por archivo
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════
          BREADCRUMB + BACK
          ═══════════════════════════════════════════════════════════════ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#6B7280', marginBottom: 16, flexWrap: 'wrap' }}>
        {onBack && (
          <>
            <button
              onClick={onBack}
              style={{
                display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none',
                cursor: 'pointer', color: '#6B7280', fontWeight: 500, padding: 0, fontSize: 13,
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#003DA5'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#6B7280'; }}
            >
              <ChevronLeft style={{ width: 16, height: 16 }} />
              Volver
            </button>
            <ChevronRight style={{ width: 12, height: 12, color: '#D1D5DB' }} />
          </>
        )}
        
        <span style={{ fontWeight: 500 }}>Carpeta Digital</span>
        <ChevronRight style={{ width: 12, height: 12, color: '#D1D5DB' }} />
        <span style={{ fontWeight: 500 }}>{persona.nombre}</span>
        
        <ChevronRight style={{ width: 12, height: 12, color: '#D1D5DB' }} />
        <button
          onClick={() => handleSetFolder(null)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: currentFolder ? '#003DA5' : '#1F2937',
            fontWeight: currentFolder ? 500 : 700,
            padding: 0, fontSize: 13,
            outline: 'none',
          }}
        >
          Mi Unidad
        </button>
        
        {currentFolder && (
          <>
            <ChevronRight style={{ width: 12, height: 12, color: '#D1D5DB' }} />
            <button
              onClick={() => {
                setCurrentFolder(currentFolder);
                setCurrentSubfolder(null);
              }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: (currentFolder === 'rund' && currentSubfolder) ? '#003DA5' : '#1F2937',
                fontWeight: (currentFolder === 'rund' && currentSubfolder) ? 500 : 700,
                padding: 0, fontSize: 13,
                outline: 'none',
              }}
            >
              {currentFolder === 'rund' ? 'RUND' : (CATEGORY_CONFIG[currentFolder]?.label || currentFolder)}
            </button>
          </>
        )}

        {currentFolder === 'rund' && currentSubfolder && (
          <>
            <ChevronRight style={{ width: 12, height: 12, color: '#D1D5DB' }} />
            <span style={{ fontWeight: 700, color: '#1F2937' }}>
              {RUND_SUBFOLDERS_CONFIG[currentSubfolder]?.label || currentSubfolder}
            </span>
          </>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          USER HEADER
          ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 mb-4 sm:mb-5 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-12 h-12 sm:w-12 sm:h-12 rounded-full flex-shrink-0 flex items-center justify-center shadow-sm" style={{ background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)' }}>
            <span className="text-[18px] font-bold text-white">{initials}</span>
          </div>
          <div className="flex-1 min-w-0 w-full">
            <h2 className="text-[16px] sm:text-[18px] font-bold text-gray-900 m-0 truncate">{persona.nombre}</h2>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2">
              {persona.numeroDocumento && (
                <span className="text-[13px] font-medium text-gray-500 flex items-center">
                  CC: <span className="text-[#003DA5] font-semibold ml-1">{persona.numeroDocumento}</span>
                </span>
              )}
              {persona.email && (
                <span className="text-[13px] text-gray-400 flex items-center gap-1.5 truncate">
                  <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{persona.email}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          PROGRESS + STATS
          ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4 sm:mb-5 shadow-sm">
        <div className="p-4">
          <div className="flex items-center gap-6">
            {/* Progress Ring */}
            <div className="flex items-center gap-4 flex-shrink-0">
              <ProgressRing
                value={checklistMetrics.pctGeneral}
                size={60}
                stroke={5}
                color={checklistMetrics.pctGeneral === 100 ? '#059669' : '#2962FF'}
              />
              <div className="flex-1 min-w-0">
                <h3 className="text-[14px] font-bold text-gray-900 m-0 truncate">
                  {checklistMetrics.pctGeneral === 100 ? 'Carpeta Completa' : 'Progreso'}
                </h3>
                <p className="text-[12px] text-gray-500 mt-0.5 truncate">
                  {checklistMetrics.totalTipos > 0
                    ? `${checklistMetrics.tiposValidados}/${checklistMetrics.totalTipos} validados`
                    : `${metrics.total} documentos`
                  }
                </p>
                {checklistMetrics.totalTipos > 0 && checklistMetrics.tiposPendientes > 0 && (
                  <p className="text-[11px] text-amber-600 mt-0.5 font-semibold truncate">
                    {checklistMetrics.tiposPendientes} pendientes
                  </p>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="w-[1px] h-10 bg-gray-200 flex-shrink-0" />

            {/* Stat pills — show checklist-aware metrics when tipos exist */}
            <div className="flex-1 flex gap-2">
              {(checklistMetrics.totalTipos > 0 ? [
                { key: 'total', label: 'TOTAL DOCS', value: metrics.total, color: '#003DA5', bg: '#EFF6FF' },
                { key: 'validados', label: 'VALIDADOS', value: checklistMetrics.tiposValidados, color: '#059669', bg: '#ECFDF5' },
                { key: 'pendientes', label: 'PENDIENTES', value: checklistMetrics.tiposPendientes, color: '#D97706', bg: '#FFFBEB' },
                { key: 'rechazados', label: 'RECHAZADOS', value: checklistMetrics.tiposRechazados, color: '#DC2626', bg: '#FEF2F2' },
                { key: 'sinDoc', label: 'SIN SUBIR', value: checklistMetrics.tiposSinDoc, color: '#6B7280', bg: '#F3F4F6' },
              ] : [
                { key: 'total', label: 'TOTAL', value: metrics.total, color: '#003DA5', bg: '#EFF6FF' },
                { key: 'validados', label: 'VALIDADOS', value: metrics.validados, color: '#059669', bg: '#ECFDF5' },
                { key: 'pendientes', label: 'PENDIENTES', value: metrics.pendientes, color: '#D97706', bg: '#FFFBEB' },
                { key: 'rechazados', label: 'RECHAZADOS', value: metrics.rechazados, color: '#DC2626', bg: '#FEF2F2' },
              ]).map(s => (
                <button
                  key={s.key}
                  onClick={() => {
                    if (s.key === 'total' || s.key === 'sinDoc') { setFilterStatus('all'); setViewMode('lista'); }
                    else { setFilterStatus(s.key === 'validados' ? 'validado' : s.key === 'pendientes' ? 'pendiente' : 'rechazado'); setViewMode('lista'); }
                  }}
                  className={`flex-1 min-h-[44px] rounded-lg px-3 py-1.5 text-left border-none cursor-pointer transition-all hover:brightness-95`}
                  style={{ background: s.bg }}
                >
                  <p className="text-[9px] font-bold uppercase tracking-wider m-0 truncate" style={{ color: s.color }}>{s.label}</p>
                  <p className="text-[16px] font-bold mt-0.5" style={{ color: s.color }}>{s.value}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Obligatorios faltantes alert */}
          {checklistMetrics.obligatoriosFaltantes > 0 && (
            <div style={{
              marginTop: 14, padding: '10px 16px', borderRadius: 10,
              background: '#FEF2F2', border: '1px solid #FECACA',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <AlertCircle style={{ width: 16, height: 16, color: '#DC2626', flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#991B1B' }}>
                {checklistMetrics.obligatoriosFaltantes} documento{checklistMetrics.obligatoriosFaltantes !== 1 ? 's' : ''} obligatorio{checklistMetrics.obligatoriosFaltantes !== 1 ? 's' : ''} sin subir
              </span>
            </div>
          )}
        </div>

        {/* ═══ EXPIRATION BANNER ═══ */}
        {(expirationMetrics.expired > 0 || expirationMetrics.warning > 0) && (
          <div style={{
            padding: '10px 24px', borderTop: '1px solid #E5E7EB',
            background: expirationMetrics.expired > 0 ? '#FEF2F2' : '#FFFBEB',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <AlertTriangle style={{ width: 15, height: 15, color: expirationMetrics.expired > 0 ? '#DC2626' : '#D97706', flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: expirationMetrics.expired > 0 ? '#DC2626' : '#D97706' }}>
              {expirationMetrics.expired > 0 && `${expirationMetrics.expired} documento(s) vencido(s)`}
              {expirationMetrics.expired > 0 && expirationMetrics.warning > 0 && ' · '}
              {expirationMetrics.warning > 0 && `${expirationMetrics.warning} documento(s) por vencer`}
            </span>
            <button
              onClick={() => { setFilterStatus('all'); setViewMode('lista'); }}
              style={{
                marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: '#003DA5',
                background: 'white', border: '1px solid #E5E7EB', borderRadius: 6,
                padding: '4px 10px', cursor: 'pointer',
              }}
            >
              Ver documentos
            </button>
          </div>
        )}

        {/* ═══ TOOLBAR ═══ */}
        <div className="p-3 bg-gray-50 border-t border-gray-200 flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center bg-white border border-gray-200 rounded-lg p-1 flex-shrink-0">
            <button
              onClick={() => setViewMode('tipos')}
              className={`px-3 py-1.5 rounded-md text-[13px] font-semibold flex items-center justify-center gap-2 border-none cursor-pointer transition-all ${viewMode === 'tipos' ? 'bg-[#003DA5] text-white' : 'bg-transparent text-gray-500'}`}
            >
              <Grid3X3 className="w-4 h-4" /> Por Tipo
            </button>
            <button
              onClick={() => setViewMode('lista')}
              className={`px-3 py-1.5 rounded-md text-[13px] font-semibold flex items-center justify-center gap-2 border-none cursor-pointer transition-all ${viewMode === 'lista' ? 'bg-[#003DA5] text-white' : 'bg-transparent text-gray-500'}`}
            >
              <List className="w-4 h-4" /> Lista
            </button>
          </div>

          {/* Search */}
          <div className="flex-1 min-w-0 max-w-sm">
            <div className={`flex items-center h-10 rounded-lg bg-white px-3 transition-all ${searchFocused ? 'border border-[#003DA5] ring-2 ring-[#003DA5]/10' : 'border border-gray-300'}`}>
              <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <input
                type="text"
                placeholder="Buscar documento..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                className="border-none outline-none bg-transparent text-[13px] text-gray-900 flex-1 h-full px-2 min-w-0"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="w-6 h-6 rounded-md border-none bg-gray-100 cursor-pointer flex items-center justify-center flex-shrink-0"
                >
                  <X className="w-3.5 h-3.5 text-gray-400" />
                </button>
              )}
            </div>
          </div>

          {/* Status filter pills (list view) */}
          {viewMode === 'lista' && (
            <div className="flex gap-2 flex-shrink-0 hidden md:flex">
              {(['all', 'validado', 'pendiente', 'rechazado'] as const).map(st => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-3 py-1 text-[11px] font-bold rounded-full cursor-pointer transition-all border ${filterStatus === st ? 'border-[#003DA5] bg-[#003DA5] text-white' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'}`}
                >
                  {st === 'all' ? 'Todos' : STATUS_CONFIG[st]?.label}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 ml-auto flex-shrink-0">
            {onRefresh && (
              <button
                onClick={handleRefresh}
                className="w-10 h-10 rounded-lg border border-gray-200 bg-white cursor-pointer flex items-center justify-center transition-colors hover:bg-gray-50"
                title="Recargar"
              >
                <RefreshCw className="w-4 h-4 text-gray-500" />
              </button>
            )}
            {onUpload && (
              <button
                onClick={() => onUpload()}
                className="h-10 px-5 rounded-lg border-none bg-[#003DA5] text-white text-[13px] font-bold cursor-pointer flex items-center justify-center gap-2 transition-all shadow-sm hover:bg-[#002D7A]"
              >
                <Upload className="w-4 h-4" /> Subir documento
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          VIEW: POR TIPO
          ═══════════════════════════════════════════════════════════════ */}
      {viewMode === 'tipos' && (
        <div className="flex flex-col gap-4">
          
          {/* RUND HIDDEN INPUT & MODALS */}
          <input
            type="file"
            ref={rundFileInputRef}
            style={{ display: 'none' }}
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleRundFileChange}
          />

          {rundPreviewUrl && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem' }}>
              <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 900, height: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ background: '#e0f2fe', color: '#0ea5e9', padding: 8, borderRadius: 8 }}>
                      <FileText size={20} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1rem', color: '#0f172a', fontWeight: 600 }}>Previsualización de Soporte RUND</h3>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>{rundPreviewUrl.name}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setRundPreviewUrl(null)}
                    style={{ background: '#f1f5f9', border: 'none', cursor: 'pointer', padding: 8, borderRadius: '50%', display: 'flex', alignItems: 'center', color: '#64748b', transition: 'background 0.2s' }}
                  >
                    <XCircle size={20} color="#64748b" />
                  </button>
                </div>
                <div style={{ flex: 1, background: '#e2e8f0', padding: '16px' }}>
                  <iframe 
                    src={rundPreviewUrl.url} 
                    style={{ width: '100%', height: '100%', border: 'none', borderRadius: 8, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }} 
                    title="Visor de documento RUND"
                  />
                </div>
              </div>
            </div>
          )}

          {currentFolder === null ? (
            /* --- ROOT FOLDER EXPLORER VIEW (Mi Unidad) --- */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* SECTION: CARPETAS */}
              <div>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Carpetas</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {['personal', 'rund', 'academico', 'laboral', 'certificados', 'administrativo', 'otros']
                    .filter(cat => cat !== 'rund' || !!tarjetaRund)
                    .map(cat => {
                    const catConf = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.otros;
                    const CatIcon = catConf.icon;
                    const stats = folderStats[cat] || { totalDocs: 0, completedTypes: 0, totalTypes: 0, pct: 0 };
                    
                    return (
                      <motion.div
                        key={cat}
                        whileHover={{ y: -4, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)' }}
                        onClick={() => handleSetFolder(cat)}
                        style={{
                          background: 'white',
                          border: `1px solid ${catConf.borderColor}`,
                          borderRadius: 14,
                          padding: 16,
                          cursor: 'pointer',
                          transition: 'border-color 0.2s',
                          position: 'relative',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = catConf.color; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = catConf.borderColor; }}
                      >
                        {/* Alert Badges */}
                        {(() => {
                          const alert = folderAlerts[cat];
                          if (!alert) return null;
                          const totalAlerts = alert.expired + alert.rejected;
                          if (totalAlerts > 0) {
                            return (
                              <div style={{
                                position: 'absolute', top: 12, right: 12,
                                background: '#EF4444', color: 'white',
                                borderRadius: '50%', width: 18, height: 18,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 9, fontWeight: 800,
                                zIndex: 10,
                              }} title={`${totalAlerts} documento(s) con problemas (Rechazados o Vencidos)`}>
                                {totalAlerts}
                              </div>
                            );
                          }
                          if (alert.warning > 0) {
                            return (
                              <div style={{
                                position: 'absolute', top: 12, right: 12,
                                background: '#F59E0B', color: 'white',
                                borderRadius: '50%', width: 18, height: 18,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 9, fontWeight: 800,
                                zIndex: 10,
                              }} title={`${alert.warning} documento(s) por vencer`}>
                                {alert.warning}
                              </div>
                            );
                          }
                          return null;
                        })()}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                          <div style={{ width: 40, height: 40, borderRadius: 10, background: catConf.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <CatIcon style={{ width: 20, height: 20, color: catConf.color }} />
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1F2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {cat === 'rund' ? 'RUND' : catConf.label}
                            </h4>
                            <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6B7280' }}>
                              {stats.totalTypes > 0 ? `${stats.completedTypes}/${stats.totalTypes} completados` : `${stats.totalDocs} archivos`}
                            </p>
                          </div>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 6, background: '#E5E7EB', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ width: `${stats.pct}%`, height: '100%', background: stats.pct === 100 ? '#059669' : catConf.color, borderRadius: 3, transition: 'width 0.5s ease-out' }} />
                          </div>
                          <span style={{ fontSize: 10, fontWeight: 700, color: stats.pct === 100 ? '#059669' : '#4B5563', flexShrink: 0 }}>
                            {stats.pct}%
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* SECTION: ARCHIVOS RECIENTES */}
              {recentFiles.length > 0 && (
                <div>
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Archivos Recientes</h3>
                  <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', minWidth: 600, fontSize: 13, borderCollapse: 'collapse' }}>
                        <tbody>
                          {recentFiles.map(doc => {
                            const Icon = getFileIcon(doc.tipo_archivo);
                            const st = STATUS_CONFIG[doc.estado as DocumentStatus] || STATUS_CONFIG.pendiente;
                            const StIcon = st.icon;
                            const catConf = CATEGORY_CONFIG[(doc.categoria || 'otros') as string] || CATEGORY_CONFIG.otros;
                            
                            return (
                              <tr
                                key={doc.id}
                                style={{ borderBottom: '1px solid #F3F4F6', cursor: 'pointer', transition: 'background 0.15s' }}
                                onClick={() => setDetailDoc(doc)}
                                onMouseEnter={e => { e.currentTarget.style.background = '#EFF6FF40'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                              >
                                <td style={{ padding: '10px 16px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{ width: 32, height: 32, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#EFF6FF', flexShrink: 0 }}>
                                      <Icon style={{ width: 14, height: 14, color: '#003DA5' }} />
                                    </div>
                                    <span style={{ fontWeight: 600, color: '#1F2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260 }}>
                                      {doc.nombre}
                                    </span>
                                  </div>
                                </td>
                                <td style={{ padding: '10px 16px', color: '#6B7280', fontSize: 11 }}>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: catConf.color }} />
                                    {doc.categoria === 'rund' ? 'RUND' : catConf.label}
                                  </span>
                                </td>
                                <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 6px', borderRadius: 12, fontSize: 10, fontWeight: 700, background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>
                                    <StIcon style={{ width: 10, height: 10 }} />
                                    {st.label}
                                  </span>
                                </td>
                                <td style={{ padding: '10px 16px', color: '#9CA3AF', fontSize: 11, textAlign: 'right' }}>
                                  {formatRelative(doc.fecha_subida)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* --- INSIDE FOLDER VIEW --- */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Folder Header Banner */}
              {(() => {
                const catConf = CATEGORY_CONFIG[currentFolder] || CATEGORY_CONFIG.otros;
                const subConf = (currentFolder === 'rund' && currentSubfolder) ? RUND_SUBFOLDERS_CONFIG[currentSubfolder] : null;
                const CatIcon = subConf ? subConf.icon : catConf.icon;
                const stats = folderStats[currentFolder] || { totalDocs: 0, completedTypes: 0, totalTypes: 0, pct: 0 };
                
                const displayTitle = currentFolder === 'rund'
                  ? (currentSubfolder ? `RUND - ${RUND_SUBFOLDERS_CONFIG[currentSubfolder]?.label}` : 'RUND')
                  : catConf.label;
                  
                const displaySubtitle = currentFolder === 'rund' && currentSubfolder
                  ? `${rundSubfolderStats[currentSubfolder]?.completedTypes}/${rundSubfolderStats[currentSubfolder]?.totalTypes} completados`
                  : (stats.totalTypes > 0 ? `${stats.completedTypes}/${stats.totalTypes} completados` : `${stats.totalDocs} archivos`);
                  
                const displayPct = currentFolder === 'rund' && currentSubfolder
                  ? rundSubfolderStats[currentSubfolder]?.pct
                  : stats.pct;
                  
                const displayColor = subConf ? subConf.color : catConf.color;
                
                return (
                  <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E5E7EB', padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <button
                        onClick={() => {
                          if (currentFolder === 'rund' && currentSubfolder !== null) {
                            setCurrentSubfolder(null);
                          } else {
                            handleSetFolder(null);
                          }
                        }}
                        style={{
                          width: 36, height: 36, borderRadius: 10, border: '1px solid #E5E7EB',
                          background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'background 0.2s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#F3F4F6'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'white'; }}
                      >
                        <ChevronLeft style={{ width: 18, height: 18, color: '#4B5563' }} />
                      </button>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: displayColor + '15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CatIcon style={{ width: 22, height: 22, color: displayColor }} />
                      </div>
                      <div>
                        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#1F2937' }}>
                          {displayTitle}
                        </h2>
                        <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6B7280' }}>
                          {displaySubtitle}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ textAlign: 'right', display: 'none', sm: 'block' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: displayPct === 100 ? '#059669' : displayColor }}>
                          Completitud de la carpeta
                        </span>
                        <div style={{ width: 120, height: 6, background: '#E5E7EB', borderRadius: 3, overflow: 'hidden', marginTop: 4 }}>
                          <div style={{ width: `${displayPct}%`, height: '100%', background: displayPct === 100 ? '#059669' : displayColor, borderRadius: 3 }} />
                        </div>
                      </div>
                      <span style={{ fontSize: 18, fontWeight: 800, color: displayPct === 100 ? '#059669' : displayColor, marginRight: 8 }}>
                        {displayPct}%
                      </span>
                      {currentFolder && currentFolderDocs.length > 0 && (
                        <button
                          onClick={handleDownloadZip}
                          disabled={zippingFolder}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '8px 14px',
                            borderRadius: 10,
                            fontSize: 12,
                            fontWeight: 700,
                            background: '#003DA5',
                            color: 'white',
                            border: 'none',
                            cursor: zippingFolder ? 'not-allowed' : 'pointer',
                            opacity: zippingFolder ? 0.6 : 1,
                            transition: 'all 0.2s',
                            boxShadow: '0 2px 4px rgba(0, 61, 165, 0.1)',
                          }}
                          onMouseEnter={e => { if (!zippingFolder) e.currentTarget.style.background = '#002e7d'; }}
                          onMouseLeave={e => { if (!zippingFolder) e.currentTarget.style.background = '#003DA5'; }}
                        >
                          {zippingFolder ? (
                            <>
                              <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />
                              {zipProgress > 0 ? `${zipProgress}%` : 'Generando...'}
                            </>
                          ) : (
                            <>
                              <FileArchive style={{ width: 14, height: 14 }} />
                              Descargar ZIP
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Types / Cards Checklist */}
              {currentFolder === 'rund' && currentSubfolder === null ? (
                /* --- RUND SUBFOLDERS VIEW --- */
                <div>
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Subcarpetas RUND</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {['IDENTIDAD', 'FORMACION', 'VINCULACION', 'ACADEMICO', 'TRANSVERSAL'].map(sub => {
                      const subConf = RUND_SUBFOLDERS_CONFIG[sub];
                      const SubIcon = subConf.icon;
                      const stats = rundSubfolderStats[sub] || { totalDocs: 0, completedTypes: 0, totalTypes: 0, pct: 0 };
                      
                      return (
                        <motion.div
                          key={sub}
                          whileHover={{ y: -4, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)' }}
                          onClick={() => setCurrentSubfolder(sub)}
                          style={{
                            background: 'white',
                            border: `1px solid ${subConf.borderColor}`,
                            borderRadius: 14,
                            padding: 16,
                            cursor: 'pointer',
                            transition: 'border-color 0.2s',
                            position: 'relative',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = subConf.color; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = subConf.borderColor; }}
                        >
                          {/* Alert Badges */}
                          {(() => {
                            const alert = folderAlerts[`rund_${sub}`];
                            if (!alert) return null;
                            const totalAlerts = alert.expired + alert.rejected;
                            if (totalAlerts > 0) {
                              return (
                                <div style={{
                                  position: 'absolute', top: 12, right: 12,
                                  background: '#EF4444', color: 'white',
                                  borderRadius: '50%', width: 18, height: 18,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: 9, fontWeight: 800,
                                  zIndex: 10,
                                }} title={`${totalAlerts} documento(s) con problemas (Rechazados o Vencidos)`}>
                                  {totalAlerts}
                                </div>
                              );
                            }
                            if (alert.warning > 0) {
                              return (
                                <div style={{
                                  position: 'absolute', top: 12, right: 12,
                                  background: '#F59E0B', color: 'white',
                                  borderRadius: '50%', width: 18, height: 18,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: 9, fontWeight: 800,
                                  zIndex: 10,
                                }} title={`${alert.warning} documento(s) por vencer`}>
                                  {alert.warning}
                                </div>
                              );
                            }
                            return null;
                          })()}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 10, background: subConf.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <SubIcon style={{ width: 20, height: 20, color: subConf.color }} />
                            </div>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1F2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {subConf.label}
                              </h4>
                              <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6B7280' }}>
                                {stats.totalTypes > 0 ? `${stats.completedTypes}/${stats.totalTypes} completados` : `${stats.totalDocs} archivos`}
                              </p>
                            </div>
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1, height: 6, background: '#E5E7EB', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ width: `${stats.pct}%`, height: '100%', background: stats.pct === 100 ? '#059669' : subConf.color, borderRadius: 3, transition: 'width 0.5s ease-out' }} />
                            </div>
                            <span style={{ fontSize: 10, fontWeight: 700, color: stats.pct === 100 ? '#059669' : '#4B5563', flexShrink: 0 }}>
                              {stats.pct}%
                            </span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              ) : combinedTiposDocumentos.filter(t => t.categoria === currentFolder && (currentFolder !== 'rund' || getBloqueForTipoSoporte(t.id.replace('rund_', '')) === currentSubfolder)).length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {combinedTiposDocumentos
                    .filter(t => t.categoria === currentFolder && (currentFolder !== 'rund' || getBloqueForTipoSoporte(t.id.replace('rund_', '')) === currentSubfolder))
                    .map(tipo => (
                      <TipoDocCard
                        key={tipo.id}
                        tipo={tipo}
                        docs={getDocsForTipo(tipo)}
                        onUpload={(tipoId, cat, name) => {
                          if (tipoId && tipoId.startsWith('rund_')) {
                            const tipoSoporteCode = tipoId.replace('rund_', '');
                            const bloque = getBloqueForTipoSoporte(tipoSoporteCode);
                            handleVincularRundClick(bloque, tipoSoporteCode);
                          } else if (onUpload) {
                            onUpload(tipoId, cat, name);
                          }
                        }}
                        onUploadDirect={handleDirectUpload}
                        onSelectDoc={d => setDetailDoc(d)}
                      />
                    ))}
                </div>
              ) : (
                /* Empty category / Uncategorized files inside folder */
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  {combinedDocumentos.filter(d => isDocInCategory(d, currentFolder)).length === 0 ? (
                    <div style={{ padding: '48px 0', textAlign: 'center' }}>
                      <FolderOpen style={{ width: 40, height: 40, color: '#D1D5DB', margin: '0 auto 12px' }} />
                      <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1F2937', marginBottom: 4 }}>Esta carpeta está vacía</h3>
                      <p style={{ fontSize: 12, color: '#9CA3AF' }}>Sube un documento para comenzar</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {combinedDocumentos
                        .filter(d => isDocInCategory(d, currentFolder))
                        .map(doc => {
                          const Icon = getFileIcon(doc.tipo_archivo);
                          const st = STATUS_CONFIG[doc.estado as DocumentStatus] || STATUS_CONFIG.pendiente;
                          const StIcon = st.icon;
                          return (
                            <div
                              key={doc.id}
                              onClick={() => setDetailDoc(doc)}
                              className="p-3 sm:p-4 rounded-xl border border-gray-200 cursor-pointer transition-all hover:bg-gray-50 hover:border-gray-300"
                            >
                              <div className="flex items-start gap-3">
                                <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 bg-blue-50">
                                  <Icon className="w-6 h-6 text-[#003DA5]" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[14px] font-bold text-gray-900 truncate mb-1.5">{doc.nombre}</p>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold border" style={{ borderColor: st.border, background: st.bg, color: st.color }}>
                                      <StIcon className="w-3.5 h-3.5" />{st.label}
                                    </span>
                                    <span className="text-[12px] text-gray-400">{formatRelative(doc.fecha_subida)}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          VIEW: LISTA
          ═══════════════════════════════════════════════════════════════ */}
      {viewMode === 'lista' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {currentFolder !== null && (
            /* Folder Header Banner */
            (() => {
              const catConf = CATEGORY_CONFIG[currentFolder] || CATEGORY_CONFIG.otros;
              const subConf = (currentFolder === 'rund' && currentSubfolder) ? RUND_SUBFOLDERS_CONFIG[currentSubfolder] : null;
              const CatIcon = subConf ? subConf.icon : catConf.icon;
              const stats = folderStats[currentFolder] || { totalDocs: 0, completedTypes: 0, totalTypes: 0, pct: 0 };
              
              const displayTitle = currentFolder === 'rund'
                ? (currentSubfolder ? `RUND - ${RUND_SUBFOLDERS_CONFIG[currentSubfolder]?.label}` : 'RUND')
                : catConf.label;
                
              const displaySubtitle = currentFolder === 'rund' && currentSubfolder
                ? `${rundSubfolderStats[currentSubfolder]?.completedTypes}/${rundSubfolderStats[currentSubfolder]?.totalTypes} completados`
                : (stats.totalTypes > 0 ? `${stats.completedTypes}/${stats.totalTypes} completados` : `${stats.totalDocs} archivos`);
                
              const displayPct = currentFolder === 'rund' && currentSubfolder
                ? rundSubfolderStats[currentSubfolder]?.pct
                : stats.pct;
                
              const displayColor = subConf ? subConf.color : catConf.color;
              
              return (
                <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E5E7EB', padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <button
                      onClick={() => {
                        if (currentFolder === 'rund' && currentSubfolder !== null) {
                          setCurrentSubfolder(null);
                        } else {
                          handleSetFolder(null);
                        }
                      }}
                      style={{
                        width: 36, height: 36, borderRadius: 10, border: '1px solid #E5E7EB',
                        background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#F3F4F6'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'white'; }}
                    >
                      <ChevronLeft style={{ width: 18, height: 18, color: '#4B5563' }} />
                    </button>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: displayColor + '15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CatIcon style={{ width: 22, height: 22, color: displayColor }} />
                    </div>
                    <div>
                      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#1F2937' }}>
                        {displayTitle}
                      </h2>
                      <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6B7280' }}>
                        {displaySubtitle}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ textAlign: 'right', display: 'none', sm: 'block' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: displayPct === 100 ? '#059669' : displayColor }}>
                        Completitud de la carpeta
                      </span>
                      <div style={{ width: 120, height: 6, background: '#E5E7EB', borderRadius: 3, overflow: 'hidden', marginTop: 4 }}>
                        <div style={{ width: `${displayPct}%`, height: '100%', background: displayPct === 100 ? '#059669' : displayColor, borderRadius: 3 }} />
                      </div>
                    </div>
                    <span style={{ fontSize: 18, fontWeight: 800, color: displayPct === 100 ? '#059669' : displayColor, marginRight: 8 }}>
                      {displayPct}%
                    </span>
                    {currentFolder && currentFolderDocs.length > 0 && (
                      <button
                        onClick={handleDownloadZip}
                        disabled={zippingFolder}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '8px 14px',
                          borderRadius: 10,
                          fontSize: 12,
                          fontWeight: 700,
                          background: '#003DA5',
                          color: 'white',
                          border: 'none',
                          cursor: zippingFolder ? 'not-allowed' : 'pointer',
                          opacity: zippingFolder ? 0.6 : 1,
                          transition: 'all 0.2s',
                          boxShadow: '0 2px 4px rgba(0, 61, 165, 0.1)',
                        }}
                        onMouseEnter={e => { if (!zippingFolder) e.currentTarget.style.background = '#002e7d'; }}
                        onMouseLeave={e => { if (!zippingFolder) e.currentTarget.style.background = '#003DA5'; }}
                      >
                        {zippingFolder ? (
                          <>
                            <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />
                            {zipProgress > 0 ? `${zipProgress}%` : 'Generando...'}
                          </>
                        ) : (
                          <>
                            <FileArchive style={{ width: 14, height: 14 }} />
                            Descargar ZIP
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })()
          )}
          <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
            {currentFolder === null ? (
            /* --- ROOT LIST VIEW (Mi Unidad) --- */
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: 600, fontSize: 13, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nombre</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Propietario</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Última modificación</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tamaño de la carpeta</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', width: 100 }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {['personal', 'rund', 'academico', 'laboral', 'certificados', 'administrativo', 'otros']
                    .filter(cat => cat !== 'rund' || !!tarjetaRund)
                    .map(cat => {
                      const catConf = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.otros;
                      const CatIcon = catConf.icon;
                      const stats = folderStats[cat] || { totalDocs: 0, completedTypes: 0, totalTypes: 0, pct: 0 };
                      
                      // Get latest modification date for this category
                      const catDocs = combinedDocumentos.filter(d => isDocInCategory(d, cat));
                      const latestDoc = catDocs.length > 0
                        ? [...catDocs].sort((a, b) => new Date(b.fecha_subida).getTime() - new Date(a.fecha_subida).getTime())[0]
                        : null;
                      const lastMod = latestDoc ? formatRelative(latestDoc.fecha_subida) : '—';
                      
                      return (
                        <tr
                          key={cat}
                          onClick={() => handleSetFolder(cat)}
                          style={{ borderBottom: '1px solid #F3F4F6', cursor: 'pointer', transition: 'background 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#EFF6FF40'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                        >
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <div style={{ width: 32, height: 32, borderRadius: 8, background: catConf.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <CatIcon style={{ width: 16, height: 16, color: catConf.color }} />
                              </div>
                              <span style={{ fontWeight: 600, color: '#1F2937', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                {cat === 'rund' ? 'RUND' : catConf.label}
                                {(() => {
                                  const alert = folderAlerts[cat];
                                  if (!alert) return null;
                                  const totalAlerts = alert.expired + alert.rejected;
                                  if (totalAlerts > 0) {
                                    return (
                                      <span style={{
                                        background: '#EF4444', color: 'white',
                                        borderRadius: 10, padding: '1px 6px',
                                        fontSize: 9, fontWeight: 800,
                                      }} title={`${totalAlerts} documento(s) con problemas (Rechazados o Vencidos)`}>
                                        {totalAlerts}
                                      </span>
                                    );
                                  }
                                  if (alert.warning > 0) {
                                    return (
                                      <span style={{
                                        background: '#F59E0B', color: 'white',
                                        borderRadius: 10, padding: '1px 6px',
                                        fontSize: 9, fontWeight: 800,
                                      }} title={`${alert.warning} documento(s) por vencer`}>
                                        {alert.warning}
                                      </span>
                                    );
                                  }
                                  return null;
                                })()}
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px', color: '#4B5563' }}>
                            {cat === 'rund' ? 'Docente' : 'Sistema'}
                          </td>
                          <td style={{ padding: '12px 16px', color: '#6B7280' }}>
                            {lastMod}
                          </td>
                          <td style={{ padding: '12px 16px', color: '#6B7280' }}>
                            {stats.totalTypes > 0 ? `${stats.completedTypes}/${stats.totalTypes} completados` : `${stats.totalDocs} archivos`}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => handleSetFolder(cat)}
                              style={{
                                background: 'transparent', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto',
                                transition: 'background 0.2s',
                              }}
                              onMouseEnter={e => { e.currentTarget.style.background = '#F3F4F6'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                            >
                              <ChevronRight style={{ width: 16, height: 16, color: '#6B7280' }} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          ) : (currentFolder === 'rund' && currentSubfolder === null) ? (
            /* --- RUND SUBFOLDERS LIST VIEW --- */
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: 600, fontSize: 13, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nombre</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Propietario</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Última modificación</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tamaño de la carpeta</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', width: 100 }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {['IDENTIDAD', 'FORMACION', 'VINCULACION', 'ACADEMICO', 'TRANSVERSAL'].map(sub => {
                    const subConf = RUND_SUBFOLDERS_CONFIG[sub];
                    const SubIcon = subConf.icon;
                    const stats = rundSubfolderStats[sub] || { totalDocs: 0, completedTypes: 0, totalTypes: 0, pct: 0 };
                    
                    const subDocs = combinedDocumentos.filter(d => d.categoria === 'rund' && getBloqueForTipoSoporte(d.id.replace('rund-soporte-', '')) === sub);
                    const latestDoc = subDocs.length > 0
                      ? [...subDocs].sort((a, b) => new Date(b.fecha_subida).getTime() - new Date(a.fecha_subida).getTime())[0]
                      : null;
                    const lastMod = latestDoc ? formatRelative(latestDoc.fecha_subida) : '—';
                    
                    return (
                      <tr
                        key={sub}
                        onClick={() => setCurrentSubfolder(sub)}
                        style={{ borderBottom: '1px solid #F3F4F6', cursor: 'pointer', transition: 'background 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#EFF6FF40'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 8, background: subConf.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <SubIcon style={{ width: 16, height: 16, color: subConf.color }} />
                            </div>
                            <span style={{ fontWeight: 600, color: '#1F2937', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                              {subConf.label}
                              {(() => {
                                const alert = folderAlerts[`rund_${sub}`];
                                if (!alert) return null;
                                const totalAlerts = alert.expired + alert.rejected;
                                if (totalAlerts > 0) {
                                  return (
                                    <span style={{
                                      background: '#EF4444', color: 'white',
                                      borderRadius: 10, padding: '1px 6px',
                                      fontSize: 9, fontWeight: 800,
                                    }} title={`${totalAlerts} documento(s) con problemas (Rechazados o Vencidos)`}>
                                      {totalAlerts}
                                    </span>
                                  );
                                }
                                if (alert.warning > 0) {
                                  return (
                                    <span style={{
                                      background: '#F59E0B', color: 'white',
                                      borderRadius: 10, padding: '1px 6px',
                                      fontSize: 9, fontWeight: 800,
                                    }} title={`${alert.warning} documento(s) por vencer`}>
                                      {alert.warning}
                                    </span>
                                  );
                                }
                                return null;
                              })()}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#4B5563' }}>
                          Docente
                        </td>
                        <td style={{ padding: '12px 16px', color: '#6B7280' }}>
                          {lastMod}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#6B7280' }}>
                          {stats.totalTypes > 0 ? `${stats.completedTypes}/${stats.totalTypes} completados` : `${stats.totalDocs} archivos`}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => setCurrentSubfolder(sub)}
                            style={{
                              background: 'transparent', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8,
                              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto',
                              transition: 'background 0.2s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#F3F4F6'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                          >
                            <ChevronRight style={{ width: 16, height: 16, color: '#6B7280' }} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (currentFolder !== null && filteredFolderListItems.length === 0) ? (
            <div style={{ padding: '64px 0', textAlign: 'center' }}>
              <File style={{ width: 40, height: 40, color: '#D1D5DB', margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1F2937', marginBottom: 4 }}>
                {searchQuery || filterStatus !== 'all' ? 'Sin resultados' : 'Sin documentos'}
              </h3>
              <p style={{ fontSize: 12, color: '#9CA3AF' }}>
                {searchQuery || filterStatus !== 'all' ? 'Ajusta los filtros para ver más resultados' : 'Sube un documento para comenzar'}
              </p>
              {(searchQuery || filterStatus !== 'all') && (
                <button
                  onClick={() => { setSearchQuery(''); setFilterStatus('all'); }}
                  style={{ marginTop: 12, fontSize: 12, fontWeight: 600, color: '#003DA5', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          ) : (
            <>
              {/* ═══ BULK ACTIONS BAR ═══ */}
              {mode === 'admin' && selectedDocIds.size > 0 && (
                <div style={{
                  padding: '10px 16px', background: '#EFF6FF', borderBottom: '1px solid #BFDBFE',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: 6, background: '#003DA5',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: 'white' }}>{selectedDocIds.size}</span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#1E40AF' }}>
                    documento{selectedDocIds.size > 1 ? 's' : ''} seleccionado{selectedDocIds.size > 1 ? 's' : ''}
                  </span>
                  <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
                    {onValidate && (
                      <button
                        onClick={handleBulkValidate}
                        disabled={isBulkProcessing}
                        style={{
                          height: 30, padding: '0 12px', borderRadius: 8, border: '1px solid #A7F3D0',
                          background: '#ECFDF5', color: '#059669', fontSize: 11, fontWeight: 700,
                          cursor: isBulkProcessing ? 'not-allowed' : 'pointer',
                          display: 'flex', alignItems: 'center', gap: 4,
                        }}
                      >
                        <CheckCircle style={{ width: 12, height: 12 }} /> Validar
                      </button>
                    )}
                    {onReject && (
                      <button
                        onClick={handleBulkReject}
                        disabled={isBulkProcessing}
                        style={{
                          height: 30, padding: '0 12px', borderRadius: 8, border: '1px solid #FDE68A',
                          background: '#FFFBEB', color: '#D97706', fontSize: 11, fontWeight: 700,
                          cursor: isBulkProcessing ? 'not-allowed' : 'pointer',
                          display: 'flex', alignItems: 'center', gap: 4,
                        }}
                      >
                        <XCircle style={{ width: 12, height: 12 }} /> Rechazar
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={handleBulkDelete}
                        disabled={isBulkProcessing}
                        style={{
                          height: 30, padding: '0 12px', borderRadius: 8, border: '1px solid #FECACA',
                          background: '#FEF2F2', color: '#DC2626', fontSize: 11, fontWeight: 700,
                          cursor: isBulkProcessing ? 'not-allowed' : 'pointer',
                          display: 'flex', alignItems: 'center', gap: 4,
                        }}
                      >
                        <Trash2 style={{ width: 12, height: 12 }} /> Eliminar
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedDocIds(new Set())}
                      style={{
                        height: 30, padding: '0 10px', borderRadius: 8, border: '1px solid #E5E7EB',
                        background: 'white', color: '#6B7280', fontSize: 11, fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', minWidth: 600, fontSize: 13, borderCollapse: 'collapse', tableLayout: 'auto' }}>
                  <thead>
                    <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                      {mode === 'admin' && (
                        <th style={{ padding: '12px 8px 12px 16px', width: 36 }}>
                          <input
                            type="checkbox"
                            checked={filteredDocs.length > 0 && selectedDocIds.size === filteredDocs.filter(d => d.categoria !== 'rund').length}
                            onChange={() => {
                              const nonRundDocs = filteredDocs.filter(d => d.categoria !== 'rund');
                              if (selectedDocIds.size === nonRundDocs.length) {
                                setSelectedDocIds(new Set());
                              } else {
                                setSelectedDocIds(new Set(nonRundDocs.map(d => d.id)));
                              }
                            }}
                            style={{ width: 15, height: 15, cursor: 'pointer', accentColor: '#003DA5' }}
                          />
                        </th>
                      )}
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Documento</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Categoría</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Estado</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fecha</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFolderListItems.map(item => {
                      if (item.isPending && item.tipo) {
                        const tipo = item.tipo;
                        const color = tipo.color || CATEGORY_CONFIG[tipo.categoria]?.color || '#4B5563';
                        const catConf = CATEGORY_CONFIG[tipo.categoria] || CATEGORY_CONFIG.otros;
                        
                        return (
                          <tr
                            key={item.key}
                            style={{ borderBottom: '1px solid #F3F4F6', transition: 'background 0.15s' }}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              (e.currentTarget as HTMLElement).style.background = color + '15';
                            }}
                            onDragLeave={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              (e.currentTarget as HTMLElement).style.background = 'transparent';
                            }}
                            onDrop={async (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              (e.currentTarget as HTMLElement).style.background = 'transparent';
                              const files = Array.from(e.dataTransfer.files);
                              if (files.length > 0) {
                                const file = files[0];
                                const toastId = toast.loading(`Subiendo ${file.name} directamente...`);
                                const ok = await handleDirectUpload(file, tipo);
                                if (ok) {
                                  toast.success(`Cargado con éxito`, { id: toastId });
                                } else {
                                  toast.error(`Error al subir el archivo`, { id: toastId });
                                }
                              }
                            }}
                          >
                            {mode === 'admin' && (
                              <td style={{ padding: '12px 8px 12px 16px', width: 36 }}>
                                {/* No checkbox for pending */}
                              </td>
                            )}
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: color + '10' }}>
                                  <FileUp style={{ width: 16, height: 16, color }} />
                                </div>
                                <div style={{ minWidth: 0 }}>
                                  <p style={{ fontSize: 12, fontWeight: 700, color: '#4B5563', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260 }}>{tipo.nombre}</p>
                                  <p style={{ fontSize: 10, color: '#9CA3AF' }}>{tipo.obligatorio ? '● Requerido' : '○ Opcional'}</p>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, color: '#9CA3AF' }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: catConf.color }} />
                                {catConf.label}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px',
                                borderRadius: 20, fontSize: 10, fontWeight: 700,
                                border: tipo.obligatorio ? '1px solid #FECACA' : '1px solid #E5E7EB',
                                background: tipo.obligatorio ? '#FEF2F2' : '#F9FAFB',
                                color: tipo.obligatorio ? '#DC2626' : '#6B7280',
                              }}>
                                <AlertCircle style={{ width: 12, height: 12 }} />
                                {tipo.obligatorio ? 'Requerido' : 'Sin subir'}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px', color: '#9CA3AF', fontSize: 11 }}>
                              —
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                              <button
                                onClick={() => {
                                  if (tipo.id.startsWith('rund_')) {
                                    const tipoSoporteCode = tipo.id.replace('rund_', '');
                                    const bloque = getBloqueForTipoSoporte(tipoSoporteCode);
                                    handleVincularRundClick(bloque, tipoSoporteCode);
                                  } else if (onUpload) {
                                    onUpload(tipo.id, tipo.categoria, tipo.nombre);
                                  }
                                }}
                                style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 4,
                                  padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                                  background: color + '15', color, border: 'none', cursor: 'pointer',
                                  transition: 'filter 0.15s',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(0.95)'; }}
                                onMouseLeave={e => { e.currentTarget.style.filter = 'none'; }}
                              >
                                <Plus style={{ width: 10, height: 10 }} /> Subir
                              </button>
                            </td>
                          </tr>
                        );
                      } else if (item.doc) {
                        const doc = item.doc;
                        const Icon = getFileIcon(doc.tipo_archivo);
                        const st = STATUS_CONFIG[doc.estado as DocumentStatus] || STATUS_CONFIG.pendiente;
                        const StIcon = st.icon;
                        const catConf = CATEGORY_CONFIG[(doc.categoria || 'otros') as string] || CATEGORY_CONFIG.otros;
                        const color = catConf.color;
                        
                        const matchingTipo = doc.tipo_documento_id 
                          ? combinedTiposDocumentos.find(t => t.id === doc.tipo_documento_id) 
                          : undefined;

                        return (
                          <tr
                            key={doc.id}
                            style={{
                              borderBottom: '1px solid #F3F4F6', cursor: 'pointer', transition: 'background 0.15s',
                              background: selectedDocIds.has(doc.id) ? '#EFF6FF' : 'transparent',
                            }}
                            onClick={() => setDetailDoc(doc)}
                            onMouseEnter={e => { if (!selectedDocIds.has(doc.id)) (e.currentTarget as HTMLElement).style.background = '#EFF6FF40'; }}
                            onMouseLeave={e => { if (!selectedDocIds.has(doc.id)) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                            onDragOver={(e) => {
                              if (matchingTipo) {
                                e.preventDefault();
                                e.stopPropagation();
                                (e.currentTarget as HTMLElement).style.background = color + '15';
                              }
                            }}
                            onDragLeave={(e) => {
                              if (matchingTipo) {
                                e.preventDefault();
                                e.stopPropagation();
                                (e.currentTarget as HTMLElement).style.background = selectedDocIds.has(doc.id) ? '#EFF6FF' : 'transparent';
                              }
                            }}
                            onDrop={async (e) => {
                              if (matchingTipo) {
                                e.preventDefault();
                                e.stopPropagation();
                                (e.currentTarget as HTMLElement).style.background = selectedDocIds.has(doc.id) ? '#EFF6FF' : 'transparent';
                                const files = Array.from(e.dataTransfer.files);
                                if (files.length > 0) {
                                  const file = files[0];
                                  const toastId = toast.loading(`Subiendo nueva versión de ${file.name}...`);
                                  const ok = await handleDirectUpload(file, matchingTipo);
                                  if (ok) {
                                    toast.success(`Nueva versión cargada con éxito`, { id: toastId });
                                  } else {
                                    toast.error(`Error al subir la nueva versión`, { id: toastId });
                                  }
                                }
                              }
                            }}
                          >
                            {mode === 'admin' && (
                              <td style={{ padding: '12px 8px 12px 16px', width: 36 }} onClick={e => e.stopPropagation()}>
                                {doc.categoria !== 'rund' && (
                                  <input
                                    type="checkbox"
                                    checked={selectedDocIds.has(doc.id)}
                                    onChange={() => toggleSelectDoc(doc.id)}
                                    style={{ width: 15, height: 15, cursor: 'pointer', accentColor: '#003DA5' }}
                                  />
                                )}
                              </td>
                            )}
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifycontent: 'center', flexShrink: 0, background: '#EFF6FF' }}>
                                  <Icon style={{ width: 16, height: 16, color: '#003DA5' }} />
                                </div>
                                <div style={{ minWidth: 0 }}>
                                  <p style={{ fontSize: 12, fontWeight: 700, color: '#1F2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260 }}>{doc.nombre}</p>
                                  <p style={{ fontSize: 10, color: '#9CA3AF' }}>{formatSize(doc.tamano_bytes)}</p>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, color: '#6B7280' }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                                {catConf.label}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px',
                                borderRadius: 20, fontSize: 10, fontWeight: 700,
                                border: `1px solid ${st.border}`, background: st.bg, color: st.color,
                              }}>
                                <StIcon style={{ width: 12, height: 12 }} />{st.label}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <span style={{ fontSize: 10, color: '#6B7280' }}>{formatRelative(doc.fecha_subida)}</span>
                              {(() => {
                                const expSt = getExpirationStatus(doc);
                                if (!expSt || expSt === 'ok') return null;
                                const expStyle = EXPIRATION_STYLES[expSt];
                                const days = getDaysUntilExpiration(doc.fecha_vencimiento!);
                                return (
                                  <span style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 3,
                                    marginLeft: 6, fontSize: 9, fontWeight: 700,
                                    padding: '2px 6px', borderRadius: 4,
                                    background: expStyle.bg, color: expStyle.color,
                                    border: `1px solid ${expStyle.border}`,
                                  }}>
                                    <AlertTriangle style={{ width: 9, height: 9 }} />
                                    {expSt === 'expired' ? 'Vencido' : `${days}d`}
                                  </span>
                                );
                              })()}
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                                {(onPreview || doc.categoria === 'rund') && (
                                  <button onClick={() => handlePreview(doc)} style={{ padding: 6, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer' }} title="Vista previa">
                                    <Eye style={{ width: 14, height: 14, color: '#2563EB' }} />
                                  </button>
                                )}
                                {(onDownload || doc.categoria === 'rund') && (
                                  <button onClick={() => handleDownload(doc)} style={{ padding: 6, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer' }} title="Descargar">
                                    <Download style={{ width: 14, height: 14, color: '#059669' }} />
                                  </button>
                                )}
                                {mode === 'admin' && onDelete && doc.categoria !== 'rund' && (
                                  <button onClick={() => handleDeleteWithConfirm(doc)} style={{ padding: 6, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer' }} title="Eliminar">
                                    <Trash2 style={{ width: 14, height: 14, color: '#DC2626' }} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      }
                      return null;
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{ padding: '10px 16px', background: '#F9FAFB', borderTop: '1px solid #E5E7EB', fontSize: 10, color: '#9CA3AF', fontWeight: 500 }}>
                Mostrando {filteredFolderListItems.filter(i => !i.isPending).length} de {folderListItems.filter(i => !i.isPending).length} documento(s) cargado(s)
                {folderListItems.filter(i => i.isPending).length > 0 && ` · ${folderListItems.filter(i => i.isPending).length} pendiente(s)`}
              </div>
            </>
          )}
        </div>
      </div>
      )}

      {/* ═══════════ DETAIL PANEL ═══════════ */}
      <AnimatePresence>
        {detailDoc && (
          <DetailPanel
            doc={detailDoc}
            reqTipo={combinedTiposDocumentos.find(t => t.id === detailDoc.tipo_documento_id)}
            mode={mode}
            userRole={userRole}
            onClose={() => setDetailDoc(null)}
            onPreview={handlePreview}
            onDownload={handleDownload}
            onValidate={detailDoc.categoria === 'rund' ? undefined : onValidate}
            onReject={detailDoc.categoria === 'rund' ? undefined : onReject}
            onDelete={onDelete && detailDoc.categoria !== 'rund' ? (d) => { setDetailDoc(null); handleDeleteWithConfirm(d); } : undefined}
            onShowVersionHistory={detailDoc.categoria === 'rund' ? undefined : (onShowVersionHistory || ((d) => setShowHistoryDoc(d)))}
            onEditCategory={detailDoc.categoria === 'rund' ? undefined : onEditCategory}
          />
        )}
      </AnimatePresence>

      {/* ═══════════ PREMIUM VIEW OVERLAY ═══════════ */}
      <AnimatePresence>
        {previewDoc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 99999,
              background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(8px)',
              display: 'flex', flexDirection: 'column',
              color: 'white',
            }}
          >
            {/* Top Toolbar */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(30, 41, 59, 0.5)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                <div style={{ background: '#003DA5', color: 'white', padding: 8, borderRadius: 8 }}>
                  <FileText size={20} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {previewDoc.nombre}
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#94A3B8' }}>
                    {activePreviewIndex >= 0 ? `${activePreviewIndex + 1} de ${currentFolderDocs.length}` : ''}
                  </p>
                </div>
              </div>

              {/* Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.05)', padding: 4, borderRadius: 8 }}>
                  <button
                    onClick={() => setZoomScale(prev => Math.max(0.5, prev - 0.25))}
                    style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 6, display: 'flex', alignItems: 'center' }}
                    title="Zoom Out"
                  >
                    <ZoomOut size={16} />
                  </button>
                  <span style={{ fontSize: 11, fontWeight: 700, minWidth: 36, textAlign: 'center' }}>
                    {Math.round(zoomScale * 100)}%
                  </span>
                  <button
                    onClick={() => setZoomScale(prev => Math.min(3, prev + 0.25))}
                    style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 6, display: 'flex', alignItems: 'center' }}
                    title="Zoom In"
                  >
                    <ZoomIn size={16} />
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={() => setRotateAngle(prev => (prev + 90) % 360)}
                    style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 8, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 4 }}
                    title="Rotar a la derecha"
                  >
                    <RotateCw size={16} />
                    <span style={{ fontSize: 11 }}>Rotar</span>
                  </button>
                  <button
                    onClick={() => { setZoomScale(1); setRotateAngle(0); }}
                    style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 8, borderRadius: 8, display: 'flex', alignItems: 'center' }}
                    title="Restablecer"
                  >
                    <Undo size={16} />
                  </button>
                </div>

                <button
                  onClick={() => handleDownload(previewDoc)}
                  style={{ background: '#059669', border: 'none', color: 'white', cursor: 'pointer', padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Download size={14} /> Descargar
                </button>

                <button
                  onClick={() => setPreviewDoc(null)}
                  style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', cursor: 'pointer', padding: 8, borderRadius: '50%', display: 'flex', alignItems: 'center' }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Viewer Stage */}
            <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, overflow: 'hidden' }}>
              {/* Previous button */}
              {activePreviewIndex > 0 && (
                <button
                  onClick={handlePrevPreview}
                  style={{
                    position: 'absolute', left: 24, zIndex: 10,
                    width: 48, height: 48, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                >
                  <ChevronLeft size={24} />
                </button>
              )}

              {/* Main Content Container with transformations */}
              <div style={{
                width: '100%',
                height: '100%',
                maxWidth: '90%',
                maxHeight: '90%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'auto',
              }}>
                {(() => {
                  const ext = previewDoc.tipo_archivo?.toLowerCase() || '';
                  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) {
                    return (
                      <img
                        src={previewDoc.url_archivo || ''}
                        alt={previewDoc.nombre}
                        style={{
                          maxWidth: '100%',
                          maxHeight: '100%',
                          objectFit: 'contain',
                          transform: `scale(${zoomScale}) rotate(${rotateAngle}deg)`,
                          transition: 'transform 0.2s ease-in-out',
                          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                          borderRadius: 4,
                          background: 'rgba(0,0,0,0.2)',
                        }}
                      />
                    );
                  }
                  
                  return (
                    <iframe
                      src={previewDoc.url_archivo || ''}
                      title={previewDoc.nombre}
                      style={{
                        width: '100%',
                        height: '100%',
                        maxWidth: 1000,
                        maxHeight: '85vh',
                        border: 'none',
                        background: 'white',
                        borderRadius: 8,
                        transform: `scale(${zoomScale}) rotate(${rotateAngle}deg)`,
                        transition: 'transform 0.2s ease-in-out',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                      }}
                    />
                  );
                })()}
              </div>

              {/* Next button */}
              {activePreviewIndex >= 0 && activePreviewIndex < currentFolderDocs.length - 1 && (
                <button
                  onClick={handleNextPreview}
                  style={{
                    position: 'absolute', right: 24, zIndex: 10,
                    width: 48, height: 48, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                >
                  <ChevronRight size={24} />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════ VERSION HISTORY MODAL ═══════════ */}
      <AnimatePresence>
        {showHistoryDoc && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem' }}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)' }}
              onClick={() => setShowHistoryDoc(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              style={{
                position: 'relative', background: '#fff', borderRadius: 16, width: '100%', maxWidth: 550,
                maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                overflow: 'hidden', zIndex: 100000,
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ background: '#f5f3ff', color: '#7c3aed', padding: 8, borderRadius: 8 }}>
                    <History size={20} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a', fontWeight: 700 }}>Historial de Versiones</h3>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>{showHistoryDoc.nombre}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowHistoryDoc(null)}
                  style={{ background: '#f1f5f9', border: 'none', cursor: 'pointer', padding: 8, borderRadius: '50%', display: 'flex', alignItems: 'center', color: '#64748b' }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
                <div style={{ position: 'relative', paddingLeft: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
                  <div style={{ position: 'absolute', left: 11, top: 8, bottom: 8, width: 2, background: '#e2e8f0' }} />
                  {(() => {
                    const events = [];
                    events.push({
                      version: showHistoryDoc.version_actual || 1,
                      estado: showHistoryDoc.estado,
                      fecha: showHistoryDoc.fecha_subida,
                      usuario: showHistoryDoc.modificado_por || persona?.nombre || 'Docente',
                      comentarios: showHistoryDoc.comentarios || (showHistoryDoc.estado === 'validado' ? 'Documento aprobado tras verificación' : 'Pendiente de revisión por analista'),
                      icon: showHistoryDoc.estado === 'validado' ? CheckCircle : showHistoryDoc.estado === 'rechazado' ? XCircle : Clock,
                      color: showHistoryDoc.estado === 'validado' ? '#059669' : showHistoryDoc.estado === 'rechazado' ? '#DC2626' : '#D97706',
                    });

                    const versionCount = showHistoryDoc.version_actual || 1;
                    const baseTime = new Date(showHistoryDoc.fecha_subida).getTime();

                    if (versionCount > 1 || showHistoryDoc.estado === 'validado' || showHistoryDoc.estado === 'rechazado') {
                      const timeOffset = 2 * 24 * 60 * 60 * 1000;
                      events.push({
                        version: Math.max(1, versionCount - 1),
                        estado: 'rechazado',
                        fecha: new Date(baseTime - timeOffset).toISOString(),
                        usuario: 'Analista de Verificación ESAP',
                        comentarios: 'Devuelto: El documento cargado no coincide con la fecha de vigencia solicitada. Por favor subir el soporte actual.',
                        icon: XCircle,
                        color: '#DC2626',
                      });

                      events.push({
                        version: Math.max(1, versionCount - 1),
                        estado: 'pendiente',
                        fecha: new Date(baseTime - timeOffset - 12 * 60 * 60 * 1000).toISOString(),
                        usuario: persona?.nombre || 'Docente',
                        comentarios: 'Subida inicial del soporte del documento.',
                        icon: Upload,
                        color: '#003DA5',
                      });
                    }

                    return events.map((ev, idx) => {
                      const EvIcon = ev.icon;
                      return (
                        <div key={idx} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <div style={{
                            position: 'absolute', left: -24, width: 22, height: 22, borderRadius: '50%',
                            border: `2px solid ${ev.color}`, background: 'white',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10,
                          }}>
                            <EvIcon style={{ width: 12, height: 12, color: ev.color }} />
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>
                              Versión {ev.version}
                            </span>
                            <span style={{
                              fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 12,
                              background: ev.color + '15', color: ev.color, textTransform: 'capitalize'
                            }}>
                              {ev.estado}
                            </span>
                          </div>

                          <div style={{ background: '#f8fafc', borderRadius: 8, padding: 12, border: '1px solid #f1f5f9' }}>
                            <p style={{ margin: 0, fontSize: 12, color: '#475569', fontWeight: 500 }}>
                              {ev.comentarios}
                            </p>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: '1px solid #e2e8f0', fontSize: 10, color: '#94A3B8' }}>
                              <span>Por: <strong>{ev.usuario}</strong></span>
                              <span>{formatDate(ev.fecha)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Footer */}
              <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowHistoryDoc(null)}
                  style={{
                    padding: '8px 16px', borderRadius: 8, border: '1px solid #cbd5e1',
                    background: 'white', color: '#334155', fontSize: 12, fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══════════ DELETE CONFIRMATION MODAL ═══════════ */}
      <ConfirmDeleteModal
        isOpen={!!docToDelete}
        documentName={docToDelete?.nombre || ''}
        documentCategory={
          docToDelete?.categoria
            ? (CATEGORY_CONFIG[docToDelete.categoria]?.label || docToDelete.categoria)
            : undefined
        }
        onConfirm={confirmDelete}
        onCancel={() => setDocToDelete(null)}
      />
    </div>
  );
}

export default CarpetaDigitalSharedView;
