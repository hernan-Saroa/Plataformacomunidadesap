import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { activarPeriodoExtraordinario } from '../services/api/periodoExtraordinarioApi';

export function ActivarExtraordinarioModal({ periodo, principal, retornarFoco, onCerrar, onActivado }: {
  periodo: { id: string; codigo: string }; principal?: { codigo: string };
  retornarFoco: HTMLElement; onCerrar: () => void; onActivado: () => void;
}) {
  const [motivo, setMotivo] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const confirmar = async () => {
    if (guardando || motivo.trim().length < 10) return;
    setGuardando(true); setError('');
    try { await activarPeriodoExtraordinario(String(periodo.id), motivo.trim()); onActivado(); }
    catch (e: any) { setError(e.message || 'No se pudo activar el periodo extraordinario.'); }
    finally { setGuardando(false); }
  };
  return <Dialog.Root open onOpenChange={open => { if (!open && !guardando) onCerrar(); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0" style={{ zIndex: 1000, backgroundColor: 'rgba(15,23,42,.6)' }} />
      <Dialog.Content className="fixed rounded-2xl bg-white border border-gray-200 shadow-2xl p-6 space-y-4" style={{ zIndex: 1001, left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: 'min(32rem, calc(100vw - 2rem))', maxHeight: '90vh', overflowY: 'auto' }}
        onEscapeKeyDown={e => { if (guardando) e.preventDefault(); }} onPointerDownOutside={e => { if (guardando) e.preventDefault(); }}
        onCloseAutoFocus={e => { e.preventDefault(); retornarFoco.focus(); }}>
        <Dialog.Title className="font-bold text-lg text-gray-900">Activar como extraordinario · {periodo.codigo}</Dialog.Title>
        <Dialog.Description className="text-sm text-gray-600">Este periodo quedará en curso como extraordinario junto al periodo principal.</Dialog.Description>
        <div role="note" className="border border-amber-300 bg-amber-50 text-amber-900 rounded-xl p-4 text-sm">
          <strong>No cierra el periodo principal{principal ? ` ${principal.codigo}` : ''}.</strong> No mueve otros periodos ni termina sus PTA.
        </div>
        <label className="block text-sm font-semibold text-gray-700">Motivo obligatorio (mínimo 10 caracteres)
          <textarea autoFocus value={motivo} disabled={guardando} onChange={e => setMotivo(e.target.value)} rows={4} minLength={10} required className="block w-full border border-gray-300 rounded-xl p-3 mt-2 font-normal" />
        </label>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-3">
          <Dialog.Close asChild><button type="button" disabled={guardando} className="border rounded-xl px-4 py-2 text-sm font-bold">Cancelar</button></Dialog.Close>
          <button type="button" disabled={guardando || motivo.trim().length < 10} onClick={confirmar} className="rounded-xl px-4 py-2 text-sm font-bold text-white disabled:opacity-50" style={{ backgroundColor: '#003DA5' }}>{guardando ? 'Activando…' : 'Confirmar activación extraordinaria'}</button>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
