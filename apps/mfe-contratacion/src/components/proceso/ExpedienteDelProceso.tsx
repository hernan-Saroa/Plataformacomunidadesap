import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  FileText,
  Upload,
  ShieldCheck,
  Download,
  Eye,
  Trash2,
  RefreshCw,
  Search,
  ListChecks,
  Paperclip,
} from 'lucide-react';
import { contratacionService } from '../../services/contratacionService';
import { DocumentoExpediente, Expediente } from '../../types';
import { DocumentoVisible, VisorDocumento } from '../shared/VisorDocumento';
import { ETAPAS } from './Etapas';

/** Numeral del estudio previo (3.1): solo sus adjuntos admiten retirarse desde aquí. */
const NUMERAL_ESTUDIO_PREVIO = '3.1';

/** Lo que el expediente necesita saber de cada actividad para ubicar sus documentos. */
export interface ActividadDelExpediente {
  numeral: string;
  nombre: string;
  etapa?: number | null;
}

interface Props {
  procesoId: string;
  editable: boolean;
  /** El catálogo del proceso, en su orden: da el nombre y la etapa de cada numeral. */
  actividades: ActividadDelExpediente[];
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

/** Los documentos de una actividad, separados por lo que son para ella. */
interface GrupoActividad {
  numeral: string;
  nombre: string;
  /** Lo que la actividad registró: el formulario firmado y sus versiones. */
  registros: DocumentoExpediente[];
  /** La lista de chequeo: cada requisito con los archivos que lo cubrieron. */
  requisitos: { codigo: string; nombre: string; documentos: DocumentoExpediente[] }[];
  /** Lo que se adjuntó sin cubrir un requisito. */
  adjuntos: DocumentoExpediente[];
  total: number;
}

interface GrupoEtapa {
  numero: number | null;
  nombre: string;
  actividades: GrupoActividad[];
  total: number;
}

/**
 * Ordena los documentos por etapa y actividad.
 *
 * Es lo que la lista plana no decía: de qué actividad es cada archivo y, dentro
 * de ella, si es lo que la actividad produjo, el soporte de un requisito o un
 * adjunto suelto. El orden es el del catálogo, que es el del proceso; lo que
 * llega con un numeral fuera del catálogo no se pierde, va al final.
 */
export function agruparExpediente(
  documentos: DocumentoExpediente[],
  actividades: ActividadDelExpediente[],
): GrupoEtapa[] {
  const posicion = new Map(actividades.map((a, i) => [a.numeral, i]));
  const porNumeral = new Map<string, DocumentoExpediente[]>();
  for (const doc of documentos) {
    const clave = doc.numeral ?? '';
    porNumeral.set(clave, [...(porNumeral.get(clave) ?? []), doc]);
  }

  const grupos: (GrupoActividad & { etapa: number | null; orden: number })[] = [];
  for (const [numeral, docs] of porNumeral) {
    const act = actividades.find((a) => a.numeral === numeral);
    const etapaDelNumeral = Number(numeral.split('.')[0]);
    const requisitos = new Map<string, { codigo: string; nombre: string; documentos: DocumentoExpediente[] }>();
    const registros: DocumentoExpediente[] = [];
    const adjuntos: DocumentoExpediente[] = [];
    for (const doc of docs) {
      if (doc.tipo === 'SNAPSHOT_FORMULARIO') registros.push(doc);
      else if (doc.requisito) {
        const r = requisitos.get(doc.requisito) ?? {
          codigo: doc.requisito,
          nombre: doc.requisitoNombre ?? doc.requisito,
          documentos: [],
        };
        r.documentos.push(doc);
        requisitos.set(doc.requisito, r);
      } else adjuntos.push(doc);
    }
    // El vigente primero: el sustituido se conserva como prueba, no como soporte.
    for (const r of requisitos.values()) {
      r.documentos.sort((a, b) => Number(!!a.sustituido) - Number(!!b.sustituido));
    }
    grupos.push({
      numeral,
      nombre: act?.nombre ?? (numeral ? `Actividad ${numeral}` : 'Sin actividad asociada'),
      etapa: act?.etapa ?? (Number.isFinite(etapaDelNumeral) && numeral ? etapaDelNumeral : null),
      orden: posicion.get(numeral) ?? Number.MAX_SAFE_INTEGER,
      registros,
      requisitos: [...requisitos.values()],
      adjuntos,
      total: docs.length,
    });
  }

  grupos.sort((a, b) => a.orden - b.orden || a.numeral.localeCompare(b.numeral, 'es', { numeric: true }));

  const etapas = new Map<number | null, GrupoEtapa>();
  for (const g of grupos) {
    const etapa = etapas.get(g.etapa) ?? {
      numero: g.etapa,
      nombre:
        g.etapa === null
          ? 'Sin etapa'
          : ETAPAS.find((e) => e.numero === g.etapa)?.nombre ?? `Etapa ${g.etapa}`,
      actividades: [],
      total: 0,
    };
    etapa.actividades.push(g);
    etapa.total += g.total;
    etapas.set(g.etapa, etapa);
  }
  return [...etapas.values()].sort((a, b) => (a.numero ?? 99) - (b.numero ?? 99));
}

/**
 * Expediente electrónico del proceso (RF-SIS-04), en pantalla propia.
 *
 * Antes era una columna con todos los archivos en una sola lista, del más
 * nuevo al más viejo, y no se sabía de qué actividad era cada uno ni qué
 * requisito cubría. Aquí se ordena como el proceso: etapa, actividad y, dentro
 * de la actividad, lo registrado, la lista de chequeo y los adjuntos sueltos.
 */
export function ExpedienteDelProceso({ procesoId, editable, actividades, recargarToken }: Props) {
  const [expediente, setExpediente] = useState<Expediente | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [viendo, setViendo] = useState<DocumentoVisible | null>(null);
  const [retirando, setRetirando] = useState<string | null>(null);
  const [reemplazando, setReemplazando] = useState<string | null>(null);
  const [filtro, setFiltro] = useState('');
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

  const etapas = useMemo(() => {
    if (!expediente) return [];
    const texto = filtro.trim().toLocaleLowerCase('es');
    const documentos = texto
      ? expediente.documentos.filter((doc) => {
          const act = actividades.find((a) => a.numeral === doc.numeral);
          return [doc.nombre, doc.requisitoNombre, doc.numeral, act?.nombre]
            .filter(Boolean)
            .some((v) => v!.toLocaleLowerCase('es').includes(texto));
        })
      : expediente.documentos;
    return agruparExpediente(documentos, actividades);
  }, [expediente, actividades, filtro]);

  /**
   * Los archivos elegidos, uno tras otro, al estudio previo.
   *
   * En serie porque cada registro es su propia transacción, y cortando en el
   * primer fallo, que se dice con cuántos alcanzaron a entrar.
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
      <div className="bg-white border border-gray-200 rounded-xl p-4 text-sm text-slate-500">
        {error ?? 'Cargando expediente…'}
      </div>
    );
  }

  const fila = (doc: DocumentoExpediente) => {
    const esSnapshot = doc.tipo === 'SNAPSHOT_FORMULARIO';
    // Solo los adjuntos sueltos del estudio previo admiten retirarse desde
    // aquí: los que cubren un requisito tienen su propio flujo de sustitución
    // en la lista de chequeo, y los de otras actividades no son de este numeral.
    const esAdjuntoDelEstudioPrevio =
      doc.tipo === 'ADJUNTO' && doc.numeral === NUMERAL_ESTUDIO_PREVIO && !doc.requisito;
    return (
      <li
        key={doc.id}
        className={`flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 ${
          doc.sustituido ? 'opacity-60' : ''
        }`}
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
            {doc.sustituido && (
              <span className="ml-2 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                Sustituido
              </span>
            )}
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

        {esSnapshot && (
          <span className="shrink-0 text-[10px] font-bold text-[#003DA5] bg-[#E0EDFF] px-2 py-0.5 rounded-full">
            v{doc.version}
          </span>
        )}
        {doc.descargaUrl && (
          <>
            <button
              type="button"
              onClick={() =>
                setViendo({
                  nombre: doc.nombre,
                  descargaUrl: doc.descargaUrl!,
                  detalle: `${new Date(doc.createdAt).toLocaleDateString('es-CO')} · ${doc.subidoPor ?? ''}`,
                  mimeType: doc.mimeType,
                })
              }
              className="shrink-0 p-1.5 rounded-lg text-[#003DA5] hover:bg-white"
              title={`Ver ${doc.nombre}`}
            >
              <Eye className="w-4 h-4" />
            </button>
            <a
              href={contratacionService.urlDescarga(doc.descargaUrl)}
              className="shrink-0 p-1.5 rounded-lg text-[#003DA5] hover:bg-white"
              title={`Descargar ${doc.nombre}`}
            >
              <Download className="w-4 h-4" />
            </a>
          </>
        )}
        {editable && esAdjuntoDelEstudioPrevio && (
          <>
            <button
              type="button"
              onClick={() => {
                objetivoReemplazo.current = doc.id;
                inputReemplazoRef.current?.click();
              }}
              disabled={reemplazando === doc.id}
              className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-[#003DA5] hover:bg-white disabled:opacity-50"
              title={`Reemplazar ${doc.nombre}`}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => retirar(doc.id)}
              disabled={retirando === doc.id}
              className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-amber-700 hover:bg-amber-50 disabled:opacity-50"
              title={`Retirar ${doc.nombre}`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        )}
      </li>
    );
  };

  const subtitulo = (icono: React.ReactNode, texto: string) => (
    <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-gray-400 m-0 px-3 pt-2 pb-1">
      {icono}
      {texto}
    </p>
  );

  const total = expediente.documentos.length;
  const idEtapa = (numero: number | null) => `expediente-etapa-${numero ?? 'otra'}`;

  return (
    <div className="space-y-3">
      {/* Cabecera: qué expediente es, cuánto tiene y cómo encontrar algo. */}
      <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500 m-0">
            Expediente electrónico
          </p>
          <p className="text-sm font-bold text-slate-900 m-0 tabular-nums">
            {expediente.numeroExpediente}
            <span className="ml-2 text-[11px] font-semibold text-slate-500">
              {total} {total === 1 ? 'documento' : 'documentos'}
              {expediente.fechaApertura
                ? ` · abierto el ${new Date(expediente.fechaApertura).toLocaleDateString('es-CO')}`
                : ''}
            </span>
          </p>
        </div>

