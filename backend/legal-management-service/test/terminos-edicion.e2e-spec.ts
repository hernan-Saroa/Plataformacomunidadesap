/**
 * E2E de la EDICIÓN de un término/informe, a nivel de endpoint HTTP real.
 *
 * Es el contrato que consume el botón "Editar" del detalle de Términos e Informes
 * (frontend: ModalEditarTermino, habilitado por el permiso `gestion-legal.terminos.edit`).
 * A diferencia de los tests unitarios del controller —que mockean el servicio de alertas y
 * solo comprueban con qué argumentos se le llama—, aquí se monta el servicio de alertas REAL
 * contra repositorios en memoria, de modo que se verifica el efecto de punta a punta:
 *
 *   PATCH /terminos/:id  ->  TerminosService.update()  ->  rearme de envíos previos
 *                        ->  AlertasVencimientoTerminosService.verificarTerminoInmediato()
 *                        ->  contraste contra la REGLA GLOBAL de 3 días (72 h)
 *                        ->  notificación al responsable
 *
 * Lo que se verifica:
 *   - Se persisten todos los campos editables del informe (datos, fuente normativa,
 *     responsable, prioridad) y la parametrización del plazo (fecha base, unidad, duración).
 *   - `diasTermino` se recalcula solo cuando el cliente no lo manda.
 *   - Mover el vencimiento dentro de la ventana de la regla global de 3 días dispara la
 *     alerta AL INSTANTE, sin esperar la corrida del cron.
 *   - Mover el vencimiento FUERA de esa ventana no notifica, y además rearma: si después se
 *     vuelve a acercar, la alerta se envía de nuevo en vez de quedar muda para siempre.
 *   - Una edición que no toca el plazo no reenvía nada.
 *   - Un término con anticipación personalizada ignora la regla global de 3 días.
 */
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';

import { TerminosController } from '../src/controllers/terminos.controller';
import { TerminosService } from '../src/services/terminos.service';
import { AlertasVencimientoTerminosService } from '../src/services/alertas-vencimiento-terminos.service';
import { LegalNotificationsService } from '../src/services/legal-notifications.service';
import { SequenceService } from '../src/services/sequence.service';
import { TerminoProcesal } from '../src/entities/termino-procesal.entity';
import { ReglaAlertaTermino } from '../src/entities/regla-alerta-termino.entity';
import { AlertaTerminoEnviada } from '../src/entities/alerta-termino-enviada.entity';
import { Expediente } from '../src/entities/expediente.entity';
import { ConsultaJuridica } from '../src/entities/consulta-juridica.entity';
import { RequerimientoOC } from '../src/entities/requerimiento-oc.entity';
import { ProcesoCoactivo } from '../src/entities/proceso-coactivo.entity';
import { Actuacion } from '../src/entities/actuacion.entity';

const HORAS = 60 * 60 * 1000;
const DIAS = 24 * HORAS;

/** Fecha "YYYY-MM-DD" a N días de hoy, que es el formato que manda el `<input type="date">`. */
function ymdEnDias(dias: number): string {
    return new Date(Date.now() + dias * DIAS).toISOString().slice(0, 10);
}

function crearTermino(overrides: Partial<TerminoProcesal> = {}): any {
    return {
        id: 'uuid-informe',
        origenModulo: 'MANUAL',
        referenciaId: 'ref-1',
        numeroRadicado: 'TERM-2026-0001',
        nombreActuacion: 'Informe de contabilidad',
        fechaBase: new Date(Date.now() - 10 * DIAS),
        diasTermino: 40,
        tipoDias: 'CALENDARIO',
        // Lejos del vencimiento: fuera de la ventana de cualquier regla de días.
        fechaVencimiento: new Date(Date.now() + 30 * DIAS),
        fechaAlertaPreventiva: null,
        fechaAlertaCritica: null,
        horasAnticipacionAlertaPersonalizada: null,
        recordatorioManualHorasAnticipacion: null,
        ultimoRecordatorioRecurrenteEn: null,
        alertaVencimientoEnviadaEn: null,
        estado: 'PENDIENTE',
        prioridad: 'MEDIA',
        responsableId: null,
        responsableNombre: 'Luis Ramírez',
        destinatario: 'Contaduría General de la Nación',
        enteSolicitante: 'Contraloría General de la República',
        fundamentoNormativo: [{ tipo: 'Resolución', cita: 'Res. 123 de 2024', actualizacionPeriodica: false }],
        observaciones: 'Descripción original',
        ...overrides,
    };
}

