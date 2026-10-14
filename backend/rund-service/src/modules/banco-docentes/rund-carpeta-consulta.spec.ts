import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { RundCarpetaConsultaService } from './rund-carpeta-consulta.service';
import { RundCarpetaInternalController, RundCarpetaInternalGuard } from './rund-carpeta-internal.controller';

const persona = '11111111-1111-4111-8111-111111111111';
const document = { id: '22222222-2222-4222-8222-222222222222', docente_id: 'docente-textual',
  rund_soporte_id: 'soporte-1', nombre_archivo: 'Identidad-10203040.pdf', categoria: 'IDENTIDAD',
  bloque: 'IDENTIDAD', tipo_soporte: 'DOCUMENTO_IDENTIDAD', version: 2, total_versiones: 2,
  documento_logico_id: 'logico-1', tamano_bytes: 200, estado_revision: 'Aceptado',
  observacion: 'Datos sensibles', createdAt: '2026-10-13T12:00:00Z' };

describe('API interna de Carpeta Digital: credencial, JWT y proyección del propietario', () => {
  let app: INestApplication;
  let query: jest.Mock;
  const jwt = new JwtService({ secret: 'solo-fixture-carpeta' });
  const oldToken = process.env.RUND_CARPETA_INTERNAL_TOKEN;
  const oldInternal = process.env.INTERNAL_SERVICE_TOKEN;
  const route = `/internal/carpeta-digital/personas/${persona}/documentos`;
  beforeAll(async () => {
    const module = await Test.createTestingModule({ controllers: [RundCarpetaInternalController],
      providers: [RundCarpetaInternalGuard, RundCarpetaConsultaService,
        { provide: JwtService, useValue: jwt },
        { provide: DataSource, useValue: { query: (...args: any[]) => query(...args) } }],
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });
  beforeEach(() => {
    process.env.RUND_CARPETA_INTERNAL_TOKEN = 'credencial-ficticia';
    delete process.env.INTERNAL_SERVICE_TOKEN;
    query = jest.fn(async sql => sql.includes('FROM rund."RundDocumentoPerfil" dp') ? [document] : []);
  });
  afterAll(async () => {
    await app.close();
    for (const [key, value] of [['RUND_CARPETA_INTERNAL_TOKEN', oldToken], ['INTERNAL_SERVICE_TOKEN', oldInternal]]) {
      if (value === undefined) delete process.env[key!]; else process.env[key!] = value;
    }
  });

  it.each([undefined, 'incorrecta'])('rechaza credencial %s incluso con JWT SUPER_ADMIN', async token => {
    let call = request(app.getHttpServer()).post(route).set('Authorization', `Bearer ${jwt.sign({ sub: 'admin', roles: ['SUPER_ADMIN'] })}`);
    if (token) call = call.set('X-Rund-Carpeta-Token', token);
    await call.send({}).expect(401);
    expect(query).not.toHaveBeenCalled();
  });
  it('falla cerrado si no se configuró credencial interna', async () => {
    delete process.env.RUND_CARPETA_INTERNAL_TOKEN;
    await request(app.getHttpServer()).post(route).send({}).expect(503);
    expect(query).not.toHaveBeenCalled();
  });
  it('admite INTERNAL_SERVICE_TOKEN explícito como alternativa', async () => {
    delete process.env.RUND_CARPETA_INTERNAL_TOKEN;
    process.env.INTERNAL_SERVICE_TOKEN = 'compartida-ficticia';
    await request(app.getHttpServer()).post(route).set('X-Rund-Carpeta-Token', 'compartida-ficticia').send({}).expect(200);
  });
  it.each(['DOCENTE', 'ADMIN', 'CONSULTOR', 'GESTION_PROFESORAL', 'SUPER_ADMIN'])('respeta la visibilidad firmada de %s', async role => {
    const full = ['GESTION_PROFESORAL', 'SUPER_ADMIN'].includes(role);
    const result = await request(app.getHttpServer()).post(route).set('X-Rund-Carpeta-Token', 'credencial-ficticia')
      .send({ userToken: jwt.sign({ sub: 'usuario-ficticio', roles: [role], permissions: ['banco-docentes.rund.manage'] }) }).expect(200);
    expect(result.headers['cache-control']).toBe('private, no-store');
    const doc = result.body.data[0];
    expect(doc).toMatchObject({ id: `rund-service:documento:${document.id}`, persona_id: persona,
      servicio_propietario: 'rund', version_actual: 2, total_versiones: 2, estado: 'validado', contenido_restringido: !full });
    expect(doc.nombre).toBe(full ? document.nombre_archivo : 'Documento del perfil');
    expect(doc.comentarios).toBe(full ? document.observacion : null);
    expect(doc.url_archivo).toBe(full ? `/rund/api/v1/pta/banco-docentes/docente-textual/documentos/${document.id}/contenido` : null);
    const audit = query.mock.calls.find(([sql]) => sql.includes('INSERT INTO rund."RundAccesoDatosLog"'));
    expect(audit![1][1]).toBe('usuario-ficticio');
    expect(audit![1][7]).toBe(full ? 'COMPLETO' : 'ENMASCARADO');
  });
  it.each([
    { user: { sub: 'admin', roles: ['SUPER_ADMIN'] }, roles: ['SUPER_ADMIN'], fullAccess: true },
    { userToken: 'token-invalido', user: { roles: ['SUPER_ADMIN'] } },
    { userToken: jwt.sign({ sub: 'admin', roles: ['SUPER_ADMIN'] }, { expiresIn: -1 }) },
    { userToken: new JwtService({ secret: 'otro-secreto-ficticio' }).sign({ sub: 'admin', roles: ['SUPER_ADMIN'] }) },
  ])('no eleva identidad sin una sesión válida: %j', async body => {
    const result = await request(app.getHttpServer()).post(route).set('X-Rund-Carpeta-Token', 'credencial-ficticia').send(body).expect(200);
    expect(result.body.data[0]).toMatchObject({ nombre: 'Documento del perfil', url_archivo: null, contenido_restringido: true });
    expect(query.mock.calls.find(([sql]) => sql.startsWith('INSERT'))![1][1]).toBe('NO_AUTENTICADO');
  });
  it.each([{}, 1, 'x'.repeat(16385)])('rechaza formato de sesión inválido', async userToken => {
    await request(app.getHttpServer()).post(route).set('X-Rund-Carpeta-Token', 'credencial-ficticia').send({ userToken }).expect(400);
    expect(query).not.toHaveBeenCalled();
  });
  it('no entrega documentos sensibles cuando falla su auditoría', async () => {
    query.mockImplementation(async sql => {
      if (sql.startsWith('INSERT')) throw new Error('Sin auditoría');
      return sql.includes('RundDocumentoPerfil') ? [document] : [];
    });
    const result = await request(app.getHttpServer()).post(route).set('X-Rund-Carpeta-Token', 'credencial-ficticia')
      .send({ userToken: jwt.sign({ sub: 'admin', roles: ['SUPER_ADMIN'] }) }).expect(503);
    expect(JSON.stringify(result.body)).not.toContain(document.nombre_archivo);
  });

  it('consulta una versión vigente por ID con el mismo enmascaramiento y credencial', async () => {
    query.mockImplementation(async sql => sql.includes('AS persona_id') ? [{ persona_id: persona }]
      : sql.includes('FROM rund."RundDocumentoPerfil" dp') ? [document] : []);
    const endpoint = `/internal/carpeta-digital/documentos/documento/${document.id}`;
    await request(app.getHttpServer()).post(endpoint).send({}).expect(401);
    const result = await request(app.getHttpServer()).post(endpoint).set('X-Rund-Carpeta-Token', 'credencial-ficticia').send({}).expect(200);
    expect(result.body.data.id).toBe(`rund-service:documento:${document.id}`);
    expect(result.body.data.url_archivo).toBeNull();
  });
  it('un tipo de recurso arbitrario no puede elegir tablas o ejecutar SQL', async () => {
    await request(app.getHttpServer()).post(`/internal/carpeta-digital/documentos/otra-tabla/${document.id}`)
      .set('X-Rund-Carpeta-Token', 'credencial-ficticia').send({}).expect(400);
    expect(query).not.toHaveBeenCalled();
  });
});

describe('consulta documental: identidad y versiones sin copias', () => {
  it('un identificador distinto del UUID de persona no consulta tablas', async () => {
    const db = { query: jest.fn() };
    const service = new RundCarpetaConsultaService(db as any);
    await expect(service.list('10203040', { actorId: 'admin', roles: [], fullAccess: false })).rejects.toThrow('UUID');
    expect(db.query).not.toHaveBeenCalled();
  });
  it('conserva soportes sin versionado sin inventar historial ni confundir IDs', async () => {
    const support = { ...document, documento_carpeta_id: '/rund/api/v1/uploads/carpeta-digital/file.pdf' };
    const db = { query: jest.fn(async sql => sql.includes('SELECT s.id, s.docente_id') ? [support] : []) };
    const service = new RundCarpetaConsultaService(db as any);
    const docs = await service.list(persona, { actorId: 'ggp', roles: ['GESTION_PROFESORAL'], fullAccess: true });
    expect(docs[0]).toMatchObject({ id: `rund-service:soporte:${document.id}`, rund_documento_id: null,
      version_actual: null, total_versiones: null, versionado_disponible: false, url_archivo: support.documento_carpeta_id });
    expect(db.query.mock.calls.some(([sql]) => sql.includes('academic_work_plan'))).toBe(false);
  });
  it('una persona sin documentos tiene listado vacío legítimo', async () => {
    const db = { query: jest.fn().mockResolvedValue([]) };
    const service = new RundCarpetaConsultaService(db as any);
    expect(await service.list(persona, { actorId: 'anon', roles: [], fullAccess: false })).toEqual([]);
    expect(db.query).toHaveBeenCalledTimes(2);
  });
});
