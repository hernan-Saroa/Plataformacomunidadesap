/**
 * Cómo se leen los valores del PAA en pantalla.
 *
 * Las líneas guardan cada columna por su clave (`valor_total`, `duracion`…), y
 * casi todas son texto que se muestra tal cual. Las de dinero no: 78852000 sin
 * separadores no se lee como setenta y ocho millones.
 */

const PESOS = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

const CLAVES_EN_PESOS = new Set(['valor_total', 'valor_vigencia', 'valorEstimado']);

export function pesos(valor: number | string | null | undefined): string {
  if (valor === null || valor === undefined || valor === '') return '—';
  const n = Number(valor);
  return Number.isFinite(n) ? PESOS.format(n) : String(valor);
}

export function valorPaa(clave: string, valor: unknown): string {
  if (valor === null || valor === undefined || valor === '') return '—';
  if (CLAVES_EN_PESOS.has(clave)) return pesos(valor as number);
  return String(valor);
}

export function fechaCorta(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
}

export const ESTADO_VERSION: Record<string, { etiqueta: string; clase: string }> = {
  ACTIVA: { etiqueta: 'Activa', clase: 'bg-emerald-100 text-emerald-800' },
  VALIDADA: { etiqueta: 'Validada, sin activar', clase: 'bg-blue-100 text-blue-800' },
  INVALIDA: { etiqueta: 'Con errores', clase: 'bg-red-100 text-red-800' },
  REEMPLAZADA: { etiqueta: 'Reemplazada', clase: 'bg-gray-100 text-gray-600' },
  DESCARTADA: { etiqueta: 'Descartada', clase: 'bg-gray-100 text-gray-600' },
};

export const TIPO_REVISION: Record<string, string> = {
  MODIFICACION: 'Línea modificada',
  ELIMINACION: 'Línea retirada del PAA',
  CAMBIO_VIGENCIA: 'Evaluación por cambio de vigencia',
};

export const DECISION: Record<string, { etiqueta: string; ayuda: string }> = {
  CONTINUAR: {
    etiqueta: 'Continuar',
    ayuda: 'El proceso sigue con los datos y la vigencia que tiene.',
  },
  DEVOLVER: {
    etiqueta: 'Devolver el estudio previo',
    ayuda: 'La 3.1 vuelve al área con tu observación, con lo que el PAA dice ahora en lo que no se había corregido a mano.',
  },
  MIGRAR: {
    etiqueta: 'Migrar a una línea del año nuevo',
    ayuda: 'Eliges la línea del PAA vigente a la que pasa el proceso. Nada se empareja solo por el código.',
  },
  CANCELAR: {
    etiqueta: 'Cancelar el proceso',
    ayuda: 'El proceso termina y no admite más cambios. Su expediente sigue consultable.',
  },
};
