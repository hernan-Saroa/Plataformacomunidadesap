import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PtaBackofficeModule } from './PtaBackofficeModule';
import { deletePTA, getAllPTAs, getPTADecisionListScope } from '../../services/api/ptaApi';
import { toast } from 'sonner';

const sync = vi.hoisted(() => ({ options: null as any, isSuperUser: false, rol: 'jefatura', permissions: {
  nivelAprobacion: 1, puedeAprobar: true, componentesAprobables: [] as string[], filtroTerritorial: undefined as string[] | undefined,
} }));
vi.mock('../../hooks/usePTARealtimeSync', () => ({
  usePTARealtimeSync: (options: any) => { sync.options = options; return { lastSyncTime: 'sync', unreadEvents: [], unreadCount: 0 }; },
}));
vi.mock('./PTASyncIndicator', () => ({ PTASyncIndicator: () => null }));
vi.mock('./PermisosPTAContext', () => ({
  PermisosPTAProvider: ({ children }: any) => children,
  SelectorRolPTA: () => null,
  usePermisosPTA: () => ({ permisos: sync.permissions, tieneVista: () => true, rolLabel: 'Revisor', perfil: { rol: sync.rol, territorial_ids: [] } }),
  usePermisosPTAGranulares: () => ({ puede: () => true }),
}));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ isSuperUser: sync.isSuperUser }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock('../esap/NotificationsContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));
vi.mock('../../../../shell/src/services/api', () => ({
  getBaseURL: () => 'http://localhost',
  apiClient: { get: vi.fn().mockResolvedValue([{ codigo: '2026-1', estado: 'en_curso' }]) },
}));
vi.mock('../../services/api/supabase.service', () => ({ supabaseService: {} }));
vi.mock('../../services/api/ptaApi', () => ({
  getAllPTAs: vi.fn(),
  deletePTA: vi.fn(),
  getPTADecisionListScope: vi.fn(),
  getPTAEstadisticas: vi.fn().mockResolvedValue({ success: true, data: {} }),
  getPTAById: vi.fn().mockResolvedValue({ success: false }),
}));
vi.mock('./PTADetallePanelBackoffice', () => ({
  PTADetallePanelBackoffice: ({ pta, onUpdated }: any) => <button onClick={() => onUpdated({ ...pta, estado: 'Aprobado' })}>Resolver caso</button>,
}));
vi.mock('./ProgramacionAcademica', () => ({ ProgramacionAcademica: () => null }));
vi.mock('./MesaConcertacion', () => ({ MesaConcertacion: () => null }));

const pendientes = [
  { id: 'pta-1', docente_nombre: 'Docente uno', estado: 'Pendiente Jefatura', periodo: '2026-1', dias_en_proceso: 32 },
  { id: 'pta-2', docente_nombre: 'Docente dos', estado: 'Pendiente Jefatura', periodo: '2026-1' },
];
beforeEach(() => {
  vi.clearAllMocks();
  sync.isSuperUser = false;
  sync.rol = 'jefatura';
  sync.permissions.filtroTerritorial = undefined;
  vi.mocked(getPTADecisionListScope).mockResolvedValue({ success: true, data: { configured: false, territoriales: null, programas: null, cetaps: null } });
  vi.mocked(getAllPTAs).mockResolvedValue({ success: true, data: pendientes });
});

describe('eliminación administrativa en la interfaz', () => {
  const openDelete = async () => {
    await screen.findByText('Docente uno');
    fireEvent.click(screen.getAllByTitle('Más acciones')[0]);
    fireEvent.click(screen.getByText('Eliminar PTA'));
  };

  it('retira el PTA y actualiza los contadores aun si falla la consulta posterior, sin duplicar el borrado', async () => {
    sync.isSuperUser = true;
    let complete!: (value: any) => void;
    vi.mocked(deletePTA).mockImplementation(() => new Promise(resolve => { complete = resolve; }));
    render(<PtaBackofficeModule />);
    await openDelete();
    vi.mocked(getAllPTAs).mockResolvedValue({ success: false, data: [] });
    const confirm = screen.getByRole('button', { name: 'Eliminar definitivamente' });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(deletePTA).toHaveBeenCalledTimes(1);
    expect((screen.getByRole('button', { name: 'Eliminando…' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Cancelar' }) as HTMLButtonElement).disabled).toBe(true);
    await act(async () => { complete({ success: true, data: { deleted: true } }); });
    await waitFor(() => expect(screen.queryByText('Docente uno')).toBeNull());
    expect(screen.getByText('Docente dos')).toBeTruthy();
    expect(tab('Todos').textContent).toContain('1');
    expect(tab('Aprobación').textContent).toContain('1');
    expect(toast.success).toHaveBeenCalled();
  });

  it('conserva el PTA y permite reintentar cuando el servidor rechaza la eliminación', async () => {
    sync.isSuperUser = true;
    vi.mocked(deletePTA).mockResolvedValue({ success: false, data: null, message: 'La sesión ha expirado.' });
    render(<PtaBackofficeModule />);
    await openDelete();
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar definitivamente' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('La sesión ha expirado.'));
    expect((screen.getByRole('button', { name: 'Eliminar definitivamente' }) as HTMLButtonElement).disabled).toBe(false);
    expect(tab('Todos').textContent).toContain('2');
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('no ofrece eliminar por un rol visual admin si la cuenta no es superadministradora', async () => {
    sync.rol = 'admin';
    render(<PtaBackofficeModule />);
    await screen.findByText('Docente uno');
    fireEvent.click(screen.getAllByTitle('Más acciones')[0]);
    expect(screen.queryByText('Eliminar PTA')).toBeNull();
    expect(screen.queryByTitle('Eliminar PTA definitivamente (solo admin)')).toBeNull();
  });
});
afterEach(cleanup);
const tab = (name: string) => screen.getAllByText(name)[0].closest('button')!;

describe('listado y contadores del backoffice', () => {
  it('refresca inmediatamente después de resolver en el panel sin esperar al sondeo', async () => {
    render(<PtaBackofficeModule />);
    fireEvent.click(await screen.findByText('Docente uno'));
    await screen.findByText('Resolver caso');
    vi.mocked(getAllPTAs).mockResolvedValue({ success: true, data: [{ ...pendientes[0], estado: 'Aprobado' }, pendientes[1]] });
    fireEvent.click(screen.getByText('Resolver caso'));
    await waitFor(() => expect(getAllPTAs).toHaveBeenCalledTimes(2));
    expect(tab('Aprobación').textContent).toContain('1');
    expect(tab('Aprobado').textContent).toContain('1');
    expect(screen.getByText('Docente dos')).toBeTruthy();
    expect(screen.getByText('Resolver caso')).toBeTruthy();
  });

  it('vuelve a una página con registros cuando la última página de pendientes queda vacía', async () => {
    const many = Array.from({ length: 51 }, (_, i) => ({ ...pendientes[0], id: `pta-${i}`, docente_nombre: `Docente número ${i}` }));
    vi.mocked(getAllPTAs).mockResolvedValue({ success: true, data: many });
    render(<PtaBackofficeModule />);
    await screen.findByText('Docente número 0');
    fireEvent.click(tab('Aprobación'));
    fireEvent.click(screen.getByText('Pág 1 / 2').nextElementSibling!);
    await screen.findByText('Pág 2 / 2');
    vi.mocked(getAllPTAs).mockResolvedValue({ success: true, data: many.slice(0, 50) });
    await act(async () => { await sync.options.onRefresh(); });
    expect(screen.queryByText('Pág 2 / 2')).toBeNull();
    expect(screen.getByText('Docente número 0')).toBeTruthy();
  });
  it('actualiza todas las pestañas y conserva el otro pendiente tras una decisión simultánea', async () => {
    render(<PtaBackofficeModule />);
    await screen.findByText('Docente uno');
    fireEvent.click(tab('Aprobación'));
    expect(tab('Todos').textContent).toContain('2');
    vi.mocked(getAllPTAs).mockResolvedValue({ success: true, data: [{ ...pendientes[0], estado: 'Aprobado' }, pendientes[1]] });
    await act(async () => { await sync.options.onRefresh(); });
    expect(tab('Todos').textContent).toContain('2');
    expect(tab('Aprobación').textContent).toContain('1');
    expect(tab('Aprobado').textContent).toContain('1');
    expect(screen.getByText('Docente dos')).toBeTruthy();
    expect(screen.queryByText('Docente uno')).toBeNull();
    fireEvent.click(tab('Aprobado'));
    expect(screen.getByText('Docente uno')).toBeTruthy();
    expect(tab('Todos').textContent).toContain('2');
    expect(vi.mocked(getAllPTAs).mock.calls.every(([filters]) => !filters?.estado)).toBe(true);
  });

  it('mantiene los registros visibles ante fallos de consulta', async () => {
    render(<PtaBackofficeModule />);
    await screen.findByText('Docente uno');
    vi.mocked(getAllPTAs).mockRejectedValueOnce(new Error('Sin conexión'));
    await act(async () => { await sync.options.onRefresh(); });
    expect(screen.getByText('Docente uno')).toBeTruthy();
    expect(screen.getByText('Docente dos')).toBeTruthy();
    expect(tab('Todos').textContent).toContain('2');
  });

  it('compara el alcance territorial con los IDs de las asignaturas y cuenta solo los registros visibles', async () => {
    sync.permissions.filtroTerritorial = ['900014'];
    vi.mocked(getAllPTAs).mockResolvedValue({ success: true, data: [
      { ...pendientes[0], territoriales_docencia_ids: ['900014'], territorialesAsignaturas: ['Santander'] },
      { ...pendientes[1], territoriales_docencia_ids: ['900015'], territorialesAsignaturas: ['Nariño'] },
    ] });
    render(<PtaBackofficeModule />);
    await screen.findByText('Docente uno');
    expect(screen.queryByText('Docente dos')).toBeNull();
    expect(tab('Todos').textContent).toContain('1');
    expect(tab('Aprobación').textContent).toContain('1');
  });

  it('el alcance global del rol prevalece sobre la seccional personal y los contadores cambian al restringirlo', async () => {
    sync.permissions.filtroTerritorial = ['900014'];
    vi.mocked(getPTADecisionListScope).mockResolvedValue({ success: true, data: { configured: true, territoriales: null, programas: null, cetaps: null } });
    vi.mocked(getAllPTAs).mockResolvedValue({ success: true, data: [
      { ...pendientes[0], territoriales_docencia_ids: ['900014'], territorialesAsignaturas: ['Santander'] },
      { ...pendientes[1], territoriales_docencia_ids: ['900015'], territorialesAsignaturas: ['Nariño'] },
    ] });
    render(<PtaBackofficeModule />);
    await screen.findByText('Docente dos');
    expect(screen.getByText('Docente uno')).toBeTruthy();
    expect(tab('Todos').textContent).toContain('2');
    expect(tab('Aprobación').textContent).toContain('2');
    vi.mocked(getPTADecisionListScope).mockResolvedValue({ success: true, data: { configured: true, territoriales: ['Nariño'], programas: null, cetaps: null } });
    await act(async () => { await sync.options.onRefresh(); });
    expect(screen.getByText('Docente dos')).toBeTruthy();
    expect(screen.queryByText('Docente uno')).toBeNull();
    expect(tab('Todos').textContent).toContain('1');
    expect(tab('Aprobación').textContent).toContain('1');
  });
});
