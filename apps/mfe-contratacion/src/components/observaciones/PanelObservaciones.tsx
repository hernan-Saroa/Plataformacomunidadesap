import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCheck,
  Clock,
  Info,
  MessageSquarePlus,
  Paperclip,
  Reply,
} from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { EstadoObservaciones, ObservacionPliego } from '../../types';
import {
  Aviso,
  Ayuda,
  Boton,
  BotonSecundario,
  campo,
  Marco,
  Pendiente,
  SinPermiso,
  Titulo,
} from '../shared/PiezasPanel';
import { fechaLarga, hoyEnBogota, momento } from '../shared/fechas';

interface Props {
  procesoId: string;
  onCambio?: () => void;
}

/**
 * Actividad 5.3 · Observaciones al proyecto de pliego (EFDS-1151).
 *
 * Las observaciones llegan por SECOP II y la plataforma no habla con SECOP
 * (EFDS-1386), así que el gestor las transcribe con su soporte. La pantalla lo
 * dice en vez de aparentar que se reciben solas.
 *
 * Lo que la entidad debe poder demostrar es que las recibió y que las
 * respondió, así que lo que manda la vista es qué queda sin responder.
 */
export function PanelObservaciones({ procesoId, onCambio }: Props) {
  const [estado, setEstado] = useState<EstadoObservaciones | null>(null);
  const [cargando, setCargando] = useState(true);
  const [trabajando, setTrabajando] = useState(false);
  const [registrando, setRegistrando] = useState(false);

  const cargar = async () => {
    setCargando(true);
    try {
      setEstado(await contratacionService.observaciones(procesoId));
    } catch (err: any) {
      toast.error('No se pudieron cargar las observaciones', {
        id: 'observaciones-carga',
        description: err.message,
      });
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, [procesoId]);

  /** Devuelve si salió bien: quien llama decide qué limpiar y qué conservar. */
  const ejecutar = async (accion: () => Promise<unknown>, exito: string): Promise<boolean> => {
    setTrabajando(true);
    try {
      await accion();
      toast.success(exito);
      await cargar();
      onCambio?.();
      return true;
    } catch (err: any) {
      toast.error('No se pudo completar la acción', { description: err.message });
      return false;
    } finally {
      setTrabajando(false);
    }
  };

  if (cargando) {
    return <p className="text-xs text-slate-500 m-0 px-4 py-3">Cargando…</p>;
  }
  if (!estado) {
    return (
      <p className="text-xs text-red-600 m-0 px-4 py-3">No se pudieron cargar las observaciones</p>
    );
  }

  if (!estado.aplica) {
    return (
      <Marco>
        <Aviso tono="ok" titulo="Esta modalidad no recibe observaciones al proyecto de pliego">
          No hay etapa de observaciones en este flujo, así que no queda nada pendiente de atender
          por este concepto.
        </Aviso>
      </Marco>
    );
  }

  // Sin pliego publicado no hay sobre qué observar, y el backend lo rechaza.
  // Se dice aquí para no ofrecer un formulario que va a fallar.
  if (!estado.publicado) {
    return (
      <Marco>
        <Pendiente
          falta="5.2"
          texto="Las observaciones se presentan sobre el proyecto de pliego publicado. Registra primero la publicación y su plazo de publicidad."
        />
      </Marco>
    );
  }

  const { resumen } = estado;

  return (
    <Marco>
      <Resumen estado={estado} />

      {estado.observaciones.length > 0 && (
        <ul className="list-none m-0 p-0 space-y-2">
          {estado.observaciones.map((observacion) => (
            <li key={observacion.id}>
              <Observacion
                observacion={observacion}
                puedeResponder={estado.puedeGestionar}
                trabajando={trabajando}
                onResponder={(datos) =>
                  ejecutar(
                    () =>
                      contratacionService.responderObservacion(
                        procesoId,
                        observacion.id,
                        datos,
                      ),
                    'Observación respondida',
                  )
                }
              />
            </li>
          ))}
        </ul>
      )}

      {resumen.total === 0 && (
        <div className="rounded-lg border border-gray-200 bg-slate-50 px-3.5 py-3">
          <p className="text-xs text-slate-700 m-0">
            {estado.plazoVencido
              ? 'No se registró ninguna observación y el plazo de publicidad ya venció.'
              : 'Todavía no se ha registrado ninguna observación. El plazo de publicidad sigue corriendo.'}
          </p>
        </div>
      )}

      {!estado.puedeGestionar ? (
        <SinPermiso quien="el gestor o la Dirección de Contratación" />
      ) : (
        <div className="pt-2 border-t border-gray-200 space-y-2">
          {registrando ? (
            <FormularioObservacion
              trabajando={trabajando}
              onCancelar={() => setRegistrando(false)}
              onRegistrar={async (datos, soporte) => {
                const ok = await ejecutar(
                  () => contratacionService.registrarObservacion(procesoId, datos, soporte),
                  'Observación registrada',
                );
                if (ok) setRegistrando(false);
                return ok;
              }}
            />
          ) : (
            <Boton
              disabled={trabajando}
              onClick={() => setRegistrando(true)}
              icono={<MessageSquarePlus className="w-3.5 h-3.5" />}
            >
              Registrar una observación
            </Boton>
          )}

          {estado.puedeCerrarse && !registrando && (
            <div className="space-y-1.5">
              <Ayuda>
                No recibir observaciones es un resultado legítimo. Con el plazo vencido puedes dar
                por cumplida la actividad para que no quede pendiente en el riel.
              </Ayuda>
              <BotonSecundario
                disabled={trabajando}
                onClick={() =>
                  ejecutar(
                    () => contratacionService.cerrarSinObservaciones(procesoId),
                    'Actividad cerrada sin observaciones',
                  )
                }
                icono={<CheckCheck className="w-3.5 h-3.5" />}
              >
                Dar por cumplida: no hubo observaciones
              </BotonSecundario>
            </div>
          )}
        </div>
      )}

      <Origen />
    </Marco>
  );
}

// ------------------------------------------------------------- piezas ------

/**
 * Qué queda por atender, de un vistazo.
 *
 * Lo que decide si la actividad está cumplida es que ninguna observación quede
 * sin responder, así que el número que manda es el de pendientes.
 */
function Resumen({ estado }: { estado: EstadoObservaciones }) {
  const { resumen, cumplida } = estado;

  if (cumplida) {
    return (
      <Aviso tono="ok" titulo="Actividad cumplida">
        {resumen.total === 0
          ? 'El plazo venció sin observaciones y la actividad quedó cerrada.'
          : `Las ${resumen.total} observaciones recibidas están respondidas.`}
      </Aviso>
    );
  }

  if (resumen.pendientes > 0) {
    return (
      <Aviso
        tono="aviso"
        titulo={`${resumen.pendientes} ${
          resumen.pendientes === 1
            ? 'observación sin responder'
            : 'observaciones sin responder'
        }`}
      >
        La actividad se cumple cuando todas tengan respuesta. De {resumen.total} recibidas,{' '}
        {resumen.fueraDeTermino > 0
          ? `${resumen.fueraDeTermino} llegaron fuera del plazo de publicidad.`
          : 'todas llegaron dentro del plazo.'}
      </Aviso>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-slate-50 px-3.5 py-3">
      <p className="text-xs text-slate-700 m-0">
        <span className="font-bold tabular-nums">{resumen.total}</span>{' '}
        {resumen.total === 1 ? 'observación recibida' : 'observaciones recibidas'}
        {resumen.fueraDeTermino > 0 && (
          <>
            {' · '}
            <span className="font-bold tabular-nums">{resumen.fueraDeTermino}</span> fuera de
            término
          </>
        )}
      </p>
    </div>
  );
}

/** Una observación con su respuesta, o con el formulario para dársela. */
function Observacion({
  observacion,
  puedeResponder,
  trabajando,
  onResponder,
}: {
  observacion: ObservacionPliego;
  puedeResponder: boolean;
  trabajando: boolean;
  onResponder: (datos: { respuesta: string; modificoPliego: boolean }) => Promise<boolean>;
}) {
  const [abierto, setAbierto] = useState(false);
  const [respuesta, setRespuesta] = useState('');
  /** Null hasta que se elige: se pide siempre y no se deduce del texto. */
  const [modifico, setModifico] = useState<boolean | null>(null);

  const respondida = observacion.respondidaAt !== null;

  return (
    <div
      className={`rounded-lg border px-3.5 py-3 space-y-2 ${
        respondida ? 'border-gray-200 bg-white' : 'border-amber-200 bg-amber-50'
      }`}
    >
      <div className="flex items-start gap-2 flex-wrap">
        {/* El estado se dice con palabras además del color: un borde ámbar no
            lo lee quien no distingue los tonos. */}
        <span
          className={`inline-flex items-center gap-1 text-xs font-bold ${
            respondida ? 'text-emerald-700' : 'text-amber-800'
          }`}
        >
          {respondida ? (
            <Check className="w-3.5 h-3.5" strokeWidth={3} />
          ) : (
            <Clock className="w-3.5 h-3.5" />
          )}
          {respondida ? 'Respondida' : 'Pendiente de respuesta'}
        </span>

        {observacion.fueraDeTermino && (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700">
            <AlertTriangle className="w-3.5 h-3.5" />
            Fuera del plazo de publicidad
          </span>
        )}
      </div>

      <div>
        <p className="text-sm font-bold text-slate-800 m-0">{observacion.asunto}</p>
        <p className="text-xs text-slate-500 m-0 mt-0.5">
          {observacion.presentadoPor}
          {observacion.identificacion ? ` · ${observacion.identificacion}` : ''} · presentada el{' '}
          {fechaLarga(observacion.fechaPresentacion)}
        </p>
      </div>

      <p className="text-xs text-slate-700 m-0 leading-relaxed whitespace-pre-line">
        {observacion.contenido}
      </p>

      {observacion.documentoId && (
        <p className="text-xs text-slate-500 m-0 flex items-center gap-1.5">
          <Paperclip className="w-3.5 h-3.5" />
          Soporte cargado en el expediente
        </p>
      )}

      {respondida ? (
        <div className="rounded-md border border-gray-200 bg-slate-50 px-3 py-2.5 space-y-1">
          <p className="text-xs font-bold text-slate-700 m-0">Respuesta de la entidad</p>
          <p className="text-xs text-slate-700 m-0 leading-relaxed whitespace-pre-line">
            {observacion.respuesta}
          </p>
          <p className="text-xs text-slate-500 m-0">
            {observacion.respondidaPor ?? 'Sin registrar'} ·{' '}
            {observacion.respondidaAt ? momento(observacion.respondidaAt) : ''} ·{' '}
            <span className="font-bold">
              {observacion.modificoPliego
                ? 'Llevó a modificar el pliego'
                : 'No modificó el pliego'}
            </span>
          </p>
        </div>
      ) : (
        puedeResponder &&
        (abierto ? (
          <div className="space-y-2 pt-1">
            <textarea
              value={respuesta}
              onChange={(e) => setRespuesta(e.target.value)}
              rows={3}
              placeholder="Respuesta de la entidad a la observación"
              aria-label="Respuesta de la entidad"
              className={campo}
            />

            <fieldset className="m-0 p-0 border-0">
              <legend className="text-xs font-bold text-slate-600 mb-1 p-0">
                ¿La observación llevó a modificar el pliego?
              </legend>
              <div className="flex items-center gap-4">
                {[
                  { valor: true, etiqueta: 'Sí, se modificó' },
                  { valor: false, etiqueta: 'No se modificó' },
                ].map((opcion) => (
                  <label
                    key={String(opcion.valor)}
                    className="inline-flex items-center gap-1.5 text-xs text-slate-700"
                  >
                    <input
                      type="radio"
                      name={`modifico-${observacion.id}`}
                      checked={modifico === opcion.valor}
                      onChange={() => setModifico(opcion.valor)}
                    />
                    {opcion.etiqueta}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="flex items-center gap-2">
              <Boton
                disabled={trabajando || !respuesta.trim() || modifico === null}
                onClick={async () => {
                  // Solo se cierra si la respuesta pasó: si falló, lo escrito
                  // debe seguir ahí para reintentar.
                  const ok = await onResponder({
                    respuesta: respuesta.trim(),
                    modificoPliego: modifico!,
                  });
                  if (ok) {
                    setRespuesta('');
                    setModifico(null);
                    setAbierto(false);
                  }
                }}
                icono={<Reply className="w-3.5 h-3.5" />}
              >
                Responder
              </Boton>
              <button
                type="button"
                onClick={() => setAbierto(false)}
                className="text-xs font-bold text-slate-500 hover:text-slate-700"
              >
                Cancelar
              </button>
            </div>

            <p className="text-xs text-slate-500 m-0">
              La respuesta hace parte del expediente y no se reescribe después.
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAbierto(true)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#003DA5] hover:underline"
          >
            <Reply className="w-3.5 h-3.5" />
            Responder esta observación
          </button>
        ))
      )}
    </div>
  );
}

/** Registro de una observación recibida, con su soporte si lo hubo. */
function FormularioObservacion({
  trabajando,
  onCancelar,
  onRegistrar,
}: {
  trabajando: boolean;
  onCancelar: () => void;
  onRegistrar: (
    datos: {
      presentadoPor: string;
      identificacion?: string;
      fechaPresentacion: string;
      asunto: string;
      contenido: string;
    },
    soporte: File | null,
  ) => Promise<boolean>;
}) {
  const [presentadoPor, setPresentadoPor] = useState('');
  const [identificacion, setIdentificacion] = useState('');
  const [fecha, setFecha] = useState(hoyEnBogota);
  const [asunto, setAsunto] = useState('');
  const [contenido, setContenido] = useState('');
  const [soporte, setSoporte] = useState<File | null>(null);
  const inputArchivo = useRef<HTMLInputElement>(null);

  const completo = presentadoPor.trim() && fecha && asunto.trim() && contenido.trim();

  return (
    <div className="space-y-2">
      <Titulo>Registrar una observación recibida</Titulo>
      <Ayuda>
        La fecha es la de presentación del interesado, no la de hoy: es la que decide si llegó
        dentro del plazo de publicidad.
      </Ayuda>

      <div className="grid grid-cols-3 gap-3">
        <label className="block">
          <span className="block text-xs font-bold text-slate-600 mb-1">Presentada por</span>
          <input
            value={presentadoPor}
            onChange={(e) => setPresentadoPor(e.target.value)}
            placeholder="Persona o empresa"
            aria-label="Quién presentó la observación"
            className={campo}
          />
        </label>
        <label className="block">
          <span className="block text-xs font-bold text-slate-600 mb-1">
            NIT o cédula (opcional)
          </span>
          <input
            value={identificacion}
            onChange={(e) => setIdentificacion(e.target.value)}
            placeholder="900123456-1"
            aria-label="Identificación de quien la presentó"
            className={campo}
          />
        </label>
        <label className="block">
          <span className="block text-xs font-bold text-slate-600 mb-1">
            Fecha de presentación
          </span>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            aria-label="Fecha en que se presentó la observación"
            className={campo}
          />
        </label>
      </div>

      <label className="block">
        <span className="block text-xs font-bold text-slate-600 mb-1">Asunto</span>
        <input
          value={asunto}
          onChange={(e) => setAsunto(e.target.value)}
          placeholder="Sobre qué versa la observación"
          aria-label="Asunto de la observación"
          className={campo}
        />
      </label>

      <label className="block">
        <span className="block text-xs font-bold text-slate-600 mb-1">
          Observación tal como se presentó
        </span>
        <textarea
          value={contenido}
          onChange={(e) => setContenido(e.target.value)}
          rows={4}
          aria-label="Contenido de la observación"
          className={campo}
        />
      </label>

      {/* El soporte es opcional, a diferencia de la evidencia de la
          publicación: la observación pudo llegar por un canal que no deja
          documento, y exigirlo obligaría a no registrarla. */}
      <div className="rounded-lg border border-gray-200 bg-slate-50 px-3.5 py-3 space-y-2">
        <p className="text-xs text-slate-700 m-0">
          {soporte ? soporte.name : 'Soporte de la observación (opcional)'}
        </p>
        <input
          ref={inputArchivo}
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
          onChange={(e) => e.target.files?.[0] && setSoporte(e.target.files[0])}
        />
        <button
          type="button"
          onClick={() => inputArchivo.current?.click()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md bg-white text-slate-700 border border-slate-300 hover:border-[#003DA5] hover:text-[#003DA5] transition-all"
        >
          <Paperclip className="w-3.5 h-3.5" />
          {soporte ? 'Cambiar archivo' : 'Adjuntar soporte'}
        </button>
      </div>

      <div className="flex items-center gap-2">
        <Boton
          disabled={trabajando || !completo}
          onClick={() =>
            onRegistrar(
              {
                presentadoPor: presentadoPor.trim(),
                identificacion: identificacion.trim() || undefined,
                fechaPresentacion: fecha,
                asunto: asunto.trim(),
                contenido: contenido.trim(),
              },
              soporte,
            )
          }
          icono={<MessageSquarePlus className="w-3.5 h-3.5" />}
        >
          Registrar observación
        </Boton>
        <button
          type="button"
          onClick={onCancelar}
          className="text-xs font-bold text-slate-500 hover:text-slate-700"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

/**
 * De dónde sale el dato.
 *
 * Las observaciones llegan por SECOP II y no hay integración: quien consulta el
 * expediente debe saber que está leyendo lo que el gestor transcribió, no algo
 * que la plataforma recibió sola.
 */
const Origen = () => (
  <p className="text-xs text-slate-500 m-0 flex items-start gap-1.5 leading-relaxed">
    <Info className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
    Registro manual: las observaciones se presentan en SECOP II y se transcriben aquí con su
    soporte. La plataforma no las recibe por sí sola.
  </p>
);
