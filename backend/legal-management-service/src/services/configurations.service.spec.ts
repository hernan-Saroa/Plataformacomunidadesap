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
