import React, { useEffect, useRef, useState } from 'react';
import {
  Ban,
  ClipboardList,
  Download,
  FileText,
  Paperclip,
  RefreshCw,
  UploadCloud,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import {
  DimensionInforme,
  EstadoDeclaratoriaDesierta,
  EstadoEvaluacion,
  EvidenciaFirmaOtp,
  ResultadoEvaluacion,
  RolEvaluador,
} from '../../types';
import {
  Aviso,
  Ayuda,
  Boton,
  BotonSecundario,
  campo,
  Marco,
  Pendiente,
  Titulo,
} from '../shared/PiezasPanel';
import { momentoConHora } from '../shared/fechas';
import { useFirma } from '../shared/useFirma';
import { PanelDesierta } from '../adjudicacion/PanelDesierta';

interface Props {
  procesoId: string;
  onCambio?: () => void;
}

const NUMERAL = '6.3';

const ETIQUETA_DIMENSION: Record<RolEvaluador, string> = {
  JURIDICO: 'jurídica',
  FINANCIERO: 'financiera y económica',
  TECNICO: 'técnica',
};

/** De qué es cada archivo del informe, como lo nombra el expediente. */
const NOMBRE_DIMENSION: Record<DimensionInforme, string> = {
  CONSOLIDADO: 'Informe consolidado',
  JURIDICO: 'Evaluación jurídica',
  TECNICO: 'Evaluación técnica',
  FINANCIERO: 'Evaluación financiera y económica',
};

const pesos = (valor: number | null) =>
  valor == null
    ? '—'
    : new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
      }).format(valor);

/** Un archivo del informe con la dimensión que sustenta. */
interface ArchivoDelInforme {
  archivo: File;
  dimension: DimensionInforme;
}

/**
 * Actividad 6.3 · Evaluación preliminar de las ofertas (EFDS-1157).
 *
 * **Aquí no se califica ni se nombra ganadora.** La evaluación de este punto es
 * preliminar: el comité entrega un informe consolidado, en uno o varios
 * archivos (jurídico, técnico, financiero y económico), y ese mismo soporte
 * alimenta la publicación y el traslado (6.4). La ganadora se decide en el
 * informe definitivo (7.2).
 *
 * Si el informe tiene un error se vuelve a cargar, y el anterior queda en el
 * historial con su motivo. Si no hubo ofertas o ninguna cumple, desde aquí se
 * declara desierto el proceso.
 *
 * Quién puede cargar no lo decide el rol del token sino la membresía del
 * comité de este proceso —lo que devuelve `esMiembroDelComite`—.
 */