/** Repositorio en memoria que aplica de verdad los filtros que usan los servicios. */
function crearRepoTerminos(filasIniciales: any[]) {
    const filas = [...filasIniciales];
    return {
        filas,
        findOne: jest.fn(async ({ where }: any) => filas.find((f) => f.id === where.id) ?? null),
        // `find({ where: { estado: Not(In([...])) } })` del barrido completo: en memoria basta con
        // devolver los que no están cerrados, que es la intención de ese filtro.
        find: jest.fn(async () => filas.filter((f) => !['CUMPLIDO', 'ELIMINADO'].includes(f.estado))),
        save: jest.fn(async (entidad: any) => {
            const i = filas.findIndex((f) => f.id === entidad.id);
            if (i >= 0) filas[i] = { ...filas[i], ...entidad };
            else filas.push(entidad);
            return entidad;
        }),
        update: jest.fn(async (id: string, cambios: any) => {
            const i = filas.findIndex((f) => f.id === id);
            if (i >= 0) filas[i] = { ...filas[i], ...cambios };
            return undefined;
        }),
        remove: jest.fn(async (entidad: any) => entidad),
        count: jest.fn(async () => filas.length),
        createQueryBuilder: jest.fn(() => {
            const qb: any = {
                where: () => qb, andWhere: () => qb, orderBy: () => qb,
                getMany: async () => filas,
            };
            return qb;
        }),
    };
}

/** Tabla `terminos_alertas_enviadas` en memoria, con soporte para el `delete()` del rearme. */
function crearRepoAlertasEnviadas() {
    let filas: Array<{ terminoId: string; reglaId: string | null }> = [];
    return {
        get filas() { return filas; },
        findOne: jest.fn(async ({ where }: any) => {
            // `reglaId` llega como IsNull() (objeto de TypeORM) para la alerta personalizada.
            const buscaNull = typeof where.reglaId === 'object' && where.reglaId !== null;
            return filas.find((f) => f.terminoId === where.terminoId
                && (buscaNull ? f.reglaId === null : f.reglaId === where.reglaId)) ?? null;
        }),
        create: jest.fn((data: any) => ({ ...data })),
        save: jest.fn(async (entidad: any) => { filas.push({ ...entidad }); return entidad; }),
        delete: jest.fn(async (criterio: any) => {
            const soloPersonalizada = 'reglaId' in criterio;
            filas = filas.filter((f) => {
                if (f.terminoId !== criterio.terminoId) return true;
                return soloPersonalizada ? f.reglaId !== null : false;
            });
            return { affected: 0 };
        }),
    };
}

