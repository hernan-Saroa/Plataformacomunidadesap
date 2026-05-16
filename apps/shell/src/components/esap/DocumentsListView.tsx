/**
 * DocumentsListView - Vista de lista de documentos
 * Tabla/lista de documentos con acciones básicas
 */

import { FileText, Eye, Download, Clock, CheckCircle2, AlertTriangle, Search } from 'lucide-react';

interface Document {
  id: string;
  nombre: string;
  tipo?: string;
  estado?: string;
  fecha?: string;
  persona?: string;
  size?: string;
}

interface DocumentsListViewProps {
  documents: Document[];
  loading?: boolean;
  onView?: (doc: Document) => void;
  onDownload?: (doc: Document) => void;
  searchTerm?: string;
  emptyMessage?: string;
}

export function DocumentsListView({ 
  documents, 
  loading = false, 
  onView, 
  onDownload, 
  searchTerm = '',
  emptyMessage = 'No se encontraron documentos'
}: DocumentsListViewProps) {
  const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
    aprobado: { color: '#10B981', icon: <CheckCircle2 size={14} /> },
    pendiente: { color: '#F59E0B', icon: <Clock size={14} /> },
    rechazado: { color: '#EF4444', icon: <AlertTriangle size={14} /> },
  };

  const filtered = searchTerm
    ? documents.filter(d =>
        d.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.persona?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : documents;

  if (loading) {
    return (
      <div className="space-y-2">
        {[1,2,3,4,5].map(i => (
          <div key={i} className="bg-white rounded-lg p-4 animate-pulse flex items-center gap-4" style={{ border: '1px solid #E5E7EB' }}>
            <div className="w-10 h-10 bg-gray-200 rounded-lg" />
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="text-center py-12">
        <Search size={40} className="mx-auto mb-3" style={{ color: '#D1D5DB' }} />
        <p className="text-sm font-medium" style={{ color: '#374151' }}>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #E5E7EB' }}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px]">
        <thead>
          <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
            <th className="text-left px-4 py-3 text-xs font-semibold uppercase" style={{ color: '#6B7280' }}>Documento</th>
            <th className="text-left px-4 py-3 text-xs font-semibold uppercase" style={{ color: '#6B7280' }}>Tipo</th>
            <th className="text-left px-4 py-3 text-xs font-semibold uppercase" style={{ color: '#6B7280' }}>Estado</th>
            <th className="text-left px-4 py-3 text-xs font-semibold uppercase" style={{ color: '#6B7280' }}>Fecha</th>
            <th className="text-right px-4 py-3 text-xs font-semibold uppercase" style={{ color: '#6B7280' }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(doc => {
            const st = statusConfig[doc.estado?.toLowerCase() || ''] || statusConfig.pendiente;
            return (
              <tr key={doc.id} className="hover:bg-gray-50 transition-colors" style={{ borderBottom: '1px solid #F3F4F6' }}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg" style={{ background: '#003DA515' }}>
                      <FileText size={16} style={{ color: '#003DA5' }} />
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: '#111827' }}>{doc.nombre}</p>
                      {doc.persona && <p className="text-xs" style={{ color: '#6B7280' }}>{doc.persona}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: '#6B7280' }}>{doc.tipo || '-'}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium" style={{ background: `${st.color}15`, color: st.color }}>
                    {st.icon} {doc.estado || 'Pendiente'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: '#6B7280' }}>
                  {doc.fecha ? new Date(doc.fecha).toLocaleDateString('es-CO') : '-'}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {onView && (
                      <button onClick={() => onView(doc)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" title="Ver">
                        <Eye size={16} style={{ color: '#6B7280' }} />
                      </button>
                    )}
                    {onDownload && (
                      <button onClick={() => onDownload(doc)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" title="Descargar">
                        <Download size={16} style={{ color: '#6B7280' }} />
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
    </div>
  );
}
