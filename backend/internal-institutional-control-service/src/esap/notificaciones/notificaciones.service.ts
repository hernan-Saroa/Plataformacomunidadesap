import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual, DataSource } from 'typeorm';
import { Notificacion, EstadoNotificacion, TipoNotificacion, CanalNotificacion, PrioridadNotificacion } from './entities/notificacion.entity';
import { PreferenciaNotificacion } from './entities/preferencia-notificacion.entity';
import { CreateNotificacionDto } from './dto/create-notificacion.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class NotificacionesService {
  constructor(
    @InjectRepository(Notificacion)
    private readonly notificacionRepository: Repository<Notificacion>,
    @InjectRepository(PreferenciaNotificacion)
    private readonly preferenciaRepository: Repository<PreferenciaNotificacion>,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Obtiene el identificador del usuario (UUID)
   * En este sistema usamos el UUID directamente
   */
  private async getUserIdTerceroFromUUID(usuarioId: string): Promise<string> {
    return usuarioId;
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
  ): Promise<any[]> {
    console.log(`[NotificacionesService.findByUsuario] Consultando para usuarioId: ${usuarioId}`);
    
    // Volver a TypeORM que es más seguro para los tipos de datos
    const query = this.notificacionRepository
      .createQueryBuilder('notificacion')
      .where('notificacion.usuarioId = :usuarioId', { usuarioId })
      .orderBy('notificacion.createdAt', 'DESC');

    const notificaciones = await query.getMany();

    // Intentar obtener el nombre del usuario para el primer registro (o todos)
    let nombreReal = usuarioId;
    try {
      const p = await this.dataSource.query(`
        SELECT p.nom_largo FROM auth.personas p 
        INNER JOIN auth."user" u ON u.id_person = p.id_person 
        WHERE u.id_user = $1 LIMIT 1
      `, [usuarioId]);
      if (p && p.length > 0) nombreReal = p[0].nom_largo;
    } catch (e) {}

    // Mapear al formato que el frontend espera
    return notificaciones.map(n => ({
      ...n,
      destinatario: nombreReal,
      fechaEnvio: n.createdAt
    }));
  }

  /**
   * Obtiene notificaciones no leídas de un usuario
   */
  async getNoLeidas(usuarioId: string): Promise<Notificacion[]> {
    console.log(`[NotificacionesService.getNoLeidas] Consultando notificaciones no leídas para usuarioId: ${usuarioId}`);
    
    // En este sistema usamos el UUID directamente
    let idTercero: string;
    try {
      idTercero = await this.getUserIdTerceroFromUUID(usuarioId);
      console.log(`[NotificacionesService.getNoLeidas] UsuarioId convertido: ${usuarioId} -> ${idTercero}`);
    } catch (error) {
      console.error(`[NotificacionesService.getNoLeidas] Error al convertir usuarioId ${usuarioId}:`, error);
      // Si falla la conversión, intentar usar directamente si es numérico
      if (/^\d+$/.test(usuarioId)) {
        idTercero = String(usuarioId);
        console.log(`[NotificacionesService.getNoLeidas] Usando usuarioId directamente como texto: ${idTercero}`);
      } else {
        console.error(`[NotificacionesService.getNoLeidas] No se pudo convertir usuarioId ${usuarioId}, retornando array vacío`);
        return [];
      }
    }

    const resultados = await this.notificacionRepository.find({
      where: {
        usuarioId: usuarioId,
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
    
    // En este sistema usamos el UUID directamente
    let idTercero: string;
    try {
      idTercero = await this.getUserIdTerceroFromUUID(usuarioId);
      console.log(`[NotificacionesService.getConteoNoLeidas] UsuarioId convertido: ${usuarioId} -> ${idTercero}`);
    } catch (error) {
      console.error(`[NotificacionesService.getConteoNoLeidas] Error al convertir usuarioId ${usuarioId}:`, error);
      // Si falla la conversión, intentar usar directamente si es numérico
      if (/^\d+$/.test(usuarioId)) {
        idTercero = String(usuarioId);
        console.log(`[NotificacionesService.getConteoNoLeidas] Usando usuarioId directamente como texto: ${idTercero}`);
      } else {
        console.error(`[NotificacionesService.getConteoNoLeidas] No se pudo convertir usuarioId ${usuarioId}, retornando 0`);
        return 0;
      }
    }

    const conteo = await this.notificacionRepository.count({
      where: {
        usuarioId: usuarioId,
        leida: false,
        estado: EstadoNotificacion.ENVIADA,
      },
    });
    
    console.log(`[NotificacionesService.getConteoNoLeidas] Conteo: ${conteo} notificaciones no leídas para usuario ${idTercero}`);
    
    return conteo;
  }

  /**
   * Normaliza un string para asegurar que sea UTF-8 limpio
   * Ayuda a corregir el Bug 2 de caracteres corruptos
   */
  private normalizarTexto(texto: string): string {
    if (!texto) return '';
    return texto;
  }

  /**
   * Obtiene la configuración global de notificaciones
   */
  async getGlobalConfig(): Promise<PreferenciaNotificacion | null> {
    try {
      return await this.preferenciaRepository.findOne({ where: { usuarioId: 'GLOBAL_CONFIG' } });
    } catch (e) {
      return null;
    }
  }

  /**
   * MOTOR CENTRALIZADO: Dispara un evento de notificación resolviendo destinatarios y canales
   */
  async dispararEvento(eventoCode: string, context: { 
    auditoriaId?: string;
    auditoriaCodigo?: string;
    planId?: string;
    usuarioId?: string; // Destinatario explícito si aplica
    responsableAreaEmail?: string; // Email del responsable del área auditada (para AUDITADO)
    tituloCustom?: string;
    mensajeCustom?: string;
    metadata?: any;
    url_accion?: string;
  }): Promise<{ total: number; exitosos: number }> {
    console.log(`[Notificaciones] 🚀 Disparando evento: ${eventoCode}`);
    
    try {
      const configGlobal = await this.getGlobalConfig();
      const configEvento = configGlobal?.tiposNotificacion ? configGlobal.tiposNotificacion[eventoCode] : null;

      if (configEvento && (configEvento as any).activo === false) {
        console.warn(`[Notificaciones] Evento ${eventoCode} desactivado en configuración global.`);
        return { total: 0, exitosos: 0 };
      }

      // 1. Resolver Destinatarios por Roles si no hay un usuario explícito
      const destinatariosSet = new Set<string>();
      if (context.usuarioId) {
        destinatariosSet.add(context.usuarioId);
      }

      const rolesDestinatarios = (configEvento as any)?.roles || [];

      if (rolesDestinatarios.length > 0) {
        for (const rolId of rolesDestinatarios) {
          const ids = await this.resolverUsuariosPorRol(rolId, context);
          console.log(`[Notificaciones] 👥 Rol '${rolId}' resuelto a ${ids.length} usuarios`);
          ids.forEach(id => destinatariosSet.add(id));
        }
      }

      const destinatarios = Array.from(destinatariosSet);
      if (destinatarios.length === 0) {
        console.warn(`[Notificaciones] No se encontraron destinatarios para el evento ${eventoCode}`);
        return { total: 0, exitosos: 0 };
      }

      // 1.5. Resolver plantilla de email si existe
      let mensajeFinal = (configEvento as any)?.plantillaEmail || context.mensajeCustom || (configEvento as any)?.mensaje || 'Tiene una nueva actividad pendiente.';
      let tituloFinal = (configEvento as any)?.titulo || context.tituloCustom || 'Notificación de Sistema';

      // Reemplazar variables en el mensaje (ej: [NOMBRE], [CODIGO], etc.)
      if (mensajeFinal && typeof mensajeFinal === 'string') {
        const metadatos = {
          ...context.metadata,
          CODIGO: context.auditoriaCodigo || context.metadata?.auditoriaCodigo || context.metadata?.codigoAuditoria || '',
          NOMBRE: context.auditoriaNombre || context.metadata?.auditoriaNombre || context.metadata?.nombreAuditoria || '',
          ETAPA: context.metadata?.nuevoEstado || context.metadata?.estadoNuevo || '',
          MOTIVO: context.metadata?.motivo || context.metadata?.justificacion || '',
        };

        mensajeFinal = mensajeFinal.replace(/\[(.*?)\]/g, (match, p1) => {
          return metadatos[p1] || metadatos[p1.toLowerCase()] || match;
        });
      }

      // 2. Ejecutar envío para cada destinatario
      let exitosos = 0;
      for (const idUsuario of destinatarios) {
        try {
          await this.create({
            usuarioId: idUsuario,
            tipoNotificacion: eventoCode as any,
            titulo: tituloFinal,
            mensaje: mensajeFinal,
            prioridad: (configEvento as any)?.prioridad || PrioridadNotificacion.NORMAL,
            metadata: { ...context.metadata, eventoCode, auditoriaId: context.auditoriaId },
            accionUrl: context.url_accion || (configEvento as any)?.url_accion || '',
          });
          exitosos++;
          console.log(`[Notificaciones] ✅ Éxito enviando evento ${eventoCode} a usuario ${idUsuario}`);
        } catch (err: any) {
          console.error(`[Notificaciones] ❌ Falla enviando evento ${eventoCode} a usuario ${idUsuario}:`, err.message);
        }
      }

      return { total: destinatarios.length, exitosos };
    } catch (error) {
      console.error(`[Notificaciones] Error crítico en dispararEvento:`, error.message);
      return { total: 0, exitosos: 0 };
    }
  }

  /**
   * Resuelve los UUIDs de usuarios basados en un rol dinámico y el contexto
   */
  private async resolverUsuariosPorRol(rolId: string, context: any): Promise<string[]> {
    const ids: string[] = [];
    
    // Obtener información del rol desde la base de datos
    let roleCode = '';
    try {
      const roles = await this.dataSource.query(
        `SELECT id, code, name FROM auth.role WHERE id::text = $1 OR UPPER(code) = UPPER($1) OR UPPER(name) = UPPER($1) LIMIT 1`,
        [rolId]
      );
      if (!roles || roles.length === 0) {
        console.warn(`[Notificaciones] Rol '${rolId}' no encontrado en BD. Se omite.`);
        return []; // No intentar resolver strings libres
      }
      roleCode = roles[0].code?.toUpperCase() || '';
    } catch (e) {
      console.warn(`[Notificaciones] Error consultando el rol '${rolId}'. Se omite.`);
      return [];
    }

    // "Si el evento está asociado a una auditoría específica, notificar solo al auditor/área auditada"
    if (roleCode === 'AUDITOR_LIDER') {
      if (context.auditoriaId) {
        const aud = await this.dataSource.query(
          `SELECT u.id_user 
           FROM control_interno.auditoria a
           INNER JOIN auth."user" u ON u.id_person = a.auditor_lider_id
           WHERE a.id = $1`, 
          [context.auditoriaId]
        );
        if (aud[0]?.id_user) ids.push(aud[0].id_user);
      }
      return ids;
    }

    if (roleCode === 'EQUIPO_AUDITOR' || roleCode === 'AUDITOR_EQUIPO') {
      if (context.auditoriaId) {
        const miembros = await this.dataSource.query(
          `SELECT DISTINCT u.id_user 
           FROM auth."user" u
           LEFT JOIN control_interno.equipo_auditor ea ON u.id_person = ea.persona_id AND ea.auditoria_id = $1 AND ea.activo = true
           LEFT JOIN control_interno.auditoria a ON a.id = $1
           WHERE ea.persona_id IS NOT NULL 
              OR u.id_person = a.auditor_lider_id 
              OR u.id_person = a.auditor_asignado_id`, 
          [context.auditoriaId]
        );
        miembros.forEach((m: any) => ids.push(m.id_user));
      }
      return ids;
    }

    if (roleCode === 'AUDITADO' || roleCode === 'JEFE_DEPENDENCIA' || roleCode === 'RESPONSABLE_AREA_AUDITADA') {
      if (context.auditoriaId) {
        try {
          const emailResult = await this.dataSource.query(
            `SELECT a.responsable_area_email
             FROM control_interno.auditoria a
             WHERE a.id = $1`,
            [context.auditoriaId]
          );
          const emailResponsable = emailResult[0]?.responsable_area_email;
          if (emailResponsable) {
            const userResult = await this.dataSource.query(
              `SELECT u.id_user
               FROM auth."user" u
               LEFT JOIN auth.personas p ON p.id_person = u.id_person
               WHERE (
                 LOWER(TRIM(COALESCE(p.dir_email, ''))) = LOWER(TRIM($1))
                 OR LOWER(TRIM(u.username)) = LOWER(TRIM($1))
               )
               AND u.is_active = true
               LIMIT 1`,
              [emailResponsable]
            );
            if (userResult[0]?.id_user) ids.push(userResult[0].id_user);
          }
        } catch (err) {}
      } else if (context.responsableAreaEmail) {
        try {
          const userResult = await this.dataSource.query(
            `SELECT u.id_user
             FROM auth."user" u
             LEFT JOIN auth.personas p ON p.id_person = u.id_person
             WHERE (
               LOWER(TRIM(COALESCE(p.dir_email, ''))) = LOWER(TRIM($1))
               OR LOWER(TRIM(u.username)) = LOWER(TRIM($1))
             )
             AND u.is_active = true
             LIMIT 1`,
            [context.responsableAreaEmail]
          );
          if (userResult[0]?.id_user) ids.push(userResult[0].id_user);
        } catch (err) {}
      }
      return ids;
    }

    if (roleCode === 'RESPONSABLE_PLAN_MEJORAMIENTO') {
      if (context.planId) {
        const res = await this.dataSource.query(`
          SELECT u.id_user 
          FROM control_interno.plan_mejoramiento pm
          INNER JOIN auth."user" u ON u.is_active = true
          LEFT JOIN auth.personas p ON p.id_person = u.id_person
          WHERE pm.id = $1
            AND (
              LOWER(TRIM(u.username)) = LOWER(TRIM(pm.responsable_implementacion))
              OR LOWER(TRIM(COALESCE(p.dir_email, ''))) = LOWER(TRIM(pm.responsable_implementacion))
            )
          LIMIT 1
        `, [context.planId]);
        
        if (res.length > 0) ids.push(res[0].id_user);
      }
      return ids;
    }

    // Para todos los demás roles (Jefe OCI, Administrador Sistema, etc.),
    // consultar directamente la tabla de usuarios con ese rol general.
    try {
      const users = await this.dataSource.query(
        `SELECT DISTINCT u.id_user 
         FROM auth."user" u
         INNER JOIN auth.user_roles ur ON ur.id_user = u.id_user
         INNER JOIN auth.role r ON r.id = ur.id_rol
         WHERE u.is_active = true 
         AND (r.id::text = $1 OR UPPER(r.code) = UPPER($1) OR UPPER(r.name) = UPPER($1))`,
        [rolId]
      );
      users.forEach((u: any) => ids.push(u.id_user));
    } catch (e) {
      console.error('[NotificacionesService.resolverUsuariosPorRol] Error consultando usuarios por rol:', e);
    }

    return ids;
  }

  /**
   * PostgreSQL CHECK en control_interno.notificacion solo permite tipos snake_case
   * (aprobacion_plan, hallazgo_identificado, …), no códigos EVT-*.
   */
  private mapTipoNotificacionParaBd(
    tipo: string,
    metadata?: Record<string, unknown>,
  ): TipoNotificacion {
    const accion = metadata?.accionAuditado as string | undefined;
    if (accion === 'controversia') return TipoNotificacion.CONTROVERSIA_HALLAZGO;
    if (accion === 'aceptado') return TipoNotificacion.RECEPCION_DOCUMENTO;

    const map: Record<string, TipoNotificacion> = {
      'EVT-AUD-001': TipoNotificacion.ANUNCIO_AUDITORIA,
      'EVT-AUD-002': TipoNotificacion.RECORDATORIO_PLAZO,
      'EVT-AUD-003': TipoNotificacion.RECORDATORIO_PLAZO,
      'EVT-AUD-004': TipoNotificacion.OTRO,
      'EVT-AUD-DEADLINE': TipoNotificacion.ALERTA_VENCIMIENTO,
      'EVT-AUD-CREATED': TipoNotificacion.ANUNCIO_AUDITORIA,
      'EVT-AUD-EDITED': TipoNotificacion.OTRO,
      'EVT-KANBAN-001': TipoNotificacion.OTRO,
      'EVT-KANBAN-002': TipoNotificacion.ALERTA_VENCIMIENTO,
      'EVT-KANBAN-003': TipoNotificacion.ALERTA_VENCIMIENTO,
      'EVT-KANBAN-004': TipoNotificacion.OTRO,
      'EVT-KANBAN-MOV': TipoNotificacion.OTRO,
      'EVT-PM-001': TipoNotificacion.APROBACION_PLAN,
      'EVT-PM-002': TipoNotificacion.RECHAZO_PLAN,
      'EVT-PM-003': TipoNotificacion.ALERTA_VENCIMIENTO,
      'EVT-APR-001': TipoNotificacion.APROBACION_PLAN,
      'EVT-APR-002': TipoNotificacion.RECHAZO_PLAN,
      'EVT-APR-REQUESTED': TipoNotificacion.APROBACION_PLAN,
    };
    const t = String(tipo || '').trim();
    if (map[t]) return map[t];

    const permitidos = new Set<string>([
      TipoNotificacion.ANUNCIO_AUDITORIA,
      TipoNotificacion.RECORDATORIO_PLAZO,
      TipoNotificacion.ALERTA_VENCIMIENTO,
      TipoNotificacion.HALLAZGO_IDENTIFICADO,
      TipoNotificacion.SOLICITUD_EVIDENCIA,
      TipoNotificacion.RECEPCION_DOCUMENTO,
      TipoNotificacion.APROBACION_PLAN,
      TipoNotificacion.RECHAZO_PLAN,
      TipoNotificacion.CONTROVERSIA_HALLAZGO,
      TipoNotificacion.VALIDACION_EVIDENCIA,
      TipoNotificacion.SOLICITUD_AMPLIACION_PLAZO,
      TipoNotificacion.AMPLIACION_PLAZO_APROBADA,
      TipoNotificacion.AMPLIACION_PLAZO_RECHAZADA,
      TipoNotificacion.OTRO,
    ]);
    if (permitidos.has(t)) return t as TipoNotificacion;
    return TipoNotificacion.OTRO;
  }

  /**
   * Crea una nueva notificación
   */
  async create(createDto: CreateNotificacionDto): Promise<Notificacion> {
    const tipoOriginal = String(createDto.tipoNotificacion || '');
    const tipoBd = this.mapTipoNotificacionParaBd(tipoOriginal, createDto.metadata);
    const metadataConEvento = {
      ...(createDto.metadata || {}),
      eventoCode: (createDto.metadata as any)?.eventoCode || tipoOriginal,
    };

    // ✅ NORMALIZACIÓN AGRESIVA: Limpiar caracteres corruptos
    const tituloNormalizado = this.normalizarTexto(createDto.titulo);
    const mensajeNormalizado = this.normalizarTexto(createDto.mensaje);
    
    const usuarioIdFinal = createDto.usuarioId;

    // ✅ SINCRONIZACIÓN TOTAL: Obtener configuración con fallback a valores reales del sistema
    let canalFinal = createDto.canal || CanalNotificacion.SISTEMA;
    try {
      const configGlobal = await this.preferenciaRepository.findOne({ where: { usuarioId: 'GLOBAL_CONFIG' } });
      
      const mapping: Record<string, string> = {
        'anuncio_auditoria': 'EVT-AUD-001',
        'reunion_apertura': 'EVT-AUD-002',
        'recordatorio_plazo': 'EVT-AUD-003',
        'hallazgo_identificado': 'EVT-AUD-003',
        'aprobacion_plan': 'EVT-APR-001',
        'rechazo_plan': 'EVT-APR-002',
        'controversia_hallazgo': 'EVT-AUD-001',
        'seguimiento_trimestral': 'EVT-PM-001',
      };
      
      const evtCode = mapping[tipoOriginal] || tipoOriginal;
      
      const configEvento = configGlobal?.tiposNotificacion ? configGlobal.tiposNotificacion[evtCode] : null;
      
      if (configEvento) {
        const c = configEvento as any;
        if (c.sistema && c.email) canalFinal = CanalNotificacion.AMBOS;
        else if (c.email) canalFinal = CanalNotificacion.EMAIL;
        else canalFinal = CanalNotificacion.SISTEMA;
      }
    } catch (e) {
      console.warn(`[NotificacionesService.create] Error en sincronización, usando canal por defecto:`, e.message);
    }

    const notificacion = this.notificacionRepository.create({
      ...createDto,
      tipoNotificacion: tipoBd,
      metadata: metadataConEvento,
      titulo: tituloNormalizado,
      mensaje: mensajeNormalizado,
      usuarioId: usuarioIdFinal,
      estado: EstadoNotificacion.PENDIENTE,
      canal: canalFinal,
      prioridad: createDto.prioridad || PrioridadNotificacion.NORMAL,
      leida: false,
      enviadaEmail: false,
    });

    console.log(
      `[NotificacionesService.create] Creando notificación para usuarioId: ${usuarioIdFinal}, ` +
        `tipo: ${tipoBd} (evento: ${tipoOriginal}), canal: ${canalFinal}`,
    );

    // ✅ BUG 1 FIX: Evitar duplicados idénticos en un corto periodo de tiempo (5 segundos)
    const hacePoco = new Date();
    hacePoco.setSeconds(hacePoco.getSeconds() - 5);

    const duplicada = await this.notificacionRepository.findOne({
      where: {
        usuarioId: usuarioIdFinal,
        tipoNotificacion: tipoBd,
        titulo: tituloNormalizado,
        createdAt: MoreThanOrEqual(hacePoco)
      }
    });

    if (duplicada) {
      console.warn(`[NotificacionesService.create] ⚠️ Notificación duplicada detectada (omitida): ${tituloNormalizado}`);
      return duplicada;
    }

    const saved = await this.notificacionRepository.save(notificacion);

    // 🚀 INTEGRACIÓN CON LA CAMPANITA GLOBAL DEL SHELL 🚀
    // Escribir directamente en la tabla notifications.notificacion para que la UI la vea
    try {
      await this.dataSource.query(
        `INSERT INTO notifications.notificacion 
         (id_usuario_destinatario, tipo_notificacion, titulo, mensaje, prioridad, tiene_accion, url_accion, color) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          usuarioIdFinal,
          tipoBd,
          tituloNormalizado,
          mensajeNormalizado,
          'Media',
          createDto.accionUrl ? true : false,
          createDto.accionUrl || null,
          'blue'
        ]
      );
      console.log(`[Notificaciones] ✅ Sincronizado campanita (${tipoBd}) usuario ${usuarioIdFinal}`);
    } catch (err) {
      console.error(`[Notificaciones] ❌ Error sincronizando con la campanita global:`, err.message);
    }

    console.log(`[NotificacionesService.create] ✅ Notificación creada exitosamente: ID=${saved.id}, usuarioId=${usuarioIdFinal}, estado=${saved.estado}`);

    // Enviar notificación según preferencias del usuario
    await this.enviarNotificacion(saved);

    return saved;
  }

  /**
   * Envía la notificación según las preferencias del usuario.
   * Respeta tanto el canal global como la configuración por tipo de notificación.
   */
  private async enviarNotificacion(notificacion: Notificacion): Promise<void> {
    const preferencias = await this.preferenciaRepository.findOne({
      where: { usuarioId: notificacion.usuarioId },
    });

    // Si no hay preferencias, usar defaults (todo activo)
    const recibirEmail = preferencias?.recibirEmail ?? true;
    const recibirSistema = preferencias?.recibirSistema ?? true;

    // Verificar si el tipo de notificación está activo en preferencias
    if (preferencias?.tiposNotificacion) {
      // Buscar por el ID del evento (puede ser el tipoNotificacion o una clave del mapa)
      const tipoConfig = preferencias.tiposNotificacion[notificacion.tipoNotificacion];
      if (tipoConfig && !tipoConfig.activo) {
        // Tipo desactivado, archivar sin enviar
        notificacion.estado = EstadoNotificacion.ARCHIVADA;
        await this.notificacionRepository.save(notificacion);
        console.log(`[NotificacionesService.enviarNotificacion] Notificación ${notificacion.id} archivada por preferencia de tipo desactivado`);
        return;
      }

      // ✅ Lógica de Canal Directa: Si el canal es EMAIL o AMBOS, intentar enviar correo
      const enviarPorEmail = (notificacion.canal === CanalNotificacion.EMAIL || notificacion.canal === CanalNotificacion.AMBOS) && recibirEmail;
      const enviarPorSistema = (notificacion.canal === CanalNotificacion.SISTEMA || notificacion.canal === CanalNotificacion.AMBOS) && recibirSistema;

      notificacion.estado = EstadoNotificacion.ENVIADA;
      
      if (enviarPorEmail) {
        try {
          const emailDestino = await this.obtenerEmailUsuario(notificacion.usuarioId);
          if (emailDestino) {
            await this.enviarCorreoReal(notificacion, emailDestino);
            notificacion.enviadaEmail = true;
            notificacion.fechaEnvioEmail = new Date();
            console.log(`[Notificaciones] ✉️ Email enviado según canal para ${notificacion.usuarioId}`);
          }
        } catch (err) {
          console.error(`[Notificaciones] Error enviando correo por canal:`, err.message);
        }
      }

      if (!enviarPorEmail && !enviarPorSistema) {
        notificacion.estado = EstadoNotificacion.ARCHIVADA;
      }

      await this.notificacionRepository.save(notificacion);
      return;
    }

    // ✅ LÓGICA UNIFICADA: Si el canal es EMAIL o AMBOS, intentar enviar
    const enviarPorEmail = (notificacion.canal === CanalNotificacion.EMAIL || notificacion.canal === CanalNotificacion.AMBOS) && recibirEmail;
    
    console.log(`[Notificaciones] 💡 Evaluando envío para ${notificacion.usuarioId}: Canal=${notificacion.canal}, EnviarEmail=${enviarPorEmail}`);

    if (enviarPorEmail) {
      try {
        const emailDestino = await this.obtenerEmailUsuario(notificacion.usuarioId);
        if (emailDestino) {
          try {
            await this.enviarCorreoReal(notificacion, emailDestino);
            notificacion.enviadaEmail = true;
            notificacion.fechaEnvioEmail = new Date();
            notificacion.estado = EstadoNotificacion.ENVIADA;
          } catch (emailError) {
            console.error(`[Notificaciones] ❌ Error aislado al solicitar correo para ${emailDestino}. La notificación de sistema seguirá activa. Detalles:`, emailError.message);
          }
        } else {
          console.warn(`[Notificaciones] ⚠️ Abortando email: Usuario ${notificacion.usuarioId} no tiene correo registrado.`);
        }
      } catch (err) {
        console.error(`[Notificaciones] ❌ Error general en el proceso de despacho de email:`, err.message);
      }
    }

    // Si el sistema está desactivado y el canal requiere solo sistema, archivar
    if (!recibirSistema && notificacion.canal === CanalNotificacion.SISTEMA) {
      notificacion.estado = EstadoNotificacion.ARCHIVADA;
    } else {
      notificacion.estado = EstadoNotificacion.ENVIADA;
    }

    await this.notificacionRepository.save(notificacion);
  }

  /**
   * Obtiene el correo electrónico de un usuario desde auth.personas
   */
  private async obtenerEmailUsuario(usuarioId: string): Promise<string | null> {
    console.log(`[Notificaciones] 🔎 Buscando email para el ID: ${usuarioId}`);
    try {
      // Intento 1: Buscar por id_user o id_tercero en la unión de personas y usuarios
      const result = await this.dataSource.query(`
        SELECT p.dir_email as email
        FROM auth.personas p
        LEFT JOIN auth."user" u ON u.id_person = p.id_person
        WHERE u.id_user = $1::uuid OR p.id_person = $1::uuid
      `, [usuarioId]);

      if (result[0]?.email) {
        console.log(`[Notificaciones] ✅ Email encontrado en personas: ${result[0].email}`);
        return result[0].email;
      }

      // Intento 2: Buscar directamente en la tabla de usuarios (por si el correo está allí)
      const resultUser = await this.dataSource.query(`
        SELECT email FROM auth."user" WHERE id_user = $1
      `, [usuarioId]);

      if (resultUser[0]?.email) {
        console.log(`[Notificaciones] ✅ Email encontrado en tabla user: ${resultUser[0].email}`);
        return resultUser[0].email;
      }

      console.warn(`[Notificaciones] ⚠️ No se encontró ningún email para el ID: ${usuarioId}`);
      return null;
    } catch (error) {
      console.error(`[Notificaciones] ❌ Error en obtenerEmailUsuario:`, error.message);
      return null;
    }
  }

  private resolveNotificationsBaseUrl(): string {
    const configuredUrl =
      this.configService.get<string>('NOTIFICATIONS_SERVICE_URL') ||
      this.configService.get<string>('NOTIFICATION_SERVICE_URL');

    if (configuredUrl) {
      return configuredUrl.replace(/\/$/, '');
    }

    if (this.configService.get<string>('NODE_ENV', 'development') !== 'production') {
      return 'http://localhost:3009';
    }

    return 'http://notifications-service:3009';
  }

  /**
   * Solicita el envío de correo al microservicio central de notificaciones.
   */
  private async enviarCorreoReal(notificacion: Notificacion, emailDestino: string): Promise<void> {
    const notificationsBaseUrl = this.resolveNotificationsBaseUrl();

    console.log(`[Notificaciones] 🚀 Solicitando envío de email a ${emailDestino} mediante ${notificationsBaseUrl}: ${notificacion.titulo}`);
    
    try {
      const appUrl = this.configService.get<string>('APP_URL', 'http://localhost:3000');
      
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #003DA5; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 20px;">Control Interno de Gestión</h1>
          </div>
          <div style="padding: 30px; color: #374151;">
            <h2 style="color: #003DA5; margin-top: 0;">${notificacion.titulo}</h2>
            <p style="font-size: 16px; line-height: 1.5;">${notificacion.mensaje}</p>
            ${notificacion.accionUrl ? `
              <div style="margin-top: 30px; text-align: center;">
                <a href="${appUrl}${notificacion.accionUrl}" 
                   style="background-color: #F97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                  Ver en la Plataforma
                </a>
              </div>
            ` : ''}
          </div>
          <div style="background-color: #f9fafb; padding: 20px; text-align: center; color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb;">
            Este es un correo automático, por favor no respondas a este mensaje.
            <br>ESAP - Escuela Superior de Administración Pública
          </div>
        </div>
      `;

      const response = await fetch(`${notificationsBaseUrl}/api/v1/emails/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: emailDestino,
          subject: notificacion.titulo,
          text: notificacion.mensaje,
          html,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        throw new Error(`notifications-service ${response.status}: ${errorBody || 'sin detalle'}`);
      }

      console.log(`[Notificaciones] ✅ Solicitud de correo aceptada para ${emailDestino}`);
    } catch (error) {
      const errorMessage = error.cause?.message || error.message;
      console.error(`[Notificaciones] ❌ Error enviando email mediante ${notificationsBaseUrl} a ${emailDestino}:`, errorMessage);
      throw error;
    }
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
   * Obtiene las preferencias de notificación de un usuario.
   * Normaliza el usuarioId a id_tercero para consistencia con el sistema de notificaciones.
   */
  async getPreferencias(usuarioId: string): Promise<PreferenciaNotificacion> {
    // Normalizar a id_tercero para consistencia
    let idNormalizado: string;
    try {
      const idTercero = await this.getUserIdTerceroFromUUID(usuarioId);
      idNormalizado = String(idTercero);
    } catch {
      idNormalizado = usuarioId; // fallback: usar tal cual
    }

    let preferencias = await this.preferenciaRepository.findOne({
      where: { usuarioId: idNormalizado },
    });

    // Intentar con el id original si no se encontró con el normalizado
    if (!preferencias && idNormalizado !== usuarioId) {
      preferencias = await this.preferenciaRepository.findOne({
        where: { usuarioId },
      });
    }

    if (!preferencias) {
      // Crear preferencias por defecto
      preferencias = this.preferenciaRepository.create({
        usuarioId: idNormalizado,
        recibirEmail: true,
        recibirSistema: true,
        diasAnticipacion: 7,
      });
      preferencias = await this.preferenciaRepository.save(preferencias);
    }

    return preferencias;
  }

  /**
   * Actualiza las preferencias de notificación de un usuario.
   * Normaliza el usuarioId a id_tercero para consistencia.
   */
  async updatePreferencias(
    usuarioId: string,
    preferencias: Partial<PreferenciaNotificacion>,
  ): Promise<PreferenciaNotificacion> {
    // Normalizar a id_tercero para consistencia
    let idNormalizado: string;
    try {
      const idTercero = await this.getUserIdTerceroFromUUID(usuarioId);
      idNormalizado = String(idTercero);
    } catch {
      idNormalizado = usuarioId;
    }

    let pref = await this.preferenciaRepository.findOne({
      where: { usuarioId: idNormalizado },
    });

    // Intentar con id original si no se encontró
    if (!pref && idNormalizado !== usuarioId) {
      pref = await this.preferenciaRepository.findOne({
        where: { usuarioId },
      });
    }

    if (!pref) {
      pref = this.preferenciaRepository.create({
        usuarioId: idNormalizado,
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
    await this.dispararEvento('EVT-APR-REQUESTED', {
      auditoriaId,
      tituloCustom: `Nueva solicitud de ampliación - ${auditoriaCodigo}`,
      mensajeCustom: `${solicitanteNombre} solicitó ampliación. Justificación: ${justificacion.substring(0, 200)}`,
      metadata: { auditoriaId, auditoriaCodigo }
    });
  }

  /**
   * Notifica cuando se aprueba una ampliación de plazo
   */
  async notificarAmpliacionAprobada(
    auditoriaId: string,
    auditoriaCodigo: string,
    auditoriaNombre: string,
    auditorLiderId: string,
    nuevaFechaFin: string,
    comentarios?: string,
  ): Promise<void> {
    if (auditorLiderId) {
      await this.dispararEvento('EVT-APR-001', {
        auditoriaId,
        usuarioId: auditorLiderId, // Forzar que le llegue explícitamente a él
        tituloCustom: `✅ Ampliación de plazo aprobada - ${auditoriaCodigo}`,
        mensajeCustom: `Su solicitud de ampliación de plazo para la auditoría "${auditoriaNombre}" ha sido aprobada.\n\nNueva fecha de finalización: ${nuevaFechaFin}${comentarios ? `\n\nComentarios: ${comentarios}` : ''}`,
        metadata: { auditoriaId, auditoriaCodigo, accion: 'aprobacion_ampliacion' }
      });
    }
  }

  /**
   * Notifica cuando se rechaza una ampliación de plazo
   */
  async notificarAmpliacionRechazada(
    auditoriaId: string,
    auditoriaCodigo: string,
    auditoriaNombre: string,
    auditorLiderId: string,
    motivo: string,
  ): Promise<void> {
    if (auditorLiderId) {
      await this.dispararEvento('EVT-APR-002', {
        auditoriaId,
        usuarioId: auditorLiderId, // Forzar destinatario explícito
        tituloCustom: `❌ Ampliación de plazo rechazada - ${auditoriaCodigo}`,
        mensajeCustom: `Su solicitud de ampliación de plazo para la auditoría "${auditoriaNombre}" ha sido rechazada.\n\nMotivo: ${motivo}`,
        metadata: { auditoriaId, auditoriaCodigo, accion: 'rechazo_ampliacion' }
      });
    }
  }

  /**
   * Obtiene los IDs de usuarios con rol JEFE_CONTROL_INTERNO
   */
  private async obtenerJefesControlInterno(): Promise<string[]> {
    try {
      const result = await this.dataSource.query(`
        SELECT DISTINCT u.id_user
        FROM auth."user" u
        INNER JOIN auth.user_roles ur ON ur.id_user = u.id_user
        INNER JOIN auth.role r ON r.id = ur.id_rol
        WHERE u.is_active = true
        AND r.code = 'JEFE_OCI'  -- Solo el rol exacto, sin wildcards
      `);
      return result.map((row: any) => String(row.id_user)).filter(Boolean);
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
  }): Promise<any[]> {
    console.log(`[NotificacionesService.findAll] Obteniendo historial global`);
    
    // Usar TypeORM para asegurar que los datos carguen
    const notificaciones = await this.notificacionRepository.find({
      order: { createdAt: 'DESC' },
      take: 200
    });

    // Mapear nombres para que el historial sea legible
    const resultados: any[] = [];
    for (const n of notificaciones) {
      let nombreReal = n.usuarioId;
      try {
        const p = await this.dataSource.query(`
          SELECT nom_largo FROM auth.personas 
          WHERE id_person = $1 
          OR id_person IN (SELECT id_person FROM auth."user" WHERE id_user = $1)
          LIMIT 1
        `, [n.usuarioId]);
        
        if (p && p.length > 0 && p[0].nom_largo) {
          nombreReal = p[0].nom_largo;
        }
      } catch (e) {}

      resultados.push({
        ...n,
        usuarioId: nombreReal,     // Forzamos nombre aquí
        destinatario: nombreReal,  // Y aquí
        fechaEnvio: n.createdAt
      });
    }
    
    return resultados;
  }

  /**
   * Método de debug para verificar conversión de usuarioId y notificaciones
   */
  async debugUsuario(usuarioId: string): Promise<any> {
    console.log(`[NotificacionesService.debugUsuario] Debug para usuarioId: ${usuarioId}`);
    
    let idTercero: string | null = null;
    let errorConversion: string | null = null;
    
    try {
      idTercero = await this.getUserIdTerceroFromUUID(usuarioId);
      console.log(`[NotificacionesService.debugUsuario] Conversión exitosa: ${usuarioId} -> ${idTercero}`);
    } catch (error) {
      errorConversion = error.message;
      console.error(`[NotificacionesService.debugUsuario] Error en conversión:`, error);
      if (/^\d+$/.test(usuarioId)) {
        idTercero = String(usuarioId);
        console.log(`[NotificacionesService.debugUsuario] Usando directamente como texto: ${idTercero}`);
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

    // Buscar todas las notificaciones para este usuarioId (sin filtros)
    const todasNotificaciones = await this.notificacionRepository.find({
      where: { usuarioId: usuarioId },
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

  /**
   * Resuelve auth.user.id_user a partir del correo del responsable del área auditada.
   */
  async resolverIdUserPorEmail(email: string): Promise<string | null> {
    const correo = String(email || '').trim();
    if (!correo) return null;
    try {
      const userResult = await this.dataSource.query(
        `SELECT u.id_user
         FROM auth."user" u
         LEFT JOIN auth.personas p ON p.id_person = u.id_person
         WHERE (
           LOWER(TRIM(COALESCE(p.dir_email, ''))) = LOWER(TRIM($1))
           OR LOWER(TRIM(u.username)) = LOWER(TRIM($1))
         )
         AND u.is_active = true
         LIMIT 1`,
        [correo],
      );
      return userResult?.[0]?.id_user ? String(userResult[0].id_user) : null;
    } catch (err) {
      console.error('[Notificaciones] Error resolviendo usuario por email:', err.message);
      return null;
    }
  }

  /**
   * Deep link para el Portal Transaccional (servicio Control Interno de Gestión).
   */
  urlPortalControlInterno(auditoriaId?: string): string {
    return auditoriaId ? `control-interno-gestion::${auditoriaId}` : 'control-interno-gestion';
  }

  /**
   * Notifica al responsable del área auditada (portal transaccional + campanita global).
   */
  async notificarAuditadoPortal(params: {
    responsableAreaEmail: string;
    responsableAreaNombre?: string;
    auditoriaId: string;
    auditoriaCodigo: string;
    auditoriaNombre?: string;
    tipoNotificacion: TipoNotificacion | string;
    titulo: string;
    mensaje: string;
    prioridad?: PrioridadNotificacion;
    metadata?: Record<string, unknown>;
  }): Promise<boolean> {
    const userId = await this.resolverIdUserPorEmail(params.responsableAreaEmail);
    if (!userId) {
      console.warn(
        `[Notificaciones] Sin usuario activo para auditado (${params.responsableAreaEmail}). ` +
          `Auditoría ${params.auditoriaCodigo}.`,
      );
      return false;
    }
    try {
      await this.create({
        usuarioId: userId,
        tipoNotificacion: params.tipoNotificacion as TipoNotificacion,
        titulo: params.titulo,
        mensaje: params.mensaje,
        prioridad: params.prioridad ?? PrioridadNotificacion.ALTA,
        canal: CanalNotificacion.AMBOS,
        metadata: {
          ...params.metadata,
          auditoriaId: params.auditoriaId,
          codigoAuditoria: params.auditoriaCodigo,
          esNotificacionAuditado: true,
        },
        accionUrl: this.urlPortalControlInterno(params.auditoriaId),
      });
      return true;
    } catch (err) {
      console.error(
        `[Notificaciones] Error notificando auditado (${params.auditoriaCodigo}):`,
        err.message,
      );
      return false;
    }
  }
}
