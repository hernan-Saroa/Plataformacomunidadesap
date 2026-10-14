import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from './apiClient';
import { bulkUploadBancoDocentes, getBancoDocentes, getBancoDocenteCabezote, getCatalogoTerritoriales, vincularRundSoporte } from './rundApi';

vi.mock('./apiClient', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), upload: vi.fn() } }));
beforeEach(() => { vi.clearAllMocks(); });
const base = '/rund/api/v1/pta/banco-docentes';

describe('Contratos del banco migrado', () => {
  it('normaliza items conservando total y páginas del servidor', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ success: true, items: [{ id: 'rund-1' }], total: 150, page: 2, pages: 3 });
    expect(await getBancoDocentes({ periodoCarga: '2026-2', page: 2 })).toEqual({
      success: true, data: { data: [{ id: 'rund-1' }], total: 150, page: 2, pages: 3 },
    });
    expect(apiClient.get).toHaveBeenCalledWith(base, { periodoCarga: '2026-2', page: 2 });
  });

  it('conserva listas ya desenvueltas y el contrato de fallo sin inventar docentes', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce([{ id: 'rund-1' }]).mockRejectedValueOnce(new Error('Sin acceso'));
    expect((await getBancoDocentes()).data.total).toBe(1);
    expect(await getBancoDocentes()).toMatchObject({ success: false, data: { data: [], total: 0 } });
  });

  it('mantiene catálogos territoriales en PTA y el periodo elegido', async () => {
    vi.mocked(apiClient.get).mockResolvedValue([{ id: 'territorial-1' }]);
    expect((await getCatalogoTerritoriales('2026-2')).data).toHaveLength(1);
    expect(apiClient.get).toHaveBeenCalledWith('/pta/api/v1/catalogos/territoriales', { periodo: '2026-2' });
  });

  it('consulta el cabezote con ID codificado y el periodo correspondiente', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ id: 'rund-1' });
    await getBancoDocenteCabezote('docente con espacio', '2026-2');
    expect(apiClient.get).toHaveBeenCalledWith(base + '/docente%20con%20espacio/cabezote', { periodoCarga: '2026-2' });
  });

  it('envía XLSX con flags de validación y los cinco minutos de carga masiva', async () => {
    vi.mocked(apiClient.upload).mockResolvedValue({ created: 1 });
    const file = new File(['xlsx'], 'docentes.xlsx');
    expect(await bulkUploadBancoDocentes(file, true, true, '2026-2')).toEqual({ success: true, data: { created: 1 } });
    const [url, form, options] = vi.mocked(apiClient.upload).mock.calls[0];
    expect(url).toBe(base + '/bulk?dry_run=true&omit_errors=true&periodo_carga=2026-2');
    expect(form.get('file')).toBe(file);
    expect(options).toEqual({ timeoutMs: 300000 });
  });

  it('conserva los fallos de carga masiva para mostrarlos al usuario', async () => {
    vi.mocked(apiClient.upload).mockRejectedValue(new Error('Plantilla inválida'));
    expect(await bulkUploadBancoDocentes(new File([], 'docentes.xlsx'))).toEqual({ success: false, data: null, error: 'Plantilla inválida' });
  });

  it('sube soportes de autogestión con el token propio y sufijo público', async () => {
    vi.mocked(apiClient.upload).mockResolvedValue({ id: 'soporte-1' });
    const file = new File(['pdf'], 'identidad.pdf');
    await vincularRundSoporte('rund-1', 'IDENTIDAD', { tipoSoporte: 'documento_identidad', autogestionToken: 'otp-session' }, file);
    const [url, form] = vi.mocked(apiClient.upload).mock.calls[0];
    expect(url).toBe(base + '/rund-1/bloques/IDENTIDAD/soportes/autogestion');
    expect(form.get('autogestionToken')).toBe('otp-session');
    expect(form.get('file')).toBe(file);
  });
});
