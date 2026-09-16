const COMMON_PREFIXES = [
  'SUBDIRECCION DE ',
  'SUBDIRECCION ',
  'OFICINA DE ',
  'OFICINA ',
  'DIRECCION DE ',
  'DIRECCION ',
  'DEPARTAMENTO DE ',
  'DEPARTAMENTO ',
  'GERENCIA DE ',
  'GERENCIA ',
  'AREA DE ',
  'AREA ',
];

const FILLER_WORDS = new Set([
  'DE', 'LA', 'EL', 'Y', 'EN', 'PARA', 'CON', 'DEL', 'POR', 'LOS', 'LAS',
]);

const MAX_SLUG_LEN = 13;

export function slugifyDependencia(nombre: string): string {
  const sinAcentos = nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

  let cleaned = sinAcentos.trim();
  for (const prefix of COMMON_PREFIXES) {
    if (cleaned.startsWith(prefix)) {
      cleaned = cleaned.slice(prefix.length).trim();
      break;
    }
  }

  if (!cleaned) {
    cleaned = sinAcentos;
  }

  const words = cleaned
    .split(/\s+/)
    .map((w) => w.replace(/[^A-Z0-9]/g, ''))
    .filter((w) => w.length > 0 && !FILLER_WORDS.has(w));

  if (words.length === 0) {
    return '';
  }

  const abbr = words
    .map((w) => w.slice(0, Math.min(3, w.length)))
    .join('-')
    .slice(0, MAX_SLUG_LEN);

  if (!abbr) {
    return '';
  }

  const tail = Math.floor(10 + Math.random() * 90);
  return `DEP-${abbr}-${tail}`;
}
