// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { GruposAsignados } from './GruposAsignados';
import { getMiCalendario } from '../services/api/vistaApi';
import { getMiConcertacion, type ConcertacionDocente } from '../services/api/concertacionApi';
vi.mock('../services/api/vistaApi', () => ({ getMiCalendario: vi.fn() }));
vi.mock('../services/api/concertacionApi', () => ({ getMiConcertacion: vi.fn() }));
const franja = (idFranja: string) => ({ idFranja, diaSemana: 'LUNES', horaInicio: '08:00', horaFin: '10:00', reservada: false, idGrupo: 'g1', numeroGrupo: 1, tipoOferta: 'periodo_regular', cicloInicio: '2050-02-01', cicloFin: '2050-05-30', idAsignatura: '1', codigoAsignatura: 'ASIG-001', asignatura: 'Fundamentos', programa: 'AP', nivel: 'pregrado' as const, aulaCodigo: '101', tipoSesion: 'presencial', jornada: 'DIURNA', estado: 'TOMADA' });
const concertacion = (ids: string[]): ConcertacionDocente => ({ idConcertacion: 'c1', nivel: 'pregrado', estado: 'POR_ACEPTAR', horas: 64, comentario: null, firmas: [], franjas: ids.map(idFranja => ({ idFranja, idGrupo: 'g1', codigoAsignatura: 'ASIG-001', asignatura: 'Fundamentos', horas: 32 })), novedad: null });
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getMiCalendario).mockResolvedValue({ docente: { idDocente: 'd1', documento: '123', nombre: 'Docente', vinculacion: null }, periodo: { id: '12', codigo: '2050-2', estado: 'en_curso', fechaInicio: '2050-02-01', fechaFin: '2050-05-30' }, horas: { total: 64, tope: 304 }, horasPorGrupo: { g1: 64 }, franjas: [franja('f1'), franja('f2')] });
  vi.mocked(getMiConcertacion).mockResolvedValue([concertacion(['f1','f2'])]);
});
afterEach(cleanup);
it('muestra Por aceptar por el estado de concertación aunque las franjas sigan TOMADA', async () => {
  render(<GruposAsignados idPeriodo="12" concertacionHabilitada />);
  expect(await screen.findByText('Por aceptar')).toBeTruthy();
  expect(screen.queryByText('Pendiente de concertación')).toBeNull();
});
it('no extiende Por aceptar a las franjas que no están en la foto aprobada', async () => {
  vi.mocked(getMiConcertacion).mockResolvedValue([concertacion(['f1'])]);
  render(<GruposAsignados idPeriodo="12" concertacionHabilitada />);
  expect(await screen.findByText('Parte por aceptar')).toBeTruthy();
  expect(screen.queryByText('Por aceptar', { exact: true })).toBeNull();
});
it('apagada conserva el estado anterior y no consulta concertaciones', async () => {
  render(<GruposAsignados idPeriodo="12" />);
  expect(await screen.findByText('Pendiente de concertación')).toBeTruthy();
  expect(getMiConcertacion).not.toHaveBeenCalled();
});
it('un error de consulta no inventa que el grupo está por aceptar', async () => {
  vi.mocked(getMiConcertacion).mockRejectedValue(new Error('Sin conexión'));
  render(<GruposAsignados idPeriodo="12" concertacionHabilitada />);
  expect(await screen.findByText('Estado de concertación no disponible')).toBeTruthy();
  expect(screen.queryByText('Por aceptar')).toBeNull();
});
