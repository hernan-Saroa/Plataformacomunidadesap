/**
 * Visor de evidencias del Plan Anual — mismo layout que Gestión Legal:
 * hoja centrada para Word/Excel, PDF en iframe, imágenes centradas.
 */

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, FileSpreadsheet, FileText, Loader2, X } from 'lucide-react';
import {
  cargarPreviewEvidenciaPlanAnual,
  tipoPreviewAdjuntoTarea,
  type ContenidoPreviewEvidencia,
  type TipoPreviewAdjuntoTarea,
} from './services/plan-anual/api';

const ESTILOS_DOCX = `
  .evidencia-docx-preview p { margin-bottom: 0.7em; }
  .evidencia-docx-preview h1 { font-size: 1.6em; margin: 0.8em 0 0.4em; font-weight: 700; }
  .evidencia-docx-preview h2 { font-size: 1.3em; margin: 0.7em 0 0.35em; font-weight: 600; }
  .evidencia-docx-preview h3 { font-size: 1.1em; margin: 0.6em 0 0.3em; font-weight: 600; }
  .evidencia-docx-preview ul, .evidencia-docx-preview ol { margin-left: 1.5em; margin-bottom: 0.7em; }
  .evidencia-docx-preview table { border-collapse: collapse; width: 100%; margin: 0.8em 0; }
  .evidencia-docx-preview td, .evidencia-docx-preview th { border: 1px solid #ddd; padding: 6px 10px; }
  .evidencia-docx-preview th { background-color: #f5f5f5; font-weight: bold; }
  .evidencia-docx-preview img { max-width: 100%; height: auto; display: block; margin: 0.5em 0; }
  .evidencia-docx-preview strong, .evidencia-docx-preview b { font-weight: bold; }
  .evidencia-docx-preview em, .evidencia-docx-preview i { font-style: italic; }
`;

const ESTILOS_XLSX = `
  .evidencia-xlsx-preview table { border-collapse: collapse; width: 100%; font-size: 12px; }
  .evidencia-xlsx-preview td, .evidencia-xlsx-preview th {
    border: 1px solid #e5e7eb; padding: 6px 8px; text-align: left;
  }
  .evidencia-xlsx-preview th { background: #f3f4f6; font-weight: 600; }
  .evidencia-xlsx-preview tr:nth-child(even) { background: #f9fafb; }
`;

function etiquetaTipo(tipo: TipoPreviewAdjuntoTarea): string {
  switch (tipo) {
    case 'pdf':
      return 'PDF';
    case 'imagen':
      return 'Imagen';
    case 'docx':
      return 'Word';
    case 'xlsx':
      return 'Excel';
    default:
      return 'Archivo';
  }
}

export interface AdjuntoEvidenciaPreview {
  id?: string;
  nombre: string;
  url?: string;
}

interface VisorEvidenciaPlanAnualModalProps {
  adj: AdjuntoEvidenciaPreview | null;
  onCerrar: () => void;
  onDescargar: (adj: AdjuntoEvidenciaPreview) => void;
}

