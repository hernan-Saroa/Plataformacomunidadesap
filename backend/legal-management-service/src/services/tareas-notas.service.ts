import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TareaExpediente } from '../entities/tarea-expediente.entity';
import { NotaExpediente } from '../entities/nota-expediente.entity';
import { Expediente } from '../entities/expediente.entity';
import { NotificationClientService } from './notification-client.service';
import { LegalNotificationsService } from './legal-notifications.service';

@Injectable()
export class TareasNotasService {
    private readonly logger = new Logger(TareasNotasService.name);

    constructor(
        @InjectRepository(TareaExpediente)
        private readonly tareaRepository: Repository<TareaExpediente>,
        @InjectRepository(NotaExpediente)
        private readonly notaRepository: Repository<NotaExpediente>,
        @InjectRepository(Expediente)
        private readonly expedienteRepository: Repository<Expediente>,
        private readonly notificationClient: NotificationClientService,
        private readonly legalNotifications: LegalNotificationsService,
    ) { }

    // ==================== TAREAS ====================

    async findTareasByExpediente(expedienteId: string): Promise<TareaExpediente[]> {
        return this.tareaRepository.find({
            where: { expedienteId },
            order: { fechaVencimiento: 'ASC' }
        });
    }

    async findTareaById(id: string): Promise<TareaExpediente> {
        const tarea = await this.tareaRepository.findOne({
            where: { id }
        });
        if (!tarea) throw new NotFoundException('Tarea no encontrada');
        return tarea;
    }

    async createTarea(data: Partial<TareaExpediente>): Promise<TareaExpediente> {
        const tarea = this.tareaRepository.create({
            ...data,
            fechaCreacion: new Date()
        });
        const saved = await this.tareaRepository.save(tarea);

        if (saved.responsableId) {
            this.notificarTareaAsignada(saved).catch(err =>
                this.logger.warn(`Error enviando notificación de tarea asignada: ${err?.message}`)
            );
        }

        return saved;
    }

