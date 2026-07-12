import { sanitizeText } from './textSanitizer';

export function cleanBancoDocenteText(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const normalized = sanitizeText(String(value)).trim();
  return normalized === '' ? null : normalized;
}

function normalizeLookupText(value: unknown): string {
  const text = cleanBancoDocenteText(value) || '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();
}

function parseInteger(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.trunc(value) : null;
  }

  const parsed = Number(String(value).replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

export function normalizeBancoDocenteDedicacionCode(value: unknown): string {
  const normalized = normalizeLookupText(value);
  if (!normalized) return 'TC';
  if (normalized === 'mt' || normalized.includes('mediotiempo')) return 'MT';
  if (normalized === 'hc' || normalized.includes('horacatedra') || normalized.includes('catedra')) return 'HC';
  if (normalized === 'tc' || normalized.includes('tiempocompleto')) return 'TC';
  return (cleanBancoDocenteText(value) || 'TC').toUpperCase();
}

export function getBancoDocenteDedicacionLabel(value: unknown): string {
  const normalized = normalizeBancoDocenteDedicacionCode(value);
  if (normalized === 'MT') return 'Medio Tiempo';
  if (normalized === 'HC') return 'Hora Catedra';
  return 'Tiempo Completo';
}

export function getBancoDocenteDedicacionShort(value: unknown): string {
  const normalized = normalizeBancoDocenteDedicacionCode(value);
  if (normalized === 'MT') return 'MT';
  if (normalized === 'HC') return 'HC';
  return 'TC';
}

export function resolveBancoDocenteHours(dedicacion: unknown, explicitValue?: unknown): number {
  const explicit = parseInteger(explicitValue);
  if (explicit !== null && explicit > 0) return explicit;

  const normalized = normalizeBancoDocenteDedicacionCode(dedicacion);
  if (normalized === 'MT') return 400;
  if (normalized === 'HC') return 0;
  return 800;
}

export function normalizeBancoDocenteVinculacionCode(value: unknown): string {
  const normalized = normalizeLookupText(value);
  if (!normalized) return 'OCASIONAL';
  if (normalized.includes('carrera') || normalized.includes('prueba') || normalized.includes('periodo')) return 'CARRERA';
  if (normalized.includes('ocasional') || normalized.includes('provisional')) return 'OCASIONAL';
  if (normalized.includes('catedra')) return 'CATEDRA';
  if (normalized.includes('visitante')) return 'VISITANTE';
  if (normalized.includes('especial')) return 'ESPECIAL';
  return (cleanBancoDocenteText(value) || 'OCASIONAL').toUpperCase().replace(/\s+/g, '_');
}

export function getBancoDocenteVinculacionLabel(value: unknown): string {
  const normalized = normalizeBancoDocenteVinculacionCode(value);
  if (normalized === 'CARRERA') return 'Carrera';
  if (normalized === 'OCASIONAL') return 'Ocasional';
  if (normalized === 'CATEDRA') return 'Hora Catedra';
  if (normalized === 'VISITANTE') return 'Visitante';
  if (normalized === 'ESPECIAL') return 'Especial';
  return normalized.replace(/_/g, ' ');
}

export function formatBancoDocenteInputDate(value: unknown): string {
  if (!value) return '';

  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return '';

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function computeBancoDocenteAge(fechaNacimiento: unknown, fallback?: unknown): number | null {
  const parsedFallback = parseInteger(fallback);
  if (!fechaNacimiento) return parsedFallback;

  const birthDate = fechaNacimiento instanceof Date ? fechaNacimiento : new Date(String(fechaNacimiento));
  if (Number.isNaN(birthDate.getTime())) return parsedFallback;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  const dayDiff = today.getDate() - birthDate.getDate();

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age -= 1;
  }

  return age >= 0 ? age : parsedFallback;
}

export function computeBancoDocenteAgeRange(edad: unknown, fallback?: unknown): string | null {
  const numericAge = parseInteger(edad);
  if (numericAge === null) {
    return cleanBancoDocenteText(fallback)
      ?.replace(/\banos\b/gi, 'a\u00f1os')
      .replace(/\bmas\b/gi, 'm\u00e1s') || null;
  }
  if (numericAge <= 25) return 'Hasta 25 a\u00f1os';
  if (numericAge <= 35) return 'De 26 a 35 a\u00f1os';
  if (numericAge <= 45) return 'De 36 a 45 a\u00f1os';
  if (numericAge <= 55) return 'De 46 a 55 a\u00f1os';
  if (numericAge <= 65) return 'De 56 a 65 a\u00f1os';
  return '66 a\u00f1os o m\u00e1s';
}
