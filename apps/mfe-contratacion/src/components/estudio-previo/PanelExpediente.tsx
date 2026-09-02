import React, { useEffect, useRef, useState } from 'react';
import { FileText, Upload, ShieldCheck, Download } from 'lucide-react';
import { contratacionService } from '../../services/contratacionService';
import { Expediente } from '../../types';

interface Props {
  procesoId: string;
  editable: boolean;
  recargarToken?: number;
}

const MIME_LABEL: Record<string, string> = {
  'application/pdf': 'PDF',
  'application/msword': 'DOC',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'application/vnd.ms-excel': 'XLS',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
};

function tamanoLegible(bytes?: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Expediente electrónico del proceso (RF-SIS-04) con sus documentos. */
export function PanelExpediente({ procesoId, editable, recargarToken }: Props) {
  const [expediente, setExpediente] = useState<Expediente | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const cargar = async () => {
    try {
      setExpediente(await contratacionService.obtenerExpediente(procesoId));
      setError(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    cargar();
  }, [procesoId, recargarToken]);

  const subir = async (archivo: File) => {
    setSubiendo(true);
    setError(null);
    try {
      await contratacionService.adjuntarDocumento(procesoId, archivo);
      await cargar();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubiendo(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  if (!expediente) {
    return (
      <div className="p-4 text-sm text-slate-500">
        {error ?? 'Cargando expediente…'}
      </div>
    );
  }

  return (
    <div>
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500 m-0">
            Expediente electrónico
          </p>
          <p className="text-sm font-bold text-slate-900 m-0 tabular-nums">
            {expediente.numeroExpediente}
          </p>
        </div>
        {editable && (
          <>
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx"
              onChange={(e) => e.target.files?.[0] && subir(e.target.files[0])}
            />
            <button
              type="button"
              disabled={subiendo}
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 bg-white text-gray-700 hover:border-[#003DA5]/40 hover:text-[#003DA5] disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5" />
              {subiendo ? 'Subiendo…' : 'Adjuntar'}
            </button>
          </>
        )}
      </div>

      {error && (
        <p role="alert" className="px-4 py-2 text-xs font-semibold text-red-600 m-0">
          {error}
        </p>
      )}

      {expediente.documentos.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <FileText className="w-9 h-9 mx-auto text-gray-300 mb-2" strokeWidth={1.5} />
          <p className="text-xs font-bold text-gray-500 m-0">Expediente vacío</p>
          <p className="text-[11px] text-gray-400 m-0 mt-1 leading-snug max-w-[220px] mx-auto">
            Los documentos se agregan al diligenciar las actividades o al adjuntar archivos.
          </p>
        </div>
      ) : (
        <ul className="m-0 p-0 list-none">
          {expediente.documentos.map((doc) => {
            const esSnapshot = doc.tipo === 'SNAPSHOT_FORMULARIO';
            return (
              <li
                key={doc.id}
                className="flex items-start gap-3 px-4 py-2.5 border-b border-gray-50 last:border-b-0"
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-[9px] font-black text-white shrink-0 ${
                    esSnapshot ? 'bg-[#003DA5]' : 'bg-slate-500'
                  }`}
                >
                  {esSnapshot ? <ShieldCheck className="w-4 h-4" /> : MIME_LABEL[doc.mimeType ?? ''] ?? 'DOC'}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-slate-900 m-0 truncate">
                    {doc.nombre}
                  </p>
                  <p className="text-[11px] text-slate-500 m-0 tabular-nums">
                    {new Date(doc.createdAt).toLocaleDateString('es-CO')} · {doc.subidoPor}
                    {doc.tamano ? ` · ${tamanoLegible(doc.tamano)}` : ''}
                  </p>
                  {esSnapshot && (
                    <p className="text-[10px] text-slate-400 m-0 font-mono truncate">
                      SHA-256 {doc.hashSha256.slice(0, 16)}…
                    </p>
                  )}
                </div>

                {doc.descargaUrl && (
                  <a
                    href={contratacionService.urlDescarga(doc.descargaUrl)}
                    className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-[#003DA5] hover:bg-slate-50"
                    title={`Descargar ${doc.nombre}`}
                  >
                    <Download className="w-4 h-4" />
                  </a>
                )}
                {esSnapshot && (
                  <span className="shrink-0 text-[10px] font-bold text-[#003DA5] bg-[#E0EDFF] px-2 py-0.5 rounded-full">
                    v{doc.version}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export { FileText };
