export interface PtaStatusVisual {
  label: string;
  color: string;
  bg: string;
  border: string;
}

const DEFAULT_STATUS: PtaStatusVisual = {
  label: 'Sin estado',
  color: '#475569',
  bg: '#F1F5F9',
  border: '#CBD5E1',
};

const STATUS_VISUALS: Record<string, PtaStatusVisual> = {
  BORRADOR: { label: 'Borrador', color: '#475569', bg: '#F1F5F9', border: '#CBD5E1' },
  PROPUESTO_POR_DIRECCION: { label: 'Propuesto por Dirección', color: '#1D4ED8', bg: '#EFF6FF', border: '#93C5FD' },
  NOTIFICADO_DOCENTE: { label: 'Notificado al docente', color: '#B45309', bg: '#FFFBEB', border: '#FCD34D' },
  ACEPTADO_DOCENTE: { label: 'Aceptado por el docente', color: '#0F766E', bg: '#F0FDFA', border: '#5EEAD4' },
  MODIFICADO_DOCENTE: { label: 'Modificado por el docente', color: '#0369A1', bg: '#F0F9FF', border: '#7DD3FC' },
  OBJETADO_DOCENTE: { label: 'Objetado por el docente', color: '#BE123C', bg: '#FFF1F2', border: '#FDA4AF' },
  EN_CONCERTACION: { label: 'En Concertación', color: '#6D28D9', bg: '#F5F3FF', border: '#C4B5FD' },
  CONCERTADO: { label: 'Concertado', color: '#0E7490', bg: '#ECFEFF', border: '#67E8F9' },
  ESCALADO_SNA: { label: 'Escalado al SNA', color: '#BE185D', bg: '#FDF2F8', border: '#F9A8D4' },
  RESUELTO_SNA: { label: 'Resuelto por el SNA', color: '#4338CA', bg: '#EEF2FF', border: '#A5B4FC' },
  AJUSTE_REQUERIDO: { label: 'Ajuste requerido', color: '#C2410C', bg: '#FFF7ED', border: '#FDBA74' },
  PENDIENTE_APROBACION: { label: 'Pendiente de aprobación', color: '#B45309', bg: '#FFFBEB', border: '#FCD34D' },
  PENDIENTE_JEFATURA: { label: 'Pendiente Jefatura', color: '#B45309', bg: '#FFFBEB', border: '#FCD34D' },
  PENDIENTE_DECANATURA: { label: 'Pendiente Decanatura', color: '#1D4ED8', bg: '#EFF6FF', border: '#93C5FD' },
  PENDIENTE_GESTION_PROFESORAL: { label: 'Pendiente Gestión Profesoral', color: '#4338CA', bg: '#EEF2FF', border: '#A5B4FC' },
  REVISION_DOCENTE_N1: { label: 'Revisión docente N1', color: '#7E22CE', bg: '#FAF5FF', border: '#D8B4FE' },
  REVISION_DOCENTE_N2: { label: 'Revisión docente N2', color: '#7E22CE', bg: '#FAF5FF', border: '#D8B4FE' },
  REVISION_DOCENTE_N3: { label: 'Revisión docente N3', color: '#7E22CE', bg: '#FAF5FF', border: '#D8B4FE' },
  APROBADO: { label: 'Aprobado', color: '#047857', bg: '#ECFDF5', border: '#6EE7B7' },
  APROBADO_DEF: { label: 'Aprobado definitivamente', color: '#047857', bg: '#ECFDF5', border: '#6EE7B7' },
  EN_FIRME: { label: 'En Firme', color: '#0F766E', bg: '#F0FDFA', border: '#5EEAD4' },
  RADICADO: { label: 'Radicado', color: '#1E3A8A', bg: '#DBEAFE', border: '#60A5FA' },
  EN_EJECUCION: { label: 'En ejecución', color: '#0E7490', bg: '#ECFEFF', border: '#67E8F9' },
  FINALIZADO: { label: 'Finalizado', color: '#5B21B6', bg: '#EDE9FE', border: '#A78BFA' },
  TERMINADO: { label: 'Terminado', color: '#334155', bg: '#E2E8F0', border: '#94A3B8' },
  DEVUELTO: { label: 'Devuelto', color: '#C2410C', bg: '#FFF7ED', border: '#FDBA74' },
  RECHAZADO: { label: 'Rechazado', color: '#B91C1C', bg: '#FEF2F2', border: '#FCA5A5' },
  CERRADO_INACTIVIDAD: { label: 'Cerrado por inactividad', color: '#57534E', bg: '#F5F5F4', border: '#D6D3D1' },
  ANULADO: { label: 'Anulado', color: '#7F1D1D', bg: '#FEF2F2', border: '#FECACA' },
};

export function normalizePtaStatus(status: unknown): string {
  return String(status || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
}

export function getPtaStatusVisual(status: unknown): PtaStatusVisual {
  const key = normalizePtaStatus(status);
  const visual = STATUS_VISUALS[key];
  if (visual) return visual;

  const rawLabel = String(status || '').trim().replace(/_/g, ' ');
  return { ...DEFAULT_STATUS, label: rawLabel || DEFAULT_STATUS.label };
}
