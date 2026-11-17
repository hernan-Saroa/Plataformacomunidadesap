import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FileText, Loader2, Medal, X } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import {
  decidirRecategorizacionDocente, iniciarRecategorizacionDocente, listarRecategorizacionesDocente,
  revisarRecategorizacionDocente, vincularRundSoporte,
} from '../../../services/api/ptaApi';
import { formatFechaPrueba, hoyColombiaISO } from '../../../utils/rundPeriodoPrueba';
import {
  MAX_SOPORTES_RECATEGORIZACION, parsePuntaje, recategorizacionAbierta, validarDecisionRecategorizacionForm,
  validarRecategorizacionForm, type Recategorizacion,
} from '../../../utils/rundCicloDocente';

interface Props {
  docente: any;
  onClose: () => void;
  /** Avisa al listado que algo cambió (nueva solicitud, revisión o decisión del comité). */
  onChanged: (mensaje: string) => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const input = { boxSizing: 'border-box', width: '100%', borderRadius: 9, border: '1px solid #cbd5e1', padding: '10px 12px', font: 'inherit', fontSize: 13 } as const;
const label = { display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 700, color: '#334155' } as const;
const errorText = { display: 'block', marginTop: 5, color: '#dc2626', fontSize: 11 } as const;

const validFile = (file: File) => ALLOWED_FILE_TYPES.includes(file.type) && file.size <= MAX_FILE_SIZE;

/**
 * HU 2349 — Recategorización: el docente activo aporta nuevos soportes → el GGP los revisa → comité → se actualiza la información.
 * La información vigente no cambia hasta que el comité aprueba.
 */
export function BancoDocenteRecategorizacionModal({ docente, onClose, onChanged }: Props) {
  const auth = useAuth();
  const docenteId = docente?.docente_id || docente?.id;
  const periodoCarga = docente?.periodoCarga || docente?.periodo_carga || '';
  const hoy = hoyColombiaISO();

  const [lista, setLista] = useState<Recategorizacion[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const enviando = useRef(false);

  // Nueva solicitud
  const [justificacion, setJustificacion] = useState('');
  const [escalafon, setEscalafon] = useState('');
  const [puntaje, setPuntaje] = useState('');
  const [archivos, setArchivos] = useState<File[]>([]);
  // Revisión
  const [revisionResultado, setRevisionResultado] = useState('');
  const [revisionObs, setRevisionObs] = useState('');
  // Comité
  const [decisionResultado, setDecisionResultado] = useState('');
  const [fechaComite, setFechaComite] = useState('');
  const [motivo, setMotivo] = useState('');
  const [actaFile, setActaFile] = useState<File | null>(null);

  const cargar = useCallback(async () => {
    if (!docenteId) { setLoadError('El perfil no tiene un identificador RUND válido para este período.'); setLista([]); return; }
    const result = await listarRecategorizacionesDocente(docenteId, periodoCarga || undefined);
    if (!result.success) { setLoadError((result as any).message || 'No fue posible consultar las recategorizaciones.'); setLista([]); return; }
    setLoadError(null);
    setLista((result.data as Recategorizacion[]) || []);
  }, [docenteId, periodoCarga]);

  useEffect(() => { void cargar(); }, [cargar]);

  const abierta = recategorizacionAbierta(lista);
  const actor = auth.userPersonId || auth.userEmail || 'SISTEMA';

  const run = async (action: () => Promise<string | null>) => {
    if (enviando.current) return;
    enviando.current = true;
    setSaving(true);
    setError(null);
    try {
      const mensaje = await action();
      if (mensaje) { onChanged(mensaje); await cargar(); }
    } finally {
      enviando.current = false;
      setSaving(false);
    }
  };

  const addFiles = (files: FileList | null) => {
    setError(null);
    const nuevos = Array.from(files || []);
    if (nuevos.some((file) => !validFile(file))) {
      setErrors((current) => ({ ...current, soportes: 'Use archivos PDF, JPG o PNG de máximo 10 MB.' }));
      return;
    }
    setErrors((current) => { const next = { ...current }; delete next.soportes; return next; });
    setArchivos((current) => [...current, ...nuevos].slice(0, MAX_SOPORTES_RECATEGORIZACION + 1));
  };

  const iniciar = () => run(async () => {
    const nextErrors = validarRecategorizacionForm({ justificacion, escalafon, puntajeSalarial: puntaje, cantidadSoportes: archivos.length });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) { setError('No se inició la recategorización. Revise los campos obligatorios.'); return null; }
    const ids: string[] = [];
    for (const file of archivos) {
      const upload = await vincularRundSoporte(docenteId, 'TRANSVERSAL',
        { tipoSoporte: 'soporte_cambio_estado_perfil', nombreArchivo: file.name, cargadoPor: actor }, file);
      const id = (upload.data as any)?.id || null;
      if (!upload.success || !id) { setError((upload as any).message || `No fue posible cargar el soporte ${file.name}.`); return null; }
      ids.push(id);
    }
    const result = await iniciarRecategorizacionDocente(docenteId, {
      justificacion: justificacion.trim(), propuesta: { escalafon: escalafon.trim(), puntajeSalarial: parsePuntaje(puntaje) },
      soporteIds: ids, periodoCarga: periodoCarga || undefined,
    });
    if (!result.success) { setError((result as any).message || 'No fue posible iniciar la recategorización.'); return null; }
    setJustificacion(''); setEscalafon(''); setPuntaje(''); setArchivos([]);
    return 'Recategorización iniciada: los soportes quedaron en revisión y la información vigente no cambia';
  });

  const revisar = () => run(async () => {
    if (!abierta) return null;
    if (revisionResultado !== 'CUMPLE' && revisionResultado !== 'NO_CUMPLE') { setErrors({ revision: 'Seleccione el resultado de la revisión.' }); return null; }
    if (revisionResultado === 'NO_CUMPLE' && !revisionObs.trim()) { setErrors({ revisionObs: 'El motivo es obligatorio cuando los soportes no cumplen.' }); return null; }
    setErrors({});
    const result = await revisarRecategorizacionDocente(docenteId, abierta.id, {
      resultado: revisionResultado, observacion: revisionObs.trim() || undefined, periodoCarga: periodoCarga || undefined,
    });
    if (!result.success) { setError((result as any).message || 'No fue posible registrar la revisión.'); return null; }
    setRevisionResultado(''); setRevisionObs('');
    return revisionResultado === 'CUMPLE' ? 'Revisión registrada: la recategorización pasó a comité' : 'Revisión registrada: los soportes no cumplen y la solicitud fue rechazada';
  });

  const decidir = () => run(async () => {
    if (!abierta) return null;
    const nextErrors = validarDecisionRecategorizacionForm({ resultado: decisionResultado, fechaComite, motivo, tieneSoporte: Boolean(actaFile) }, hoy);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) { setError('No se guardó la decisión. Revise los campos obligatorios.'); return null; }
    const upload = await vincularRundSoporte(docenteId, 'TRANSVERSAL',
      { tipoSoporte: 'soporte_cambio_estado_perfil', nombreArchivo: actaFile!.name, cargadoPor: actor }, actaFile!);
    const soporteId = (upload.data as any)?.id || null;
    if (!upload.success || !soporteId) { setError((upload as any).message || 'No fue posible cargar el soporte documental.'); return null; }
    const result = await decidirRecategorizacionDocente(docenteId, abierta.id, {
      resultado: decisionResultado as 'APROBADA' | 'RECHAZADA', fechaComite, soporteId, motivo: motivo.trim() || undefined, periodoCarga: periodoCarga || undefined,
    });
    if (!result.success) { setError((result as any).message || 'No fue posible registrar la decisión del comité.'); return null; }
    setDecisionResultado(''); setFechaComite(''); setMotivo(''); setActaFile(null);
    return decisionResultado === 'APROBADA' ? 'Recategorización aprobada: la información del docente fue actualizada' : 'Recategorización rechazada: la información vigente no cambió';
  });

