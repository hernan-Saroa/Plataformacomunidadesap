const SECTION_PREFIXES: Record<string, { prefix: string; aliases?: string[] }> = {
  complementarias_docencia: { prefix: 'COMP' },
  academico_administrativas: { prefix: 'AADM', aliases: ['AA'] },
  capacitacion: { prefix: 'CAP' },
  seleccion: { prefix: 'SEL' },
  fortalecimiento: { prefix: 'FOR' },
  alto_gobierno: { prefix: 'EAG' },
};

const PREFIX_STOP_WORDS = new Set([
  'ACTIVIDADES', 'ACTIVIDAD', 'DIRECCION', 'DE', 'DEL', 'LA', 'LAS', 'LOS',
  'Y', 'EN', 'A', 'AL', 'SECCION',
]);

function normalizeWords(value: string): string[] {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter(Boolean);
}

function derivePrefix(sectionKey: string, sectionLabel?: string): string {
  const configured = SECTION_PREFIXES[sectionKey];
  if (configured) return configured.prefix;

  const words = normalizeWords(sectionKey || sectionLabel || 'ACT');
  const significant = words.filter(word => !PREFIX_STOP_WORDS.has(word));
  const source = significant.length > 0 ? significant : words;
  const acronym = source.map(word => word[0]).join('').slice(0, 6);
  if (acronym.length >= 3) return acronym;
  return (source[0] || 'ACT').slice(0, 6).padEnd(3, 'X');
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function createSectionActivityId({
  sectionKey,
  sectionLabel,
  existingIds,
  sectionItemCount,
}: {
  sectionKey: string;
  sectionLabel?: string;
  existingIds: string[];
  sectionItemCount: number;
}): { id: string; sequence: number; prefix: string } {
  const prefix = derivePrefix(sectionKey, sectionLabel);
  const aliases = SECTION_PREFIXES[sectionKey]?.aliases || [];
  const acceptedPrefixes = [prefix, ...aliases].map(escapeRegex).join('|');
  const pattern = new RegExp(`^(?:${acceptedPrefixes})_(\\d+)$`, 'i');
  const usedIds = new Set(existingIds.map(id => String(id || '').toUpperCase()));
  const usedSequences = new Set<number>();
  existingIds.forEach(id => {
    const match = String(id || '').match(pattern);
    if (match) usedSequences.add(Number(match[1]) || 0);
  });

  // El consecutivo representa la posición actual, no un histórico permanente.
  // Al eliminar bloques, sus números vuelven a estar disponibles.
  let sequence = Math.max(1, Number(sectionItemCount) + 1);
  let id = `${prefix}_${String(sequence).padStart(2, '0')}`;
  const isUsed = (candidate: number) => {
    const candidateId = `${prefix}_${String(candidate).padStart(2, '0')}`;
    return usedSequences.has(candidate) || usedIds.has(candidateId.toUpperCase());
  };

  if (isUsed(sequence)) {
    const reusable = Array.from({ length: Math.max(0, sequence - 1) }, (_, index) => index + 1)
      .find(candidate => !isUsed(candidate));
    if (reusable !== undefined) sequence = reusable;
    else while (isUsed(sequence)) sequence += 1;
    id = `${prefix}_${String(sequence).padStart(2, '0')}`;
  }

  return { id, sequence, prefix };
}
