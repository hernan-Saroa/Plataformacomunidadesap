import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const environment = vi.hoisted(() => ({ mode: 'gateway' }));
vi.mock('../../config/environment', () => ({
  get API_MODE() { return environment.mode; },
  getApiGatewayBaseUrl: () => 'https://gateway.example.test/plataforma/',
  MICROSERVICE_URLS: { auth: 'http://localhost:3001/' },
  config: { API_TIMEOUT: 1000 }, CORS_CONFIG: { credentials: 'include', mode: 'cors' },
}));
import { readRundOperator, RundOperatorSession } from './rundOperatorSession';

describe('Principal de operador derivado del Auth verificado', () => {
  const id = 'abcdef00-1111-4111-8111-111111111111';
  const reply = (data: unknown) => ({ ok: true, json: async () => data }) as Response;
  beforeEach(() => { environment.mode = 'gateway'; vi.stubGlobal('fetch', vi.fn()); });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it('usa userId verificado, conserva prefijo del gateway y proyecta solo actor sin Authorization o caché', async () => {
    vi.mocked(fetch).mockResolvedValue(reply({ userId: id.toUpperCase(), personId: 'OTRO', id: 'OTRO', email: 'privado@example.test', roles: ['ADMIN'] }));
    expect(await readRundOperator()).toEqual({ version: 1, actorId: id });
    expect(fetch).toHaveBeenCalledWith('https://gateway.example.test/plataforma/auth/api/v1/me', {
      method: 'GET', credentials: 'include', mode: 'cors', cache: 'no-store', redirect: 'error',
      headers: { Accept: 'application/json' }, signal: expect.any(AbortSignal),
    });
  });
  it('modo directo consulta /me en Auth sin prefijo api/v1', async () => {
    environment.mode = 'direct'; vi.mocked(fetch).mockResolvedValue(reply({ userId: id }));
    await readRundOperator(); expect(vi.mocked(fetch).mock.calls[0][0]).toBe('http://localhost:3001/me');
  });
  it.each([null, [], { id }, { sub: id }, { personId: id }, { userId: 'NO' }, { userId: 1 }])('no acepta suplentes o DTO inválido %j', async data => {
    vi.mocked(fetch).mockResolvedValue(reply(data)); await expect(readRundOperator()).rejects.toThrow();
  });
  it.each([401, 403, 500])('HTTP %s no renueva, reintenta o utiliza una respuesta como principal', async status => {
    const json = vi.fn().mockResolvedValue({ userId: id });
    vi.mocked(fetch).mockResolvedValue({ ok: false, status, json } as any);
    await expect(readRundOperator()).rejects.toThrow(); expect(fetch).toHaveBeenCalledOnce(); expect(json).not.toHaveBeenCalled();
  });
  it('error de red o JSON devuelve error genérico sin consultar almacenamiento ni caché del usuario', async () => {
    const storage = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('PRIVADO'); });
    try {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('RESPUESTA PRIVADA'));
      await expect(readRundOperator()).rejects.toThrow('No fue posible confirmar');
      vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => { throw new Error('JSON PRIVADO'); } } as any);
      await expect(readRundOperator()).rejects.toThrow('No fue posible confirmar'); expect(storage).not.toHaveBeenCalled();
    } finally { storage.mockRestore(); }
  });
  it('abort previo no consulta y abort durante HTTP se transmite y rechaza una respuesta tardía', async () => {
    const cancelled = new AbortController(); cancelled.abort();
    await expect(readRundOperator(cancelled.signal)).rejects.toThrow(); expect(fetch).not.toHaveBeenCalled();
    let finish!: (value: Response) => void;
    vi.mocked(fetch).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const active = new AbortController(), pending = readRundOperator(active.signal);
    active.abort(); expect(vi.mocked(fetch).mock.calls[0][1]?.signal?.aborted).toBe(true);
    finish(reply({ userId: id })); await expect(pending).rejects.toThrow();
  });
  it('el límite de espera aborta y descarta una respuesta que ignore la cancelación', async () => {
    vi.useFakeTimers(); let finish!: (value: Response) => void;
    vi.mocked(fetch).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const pending = readRundOperator(); await vi.advanceTimersByTimeAsync(1000);
    expect(vi.mocked(fetch).mock.calls[0][1]?.signal?.aborted).toBe(true);
    finish(reply({ userId: id })); await expect(pending).rejects.toThrow();
  });
  it('frontera inactiva no consulta; invalidación rechaza respuesta tardía aunque el transporte ignore abort', async () => {
    let finish!: (value: any) => void;
    const read = vi.fn(() => new Promise<any>(resolve => { finish = resolve; })), session = new RundOperatorSession(read);
    await expect(session.connection.resolve()).rejects.toThrow(); expect(read).not.toHaveBeenCalled(); session.activate();
    const pending = session.connection.resolve(); session.invalidate(); finish({ version: 1, actorId: id });
    await expect(pending).rejects.toThrow();
  });
  it('desmontaje, abort del consumidor y ciclos StrictMode conservan generaciones distintas', async () => {
    const read = vi.fn().mockResolvedValue({ version: 1, actorId: id }), session = new RundOperatorSession(read); session.activate();
    const controller = new AbortController(); controller.abort(); await expect(session.connection.resolve({ signal: controller.signal })).rejects.toThrow();
    const previous = session.connection.resolve(); session.deactivate(); session.activate(); await expect(previous).rejects.toThrow();
    expect(await session.connection.resolve()).toEqual({ version: 1, actorId: id });
  });
  it('un listener fallido no impide invalidar a los demás y las suscripciones se retiran', () => {
    const session = new RundOperatorSession(), called = vi.fn(); session.connection.subscribe(() => { throw new Error('PRIVADO'); });
    const unsubscribe = session.connection.subscribe(called); session.activate(); expect(called).toHaveBeenCalledOnce();
    unsubscribe(); session.invalidate(); expect(called).toHaveBeenCalledOnce();
  });
});
