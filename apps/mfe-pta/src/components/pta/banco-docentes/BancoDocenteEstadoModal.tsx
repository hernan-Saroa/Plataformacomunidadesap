import React, { useState } from 'react';
import { FileText, Loader2, ShieldCheck, ToggleLeft, ToggleRight, X } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { toggleBancoDocenteEstado, vincularRundSoporte } from '../../../services/api/ptaApi';

interface Props {
  docente: any;
  onClose: () => void;
  onSaved: (estado: 'ACTIVO' | 'INACTIVO') => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

export function BancoDocenteEstadoModal({ docente, onClose, onSaved }: Props) {
  const auth = useAuth();
  const currentState = String(docente?.estado || (docente?.activo === false ? 'INACTIVO' : 'ACTIVO')).toUpperCase();
  const targetState: 'ACTIVO' | 'INACTIVO' = currentState === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
  const isDeactivation = targetState === 'INACTIVO';
  const docenteId = docente?.docente_id || docente?.id;
  const periodoCarga = docente?.periodoCarga || docente?.periodo_carga || docente?.period_carga || '';
  const [justificacion, setJustificacion] = useState('');
  const [supportFile, setSupportFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const accent = isDeactivation ? '#dc2626' : '#059669';
  const softAccent = isDeactivation ? '#fef2f2' : '#ecfdf5';
  const borderAccent = isDeactivation ? '#fecaca' : '#a7f3d0';

  const handleFile = (file: File | null) => {
    setError(null);
    if (!file) {
      setSupportFile(null);
      setErrors((current) => ({ ...current, soporte: 'Adjunte el soporte documental del cambio de estado.' }));
      return;
    }
    if (!ALLOWED_FILE_TYPES.includes(file.type) || file.size > MAX_FILE_SIZE) {
      setSupportFile(null);
      setErrors((current) => ({ ...current, soporte: 'Use un archivo PDF, JPG o PNG de máximo 10 MB.' }));
      return;
    }
    setSupportFile(file);
    setErrors((current) => {
      const next = { ...current };
      delete next.soporte;
      return next;
    });
  };

  const handleSubmit = async () => {
    const nextErrors: Record<string, string> = {};
    if (justificacion.trim().length < 10) {
      nextErrors.justificacion = 'Explique el motivo con mínimo 10 caracteres.';
    }
    if (!supportFile) {
      nextErrors.soporte = 'Adjunte el soporte documental del cambio de estado.';
    }
    if (!docenteId) {
      setError('El perfil no tiene un identificador RUND válido para este período.');
      return;
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    setError(null);
    try {
      const actorId = auth.userPersonId || auth.userEmail || 'SISTEMA';
      const uploadResult = await vincularRundSoporte(
        docenteId,
        'TRANSVERSAL',
        {
          tipoSoporte: 'soporte_cambio_estado_perfil',
          nombreArchivo: supportFile!.name,
          cargadoPor: actorId,
        },
        supportFile!,
      );
      const soporteId = (uploadResult.data as any)?.id || null;
      if (!uploadResult.success || !soporteId) {
        setError((uploadResult as any).message || 'No fue posible cargar el soporte documental.');
        return;
      }

      const result = await toggleBancoDocenteEstado(docenteId, {
        estadoObjetivo: targetState,
        justificacion: justificacion.trim(),
        soporteId,
        actorId,
        periodoCarga: periodoCarga || undefined,
      });
      if (!result.success) {
        setError((result as any).message || 'No fue posible cambiar el estado del perfil.');
        return;
      }
      onSaved(targetState);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="estado-docente-title"
      style={{ position: 'fixed', inset: 0, zIndex: 9300, background: 'rgba(15,23,42,0.58)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
    >
      <div style={{ width: '100%', maxWidth: 560, borderRadius: 18, background: '#fff', boxShadow: '0 24px 70px rgba(15,23,42,0.3)', overflow: 'hidden' }}>
        <div style={{ padding: '20px 22px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: softAccent, border: `1px solid ${borderAccent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {isDeactivation ? <ToggleRight size={22} color={accent} /> : <ToggleLeft size={22} color={accent} />}
            </div>
            <div>
              <h3 id="estado-docente-title" style={{ margin: 0, fontSize: 18, color: '#0f172a' }}>
                {isDeactivation ? 'Inactivar perfil docente' : 'Activar perfil docente'}
              </h3>
              <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>
                {docente?.nombre_completo || 'Docente'} · Período {periodoCarga || 'sin identificar'}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Cerrar" style={{ border: 0, background: '#f1f5f9', borderRadius: 8, width: 34, height: 34, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={17} color="#475569" />
          </button>
        </div>

        <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', gap: 10, padding: 13, borderRadius: 10, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e3a8a', fontSize: 12.5, lineHeight: 1.5 }}>
            <ShieldCheck size={19} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              Este cambio aplica únicamente al perfil RUND del período <strong>{periodoCarga || 'seleccionado'}</strong>. No elimina la persona, su historial ni los PTA de otros períodos.
            </span>
          </div>

          <div>
            <label htmlFor="estado-justificacion" style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 700, color: '#334155' }}>
              Justificación <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <textarea
              id="estado-justificacion"
              value={justificacion}
              onChange={(event) => {
                setJustificacion(event.target.value.slice(0, 500));
                setErrors((current) => ({ ...current, justificacion: '' }));
              }}
              rows={4}
              maxLength={500}
              aria-invalid={Boolean(errors.justificacion)}
              placeholder={isDeactivation ? 'Explique el motivo de la inactivación del perfil...' : 'Explique el motivo de la reactivación del perfil...'}
              style={{ boxSizing: 'border-box', width: '100%', resize: 'vertical', borderRadius: 9, border: `1px solid ${errors.justificacion ? '#ef4444' : '#cbd5e1'}`, padding: '10px 12px', font: 'inherit', fontSize: 13, outline: 'none' }}
            />
            {errors.justificacion && <span role="alert" style={{ display: 'block', marginTop: 5, color: '#dc2626', fontSize: 11 }}>{errors.justificacion}</span>}
            <span style={{ display: 'block', marginTop: 4, color: '#64748b', fontSize: 10.5 }}>{justificacion.length}/500 caracteres</span>
          </div>

          <div>
            <label htmlFor="estado-soporte" style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 700, color: '#334155' }}>
              Soporte documental <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <label htmlFor="estado-soporte" style={{ minHeight: 58, padding: '10px 12px', borderRadius: 9, border: `1px dashed ${errors.soporte ? '#ef4444' : '#94a3b8'}`, background: '#f8fafc', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
              <FileText size={20} color={supportFile ? '#059669' : '#64748b'} />
              <span style={{ fontSize: 12, color: supportFile ? '#065f46' : '#475569', wordBreak: 'break-word' }}>
                {supportFile ? supportFile.name : 'Seleccione un PDF, JPG o PNG de máximo 10 MB'}
              </span>
            </label>
            <input id="estado-soporte" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" disabled={saving} onChange={(event) => handleFile(event.target.files?.[0] || null)} style={{ display: 'none' }} />
            {errors.soporte && <span role="alert" style={{ display: 'block', marginTop: 5, color: '#dc2626', fontSize: 11 }}>{errors.soporte}</span>}
          </div>

          {error && <div role="alert" style={{ padding: '10px 12px', borderRadius: 9, border: '1px solid #fecaca', background: '#fef2f2', color: '#b91c1c', fontSize: 12 }}>{error}</div>}
        </div>

        <div style={{ padding: '15px 22px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" onClick={onClose} disabled={saving} style={{ border: '1px solid #cbd5e1', background: '#fff', color: '#334155', borderRadius: 9, padding: '9px 16px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
            Cancelar
          </button>
          <button type="button" onClick={handleSubmit} disabled={saving} style={{ border: 0, background: accent, color: '#fff', borderRadius: 9, padding: '9px 16px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
            {saving && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
            {saving ? 'Guardando...' : (isDeactivation ? 'Confirmar inactivación' : 'Confirmar activación')}
          </button>
        </div>
      </div>
    </div>
  );
}
