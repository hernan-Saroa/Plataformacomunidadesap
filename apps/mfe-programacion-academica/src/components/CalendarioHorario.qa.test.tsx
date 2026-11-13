// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { CalendarioHorario } from './CalendarioHorario';
import { PanelGrupos } from './PanelGrupos';
import { getGrupo, getAulas, getHorasGrupo, getSesiones } from '../services/api/catalogoApi';
import { validarDias, crearDias, editarSesion, borrarSesion, ErrorHorario } from '../services/api/horarioQaApi';

vi.mock('../services/actualizacionProgramacion', () => ({ useRevisionProgramacion: () => 0, invalidarProgramacion: vi.fn() }));
vi.mock('../services/api/catalogoApi', () => ({ getGrupo: vi.fn(), getAulas: vi.fn(), getHorasGrupo: vi.fn(), getSesiones: vi.fn(), definirPeriodoGrupo: vi.fn(), actualizarOfertaCetapGrupo: vi.fn(), esSinAula: () => false, etiquetaModalidad: () => 'Presencial' }));
vi.mock('../services/api/horarioQaApi', async original => ({ ...await original<typeof import('../services/api/horarioQaApi')>(), validarDias: vi.fn(), crearDias: vi.fn(), editarSesion: vi.fn(), borrarSesion: vi.fn() }));
const horas = { programadas: 32, requeridas: 64, semanas: 16, excede: false };
const sesion = { idFranja: 'f1', idGrupo: 'g1', diaSemana: 'MIERCOLES', horaInicio: '07:45', horaFin: '08:45', tipoSesion: 'presencial', aulaCodigo: '102', estado: 'PROGRAMADO' };
const props = { idGrupo: 'g1', numeroGrupo: 1, nombreAsignatura: 'Constitución del Territorio' };
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getGrupo).mockResolvedValue({ fechaInicio: '2027-01-01', fechaFin: '2027-06-30', idOfertaCetap: 'of1' } as any);
  vi.mocked(getAulas).mockResolvedValue([]);
  vi.mocked(getHorasGrupo).mockResolvedValue(horas);
  vi.mocked(getSesiones).mockResolvedValue([sesion] as any);
  vi.mocked(validarDias).mockResolvedValue({ valido: true, dias: ['LUNES', 'MIERCOLES'].map(diaSemana => ({ diaSemana, ok: true, conflictos: [] })), horas: { programadasDespues: 64, requeridas: 64, excede: false } });
  vi.mocked(crearDias).mockResolvedValue({ creadas: [], horas: { ...horas, programadas: 64 } });
  vi.mocked(editarSesion).mockResolvedValue({ franja: sesion, horas, concertacionDevuelta: null });
  vi.mocked(borrarSesion).mockResolvedValue({ eliminado: true, horas: { ...horas, programadas: 0 }, concertacionDevuelta: null });
});
afterEach(cleanup);
it('una franja APROBADA se abre en consulta y no permite guardar ni eliminar', async () => {
  vi.mocked(getSesiones).mockResolvedValue([{ ...sesion, estado: 'APROBADA' }] as any);
  render(<CalendarioHorario {...props} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Editar sesión 07:45–08:45' }));
  expect(screen.getByRole('note').textContent).toContain('Debe reabrirse');
  expect((screen.getByRole('button', { name: 'Guardar cambios' }) as HTMLButtonElement).disabled).toBe(true);
  expect((screen.getByRole('button', { name: 'Eliminar sesión' }) as HTMLButtonElement).disabled).toBe(true);
  expect(editarSesion).not.toHaveBeenCalled(); expect(borrarSesion).not.toHaveBeenCalled();
});
it('muestra conflictos por día antes de guardar y no crea ninguna sesión', async () => {
  vi.mocked(validarDias).mockResolvedValue({ valido: false, dias: [{ diaSemana: 'MIERCOLES', ok: false, conflictos: [{ tipo: 'AULA', mensaje: 'Aula ocupada el miércoles' }] }], horas: { programadasDespues: 64, requeridas: 64, excede: false } });
  render(<CalendarioHorario {...props} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Agregar sesión' }));
  fireEvent.click(screen.getByRole('button', { name: 'Miércoles' }));
  fireEvent.click(screen.getByRole('button', { name: 'Validar días' }));
  expect(await screen.findByText(/Aula ocupada el miércoles/)).toBeTruthy();
  expect(crearDias).not.toHaveBeenCalled();
  expect(validarDias).toHaveBeenCalledWith(expect.objectContaining({ dias: ['LUNES', 'MIERCOLES'], horaInicio: '07:00', horaFin: '09:00' }));
});
it('crea todos los días solo después de validar y renueva las horas del servidor', async () => {
  render(<CalendarioHorario {...props} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Agregar sesión' }));
  fireEvent.click(screen.getByRole('button', { name: 'Todos' }));
  fireEvent.click(screen.getByRole('button', { name: 'Validar días' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Agregar sesiones' }));
  await waitFor(() => expect(crearDias).toHaveBeenCalledWith({ idGrupo: 'g1', dias: ['LUNES','MARTES','MIERCOLES','JUEVES','VIERNES','SABADO','DOMINGO'], horaInicio: '07:00', horaFin: '09:00', tipoSesion: 'presencial', aulaCodigo: null }));
  expect(await screen.findByText('64h programadas / 64h del plan')).toBeTruthy();
});
it('edita con datos precargados, pide confirmación de devolución y solo entonces reintenta', async () => {
  vi.mocked(editarSesion).mockRejectedValueOnce(new ErrorHorario('La sesión está en concertación', 'EN_CONCERTACION', { concertacion: { id: 'c1', docente: 'Docente', estado: 'ENVIADA' } }));
  render(<CalendarioHorario {...props} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Editar sesión 07:45–08:45' }));
  expect(screen.getByRole('heading', { name: 'Editar sesión – Grupo 1' })).toBeTruthy();
  expect((screen.getByLabelText('Inicio') as HTMLInputElement).value).toBe('07:45');
  fireEvent.change(screen.getByLabelText('Fin'), { target: { value: '09:45' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  const confirmar = await screen.findByRole('alertdialog');
  expect(editarSesion).toHaveBeenCalledTimes(1);
  fireEvent.click(within(confirmar).getByRole('button', { name: 'Confirmar' }));
  await waitFor(() => expect(editarSesion).toHaveBeenLastCalledWith('f1', 'g1', { confirmarDevolucion: true, horaFin: '09:45' }));
});
it('no fuerza cambios sobre una concertación aceptada y conserva el formulario', async () => {
  vi.mocked(editarSesion).mockRejectedValue(new ErrorHorario('La docencia ya fue aplicada al PTA; debe reabrirse.', 'CONCERTACION_ACEPTADA', {}));
  render(<CalendarioHorario {...props} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Editar sesión 07:45–08:45' }));
  fireEvent.change(screen.getByLabelText('Fin'), { target: { value: '09:45' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  expect(await screen.findByRole('alert')).toBeTruthy();
  expect(screen.queryByRole('alertdialog')).toBeNull();
  expect(screen.getByRole('dialog')).toBeTruthy();
});
it('eliminar exige confirmar día y horas antes de llamar al servidor', async () => {
  render(<CalendarioHorario {...props} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Eliminar sesión 07:45–08:45' }));
  expect(screen.getByText(/miércoles 07:45–08:45/)).toBeTruthy();
  expect(borrarSesion).not.toHaveBeenCalled();
  fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Confirmar' }));
  await waitFor(() => expect(borrarSesion).toHaveBeenCalledWith('f1', 'g1', false));
  expect(await screen.findByText('0h programadas / 64h del plan')).toBeTruthy();
});
it('el panel avisa de un ciclo sin guardar; cancelar conserva lo escrito', async () => {
  const cerrar = vi.fn();
  render(<PanelGrupos titulo="Grupos de prueba" onCerrar={cerrar}><CalendarioHorario {...props} /></PanelGrupos>);
  const inicio = await screen.findByLabelText('Inicio del ciclo');
  await waitFor(() => expect((inicio as HTMLInputElement).value).toBe('2027-01-01'));
  fireEvent.change(inicio, { target: { value: '2027-01-05' } });
  fireEvent.click(screen.getByRole('button', { name: 'Cerrar panel de grupos' }));
  fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Cancelar' }));
  expect((inicio as HTMLInputElement).value).toBe('2027-01-05'); expect(cerrar).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Cerrar panel de grupos' }));
  fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Confirmar' }));
  expect(cerrar).toHaveBeenCalledOnce();
});