    private async notificarTareaAsignada(tarea: TareaExpediente, esReasignacion = false): Promise<void> {
        if (!tarea.responsableId) return;

        const expediente = await this.expedienteRepository.findOne({
            where: { id: tarea.expedienteId },
            select: ['id', 'radicado', 'jurisdiccion', 'tipoProceso'],
        });

        const radicado = expediente?.radicado ?? tarea.expedienteId;
        const esDisciplinario =
            expediente?.jurisdiccion === 'DISCIPLINARIO' ||
            expediente?.jurisdiccion === 'Disciplinaria' ||
            expediente?.tipoProceso === 'DISCIPLINARIO' ||
            expediente?.tipoProceso === 'Disciplinario';
        const moduloVista = esDisciplinario ? 'juzgamiento' : 'defensa-judicial';
        const url = `/gestion-legal?modulo=${moduloVista}&radicado=${encodeURIComponent(radicado)}`;
        const accion = esReasignacion ? 'reasignó' : 'asignó';

        await this.notificationClient.sendMany([{
            id_usuario_destinatario: tarea.responsableId,
            tipo_notificacion: esReasignacion ? 'TAREA_REASIGNADA' : 'TAREA_ASIGNADA',
            titulo: esReasignacion ? 'Tarea reasignada' : 'Nueva tarea asignada',
            mensaje: `Se te ${accion} la tarea "${tarea.titulo}" en el proceso ${radicado}.`,
            descripcion_corta: `Tarea "${tarea.titulo}" en ${radicado}`,
            icono: 'ClipboardList',
            color: '#6366F1',
            prioridad: tarea.prioridad === 'alta' ? 'Alta' : 'Media',
            categoria: 'gestion-legal',
            tiene_accion: true,
            texto_boton_accion: 'Ver proceso',
            url_accion: url,
            datos_adicionales: {
                tareaId: tarea.id,
                expedienteId: tarea.expedienteId,
                radicado,
                tareaTitulo: tarea.titulo,
                esReasignacion,
            },
        }]);

        this.logger.log(`Notificación de tarea ${esReasignacion ? 'reasignada' : 'asignada'} enviada — Tarea: ${tarea.titulo}, Responsable: ${tarea.responsableId}`);

        const detalle = await this.notificationClient.getUserDetailsById(tarea.responsableId);
        if (detalle?.email) {
            const emailHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                    <h2 style="color: #6366F1; border-bottom: 2px solid #6366F1; padding-bottom: 10px;">${esReasignacion ? 'Tarea Reasignada' : 'Nueva Tarea Asignada'}</h2>
                    <p>Estimado(a) funcionario(a),</p>
                    <p>Se te ${accion} la tarea <strong>"${tarea.titulo}"</strong> en el proceso <strong>${radicado}</strong>.</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}${url}"
                           style="background-color: #6366F1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                            Ver Proceso
                        </a>
                    </div>
                    <p style="font-size: 12px; color: #777; border-top: 1px solid #e0e0e0; padding-top: 10px; margin-top: 30px;">
                        Este es un correo automático de la Plataforma de Gestión Legal ESAP. Por favor no responda a este mensaje.
                    </p>
                </div>
            `;
            await this.notificationClient.sendEmail(detalle.email, `Tarea ${esReasignacion ? 'reasignada' : 'asignada'}: ${tarea.titulo}`, emailHtml);
        }
    }

    async updateTarea(id: string, data: Partial<TareaExpediente>): Promise<TareaExpediente> {
        const tarea = await this.findTareaById(id);

        // If completing task, set completion date
        if (data.estado === 'completada' && tarea.estado !== 'completada') {
            data.fechaCompletada = new Date();
        }

        const seReasignaResponsable =
            !!data.responsableId && data.responsableId !== tarea.responsableId;

        await this.tareaRepository.update(id, data);
        const updated = await this.findTareaById(id);

        // Notificar al JEFE y SECRETARIADO cuando una tarea se completa
        if (data.estado === 'completada' && tarea.estado !== 'completada') {
            this.notificarTareaCompletada(updated).catch(err =>
                this.logger.warn(`Error enviando notificación de tarea completada: ${err?.message}`)
            );
        }

        // Notificar al nuevo responsable cuando se reasigna la tarea
        if (seReasignaResponsable) {
            this.notificarTareaAsignada(updated, true).catch(err =>
                this.logger.warn(`Error enviando notificación de tarea reasignada: ${err?.message}`)
            );
        }

        return updated;
    }

    /**
     * Envía notificación in-app a JEFE_GESTION_LEGAL y SECRETARIADO_GESTION_LEGAL
     * cuando un usuario con rol RESUELVE completa una tarea.
     */
    private async notificarTareaCompletada(tarea: TareaExpediente): Promise<void> {
        const responsable = tarea.responsableNombre || 'Un usuario';
        const expedienteId = tarea.expedienteId;

        const linkExpediente = `${process.env.FRONTEND_URL || 'http://localhost:4200'}/gestion-legal/defensa-judicial?expediente=${encodeURIComponent(expedienteId)}`;

        const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                <h2 style="color: #003DA5;">Notificación de Tarea Completada</h2>
                <p>El usuario <strong>${responsable}</strong> ha completado una tarea en el sistema.</p>
                
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #eee; width: 30%;"><strong>Expediente:</strong></td>
                        <td style="padding: 10px; border-bottom: 1px solid #eee;">${expedienteId}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Tarea:</strong></td>
                        <td style="padding: 10px; border-bottom: 1px solid #eee;">${tarea.titulo}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Fecha de finalización:</strong></td>
                        <td style="padding: 10px; border-bottom: 1px solid #eee;">${tarea.fechaCompletada?.toLocaleString('es-CO') || new Date().toLocaleString('es-CO')}</td>
                    </tr>
                </table>
                
                <div style="text-align: center; margin-top: 30px;">
                    <a href="${linkExpediente}" style="background-color: #003DA5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Ver Expediente</a>
                </div>
                
                <p style="font-size: 12px; color: #666; margin-top: 30px;">
                    Este es un mensaje automatizado desde la Plataforma Integrada ESAP. Por favor, no responda a este correo.
                </p>
            </div>
        `;

        await this.notificationClient.notifyByRoles(
            ['JEFE_GESTION_LEGAL', 'SECRETARIADO_GESTION_LEGAL'],
            {
                tipo_notificacion: 'TAREA_COMPLETADA',
                titulo: '✅ Tarea completada',
                mensaje: `${responsable} ha completado la tarea "${tarea.titulo}" del expediente ${expedienteId}.`,
                descripcion_corta: `Tarea "${tarea.titulo}" completada`,
                icono: 'CheckCircle',
                color: '#10B981',
                prioridad: 'Media',
                categoria: 'gestion-legal',
                tiene_accion: true,
                texto_boton_accion: 'Ver expediente',
                url_accion: `/gestion-legal/defensa-judicial?expediente=${encodeURIComponent(expedienteId)}`,
                datos_adicionales: {
                    tareaId: tarea.id,
                    expedienteId,
                    tareaTitulo: tarea.titulo,
                    completadaPor: responsable,
                    fechaCompletada: tarea.fechaCompletada?.toISOString()
                }
            },
            {
                subject: `Tarea Completada: ${tarea.titulo}`,
                html: emailHtml
            }
        );
        this.logger.log(`Notificación de tarea completada enviada — Tarea: ${tarea.titulo}, Expediente: ${expedienteId}`);
    }

