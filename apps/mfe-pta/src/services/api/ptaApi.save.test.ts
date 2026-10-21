import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../../../shell/src/services/api';
import { savePTA } from './ptaApi';

vi.mock('../../../../shell/src/services/api', () => ({ apiClient: { post: vi.fn() } }));

beforeEach(() => vi.clearAllMocks());

describe('guardado del PTA', () => {
  it('conserva el código 503 para que el formulario explique la indisponibilidad', async () => {
    vi.mocked(apiClient.post).mockRejectedValue(Object.assign(new Error('Servicio no disponible'), { status: 503 }));
    expect(await savePTA({ periodo: '2050-2' })).toMatchObject({
      success: false, status: 503, message: 'Servicio no disponible',
    });
    expect(apiClient.post).toHaveBeenCalledWith('/pta/api/v1/save', { periodo: '2050-2' }, {
      retries: 0, skipErrorToast: true,
    });
  });
});
