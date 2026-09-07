import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ParametrosLiquidacionAdmin from './ParametrosLiquidacionAdmin';

vi.mock('../../services/api/viaticosService', () => {
  const mockObtenerParametrosLiquidacion = vi.fn();
  const mockActualizarParametrosLiquidacion = vi.fn();
  return {
    default: {
      obtenerParametrosLiquidacion: mockObtenerParametrosLiquidacion,
      actualizarParametrosLiquidacion: mockActualizarParametrosLiquidacion,
    },
  };
});

describe('ParametrosLiquidacionAdmin', () => {
  it('debe renderizar el formulario de parámetros', async () => {
    const { default: viaticosService } = await import('../../services/api/viaticosService');
    viaticosService.obtenerParametrosLiquidacion.mockResolvedValue([
      { id: 1, clave: 'SMMLV_2026', valor: '1423500', tipo: 'NUMBER', descripcion: 'Salario mínimo mensual vigente 2026' },
      { id: 2, clave: 'FACTOR_CONTRATISTA', valor: '0.8', tipo: 'NUMBER', descripcion: 'Factor de descuento para contratistas' },
      { id: 3, clave: 'FACTOR_SIN_PERNOCTA', valor: '0.5', tipo: 'NUMBER', descripcion: 'Factor aplicado cuando no hay pernocta' },
      { id: 4, clave: 'ANO_VIGENCIA_ESCALAS', valor: '2026', tipo: 'NUMBER', descripcion: 'Año de vigencia de las escalas de viáticos' },
      { id: 5, clave: 'CACHE_TTL_MINUTES', valor: '5', tipo: 'NUMBER', descripcion: 'Tiempo de vida del caché en memoria' },
    ]);

    render(<ParametrosLiquidacionAdmin />);
    await waitFor(() => {
      expect(screen.getByText('SMMLV 2026')).toBeDefined();
      expect(screen.getByText('Factor Contratista')).toBeDefined();
      expect(screen.getByText('Factor Sin Pernocta')).toBeDefined();
      expect(screen.getByText('Año Vigencia Escalas')).toBeDefined();
      expect(screen.getByText('Cache TTL (minutos)')).toBeDefined();
    });
  });

  it('debe mostrar error si falla la carga de parámetros', async () => {
    const { default: viaticosService } = await import('../../services/api/viaticosService');
    viaticosService.obtenerParametrosLiquidacion.mockRejectedValue(new Error('Error de red'));

    render(<ParametrosLiquidacionAdmin />);
    await waitFor(() => {
      expect(screen.getByText('Error cargando parámetros')).toBeDefined();
    });
  });

  it('debe guardar parámetros correctamente', async () => {
    const { default: viaticosService } = await import('../../services/api/viaticosService');
    viaticosService.obtenerParametrosLiquidacion.mockResolvedValue([
      { id: 1, clave: 'SMMLV_2026', valor: '1423500', tipo: 'NUMBER', descripcion: 'Salario mínimo mensual vigente 2026' },
      { id: 2, clave: 'FACTOR_CONTRATISTA', valor: '0.8', tipo: 'NUMBER', descripcion: 'Factor de descuento para contratistas' },
    ]);
    viaticosService.actualizarParametrosLiquidacion.mockResolvedValue([
      { id: 1, clave: 'SMMLV_2026', valor: '1500000', tipo: 'NUMBER' },
      { id: 2, clave: 'FACTOR_CONTRATISTA', valor: '0.75', tipo: 'NUMBER' },
    ]);

    render(<ParametrosLiquidacionAdmin />);
    await waitFor(() => {
      expect(screen.getByText('Guardar Cambios')).toBeDefined();
    });

    const botonGuardar = screen.getByText('Guardar Cambios');
    fireEvent.click(botonGuardar);

    await waitFor(() => {
      expect(viaticosService.actualizarParametrosLiquidacion).toHaveBeenCalledWith({
        smmlv: 1423500,
        factorContratista: 0.8,
      });
    });
  });

  it('debe mostrar mensaje de éxito al guardar', async () => {
    const { default: viaticosService } = await import('../../services/api/viaticosService');
    viaticosService.obtenerParametrosLiquidacion.mockResolvedValue([
      { id: 1, clave: 'SMMLV_2026', valor: '1423500', tipo: 'NUMBER', descripcion: 'Salario mínimo mensual vigente 2026' },
    ]);
    viaticosService.actualizarParametrosLiquidacion.mockResolvedValue([
      { id: 1, clave: 'SMMLV_2026', valor: '1500000', tipo: 'NUMBER' },
    ]);

    render(<ParametrosLiquidacionAdmin />);
    await waitFor(() => {
      expect(screen.getByText('Guardar Cambios')).toBeDefined();
    });

    const botonGuardar = screen.getByText('Guardar Cambios');
    fireEvent.click(botonGuardar);

    await waitFor(() => {
      expect(screen.getByText(/Parámetros actualizados correctamente/)).toBeDefined();
    });
  });
});
