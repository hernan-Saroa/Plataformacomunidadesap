/**
 * DocumentsWorldClassView - Vista de documentos world-class
 * Tabla avanzada con acciones inline para la Carpeta Digital Premium
 */

import React, { useState, useMemo } from 'react';
import {
  FileText, Image as ImageIcon, File, Eye, Download, Trash2,
  CheckCircle, XCircle, Clock, MoreVertical, Search,
  History, Edit3, Upload, RefreshCw, Grid3X3, List,
  ChevronDown, Filter, Tag
} from 'lucide-react';
import { Badge } from '../ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '../ui/dropdown-menu';

interface Documento {
  id: string;
  nombre: string;
  tipo?: string;
  categoria?: string;
  estado?: string;
  fecha_carga?: string;
  tamano?: number;
  version?: number;
  mime_type?: string;
  persona_nombre?: string;
  [key: string]: any;
}

interface TipoDocumento {
  id: string;
  nombre: string;
  [key: string]: any;
}

interface DocumentsWorldClassViewProps {
  documentos: Documento[];
  tiposDocumentos?: TipoDocumento[];
  isLoading?: boolean;
  onPreview?: (doc: Documento) => void;
  onDownload?: (doc: Documento) => void;
  onShowVersionHistory?: (doc: Documento) => void;
  onCreateNewVersion?: (doc: Documento) => void;
  onValidate?: (doc: Documento) => void;
  onReject?: (doc: Documento) => void;
  onDelete?: (doc: Documento) => void;
  onEditCategory?: (doc: Documento) => void;
  onUpload?: (files: File[]) => void;
  onRefresh?: () => void;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  aprobado: { label: 'Aprobado', color: '#10B981', icon: <CheckCircle size={13} /> },
  validado: { label: 'Validado', color: '#10B981', icon: <CheckCircle size={13} /> },
  pendiente: { label: 'Pendiente', color: '#F59E0B', icon: <Clock size={13} /> },
  rechazado: { label: 'Rechazado', color: '#EF4444', icon: <XCircle size={13} /> },
  cargado: { label: 'Cargado', color: '#3B82F6', icon: <Upload size={13} /> },
  archivado: { label: 'Archivado', color: '#6B7280', icon: <History size={13} /> },
};

function getFileIcon(mimeType?: string) {
  if (!mimeType) return <File size={16} />;
  if (mimeType.startsWith('image/')) return <ImageIcon size={16} />;
  if (mimeType.includes('pdf')) return <FileText size={16} style={{ color: '#EF4444' }} />;
  return <File size={16} />;
}

