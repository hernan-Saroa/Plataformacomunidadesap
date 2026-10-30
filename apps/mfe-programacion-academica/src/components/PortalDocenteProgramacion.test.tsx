// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PortalDocenteProgramacion from './PortalDocenteProgramacion';
import { getAcumuladoPortal, getDisponiblesPortal, getMisFranjasPortal } from '../services/api/catalogoApi';
import { getConfiguracionConcertacion, getMiConcertacion } from '../services/api/concertacionApi';
import { getConfiguracionPortal, getMiCalendario } from '../services/api/vistaApi';

vi.mock('../services/api/catalogoApi', () => ({
  getDisponiblesPortal: vi.fn(), getMisFranjasPortal: vi.fn(), getAcumuladoPortal: vi.fn(),
  tomarFranja: vi.fn(), soltarFranja: vi.fn(),
}));
vi.mock('../services/api/vistaApi', () => ({ getConfiguracionPortal: vi.fn(), getMiCalendario: vi.fn() }));
vi.mock('../services/api/concertacionApi', () => ({
  getConfiguracionConcertacion: vi.fn(), getMiConcertacion: vi.fn(),
}));

/** El interruptor conserva el flujo anterior apagado y limita al docente encendido. */
const franja = (idFranja: string, periodo: { id: string; codigo: string } | null, estado = 'TOMADA') => ({
  idFranja, diaSemana: 'SABADO', horaInicio: '14:00', horaFin: '16:00', tipoSesion: 'mediada_tecnologia',
  aulaCodigo: null, estado, numeroGrupo: 1, asignatura: 'Fundamentos', programa: 'APT', comentarioJefatura: null,
  idPeriodo: periodo?.id ?? null, periodoCodigo: periodo?.codigo ?? null,
});
const P2050_2 = { id: '220', codigo: '2050-2' };
const P2050_1 = { id: '11', codigo: '2050-1' };
const LEGADO = { id: '1ae977ed-133a-410a-b584-30cbfd26b29f', codigo: '2026-V1' };
const config = (habilitada: boolean, desdePeriodo: string | null = '2050-2') =>
  ({ habilitada, desdePeriodo, firmaSimulada: true, revisionesRequeridas: ['academica'] });

const BOTON = { name: /Enviar a concertación/ };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getMiCalendario).mockResolvedValue({
    docente: { idDocente: 'd1', documento: '1', nombre: 'Docente', vinculacion: null },
    periodo: { id: '220', codigo: '2050-2', estado: 'planeacion', fechaInicio: null, fechaFin: null },
    horas: { total: 0, tope: 304 }, horasPorGrupo: {}, franjas: [],
  });
  vi.mocked(getDisponiblesPortal).mockResolvedValue([]);
  vi.mocked(getAcumuladoPortal).mockResolvedValue({
    documento: '1', nombre: 'Docente', categoriaVinculacion: 'CATEDRA', tope: 304, horasInvestigacion: 0,
    totalAsignado: 48, disponible: 256, porOferta: [],
  } as any);
  vi.mocked(getMiConcertacion).mockResolvedValue([]);
  vi.mocked(getConfiguracionConcertacion).mockResolvedValue(config(true) as any);
  // Permite comprobar que la concertación encendida prevalece sobre la toma anterior.
  vi.mocked(getConfiguracionPortal).mockResolvedValue({ tomaFranjas: true });
});
afterEach(cleanup);

describe('portal: interruptor de concertación', () => {
  it('apagado conserva tomar y soltar sin acciones de concertación', async () => {
    vi.mocked(getConfiguracionConcertacion).mockResolvedValue(config(false, null));
    vi.mocked(getMisFranjasPortal).mockResolvedValue([franja('f1', P2050_2)] as any);
    vi.mocked(getDisponiblesPortal).mockResolvedValue([franja('f2', P2050_2, 'PUBLICADA')] as any);
    render(<PortalDocenteProgramacion />);
    expect(await screen.findByRole('button', { name: /Soltar/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Tomar/ })).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'Aceptación de mi programación' })).toBeNull();
  });
  it('encendido no ofrece tomar, soltar ni enviar aunque el flujo antiguo esté habilitado', async () => {
    vi.mocked(getMisFranjasPortal).mockResolvedValue([franja('f1', P2050_2)] as any);
    render(<PortalDocenteProgramacion />);
    expect(await screen.findByText(/No tienes programación pendiente de aceptación/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Tomar|Soltar|Enviar a concertación/ })).toBeNull();
  });
});

/**
 * EFDS-2348 — flujo nuevo: el docente RECIBE su programación. Sin tomar ni soltar;
 * ve sus grupos asignados con horario, aula y horas. La aceptación se prueba aparte.
 */
