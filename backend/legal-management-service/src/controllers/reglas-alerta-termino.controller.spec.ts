import { Test, TestingModule } from '@nestjs/testing';
import { ReglasAlertaTerminoService } from '../services/reglas-alerta-termino.service';
import { ReglasAlertaTerminoController } from './reglas-alerta-termino.controller';

describe('ReglasAlertaTerminoController', () => {
    let controller: ReglasAlertaTerminoController;
    let mockService: any;

    beforeEach(async () => {
        mockService = {
            findAll: jest.fn().mockResolvedValue([]),
            create: jest.fn((data: any) => Promise.resolve({ id: 'r-1', ...data })),
            update: jest.fn((id: string, data: any) => Promise.resolve({ id, ...data })),
            remove: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [ReglasAlertaTerminoController],
            providers: [{ provide: ReglasAlertaTerminoService, useValue: mockService }],
        }).compile();

        controller = module.get<ReglasAlertaTerminoController>(ReglasAlertaTerminoController);
    });

    afterEach(() => jest.clearAllMocks());

    it('findAll() debe delegar al servicio', async () => {
        await controller.findAll();
        expect(mockService.findAll).toHaveBeenCalledWith();
    });

    it('create() debe delegar el body recibido al servicio', async () => {
        await controller.create({ horasAnticipacion: 72, descripcion: 'Alerta 3 días' });
        expect(mockService.create).toHaveBeenCalledWith({ horasAnticipacion: 72, descripcion: 'Alerta 3 días' });
    });

    it('update() debe delegar id y body al servicio', async () => {
        await controller.update('r-1', { activa: false });
        expect(mockService.update).toHaveBeenCalledWith('r-1', { activa: false });
    });

    it('remove() debe delegar el id al servicio', async () => {
        await controller.remove('r-1');
        expect(mockService.remove).toHaveBeenCalledWith('r-1');
    });
});
