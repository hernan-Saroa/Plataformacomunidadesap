import { Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { load } from 'cheerio';
import { spawn } from 'node:child_process';
import { DocumentSource } from '../isolucion/isolucion.service';
import { readBounded } from './bounded-http';
import { IsolucionWebSessionService } from './isolucion-web-session.service';
import { loadHtml } from './html-content';

export function plainText(value: string): string {
  const $ = load(value || '');
  $('script,style,iframe,object,noscript,form,nav,footer,header').remove();
  $('br,p,div,li,tr,h1,h2,h3,h4').append('\n');
  return $.text().replace(/[\t ]+/g, ' ').replace(/\n\s*\n/g, '\n').trim();
}

@Injectable()
export class DocumentReaderService {
  private readonly cache = new Map<string, { text: string; url: string; expires: number }>();
  constructor(private readonly config: ConfigService,
    @Optional() private readonly session?: IsolucionWebSessionService) {}

  cached(source: DocumentSource): DocumentSource {
    const inline = plainText(source.extracto);
    if (inline.length > 30) return { ...source, extracto: inline, contenidoDisponible: true };
    const existing = source.url ? this.cache.get(source.url) : undefined;
    if (existing && existing.expires > Date.now()) return { ...source, extracto: existing.text, url: existing.url, contenidoDisponible: true };
    return { ...source, extracto: '', contenidoDisponible: false };
  }

  private allowed(value: string): URL {
    const base = String(this.config.get('CHATBOT_ISOLUCION_DOCUMENT_BASE_URL') || '');
    if (!base) throw new Error('DOCUMENT_BASE_URL_REQUIRED');
    const url = new URL(value, base);
    const baseUrl = new URL(base);
    const origins = [baseUrl.origin, ...String(this.config.get('CHATBOT_ISOLUCION_DOCUMENT_ORIGINS') || '').split(',').filter(Boolean)];
    const paths = String(this.config.get('CHATBOT_ISOLUCION_DOCUMENT_PATHS') || '/BancoConocimientoIsolucionEsap/').split(',').filter(Boolean);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password
      || !origins.includes(url.origin) || !paths.some((path) => path.startsWith('/') && url.pathname.startsWith(path))) {
      throw new Error('DOCUMENT_URL_NOT_ALLOWED');
    }
    url.hash = '';
    return url;
  }

  async enrich(source: DocumentSource): Promise<DocumentSource> {
    const inline = plainText(source.extracto);
    if (inline.length > 30) return { ...source, extracto: inline, contenidoDisponible: true };
    if (this.config.get('CHATBOT_ISOLUCION_FETCH_DOCUMENTS') !== 'true' || !source.url) {
      return { ...source, extracto: '', contenidoDisponible: false };
    }
    try {
      const url = this.allowed(source.url);
      const existing = this.cache.get(url.href);
      let text = existing && existing.expires > Date.now() ? existing.text : '';
      let documentUrl = existing && existing.expires > Date.now() ? existing.url : url.href;
      if (!text) {
        await this.session?.ensureSession();
        const retrieved = await this.fetchText(url, 0, AbortSignal.timeout(8000));
        text = retrieved.text; documentUrl = retrieved.url;
        if (text.length < 30) throw new Error('DOCUMENT_WITHOUT_TEXT');
        if (this.cache.size >= 32) this.cache.delete(this.cache.keys().next().value);
        this.cache.set(url.href, { text, url: documentUrl, expires: Date.now() + 300000 });
      }
      return { ...source, url: documentUrl, extracto: text.slice(0, 16000), contenidoDisponible: true };
    } catch {
      // Una página de error o login nunca se convierte en contenido documental.
      return { ...source, extracto: '', contenidoDisponible: false };
    }
  }

  private async fetchText(url: URL, depth: number, signal: AbortSignal): Promise<{ text: string; url: string }> {
    if (depth > 2) throw new Error('DOCUMENT_REDIRECT_LIMIT');
    const response = this.session
      ? await this.session.fetchDocument(this.allowed(url.href), signal)
      : await fetch(this.allowed(url.href), { signal, redirect: 'manual', headers: { Accept: 'text/html,application/pdf,text/plain' } });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      await response.body?.cancel();
      return this.fetchText(this.allowed(new URL(response.headers.get('location') || '', url).href), depth + 1, signal);
    }
    if (!response.ok) { await response.body?.cancel(); throw new Error('DOCUMENT_HTTP_ERROR'); }
    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    const bytes = await readBounded(response, 5 * 1024 * 1024);
    if (bytes.subarray(0, 5).toString() === '%PDF-') return { text: await this.pdfText(bytes), url: url.href };
    if (/\.docx$/i.test(url.pathname) || contentType.includes('wordprocessingml.document')) return { text: await this.fileText(bytes, 'docx'), url: url.href };
    if (contentType.startsWith('text/plain')) return { text: bytes.toString('utf8').slice(0, 16000), url: url.href };
    if (!contentType.includes('html')) throw new Error('DOCUMENT_UNSUPPORTED_FORMAT');
    const $ = loadHtml(bytes, contentType);
    if ($('input[type=password]').length || /pagina\s*login|iniciar sesi[oó]n/i.test($('title').text())) throw new Error('DOCUMENT_LOGIN_REQUIRED');
    const embedded = $('iframe[src],object[data],embed[src]').first();
    const href = embedded.attr('src') || embedded.attr('data');
    if (href) return this.fetchText(this.allowed(new URL(href, url).href), depth + 1, signal);
    // Las fichas ASP suelen contener solo encabezados y un enlace «Ver Documento».
    // Seguir únicamente el documento principal, nunca botones de gestión/edición.
    const attachment = $('a[href]').filter((_, element) => /^ver\s+(?:el\s+)?documento$/i.test($(element).text().trim())).first().attr('href');
    if (attachment) return this.fetchText(this.allowed(new URL(attachment, url).href), depth + 1, signal);
    $('script,style,noscript,form,nav,footer,header').remove();
    $('br,p,div,li,tr,h1,h2,h3,h4').append('\n');
    const text = $('main,article').first().text() || $('body').text();
    if (/Microsoft.*(?:error|Native Client)|IIS.*Detailed Error/i.test(text)) throw new Error('DOCUMENT_ERROR_PAGE');
    return { text: text.replace(/[\t ]+/g, ' ').replace(/\n\s*\n/g, '\n').trim().slice(0, 16000), url: url.href };
  }

  private pdfText(bytes: Buffer): Promise<string> {
    return this.fileText(bytes, 'pdf');
  }

  private fileText(bytes: Buffer, format: 'pdf' | 'docx'): Promise<string> {
    // Proceso aislado: una caída nativa del parser no puede tumbar el servidor HTTP.
    return new Promise((resolve, reject) => {
      const child = spawn(process.execPath, ['--max-old-space-size=128', '-e', `
        process.once('message', async (workerData) => {
          const bytes = Buffer.from(workerData.bytes, 'base64');
          let text;
          try {
          if (workerData.format === 'docx') {
            const result = await require(workerData.modulePath).extractRawText({ buffer: bytes });
            text = result.value;
          } else {
            const { PDFParse } = require(workerData.modulePath);
            const parser = new PDFParse({ data: new Uint8Array(bytes), isEvalSupported: false });
            try { text = (await parser.getText({ first: 15 })).text; }
            finally { await parser.destroy(); }
          }
          process.send({ text: text.slice(0, 16000) }, () => process.exit(0));
          } catch { process.send({ error: true }, () => process.exit(1)); }
        });
      `], { stdio: ['ignore', 'ignore', 'ignore', 'ipc'], windowsHide: true,
        env: { PATH: process.env.PATH || '', SystemRoot: process.env.SystemRoot || '', TEMP: process.env.TEMP || '', TMP: process.env.TMP || '' } });
      const timer = setTimeout(() => { child.kill(); reject(new Error('DOCUMENT_PARSE_TIMEOUT')); }, 5000);
      child.once('message', (message: { text?: string; error?: boolean }) => {
        clearTimeout(timer);
        if (typeof message.text === 'string' && !message.error) resolve(message.text.slice(0, 16000));
        else reject(new Error('DOCUMENT_PARSE_FAILED'));
      });
      child.once('error', () => { clearTimeout(timer); reject(new Error('DOCUMENT_PARSE_FAILED')); });
      child.once('exit', () => { clearTimeout(timer); reject(new Error('DOCUMENT_PARSE_FAILED')); });
      child.send({ bytes: bytes.toString('base64'), format, modulePath: require.resolve(format === 'pdf' ? 'pdf-parse' : 'mammoth') }, (error) => {
        if (error) { clearTimeout(timer); child.kill(); reject(new Error('DOCUMENT_PARSE_FAILED')); }
      });
    });
  }
}
