import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import AnalystInbox from './AnalystInbox';

vi.mock('../services/api/viaticosService', () => ({
  default: {
    obtenerSolicitudesAsignadasAnalista: vi.fn(),
    obtenerDependencias: vi.fn(),
    obtenerSolicitudCompleta: vi.fn(),
  },
}));

import viaticosService from '../services/api/viaticosService';

const solMock = (overrides: any = {}) => ({
  id: 'sol-001',
  consecutivoUnico: 'COM-2026-0001',
  estadoSolicitud: 'SOLICITADO',
  comisionado: {
    primerNombre: 'Juan',
    primerApellido: 'Pérez',
    numeroDocumento: '123456789',
  },
  destinoCiudad: 'Bogotá',
  destinoDepartamento: 'Cundinamarca',
  fechaInicio: '2026-09-10',
  fechaFin: '2026-09-15',
  prioridad: 'ALTA',
  ...overrides,
});

describe('AnalystInbox', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (viaticosService.obtenerDependencias as any).mockResolvedValue([]);
  });

  it('muestra el estado de carga inicialmente', () => {
    (viaticosService.obtenerSolicitudesAsignadasAnalista as any).mockResolvedValue([]);

    render(<AnalystInbox />);

    expect(screen.getByText('Cargando solicitudes...')).toBeDefined();
  });

  it('renderiza las solicitudes después de fetch', async () => {
    (viaticosService.obtenerSolicitudesAsignadasAnalista as any).mockResolvedValue([
      solMock(),
    ]);

    render(<AnalystInbox />);

    await waitFor(() => {
      expect(screen.getByText('COM-2026-0001')).toBeDefined();
      expect(screen.getByText('Juan Pérez')).toBeDefined();
    });
  });

  it('muestra mensaje cuando no hay solicitudes asignadas', async () => {
    (viaticosService.obtenerSolicitudesAsignadasAnalista as any).mockResolvedValue([]);

    render(<AnalystInbox />);

    await waitFor(() => {
      expect(screen.getByText('No tienes solicitudes asignadas.')).toBeDefined();
    });
  });

it('filtra por búsqueda', async () => {
    (viaticosService.obtenerSolicitudesAsignadasAnalista as any).mockResolvedValue([
      solMock({ consecutivoUnico: 'COM-2026-0001', comisionado: { primerNombre: 'Juan', primerApellido: 'Pérez', numeroDocumento: '123456789' } }),
      solMock({ id: 'sol-002', consecutivoUnico: 'COM-2026-0002', comisionado: { primerNombre: 'Ana', primerApellido: 'Gómez', numeroDocumento: '987654321' } }),
    ]);

    render(<AnalystInbox />);

    await waitFor(() => expect(screen.getByText('COM-2026-0001')).toBeDefined());

    const input = screen.getByPlaceholderText('Buscar por consecutivo, comisionado, documento, ciudad o estado...');
    fireEvent.change(input, { target: { value: 'Ana' } });

    await waitFor(() => {
      expect(screen.queryByText('COM-2026-0001')).toBeNull();
      expect(screen.getByText('COM-2026-0002')).toBeDefined();
    });
  });

  it('abre el modal al hacer clic en Iniciar Auditoría', async () => {
    (viaticosService.obtenerSolicitudesAsignadasAnalista as any).mockResolvedValue([solMock()]);
    (viaticosService.obtenerSolicitudCompleta as any).mockResolvedValue({
      id: 'sol-001',
      consecutivoUnico: 'COM-2026-0001',
      comisionado: { primerNombre: 'Juan', primerApellido: 'Pérez', numeroDocumento: '123456789' },
      destinoCiudad: 'Bogotá',
      destinoDepartamento: 'Cundinamarca',
      fechaInicio: '2026-09-10',
      fechaFin: '2026-09-15',
      objetoComision: 'Reunión técnica',
      prioridad: 'ALTA',
      rubroPresupuestal: 'RUBRO-001',
      montoViaticos: 1000000,
      montoGastosViaje: 500000,
      diasComision: 5,
      estadoSolicitud: 'SOLICITADO',
    });

    render(<AnalystInbox />);

    await waitFor(() => expect(screen.getByText('COM-2026-0001')).toBeDefined());

    fireEvent.click(screen.getByText('Auditoría'));

    await waitFor(() => {
      expect(screen.getByText('Auditoría de Soportes y Exportación SIIF')).toBeDefined();
    });
  });
});