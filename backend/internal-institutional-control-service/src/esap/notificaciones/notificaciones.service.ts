import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Notificacion, EstadoNotificacion, TipoNotificacion, CanalNotificacion, PrioridadNotificacion } from './entities/notificacion.entity';
import { PreferenciaNotificacion } from './entities/preferencia-notificacion.entity';
import { CreateNotificacionDto } from './dto/create-notificacion.dto';

@Injectable()
export class NotificacionesService {
  constructor(
    @InjectRepository(Notificacion)
    private readonly notificacionRepository: Repository<Notificacion>,
    @InjectRepository(PreferenciaNotificacion)
    private readonly preferenciaRepository: Repository<PreferenciaNotificacion>,
  ) {}

  /**
   * Obtiene todas las notificaciones de un usuario
   */
  async findByUsuario(
    usuarioId: string,
    filters?: {
      estado?: string;
      tipo?: string;
      leida?: boolean;
      prioridad?: string;
    },
  ): Promise<Notificacion[]> {
    const query = this.notificacionRepository
      .createQueryBuilder('notificacion')
      .where('notificacion.usuarioId = :usuarioId', { usuarioId })
      .orderBy('notificacion.createdAt', 'DESC');

    if (filters?.estado) {
      query.andWhere('notificacion.estado = :estado', { estado: filters.estado });
    }

    if (filters?.tipo) {
      query.andWhere('notificacion.tipoNotificacion = :tipo', { tipo: filters.tipo });
    }

    if (filters?.leida !== undefined) {
      query.andWhere('notificacion.leida = :leida', { leida: filters.leida });
    }

    if (filters?.prioridad) {
      query.andWhere('notificacion.prioridad = :prioridad', { prioridad: filters.prioridad });
    }

    return query.getMany();
  }

  /**
   * Obtiene notificaciones no leídas de un usuario
   */
  async getNoLeidas(usuarioId: string): Promise<Notificacion[]> {
    return this.notificacionRepository.find({
      where: {
        usuarioId,
        leida: false,
        estado: EstadoNotificacion.ENVIADA,
      },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  /**
   * Obtiene el conteo de notificaciones no leídas
   */
  async getConteoNoLeidas(usuarioId: string): Promise<number> {
    return this.notificacionRepository.count({
      where: {
        usuarioId,
        leida: false,
        estado: EstadoNotificacion.ENVIADA,
      },
    });
  }

  /**
   * Crea una nueva notificación
   */
  async create(createDto: CreateNotificacionDto): Promise<Notificacion> {
    const notificacion = this.notificacionRepository.create({
      ...createDto,
      estado: EstadoNotificacion.PENDIENTE,
      canal: createDto.canal || CanalNotificacion.SISTEMA,
      prioridad: createDto.prioridad || PrioridadNotificacion.NORMAL,
      leida: false,
      enviadaEmail: false,
    });

    const saved = await this.notificacionRepository.save(notificacion);

    // Enviar notificación según preferencias del usuario
    await this.enviarNotificacion(saved);

    return saved;
  }

  /**
   * Envía la notificación según las preferencias del usuario
   */
  private async enviarNotificacion(notificacion: Notificacion): Promise<void> {
    const preferencias = await this.preferenciaRepository.findOne({
      where: { usuarioId: notificacion.usuarioId },
    });

    // Si no hay preferencias, usar defaults
    const recibirEmail = preferencias?.recibirEmail ?? true;
    const recibirSistema = preferencias?.recibirSistema ?? true;

    // Verificar si el tipo de notificación está activo en preferencias
    if (preferencias?.tiposNotificacion) {
      const tipoConfig = preferencias.tiposNotificacion[notificacion.tipoNotificacion];
      if (tipoConfig && !tipoConfig.activo) {
        // Tipo desactivado, no enviar
        notificacion.estado = EstadoNotificacion.ARCHIVADA;
        await this.notificacionRepository.save(notificacion);
        return;
      }
    }

    // Marcar como enviada
    notificacion.estado = EstadoNotificacion.ENVIADA;

    // Si debe enviarse por email
    if (recibirEmail && (notificacion.canal === 'email' || notificacion.canal === 'ambos')) {
      // Aquí se integraría con el servicio de email
      notificacion.enviadaEmail = true;
      notificacion.fechaEnvioEmail = new Date();
    }

    await this.notificacionRepository.save(notificacion);
  }

  /**
   * Marca una notificación como leída
   */
  async marcarLeida(id: string, usuarioId: string): Promise<Notificacion> {
    const notificacion = await this.notificacionRepository.findOne({
      where: { id, usuarioId },
    });

    if (!notificacion) {
      throw new NotFoundException(`Notificación con ID ${id} no encontrada`);
    }

    notificacion.leida = true;
    notificacion.fechaLectura = new Date();
    notificacion.estado = EstadoNotificacion.LEIDA;

    return this.notificacionRepository.save(notificacion);
  }

  /**
   * Marca todas las notificaciones de un usuario como leídas
   */
  async marcarTodasLeidas(usuarioId: string): Promise<void> {
    await this.notificacionRepository.update(
      {
        usuarioId,
        leida: false,
      },
      {
        leida: true,
        fechaLectura: new Date(),
        estado: EstadoNotificacion.LEIDA,
      },
    );
  }

  /**
   * Archiva una notificación
   */
  async archivar(id: string, usuarioId: string): Promise<Notificacion> {
    const notificacion = await this.notificacionRepository.findOne({
      where: { id, usuarioId },
    });

    if (!notificacion) {
      throw new NotFoundException(`Notificación con ID ${id} no encontrada`);
    }

    notificacion.estado = EstadoNotificacion.ARCHIVADA;
    return this.notificacionRepository.save(notificacion);
  }

  /**
   * Elimina una notificación
   */
  async delete(id: string, usuarioId: string): Promise<void> {
    const notificacion = await this.notificacionRepository.findOne({
      where: { id, usuarioId },
    });

    if (!notificacion) {
      throw new NotFoundException(`Notificación con ID ${id} no encontrada`);
    }

    await this.notificacionRepository.remove(notificacion);
  }

  /**
   * Obtiene las preferencias de notificación de un usuario
   */
  async getPreferencias(usuarioId: string): Promise<PreferenciaNotificacion> {
    let preferencias = await this.preferenciaRepository.findOne({
      where: { usuarioId },
    });

    if (!preferencias) {
      // Crear preferencias por defecto
      preferencias = this.preferenciaRepository.create({
        usuarioId,
        recibirEmail: true,
        recibirSistema: true,
        diasAnticipacion: 7,
      });
      preferencias = await this.preferenciaRepository.save(preferencias);
    }

    return preferencias;
  }

  /**
   * Actualiza las preferencias de notificación de un usuario
   */
  async updatePreferencias(
    usuarioId: string,
    preferencias: Partial<PreferenciaNotificacion>,
  ): Promise<PreferenciaNotificacion> {
    let pref = await this.preferenciaRepository.findOne({
      where: { usuarioId },
    });

    if (!pref) {
      pref = this.preferenciaRepository.create({
        usuarioId,
        ...preferencias,
      });
    } else {
      Object.assign(pref, preferencias);
    }

    return this.preferenciaRepository.save(pref);
  }

  /**
   * Crea notificaciones automáticas para recordatorios de vencimiento
   */
  async crearRecordatoriosVencimiento(): Promise<void> {
    // Este método se ejecutaría en un cron job
    // Buscaría fechas de vencimiento próximas y crearía notificaciones
    // Por ahora es un placeholder
  }
}

