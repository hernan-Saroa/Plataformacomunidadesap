import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const locationDescriptor = Object.getOwnPropertyDescriptor(window, 'location')!;
function at(host: string) {
  const url = new URL('https://' + host);
  Object.defineProperty(window, 'location', { configurable: true, value: url });
}
async function environment(apiUrl = '', mode = 'production') {
  vi.stubEnv('VITE_API_URL', apiUrl);
  vi.stubEnv('MODE', mode);
  vi.resetModules();
  return import('./environment');
}
beforeEach(() => { at('comunidad.esap.edu.co'); });
afterEach(() => {
  Object.defineProperty(window, 'location', locationDescriptor);
  vi.unstubAllEnvs();
});

describe('URLs independientes de RUND', () => {
  it('mantiene /services en producción sin configuración explícita', async () => {
    expect((await environment()).config.API_BASE_URL).toBe('https://comunidad.esap.edu.co/services');
  });
  it('respeta una base configurada relativa y conserva el prefijo de gateway', async () => {
    expect((await environment('/services/')).config.API_BASE_URL).toBe('https://comunidad.esap.edu.co/services');
  });
  it('conserva una base externa configurada', async () => {
    expect((await environment('https://gateway.esap.example/services/')).config.API_BASE_URL).toBe('https://gateway.esap.example/services');
  });
  it('reescribe localhost al host público como el transporte anterior', async () => {
    expect((await environment('http://localhost:4000')).config.API_BASE_URL).toBe('https://comunidad.esap.edu.co:4000');
  });
  it('usa el gateway local 4000 en desarrollo', async () => {
    at('localhost:3119');
    expect((await environment('', 'development')).config.API_BASE_URL).toBe('https://localhost:4000');
  });
  it('mantiene los túneles y el frontend público de enlaces', async () => {
    at('rund-demo.trycloudflare.com');
    vi.stubEnv('VITE_PUBLIC_FRONTEND_URL', 'https://comunidad.esap.edu.co');
    const config = await environment();
    expect(config.getApiGatewayBaseUrl()).toBe('https://rund-demo.trycloudflare.com');
    expect(config.getDefaultHeaders()).toMatchObject({ 'X-Frontend-Base-Url': 'https://comunidad.esap.edu.co' });
  });
});
