import React, { useEffect, useRef, useState } from 'react';
import {
  Award,
  ClipboardList,
  Download,
  FileText,
  Paperclip,
  Undo2,
  UploadCloud,
} from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { EstadoEvaluacion, ResultadoEvaluacion, RolEvaluador } from '../../types';
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

interface Props {
  procesoId: string;
  onCambio?: () => void;
}

const ETIQUETA_DIMENSION: Record<RolEvaluador, string> = {
  JURIDICO: 'jurídica',
  FINANCIERO: 'financiera',
  TECNICO: 'técnica',
};

const pesos = (valor: number | null) =>
  valor == null
    ? '—'
    : new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
      }).format(valor);

/** Vacío es "no viene", no cero: el puntaje en blanco significa que no se puntuó. */
const aNumero = (texto: string): number | undefined => {
  const limpio = texto.trim();
  if (!limpio) return undefined;
  const numero = Number(limpio);
  return Number.isNaN(numero) ? undefined : numero;
};

/**
 * Actividad 6.3 · Evaluación de las ofertas (EFDS-1157).
 *
 * **Aquí no se califica.** El comité evalúa por fuera, con sus formatos y su
 * cuadro comparativo, y elige la ganadora; esta pantalla recibe la decisión ya
 * tomada, el informe que la sustenta y las evidencias que la acompañan. Así lo
 * dice la matriz de roles del Comité Evaluador: consulta y cargue de archivos.
 *
 * Quién puede registrar no lo decide el rol del token sino la membresía del
 * comité de este proceso —lo que devuelve `esMiembroDelComite`—, porque un
 * evaluador designado en otro proceso entra a mirar y nada más.
 */
