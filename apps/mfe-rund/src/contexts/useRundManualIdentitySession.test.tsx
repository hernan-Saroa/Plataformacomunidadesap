import { StrictMode, type ReactNode } from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../services/api/apiClient', () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }));
import { apiClient } from '../services/api/apiClient';
import { AuthProvider, useAuth } from './AuthContext';
import { useRundManualIdentitySession } from './useRundManualIdentitySession';
import type { RundManualOperatorConnection } from './rundManualOperator';

const actor = 'abcdef00-1111-4111-8111-111111111111', other = 'abcdef00-2222-4222-8222-222222222222';
function connection() {
  const listeners = new Set<() => void>();
  return {
    resolve: vi.fn(async (_options?: { signal?: AbortSignal }): Promise<any> => ({ version: 1, actorId: actor })),
    subscribe: vi.fn((listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener); }),
    invalidate: () => listeners.forEach(listener => listener()), listeners,
  };
}
function setup(initial?: RundManualOperatorConnection) {
  let current = initial;
  function Wrapper({ children }: { children: ReactNode }) {
    return <StrictMode><AuthProvider userPersonId={other} userEmail="operador@example.test"
      userRole="GESTION_PROFESORAL" permisos={['banco-docentes.rund.manage']} manualOperatorSession={current}>{children}</AuthProvider></StrictMode>;
  }
  const view = renderHook(() => ({ ...useRundManualIdentitySession(), auth: useAuth() }), { wrapper: Wrapper });
  return { ...view, change(next?: RundManualOperatorConnection) { current = next; view.rerender(); } };
}
beforeEach(() => { sessionStorage.clear(); vi.clearAllMocks(); });
afterEach(cleanup);

describe('Conexión manual opcional del MFE por cuenta autenticada', () => {
  it('sin conexión conserva autenticación y permisos habituales, sin inferir actor desde persona o email', async () => {
    const view = setup(); expect(view.result.current.available).toBe(false); expect(view.result.current.client).toBeNull();
    expect(view.result.current.auth.isAuthenticated).toBe(true); expect(view.result.current.auth.hasPermission('banco-docentes.rund.manage')).toBe(true);
    await expect(view.result.current.resolve()).rejects.toThrow(); expect(apiClient.get).not.toHaveBeenCalled(); expect(apiClient.post).not.toHaveBeenCalled();
  });
  it('no consulta al montar; resolve crea cliente estable por cuenta sin escribir o enviar el formulario', async () => {
    const source = connection(), view = setup(source); expect(source.resolve).not.toHaveBeenCalled();
    let first: any; await act(async () => { first = await view.result.current.resolve(); });
    expect(view.result.current.client).toBe(first); expect(first.pendiente()).toBeNull(); expect(sessionStorage.length).toBe(0);
    await act(async () => { expect(await view.result.current.resolve()).toBe(first); });
    expect(source.resolve).toHaveBeenCalledTimes(2); expect(apiClient.post).not.toHaveBeenCalled(); expect(apiClient.get).not.toHaveBeenCalled();
  });
  it('la reserva almacenada pertenece a la cuenta, y otra cuenta no hereda su solicitud', async () => {
    const request = 'abcdef00-3333-4333-8333-333333333333';
    sessionStorage.setItem('rund:creacion-manual:' + actor, request);
    const source = connection(), view = setup(source);
    await act(async () => { await view.result.current.resolve(); }); const first = view.result.current.client!;
    expect(first.pendiente()).toBe(request); source.resolve.mockResolvedValue({ version: 1, actorId: other });
    await act(async () => { await view.result.current.resolve(); });
    expect(view.result.current.client).not.toBe(first); expect(view.result.current.client!.pendiente()).toBeNull();
    expect(sessionStorage.getItem('rund:creacion-manual:' + actor)).toBe(request);
  });
  it.each([null, {}, { version: 2, actorId: actor }, { version: 1, actorId: 'PERSONA' }, { version: 1, personId: actor }])('rechaza principal inválido %j y retira cliente anterior', async principal => {
    const source = connection(), view = setup(source);
    await act(async () => { await view.result.current.resolve(); }); source.resolve.mockResolvedValue(principal);
    await act(async () => { await expect(view.result.current.resolve()).rejects.toThrow('No fue posible confirmar'); });
    expect(view.result.current.client).toBeNull();
  });
  it('notificación invalida el cliente y aborta una lectura pendiente aunque el transporte ignore abort', async () => {
    const source = connection(), view = setup(source); await act(async () => { await view.result.current.resolve(); });
    let finish!: (value: any) => void;
    source.resolve.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    let pending!: Promise<any>; act(() => { pending = view.result.current.resolve().catch(() => null); });
    expect(view.result.current.client).toBeNull(); act(() => source.invalidate());
    expect(source.resolve.mock.calls[1][0].signal.aborted).toBe(true);
    await act(async () => { finish({ version: 1, actorId: actor }); expect(await pending).toBeNull(); });
    expect(view.result.current.client).toBeNull();
  });
  it('cambio de conexión rechaza respuestas anteriores, retira suscripción y permite resolver la nueva', async () => {
    const old = connection(), next = connection(), view = setup(old); let finish!: (value: any) => void;
    old.resolve.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    let pending!: Promise<any>; act(() => { pending = view.result.current.resolve().catch(() => null); });
    view.change(next); expect(old.listeners.size).toBe(0);
    await act(async () => { finish({ version: 1, actorId: actor }); expect(await pending).toBeNull(); await view.result.current.resolve(); });
    expect(view.result.current.client).not.toBeNull(); expect(next.resolve).toHaveBeenCalledOnce();
  });
  it('desmontaje impide publicar una respuesta tardía y elimina suscripciones', async () => {
    const source = connection(), view = setup(source); let finish!: (value: any) => void;
    source.resolve.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    let pending!: Promise<any>; act(() => { pending = view.result.current.resolve().catch(() => null); });
    view.unmount(); expect(source.listeners.size).toBe(0); finish({ version: 1, actorId: actor }); expect(await pending).toBeNull();
  });
  it('dos lecturas simultáneas solo publican la generación más reciente', async () => {
    const source = connection(), view = setup(source); let finish!: (value: any) => void;
    source.resolve.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    let pending!: Promise<any>; act(() => { pending = view.result.current.resolve().catch(() => null); });
    await act(async () => { await view.result.current.resolve(); finish({ version: 1, actorId: other }); expect(await pending).toBeNull(); });
    expect(view.result.current.client).not.toBeNull(); expect(source.resolve.mock.calls[0][0].signal.aborted).toBe(true);
  });
});
