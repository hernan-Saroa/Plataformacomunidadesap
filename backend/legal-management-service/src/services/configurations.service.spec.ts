import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SystemConfiguration } from '../entities/system-configuration.entity';
import { ConfigurationsService } from './configurations.service';

describe('ConfigurationsService.getEstadosForExpediente', () => {
    let service: ConfigurationsService;
    let mockRepo: any;

    const defensaConfig = {
        key: 'defensa-judicial',
        value: {
            estados: [
                { id: 'NOTIFICADA', nombre: 'Notificada', orden: 1, activo: true, aprobacionTipo: 'ninguno' },
            ],
            tiposProcesos: [
                {
                    id: 'reparacion-directa',
                    nombre: 'Reparación Directa',
                    estados: [
                        { id: 'NOTIFICADA', nombre: 'Notificada', orden: 1, activo: true, aprobacionTipo: 'ninguno' },
                        { id: 'PROBATORIA', nombre: 'Probatoria', orden: 2, activo: true, aprobacionTipo: 'rol', aprobacionRol: 'JEFE_GESTION_LEGAL' },
                    ],
                },
            ],
        },
    };

    beforeEach(async () => {
        mockRepo = { findOne: jest.fn(), find: jest.fn(), save: jest.fn(), create: jest.fn((d) => d) };
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ConfigurationsService,
                { provide: getRepositoryToken(SystemConfiguration), useValue: mockRepo },
            ],
        }).compile();
        service = module.get<ConfigurationsService>(ConfigurationsService);
    });

    afterEach(() => jest.clearAllMocks());

    it('resuelve los estados del tipoProceso cuando el expediente guarda el NOMBRE (acentos/espacios) y la config el slug', async () => {
        mockRepo.findOne.mockResolvedValue(defensaConfig);

        const estados = await service.getEstadosForExpediente({ tipoProceso: 'Reparación Directa' });

        // Debe encontrar los estados del tipoProceso (con la etapa de aprobación), NO el board por defecto del módulo.
        expect(estados).toHaveLength(2);
        expect(estados.find((e: any) => e.id === 'PROBATORIA')?.aprobacionRol).toBe('JEFE_GESTION_LEGAL');
    });

    it('también casa cuando el expediente guarda el slug directamente', async () => {
        mockRepo.findOne.mockResolvedValue(defensaConfig);

        const estados = await service.getEstadosForExpediente({ tipoProceso: 'reparacion-directa' });

        expect(estados).toHaveLength(2);
    });

    it('usa la key juzgamiento para jurisdicción DISCIPLINARIO', async () => {
        mockRepo.findOne.mockResolvedValue({ key: 'juzgamiento', value: { tiposProcesos: [] } });

        await service.getEstadosForExpediente({ tipoProceso: 'X', jurisdiccion: 'DISCIPLINARIO' });

        expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { key: 'juzgamiento' } });
    });

    it('cae al board por defecto del módulo si no encuentra el tipoProceso', async () => {
        mockRepo.findOne.mockResolvedValue(defensaConfig);

        const estados = await service.getEstadosForExpediente({ tipoProceso: 'Tipo Inexistente' });

        expect(estados).toEqual(defensaConfig.value.estados);
    });

    it('devuelve [] si no hay config', async () => {
        mockRepo.findOne.mockResolvedValue(null);

        const estados = await service.getEstadosForExpediente({ tipoProceso: 'Reparación Directa' });

        expect(estados).toEqual([]);
    });
});

describe('ConfigurationsService.estadoMatches / findEstado (tolerante)', () => {
    let service: ConfigurationsService;

    const estados = [
        { id: 'NOTIFICADA', nombre: 'Notificada' },
        { id: 'E1_AVOCAMIENTO', nombre: 'Avocamiento' },
        { id: 'probatoria', nombre: 'Etapa Probatoria' },
    ];

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ConfigurationsService,
                { provide: getRepositoryToken(SystemConfiguration), useValue: {} },
            ],
        }).compile();
        service = module.get<ConfigurationsService>(ConfigurationsService);
    });

    it('casa por id exacto, por nombre, y por variantes (acentos/espacios/underscore/mayúsculas)', () => {
        expect(service.estadoMatches(estados[0], 'NOTIFICADA')).toBe(true);   // id exacto
        expect(service.estadoMatches(estados[0], 'Notificada')).toBe(true);   // por nombre
        expect(service.estadoMatches(estados[1], 'e1 avocamiento')).toBe(true); // espacio vs underscore
        expect(service.estadoMatches(estados[2], 'Etapa Probatoria')).toBe(true); // nombre con espacio
        expect(service.estadoMatches(estados[0], 'otra')).toBe(false);
        expect(service.estadoMatches(estados[0], undefined)).toBe(false);
    });

    it('findEstadoIndex devuelve el índice correcto o -1', () => {
        expect(service.findEstadoIndex(estados, 'avocamiento')).toBe(1); // por nombre normalizado
        expect(service.findEstadoIndex(estados, 'inexistente')).toBe(-1);
    });
});

