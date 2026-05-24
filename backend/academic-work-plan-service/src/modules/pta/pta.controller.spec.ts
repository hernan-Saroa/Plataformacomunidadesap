import { Test, TestingModule } from '@nestjs/testing';
import { PtaController } from './pta.controller';

describe('PtaController', () => {
  let controller: PtaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PtaController],
    }).compile();

    controller = module.get<PtaController>(PtaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
