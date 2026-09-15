/**
 * E2E del flujo de eliminación de términos, a nivel de endpoint HTTP real.
 *
 * Cubre la capa que los tests unitarios se saltan: routing de Nest, binding de los query params
 * (`?estado=` y `?permanente=`) y el recorrido completo controller -> service -> repositorio.
 * El repositorio es en memoria pero interpreta de verdad las condiciones que arma `findAll`,
 * así que un filtro mal construido o un parámetro que no llegue se detecta aquí.
 *
 * Contrato verificado:
 *   - DELETE /terminos/:id                  -> soft delete (la fila queda con estado ELIMINADO)
 *   - DELETE /terminos/:id?permanente=true  -> borrado real (la fila desaparece)
 *   - GET    /terminos/listado              -> excluye los eliminados
 *   - GET    /terminos/listado?estado=ELIMINADO -> devuelve exactamente los eliminados
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
import { Expediente } from '../src/entities/expediente.entity';
import { ConsultaJuridica } from '../src/entities/consulta-juridica.entity';
import { RequerimientoOC } from '../src/entities/requerimiento-oc.entity';
import { ProcesoCoactivo } from '../src/entities/proceso-coactivo.entity';
import { Actuacion } from '../src/entities/actuacion.entity';

function crearTermino(overrides: Partial<TerminoProcesal> = {}): any {
    return {
        id: 'uuid-base',
        origenModulo: 'MANUAL',
        referenciaId: null,
        numeroRadicado: 'TERM-2026-0001',
        nombreActuacion: 'Actuación de prueba',
        fechaBase: new Date('2026-09-01T00:00:00.000Z'),
        diasTermino: 30,
        tipoDias: 'CALENDARIO',
        fechaVencimiento: new Date('2026-10-01T00:00:00.000Z'),
        estado: 'PENDIENTE',
        prioridad: 'MEDIA',
        responsableId: null,
        responsableNombre: 'Luis Ramírez',
        observaciones: null,
        ...overrides,
    };
}

/**
 * Repositorio en memoria que aplica realmente las condiciones que `findAll` arma con el
 * query builder (no un mock ciego): así el test falla si el filtro por estado se rompe.
 */
function crearRepoEnMemoria(filasIniciales: any[]) {
    const filas = [...filasIniciales];
    return {
        filas,
        findOne: jest.fn(async ({ where }: any) => filas.find((f) => f.id === where.id) ?? null),
        save: jest.fn(async (entidad: any) => {
            const i = filas.findIndex((f) => f.id === entidad.id);
            if (i >= 0) filas[i] = { ...filas[i], ...entidad };
            else filas.push(entidad);
            return entidad;
        }),
        remove: jest.fn(async (entidad: any) => {
            const i = filas.findIndex((f) => f.id === entidad.id);
            if (i >= 0) filas.splice(i, 1);
            return entidad;
        }),
        update: jest.fn(async () => undefined),
        count: jest.fn(async () => filas.length),
        find: jest.fn(async () => filas),
        createQueryBuilder: jest.fn(() => {
            const condiciones: Array<(f: any) => boolean> = [];
            const qb: any = {
                where: () => qb,
                orderBy: () => qb,
                andWhere: (sql: string, params: any = {}) => {
                    if (sql.includes('termino.estado = :estado')) {
                        condiciones.push((f) => f.estado === params.estado);
                    } else if (sql.includes('termino.estado != :estadoEliminado')) {
                        condiciones.push((f) => f.estado !== params.estadoEliminado);
                    }
                    return qb;
                },
                getMany: async () => filas.filter((f) => condiciones.every((c) => c(f))),
            };
            return qb;
        }),
    };
}

