import { Test, TestingModule } from '@nestjs/testing';
import { AlertasVencimientoTerminosService } from '../services/alertas-vencimiento-terminos.service';
import { ReglasAlertaTerminoService } from '../services/reglas-alerta-termino.service';
import { ReglasAlertaTerminoController } from './reglas-alerta-termino.controller';

describe('ReglasAlertaTerminoController', () => {
    let controller: ReglasAlertaTerminoController;
    let mockService: any;
    let mockAlertas: any;

    beforeEach(async () => {
        mockAlertas = {
            reevaluarPorCambioDeRegla: jest.fn().mockResolvedValue({ alertasEnviadas: 0, recordatoriosEnviados: 0 }),
        };
        mockService = {
            findAll: jest.fn().mockResolvedValue([]),
            create: jest.fn((data: any) => Promise.resolve({ id: 'r-1', ...data })),
            update: jest.fn((id: string, data: any) => Promise.resolve({ id, ...data })),
            remove: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [ReglasAlertaTerminoController],
            providers: [
                { provide: ReglasAlertaTerminoService, useValue: mockService },
                { provide: AlertasVencimientoTerminosService, useValue: mockAlertas },
            ],
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

    it('create() debe reevaluar los términos de una, sin borrar envíos de otras reglas', async () => {
        await controller.create({ horasAnticipacion: 48, descripcion: 'Alerta 2 días' });
        expect(mockAlertas.reevaluarPorCambioDeRegla).toHaveBeenCalledWith(undefined);
    });

    it('update() debe reevaluar pasando el id, para limpiar los envíos del umbral anterior', async () => {
        await controller.update('r-1', { horasAnticipacion: 24 });
        expect(mockAlertas.reevaluarPorCambioDeRegla).toHaveBeenCalledWith('r-1');
    });

    it('un fallo de la reevaluación no debe tumbar la petición', async () => {
        mockAlertas.reevaluarPorCambioDeRegla.mockRejectedValue(new Error('BD caída'));
        await expect(controller.create({ horasAnticipacion: 48 })).resolves.toBeDefined();
    });
});
