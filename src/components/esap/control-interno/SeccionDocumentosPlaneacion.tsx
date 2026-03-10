/**
 * Sección de Documentos de Planeación - Expediente de Auditoría
 * - Plantillas: lo que tienes que hacer (maestro) → Descargar plantilla
 * - Documentos subidos: lo que hiciste → Subir, Descargar, Eliminar
 */

import { useState, useEffect } from 'react';
import { FileText, Upload, Download, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { controlInternoService } from '../../../services/api/controlInternoService';
import { getServiceUrl, API_MODE } from '../../../config/environment';

const getDocumentosBaseUrl = () => {
  if (API_MODE === 'gateway') return '/services/control-institucional/api/v1/documentos';
  return `${getServiceUrl('control-institucional')}/documentos`;
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
};

/** Mínimo de documentos requeridos (si no hay plantillas en biblioteca) */
const MIN_DOCUMENTOS_REQUERIDOS = 1;

interface DocPlaneacion {
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

interface SeccionDocumentosPlaneacionProps {
  auditoriaId: string;
}

export function SeccionDocumentosPlaneacion({ auditoriaId }: SeccionDocumentosPlaneacionProps) {
  const [plantillas, setPlantillas] = useState<DocPlaneacion[]>([]);
  const [documentosSubidos, setDocumentosSubidos] = useState<DocPlaneacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [plantillaParaSubir, setPlantillaParaSubir] = useState<DocPlaneacion | null>(null);
  const [docAEliminar, setDocAEliminar] = useState<DocPlaneacion | null>(null);

  const baseUrl = getDocumentosBaseUrl();

  const mapDoc = (d: any) => ({
    id: d.id,
    nombre: d.nombre || 'Sin nombre',
    descripcion: d.descripcion || '',
    extension: d.nombreArchivo?.split('.').pop()?.toUpperCase() || 'FILE',
    tamano: formatFileSize(Number(d.tamanioBytes) || 0),
    urlDownload: `${baseUrl}/${d.id}/download`,
    urlPreview: `${baseUrl}/${d.id}/preview`,
    auditoriaId: d.auditoriaId,
    documentoBibliotecaId: d.documentoBibliotecaId ?? d.documento_biblioteca_id,
  });

  const cargarDocumentos = async () => {
    setLoading(true);
    try {
      const [todos, subidos] = await Promise.all([
        controlInternoService.getDocumentos({ etapa: 'planeacion' }),
        controlInternoService.getDocumentosByEtapa(auditoriaId, 'planeacion'),
      ]);
      const plantillasData = (todos || []).filter((d: any) => !d.auditoriaId);
      const subidosData = (subidos || []).filter((d: any) => d.auditoriaId === auditoriaId);
      setPlantillas(plantillasData.map(mapDoc));
      setDocumentosSubidos(subidosData.map(mapDoc));
    } catch (e) {
      console.error('Error cargando documentos planeación:', e);
      setPlantillas([]);
      setDocumentosSubidos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDocumentos();
  }, [auditoriaId]);

  const handleDescargar = (doc: DocPlaneacion) => {
    const link = document.createElement('a');
    link.href = doc.urlDownload;
    link.download = doc.nombre;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Descarga iniciada');
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

  const requeridos = Math.max(plantillas.length, MIN_DOCUMENTOS_REQUERIDOS);
  const totalAsociados = documentosSubidos.length;
  const cumpleRequisitos = totalAsociados >= requeridos;

  return (
    <div className="bg-white border-2 border-purple-200 rounded-lg p-4 space-y-4">
      {/* Indicador de completitud - solo verde cuando cumple */}
      <div className={`rounded-lg p-3 flex items-center gap-2 ${cumpleRequisitos ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
        {cumpleRequisitos ? (
          <p className="text-sm font-semibold text-green-800 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-xs">✓</span>
            Documentos completos
          </p>
        ) : (
          <p className="text-sm font-semibold text-amber-800">Faltan documentos por subir</p>
        )}
      </div>

      {/* Plantillas de biblioteca: cada una con Descargar + Subir (documento que cumple) */}
      <div>
        <h4 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
          <FileText className="w-4 h-4 text-purple-600" />
          Plantillas (descarga, diligencia y sube el documento cumplido)
        </h4>
        {loading ? (
          <p className="text-sm text-gray-500">Cargando...</p>
        ) : plantillas.length === 0 ? (
          <p className="text-sm text-gray-500">No hay plantillas en la biblioteca. Contacte al administrador.</p>
        ) : (
          <ul className="space-y-2">
            {plantillas.map((p) => {
              const docSubido = documentosSubidos.find(d => {
                const bibId = d.documentoBibliotecaId ?? (d as any).documento_biblioteca_id;
                if (bibId && bibId === p.id) return true;
                if (!bibId && d.nombre && p.nombre && d.nombre.trim().toLowerCase() === p.nombre.trim().toLowerCase()) return true;
                return false;
              });
              const subido = !!docSubido;
              return (
                <li key={p.id} className={`p-3 rounded-lg border space-y-2 ${subido ? 'bg-green-50 border-green-200' : 'bg-purple-50 border-purple-200'}`}>
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
                      <button
                        onClick={() => handleDescargar(p)}
                        className="p-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded"
                        title="Descargar plantilla"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      {subido && docSubido ? (
                        <>
                          <button
                            onClick={() => handleDescargar(docSubido)}
                            className="p-2 bg-green-100 hover:bg-green-200 text-green-700 rounded"
                            title="Ver/Descargar documento"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDocAEliminar(docSubido)}
                            className="px-2 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded text-xs font-bold flex items-center gap-1"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Eliminar
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setPlantillaParaSubir(p)}
                          className="px-2 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-bold flex items-center gap-1"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          Subir
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
        <ModalSubirPlaneacion
          auditoriaId={auditoriaId}
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
        <ModalEliminarPlaneacion
          doc={docAEliminar}
          onClose={() => setDocAEliminar(null)}
          onConfirmar={handleEliminar}
        />
      )}
    </div>
  );
}

const formatFileSizeModal = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
};

function ModalSubirPlaneacion({
  auditoriaId,
  documentoBibliotecaId,
  plantillaNombre,
  onClose,
  onSubido,
}: {
  auditoriaId: string;
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
        etapa: 'planeacion',
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex-1 pr-4">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black">Subir documento</h2>
                  <p className="text-sm text-purple-100">Plantilla: {plantillaNombre}</p>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="flex-shrink-0 p-2 hover:bg-white/20 rounded-lg transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Contenido - Zona Drag & Drop */}
        <div className="flex-1 p-6 space-y-4">
          <label className="block text-sm font-bold text-gray-900 mb-2">Archivo <span className="text-red-600">*</span></label>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-all ${
              arrastrando ? 'border-purple-500 bg-purple-50' :
              archivo ? 'border-green-500 bg-green-50' :
              'border-gray-300 bg-gray-50 hover:border-purple-400 hover:bg-purple-50'
            }`}
          >
            {archivo ? (
              <div className="space-y-3">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <FileText className="w-7 h-7 text-green-600" />
                </div>
                <p className="font-bold text-gray-900">{archivo.name}</p>
                <p className="text-sm text-gray-600">{formatFileSizeModal(archivo.size)} • {archivo.name.split('.').pop()?.toUpperCase() || 'FILE'}</p>
                <button
                  onClick={() => setArchivo(null)}
                  className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-semibold text-sm"
                >
                  Quitar archivo
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
                  <Upload className="w-7 h-7 text-purple-600" />
                </div>
                <p className="font-bold text-gray-900">Arrastra el archivo aquí</p>
                <p className="text-sm text-gray-600">o haz clic para seleccionar</p>
                <label className="inline-block px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold cursor-pointer text-sm">
                  Seleccionar archivo
                  <input type="file" onChange={handleFileSelect} className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" />
                </label>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500">Se guardará asociado a esta auditoría y a la plantilla &quot;{plantillaNombre}&quot;.</p>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 bg-gray-50 border-t border-gray-200 p-4 rounded-b-xl flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border-2 border-gray-300 rounded-lg font-bold text-gray-700 hover:bg-gray-100">
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={!archivo || subiendo}
            className="flex-1 py-2.5 bg-purple-600 text-white rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-purple-700"
          >
            <Upload className="w-4 h-4" />
            {subiendo ? 'Subiendo...' : 'Subir'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ModalEliminarPlaneacion({
  doc,
  onClose,
  onConfirmar,
}: {
  doc: DocPlaneacion;
  onClose: () => void;
  onConfirmar: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
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
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg">
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
            <button onClick={onClose} className="flex-1 py-2.5 border-2 border-gray-300 rounded-lg font-bold text-gray-700 hover:bg-gray-100">
              Cancelar
            </button>
            <button onClick={onConfirmar} className="flex-1 py-2.5 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700">
              Eliminar
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
