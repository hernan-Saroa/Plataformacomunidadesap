const STORAGE_KEY = 'esap_certificados_laborales_preferencias_v1';

export interface CertificadoLaboralPreferencia {
  includeSalary?: boolean;
  includeTechnicalBonus?: boolean;
  technicalBonus?: number;
  updatedAt?: string;
}

interface CertificadoLaboralPreferenciasStore {
  byId?: Record<string, CertificadoLaboralPreferencia>;
  byConsecutivo?: Record<string, CertificadoLaboralPreferencia>;
  byQrCode?: Record<string, CertificadoLaboralPreferencia>;
}

interface CertificadoLookupKeys {
  id?: string | number | null;
  consecutivo?: string | number | null;
  qrCode?: string | number | null;
  certificateHash?: string | number | null;
}

const sanitizeKey = (value?: string | number | null) => {
  if (value === null || value === undefined) return '';
  return String(value).trim().toUpperCase();
};

const isBrowser = () => typeof window !== 'undefined' && !!window.localStorage;

const readStore = (): CertificadoLaboralPreferenciasStore => {
  if (!isBrowser()) return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as CertificadoLaboralPreferenciasStore;
  } catch {
    return {};
  }
};

const writeStore = (store: CertificadoLaboralPreferenciasStore) => {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // No-op: si falla el storage, no debe romper el flujo principal.
  }
};

const normalizePreference = (preference: CertificadoLaboralPreferencia): CertificadoLaboralPreferencia => {
  const normalized: CertificadoLaboralPreferencia = {
    ...preference,
    updatedAt: preference.updatedAt || new Date().toISOString(),
  };

  if (typeof normalized.technicalBonus === 'number' && !Number.isFinite(normalized.technicalBonus)) {
    delete normalized.technicalBonus;
  }

  return normalized;
};

export const guardarPreferenciasCertificadoLaboral = (
  keys: CertificadoLookupKeys,
  preference: CertificadoLaboralPreferencia,
) => {
  const idKey = sanitizeKey(keys.id);
  const consecutivoKey = sanitizeKey(keys.consecutivo);
  const qrKey = sanitizeKey(keys.qrCode || keys.certificateHash);
  if (!idKey && !consecutivoKey && !qrKey) return;

  const normalizedPreference = normalizePreference(preference);
  const store = readStore();

  if (idKey) {
    store.byId = store.byId || {};
    store.byId[idKey] = normalizedPreference;
  }
  if (consecutivoKey) {
    store.byConsecutivo = store.byConsecutivo || {};
    store.byConsecutivo[consecutivoKey] = normalizedPreference;
  }
  if (qrKey) {
    store.byQrCode = store.byQrCode || {};
    store.byQrCode[qrKey] = normalizedPreference;
  }

  writeStore(store);
};

export const obtenerPreferenciasCertificadoLaboral = (
  keys: CertificadoLookupKeys,
): CertificadoLaboralPreferencia | null => {
  const idKey = sanitizeKey(keys.id);
  const consecutivoKey = sanitizeKey(keys.consecutivo);
  const qrKey = sanitizeKey(keys.qrCode || keys.certificateHash);
  const store = readStore();

  const byId = idKey ? store.byId?.[idKey] : undefined;
  if (byId) return byId;

  const byConsecutivo = consecutivoKey ? store.byConsecutivo?.[consecutivoKey] : undefined;
  if (byConsecutivo) return byConsecutivo;

  const byQr = qrKey ? store.byQrCode?.[qrKey] : undefined;
  if (byQr) return byQr;

  return null;
};
