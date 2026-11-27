import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PlanesMejoramientoController } from '../src/controllers/planes-mejoramiento.controller';
import { PlanesMejoramientoService } from '../src/services/planes-mejoramiento.service';
import {
  PlanComentario,
  PlanEvidencia,
  PlanMejoramiento,
  PlanSeguimiento,
} from '../src/entities/planes-mejoramiento.entity';
import { PlanHallazgo } from '../src/entities/plan-hallazgo.entity';

describe('PlanesMejoramientoController PHVA E2E (Bug 2418)', () => {
  let app: INestApplication;
  let planStore: any;
  let hallazgosStore: any[];
  let seguimientosStore: any[];

  beforeEach(async () => {
    planStore = {
      id: '11111111-1111-4111-8111-111111111111',
      codigo: 'PM-OCI-2026-001',
      titulo: 'Plan E2E PHVA',
      origen: 'OCI',
      estado: 'EN_EJECUCION',
      avancePorcentaje: 0,
      fechaCierreReal: null,
      evidencias: [],
      seguimientos: [],
      comentarios: [],
      hallazgos: [],
    };
    hallazgosStore = [];
    seguimientosStore = [];
    let seq = 1;

    const planRepo = {
      findOne: jest.fn(async ({ where }: any) =>
        where?.id === planStore.id
          ? { ...planStore, hallazgos: [...hallazgosStore], seguimientos: [...seguimientosStore] }
          : null,
      ),
      findOneBy: jest.fn(async ({ id }: any) => (id === planStore.id ? planStore : null)),
      save: jest.fn(async (p: any) => {
        Object.assign(planStore, p);
        return planStore;
      }),
    };

    const hallazgoRepo = {
      find: jest.fn(async () => [...hallazgosStore]),
      findOneBy: jest.fn(async ({ id }: any) => hallazgosStore.find((h) => h.id === id) || null),
      create: jest.fn((data: any) => ({
        id: `22222222-2222-4222-8222-00000000000${seq++}`,
        createdAt: new Date(Date.now() + seq * 1000),
        updatedAt: new Date(),
        ...data,
      })),
      save: jest.fn(async (entityOrArray: any) => {
        if (Array.isArray(entityOrArray)) {
          for (const item of entityOrArray) {
            const idx = hallazgosStore.findIndex((h) => h.id === item.id);
            if (idx >= 0) hallazgosStore[idx] = { ...hallazgosStore[idx], ...item };
            else hallazgosStore.push(item);
          }
          return entityOrArray;
        }
        const idx = hallazgosStore.findIndex((h) => h.id === entityOrArray.id);
        if (idx >= 0) hallazgosStore[idx] = { ...hallazgosStore[idx], ...entityOrArray };
        else hallazgosStore.push(entityOrArray);
        return entityOrArray;
      }),
      remove: jest.fn(async (entity: any) => {
        hallazgosStore = hallazgosStore.filter((h) => h.id !== entity.id);
        return entity;
      }),
    };

    const seguimientoRepo = {
      create: jest.fn((data: any) => ({
        id: `seg-${seguimientosStore.length + 1}`,
        fechaReporte: new Date(),
        ...data,
      })),
      save: jest.fn(async (s: any) => {
        seguimientosStore.push(s);
        return s;
      }),
    };

    const emptyRepo = { find: jest.fn(async () => []), create: jest.fn(), save: jest.fn() };
    const dataSource = { query: jest.fn(async () => []), getRepository: jest.fn(() => emptyRepo) };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [PlanesMejoramientoController],
      providers: [
        PlanesMejoramientoService,
        { provide: getRepositoryToken(PlanMejoramiento), useValue: planRepo },
        { provide: getRepositoryToken(PlanEvidencia), useValue: emptyRepo },
        { provide: getRepositoryToken(PlanSeguimiento), useValue: seguimientoRepo },
        { provide: getRepositoryToken(PlanComentario), useValue: emptyRepo },
        { provide: getRepositoryToken(PlanHallazgo), useValue: hallazgoRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('flujo HTTP completo: valida fase PHVA obligatoria, distribuye pesos, calcula cumplimiento y completa el plan', async () => {
    // 1. Crear acción sin fase PHVA -> 400
    await request(app.getHttpServer())
      .post(`/planes-mejoramiento/${planStore.id}/hallazgos`)
      .send({ nombre: 'Sin fase' })
      .expect(400);

    // 2. Crear 3 acciones en fases distintas
    const res1 = await request(app.getHttpServer())
      .post(`/planes-mejoramiento/${planStore.id}/hallazgos`)
      .send({ nombre: 'Acción 1', fasePhva: 'PLANEAR', responsable: 'Juan', fechaLimite: '2026-12-01' })
      .expect(201);

    const res2 = await request(app.getHttpServer())
      .post(`/planes-mejoramiento/${planStore.id}/hallazgos`)
      .send({ nombre: 'Acción 2', fasePhva: 'HACER' })
      .expect(201);

    const res3 = await request(app.getHttpServer())
      .post(`/planes-mejoramiento/${planStore.id}/hallazgos`)
      .send({ nombre: 'Acción 3', fasePhva: 'ACTUAR' })
      .expect(201);

    // 3. Verificar pesos 33.33 / 33.33 / 33.34
    const listRes = await request(app.getHttpServer())
      .get(`/planes-mejoramiento/${planStore.id}/hallazgos`)
      .expect(200);
    expect(listRes.body.map((a: any) => a.pesoPorcentual)).toEqual([33.33, 33.33, 33.34]);

    // 4. Ejecutar acción 1 -> 33.33%
    const exec1 = await request(app.getHttpServer())
      .patch(`/planes-mejoramiento/hallazgos/${res1.body.id}/estado`)
      .send({ estado: 'EJECUTADA' })
      .expect(200);
    expect(exec1.body.trazabilidad.planAvanceActual).toBe(33.33);
    expect(exec1.body.trazabilidad.planEstadoActual).toBe('EN_EJECUCION');

    // 5. Ejecutar acción 2 y 3 -> 100% y CERRADO
    await request(app.getHttpServer())
      .patch(`/planes-mejoramiento/hallazgos/${res2.body.id}/estado`)
      .send({ estado: 'EJECUTADA' })
      .expect(200);
    const exec3 = await request(app.getHttpServer())
      .patch(`/planes-mejoramiento/hallazgos/${res3.body.id}/estado`)
      .send({ estado: 'EJECUTADA' })
      .expect(200);
    expect(exec3.body.trazabilidad.planAvanceActual).toBe(100);
    expect(exec3.body.trazabilidad.planEstadoActual).toBe('CERRADO');

    // 6. Consultar plan completo: avancePorFase y seguimientos (Timeline)
    const planRes = await request(app.getHttpServer())
      .get(`/planes-mejoramiento/${planStore.id}`)
      .expect(200);
    expect(planRes.body.avancePorcentaje).toBe(100);
    expect(planRes.body.estado).toBe('CERRADO');
    expect(planRes.body.avancePorFase.PLANEAR.porcentajeAvance).toBe(100);
    expect(planRes.body.seguimientos.length).toBeGreaterThanOrEqual(6);
  });
});
