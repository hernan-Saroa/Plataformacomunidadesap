import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SeedService } from './seed.service';
import { SequenceService } from './services/sequence.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: { getHello: jest.fn().mockReturnValue('Hello World!') },
        },
        {
          provide: SeedService,
          useValue: { seed: jest.fn() },
        },
        {
          provide: SequenceService,
          useValue: {
            generateActaConsecutivo: jest.fn(),
            getPreviewActaConsecutivo: jest.fn(),
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return health status', () => {
      expect(appController.getHealth()).toBe('Hello World!');
    });
  });
});
