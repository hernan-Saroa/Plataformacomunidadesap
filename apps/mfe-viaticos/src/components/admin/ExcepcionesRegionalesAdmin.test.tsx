import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ExcepcionesRegionalesAdmin from './ExcepcionesRegionalesAdmin';

const mockObtenerExcepcionesRegionales = vi.fn();
const mockCrearExcepcionRegional = vi.fn();
const mockActualizarExcepcionRegional = vi.fn();
const mockEliminarExcepcionRegional = vi.fn();
const mockObtenerCatalogoDepartamentos = vi.fn();

vi.mock('../../services/api/viaticosService', () => {
  const mockObtenerExcepcionesRegionalesLocal = vi.fn();
  const mockCrearExcepcionRegionalLocal = vi.fn();
  const mockActualizarExcepcionRegionalLocal = vi.fn();
  const mockEliminarExcepcionRegionalLocal = vi.fn();
  const mockObtenerCatalogoDepartamentosLocal = vi.fn();
  return {
    default: {
      obtenerExcepcionesRegionales: mockObtenerExcepcionesRegionalesLocal,
      crearExcepcionRegional: mockCrearExcepcionRegionalLocal,
      actualizarExcepcionRegional: mockActualizarExcepcionRegionalLocal,
      eliminarExcepcionRegional: mockEliminarExcepcionRegionalLocal,
      obtenerCatalogoDepartamentos: mockObtenerCatalogoDepartamentosLocal,
    },
  };
});

describe('ExcepcionesRegionalesAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe renderizar la tabla de excepciones', async () => {
    const { default: viaticosService } = await import('../../services/api/viaticosService');
    viaticosService.obtenerExcepcionesRegionales.mockResolvedValue([
      { id: 1, departamento: 'Amazonas', esNuevoDepartamento: true, tarifaDiaria: 380000, decretoReferencia: 'Decreto 314', activo: true },
    ]);
    viaticosService.obtenerCatalogoDepartamentos.mockResolvedValue(['Amazonas', 'Antioquia']);

    render(<ExcepcionesRegionalesAdmin />);
    await waitFor(() => {
      expect(screen.getByText('Amazonas')).toBeDefined();
      expect(screen.getByText('$380.000')).toBeDefined();
    });
  });

  it('debe mostrar error si falla la carga de excepciones', async () => {
    const { default: viaticosService } = await import('../../services/api/viaticosService');
    viaticosService.obtenerExcepcionesRegionales.mockRejectedValue(new Error('Error de red'));

    render(<ExcepcionesRegionalesAdmin />);
    await waitFor(() => {
      expect(screen.getByText('Error cargando excepciones')).toBeDefined();
    });
  });

  it('debe abrir el modal de nueva excepción', async () => {
    const { default: viaticosService } = await import('../../services/api/viaticosService');
    viaticosService.obtenerExcepcionesRegionales.mockResolvedValue([]);
    viaticosService.obtenerCatalogoDepartamentos.mockResolvedValue(['Amazonas', 'Antioquia']);

    render(<ExcepcionesRegionalesAdmin />);
    await waitFor(() => {
      expect(screen.getByText('Nueva Excepción')).toBeDefined();
    });

    const botonNueva = screen.getByText('Nueva Excepción');
    fireEvent.click(botonNueva);

    await waitFor(() => {
      expect(screen.getByText('Nueva Excepción Regional', { selector: 'h3' })).toBeDefined();
      expect(screen.getAllByText('Departamento').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Tarifa Diaria').length).toBeGreaterThan(0);
    });
  });

  it('debe guardar una excepción correctamente', async () => {
    const { default: viaticosService } = await import('../../services/api/viaticosService');
    viaticosService.obtenerExcepcionesRegionales.mockResolvedValue([]);
    viaticosService.obtenerCatalogoDepartamentos.mockResolvedValue(['Amazonas', 'Antioquia']);
    viaticosService.crearExcepcionRegional.mockResolvedValue({ id: 1, departamento: 'Amazonas', esNuevoDepartamento: true, tarifaDiaria: 380000, activo: true });

    render(<ExcepcionesRegionalesAdmin />);
    await waitFor(() => {
      expect(screen.getByText('Nueva Excepción')).toBeDefined();
    });

    const botonNueva = screen.getByText('Nueva Excepción');
    fireEvent.click(botonNueva);

    await waitFor(() => {
      expect(screen.getByText('Nueva Excepción Regional', { selector: 'h3' })).toBeDefined();
    });

    const selectDepto = screen.getByRole('combobox');
    fireEvent.change(selectDepto, { target: { value: 'Amazonas' } });

    const botonGuardar = screen.getByText('Guardar');
    fireEvent.click(botonGuardar);

    await waitFor(() => {
      expect(viaticosService.crearExcepcionRegional).toHaveBeenCalled();
    });
  });
});
