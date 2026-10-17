import { BadRequestException, ConflictException, ForbiddenException, NotFoundException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { AuthIdentityMailOmissionService } from './auth-identity-mail-omission.service';
import { nativeBusinessContext, nativeBusinessFingerprint } from '../modules/banco-docentes/rund-native-business-context';
import { identityWriteFingerprint } from './auth-identity-command';
describe('Omisión durable por rechazo de vigencia',()=>{
  const id='abcdef00-1111-4111-8111-111111111111',other='abcdef00-2222-4222-8222-222222222222';
  const actor=()=>({actorId:id,roles:['REVISOR'],expiresAt:Date.now()/1000+300});
  function setup(){
    const command={version:1,actorId:id,payload:{documentNumber:'12345',documentType:'CC',primer_nombre:'DOCENTE',primer_apellido:'FICTICIO',
      segundo_apellido:null,genero:null,fechaNacimiento:null},options:{relaxValidation:false,preserveTerritorial:false},territorial:null,
      emailFinal:'ficticio@example.test',phoneFinal:null,finalFullName:'DOCENTE FICTICIO'};
    const context=nativeBusinessContext(command,{payload:{documentNumber:'12345',periodoCarga:'2095-2'},rawPayload:{},options:{audit:{actorId:id,canalOrigen:'MODAL'}},
      territorial:null,emailFinal:command.emailFinal,phoneFinal:null,finalFullName:command.finalFullName}as any);
    const row:any={intencion_id:id,estado:'PENDIENTE',intento_id:null,contexto:context,huella_contexto:nativeBusinessFingerprint(context),
      resultado_nativo:{email:command.emailFinal,authUserCreated:true},operacion_auth_id:id,huella_comando:identityWriteFingerprint(command),elegible:true,
      omision_id:null,version:null,motivo:null,omitida_por:null,fecha_omitida:null};
    let inTransaction=false;
    const query=jest.fn(async(sql:string,args?:any[])=>{
      if(sql.startsWith('SET LOCAL'))return[];
      if(sql.startsWith('INSERT INTO rund.identidad_correo_omision')){
        Object.assign(row,{omision_id:id,version:1,motivo:args![1],omitida_por:args![2],fecha_omitida:'2026-10-16T12:00:00.123456Z'});return[{intencion_id:id}];
      }
      return[JSON.parse(JSON.stringify(row))];
    });
    const transaction=jest.fn(async work=>{const before=JSON.stringify(row);inTransaction=true;
      try{return await work({query});}catch(e){Object.assign(row,JSON.parse(before));throw e;}finally{inTransaction=false;}});
    const permissions=jest.fn(async()=>['banco-docentes.rund.manage']);
    const validation=jest.fn(async()=>{expect(inTransaction).toBe(false);return{version:1,operacionId:id,huellaComando:row.huella_comando,apta:false,motivo:'CREDENCIALES_NO_VIGENTES' as string|null};});
    return{row,query,transaction,permissions,validation,service:new AuthIdentityMailOmissionService({query,transaction}as any,{permisosRoles:permissions}as any,{validar:validation}as any)};
  }
  it.each([null,{...actor(),actorId:'no'},{...actor(),expiresAt:0},{...actor(),expiresAt:NaN}])('sesión inválida %j no lee',async a=>{
    const s=setup();await expect(s.service.omitir(id,a as any)).rejects.toBeInstanceOf(UnauthorizedException);expect(s.query).not.toHaveBeenCalled();
  });
  it('ID inválido, permiso ausente o Auth de permisos caído no escriben',async()=>{
    const s=setup();await expect(s.service.omitir('no',actor())).rejects.toBeInstanceOf(BadRequestException);
    s.permissions.mockResolvedValueOnce([]);await expect(s.service.omitir(id,actor())).rejects.toBeInstanceOf(ForbiddenException);
    s.permissions.mockRejectedValueOnce(Error());await expect(s.service.consultar(id,actor())).rejects.toBeInstanceOf(ForbiddenException);expect(s.query).not.toHaveBeenCalled();
  });
  it('consulta ausente devuelve siete campos sin crear omisión ni consultar vigencia',async()=>{
    const s=setup();expect(await s.service.consultar(id,actor())).toEqual({version:1,intencionId:id,omitida:false,motivo:null,omitidaPor:null,omitidaEn:null,envioBloqueado:false});expect(s.validation).not.toHaveBeenCalled();expect(s.transaction).not.toHaveBeenCalled();
  });
  it.each(['OPERACION_NO_ELEGIBLE','IDENTIDAD_NO_VIGENTE','CREDENCIALES_NO_VIGENTES'])('rechazo propietario %s permite decisión explícita y replay sin alterar fecha',async motivo=>{
    const s=setup();s.validation.mockResolvedValueOnce({version:1,operacionId:id,huellaComando:s.row.huella_comando,apta:false,motivo});
    const r=await s.service.omitir(id.toUpperCase(),actor());expect(r).toEqual({version:1,intencionId:id,omitida:true,motivo,omitidaPor:id,omitidaEn:'2026-10-16T12:00:00.123456Z',envioBloqueado:true});
    s.validation.mockRejectedValue(Error());expect(await s.service.omitir(id,actor())).toEqual(r);expect(s.validation).toHaveBeenCalledTimes(1);
    expect(s.query.mock.calls.filter(([sql])=>sql.startsWith('INSERT'))).toHaveLength(1);expect(s.row.estado).toBe('PENDIENTE');expect(s.row.intento_id).toBeNull();
    expect(JSON.stringify(r)).not.toMatch(/@|hash|password|contexto|comando|intento/);expect(JSON.stringify(r)).not.toContain('"12345"');
  });
  it('otro actor puede consultar pero no atribuirse la decisión',async()=>{
    const s=setup();await s.service.omitir(id,actor());expect((await s.service.consultar(id,{...actor(),actorId:other})).omitidaPor).toBe(id);
    await expect(s.service.omitir(id,{...actor(),actorId:other})).rejects.toBeInstanceOf(ConflictException);
  });
  it.each(['apta','caida','contrato'])('%s no registra omisión ni reserva',async kind=>{
    const s=setup();if(kind==='caida')s.validation.mockRejectedValueOnce(Error('PRIVADO'));
    else s.validation.mockResolvedValueOnce({version:1,operacionId:kind==='contrato'?other:id,huellaComando:s.row.huella_comando,apta:true,motivo:null});
    await expect(s.service.omitir(id,actor())).rejects.toBeInstanceOf(kind==='apta'?ConflictException:ServiceUnavailableException);expect(s.transaction).not.toHaveBeenCalled();expect(s.row.omision_id).toBeNull();
  });
  it.each(['ENVIANDO','ENVIADO','INCIERTO'])('%s no admite omitir o cancelar el intento',async state=>{
    const s=setup();s.row.estado=state;s.row.intento_id=other;await expect(s.service.omitir(id,actor())).rejects.toBeInstanceOf(ConflictException);expect(s.validation).not.toHaveBeenCalled();
  });
  it('reserva durante consulta Auth gana y no se registra omisión',async()=>{
    const s=setup();s.validation.mockImplementationOnce(async()=>{s.row.estado='ENVIANDO';s.row.intento_id=other;return{version:1,operacionId:id,huellaComando:s.row.huella_comando,apta:false,motivo:'IDENTIDAD_NO_VIGENTE'};});
    await expect(s.service.omitir(id,actor())).rejects.toBeInstanceOf(ConflictException);expect(s.row.omision_id).toBeNull();
  });
  it('revocación tras INSERT revierte la omisión y revocación tras lectura impide respuesta',async()=>{
    const s=setup(),original=s.query.getMockImplementation()!;s.query.mockImplementation(async(sql,args)=>{const rows=await original(sql,args);if(sql.startsWith('INSERT'))s.permissions.mockResolvedValue([]);return rows;});
    await expect(s.service.omitir(id,actor())).rejects.toBeInstanceOf(ForbiddenException);expect(s.row.omision_id).toBeNull();
    s.permissions.mockResolvedValueOnce(['banco-docentes.rund.manage']).mockResolvedValueOnce([]);await expect(s.service.consultar(id,actor())).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('ADMIN vencido durante INSERT revierte el recibo',async()=>{
    const s=setup(),a={...actor(),roles:['ADMIN']},time=jest.spyOn(Date,'now'),original=s.query.getMockImplementation()!;
    s.query.mockImplementation(async(sql,args)=>{const r=await original(sql,args);if(sql.startsWith('INSERT'))time.mockReturnValue((a.expiresAt+1)*1000);return r;});
    try{await expect(s.service.omitir(id,a)).rejects.toBeInstanceOf(UnauthorizedException);expect(s.row.omision_id).toBeNull();}finally{time.mockRestore();}
  });
  it.each(['contexto','huella','elegible'])('%s incoherente impide consultar Auth o escribir',async field=>{
    const s=setup();if(field==='contexto')s.row.contexto={};if(field==='huella')s.row.huella_comando='0'.repeat(64);if(field==='elegible')s.row.elegible=false;
    await expect(s.service.omitir(id,actor())).rejects.toBeInstanceOf(ServiceUnavailableException);expect(s.validation).not.toHaveBeenCalled();
  });
  it('SQL fallido o aviso ausente no expone parámetros',async()=>{
    const s=setup();s.query.mockResolvedValueOnce([]);await expect(s.service.consultar(id,actor())).rejects.toBeInstanceOf(NotFoundException);
    s.query.mockRejectedValueOnce(Error('SQL PRIVADO'));await expect(s.service.omitir(id,actor())).rejects.toThrow('No fue posible confirmar la omision');
  });
});
