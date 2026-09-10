import { test, expect, vi, describe, beforeEach } from 'vitest';
import { ViaticosService } from './viaticosService';
import apiClient from './apiClient';
import { buildApiUrl } from '../../../config/environment';
import dependenciasService from '../../../../shell/src/services/api/dependencias.service';
import { fallbackGeopolitica } from '../../utils/viaticosUtils';
import type { AxiosResponse } from 'axios';

vi.mock('./apiClient');
vi.mock('../../../config/environment');
vi.mock('../../../../shell/src/services/api/dependencias.service');
vi.mock('../../utils/viaticosUtils');
vi.mock('../../../../shell/src/services/api/offlineCache', () => ({
  offlineCache: {
    getCache: vi.fn(),
    setCache: vi.fn(),
    queueMutation: vi.fn(),
    getQueuedMutations: vi.fn(),
    clearMutation: vi.fn(),
  },
}));

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

  describe('obtenerBandejaControlViaticos', () => {
    it('debe retornar la bandeja de Control Viáticos con parametros de paginación', async () => {
      const mockResponse = {
        data: [
          {
            id: 'sol-001',
            consecutivoUnico: 'COM-2026-0001',
            estadoSolicitud: 'SOLICITADA_SIIF',
            analistaVerificadorNombre: 'María López',
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
      };

      mockedApiClient.get.mockResolvedValue(mockResponse);

      const service = new ViaticosService();
      const result = await service.obtenerBandejaControlViaticos({ page: 1, limit: 20 });

      expect(result).toEqual(mockResponse);
      expect(mockedApiClient.get).toHaveBeenCalledWith(
        '/viaticos/api/v1/requests/siif-requested?page=1&limit=20',
      );
    });

    it('debe retornar datos vacíos con filtros de dependencia y prioridad', async () => {
      const mockResponse = { data: [], total: 0, page: 1, limit: 20 };

      mockedApiClient.get.mockResolvedValue(mockResponse);

      const service = new ViaticosService();
      const result = await service.obtenerBandejaControlViaticos({
        dependenciaId: '42',
        prioridad: 'ALTA',
        page: 2,
        limit: 10,
      });

      expect(result).toEqual(mockResponse);
      expect(mockedApiClient.get).toHaveBeenCalledWith(
        '/viaticos/api/v1/requests/siif-requested?dependencia_id=42&prioridad=ALTA&page=2&limit=10',
      );
    });

    it('debe retornar datos vacíos si hay error', async () => {
      mockedApiClient.get.mockRejectedValue(new Error('Network error'));

      const service = new ViaticosService();
      const result = await service.obtenerBandejaControlViaticos();

      expect(result).toEqual({ data: [], total: 0, page: 1, limit: 20 });
    });
  });

  describe('verificarSegundoNivel', () => {
    it('debe llamar al endpoint correcto con observaciones', async () => {
      const mockResponse = {
        success: true,
        data: {
          id: 'sol-001',
          estadoSolicitud: 'VERIFICADA',
          fechaVerificacionSegundoNivel: '2026-09-10T15:00:00.000Z',
          verificadoPorUsuarioId: 'revisor-001',
        },
        timestamp: '2026-09-10T15:00:00.000Z',
      };

      mockedApiClient.post.mockResolvedValue(mockResponse);

      const service = new ViaticosService();
      const result = await service.verificarSegundoNivel('sol-001', {
        observaciones: 'Verificado correctamente',
      });

      expect(result).toEqual(mockResponse);
      expect(mockedApiClient.post).toHaveBeenCalledWith(
        '/viaticos/api/v1/requests/sol-001/verify-second-level',
        { observaciones: 'Verificado correctamente' },
      );
    });

    it('debe funcionar con dto vacío (observaciones opcionales)', async () => {
      const mockResponse = {
        success: true,
        data: { id: 'sol-001', estadoSolicitud: 'VERIFICADA' },
        timestamp: '2026-09-10T15:00:00.000Z',
      };

      mockedApiClient.post.mockResolvedValue(mockResponse);

      const service = new ViaticosService();
      const result = await service.verificarSegundoNivel('sol-001');

      expect(result).toEqual(mockResponse);
      expect(mockedApiClient.post).toHaveBeenCalledWith(
        '/viaticos/api/v1/requests/sol-001/verify-second-level',
        {},
      );
    });

    it('debe propagar el error si la verificación falla', async () => {
      mockedApiClient.post.mockRejectedValue(
        new Error('Violación de Segregación de Funciones'),
      );

      const service = new ViaticosService();

      await expect(
        service.verificarSegundoNivel('sol-001', { observaciones: 'test' }),
      ).rejects.toThrow('Violación de Segregación de Funciones');
    });
  });

  describe('devolverAAnalista', () => {
    it('debe llamar al endpoint correcto con observaciones', async () => {
      const mockResponse = {
        success: true,
        data: {
          id: 'sol-001',
          estadoSolicitud: 'EN_VERIFICACION',
          motivoDevolucion: 'Faltan documentos de soporte',
          devueltoPorUsuarioId: 'revisor-001',
        },
        timestamp: '2026-09-10T15:00:00.000Z',
      };

      mockedApiClient.post.mockResolvedValue(mockResponse);

      const service = new ViaticosService();
      const result = await service.devolverAAnalista(
        'sol-001',
        'Faltan documentos de soporte',
      );

      expect(result).toEqual(mockResponse);
      expect(mockedApiClient.post).toHaveBeenCalledWith(
        '/viaticos/api/v1/requests/sol-001/return-to-analyst',
        { observaciones: 'Faltan documentos de soporte' },
      );
    });

    it('debe propagar el error si la devolución falla', async () => {
      mockedApiClient.post.mockRejectedValue(new Error('Observaciones obligatorias'));

      const service = new ViaticosService();

      await expect(
        service.devolverAAnalista('sol-001', 'ab'),
      ).rejects.toThrow('Observaciones obligatorias');
    });
  });

  describe('obtenerSolicitudControlViaticos', () => {
    it('debe retornar el detalle de la solicitud para Control Viáticos', async () => {
      const mockResponse = {
        id: 'sol-001',
        consecutivoUnico: 'COM-2026-0001',
        estadoSolicitud: 'SOLICITADA_SIIF',
        comisionado: { id: 'com-001', numeroDocumento: '1234567890' },
        analistaVerificadorNombre: 'María López',
        fechaVerificacionPrimerNivel: '2026-09-08T10:00:00.000Z',
        documentosSoporte: [{ id: 'doc-001', tipoDocumento: 'CDP' }],
      };

      mockedApiClient.get.mockResolvedValue(mockResponse);

      const service = new ViaticosService();
      const result = await service.obtenerSolicitudControlViaticos('sol-001');

      expect(result).toEqual(mockResponse);
      expect(mockedApiClient.get).toHaveBeenCalledWith(
        '/viaticos/api/v1/requests/sol-001/control-viaticos',
      );
    });

    it('debe retornar null si hay error (404 u otro)', async () => {
      mockedApiClient.get.mockRejectedValue(new Error('Not Found'));

      const service = new ViaticosService();
      const result = await service.obtenerSolicitudControlViaticos('no-existe');

      expect(result).toBeNull();
    });
  });
});
