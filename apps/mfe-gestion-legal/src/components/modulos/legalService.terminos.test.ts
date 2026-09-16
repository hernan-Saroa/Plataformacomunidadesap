/**
 * Regresión: el módulo importa `legal.service` con el especificador
 * '../../../../services/api/legal.service', que sube cuatro niveles y resuelve a
 * `apps/services/api/legal.service.ts` — NO a la copia dentro de `apps/mfe-gestion-legal/services/`.
 * Hay más de una docena de copias de ese archivo en el monorepo, y editar la equivocada hacía que
 * `getTerminosListado(undefined, 'ELIMINADO')` descartara el segundo argumento sin avisar: la
 * petición salía sin `?estado=ELIMINADO`, el backend devolvía los términos activos y la pestaña
 * "Eliminados" quedaba siempre vacía.
 *
 * Por eso este test usa EXACTAMENTE el mismo especificador (y desde el mismo directorio) que el
 * componente: así verifica el módulo que de verdad se ejecuta en la app, no una copia paralela.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../services/api/apiClient', () => {
  const cliente = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    upload: vi.fn(),
    getBlob: vi.fn(),
  };
  return { __esModule: true, apiClient: cliente, default: cliente };
});

import { legalService } from '../../../../services/api/legal.service';
import { apiClient } from '../../../../services/api/apiClient';

describe('legalService (la copia que realmente importa el módulo de Términos e Informes)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getTerminosListado acepta el filtro de estado y lo manda en la URL', async () => {
    vi.mocked(apiClient.get).mockResolvedValue([]);

    await legalService.getTerminosListado(undefined, 'ELIMINADO');

    const [url] = vi.mocked(apiClient.get).mock.calls[0];
    expect(url).toContain('estado=ELIMINADO');
  });

  it('getTerminosListado sin estado no manda el filtro', async () => {
    vi.mocked(apiClient.get).mockResolvedValue([]);

    await legalService.getTerminosListado();

    const [url] = vi.mocked(apiClient.get).mock.calls[0];
    expect(url).not.toContain('estado=');
  });

  it('eliminarTermino sin flag hace soft delete (no manda permanente)', async () => {
    vi.mocked(apiClient.delete).mockResolvedValue(undefined);

    await legalService.eliminarTermino('uuid-1', false);

    expect(apiClient.delete).toHaveBeenCalledWith(expect.not.stringContaining('permanente'));
  });

  it('eliminarTermino con permanente=true pide el borrado definitivo', async () => {
    vi.mocked(apiClient.delete).mockResolvedValue(undefined);

    await legalService.eliminarTermino('uuid-1', true);

    expect(apiClient.delete).toHaveBeenCalledWith(expect.stringContaining('permanente=true'));
  });
});
