// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { PlantaDocenteReportView } from './PlantaDocenteReportView';
import { apiClient } from '../services/api/apiClient';

vi.mock('../services/api/apiClient', () => ({
  apiClient: { get: vi.fn() },
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

afterEach(cleanup);

const STATS_SIN_FILTRO = {
  total: 10,
  activos: 8,
  inactivos: 2,
  total_horas: 100,
  promedio_horas: 10,
  por_territorial: [{ territorial: 'Bogotá', total: 6 }, { territorial: 'Antioquia', total: 4 }],
  por_categoria: [{ categoria: 'Titular', total: 7 }, { categoria: 'Asistente', total: 3 }],
  por_vinculacion: [{ vinculacion: 'Carrera', total: 5 }, { vinculacion: 'Ocasional', total: 5 }],
  por_nivel_formacion: [{ nivel_formacion: 'Maestría', total: 6 }, { nivel_formacion: 'Doctorado', total: 4 }],
  por_genero: [{ genero: 'Femenino', total: 5 }, { genero: 'Masculino', total: 5 }],
  por_nucleo_tematico: [{ nucleo_tematico: 'Ciencias Sociales', total: 6 }, { nucleo_tematico: 'Ciencias Básicas', total: 4 }],
  por_sede: [],
};

const STATS_FILTRADO = {
  ...STATS_SIN_FILTRO,
  total: 4,
  activos: 4,
  inactivos: 0,
  por_territorial: [{ territorial: 'Bogotá', total: 4 }],
};

function mockGet(impl: (endpoint: string, params?: any) => any) {
  (apiClient.get as any).mockImplementation(impl);
}

describe('PlantaDocenteReportView — reporte de planta docente (REQ-RUND-F019)', () => {
  it('carga el catálogo de filtros al montar y muestra los agregados iniciales', async () => {
    mockGet(async (endpoint: string) => {
      if (endpoint.endsWith('/stats')) return { data: STATS_SIN_FILTRO };
      return { items: [], total: 0, pages: 1 };
    });

    render(<PlantaDocenteReportView />);

    await waitFor(() => expect(screen.getByText('Total docentes')).toBeInTheDocument());
    // "Bogotá" aparece tanto en el <option> del filtro como en la tabla agregada.
    expect(screen.getAllByText('Bogotá').length).toBeGreaterThan(1);
    expect(screen.getAllByText('Ciencias Sociales').length).toBeGreaterThan(1);
  });

  it('combina los 7 filtros (territorial, vinculación, categoría, género, nivel de formación, núcleo temático y período) en una sola consulta al generar el reporte', async () => {
    mockGet(async (endpoint: string) => {
      if (endpoint.endsWith('/stats')) return { data: STATS_SIN_FILTRO };
      return { items: [], total: 0, pages: 1 };
    });

    render(<PlantaDocenteReportView />);
    await waitFor(() => expect(screen.getByText('Total docentes')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText('Territorial'), { target: { value: 'Bogotá' } });
    fireEvent.change(screen.getByLabelText('Tipo de vinculación'), { target: { value: 'Carrera' } });
    fireEvent.change(screen.getByLabelText('Categoría'), { target: { value: 'Titular' } });
    fireEvent.change(screen.getByLabelText('Género'), { target: { value: 'Femenino' } });
    fireEvent.change(screen.getByLabelText('Nivel de formación'), { target: { value: 'Maestría' } });
    fireEvent.change(screen.getByLabelText('Núcleo temático'), { target: { value: 'Ciencias Sociales' } });
    fireEvent.change(screen.getByPlaceholderText('ej. 2025-2'), { target: { value: '2025-2' } });

    (apiClient.get as any).mockClear();
    mockGet(async (endpoint: string) => {
      if (endpoint.endsWith('/stats')) return { data: STATS_FILTRADO };
      return { items: [], total: 0, pages: 1 };
    });

    fireEvent.click(screen.getByRole('button', { name: /generar reporte/i }));

    await waitFor(() => {
      const statsCall = (apiClient.get as any).mock.calls.find(([endpoint]: [string]) => endpoint.endsWith('/stats'));
      expect(statsCall).toBeTruthy();
      expect(statsCall[1]).toEqual({
        territorial: 'Bogotá',
        vinculacion: 'Carrera',
        categoria: 'Titular',
        genero: 'Femenino',
        nivelFormacion: 'Maestría',
        nucleoTematico: 'Ciencias Sociales',
        periodoCarga: '2025-2',
      });
    });
  });

  it('muestra el detalle paginado según el filtro aplicado', async () => {
    mockGet(async (endpoint: string) => {
      if (endpoint.endsWith('/stats')) return { data: STATS_SIN_FILTRO };
      return {
        items: [{ docente_id: '1', nombre_completo: 'Ana Pérez', territorial: 'Bogotá', vinculacion: 'Carrera', categoria: 'Titular', genero: 'Femenino', nivel_formacion: 'Maestría', nucleo_tematico: 'Ciencias Sociales' }],
        total: 1,
        pages: 1,
      };
    });

    render(<PlantaDocenteReportView />);
    fireEvent.click(await screen.findByRole('button', { name: /generar reporte/i }));

    await waitFor(() => expect(screen.getByText('Ana Pérez')).toBeInTheDocument());
    expect(screen.getByText('Detalle (1 docente)')).toBeInTheDocument();
  });

  it('muestra un error legible si el backend rechaza la consulta (p. ej. RBAC)', async () => {
    mockGet(async () => {
      throw new Error('Acceso denegado');
    });
    const { toast } = await import('sonner');

    render(<PlantaDocenteReportView />);

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
  });
});
