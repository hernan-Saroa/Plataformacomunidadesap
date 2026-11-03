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
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { EstadoObservaciones, EvidenciaFirmaOtp, ObservacionPliego } from '../../types';
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
import { TerminarPlazo } from '../shared/TerminarPlazo';
import { fechaLarga, hoyEnBogota, momento } from '../shared/fechas';
import { useFirma } from '../shared/useFirma';

interface Props {
  procesoId: string;
  onCambio?: () => void;
}

const NUMERAL = '5.6';

/**
 * Actividad 5.6 · Observaciones al proyecto de pliego (EFDS-1151).
 *
 * Las observaciones llegan por SECOP II y la plataforma no habla con SECOP
 * (EFDS-1386), así que el gestor las transcribe con su soporte. La pantalla lo
 * dice en vez de aparentar que se reciben solas.
 *
 * Lo que la entidad debe poder demostrar es que las recibió y que las
 * respondió, así que lo que manda la vista es qué queda sin responder.
 */
export function PanelObservaciones({ procesoId, onCambio }: Props) {
  const firma = useFirma(NUMERAL, 'Cerrar la recepción de observaciones');
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
          falta="5.3"
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
                  firma.conFirma((firmaOtp) =>
                    ejecutar(
                      () =>
                        contratacionService.responderObservacion(
                          procesoId,
                          observacion.id,
                          datos,
                          firmaOtp,
                        ),
                      'Observación respondida',
                    ),
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

      {/* La llave de pruebas va aquí y no solo en el panel de la publicación:
          es en la 5.6 donde el término estorba, porque un proceso sin
          observaciones no se puede dar por cumplido hasta que venza. */}
      <TerminarPlazo
        visible={estado.puedeTerminarPlazo}
        termino="El plazo de publicidad"
        terminar={() => contratacionService.terminarPlazoPublicacion(procesoId)}
        onTerminado={cargar}
        nota="Si el pliego se publicó hoy, su fecha de publicación retrocede con el término: uno no puede terminar antes de empezar."
        disabled={trabajando}
      />

      {!estado.puedeGestionar ? (
        <SinPermiso quien="el gestor o la Dirección de Contratación" />
      ) : (
        <div className="pt-2 border-t border-gray-200 space-y-2">
          {registrando ? (
            <FormularioObservacion
              trabajando={trabajando}
              onCancelar={() => setRegistrando(false)}
              onRegistrar={async (datos, archivos) => {
                const ok = await ejecutar(
                  () => contratacionService.registrarObservacion(procesoId, datos, archivos),
                  'Observaciones del interesado registradas',
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
              Registrar observaciones de un interesado
            </Boton>
          )}

          {/* Lo habitual: un solo documento de respuestas para la actividad,
              sin obligar a responder interesado por interesado (127). */}
          {resumen.pendientes > 0 && !registrando && (
            <RespuestaGeneral
              pendientes={resumen.pendientes}
              trabajando={trabajando}
              onResponder={(datos, archivos) =>
                firma.conFirma((firmaOtp) =>
                  ejecutar(
                    () =>
                      contratacionService.responderTodasLasObservaciones(
                        procesoId,
                        datos,
                        archivos,
                        firmaOtp,
                      ),
                    'Observaciones respondidas con el documento general',
                  ),
                )
              }
            />
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
                  firma.conFirma((firmaOtp) =>
                    ejecutar(
                      () => contratacionService.cerrarSinObservaciones(procesoId, firmaOtp),
                      'Actividad cerrada sin observaciones',
                    ),
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
      {firma.modal}
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
  onResponder: (
    datos: { respuesta: string; modificoPliego?: boolean },
  ) => Promise<boolean> | boolean | undefined;
}) {
  const [abierto, setAbierto] = useState(false);
  const [respuesta, setRespuesta] = useState('');
  /** Informativo (127): null si no se dice. */
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
        <p className="text-sm font-bold text-slate-800 m-0">
          {observacion.presentadoPor ?? 'Interesado sin identificar'}
        </p>
        <p className="text-xs text-slate-500 m-0 mt-0.5">
          {observacion.asunto ? `${observacion.asunto} · ` : ''}
          {observacion.identificacion ? `${observacion.identificacion} · ` : ''}presentada el{' '}
          {fechaLarga(observacion.fechaPresentacion)}
        </p>
      </div>

      <p className="text-xs text-slate-700 m-0 leading-relaxed whitespace-pre-line">
        {observacion.contenido}
      </p>

      {(observacion.soportesDocumentoIds?.length ?? 0) > 0 && (
        <p className="text-xs text-slate-500 m-0 flex items-center gap-1.5">
          <Paperclip className="w-3.5 h-3.5" />
          {observacion.soportesDocumentoIds.length === 1
            ? 'Un archivo con el detalle, en el expediente'
            : `${observacion.soportesDocumentoIds.length} archivos con el detalle, en el expediente`}
        </p>
      )}

      {respondida ? (
        <div className="rounded-md border border-gray-200 bg-slate-50 px-3 py-2.5 space-y-1">
          <p className="text-xs font-bold text-slate-700 m-0">
            {observacion.respuestaGeneral
              ? 'Respondida con el documento general de respuestas'
              : 'Respuesta de la entidad'}
          </p>
          <p className="text-xs text-slate-700 m-0 leading-relaxed whitespace-pre-line">
            {observacion.respuesta}
          </p>
          <p className="text-xs text-slate-500 m-0">
            {observacion.respondidaPor ?? 'Sin registrar'} ·{' '}
            {observacion.respondidaAt ? momento(observacion.respondidaAt) : ''} ·{' '}
            <span className="font-bold">
              {observacion.modificoPliego === null
                ? 'Sin decir si modificó el pliego'
                : observacion.modificoPliego
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
                ¿Generó modificación del pliego? (opcional)
              </legend>
              <SiNo nombre={`modifico-${observacion.id}`} valor={modifico} onCambio={setModifico} />
            </fieldset>

            <div className="flex items-center gap-2">
              <Boton
                disabled={trabajando || !respuesta.trim()}
                onClick={async () => {
                  // Solo se cierra si la respuesta pasó: si falló, lo escrito
                  // debe seguir ahí para reintentar.
                  const ok = await onResponder({
                    respuesta: respuesta.trim(),
                    modificoPliego: modifico ?? undefined,
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
            Responder solo a este interesado
          </button>
        ))
      )}
    </div>
  );
}

/** Lo que presentó un interesado: observación general y archivos con el detalle (127). */
function FormularioObservacion({
  trabajando,
  onCancelar,
  onRegistrar,
}: {
  trabajando: boolean;
  onCancelar: () => void;
  onRegistrar: (
    datos: { presentadoPor?: string; fechaPresentacion: string; contenido: string },
    archivos: File[],
  ) => Promise<boolean>;
}) {
  const [presentadoPor, setPresentadoPor] = useState('');
  const [fecha, setFecha] = useState(hoyEnBogota);
  const [contenido, setContenido] = useState('');
  const [archivos, setArchivos] = useState<File[]>([]);

  const completo = fecha && contenido.trim();

  return (
    <div className="space-y-2">
      <Titulo>Registrar las observaciones de un interesado</Titulo>
      <Ayuda>
        Un registro por interesado: la observación general y los archivos con el detalle, tal como
        llegaron por SECOP II. La fecha es la de presentación: decide si llegó dentro del plazo de
        publicidad.
      </Ayuda>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="block text-xs font-bold text-slate-600 mb-1">
            Interesado, como aparece en SECOP (opcional)
          </span>
          <input
            value={presentadoPor}
            onChange={(e) => setPresentadoPor(e.target.value)}
            placeholder="Persona o empresa"
            aria-label="Interesado que presentó las observaciones"
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
            // El servidor rechaza las futuras; el calendario tampoco las
            // ofrece, para no descubrirlo al enviar todo el formulario.
            max={hoyEnBogota()}
            onChange={(e) => setFecha(e.target.value)}
            aria-label="Fecha en que se presentaron las observaciones"
            className={campo}
          />
        </label>
      </div>

      <label className="block">
        <span className="block text-xs font-bold text-slate-600 mb-1">Observación general</span>
        <textarea
          value={contenido}
          onChange={(e) => setContenido(e.target.value)}
          rows={3}
          placeholder="En qué consisten sus observaciones; el detalle va en los archivos"
          aria-label="Observación general del interesado"
          className={campo}
        />
      </label>

      <ArchivosVarios
        archivos={archivos}
        onCambio={setArchivos}
        texto="Archivos con el detalle de sus observaciones (opcional, hasta 10)"
      />

      <div className="flex items-center gap-2">
        <Boton
          disabled={trabajando || !completo}
          onClick={() =>
            onRegistrar(
              {
                presentadoPor: presentadoPor.trim() || undefined,
                fechaPresentacion: fecha,
                contenido: contenido.trim(),
              },
              archivos,
            )
          }
          icono={<MessageSquarePlus className="w-3.5 h-3.5" />}
        >
          Registrar
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

/** Un documento de respuestas para todos los interesados pendientes (127). */
function RespuestaGeneral({
  pendientes,
  trabajando,
  onResponder,
}: {
  pendientes: number;
  trabajando: boolean;
  onResponder: (
    datos: { respuesta?: string; modificoPliego?: boolean },
    archivos: File[],
  ) => Promise<boolean> | boolean | undefined;
}) {
  const [abierto, setAbierto] = useState(false);
  const [nota, setNota] = useState('');
  const [modifico, setModifico] = useState<boolean | null>(null);
  const [archivos, setArchivos] = useState<File[]>([]);

  if (!abierto) {
    return (
      <BotonSecundario
        disabled={trabajando}
        onClick={() => setAbierto(true)}
        icono={<Reply className="w-3.5 h-3.5" />}
      >
        Responder todo con un documento de respuestas
      </BotonSecundario>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-slate-50 px-3.5 py-3 space-y-2">
      <Titulo>Documento general de respuestas</Titulo>
      <Ayuda>
        Queda como respuesta de{' '}
        {pendientes === 1 ? 'el interesado pendiente' : `los ${pendientes} interesados pendientes`}.
        No hace falta responder uno por uno.
      </Ayuda>

      <ArchivosVarios
        archivos={archivos}
        onCambio={setArchivos}
        texto="Documento de respuestas (uno o varios archivos, hasta 10)"
      />

      <textarea
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        rows={2}
        placeholder="Nota sobre la respuesta (opcional)"
        aria-label="Nota sobre la respuesta general"
        className={campo}
      />

      <fieldset className="m-0 p-0 border-0">
        <legend className="text-xs font-bold text-slate-600 mb-1 p-0">
          ¿Generó modificación del pliego? (opcional)
        </legend>
        <SiNo nombre="modifico-general" valor={modifico} onCambio={setModifico} />
      </fieldset>

      <div className="flex items-center gap-2">
        <Boton
          disabled={trabajando || archivos.length === 0}
          onClick={async () => {
            const ok = await onResponder(
              { respuesta: nota.trim() || undefined, modificoPliego: modifico ?? undefined },
              archivos,
            );
            if (ok) {
              setAbierto(false);
              setNota('');
              setModifico(null);
              setArchivos([]);
            }
          }}
          icono={<CheckCheck className="w-3.5 h-3.5" />}
        >
          Responder a todos
        </Boton>
        <button
          type="button"
          onClick={() => setAbierto(false)}
          className="text-xs font-bold text-slate-500 hover:text-slate-700"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

/** Sí / No que se puede dejar sin contestar. */
function SiNo({
  nombre,
  valor,
  onCambio,
}: {
  nombre: string;
  valor: boolean | null;
  onCambio: (v: boolean | null) => void;
}) {
  return (
    <div className="flex items-center gap-4">
      {[
        { valor: true, etiqueta: 'Sí' },
        { valor: false, etiqueta: 'No' },
      ].map((opcion) => (
        <label
          key={String(opcion.valor)}
          className="inline-flex items-center gap-1.5 text-xs text-slate-700"
        >
          <input
            type="radio"
            name={nombre}
            checked={valor === opcion.valor}
            onChange={() => onCambio(opcion.valor)}
          />
          {opcion.etiqueta}
        </label>
      ))}
      {valor !== null && (
        <button
          type="button"
          onClick={() => onCambio(null)}
          className="text-xs font-bold text-slate-500 hover:text-slate-700"
        >
          Sin decir
        </button>
      )}
    </div>
  );
}

/** Varios archivos que se suman, cada uno con su botón para quitarlo. */
function ArchivosVarios({
  archivos,
  onCambio,
  texto,
}: {
  archivos: File[];
  onCambio: (archivos: File[]) => void;
  texto: string;
}) {
  const input = useRef<HTMLInputElement>(null);

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3 space-y-2">
      <p className="text-xs text-slate-700 m-0">{texto}</p>
      {archivos.length > 0 && (
        <ul className="m-0 p-0 list-none space-y-1">
          {archivos.map((archivo, i) => (
            <li
              key={`${archivo.name}-${i}`}
              className="flex items-center gap-2 text-xs text-slate-700"
            >
              <span className="truncate">{archivo.name}</span>
              <button
                type="button"
                className="text-slate-400 hover:text-red-600"
                aria-label={`Quitar ${archivo.name}`}
                onClick={() => onCambio(archivos.filter((_, j) => j !== i))}
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
        className="hidden"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
        onChange={(e) => {
          // Se suman a los anteriores: elegir otra vez no borra lo que ya estaba.
          const elegidos = Array.from(e.target.files ?? []);
          onCambio([...archivos, ...elegidos].slice(0, 10));
          e.target.value = '';
        }}
      />
      {archivos.length < 10 && (
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md bg-white text-slate-700 border border-slate-300 hover:border-[#003DA5] hover:text-[#003DA5] transition-all"
        >
          <Paperclip className="w-3.5 h-3.5" />
          {archivos.length ? 'Agregar otro archivo' : 'Adjuntar archivos'}
        </button>
      )}
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
