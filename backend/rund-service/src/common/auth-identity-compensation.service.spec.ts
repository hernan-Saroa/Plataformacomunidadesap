import { BadRequestException, ConflictException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { AuthIdentityCompensationService } from './auth-identity-compensation.service';
import { AuthIdentityExecutionService } from './auth-identity-execution.service';

describe('RUND conserva la resolucion propietaria separada del recibo aplicado',()=>{
  const id='abcdef00-1111-4111-8111-111111111111',op='abcdef00-2222-4222-8222-222222222222',hash='a'.repeat(64);
  const receipt=()=>({version:1,operacionId:op,intencionId:id,huellaComando:hash,estado:'COMPENSADA',motivo:null,resueltaEn:'2026-10-15T10:00:00.000Z',identidadRevertida:true});
  const setup=()=>{
    const row:any={intencion_id:id,operacion_auth_id:op,huella_comando:hash,huella_contexto:'b'.repeat(64),decision:'ABORTADA',
      estado_nativo:'PREPARADA',estado_auth:'AUTH_APLICADA',recibo_auth:null,registrada_en:null};
    let inTx=false;
    const query=jest.fn().mockImplementation(async()=>[row]);
    const tx=jest.fn(async(sql:string,params:any[]=[])=>{
      if(sql.includes('FROM rund.identidad_operacion'))return [{estado:row.estado_auth,operacion_auth_id:op,huella_comando:hash}];
      if(sql.includes('FROM rund.identidad_contexto_nativo'))return [{estado:row.estado_nativo,huella_contexto:row.huella_contexto}];
      if(sql.includes('FROM rund.identidad_ejecucion'))return [{decision:row.decision,huella_contexto:row.huella_contexto}];
      if(sql.includes('FROM rund.identidad_resolucion_auth'))return row.recibo_auth?[{recibo_igual:JSON.stringify(row.recibo_auth)===params[1]}]:[];
      if(sql.includes('INSERT INTO rund.identidad_resolucion_auth')){row.recibo_auth=JSON.parse(params[6]);row.registrada_en='2026-10-15T10:01:00Z';return [{intencion_id:id}];}
      return [];
    });
    const transaction=jest.fn(async fn=>{inTx=true;try{return await fn({query:tx});}finally{inTx=false;}});
    const auth={consultar:jest.fn(async()=>{expect(inTx).toBe(false);return null;}),compensar:jest.fn(async()=>{expect(inTx).toBe(false);return receipt();})};
    return {row,query,tx,transaction,auth,service:new AuthIdentityCompensationService({query,transaction} as any,auth as any)};
  };
  it.each(['',null,'documento'])('ID %s falla antes de SQL/HTTP',async value=>{
    const s=setup();await expect(s.service.resolver(value as any)).rejects.toBeInstanceOf(BadRequestException);expect(s.query).not.toHaveBeenCalled();
  });
  it('una intencion ausente no se crea ni solicita compensacion',async()=>{
    const s=setup();s.query.mockResolvedValue([]);await expect(s.service.resolver(id)).rejects.toBeInstanceOf(NotFoundException);expect(s.auth.consultar).not.toHaveBeenCalled();
  });
  it.each([{decision:'EN_CURSO'},{estado_nativo:'CONFIRMADA'},{estado_auth:'AUTH_REGISTRADA'},{estado_auth:'CANCELADA'}])('precondicion %j impide HTTP',async change=>{
    const s=setup();Object.assign(s.row,change);await expect(s.service.resolver(id)).rejects.toBeInstanceOf(ConflictException);expect(s.auth.consultar).not.toHaveBeenCalled();
  });
  it('reconciliar ausencia es GET exclusivamente, sin transaccion o POST',async()=>{
    const s=setup(),result=await s.service.reconciliar(id);expect(result.consultaAuth).toBe('NO_ENCONTRADA');expect(result.coordinacion.reciboResolucion).toBeNull();
    expect(s.auth.compensar).not.toHaveBeenCalled();expect(s.transaction).not.toHaveBeenCalled();
  });
  it('resolver consulta primero y persiste recibo minimo con ID/huellas; HTTP fuera de transaccion',async()=>{
    const s=setup(),result=await s.service.resolver(id.toUpperCase());expect(result.reciboResolucion).toEqual(receipt());expect(result.estadoAuth).toBe('AUTH_APLICADA');
    expect(s.auth.compensar).toHaveBeenCalledWith(op,id,hash);expect(s.tx.mock.calls.filter(call=>call[0].includes('FOR UPDATE'))).toHaveLength(3);
    expect(s.tx.mock.calls.every(call=>!/(?:UPDATE|DELETE FROM) auth\.|UPDATE rund\./i.test(call[0]))).toBe(true);
  });
  it('recupera recibo remoto por GET sin repetir POST',async()=>{
    const s=setup();s.auth.consultar.mockResolvedValue(receipt() as any);
    expect((await s.service.reconciliar(id)).coordinacion.reciboResolucion).toEqual(receipt());expect(s.auth.compensar).not.toHaveBeenCalled();
  });
  it('recibo local terminal se recupera sin HTTP o escritura',async()=>{
    const s=setup();s.row.recibo_auth=receipt();const result=await s.service.resolver(id);expect(result.reciboResolucion).toEqual(receipt());
    expect(s.auth.consultar).not.toHaveBeenCalled();expect(s.auth.compensar).not.toHaveBeenCalled();expect(s.transaction).not.toHaveBeenCalled();
  });
  it('control denegado después del GET impide solicitar compensación',async()=>{
    const s=setup(),control=jest.fn(async()=>{throw new Error('DENEGADO');});
    await expect(s.service.resolverConControles(id,control)).rejects.toThrow('DENEGADO');
    expect(s.auth.consultar).toHaveBeenCalledTimes(1);expect(s.auth.compensar).not.toHaveBeenCalled();expect(s.transaction).not.toHaveBeenCalled();
  });
  it('respuesta GET de ausencia obsoleta no elimina el recibo confirmado por otra solicitud',async()=>{
    const s=setup();s.auth.consultar.mockImplementation(async()=>{s.row.recibo_auth=receipt();return null;});
    expect((await s.service.reconciliar(id)).consultaAuth).toBe('CONFIRMADA');expect(s.auth.compensar).not.toHaveBeenCalled();
  });
  it('503 o 409 no fabrican una resolucion ni reintentan',async()=>{
    const s=setup();s.auth.consultar.mockRejectedValueOnce(new ServiceUnavailableException());await expect(s.service.resolver(id)).rejects.toBeInstanceOf(ServiceUnavailableException);
    s.auth.compensar.mockRejectedValueOnce(new ConflictException());await expect(s.service.resolver(id)).rejects.toBeInstanceOf(ConflictException);
    expect(s.row.recibo_auth).toBeNull();expect(s.transaction).not.toHaveBeenCalled();
  });
  it('recibo ajeno o con campos sensibles no llega al INSERT local',async()=>{
    const s=setup();s.auth.compensar.mockResolvedValueOnce({...receipt(),intencionId:op} as any);
    await expect(s.service.resolver(id)).rejects.toBeInstanceOf(ConflictException);
    s.auth.compensar.mockResolvedValueOnce({...receipt(),preimagen:{}} as any);await expect(s.service.resolver(id)).rejects.toBeInstanceOf(ConflictException);
    expect(s.tx.mock.calls.some(call=>call[0].includes('INSERT'))).toBe(false);
  });
  it('fallo al guardar no devuelve un cierre local',async()=>{
    const s=setup(),original=s.tx.getMockImplementation();s.tx.mockImplementation(async(sql,params)=>{
      if(sql.includes('INSERT'))throw new Error('FALLO FICTICIO RECIBO');return original(sql,params);
    });
    await expect(s.service.resolver(id)).rejects.toThrow('FALLO FICTICIO RECIBO');expect(s.row.recibo_auth).toBeNull();
  });
  it.each(['COMPENSADA','REVISION_REQUERIDA'])('estado de ejecucion distingue %s sin reescribir hecho aplicado',async state=>{
    const s=setup(),resolution={...receipt(),estado:state,motivo:state==='COMPENSADA'?null:'ALTA_IDENTIDAD',identidadRevertida:state==='COMPENSADA'};
    s.query.mockResolvedValue([{...s.row,preparada_en:new Date(),abortada_en:new Date(),motivo_aborto:'FALLO_NEGOCIO',resolucion_auth:resolution}]);
    const execution=new AuthIdentityExecutionService({query:s.query} as any,{} as any,{} as any,{} as any),status=await execution.consultar(id);
    expect(status.estadoAuth).toBe('AUTH_APLICADA');expect(status.resolucionAuth).toEqual(resolution);
    expect(status.resolucionAuthPendiente).toBe(state!=='COMPENSADA');expect(status.revisionAuthRequerida).toBe(state==='REVISION_REQUERIDA');
  });
});
