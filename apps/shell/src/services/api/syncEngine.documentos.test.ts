import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('./offlineCache', () => ({ offlineCache: { getQueuedMutations: vi.fn(), clearMutation: vi.fn() } }));
vi.mock('../../utils/connectivity', () => ({ getAppOnlineStatus: () => true }));
vi.mock('sonner', () => ({ toast: { info: vi.fn(), success: vi.fn(), warning: vi.fn() } }));
import { offlineCache } from './offlineCache';
import { syncEngine } from './syncEngine';
beforeEach(() => { vi.clearAllMocks(); });
describe('cola documental histórica: conservar sin repetir una mutación con otra sesión', () => {
  it('no envía ni elimina entradas de Carpeta Digital y RUND', async () => {
    vi.mocked(offlineCache.getQueuedMutations).mockResolvedValue([
      { id: '1', url: '/auth/api/v1/carpeta-digital/documentos/doc/validate' },
      { id: '2', url: '/rund/api/v1/banco-docentes/doc/documentos' },
    ] as any);
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    await syncEngine.syncOfflineMutations();
    expect(fetch).not.toHaveBeenCalled(); expect(offlineCache.clearMutation).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
  it('continúa enviando cambios de otros módulos', async () => {
    vi.mocked(offlineCache.getQueuedMutations).mockResolvedValue([{ id: '3', url: '/otro/api/v1/cambio', method: 'PUT', body: '{}' }] as any);
    const fetch = vi.fn().mockResolvedValue({ ok: true }); vi.stubGlobal('fetch', fetch);
    await syncEngine.syncOfflineMutations();
    expect(fetch).toHaveBeenCalledTimes(1); expect(offlineCache.clearMutation).toHaveBeenCalledWith('3');
    vi.unstubAllGlobals();
  });
});
