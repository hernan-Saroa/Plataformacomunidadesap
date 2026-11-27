import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigurationsController } from '../src/controllers/configurations.controller';
import { ConfigurationsService, CLAVE_ENTES_CONTROL_PM } from '../src/services/configurations.service';
import { SystemConfiguration } from '../src/entities/system-configuration.entity';

describe('ConfigurationsController · Entes de Control PM (E2E HTTP)', () => {
    let app: INestApplication;
    let store: Map<string, SystemConfiguration>;
    let planesEnBd: Array<{ id: string; origen: string }>;

    beforeEach(async () => {
        store = new Map();
        planesEnBd = [];

        const mockConfigRepo = {
            findOne: jest.fn(async ({ where: { key } }: any) => store.get(key) ?? null),
            find: jest.fn(async () => Array.from(store.values())),
            create: jest.fn((data: any) => ({ ...data })),
            save: jest.fn(async (entity: SystemConfiguration) => {
                store.set(entity.key, { ...entity });
                return store.get(entity.key);
            }),
            manager: {
                find: jest.fn(async (_entity: any, opts: any) => {
                    const origenParam = opts?.where?.origen;
                    const valores: string[] = Array.isArray(origenParam?._value)
                        ? origenParam._value
                        : [];
                    return planesEnBd.filter((p) => valores.includes(p.origen));
                }),
            },
        };

        const moduleFixture: TestingModule = await Test.createTestingModule({
            controllers: [ConfigurationsController],
            providers: [
                ConfigurationsService,
                {
                    provide: getRepositoryToken(SystemConfiguration),
                    useValue: mockConfigRepo,
                },
            ],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterEach(async () => {
        await app.close();
    });

    it('permite crear, editar, inactivar y eliminar entes sin planes, devolviendo previousValue para Auditoría', async () => {
        const inicial = [
            { id: 'CONTRALORIA', nombre: 'Contraloría General', descripcion: 'Fiscal', icono: '🏛️', color: '#DC2626', activo: true },
            { id: 'OCI', nombre: 'Oficina Control Interno', descripcion: 'Interno', icono: '🔍', color: '#2962FF', activo: true },
        ];

        const resCrear = await request(app.getHttpServer())
            .put(`/configurations/${CLAVE_ENTES_CONTROL_PM}`)
            .send({ value: inicial })
            .expect(200);

        expect(resCrear.body.previousValue).toBeNull();
        expect(resCrear.body.value).toHaveLength(2);

        const conNuevo = [
            ...inicial,
            { id: 'ente-1795000000000', nombre: 'Defensoría del Pueblo', descripcion: 'Derechos', icono: '🛡️', color: '#059669', activo: true },
        ];

        const resAgregar = await request(app.getHttpServer())
            .put(`/configurations/${CLAVE_ENTES_CONTROL_PM}`)
            .send({ value: conNuevo })
            .expect(200);

        expect(resAgregar.body.previousValue).toEqual(inicial);
        expect(resAgregar.body.value).toHaveLength(3);

        const resGet = await request(app.getHttpServer())
            .get(`/configurations/${CLAVE_ENTES_CONTROL_PM}`)
            .expect(200);

        expect(resGet.body.value.map((e: any) => e.id)).toContain('ente-1795000000000');

        // Eliminar el ente nuevo sin planes asociados -> 200 OK
        await request(app.getHttpServer())
            .put(`/configurations/${CLAVE_ENTES_CONTROL_PM}`)
            .send({ value: inicial })
            .expect(200);
    });

    it('rechaza con 400 cuando un ente tiene nombre vacío o id duplicado', async () => {
        await request(app.getHttpServer())
            .put(`/configurations/${CLAVE_ENTES_CONTROL_PM}`)
            .send({ value: [{ id: 'ente-1', nombre: '   ', activo: true }] })
            .expect(400);

        await request(app.getHttpServer())
            .put(`/configurations/${CLAVE_ENTES_CONTROL_PM}`)
            .send({
                value: [
                    { id: 'ente-1', nombre: 'A', activo: true },
                    { id: 'ente-1', nombre: 'B', activo: true },
                ],
            })
            .expect(400);
    });

    it('rechaza con 409 eliminar un ente con planes asociados, pero permite inactivarlo', async () => {
        const inicial = [
            { id: 'CONTRALORIA', nombre: 'Contraloría General', activo: true },
            { id: 'OCI', nombre: 'Oficina Control Interno', activo: true },
        ];
        await request(app.getHttpServer())
            .put(`/configurations/${CLAVE_ENTES_CONTROL_PM}`)
            .send({ value: inicial })
            .expect(200);

        planesEnBd.push({ id: 'plan-1', origen: 'OCI' });

        await request(app.getHttpServer())
            .put(`/configurations/${CLAVE_ENTES_CONTROL_PM}`)
            .send({ value: [inicial[0]] })
            .expect(409);

        await request(app.getHttpServer())
            .put(`/configurations/${CLAVE_ENTES_CONTROL_PM}`)
            .send({ value: [inicial[0], { ...inicial[1], activo: false }] })
            .expect(200);
    });
});