  const resumen = (item: Recategorizacion) => (
    <div data-testid="recategorizacion-resumen" style={{ padding: 13, borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: 12.5, color: '#334155', lineHeight: 1.6 }}>
      <div><strong>Estado:</strong> {item.estadoEtiqueta}</div>
      <div><strong>Categoría propuesta:</strong> {item.propuesta?.escalafon || '—'}{item.propuesta?.puntajeSalarial != null ? ` · Puntaje ${item.propuesta.puntajeSalarial}` : ''}</div>
      <div><strong>Soportes:</strong> {item.soporteIds?.length || 0}</div>
      <div style={{ overflowWrap: 'anywhere' }}><strong>Justificación:</strong> {item.justificacion}</div>
      {item.revision && <div><strong>Revisión:</strong> {item.revision.resultado === 'CUMPLE' ? 'Cumple' : 'No cumple'}{item.revision.observacion ? ` · ${item.revision.observacion}` : ''}</div>}
      {item.decisionComite && <div><strong>Comité:</strong> {item.decisionComite.resultado === 'APROBADA' ? 'Aprobada' : 'Rechazada'} ({formatFechaPrueba(item.decisionComite.fechaComite)}){item.decisionComite.motivo ? ` · ${item.decisionComite.motivo}` : ''}</div>}
    </div>
  );

