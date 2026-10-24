// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PortalDocenteProgramacion from './PortalDocenteProgramacion';
import { getAcumuladoPortal, getDisponiblesPortal, getMisFranjasPortal } from '../services/api/catalogoApi';
import { enviarConcertacion, getConfiguracionConcertacion, getMiConcertacion } from '../services/api/concertacionApi';
import { getConfiguracionPortal, getMiCalendario } from '../services/api/vistaApi';

vi.mock('../services/api/catalogoApi', () => ({
  getDisponiblesPortal: vi.fn(), getMisFranjasPortal: vi.fn(), getAcumuladoPortal: vi.fn(),
  tomarFranja: vi.fn(), soltarFranja: vi.fn(),
}));
vi.mock('../services/api/vistaApi', () => ({ getConfiguracionPortal: vi.fn(), getMiCalendario: vi.fn() }));
vi.mock('../services/api/concertacionApi', () => ({
  getConfiguracionConcertacion: vi.fn(), getMiConcertacion: vi.fn(), enviarConcertacion: vi.fn(),
}));

/**
 * EFDS-2315 — el docente envía su docencia a concertación DESDE EL PORTAL.
 *
 * Este botón se perdió en la prueba final: el componente existía pero nadie lo
 * montaba en el portal, y el docente solo veía «Soltar». Estas pruebas fallan si
 * el botón vuelve a desaparecer del portal.
 */
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
  vi.mocked(enviarConcertacion).mockResolvedValue([]);
  vi.mocked(getConfiguracionConcertacion).mockResolvedValue(config(true) as any);
  // Estas pruebas son del flujo ANTERIOR (el docente toma); el nuevo tiene su describe abajo.
  vi.mocked(getConfiguracionPortal).mockResolvedValue({ tomaFranjas: true });
});
afterEach(cleanup);

describe('portal del docente: enviar a concertación', () => {
  it('con la concertación encendida y una franja tomada en el periodo de corte, ofrece «Enviar a concertación»', async () => {
    vi.mocked(getMisFranjasPortal).mockResolvedValue([franja('f1', P2050_2)] as any);
    render(<PortalDocenteProgramacion />);
    expect(await screen.findByRole('button', BOTON)).toBeTruthy();
    expect(screen.getByText(/Periodo 2050-2/)).toBeTruthy();
    // También sigue el resto del portal: «Soltar» y el acumulado.
    expect(screen.getByRole('button', { name: /Soltar/ })).toBeTruthy();
    expect(screen.getByText(/de 304 h/)).toBeTruthy();
  });

  it('«Enviar» abre el modal de firma digital (el del PTA); con los 6 dígitos firma y envía por el periodo de la franja', async () => {
    vi.mocked(getMisFranjasPortal).mockResolvedValue([franja('f1', P2050_2)] as any);
    render(<PortalDocenteProgramacion />);
    fireEvent.click(await screen.findByRole('button', BOTON));

    // El modal: verificación de identidad con 6 casillas, como la firma del PTA.
    expect(await screen.findByRole('dialog', { name: /Firma digital: Envío a concertación/ })).toBeTruthy();
    expect(enviarConcertacion).not.toHaveBeenCalled(); // abrir no envía nada
    '123456'.split('').forEach((d, i) => fireEvent.change(screen.getByLabelText(`Dígito ${i + 1} del código`), { target: { value: d } }));

    // Generación animada → certificado → «Firmar y enviar».
    fireEvent.click(await screen.findByRole('button', { name: /Firmar y enviar/ }, { timeout: 8000 }));
    await waitFor(() => expect(enviarConcertacion).toHaveBeenCalledWith('220', '123456'));
    expect(await screen.findByText('Firma registrada')).toBeTruthy();
  }, 15000);

  it('con la concertación APAGADA el portal queda como hoy: sin botón', async () => {
    vi.mocked(getConfiguracionConcertacion).mockResolvedValue(config(false, null) as any);
    vi.mocked(getMisFranjasPortal).mockResolvedValue([franja('f1', P2050_2)] as any);
    render(<PortalDocenteProgramacion />);
    expect(await screen.findByRole('button', { name: /Soltar/ })).toBeTruthy();
    await waitFor(() => expect(getConfiguracionConcertacion).toHaveBeenCalled());
    expect(screen.queryByRole('button', BOTON)).toBeNull();
    expect(screen.queryByText(/Concertación de mi docencia/)).toBeNull();
  });

  it('un periodo ANTERIOR al corte (o legado) no ofrece enviar: ahí aprueba la jefatura/el PTA como hoy', async () => {
    vi.mocked(getMisFranjasPortal).mockResolvedValue([franja('f1', P2050_1), franja('f2', LEGADO)] as any);
    render(<PortalDocenteProgramacion />);
    expect(await screen.findAllByRole('button', { name: /Soltar/ })).toHaveLength(2);
    await waitFor(() => expect(getConfiguracionConcertacion).toHaveBeenCalled());
    expect(screen.queryByRole('button', BOTON)).toBeNull();
  });

  it('un bloque por cada periodo del corte en que tiene franjas, y una franja devuelta también cuenta', async () => {
    vi.mocked(getConfiguracionConcertacion).mockResolvedValue(config(true, '2050-1') as any);
    vi.mocked(getMisFranjasPortal).mockResolvedValue([franja('f1', P2050_2), franja('f2', P2050_2)] as any);
    vi.mocked(getDisponiblesPortal).mockResolvedValue([franja('f3', P2050_1, 'DEVUELTA')] as any);
    render(<PortalDocenteProgramacion />);
    expect(await screen.findAllByRole('button', BOTON)).toHaveLength(2);
    expect(screen.getByText(/Periodo 2050-1/)).toBeTruthy();
    expect(screen.getByText(/Periodo 2050-2/)).toBeTruthy();
  });

  it('sin franjas tomadas no hay nada que enviar', async () => {
    vi.mocked(getMisFranjasPortal).mockResolvedValue([] as any);
    render(<PortalDocenteProgramacion />);
    expect(await screen.findByText(/Aún no has tomado ninguna franja/)).toBeTruthy();
    expect(screen.queryByRole('button', BOTON)).toBeNull();
  });
});

/**
 * EFDS-2348 — flujo nuevo: el docente RECIBE su programación. Sin tomar ni soltar;
 * ve sus grupos asignados con horario, aula y horas, y los envía a concertación.
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

  it('la concertación sigue: el docente envía lo asignado', async () => {
    render(<PortalDocenteProgramacion />);
    expect(await screen.findByRole('button', BOTON)).toBeTruthy();
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
