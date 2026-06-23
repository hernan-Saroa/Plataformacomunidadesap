import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
// pdf-parse no trae tipos.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require('pdf-parse');

export interface DocumentTypeValidationResult {
  validated: boolean;
  matched: boolean;
  score: number;
  matchedKeywords: string[];
  expectedKeywords: string[];
  reason: string;
  extractable: boolean;
}

const STOPWORDS = new Set([
  'de', 'del', 'la', 'el', 'los', 'las', 'y', 'o', 'a', 'en', 'por', 'para',
  'con', 'un', 'una', 'al', 'su', 'sus', 'que', 'se', 'es', 'documento',
  'acta', 'soporte', 'archivo', 'tipo', 'general', 'esap', 'docente',
]);

function normalize(text: string): string {
  return (text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Valida (SOFT, nunca lanza) que el contenido de un PDF corresponda al tipo de
 * documento esperado, usando coincidencia de palabras clave derivadas del
 * nombre + descripción del tipo (config documental general o individual).
 */
@Injectable()
export class DocumentTypeValidatorService {
  private readonly logger = new Logger(DocumentTypeValidatorService.name);
  private static readonly MATCH_THRESHOLD = 0.34;

  buildKeywords(...sources: (string | undefined | null)[]): string[] {
    const set = new Set<string>();
    for (const src of sources) {
      if (!src) continue;
      const expanded = String(src).replace(/_/g, ' ');
      for (const word of normalize(expanded).split(' ')) {
        if (word.length >= 4 && !STOPWORDS.has(word)) set.add(word);
      }
    }
    return Array.from(set);
  }

  async validate(params: {
    filePath?: string;
    buffer?: Buffer;
    originalName?: string;
    expectedName?: string;
    expectedDescription?: string;
    keywords?: string[];
  }): Promise<DocumentTypeValidationResult> {
    const expectedKeywords =
      params.keywords && params.keywords.length
        ? params.keywords
        : this.buildKeywords(params.expectedName, params.expectedDescription);

    const ext = (params.originalName || params.filePath || '').toLowerCase().split('.').pop() || '';

    const base: DocumentTypeValidationResult = {
      validated: false, matched: false, score: 0,
      matchedKeywords: [], expectedKeywords, reason: '', extractable: false,
    };

    if (ext !== 'pdf') return { ...base, reason: `Formato .${ext || '?'}: validación de contenido omitida (solo PDF).` };
    if (!expectedKeywords.length) return { ...base, reason: 'Sin palabras clave para el tipo: no se valida contenido.' };

    let text = '';
    try {
      const buffer = params.buffer || (params.filePath ? fs.readFileSync(params.filePath) : null);
      if (!buffer) return { ...base, reason: 'No se pudo leer el archivo para validar.' };
      const parsed = await pdfParse(buffer);
      text = normalize(parsed?.text || '');
    } catch (e: any) {
      this.logger.warn(`No se pudo extraer texto del PDF: ${e?.message || e}`);
      return { ...base, reason: 'No se pudo extraer texto del PDF; validación omitida.' };
    }

    if (text.length < 20) {
      return { ...base, extractable: false, reason: 'PDF sin texto extraíble (posible escaneo); validación de contenido omitida.' };
    }

    const matchedKeywords = expectedKeywords.filter((kw) => text.includes(kw));
    const score = expectedKeywords.length ? matchedKeywords.length / expectedKeywords.length : 0;
    const matched = score >= DocumentTypeValidatorService.MATCH_THRESHOLD;

    return {
      validated: true, extractable: true, matched,
      score: Number(score.toFixed(2)), matchedKeywords, expectedKeywords,
      reason: matched
        ? `El contenido coincide con el tipo esperado (${matchedKeywords.length}/${expectedKeywords.length} términos).`
        : `El contenido NO parece corresponder al tipo esperado (${matchedKeywords.length}/${expectedKeywords.length} términos). Verifica el archivo.`,
    };
  }
}