        <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-slate-500">
          <Search className="w-3.5 h-3.5" />
          <input
            type="search"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="Buscar documento, requisito o actividad"
            aria-label="Buscar en el expediente"
            className="expediente-proceso__buscar text-xs bg-transparent text-slate-700"
          />
        </label>

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
            {/* Dice a dónde va: el servicio lo registra en el estudio previo, y
                «Adjuntar» a secas dejaba creer que entraba al expediente suelto. */}
            <button
              type="button"
              disabled={subiendo}
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 bg-white text-gray-700 hover:border-[#003DA5]/40 hover:text-[#003DA5] disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5" />
              {subiendo ? 'Subiendo…' : 'Adjuntar al estudio previo'}
            </button>
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
        <p role="alert" className="px-1 text-xs font-semibold text-red-600 m-0">
          {error}
        </p>
      )}

      {total === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-10 text-center">
          <FileText className="w-9 h-9 mx-auto text-gray-300 mb-2" strokeWidth={1.5} />
          <p className="text-xs font-bold text-gray-500 m-0">Expediente vacío</p>
          <p className="text-[11px] text-gray-400 m-0 mt-1">
            Los documentos se agregan al diligenciar las actividades o al adjuntar archivos.
          </p>
        </div>
      ) : etapas.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-8 text-center text-xs text-slate-500">
          Ningún documento coincide con «{filtro}».
        </div>
      ) : (
        <div className="expediente-proceso">
          {/* Índice: en qué etapas hay documentos y cuántos. */}
          <nav className="expediente-proceso__indice bg-white border border-gray-200 rounded-xl p-2" aria-label="Etapas del expediente">
            {etapas.map((etapa) => (
              <a
                key={etapa.numero ?? 'otra'}
                href={`#${idEtapa(etapa.numero)}`}
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById(idEtapa(etapa.numero))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-[12px] text-slate-600 hover:bg-slate-50 hover:text-[#003DA5] no-underline"
              >
                <span className="font-black text-[#003DA5] tabular-nums expediente-proceso__num">{etapa.numero ?? '·'}</span>
                <span className="flex-1 min-w-0 truncate font-semibold">{etapa.nombre}</span>
                <span className="text-[10px] font-bold text-slate-400 tabular-nums">{etapa.total}</span>
              </a>
            ))}
          </nav>

          <div className="space-y-3 min-w-0">
            {etapas.map((etapa) => (
              <section
                key={etapa.numero ?? 'otra'}
                id={idEtapa(etapa.numero)}
                className="expediente-proceso__etapa bg-white border border-gray-200 rounded-xl overflow-hidden"
              >
                <header className="px-4 py-2.5 border-b border-gray-100 bg-slate-50 flex items-center gap-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#003DA5]">
                    {etapa.numero !== null ? `Etapa ${etapa.numero}` : 'Otros'}
                  </span>
                  <span className="text-[13px] font-bold text-slate-900">{etapa.nombre}</span>
                  <span className="ml-auto text-[11px] text-slate-500 tabular-nums">
                    {etapa.total} {etapa.total === 1 ? 'documento' : 'documentos'}
                  </span>
                </header>

                {etapa.actividades.map((act) => (
                  <div key={act.numeral || 'sin'} className="px-2 py-2 border-b border-gray-100 last:border-b-0">
                    <p className="flex items-baseline gap-2 m-0 px-3 py-1">
                      {act.numeral && (
                        <span className="text-[12px] font-black text-[#003DA5] tabular-nums">{act.numeral}</span>
                      )}
                      <span className="text-[13px] font-bold text-slate-900">{act.nombre}</span>
                    </p>

                    {act.registros.length > 0 && (
                      <>
                        {subtitulo(<ShieldCheck className="w-3 h-3" />, 'Registro de la actividad')}
                        <ul className="m-0 p-0 list-none">{act.registros.map(fila)}</ul>
                      </>
                    )}

                    {act.requisitos.length > 0 && (
                      <>
                        {subtitulo(<ListChecks className="w-3 h-3" />, 'Lista de chequeo')}
                        {act.requisitos.map((r) => (
                          <div key={r.codigo} className="expediente-proceso__requisito">
                            <p className="text-[12px] font-semibold text-slate-700 m-0 px-3 pt-1">{r.nombre}</p>
                            <ul className="m-0 p-0 list-none">{r.documentos.map(fila)}</ul>
                          </div>
                        ))}
                      </>
                    )}

                    {act.adjuntos.length > 0 && (
                      <>
                        {subtitulo(<Paperclip className="w-3 h-3" />, 'Otros adjuntos')}
                        <ul className="m-0 p-0 list-none">{act.adjuntos.map(fila)}</ul>
                      </>
                    )}
                  </div>
                ))}
              </section>
            ))}
          </div>
        </div>
      )}

      <VisorDocumento documento={viendo} onClose={() => setViendo(null)} />
    </div>
  );
}
