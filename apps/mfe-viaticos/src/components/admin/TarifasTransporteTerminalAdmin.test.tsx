import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TarifasTransporteTerminalAdmin from './TarifasTransporteTerminalAdmin';

vi.mock('../../services/api/viaticosService', () => {
  const mockObtenerTarifasTransporteTerminal = vi.fn();
  const mockObtenerDepartamentos = vi.fn();
  const mockCrearTarifaTransporteTerminal = vi.fn();
  const mockActualizarTarifaTransporteTerminal = vi.fn();
  const mockEliminarTarifaTransporteTerminal = vi.fn();
  return {
    default: {
      obtenerTarifasTransporteTerminal: mockObtenerTarifasTransporteTerminal,
      obtenerDepartamentos: mockObtenerDepartamentos,
      crearTarifaTransporteTerminal: mockCrearTarifaTransporteTerminal,
      actualizarTarifaTransporteTerminal: mockActualizarTarifaTransporteTerminal,
      eliminarTarifaTransporteTerminal: mockEliminarTarifaTransporteTerminal,
    },
  };
});

describe('TarifasTransporteTerminalAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe renderizar la tabla de tarifas de transporte terminal', async () => {
    const { default: viaticosService } = await import('../../services/api/viaticosService');
    viaticosService.obtenerTarifasTransporteTerminal.mockResolvedValue([
      {
        id: 1,
        departamento: 'Antioquia',
        departamentoId: 5,
        ciudadAeropuerto: 'ANTIOQUIA (Rionegro)',
        valorMaximoTrayecto: 162634,
        activo: true,
      },
    ]);
    viaticosService.obtenerDepartamentos.mockResolvedValue([
      { idGeopolitica: 13, codDepartamento: 5, nomDivGeopolitica: 'Antioquia', tipDivision: 'DEPTO' },
    ]);

    render(<TarifasTransporteTerminalAdmin />);
    await waitFor(() => {
      expect(screen.getByText('Antioquia')).toBeDefined();
      expect(screen.getByText('ANTIOQUIA (Rionegro)')).toBeDefined();
      expect(screen.getByText('$162.634')).toBeDefined();
      expect(screen.getByText('ID: 5')).toBeDefined();
    });
  });

  it('debe mostrar error si falla la carga', async () => {
    const { default: viaticosService } = await import('../../services/api/viaticosService');
    viaticosService.obtenerTarifasTransporteTerminal.mockRejectedValue(new Error('Error de red'));
    viaticosService.obtenerDepartamentos.mockResolvedValue([]);

    render(<TarifasTransporteTerminalAdmin />);
    await waitFor(() => {
      expect(screen.getByText('Error cargando tarifas de transporte terminal')).toBeDefined();
    });
  });

  it('debe abrir el modal de nueva tarifa terminal con departamentos de geopolitica', async () => {
    const { default: viaticosService } = await import('../../services/api/viaticosService');
    viaticosService.obtenerTarifasTransporteTerminal.mockResolvedValue([]);
    viaticosService.obtenerDepartamentos.mockResolvedValue([
      { idGeopolitica: 13, codDepartamento: 5, nomDivGeopolitica: 'Antioquia', tipDivision: 'DEPTO' },
    ]);

    render(<TarifasTransporteTerminalAdmin />);
    await waitFor(() => {
      expect(screen.getByText('Nueva Tarifa Terminal')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Nueva Tarifa Terminal'));

    await waitFor(() => {
      expect(screen.getByText('-- Seleccionar Departamento --')).toBeDefined();
      expect(screen.getByPlaceholderText('Ej: ANTIOQUIA (Rionegro), Otros')).toBeDefined();
      expect(screen.getByText('Crear Tarifa')).toBeDefined();
    });
  });
});
