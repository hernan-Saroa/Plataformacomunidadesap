import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  Search,
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
import './RundDocumentManager.css';
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
  estadoRevision?: string;
  observacionRevision?: string;
  creadoPor?: string;
  creadoEn?: string;
  contenidoUrl: string | null;
  contenidoRestringido?: boolean;
};

type Props = {
  docenteId: string;
  canManage: boolean;
  revision?: number;
  evidenceOptions?: { block: string; type: string; label: string }[];
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

export function RundDocumentManager({ docenteId, canManage, onView, onChanged, revision = 0, evidenceOptions = [] }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [documents, setDocuments] = useState<RundProfileDocument[]>([]);
  const [category, setCategory] = useState('');
  const [evidenceType, setEvidenceType] = useState('');
  const [filterCategory, setFilterCategory] = useState('TODAS');
  const [search, setSearch] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [description, setDescription] = useState('');
  const [history, setHistory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = 0;
  }, [search, filterCategory, history, docenteId]);

  const selectedCategory = useMemo(
    () => categories.find((item) => item.codigo === category),
    [categories, category],
  );
  const visibleDocuments = useMemo(() => {
    const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const query = normalize(search.trim());
    return documents.filter(document => (filterCategory === 'TODAS' || document.categoria === filterCategory)
      && (!query || normalize([document.nombreArchivo, document.descripcion, document.categoriaNombre].filter(Boolean).join(' ')).includes(query)));
  }, [documents, filterCategory, search]);

  useEffect(() => {
    setSearch('');
    setFilterCategory('TODAS');
    setShowUpload(false);
    setExpanded(true);
  }, [docenteId]);

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
  }, [load, revision]);

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
    if (busy) return;
    if (evidenceType && !evidenceOptions.some(option => option.type === evidenceType)) {
      toast.error('Registre primero el dato correspondiente o seleccione otro punto de control.');
      return;
    }
    const maxBytes = Number(selectedCategory?.tamano_maximo_bytes || 10 * 1024 * 1024);
    if (!validateClientFile(file, maxBytes)) return;
    setBusy('upload');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('categoria', category);
      const evidence = evidenceOptions.find(option => option.type === evidenceType);
      if (evidence) {
        formData.append('bloque', evidence.block);
        formData.append('tipoSoporte', evidence.type);
      }
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

  const canReplaceEvidence = (type?: string) => {
    if (!type || ['autorizacion_habeas_data', 'soporte_edicion_perfil', 'soporte_cambio_estado_perfil'].includes(type)) return true;
    const canonicalType = ['pasaporte', 'cedula_extranjeria'].includes(type)
      ? 'documento_identidad' : type.replace(/^acta_grado_/, 'diploma_');
    return evidenceOptions.some(option => option.type === canonicalType);
  };

  const replace = async (document: RundProfileDocument, file: File) => {
    if (!canReplaceEvidence(document.tipoSoporte)) {
      toast.error('Registre primero el dato correspondiente antes de reemplazar su soporte.');
      return;
    }
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
      window.dispatchEvent(new CustomEvent('rund:soporte-uploaded', { detail: { docenteId, accion: 'DOCUMENTO_ACTUALIZADO' } }));
    } catch (error: any) {
      toast.error(error?.message || 'No fue posible reemplazar el documento.');
    } finally {
      setBusy(null);
    }
  };

  const download = async (document: RundProfileDocument) => {
    if (!document.contenidoUrl || document.contenidoRestringido) return;
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
      window.dispatchEvent(new CustomEvent('rund:soporte-uploaded', { detail: { docenteId, accion: 'DOCUMENTO_ACTUALIZADO' } }));
    } catch (error: any) {
      toast.error(error?.message || 'No fue posible eliminar el documento.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="rund-documents" aria-label="Documentos del perfil">
      <div className="rund-documents__header">
        <div className="rund-documents__heading">
          <span className="rund-documents__folder"><FileText size={20} aria-hidden="true" /></span>
          <div>
            <h3 className="rund-documents__title">Documentos del perfil <span className="rund-documents__count">{documents.filter(item => item.estado === 'ACTIVO').length}</span></h3>
            <p className="rund-documents__subtitle">Archivos, revisiones y versiones en un solo lugar.</p>
          </div>
        </div>
        <div className="rund-documents__header-actions">
          {canManage && <button type="button" onClick={() => { setShowUpload(value => expanded ? !value : true); setExpanded(true); }} aria-expanded={showUpload && expanded} style={secondaryButton(showUpload)}>
            <FilePlus2 size={15} /> {showUpload && expanded ? 'Cerrar carga' : 'Agregar documento'}
          </button>}
          <button type="button" className="rund-documents__collapse" aria-label={expanded ? 'Contraer documentos' : 'Expandir documentos'} aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>
            <ChevronDown size={18} style={{ transform: expanded ? 'rotate(180deg)' : undefined }} aria-hidden="true" />
          </button>
        </div>
      </div>

      {expanded && <>
        <div className="rund-documents__toolbar">
          <label className="rund-documents__search">
            <Search size={16} aria-hidden="true" />
            <input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar archivo o descripción..." aria-label="Buscar documentos" />
          </label>
          <select value={filterCategory} onChange={event => setFilterCategory(event.target.value)} style={inputStyle} aria-label="Filtrar documentos por categoría">
            <option value="TODAS">Todas las categorías</option>
            {categories.map(item => <option key={item.codigo} value={item.codigo}>{item.nombre}</option>)}
          </select>
          <div className="rund-documents__toolbar-actions">
            <button type="button" onClick={() => setHistory(value => !value)} aria-pressed={history} style={secondaryButton(history)}>
              <History size={14} /> {history ? 'Ver vigentes' : 'Historial'}
            </button>
            <button type="button" onClick={load} disabled={loading} style={secondaryButton(false)} title="Actualizar documentos">
              <RefreshCw size={14} /> Actualizar
            </button>
          </div>
        </div>

        {showUpload && <div className="rund-documents__upload-panel">
        {canManage && <div style={{ marginTop: 14 }}>
          <label htmlFor={`evidence-purpose-${docenteId}`} style={{ fontSize: 12, color: '#475569', marginRight: 10 }}>Información que acredita</label>
          <select id={`evidence-purpose-${docenteId}`} value={evidenceType} onChange={e => setEvidenceType(e.target.value)} style={{ ...inputStyle, maxWidth: '100%' }}>
            <option value="">Anexo general (no acredita un punto de control)</option>
            {evidenceOptions.map(option => <option key={option.type} value={option.type}>{option.label}</option>)}
          </select>
        </div>}
        {canManage && (
          <div className="rund-documents__upload-fields">
            <select value={category} onChange={(event) => setCategory(event.target.value)} style={inputStyle} aria-label="Categoría documental">
              {categories.map((item) => <option key={item.codigo} value={item.codigo}>{item.nombre}</option>)}
            </select>
            <input value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1000} placeholder="Descripción opcional del documento" aria-label="Descripción del documento" style={inputStyle} />
            <label style={{ ...primaryButton, opacity: busy === 'upload' ? 0.6 : 1, cursor: busy === 'upload' ? 'wait' : 'pointer' }}>
              <FilePlus2 size={15} /> {busy === 'upload' ? 'Cargando…' : 'Cargar PDF'}
              <input type="file" accept="application/pdf,.pdf" disabled={busy === 'upload'} hidden onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) upload(file);
                event.target.value = '';
              }} />
            </label>
            <span style={{ gridColumn: '1 / -1', color: '#64748B', fontSize: 11 }}>
              Formato permitido: PDF · Máximo {fileSize(Number(selectedCategory?.tamano_maximo_bytes || 10 * 1024 * 1024))} por archivo.
            </span>
          </div>
        )}

        </div>}

        <div className="rund-documents__list-heading">
          <span>{history ? 'Archivos y versiones anteriores' : 'Archivos vigentes'}</span>
          <span role="status">{visibleDocuments.length} de {documents.length} {history ? 'archivos y versiones' : 'documentos'}</span>
        </div>
        <div ref={listRef} className="rund-documents__list" role="region" aria-label="Lista de documentos del perfil" tabIndex={0} aria-busy={loading}>
          {loading && documents.length === 0 ? (
            <div style={emptyStyle}>Consultando documentos…</div>
          ) : visibleDocuments.length === 0 ? (
            <div style={emptyStyle}>{documents.length === 0 ? 'Este perfil aún no tiene documentos cargados.' : 'No hay documentos que coincidan con la búsqueda o categoría.'}</div>
          ) : visibleDocuments.map((document) => (
            <article key={document.id} className={`rund-documents__document${document.estado !== 'ACTIVO' ? ' rund-documents__document--archived' : ''}`}>
              <div style={{ minWidth: 0, display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: '#FEF2F2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><FileText size={17} /></div>
                <div style={{ minWidth: 0 }}>
                  <div title={document.nombreArchivo} className="rund-documents__filename">{document.nombreArchivo}</div>
                  <div style={{ marginTop: 2, fontSize: 10, color: '#64748B' }}>
                    {document.categoriaNombre} · v{document.version} · {fileSize(document.tamanoBytes)}
                    {document.estado !== 'ACTIVO' ? ` · ${document.estado.toLowerCase()}` : ''}
                    {document.creadoEn ? ` · ${new Date(document.creadoEn).toLocaleDateString('es-CO')}` : ''}
                  </div>
                </div>
              </div>
              <div className="rund-documents__review">
                {document.estado === 'ACTIVO' && <div style={{ marginBottom: 5, color: document.estadoRevision === 'Aprobado' ? '#047857' : document.estadoRevision === 'Rechazado' ? '#B91C1C' : '#92400E', fontWeight: 700, fontSize: 11 }}>
                  {document.estadoRevision === 'Aprobado' ? '✓ Soporte aprobado' : document.estadoRevision === 'Rechazado' ? 'Devuelto para corrección' : document.tipoSoporte ? 'Pendiente de revisión' : 'Anexo general'}
                </div>}
                {document.observacionRevision && <div style={{ color: '#B91C1C', fontSize: 11 }}>{document.observacionRevision}</div>}
                <details className="rund-documents__details">
                  <summary>Detalles</summary>
                  <dl>
                    <dt>Cargado por</dt><dd>{document.creadoPor || 'Sistema'}</dd>
                    <dt>Fecha de carga</dt><dd>{document.creadoEn ? new Date(document.creadoEn).toLocaleString('es-CO') : 'Sin fecha'}</dd>
                    {document.descripcion && <><dt>Descripción</dt><dd>{document.descripcion}</dd></>}
                  </dl>
                </details>
              </div>
              <div className="rund-documents__document-actions">
                {document.contenidoRestringido && <span style={{ fontSize: 11, color: '#64748B' }}>Original restringido</span>}
                {document.estado !== 'ELIMINADO' && document.contenidoUrl && !document.contenidoRestringido && <IconButton title="Visualizar" onClick={() => onView(document.contenidoUrl!, document.nombreArchivo, document.categoriaNombre)}><Eye size={14} /></IconButton>}
                {document.estado !== 'ELIMINADO' && document.contenidoUrl && !document.contenidoRestringido && <IconButton title="Descargar" onClick={() => download(document)} disabled={busy === `download-${document.id}`}><Download size={14} /></IconButton>}
                {canManage && document.estado === 'ACTIVO' && canReplaceEvidence(document.tipoSoporte) && (
                  <label title={`Reemplazar (PDF, máximo ${fileSize(Number(categories.find(item => item.codigo === document.categoria)?.tamano_maximo_bytes || 10 * 1024 * 1024))})`} style={iconButtonStyle}>
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
        {visibleDocuments.length > 4 && <p className="rund-documents__scroll-hint">Desplázate dentro de la lista para ver más archivos.</p>}
      </>}
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
