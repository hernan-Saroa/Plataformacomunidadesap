import { BadRequestException, ConflictException, ForbiddenException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { AuthIdentityManualPreviewService } from './auth-identity-manual-preview.service';
import { AuthIdentityManualEntryService } from './auth-identity-manual-entry.service';
import { AuthIdentityManualEntryController } from './auth-identity-manual-entry.controller';

const actor={actorId:'abcdef00-1111-4111-8111-111111111111',roles:['OPERADOR'],fullAccess:false,expiresAt:4102444800};
const person='abcdef00-2222-4222-8222-222222222222';
const form=()=>({documentNumber:'1020304050',documentType:'CC',nombreCompleto:'MARIA LOPEZ GARCIA',genero:'F',fechaNacimiento:'1980-01-01',
  correoInstitucional:'manual@esap.edu.co',tipoVinculacion:'CARRERA',territorialNombre:'Sede Central',dedicacion:'TC',escalafon:'ASOCIADO',
  fechaInicioVinculacion:'2026-01-01',actoAdministrativoVinculacion:'ACTO FICTICIO',nivelFormacion:'MAESTRIA',pregrado:'ADMINISTRACION PUBLICA',
  nucleoTematico:'GESTION PUBLICA',perfilAcademico:'DOCENCIA',horasPta:720,periodoCarga:'2026-2'});
const dto={version:1,compatibilidad:'COMPATIBLE_AL_CONSULTAR',reserva:false,solicitudCreada:false,ejecucionAutorizada:false,requierePreparacion:true};
function setup(){
  const db={query:jest.fn().mockResolvedValue([]),transaction:jest.fn(()=>{throw Error('NO ESCRIBIR');})};
  const requests={preparar:jest.fn(),consultar:jest.fn()},coordination={consultar:jest.fn()};
  const validation={validar:jest.fn().mockResolvedValue({resultado:{conflictoCorreo:false,rolDocenteId:person,personaId:null}})};
  const identities={permisosRoles:jest.fn().mockResolvedValue(['banco-docentes.rund.manage'])};
  const catalogos={territorialesBanco:jest.fn().mockResolvedValue([{id:'999',nombre:'Sede Central',codigo:'99'}])};
  const entries=new AuthIdentityManualEntryService(db as any,requests as any,coordination as any,validation as any,catalogos as any);
  const service=new AuthIdentityManualPreviewService(db as any,entries,validation as any,identities as any);
  return{db,requests,coordination,validation,identities,catalogos,entries,service};
}
afterEach(()=>jest.restoreAllMocks());
describe('Previsualización manual sin solicitud, escritura remota o reserva',()=>{
  it('reutiliza propuesta real y devuelve solo seis campos sin identidad, formulario o aprobación de ejecución',async()=>{
    const s=setup();expect(await s.service.previsualizar(actor,form())).toEqual(dto);
    expect(s.db.query).not.toHaveBeenCalled();expect(s.db.transaction).not.toHaveBeenCalled();
    expect(s.requests.preparar).not.toHaveBeenCalled();expect(s.coordination.consultar).not.toHaveBeenCalled();
    expect(s.catalogos.territorialesBanco).toHaveBeenCalledTimes(1);
    expect(s.validation.validar).toHaveBeenCalledWith({version:1,operacionId:expect.stringMatching(/^[a-f0-9-]{36}$/),documento:'1020304050',correo:'manual@esap.edu.co',resolverPorCorreo:false});
  });
  it('repetir consulta usa correlación efímera nueva sin persistir identidad o solicitud',async()=>{
    const s=setup();await s.service.previsualizar(actor,form());await s.service.previsualizar(actor,form());
    expect(s.validation.validar.mock.calls[0][0].operacionId).not.toBe(s.validation.validar.mock.calls[1][0].operacionId);
    expect(s.db.query).not.toHaveBeenCalled();expect(s.db.transaction).not.toHaveBeenCalled();
  });
  it('propuesta de servidor conserva normalización/contexto manual y no lee ni escribe solicitud',async()=>{
    const s=setup(),r=await s.entries.proponer(actor,form());expect(r.context.comandoAuth.actorId).toBe(actor.actorId);
    expect(r.context.escritura.options.audit.canalOrigen).toBe('MODAL');expect(r.context.escritura.options.rejectExisting).toBe(true);
    expect(r.context.escritura.territorial.id).toBe('999');expect(r.envelope.formulario).toEqual(form());
    expect(s.db.query).not.toHaveBeenCalled();expect(s.db.transaction).not.toHaveBeenCalled();expect(s.validation.validar).not.toHaveBeenCalled();
  });
  it.each([null,[],{}, {nombre:{privado:true}}])('formulario inválido %j falla antes del catálogo o Auth',async raw=>{
    const s=setup();await expect(s.service.previsualizar(actor,raw)).rejects.toBeInstanceOf(BadRequestException);
    expect(s.catalogos.territorialesBanco).not.toHaveBeenCalled();expect(s.validation.validar).not.toHaveBeenCalled();expect(s.db.transaction).not.toHaveBeenCalled();
  });
  it.each(['actorId','password','territorialId','options','jwt','otp','tokenAcceso'])('campo %s no modifica autoridad o captura',async key=>{
    const s=setup();await expect(s.service.previsualizar(actor,{...form(),[key]:'PRIVADO'})).rejects.toBeInstanceOf(BadRequestException);
    expect(s.validation.validar).not.toHaveBeenCalled();expect(s.db.query).not.toHaveBeenCalled();
  });
  it.each([undefined,0,NaN,Infinity])('exp %s no autoriza consulta',async expiresAt=>{
    const s=setup();await expect(s.service.previsualizar({...actor,expiresAt},form())).rejects.toBeInstanceOf(UnauthorizedException);
    expect(s.catalogos.territorialesBanco).not.toHaveBeenCalled();
  });
  it('actor inválido no se sustituye por persona',async()=>{
    const s=setup();await expect(s.service.previsualizar({...actor,actorId:'PERSONA'},form())).rejects.toBeInstanceOf(UnauthorizedException);
    expect(s.validation.validar).not.toHaveBeenCalled();
  });
  it.each(['ADMIN','SUPER_ADMIN','GESTION_PROFESORAL'])('alternativa %s conserva política existente sin claims de permiso nuevos',async role=>{
    const s=setup();expect(await s.service.previsualizar({...actor,roles:[role]},form())).toEqual(dto);expect(s.identities.permisosRoles).not.toHaveBeenCalled();
  });
  it.each(['denied','unavailable'])('permiso %s falla cerrado antes del catálogo',async mode=>{
    const s=setup();if(mode==='denied')s.identities.permisosRoles.mockResolvedValue([]);else s.identities.permisosRoles.mockRejectedValue(Error('PRIVADO'));
    await expect(s.service.previsualizar(actor,form())).rejects.toBeInstanceOf(ForbiddenException);expect(s.catalogos.territorialesBanco).not.toHaveBeenCalled();
  });
  it('conflicto de correo o rol ausente no produce compatibilidad',async()=>{
    const s=setup();s.validation.validar.mockResolvedValueOnce({resultado:{conflictoCorreo:true,rolDocenteId:person,personaId:null}});
    await expect(s.service.previsualizar(actor,form())).rejects.toBeInstanceOf(ConflictException);
    s.validation.validar.mockResolvedValueOnce({resultado:{conflictoCorreo:false,rolDocenteId:null,personaId:null}});
    await expect(s.service.previsualizar(actor,form())).rejects.toBeInstanceOf(ServiceUnavailableException);expect(s.db.query).not.toHaveBeenCalled();
  });
  it('identidad existente consulta solo perfil del mismo período sin leer Auth por SQL',async()=>{
    const s=setup();s.validation.validar.mockResolvedValue({resultado:{conflictoCorreo:false,rolDocenteId:person,personaId:person}});
    expect(await s.service.previsualizar(actor,form())).toEqual(dto);expect(s.db.query).toHaveBeenCalledWith(expect.stringMatching(/^SELECT id FROM rund\."Docente"/),[person,'2026-2']);
    s.db.query.mockResolvedValue([{id:'PERFIL'}]);await expect(s.service.previsualizar(actor,form())).rejects.toBeInstanceOf(ConflictException);expect(s.db.transaction).not.toHaveBeenCalled();
  });
  it.each(['catalog','auth','sql'])('revocación durante %s impide divulgar compatibilidad',async stage=>{
    const s=setup(),revoke=()=>s.identities.permisosRoles.mockResolvedValue([]);
    if(stage==='catalog')s.catalogos.territorialesBanco.mockImplementation(async()=>{revoke();return[{id:'999',nombre:'Sede Central'}];});
    else s.validation.validar.mockImplementation(async()=>{if(stage==='auth')revoke();return{resultado:{conflictoCorreo:false,rolDocenteId:person,personaId:person}};});
    if(stage==='sql')s.db.query.mockImplementation(async()=>{revoke();return[];});
    await expect(s.service.previsualizar(actor,form())).rejects.toBeInstanceOf(ForbiddenException);expect(s.db.transaction).not.toHaveBeenCalled();
  });
  it.each(['catalog','auth','sql'])('expiración durante %s impide compatibilidad aunque ADMIN',async stage=>{
    const s=setup();let now=1700000000000;jest.spyOn(Date,'now').mockImplementation(()=>now);
    if(stage==='catalog')s.catalogos.territorialesBanco.mockImplementation(async()=>{now+=2000;return[{id:'999',nombre:'Sede Central'}];});
    else s.validation.validar.mockImplementation(async()=>{if(stage==='auth')now+=2000;return{resultado:{conflictoCorreo:false,rolDocenteId:person,personaId:person}};});
    if(stage==='sql')s.db.query.mockImplementation(async()=>{now+=2000;return[];});
    await expect(s.service.previsualizar({...actor,roles:['ADMIN'],expiresAt:1700000001},form())).rejects.toBeInstanceOf(UnauthorizedException);
  });
  it.each(['catalog','auth','sql'])('fallo %s no entrega parámetros privados ni escribe',async stage=>{
    const s=setup(),error=Object.assign(Error('PRIVADO'),{parameters:['DOCUMENTO PRIVADO']});
    if(stage==='catalog')s.catalogos.territorialesBanco.mockRejectedValue(error);
    else if(stage==='auth')s.validation.validar.mockRejectedValue(error);
    else{s.validation.validar.mockResolvedValue({resultado:{conflictoCorreo:false,rolDocenteId:person,personaId:person}});s.db.query.mockRejectedValue(error);}
    await expect(s.service.previsualizar(actor,form())).rejects.toMatchObject({status:503});expect(s.db.transaction).not.toHaveBeenCalled();
  });
});
describe('Frontera opcional de preview manual',()=>{
  const controller=(previews?:any)=>new AuthIdentityManualEntryController({} as any,undefined,undefined,undefined,undefined,undefined,previews);
  it('ruta POST de solo observación usa no-store y conserva guards de clase',async()=>{
    expect(Reflect.getMetadata('path',AuthIdentityManualEntryController.prototype.previsualizar)).toBe('previsualizar');
    expect(Reflect.getMetadata('__headers__',AuthIdentityManualEntryController.prototype.previsualizar)).toContainEqual({name:'Cache-Control',value:'private, no-store'});
    const previews={previsualizar:jest.fn().mockResolvedValue(dto)};await controller(previews).previsualizar({formulario:form()},{user:{sub:actor.actorId,roles:['ADMIN'],exp:actor.expiresAt},ip:'127.0.0.1'});
    expect(previews.previsualizar).toHaveBeenCalledWith(expect.objectContaining({actorId:actor.actorId,expiresAt:actor.expiresAt,roles:['ADMIN']}),form());
  });
  it.each([null,[],{}, {formulario:{},actorId:person},{formulario:{},solicitudId:person}])('body %j no elige actor o reserva',body=>{
    expect(()=>controller().previsualizar(body,{user:{sub:actor.actorId}})).toThrow(BadRequestException);
  });
  it('sin proveedor o con SQL privado retorna 503 seguro',async()=>{
    await expect(controller().previsualizar({formulario:{}},{user:{sub:actor.actorId}})).rejects.toBeInstanceOf(ServiceUnavailableException);
    const previews={previsualizar:jest.fn().mockRejectedValue(Object.assign(Error('PRIVADO'),{parameters:['PRIVADO']}))};
    await expect(controller(previews).previsualizar({formulario:{}},{user:{sub:actor.actorId}})).rejects.not.toHaveProperty('parameters');
  });
});
