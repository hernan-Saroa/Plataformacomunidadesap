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
  UploadCloud,
  Link2,
  Paperclip,
} from 'lucide-react';
import { toast } from 'sonner';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import './RundDocumentManager.css';
import { apiClient } from '../../../../../shell/src/services/api';
import type { RundEvidenceOption } from '../../../utils/rundEvidenceData';
import { rundActorName } from '../../../utils/rundActorName';
import { RUND_BLOCK_LABELS, rundDocumentBlock } from '../../../utils/rundDocumentScope';
import { RUND_MAX_EVIDENCES_PER_TYPE, rundEvidenceGroup } from '../../../utils/rundEvidenceRules';

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
  creadoPorNombre?: string;
  creadoEn?: string;
  /** When the evidence joined its checkpoint; kept across replacements. */
  soporteCreadoEn?: string | null;
  contenidoUrl: string | null;
  contenidoRestringido?: boolean;
  soporteGestion?: boolean;
};

type Props = {
  docenteId: string;
  canManage: boolean;
  allowedSupportTypes?: string[];
  revision?: number;
  activeBlock?: string;
  activeBlockLabel?: string;
  evidenceOptions?: RundEvidenceOption[];
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

const evidenceCategory = (block: string, type: string) => {
  if (block === 'IDENTIDAD') return 'IDENTIDAD';
  if (block === 'FORMACION') return 'TITULOS';
  if (type.includes('contrato')) return 'CONTRATOS';
  if (type.includes('certif') || type.includes('evaluacion')) return 'CERTIFICADOS';
  if (type.includes('resolucion') || type.includes('acto_')) return 'RESOLUCIONES';
  if (type.includes('autorizacion') || type.includes('habeas')) return 'AUTORIZACIONES';
  return 'OTROS';
};

export function RundDocumentManager({ docenteId, canManage, allowedSupportTypes, onView, onChanged, revision = 0, evidenceOptions = [], activeBlock, activeBlockLabel }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [documents, setDocuments] = useState<RundProfileDocument[]>([]);
  const [category, setCategory] = useState('');
  const [evidenceType, setEvidenceType] = useState('');
  const [uploadMode, setUploadMode] = useState<'support' | 'attachment'>('support');
  const restrictedSupportTypes = allowedSupportTypes?.join('|');
  useEffect(() => {
    if (restrictedSupportTypes) setUploadMode('support');
  }, [restrictedSupportTypes]);
  const [filterCategory, setFilterCategory] = useState('TODAS');
  const [search, setSearch] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const loadRequest = useRef(0);
  const [expanded, setExpanded] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [description, setDescription] = useState('');
  const [history, setHistory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [configuration, setConfiguration] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ docenteId: string; document: RundProfileDocument } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleteLock = useRef(false);
  const deleteTrigger = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    setDeleteTarget(null);
    setDeleteError(null);
    deleteTrigger.current = null;
  }, [docenteId, canManage, activeBlock, uploadMode]);

  useEffect(() => {
    let active = true;
    setConfiguration(null);
    if (canManage) apiClient.get<any>('/pta/api/v1/pta/banco-docentes/documentos/configuracion')
      .then(response => { if (active) setConfiguration(response?.data ?? response); })
      .catch(() => { if (active) setConfiguration(null); });
    return () => { active = false; };
  }, [canManage, docenteId]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = 0;
  }, [search, filterCategory, history, docenteId, activeBlock, uploadMode]);

  const scopedOptions = evidenceOptions.filter(option => (!activeBlock || option.block === activeBlock)
    && (!allowedSupportTypes || allowedSupportTypes.includes(option.type)));
  const selectedEvidence = scopedOptions.length === 1 ? scopedOptions[0] : scopedOptions.find(option => option.type === evidenceType);
  const uploadCategory = uploadMode === 'support' && selectedEvidence
    ? evidenceCategory(selectedEvidence.block, selectedEvidence.type) : category;
  const selectedCategory = categories.find(item => item.codigo === uploadCategory);
  // A checkpoint can hold several current evidences; numbering follows the order they were added.
  const checkpointEvidences = (type?: string) => documents
    .filter(document => document.estado === 'ACTIVO' && !!document.tipoSoporte && rundEvidenceGroup(type).includes(document.tipoSoporte))
    .sort((a, b) => new Date(a.soporteCreadoEn || a.creadoEn || 0).getTime() - new Date(b.soporteCreadoEn || b.creadoEn || 0).getTime() || a.id.localeCompare(b.id));
  const selectedEvidenceCount = uploadMode === 'support' && selectedEvidence ? checkpointEvidences(selectedEvidence.type).length : 0;
  const evidenceLimitReached = selectedEvidenceCount >= RUND_MAX_EVIDENCES_PER_TYPE;
  const uploadReady = canManage && !!selectedCategory && (uploadMode === 'attachment' ? !allowedSupportTypes : !!selectedEvidence && !evidenceLimitReached);
  const canManageDocument = (document: RundProfileDocument) => canManage && (!allowedSupportTypes
    || allowedSupportTypes.includes(document.tipoSoporte || ''));
  const defaultCategory = categories.find(item => item.codigo === 'OTROS')?.codigo || categories[0]?.codigo || '';

  const changeUploadMode = (mode: 'support' | 'attachment') => {
    if (allowedSupportTypes && mode === 'attachment') return;
    if (mode === uploadMode) return;
    setUploadMode(mode);
    setEvidenceType('');
    setDescription('');
    setCategory(defaultCategory);
  };

  useEffect(() => {
    setEvidenceType('');
    setDescription('');
    setUploadMode('support');
    setCategory(defaultCategory);
  }, [docenteId, activeBlock, defaultCategory]);

  useEffect(() => {
    if (evidenceType && !scopedOptions.some(option => option.type === evidenceType)) {
      setEvidenceType('');
      setDescription('');
    }
  }, [evidenceType, scopedOptions]);

  useEffect(() => {
    setDescription('');
  }, [selectedEvidence?.block, selectedEvidence?.type]);

  useEffect(() => {
    setSearch('');
    setFilterCategory('TODAS');
  }, [activeBlock, uploadMode]);

  const sectionLabel = activeBlockLabel || RUND_BLOCK_LABELS[activeBlock || ''] || 'esta sección';
  const currentDocuments = history ? documents : documents.filter(document => document.estado === 'ACTIVO');
  const generalDocuments = currentDocuments.filter(document => !rundDocumentBlock(document));
  const sectionDocuments = currentDocuments.filter(document => rundDocumentBlock(document) === activeBlock);
  const scopedDocuments = !activeBlock ? currentDocuments : uploadMode === 'attachment' ? generalDocuments : sectionDocuments;
  const title = !activeBlock ? 'Documentos del perfil' : uploadMode === 'attachment' ? 'Anexos generales' : `Documentos de ${sectionLabel}`;

  const filterOptions = useMemo(() => {
    const counts = new Map<string, { codigo: string; nombre: string; count: number }>();
    for (const document of scopedDocuments) {
      const item = counts.get(document.categoria);
      if (item) item.count++;
      else counts.set(document.categoria, {
        codigo: document.categoria,
        nombre: categories.find(category => category.codigo === document.categoria)?.nombre || document.categoriaNombre || document.categoria,
        count: 1,
      });
    }
    return [...counts.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [scopedDocuments, categories]);
  const effectiveFilter = filterOptions.length > 1 && filterOptions.some(item => item.codigo === filterCategory) ? filterCategory : 'TODAS';

  useEffect(() => {
    if (loading) return;
    setFilterCategory(effectiveFilter);
  }, [loading, effectiveFilter]);

  const visibleDocuments = useMemo(() => {
    const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const query = normalize(search.trim());
    return scopedDocuments.filter(document => (effectiveFilter === 'TODAS' || document.categoria === effectiveFilter)
      && (!query || normalize([document.nombreArchivo, document.descripcion, document.categoriaNombre].filter(Boolean).join(' ')).includes(query)));
  }, [scopedDocuments, effectiveFilter, search]);

  useEffect(() => {
    setSearch('');
    setFilterCategory('TODAS');
    setShowUpload(false);
    setExpanded(true);
  }, [docenteId]);

  const load = useCallback(async () => {
    if (!docenteId) return;
    const request = ++loadRequest.current;
    setLoading(true);
    try {
      const [categoryResponse, documentResponse] = await Promise.all([
        apiClient.get<any>('/pta/api/v1/pta/banco-docentes/documentos/categorias'),
        apiClient.get<any>(`/pta/api/v1/pta/banco-docentes/${docenteId}/documentos?historial=${history}`),
      ]);
      if (request !== loadRequest.current) return;
      const nextCategories = unwrapList<Category>(categoryResponse);
      setCategories(nextCategories);
      setCategory(current => nextCategories.some(item => item.codigo === current) ? current : nextCategories.find(item => item.codigo === 'OTROS')?.codigo || nextCategories[0]?.codigo || '');
      const nextDocuments = unwrapList<RundProfileDocument>(documentResponse);
      setDocuments(nextDocuments);
      if (nextDocuments.length === 0) setSearch('');
    } catch (error: any) {
      if (request === loadRequest.current) toast.error(error?.message || 'No fue posible consultar los documentos del perfil.');
    } finally {
      if (request === loadRequest.current) setLoading(false);
    }
  }, [docenteId, history]);

  useEffect(() => {
    load();
    return () => { loadRequest.current++; };
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
    if (busy || !canManage || allowedSupportTypes && uploadMode === 'attachment') return;
    if (uploadMode === 'support' && (!selectedEvidence || !selectedCategory)) {
      toast.error('Registre primero el dato correspondiente o seleccione otro punto de control.');
      return;
    }
    if (!selectedCategory) { toast.error('Seleccione una categoría disponible para el anexo.'); return; }
    const maxBytes = Number(selectedCategory?.tamano_maximo_bytes || 10 * 1024 * 1024);
    if (!validateClientFile(file, maxBytes)) return;
    setBusy('upload');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('categoria', uploadCategory);
      const evidence = uploadMode === 'support' ? selectedEvidence : undefined;
      if (evidence) {
        formData.append('bloque', evidence.block);
        formData.append('tipoSoporte', evidence.type);
        formData.append('modo', 'agregar');
      }
      formData.append('descripcion', description.trim());
      await apiClient.upload(`/pta/api/v1/pta/banco-docentes/${docenteId}/documentos`, formData);
      toast.success('Documento PDF cargado y vinculado al perfil.');
      setDescription('');
      await load();
      await onChanged?.();
      window.dispatchEvent(new CustomEvent('rund:soporte-uploaded', { detail: { docenteId, categoria: uploadCategory } }));
    } catch (error: any) {
      toast.error(error?.message || 'No fue posible cargar el documento.');
    } finally {
      setBusy(null);
    }
  };

  const canReplaceEvidence = (type?: string) => {
    if (allowedSupportTypes && !allowedSupportTypes.includes(type || '')) return false;
    if (!type || ['autorizacion_habeas_data', 'soporte_edicion_perfil', 'soporte_cambio_estado_perfil'].includes(type)) return true;
    const canonicalType = ['pasaporte', 'cedula_extranjeria'].includes(type)
      ? 'documento_identidad' : type.replace(/^acta_grado_/, 'diploma_');
    return evidenceOptions.some(option => option.type === canonicalType);
  };

  const replace = async (document: RundProfileDocument, file: File) => {
    if (!canManageDocument(document)) return;
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

  const remove = async () => {
    if (!deleteTarget || deleteLock.current || busy || !canManage || deleteTarget.docenteId !== docenteId) return;
    const document = documents.find(item => item.id === deleteTarget.document.id);
    if (document && !canManageDocument(document)) return;
    if (!document || document.estado !== 'ACTIVO' || document.soporteGestion) return;
    deleteLock.current = true;
    setDeleting(true);
    setDeleteError(null);
    let removed = false;
    try {
      await apiClient.delete(`/pta/api/v1/pta/banco-docentes/${docenteId}/documentos/${document.id}`);
      removed = true;
      deleteTrigger.current = null;
      setDeleteTarget(null);
      toast.success('Documento eliminado del perfil.');
      await load();
      await onChanged?.();
      window.dispatchEvent(new CustomEvent('rund:soporte-uploaded', { detail: { docenteId, accion: 'DOCUMENTO_ACTUALIZADO' } }));
    } catch (error: any) {
      if (removed) toast.error('El documento se eliminó, pero no fue posible actualizar toda la vista. Pulsa Actualizar.');
      else setDeleteError(error?.message || 'No fue posible eliminar el documento. Puedes reintentar.');
    } finally {
      deleteLock.current = false;
      setDeleting(false);
    }
  };

  return (
    <section className="rund-documents" aria-label="Documentos del perfil">
      <div className="rund-documents__header">
        <div className="rund-documents__heading">
          <span className="rund-documents__folder"><FileText size={20} aria-hidden="true" /></span>
          <div>
            <h3 className="rund-documents__title">{title} <span className="rund-documents__count">{scopedDocuments.filter(item => item.estado === 'ACTIVO').length}</span></h3>
            <p className="rund-documents__subtitle">{!activeBlock ? 'Archivos de todas las secciones del docente.'
              : uploadMode === 'attachment' ? 'Archivos complementarios del perfil, sin sección asignada.' : 'Archivos vinculados a la pestaña seleccionada.'}</p>
          </div>
        </div>
        <div className="rund-documents__header-actions">
          {canManage && configuration?.habilitado === true && <button type="button" disabled={busy === 'expediente'} style={secondaryButton(false)} onClick={async () => {
            setBusy('expediente');
            try {
              await apiClient.post(`/pta/api/v1/pta/banco-docentes/${docenteId}/expediente`, {});
              toast.success('Expediente preparado con las carpetas de identidad, formación, experiencia, actos administrativos y evaluaciones.');
            } catch (error: any) {
              toast.error(error?.message || 'No fue posible preparar el expediente. Puede reintentar.');
            } finally { setBusy(null); }
          }}>{busy === 'expediente' ? 'Preparando…' : 'Preparar expediente'}</button>}
          {canManage && <button type="button" onClick={() => { setShowUpload(value => expanded ? !value : true); setExpanded(true); }} aria-expanded={showUpload && expanded} style={secondaryButton(showUpload)}>
            <FilePlus2 size={15} /> {showUpload && expanded ? 'Cerrar carga' : 'Agregar documento'}
          </button>}
          <button type="button" className="rund-documents__collapse" aria-label={expanded ? 'Contraer documentos' : 'Expandir documentos'} aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>
            <ChevronDown size={18} style={{ transform: expanded ? 'rotate(180deg)' : undefined }} aria-hidden="true" />
          </button>
        </div>
      </div>

      {expanded && <>
        {canManage && configuration?.habilitado === true && <p role="status" style={{ color: '#64748B', fontSize: 12 }}>
          {configuration.unavailable ? 'No se pudo consultar la configuración documental.'
            : configuration.proveedor && <>
              {configuration.almacenamientoProvisional ? 'Almacenamiento provisional local.' : 'Repositorio documental OpenKM seleccionado.'}
              {!configuration.escrituraConfigurada && ' La carga requiere completar la configuración.'}
              {configuration.trd?.estado !== 'CONFIGURADA' && ' TRD pendiente de configuración o revisión.'}
              {configuration.privacidad !== 'CONFIGURADA' && ' Política institucional de tratamiento pendiente.'}
            </>}
        </p>}
        {activeBlock && !showUpload && (generalDocuments.length > 0 || uploadMode === 'attachment') && <div className="rund-documents__scopes" role="group" aria-label="Vista de documentos">
          <button type="button" aria-pressed={uploadMode === 'support'} onClick={() => changeUploadMode('support')}>
            <Link2 size={14} />{sectionLabel} ({sectionDocuments.length})
          </button>
          {!allowedSupportTypes && <button type="button" aria-pressed={uploadMode === 'attachment'} onClick={() => changeUploadMode('attachment')}>
            <Paperclip size={14} />Anexos generales ({generalDocuments.length})
          </button>}
        </div>}
        {showUpload && canManage && <div className="rund-documents__upload-panel">
          <div className="rund-documents__upload-heading">
            <span className="rund-documents__upload-icon"><UploadCloud size={20}/></span>
            <h4>Agregar documento</h4>
          </div>
          <div className="rund-documents__upload-modes" role="group" aria-label="Finalidad del documento">
            <button type="button" aria-pressed={uploadMode === 'support'} onClick={() => changeUploadMode('support')}>
              <Link2 size={15}/><span>Soporte{activeBlockLabel ? ` de ${activeBlockLabel}` : ' de un dato'}</span>
            </button>
            {!allowedSupportTypes && <button type="button" aria-pressed={uploadMode === 'attachment'} onClick={() => changeUploadMode('attachment')}>
              <Paperclip size={15}/><span>Anexo general</span>
            </button>}
          </div>
          {uploadMode === 'support' ? scopedOptions.length ? <div className="rund-documents__purpose">
            {scopedOptions.length > 1 && <><label htmlFor={`evidence-purpose-${docenteId}`}>Soporte que vas a cargar</label>
            <select id={`evidence-purpose-${docenteId}`} value={selectedEvidence?.type || ''} onChange={event => { setEvidenceType(event.target.value); setDescription(''); }} style={inputStyle}>
              <option value="">Selecciona el soporte</option>
              {scopedOptions.map(option => <option key={option.type} value={option.type}>{option.label}</option>)}
            </select></>}
            {selectedEvidence ? <div className="rund-documents__destination">
              <Link2 size={17}/><div><span>Se vinculará a {activeBlockLabel || selectedEvidence.block}</span>
                <strong>{selectedEvidence.label}</strong>
                {selectedEvidence.fields?.some(field => field.value) ? <>
                  <p className="rund-documents__data-heading">Datos del perfil a revisar</p>
                  <dl className="rund-documents__supported-data">
                    {selectedEvidence.fields.filter(field => field.value).map(field => <div key={field.label}>
                      <dt>{field.label}</dt><dd>{field.value}</dd>
                    </div>)}
                  </dl>
                  {selectedEvidence.fields.length > 1 && <p className="rund-documents__shared-hint">Un solo archivo se vincula a estos datos. Cada punto se revisa por separado.</p>}
                </> : selectedEvidence.dataSummary && <p>Dato del perfil: {selectedEvidence.dataSummary}</p>}
                {selectedEvidence.hint && <p>{selectedEvidence.hint}</p>}
                {selectedEvidenceCount > 0 && <p className="rund-documents__evidence-note" role="status">
                  {evidenceLimitReached
                    ? `Este punto ya tiene ${RUND_MAX_EVIDENCES_PER_TYPE} evidencias vigentes. Reemplaza o elimina una para agregar otra.`
                    : `Este punto ya tiene ${selectedEvidenceCount} ${selectedEvidenceCount === 1 ? 'evidencia vigente' : 'evidencias vigentes'}. El archivo se agregará como evidencia adicional y se revisará por separado. Para corregir una existente, usa Reemplazar.`}
                </p>}
              </div><small>{selectedCategory?.nombre || 'Categoría no disponible'}</small>
            </div> : <p className="rund-documents__upload-hint">Elige el documento que respalda los datos registrados en esta sección. La categoría se asigna automáticamente.</p>}
          </div> : <div className="rund-documents__upload-empty" role="status">
            <strong>{activeBlock === 'CONTACTO' ? 'Contacto no requiere documentos soporte' : 'No hay datos disponibles para respaldar en esta sección'}</strong>
            <p>{activeBlock === 'CONTACTO' ? 'Los correos y teléfonos se actualizan desde Editar datos.' : 'Registra primero la información del docente en Editar datos. Después podrás vincular su soporte aquí.'}</p>
          </div> : <div className="rund-documents__purpose">
            <p className="rund-documents__upload-hint">Guarda un archivo complementario en el perfil. Los anexos generales no acreditan ni aprueban un punto de control.</p>
            <details className="rund-documents__classification">
              <summary>Clasificación opcional <span>{categories.find(item => item.codigo === category)?.nombre || 'Sin categoría disponible'}</span></summary>
              <div>
                <label htmlFor={`attachment-category-${docenteId}`}>Categoría del anexo</label>
                <select id={`attachment-category-${docenteId}`} value={category} onChange={event => setCategory(event.target.value)} style={inputStyle} aria-label="Categoría documental">
                  {categories.map(item => <option key={item.codigo} value={item.codigo}>{item.nombre}</option>)}
                </select>
              </div>
            </details>
          </div>}
          {(uploadMode === 'attachment' || selectedEvidence) && <div className="rund-documents__upload-fields">
            <label className="rund-documents__description">Descripción <span>Opcional</span>
              <input value={description} onChange={event => setDescription(event.target.value)} maxLength={1000} placeholder={uploadMode === 'support' ? `Ej. ${selectedEvidence?.label} del docente` : '¿Qué contiene este archivo?'} aria-label="Descripción del documento" style={inputStyle}/>
            </label>
            <label className="rund-documents__file-action" style={{ ...primaryButton, opacity: busy === 'upload' || !uploadReady ? 0.6 : 1, cursor: busy === 'upload' || !uploadReady ? 'wait' : 'pointer' }}>
              <UploadCloud size={16}/>{busy === 'upload' ? 'Cargando…' : 'Cargar PDF'}
              <input type="file" aria-label="Cargar PDF" accept="application/pdf,.pdf" disabled={busy === 'upload' || !uploadReady} hidden onChange={event => {
                const file = event.target.files?.[0]; if (file) upload(file); event.target.value = '';
              }}/>
            </label>
            <p className="rund-documents__upload-limit">PDF · Hasta {fileSize(Number(selectedCategory?.tamano_maximo_bytes || 10 * 1024 * 1024))} por archivo.</p>
          </div>}
        </div>}

        <div className="rund-documents__toolbar">
          {scopedDocuments.length > 0 && <label className="rund-documents__search">
            <Search size={16} aria-hidden="true" />
            <input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar archivo o descripción..." aria-label="Buscar documentos" />
          </label>}
          {filterOptions.length > 1 && <select value={effectiveFilter} onChange={event => setFilterCategory(event.target.value)} style={inputStyle} aria-label="Filtrar documentos por categoría">
            <option value="TODAS">Todas las categorías ({scopedDocuments.length})</option>
            {filterOptions.map(item => <option key={item.codigo} value={item.codigo}>{item.nombre} ({item.count})</option>)}
          </select>}
          <div className="rund-documents__toolbar-actions">
            {(search || effectiveFilter !== 'TODAS') && <button type="button" onClick={() => { setSearch(''); setFilterCategory('TODAS'); }} style={secondaryButton(false)}>Limpiar filtros</button>}
            <button type="button" onClick={() => setHistory(value => !value)} aria-pressed={history} style={secondaryButton(history)}>
              <History size={14} /> {history ? 'Ver vigentes' : 'Historial'}
            </button>
            <button type="button" onClick={load} disabled={loading} style={secondaryButton(false)} title="Actualizar documentos">
              <RefreshCw size={14} /> Actualizar
            </button>
          </div>
        </div>
        <div className="rund-documents__list-heading">
          <span>{history ? 'Archivos y versiones anteriores' : 'Archivos vigentes'}</span>
          <span role="status">{visibleDocuments.length} de {scopedDocuments.length} {history ? 'archivos y versiones' : 'documentos'}</span>
        </div>
        <div ref={listRef} className="rund-documents__list" role="region" aria-label="Lista de documentos del perfil" tabIndex={0} aria-busy={loading}>
          {loading && scopedDocuments.length === 0 ? (
            <div style={emptyStyle}>Consultando documentos…</div>
          ) : visibleDocuments.length === 0 ? (
            <div style={emptyStyle}>{scopedDocuments.length === 0 ? activeBlock
              ? uploadMode === 'attachment' ? history ? 'No hay anexos generales ni versiones anteriores.' : 'Este perfil no tiene anexos generales vigentes.'
                : history ? `No hay archivos ni versiones anteriores de ${sectionLabel}.` : `No hay documentos vigentes de ${sectionLabel}.`
              : history ? 'No hay archivos ni versiones anteriores para este perfil.' : 'Este perfil no tiene documentos vigentes. Puedes consultar el historial o agregar un documento.'
              : 'No hay documentos que coincidan con la búsqueda o categoría.'}</div>
          ) : visibleDocuments.map((document) => (
            <article key={document.id} className={`rund-documents__document${document.estado !== 'ACTIVO' ? ' rund-documents__document--archived' : ''}`}>
              <div style={{ minWidth: 0, display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: '#FEF2F2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><FileText size={17} /></div>
                <div style={{ minWidth: 0 }}>
                  <div title={document.nombreArchivo} className="rund-documents__filename">{document.nombreArchivo}</div>
                  <div style={{ marginTop: 2, fontSize: 10, color: '#64748B' }}>
                    {(() => {
                      if (document.estado !== 'ACTIVO' || !document.tipoSoporte || document.soporteGestion) return null;
                      const siblings = checkpointEvidences(document.tipoSoporte);
                      return siblings.length > 1 ? <strong className="rund-documents__evidence-number">Evidencia {siblings.findIndex(item => item.id === document.id) + 1} de {siblings.length} · </strong> : null;
                    })()}
                    {activeBlock && (RUND_BLOCK_LABELS[rundDocumentBlock(document) || ''] || 'Anexo general') !== document.categoriaNombre ? `${RUND_BLOCK_LABELS[rundDocumentBlock(document) || ''] || 'Anexo general'} · ` : ''}{document.categoriaNombre} · v{document.version} · {fileSize(document.tamanoBytes)}
                    {document.estado !== 'ACTIVO' ? ` · ${document.estado.toLowerCase()}` : ''}
                    {document.creadoEn ? ` · ${new Date(document.creadoEn).toLocaleDateString('es-CO')}` : ''}
                  </div>
                </div>
              </div>
              <div className="rund-documents__review">
                {document.estado === 'ACTIVO' && <div style={{ marginBottom: 5, color: document.estadoRevision === 'Aprobado' ? '#047857' : document.estadoRevision === 'Rechazado' ? '#B91C1C' : '#92400E', fontWeight: 700, fontSize: 11 }}>
                  {document.soporteGestion ? 'Evidencia de gestión del perfil' : document.estadoRevision === 'Aprobado' ? '✓ Soporte aprobado' : document.estadoRevision === 'Rechazado' ? 'Devuelto para corrección' : document.tipoSoporte ? 'Pendiente de revisión' : 'Anexo general'}
                </div>}
                {document.observacionRevision && <div style={{ color: '#B91C1C', fontSize: 11 }}>{document.observacionRevision}</div>}
                <details className="rund-documents__details">
                  <summary>Detalles</summary>
                  <dl>
                    <dt>Cargado por</dt><dd>{rundActorName(document.creadoPorNombre, document.creadoPor)}</dd>
                    <dt>Fecha de carga</dt><dd>{document.creadoEn ? new Date(document.creadoEn).toLocaleString('es-CO') : 'Sin fecha'}</dd>
                    {document.descripcion && <><dt>Descripción</dt><dd>{document.descripcion}</dd></>}
                  </dl>
                </details>
              </div>
              <div className="rund-documents__document-actions">
                {document.contenidoRestringido && <span style={{ fontSize: 11, color: '#64748B' }}>Original restringido</span>}
                {document.estado !== 'ELIMINADO' && document.contenidoUrl && !document.contenidoRestringido && <IconButton title="Visualizar" onClick={() => onView(document.contenidoUrl!, document.nombreArchivo, document.categoriaNombre)}><Eye size={14} /></IconButton>}
                {document.estado !== 'ELIMINADO' && document.contenidoUrl && !document.contenidoRestringido && <IconButton title="Descargar" onClick={() => download(document)} disabled={busy === `download-${document.id}`}><Download size={14} /></IconButton>}
                {canManageDocument(document) && !document.soporteGestion && document.estado === 'ACTIVO' && canReplaceEvidence(document.tipoSoporte) && (
                  <label title={`Reemplazar (PDF, máximo ${fileSize(Number(categories.find(item => item.codigo === document.categoria)?.tamano_maximo_bytes || 10 * 1024 * 1024))})`} style={iconButtonStyle}>
                    <Replace size={14} />
                    <input type="file" accept="application/pdf,.pdf" hidden disabled={busy === `replace-${document.id}`} onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) replace(document, file);
                      event.target.value = '';
                    }} />
                  </label>
                )}
                {canManageDocument(document) && !document.soporteGestion && document.estado === 'ACTIVO' && <IconButton title="Eliminar" danger onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                  deleteTrigger.current = event.currentTarget;
                  setDeleteError(null);
                  setDeleteTarget({ docenteId, document });
                }} disabled={!!busy || deleting}><Trash2 size={14} /></IconButton>}
                {document.totalVersiones > 1 && <span title={`${document.totalVersiones} versiones`} style={{ ...iconButtonStyle, cursor: 'default', color: '#7C3AED' }}><FileClock size={14} /></span>}
              </div>
            </article>
          ))}
        </div>
        {visibleDocuments.length > 4 && <p className="rund-documents__scroll-hint">Desplázate dentro de la lista para ver más archivos.</p>}
      </>}
      <AlertDialog.Root open={deleteTarget?.docenteId === docenteId && canManage} onOpenChange={open => {
        if (!open && !deleteLock.current) { setDeleteTarget(null); setDeleteError(null); }
      }}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="rund-document-delete__overlay" />
          <AlertDialog.Content className="rund-document-delete" aria-busy={deleting} onEscapeKeyDown={event => {
            if (deleteLock.current) event.preventDefault();
          }} onCloseAutoFocus={event => {
            event.preventDefault();
            const trigger = deleteTrigger.current;
            if (trigger?.isConnected) trigger.focus();
            else listRef.current?.focus();
          }}>
            <div className="rund-document-delete__icon"><Trash2 size={23} aria-hidden="true" /></div>
            <AlertDialog.Title className="rund-document-delete__title">Eliminar documento</AlertDialog.Title>
            <AlertDialog.Description className="rund-document-delete__description">
              El archivo dejará de estar disponible entre los documentos vigentes. La eliminación quedará registrada en el historial.
            </AlertDialog.Description>
            <div className="rund-document-delete__file">
              <FileText size={20} aria-hidden="true" />
              <div><strong>{deleteTarget?.document.nombreArchivo}</strong><span>{deleteTarget?.document.categoriaNombre} · Versión {deleteTarget?.document.version}</span></div>
            </div>
            {deleteError && <p role="alert" className="rund-document-delete__error">{deleteError}</p>}
            <div className="rund-document-delete__actions">
              <AlertDialog.Cancel disabled={deleting}>Cancelar</AlertDialog.Cancel>
              <AlertDialog.Action className="rund-document-delete__confirm" disabled={deleting || !!busy} onClick={event => {
                event.preventDefault();
                void remove();
              }}>{deleting ? 'Eliminando…' : 'Eliminar documento'}</AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
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
