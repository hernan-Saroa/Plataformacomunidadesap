import React, { ReactNode } from 'react';
import { Check, Minus, ChevronDown, Lock, Paperclip } from 'lucide-react';

export type EstadoActividadUI = 'aprobada' | 'en_curso' | 'pendiente' | 'no_aplica';

export interface ActividadEtapa {
  numeral: string;
  nombre: string;
  descripcion?: string;
  estado: EstadoActividadUI;
  /** Texto de apoyo bajo el nombre (ej. "faltan 13 campos"). */
  detalle?: string;
  /** Solo las actividades con HU entregada son navegables. */
  disponible?: boolean;
  /** Documentos cargados en esta actividad. */
  adjuntos?: number;
}

interface Props {
  etapa: number;
  nombreEtapa: string;
  actividades: ActividadEtapa[];
  onAbrir?: (numeral: string) => void;
  /** Numeral actualmente desplegado. */
  expandida?: string | null;
  /** Contenido a mostrar bajo la actividad desplegada (su formulario). */
  contenidoExpandido?: ReactNode;
  /** Dentro del acordeón la cabecera ya la pone la etapa. */
  sinCabecera?: boolean;
}

const ESTILOS: Record<
  EstadoActividadUI,
  { punto: string; borde: string; texto: string; fondo: string }
> = {
  aprobada: { punto: '#10B981', borde: '#10B981', texto: '#047857', fondo: '#ECFDF5' },
  en_curso: { punto: '#003DA5', borde: '#003DA5', texto: '#003DA5', fondo: '#E0EDFF' },
  pendiente: { punto: '#FFFFFF', borde: '#CBD5E1', texto: '#64748B', fondo: 'transparent' },
  no_aplica: { punto: '#F1F5F9', borde: '#E2E8F0', texto: '#94A3B8', fondo: 'transparent' },
};

/**
 * Actividades de la etapa actual del proceso.
 *
 * Las que no aplican a la modalidad se muestran tachadas en vez de ocultarse:
 * la matriz marca actividades como NO para ciertas modalidades, y esconderlas
 * impediría distinguir "no aplicaba" de "se omitió" en una auditoría.
 */
export function ListaActividades({
  etapa,
  nombreEtapa,
  actividades,
  onAbrir,
  expandida,
  contenidoExpandido,
  sinCabecera = false,
}: Props) {
  const aplicables = actividades.filter((a) => a.estado !== 'no_aplica');
  const completas = actividades.filter((a) => a.estado === 'aprobada').length;

  return (
    <div
      className={
        sinCabecera
          ? ''
          : 'bg-white border border-gray-200 rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]'
      }
    >
      {!sinCabecera && (
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 m-0">
              Etapa {etapa}
            </p>
            <h3 className="text-sm font-black text-gray-800 m-0 mt-0.5">{nombreEtapa}</h3>
          </div>
          <span className="text-[11px] font-bold text-gray-500 tabular-nums flex-shrink-0">
            {completas} de {aplicables.length} completadas
          </span>
        </div>
      )}

      <ol className="m-0 p-0 list-none">
        {actividades.map((act, idx) => {
          const s = ESTILOS[act.estado];
          const navegable = act.disponible && onAbrir;
          const esUltima = idx === actividades.length - 1;
          const abierta = expandida === act.numeral;

          return (
            <li key={act.numeral} className="relative">
              {/* Línea que conecta los puntos */}
              {!esUltima && (
                <span
                  className="absolute left-[27px] top-[38px] bottom-0 w-[2px] bg-gray-200"
                  aria-hidden="true"
                />
              )}

              <div
                className={`flex items-start gap-3 px-4 py-3.5 transition-colors ${
                  abierta ? 'bg-[#E0EDFF]/40' : ''
                } ${!abierta ? 'border-b border-gray-50 last:border-b-0' : ''} ${
                  navegable ? 'hover:bg-slate-50 cursor-pointer' : ''
                }`}
                onClick={() => navegable && onAbrir!(act.numeral)}
                role={navegable ? 'button' : undefined}
                tabIndex={navegable ? 0 : undefined}
                onKeyDown={(e) => {
                  if (navegable && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    onAbrir!(act.numeral);
                  }
                }}
              >
                {/* Punto de estado */}
                <span
                  className="flex items-center justify-center flex-shrink-0 relative z-10 rounded-full border-2"
                  style={{
                    width: 24,
                    height: 24,
                    background: s.punto,
                    borderColor: s.borde,
                    boxShadow: act.estado === 'en_curso' ? '0 0 0 3px #E0EDFF' : undefined,
                  }}
                >
                  {act.estado === 'aprobada' && (
                    <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                  )}
                  {act.estado === 'en_curso' && (
                    <span
                      className="rounded-full bg-white"
                      style={{ width: 7, height: 7 }}
                    />
                  )}
                  {act.estado === 'no_aplica' && (
                    <Minus className="w-3 h-3" style={{ color: '#CBD5E1' }} strokeWidth={3} />
                  )}
                  {act.estado === 'pendiente' && (
                    <span
                      className="rounded-full"
                      style={{ width: 6, height: 6, background: '#CBD5E1' }}
                    />
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="text-[11px] font-black tabular-nums flex-shrink-0"
                      style={{ color: s.texto }}
                    >
                      {act.numeral}
                    </span>
                    <span
                      className={`text-[12.5px] font-bold ${
                        act.estado === 'no_aplica' ? 'line-through text-gray-400' : 'text-gray-800'
                      }`}
                    >
                      {act.nombre}
                    </span>
                    {!act.disponible && act.estado !== 'no_aplica' && (
                      <span className="text-[9px] font-bold uppercase tracking-wide text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded flex-shrink-0">
                        Próx.
                      </span>
                    )}
                    {act.adjuntos !== undefined && act.adjuntos > 0 && (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded flex-shrink-0 tabular-nums"
                        title={`${act.adjuntos} ${act.adjuntos === 1 ? 'documento' : 'documentos'} en esta actividad`}
                      >
                        <Paperclip className="w-2.5 h-2.5" />
                        {act.adjuntos}
                      </span>
                    )}
                  </div>

                  {act.detalle && (
                    <p
                      className="text-[11px] font-semibold m-0 mt-1"
                      style={{ color: s.texto }}
                    >
                      {act.detalle}
                    </p>
                  )}

                  {act.descripcion && !act.detalle && (
                    <p className="text-[11px] text-gray-400 m-0 mt-1 leading-snug">
                      {act.descripcion}
                    </p>
                  )}
                </div>

                {navegable ? (
                  <span className="flex-shrink-0 inline-flex items-center gap-1 text-[11px] font-bold text-[#003DA5] mt-0.5">
                    {abierta ? 'Cerrar' : 'Diligenciar'}
                    <ChevronDown
                      className="w-3.5 h-3.5"
                      style={{
                        transform: abierta ? 'rotate(180deg)' : 'none',
                        transition: 'transform .2s',
                      }}
                    />
                  </span>
                ) : act.estado !== 'no_aplica' ? (
                  <Lock className="w-3.5 h-3.5 text-gray-300 flex-shrink-0 mt-1" />
                ) : null}
              </div>

              {/* El formulario se despliega aquí mismo: evita cambiar de
                  pantalla y deja ver la actividad junto a su contenido. */}
              {abierta && contenidoExpandido && (
                <div className="border-b border-gray-100 bg-slate-50/50 px-4 py-4 pl-[52px]">
                  {contenidoExpandido}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
