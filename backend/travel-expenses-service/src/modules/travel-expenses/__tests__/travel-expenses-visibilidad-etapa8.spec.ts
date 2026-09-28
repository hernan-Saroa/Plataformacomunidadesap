import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { SolicitudComisionEntity } from '../../../entities/solicitud-comision.entity';
import { ComisionadoEntity } from '../../../entities/comisionado.entity';
import { DocumentoSoporteEntity } from '../../../entities/documento-soporte.entity';
import { SolicitudHistorialEstadoEntity } from '../../../entities/solicitud-historial-estado.entity';
import { FestivoColombiaEntity } from '../../../entities/festivo-colombia.entity';
import { NotificationClientService } from '../../../common/notification-client.service';
import { ConfigService } from '../../config/config.service';
import { TravelExpensesService } from '../travel-expenses.service';
import { TravelExpensesController } from '../travel-expenses.controller';

describe('Visibilidad de Solicitudes Etapa 8 (Tesorería y SST)', () => {
  let service: TravelExpensesService;
  let mockSolicitudRepo: any;
  let mockQueryBuilder: any;

  beforeEach(async () => {
    mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(2),
      getMany: jest.fn().mockResolvedValue([
        {
          id: 'sol-1',
          codigo: 'SOL-001',
          estadoSolicitud: 'OBLIGADA',
          numeroObligacion: 'OBL-9876',
          fechaObligacion: new Date('2026-09-17'),
          valorObligacion: 850000,
          totalViaticos: 850000,
          comisionado: {
            nombres: 'Carlos',
            apellidos: 'Gómez',
            numeroDocumento: '12345678',
          },
        },
        {
          id: 'sol-2',
          codigo: 'SOL-002',
          estadoSolicitud: 'PAGADA',
          numeroObligacion: 'OBL-9875',
          numeroOrdenPago: 'ORD-5544',
          fechaPago: new Date('2026-09-17'),
          valorPagado: 850000,
          totalViaticos: 850000,
          comisionado: {
            nombres: 'Laura',
            apellidos: 'Pérez',
            numeroDocumento: '87654321',
          },
        },
      ]),
    };

    mockSolicitudRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      findOne: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TravelExpensesController],
      providers: [
        TravelExpensesService,
        { provide: getRepositoryToken(SolicitudComisionEntity), useValue: mockSolicitudRepo },
        { provide: getRepositoryToken(ComisionadoEntity), useValue: {} },
        { provide: getRepositoryToken(DocumentoSoporteEntity), useValue: {} },
        { provide: getRepositoryToken(SolicitudHistorialEstadoEntity), useValue: {} },
        { provide: getRepositoryToken(FestivoColombiaEntity), useValue: { find: jest.fn().mockResolvedValue([]) } },
        { provide: getDataSourceToken(), useValue: { createQueryRunner: jest.fn() } },
        { provide: NotificationClientService, useValue: { send: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('mock') } },
      ],
    }).compile();

    service = module.get<TravelExpensesService>(TravelExpensesService);
  });

  it('debe filtrar comisiones OBLIGADA y PAGADA cuando el usuario es Tesorería', async () => {
    const resultado = await service.obtenerSolicitudes(
      'user-tesoreria-123',
      false, // isSuperAdmin
      1,
      20,
      false, // isControlViaticos
      false, // isAnalista
      false, // isSecretario
      true, // isTesoreria
      false, // isSst
    );

    expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
      's.estado_solicitud IN (:...estadosTesoreria)',
      { estadosTesoreria: ['OBLIGADA', 'PAGADA'] },
    );
    expect(resultado.data).toHaveLength(2);
    expect(resultado.data[0].estadoSolicitud).toBe('OBLIGADA');
    expect(resultado.data[0].numeroObligacion).toBe('OBL-9876');
    expect(resultado.data[1].estadoSolicitud).toBe('PAGADA');
    expect(resultado.data[1].numeroOrdenPago).toBe('ORD-5544');
  });

  it('debe filtrar comisiones OBLIGADA y PAGADA cuando el usuario es SST', async () => {
    const resultado = await service.obtenerSolicitudes(
      'user-sst-123',
      false, // isSuperAdmin
      1,
      20,
      false, // isControlViaticos
      false, // isAnalista
      false, // isSecretario
      false, // isTesoreria
      true, // isSst
    );

    expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
      's.estado_solicitud IN (:...estadosSst)',
      { estadosSst: ['OBLIGADA', 'PAGADA'] },
    );
    expect(resultado.data).toHaveLength(2);
  });

  it('no debe restringir a usuario creador cuando es Tesorería', async () => {
    await service.obtenerSolicitudes(
      'user-tesoreria-id',
      false,
      1,
      20,
      false,
      false,
      false,
      true, // isTesoreria
      false,
    );

    expect(mockQueryBuilder.andWhere).not.toHaveBeenCalledWith(
      's.creadoPorUsuarioId = :usuarioId',
      expect.anything(),
    );
  });
});
