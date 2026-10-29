import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';
import { getPTACurrentRoleAccess } from '../services/api/ptaApi';
import { PermisosPTAProvider, usePermisosPTA } from '../components/pta/PermisosPTAContext';

vi.mock('../services/api/ptaApi', () => ({ getPTACurrentRoleAccess: vi.fn() }));
vi.mock('../../../shell/src/services/api', () => ({ apiClient: { get: vi.fn() } }));
const tracking = 'pta.backoffice.seguimiento';
const review = 'pta.review.academica.territorial.pregrado';
const response = (permissions: string[], isSuperUser = false) => ({ success: true, data: {
  userId: 'coordinador', roles: ['REVISOR_TERRITORIAL'], permissions, isSuperUser,
} });
function Probe() {
  const auth = useAuth();
  const { tieneVista, permisos } = usePermisosPTA();
  return <>
    {tieneVista('seguimiento_docs') && <span>Seguimiento habilitado</span>}
    {tieneVista('gestion') && <span>Gestión habilitada</span>}
    {tieneVista('tablero') && <span>Tablero habilitado</span>}
    {tieneVista('banco_docentes') && <span>Banco habilitado</span>}
    {permisos.puedeRevisar && <span>Revisión habilitada</span>}
    {permisos.puedeAprobar && <span>Aprobación habilitada</span>}
    {auth.hasPermission('banco-docentes.rund.revision') && <span>RUND conservado</span>}
    <button onClick={() => auth.refreshPermissions?.()}>Consultar acceso</button>
  </>;
}
function view(userPersonId = 'coordinador') {
  return <AuthProvider syncPtaRoles userPersonId={userPersonId} userEmail={`${userPersonId}@esap.edu.co`}
    userRole="REVISOR_TERRITORIAL" permisos={['pta.approve.all', tracking, 'banco-docentes.rund.revision']}>
    <PermisosPTAProvider><Probe /></PermisosPTAProvider>
  </AuthProvider>;
}
beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);

