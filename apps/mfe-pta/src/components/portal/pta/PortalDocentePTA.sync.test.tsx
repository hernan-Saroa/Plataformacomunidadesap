import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PortalDocentePTA } from './PortalDocentePTA';
import { getPTAsByDocente, getPTAById, getComponentesAprobacion, getAprobacionTerritorial } from '../../../services/api/ptaApi';

const sync = vi.hoisted(() => ({ options: null as any }));
vi.mock('../../../hooks/usePTARealtimeSync', () => ({
  usePTARealtimeSync: (options: any) => { sync.options = options; return { lastSyncTime: 'sync', unreadEvents: [] }; },
}));
vi.mock('../../pta/PTASyncIndicator', () => ({ PTASyncIndicator: () => null }));
vi.mock('../../../../../shell/src/services/api', () => ({ getBaseURL: () => 'http://localhost' }));
vi.mock('../../esap/NotificationsContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));
vi.mock('./PTAForm', () => ({ PTAForm: () => <textarea aria-label="Borrador local" /> }));
vi.mock('./VistasV11V15PTA', () => ({}));
vi.mock('./IdentificacionDocentePanel', () => ({ IdentificacionDocentePanel: () => null }));
vi.mock('./ReportePTAInstitucional', () => ({
  ReportePTAInstitucional: ({ pta, componentesAprobacion, aprobacionTerritorial }: any) =>
    <div data-testid="reporte">{pta.estado}|{componentesAprobacion[0]?.estado}|{aprobacionTerritorial[0]?.estado}</div>,
}));
vi.mock('./PTAResumenPrint', () => ({
  PTAResumenPrint: ({ pta, componentesAprobacion, aprobacionTerritorial }: any) =>
    <div data-testid="impresion">{pta?.estado}|{componentesAprobacion[0]?.estado}|{aprobacionTerritorial[0]?.estado}</div>,
}));
vi.mock('../../../services/api/ptaApi', () => ({
  getActivePeriodoAcademico: vi.fn().mockResolvedValue({ codigo: '2026-1', estado: 'en_curso' }),
  getPTAsByDocente: vi.fn(),
  getPTAById: vi.fn(),
  getComponentesAprobacion: vi.fn(),
  getAprobacionTerritorial: vi.fn(),
  getMisSolicitudesPTA: vi.fn().mockResolvedValue({ success: true, data: [] }),
  getBancoDocenteById: vi.fn().mockResolvedValue({ success: false }),
}));

const pta = { id: 'pta-1', periodo: '2026-1', estado: 'Pendiente Jefatura', docente_nombre: 'Docente de prueba', total_horas_programadas: 192, horas_docencia: 192, asignaturas: [] };
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getPTAsByDocente).mockResolvedValue({ success: true, data: [pta] });
  vi.mocked(getPTAById).mockResolvedValue({ success: true, data: pta });
  vi.mocked(getComponentesAprobacion).mockResolvedValue({ success: true, data: [{ componente: 'academica_pregrado', estado: 'pendiente' }] });
  vi.mocked(getAprobacionTerritorial).mockResolvedValue({ success: true, data: [{ estado: 'pendiente' }] });
});
afterEach(cleanup);
const mount = () => render(<PortalDocentePTA onBack={() => {}} userPersonId="docente-1" userName="Docente de prueba" userEmail="docente@example.test" />);
async function approveRemotely() {
  vi.mocked(getPTAsByDocente).mockResolvedValue({ success: true, data: [{ ...pta, estado: 'Aprobado' }] });
  vi.mocked(getPTAById).mockResolvedValue({ success: true, data: { ...pta, estado: 'Aprobado' } });
  vi.mocked(getComponentesAprobacion).mockResolvedValue({ success: true, data: [{ componente: 'academica_pregrado', estado: 'aprobado' }] });
  vi.mocked(getAprobacionTerritorial).mockResolvedValue({ success: true, data: [{ estado: 'aprobado' }] });
  await act(async () => { sync.options.onRefresh(); });
}

describe('portal docente sin recarga manual', () => {
  it('muestra el nombre del docente en el historial antiguo y oculta identificadores de autores desconocidos', async () => {
    vi.mocked(getPTAById).mockResolvedValue({ success: true, data: { ...pta, historialEstados: [
      { id: 'h1', estadoNuevo: 'Borrador', actorId: 'docente-1', actorRol: 'Docente' },
      { id: 'h2', estadoNuevo: 'Pendiente Jefatura', actorId: '413f1db0-c89e-4d20-9935-eb89beed6355', actorRol: 'Revisor' },
    ] } });
    mount();
    fireEvent.click(await screen.findByText('Ver detalle'));
    expect(await screen.findByText('por Docente de prueba — Docente')).toBeTruthy();
    expect(screen.getByText('por Revisor')).toBeTruthy();
    expect(screen.queryByText(/413f1db0/)).toBeNull();
  });
  it.each(['Reporte', 'Descargar PDF'])('actualiza el estado y firmas en %s sin cerrar la vista', async button => {
    mount();
    fireEvent.click(await screen.findByText('Ver detalle'));
    await screen.findByText('Reporte');
    fireEvent.click(button === 'Reporte' ? screen.getByText(button) : screen.getByTitle(button));
    const testId = button === 'Reporte' ? 'reporte' : 'impresion';
    await waitFor(() => expect(screen.getByTestId(testId).textContent).toBe('Pendiente Jefatura|pendiente|pendiente'));
    await approveRemotely();
    await waitFor(() => expect(screen.getByTestId(testId).textContent).toBe('Aprobado|aprobado|aprobado'));
  });

  it('no oculta los PTA pendientes ni cierra el detalle ante un fallo de red', async () => {
    mount();
    fireEvent.click(await screen.findByText('Ver detalle'));
    await screen.findByText('Reporte');
    vi.mocked(getPTAsByDocente).mockResolvedValue({ success: false });
    await act(async () => { sync.options.onRefresh(); });
    expect(screen.getByText('Reporte')).toBeTruthy();
    fireEvent.click(screen.getByText('Reporte'));
    await waitFor(() => expect(screen.getByTestId('reporte').textContent).toContain('Pendiente Jefatura'));
  });

  it('mantiene montado el formulario y conserva el borrador durante la sincronización', async () => {
    vi.mocked(getPTAsByDocente).mockResolvedValue({ success: true, data: [{ ...pta, estado: 'Borrador' }] });
    mount();
    fireEvent.click(await screen.findByText('Continuar edición'));
    const input = screen.getByLabelText('Borrador local');
    fireEvent.change(input, { target: { value: 'Trabajo sin guardar' } });
    await act(async () => { sync.options.onRefresh(); });
    expect(screen.getByLabelText('Borrador local')).toBe(input);
    expect((input as HTMLTextAreaElement).value).toBe('Trabajo sin guardar');
  });
});
