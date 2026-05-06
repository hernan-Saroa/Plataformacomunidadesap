import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual, DataSource } from 'typeorm';
import { Notificacion, EstadoNotificacion, TipoNotificacion, CanalNotificacion, PrioridadNotificacion } from './entities/notificacion.entity';
import { PreferenciaNotificacion } from './entities/preferencia-notificacion.entity';
import { CreateNotificacionDto } from './dto/create-notificacion.dto';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class NotificacionesService {
  private transporter: nodemailer.Transporter;

  constructor(
    @InjectRepository(Notificacion)
    private readonly notificacionRepository: Repository<Notificacion>,
    @InjectRepository(PreferenciaNotificacion)
    private readonly preferenciaRepository: Repository<PreferenciaNotificacion>,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {
    // Configurar transportador de correo
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPass = this.configService.get<string>('SMTP_PASS');

    const transportConfig: any = {
      host: this.configService.get<string>('SMTP_HOST', 'smtp.gmail.com'),
      port: this.configService.get<number>('SMTP_PORT', 587),
      secure: this.configService.get<boolean>('SMTP_SECURE', false),
    };

    // Solo añadir autenticación si hay usuario y clave definidos
    if (smtpUser && smtpPass) {
      transportConfig.auth = {
        user: smtpUser,
        pass: smtpPass,
      };
    }

    this.transporter = nodemailer.createTransport(transportConfig);
  }

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
    
    // Mapeo manual de correcciones comunes para "Control Interno"
    let limpio = texto
      .replace(/auditora/g, 'auditoría')
      .replace(/Auditora/g, 'Auditoría')
      .replace(/programacin/g, 'programación')
      .replace(/notificacin/g, 'notificación');

    // Intentar reparar encoding UTF-8 roto
    try {
      if (/[\xC2-\xDF][\x80-\xBF]/.test(limpio) || /Ã|â|€|/.test(limpio)) {
        const bytes = Uint8Array.from(limpio.split('').map(c => c.charCodeAt(0)));
        limpio = new TextDecoder('utf-8').decode(bytes);
      }
    } catch (e) {}

    try {
      return decodeURIComponent(escape(limpio));
    } catch (e) {
      return limpio.replace(/[^\x20-\x7E\xA0-\xFF\u0100-\uFFFF]/g, '');
    }
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
   * Crea una nueva notificación
   */
  async create(createDto: CreateNotificacionDto): Promise<Notificacion> {
    // ✅ NORMALIZACIÓN AGRESIVA: Limpiar caracteres corruptos
    // Si viene "auditora" o similar por mal encoding, intentamos forzar UTF-8
    const tituloNormalizado = this.normalizarTexto(createDto.titulo);
    const mensajeNormalizado = this.normalizarTexto(createDto.mensaje);
    
    const usuarioIdFinal = createDto.usuarioId;

    // ✅ SINCRONIZACIÓN TOTAL: Obtener configuración con fallback a valores reales del sistema
    let canalFinal = createDto.canal || CanalNotificacion.SISTEMA;
    try {
      const configGlobal = await this.preferenciaRepository.findOne({ where: { usuarioId: 'GLOBAL_CONFIG' } });
      
      // Definición de valores por defecto que coinciden con el Frontend
      const defaults: Record<string, any> = {
        'EVT-AUD-001': { email: true, sistema: true, activo: true }, // Nueva auditoría
        'EVT-AUD-002': { email: true, sistema: true, activo: true }, // Reunión apertura
        'EVT-AUD-003': { email: true, sistema: true, activo: true }, // Plazo respuesta
        'EVT-PM-001': { email: true, sistema: true, activo: true },  // Seguimiento PM
        'EVT-KANBAN-001': { email: true, sistema: true, activo: true }
      };

      const mapping: Record<string, string> = {
        'anuncio_auditoria': 'EVT-AUD-001',
        'reunion_apertura': 'EVT-AUD-002',
        'recordatorio_plazo': 'EVT-AUD-003',
        'seguimiento_trimestral': 'EVT-PM-001',
        // Mapeo directo para cuando se envía el código directamente
        'EVT-AUD-001': 'EVT-AUD-001',
        'EVT-AUD-002': 'EVT-AUD-002',
        'EVT-AUD-003': 'EVT-AUD-003',
        'EVT-KANBAN-001': 'EVT-KANBAN-001',
        'EVT-KANBAN-002': 'EVT-KANBAN-002',
        'EVT-KANBAN-003': 'EVT-KANBAN-003',
        'EVT-PM-001': 'EVT-PM-001',
        'EVT-APR-001': 'EVT-APR-001',
        'EVT-APR-002': 'EVT-APR-002',
      };
      
      const evtCode = mapping[createDto.tipoNotificacion] || createDto.tipoNotificacion;
      // Si no hay config en DB, usar el default. Si hay config, usar la de DB.
      const configEvento = (configGlobal?.tiposNotificacion && configGlobal.tiposNotificacion[evtCode]) 
        ? configGlobal.tiposNotificacion[evtCode] 
        : defaults[evtCode];
      
      if (configEvento && configEvento.activo) {
        if (configEvento.email && configEvento.sistema) canalFinal = CanalNotificacion.AMBOS;
        else if (configEvento.email) canalFinal = CanalNotificacion.EMAIL;
        else if (configEvento.sistema) canalFinal = CanalNotificacion.SISTEMA;
        
        // ✅ NUEVA LÓGICA: Si la configuración define roles (destinatarios), 
        // podríamos expandir esto aquí, pero por ahora aseguramos que el 
        // canal sea el correcto.
      }
    } catch (e) {
      console.warn(`[NotificacionesService.create] Error en sincronización, usando canal por defecto:`, e.message);
    }

    const notificacion = this.notificacionRepository.create({
      ...createDto,
      titulo: tituloNormalizado,
      mensaje: mensajeNormalizado,
      usuarioId: usuarioIdFinal,
      estado: EstadoNotificacion.PENDIENTE,
      canal: canalFinal,
      prioridad: createDto.prioridad || PrioridadNotificacion.NORMAL,
      leida: false,
      enviadaEmail: false,
    });

    console.log(`[NotificacionesService.create] Creando notificación para usuarioId: ${usuarioIdFinal}, tipo: ${createDto.tipoNotificacion}, titulo: ${tituloNormalizado}`);

    // ✅ BUG 1 FIX: Evitar duplicados idénticos en un corto periodo de tiempo (5 segundos)
    const hacePoco = new Date();
    hacePoco.setSeconds(hacePoco.getSeconds() - 5);

    const duplicada = await this.notificacionRepository.findOne({
      where: {
        usuarioId: usuarioIdFinal,
        tipoNotificacion: createDto.tipoNotificacion,
        titulo: tituloNormalizado,
        createdAt: MoreThanOrEqual(hacePoco)
      }
    });

    if (duplicada) {
      console.warn(`[NotificacionesService.create] ⚠️ Notificación duplicada detectada (omitida): ${tituloNormalizado}`);
      return duplicada;
    }

    const saved = await this.notificacionRepository.save(notificacion);

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
          await this.enviarCorreoReal(notificacion, emailDestino);
          notificacion.enviadaEmail = true;
          notificacion.fechaEnvioEmail = new Date();
          notificacion.estado = EstadoNotificacion.ENVIADA;
        } else {
          console.warn(`[Notificaciones] ⚠️ Abortando email: Usuario ${notificacion.usuarioId} no tiene correo registrado.`);
        }
      } catch (err) {
        console.error(`[Notificaciones] ❌ Error en el proceso de despacho de email:`, err.message);
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

  /**
   * Envía el correo real usando nodemailer
   */
  private async enviarCorreoReal(notificacion: Notificacion, emailDestino: string): Promise<void> {
    console.log(`[Notificaciones] 🚀 Intentando enviar email a: ${emailDestino} para la notificación: ${notificacion.titulo}`);
    
    try {
      const from = this.configService.get<string>('SMTP_FROM', '"Plataforma ESAP" <noreply@esap.edu.co>');
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

      await this.transporter.sendMail({
        from,
        to: emailDestino,
        subject: notificacion.titulo,
        html,
      });

      console.log(`[Notificaciones] ✅ ¡ÉXITO! Correo entregado a ${emailDestino}`);
    } catch (error) {
      console.error(`[Notificaciones] ❌ ERROR CRÍTICO SMTP al enviar a ${emailDestino}:`, error.message);
      // Opcionalmente podrías relanzar el error o manejarlo según política
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
    auditorLiderId: string,
    nuevaFechaFin: string,
    comentarios?: string,
  ): Promise<void> {
    // Notificar al auditor líder (auditorLiderId es UUID)
    if (auditorLiderId) {
      await this.create({
        usuarioId: auditorLiderId,
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
    auditorLiderId: string,
    motivo: string,
  ): Promise<void> {
    // Notificar al auditor líder (auditorLiderId es UUID)
    if (auditorLiderId) {
      await this.create({
        usuarioId: auditorLiderId,
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
      // Buscar por múltiples variantes del código de rol para mayor compatibilidad
      const result = await this.dataSource.query(`
        SELECT DISTINCT u.id_user
        FROM auth."user" u
        INNER JOIN auth.user_roles ur ON ur.id_user = u.id_user
        INNER JOIN auth.role r ON r.id = ur.id_rol
        WHERE UPPER(r.code) IN (
          'JEFE_CONTROL_INTERNO',
          'JEFE_OCI',
          'JEFE_OCIG',
          'CONTROL_INTERNO_JEFE',
          'OCI_JEFE'
        )
          AND (ur.is_active = true OR ur.is_active IS NULL)
          AND u.is_active = true
      `);

      const uuids = result.map((row: any) => String(row.id_user)).filter(Boolean);
      console.log(`[NotificacionesService.obtenerJefesControlInterno] Encontrados ${uuids.length} jefes OCI`);
      return uuids;
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
}


