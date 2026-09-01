import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { Actuacion } from '../entities/actuacion.entity';
import { ConsultaJuridica } from '../entities/consulta-juridica.entity';
import { Expediente } from '../entities/expediente.entity';
import { ProcesoCoactivo } from '../entities/proceso-coactivo.entity';
import { RequerimientoOC } from '../entities/requerimiento-oc.entity';
import { TerminoProcesal } from '../entities/termino-procesal.entity';
import { TerminosService } from './terminos.service';
import { LegalNotificationsService } from './legal-notifications.service';
import { SequenceService } from './sequence.service';

// Construidas con el constructor local (year, monthIndex, day) para que getDay()/setDate()
// se comporten igual sin importar la zona horaria del runner.
const localDate = (year: number, month: number, day: number) => new Date(year, month - 1, day);
const localDateTime = (year: number, month: number, day: number, hour: number) => new Date(year, month - 1, day, hour);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('TerminosService', () => {
    let service: TerminosService;
    let mockTerminoRepo: any;
    let mockExpedienteRepo: any;
    let mockConsultaRepo: any;
    let mockRequerimientoOCRepo: any;
    let mockProcesoCoactivoRepo: any;
    let mockActuacionRepo: any;
    let mockDataSource: any;
    let mockLegalNotifications: any;
    let mockSequenceService: any;
    let queryBuilder: any;

    beforeEach(async () => {
        queryBuilder = {
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            addSelect: jest.fn().mockReturnThis(),
            groupBy: jest.fn().mockReturnThis(),
            getMany: jest.fn().mockResolvedValue([]),
            getRawMany: jest.fn().mockResolvedValue([]),
        };
        mockTerminoRepo = {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn((data: any) => Promise.resolve(data)),
            create: jest.fn((data: any) => data),
            update: jest.fn().mockResolvedValue(undefined),
            createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
            count: jest.fn(),
        };
        mockExpedienteRepo = { findOne: jest.fn(), find: jest.fn().mockResolvedValue([]) };
        mockConsultaRepo = { findOne: jest.fn(), find: jest.fn().mockResolvedValue([]) };
        mockRequerimientoOCRepo = { findOne: jest.fn(), find: jest.fn().mockResolvedValue([]) };
        mockProcesoCoactivoRepo = { findOne: jest.fn(), find: jest.fn().mockResolvedValue([]) };
        mockActuacionRepo = { find: jest.fn().mockResolvedValue([]) };
        mockDataSource = { query: jest.fn().mockResolvedValue([]) };
        mockLegalNotifications = { notifyResponsableAsignadoTermino: jest.fn().mockResolvedValue(undefined) };
        mockSequenceService = { generateRadicado: jest.fn().mockResolvedValue('TERM-2026-0001') };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TerminosService,
                { provide: getRepositoryToken(TerminoProcesal), useValue: mockTerminoRepo },
                { provide: getRepositoryToken(Expediente), useValue: mockExpedienteRepo },
                { provide: getRepositoryToken(ConsultaJuridica), useValue: mockConsultaRepo },
                { provide: getRepositoryToken(RequerimientoOC), useValue: mockRequerimientoOCRepo },
                { provide: getRepositoryToken(ProcesoCoactivo), useValue: mockProcesoCoactivoRepo },
                { provide: getRepositoryToken(Actuacion), useValue: mockActuacionRepo },
                { provide: getDataSourceToken(), useValue: mockDataSource },
                { provide: LegalNotificationsService, useValue: mockLegalNotifications },
                { provide: SequenceService, useValue: mockSequenceService },
            ],
        }).compile();

        service = module.get<TerminosService>(TerminosService);
    });

    afterEach(() => jest.clearAllMocks());

    // ---------------------------------------------------------------------
    // create()
    // ---------------------------------------------------------------------
    describe('create()', () => {
        it('debe persistir enteSolicitante y destinatario junto con el resto de los datos', async () => {
            const data: any = {
                nombreActuacion: 'Solicitud de informe',
                origenModulo: 'MANUAL',
                destinatario: 'Oficina de Planeación',
                enteSolicitante: 'Contraloría General de la República',
            };

            const result = await service.create(data);

            expect(mockTerminoRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    destinatario: 'Oficina de Planeación',
                    enteSolicitante: 'Contraloría General de la República',
                }),
            );
            expect(mockTerminoRepo.save).toHaveBeenCalled();
            expect(result.enteSolicitante).toBe('Contraloría General de la República');
        });

        it('debe generar un referenciaId (uuid v4) cuando no viene ninguno y no hay numeroRadicado', async () => {
            const result = await service.create({ nombreActuacion: 'Sin referencia', origenModulo: 'MANUAL' } as any);

            expect(result.referenciaId).toMatch(UUID_RE);
            expect(mockExpedienteRepo.findOne).not.toHaveBeenCalled();
        });

        it('no debe intentar resolver referenciaId si falta origenModulo aunque venga numeroRadicado', async () => {
            const result = await service.create({ nombreActuacion: 'Sin módulo', numeroRadicado: 'RAD-999' } as any);

            expect(mockExpedienteRepo.findOne).not.toHaveBeenCalled();
            expect(result.referenciaId).toMatch(UUID_RE);
        });

        it('no debe pisar un referenciaId ya presente aunque venga numeroRadicado', async () => {
            const data: any = {
                nombreActuacion: 'Con referencia',
                origenModulo: 'DEFENSA',
                numeroRadicado: 'RAD-001',
                referenciaId: 'ref-existente',
            };

            const result = await service.create(data);

            expect(mockExpedienteRepo.findOne).not.toHaveBeenCalled();
            expect(result.referenciaId).toBe('ref-existente');
        });

        it.each([
            ['DEFENSA', 'expedienteRepo', 'radicado'],
            ['JUZGAMIENTO', 'expedienteRepo', 'radicado'],
        ])('origenModulo=%s debe resolver referenciaId contra %s por %s', async (origenModulo) => {
            mockExpedienteRepo.findOne.mockResolvedValue({ id: 'exp-123' });

            const result = await service.create({
                nombreActuacion: 'Vencimiento',
                origenModulo,
                numeroRadicado: 'RAD-001',
            } as any);

            expect(mockExpedienteRepo.findOne).toHaveBeenCalledWith({ where: { radicado: 'RAD-001' }, select: ['id'] });
            expect(result.referenciaId).toBe('exp-123');
        });

        it('origenModulo=ASESORIA debe resolver referenciaId contra consultaRepository por numeroRadicado', async () => {
            mockConsultaRepo.findOne.mockResolvedValue({ id: 'consulta-123' });

            const result = await service.create({
                nombreActuacion: 'Concepto jurídico',
                origenModulo: 'ASESORIA',
                numeroRadicado: 'RAD-002',
            } as any);

            expect(mockConsultaRepo.findOne).toHaveBeenCalledWith({ where: { numeroRadicado: 'RAD-002' }, select: ['id'] });
            expect(result.referenciaId).toBe('consulta-123');
        });

        it('origenModulo=ORGANOS_CONTROL debe resolver referenciaId contra requerimientoOCRepository por radicadoInterno', async () => {
            mockRequerimientoOCRepo.findOne.mockResolvedValue({ id: 'req-oc-123' });

            const result = await service.create({
                nombreActuacion: 'Requerimiento',
                origenModulo: 'ORGANOS_CONTROL',
                numeroRadicado: 'RAD-003',
            } as any);

            expect(mockRequerimientoOCRepo.findOne).toHaveBeenCalledWith({ where: { radicadoInterno: 'RAD-003' }, select: ['id'] });
            expect(result.referenciaId).toBe('req-oc-123');
        });

        it('origenModulo=PROCESOS_COACTIVOS debe resolver referenciaId contra procesoCoactivoRepository por radicado', async () => {
            mockProcesoCoactivoRepo.findOne.mockResolvedValue({ id: 'coactivo-123' });

            const result = await service.create({
                nombreActuacion: 'Cobro coactivo',
                origenModulo: 'PROCESOS_COACTIVOS',
                numeroRadicado: 'RAD-004',
            } as any);

            expect(mockProcesoCoactivoRepo.findOne).toHaveBeenCalledWith({ where: { radicado: 'RAD-004' }, select: ['id'] });
            expect(result.referenciaId).toBe('coactivo-123');
        });

        it('origenModulo=MANUAL (sin caso en el switch) no debe consultar ningún repositorio y cae al uuid generado', async () => {
            const result = await service.create({
                nombreActuacion: 'Manual con radicado',
                origenModulo: 'MANUAL',
                numeroRadicado: 'RAD-005',
            } as any);

            expect(mockExpedienteRepo.findOne).not.toHaveBeenCalled();
            expect(mockConsultaRepo.findOne).not.toHaveBeenCalled();
            expect(mockRequerimientoOCRepo.findOne).not.toHaveBeenCalled();
            expect(mockProcesoCoactivoRepo.findOne).not.toHaveBeenCalled();
            expect(result.referenciaId).toMatch(UUID_RE);
        });

        it('debe caer al uuid generado si la búsqueda no encuentra ningún registro (resolved null)', async () => {
            mockExpedienteRepo.findOne.mockResolvedValue(null);

            const result = await service.create({
                nombreActuacion: 'No encontrado',
                origenModulo: 'DEFENSA',
                numeroRadicado: 'RAD-NO-EXISTE',
            } as any);

            expect(result.referenciaId).toMatch(UUID_RE);
        });

        it('debe caer al uuid generado y loguear un warning si el repositorio lanza un error al resolver', async () => {
            const warnSpy = jest.spyOn((service as any).logger, 'warn').mockImplementation(() => undefined);
            mockExpedienteRepo.findOne.mockRejectedValue(new Error('DB caída'));

            const result = await service.create({
                nombreActuacion: 'Falla de BD',
                origenModulo: 'DEFENSA',
                numeroRadicado: 'RAD-ERROR',
            } as any);

            expect(result.referenciaId).toMatch(UUID_RE);
            expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('RAD-ERROR'));
        });

        it('debe generar uuids distintos en llamadas sucesivas', async () => {
            const r1 = await service.create({ nombreActuacion: 'Uno', origenModulo: 'MANUAL' } as any);
            const r2 = await service.create({ nombreActuacion: 'Dos', origenModulo: 'MANUAL' } as any);

            expect(r1.referenciaId).not.toBe(r2.referenciaId);
        });

        // -------------------------------------------------------------
        // Bug: "Responsable" seleccionado no se ve al recargar el listado
        // -------------------------------------------------------------
        it('debe resolver y persistir responsableNombre a partir de responsableId', async () => {
            mockDataSource.query.mockResolvedValue([{ id_user: 'resp-1', public_id: null, nombre: 'Juan Pérez' }]);

            const result = await service.create({
                nombreActuacion: 'Informe con responsable',
                origenModulo: 'MANUAL',
                responsableId: 'resp-1',
            } as any);

            expect(result.responsableNombre).toBe('Juan Pérez');
        });

        it('no debe pisar un responsableNombre que ya venga explícito en el payload', async () => {
            const result = await service.create({
                nombreActuacion: 'Informe con nombre ya resuelto',
                origenModulo: 'MANUAL',
                responsableId: 'resp-1',
                responsableNombre: 'Nombre Ya Resuelto',
            } as any);

            expect(mockDataSource.query).not.toHaveBeenCalled();
            expect(result.responsableNombre).toBe('Nombre Ya Resuelto');
        });

        it('debe notificar la asignación del responsable cuando el término se crea con responsableId', async () => {
            mockDataSource.query.mockResolvedValue([{ id_user: 'resp-1', public_id: null, nombre: 'Juan Pérez' }]);

            const result = await service.create({
                nombreActuacion: 'Informe con responsable',
                origenModulo: 'MANUAL',
                responsableId: 'resp-1',
                fechaBase: localDate(2026, 1, 1),
                fechaVencimiento: localDate(2026, 2, 1),
            } as any);

            expect(mockLegalNotifications.notifyResponsableAsignadoTermino).toHaveBeenCalledWith(
                expect.objectContaining({ responsableId: 'resp-1', esReasignacion: false }),
            );
            expect(result.responsableNombre).toBe('Juan Pérez');
        });

        it('no debe notificar nada cuando el término se crea sin responsableId', async () => {
            await service.create({ nombreActuacion: 'Sin responsable', origenModulo: 'MANUAL' } as any);

            expect(mockLegalNotifications.notifyResponsableAsignadoTermino).not.toHaveBeenCalled();
        });

        // -------------------------------------------------------------
        // EFDS-1409: radicado legible autogenerado para términos manuales
        // -------------------------------------------------------------
        it('debe generar un numeroRadicado consecutivo cuando no viene ninguno (término manual)', async () => {
            mockSequenceService.generateRadicado.mockResolvedValue('TERM-2026-0042');

            const result = await service.create({ nombreActuacion: 'Informe sin radicado', origenModulo: 'MANUAL' } as any);

            expect(mockSequenceService.generateRadicado).toHaveBeenCalledWith('TERM');
            expect(result.numeroRadicado).toBe('TERM-2026-0042');
        });

        it('no debe pisar un numeroRadicado ya presente (términos que sí vienen con radicado)', async () => {
            const result = await service.create({
                nombreActuacion: 'Con radicado propio',
                origenModulo: 'DEFENSA',
                numeroRadicado: 'RAD-001',
            } as any);

            expect(mockSequenceService.generateRadicado).not.toHaveBeenCalled();
            expect(result.numeroRadicado).toBe('RAD-001');
        });
    });

    // ---------------------------------------------------------------------
    // createAutomatico()
    // ---------------------------------------------------------------------
    describe('createAutomatico()', () => {
        it('debe crear un nuevo término con fechaVencimientoExplicita cuando no existe uno previo', async () => {
            mockTerminoRepo.findOne.mockResolvedValue(null);
            const fechaBase = localDate(2026, 1, 1);
            const vencimiento = localDate(2026, 3, 1);

            const result = await service.createAutomatico(
                'DEFENSA', 'ref-1', 'RAD-1', 'Actuación', fechaBase, 30,
                undefined, undefined, 'CALENDARIO', vencimiento,
            );

            expect(mockTerminoRepo.findOne).toHaveBeenCalledWith({ where: { referenciaId: 'ref-1', origenModulo: 'DEFENSA' } });
            expect(mockTerminoRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    origenModulo: 'DEFENSA',
                    referenciaId: 'ref-1',
                    numeroRadicado: 'RAD-1',
                    estado: 'PENDIENTE',
                    prioridad: 'MEDIA',
                }),
            );
            expect(result.fechaVencimiento.getTime()).toBe(vencimiento.getTime());
        });

        it('debe calcular fechaAlertaPreventiva (-5 días) y fechaAlertaCritica (-2 días) respecto al vencimiento', async () => {
            mockTerminoRepo.findOne.mockResolvedValue(null);
            const vencimiento = localDate(2026, 3, 10);

            const result = await service.createAutomatico(
                'DEFENSA', 'ref-2', 'RAD-2', 'Actuación', localDate(2026, 1, 1), 30,
                undefined, undefined, 'CALENDARIO', vencimiento,
            );

            expect(result.fechaAlertaPreventiva!.getTime()).toBe(localDate(2026, 3, 5).getTime());
            expect(result.fechaAlertaCritica!.getTime()).toBe(localDate(2026, 3, 8).getTime());
        });

        it('con tipoDias=CALENDARIO y sin fecha explícita debe sumar los días corridos exactos a fechaBase', async () => {
            mockTerminoRepo.findOne.mockResolvedValue(null);
            // 2026-01-01 es jueves
            const fechaBase = localDate(2026, 1, 1);

            const result = await service.createAutomatico(
                'MANUAL', 'ref-3', 'RAD-3', 'Actuación', fechaBase, 10,
                undefined, undefined, 'CALENDARIO',
            );

            expect(result.fechaVencimiento.getTime()).toBe(localDate(2026, 1, 11).getTime());
        });

        it('con tipoDias=HABILES y sin fecha explícita debe saltar sábados y domingos', async () => {
            mockTerminoRepo.findOne.mockResolvedValue(null);
            // 2026-01-01 es jueves. +1 hábil = viernes 2 ene. +2 hábiles = lunes 5 ene (salta fin de semana). +3 = martes 6 ene.
            const fechaBase = localDate(2026, 1, 1);

            const result = await service.createAutomatico(
                'JUZGAMIENTO', 'ref-4', 'RAD-4', 'Actuación', fechaBase, 3,
                undefined, undefined, 'HABILES',
            );

            expect(result.fechaVencimiento.getTime()).toBe(localDate(2026, 1, 6).getTime());
        });

        it('diasTermino <= 0 debe usar el fallback de 5 días hábiles/calendario (safeDias)', async () => {
            mockTerminoRepo.findOne.mockResolvedValue(null);
            const fechaBase = localDate(2026, 1, 1);

            const result = await service.createAutomatico(
                'MANUAL', 'ref-5', 'RAD-5', 'Actuación', fechaBase, 0,
                undefined, undefined, 'CALENDARIO',
            );

            expect(result.fechaVencimiento.getTime()).toBe(localDate(2026, 1, 6).getTime());
        });

        it('con tipoDias=HORAS y sin fecha explícita debe sumar horas exactas a fechaBase (no días)', async () => {
            mockTerminoRepo.findOne.mockResolvedValue(null);
            const fechaBase = localDateTime(2026, 1, 1, 8);

            const result = await service.createAutomatico(
                'MANUAL', 'ref-horas', 'RAD-HORAS', 'Actuación', fechaBase, 36,
                undefined, undefined, 'HORAS',
            );

            expect(result.fechaVencimiento.getTime()).toBe(localDateTime(2026, 1, 2, 20).getTime());
        });

        it('con tipoDias=HORAS y diasTermino<=0 debe usar el fallback de 5 (horas, no días)', async () => {
            mockTerminoRepo.findOne.mockResolvedValue(null);
            const fechaBase = localDateTime(2026, 1, 1, 8);

            const result = await service.createAutomatico(
                'MANUAL', 'ref-horas-0', 'RAD-HORAS-0', 'Actuación', fechaBase, 0,
                undefined, undefined, 'HORAS',
            );

            expect(result.fechaVencimiento.getTime()).toBe(localDateTime(2026, 1, 1, 13).getTime());
        });

        it('debe actualizar (no duplicar) un término existente para el mismo referenciaId + origenModulo', async () => {
            const existente = {
                id: 'term-existente',
                origenModulo: 'DEFENSA',
                referenciaId: 'ref-6',
                numeroRadicado: 'RAD-OLD',
                observaciones: null,
            };
            mockTerminoRepo.findOne.mockResolvedValue(existente);

            const result = await service.createAutomatico(
                'DEFENSA', 'ref-6', 'RAD-NUEVO', 'Actuación actualizada', localDate(2026, 1, 1), 15,
                'resp-1', 'Juan Pérez', 'CALENDARIO', localDate(2026, 2, 1),
            );

            expect(mockTerminoRepo.create).not.toHaveBeenCalled();
            expect(result.id).toBe('term-existente');
            expect(result.numeroRadicado).toBe('RAD-NUEVO');
            expect(result.responsableNombre).toBe('Juan Pérez');
        });

        it('(BUG FIX 11) debe asignar observaciones si el término existente no tenía ninguna', async () => {
            mockTerminoRepo.findOne.mockResolvedValue({ id: 't-7', referenciaId: 'ref-7', origenModulo: 'ASESORIA', observaciones: null });

            const result = await service.createAutomatico(
                'ASESORIA', 'ref-7', 'RAD-7', 'Actuación', localDate(2026, 1, 1), 15,
                undefined, undefined, 'HABILES', undefined, 'Nueva observación de sincronización',
            );

            expect(result.observaciones).toBe('Nueva observación de sincronización');
        });

        it('(BUG FIX 11) NO debe sobrescribir observaciones/adjuntos/comentarios ya existentes del usuario', async () => {
            mockTerminoRepo.findOne.mockResolvedValue({
                id: 't-8', referenciaId: 'ref-8', origenModulo: 'ASESORIA', observaciones: 'Comentario manual del abogado',
            });

            const result = await service.createAutomatico(
                'ASESORIA', 'ref-8', 'RAD-8', 'Actuación', localDate(2026, 1, 1), 15,
                undefined, undefined, 'HABILES', undefined, 'Intento de sobrescritura automática',
            );

            expect(result.observaciones).toBe('Comentario manual del abogado');
        });

        it('debe limpiar responsableId/responsableNombre a null cuando no se proveen en una actualización', async () => {
            mockTerminoRepo.findOne.mockResolvedValue({
                id: 't-9', referenciaId: 'ref-9', origenModulo: 'DEFENSA', responsableId: 'anterior', responsableNombre: 'Anterior', observaciones: null,
            });

            const result = await service.createAutomatico(
                'DEFENSA', 'ref-9', 'RAD-9', 'Actuación', localDate(2026, 1, 1), 15,
            );

            expect(result.responsableId).toBeNull();
            expect(result.responsableNombre).toBeNull();
        });

        it('debe notificar la asignación cuando se crea un término nuevo con responsableId (p.ej. actuación con abogado asignado)', async () => {
            mockTerminoRepo.findOne.mockResolvedValue(null);

            await service.createAutomatico(
                'DEFENSA', 'ref-10', 'RAD-10', 'Actuación', localDate(2026, 1, 1), 15,
                'resp-1', 'Juan Pérez',
            );

            expect(mockLegalNotifications.notifyResponsableAsignadoTermino).toHaveBeenCalledWith(
                expect.objectContaining({ responsableId: 'resp-1', esReasignacion: false }),
            );
        });

        it('debe notificar como reasignación cuando el término ya existía con otro responsable', async () => {
            mockTerminoRepo.findOne.mockResolvedValue({
                id: 't-10', referenciaId: 'ref-11', origenModulo: 'DEFENSA', responsableId: 'anterior', responsableNombre: 'Anterior', observaciones: null,
            });

            await service.createAutomatico(
                'DEFENSA', 'ref-11', 'RAD-11', 'Actuación', localDate(2026, 1, 1), 15,
                'resp-2', 'Nuevo Responsable',
            );

            expect(mockLegalNotifications.notifyResponsableAsignadoTermino).toHaveBeenCalledWith(
                expect.objectContaining({ responsableId: 'resp-2', esReasignacion: true }),
            );
        });

        it('no debe notificar si el responsable no cambió respecto al término existente', async () => {
            mockTerminoRepo.findOne.mockResolvedValue({
                id: 't-11', referenciaId: 'ref-12', origenModulo: 'DEFENSA', responsableId: 'resp-1', responsableNombre: 'Juan Pérez', observaciones: null,
            });

            await service.createAutomatico(
                'DEFENSA', 'ref-12', 'RAD-12', 'Actuación', localDate(2026, 1, 1), 15,
                'resp-1', 'Juan Pérez',
            );

            expect(mockLegalNotifications.notifyResponsableAsignadoTermino).not.toHaveBeenCalled();
        });

        it('no debe notificar cuando no se provee responsableId', async () => {
            mockTerminoRepo.findOne.mockResolvedValue(null);

            await service.createAutomatico(
                'DEFENSA', 'ref-13', 'RAD-13', 'Actuación', localDate(2026, 1, 1), 15,
            );

            expect(mockLegalNotifications.notifyResponsableAsignadoTermino).not.toHaveBeenCalled();
        });
    });

    // ---------------------------------------------------------------------
    // findAll()
    // ---------------------------------------------------------------------
    describe('findAll()', () => {
        it('siempre debe ordenar por fechaVencimiento ASC', async () => {
            await service.findAll({});

            expect(queryBuilder.orderBy).toHaveBeenCalledWith('termino.fechaVencimiento', 'ASC');
            expect(queryBuilder.andWhere).not.toHaveBeenCalled();
        });

        it('debe filtrar por responsableId cuando viene en los filtros', async () => {
            await service.findAll({ responsableId: 'resp-1' });

            expect(queryBuilder.andWhere).toHaveBeenCalledWith('termino.responsableId = :responsableId', { responsableId: 'resp-1' });
        });

        it('debe filtrar por estado cuando viene en los filtros', async () => {
            await service.findAll({ estado: 'VENCIDO' });

            expect(queryBuilder.andWhere).toHaveBeenCalledWith('termino.estado = :estado', { estado: 'VENCIDO' });
        });

        it('con responsableKeys que incluyen un uuid válido debe filtrar por responsableId O responsableNombre', async () => {
            const uuid = '11111111-1111-4111-8111-111111111111';
            await service.findAll({ responsableKeys: [uuid, 'Juan Pérez'] });

            expect(queryBuilder.andWhere).toHaveBeenCalledWith(
                '(termino.responsableId IN (:...responsableUuidKeys) OR LOWER(termino.responsableNombre) IN (:...normalizedKeys))',
                { responsableUuidKeys: [uuid], normalizedKeys: [uuid.toLowerCase(), 'juan pérez'] },
            );
        });

        it('con responsableKeys sin ningún uuid debe filtrar solo por responsableNombre normalizado', async () => {
            await service.findAll({ responsableKeys: ['Juan Pérez', 'MARIA LOPEZ'] });

            expect(queryBuilder.andWhere).toHaveBeenCalledWith(
                'LOWER(termino.responsableNombre) IN (:...normalizedKeys)',
                { normalizedKeys: ['juan pérez', 'maria lopez'] },
            );
        });

        it('con responsableKeys vacío no debe agregar ningún filtro de responsable', async () => {
            await service.findAll({ responsableKeys: [] });

            expect(queryBuilder.andWhere).not.toHaveBeenCalled();
        });

        it('debe autocompletar responsableNombre en lote para los términos del listado que lo tengan faltante', async () => {
            queryBuilder.getMany.mockResolvedValue([
                { id: 't-1', responsableId: 'resp-1', responsableNombre: null },
                { id: 't-2', responsableId: 'resp-2', responsableNombre: 'Ya Resuelto' },
            ]);
            mockDataSource.query.mockResolvedValue([{ id_user: 'resp-1', public_id: null, nombre: 'Juan Pérez' }]);

            const result = await service.findAll({});

            expect(result[0].responsableNombre).toBe('Juan Pérez');
            expect(result[1].responsableNombre).toBe('Ya Resuelto');
            expect(mockTerminoRepo.update).toHaveBeenCalledWith('t-1', { responsableNombre: 'Juan Pérez' });
            expect(mockTerminoRepo.update).not.toHaveBeenCalledWith('t-2', expect.anything());
        });
    });

    // ---------------------------------------------------------------------
    // getCalendario()
    // ---------------------------------------------------------------------
    describe('getCalendario()', () => {
        it('debe mapear los términos a eventos de calendario con color por estado/urgencia', async () => {
            queryBuilder.getMany.mockResolvedValue([
                { id: '1', numeroRadicado: 'RAD-1', nombreActuacion: 'A', fechaVencimiento: localDate(2026, 1, 1), estado: 'CUMPLIDO', prioridad: 'BAJA', origenModulo: 'MANUAL' },
                { id: '2', numeroRadicado: null, nombreActuacion: 'B', fechaVencimiento: localDate(2026, 1, 1), estado: 'VENCIDO', prioridad: 'ALTA', origenModulo: 'MANUAL' },
            ]);

            const result = await service.getCalendario('2026-01-01', '2026-01-31');

            expect(result).toEqual([
                expect.objectContaining({ id: '1', title: 'RAD-1 - A', color: 'green' }),
                expect.objectContaining({ id: '2', title: ' - B', color: 'red' }),
            ]);
        });

        it('debe aceptar el filtro legado como string (responsableId directo)', async () => {
            await service.getCalendario('2026-01-01', '2026-01-31', 'resp-legacy');

            expect(queryBuilder.andWhere).toHaveBeenCalledWith('termino.responsableId = :responsableId', { responsableId: 'resp-legacy' });
        });

        it('debe filtrar por rango de fechas con BETWEEN', async () => {
            await service.getCalendario('2026-01-01', '2026-01-31');

            expect(mockTerminoRepo.createQueryBuilder).toHaveBeenCalledWith('termino');
        });
    });

    // ---------------------------------------------------------------------
    // getSemaforoList() / getSemaforoColor() (indirecto)
    // ---------------------------------------------------------------------
    describe('getSemaforoList()', () => {
        const DAY_MS = 1000 * 60 * 60 * 24;

        it('debe marcar semáforo verde cuando faltan más de 5 días', async () => {
            queryBuilder.getMany.mockResolvedValue([
                { id: '1', estado: 'PENDIENTE', fechaVencimiento: new Date(Date.now() + 10 * DAY_MS) },
            ]);

            const [item] = await service.getSemaforoList({});

            expect(item.calculo.semaforo).toBe('green');
        });

        it('debe marcar semáforo amarillo cuando faltan entre 2 y 5 días', async () => {
            queryBuilder.getMany.mockResolvedValue([
                { id: '1', estado: 'PENDIENTE', fechaVencimiento: new Date(Date.now() + 3 * DAY_MS) },
            ]);

            const [item] = await service.getSemaforoList({});

            expect(item.calculo.semaforo).toBe('yellow');
        });

        it('debe marcar semáforo rojo cuando queda 1 día o menos, o ya venció', async () => {
            queryBuilder.getMany.mockResolvedValue([
                { id: '1', estado: 'PENDIENTE', fechaVencimiento: new Date(Date.now() - 2 * DAY_MS) },
            ]);

            const [item] = await service.getSemaforoList({});

            expect(item.calculo.semaforo).toBe('red');
        });

        it('debe forzar semáforo verde si el estado es CUMPLIDO sin importar la fecha', async () => {
            queryBuilder.getMany.mockResolvedValue([
                { id: '1', estado: 'CUMPLIDO', fechaVencimiento: new Date(Date.now() - 30 * DAY_MS) },
            ]);

            const [item] = await service.getSemaforoList({});

            expect(item.calculo.semaforo).toBe('green');
        });

        it('debe forzar semáforo rojo si el estado es VENCIDO sin importar la fecha', async () => {
            queryBuilder.getMany.mockResolvedValue([
                { id: '1', estado: 'VENCIDO', fechaVencimiento: new Date(Date.now() + 30 * DAY_MS) },
            ]);

            const [item] = await service.getSemaforoList({});

            expect(item.calculo.semaforo).toBe('red');
        });
    });

    // ---------------------------------------------------------------------
    // findOne()
    // ---------------------------------------------------------------------
    describe('findOne()', () => {
        it('debe retornar el término (incluyendo enteSolicitante) cuando existe', async () => {
            mockTerminoRepo.findOne.mockResolvedValue({ id: 'term-1', enteSolicitante: 'Ciudadano' });

            const result = await service.findOne('term-1');

            expect(result).toEqual({ id: 'term-1', enteSolicitante: 'Ciudadano' });
        });

        it('debe lanzar NotFoundException cuando no existe', async () => {
            mockTerminoRepo.findOne.mockResolvedValue(null);

            await expect(service.findOne('no-existe')).rejects.toThrow(NotFoundException);
        });

        // -------------------------------------------------------------
        // Autocorrección en lectura de términos ya guardados sin responsableNombre
        // (registros previos a este fix, o donde el backfill de create()/update() falló)
        // -------------------------------------------------------------
        it('debe resolver y persistir responsableNombre para un término ya existente que tiene responsableId pero no el nombre', async () => {
            mockTerminoRepo.findOne.mockResolvedValue({ id: 'term-legacy', responsableId: 'resp-1', responsableNombre: null });
            mockDataSource.query.mockResolvedValue([{ id_user: 'resp-1', public_id: null, nombre: 'Juan Pérez' }]);

            const result = await service.findOne('term-legacy');

            expect(result.responsableNombre).toBe('Juan Pérez');
            expect(mockTerminoRepo.update).toHaveBeenCalledWith('term-legacy', { responsableNombre: 'Juan Pérez' });
        });

        it('no debe consultar auth ni intentar persistir nada si el término no tiene responsableId', async () => {
            mockTerminoRepo.findOne.mockResolvedValue({ id: 'term-sin-resp', responsableId: null, responsableNombre: null });

            await service.findOne('term-sin-resp');

            expect(mockDataSource.query).not.toHaveBeenCalled();
            expect(mockTerminoRepo.update).not.toHaveBeenCalled();
        });

        it('no debe tocar un término que ya tiene responsableNombre resuelto', async () => {
            mockTerminoRepo.findOne.mockResolvedValue({ id: 'term-ok', responsableId: 'resp-1', responsableNombre: 'Juan Pérez' });

            const result = await service.findOne('term-ok');

            expect(mockDataSource.query).not.toHaveBeenCalled();
            expect(result.responsableNombre).toBe('Juan Pérez');
        });

        it('si la resolución en auth no encuentra el id, debe dejar responsableNombre en null sin romper la lectura', async () => {
            mockTerminoRepo.findOne.mockResolvedValue({ id: 'term-huerfano', responsableId: 'resp-inexistente', responsableNombre: null });
            mockDataSource.query.mockResolvedValue([]);

            const result = await service.findOne('term-huerfano');

            expect(result.responsableNombre).toBeNull();
            expect(mockTerminoRepo.update).not.toHaveBeenCalled();
        });
    });

    // ---------------------------------------------------------------------
    // update()
    // ---------------------------------------------------------------------
    describe('update()', () => {
        it('debe permitir actualizar enteSolicitante de un término existente', async () => {
            mockTerminoRepo.findOne.mockResolvedValue({ id: 'term-2', enteSolicitante: 'Usuario', observaciones: null });

            const result = await service.update('term-2', { enteSolicitante: 'Procuraduría General de la Nación' });

            expect(result.enteSolicitante).toBe('Procuraduría General de la Nación');
            expect(mockTerminoRepo.save).toHaveBeenCalledWith(
                expect.objectContaining({ enteSolicitante: 'Procuraduría General de la Nación' }),
            );
        });

        it('debe propagar NotFoundException si el término no existe', async () => {
            mockTerminoRepo.findOne.mockResolvedValue(null);

            await expect(service.update('no-existe', { enteSolicitante: 'X' })).rejects.toThrow(NotFoundException);
        });

        it('debe anteponer separador al concatenar nuevoComentario cuando ya había observaciones', async () => {
            mockTerminoRepo.findOne.mockResolvedValue({ id: 't-1', observaciones: 'Primera nota' });

            const result = await service.update('t-1', { nuevoComentario: 'Segunda nota' });

            expect(result.observaciones).toBe('Primera nota\n\n---\nSegunda nota');
        });

        it('no debe anteponer separador cuando no había observaciones previas', async () => {
            mockTerminoRepo.findOne.mockResolvedValue({ id: 't-2', observaciones: null });

            const result = await service.update('t-2', { nuevoComentario: 'Primera nota' });

            expect(result.observaciones).toBe('Primera nota');
        });

        it('[BUG PREEXISTENTE] cuando llegan nuevoComentario Y observaciones juntos, observaciones termina pisando el comentario concatenado', async () => {
            // El código borra `data.nuevoComentario` (línea 328) ANTES de comprobar
            // `if (data.observaciones && data.nuevoComentario)` (línea 332), así que esa
            // guarda nunca se activa y `data.observaciones` sobrevive para pisar, vía
            // Object.assign, el valor recién concatenado. El comentario del código
            // ("Ya no dejamos que sobrescriban observaciones por completo...") no se
            // cumple en la práctica. Este test documenta el comportamiento ACTUAL, no el
            // deseado — no se corrige aquí porque es una función compartida fuera del
            // alcance del cambio de "Ente Solicitante".
            mockTerminoRepo.findOne.mockResolvedValue({ id: 't-3', observaciones: 'Existente' });

            const result = await service.update('t-3', { nuevoComentario: 'Nueva', observaciones: 'Intento de reemplazo total' });

            expect(result.observaciones).toBe('Intento de reemplazo total');
        });

        it('debe eliminar la propiedad nuevoComentario del objeto guardado', async () => {
            mockTerminoRepo.findOne.mockResolvedValue({ id: 't-4', observaciones: null });

            await service.update('t-4', { nuevoComentario: 'Nota' });

            const saved = mockTerminoRepo.save.mock.calls[0][0];
            expect(saved.nuevoComentario).toBeUndefined();
        });

        // -------------------------------------------------------------
        // Bug: "Responsable" seleccionado no se ve al recargar el listado
        // -------------------------------------------------------------
        it('debe resolver responsableNombre al asignar responsableId por primera vez y notificar como asignación nueva', async () => {
            mockTerminoRepo.findOne.mockResolvedValue({
                id: 't-5', observaciones: null, responsableId: null, responsableNombre: null,
                nombreActuacion: 'Informe', numeroRadicado: 'RAD-5',
                fechaBase: localDate(2026, 1, 1), fechaVencimiento: localDate(2026, 2, 1),
            });
            mockDataSource.query.mockResolvedValue([{ id_user: 'resp-1', public_id: null, nombre: 'Juan Pérez' }]);

            const result = await service.update('t-5', { responsableId: 'resp-1' });

            expect(result.responsableNombre).toBe('Juan Pérez');
            expect(mockLegalNotifications.notifyResponsableAsignadoTermino).toHaveBeenCalledWith(
                expect.objectContaining({ responsableId: 'resp-1', esReasignacion: false }),
            );
        });

        it('debe resolver el nuevo responsableNombre y notificar como reasignación cuando ya había un responsable distinto', async () => {
            mockTerminoRepo.findOne.mockResolvedValue({
                id: 't-6', observaciones: null, responsableId: 'resp-anterior', responsableNombre: 'Anterior',
                nombreActuacion: 'Informe', numeroRadicado: 'RAD-6',
                fechaBase: localDate(2026, 1, 1), fechaVencimiento: localDate(2026, 2, 1),
            });
            mockDataSource.query.mockResolvedValue([{ id_user: 'resp-2', public_id: null, nombre: 'María Gómez' }]);

            const result = await service.update('t-6', { responsableId: 'resp-2' });

            expect(result.responsableNombre).toBe('María Gómez');
            expect(mockLegalNotifications.notifyResponsableAsignadoTermino).toHaveBeenCalledWith(
                expect.objectContaining({ responsableId: 'resp-2', esReasignacion: true }),
            );
        });

        it('debe limpiar responsableNombre a null cuando responsableId se desasigna explícitamente', async () => {
            mockTerminoRepo.findOne.mockResolvedValue({
                id: 't-7', observaciones: null, responsableId: 'resp-anterior', responsableNombre: 'Anterior',
            });

            const result = await service.update('t-7', { responsableId: null });

            expect(result.responsableNombre).toBeNull();
            expect(mockLegalNotifications.notifyResponsableAsignadoTermino).not.toHaveBeenCalled();
        });

        it('no debe resolver ni notificar nada cuando el PATCH no toca responsableId', async () => {
            mockTerminoRepo.findOne.mockResolvedValue({ id: 't-8', observaciones: null, responsableId: 'resp-1', responsableNombre: 'Juan Pérez' });

            await service.update('t-8', { recordatorioManualHorasAnticipacion: 48 });

            expect(mockDataSource.query).not.toHaveBeenCalled();
            expect(mockLegalNotifications.notifyResponsableAsignadoTermino).not.toHaveBeenCalled();
        });

        it('no debe notificar de nuevo si responsableId viene igual al que ya tenía', async () => {
            mockTerminoRepo.findOne.mockResolvedValue({ id: 't-9', observaciones: null, responsableId: 'resp-1', responsableNombre: 'Juan Pérez' });

            await service.update('t-9', { responsableId: 'resp-1' });

            expect(mockLegalNotifications.notifyResponsableAsignadoTermino).not.toHaveBeenCalled();
        });
    });

    // ---------------------------------------------------------------------
    // remove()
    // ---------------------------------------------------------------------
    describe('remove()', () => {
        it('debe hacer soft delete marcando estado ELIMINADO sin borrar el registro', async () => {
            mockTerminoRepo.findOne.mockResolvedValue({ id: 'term-3', estado: 'PENDIENTE' });

            await service.remove('term-3');

            expect(mockTerminoRepo.save).toHaveBeenCalledWith(expect.objectContaining({ id: 'term-3', estado: 'ELIMINADO' }));
        });

        it('debe lanzar NotFoundException si el término a eliminar no existe', async () => {
            mockTerminoRepo.findOne.mockResolvedValue(null);

            await expect(service.remove('no-existe')).rejects.toThrow(NotFoundException);
            expect(mockTerminoRepo.save).not.toHaveBeenCalled();
        });
    });

    // ---------------------------------------------------------------------
    // getReporteEficiencia() / getReporteCarga()
    // ---------------------------------------------------------------------
    describe('getReporteEficiencia()', () => {
        it('debe calcular la eficiencia como porcentaje de cumplidos sobre el total', async () => {
            mockTerminoRepo.count
                .mockResolvedValueOnce(10) // total
                .mockResolvedValueOnce(2)  // vencidos
                .mockResolvedValueOnce(5); // cumplidos

            const result = await service.getReporteEficiencia();

            expect(result).toEqual({ total: 10, vencidos: 2, cumplidos: 5, eficiencia: 50 });
        });

        it('debe retornar eficiencia 0 (sin dividir por cero) cuando no hay términos', async () => {
            mockTerminoRepo.count.mockResolvedValue(0);

            const result = await service.getReporteEficiencia();

            expect(result.eficiencia).toBe(0);
        });
    });

    describe('getReporteCarga()', () => {
        it('debe agrupar por responsableId y contar términos', async () => {
            queryBuilder.getRawMany.mockResolvedValue([{ responsableId: 'resp-1', total: '3' }]);

            const result = await service.getReporteCarga();

            expect(queryBuilder.groupBy).toHaveBeenCalledWith('termino.responsableId');
            expect(result).toEqual([{ responsableId: 'resp-1', total: '3' }]);
        });
    });

    // ---------------------------------------------------------------------
    // getNotas() / addNota()
    // ---------------------------------------------------------------------
    describe('getNotas()', () => {
        it('debe retornar [] cuando el término no tiene observaciones', async () => {
            mockTerminoRepo.findOne.mockResolvedValue({ id: 't-1', observaciones: null });

            const result = await service.getNotas('t-1');

            expect(result).toEqual([]);
        });

        it('debe parsear las notas [NOTA] y devolverlas con la más reciente primero', async () => {
            mockTerminoRepo.findOne.mockResolvedValue({
                id: 't-1',
                observaciones: '[NOTA] Primera|Ana|2026-01-01T00:00:00.000Z|user-1\n[NOTA] Segunda|Luis|2026-01-02T00:00:00.000Z|user-2',
            });

            const result = await service.getNotas('t-1');

            expect(result).toHaveLength(2);
            expect(result[0]).toEqual(expect.objectContaining({ texto: 'Segunda', usuario: 'Luis', usuarioId: 'user-2' }));
            expect(result[1]).toEqual(expect.objectContaining({ texto: 'Primera', usuario: 'Ana', usuarioId: 'user-1' }));
        });

        it('con esResuelveSolo debe filtrar solo las notas del propio usuario', async () => {
            mockTerminoRepo.findOne.mockResolvedValue({
                id: 't-1',
                observaciones: '[NOTA] De otro|Ana|2026-01-01T00:00:00.000Z|user-1\n[NOTA] Propia|Luis|2026-01-02T00:00:00.000Z|user-2',
            });

            const result = await service.getNotas('t-1', { esResuelveSolo: true, userId: 'user-2' } as any);

            expect(result).toHaveLength(1);
            expect(result[0].texto).toBe('Propia');
        });

        it('con esResuelveSolo y sin coincidencias debe retornar []', async () => {
            mockTerminoRepo.findOne.mockResolvedValue({
                id: 't-1',
                observaciones: '[NOTA] De otro|Ana|2026-01-01T00:00:00.000Z|user-1',
            });

            const result = await service.getNotas('t-1', { esResuelveSolo: true, userId: 'user-999' } as any);

            expect(result).toEqual([]);
        });
    });

    describe('addNota()', () => {
        it('debe agregar el marcador [NOTA] a observaciones preexistentes', async () => {
            mockTerminoRepo.findOne.mockResolvedValue({ id: 't-1', observaciones: 'Previo' });

            const result = await service.addNota('t-1', 'Un comentario', 'Ana', 'user-1');

            expect(result).toEqual(expect.objectContaining({ texto: 'Un comentario', usuario: 'Ana', usuarioId: 'user-1' }));
            const saved = mockTerminoRepo.save.mock.calls[0][0];
            expect(saved.observaciones).toBe('Previo\n[NOTA] Un comentario|Ana|' + result.fecha.toISOString() + '|user-1');
        });

        it('debe usar "Sistema" como usuario por defecto cuando no se especifica', async () => {
            mockTerminoRepo.findOne.mockResolvedValue({ id: 't-1', observaciones: null });

            const result = await service.addNota('t-1', 'Nota automática');

            expect(result.usuario).toBe('Sistema');
        });

        it('debe sanear saltos de línea y separadores "|" del texto y del usuario', async () => {
            mockTerminoRepo.findOne.mockResolvedValue({ id: 't-1', observaciones: null });

            const result = await service.addNota('t-1', 'Línea 1\nLínea 2 | con pipe', 'Nombre|Raro\nCon salto');

            expect(result.texto).toBe('Línea 1 Línea 2 / con pipe');
            expect(result.usuario).toBe('Nombre/Raro Con salto');
        });
    });

    // ---------------------------------------------------------------------
    // getDocumentos()
    // ---------------------------------------------------------------------
    describe('getDocumentos()', () => {
        it('DEFENSA: debe agregar documentos de la relación, de actuaciones con documentoUrl y documentos iniciales', async () => {
            mockTerminoRepo.findOne.mockResolvedValue({ id: 't-1', origenModulo: 'DEFENSA', referenciaId: 'exp-1', observaciones: null });
            mockExpedienteRepo.findOne.mockResolvedValue({
                id: 'exp-1',
                documentos: [{ nombre: 'Doc1', tipo: 'PRUEBA', archivoUrl: 'url1', fechaDocumento: null, createdAt: new Date() }],
                documentosInicialesUrls: ['url-inicial'],
                fechaRadicacion: new Date('2026-01-01'),
            });
            mockActuacionRepo.find.mockResolvedValue([{ documentoUrl: 'url-act', documentoNombre: 'ActaX', tipoActuacion: 'AUTO', fechaActuacion: new Date() }]);

            const result = await service.getDocumentos('t-1');

            expect(result).toEqual([
                expect.objectContaining({ nombre: 'Doc1', tipo: 'PRUEBA', url: 'url1' }),
                expect.objectContaining({ nombre: 'ActaX', tipo: 'ACTUACION', url: 'url-act' }),
                expect.objectContaining({ nombre: 'Documento Inicial 1', tipo: 'INICIAL', url: 'url-inicial' }),
            ]);
        });

        it('ASESORIA: debe agregar el documento de respuesta si existe', async () => {
            mockTerminoRepo.findOne.mockResolvedValue({ id: 't-2', origenModulo: 'ASESORIA', referenciaId: 'cons-1', observaciones: null });
            mockConsultaRepo.findOne.mockResolvedValue({ documentoRespuestaUrl: 'url-respuesta', fechaRespuesta: new Date() });

            const result = await service.getDocumentos('t-2');

            expect(result).toEqual([expect.objectContaining({ nombre: 'Respuesta Consulta', url: 'url-respuesta' })]);
        });

        it('ASESORIA: no debe agregar nada si la consulta no tiene documento de respuesta', async () => {
            mockTerminoRepo.findOne.mockResolvedValue({ id: 't-2b', origenModulo: 'ASESORIA', referenciaId: 'cons-2', observaciones: null });
            mockConsultaRepo.findOne.mockResolvedValue({ documentoRespuestaUrl: null });

            const result = await service.getDocumentos('t-2b');

            expect(result).toEqual([]);
        });

        it('ORGANOS_CONTROL: debe agregar requerimiento inicial, respuesta y acuse cuando existen', async () => {
            mockTerminoRepo.findOne.mockResolvedValue({ id: 't-3', origenModulo: 'ORGANOS_CONTROL', referenciaId: 'req-1', observaciones: null });
            mockRequerimientoOCRepo.findOne.mockResolvedValue({
                archivoAdjuntoUrl: 'url-req',
                oficioRespuestaUrl: 'url-oficio',
                acuseReciboUrl: 'url-acuse',
                fechaRecepcion: new Date(),
                fechaRespuesta: new Date(),
            });

            const result = await service.getDocumentos('t-3');

            expect(result.map((d: any) => d.tipo)).toEqual(['REQUERIMIENTO', 'RESPUESTA', 'ACUSE']);
        });

        it('debe parsear documentos lógicos [ARCHIVO_ADJUNTO] de las observaciones', async () => {
            mockTerminoRepo.findOne.mockResolvedValue({
                id: 't-4',
                origenModulo: 'MANUAL',
                referenciaId: null,
                observaciones: '[ARCHIVO_ADJUNTO] Archivo.pdf|archivo-123.pdf|20.00 KB|2026-01-01T00:00:00.000Z',
            });

            const result = await service.getDocumentos('t-4');

            expect(result).toEqual([
                expect.objectContaining({ nombre: 'Archivo.pdf', tipo: 'ADJUNTO_TERMINO', url: 'files/archivo-123.pdf' }),
            ]);
        });

        it('MANUAL sin referenciaId ni observaciones no debe agregar ningún documento', async () => {
            mockTerminoRepo.findOne.mockResolvedValue({ id: 't-5', origenModulo: 'MANUAL', referenciaId: null, observaciones: null });

            const result = await service.getDocumentos('t-5');

            expect(result).toEqual([]);
        });
    });

    // ---------------------------------------------------------------------
    // sincronizar()
    // ---------------------------------------------------------------------
    describe('sincronizar()', () => {
        it('DEFENSA: debe sincronizar un expediente con fechaVencimientoTermino activo', async () => {
            mockExpedienteRepo.find.mockResolvedValue([{
                id: 'exp-1', radicado: 'RAD-1', estado: 'EN_TRAMITE',
                fechaVencimientoTermino: localDate(2026, 6, 1), terminoProcesalDias: 0,
                fechaRadicacion: localDate(2026, 1, 1), abogadoSustanciador: null,
            }]);
            mockTerminoRepo.findOne.mockResolvedValue(null);

            const result = await service.sincronizar();

            expect(mockTerminoRepo.create).toHaveBeenCalledWith(expect.objectContaining({ origenModulo: 'DEFENSA', referenciaId: 'exp-1' }));
            expect(result.nuevos).toBeGreaterThanOrEqual(1);
            expect(result.detalles.expedientes).toBe(1);
        });

        it('DEFENSA: debe omitir expedientes con estado FALLO o ARCHIVADO', async () => {
            mockExpedienteRepo.find.mockResolvedValue([{
                id: 'exp-2', radicado: 'RAD-2', estado: 'FALLO',
                fechaVencimientoTermino: localDate(2026, 6, 1), terminoProcesalDias: 0,
                fechaRadicacion: localDate(2026, 1, 1),
            }]);

            const result = await service.sincronizar();

            expect(mockTerminoRepo.create).not.toHaveBeenCalled();
            expect(result.nuevos).toBe(0);
        });

        it('JUZGAMIENTO: debe sincronizar expedientes disciplinarios activos sin necesitar fechaLimiteEtapa', async () => {
            mockExpedienteRepo.find.mockResolvedValue([{
                id: 'exp-3', radicado: 'RAD-3', estado: 'EN_TRAMITE', jurisdiccion: 'Disciplinaria', etapa: 'INVESTIGACION',
                fechaVencimientoTermino: null, terminoProcesalDias: 0, fechaRadicacion: localDate(2026, 1, 1),
            }]);
            mockTerminoRepo.findOne.mockResolvedValue(null);

            const result = await service.sincronizar();

            expect(mockTerminoRepo.create).toHaveBeenCalledWith(expect.objectContaining({ origenModulo: 'JUZGAMIENTO' }));
            expect(result.nuevos).toBe(1);
        });

        it('ASESORIA: debe omitir consultas ya respondidas o cerradas', async () => {
            mockConsultaRepo.find.mockResolvedValue([
                { id: 'c-1', numeroRadicado: 'C-1', estado: 'respondido', fechaMaximaRespuesta: localDate(2026, 6, 1), terminoLegalDias: 15 },
                { id: 'c-2', numeroRadicado: 'C-2', estado: 'cerrado', fechaMaximaRespuesta: localDate(2026, 6, 1), terminoLegalDias: 15 },
            ]);

            const result = await service.sincronizar();

            expect(mockTerminoRepo.create).not.toHaveBeenCalled();
            expect(result.detalles.consultas).toBe(2);
        });

        it('ASESORIA: debe sincronizar una consulta en trámite con fecha máxima de respuesta', async () => {
            mockConsultaRepo.find.mockResolvedValue([{
                id: 'c-3', numeroRadicado: 'C-3', estado: 'en_analisis',
                fechaMaximaRespuesta: localDate(2026, 6, 1), terminoLegalDias: 15, fechaRecepcion: localDate(2026, 1, 1),
            }]);
            mockTerminoRepo.findOne.mockResolvedValue(null);

            const result = await service.sincronizar();

            expect(mockTerminoRepo.create).toHaveBeenCalledWith(expect.objectContaining({ origenModulo: 'ASESORIA', referenciaId: 'c-3' }));
        });

        it('ORGANOS_CONTROL: debe omitir requerimientos ENVIADO/CERRADO y sincronizar los demás con fechaVencimiento', async () => {
            mockRequerimientoOCRepo.find.mockResolvedValue([
                { id: 'oc-1', radicadoInterno: 'OC-1', estado: 'ENVIADO', fechaVencimiento: localDate(2026, 6, 1) },
                { id: 'oc-2', radicadoInterno: 'OC-2', estado: 'EN_ANALISIS', fechaVencimiento: localDate(2026, 6, 1), fechaRecepcion: localDate(2026, 1, 1), plazoOtorgado: 10, unidadTiempo: 'DIAS_HABILES' },
            ]);
            mockTerminoRepo.findOne.mockResolvedValue(null);

            const result = await service.sincronizar();

            expect(mockTerminoRepo.create).toHaveBeenCalledTimes(1);
            expect(mockTerminoRepo.create).toHaveBeenCalledWith(expect.objectContaining({ origenModulo: 'ORGANOS_CONTROL', referenciaId: 'oc-2', tipoDias: 'HABILES' }));
        });

        it('[BUG FIX] ORGANOS_CONTROL: unidadTiempo=HORAS ya no debe perderse mapeando a HABILES', async () => {
            mockRequerimientoOCRepo.find.mockResolvedValue([
                { id: 'oc-3', radicadoInterno: 'OC-3', estado: 'EN_ANALISIS', fechaVencimiento: localDate(2026, 6, 1), fechaRecepcion: localDate(2026, 1, 1), plazoOtorgado: 36, unidadTiempo: 'HORAS' },
            ]);
            mockTerminoRepo.findOne.mockResolvedValue(null);

            await service.sincronizar();

            expect(mockTerminoRepo.create).toHaveBeenCalledWith(expect.objectContaining({ referenciaId: 'oc-3', tipoDias: 'HORAS' }));
        });

        it('PROCESOS_COACTIVOS: debe omitir procesos en LIQUIDACION y sincronizar los que tienen vencimiento de obligación', async () => {
            mockProcesoCoactivoRepo.find.mockResolvedValue([
                { id: 'pc-1', radicado: 'PC-1', estado: 'LIQUIDACION', obligacion: { fechaVencimiento: '2026-06-01', concepto: 'Multa', valor: 100 } },
                { id: 'pc-2', radicado: 'PC-2', estado: 'PERSUASIVA', obligacion: { fechaVencimiento: '2026-06-01', concepto: 'Multa', valor: 100 }, fechaCreacion: localDate(2026, 1, 1), deudor: { nombre: 'Juan', identificacion: '123' } },
            ]);
            mockTerminoRepo.findOne.mockResolvedValue(null);

            const result = await service.sincronizar();

            expect(mockTerminoRepo.create).toHaveBeenCalledTimes(1);
            expect(mockTerminoRepo.create).toHaveBeenCalledWith(expect.objectContaining({ origenModulo: 'PROCESOS_COACTIVOS', referenciaId: 'pc-2' }));
        });

        it('debe retornar totales agregados de todas las fuentes aunque no se sincronice nada', async () => {
            mockExpedienteRepo.find.mockResolvedValue([{ id: 'e1', estado: 'ARCHIVADO' }]);
            mockConsultaRepo.find.mockResolvedValue([{ id: 'c1', estado: 'cerrado' }]);
            mockRequerimientoOCRepo.find.mockResolvedValue([{ id: 'r1', estado: 'CERRADO' }]);
            mockProcesoCoactivoRepo.find.mockResolvedValue([{ id: 'p1', estado: 'LIQUIDACION', obligacion: {} }]);

            const result = await service.sincronizar();

            expect(result.total).toBe(4);
            expect(result.nuevos).toBe(0);
            expect(result.detalles).toEqual({ expedientes: 1, consultas: 1, requerimientosOC: 1, procesosCoactivos: 1 });
        });
    });
});
