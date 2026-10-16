import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('./apiClient',()=>({apiClient:{get:vi.fn(),post:vi.fn()}}));
import { RundManualIdentityClient } from './rundManualIdentityApi';

describe('Cliente de solicitud manual estable sin activar formulario',()=>{
  const actor='abcdef00-1111-4111-8111-111111111111',id='abcdef00-2222-4222-8222-222222222222',intention='abcdef00-3333-4333-8333-333333333333';
  const receipt=()=>({solicitudId:id,intencionId:intention,estado:'CONFIRMADA' as const,decisionNativa:'EN_CURSO' as const,estadoAuth:'AUTH_APLICADA' as const,
    estadoNativo:'CONFIRMADA' as const,docenteId:'DOCENTE',confirmadaEn:'2026-10-15T10:00:00.123456Z',correo:'PENDIENTE' as const});
  const prepared=()=>({solicitudId:id,intencionId:intention,preparacion:'LISTA',entradaCapturada:true,prevalidacion:{estado:'COMPATIBLE',reserva:false}});
  const setup=()=>{
    const transport={post:vi.fn().mockResolvedValue(receipt()),get:vi.fn().mockResolvedValue(receipt())},uuid=vi.fn(()=>id);
    return {transport,uuid,client:new RundManualIdentityClient(actor,sessionStorage,transport as any,uuid)};
  };
  beforeEach(()=>{sessionStorage.clear();});
  it('persiste solo UUID por actor y restaura despues de recargar sin enviar datos',()=>{
    const s=setup();expect(s.client.iniciar()).toBe(id);expect(s.client.iniciar()).toBe(id);expect(s.uuid).toHaveBeenCalledTimes(1);
    const restored=new RundManualIdentityClient(actor,sessionStorage,s.transport as any,()=>{throw new Error('No generar otro ID');});
    expect(restored.pendiente()).toBe(id);expect(sessionStorage.getItem(sessionStorage.key(0)!)).toBe(id);expect(s.transport.post).not.toHaveBeenCalled();
  });
  it('otro operador no toma el ID de la sesion anterior',()=>{
    const s=setup();s.client.iniciar();expect(new RundManualIdentityClient(intention,sessionStorage,s.transport as any).pendiente()).toBeNull();
  });
  it('storage bloqueado impide reservar y no hace HTTP',()=>{
    const storage={getItem:()=>null,setItem:()=>{throw new Error('BLOQUEADO');},removeItem:vi.fn()},s=setup();
    const client=new RundManualIdentityClient(actor,storage,s.transport as any,()=>id);
    expect(()=>client.iniciar()).toThrow('BLOQUEADO');expect(s.transport.post).not.toHaveBeenCalled();
  });
  it('preparacion conserva ID y no habilita retries, refresh o logs privados',async()=>{
    const s=setup();s.transport.post.mockResolvedValue(prepared());await s.client.preparar({DOCUMENTO_IDENTIDAD:'FICTICIO'});
    expect(s.transport.post).toHaveBeenCalledWith(expect.stringContaining('/'+id+'/preparar'),{formulario:{DOCUMENTO_IDENTIDAD:'FICTICIO'}},
      expect.objectContaining({retries:0,skipAuthRefresh:true,skipErrorLog:true,skipErrorToast:true,cache:'no-store'}));
    expect(sessionStorage.getItem(sessionStorage.key(0)!)).toBe(id);
  });
  it('timeout o 409 no genera otro UUID y permite recuperacion sin formulario',async()=>{
    const s=setup();s.transport.post.mockRejectedValueOnce(new Error('TIMEOUT')).mockResolvedValueOnce(prepared());
    await expect(s.client.preparar({nombre:'PRIVADO'})).rejects.toThrow('TIMEOUT');await s.client.reanudar();
    expect(s.uuid).toHaveBeenCalledTimes(1);expect(s.transport.post.mock.calls[1][0]).toContain('/'+id+'/reanudar-preparacion');expect(s.transport.post.mock.calls[1][1]).toEqual({});
  });
  it('ejecutar o recuperar sin reserva no genera operaciones nuevas',async()=>{
    const s=setup();expect(()=>s.client.ejecutar()).toThrow();await expect(s.client.consultarEjecucion()).rejects.toThrow();expect(s.uuid).not.toHaveBeenCalled();expect(s.transport.post).not.toHaveBeenCalled();
  });
  it('doble clic comparte una peticion y no borra reserva antes de reconocer el recibo',async()=>{
    const s=setup();s.client.iniciar();let resolve:(v:any)=>void;
    s.transport.post.mockImplementation(()=>new Promise(done=>{resolve=done;}));const first=s.client.ejecutar(),second=s.client.ejecutar();
    expect(first).toBe(second);expect(s.transport.post).toHaveBeenCalledTimes(1);expect(()=>s.client.cerrar(receipt())).toThrow();
    resolve!(receipt());expect(await first).toEqual(receipt());expect(s.client.pendiente()).toBe(id);
    s.client.cerrar(receipt());expect(s.client.pendiente()).toBeNull();
  });
  it('respuesta de ejecucion perdida mantiene ID y GET recupera el commit sin POST adicional',async()=>{
    const s=setup();s.client.iniciar();s.transport.post.mockRejectedValueOnce(new Error('PERDIDA'));
    await expect(s.client.ejecutar()).rejects.toThrow('PERDIDA');expect((await s.client.consultarEjecucion()).estado).toBe('CONFIRMADA');
    expect(s.transport.post).toHaveBeenCalledTimes(1);expect(s.client.pendiente()).toBe(id);
  });
  it.each(['solicitud','intencion','fecha','estadoAuth','decision','correo','extra','parcial'])('recibo %s incoherente no borra reserva o fabrica exito',async kind=>{
    const s=setup();s.client.iniciar();const value:any=receipt();
    if(kind==='solicitud')value.solicitudId=intention;if(kind==='intencion')value.intencionId='NO-ID';if(kind==='fecha')value.confirmadaEn='2026-02-30T10:00:00.123456Z';
    if(kind==='estadoAuth')value.estadoAuth='PREPARADA';if(kind==='decision')value.decisionNativa='ABORTADA';if(kind==='correo')value.correo='ENVIADO';
    if(kind==='extra')value.formulario={};if(kind==='parcial')delete value.docenteId;s.transport.post.mockResolvedValue(value);
    await expect(s.client.ejecutar()).rejects.toThrow();expect(s.client.pendiente()).toBe(id);
  });
  it('estado pendiente es consultable pero no permite cerrar ni afirmar ejecucion exitosa',async()=>{
    const s=setup();s.client.iniciar();const pending:any={...receipt(),estado:'PENDIENTE',estadoAuth:'PREPARADA',estadoNativo:'PREPARADA',docenteId:null,confirmadaEn:null};
    s.transport.get.mockResolvedValue(pending);s.transport.post.mockResolvedValue(pending);expect((await s.client.consultarEjecucion()).estado).toBe('PENDIENTE');
    expect(()=>s.client.cerrar(pending)).toThrow();await expect(s.client.ejecutar()).rejects.toThrow();expect(s.client.pendiente()).toBe(id);
  });
  it('prevalidacion ausente o reserva de identidad inesperada no se acepta como preparada',async()=>{
    const s=setup();s.transport.post.mockResolvedValue({...prepared(),prevalidacion:{estado:'COMPATIBLE',reserva:true}});
    await expect(s.client.preparar({nombre:'PRIVADO'})).rejects.toThrow();expect(s.client.pendiente()).toBe(id);
  });
});
