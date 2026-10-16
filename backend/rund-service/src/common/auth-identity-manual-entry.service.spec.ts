import { BadRequestException, ConflictException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { AuthIdentityManualEntryService } from './auth-identity-manual-entry.service';

describe('Entrada manual capturada y prevalidada sin ejecutar',()=>{
  const actor={actorId:'abcdef00-1111-4111-8111-111111111111',roles:['GESTION_PROFESORAL'],fullAccess:true,ip:'127.0.0.1'};
  const request='abcdef00-2222-4222-8222-222222222222',intention='abcdef00-3333-4333-8333-333333333333';
  const form=()=>({documentNumber:'1020304050',documentType:'CC',nombreCompleto:'MARIA LOPEZ GARCIA',genero:'F',fechaNacimiento:'1980-01-01',
    correoInstitucional:'manual@esap.edu.co',tipoVinculacion:'CARRERA',territorialNombre:'Sede Central',dedicacion:'TC',
    escalafon:'ASOCIADO',fechaInicioVinculacion:'2026-01-01',actoAdministrativoVinculacion:'ACTO FICTICIO',nivelFormacion:'MAESTRIA',
    pregrado:'ADMINISTRACION PUBLICA',nucleoTematico:'GESTION PUBLICA',perfilAcademico:'DOCENCIA',horasPta:720,periodoCarga:'2026-2'});
  const setup=()=>{
    let row:any,profile=false,abandoned=false;
    const query=jest.fn(async(sql:string,params:any[])=>sql.includes('identidad_abandono_manual')?abandoned?[{}]:[]:sql.includes('FROM rund."Docente"')?profile?[{id:'PERFIL'}]:[]:row&&params[0]===actor.actorId?[row]:[]);
    const tx=jest.fn(async(sql:string,params:any[])=>{
      if(sql.startsWith('INSERT'))row={actor_id:params[0],solicitud_id:params[1],intencion_id:intention,huella_comando:params[2],huella_contexto:params[3],
        huella_formulario:params[4],entrada_manual:JSON.parse(params[5])};return [];
    });
    const requests={preparar:jest.fn().mockResolvedValue({solicitudId:request,intencionId:intention,preparacion:'LISTA'}),consultar:jest.fn().mockResolvedValue({solicitudId:request,preparacion:'LISTA'})};
    const coordination={consultar:jest.fn().mockResolvedValue({operacionAuthId:intention})};
    const validation={validar:jest.fn().mockResolvedValue({resultado:{conflictoCorreo:false,rolDocenteId:intention,personaId:null}})};
    const catalogos={territorialesBanco:jest.fn().mockResolvedValue([{id:'999',nombre:'Sede Central',codigo:'99'}])};
    const transaction=jest.fn(async(fn:any)=>fn({query:tx}));
    return {service:new AuthIdentityManualEntryService({query,transaction} as any,requests as any,coordination as any,validation as any,catalogos as any),
      query,tx,transaction,requests,coordination,validation,catalogos,row:()=>row,abandon:()=>{abandoned=true;},legacy:()=>{row={actor_id:actor.actorId,solicitud_id:request};},profile:()=>{profile=true;}};
  };
  it('captura formulario, actor y catalogo antes de preparar y consulta Auth con el UUID existente',async()=>{
    const s=setup(),result=await s.service.preparar(request,actor,form());expect(result.prevalidacion).toEqual({estado:'COMPATIBLE',reserva:false});
    expect(s.row().entrada_manual.contexto.escritura.options.audit.ip).toBe(actor.ip);
    expect(s.validation.validar).toHaveBeenCalledWith({version:1,operacionId:intention,documento:'1020304050',correo:'manual@esap.edu.co',resolverPorCorreo:false});
    expect(JSON.stringify(result)).not.toMatch(/1020304050|manual@|comandoAuth/);
  });
  it('reintento con otra IP/roles conserva captura y vuelve a prevalidar sin consultar catalogo',async()=>{
    const s=setup();await s.service.preparar(request,actor,form());const original=JSON.stringify(s.row());
    await s.service.preparar(request,{...actor,ip:'192.0.2.1',roles:['OTRO'],fullAccess:false},form());
    expect(JSON.stringify(s.row())).toBe(original);expect(s.catalogos.territorialesBanco).toHaveBeenCalledTimes(1);expect(s.validation.validar).toHaveBeenCalledTimes(2);
    expect(s.requests.preparar.mock.calls[1][3].options.audit.ip).toBe(actor.ip);
  });
  it('otro formulario para la misma solicitud no reemplaza la captura',async()=>{
    const s=setup();await s.service.preparar(request,actor,form());
    await expect(s.service.preparar(request,actor,{...form(),horasPta:100})).rejects.toBeInstanceOf(ConflictException);expect(s.validation.validar).toHaveBeenCalledTimes(1);
  });
  it('fallo de preparacion conserva captura; reanudar no requiere formulario ni reconstruye auditoria',async()=>{
    const s=setup();s.requests.preparar.mockRejectedValueOnce(new Error('FALLO'));
    await expect(s.service.preparar(request,actor,form())).rejects.toThrow('FALLO');expect(s.row()).toBeDefined();
    expect((await s.service.reanudar(request,actor.actorId)).preparacion).toBe('LISTA');expect(s.catalogos.territorialesBanco).toHaveBeenCalledTimes(1);
  });
  it('fallo de prevalidacion conserva captura; cada reintento consulta de nuevo sin aprobación persistida',async()=>{
    const s=setup();s.validation.validar.mockRejectedValueOnce(new ServiceUnavailableException());
    await expect(s.service.preparar(request,actor,form())).rejects.toBeInstanceOf(ServiceUnavailableException);
    await s.service.reanudar(request,actor.actorId);expect(s.validation.validar).toHaveBeenCalledTimes(2);expect(s.row()).not.toHaveProperty('prevalidacion');
  });
  it.each(['actorId','cargadoPor','canal_origen','territorialId','options','jwt','otp','resetToken','password_hash'])('rechaza campo servidor/credencial %s antes de reservar',async key=>{
    const s=setup();await expect(s.service.preparar(request,actor,{...form(),[key]:'NO GUARDAR'})).rejects.toBeInstanceOf(BadRequestException);
    expect(s.transaction).not.toHaveBeenCalled();expect(s.catalogos.territorialesBanco).not.toHaveBeenCalled();
  });
  it.each([null,[],{nombre:{profundo:true}},{}])('formulario invalido %j no reserva',async raw=>{
    const s=setup();await expect(s.service.preparar(request,actor,raw)).rejects.toBeInstanceOf(BadRequestException);expect(s.transaction).not.toHaveBeenCalled();
  });
  it('catalogo ausente y territorial desconocida no reservan',async()=>{
    const s=setup();s.catalogos.territorialesBanco.mockRejectedValueOnce(new ServiceUnavailableException());
    await expect(s.service.preparar(request,actor,form())).rejects.toBeInstanceOf(ServiceUnavailableException);
    s.catalogos.territorialesBanco.mockResolvedValueOnce([]);await expect(s.service.preparar(request,actor,form())).rejects.toBeInstanceOf(BadRequestException);expect(s.transaction).not.toHaveBeenCalled();
  });
  it.each(['conflicto','rol','perfil'])('prevalidacion %s no informa compatibilidad',async kind=>{
    const s=setup();s.validation.validar.mockResolvedValueOnce({resultado:{conflictoCorreo:kind==='conflicto',rolDocenteId:kind==='rol'?null:intention,personaId:kind==='perfil'?intention:null}});
    if(kind==='perfil')s.profile();await expect(s.service.preparar(request,actor,form())).rejects.toBeInstanceOf(kind==='rol'?ServiceUnavailableException:ConflictException);
  });
  it('legado sin captura no se reconstruye ni sobrescribe',async()=>{
    const s=setup();s.legacy();await expect(s.service.reanudar(request,actor.actorId)).rejects.toBeInstanceOf(ConflictException);expect(s.transaction).not.toHaveBeenCalled();
  });
  it('captura incoherente falla cerrada antes de preparar o consultar Auth',async()=>{
    const s=setup();await s.service.preparar(request,actor,form());s.row().entrada_manual.formulario.horasPta=1;s.validation.validar.mockClear();s.requests.preparar.mockClear();
    await expect(s.service.reanudar(request,actor.actorId)).rejects.toBeInstanceOf(ServiceUnavailableException);expect(s.validation.validar).not.toHaveBeenCalled();expect(s.requests.preparar).not.toHaveBeenCalled();
  });
  it('consulta no expone formulario ni vuelve a prevalidar y otra sesion no ve la solicitud',async()=>{
    const s=setup();await s.service.preparar(request,actor,form());const result=await s.service.consultar(request,actor.actorId);
    expect(result.entradaCapturada).toBe(true);expect(result).not.toHaveProperty('entrada_manual');expect(s.validation.validar).toHaveBeenCalledTimes(1);
    await expect(s.service.consultar(request,intention)).rejects.toBeInstanceOf(NotFoundException);
  });
  it('restaura para revisión sin prevalidar, preparar, consultar catálogo o escribir',async()=>{
    const s=setup();await s.service.preparar(request,actor,form());
    s.validation.validar.mockClear();s.requests.preparar.mockClear();s.catalogos.territorialesBanco.mockClear();s.transaction.mockClear();
    const result=await s.service.restaurarCaptura(request,actor.actorId);
    expect(result.intencionId).toBe(intention);expect(result.context.escritura.payload.documentNumber).toBe('1020304050');
    expect(s.validation.validar).not.toHaveBeenCalled();expect(s.requests.preparar).not.toHaveBeenCalled();
    expect(s.catalogos.territorialesBanco).not.toHaveBeenCalled();expect(s.transaction).not.toHaveBeenCalled();
    await expect(s.service.restaurarCaptura(request,intention)).rejects.toBeInstanceOf(NotFoundException);
  });
  it('revisión no reconstruye legado y valida ambas huellas de captura antes de devolver datos',async()=>{
    const legacy=setup();legacy.legacy();await expect(legacy.service.restaurarCaptura(request,actor.actorId)).rejects.toBeInstanceOf(ConflictException);
    const s=setup();await s.service.preparar(intention,actor,form());s.row().entrada_manual.formulario.horasPta=1;
    await expect(s.service.restaurarCaptura(intention,actor.actorId)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
  it('abandono previo impide preparar o reanudar antes de catálogo, prevalidación o journal',async()=>{
    const s=setup();s.abandon();
    await expect(s.service.preparar(request,actor,form())).rejects.toBeInstanceOf(ConflictException);
    await expect(s.service.reanudar(request,actor.actorId)).rejects.toBeInstanceOf(ConflictException);
    expect(s.requests.preparar).not.toHaveBeenCalled();expect(s.catalogos.territorialesBanco).not.toHaveBeenCalled();
    expect(s.validation.validar).not.toHaveBeenCalled();expect(s.transaction).not.toHaveBeenCalled();
  });
});
