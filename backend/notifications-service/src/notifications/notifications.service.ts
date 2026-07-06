import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
  ) {}

  async getUserNotifications(
    userId: string,
    params: {
      solo_no_leidas?: boolean;
      categoria?: string;
      prioridad?: string;
      page?: number;
      limit?: number;
    } = {},
  ) {
    const { solo_no_leidas, categoria, prioridad, page = 1, limit = 50 } = params;

    try {
      const qb = this.repo
        .createQueryBuilder('n')
        .where('n.id_usuario_destinatario = :userId', { userId })
        .andWhere('n.archivada = false')
        .orderBy('n.fecha_creacion', 'DESC');

      if (solo_no_leidas) qb.andWhere('n.leida = false');
      if (categoria) qb.andWhere('n.categoria = :categoria', { categoria });
      if (prioridad) qb.andWhere('n.prioridad = :prioridad', { prioridad });

      const offset = (page - 1) * limit;
      qb.skip(offset).take(limit);

      const [data, total] = await qb.getManyAndCount();
      const no_leidas = await this.repo.count({
        where: { id_usuario_destinatario: userId, leida: false, archivada: false },
      });

      return { data, total, no_leidas };
    } catch (error) {
      // Gracefully handle missing table or DB connectivity issues
      console.warn('[NotificationsService] getUserNotifications error (table may not exist):', error?.message || error);
      return { data: [], total: 0, no_leidas: 0 };
    }
  }

  async getUnread(userId: string): Promise<Notification[]> {
    try {
      return await this.repo.find({
        where: { id_usuario_destinatario: userId, leida: false, archivada: false },
        order: { fecha_creacion: 'DESC' },
      });
    } catch {
      return [];
    }
  }

  async getUnreadCount(userId: string): Promise<number> {
    try {
      return await this.repo.count({
        where: { id_usuario_destinatario: userId, leida: false, archivada: false },
      });
    } catch {
      return 0;
    }
  }

  async create(dto: CreateNotificationDto): Promise<Notification> {
    const notification = this.repo.create({
      id_usuario_destinatario: dto.id_usuario_destinatario,
      tipo_notificacion: dto.tipo_notificacion,
      titulo: dto.titulo,
      mensaje: dto.mensaje,
      descripcion_corta: dto.descripcion_corta,
      icono: dto.icono,
      color: dto.color,
      prioridad: dto.prioridad ?? 'Media',
      categoria: dto.categoria,
      tiene_accion: dto.tiene_accion ?? false,
      texto_boton_accion: dto.texto_boton_accion,
      url_accion: dto.url_accion,
      datos_adicionales: dto.datos_adicionales,
    });
    return this.repo.save(notification);
  }

  async createBulk(dtos: CreateNotificationDto[]): Promise<{ success: boolean; created: number }> {
    const notifications = dtos.map((dto) =>
      this.repo.create({
        id_usuario_destinatario: dto.id_usuario_destinatario,
        tipo_notificacion: dto.tipo_notificacion,
        titulo: dto.titulo,
        mensaje: dto.mensaje,
        descripcion_corta: dto.descripcion_corta,
        icono: dto.icono,
        color: dto.color,
        prioridad: dto.prioridad ?? 'Media',
        categoria: dto.categoria,
        tiene_accion: dto.tiene_accion ?? false,
        texto_boton_accion: dto.texto_boton_accion,
        url_accion: dto.url_accion,
        datos_adicionales: dto.datos_adicionales,
      }),
    );
    const saved = await this.repo.save(notifications);
    return { success: true, created: saved.length };
  }

  async markAsRead(id: string): Promise<{ success: boolean }> {
    const n = await this.repo.findOne({ where: { id_notificacion: id } });
    if (!n) throw new NotFoundException('Notificación no encontrada');
    await this.repo.save({ ...n, leida: true, fecha_lectura: new Date() });
    return { success: true };
  }

  async markAllAsRead(userId: string): Promise<{ success: boolean; count: number }> {
    const result = await this.repo
      .createQueryBuilder()
      .update(Notification)
      .set({ leida: true, fecha_lectura: new Date() })
      .where('id_usuario_destinatario = :userId AND leida = false AND archivada = false', { userId })
      .execute();
    return { success: true, count: result.affected ?? 0 };
  }

  async archive(id: string): Promise<{ success: boolean }> {
    const n = await this.repo.findOne({ where: { id_notificacion: id } });
    if (!n) throw new NotFoundException('Notificación no encontrada');
    await this.repo.save({ ...n, archivada: true, fecha_archivado: new Date() });
    return { success: true };
  }

  async delete(id: string): Promise<{ success: boolean }> {
    const result = await this.repo.delete({ id_notificacion: id });
    if (!result.affected) throw new NotFoundException('Notificación no encontrada');
    return { success: true };
  }

  async trackEmailOpen(id: string): Promise<{ success: boolean }> {
    const n = await this.repo.findOne({ where: { id_notificacion: id } });
    if (!n) throw new NotFoundException('Notificación no encontrada');
    await this.repo.save({ ...n, email_abierto: true, fecha_apertura_email: new Date() });
    return { success: true };
  }

  async trackEmailClick(id: string): Promise<{ success: boolean }> {
    const n = await this.repo.findOne({ where: { id_notificacion: id } });
    if (!n) throw new NotFoundException('Notificación no encontrada');
    await this.repo.save({ ...n, email_click: true });
    return { success: true };
  }

  async toggleFavorite(id: string): Promise<{ success: boolean; es_favorito: boolean }> {
    try {
      const n = await this.repo.findOne({ where: { id_notificacion: id } });
      if (!n) throw new NotFoundException('Notificación no encontrada');

      const newState = !n.es_favorito;
      await this.repo.update({ id_notificacion: id }, { es_favorito: newState });
      
      return { success: true, es_favorito: newState };
    } catch (error) {
      console.error(`[NotificationsService] Error en toggleFavorite:`, error);
      throw error;
    }
  }
}
