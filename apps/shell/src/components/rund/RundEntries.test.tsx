import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { RundShellModule, RundPublicAutogestionPage, resolveRundRemote } from './RundEntries';

const remote=vi.hoisted(()=>({latest:null as any}));

vi.mock('rund/Module', () => ({ RundModulePremium: (props: any) => {remote.latest=props;return <div>
  <p>Banco remoto RUND</p><pre data-testid="session">{JSON.stringify(props)}</pre>
  <input aria-label="Dato de la sesión anterior" defaultValue="" />
</div>;} }));
vi.mock('rund/Autogestion', () => ({ AutogestionDocenteRUND: () => <input aria-label="Borrador de invitación" defaultValue="" /> }));
beforeEach(()=>vi.stubGlobal('fetch',vi.fn()));
afterEach(()=>{cleanup();vi.unstubAllGlobals();});

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
    expect(props).toEqual({ ...session, manualOperatorSession:{}, embedded: true });
    expect(typeof remote.latest.manualOperatorSession.resolve).toBe('function');
    expect(fetch).not.toHaveBeenCalled();
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
  it('consulta el principal solo bajo demanda y descarta respuestas tardías tras cambiar la sesión del shell',async()=>{
    let finish!:(value:any)=>void;vi.mocked(fetch).mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
    const view=render(<RundShellModule {...session}/>);await screen.findByTestId('session');
    const previous=remote.latest.manualOperatorSession,pending=previous.resolve().catch(()=>null);
    view.rerender(<RundShellModule {...session} userPersonId="otra-persona"/>);
    finish({ok:true,json:async()=>({userId:'abcdef00-1111-4111-8111-111111111111'})});expect(await pending).toBeNull();
    await expect(previous.resolve()).rejects.toThrow();
  });
  it('notificación de autenticación invalida la conexión sin tocar el formulario habitual ni consultar automáticamente',async()=>{
    const view=render(<RundShellModule {...session}/>);await screen.findByTestId('session');
    const notify=vi.fn(),connection=remote.latest.manualOperatorSession,unsubscribe=connection.subscribe(notify);
    fireEvent.change(screen.getByLabelText('Dato de la sesión anterior'),{target:{value:'EDICIÓN EN CURSO'}});
    const calls=vi.mocked(fetch).mock.calls.length;
    window.dispatchEvent(new CustomEvent('esap:auth-user-changed',{detail:{user:{userId:'NO CONFIAR'}}}));
    expect(notify).toHaveBeenCalledOnce();expect(fetch).toHaveBeenCalledTimes(calls);
    expect(screen.getByLabelText('Dato de la sesión anterior')).toHaveValue('EDICIÓN EN CURSO');unsubscribe();view.unmount();
  });
});
