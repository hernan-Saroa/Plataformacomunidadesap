/**
 * Sección de Documentos por Etapa - Expediente de Auditoría
 * Usa plantillas requeridas para esta auditoría en la etapa (misma validación que el Kanban).
 * Se usa en tabs Planeación, Ejecución y Comunicación.
 */

import { useState, useEffect } from 'react';
import { FileText, Upload, Download, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { controlInternoService } from '../../../services/api/controlInternoService';
import { getServiceUrl, API_MODE, getDefaultHeaders } from '../../../config/environment';

const getDocumentosBaseUrl = () => {
  if (API_MODE === 'gateway') return '/services/control-institucional/api/v1/documentos';
  return `${getServiceUrl('control-institucional')}/documentos`;
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
};

export type EtapaDocumentos = 'planeacion' | 'ejecucion' | 'comunicacion';

interface DocEtapa {
  id: string;
  nombre: string;
  descripcion: string;
  extension: string;
  tamano: string;
  urlDownload: string;
  urlPreview: string;
  auditoriaId?: string | null;
  documentoBibliotecaId?: string | null;
}

const ETAPA_CONFIG: Record<EtapaDocumentos, { label: string; borderClass: string; bgClass: string; accentClass: string }> = {
  planeacion: { label: 'Planeación', borderClass: 'border-purple-200', bgClass: 'bg-purple-50', accentClass: 'bg-purple-600' },
  ejecucion: { label: 'Ejecución', borderClass: 'border-amber-200', bgClass: 'bg-amber-50', accentClass: 'bg-amber-600' },
  comunicacion: { label: 'Comunicación', borderClass: 'border-green-200', bgClass: 'bg-green-50', accentClass: 'bg-green-600' },
};

interface SeccionDocumentosPorEtapaProps {
  auditoriaId: string;
  etapa: EtapaDocumentos;
}

export function SeccionDocumentosPorEtapa({ auditoriaId, etapa }: SeccionDocumentosPorEtapaProps) {
  const [plantillas, setPlantillas] = useState<DocEtapa[]>([]);
  const [documentosSubidos, setDocumentosSubidos] = useState<DocEtapa[]>([]);
  const [loading, setLoading] = useState(true);
  const [plantillaParaSubir, setPlantillaParaSubir] = useState<DocEtapa | null>(null);
  const [docAEliminar, setDocAEliminar] = useState<DocEtapa | null>(null);

  const baseUrl = getDocumentosBaseUrl();
  const config = ETAPA_CONFIG[etapa];

  const mapDoc = (d: any): DocEtapa => ({
    id: d.id,
    nombre: d.nombre || 'Sin nombre',
    descripcion: d.descripcion || '',
    extension: (d.nombreArchivo || d.nombre || '').split('.').pop()?.toUpperCase() || 'FILE',
    tamano: formatFileSize(Number(d.tamanioBytes ?? d.tamanio_bytes) || 0),
    urlDownload: `${baseUrl}/${d.id}/download`,
    urlPreview: `${baseUrl}/${d.id}/preview`,
    auditoriaId: d.auditoriaId ?? d.auditoria_id,
    documentoBibliotecaId: d.documentoBibliotecaId ?? d.documento_biblioteca_id,
  });

  const [requeridosCount, setRequeridosCount] = useState(0);

  const cargarDocumentos = async () => {
    setLoading(true);
    try {
      const [bibliotecaData, requeridasData, subidosData] = await Promise.all([
        controlInternoService.getDocumentos({ etapa }).catch(() => []),
        controlInternoService.getPlantillasRequeridas(etapa, auditoriaId).catch(() => []),
        controlInternoService.getDocumentosByEtapa(auditoriaId, etapa),
      ]);
      const visible = (d: any) => !(d.visibleAuditoriaId ?? d.visible_auditoria_id) || (d.visibleAuditoriaId ?? d.visible_auditoria_id) === auditoriaId;
      const plantillasBiblioteca = (bibliotecaData || []).filter((d: any) => !(d.auditoriaId ?? d.auditoria_id) && visible(d));
      const subidos = (subidosData || []).filter((d: any) => (d.auditoriaId ?? d.auditoria_id) === auditoriaId);
      setPlantillas(plantillasBiblioteca.map(mapDoc));
      setDocumentosSubidos(subidos.map(mapDoc));
      setRequeridosCount((requeridasData || []).length);
    } catch (e) {
      console.error('Error cargando documentos por etapa:', e);
      setPlantillas([]);
      setDocumentosSubidos([]);
      setRequeridosCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDocumentos();
  }, [auditoriaId, etapa]);

  const handleDescargar = async (doc: DocEtapa) => {
    try {
      const url = doc.urlDownload.startsWith('http') ? doc.urlDownload : `${window.location.origin}${doc.urlDownload}`;
      const res = await fetch(url, { headers: getDefaultHeaders() });
      if (!res.ok) {
        throw new Error(res.status === 401 ? 'No autorizado. Inicia sesión nuevamente.' : `Error ${res.status}`);
      }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = doc.nombre || 'documento';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      toast.success('Descarga iniciada');
    } catch (e) {
      console.error('Error al descargar:', e);
      toast.error(e instanceof Error ? e.message : 'Error al descargar');
    }
  };

  const handleEliminar = async () => {
    if (!docAEliminar) return;
    try {
      await controlInternoService.deleteDocumento(docAEliminar.id);
      setDocumentosSubidos((p) => p.filter((d) => d.id !== docAEliminar.id));
      toast.success('Documento eliminado');
      setDocAEliminar(null);
    } catch {
      toast.error('No se pudo eliminar');
    }
  };

  const requeridos = requeridosCount;
  const totalAsociados = documentosSubidos.length;
  const cumpleRequisitos = requeridos === 0 || totalAsociados >= requeridos;
  const hayPlantillas = plantillas.length > 0;
  const hayDocumentos = hayPlantillas || documentosSubidos.length > 0;

  return (
    <div className={`bg-white border-2 ${config.borderClass} rounded-lg p-4 space-y-4`}>
      {hayDocumentos && (
        <div className={`rounded-lg p-3 flex items-center gap-2 ${cumpleRequisitos ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
          {cumpleRequisitos ? (
            <p className="text-sm font-semibold text-green-800 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-xs">✓</span>
              {requeridos === 0 ? 'Sin plantillas requeridas para esta etapa' : 'Documentos completos'}
            </p>
          ) : (
            <p className="text-sm font-semibold text-amber-800">
              Faltan documentos por subir ({totalAsociados}/{requeridos})
            </p>
          )}
        </div>
      )}

      <div>
        <h4 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Documentos de {config.label} (plantillas requeridas: descarga, diligencia y sube el documento cumplido)
        </h4>
        {loading ? (
          <p className="text-sm text-gray-500">Cargando...</p>
        ) : !hayPlantillas ? (
          <>
            <p className="text-sm text-gray-500 mb-3">No hay plantillas en la biblioteca para esta etapa. Contacte al administrador si debe haberlas.</p>
            {documentosSubidos.length > 0 && (
              <div className="mt-4">
                <h5 className="text-xs font-semibold text-gray-600 mb-2">Documentos subidos en {config.label}</h5>
                <ul className="space-y-2">
                  {documentosSubidos.map((d) => (
                    <li key={d.id} className="p-3 rounded-lg border bg-green-50 border-green-200 flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{d.nombre}</p>
                        <p className="text-xs text-gray-500">{d.extension} · {d.tamano}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button type="button" onClick={() => handleDescargar(d)} className="px-2 py-1.5 bg-green-100 hover:bg-green-200 text-green-700 rounded text-xs font-bold flex items-center gap-1" title="Descargar documento">
                          <Download className="w-3.5 h-3.5" /> Descargar
                        </button>
                        <button type="button" onClick={() => setDocAEliminar(d)} className="px-2 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded text-xs font-bold flex items-center gap-1" title="Eliminar">
                          <Trash2 className="w-3.5 h-3.5" /> Eliminar
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <ul className="space-y-2">
            {plantillas.map((p) => {
              const docSubido = documentosSubidos.find((d) => {
                const bibId = d.documentoBibliotecaId;
                if (bibId && bibId === p.id) return true;
                if (!bibId && d.nombre && p.nombre && d.nombre.trim().toLowerCase() === p.nombre.trim().toLowerCase()) return true;
                return false;
              });
              const subido = !!docSubido;
              return (
                <li key={p.id} className={`p-3 rounded-lg border space-y-2 ${subido ? 'bg-green-50 border-green-200' : config.bgClass + ' ' + config.borderClass}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{p.nombre}</p>
                      {p.descripcion && <p className="text-xs text-gray-600 truncate">{p.descripcion}</p>}
                      <p className="text-xs text-gray-500">{p.extension} · {p.tamano}</p>
                      {subido && docSubido && (
                        <p className="text-xs text-green-700 font-medium mt-1">✓ Documento subido: {docSubido.nombre}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button type="button" onClick={() => handleDescargar(p)} className="px-2 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-xs font-bold flex items-center gap-1" title="Descargar plantilla vacía">
                        <Download className="w-3.5 h-3.5" /> Plantilla
                      </button>
                      {subido && docSubido ? (
                        <>
                          <button type="button" onClick={() => handleDescargar(docSubido)} className="px-2 py-1.5 bg-green-100 hover:bg-green-200 text-green-700 rounded text-xs font-bold flex items-center gap-1" title="Descargar documento diligenciado">
                            <Download className="w-3.5 h-3.5" /> Documento
                          </button>
                          <button type="button" onClick={() => setDocAEliminar(docSubido)} className="px-2 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded text-xs font-bold flex items-center gap-1" title="Eliminar documento">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <button type="button" onClick={() => setPlantillaParaSubir(p)} className={`px-2 py-1.5 ${config.accentClass} hover:opacity-90 text-white rounded text-xs font-bold flex items-center gap-1`}>
                          <Upload className="w-3.5 h-3.5" /> Subir
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {plantillaParaSubir && (
        <ModalSubirPorEtapa
          auditoriaId={auditoriaId}
          etapa={etapa}
          documentoBibliotecaId={plantillaParaSubir.id}
          plantillaNombre={plantillaParaSubir.nombre}
          onClose={() => setPlantillaParaSubir(null)}
          onSubido={() => {
            setPlantillaParaSubir(null);
            cargarDocumentos();
          }}
        />
      )}
      {docAEliminar && (
        <ModalEliminar doc={docAEliminar} onClose={() => setDocAEliminar(null)} onConfirmar={handleEliminar} />
      )}
    </div>
  );
}

function ModalSubirPorEtapa({
  auditoriaId,
  etapa,
  documentoBibliotecaId,
  plantillaNombre,
  onClose,
  onSubido,
}: {
  auditoriaId: string;
  etapa: EtapaDocumentos;
  documentoBibliotecaId: string;
  plantillaNombre: string;
  onClose: () => void;
  onSubido: () => void;
}) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setArchivo(f);
  };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setArrastrando(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setArrastrando(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setArrastrando(false);
    const f = e.dataTransfer.files?.[0];
    if (f) setArchivo(f);
  };

  const submit = async () => {
    if (!archivo) {
      toast.error('Selecciona un archivo');
      return;
    }
    setSubiendo(true);
    try {
      await controlInternoService.createDocumento(archivo, {
        nombre: plantillaNombre,
        descripcion: '',
        tipoDocumento: 'plantilla',
        etapa,
        auditoriaId,
        documentoBibliotecaId,
      });
      toast.success('Documento subido correctamente');
      onSubido();
    } catch {
      toast.error('Error al subir');
    } finally {
      setSubiendo(false);
    }
  };

  const config = ETAPA_CONFIG[etapa];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className={`flex-shrink-0 ${config.accentClass} text-white p-6 rounded-t-xl`}>
          <div className="flex items-center justify-between">
            <div className="flex-1 pr-4">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black">Subir documento</h2>
                  <p className="text-sm text-white/90">Plantilla: {plantillaNombre}</p>
                </div>
              </div>
            </div>
            <button type="button" onClick={onClose} className="flex-shrink-0 p-2 hover:bg-white/20 rounded-lg transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
        <div className="flex-1 p-6 space-y-4">
          <label className="block text-sm font-bold text-gray-900 mb-2">Archivo <span className="text-red-600">*</span></label>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-all ${
              arrastrando ? 'border-gray-500 bg-gray-50' : archivo ? 'border-green-500 bg-green-50' : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-50'
            }`}
          >
            {archivo ? (
              <div className="space-y-3">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <FileText className="w-7 h-7 text-green-600" />
                </div>
                <p className="font-bold text-gray-900">{archivo.name}</p>
                <p className="text-sm text-gray-600">{formatFileSize(archivo.size)} · {archivo.name.split('.').pop()?.toUpperCase() || 'FILE'}</p>
                <button type="button" onClick={() => setArchivo(null)} className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-semibold text-sm">
                  Quitar archivo
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                  <Upload className="w-7 h-7 text-gray-600" />
                </div>
                <p className="font-bold text-gray-900">Arrastra el archivo aquí</p>
                <p className="text-sm text-gray-600">o haz clic para seleccionar</p>
                <label className="inline-block px-5 py-2.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-bold cursor-pointer text-sm">
                  Seleccionar archivo
                  <input type="file" onChange={handleFileSelect} className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" />
                </label>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500">Se guardará asociado a esta auditoría y a la plantilla &quot;{plantillaNombre}&quot;.</p>
        </div>
        <div className="flex-shrink-0 bg-gray-50 border-t border-gray-200 p-4 rounded-b-xl flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 border-2 border-gray-300 rounded-lg font-bold text-gray-700 hover:bg-gray-100">Cancelar</button>
          <button type="button" onClick={submit} disabled={!archivo || subiendo} className={`flex-1 py-2.5 ${config.accentClass} text-white rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90`}>
            <Upload className="w-4 h-4" />
            {subiendo ? 'Subiendo...' : 'Subir'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ModalEliminar({ doc, onClose, onConfirmar }: { doc: DocEtapa; onClose: () => void; onConfirmar: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex-shrink-0 bg-gradient-to-r from-red-600 to-red-700 text-white p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black">Eliminar documento</h2>
                <p className="text-sm text-red-100">Esta acción no se puede deshacer</p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-gray-700 font-semibold">{doc.nombre}</p>
            <p className="text-xs text-gray-600 mt-1">{doc.extension} · {doc.tamano}</p>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border-2 border-gray-300 rounded-lg font-bold text-gray-700 hover:bg-gray-100">Cancelar</button>
            <button type="button" onClick={onConfirmar} className="flex-1 py-2.5 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700">Eliminar</button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
