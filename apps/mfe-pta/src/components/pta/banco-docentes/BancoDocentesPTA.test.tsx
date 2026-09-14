import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BancoDocentesPTA } from './BancoDocentesPTA';
import { getBancoDocentes } from '../../../services/api/ptaApi';

vi.mock('../../../services/api/ptaApi', () => ({
  getBancoDocentes: vi.fn(),
  getBancoDocenteStats: vi.fn().mockResolvedValue({ success: true, data: { total: 1 } }),
  getCatalogoTerritoriales: vi.fn().mockResolvedValue({ success: true, data: [] }),
}));
vi.mock('../../../../../shell/src/services/api', () => ({ apiClient: {
  get: vi.fn().mockResolvedValue([{ codigo: '2026-2', estado: 'en_curso' }]),
} }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ hasPermission: () => true }) }));
vi.mock('../../../utils/bancoDocentesExcel', () => ({ downloadBancoDocentesTemplate: vi.fn() }));
vi.mock('./BancoDocenteDetalleInline', () => ({ BancoDocenteDetalleInline: () => <tr><td>Detalle abierto</td></tr> }));
vi.mock('./BancoDocenteEditModal', () => ({ BancoDocenteEditModal: () => null }));
vi.mock('./BancoDocenteEstadoModal', () => ({ BancoDocenteEstadoModal: () => null }));
vi.mock('./BancoDocentesBulkUpload', () => ({ BancoDocentesBulkUpload: () => null }));
vi.mock('./TableroInvitacionesRUND', () => ({ TableroInvitacionesRUND: () => null }));
afterEach(cleanup);

it('conserva el listado del periodo activo cuando una consulta inicial termina tarde', async () => {
  const anteriores: Array<(result: any) => void> = [];
  const result = (nombre_completo: string) => ({ success: true, data: {
    data: [{ id: nombre_completo, nombre_completo, estado: 'ACTIVO' }], total: 100, pages: 2,
  } });
  vi.mocked(getBancoDocentes).mockImplementation((filters) => filters?.periodoCarga === '2026-2'
    ? Promise.resolve(result('DOCENTE PERIODO ACTUAL'))
    : new Promise((resolve) => { anteriores.push(resolve); }));
  render(<BancoDocentesPTA />);
  await screen.findByText('DOCENTE PERIODO ACTUAL');
  expect(anteriores.length).toBeGreaterThan(0);
  const consultasIniciales = anteriores.length;
  // El debounce inicial debe cancelarse al resolver el periodo activo.
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 450)); });
  expect(anteriores).toHaveLength(consultasIniciales);
  await act(async () => { anteriores.forEach((resolve) => resolve(result('DOCENTE PERIODO ANTERIOR'))); });
  expect(screen.queryByText('DOCENTE PERIODO ANTERIOR')).toBeNull();
  expect(screen.getByText('DOCENTE PERIODO ACTUAL')).toBeTruthy();
  // Los controles originales de consulta, cierre y edición permanecen.
  fireEvent.click(screen.getByTitle('Ver detalle'));
  await waitFor(() => expect(screen.getByText('Detalle abierto')).toBeTruthy());
  expect(screen.getByTitle('Editar docente')).toBeTruthy();
  fireEvent.click(screen.getByTitle('Cerrar detalle'));
  expect(screen.queryByText('Detalle abierto')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '2', exact: true }));
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 450)); });
  expect(vi.mocked(getBancoDocentes).mock.calls.at(-1)?.[0]).toMatchObject({ page: 2, periodoCarga: '2026-2' });
});
