import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../services/api';
import { AsignaturasPlanEstudios } from './AsignaturasPlanEstudios';

vi.mock('../../services/api', () => ({ apiClient: { get: vi.fn() } }));

afterEach(() => { cleanup(); vi.clearAllMocks(); sessionStorage.clear(); });

describe('horas PTA del plan de estudios', () => {
  it('conserva el cálculo con las reglas operativas sin consultar configuración administrativa', async () => {
    vi.mocked(apiClient.get).mockImplementation(async (url: string) => {
      if (url === '/pta/api/v1/reglas') {
        return { success: true, data: { criterio_multiplicador_docencia: 5, docencia_base_maestria: 10 } };
      }
      if (url.includes('/asignaturas?')) {
        return [{ id: 'asig-1', nombre: 'Asignatura de prueba', semestre: 1, creditos: 3, horas: 48, programa_id: 'prog-1' }];
      }
      return { categoria_horas_circular003: 'maestria' };
    });

    render(<AsignaturasPlanEstudios programaId="prog-1" programaNombre="Maestría de prueba" />);
    await waitFor(() => expect(screen.getAllByText('150').length).toBeGreaterThan(0));
    expect(apiClient.get).toHaveBeenCalledWith('/pta/api/v1/reglas');
    expect(apiClient.get).not.toHaveBeenCalledWith('/pta/api/v1/configuracion');
  });
});
