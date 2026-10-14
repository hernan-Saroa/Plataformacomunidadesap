import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('../../hooks', () => ({ useAuth: () => ({ hasRole: () => true }) }));
vi.mock('../../hooks/useRoles', () => ({ useRoles: () => ({ roles: [] }) }));
vi.mock('../../services/usersService', () => ({ usersService: { getUsers: vi.fn(), updateUser: vi.fn(), createUser: vi.fn() } }));
vi.mock('../../services/api/roles.service', () => ({ rolesService: { getRoles: vi.fn() } }));
vi.mock('../../services/api/rundSync.service', () => ({ syncRundProfilesWithFeedback: vi.fn() }));
vi.mock('sonner', () => ({ Toaster: () => null, toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() } }));
vi.mock('@esap-mfe/shared-ui', async () => {
  const actual = await vi.importActual<any>('@esap-mfe/shared-ui');
  const Wrapper = ({ children }: any) => <div>{children}</div>;
  return { ...actual, DropdownMenu: Wrapper, DropdownMenuContent: Wrapper,
    DropdownMenuItem: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
    DropdownMenuTrigger: Wrapper, DropdownMenuSeparator: () => null };
});
vi.mock('./AssignRolesModal', () => ({
  AssignRolesModal: ({ onSave, onToggleRole, onClose, selectedRoleIds }: any) => <div>
    <button onClick={() => onToggleRole('docente')}>Elegir DOCENTE</button>
    <button onClick={onSave}>Confirmar roles</button>
    <button onClick={() => { onSave(); onSave(); }}>Confirmar dos veces</button>
    <button onClick={onClose}>Cerrar roles</button>
    <span>Seleccionados: {Array.from(selectedRoleIds).join(',')}</span>
  </div>,
}));
vi.mock('./CreatePersonModal', () => ({
  CreatePersonModal: ({ isOpen, onCreate }: any) => isOpen ? <div>
    <button onClick={() => { void onCreate({ firstName: 'Nuevo', lastName: 'Docente', email: 'nuevo@example.test', documentNumber: '0002', role: 'Docente' }).catch(() => undefined); }}>Crear DOCENTE ficticio</button>
    <button onClick={() => { void onCreate({ firstName: 'Nuevo', lastName: 'Admin', email: 'nuevo@example.test', documentNumber: '0002', roleIds: ['admin'] }).catch(() => undefined); }}>Crear ADMIN ficticio</button>
  </div> : null,
}));

import { usersService } from '../../services/usersService';
import { rolesService } from '../../services/api/roles.service';
import { syncRundProfilesWithFeedback } from '../../services/api/rundSync.service';
import { toast } from 'sonner';
import { UsersPersonsModulePremium } from './UsersPersonsModulePremium';

