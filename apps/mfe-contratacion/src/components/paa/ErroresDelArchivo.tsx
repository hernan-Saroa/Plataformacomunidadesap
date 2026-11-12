import React, { useMemo, useState } from 'react';
import { AlertTriangle, Lightbulb } from 'lucide-react';

import type { HallazgoPaa } from '../../types';
import { BotonFormatoPaa } from './FormatoDelPaa';
import { agruparErrores, rangosDeFilas, tipoDeError } from './guiaDeErrores';

/** Cuántas filas de la tabla se pintan de una vez: un archivo mal armado trae cientos. */
const POR_TANDA = 100;

interface Props {
  errores: HallazgoPaa[];
  advertencias?: HallazgoPaa[];
}

/**
 * Los errores de un Excel del PAA, en dos vistas.
 *
 * «Por tipo» es lo primero que sirve: 689 errores suelen ser ocho arreglos
 * repetidos en cada fila, y cada uno trae cómo se corrige y la sección de la
 * guía que lo explica. «Fila por fila» es el detalle completo —fila, columna,
 * valor y qué pasa— con filtro por columna, para ir celda por celda. Se usa
 * igual para una versión inválida y para un archivo que ni se pudo guardar.
 */
export function ErroresDelArchivo({ errores, advertencias = [] }: Props) {
  const [vista, setVista] = useState<'tipos' | 'filas'>('tipos');
  const [columna, setColumna] = useState('');
  const [tipo, setTipo] = useState('');
  const [visibles, setVisibles] = useState(POR_TANDA);

  const grupos = useMemo(() => agruparErrores(errores), [errores]);
  const columnas = useMemo(
    () => [...new Set(errores.map((e) => e.columna).filter((c): c is string => !!c))],
    [errores],
  );
  const filtrados = useMemo(
    () =>
      errores.filter((e) => (!columna || e.columna === columna) && (!tipo || tipoDeError(e).clave === tipo)),
    [errores, columna, tipo],
  );
  const filasConError = useMemo(() => new Set(errores.map((e) => e.fila).filter((f) => f !== null)).size, [errores]);

  const verFilasDe = (clave: string) => {
    setTipo(clave);
    setColumna('');
    setVisibles(POR_TANDA);
    setVista('filas');
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
        <p className="m-0 flex items-center gap-1.5 text-xs font-bold text-red-800">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          {errores.length} error(es) en {filasConError} fila(s), de {grupos.length} tipo(s). Mientras los tenga, el archivo no se puede activar.
        </p>
        <BotonFormatoPaa />
      </div>

      <div className="flex flex-wrap gap-1 border-b border-gray-200" role="tablist" aria-label="Vista de los errores">
        <SubPestana activa={vista === 'tipos'} onClick={() => setVista('tipos')}>
          Por tipo de error ({grupos.length})
        </SubPestana>
        <SubPestana activa={vista === 'filas'} onClick={() => setVista('filas')}>
          Fila por fila ({errores.length})
        </SubPestana>
      </div>

      {vista === 'tipos' && (
        <ul className="m-0 p-0 list-none space-y-2">
          {grupos.map((g) => (
            <li key={g.tipo.clave} className="rounded-lg border border-gray-200 bg-white px-3 py-2.5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="m-0 text-sm font-extrabold text-slate-800">{g.tipo.titulo}</p>
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-800 tabular-nums whitespace-nowrap">
                  {g.hallazgos.length} vez/veces
                </span>
              </div>
              <p className="m-0 mt-1 text-xs text-gray-600">
                {g.columnas.length > 0 && <>Columna(s): {g.columnas.join(' · ')}. </>}
                {g.filas.length > 0 && <>Filas {rangosDeFilas(g.filas)}.</>}
              </p>
              {g.hallazgos[0].valor && (
                <p className="m-0 mt-1 text-xs text-gray-600">
                  Ejemplo: fila {g.hallazgos[0].fila ?? '—'} dice <span className="font-mono text-red-700 break-words">«{g.hallazgos[0].valor}»</span>
                </p>
              )}
              {g.tipo.comoSeCorrige && (
                <p className="m-0 mt-1.5 flex items-start gap-1.5 rounded-md bg-emerald-50 px-2 py-1.5 text-xs text-emerald-900">
                  <Lightbulb className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <span>
                    {g.tipo.comoSeCorrige}
                    {g.tipo.seccion && <span className="text-emerald-700"> (Sección {g.tipo.seccion} de la guía.)</span>}
                  </span>
                </p>
              )}
              <button
                type="button"
                onClick={() => verFilasDe(g.tipo.clave)}
                className="mt-1.5 text-xs font-bold text-[#003DA5] hover:underline"
              >
                Ver las {g.hallazgos.length} celdas
              </button>
            </li>
          ))}
        </ul>
      )}

      {vista === 'filas' && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-xs font-bold text-gray-600">
              Tipo de error
              <select
                value={tipo}
                onChange={(e) => {
                  setTipo(e.target.value);
                  setVisibles(POR_TANDA);
                }}
                className="mt-1 block max-w-xs rounded-lg border border-gray-300 px-2 py-1.5 text-xs font-normal"
              >
                <option value="">Todos</option>
                {grupos.map((g) => (
                  <option key={g.tipo.clave} value={g.tipo.clave}>
                    {g.tipo.titulo} ({g.hallazgos.length})
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-bold text-gray-600">
              Columna
              <select
                value={columna}
                onChange={(e) => {
                  setColumna(e.target.value);
                  setVisibles(POR_TANDA);
                }}
                className="mt-1 block max-w-xs rounded-lg border border-gray-300 px-2 py-1.5 text-xs font-normal"
              >
                <option value="">Todas</option>
                {columnas.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <p className="m-0 pb-2 text-xs text-gray-500">{filtrados.length} celda(s)</p>
          </div>

          <TablaDeHallazgos hallazgos={filtrados.slice(0, visibles)} />
          {filtrados.length > visibles && (
            <button
              type="button"
              onClick={() => setVisibles((v) => v + POR_TANDA)}
              className="text-xs font-bold text-[#003DA5] hover:underline"
            >
              Mostrar {Math.min(POR_TANDA, filtrados.length - visibles)} más (van {visibles} de {filtrados.length})
            </button>
          )}
        </div>
      )}

      {advertencias.length > 0 && (
        <div>
          <p className="m-0 mb-1.5 flex items-center gap-1.5 text-xs font-bold text-amber-800">
            <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
            {advertencias.length} advertencia(s): no impiden activarlo
          </p>
          <TablaDeHallazgos hallazgos={advertencias.slice(0, POR_TANDA)} />
        </div>
      )}
    </div>
  );
}

export function TablaDeHallazgos({ hallazgos }: { hallazgos: HallazgoPaa[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-xs">
        <thead className="bg-slate-50 text-left text-gray-500">
          <tr>
            <th className="px-2.5 py-1.5 font-bold">Fila</th>
            <th className="px-2.5 py-1.5 font-bold">Columna</th>
            <th className="px-2.5 py-1.5 font-bold">Valor</th>
            <th className="px-2.5 py-1.5 font-bold">Qué pasa</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {hallazgos.map((h, i) => (
            <tr key={i}>
              <td className="px-2.5 py-1.5 tabular-nums whitespace-nowrap">{h.fila ?? '—'}</td>
              <td className="px-2.5 py-1.5">{h.columna ?? '—'}</td>
              <td className="px-2.5 py-1.5 break-words">{h.valor ?? '—'}</td>
              <td className="px-2.5 py-1.5 text-slate-700">{h.mensaje}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SubPestana({ activa, onClick, children }: { activa: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={activa}
      onClick={onClick}
      className={`px-3 py-2 text-xs font-bold border-b-2 pestana-paa ${
        activa ? 'border-[#003DA5] text-[#003DA5]' : 'border-transparent text-gray-500 hover:text-gray-700'
      }`}
    >
      {children}
    </button>
  );
}
