import { BadRequestException, ConflictException, ForbiddenException, NotFoundException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { AuthIdentityMailReviewCloseService } from './auth-identity-mail-review-close.service';
describe('Cierre auditable de revisión de correo con aceptación registrada',()=>{
  const id='abcdef00-1111-4111-8111-111111111111',caseId='abcdef00-2222-4222-8222-222222222222';
  const attempt='abcdef00-3333-4333-8333-333333333333',other='abcdef00-4444-4444-8444-444444444444';
  const actor=()=>({actorId:id,roles:['REVISOR'],expiresAt:Date.now()/1000+300});
  function setup(){
    const data:any={review:{caso_id:caseId,intencion_id:id,intento_id:attempt,estado:'PENDIENTE',asumida_por:null},
      mail:{intencion_id:id,intento_id:attempt,estado:'ENVIADO'},event:{intento_id:attempt,resultado:'ACEPTADO'},closure:null};
    const query=jest.fn(async(sql:string,args?:any[])=>{
      if(sql.startsWith('SET LOCAL'))return [];
      if(sql.startsWith('SELECT intencion_id FROM'))return data.review?[{intencion_id:id}]:[];
      if(sql.startsWith('SELECT * FROM rund.identidad_correo WHERE'))return [data.mail];
      if(sql.startsWith('SELECT * FROM rund.identidad_correo_revision WHERE'))return data.review?[data.review]:[];
      if(sql.startsWith('SELECT cerrada_por FROM'))return data.closure?[{cerrada_por:data.closure.cerrada_por}]:[];
      if(sql.startsWith('SELECT intento_id,resultado FROM'))return data.event?[data.event]:[];
      if(sql.startsWith('INSERT INTO rund.identidad_correo_revision_cierre')){
        data.closure={caso_id:caseId,intencion_id:id,intento_id:attempt,cerrada_por:args![3],motivo:'ACEPTACION_REGISTRADA',fecha_cerrada:'2026-10-16T12:00:00.123456Z'};
        return[{caso_id:caseId}];
      }
      if(sql.startsWith('SELECT c.caso_id'))return data.review?[{...data.review,estado_correo:data.mail.estado,intento_actual:data.mail.intento_id,
        intento_resultado:data.event?.intento_id??null,resultado:data.event?.resultado??null,cierre_caso:data.closure?.caso_id??null,
        cierre_intencion:data.closure?.intencion_id??null,cierre_intento:data.closure?.intento_id??null,
        cerrada_por:data.closure?.cerrada_por??null,motivo:data.closure?.motivo??null,fecha_cerrada:data.closure?.fecha_cerrada??null}]:[];
      throw Error('SQL inesperado');
    });
    const transaction=jest.fn(async work=>{const before=JSON.stringify(data);try{return await work({query});}catch(e){Object.assign(data,JSON.parse(before));throw e;}});
    const permissions=jest.fn(async()=>['banco-docentes.rund.manage']);
    return {data,query,transaction,permissions,service:new AuthIdentityMailReviewCloseService({query,transaction}as any,{permisosRoles:permissions}as any)};
  }
  it.each([null,{...actor(),actorId:42},{...actor(),actorId:'no'},{...actor(),expiresAt:0},{...actor(),expiresAt:NaN}])('sesión inválida %j no consulta SQL',async a=>{
    const s=setup();await expect(s.service.cerrar(caseId,a as any)).rejects.toBeInstanceOf(UnauthorizedException);expect(s.query).not.toHaveBeenCalled();
  });
  it('ID inválido, permiso ausente o Auth caído no escriben',async()=>{
    const s=setup();await expect(s.service.cerrar('no',actor())).rejects.toBeInstanceOf(BadRequestException);
    s.permissions.mockResolvedValueOnce([]);await expect(s.service.cerrar(caseId,actor())).rejects.toBeInstanceOf(ForbiddenException);
    s.permissions.mockRejectedValueOnce(new Error('PRIVADO'));await expect(s.service.consultar(caseId,actor())).rejects.toBeInstanceOf(ForbiddenException);expect(s.query).not.toHaveBeenCalled();
  });
  it('consulta sin cierre devuelve siete campos sin fabricar un recibo',async()=>{
    const s=setup();expect(await s.service.consultar(caseId,actor())).toEqual({version:1,casoId:caseId,intencionId:id,cerrada:false,cerradaPor:null,cerradaEn:null,motivo:null});expect(s.transaction).not.toHaveBeenCalled();
  });
  it('cierre idempotente mantiene caso, correo y resultado intactos, sin repetir inserción',async()=>{
    const s=setup(),before=JSON.stringify([s.data.review,s.data.mail,s.data.event]);
    const first=await s.service.cerrar(caseId.toUpperCase(),actor());expect(first).toEqual({version:1,casoId:caseId,intencionId:id,cerrada:true,cerradaPor:id,cerradaEn:'2026-10-16T12:00:00.123456Z',motivo:'ACEPTACION_REGISTRADA'});
    expect(await s.service.cerrar(caseId,actor())).toEqual(first);expect(s.query.mock.calls.filter(([sql])=>sql.startsWith('INSERT'))).toHaveLength(1);
    expect(JSON.stringify([s.data.review,s.data.mail,s.data.event])).toBe(before);expect(JSON.stringify(first)).not.toMatch(/intento|password|contexto|document|@/);
  });
  it.each(['INCIERTO','en-vuelo','sin-proyeccion','otro-intento','historico'])('no cierra %s ni escribe evidencia artificial',async kind=>{
    const s=setup();if(kind==='historico')s.data.event=null;
    if(kind==='INCIERTO'){s.data.event.resultado='INCIERTO';s.data.mail.estado='INCIERTO';}
    if(kind==='en-vuelo'){s.data.mail.estado='ENVIANDO';s.data.event=null;}
    if(kind==='sin-proyeccion')s.data.mail.estado='ENVIANDO';if(kind==='otro-intento')s.data.event.intento_id=other;
    await expect(s.service.cerrar(caseId,actor())).rejects.toBeInstanceOf(ConflictException);expect(s.data.closure).toBeNull();
  });
  it('solo el responsable asignado cierra; ADMIN no sustituye una asignación',async()=>{
    const s=setup();s.data.review.estado='EN_REVISION';s.data.review.asumida_por=other;
    await expect(s.service.cerrar(caseId,{...actor(),roles:['ADMIN']})).rejects.toBeInstanceOf(ConflictException);
    expect((await s.service.cerrar(caseId,{...actor(),actorId:other})).cerradaPor).toBe(other);
  });
  it('otro operador puede leer el cierre pero no atribuirse una repetición',async()=>{
    const s=setup();await s.service.cerrar(caseId,actor());expect((await s.service.consultar(caseId,{...actor(),actorId:other})).cerradaPor).toBe(id);
    await expect(s.service.cerrar(caseId,{...actor(),actorId:other})).rejects.toBeInstanceOf(ConflictException);
  });
  it('revocación final revierte el cierre y una lectura no entrega el recibo después de revocar',async()=>{
    const s=setup();s.permissions.mockResolvedValueOnce(['banco-docentes.rund.manage']).mockResolvedValueOnce([]);
    await expect(s.service.cerrar(caseId,actor())).rejects.toBeInstanceOf(ForbiddenException);expect(s.data.closure).toBeNull();
    await s.service.cerrar(caseId,actor());s.permissions.mockResolvedValueOnce(['banco-docentes.rund.manage']).mockResolvedValueOnce([]);
    await expect(s.service.consultar(caseId,actor())).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('ADMIN que vence durante INSERT no conserva un cierre',async()=>{
    const s=setup(),a={...actor(),roles:['ADMIN']},time=jest.spyOn(Date,'now'),original=s.query.getMockImplementation()!;
    s.query.mockImplementation(async(sql,args)=>{const rows=await original(sql,args);if(sql.startsWith('INSERT'))time.mockReturnValue((a.expiresAt+10)*1000);return rows;});
    try{await expect(s.service.cerrar(caseId,a)).rejects.toBeInstanceOf(UnauthorizedException);expect(s.data.closure).toBeNull();}finally{time.mockRestore();}
  });
  it.each(['caso','intencion','intento','actor','fecha','motivo','sin-aceptacion'])('recibo persistido incoherente %s falla sin presentarse como cierre válido',async field=>{
    const s=setup();await s.service.cerrar(caseId,actor());
    const names:any={caso:'caso_id',intencion:'intencion_id',intento:'intento_id',actor:'cerrada_por',fecha:'fecha_cerrada',motivo:'motivo'};
    if(field==='sin-aceptacion')s.data.event=null;else s.data.closure[names[field]]='INVALIDO';
    await expect(s.service.consultar(caseId,actor())).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
  it('caso ausente y SQL fallido conservan errores tipados sin detalles privados',async()=>{
    const s=setup();s.data.review=null;await expect(s.service.cerrar(caseId,actor())).rejects.toBeInstanceOf(NotFoundException);
    s.query.mockRejectedValueOnce(new Error('SQL PRIVADO'));await expect(s.service.consultar(caseId,actor())).rejects.toThrow('No fue posible confirmar el cierre');
  });
});
