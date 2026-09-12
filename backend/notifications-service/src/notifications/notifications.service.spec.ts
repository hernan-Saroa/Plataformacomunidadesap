import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { Notification } from './entities/notification.entity';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let mockRepo: any;
  let mockQueryBuilder: any;

  beforeEach(async () => {
    mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
    };
    mockRepo = {
      createQueryBuilder: jest.fn(() => mockQueryBuilder),
      count: jest.fn().mockResolvedValue(0),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: getRepositoryToken(Notification), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('getUserNotifications() — orden del panel lateral', () => {
    it('ordena por fecha_creacion DESC para que la notificación más nueva quede primero', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.getUserNotifications('user-1');

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('n.fecha_creacion', 'DESC');
    });

    it('devuelve las notificaciones en el orden que entrega el repo (más reciente primero)', async () => {
      const nueva = { id_notificacion: 'nueva-tarea-asignada', fecha_creacion: new Date('2026-09-10') };
      const vieja = { id_notificacion: 'vieja', fecha_creacion: new Date('2026-01-01') };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[nueva, vieja], 2]);

      const result = await service.getUserNotifications('user-1');

      expect(result.data[0].id_notificacion).toBe('nueva-tarea-asignada');
      expect(result.data[1].id_notificacion).toBe('vieja');
    });

    it('filtra por usuario destinatario y excluye notificaciones archivadas', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.getUserNotifications('user-1');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('n.id_usuario_destinatario = :userId', { userId: 'user-1' });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('n.archivada = false');
    });

    it('aplica el filtro solo_no_leidas cuando se solicita', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.getUserNotifications('user-1', { solo_no_leidas: true });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('n.leida = false');
    });

    it('aplica el filtro por categoria (ej. gestion-legal) cuando se solicita', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.getUserNotifications('user-1', { categoria: 'gestion-legal' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('n.categoria = :categoria', { categoria: 'gestion-legal' });
    });

    it('pagina con skip/take según page y limit', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.getUserNotifications('user-1', { page: 2, limit: 10 });

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(10);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
    });

    it('retorna data vacía sin lanzar error si la consulta falla (tabla inexistente, etc.)', async () => {
      mockQueryBuilder.getManyAndCount.mockRejectedValue(new Error('relation "notificacion" does not exist'));

      const result = await service.getUserNotifications('user-1');

      expect(result).toEqual({ data: [], total: 0, no_leidas: 0 });
    });
  });
});
