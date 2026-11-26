import { INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { JwtStrategy } from '../../auth/jwt.strategy';
import { RUND_HISTORIAL_PERMISSION } from './rund-historial-academico';
import { RundHistorialAcademicoController } from './rund-historial-academico.controller';
import { RundHistorialAcademicoService } from './rund-historial-academico.service';
import { RUND_PERMISSIONS } from './rund-permissions';
import { RUND_PROFILE_PERMISSIONS } from './rund-permission-policy';

describe('REQ-RUND-F016: HTTP, JWT real, RBAC e idempotencia del historial que escribe el PTA', () => {
  let app: INestApplication;
  const secret = randomUUID();
  const jwt = new JwtService({ secret });
  const base = '/pta/api/v1/rund/interoperabilidad/historial';
  const actorId = '11111111-1111-4111-8111-111111111111';
  const docenteId = '22222222-2222-4222-8222-222222222222';
  const ptaId = '33333333-3333-4333-8333-333333333333';
  const cedula = '001020304050';
  const oldSecret = process.env.JWT_SECRET;
  let docentes: any[];
  let pta: any[];
  let failAudit: boolean;
  let failInsert: boolean;
  const claves = new Set<string>();
  let almacenado: any[];
  const query = jest.fn(async (sql: string, params?: any[]) => {
    if (sql.includes('auth.role_permissions')) {
      const roles: string[] = params?.[0] ?? [];
      const codes: string[] = [];
      if (roles.includes('PTA_SISTEMA')) codes.push(RUND_HISTORIAL_PERMISSION);
      if (roles.includes('GESTION_PROFESORAL')) codes.push(RUND_PERMISSIONS.MANAGE, RUND_PERMISSIONS.VIEW);
      if (roles.includes('CONSULTA_RUND')) codes.push(RUND_PROFILE_PERMISSIONS.CONSULTA);
      return codes.map((code) => ({ code }));
    }
    if (sql.includes('INSERT INTO academic_work_plan."RundAccesoDatosLog"')) {
      if (failAudit) throw new Error('audit unavailable');
      return [];
    }
    if (sql.includes('INSERT INTO academic_work_plan."RundHistorialAcademico"')) {
      if (failInsert) throw new Error("db caída");
      const clave = params![0];
      const creado = !claves.has(clave);
      claves.add(clave);
      return [{ creado }];
    }
    if (sql.includes('FROM academic_work_plan."PlanTrabajoAcademico"')) return pta;
    if (sql.includes('FROM academic_work_plan."RundHistorialAcademico"')) return almacenado;
    if (sql.includes('FROM academic_work_plan."Docente"')) return docentes;
    return [];
  });
  const token = (roles: string[]) => jwt.sign({ sub: actorId, roles }, { expiresIn: '5m' });
  const cuerpo = (extra: Record<string, unknown> = {}) => ({
    periodo: '2026-2', estado_pta: 'En Firme',
    registros: [{ setup: 'CETAP Villavicencio', territorial: 'Meta', programa: 'Administración Pública', asignatura: 'Gestión Pública', asignatura_codigo: 'GP-101', nucleo_tematico: 'Gestión' }],
    ...extra,
  });
  const insertCount = () => query.mock.calls.filter(([sql]) => sql.includes('INSERT INTO academic_work_plan."RundHistorialAcademico"')).length;

  beforeAll(async () => {
    process.env.JWT_SECRET = secret;
    const module = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
      controllers: [RundHistorialAcademicoController],
      providers: [
        JwtStrategy, RundHistorialAcademicoService,
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: DataSource, useValue: { query, transaction: (cb: any) => cb({ query }) } },
      ],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('pta/api/v1');
    await app.init();
  });
  afterAll(async () => {
    await app?.close();
    if (oldSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = oldSecret;
  });
  beforeEach(() => {
    jest.clearAllMocks();
    claves.clear();
    failAudit = false;
    failInsert = false;
    docentes = [{ id: docenteId, periodo: '2026-2', nucleo: 'Núcleo del docente' }];
    pta = [{ id: ptaId, docente_id: docenteId, periodo: '2026-2', estado: 'EN_FIRME' }];
    almacenado = [];
  });

  it('CA-1: un PTA En Firme se almacena asociado al docente por cédula y con trazabilidad', async () => {
    const res = await request(app.getHttpServer()).post(`${base}/${cedula}`).auth(token(['PTA_SISTEMA']), { type: 'bearer' }).send(cuerpo({ pta_id: ptaId })).expect(200);
    expect(res.body).toEqual({ success: true, data: { docente_id: docenteId, periodo: '2026-2', recibidos: 1, creados: 1, actualizados: 0 } });
    expect(res.headers['cache-control']).toContain('no-store');
    const [, params] = query.mock.calls.find(([sql]) => sql.includes('INSERT INTO academic_work_plan."RundHistorialAcademico"'))!;
    expect(params).toEqual([expect.stringMatching(/^[0-9a-f]{64}$/), docenteId, cedula, '2026-2', 'CETAP Villavicencio', 'Meta', 'Administración Pública', 'GP-101', 'Gestión Pública', 'Gestión', ptaId, actorId, ['PTA_SISTEMA'], expect.anything()]);
    const audit = query.mock.calls.find(([sql]) => sql.includes('RundAccesoDatosLog'))![1]!;
    expect(audit).toEqual(expect.arrayContaining(['RUND_PTA_HISTORIAL_ESCRITURA_V1']));
    expect(JSON.stringify(audit)).not.toContain(cedula);
  });

  it('sin pta_id: guarda con ptaId null y no consulta la tabla de PTA', async () => {
    await request(app.getHttpServer()).post(`${base}/${cedula}`).auth(token(['PTA_SISTEMA']), { type: 'bearer' }).send(cuerpo()).expect(200);
    const [, params] = query.mock.calls.find(([sql]) => sql.includes('INSERT INTO academic_work_plan."RundHistorialAcademico"'))!;
    expect(params![10]).toBeNull();
    expect(query.mock.calls.some(([sql]) => sql.includes('"PlanTrabajoAcademico"'))).toBe(false);
  });

  it('un fallo al guardar responde 500 y no audita como si hubiera escrito', async () => {
    failInsert = true;
    await request(app.getHttpServer()).post(`${base}/${cedula}`).auth(token(['PTA_SISTEMA']), { type: 'bearer' }).send(cuerpo()).expect(500);
    expect(query.mock.calls.some(([sql]) => sql.includes('RundAccesoDatosLog'))).toBe(false);
  });

  it('el núcleo temático faltante se toma del docente en RUND', async () => {
    const body = cuerpo(); delete (body.registros[0] as any).nucleo_tematico;
    await request(app.getHttpServer()).post(`${base}/${cedula}`).auth(token(['SUPER_ADMIN']), { type: 'bearer' }).send(body).expect(200);
    const [, params] = query.mock.calls.find(([sql]) => sql.includes('INSERT INTO academic_work_plan."RundHistorialAcademico"'))!;
    expect(params![9]).toBe('Núcleo del docente');
  });

  it('CA-2: un PTA que no está En Firme no se acepta y no escribe nada', async () => {
    for (const estado of ['BORRADOR', 'Aprobado', 'RADICADO', 'EN_EJECUCION']) {
      const res = await request(app.getHttpServer()).post(`${base}/${cedula}`).auth(token(['PTA_SISTEMA']), { type: 'bearer' }).send(cuerpo({ estado_pta: estado })).expect(422);
      expect(res.body.code).toBe('RUND_HISTORIAL_PTA_NO_EN_FIRME');
    }
    expect(insertCount()).toBe(0);
  });

  it('el estado real del PTA en base de datos manda sobre lo que declare el cliente', async () => {
    pta = [{ id: ptaId, docente_id: docenteId, periodo: '2026-2', estado: 'APROBADO' }];
    const res = await request(app.getHttpServer()).post(`${base}/${cedula}`).auth(token(['PTA_SISTEMA']), { type: 'bearer' }).send(cuerpo({ pta_id: ptaId })).expect(422);
    expect(res.body.code).toBe('RUND_HISTORIAL_PTA_NO_EN_FIRME');
    expect(insertCount()).toBe(0);
  });

  it('pta_id inexistente 404, de otro periodo 409, de otro docente 409, no UUID 400', async () => {
    pta = [];
    expect((await request(app.getHttpServer()).post(`${base}/${cedula}`).auth(token(['PTA_SISTEMA']), { type: 'bearer' }).send(cuerpo({ pta_id: ptaId })).expect(404)).body.code).toBe('RUND_HISTORIAL_PTA_NO_ENCONTRADO');
    pta = [{ id: ptaId, docente_id: docenteId, periodo: '2026-1', estado: 'EN_FIRME' }];
    expect((await request(app.getHttpServer()).post(`${base}/${cedula}`).auth(token(['PTA_SISTEMA']), { type: 'bearer' }).send(cuerpo({ pta_id: ptaId })).expect(409)).body.code).toBe('RUND_HISTORIAL_PERIODO_NO_COINCIDE');
    pta = [{ id: ptaId, docente_id: 'otro-docente', periodo: '2026-2', estado: 'EN_FIRME' }];
    expect((await request(app.getHttpServer()).post(`${base}/${cedula}`).auth(token(['PTA_SISTEMA']), { type: 'bearer' }).send(cuerpo({ pta_id: ptaId })).expect(409)).body.code).toBe('RUND_HISTORIAL_DOCENTE_NO_COINCIDE');
    expect((await request(app.getHttpServer()).post(`${base}/${cedula}`).auth(token(['PTA_SISTEMA']), { type: 'bearer' }).send(cuerpo({ pta_id: 'no-uuid' })).expect(400)).body.code).toBe('RUND_HISTORIAL_PTA_ID_INVALIDO');
    expect(insertCount()).toBe(0);
  });

  it('es idempotente: reenviar el mismo periodo no duplica y cuenta como actualizado', async () => {
    const enviar = () => request(app.getHttpServer()).post(`${base}/${cedula}`).auth(token(['PTA_SISTEMA']), { type: 'bearer' }).send(cuerpo()).expect(200);
    expect((await enviar()).body.data).toMatchObject({ creados: 1, actualizados: 0 });
    expect((await enviar()).body.data).toMatchObject({ creados: 0, actualizados: 1 });
    expect(claves.size).toBe(1);
  });

  it('varias asignaturas en un envío: las repetidas se consolidan', async () => {
    const r = cuerpo().registros[0];
    const res = await request(app.getHttpServer()).post(`${base}/${cedula}`).auth(token(['PTA_SISTEMA']), { type: 'bearer' })
      .send(cuerpo({ registros: [r, { ...r }, { ...r, asignatura: 'Ética', asignatura_codigo: 'ET-1' }] })).expect(200);
    expect(res.body.data).toMatchObject({ recibidos: 2, creados: 2 });
  });

  it('docente inexistente: 404 con Flujo 1 y sin escribir', async () => {
    docentes = [];
    const res = await request(app.getHttpServer()).post(`${base}/${cedula}`).auth(token(['PTA_SISTEMA']), { type: 'bearer' }).send(cuerpo()).expect(404);
    expect(res.body).toMatchObject({ code: 'RUND_DOCENTE_NO_ENCONTRADO', flujo_alta: 'FLUJO_1' });
    expect(insertCount()).toBe(0);
  });

  it('validaciones: cédula, periodo, cuerpo y registros → 400', async () => {
    const post = (url: string, body: unknown) => request(app.getHttpServer()).post(url).auth(token(['PTA_SISTEMA']), { type: 'bearer' }).send(body as any);
    expect((await post(`${base}/12.345`, cuerpo()).expect(400)).body.code).toBe('RUND_CEDULA_INVALIDA');
    expect((await post(`${base}/${cedula}`, cuerpo({ periodo: '2026-3' })).expect(400)).body.code).toBe('RUND_PERIODO_INVALIDO');
    expect((await post(`${base}/${cedula}`, cuerpo({ estado_pta: undefined })).expect(400)).body.code).toBe('RUND_HISTORIAL_ESTADO_REQUERIDO');
    expect((await post(`${base}/${cedula}`, cuerpo({ registros: [] })).expect(400)).body.code).toBe('RUND_HISTORIAL_REGISTROS_REQUERIDOS');
    expect((await post(`${base}/${cedula}`, cuerpo({ registros: [{ programa: 'P' }] })).expect(400)).body.code).toBe('RUND_HISTORIAL_REGISTRO_INVALIDO');
    expect((await post(`${base}/${cedula}`, []).expect(400)).body.code).toBe('RUND_HISTORIAL_CUERPO_INVALIDO');
    expect(insertCount()).toBe(0);
  });

  it('autorización: sin token 401; GGP, ADMIN y Consulta RUND no pueden escribir (403)', async () => {
    await request(app.getHttpServer()).post(`${base}/${cedula}`).send(cuerpo()).expect(401);
    for (const rol of ['GESTION_PROFESORAL', 'ADMIN', 'CONSULTA_RUND', 'DOCENTE']) {
      await request(app.getHttpServer()).post(`${base}/${cedula}`).auth(token([rol]), { type: 'bearer' }).send(cuerpo()).expect(403);
    }
    await request(app.getHttpServer()).post(`${base}/${cedula}`).auth(token(['SUPER_ADMIN']), { type: 'bearer' }).send(cuerpo()).expect(200);
    expect(insertCount()).toBe(1);
  });

  it('si la auditoría falla se responde 503 (la transacción real se revierte)', async () => {
    failAudit = true;
    await request(app.getHttpServer()).post(`${base}/${cedula}`).auth(token(['PTA_SISTEMA']), { type: 'bearer' }).send(cuerpo()).expect(503);
  });

  it('GET: GGP consulta el historial por cédula sin exponer la cédula; el sistema PTA solo escribe', async () => {
    almacenado = [{ id: 'h1', docente_id: docenteId, periodo: '2026-2', setup: 'CETAP', territorial: 'Meta', programa: 'P', asignatura_codigo: 'C', asignatura: 'A', nucleo_tematico: 'N', pta_id: ptaId, recibido_veces: 2, registrado_por: actorId, ultimo_registrado_por: actorId, creado: new Date(), actualizado: new Date(), cedula }];
    const res = await request(app.getHttpServer()).get(`${base}/${cedula}?periodo=2026-2`).auth(token(['GESTION_PROFESORAL']), { type: 'bearer' }).expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({ docente_id: docenteId, periodo: '2026-2', programa: 'P', asignatura: 'A', recibido_veces: 2 });
    expect(JSON.stringify(res.body)).not.toContain(cedula);
    await request(app.getHttpServer()).get(`${base}/${cedula}?periodo=2026-9`).auth(token(['GESTION_PROFESORAL']), { type: 'bearer' }).expect(400);
    await request(app.getHttpServer()).get(`${base}/${cedula}`).auth(token(['PTA_SISTEMA']), { type: 'bearer' }).expect(403);
  });
});
