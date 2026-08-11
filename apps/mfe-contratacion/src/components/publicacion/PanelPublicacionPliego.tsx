import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  Check,
  ExternalLink,
  Info,
  Megaphone,
  Paperclip,
  Undo2,
} from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { EstadoPlazo, EstadoPublicacion } from '../../types';
import {
  Aviso,
  Ayuda,
  Boton,
  BotonSecundario,
  campo,
  Marco,
  SinPermiso,
  Titulo,
} from '../shared/PiezasPanel';

interface Props {
  procesoId: string;
  onCambio?: () => void;
}

/**
 * Fecha `YYYY-MM-DD` en texto legible.
 *
 * Se formatea en UTC a propósito: `new Date('2026-09-21')` se interpreta como
 * medianoche UTC, y mostrarla en la zona de Bogotá la correría al día anterior.
 * En un plazo legal, un día de diferencia es el error que importa.
 */
function fechaLarga(ymd: string): string {
  return new Date(`${ymd}T00:00:00Z`).toLocaleDateString('es-CO', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function plural(n: number): string {
  return n === 1 ? 'día hábil' : 'días hábiles';
}

/** Cómo se lee el contador. El número grande va aparte, esto es la leyenda. */
function leyendaDelPlazo(restantes: number): string {
  if (restantes > 0) return `${plural(restantes)} restantes`;
  if (restantes === 0) return 'el plazo vence hoy';
  return `${plural(Math.abs(restantes))} desde el vencimiento`;
}

const SEMAFORO: Record<
  Exclude<EstadoPlazo, 'SIN_PLAZO'>,
  { etiqueta: string; marco: string; numero: string }
> = {
  // El estado se dice con palabras además del color: un semáforo que solo
  // cambia de tono no lo lee quien no distingue verde de ámbar.
  VIGENTE: {
    etiqueta: 'Plazo vigente',
    marco: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    numero: 'text-emerald-700',
  },
  POR_VENCER: {
    etiqueta: 'Por vencer',
    marco: 'border-amber-200 bg-amber-50 text-amber-900',
    numero: 'text-amber-700',
  },
  VENCIDO: {
    etiqueta: 'Plazo vencido',
    marco: 'border-red-200 bg-red-50 text-red-900',
    numero: 'text-red-700',
  },
};

/**
 * Actividad 5.2 · Publicación del proyecto de pliego (EFDS-1150).
 *
 * No publica en SECOP II: registra que se publicó, guarda la evidencia y lleva
 * la cuenta del plazo legal de publicidad. Mientras no exista la integración
 * (EFDS-1386), el soporte cargado es la única prueba del hecho, y la pantalla
 * lo dice en vez de aparentar que el dato viene de SECOP II.
 */
export function PanelPublicacionPliego({ procesoId, onCambio }: Props) {
  const [estado, setEstado] = useState<EstadoPublicacion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [trabajando, setTrabajando] = useState(false);

  const [fecha, setFecha] = useState(() =>
    new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }),
  );
  const [numero, setNumero] = useState('');
  const [enlace, setEnlace] = useState('');
  const [motivo, setMotivo] = useState('');
  const [anulando, setAnulando] = useState(false);
  const [evidencia, setEvidencia] = useState<File | null>(null);
  const inputArchivo = useRef<HTMLInputElement>(null);

  const cargar = async () => {
    setCargando(true);
    try {
      setEstado(await contratacionService.publicacionPliego(procesoId));
    } catch (err: any) {
      toast.error('No se pudo cargar la publicación', {
        id: 'publicacion-carga',
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
    return <p className="text-xs text-red-600 m-0 px-4 py-3">No se pudo cargar la publicación</p>;
  }

  if (!estado.aplica) {
    return (
      <Marco>
        <Aviso tono="ok" titulo="Esta modalidad no publica proyecto de pliego">
          No hay pliego de condiciones que someter a publicidad, así que no corre plazo alguno por
          este concepto.
        </Aviso>
      </Marco>
    );
  }

  // -------------------------------------------------- todavía sin publicar --
  if (!estado.publicacion) {
    if (!estado.puedeRegistrar) {
      return (
        <Marco>
          <SinPermiso quien="el gestor o la Dirección de Contratación" />
          <PlazoPrevisto estado={estado} />
        </Marco>
      );
    }

    return (
      <Marco>
        <Titulo>Registrar la publicación del proyecto de pliego</Titulo>
        <Ayuda>
          Publica el proyecto de pliego en SECOP II y registra aquí la fecha en que quedó publicado.
          Desde ese día corre el plazo legal de publicidad.
        </Ayuda>

        <PlazoPrevisto estado={estado} />

        <div className="grid grid-cols-3 gap-3">
          <label className="block">
            <span className="block text-xs font-bold text-slate-600 mb-1">
              Fecha de publicación
            </span>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              aria-label="Fecha de publicación en SECOP II"
              className={campo}
            />
          </label>
          <label className="block">
            <span className="block text-xs font-bold text-slate-600 mb-1">Número en SECOP II</span>
            <input
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              placeholder="LP-ESAP-004-2026"
              aria-label="Número del proceso en SECOP II"
              className={campo}
            />
          </label>
          <label className="block">
            <span className="block text-xs font-bold text-slate-600 mb-1">Enlace del proceso</span>
            <input
              value={enlace}
              onChange={(e) => setEnlace(e.target.value)}
              placeholder="https://community.secop.gov.co/…"
              aria-label="Enlace al proceso en SECOP II"
              className={campo}
            />
          </label>
        </div>

        <SelectorEvidencia
          evidencia={evidencia}
          inputArchivo={inputArchivo}
          onElegir={setEvidencia}
        />

        <Boton
          disabled={trabajando || !fecha || !evidencia}
          onClick={() =>
            ejecutar(
              () =>
                contratacionService.registrarPublicacion(
                  procesoId,
                  {
                    fechaPublicacion: fecha,
                    secopNumero: numero.trim() || undefined,
                    secopUrl: enlace.trim() || undefined,
                  },
                  evidencia!,
                ),
              'Publicación registrada',
            )
          }
          icono={<Megaphone className="w-3.5 h-3.5" />}
        >
          Registrar publicación
        </Boton>

        {!evidencia && (
          <p className="text-xs text-slate-500 m-0">
            El botón se habilita cuando adjuntes la evidencia.
          </p>
        )}
      </Marco>
    );
  }

  // ------------------------------------------------------- ya se publicó ----
  const { publicacion } = estado;

  return (
    <Marco>
      <ContadorDelPlazo estado={estado} />

      <div className="rounded-lg border border-gray-200 bg-slate-50 px-3.5 py-3 space-y-1">
        <p className="text-xs text-slate-700 m-0">
          <span className="font-bold">Publicado el</span> {fechaLarga(publicacion.fechaPublicacion)}
          {publicacion.publicadoPor ? ` · registrado por ${publicacion.publicadoPor}` : ''}
        </p>
        {publicacion.secopNumero && (
          <p className="text-xs text-slate-700 m-0">
            <span className="font-bold">Proceso en SECOP II</span> {publicacion.secopNumero}
          </p>
        )}
        {publicacion.secopUrl && (
          <a
            href={publicacion.secopUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#003DA5] hover:underline"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Ver la publicación en SECOP II
          </a>
        )}
      </div>

      <Aviso tono="ok" titulo="Evidencia en el expediente">
        El soporte de la publicación quedó cargado con el registro y es consultable desde las
        etapas siguientes.
      </Aviso>

      <Origen />

      {estado.puedeRegistrar && (
        <div className="pt-2 border-t border-gray-200 space-y-2">
          {!anulando ? (
            <button
              type="button"
              onClick={() => setAnulando(true)}
              className="text-xs font-bold text-slate-500 hover:text-amber-700"
            >
              ¿La fecha quedó mal? Anular y volver a registrar
            </button>
          ) : (
            <>
              <Ayuda>
                La publicación no se edita: se anula y se registra la correcta, para que quede el
                rastro de la corrección en el expediente.
              </Ayuda>
              <input
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Motivo de la anulación"
                aria-label="Motivo de la anulación"
                className={campo}
              />
              <BotonSecundario
                disabled={trabajando || !motivo.trim()}
                onClick={async () => {
                  // Solo se cierra el formulario si la anulación pasó: si falló,
                  // el motivo escrito debe seguir ahí para reintentar.
                  const ok = await ejecutar(
                    () => contratacionService.anularPublicacion(procesoId, motivo.trim()),
                    'Publicación anulada',
                  );
                  if (ok) {
                    setMotivo('');
                    setAnulando(false);
                  }
                }}
                icono={<Undo2 className="w-3.5 h-3.5" />}
              >
                Anular publicación
              </BotonSecundario>
            </>
          )}
        </div>
      )}
    </Marco>
  );
}

// ------------------------------------------------------------- piezas ------

/**
 * El contador: días hábiles restantes y fecha de vencimiento.
 *
 * Es lo que el gestor necesita ver de un vistazo para no pasarse del término,
 * así que va arriba del todo y con el número en grande.
 */
function ContadorDelPlazo({ estado }: { estado: EstadoPublicacion }) {
  const { publicacion, diasHabilesRestantes: restantes, estadoPlazo } = estado;

  // Publicada pero sin plazo que contar: la modalidad no lo tiene
  // parametrizado. Un contador vacío haría pensar que el término ya venció.
  if (estadoPlazo === 'SIN_PLAZO' || restantes === null || !publicacion?.fechaVencimiento) {
    return (
      <Aviso tono="aviso" titulo="Publicación registrada, sin plazo que controlar">
        {estado.advertencia ??
          'Esta modalidad no tiene plazo de publicidad parametrizado, así que no hay término que contar.'}
      </Aviso>
    );
  }

  const tono = SEMAFORO[estadoPlazo];

  return (
    <div className={`rounded-lg border px-3.5 py-3 ${tono.marco}`}>
      <p className="text-xs font-bold m-0 flex items-center gap-1.5 uppercase tracking-wide">
        <CalendarClock className="w-4 h-4 flex-shrink-0" />
        {tono.etiqueta}
      </p>

      <div className="flex items-baseline gap-2 mt-2">
        <span className={`text-3xl font-black tabular-nums leading-none ${tono.numero}`}>
          {Math.abs(restantes)}
        </span>
        <span className="text-sm font-bold">{leyendaDelPlazo(restantes)}</span>
      </div>

      <p className="text-xs m-0 mt-2">
        Vence el <span className="font-bold">{fechaLarga(publicacion.fechaVencimiento)}</span> ·
        plazo de {publicacion.plazoDiasHabiles} días hábiles contados desde la publicación.
      </p>

      {estado.advertencia && (
        <p className="text-xs m-0 mt-1.5 flex items-start gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
          {estado.advertencia}
        </p>
      )}
    </div>
  );
}

/** Qué plazo va a correr, antes de registrar nada. */
function PlazoPrevisto({ estado }: { estado: EstadoPublicacion }) {
  if (!estado.plazo) {
    return (
      <Aviso tono="aviso" titulo="Esta modalidad no tiene plazo parametrizado">
        La publicación se puede registrar igual —el hecho ocurrió—, pero no habrá término que
        contar hasta que se configure el plazo de la modalidad.
      </Aviso>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-slate-50 px-3.5 py-3">
      <p className="text-xs text-slate-700 m-0">
        Al registrar la publicación correrá un plazo de{' '}
        <span className="font-bold tabular-nums">{estado.plazo.diasHabiles} días hábiles</span>,
        contados desde el día siguiente y sin fines de semana ni festivos.
      </p>
      {!estado.plazo.confirmado && (
        <p className="text-xs text-amber-700 m-0 mt-1.5 flex items-start gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
          Este plazo es provisional y está pendiente de confirmación por la Dirección de
          Contratación.
        </p>
      )}
    </div>
  );
}

/**
 * La evidencia, exigida antes de registrar.
 *
 * Va en el formulario y no como paso siguiente porque sin ella no hay registro:
 * es lo único que prueba que la publicación existió, y el registro arranca un
 * plazo legal. Un proceso con el término corriendo y nada que lo respalde no
 * debería poder existir.
 */
function SelectorEvidencia({
  evidencia,
  inputArchivo,
  onElegir,
}: {
  evidencia: File | null;
  inputArchivo: React.RefObject<HTMLInputElement>;
  onElegir: (archivo: File) => void;
}) {
  const marco = evidencia
    ? 'border-emerald-200 bg-emerald-50'
    : 'border-amber-200 bg-amber-50';

  return (
    <div className={`rounded-lg border px-3.5 py-3 space-y-2 ${marco}`}>
      <p
        className={`text-xs font-bold m-0 flex items-start gap-1.5 ${
          evidencia ? 'text-emerald-900' : 'text-amber-900'
        }`}
      >
        {evidencia ? (
          <Check className="w-3.5 h-3.5 flex-shrink-0 mt-px" strokeWidth={3} />
        ) : (
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
        )}
        {evidencia ? 'Evidencia lista para adjuntar' : 'Evidencia de la publicación (obligatoria)'}
      </p>

      <p className={`text-xs m-0 ${evidencia ? 'text-emerald-900' : 'text-amber-900'}`}>
        {evidencia
          ? evidencia.name
          : 'Adjunta la constancia o la captura de SECOP II. Sin ella no se puede registrar la publicación.'}
      </p>

      <input
        ref={inputArchivo}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
        onChange={(e) => e.target.files?.[0] && onElegir(e.target.files[0])}
      />
      <button
        type="button"
        onClick={() => inputArchivo.current?.click()}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md bg-white text-slate-700 border border-slate-300 hover:border-[#003DA5] hover:text-[#003DA5] transition-all"
      >
        <Paperclip className="w-3.5 h-3.5" />
        {evidencia ? 'Cambiar archivo' : 'Seleccionar archivo'}
      </button>
    </div>
  );
}

/**
 * De dónde sale el dato.
 *
 * No hay integración con SECOP II ni está prevista en esta entrega, así que la
 * publicación se registra a mano. Quien consulta el expediente debe saber que
 * está leyendo una afirmación con soporte, no un dato traído de SECOP II.
 */
const Origen = () => (
  <p className="text-xs text-slate-500 m-0 flex items-start gap-1.5 leading-relaxed">
    <Info className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
    Registro manual: la plataforma no consulta SECOP II. La evidencia cargada es la prueba de la
    publicación, y el plazo se cuenta sobre la fecha registrada.
  </p>
);
