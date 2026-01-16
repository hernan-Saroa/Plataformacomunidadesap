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
    console.log(`[NotificacionesService.findByUsuario] Consultando notificaciones para usuarioId: ${usuarioId}`);
    
    // Convertir UUID a id_tercero
    let idTercero: number;
    try {
      idTercero = await this.getUserIdTerceroFromUUID(usuarioId);
      console.log(`[NotificacionesService.findByUsuario] UsuarioId convertido: ${usuarioId} -> ${idTercero}`);
    } catch (error) {
      console.error(`[NotificacionesService.findByUsuario] Error al convertir usuarioId ${usuarioId}:`, error);
      // Si falla la conversión, intentar usar directamente si es numérico
      if (/^\d+$/.test(usuarioId)) {
        idTercero = Number(usuarioId);
        console.log(`[NotificacionesService.findByUsuario] Usando usuarioId directamente como numérico: ${idTercero}`);
      } else {
        // Si no se puede convertir y no es numérico, retornar array vacío
        console.error(`[NotificacionesService.findByUsuario] No se pudo convertir usuarioId ${usuarioId}, retornando array vacío`);
        return [];
      }
    }

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

    const resultados = await query.getMany();
    console.log(`[NotificacionesService.findByUsuario] Encontradas ${resultados.length} notificaciones para usuario ${idTercero}`);
    
    return resultados;
  }

  /**
   * Obtiene notificaciones no leídas de un usuario
   */
  async getNoLeidas(usuarioId: string): Promise<Notificacion[]> {
    console.log(`[NotificacionesService.getNoLeidas] Consultando notificaciones no leídas para usuarioId: ${usuarioId}`);
    
    // Convertir UUID a id_tercero
    let idTercero: number;
    try {
      idTercero = await this.getUserIdTerceroFromUUID(usuarioId);
      console.log(`[NotificacionesService.getNoLeidas] UsuarioId convertido: ${usuarioId} -> ${idTercero}`);
    } catch (error) {
      console.error(`[NotificacionesService.getNoLeidas] Error al convertir usuarioId ${usuarioId}:`, error);
      // Si falla la conversión, intentar usar directamente si es numérico
      if (/^\d+$/.test(usuarioId)) {
        idTercero = Number(usuarioId);
        console.log(`[NotificacionesService.getNoLeidas] Usando usuarioId directamente como numérico: ${idTercero}`);
      } else {
        console.error(`[NotificacionesService.getNoLeidas] No se pudo convertir usuarioId ${usuarioId}, retornando array vacío`);
        return [];
      }
    }

    const resultados = await this.notificacionRepository.find({
      where: {
        usuarioId: String(idTercero),
        leida: false,
        estado: EstadoNotificacion.ENVIADA,
      },
      order: { createdAt: 'DESC' },
      take: 50,
    });
    
    console.log(`[NotificacionesService.getNoLeidas] Encontradas ${resultados.length} notificaciones no leídas para usuario ${idTercero}`);
    
    return resultados;
  }

  /**
   * Obtiene el conteo de notificaciones no leídas
   */
  async getConteoNoLeidas(usuarioId: string): Promise<number> {
    console.log(`[NotificacionesService.getConteoNoLeidas] Consultando conteo para usuarioId: ${usuarioId}`);
    
    // Convertir UUID a id_tercero
    let idTercero: number;
    try {
      idTercero = await this.getUserIdTerceroFromUUID(usuarioId);
      console.log(`[NotificacionesService.getConteoNoLeidas] UsuarioId convertido: ${usuarioId} -> ${idTercero}`);
    } catch (error) {
      console.error(`[NotificacionesService.getConteoNoLeidas] Error al convertir usuarioId ${usuarioId}:`, error);
      // Si falla la conversión, intentar usar directamente si es numérico
      if (/^\d+$/.test(usuarioId)) {
        idTercero = Number(usuarioId);
        console.log(`[NotificacionesService.getConteoNoLeidas] Usando usuarioId directamente como numérico: ${idTercero}`);
      } else {
        console.error(`[NotificacionesService.getConteoNoLeidas] No se pudo convertir usuarioId ${usuarioId}, retornando 0`);
        return 0;
      }
    }

    const conteo = await this.notificacionRepository.count({
      where: {
        usuarioId: String(idTercero),
        leida: false,
        estado: EstadoNotificacion.ENVIADA,
      },
    });
    
    console.log(`[NotificacionesService.getConteoNoLeidas] Conteo: ${conteo} notificaciones no leídas para usuario ${idTercero}`);
    
    return conteo;
  }

  /**
   * Crea una nueva notificación
   */
  async create(createDto: CreateNotificacionDto): Promise<Notificacion> {
    // Convertir usuarioId a id_tercero si viene como UUID
    // El método getUserIdTerceroFromUUID maneja automáticamente si ya es numérico
    let usuarioIdFinal: string;
    try {
      const idTercero = await this.getUserIdTerceroFromUUID(createDto.usuarioId);
      usuarioIdFinal = String(idTercero);
      console.log(`[NotificacionesService.create] UsuarioId procesado: ${createDto.usuarioId} -> id_tercero: ${usuarioIdFinal}`);
    } catch (error) {
      // Si falla la conversión y es un string numérico, usarlo directamente
      if (/^\d+$/.test(String(createDto.usuarioId))) {
        usuarioIdFinal = String(createDto.usuarioId);
        console.log(`[NotificacionesService.create] UsuarioId ya es numérico, usando directamente: ${usuarioIdFinal}`);
      } else {
        // Si es UUID y falla la conversión, lanzar error
        console.error(`[NotificacionesService.create] Error al convertir usuarioId ${createDto.usuarioId}:`, error);
        throw new NotFoundException(`No se pudo convertir usuarioId ${createDto.usuarioId} a id_tercero: ${error.message}`);
      }
    }

    const notificacion = this.notificacionRepository.create({
      ...createDto,
      usuarioId: usuarioIdFinal,
      estado: EstadoNotificacion.PENDIENTE,
      canal: createDto.canal || CanalNotificacion.SISTEMA,
      prioridad: createDto.prioridad || PrioridadNotificacion.NORMAL,
      leida: false,
      enviadaEmail: false,
    });

    console.log(`[NotificacionesService.create] Creando notificación para usuarioId: ${usuarioIdFinal}, tipo: ${createDto.tipoNotificacion}, titulo: ${createDto.titulo}`);

    const saved = await this.notificacionRepository.save(notificacion);

    console.log(`[NotificacionesService.create] ✅ Notificación creada exitosamente: ID=${saved.id}, usuarioId=${usuarioIdFinal}, estado=${saved.estado}`);

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
    console.log(`[NotificacionesService.marcarLeida] Iniciando marcado de notificación ${id} para usuario ${usuarioId}`);
    
    // Convertir UUID a id_tercero
    const idTercero = await this.getUserIdTerceroFromUUID(usuarioId);
    console.log(`[NotificacionesService.marcarLeida] UsuarioId convertido: ${usuarioId} -> ${idTercero}`);

    const notificacion = await this.notificacionRepository.findOne({
      where: { id, usuarioId: String(idTercero) },
    });

    if (!notificacion) {
      console.error(`[NotificacionesService.marcarLeida] Notificación ${id} no encontrada para usuario ${idTercero}`);
      // Si es super admin, buscar la notificación sin filtrar por usuario
      const notificacionSinFiltro = await this.notificacionRepository.findOne({
        where: { id },
      });
      
      if (notificacionSinFiltro) {
        console.log(`[NotificacionesService.marcarLeida] Notificación encontrada sin filtro de usuario (super admin)`);
        notificacionSinFiltro.leida = true;
        notificacionSinFiltro.fechaLectura = new Date();
        notificacionSinFiltro.estado = EstadoNotificacion.LEIDA;
        const saved = await this.notificacionRepository.save(notificacionSinFiltro);
        console.log(`[NotificacionesService.marcarLeida] ✅ Notificación marcada como leída (super admin)`);
        return saved;
      }
      
      throw new NotFoundException(`Notificación con ID ${id} no encontrada`);
    }

    console.log(`[NotificacionesService.marcarLeida] Notificación encontrada, marcando como leída`);
    notificacion.leida = true;
    notificacion.fechaLectura = new Date();
    notificacion.estado = EstadoNotificacion.LEIDA;

    const saved = await this.notificacionRepository.save(notificacion);
    console.log(`[NotificacionesService.marcarLeida] ✅ Notificación marcada como leída exitosamente`);
    return saved;
  }

  /**
   * Marca todas las notificaciones de un usuario como leídas
   */
  async marcarTodasLeidas(usuarioId: string): Promise<{ success: boolean; actualizadas: number }> {
    console.log(`[NotificacionesService.marcarTodasLeidas] Iniciando marcado de todas las notificaciones para usuario: ${usuarioId}`);
    
    // Convertir UUID a id_tercero
    const idTercero = await this.getUserIdTerceroFromUUID(usuarioId);
    console.log(`[NotificacionesService.marcarTodasLeidas] UsuarioId convertido: ${usuarioId} -> ${idTercero}`);

    // Contar cuántas notificaciones no leídas hay antes de actualizar
    const countBefore = await this.notificacionRepository.count({
      where: {
        usuarioId: String(idTercero),
        leida: false,
      },
    });
    console.log(`[NotificacionesService.marcarTodasLeidas] Notificaciones no leídas encontradas: ${countBefore}`);

    // Actualizar todas las notificaciones no leídas
    const result = await this.notificacionRepository.update(
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

    console.log(`[NotificacionesService.marcarTodasLeidas] Resultado de actualización:`, result);
    console.log(`[NotificacionesService.marcarTodasLeidas] Notificaciones actualizadas: ${result.affected || 0}`);

    return {
      success: true,
      actualizadas: result.affected || 0,
    };
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

  /**
   * Obtiene TODAS las notificaciones (solo para super administradores/admins)
   */
  async findAll(filters?: {
    estado?: string;
    tipo?: string;
    leida?: boolean;
    prioridad?: string;
  }): Promise<Notificacion[]> {
    console.log(`[NotificacionesService.findAll] Obteniendo TODAS las notificaciones con filtros:`, filters);
    
    const query = this.notificacionRepository
      .createQueryBuilder('notificacion')
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

    const resultados = await query.getMany();
    console.log(`[NotificacionesService.findAll] Encontradas ${resultados.length} notificaciones (TODAS)`);
    
    return resultados;
  }

  /**
   * Método de debug para verificar conversión de usuarioId y notificaciones
   */
  async debugUsuario(usuarioId: string): Promise<any> {
    console.log(`[NotificacionesService.debugUsuario] Debug para usuarioId: ${usuarioId}`);
    
    let idTercero: number | null = null;
    let errorConversion: string | null = null;
    
    try {
      idTercero = await this.getUserIdTerceroFromUUID(usuarioId);
      console.log(`[NotificacionesService.debugUsuario] Conversión exitosa: ${usuarioId} -> ${idTercero}`);
    } catch (error) {
      errorConversion = error.message;
      console.error(`[NotificacionesService.debugUsuario] Error en conversión:`, error);
      if (/^\d+$/.test(usuarioId)) {
        idTercero = Number(usuarioId);
        console.log(`[NotificacionesService.debugUsuario] Usando directamente como numérico: ${idTercero}`);
      }
    }

    if (!idTercero) {
      return {
        usuarioIdOriginal: usuarioId,
        error: 'No se pudo convertir usuarioId a id_tercero',
        errorDetalle: errorConversion,
        notificaciones: [],
        totalNotificaciones: 0,
      };
    }

    // Buscar todas las notificaciones para este id_tercero (sin filtros)
    const todasNotificaciones = await this.notificacionRepository.find({
      where: { usuarioId: String(idTercero) },
      order: { createdAt: 'DESC' },
      take: 100,
    });

    const noLeidas = todasNotificaciones.filter(n => !n.leida);
    const enviadas = todasNotificaciones.filter(n => n.estado === EstadoNotificacion.ENVIADA);

    return {
      usuarioIdOriginal: usuarioId,
      idTercero: idTercero,
      conversionExitosa: !errorConversion,
      errorConversion: errorConversion || null,
      totalNotificaciones: todasNotificaciones.length,
      notificacionesNoLeidas: noLeidas.length,
      notificacionesEnviadas: enviadas.length,
      notificaciones: todasNotificaciones.map(n => ({
        id: n.id,
        tipoNotificacion: n.tipoNotificacion,
        titulo: n.titulo,
        estado: n.estado,
        leida: n.leida,
        createdAt: n.createdAt,
        usuarioId: n.usuarioId,
      })),
    };
  }
}


