import React, { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Upload, CheckCircle2, AlertTriangle, FileText, Download, Eye, Trash2, RefreshCw } from 'lucide-react';

import { contratacionService } from '../../services/contratacionService';
import { DocumentoExpediente } from '../../types';
import { DocumentoVisible, VisorDocumento } from '../shared/VisorDocumento';

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
  const [viendo, setViendo] = useState<DocumentoVisible | null>(null);
  const [retirando, setRetirando] = useState<string | null>(null);
  const [reemplazando, setReemplazando] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputReemplazoRef = useRef<HTMLInputElement>(null);
  // Qué documento reemplaza el próximo archivo elegido: un solo input oculto
  // sirve a todas las filas, en vez de uno por documento.
  const objetivoReemplazo = useRef<string | null>(null);

  const adjuntos = documentos.filter((d) => d.tipo === 'ADJUNTO');
  const tieneEstudio = adjuntos.length > 0;

  /**
   * Los archivos elegidos, uno tras otro.
   *
   * El estudio previo no es un documento suelto: va con sus anexos —la
   * justificación, el análisis del sector, las cotizaciones— y hasta ahora
   * había que subirlos de uno en uno, abriendo el selector otras tantas veces.
   *
   * En serie y no en paralelo a propósito: el servicio los registra dentro de
   * una transacción por documento, y mandarlos a la vez multiplica los
   * conflictos sobre la misma fila de la actividad sin ganar tiempo real.
   *
   * Un fallo corta el resto y dice cuáles quedaron: seguir en silencio dejaría
   * al usuario creyendo que subió seis cuando subieron cuatro.
   */
  const subir = async (archivos: File[]) => {
    setSubiendo(true);
    setError(null);
    let subidos = 0;
    try {
      for (const archivo of archivos) {
        await contratacionService.adjuntarDocumento(procesoId, archivo);
        subidos += 1;
      }
    } catch (err: any) {
      setError(
        subidos > 0
          ? `${err.message} · se adjuntaron ${subidos} de ${archivos.length}`
          : err.message,
      );
    } finally {
      setSubiendo(false);
      if (inputRef.current) inputRef.current.value = '';
      if (subidos > 0) onAdjuntado();
    }
  };

  /**
   * Retira un adjunto suelto del estudio previo (numeral 3.1).
   *
   * El botón solo se ofrece sobre adjuntos reales, nunca sobre el snapshot
   * del formulario enviado: el servicio lo rechazaría con 400 porque ese
   * registro no es un adjunto, es la copia de lo que ya se envió a revisión.
   */
  const retirar = async (documentoId: string) => {
    setRetirando(documentoId);
    try {
      await contratacionService.retirarAdjuntoDelEstudioPrevio(procesoId, documentoId);
      toast.success('Documento retirado');
      onAdjuntado();
    } catch (err: any) {
      toast.error(err.message ?? 'No se pudo retirar el documento');
    } finally {
      setRetirando(null);
    }
  };

  /**
   * Reemplaza un adjunto suelto por otro archivo (EFDS-2067).
   *
   * Hasta ahora corregir un documento equivocado eran dos pasos sueltos
   * —retirar y volver a adjuntar— y el motivo de por qué el segundo llegó no
   * quedaba dicho en ningún lado. Con un solo botón el backend deja una traza
   * que enlaza el que salió con el que entró.
   */
  const reemplazar = async (documentoId: string, archivo: File) => {
    setReemplazando(documentoId);
    try {
      await contratacionService.reemplazarAdjuntoDelEstudioPrevio(procesoId, documentoId, archivo);
      toast.success('Documento reemplazado');
      onAdjuntado();
    } catch (err: any) {
      toast.error(err.message ?? 'No se pudo reemplazar el documento');
    } finally {
      setReemplazando(null);
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
                : 'Adjunta el estudio previo firmado y sus anexos para poder enviarlo a revisión: puedes elegir varios a la vez.'}
            </p>
          </div>
          {!bloqueado && (
            <>
              <input
                ref={inputRef}
                type="file"
                multiple
                className="hidden"
                accept={MIME_ACEPTADOS}
                onChange={(e) => {
                  const elegidos = Array.from(e.target.files ?? []);
                  if (elegidos.length) subir(elegidos);
                }}
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

      {/* Un solo input oculto sirve a todos los botones «Reemplazar» de la
          lista: el archivo elegido va al documento guardado en el ref. Solo
          existe si hay un botón que pueda abrirlo: bloqueado no ofrece
          ninguno, igual que el input de «Adjuntar». */}
      {!bloqueado && (
        <input
          ref={inputReemplazoRef}
          type="file"
          data-testid="input-reemplazar-documento"
          className="hidden"
          accept={MIME_ACEPTADOS}
          onChange={(e) => {
            const archivo = e.target.files?.[0];
            const documentoId = objetivoReemplazo.current;
            if (archivo && documentoId) reemplazar(documentoId, archivo);
            e.target.value = '';
          }}
        />
      )}

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
                  <>
                    {/* Ver antes que descargar: quien revisa quiere leerlo, no
                        llevárselo. La descarga sigue ahí para quien la
                        necesite —firmar, archivar fuera—. */}
                    <button
                      type="button"
                      onClick={() =>
                        setViendo({
                          nombre: doc.nombre,
                          descargaUrl: doc.descargaUrl!,
                          detalle: `${new Date(doc.createdAt).toLocaleDateString('es-CO')} · ${doc.subidoPor ?? ''}`,
                        })
                      }
                      className="flex-shrink-0 p-1.5 rounded-md text-gray-400 hover:text-[#003DA5] hover:bg-gray-50"
                      title={`Ver ${doc.nombre}`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <a
                      href={contratacionService.urlDescarga(doc.descargaUrl)}
                      className="flex-shrink-0 p-1.5 rounded-md text-gray-400 hover:text-[#003DA5] hover:bg-gray-50"
                      title={`Descargar ${doc.nombre}`}
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </>
                )}
                {/* Reemplazar y retirar solo aplican a adjuntos reales y
                    mientras el estudio sigue editable: el snapshot no se
                    puede tocar porque es la copia de lo que ya se envió a
                    revisión. */}
                {!esSnapshot && !bloqueado && (
                  <button
                    type="button"
                    onClick={() => {
                      objetivoReemplazo.current = doc.id;
                      inputReemplazoRef.current?.click();
                    }}
                    disabled={reemplazando === doc.id}
                    className="flex-shrink-0 p-1.5 rounded-md text-gray-400 hover:text-[#003DA5] hover:bg-gray-50 disabled:opacity-50"
                    title={`Reemplazar ${doc.nombre}`}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                )}
                {!esSnapshot && !bloqueado && (
                  <button
                    type="button"
                    onClick={() => retirar(doc.id)}
                    disabled={retirando === doc.id}
                    className="flex-shrink-0 p-1.5 rounded-md text-gray-400 hover:text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                    title={`Retirar ${doc.nombre}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <VisorDocumento documento={viendo} onClose={() => setViendo(null)} />
    </section>
  );
}
