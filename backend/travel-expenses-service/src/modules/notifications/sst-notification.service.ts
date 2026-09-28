import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { SolicitudComisionEntity } from '../../entities/solicitud-comision.entity';
import { SolicitudHistorialEstadoEntity } from '../../entities/solicitud-historial-estado.entity';
import { NotificationClientService } from '../../common/notification-client.service';

/**
 * Evento disparado cuando una comisión avanza a etapa de compromiso o desembolso financiero.
 */
export interface CommissionDisbursementReadyEvent {
  solicitudId: string;
  estadoNuevo?: string;
  usuarioId?: string;
}

/**
 * Payload estructurado con los datos del comisionado y del desplazamiento.
 */
export interface PayloadNotificadoSst {
  nombre_completo_comisionado: string;
  documento_identidad: string;
  ciudad_destino: string;
  fecha_inicio_viaje: string;
  fecha_fin_viaje: string;
  objeto_comision: string;
  consecutivo_comision: string;
  estado_actual?: string;
  monto_viaticos?: number;
}

/**
 * Resultado formal del despacho de notificación a SST.
 */
export interface ResultadoNotificacionSst {
  success: boolean;
  solicitudId: string;
  consecutivo: string;
  destinatariosEmails: string[];
  usuariosInAppNotificados: number;
  mensaje: string;
  payload: PayloadNotificadoSst;
  fechaEnvio: Date;
}

/**
 * Servicio encargado de la notificación formal y automática al área de
 * Seguridad y Salud en el Trabajo (SST) - Etapa 8 [RF-PAG-002].
 *
 * Características:
 * - 100% Asíncrono y desacoplado mediante eventos (@OnEvent).
 * - Notificación in-app a la bandeja de notificaciones (notifications.notificacion) de todos los usuarios con rol SST.
 * - Despacho de correo institucional a todos los usuarios con rol SST y al buzón configurado.
 * - Registro inmutable de la traza de auditoría en el expediente (solicitudes_historial_estados).
 * - No requiere una tabla local redundante de logs en travel-expenses.
 */
@Injectable()
export class SstNotificationService {
  private readonly logger = new Logger(SstNotificationService.name);

  constructor(
    @InjectRepository(SolicitudComisionEntity)
    private readonly solicitudRepo: Repository<SolicitudComisionEntity>,
    @InjectRepository(SolicitudHistorialEstadoEntity)
    private readonly historialRepo: Repository<SolicitudHistorialEstadoEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly notificationClient: NotificationClientService,
  ) {}

  /**
   * Listener reactivo al evento de desembolso / compromiso financiero.
   * Se ejecuta de manera 100% automática y asíncrona.
   */
  @OnEvent('commission.disbursement_ready')
  async handleDisbursementReady(event: CommissionDisbursementReadyEvent): Promise<void> {
    this.logger.log(
      `[RF-PAG-002] Evento 'commission.disbursement_ready' recibido para solicitud ${event.solicitudId} (Estado: ${event.estadoNuevo || 'N/A'}).`,
    );

    try {
      await this.notificarComisionSst(event.solicitudId, {
        forzar: false,
        usuarioId: event.usuarioId,
      });
    } catch (err: any) {
      this.logger.error(
        `[RF-PAG-002] Error procesando notificación automática a SST para solicitud ${event.solicitudId}: ${err?.message}`,
        err?.stack,
      );
    }
  }

  /**
   * Obtiene la dirección de correo institucional configurada para el área de SST.
   */
  async obtenerCorreoDestinoSst(): Promise<string> {
    try {
      const rows = await this.dataSource.query(
        `SELECT valor FROM travel_expenses.configuraciones_globales WHERE clave = $1 LIMIT 1`,
        ['CORREO_DESTINO_SST'],
      );
      if (rows && rows.length > 0 && rows[0].valor) {
        return rows[0].valor.trim();
      }
    } catch {
      // Fallback si la tabla aún no existe en el entorno
    }
    return process.env.SST_NOTIFICATION_EMAIL || 'sst@esap.edu.co';
  }

