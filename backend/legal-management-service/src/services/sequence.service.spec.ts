import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Sequence } from '../entities/sequence.entity';
import { SequenceService } from './sequence.service';

describe('SequenceService', () => {
    let service: SequenceService;
    let mockSequenceRepo: any;
    const year = new Date().getFullYear();

    beforeEach(async () => {
        mockSequenceRepo = {
            findOne: jest.fn(),
            create: jest.fn((data: any) => data),
            save: jest.fn((data: any) => Promise.resolve(data)),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SequenceService,
                { provide: getRepositoryToken(Sequence), useValue: mockSequenceRepo },
            ],
        }).compile();

        service = module.get<SequenceService>(SequenceService);
    });

    afterEach(() => jest.clearAllMocks());

    describe('generateRadicado()', () => {
        it('debe crear la secuencia del año en 1 cuando no existe previamente', async () => {
            mockSequenceRepo.findOne.mockResolvedValue(null);

            const result = await service.generateRadicado('TERM');

            expect(mockSequenceRepo.findOne).toHaveBeenCalledWith({ where: { name: `TERM_${year}` } });
            // create() recibe currentValue: 0, pero el mismo objeto se muta a 1 antes de save();
            // por eso se verifica el argumento de create() solo por nombre, y el valor final en save().
            expect(mockSequenceRepo.create).toHaveBeenCalledWith(expect.objectContaining({ name: `TERM_${year}` }));
            expect(mockSequenceRepo.save).toHaveBeenCalledWith(expect.objectContaining({ currentValue: 1 }));
            expect(result).toBe(`TERM-${year}-0001`);
        });

        it('debe incrementar el consecutivo existente en vez de reiniciarlo', async () => {
            mockSequenceRepo.findOne.mockResolvedValue({ name: `TERM_${year}`, currentValue: 6 });

            const result = await service.generateRadicado('TERM');

            expect(mockSequenceRepo.create).not.toHaveBeenCalled();
            expect(mockSequenceRepo.save).toHaveBeenCalledWith(expect.objectContaining({ currentValue: 7 }));
            expect(result).toBe(`TERM-${year}-0007`);
        });

        it('debe rellenar con ceros según padLength (por defecto 4 dígitos)', async () => {
            mockSequenceRepo.findOne.mockResolvedValue({ name: `TERM_${year}`, currentValue: 999 });

            const result = await service.generateRadicado('TERM');

            expect(result).toBe(`TERM-${year}-1000`);
        });

        it('debe respetar un padLength distinto cuando se especifica', async () => {
            mockSequenceRepo.findOne.mockResolvedValue({ name: `AUTO_${year}`, currentValue: 4 });

            const result = await service.generateRadicado('AUTO', 3);

            expect(result).toBe(`AUTO-${year}-005`);
        });

        it('debe mantener secuencias independientes por prefijo, aunque compartan el mismo año', async () => {
            mockSequenceRepo.findOne.mockResolvedValueOnce(null);
            await service.generateRadicado('TERM');
            expect(mockSequenceRepo.findOne).toHaveBeenLastCalledWith({ where: { name: `TERM_${year}` } });

            mockSequenceRepo.findOne.mockResolvedValueOnce(null);
            await service.generateRadicado('CJ');
            expect(mockSequenceRepo.findOne).toHaveBeenLastCalledWith({ where: { name: `CJ_${year}` } });
        });
    });
});
