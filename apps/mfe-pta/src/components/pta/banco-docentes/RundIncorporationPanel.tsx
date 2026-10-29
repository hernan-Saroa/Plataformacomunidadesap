import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { apiClient } from '../../../../../shell/src/services/api';
import { RUND_INCORPORATION_SUPPORTS } from '../../../../../shared/rund-permissions';

export function RundIncorporationPanel({ docenteId, block, fields = [], onSaved }: {
  docenteId: string; block: any; fields?: { campo: string; valor: any }[]; onSaved: () => Promise<void>;
}) {
  const [contract, setContract] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [supportId, setSupportId] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const actionLock = useRef(false);
  const currentProfile = useRef<string | null>(docenteId);
  useEffect(() => {
    currentProfile.current = docenteId;
    return () => { currentProfile.current = null; };
  }, [docenteId]);
  useEffect(() => {
    const value = (key: string) => String(fields.find(field => field.campo === key)?.valor || '');
    setContract(value('ACTO_ADMINISTRATIVO')); setStart(value('INICIO_VINCULACION').slice(0, 10));
    setEnd(value('FIN_VINCULACION').slice(0, 10)); setSupportId(''); setReason(''); setError('');
  }, [docenteId, block?.version]);
  const supports = (block?.soportes || []).filter((support: any) => RUND_INCORPORATION_SUPPORTS.includes(support.tipo_soporte)
    && support.documento_perfil_id && support.estado !== 'Rechazado'
    && (!support.fecha_vencimiento || new Date(support.fecha_vencimiento) >= new Date()));
  const selected = supports.length === 1 ? supports[0] : supports.find((support: any) => support.id === supportId);
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (actionLock.current || busy || !selected) return;
    actionLock.current = true;
    const targetProfile = docenteId;
    setBusy(true); setError('');
    try {
      const result = await apiClient.post<any>(`/pta/api/v1/pta/banco-docentes/${docenteId}/incorporacion`, {
        numeroContrato: contract.trim(), fechaContratacion: start, fechaFin: end || null,
        soporteId: selected.id, documentoVersionId: selected.documento_perfil_id,
        blockVersion: Number(block.version), justificacion: reason.trim(),
      }, { retries: 0, skipErrorToast: true });
      if (result?.success === false || typeof (result?.data ?? result)?.changed !== 'boolean') throw new Error(result?.message || 'No se pudo confirmar el registro de la contratación.');
      if (currentProfile.current !== targetProfile) return;
      toast.success('Datos de contratación registrados para revisión.');
      await onSaved();
    } catch (failure: any) { if (currentProfile.current === targetProfile) setError(failure?.message || 'No se pudo registrar la contratación.'); }
    finally { actionLock.current = false; if (currentProfile.current === targetProfile) setBusy(false); }
  };
  const input: React.CSSProperties = { padding: 9, border: '1px solid #CBD5E1', borderRadius: 7, width: '100%', marginTop: 5 };
  return <form onSubmit={save} aria-label="Datos de contratación" style={{ margin: '0 24px 20px', padding: 20, border: '1px solid #BFDBFE', borderRadius: 12, background: '#F8FBFF' }}>
    <strong>Datos de contratación</strong>
    <p style={{ fontSize: 12, color: '#475569' }}>Registra el contrato y sus fechas con el soporte correspondiente. Los cambios quedan pendientes de revisión documental.</p>
    {!supports.length ? <p role="status">Carga primero un contrato o acto de vinculación en los documentos de esta sección.</p> : <>
      {supports.length > 1 && <label>Soporte de la contratación<select value={supportId} onChange={event => setSupportId(event.target.value)} required disabled={busy} style={input}>
        <option value="">Selecciona el documento</option>{supports.map((support: any) => <option key={support.id} value={support.id}>{support.nombre_archivo}</option>)}
      </select></label>}
      <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: '12px 0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 14 }}>
        <label>Número de contrato o acto<input value={contract} onChange={event => setContract(event.target.value)} required maxLength={200} style={input}/></label>
        <label>Fecha de inicio<input type="date" value={start} onChange={event => setStart(event.target.value)} required style={input}/></label>
        <label>Fecha de finalización · opcional<input type="date" value={end} min={start} onChange={event => setEnd(event.target.value)} style={input}/></label>
        <label style={{ gridColumn: '1 / -1' }}>Justificación<textarea value={reason} onChange={event => setReason(event.target.value)} required minLength={3} maxLength={1000} rows={2} style={input}/></label>
      </fieldset>
      <button type="submit" disabled={busy || !selected || !contract.trim() || !start || reason.trim().length < 3} style={{ border: 0, borderRadius: 7, background: '#003DA5', color: 'white', padding: '10px 16px', cursor: 'pointer' }}>{busy ? 'Guardando…' : 'Guardar datos de contratación'}</button>
    </>}
    {error && <p role="alert" style={{ color: '#B91C1C' }}>{error}</p>}
  </form>;
}
