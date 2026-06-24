/**
 * Carpeta Digital - Portal Transaccional
 * 
 * Vista UNIFICADA de la Carpeta Digital del usuario, usando el componente
 * compartido CarpetaDigitalSharedView para garantizar coherencia visual
 * con el Backoffice Administrativo.
 * 
 * 100% inline styles, con adaptador compatible con la arquitectura MFE actual.
 * 
 * @version 2.0.0 - Unificación con diseño compartido
 * @date 2026-03-09
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Upload, X, Loader2, FileCheck, CheckSquare
} from 'lucide-react';
import { colors } from '../../esap/shared/designTokens';
import {
  getCarpetaDigitalPortal,
  uploadDocumentoCarpetaDigital,
  getChecklistForPersona,
  getTiposDocumentos,
  getDocumentosByCarpeta,
  reclassifyDocumento,
} from '../portalApi';
import { toast } from 'sonner';

import {
  CarpetaDigitalSharedView,
  type CarpetaDocumento,
  type TipoDocumentoRequerido,
  type PersonaInfo,
} from '../../shared/CarpetaDigitalSharedView';
import { useDocumentActions } from '../../../hooks/useDocumentActions';

interface MisDocumentosProps {
  personaId: string;
  userName?: string;
  onBack: () => void;
}

const CARPETAS = ['Documentos Laborales', 'Documentos Académicos', 'Evaluaciones', 'Declaraciones', 'Certificados Externos', 'Mis Documentos'];
const CATEGORIAS_UPLOAD = ['General', 'Vinculación', 'Formación', 'Evaluaciones', 'Declaraciones', 'Certificados'];

const normalizeDocumentText = (value: unknown): string =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export function MisDocumentos({ personaId, userName, onBack }: MisDocumentosProps) {
  const syncedPersonaId = personaId;

  const [documentos, setDocumentos] = useState<CarpetaDocumento[]>([]);
  const [tiposDocumentos, setTiposDocumentos] = useState<TipoDocumentoRequerido[]>([]);
  const [persona, setPersona] = useState<PersonaInfo>({ nombre: userName || 'Carpeta Digital' });
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload form state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCategoria, setUploadCategoria] = useState('General');
  const [uploadCarpeta, setUploadCarpeta] = useState('Mis Documentos');
  const [uploadDescripcion, setUploadDescripcion] = useState('');
  const [uploadTipoDocId, setUploadTipoDocId] = useState<string | undefined>(undefined);
  const [uploadTipoNombre, setUploadTipoNombre] = useState<string | undefined>(undefined);

  // Reclassification state
  const [reclassifyDoc, setReclassifyDoc] = useState<CarpetaDocumento | null>(null);
  const [reclassifyTipoId, setReclassifyTipoId] = useState('');
  const [reclassifying, setReclassifying] = useState(false);

  // Signed URL actions for preview/download fallback
  const { handlePreview: signedPreview, handleDownload: signedDownload } = useDocumentActions({});

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getCarpetaDigitalPortal(personaId);
      if (res?.success) {
        // Map portal documents to shared format
        const rawDocs = Array.isArray(res.data?.documentos) ? res.data.documentos : [];
        let mappedDocs: CarpetaDocumento[] = rawDocs.map((d: any) => ({
          id: d.id || crypto.randomUUID(),
          carpeta_id: d.carpeta_id || '',
          nombre: d.nombre || d.name || 'Documento',
          categoria: mapCategoria(d.categoria || d.category || 'otros'),
          tipo_archivo: d.tipo || d.type || 'PDF',
          tamano_bytes: parseTamano(d.tamano || d.size || '0'),
          estado: mapEstado(d.estado || d.status || 'Vigente'),
          fecha_subida: d.fechaCarga || d.fecha_subida || new Date().toISOString(),
          fecha_validacion: d.fecha_validacion,
          version_actual: d.version_actual || 1,
          validado_por: d.validado_por,
          comentarios: d.comentarios,
          tipo_documento_id: d.tipo_documento_id,
          url_archivo: d.url,
        }));
        const syncedPersonaId = personaId;

        if (mappedDocs.length === 0) {
          const localDocs = await getDocumentosByCarpeta(`carpeta:${syncedPersonaId}`);
          mappedDocs = Array.isArray(localDocs.data) ? localDocs.data : [];
        }
        setDocumentos(mappedDocs);

        // Extract persona info from response
        if (res.data?.persona) {
          setPersona({
            nombre: res.data.persona.nombre || res.data.persona.nombre_completo || 'Usuario',
            email: res.data.persona.email,
            numeroDocumento: res.data.persona.numero_documento,
          });
        } else if (res.data?.carpeta) {
          setPersona({
            nombre: res.data.carpeta.nombre_carpeta || 'Usuario',
            email: res.data.carpeta.email_propietario,
            numeroDocumento: res.data.carpeta.numero_documento,
          });
        }
      } else {
        setDocumentos([]);
      }
    } catch (err) {
      console.error('[CarpetaDigital] Error cargando documentos:', err);
      toast.error('Error al cargar documentos de la carpeta digital');
      setDocumentos([]);
    } finally {
      setLoading(false);
    }
  }, [personaId]);

  // Load tipos de documentos — persona-specific checklist first, then fallback to global
  const loadTiposDocumentos = useCallback(async () => {
    try {
      let tiposRaw: any[] = [];

      // 1. Try persona-specific checklist
      const syncedPersonaId = personaId;

      try {
        const checklistResult = await getChecklistForPersona(syncedPersonaId);
        const checklistTipos = checklistResult?.data?.tiposDocumentos;
        if (
          checklistResult?.success &&
          checklistResult.data &&
          !checklistResult.data.useGlobalTypes &&
          Array.isArray(checklistTipos) &&
          checklistTipos.length > 0
        ) {
          tiposRaw = checklistTipos;
        }
      } catch { /* fall through */ }

      // 2. Fallback: global tipos
      if (tiposRaw.length === 0) {
        const result = await getTiposDocumentos();
        const rawList = Array.isArray(result?.data)
          ? result.data
          : Array.isArray((result?.data as any)?.items)
            ? (result.data as any).items
            : [];
        if (result?.success && rawList.length > 0) {
          tiposRaw = rawList.filter((t: any) => t && t.activo !== false);
        }
      }

      const tiposChecklist: TipoDocumentoRequerido[] = tiposRaw.map((tipo: any) => {
        const tipoNombre = normalizeDocumentText(tipo.nombre_documento || tipo.nombre);
        const matchedDoc = documentos.find((d) => {
          if (d.tipo_documento_id && d.tipo_documento_id === tipo.id) return true;
          return false;
        }) || documentos.find((d) => {
          if (d.tipo_documento_id) return false;
          const docNombre = normalizeDocumentText(d.nombre);
          return !!tipoNombre && !!docNombre && (docNombre.includes(tipoNombre) || tipoNombre.includes(docNombre));
        });
        return {
          id: tipo.id || tipo.tipoDocumentoId,
          nombre: tipo.nombre_documento || tipo.nombre,
          descripcion: tipo.descripcion || (tipo.nombre_documento && tipo.nombre_documento !== tipo.nombre ? tipo.nombre : ''),
          categoria: tipo.categoria || 'otros',
          obligatorio: !!tipo.obligatorio,
          requiere_validacion: !!tipo.requiere_validacion,
          formatos_permitidos: tipo.formatos_permitidos || [],
          color: tipo.color || '#6B7280',
          icono: tipo.icono || 'file-text',
          completado: !!matchedDoc,
          documento: matchedDoc || null,
          esEspecifico: !!(tipo.carpeta_digital_id || tipo.carpetaDigitalId),
        };
      });
      setTiposDocumentos(tiposChecklist);
    } catch (err) {
      console.warn('No se pudieron cargar tipos de documentos:', err);
      setTiposDocumentos([]);
    }
  }, [documentos, personaId]);

  useEffect(() => { loadData(); }, [loadData]);
  // Use fingerprint to re-run when doc content changes (e.g. after reclassification)
  const docsFingerprint = documentos.map(d => `${d.id}:${d.tipo_documento_id || ''}:${d.estado}`).join('|');
  useEffect(() => { loadTiposDocumentos(); }, [docsFingerprint, personaId]);

  const handleUpload = async () => {
    if (!uploadFile) { toast.error('Selecciona un archivo'); return; }
    setUploading(true);
    const syncedPersonaId = personaId;

    try {
      let res = await uploadDocumentoCarpetaDigital({
        file: uploadFile,
        personaId: syncedPersonaId,
        categoria: uploadCategoria,
        tipoDocumento: uploadTipoDocId || uploadCarpeta,
        descripcion: uploadDescripcion
      }).catch(() => ({ success: false }));
      if (!res.success) {
        // Supabase upload is fully deprecated, we just log the failure.
        console.error("Direct backend upload failed, fallback removed.");
      }
      if (res.success) {
        toast.success('Documento subido a tu carpeta digital');
        setShowUpload(false);
        resetUploadForm();
        loadData(); // Reload all data
      }
    } catch (err: any) {
      console.error('[CarpetaDigital] Error subiendo documento:', err);
      toast.error(`Error: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const resetUploadForm = () => {
    setUploadFile(null);
    setUploadCategoria('General');
    setUploadCarpeta('Mis Documentos');
    setUploadDescripcion('');
    setUploadTipoDocId(undefined);
    setUploadTipoNombre(undefined);
  };

  const handleReclassify = async () => {
    if (!reclassifyDoc || !reclassifyTipoId) return;
    setReclassifying(true);
    try {
      const selectedTipo = tiposDocumentos.find(t => t.id === reclassifyTipoId);
      const carpetaId = reclassifyDoc.carpeta_id || `carpeta:${personaId}`;
      const data = await reclassifyDocumento(reclassifyDoc.id, {
        carpetaId,
        tipo_documento_id: reclassifyTipoId,
        categoria: selectedTipo?.categoria || reclassifyDoc.categoria,
      });
      if (data.success) {
        toast.success('Documento vinculado', { description: `Asignado a "${selectedTipo?.nombre}"` });
        loadData();
        setReclassifyDoc(null);
        setReclassifyTipoId('');
      } else {
        toast.error('Error', { description: data.error });
      }
    } catch (err) {
      console.error('Reclassify error:', err);
      toast.error('Error al vincular documento');
    } finally {
      setReclassifying(false);
    }
  };

  const abrirAutogestionRund = () => {
    const correo = persona.email || '';
    const url = `/autogestion/docentes${correo ? `?email=${encodeURIComponent(correo)}` : ''}`;
    window.open(url, '_blank', 'noopener');
  };

  return (
    <div>
      {/* ═══ BANNER ACCESO RUND (autogestión) ═══ */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
        padding: '16px 20px', marginBottom: 16, borderRadius: 14,
        background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)', color: '#fff',
        boxShadow: '0 4px 16px rgba(37,99,235,0.25)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <FileCheck style={{ width: 22, height: 22, color: '#fff' }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '0.01em' }}>Actualiza tu RUND</div>
            <div style={{ fontSize: 12.5, opacity: 0.9, lineHeight: 1.4 }}>
              Gestiona tus datos y carga tus documentos del Registro Único Nacional Docente.
            </div>
          </div>
        </div>
        <button
          onClick={abrirAutogestionRund}
          style={{
            padding: '10px 18px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: '#fff', color: '#1e40af', fontWeight: 700, fontSize: 13,
            display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
          }}
        >
          Ir a mi RUND <span aria-hidden>→</span>
        </button>
      </div>

      {/* ═══ UNIFIED SHARED VIEW ═══ */}
      <CarpetaDigitalSharedView
        personaId={syncedPersonaId}
        persona={persona}
        documentos={documentos}
        tiposDocumentos={tiposDocumentos}
        isLoading={loading}
        mode="portal"
        onBack={onBack}
        onUpload={(tipoDocId, cat, tipoNombre) => {
          if (tipoDocId) {
            setUploadTipoDocId(tipoDocId);
            setUploadTipoNombre(tipoNombre);
            if (cat) setUploadCategoria(mapCategoriaToUpload(cat));
          } else {
            setUploadTipoDocId(undefined);
            setUploadTipoNombre(undefined);
          }
          setShowUpload(true);
        }}
        onUploadDirect={async (file, tipoId, categoria) => {
          const syncedPersonaId = personaId;
          try {
            let res = await uploadDocumentoCarpetaDigital({
              file,
              personaId: syncedPersonaId,
              categoria: mapCategoriaToUpload(categoria || 'otros'),
              tipoDocumento: tipoId,
              descripcion: 'Cargado mediante arrastrar y soltar directo'
            }).catch(() => ({ success: false }));
            if (!res.success) {
              // Fallback removed
              console.error("Direct backend upload failed, fallback removed.");
            }
            if (res.success) {
              loadData();
              return true;
            }
          } catch (e) {
            console.error('Error in onUploadDirect portal:', e);
          }
          return false;
        }}
        onRefresh={loadData}
        onPreview={(doc) => {
          if (doc.url_archivo) {
            window.open(doc.url_archivo, '_blank');
          } else {
            signedPreview(doc);
          }
        }}
        onDownload={(doc) => {
          if (doc.url_archivo) {
            window.open(doc.url_archivo, '_blank');
            toast.success('Descarga iniciada');
          } else {
            signedDownload(doc);
          }
        }}
        onDropFiles={(files) => {
          if (files.length > 0) {
            setUploadFile(files[0]);
            setShowUpload(true);
            if (files.length > 1) {
              toast.info(`Se seleccionó "${files[0].name}". Sube los demás archivos uno por uno.`);
            }
          }
        }}
        onEditCategory={(doc) => {
          setReclassifyDoc(doc);
          setReclassifyTipoId('');
        }}
      />

      {/* ═══ UPLOAD MODAL ═══ */}
      <AnimatePresence>
        {showUpload && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 9999,
            }}
            onClick={() => setShowUpload(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              style={{
                background: 'white', borderRadius: 16, width: 520, maxHeight: '85vh',
                overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div style={{
                padding: '24px 28px 16px',
                borderBottom: '1px solid #F3F4F6',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: uploadTipoNombre ? '#EFF6FF' : '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Upload style={{ width: 18, height: 18, color: uploadTipoNombre ? '#003DA5' : '#059669' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#1F2937' }}>
                      {uploadTipoNombre ? `Subir: ${uploadTipoNombre}` : 'Subir Documento'}
                    </div>
                    <div style={{ fontSize: 12, color: '#9CA3AF' }}>
                      {uploadTipoNombre ? 'Documento requerido por la lista de chequeo' : 'Archivos hasta 10MB'}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowUpload(false)}
                  style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: '#F3F4F6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X style={{ width: 16, height: 16, color: '#6B7280' }} />
                </button>
              </div>

              {/* Modal Body */}
              <div style={{ padding: '20px 28px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
                {/* Checklist tipo banner */}
                {uploadTipoNombre && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                    borderRadius: 10, background: '#EFF6FF', border: '1px solid #BFDBFE',
                  }}>
                    <CheckSquare style={{ width: 16, height: 16, color: '#003DA5', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#1E40AF' }}>
                        Tipo requerido: {uploadTipoNombre}
                      </div>
                      <div style={{ fontSize: 11, color: '#6B7280', marginTop: 1 }}>
                        Este documento se vinculará automáticamente a la lista de chequeo
                      </div>
                    </div>
                    <button
                      onClick={() => { setUploadTipoDocId(undefined); setUploadTipoNombre(undefined); }}
                      style={{ padding: 4, border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: 6 }}
                      title="Desvincular tipo"
                    >
                      <X style={{ width: 14, height: 14, color: '#9CA3AF' }} />
                    </button>
                  </div>
                )}
                {/* Drop zone */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: '2px dashed #D1D5DB', borderRadius: 12, padding: '32px 20px',
                    textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s',
                    background: uploadFile ? '#ECFDF5' : '#FAFBFC',
                  }}
                  onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = colors.brand; e.currentTarget.style.background = '#EFF6FF'; }}
                  onDragLeave={e => { e.currentTarget.style.borderColor = '#D1D5DB'; e.currentTarget.style.background = uploadFile ? '#ECFDF5' : '#FAFBFC'; }}
                  onDrop={e => {
                    e.preventDefault();
                    const f = e.dataTransfer.files[0];
                    if (f) setUploadFile(f);
                    e.currentTarget.style.borderColor = '#D1D5DB';
                    e.currentTarget.style.background = '#ECFDF5';
                  }}
                >
                  {uploadFile ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                      <FileCheck style={{ width: 24, height: 24, color: '#059669' }} />
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#1F2937' }}>{uploadFile.name}</div>
                        <div style={{ fontSize: 12, color: '#6B7280' }}>
                          {uploadFile.size > 1024 * 1024 ? `${(uploadFile.size / (1024 * 1024)).toFixed(1)} MB` : `${Math.round(uploadFile.size / 1024)} KB`}
                        </div>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); setUploadFile(null); }}
                        style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: '#FEE2E2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <X style={{ width: 14, height: 14, color: '#DC2626' }} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload style={{ width: 32, height: 32, color: '#9CA3AF', margin: '0 auto 8px' }} />
                      <div style={{ fontSize: 14, fontWeight: 500, color: '#6B7280' }}>
                        Arrastra o haz clic para seleccionar
                      </div>
                      <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
                        PDF, DOC, XLS, JPG, PNG — máx 10MB
                      </div>
                    </>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                  style={{ display: 'none' }}
                  onChange={e => { if (e.target.files?.[0]) setUploadFile(e.target.files[0]); }}
                />

                {/* Categoría */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Categoría</label>
                  <select
                    value={uploadCategoria}
                    onChange={e => setUploadCategoria(e.target.value)}
                    style={{
                      width: '100%', height: 36, borderRadius: 10, border: '1px solid #D1D5DB',
                      fontSize: 13, color: '#1F2937', outline: 'none', padding: '0 10px', background: 'white',
                      transition: 'border-color 0.2s, box-shadow 0.2s',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = '#003DA5'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,61,165,0.08)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#D1D5DB'; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    {CATEGORIAS_UPLOAD.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Tipo de documento */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Tipo de documento</label>
                  <select
                    value={uploadCarpeta}
                    onChange={e => setUploadCarpeta(e.target.value)}
                    style={{
                      width: '100%', height: 36, borderRadius: 10, border: '1px solid #D1D5DB',
                      fontSize: 13, color: '#1F2937', outline: 'none', padding: '0 10px', background: 'white',
                      transition: 'border-color 0.2s, box-shadow 0.2s',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = '#003DA5'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,61,165,0.08)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#D1D5DB'; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    {CARPETAS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Descripción */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Descripción (opcional)</label>
                  <textarea
                    value={uploadDescripcion}
                    onChange={e => setUploadDescripcion(e.target.value)}
                    placeholder="Breve descripción del documento..."
                    rows={2}
                    style={{
                      width: '100%', borderRadius: 10, border: '1px solid #D1D5DB',
                      fontSize: 13, color: '#1F2937', outline: 'none', padding: '10px 12px',
                      background: 'white', resize: 'vertical', fontFamily: 'inherit',
                      transition: 'border-color 0.2s, box-shadow 0.2s',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = '#003DA5'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,61,165,0.08)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#D1D5DB'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                  <button
                    onClick={() => { setShowUpload(false); resetUploadForm(); }}
                    style={{
                      flex: 1, height: 40, borderRadius: 10, border: '1px solid #E5E7EB',
                      background: 'white', color: '#6B7280', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleUpload}
                    disabled={uploading || !uploadFile}
                    style={{
                      flex: 1, height: 40, borderRadius: 10, border: 'none',
                      background: !uploadFile ? '#D1D5DB' : '#059669',
                      color: 'white', fontSize: 13, fontWeight: 600,
                      cursor: !uploadFile ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      opacity: uploading ? 0.7 : 1,
                    }}
                  >
                    {uploading ? <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> : <Upload style={{ width: 14, height: 14 }} />}
                    {uploading ? 'Subiendo...' : 'Subir Documento'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ RECLASSIFY MODAL (Portal) ═══ */}
      {reclassifyDoc && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={() => setReclassifyDoc(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'white', borderRadius: 16, width: 420, maxHeight: '70vh',
              overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
            }}
          >
            <div style={{
              padding: '20px 24px 14px', borderBottom: '1px solid #F3F4F6',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckSquare style={{ width: 16, height: 16, color: '#003DA5' }} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1F2937' }}>Vincular a tipo requerido</div>
                  <div style={{ fontSize: 11, color: '#9CA3AF' }}>Selecciona el tipo de documento correspondiente</div>
                </div>
              </div>
              <button
                onClick={() => setReclassifyDoc(null)}
                style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: '#F3F4F6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X style={{ width: 14, height: 14, color: '#6B7280' }} />
              </button>
            </div>
            <div style={{ padding: '16px 24px 24px' }}>
              <div style={{ padding: '10px 14px', borderRadius: 10, background: '#F9FAFB', border: '1px solid #E5E7EB', marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.3 }}>Tu documento</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1F2937', marginTop: 2 }}>{reclassifyDoc.nombre}</div>
              </div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>
                Tipo de documento requerido
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {tiposDocumentos.filter(t => !t.completado).map(tipo => (
                  <button
                    key={tipo.id}
                    onClick={() => setReclassifyTipoId(tipo.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                      borderRadius: 10, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                      border: reclassifyTipoId === tipo.id ? '2px solid #003DA5' : '1px solid #E5E7EB',
                      background: reclassifyTipoId === tipo.id ? '#EFF6FF' : 'white',
                    }}
                  >
                    <div style={{
                      width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                      background: (tipo.color || '#6B7280') + '15',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <FileCheck style={{ width: 12, height: 12, color: tipo.color || '#6B7280' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#1F2937' }}>{tipo.nombre}</div>
                      <div style={{ fontSize: 10, color: '#9CA3AF' }}>
                        {tipo.obligatorio ? '● Requerido' : '○ Opcional'}
                      </div>
                    </div>
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                      border: reclassifyTipoId === tipo.id ? '5px solid #003DA5' : '2px solid #D1D5DB',
                      transition: 'all 0.15s',
                    }} />
                  </button>
                ))}
                {tiposDocumentos.filter(t => !t.completado).length === 0 && (
                  <div style={{ padding: 20, textAlign: 'center', color: '#9CA3AF', fontSize: 12 }}>
                    Todos los tipos ya tienen documentos asignados
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button
                  onClick={() => setReclassifyDoc(null)}
                  style={{
                    flex: 1, height: 38, borderRadius: 10, border: '1px solid #E5E7EB',
                    background: 'white', color: '#6B7280', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleReclassify}
                  disabled={!reclassifyTipoId || reclassifying}
                  style={{
                    flex: 1, height: 38, borderRadius: 10, border: 'none',
                    background: !reclassifyTipoId ? '#D1D5DB' : '#003DA5',
                    color: 'white', fontSize: 12, fontWeight: 700,
                    cursor: !reclassifyTipoId ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    opacity: reclassifying ? 0.7 : 1,
                  }}
                >
                  {reclassifying && <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />}
                  {reclassifying ? 'Vinculando...' : 'Vincular'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══ Mapping helpers ═══

function mapCategoriaToUpload(cat: string): string {
  const lower = (cat || '').toLowerCase();
  if (lower.includes('personal') || lower.includes('vincula')) return 'Vinculación';
  if (lower.includes('academ') || lower.includes('formac')) return 'Formación';
  if (lower.includes('certif')) return 'Certificados';
  if (lower.includes('labor')) return 'General';
  if (lower.includes('evalua')) return 'Evaluaciones';
  if (lower.includes('declara')) return 'Declaraciones';
  return 'General';
}

function mapCategoria(cat: string): string {
  const lower = (cat || '').toLowerCase();
  if (lower.includes('personal') || lower.includes('vincula')) return 'personal';
  if (lower.includes('academ') || lower.includes('formac')) return 'academico';
  if (lower.includes('certif')) return 'certificados';
  if (lower.includes('labor')) return 'laboral';
  if (lower.includes('admin')) return 'administrativo';
  return 'otros';
}

function mapEstado(estado: string): 'validado' | 'pendiente' | 'rechazado' | 'vencido' {
  const lower = (estado || '').toLowerCase();
  if (lower.includes('vigente') || lower.includes('validado') || lower.includes('valid')) return 'validado';
  if (lower.includes('vencido') || lower.includes('expired')) return 'vencido';
  if (lower.includes('rechaz') || lower.includes('reject')) return 'rechazado';
  return 'pendiente';
}

function parseTamano(s: string | number): number {
  if (typeof s === 'number') return s;
  const str = String(s || '0');
  const match = str.match(/([\d.]+)\s*(KB|MB|GB|B)?/i);
  if (!match) return 0;
  const val = parseFloat(match[1]);
  const unit = (match[2] || 'B').toUpperCase();
  if (unit === 'KB') return Math.round(val * 1024);
  if (unit === 'MB') return Math.round(val * 1024 * 1024);
  if (unit === 'GB') return Math.round(val * 1024 * 1024 * 1024);
  return Math.round(val);
}

export default MisDocumentos;
