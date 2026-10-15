import { INestApplication, ServiceUnavailableException } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
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
import { AuthIdentityClient } from '../../common/auth-identity.client';
import { RundCatalogosClient } from '../../common/rund-catalogos.client';

describe('REQ-RUND-F015: HTTP, JWT real, RBAC y contrato PTA', () => {
  let app: INestApplication;
  const secret = randomUUID();
  const jwt = new JwtService({ secret });
  const base = '/pta/api/v1/rund/interoperabilidad/perfiles';
  const actorId = '11111111-1111-4111-8111-111111111111';
  const docenteId = '22222222-2222-4222-8222-222222222222';
  const cedula = '001020304050';
  const personaId = '33333333-3333-4333-8333-333333333333';
  const identities = { perfilPta: jest.fn(), permisosRoles: jest.fn(async (roles: string[]) =>
    roles.includes('CONSULTOR_PTA') ? [RUND_PERMISSIONS.VIEW] : []) };
  const catalogos = { territorialesBanco: jest.fn() };
  const oldSecret = process.env.JWT_SECRET;
  const oldPublicPaths = process.env.JWT_PUBLIC_PATHS;
  let rows: any[];
  let failAudit: boolean;
  const query = jest.fn(async (sql: string, params?: any[]) => {
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
      imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }), PassportModule.register({ defaultStrategy: 'jwt' })],
      controllers: [RundPtaConsultaController, BancoDocentesController],
      providers: [
        JwtStrategy, RundPtaConsultaService,
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: DataSource, useValue: { query } },
        { provide: AuthIdentityClient, useValue: identities },
        { provide: RundCatalogosClient, useValue: catalogos },
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
    identities.perfilPta.mockReset().mockResolvedValue({ personaId, documento: cedula, nombreCompleto: 'DOCENTE DE PRUEBA', territorialId: null });
    catalogos.territorialesBanco.mockReset().mockResolvedValue([{ id: '50', nombre: 'Meta', codigo: '50' }]);
    rows = [{
      docente_id: docenteId, nombre_completo: 'DOCENTE DE PRUEBA',
      perfil_academico: 'Administración pública', perfil_academico_profesional: 'Docencia', nivel_formacion: 'Maestría',
      categoria: 'ASOCIADO', territorial_id: '50', territorial_nombre: 'Meta', territorial_codigo: '50',
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
        categoria: 'ASOCIADO', territorial: { id: '50', nombre: 'Meta', codigo: '50' },
        horas_programables: 720, estado_vinculacion: 'ACTIVO', tipo_vinculacion: 'CARRERA', periodo: '2026-2',
      } });
      const [sql, params] = query.mock.calls.find(([sql]) => sql.includes('FROM rund'))!;
      expect(params).toEqual([personaId, '2026-2']);
      expect(sql).not.toMatch(/auth\.|academic_work_plan\./);
      expect(sql.split('FROM rund')[0]).not.toMatch(/puntaje|salario|num_identificacion|SELECT\s+\*/i);
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

  it('ausencia confirmada en Auth conserva Flujo 1 y auditoría sin consultar perfiles o catálogos', async () => {
    identities.perfilPta.mockResolvedValue(null);
    const response = await request(app.getHttpServer()).get(`${base}/${cedula}`).auth(token(), { type: 'bearer' }).expect(404);
    expect(response.body).toMatchObject({ code: 'RUND_DOCENTE_NO_ENCONTRADO', flujo_alta: 'FLUJO_1' });
    expect(query.mock.calls.some(([sql]) => sql.includes('FROM rund'))).toBe(false);
    expect(query.mock.calls.some(([sql]) => sql.includes('INSERT INTO'))).toBe(true);
    expect(catalogos.territorialesBanco).not.toHaveBeenCalled();
  });

  it('fallo de identidad Auth no recomienda crear otro docente ni consulta SQL alternativo', async () => {
    identities.perfilPta.mockRejectedValue(new ServiceUnavailableException());
    const response = await request(app.getHttpServer()).get(`${base}/${cedula}`).auth(token(), { type: 'bearer' }).expect(503);
    expect(response.body.flujo_alta).toBeUndefined(); expect(query).not.toHaveBeenCalled();
  });

  it('fallo del catálogo no sustituye nombres ni consulta tablas de otro propietario', async () => {
    catalogos.territorialesBanco.mockRejectedValue(new ServiceUnavailableException());
    await request(app.getHttpServer()).get(`${base}/${cedula}`).auth(token(), { type: 'bearer' }).expect(503);
    expect(query.mock.calls.every(([sql]) => !sql.includes('auth.'))).toBe(true);
  });

  it('territorial vacía del perfil usa la seccional de la persona, con bigint intacto', async () => {
    rows[0].territorial_id = null; // Resultado de NULLIF sobre el valor vacío persistido.
    identities.perfilPta.mockResolvedValue({ personaId, documento: cedula, nombreCompleto: null, territorialId: '9007199254740993' });
    catalogos.territorialesBanco.mockResolvedValue([{ id: '9007199254740993', nombre: 'Histórica', codigo: '001' }]);
    const response = await request(app.getHttpServer()).get(`${base}/${cedula}`).auth(token(), { type: 'bearer' }).expect(200);
    expect(response.body.data.territorial).toEqual({ id: '9007199254740993', nombre: 'Histórica', codigo: '001' });
    expect(response.body.data.perfil.nombre_completo).toBeNull();
  });

  it('sin territorial del perfil ni de la persona conserva null sin necesitar catálogo', async () => {
    rows[0].territorial_id = null;
    const response = await request(app.getHttpServer()).get(`${base}/${cedula}`).auth(token(), { type: 'bearer' }).expect(200);
    expect(response.body.data.territorial).toEqual({ id: null, nombre: null, codigo: null });
    expect(catalogos.territorialesBanco).not.toHaveBeenCalled();
  });

  it('sin periodo entrega el registro seleccionado, incluidos inactivos y cero horas', async () => {
    rows[0].estado_vinculacion = 'RETIRADO';
    rows[0].horas_programables = 0;
    rows[0].categoria = null;
    rows[0].territorial_nombre = null;
    catalogos.territorialesBanco.mockResolvedValue([]);
    const response = await request(app.getHttpServer()).get(`${base}/${cedula}`)
      .auth(token(), { type: 'bearer' }).expect(200);
    expect(response.body.data).toMatchObject({ estado_vinculacion: 'RETIRADO', horas_programables: 0, categoria: null, territorial: { nombre: null } });
    expect(query.mock.calls.find(([sql]) => sql.includes('FROM rund'))![1]).toEqual([personaId, null]);
  });

  it.each(['sin_token', 'malformado', 'vencido', 'firma_invalida', 'sin_sujeto', 'sujeto_en_blanco'])(
    '401: rechaza %s antes de consultar la base', async (kind) => {
      const tokens: Record<string, string> = {
        malformado: 'no-es-jwt', vencido: token(undefined, { expiresIn: -1 }),
        firma_invalida: new JwtService({ secret: randomUUID() }).sign({ sub: actorId, roles: ['SUPER_ADMIN'] }),
        sin_sujeto: jwt.sign({ roles: ['SUPER_ADMIN'] }),
        sujeto_en_blanco: jwt.sign({ sub: '   ', roles: ['SUPER_ADMIN'] }),
      };
      const call = request(app.getHttpServer()).get(`${base}/${cedula}`);
      if (tokens[kind]) call.auth(tokens[kind], { type: 'bearer' });
      await call.expect(401);
      expect(query).not.toHaveBeenCalled();
    },
  );

  it('200: acepta el token vía cookie httpOnly esap_access_token, no solo por header', async () => {
    const response = await request(app.getHttpServer()).get(`${base}/${cedula}?periodo=2026-2`)
      .set('Cookie', `esap_access_token=${token(['SUPER_ADMIN'])}`)
      .expect(200);
    expect(response.body.data.docente_id).toBe(docenteId);
  });

  it('401: ignora una cookie esap_access_token vencida aunque el formato sea válido', async () => {
    await request(app.getHttpServer()).get(`${base}/${cedula}`)
      .set('Cookie', `esap_access_token=${token(undefined, { expiresIn: -1 })}`)
      .expect(401);
    expect(query).not.toHaveBeenCalled();
  });

  it.each(['DOCENTE', 'CONSULTOR_SIN_PERMISOS'])(
    '403: %s no puede consultar otros docentes sin permiso RUND', async (role) => {
      await request(app.getHttpServer()).get(`${base}/${cedula}`).auth(token([role]), { type: 'bearer' }).expect(403);
      expect(query).not.toHaveBeenCalled();
      expect(identities.permisosRoles).toHaveBeenCalledWith([role]);
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
