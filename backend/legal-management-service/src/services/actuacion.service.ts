import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { Actuacion } from '../entities/actuacion.entity';
import { Documento } from '../entities/documento.entity';
import { ExpedienteService } from './expediente.service';
import { TerminosService } from './terminos.service';
import { ConfigurationsService } from './configurations.service';
import { NotificationClientService } from './notification-client.service';

@Injectable()
export class ActuacionService {
    private readonly logger = new Logger(ActuacionService.name);

    constructor(
        @InjectRepository(Actuacion)
        private actuacionRepository: Repository<Actuacion>,
        private expedienteService: ExpedienteService,
        private terminosService: TerminosService,
        private configService: ConfigurationsService,
        private notificationClient: NotificationClientService,
        @InjectDataSource()
        private readonly dataSource: DataSource
    ) { }

    async getUserDetails(userId: string): Promise<{ id_user: string; email: string; fullName: string } | null> {
        try {
            const rows = await this.dataSource.query(
                `SELECT u.id_user::text AS "id_user", 
                        COALESCE(p.dir_email, u.username) AS "email",
                        COALESCE(p.nom_largo, u.username) AS "fullName"
                 FROM auth."user" u
                 LEFT JOIN auth.personas p ON p.id_person = u.id_person
                 WHERE (u.id_user::text = $1 OR u.public_id::text = $1 OR u.id_person::text = $1)
                   AND COALESCE(u.is_active, true) = true
                 LIMIT 1`,
                [userId]
            );
            return rows[0] || null;
        } catch (err: any) {
            this.logger.error(`Error resolviendo usuario ${userId}: ${err?.message}`);
            return null;
        }
    }

    async registrarActuacion(expedienteId: string, data: Partial<Actuacion>): Promise<Actuacion> {
        const safeData = data || {};
        const nuevaActuacion = this.actuacionRepository.create({
            ...safeData,
            expedienteId,
            fechaActuacion: safeData.fechaActuacion || new Date()
        });

        // Lógica de validación si requiere autorización según la etapa del expediente
        const expediente = await this.expedienteService.findOne(expedienteId);
        if (expediente) {
            // Resolución tolerante (id o nombre normalizado) de las etapas del tipo de proceso.
            const estadosList = await this.configService.getEstadosForExpediente(expediente);

            if (estadosList.length > 0) {
                const estadoKanban = this.configService.findEstado(estadosList, expediente.etapaProcesal);
                if (estadoKanban && estadoKanban.aprobacionTipo && estadoKanban.aprobacionTipo !== 'ninguno') {
                    // Requiere aprobación!
                    const metadata = safeData.metadata || {};
                    metadata.estadoAutorizacion = 'PENDIENTE';
                    metadata.pasoKanban = expediente.etapaProcesal;
                    metadata.aprobacionTipo = estadoKanban.aprobacionTipo;
                    metadata.aprobacionRol = estadoKanban.aprobacionRol;
                    metadata.aprobacionUsuario = estadoKanban.aprobacionUsuario;
                    metadata.estado = 'Pendiente de Autorización';
                    
                    nuevaActuacion.metadata = metadata;
                    this.logger.log(`Actuación requiere aprobación en etapa ${expediente.etapaProcesal} (${estadoKanban.aprobacionTipo})`);
                }
            }
        }

        const saved = await this.actuacionRepository.save(nuevaActuacion);

        // Notificar al responsable asignado que tiene una nueva actividad pendiente
        if (saved.responsableId && expediente) {
            this.notificarResponsableAsignado(expediente, saved).catch(err => {
                this.logger.error(`Error enviando notificación de responsable asignado: ${err?.message}`);
            });
        }

        // Si requiere aprobación, enviamos notificaciones del pendiente
        if (saved.metadata && saved.metadata.estadoAutorizacion === 'PENDIENTE' && expediente) {
            this.enviarNotificacionPendiente(expediente, saved).catch(err => {
                this.logger.error(`Error enviando notificación de pendiente: ${err?.message}`);
            });
        }

        // Lógica de cambio de estado automático y creación de términos (sólo si no está pendiente de autorización)
        if (!saved.metadata || saved.metadata.estadoAutorizacion !== 'PENDIENTE') {
            await this.ejecutarEfectosAutomaticos(expedienteId, saved);
        }

        return saved;
    }

