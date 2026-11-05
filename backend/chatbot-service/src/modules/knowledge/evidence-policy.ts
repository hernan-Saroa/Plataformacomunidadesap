import type { DocumentSource } from '../isolucion/isolucion.service';
import { searchTerms } from '../isolucion/isolucion.service';
import { normalizePolicyText, unsafeAssistantText } from '../chat/content-policy';

const generic = new Set(('objetivo objetivos alcance requisitos soportes pasos plazos plazo tiempo dias fecha version codigo ' +
  'procedimiento procedimientos proceso procesos formato formatos documental documentales certificado certificacion certific ' +
  'actual vigente realiza realizar actividades explica explicar dime indica detalle detalles otra otro anterior segun isolucion esap').split(' '));

export function relevantSources(question: string, sources: DocumentSource[]): DocumentSource[] {
  const terms = searchTerms(question).filter((word) => !generic.has(word));
  const code = terms.find((word) => /^[a-z]{2,5}-[a-z]{1,5}-\d{2,5}$/.test(word));
  const travel = terms.length === 2 && terms.includes('viatic') && terms.includes('comision');
  return sources.filter((source) => {
    if (unsafeAssistantText(source.titulo + '\n' + source.extracto)) return false;
    if (code) return normalizePolicyText(source.codigo || source.id) === code;
    if (!terms.length) return false;
    const title = normalizePolicyText([source.titulo, source.proceso, source.codigo].filter(Boolean).join(' '));
    const tokens = title.split(/[^a-z0-9]+/);
    const matches = terms.filter((term) => {
      const stem = term.length > 5 ? term.replace(/(?:es|s)$/, '') : term;
      return tokens.some((word) => word.startsWith(stem));
    });
    return travel ? matches.length > 0 : matches.length >= Math.ceil(terms.length * 2 / 3);
  });
}

export function cleanEvidenceExcerpt(value: string): string {
  // Los destinos navegables los añade el servidor desde la fuente, nunca el texto.
  return value.replace(/https?:\/\/[^\s<>\])]+/gi, '[enlace en el documento]');
}

export function safeGeneratedAnswer(answer: string, sources: DocumentSource[], cited: string[]): boolean {
  if (unsafeAssistantText(answer) || /\[[^\]]+\]\(\s*[^)]+\)|<\/?[a-z][^>]*>/i.test(answer)) return false;
  const quantities = (text: string) => Array.from(normalizePolicyText(text)
    .matchAll(/(?<![\p{L}\p{N}.,+\-])[-+]?\d+(?:[.,]\d+)?\s*(?:dias?|horas?|meses?|anos?|pesos|cop|smmlv)\b/gu),
    (match) => match[0].replace(/\s+/g, ''));
  const evidence = new Set(quantities(sources.filter((source) => cited.includes(source.id)).map((source) => source.extracto).join(' ')));
  if (quantities(answer).some((amount) => !evidence.has(amount))) return false;
  const references = [...answer.matchAll(/\[(\d+)\]/g)].map((match) => Number(match[1]));
  return references.length > 0 && references.every((index) => index >= 1 && index <= sources.length
    && cited.includes(sources[index - 1].id))
    && cited.every((id) => references.some((index) => sources[index - 1]?.id === id));
}