function formatBytes(bytes?: number) {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export function DocumentsWorldClassView({
  documentos,
  tiposDocumentos = [],
  isLoading = false,
  onPreview,
  onDownload,
  onShowVersionHistory,
  onCreateNewVersion,
  onValidate,
  onReject,
  onDelete,
  onEditCategory,
  onUpload,
  onRefresh,
}: DocumentsWorldClassViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = useMemo(() => {
    return documentos.filter(doc => {
      const matchSearch = !searchTerm ||
        doc.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.tipo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.categoria?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const st = doc.estado?.toLowerCase();
      const matchStatus = statusFilter === 'all' 
        ? st !== 'archivado' 
        : st === statusFilter;
        
      return matchSearch && matchStatus;
    });
  }, [documentos, searchTerm, statusFilter]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl p-8" style={{ border: '1px solid #E5E7EB' }}>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-center gap-4 animate-pulse">
              <div className="w-10 h-10 bg-gray-200 rounded-lg" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-1/4" />
              </div>
              <div className="h-6 bg-gray-200 rounded w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Toolbar (Sticky & Responsive) */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md pb-3 pt-2 -mx-2 px-2 rounded-xl flex flex-col gap-3" style={{ borderBottom: '1px solid rgba(229, 231, 235, 0.5)' }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="relative flex-1 max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }} />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar documentos..."
                style={{ height: 34, border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 13, paddingLeft: 32, width: '100%' }}
                className="outline-none focus:border-[#003DA5]"
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{ height: 34, border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 12, paddingLeft: 8, paddingRight: 24 }}
              className="outline-none"
            >
              <option value="all">Todos (Activos)</option>
              <option value="pendiente">Pendientes</option>
              <option value="validado">Validados</option>
              <option value="rechazado">Rechazados</option>
              <option value="archivado">Archivados (Historial)</option>
            </select>
          </div>
          <div className="flex items-center gap-1">
            {onUpload && (
              <button 
                onClick={() => onUpload([])} 
                className="hidden md:flex items-center gap-2 px-3 py-1.5 min-h-[34px] bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold tracking-wide transition-all shadow-sm mr-2"
              >
                <Upload size={14} strokeWidth={2.5} />
                Subir Archivo
              </button>
            )}
            <button onClick={() => setViewMode('table')} className="hidden md:block p-1.5 rounded" style={{ background: viewMode === 'table' ? '#E5E7EB' : 'transparent' }}>
              <List size={16} style={{ color: '#6B7280' }} />
            </button>
            <button onClick={() => setViewMode('grid')} className="hidden md:block p-1.5 rounded" style={{ background: viewMode === 'grid' ? '#E5E7EB' : 'transparent' }}>
              <Grid3X3 size={16} style={{ color: '#6B7280' }} />
            </button>
            {onRefresh && (
              <button onClick={onRefresh} className="p-1.5 rounded hover:bg-gray-100" title="Actualizar">
                <RefreshCw size={16} style={{ color: '#6B7280' }} />
              </button>
            )}
          </div>
        </div>

        {/* Segmented Control (Mobile Only) */}
        <div className="md:hidden flex p-1 bg-gray-100 rounded-lg w-full shrink-0">
          <button
            onClick={() => setViewMode('grid')}
            className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-semibold rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}
          >
            <Grid3X3 size={14} />
            Tarjetas
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-semibold rounded-md transition-all ${viewMode === 'table' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}
          >
            <List size={14} />
            Lista
          </button>
        </div>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center" style={{ border: '1px solid #E5E7EB' }}>
          <FileText size={40} className="mx-auto mb-3" style={{ color: '#D1D5DB' }} />
          <p className="text-sm font-medium" style={{ color: '#374151' }}>
            {searchTerm || statusFilter !== 'all' ? 'No se encontraron documentos con los filtros aplicados' : 'No hay documentos en esta carpeta'}
          </p>
        </div>
      ) : (
        <>
        {/* Table view (Desktop only) */}
        <div className={`bg-white rounded-xl overflow-hidden ${viewMode === 'table' ? 'hidden md:block' : 'hidden'}`} style={{ border: '1px solid #E5E7EB' }}>
          <div className="overflow-x-auto">
            <table className="w-full">
            <thead>
              <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase" style={{ color: '#6B7280' }}>Documento</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase" style={{ color: '#6B7280' }}>Tipo</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase" style={{ color: '#6B7280' }}>Estado</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase" style={{ color: '#6B7280' }}>Tamaño</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase" style={{ color: '#6B7280' }}>Fecha</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase" style={{ color: '#6B7280' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(doc => {
                const st = statusConfig[doc.estado?.toLowerCase() || ''] || statusConfig.pendiente;
                return (
                  <tr key={doc.id} className="hover:bg-gray-50 transition-colors" style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded" style={{ background: '#F3F4F6' }}>
                          {getFileIcon(doc.mime_type)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: '#111827', maxWidth: 220 }}>{doc.nombre}</p>
                          {doc.version && doc.version > 1 && (
                            <span className="text-[10px] font-medium" style={{ color: '#6B7280' }}>v{doc.version}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs" style={{ color: '#6B7280' }}>{doc.categoria || doc.tipo || '-'}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium" style={{ background: `${st.color}12`, color: st.color }}>
                        {st.icon} {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: '#6B7280' }}>{formatBytes(doc.tamano)}</td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: '#6B7280' }}>
                      {doc.fecha_carga ? new Date(doc.fecha_carga).toLocaleDateString('es-CO') : '-'}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1 rounded hover:bg-gray-100">
                            <MoreVertical size={16} style={{ color: '#6B7280' }} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          {onPreview && <DropdownMenuItem onClick={() => onPreview(doc)}><Eye size={14} className="mr-2" /> Ver</DropdownMenuItem>}
                          {onDownload && <DropdownMenuItem onClick={() => onDownload(doc)}><Download size={14} className="mr-2" /> Descargar</DropdownMenuItem>}
                          {onShowVersionHistory && <DropdownMenuItem onClick={() => onShowVersionHistory(doc)}><History size={14} className="mr-2" /> Versiones</DropdownMenuItem>}
                          {onCreateNewVersion && <DropdownMenuItem onClick={() => onCreateNewVersion(doc)}><Upload size={14} className="mr-2" /> Nueva versión</DropdownMenuItem>}
                          {onEditCategory && <DropdownMenuItem onClick={() => onEditCategory(doc)}><Tag size={14} className="mr-2" /> Editar categoría</DropdownMenuItem>}
                          <DropdownMenuSeparator />
                          {onValidate && doc.estado?.toLowerCase() === 'pendiente' && (
                            <DropdownMenuItem onClick={() => onValidate(doc)}><CheckCircle size={14} className="mr-2 text-green-600" /> Validar</DropdownMenuItem>
                          )}
                          {onReject && doc.estado?.toLowerCase() === 'pendiente' && (
                            <DropdownMenuItem onClick={() => onReject(doc)}><XCircle size={14} className="mr-2 text-red-500" /> Rechazar</DropdownMenuItem>
                          )}
                          {onDelete && doc.estado?.toLowerCase() !== 'archivado' && (
                            <DropdownMenuItem onClick={() => onDelete(doc)} className="text-red-600"><Trash2 size={14} className="mr-2" /> Eliminar</DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            </table>
          </div>
        </div>
        
        {/* Grid view (Always on Mobile, Desktop if selected) */}
        <div className={`gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 ${viewMode === 'grid' ? 'grid' : 'grid md:hidden'}`}>
          {filtered.map(doc => {
            const st = statusConfig[doc.estado?.toLowerCase() || ''] || statusConfig.pendiente;
            return (
              <div
                key={doc.id}
                className="bg-white rounded-xl p-3 hover:shadow-md transition-shadow cursor-pointer group"
                style={{ border: '1px solid #E5E7EB' }}
                onClick={() => onPreview?.(doc)}
              >
                <div className="flex items-center justify-center p-4 rounded-lg mb-2" style={{ background: '#F9FAFB' }}>
                  {getFileIcon(doc.mime_type)}
                </div>
                <p className="text-xs font-medium truncate" style={{ color: '#111827' }}>{doc.nombre}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-medium" style={{ color: st.color }}>
                    {st.icon} {st.label}
                  </span>
                  <span className="text-[10px]" style={{ color: '#9CA3AF' }}>{formatBytes(doc.tamano)}</span>
                </div>
              </div>
            );
          })}
        </div>
        </>
      )}

      {/* FAB Subir Archivo Mobile */}
      {onUpload && (
        <button
          onClick={() => onUpload([])}
          className="md:hidden fixed bottom-6 right-6 z-[90] w-14 h-14 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-blue-700 active:scale-95 transition-all"
        >
          <Upload size={24} strokeWidth={2.5} />
        </button>
      )}

      <div className="text-xs text-right" style={{ color: '#9CA3AF' }}>
        {filtered.length} de {documentos.length} documentos
      </div>
    </div>
  );
}
