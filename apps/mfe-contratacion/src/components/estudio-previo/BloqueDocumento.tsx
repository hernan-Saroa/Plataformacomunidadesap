import React, { useRef, useState } from 'react';
import { Upload, CheckCircle2, AlertTriangle, FileText, Download } from 'lucide-react';

import { contratacionService } from '../../services/contratacionService';
import { DocumentoExpediente } from '../../types';

interface Props {
  procesoId: string;
  documentos: DocumentoExpediente[];
  bloqueado: boolean;
  onAdjuntado: () => void;
}

const MIME_ACEPTADOS = '.pdf,.doc,.docx';

/**
 * Carga del estudio previo firmado.
 *
 * El estudio previo se diligencia en el formato institucional y se firma;
 * aquí solo se carga el documento resultante, que es el entregable de la
 * actividad y sin el cual no puede enviarse a revisión.
 */
export function BloqueDocumento({ procesoId, documentos, bloqueado, onAdjuntado }: Props) {
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const adjuntos = documentos.filter((d) => d.tipo === 'ADJUNTO');
  const tieneEstudio = adjuntos.length > 0;

  const subir = async (archivo: File) => {
    setSubiendo(true);
    setError(null);
    try {
      await contratacionService.adjuntarDocumento(procesoId, archivo);
      onAdjuntado();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubiendo(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <section className="space-y-2.5">
      <div
        className={`rounded-lg border px-3.5 py-3 ${
          tieneEstudio ? 'border-emerald-200 bg-emerald-50/50' : 'border-amber-300 bg-amber-50'
        }`}
      >
        <div className="flex items-start gap-2.5">
          {tieneEstudio ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          )}
          <div className="min-w-0 flex-1">
            <p
              className={`text-[12px] font-bold m-0 ${
                tieneEstudio ? 'text-emerald-800' : 'text-amber-800'
              }`}
            >
              {tieneEstudio ? 'Estudio previo adjunto' : 'Falta adjuntar el estudio previo'}
            </p>
            <p
              className={`text-[11px] m-0 mt-0.5 leading-snug ${
                tieneEstudio ? 'text-emerald-700' : 'text-amber-900'
              }`}
            >
              {tieneEstudio
                ? 'El documento firmado quedó registrado en el expediente electrónico.'
                : 'Adjunta el estudio previo diligenciado y firmado para poder enviarlo a revisión.'}
            </p>
          </div>
          {!bloqueado && (
            <>
              <input
                ref={inputRef}
                type="file"
                className="hidden"
                accept={MIME_ACEPTADOS}
                onChange={(e) => e.target.files?.[0] && subir(e.target.files[0])}
              />
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={subiendo}
                className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px]
                  font-extrabold rounded-md shadow-sm active:scale-95 disabled:opacity-50
                  transition-all ${
                    tieneEstudio
                      ? 'bg-white text-slate-700 border border-slate-300 hover:border-[#003DA5] hover:text-[#003DA5]'
                      : 'bg-[#003DA5] text-white hover:bg-[#002e7d]'
                  }`}
              >
                <Upload className="w-3.5 h-3.5" />
                {subiendo ? 'Subiendo…' : tieneEstudio ? 'Adjuntar otro' : 'Adjuntar'}
              </button>
            </>
          )}
        </div>

        {error && (
          <p role="alert" className="text-[11px] font-bold text-red-600 m-0 mt-2">
            {error}
          </p>
        )}
      </div>

      {/* Documentos ya cargados */}
      {documentos.length > 0 && (
        <ul className="m-0 p-0 list-none space-y-1.5">
          {documentos.map((doc) => {
            const esSnapshot = doc.tipo === 'SNAPSHOT_FORMULARIO';
            return (
              <li
                key={doc.id}
                className="flex items-center gap-2.5 rounded-lg border border-gray-200 bg-white px-3 py-2"
              >
                <div
                  className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${
                    esSnapshot ? 'bg-slate-400' : 'bg-[#003DA5]'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-bold text-slate-800 m-0 truncate">{doc.nombre}</p>
                  <p className="text-[10.5px] text-gray-400 m-0 tabular-nums truncate">
                    {new Date(doc.createdAt).toLocaleDateString('es-CO')} · {doc.subidoPor}
                    {esSnapshot && ' · datos registrados al enviar'}
                  </p>
                </div>
                {doc.descargaUrl && (
                  <a
                    href={contratacionService.urlDescarga(doc.descargaUrl)}
                    className="flex-shrink-0 p-1.5 rounded-md text-gray-400 hover:text-[#003DA5] hover:bg-gray-50"
                    title={`Descargar ${doc.nombre}`}
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