describe('Términos · flujo de eliminación (e2e por endpoint)', () => {
    let app: INestApplication;
    let repo: ReturnType<typeof crearRepoEnMemoria>;

    beforeEach(async () => {
        // Filas nuevas en cada test: el servicio muta la entidad que devuelve findOne(), así que
        // reutilizar los mismos objetos filtraría el estado de un test al siguiente.
        repo = crearRepoEnMemoria([
            crearTermino({ id: 'uuid-activo', numeroRadicado: 'TERM-2026-0001', estado: 'PENDIENTE' }),
            crearTermino({ id: 'uuid-ya-eliminado', numeroRadicado: 'TERM-2026-0002', estado: 'ELIMINADO' }),
        ]);
        const repoVacio = { find: jest.fn(async () => []), findOne: jest.fn(async () => null) };

        const moduleRef = await Test.createTestingModule({
            controllers: [TerminosController],
            providers: [
                TerminosService,
                { provide: getRepositoryToken(TerminoProcesal), useValue: repo },
                { provide: getRepositoryToken(Expediente), useValue: repoVacio },
                { provide: getRepositoryToken(ConsultaJuridica), useValue: repoVacio },
                { provide: getRepositoryToken(RequerimientoOC), useValue: repoVacio },
                { provide: getRepositoryToken(ProcesoCoactivo), useValue: repoVacio },
                { provide: getRepositoryToken(Actuacion), useValue: repoVacio },
                { provide: getDataSourceToken(), useValue: { query: jest.fn(async () => []) } },
                { provide: LegalNotificationsService, useValue: { notifyResponsableAsignadoTermino: jest.fn(), notifyTerminoCreado: jest.fn() } },
                { provide: SequenceService, useValue: { generateRadicado: jest.fn() } },
                { provide: AlertasVencimientoTerminosService, useValue: { verificarTerminoInmediato: jest.fn(async () => undefined) } },
            ],
        }).compile();

        app = moduleRef.createNestApplication();
        await app.init();
    });

    afterEach(async () => {
        await app.close();
    });

    it('GET /terminos/listado excluye los términos eliminados', async () => {
        const res = await request(app.getHttpServer()).get('/terminos/listado').expect(200);

        expect(res.body.map((t: any) => t.id)).toEqual(['uuid-activo']);
    });

    it('GET /terminos/listado?estado=ELIMINADO devuelve exactamente los eliminados', async () => {
        const res = await request(app.getHttpServer())
            .get('/terminos/listado')
            .query({ estado: 'ELIMINADO' })
            .expect(200);

        expect(res.body.map((t: any) => t.id)).toEqual(['uuid-ya-eliminado']);
    });

    it('DELETE /terminos/:id hace soft delete: la fila sigue existiendo marcada como ELIMINADO', async () => {
        await request(app.getHttpServer()).delete('/terminos/uuid-activo').expect(200);

        const fila = repo.filas.find((f) => f.id === 'uuid-activo');
        expect(fila).toBeDefined();
        expect(fila.estado).toBe('ELIMINADO');
        expect(repo.remove).not.toHaveBeenCalled();
    });

    it('tras eliminar, el término sale del listado activo y aparece en el de eliminados', async () => {
        await request(app.getHttpServer()).delete('/terminos/uuid-activo').expect(200);

        const activos = await request(app.getHttpServer()).get('/terminos/listado').expect(200);
        expect(activos.body.map((t: any) => t.id)).not.toContain('uuid-activo');

        const eliminados = await request(app.getHttpServer())
            .get('/terminos/listado')
            .query({ estado: 'ELIMINADO' })
            .expect(200);
        expect(eliminados.body.map((t: any) => t.id)).toContain('uuid-activo');
    });

    it('DELETE /terminos/:id?permanente=true borra la fila de verdad', async () => {
        await request(app.getHttpServer())
            .delete('/terminos/uuid-ya-eliminado')
            .query({ permanente: 'true' })
            .expect(200);

        expect(repo.filas.find((f) => f.id === 'uuid-ya-eliminado')).toBeUndefined();

        const eliminados = await request(app.getHttpServer())
            .get('/terminos/listado')
            .query({ estado: 'ELIMINADO' })
            .expect(200);
        expect(eliminados.body).toEqual([]);
    });

    it('un valor distinto de "true" en permanente no debe borrar la fila (solo soft delete)', async () => {
        await request(app.getHttpServer())
            .delete('/terminos/uuid-activo')
            .query({ permanente: 'false' })
            .expect(200);

        const fila = repo.filas.find((f) => f.id === 'uuid-activo');
        expect(fila).toBeDefined();
        expect(fila.estado).toBe('ELIMINADO');
    });
});
