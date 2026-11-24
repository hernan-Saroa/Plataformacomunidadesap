import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { Notification } from './entities/notification.entity';
import { CompuertaService } from '../configuracion/compuerta.service';

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
        // La compuerta deja pasar todo: estas pruebas son de la campana, no de la configuración.
        {
          provide: CompuertaService,
          useValue: {
            evaluar: jest.fn(async (e: any) => ({
              permitido: true, modulo: 'pta', clave: e.clave, prioridad: e.prioridad ?? 'Media', canal: 'ambos', evento: null,
            })),
            destinatariosAdicionales: jest.fn(async () => []),
          },
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('desvío de la campana (EFDS-2406)', () => {
    const dto = { id_usuario_destinatario: 'u1', tipo_notificacion: 'v_x', titulo: 'Título', mensaje: 'Mensaje', modulo: 'viaticos' };
    const armar = (decision: any) => {
      const compuerta: any = {
        evaluar: jest.fn().mockResolvedValue({ modulo: 'viaticos', modulo_nombre: 'Viáticos', clave: 'v_x', prioridad: 'Media', canal: 'ambos', evento: null, ...decision }),
        destinatariosAdicionales: jest.fn(async () => []),
        resolverCorreoDeUsuario: jest.fn().mockResolvedValue('u1@esap.edu.co'),
      };
      const repo: any = { create: jest.fn((v) => v), save: jest.fn(async (v) => v) };
      const correos: any = { enviarDesviado: jest.fn().mockResolvedValue(undefined) };
      return { service: new NotificationsService(repo, compuerta, correos), repo, correos, compuerta };
    };

    it('no crea la campana, manda el correo al buzón y responde omitida/desviado', async () => {
      const { service, repo, correos } = armar({ permitido: false, motivo: 'modulo_inactivo', desvio: 'buzon@esap.edu.co' });
      const r = await service.create(dto);
      expect(r).toEqual({ omitida: true, motivo: 'desviado', modulo: 'viaticos', tipo_notificacion: 'v_x', desviado_a: 'buzon@esap.edu.co' });
      expect(repo.save).not.toHaveBeenCalled();
      expect(correos.enviarDesviado).toHaveBeenCalledWith(expect.objectContaining({
        destinatario: 'u1@esap.edu.co', canal: 'campana', asunto: 'Título', texto: 'Mensaje',
        decision: expect.objectContaining({ desvio: 'buzon@esap.edu.co' }),
      }));
    });

    it('si el usuario no se resuelve, el aviso nombra el id', async () => {
      const { service, correos, compuerta } = armar({ permitido: false, motivo: 'evento_inactivo', desvio: 'buzon@esap.edu.co' });
      compuerta.resolverCorreoDeUsuario.mockResolvedValue(null);
      await service.create(dto);
      expect(correos.enviarDesviado).toHaveBeenCalledWith(expect.objectContaining({ destinatario: 'u1' }));
    });

    it('un motivo de canal (sin desvío) se omite sin mandar nada', async () => {
      const { service, correos } = armar({ permitido: false, motivo: 'canal_solo_correo' });
      expect(await service.create(dto)).toMatchObject({ omitida: true, motivo: 'canal_solo_correo' });
      expect(correos.enviarDesviado).not.toHaveBeenCalled();
    });

    it('un aviso permitido (p. ej. obligatorio) se guarda y no se desvía', async () => {
      const { service, repo, correos } = armar({ permitido: true });
      await service.create(dto);
      expect(repo.save).toHaveBeenCalled();
      expect(correos.enviarDesviado).not.toHaveBeenCalled();
    });

    it('si el correo de desvío falla, no tumba al emisor', async () => {
      const { service, correos } = armar({ permitido: false, motivo: 'modulo_inactivo', desvio: 'buzon@esap.edu.co' });
      correos.enviarDesviado.mockRejectedValue(new Error('SMTP'));
      await expect(service.create(dto)).resolves.toMatchObject({ omitida: true });
    });

    it('en el envío masivo cuenta las desviadas dentro de las omitidas', async () => {
      const { service, correos } = armar({ permitido: false, motivo: 'modulo_inactivo', desvio: 'buzon@esap.edu.co' });
      expect(await service.createBulk([dto, { ...dto, id_usuario_destinatario: 'u2' }])).toEqual({ success: true, created: 0, omitidas: 2, desviadas: 2 });
      expect(correos.enviarDesviado).toHaveBeenCalledTimes(2);
    });
  });

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