    async deleteTarea(id: string): Promise<void> {
        const tarea = await this.findTareaById(id);
        await this.tareaRepository.remove(tarea);
    }

    // ==================== NOTAS ====================

    async findNotasByExpediente(expedienteId: string): Promise<NotaExpediente[]> {
        return this.notaRepository.find({
            where: { expedienteId },
            order: { createdAt: 'DESC' }
        });
    }

    async findNotaById(id: string): Promise<NotaExpediente> {
        const nota = await this.notaRepository.findOne({
            where: { id }
        });
        if (!nota) throw new NotFoundException('Nota no encontrada');
        return nota;
    }

    async createNota(data: Partial<NotaExpediente>): Promise<NotaExpediente> {
        const nota = this.notaRepository.create(data);
        const saved = await this.notaRepository.save(nota);

        if (saved.expedienteId) {
            this.notificarObservacionProfesional(saved).catch(err =>
                this.logger.warn(`Error enviando notificación de observación: ${err?.message}`)
            );
        }

        return saved;
    }

    private async notificarObservacionProfesional(nota: NotaExpediente): Promise<void> {
        const expediente = await this.expedienteRepository.findOne({
            where: { id: nota.expedienteId },
            select: ['id', 'radicado', 'abogadoSustanciador', 'jurisdiccion', 'tipoProceso'],
        });

        if (!expediente?.abogadoSustanciador) return;

        const autorNombre = nota.autorNombre || 'Un usuario';
        if (nota.autorId === expediente.abogadoSustanciador) return;

        const esDisciplinario =
            expediente.jurisdiccion === 'DISCIPLINARIO' ||
            expediente.jurisdiccion === 'Disciplinaria' ||
            expediente.tipoProceso === 'DISCIPLINARIO' ||
            expediente.tipoProceso === 'Disciplinario';
        const moduloVista = esDisciplinario ? 'juzgamiento' : 'defensa-judicial';

        await this.legalNotifications.notifyObservacionAgregada({
            radicado: expediente.radicado,
            procesoId: expediente.id,
            abogadoId: expediente.abogadoSustanciador,
            autorNombre,
            moduloVista,
        });
    }

    async updateNota(id: string, data: Partial<NotaExpediente>): Promise<NotaExpediente> {
        await this.notaRepository.update(id, data);
        return this.findNotaById(id);
    }

    async deleteNota(id: string): Promise<void> {
        const nota = await this.findNotaById(id);
        await this.notaRepository.remove(nota);
    }
}
