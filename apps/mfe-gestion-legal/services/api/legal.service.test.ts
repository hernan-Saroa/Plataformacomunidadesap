import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./apiClient', () => ({
  __esModule: true,
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    upload: vi.fn(),
    getBlob: vi.fn(),
  },
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    upload: vi.fn(),
    getBlob: vi.fn(),
  },
}));

import { legalService } from './legal.service';
import { apiClient } from './apiClient';

describe('LegalService.registrarAvanceIndicador (Plan de Acción · Actualizar Avance)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sin archivo de evidencia debe enviar un POST con JSON plano (observaciones incluidas)', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ id: 1 });

    await legalService.registrarAvanceIndicador('42', { valor: 80, observaciones: 'Avance conforme a lo planeado' });

    expect(apiClient.upload).not.toHaveBeenCalled();
    expect(apiClient.post).toHaveBeenCalledWith(
      '/legal/api/v1/pei/indicador/42/avance',
      { valor: 80, observaciones: 'Avance conforme a lo planeado' },
    );
  });

  it('con archivo de evidencia debe construir un FormData y subirlo con apiClient.upload (no debe perder el archivo como con apiClient.post)', async () => {
    vi.mocked(apiClient.upload).mockResolvedValue({ id: 2 });
    const file = new File(['contenido'], 'soporte.pdf', { type: 'application/pdf' });

    await legalService.registrarAvanceIndicador(
      '42',
      { valor: 80, observaciones: 'Con soporte adjunto' },
      file,
    );

    expect(apiClient.post).not.toHaveBeenCalled();
    expect(apiClient.upload).toHaveBeenCalledTimes(1);

    const [url, formData] = vi.mocked(apiClient.upload).mock.calls[0];
    expect(url).toBe('/legal/api/v1/pei/indicador/42/avance');
    expect(formData).toBeInstanceOf(FormData);
    expect((formData as FormData).get('valor')).toBe('80');
    expect((formData as FormData).get('observaciones')).toBe('Con soporte adjunto');
    expect((formData as FormData).get('evidencia')).toBe(file);
  });

  it('con archivo pero sin observaciones no debe agregar el campo observaciones al FormData', async () => {
    vi.mocked(apiClient.upload).mockResolvedValue({ id: 3 });
    const file = new File(['contenido'], 'soporte.pdf', { type: 'application/pdf' });

    await legalService.registrarAvanceIndicador('42', { valor: 0 }, file);

    const [, formData] = vi.mocked(apiClient.upload).mock.calls[0];
    expect((formData as FormData).has('observaciones')).toBe(false);
  });

  it('debe incluir valor 0 en el FormData (no debe tratarlo como ausente)', async () => {
    vi.mocked(apiClient.upload).mockResolvedValue({ id: 4 });
    const file = new File(['contenido'], 'soporte.pdf', { type: 'application/pdf' });

    await legalService.registrarAvanceIndicador('42', { valor: 0 }, file);

    const [, formData] = vi.mocked(apiClient.upload).mock.calls[0];
    expect((formData as FormData).has('valor')).toBe(true);
    expect((formData as FormData).get('valor')).toBe('0');
  });
});
