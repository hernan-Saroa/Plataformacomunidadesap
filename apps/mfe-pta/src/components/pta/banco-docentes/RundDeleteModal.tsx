import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Trash2, X } from 'lucide-react';
import { confirmRundDeletion, previewRundDeletion, type RundDeletionPreview, type RundDeletionSelection } from '../../../services/api/ptaApi';
import './RundDeleteModal.css';

export function RundDeleteModal({ selection, onClose, onDeleted }: {
  selection: RundDeletionSelection; onClose: () => void; onDeleted: (count: number) => void;
}) {
  const [preview, setPreview] = useState<RundDeletionPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [reason, setReason] = useState('');
  const [accepted, setAccepted] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const busy = useRef(false);
  const close = useRef(onClose); close.current = onClose;
  useEffect(() => {
    let active = true;
    previewRundDeletion(selection).then(result => { if (active) setPreview(result); })
      .catch(err => { if (active) setError(err?.message || 'No fue posible consultar la selección.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [selection]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; panel.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); if (!busy.current) close.current(); }
      if (event.key === 'Tab') {
        const nodes = Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),[tabindex="0"]') || []);
        const first = nodes[0], last = nodes[nodes.length - 1];
        if (!first) { event.preventDefault(); return; }
        if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panel.current)) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.removeEventListener('keydown', keydown); document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  const submit = async () => {
    if (busy.current || !preview || !accepted || reason.trim().length < 10) return;
    busy.current = true; setSaving(true); setError('');
    try { const result = await confirmRundDeletion(preview, reason.trim()); onDeleted(result.eliminados); }
    catch (err: any) { setError(err?.message || 'No fue posible eliminar. Intente nuevamente.'); }
    finally { busy.current = false; setSaving(false); }
  };
  return createPortal(<div className="rund-delete-overlay">
    <div className="rund-delete-modal" role="dialog" aria-modal="true" aria-labelledby="rund-delete-title" aria-describedby="rund-delete-description" tabIndex={-1} ref={panel}>
      <header><div className="rund-delete-icon"><Trash2 size={22} /></div><div><h2 id="rund-delete-title">Eliminar de RUND</h2><p id="rund-delete-description">Revisa los registros antes de confirmar.</p></div>
        <button type="button" aria-label="Cerrar confirmación" disabled={saving} onClick={onClose}><X size={20} /></button></header>
      <div className="rund-delete-content">
        {loading && <p role="status"><Loader2 size={18} /> Consultando registros seleccionados…</p>}
        {preview && <>
          <p className="rund-delete-count">Se {preview.total === 1 ? 'eliminará 1 registro' : `eliminarán ${preview.total} registros`} del banco de docentes.</p>
          <p>Dejarán de aparecer en el listado y las estadísticas de sus periodos. Se conservarán las personas, sus cuentas, los soportes y el historial de RUND y PTA.</p>
          <ul className="rund-delete-records" aria-label="Registros que se eliminarán" tabIndex={0}>
            {preview.registros.map(row => <li key={row.id}><strong>{row.nombre_completo || 'Docente sin nombre registrado'}</strong><span>{row.documento_identidad} · Periodo {row.periodo_carga || 'sin asignar'}</span></li>)}
          </ul>
          <label htmlFor="rund-delete-reason">Motivo de la eliminación</label>
          <textarea id="rund-delete-reason" rows={3} maxLength={1000} placeholder="Explica el motivo (mínimo 10 caracteres)" disabled={saving} value={reason} onChange={e => setReason(e.target.value)} />
          <label className="rund-delete-accept"><input type="checkbox" checked={accepted} disabled={saving} onChange={e => setAccepted(e.target.checked)} />He revisado los registros y confirmo que deseo eliminarlos de RUND.</label>
        </>}
        {error && <p role="alert" className="rund-delete-error">{error}</p>}
      </div>
      <footer><button type="button" disabled={saving} onClick={onClose}>Cancelar</button><button type="button" className="rund-delete-confirm" disabled={loading || saving || !preview || !accepted || reason.trim().length < 10} onClick={submit}>
        {saving ? <Loader2 size={16} /> : <Trash2 size={16} />}{saving ? 'Eliminando…' : `Eliminar ${preview?.total || ''} ${preview?.total === 1 ? 'registro' : 'registros'}`}</button></footer>
    </div>
  </div>, document.body);
}
