import { sanitizeText } from './rund-identity-text';

function toCleanString(value: any): string | null {
  if (value === undefined || value === null) return null;
  const n = sanitizeText(String(value)).trim();
  return n === '' ? null : n;
}

function firstNonEmpty(...values: any[]): string | null {
  for (const v of values) {
    const n = toCleanString(v);
    if (n) return n;
  }
  return null;
}

function normalizeLookupText(value: any): string {
  const text = toCleanString(value) || '';
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

function excelSerialToDate(serial: number): Date | null {
  if (!Number.isFinite(serial)) return null;
  const date = new Date((Math.floor(serial - 25569)) * 86400 * 1000);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseMaybeDate(value: any): Date | null {
  if (value === undefined || value === null || value === '') return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'number') return excelSerialToDate(value);
  const text = String(value).trim();
  if (!text) return null;
  const ddmm = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (ddmm) {
    const d = new Date(Date.UTC(Number(ddmm[3]), Number(ddmm[2]) - 1, Number(ddmm[1])));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const yyyymm = text.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
  if (yyyymm) {
    const d = new Date(Date.UTC(Number(yyyymm[1]), Number(yyyymm[2]) - 1, Number(yyyymm[3])));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(text);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDateOnly(value: any): string | null {
  const date = parseMaybeDate(value);
  if (!date) return null;
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function splitFullName(fullName: string | null) {
  const tokens = (fullName || '').split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return { primer_nombre: null, segundo_nombre: null, primer_apellido: null, segundo_apellido: null };
  if (tokens.length === 1) return { primer_nombre: tokens[0], segundo_nombre: null, primer_apellido: null, segundo_apellido: null };
  if (tokens.length === 2) return { primer_nombre: tokens[0], segundo_nombre: null, primer_apellido: tokens[1], segundo_apellido: null };
  if (tokens.length === 3) return { primer_nombre: tokens[0], segundo_nombre: tokens[1], primer_apellido: tokens[2], segundo_apellido: null };
  return { primer_nombre: tokens[0], segundo_nombre: tokens[1], primer_apellido: tokens.slice(2, -1).join(' '), segundo_apellido: tokens[tokens.length - 1] };
}

export const identityWriteNormalization = { formatDateOnly, splitFullName, normalizeLookupText };
