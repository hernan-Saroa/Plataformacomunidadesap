import React, { useState } from 'react';
import { Check, ChevronDown, Lock, Paperclip } from 'lucide-react';

import { ActividadEtapa, EstadoActividadUI } from './ListaActividades';
import { ETAPAS } from './Etapas';

interface Props {
  /** La etapa que se está mirando; la elige la línea del tiempo de arriba. */
  etapa: number;
  /** Dónde está el proceso, que no siempre es la etapa que se mira. */
  etapaActual: number;
  /** Todas las actividades del proceso; aquí se filtran a la etapa en vista. */
  actividades: ActividadEtapa[];
  seleccionada: string | null;
  onSeleccionar: (numeral: string) => void;
}

const COLORES: Record<EstadoActividadUI, { punto: string; borde: string }> = {
  aprobada: { punto: '#10B981', borde: '#10B981' },
  en_curso: { punto: '#003DA5', borde: '#003DA5' },
  pendiente: { punto: '#FFFFFF', borde: '#CBD5E1' },
  no_aplica: { punto: '#F1F5F9', borde: '#E2E8F0' },
};

/** Las actividades sin etapa vienen del respaldo local, que es de la 3. */
const ETAPA_POR_DEFECTO = 3;

function nombreDeEtapa(numero: number): string {
  return ETAPAS.find((e) => e.numero === numero)?.nombre ?? `Etapa ${numero}`;
}

/**
 * Las actividades de una sola etapa: la que la línea del tiempo tenga elegida.
 *
 * Antes el carril mostraba todas las etapas en acordeón, y crecía con cada
 * historia entregada: llegó a listar diez encabezados y sesenta y tres
 * actividades. Recorrer nueve etapas para llegar a la que se trabaja era el
 * costo de tener todo a la vista, y no valía la pena teniendo arriba una línea
 * del tiempo que ya dice dónde está cada cosa.
 *
 * **Las actividades no llevan su numeral a la vista.** El número identifica la
 * fila en la matriz y sirve para hablar entre nosotros, pero al gestor no le
 * dice nada y competía por atención con el nombre, que es lo que sí le importa.
 * Sigue estando en el `title`, para poder señalarlo cuando haga falta.
 *
 * **Las que la modalidad excluye no se listan**, pero se cuentan al pie y se
 * pueden desplegar: esconderlas sin decirlo impediría distinguir «no aplicaba»
 * de «se omitió» en una auditoría, que es justo lo que el tachado protegía.
 */
