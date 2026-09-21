import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock, Inbox, Landmark, UserCheck, Users } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { BandejaCdp, SolicitudEnBandeja } from '../../types';
import { Cargando } from '../shared/PiezasPanel';
import { momento } from '../shared/fechas';

/** Actividad a la que se entra desde la bandeja: la solicitud de CDP. */
const NUMERAL_SOLICITUD = '4.1';

/**
 * La actividad que toca según en qué punto esté la solicitud.
 *
 * Entrar siempre por la 4.1 obligaría a quien ya la tomó a buscar en el riel la
 * que sigue: si está verificada, lo que le falta es expedir, y ahí es donde
 * tiene que caer.
 */
const NUMERAL_SEGUN_ESTADO: Record<string, string> = {
  SOLICITADO: '4.2',
  VERIFICADO: '4.3',
};

const formatoPesos = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

interface Props {
  /** Abre el proceso en la actividad que corresponde atender. */
  onAbrir?: (procesoId: string, numeral?: string) => void;
}

/**
 * Bandeja de la Dirección Financiera — etapa 4.
 *
 * Va en el menú y no dentro de un proceso por lo mismo que las alertas: quien
 * responde por el presupuesto no descubre lo que le espera entrando proceso por
 * proceso. Hasta que existió esto, la Financiera solo se enteraba de una
 * solicitud por el correo del día siguiente, o abriendo procesos a ver.
 *
 * Tres montones y no una lista: recoger lo que nadie ha tomado, terminar lo
 * mío, y no volver a hacer lo que ya lleva un compañero son tres cosas
 * distintas, y mezcladas se confunden.
 */
export function VistaBandejaCdp({ onAbrir }: Props = {}) {
  const [bandeja, setBandeja] = useState<BandejaCdp | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tomando, setTomando] = useState<string | null>(null);

  const cargar = () => {
    setCargando(true);
    contratacionService
      .bandejaCdp()
      .then((b) => {
        setBandeja(b);
        setError(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false));
  };

  useEffect(cargar, []);

  /**
   * Hacerse cargo desde la lista, sin entrar al proceso.
   *
   * Es lo que convierte la bandeja en una bandeja: si para tomar una solicitud
   * hubiera que abrir el proceso y buscar la 4.1, la lista sería un índice y no
   * una cola de trabajo.
   */
  const tomar = async (s: SolicitudEnBandeja) => {
    setTomando(s.procesoId);
    try {
      await contratacionService.tomarSolicitudCdp(s.procesoId);
      toast.success(`Ya estás a cargo de la solicitud de ${s.radicado}.`);
      cargar();
    } catch (err: any) {
      // El choque con el índice de participación vigente es lo normal aquí, no
      // un fallo: alguien llegó primero. Se recarga para que la solicitud pase
      // al montón de «las lleva un compañero» en vez de quedarse ofreciéndose.
      toast.error('No se pudo tomar la solicitud', { description: err.message });
      cargar();
    } finally {
      setTomando(null);
    }
  };

  const sinTomar = bandeja?.sinTomar ?? [];
  const mias = bandeja?.mias ?? [];
  const deOtros = bandeja?.deOtros ?? [];
  const vacia = sinTomar.length === 0 && mias.length === 0 && deOtros.length === 0;

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex items-start gap-3">
          <span
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: '#0891B215' }}
          >
            <Landmark className="w-5 h-5" style={{ color: '#0891B2' }} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-bold m-0" style={{ color: '#0891B2' }}>
              Solicitudes de CDP
            </h2>
            <p className="text-[12.5px] text-slate-600 m-0 mt-0.5 leading-relaxed">
              Lo que espera a la Dirección Financiera en la etapa 4. La bandeja es
              compartida: quien se hace cargo de una solicitud responde por ella hasta
              expedir el certificado o rechazarlo.
            </p>
          </div>
        </div>
      </div>

      {!cargando && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Resumen etiqueta="Sin tomar" cuantas={sinTomar.length} color="#D97706" icono={Inbox} />
          <Resumen etiqueta="A mi cargo" cuantas={mias.length} color="#0891B2" icono={UserCheck} />
          <Resumen
            etiqueta="Las lleva un compañero"
            cuantas={deOtros.length}
            color="#64748B"
            icono={Users}
          />
        </div>
      )}

      {cargando ? (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <Cargando filas={3} />
        </div>
      ) : error ? (
        <div className="bg-white border border-gray-200 rounded-xl">
          <p className="text-xs text-red-600 m-0 px-4 py-6 text-center">{error}</p>
        </div>
      ) : vacia ? (
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-8 text-center">
          <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-300 mb-2" aria-hidden="true" />
          <p className="text-[12.5px] font-bold text-slate-700 m-0">Nada pendiente</p>
          <p className="text-[11.5px] text-slate-500 m-0 mt-0.5">
            Ninguna solicitud de CDP espera respuesta ahora mismo.
          </p>
        </div>
      ) : (
        <>
          {/* Lo que nadie ha tomado va primero: es lo único que está parado sin
              que nadie responda por ello. */}
          <Monton
            titulo="Sin tomar"
            ayuda="Nadie se ha hecho cargo todavía. El trámite está detenido hasta que alguien lo haga."
            solicitudes={sinTomar}
            onAbrir={onAbrir}
            onTomar={tomar}
            tomando={tomando}
          />
          <Monton
            titulo="A mi cargo"
            ayuda="Las que tomé y todavía no he cerrado."
            solicitudes={mias}
            onAbrir={onAbrir}
          />
          <Monton
            titulo="Las lleva un compañero"
            ayuda="Se muestran para no trabajar dos veces la misma solicitud."
            solicitudes={deOtros}
            onAbrir={onAbrir}
            atenuado
          />
        </>
      )}
    </div>
  );
}

