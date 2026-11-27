import React, { useEffect, useMemo, useState } from 'react';
import { RotateCcw, Undo2 } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { ActividadReabrible } from '../../types';
import { Modal } from '../shared/Modal';
import { Boton, campo } from '../shared/PiezasPanel';
import { SoloLectura } from '../shared/SoloLectura';

interface Props {
  procesoId: string;
  radicado: string;
  /** Algo se reabrió o se deshizo: el riel y la franja tienen que enterarse. */
  onCambio: () => void;
}

/** Un motivo de tres letras no le dice a nadie qué corregir. */
const MINIMO_MOTIVO = 10;

/**
 * Reabrir actividades ya cerradas (migración 153).
 *
 * Solo lo ve quien tiene `contratacion.actividad.reabrir` —lo decide quien
 * monta el botón—. Se elige, por etapa, una o más actividades aprobadas, y
 * vuelven a quien las trabajó con el motivo, como cuando el comité observa.
 * Lo que vino después no se toca.
 *
 * Las que siguen reabiertas se listan aparte con «Deshacer»: si la reapertura
 * sobró, la actividad vuelve a aprobada y nadie queda esperando una
 * corrección que no va a llegar.
 */
export function ReabrirActividades({ procesoId, radicado, onCambio }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [lista, setLista] = useState<ActividadReabrible[] | null>(null);
  const [elegidas, setElegidas] = useState<Set<string>>(new Set());
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);

  const cargar = () => {
    setLista(null);
    contratacionService
      .reaperturas(procesoId)
      .then(setLista)
      .catch((err: any) => {
        toast.error(err.message);
        setLista([]);
      });
  };

  useEffect(() => {
    if (!abierto) return;
    setElegidas(new Set());
    setMotivo('');
    cargar();
  }, [abierto, procesoId]);

  const cerradas = useMemo(() => (lista ?? []).filter((a) => a.estado === 'APROBADO'), [lista]);
  const reabiertas = useMemo(() => (lista ?? []).filter((a) => a.reapertura), [lista]);

  const porEtapa = useMemo(() => {
    const grupos = new Map<number, ActividadReabrible[]>();
    for (const a of cerradas) grupos.set(a.etapa, [...(grupos.get(a.etapa) ?? []), a]);
    return [...grupos.entries()].sort(([a], [b]) => a - b);
  }, [cerradas]);

  const alternar = (numerales: string[], marcar: boolean) =>
    setElegidas((previas) => {
      const nuevas = new Set(previas);
      for (const n of numerales) (marcar ? nuevas.add(n) : nuevas.delete(n));
      return nuevas;
    });

  const listo = elegidas.size > 0 && motivo.trim().length >= MINIMO_MOTIVO;

  const reabrir = async () => {
    if (!listo) return;
    setEnviando(true);
    try {
      const r = await contratacionService.reabrirActividades(procesoId, [...elegidas], motivo.trim());
      toast.success(
        r.reabiertas.length === 1
          ? `Se reabrió la actividad ${r.reabiertas[0]}`
          : `Se reabrieron ${r.reabiertas.length} actividades`,
      );
      onCambio();
      setAbierto(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setEnviando(false);
    }
  };

  const deshacer = async (numeral: string) => {
    setEnviando(true);
    try {
      await contratacionService.deshacerReapertura(procesoId, numeral);
      toast.success(`La actividad ${numeral} volvió a quedar aprobada`);
      onCambio();
      cargar();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        title="Reabrir actividades ya cerradas para corregir un error"
        className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-amber-200
          text-[11.5px] font-bold text-amber-800 hover:bg-amber-50 transition-colors"
      >
        <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
        Reabrir
      </button>

      {/* Fuera del solo lectura de quien lo pinta: el permiso ya se comprobó. */}
      <SoloLectura motivo={null}>
        <Modal
          isOpen={abierto}
          onClose={() => setAbierto(false)}
          title={`Reabrir actividades de ${radicado}`}
          description="Cada actividad elegida vuelve a quien la trabajó con el motivo, para que la corrija y pase otra vez por su aprobación. Lo que vino después no se toca."
          size="medium"
          color="#B45309"
          icon={<RotateCcw className="w-5 h-5" />}
          footer={
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAbierto(false)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <Boton
                icono={<RotateCcw className="w-3.5 h-3.5" strokeWidth={3} />}
                disabled={!listo || enviando}
                onClick={reabrir}
              >
                {enviando
                  ? 'Reabriendo…'
                  : elegidas.size > 1
                    ? `Reabrir ${elegidas.size} actividades`
                    : 'Reabrir'}
              </Boton>
            </div>
          }
        >
          {lista === null ? (
            <p className="text-sm text-slate-500 m-0">Cargando actividades…</p>
          ) : (
            <div className="space-y-4">
              {reabiertas.length > 0 && (
                <section>
                  <h4 className="text-xs font-bold text-gray-600 m-0 mb-1.5">Reabiertas, esperando corrección</h4>
                  <ul className="m-0 p-0 list-none space-y-1.5">
                    {reabiertas.map((a) => (
                      <li
                        key={a.numeral}
                        className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-[12.5px] font-bold text-slate-800 m-0">
                            {a.numeral} · {a.nombre}
                          </p>
                          <p className="text-[11px] text-slate-600 m-0 mt-0.5">
                            «{a.reapertura!.motivo}» — {a.reapertura!.por}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={enviando}
                          onClick={() => deshacer(a.numeral)}
                          title="La actividad vuelve a quedar aprobada como estaba"
                          className="shrink-0 inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-1
                            text-[11px] font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                          <Undo2 className="w-3 h-3" aria-hidden="true" />
                          Deshacer
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {porEtapa.length === 0 ? (
                <p className="text-sm text-slate-600 m-0">
                  Este proceso no tiene actividades cerradas que se puedan reabrir.
                </p>
              ) : (
                porEtapa.map(([etapa, actividades]) => {
                  const numerales = actividades.map((a) => a.numeral);
                  const todas = numerales.every((n) => elegidas.has(n));
                  return (
                    <section key={etapa}>
                      <label className="flex items-center gap-2 text-xs font-bold text-gray-600 mb-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={todas}
                          onChange={(e) => alternar(numerales, e.target.checked)}
                        />
                        Etapa {etapa}
                      </label>
                      <ul className="m-0 p-0 list-none space-y-1 pl-5">
                        {actividades.map((a) => (
                          <li key={a.numeral}>
                            <label className="flex items-center gap-2 text-[12.5px] text-slate-800 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={elegidas.has(a.numeral)}
                                onChange={(e) => alternar([a.numeral], e.target.checked)}
                              />
                              <span className="font-bold tabular-nums">{a.numeral}</span>
                              <span>{a.nombre}</span>
                            </label>
                          </li>
                        ))}
                      </ul>
                    </section>
                  );
                })
              )}

              {porEtapa.length > 0 && (
                <div>
                  <label htmlFor="reabrir-motivo" className="block text-xs font-bold text-gray-600 mb-1.5">
                    Qué hay que corregir <span className="text-red-600">*</span>
                  </label>
                  <textarea
                    id="reabrir-motivo"
                    rows={3}
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder="Lo lee quien tiene que corregirla"
                    className={campo}
                  />
                  {motivo.trim().length > 0 && motivo.trim().length < MINIMO_MOTIVO && (
                    <p className="text-[11px] text-amber-700 m-0 mt-1">
                      Escribe al menos {MINIMO_MOTIVO} caracteres.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </Modal>
      </SoloLectura>
    </>
  );
}
