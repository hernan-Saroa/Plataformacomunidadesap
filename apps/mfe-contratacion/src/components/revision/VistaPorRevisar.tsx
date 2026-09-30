import React, { useMemo, useState } from 'react';
import { ArrowRight, ClipboardCheck, FileText, Hourglass, Inbox, RefreshCw } from 'lucide-react';

import { ElementoPorRevisar } from '../../types';

interface Props {
  elementos: ElementoPorRevisar[];
  cargando: boolean;
  error: string | null;
  onRecargar: () => void;
  onRevisar: (elemento: ElementoPorRevisar) => void;
  /** Dentro de «Mi trabajo», que ya pone el título: solo los contadores. */
  embebida?: boolean;
}

/** Desde cuántos días de espera se señala en ámbar. */
const DIAS_DEMORA = 3;

/** «hoy», «ayer», «hace 5 días». */
function haceCuanto(dias: number): string {
  if (dias <= 0) return 'hoy';
  if (dias === 1) return 'ayer';
  return `hace ${dias} días`;
}

type Filtro = 'todo' | 'estudios' | 'actividades';

/**
 * «Por revisar»: todo lo que espera la decisión de quien mira.
 *
 * Es la «Revisión y Aprobación» del módulo disciplinario traída a
 * Contratación. Quien revisa ya no entra proceso por proceso ni vuelve al
 * formulario donde otro redactó: ve de una vez lo que le espera, lo más viejo
 * arriba, y cada fila lo lleva a una pantalla de revisión hecha para leer y
 * decidir.
 *
 * El estudio previo que le repartieron al abogado entra aquí aunque no salga
 * de una regla de aprobación: es la revisión más importante del proceso, y
 * antes solo se enteraba entrando al proceso.
 */
