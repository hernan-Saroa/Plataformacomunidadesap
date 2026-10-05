import React, { createContext, useContext } from 'react';
import { ClipboardCheck } from 'lucide-react';

/**
 * Dónde se está pintando el panel de una actividad: en la pantalla de
 * revisión o en el trabajo del proceso.
 *
 * Aprobar, devolver, ratificar o avalar se hace **solo en la revisión**. Los
 * paneles que deciden dentro de sí —la modalidad, cada póliza, cada
 * modificación, cada cuenta de cobro— lo preguntan aquí: en la revisión
 * enseñan sus botones de decidir, y en el trabajo llevan a la revisión.
 *
 * Va por contexto, como `SoloLectura`, para no pasar la prop por
 * `PanelDeLaActividad` hasta cada panel.
 */
interface Lugar {
  enLaRevision: boolean;
  /** Abre la revisión de esa actividad; solo existe en el trabajo del proceso. */
  abrirRevision?: (numeral: string) => void;
}

const ContextoLugar = createContext<Lugar>({ enLaRevision: false });

export function LugarDeDecision({
  enLaRevision = false,
  abrirRevision,
  children,
}: Partial<Lugar> & { children: React.ReactNode }) {
  return (
    <ContextoLugar.Provider value={{ enLaRevision, abrirRevision }}>{children}</ContextoLugar.Provider>
  );
}

export const useLugarDeDecision = () => useContext(ContextoLugar);

/**
 * Lo que ve, fuera de la revisión, quien tiene que decidir: a dónde ir.
 *
 * Sin esto el panel le quitaba los botones sin decirle por qué, y se leía
 * como que ya no le tocaba.
 */
export function IrALaRevision({ numeral, que = 'decidir' }: { numeral: string; que?: string }) {
  const { abrirRevision } = useLugarDeDecision();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <p className="text-[11.5px] text-slate-600 m-0">
        Te toca {que} en la pantalla de revisión.
      </p>
      {abrirRevision ? (
        <button
          type="button"
          onClick={() => abrirRevision(numeral)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-bold rounded-md
            bg-[#003DA5] text-white hover:bg-[#00307f] transition-all"
        >
          <ClipboardCheck className="w-3.5 h-3.5" aria-hidden="true" />
          Abrir la revisión
        </button>
      ) : null}
    </div>
  );
}
