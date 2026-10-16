import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('./apiClient',()=>({apiClient:{get:vi.fn(),post:vi.fn()}}));
import { RundManualIdentityClient } from './rundManualIdentityApi';
describe('Abandono confirmado sin perder solicitudes en curso',()=>{
  const actor='abcdef00-1111-4111-8111-111111111111',id='abcdef00-2222-4222-8222-222222222222',next='abcdef00-3333-4333-8333-333333333333';
  const receipt=()=>({solicitudId:id,estado:'ABANDONADA',puedeIniciarOtra:true});
  const setup=()=>{
    const transport={get:vi.fn().mockResolvedValue(receipt()),post:vi.fn().mockResolvedValue(receipt())};
    const uuid=vi.fn().mockReturnValueOnce(id).mockReturnValue(next);
    return {transport,uuid,client:new RundManualIdentityClient(actor,sessionStorage,transport as any,uuid)};
  };
  beforeEach(()=>sessionStorage.clear());
  it('sin reserva abandonar o consultar no genera otro ID ni HTTP',async()=>{
    const s=setup();await expect(s.client.abandonar()).rejects.toThrow();await expect(s.client.consultarAbandono()).rejects.toThrow();
    expect(s.uuid).not.toHaveBeenCalled();expect(s.transport.get).not.toHaveBeenCalled();expect(s.transport.post).not.toHaveBeenCalled();
  });
  it('POST vacío conserva ID; cerrar exige GET del servidor antes de permitir otro UUID',async()=>{
    const s=setup();s.client.iniciar();await s.client.abandonar();expect(s.client.pendiente()).toBe(id);
    expect(s.transport.post).toHaveBeenCalledWith(expect.stringContaining('/'+id+'/abandonar'),{},expect.objectContaining({retries:0,skipAuthRefresh:true,skipErrorLog:true,skipErrorToast:true,cache:'no-store'}));
    await s.client.cerrarAbandonada();expect(s.transport.get).toHaveBeenCalledWith(expect.stringContaining('/'+id+'/abandono'),undefined,expect.anything());
    expect(s.client.pendiente()).toBeNull();expect(s.client.iniciar()).toBe(next);
  });
  it.each([401,403,404,409,503])('respuesta %s no borra ni cambia ID',async status=>{
    const s=setup();s.client.iniciar();s.transport.post.mockRejectedValue(Object.assign(new Error('FALLO'),{status}));
    await expect(s.client.abandonar()).rejects.toThrow();s.transport.get.mockRejectedValue(Object.assign(new Error('FALLO'),{status}));
    await expect(s.client.cerrarAbandonada()).rejects.toThrow();expect(s.client.pendiente()).toBe(id);expect(s.uuid).toHaveBeenCalledTimes(1);
  });
  it.each([{estado:'ABANDONADA'},{solicitudId:next,estado:'ABANDONADA',puedeIniciarOtra:true},
    {solicitudId:id,estado:'PENDIENTE',puedeIniciarOtra:true},{solicitudId:id,estado:'ABANDONADA',puedeIniciarOtra:false},
    {...receipt(),formulario:'PRIVADO'}])('recibo parcial o incoherente no libera ID: %j',async raw=>{
    const s=setup();s.client.iniciar();s.transport.get.mockResolvedValue(raw);
    await expect(s.client.cerrarAbandonada()).rejects.toThrow();expect(s.client.pendiente()).toBe(id);
  });
  it('si cambia el pendiente durante GET, conserva el ID nuevo',async()=>{
    const s=setup();s.client.iniciar();s.transport.get.mockImplementation(async()=>{sessionStorage.setItem(sessionStorage.key(0)!,next);return receipt();});
    await expect(s.client.cerrarAbandonada()).rejects.toThrow();expect(s.client.pendiente()).toBe(next);
  });
  it('una ejecución en vuelo impide abandonar o liberar el ID desde el cliente',async()=>{
    const s=setup();s.client.iniciar();let finish!:(value:any)=>void;
    s.transport.post.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));const executing=s.client.ejecutar();
    await expect(s.client.abandonar()).rejects.toThrow();await expect(s.client.cerrarAbandonada()).rejects.toThrow();
    expect(s.transport.post).toHaveBeenCalledTimes(1);expect(s.transport.get).not.toHaveBeenCalled();
    finish({});await expect(executing).rejects.toThrow();expect(s.client.pendiente()).toBe(id);
  });
});