describe('roles vigentes de PTA en la interfaz', () => {
  it('conserva el formulario abierto al actualizar permisos del shell para la misma cuenta', async () => {
    vi.mocked(getPTACurrentRoleAccess).mockResolvedValue(response([tracking, review]));
    const content = (permissions: string[]) => <AuthProvider syncPtaRoles userPersonId="cuenta" permisos={permissions}>
      <input aria-label="Observaciones sin guardar" />
    </AuthProvider>;
    const mounted = render(content([tracking]));
    fireEvent.change(await screen.findByRole('textbox', { name: 'Observaciones sin guardar' }), { target: { value: 'Observación pendiente' } });
    mounted.rerender(content([tracking, 'banco-docentes.rund.revision']));
    await waitFor(() => expect(getPTACurrentRoleAccess).toHaveBeenCalledTimes(2));
    expect((await screen.findByRole('textbox', { name: 'Observaciones sin guardar' }) as HTMLInputElement).value)
      .toBe('Observación pendiente');
  });
  it('sustituye permisos antiguos por los roles vigentes y conserva permisos ajenos a PTA', async () => {
    vi.mocked(getPTACurrentRoleAccess).mockResolvedValue(response([tracking, review]));
    render(view());
    expect(screen.queryByText('Seguimiento habilitado')).toBeNull();
    expect(await screen.findByText('Seguimiento habilitado')).toBeTruthy();
    expect(screen.getByText('Revisión habilitada')).toBeTruthy();
    expect(screen.queryByText('Aprobación habilitada')).toBeNull();
    expect(screen.getByText('RUND conservado')).toBeTruthy();
  });

  it('aplica la suma de roles y retira sus permisos al regresar a la aplicación', async () => {
    vi.mocked(getPTACurrentRoleAccess).mockResolvedValueOnce(response([tracking, review, 'pta.approve.investigacion']))
      .mockResolvedValueOnce(response([]));
    render(view());
    await screen.findByText('Seguimiento habilitado');
    expect(screen.getByText('Revisión habilitada')).toBeTruthy();
    expect(screen.getByText('Aprobación habilitada')).toBeTruthy();
    act(() => window.dispatchEvent(new Event('focus')));
    await waitFor(() => expect(screen.queryByText('Seguimiento habilitado')).toBeNull());
    expect(screen.queryByText('Revisión habilitada')).toBeNull();
    expect(screen.queryByText('Aprobación habilitada')).toBeNull();
    expect(screen.queryByText('Gestión habilitada')).toBeNull();
    expect(screen.queryByText('Tablero habilitado')).toBeNull();
    expect(screen.getByText('Banco habilitado')).toBeTruthy();
  });

  it('retirar el último rol no recupera pantallas por un nombre antiguo de administrador', async () => {
    vi.mocked(getPTACurrentRoleAccess).mockResolvedValue(response([]));
    render(<AuthProvider syncPtaRoles userPersonId="cuenta" userRole="SUPER_ADMIN" permisos={['pta.approve.all']}>
      <PermisosPTAProvider><Probe /></PermisosPTAProvider>
    </AuthProvider>);
    await screen.findByRole('button', { name: 'Consultar acceso' });
    for (const name of ['Gestión', 'Tablero', 'Seguimiento', 'Banco']) {
      expect(screen.queryByText(`${name} habilitado`)).toBeNull();
      expect(screen.queryByText(`${name} habilitada`)).toBeNull();
    }
    expect(screen.queryByText('Aprobación habilitada')).toBeNull();
  });

  it('hereda un rol nuevo durante la sesión sin recargar el navegador', async () => {
    vi.mocked(getPTACurrentRoleAccess).mockResolvedValueOnce(response([]))
      .mockResolvedValueOnce(response([tracking, review]));
    render(view());
    await waitFor(() => expect(getPTACurrentRoleAccess).toHaveBeenCalledTimes(1));
    await act(async () => {});
    act(() => window.dispatchEvent(new Event('esap:role-permissions-updated')));
    expect(await screen.findByText('Seguimiento habilitado')).toBeTruthy();
    expect(screen.getByText('Revisión habilitada')).toBeTruthy();
  });

  it('no recupera privilegios de Super Admin desde el shell ni ante un error del servidor', async () => {
    vi.mocked(getPTACurrentRoleAccess).mockResolvedValueOnce(response([tracking, review]))
      .mockResolvedValueOnce({ success: false, data: null });
    render(<AuthProvider syncPtaRoles isSuperUser userPersonId="coordinador" userRole="SUPER_ADMIN" permisos={['pta.approve.all']}>
      <PermisosPTAProvider><Probe /></PermisosPTAProvider>
    </AuthProvider>);
    await screen.findByText('Seguimiento habilitado');
    expect(screen.queryByText('Aprobación habilitada')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Consultar acceso' }));
    await waitFor(() => expect(screen.queryByText('Seguimiento habilitado')).toBeNull());
    expect(screen.queryByText('Aprobación habilitada')).toBeNull();
    expect(screen.getByRole('alert')).toBeTruthy();
    vi.mocked(getPTACurrentRoleAccess).mockResolvedValueOnce(response([tracking, review]));
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Seguimiento habilitado')).toBeTruthy();
  });

  it('descarta una consulta anterior si cambia de cuenta o llega una revocación más reciente', async () => {
    let resolveOld: (value: any) => void = () => {};
    vi.mocked(getPTACurrentRoleAccess).mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }))
      .mockResolvedValueOnce(response([]));
    const mounted = render(view());
    await waitFor(() => expect(getPTACurrentRoleAccess).toHaveBeenCalledTimes(1));
    mounted.rerender(view('otra-cuenta'));
    await waitFor(() => expect(getPTACurrentRoleAccess).toHaveBeenCalledTimes(2));
    await act(async () => { resolveOld(response([tracking, review], true)); });
    expect(screen.queryByText('Seguimiento habilitado')).toBeNull();
    expect(screen.queryByText('Aprobación habilitada')).toBeNull();
  });

  it('una respuesta atrasada no restituye permisos después de una revocación confirmada', async () => {
    let resolveOld: (value: any) => void = () => {};
    vi.mocked(getPTACurrentRoleAccess).mockResolvedValueOnce(response([tracking, review]))
      .mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }))
      .mockResolvedValueOnce(response([]));
    render(view());
    await screen.findByText('Seguimiento habilitado');
    fireEvent.click(screen.getByRole('button', { name: 'Consultar acceso' }));
    act(() => window.dispatchEvent(new Event('esap:role-permissions-updated')));
    await waitFor(() => expect(screen.queryByText('Seguimiento habilitado')).toBeNull());
    await act(async () => { resolveOld(response([tracking, review], true)); });
    expect(screen.queryByText('Seguimiento habilitado')).toBeNull();
    expect(screen.queryByText('Aprobación habilitada')).toBeNull();
  });
});
