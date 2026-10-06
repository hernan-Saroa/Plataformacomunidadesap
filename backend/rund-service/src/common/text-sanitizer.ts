const MOJIBAKE_PATTERN = /(?:Ãƒ.|Ã‚.|Ã¢.|Ã°Å¸|ï¿½|�)/;

const BROKEN_SPANISH_REPAIRS: Array<[RegExp, string]> = [
  [/\bMaestr[�?]a\b/gi, 'Maestría'],
  [/\bCiudadan[�?]a\b/gi, 'Ciudadanía'],
  [/\bCategor[�?]a\b/gi, 'Categoría'],
  [/\bDedicaci[�?]n\b/gi, 'Dedicación'],
  [/\bSituaci[�?]n\b/gi, 'Situación'],
  [/\bVinculaci[�?]n\b/gi, 'Vinculación'],
  [/\bEvaluaci[�?]n\b/gi, 'Evaluación'],
  [/\bInvestigaci[�?]n\b/gi, 'Investigación'],
  [/\bAdministraci[�?]n\b/gi, 'Administración'],
  [/\bFormaci[�?]n\b/gi, 'Formación'],
  [/\bEspecializaci[�?]n\b/gi, 'Especialización'],
  [/\bResoluci[�?]n\b/gi, 'Resolución'],
  [/\bN[uú]cleo\b/gi, 'Núcleo'],
  [/\bTem[aá]tico\b/gi, 'Temático'],
  [/\bAcad[eé]mico\b/gi, 'Académico'],
  [/\bAcad[eé]mica\b/gi, 'Académica'],
  [/\bP[uú]blica\b/gi, 'Pública'],
  [/\bP[uú]blico\b/gi, 'Público'],
  [/\bC[aá]tedra\b/gi, 'Cátedra'],
  [/\bG[eé]nero\b/gi, 'Género'],
];

const SIMPLE_MOJIBAKE_REPAIRS: Array<[RegExp, string]> = [
  [/ÃƒÂ±/g, '\u00f1'],
  [/Ã±/g, '\u00f1'],
  [/ÃƒÂ¡/g, '\u00e1'],
  [/Ã¡/g, '\u00e1'],
  [/ÃƒÂ©/g, '\u00e9'],
  [/Ã©/g, '\u00e9'],
  [/ÃƒÂ­/g, '\u00ed'],
  [/Ã­/g, '\u00ed'],
  [/ÃƒÂ³/g, '\u00f3'],
  [/Ã³/g, '\u00f3'],
  [/ÃƒÂº/g, '\u00fa'],
  [/Ãº/g, '\u00fa'],
  [/ÃƒÂ‘/g, '\u00d1'],
  [/Ã‘/g, '\u00d1'],
];

function looksLikeMojibake(value: string): boolean {
  return MOJIBAKE_PATTERN.test(value);
}

function preserveCase(template: string, source: string): string {
  if (source === source.toUpperCase()) return template.toUpperCase();
  if (source === source.toLowerCase()) return template.toLowerCase();
  if (source[0] === source[0]?.toUpperCase()) return template[0].toUpperCase() + template.slice(1);
  return template;
}

function repairKnownBrokenSpanish(value: string): string {
  let result = value;
  for (const [pattern, replacement] of SIMPLE_MOJIBAKE_REPAIRS) {
    result = result.replace(pattern, replacement);
  }
  for (const [pattern, replacement] of BROKEN_SPANISH_REPAIRS) {
    result = result.replace(pattern, (match) => preserveCase(replacement, match));
  }
  return result;
}

export function sanitizeText(value: string): string {
  let result = value;
  for (let attempt = 0; attempt < 2; attempt++) {
    if (!looksLikeMojibake(result)) break;
    const repaired = Buffer.from(result, 'latin1').toString('utf8');
    if (!repaired || repaired === result) break;
    result = repaired;
  }
  return repairKnownBrokenSpanish(result);
}

export function sanitizeDeepStrings<T>(value: T): T {
  if (typeof value === 'string') return sanitizeText(value) as T;
  if (Array.isArray(value)) return value.map((item) => sanitizeDeepStrings(item)) as T;
  if (value instanceof Date || value === null || value === undefined) return value;
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, inner]) => [key, sanitizeDeepStrings(inner)]),
    ) as T;
  }
  return value;
}
