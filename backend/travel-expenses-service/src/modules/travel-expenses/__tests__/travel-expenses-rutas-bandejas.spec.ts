import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { TravelExpensesController } from '../travel-expenses.controller';
import { TravelExpensesService } from '../travel-expenses.service';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/permissions.guard';

/**
 * Las bandejas con un solo segmento después de `requests/` deben declararse
 * antes de `GET requests/:id`: Express resuelve en orden de registro y, si no,
 * `siif-requested` y `budget-inbox` llegan al detalle como si fueran un id.
 */
describe('TravelExpensesController — rutas literales antes de requests/:id', () => {
  let app: INestApplication;
  const service = {
    obtenerSolicitudesSIIFRequested: jest.fn().mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 }),
    obtenerBandejaPresupuesto: jest.fn().mockResolvedValue({ data: [], total: 0 }),
    obtenerSolicitudCompleta: jest.fn().mockResolvedValue({}),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [TravelExpensesController],
      providers: [
        { provide: TravelExpensesService, useValue: service },
        { provide: DataSource, useValue: {} },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard).useValue({ canActivate: () => true })
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(() => app.close());
  beforeEach(() => jest.clearAllMocks());

  it('GET requests/siif-requested llega a la bandeja de Control Viáticos', async () => {
    await request(app.getHttpServer()).get('/requests/siif-requested').expect(200);
    expect(service.obtenerSolicitudCompleta).not.toHaveBeenCalled();
    expect(service.obtenerSolicitudesSIIFRequested).toHaveBeenCalledWith(1, 20);
  });

  it('GET requests/budget-inbox llega a la bandeja de Presupuesto', async () => {
    await request(app.getHttpServer()).get('/requests/budget-inbox').expect(200);
    expect(service.obtenerSolicitudCompleta).not.toHaveBeenCalled();
    expect(service.obtenerBandejaPresupuesto).toHaveBeenCalled();
  });
});