describe('ConfigurationsService.saveConfiguration', () => {
    let service: ConfigurationsService;
    let mockRepo: any;

    beforeEach(async () => {
        mockRepo = { findOne: jest.fn(), find: jest.fn(), save: jest.fn((c) => Promise.resolve(c)), create: jest.fn((d) => d) };
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ConfigurationsService,
                { provide: getRepositoryToken(SystemConfiguration), useValue: mockRepo },
            ],
        }).compile();
        service = module.get<ConfigurationsService>(ConfigurationsService);
    });

    it('al actualizar devuelve el valor nuevo y el anterior (para la auditoría)', async () => {
        const anterior = [{ id: 'eje-1', nombre: 'Gestión Empresarial', activo: true }];
        const nuevo = [{ id: 'eje-1', nombre: 'Gestión Institucional', activo: false }];
        mockRepo.findOne.mockResolvedValue({ key: 'sigl-ejes-estrategicos', module: 'general', value: anterior });

        const res = await service.saveConfiguration('sigl-ejes-estrategicos', { value: nuevo });

        expect(res.value).toEqual(nuevo);
        expect(res.previousValue).toEqual(anterior);
    });

    it('al crear la clave el valor anterior es null', async () => {
        mockRepo.findOne.mockResolvedValue(null);

        const res = await service.saveConfiguration('sigl-ejes-estrategicos', { value: [] });

        expect(res.value).toEqual([]);
        expect(res.previousValue).toBeNull();
    });
});

describe('ConfigurationsService.saveConfiguration · entes de control de Planes de Mejoramiento', () => {
    let service: ConfigurationsService;
    let mockRepo: any;
    let managerFind: jest.Mock;

    const ente = (id: string, nombre: string, activo = true) => ({
        id, nombre, descripcion: '', icono: '🏛️', color: '#DC2626', activo,
    });
    const previos = [ente('CONTRALORIA', 'Contraloría General'), ente('OCI', 'Oficina Control Interno')];

    beforeEach(async () => {
        managerFind = jest.fn().mockResolvedValue([]);
        mockRepo = {
            findOne: jest.fn().mockResolvedValue({ key: 'sigl-entes-control-pm', module: 'general', value: previos }),
            find: jest.fn(),
            save: jest.fn(async (c) => c),
            create: jest.fn((d) => d),
            manager: { find: managerFind },
        };
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ConfigurationsService,
                { provide: getRepositoryToken(SystemConfiguration), useValue: mockRepo },
            ],
        }).compile();
        service = module.get<ConfigurationsService>(ConfigurationsService);
    });

    it('guarda cambios de nombre, ícono, color, descripción y estado y devuelve el valor anterior para Auditoría', async () => {
        const editados = [{ ...previos[0], nombre: 'Nuevo', icono: '🔍', color: '#112233', descripcion: 'x', activo: false }, previos[1]];

        const res = await service.saveConfiguration('sigl-entes-control-pm', { value: editados });

        expect(mockRepo.save).toHaveBeenCalled();
        expect(res.value).toEqual(editados);
        expect(res.previousValue).toEqual(previos);
        expect(managerFind).not.toHaveBeenCalled();
    });

    it('permite agregar un ente', async () => {
        await expect(
            service.saveConfiguration('sigl-entes-control-pm', { value: [...previos, ente('ente-1', 'Nuevo Ente')] }),
        ).resolves.toBeDefined();
    });

    it('permite eliminar un ente sin planes asociados', async () => {
        await expect(service.saveConfiguration('sigl-entes-control-pm', { value: [previos[0]] })).resolves.toBeDefined();
        expect(managerFind).toHaveBeenCalledTimes(1);
    });

    it('rechaza (409) eliminar un ente con planes asociados y no guarda', async () => {
        managerFind.mockResolvedValue([{ id: 'p1', origen: 'OCI' }, { id: 'p2', origen: 'OCI' }]);

        await expect(
            service.saveConfiguration('sigl-entes-control-pm', { value: [previos[0]] }),
        ).rejects.toThrow(/Oficina Control Interno.*\(2\).*Solo puede inactivarse/);
        expect(mockRepo.save).not.toHaveBeenCalled();
    });

    it('un ente con planes sí puede inactivarse', async () => {
        managerFind.mockResolvedValue([{ id: 'p1', origen: 'OCI' }]);

        await expect(
            service.saveConfiguration('sigl-entes-control-pm', { value: [previos[0], { ...previos[1], activo: false }] }),
        ).resolves.toBeDefined();
    });

    it.each([
        ['no es lista', { value: 'x' }],
        ['sin nombre', { value: [{ id: 'a', nombre: ' ', activo: true }] }],
        ['sin estado', { value: [{ id: 'a', nombre: 'A' }] }],
        ['ids repetidos', { value: [ente('a', 'A'), ente('a', 'B')] }],
    ])('rechaza (400) una lista inválida: %s', async (_, body) => {
        await expect(service.saveConfiguration('sigl-entes-control-pm', body)).rejects.toThrow();
        expect(mockRepo.save).not.toHaveBeenCalled();
    });

    it('otras claves no se validan', async () => {
        await expect(service.saveConfiguration('otra-clave', { value: 'cualquier cosa' })).resolves.toBeDefined();
    });
});
