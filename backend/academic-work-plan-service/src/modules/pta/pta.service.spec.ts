import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PtaEntity } from './pta.entity';
import { PtaService } from './pta.service';

describe('PtaService', () => {
  let service: PtaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PtaService,
        {
          provide: getRepositoryToken(PtaEntity),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PtaService>(PtaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
