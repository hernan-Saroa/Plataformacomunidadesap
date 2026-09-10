import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../../../shell/src/services/api';
import { validarReenvioPTA } from './ptaApi';

vi.mock('../../../../shell/src/services/api', () => ({
  apiClient: { post: vi.fn() },
}));

describe('validación previa del reenvío PTA', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([{ success: true, data: { valido: true } }, { valido: true }])(
    'acepta la confirmación explícita del servidor con o sin envoltura',
    async response => {
      vi.mocked(apiClient.post).mockResolvedValue(response);
      await expect(validarReenvioPTA('pta-1')).resolves.toMatchObject({ success: true });
      expect(apiClient.post).toHaveBeenCalledTimes(1);
      expect(apiClient.post).toHaveBeenCalledWith('/pta/api/v1/pta-1/validar-reenvio', {});
    },
  );

  it('conserva el aviso del servidor para mostrarlo antes de solicitar la firma', async () => {
    const message = 'La actividad PREAAP contiene una opción que ya no existe en la configuración vigente.';
    vi.mocked(apiClient.post).mockRejectedValue(new Error(message));
    await expect(validarReenvioPTA('pta-1')).resolves.toEqual({ success: false, message });
  });

  it.each([null, {}, { success: false }, { success: true, data: { valido: false } }])(
    'impide continuar cuando el servidor no confirma la validación: %j',
    async response => {
      vi.mocked(apiClient.post).mockResolvedValue(response);
      await expect(validarReenvioPTA('pta-1')).resolves.toMatchObject({ success: false });
    },
  );
});
