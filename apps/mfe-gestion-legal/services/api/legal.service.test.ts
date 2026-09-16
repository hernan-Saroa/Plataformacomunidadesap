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

// ---------------------------------------------------------------------------------------------
// Flujo de eliminación de términos (Timeline -> "Archivados > Eliminados" -> borrado definitivo).
// Estos tests cubren la capa que los tests del componente no tocan: cómo se arma realmente la
// URL que sale al backend. Un error aquí (parámetro mal puesto o perdido) se traduce en que los
// términos eliminados nunca aparezcan en la pestaña "Eliminados".
// ---------------------------------------------------------------------------------------------
describe('LegalService · listado y eliminación de términos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getTerminosListado() sin argumentos pide el listado activo (sin filtro de estado)', async () => {
    vi.mocked(apiClient.get).mockResolvedValue([]);

    await legalService.getTerminosListado();

    const [url] = vi.mocked(apiClient.get).mock.calls[0];
    expect(url).not.toContain('estado=');
    expect(url).toContain('/terminos/listado');
  });

  it('getTerminosListado(undefined, "ELIMINADO") debe pedir explícitamente los eliminados', async () => {
    vi.mocked(apiClient.get).mockResolvedValue([]);

    await legalService.getTerminosListado(undefined, 'ELIMINADO');

    const [url] = vi.mocked(apiClient.get).mock.calls[0];
    expect(url).toBe('/legal/api/v1/terminos/listado?estado=ELIMINADO');
  });

  it('eliminarTermino(id) sin flag hace soft delete: NO debe mandar permanente=true', async () => {
    vi.mocked(apiClient.delete).mockResolvedValue(undefined);

    await legalService.eliminarTermino('uuid-1', false);

    expect(apiClient.delete).toHaveBeenCalledWith('/legal/api/v1/terminos/uuid-1');
  });

  it('eliminarTermino(id, true) debe pedir el borrado definitivo con permanente=true', async () => {
    vi.mocked(apiClient.delete).mockResolvedValue(undefined);

    await legalService.eliminarTermino('uuid-1', true);

    expect(apiClient.delete).toHaveBeenCalledWith('/legal/api/v1/terminos/uuid-1?permanente=true');
  });
});