function deferred() {
  let resolve!: (value?: any) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<any>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.clearAllMocks();
  localStorage.clear();
  vi.mocked(usersService.getUsers).mockResolvedValue({
    data: [{ id: 'persona-1', first_name: 'Persona', last_name: 'Ficticia', email: 'test@example.test',
      identification_number: '0001', user: { id_user: 'usuario-1', is_active: true, roles: [{ id: 'admin', code: 'ADMIN', name: 'Administrador' }] } }],
    meta: { page: 1, limit: 10, totalPages: 1, total: 1, totalActive: 1, totalBlocked: 0 },
  } as any);
  vi.mocked(usersService.updateUser).mockResolvedValue({} as any);
  vi.mocked(usersService.createUser).mockResolvedValue({} as any);
  vi.mocked(rolesService.getRoles).mockResolvedValue({ roles: [
    { id: 'admin', code: 'ADMIN', name: 'Administrador' },
    { id: 'docente', code: 'DOCENTE', name: 'Docente' },
  ] } as any);
  vi.mocked(syncRundProfilesWithFeedback).mockResolvedValue(undefined);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

async function openRoles() {
  render(<UsersPersonsModulePremium />);
  const buttons = await screen.findAllByRole('button', { name: 'Asignar Roles' });
  fireEvent.click(buttons[0]);
  await screen.findByRole('button', { name: 'Confirmar roles' });
  await waitFor(() => expect(rolesService.getRoles).toHaveBeenCalledWith({ page: 1, limit: 200 }));
}

describe('creación de usuarios con la sincronización RUND', () => {
  async function openCreate() {
    render(<UsersPersonsModulePremium />);
    await screen.findAllByRole('button', { name: 'Asignar Roles' });
    fireEvent.click(screen.getAllByRole('button', { name: 'Crear Usuario' })[0]);
    await screen.findByRole('button', { name: 'Crear DOCENTE ficticio' });
  }

  it('crea el usuario en auth antes de sincronizar, incluyendo el rol seleccionado por nombre', async () => {
    const save = deferred();
    vi.mocked(usersService.createUser).mockReturnValue(save.promise);
    await openCreate();
    fireEvent.click(screen.getByRole('button', { name: 'Crear DOCENTE ficticio' }));
    expect(usersService.createUser).toHaveBeenCalledWith(expect.objectContaining({ roleIds: ['docente'], email: 'nuevo@example.test' }));
    expect(syncRundProfilesWithFeedback).not.toHaveBeenCalled();
    await act(async () => { save.resolve(); await save.promise; });
    await waitFor(() => expect(syncRundProfilesWithFeedback).toHaveBeenCalledWith('user'));
    expect(usersService.createUser).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Crear DOCENTE ficticio' })).toBeNull();
    expect(toast.success).toHaveBeenCalledWith('Usuario Creado Exitosamente', expect.anything());
  });

  it('no sincroniza al crear un usuario sin rol DOCENTE', async () => {
    await openCreate();
    fireEvent.click(screen.getByRole('button', { name: 'Crear ADMIN ficticio' }));
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(syncRundProfilesWithFeedback).not.toHaveBeenCalled();
  });

  it('no sincroniza si auth rechaza crear el usuario', async () => {
    vi.mocked(usersService.createUser).mockRejectedValue(new Error('Usuario rechazado'));
    await openCreate();
    fireEvent.click(screen.getByRole('button', { name: 'Crear DOCENTE ficticio' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Error al crear usuario', expect.anything()));
    expect(syncRundProfilesWithFeedback).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Crear DOCENTE ficticio' })).toBeTruthy();
  });
});

describe('asignación real de roles y sincronización secundaria', () => {
  it('sincroniza después de que auth confirme, con el mismo usuario y todos los roles', async () => {
    const save = deferred();
    vi.mocked(usersService.updateUser).mockReturnValue(save.promise);
    await openRoles();
    fireEvent.click(screen.getByRole('button', { name: 'Elegir DOCENTE' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar roles' }));
    expect(usersService.updateUser).toHaveBeenCalledWith('usuario-1', { roleIds: ['admin', 'docente'] });
    expect(syncRundProfilesWithFeedback).not.toHaveBeenCalled();
    await act(async () => { save.resolve(); await save.promise; });
    await waitFor(() => expect(syncRundProfilesWithFeedback).toHaveBeenCalledTimes(1));
    expect(toast.success).toHaveBeenCalledWith('Roles asignados', expect.anything());
    expect(screen.queryByRole('button', { name: 'Confirmar roles' })).toBeNull();
    expect(usersService.updateUser).toHaveBeenCalledTimes(1);
  });

  it('no sincroniza si los roles seleccionados no incluyen DOCENTE', async () => {
    await openRoles();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar roles' }));
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(syncRundProfilesWithFeedback).not.toHaveBeenCalled();
  });

  it('no sincroniza ni cierra el formulario si auth rechaza los roles', async () => {
    vi.mocked(usersService.updateUser).mockRejectedValue(new Error('Roles rechazados'));
    await openRoles();
    fireEvent.click(screen.getByRole('button', { name: 'Elegir DOCENTE' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar roles' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Error al asignar roles', expect.anything()));
    expect(syncRundProfilesWithFeedback).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Confirmar roles' })).toBeTruthy();
  });

  it('evita duplicar la asignación ante dos eventos en el mismo render', async () => {
    const save = deferred();
    vi.mocked(usersService.updateUser).mockReturnValue(save.promise);
    await openRoles();
    fireEvent.click(screen.getByRole('button', { name: 'Elegir DOCENTE' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar dos veces' }));
    expect(usersService.updateUser).toHaveBeenCalledTimes(1);
    await act(async () => { save.resolve(); await save.promise; });
    await waitFor(() => expect(syncRundProfilesWithFeedback).toHaveBeenCalledTimes(1));
  });

  it('rechaza una selección vacía antes de escribir en auth', async () => {
    vi.mocked(usersService.getUsers).mockResolvedValue({ data: [{ id: 'persona-1', first_name: 'Persona', last_name: 'Ficticia',
      user: { id_user: 'usuario-1', is_active: true, roles: [] } }], meta: { total: 1 } } as any);
    await openRoles();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar roles' }));
    expect(toast.error).toHaveBeenCalledWith('Selecciona al menos un rol', expect.anything());
    expect(usersService.updateUser).not.toHaveBeenCalled();
    expect(syncRundProfilesWithFeedback).not.toHaveBeenCalled();
  });
});
