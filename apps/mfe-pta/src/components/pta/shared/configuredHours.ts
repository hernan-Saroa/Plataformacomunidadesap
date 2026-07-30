export type ConfiguredHourMode = 'fija' | 'hasta' | 'intervalo' | 'porcentaje';

function normalizedText(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function firstPositiveNumber(source: any, keys: string[]): number {
  for (const key of keys) {
    const value = Number(source?.[key]);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return 0;
}

export function getConfiguredPercentageValue(source: any): number {
  return firstPositiveNumber(source, [
    'porcentaje_pta',
    'porcentajePta',
    'porcentaje',
    'pct_pta',
    'pctPta',
    'pct',
  ]);
}

export function getConfiguredMaximumHours(source: any): number {
  return firstPositiveNumber(source, [
    'max_horas',
    'horas_max',
    'maxHoras',
    'horasMax',
    'horas',
    'maximo_horas',
    'horas_maximas',
    'maximo',
    'tope_horas',
    'valor',
  ]);
}

export function getConfiguredMinimumHours(source: any): number {
  return firstPositiveNumber(source, [
    'min_horas',
    'horas_min',
    'minHoras',
    'horasMin',
    'minimo_horas',
    'horas_minimas',
    'minimo',
    'min',
  ]);
}

/**
 * Contrato tolerante para los catálogos configurables. Además de los valores
 * canónicos acepta las etiquetas y alias usados por versiones anteriores del
 * constructor, sin modificar lo que está persistido.
 */
export function getConfiguredHourMode(
  source: any,
  fallback: ConfiguredHourMode = 'hasta',
): ConfiguredHourMode {
  const raw = typeof source === 'object' && source !== null
    ? source.tipo
      ?? source.tipo_horas
      ?? source.tipoHoras
      ?? source.modalidad_horas
      ?? source.modalidadHoras
      ?? source.modo
      ?? source.mode
    : source;
  const value = normalizedText(raw);

  if (
    value === 'porcentaje'
    || value.includes('porcent')
    || value.includes('percent')
    || value.includes('%')
  ) return 'porcentaje';
  if (
    value === 'intervalo'
    || value.includes('interval')
    || value.includes('entre')
    || value.includes('rango')
    || value.includes('min max')
  ) return 'intervalo';
  if (
    value === 'fija'
    || value === 'fijo'
    || value.includes('exacta')
    || value.includes('exacto')
  ) return 'fija';
  if (
    value === 'hasta'
    || value.includes('maximo')
    || value.includes('maximum')
    || value.includes('hasta')
  ) return 'hasta';

  // Recuperación segura de configuraciones legacy que guardaron los valores
  // pero no la modalidad explícita.
  if (getConfiguredPercentageValue(source) > 0) return 'porcentaje';
  if (getConfiguredMinimumHours(source) > 0) return 'intervalo';
  return fallback;
}

/**
 * Expone simultáneamente el contrato del constructor (`horas`/`horas_min`) y
 * el del formulario (`max_horas`/`min_horas`). Esto evita que una fila Hasta
 * desaparezca al mezclarse con filas Fijas, de Intervalo o Porcentaje.
 */
export function normalizeConfiguredHourRow<T extends Record<string, any>>(
  source: T,
): T & {
  tipo: ConfiguredHourMode;
  max_horas?: number;
  min_horas?: number;
  horas?: number;
  horas_min?: number;
  porcentaje_pta?: number;
} {
  const row = source && typeof source === 'object' ? source : ({} as T);
  const tipo = getConfiguredHourMode(row);
  const max = getConfiguredMaximumHours(row);
  const min = getConfiguredMinimumHours(row);
  const percentage = getConfiguredPercentageValue(row);
  const normalized: any = { ...row, tipo };

  if (tipo === 'porcentaje') {
    if (percentage > 0) normalized.porcentaje_pta = percentage;
    return normalized;
  }
  if (max > 0) {
    normalized.max_horas = max;
    normalized.horas = max;
  }
  if (tipo === 'intervalo' && min > 0) {
    normalized.min_horas = min;
    normalized.horas_min = min;
  }
  return normalized;
}
