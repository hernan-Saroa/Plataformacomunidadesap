/* Validaciones previas a edición/envío: únicamente el clúster temporal de RUND. */
const assert = require('node:assert/strict'), path = require('node:path');
const { randomUUID, randomBytes, createHash } = require('node:crypto');

module.exports = async function verifyTrustedIdentity(pgConfig, runtime, check, context) {
  assert.equal(pgConfig.database, 'rund_integration'); assert.equal(pgConfig.host, '127.0.0.1');
  assert.match(path.basename(runtime), /^esap-rund-integration-/);
  const { database, request, docenteId, authUrl, authFixture, authToken } = context;
  const root = path.resolve(__dirname, '..'), rundRoot = path.join(root, 'backend/rund-service');
  const load = file => require(path.join(rundRoot, 'dist', file));
  const { BancoDocentesService } = load('modules/banco-docentes/banco-docentes.service');
  const { BancoDocenteEntity } = load('entities/banco-docente.entity');
  const { BancoDocenteInvitacionEntity } = load('entities/banco-docente-invitacion.entity');
  const { DataSource } = require(path.join(rundRoot, 'node_modules/typeorm'));
  const person = randomUUID(), orphan = randomUUID(), duplicate = randomUUID(), ids = [randomUUID(), randomUUID()];
  const invites = [randomUUID(), randomUUID()], support = randomUUID();
  const sessions = [randomBytes(32).toString('hex'), randomBytes(32).toString('hex')];
  const marker = randomUUID().replace(/-/g, '').slice(0, 8), document = '0009020001';
  const institutional = 'trusted-' + marker + '@esap.edu.co', alternative = 'trusted-' + marker + '@example.test';
  const invited = 'new-' + marker + '@example.test';
  const editRoute = '/banco-docentes/' + ids[1], submitRoute = index => '/banco-docentes/submit/' + sessions[index];
  const body = { documentNumber: document, documentType: 'CC', nombreCompleto: 'PERSONA FICTICIA APELLIDO', genero: 'Femenino',
    sexoBiologico: 'Mujer', fechaNacimiento: '1985-06-15', correoInstitucional: institutional,
    correoAlternativo: alternative, telefono: '3001234567', tipoVinculacion: 'OCASIONAL',
    regimenNormativo: 'Circular Dispositiva 003/2025', horasPta: 800, territorialNombre: 'Territorial Ficticia',
    dedicacion: 'TC', dedicacionHorasSemana: 40, escalafon: 'Asistente', fechaInicioVinculacion: '2026-01-15',
    fechaFinVinculacion: '2026-12-15', estado: 'ACTIVO', actoAdministrativoVinculacion: 'Resolución ficticia',
    origenVinculacion: 'Convocatoria docente', puntajeSalarial: 145.5, situacionAdministrativa: 'Servicio activo',
    situacionCategoria: 'Servicio Activo', nivelFormacion: 'Maestría', pregrado: 'Administración Pública',
    nucleoTematico: 'Administración Pública', perfilAcademico: 'Administración pública con experiencia docente',
    periodoCarga: '2026-2', soporteEdicionId: support, justificacionEdicion: 'Corrección ficticia documentada' };
  const snapshot = async () => {
    const result = {};
    for (const [schema,table] of [['auth','personas'],['auth','user'],['auth','user_roles'],
      ...['Docente','RundCampoEstado','RundSoporteCampo','RundAprobacionLog','RundAccesoDatosLog',
        'BancoDocentesInvitaciones','validacion_documental'].map(name=>['rund',name])]) {
      result[schema+'.'+table] = (await database.query(`SELECT to_jsonb(t) AS row FROM ${schema}."${table}" t ORDER BY to_jsonb(t)::text`)).rows;
    }
    return result;
  };
  const historical = async () => (await database.query('SELECT to_jsonb(d) AS row FROM rund."Docente" d WHERE id=$1',[ids[0]])).rows;
  const ds = new DataSource({ type:'postgres',host:pgConfig.host,port:pgConfig.port,username:pgConfig.user,password:pgConfig.password,
    database:pgConfig.database,entities:[BancoDocenteEntity,BancoDocenteInvitacionEntity],synchronize:false,extra:{max:1} });
  await ds.initialize();
  const source = async route => {
    const res = await fetch(authUrl+'/internal/rund/v1/personas/'+route,{headers:{'x-internal-service-token':authToken}});
    assert.equal(res.status,200);return (await res.json()).data.persona;
  };
  try {
    await database.query(`INSERT INTO auth.personas (id_person,num_identificacion,tip_identificacion,nom_largo,
      nom_tercero,pri_apellido,gen_tercero,fec_nacimiento,dir_email,tel_celular,id_seccional)
      VALUES ($1,$2,'CC','PERSONA FICTICIA APELLIDO','PERSONA','FICTICIA','F','1985-06-15',$3,'3001234567',999)`,[person,document,alternative]);
    for(let i=0;i<ids.length;i++) await database.query(`INSERT INTO rund."Docente"
      SELECT (jsonb_populate_record(NULL::rund."Docente",to_jsonb(d)||jsonb_build_object(
        'id',$1::text,'personaId',$2::text,'periodoCarga',$3::text,'correoInstitucional',$4::text,'correoAlternativo',$5::text,
        'updatedAt',$6::text,'territorialReportada','Territorial Ficticia','estado','ACTIVO'))).*
      FROM rund."Docente" d WHERE id=$7`,[ids[i],person,i?'2026-2':'2025-1',institutional,alternative,i?'2026-01-01':'2025-01-01',docenteId]);
    await database.query(`INSERT INTO rund."RundSoporteCampo" (id,docente_id,bloque,tipo_soporte,documento_carpeta_id)
      VALUES ($1,$2,'TRANSVERSAL','soporte_edicion_perfil','/ficticio-edicion.pdf')`,[support,ids[1]]);
    for(let i=0;i<invites.length;i++) await database.query(`INSERT INTO rund."BancoDocentesInvitaciones"
      (id,correo_institucional,token_acceso,estado,fecha_expiracion,sesion_token_hash,sesion_expira_en)
      VALUES ($1,$2,$3,'OTP validado',now()+interval '2 hours',$4,now()+interval '2 hours')`,
      [invites[i],i?invited:alternative,randomBytes(32).toString('hex'),createHash('sha256').update(sessions[i]).digest('hex')]);

    await check('Identidad edición: caída, ruta ausente o ficha parcial bloquean edición/envío antes de cualquier escritura',async()=>{
      const before = await snapshot();
      try { for(const mode of ['unavailable','missing','partial']) {
        authFixture.setFichaMode(mode);
        await request(editRoute,{method:'PUT',body,status:503});
        await request(submitRoute(0),{token:null,method:'POST',body,status:503});
        await request(submitRoute(1),{token:null,method:'POST',body,status:503});
      } } finally {authFixture.setFichaMode('normal');}
      assert.deepEqual(await snapshot(),before);
    });
    await check('Identidad edición: persona ausente no permite reemplazar cédula del perfil con el body y no gestiona la invitación',async()=>{
      await database.query('UPDATE rund."Docente" SET "personaId"=$2 WHERE id=$1',[ids[1],orphan]);
      try {
        const before=await snapshot();
        await request(editRoute,{method:'PUT',body:{...body,documentNumber:'9999999999'},status:404});
        await request(submitRoute(0),{token:null,method:'POST',body:{...body,documentNumber:'9999999999'},status:404});
        assert.deepEqual(await snapshot(),before);
      } finally {await database.query('UPDATE rund."Docente" SET "personaId"=$2 WHERE id=$1',[ids[1],person]);}
    });
    await check('Identidad edición: cédula, período y soporte ajenos siguen bloqueados sin cambios',async()=>{
      const before=await snapshot();
      for(const patch of [{documentNumber:'9999999999'},{periodoCarga:'2025-1'},{soporteEdicionId:randomUUID()}]) {
        await request(editRoute,{method:'PUT',body:{...body,...patch},status:400});
      }
      assert.deepEqual(await snapshot(),before);
    });
    await check('Identidad edición: invitación nueva no puede apropiarse de un documento con perfil histórico',async()=>{
      const before=await snapshot();
      await request(submitRoute(1),{token:null,method:'POST',body:{documentNumber:document,periodoCarga:'2099-2'},status:403});
      assert.deepEqual(await snapshot(),before);
    });
    await check('Identidad edición: documento exacto ambiguo en Auth falla cerrado sin crear ni actualizar perfiles',async()=>{
      await database.query(`INSERT INTO auth.personas (id_person,num_identificacion,tip_identificacion,nom_largo,nom_tercero,pri_apellido,gen_tercero)
        VALUES ($1,$2,'CC','DUPLICADO FICTICIO','DUPLICADO','FICTICIO','X')`,[duplicate,document]);
      try {
        const before=await snapshot();
        await request(submitRoute(1),{token:null,method:'POST',body:{documentNumber:document},status:503});
        assert.deepEqual(await snapshot(),before);
      } finally {await database.query('DELETE FROM auth.personas WHERE id_person=$1',[duplicate]);}
    });
    await check('Identidad edición: validaciones previas funcionan sin SELECT en Auth; las escrituras quedan separadas',async()=>{
      const role='rund_trusted_'+randomUUID().replace(/-/g,''); assert.match(role,/^[a-z0-9_]+$/);
      await database.query(`CREATE ROLE "${role}" NOLOGIN`);
      try {
        await database.query(`GRANT USAGE ON SCHEMA rund TO "${role}"; GRANT SELECT ON ALL TABLES IN SCHEMA rund TO "${role}"`);
        await ds.query(`SET ROLE "${role}"`);
        await assert.rejects(ds.query('SELECT id_person FROM auth.personas LIMIT 1'),error=>error.code==='42501');
        const s=Object.create(BancoDocentesService.prototype), calls=[];
        s.docenteRepo=ds.getRepository(BancoDocenteEntity); s.invitacionRepo=ds.getRepository(BancoDocenteInvitacionEntity);
        s.dataSource={query:async(sql,params)=>{assert(!/auth\./.test(sql));return ds.query(sql,params);}};
        s.identities={fichaPorPersona:async id=>source('ficha/por-persona/'+encodeURIComponent(id)),
          fichaPorDocumento:async doc=>source('ficha/por-documento/'+encodeURIComponent(doc))};
        s.catalogos={territorialesBanco:async()=>[]};
        s.upsertDocente=async(payload,options)=>{calls.push({payload,options});return {docenteId:ids[1],documentNumber:document};};
        // La prueba de aislamiento termina antes de persistir; las escrituras reales se prueban debajo por HTTP.
        s.invitacionRepo={findOne:options=>ds.getRepository(BancoDocenteInvitacionEntity).findOne(options),save:async value=>value};
        await s.updateDocente(ids[1],{...body,documentNumber:'000.902.000.1'});
        await s.submitFromToken(sessions[0],{...body,documentNumber:'9999999999'});
        assert(calls.every(call=>call.payload.documentNumber===document));
        const count=calls.length;
        await assert.rejects(s.submitFromToken(sessions[1],{documentNumber:document}),error=>error.getStatus()===403);
        assert.equal(calls.length,count);
      } finally {
        await ds.query('RESET ROLE');
        await database.query(`REVOKE SELECT ON ALL TABLES IN SCHEMA rund FROM "${role}"; REVOKE USAGE ON SCHEMA rund FROM "${role}"; DROP ROLE "${role}"`);
      }
    });
    await check('Identidad edición: edición HTTP real conserva documento y perfil histórico, con soporte y auditoría',async()=>{
      const before=await historical();
      const response=await request(editRoute,{method:'PUT',body:{...body,documentNumber:'000.902.000.1'}});
      assert.equal(response.success,true);assert.equal(response.data.docenteId,ids[1]);
      assert.deepEqual(await historical(),before);
      assert.equal((await database.query('SELECT num_identificacion FROM auth.personas WHERE id_person=$1',[person])).rows[0].num_identificacion,document);
      const logs=(await database.query(`SELECT * FROM rund."RundAprobacionLog" WHERE docente_id=$1 AND accion='EDITAR'`,[ids[1]])).rows;
      assert(logs.some(log=>log.soporte_id===support));
    });
    await check('Identidad edición: envío OTP real usa cédula/correo confiables, descarta puntaje y gestiona solo su invitación',async()=>{
      const before=await historical();
      const response=await request(submitRoute(0),{token:null,method:'POST',status:201,
        body:{...body,documentNumber:'9999999999',DOCUMENTO_IDENTIDAD:'9999999999',correoInstitucional:'ajeno@example.test',
          CORREO_INSTITUCIONAL:'ajeno@example.test',puntajeSalarial:999999,PUNTAJE_SALARIAL:999999,telefono:'3007654321'}});
      assert.equal(response.success,true);assert.equal(response.data.docenteId,ids[1]);
      assert.notEqual(response.data.documentNumber,document);assert(!JSON.stringify(response).includes(document));
      const current=(await database.query('SELECT * FROM rund."Docente" WHERE id=$1',[ids[1]])).rows[0];
      assert.equal(current.correoInstitucional,institutional);assert.equal(current.puntajeSalarial,145.5);
      assert.equal((await database.query('SELECT num_identificacion FROM auth.personas WHERE id_person=$1',[person])).rows[0].num_identificacion,document);
      assert.deepEqual(await historical(),before);
      const states=(await database.query('SELECT id,estado FROM rund."BancoDocentesInvitaciones" WHERE id=ANY($1::uuid[])',[invites])).rows;
      assert.equal(states.find(item=>item.id===invites[0]).estado,'Gestionada');
      assert.equal(states.find(item=>item.id===invites[1]).estado,'OTP validado');
      const logs=(await database.query(`SELECT * FROM rund."RundAprobacionLog" WHERE docente_id=$1`,[ids[1]])).rows;
      assert(logs.some(log=>log.soporte_id===invites[0]));
    });
  } finally {
    authFixture.setFichaMode('normal'); await ds.destroy();
    await database.query('DELETE FROM rund."BancoDocentesInvitaciones" WHERE id=ANY($1::uuid[])',[invites]);
    for(const table of ['RundSoporteCampo','RundCampoEstado','validacion_documental']) {
      await database.query(`DELETE FROM rund."${table}" WHERE docente_id=ANY($1::text[])`,[ids]);
    }
    await database.query('DELETE FROM rund."Docente" WHERE id=ANY($1::text[])',[ids]);
    await database.query('DELETE FROM auth.user_roles WHERE id_user IN (SELECT id_user FROM auth."user" WHERE id_person=$1)',[person]);
    await database.query('DELETE FROM auth."user" WHERE id_person=$1',[person]);
    await database.query('DELETE FROM auth.personas WHERE id_person=ANY($1::uuid[])',[[person,duplicate]]);
  }
};
