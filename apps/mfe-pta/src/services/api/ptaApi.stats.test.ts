import { beforeEach, expect, it, vi } from 'vitest';
import { apiClient } from '../../../../shell/src/services/api';
import { getBancoDocenteStats } from './ptaApi';
vi.mock('../../../../shell/src/services/api', () => ({ apiClient: { get: vi.fn() } }));
beforeEach(() => vi.clearAllMocks());
it('envía todos los filtros y evita reutilizar una estadística cacheada', async () => {
  vi.mocked(apiClient.get).mockResolvedValue({ total: 3 });
  expect(await getBancoDocenteStats({ periodoCarga: '2026-2', territorial: 'Norte de Santander', dedicacion: 'TC', estado: 'ACTIVO', vinculacion: 'CARRERA' })).toEqual({ success: true, data: { total: 3 } });
  const [url, query, options] = vi.mocked(apiClient.get).mock.calls[0];
  const parsed = new URL(String(url), 'http://fixture.invalid');
  expect(Object.fromEntries(parsed.searchParams)).toEqual({ periodoCarga: '2026-2', territorial: 'Norte de Santander', dedicacion: 'TC', estado: 'ACTIVO', vinculacion: 'CARRERA' });
  expect(query).toBeUndefined();
  expect(options).toEqual({ cache: 'no-store' });
});
it('consulta todos los periodos sin enviar un periodo vacío', async () => {
  vi.mocked(apiClient.get).mockResolvedValue({ success: true, data: { total: 0 } });
  expect(await getBancoDocenteStats({ periodoCarga: '' })).toEqual({ success: true, data: { total: 0 } });
  expect(vi.mocked(apiClient.get).mock.calls[0][0]).toBe('/pta/api/v1/pta/banco-docentes/stats');
});
