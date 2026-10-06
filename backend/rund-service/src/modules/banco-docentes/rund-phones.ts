// Keep this contract aligned with the RUND frontend/backend phone tests.
export const RUND_PHONE_MAX_LENGTH = 255;
export const RUND_PHONE_ERROR = 'Ingrese cada tel\u00e9fono con 7 a 15 d\u00edgitos; separe los n\u00fameros con un guion (ej.: 3106791787 - 6723168).';

/** Normalize complete numbers independently; never infer a split from joined digits. */
export function normalizeRundPhones(value: unknown): string | null {
  if (value === null || value === undefined || String(value).trim() === '') return '';
  const text = String(value).trim().replace(/[\u2010-\u2015\u2212]/g, '-');
  if (text.length > RUND_PHONE_MAX_LENGTH || /[^\d+\s().,;/\-]/.test(text)) return null;
  const numbers: string[] = [];
  for (const group of text.split(/[,;/]|\r?\n|\r/).flatMap(group => /^\+?\d{7,15}(?:\s+\+?\d{7,15})+$/.test(group.trim()) ? group.trim().split(/\s+/) : [group])) {
    // Spaced dashes always delimit numbers. Unspaced dashes delimit full numbers;
    // short groups such as 310-679-1787 can still format a single number.
    for (const part of group.split(/\s+-\s*|\s*-\s+/)) {
      const chunks = part.split('-');
      const complete = chunks.some(chunk => chunk.replace(/\D/g, '').length >= 7);
      const formattedPrefix = chunks.length === 2 && /^\+?\d{1,3}$/.test(chunks[0].trim()) && /^\d{7,10}$/.test(chunks[1].trim());
      const candidates = complete && !formattedPrefix ? chunks : [part];
      for (const candidate of candidates) {
        const number = candidate.replace(/[\s().-]/g, '');
        if (!/^\+?\d{7,15}$/.test(number)) return null;
        numbers.push(number);
      }
    }
  }
  const result = numbers.join(' - ');
  return result.length <= RUND_PHONE_MAX_LENGTH ? result : null;
}

/** Restore only the known destructive import result, never a later contact edit. */
export function recoverOriginalRundPhone(saved: string | null, original: unknown): string | null {
  const normalized = normalizeRundPhones(original);
  if (!normalized || normalized === saved) return null;
  const text = String(original).trim();
  const candidates = (text.match(/\+?\d[\d\s().-]{5,}\d/g) || []).map(candidate => candidate.replace(/[^\d+]/g, '')).filter(Boolean);
  const preferred = candidates.find(candidate => candidate.replace(/\D/g, '').length >= 10) || candidates[0] || text.replace(/[^\d+]/g, '');
  const oldImported = (preferred || text.replace(/\s+/g, ' ').trim()).slice(0, 20);
  return saved === oldImported ? normalized : null;
}
