import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { PtaController } from './pta.controller';
import { PtaService } from './pta.service';
import { PtaAuthGuard } from './auth/pta-auth.guard';
import { PtaConfigurationGuard } from './auth/pta-configuration.guard';
import { PtaPermissionsService } from './auth/pta-permissions.service';
import { PTA_MANAGE_CONFIGURATION_PERMISSION as CONFIG } from './auth/pta-permissions.constants';

describe('Configuración PTA - autorización por HTTP', () => {
  let app: INestApplication;
  const jwt = new JwtService({ secret: process.env.JWT_SECRET || 'esap-super-secret-jwt-key-2024' });
  const token = jwt.sign({ sub: 'cuenta-autenticada', roles: ['SUPER_ADMIN'] });
  let permissions: string[];
  let superUser: boolean;
  const rules = {
    horas_tc: 40,
    config_bloqueada: true,
    config_changelog: [{ usuario: 'administrador' }],
    config_snapshots: [{ snapshot: { horas_tc: 38 } }],
  };
  const service = {
    getConfiguracionPTAGlobal: jest.fn().mockResolvedValue(rules),
    saveConfiguracionPTAGlobal: jest.fn().mockResolvedValue(rules),
  };
  const resolver = {
    resolveForUser: jest.fn(async () => ({
      roles: superUser ? ['SUPER_ADMIN'] : ['ROL_PERSONALIZADO'],
      isSuperUser: superUser,
      permissions: new Set(permissions),
    })),
    resolvePersonalScopeForUser: jest.fn().mockResolvedValue({ territorialIds: [], cetapIds: [] }),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [PtaController],
      providers: [
        PtaAuthGuard, PtaConfigurationGuard,
        { provide: PtaService, useValue: service },
        { provide: JwtService, useValue: jwt },
        { provide: PtaPermissionsService, useValue: resolver },
        { provide: DataSource, useValue: {} },
      ],
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });
  afterAll(async () => { await app?.close(); });
  beforeEach(() => { jest.clearAllMocks(); permissions = []; superUser = false; });

  it('sin sesión rechaza tanto consultar como guardar', async () => {
    await request(app.getHttpServer()).get('/configuracion').expect(401);
    await request(app.getHttpServer()).post('/configuracion').send({ rules }).expect(401);
    expect(service.getConfiguracionPTAGlobal).not.toHaveBeenCalled();
    expect(service.saveConfiguracionPTAGlobal).not.toHaveBeenCalled();
  });

  it.each([[], ['pta.approve.all'], ['pta.review.all'], ['pta.backoffice.ver_gestion'], ['pta.backoffice.seguimiento']])('sin el permiso específico rechaza GET y POST: %j', async (...granted) => {
    permissions = granted as string[];
    await request(app.getHttpServer()).get('/configuracion').auth(token, { type: 'bearer' }).expect(403);
    await request(app.getHttpServer()).post('/configuracion').auth(token, { type: 'bearer' })
      .send({ rules, isSuperUser: true, permissions: [CONFIG] }).expect(403);
    expect(service.getConfiguracionPTAGlobal).not.toHaveBeenCalled();
    expect(service.saveConfiguracionPTAGlobal).not.toHaveBeenCalled();
  });

  it('con el permiso permite ver, editar y audita la identidad del token', async () => {
    permissions = [CONFIG];
    const response = await request(app.getHttpServer()).get('/configuracion').auth(token, { type: 'bearer' }).expect(200);
    expect(response.body.data).toEqual(rules);
    await request(app.getHttpServer()).post('/configuracion').auth(token, { type: 'bearer' })
      .set('x-user-id', 'IMPOSTOR').send({ rules: { horas_tc: 39 } }).expect(201);
    expect(service.saveConfiguracionPTAGlobal).toHaveBeenCalledWith({ horas_tc: 39 }, 'cuenta-autenticada');
    expect(resolver.resolveForUser).toHaveBeenCalledWith('cuenta-autenticada');
  });

  it('retirar el permiso bloquea inmediatamente la misma sesión', async () => {
    permissions = [CONFIG];
    await request(app.getHttpServer()).get('/configuracion').auth(token, { type: 'bearer' }).expect(200);
    permissions = [];
    await request(app.getHttpServer()).post('/configuracion').auth(token, { type: 'bearer' }).send({ rules }).expect(403);
    expect(service.saveConfiguracionPTAGlobal).not.toHaveBeenCalled();
  });

  it('SUPER_ADMIN conserva su acceso global verificado en el servidor', async () => {
    superUser = true;
    await request(app.getHttpServer()).get('/configuracion').auth(token, { type: 'bearer' }).expect(200);
    await request(app.getHttpServer()).post('/configuracion').auth(token, { type: 'bearer' }).send({ rules }).expect(201);
  });

  it('el formulario conserva las reglas operativas sin historial ni snapshots administrativos', async () => {
    const response = await request(app.getHttpServer()).get('/reglas').expect(200);
    expect(response.body.data).toEqual({ horas_tc: 40 });
    await request(app.getHttpServer()).post('/reglas').send({ horas_tc: 100 }).expect(404);
    expect(service.saveConfiguracionPTAGlobal).not.toHaveBeenCalled();
  });
});
