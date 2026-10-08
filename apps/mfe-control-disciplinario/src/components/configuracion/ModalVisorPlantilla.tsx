/**
 * MODAL VISOR DE PLANTILLAS - Control Interno Disciplinario
 * Previsualización directa y descarga para Plantillas de Oficios y Plantillas de Actas (Word / PDF)
 * ✅ Soporta .docx (vía mammoth -> HTML formateado tipo hoja de documento)
 * ✅ Soporta .pdf (vía iframe nativo interactivo con scroll y zoom)
 * ✅ Descarga consistente en ambos tipos de plantillas
 * ✅ Selector de versiones si existen múltiples plantillas asociadas
 * ✅ Controles de zoom y pantalla completa
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Download, FileText, File, AlertCircle, Loader2,
  ZoomIn, ZoomOut, Maximize2, Minimize2, RefreshCw,
  CheckCircle2, Info, Eye, ExternalLink, Calendar,
  HardDrive, Layers
} from 'lucide-react';
import * as mammoth from 'mammoth';
import { toast } from 'sonner';
import disciplinaryService from '../../../../services/api/disciplinary.service';
import type { PlantillaArchivo } from './SeccionPlantillasOficiosUnificada';

interface ModalVisorPlantillaProps {
  isOpen: boolean;
  onClose: () => void;
  titulo: string;
  subtitulo?: string;
  descripcion?: string;
  tipoPlantilla: 'oficio' | 'acta';
  plantillas: PlantillaArchivo[];
  categoriaBadge?: {
    label: string;
    color?: string;
  };
  colorTema?: string;
}

export function ModalVisorPlantilla({
  isOpen,
  onClose,
  titulo,
  subtitulo,
  descripcion,
  tipoPlantilla,
  plantillas = [],
  categoriaBadge,
  colorTema = '#8B5CF6'
}: ModalVisorPlantillaProps) {
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState<PlantillaArchivo | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [docxHtml, setDocxHtml] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [formato, setFormato] = useState<'docx' | 'pdf' | 'doc_legacy' | 'imagen' | 'otro'>('docx');
  const [zoomLevel, setZoomLevel] = useState(100);
  const [pantallaCompleta, setPantallaCompleta] = useState(false);
  const [descargando, setDescargando] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Inicializar plantilla seleccionada al abrir o cuando cambian las plantillas
  useEffect(() => {
    if (isOpen && plantillas.length > 0) {
      // Priorizar plantilla activa
      const activa = plantillas.find(p => p.activo) || plantillas[0];
      setPlantillaSeleccionada(activa);
    } else {
      setPlantillaSeleccionada(null);
    }
    setZoomLevel(100);
    setError(null);
  }, [isOpen, plantillas]);

  // Cargar y procesar el documento cuando cambia la plantilla seleccionada
  useEffect(() => {
    if (!isOpen || !plantillaSeleccionada) {
      setDocxHtml(null);
      setPdfUrl(null);
      setCargando(false);
      setError(null);
      return;
    }

    let isCancelled = false;
    let createdBlobUrl: string | null = null;

    const cargarDocumento = async () => {
      try {
        setCargando(true);
        setError(null);
        setDocxHtml(null);
        setPdfUrl(null);

        const nombre = (plantillaSeleccionada.nombreArchivo || plantillaSeleccionada.nombre || '').toLowerCase();
        const urlRaw = plantillaSeleccionada.url || '';

        // Detectar formato
        const isPdf = nombre.endsWith('.pdf') || urlRaw.toLowerCase().includes('.pdf');
        const isLegacyDoc = nombre.endsWith('.doc') || nombre.endsWith('.dot') || nombre.endsWith('.rtf');
        const isImage = /\.(jpe?g|png|webp|gif|svg)$/i.test(nombre) || /\.(jpe?g|png|webp|gif|svg)$/i.test(urlRaw);
        const isDocx = !isPdf && !isLegacyDoc && !isImage;

        if (isLegacyDoc) {
          if (!isCancelled) {
            setFormato('doc_legacy');
            setCargando(false);
          }
          return;
        }

        if (isImage) {
          const imgUrl = plantillaSeleccionada.file
            ? URL.createObjectURL(plantillaSeleccionada.file)
            : (urlRaw.startsWith('blob:') || /^https?:\/\//i.test(urlRaw)
              ? urlRaw
              : disciplinaryService.getAbsoluteFileUrl(urlRaw));
          if (plantillaSeleccionada.file) {
            createdBlobUrl = imgUrl;
          }
          if (!isCancelled) {
            setPdfUrl(imgUrl);
            setFormato('imagen');
            setCargando(false);
          }
          return;
        }

        if (isPdf) {
          let resolvedPdfUrl = '';
          if (plantillaSeleccionada.file) {
            resolvedPdfUrl = URL.createObjectURL(plantillaSeleccionada.file);
            createdBlobUrl = resolvedPdfUrl;
          } else if (urlRaw.startsWith('blob:') || /^https?:\/\//i.test(urlRaw)) {
            resolvedPdfUrl = urlRaw;
          } else if (urlRaw) {
            resolvedPdfUrl = disciplinaryService.getAbsoluteFileUrl(urlRaw);
          }

          if (!isCancelled) {
            setPdfUrl(resolvedPdfUrl);
            setFormato('pdf');
            setCargando(false);
          }
          return;
        }

        // Caso DOCX: Usar mammoth para convertir ArrayBuffer a HTML
        setFormato('docx');

        let arrayBuffer: ArrayBuffer;

        if (plantillaSeleccionada.file) {
          arrayBuffer = await plantillaSeleccionada.file.arrayBuffer();
        } else if (urlRaw) {
          const fetchUrl = urlRaw.startsWith('blob:') || /^https?:\/\//i.test(urlRaw)
            ? urlRaw
            : disciplinaryService.getAbsoluteFileUrl(urlRaw);

          const response = await fetch(fetchUrl, {
            method: 'GET',
            credentials: 'include'
          });

          if (!response.ok) {
            throw new Error(`No se pudo obtener el archivo desde el servidor (HTTP ${response.status})`);
          }

          arrayBuffer = await response.arrayBuffer();
        } else {
          throw new Error('La plantilla no dispone de una URL o archivo para previsualizar');
        }

        if (isCancelled) return;

        const result = await mammoth.convertToHtml({ arrayBuffer });
        const html = result.value;

        if (!isCancelled) {
          setDocxHtml(html || '<p class="text-gray-500 italic text-center p-8">El documento Word está vacío.</p>');
          setCargando(false);
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.error('Error al previsualizar plantilla:', err);
          setError(err?.message || 'Error desconocido al procesar el archivo');
          setCargando(false);
        }
      }
    };

    cargarDocumento();

    return () => {
      isCancelled = true;
      if (createdBlobUrl) {
        URL.revokeObjectURL(createdBlobUrl);
      }
    };
  }, [isOpen, plantillaSeleccionada]);

  if (!isOpen) return null;

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleDescargar = async (plantilla?: PlantillaArchivo | null) => {
    const target = plantilla || plantillaSeleccionada;
    if (!target) return;

    try {
      setDescargando(true);
      const filename = target.nombreArchivo || target.nombre || `plantilla-${Date.now()}`;

      if (target.file) {
        const objUrl = URL.createObjectURL(target.file);
        const a = document.createElement('a');
        a.href = objUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(objUrl);
        toast.success('Plantilla descargada', { description: filename });
        return;
      }

      if (target.url) {
        await disciplinaryService.downloadFileFromUrl(target.url, filename);
        toast.success('Plantilla descargada correctamente', { description: filename });
        return;
      }

      toast.error('No se encontró archivo para descargar');
    } catch (err: any) {
      console.error('Error en descarga:', err);
      // Fallback
      if (target.url) {
        try {
          const directUrl = disciplinaryService.getAbsoluteFileUrl(target.url);
          const a = document.createElement('a');
          a.href = directUrl;
          a.download = target.nombreArchivo || target.nombre || 'plantilla';
          a.target = '_blank';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          toast.success('Descarga iniciada');
          return;
        } catch {
          // ignora
        }
      }
      toast.error('Error al descargar plantilla', { description: err?.message || 'Intente de nuevo' });
    } finally {
      setDescargando(false);
    }
  };

  const zoomIn = () => setZoomLevel(prev => Math.min(prev + 15, 175));
  const zoomOut = () => setZoomLevel(prev => Math.max(prev - 15, 60));
  const resetZoom = () => setZoomLevel(100);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto"
      style={{ zIndex: 1000 }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.18 }}
        className={`bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-200 border border-slate-200 ${
          pantallaCompleta 
            ? 'w-full h-full max-w-none max-h-none rounded-none' 
            : 'w-full max-w-6xl max-h-[92vh] h-[90vh]'
        }`}
      >
        {/* ================= HEADER ================= */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0 shadow-sm"
              style={{ backgroundColor: colorTema }}
            >
              <FileText className="w-5 h-5" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 truncate">
                  {titulo}
                </h3>
                {categoriaBadge && (
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-semibold text-white shadow-xs"
                    style={{ backgroundColor: categoriaBadge.color || colorTema }}
                  >
                    {categoriaBadge.label}
                  </span>
                )}
                {plantillaSeleccionada && (
                  <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    v{plantillaSeleccionada.version || '1.0'}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5 truncate">
                {subtitulo || (tipoPlantilla === 'oficio' ? 'Plantilla oficial de Oficio' : 'Plantilla oficial de Acta')}
                {plantillaSeleccionada?.nombreArchivo && ` • ${plantillaSeleccionada.nombreArchivo}`}
              </p>
            </div>
          </div>

          {/* Acciones principales del Header */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {/* Botón Descargar */}
            {plantillaSeleccionada && (
              <button
                onClick={() => handleDescargar(plantillaSeleccionada)}
                disabled={descargando}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-semibold text-xs sm:text-sm text-white shadow-sm hover:shadow transition-all disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
                title="Descargar documento completo"
              >
                {descargando ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">Descargar Plantilla</span>
                <span className="sm:hidden">Descargar</span>
              </button>
            )}

            {/* Controles de zoom (solo para vista DOCX) */}
            {formato === 'docx' && docxHtml && (
              <div className="hidden md:flex items-center bg-gray-100 rounded-xl p-0.5 border border-gray-200">
                <button
                  onClick={zoomOut}
                  className="p-1.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-white transition-colors"
                  title="Alejar"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={resetZoom}
                  className="px-2 text-xs font-semibold text-gray-700 hover:text-gray-900"
                  title="Restablecer zoom"
                >
                  {zoomLevel}%
                </button>
                <button
                  onClick={zoomIn}
                  className="p-1.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-white transition-colors"
                  title="Acercar"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Pantalla completa */}
            <button
              onClick={() => setPantallaCompleta(!pantallaCompleta)}
              className="p-2 rounded-xl text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors hidden sm:inline-flex"
              title={pantallaCompleta ? 'Salir de pantalla completa' : 'Pantalla completa'}
            >
              {pantallaCompleta ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Cerrar modal */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ================= SUB-BAR / TABS DE PLANTILLAS ================= */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 flex-wrap flex-shrink-0">
          {/* Si hay múltiples plantillas, mostrar selector */}
          {plantillas.length > 1 ? (
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 flex-1 min-w-0">
              <span className="text-xs font-bold text-gray-600 mr-1 flex items-center gap-1 flex-shrink-0">
                <Layers className="w-3.5 h-3.5" />
                Versiones ({plantillas.length}):
              </span>
              {plantillas.map(p => {
                const esActiva = plantillaSeleccionada?.id === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setPlantillaSeleccionada(p)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 flex-shrink-0 ${
                      esActiva
                        ? 'bg-white text-gray-900 shadow-sm border border-slate-300 ring-2'
                        : 'text-gray-600 hover:bg-white/60 hover:text-gray-900 border border-transparent'
                    }`}
                    style={{ ringColor: esActiva ? colorTema : 'transparent' }}
                  >
                    <span>{p.nombre}</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-100 font-mono text-slate-600">
                      v{p.version || '1.0'}
                    </span>
                    {p.activo && (
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" title="Activa" />
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-xs text-gray-600 flex items-center gap-2 truncate">
              {descripcion && (
                <span className="text-gray-700 truncate max-w-xl">
                  {descripcion}
                </span>
              )}
            </div>
          )}

          {/* Información complementaria del archivo actual */}
          {plantillaSeleccionada && (
            <div className="flex items-center gap-3 text-xs text-gray-500 ml-auto flex-shrink-0">
              <span className="hidden md:inline-flex items-center gap-1">
                <File className="w-3.5 h-3.5 text-gray-400" />
                <span className="font-mono text-gray-600 font-medium truncate max-w-[200px]">
                  {plantillaSeleccionada.nombreArchivo}
                </span>
              </span>
              {plantillaSeleccionada.tamano > 0 && (
                <span className="hidden sm:inline-flex items-center gap-1">
                  <HardDrive className="w-3.5 h-3.5 text-gray-400" />
                  <span>{formatBytes(plantillaSeleccionada.tamano)}</span>
                </span>
              )}
              {plantillaSeleccionada.fechaModificacion && (
                <span className="hidden lg:inline-flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  <span>{new Date(plantillaSeleccionada.fechaModificacion).toLocaleDateString('es-CO')}</span>
                </span>
              )}
            </div>
          )}
        </div>

        {/* ================= CONTENEDOR DE PREVISUALIZACIÓN ================= */}
        <div 
          ref={containerRef}
          className="flex-1 min-h-0 bg-slate-100/90 overflow-y-auto relative flex flex-col"
        >
          {/* Estado: Sin plantillas configuradas */}
          {plantillas.length === 0 && (
            <div className="m-auto text-center p-8 max-w-md">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 border-2 border-amber-200 flex items-center justify-center mx-auto mb-4 text-amber-600 shadow-sm">
                <FileText className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-bold text-gray-800 mb-1">
                Sin plantilla cargada
              </h4>
              <p className="text-sm text-gray-500 mb-4">
                Este tipo de documento aún no tiene una plantilla Word o PDF asociada.
              </p>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-gray-200 text-gray-700 font-semibold text-xs hover:bg-gray-300 transition-colors"
              >
                Cerrar ventana
              </button>
            </div>
          )}

          {/* Estado: Cargando documento */}
          {cargando && (
            <div className="m-auto text-center p-10">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white shadow-md animate-pulse"
                style={{ backgroundColor: colorTema }}
              >
                <Loader2 className="w-7 h-7 animate-spin" />
              </div>
              <h4 className="text-base font-bold text-gray-800 mb-1">
                Cargando previsualización...
              </h4>
              <p className="text-xs text-gray-500">
                Procesando el documento para su visualización completa
              </p>
            </div>
          )}

          {/* Estado: Error de carga */}
          {!cargando && error && (
            <div className="m-auto text-center p-8 max-w-md bg-white rounded-2xl border border-red-200 shadow-sm">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
              <h4 className="text-base font-bold text-gray-900 mb-1">
                No se pudo previsualizar el documento
              </h4>
              <p className="text-xs text-gray-600 mb-4">
                {error}
              </p>
              <div className="flex items-center justify-center gap-2">
                {plantillaSeleccionada && (
                  <button
                    onClick={() => handleDescargar(plantillaSeleccionada)}
                    className="px-4 py-2 bg-green-600 text-white rounded-xl text-xs font-semibold hover:bg-green-700 transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Descargar de todas formas
                  </button>
                )}
                <button
                  onClick={() => {
                    const act = plantillaSeleccionada;
                    setPlantillaSeleccionada(null);
                    setTimeout(() => setPlantillaSeleccionada(act), 50);
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-200 transition-colors flex items-center gap-1.5 border border-gray-300"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reintentar
                </button>
              </div>
            </div>
          )}

          {/* Estado: Archivo DOC Legacy (.doc) */}
          {!cargando && !error && formato === 'doc_legacy' && (
            <div className="m-auto text-center p-8 max-w-md bg-white rounded-2xl border border-blue-200 shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center mx-auto mb-4 text-blue-600 shadow-sm">
                <FileText className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-gray-900 mb-1">
                Documento de Microsoft Word (.doc)
              </h4>
              <p className="text-xs text-gray-600 mb-5 leading-relaxed">
                El formato binario legacy (.doc) requiere ser abierto directamente en Microsoft Word.
                Para previsualización directa en el navegador, se recomienda utilizar formato moderno (.docx) o PDF.
              </p>
              {plantillaSeleccionada && (
                <button
                  onClick={() => handleDescargar(plantillaSeleccionada)}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto shadow-md"
                >
                  <Download className="w-4 h-4" />
                  Descargar archivo .doc
                </button>
              )}
            </div>
          )}

          {/* Vista: Documento PDF (iframe interactivo) */}
          {!cargando && !error && formato === 'pdf' && pdfUrl && (
            <div className="w-full h-full p-2 sm:p-4 flex flex-col flex-1 min-h-[500px]">
              <iframe
                src={`${pdfUrl}#toolbar=1&navpanes=0&scrollbar=1`}
                className="w-full h-full flex-1 border-0 rounded-xl shadow-lg bg-white"
                style={{ minHeight: '620px' }}
                title={plantillaSeleccionada?.nombre || 'Vista previa PDF'}
              />
            </div>
          )}

          {/* Vista: Imagen */}
          {!cargando && !error && formato === 'imagen' && pdfUrl && (
            <div className="m-auto p-4 flex items-center justify-center">
              <img
                src={pdfUrl}
                alt={plantillaSeleccionada?.nombre || 'Plantilla'}
                className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-xl bg-white p-2"
              />
            </div>
          )}

          {/* Vista: Documento Word (.docx) convertido a HTML */}
          {!cargando && !error && formato === 'docx' && docxHtml && (
            <div className="p-4 sm:p-8 flex justify-center flex-1">
              <div
                className="bg-white shadow-2xl rounded-sm border border-slate-300 text-gray-900 transition-transform origin-top"
                style={{
                  width: `${Math.round(820 * (zoomLevel / 100))}px`,
                  minWidth: '320px',
                  minHeight: '1056px',
                  padding: `${Math.round(56 * (zoomLevel / 100))}px`,
                  fontSize: `${Math.round(14 * (zoomLevel / 100))}px`,
                  fontFamily: 'Calibri, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
                  lineHeight: 1.6
                }}
              >
                {/* Estilos enriquecidos para maquetar el documento como página oficial */}
                <style>{`
                  .docx-document-sheet p {
                    margin-bottom: 0.85em;
                    text-align: justify;
                    line-height: 1.65;
                  }
                  .docx-document-sheet h1 {
                    font-size: 1.6em;
                    font-weight: 800;
                    margin-top: 1em;
                    margin-bottom: 0.5em;
                    color: #0f172a;
                    text-align: center;
                  }
                  .docx-document-sheet h2 {
                    font-size: 1.3em;
                    font-weight: 700;
                    margin-top: 0.8em;
                    margin-bottom: 0.4em;
                    color: #1e293b;
                  }
                  .docx-document-sheet h3 {
                    font-size: 1.15em;
                    font-weight: 700;
                    margin-top: 0.6em;
                    margin-bottom: 0.3em;
                    color: #334155;
                  }
                  .docx-document-sheet ul, .docx-document-sheet ol {
                    margin-left: 2em;
                    margin-bottom: 0.85em;
                  }
                  .docx-document-sheet ul {
                    list-style-type: disc;
                  }
                  .docx-document-sheet ol {
                    list-style-type: decimal;
                  }
                  .docx-document-sheet li {
                    margin-bottom: 0.35em;
                  }
                  .docx-document-sheet table {
                    border-collapse: collapse;
                    width: 100%;
                    margin: 1.2em 0;
                    font-size: 0.95em;
                  }
                  .docx-document-sheet td, .docx-document-sheet th {
                    border: 1px solid #cbd5e1;
                    padding: 8px 12px;
                    vertical-align: top;
                  }
                  .docx-document-sheet th {
                    background-color: #f1f5f9;
                    font-weight: 700;
                    text-align: left;
                  }
                  .docx-document-sheet img {
                    max-width: 100%;
                    height: auto;
                    display: block;
                    margin: 1em auto;
                  }
                  .docx-document-sheet blockquote {
                    border-left: 4px solid #94a3b8;
                    padding-left: 1em;
                    margin: 1em 0;
                    color: #475569;
                    font-style: italic;
                  }
                  .docx-document-sheet strong, .docx-document-sheet b {
                    font-weight: 700;
                    color: #0f172a;
                  }
                `}</style>

                <div
                  className="docx-document-sheet select-text"
                  dangerouslySetInnerHTML={{ __html: docxHtml }}
                />
              </div>
            </div>
          )}
        </div>

        {/* ================= FOOTER ================= */}
        <div className="bg-white border-t border-gray-200 px-4 sm:px-6 py-3 flex items-center justify-between flex-wrap gap-2 flex-shrink-0">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              Previsualización generada para consulta y validación
            </span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {plantillaSeleccionada && (
              <button
                onClick={() => handleDescargar(plantillaSeleccionada)}
                disabled={descargando}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white transition-all shadow-sm flex items-center gap-1.5"
                style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
              >
                {descargando ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Descargar Documento
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors border border-gray-300"
            >
              Cerrar
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
