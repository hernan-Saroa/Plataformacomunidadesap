import { describe, it, expect, vi, beforeEach } from 'vitest';
import viaticosService from './viaticosService';
import apiClient from './apiClient';

// Se mockea el apiClient para probar el parseo REAL de la respuesta del
// auth-service (que envuelve con { success, data: { data: [...] }, timestamp }).
vi.mock('./apiClient', () => ({
  __esModule: true,
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const mockedGet = vi.mocked(apiClient.get);

describe('ViaticosService · geopolítica (auth.geopolitica)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe extraer departamentos de { success, data: { data: [...] } }', async () => {
    mockedGet.mockResolvedValue({
      success: true,
      data: {
        data: [
          {
            idGeopolitica: '920',
            codGeopolitica: '66',
            codDepartamento: 66,
            nomDivGeopolitica: 'Risaralda',
            tipDivision: 'DEPTO',
          },
        ],
      },
      timestamp: '2026-08-28T00:00:00.000Z',
    });

    const departamentos = await viaticosService.obtenerDepartamentos();

    expect(mockedGet).toHaveBeenCalledWith(
      '/auth/api/v1/estructura-organizacional/geopolitica/departamentos',
    );
    expect(departamentos).toHaveLength(1);
    expect(departamentos[0].nomDivGeopolitica).toBe('Risaralda');
    expect(departamentos[0].codDepartamento).toBe(66);
  });

  it('debe extraer ciudades llamando con el código DANE del departamento (66)', async () => {
    mockedGet.mockResolvedValue({
      success: true,
      data: {
        data: [
          {
            idGeopolitica: '921',
            codGeopolitica: '66001',
            codDepartamento: 66,
            nomDivGeopolitica: 'Pereira',
            tipDivision: 'CIUDAD',
          },
          {
            idGeopolitica: '922',
            codGeopolitica: '66045',
            codDepartamento: 66,
            nomDivGeopolitica: 'Apía',
            tipDivision: 'CIUDAD',
          },
        ],
      },
      timestamp: '2026-08-28T00:00:00.000Z',
    });

    const ciudades = await viaticosService.obtenerCiudadesPorDepartamento(66);

    expect(mockedGet).toHaveBeenCalledWith(
      '/auth/api/v1/estructura-organizacional/geopolitica/departamentos/66/ciudades',
    );
    expect(ciudades).toHaveLength(2);
    expect(ciudades.map((c) => c.nomDivGeopolitica)).toEqual(['Pereira', 'Apía']);
  });

  it('debe usar el catálogo local si el API está caída (rechazada)', async () => {
    mockedGet.mockRejectedValue(new Error('API down'));

    const departamentos = await viaticosService.obtenerDepartamentos();

    expect(departamentos.length).toBeGreaterThan(0);
    const risaralda = departamentos.find((d) => d.nomDivGeopolitica === 'Risaralda');
    // El catálogo local también usa el código DANE real (66).
    expect(risaralda?.codDepartamento).toBe(66);
  });

  it('debe usar el catálogo local si el API devuelve lista vacía', async () => {
    mockedGet.mockResolvedValue({ success: true, data: { data: [] } });

    const departamentos = await viaticosService.obtenerDepartamentos();

    expect(departamentos.length).toBeGreaterThan(0);
    expect(departamentos[0].tipDivision).toBe('DEPTO');
  });
});
