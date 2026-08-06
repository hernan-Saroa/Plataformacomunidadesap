import React from 'react';
import { Check, Lock, Paperclip } from 'lucide-react';

import { ActividadEtapa, EstadoActividadUI } from './ListaActividades';

interface Props {
  etapa: number;
  nombreEtapa: string;
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

/**
 * Navegación entre las actividades de la etapa actual.
 *
 * Reemplaza al acordeón de las 10 etapas: para trabajar en una actividad no
 * hay que recorrer las nueve etapas que no aplican, y cambiar de actividad no
 * pliega ni desplaza el contenido, solo cambia el panel de la derecha.
 *
 * Las actividades que no aplican a la modalidad se muestran tachadas en vez de
 * ocultarse, igual que en la lista: esconderlas impediría distinguir "no
 * aplicaba" de "se omitió" en una auditoría.
 */
export function RielActividades({
  etapa,
  nombreEtapa,
  actividades,
  seleccionada,
  onSeleccionar,
}: Props) {
  const aplicables = actividades.filter((a) => a.estado !== 'no_aplica');
  const completas = aplicables.filter((a) => a.estado === 'aprobada').length;

  return (
    <nav
      aria-label={`Actividades de la etapa ${etapa}`}
      className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col
        shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
    >
      <div className="px-3 py-2.5 border-b border-gray-200 bg-slate-50">
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 m-0">
          Etapa {etapa}
        </p>
        <p className="text-[12px] font-bold text-slate-700 m-0 mt-0.5 leading-tight">
          {nombreEtapa}
        </p>
      </div>

      <ul className="list-none m-0 p-1.5 flex flex-col gap-0.5">
        {actividades.map((actividad) => {
          const activa = seleccionada === actividad.numeral;
          const color = COLORES[actividad.estado];
          const bloqueada = !actividad.disponible;
          const noAplica = actividad.estado === 'no_aplica';

          return (
            <li key={actividad.numeral}>
              <button
                type="button"
                onClick={() => onSeleccionar(actividad.numeral)}
                disabled={bloqueada}
                aria-current={activa ? 'true' : undefined}
                title={bloqueada ? 'Aún no disponible' : undefined}
                className={`w-full text-left rounded-lg px-2.5 py-2 flex items-start gap-2.5
                  transition-colors focus:outline-none focus-visible:ring-2
                  focus-visible:ring-[#003DA5]/40 ${
                    activa
                      ? 'bg-[#E0EDFF]'
                      : bloqueada
                        ? 'cursor-not-allowed'
                        : 'hover:bg-slate-50'
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
            </li>
          );
        })}
      </ul>

      <p className="px-3 py-2 border-t border-gray-100 text-[10.5px] font-bold text-slate-500 m-0 tabular-nums">
        {completas} de {aplicables.length} completadas
      </p>
    </nav>
  );
}
