import React from 'react';
import { ArrowRight, Clock, Hourglass, Inbox, Hand, ClipboardCheck, UserPlus } from 'lucide-react';

import { ElementoPorRevisar, PlazoDeActividad } from '../../types';
import { EstadoMiTrabajo } from '../../hooks/useMiTrabajo';
import { VistaPorRevisar } from '../revision/VistaPorRevisar';
import { ChipPlazo } from '../proceso/ChipPlazo';
import { RASGOS_DEL_MOMENTO, verboDeLaSituacion } from '../proceso/rasgosDelMomento';
import { ElementoDeTrabajo } from './miTrabajo';

export type PestanaTrabajo = 'hacer' | 'revisar' | 'asignar' | 'espera';

interface Props {
  estado: EstadoMiTrabajo;
  pestana: PestanaTrabajo;
  onPestana: (p: PestanaTrabajo) => void;
  onRevisar: (e: ElementoPorRevisar) => void;
  /** Abre el proceso para trabajar esa actividad. */
  onTrabajar: (procesoId: string, numeral: string | null) => void;
  /** Abre la ficha del proceso, para seguirlo. */
  onConsultar: (procesoId: string) => void;
}

/** «hoy», «ayer», «hace 5 días». */
function haceCuanto(iso: string | null): string | null {
  if (!iso) return null;
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (dias <= 0) return 'hoy';
  if (dias === 1) return 'ayer';
  return `hace ${dias} días`;
}

/**
 * «Mi trabajo»: la entrada al módulo, ordenada por responsabilidad.
 *
 * El listado responde «qué procesos hay»; esto responde «qué tengo que hacer
 * hoy». Cada pestaña es una forma distinta de tener un proceso en las manos:
 * trabajarlo, revisarlo, asignarlo o esperar a otro. Lo que antes estaba
 * repartido entre Alertas, la bandeja de CDP y el propio listado queda en un
 * solo sitio.
 */