  /**
   * Construye el payload formal exigido por la HU RF-PAG-002 con los datos
   * del comisionado y del desplazamiento institucional.
   */
  construirPayloadSst(solicitud: SolicitudComisionEntity): PayloadNotificadoSst {
    const com = solicitud.comisionado;
    const nombreCompleto = com
      ? `${com.primerNombre || ''} ${com.segundoNombre || ''} ${com.primerApellido || ''} ${com.segundoApellido || ''}`
          .replace(/\s+/g, ' ')
          .trim()
      : 'Comisionado No Identificado';

    const docIdentidad = com?.numeroDocumento || 'Sin documento';
    const destino = solicitud.destinoDepartamento
      ? `${solicitud.destinoCiudad} (${solicitud.destinoDepartamento})`
      : solicitud.destinoCiudad;

    const fechaInicioStr =
      solicitud.fechaInicio instanceof Date
        ? solicitud.fechaInicio.toISOString().split('T')[0]
        : String(solicitud.fechaInicio);

    const fechaFinStr =
      solicitud.fechaFin instanceof Date
        ? solicitud.fechaFin.toISOString().split('T')[0]
        : String(solicitud.fechaFin);

    return {
      nombre_completo_comisionado: nombreCompleto,
      documento_identidad: docIdentidad,
      ciudad_destino: destino,
      fecha_inicio_viaje: fechaInicioStr,
      fecha_fin_viaje: fechaFinStr,
      objeto_comision: solicitud.objetoComision,
      consecutivo_comision: solicitud.consecutivoUnico || solicitud.id,
      estado_actual: solicitud.estadoSolicitud,
      monto_viaticos: Number(solicitud.montoViaticos || 0),
    };
  }

