import type { ConfigService } from '@nestjs/config';
import type { DocumentSource, IsolucionService } from '../isolucion/isolucion.service';
import { searchTerms } from '../isolucion/isolucion.service';
import type { DocumentReaderService } from './document-reader.service';
import type { ChatTurn, KnowledgeAnswer } from './knowledge-answer.service';
import { cleanEvidenceExcerpt, relevantSources } from './evidence-policy';
import { contextQuestion } from '../chat/content-policy';

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
type SearchResult = { sources: DocumentSource[]; status: 'consultada' | 'no_disponible' | 'ocupada' | 'tiempo_agotado' };

export function substantiveText(value: string): string {
  return value.split(/\n/).map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => (line.split(/\s+/).length >= 4 || /^(?:\d+[.)]?\s*)?(?:objetivo|alcance|definiciones|responsabilidades)\b/i.test(line))
      && !/^(nombre|cargo|fecha|codigo|version|formato|elabor[oó]|revis[oó]|aprob[oó]|txt_|la impresion|la impresión)/i.test(line)
      && !/migraci[oó]n mapa de procesos|raz[oó]n de la actualizaci[oó]n|se ajust[oó] el nombre del formato/i.test(line))
    .join('\n').replace(/([^\n.!?:;])\n(?=[a-záéíóú])/g, '$1 ');
}

export function briefDocumentAnswer(question: string, sources: DocumentSource[]): KnowledgeAnswer {
  sources = relevantSources(question, sources);
  const words = searchTerms(question);
  const normalizedQuestion = normalize(question);
  const intent: string[] = Array.from(normalize(question).match(/objetiv\w*|alcanc\w*|requisit\w*|soport\w*|plaz\w*|legaliz\w*/g) || []);
  const required = /\bobjetiv\w*\b/.test(normalizedQuestion) ? /\bobjetiv\w*\b/
    : /\balcance\b/.test(normalizedQuestion) ? /\balcance\b/
    : /plazo|cuanto tiempo|cuantos dias|fecha limite/.test(normalizedQuestion) ? /\b(?:plaz\w*|dias?|horas?|meses?|fecha|termino)\b/
    : /requisit|soport|documentos necesarios/.test(normalizedQuestion) ? /\b(?:requisit\w*|soport\w*|adjunt\w*|present\w*|diligenc\w*|documentacion|necesari\w*)\b/
    : /cuanto (?:cuesta|debo pagar)|tarifa|costo/.test(normalizedQuestion) ? /\b(?:valor|cost\w*|tarifa|cop|pesos)\b|\$/ : undefined;
  let best: { text: string; score: number; source: DocumentSource } | undefined;
  for (const source of sources) {
    const clean = substantiveText(cleanEvidenceExcerpt(source.extracto));
    if (!clean) continue;
    const objective = /objetivo\s*[:.\s]+([\s\S]+?)(?=\n\s*(?:\d+[.)]?\s*)?(?:alcance|definiciones|responsab)|$)/i.exec(clean);
    if (intent.some((word) => word.startsWith('objetiv')) && objective) {
      best = { text: objective[1].trim().slice(0, 650), score: 1000, source }; break;
    }
    const scope = /alcance\s*[:.\s]+([\s\S]+?)(?=\n\s*(?:\d+[.)]?\s*)?(?:objetivo|definiciones|responsab|desarrollo)|$)/i.exec(clean);
    if (intent.some((word) => word.startsWith('alcanc')) && scope) {
      best = { text: scope[1].trim().slice(0, 650), score: 1000, source }; break;
    }
    const paragraphs = clean.split(/\n|(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚ])/).filter((part) => part.length >= 55 && part.length <= 1500);
    for (const paragraph of paragraphs) {
      const value = normalize(paragraph);
      if (required && !required.test(value)) continue;
      const score = words.reduce((total, word) => total + (value.includes(word) ? 1 : 0), 0)
        + intent.reduce((total, word) => total + (value.includes(word) ? 5 : 0), 0);
      if (score > 0 && (!best || score > best.score)) best = { text: paragraph.slice(0, 650), score, source };
    }
  }
  if (best) {
    return { contenido: `Según **${best.source.titulo}**:\n\n${best.text}${best.source.url ? `\n\nFuente: ${best.source.url}` : ''}`,
      metadatos: { motor: 'isolucion-lectura-rapida', fuentes: [best.source], estado_fuente: 'consultada' } };
  }
  const source = sources[0];
  return { contenido: source
    ? `Encontré **${source.titulo}**${source.codigo ? ` (${source.codigo})` : ''}, pero no tengo un pasaje verificado que responda esa pregunta. Puedes revisar el documento${source.url ? `: ${source.url}` : ' en Isolución'}.\n\nSi buscas una opción de la plataforma, indícame el módulo o el trámite concreto.`
    : 'No encontré información verificada para esa consulta. ¿Sobre qué módulo o trámite de ESAP necesitas ayuda?',
    metadatos: { motor: 'isolucion-catalogo', fuentes: source ? [source] : [], estado_fuente: source ? 'solo_metadatos' : 'sin_coincidencias' } };
}

