import React, { useState } from 'react';
import { FileText, Gavel, Loader2, ShieldCheck, X } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { registrarDecisionPeriodoPrueba, vincularRundSoporte } from '../../../services/api/ptaApi';
import {
  RESULTADOS_COMITE_OPCIONES, diasRestantesTexto, formatFechaPrueba, hoyColombiaISO, validarDecisionComiteForm,
  type PeriodoPruebaInfo,
} from '../../../utils/rundPeriodoPrueba';

interface Props {
  docente: any;
  onClose: () => void;
  onSaved: (resultado: 'SUPERA' | 'NO_SUPERA') => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

/** HU 2424 — Registro (o corrección) de la decisión del Comité Docente sobre el periodo de prueba. */
export function BancoDocenteDecisionPruebaModal({ docente, onClose, onSaved }: Props) {
  const auth = useAuth();
  const info: PeriodoPruebaInfo | null = docente?.periodo_prueba || null;
  const previa = info?.decision || null;
  const docenteId = docente?.docente_id || docente?.id;
  const periodoCarga = docente?.periodoCarga || docente?.periodo_carga || '';
  const hoy = hoyColombiaISO();

  const [resultado, setResultado] = useState<string>(previa?.resultado || '');
  const [fechaComite, setFechaComite] = useState<string>(previa?.fechaComite || '');
  const [motivo, setMotivo] = useState<string>(previa?.motivo || '');
  const [observacion, setObservacion] = useState<string>(previa?.observacion || '');
  const [supportFile, setSupportFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const clearError = (key: string) => setErrors((current) => {
    const next = { ...current };
    delete next[key];
    return next;
  });

  const handleFile = (file: File | null) => {
    setError(null);
    if (!file) {
      setSupportFile(null);
      return;
    }
    if (!ALLOWED_FILE_TYPES.includes(file.type) || file.size > MAX_FILE_SIZE) {
      setSupportFile(null);
      setErrors((current) => ({ ...current, soporte: 'Use un archivo PDF, JPG o PNG de máximo 10 MB.' }));
      return;
    }
    setSupportFile(file);
    clearError('soporte');
  };

  const handleSubmit = async () => {
    const nextErrors = validarDecisionComiteForm({ resultado, fechaComite, motivo, tieneSoporte: Boolean(supportFile) }, hoy);
    setErrors(nextErrors);
    if (!docenteId) {
      setError('El perfil no tiene un identificador RUND válido para este período.');
      return;
    }
    if (Object.keys(nextErrors).length > 0) {
      const faltantes = [
        nextErrors.resultado && 'resultado',
        nextErrors.fechaComite && 'fecha del comité',
        nextErrors.soporte && 'soporte',
        nextErrors.motivo && 'motivo',
      ].filter(Boolean).join(', ');
      setError(`No se guardó la decisión. Revise los campos obligatorios: ${faltantes}.`);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const actorId = auth.userPersonId || auth.userEmail || 'SISTEMA';
      const uploadResult = await vincularRundSoporte(
        docenteId,
        'TRANSVERSAL',
        { tipoSoporte: 'soporte_cambio_estado_perfil', nombreArchivo: supportFile!.name, cargadoPor: actorId },
        supportFile!,
      );
      const soporteId = (uploadResult.data as any)?.id || null;
      if (!uploadResult.success || !soporteId) {
        setError((uploadResult as any).message || 'No fue posible cargar el soporte documental.');
        return;
      }
      const result = await registrarDecisionPeriodoPrueba(docenteId, {
        resultado: resultado as 'SUPERA' | 'NO_SUPERA',
        fechaComite,
        soporteId,
        motivo: motivo.trim() || undefined,
        observacion: observacion.trim() || undefined,
        periodoCarga: periodoCarga || undefined,
      });
      if (!result.success) {
        setError((result as any).message || 'No fue posible registrar la decisión del comité.');
        return;
      }
      onSaved(resultado as 'SUPERA' | 'NO_SUPERA');
    } finally {
      setSaving(false);
    }
  };

  const fieldBorder = (key: string) => `1px solid ${errors[key] ? '#ef4444' : '#cbd5e1'}`;
  const label = { display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 700, color: '#334155' } as const;
  const errorText = { display: 'block', marginTop: 5, color: '#dc2626', fontSize: 11 } as const;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="decision-prueba-title"
      style={{ position: 'fixed', inset: 0, zIndex: 9300, background: 'rgba(15,23,42,0.58)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
    >
      <div style={{ width: '100%', maxWidth: 600, maxHeight: '94vh', overflowY: 'auto', borderRadius: 18, background: '#fff', boxShadow: '0 24px 70px rgba(15,23,42,0.3)' }}>
        <div style={{ padding: '20px 22px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: '#eff6ff', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Gavel size={22} color="#1d4ed8" />
            </div>
            <div>
              <h3 id="decision-prueba-title" style={{ margin: 0, fontSize: 18, color: '#0f172a' }}>
                {previa ? 'Corregir decisión del Comité Docente' : 'Decisión del Comité Docente'}
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
            <span data-testid="decision-prueba-resumen">
              {previa
                ? <>Decisión vigente: <strong>{previa.resultadoEtiqueta}</strong> (comité del {formatFechaPrueba(previa.fechaComite)}). Al guardar se corrige y queda registrada en el historial.</>
                : <>Periodo de prueba: inicio <strong>{formatFechaPrueba(info?.inicio)}</strong> · cumple <strong>{formatFechaPrueba(info?.cumplimiento)}</strong> · {diasRestantesTexto(info?.dias_restantes)}. «Supera» pasa al docente a Carrera 2; «No supera» lo deja inactivo.</>}
            </span>
          </div>

          <div>
            <label htmlFor="decision-resultado" style={label}>Resultado de la decisión <span style={{ color: '#dc2626' }}>*</span></label>
            <select
              id="decision-resultado"
              value={resultado}
              onChange={(event) => { setResultado(event.target.value); clearError('resultado'); clearError('motivo'); }}
              aria-invalid={Boolean(errors.resultado)}
              style={{ boxSizing: 'border-box', width: '100%', borderRadius: 9, border: fieldBorder('resultado'), padding: '10px 12px', font: 'inherit', fontSize: 13, background: '#fff' }}
            >
              <option value="">Seleccione…</option>
              {RESULTADOS_COMITE_OPCIONES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            {errors.resultado && <span role="alert" style={errorText}>{errors.resultado}</span>}
          </div>

          <div>
            <label htmlFor="decision-fecha" style={label}>Fecha del comité <span style={{ color: '#dc2626' }}>*</span></label>
            <input
              id="decision-fecha"
              type="date"
              max={hoy}
              value={fechaComite}
              onChange={(event) => { setFechaComite(event.target.value); clearError('fechaComite'); }}
              aria-invalid={Boolean(errors.fechaComite)}
              style={{ boxSizing: 'border-box', width: '100%', borderRadius: 9, border: fieldBorder('fechaComite'), padding: '10px 12px', font: 'inherit', fontSize: 13 }}
            />
            {errors.fechaComite && <span role="alert" style={errorText}>{errors.fechaComite}</span>}
          </div>

          <div>
            <label htmlFor="decision-motivo" style={label}>
              Motivo {resultado === 'NO_SUPERA' && <span style={{ color: '#dc2626' }}>*</span>}
            </label>
            <textarea
              id="decision-motivo"
              value={motivo}
              onChange={(event) => { setMotivo(event.target.value.slice(0, 1000)); clearError('motivo'); }}
              rows={3}
              maxLength={1000}
              aria-invalid={Boolean(errors.motivo)}
              placeholder={resultado === 'NO_SUPERA' ? 'Ej.: no cumple el requisito de segunda lengua…' : 'Opcional cuando el docente supera el periodo.'}
              style={{ boxSizing: 'border-box', width: '100%', resize: 'vertical', borderRadius: 9, border: fieldBorder('motivo'), padding: '10px 12px', font: 'inherit', fontSize: 13 }}
            />
            {errors.motivo && <span role="alert" style={errorText}>{errors.motivo}</span>}
          </div>

          <div>
            <label htmlFor="decision-observacion" style={label}>Observación</label>
            <textarea
              id="decision-observacion"
              value={observacion}
              onChange={(event) => setObservacion(event.target.value.slice(0, 1000))}
              rows={2}
              maxLength={1000}
              placeholder="Opcional."
              style={{ boxSizing: 'border-box', width: '100%', resize: 'vertical', borderRadius: 9, border: '1px solid #cbd5e1', padding: '10px 12px', font: 'inherit', fontSize: 13 }}
            />
          </div>

          <div>
            <label htmlFor="decision-soporte" style={label}>Soporte (acto administrativo o certificación) <span style={{ color: '#dc2626' }}>*</span></label>
            <label htmlFor="decision-soporte" style={{ minHeight: 58, padding: '10px 12px', borderRadius: 9, border: `1px dashed ${errors.soporte ? '#ef4444' : '#94a3b8'}`, background: '#f8fafc', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
              <FileText size={20} color={supportFile ? '#059669' : '#64748b'} />
              <span style={{ fontSize: 12, color: supportFile ? '#065f46' : '#475569', wordBreak: 'break-word' }}>
                {supportFile ? supportFile.name : 'Seleccione un PDF, JPG o PNG de máximo 10 MB'}
              </span>
            </label>
            <input id="decision-soporte" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" disabled={saving} onChange={(event) => handleFile(event.target.files?.[0] || null)} style={{ display: 'none' }} />
            {errors.soporte && <span role="alert" style={errorText}>{errors.soporte}</span>}
          </div>

          {error && <div role="alert" style={{ padding: '10px 12px', borderRadius: 9, border: '1px solid #fecaca', background: '#fef2f2', color: '#b91c1c', fontSize: 12 }}>{error}</div>}
        </div>

        <div style={{ padding: '15px 22px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" onClick={onClose} disabled={saving} style={{ border: '1px solid #cbd5e1', background: '#fff', color: '#334155', borderRadius: 9, padding: '9px 16px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
            Cancelar
          </button>
          <button type="button" onClick={handleSubmit} disabled={saving} style={{ border: 0, background: '#1d4ed8', color: '#fff', borderRadius: 9, padding: '9px 16px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
            {saving && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
            {saving ? 'Guardando...' : (previa ? 'Guardar corrección' : 'Registrar decisión')}
          </button>
        </div>
      </div>
    </div>
  );
}
