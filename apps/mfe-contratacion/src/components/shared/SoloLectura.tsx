import React, { createContext, useContext, useEffect, useRef } from 'react';
import { Eye, Lock } from 'lucide-react';

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
 * Quien mira solo tiene permiso de ver la actividad: ni editar, ni aprobar, ni decidir.
 *
 * Es distinto del bloqueo de arriba. Aquel es de la secuencia —todavía no le
 * toca a la actividad— y apaga los botones para que se vea qué vendrá. Este es
 * del rol: nunca le va a tocar, así que las opciones de modificar no se
 * muestran. Antes se veían, se llenaban los datos y al guardar llegaba «no
 * tienes permiso»: el trabajo se perdía después de hacerlo.
 *
 * Las piezas compartidas que escriben —`Boton`, `BotonSecundario`,
 * `SelectorArchivo`— se esconden solas, y los campos quedan de solo lectura
 * (ver `CamposDeSoloVer`).
 */
const ContextoSoloVer = createContext(false);

export function SoloVer({ activo, children }: { activo: boolean; children: React.ReactNode }) {
  return <ContextoSoloVer.Provider value={activo}>{children}</ContextoSoloVer.Provider>;
}

export const useSoloVer = () => useContext(ContextoSoloVer);

/**
 * Lo que escribe y no pasa por las piezas compartidas —un «Anular» suelto—,
 * escondido para quien solo puede ver. Va como envoltorio y no como hook para
 * no tocar el orden de los hooks de cada panel.
 */
export function SiPuedeEditar({ children }: { children: React.ReactNode }) {
  return useSoloVer() ? null : <>{children}</>;
}

/**
 * Los campos de un panel de solo ver, sin poder escribir en ellos.
 *
 * Se ven —muestran lo que ya se diligenció, que es lo que quien consulta vino
 * a leer— pero no se pueden llenar. Se hace sobre el DOM, y no campo por campo,
 * porque son cientos de `input` repartidos en treinta y ocho paneles; el
 * observador vuelve a apagarlos si un panel se repinta o abre otro formulario.
 */
export function CamposDeSoloVer({ activo, children }: { activo: boolean; children: React.ReactNode }) {
  const marco = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const raiz = marco.current;
    if (!activo || !raiz) return;
    const apagar = () => {
      raiz.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
        'input:not([type="hidden"]), textarea, select',
      ).forEach((campo) => {
        if (campo.dataset.soloVer === '1' && campo.disabled) return;
        campo.dataset.soloVer = '1';
        campo.disabled = true;
      });
    };
    apagar();
    const observador = new MutationObserver(apagar);
    observador.observe(raiz, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled'] });
    return () => observador.disconnect();
  }, [activo]);

  return (
    <div ref={marco} className={activo ? 'solo-ver' : undefined}>
      {children}
    </div>
  );
}

/** El aviso de solo ver, bajo el encabezado de la actividad. */
export const AvisoSoloVer = ({ decideEnLaRevision = false }: { decideEnLaRevision?: boolean }) => (
  <div className="px-4 py-2.5 bg-slate-50 border-b border-gray-100 flex items-start gap-2.5">
    <Eye className="w-3.5 h-3.5 text-slate-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
    <div className="min-w-0">
      <p className="text-[12px] font-bold text-slate-700 m-0">Solo puedes ver esta actividad</p>
      <p className="text-[11.5px] text-slate-600 m-0 mt-0.5 leading-relaxed">
        {decideEnLaRevision
          ? 'Tu rol la aprueba o la decide, pero no la diligencia: por eso aquí no ves las opciones para cargar, registrar o modificar. Cuando te toque, la resuelves desde la revisión (bandeja «Por revisar»).'
          : 'Tu rol tiene permiso para consultarla, pero no para editarla: por eso no ves las opciones para cargar, registrar o modificar. Si deberías poder hacerlo, pide el permiso a quien administra Contratación.'}
      </p>
    </div>
  </div>
);

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
