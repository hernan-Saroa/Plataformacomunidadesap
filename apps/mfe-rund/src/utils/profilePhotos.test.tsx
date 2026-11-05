import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { apiClient } from '../../../shell/src/services/api';
import { photoChanged, usePublishedPhoto } from '../../../shared/profile-photos';

vi.mock('../../../shell/src/services/api',()=>({apiClient:{get:vi.fn()}}));
function Photo({person,label='foto'}:{person?:string;label?:string}) {
  const url=usePublishedPhoto(person);
  return <output aria-label={label}>{url || 'Sin foto'}</output>;
}
beforeEach(()=>{vi.clearAllMocks();vi.mocked(apiClient.get).mockResolvedValue({id:'approved',url:'aprobada'});});
afterEach(cleanup);
describe('Publicación y sincronización de avatares',()=>{
  it('varios avatares de la misma persona comparten una consulta incluso al aprobar',async()=>{
    render(<><Photo person="same" label="primera"/><Photo person="same" label="segunda"/></>);
    await waitFor(()=>expect(screen.getByLabelText('segunda').textContent).toBe('aprobada'));
    expect(apiClient.get).toHaveBeenCalledTimes(1);
    vi.mocked(apiClient.get).mockResolvedValue({id:'new',url:'nueva aprobada'});
    act(()=>photoChanged());
    await waitFor(()=>expect(screen.getByLabelText('primera').textContent).toBe('nueva aprobada'));
    expect(screen.getByLabelText('segunda').textContent).toBe('nueva aprobada');
    expect(apiClient.get).toHaveBeenCalledTimes(2);
  });
  it('una consulta anterior no sustituye la foto recién aprobada',async()=>{
    let resolveOld!: (value: unknown)=>void;
    vi.mocked(apiClient.get).mockImplementationOnce(()=>new Promise(resolve=>{resolveOld=resolve;})).mockResolvedValue({id:'new',url:'nueva aprobada'});
    render(<Photo person="person"/>);
    act(()=>photoChanged());
    await waitFor(()=>expect(screen.getByLabelText('foto').textContent).toBe('nueva aprobada'));
    await act(async()=>resolveOld({id:'old',url:'anterior'}));
    expect(screen.getByLabelText('foto').textContent).toBe('nueva aprobada');
  });
  it('el cambio de persona no muestra la foto del perfil anterior mientras carga',async()=>{
    const view=render(<Photo person="first"/>);
    await waitFor(()=>expect(screen.getByLabelText('foto').textContent).toBe('aprobada'));
    vi.mocked(apiClient.get).mockImplementationOnce(()=>new Promise(()=>{}));
    view.rerender(<Photo person="second"/>);
    expect(screen.getByLabelText('foto').textContent).toBe('Sin foto');
  });
  it('recuperar foco consulta la publicación actual aunque la caché sea reciente',async()=>{
    render(<Photo person="person"/>);
    await waitFor(()=>expect(screen.getByLabelText('foto').textContent).toBe('aprobada'));
    vi.mocked(apiClient.get).mockResolvedValue({id:'new',url:'aprobada en otro navegador'});
    act(()=>window.dispatchEvent(new Event('focus')));
    await waitFor(()=>expect(screen.getByLabelText('foto').textContent).toBe('aprobada en otro navegador'));
    expect(apiClient.get).toHaveBeenCalledTimes(2);
  });
});
