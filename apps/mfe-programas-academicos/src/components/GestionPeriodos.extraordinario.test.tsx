// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { GestionPeriodos } from './GestionPeriodos';
import { useImportAsignaturas } from '../hooks/useImportAsignaturas';
import { apiClient } from '../services/api/apiClient';
const hasPermission = vi.fn();
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ hasPermission, loading: false }) }));
vi.mock('../hooks/useImportAsignaturas', () => ({ useImportAsignaturas: vi.fn() }));
vi.mock('../services/api/apiClient', () => ({ apiClient: { post: vi.fn() } }));
const principal = { id: '12', codigo: '2027-2', tipo: 'semestral', nombre: null, anio: 2027, semestre: 2, fechaInicio: '2027-07-01', fechaFin: '2027-12-15', estado: 'en_curso', extraordinario: false, motivoExtraordinario: null };
const destino = { id: '13', codigo: '2027-INT', tipo: 'personalizado', nombre: 'Interperiodo', anio: 2027, semestre: null, fechaInicio: '2027-06-15', fechaFin: '2027-06-30', estado: 'planeacion', extraordinario: false, motivoExtraordinario: null };
const cerrado = { ...destino, id: '14', codigo: '2026-INT', estado: 'cerrado' };
const getPeriodos = vi.fn(), alCambiar = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  hasPermission.mockImplementation(p => p === 'pta.periodos.activar_extraordinario');
  getPeriodos.mockResolvedValue([principal, destino, cerrado]);
  vi.mocked(apiClient.post).mockResolvedValue({ ...destino, estado: 'en_curso', extraordinario: true });
  vi.mocked(useImportAsignaturas).mockReturnValue({ getPeriodos, getLastImport: vi.fn().mockResolvedValue({ success: true, counts: {} }), loading: false } as any);
});
afterEach(cleanup);
const montar = () => render(<GestionPeriodos onBack={() => {}} onNavigateToImport={() => {}} onPeriodosChanged={alCambiar} />);
it('distingue principal y extraordinario en lista, tarjeta y detalle', async () => {
  getPeriodos.mockResolvedValue([principal, { ...destino, estado: 'en_curso', extraordinario: true }]);
  montar();
  expect((await screen.findAllByText('Principal en curso')).length).toBeGreaterThan(0);
  expect((await screen.findAllByText('Extraordinario en curso')).length).toBeGreaterThan(0);
  expect(screen.queryByText('Activo', { exact: true })).toBeNull();
  expect(screen.queryByText('Semestre —')).toBeNull();
  expect(screen.getAllByText('Interperiodo — Año 2027').length).toBeGreaterThan(0);
});
it('oculta la acción sin el permiso específico', async () => {
  hasPermission.mockReturnValue(false); montar();
  await screen.findAllByText('Periodo 2027-INT');
  expect(screen.queryByRole('button', { name: 'Activar como extraordinario' })).toBeNull();
  expect(apiClient.post).not.toHaveBeenCalled();
});
it('exige motivo, confirma que conserva el principal y refresca tras éxito', async () => {
  montar();
  fireEvent.click((await screen.findAllByRole('button', { name: 'Activar como extraordinario' }))[0]);
  expect(await screen.findByRole('dialog')).toBeTruthy();
  expect(screen.getByText('No cierra el periodo principal 2027-2.')).toBeTruthy();
  expect(apiClient.post).not.toHaveBeenCalled();
  const confirmar = screen.getByRole('button', { name: 'Confirmar activación extraordinaria' }) as HTMLButtonElement;
  expect(confirmar.disabled).toBe(true);
  fireEvent.change(screen.getByLabelText(/Motivo obligatorio/), { target: { value: '   corta   ' } });
  expect(confirmar.disabled).toBe(true);
  fireEvent.change(screen.getByLabelText(/Motivo obligatorio/), { target: { value: '  Habilitar el interperiodo aprobado  ' } });
  getPeriodos.mockResolvedValue([principal, { ...destino, estado: 'en_curso', extraordinario: true }, cerrado]);
  fireEvent.click(confirmar);
  await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('/pta/api/v1/periodos-academicos/13/activar-extraordinario', { motivo: 'Habilitar el interperiodo aprobado' }, { skipErrorToast: true, retries: 0 }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(alCambiar).toHaveBeenCalledTimes(1);
  expect(getPeriodos).toHaveBeenCalledTimes(2);
  expect(screen.getAllByText('Principal en curso').length).toBeGreaterThan(0);
  expect((await screen.findAllByText('Extraordinario en curso')).length).toBeGreaterThan(0);
});
it.each([403, 409])('conserva motivo y muestra rechazo %s sin recargar', async status => {
  vi.mocked(apiClient.post).mockRejectedValue(new Error(`Rechazo ${status}: no se puede activar este periodo.`));
  montar(); fireEvent.click((await screen.findAllByRole('button', { name: 'Activar como extraordinario' }))[0]);
  fireEvent.change(screen.getByLabelText(/Motivo obligatorio/), { target: { value: 'Motivo administrativo válido' } });
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar activación extraordinaria' }));
  expect((await screen.findByRole('alert')).textContent).toContain(`Rechazo ${status}`);
  expect((screen.getByLabelText(/Motivo obligatorio/) as HTMLTextAreaElement).value).toBe('Motivo administrativo válido');
  expect(getPeriodos).toHaveBeenCalledTimes(1);
  expect(alCambiar).not.toHaveBeenCalled();
});
it('si ya hay un extraordinario en curso deshabilita otras activaciones extraordinarias', async () => {
  getPeriodos.mockResolvedValue([principal, destino, { ...destino, id: '15', codigo: '2027-ESP', estado: 'en_curso', extraordinario: true }]);
  montar();
  const botones = await screen.findAllByRole('button', { name: 'Activar como extraordinario' });
  expect(botones.every(b => (b as HTMLButtonElement).disabled)).toBe(true);
});
