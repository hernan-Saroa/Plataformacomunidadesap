import { createContext, useContext, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { ModalConfirmacion } from './ModalConfirmacion';

type Borradores = Map<string, { pendiente: boolean; ocupado: boolean }>;
const Contexto = createContext<Borradores | null>(null);
export function useHayBorradoresGrupo() {
  const contexto = useContext(Contexto);
  return () => [...(contexto?.values() ?? [])].some(e => e.pendiente || e.ocupado);
}
export function useBorradorGrupo(pendiente: boolean, ocupado = false) {
  const contexto = useContext(Contexto), id = useId();
  useLayoutEffect(() => {
    contexto?.set(id, { pendiente, ocupado });
    return () => { contexto?.delete(id); };
  }, [contexto, id, pendiente, ocupado]);
}

/** Portal fuera de los ancestros animados del shell; encabezado y cierre fijos. */
export function PanelGrupos({ titulo, onCerrar, children }: { titulo: string; onCerrar: () => void; children: ReactNode }) {
  const id = useId(), panel = useRef<HTMLElement>(null), cierre = useRef<HTMLButtonElement>(null);
  const borradores = useRef<Borradores>(new Map());
  const [confirmar, setConfirmar] = useState(false);
  const [aviso, setAviso] = useState('');
  const cerrarActual = useRef(onCerrar); cerrarActual.current = onCerrar;
  const solicitarCierre = useRef(() => {});
  solicitarCierre.current = () => {
    const estados = [...borradores.current.values()];
    if (estados.some(e => e.ocupado)) { setAviso('Espera a que termine el guardado para cerrar.'); return; }
    if (estados.some(e => e.pendiente)) setConfirmar(true);
    else cerrarActual.current();
  };
  useLayoutEffect(() => {
    const previo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; cierre.current?.focus();
    const teclado = (e: KeyboardEvent) => {
      const dialogos = document.querySelectorAll('[role="dialog"], [role="alertdialog"]');
      if (dialogos[dialogos.length - 1] !== panel.current) return;
      if (e.key === 'Escape') { e.preventDefault(); solicitarCierre.current(); }
      if (e.key !== 'Tab') return;
      const controles = [...(panel.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex="0"]') ?? [])].filter(e => e.getClientRects().length > 0);
      const primero = controles[0], ultimo = controles.at(-1);
      if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo?.focus(); }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero?.focus(); }
    };
    document.addEventListener('keydown', teclado);
    return () => { document.removeEventListener('keydown', teclado); document.body.style.overflow = overflow; previo?.focus(); };
  }, []);
  return createPortal(<Contexto.Provider value={borradores.current}>
    <div className="fixed inset-0 flex items-center justify-center bg-slate-900/60 p-2 sm:p-4" style={{ zIndex: 900, background: 'rgba(15,23,42,.6)' }} onMouseDown={e => { if (e.target === e.currentTarget) solicitarCierre.current(); }}>
      <section ref={panel} role="dialog" aria-modal="true" aria-labelledby={id} className="flex w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl" style={{ width: 'min(1440px, 100%)', maxWidth: '100%', maxHeight: 'calc(100dvh - 16px)', minHeight: 0 }}>
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <h2 id={id} className="min-w-0 break-words font-bold text-[#003DA5]">{titulo}</h2>
          <button ref={cierre} type="button" aria-label="Cerrar panel de grupos" onClick={() => solicitarCierre.current()} className="shrink-0 rounded-lg border p-2 text-slate-600"><X className="h-5 w-5" /></button>
        </header>
        <div className="min-h-0 min-w-0 overflow-y-auto overscroll-contain">{children}</div>
        <footer className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t px-4 py-3">
          {aviso && <p role="status" className="text-sm text-amber-800">{aviso}</p>}
          <button type="button" onClick={() => solicitarCierre.current()} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700">Cerrar</button>
        </footer>
      </section>
    </div>
    {confirmar && <ModalConfirmacion titulo="¿Descartar los cambios sin guardar?" advertencia="Los cambios pendientes se perderán. Los datos ya guardados se conservan." onCancelar={() => setConfirmar(false)} onConfirmar={onCerrar}><p>Hay información sin guardar en el grupo o en su horario.</p></ModalConfirmacion>}
  </Contexto.Provider>, document.body);
}
