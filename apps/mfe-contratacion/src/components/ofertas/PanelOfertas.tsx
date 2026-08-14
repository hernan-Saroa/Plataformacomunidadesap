import React, { useEffect, useRef, useState } from 'react';
import { CalendarClock, FileText, Lock, Paperclip, Trash2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { EstadoOfertas, Oferente } from '../../types';
import { Aviso, Ayuda, Boton, campo, Marco, Pendiente, Titulo } from '../shared/PiezasPanel';
import { momentoConHora } from '../shared/fechas';

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
  const [estado, setEstado] = useState<EstadoOfertas | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [registrando, setRegistrando] = useState(false);

  const [nombre, setNombre] = useState('');
  const [identificacion, setIdentificacion] = useState('');
  const [radicacion, setRadicacion] = useState('');
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
    if (!window.confirm(`¿Retirar la oferta ${oferente.numero} de ${oferente.nombre}?`)) return;

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

  const corregirPlazo = async () => {
    const valor = window.prompt(
      'Vencimiento del plazo de ofertas (AAAA-MM-DD HH:MM, hora de Bogotá)',
      estado?.recepcion ? estado.recepcion.vencimientoDia + ' 17:00' : '',
    );
    if (!valor?.trim()) return;

    const [dia, hora] = valor.trim().split(/\s+/);
    if (!dia || !hora) {
      toast.error('Escribe la fecha y la hora, por ejemplo 2026-09-01 10:00');
      return;
    }

    setGuardando(true);
    try {
      setEstado(await contratacionService.fijarPlazoOfertas(procesoId, `${dia}T${hora}:00-05:00`));
      toast.success('Plazo actualizado');
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

          <button
            type="button"
            disabled={guardando}
            onClick={corregirPlazo}
            className="text-[11.5px] font-bold text-slate-500 hover:underline disabled:opacity-50"
          >
            {recepcion ? 'Corregir el vencimiento' : 'Fijar el vencimiento'}
          </button>
        </div>
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
    </Marco>
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
