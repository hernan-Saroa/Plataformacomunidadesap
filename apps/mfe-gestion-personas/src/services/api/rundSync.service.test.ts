import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const fixture = vi.hoisted(() => ({ mode: 'gateway', rundUrl: 'http://localhost:3016' }));
vi.mock('../../../config/environment', () => ({
  config: { API_BASE_URL: 'https://gateway.test/services/', API_TIMEOUT: 30000, API_RETRY_ATTEMPTS: 3, API_RETRY_DELAY: 0 },
  get API_MODE() { return fixture.mode; },
  get MICROSERVICE_URLS() { return { auth: 'http://localhost:3001', rund: fixture.rundUrl, pta: 'http://localhost:3003' }; },
  getDefaultHeaders: () => ({ 'Content-Type': 'application/json' }),
  CORS_CONFIG: { credentials: 'include', mode: 'cors' },
  API_ENDPOINTS: { AUTH: { REFRESH: '/auth/api/v1/refresh' } },
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), warning: vi.fn(), error: vi.fn() } }));

import { toast, type Action } from 'sonner';
import { apiClient } from './apiClient';
import { syncRundProfilesFromAuth, syncRundProfilesWithFeedback } from './rundSync.service';

const summary = { total: 3, created: 1, skipped: 2, failed: 0 };
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fixture.mode = 'gateway';
  fixture.rundUrl = 'http://localhost:3016';
  fetchMock = vi.fn().mockResolvedValue(response({ success: true, data: summary }));
  vi.stubGlobal('fetch', fetchMock);
  vi.clearAllMocks();
});
afterEach(() => { vi.unstubAllGlobals(); });

describe('transporte real del consumidor de perfiles RUND', () => {
  it('usa gateway, cookies y cuerpo vacío sin copiar identidades ni credenciales', async () => {
    expect(await syncRundProfilesFromAuth()).toEqual(summary);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://gateway.test/services/rund/api/v1/banco-docentes/sync-from-auth');
    expect(options).toMatchObject({ method: 'POST', body: '{}', credentials: 'include', mode: 'cors' });
    expect(options.headers).not.toHaveProperty('Authorization');
    expect(options).not.toHaveProperty('preserveResponse');
    expect(options).not.toHaveProperty('retries');
  });

  it.each(['http://localhost:3016', 'https://rund.test/base'])('respeta el servicio directo %s', async url => {
    fixture.mode = 'direct';
    fixture.rundUrl = url;
    await syncRundProfilesFromAuth();
    expect(fetchMock.mock.calls[0][0]).toBe(`${url}/banco-docentes/sync-from-auth`);
  });

  it('admite el sobre del interceptor además del sobre del controlador', async () => {
    fetchMock.mockResolvedValue(response({ success: true, data: { success: true, data: summary } }));
    expect(await syncRundProfilesFromAuth()).toEqual(summary);
  });

  it.each([
    null, {}, [], '<html>',
    { success: false, data: summary },
    { success: true, data: { success: false, data: summary } },
    { ...summary, total: 4 }, { ...summary, failed: -1 },
    { ...summary, total: '3' }, { ...summary, total: 3.5 },
    { total: Number.MAX_SAFE_INTEGER + 1, created: Number.MAX_SAFE_INTEGER + 1, skipped: 0, failed: 0 },
  ])('rechaza un éxito aparente o un resumen inválido: %j', async body => {
    fetchMock.mockResolvedValue(response(body));
    await expect(syncRundProfilesFromAuth()).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([403, 404, 500, 503])('rechaza HTTP %s sin repetir la mutación', async status => {
    fetchMock.mockResolvedValue(response({ statusCode: status, error: 'Error', message: 'No disponible' }, status));
    await expect(syncRundProfilesFromAuth()).rejects.toMatchObject({ status });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('refresca una sesión vencida y conserva la comprobación del sobre', async () => {
    fetchMock.mockReset()
      .mockResolvedValueOnce(response({ error: 'Unauthorized' }, 401))
      .mockResolvedValueOnce(response({ success: true }))
      .mockResolvedValueOnce(response({ success: false, data: summary }));
    await expect(syncRundProfilesFromAuth()).rejects.toThrow();
    expect(fetchMock.mock.calls.map(call => call[0])).toEqual([
      'https://gateway.test/services/rund/api/v1/banco-docentes/sync-from-auth',
      'https://gateway.test/services/auth/api/v1/refresh',
      'https://gateway.test/services/rund/api/v1/banco-docentes/sync-from-auth',
    ]);
    expect(fetchMock.mock.calls.every(call => call[1].credentials === 'include')).toBe(true);
    expect(fetchMock.mock.calls[2][1].body).toBe('{}');
  });

  it('mantiene el desenvolvimiento habitual de los otros servicios', async () => {
    fetchMock.mockResolvedValue(response({ success: true, data: { id: 'user-1' } }));
    expect(await apiClient.post('/auth/api/v1/users', { roleIds: ['role-1'] })).toEqual({ id: 'user-1' });
  });
});

describe('resultado visible de la sincronización secundaria', () => {
  it('informa contadores confirmados sin afirmar que creó al usuario seleccionado', async () => {
    await syncRundProfilesWithFeedback();
    expect(toast.success).toHaveBeenCalledWith('Sincronización con RUND completada', expect.objectContaining({ description: expect.stringContaining('1 perfiles creados') }));
    expect(toast.warning).not.toHaveBeenCalled();
  });

  it('informa resultados parciales y permite reintentar solamente RUND', async () => {
    fetchMock.mockResolvedValue(response({ total: 3, created: 1, skipped: 1, failed: 1 }));
    await syncRundProfilesWithFeedback();
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.warning).toHaveBeenCalledWith('Sincronización con RUND incompleta', expect.objectContaining({ description: expect.stringContaining('1 pendientes') }));
    const action = vi.mocked(toast.warning).mock.calls[0][1]!.action as Action;
    fetchMock.mockResolvedValue(response(summary));
    action.onClick({} as any);
    await vi.waitFor(() => expect(toast.success).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls.every(call => call[0].includes('/rund/'))).toBe(true);
  });

  it.each([403, 503])('no rechaza roles ya guardados ante HTTP %s', async status => {
    fetchMock.mockResolvedValue(response({ error: 'Error', message: 'Fallo' }, status));
    await expect(syncRundProfilesWithFeedback()).resolves.toBeUndefined();
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.warning).toHaveBeenCalledWith('Roles guardados; sincronización con RUND pendiente', expect.objectContaining({ description: expect.stringContaining(status === 403 ? 'permiso' : 'confirmar') }));
  });

  it('informa pérdida de conexión sin éxito ficticio', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    await syncRundProfilesWithFeedback();
    expect(toast.warning).toHaveBeenCalledTimes(1);
    expect(toast.success).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('informa que el usuario ya se creó y reintenta RUND sin volver a crearlo', async () => {
    fetchMock.mockResolvedValue(response({ error: 'Error', message: 'Fallo' }, 503));
    await syncRundProfilesWithFeedback('user');
    expect(toast.warning).toHaveBeenCalledWith('Usuario creado; sincronización con RUND pendiente', expect.anything());
    const action = vi.mocked(toast.warning).mock.calls[0][1]!.action as Action;
    action.onClick({} as any);
    await vi.waitFor(() => expect(toast.warning).toHaveBeenCalledTimes(2));
    expect(vi.mocked(toast.warning).mock.calls[1][0]).toBe('Usuario creado; sincronización con RUND pendiente');
    expect(fetchMock.mock.calls.every(call => call[0].endsWith('/sync-from-auth'))).toBe(true);
  });
});
