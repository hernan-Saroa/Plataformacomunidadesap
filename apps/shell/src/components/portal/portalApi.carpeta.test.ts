import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('../../services/api/apiClient', () => ({ apiClient: { get: vi.fn() } }));
import { apiClient } from '../../services/api/apiClient';
import { getCarpetaDigitalPortal, getDocumentosByCarpeta } from './portalApi';

afterEach(() => vi.restoreAllMocks());
describe('Lecturas documentales del portal', () => {
  it.each([getCarpetaDigitalPortal, getDocumentosByCarpeta])('conserva el fallo del propietario y desactiva reintentos', async read => {
    vi.mocked(apiClient.get).mockRejectedValue(new Error('503 ficticio'));
    expect((await read('persona:usuario')).success).toBe(false);
    expect(apiClient.get).toHaveBeenLastCalledWith(expect.stringContaining('persona%3Ausuario'), undefined,
      { retries: 0, skipErrorToast: true, preserveResponse: true });
  });
  it('no convierte una respuesta success:false en una carpeta exitosa', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ success: false, data: { documentos: [] } });
    expect((await getCarpetaDigitalPortal('persona')).success).toBe(false);
  });
});
