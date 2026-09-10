import React, { createContext, useContext } from 'react';
import { Lock } from 'lucide-react';

/**
 * Por qué la actividad abierta se puede mirar pero no trabajar (EFDS-1183).
 *
 * La secuencia sigue siendo la misma —la 3.2 continúa lo que la 3.1 dejó— pero
 * lo que protege es el expediente, no la pantalla: lo que no puede ocurrir es
 * que se cargue un documento en la 4.1 antes de que la 3.6 esté cerrada. Que el
 * gestor **lea** lo que viene después no rompe nada, y en cambio le dice qué le
 * van a pedir y con qué formatos: cerrarle el riel lo dejaba adivinando.
 *
 * Por eso el bloqueo dejó de estar en el botón del riel y pasó a estar aquí,
 * envolviendo la actividad: se entra, se lee, y las piezas que escriben —los
 * botones de `PiezasPanel` y las cargas de documentos— se apagan solas mientras
 * el contexto traiga motivo.
 *
 * Va por contexto y no por prop porque son treinta y ocho paneles: pasarles a
 * todos un `soloLectura` obligaría a tocarlos uno por uno, y el que se olvidara
 * seguiría escribiendo sin que nada lo delatara.
 *
 * `null` es lo normal: la actividad se puede trabajar.
 */
const ContextoSoloLectura = createContext<string | null>(null);

export function SoloLectura({
  motivo,
  children,
}: {
  /** Qué falta antes de poder escribir aquí, o null si ya se puede. */
  motivo: string | null;
  children: React.ReactNode;
}) {
  return (
    <ContextoSoloLectura.Provider value={motivo}>{children}</ContextoSoloLectura.Provider>
  );
}

/** El motivo del bloqueo, o `null` cuando la actividad se puede trabajar. */
export const useSoloLectura = () => useContext(ContextoSoloLectura);

/**
 * El aviso que lo explica, bajo el encabezado de la actividad.
 *
 * Un panel con todos los botones apagados y sin una línea que lo explique se
 * lee como una pantalla rota. Decir cuál es la actividad que falta convierte el
 * candado en una instrucción, que es lo que el riel ya hacía en su renglón.
 */
export const AvisoSoloLectura = ({ motivo }: { motivo: string }) => (
  <div className="px-4 py-2.5 bg-slate-50 border-b border-gray-100 flex items-start gap-2.5">
    <Lock className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" aria-hidden="true" />
    <div className="min-w-0">
      <p className="text-[12px] font-bold text-slate-700 m-0">
        Puedes consultarla, pero todavía no trabajarla
      </p>
      <p className="text-[11.5px] text-slate-600 m-0 mt-0.5 leading-relaxed">
        {motivo}. Hasta entonces esta actividad no admite cargar documentos ni registrar nada.
      </p>
    </div>
  </div>
);
