/**
 * SECCIÓN CARPETA DIGITAL (dentro del módulo Personas)
 * 
 * Vista con selector de usuario + vista unificada CarpetaDigitalSharedView.
 * Garantiza coherencia visual con CarpetaDigitalModulePremium y Portal.
 * 
 * @version 2.0.0 - Unificación con diseño compartido
 * @date 2026-03-09
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { ArrowLeft, FolderOpen, Users, Tag, X, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { supabaseService, tiposDocumentosService } from '../../services/api/supabase.service';
import {
  CarpetaDigitalSharedView,
  type CarpetaDocumento,
  type TipoDocumentoRequerido,
  type PersonaInfo,
} from '../shared/CarpetaDigitalSharedView';
import { useDocumentActions } from '../../hooks/useDocumentActions';

interface DigitalFolderSectionProps {
  onBack: () => void;
  initialUserId?: string;
  onDocumentsChanged?: () => void;
  users: Array<{
    id: string;
    firstName: string;
    lastName: string;
    document: string;
    email: string;
    avatar?: string;
  }>;
  canUpload?: boolean;
  hideBackButton?: boolean;
}

function normalizeDocumentText(value: unknown): string {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function DigitalFolderSection({
  onBack,
  initialUserId,
  onDocumentsChanged,
  users,
  canUpload = false,
  hideBackButton = false
}: DigitalFolderSectionProps) {
  const [selectedUserId, setSelectedUserId] = useState(initialUserId || users[0]?.id);
  const [documentos, setDocumentos] = useState<CarpetaDocumento[]>([]);
  const [tiposDocumentos, setTiposDocumentos] = useState<TipoDocumentoRequerido[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const auth = { userRole: 'Administrador' };

  // ── Tipo de documento INDIVIDUAL (específico de este docente) ──
  const [carpetaDigitalId, setCarpetaDigitalId] = useState<string | null>(null);
  const [showAddTipo, setShowAddTipo] = useState(false);
  const [savingTipo, setSavingTipo] = useState(false);
  const [newTipo, setNewTipo] = useState({ nombre: '', descripcion: '', categoria: 'otros', obligatorio: true });



  const selectedUser = useMemo(() => users.find(u => u.id === selectedUserId), [users, selectedUserId]);

  const persona: PersonaInfo = useMemo(() => ({
    nombre: selectedUser ? `${selectedUser.firstName} ${selectedUser.lastName}` : 'Usuario',
    email: selectedUser?.email,
    numeroDocumento: selectedUser?.document,
  }), [selectedUser]);

  // Load documents for selected user
  const cargarDocumentos = useCallback(async (userId: string) => {
    setIsLoading(true);
    try {
      const carpetaId = userId.startsWith('persona:') ? `carpeta:${userId.split(':')[1]}` : `carpeta:${userId}`;
      const result = await supabaseService.documentos.getDocumentosByCarpeta(carpetaId);
      if (result.success && result.data) {
        const docs: CarpetaDocumento[] = (result.data as any[]).map((d: any) => ({
          id: d.id || d.documento_id || crypto.randomUUID(),
          carpeta_id: d.carpeta_id || carpetaId,
          nombre: d.nombre || d.name || 'Sin nombre',
          categoria: d.categoria || d.category || 'otros',
          tipo_archivo: d.tipo_archivo || d.tipo || 'PDF',
          tamano_bytes: d.tamano_bytes || d.tamano || d.size || 0,
          estado: d.estado || 'pendiente',
          fecha_subida: d.fecha_subida || d.uploadedAt || new Date().toISOString(),
          fecha_validacion: d.fecha_validacion,
          version_actual: d.version_actual || 1,
          validado_por: d.validado_por || d.aprobadoPorNombre,
          comentarios: d.comentarios,
          tipo_documento_id: d.tipo_documento_id,
        }));
        setDocumentos(docs);
      } else {
        setDocumentos([]);
      }
    } catch (err) {
      console.error('Error cargando documentos:', err);
      setDocumentos([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load tipos documentos — first tries persona-specific checklist, falls back to global tipos
  const loadTiposDocumentos = useCallback(async () => {
    try {
      const personaIdClean = selectedUserId?.replace('persona:', '') || '';
      let tiposRaw: any[] = [];

      // 1. Try persona-specific checklist
      try {
        const checklistResult = await supabaseService.documentos.getChecklistForPersona(personaIdClean);
        // Capturar el UUID real de la carpeta para poder crear tipos individuales.
        const carpetaUuid = checklistResult?.data?.carpeta?.carpeta_digital_id || null;
        if (carpetaUuid) setCarpetaDigitalId(carpetaUuid);
        if (checklistResult.success && checklistResult.data && !checklistResult.data.useGlobalTypes && checklistResult.data.tiposDocumentos.length > 0) {
          tiposRaw = checklistResult.data.tiposDocumentos;
        }
      } catch { /* fall through to global */ }

      // 2. Fallback: global tipos
      if (tiposRaw.length === 0) {
        const result = await supabaseService.documentos.getTiposDocumentos();
        if (result.success && result.data) {
          tiposRaw = result.data.filter((t: any) => t.activo);
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
          rol_validador: tipo.rol_validador || '',
          formatos_permitidos: tipo.formatos_permitidos || [],
          color: tipo.color || '#6B7280',
          icono: tipo.icono || 'file-text',
          completado: !!matchedDoc,
          documento: matchedDoc || null,
          // Individual = tiene carpeta_digital_id (no es general).
          esEspecifico: !!(tipo.carpeta_digital_id || tipo.carpetaDigitalId),
        };
      });
      setTiposDocumentos(tiposChecklist);
    } catch (err) {
      console.warn('No se pudieron cargar tipos de documentos:', err);
    }
  }, [documentos, selectedUserId]);

  useEffect(() => { if (selectedUserId) cargarDocumentos(selectedUserId); }, [selectedUserId, cargarDocumentos]);
  const docsFingerprint = documentos.map(d => `${d.id}:${d.tipo_documento_id || ''}:${d.estado}`).join('|');
  useEffect(() => { loadTiposDocumentos(); }, [docsFingerprint, selectedUserId]);

  // Carga ROBUSTA del UUID de la carpeta para habilitar "Documento específico".
  // Independiente del checklist (que puede caer al fallback sin devolver carpeta).
  // getCarpetaByPersona hace ensureCarpetaForPersona → siempre devuelve un id válido.
  useEffect(() => {
    const personaIdClean = selectedUserId?.replace('persona:', '') || '';
    if (!personaIdClean) { setCarpetaDigitalId(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await supabaseService.documentos.getCarpetaByPersona(personaIdClean);
        const uuid = res?.data?.carpeta_digital_id || res?.data?.id || null;
        if (!cancelled && uuid && !String(uuid).startsWith('carpeta:')) setCarpetaDigitalId(uuid);
      } catch { /* el checklist puede haberlo seteado igual */ }
    })();
    return () => { cancelled = true; };
  }, [selectedUserId]);

  const handleChangeUser = (userId: string) => {
    setSelectedUserId(userId);
  };

  // Compute carpetaId for document actions
  const activeCarpetaId = useMemo(() => {
    if (!selectedUserId) return undefined;
    return selectedUserId.startsWith('persona:') ? `carpeta:${selectedUserId.split(':')[1]}` : `carpeta:${selectedUserId}`;
  }, [selectedUserId]);

  const refreshDocs = useCallback(() => {
    if (selectedUserId) cargarDocumentos(selectedUserId);
  }, [selectedUserId, cargarDocumentos]);

  const { handleUpload, handlePreview, handleDownload, handleDelete, handleValidate, handleReject, handleDropFiles } = useDocumentActions({
    carpetaId: activeCarpetaId,
    onRefresh: refreshDocs,
    onDeleteSuccess: (deletedDoc) => {
      setDocumentos(prev => prev.filter(doc => doc.id !== deletedDoc.id));
      onDocumentsChanged?.();
    },
  });

  // ── Reclassification state ──
  const [reclassifyDoc, setReclassifyDoc] = useState<CarpetaDocumento | null>(null);
  const [reclassifyTipoId, setReclassifyTipoId] = useState('');
  const [reclassifying, setReclassifying] = useState(false);

  const handleReclassify = useCallback(async () => {
    if (!reclassifyDoc || !reclassifyTipoId) return;
    setReclassifying(true);
    try {
      const selectedTipo = tiposDocumentos.find(t => t.id === reclassifyTipoId);
      const data = await supabaseService.documentos.reclassify(reclassifyDoc.id, {
        carpetaId: activeCarpetaId,
        tipo_documento_id: reclassifyTipoId,
        categoria: selectedTipo?.categoria || reclassifyDoc.categoria,
      });
      if (data.success) {
        toast.success('Documento reclasificado', { description: `Vinculado a "${selectedTipo?.nombre}"` });
        refreshDocs();
        setReclassifyDoc(null);
        setReclassifyTipoId('');
      } else {
        toast.error('Error', { description: data.error });
      }
    } catch (err) {
      console.error('Reclassify error:', err);
      toast.error('Error al reclasificar documento');
    } finally {
      setReclassifying(false);
    }
  }, [reclassifyDoc, reclassifyTipoId, activeCarpetaId, tiposDocumentos, refreshDocs]);

  // Crear un tipo de documento ESPECÍFICO para este docente (parte del general + este extra).
  const handleCreateTipoIndividual = useCallback(async () => {
    if (!newTipo.nombre.trim()) { toast.error('Indica el nombre del documento'); return; }
    if (!carpetaDigitalId) { toast.error('No se pudo identificar la carpeta del docente. Intenta recargar.'); return; }
    setSavingTipo(true);
    try {
      const res = await tiposDocumentosService.create({
        nombre: newTipo.nombre.trim(),
        descripcion: newTipo.descripcion.trim(),
        categoria: newTipo.categoria,
        obligatorio: newTipo.obligatorio,
        carpetaDigitalId, // ← vincula el tipo a ESTE docente (individual)
        activo: true,
      });
      if ((res as any).success) {
        toast.success('Documento específico agregado', { description: `"${newTipo.nombre.trim()}" solo aplica a este docente.` });
        setShowAddTipo(false);
        setNewTipo({ nombre: '', descripcion: '', categoria: 'otros', obligatorio: true });
        loadTiposDocumentos();
      } else {
        toast.error('No se pudo crear el documento', { description: (res as any).error });
      }
    } catch (err: any) {
      console.error('Error creando tipo individual:', err);
      toast.error('Error al crear el documento específico');
    } finally {
      setSavingTipo(false);
    }
  }, [newTipo, carpetaDigitalId, loadTiposDocumentos]);

  if (!selectedUser) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 384 }}>
        <p style={{ color: '#9CA3AF' }}>No hay usuario seleccionado</p>
      </div>
    );
  }

  return (
    <div>
      {/* ═══ BACK BUTTON + USER SELECTOR ═══ */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 mb-4 sm:mb-5 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          {!hideBackButton && (
            <button
              onClick={onBack}
              className="w-11 h-11 sm:w-10 sm:h-10 rounded-lg border border-gray-200 bg-white cursor-pointer flex items-center justify-center flex-shrink-0 transition-all hover:bg-gray-50"
            >
              <ArrowLeft className="w-5 h-5 sm:w-4 sm:h-4 text-gray-500" />
            </button>
          )}
          <div className="flex items-center gap-2 flex-shrink-0">
            <FolderOpen className="w-5 h-5 sm:w-[20px] sm:h-[20px] text-[#003DA5]" />
            <span className="text-[15px] sm:text-[14px] font-bold text-gray-900">Carpeta Digital</span>
          </div>
        </div>
        
        <div className="hidden sm:block w-[1px] h-7 bg-gray-200 flex-shrink-0" />
        
        <div className="flex items-center gap-2 flex-1 w-full bg-white relative">
          <Users className="w-5 h-5 text-gray-400 absolute left-3 pointer-events-none" />
          <select
            value={selectedUserId}
            onChange={e => handleChangeUser(e.target.value)}
            className={`w-full h-11 sm:h-10 pl-10 pr-4 rounded-lg border ${searchFocused ? 'border-[#003DA5] ring-2 ring-[#003DA5]/10' : 'border-gray-300'} text-[15px] sm:text-[14px] text-gray-900 bg-white cursor-pointer transition-all outline-none`}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          >
            {users.map(user => (
              <option key={user.id} value={user.id}>
                {user.firstName} {user.lastName} · CC {user.document}
              </option>
            ))}
          </select>
        </div>

        {canUpload && (
          <button
            onClick={() => setShowAddTipo(true)}
            disabled={!carpetaDigitalId}
            title={carpetaDigitalId ? 'Agregar un documento exigido solo a este docente' : 'Cargando carpeta del docente…'}
            className="flex items-center justify-center gap-1.5 h-11 sm:h-10 px-3 rounded-lg border border-[#003DA5] bg-[#003DA5] text-white text-[13px] font-bold cursor-pointer flex-shrink-0 transition-all hover:bg-[#002B75] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Documento específico</span>
          </button>
        )}
      </div>

      {/* ═══ UNIFIED SHARED VIEW ═══ */}
      <CarpetaDigitalSharedView
        personaId={selectedUserId}
        persona={persona}
        documentos={documentos}
        tiposDocumentos={tiposDocumentos}
        isLoading={isLoading}
        mode="admin"
        userRole={auth.userRole}
        onUpload={canUpload ? (tipoDocId, cat) => handleUpload(cat, tipoDocId) : undefined}
        onUploadDirect={canUpload ? async (file, tipoId, categoria) => {
          try {
            const data = await supabaseService.documentos.uploadFile(file, activeCarpetaId!, categoria || 'otros', {
              tipo_documento_id: tipoId,
            });
            if (data.success) {
              if (selectedUserId) cargarDocumentos(selectedUserId);
              return true;
            } else {
              toast.error('Error al subir documento', { description: data.error });
            }
          } catch (e) {
            console.error('Error en onUploadDirect:', e);
            toast.error('Error al subir documento');
          }
          return false;
        } : undefined}
        onRefresh={() => { if (selectedUserId) cargarDocumentos(selectedUserId); }}
        onPreview={handlePreview}
        onDownload={handleDownload}
        onDelete={handleDelete}
        onValidate={handleValidate}
        onReject={handleReject}
        onDropFiles={handleDropFiles}
        onEditCategory={(doc) => {
          setReclassifyDoc(doc);
          setReclassifyTipoId('');
        }}
      />

      {/* ═══ RECLASSIFY MODAL ═══ */}
      {reclassifyDoc && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 99999,
          }}
          onClick={() => setReclassifyDoc(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'white', borderRadius: 16, width: 440, maxHeight: '70vh',
              overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '20px 24px 14px', borderBottom: '1px solid #F3F4F6',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Tag style={{ width: 16, height: 16, color: '#003DA5' }} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1F2937' }}>Reclasificar documento</div>
                  <div style={{ fontSize: 11, color: '#9CA3AF' }}>Vincular a un tipo de la lista de chequeo</div>
                </div>
              </div>
              <button
                onClick={() => setReclassifyDoc(null)}
                style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: '#F3F4F6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X style={{ width: 14, height: 14, color: '#6B7280' }} />
              </button>
            </div>
            {/* Body */}
            <div style={{ padding: '16px 24px 24px' }}>
              <div style={{ padding: '10px 14px', borderRadius: 10, background: '#F9FAFB', border: '1px solid #E5E7EB', marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.3 }}>Documento</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1F2937', marginTop: 2 }}>{reclassifyDoc.nombre}</div>
              </div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>
                Seleccionar tipo de documento
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
                      <Tag style={{ width: 12, height: 12, color: tipo.color || '#6B7280' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#1F2937' }}>{tipo.nombre}</div>
                      <div style={{ fontSize: 10, color: '#9CA3AF' }}>
                        {tipo.obligatorio ? '● Requerido' : '○ Opcional'} · {tipo.categoria}
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
              {/* Actions */}
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
                  {reclassifying ? 'Vinculando...' : 'Vincular a tipo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL: AGREGAR DOCUMENTO ESPECÍFICO (individual) ═══ */}
      {showAddTipo && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999,
          }}
          onClick={() => !savingTipo && setShowAddTipo(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: 'white', borderRadius: 16, width: 460, maxHeight: '80vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}
          >
            <div style={{ padding: '20px 24px 14px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Plus style={{ width: 16, height: 16, color: '#7C3AED' }} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1F2937' }}>Documento específico</div>
                  <div style={{ fontSize: 11, color: '#9CA3AF' }}>Se exigirá solo a <strong>{persona.nombre}</strong>, además de los generales</div>
                </div>
              </div>
              <button onClick={() => !savingTipo && setShowAddTipo(false)} style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: '#F3F4F6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X style={{ width: 14, height: 14, color: '#6B7280' }} />
              </button>
            </div>
            <div style={{ padding: '16px 24px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Nombre del documento *</label>
                <input
                  value={newTipo.nombre}
                  onChange={e => setNewTipo({ ...newTipo, nombre: e.target.value })}
                  placeholder="Ej: Certificado médico ocupacional"
                  style={{ width: '100%', height: 38, borderRadius: 10, border: '1px solid #D1D5DB', fontSize: 13, padding: '0 12px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Descripción (opcional)</label>
                <textarea
                  value={newTipo.descripcion}
                  onChange={e => setNewTipo({ ...newTipo, descripcion: e.target.value })}
                  rows={2}
                  placeholder="Indicaciones para el docente…"
                  style={{ width: '100%', borderRadius: 10, border: '1px solid #D1D5DB', fontSize: 13, padding: '10px 12px', outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Categoría</label>
                  <select
                    value={newTipo.categoria}
                    onChange={e => setNewTipo({ ...newTipo, categoria: e.target.value })}
                    style={{ width: '100%', height: 38, borderRadius: 10, border: '1px solid #D1D5DB', fontSize: 13, padding: '0 10px', background: 'white', outline: 'none' }}
                  >
                    <option value="otros">General</option>
                    <option value="personal">Personal / Vinculación</option>
                    <option value="academico">Académico / Formación</option>
                    <option value="certificados">Certificados</option>
                    <option value="laboral">Laboral</option>
                  </select>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: '#374151', alignSelf: 'flex-end', height: 38, cursor: 'pointer' }}>
                  <input type="checkbox" checked={newTipo.obligatorio} onChange={e => setNewTipo({ ...newTipo, obligatorio: e.target.checked })} style={{ width: 16, height: 16, accentColor: '#7C3AED' }} />
                  Obligatorio
                </label>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button
                  onClick={() => setShowAddTipo(false)}
                  disabled={savingTipo}
                  style={{ flex: 1, height: 40, borderRadius: 10, border: '1px solid #E5E7EB', background: 'white', color: '#6B7280', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateTipoIndividual}
                  disabled={savingTipo || !newTipo.nombre.trim()}
                  style={{
                    flex: 1, height: 40, borderRadius: 10, border: 'none',
                    background: !newTipo.nombre.trim() ? '#D1D5DB' : '#7C3AED',
                    color: 'white', fontSize: 13, fontWeight: 700,
                    cursor: !newTipo.nombre.trim() ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: savingTipo ? 0.7 : 1,
                  }}
                >
                  {savingTipo && <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />}
                  {savingTipo ? 'Agregando…' : 'Agregar documento'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
