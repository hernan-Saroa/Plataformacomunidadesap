import { Controller, Get, Post, Put, Delete, Body, Query, BadRequestException, Param, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ExpedienteService } from '../services/expediente.service';
import { Expediente } from '../entities/expediente.entity';
import { NotificationClientService } from '../services/notification-client.service';

@Controller('expedientes')
export class ExpedienteController {
    constructor(
        private readonly expedienteService: ExpedienteService,
        private readonly notificationClient: NotificationClientService,
    ) { }

    @Get()
    async listar(
        @Query('estado') estado?: string,
        @Query('jurisdiccion') jurisdiccion?: string,
        @Query('search') search?: string,
    ): Promise<Expediente[]> {
        return this.expedienteService.listarExpedientes({ estado, jurisdiccion, search });
    }

    @Get(':id')
    async obtener(@Param('id') id: string): Promise<Expediente | null> {
        return this.expedienteService.findOne(id);
    }

    @Put(':id')
    async actualizar(@Param('id') id: string, @Body() data: Partial<Expediente>): Promise<Expediente> {
        return this.expedienteService.updateExpediente(id, data);
    }

    @Post()
    @UseInterceptors(FilesInterceptor('files', 5, {
        storage: diskStorage({
            destination: './uploads',
            filename: (req, file, cb) => {
                const randomName = Array.from(Array(32)).map(() => Math.round(Math.random() * 16).toString(16)).join('');
                return cb(null, `${randomName}${extname(file.originalname)}`);
            }
        })
    }))
    async crear(
        @Body() body: any, // Cuando se usa FormData, el body llega como objeto plano (strings), validamos manualmente
        @UploadedFiles() files: Array<any>
    ): Promise<Expediente> {
        // Parsear datos si vienen como strings (común en FormData)
        // Nota: NestJS con Express suele parsear el body automáticamente, pero los números pueden venir como strings.

        const data: Partial<Expediente> = { ...body };

        // Validaciones manuales básicas ya que el DTO validation pipes no siempre funciona igual con FormData sin configuración extra
        if (!data.radicado) {
            throw new BadRequestException('El radicado es obligatorio');
        }

        // Mapear archivos subidos
        if (files && files.length > 0) {
            data.documentosInicialesUrls = files.map(f => `/legal/files/${f.filename}`);
        }

        // Asegurar tipos numéricos
        if (data.cuantia) data.cuantia = Number(data.cuantia);
        if (data.terminoProcesalDias) data.terminoProcesalDias = Number(data.terminoProcesalDias);

        // Asignación Automática based on User Role
        // TODO: Validate these against a real Auth Token/Service in the future
        const userId = body.userId;
        const userRole = body.userRole;

        if (userId && userRole) {
            if (userRole === 'ABOGADO') {
                // Abogados solo pueden asignarse a sí mismos (o el sistema lo hace por defecto)
                data.abogadoSustanciador = userId;
            } else if (userRole === 'JEFE_OFICINA' || userRole === 'ADMIN') {
                // Jefes pueden asignar a cualquiera. Si viene en el body, se respeta.
                // Si no viene, queda sin asignar.
                if (body.abogadoId) {
                    data.abogadoSustanciador = body.abogadoId;
                }
            }
        } else {
            // Fallback legacy behavior: use abogadoId if provided directly
            if (body.abogadoId) {
                data.abogadoSustanciador = body.abogadoId;
            }
        }

        const creadoPor = body.creadoPor || body.usuario || body.userName || body.userId || 'Sistema';
        return this.expedienteService.crearExpediente(data, creadoPor);
    }

    @Delete(':id')
    async eliminar(@Param('id') id: string): Promise<void> {
        return this.expedienteService.deleteExpediente(id);
    }

    // ==================== ENDPOINTS DE ARCHIVO/ELIMINADO ====================

    @Get('estado/archivados')
    async listarArchivados(): Promise<Expediente[]> {
        return this.expedienteService.getExpedientesArchivados();
    }

    @Post(':id/archivar')
    async archivar(
        @Param('id') id: string,
        @Body() body: { motivo?: string; usuario?: string }
    ): Promise<Expediente> {
        const motivo = body.motivo || 'Sin motivo especificado';
        const usuario = body.usuario || 'Sistema';
        return this.expedienteService.archivarExpediente(id, motivo, usuario);
    }

    @Post(':id/eliminar')
    async eliminarSoft(
        @Param('id') id: string,
        @Body() body: { motivo?: string; usuario?: string }
    ): Promise<Expediente> {
        const motivo = body.motivo || 'Sin motivo especificado';
        const usuario = body.usuario || 'Sistema';
        return this.expedienteService.eliminarExpedienteSoft(id, motivo, usuario);
    }

