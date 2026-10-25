// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { EnvioRevisionDocente } from './EnvioRevisionDocente';
import { enviarDocenciaARevision, getRevisionProgramador, type RevisionProgramador } from '../services/api/concertacionApi';
import type { CalendarioDocente } from '../services/api/vistaApi';
vi.mock('../services/api/concertacionApi', () => ({ enviarDocenciaARevision: vi.fn(), getRevisionProgramador: vi.fn() }));
const calendario: CalendarioDocente = {
  docente: { idDocente: 'd1', documento: '123', nombre: 'Docente del periodo', vinculacion: null },
  periodo: { id: '12', codigo: '2050-2', estado: 'planeacion', fechaInicio: '2050-07-01', fechaFin: '2050-12-01' },
  horas: { total: 96, tope: 304 }, horasPorGrupo: { g1: 64 },
  franjas: [{ idFranja: 'f1', diaSemana: 'LUNES', horaInicio: '08:00', horaFin: '10:00', reservada: false, idGrupo: 'g1', numeroGrupo: 1, tipoOferta: 'periodo_regular', cicloInicio: '2050-07-01', cicloFin: '2050-12-01', idAsignatura: 'a1', codigoAsignatura: 'ASIG-001', asignatura: 'Asignatura real', programa: 'AP', nivel: 'pregrado', aulaCodigo: '101', tipoSesion: 'presencial', jornada: 'DIURNA', estado: 'TOMADA' }, { idFranja: 'r1', diaSemana: 'MARTES', horaInicio: '08:00', horaFin: '10:00', reservada: true, idGrupo: null, numeroGrupo: null, tipoOferta: null, cicloInicio: null, cicloFin: null, idAsignatura: null, codigoAsignatura: null, asignatura: null, programa: null, nivel: null, aulaCodigo: null, tipoSesion: null, jornada: null, estado: null }],
};
const foto = (estado: RevisionProgramador['estado'] = 'ENVIADA'): RevisionProgramador => ({ idConcertacion: 'c1', documento: '123', docente: 'Docente del periodo', nivel: 'pregrado', estado, horas: 64, numFranjas: 1, comentario: estado === 'DEVUELTA' ? 'Ajustar el ciclo' : null, novedad: estado === 'NOVEDAD' ? { tipo: 'movilidad', justificacion: 'Movilidad académica aprobada', creadaEn: '2050-07-01T12:00:00Z' } : null, actualizadaEn: '2050-07-01T12:00:00Z' });
beforeEach(() => { vi.resetAllMocks(); vi.mocked(getRevisionProgramador).mockResolvedValue([]); vi.mocked(enviarDocenciaARevision).mockResolvedValue([foto()]); });
afterEach(cleanup);
const montar = (cal = calendario, programable = true) => render(<EnvioRevisionDocente calendario={cal} niveles={['pregrado']} programable={programable} />);
it('muestra la docencia del docente con horas del servidor y envía documento/periodo', async () => {
  montar();
  expect(screen.getByText('ASIG-001 · Asignatura real · Grupo 1')).toBeTruthy();
  expect(screen.getByText('64 h')).toBeTruthy(); // no suma las 32 h reservadas del total transversal
  fireEvent.click(screen.getByRole('button', { name: 'Enviar a revisión' }));
  expect(await screen.findByText('Docencia de Docente del periodo enviada a revisión.')).toBeTruthy();
  expect(enviarDocenciaARevision).toHaveBeenCalledWith('12', '123');
  expect((screen.getByRole('button', { name: 'Enviar a revisión' }) as HTMLButtonElement).disabled).toBe(true);
});
it('muestra novedad y permite reenviar tras ajustes', async () => {
  vi.mocked(getRevisionProgramador).mockResolvedValue([foto('NOVEDAD')]); montar();
  expect(await screen.findByText(/Movilidad académica aprobada/)).toBeTruthy();
  expect((screen.getByRole('button', { name: 'Enviar a revisión' }) as HTMLButtonElement).disabled).toBe(false);
});
it('conserva la docencia y muestra 409 sin fingir un envío exitoso', async () => {
  vi.mocked(enviarDocenciaARevision).mockRejectedValue(new Error('Defina el ciclo del grupo antes de enviar.')); montar();
  fireEvent.click(screen.getByRole('button', { name: 'Enviar a revisión' }));
  expect((await screen.findByRole('alert')).textContent).toContain('Defina el ciclo');
  expect(screen.getByText('64 h')).toBeTruthy();
  expect(screen.queryByText(/enviada a revisión\./)).toBeNull();
});
it.each(['ENVIADA', 'REVISADA', 'POR_ACEPTAR'] as const)('deshabilita reenviar en %s', async estado => {
  vi.mocked(getRevisionProgramador).mockResolvedValue([foto(estado)]); montar();
  await screen.findByText(/La docencia de pregrado ya fue enviada/);
  expect((screen.getByRole('button', { name: 'Enviar a revisión' }) as HTMLButtonElement).disabled).toBe(true);
});
it('no envía un periodo cerrado ni solo franjas aprobadas', async () => {
  montar(calendario, false);
  await waitFor(() => expect(getRevisionProgramador).toHaveBeenCalled());
  expect((screen.getByRole('button', { name: 'Enviar a revisión' }) as HTMLButtonElement).disabled).toBe(true);
  cleanup(); montar({ ...calendario, franjas: calendario.franjas.map(f => ({ ...f, estado: 'APROBADA' })) });
  expect((screen.getByRole('button', { name: 'Enviar a revisión' }) as HTMLButtonElement).disabled).toBe(true);
  expect(enviarDocenciaARevision).not.toHaveBeenCalled();
});
