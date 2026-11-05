import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CookieJar } from 'tough-cookie';
import { readBounded } from './bounded-http';
import { loadHtml } from './html-content';

// Sesión de una cuenta técnica de CONSULTA. No se usan cookies de personas ni la
// contraseña SQL para HTTP. Login es el único POST; los documentos se leen por GET.
@Injectable()
export class IsolucionWebSessionService {
  private jar = new CookieJar();
  private expires = 0;
  private retryAfter = 0;
  private connecting?: Promise<void>;
  constructor(private readonly config: ConfigService) {}

  private enabled() { return this.config.get('CHATBOT_ISOLUCION_WEB_AUTH_ENABLED') === 'true'; }

  private trusted(value: string): URL {
    const login = new URL(String(this.config.get('CHATBOT_ISOLUCION_WEB_LOGIN_URL') || ''));
    const url = new URL(value, login);
    const base = new URL(String(this.config.get('CHATBOT_ISOLUCION_DOCUMENT_BASE_URL') || ''));
    const appPath = login.pathname.slice(0, login.pathname.lastIndexOf('/') + 1);
    if (!['http:', 'https:'].includes(login.protocol) || login.username || login.password
      || login.origin !== base.origin || url.origin !== login.origin || !url.pathname.startsWith(appPath)
      || url.username || url.password) throw new Error('INVALID_DOCUMENT_AUTH_ORIGIN');
    return url;
  }

  private async request(url: URL, signal: AbortSignal, form?: URLSearchParams): Promise<Response> {
    const cookie = await this.jar.getCookieString(url.href);
    const response = await fetch(url, { method: form ? 'POST' : 'GET', signal, redirect: 'manual',
      headers: { ...(cookie ? { Cookie: cookie } : {}), ...(form ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}) },
      body: form?.toString() });
    for (const value of response.headers.getSetCookie()) await this.jar.setCookie(value, url.href);
    return response;
  }

  private async follow(url: URL, signal: AbortSignal, form?: URLSearchParams) {
    let current = this.trusted(url.href);
    let response = await this.request(current, signal, form);
    for (let index = 0; [301, 302, 303, 307, 308].includes(response.status); index++) {
      if (index >= 5) { await response.body?.cancel(); throw new Error('DOCUMENT_AUTH_REDIRECT_LIMIT'); }
      const next = this.trusted(new URL(response.headers.get('location') || '', current).href);
      await response.body?.cancel();
      current = next;
      // Nunca reenviar la contraseña a la URL de una redirección.
      response = await this.request(current, signal);
    }
    return { response, url: current };
  }

  async ensureSession(): Promise<void> {
    if (!this.enabled() || this.expires > Date.now()) return;
    if (this.connecting) return this.connecting;
    if (this.retryAfter > Date.now()) throw new Error('DOCUMENT_AUTH_UNAVAILABLE');
    this.connecting = (async () => {
      try {
        const login = this.trusted(String(this.config.get('CHATBOT_ISOLUCION_WEB_LOGIN_URL') || ''));
        const user = String(this.config.get('CHATBOT_ISOLUCION_WEB_USER') || '');
        const password = String(this.config.get('CHATBOT_ISOLUCION_WEB_PASSWORD') || '');
        if (!user || !password) throw new Error('DOCUMENT_AUTH_REQUIRED');
        const signal = AbortSignal.timeout(15000);
        this.jar = new CookieJar();
        const initial = await this.follow(login, signal);
        if (!initial.response.ok) throw new Error('DOCUMENT_AUTH_UNAVAILABLE');
        let $ = loadHtml(await readBounded(initial.response, 512 * 1024), initial.response.headers.get('content-type') || '');
        if (!$('input[name=UserText]').length || !$('input[name=PasswordText]').length) throw new Error('UNSUPPORTED_DOCUMENT_LOGIN');
        const form = new URLSearchParams();
        $('input[type=hidden][name]').each((_, element) => { form.set($(element).attr('name'), $(element).attr('value') || ''); });
        form.set('UserText', user); form.set('PasswordText', password);
        form.set('btnLogin', $('input[name=btnLogin]').attr('value') || '');
        const authenticated = await this.follow(login, signal, form);
        if (!authenticated.response.ok) throw new Error('DOCUMENT_AUTH_FAILED');
        $ = loadHtml(await readBounded(authenticated.response, 1024 * 1024), authenticated.response.headers.get('content-type') || '');
        if ($('input[type=password]').length) throw new Error('DOCUMENT_AUTH_FAILED');
        // Isolución combina sesión ASP.NET con ASP clásico. Es necesario seguir
        // ControlDeInicioV4 -> IdentificaUsuarioV4, igual que su pantalla de consulta.
        const frames = [...new Set($('iframe[src],frame[src]').map((_, element) =>
          this.trusted(new URL($(element).attr('src'), authenticated.url).href).href).get())].slice(0, 2);
        for (const frame of frames) {
          const initialized = await this.follow(new URL(frame), signal);
          if (!initialized.response.ok) throw new Error('DOCUMENT_AUTH_FAILED');
          await readBounded(initialized.response, 1024 * 1024);
        }
        this.expires = Date.now() + 5 * 60 * 1000;
      } catch {
        this.retryAfter = Date.now() + 30000;
        this.expires = 0;
        this.jar = new CookieJar();
        throw new Error('DOCUMENT_AUTH_FAILED');
      } finally { this.connecting = undefined; }
    })();
    return this.connecting;
  }

  async fetchDocument(url: URL, signal: AbortSignal): Promise<Response> {
    if (!this.enabled()) return fetch(url, { signal, redirect: 'manual', headers: { Accept: 'text/html,application/pdf,text/plain' } });
    await this.ensureSession();
    let response = await this.request(this.trusted(url.href), signal);
    if ([401, 403].includes(response.status)) {
      await response.body?.cancel(); this.expires = 0;
      await this.ensureSession();
      response = await this.request(this.trusted(url.href), signal);
    }
    return response;
  }
}
