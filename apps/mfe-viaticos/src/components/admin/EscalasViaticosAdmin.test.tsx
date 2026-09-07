import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EscalasViaticosAdmin from './EscalasViaticosAdmin';

const mockObtenerEscalas = vi.fn();
const mockCrearEscala = vi.fn();
const mockActualizarEscala = vi.fn();
const mockEliminarEscala = vi.fn();

vi.mock('../../services/api/viaticosService', () => {
  const mockObtenerEscalasLocal = vi.fn();
  const mockCrearEscalaLocal = vi.fn();
  const mockActualizarEscalaLocal = vi.fn();
  const mockEliminarEscalaLocal = vi.fn();
  return {
    default: {
      obtenerEscalas: mockObtenerEscalasLocal,
      crearEscala: mockCrearEscalaLocal,
      actualizarEscala: mockActualizarEscalaLocal,
      eliminarEscala: mockEliminarEscalaLocal,
    },
  };
});

describe('EscalasViaticosAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe renderizar la tabla de escalas', async () => {
    const { default: viaticosService } = await import('../../services/api/viaticosService');
    viaticosService.obtenerEscalas.mockResolvedValue([
      { id: 1, decretoVigente: 'Decreto 314', anoVigencia: 2026, rangoMinimo: 4500000, rangoMaximo: 5500000, tarifaDiaria: 650000, activo: true },
    ]);

    render(<EscalasViaticosAdmin />);
    await waitFor(() => {
      expect(screen.getByText('Decreto 314')).toBeDefined();
      expect(screen.getByText('2026')).toBeDefined();
      expect(screen.getByText('$4.500.000')).toBeDefined();
      expect(screen.getByText('$5.500.000')).toBeDefined();
      expect(screen.getByText('$650.000')).toBeDefined();
    });
  });

  it('debe mostrar error si falla la carga de escalas', async () => {
    const { default: viaticosService } = await import('../../services/api/viaticosService');
    viaticosService.obtenerEscalas.mockRejectedValue(new Error('Error de red'));

    render(<EscalasViaticosAdmin />);
    await waitFor(() => {
      expect(screen.getByText('Error cargando escalas')).toBeDefined();
    });
  });

  it('debe abrir el modal de nueva escala', async () => {
    const { default: viaticosService } = await import('../../services/api/viaticosService');
    viaticosService.obtenerEscalas.mockResolvedValue([]);

    render(<EscalasViaticosAdmin />);
    await waitFor(() => {
      expect(screen.getByText('Nueva Escala')).toBeDefined();
    });

    const botonNueva = screen.getByText('Nueva Escala');
    fireEvent.click(botonNueva);

    await waitFor(() => {
      const h3 = screen.getAllByText('Nueva Escala').find(el => el.tagName === 'H3');
      expect(h3).toBeDefined();
      expect(screen.getByText('Decreto Vigente')).toBeDefined();
      expect(screen.getAllByText('Rango Mínimo').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Tarifa Diaria').length).toBeGreaterThan(0);
    });
  });

  it('debe guardar una escala correctamente', async () => {
    const { default: viaticosService } = await import('../../services/api/viaticosService');
    viaticosService.obtenerEscalas.mockResolvedValue([]);
    viaticosService.crearEscala.mockResolvedValue({ id: 1, decretoVigente: 'Decreto 314', anoVigencia: 2026, rangoMinimo: 4500000, rangoMaximo: 5500000, tarifaDiaria: 650000, activo: true });

    render(<EscalasViaticosAdmin />);
    await waitFor(() => {
      expect(screen.getByText('Nueva Escala')).toBeDefined();
    });

    const botonNueva = screen.getByText('Nueva Escala');
    fireEvent.click(botonNueva);

    await waitFor(() => {
      expect(screen.getByText('Guardar')).toBeDefined();
    });

    const botonGuardar = screen.getByText('Guardar');
    fireEvent.click(botonGuardar);

    await waitFor(() => {
      expect(viaticosService.crearEscala).toHaveBeenCalled();
    });
  });
});
