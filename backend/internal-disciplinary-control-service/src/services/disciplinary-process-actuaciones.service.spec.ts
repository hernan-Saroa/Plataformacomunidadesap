import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DisciplinaryProcessActuacionesService } from './disciplinary-process-actuaciones.service';
import { DisciplinaryProcessActuacion } from '../entities/disciplinary-process-actuacion.entity';
import { DisciplinaryProcess } from '../entities/disciplinary-process.entity';
import { DisciplinaryNews } from '../entities/disciplinary-news.entity';

describe('DisciplinaryProcessActuacionesService', () => {
  let service: DisciplinaryProcessActuacionesService;

  const mockActuacionesRepository = {
    create: jest.fn((dto) => dto),
    save: jest.fn((entity) => Promise.resolve({ id: 'act-1', ...entity })),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockProcessRepository = {
    findOne: jest.fn().mockResolvedValue({ id: 'proc-1', etapaActual: 'INVESTIGACION' }),
  };

  const mockNewsRepository = {
    findOne: jest.fn().mockResolvedValue({ id: 'news-1' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DisciplinaryProcessActuacionesService,
        {
          provide: getRepositoryToken(DisciplinaryProcessActuacion),
          useValue: mockActuacionesRepository,
        },
        {
          provide: getRepositoryToken(DisciplinaryProcess),
          useValue: mockProcessRepository,
        },
        {
          provide: getRepositoryToken(DisciplinaryNews),
          useValue: mockNewsRepository,
        },
      ],
    }).compile();

    service = module.get<DisciplinaryProcessActuacionesService>(
      DisciplinaryProcessActuacionesService,
    );
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  it('asigna la hora actual exacta si fechaActuacion es la fecha de hoy', async () => {
    const hoyBogota = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
    const before = new Date().getTime();

    await service.create('proc-1', {
      tipo: 'actuacion',
      descripcion: 'Prueba hora actual',
      responsableNombre: 'Juan Perez',
      fechaActuacion: hoyBogota,
    });

    const after = new Date().getTime();
    expect(mockActuacionesRepository.create).toHaveBeenCalled();
    const createdPayload = mockActuacionesRepository.create.mock.calls[0][0];

    expect(createdPayload.fechaActuacion).toBeInstanceOf(Date);
    const createdTime = createdPayload.fechaActuacion.getTime();
    expect(createdTime).toBeGreaterThanOrEqual(before - 1000);
    expect(createdTime).toBeLessThanOrEqual(after + 1000);
  });

  it('respeta la hora exacta si fechaActuacion ya viene con hora ISO', async () => {
    const timestamp = '2026-09-10T14:35:45.000Z';

    await service.create('proc-1', {
      tipo: 'actuacion',
      descripcion: 'Prueba timestamp exacto',
      responsableNombre: 'Juan Perez',
      fechaActuacion: timestamp,
    });

    const createdPayload = mockActuacionesRepository.create.mock.calls[0][0];
    expect(createdPayload.fechaActuacion.toISOString()).toBe(timestamp);
  });
});
