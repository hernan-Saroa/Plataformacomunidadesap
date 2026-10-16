import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('./apiClient',()=>({apiClient:{get:vi.fn(),post:vi.fn()}}));
import { RundManualIdentityClient } from './rundManualIdentityApi';
import { validateManualClose } from './rundManualIdentityClose';
describe('Cierre confirmado y liberación segura del cliente',()=>{
  const actor='abcdef00-1111-4111-8111-111111111111',id='abcdef00-2222-4222-8222-222222222222',next='abcdef00-3333-4333-8333-333333333333';
  const closed=()=>({solicitudId:id,intencionId:actor,estado:'CERRADA',estadoAuth:'CANCELADA',decisionNativa:'ABORTADA',estadoNativo:'PREPARADA',
    resolucionAuth:null,casoRevisionId:null,puedeIniciarOtra:true});
  const setup=()=>{const transport={get:vi.fn().mockResolvedValue(closed()),post:vi.fn().mockResolvedValue(closed())};
    return {transport,client:new RundManualIdentityClient(actor,sessionStorage,transport as any,vi.fn().mockReturnValueOnce(id).mockReturnValue(next))};};
  beforeEach(()=>sessionStorage.clear());
  it('POST no borra el ID; iniciar otra solicitud exige recibo cerrado por GET',async()=>{
    const s=setup();s.client.iniciar();await s.client.cerrarOperacion();expect(s.client.pendiente()).toBe(id);
    expect(s.transport.post).toHaveBeenCalledWith(expect.stringContaining('/'+id+'/cerrar'),{},expect.objectContaining({retries:0,skipAuthRefresh:true,skipErrorLog:true,skipErrorToast:true,cache:'no-store'}));
    await s.client.liberarCerrada();expect(s.client.pendiente()).toBeNull();expect(s.client.iniciar()).toBe(next);
  });
  it('sin ID no consulta, escribe o reserva una solicitud nueva',async()=>{
    const s=setup();await expect(s.client.cerrarOperacion()).rejects.toThrow();await expect(s.client.consultarCierre()).rejects.toThrow();
    expect(s.transport.get).not.toHaveBeenCalled();expect(s.transport.post).not.toHaveBeenCalled();
  });
  it.each([
    {...closed(),estado:'ABORTADA',estadoAuth:'AUTH_REGISTRADA',puedeIniciarOtra:false},
    {...closed(),estado:'REVISION_REQUERIDA',estadoAuth:'AUTH_APLICADA',resolucionAuth:'REVISION_REQUERIDA',casoRevisionId:next,puedeIniciarOtra:false},
    {...closed(),estado:'CONFIRMADA',estadoAuth:'AUTH_APLICADA',decisionNativa:'EN_CURSO',estadoNativo:'CONFIRMADA',puedeIniciarOtra:false},
  ])('recibo %j conserva ID y no permite liberar',async raw=>{
    const s=setup();s.client.iniciar();s.transport.get.mockResolvedValue(raw);expect(await s.client.consultarCierre()).toEqual(raw);
    await expect(s.client.liberarCerrada()).rejects.toThrow();expect(s.client.pendiente()).toBe(id);
  });
  it.each([
    {...closed(),puedeIniciarOtra:false},{...closed(),estado:'ABORTADA'},
    {...closed(),estadoAuth:'AUTH_APLICADA'},{...closed(),casoRevisionId:next},
    {...closed(),solicitudId:next},{...closed(),formulario:'PRIVADO'},
    {...closed(),estado:'REVISION_REQUERIDA',estadoAuth:'AUTH_APLICADA',resolucionAuth:'REVISION_REQUERIDA',casoRevisionId:null,puedeIniciarOtra:false},
  ])('DTO incoherente o privado %j nunca se acepta',raw=>{expect(()=>validateManualClose(raw,id)).toThrow();});
  it('compensación confirmada acepta cierre solo con aborto y aplicado coherentes',()=>{
    const raw={...closed(),estadoAuth:'AUTH_APLICADA',resolucionAuth:'COMPENSADA'};expect(validateManualClose(raw,id)).toEqual(raw);
    expect(()=>validateManualClose({...raw,decisionNativa:'EN_CURSO'},id)).toThrow();
  });
  it('fallo o cambio de ID durante GET conserva el pendiente',async()=>{
    const s=setup();s.client.iniciar();s.transport.get.mockRejectedValueOnce(new Error('CAIDA'));
    await expect(s.client.liberarCerrada()).rejects.toThrow();expect(s.client.pendiente()).toBe(id);
    s.transport.get.mockImplementationOnce(async()=>{sessionStorage.setItem(sessionStorage.key(0)!,next);return closed();});
    await expect(s.client.liberarCerrada()).rejects.toThrow();expect(s.client.pendiente()).toBe(next);
  });
});