  const cerradas = (lista || []).filter((item) => item.id !== abierta?.id);
  const boton = (texto: string, onClick: () => void) => (
    <button type="button" onClick={onClick} disabled={saving} style={{ border: 0, background: '#1d4ed8', color: '#fff', borderRadius: 9, padding: '9px 16px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 7, alignSelf: 'flex-end' }}>
      {saving && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}{saving ? 'Guardando...' : texto}
    </button>
  );

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="recategorizacion-title"
      style={{ position: 'fixed', inset: 0, zIndex: 9300, background: 'rgba(15,23,42,0.58)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 640, maxHeight: '94vh', overflowY: 'auto', borderRadius: 18, background: '#fff', boxShadow: '0 24px 70px rgba(15,23,42,0.3)' }}>
        <div style={{ padding: '20px 22px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: '#f5f3ff', border: '1px solid #ddd6fe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Medal size={22} color="#6d28d9" />
            </div>
            <div>
              <h3 id="recategorizacion-title" style={{ margin: 0, fontSize: 18, color: '#0f172a' }}>Recategorización docente</h3>
              <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>{docente?.nombre_completo || 'Docente'} · Período {periodoCarga || 'sin identificar'}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Cerrar" style={{ border: 0, background: '#f1f5f9', borderRadius: 8, width: 34, height: 34, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={17} color="#475569" />
          </button>
        </div>

        <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ padding: 12, borderRadius: 10, background: '#f5f3ff', border: '1px solid #ddd6fe', color: '#4c1d95', fontSize: 12.5, lineHeight: 1.5 }}>
            Los nuevos soportes pasan a revisión y luego al comité. <strong>La información vigente del docente no cambia hasta que el comité apruebe.</strong>
          </div>

          {lista === null && <p role="status" style={{ fontSize: 13, color: '#64748b' }}>Cargando…</p>}
          {loadError && <div role="alert" style={{ padding: '10px 12px', borderRadius: 9, border: '1px solid #fecaca', background: '#fef2f2', color: '#b91c1c', fontSize: 12 }}>{loadError} <button type="button" onClick={() => { void cargar(); }}>Reintentar</button></div>}

          {lista !== null && !abierta && (
            <>
              <div>
                <label htmlFor="recat-justificacion" style={label}>Justificación <span style={{ color: '#dc2626' }}>*</span></label>
                <textarea id="recat-justificacion" rows={3} maxLength={1000} value={justificacion} aria-invalid={Boolean(errors.justificacion)}
                  onChange={(event) => { setJustificacion(event.target.value.slice(0, 1000)); setErrors((c) => ({ ...c, justificacion: '' })); }}
                  placeholder="Explique el motivo de la recategorización…" style={{ ...input, resize: 'vertical' }} />
                {errors.justificacion && <span role="alert" style={errorText}>{errors.justificacion}</span>}
              </div>
              <div>
                <label htmlFor="recat-escalafon" style={label}>Categoría o escalafón propuesto <span style={{ color: '#dc2626' }}>*</span></label>
                <input id="recat-escalafon" value={escalafon} maxLength={200} aria-invalid={Boolean(errors.escalafon)}
                  onChange={(event) => { setEscalafon(event.target.value); setErrors((c) => ({ ...c, escalafon: '' })); }} style={input} />
                {errors.escalafon && <span role="alert" style={errorText}>{errors.escalafon}</span>}
              </div>
              <div>
                <label htmlFor="recat-puntaje" style={label}>Puntaje salarial propuesto (opcional)</label>
                <input id="recat-puntaje" value={puntaje} inputMode="decimal" aria-invalid={Boolean(errors.puntajeSalarial)}
                  onChange={(event) => { setPuntaje(event.target.value); setErrors((c) => ({ ...c, puntajeSalarial: '' })); }} style={input} />
                {errors.puntajeSalarial && <span role="alert" style={errorText}>{errors.puntajeSalarial}</span>}
              </div>
              <div>
                <label htmlFor="recat-soportes" style={label}>Soportes nuevos <span style={{ color: '#dc2626' }}>*</span></label>
                <input id="recat-soportes" type="file" multiple disabled={saving} accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                  onChange={(event) => { addFiles(event.target.files); event.target.value = ''; }} style={input} />
                <ul data-testid="recategorizacion-archivos" style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 12, color: '#065f46' }}>
                  {archivos.map((file, index) => (
                    <li key={`${file.name}-${index}`}>{file.name}{' '}
                      <button type="button" aria-label={`Quitar ${file.name}`} onClick={() => setArchivos((c) => c.filter((_, i) => i !== index))} style={{ border: 0, background: 'transparent', color: '#b91c1c', cursor: 'pointer' }}>Quitar</button>
                    </li>
                  ))}
                </ul>
                {errors.soportes && <span role="alert" style={errorText}>{errors.soportes}</span>}
              </div>
              {boton('Iniciar recategorización', iniciar)}
            </>
          )}

          {abierta && resumen(abierta)}

          {abierta?.estado === 'EN_REVISION' && (
            <>
              <div>
                <label htmlFor="recat-revision" style={label}>Revisión de los soportes <span style={{ color: '#dc2626' }}>*</span></label>
                <select id="recat-revision" value={revisionResultado} onChange={(event) => { setRevisionResultado(event.target.value); setErrors({}); }} style={{ ...input, background: '#fff' }}>
                  <option value="">Seleccione…</option>
                  <option value="CUMPLE">Cumple: pasa a comité</option>
                  <option value="NO_CUMPLE">No cumple</option>
                </select>
                {errors.revision && <span role="alert" style={errorText}>{errors.revision}</span>}
              </div>
              <div>
                <label htmlFor="recat-revision-obs" style={label}>Observación {revisionResultado === 'NO_CUMPLE' && <span style={{ color: '#dc2626' }}>*</span>}</label>
                <textarea id="recat-revision-obs" rows={2} maxLength={1000} value={revisionObs} onChange={(event) => { setRevisionObs(event.target.value.slice(0, 1000)); setErrors({}); }} style={{ ...input, resize: 'vertical' }} />
                {errors.revisionObs && <span role="alert" style={errorText}>{errors.revisionObs}</span>}
              </div>
              {boton('Registrar revisión', revisar)}
            </>
          )}

          {abierta?.estado === 'EN_COMITE' && (
            <>
              <div>
                <label htmlFor="recat-decision" style={label}>Decisión del comité <span style={{ color: '#dc2626' }}>*</span></label>
                <select id="recat-decision" value={decisionResultado} aria-invalid={Boolean(errors.resultado)} onChange={(event) => { setDecisionResultado(event.target.value); setErrors((c) => ({ ...c, resultado: '', motivo: '' })); }} style={{ ...input, background: '#fff' }}>
                  <option value="">Seleccione…</option>
                  <option value="APROBADA">Aprobada: actualizar la información</option>
                  <option value="RECHAZADA">Rechazada</option>
                </select>
                {errors.resultado && <span role="alert" style={errorText}>{errors.resultado}</span>}
              </div>
              <div>
                <label htmlFor="recat-fecha" style={label}>Fecha del comité <span style={{ color: '#dc2626' }}>*</span></label>
                <input id="recat-fecha" type="date" max={hoy} value={fechaComite} aria-invalid={Boolean(errors.fechaComite)} onChange={(event) => { setFechaComite(event.target.value); setErrors((c) => ({ ...c, fechaComite: '' })); }} style={input} />
                {errors.fechaComite && <span role="alert" style={errorText}>{errors.fechaComite}</span>}
              </div>
              <div>
                <label htmlFor="recat-motivo" style={label}>Motivo {decisionResultado === 'RECHAZADA' && <span style={{ color: '#dc2626' }}>*</span>}</label>
                <textarea id="recat-motivo" rows={2} maxLength={1000} value={motivo} aria-invalid={Boolean(errors.motivo)} onChange={(event) => { setMotivo(event.target.value.slice(0, 1000)); setErrors((c) => ({ ...c, motivo: '' })); }} style={{ ...input, resize: 'vertical' }} />
                {errors.motivo && <span role="alert" style={errorText}>{errors.motivo}</span>}
              </div>
              <div>
                <label htmlFor="recat-acta" style={label}>Soporte de la decisión del comité <span style={{ color: '#dc2626' }}>*</span></label>
                <input id="recat-acta" type="file" disabled={saving} accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    if (file && !validFile(file)) { setActaFile(null); setErrors((c) => ({ ...c, soporte: 'Use un archivo PDF, JPG o PNG de máximo 10 MB.' })); return; }
                    setActaFile(file); setErrors((c) => ({ ...c, soporte: '' }));
                  }} style={input} />
                {actaFile && <span style={{ fontSize: 12, color: '#065f46' }}><FileText size={12} /> {actaFile.name}</span>}
                {errors.soporte && <span role="alert" style={errorText}>{errors.soporte}</span>}
              </div>
              {boton('Registrar decisión', decidir)}
            </>
          )}

          {error && <div role="alert" style={{ padding: '10px 12px', borderRadius: 9, border: '1px solid #fecaca', background: '#fef2f2', color: '#b91c1c', fontSize: 12 }}>{error}</div>}

          {cerradas.length > 0 && (
            <div>
              <h4 style={{ margin: '4px 0 8px', fontSize: 13, color: '#334155' }}>Historial de recategorizaciones</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{cerradas.map((item) => <div key={item.id}>{resumen(item)}</div>)}</div>
            </div>
          )}
        </div>

        <div style={{ padding: '15px 22px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} disabled={saving} style={{ border: '1px solid #cbd5e1', background: '#fff', color: '#334155', borderRadius: 9, padding: '9px 16px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
