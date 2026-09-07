export type ConfiguredHourMode = 'sin_horas' | 'fija' | 'hasta' | 'intervalo' | 'porcentaje';

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
    value === 'sin horas'
    || value === 'ninguna'
    || value === 'ninguno'
    || value === 'nada'
    || value === 'informativo'
    || value === 'informativa'
    || value === 'none'
    || value.includes('no suma')
  ) return 'sin_horas';

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

  if (tipo === 'sin_horas') return normalized;

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

/**
 * Descripción corta y auditable de un reconocimiento configurado. Si se
 * entrega `assignedHours`, diferencia con claridad el valor elegido del tope
 * permitido; se reutiliza en consultas, impresiones y exportaciones.
 */
export function formatConfiguredHourRecognition(
  source: any,
  assignedHours?: number,
): string {
  const mode = getConfiguredHourMode(
    source,
    getConfiguredMaximumHours(source) > 0 ? 'hasta' : 'sin_horas',
  );
  const hasAssignedHours = Number.isFinite(Number(assignedHours));
  const assigned = hasAssignedHours ? Math.max(0, Number(assignedHours)) : undefined;
  const maximum = getConfiguredMaximumHours(source);
  const minimum = getConfiguredMinimumHours(source);
  const percentage = getConfiguredPercentageValue(source);

  if (mode === 'sin_horas') return 'Informativo · 0h';
  if (mode === 'porcentaje') {
    const percentageLabel = percentage > 0 ? `${percentage}% del PTA` : 'Porcentaje del PTA';
    return assigned !== undefined ? `${percentageLabel} · ${assigned}h` : percentageLabel;
  }
  if (mode === 'fija') {
    const hours = assigned ?? maximum;
    return `${hours}h fijas`;
  }
  if (mode === 'intervalo') {
    const range = `${minimum || 0}–${maximum || 0}h`;
    return assigned !== undefined ? `${assigned}h asignadas · rango ${range}` : `Rango ${range}`;
  }
  return assigned !== undefined
    ? `${assigned}h asignadas · máximo ${maximum || 0}h`
    : `Hasta ${maximum || 0}h`;
}
