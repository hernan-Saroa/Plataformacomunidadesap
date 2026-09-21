import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AjustesGeneralesService } from '../ajustes-generales.service';
import { SystemSetting } from '../system-setting.entity';
import { FestivoColombia } from '../festivo-colombia.entity';
import { BadRequestException } from '@nestjs/common';

describe('AjustesGeneralesService', () => {
  let service: AjustesGeneralesService;
  let settingsRepo: any;
  let festivosRepo: any;

  beforeEach(async () => {
    settingsRepo = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((val) => Promise.resolve(val)),
    };

    const mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        { id: 1, fecha: '2026-01-01', descripcion: 'Año Nuevo' },
        { id: 2, fecha: '2026-05-01', descripcion: 'Día del Trabajo' },
      ]),
      insert: jest.fn().mockReturnThis(),
      into: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      orUpdate: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ raw: [] }),
    };

    festivosRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((val) => Promise.resolve({ id: 10, ...val })),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AjustesGeneralesService,
        {
          provide: getRepositoryToken(SystemSetting),
          useValue: settingsRepo,
        },
        {
          provide: getRepositoryToken(FestivoColombia),
          useValue: festivosRepo,
        },
      ],
    }).compile();

    service = module.get<AjustesGeneralesService>(AjustesGeneralesService);
  });

  describe('Salario Mínimo Legal Vigente (SMMLV)', () => {
    it('debe retornar el valor por defecto si no existe configuración previa', async () => {
      settingsRepo.findOne.mockResolvedValue(null);
      const res = await service.getSalarioMinimo();
      expect(res.salarioMinimo).toBe(1423500);
      expect(res.moneda).toBe('COP');
    });

    it('debe parsear y retornar el valor configurado en base de datos', async () => {
      settingsRepo.findOne.mockResolvedValue({
        key: 'SALARIO_MINIMO_MENSUAL',
        value: JSON.stringify({ salarioMinimo: 1600000, anio: 2026, moneda: 'COP' }),
        updatedAt: new Date(),
      });
      const res = await service.getSalarioMinimo();
      expect(res.salarioMinimo).toBe(1600000);
      expect(res.anioVigente).toBe(2026);
    });

    it('debe actualizar el salario mínimo correctamente', async () => {
      settingsRepo.findOne.mockResolvedValue(null);
      const res = await service.updateSalarioMinimo(1750000, 2026);
      expect(res.salarioMinimo).toBe(1750000);
      expect(settingsRepo.save).toHaveBeenCalled();
    });

    it('debe rechazar un salario mínimo menor o igual a cero', async () => {
      await expect(service.updateSalarioMinimo(0)).rejects.toThrow(BadRequestException);
    });
  });

  describe('Días Festivos de Colombia', () => {
    it('debe listar los festivos aplicando filtro por año', async () => {
      const list = await service.getFestivos(2026);
      expect(list).toHaveLength(2);
      expect(festivosRepo.createQueryBuilder).toHaveBeenCalledWith('f');
    });

    it('debe permitir crear un nuevo festivo manual', async () => {
      festivosRepo.findOne.mockResolvedValue(null);
      const nuevo = await service.createFestivo({
        fecha: '2026-10-31',
        descripcion: 'Día de los Niños (Cívico)',
      });
      expect(nuevo.descripcion).toBe('Día de los Niños (Cívico)');
      expect(festivosRepo.save).toHaveBeenCalled();
    });

    it('debe rechazar la creación si la fecha ya existe', async () => {
      festivosRepo.findOne.mockResolvedValue({ id: 1, fecha: '2026-01-01' });
      await expect(
        service.createFestivo({ fecha: '2026-01-01', descripcion: 'Repetido' }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
