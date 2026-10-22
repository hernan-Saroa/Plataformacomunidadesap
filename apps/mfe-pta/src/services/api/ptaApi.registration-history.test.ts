import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../../../shell/src/services/api';
import { getRundRegistrationHistory } from './ptaApi';

vi.mock('../../../../shell/src/services/api', () => ({ apiClient: { get: vi.fn() } }));
beforeEach(() => vi.clearAllMocks());
describe('Respuesta paginada de trazabilidad RUND', () => {
  it.each([true, false])('conserva total y paginación con wrapper: %s', async wrapped => {
    const page = { data: [], total: 100, page: 2, limit: 20, pages: 5, accesoCompleto: true };
    vi.mocked(apiClient.get).mockResolvedValue(wrapped ? { success: true, data: page } : page);
    expect(await getRundRegistrationHistory({ periodoCarga: '2026-2', page: 2 })).toEqual(page);
  });
  it('no convierte una respuesta fallida en un historial vacío', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ success: false, data: [] });
    await expect(getRundRegistrationHistory({})).rejects.toThrow('No fue posible');
  });
});
