import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import HorarioLaboralAdmin from './HorarioLaboralAdmin';
import viaticosService from '../../services/api/viaticosService';
import { ConfigJornadaLaboral } from '../../types/parametrizacion';

vi.mock('../../services/api/viaticosService', () => ({
  default: {
    obtenerConfiguracionesJornada: vi.fn(),
    crearConfigJornada: vi.fn(),
    actualizarConfigJornada: vi.fn(),
    activarConfigJornada: vi.fn(),
    eliminarConfigJornada: vi.fn(),
  },
}));

const mockJornadas: ConfigJornadaLaboral[] = [
  {
    id: 1,
    codigo: 'DEFAULT',
    nombre: 'Jornada Laboral Institucional',
    horaInicio: '08:00',
    horaFin: '16:30',
    diasLaborales: [1, 2, 3, 4, 5],
    diasAnticipacionMinima: 14,
    diasUmbralAvance: 5,
    activo: true,
    descripcion: 'Horario estándar de oficina',
  },
  {
    id: 2,
    codigo: 'JORNADA_EXTENDIDA',
    nombre: 'Jornada Continua 17h',
    horaInicio: '07:30',
    horaFin: '17:00',
    diasLaborales: [1, 2, 3, 4, 5, 6],
    diasAnticipacionMinima: 10,
    diasUmbralAvance: 4,
    activo: false,
    descripcion: 'Horario con sábados incluidos',
  },
];

describe('HorarioLaboralAdmin — Gestión de Jornada y Días Hábiles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(viaticosService.obtenerConfiguracionesJornada).mockResolvedValue(mockJornadas);
  });

  it('renderiza la lista de jornadas y destaca la jornada institucional activa', async () => {
    render(<HorarioLaboralAdmin />);

    await waitFor(() => {
      expect(screen.getAllByText('Jornada Laboral Institucional').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Jornada Continua 17h')).toBeInTheDocument();
    });

    expect(screen.getByText('Jornada Institucional Activa')).toBeInTheDocument();
    expect(screen.getByText('14 días hábiles')).toBeInTheDocument();
  });

  it('permite abrir el modal de nueva jornada y guardar una configuración', async () => {
    vi.mocked(viaticosService.crearConfigJornada).mockResolvedValueOnce({
      id: 3,
      codigo: 'JORNADA_NUEVA',
      nombre: 'Jornada Nueva',
      horaInicio: '08:30',
      horaFin: '16:30',
      diasLaborales: [1, 2, 3, 4, 5],
      diasAnticipacionMinima: 12,
      diasUmbralAvance: 5,
      activo: false,
    });

    render(<HorarioLaboralAdmin />);

    await waitFor(() => {
      expect(screen.getAllByText('Jornada Laboral Institucional').length).toBeGreaterThanOrEqual(1);
    });

    const btnNuevo = screen.getByRole('button', { name: /Nueva Jornada Laboral/i });
    fireEvent.click(btnNuevo);

    expect(screen.getByRole('heading', { name: /Nueva Jornada Laboral/i })).toBeInTheDocument();

    const inputCodigo = screen.getByPlaceholderText(/Ej\. JORNADA_ORDINARIA/i);
    const inputNombre = screen.getByPlaceholderText(/Ej\. Jornada Institucional Sede Central/i);

    fireEvent.change(inputCodigo, { target: { value: 'JORNADA_NUEVA' } });
    fireEvent.change(inputNombre, { target: { value: 'Jornada Nueva' } });

    const btnGuardar = screen.getByRole('button', { name: /Crear Jornada/i });
    fireEvent.click(btnGuardar);

    await waitFor(() => {
      expect(viaticosService.crearConfigJornada).toHaveBeenCalledWith(
        expect.objectContaining({
          codigo: 'JORNADA_NUEVA',
          nombre: 'Jornada Nueva',
          horaInicio: '08:00',
          horaFin: '16:30',
          diasAnticipacionMinima: 14,
        }),
      );
    });
  });

  it('permite activar una jornada inactiva como configuración principal', async () => {
    vi.mocked(viaticosService.activarConfigJornada).mockResolvedValueOnce({
      ...mockJornadas[1],
      activo: true,
    });

    render(<HorarioLaboralAdmin />);

    await waitFor(() => {
      expect(screen.getByText('Jornada Continua 17h')).toBeInTheDocument();
    });

    const btnActivar = screen.getByRole('button', { name: /Activar/i });
    fireEvent.click(btnActivar);

    await waitFor(() => {
      expect(viaticosService.activarConfigJornada).toHaveBeenCalledWith(2);
    });
  });

  it('permite eliminar una jornada inactiva tras confirmación', async () => {
    vi.mocked(viaticosService.eliminarConfigJornada).mockResolvedValueOnce({ success: true });

    render(<HorarioLaboralAdmin />);

    await waitFor(() => {
      expect(screen.getByText('Jornada Continua 17h')).toBeInTheDocument();
    });

    const btnEliminar = screen.getByTitle('Eliminar jornada');
    fireEvent.click(btnEliminar);

    expect(screen.getByText('Eliminar Configuración')).toBeInTheDocument();

    const btnConfirmar = screen.getByRole('button', { name: /Sí, Eliminar/i });
    fireEvent.click(btnConfirmar);

    await waitFor(() => {
      expect(viaticosService.eliminarConfigJornada).toHaveBeenCalledWith(2);
    });
  });
});