export function VisorEvidenciaPlanAnualModal({
  adj,
  onCerrar,
  onDescargar,
}: VisorEvidenciaPlanAnualModalProps) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contenido, setContenido] = useState<ContenidoPreviewEvidencia | null>(null);

  const limpiarBlob = useCallback((c: ContenidoPreviewEvidencia | null) => {
    if (c?.blobUrl?.startsWith('blob:') && c.blobUrl !== adj?.url) {
      URL.revokeObjectURL(c.blobUrl);
    }
  }, [adj?.url]);

  useEffect(() => {
    if (!adj) {
      setContenido(null);
      setError(null);
      setCargando(false);
      return;
    }

    let cancelado = false;
    setCargando(true);
    setError(null);
    setContenido(null);

    cargarPreviewEvidenciaPlanAnual(adj)
      .then((res) => {
        if (!cancelado) setContenido(res);
      })
      .catch((err) => {
        if (!cancelado) {
          const msg = err instanceof Error ? err.message : 'Error al cargar vista previa';
          setError(
            msg === 'PREVIEW_NO_SOPORTADO'
              ? 'Vista previa no disponible para este tipo (.doc, ZIP, etc.). Use descargar.'
              : msg,
          );
        }
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [adj]);

  useEffect(() => () => limpiarBlob(contenido), [contenido, limpiarBlob]);

  useEffect(() => {
    if (!adj) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [adj]);

  const handleCerrar = () => {
    limpiarBlob(contenido);
    onCerrar();
  };

  if (!adj) return null;

  const tipo: TipoPreviewAdjuntoTarea = contenido?.tipo ?? tipoPreviewAdjuntoTarea(adj.nombre);
  const esHoja = tipo === 'docx' || tipo === 'xlsx';

  const modal = (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6"
      onClick={handleCerrar}
      role="dialog"
      aria-modal="true"
      aria-label={`Vista previa: ${adj.nombre}`}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div
        className="relative z-10 w-full max-w-[98vw] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden"
        style={{ height: '94vh', maxHeight: '94vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Encabezado — alineado a Gestión Legal */}
        <div className="shrink-0 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white px-5 py-4 rounded-t-xl">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-semibold leading-tight">Vista previa del documento</h3>
              <p className="text-sm text-blue-100 mt-1 truncate" title={adj.nombre}>
                {adj.nombre}
              </p>
            </div>
            <button
              type="button"
              onClick={handleCerrar}
              className="p-2 rounded-lg hover:bg-white/15 shrink-0"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Barra de metadatos */}
        <div className="shrink-0 px-5 py-2.5 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            {tipo === 'xlsx' ? (
              <FileSpreadsheet className="w-4 h-4 text-green-700" />
            ) : (
              <FileText className="w-4 h-4 text-blue-700" />
            )}
            <span className="font-medium text-gray-800">{etiquetaTipo(tipo)}</span>
            {esHoja && (
              <span className="text-xs text-gray-500 hidden sm:inline">
                · Vista aproximada (puede diferir del archivo original)
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => onDescargar(adj)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
          >
            <Download className="w-3.5 h-3.5" />
            Descargar
          </button>
        </div>

        {/* Área de contenido — flex-1; PDF usa iframe absolute para llenar alto real */}
        <div
          className="flex flex-col overflow-hidden bg-gray-200"
          style={{ flex: '1 1 0', minHeight: 0 }}
        >
          {cargando && (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-gray-600 bg-gray-100">
              <Loader2 className="w-8 h-8 animate-spin text-[#1e5da8]" />
              <p className="text-sm">Cargando documento...</p>
            </div>
          )}

          {!cargando && error && (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6 bg-gray-100">
              <FileText className="w-14 h-14 text-gray-400 mb-3" />
              <h4 className="text-base font-semibold text-gray-800 mb-2">Vista previa no disponible</h4>
              <p className="text-sm text-gray-600 mb-4 max-w-md">{error}</p>
              <button
                type="button"
                onClick={() => onDescargar(adj)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#1e5da8] text-white text-sm font-semibold hover:bg-[#174a8a]"
              >
                <Download className="w-4 h-4" />
                Descargar archivo
              </button>
            </div>
          )}

          {!cargando && !error && contenido?.blobUrl && tipo === 'pdf' && (
            <div
              className="relative w-full bg-gray-600"
              style={{ flex: '1 1 0', minHeight: 0 }}
            >
              <iframe
                src={contenido.blobUrl}
                title={adj.nombre}
                className="absolute inset-0 w-full h-full border-0"
                style={{ height: '100%', minHeight: '100%' }}
              />
            </div>
          )}

          {!cargando && !error && contenido?.blobUrl && tipo === 'imagen' && (
            <div className="flex-1 min-h-0 overflow-auto flex items-center justify-center p-4 bg-gray-100">
              <img
                src={contenido.blobUrl}
                alt={adj.nombre}
                className="max-w-full max-h-full object-contain rounded-lg shadow-md bg-white border border-gray-200"
              />
            </div>
          )}

          {/* Word: hoja centrada como Gestión Legal */}
          {!cargando && !error && contenido?.docxHtml && tipo === 'docx' && (
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto">
              <div className="flex justify-center py-8 px-4 sm:px-8">
                <div
                  className="bg-white shadow-2xl px-8 sm:px-12 py-10 sm:py-12 text-gray-800 w-full max-w-[800px] min-h-[1100px]"
                  style={{
                    fontFamily: 'Calibri, "Segoe UI", Arial, sans-serif',
                    lineHeight: 1.6,
                    fontSize: '14px',
                  }}
                >
                  <style>{ESTILOS_DOCX}</style>
                  <div
                    className="evidencia-docx-preview"
                    dangerouslySetInnerHTML={{ __html: contenido.docxHtml }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Excel: hoja centrada */}
          {!cargando && !error && contenido?.xlsxHtml && tipo === 'xlsx' && (
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto">
              <div className="flex justify-center py-8 px-4 sm:px-8">
                <div className="bg-white shadow-2xl p-6 sm:p-8 w-full max-w-[960px] min-h-[200px]">
                  <style>{ESTILOS_XLSX}</style>
                  <div
                    className="evidencia-xlsx-preview overflow-x-auto"
                    dangerouslySetInnerHTML={{ __html: contenido.xlsxHtml }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : modal;
}
