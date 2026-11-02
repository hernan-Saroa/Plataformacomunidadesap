import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { CompuertaService, Decision } from '../configuracion/compuerta.service';

/** Respuesta cuando la configuración de notificaciones no dejó pasar el aviso (EFDS-2406). */
export interface NotificacionOmitida {
  omitida: true;
  motivo: string;
  modulo: string;
  tipo_notificacion: string;
}

export const esOmitida = (r: unknown): r is NotificacionOmitida =>
  !!r && typeof r === 'object' && (r as NotificacionOmitida).omitida === true;

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
    private readonly compuerta: CompuertaService,
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

  /**
   * Pasa el aviso por la configuración de notificaciones antes de guardarlo.
   * Devuelve la notificación creada o `{ omitida: true, motivo }` si el módulo
   * o el evento están apagados o el evento es solo de correo.
   */
  async create(dto: CreateNotificationDto): Promise<Notification | NotificacionOmitida> {
    const decision = await this.evaluar(dto);
    if (!decision.permitido) return this.omitida(dto, decision);
    const guardada = await this.guardar(dto, decision);
    await this.notificarAdicionales(dto, decision);
    return guardada;
  }

  async createBulk(
    dtos: CreateNotificationDto[],
  ): Promise<{ success: boolean; created: number; omitidas: number }> {
    const permitidos: Array<{ dto: CreateNotificationDto; decision: Decision }> = [];
    let omitidas = 0;
    for (const dto of dtos) {
      const decision = await this.evaluar(dto);
      if (decision.permitido) permitidos.push({ dto, decision });
      else omitidas++;
    }
    const notifications = permitidos.map(({ dto, decision }) => this.armar(dto, decision));
    const saved = notifications.length ? await this.repo.save(notifications) : [];
    // Los adicionales se resuelven una vez por evento: un envío masivo a N
    // aprobadores no debe copiar N veces al mismo rol.
    const porEvento = new Map<string, { dto: CreateNotificationDto; decision: Decision }>();
    for (const item of permitidos) porEvento.set(item.decision.clave, item);
    for (const { dto, decision } of porEvento.values()) await this.notificarAdicionales(dto, decision);
    return { success: true, created: saved.length, omitidas };
  }

  private evaluar(dto: CreateNotificationDto): Promise<Decision> {
    return this.compuerta.evaluar({
      clave: dto.tipo_notificacion,
      canal: 'plataforma',
      modulo: dto.modulo,
      categoria: dto.categoria,
      prioridad: dto.prioridad,
      destinatario: dto.id_usuario_destinatario,
      titulo: dto.titulo,
    });
  }

  private omitida(dto: CreateNotificationDto, decision: Decision): NotificacionOmitida {
    return {
      omitida: true,
      motivo: decision.motivo || 'omitida',
      modulo: decision.modulo,
      tipo_notificacion: dto.tipo_notificacion,
    };
  }

  private armar(dto: CreateNotificationDto, decision: Decision): Notification {
    return this.repo.create({
      id_usuario_destinatario: dto.id_usuario_destinatario,
      tipo_notificacion: dto.tipo_notificacion,
      titulo: dto.titulo,
      mensaje: dto.mensaje,
      descripcion_corta: dto.descripcion_corta,
      icono: dto.icono,
      color: dto.color,
      prioridad: decision.prioridad ?? dto.prioridad ?? 'Media',
      categoria: dto.categoria,
      tiene_accion: dto.tiene_accion ?? false,
      texto_boton_accion: dto.texto_boton_accion,
      url_accion: dto.url_accion,
      datos_adicionales: dto.datos_adicionales,
    });
  }

  private async guardar(dto: CreateNotificationDto, decision: Decision): Promise<Notification> {
    const notification = this.armar(dto, decision);
    if (dto.clave_idempotencia) {
      notification.id_notificacion = dto.clave_idempotencia;
      await this.repo.createQueryBuilder().insert().into(Notification).values(notification)
        .onConflict('("id_notificacion") DO NOTHING').execute();
      const saved = await this.repo.findOneByOrFail({id_notificacion:dto.clave_idempotencia});
      if (saved.id_usuario_destinatario !== dto.id_usuario_destinatario || saved.tipo_notificacion !== dto.tipo_notificacion)
        throw new ConflictException('La clave de notificación ya pertenece a otro evento.');
      return saved;
    }
    return this.repo.save(notification);
  }

  /**
   * Copia el aviso a los destinatarios que el administrador sumó al evento
   * (función 4). El id se deriva del contenido y del día para que el mismo
   * aviso repetido en el día no se duplique en la campana de quien lo recibe
   * por configuración.
   */
  private async notificarAdicionales(dto: CreateNotificationDto, decision: Decision): Promise<void> {
    const adicionales = await this.compuerta.destinatariosAdicionales(decision.evento);
    if (!adicionales.length) return;
    const dia = new Date().toISOString().slice(0, 10);
    const copias = adicionales
      .filter((a) => a.id_user && a.id_user !== dto.id_usuario_destinatario)
      .map((a) => {
        const copia = this.armar({ ...dto, id_usuario_destinatario: a.id_user }, decision);
        copia.id_notificacion = idDeterminista(`${decision.clave}|${dto.titulo}|${dto.mensaje}|${a.id_user}|${dia}`);
        return copia;
      });
    if (!copias.length) return;
    await this.repo.createQueryBuilder().insert().into(Notification).values(copias)
      .onConflict('("id_notificacion") DO NOTHING').execute();
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

/** UUID (formato v4) derivado de un texto: el mismo texto da siempre el mismo id. */
export function idDeterminista(texto: string): string {
  const h = createHash('sha1').update(texto).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
