export type DedicacionCodigo = 'TC' | 'MT' | 'HC';

/** Texto oficial de cada dedicación; es el que ve el docente en el PTA y las demás pantallas. */
export const DEDICACION_LABELS: Record<DedicacionCodigo, string> = {
  TC: 'Tiempo Completo',
  MT: 'Medio Tiempo',
  HC: 'Hora Cátedra',
};

const compact = (value: unknown): string => String(value ?? '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

/** Código de dedicación que representa un texto (código o etiqueta); null si no lo reconoce. */
export function dedicacionCodeOf(value: unknown): DedicacionCodigo | null {
  const n = compact(value);
  if (!n) return null;
  if (n === 'mt' || n.includes('mediotiempo')) return 'MT';
  if (n === 'hc' || n.includes('catedra')) return 'HC';
  if (n === 'tc' || n.includes('tiempocompleto')) return 'TC';
  return null;
}

/**
 * Texto de dedicación que se guarda en `dedicacionDisplay`.
 * Se conserva una etiqueta enviada o ya guardada solo si describe el mismo código y no es el código a secas
 * («HC»); en cualquier otro caso se usa el texto oficial. Así, cambiar la dedicación en una edición nunca deja
 * el texto de la anterior («Tiempo Completo») ni el código crudo, que es lo que el docente ve en su PTA.
 */
export function resolveDedicacionDisplay(
  code: string | null | undefined,
  providedLabel?: string | null,
  existingDisplay?: string | null,
): string | null {
  const codigo = dedicacionCodeOf(code);
  const clean = (label?: string | null) => String(label ?? '').trim();
  if (!codigo) return clean(providedLabel) || clean(existingDisplay) || null;
  const usable = (label?: string | null): string | null => {
    const text = clean(label);
    if (!text || /^(tc|mt|hc)$/i.test(text)) return null;
    return dedicacionCodeOf(text) === codigo ? text : null;
  };
  return usable(providedLabel) ?? usable(existingDisplay) ?? DEDICACION_LABELS[codigo];
}