describe('Términos · flujo de edición (e2e por endpoint)', () => {
    let app: INestApplication;
    let repo: ReturnType<typeof crearRepoTerminos>;
    let repoAlertas: ReturnType<typeof crearRepoAlertasEnviadas>;
    let notificaciones: { notifyTerminoProximoAVencer: jest.Mock; notifyResponsableAsignadoTermino: jest.Mock; notifyTerminoCreado: jest.Mock };
    let evaluacionesPendientes: Promise<any>[];

    /**
     * El controller lanza la reevaluación de alertas SIN await (para no demorar la respuesta
     * al usuario). El test envuelve el método para quedarse con esa promesa y poder esperarla
     * antes de comprobar si se notificó o no.
     */
    const esperarAlertas = async () => {
        await Promise.all(evaluacionesPendientes);
        evaluacionesPendientes = [];
    };

    /**
     * Cuántos avisos se enviaron de un `origen` concreto. Se cuenta por origen y no con
     * `toHaveBeenCalledTimes` porque un término dentro de la ventana de una regla global
     * recibe DOS notificaciones distintas en la misma evaluación: la alerta de anticipación
     * (`automatica`, una sola vez por regla) y el recordatorio periódico (`recordatorio`, que
     * se repite mientras siga sin cumplirse). Mezclarlas escondería cuál de las dos falló.
     */
    const avisosDeOrigen = (origen: string) =>
        notificaciones.notifyTerminoProximoAVencer.mock.calls.filter((c: any[]) => c[0].origen === origen).length;

    const montar = async (terminos: any[], reglas: any[]) => {
        repo = crearRepoTerminos(terminos);
        repoAlertas = crearRepoAlertasEnviadas();
        notificaciones = {
            notifyTerminoProximoAVencer: jest.fn().mockResolvedValue(true),
            notifyResponsableAsignadoTermino: jest.fn().mockResolvedValue(undefined),
            notifyTerminoCreado: jest.fn().mockResolvedValue(undefined),
        };
        const repoVacio = { find: jest.fn(async () => []), findOne: jest.fn(async () => null) };
        const repoReglas = { find: jest.fn(async () => reglas.filter((r) => r.activa !== false)) };

        const moduleRef = await Test.createTestingModule({
            controllers: [TerminosController],
            providers: [
                TerminosService,
                AlertasVencimientoTerminosService,
                { provide: getRepositoryToken(TerminoProcesal), useValue: repo },
                { provide: getRepositoryToken(ReglaAlertaTermino), useValue: repoReglas },
                { provide: getRepositoryToken(AlertaTerminoEnviada), useValue: repoAlertas },
                { provide: getRepositoryToken(Expediente), useValue: repoVacio },
                { provide: getRepositoryToken(ConsultaJuridica), useValue: repoVacio },
                { provide: getRepositoryToken(RequerimientoOC), useValue: repoVacio },
                { provide: getRepositoryToken(ProcesoCoactivo), useValue: repoVacio },
                { provide: getRepositoryToken(Actuacion), useValue: repoVacio },
                { provide: getDataSourceToken(), useValue: { query: jest.fn(async () => []) } },
                { provide: LegalNotificationsService, useValue: notificaciones },
                { provide: SequenceService, useValue: { generateRadicado: jest.fn() } },
            ],
        }).compile();

        app = moduleRef.createNestApplication();
        await app.init();

        evaluacionesPendientes = [];
        const alertas = app.get(AlertasVencimientoTerminosService);
        const original = alertas.verificarTerminoInmediato.bind(alertas);
        jest.spyOn(alertas, 'verificarTerminoInmediato').mockImplementation((...args: any[]) => {
            const promesa = (original as any)(...args);
            evaluacionesPendientes.push(promesa.catch(() => undefined));
            return promesa;
        });
    };

    afterEach(async () => {
        if (app) await app.close();
        jest.clearAllMocks();
    });

    // -----------------------------------------------------------------------------------
    // Persistencia de los campos editables
    // -----------------------------------------------------------------------------------
    describe('campos del informe', () => {
        beforeEach(() => montar([crearTermino()], []));

        it('guarda los datos generales, la fuente normativa, el responsable y la prioridad', async () => {
            await request(app.getHttpServer())
                .patch('/terminos/uuid-informe')
                .send({
                    nombreActuacion: 'Informe de contabilidad — corregido',
                    enteSolicitante: 'Procuraduría General de la Nación',
                    destinatario: 'Oficina de Planeación',
                    prioridad: 'ALTA',
                    responsableId: 'resp-99',
                    fundamentoNormativo: [{ tipo: 'Ley', cita: 'Ley 1955 de 2019', actualizacionPeriodica: true, mesRecordatorio: 3 }],
                })
                .expect(200);

            const fila = repo.filas.find((f) => f.id === 'uuid-informe');
            expect(fila.nombreActuacion).toBe('Informe de contabilidad — corregido');
            expect(fila.enteSolicitante).toBe('Procuraduría General de la Nación');
            expect(fila.destinatario).toBe('Oficina de Planeación');
            expect(fila.prioridad).toBe('ALTA');
            expect(fila.responsableId).toBe('resp-99');
            expect(fila.fundamentoNormativo).toEqual([
                { tipo: 'Ley', cita: 'Ley 1955 de 2019', actualizacionPeriodica: true, mesRecordatorio: 3 },
            ]);
        });

        it('convierte el centinela "sin-asignar" del selector de responsable en null', async () => {
            await request(app.getHttpServer())
                .patch('/terminos/uuid-informe')
                .send({ responsableId: 'sin-asignar' })
                .expect(200);

            expect(repo.filas[0].responsableId).toBeNull();
        });

        it('responde 404 si el informe no existe', async () => {
            await request(app.getHttpServer())
                .patch('/terminos/no-existe')
                .send({ nombreActuacion: 'X' })
                .expect(404);
        });
    });

    // -----------------------------------------------------------------------------------
    // Parametrización del vencimiento
    // -----------------------------------------------------------------------------------
    describe('parametrización del vencimiento', () => {
        beforeEach(() => montar([crearTermino({
            fechaBase: new Date('2026-01-01T05:00:00.000Z'),
            fechaVencimiento: new Date('2026-01-12T04:59:59.999Z'), // 11/01 en Bogotá
            diasTermino: 10,
        })], []));

        it('ancla la fecha de vencimiento al final del día de Bogotá (no a medianoche UTC)', async () => {
            await request(app.getHttpServer())
                .patch('/terminos/uuid-informe')
                .send({ fechaVencimiento: '2026-02-20' })
                .expect(200);

            // 2026-02-20 23:59:59.999 en Bogotá (UTC-5) = 2026-02-21T04:59:59.999Z. Sin este
            // anclaje, un vencimiento "de hoy" quedaba guardado como vencido desde ayer.
            expect(new Date(repo.filas[0].fechaVencimiento).toISOString()).toBe('2026-02-21T04:59:59.999Z');
        });

        it('recalcula la duración del plazo cuando el cliente solo manda la fecha nueva', async () => {
            await request(app.getHttpServer())
                .patch('/terminos/uuid-informe')
                .send({ fechaVencimiento: '2026-01-21' })
                .expect(200);

            expect(repo.filas[0].diasTermino).toBe(20);
        });

        it('respeta la duración enviada explícitamente junto con las fechas y la unidad del plazo', async () => {
            await request(app.getHttpServer())
                .patch('/terminos/uuid-informe')
                .send({ fechaBase: '2026-01-05', fechaVencimiento: '2026-01-19', diasTermino: 10, tipoDias: 'HABILES' })
                .expect(200);

            expect(repo.filas[0].diasTermino).toBe(10);
            expect(repo.filas[0].tipoDias).toBe('HABILES');
            expect(new Date(repo.filas[0].fechaBase).toISOString()).toBe('2026-01-05T05:00:00.000Z');
        });
    });

    // -----------------------------------------------------------------------------------
    // Contraste contra la regla global de 3 días al editar el vencimiento
    // -----------------------------------------------------------------------------------
    describe('alerta contra la regla global de 3 días', () => {
        const REGLA_3_DIAS = { id: 'regla-3-dias', horasAnticipacion: 72, activa: true, descripcion: 'Alerta preventiva 3 días' };

        it('al acercar el vencimiento dentro de los 3 días, notifica de inmediato sin esperar al cron', async () => {
            await montar([crearTermino()], [REGLA_3_DIAS]);

            await request(app.getHttpServer())
                .patch('/terminos/uuid-informe')
                .send({ fechaVencimiento: ymdEnDias(2) })
                .expect(200);
            await esperarAlertas();

            expect(notificaciones.notifyTerminoProximoAVencer).toHaveBeenCalledWith(
                expect.objectContaining({ terminoId: 'uuid-informe', origen: 'automatica' }),
            );
            // Queda registrado el envío de ESA regla, para no repetirlo en cada corrida del cron.
            expect(repoAlertas.filas).toContainEqual({ terminoId: 'uuid-informe', reglaId: 'regla-3-dias' });
        });

        it('si el vencimiento nuevo queda fuera de los 3 días, no notifica nada', async () => {
            await montar([crearTermino()], [REGLA_3_DIAS]);

            await request(app.getHttpServer())
                .patch('/terminos/uuid-informe')
                .send({ fechaVencimiento: ymdEnDias(20) })
                .expect(200);
            await esperarAlertas();

            expect(notificaciones.notifyTerminoProximoAVencer).not.toHaveBeenCalled();
        });

        it('aplazar un informe ya alertado y volver a acercarlo vuelve a disparar la alerta (rearme)', async () => {
            await montar([crearTermino({ fechaVencimiento: new Date(Date.now() + 2 * DIAS) })], [REGLA_3_DIAS]);

            // 1) Entra en la ventana de la regla: se notifica y se registra el envío.
            await request(app.getHttpServer()).patch('/terminos/uuid-informe').send({ fechaVencimiento: ymdEnDias(1) }).expect(200);
            await esperarAlertas();
            expect(avisosDeOrigen('automatica')).toBe(1);

            // 2) Se aplaza fuera de la ventana: no se notifica, pero el envío previo se borra.
            await request(app.getHttpServer()).patch('/terminos/uuid-informe').send({ fechaVencimiento: ymdEnDias(30) }).expect(200);
            await esperarAlertas();
            expect(avisosDeOrigen('automatica')).toBe(1);
            expect(repoAlertas.filas).toHaveLength(0);

            // 3) Se vuelve a acercar: sin el rearme, este aviso no llegaría nunca.
            await request(app.getHttpServer()).patch('/terminos/uuid-informe').send({ fechaVencimiento: ymdEnDias(1) }).expect(200);
            await esperarAlertas();
            expect(avisosDeOrigen('automatica')).toBe(2);
        });

        it('una edición que no toca el plazo no reenvía la alerta ya enviada', async () => {
            await montar([crearTermino({ fechaVencimiento: new Date(Date.now() + 1 * DIAS) })], [REGLA_3_DIAS]);

            await request(app.getHttpServer()).patch('/terminos/uuid-informe').send({ fechaVencimiento: ymdEnDias(1) }).expect(200);
            await esperarAlertas();
            const avisosTrasMoverElPlazo = notificaciones.notifyTerminoProximoAVencer.mock.calls.length;
            expect(avisosDeOrigen('automatica')).toBe(1);

            await request(app.getHttpServer()).patch('/terminos/uuid-informe').send({ prioridad: 'ALTA' }).expect(200);
            await esperarAlertas();
            expect(notificaciones.notifyTerminoProximoAVencer.mock.calls.length).toBe(avisosTrasMoverElPlazo);
        });

        it('mover el vencimiento a una fecha ya pasada dispara además el aviso de "ya venció"', async () => {
            await montar([crearTermino()], [REGLA_3_DIAS]);

            await request(app.getHttpServer())
                .patch('/terminos/uuid-informe')
                .send({ fechaVencimiento: ymdEnDias(-5) })
                .expect(200);
            await esperarAlertas();

            const origenes = notificaciones.notifyTerminoProximoAVencer.mock.calls.map((c: any[]) => c[0].origen);
            expect(origenes).toContain('vencido');
            expect(repo.filas[0].alertaVencimientoEnviadaEn).toBeTruthy();
        });

        it('un informe con anticipación personalizada ignora la regla global de 3 días', async () => {
            // Umbral propio de 12 h: con el vencimiento a 2 días todavía no toca avisar, aunque
            // la regla global de 72 h sí habría disparado.
            await montar([crearTermino({ horasAnticipacionAlertaPersonalizada: 12 })], [REGLA_3_DIAS]);

            await request(app.getHttpServer())
                .patch('/terminos/uuid-informe')
                .send({ fechaVencimiento: ymdEnDias(2) })
                .expect(200);
            await esperarAlertas();

            expect(notificaciones.notifyTerminoProximoAVencer).not.toHaveBeenCalled();
        });

        it('sin reglas globales activas, mover el vencimiento no notifica nada', async () => {
            await montar([crearTermino()], [{ ...REGLA_3_DIAS, activa: false }]);

            await request(app.getHttpServer())
                .patch('/terminos/uuid-informe')
                .send({ fechaVencimiento: ymdEnDias(1) })
                .expect(200);
            await esperarAlertas();

            expect(notificaciones.notifyTerminoProximoAVencer).not.toHaveBeenCalled();
        });
    });
});
