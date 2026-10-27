// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ConcertacionDocente } from './ConcertacionDocente';
import { aceptarProgramacion, reportarNovedad, getConfiguracionConcertacion, getMiConcertacion } from '../services/api/concertacionApi';
vi.mock('../services/api/concertacionApi', () => ({ aceptarProgramacion: vi.fn(), reportarNovedad: vi.fn(), getConfiguracionConcertacion: vi.fn(), getMiConcertacion: vi.fn() }));
const item = { idConcertacion: 'c1', nivel: 'pregrado' as const, estado: 'POR_ACEPTAR' as const, horas: 32, franjas: [{ idFranja: 'f1', idGrupo: 'g1', codigoAsignatura: 'ASIG-001', asignatura: 'Estado', horas: 32 }], comentario: null, novedad: null, firmas: [], actualizadaEn: '2050-07-01T00:00:00Z' };
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getConfiguracionConcertacion).mockResolvedValue({ habilitada: true, firmaSimulada: true, desdePeriodo: '2026-1', revisionesRequeridas: ['academica'] });
  vi.mocked(getMiConcertacion).mockResolvedValue([item]);
  vi.mocked(aceptarProgramacion).mockResolvedValue({});
  vi.mocked(reportarNovedad).mockResolvedValue({});
});
afterEach(cleanup);
const montar = () => render(<ConcertacionDocente idPeriodo="12" codigoPeriodo="2050-2" docenteNombre="Docente QA" />);
it('solo acepta por concertación, con firma OTP, sin enviar desde el docente', async () => {
  montar(); fireEvent.click(await screen.findByRole('button', { name: 'Aceptar y firmar' }));
  expect(screen.queryByRole('button', { name: /Enviar a concertación/ })).toBeNull();
  for (let i = 0; i < 6; i++) fireEvent.change(screen.getByLabelText(`Dígito ${i + 1} del código`), { target: { value: String(i + 1) } });
  fireEvent.click(await screen.findByRole('button', { name: 'Firmar y aceptar' }, { timeout: 8000 }));
  await waitFor(() => expect(aceptarProgramacion).toHaveBeenCalledWith('c1', '123456'));
}, 15000);
it('exige tipo y diez caracteres; un error conserva lo ingresado y permite reintentar', async () => {
  vi.mocked(reportarNovedad).mockRejectedValueOnce(new Error('La programación cambió; revisa la nueva versión.')).mockResolvedValueOnce({});
  montar(); fireEvent.click(await screen.findByRole('button', { name: 'Reportar novedad' }));
  const confirmar = screen.getByRole('button', { name: 'Confirmar' }) as HTMLButtonElement;
  expect(confirmar.disabled).toBe(true);
  fireEvent.change(screen.getByLabelText('Tipo de novedad'), { target: { value: 'perfil' } });
  fireEvent.change(screen.getByLabelText(/Justificación/), { target: { value: 'corta' } });
  expect(confirmar.disabled).toBe(true);
  fireEvent.change(screen.getByLabelText(/Justificación/), { target: { value: 'Mi perfil no corresponde al área.' } });
  fireEvent.click(confirmar);
  expect(await screen.findByRole('alert')).toBeTruthy();
  expect((screen.getByLabelText(/Justificación/) as HTMLTextAreaElement).value).toBe('Mi perfil no corresponde al área.');
  fireEvent.click(confirmar);
  await waitFor(() => expect(reportarNovedad).toHaveBeenCalledTimes(2));
  expect(reportarNovedad).toHaveBeenLastCalledWith('c1', 'perfil', 'Mi perfil no corresponde al área.');
});
it.each(['ACEPTADA', 'NOVEDAD', 'APROBADA'] as const)('no ofrece acciones en %s', async estado => {
  vi.mocked(getMiConcertacion).mockResolvedValue([{ ...item, estado }]); montar();
  await screen.findByText(/ASIG-001/);
  expect(screen.queryByRole('button', { name: /Aceptar y firmar|Reportar novedad/ })).toBeNull();
});
it('apagada no consulta concertaciones ni muestra la nueva pantalla', async () => {
  vi.mocked(getConfiguracionConcertacion).mockResolvedValue({ habilitada: false, firmaSimulada: true, revisionesRequeridas: [] });
  const { container } = montar();
  await waitFor(() => expect(getConfiguracionConcertacion).toHaveBeenCalled());
  expect(getMiConcertacion).not.toHaveBeenCalled(); expect(container.innerHTML).toBe('');
});
