import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { Actuacion } from '../entities/actuacion.entity';
import { DecisionDisciplinaria } from '../entities/decision-disciplinaria.entity';
import { Documento } from '../entities/documento.entity';
import { ExcepcionProcesal } from '../entities/excepcion-procesal.entity';
import { Expediente } from '../entities/expediente.entity';
import { ConfigurationsService } from './configurations.service';
import { ExpedienteService } from './expediente.service';
import { LegalNotificationsService } from './legal-notifications.service';

describe('ExpedienteService', () => {
    let service: ExpedienteService;
    let mockExpedienteRepo: any;
    let mockActuacionRepo: any;
    let mockDocumentoRepo: any;
    let mockDecisionRepo: any;
    let mockExcepcionRepo: any;
    let mockDataSource: any;
    let mockConfigService: any;
    let mockLegalNotifications: any;
    let queryBuilder: any;

    const expedienteId = '11111111-1111-1111-1111-111111111111';

    beforeEach(async () => {
        queryBuilder = {
            leftJoinAndSelect: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            addSelect: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            getMany: jest.fn().mockResolvedValue([]),
            getRawAndEntities: jest.fn(),
        };
        mockExpedienteRepo = {
            findOne: jest.fn(),
            find: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            create: jest.fn((data) => data),
            createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
            remove: jest.fn(),
        };
        mockActuacionRepo = {
            find: jest.fn().mockResolvedValue([]),
            save: jest.fn((data) => Promise.resolve({ id: 'act-1', ...data })),
            create: jest.fn((data) => data),
        };
        mockDocumentoRepo = {
            count: jest.fn(),
            find: jest.fn(),
        };
        mockDecisionRepo = {
            find: jest.fn(),
            save: jest.fn(),
            create: jest.fn((data) => data),
        };
        mockExcepcionRepo = {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn((data) => data),
        };
        mockDataSource = { query: jest.fn() };
        mockConfigService = {
            findByKey: jest.fn(),
            getEstadosForExpediente: jest.fn().mockResolvedValue([]),
            findEstadoIndex: jest.fn((estados: any[], value?: string) => (estados || []).findIndex((e) => e.id === value)),
        };
        mockLegalNotifications = {
            notifyProcesoCreado: jest.fn(),
            notifyProfesionalAsignado: jest.fn(),
            notifyProfesionalesProcesoAnexado: jest.fn(),
            notifyProcesoAnexado: jest.fn(),
            notifyEtapaAvanzada: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ExpedienteService,
                { provide: getRepositoryToken(Expediente), useValue: mockExpedienteRepo },
                { provide: getRepositoryToken(Actuacion), useValue: mockActuacionRepo },
                { provide: getRepositoryToken(Documento), useValue: mockDocumentoRepo },
                { provide: getRepositoryToken(DecisionDisciplinaria), useValue: mockDecisionRepo },
                { provide: getRepositoryToken(ExcepcionProcesal), useValue: mockExcepcionRepo },
                { provide: getDataSourceToken(), useValue: mockDataSource },
                { provide: ConfigurationsService, useValue: mockConfigService },
                { provide: LegalNotificationsService, useValue: mockLegalNotifications },
            ],
        }).compile();

        service = module.get<ExpedienteService>(ExpedienteService);
    });

    afterEach(() => jest.clearAllMocks());

    describe('crearExpediente()', () => {
        it('debe crear expediente con fechaVencimientoTermino calculada en DIAS_CALENDARIO', async () => {
            mockExpedienteRepo.findOne.mockResolvedValue(null);
            mockExpedienteRepo.save.mockImplementation(async (data) => ({ id: expedienteId, ...data }));

            const result = await service.crearExpediente({
                radicado: 'EXP-001',
                fechaNotificacion: new Date('2026-05-04T00:00:00.000Z'),
                terminoProcesalDias: 10,
                tipoConteoTermino: 'CALENDARIO',
            });

            expect(result.fechaVencimientoTermino.toISOString()).toBe('2026-05-14T00:00:00.000Z');
            expect(mockExpedienteRepo.save).toHaveBeenCalledWith(expect.objectContaining({ radicado: 'EXP-001' }));
        });

        it('debe calcular fechaVencimientoTermino en DIAS_HABILES con addBusinessDays', async () => {
            mockExpedienteRepo.findOne.mockResolvedValue(null);
            mockExpedienteRepo.save.mockImplementation(async (data) => ({ id: expedienteId, ...data }));

            const result = await service.crearExpediente({
                radicado: 'EXP-002',
                fechaNotificacion: new Date(2026, 4, 15),
                terminoProcesalDias: 1,
                tipoConteoTermino: 'HABILES',
            });

            expect(result.fechaVencimientoTermino.getFullYear()).toBe(2026);
            expect(result.fechaVencimientoTermino.getMonth()).toBe(4);
            expect(result.fechaVencimientoTermino.getDate()).toBe(18);
            expect(result.fechaVencimientoTermino.getDay()).toBe(1);
        });

        it('debe calcular fechaPrescripcion automáticamente para jurisdicción DISCIPLINARIO', async () => {
            mockExpedienteRepo.findOne.mockResolvedValue(null);
            mockConfigService.findByKey.mockResolvedValue({ value: { years: 3 } });
            mockExpedienteRepo.save.mockImplementation(async (data) => ({ id: expedienteId, ...data }));

            const result = await service.crearExpediente({
                radicado: 'EXP-003',
                jurisdiccion: 'DISCIPLINARIO',
                fechaRadicacion: new Date('2026-01-10T00:00:00.000Z'),
            });

            expect(mockConfigService.findByKey).toHaveBeenCalledWith('prescripcion_juzgamiento');
            expect(result.fechaPrescripcion.toISOString()).toBe('2029-01-10T00:00:00.000Z');
        });

        it('debe lanzar ConflictException si el radicado ya existe', async () => {
            mockExpedienteRepo.findOne.mockResolvedValue({ id: 'existing' });

            await expect(service.crearExpediente({ radicado: 'EXP-004' })).rejects.toBeInstanceOf(ConflictException);
            expect(mockExpedienteRepo.save).not.toHaveBeenCalled();
        });

        it('debe llamar notifyProcesoCreado después de guardar', async () => {
            mockExpedienteRepo.findOne.mockResolvedValue(null);
            mockExpedienteRepo.save.mockResolvedValue({ id: expedienteId, radicado: 'EXP-005', jurisdiccion: 'CONTENCIOSO' });

            await service.crearExpediente({ radicado: 'EXP-005' }, 'Usuario Prueba');

            expect(mockLegalNotifications.notifyProcesoCreado).toHaveBeenCalledWith({
                modulo: 'DEFENSA_JUDICIAL',
                radicado: 'EXP-005',
                procesoId: expedienteId,
                creadoPor: 'Usuario Prueba',
            });
        });

        it('debe llamar notifyProfesionalAsignado si hay abogadoSustanciador en la creación', async () => {
            mockExpedienteRepo.findOne.mockResolvedValue(null);
            mockExpedienteRepo.save.mockResolvedValue({
                id: expedienteId,
                radicado: 'EXP-006',
                jurisdiccion: 'DISCIPLINARIO',
                abogadoSustanciador: 'abogado-1',
            });

            await service.crearExpediente({ radicado: 'EXP-006', abogadoSustanciador: 'abogado-1' }, 'Coordinador');

            expect(mockLegalNotifications.notifyProfesionalAsignado).toHaveBeenCalledWith(expect.objectContaining({
                modulo: 'JUZGAMIENTO_DISCIPLINARIO',
                abogadoId: 'abogado-1',
                asignadoPor: 'Coordinador',
                esReasignacion: false,
            }));
        });
    });

    describe('existeRadicado()', () => {
        it('debe retornar false cuando no hay expediente con ese radicado', async () => {
            mockExpedienteRepo.findOne.mockResolvedValue(null);

            await expect(service.existeRadicado('EXP-999')).resolves.toBe(false);
            expect(mockExpedienteRepo.findOne).toHaveBeenCalledWith({
                where: { radicado: 'EXP-999' },
                select: ['id'],
            });
        });

        it('debe retornar true cuando ya existe un expediente con ese radicado (sin restricción por abogado, a diferencia de listarExpedientes)', async () => {
            mockExpedienteRepo.findOne.mockResolvedValue({ id: 'existing' });

            await expect(service.existeRadicado('EXP-004')).resolves.toBe(true);
        });

        it('no debe considerar duplicado el propio expediente que se está editando (excludeId)', async () => {
            mockExpedienteRepo.findOne.mockResolvedValue({ id: expedienteId });

            await expect(service.existeRadicado('EXP-004', expedienteId)).resolves.toBe(false);
        });

        it('debe seguir detectando un duplicado real aunque se pase excludeId de otro expediente', async () => {
            mockExpedienteRepo.findOne.mockResolvedValue({ id: 'otro-expediente' });

            await expect(service.existeRadicado('EXP-004', expedienteId)).resolves.toBe(true);
        });
    });

    describe('listarExpedientes()', () => {
        it('debe resolver profesionales desde auth para los IDs encontrados', async () => {
            queryBuilder.getRawAndEntities.mockResolvedValue({
                entities: [{ id: expedienteId, radicado: 'EXP-007', abogadoSustanciador: 'user-1' }],
                raw: [{ expediente_id: expedienteId, conteo_docs: '2' }],
            });
            mockDataSource.query.mockResolvedValue([{ id_user: 'user-1', public_id: 'public-1', nombre: 'Ana Legal', identificacion: '123' }]);

            const result = await service.listarExpedientes({});

            expect(mockDataSource.query).toHaveBeenCalledWith(expect.stringContaining('FROM auth."user"'), [['user-1']]);
            expect(result[0].abogadoAsignado).toEqual({ id: 'user-1', nombre: 'Ana Legal', identificacion: '123' });
            expect(result[0].documentosCount).toBe(2);
        });

        it("debe retornar abogadoAsignado con nombre 'Sin asignar' si auth.query retorna vacío", async () => {
            queryBuilder.getRawAndEntities.mockResolvedValue({
                entities: [{ id: expedienteId, radicado: 'EXP-008', abogadoSustanciador: 'missing-user' }],
                raw: [{ expediente_id: expedienteId, conteo_docs: '0' }],
            });
            mockDataSource.query.mockResolvedValue([]);

            const result = await service.listarExpedientes({});

            expect(result[0].abogadoAsignado).toEqual({ id: 'missing-user', nombre: 'Sin asignar', identificacion: '' });
        });

        it('debe no consultar auth si no hay expedientes con abogadoSustanciador', async () => {
            queryBuilder.getRawAndEntities.mockResolvedValue({
                entities: [{ id: expedienteId, radicado: 'EXP-009', abogadoSustanciador: null }],
                raw: [{ expediente_id: expedienteId, conteo_docs: '0' }],
            });

            const result = await service.listarExpedientes({});

            expect(mockDataSource.query).not.toHaveBeenCalled();
            expect(result[0].abogadoAsignado).toEqual({ id: null, nombre: 'Sin asignar', identificacion: '' });
        });

        it('debe retornar Map vacío si ids es array vacío', async () => {
            const result = await (service as any).resolveProfesionalesDesdeAuth([]);

            expect(result).toBeInstanceOf(Map);
            expect(result.size).toBe(0);
            expect(mockDataSource.query).not.toHaveBeenCalled();
        });

        it('debe retornar Map vacío y logar warn si dataSource.query lanza error', async () => {
            queryBuilder.getRawAndEntities.mockResolvedValue({
                entities: [{ id: expedienteId, radicado: 'EXP-010', abogadoSustanciador: 'user-error' }],
                raw: [{ expediente_id: expedienteId, conteo_docs: '0' }],
            });
            mockDataSource.query.mockRejectedValue(new Error('auth offline'));

            const result = await service.listarExpedientes({});

            expect(result[0].abogadoAsignado.nombre).toBe('Sin asignar');
        });
    });

    describe('updateExpediente()', () => {
        it('debe registrar actuación CAMBIO_ETAPA cuando etapaProcesal cambia', async () => {
            const agregarSpy = jest.spyOn(service, 'agregarActuacion').mockResolvedValue({} as Actuacion);
            jest.spyOn(service, 'findOne')
                .mockResolvedValueOnce({ id: expedienteId, radicado: 'EXP-011', etapaProcesal: 'RADICACION', estado: 'ACTIVO' } as unknown as Expediente)
                .mockResolvedValueOnce({ id: expedienteId, radicado: 'EXP-011', etapaProcesal: 'PRUEBAS', estado: 'ACTIVO' } as unknown as Expediente);

            await service.updateExpediente(expedienteId, { etapaProcesal: 'PRUEBAS' });

            expect(agregarSpy).toHaveBeenCalledWith(expedienteId, expect.objectContaining({
                tipoActuacion: 'CAMBIO_ETAPA',
                descripcion: 'Cambio de etapa: RADICACION -> PRUEBAS',
            }));
        });

        it('debe registrar actuación CAMBIO_ESTADO cuando estado cambia', async () => {
            const agregarSpy = jest.spyOn(service, 'agregarActuacion').mockResolvedValue({} as Actuacion);
            jest.spyOn(service, 'findOne')
                .mockResolvedValueOnce({ id: expedienteId, radicado: 'EXP-012', etapaProcesal: 'RADICACION', estado: 'ACTIVO' } as unknown as Expediente)
                .mockResolvedValueOnce({ id: expedienteId, radicado: 'EXP-012', etapaProcesal: 'RADICACION', estado: 'SUSPENDIDO' } as unknown as Expediente);

            await service.updateExpediente(expedienteId, { estado: 'SUSPENDIDO' });

            expect(agregarSpy).toHaveBeenCalledWith(expedienteId, expect.objectContaining({
                tipoActuacion: 'CAMBIO_ESTADO',
                descripcion: 'Cambio de estado: ACTIVO -> SUSPENDIDO',
            }));
        });

        it('debe agregar abogado anterior a abogadosAnteriores al reasignar', async () => {
            jest.spyOn(service, 'findOne')
                .mockResolvedValueOnce({ id: expedienteId, radicado: 'EXP-013', abogadoSustanciador: 'abogado-previo', abogadosAnteriores: [] } as unknown as Expediente)
                .mockResolvedValueOnce({ id: expedienteId, radicado: 'EXP-013', abogadoSustanciador: 'abogado-nuevo', abogadosAnteriores: ['abogado-previo'] } as unknown as Expediente);

            await service.updateExpediente(expedienteId, { abogadoSustanciador: 'abogado-nuevo' });

            expect(mockExpedienteRepo.update).toHaveBeenCalledWith(expedienteId, expect.objectContaining({
                abogadoSustanciador: 'abogado-nuevo',
                abogadosAnteriores: ['abogado-previo'],
            }));
        });

        it('debe notificar avance de etapa (notifyEtapaAvanzada) al abogado y al aprobador de la nueva etapa', async () => {
            jest.spyOn(service, 'agregarActuacion').mockResolvedValue({} as Actuacion);
            mockActuacionRepo.find.mockResolvedValue([]);
            mockConfigService.getEstadosForExpediente.mockResolvedValue([
                { id: 'RADICACION', nombre: 'Radicación', orden: 1, activo: true, aprobacionTipo: 'ninguno' },
                { id: 'PRUEBAS', nombre: 'Pruebas', orden: 2, activo: true, aprobacionTipo: 'rol', aprobacionRol: 'JEFE_GESTION_LEGAL' },
            ]);
            jest.spyOn(service, 'findOne')
                .mockResolvedValueOnce({ id: expedienteId, radicado: 'EXP-015', tipoProceso: 'Reparación Directa', etapaProcesal: 'RADICACION', abogadoSustanciador: 'abogado-1' } as unknown as Expediente)
                .mockResolvedValueOnce({ id: expedienteId, radicado: 'EXP-015', tipoProceso: 'Reparación Directa', etapaProcesal: 'PRUEBAS', abogadoSustanciador: 'abogado-1' } as unknown as Expediente);

            await service.updateExpediente(expedienteId, { etapaProcesal: 'PRUEBAS' });

            expect(mockLegalNotifications.notifyEtapaAvanzada).toHaveBeenCalledWith(expect.objectContaining({
                modulo: 'DEFENSA_JUDICIAL',
                radicado: 'EXP-015',
                etapaNombre: 'Pruebas',
                abogadoId: 'abogado-1',
                aprobacionTipo: 'rol',
                aprobacionRol: 'JEFE_GESTION_LEGAL',
            }));
        });

        it('NO debe notificar avance de etapa cuando es una devolución (retroceso de etapa)', async () => {
            jest.spyOn(service, 'agregarActuacion').mockResolvedValue({} as Actuacion);
            mockActuacionRepo.find.mockResolvedValue([]);
            mockConfigService.getEstadosForExpediente.mockResolvedValue([
                { id: 'RADICACION', nombre: 'Radicación', orden: 1, activo: true, aprobacionTipo: 'ninguno' },
                { id: 'PRUEBAS', nombre: 'Pruebas', orden: 2, activo: true, aprobacionTipo: 'rol', aprobacionRol: 'JEFE_GESTION_LEGAL' },
            ]);
            jest.spyOn(service, 'findOne')
                .mockResolvedValueOnce({ id: expedienteId, radicado: 'EXP-016', tipoProceso: 'Reparación Directa', etapaProcesal: 'PRUEBAS', abogadoSustanciador: 'abogado-1' } as unknown as Expediente)
                .mockResolvedValueOnce({ id: expedienteId, radicado: 'EXP-016', tipoProceso: 'Reparación Directa', etapaProcesal: 'RADICACION', abogadoSustanciador: 'abogado-1' } as unknown as Expediente);

            await service.updateExpediente(expedienteId, { etapaProcesal: 'RADICACION' });

            expect(mockLegalNotifications.notifyEtapaAvanzada).not.toHaveBeenCalled();
        });

        it('debe llamar notifyProfesionalAsignado con esReasignacion: true al reasignar abogado', async () => {
            jest.spyOn(service, 'findOne')
                .mockResolvedValueOnce({ id: expedienteId, radicado: 'EXP-014', tipoProceso: 'Disciplinario', abogadoSustanciador: 'abogado-previo' } as unknown as Expediente)
                .mockResolvedValueOnce({ id: expedienteId, radicado: 'EXP-014', tipoProceso: 'Disciplinario', abogadoSustanciador: 'abogado-nuevo' } as unknown as Expediente);

            await service.updateExpediente(expedienteId, { abogadoSustanciador: 'abogado-nuevo' });

            expect(mockLegalNotifications.notifyProfesionalAsignado).toHaveBeenCalledWith(expect.objectContaining({
                modulo: 'JUZGAMIENTO_DISCIPLINARIO',
                abogadoId: 'abogado-nuevo',
                esReasignacion: true,
            }));
        });
    });
});
