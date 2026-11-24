// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HorarioGruposVirtuales } from './HorarioGruposVirtuales';
import { definirFranjaVirtual, getGruposVirtuales, quitarFranjaVirtual } from '../services/api/horarioDocenteApi';

vi.mock('../services/api/horarioDocenteApi', () => ({
  getGruposVirtuales: vi.fn(), definirFranjaVirtual: vi.fn(), quitarFranjaVirtual: vi.fn(),
}));

const grupo = (extra: Record<string, unknown> = {}) => ({
  idGrupo: 'g-1', numeroGrupo: 1, codigoAsignatura: 'ASIG-00010', asignatura: 'Teoría del Estado', programa: 'AP',
  nivel: 'pregrado', idPeriodo: '7', periodoCodigo: '2027-1', cicloInicio: '2027-02-01', cicloFin: '2027-05-24',
  horasRequeridas: 64, horasProgramadas: 0, horasMaximas: 83.2, franjas: [], editable: true, motivoNoEditable: null, ...extra,
});

beforeEach(() => { vi.clearAllMocks(); });
afterEach(cleanup);

describe('Mi programación: horario de los grupos virtuales (063)', () => {
  it('sin grupos virtuales no muestra nada', async () => {
    vi.mocked(getGruposVirtuales).mockResolvedValue([]);
    const { container } = render(<HorarioGruposVirtuales />);
    await waitFor(() => expect(getGruposVirtuales).toHaveBeenCalled());
    expect(container.textContent).toBe('');
  });

  it('muestra el grupo sin horario con sus horas requeridas y máximas, y agrega una sesión', async () => {
    vi.mocked(getGruposVirtuales).mockResolvedValue([grupo()] as any);
    vi.mocked(definirFranjaVirtual).mockResolvedValue({ idFranja: 'f-1' });
    render(<HorarioGruposVirtuales />);
    expect(await screen.findByText(/Aún no tiene horario/)).toBeTruthy();
    expect(screen.getByText(/requeridas/).textContent).toMatch(/0 h programadas de 64 h requeridas · máximo 83.2 h/);
    fireEvent.change(screen.getByLabelText('Día'), { target: { value: 'MARTES' } });
    fireEvent.change(screen.getByLabelText('Inicio'), { target: { value: '08:00' } });
    fireEvent.change(screen.getByLabelText('Fin'), { target: { value: '10:00' } });
    fireEvent.click(screen.getByRole('button', { name: /Agregar sesión/ }));
    await waitFor(() => expect(definirFranjaVirtual).toHaveBeenCalledWith('g-1', { diaSemana: 'MARTES', horaInicio: '08:00', horaFin: '10:00' }));
  });

  it('el rechazo del servidor (p. ej. cruce) se muestra tal cual', async () => {
    vi.mocked(getGruposVirtuales).mockResolvedValue([grupo()] as any);
    vi.mocked(definirFranjaVirtual).mockRejectedValue(new Error('No puede programar esta sesión: se cruza con otra clase suya el lunes de 08:00 a 10:00.'));
    render(<HorarioGruposVirtuales />);
    fireEvent.click(await screen.findByRole('button', { name: /Agregar sesión/ }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/se cruza con otra clase suya/);
  });

  it('solo se quitan las sesiones que definió el docente', async () => {
    vi.mocked(getGruposVirtuales).mockResolvedValue([grupo({ franjas: [
      { idFranja: 'f-p', diaSemana: 'LUNES', horaInicio: '08:00', horaFin: '10:00', estado: 'TOMADA', definidaPor: 'programador' },
      { idFranja: 'f-d', diaSemana: 'MARTES', horaInicio: '08:00', horaFin: '10:00', estado: 'TOMADA', definidaPor: 'docente' },
    ] })] as any);
    vi.mocked(quitarFranjaVirtual).mockResolvedValue({ eliminada: true });
    render(<HorarioGruposVirtuales />);
    expect(await screen.findByText(/Lunes 08:00–10:00/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Quitar la sesión del Lunes/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Quitar la sesión del Martes/ }));
    await waitFor(() => expect(quitarFranjaVirtual).toHaveBeenCalledWith('g-1', 'f-d'));
  });

  it('en concertación no se edita: se explica por qué y no hay formulario', async () => {
    vi.mocked(getGruposVirtuales).mockResolvedValue([grupo({ editable: false,
      motivoNoEditable: 'Su programación está en concertación (ENVIADA): pida que se la devuelvan para cambiar el horario.' })] as any);
    render(<HorarioGruposVirtuales />);
    expect(await screen.findByText(/está en concertación \(ENVIADA\)/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Agregar sesión/ })).toBeNull();
  });
});
