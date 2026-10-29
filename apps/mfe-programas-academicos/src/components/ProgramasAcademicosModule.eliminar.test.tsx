import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { apiClient } from '../../services/api';
import { ProgramasAcademicosModule } from './ProgramasAcademicosModule';

vi.mock('../../services/api', () => ({ apiClient: { get: vi.fn(), delete: vi.fn() } }));
vi.mock('../hooks', () => ({ useAuth: () => ({ hasRole: () => true }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@esap-mfe/shared-ui/sonner', () => ({ Toaster: () => null }));
vi.mock('@esap-mfe/shared-ui', async () => {
  const { ConfirmationDialog } = await import('../../../../packages/shared-ui/src/confirmation-dialog');
  const Wrapper = ({ children }: any) => <div>{children}</div>;
  return { Card: Wrapper, Badge: Wrapper, Container4K: Wrapper, ResponsiveHeader: Wrapper,
    DropdownMenu: Wrapper, DropdownMenuContent: Wrapper, DropdownMenuTrigger: Wrapper,
    DropdownMenuItem: ({ onClick, children }: any) => <button onClick={onClick}>{children}</button>,
    DropdownMenuSeparator: () => null, ConfirmationDialog };
});
vi.mock('./CreateProgramaModal', () => ({ CreateProgramaModal: () => null }));
vi.mock('./PlanesEstudioDashboard', () => ({ PlanesEstudioDashboard: () => null }));
vi.mock('./AsignaturasPlanEstudios', () => ({ AsignaturasPlanEstudios: () => null }));
vi.mock('./ImportarAsignaturas', () => ({ ImportarAsignaturas: () => null }));
vi.mock('./GestionPeriodos', () => ({ GestionPeriodos: () => null }));
vi.mock('./ProgramCetapsModal', () => ({ ProgramCetapsModal: () => null }));
vi.mock('./shared/PaginationPremium', () => ({ PaginationPremium: () => null }));

const programa = { id: '111', nombre: 'Programa de prueba', codigo: 'PRO-PRUEBA', estado: 'ACTIVO',
  nivelFormacion: 'Pregrado', modalidad: 'presencial', totalAsignaturas: 3, creditosPlan: 9,
  estudiantesActivos: 30, cetapsList: [], sede: 'Sede Central', facultad: 'Pregrado' };

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.mocked(apiClient.get).mockImplementation(async (url: string) => {
    if (url.includes('periodos-academicos')) return [{ codigo: '2026-1', estado: 'en_curso' }];
    if (url.includes('filtros/opciones')) return {};
    return { data: [programa], total: 1, pagina: 1, porPagina: 10 };
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

async function abrirConfirmacion() {
  render(<ProgramasAcademicosModule />);
  fireEvent.click((await screen.findAllByRole('button', { name: /Eliminar Programa/ }))[0]);
  expect(await screen.findByText(/Los PTAs y registros académicos existentes se conservarán/)).toBeTruthy();
}

describe('retiro de un programa desde el listado', () => {
  it('permite cancelar sin enviar ninguna petición de retiro', async () => {
    await abrirConfirmacion();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Eliminar' })).toBeNull());
    expect(apiClient.delete).not.toHaveBeenCalled();
  });

  it('envía el período, evita duplicados y actualiza el listado al confirmar el servidor', async () => {
    let confirmar!: (value: any) => void;
    vi.mocked(apiClient.delete).mockImplementationOnce(() => new Promise(resolve => { confirmar = resolve; }));
    await abrirConfirmacion();
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    const procesando = await screen.findByRole('button', { name: /Procesando/ });
    expect((procesando as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(procesando);
    expect(apiClient.delete).toHaveBeenCalledTimes(1);
    expect(apiClient.delete).toHaveBeenCalledWith('/auth/api/v1/programas-academicos/111?periodo=2026-1', { skipErrorToast: true });
    vi.mocked(apiClient.get).mockImplementation(async (url: string) => url.includes('filtros/opciones') ? {} : { data: [], total: 0 });
    await act(async () => confirmar(null));
    await waitFor(() => expect(screen.queryByText('Programa de prueba')).toBeNull());
    expect(toast.success).toHaveBeenCalledWith('Programa retirado del período', expect.anything());
  });

  it('muestra el motivo real si el servidor rechaza la operación y conserva el programa', async () => {
    vi.mocked(apiClient.delete).mockRejectedValueOnce(new Error('El período seleccionado no existe.'));
    await abrirConfirmacion();
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('No se pudo retirar el programa', {
      description: 'El período seleccionado no existe.',
    }));
    await waitFor(() => expect((screen.getByRole('button', { name: 'Eliminar' }) as HTMLButtonElement).disabled).toBe(false));
    expect(screen.getAllByText('Programa de prueba').length).toBeGreaterThan(0);
    expect(toast.success).not.toHaveBeenCalled();
  });
});
