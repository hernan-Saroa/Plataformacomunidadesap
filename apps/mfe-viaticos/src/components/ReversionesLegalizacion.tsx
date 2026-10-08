import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, RotateCcw } from 'lucide-react';
import { ItemReversionPendiente, legalizacionService } from '../services/api/legalizacionService';
import { formatearFechaLimite, formatearPesos } from './LegalizacionComisionado';

/**
 * EFDS-1310 — Bandeja de quien aprueba las reversiones de revisiones aprobadas
 * (permiso travel_expenses:legalizations.revert_approval). El servidor no le
 * muestra sus propias solicitudes ni le deja resolverlas.
 *
 * Aprobar deshace la aprobación de la revisión y la exportación a SIIF; la
 * legalización vuelve a revisión. Rechazar exige una observación.
 */
export default function ReversionesLegalizacion() {
  const [items, setItems] = useState<ItemReversionPendiente[] | null>(null);
  const [rechazando, setRechazando] = useState<{ id: string; observacion: string } | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      setItems(await legalizacionService.reversionesPendientes());
    } catch (e: any) {
      setError(e?.message || 'No fue posible cargar las solicitudes de reversión.');
      setItems([]);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const resolver = async (item: ItemReversionPendiente, decision: 'APROBAR' | 'RECHAZAR', observacion?: string) => {
    setTrabajando(true);
    setError(null);
    setAviso(null);
    try {
      await legalizacionService.resolverReversion(item.id, decision, observacion);
      setRechazando(null);
      setAviso(
        decision === 'APROBAR'
          ? `Reversión aprobada: la legalización de ${item.consecutivoUnico} vuelve a revisión.`
          : `Reversión rechazada: la revisión de ${item.consecutivoUnico} sigue aprobada.`,
      );
      await cargar();
    } catch (e: any) {
      setError(e?.message || 'No fue posible resolver la solicitud.');
    } finally {
      setTrabajando(false);
    }
  };

  if (items === null) {
    return <div className="flex items-center justify-center p-10 text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  }

  return (
    <div className="space-y-3">
      <div>
        <h3 className="flex items-center gap-2 text-base font-black text-slate-900">
          <RotateCcw className="h-4 w-4 text-amber-600" /> Reversiones de revisión por aprobar
        </h3>
        <p className="text-xs text-slate-500">
          Solicitudes de analistas para revertir una revisión ya aprobada, antes del registro en SIIF.
        </p>
      </div>
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</div>}
      {aviso && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">{aviso}</div>}
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">No hay solicitudes de reversión pendientes.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((it) => (
            <li key={it.id} className="space-y-2 rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-bold text-slate-900">{it.consecutivoUnico} · {it.comisionadoNombre}</p>
                <p className="text-[11px] text-slate-500">Solicitada el {formatearFechaLimite(it.solicitadaEn)}</p>
              </div>
              <p className="text-xs text-slate-700">Motivo: {it.motivo}</p>
              <p className="text-[11px] text-slate-500">
                Valor pagado {formatearPesos(it.valorPagado)}
                {it.siifExportadoEn ? ' · ya se exportó el CSV para SIIF (se descarta)' : ''}
              </p>
              {rechazando?.id === it.id ? (
                <div className="space-y-2">
                  <label className="block text-xs text-slate-700">Observación del rechazo
                    <textarea value={rechazando.observacion} rows={2} maxLength={500}
                      onChange={(e) => setRechazando({ id: it.id, observacion: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs" />
                  </label>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setRechazando(null)}
                      className="rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100">Cancelar</button>
                    <button type="button" disabled={trabajando || rechazando.observacion.trim().length < 10}
                      onClick={() => void resolver(it, 'RECHAZAR', rechazando.observacion.trim())}
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white disabled:bg-slate-300">
                      Confirmar rechazo
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-end gap-2">
                  <button type="button" disabled={trabajando} onClick={() => setRechazando({ id: it.id, observacion: '' })}
                    aria-label={`Rechazar reversión de ${it.consecutivoUnico}`}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50">
                    Rechazar
                  </button>
                  <button type="button" disabled={trabajando} onClick={() => void resolver(it, 'APROBAR')}
                    aria-label={`Aprobar reversión de ${it.consecutivoUnico}`}
                    className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white disabled:bg-slate-300">
                    Aprobar reversión
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