  /**
   * Despacha la notificación formal a SST:
   * 1. Envío in-app a la bandeja de notificaciones de todos los usuarios del rol SST.
   * 2. Envío de correos a todos los usuarios del rol SST y al buzón institucional configurado.
   * 3. Asiento de auditoría inmutable en el historial del expediente.
   * 4. Marcado de notificadoSst = true en solicitudes_comision.
   */
  async notificarComisionSst(
    solicitudId: string,
    opciones: { forzar?: boolean; usuarioId?: string } = {},
  ): Promise<ResultadoNotificacionSst> {
    const { forzar = false, usuarioId } = opciones;

    // 1. Cargar solicitud con relación de comisionado
    const solicitud = await this.solicitudRepo.findOne({
      where: { id: solicitudId },
      relations: ['comisionado'],
    });

    if (!solicitud) {
      throw new NotFoundException(
        `No se encontró la solicitud de comisión con id ${solicitudId}`,
      );
    }

    const payload = this.construirPayloadSst(solicitud);
    const consecutivo = solicitud.consecutivoUnico || solicitud.id;

    // 2. Control de idempotencia: Si ya fue notificada y no se fuerza, omitir
    if (solicitud.notificadoSst && !forzar) {
      this.logger.log(
        `[RF-PAG-002] Solicitud ${consecutivo} ya fue notificada a SST previamente. Despacho automático omitido para evitar duplicidad.`,
      );
      return {
        success: true,
        solicitudId: solicitud.id,
        consecutivo,
        destinatariosEmails: [],
        usuariosInAppNotificados: 0,
        mensaje: 'Notificación ya despachada previamente a SST.',
        payload,
        fechaEnvio: new Date(),
      };
    }

    // 3. Notificación in-app a la bandeja central de notificaciones para los usuarios del rol SST
    let usuariosInAppCount = 0;
    try {
      const notifPayload = {
        tipo_notificacion: 'NOTIFICACION_SST',
        titulo: `Desplazamiento en Comisión: ${consecutivo}`,
        mensaje: `Desplazamiento oficial de ${payload.nombre_completo_comisionado} a ${payload.ciudad_destino} del ${payload.fecha_inicio_viaje} al ${payload.fecha_fin_viaje}.`,
        descripcion_corta: `Comisión ${consecutivo} a ${payload.ciudad_destino}`,
        icono: 'HeartPulse',
        color: '#10B981',
        prioridad: 'Media' as const,
        categoria: 'VIATICOS',
        tiene_accion: true,
        texto_boton_accion: 'Ver Expediente',
        url_accion: `/viaticos?solicitudId=${solicitud.id}`,
        datos_adicionales: {
          solicitudId: solicitud.id,
          consecutivo,
          ...payload,
        },
      };

      if (this.notificationClient) {
        await this.notificationClient.notifyByRole('SST', notifPayload);
        await this.notificationClient.notifyByRole('SEGURIDAD_SALUD_TRABAJO', notifPayload);
        const usersSst = await this.notificationClient.getUsersByRole?.('SST') || [];
        const usersSalud = await this.notificationClient.getUsersByRole?.('SEGURIDAD_SALUD_TRABAJO') || [];
        usuariosInAppCount = new Set([...usersSst, ...usersSalud]).size;
      }
    } catch (inAppErr: any) {
      this.logger.warn(
        `[RF-PAG-002] Advertencia al despachar notificación in-app para solicitud ${consecutivo}: ${inAppErr?.message}`,
      );
    }

    // 4. Recopilar correos: usuarios con rol SST + buzón institucional
    let emailsRol: string[] = [];
    try {
      if (this.notificationClient?.getEmailsByRole) {
        const emailsSst = await this.notificationClient.getEmailsByRole('SST');
        const emailsSalud = await this.notificationClient.getEmailsByRole('SEGURIDAD_SALUD_TRABAJO');
        emailsRol = [...emailsSst, ...emailsSalud];
      }
    } catch (roleErr: any) {
      this.logger.warn(`[RF-PAG-002] Error consultando correos del rol SST: ${roleErr?.message}`);
    }

    const correoInstitucional = await this.obtenerCorreoDestinoSst();
    const todosDestinatarios = Array.from(
      new Set([...emailsRol, correoInstitucional]),
    ).filter((email) => Boolean(email && email.includes('@')));

    // 5. Despachar correo institucional
    let errorCorreo: string | null = null;
    const cuerpoHtml = `
      <div style="font-family: Arial, sans-serif; color: #1e293b; max-width: 650px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #003DA5; padding: 20px; color: #ffffff; text-align: center;">
          <h2 style="margin: 0; font-size: 18px;">Notificación de Desplazamiento de Comisión de Servicio</h2>
          <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.9;">Área de Seguridad y Salud en el Trabajo (SST) — ESAP</p>
        </div>
        <div style="padding: 24px;">
          <p style="font-size: 14px; margin-top: 0;">Estimado equipo de <strong>Seguridad y Salud en el Trabajo (SST)</strong>,</p>
          <p style="font-size: 13px; line-height: 1.6;">
            Se informa que la comisión de servicio identificada con radicado <strong>${consecutivo}</strong> ha avanzado a la fase de desembolso (${solicitud.estadoSolicitud}), formalizando el desplazamiento con los siguientes datos:
          </p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px;">
            <tr style="background-color: #f8fafc;">
              <td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold; width: 35%;">Comisionado:</td>
              <td style="padding: 10px; border: 1px solid #cbd5e1;">${payload.nombre_completo_comisionado}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold;">Documento de Identidad:</td>
              <td style="padding: 10px; border: 1px solid #cbd5e1;">${payload.documento_identidad}</td>
            </tr>
            <tr style="background-color: #f8fafc;">
              <td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold;">Destino:</td>
              <td style="padding: 10px; border: 1px solid #cbd5e1;">${payload.ciudad_destino}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold;">Fechas del Viaje:</td>
              <td style="padding: 10px; border: 1px solid #cbd5e1;">${payload.fecha_inicio_viaje} al ${payload.fecha_fin_viaje}</td>
            </tr>
            <tr style="background-color: #f8fafc;">
              <td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold;">Objeto de la Comisión:</td>
              <td style="padding: 10px; border: 1px solid #cbd5e1;">${payload.objeto_comision}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold;">Estado del Expediente:</td>
              <td style="padding: 10px; border: 1px solid #cbd5e1;"><span style="background-color: #dcfce7; color: #166534; font-weight: bold; padding: 2px 8px; border-radius: 4px;">${solicitud.estadoSolicitud}</span></td>
            </tr>
          </table>
          <p style="font-size: 12px; color: #64748b; line-height: 1.5;">
            Este registro permite realizar el seguimiento de cobertura de ARL y protocolos de seguridad durante el itinerario de desplazamiento.
          </p>
        </div>
        <div style="background-color: #f1f5f9; padding: 12px 24px; font-size: 11px; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0;">
          Sistema de Viáticos y Comisiones de Servicio — Escuela Superior de Administración Pública (ESAP)
        </div>
      </div>
    `;

    try {
      if (this.notificationClient?.sendEmail) {
        for (const correo of todosDestinatarios) {
          await this.notificationClient.sendEmail({
            to: correo,
            subject: `[SST] Notificación de Desplazamiento en Comisión: ${consecutivo} - ${payload.nombre_completo_comisionado}`,
            html: cuerpoHtml,
          });
        }
      }
    } catch (err: any) {
      errorCorreo = err?.message || 'Error al despachar correo';
      this.logger.error(`[RF-PAG-002] Error despachando correo a SST para ${consecutivo}: ${errorCorreo}`);
    }

    // 6. Asiento inmutable en travel_expenses.solicitudes_historial_estados + marcado notificado_sst
    await this.dataSource.transaction(async (manager) => {
      // 6.1. Actualizar bandera notificadoSst
      await manager.getRepository(SolicitudComisionEntity).update(solicitud.id, {
        notificadoSst: true,
      });

      // 6.2. Auditoría inmutable en el timeline del expediente
      const comentarioAudit = `Notificación automática despachada a Seguridad y Salud en el Trabajo (SST) [In-App bandeja + Correo a: ${todosDestinatarios.join(', ')}]`;

      await manager.getRepository(SolicitudHistorialEstadoEntity).save({
        solicitudId: solicitud.id,
        estadoAnterior: solicitud.estadoSolicitud,
        estadoNuevo: solicitud.estadoSolicitud,
        usuarioId: usuarioId || solicitud.creadoPorUsuarioId || '00000000-0000-0000-0000-000000000000',
        comentarios: comentarioAudit.slice(0, 255),
      });
    });

    this.logger.log(
      `[RF-PAG-002] Notificación SST despachada para ${consecutivo}. Destinatarios: ${todosDestinatarios.join(', ')}.`,
    );

    return {
      success: !errorCorreo,
      solicitudId: solicitud.id,
      consecutivo,
      destinatariosEmails: todosDestinatarios,
      usuariosInAppNotificados: usuariosInAppCount,
      mensaje: `Notificación formal despachada a SST (Bandeja in-app y correo a ${todosDestinatarios.length} destinatario(s)).`,
      payload,
      fechaEnvio: new Date(),
    };
  }

  /**
   * Consulta el estado de notificación SST y los registros de auditoría del expediente.
   */
  async consultarHistorialSst(solicitudId: string): Promise<any> {
    if (!solicitudId) {
      throw new BadRequestException('El ID de la solicitud es requerido.');
    }

    const solicitud = await this.solicitudRepo.findOne({
      where: { id: solicitudId },
      relations: ['comisionado'],
    });

    if (!solicitud) {
      throw new NotFoundException(`No se encontró la solicitud con id ${solicitudId}`);
    }

    const historial = await this.historialRepo.find({
      where: { solicitudId },
      order: { creadoEn: 'DESC' },
    });

    const trazasSst = historial.filter((h) =>
      Boolean(h.comentarios && (h.comentarios.includes('SST') || h.comentarios.includes('Salud en el Trabajo'))),
    );

    return {
      solicitudId: solicitud.id,
      consecutivo: solicitud.consecutivoUnico,
      notificadoSst: solicitud.notificadoSst,
      payload: this.construirPayloadSst(solicitud),
      historialTrazabilidad: trazasSst,
    };
  }
}
