/**
 * Carpeta Digital - Portal Transaccional (simplificado)
 *
 * Migrado del legacy PTA pero adaptado para no depender de Supabase services
 * locales del repo antiguo. Usa `portalApi` (con fallback).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Upload, Loader2, FileText, Eye, Download, X } from 'lucide-react';
import { toast } from 'sonner';
import { colors } from '../../esap/shared/designTokens';
import { getCarpetaDigitalPortal, uploadDocumentoCarpetaDigital } from '../portalApi';

interface MisDocumentosProps {
  personaId: string;
  userName?: string;
  onBack: () => void;
}

type PortalDoc = {
  id: string;
  nombre: string;
  categoria?: string;
  tipo?: string;
  fecha?: string;
  url?: string;
};

export function MisDocumentos({ personaId, userName, onBack }: MisDocumentosProps) {
  const [loading, setLoading] = useState(true);
  const [docs, setDocs] = useState<PortalDoc[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [categoria, setCategoria] = useState('General');
  const [tipoDocumento, setTipoDocumento] = useState('Mis Documentos');
  const [descripcion, setDescripcion] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await getCarpetaDigitalPortal(personaId);
      const raw = Array.isArray(res?.data?.documentos) ? res.data.documentos : [];
      const mapped: PortalDoc[] = raw.map((d: any) => ({
        id: d.id || crypto.randomUUID(),
        nombre: d.nombre || d.name || 'Documento',
        categoria: d.categoria || d.category,
        tipo: d.tipo || d.type,
        fecha: d.fechaCarga || d.fecha_subida || d.createdAt,
        url: d.url || d.url_archivo,
      }));
      setDocs(mapped);
    } catch (err) {
      console.error('[CarpetaDigital] Error:', err);
      toast.error('No fue posible cargar la carpeta digital');
      setDocs([]);
    } finally {
      setLoading(false);
    }
  }, [personaId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Selecciona un archivo');
      return;
    }
    setUploading(true);
    try {
      const res: any = await uploadDocumentoCarpetaDigital({
        personaId,
        file: selectedFile,
        tipoDocumento,
        categoria,
        descripcion,
      });
      if (res?.success) {
        toast.success('Documento subido');
        setShowUpload(false);
        setSelectedFile(null);
        setDescripcion('');
        await load();
      } else {
        toast.error('No fue posible subir el documento');
      }
    } catch (err: any) {
      toast.error('Error al subir', { description: err.message });
    } finally {
      setUploading(false);
    }
  };

  const handlePreview = (doc: PortalDoc) => {
    if (doc.url) {
      window.open(doc.url, '_blank');
      return;
    }
    toast.info('Vista previa no disponible');
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
        <button
          onClick={onBack}
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            border: '1px solid #E5E7EB',
            background: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ArrowLeft style={{ width: 16, height: 16, color: '#6B7280' }} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#1F2937', letterSpacing: '-0.02em' }}>Carpeta Digital</div>
          <div style={{ fontSize: 13, color: '#9CA3AF', marginTop: 2 }}>Documentos del usuario {userName || ''}</div>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          style={{
            height: 40,
            padding: '0 18px',
            borderRadius: 10,
            border: 'none',
            background: colors.brand,
            color: 'white',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Upload style={{ width: 16, height: 16 }} />
          Subir
        </button>
      </div>

      <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        {loading ? (
          <div style={{ padding: '44px 0', textAlign: 'center' }}>
            <Loader2 className="w-7 h-7 animate-spin mx-auto mb-3" style={{ color: colors.brand }} />
            <div style={{ fontSize: 13, color: '#6B7280' }}>Cargando documentos...</div>
          </div>
        ) : docs.length === 0 ? (
          <div style={{ padding: '44px 0', textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <FileText style={{ width: 24, height: 24, color: '#9CA3AF' }} />
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#374151' }}>Sin documentos</div>
            <div style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>Sube tu primer documento</div>
          </div>
        ) : (
          <div style={{ padding: 14 }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {docs.map((d) => (
                <div
                  key={d.id}
                  style={{
                    border: '1px solid #F3F4F6',
                    borderRadius: 14,
                    padding: 14,
                    background: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 14, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FileText style={{ width: 18, height: 18, color: '#6B7280' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#111827' }}>{d.nombre}</div>
                      <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                        {(d.categoria || 'General') + (d.tipo ? ` • ${d.tipo}` : '')}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => handlePreview(d)}
                      style={{
                        height: 34,
                        padding: '0 12px',
                        borderRadius: 10,
                        border: '1px solid #E5E7EB',
                        background: 'white',
                        color: '#6B7280',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <Eye style={{ width: 14, height: 14 }} />
                      Ver
                    </button>
                    <button
                      onClick={() => toast.info('Descarga', { description: 'Usa "Ver" para abrir el archivo.' })}
                      style={{
                        height: 34,
                        padding: '0 12px',
                        borderRadius: 10,
                        border: 'none',
                        background: colors.brand,
                        color: 'white',
                        fontSize: 12,
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <Download style={{ width: 14, height: 14 }} />
                      Descargar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showUpload && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: 16,
            }}
            onClick={() => setShowUpload(false)}
          >
            <motion.div
              initial={{ scale: 0.98, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.98, y: 10 }}
              style={{
                width: '100%',
                maxWidth: 560,
                background: 'white',
                borderRadius: 16,
                padding: 18,
                boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#111827' }}>Subir documento</div>
                <button
                  onClick={() => setShowUpload(false)}
                  style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid #E5E7EB', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X style={{ width: 14, height: 14, color: '#6B7280' }} />
                </button>
              </div>

              <div style={{ display: 'grid', gap: 10 }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  style={{ border: '1px solid #E5E7EB', borderRadius: 10, padding: 10 }}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <input
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    placeholder="Categoría"
                    style={{ height: 40, border: '1px solid #E5E7EB', borderRadius: 10, padding: '0 12px' }}
                  />
                  <input
                    value={tipoDocumento}
                    onChange={(e) => setTipoDocumento(e.target.value)}
                    placeholder="Tipo de documento"
                    style={{ height: 40, border: '1px solid #E5E7EB', borderRadius: 10, padding: '0 12px' }}
                  />
                </div>
                <textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Descripción (opcional)"
                  style={{ minHeight: 90, border: '1px solid #E5E7EB', borderRadius: 10, padding: 12 }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
                <button
                  onClick={() => setShowUpload(false)}
                  style={{
                    height: 40,
                    padding: '0 16px',
                    borderRadius: 10,
                    border: '1px solid #E5E7EB',
                    background: 'white',
                    color: '#6B7280',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  disabled={uploading}
                  onClick={handleUpload}
                  style={{
                    height: 40,
                    padding: '0 16px',
                    borderRadius: 10,
                    border: 'none',
                    background: colors.brand,
                    color: 'white',
                    fontWeight: 900,
                    cursor: uploading ? 'not-allowed' : 'pointer',
                    opacity: uploading ? 0.7 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Subir
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

