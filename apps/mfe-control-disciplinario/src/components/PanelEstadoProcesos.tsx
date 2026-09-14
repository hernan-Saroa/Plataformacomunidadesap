/**
 * Panel visual (columna izquierda de la vista de Procesos) con:
 *  - Gráfica de torta/dona interactiva (SVG puro, sin librería) por estado de proceso
 *  - Tarjetas tipo semáforo con el conteo de cada estado
 *
 * Al hacer clic en un sector de la dona o en una tarjeta, se emite
 * onFiltrarEstado(estado) — o null si se vuelve a hacer clic en el activo.
 */

import { useMemo } from 'react';
import {
  EstadoAutoUI,
  ESTADO_UI_META,
  ESTADOS_UI_ORDEN,
  construirMapaEstadoPorProceso,
  contarEstados,
} from './estadoAutos';

interface AutoLike {
  processId?: string;
  estado?: string;
  createdAt?: string;
}

interface PanelEstadoProcesosProps {
  autos: AutoLike[];
  procesoIdsVisibles: Set<string>;
  esJefe: boolean;
  filtroEstado: EstadoAutoUI | null;
  onFiltrarEstado: (estado: EstadoAutoUI | null) => void;
}

const SIZE = 132;
const CENTER = SIZE / 2;
const RADIO = 52;
const GROSOR = 18;
const CIRCUNFERENCIA = 2 * Math.PI * RADIO;

export function PanelEstadoProcesos({
  autos,
  procesoIdsVisibles,
  esJefe,
  filtroEstado,
  onFiltrarEstado,
}: PanelEstadoProcesosProps) {
  const { conteos, total } = useMemo(() => {
    const mapa = construirMapaEstadoPorProceso(autos, procesoIdsVisibles);
    const c = contarEstados(mapa);
    return { conteos: c, total: c.pendientes + c.en_revision + c.aprobados + c.devueltos };
  }, [autos, procesoIdsVisibles]);

  const segmentos = useMemo(() => {
    if (total === 0) return [];
    let acumulado = 0;
    return ESTADOS_UI_ORDEN.filter((e) => conteos[e] > 0).map((estado) => {
      const valor = conteos[estado];
      const fraccion = valor / total;
      const longitud = fraccion * CIRCUNFERENCIA;
      const offset = -acumulado;
      acumulado += longitud;
      return { estado, valor, longitud, offset };
    });
  }, [conteos, total]);

  const toggle = (estado: EstadoAutoUI) =>
    onFiltrarEstado(filtroEstado === estado ? null : estado);

  return (
    <>
      {/* Clase de ancho fijo en desktop vía <style> local: el CSS de Tailwind del proyecto
          está precompilado y no incluye clases nuevas como lg:w-[300px] (no existían antes). */}
      <style>{`
        .panel-estado-procesos { width: 100%; }
        @media (min-width: 1024px) {
          .panel-estado-procesos { width: 300px; flex-shrink: 0; }
        }
      `}</style>
      <div className="panel-estado-procesos rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3">
        <h3 className="text-sm font-bold text-gray-800">
          {esJefe ? 'Estado de los procesos' : 'Estado de mis procesos'}
        </h3>
        <p className="text-[11px] text-gray-400 mt-0.5">
          Haz clic en un estado para filtrar el listado
        </p>
      </div>

      {/* Dona SVG */}
      <div className="flex items-center justify-center py-2">
        <div className="relative" style={{ width: SIZE, height: SIZE }}>
          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
            <g transform={`rotate(-90 ${CENTER} ${CENTER})`}>
              {/* Pista base */}
              <circle
                cx={CENTER}
                cy={CENTER}
                r={RADIO}
                fill="none"
                stroke="#F1F5F9"
                strokeWidth={GROSOR}
              />
              {segmentos.map(({ estado, longitud, offset }) => {
                const meta = ESTADO_UI_META[estado];
                const atenuado = filtroEstado !== null && filtroEstado !== estado;
                return (
                  <circle
                    key={estado}
                    cx={CENTER}
                    cy={CENTER}
                    r={RADIO}
                    fill="none"
                    stroke={meta.color}
                    strokeWidth={GROSOR}
                    strokeDasharray={`${longitud} ${CIRCUNFERENCIA - longitud}`}
                    strokeDashoffset={offset}
                    strokeLinecap="butt"
                    style={{
                      cursor: 'pointer',
                      opacity: atenuado ? 0.3 : 1,
                      transition: 'opacity 0.2s',
                    }}
                    onClick={() => toggle(estado)}
                  >
                    <title>{`${meta.label}: ${conteos[estado]}`}</title>
                  </circle>
                );
              })}
            </g>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-bold text-gray-800 leading-none">{total}</span>
            <span className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">
              {total === 1 ? 'proceso' : 'procesos'}
            </span>
          </div>
        </div>
      </div>

      {total === 0 && (
        <p className="text-center text-xs text-gray-400 py-2">Sin autos registrados</p>
      )}

      {/* Tarjetas tipo semáforo */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        {ESTADOS_UI_ORDEN.map((estado) => {
          const meta = ESTADO_UI_META[estado];
          const activo = filtroEstado === estado;
          return (
            <button
              key={estado}
              type="button"
              onClick={() => toggle(estado)}
              className="flex flex-col items-start rounded-xl border p-2.5 text-left transition-all hover:shadow-sm"
              style={{
                borderColor: activo ? meta.color : '#E5E7EB',
                background: activo ? meta.colorSuave : '#FFFFFF',
                boxShadow: activo ? `0 0 0 1px ${meta.color}` : undefined,
              }}
            >
              <span className="flex items-center gap-1.5">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full"
                  style={{ background: meta.color }}
                />
                <span className="text-[11px] font-semibold text-gray-600">{meta.label}</span>
              </span>
              <span className="text-xl font-bold text-gray-900 mt-1">{conteos[estado]}</span>
            </button>
          );
        })}
      </div>

      {filtroEstado !== null && (
        <button
          type="button"
          onClick={() => onFiltrarEstado(null)}
          className="mt-3 w-full rounded-lg border border-gray-200 py-1.5 text-[11px] font-semibold text-gray-500 hover:bg-gray-50"
        >
          Quitar filtro
        </button>
      )}
      </div>
    </>
  );
}
