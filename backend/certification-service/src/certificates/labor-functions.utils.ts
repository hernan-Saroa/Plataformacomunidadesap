import { createHash } from 'crypto';

export const normalizeLaborFunctionText = (value: unknown): string => {
  const base = String(value ?? '').replace(/\u00a0/g, ' ').trim().toLowerCase();
  const normalized =
    typeof base.normalize === 'function' ? base.normalize('NFD') : base;
  return normalized
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

export const normalizeGradeCode = (value: unknown): string | null => {
  const digits = String(value ?? '').replace(/\D+/g, '');
  if (!digits) return null;
  const normalized = digits.replace(/^0+(?=\d)/, '');
  return normalized.padStart(2, '0');
};

export const normalizePositionCode = (value: unknown): string => {
  const raw = String(value ?? '').trim();
  const digits = raw.replace(/\D+/g, '');
  if (!digits) return raw.toUpperCase();
  return digits.length <= 4 ? digits.padStart(4, '0') : digits;
};

export const normalizeCombinedPositionCode = (
  value: unknown,
  gradeValue?: unknown,
): string => {
  const raw = String(value ?? '').trim();
  const digits = raw.replace(/\D+/g, '');
  const grade = normalizeGradeCode(gradeValue);
  if (!digits) return raw.toUpperCase();

  if (grade && digits.length > 4 && digits.endsWith(grade)) {
    const base = digits.slice(0, -grade.length).padStart(4, '0');
    return `${base}${grade}`;
  }

  const positionCode =
    digits.length <= 4 ? digits.padStart(4, '0') : digits;
  return grade && digits.length <= 4
    ? `${positionCode}${grade}`
    : positionCode;
};

export const buildLaborFunctionMatchKey = (input: {
  combinedCode: string;
  hierarchicalLevel?: unknown;
  positionName?: unknown;
  department?: unknown;
  internalGroup?: unknown;
  costCenter?: unknown;
}): string => {
  const normalizedContext = [
    normalizeLaborFunctionText(input.hierarchicalLevel),
    normalizeLaborFunctionText(input.positionName),
    normalizeLaborFunctionText(input.department),
    normalizeLaborFunctionText(input.internalGroup),
    normalizeLaborFunctionText(input.costCenter),
  ].join('|');
  const fingerprint = createHash('sha256')
    .update(normalizedContext, 'utf8')
    .digest('hex');
  return `${input.combinedCode}|${fingerprint}`;
};

const cleanFunctionDescription = (value: string): string =>
  value
    .replace(/^[\s\u2022\-–—]+/, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:])/g, '$1')
    .trim();

export const parseLaborFunctionsRaw = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.flatMap((item) => parseLaborFunctionsRaw(item));
  }

  const text = String(value ?? '').replace(/\r\n?/g, '\n').trim();
  if (!text) return [];

  const marker = /(?:^|[\s;])(?:funci[oó]n\s*)?(\d{1,3})\s*[.)-]\s*/gi;
  const matches = Array.from(text.matchAll(marker));
  const numbered: string[] = [];

  if (matches.length) {
    matches.forEach((match, index) => {
      const start = (match.index || 0) + match[0].length;
      const end =
        index + 1 < matches.length ? matches[index + 1].index : text.length;
      const description = cleanFunctionDescription(text.slice(start, end));
      if (description) numbered.push(description);
    });
  }

  const fallback = text
    .split(/\n+|\s*[•]\s*|\s*;\s*(?=[A-ZÁÉÍÓÚÑ])/)
    .map((item) => item.replace(/^\s*\d{1,3}\s*[.)-]\s*/, ''))
    .map(cleanFunctionDescription)
    .filter(Boolean);

  return numbered.length ? numbered : fallback;
};

export const parseLaborFunctions = (value: unknown): string[] =>
  deduplicateFunctions(parseLaborFunctionsRaw(value));

export type LaborFunctionDuplicate = {
  duplicateOrdinal: number;
  originalOrdinal: number;
  description: string;
};

export const findDuplicateLaborFunctions = (
  items: string[],
): LaborFunctionDuplicate[] => {
  const seen = new Map<string, number>();
  const duplicates: LaborFunctionDuplicate[] = [];

  items.forEach((description, index) => {
    const key = normalizeLaborFunctionText(description);
    if (!key) return;

    const originalOrdinal = seen.get(key);
    if (originalOrdinal !== undefined) {
      duplicates.push({
        duplicateOrdinal: index + 1,
        originalOrdinal,
        description,
      });
      return;
    }

    seen.set(key, index + 1);
  });

  return duplicates;
};

const deduplicateFunctions = (items: string[]): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    const key = normalizeLaborFunctionText(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
};
