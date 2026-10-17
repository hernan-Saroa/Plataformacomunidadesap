import { BadRequestException, ConflictException, ForbiddenException, NotFoundException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { AuthIdentityMailReviewService } from './auth-identity-mail-review.service';

describe('Revisión durable de correo sin resultado', () => {
  const id='abcdef00-1111-4111-8111-111111111111',caseId='abcdef00-2222-4222-8222-222222222222';
  const attempt='abcdef00-3333-4333-8333-333333333333',other='abcdef00-4444-4444-8444-444444444444';
  const actor=()=>({actorId:id,roles:['REVISOR'],expiresAt:Date.now()/1000+300});
  function setup() {
    const data:any={mail:{intencion_id:id,intento_id:attempt,estado:'ENVIANDO'},review:null,event:null};
    const projected=()=>data.review?[{...data.review,estado_correo:data.mail.estado,intento_actual:data.mail.intento_id,
      resultado:data.event?.resultado??null,intento_resultado:data.event?.intento_id??null}]:[];
    const query=jest.fn(async(sql:string,args?:any[])=>{
      if(sql.startsWith('SET LOCAL'))return [];
      if(sql.startsWith('SELECT c.*'))return projected();
      if(sql.startsWith('SELECT * FROM rund.identidad_correo WHERE'))return [data.mail];
      if(sql.startsWith('SELECT caso_id FROM'))return data.review?[{caso_id:caseId}]:[];
      if(sql.startsWith('SELECT intento_id FROM'))return data.event?[data.event]:[];
      if(sql.startsWith('SELECT intento_id,resultado FROM'))return data.event?[data.event]:[];
      if(sql.startsWith('SELECT intencion_id FROM'))return data.review?[{intencion_id:id}]:[];
      if(sql.startsWith('SELECT * FROM rund.identidad_correo_revision'))return data.review?[data.review]:[];
      if(sql.startsWith('INSERT INTO rund.identidad_correo_revision')){
        data.review={intencion_id:id,caso_id:caseId,intento_id:attempt,estado_correo_inicial:data.mail.estado,
          registrada_por:args![3],fecha_creada:'2026-10-16T10:00:00.123456Z',estado:'PENDIENTE',asumida_por:null,fecha_asumida:null};return [{caso_id:caseId}];
      }
      if(sql.includes('UPDATE rund.identidad_correo_revision SET')){
        data.review.estado='EN_REVISION';data.review.asumida_por=args![1];data.review.fecha_asumida='2026-10-16T10:01:00.123456Z';return [{caso_id:caseId}];
      }
      throw Error('SQL inesperado');
    });
    const transaction=jest.fn(async fn=>{const before=JSON.stringify(data);try{return await fn({query});}
      catch(e){Object.assign(data,JSON.parse(before));throw e;}});
    const permissions=jest.fn(async()=>['banco-docentes.rund.manage']);
    const service=new AuthIdentityMailReviewService({query,transaction} as any,{permisosRoles:permissions} as any);
    return {data,query,transaction,permissions,service,projected};
  }
  describe('Entrada explícita para resultado incierto registrado',()=>{
    function uncertain(){const s=setup();s.data.mail.estado='INCIERTO';s.data.event={intento_id:attempt,resultado:'INCIERTO'};return s;}
    it.each([null,{...actor(),actorId:'no'},{...actor(),expiresAt:0},{...actor(),expiresAt:NaN}])('sesión inválida %j no consulta',async a=>{
      const s=uncertain();await expect(s.service.registrarIncierto(id,a as any)).rejects.toBeInstanceOf(UnauthorizedException);expect(s.query).not.toHaveBeenCalled();
    });
    it('ID o permiso inválidos impiden registrar',async()=>{
      const s=uncertain();await expect(s.service.registrarIncierto('no',actor())).rejects.toBeInstanceOf(BadRequestException);
      s.permissions.mockResolvedValueOnce([]);await expect(s.service.registrarIncierto(id,actor())).rejects.toBeInstanceOf(ForbiddenException);expect(s.query).not.toHaveBeenCalled();
    });
    it('registra una vez y comparte DTO de doce campos sin alterar aviso o resultado',async()=>{
      const s=uncertain(),before=JSON.stringify([s.data.mail,s.data.event]),r=await s.service.registrarIncierto(id.toUpperCase(),actor());
      expect(Object.keys(r)).toHaveLength(12);expect(r).toMatchObject({estado:'PENDIENTE',estadoCorreoInicial:'INCIERTO',estadoCorreo:'INCIERTO',resultadoRegistrado:true,requiereRevision:true});
      expect(await s.service.registrarIncierto(id,{...actor(),actorId:other})).toEqual(r);expect(s.query.mock.calls.filter(([sql])=>sql.startsWith('INSERT'))).toHaveLength(1);
      expect(JSON.stringify([s.data.mail,s.data.event])).toBe(before);expect(JSON.stringify(r)).not.toMatch(/intento|@|password|contexto|comando/);
    });
    it('caso anterior a la incertidumbre conserva creador, estado inicial y responsable',async()=>{
      const s=setup();const original=await s.service.registrar(id,actor());await s.service.asumir(caseId,actor());
      s.data.event={intento_id:attempt,resultado:'INCIERTO'};s.data.mail.estado='INCIERTO';const saved=JSON.stringify(s.data.review);
      expect(await s.service.registrarIncierto(id,{...actor(),actorId:other})).toMatchObject({casoId:original.casoId,estadoCorreoInicial:'ENVIANDO',estado:'EN_REVISION',asumidaPor:id});
      expect(JSON.stringify(s.data.review)).toBe(saved);
    });
    it.each(['PENDIENTE','ENVIANDO','ENVIADO','sin-journal','aceptado','otro-intento'])('%s no abre por esta entrada',async kind=>{
      const s=uncertain();if(['PENDIENTE','ENVIANDO','ENVIADO'].includes(kind))s.data.mail.estado=kind;
      if(kind==='sin-journal')s.data.event=null;if(kind==='aceptado')s.data.event.resultado='ACEPTADO';if(kind==='otro-intento')s.data.event.intento_id=other;
      await expect(s.service.registrarIncierto(id,actor())).rejects.toBeInstanceOf(ConflictException);expect(s.data.review).toBeNull();
    });
    it('la entrada anterior sigue rechazando un caso nuevo con journal',async()=>{
      const s=uncertain();await expect(s.service.registrar(id,actor())).rejects.toBeInstanceOf(ConflictException);expect(s.data.review).toBeNull();
    });
    it('revocación tras SQL revierte el nuevo caso',async()=>{
      const s=uncertain();s.permissions.mockResolvedValueOnce(['banco-docentes.rund.manage']).mockResolvedValueOnce([]);
      await expect(s.service.registrarIncierto(id,actor())).rejects.toBeInstanceOf(ForbiddenException);expect(s.data.review).toBeNull();
    });
    it('ADMIN vencido durante INSERT revierte',async()=>{
      const s=uncertain(),a={...actor(),roles:['ADMIN']},time=jest.spyOn(Date,'now'),original=s.query.getMockImplementation()!;
      s.query.mockImplementation(async(sql,args)=>{const rows=await original(sql,args);if(sql.startsWith('INSERT'))time.mockReturnValue((a.expiresAt+1)*1000);return rows;});
      try{await expect(s.service.registrarIncierto(id,a)).rejects.toBeInstanceOf(UnauthorizedException);expect(s.data.review).toBeNull();}finally{time.mockRestore();}
    });
    it('aviso ausente o SQL fallido conservan errores seguros',async()=>{
      const s=uncertain(),original=s.query.getMockImplementation()!;s.query.mockImplementation(async(sql,args)=>sql.startsWith('SELECT * FROM rund.identidad_correo WHERE')?[]:original(sql,args));
      await expect(s.service.registrarIncierto(id,actor())).rejects.toBeInstanceOf(NotFoundException);
      s.query.mockRejectedValueOnce(Error('SQL PRIVADO'));await expect(s.service.registrarIncierto(id,actor())).rejects.toBeInstanceOf(ServiceUnavailableException);
    });
  });
  it.each([null,{...actor(),actorId:'no'},{...actor(),actorId:42},{...actor(),expiresAt:NaN},{...actor(),expiresAt:0}])('sesión inválida %j no consulta SQL',async a=>{
    const s=setup();await expect(s.service.registrar(id,a as any)).rejects.toBeInstanceOf(UnauthorizedException);expect(s.query).not.toHaveBeenCalled();
  });
  it('permiso ausente o Auth caído deniegan sin persistir',async()=>{
    const s=setup();s.permissions.mockResolvedValueOnce([]);await expect(s.service.listar({},actor())).rejects.toBeInstanceOf(ForbiddenException);
    s.permissions.mockRejectedValueOnce(new Error('PRIVADO'));await expect(s.service.registrar(id,actor())).rejects.toBeInstanceOf(ForbiddenException);expect(s.query).not.toHaveBeenCalled();
  });
  it('registro idempotente conserva creador, caso, fechas y aviso',async()=>{
    const s=setup(),mail=JSON.stringify(s.data.mail);const first=await s.service.registrar(id.toUpperCase(),actor());
    expect(Object.keys(first)).toHaveLength(12);expect(first).toMatchObject({casoId:caseId,registradaPor:id,estado:'PENDIENTE',estadoCorreo:'ENVIANDO',resultadoRegistrado:false,requiereRevision:true});
    expect(await s.service.registrar(id,{...actor(),actorId:other})).toEqual(first);
    expect(s.query.mock.calls.filter(([sql])=>sql.startsWith('INSERT'))).toHaveLength(1);expect(JSON.stringify(s.data.mail)).toBe(mail);
    expect(JSON.stringify(first)).not.toMatch(/intento|document|password|contexto|@/);
  });
  it.each(['PENDIENTE','ENVIADO','con-resultado'])('estado %s no abre revisión sin evidencia',async state=>{
    const s=setup();if(state==='con-resultado')s.data.event={intento_id:attempt,resultado:'ACEPTADO'};else s.data.mail.estado=state;
    await expect(s.service.registrar(id,actor())).rejects.toBeInstanceOf(ConflictException);expect(s.data.review).toBeNull();
  });
  it('INCIERTO histórico sin evento sí conserva un caso para revisión',async()=>{
    const s=setup();s.data.mail.estado='INCIERTO';expect((await s.service.registrar(id,actor())).estadoCorreoInicial).toBe('INCIERTO');
  });
  it('permiso revocado al final de registrar o asumir revierte la transacción',async()=>{
    const s=setup();s.permissions.mockResolvedValueOnce(['banco-docentes.rund.manage']).mockResolvedValueOnce([]);
    await expect(s.service.registrar(id,actor())).rejects.toBeInstanceOf(ForbiddenException);expect(s.data.review).toBeNull();
    await s.service.registrar(id,actor());s.permissions.mockResolvedValueOnce(['banco-docentes.rund.manage']).mockResolvedValueOnce([]);
    await expect(s.service.asumir(caseId,actor())).rejects.toBeInstanceOf(ForbiddenException);expect(s.data.review.estado).toBe('PENDIENTE');
  });
  it('mismo responsable recupera asignación y otro recibe conflicto',async()=>{
    const s=setup();await s.service.registrar(id,actor());const first=await s.service.asumir(caseId,actor());
    expect(await s.service.asumir(caseId,actor())).toEqual(first);await expect(s.service.asumir(caseId,{...actor(),actorId:other})).rejects.toBeInstanceOf(ConflictException);
  });
  it('confirmación tardía preserva caso e historia y bloquea nueva asignación',async()=>{
    const s=setup();await s.service.registrar(id,actor());s.data.mail.estado='ENVIADO';s.data.event={intento_id:attempt,resultado:'ACEPTADO'};
    expect(await s.service.consultar(caseId,actor())).toMatchObject({estado:'PENDIENTE',estadoCorreo:'ENVIADO',resultadoRegistrado:true,requiereRevision:false});
    await expect(s.service.asumir(caseId,actor())).rejects.toBeInstanceOf(ConflictException);expect((await s.service.registrar(id,actor())).requiereRevision).toBe(false);
  });
  it('lectura no entrega datos tras revocación',async()=>{
    const s=setup();await s.service.registrar(id,actor());s.permissions.mockResolvedValueOnce(['banco-docentes.rund.manage']).mockResolvedValueOnce([]);
    await expect(s.service.consultar(caseId,actor())).rejects.toBeInstanceOf(ForbiddenException);
  });
  it.each([null,[],{extra:'x'},{limite:'0'},{limite:'101'},{limite:2},{estado:'CERRADA'},{cursor:'no'},{cursor:'===='}])('filtros inválidos %j no consultan bandeja',async raw=>{
    const s=setup();await expect(s.service.listar(raw,actor())).rejects.toBeInstanceOf(BadRequestException);expect(s.query).not.toHaveBeenCalled();
  });
  it('cursor conserva microsegundos y queda vinculado al filtro',async()=>{
    const s=setup();await s.service.registrar(id,actor());s.query.mockResolvedValueOnce([...s.projected(),...s.projected()]);
    const page=await s.service.listar({limite:'1',estado:'PENDIENTE'},actor());expect(page.casos).toHaveLength(1);
    const cursor=JSON.parse(Buffer.from(page.siguienteCursor!,'base64url').toString());expect(cursor.creadaEn).toBe('2026-10-16T10:00:00.123456Z');
    await s.service.listar({limite:'1',estado:'PENDIENTE',cursor:page.siguienteCursor},actor());
    await expect(s.service.listar({estado:'EN_REVISION',cursor:page.siguienteCursor},actor())).rejects.toBeInstanceOf(BadRequestException);
  });
  it('sesión que vence durante SQL no persiste asignación incluso con rol ADMIN',async()=>{
    const s=setup();await s.service.registrar(id,actor());const admin={...actor(),roles:['ADMIN']};
    const time=jest.spyOn(Date,'now'),original=s.query.getMockImplementation()!;
    s.query.mockImplementation(async(sql,args)=>{const result=await original(sql,args);if(sql.includes('UPDATE rund.identidad_correo_revision SET'))time.mockReturnValue((admin.expiresAt+10)*1000);return result;});
    try{await expect(s.service.asumir(caseId,admin)).rejects.toBeInstanceOf(UnauthorizedException);expect(s.data.review.estado).toBe('PENDIENTE');}
    finally{time.mockRestore();}
  });
  it('errores SQL o incoherencias no devuelven datos privados',async()=>{
    const s=setup();s.query.mockRejectedValueOnce(new Error('SQL PRIVADO'));await expect(s.service.consultar(caseId,actor())).rejects.toBeInstanceOf(ServiceUnavailableException);
    await s.service.registrar(id,actor());s.data.event={intento_id:other,resultado:'ACEPTADO'};await expect(s.service.consultar(caseId,actor())).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
  it('ID o caso desconocido conserva errores tipados sin mutar',async()=>{
    const s=setup();await expect(s.service.asumir('no',actor())).rejects.toBeInstanceOf(BadRequestException);
    await expect(s.service.asumir(caseId,actor())).rejects.toBeInstanceOf(NotFoundException);expect(s.data.review).toBeNull();
  });
});
