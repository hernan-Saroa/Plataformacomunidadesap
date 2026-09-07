import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { BancoDocentesController } from './banco-docentes.controller';
import { BancoDocentesService } from './banco-docentes.service';
import { DocumentTypeValidatorService } from './document-type-validator.service';
import { RUND_PERMISSIONS } from './rund-permissions';

describe('RBAC RUND por HTTP con el guard real y permisos resueltos', () => {
  let app: INestApplication;
  let authenticatedUser: any;
  const profile = {
    docente_id: '11111111-1111-4111-8111-111111111111',
    persona_id: 'persona-1', documento_identidad: '1020304050', puntaje_salarial: 145.5,
  };
  const service = {
    getById: jest.fn().mockResolvedValue(profile),
    list: jest.fn().mockResolvedValue({ data: [profile], total: 1, page: 1, pages: 1, limit: 50 }),
    logSensitiveDataAccess: jest.fn().mockResolvedValue(undefined),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [BancoDocentesController],
      providers: [
        { provide: BancoDocentesService, useValue: service },
        { provide: DocumentTypeValidatorService, useValue: {} },
        { provide: DataSource, useValue: {
          query: jest.fn(async (_sql: string, [roles]: string[][]) =>
            roles.includes('CONSULTOR_SIN_PERMISOS') ? [] : [{ code: RUND_PERMISSIONS.VIEW }, { code: RUND_PERMISSIONS.MANAGE }]),
        } },
      ],
    }).compile();
    app = module.createNestApplication();
    // Solo se simula la identidad ya autenticada. El guard RBAC no se sustituye.
    app.use((req: any, _res: any, next: () => void) => { req.user = authenticatedUser; next(); });
    await app.init();
  });

  afterAll(async () => { await app.close(); });
  beforeEach(() => {
    authenticatedUser = undefined;
    jest.clearAllMocks();
    service.logSensitiveDataAccess.mockResolvedValue(undefined);
  });

  it.each(['ADMIN', 'ADMIN_TERRITORIAL', 'DOCENTE', 'CONSULTOR'])(
    'enmascara el listado y detalle de %s con permisos view/manage reales del guard', async (role) => {
      authenticatedUser = { userId: 'lector-1', roles: [role] };
      for (const base of ['/banco-docentes', '/pta/banco-docentes']) {
        const list = await request(app.getHttpServer()).get(base).expect(200);
        const detail = await request(app.getHttpServer()).get(`${base}/${profile.docente_id}`).expect(200);
        for (const data of [list.body.items[0], detail.body.data]) {
          expect(data.documento_identidad).toBe('******4050');
          expect(data.puntaje_salarial).toBeNull();
          expect(data.proteccion_datos.acceso_completo).toBe(false);
        }
      }
      expect(service.logSensitiveDataAccess).toHaveBeenCalledTimes(4);
    },
  );

  it.each(['GESTION_PROFESORAL', 'SUPER_ADMIN'])('entrega datos completos y auditados a %s', async (role) => {
    authenticatedUser = { userId: 'ggp-1', roles: [role] };
    const response = await request(app.getHttpServer()).get(`/banco-docentes/${profile.docente_id}`).expect(200);
    expect(response.body.data.documento_identidad).toBe(profile.documento_identidad);
    expect(response.body.data.puntaje_salarial).toBe(profile.puntaje_salarial);
    expect(service.logSensitiveDataAccess).toHaveBeenCalledWith([
      expect.objectContaining({ actorId: 'ggp-1', fullAccess: true }),
    ]);
  });

  it('rechaza solicitudes sin usuario y consultores sin permisos antes de leer perfiles', async () => {
    await request(app.getHttpServer()).get('/banco-docentes').expect(403);
    authenticatedUser = { userId: 'consultor-1', roles: ['CONSULTOR_SIN_PERMISOS'] };
    await request(app.getHttpServer()).get('/banco-docentes').expect(403);
    expect(service.list).not.toHaveBeenCalled();
  });
});