    @Post(':id/restaurar')
    async restaurar(@Param('id') id: string): Promise<Expediente> {
        return this.expedienteService.restaurarExpediente(id);
    }

    @Delete(':id/permanente')
    async eliminarPermanente(@Param('id') id: string): Promise<void> {
        return this.expedienteService.eliminarPermanente(id);
    }

    // ==================== ENDPOINTS DE PROCESOS ANEXADOS ====================

    @Post(':id/anexar')
    async anexar(
        @Param('id') anexadoId: string,
        @Body() body: { principalId: string; usuario?: string }
    ): Promise<Expediente> {
        if (!body.principalId) {
            throw new BadRequestException('El ID del expediente principal es obligatorio');
        }
        const usuario = body.usuario || 'Sistema';
        return this.expedienteService.anexarExpediente(anexadoId, body.principalId, usuario);
    }

    @Post(':id/desanexar')
    async desanexar(
        @Param('id') id: string,
        @Body() body: { usuario?: string }
    ): Promise<Expediente> {
        const usuario = body.usuario || 'Sistema';
        return this.expedienteService.desanexarExpediente(id, usuario);
    }

    /**
     * Notifica a todos los usuarios con un rol específico (ej: JEFE_GESTION_LEGAL).
     * Envía notificación in-app vía notifications-service y, opcionalmente, correo.
     * Reutiliza el `NotificationClientService.notifyByRoles` ya probado.
     */
    @Post(':id/notify-role')
    async notifyRole(
        @Param('id') id: string,
        @Body() body: {
            roleCode: string;
            asunto: string;
            mensaje: string;
            enviarEmail?: boolean;
            enviarSistema?: boolean;
            radicado?: string;
            etapa?: string;
        }
    ): Promise<{ ok: boolean }> {
        if (!body.roleCode || !body.asunto || !body.mensaje) {
            throw new BadRequestException('roleCode, asunto y mensaje son obligatorios');
        }

        const expediente = await this.expedienteService.findOne(id);
        if (!expediente) {
            throw new BadRequestException('Expediente no encontrado');
        }

        const radicado = body.radicado || expediente.radicado;
        const etapa = body.etapa || expediente.etapaProcesal || 'N/A';

        const enviarSistema = body.enviarSistema !== false;
        const enviarEmail = body.enviarEmail !== false;

        const emailHtml = `
            <div style="font-family: 'Inter', Arial, sans-serif; background: #f5f7fb; padding: 24px; color: #1f2937;">
                <table width="100%" cellspacing="0" cellpadding="0" style="max-width: 520px; border: 1px solid #0b68d1; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden;">
                    <tr><td style="background: linear-gradient(135deg, #003DA5 0%, #0b68d1 100%); padding: 18px 24px; color: #ffffff; font-weight: 700; font-size: 18px;">Gestión Legal ESAP</td></tr>
                    <tr><td style="padding: 24px 24px 8px 24px; font-size: 16px; font-weight: 600; color: #111827;">${body.asunto}</td></tr>
                    <tr><td style="padding: 0 24px 16px 24px; font-size: 14px; color: #4b5563; line-height: 1.6; white-space: pre-line;">${body.mensaje}</td></tr>
                    <tr><td style="padding: 12px 24px; font-size: 12px; color: #6b7280; background: #f0f7ff; border-top: 1px solid #d7e9ff;"><strong>Expediente:</strong> ${radicado}<br/><strong>Etapa:</strong> ${etapa}</td></tr>
                    <tr><td style="padding: 15px 24px; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb;">ESAP - Escuela Superior de Administración Pública</td></tr>
                </table>
            </div>`;

        const dto = {
            tipo_notificacion: 'NOTIFICACION_EXPEDIENTE',
            titulo: body.asunto,
            mensaje: body.mensaje,
            descripcion_corta: `Expediente ${radicado}`,
            icono: 'Bell',
            color: '#1D4ED8',
            prioridad: 'Media' as const,
            categoria: 'gestion-legal',
            tiene_accion: true,
            texto_boton_accion: 'Ver expediente',
            url_accion: `/gestion-legal?modulo=defensa-judicial&radicado=${encodeURIComponent(radicado)}`,
            datos_adicionales: { expedienteId: expediente.id, radicado, etapa },
        };

        if (enviarSistema && enviarEmail) {
            await this.notificationClient.notifyByRoles([body.roleCode], dto, {
                subject: body.asunto,
                html: emailHtml,
            });
        } else if (enviarSistema) {
            await this.notificationClient.notifyByRole(body.roleCode, dto);
        } else if (enviarEmail) {
            const usuarios = await this.notificationClient.getUsersDetailsByRole(body.roleCode);
            for (const u of usuarios) {
                if (u.email) {
                    await this.notificationClient.sendEmail(u.email, body.asunto, emailHtml);
                }
            }
        }

        return { ok: true };
    }
}


