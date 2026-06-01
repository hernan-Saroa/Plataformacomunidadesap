import { Test, TestingModule } from '@nestjs/testing';
import { PtaService } from './pta.service';

describe('PtaService', () => {
  let service: PtaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PtaService],
    }).compile();

    service = module.get<PtaService>(PtaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
