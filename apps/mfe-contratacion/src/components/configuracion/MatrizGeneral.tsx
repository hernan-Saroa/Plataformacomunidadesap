import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ChevronRight, Search, X } from 'lucide-react';

import { contratacionService } from '../../services/contratacionService';
import { CeldaMatriz, FilaMatriz, Matriz, Modalidad } from '../../types';

import { LeyendaMatriz, NOMBRE_ETAPA, SimboloMatriz, sigla } from './simbolos';

/** El proceso entra al sistema en los estudios previos; lo anterior no se configura. */
const ETAPA_INICIAL = 3;

interface Props {
  /** Abre el detalle de una actividad en la modalidad de esa columna. */
  onAbrir: (numeral: string, modalidad: string) => void;
}

/**
 * La matriz completa: cada actividad contra cada modalidad.
 *
 * Es la vista que Contratación ya tenía en el Excel y que la pantalla no
 * ofrecía. Antes había que elegir una modalidad, luego una actividad y luego
 * una pestaña para ver una sola celda; reconstruir mentalmente la rejilla
 * costaba abrir 63 actividades. Aquí se lee de una vez y se compara entre
 * modalidades, que es justo lo que la configuración necesita para verificarse.
 *
 * Las etapas se pliegan porque son 63 filas: con todas abiertas la cabecera de
 * modalidades se pierde de vista y la rejilla deja de ser comparable.
 */
