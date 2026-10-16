import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import TableroCargaAnalistas from './TableroCargaAnalistas';

vi.mock('../services/api/viaticosService', () => ({
  default: {
    obtenerCargaAnalistas: vi.fn(),
  },
}));

import viaticosService from '../services/api/viaticosService';

describe('TableroCargaAnalistas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe mostrar el estado de carga mientras se cargan los datos', () => {
    (viaticosService.obtenerCargaAnalistas as any).mockResolvedValue({ data: [], total: 0 });

    render(
      <TableroCargaAnalistas
        analistaSeleccionadoId={null}
        onSeleccionarAnalista={() => {}}
      />,
    );

    expect(screen.getByText('Cargando analistas...')).toBeDefined();
  });

  it('debe renderizar la lista de analistas después de cargar', async () => {
    const analistasMock = [
      {
        usuarioId: 'user-1',
        nombreCompleto: 'Ana Gómez',
        username: 'ana.gomez',
        identificacion: '123456',
        asignacionesActivas: 2,
        altas: 1,
        medias: 1,
        bajas: 0,
        puntajeTotal: 5,
        colorSemaforo: 'VERDE',
      },
      {
        usuarioId: 'user-2',
        nombreCompleto: 'Luis Pérez',
        username: 'luis.perez',
        identificacion: '789012',
        asignacionesActivas: 5,
        altas: 3,
        medias: 1,
        bajas: 1,
        puntajeTotal: 14,
        colorSemaforo: 'ROJO',
      },
    ];

    (viaticosService.obtenerCargaAnalistas as any).mockResolvedValue({ data: analistasMock, total: 2 });

    render(
      <TableroCargaAnalistas
        analistaSeleccionadoId={null}
        onSeleccionarAnalista={() => {}}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Ana Gómez')).toBeDefined();
      expect(screen.getByText('Luis Pérez')).toBeDefined();
    });

    expect(screen.getByText('@ana.gomez')).toBeDefined();
    expect(screen.getByText('@luis.perez')).toBeDefined();
  });

  it('debe filtrar analistas por búsqueda', async () => {
    const analistasMock = [
      {
        usuarioId: 'user-1',
        nombreCompleto: 'Ana Gómez',
        username: 'ana.gomez',
        identificacion: '123456',
        asignacionesActivas: 2,
        altas: 1,
        medias: 1,
        bajas: 0,
        puntajeTotal: 5,
        colorSemaforo: 'VERDE',
      },
      {
        usuarioId: 'user-2',
        nombreCompleto: 'Luis Pérez',
        username: 'luis.perez',
        identificacion: '789012',
        asignacionesActivas: 5,
        altas: 3,
        medias: 1,
        bajas: 1,
        puntajeTotal: 14,
        colorSemaforo: 'ROJO',
      },
    ];

    (viaticosService.obtenerCargaAnalistas as any).mockResolvedValue({ data: analistasMock, total: 2 });

    render(
      <TableroCargaAnalistas
        analistaSeleccionadoId={null}
        onSeleccionarAnalista={() => {}}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Ana Gómez')).toBeDefined();
    });

    const input = screen.getByPlaceholderText('Buscar por nombre, usuario o ID...');
    fireEvent.change(input, { target: { value: 'Luis' } });

    await waitFor(() => {
      expect(screen.queryByText('Ana Gómez')).toBeNull();
      expect(screen.getByText('Luis Pérez')).toBeDefined();
    });
  });

  it('debe solicitar la carga con el ID de la solicitud y mostrar mensaje específico si no hay analistas en la dependencia', async () => {
    (viaticosService.obtenerCargaAnalistas as any).mockResolvedValue({ data: [], total: 0 });

    render(
      <TableroCargaAnalistas
        analistaSeleccionadoId={null}
        onSeleccionarAnalista={() => {}}
        solicitudId="sol-123"
      />,
    );

    await waitFor(() => {
      expect(viaticosService.obtenerCargaAnalistas).toHaveBeenCalledWith('sol-123');
      expect(
        screen.getByText('No se encontraron analistas activos asignados a la misma dependencia de la solicitud.'),
      ).toBeDefined();
    });
  });
});
