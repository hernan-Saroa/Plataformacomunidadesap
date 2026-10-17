import { BadRequestException, ConflictException, ForbiddenException, NotFoundException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { AuthIdentityMailDiagnosticService } from './auth-identity-mail-diagnostic.service';
import { nativeBusinessContext, nativeBusinessFingerprint } from '../modules/banco-docentes/rund-native-business-context';
import { identityWriteFingerprint } from './auth-identity-command';

describe('Diagnóstico operativo de correo sin efectos',()=>{
  const id='abcdef00-1111-4111-8111-111111111111',attempt='abcdef00-2222-4222-8222-222222222222',caseId='abcdef00-3333-4333-8333-333333333333';
  const actor=()=>({actorId:id,roles:['REVISOR'],expiresAt:Date.now()/1000+300});
  function setup(state='PENDIENTE'){
    const command={version:1,actorId:id,payload:{documentNumber:'12345',documentType:'CC',primer_nombre:'DOCENTE',primer_apellido:'FICTICIO',
      segundo_apellido:null,genero:null,fechaNacimiento:null},options:{relaxValidation:false,preserveTerritorial:false},territorial:null,
      emailFinal:'ficticio@example.test',phoneFinal:null,finalFullName:'DOCENTE FICTICIO'};
    const context=nativeBusinessContext(command,{payload:{documentNumber:'12345',periodoCarga:'2095-2'},rawPayload:{},
      options:{audit:{actorId:id,canalOrigen:'MODAL'}},territorial:null,emailFinal:command.emailFinal,phoneFinal:null,finalFullName:command.finalFullName}as any);
    const row:any={intencion_id:id,estado:state,intento_id:state==='PENDIENTE'?null:attempt,contexto:context,
      huella_contexto:nativeBusinessFingerprint(context),resultado_nativo:{email:command.emailFinal,authUserCreated:true},
      operacion_auth_id:id,huella_comando:identityWriteFingerprint(command),elegible:true,intento_resultado:null,resultado:null,
      caso_id:null,intento_caso:null,cierre_caso:null,intento_cierre:null};
    const query=jest.fn(async()=>[JSON.parse(JSON.stringify(row))]),permissions=jest.fn(async()=>['banco-docentes.rund.manage']);
    const validation=jest.fn(async()=>({version:1,operacionId:id,huellaComando:row.huella_comando,apta:true,motivo:null as string|null}));
    const transaction=jest.fn();
    return{row,query,permissions,validation,transaction,service:new AuthIdentityMailDiagnosticService({query,transaction}as any,{permisosRoles:permissions}as any,{validar:validation}as any)};
  }
  it.each([null,{...actor(),actorId:'no'},{...actor(),expiresAt:NaN},{...actor(),expiresAt:0}])('sesión inválida %j no lee datos',async a=>{
    const s=setup();await expect(s.service.diagnosticar(id,a as any)).rejects.toBeInstanceOf(UnauthorizedException);expect(s.query).not.toHaveBeenCalled();
  });
  it('ID inválido, permiso ausente y Auth de permisos caído no consultan correo',async()=>{
    const s=setup();await expect(s.service.diagnosticar('no',actor())).rejects.toBeInstanceOf(BadRequestException);
    s.permissions.mockResolvedValueOnce([]);await expect(s.service.diagnosticar(id,actor())).rejects.toBeInstanceOf(ForbiddenException);
    s.permissions.mockRejectedValueOnce(new Error());await expect(s.service.diagnosticar(id,actor())).rejects.toBeInstanceOf(ForbiddenException);expect(s.query).not.toHaveBeenCalled();
  });
  it('pendiente válido tiene diez campos sin datos privados ni autorización de reenvío',async()=>{
    const s=setup(),before=JSON.stringify(s.row),r=await s.service.diagnosticar(id.toUpperCase(),actor());
    expect(r).toEqual({version:1,intencionId:id,estadoCorreo:'PENDIENTE',diagnostico:'VIGENCIA_CONFIRMADA_AL_CONSULTAR',motivoVigencia:null,
      casoId:null,cierreRegistrado:false,requiereIntervencion:false,siguientePaso:'VALIDAR_AL_ENVIAR',permiteReenvio:false});
    expect(JSON.stringify(r)).not.toMatch(/@|12345|hash|password|comando|contexto|intento/);expect(JSON.stringify(s.row)).toBe(before);
    expect(s.query).toHaveBeenCalledTimes(2);expect(s.transaction).not.toHaveBeenCalled();
  });
  it.each(['OPERACION_NO_ELEGIBLE','IDENTIDAD_NO_VIGENTE','CREDENCIALES_NO_VIGENTES'])('rechazo explícito %s no equivale a caída',async motivo=>{
    const s=setup();s.validation.mockResolvedValueOnce({version:1,operacionId:id,huellaComando:s.row.huella_comando,apta:false,motivo});
    expect(await s.service.diagnosticar(id,actor())).toMatchObject({diagnostico:'VIGENCIA_RECHAZADA',motivoVigencia:motivo,siguientePaso:'REVISAR_VIGENCIA',permiteReenvio:false});
  });
  it('caída de vigencia no inventa rechazo ni aceptación',async()=>{
    const s=setup();s.validation.mockRejectedValueOnce(new Error('PRIVADO'));
    expect(await s.service.diagnosticar(id,actor())).toMatchObject({diagnostico:'VIGENCIA_NO_CONFIRMADA',motivoVigencia:null,siguientePaso:'RESTABLECER_CONSULTA_AUTH'});
  });
  it.each([
    ['ENVIANDO',null,'SIN_RESULTADO_OBSERVADO','REGISTRAR_REVISION'],
    ['ENVIANDO','ACEPTADO','ACEPTACION_PENDIENTE_CONCILIAR','CONCILIAR_RESULTADO'],
    ['ENVIANDO','INCIERTO','INCERTIDUMBRE_PENDIENTE_CONCILIAR','CONCILIAR_RESULTADO'],
    ['INCIERTO',null,'RESULTADO_INCIERTO','REGISTRAR_REVISION'],
    ['INCIERTO','INCIERTO','RESULTADO_INCIERTO','REVISION_OPERATIVA'],
    ['ENVIADO',null,'ENVIADO_SIN_RESULTADO_REGISTRADO','REVISAR_HISTORICO'],
    ['ENVIADO','ACEPTADO','ACEPTACION_REGISTRADA','NINGUNO'],
  ])('%s / %s: usa evidencia local y no consulta vigencia',async(state,result,diagnosis,next)=>{
    const s=setup(state!);s.row.resultado=result;s.row.intento_resultado=result?attempt:null;
    const before=JSON.stringify(s.row);expect(await s.service.diagnosticar(id,actor())).toMatchObject({diagnostico:diagnosis,siguientePaso:next,permiteReenvio:false});
    expect(s.validation).not.toHaveBeenCalled();expect(s.transaction).not.toHaveBeenCalled();expect(JSON.stringify(s.row)).toBe(before);
  });
  it('caso abierto, aceptado y cerrado conservan su historia sin mutaciones',async()=>{
    const s=setup('ENVIANDO');Object.assign(s.row,{caso_id:caseId,intento_caso:attempt});
    expect((await s.service.diagnosticar(id,actor())).siguientePaso).toBe('CONTINUAR_REVISION');
    Object.assign(s.row,{estado:'ENVIADO',resultado:'ACEPTADO',intento_resultado:attempt});
    expect((await s.service.diagnosticar(id,actor())).siguientePaso).toBe('CERRAR_REVISION');
    Object.assign(s.row,{cierre_caso:caseId,intento_cierre:attempt});
    expect(await s.service.diagnosticar(id,actor())).toMatchObject({cierreRegistrado:true,siguientePaso:'NINGUNO'});
  });
  it('reserva durante Auth exige nueva consulta y no devuelve vigencia anterior',async()=>{
    const s=setup();s.validation.mockImplementationOnce(async()=>{s.row.estado='ENVIANDO';s.row.intento_id=attempt;return{version:1,operacionId:id,huellaComando:s.row.huella_comando,apta:true,motivo:null};});
    await expect(s.service.diagnosticar(id,actor())).rejects.toBeInstanceOf(ConflictException);
  });
  it('revocación durante Auth y expiración ADMIN impiden entregar el diagnóstico',async()=>{
    const s=setup();s.validation.mockImplementationOnce(async()=>{s.permissions.mockResolvedValue([]);return{version:1,operacionId:id,huellaComando:s.row.huella_comando,apta:true,motivo:null};});
    await expect(s.service.diagnosticar(id,actor())).rejects.toBeInstanceOf(ForbiddenException);
    const other=setup(),a={...actor(),roles:['ADMIN']},time=jest.spyOn(Date,'now');
    other.validation.mockImplementationOnce(async()=>{time.mockReturnValue((a.expiresAt+1)*1000);return{version:1,operacionId:id,huellaComando:other.row.huella_comando,apta:true,motivo:null};});
    try{await expect(other.service.diagnosticar(id,a)).rejects.toBeInstanceOf(UnauthorizedException);}finally{time.mockRestore();}
  });
  it.each(['intento','resultado','caso','cierre','contexto','huella','elegible','cuenta'])('datos incoherentes %s fallan sin detalles privados',async kind=>{
    const s=setup();if(kind==='intento')s.row.intento_id=attempt;if(kind==='resultado')s.row.resultado='ACEPTADO';
    if(kind==='caso')s.row.caso_id=caseId;if(kind==='cierre')s.row.cierre_caso=caseId;
    if(kind==='contexto')s.row.contexto={};if(kind==='huella')s.row.huella_comando='0'.repeat(64);
    if(kind==='elegible')s.row.elegible=false;if(kind==='cuenta')s.row.resultado_nativo.authUserCreated=false;
    await expect(s.service.diagnosticar(id,actor())).rejects.toBeInstanceOf(ServiceUnavailableException);expect(s.validation).not.toHaveBeenCalled();
  });
  it.each(['operacion','huella','motivo'])('contrato de vigencia incoherente %s falla',async kind=>{
    const s=setup();s.validation.mockResolvedValueOnce({version:1,operacionId:kind==='operacion'?caseId:id,huellaComando:kind==='huella'?'0'.repeat(64):s.row.huella_comando,apta:true,motivo:kind==='motivo'?'INCORRECTO':null});
    await expect(s.service.diagnosticar(id,actor())).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
  it('ausencia y SQL fallido conservan errores seguros',async()=>{
    const s=setup();s.query.mockResolvedValueOnce([]);await expect(s.service.diagnosticar(id,actor())).rejects.toBeInstanceOf(NotFoundException);
    s.query.mockRejectedValueOnce(new Error('SQL PRIVADO'));await expect(s.service.diagnosticar(id,actor())).rejects.toThrow('No fue posible confirmar el diagnostico');
  });
});
