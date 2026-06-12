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

import React, { useState, useMemo, useCallback, useRef, Fragment } from 'react';
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
  FileUp, CircleCheck, CircleAlert, CircleX, Layers
} from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

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
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CATEGORY_CONFIG: Record<string, {
  label: string; color: string; bgLight: string; borderColor: string; icon: React.ElementType;
}> = {
  personal:       { label: 'Personal',       color: '#2962FF', bgLight: '#EFF6FF', borderColor: '#BFDBFE', icon: User },
  academico:      { label: 'Académico',      color: '#059669', bgLight: '#ECFDF5', borderColor: '#A7F3D0', icon: Award },
  certificados:   { label: 'Certificados',   color: '#7C3AED', bgLight: '#F5F3FF', borderColor: '#DDD6FE', icon: Shield },
  laboral:        { label: 'Laboral',        color: '#D97706', bgLight: '#FFFBEB', borderColor: '#FDE68A', icon: Briefcase },
  administrativo: { label: 'Administrativo', color: '#DC2626', bgLight: '#FEF2F2', borderColor: '#FECACA', icon: FolderOpen },
  otros:          { label: 'Otros',          color: '#4B5563', bgLight: '#F9FAFB', borderColor: '#E5E7EB', icon: Layers },
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

function TipoDocCard({ tipo, docs, onUpload, onSelectDoc }: {
  tipo: TipoDocumentoRequerido;
  docs: CarpetaDocumento[];
  onUpload?: (tipoDocumentoId?: string, categoria?: string, tipoNombre?: string) => void;
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
// MAIN COMPONENT
// ============================================================================

export function CarpetaDigitalSharedView({
  persona,
  documentos,
  tiposDocumentos,
  isLoading,
  mode,
  userRole,
  onBack,
  onUpload,
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
    documentos.filter(d => selectedDocIds.has(d.id)),
    [documentos, selectedDocIds]
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
    documentos.forEach(d => {
      const st = getExpirationStatus(d);
      if (st === 'expired') expired++;
      else if (st === 'warning') warning++;
    });
    return { expired, warning };
  }, [documentos]);

  // ========== METRICS ==========
  const metrics = useMemo(() => {
    const total = documentos.length;
    const validados = documentos.filter(d => d.estado === 'validado').length;
    const pendientes = documentos.filter(d => d.estado === 'pendiente').length;
    const rechazados = documentos.filter(d => d.estado === 'rechazado').length;
    return { total, validados, pendientes, rechazados };
  }, [documentos]);

  // ========== GROUPED TIPOS ==========
  const groupedTipos = useMemo(() => {
    const groups: Record<string, TipoDocumentoRequerido[]> = {};
    tiposDocumentos.forEach(t => {
      const cat = t.categoria || 'otros';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(t);
    });
    const ordered = ['personal', 'academico', 'laboral', 'certificados', 'administrativo', 'otros'];
    const result: [string, TipoDocumentoRequerido[]][] = [];
    ordered.forEach(cat => { if (groups[cat]) result.push([cat, groups[cat]]); });
    Object.keys(groups).forEach(cat => { if (!ordered.includes(cat)) result.push([cat, groups[cat]]); });
    return result;
  }, [tiposDocumentos]);

  // ========== FILTERED DOCS (list view) ==========
  const filteredDocs = useMemo(() => {
    let result = [...documentos];
    if (filterStatus !== 'all') result = result.filter(d => d.estado === filterStatus);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(d => (d.nombre || '').toLowerCase().includes(q) || (d.categoria || '').includes(q));
    }
    return result.sort((a, b) => new Date(b.fecha_subida).getTime() - new Date(a.fecha_subida).getTime());
  }, [documentos, filterStatus, searchQuery]);

  // ========== HELPERS ==========
  const getDocsForTipo = (tipo: TipoDocumentoRequerido): CarpetaDocumento[] => {
    if (tipo.documento) return [tipo.documento];
    const tipoNombre = normalizeDocumentText(tipo.nombre);
    return documentos.filter(d => {
      if (d.tipo_documento_id && d.tipo_documento_id === tipo.id) return true;
      if (d.tipo_documento_id) return false;
      const docNombre = normalizeDocumentText(d.nombre);
      return !!tipoNombre && !!docNombre && (docNombre.includes(tipoNombre) || tipoNombre.includes(docNombre));
    });
  };

  const checklistMetrics = useMemo(() => {
    const totalTipos = tiposDocumentos.length;
    if (totalTipos === 0) {
      return {
        totalTipos: 0, totalCompletados: 0, pctGeneral: documentos.length > 0 ? 100 : 0,
        tiposValidados: 0, tiposPendientes: 0, tiposRechazados: 0, tiposSinDoc: 0,
        obligatoriosFaltantes: 0,
      };
    }

    let tiposValidados = 0;
    let tiposPendientes = 0;
    let tiposRechazados = 0;
    let tiposSinDoc = 0;
    let obligatoriosFaltantes = 0;

    tiposDocumentos.forEach(tipo => {
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
    const pctGeneral = Math.round((totalCompletados / totalTipos) * 100);

    return {
      totalTipos, totalCompletados, pctGeneral,
      tiposValidados, tiposPendientes, tiposRechazados, tiposSinDoc,
      obligatoriosFaltantes,
    };
  }, [tiposDocumentos, documentos]);

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
      {onBack && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#6B7280', marginBottom: 16 }}>
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
            Carpeta Digital
          </button>
          <ChevronRight style={{ width: 12, height: 12, color: '#D1D5DB' }} />
          <span style={{ fontWeight: 600, color: '#1F2937' }}>{persona.nombre}</span>
        </div>
      )}

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
                    ? `${checklistMetrics.totalCompletados}/${checklistMetrics.totalTipos} subidos`
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
                onClick={onRefresh}
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
          {groupedTipos.length === 0 && documentos.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 py-16 text-center shadow-sm">
              <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-4">
                <FolderOpen className="w-8 h-8 text-gray-300" />
              </div>
              <h3 className="text-[16px] font-bold text-gray-900 mb-1">Carpeta sin documentos</h3>
              <p className="text-[13px] text-gray-400 max-w-md mx-auto px-4">
                {mode === 'admin'
                  ? 'Configure los tipos de documentos requeridos y suba los archivos correspondientes.'
                  : 'Sube tu primer documento o espera a que el área administrativa cargue tus archivos.'
                }
              </p>
              {onUpload && (
                <button
                  onClick={() => onUpload()}
                  className="mt-5 min-h-[44px] px-6 rounded-xl border-none bg-[#003DA5] text-white text-[14px] font-bold cursor-pointer inline-flex items-center gap-2 transition-colors hover:bg-[#002D7A]"
                >
                  <Upload className="w-5 h-5" /> Subir primer documento
                </button>
              )}
            </div>
          ) : groupedTipos.length === 0 && documentos.length > 0 ? (
            /* Has docs but no tipos configured */
            <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-gray-400" />
                  <h3 className="text-[15px] font-bold text-gray-700 m-0">Documentos subidos</h3>
                </div>
                {mode === 'admin' && (
                  <span className="sm:ml-auto text-[11px] sm:text-[10px] font-semibold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200 flex items-center w-fit">
                    <Info className="w-3.5 h-3.5 mr-1.5" />Configure tipos para mejor organización
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {documentos.map(doc => {
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
                      {onEditCategory && tiposDocumentos.length > 0 && (
                        <button
                          onClick={e => { e.stopPropagation(); onEditCategory(doc); }}
                          className="mt-3 w-full min-h-[36px] px-3 rounded-lg text-[12px] font-bold border border-gray-200 bg-gray-50 cursor-pointer flex items-center justify-center gap-1.5 transition-colors hover:bg-gray-100"
                          style={{ color: mode === 'portal' ? '#003DA5' : '#6B7280' }}
                        >
                          <Tag className="w-4 h-4" />
                          {mode === 'portal' ? 'Vincular a tipo requerido' : 'Reclasificar documento'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Grouped by category */
            groupedTipos.map(([cat, tipos]) => {
              const catConf = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.otros;
              const CatIcon = catConf.icon;
              const isCollapsed = collapsedCats.has(cat);
              const completedInCat = tipos.filter(t => t.completado).length;

              return (
                <div key={cat} className="bg-white rounded-xl border overflow-hidden shadow-sm" style={{ borderColor: catConf.borderColor }}>
                  {/* Category Header */}
                  <button
                    onClick={() => toggleCollapse(cat)}
                    className="w-full min-h-[56px] px-4 sm:px-5 flex items-center gap-3 sm:gap-4 border-none cursor-pointer text-left transition-colors hover:brightness-95"
                    style={{ background: catConf.bgLight + '80' }}
                  >
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: catConf.color + '15' }}>
                      <CatIcon className="w-5 h-5" style={{ color: catConf.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[15px] font-bold text-gray-900 m-0 truncate">{catConf.label}</h3>
                    </div>
                    <span className="text-[13px] font-bold px-3 py-1 rounded-full whitespace-nowrap" style={{
                      background: completedInCat === tipos.length && tipos.length > 0 ? '#ECFDF5' : catConf.bgLight,
                      color: completedInCat === tipos.length && tipos.length > 0 ? '#059669' : catConf.color,
                    }}>
                      {completedInCat}/{tipos.length}
                    </span>
                    <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : 'rotate-0'}`} />
                  </button>

                  {/* Cards Grid */}
                  <AnimatePresence>
                    {!isCollapsed && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                          {tipos.map(tipo => (
                            <TipoDocCard
                              key={tipo.id}
                              tipo={tipo}
                              docs={getDocsForTipo(tipo)}
                              onUpload={onUpload}
                              onSelectDoc={d => setDetailDoc(d)}
                            />
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}

          {/* Uncategorized docs */}
          {(() => {
            const matchedDocIds = new Set<string>();
            tiposDocumentos.forEach(tipo => {
              getDocsForTipo(tipo).forEach(d => matchedDocIds.add(d.id));
            });
            const unmatched = documentos.filter(d => !matchedDocIds.has(d.id));
            if (unmatched.length === 0) return null;

            return (
              <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', background: '#F9FAFB', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid #E5E7EB' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <File style={{ width: 16, height: 16, color: '#6B7280' }} />
                  </div>
                  <h3 style={{ flex: 1, fontSize: 13, fontWeight: 700, color: '#1F2937', margin: 0 }}>Otros documentos</h3>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', background: '#F3F4F6', padding: '4px 10px', borderRadius: 20 }}>{unmatched.length}</span>
                </div>
                <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 8 }}>
                  {unmatched.map(doc => {
                    const Icon = getFileIcon(doc.tipo_archivo);
                    const st = STATUS_CONFIG[doc.estado as DocumentStatus] || STATUS_CONFIG.pendiente;
                    const StIcon = st.icon;
                    return (
                      <div key={doc.id} style={{ padding: 12, borderRadius: 12, border: '1px solid #E5E7EB', transition: 'all 0.15s' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }} onClick={() => setDetailDoc(doc)}>
                          <div style={{ position: 'relative', flexShrink: 0 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F3F4F6' }}>
                              <Icon style={{ width: 20, height: 20, color: '#6B7280' }} />
                            </div>
                            <div style={{
                              position: 'absolute', bottom: -4, right: -4, width: 20, height: 20, borderRadius: '50%',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              border: '2px solid white', background: st.bg,
                            }}>
                              <StIcon style={{ width: 12, height: 12, color: st.color }} />
                            </div>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 12, fontWeight: 700, color: '#1F2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.nombre}</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, fontSize: 10, color: '#9CA3AF' }}>
                              <span>{formatRelative(doc.fecha_subida)}</span>
                              <span>{formatSize(doc.tamano_bytes)}</span>
                            </div>
                          </div>
                        </div>
                        {onEditCategory && tiposDocumentos.length > 0 && (
                          <button
                            onClick={e => { e.stopPropagation(); onEditCategory(doc); }}
                            style={{
                              marginTop: 8, width: '100%', padding: '6px 10px', borderRadius: 8,
                              fontSize: 10, fontWeight: 700, border: '1px solid #E5E7EB', background: '#F9FAFB',
                              color: mode === 'portal' ? '#003DA5' : '#6B7280', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                            }}
                          >
                            <Tag style={{ width: 12, height: 12 }} />
                            {mode === 'portal' ? 'Vincular a tipo requerido' : 'Reclasificar documento'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          VIEW: LISTA
          ═══════════════════════════════════════════════════════════════ */}
      {viewMode === 'lista' && (
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
          {filteredDocs.length === 0 ? (
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
                            checked={filteredDocs.length > 0 && selectedDocIds.size === filteredDocs.length}
                            onChange={() => {
                              if (selectedDocIds.size === filteredDocs.length) {
                                setSelectedDocIds(new Set());
                              } else {
                                setSelectedDocIds(new Set(filteredDocs.map(d => d.id)));
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
                    {filteredDocs.map(doc => {
                      const Icon = getFileIcon(doc.tipo_archivo);
                      const st = STATUS_CONFIG[doc.estado as DocumentStatus] || STATUS_CONFIG.pendiente;
                      const StIcon = st.icon;
                      const catConf = CATEGORY_CONFIG[(doc.categoria || 'otros') as string] || CATEGORY_CONFIG.otros;

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
                        >
                          {mode === 'admin' && (
                            <td style={{ padding: '12px 8px 12px 16px', width: 36 }} onClick={e => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={selectedDocIds.has(doc.id)}
                                onChange={() => toggleSelectDoc(doc.id)}
                                style={{ width: 15, height: 15, cursor: 'pointer', accentColor: '#003DA5' }}
                              />
                            </td>
                          )}
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <div style={{ width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: '#EFF6FF' }}>
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
                              <div style={{ width: 8, height: 8, borderRadius: '50%', background: catConf.color }} />
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
                              {onPreview && (
                                <button onClick={() => onPreview(doc)} style={{ padding: 6, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer' }} title="Vista previa">
                                  <Eye style={{ width: 14, height: 14, color: '#2563EB' }} />
                                </button>
                              )}
                              {onDownload && (
                                <button onClick={() => onDownload(doc)} style={{ padding: 6, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer' }} title="Descargar">
                                  <Download style={{ width: 14, height: 14, color: '#059669' }} />
                                </button>
                              )}
                              {mode === 'admin' && onDelete && (
                                <button onClick={() => handleDeleteWithConfirm(doc)} style={{ padding: 6, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer' }} title="Eliminar">
                                  <Trash2 style={{ width: 14, height: 14, color: '#DC2626' }} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{ padding: '10px 16px', background: '#F9FAFB', borderTop: '1px solid #E5E7EB', fontSize: 10, color: '#9CA3AF', fontWeight: 500 }}>
                Mostrando {filteredDocs.length} de {documentos.length} documento(s)
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══════════ DETAIL PANEL ═══════════ */}
      <AnimatePresence>
        {detailDoc && (
          <DetailPanel
            doc={detailDoc}
            reqTipo={tiposDocumentos.find(t => t.id === detailDoc.tipo_documento_id)}
            mode={mode}
            userRole={userRole}
            onClose={() => setDetailDoc(null)}
            onPreview={onPreview}
            onDownload={onDownload}
            onValidate={onValidate}
            onReject={onReject}
            onDelete={onDelete ? (d) => { setDetailDoc(null); handleDeleteWithConfirm(d); } : undefined}
            onShowVersionHistory={onShowVersionHistory}
            onEditCategory={onEditCategory}
          />
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
