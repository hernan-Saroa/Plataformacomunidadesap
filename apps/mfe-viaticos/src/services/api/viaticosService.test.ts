import { test, expect, vi, describe, beforeEach } from 'vitest';
import { ViaticosService } from './viaticosService';
import apiClient from './apiClient';
import { buildApiUrl } from '../../../config/environment';
import dependenciasService from '../../../../shell/src/services/api/dependencias.service';
import { fallbackGeopolitica } from '../../utils/viaticosUtils';

vi.mock('./apiClient');
vi.mock('../../../config/environment');
vi.mock('../../../../shell/src/services/api/dependencias.service');
vi.mock('../../utils/viaticosUtils');
vi.mock('../../../../shell/src/services/api/offlineCache');

const mockedApiClient = apiClient as ReturnType<typeof vi.fn> & {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
};
const mockedBuildApiUrl = buildApiUrl as ReturnType<typeof vi.fn>;
const mockedDependenciasService = dependenciasService as ReturnType<typeof vi.fn> & {
  getDependencias: ReturnType<typeof vi.fn>;
};
const mockedFallbackGeopolitica = fallbackGeopolitica as ReturnType<typeof vi.fn>;

mockedBuildApiUrl.mockReturnValue('http://localhost:4000');
mockedFallbackGeopolitica.mockReturnValue({ id: 'fallback', nombre: 'Fallback' });

describe('ViaticosService — RF-REC-002', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('obtenerCargaAnalistas', () => {
    it('debe retornar la carga de analistas sin solicitudId', async () => {
      const mockResponse = {
        data: [
          {
            usuarioId: 'user-1',
            nombreCompleto: 'Ana Gómez',
            username: 'ana.gomez',
            identificacion: '123456',
            asignacionesActivas: 1,
            altas: 1,
            medias: 0,
            bajas: 0,
            puntajeTotal: 3,
            colorSemaforo: 'VERDE',
          },
        ],
        total: 1,
      };

      mockedApiClient.get.mockResolvedValue(mockResponse);

      const service = new ViaticosService();
      const result = await service.obtenerCargaAnalistas();

      expect(result).toEqual(mockResponse);
      expect(mockedApiClient.get).toHaveBeenCalledWith(
        '/viaticos/api/v1/assignments/workload',
      );
    });

    it('debe retornar la carga de analistas con solicitudId', async () => {
      const mockResponse = {
        data: [],
        total: 0,
      };

      mockedApiClient.get.mockResolvedValue(mockResponse);

      const service = new ViaticosService();
      const result = await service.obtenerCargaAnalistas('sol-001');

      expect(result).toEqual(mockResponse);
      expect(mockedApiClient.get).toHaveBeenCalledWith(
        '/viaticos/api/v1/assignments/workload?solicitudId=sol-001',
      );
    });

    it('debe retornar array vacío si hay error', async () => {
      mockedApiClient.get.mockRejectedValue(new Error('Network error'));

      const service = new ViaticosService();
      const result = await service.obtenerCargaAnalistas();

      expect(result).toEqual({ data: [], total: 0 });
    });
  });

  describe('asignarAnalista', () => {
    it('debe asignar el analista correctamente', async () => {
      const mockResponse = {
        success: true,
        message: 'Solicitud asignada exitosamente.',
        data: {
          solicitudId: 'sol-001',
          estadoSolicitud: 'EN_VERIFICACION',
          analistaAsignadoId: 'user-1',
          historialId: 'hist-001',
        },
      };

      mockedApiClient.post.mockResolvedValue(mockResponse);

      const service = new ViaticosService();
      const result = await service.asignarAnalista({
        solicitudId: 'sol-001',
        analistaId: 'user-1',
      });

      expect(result).toEqual(mockResponse);
      expect(mockedApiClient.post).toHaveBeenCalledWith(
        '/viaticos/api/v1/assignments/assign',
        { solicitudId: 'sol-001', analistaId: 'user-1' },
      );
    });

    it('debe propagar el error si la asignación falla', async () => {
      const error = new Error('Bad Request');
      mockedApiClient.post.mockRejectedValue(error);

      const service = new ViaticosService();

      await expect(
        service.asignarAnalista({
          solicitudId: 'sol-001',
          analistaId: 'user-1',
        }),
      ).rejects.toThrow('Bad Request');
    });
  });

  describe('obtenerSolicitudesAsignadas', () => {
    it('debe retornar las solicitudes asignadas al analista', async () => {
      const mockResponse = {
        data: [
          {
            id: 'sol-001',
            consecutivoUnico: 'COM-2026-0001',
            estadoSolicitud: 'SOLICITADO',
            analistaAsignadoId: 'user-1',
          },
        ],
        total: 1,
      };

      mockedApiClient.get.mockResolvedValue(mockResponse);

      const service = new ViaticosService();
      const result = await service.obtenerSolicitudesAsignadas();

      expect(result).toEqual(mockResponse.data);
      expect(mockedApiClient.get).toHaveBeenCalledWith(
        '/viaticos/api/v1/assignments/my-requests',
      );
    });

    it('debe retornar array vacío si hay error', async () => {
      mockedApiClient.get.mockRejectedValue(new Error('Network error'));

      const service = new ViaticosService();
      const result = await service.obtenerSolicitudesAsignadas();

      expect(result).toEqual([]);
    });
  });
});
