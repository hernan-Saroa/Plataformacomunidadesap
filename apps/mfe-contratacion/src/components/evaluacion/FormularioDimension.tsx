import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import {
  CriterioAplicable,
  DimensionManual,
  EstadoEvaluacion,
  OfertaEnEvaluacion,
} from '../../types';
import { campo } from '../shared/PiezasPanel';

interface Props {
  procesoId: string;
  oferta: OfertaEnEvaluacion;
  dimension: DimensionManual;
  criterios: CriterioAplicable[];
  onListo: (estado: EstadoEvaluacion) => void;
  onCancelar: () => void;
}

/** Lo que el evaluador va llenando, antes de mandarlo. */
type Borrador = Record<string, { cumple?: boolean; puntaje?: string; observacion?: string }>;

/**
 * Califica una oferta en una dimensión (EFDS-1444).
 *
 * Se envía la dimensión entera y no criterio por criterio: media evaluación
 * guardada se leería como una evaluación con criterios incumplidos, que no es
 * lo mismo que una sin terminar. Reevaluar sustituye el juicio anterior.
 */
export function FormularioDimension({
  procesoId,
  oferta,
  dimension,
  criterios,
  onListo,
  onCancelar,
}: Props) {
  const previa = oferta.evaluaciones.find((e) => e.dimension === dimension);

  const [borrador, setBorrador] = useState<Borrador>(() => {
    const inicial: Borrador = {};
    for (const criterio of criterios) {
      const antes = previa?.resultados.find((r) => r.criterioId === criterio.id);
      inicial[criterio.id] = {
        cumple: antes?.cumple ?? undefined,
        puntaje: antes?.puntaje != null ? String(antes.puntaje) : '',
        observacion: antes?.observacion ?? '',
      };
    }
    return inicial;
  });
  const [guardando, setGuardando] = useState(false);

  const cambiar = (criterioId: string, cambios: Partial<Borrador[string]>) =>
    setBorrador((actual) => ({ ...actual, [criterioId]: { ...actual[criterioId], ...cambios } }));

  /**
   * Falta algo por decidir, o falta el motivo de un incumplimiento.
   *
   * El motivo se exige aquí y en el servidor: quedar fuera sin motivo escrito
   * es exactamente lo que el oferente reclama.
   */
  const faltante = criterios.find((criterio) => {
    const valor = borrador[criterio.id] ?? {};
    if (criterio.tipo === 'HABILITANTE') {
      if (valor.cumple === undefined) return true;
      return valor.cumple === false && !(valor.observacion ?? '').trim();
    }
    const puntaje = Number(valor.puntaje);
    return (
      (valor.puntaje ?? '') === '' ||
      !Number.isFinite(puntaje) ||
      puntaje < 0 ||
      puntaje > (criterio.puntajeMaximo ?? 0)
    );
  });

  const guardar = async () => {
    setGuardando(true);
    try {
      const estado = await contratacionService.evaluarOferta(procesoId, oferta.id, {
        dimension,
        resultados: criterios.map((criterio) => {
          const valor = borrador[criterio.id] ?? {};
          const observacion = (valor.observacion ?? '').trim() || undefined;
          return criterio.tipo === 'HABILITANTE'
            ? { criterioId: criterio.id, cumple: valor.cumple, observacion }
            : { criterioId: criterio.id, puntaje: Number(valor.puntaje), observacion };
        }),
      });
      toast.success(`Evaluación registrada para ${oferta.nombre}`);
      onListo(estado);
    } catch (err: any) {
      toast.error('No se pudo registrar la evaluación', { description: err.message });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3 space-y-3">
      <p className="text-[12.5px] font-bold text-slate-800 m-0">
        {previa ? 'Corregir la evaluación de' : 'Evaluar a'} {oferta.nombre}
      </p>
      {previa && (
        <p className="text-[11px] text-slate-500 m-0 leading-relaxed">
          Ya la evaluó {previa.evaluadaPor ?? 'otro evaluador'}. Guardar sustituye ese juicio; no se
          acumula.
        </p>
      )}

      {criterios.map((criterio) => {
        const valor = borrador[criterio.id] ?? {};
        return (
          <div key={criterio.id} className="border-t border-gray-100 pt-2.5 first:border-0 first:pt-0">
            <p className="text-[12px] font-bold text-slate-700 m-0">
              {criterio.nombre}
              {!criterio.confirmado && (
                <span className="ml-1.5 text-[10px] font-bold text-amber-700">sin confirmar</span>
              )}
            </p>
            {criterio.descripcion && (
              <p className="text-[11px] text-slate-500 m-0 mt-0.5 leading-relaxed">
                {criterio.descripcion}
              </p>
            )}

            {criterio.tipo === 'HABILITANTE' ? (
              <div className="flex items-center gap-3 mt-1.5">
                {[
                  { valor: true, texto: 'Cumple' },
                  { valor: false, texto: 'No cumple' },
                ].map((opcion) => (
                  <label
                    key={String(opcion.valor)}
                    className="flex items-center gap-1.5 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name={`criterio-${criterio.id}`}
                      checked={valor.cumple === opcion.valor}
                      onChange={() => cambiar(criterio.id, { cumple: opcion.valor })}
                    />
                    <span className="text-[11.5px] text-slate-700">{opcion.texto}</span>
                  </label>
                ))}
              </div>
            ) : (
              <label className="block mt-1.5">
                <span className="block text-[11px] text-slate-500 mb-1">
                  Puntaje (máximo {criterio.puntajeMaximo})
                </span>
                <input
                  value={valor.puntaje ?? ''}
                  onChange={(e) =>
                    cambiar(criterio.id, { puntaje: e.target.value.replace(/[^\d.]/g, '') })
                  }
                  inputMode="decimal"
                  aria-label={`Puntaje de ${criterio.nombre}`}
                  className={`${campo} tabular-nums`}
                />
              </label>
            )}

            <label className="block mt-1.5">
              <span className="block text-[11px] text-slate-500 mb-1">
                {criterio.tipo === 'HABILITANTE' && valor.cumple === false
                  ? 'Motivo del incumplimiento (obligatorio)'
                  : 'Observación'}
              </span>
              <input
                value={valor.observacion ?? ''}
                onChange={(e) => cambiar(criterio.id, { observacion: e.target.value })}
                placeholder="Lo que sustenta el juicio"
                aria-label={`Observación de ${criterio.nombre}`}
                className={campo}
              />
            </label>
          </div>
        );
      })}

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={guardando || faltante !== undefined}
          onClick={guardar}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[11.5px] font-extrabold rounded-md text-white bg-[#003DA5] hover:bg-[#002e7d] shadow-sm active:scale-95 disabled:opacity-50 transition-all"
        >
          <Check className="w-3.5 h-3.5" strokeWidth={3} />
          Guardar la evaluación
        </button>
        <button
          type="button"
          onClick={onCancelar}
          className="px-3 py-1.5 text-[11.5px] font-bold rounded-md border border-gray-200 text-slate-600 hover:border-slate-400 transition-colors"
        >
          Cancelar
        </button>
      </div>

      {/* Qué falta, en vez de un botón apagado sin explicación. */}
      {faltante && (
        <p className="text-[11px] text-slate-500 m-0 leading-relaxed">
          Falta resolver «{faltante.nombre}»
          {faltante.tipo === 'PONDERABLE'
            ? `: el puntaje va entre 0 y ${faltante.puntajeMaximo}.`
            : borrador[faltante.id]?.cumple === false
              ? ': un incumplimiento necesita motivo escrito.'
              : '.'}
        </p>
      )}
    </div>
  );
}