export function PanelEvaluacion({ procesoId, onCambio }: Props) {
  const [estado, setEstado] = useState<EstadoEvaluacion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [registrando, setRegistrando] = useState(false);

  const [ganadora, setGanadora] = useState('');
  const [puntajeObtenido, setPuntajeObtenido] = useState('');
  const [puntajeMaximo, setPuntajeMaximo] = useState('');
  const [valorEvaluado, setValorEvaluado] = useState('');
  const [justificacion, setJustificacion] = useState('');
  const [informe, setInforme] = useState<File | null>(null);

  const [descripcion, setDescripcion] = useState('');
  const [evidencia, setEvidencia] = useState<File | null>(null);

  const leer = () =>
    contratacionService
      .evaluacion(procesoId)
      .then((datos) => {
        setEstado(datos);
        setError(null);
      })
      .catch((err: any) => setError(err.message))
      .finally(() => setCargando(false));

  useEffect(() => {
    setCargando(true);
    leer();
  }, [procesoId]);

  const limpiar = () => {
    setGanadora('');
    setPuntajeObtenido('');
    setPuntajeMaximo('');
    setValorEvaluado('');
    setJustificacion('');
    setInforme(null);
    setRegistrando(false);
  };

  const registrar = async () => {
    if (!ganadora || !informe || !justificacion.trim()) return;

    setGuardando(true);
    try {
      setEstado(
        await contratacionService.registrarResultadoEvaluacion(
          procesoId,
          {
            oferenteId: ganadora,
            puntajeObtenido: aNumero(puntajeObtenido),
            puntajeMaximo: aNumero(puntajeMaximo),
            valorEvaluado: aNumero(valorEvaluado),
            justificacion: justificacion.trim(),
          },
          informe,
        ),
      );
      limpiar();
      toast.success('Resultado de la evaluación registrado');
      onCambio?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const rectificar = async () => {
    const motivo = window.prompt('¿Por qué se rectifica el resultado registrado?')?.trim();
    if (!motivo) return;

    setGuardando(true);
    try {
      setEstado(await contratacionService.rectificarResultadoEvaluacion(procesoId, motivo));
      toast.success('Resultado rectificado; el proceso queda sin resultado vigente');
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
      toast.success('Evidencia cargada');
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

  return (
    <Marco>
      <Titulo>Evaluación de las ofertas</Titulo>
      <Ayuda>
        El comité evalúa las ofertas por fuera de la plataforma, con sus propios formatos y su
        cuadro comparativo, y elige la ganadora. Aquí se registra esa decisión con el informe que la
        sustenta; la aplicación no califica ni recalcula lo que el comité reportó.
      </Ayuda>

      {/* Lo que impide registrar se dice por separado, en vez de dejar el panel
          vacío sin explicación. */}
      {!estado.recepcionCerrada ? (
        <Pendiente
          falta="6.1"
          texto="La recepción de ofertas sigue abierta: no hay resultado que registrar mientras la lista pueda cambiar."
        />
      ) : !estado.comiteDesignado ? (
        <Pendiente
          falta="6.2"
          texto="No hay comité evaluador designado. Sin comité no hay quién responda por la evaluación."
        />
      ) : estado.ofertas.length === 0 ? (
        <Aviso tono="aviso" titulo="El proceso cerró sin ofertas">
          No se recibió ninguna oferta, así que no hay nada que evaluar.
        </Aviso>
      ) : null}

      {estado.esMiembroDelComite && (
        <Aviso tono="ok" titulo="Integras el comité de este proceso">
          Fuiste designado para la evaluación{' '}
          {estado.misDimensiones.map((d) => ETIQUETA_DIMENSION[d]).join(' y ')}. El resultado lo
          registra cualquiera de los miembros, en nombre del comité.
        </Aviso>
      )}

      {/* Las ofertas que se evaluaron: sin ellas el resultado es un nombre
          suelto, y son la lista de la que sale la ganadora. */}
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
                      {resultado?.ganadora?.id === oferta.id && (
                        <span className="ml-2 inline-block px-2 py-0.5 text-[10.5px] font-bold rounded-md border bg-emerald-50 text-emerald-800 border-emerald-200">
                          Ganadora
                        </span>
                      )}
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
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-3">
            <div className="flex items-start gap-2.5">
              <Award className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-900" />
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-[12.5px] font-bold text-emerald-900 m-0 break-words">
                  Ganadora: {resultado.ganadora?.nombre ?? 'oferta no encontrada'}
                </p>
                <p className="text-[11.5px] text-emerald-900 m-0 leading-relaxed">
                  {resultado.puntajeObtenido != null
                    ? `Puntaje ${resultado.puntajeObtenido} de ${resultado.puntajeMaximo}. `
                    : 'La modalidad no puntúa: el comité no reportó calificación. '}
                  Valor evaluado: {pesos(resultado.valorEvaluado)}.
                </p>
                <p className="text-[11.5px] text-emerald-900 m-0 leading-relaxed break-words">
                  {resultado.justificacion}
                </p>
                <p className="text-[11px] text-emerald-900 m-0 leading-relaxed">
                  Registrado por {resultado.registradoPor ?? 'el comité'} el{' '}
                  {momentoConHora(resultado.registradoAt)}.
                </p>
                {resultado.informe && (
                  <a
                    href={contratacionService.urlDescarga(resultado.informe.archivoUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-emerald-900 hover:underline"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {resultado.informe.nombre}
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[11.5px] font-bold text-slate-700 m-0">
              Evidencias de la evaluación
            </p>
            {resultado.evidencias.length === 0 ? (
              <p className="text-[11.5px] text-slate-500 m-0 leading-relaxed">
                Todavía no se ha cargado ninguna: las verificaciones jurídica, financiera y técnica,
                el cuadro comparativo y las actas del comité van aquí.
              </p>
            ) : (
              resultado.evidencias.map((e) => (
                <div
                  key={e.id}
                  className="rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 flex items-start gap-2.5"
                >
                  <FileText className="w-4 h-4 mt-0.5 flex-shrink-0 text-slate-500" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-bold text-slate-800 m-0 break-words">
                      {e.descripcion}
                    </p>
                    <p className="text-[11px] text-slate-500 m-0 mt-0.5">
                      {e.cargadaPor ? `${e.cargadaPor} · ` : ''}
                      {momentoConHora(e.cargadaAt)}
                    </p>
                  </div>
                  {e.archivoUrl && (
                    <a
                      href={contratacionService.urlDescarga(e.archivoUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1 rounded text-slate-400 hover:text-[#003DA5] flex-shrink-0"
                      aria-label={`Descargar ${e.descripcion}`}
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              ))
            )}
          </div>

          {/* El cargue de evidencias no se cierra con el registro: las
              verificaciones y las actas llegan en momentos distintos. */}
          {estado.esMiembroDelComite && (
            <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3 space-y-3">
              <div>
                <label
                  htmlFor="evidencia-descripcion"
                  className="block text-xs font-bold text-gray-600 mb-1.5"
                >
                  Qué documento cargas <span className="text-red-600">*</span>
                </label>
                <input
                  id="evidencia-descripcion"
                  type="text"
                  maxLength={300}
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Verificación financiera, cuadro comparativo, acta del comité…"
                  className={campo}
                />
              </div>

              <SelectorArchivo
                etiqueta="Archivo de la evidencia"
                acepta=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                archivo={evidencia}
                onElegir={setEvidencia}
              />

              <Boton
                icono={<UploadCloud className="w-3.5 h-3.5" />}
                disabled={guardando || !evidencia || !descripcion.trim()}
                onClick={cargarEvidencia}
              >
                {guardando ? 'Cargando…' : 'Cargar evidencia'}
              </Boton>
            </div>
          )}

          {estado.esMiembroDelComite && (
            <BotonSecundario
              icono={<Undo2 className="w-3.5 h-3.5" />}
              disabled={guardando}
              onClick={rectificar}
            >
              Rectificar el resultado
            </BotonSecundario>
          )}
        </>
      )}

      {estado.puedeRegistrar && !registrando && (
        <Boton icono={<Award className="w-3.5 h-3.5" />} onClick={() => setRegistrando(true)}>
          Registrar el resultado
        </Boton>
      )}

      {estado.puedeRegistrar && registrando && (
        <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3 space-y-3">
          <p className="text-[12.5px] font-bold text-slate-800 m-0">
            Resultado de la evaluación del comité
          </p>

          <div>
            <label
              htmlFor="resultado-ganadora"
              className="block text-xs font-bold text-gray-600 mb-1.5"
            >
              Oferta ganadora <span className="text-red-600">*</span>
            </label>
            <select
              id="resultado-ganadora"
              value={ganadora}
              onChange={(e) => setGanadora(e.target.value)}
              className={campo}
            >
              <option value="">Elige la oferta que el comité seleccionó…</option>
              {estado.ofertas.map((oferta) => (
                <option key={oferta.id} value={oferta.id}>
                  {oferta.numero}. {oferta.nombre} — {pesos(oferta.valorOfertado)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label
                htmlFor="resultado-puntaje"
                className="block text-xs font-bold text-gray-600 mb-1.5"
              >
                Puntaje obtenido
              </label>
              <input
                id="resultado-puntaje"
                type="number"
                min={0}
                step="0.01"
                value={puntajeObtenido}
                onChange={(e) => setPuntajeObtenido(e.target.value)}
                className={campo}
              />
            </div>
            <div>
              <label
                htmlFor="resultado-escala"
                className="block text-xs font-bold text-gray-600 mb-1.5"
              >
                Sobre un máximo de
              </label>
              <input
                id="resultado-escala"
                type="number"
                min={0}
                step="0.01"
                value={puntajeMaximo}
                onChange={(e) => setPuntajeMaximo(e.target.value)}
                className={campo}
              />
            </div>
          </div>
          {/* Los dos o ninguno: es la regla del servidor, dicha aquí antes de
              enviar. Un 85 sin saber sobre cuánto no dice nada. */}
          <p className="text-[11px] text-gray-500 m-0 leading-relaxed">
            Déjalos en blanco si la modalidad no puntúa —en mínima cuantía suele bastar con el menor
            precio que cumple—. Si reportas puntaje, va con la escala que usó el comité.
          </p>

          <div>
            <label
              htmlFor="resultado-valor"
              className="block text-xs font-bold text-gray-600 mb-1.5"
            >
              Valor evaluado
            </label>
            <input
              id="resultado-valor"
              type="number"
              min={0}
              step="0.01"
              value={valorEvaluado}
              onChange={(e) => setValorEvaluado(e.target.value)}
              className={campo}
            />
            <p className="text-[11px] text-gray-500 mt-1.5 mb-0 leading-relaxed">
              Solo si el comité corrigió la cifra que presentó el oferente. En blanco se toma el
              valor ofertado.
            </p>
          </div>

          <div>
            <label
              htmlFor="resultado-justificacion"
              className="block text-xs font-bold text-gray-600 mb-1.5"
            >
              Por qué esa oferta <span className="text-red-600">*</span>
            </label>
            <textarea
              id="resultado-justificacion"
              rows={3}
              maxLength={4000}
              value={justificacion}
              onChange={(e) => setJustificacion(e.target.value)}
              placeholder="Lo que el traslado del informe le tiene que poder mostrar a los demás oferentes."
              className={campo}
            />
          </div>

          <SelectorArchivo
            etiqueta="Informe de evaluación del comité"
            acepta=".pdf,.doc,.docx,.xls,.xlsx"
            archivo={informe}
            onElegir={setInforme}
          />

          <div className="flex items-center gap-2">
            <Boton
              icono={<Award className="w-3.5 h-3.5" />}
              disabled={guardando || !ganadora || !informe || !justificacion.trim()}
              onClick={registrar}
            >
              {guardando ? 'Registrando…' : 'Registrar resultado'}
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

      {/* Los rectificados quedan a la vista: son los que explican que el
          expediente tenga dos informes de evaluación del mismo proceso. */}
      {estado.rectificados.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11.5px] font-bold text-slate-700 m-0">Resultados rectificados</p>
          {estado.rectificados.map((previo) => (
            <RectificadoAnterior key={previo.id} resultado={previo} />
          ))}
        </div>
      )}

      {estado.comiteDesignado && !estado.esMiembroDelComite && estado.ofertas.length > 0 && (
        <p className="text-[11px] text-slate-500 m-0 flex items-start gap-1.5 leading-relaxed">
          <ClipboardList className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
          Consultas la evaluación, pero no la registras: el resultado lo reporta el comité designado
          en este proceso, que es el que responde por él.
        </p>
      )}
    </Marco>
  );
}

/** Un resultado que se dejó sin efecto, con el motivo y el informe que tuvo. */
function RectificadoAnterior({ resultado }: { resultado: ResultadoEvaluacion }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-slate-50 px-3.5 py-2.5">
      <p className="text-[12px] font-bold text-slate-700 m-0 break-words">
        {resultado.ganadora?.nombre ?? 'Oferta no encontrada'}
        {resultado.puntajeObtenido != null
          ? ` · ${resultado.puntajeObtenido} de ${resultado.puntajeMaximo}`
          : ''}
      </p>
      <p className="text-[11px] text-slate-600 m-0 mt-0.5 leading-relaxed break-words">
        Rectificado{resultado.rectificadoPor ? ` por ${resultado.rectificadoPor}` : ''}
        {resultado.rectificadoAt ? ` el ${momentoConHora(resultado.rectificadoAt)}` : ''}:{' '}
        {resultado.motivoRectificacion}
      </p>
      {resultado.informe && (
        <a
          href={contratacionService.urlDescarga(resultado.informe.archivoUrl)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 mt-1 text-[11px] font-bold text-slate-600 hover:underline"
        >
          <Download className="w-3 h-3" />
          {resultado.informe.nombre}
        </a>
      )}
    </div>
  );
}

/** Adjunto obligatorio, con su nombre cuando ya está elegido. */
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
        {etiqueta} <span className="text-red-600">*</span>
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
