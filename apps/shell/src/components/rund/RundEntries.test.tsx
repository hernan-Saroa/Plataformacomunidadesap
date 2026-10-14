import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { RundShellModule, RundPublicAutogestionPage, resolveRundRemote } from './RundEntries';

vi.mock('rund/Module', () => ({ RundModulePremium: (props: any) => <div>
  <p>Banco remoto RUND</p><pre data-testid="session">{JSON.stringify(props)}</pre>
  <input aria-label="Dato de la sesión anterior" defaultValue="" />
</div> }));
vi.mock('rund/Autogestion', () => ({ AutogestionDocenteRUND: () => <input aria-label="Borrador de invitación" defaultValue="" /> }));
afterEach(cleanup);

const session = { userPersonId: 'persona-1', userName: 'OPERADOR', userEmail: 'operador@example.test',
  userRoles: ['GESTION_PROFESORAL'], userPermissions: ['banco-docentes.rund.manage'] };

describe('Entradas RUND desde el shell', () => {
  it('resuelve el export público envuelto por la federación y rechaza exports ausentes', () => {
    const component = () => null;
    expect(resolveRundRemote({ default: { AutogestionDocenteRUND: component } }, 'AutogestionDocenteRUND')).toBe(component);
    expect(resolveRundRemote({ RundModulePremium: component }, 'RundModulePremium')).toBe(component);
    expect(resolveRundRemote({ default: component }, 'RundModulePremium')).toBe(component);
    expect(() => resolveRundRemote({ default: {} }, 'AutogestionDocenteRUND')).toThrow('No fue posible resolver');
  });
  it('pasa identidad, roles y permisos al remote y mantiene el modo embedded', async () => {
    render(<RundShellModule {...session} />);
    const props = JSON.parse((await screen.findByTestId('session')).textContent!);
    expect(props).toEqual({ ...session, embedded: true });
  });

  it.each(['persona', 'roles', 'permisos'] as const)('descarta datos del remote al cambiar %s', async field => {
    const { rerender } = render(<RundShellModule {...session} />);
    const input = await screen.findByLabelText('Dato de la sesión anterior');
    fireEvent.change(input, { target: { value: 'DATOS PRIVADOS ANTERIORES' } });
    const next = { ...session, ...(field === 'persona' ? { userPersonId: 'persona-2' }
      : field === 'roles' ? { userRoles: ['ADMIN'] } : { userPermissions: ['banco-docentes.rund.view'] }) };
    rerender(<RundShellModule {...next} />);
    expect(screen.getByLabelText('Dato de la sesión anterior')).toHaveValue('');
  });

  it('mantiene el formulario si solo cambió el nombre visible del mismo operador', async () => {
    const { rerender } = render(<RundShellModule {...session} />);
    fireEvent.change(await screen.findByLabelText('Dato de la sesión anterior'), { target: { value: 'EDICIÓN EN CURSO' } });
    rerender(<RundShellModule {...session} userName="NOMBRE ACTUALIZADO" />);
    expect(screen.getByLabelText('Dato de la sesión anterior')).toHaveValue('EDICIÓN EN CURSO');
  });

  it('el formulario público no requiere login y cambia de instancia al cambiar la invitación', async () => {
    function PublicRoute() {
      const navigate = useNavigate();
      return <><button onClick={() => navigate('?token=otra-invitacion')}>Otra invitación</button><RundPublicAutogestionPage /></>;
    }
    render(<MemoryRouter initialEntries={['/rund/autogestion/docentes?token=invitacion']}><PublicRoute /></MemoryRouter>);
    fireEvent.change(await screen.findByLabelText('Borrador de invitación'), { target: { value: 'BORRADOR ANTERIOR' } });
    fireEvent.click(screen.getByText('Otra invitación'));
    expect(screen.getByLabelText('Borrador de invitación')).toHaveValue('');
  });
});
