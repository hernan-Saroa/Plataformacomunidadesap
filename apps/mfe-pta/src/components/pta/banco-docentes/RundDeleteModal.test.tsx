import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { RundDeleteModal } from './RundDeleteModal';
import { confirmRundDeletion, previewRundDeletion } from '../../../services/api/ptaApi';
vi.mock('../../../services/api/ptaApi', () => ({ previewRundDeletion: vi.fn(), confirmRundDeletion: vi.fn() }));
const preview = { ids: ['perfil-1'], fingerprint: 'huella-servidor', total: 1,
  registros: [{ id: 'perfil-1', nombre_completo: 'Persona ficticia', documento_identidad: 'TEST-1', periodo_carga: '2026-2' }] };
beforeEach(() => { vi.clearAllMocks(); vi.mocked(previewRundDeletion).mockResolvedValue(preview); });
afterEach(cleanup);
it('exige revisar la selección y un motivo, y envía exactamente la previsualización confirmada', async () => {
  vi.mocked(confirmRundDeletion).mockResolvedValue({ eliminados: 1 });
  const onDeleted = vi.fn();
  render(<RundDeleteModal selection={{ ids: ['perfil-1'] }} onClose={vi.fn()} onDeleted={onDeleted} />);
  await screen.findByText('Persona ficticia');
  const button = screen.getByRole('button', { name: 'Eliminar 1 registro' }) as HTMLButtonElement;
  expect(button.disabled).toBe(true);
  fireEvent.change(screen.getByLabelText('Motivo de la eliminación'), { target: { value: 'Registro de prueba duplicado' } });
  expect(button.disabled).toBe(true);
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(button);
  await waitFor(() => expect(onDeleted).toHaveBeenCalledWith(1));
  expect(confirmRundDeletion).toHaveBeenCalledWith(preview, 'Registro de prueba duplicado');
});
it('muestra errores sin cerrar ni fingir una eliminación exitosa', async () => {
  vi.mocked(confirmRundDeletion).mockRejectedValue(new Error('La selección cambió. Actualice el listado.'));
  const onDeleted = vi.fn(), onClose = vi.fn();
  render(<RundDeleteModal selection={{ ids: ['perfil-1'] }} onClose={onClose} onDeleted={onDeleted} />);
  await screen.findByText('Persona ficticia');
  fireEvent.change(screen.getByLabelText('Motivo de la eliminación'), { target: { value: 'Registro de prueba duplicado' } });
  fireEvent.click(screen.getByRole('checkbox')); fireEvent.click(screen.getByRole('button', { name: 'Eliminar 1 registro' }));
  expect((await screen.findByRole('alert')).textContent).toContain('La selección cambió');
  expect(onDeleted).not.toHaveBeenCalled(); expect(onClose).not.toHaveBeenCalled();
});
it('un fallo al consultar la selección impide la eliminación y permite cerrar con Escape', async () => {
  vi.mocked(previewRundDeletion).mockRejectedValue(new Error('Registro no disponible'));
  const onClose = vi.fn();
  render(<RundDeleteModal selection={{ ids: ['perfil-1'] }} onClose={onClose} onDeleted={vi.fn()} />);
  await screen.findByRole('alert');
  expect((screen.getByRole('button', { name: /Eliminar.*registros/ }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.keyDown(document, { key: 'Escape' }); expect(onClose).toHaveBeenCalled();
  expect(confirmRundDeletion).not.toHaveBeenCalled();
});