export function VistaPorRevisar({
  elementos,
  cargando,
  error,
  onRecargar,
  onRevisar,
  embebida = false,
}: Props) {
  const [filtro, setFiltro] = useState<Filtro>('todo');

  const estudios = elementos.filter((e) => e.tipo === 'ESTUDIO_PREVIO').length;
  const demorados = elementos.filter((e) => e.diasEsperando >= DIAS_DEMORA).length;

  const visibles = useMemo(
    () =>
      elementos.filter((e) =>
        filtro === 'todo' ? true : filtro === 'estudios' ? e.tipo === 'ESTUDIO_PREVIO' : e.tipo === 'ACTIVIDAD',
      ),
    [elementos, filtro],
  );

  return (
    <div className="space-y-3 md:space-y-4">
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-start gap-3 flex-wrap">
        {embebida ? (
          <p className="min-w-0 flex-1 self-center text-[13px] text-slate-500 m-0">
            Lo que espera tu decisión, lo que más lleva esperando primero.
          </p>
        ) : (
          <>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
              <ClipboardCheck className="w-5 h-5 text-emerald-700" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-[15px] font-bold text-slate-900 m-0">Por revisar</h2>
              <p className="text-[13px] text-slate-500 m-0 mt-0.5">
                Lo que espera tu decisión, lo que más lleva esperando primero.
              </p>
            </div>
          </>
        )}
        <button
          type="button"
          onClick={onRecargar}
          className="self-center inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold rounded-lg
            bg-white border border-gray-200 text-slate-600 hover:text-[#003DA5] hover:border-[#003DA5]/30"
        >
          <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
          Actualizar
        </button>

        {/* Los contadores de la bandeja disciplinaria: cuánto hay y cuánto se
            está demorando, antes de leer la lista. */}
        <dl className="w-full m-0 grid grid-cols-3 gap-2">
          {[
            { etiqueta: 'Pendientes', valor: elementos.length, clase: 'text-[#003DA5]' },
            { etiqueta: 'Estudios previos', valor: estudios, clase: 'text-emerald-700' },
            {
              etiqueta: `Más de ${DIAS_DEMORA} días`,
              valor: demorados,
              clase: demorados ? 'text-amber-700' : 'text-slate-400',
            },
          ].map((c) => (
            <div key={c.etiqueta} className="rounded-lg bg-slate-50 px-3 py-2">
              <dt className="text-[12px] font-bold text-slate-500">{c.etiqueta}</dt>
              <dd className={`m-0 text-2xl font-black tabular-nums ${c.clase}`}>{c.valor}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="flex items-center gap-1 flex-wrap" role="group" aria-label="Filtrar">
        {(
          [
            { id: 'todo' as const, etiqueta: 'Todo' },
            { id: 'estudios' as const, etiqueta: 'Estudios previos' },
            { id: 'actividades' as const, etiqueta: 'Actividades' },
          ]
        ).map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFiltro(f.id)}
            aria-pressed={filtro === f.id}
            className={`px-3 py-1.5 text-[12px] font-bold rounded-lg border transition-colors ${
              filtro === f.id
                ? 'bg-[#003DA5] text-white border-[#003DA5]'
                : 'bg-white text-slate-600 border-gray-200 hover:border-[#003DA5]/30'
            }`}
          >
            {f.etiqueta}
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {cargando && elementos.length === 0 ? (
          <p className="text-sm text-slate-500 m-0 p-8 text-center">Cargando…</p>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-sm text-red-600 m-0 mb-2">{error}</p>
            <button type="button" onClick={onRecargar} className="text-sm font-bold text-[#003DA5]">
              Reintentar
            </button>
          </div>
        ) : visibles.length === 0 ? (
          <div className="p-10 text-center">
            <Inbox className="w-9 h-9 mx-auto text-gray-300 mb-2" aria-hidden="true" />
            <p className="text-sm font-bold text-slate-600 m-0">No tienes nada por revisar</p>
            <p className="text-[13px] text-slate-400 m-0 mt-1">
              Cuando alguien te envíe una actividad o te repartan un estudio previo, aparecerá aquí.
            </p>
          </div>
        ) : (
          <ul className="m-0 p-0 list-none divide-y divide-gray-100">
            {visibles.map((e) => {
              const demorado = e.diasEsperando >= DIAS_DEMORA;
              return (
                <li key={`${e.procesoId}-${e.numeral}`}>
                  <button
                    type="button"
                    onClick={() => onRevisar(e)}
                    className="w-full text-left px-4 py-3.5 flex items-start gap-3 hover:bg-slate-50 transition-colors group"
                  >
                    <span
                      className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        e.tipo === 'ESTUDIO_PREVIO' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-[#003DA5]'
                      }`}
                      aria-hidden="true"
                    >
                      {e.tipo === 'ESTUDIO_PREVIO' ? (
                        <FileText className="w-4 h-4" />
                      ) : (
                        <ClipboardCheck className="w-4 h-4" />
                      )}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-black text-[#003DA5] tabular-nums">
                        {e.radicado ?? 'Sin radicado'}
                        <span className="font-bold text-slate-500">
                          {' '}
                          · {e.numeral} {e.tipo === 'ESTUDIO_PREVIO' ? 'Estudio previo' : e.actividad}
                        </span>
                      </span>
                      <span className="block text-[13px] text-slate-800 mt-0.5 leading-snug">{e.objeto}</span>
                      <span className="block text-[12px] text-slate-500 mt-1">
                        {e.enviadoPor ? `Enviado por ${e.enviadoPor}` : 'Enviado'}
                        {e.version ? ` · versión ${e.version}` : ''}
                        {e.modalidad ? ` · ${e.modalidad}` : ''}
                      </span>
                    </span>

                    <span className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11.5px] font-bold ${
                          demorado ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <Hourglass className="w-3.5 h-3.5" aria-hidden="true" />
                        {haceCuanto(e.diasEsperando)}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[12px] font-bold text-[#003DA5]">
                        Revisar <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