const calendario = (estado = 'TOMADA') => ({
  docente: { idDocente: 'd1', documento: '1', nombre: 'Docente', vinculacion: { tipo: 'catedra', texto: 'Cátedra' } },
  periodo: { id: '220', codigo: '2050-2', estado: 'en_curso', fechaInicio: null, fechaFin: null },
  horas: { total: 64, tope: 304 },
  horasPorGrupo: { g1: 64 },
  franjas: [
    { idFranja: 'f2', diaSemana: 'MIERCOLES', horaInicio: '10:00', horaFin: '12:00', reservada: false, idGrupo: 'g1', numeroGrupo: 2,
      tipoOferta: 'periodo_regular', cicloInicio: '2050-02-01', cicloFin: '2050-05-30', idAsignatura: '1', codigoAsignatura: 'ASIG-1',
      asignatura: 'Fundamentos', programa: 'APT', nivel: 'pregrado', aulaCodigo: '101', tipoSesion: 'presencial', jornada: 'DIURNA', estado },
    { idFranja: 'f1', diaSemana: 'LUNES', horaInicio: '08:00', horaFin: '10:00', reservada: false, idGrupo: 'g1', numeroGrupo: 2,
      tipoOferta: 'periodo_regular', cicloInicio: '2050-02-01', cicloFin: '2050-05-30', idAsignatura: '1', codigoAsignatura: 'ASIG-1',
      asignatura: 'Fundamentos', programa: 'APT', nivel: 'pregrado', aulaCodigo: null, tipoSesion: 'mediada_tecnologia', jornada: 'DIURNA', estado },
  ],
});

describe('portal del docente: flujo nuevo, la programación llega asignada (EFDS-2348)', () => {
  beforeEach(() => {
    vi.mocked(getConfiguracionPortal).mockResolvedValue({ tomaFranjas: false });
    vi.mocked(getMisFranjasPortal).mockResolvedValue([franja('f1', P2050_2), franja('f2', P2050_2)] as any);
    vi.mocked(getMiCalendario).mockResolvedValue(calendario() as any);
  });

  it('muestra el grupo asignado con su horario, aula, ciclo y horas, sin «Tomar» ni «Soltar»', async () => {
    render(<PortalDocenteProgramacion />);
    expect(await screen.findByText(/Mis grupos asignados · 2050-2/)).toBeTruthy();
    expect(screen.getByText('Fundamentos')).toBeTruthy();
    expect(screen.getByText('APT · Grupo 2 · Clases del 01/02/2050 al 30/05/2050', { exact: false })).toBeTruthy();
    // Horas del grupo (64 h de docencia) y total del periodo.
    expect(screen.getByText(/de docencia/).textContent).toBe('64 h de docencia');
    expect(screen.getByText(/en el periodo/).textContent).toBe('64 h en el periodo');
    expect(screen.getByText('Pendiente de concertación')).toBeTruthy();
    // Horario de lunes a domingo: el lunes primero, virtual; el miércoles en el aula 101.
    const horario = screen.getAllByRole('listitem').map((li) => li.textContent);
    expect(horario).toEqual([expect.stringMatching(/Lunes 08:00–10:00.*Virtual/), expect.stringMatching(/Miércoles 10:00–12:00.*Aula 101/)]);
    expect(getMiCalendario).toHaveBeenCalledWith('220');
    expect(screen.queryByRole('button', { name: /Soltar/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Tomar/ })).toBeNull();
    expect(screen.queryByText(/Franjas disponibles/)).toBeNull();
  });

  it('espera la aprobación interna sin ofrecer enviar', async () => {
    render(<PortalDocenteProgramacion />);
    expect(await screen.findByText(/No tienes programación pendiente de aceptación/)).toBeTruthy();
    expect(screen.queryByRole('button', BOTON)).toBeNull();
  });

  it('si no se puede saber qué flujo rige, NO ofrece tomar (se asume el nuevo)', async () => {
    vi.mocked(getConfiguracionPortal).mockRejectedValue(new Error('caído'));
    vi.mocked(getDisponiblesPortal).mockResolvedValue([franja('f9', P2050_2, 'PUBLICADA')] as any);
    render(<PortalDocenteProgramacion />);
    expect(await screen.findByText(/Mis grupos asignados/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Tomar/ })).toBeNull();
  });

  it('sin franjas propias muestra el periodo en curso, vacío', async () => {
    vi.mocked(getMisFranjasPortal).mockResolvedValue([] as any);
    vi.mocked(getMiCalendario).mockResolvedValue({ ...calendario(), franjas: [], horasPorGrupo: {}, horas: { total: 0, tope: 304 } } as any);
    render(<PortalDocenteProgramacion />);
    expect(await screen.findByText(/Aún no tienes grupos asignados/)).toBeTruthy();
    expect(getMiCalendario).toHaveBeenCalledWith(undefined);
  });
});
