import React, { useState } from 'react';
import { AlertTriangle, Check } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { ParametroMipyme } from '../../types';
import { campo } from '../shared/PiezasPanel';

interface Props {
  parametro: ParametroMipyme;
  onListo: () => void | Promise<void>;
}

/**
 * Cambia una de las dos condiciones de la limitación (EFDS-1393).
 *
 * Pide el fundamento junto con la cifra por lo mismo que los plazos: un número
 * sin respaldo no se puede defender ante un ente de control, y dentro de un año
 * nadie recordará si vino del decreto o de un supuesto del equipo.
 */
export function EditorCondicionMipyme({ parametro, onListo }: Props) {
  const esMinimo = parametro.clave === 'MINIMO_MANIFESTACIONES';

  const [valor, setValor] = useState(String(parametro.valor));
  const [unidad, setUnidad] = useState<'SMMLV' | 'PESOS'>(parametro.unidad ?? 'SMMLV');
  const [fundamento, setFundamento] = useState(parametro.fundamento ?? '');
  const [confirmado, setConfirmado] = useState(parametro.confirmado);
  const [guardando, setGuardando] = useState(false);

  const numero = Number(valor);
  // El mínimo cuenta empresas: media manifestación no significa nada.
  const valido =
    numero > 0 && Number.isFinite(numero) && (!esMinimo || Number.isInteger(numero));

  const guardar = async () => {
    setGuardando(true);
    try {
      await contratacionService.guardarCondicionMipyme(parametro.clave, {
        valor: numero,
        unidad: esMinimo ? undefined : unidad,
        fundamento: fundamento.trim() || undefined,
        confirmado,
      });
      toast.success('Condición actualizada');
      await onListo();
    } catch (err: any) {
      toast.error('No se pudo guardar la condición', { description: err.message });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className={esMinimo ? '' : 'grid grid-cols-2 gap-3'}>
        <label className="block">
          <span className="block text-xs font-bold text-slate-600 mb-1">
            {esMinimo ? 'Manifestaciones requeridas' : 'Tope de valor'}
          </span>
          <input
            value={valor}
            onChange={(e) =>
              setValor(
                esMinimo
                  ? e.target.value.replace(/[^\d]/g, '')
                  : e.target.value.replace(/[^\d.]/g, ''),
              )
            }
            inputMode="numeric"
            aria-label={esMinimo ? 'Mínimo de manifestaciones' : 'Tope de valor del proceso'}
            className={`${campo} tabular-nums`}
          />
          <span className="block text-xs text-slate-500 mt-1 leading-relaxed">
            {esMinimo
              ? 'MIPYME distintas que deben haber manifestado interés. Se cuentan por identificación, no por manifestación.'
              : 'Un proceso que supere este valor no puede limitarse, por muchas manifestaciones que reciba.'}
          </span>
        </label>

        {!esMinimo && (
          <label className="block">
            <span className="block text-xs font-bold text-slate-600 mb-1">Unidad</span>
            <select
              value={unidad}
              onChange={(e) => setUnidad(e.target.value as 'SMMLV' | 'PESOS')}
              aria-label="Unidad del tope"
              className={campo}
            >
              <option value="SMMLV">SMMLV</option>
              <option value="PESOS">Pesos</option>
            </select>
            <span className="block text-xs text-slate-500 mt-1 leading-relaxed">
              En SMMLV el tope se recalcula solo cada año al cargar el salario nuevo.
            </span>
          </label>
        )}
      </div>

      <label className="block">
        <span className="block text-xs font-bold text-slate-600 mb-1">Fundamento</span>
        <input
          value={fundamento}
          onChange={(e) => setFundamento(e.target.value)}
          placeholder="Decreto 1082 de 2015, art. 2.2.1.2.4.2.2"
          aria-label="Norma o acta que respalda la cifra"
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
          <span className="block text-xs text-slate-500 leading-relaxed">
            Mientras no se marque, la evaluación de cada proceso avisa de que el cálculo corre
            sobre parámetros provisionales.
          </span>
        </span>
      </label>

      {/* Cambiar la cifra no reescribe lo ya resuelto: cada decisión guardó los
          parámetros con los que se evaluó. Decirlo evita que nadie tema
          tocarla. */}
      <p className="text-xs text-slate-500 m-0 flex items-start gap-1.5 leading-relaxed">
        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
        Aplica a los procesos que se evalúen desde ahora. Las decisiones ya tomadas conservan las
        condiciones con las que se resolvieron.
      </p>

      <button
        type="button"
        disabled={guardando || !valido}
        onClick={guardar}
        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-extrabold rounded-md text-white bg-[#003DA5] hover:bg-[#002e7d] shadow-sm active:scale-95 disabled:opacity-50 transition-all"
      >
        <Check className="w-3.5 h-3.5" strokeWidth={3} />
        Guardar condición
      </button>
    </div>
  );
}