export function VistaMiTrabajo({ estado, pestana, onPestana, onRevisar, onTrabajar, onConsultar }: Props) {
  const { trabajo, porRevisar } = estado;

  const pestanas: { id: PestanaTrabajo; etiqueta: string; n: number; Icono: typeof Inbox; ayuda: string }[] = [
    {
      id: 'hacer',
      etiqueta: 'Por hacer',
      n: trabajo.porHacer.length,
      Icono: Hand,
      ayuda: 'Te toca redactar, corregir o trabajar una actividad.',
    },
    {
      id: 'revisar',
      etiqueta: 'Por revisar',
      n: porRevisar.length,
      Icono: ClipboardCheck,
      ayuda: 'Esperan tu decisión.',
    },
    {
      id: 'asignar',
      etiqueta: 'Por asignar',
      n: trabajo.porAsignar.length,
      Icono: UserPlus,
      ayuda: 'Hay que recibirlos en la Dirección o asignarles abogado.',
    },
    {
      id: 'espera',
      etiqueta: 'En espera',
      n: trabajo.enEspera.length,
      Icono: Hourglass,
      ayuda: 'Estás en el proceso, pero la siguiente acción es de otra persona.',
    },
  ];
  const actual = pestanas.find((p) => p.id === pestana)!;

  const lista =
    pestana === 'hacer' ? trabajo.porHacer : pestana === 'asignar' ? trabajo.porAsignar : trabajo.enEspera;

  return (
    <div className="space-y-3 md:space-y-4">
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h2 className="text-[15px] font-bold text-slate-900 m-0">Mi trabajo</h2>
        <p className="text-[13px] text-slate-500 m-0 mt-0.5">
          Lo que te toca hoy, y lo que espera a otros en tus procesos.
        </p>

        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2" role="tablist" aria-label="Mi trabajo">
          {pestanas.map(({ id, etiqueta, n, Icono }) => {
            const activa = pestana === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={activa}
                onClick={() => onPestana(id)}
                className={`text-left rounded-lg border px-3 py-2 transition-colors ${
                  activa ? 'border-[#003DA5] bg-blue-50' : 'border-gray-200 bg-white hover:border-[#003DA5]/30'
                }`}
              >
                <span className="flex items-center gap-1.5 text-[12px] font-bold text-slate-600">
                  <Icono className="w-3.5 h-3.5" aria-hidden="true" />
                  {etiqueta}
                </span>
                <span
                  className={`block text-2xl font-black tabular-nums ${
                    n ? (id === 'espera' ? 'text-slate-600' : 'text-[#003DA5]') : 'text-slate-300'
                  }`}
                >
                  {n}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {pestana === 'revisar' ? (
        <VistaPorRevisar
          elementos={porRevisar}
          cargando={estado.cargando}
          error={estado.error}
          onRecargar={estado.recargar}
          onRevisar={onRevisar}
          embebida
        />
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <p className="m-0 px-4 py-2.5 border-b border-gray-100 bg-slate-50 text-[12px] text-slate-600">
            {actual.ayuda}
          </p>
          {estado.cargando && lista.length === 0 ? (
            <p className="text-sm text-slate-500 m-0 p-8 text-center">Cargando…</p>
          ) : estado.error ? (
            <div className="p-8 text-center">
              <p className="text-sm text-red-600 m-0 mb-2">{estado.error}</p>
              <button type="button" onClick={estado.recargar} className="text-sm font-bold text-[#003DA5]">
                Reintentar
              </button>
            </div>
          ) : lista.length === 0 ? (
            <div className="p-10 text-center">
              <Inbox className="w-9 h-9 mx-auto text-gray-300 mb-2" aria-hidden="true" />
              <p className="text-sm font-bold text-slate-600 m-0">Nada en «{actual.etiqueta}»</p>
            </div>
          ) : (
            <ul className="m-0 p-0 list-none divide-y divide-gray-100">
              {lista.map((e) => (
                <Fila
                  key={e.proceso.id}
                  elemento={e}
                  enEspera={pestana === 'espera'}
                  plazo={estado.plazos.get(e.proceso.id)?.[0] ?? null}
                  onAbrir={() =>
                    pestana === 'espera'
                      ? onConsultar(e.proceso.id)
                      : onTrabajar(e.proceso.id, e.situacion.numeral)
                  }
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function Fila({
  elemento,
  enEspera,
  plazo,
  onAbrir,
}: {
  elemento: ElementoDeTrabajo;
  enEspera: boolean;
  plazo: PlazoDeActividad | null;
  onAbrir: () => void;
}) {
  const { proceso, situacion } = elemento;
  const rasgos = RASGOS_DEL_MOMENTO[situacion.momento];
  const movimiento = haceCuanto(situacion.ultimoMovimiento);

  return (
    <li>
      <button
        type="button"
        onClick={onAbrir}
        className="w-full text-left px-4 py-3.5 flex items-start gap-3 hover:bg-slate-50 transition-colors"
      >
        <span
          className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${rasgos.clase}`}
          aria-hidden="true"
        >
          <rasgos.Icono className="w-4 h-4" />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-black text-[#003DA5] tabular-nums">
            {proceso.radicado}
            <span className="font-bold text-slate-500"> · {rasgos.etiqueta}</span>
          </span>
          <span className="block text-[13px] text-slate-800 mt-0.5 leading-snug">{proceso.objeto}</span>
          <span className="block text-[12px] text-slate-600 mt-1">
            <strong className="text-slate-900">{situacion.titulo}</strong>
            {enEspera && situacion.quien ? ` · le toca a ${situacion.quien}` : ''}
          </span>
          {situacion.espera ? (
            <span className="block text-[12px] text-amber-800 mt-0.5">{situacion.espera}</span>
          ) : null}
          <span className="flex items-center gap-2 flex-wrap mt-1.5">
            {plazo ? <ChipPlazo plazo={plazo} /> : null}
            {movimiento ? (
              <span className="inline-flex items-center gap-1 text-[12px] text-slate-500">
                <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                Último movimiento {movimiento}
              </span>
            ) : null}
          </span>
        </span>

        <span className="self-center inline-flex items-center gap-1 text-[12px] font-bold text-[#003DA5] flex-shrink-0">
          {enEspera ? 'Seguir' : verboDeLaSituacion(situacion)}
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </span>
      </button>
    </li>
  );
}
