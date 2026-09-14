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
import { BancoDocentesController } from './banco-docentes.controller';
import { BancoDocentesService } from './banco-docentes.service';
import { DocumentTypeValidatorService } from './document-type-validator.service';
import { RUND_PERMISSIONS } from './rund-permissions';
import { RundPtaConsultaController } from './rund-pta-consulta.controller';
import { RundPtaConsultaService } from './rund-pta-consulta.service';

describe('REQ-RUND-F015: HTTP, JWT real, RBAC y contrato PTA', () => {
  let app: INestApplication;
  const secret = randomUUID();
  const jwt = new JwtService({ secret });
  const base = '/pta/api/v1/rund/interoperabilidad/perfiles';
  const actorId = '11111111-1111-4111-8111-111111111111';
  const docenteId = '22222222-2222-4222-8222-222222222222';
  const cedula = '001020304050';
  const oldSecret = process.env.JWT_SECRET;
  const oldPublicPaths = process.env.JWT_PUBLIC_PATHS;
  let rows: any[];
  let failAudit: boolean;
  const query = jest.fn(async (sql: string, params?: any[]) => {
    if (sql.includes('auth.role_permissions')) {
      return params?.[0].includes('CONSULTOR_PTA') ? [{ code: RUND_PERMISSIONS.VIEW }] : [];
    }
    if (sql.includes('INSERT INTO')) {
      if (failAudit) throw new Error('audit unavailable');
      return [];
    }
    return rows;
  });
  const legacyProfile = { docente_id: docenteId, documento_identidad: cedula, puntaje_salarial: 145.5 };
  const legacyService = {
    getById: jest.fn().mockResolvedValue(legacyProfile),
    logSensitiveDataAccess: jest.fn().mockResolvedValue(undefined),
  };
  const token = (roles = ['SUPER_ADMIN'], options: any = {}) => jwt.sign({ sub: actorId, roles }, { expiresIn: '5m', ...options });

  beforeAll(async () => {
    process.env.JWT_SECRET = secret;
    // Prueba deliberada: esta ruta debe exigir JWT aunque el guard global la omita.
    process.env.JWT_PUBLIC_PATHS = 'rund/interoperabilidad';
    const module = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
      controllers: [RundPtaConsultaController, BancoDocentesController],
      providers: [
        JwtStrategy, RundPtaConsultaService,
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: DataSource, useValue: { query } },
        { provide: BancoDocentesService, useValue: legacyService },
        { provide: DocumentTypeValidatorService, useValue: {} },
      ],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('pta/api/v1'); // Prefijo público que el gateway retira en producción.
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    if (oldSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = oldSecret;
    if (oldPublicPaths === undefined) delete process.env.JWT_PUBLIC_PATHS; else process.env.JWT_PUBLIC_PATHS = oldPublicPaths;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    failAudit = false;
    rows = [{
      docente_id: docenteId, nombre_completo: 'DOCENTE DE PRUEBA',
      perfil_academico: 'Administración pública', perfil_academico_profesional: 'Docencia', nivel_formacion: 'Maestría',
      categoria: 'ASOCIADO', territorial_id: 'territorial-prueba', territorial_nombre: 'Meta', territorial_codigo: '50',
      horas_programables: 720, estado_vinculacion: 'ACTIVO', tipo_vinculacion: 'CARRERA', periodo: '2026-2',
      // Aunque se amplíe el origen por error, estos campos nunca pueden salir.
      documento_identidad: cedula, puntaje_salarial: 145.5, salario: 9999999,
      telefono: '3000000000', nacimiento: '1980-01-01', observaciones: 'Información privada',
      dato_nuevo: { puntajeSalarial: 145.5 },
    }];
  });

  it.each(['SUPER_ADMIN', 'GESTION_PROFESORAL', 'ADMIN', 'CONSULTOR_PTA'])(
    '200: contrato mínimo sin sensibles incluso para %s', async (role) => {
      const response = await request(app.getHttpServer()).get(`${base}/${cedula}?periodo=2026-2`)
        .auth(token([role]), { type: 'bearer' }).expect(200);
      expect(response.headers['cache-control']).toContain('no-store');
      expect(response.body).toEqual({ success: true, data: {
        docente_id: docenteId,
        perfil: { nombre_completo: 'DOCENTE DE PRUEBA', perfil_academico: 'Administración pública', perfil_academico_profesional: 'Docencia', nivel_formacion: 'Maestría' },
        categoria: 'ASOCIADO', territorial: { id: 'territorial-prueba', nombre: 'Meta', codigo: '50' },
        horas_programables: 720, estado_vinculacion: 'ACTIVO', tipo_vinculacion: 'CARRERA', periodo: '2026-2',
      } });
      const [sql, params] = query.mock.calls.find(([sql]) => sql.includes('FROM academic_work_plan'))!;
      expect(params).toEqual([cedula, '2026-2']);
      expect(sql.split('FROM academic_work_plan')[0]).not.toMatch(/puntaje|salario|num_identificacion|SELECT\s+\*/i);
      const auditParams = query.mock.calls.find(([sql]) => sql.includes('INSERT INTO'))![1]!;
      expect(auditParams).toEqual([
        expect.any(String), actorId, [role], 'RUND_PTA_CONSULTA_PERFIL_V1', null,
        [docenteId], ['DOCUMENTO_IDENTIDAD'], 'ENMASCARADO', expect.any(String),
      ]);
      expect(JSON.stringify(auditParams)).not.toContain(cedula);
    },
  );

  it('conserva la consulta general de RUND y su acceso completo para GGP', async () => {
    const response = await request(app.getHttpServer()).get(`/pta/api/v1/pta/banco-docentes/${docenteId}`)
      .auth(token(['GESTION_PROFESORAL']), { type: 'bearer' }).expect(200);
    expect(response.body.data).toMatchObject(legacyProfile);
    expect(legacyService.getById).toHaveBeenCalledWith(docenteId, undefined);
  });

  it('404: cédula inexistente informa Flujo 1 sin reflejar el documento', async () => {
    rows = [];
    const response = await request(app.getHttpServer()).get(`${base}/${cedula}`)
      .auth(token(), { type: 'bearer' }).expect(404);
    expect(response.body).toMatchObject({ statusCode: 404, code: 'RUND_DOCENTE_NO_ENCONTRADO', flujo_alta: 'FLUJO_1' });
    expect(response.text).not.toContain(cedula);
    expect(query.mock.calls.some(([sql]) => sql.includes('INSERT INTO'))).toBe(true);
  });

  it('404: periodo sin registro no recomienda crear un docente duplicado', async () => {
    const response = await request(app.getHttpServer()).get(`${base}/${cedula}?periodo=2025-1`)
      .auth(token(), { type: 'bearer' }).expect(404);
    expect(response.body).toMatchObject({ code: 'RUND_DOCENTE_SIN_PERIODO', flujo_alta: null });
    expect(response.body.data).toBeUndefined();
  });

  it('sin periodo entrega el registro seleccionado, incluidos inactivos y cero horas', async () => {
    rows[0].estado_vinculacion = 'RETIRADO';
    rows[0].horas_programables = 0;
    rows[0].categoria = null;
    rows[0].territorial_nombre = null;
    const response = await request(app.getHttpServer()).get(`${base}/${cedula}`)
      .auth(token(), { type: 'bearer' }).expect(200);
    expect(response.body.data).toMatchObject({ estado_vinculacion: 'RETIRADO', horas_programables: 0, categoria: null, territorial: { nombre: null } });
    expect(query.mock.calls.find(([sql]) => sql.includes('FROM academic_work_plan'))![1]).toEqual([cedula, null]);
  });

  it.each(['sin_token', 'malformado', 'vencido', 'firma_invalida', 'sin_sujeto'])(
    '401: rechaza %s antes de consultar la base', async (kind) => {
      const tokens: Record<string, string> = {
        malformado: 'no-es-jwt', vencido: token(undefined, { expiresIn: -1 }),
        firma_invalida: new JwtService({ secret: randomUUID() }).sign({ sub: actorId, roles: ['SUPER_ADMIN'] }),
        sin_sujeto: jwt.sign({ roles: ['SUPER_ADMIN'] }),
      };
      const call = request(app.getHttpServer()).get(`${base}/${cedula}`);
      if (tokens[kind]) call.auth(tokens[kind], { type: 'bearer' });
      await call.expect(401);
      expect(query).not.toHaveBeenCalled();
    },
  );

  it.each(['DOCENTE', 'CONSULTOR_SIN_PERMISOS'])(
    '403: %s no puede consultar otros docentes sin permiso RUND', async (role) => {
      await request(app.getHttpServer()).get(`${base}/${cedula}`).auth(token([role]), { type: 'bearer' }).expect(403);
      expect(query.mock.calls.every(([sql]) => sql.includes('auth.role_permissions'))).toBe(true);
    },
  );

  it.each(['abc', '123.456', '11111111-1111-4111-8111-111111111111', '1'.repeat(21), "1' OR 1=1"])(
    '400: rechaza cédula inválida %s sin consultas', async (value) => {
      await request(app.getHttpServer()).get(`${base}/${encodeURIComponent(value)}`).auth(token(), { type: 'bearer' }).expect(400);
      expect(query).not.toHaveBeenCalled();
    },
  );

  it.each(['', '2026-3', '2026', '2026-1&periodo=2026-2'])(
    '400: rechaza periodo inválido o repetido %s', async (value) => {
      await request(app.getHttpServer()).get(`${base}/${cedula}?periodo=${value}`).auth(token(), { type: 'bearer' }).expect(400);
      expect(query).not.toHaveBeenCalled();
    },
  );

  it('503: no entrega el perfil si no se puede auditar la consulta', async () => {
    failAudit = true;
    const response = await request(app.getHttpServer()).get(`${base}/${cedula}`).auth(token(), { type: 'bearer' }).expect(503);
    expect(response.body.data).toBeUndefined();
    expect(response.text).not.toContain(cedula);
  });
});
