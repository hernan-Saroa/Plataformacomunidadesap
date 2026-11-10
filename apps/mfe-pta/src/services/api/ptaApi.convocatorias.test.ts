import { beforeEach, expect, it, vi } from 'vitest';
import { apiClient } from '../../../../shell/src/services/api';
import { bulkUploadBancoDocentes, getRundConvocatorias, getBancoDocenteStats } from './ptaApi';

vi.mock('../../../../shell/src/services/api', () => ({ apiClient: { get: vi.fn(), upload: vi.fn() } }));
beforeEach(() => vi.clearAllMocks());

it('envía la convocatoria en multipart y conserva los parámetros y el archivo de carga', async () => {
  vi.mocked(apiClient.upload).mockResolvedValue({ total: 1 });
  const file = new File(['prueba'], 'docentes.xlsx');
  await bulkUploadBancoDocentes(file, true, true, '2026-2', '  Convocatoria Pública  ');
  const [url, data, options] = vi.mocked(apiClient.upload).mock.calls[0];
  expect(String(url)).toBe('/pta/api/v1/pta/banco-docentes/bulk?dry_run=true&omit_errors=true&periodo_carga=2026-2');
  expect((data as FormData).get('file')).toBe(file);
  expect((data as FormData).get('convocatoria')).toBe('Convocatoria Pública');
  expect(options).toEqual({ timeoutMs: 300000 });
});

it('el campo vacío mantiene la carga sin convocatoria', async () => {
  vi.mocked(apiClient.upload).mockResolvedValue({ total: 1 });
  await bulkUploadBancoDocentes(new File(['prueba'], 'docentes.xlsx'), false, false, '2026-2', ' ');
  expect((vi.mocked(apiClient.upload).mock.calls[0][1] as FormData).has('convocatoria')).toBe(false);
});

it('consulta nombres por período sin caché y transmite el filtro a estadísticas', async () => {
  vi.mocked(apiClient.get).mockResolvedValue([{ clave: 'publica', nombre: 'Pública' }]);
  expect(await getRundConvocatorias('2026-2')).toEqual([{ clave: 'publica', nombre: 'Pública' }]);
  expect(apiClient.get).toHaveBeenCalledWith('/pta/api/v1/pta/banco-docentes/convocatorias', { periodoCarga: '2026-2' }, expect.objectContaining({ cache: 'no-store' }));
  await getBancoDocenteStats({ periodoCarga: '2026-2', convocatoria: 'Pública' });
  const url = new URL(String(vi.mocked(apiClient.get).mock.calls.at(-1)![0]), 'http://fixture.invalid');
  expect(url.searchParams.get('convocatoria')).toBe('Pública');
  expect(url.searchParams.get('periodoCarga')).toBe('2026-2');
});
