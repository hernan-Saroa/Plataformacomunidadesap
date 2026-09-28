/**
 * Presentación de datos institucionales del PTA.
 *
 * Los servicios conservan códigos estables (por ejemplo CARRERA_003) porque
 * se usan en reglas de negocio. Los informes, en cambio, deben mostrar una
 * etiqueta legible y nunca completar un dato ausente con una suposición.
 */

export const PTA_DATO_NO_REGISTRADO = 'No registrado';

function textoLimpio(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text ? text : null;
}

function clave(value: unknown): string {
  return (textoLimpio(value) || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
}

const VINCULACION_LABELS: Record<string, string> = {
  CARRERA_009: 'Carrera profesoral (Acuerdo 009 de 2004)',
  CARRERA1: 'Carrera profesoral (Acuerdo 009 de 2004)',
  CARRERA_003: 'Carrera profesoral (Acuerdo 003 de 2018)',
  CARRERA2: 'Carrera profesoral (Acuerdo 003 de 2018)',
  CARRERA: 'Carrera profesoral',
  PERIODO_DE_PRUEBA: 'Período de prueba',
  PERIODO_PRUEBA: 'Período de prueba',
  OCASIONAL: 'Ocasional',
  VISITANTE: 'Visitante',
  ESPECIAL: 'Especial',
  CATEDRA: 'Hora cátedra',
  HORA_CATEDRA: 'Hora cátedra',
};

const DEDICACION_LABELS: Record<string, string> = {
  TC: 'Tiempo completo',
  TIEMPO_COMPLETO: 'Tiempo completo',
  MT: 'Medio tiempo',
  MEDIO_TIEMPO: 'Medio tiempo',
  HC: 'Hora cátedra',
  CATEDRA: 'Hora cátedra',
  HORA_CATEDRA: 'Hora cátedra',
};

export function formatPtaVinculacion(value: unknown): string | null {
  const text = textoLimpio(value);
  if (!text) return null;
  return VINCULACION_LABELS[clave(text)] || text;
}

export function formatPtaDedicacion(value: unknown): string | null {
  const text = textoLimpio(value);
  if (!text) return null;
  return DEDICACION_LABELS[clave(text)] || text;
}

export function ptaDato(value: unknown, fallback = PTA_DATO_NO_REGISTRADO): string {
  return textoLimpio(value) || fallback;
}

export function ptaNumero(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function ptaPorcentaje(value: unknown, total: unknown): string {
  const numericValue = ptaNumero(value);
  const numericTotal = ptaNumero(total);
  if (numericValue === null || numericTotal === null || numericTotal <= 0) return '—';
  return ((numericValue / numericTotal) * 100).toFixed(1);
}
