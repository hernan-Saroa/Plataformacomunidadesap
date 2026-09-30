const NUMBERED_FUNCTION = /^\s*(?:funci[oó]n\s*)?\d{1,3}[.)-]\s+/i;

const cleanFunction = (value: string): string => value
  .replace(NUMBERED_FUNCTION, '')
  .replace(/^[\s\u2022\-–—]+/, '')
  .replace(/\s+/g, ' ')
  .replace(/\s+([,.;:])/g, '$1')
  .trim();

const functionLines = (value: string): Array<{ text: string; bullet: boolean }> =>
  value.replace(/\r\n?/g, '\n').split('\n').flatMap((line) =>
    line.split('\u2022').map((text, index) => ({ text: text.trim(), bullet: index > 0 })),
  ).filter(({ text }) => Boolean(text));

export const extractFunctionItems = (value: unknown): string[] => {
  // Each array entry is already a complete function, even if it contains line breaks.
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string')
      .map(cleanFunction).filter(Boolean);
  }

  const lines = functionLines(String(value ?? ''));
  if (!lines.length) return [];

  // Numbered cells may wrap a single function across several physical lines.
  // Without numbering, retain the template's one-function-per-line behavior.
  const entries: string[] = [];
  if (NUMBERED_FUNCTION.test(lines[0].text)) {
    for (const { text, bullet } of lines) {
      if (NUMBERED_FUNCTION.test(text) || bullet || !entries.length) entries.push(text);
      else entries[entries.length - 1] += ` ${text}`;
    }
  } else {
    entries.push(...lines.map(({ text }) => text));
  }
  return entries.map(cleanFunction).filter(Boolean);
};

export const splitFunctions = (value: unknown): string[] => {
  const seen = new Set<string>();
  return extractFunctionItems(value).filter((item) => {
    const key = item.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};
