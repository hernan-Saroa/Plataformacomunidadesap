import React, { useEffect, useState } from 'react';
import { Check, ChevronDown, Lock, Paperclip } from 'lucide-react';

import { ActividadEtapa, EstadoActividadUI } from './ListaActividades';
import { ETAPAS } from './StepperEtapas';

interface Props {
  etapaActual: number;
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
 * Navegación entre las actividades del proceso, agrupadas por etapa.
 *
 * Reemplaza al acordeón de las 10 etapas: para trabajar en una actividad no hay
 * que recorrer las nueve que no aplican, y cambiar de actividad no pliega ni
 * desplaza el contenido, solo cambia el panel de la derecha.
 *
 * Los grupos se pliegan porque el riel ya cubre tres etapas y seguirá creciendo:
 * en plano, un proceso en la etapa 3 mostraba trece actividades seguidas bajo un
 * encabezado que decía "Etapa 3", y las de la 4 y la 5 parecían suyas. Se abre
 * la etapa en curso, que es donde se trabaja, y las demás quedan a un clic.
 *
 * Las actividades que no aplican a la modalidad se muestran tachadas en vez de
 * ocultarse: esconderlas impediría distinguir "no aplicaba" de "se omitió" en
 * una auditoría.
 */
export function RielActividades({
  etapaActual,
  actividades,
  seleccionada,
  onSeleccionar,
}: Props) {
  const grupos = agruparPorEtapa(actividades);
  const [abiertas, setAbiertas] = useState<number[]>([etapaActual]);

  // La etapa de la actividad elegida se despliega sola: seleccionar la 5.2
  // desde un proceso en la etapa 3 y que su grupo siguiera plegado dejaría el
  // panel de la derecha sin nada que lo señale en el riel.
  const etapaSeleccionada = actividades.find((a) => a.numeral === seleccionada)?.etapa;
  useEffect(() => {
    if (etapaSeleccionada === undefined) return;
    setAbiertas((previas) =>
      previas.includes(etapaSeleccionada) ? previas : [...previas, etapaSeleccionada],
    );
  }, [etapaSeleccionada]);

  return (
    <nav
      aria-label="Actividades del proceso"
      className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col
        shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
    >
      {grupos.map(({ etapa, items }, indice) => {
        const abierta = abiertas.includes(etapa);
        const aplicables = items.filter((a) => a.estado !== 'no_aplica');
        const completas = aplicables.filter((a) => a.estado === 'aprobada').length;
        const esActual = etapa === etapaActual;

        return (
          <section key={etapa} className={indice > 0 ? 'border-t border-gray-200' : ''}>
            <button
              type="button"
              onClick={() =>
                setAbiertas((previas) =>
                  previas.includes(etapa)
                    ? previas.filter((e) => e !== etapa)
                    : [...previas, etapa],
                )
              }
              aria-expanded={abierta}
              className="w-full text-left px-3 py-2.5 bg-slate-50 flex items-start gap-2
                hover:bg-slate-100 focus:outline-none focus-visible:ring-2
                focus-visible:ring-[#003DA5]/40 transition-colors"
            >
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5 transition-transform ${
                  abierta ? '' : '-rotate-90'
                }`}
                aria-hidden="true"
              />
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
                <span className="block text-[12px] font-bold text-slate-700 mt-0.5 leading-tight">
                  {nombreDeEtapa(etapa)}
                </span>
              </span>
              <span className="text-[10.5px] font-bold text-slate-500 tabular-nums flex-shrink-0 mt-0.5">
                {completas}/{aplicables.length}
              </span>
            </button>

            {abierta && (
              <ul className="list-none m-0 p-1.5 flex flex-col gap-0.5">
                {items.map((actividad) => (
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
          </section>
        );
      })}
    </nav>
  );
}

/** Etapas presentes, en orden, con sus actividades en el orden que ya traían. */
function agruparPorEtapa(actividades: ActividadEtapa[]) {
  const porEtapa = new Map<number, ActividadEtapa[]>();

  for (const actividad of actividades) {
    const etapa = actividad.etapa ?? ETAPA_POR_DEFECTO;
    const grupo = porEtapa.get(etapa);
    if (grupo) grupo.push(actividad);
    else porEtapa.set(etapa, [actividad]);
  }

  return [...porEtapa.entries()]
    .sort(([a], [b]) => a - b)
    .map(([etapa, items]) => ({ etapa, items }));
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
  const noAplica = actividad.estado === 'no_aplica';

  return (
    <button
      type="button"
      onClick={() => onSeleccionar(actividad.numeral)}
      disabled={bloqueada}
      aria-current={activa ? 'true' : undefined}
      title={bloqueada ? 'Aún no disponible' : undefined}
      className={`w-full text-left rounded-lg px-2.5 py-2 flex items-start gap-2.5
        transition-colors focus:outline-none focus-visible:ring-2
        focus-visible:ring-[#003DA5]/40 ${
          activa ? 'bg-[#E0EDFF]' : bloqueada ? 'cursor-not-allowed' : 'hover:bg-slate-50'
        }`}
    >
      <span
        className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: color.punto, borderColor: color.borde }}
        aria-hidden="true"
      >
        {actividad.estado === 'aprobada' && (
          <Check className="w-2.5 h-2.5 text-white" strokeWidth={4} />
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span
          className={`block text-[12px] leading-tight ${
            activa ? 'font-black text-[#003DA5]' : 'font-bold text-slate-700'
          } ${noAplica ? 'line-through' : ''}`}
        >
          <span className="tabular-nums">{actividad.numeral}</span> {actividad.nombre}
        </span>

        {actividad.detalle && (
          <span className="block text-[10.5px] text-slate-500 mt-0.5 leading-snug">
            {actividad.detalle}
          </span>
        )}
      </span>

      {bloqueada && !noAplica && (
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
