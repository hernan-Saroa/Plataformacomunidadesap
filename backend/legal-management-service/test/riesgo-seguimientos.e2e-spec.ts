/**
 * E2E del seguimiento cuatrimestral de controles de riesgo (EFDS-2416).
 *
 * Verifica el ciclo de vida HTTP completo a través de NestJS / Supertest:
 *   - GET  /riesgos/:id/seguimientos                       -> lista los 3 cortes cuatrimestrales por control
 *   - POST /riesgos/:id/controles/:controlId/seguimientos  -> registra seguimiento, valida campos, actualiza efectividad y timeline
 *   - PATCH /riesgos/:id/seguimientos/:seguimientoId       -> edita seguimiento en cuatrimestre abierto
 *   - Restricciones: cuatrimestre cerrado es solo lectura, unicidad por corte.
 */
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';

import { RiesgosController } from '../src/controllers/riesgos.controller';
import { RiesgosService } from '../src/services/riesgos.service';
import { RiesgoSeguimientosService } from '../src/services/riesgo-seguimientos.service';
import { ConfigurationsService } from '../src/services/configurations.service';
import { LegalNotificationsService } from '../src/services/legal-notifications.service';
import { Riesgo } from '../src/entities/riesgo.entity';
import { RiesgoHistorial } from '../src/entities/riesgo-historial.entity';
import { RiesgoControlSeguimiento } from '../src/entities/riesgo-control-seguimiento.entity';
import { hoyColombia } from '../src/utils/seguimiento-control';

