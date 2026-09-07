import { Test, TestingModule } from '@nestjs/testing';
import { PeiService } from '../services/pei.service';
import { PeiController } from './pei.controller';

describe('PeiController', () => {
    let controller: PeiController;
    let mockPeiService: any;

    beforeEach(async () => {
        mockPeiService = {
            registrarAvance: jest.fn().mockResolvedValue({ registro: {}, indicador: {}, avanceGlobal: 0 }),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [PeiController],
            providers: [{ provide: PeiService, useValue: mockPeiService }],
        }).compile();

        controller = module.get<PeiController>(PeiController);
    });

    afterEach(() => jest.clearAllMocks());

    describe('registrarAvance()', () => {
        it('cuando llega un archivo debe construir evidenciaUrl a partir de su filename e ignorar la evidenciaUrl del body', async () => {
            const file = { filename: 'abc123.pdf' } as any;

            await controller.registrarAvance(1, { valor: '50', observaciones: 'ok', evidenciaUrl: 'http://ignorado.com' }, file);

            expect(mockPeiService.registrarAvance).toHaveBeenCalledWith(1, 50, 'ok', undefined, 'files/abc123.pdf');
        });

        it('sin archivo debe usar la evidenciaUrl del body si viene', async () => {
            await controller.registrarAvance(1, { valor: 50, evidenciaUrl: 'https://ejemplo.com/doc.pdf' }, undefined);

            expect(mockPeiService.registrarAvance).toHaveBeenCalledWith(1, 50, undefined, undefined, 'https://ejemplo.com/doc.pdf');
        });

        it('sin archivo y sin evidenciaUrl debe pasar undefined (no cadena vacía)', async () => {
            await controller.registrarAvance(1, { valor: 50, evidenciaUrl: '   ' }, undefined);

            expect(mockPeiService.registrarAvance).toHaveBeenCalledWith(1, 50, undefined, undefined, undefined);
        });

        it('debe convertir un valor recibido como string a número', async () => {
            await controller.registrarAvance(1, { valor: '73.5' }, undefined);

            expect(mockPeiService.registrarAvance).toHaveBeenCalledWith(1, 73.5, undefined, undefined, undefined);
        });

        it('debe pasar el usuarioId recibido en el body', async () => {
            await controller.registrarAvance(1, { valor: 50, usuarioId: 'user-7' }, undefined);

            expect(mockPeiService.registrarAvance).toHaveBeenCalledWith(1, 50, undefined, 'user-7', undefined);
        });

        it('debe pasar las observaciones recibidas en el body', async () => {
            await controller.registrarAvance(1, { valor: 50, observaciones: 'Avance parcial' }, undefined);

            expect(mockPeiService.registrarAvance).toHaveBeenCalledWith(1, 50, 'Avance parcial', undefined, undefined);
        });

        it('debe retornar el resultado del servicio sin transformarlo', async () => {
            mockPeiService.registrarAvance.mockResolvedValue({ registro: { id: 1 }, avanceGlobal: 42 });

            const result = await controller.registrarAvance(1, { valor: 50 }, undefined);

            expect(result).toEqual({ registro: { id: 1 }, avanceGlobal: 42 });
        });
    });
});
