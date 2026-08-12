import React, { useState } from 'react';
import { AlertTriangle, Check } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { ModalidadConPlazo } from '../../types';

interface Props {
  modalidad: ModalidadConPlazo;
  onListo: () => void | Promise<void>;
}

const campo =
  'w-full px-2.5 py-1.5 text-[12.5px] rounded-md border border-gray-300 bg-white focus:outline-none focus:border-[#003DA5] focus:ring-2 focus:ring-[#003DA5]/20';

/**
 * Fija el plazo de publicidad de una modalidad (EFDS-1387).
 *
 * Pide el fundamento junto con la cifra porque un plazo sin respaldo no se
 * puede defender ante un ente de control, y porque dentro de un año nadie
 * recordará si el número vino del decreto o de un supuesto del equipo.
 */
export function EditorPlazo({ modalidad, onListo }: Props) {
  const [dias, setDias] = useState(String(modalidad.plazo?.diasHabiles ?? ''));
  const [fundamento, setFundamento] = useState(modalidad.plazo?.fundamento ?? '');
  const [confirmado, setConfirmado] = useState(modalidad.plazo?.confirmado ?? false);
  const [guardando, setGuardando] = useState(false);

  const numero = Number(dias);
  const valido = Number.isInteger(numero) && numero >= 1 && numero <= 365;

  const guardar = async () => {
    setGuardando(true);
    try {
      await contratacionService.guardarPlazoPublicacion(modalidad.modalidad, {
        diasHabiles: numero,
        fundamento: fundamento.trim() || undefined,
        confirmado,
      });
      toast.success(`Plazo de ${modalidad.nombre} actualizado`);
      await onListo();
    } catch (err: any) {
      toast.error('No se pudo guardar el plazo', { description: err.message });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="block text-xs font-bold text-slate-600 mb-1">Días hábiles</span>
        <input
          value={dias}
          onChange={(e) => setDias(e.target.value.replace(/[^\d]/g, ''))}
          inputMode="numeric"
          placeholder="10"
          aria-label="Días hábiles de publicidad"
          className={`${campo} tabular-nums`}
        />
        <span className="block text-[11px] text-slate-500 mt-1 leading-relaxed">
          Se cuentan desde el día siguiente a la publicación, sin fines de semana ni festivos.
        </span>
      </label>

      <label className="block">
        <span className="block text-xs font-bold text-slate-600 mb-1">Fundamento</span>
        <input
          value={fundamento}
          onChange={(e) => setFundamento(e.target.value)}
          placeholder="Decreto 1082 de 2015, art. 2.2.1.1.2.1.4"
          aria-label="Norma o acta que respalda el plazo"
          className={campo}
        />
      </label>

      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={confirmado}
          onChange={(e) => setConfirmado(e.target.checked)}
          className="mt-0.5"
        />
        <span className="min-w-0">
          <span className="block text-xs font-bold text-slate-700">
            Confirmado por la Dirección de Contratación
          </span>
          <span className="block text-[11px] text-slate-500 leading-relaxed">
            Mientras no se marque, la pantalla del proceso avisa de que el plazo es provisional.
          </span>
        </span>
      </label>

      {/* El cambio no reescribe la historia: cada publicación ya guardó el
          plazo que le aplicó. Decirlo evita que nadie tema tocar la cifra. */}
      <p className="text-[11px] text-slate-500 m-0 flex items-start gap-1.5 leading-relaxed">
        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
        Aplica a las publicaciones que se registren desde ahora. Las ya registradas conservan el
        plazo con el que se calculó su vencimiento.
      </p>

      <button
        type="button"
        disabled={guardando || !valido}
        onClick={guardar}
        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[11.5px] font-extrabold rounded-md text-white bg-[#003DA5] hover:bg-[#002e7d] shadow-sm active:scale-95 disabled:opacity-50 transition-all"
      >
        <Check className="w-3.5 h-3.5" strokeWidth={3} />
        Guardar plazo
      </button>
    </div>
  );
}
