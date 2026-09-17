import { useCallback, useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import { certificadosService } from '../../services/api/certificados.service';
import { useCorrectionAutoRefresh } from '../hooks/useCorrectionAutoRefresh';

/** Mounted only for users allowed to manage correction requests. */
export function CorrectionsButton({ onClick }: { onClick: () => void }) {
  const [count, setCount] = useState<number | null>(null);
  const [syncFailed, setSyncFailed] = useState(false);
  const refresh = useCallback(async (isCurrent: () => boolean) => {
    try {
      const stats = await certificadosService.correcciones.estadisticas({ silent: true });
      if (!isCurrent()) return;
      setCount(stats.pending + stats.in_review);
      setSyncFailed(false);
    } catch {
      if (isCurrent()) setSyncFailed(true);
    }
  }, []);
  useCorrectionAutoRefresh(refresh);

  const description = count === null
    ? (syncFailed ? 'No fue posible consultar las correcciones. Reintentando automáticamente.' : 'Consultando correcciones sin finalizar…')
    : `${count} solicitud${count === 1 ? '' : 'es'} sin finalizar: pendientes y en revisión.${syncFailed ? ' Actualización pendiente; se muestra el último conteo disponible.' : ''}`;

  return (
    <button
      type="button"
      onClick={onClick}
      className="certificates-corrections-button group inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm ring-1 ring-inset ring-slate-200 transition-[color,background-color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003DA5] focus-visible:ring-offset-2 sm:flex-none sm:px-4"
      data-pending={count !== null && count > 0}
      data-sync-failed={syncFailed}
      title={description}
    >
      <span aria-hidden="true" className="certificates-corrections-button__icon flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
        <ClipboardCheck className="h-4 w-4" />
      </span>
      <span>Correcciones</span>
      <span aria-hidden="true" className="certificates-corrections-button__count">
        <span key={count} className="certificates-corrections-button__number">{count ?? (syncFailed ? '—' : '…')}</span>
      </span>
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">{description}</span>
    </button>
  );
}