export function PanelEvaluacion({ procesoId, onCambio }: Props) {
  const firma = useFirma(NUMERAL, 'Cargar el informe de evaluación preliminar');
  const [estado, setEstado] = useState<EstadoEvaluacion | null>(null);
  const [desierta, setDesierta] = useState<EstadoDeclaratoriaDesierta | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  /** Qué formulario está abierto: cargar, volver a cargar o ninguno. */
  const [formulario, setFormulario] = useState<'cargar' | 'actualizar' | null>(null);
  const [archivos, setArchivos] = useState<ArchivoDelInforme[]>([]);
  const [observacion, setObservacion] = useState('');
  const [motivo, setMotivo] = useState('');
  const [declarando, setDeclarando] = useState(false);

  const [descripcion, setDescripcion] = useState('');
  const [evidencia, setEvidencia] = useState<File | null>(null);

  const leer = () =>
    Promise.all([
      contratacionService.evaluacion(procesoId),
      // La declaratoria es de otra actividad: si no se puede leer, la 6.3 sigue.
      contratacionService.declaratoriaDesierta(procesoId).catch(() => null),
    ])
      .then(([datos, laDesierta]) => {
        setEstado(datos);
        setDesierta(laDesierta);
        setError(null);
      })
      .catch((err: any) => setError(err.message))
      .finally(() => setCargando(false));

  useEffect(() => {
    setCargando(true);
    leer();
  }, [procesoId]);

  const limpiar = () => {
    setArchivos([]);
    setObservacion('');
    setMotivo('');
    setFormulario(null);
  };

  const enviar = async (firmaOtp?: EvidenciaFirmaOtp) => {
    if (!archivos.length) return;
    const datos = {
      observacion: observacion.trim() || undefined,
      dimensiones: archivos.map((a) => a.dimension),
      firma: firmaOtp,
    };
    const lista = archivos.map((a) => a.archivo);

    setGuardando(true);
    try {
      if (formulario === 'actualizar') {
        if (!motivo.trim()) return;
        setEstado(
          await contratacionService.actualizarInformeEvaluacion(
            procesoId,
            { ...datos, motivo: motivo.trim() },
            lista,
          ),
        );
        toast.success('Informe preliminar actualizado; el anterior quedó en el historial');
      } else {
        setEstado(await contratacionService.registrarResultadoEvaluacion(procesoId, datos, lista));
        toast.success('Informe de evaluación preliminar cargado');
      }
      limpiar();
      onCambio?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const cargarEvidencia = async () => {
    if (!evidencia || !descripcion.trim()) return;

    setGuardando(true);
    try {
      setEstado(
        await contratacionService.cargarEvidenciaEvaluacion(
          procesoId,
          descripcion.trim(),
          evidencia,
        ),
      );
      setDescripcion('');
      setEvidencia(null);
      toast.success('Documento cargado');
      onCambio?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <Marco>
        <p className="text-[11.5px] text-slate-400 m-0">Cargando la evaluación…</p>
      </Marco>
    );
  }

  if (error || !estado) {
    return (
      <Marco>
        <Aviso tono="error" titulo="No se pudo cargar la actividad">
          {error ?? 'Inténtalo de nuevo en un momento.'}
        </Aviso>
      </Marco>
    );
  }

  if (!estado.aplica) {
    return (
      <Marco>
        <Titulo>Evaluación de las ofertas</Titulo>
        <Aviso tono="aviso" titulo="Esta modalidad no evalúa ofertas">
          {estado.motivoNoAplica ?? 'La modalidad del proceso no adelanta evaluación de ofertas.'}
        </Aviso>
      </Marco>
    );
  }

  const resultado = estado.resultado;
  const actualizando = formulario === 'actualizar';
  const listoParaEnviar = archivos.length > 0 && (!actualizando || motivo.trim().length > 0);

  // Declarar desierto desde aquí: sin ofertas, o ninguna cumple (EFDS-1157).
  const declaratoria = desierta?.declaratoria ?? null;
  const puedeOfrecerDesierto =
    !!desierta?.aplica && (desierta.puedeDeclarar || !!declaratoria);

  return (
    <Marco>
      <Titulo>Evaluación de las ofertas</Titulo>
      <Ayuda>
        La evaluación de este punto es preliminar: el comité evalúa por fuera de la plataforma y
        carga aquí su informe consolidado, en uno o varios archivos. No se registran puntajes ni
        ganadora; la oferta que gana se define en el informe definitivo (7.2). Este mismo informe es
        el que se publica y se traslada en la 6.4.
      </Ayuda>

      {/* Lo que impide cargar se dice por separado, en vez de dejar el panel
          vacío sin explicación. */}
      {!estado.recepcionCerrada ? (
        <Pendiente
          falta="6.1"
          texto="La recepción de ofertas sigue abierta: no hay nada que evaluar mientras la lista pueda cambiar."
        />
      ) : !estado.comiteDesignado && estado.ofertas.length > 0 ? (
        <Pendiente
          falta="6.2"
          texto="No hay comité evaluador designado. Sin comité no hay quién responda por la evaluación."
        />
      ) : estado.ofertas.length === 0 ? (
        <Aviso tono="aviso" titulo="El proceso cerró sin ofertas">
          No se recibió ninguna oferta, así que no hay nada que evaluar: lo que sigue es declarar
          desierto el proceso.
        </Aviso>
      ) : null}

      {estado.esMiembroDelComite && (
        <Aviso tono="ok" titulo="Integras el comité de este proceso">
          Fuiste designado para la evaluación{' '}
          {estado.misDimensiones.map((d) => ETIQUETA_DIMENSION[d]).join(' y ')}. El informe lo
          carga cualquiera de los miembros, en nombre del comité.
        </Aviso>
      )}

      {/* Las ofertas que se evaluaron. */}
      {estado.ofertas.length > 0 && (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-slate-50">
                <th className="px-3 py-2 text-[10.5px] font-black uppercase tracking-wide text-slate-500">
                  Oferta
                </th>
                <th className="px-3 py-2 text-[10.5px] font-black uppercase tracking-wide text-slate-500 text-right">
                  Valor ofertado
                </th>
              </tr>
            </thead>
            <tbody>
              {estado.ofertas.map((oferta) => (
                <tr key={oferta.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-3 py-2.5">
                    <p className="text-[12.5px] font-bold text-slate-800 m-0 break-words">
                      {oferta.numero}. {oferta.nombre}
                    </p>
                    <p className="text-[11px] text-slate-500 m-0 mt-0.5">{oferta.identificacion}</p>
                  </td>
                  <td className="px-3 py-2.5 text-[12px] text-slate-700 tabular-nums text-right whitespace-nowrap">
                    {pesos(oferta.valorOfertado)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {resultado && (
        <>
          <InformeCargado resultado={resultado} />

          {/* Volver a cargarlo si tiene un error u omisión (EFDS-1157). */}
          {estado.puedeActualizar && !formulario && (
            <BotonSecundario
              icono={<RefreshCw className="w-3.5 h-3.5" />}
              disabled={guardando}
              onClick={() => setFormulario('actualizar')}
            >
              Volver a cargar el informe
            </BotonSecundario>
          )}

          {/* Otros soportes del comité: actas de reunión y similares. */}
          {estado.esMiembroDelComite && !formulario && (
            <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3 space-y-3">
              <div>
                <label
                  htmlFor="evidencia-descripcion"
                  className="block text-xs font-bold text-gray-600 mb-1.5"
                >
                  Otro documento del comité
                </label>
                <input
                  id="evidencia-descripcion"
                  type="text"
                  maxLength={300}
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Acta de reunión del comité, cuadro comparativo…"
                  className={campo}
                />
              </div>

              <SelectorArchivo
                etiqueta="Archivo del documento"
                acepta=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                archivo={evidencia}
                onElegir={setEvidencia}
              />

              <Boton
                icono={<UploadCloud className="w-3.5 h-3.5" />}
                disabled={guardando || !evidencia || !descripcion.trim()}
                onClick={cargarEvidencia}
              >
                {guardando ? 'Cargando…' : 'Cargar documento'}
              </Boton>
            </div>
          )}
        </>
      )}

      {estado.puedeRegistrar && !formulario && (
        <Boton
          icono={<UploadCloud className="w-3.5 h-3.5" />}
          onClick={() => setFormulario('cargar')}
        >
          Cargar el informe de evaluación preliminar
        </Boton>
      )}

      {formulario && (
        <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3 space-y-3">
          <p className="text-[12.5px] font-bold text-slate-800 m-0">
            {actualizando
              ? 'Volver a cargar el informe de evaluación preliminar'
              : 'Informe de evaluación preliminar'}
          </p>

          <ArchivosDelInforme archivos={archivos} onCambio={setArchivos} />

          {actualizando && (
            <div>
              <label
                htmlFor="informe-motivo"
                className="block text-xs font-bold text-gray-600 mb-1.5"
              >
                Por qué se vuelve a cargar <span className="text-red-600">*</span>
              </label>
              <textarea
                id="informe-motivo"
                rows={2}
                maxLength={1000}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Faltaba la verificación financiera de una oferta, había un error en…"
                className={campo}
              />
              <p className="text-[11px] text-gray-500 mt-1.5 mb-0 leading-relaxed">
                El informe anterior queda en el historial con la fecha, quién lo cambió y este
                motivo. Lo que ya se trasladó a los oferentes no cambia.
              </p>
            </div>
          )}

          <div>
            <label
              htmlFor="informe-observacion"
              className="block text-xs font-bold text-gray-600 mb-1.5"
            >
              Observación
            </label>
            <textarea
              id="informe-observacion"
              rows={2}
              maxLength={4000}
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              placeholder="Opcional."
              className={campo}
            />
          </div>

          <div className="flex items-center gap-2">
            <Boton
              icono={<UploadCloud className="w-3.5 h-3.5" />}
              disabled={guardando || !listoParaEnviar}
              onClick={() => firma.conFirma(enviar)}
            >
              {guardando ? 'Cargando…' : actualizando ? 'Volver a cargar' : 'Cargar informe'}
            </Boton>
            <button
              type="button"
              onClick={limpiar}
              className="text-[11.5px] font-bold text-slate-500 hover:underline"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Las versiones anteriores quedan a la vista, con su motivo. */}
      {estado.rectificados.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11.5px] font-bold text-slate-700 m-0">Versiones anteriores del informe</p>
          {estado.rectificados.map((previo) => (
            <VersionAnterior key={previo.id} resultado={previo} />
          ))}
        </div>
      )}

      {/* Declarar desierto desde la evaluación: no hubo ofertas, o ninguna cumple. */}
      {puedeOfrecerDesierto && estado.recepcionCerrada && (
        <div className="space-y-2 pt-1">
          {declaratoria || declarando ? (
            <PanelDesierta
              procesoId={procesoId}
              estado={desierta!}
              onCambio={async () => {
                await leer();
                onCambio?.();
              }}
            />
          ) : (
            <div className="rounded-lg border border-gray-200 bg-slate-50 px-3.5 py-3 space-y-2">
              <p className="text-[12px] text-slate-700 m-0 leading-relaxed">
                Si no se recibieron ofertas, o ninguna cumple y todas están en causal de rechazo, el
                proceso se declara desierto y pasa a la resolución de declaratoria.
              </p>
              <BotonSecundario
                icono={<Ban className="w-3.5 h-3.5" />}
                onClick={() => setDeclarando(true)}
              >
                Declarar desierto el proceso
              </BotonSecundario>
            </div>
          )}
          {declarando && !declaratoria && (
            <button
              type="button"
              onClick={() => setDeclarando(false)}
              className="inline-flex items-center gap-1 text-[11.5px] font-bold text-slate-500 hover:underline"
            >
              <X className="w-3 h-3" /> No declarar desierto
            </button>
          )}
        </div>
      )}

      {estado.comiteDesignado && !estado.esMiembroDelComite && estado.ofertas.length > 0 && (
        <p className="text-[11px] text-slate-500 m-0 flex items-start gap-1.5 leading-relaxed">
          <ClipboardList className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
          Consultas la evaluación, pero no cargas el informe: lo carga el comité designado en este
          proceso, que es el que responde por él.
        </p>
      )}
      {firma.modal}
    </Marco>
  );
}

/** El informe vigente, con todos sus archivos. */
function InformeCargado({ resultado }: { resultado: ResultadoEvaluacion }) {
  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-3 space-y-1.5">
      <p className="text-[12.5px] font-bold text-emerald-900 m-0">
        Informe de evaluación preliminar
      </p>
      {/* Los resultados de antes de la 120 nombraban ganadora: se siguen mostrando. */}
      {resultado.ganadora && (
        <p className="text-[11.5px] text-emerald-900 m-0">
          Registro anterior: el comité nombró a {resultado.ganadora.nombre}
          {resultado.puntajeObtenido != null
            ? ` (${resultado.puntajeObtenido} de ${resultado.puntajeMaximo})`
            : ''}
          .
        </p>
      )}
      {resultado.justificacion && (
        <p className="text-[11.5px] text-emerald-900 m-0 leading-relaxed break-words">
          {resultado.justificacion}
        </p>
      )}
      <ListaDeArchivos resultado={resultado} />
      <p className="text-[11px] text-emerald-900 m-0 leading-relaxed">
        Cargado por {resultado.registradoPor ?? 'el comité'} el{' '}
        {momentoConHora(resultado.registradoAt)}.
      </p>
    </div>
  );
}

/** Una versión anterior del informe, con quién la cambió, cuándo y por qué. */
function VersionAnterior({ resultado }: { resultado: ResultadoEvaluacion }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-slate-50 px-3.5 py-2.5 space-y-1">
      <p className="text-[11.5px] text-slate-700 m-0 leading-relaxed break-words">
        <span className="font-bold">
          Cargado el {momentoConHora(resultado.registradoAt)}
          {resultado.registradoPor ? ` por ${resultado.registradoPor}` : ''}
        </span>
        {' · '}
        Reemplazado{resultado.rectificadoPor ? ` por ${resultado.rectificadoPor}` : ''}
        {resultado.rectificadoAt ? ` el ${momentoConHora(resultado.rectificadoAt)}` : ''}:{' '}
        {resultado.motivoRectificacion}
      </p>
      <ListaDeArchivos resultado={resultado} />
    </div>
  );
}

/** Los archivos del informe; los de antes de la 120 tenían uno solo. */
function ListaDeArchivos({ resultado }: { resultado: ResultadoEvaluacion }) {
  const archivos = resultado.evidencias.length
    ? resultado.evidencias.map((e) => ({
        id: e.id,
        nombre: e.descripcion,
        archivoUrl: e.archivoUrl,
      }))
    : resultado.informe
      ? [{ id: resultado.informe.id, nombre: resultado.informe.nombre, archivoUrl: resultado.informe.archivoUrl }]
      : [];

  return (
    <ul className="list-none p-0 m-0 space-y-0.5">
      {archivos.map((a) => (
        <li key={a.id}>
          {a.archivoUrl ? (
            <a
              href={contratacionService.urlDescarga(a.archivoUrl)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-[#003DA5] hover:underline"
            >
              <Download className="w-3.5 h-3.5" />
              {a.nombre}
            </a>
          ) : (
            <span className="text-[11.5px] text-slate-600">{a.nombre}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * Los archivos del informe, cada uno con la dimensión que sustenta.
 *
 * Se suman a los ya elegidos: el informe puede llegar en varias tandas y
 * elegir de nuevo no debe borrar lo anterior.
 */
function ArchivosDelInforme({
  archivos,
  onCambio,
}: {
  archivos: ArchivoDelInforme[];
  onCambio: (archivos: ArchivoDelInforme[]) => void;
}) {
  const input = useRef<HTMLInputElement>(null);

  return (
    <div
      className={`rounded-lg border px-3.5 py-3 space-y-2 ${
        archivos.length ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 bg-white'
      }`}
    >
      <p className="text-xs font-bold m-0 flex items-start gap-1.5 text-slate-700">
        <FileText className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        Archivos del informe <span className="text-red-600">*</span>
      </p>
      <p className="text-[11px] text-slate-500 m-0 leading-relaxed">
        Uno consolidado, o uno por dimensión: jurídica, técnica y financiera y económica.
      </p>

      {archivos.length > 0 && (
        <ul className="list-none p-0 m-0 space-y-1.5">
          {archivos.map((a, i) => (
            <li key={`${a.archivo.name}-${i}`} className="flex items-center gap-2 flex-wrap">
              <span className="text-[12px] text-slate-800 truncate min-w-0 flex-1">
                {a.archivo.name}
              </span>
              <select
                aria-label={`De qué es ${a.archivo.name}`}
                value={a.dimension}
                onChange={(e) =>
                  onCambio(
                    archivos.map((x, j) =>
                      j === i ? { ...x, dimension: e.target.value as DimensionInforme } : x,
                    ),
                  )
                }
                className="text-[11.5px] border border-gray-300 rounded-md px-2 py-1 bg-white"
              >
                {(Object.keys(NOMBRE_DIMENSION) as DimensionInforme[]).map((d) => (
                  <option key={d} value={d}>
                    {NOMBRE_DIMENSION[d]}
                  </option>
                ))}
              </select>
              <button
                type="button"
                aria-label={`Quitar ${a.archivo.name}`}
                onClick={() => onCambio(archivos.filter((_, j) => j !== i))}
                className="text-slate-400 hover:text-red-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <input
        ref={input}
        type="file"
        multiple
        aria-label="Archivos del informe"
        className="hidden"
        accept=".pdf,.doc,.docx,.xls,.xlsx"
        onChange={(e) => {
          const elegidos = Array.from(e.target.files ?? []);
          e.target.value = '';
          onCambio([
            ...archivos,
            ...elegidos.map((archivo) => ({ archivo, dimension: 'CONSOLIDADO' as DimensionInforme })),
          ]);
        }}
      />
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md bg-white text-slate-700 border border-slate-300 hover:border-[#003DA5] hover:text-[#003DA5] transition-all"
      >
        <Paperclip className="w-3.5 h-3.5" />
        {archivos.length ? 'Agregar otro archivo' : 'Seleccionar archivos'}
      </button>
    </div>
  );
}

/** Un adjunto, con su nombre cuando ya está elegido. */
function SelectorArchivo({
  etiqueta,
  acepta,
  archivo,
  onElegir,
}: {
  etiqueta: string;
  acepta: string;
  archivo: File | null;
  onElegir: (archivo: File) => void;
}) {
  const input = useRef<HTMLInputElement>(null);

  return (
    <div
      className={`rounded-lg border px-3.5 py-3 space-y-2 ${
        archivo ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 bg-white'
      }`}
    >
      <p
        className={`text-xs font-bold m-0 flex items-start gap-1.5 ${
          archivo ? 'text-emerald-900' : 'text-slate-700'
        }`}
      >
        <FileText className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        {etiqueta}
      </p>
      <p
        className={`text-[11.5px] m-0 leading-relaxed break-words ${
          archivo ? 'text-emerald-900' : 'text-slate-600'
        }`}
      >
        {archivo ? archivo.name : 'Sin archivo seleccionado.'}
      </p>

      <input
        ref={input}
        type="file"
        // El input va oculto detrás del botón; sin nombre accesible sería un
        // control anónimo para quien navega con lector de pantalla.
        aria-label={etiqueta}
        className="hidden"
        accept={acepta}
        onChange={(e) => {
          const elegido = e.target.files?.[0];
          e.target.value = '';
          if (elegido) onElegir(elegido);
        }}
      />
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md bg-white text-slate-700 border border-slate-300 hover:border-[#003DA5] hover:text-[#003DA5] transition-all"
      >
        <Paperclip className="w-3.5 h-3.5" />
        {archivo ? 'Cambiar archivo' : 'Seleccionar archivo'}
      </button>
    </div>
  );
}
