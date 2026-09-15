import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../../../shell/src/services/api';
import { getAppOnlineStatus } from '../../../../shell/src/utils/connectivity';
import { deletePTA } from './ptaApi';

vi.mock('../../../../shell/src/services/api', () => ({ apiClient: { delete: vi.fn() } }));
vi.mock('../../../../shell/src/utils/connectivity', () => ({ getAppOnlineStatus: vi.fn() }));
beforeEach(() => { vi.clearAllMocks(); vi.mocked(getAppOnlineStatus).mockReturnValue(true); });

describe('eliminación PTA confirmada por el servidor', () => {
  it('no encola eliminaciones sin conexión', async () => {
    vi.mocked(getAppOnlineStatus).mockReturnValue(false);
    expect(await deletePTA('pta-1')).toMatchObject({ success: false, message: expect.stringContaining('conexión') });
    expect(apiClient.delete).not.toHaveBeenCalled();
  });

  it.each([{ deleted: true }, { success: true, data: { deleted: true } }])('acepta la confirmación y evita reintentos automáticos', async (response) => {
    vi.mocked(apiClient.delete).mockResolvedValue(response);
    expect(await deletePTA('pta-1')).toMatchObject({ success: true, data: { deleted: true } });
    expect(apiClient.delete).toHaveBeenCalledWith('/pta/api/v1/pta-1', { retries: 0, skipErrorToast: true });
  });

  it.each([null, { success: true }, { success: true, data: null }, { success: false, data: { deleted: true } }])(
    'no muestra éxito sin una eliminación confirmada', async (response) => {
      vi.mocked(apiClient.delete).mockResolvedValue(response);
      expect(await deletePTA('pta-1')).toMatchObject({ success: false });
    },
  );

  it('conserva el motivo del rechazo del servidor', async () => {
    vi.mocked(apiClient.delete).mockRejectedValue({ response: { data: { message: 'La sesión ha expirado.' } } });
    expect(await deletePTA('pta-1')).toMatchObject({ success: false, message: 'La sesión ha expirado.' });
  });
});
