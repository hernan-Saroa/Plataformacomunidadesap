import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { SmmlvAnual } from '../../types';

interface Props {
  salarios: SmmlvAnual[];
  onListo: () => void | Promise<void>;
}

function aNumero(texto: string): number | null {
  const limpio = texto.replace(/\D/g, '');
  if (!limpio) return null;
  const n = Number(limpio);
  return Number.isFinite(n) && n > 0 ? n : null;
}

const formatoPesos = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

export function EditorSmmlv({ salarios, onListo }: Props) {
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [texto, setTexto] = useState('');
  const [guardando, setGuardando] = useState(false);

  const valor = useMemo(() => aNumero(texto), [texto]);
  const existente = salarios.find((s) => s.anio === anio) ?? null;

  const guardar = async () => {
    if (valor === null) return;
    setGuardando(true);
    try {
      await contratacionService.guardarSmmlv(anio, valor);
      toast.success(`Salario mínimo de ${anio} registrado`);
      await onListo();
    } catch (err: any) {
      toast.error('No se pudo guardar el salario', { description: err.message });
    } finally {
      setGuardando(false);
    }
  };

  const campo =
    'w-full px-3 py-2 text-sm rounded-lg border border-gray-300 tabular-nums focus:outline-none focus:border-[#003DA5] focus:ring-2 focus:ring-[#003DA5]/20';

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="smmlv-anio" className="block text-xs font-bold text-gray-600 mb-1.5">
          Año
        </label>
        <input
          id="smmlv-anio"
          type="number"
          value={anio}
          onChange={(e) => setAnio(Number(e.target.value))}
          className={campo}
        />
      </div>

      <div>
        <label htmlFor="smmlv-valor" className="block text-xs font-bold text-gray-600 mb-1.5">
          Salario mínimo mensual
        </label>
        <input
          id="smmlv-valor"
          type="text"
          inputMode="numeric"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={existente ? existente.valor.toString() : '1623500'}
          className={campo}
        />
        <p className="text-[11px] text-gray-500 mt-1.5 mb-0 leading-relaxed">
          {valor !== null ? `${formatoPesos.format(valor)} · ` : ''}
          {/* Se dice el efecto porque no es evidente: un número aquí mueve
              todos los umbrales expresados en salarios. */}
          Recalcula todos los umbrales en SMMLV de ese año.
        </p>
      </div>

      {existente && (
        <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 m-0 leading-relaxed">
          Ya hay un valor para {anio}: {formatoPesos.format(existente.valor)}. Guardar lo reemplaza.
        </p>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={guardar}
          disabled={valor === null || guardando}
          className="px-3.5 py-2 text-xs font-extrabold rounded-lg text-white bg-[#003DA5] hover:bg-[#002e7d] shadow-sm active:scale-95 disabled:opacity-50 transition-all"
        >
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </div>
  );
}