    async ejecutarEfectosAutomaticos(expedienteId: string, actuacion: Actuacion) {
        if (actuacion.tipoActuacion === 'FALLO') {
            await this.expedienteService.updateExpediente(expedienteId, { estado: 'FALLO_PRIMERA_INSTANCIA' });
        } else if (actuacion.tipoActuacion === 'AUTO_ADMISORIO') {
            await this.expedienteService.updateExpediente(expedienteId, { estado: 'EN_TRAMITE' });

            // Trigger automatic term creation
            const expediente = await this.expedienteService.findOne(expedienteId);
            if (expediente) {
                await this.terminosService.createAutomatico(
                    'DEFENSA',
                    expediente.id,
                    expediente.radicado,
                    'Contestación de Demanda',
                    new Date(),
                    30,
                    undefined
                );
            }
        }
    }

    /**
     * Notifica (in-app + correo) al usuario asignado como responsable de una actuación
     * recién registrada de que tiene una nueva actividad pendiente en el expediente.
     */
    private async notificarResponsableAsignado(expediente: any, actuacion: Actuacion): Promise<void> {
        if (!actuacion.responsableId) return;

        const detail = await this.getUserDetails(actuacion.responsableId);
        if (!detail) {
            this.logger.warn(`No se pudo resolver el responsable "${actuacion.responsableId}" para notificar la actuación ${actuacion.id}`);
            return;
        }

        const esDisciplinario =
            expediente.jurisdiccion === 'DISCIPLINARIO' ||
            expediente.jurisdiccion === 'Disciplinaria' ||
            expediente.tipoProceso === 'DISCIPLINARIO' ||
            expediente.tipoProceso === 'Disciplinario';
        const url = `/gestion-legal?modulo=${esDisciplinario ? 'juzgamiento' : 'defensa-judicial'}&radicado=${expediente.radicado}`;

        await this.notificationClient.notifyUserById(detail.id_user, {
            tipo_notificacion: 'ACTUACION_ASIGNADA',
            titulo: 'Nueva actividad pendiente',
            mensaje: `Se te asignó como responsable de la actuación "${actuacion.tipoActuacion}" en el expediente ${expediente.radicado}.`,
            descripcion_corta: `Actuación asignada en ${expediente.radicado}`,
            icono: 'ClipboardList',
            color: '#6366F1',
            prioridad: 'Alta',
            categoria: 'gestion-legal',
            tiene_accion: true,
            texto_boton_accion: 'Ver expediente',
            url_accion: url,
            datos_adicionales: {
                actuacionId: actuacion.id,
                expedienteId: expediente.id,
                radicado: expediente.radicado
            }
        });

        if (detail.email) {
            const emailSubject = `Nueva actividad pendiente - Radicado: ${expediente.radicado}`;
            const emailHtml = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                <h2 style="color: #003DA5; border-bottom: 2px solid #003DA5; padding-bottom: 10px;">Nueva Actividad Pendiente</h2>
                <p>Estimado(a) <strong>${detail.fullName}</strong>,</p>
                <p>Se te ha asignado como responsable de una actuación procesal en el expediente <strong>${expediente.radicado}</strong>:</p>
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                  <tr style="background-color: #f9f9f9;">
                    <td style="padding: 10px; font-weight: bold; width: 30%;">Expediente / Radicado:</td>
                    <td style="padding: 10px;">${expediente.radicado}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px; font-weight: bold;">Tipo de Actuación:</td>
                    <td style="padding: 10px;">${actuacion.tipoActuacion}</td>
                  </tr>
                  <tr style="background-color: #f9f9f9;">
                    <td style="padding: 10px; font-weight: bold;">Descripción:</td>
                    <td style="padding: 10px;">${actuacion.descripcion || 'Sin descripción'}</td>
                  </tr>
                </table>
                <p>Por favor ingrese a la plataforma de Gestión Legal de la ESAP para revisar los detalles.</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}${url}"
                     style="background-color: #003DA5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                    Ir al Expediente
                  </a>
                </div>
                <p style="font-size: 12px; color: #777; border-top: 1px solid #e0e0e0; padding-top: 10px; margin-top: 30px;">
                  Este es un correo automático de la Plataforma de Gestión Legal ESAP. Por favor no responda a este mensaje.
                </p>
              </div>
            `;
            await this.notificationClient.sendEmail(detail.email, emailSubject, emailHtml);
        }
    }

    private async enviarNotificacionPendiente(expediente: any, actuacion: Actuacion) {
        const esDisciplinario =
            expediente.jurisdiccion === 'DISCIPLINARIO' ||
            expediente.jurisdiccion === 'Disciplinaria' ||
            expediente.tipoProceso === 'DISCIPLINARIO' ||
            expediente.tipoProceso === 'Disciplinario';
        
        const metadata = actuacion.metadata;
        let emails: string[] = [];
        let userIds: string[] = [];

        if (metadata.aprobacionTipo === 'rol' && metadata.aprobacionRol) {
            const details = await this.notificationClient.getUsersDetailsByRole(metadata.aprobacionRol);
            emails = details.map(d => d.email).filter(Boolean);
            userIds = details.map(d => d.id_user);

            // In-app notification
            await this.notificationClient.notifyByRole(metadata.aprobacionRol, {
                tipo_notificacion: 'AUTORIZACION_PENDIENTE',
                titulo: `Actuación Pendiente de Autorización`,
                mensaje: `La actuación "${actuacion.tipoActuacion}" en el expediente ${expediente.radicado} requiere su autorización y firma electrónica.`,
                descripcion_corta: `Autorización requerida en ${expediente.radicado}`,
                icono: 'FileCheck',
                color: '#F59E0B',
                prioridad: 'Alta',
                categoria: 'gestion-legal',
                tiene_accion: true,
                texto_boton_accion: 'Ver expediente',
                url_accion: `/gestion-legal?modulo=${esDisciplinario ? 'juzgamiento' : 'defensa-judicial'}&radicado=${expediente.radicado}`,
                datos_adicionales: {
                    actuacionId: actuacion.id,
                    expedienteId: expediente.id,
                    radicado: expediente.radicado
                }
            });
        } else if (metadata.aprobacionTipo === 'usuario' && metadata.aprobacionUsuario) {
            const detail = await this.getUserDetails(metadata.aprobacionUsuario);
            if (detail) {
                if (detail.email) emails.push(detail.email);
                userIds.push(detail.id_user);
            }

            // In-app notification
            await this.notificationClient.notifyUserById(metadata.aprobacionUsuario, {
                tipo_notificacion: 'AUTORIZACION_PENDIENTE',
                titulo: `Actuación Pendiente de Autorización`,
                mensaje: `La actuación "${actuacion.tipoActuacion}" en el expediente ${expediente.radicado} requiere su autorización y firma electrónica.`,
                descripcion_corta: `Autorización requerida en ${expediente.radicado}`,
                icono: 'FileCheck',
                color: '#F59E0B',
                prioridad: 'Alta',
                categoria: 'gestion-legal',
                tiene_accion: true,
                texto_boton_accion: 'Ver expediente',
                url_accion: `/gestion-legal?modulo=${esDisciplinario ? 'juzgamiento' : 'defensa-judicial'}&radicado=${expediente.radicado}`,
                datos_adicionales: {
                    actuacionId: actuacion.id,
                    expedienteId: expediente.id,
                    radicado: expediente.radicado
                }
            });
        }

        // Email notification
        const emailSubject = `Pendiente Autorización de Actuación - Radicado: ${expediente.radicado}`;
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <h2 style="color: #003DA5; border-bottom: 2px solid #003DA5; padding-bottom: 10px;">Autorización y Firma Requerida</h2>
            <p>Estimado(a) funcionario(a),</p>
            <p>Se ha registrado una nueva actuación procesal que requiere su revisión, autorización y firma electrónica:</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr style="background-color: #f9f9f9;">
                <td style="padding: 10px; font-weight: bold; width: 30%;">Expediente / Radicado:</td>
                <td style="padding: 10px;">${expediente.radicado}</td>
              </tr>
              <tr>
                <td style="padding: 10px; font-weight: bold;">Tipo de Actuación:</td>
                <td style="padding: 10px;">${actuacion.tipoActuacion}</td>
              </tr>
              <tr style="background-color: #f9f9f9;">
                <td style="padding: 10px; font-weight: bold;">Descripción:</td>
                <td style="padding: 10px;">${actuacion.descripcion || 'Sin descripción'}</td>
              </tr>
              <tr>
                <td style="padding: 10px; font-weight: bold;">Paso Kanban:</td>
                <td style="padding: 10px;">${metadata.pasoKanban || expediente.etapaProcesal}</td>
              </tr>
            </table>
            <p>Para autorizar y firmar digitalmente con el código OTP, por favor ingrese a la plataforma de Gestión Legal de la ESAP.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/gestion-legal?modulo=${esDisciplinario ? 'juzgamiento' : 'defensa-judicial'}&radicado=${expediente.radicado}" 
                 style="background-color: #003DA5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                Ir al Expediente
              </a>
            </div>
            <p style="font-size: 12px; color: #777; border-top: 1px solid #e0e0e0; padding-top: 10px; margin-top: 30px;">
              Este es un correo automático de la Plataforma de Gestión Legal ESAP. Por favor no responda a este mensaje.
            </p>
          </div>
        `;

        for (const email of emails) {
            await this.notificationClient.sendEmail(email, emailSubject, emailHtml);
        }
    }

