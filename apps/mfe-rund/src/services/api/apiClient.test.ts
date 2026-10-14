import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getAppOnlineStatus } from '../../utils/connectivity';

vi.mock('../../utils/connectivity', () => ({ getAppOnlineStatus: vi.fn(() => true) }));
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

const endpoint = '/rund/api/v1/pta/banco-docentes';
const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'Content-Type': 'application/json' },
});

async function client(mode = 'gateway') {
  vi.stubEnv('VITE_API_MODE', mode);
  vi.stubEnv('VITE_API_URL', 'https://esap.example/services/');
  vi.stubEnv('VITE_RUND_URL', 'http://localhost:3016');
  vi.resetModules();
  const { ApiClient } = await import('./apiClient');
  return new ApiClient();
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAppOnlineStatus).mockReturnValue(true);
  localStorage.clear();
  sessionStorage.clear();
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('Transporte independiente RUND', () => {
  it('consulta por gateway con filtros y conserva total/páginas sin el shell', async () => {
    const data = { success: true, items: [{ id: 'rund-1' }], total: 80, page: 2, pages: 4 };
    const fetchMock = vi.fn().mockResolvedValue(reply(data));
    vi.stubGlobal('fetch', fetchMock);
    const api = await client();
    expect(await api.get(endpoint, { periodoCarga: '2026-2', page: 2, ignorado: undefined })).toEqual(data);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://esap.example/services' + endpoint + '?periodoCarga=2026-2&page=2');
    expect(options.credentials).toBe('include');
    expect(options.headers['X-Frontend-Base-Url']).toBe(window.location.origin);
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  it('usa el puerto RUND en modo directo y mantiene auth/PTA en sus propios servicios', async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(reply([])));
    vi.stubGlobal('fetch', fetchMock);
    const api = await client('direct');
    await api.get(endpoint, { periodoCarga: '2026-2' });
    await api.get('/pta/api/v1/periodos-academicos');
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:3016/pta/banco-docentes?periodoCarga=2026-2');
    expect(fetchMock.mock.calls[1][0]).toBe('http://localhost:3003/periodos-academicos');
  });

  it('renueva la cookie una vez y repite la misma modificación sin leer tokens del navegador', async () => {
    localStorage.setItem('token', 'token-antiguo');
    sessionStorage.setItem('esap_auth_token', 'token-antiguo');
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(reply({ error: 'Unauthorized' }, 401))
      .mockResolvedValueOnce(reply({ success: true }))
      .mockResolvedValueOnce(reply({ success: true, data: { id: 'rund-1' } }));
    vi.stubGlobal('fetch', fetchMock);
    const api = await client();
    expect(await api.patch(endpoint + '/rund-1', { nombre: 'DOCENTE' })).toEqual({ id: 'rund-1' });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toBe('https://esap.example/services/auth/api/v1/refresh');
    expect(fetchMock.mock.calls[0][1].method).toBe('PATCH');
    expect(fetchMock.mock.calls[2][1].body).toBe(fetchMock.mock.calls[0][1].body);
    for (const [, options] of fetchMock.mock.calls) {
      expect(options.credentials).toBe('include');
      expect(options.headers.Authorization).toBeUndefined();
    }
  });

  it('comparte la renovación entre peticiones simultáneas del MFE', async () => {
    let finishRefresh!: (response: Response) => void;
    let initial = 0;
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.endsWith('/auth/api/v1/refresh')) return new Promise<Response>(resolve => { finishRefresh = resolve; });
      return Promise.resolve(initial++ < 2 ? reply({ error: 'Unauthorized' }, 401) : reply({ data: 'vigente' }));
    });
    vi.stubGlobal('fetch', fetchMock);
    const api = await client();
    const first = api.get(endpoint);
    const second = api.get(endpoint + '/stats');
    await vi.waitFor(() => expect(finishRefresh).toBeDefined());
    finishRefresh(reply({ success: true }));
    expect(await Promise.all([first, second])).toEqual(['vigente', 'vigente']);
    expect(fetchMock.mock.calls.filter(([url]) => url.endsWith('/auth/api/v1/refresh'))).toHaveLength(1);
  });

  it('detiene una sesión expirada sin ciclos de renovación', async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply({ error: 'Unauthorized' }, 401));
    vi.stubGlobal('fetch', fetchMock);
    const api = await client();
    await expect(api.get(endpoint)).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('conserva el rechazo 403 y no vuelve a consultar ni refrescar', async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply({ message: 'Acceso denegado', error: 'Forbidden' }, 403));
    vi.stubGlobal('fetch', fetchMock);
    const api = await client();
    await expect(api.get(endpoint)).rejects.toMatchObject({ status: 403, message: 'Acceso denegado' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('permite operaciones públicas con su token OTP sin renovar la sesión privada', async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply({ error: 'Unauthorized' }, 401));
    vi.stubGlobal('fetch', fetchMock);
    const api = await client();
    await expect(api.post('/rund/api/v1/banco-docentes/otp/validate', { otp: '000000' }, { skipAuth: true }))
      .rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each(['get', 'post', 'delete'] as const)('rechaza %s sin conexión sin devolver caché ni éxito de cola offline', async method => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const api = await client();
    vi.mocked(getAppOnlineStatus).mockReturnValue(false);
    await expect(api[method](endpoint)).rejects.toThrow('RUND requiere conexión');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  it('descarga originales como Blob y conserva renovación, cookies y ruta', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(reply({ error: 'Unauthorized' }, 401))
      .mockResolvedValueOnce(reply({ success: true }))
      .mockResolvedValueOnce(new Response('archivo-original'));
    vi.stubGlobal('fetch', fetchMock);
    const api = await client();
    const url = endpoint + '/rund-1/documentos/soporte-1/download';
    expect(await (await api.getBlob(url)).text()).toBe('archivo-original');
    expect(fetchMock.mock.calls[2][0]).toBe('https://esap.example/services' + url);
    expect(fetchMock.mock.calls[2][1].headers['Content-Type']).toBeUndefined();
    expect(fetchMock.mock.calls[2][1].credentials).toBe('include');
  });

  it('maneja respuestas 204 y mantiene el código de errores de validación', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(reply({ message: ['Documento requerido', 'Correo inválido'] }, 400));
    vi.stubGlobal('fetch', fetchMock);
    const api = await client();
    expect(await api.delete(endpoint)).toBeNull();
    await expect(api.post(endpoint, {})).rejects.toMatchObject({ status: 400, message: 'Documento requerido, Correo inválido' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each(['gateway', 'direct'])('descarga un original histórico desde RUND en modo %s', async mode => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('original-historico'));
    vi.stubGlobal('fetch', fetchMock);
    const api = await client(mode);
    const stored = '/pta/api/v1/uploads/carpeta-digital/DOCENTE/RUND/original.pdf';
    expect(await (await api.getBlob(stored)).text()).toBe('original-historico');
    const base = mode === 'direct' ? 'http://localhost:3016' : 'https://esap.example/services/rund/api/v1';
    expect(fetchMock.mock.calls[0][0]).toBe(base + '/uploads/carpeta-digital/DOCENTE/RUND/original.pdf');
    expect(fetchMock.mock.calls[0][1].credentials).toBe('include');
  });

  class UploadRequest extends EventTarget {
    static instances: UploadRequest[] = [];
    upload = new EventTarget();
    headers: Record<string, string> = {};
    withCredentials = false;
    timeout = 0;
    status = 200;
    statusText = '';
    responseText = JSON.stringify({ success: true, data: { id: 'soporte-1' } });
    open = vi.fn();
    send = vi.fn();
    abort = vi.fn(() => this.dispatchEvent(new Event('abort')));
    setRequestHeader = (key: string, value: string) => { this.headers[key] = value; };
    constructor() { super(); UploadRequest.instances.push(this); }
  }
  function mockUploads() {
    UploadRequest.instances = [];
    vi.stubGlobal('XMLHttpRequest', UploadRequest);
    return UploadRequest.instances;
  }

  it('carga multipart con cookies, progreso y timeout sin imponer un boundary JSON', async () => {
    const requests = mockUploads();
    const api = await client();
    const form = new FormData();
    form.append('file', new File(['pdf'], 'soporte.pdf'));
    const progress = vi.fn();
    const detail = vi.fn();
    const pending = api.upload(endpoint + '/bulk', form, { timeoutMs: 300000, onProgress: progress, onProgressDetail: detail });
    const xhr = requests[0];
    expect(xhr.open).toHaveBeenCalledWith('POST', 'https://esap.example/services' + endpoint + '/bulk');
    expect(xhr.withCredentials).toBe(true);
    expect(xhr.timeout).toBe(300000);
    expect(xhr.headers['Content-Type']).toBeUndefined();
    expect(xhr.send).toHaveBeenCalledWith(form);
    const event = new Event('progress');
    Object.assign(event, { loaded: 5, total: 10, lengthComputable: true });
    xhr.upload.dispatchEvent(event);
    expect(progress).toHaveBeenCalledWith(50);
    expect(detail).toHaveBeenCalledWith({ progress: 50, loaded: 5, total: 10 });
    xhr.dispatchEvent(new Event('load'));
    expect(await pending).toEqual({ id: 'soporte-1' });
  });

  it('cancela una carga en curso y rechaza señales ya canceladas', async () => {
    const requests = mockUploads();
    const api = await client();
    const controller = new AbortController();
    const pending = api.upload(endpoint, new FormData(), { signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(requests[0].abort).toHaveBeenCalledTimes(1);
    await expect(api.upload(endpoint, new FormData(), { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    expect(requests).toHaveLength(2);
    expect(requests[1].send).not.toHaveBeenCalled();
  });

  it('renueva una carga 401 conservando formulario y timeout, con un solo reintento', async () => {
    const requests = mockUploads();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply({ success: true })));
    const api = await client();
    const form = new FormData();
    form.append('periodoCarga', '2026-2');
    const pending = api.upload(endpoint + '/bulk', form, { timeoutMs: 300000 });
    requests[0].status = 401;
    requests[0].dispatchEvent(new Event('load'));
    await vi.waitFor(() => expect(requests).toHaveLength(2));
    expect(requests[1].send).toHaveBeenCalledWith(form);
    expect(requests[1].timeout).toBe(300000);
    expect(requests[1].withCredentials).toBe(true);
    requests[1].status = 401;
    requests[1].responseText = JSON.stringify({ message: 'Sesión expirada' });
    requests[1].dispatchEvent(new Event('load'));
    await expect(pending).rejects.toThrow('Sesión expirada');
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(requests).toHaveLength(2);
  });

  it.each(['error', 'timeout'])('rechaza una carga con %s sin devolver éxito local', async event => {
    const requests = mockUploads();
    const api = await client();
    const pending = api.upload(endpoint, new FormData());
    requests[0].dispatchEvent(new Event(event));
    await expect(pending).rejects.toThrow(event === 'error' ? 'Error de red' : 'Timeout');
  });
});
