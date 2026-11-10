import { Test, TestingModule } from '@nestjs/testing';
import { KlicController } from '../klic.controller';
import { KlicService } from '../klic.service';
import { KlicContratoDto } from '../dto/klic-contrato.dto';

describe('KlicController', () => {
  let controller: KlicController;
  let service: KlicService;

  const mockContratos: KlicContratoDto[] = [
    {
      numeroContrato: 'BOG-1222-2024',
      numeroIdentificacion: '1118562823',
      nombre: 'JUAN DAVID MORALES ALFONSO',
      fechaInicial: '2024-09-16T05:00:00.000Z',
      fechaFinal: '2024-12-31T05:00:00.000Z',
      cdp: '157824',
      rp: '480024',
      valorContrato: 1000000,
      area: 'OFICINA DE LAS TECNOLOGIAS DE LA INFORMACION',
      afectacion: 'INVERSION',
      cuentaBancaria: '1234567890',
    },
  ];

  const mockKlicService = {
    checkHealth: jest.fn().mockResolvedValue({
      status: 'connected',
      server: '172.16.202.145',
      database: 'Klic',
      message: 'Conexión a Klic operativa.',
    }),
    getContratosByIdentificacion: jest.fn().mockResolvedValue(mockContratos),
    getContratosPaginados: jest.fn().mockResolvedValue({
      data: mockContratos,
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [KlicController],
      providers: [
        {
          provide: KlicService,
          useValue: mockKlicService,
        },
      ],
    }).compile();

    controller = module.get<KlicController>(KlicController);
    service = module.get<KlicService>(KlicService);
  });

  it('debe estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('checkHealth', () => {
    it('debe llamar a service.checkHealth', async () => {
      const res = await controller.checkHealth();
      expect(service.checkHealth).toHaveBeenCalled();
      expect(res.status).toBe('connected');
    });
  });

  describe('getContratosByIdentificacion', () => {
    it('debe retornar contratos por identificación', async () => {
      const res = await controller.getContratosByIdentificacion('1118562823');
      expect(service.getContratosByIdentificacion).toHaveBeenCalledWith('1118562823');
      expect(res).toEqual(mockContratos);
    });
  });

  describe('getContratosPaginados', () => {
    it('debe retornar lista paginada', async () => {
      const query = { page: 1, limit: 10 };
      const res = await controller.getContratosPaginados(query);
      expect(service.getContratosPaginados).toHaveBeenCalledWith(query);
      expect(res.data).toHaveLength(1);
      expect(res.total).toBe(1);
    });
  });
});

