import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import SolicitudesAsignadasAnalista from './SolicitudesAsignadasAnalista';

vi.mock('../services/api/viaticosService', () => ({
  default: {
    obtenerSolicitudesAsignadas: vi.fn(),
  },
}));

import viaticosService from '../services/api/viaticosService';

describe('SolicitudesAsignadasAnalista', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe mostrar el estado de carga mientras se cargan los datos', () => {
    (viaticosService.obtenerSolicitudesAsignadas as any).mockResolvedValue([]);

    render(<SolicitudesAsignadasAnalista />);

    expect(screen.getByText('Cargando solicitudes...')).toBeDefined();
  });

  it('debe mostrar mensaje cuando no hay solicitudes asignadas', async () => {
    (viaticosService.obtenerSolicitudesAsignadas as any).mockResolvedValue([]);

    render(<SolicitudesAsignadasAnalista />);

    await waitFor(() => {
      expect(screen.getByText('No tienes solicitudes asignadas.')).toBeDefined();
    });
  });

  it('debe renderizar la lista de solicitudes asignadas', async () => {
    const solicitudesMock = [
      {
        id: 'sol-001',
        consecutivoUnico: 'COM-2026-0001',
        estadoSolicitud: 'SOLICITADO',
        comisionado: {
          primerNombre: 'Juan',
          primerApellido: 'Pérez',
        },
        destinoCiudad: 'Bogotá',
        destinoDepartamento: 'Cundinamarca',
        fechaInicio: '2026-09-10',
        fechaFin: '2026-09-15',
        prioridad: 'ALTA',
      },
      {
        id: 'sol-002',
        consecutivoUnico: 'COM-2026-0002',
        estadoSolicitud: 'EN_VERIFICACION',
        comisionado: {
          primerNombre: 'Ana',
          primerApellido: 'Gómez',
        },
        destinoCiudad: 'Medellín',
        destinoDepartamento: 'Antioquia',
        fechaInicio: '2026-09-12',
        fechaFin: '2026-09-18',
        prioridad: 'MEDIA',
      },
    ];

    (viaticosService.obtenerSolicitudesAsignadas as any).mockResolvedValue(solicitudesMock);

    render(<SolicitudesAsignadasAnalista />);

    await waitFor(() => {
      expect(screen.getByText('COM-2026-0001')).toBeDefined();
      expect(screen.getByText('COM-2026-0002')).toBeDefined();
    });

    expect(screen.getByText('Juan Pérez')).toBeDefined();
    expect(screen.getByText('Ana Gómez')).toBeDefined();
  });

  it('debe filtrar solicitudes por búsqueda', async () => {
    const solicitudesMock = [
      {
        id: 'sol-001',
        consecutivoUnico: 'COM-2026-0001',
        estadoSolicitud: 'SOLICITADO',
        comisionado: {
          primerNombre: 'Juan',
          primerApellido: 'Pérez',
        },
        destinoCiudad: 'Bogotá',
        destinoDepartamento: 'Cundinamarca',
        fechaInicio: '2026-09-10',
        fechaFin: '2026-09-15',
        prioridad: 'ALTA',
      },
      {
        id: 'sol-002',
        consecutivoUnico: 'COM-2026-0002',
        estadoSolicitud: 'EN_VERIFICACION',
        comisionado: {
          primerNombre: 'Ana',
          primerApellido: 'Gómez',
        },
        destinoCiudad: 'Medellín',
        destinoDepartamento: 'Antioquia',
        fechaInicio: '2026-09-12',
        fechaFin: '2026-09-18',
        prioridad: 'MEDIA',
      },
    ];

    (viaticosService.obtenerSolicitudesAsignadas as any).mockResolvedValue(solicitudesMock);

    render(<SolicitudesAsignadasAnalista />);

    await waitFor(() => {
      expect(screen.getByText('COM-2026-0001')).toBeDefined();
    });

    const input = screen.getByPlaceholderText('Buscar por consecutivo, comisionado, ciudad o estado...');
    fireEvent.change(input, { target: { value: 'Ana' } });

    await waitFor(() => {
      expect(screen.queryByText('COM-2026-0001')).toBeNull();
      expect(screen.getByText('COM-2026-0002')).toBeDefined();
    });
  });
});
