import { BadRequestException, ConflictException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { RundIdentityCompensationController, RundIdentityCompensationService } from './rund-identity-compensation.controller';
import { identityImage, lockIdentityEffects, restoreIdentityEffects, validIdentityImage } from './rund-identity-effects';
import { RundIdentityGuard } from './rund-identity.controller';
jest.mock('./rund-identity-effects',()=>({...jest.requireActual('./rund-identity-effects'),identityImage:jest.fn(),lockIdentityEffects:jest.fn(),restoreIdentityEffects:jest.fn()}));

describe('Compensacion Auth: restauracion protegida y recibo terminal',()=>{
  const id='abcdef00-1111-4111-8111-111111111111',intention='abcdef00-2222-4222-8222-222222222222';
  const person='abcdef00-3333-4333-8333-333333333333',user='abcdef00-4444-4444-8444-444444444444',role='abcdef00-5555-4555-8555-555555555555',hash='a'.repeat(64);
  const image=()=>({version:1,persona:{id:person,revision:'111',datos:{tip_identificacion:'CC',nom_largo:'ANTERIOR',nom_tercero:'ANA',pri_apellido:'PRUEBA',seg_apellido:null,
    gen_tercero:'F',fec_nacimiento:null,dir_email:'anterior@example.test',tel_celular:null,id_seccional:'9007199254740993',fec_modificacion:'2026-10-15'}},
    usuarios:[{id:user,revision:'112',datos:{username:'anterior@example.test',updated_at:null}}],roles:[{usuarioId:user,rolId:role,revision:'113',datos:{is_active:false,created_at:null,updated_at:null}}]});
  const body=()=>({intencionId:intention,huellaComando:hash});
  const setup=()=>{
    const before=image(),after=image();after.persona.revision='200';after.persona.datos.nom_largo='NUEVO';after.persona.datos.dir_email='nuevo@example.test';
    after.usuarios[0].revision='200';after.usuarios[0].datos.username='nuevo@example.test';after.roles[0].revision='200';after.roles[0].datos.is_active=true;
    const state:any={before,after,current:after,effect:{version:1,huella_comando:hash,persona_id:person,usuario_id:user,orden:'1',preimagen:before,postimagen:after},
      op:{operacion_id:id,estado:'APLICADA',huella_comando:hash,resultado:{personaId:person,usuarioId:user,usuarioCreado:false}},resolution:null,later:false,conflict:false,inTransaction:false,enabled:true};
    const query=jest.fn(async(sql:string,params:any[]=[])=>{
      if(sql.includes('SELECT * FROM auth.rund_identidad_operacion'))return state.op?[state.op]:[];
      if(sql.includes('SELECT * FROM auth.rund_identidad_compensacion'))return state.resolution?[state.resolution]:[];
      if(sql.includes('SELECT * FROM auth.rund_identidad_efecto'))return state.effect?[state.effect]:[];
      if(sql.includes('orden>$2'))return state.later?[{}]:[];
      if(sql.includes('claims WHERE'))return state.conflict?[{}]:[];
      if(sql.includes('INSERT INTO auth.rund_identidad_compensacion')) {state.resolution={operacion_id:params[0],intencion_id:params[1],huella_comando:params[2],estado:params[3],motivo:params[4],resuelta_en:'2026-10-15T10:00:00Z'};return [state.resolution];}
      return [];
    });
    const transaction=jest.fn(async fn=>{state.inTransaction=true;try{return await fn({query});}finally{state.inTransaction=false;}});
    const proof=jest.fn(async()=>{expect(state.inTransaction).toBe(false);return {version:1,intencionId:intention,operacionAuthId:id,huellaComando:hash,
      huellaContexto:'b'.repeat(64),decisionNativa:'ABORTADA',estadoNativo:'PREPARADA',abortadaEn:'2026-10-15T09:00:00Z',motivoAborto:'FALLO_NEGOCIO'};});
    (identityImage as jest.Mock).mockImplementation(async()=>state.current);
    (restoreIdentityEffects as jest.Mock).mockImplementation(async()=>{state.current=before;});
    return {state,query,transaction,proof,service:new RundIdentityCompensationService({query,transaction} as any,{get:()=>state.enabled} as any,{consultar:proof} as any)};
  };
  beforeEach(()=>jest.clearAllMocks());
  it.each([false,undefined,'false','1'])('bandera %s no abre SQL o HTTP',async enabled=>{
    const s=setup();s.state.enabled=enabled;await expect(s.service.compensar(id,body())).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(s.service.consultar(id)).rejects.toBeInstanceOf(ServiceUnavailableException);expect(s.query).not.toHaveBeenCalled();expect(s.proof).not.toHaveBeenCalled();
  });
  it.each([{},null,{...body(),pruebaAborto:{}},{...body(),huellaComando:'no'},{...body(),intencionId:'cedula'}])('body %j no puede aportar una prueba o cambiar el contrato',async value=>{
    const s=setup();await expect(s.service.compensar(id,value)).rejects.toBeInstanceOf(BadRequestException);expect(s.query).not.toHaveBeenCalled();
  });
  it.each(['REGISTRADA','CANCELADA','otra-huella','ausente'])('estado %s no puede compensarse',async value=>{
    const s=setup();if(value==='ausente')s.state.op=null;else if(value==='otra-huella')s.state.op.huella_comando='b'.repeat(64);else s.state.op.estado=value;
    await expect(s.service.compensar(id,body())).rejects.toBeInstanceOf(value==='ausente'?NotFoundException:ConflictException);expect(s.proof).not.toHaveBeenCalled();
  });
  it('sin prueba RUND valida no abre transaccion ni restaura datos',async()=>{
    const s=setup();s.proof.mockRejectedValue(new ServiceUnavailableException());await expect(s.service.compensar(id,body())).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(s.transaction).not.toHaveBeenCalled();expect(restoreIdentityEffects).not.toHaveBeenCalled();
  });
  it('restaura y guarda recibo con el mismo manager; HTTP termina antes de los bloqueos',async()=>{
    const s=setup(),result=await s.service.compensar(id.toUpperCase(),body());expect(result.resolucion.estado).toBe('COMPENSADA');expect(result.resolucion.identidadRevertida).toBe(true);
    expect(s.proof).toHaveBeenCalledWith(intention,id,hash);expect(lockIdentityEffects).toHaveBeenCalled();expect(restoreIdentityEffects).toHaveBeenCalledTimes(1);
    expect(s.transaction).toHaveBeenCalledTimes(1);expect(JSON.stringify(result)).not.toMatch(/preimagen|postimagen|password|username/);
  });
  it.each(['SIN_PREIMAGEN','PREIMAGEN_INCOMPATIBLE','ALTA_IDENTIDAD','CAMBIOS_POSTERIORES','OTRA_OPERACION_POSTERIOR','CORREO_REUTILIZADO'])('guarda %s sin tocar identidad',async reason=>{
    const s=setup();
    if(reason==='SIN_PREIMAGEN')s.state.effect=null;
    if(reason==='PREIMAGEN_INCOMPATIBLE')s.state.effect.preimagen={version:9};
    if(reason==='ALTA_IDENTIDAD')s.state.op.resultado.usuarioCreado=true;
    if(reason==='CAMBIOS_POSTERIORES')s.state.current={...s.state.after,persona:{...s.state.after.persona,revision:'201'}};
    if(reason==='OTRA_OPERACION_POSTERIOR')s.state.later=true;
    if(reason==='CORREO_REUTILIZADO')s.state.conflict=true;
    const result=await s.service.compensar(id,body());expect(result.resolucion).toMatchObject({estado:'REVISION_REQUERIDA',motivo:reason,identidadRevertida:false});
    expect(restoreIdentityEffects).not.toHaveBeenCalled();
  });
  it('recibo final se recupera sin HTTP ni segunda restauracion; otra intencion no lo reutiliza',async()=>{
    const s=setup(),result=await s.service.compensar(id,body());s.proof.mockClear();
    expect(await s.service.compensar(id,body())).toEqual(result);expect(s.proof).not.toHaveBeenCalled();expect(restoreIdentityEffects).toHaveBeenCalledTimes(1);
    await expect(s.service.compensar(id,{...body(),intencionId:user})).rejects.toBeInstanceOf(ConflictException);
    expect((await s.service.consultar(id)).resolucion).toEqual(result.resolucion);
  });
  it('fallo de restauracion no se transforma en exito',async()=>{
    const s=setup();(restoreIdentityEffects as jest.Mock).mockRejectedValueOnce(new Error('fallo restauracion'));
    await expect(s.service.compensar(id,body())).rejects.toThrow('fallo restauracion');expect(s.state.resolution).toBeNull();
  });
  it('postcondicion incompleta impide guardar un recibo compensado',async()=>{
    const s=setup();(restoreIdentityEffects as jest.Mock).mockResolvedValueOnce(undefined);
    await expect(s.service.compensar(id,body())).rejects.toThrow('restauracion completa');expect(s.state.resolution).toBeNull();
  });
  it('imagenes rechazan secretos, columnas adicionales, versiones e IDs incompatibles',()=>{
    const good=image();expect(validIdentityImage(good)).toBe(true);
    for(const changed of [{...good,version:2},{...good,password_hash:'no'},{...good,persona:{...good.persona,revision:null}},
      {...good,persona:{...good.persona,datos:{...good.persona.datos,password_hash:'no'}}},
      {...good,usuarios:[...good.usuarios,...good.usuarios]},{...good,roles:[{...good.roles[0],usuarioId:id}]}])expect(validIdentityImage(changed)).toBe(false);
  });
  it('controlador usa guard de servicio, omite solo JWT y evita cache',()=>{
    expect(Reflect.getMetadata('isPublic',RundIdentityCompensationController)).toBe(true);
    expect(Reflect.getMetadata('__guards__',RundIdentityCompensationController)).toEqual([RundIdentityGuard]);
    for(const method of ['consultar','compensar'])expect(Reflect.getMetadata('__headers__',RundIdentityCompensationController.prototype[method])).toContainEqual({name:'Cache-Control',value:'private, no-store'});
  });
});
