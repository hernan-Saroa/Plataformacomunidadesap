import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TarifasInvestigadorAdmin from './TarifasInvestigadorAdmin';

const mockObtenerTarifasInvestigadores = vi.fn();
const mockCrearTarifaInvestigador = vi.fn();
const mockActualizarTarifaInvestigador = vi.fn();
const mockEliminarTarifaInvestigador = vi.fn();

vi.mock('../../services/api/viaticosService', () => {
  const mockObtenerTarifasInvestigadoresLocal = vi.fn();
  const mockCrearTarifaInvestigadorLocal = vi.fn();
  const mockActualizarTarifaInvestigadorLocal = vi.fn();
  const mockEliminarTarifaInvestigadorLocal = vi.fn();
  return {
    default: {
      obtenerTarifasInvestigadores: mockObtenerTarifasInvestigadoresLocal,
      crearTarifaInvestigador: mockCrearTarifaInvestigadorLocal,
      actualizarTarifaInvestigador: mockActualizarTarifaInvestigadorLocal,
      eliminarTarifaInvestigador: mockEliminarTarifaInvestigadorLocal,
    },
  };
});

describe('TarifasInvestigadorAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe renderizar la tabla de tarifas', async () => {
    const { default: viaticosService } = await import('../../services/api/viaticosService');
    viaticosService.obtenerTarifasInvestigadores.mockResolvedValue([
      { id: 1, categoriaInvestigador: 'JUNIOR', tarifaDiaria: 450000, activo: true },
    ]);

    render(<TarifasInvestigadorAdmin />);
    await waitFor(() => {
      expect(screen.getByText('JUNIOR')).toBeDefined();
      expect(screen.getByText('$450.000')).toBeDefined();
    });
  });

  it('debe mostrar error si falla la carga de tarifas', async () => {
    const { default: viaticosService } = await import('../../services/api/viaticosService');
    viaticosService.obtenerTarifasInvestigadores.mockRejectedValue(new Error('Error de red'));

    render(<TarifasInvestigadorAdmin />);
    await waitFor(() => {
      expect(screen.getByText('Error cargando tarifas')).toBeDefined();
    });
  });

  it('debe abrir el modal de nueva tarifa', async () => {
    const { default: viaticosService } = await import('../../services/api/viaticosService');
    viaticosService.obtenerTarifasInvestigadores.mockResolvedValue([]);

    render(<TarifasInvestigadorAdmin />);
    await waitFor(() => {
      expect(screen.getByText('Nueva Tarifa')).toBeDefined();
    });

    const botonNueva = screen.getByText('Nueva Tarifa');
    fireEvent.click(botonNueva);

    await waitFor(() => {
      expect(screen.getByText('Nueva Tarifa', { selector: 'h3' })).toBeDefined();
      expect(screen.getAllByText('Categoría').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Tarifa Diaria').length).toBeGreaterThan(0);
    });
  });

  it('debe guardar una tarifa correctamente', async () => {
    const { default: viaticosService } = await import('../../services/api/viaticosService');
    viaticosService.obtenerTarifasInvestigadores.mockResolvedValue([]);
    viaticosService.crearTarifaInvestigador.mockResolvedValue({ id: 1, categoriaInvestigador: 'JUNIOR', tarifaDiaria: 450000, activo: true });

    render(<TarifasInvestigadorAdmin />);
    await waitFor(() => {
      expect(screen.getByText('Nueva Tarifa')).toBeDefined();
    });

    const botonNueva = screen.getByText('Nueva Tarifa');
    fireEvent.click(botonNueva);

    await waitFor(() => {
      expect(screen.getByText('Guardar')).toBeDefined();
    });

    const botonGuardar = screen.getByText('Guardar');
    fireEvent.click(botonGuardar);

    await waitFor(() => {
      expect(viaticosService.crearTarifaInvestigador).toHaveBeenCalled();
    });
  });
});
