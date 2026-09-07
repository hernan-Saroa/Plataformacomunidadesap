import { INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { AuthModule } from '../../auth/auth.module';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PtaController } from '../pta.controller';
import { PtaService } from '../pta.service';
import { PtaRundSensitiveInterceptor } from './pta-rund-sensitive.interceptor';
import { PtaPermissionsService } from '../auth/pta-permissions.service';

describe('PTA: protección transversal con JWT real', () => {
  let app: INestApplication;
  let jwt: JwtService;
  const db = { query: jest.fn().mockResolvedValue([]) };
  const teachers = [{ id: 'docente-1', puntajeSalarial: 145.5, persona: { identificacion: '1020304050', nombre: 'Prueba' } }];
  const service = { getDocentesDisponibles: jest.fn().mockResolvedValue(teachers), getCatalogoProgramas: jest.fn().mockResolvedValue([{ id: 'programa-1' }]) };
  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AuthModule], controllers: [PtaController], providers: [
      { provide: PtaService, useValue: service }, { provide: DataSource, useValue: db }, PtaRundSensitiveInterceptor,
      { provide: PtaPermissionsService, useValue: {} },
      { provide: APP_GUARD, useClass: JwtAuthGuard },
    ] }).compile();
    jwt = module.get(JwtService);
    app = module.createNestApplication();
    app.useLogger(false);
    await app.init();
  });
  afterAll(async () => { await app?.close(); });
  beforeEach(() => { jest.clearAllMocks(); db.query.mockResolvedValue([]); });

  it('rechaza anónimos antes de leer docentes y mantiene el catálogo público', async () => {
    await request(app.getHttpServer()).get('/docentes-disponibles').expect(401);
    expect(service.getDocentesDisponibles).not.toHaveBeenCalled();
    await request(app.getHttpServer()).get('/catalogos/programas').expect(200);
    expect(db.query).not.toHaveBeenCalled();
  });

  it.each(['DOCENTE', 'ADMIN', 'CONSULTOR', 'GESTION_PROFESORAL', 'SUPER_ADMIN'])('aplica la matriz a %s sin perder identificadores ni información PTA', async (role) => {
    const token = jwt.sign({ sub: 'user-1', roles: [role] });
    const response = await request(app.getHttpServer()).get('/docentes-disponibles').set('Cookie', `esap_access_token=${token}`).expect(200);
    const full = ['GESTION_PROFESORAL', 'SUPER_ADMIN'].includes(role);
    expect(response.body.data[0].persona.identificacion).toBe(full ? '1020304050' : '******4050');
    expect(response.body.data[0].puntajeSalarial).toBe(full ? 145.5 : null);
    expect(response.body.data[0].id).toBe('docente-1');
    expect(db.query).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(db.query.mock.calls)).not.toContain('1020304050');
  });

  it('no expone datos si el token es falso o no puede auditar', async () => {
    await request(app.getHttpServer()).get('/docentes-disponibles').set('Authorization', 'Bearer falso').expect(401);
    db.query.mockRejectedValue(new Error('auditoría caída'));
    const response = await request(app.getHttpServer()).get('/docentes-disponibles')
      .set('Authorization', `Bearer ${jwt.sign({ sub: 'user-1', roles: ['SUPER_ADMIN'] })}`).expect(503);
    expect(response.text).not.toContain('1020304050');
  });
});
