import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readBounded } from './bounded-http';

@Injectable()
export class OllamaService {
  private busy = false;
  private retryAfter = 0;
  constructor(private readonly config: ConfigService) {}

  private settings() {
    const base = new URL(String(this.config.get('CHATBOT_OLLAMA_URL') || 'http://127.0.0.1:11436'));
    const model = String(this.config.get('CHATBOT_OLLAMA_MODEL') || 'qwen3.5:9b');
    const shared = this.config.get('CHATBOT_AI_SHARED_GPU') === 'true';
    const ocr = String(this.config.get('CHATBOT_AI_OCR_OLLAMA_URL') || '');
    if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password
      || base.search || base.hash || base.pathname !== '/' || model !== 'qwen3.5:9b'
      || (['localhost', '127.0.0.1', '[::1]', 'host.docker.internal'].includes(base.hostname) && base.port === '11434')
      || (shared && (!ocr || new URL(ocr).origin === base.origin))) throw new Error('INVALID_CHATBOT_AI_CONFIG');
    const integer = (key: string, fallback: number, min: number, max: number) => {
      const value = Number(this.config.get(key) ?? fallback);
      if (!Number.isInteger(value) || value < min || value > max) throw new Error('INVALID_CHATBOT_AI_CONFIG');
      return value;
    };
    return { base, model, shared, ocr,
      timeout: integer('CHATBOT_AI_TIMEOUT_MS', 180000, 5000, 180000),
      context: integer('CHATBOT_AI_CONTEXT_LENGTH', 4096, 2048, 8192),
    };
  }

  private async json(url: URL, signal: AbortSignal, body?: unknown) {
    const result = await fetch(url, { method: body ? 'POST' : 'GET', signal, redirect: 'error',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined });
    if (!result.ok) { await result.body?.cancel(); throw new Error('AI_UNAVAILABLE'); }
    return JSON.parse((await readBounded(result, 128 * 1024)).toString('utf8'));
  }

  async diagnostic(checkMonitor = false) {
    try {
      const { base, model, shared, ocr } = this.settings();
      const data = await this.json(new URL('/api/tags', base), AbortSignal.timeout(3000));
      const installed = data.models?.some((item) => item.name === model) === true;
      if (checkMonitor && shared) {
        try {
          const monitor = await this.json(new URL('/api/ps', ocr), AbortSignal.timeout(1500));
          const monitorAvailable = Array.isArray(monitor.models);
          return { available: installed && monitorAvailable, model, monitorAvailable, ocrBusy: monitorAvailable && monitor.models.length > 0 };
        } catch { return { available: false, model, monitorAvailable: false, ocrBusy: false }; }
      }
      return { available: installed, model };
    } catch { return { available: false, model: 'qwen3.5:9b' }; }
  }

  async generate(messages: { role: 'system' | 'user' | 'assistant'; content: string }[], ids: string[], budgetMs = 180000) {
    if (this.busy) throw new Error('AI_BUSY');
    if (Date.now() < this.retryAfter) throw new Error('AI_UNAVAILABLE');
    const settings = this.settings();
    this.busy = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Math.min(settings.timeout, Math.max(1000, budgetMs)));
    let monitor: ReturnType<typeof setInterval> | undefined;
    let checking = false;
    let submitted = false;
    let ocrBecameBusy = false;
    try {
      if (settings.shared) {
        const check = async () => {
          const data = await this.json(new URL('/api/ps', settings.ocr), AbortSignal.timeout(1500));
          if (!Array.isArray(data.models) || data.models.length) throw new Error('OCR_BUSY');
        };
        await check();
        // Prioridad al OCR. Esta vigilancia reduce contención pero no sustituye
        // hardware separado ni un bloqueo común en ambos servicios.
        monitor = setInterval(() => {
          if (checking) return;
          checking = true;
          void check().catch(() => { ocrBecameBusy = true; controller.abort(); }).finally(() => { checking = false; });
        }, 1000);
      }
      submitted = true;
      const result = await this.json(new URL('/api/chat', settings.base), controller.signal, {
        model: settings.model, stream: false, think: false, keep_alive: 0,
        messages,
        format: { type: 'object', additionalProperties: false, required: ['respuesta', 'fuentes'],
          properties: { respuesta: { type: 'string' }, fuentes: { type: 'array', uniqueItems: true,
            items: ids.length ? { type: 'string', enum: ids } : { type: 'string' }, maxItems: ids.length } } },
        options: { num_ctx: settings.context, num_predict: 512, num_thread: 2, temperature: 0.2 },
      });
      if (result.model !== settings.model || result.done !== true || result.done_reason === 'length') throw new Error('AI_INVALID_RESPONSE');
      const parsed = JSON.parse(result.message?.content || '');
      if (typeof parsed.respuesta !== 'string' || !parsed.respuesta.trim() || parsed.respuesta.length > 5000
        || !Array.isArray(parsed.fuentes) || parsed.fuentes.length > ids.length
        || parsed.fuentes.some((id) => !ids.includes(id)) || (ids.length && !parsed.fuentes.length)) throw new Error('AI_INVALID_RESPONSE');
      const references = [...parsed.respuesta.matchAll(/\[(\d+)\]/g)].map((match) => Number(match[1]));
      if (references.some((index) => index < 1 || index > ids.length || !parsed.fuentes.includes(ids[index - 1]))) throw new Error('AI_INVALID_RESPONSE');
      return { respuesta: parsed.respuesta.trim(), fuentes: [...new Set<string>(parsed.fuentes)], modelo: settings.model };
    } catch (error) {
      const ocrBusy = (error as Error).message === 'OCR_BUSY' || ocrBecameBusy;
      if (!ocrBusy) this.retryAfter = Date.now() + 10000;
      throw new Error(ocrBusy ? 'OCR_BUSY' : 'AI_UNAVAILABLE');
    } finally {
      clearTimeout(timeout);
      if (monitor) clearInterval(monitor);
      if (submitted) await this.json(new URL('/api/generate', settings.base), AbortSignal.timeout(3000),
        { model: settings.model, stream: false, keep_alive: 0 }).catch(() => undefined);
      this.busy = false;
    }
  }
}
