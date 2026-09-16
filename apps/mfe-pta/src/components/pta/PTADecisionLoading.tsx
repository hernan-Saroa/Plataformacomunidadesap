import * as Dialog from '@radix-ui/react-dialog@1.1.6';
import { Loader2, ShieldCheck } from 'lucide-react';

/** Bloquea clics y navegación por teclado mientras se prepara una decisión. */
export function PTADecisionLoading({ firma = true }: { firma?: boolean }) {
  return (
    <Dialog.Root open>
      <Dialog.Portal>
        <Dialog.Overlay style={{ position: 'fixed', inset: 0, zIndex: 2147483646, background: 'rgba(15, 23, 42, 0.35)', backdropFilter: 'blur(3px)' }} />
        <Dialog.Content
          onEscapeKeyDown={event => event.preventDefault()}
          onInteractOutside={event => event.preventDefault()}
          onCloseAutoFocus={event => event.preventDefault()}
          style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 2147483647,
            width: 'min(400px, calc(100vw - 32px))', padding: 28, borderRadius: 18, background: 'white',
            border: '1px solid #DBEAFE', boxShadow: '0 24px 64px rgba(15, 23, 42, 0.2)', textAlign: 'center', outline: 'none' }}
        >
          <div style={{ width: 52, height: 52, borderRadius: 16, display: 'grid', placeItems: 'center', margin: '0 auto 16px', background: '#EFF6FF', color: '#003DA5' }}>
            <ShieldCheck size={26} aria-hidden="true" />
          </div>
          <Dialog.Title style={{ margin: '0 0 10px', fontSize: 18, fontWeight: 750, color: '#0F172A' }}>
            {firma ? 'Preparando autenticación' : 'Procesando decisión'}
          </Dialog.Title>
          <Dialog.Description style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: '#64748B' }}>
            {firma ? 'Estamos preparando tu código de verificación. El formulario se abrirá automáticamente.' : 'Estamos verificando y guardando tu decisión.'}
          </Dialog.Description>
          <div role="status" aria-live="polite" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20, fontSize: 13, fontWeight: 600, color: '#003DA5' }}>
            <Loader2 size={18} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
            Un momento, por favor…
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