export function RielActividades({
  etapa,
  etapaActual,
  actividades,
  seleccionada,
  onSeleccionar,
}: Props) {
  const [verExcluidas, setVerExcluidas] = useState(false);

  const deLaEtapa = actividades.filter((a) => (a.etapa ?? ETAPA_POR_DEFECTO) === etapa);
  const aplicables = deLaEtapa.filter((a) => a.estado !== 'no_aplica');
  const excluidas = deLaEtapa.filter((a) => a.estado === 'no_aplica');
  const completas = aplicables.filter((a) => a.estado === 'aprobada').length;
  const esActual = etapa === etapaActual;

  return (
    <nav
      aria-label={`Actividades de la etapa ${etapa}`}
      className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col
        shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
    >
      <div className="px-3 py-2.5 bg-slate-50 flex items-start gap-2 border-b border-gray-200">
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Etapa {etapa}
            </span>
            {esActual && (
              <span className="text-[10px] font-black uppercase tracking-wider rounded-md px-1.5 py-0.5 bg-[#E0EDFF] text-[#003DA5]">
                Actual
              </span>
            )}
          </span>
          <span className="block text-xs font-bold text-slate-700 mt-0.5 leading-tight">
            {nombreDeEtapa(etapa)}
          </span>
        </span>
        {aplicables.length > 0 && (
          <span className="text-[10px] font-bold text-slate-500 tabular-nums flex-shrink-0 mt-0.5">
            {completas}/{aplicables.length}
          </span>
        )}
      </div>

      {aplicables.length === 0 ? (
        <p className="text-[11px] text-slate-500 m-0 px-3 py-4 leading-relaxed">
          {excluidas.length > 0
            ? 'Ninguna actividad de esta etapa aplica a la modalidad del proceso.'
            : 'Esta etapa todavía no tiene actividades en la plataforma.'}
        </p>
      ) : (
        <ul className="list-none m-0 p-1.5 flex flex-col gap-0.5">
          {aplicables.map((actividad) => (
            <li key={actividad.numeral}>
              <Actividad
                actividad={actividad}
                activa={seleccionada === actividad.numeral}
                onSeleccionar={onSeleccionar}
              />
            </li>
          ))}
        </ul>
      )}

      {excluidas.length > 0 && (
        <div className="border-t border-gray-100">
          <button
            type="button"
            onClick={() => setVerExcluidas((v) => !v)}
            aria-expanded={verExcluidas}
            className="w-full text-left px-3 py-2 flex items-center gap-1.5 text-[10px]
              font-bold text-slate-400 hover:bg-slate-50 focus:outline-none
              focus-visible:ring-2 focus-visible:ring-[#003DA5]/40 transition-colors"
          >
            <ChevronDown
              className={`w-3 h-3 flex-shrink-0 transition-transform ${
                verExcluidas ? '' : '-rotate-90'
              }`}
              aria-hidden="true"
            />
            {excluidas.length === 1
              ? '1 no aplica a esta modalidad'
              : `${excluidas.length} no aplican a esta modalidad`}
          </button>

          {verExcluidas && (
            <ul className="list-none m-0 px-3 pb-2.5 pt-0 flex flex-col gap-1">
              {excluidas.map((actividad) => (
                <li
                  key={actividad.numeral}
                  title={`${actividad.numeral} · ${actividad.nombre}`}
                  className="text-[11px] text-slate-400 leading-snug"
                >
                  {actividad.nombre}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </nav>
  );
}

function Actividad({
  actividad,
  activa,
  onSeleccionar,
}: {
  actividad: ActividadEtapa;
  activa: boolean;
  onSeleccionar: (numeral: string) => void;
}) {
  const color = COLORES[actividad.estado];
  const bloqueada = !actividad.disponible;

  return (
    <button
      type="button"
      onClick={() => onSeleccionar(actividad.numeral)}
      disabled={bloqueada}
      aria-current={activa ? 'true' : undefined}
      // El numeral vive aquí: identifica la fila de la matriz cuando hay que
      // hablar de ella, sin ocupar la línea que lee el gestor.
      title={
        bloqueada
          ? `${actividad.numeral} · ${actividad.nombre} — aún no disponible`
          : `${actividad.numeral} · ${actividad.nombre}`
      }
      className={`w-full text-left rounded-lg px-2.5 py-2 flex items-start gap-2.5
        transition-colors focus:outline-none focus-visible:ring-2
        focus-visible:ring-[#003DA5]/40 ${
          activa ? 'bg-[#E0EDFF]' : bloqueada ? 'cursor-not-allowed' : 'hover:bg-slate-50'
        }`}
    >
      <span
        className="w-4 h-4 rounded-full border-2 grid place-items-center flex-shrink-0 mt-0.5"
        style={{ background: color.punto, borderColor: color.borde }}
        aria-hidden="true"
      >
        {actividad.estado === 'aprobada' && (
          <Check className="w-2.5 h-2.5 text-white" strokeWidth={4} />
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span
          className={`block text-xs leading-tight ${
            activa ? 'font-black text-[#003DA5]' : 'font-bold text-slate-700'
          }`}
        >
          {actividad.nombre}
        </span>

        {actividad.detalle && (
          <span className="block text-[10px] text-slate-500 mt-0.5 leading-snug">
            {actividad.detalle}
          </span>
        )}
      </span>

      {bloqueada && (
        <Lock className="w-3 h-3 text-slate-300 flex-shrink-0 mt-1" aria-hidden="true" />
      )}
      {!!actividad.adjuntos && (
        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-slate-400 flex-shrink-0 mt-0.5">
          <Paperclip className="w-2.5 h-2.5" aria-hidden="true" />
          {actividad.adjuntos}
        </span>
      )}
    </button>
  );
}