export function MatrizGeneral({ onAbrir }: Props) {
  const [datos, setDatos] = useState<Matriz | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [abiertas, setAbiertas] = useState<Set<number>>(new Set([ETAPA_INICIAL]));
  const [busqueda, setBusqueda] = useState('');
  /** La columna que se está mirando, para decir su nombre entero. */
  const [modalidadMirada, setModalidadMirada] = useState<Modalidad | null>(null);

  useEffect(() => {
    setCargando(true);
    contratacionService
      .matriz()
      .then(setDatos)
      .catch((err: any) => setError(err.message))
      .finally(() => setCargando(false));
  }, []);

  const filtradas = useMemo(() => {
    if (!datos) return [];
    // Las etapas 1 y 2 —identificación de la necesidad y Plan Anual de
    // Adquisiciones— ocurren antes de que el proceso entre al sistema, así que
    // no hay nada que configurar en ellas: el trabajo empieza en los estudios
    // previos.
    const desdeEtapa3 = datos.filas.filter((f) => f.etapa >= ETAPA_INICIAL);
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return desdeEtapa3;
    return desdeEtapa3.filter(
      (f) =>
        f.nombre.toLowerCase().includes(texto) ||
        f.numeral.includes(texto) ||
        (f.descripcion ?? '').toLowerCase().includes(texto),
    );
  }, [datos, busqueda]);

  const porEtapa = useMemo(() => {
    const mapa = new Map<number, FilaMatriz[]>();
    for (const f of filtradas) {
      if (!mapa.has(f.etapa)) mapa.set(f.etapa, []);
      mapa.get(f.etapa)!.push(f);
    }
    return [...mapa.entries()].sort(([a], [b]) => a - b);
  }, [filtradas]);

  // Buscar sin abrir la etapa que contiene el resultado no sirve de nada.
  const buscando = busqueda.trim().length > 0;

  const alternar = (etapa: number) =>
    setAbiertas((previas) => {
      const siguiente = new Set(previas);
      if (siguiente.has(etapa)) siguiente.delete(etapa);
      else siguiente.add(etapa);
      return siguiente;
    });

  // Solo se cuenta lo que esta pantalla decide: cuántas actividades hay y
  // cuáles arrastran una salvedad de la matriz original sin aclarar. Lo que
  // cada actividad valida se define en el código de la etapa, así que contar
  // aquí formularios o reglas mandaba a buscar un configurador que no existe.
  const resumen = useMemo(() => {
    if (!datos) return null;
    // Se cuenta sobre las etapas que se ven: decir 63 actividades con 18 en
    // pantalla obligaba a preguntarse dónde están las demás.
    const visibles = datos.filas.filter((f) => f.etapa >= ETAPA_INICIAL);
    let salvedades = 0;
    let noAplican = 0;
    for (const f of visibles) {
      for (const c of f.celdas) {
        if (c.estado === 'CON_SALVEDAD') salvedades++;
        else if (c.estado === 'NO_APLICA') noAplican++;
      }
    }
    return { actividades: visibles.length, salvedades, noAplican };
  }, [datos]);

  if (cargando) {
    return (
      <div className="space-y-2 rounded-xl border border-gray-200 bg-white p-4">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-9 rounded bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2"
      >
        <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-red-800 m-0">{error}</p>
      </div>
    );
  }

  if (!datos) return null;

  return (
    <div className="space-y-3">
      {/* Una sola banda: la explicación de cómo se lee, los recuentos y los
          controles. Antes eran tres bloques apilados —aviso, buscador,
          tarjetas— que ocupaban un tercio de la pantalla antes de llegar a la
          tabla, que es lo que se viene a mirar. */}
      <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <p className="m-0 text-xs text-gray-600 leading-relaxed min-w-0 flex-1">
            Cada fila es una actividad y cada columna una modalidad.{' '}
            <strong className="font-semibold text-gray-800">Pulsa una celda</strong> para
            cambiar si se exige o corregir su texto.
          </p>

          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar actividad…"
                aria-label="Buscar actividad"
                className="w-56 rounded-lg border border-gray-300 pl-8 pr-8 py-1.5 text-xs focus:border-[#003DA5] focus:ring-1 focus:ring-[#003DA5] outline-none"
              />
              {buscando && (
                <button
                  type="button"
                  onClick={() => setBusqueda('')}
                  aria-label="Limpiar búsqueda"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setAbiertas(new Set(filtradas.map((f) => f.etapa)))}
              className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-[11px] font-semibold text-gray-600 hover:bg-gray-50"
            >
              Abrir todas
            </button>
            <button
              type="button"
              onClick={() => setAbiertas(new Set())}
              className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-[11px] font-semibold text-gray-600 hover:bg-gray-50"
            >
              Plegar
            </button>
          </div>
        </div>

        {/* Los recuentos en una línea, y a la derecha la modalidad que se está
            mirando: la sigla de la cabecera no dice cuál es, y once
            abreviaturas no se memorizan. Se reserva el sitio siempre para que
            la banda no cambie de alto al recorrer la rejilla. */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-gray-100 pt-2.5">
          {resumen && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500">
              <span>
                <strong className="font-bold text-gray-800">{resumen.actividades}</strong>{' '}
                actividades en{' '}
                <strong className="font-bold text-gray-800">
                  {datos.modalidades.length}
                </strong>{' '}
                modalidades
              </span>
              {resumen.salvedades > 0 && (
                <span className="text-amber-700">
                  <strong className="font-bold">{resumen.salvedades}</strong> con salvedad
                  de la matriz
                </span>
              )}
              {resumen.noAplican > 0 && (
                <span>
                  <strong className="font-bold text-gray-700">{resumen.noAplican}</strong>{' '}
                  celdas que la modalidad se salta
                </span>
              )}
            </div>
          )}

          <p
            aria-live="polite"
            className={`m-0 text-[11px] font-semibold ${
              modalidadMirada ? 'text-[#003DA5]' : 'text-transparent'
            }`}
          >
            {modalidadMirada?.nombre ?? 'Pasa por una columna'}
          </p>
        </div>
      </div>

      <div className="overflow-auto rounded-xl border border-gray-200 bg-white max-h-[68vh]">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-20">
            <tr className="bg-gray-50">
              <th className="sticky left-0 z-30 bg-gray-50 border-b border-r border-gray-200 px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-gray-600 min-w-[320px]">
                Actividad
              </th>
              {/* La sigla enseña el nombre completo al pasar por encima, en un
                  globo propio y no en el `title` del navegador: ese tarda casi
                  dos segundos en salir y con once columnas obliga a esperar en
                  cada una para saber cuál se está mirando. */}
              {datos.modalidades.map((m) => (
                <th
                  key={m.codigo}
                  onMouseEnter={() => setModalidadMirada(m)}
                  onMouseLeave={() => setModalidadMirada(null)}
                  className="border-b border-gray-200 px-2 py-2 text-center text-[11px] font-bold tracking-wide w-16 text-gray-600 transition-colors hover:text-[#003DA5]"
                >
                  {sigla(m.codigo)}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {porEtapa.length === 0 && (
              <tr>
                <td
                  colSpan={datos.modalidades.length + 1}
                  className="px-4 py-10 text-center text-sm text-gray-500"
                >
                  Ninguna actividad coincide con «{busqueda}».
                </td>
              </tr>
            )}

            {porEtapa.map(([etapa, lista]) => {
              const abierta = buscando || abiertas.has(etapa);
              return (
                <React.Fragment key={etapa}>
                  <FilaEtapa
                    etapa={etapa}
                    lista={lista}
                    modalidades={datos.modalidades}
                    abierta={abierta}
                    onAlternar={() => alternar(etapa)}
                  />

                  {abierta &&
                    lista.map((fila) => (
                      <tr key={fila.numeral} className="group border-b border-gray-100 transition-colors hover:bg-gray-50/70">
                        <td className="sticky left-0 z-10 bg-white group-hover:bg-gray-50 border-r border-gray-200 px-3 py-2 transition-colors">
                          <span className="flex items-baseline gap-2">
                            <span className="text-[11px] font-bold text-gray-400 flex-shrink-0">
                              {fila.numeral}
                            </span>
                            <span className="text-sm text-gray-800 leading-snug">
                              {fila.nombre}
                            </span>
                          </span>
                        </td>

                        {fila.celdas.map((celda) => (
                          <Celda
                            key={celda.modalidad}
                            celda={celda}
                            fila={fila}
                            nombreModalidad={
                              datos.modalidades.find((m) => m.codigo === celda.modalidad)
                                ?.nombre ?? celda.modalidad
                            }
                            onAbrir={() => onAbrir(fila.numeral, celda.modalidad)}
                          />
                        ))}
                      </tr>
                    ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <LeyendaMatriz />
    </div>
  );
}


/**
 * Encabezado de etapa con el recuento de la etapa plegada.
 *
 * El recuento por columna es lo que permite decidir si vale la pena abrirla:
 * una etapa que no aplica a media tabla se ve sin desplegarla.
 */
function FilaEtapa({
  etapa,
  lista,
  modalidades,
  abierta,
  onAlternar,
}: {
  etapa: number;
  lista: FilaMatriz[];
  modalidades: Modalidad[];
  abierta: boolean;
  onAlternar: () => void;
}) {
  const porModalidad = new Map<string, number>();
  for (const f of lista) {
    for (const c of f.celdas) {
      if (c.estado !== 'NO_APLICA') {
        porModalidad.set(c.modalidad, (porModalidad.get(c.modalidad) ?? 0) + 1);
      }
    }
  }

  return (
    <tr className="border-b border-gray-200 bg-gray-50/90">
      <th
        scope="rowgroup"
        className="sticky left-0 z-10 bg-gray-50 border-r border-gray-200 p-0 text-left"
      >
        <button
          type="button"
          onClick={onAlternar}
          aria-expanded={abierta}
          className="w-full flex items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-gray-100"
        >
          {/* Un solo icono que gira: dos iconos distintos cambian de forma de
              golpe y no se lee como «esto se abre». */}
          <ChevronRight
            className={`w-3.5 h-3.5 text-gray-500 flex-shrink-0 transition-transform ${
              abierta ? 'rotate-90' : ''
            }`}
          />
          <span className="min-w-0">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-500">
              Etapa {etapa}
            </span>
            <span className="block text-xs font-semibold text-gray-700">
              {NOMBRE_ETAPA[etapa] ?? ''}
            </span>
          </span>
          <span
            title={`${lista.length} actividades en esta etapa`}
            className="ml-auto text-[10px] font-semibold text-gray-400 flex-shrink-0"
          >
            {lista.length}
          </span>
        </button>
      </th>

      {modalidades.map((m) => {
        const cuantas = porModalidad.get(m.codigo) ?? 0;
        // Una etapa entera que la modalidad no recorre es distinta de una a la
        // que solo le faltan actividades: se marca con la casilla en gris para
        // que se vea sin desplegar la etapa ni contar celda por celda.
        const seSalta = cuantas === 0;
        return (
          <td
            key={m.codigo}
            title={
              seSalta
                ? `${m.nombre} no recorre ninguna actividad de esta etapa`
                : `${m.nombre} recorre ${cuantas} de las ${lista.length} actividades de esta etapa`
            }
            className={`px-2 py-2 text-center text-[11px] font-bold ${
              seSalta ? 'bg-gray-100 text-gray-400' : 'text-gray-500'
            }`}
          >
            {seSalta ? 'no' : cuantas}
          </td>
        );
      })}
    </tr>
  );
}

function Celda({
  celda,
  fila,
  nombreModalidad,
  onAbrir,
}: {
  celda: CeldaMatriz;
  fila: FilaMatriz;
  nombreModalidad: string;
  onAbrir: () => void;
}) {
  // El título lleva la modalidad entera —la sigla de la cabecera no la dice— y
  // la variante, que es lo que la matriz escribió en esta celda: sin ella, el
  // símbolo esconde justo la diferencia con las demás modalidades.
  const detalle = [celda.variante, celda.motivo].filter(Boolean).join(' · ');
  const titulo = `${fila.numeral} · ${fila.nombre}\nEn ${nombreModalidad}${
    detalle ? `\n${detalle}` : ''
  }`;

  return (
    <td className="p-0 text-center transition-colors group-hover:bg-gray-50">
      <button
        type="button"
        onClick={onAbrir}
        title={titulo}
        className="w-full h-full px-2 py-2 hover:bg-[#E0EDFF] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#003DA5] focus-visible:ring-inset"
      >
        <SimboloMatriz estado={celda.estado} className="w-4 h-4" />
        {/* La variante se anuncia con un punto: sin él, "aplica igual que
            siempre" y "aplica pero produce otro documento" se ven idénticas. */}
        {celda.variante && (
          <span className="block mx-auto mt-0.5 w-1 h-1 rounded-full bg-amber-500" aria-hidden />
        )}
      </button>
    </td>
  );
}
