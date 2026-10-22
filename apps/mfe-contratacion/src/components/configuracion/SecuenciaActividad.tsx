import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { AsignacionFlujo, SecuenciaDelPaso } from '../../types';
import { campo } from '../shared/PiezasPanel';
import { AvisoDeVersion, Opcion } from './LaHaceActividad';

interface Props {
  numeral: string;
  /** Una modalidad; sin ella, la configuración general. */
  modalidad?: string | null;
  nombreModalidad?: string;
  /** Las actividades que la matriz pone antes, en orden: de esas puede depender. */
  anteriores: { numeral: string; nombre: string }[];
  /** Algo cambió en el borrador: el diagrama relee. */
  onCambio?: () => void;
}

/**
 * Cuándo empieza la actividad y si detiene a las que siguen (125).
 *
 * Lo normal es la matriz en fila: cada una espera a la anterior y, mientras
 * no termine, detiene a todas las de después. Pero hay puntos que no dependen
 * del anterior —la audiencia de riesgos solo necesita la apertura, el archivo
 * solo la liquidación— y puntos que corren en paralelo —la publicación del
 * contrato no tiene por qué frenar el inicio de la ejecución—. Aquí se dice,
 * por modalidad, para que esos puntos no detengan el flujo.
 */
export function SecuenciaActividad({ numeral, modalidad = null, nombreModalidad, anteriores, onCambio }: Props) {
  const [config, setConfig] = useState<AsignacionFlujo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  /** Se puede marcar «otras actividades» antes de elegir la primera. */
  const [eligiendo, setEligiendo] = useState(false);

  useEffect(() => {
    contratacionService
      .asignacionFlujo(numeral, modalidad)
      .then((c) => {
        setConfig(c);
        setError(null);
      })
      .catch((e: any) => setError(e.message));
  }, [numeral, modalidad]);

  const guardar = async (secuencia: SecuenciaDelPaso | null, exito: string) => {
    setGuardando(true);
    try {
      const nueva = await contratacionService.guardarAsignacionFlujo(numeral, { modalidad, secuencia });
      setConfig(nueva);
      setEligiendo(false);
      toast.success(exito);
      onCambio?.();
    } catch (e: any) {
      toast.error(e.message ?? 'No se pudo guardar');
    } finally {
      setGuardando(false);
    }
  };

  if (error) return <p className="text-xs text-red-600 m-0">{error}</p>;
  if (!config) return <p className="text-xs text-slate-400 m-0">Cargando la configuración…</p>;

  const { dependeDe, noBloquea } = config.secuencia;
  const elegidas = dependeDe ?? [];
  const otras = dependeDe !== null || eligiendo;
  const anterior = anteriores[anteriores.length - 1];
  const nombreDe = (n: string) => anteriores.find((a) => a.numeral === n)?.nombre ?? 'Actividad retirada';
  const porAgregar = anteriores.filter((a) => !elegidas.includes(a.numeral));

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-600 m-0 leading-relaxed">
        Cuándo se puede empezar esta actividad y si, mientras siga abierta, detiene a las que vienen después.
      </p>
      <AvisoDeVersion
        heredada={!!modalidad && !config.propiaDeLaModalidad.secuencia}
        modalidad={modalidad}
        nombreModalidad={nombreModalidad}
        ocupado={guardando}
        onUsarGeneral={() => guardar(null, 'Vuelve a usar lo general')}
      />

      <div className="space-y-2">
        <Opcion
          marcada={!otras}
          disabled={guardando || !anterior}
          onClick={() =>
            dependeDe === null
              ? setEligiendo(false)
              : guardar({ dependeDe: null, noBloquea }, 'Empieza cuando termina la anterior')
          }
          titulo="Cuando termina la anterior"
          ayuda={
            anterior
              ? `La que la matriz pone justo antes: ${anterior.numeral} ${anterior.nombre}.`
              : 'Es la primera actividad del flujo.'
          }
        />
        <Opcion
          marcada={otras}
          disabled={guardando || !anterior}
          onClick={() => setEligiendo(true)}
          titulo="Cuando terminan otras actividades"
          ayuda="Solo espera a las que elijas; las de en medio no la detienen. Si una no aplica en la modalidad, se da por cumplida cuando el proceso llega a ella."
        />
      </div>

      {otras && (
        <div className="ml-6 space-y-1.5">
          {elegidas.map((n) => (
            <div key={n} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
              <span className="text-xs text-slate-800 flex-1 min-w-0 truncate">
                <span className="font-bold tabular-nums">{n}</span> {nombreDe(n)}
              </span>
              <button
                type="button"
                disabled={guardando}
                aria-label={`Ya no depende de la ${n}`}
                onClick={() => {
                  const quedan = elegidas.filter((x) => x !== n);
                  guardar(
                    { dependeDe: quedan.length ? quedan : null, noBloquea },
                    quedan.length ? `Ya no espera a la ${n}` : 'Empieza cuando termina la anterior',
                  );
                }}
                className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {porAgregar.length > 0 && (
            <select
              value=""
              disabled={guardando}
              aria-label="Agregar una actividad de la que depende"
              onChange={(e) => {
                const n = e.target.value;
                if (!n) return;
                const orden = anteriores.map((a) => a.numeral);
                const nuevas = [...elegidas, n].sort((x, y) => orden.indexOf(x) - orden.indexOf(y));
                guardar({ dependeDe: nuevas, noBloquea }, `Espera a que termine la ${n}`);
              }}
              className={campo}
            >
              <option value="">{elegidas.length ? 'Agregar otra…' : 'Elige de cuál depende…'}</option>
              {porAgregar.map((a) => (
                <option key={a.numeral} value={a.numeral}>
                  {a.numeral} {a.nombre}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      <label className="flex items-start gap-2.5 rounded-lg border border-gray-200 bg-white px-3 py-2.5 cursor-pointer">
        <input
          type="checkbox"
          checked={noBloquea}
          disabled={guardando}
          onChange={() =>
            guardar(
              { dependeDe, noBloquea: !noBloquea },
              noBloquea ? 'Vuelve a detener a las siguientes' : 'Ya no detiene el flujo',
            )
          }
          className="mt-0.5"
        />
        <span className="min-w-0">
          <span className="block text-sm font-bold text-slate-800">No detiene el flujo</span>
          <span className="block text-[11px] text-slate-500 mt-0.5">
            Las siguientes avanzan aunque esta siga abierta. Para las que corren en paralelo o duran toda la ejecución.
          </span>
        </span>
      </label>
    </div>
  );
}
