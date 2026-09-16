import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../../../shell/src/services/api';
import { getAppOnlineStatus } from '../../../../shell/src/utils/connectivity';
import { aprobarComponente, revisarComponente, getPTADecisionPermissions, getAllPTAs } from './ptaApi';

vi.mock('../../../../shell/src/services/api', () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }));
vi.mock('../../../../shell/src/utils/connectivity', () => ({ getAppOnlineStatus: vi.fn() }));
beforeEach(() => { vi.clearAllMocks(); vi.mocked(getAppOnlineStatus).mockReturnValue(true); });

describe('decisiones PTA confirmadas por el servidor', () => {
  it('gestión consulta el listado autorizado sin reutilizar la caché del listado general', async () => {
    vi.mocked(apiClient.get).mockResolvedValue([]);
    await getAllPTAs({ periodo: '2026-2' }, true);
    expect(apiClient.get).toHaveBeenCalledWith('/pta/api/v1/gestion', { periodo: '2026-2' }, { cache: 'no-store', skipErrorToast: true, retries: 0 });
  });
  it('no lee permisos de la caché ni encola decisiones sin conexión', async () => {
    vi.mocked(getAppOnlineStatus).mockReturnValue(false);
    for (const result of await Promise.all([
      getPTADecisionPermissions('pta-1'),
      aprobarComponente('pta-1', {} as any),
      revisarComponente('pta-1', {} as any),
    ])) {
      expect(result).toMatchObject({ success: false, data: null });
    }
    expect(apiClient.get).not.toHaveBeenCalled();
    expect(apiClient.post).not.toHaveBeenCalled();
  });
  it('conserva el rechazo del servidor sin reintentar una decisión automáticamente', async () => {
    vi.mocked(apiClient.post).mockRejectedValue(new Error('Sin autorización para esta territorial'));
    const result = await aprobarComponente('pta-1', {} as any);
    expect(result).toMatchObject({ success: false, message: 'Sin autorización para esta territorial' });
    expect(apiClient.post).toHaveBeenCalledWith('/pta/api/v1/pta-1/aprobar-componente', {}, { retries: 0 });
  });
});
