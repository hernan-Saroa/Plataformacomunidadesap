import { Test, TestingModule } from '@nestjs/testing';
import { PtaController } from './pta.controller';
import { PtaService } from './pta.service';

describe('PtaController', () => {
  let controller: PtaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PtaController],
      providers: [
        {
          provide: PtaService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            aprobar: jest.fn(),
            rechazar: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PtaController>(PtaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
