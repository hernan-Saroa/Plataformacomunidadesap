import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { ModalidadConUmbral, UnidadUmbral } from '../../types';

interface Props {
  modalidad: ModalidadConUmbral;
  onListo: () => void | Promise<void>;
}

/** Acepta "1.000" y "1000"; vacío significa "sin límite", que es un valor. */
function aNumero(texto: string): number | null {
  const limpio = texto.replace(/[^\d,]/g, '').replace(',', '.');
  if (!limpio) return null;
  const n = Number(limpio);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Mañana, en YYYY-MM-DD: el umbral nuevo debe arrancar después del vigente. */
function manana(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function EditorUmbral({ modalidad, onListo }: Props) {
  const actual = modalidad.umbral;

  const [inferior, setInferior] = useState(actual?.limiteInferior?.toString() ?? '');
  const [superior, setSuperior] = useState(actual?.limiteSuperior?.toString() ?? '');
  const [unidad, setUnidad] = useState<UnidadUmbral>(actual?.unidad ?? 'SMMLV');
  const [desde, setDesde] = useState(manana());
  const [guardando, setGuardando] = useState(false);

  const li = useMemo(() => aNumero(inferior), [inferior]);
  const ls = useMemo(() => aNumero(superior), [superior]);

  // Se valida antes de enviar para explicarlo en su sitio; el backend lo
  // revalida igual, porque es donde vive la regla.
  const error = useMemo(() => {
    if (li === null && ls === null) return 'Indica al menos un límite';
    if (li !== null && ls !== null && li >= ls) return 'El límite inferior debe ser menor que el superior';
    if (actual && desde <= actual.vigenciaDesde) {
      return `El umbral vigente empezó el ${actual.vigenciaDesde}; el nuevo debe empezar después`;
    }
    return null;
  }, [li, ls, desde, actual]);

  const guardar = async () => {
    if (error) return;
    setGuardando(true);
    try {
      await contratacionService.guardarUmbral(modalidad.modalidad, {
        limiteInferior: li,
        limiteSuperior: ls,
        unidad,
        vigenciaDesde: desde,
      });
      toast.success(`Umbral de ${modalidad.nombre} actualizado`);
      await onListo();
    } catch (err: any) {
      toast.error('No se pudo guardar el umbral', { description: err.message });
    } finally {
      setGuardando(false);
    }
  };

  const campo =
    'w-full px-3 py-2 text-sm rounded-lg border border-gray-300 tabular-nums focus:outline-none focus:border-[#003DA5] focus:ring-2 focus:ring-[#003DA5]/20';

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-bold text-gray-600 mb-1.5">Unidad</label>
        <select
          value={unidad}
          onChange={(e) => setUnidad(e.target.value as UnidadUmbral)}
          className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:border-[#003DA5] focus:ring-2 focus:ring-[#003DA5]/20"
        >
          <option value="SMMLV">SMMLV — salarios mínimos</option>
          <option value="PESOS">Pesos — cifra cerrada</option>
        </select>
        <p className="text-[11px] text-gray-500 mt-1.5 mb-0 leading-relaxed">
          En SMMLV el umbral se recalcula solo cada año al registrar el salario nuevo. En pesos
          queda fijo hasta que alguien lo cambie.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="umbral-inf" className="block text-xs font-bold text-gray-600 mb-1.5">
            Desde
          </label>
          <input
            id="umbral-inf"
            type="text"
            inputMode="numeric"
            value={inferior}
            onChange={(e) => setInferior(e.target.value)}
            placeholder="sin piso"
            className={campo}
          />
        </div>
        <div>
          <label htmlFor="umbral-sup" className="block text-xs font-bold text-gray-600 mb-1.5">
            Hasta
          </label>
          <input
            id="umbral-sup"
            type="text"
            inputMode="numeric"
            value={superior}
            onChange={(e) => setSuperior(e.target.value)}
            placeholder="sin techo"
            className={campo}
          />
        </div>
      </div>
      <p className="text-[11px] text-gray-500 m-0 leading-relaxed">
        El límite superior no entra en el rango: pertenece al tramo siguiente. Déjalo vacío para
        "sin techo".
      </p>

      <div>
        <label htmlFor="umbral-desde" className="block text-xs font-bold text-gray-600 mb-1.5">
          Rige desde
        </label>
        <input
          id="umbral-desde"
          type="date"
          value={desde}
          onChange={(e) => setDesde(e.target.value)}
          className={campo}
        />
        <p className="text-[11px] text-gray-500 mt-1.5 mb-0 leading-relaxed">
          El umbral actual se cierra el día anterior. Los procesos ya creados no se alteran.
        </p>
      </div>

      {error && (
        <p role="alert" className="text-[11.5px] font-bold text-red-600 m-0">
          {error}
        </p>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={guardar}
          disabled={!!error || guardando}
          className="px-3.5 py-2 text-xs font-extrabold rounded-lg text-white bg-[#003DA5] hover:bg-[#002e7d] shadow-sm active:scale-95 disabled:opacity-50 transition-all"
        >
          {guardando ? 'Guardando…' : 'Guardar umbral'}
        </button>
      </div>
    </div>
  );
}
