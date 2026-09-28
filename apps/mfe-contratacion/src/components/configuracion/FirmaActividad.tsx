import React, { useEffect, useState } from 'react';
import { Check, KeySquare } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';

interface Props {
  numeral: string;
}

/**
 * Si la actividad exige que quien la trabaja la firme con el token
 * institucional antes de darse por terminada.
 *
 * Sin buscador de aprobadores: a diferencia de la aprobación, que la da otra
 * persona, la firma la pone quien registra la actividad —es su manera de
 * responder por lo que entregó—, así que aquí solo hay una decisión que
 * tomar, no a quién elegir.
 *
 * Aquí solo se guarda la regla `EXIGE_FIRMA`; quien la hace cumplir es
 * `useFirma`, que envuelve la acción del panel y pide el token antes de
 * dejarla ejecutar.
 */
export function FirmaActividad({ numeral }: Props) {
  const [requiere, setRequiere] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const leer = () => {
    setCargando(true);
    contratacionService
      .firmaDeActividad(numeral)
      .then((r) => {
        setRequiere(r.requiereFirma);
        setError(null);
      })
      .catch((e: any) => setError(e.message))
      .finally(() => setCargando(false));
  };

  useEffect(leer, [numeral]);

  const guardar = async (nuevoRequiere: boolean) => {
    setGuardando(true);
    try {
      await contratacionService.guardarFirmaDeActividad(numeral, { requiereFirma: nuevoRequiere });
      setRequiere(nuevoRequiere);
      toast.success(
        nuevoRequiere ? 'La actividad requiere firma' : 'La actividad ya no requiere firma',
      );
    } catch (e: any) {
      toast.error(e.message ?? 'No se pudo guardar');
      leer();
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return <p className="text-xs text-slate-400 m-0">Cargando la configuración…</p>;
  }

  if (error) {
    return <p className="text-xs text-red-600 m-0">{error}</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-600 m-0 leading-relaxed">
        Si esta actividad necesita que quien la registra la firme con el token que llega al
        correo institucional antes de darse por terminada. Los procesos ya cerrados no cambian:
        lo que se configure aquí rige de ahora en adelante.
      </p>

      <div className="space-y-2">
        <Opcion
          marcada={!requiere}
          disabled={guardando}
          onClick={() => guardar(false)}
          titulo="No requiere firma"
          ayuda="El gestor la cierra sin más trámite."
        />
        <Opcion
          marcada={requiere}
          disabled={guardando}
          onClick={() => requiere || guardar(true)}
          titulo="Requiere firma con el token institucional"
        />
      </div>

      {requiere && (
        <p className="ml-6 flex items-start gap-2 text-[11px] text-slate-500 leading-relaxed">
          <KeySquare className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" aria-hidden="true" />
          Al ejecutar la acción se pide el token que llega al correo institucional; sin firmarlo
          la actividad no avanza.
        </p>
      )}
    </div>
  );
}

/** Una de las dos opciones excluyentes, con su explicación debajo. */
const Opcion = ({
  marcada,
  disabled,
  onClick,
  titulo,
  ayuda,
}: {
  marcada: boolean;
  disabled?: boolean;
  onClick: () => void;
  titulo: string;
  ayuda?: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-pressed={marcada}
    className={`w-full text-left flex items-start gap-2.5 rounded-lg border px-3 py-2.5 transition-colors
      disabled:opacity-50 ${
        marcada
          ? 'border-blue-200 bg-blue-50'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
  >
    <span
      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
        marcada ? 'border-[#003DA5] bg-[#003DA5]' : 'border-gray-300'
      }`}
    >
      {marcada && <Check className="w-2.5 h-2.5 text-white" strokeWidth={4} />}
    </span>
    <span className="min-w-0">
      <span className="block text-sm font-bold text-slate-800">{titulo}</span>
      {ayuda && <span className="block text-[11px] text-slate-500 mt-0.5">{ayuda}</span>}
    </span>
  </button>
);
