import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { AuthIdentityRequestService } from './auth-identity-request.service';
import { identityWriteFingerprint } from './auth-identity-command';
import { nativeBusinessContext, nativeBusinessFingerprint } from '../modules/banco-docentes/rund-native-business-context';
import { normalizeBancoDocentePayload, normalizePhoneForAuth } from '../modules/banco-docentes/banco-docentes.service';

describe('Solicitud estable de creacion manual',()=>{
  const actor='abcdef00-1111-4111-8111-111111111111',request='abcdef00-2222-4222-8222-222222222222',intention='abcdef00-3333-4333-8333-333333333333';
  const data=()=>{
    const raw={DOCUMENTO_IDENTIDAD:'1020304050',TIPO_DOCUMENTO:'CC',NOMBRE_COMPLETO:'MARIA LOPEZ GARCIA',GENERO:'F',FECHA_NACIMIENTO:'1980-01-01',
      CORREO_INSTITUCIONAL:'solicitud@esap.edu.co',VINCULACION:'CARRERA',TERRITORIAL:'Sede Central',DEDICACION:'TIEMPO_COMPLETO',
      CATEGORIA_ESCALAFON:'ASOCIADO',INICIO_VINCULACION:'2026-01-01',ACTO_ADMINISTRATIVO:'ACTO FICTICIO',NIVEL_FORMACION:'MAESTRIA',
      TITULO_PREGRADO:'ADMINISTRACION PUBLICA',NUCLEO_TEMATICO:'GESTION PUBLICA',PERFIL_ACADEMICO:'DOCENCIA',HORAS_PTA:720,PERIODO_CARGA:'2026-2',canal_origen:'MODAL',cargadoPor:actor};
    const payload=normalizeBancoDocentePayload(raw),emailFinal=payload.correoInstitucional,phoneFinal=normalizePhoneForAuth(payload.telefono),finalFullName=payload.fullName;
    const command={version:1 as const,actorId:actor,payload:{documentNumber:payload.documentNumber,documentType:payload.documentType,primer_nombre:payload.primer_nombre||null,
      primer_apellido:payload.primer_apellido||null,segundo_apellido:payload.segundo_apellido||null,genero:payload.genero,fechaNacimiento:'1980-01-01'},
      options:{relaxValidation:false,preserveTerritorial:false},territorial:{id:'1'},emailFinal,phoneFinal,finalFullName};
    const input={payload,rawPayload:raw,options:{rejectExisting:true,audit:{actorId:actor,canalOrigen:'MODAL',accion:'CREAR'}},territorial:{id:'1',nombre:'Sede Central'},emailFinal,phoneFinal,finalFullName};
    return {command,input};
  };
  const setup=()=>{
    const item=data(),row={actor_id:actor,solicitud_id:request,intencion_id:intention,origen:'CREAR_MODAL',creada_en:'2026-10-15T10:00:00.123456Z',
      huella_comando:identityWriteFingerprint(item.command),huella_contexto:nativeBusinessFingerprint(nativeBusinessContext(item.command,item.input))};
    const query=jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([row]).mockResolvedValueOnce([row]).mockResolvedValueOnce([{intencion_id:intention}]);
    const execution={preparar:jest.fn().mockResolvedValue({})},service=new AuthIdentityRequestService({query} as any,execution as any);
    return {...item,row,query,execution,service};
  };
  it.each(['',null,'documento'])('ID no UUID %s no reserva ni prepara',async id=>{
    const s=setup();await expect(s.service.preparar(id as any,actor,s.command,s.input)).rejects.toBeInstanceOf(BadRequestException);expect(s.query).not.toHaveBeenCalled();
  });
  it('reserva una intencion de servidor antes de preparar; no toma el ID de solicitud como intencion',async()=>{
    const s=setup(),result=await s.service.preparar(request.toUpperCase(),actor,s.command,s.input);
    expect(result.intencionId).toBe(intention);expect(result.preparacion).toBe('LISTA');expect(s.query.mock.calls[0][1]).toEqual([actor,request,s.row.huella_comando,s.row.huella_contexto]);
    expect(s.query.mock.calls[0][0]).not.toContain('UPDATE');expect(s.execution.preparar).toHaveBeenCalledWith(intention,s.command,expect.any(Object));
    expect(JSON.stringify(result)).not.toMatch(/DOCUMENTO_IDENTIDAD|solicitud@|comandoAuth|password/);
  });
  it('otro contenido con la misma solicitud devuelve 409 antes de tocar el ejecutor',async()=>{
    const s=setup();s.row.huella_contexto='a'.repeat(64);await expect(s.service.preparar(request,actor,s.command,s.input)).rejects.toBeInstanceOf(ConflictException);
    expect(s.execution.preparar).not.toHaveBeenCalled();
  });
  it('fallo del preparador conserva reserva para reintento y propaga el error',async()=>{
    const s=setup();s.execution.preparar.mockRejectedValue(new Error('FALLO'));await expect(s.service.preparar(request,actor,s.command,s.input)).rejects.toThrow('FALLO');
    expect(s.query).toHaveBeenCalledTimes(2);
  });
  it('no depende de la referencia mutable del llamador despues de reservar',async()=>{
    const s=setup();s.query.mockReset().mockImplementation(async(sql:string)=>{
      if(sql.startsWith('INSERT')){s.input.payload.horasAsignables=999;return [];}
      return sql.includes('JOIN')?[{intencion_id:intention}]:[s.row];
    });
    await s.service.preparar(request,actor,s.command,s.input);
    expect(s.execution.preparar.mock.calls[0][2].payload.horasAsignables).toBe(720);
  });
  it.each(['actor','canal','editar','masivo','relajada','existente','territorial','payload'])('contexto %s incompatible no reserva',async kind=>{
    const s=setup(),input:any=s.input;
    if(kind==='actor')input.options.audit.actorId=request;if(kind==='canal')input.options.audit.canalOrigen='API';if(kind==='editar')input.options.audit.accion='EDITAR';
    if(kind==='masivo')input.options.bulkImport=true;if(kind==='relajada')input.options.relaxValidation=true;if(kind==='existente')input.options.rejectExisting=false;
    if(kind==='territorial')delete input.territorial;if(kind==='payload')input.payload.horasAsignables=999;
    await expect(s.service.preparar(request,actor,s.command,input)).rejects.toBeInstanceOf(BadRequestException);expect(s.query).not.toHaveBeenCalled();
  });
  it.each(['correo','obligatorio','periodo','telefono'])('conserva validacion manual de %s antes de reservar',async kind=>{
    const s=setup(),raw:any=s.input.rawPayload;
    if(kind==='correo')raw.CORREO_INSTITUCIONAL='persona@example.test';if(kind==='obligatorio')delete raw.TITULO_PREGRADO;
    if(kind==='periodo')raw.PERIODO_CARGA='OTRO';if(kind==='telefono')raw.TELEFONO='NO TELEFONO';
    await expect(s.service.preparar(request,actor,s.command,s.input)).rejects.toBeInstanceOf(BadRequestException);expect(s.query).not.toHaveBeenCalled();
  });
  it.each(['documentType','primer_nombre','primer_apellido','segundo_apellido','genero','fechaNacimiento'])('comando con %s ajeno al formulario no reserva',async field=>{
    const s=setup();(s.command.payload as any)[field]=field==='fechaNacimiento'?'1990-01-01':'OTRO';
    await expect(s.service.preparar(request,actor,s.command,s.input)).rejects.toBeInstanceOf(BadRequestException);expect(s.query).not.toHaveBeenCalled();
  });
  it.each(['emailFinal','phoneFinal','finalFullName'])('dato Auth %s distinto de la normalizacion no reserva',async field=>{
    const s=setup();(s.command as any)[field]=(s.input as any)[field]=field==='emailFinal'?'otro@esap.edu.co':field==='phoneFinal'?'3001234567':'OTRO NOMBRE';
    await expect(s.service.preparar(request,actor,s.command,s.input)).rejects.toBeInstanceOf(BadRequestException);expect(s.query).not.toHaveBeenCalled();
  });
  it('consultar una reserva incompleta devuelve PENDIENTE y no prepara ni ejecuta',async()=>{
    const s=setup();s.query.mockReset().mockResolvedValueOnce([s.row]).mockResolvedValueOnce([]);
    expect((await s.service.consultar(request,actor)).preparacion).toBe('PENDIENTE');expect(s.execution.preparar).not.toHaveBeenCalled();
  });
  it('consulta acotada al actor no divulga otro solicitante',async()=>{
    const s=setup();s.query.mockReset().mockResolvedValue([]);await expect(s.service.consultar(request,actor)).rejects.toBeInstanceOf(NotFoundException);
    expect(s.query.mock.calls[0][1]).toEqual([actor,request]);
  });
});
