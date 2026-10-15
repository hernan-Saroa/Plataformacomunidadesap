import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Info,
  Landmark,
  Lock,
  RotateCcw,
  Save,
} from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { CdpAntesDeRadicar as Regla } from '../../types';
import { PERMISOS } from '../../auth/permisos';
import { useAlcance } from '../../auth/alcance';

/** Lo que se puede cambiar de una modalidad, mientras no se guarda. */
interface Borrador {
  obligatorio: boolean;
}

const borradorDe = (r: Regla): Borrador => ({ obligatorio: r.obligatorio });

const cambio = (r: Regla, b: Borrador) => b.obligatorio !== r.obligatorio;

/**
 * Qué modalidades exigen el CDP antes de enviar el estudio previo (migración 100).
 *
 * Los cambios se preparan y se guardan juntos: con un guardado por cada clic,
 * quien configuraba no sabía qué había quedado aplicado y qué no. La decisión
 * se dice con palabras —opcional u obligatorio, y qué implica cada uno— en vez
 * de una casilla suelta.
 *
 * Las modalidades que no llevan CDP van aparte y sin interruptor: no hay nada
 * que exigirles, y mezclarlas con las demás hacía pensar que se olvidaron.
 */
export function CdpAntesDeRadicar() {
  const { tiene } = useAlcance();
  const puedeEditar = tiene(PERMISOS.configurar);
  const [reglas, setReglas] = useState<Regla[] | null>(null);
  const [borradores, setBorradores] = useState<Record<string, Borrador>>({});
  const [verExentas, setVerExentas] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = (r: Regla[]) => {
    setReglas(r);
    setBorradores(Object.fromEntries(r.map((x) => [x.modalidad, borradorDe(x)])));
  };

  useEffect(() => {
    contratacionService
      .cdpAntesDeRadicar()
      .then(cargar)
      .catch((err: any) => setError(err.message));
  }, []);

  const conCdp = useMemo(() => reglas?.filter((r) => r.aplicaCdp) ?? [], [reglas]);
  const exentas = useMemo(() => reglas?.filter((r) => !r.aplicaCdp) ?? [], [reglas]);
  const pendientes = conCdp.filter((r) => borradores[r.modalidad] && cambio(r, borradores[r.modalidad]));

  const editar = (modalidad: string, cambios: Partial<Borrador>) =>
    setBorradores((b) => ({ ...b, [modalidad]: { ...b[modalidad], ...cambios } }));

  const todas = (obligatorio: boolean) =>
    setBorradores((b) =>
      Object.fromEntries(
        Object.entries(b).map(([m, x]) => [m, conCdp.some((r) => r.modalidad === m) ? { ...x, obligatorio } : x]),
      ),
    );

  const descartar = () => reglas && cargar(reglas);

  const guardar = async () => {
    setGuardando(true);
    try {
      const guardadas = await Promise.all(
        pendientes.map((r) => {
          const b = borradores[r.modalidad];
          return contratacionService.guardarCdpAntesDeRadicar(r.modalidad, {
            obligatorio: b.obligatorio,
          });
        }),
      );
      const porModalidad = new Map(guardadas.map((g) => [g.modalidad, g]));
      cargar(reglas!.map((r) => porModalidad.get(r.modalidad) ?? r));
      toast.success(
        guardadas.length === 1 ? 'Se guardó el cambio' : `Se guardaron ${guardadas.length} cambios`,
        { description: 'Aplica a los estudios previos que se envíen desde ahora.' },
      );
    } catch (err: any) {
      toast.error('No se pudieron guardar los cambios', { description: err.message });
    } finally {
      setGuardando(false);
    }
  };

  if (error) {
    return (
      <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
        <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-red-800 m-0">{error}</p>
      </div>
    );
  }
  if (!reglas) return <p className="text-xs text-slate-500 m-0 px-4 py-3">Cargando…</p>;

  const obligatorias = conCdp.filter((r) => borradores[r.modalidad]?.obligatorio).length;

  return (
    <div className="space-y-3">
      {/* Qué hace la regla, en dos columnas: lo que pasa en cada caso. */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-3">
        <div className="flex items-start gap-2.5">
          <Landmark className="w-5 h-5 text-[#003DA5] mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <h3 className="text-sm font-black text-slate-800 m-0">CDP antes de enviar el estudio previo</h3>
            <p className="text-[12px] text-slate-600 m-0 mt-0.5 leading-relaxed">
              Decide, para cada modalidad, si el área tiene que cargar el CDP antes de enviar el
              estudio previo a revisión. El CDP se tramita por fuera del aplicativo; aquí solo se
              carga.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          <div className="rounded-lg border border-gray-200 bg-slate-50 px-3 py-2.5">
            <p className="text-[12px] font-bold text-slate-700 m-0">Opcional</p>
            <p className="text-[11.5px] text-slate-600 m-0 mt-0.5 leading-relaxed">
              El área puede cargar el CDP desde el estudio previo si ya lo tiene. Si no, lo carga en
              la etapa 4, cuando se aprueba el estudio previo.
            </p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
            <p className="text-[12px] font-bold text-amber-800 m-0">Obligatorio</p>
            <p className="text-[11.5px] text-amber-900 m-0 mt-0.5 leading-relaxed">
              No se puede enviar el estudio previo sin haber cargado el CDP.
            </p>
          </div>
        </div>
        <p className="text-[11px] text-slate-500 m-0 flex items-start gap-1.5">
          <Info className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
          Los cambios aplican a los envíos que vengan: lo que ya está en revisión o aprobado no cambia.
        </p>
      </div>

      {/* Resumen y acciones en bloque. */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-4 py-3 flex items-center gap-3 flex-wrap">
        <p className="text-[12.5px] text-slate-700 m-0">
          <span className="font-black">{obligatorias}</span> de {conCdp.length} modalidades lo exigen
        </p>
        <span className="flex-1" />
        {puedeEditar ? (
          <>
            <button
              type="button"
              onClick={() => todas(false)}
              disabled={guardando}
              className="text-[11.5px] font-bold text-slate-600 hover:text-[#003DA5] disabled:opacity-50"
            >
              Todas opcionales
            </button>
            <button
              type="button"
              onClick={() => todas(true)}
              disabled={guardando}
              className="text-[11.5px] font-bold text-slate-600 hover:text-[#003DA5] disabled:opacity-50"
            >
              Todas obligatorias
            </button>
          </>
        ) : (
          <span className="text-[11.5px] text-slate-500 inline-flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" />
            Solo lectura: lo cambia quien administra Configuración
          </span>
        )}
      </div>

      {/* Una tarjeta por modalidad. */}
      <ul className="m-0 p-0 list-none space-y-2">
        {conCdp.map((r) => {
          const b = borradores[r.modalidad];
          if (!b) return null;
          const cambiada = cambio(r, b);
          return (
            <li
              key={r.modalidad}
              className={`bg-white rounded-xl border shadow-sm px-4 py-3 ${
                cambiada ? 'border-[#003DA5]' : 'border-gray-200'
              }`}
            >
              <div className="flex items-center gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-slate-800 m-0 flex items-center gap-2 flex-wrap">
                    {r.nombre}
                    {cambiada && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E0EDFF] text-[#003DA5]">
                        Sin guardar
                      </span>
                    )}
                  </p>
                  <p className="text-[11.5px] text-slate-500 m-0 mt-0.5">
                    {b.obligatorio
                      ? 'El estudio previo no se envía sin el CDP cargado.'
                      : 'El CDP se puede adelantar; si no, se pide al aprobar.'}
                  </p>
                </div>

                {/* Opcional / Obligatorio, como dos opciones con nombre. */}
                <div
                  role="radiogroup"
                  aria-label={`CDP para ${r.nombre}`}
                  className="inline-flex rounded-lg border border-gray-300 p-0.5 bg-slate-50"
                >
                  {[
                    { valor: false, etiqueta: 'Opcional' },
                    { valor: true, etiqueta: 'Obligatorio' },
                  ].map((o) => {
                    const activa = b.obligatorio === o.valor;
                    return (
                      <button
                        key={o.etiqueta}
                        type="button"
                        role="radio"
                        aria-checked={activa}
                        disabled={!puedeEditar || guardando}
                        onClick={() => editar(r.modalidad, { obligatorio: o.valor })}
                        className={`px-3 py-1 text-[11.5px] font-bold rounded-md transition-colors disabled:cursor-not-allowed ${
                          activa
                            ? o.valor
                              ? 'bg-amber-500 text-white shadow-sm'
                              : 'bg-white text-slate-800 shadow-sm'
                            : 'text-slate-500 hover:text-[#003DA5]'
                        }`}
                      >
                        {o.etiqueta}
                      </button>
                    );
                  })}
                </div>
              </div>

              {r.actualizadoPor && (
                <p className="text-[10.5px] text-slate-400 m-0 mt-1.5">Último cambio: {r.actualizadoPor}</p>
              )}
            </li>
          );
        })}
      </ul>

      {exentas.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-2.5">
          <button
            type="button"
            onClick={() => setVerExentas((v) => !v)}
            className="inline-flex items-center gap-1 text-[11.5px] font-bold text-slate-600"
          >
            {verExentas ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            {exentas.length === 1 ? '1 modalidad no lleva CDP' : `${exentas.length} modalidades no llevan CDP`}
          </button>
          {verExentas && (
            <p className="text-[11.5px] text-slate-500 m-0 mt-1.5">
              {exentas.map((r) => r.nombre).join(', ')}: no comprometen gasto, así que no hay nada que
              exigir.
            </p>
          )}
        </div>
      )}

      {/* La barra de guardar solo aparece cuando hay algo que guardar. */}
      {pendientes.length > 0 && (
        <div className="sticky bottom-3 z-10 bg-white rounded-xl border border-[#003DA5] shadow-lg px-4 py-3 flex items-center gap-3 flex-wrap">
          <p className="text-[12.5px] text-slate-700 m-0">
            {pendientes.length === 1
              ? '1 modalidad con cambios sin guardar'
              : `${pendientes.length} modalidades con cambios sin guardar`}
          </p>
          <span className="flex-1" />
          <button
            type="button"
            onClick={descartar}
            disabled={guardando}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-bold rounded-md bg-white text-slate-700 border border-slate-300 hover:border-[#003DA5] disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Descartar
          </button>
          <button
            type="button"
            onClick={guardar}
            disabled={guardando}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[11.5px] font-extrabold rounded-md text-white bg-[#003DA5] hover:bg-[#002e7d] shadow-sm disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {guardando ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      )}
    </div>
  );
}