    async enviarOtp(actuacionId: string, userEmail: string, userName: string): Promise<any> {
        const actuacion = await this.actuacionRepository.findOne({ where: { id: actuacionId } });
        if (!actuacion) throw new NotFoundException('Actuación no encontrada');

        const expediente = await this.expedienteService.findOne(actuacion.expedienteId);
        if (!expediente) throw new NotFoundException('Expediente no encontrado');

        // Generar un código aleatorio de 6 dígitos numéricos
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = new Date();
        otpExpiry.setMinutes(otpExpiry.getMinutes() + 15); // Expiración en 15 minutos

        const metadata = actuacion.metadata || {};
        metadata.otp = otp;
        metadata.otpExpiry = otpExpiry.toISOString();
        actuacion.metadata = metadata;
        await this.actuacionRepository.save(actuacion);

        const emailSubject = `Código de Firma Electrónica - Gestión Legal ESAP`;
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <h2 style="color: #003DA5; border-bottom: 2px solid #003DA5; padding-bottom: 10px;">Código de Firma Electrónica (OTP)</h2>
            <p>Estimado(a) <strong>${userName}</strong>,</p>
            <p>Ha solicitado un código de firma electrónica para autorizar la actuación procesal <strong>"${actuacion.tipoActuacion}"</strong> en el expediente <strong>${expediente.radicado}</strong>.</p>
            <p>Su código de verificación OTP es el siguiente:</p>
            <div style="text-align: center; margin: 30px 0; background-color: #f0f4fa; padding: 20px; border-radius: 6px; border: 1px dashed #003DA5;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #003DA5;">${otp}</span>
            </div>
            <p style="color: #d9534f; font-weight: bold;">Este código es de un solo uso y vencerá en 15 minutos.</p>
            <p>Si usted no solicitó este código, por favor ignore este mensaje o contacte al administrador del sistema.</p>
            <p style="font-size: 12px; color: #777; border-top: 1px solid #e0e0e0; padding-top: 10px; margin-top: 30px;">
              Este es un correo automático de la Plataforma de Gestión Legal ESAP. Por favor no responda a este mensaje.
            </p>
          </div>
        `;

        await this.notificationClient.sendEmail(userEmail, emailSubject, emailHtml);
        return { message: 'OTP enviado con éxito' };
    }

    /**
     * Verifica el OTP en el paso de verificación de identidad, SIN consumirlo ni
     * autorizar la actuación. Permite rechazar códigos incorrectos de inmediato
     * (antes de la animación de firma) en lugar de esperar a autorizarActuacion.
     * El código se elimina solo al autorizar, por lo que esta comprobación es
     * idempotente y puede llamarse las veces que sea necesario.
     */
    async verificarOtp(actuacionId: string, otp: string): Promise<{ valid: boolean }> {
        const actuacion = await this.actuacionRepository.findOne({ where: { id: actuacionId } });
        if (!actuacion) throw new NotFoundException('Actuación no encontrada');

        const metadata = actuacion.metadata || {};

        if (!metadata.otp || metadata.otp !== otp) {
            throw new BadRequestException('Código OTP incorrecto');
        }
        if (!metadata.otpExpiry || new Date(metadata.otpExpiry) < new Date()) {
            throw new BadRequestException('El código OTP ha expirado');
        }

        return { valid: true };
    }

    async autorizarActuacion(
        actuacionId: string,
        otp: string,
        file: any,
        userEmail: string,
        userName: string
    ): Promise<Actuacion> {
        const actuacion = await this.actuacionRepository.findOne({ where: { id: actuacionId } });
        if (!actuacion) throw new NotFoundException('Actuación no encontrada');

        const metadata = actuacion.metadata || {};

        if (!metadata.otp || metadata.otp !== otp) {
            throw new BadRequestException('Código OTP incorrecto');
        }
        if (!metadata.otpExpiry || new Date(metadata.otpExpiry) < new Date()) {
            throw new BadRequestException('El código OTP ha expirado');
        }

        if (!file) {
            throw new BadRequestException('Es necesario adjuntar la foto de la firma');
        }

        // Guardar la firma foto url
        const fileUrl = `/uploads/signatures/${file.filename}`;

        delete metadata.otp;
        delete metadata.otpExpiry;

        return this.finalizarAutorizacion(actuacion, metadata, userEmail, userName, fileUrl);
    }

    /**
     * Autoriza automáticamente la actuación cuando todos sus documentos asociados que
     * requieren firma ya fueron firmados individualmente (uno por uno, cada uno con su
     * propia verificación de identidad). Ya no se exige un segundo paso manual de "Autorizar
     * Actuación" con OTP: la firma de los documentos es la autorización.
     */
    async autorizarPorDocumentosFirmados(
        actuacionId: string,
        userEmail: string,
        userName: string
    ): Promise<Actuacion> {
        const actuacion = await this.actuacionRepository.findOne({ where: { id: actuacionId } });
        if (!actuacion) throw new NotFoundException('Actuación no encontrada');

        const metadata = actuacion.metadata || {};
        if (metadata.estadoAutorizacion === 'AUTORIZADO') {
            return actuacion;
        }

        return this.finalizarAutorizacion(actuacion, metadata, userEmail, userName);
    }

    private async finalizarAutorizacion(
        actuacion: Actuacion,
        metadata: Record<string, any>,
        userEmail: string,
        userName: string,
        firmaFotoUrl?: string
    ): Promise<Actuacion> {
        metadata.estadoAutorizacion = 'AUTORIZADO';
        metadata.estado = 'Completado'; // Mark state as completed for standard UI rendering
        if (firmaFotoUrl) {
            metadata.firmaFotoUrl = firmaFotoUrl;
        }
        metadata.firmadoPor = userName;
        metadata.firmadoPorEmail = userEmail;
        metadata.fechaFirma = new Date().toISOString();

        actuacion.metadata = metadata;
        actuacion.usuarioResponsable = userName;

        const saved = await this.actuacionRepository.save(actuacion);

        // Ejecutar los efectos automáticos asociados a la actuación (por ejemplo, cambios de estado del expediente, creación de términos)
        await this.ejecutarEfectosAutomaticos(actuacion.expedienteId, saved);

        // Notificar
        const expediente = await this.expedienteService.findOne(actuacion.expedienteId);
        if (expediente) {
            const esDisciplinario =
                expediente.jurisdiccion === 'DISCIPLINARIO' ||
                expediente.jurisdiccion === 'Disciplinaria' ||
                expediente.tipoProceso === 'DISCIPLINARIO' ||
                expediente.tipoProceso === 'Disciplinario';

            const urlAccion = `/gestion-legal?modulo=${esDisciplinario ? 'juzgamiento' : 'defensa-judicial'}&radicado=${expediente.radicado}`;
            const dto = {
                tipo_notificacion: 'ACTUACION_AUTORIZADA',
                titulo: `Actuación Autorizada y Firmada`,
                mensaje: `La actuación "${actuacion.tipoActuacion}" ha sido autorizada y firmada por ${userName}.`,
                descripcion_corta: `Actuación firmada en ${expediente.radicado}`,
                icono: 'FileCheck',
                color: '#10B981',
                prioridad: 'Media' as const,
                categoria: 'gestion-legal',
                tiene_accion: true,
                texto_boton_accion: 'Ver expediente',
                url_accion: urlAccion,
                datos_adicionales: {
                    actuacionId: actuacion.id,
                    expedienteId: expediente.id,
                    radicado: expediente.radicado
                }
            };

            const emailSubject = `Actuación Firmada - Radicado: ${expediente.radicado}`;
            const emailHtml = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                <h2 style="color: #10B981; border-bottom: 2px solid #10B981; padding-bottom: 10px;">Actuación Autorizada y Firmada</h2>
                <p>Estimado(a) funcionario(a),</p>
                <p>La actuación <strong>"${actuacion.tipoActuacion}"</strong> del expediente <strong>${expediente.radicado}</strong> ha sido autorizada y firmada por <strong>${userName}</strong>.</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}${urlAccion}"
                     style="background-color: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                    Ver Expediente
                  </a>
                </div>
                <p style="font-size: 12px; color: #777; border-top: 1px solid #e0e0e0; padding-top: 10px; margin-top: 30px;">
                  Este es un correo automático de la Plataforma de Gestión Legal ESAP. Por favor no responda a este mensaje.
                </p>
              </div>
            `;

            // Notificar al abogado sustanciador ("resuelve") del expediente
            if (expediente.abogadoSustanciador) {
                await this.notificationClient.notifyUserById(expediente.abogadoSustanciador, dto);
                const detail = await this.getUserDetails(expediente.abogadoSustanciador);
                if (detail?.email) {
                    await this.notificationClient.sendEmail(detail.email, emailSubject, emailHtml);
                }
            }

            // Notificar al secretariado de Gestión Legal
            await this.notificationClient.notifyByRoles(['SECRETARIADO_GESTION_LEGAL'], dto, {
                subject: emailSubject,
                html: emailHtml
            });
        }

