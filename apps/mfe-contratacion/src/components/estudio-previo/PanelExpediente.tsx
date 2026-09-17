import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { FileText, Upload, ShieldCheck, Download, Eye, Trash2, RefreshCw } from 'lucide-react';
import { contratacionService } from '../../services/contratacionService';
import { Expediente } from '../../types';
import { DocumentoVisible, VisorDocumento } from '../shared/VisorDocumento';

/** Numeral del estudio previo (3.1): solo sus adjuntos admiten retirarse desde aquí. */
const NUMERAL_ESTUDIO_PREVIO = '3.1';

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
  const [viendo, setViendo] = useState<DocumentoVisible | null>(null);
  const [retirando, setRetirando] = useState<string | null>(null);
  const [reemplazando, setReemplazando] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputReemplazoRef = useRef<HTMLInputElement>(null);
  // Qué documento reemplaza el próximo archivo elegido: un solo input oculto
  // sirve a todas las filas, en vez de uno por documento.
  const objetivoReemplazo = useRef<string | null>(null);

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

  /**
   * Los archivos elegidos, uno tras otro.
   *
   * Al expediente rara vez entra un documento solo: entra el paquete que el
   * área mandó. En serie porque cada registro es su propia transacción, y
   * cortando en el primer fallo, que se dice con cuántos alcanzaron a entrar.
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
      if (subidos > 0) await cargar();
    }
  };

  /**
   * Retira un adjunto del estudio previo (numeral 3.1).
   *
   * Solo se ofrece sobre esos adjuntos: el snapshot del formulario y los
   * documentos de otras actividades no pasan por aquí, y el propio servicio
   * lo rechaza con 400/409 si igual se intentara.
   */
  const retirar = async (documentoId: string) => {
    setRetirando(documentoId);
    try {
      await contratacionService.retirarAdjuntoDelEstudioPrevio(procesoId, documentoId);
      toast.success('Documento retirado');
      await cargar();
    } catch (err: any) {
      toast.error(err.message ?? 'No se pudo retirar el documento');
    } finally {
      setRetirando(null);
    }
  };

  /**
   * Reemplaza un adjunto del estudio previo por otro archivo (EFDS-2067).
   *
   * Mismo alcance que `retirar`: solo adjuntos sueltos del numeral 3.1, y el
   * servicio lo rechaza con 400/409 si igual se intentara sobre otra cosa.
   */
  const reemplazar = async (documentoId: string, archivo: File) => {
    setReemplazando(documentoId);
    try {
      await contratacionService.reemplazarAdjuntoDelEstudioPrevio(procesoId, documentoId, archivo);
      toast.success('Documento reemplazado');
      await cargar();
    } catch (err: any) {
      toast.error(err.message ?? 'No se pudo reemplazar el documento');
    } finally {
      setReemplazando(null);
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
              multiple
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx"
              onChange={(e) => {
                const elegidos = Array.from(e.target.files ?? []);
                if (elegidos.length) subir(elegidos);
              }}
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
            {/* Un solo input oculto sirve a todos los botones «Reemplazar» de
                la lista: el archivo elegido va al documento del ref. */}
            <input
              ref={inputReemplazoRef}
              type="file"
              data-testid="input-reemplazar-documento"
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx"
              onChange={(e) => {
                const archivo = e.target.files?.[0];
                const documentoId = objetivoReemplazo.current;
                if (archivo && documentoId) reemplazar(documentoId, archivo);
                e.target.value = '';
              }}
            />
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
            // Solo los adjuntos sueltos del estudio previo admiten retirarse
            // desde aquí: los que cubren un requisito de la lista de chequeo
            // tienen su propio flujo de sustitución, y los de otras
            // actividades no son de este numeral.
            const esAdjuntoDelEstudioPrevio =
              doc.tipo === 'ADJUNTO' && doc.numeral === NUMERAL_ESTUDIO_PREVIO && !doc.requisito;
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
                  <>
                    {/* El expediente es donde se revisa: primero abrirlo, y
                        bajarlo solo si hace falta tenerlo fuera. */}
                    <button
                      type="button"
                      onClick={() =>
                        setViendo({
                          nombre: doc.nombre,
                          descargaUrl: doc.descargaUrl!,
                          detalle: `${new Date(doc.createdAt).toLocaleDateString('es-CO')} · ${doc.subidoPor ?? ''}`,
                        })
                      }
                      className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-[#003DA5] hover:bg-slate-50"
                      title={`Ver ${doc.nombre}`}
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <a
                      href={contratacionService.urlDescarga(doc.descargaUrl)}
                      className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-[#003DA5] hover:bg-slate-50"
                      title={`Descargar ${doc.nombre}`}
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </>
                )}
                {editable && esAdjuntoDelEstudioPrevio && (
                  <button
                    type="button"
                    onClick={() => {
                      objetivoReemplazo.current = doc.id;
                      inputReemplazoRef.current?.click();
                    }}
                    disabled={reemplazando === doc.id}
                    className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-[#003DA5] hover:bg-slate-50 disabled:opacity-50"
                    title={`Reemplazar ${doc.nombre}`}
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                )}
                {editable && esAdjuntoDelEstudioPrevio && (
                  <button
                    type="button"
                    onClick={() => retirar(doc.id)}
                    disabled={retirando === doc.id}
                    className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                    title={`Retirar ${doc.nombre}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
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

      <VisorDocumento documento={viendo} onClose={() => setViendo(null)} />
    </div>
  );
}

export { FileText };
