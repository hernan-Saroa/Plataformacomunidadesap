import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('./apiClient',()=>({apiClient:{get:vi.fn(),post:vi.fn()}}));
import { RundManualIdentityClient } from './rundManualIdentityApi';
import { MANUAL_CAPTURE_LABELS, validateManualCapture } from './rundManualIdentityCapture';

describe('Lectura de captura manual con contrato limitado',()=>{
  const actor='abcdef00-1111-4111-8111-111111111111',id='abcdef00-2222-4222-8222-222222222222';
  const capture=()=>({version:1,solicitudId:id,intencionId:actor,
    campos:Object.fromEntries(Object.keys(MANUAL_CAPTURE_LABELS).map(key=>[key,null])) as Record<string,any>,
    proteccionDatos:{accesoCompleto:true,camposEnmascarados:[] as string[]}});
  const setup=()=>{
    const transport={get:vi.fn().mockResolvedValue(capture()),post:vi.fn()},uuid=vi.fn(()=>id);
    return {transport,uuid,client:new RundManualIdentityClient(actor,sessionStorage,transport as any,uuid)};
  };
  beforeEach(()=>sessionStorage.clear());
  it('sin reserva no genera UUID ni hace HTTP; con reserva usa GET no-store sin reintentos o logs',async()=>{
    const s=setup();await expect(s.client.revisarCaptura()).rejects.toThrow();expect(s.uuid).not.toHaveBeenCalled();expect(s.transport.get).not.toHaveBeenCalled();
    s.client.iniciar();await s.client.revisarCaptura();
    expect(s.transport.get).toHaveBeenCalledWith(expect.stringContaining('/'+id+'/captura'),undefined,
      expect.objectContaining({retries:0,skipAuthRefresh:true,skipErrorLog:true,skipErrorToast:true,cache:'no-store'}));
    expect(s.transport.post).not.toHaveBeenCalled();expect(s.client.pendiente()).toBe(id);expect(sessionStorage.length).toBe(1);
  });
  it.each(['actorId','rawPayload','comandoAuth','options'])('rechaza campo privado %s aunque el resto del DTO sea válido',key=>{
    const raw=capture();expect(()=>validateManualCapture({...raw,[key]:'PRIVADO'},id)).toThrow();
    raw.campos[key]='PRIVADO';expect(()=>validateManualCapture(raw,id)).toThrow();
  });
  it.each([['objeto',{privado:true}],['array',['privado']],['no finito',NaN],['nulo embebido','dato\0privado']])('rechaza valor %s en un campo visible',(_name,value)=>{
    const raw=capture();raw.campos.pregrado=value;expect(()=>validateManualCapture(raw,id)).toThrow();
  });
  it('rechaza otra solicitud, captura parcial o versión incompatible',()=>{
    const raw=capture();expect(()=>validateManualCapture({...raw,solicitudId:actor},id)).toThrow();
    expect(()=>validateManualCapture({...raw,version:2},id)).toThrow();delete raw.campos.documentType;expect(()=>validateManualCapture(raw,id)).toThrow();
  });
  it('solo acepta restricción si el documento está protegido y el salario está ausente',()=>{
    const raw=capture();raw.proteccionDatos={accesoCompleto:false,camposEnmascarados:['documentNumber','puntajeSalarial']};
    raw.campos.documentNumber='******4050';expect(validateManualCapture(raw,id)).toBe(raw);
    raw.campos.documentNumber='1020304050';expect(()=>validateManualCapture(raw,id)).toThrow();
    raw.campos.documentNumber='******4050';raw.campos.puntajeSalarial=100;expect(()=>validateManualCapture(raw,id)).toThrow();
  });
  it('fallo de sesión o DTO no borra ni reemplaza el ID del pendiente',async()=>{
    const s=setup();s.client.iniciar();s.transport.get.mockRejectedValueOnce(Object.assign(new Error('VENCIDA'),{status:401}));
    await expect(s.client.revisarCaptura()).rejects.toThrow();s.transport.get.mockResolvedValueOnce({version:1});
    await expect(s.client.revisarCaptura()).rejects.toThrow();expect(s.uuid).toHaveBeenCalledTimes(1);expect(s.client.pendiente()).toBe(id);
  });
});
