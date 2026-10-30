import { beforeEach, expect, it, vi } from 'vitest';
import { apiClient } from '../../../../shell/src/services/api';
import { confirmRundDeletion, previewRundDeletion } from './ptaApi';
vi.mock('../../../../shell/src/services/api', () => ({ apiClient: { post: vi.fn() } }));
beforeEach(() => vi.clearAllMocks());
const preview = { ids: ['11111111-1111-4111-8111-111111111111'], total: 1, fingerprint: 'a'.repeat(64), registros: [] };
it.each([true, false])('usa la selección exacta del servidor y una confirmación explícita, wrapper=%s', async wrapped => {
  const selection = { todosFiltrados: true as const, filters: { periodoCarga: '2026-2' }, excluirIds: [] };
  vi.mocked(apiClient.post).mockResolvedValueOnce(wrapped ? { success: true, data: preview } : preview)
    .mockResolvedValueOnce(wrapped ? { success: true, data: { eliminados: 1 } } : { eliminados: 1 });
  expect(await previewRundDeletion(selection)).toEqual(preview);
  expect(await confirmRundDeletion(preview, 'Registro duplicado de prueba')).toEqual({ eliminados: 1 });
  expect(apiClient.post).toHaveBeenNthCalledWith(1, '/pta/api/v1/pta/banco-docentes/eliminacion/previsualizar', selection, { retries: 0, skipErrorToast: true });
  expect(apiClient.post).toHaveBeenNthCalledWith(2, '/pta/api/v1/pta/banco-docentes/eliminacion/confirmar', {
    ids: preview.ids, fingerprint: preview.fingerprint, motivo: 'Registro duplicado de prueba', confirmado: true,
  }, { retries: 0, skipErrorToast: true });
});
it('no considera exitosa una eliminación sin respuesta confirmada del servidor', async () => {
  vi.mocked(apiClient.post).mockResolvedValue({ success: true, data: null });
  await expect(confirmRundDeletion(preview, 'Registro duplicado de prueba')).rejects.toThrow('No fue posible eliminar');
});
it('conserva el error del servidor para que el usuario pueda corregir la selección', async () => {
  vi.mocked(apiClient.post).mockRejectedValue(new Error('La selección cambió. Actualice el listado.'));
  await expect(confirmRundDeletion(preview, 'Registro duplicado de prueba')).rejects.toThrow('La selección cambió');
});
