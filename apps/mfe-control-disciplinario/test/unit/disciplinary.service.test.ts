import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  assignedProcess,
  assignProcessDto,
  createdNews,
  createNewsDto,
} from '../fixtures/disciplinary.fixtures';

const mockApiClient = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  upload: vi.fn(),
}));

vi.mock('../../services/api/apiClient', () => ({
  apiClient: mockApiClient,
}));

vi.mock('../../config/environment', () => ({
  API_MODE: 'gateway',
  MICROSERVICE_URLS: {},
  buildApiUrl: vi.fn((path: string) => path),
  getServiceUrl: vi.fn(() => 'http://localhost:3000'),
}));

describe('disciplinaryService unit API contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('crea una noticia disciplinaria con FormData y archivos adjuntos', async () => {
    const { disciplinaryService } = await import('../../services/api/disciplinary.service');
    const file = new File(['contenido'], 'soporte.pdf', { type: 'application/pdf' });
    mockApiClient.upload.mockResolvedValue(createdNews);

    const result = await disciplinaryService.radicarNoticia(createNewsDto, [file]);

    expect(mockApiClient.upload).toHaveBeenCalledTimes(1);
    const [endpoint, formData] = mockApiClient.upload.mock.calls[0];

    expect(endpoint).toBe('/control-disciplinario/api/v1/disciplinary-news');
    expect(formData).toBeInstanceOf(FormData);
    expect(formData.get('origen')).toBe('QUEJOSO');
    expect(formData.get('territorial')).toBe(createNewsDto.territorial);
    expect(formData.get('dependenciaDenunciado')).toBe(createNewsDto.dependenciaDenunciado);
    expect(formData.get('hechos')).toBe(createNewsDto.hechos);
    expect(formData.get('fechaHechos')).toBe(createNewsDto.fechaHechos);
    expect(formData.get('radicadorId')).toBe(createNewsDto.radicadorId);
    expect(JSON.parse(String(formData.get('denunciante')))).toEqual(createNewsDto.denunciante);
    expect(JSON.parse(String(formData.get('disciplinable')))).toEqual(createNewsDto.disciplinable);
    expect(JSON.parse(String(formData.get('adjuntos')))).toEqual(createNewsDto.adjuntos);
    expect(formData.getAll('files')).toEqual([file]);
    expect(result).toEqual(createdNews);
  });

  it('convierte una noticia en proceso asignandola a un profesional', async () => {
    const { disciplinaryService } = await import('../../services/api/disciplinary.service');
    mockApiClient.post.mockResolvedValue(assignedProcess);

    const result = await disciplinaryService.asignarProceso(assignProcessDto);

    expect(mockApiClient.post).toHaveBeenCalledWith(
      '/control-disciplinario/api/v1/disciplinary-processes/assign',
      assignProcessDto,
    );
    expect(result).toEqual(assignedProcess);
    expect(result.news.id).toBe(assignProcessDto.newsId);
    expect(result.abogadoAsignadoId).toBe(assignProcessDto.abogadoId);
  });

  it('consulta el listado completo de noticias disciplinarias', async () => {
    const { disciplinaryService } = await import('../../services/api/disciplinary.service');
    mockApiClient.get.mockResolvedValue([createdNews]);

    const result = await disciplinaryService.getAllNoticias();

    expect(mockApiClient.get).toHaveBeenCalledWith('/control-disciplinario/api/v1/disciplinary-news');
    expect(result).toEqual([createdNews]);
  });

  it('consulta el listado completo de procesos disciplinarios', async () => {
    const { disciplinaryService } = await import('../../services/api/disciplinary.service');
    mockApiClient.get.mockResolvedValue([assignedProcess]);

    const result = await disciplinaryService.getAllProcesos();

    expect(mockApiClient.get).toHaveBeenCalledWith('/control-disciplinario/api/v1/disciplinary-processes');
    expect(result).toEqual([assignedProcess]);
  });

  it('consulta noticias y procesos filtrados para un profesional', async () => {
    const { disciplinaryService } = await import('../../services/api/disciplinary.service');
    mockApiClient.get
      .mockResolvedValueOnce([createdNews])
      .mockResolvedValueOnce([assignedProcess]);

    const noticias = await disciplinaryService.getMisNoticias(assignProcessDto.abogadoId);
    const procesos = await disciplinaryService.getMisProcesos(assignProcessDto.abogadoId);

    expect(mockApiClient.get).toHaveBeenNthCalledWith(
      1,
      '/control-disciplinario/api/v1/disciplinary-news/my-news',
      { profesionalId: assignProcessDto.abogadoId },
    );
    expect(mockApiClient.get).toHaveBeenNthCalledWith(
      2,
      '/control-disciplinario/api/v1/disciplinary-processes/my-processes',
      { abogadoId: assignProcessDto.abogadoId },
    );
    expect(noticias).toEqual([createdNews]);
    expect(procesos).toEqual([assignedProcess]);
  });
});
