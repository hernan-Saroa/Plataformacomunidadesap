import { ServiceUnavailableException } from '@nestjs/common';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';

export type RundRetentionRule = {
  id: string; categoria: string; tipoSoporte?: string;
  serie: string; subserie: string; eventoInicio: string;
  mesesGestion: number; mesesCentral: number;
  disposicion: 'CONSERVACION_TOTAL' | 'SELECCION' | 'ELIMINACION';
  fundamentoTratamiento: string; finalidad: string;
};
export type RundRetentionSnapshot = {
  estado: 'ASIGNADA'; version: string; aprobacion: string; huella: string; regla: RundRetentionRule;
} | { estado: 'PENDIENTE_TRD' };

/** Datos institucionales aprobados; nunca contiene plazos predeterminados. */
export function readRetentionPolicy(): { version: string; aprobacion: string; reglas: RundRetentionRule[] } | null {
  const file = process.env.RUND_TRD_POLICY_FILE?.trim();
  if (!file) return null;
  try {
    const policy = JSON.parse(readFileSync(file, 'utf8'));
    const nonempty = (value: unknown) => typeof value === 'string' && value.trim().length > 0 && value.length <= 2000;
    if (!nonempty(policy.version) || !nonempty(policy.aprobacion) || !Array.isArray(policy.reglas) || !policy.reglas.length) throw new Error();
    const selectors = new Set<string>();
    const ids = new Set<string>();
    for (const r of policy.reglas) {
      if (!['id', 'categoria', 'serie', 'subserie', 'eventoInicio', 'fundamentoTratamiento', 'finalidad'].every(k => nonempty(r[k]))) throw new Error();
      if (!/^[A-Z0-9_]+$/.test(r.categoria) || (r.tipoSoporte !== undefined && !/^[a-z0-9_]+$/.test(r.tipoSoporte))) throw new Error();
      if (![r.mesesGestion, r.mesesCentral].every(n => Number.isSafeInteger(n) && n >= 0 && n <= 12000)) throw new Error();
      if (!['CONSERVACION_TOTAL', 'SELECCION', 'ELIMINACION'].includes(r.disposicion)) throw new Error();
      const selector = `${r.categoria}:${r.tipoSoporte || '*'}`;
      if (selectors.has(selector) || ids.has(r.id)) throw new Error();
      selectors.add(selector); ids.add(r.id);
    }
    return policy;
  } catch {
    throw new ServiceUnavailableException('La configuración TRD es inválida. Revise la política institucional del backend.');
  }
}

export function retentionSnapshot(category: string, supportType?: string): RundRetentionSnapshot {
  const policy = readRetentionPolicy();
  const rule = policy?.reglas.find(r => r.categoria === category && !!r.tipoSoporte && r.tipoSoporte === supportType)
    || policy?.reglas.find(r => r.categoria === category && !r.tipoSoporte);
  if (!policy || !rule) return { estado: 'PENDIENTE_TRD' };
  const snapshot = { version: policy.version, aprobacion: policy.aprobacion, regla: rule };
  return { estado: 'ASIGNADA', ...snapshot, huella: createHash('sha256').update(JSON.stringify(snapshot)).digest('hex') };
}

/** Suma meses calendario UTC, limitando al último día del mes destino. */
export function addRetentionMonths(date: Date, months: number): Date {
  const target = new Date(date);
  target.setUTCDate(1);
  target.setUTCMonth(target.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(date.getUTCDate(), lastDay));
  return target;
}

export function retentionReport(snapshot: RundRetentionSnapshot, eventDate?: string, hold = false, now = new Date()) {
  const base = { trd: snapshot, suspension: hold, disposicionAutomatica: false, eliminacionFisicaPermitida: false };
  if (snapshot.estado !== 'ASIGNADA') return { ...base, estado: 'PENDIENTE_TRD' };
  if (!eventDate) return { ...base, estado: hold ? 'SUSPENDIDA' : 'PENDIENTE_EVENTO', eventoInicio: snapshot.regla.eventoInicio };
  const start = new Date(eventDate);
  if (!Number.isFinite(start.getTime())) return { ...base, estado: 'PENDIENTE_EVENTO' };
  const transfer = addRetentionMonths(start, snapshot.regla.mesesGestion);
  const end = addRetentionMonths(transfer, snapshot.regla.mesesCentral);
  return { ...base, fechaEvento: start.toISOString(), transferenciaDesde: transfer.toISOString(), revisionDisposicionDesde: end.toISOString(),
    estado: hold ? 'SUSPENDIDA' : now < transfer ? 'EN_GESTION' : now < end ? 'EN_CENTRAL' : 'REQUIERE_REVISION_ARCHIVISTICA' };
}
