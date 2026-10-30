import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TrdService } from '../trd.service';
import { TrdConfiguracion } from '../trd-configuracion.entity';
import { TrdSerieSubserie } from '../trd-serie-subserie.entity';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';

describe('TrdService', () => {
  let service: TrdService;
  let mockTrdRepo: any;
  let mockSerieRepo: any;

  const mockTrdV4: TrdConfiguracion = {
    id: 4,
    version: 'TRD V4',
    nombre: 'Tabla de Retención Documental V4 Vigente',
    tipo: 'TRD',
    fechaInicio: '2021-01-01',
    fechaFin: null,
    actoAdministrativo: 'Resolución Vigente (Acuerdo 004/2019)',
    convalidacionEstado: 'Certificado Convalidación AGN y RUSD',
    descripcion: 'TRD Vigente',
    activo: true,
    esVigente: true,
    creadoEn: new Date(),
    actualizadoEn: new Date(),
    series: [
      {
        id: 10,
        trdId: 4,
        trd: null as any,
        codigoDependencia: '150',
        nombreDependencia: 'OFICINA DE CONTROL INTERNO DISCIPLINARIO',
        codigoSerie: '250',
        nombreSerie: 'PROCESOS DISCIPLINARIOS',
        codigoSubserie: '05',
        nombreSubserie: 'PROCESOS DISCIPLINARIOS',
        codigoIdentificacionExpediente: '12_150_250_05',
        modulo: 'control-disciplinario',
        activo: true,
        creadoEn: new Date(),
        actualizadoEn: new Date(),
      },
    ],
  };

  const mockTrdV1: TrdConfiguracion = {
    id: 1,
    version: 'TRD V1',
    nombre: 'TVD Periodo 1998-2006',
    tipo: 'TVD',
    fechaInicio: '1998-01-01',
    fechaFin: '2006-12-31',
    actoAdministrativo: 'Resolución / Acuerdo Directivo V1',
    convalidacionEstado: 'Aprobada por Comité de Archivo',
    descripcion: 'TVD Histórica',
    activo: false,
    esVigente: false,
    creadoEn: new Date(),
    actualizadoEn: new Date(),
    series: [
      {
        id: 1,
        trdId: 1,
        trd: null as any,
        codigoDependencia: '160',
        nombreDependencia: 'OFICINA DE CONTROL INTERNO DISCIPLINARIO',
        codigoSerie: '780',
        nombreSerie: 'PROCESOS JURÍDICOS',
        codigoSubserie: '60',
        nombreSubserie: 'PROCESOS DISCIPLINARIOS',
        codigoIdentificacionExpediente: '12_160_780_60',
        modulo: 'control-disciplinario',
        activo: false,
        creadoEn: new Date(),
        actualizadoEn: new Date(),
      },
    ],
  };

  beforeEach(async () => {
    mockTrdRepo = {
      find: jest.fn().mockResolvedValue([mockTrdV4, mockTrdV1]),
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((dto) => ({ id: 5, ...dto })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      remove: jest.fn().mockResolvedValue(true),
      createQueryBuilder: jest.fn(),
    };

    mockSerieRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((dto) => ({ id: 20, ...dto })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      remove: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrdService,
        {
          provide: getRepositoryToken(TrdConfiguracion),
          useValue: mockTrdRepo,
        },
        {
          provide: getRepositoryToken(TrdSerieSubserie),
          useValue: mockSerieRepo,
        },
      ],
    }).compile();

    service = module.get<TrdService>(TrdService);
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('debe listar todas las versiones de TRD ordenadas por fechaInicio DESC', async () => {
      const res = await service.findAll();
      expect(res).toHaveLength(2);
      expect(mockTrdRepo.find).toHaveBeenCalledWith({
        order: { fechaInicio: 'DESC' },
        relations: ['series'],
      });
    });
  });

  describe('getVigente', () => {
    it('debe retornar la TRD marcada como vigente con sus series y subseries', async () => {
      mockTrdRepo.findOne.mockResolvedValueOnce(mockTrdV4);

      const res = await service.getVigente('control-disciplinario');
      expect(res.trd.version).toBe('TRD V4');
      expect(res.serieSubserie?.codigoDependencia).toBe('150');
      expect(res.serieSubserie?.codigoSerie).toBe('250');
      expect(res.serieSubserie?.codigoSubserie).toBe('05');
    });

    it('debe resolver la TRD histórica según rango de fechas para no alterar documentos existentes', async () => {
      const qbMock = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValueOnce(mockTrdV1),
      };
      mockTrdRepo.createQueryBuilder.mockReturnValue(qbMock);

      const res = await service.getVigente('control-disciplinario', '2004-05-15');
      expect(res.trd.version).toBe('TRD V1');
      expect(res.serieSubserie?.codigoSerie).toBe('780');
      expect(res.serieSubserie?.codigoSubserie).toBe('60');
      expect(res.serieSubserie?.codigoDependencia).toBe('160');
    });
  });

  describe('create', () => {
    it('debe rechazar versiones duplicadas', async () => {
      mockTrdRepo.findOne.mockResolvedValueOnce(mockTrdV4);
      await expect(
        service.create({
          version: 'TRD V4',
          nombre: 'Duplicado',
          tipo: 'TRD',
          fechaInicio: '2021-01-01',
          actoAdministrativo: 'Res',
          convalidacionEstado: 'Aprob',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('debe desmarcar otras TRDs vigentes si la nueva se crea como vigente', async () => {
      mockTrdRepo.findOne.mockResolvedValueOnce(null);
      await service.create({
        version: 'TRD V5',
        nombre: 'Futura TRD',
        tipo: 'TRD',
        fechaInicio: '2027-01-01',
        actoAdministrativo: 'Res 2027',
        convalidacionEstado: 'Aprobada',
        esVigente: true,
      });

      expect(mockTrdRepo.update).toHaveBeenCalledWith({}, { esVigente: false });
      expect(mockTrdRepo.save).toHaveBeenCalled();
    });
  });

  describe('toggleActivo', () => {
    it('no debe permitir desactivar la TRD vigente actual', async () => {
      mockTrdRepo.findOne.mockResolvedValueOnce({ ...mockTrdV4, esVigente: true, activo: true });
      await expect(service.toggleActivo(4)).rejects.toThrow(BadRequestException);
    });

    it('debe alternar activo de una TRD no vigente', async () => {
      mockTrdRepo.findOne.mockResolvedValueOnce({ ...mockTrdV1, esVigente: false, activo: false });
      const res = await service.toggleActivo(1);
      expect(res.activo).toBe(true);
    });
  });

  describe('series y subseries', () => {
    it('debe asociar serie y subserie a una TRD parametrizable', async () => {
      mockTrdRepo.findOne.mockResolvedValueOnce(mockTrdV4);
      const res = await service.addSerie(4, {
        codigoDependencia: '150',
        nombreDependencia: 'OFICINA DE CONTROL INTERNO DISCIPLINARIO',
        codigoSerie: '250',
        nombreSerie: 'PROCESOS DISCIPLINARIOS',
        codigoSubserie: '05',
        nombreSubserie: 'PROCESOS DISCIPLINARIOS',
        modulo: 'control-disciplinario',
      });

      expect(res.codigoSerie).toBe('250');
      expect(res.codigoSubserie).toBe('05');
      expect(res.codigoIdentificacionExpediente).toBe('12_150_250_05');
    });
  });
});