// El camino HTTP tiene un presupuesto total de 1,6 s. La descarga y Qwen se
// preparan fuera de ese camino y nunca mantienen a la persona esperando al modelo.
export class FastKnowledge {
  private readonly searches = new Map<string, { sources: DocumentSource[]; expires: number }>();
  private readonly pending = new Map<string, Promise<SearchResult>>();
  private readonly answers = new Map<string, { value: KnowledgeAnswer; expires: number }>();
  private preparing = false;
  private generating = false;
  private closed = false;
  constructor(private readonly config: ConfigService, private readonly source: IsolucionService,
    private readonly reader: DocumentReaderService,
    private readonly prepare: (question: string, audience: 'private' | 'public', history: ChatTurn[]) => Promise<KnowledgeAnswer>) {}

  private key(question: string, audience: string) { return `${audience}:${normalize(question).replace(/\s+/g, ' ').trim()}`; }
  private async until<T>(pending: Promise<T>, ms: number, fallback: T): Promise<T> {
    let timer: ReturnType<typeof setTimeout>;
    return Promise.race([pending, new Promise<T>((resolve) => { timer = setTimeout(() => resolve(fallback), Math.max(0, ms)); })])
      .finally(() => clearTimeout(timer));
  }
  private search(question: string, audience: 'private' | 'public'): Promise<SearchResult> {
    const key = this.key(searchTerms(question).join(' '), audience), cached = this.searches.get(key);
    if (cached && cached.expires > Date.now()) return Promise.resolve({ sources: cached.sources, status: 'consultada' });
    if (this.pending.has(key)) return this.pending.get(key);
    if (this.pending.size >= 4) return Promise.resolve({ sources: [], status: 'ocupada' });
    const task = this.source.search(question, audience).then((sources): SearchResult => {
      if (this.searches.size >= 64) this.searches.delete(this.searches.keys().next().value);
      this.searches.set(key, { sources, expires: Date.now() + 30000 }); return { sources, status: 'consultada' };
    }).catch((): SearchResult => ({ sources: [], status: 'no_disponible' })).finally(() => this.pending.delete(key));
    this.pending.set(key, task); return task;
  }

  async answer(question: string, audience: 'private' | 'public', history: ChatTurn[]): Promise<KnowledgeAnswer> {
    const started = Date.now();
    const key = this.key(JSON.stringify([question, history.slice(-2)]), audience);
    const cached = this.answers.get(key);
    if (cached && cached.expires > Date.now()) return cached.value;
    const query = contextQuestion(question, history);
    const search = await this.until<SearchResult>(this.search(query, audience), 650, { sources: [], status: 'tiempo_agotado' });
    if (search.status !== 'consultada') return {
      contenido: 'No pude verificar la información de Isolución en este momento. Intenta nuevamente o indica el módulo para ayudarte a ubicar su servicio. No puedo confirmar pasos o requisitos sin consultar la fuente.',
      metadatos: { motor: 'isolucion-documentos', fuentes: [], estado_fuente: search.status },
    };
    const sources = relevantSources(query, search.sources);
    const ready = relevantSources(query, sources.map((source) => this.reader.cached(source))).filter((source) => source.contenidoDisponible);
    let result = ready;
    if (!result.length && sources.length) {
      // Una sola preparación de documentos/modelo a la vez para proteger recursos.
      if (!this.preparing) {
        this.preparing = true;
        const task = (async () => {
          const collected: DocumentSource[] = [];
          for (const source of sources) { if (this.closed) break; collected.push(await this.reader.enrich(source)); }
          return relevantSources(query, collected).filter((source) => source.contenidoDisponible);
        })();
        result = await this.until(task, 1600 - (Date.now() - started), []);
        void task.then((readable) => this.prepareCached(key, question, audience, history, readable))
          .catch(() => undefined);
        void task.finally(() => { this.preparing = false; }).catch(() => undefined);
      }
    }
    if (ready.length) void this.prepareCached(key, question, audience, history, ready);
    return briefDocumentAnswer(query, result.length ? result : sources.map((source) => ({ ...source, extracto: '' })));
  }

  private async prepareCached(key: string, question: string, audience: 'private' | 'public', history: ChatTurn[], readable: DocumentSource[]) {
    if (this.generating || this.closed || !readable.some((source) => substantiveText(source.extracto))) return;
    this.generating = true;
    try {
      const answer = await this.prepare(question, audience, history);
      if (answer.metadatos.motor === 'ollama-isolucion') {
        if (this.answers.size >= 64) this.answers.delete(this.answers.keys().next().value);
        this.answers.set(key, { value: answer, expires: Date.now() + 30000 });
      }
    } catch { /* la respuesta inmediata ya usa la evidencia disponible */ }
    finally { this.generating = false; }
  }

  async warm() {
    if (this.config.get('CHATBOT_AI_ENABLED') !== 'true' || !this.source.isPublicSearchEnabled()) return;
    for (const topic of ['viaticos', 'expedicion resoluciones', 'certificado laboral', 'plan trabajo academico', 'programacion academica']) {
      if (this.closed) return;
      for (const source of (await this.search(topic, 'public')).sources) { if (this.closed) return; await this.reader.enrich(source); }
    }
  }
  close() { this.closed = true; }
}
