import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../../../shell/src/services/api';
import { getConfiguracionPTAGlobal, getConfiguracionPTAAdministracion, updateConfiguracionPTAGlobal } from './ptaApi';

vi.mock('../../../../shell/src/services/api', () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }));

beforeEach(() => vi.clearAllMocks());

describe('API PTA - configuración administrativa y reglas operativas', () => {
  it('los formularios consultan las reglas operativas', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ success: true, data: { horas_tc: 40 } });
    expect(await getConfiguracionPTAGlobal()).toEqual({ success: true, data: { horas_tc: 40 } });
    expect(apiClient.get).toHaveBeenCalledWith('/pta/api/v1/reglas');
  });

  it('el editor consulta el endpoint administrativo protegido', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ success: true, data: { config_bloqueada: false } });
    expect((await getConfiguracionPTAAdministracion()).success).toBe(true);
    expect(apiClient.get).toHaveBeenCalledWith('/pta/api/v1/configuracion');
  });

  it('propaga el rechazo administrativo para impedir mostrar una copia local', async () => {
    vi.mocked(apiClient.get).mockRejectedValue(new Error('403'));
    await expect(getConfiguracionPTAAdministracion()).rejects.toThrow('403');
  });

  it('el guardado continúa usando el endpoint de configuración', async () => {
    const rules = { horas_tc: 39 };
    vi.mocked(apiClient.post).mockResolvedValue({ success: true, data: rules });
    expect((await updateConfiguracionPTAGlobal(rules)).success).toBe(true);
    expect(apiClient.post).toHaveBeenCalledWith('/pta/api/v1/configuracion', { rules });
  });
});
