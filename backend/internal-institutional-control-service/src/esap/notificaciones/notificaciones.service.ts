import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual, DataSource } from 'typeorm';
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
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Convierte UUID a id_tercero
   * Acepta tanto UUID como id_tercero numérico
   */
  private async getUserIdTerceroFromUUID(usuarioIdOrUUID: string | number): Promise<number> {
    // Si ya es numérico, retornarlo directamente
    if (typeof usuarioIdOrUUID === 'number') {
      return usuarioIdOrUUID;
    }

    // Si es string que parece número, convertirlo
    if (/^\d+$/.test(usuarioIdOrUUID)) {
      return Number(usuarioIdOrUUID);
    }

    // Es UUID, consultar id_tercero
    const result = await this.dataSource.query(
      'SELECT id_tercero FROM auth."user" WHERE id_user = $1',
      [usuarioIdOrUUID]
    );

    if (!result || result.length === 0) {
      throw new NotFoundException(`Usuario con UUID ${usuarioIdOrUUID} no encontrado en auth.user`);
    }

    return Number(result[0].id_tercero);
  }

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
    // Convertir UUID a id_tercero
    const idTercero = await this.getUserIdTerceroFromUUID(usuarioId);

    const query = this.notificacionRepository
      .createQueryBuilder('notificacion')
      .where('notificacion.usuarioId = :usuarioId', { usuarioId: String(idTercero) })
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
    // Convertir UUID a id_tercero
    const idTercero = await this.getUserIdTerceroFromUUID(usuarioId);

    return this.notificacionRepository.find({
      where: {
        usuarioId: String(idTercero),
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
    // Convertir UUID a id_tercero
    const idTercero = await this.getUserIdTerceroFromUUID(usuarioId);

    return this.notificacionRepository.count({
      where: {
        usuarioId: String(idTercero),
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
    // Convertir UUID a id_tercero
    const idTercero = await this.getUserIdTerceroFromUUID(usuarioId);

    const notificacion = await this.notificacionRepository.findOne({
      where: { id, usuarioId: String(idTercero) },
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
    // Convertir UUID a id_tercero
    const idTercero = await this.getUserIdTerceroFromUUID(usuarioId);

    await this.notificacionRepository.update(
      {
        usuarioId: String(idTercero),
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
    // Convertir UUID a id_tercero
    const idTercero = await this.getUserIdTerceroFromUUID(usuarioId);

    const notificacion = await this.notificacionRepository.findOne({
      where: { id, usuarioId: String(idTercero) },
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
    // Convertir UUID a id_tercero
    const idTercero = await this.getUserIdTerceroFromUUID(usuarioId);

    const notificacion = await this.notificacionRepository.findOne({
      where: { id, usuarioId: String(idTercero) },
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

  /**
   * Notifica a los Jefes de Control Interno cuando se solicita una ampliación de plazo
   */
  async notificarSolicitudAmpliacionPlazo(
    auditoriaId: string,
    auditoriaCodigo: string,
    auditoriaNombre: string,
    solicitanteNombre: string,
    justificacion: string,
  ): Promise<void> {
    // TODO: Obtener todos los usuarios con rol JEFE_CONTROL_INTERNO
    // Por ahora, como no tenemos la integración con auth-service, 
    // usamos un placeholder que deberá ser implementado
    const jefesOCI = await this.obtenerJefesControlInterno();

    for (const jefeId of jefesOCI) {
      await this.create({
        usuarioId: jefeId,
        tipoNotificacion: TipoNotificacion.SOLICITUD_AMPLIACION_PLAZO,
        titulo: `Nueva solicitud de ampliación de plazo - ${auditoriaCodigo}`,
        mensaje: `${solicitanteNombre} ha solicitado una ampliación de plazo para la auditoría "${auditoriaNombre}".\n\nJustificación: ${justificacion.substring(0, 200)}${justificacion.length > 200 ? '...' : ''}`,
        prioridad: PrioridadNotificacion.ALTA,
        canal: CanalNotificacion.AMBOS,
        metadata: {
          auditoriaId,
          auditoriaCodigo,
          auditoriaNombre,
          solicitante: solicitanteNombre,
          accion: 'solicitud_ampliacion',
        },
      });
    }
  }

  /**
   * Notifica cuando se aprueba una ampliación de plazo
   */
  async notificarAmpliacionAprobada(
    auditoriaId: string,
    auditoriaCodigo: string,
    auditoriaNombre: string,
    auditorLiderId: number,
    nuevaFechaFin: string,
    comentarios?: string,
  ): Promise<void> {
    // Notificar al auditor líder
    if (auditorLiderId) {
      await this.create({
        usuarioId: auditorLiderId.toString(),
        tipoNotificacion: TipoNotificacion.AMPLIACION_PLAZO_APROBADA,
        titulo: `✅ Ampliación de plazo aprobada - ${auditoriaCodigo}`,
        mensaje: `Su solicitud de ampliación de plazo para la auditoría "${auditoriaNombre}" ha sido aprobada.\n\nNueva fecha de finalización: ${nuevaFechaFin}${comentarios ? `\n\nComentarios: ${comentarios}` : ''}`,
        prioridad: PrioridadNotificacion.ALTA,
        canal: CanalNotificacion.AMBOS,
        metadata: {
          auditoriaId,
          auditoriaCodigo,
          auditoriaNombre,
          nuevaFechaFin,
          accion: 'aprobacion_ampliacion',
        },
      });
    }

    // TODO: Notificar al área auditada
    // Necesitaría el contacto del área auditada de la auditoría
  }

  /**
   * Notifica cuando se rechaza una ampliación de plazo
   */
  async notificarAmpliacionRechazada(
    auditoriaId: string,
    auditoriaCodigo: string,
    auditoriaNombre: string,
    auditorLiderId: number,
    motivo: string,
  ): Promise<void> {
    // Notificar al auditor líder
    if (auditorLiderId) {
      await this.create({
        usuarioId: auditorLiderId.toString(),
        tipoNotificacion: TipoNotificacion.AMPLIACION_PLAZO_RECHAZADA,
        titulo: `❌ Ampliación de plazo rechazada - ${auditoriaCodigo}`,
        mensaje: `Su solicitud de ampliación de plazo para la auditoría "${auditoriaNombre}" ha sido rechazada.\n\nMotivo: ${motivo}`,
        prioridad: PrioridadNotificacion.ALTA,
        canal: CanalNotificacion.AMBOS,
        metadata: {
          auditoriaId,
          auditoriaCodigo,
          auditoriaNombre,
          motivo,
          accion: 'rechazo_ampliacion',
        },
      });
    }
  }

  /**
   * Obtiene los IDs de usuarios con rol JEFE_CONTROL_INTERNO
   */
  private async obtenerJefesControlInterno(): Promise<string[]> {
    try {
      const result = await this.dataSource.query(`
        SELECT DISTINCT u.id_tercero
        FROM auth."user" u
        INNER JOIN auth.user_roles ur ON ur.id_user = u.id_user
        INNER JOIN auth.role r ON r.id = ur.id_rol
        WHERE r.code = 'JEFE_CONTROL_INTERNO'
          AND ur.is_active = true
          AND u.is_active = true
      `);

      return result.map((row: any) => String(row.id_tercero));
    } catch (error) {
      console.error('Error al obtener Jefes de Control Interno:', error);
      return [];
    }
  }
}