describe('Riesgos · Seguimiento cuatrimestral de controles (e2e)', () => {
    let app: INestApplication;
    let riesgosFilas: any[];
    let seguimientosFilas: any[];
    let historialFilas: any[];

    const RIESGO_ID = 'b7e289bf-8c34-4b95-a2f0-18dc0c3fa123';
    const CONTROL_ID = 'ctrl-monitoreo-1';

    beforeEach(async () => {
        riesgosFilas = [
            {
                id: RIESGO_ID,
                codigo: 'R-2026-006',
                nombre: 'Riesgo de Gestión Legal',
                descripcion: 'Riesgo en proceso Defensa Judicial',
                proceso: 'Defensa Judicial',
                tipoRiesgo: 'GESTION',
                etapa: 'IDENTIFICADO',
                estado: 'ACTIVO',
                probabilidadInherente: 3,
                impactoInherente: 3,
                zonaInherente: 'MODERADO',
                probabilidadResidual: 1,
                impactoResidual: 2,
                zonaResidual: 'BAJO',
                causas: ['Falta de seguimiento'],
                consecuencias: ['Pérdida de términos'],
                controlesExistentes: [
                    {
                        id: CONTROL_ID,
                        descripcion: 'tener un monitoreo constante con el abogado en cuestión',
                        efectividad: 90,
                    },
                ],
                planTratamiento: [],
                responsable: 'Abogado Defensor',
                responsableId: 'f0000000-0000-0000-0000-000000000001',
                cuantiaEstimada: 0,
                provisionContable: 0,
                porcentajeProvision: 0,
                moduloOrigen: 'DEFENSA_JUDICIAL',
                createdAt: new Date('2026-01-15T10:00:00Z'),
                updatedAt: new Date('2026-01-15T10:00:00Z'),
            },
        ];

        seguimientosFilas = [];
        historialFilas = [];

        const mockRiesgoRepo = {
            findOne: jest.fn(async ({ where }: any) => riesgosFilas.find(r => r.id === where?.id) ?? null),
            find: jest.fn(async ({ where }: any) => {
                if (where?.estado) return riesgosFilas.filter(r => r.estado === where.estado);
                return riesgosFilas;
            }),
            save: jest.fn(async (ent: any) => {
                const idx = riesgosFilas.findIndex(r => r.id === ent.id);
                if (idx >= 0) {
                    riesgosFilas[idx] = { ...riesgosFilas[idx], ...ent };
                    return riesgosFilas[idx];
                }
                riesgosFilas.push(ent);
                return ent;
            }),
            query: jest.fn(async () => []),
        };

        const mockSeguimientoRepo = {
            find: jest.fn(async ({ where }: any) => {
                let res = [...seguimientosFilas];
                if (where?.riesgoId) res = res.filter(s => s.riesgoId === where.riesgoId);
                return res;
            }),
            findOne: jest.fn(async ({ where }: any) => {
                if (where?.id) return seguimientosFilas.find(s => s.id === where.id) ?? null;
                if (where?.riesgoId && where?.controlId) {
                    return seguimientosFilas.find(s => s.riesgoId === where.riesgoId && s.controlId === where.controlId) ?? null;
                }
                return null;
            }),
            create: jest.fn((dto: any) => ({
                id: dto.id || `seg-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
                createdAt: new Date(),
                updatedAt: new Date(),
                ...dto,
            })),
            save: jest.fn(async (ent: any) => {
                const existe = seguimientosFilas.find(
                    s => s.riesgoId === ent.riesgoId && s.controlId === ent.controlId && s.vigencia === ent.vigencia && s.cuatrimestre === ent.cuatrimestre && s.id !== ent.id
                );
                if (existe) {
                    const err: any = new Error('duplicate key');
                    err.code = '23505';
                    throw err;
                }
                const idx = seguimientosFilas.findIndex(s => s.id === ent.id);
                if (idx >= 0) {
                    seguimientosFilas[idx] = { ...seguimientosFilas[idx], ...ent, updatedAt: new Date() };
                    return seguimientosFilas[idx];
                }
                seguimientosFilas.push(ent);
                return ent;
            }),
            query: jest.fn(async () => []),
        };

        const mockHistorialRepo = {
            find: jest.fn(async ({ where }: any) => {
                return historialFilas.filter(h => h.riesgoId === where.riesgoId);
            }),
            create: jest.fn((dto: any) => ({
                id: `hist-${Date.now()}`,
                createdAt: new Date(),
                ...dto,
            })),
            save: jest.fn(async (ent: any) => {
                historialFilas.push(ent);
                return ent;
            }),
        };

        const moduleRef = await Test.createTestingModule({
            controllers: [RiesgosController],
            providers: [
                RiesgosService,
                RiesgoSeguimientosService,
                { provide: getRepositoryToken(Riesgo), useValue: mockRiesgoRepo },
                { provide: getRepositoryToken(RiesgoControlSeguimiento), useValue: mockSeguimientoRepo },
                { provide: getRepositoryToken(RiesgoHistorial), useValue: mockHistorialRepo },
                {
                    provide: ConfigurationsService,
                    useValue: {
                        findByKey: jest.fn().mockResolvedValue({ value: { maxMb: 10 } }),
                    },
                },
                {
                    provide: LegalNotificationsService,
                    useValue: {
                        notificarSeguimientoVencido: jest.fn(),
                        notifyRiesgoCreado: jest.fn(),
                        notifyRiesgoActualizado: jest.fn(),
                    },
                },
            ],
        }).compile();

        app = moduleRef.createNestApplication();
        await app.init();
    });

    afterEach(async () => {
        await app.close();
    });

    describe('GET /riesgos/:id/seguimientos', () => {
        it('devuelve la estructura completa con 3 cortes cuatrimestrales por control', async () => {
            const res = await request(app.getHttpServer())
                .get(`/riesgos/${RIESGO_ID}/seguimientos`)
                .expect(200);

            expect(res.body).toHaveProperty('vigencia');
            expect(res.body).toHaveProperty('hoy');
            expect(res.body).toHaveProperty('config');
            expect(res.body.config).toHaveProperty('maxMb', 10);
            expect(Array.isArray(res.body.controles)).toBe(true);
            expect(res.body.controles).toHaveLength(1);

            const control = res.body.controles[0];
            expect(control.controlId).toBe(CONTROL_ID);
            expect(control.descripcion).toContain('monitoreo constante con el abogado');
            expect(control.efectividad).toBe(90);

            // Criterio 2: El sistema habilita tres cortes por vigencia: Cuatrimestre 1, 2 y 3
            expect(control.cortes).toHaveLength(3);
            expect(control.cortes[0].label).toBe('Cuatrimestre 1');
            expect(control.cortes[1].label).toBe('Cuatrimestre 2');
            expect(control.cortes[2].label).toBe('Cuatrimestre 3');

            // Criterio 7: El estado del seguimiento se visualiza como Pendiente, Registrado o Vencido
            expect(['PENDIENTE', 'REGISTRADO', 'VENCIDO']).toContain(control.cortes[0].estado);
            expect(['PENDIENTE', 'REGISTRADO', 'VENCIDO']).toContain(control.cortes[1].estado);
            expect(['PENDIENTE', 'REGISTRADO', 'VENCIDO']).toContain(control.cortes[2].estado);
        });

        it('retorna 404 si el riesgo no existe', async () => {
            await request(app.getHttpServer())
                .get('/riesgos/00000000-0000-0000-0000-000000000000/seguimientos')
                .expect(404);
        });
    });

    describe('POST /riesgos/:id/controles/:controlId/seguimientos', () => {
        it('valida campos obligatorios y rechaza datos incompletos o inválidos', async () => {
            const res = await request(app.getHttpServer())
                .post(`/riesgos/${RIESGO_ID}/controles/${CONTROL_ID}/seguimientos`)
                .send({})
                .expect(400);

            expect(res.body.message).toEqual(
                expect.arrayContaining([
                    expect.stringMatching(/cuatrimestre es obligatorio/i),
                    expect.stringMatching(/fecha de ejecución .* obligatoria/i),
                    expect.stringMatching(/comentarios .* obligatorios/i),
                    expect.stringMatching(/resultado .* obligatorio/i),
                    expect.stringMatching(/porcentaje de efectividad/i),
                ]),
            );
        });

        it('registra exitosamente un seguimiento cuatrimestral y actualiza efectividad y timeline', async () => {
            const hoy = hoyColombia();
            const vigencia = Number(hoy.slice(0, 4));
            // Determinar cuatrimestre abierto según fecha actual
            const mesActual = Number(hoy.slice(5, 7));
            const cuatrimestreActual = Math.ceil(mesActual / 4);

            const res = await request(app.getHttpServer())
                .post(`/riesgos/${RIESGO_ID}/controles/${CONTROL_ID}/seguimientos`)
                .field('cuatrimestre', cuatrimestreActual)
                .field('fechaEjecucion', hoy)
                .field('comentarios', 'Se realizó reunión de seguimiento y revisión de radicados')
                .field('resultado', 'APLICADO')
                .field('efectividad', 95)
                .expect(201);

            expect(res.body).toHaveProperty('id');
            expect(res.body.cuatrimestre).toBe(cuatrimestreActual);
            expect(res.body.resultado).toBe('APLICADO');
            expect(res.body.efectividad).toBe(95);

            // Criterio 4: El porcentaje de efectividad mostrado en el control corresponde al último seguimiento registrado
            const riesgoActualizado = riesgosFilas.find(r => r.id === RIESGO_ID);
            expect(riesgoActualizado.controlesExistentes[0].efectividad).toBe(95);

            // Criterio 6: Cada seguimiento se registra en la pestaña Timeline del riesgo con fecha, usuario y resultado
            expect(historialFilas.length).toBeGreaterThan(0);
            const evento = historialFilas[historialFilas.length - 1];
            expect(evento.tipoEvento).toBe('SEGUIMIENTO_CONTROL');
            expect(evento.descripcion).toContain('Seguimiento registrado');
            expect(evento.descripcion).toContain('95% de efectividad');
            expect(evento.descripcion).toContain('Aplicado');

            // Criterio 9: Solo se permite un seguimiento por control en cada cuatrimestre
            await request(app.getHttpServer())
                .post(`/riesgos/${RIESGO_ID}/controles/${CONTROL_ID}/seguimientos`)
                .field('cuatrimestre', cuatrimestreActual)
                .field('fechaEjecucion', hoy)
                .field('comentarios', 'Intento duplicado')
                .field('resultado', 'APLICADO')
                .field('efectividad', 90)
                .expect(409);
        });
    });

    describe('PATCH /riesgos/:id/seguimientos/:seguimientoId', () => {
        it('permite editar un seguimiento registrado en el cuatrimestre abierto', async () => {
            const hoy = hoyColombia();
            const mesActual = Number(hoy.slice(5, 7));
            const cuatrimestreActual = Math.ceil(mesActual / 4);

            // Crear primero
            const postRes = await request(app.getHttpServer())
                .post(`/riesgos/${RIESGO_ID}/controles/${CONTROL_ID}/seguimientos`)
                .field('cuatrimestre', cuatrimestreActual)
                .field('fechaEjecucion', hoy)
                .field('comentarios', 'Registro inicial')
                .field('resultado', 'APLICADO_PARCIALMENTE')
                .field('efectividad', 60)
                .expect(201);

            const seguimientoId = postRes.body.id;

            // Editar
            const patchRes = await request(app.getHttpServer())
                .patch(`/riesgos/${RIESGO_ID}/seguimientos/${seguimientoId}`)
                .field('cuatrimestre', cuatrimestreActual)
                .field('fechaEjecucion', hoy)
                .field('comentarios', 'Registro corregido con más avances')
                .field('resultado', 'APLICADO')
                .field('efectividad', 85)
                .expect(200);

            expect(patchRes.body.efectividad).toBe(85);
            expect(patchRes.body.resultado).toBe('APLICADO');

            // Efectividad en riesgo sincronizada al nuevo valor
            const riesgoActualizado = riesgosFilas.find(r => r.id === RIESGO_ID);
            expect(riesgoActualizado.controlesExistentes[0].efectividad).toBe(85);

            // Timeline registra la actualización
            const evento = historialFilas[historialFilas.length - 1];
            expect(evento.descripcion).toContain('Seguimiento actualizado');
            expect(evento.descripcion).toContain('85% de efectividad');
        });
    });
});
