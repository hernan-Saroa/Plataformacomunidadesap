// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { CalendarioHorario } from './CalendarioHorario';
import { definirPeriodoGrupo, getAulas, getGrupo, getHorasGrupo, getSesiones } from '../services/api/catalogoApi';

/** EFDS-2448: «Guardar periodo» exige las dos fechas del ciclo y al menos una sesión; «MI» es el miércoles. */
vi.mock('../services/actualizacionProgramacion', () => ({ useRevisionProgramacion: () => 0, invalidarProgramacion: vi.fn() }));
vi.mock('../services/api/catalogoApi', () => ({
  getGrupo: vi.fn(), getAulas: vi.fn(), getHorasGrupo: vi.fn(), getSesiones: vi.fn(), definirPeriodoGrupo: vi.fn(),
  actualizarOfertaCetapGrupo: vi.fn(),
  esSinAula: (m: string) => m === 'virtual' || m === 'distancia',
  etiquetaModalidad: (m: string) => (m === 'virtual' ? 'Virtual' : 'Presencial'),
}));
const sesion = { idFranja: 'f1', idGrupo: 'g1', diaSemana: 'LUNES', horaInicio: '08:00', horaFin: '10:00', tipoSesion: 'presencial', aulaCodigo: '102', estado: 'PROGRAMADO' };
const props = { idGrupo: 'g1', numeroGrupo: 1, nombreAsignatura: 'Constitución del Territorio' };
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getGrupo).mockResolvedValue({ fechaInicio: '2027-02-01', fechaFin: '2027-06-15', idOfertaCetap: null } as any);
  vi.mocked(getAulas).mockResolvedValue([]);
  vi.mocked(getHorasGrupo).mockResolvedValue({ programadas: 32, requeridas: 64, semanas: 16, excede: false });
  vi.mocked(getSesiones).mockResolvedValue([sesion] as any);
  vi.mocked(definirPeriodoGrupo).mockResolvedValue({} as any);
});
afterEach(cleanup);

const guardar = async () => {
  const boton = await screen.findByRole('button', { name: 'Guardar periodo' });
  await waitFor(() => expect((boton as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(boton);
};

it('sin sesiones no guarda y avisa el motivo', async () => {
  vi.mocked(getSesiones).mockResolvedValue([]);
  render(<CalendarioHorario {...props} />);
  await guardar();
  expect((await screen.findByRole('alert')).textContent).toBe('No se guardó el periodo del grupo: falta al menos una sesión en el horario.');
  expect(definirPeriodoGrupo).not.toHaveBeenCalled();
});

it('sin una fecha del ciclo no guarda y avisa el motivo', async () => {
  render(<CalendarioHorario {...props} />);
  await guardar();
  await waitFor(() => expect(definirPeriodoGrupo).toHaveBeenCalledTimes(1));
  fireEvent.change(screen.getByLabelText('Fin del ciclo'), { target: { value: '' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar periodo' }));
  expect((await screen.findByRole('alert')).textContent).toMatch(/falta la fecha de fin del ciclo/);
  expect(definirPeriodoGrupo).toHaveBeenCalledTimes(1);
});

it('con fechas y una sesión guarda', async () => {
  render(<CalendarioHorario {...props} />);
  await guardar();
  await waitFor(() => expect(definirPeriodoGrupo).toHaveBeenCalledWith('g1', { fechaInicio: '2027-02-01', fechaFin: '2027-06-15' }));
  expect(await screen.findByText('Periodo guardado.')).toBeTruthy();
  expect(screen.queryByRole('alert')).toBeNull();
});

it('el motivo del servidor también se muestra como alerta', async () => {
  vi.mocked(definirPeriodoGrupo).mockRejectedValue(new Error('No se guardó el periodo del grupo: falta al menos una sesión en el horario.'));
  render(<CalendarioHorario {...props} />);
  await guardar();
  expect((await screen.findByRole('alert')).textContent).toMatch(/al menos una sesión/);
});

it('grupo virtual sin sesiones: el horario es opcional y guarda con las fechas', async () => {
  vi.mocked(getSesiones).mockResolvedValue([]);
  render(<CalendarioHorario {...props} modalidad="virtual" />);
  await guardar();
  await waitFor(() => expect(definirPeriodoGrupo).toHaveBeenCalledTimes(1));
});

it('la selección de días muestra «MI» para el miércoles y ninguna «X»', async () => {
  render(<CalendarioHorario {...props} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Agregar sesión' }));
  const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(n => screen.getByRole('button', { name: n }).textContent);
  expect(dias).toEqual(['L', 'M', 'MI', 'J', 'V', 'S', 'D']);
});
