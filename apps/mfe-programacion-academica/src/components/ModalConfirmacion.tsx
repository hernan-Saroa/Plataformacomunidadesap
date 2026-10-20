import { useId, useLayoutEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';

interface Props {
  titulo: string;
  children: ReactNode;
  advertencia: ReactNode;
  onCancelar: () => void;
  onConfirmar: () => void;
  ocupado?: boolean;
  retornarFoco?: HTMLElement | null;
}

/** Confirmación común de Programación Académica, con foco contenido y restaurado. */
export function ModalConfirmacion({ titulo, children, advertencia, onCancelar, onConfirmar, ocupado = false, retornarFoco }: Props) {
  const tituloId = useId();
  const contenidoId = useId();
  const panel = useRef<HTMLElement>(null);
  const cancelar = useRef<HTMLButtonElement>(null);
  const retorno = useRef<HTMLElement | null>(null);
  const cancelarActual = useRef(onCancelar);
  const ocupadoActual = useRef(ocupado);
  cancelarActual.current = onCancelar;
  ocupadoActual.current = ocupado;

  useLayoutEffect(() => {
    retorno.current = retornarFoco ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    cancelar.current?.focus();
    const alTeclado = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !ocupadoActual.current) { e.preventDefault(); cancelarActual.current(); return; }
      if (e.key !== 'Tab') return;
      const elementos = Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? []);
      if (!elementos.length) { e.preventDefault(); return; }
      const primero = elementos[0];
      const ultimo = elementos[elementos.length - 1];
      if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
    };
    document.addEventListener('keydown', alTeclado);
    return () => { document.removeEventListener('keydown', alTeclado); retorno.current?.focus(); };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-[2px]" onMouseDown={(e) => { if (e.target === e.currentTarget && !ocupado) onCancelar(); }}>
      <section ref={panel} role="alertdialog" aria-modal="true" aria-labelledby={tituloId} aria-describedby={contenidoId}
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="h-1.5 bg-[#003DA5]" />
        <div className="space-y-5 p-6 sm:p-8">
          <h2 id={tituloId} className="text-xl font-extrabold text-slate-900">{titulo}</h2>
          <div id={contenidoId} className="space-y-3 text-sm leading-6 text-slate-700">{children}</div>
          <div className="flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950" role="note">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
            <div className="min-w-0 whitespace-pre-wrap break-words">{advertencia}</div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button ref={cancelar} type="button" onClick={onCancelar} disabled={ocupado}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-[#003DA5] disabled:opacity-50">Cancelar</button>
            <button type="button" onClick={onConfirmar} disabled={ocupado}
              className="rounded-lg bg-[#003DA5] px-4 py-2 text-sm font-bold text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#003DA5] disabled:opacity-50">{ocupado ? 'Procesando…' : 'Confirmar'}</button>
          </div>
        </div>
      </section>
    </div>, document.body,
  );
}
