import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PortalDocentePTA } from './PortalDocentePTA';
import { getPTAsByDocente, getPTAById, getComponentesAprobacion, getAprobacionTerritorial, getMisSolicitudesPTA } from '../../../services/api/ptaApi';

const sync = vi.hoisted(() => ({ options: null as any, solicitudModal: null as any }));
vi.mock('./SolicitudPTAModal', () => ({
  SolicitudPTAModal: (props: any) => {
    sync.solicitudModal = props;
    return <div role="dialog" aria-label="Solicitudes PTA" />;
  },
}));
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
  vi.mocked(getMisSolicitudesPTA).mockResolvedValue({ success: true, data: [] });
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
  it('conserva la solicitud de edición conocida ante un fallo y aplica su autorización sin recargar', async () => {
    const solicitud = { id: 'sol-edicion', ptaId: pta.id, tipoSolicitud: 'edicion_componentes',
      estado: 'pendiente', componentes: ['investigacion'], notificacionLeida: false };
    vi.mocked(getPTAsByDocente).mockResolvedValue({ success: true, data: [{ ...pta, estado: 'Aprobado' }] });
    vi.mocked(getMisSolicitudesPTA).mockResolvedValue({ success: true, data: [solicitud] });
    mount();
    await screen.findByTitle('Tienes una solicitud PTA en revisión.');
    vi.mocked(getMisSolicitudesPTA).mockResolvedValue({ success: false, data: [] });
    await act(async () => { await sync.options.onRefresh(); });
    expect(screen.getByTitle('Tienes una solicitud PTA en revisión.')).toBeTruthy();
    vi.mocked(getMisSolicitudesPTA).mockResolvedValue({ success: true, data: [{ ...solicitud, estado: 'aprobado' }] });
    vi.mocked(getPTAsByDocente).mockResolvedValue({ success: true, data: [{ ...pta, estado: 'REVISION_DOCENTE_N2' }] });
    await act(async () => { await sync.options.onRefresh(); });
    expect(await screen.findByText('Solicitud aprobada')).toBeTruthy();
    expect(screen.getByText('Los componentes seleccionados ya están habilitados para edición en el mismo PTA.')).toBeTruthy();
    expect(screen.queryByTitle('Tienes una solicitud PTA en revisión.')).toBeNull();
    vi.mocked(getMisSolicitudesPTA).mockResolvedValue({ success: true, data: [{ ...solicitud, estado: 'gestionada' }] });
    vi.mocked(getPTAsByDocente).mockResolvedValue({ success: true, data: [{ ...pta, estado: 'Aprobado' }] });
    await act(async () => { await sync.options.onRefresh(); });
    expect(await screen.findByText('Solicitud completada')).toBeTruthy();
  });

  it('al cambiar de docente descarta las solicitudes conocidas aunque falle la nueva consulta', async () => {
    vi.mocked(getMisSolicitudesPTA).mockResolvedValue({ success: true, data: [{ id: 'sol-docente-1',
      ptaId: pta.id, tipoSolicitud: 'edicion_componentes', estado: 'pendiente', componentes: ['investigacion'] }] });
    const { rerender } = mount();
    await screen.findByTitle('Tienes una solicitud PTA en revisión.');
    fireEvent.click(screen.getByRole('button', { name: 'Abrir solicitudes de Plan de Trabajo Académico' }));
    expect(screen.getByRole('dialog', { name: 'Solicitudes PTA' })).toBeTruthy();
    const formularioAnterior = sync.solicitudModal;
    vi.mocked(getMisSolicitudesPTA).mockResolvedValue({ success: false, data: [] });
    vi.mocked(getPTAsByDocente).mockResolvedValue({ success: true, data: [] });
    rerender(<PortalDocentePTA onBack={() => {}} userPersonId="docente-2" userName="Otro docente" userEmail="otro@example.test" />);
    await waitFor(() => expect(getMisSolicitudesPTA).toHaveBeenCalledWith('docente-2'));
    expect(screen.queryByTitle('Tienes una solicitud PTA en revisión.')).toBeNull();
    expect(screen.queryByText('Solicitud aprobada')).toBeNull();
    expect(screen.queryByRole('dialog', { name: 'Solicitudes PTA' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir solicitudes de Plan de Trabajo Académico' }));
    expect(sync.solicitudModal.docenteId).toBe('docente-2');
    const consultas = vi.mocked(getMisSolicitudesPTA).mock.calls.length;
    await act(async () => { formularioAnterior.onSuccess(); formularioAnterior.onClose(); });
    expect(getMisSolicitudesPTA).toHaveBeenCalledTimes(consultas);
    expect(screen.getByRole('dialog', { name: 'Solicitudes PTA' })).toBeTruthy();
  });

  it('actualiza Investigación al revisar y aprobar sin recarga manual, y conserva ambos estados al volver a abrir', async () => {
    const research = { ...pta, horas_investigacion: 232, investigacion_proyecto: { nombre: 'Proyecto', horas_solicitadas: 200 },
      investigacion_actividades: [{ nombre: 'Actividad', horas_total: 32 }],
      componentes_estado: [{ key: 'investigacion', estado: 'en_revision', aplica: true, horas: 232 }],
    };
    vi.mocked(getPTAsByDocente).mockResolvedValue({ success: true, data: [research] });
    const { unmount } = mount();
    const card = () => screen.getByText('Investigación').parentElement!;
    await waitFor(() => expect(within(card()).getByText('En revisión')).toBeTruthy());
    const reviewed = { ...research, componentes_estado: [{ key: 'investigacion', estado: 'pendiente', aplica: true, horas: 232 }],
      componentes_revision_estado: [{ componente: 'investigacion', subseccion: 'general', estado: 'revisado' }],
      componentes_aprobacion_estado: [{ componente: 'investigacion', estado: 'pendiente', revision_completa: true }],
    };
    vi.mocked(getPTAsByDocente).mockResolvedValue({ success: true, data: [reviewed] });
    await act(async () => { sync.options.onRefresh(); });
    await waitFor(() => expect(within(card()).getByText('Pendiente')).toBeTruthy());
    expect(within(card()).queryByText('En revisión')).toBeNull();
    expect(within(card()).queryByText('Aprobado')).toBeNull();
    unmount();
    const reloaded = mount();
    await waitFor(() => expect(within(card()).getByText('Pendiente')).toBeTruthy());
    expect(within(card()).queryByText('En revisión')).toBeNull();

    const approved = { ...reviewed, estado: 'Aprobado',
      componentes_estado: [{ key: 'investigacion', estado: 'aprobado', aplica: true, horas: 232 }],
      componentes_aprobacion_estado: [{ componente: 'investigacion', estado: 'aprobado', revision_completa: true }],
    };
    vi.mocked(getPTAsByDocente).mockResolvedValue({ success: true, data: [approved] });
    await act(async () => { sync.options.onRefresh(); });
    await waitFor(() => expect(within(card()).getByText('Aprobado')).toBeTruthy());
    expect(within(card()).queryByText('En revisión')).toBeNull();
    expect(within(card()).queryByText('Pendiente')).toBeNull();
    reloaded.unmount();
    mount();
    await waitFor(() => expect(within(card()).getByText('Aprobado')).toBeTruthy());
  });

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