        return saved;
    }

    async devolverActuacion(
        actuacionId: string,
        observaciones: string,
        userEmail: string,
        userName: string,
        skipStageUpdate = false
    ): Promise<Actuacion> {
        const actuacion = await this.actuacionRepository.findOne({ where: { id: actuacionId } });
        if (!actuacion) throw new NotFoundException('Actuación no encontrada');

        const expediente = await this.expedienteService.findOne(actuacion.expedienteId);
        if (!expediente) throw new NotFoundException('Expediente no encontrado');

        const metadata = actuacion.metadata || {};
        metadata.estadoAutorizacion = 'DEVUELTO';
        metadata.estado = 'Devuelto con observaciones';
        metadata.observacionesDevolucion = observaciones;
        metadata.devueltoPor = userName;
        metadata.devueltoPorEmail = userEmail;
        metadata.fechaDevolucion = new Date().toISOString();

        actuacion.metadata = metadata;
        const savedActuacion = await this.actuacionRepository.save(actuacion);

        if (!skipStageUpdate) {
            const esDisciplinario =
                expediente.jurisdiccion === 'DISCIPLINARIO' ||
                expediente.jurisdiccion === 'Disciplinaria' ||
                expediente.tipoProceso === 'DISCIPLINARIO' ||
                expediente.tipoProceso === 'Disciplinario';

            let etapaAnterior = expediente.etapaProcesal;
            let anteriorColumna: any = null;

            // Resolución tolerante (id o nombre normalizado) de las etapas del tipo de proceso.
            const estadosList = await this.configService.getEstadosForExpediente(expediente);

            if (estadosList.length > 0) {
                const estadosActivos = estadosList
                    .filter((e: any) => e.activo !== false)
                    .sort((a: any, b: any) => (a.orden || 0) - (b.orden || 0));

                const currentIndex = this.configService.findEstadoIndex(estadosActivos, expediente.etapaProcesal);
                if (currentIndex > 0) {
                    anteriorColumna = estadosActivos[currentIndex - 1];
                    etapaAnterior = anteriorColumna.id;
                }
            }

            if (etapaAnterior !== expediente.etapaProcesal) {
                await this.expedienteService.updateExpediente(expediente.id, {
                    etapaProcesal: etapaAnterior
                });
            }

            const urlAccion = `/gestion-legal?modulo=${esDisciplinario ? 'juzgamiento' : 'defensa-judicial'}&radicado=${expediente.radicado}`;

            if (expediente.abogadoSustanciador) {
                const dto = {
                    tipo_notificacion: 'ACTUACION_DEVUELTA',
                    titulo: `Actuación Devuelta con Observaciones`,
                    mensaje: `La actuación "${actuacion.tipoActuacion}" ha sido devuelta por ${userName}. Observaciones: "${observaciones}". El expediente regresó a la etapa ${etapaAnterior}.`,
                    descripcion_corta: `Actuación devuelta en ${expediente.radicado}`,
                    icono: 'AlertTriangle',
                    color: '#DC2626',
                    prioridad: 'Alta' as const,
                    categoria: 'gestion-legal',
                    tiene_accion: true,
                    texto_boton_accion: 'Ver expediente',
                    url_accion: urlAccion,
                    datos_adicionales: {
                        actuacionId: actuacion.id,
                        expedienteId: expediente.id,
                        radicado: expediente.radicado
                    }
                };
                await this.notificationClient.notifyUserById(expediente.abogadoSustanciador, dto);

                const detail = await this.getUserDetails(expediente.abogadoSustanciador);
                if (detail?.email) {
                    const emailSubject = `Actuación Devuelta - Radicado: ${expediente.radicado}`;
                    const emailHtml = `
                      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                        <h2 style="color: #DC2626; border-bottom: 2px solid #DC2626; padding-bottom: 10px;">Actuación Devuelta con Observaciones</h2>
                        <p>Estimado(a) funcionario(a),</p>
                        <p>La actuación <strong>"${actuacion.tipoActuacion}"</strong> del expediente <strong>${expediente.radicado}</strong> ha sido devuelta por <strong>${userName}</strong>, quien debe corregirla.</p>
                        <p><strong>Observaciones:</strong> ${observaciones}</p>
                        <p>El expediente regresó a la etapa <strong>${etapaAnterior}</strong>.</p>
                        <div style="text-align: center; margin: 30px 0;">
                          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}${urlAccion}"
                             style="background-color: #DC2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                            Ver Expediente
                          </a>
                        </div>
                        <p style="font-size: 12px; color: #777; border-top: 1px solid #e0e0e0; padding-top: 10px; margin-top: 30px;">
                          Este es un correo automático de la Plataforma de Gestión Legal ESAP. Por favor no responda a este mensaje.
                        </p>
                      </div>
                    `;
                    await this.notificationClient.sendEmail(detail.email, emailSubject, emailHtml);
                }
            }

            if (anteriorColumna && anteriorColumna.aprobacionTipo && anteriorColumna.aprobacionTipo !== 'ninguno') {
                const dto = {
                    tipo_notificacion: 'EXPEDIENTE_DEVUELTO_ETAPA',
                    titulo: `Expediente Devuelto a etapa ${anteriorColumna.nombre}`,
                    mensaje: `El expediente ${expediente.radicado} ha regresado a la etapa ${anteriorColumna.nombre} tras la devolución de la actuación "${actuacion.tipoActuacion}".`,
                    descripcion_corta: `Expediente en ${anteriorColumna.nombre}`,
                    icono: 'ArrowLeft',
                    color: '#3B82F6',
                    prioridad: 'Media' as const,
                    categoria: 'gestion-legal',
                    tiene_accion: true,
                    texto_boton_accion: 'Ver expediente',
                    url_accion: urlAccion
                };
                const emailSubject = `Expediente devuelto a etapa ${anteriorColumna.nombre} - Radicado: ${expediente.radicado}`;
                const emailHtml = `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                    <h2 style="color: #3B82F6; border-bottom: 2px solid #3B82F6; padding-bottom: 10px;">Expediente Devuelto</h2>
                    <p>Estimado(a) funcionario(a),</p>
                    <p>El expediente <strong>${expediente.radicado}</strong> ha regresado a la etapa <strong>${anteriorColumna.nombre}</strong> tras la devolución de la actuación <strong>"${actuacion.tipoActuacion}"</strong>.</p>
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}${urlAccion}"
                         style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                        Ver Expediente
                      </a>
                    </div>
                    <p style="font-size: 12px; color: #777; border-top: 1px solid #e0e0e0; padding-top: 10px; margin-top: 30px;">
                      Este es un correo automático de la Plataforma de Gestión Legal ESAP. Por favor no responda a este mensaje.
                    </p>
                  </div>
                `;

                if (anteriorColumna.aprobacionTipo === 'rol' && anteriorColumna.aprobacionRol) {
                    await this.notificationClient.notifyByRoles([anteriorColumna.aprobacionRol], dto, {
                        subject: emailSubject,
                        html: emailHtml
                    });
                } else if (anteriorColumna.aprobacionTipo === 'usuario' && anteriorColumna.aprobacionUsuario) {
                    await this.notificationClient.notifyUserById(anteriorColumna.aprobacionUsuario, dto);
                    const detail = await this.getUserDetails(anteriorColumna.aprobacionUsuario);
                    if (detail?.email) {
                        await this.notificationClient.sendEmail(detail.email, emailSubject, emailHtml);
                    }
                }
            }
        }

        return savedActuacion;
    }

    /**
     * Registra automáticamente un evento crítico en el historial cronológico unificado
     * (Usado por hooks desde otros servicios)
     */
    async registrarEventoAutomatico(
        expedienteId: string,
        titulo: string,
        descripcion: string,
        origen: string,
        referenciaId: string,
        metadatos: any = {},
        usuario: string = 'Sistema'
    ): Promise<Actuacion> {
        const actuacion = this.actuacionRepository.create({
            expedienteId,
            tipoActuacion: titulo, // El título del evento actúa como tipo
            descripcion,
            origen,
            referenciaId,
            metadata: metadatos,
            usuarioResponsable: usuario,
            fechaActuacion: new Date()
        });
        return this.actuacionRepository.save(actuacion);
    }

    async eliminarActuacion(actuacionId: string): Promise<void> {
        const cleanId = actuacionId.trim();
        console.log('[ActuacionService] Service called with ID:', JSON.stringify(actuacionId), 'Length:', actuacionId.length, 'Cleaned:', JSON.stringify(cleanId));
        const actuacion = await this.actuacionRepository.findOne({ where: { id: cleanId } });
        if (!actuacion) {
            console.log('[ActuacionService] Actuacion not found in DB with ID:', JSON.stringify(cleanId));
            throw new NotFoundException('Actuación no encontrada');
        }

        // 1. Validar si está aprobada (estadoAutorizacion === 'AUTORIZADO')
        if (actuacion.metadata?.estadoAutorizacion === 'AUTORIZADO') {
            throw new BadRequestException('No se puede eliminar una actuación aprobada / autorizada');
        }

        // 2. Validar si tiene algún documento asociado firmado
        const associatedDocIds = actuacion.metadata?.documentosAsociados || [];
        if (associatedDocIds.length > 0) {
            const documentoRepository = this.dataSource.getRepository(Documento);
            const resolvedDocs = await documentoRepository.find({
                where: {
                    id: In(associatedDocIds)
                }
            });

            const isDocSigned = (d: Documento) => {
                if (!d) return false;
                if (d.descripcion) {
                    try {
                        const data = JSON.parse(d.descripcion);
                        return !!(data && data.firmado);
                    } catch (e) {
                        return false;
                    }
                }
                return false;
            };

            const hasSignedDocs = resolvedDocs.some(doc => isDocSigned(doc));
            if (hasSignedDocs) {
                throw new BadRequestException('No se puede eliminar una actuación con documentos firmados');
            }
        }

        // Si pasa todas las validaciones, eliminar de la base de datos
        await this.actuacionRepository.delete(actuacionId);
    }

    async listarPorExpediente(expedienteId: string): Promise<Actuacion[]> {
        // Try to resolve full expediente to get both UUID and Radicado
        const expediente = await this.expedienteService.findOne(expedienteId) ||
            await this.expedienteService.findOneByRadicado(expedienteId);

        let whereCondition: any = { expedienteId };

        if (expediente) {
            whereCondition = [
                { expedienteId: expediente.id },
                { expedienteId: expediente.radicado }
            ];
        }

        return this.actuacionRepository.find({
            where: whereCondition,
            order: { fechaActuacion: 'DESC' }
        });
    }
}
