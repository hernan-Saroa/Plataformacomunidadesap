import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Download,
  Eye,
  FileClock,
  FilePlus2,
  FileText,
  History,
  RefreshCw,
  Replace,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '../../../../../shell/src/services/api';

type Category = {
  codigo: string;
  nombre: string;
  descripcion?: string;
  tamano_maximo_bytes?: number | string;
};

export type RundProfileDocument = {
  id: string;
  categoria: string;
  categoriaNombre: string;
  bloque?: string;
  tipoSoporte?: string;
  descripcion?: string;
  version: number;
  totalVersiones: number;
  nombreArchivo: string;
  tamanoBytes: number;
  estado: 'ACTIVO' | 'REEMPLAZADO' | 'ELIMINADO';
  creadoPor?: string;
  creadoEn?: string;
  contenidoUrl: string;
};

type Props = {
  docenteId: string;
  canManage: boolean;
  onView: (url: string, name: string, label: string) => void;
  onChanged?: () => Promise<void> | void;
};

const unwrapList = <T,>(response: any): T[] => {
  const value = response?.data ?? response;
  return Array.isArray(value) ? value : [];
};

const fileSize = (bytes: number) => {
  if (!bytes) return 'Tamaño no disponible';
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.ceil(bytes / 1024)} KB`;
};

export function RundDocumentManager({ docenteId, canManage, onView, onChanged }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [documents, setDocuments] = useState<RundProfileDocument[]>([]);
  const [category, setCategory] = useState('');
  const [filterCategory, setFilterCategory] = useState('TODAS');
  const [description, setDescription] = useState('');
  const [history, setHistory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const selectedCategory = useMemo(
    () => categories.find((item) => item.codigo === category),
    [categories, category],
  );
  const visibleDocuments = useMemo(
    () => filterCategory === 'TODAS'
      ? documents
      : documents.filter((document) => document.categoria === filterCategory),
    [documents, filterCategory],
  );

  const load = useCallback(async () => {
    if (!docenteId) return;
    setLoading(true);
    try {
      const [categoryResponse, documentResponse] = await Promise.all([
        apiClient.get<any>('/pta/api/v1/pta/banco-docentes/documentos/categorias'),
        apiClient.get<any>(`/pta/api/v1/pta/banco-docentes/${docenteId}/documentos?historial=${history}`),
      ]);
      const nextCategories = unwrapList<Category>(categoryResponse);
      setCategories(nextCategories);
      setCategory((current) => current || nextCategories[0]?.codigo || 'OTROS');
      setDocuments(unwrapList<RundProfileDocument>(documentResponse));
    } catch (error: any) {
      toast.error(error?.message || 'No fue posible consultar los documentos del perfil.');
    } finally {
      setLoading(false);
    }
  }, [docenteId, history]);

  useEffect(() => {
    load();
  }, [load]);

  const validateClientFile = (file: File, maxBytes?: number) => {
    if (!file.name.toLowerCase().endsWith('.pdf') || file.type !== 'application/pdf') {
      toast.error('Archivo no permitido. Seleccione un PDF válido.');
      return false;
    }
    if (maxBytes && file.size > maxBytes) {
      toast.error(`El archivo supera el máximo de ${Math.floor(maxBytes / 1024 / 1024)} MB.`);
      return false;
    }
    return true;
  };

  const upload = async (file: File) => {
    const maxBytes = Number(selectedCategory?.tamano_maximo_bytes || 10 * 1024 * 1024);
    if (!validateClientFile(file, maxBytes)) return;
    setBusy('upload');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('categoria', category);
      formData.append('descripcion', description.trim());
      await apiClient.upload(`/pta/api/v1/pta/banco-docentes/${docenteId}/documentos`, formData);
      toast.success('Documento PDF cargado y vinculado al perfil.');
      setDescription('');
      await load();
      await onChanged?.();
      window.dispatchEvent(new CustomEvent('rund:soporte-uploaded', { detail: { docenteId, categoria: category } }));
    } catch (error: any) {
      toast.error(error?.message || 'No fue posible cargar el documento.');
    } finally {
      setBusy(null);
    }
  };

  const replace = async (document: RundProfileDocument, file: File) => {
    const categoryConfig = categories.find((item) => item.codigo === document.categoria);
    const maxBytes = Number(categoryConfig?.tamano_maximo_bytes || 10 * 1024 * 1024);
    if (!validateClientFile(file, maxBytes)) return;
    setBusy(`replace-${document.id}`);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (document.descripcion) formData.append('descripcion', document.descripcion);
      await apiClient.upload(
        `/pta/api/v1/pta/banco-docentes/${docenteId}/documentos/${document.id}/reemplazo`,
        formData,
      );
      toast.success(`Documento reemplazado. Se creó la versión ${document.version + 1}.`);
      await load();
      await onChanged?.();
    } catch (error: any) {
      toast.error(error?.message || 'No fue posible reemplazar el documento.');
    } finally {
      setBusy(null);
    }
  };

  const download = async (document: RundProfileDocument) => {
    setBusy(`download-${document.id}`);
    try {
      const blob = await apiClient.getBlob(`${document.contenidoUrl}?download=true`);
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = document.nombreArchivo;
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast.error(error?.message || 'No fue posible descargar el documento.');
    } finally {
      setBusy(null);
    }
  };

  const remove = async (document: RundProfileDocument) => {
    if (!window.confirm(`¿Eliminar “${document.nombreArchivo}”? Esta acción quedará registrada en la trazabilidad.`)) return;
    setBusy(`delete-${document.id}`);
    try {
      await apiClient.delete(`/pta/api/v1/pta/banco-docentes/${docenteId}/documentos/${document.id}`);
      toast.success('Documento eliminado del perfil.');
      await load();
      await onChanged?.();
    } catch (error: any) {
      toast.error(error?.message || 'No fue posible eliminar el documento.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <section style={{ padding: '18px 24px', background: '#fff', borderBottom: '1px solid #E5E7EB' }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 800, color: '#0F172A' }}>
            <FileText size={18} color="#003DA5" /> Documentos del perfil
            <span style={{ padding: '2px 8px', borderRadius: 999, background: '#EFF6FF', color: '#1D4ED8', fontSize: 11 }}>
              {documents.filter((item) => item.estado === 'ACTIVO').length}
            </span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748B' }}>
            PDFs organizados por categoría, con versión y trazabilidad de cada acción.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={filterCategory} onChange={(event) => setFilterCategory(event.target.value)} style={{ ...inputStyle, height: 32 }} aria-label="Filtrar documentos por categoría">
            <option value="TODAS">Todas las categorías</option>
            {categories.map((item) => <option key={item.codigo} value={item.codigo}>{item.nombre}</option>)}
          </select>
          <button onClick={() => setHistory((value) => !value)} style={secondaryButton(history)}>
            <History size={14} /> {history ? 'Ver vigentes' : 'Historial'}
          </button>
          <button onClick={load} disabled={loading} style={secondaryButton(false)} title="Actualizar documentos">
            <RefreshCw size={14} /> Actualizar
          </button>
        </div>
      </div>

      {canManage && (
        <div style={{ marginTop: 14, padding: 12, border: '1px solid #DBEAFE', borderRadius: 10, background: '#F8FBFF', display: 'grid', gridTemplateColumns: 'minmax(150px, 210px) minmax(220px, 1fr) auto', gap: 10 }}>
          <select value={category} onChange={(event) => setCategory(event.target.value)} style={inputStyle} aria-label="Categoría documental">
            {categories.map((item) => <option key={item.codigo} value={item.codigo}>{item.nombre}</option>)}
          </select>
          <input value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1000} placeholder="Descripción opcional del documento" style={inputStyle} />
          <label style={{ ...primaryButton, opacity: busy === 'upload' ? 0.6 : 1, cursor: busy === 'upload' ? 'wait' : 'pointer' }}>
            <FilePlus2 size={15} /> {busy === 'upload' ? 'Cargando…' : 'Cargar PDF'}
            <input type="file" accept="application/pdf,.pdf" disabled={busy === 'upload'} hidden onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) upload(file);
              event.target.value = '';
            }} />
          </label>
        </div>
      )}

      <div style={{ marginTop: 14, display: 'grid', gap: 8 }}>
        {loading ? (
          <div style={emptyStyle}>Consultando documentos…</div>
        ) : visibleDocuments.length === 0 ? (
          <div style={emptyStyle}>{documents.length === 0 ? 'Este perfil aún no tiene documentos cargados.' : 'No hay documentos en esta categoría.'}</div>
        ) : visibleDocuments.map((document) => (
          <article key={document.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 1fr) minmax(120px, 180px) auto', gap: 16, alignItems: 'center', padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: 9, background: document.estado === 'ACTIVO' ? '#fff' : '#F8FAFC', opacity: document.estado === 'ELIMINADO' ? 0.7 : 1 }}>
            <div style={{ minWidth: 0, display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: '#FEF2F2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><FileText size={17} /></div>
              <div style={{ minWidth: 0 }}>
                <div title={document.nombreArchivo} style={{ fontSize: 12, fontWeight: 750, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{document.nombreArchivo}</div>
                <div style={{ marginTop: 2, fontSize: 10, color: '#64748B' }}>
                  {document.categoriaNombre} · v{document.version} · {fileSize(document.tamanoBytes)}
                  {document.estado !== 'ACTIVO' ? ` · ${document.estado.toLowerCase()}` : ''}
                </div>
              </div>
            </div>
            <div style={{ fontSize: 10, color: '#64748B' }}>
              <div style={{ fontWeight: 700, color: '#334155' }}>{document.creadoPor || 'Sistema'}</div>
              <div>{document.creadoEn ? new Date(document.creadoEn).toLocaleString('es-CO') : 'Sin fecha'}</div>
            </div>
            <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end' }}>
              {document.estado !== 'ELIMINADO' && <IconButton title="Visualizar" onClick={() => onView(document.contenidoUrl, document.nombreArchivo, document.categoriaNombre)}><Eye size={14} /></IconButton>}
              {document.estado !== 'ELIMINADO' && <IconButton title="Descargar" onClick={() => download(document)} disabled={busy === `download-${document.id}`}><Download size={14} /></IconButton>}
              {canManage && document.estado === 'ACTIVO' && (
                <label title="Reemplazar" style={iconButtonStyle}>
                  <Replace size={14} />
                  <input type="file" accept="application/pdf,.pdf" hidden disabled={busy === `replace-${document.id}`} onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) replace(document, file);
                    event.target.value = '';
                  }} />
                </label>
              )}
              {canManage && document.estado === 'ACTIVO' && <IconButton title="Eliminar" danger onClick={() => remove(document)} disabled={busy === `delete-${document.id}`}><Trash2 size={14} /></IconButton>}
              {document.totalVersiones > 1 && <span title={`${document.totalVersiones} versiones`} style={{ ...iconButtonStyle, cursor: 'default', color: '#7C3AED' }}><FileClock size={14} /></span>}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function IconButton({ children, title, onClick, danger = false, disabled = false }: any) {
  return <button type="button" title={title} onClick={onClick} disabled={disabled} style={{ ...iconButtonStyle, color: danger ? '#DC2626' : '#475569', borderColor: danger ? '#FECACA' : '#E2E8F0', opacity: disabled ? 0.5 : 1 }}>{children}</button>;
}

const inputStyle: React.CSSProperties = { height: 36, border: '1px solid #CBD5E1', borderRadius: 7, padding: '0 10px', background: '#fff', color: '#334155', fontSize: 12, outline: 'none', minWidth: 0 };
const primaryButton: React.CSSProperties = { height: 36, padding: '0 14px', borderRadius: 7, border: 'none', background: '#003DA5', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 11, fontWeight: 750, whiteSpace: 'nowrap' };
const iconButtonStyle: React.CSSProperties = { width: 30, height: 30, border: '1px solid #E2E8F0', borderRadius: 6, background: '#fff', color: '#475569', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' };
const emptyStyle: React.CSSProperties = { padding: 18, textAlign: 'center', border: '1px dashed #CBD5E1', borderRadius: 9, color: '#64748B', fontSize: 12, background: '#F8FAFC' };
const secondaryButton = (active: boolean): React.CSSProperties => ({ height: 32, padding: '0 10px', borderRadius: 7, border: '1px solid #CBD5E1', background: active ? '#EFF6FF' : '#fff', color: active ? '#1D4ED8' : '#475569', display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, cursor: 'pointer' });
