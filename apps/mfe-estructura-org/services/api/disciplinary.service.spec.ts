/**
 * Pruebas Unitarias para Disciplinary Service
 * Validan los ajustes de rutas para usar el gateway
 */

// Mock de apiClient
const mockApiClient = {
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
  upload: jest.fn(),
};

// Mock de buildApiUrl
const mockBuildApiUrl = jest.fn();

// Mock de localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

// Mock de window
const mockWindow = {
  location: {
    origin: 'http://localhost:3000',
  },
  URL: {
    createObjectURL: jest.fn(),
    revokeObjectURL: jest.fn(),
  },
  document: {
    createElement: jest.fn(),
    body: {
      appendChild: jest.fn(),
      removeChild: jest.fn(),
    },
  },
};

describe('DisciplinaryService - Rutas Gateway', () => {
  let disciplinaryService: any;

  beforeEach(() => {
    // Mock de módulos
    jest.mock('./apiClient', () => ({ apiClient: mockApiClient }));
    jest.mock('../../config/environment', () => ({ buildApiUrl: mockBuildApiUrl }));
    Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });
    Object.defineProperty(window, 'location', { value: mockWindow.location });
    Object.defineProperty(window, 'URL', { value: mockWindow.URL });
    Object.defineProperty(window, 'document', { value: mockWindow.document });

    // Importar el servicio después de los mocks
    const { disciplinaryService: service } = require('./disciplinary.service');
    disciplinaryService = service;
  });

  describe('Evidencias - Rutas Gateway', () => {
    it('should use gateway route for getEvidencias', async () => {
      const expedienteId = '123';
      const mockResponse = [{ id: '1', descripcion: 'Evidencia 1' }];
      
      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await disciplinaryService.getEvidencias(expedienteId);

      expect(mockApiClient.get).toHaveBeenCalledWith('/legal/api/v1/evidencias/expediente/123');
      expect(result).toEqual(mockResponse);
    });

    it('should use gateway route for createEvidencia', async () => {
      const expedienteId = '123';
      const data = { descripcion: 'Nueva evidencia', tipo: 'Documental' };
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const mockResponse = { id: '456', url: 'http://test.com/file.pdf' };
      
      mockApiClient.upload.mockResolvedValue(mockResponse);

      const result = await disciplinaryService.createEvidencia(expedienteId, data, file);

      expect(mockApiClient.upload).toHaveBeenCalledWith('/legal/api/v1/evidencias/123', expect.any(FormData));
      expect(result).toEqual(mockResponse);
    });

    it('should use gateway route for updateEvidenciaEstado', async () => {
      const id = '456';
      const estado = 'ACTIVA';
      const mockResponse = { id, estado };
      
      mockApiClient.patch.mockResolvedValue(mockResponse);

      const result = await disciplinaryService.updateEvidenciaEstado(id, estado);

      expect(mockApiClient.patch).toHaveBeenCalledWith('/legal/api/v1/evidencias/456/estado', { estado });
      expect(result).toEqual(mockResponse);
    });

    it('should use gateway route for deleteEvidenciaReal', async () => {
      const id = '456';
      
      mockApiClient.delete.mockResolvedValue(undefined);

      await disciplinaryService.deleteEvidenciaReal(id);

      expect(mockApiClient.delete).toHaveBeenCalledWith('/legal/api/v1/evidencias/456');
    });
  });

  describe('Actas - Rutas Gateway', () => {
    it('should use gateway route for getActas', async () => {
      const expedienteId = '123';
      const mockResponse = [{ id: '1', tipo: 'ACTA' }];
      
      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await disciplinaryService.getActas(expedienteId);

      expect(mockApiClient.get).toHaveBeenCalledWith('/legal/api/v1/actas/expediente/123');
      expect(result).toEqual(mockResponse);
    });

    it('should use gateway route for createActa', async () => {
      const expedienteId = '123';
      const data = { tipo: 'ACTA', descripcion: 'Nueva acta' };
      const file = new File(['content'], 'acta.pdf', { type: 'application/pdf' });
      const mockResponse = { id: '789', url: 'http://test.com/acta.pdf' };
      
      mockApiClient.upload.mockResolvedValue(mockResponse);

      const result = await disciplinaryService.createActa(expedienteId, data, file);

      expect(mockApiClient.upload).toHaveBeenCalledWith('/legal/api/v1/actas/123', expect.any(FormData));
      expect(result).toEqual(mockResponse);
    });

    it('should use gateway route for updateActaEstado', async () => {
      const id = '789';
      const estado = 'FIRMADA';
      const mockResponse = { id, estado };
      
      mockApiClient.patch.mockResolvedValue(mockResponse);

      const result = await disciplinaryService.updateActaEstado(id, estado);

      expect(mockApiClient.patch).toHaveBeenCalledWith('/legal/api/v1/actas/789/estado', { estado });
      expect(result).toEqual(mockResponse);
    });

    it('should use gateway route for deleteActaReal', async () => {
      const id = '789';
      
      mockApiClient.delete.mockResolvedValue(undefined);

      await disciplinaryService.deleteActaReal(id);

      expect(mockApiClient.delete).toHaveBeenCalledWith('/legal/api/v1/actas/789');
    });
  });

  describe('Rutas Anteriores vs Nuevas', () => {
    it('should not use old direct routes', async () => {
      const expedienteId = '123';
      
      // Verificar que NO se usen las rutas anteriores
      await disciplinaryService.getEvidencias(expedienteId);
      
      expect(mockApiClient.get).not.toHaveBeenCalledWith('/legal-management/api/v1/evidencias/expediente/123');
      expect(mockApiClient.get).toHaveBeenCalledWith('/legal/api/v1/evidencias/expediente/123');
    });
  });
});