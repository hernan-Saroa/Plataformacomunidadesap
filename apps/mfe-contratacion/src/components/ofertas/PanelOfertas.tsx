import React, { useEffect, useRef, useState } from 'react';
import { CalendarClock, Check, FileText, Lock, Paperclip, Trash2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { EstadoOfertas, Oferente } from '../../types';
import { Aviso, Ayuda, Boton, campo, Marco, Pendiente, Titulo } from '../shared/PiezasPanel';
import { horaEnBogota, hoyEnBogota, momentoConHora } from '../shared/fechas';
import { useDialogo } from '../shared/useDialogo';

interface Props {
  procesoId: string;
  onCambio?: () => void;
}

/**
 * Los mismos tonos del semáforo de la etapa 5, a propósito: el plazo se lee
 * igual en todo el módulo, y un vencimiento no puede significar una cosa en la
 * publicación del pliego y otra aquí. En rojo, el plazo vencido es además lo
 * que pide acción: cerrar la recepción.
 */
const TONO_PLAZO = {
  VIGENTE: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  POR_VENCER: 'border-amber-200 bg-amber-50 text-amber-900',
  VENCIDO: 'border-red-200 bg-red-50 text-red-900',
  SIN_PLAZO: 'border-gray-200 bg-slate-50 text-slate-500',
} as const;

/**
 * Actividad 6.1 · Recepción de ofertas y cierre del proceso (EFDS-1155).
 *
 * Primera pantalla de la etapa 6. El plazo manda: mientras corre se registran
 * las ofertas que llegan a ventanilla, y solo cuando vence se puede cerrar. El
 * cierre es lo que publica la lista, así que a partir de ahí la pantalla deja
 * de ofrecer cambios y pasa a mostrar el registro.
 */
export function PanelOfertas({ procesoId, onCambio }: Props) {
  const dialogo = useDialogo();
  const [estado, setEstado] = useState<EstadoOfertas | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [registrando, setRegistrando] = useState(false);

  /**
   * El formulario del vencimiento (EFDS-1155).
   *
   * Antes esto era un `window.prompt` que pedía «AAAA-MM-DD HH:MM» en texto
   * libre y partía la cadena a mano: un diálogo gris del navegador, imposible
   * de estilar, que bloquea la pestaña y que no valida nada hasta enviarlo.
   */
  const [ajustandoPlazo, setAjustandoPlazo] = useState(false);
  const [plazoDia, setPlazoDia] = useState('');
  const [plazoHora, setPlazoHora] = useState('');

  const [nombre, setNombre] = useState('');
  const [identificacion, setIdentificacion] = useState('');
  const [radicacion, setRadicacion] = useState('');
  const [valor, setValor] = useState('');
  const [soporte, setSoporte] = useState<File | null>(null);

  const leer = () =>
    contratacionService
      .ofertas(procesoId)
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
    setNombre('');
    setIdentificacion('');
    setRadicacion('');
    setValor('');
    setSoporte(null);
    setRegistrando(false);
  };

  const registrar = async () => {
    if (!nombre.trim() || !identificacion.trim() || !radicacion || !soporte) return;

    setGuardando(true);
    try {
      setEstado(
        await contratacionService.registrarOferente(
          procesoId,
          {
            nombre: nombre.trim(),
            identificacion: identificacion.trim(),
            // El campo del navegador da hora local sin zona; se marca Bogotá,
            // que es donde corre el término, en vez de dejar que el servidor
            // la interprete a su manera.
            fechaRadicacion: `${radicacion}:00-05:00`,
            valorOfertado: valor.trim() ? Number(valor) : undefined,
          },
          soporte,
        ),
      );
      limpiar();
      toast.success('Oferta registrada');
      onCambio?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const retirar = async (oferente: Oferente) => {
    const seguro = await dialogo.confirmar({
      titulo: `Retirar la oferta ${oferente.numero}`,
      descripcion: `Sale de la lista la oferta de ${oferente.nombre}. Solo se puede mientras la recepción siga abierta.`,
      confirmar: 'Retirar la oferta',
      tono: 'peligro',
    });
    if (!seguro) return;

    setGuardando(true);
    try {
      setEstado(await contratacionService.retirarOferente(procesoId, oferente.id));
      toast.success('Oferta retirada');
      onCambio?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const cerrar = async () => {
    setGuardando(true);
    try {
      const tras = await contratacionService.cerrarRecepcion(procesoId);
      setEstado(tras);
      toast.success(
        tras.oferentes.length > 0
          ? `Recepción cerrada; se publicó la lista con ${tras.oferentes.length} oferente(s)`
          : 'Recepción cerrada sin ofertas recibidas',
      );
      onCambio?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  /**
   * Abre el formulario con lo que ya hay.
   *
   * Precargado y no en blanco: casi siempre se entra aquí a mover la hora que
   * el cronograma fijó, no a inventar una fecha desde cero. Las cinco de la
   * tarde es la hora de cierre habitual de una ventanilla, y es lo único que
   * se supone cuando todavía no hay vencimiento.
   */
  const abrirPlazo = () => {
    const actual = estado?.recepcion ?? null;
    setPlazoDia(actual?.vencimientoDia ?? hoyEnBogota());
    setPlazoHora(actual ? horaEnBogota(actual.vencimiento) : '17:00');
    setAjustandoPlazo(true);
  };

  const guardarPlazo = async () => {
    if (!plazoDia || !plazoHora) return;

    setGuardando(true);
    try {
      // El desfase va escrito y no se deja a la zona del navegador: en UTC las
      // 23:59 de Bogotá son ya el día siguiente, y ahí un día de diferencia es
      // un plazo mal contado.
      setEstado(
        await contratacionService.fijarPlazoOfertas(
          procesoId,
          `${plazoDia}T${plazoHora}:00-05:00`,
        ),
      );
      setAjustandoPlazo(false);
      toast.success('Vencimiento actualizado');
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
        <p className="text-[11.5px] text-slate-400 m-0">Cargando la recepción de ofertas…</p>
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
        <Titulo>Recepción de ofertas</Titulo>
        <Aviso tono="aviso" titulo="Esta modalidad no recibe ofertas">
          {estado.motivoNoAplica ?? 'La modalidad del proceso no adelanta recepción de ofertas.'}
        </Aviso>
      </Marco>
    );
  }

  const { recepcion } = estado;

  return (
    <Marco>
      <Titulo>Recepción de ofertas</Titulo>
      <Ayuda>
        Las ofertas que llegan a la entidad se transcriben aquí con su soporte. Vencido el plazo, el
        cierre publica la lista de oferentes y ya no admite cambios.
      </Ayuda>

      {/* Sin apertura no hay convocatoria a la que presentarse. */}
      {!estado.abierto ? (
        <Pendiente
          falta="5.7"
          texto="El proceso todavía no se ha abierto: el plazo de ofertas corre desde la resolución de apertura."
        />
      ) : !recepcion ? (
        <Aviso tono="aviso" titulo="Falta fijar el plazo de ofertas">
          La modalidad no tiene plazo parametrizado, así que el vencimiento hay que tomarlo del
          cronograma del proceso y registrarlo aquí.
        </Aviso>
      ) : (
        <EstadoPlazo recepcion={recepcion} />
      )}

      {/* Los plazos entraron como supuesto del equipo: se dice, en vez de
          presentarlos como si fueran término legal ya ratificado. */}
      {recepcion && !estado.plazoConfirmado && recepcion.plazoDiasHabiles !== null ? (
        <p className="text-[11px] text-gray-500 m-0 leading-relaxed">
          El plazo de {recepcion.plazoDiasHabiles} día(s) hábil(es) de esta modalidad está pendiente
          de confirmación por la Dirección de Contratación. Si el cronograma dice otra cosa, corrige
          el vencimiento.
        </p>
      ) : null}

      {estado.oferentes.length > 0 ? (
        <div className="space-y-2">
          {estado.oferentes.map((oferente) => (
            <FilaOferente
              key={oferente.id}
              oferente={oferente}
              // Cerrada la recepción, la lista es el registro de lo que se
              // recibió: retirar a alguien ya no sería corregir.
              puedeRetirar={estado.puedeRegistrar && !guardando}
              onRetirar={() => retirar(oferente)}
            />
          ))}
        </div>
      ) : estado.listaPublicada ? (
        <Aviso tono="ok" titulo="No se recibieron ofertas">
          La recepción se cerró sin ofertas. El hecho queda registrado; declarar desierto el proceso
          es un trámite aparte.
        </Aviso>
      ) : null}

      {estado.listaPublicada && recepcion ? (
        <Aviso tono="ok" titulo="Lista de oferentes publicada">
          Cerrada el {momentoConHora(recepcion.cerradaAt!)}
          {recepcion.cerradaPor ? ` por ${recepcion.cerradaPor}` : ''}. La lista ya no admite
          cambios.
        </Aviso>
      ) : null}

      {estado.abierto && !estado.listaPublicada ? (
        <div className="flex flex-wrap items-center gap-2">
          {estado.puedeRegistrar && !registrando ? (
            <Boton icono={<UserPlus className="w-3.5 h-3.5" />} onClick={() => setRegistrando(true)}>
              Registrar una oferta
            </Boton>
          ) : null}

          {estado.puedeCerrar ? (
            <Boton icono={<Lock className="w-3.5 h-3.5" />} disabled={guardando} onClick={cerrar}>
              {guardando ? 'Cerrando…' : 'Cerrar y publicar la lista'}
            </Boton>
          ) : null}

          {!ajustandoPlazo ? (
            <button
              type="button"
              disabled={guardando}
              onClick={abrirPlazo}
              className="text-[11.5px] font-bold text-slate-500 hover:underline disabled:opacity-50"
            >
              {recepcion ? 'Corregir el vencimiento' : 'Fijar el vencimiento'}
            </button>
          ) : null}
        </div>
      ) : null}

      {estado.abierto && !estado.listaPublicada && ajustandoPlazo ? (
        <FormularioPlazo
          recepcion={recepcion}
          dia={plazoDia}
          hora={plazoHora}
          guardando={guardando}
          onDia={setPlazoDia}
          onHora={setPlazoHora}
          onGuardar={guardarPlazo}
          onCancelar={() => setAjustandoPlazo(false)}
        />
      ) : null}

      {/* Por qué no se puede cerrar todavía, en vez de un botón apagado sin
          explicación. */}
      {recepcion && !recepcion.vencido && !estado.listaPublicada ? (
        <p className="text-[11px] text-gray-500 m-0 leading-relaxed">
          El cierre se habilita cuando venza el plazo: cerrar antes dejaría fuera ofertas que
          todavía pueden presentarse.
        </p>
      ) : null}

      {registrando && estado.puedeRegistrar ? (
        <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3 space-y-3">
          <p className="text-[12.5px] font-bold text-slate-800 m-0">Oferta recibida</p>

          <div>
            <label htmlFor="oferta-nombre" className="block text-xs font-bold text-gray-600 mb-1.5">
              Nombre o razón social <span className="text-red-600">*</span>
            </label>
            <input
              id="oferta-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Quién presentó la oferta"
              className={campo}
            />
          </div>

          <div>
            <label htmlFor="oferta-nit" className="block text-xs font-bold text-gray-600 mb-1.5">
              NIT o documento <span className="text-red-600">*</span>
            </label>
            <input
              id="oferta-nit"
              value={identificacion}
              onChange={(e) => setIdentificacion(e.target.value)}
              placeholder="900123456-1"
              className={campo}
            />
          </div>

          <div>
            <label
              htmlFor="oferta-radicacion"
              className="block text-xs font-bold text-gray-600 mb-1.5"
            >
              Fecha y hora de radicación <span className="text-red-600">*</span>
            </label>
            <input
              id="oferta-radicacion"
              type="datetime-local"
              value={radicacion}
              onChange={(e) => setRadicacion(e.target.value)}
              className={campo}
            />
            <p className="text-[11px] text-gray-500 mt-1.5 mb-0 leading-relaxed">
              La hora en que la oferta llegó a la entidad, no la de este registro. Una posterior al
              vencimiento queda fuera de la lista.
            </p>
          </div>

          <div>
            <label htmlFor="oferta-valor" className="block text-xs font-bold text-gray-600 mb-1.5">
              Valor de la oferta
            </label>
            <input
              id="oferta-valor"
              type="number"
              min="0"
              step="0.01"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="45000000"
              className={campo}
            />
            <p className="text-[11px] text-gray-500 mt-1.5 mb-0 leading-relaxed">
              Base de la calificación económica. Sin él, esa dimensión no se puede evaluar; se deja
              vacío solo si la modalidad no califica precio.
            </p>
          </div>

          <SelectorArchivo etiqueta="Soporte de la oferta" archivo={soporte} onElegir={setSoporte} />

          <div className="flex items-center gap-2">
            <Boton
              icono={<UserPlus className="w-3.5 h-3.5" />}
              disabled={
                guardando || !nombre.trim() || !identificacion.trim() || !radicacion || !soporte
              }
              onClick={registrar}
            >
              {guardando ? 'Registrando…' : 'Registrar oferta'}
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
      ) : null}
      {dialogo.elemento}
    </Marco>
  );
}

/**
 * El vencimiento del plazo de ofertas, a mano.
 *
 * Hace falta en dos casos que no son excepcionales: la modalidad puede no
 * tener plazo parametrizado —y entonces no hay nada que calcular—, y el
 * cronograma del proceso suele fijar una hora concreta en vez del final del
 * día que supone la plataforma.
 *
 * Fecha y hora en dos campos y no en una cadena: el vencimiento de ofertas es
 * de los pocos plazos del módulo donde la hora decide, porque de ella depende
 * si la oferta radicada esa misma mañana entró en término. Pedirla escrita
 * dejaba el formato en manos de quien la escribe.
 */
function FormularioPlazo({
  recepcion,
  dia,
  hora,
  guardando,
  onDia,
  onHora,
  onGuardar,
  onCancelar,
}: {
  recepcion: EstadoOfertas['recepcion'];
  dia: string;
  hora: string;
  guardando: boolean;
  onDia: (valor: string) => void;
  onHora: (valor: string) => void;
  onGuardar: () => void;
  onCancelar: () => void;
}) {
  const completo = !!dia && !!hora;
  // El instante que va a quedar, leído con el desfase de Bogotá igual que al
  // enviarlo: sin eso, la vista previa y lo que se guarda podrían no coincidir
  // para quien tenga el navegador en otra zona.
  const elegido = completo ? new Date(`${dia}T${hora}:00-05:00`) : null;
  const quedaVencido = !!elegido && elegido.getTime() < Date.now();
  const sinCambio = !!recepcion && elegido?.getTime() === new Date(recepcion.vencimiento).getTime();

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3 space-y-3">
      <p className="text-[12.5px] font-bold text-slate-800 m-0">
        {recepcion ? 'Corregir el vencimiento' : 'Fijar el vencimiento'}
      </p>
      <p className="text-[11px] text-gray-500 m-0 leading-relaxed">
        Es la fecha y la hora del cronograma del proceso, en hora de Bogotá. Al fijarla a mano deja
        de contarse con los días hábiles de la modalidad.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="ofertas-dia" className="block text-xs font-bold text-gray-600 mb-1.5">
            Fecha <span className="text-red-600">*</span>
          </label>
          <input
            id="ofertas-dia"
            type="date"
            value={dia}
            disabled={guardando}
            onChange={(e) => onDia(e.target.value)}
            className={campo}
          />
        </div>
        <div>
          <label htmlFor="ofertas-hora" className="block text-xs font-bold text-gray-600 mb-1.5">
            Hora <span className="text-red-600">*</span>
          </label>
          <input
            id="ofertas-hora"
            type="time"
            value={hora}
            disabled={guardando}
            onChange={(e) => onHora(e.target.value)}
            className={campo}
          />
        </div>
      </div>

      {/* Qué va a pasar, antes de que pase: una fecha en el pasado no es un
          error —así se corrige un plazo que ya corrió— pero habilita el cierre,
          y eso publica la lista de oferentes. */}
      {quedaVencido ? (
        <Aviso tono="aviso" titulo="Ese vencimiento ya pasó">
          El plazo queda vencido y se habilita el cierre de la recepción. Lo que no se haya
          registrado hasta entonces ya no entra en la lista.
        </Aviso>
      ) : null}

      {recepcion && recepcion.plazoDiasHabiles !== null && !sinCambio ? (
        <p className="text-[11px] text-gray-500 m-0 leading-relaxed">
          El vencimiento actual salió de los {recepcion.plazoDiasHabiles} día(s) hábil(es) de la
          modalidad. Al corregirlo, el expediente pasa a explicarse con la fecha que fijes aquí.
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        <Boton
          icono={<Check className="w-3.5 h-3.5" strokeWidth={3} />}
          disabled={!completo || sinCambio || guardando}
          onClick={onGuardar}
        >
          {guardando ? 'Guardando…' : 'Guardar el vencimiento'}
        </Boton>
        <button
          type="button"
          disabled={guardando}
          onClick={onCancelar}
          className="text-[11.5px] font-bold text-slate-500 hover:underline disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

/** Cuándo vence el plazo y cómo va, con el mismo semáforo de la etapa 5. */
function EstadoPlazo({ recepcion }: { recepcion: NonNullable<EstadoOfertas['recepcion']> }) {
  const faltan = recepcion.diasHabilesRestantes;

  return (
    <div className={`rounded-lg border px-3.5 py-3 flex items-start gap-2.5 ${TONO_PLAZO[recepcion.estadoPlazo]}`}>
      <CalendarClock className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-[12.5px] font-bold m-0">
          {recepcion.estado === 'CERRADA'
            ? 'Recepción cerrada'
            : recepcion.vencido
              ? 'Plazo vencido'
              : 'Recepción abierta'}
        </p>
        <p className="text-[11.5px] m-0 mt-0.5 leading-relaxed">
          {recepcion.vencido ? 'Venció' : 'Vence'} el {momentoConHora(recepcion.vencimiento)}
          {!recepcion.vencido && faltan > 0 ? ` · faltan ${faltan} días hábiles` : ''}
          {!recepcion.vencido && faltan === 0 ? ' · vence hoy' : ''}
        </p>
      </div>
    </div>
  );
}

/** Una oferta de la lista, con su soporte y el retiro mientras se pueda. */
function FilaOferente({
  oferente,
  puedeRetirar,
  onRetirar,
}: {
  oferente: Oferente;
  puedeRetirar: boolean;
  onRetirar: () => void;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3">
      <div className="flex items-start gap-2.5">
        <FileText className="w-4 h-4 mt-0.5 flex-shrink-0 text-slate-500" />

        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-bold text-slate-800 m-0">
            {oferente.numero}. {oferente.nombre}
          </p>
          <p className="text-[11.5px] text-slate-600 m-0 mt-0.5 leading-relaxed break-words">
            {oferente.identificacion} · radicada el {momentoConHora(oferente.fechaRadicacion)}
            {oferente.valorOfertado != null
              ? ` · ${oferente.valorOfertado.toLocaleString('es-CO', {
                  style: 'currency',
                  currency: 'COP',
                  maximumFractionDigits: 0,
                })}`
              : ' · sin valor registrado'}
          </p>
          {oferente.soporte ? (
            <p className="text-[11px] text-slate-500 m-0 mt-1 leading-relaxed break-words">
              Soporte: {oferente.soporte.nombre}
            </p>
          ) : null}
        </div>

        {puedeRetirar ? (
          <button
            type="button"
            onClick={onRetirar}
            title="Retirar esta oferta"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-md border border-amber-300 bg-white text-amber-700 hover:bg-amber-50 transition-all flex-shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Retirar
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** Adjunto obligatorio, con su nombre cuando ya está elegido. */
function SelectorArchivo({
  etiqueta,
  archivo,
  onElegir,
}: {
  etiqueta: string;
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
        className="hidden"
        accept=".pdf,.doc,.docx,.xls,.xlsx"
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