const Resumen = ({
  etiqueta,
  cuantas,
  color,
  icono: Icono,
}: {
  etiqueta: string;
  cuantas: number;
  color: string;
  icono: typeof Inbox;
}) => (
  <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3">
    <span
      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
      style={{ backgroundColor: `${color}15` }}
    >
      <Icono className="w-4 h-4" style={{ color }} aria-hidden="true" />
    </span>
    <div className="min-w-0">
      <span className="block text-xl font-bold leading-none" style={{ color }}>
        {cuantas}
      </span>
      <span className="block text-[11px] text-slate-500 mt-0.5">{etiqueta}</span>
    </div>
  </div>
);

function Monton({
  titulo,
  ayuda,
  solicitudes,
  onAbrir,
  onTomar,
  tomando,
  atenuado,
}: {
  titulo: string;
  ayuda: string;
  solicitudes: SolicitudEnBandeja[];
  onAbrir?: (procesoId: string, numeral?: string) => void;
  onTomar?: (s: SolicitudEnBandeja) => void;
  tomando?: string | null;
  atenuado?: boolean;
}) {
  // Un montón vacío no se pinta: tres encabezados con «no hay nada» ocupan la
  // pantalla entera y esconden el que sí tiene trabajo.
  if (solicitudes.length === 0) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="px-4 py-3 border-b border-gray-100">
        <p className="text-[12.5px] font-bold text-slate-800 m-0">
          {titulo}
          <span className="ml-2 text-[11px] font-bold text-slate-400">
            {solicitudes.length}
          </span>
        </p>
        <p className="text-[11.5px] text-slate-500 m-0 mt-0.5 leading-relaxed">{ayuda}</p>
      </div>
      <ul className="m-0 p-0 list-none divide-y divide-gray-100">
        {solicitudes.map((s) => (
          <Fila
            key={s.procesoId}
            s={s}
            onAbrir={onAbrir}
            onTomar={onTomar}
            tomando={tomando === s.procesoId}
            atenuado={atenuado}
          />
        ))}
      </ul>
    </div>
  );
}

function Fila({
  s,
  onAbrir,
  onTomar,
  tomando,
  atenuado,
}: {
  s: SolicitudEnBandeja;
  onAbrir?: (procesoId: string, numeral?: string) => void;
  onTomar?: (s: SolicitudEnBandeja) => void;
  tomando?: boolean;
  atenuado?: boolean;
}) {
  const abrir = () => onAbrir?.(s.procesoId, NUMERAL_SEGUN_ESTADO[s.estado] ?? NUMERAL_SOLICITUD);

  return (
    <li
      className={`flex items-center gap-3 px-4 py-3 ${atenuado ? 'opacity-70' : ''} ${
        onAbrir ? 'cursor-pointer hover:bg-slate-50 transition-colors' : ''
      }`}
      onClick={abrir}
    >
      <span
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: s.demorada ? '#DC262612' : '#0891B212' }}
      >
        <Landmark
          className="w-4 h-4"
          style={{ color: s.demorada ? '#DC2626' : '#0891B2' }}
          aria-hidden="true"
        />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-[12.5px] font-bold text-slate-800">{s.radicado}</span>
          {/* El estado del CDP dice qué falta: verificar o expedir. */}
          <span className="text-[10.5px] font-bold text-slate-400 tracking-wide">
            {s.estado === 'VERIFICADO' ? 'VERIFICADO · FALTA EXPEDIR' : 'POR VERIFICAR'}
          </span>
        </div>
        <p className="text-[11.5px] text-slate-600 m-0 mt-0.5 leading-relaxed line-clamp-2">
          {s.objeto}
        </p>
        <p className="text-[11px] text-slate-500 m-0 mt-1">
          {s.valor !== null ? formatoPesos.format(s.valor) : 'Sin valor'}
          {/* Se dice cuando la cifra es el estimado del proceso y no la del
              CDP: presentarla sin más se leería como ya certificada. */}
          {s.valorEsEstimado ? ' (estimado)' : ''}
          {s.rubro ? ` · rubro ${s.rubro}` : ''}
          {s.aCargoDe ? ` · ${s.aCargoDe}` : ''}
        </p>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="text-right">
          <span
            className="flex items-center gap-1 text-[11px] font-bold"
            style={{ color: s.demorada ? '#DC2626' : '#64748B' }}
          >
            <Clock className="w-3 h-3" aria-hidden="true" />
            {s.diasEsperando === 0
              ? 'hoy'
              : `${s.diasEsperando} ${s.diasEsperando === 1 ? 'día' : 'días'}`}
          </span>
          <span className="block text-[10.5px] text-slate-400 mt-0.5">
            desde el {momento(s.solicitadoAt)}
          </span>
        </div>

        {onTomar && (
          <button
            type="button"
            disabled={tomando}
            // El clic no debe además abrir el proceso: son dos acciones y quien
            // pulsa «Hacerme cargo» se queda en la bandeja para seguir
            // recogiendo.
            onClick={(e) => {
              e.stopPropagation();
              onTomar(s);
            }}
            className="px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors
              bg-[#0891B2]/10 border-[#0891B2]/30 text-[#0891B2] hover:bg-[#0891B2]/15
              disabled:opacity-50 disabled:cursor-not-allowed
              focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0891B2]/40"
          >
            {tomando ? 'Tomando…' : 'Hacerme cargo'}
          </button>
        )}
      </div>
    </li>
  );
}
