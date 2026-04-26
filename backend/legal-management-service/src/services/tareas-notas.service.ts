import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TareaExpediente } from '../entities/tarea-expediente.entity';
import { NotaExpediente } from '../entities/nota-expediente.entity';
import { NotificationClientService } from './notification-client.service';

@Injectable()
export class TareasNotasService {
    private readonly logger = new Logger(TareasNotasService.name);

    constructor(
        @InjectRepository(TareaExpediente)
        private readonly tareaRepository: Repository<TareaExpediente>,
        @InjectRepository(NotaExpediente)
        private readonly notaRepository: Repository<NotaExpediente>,
        private readonly notificationClient: NotificationClientService
    ) { }

    // ==================== TAREAS ====================

    async findTareasByExpediente(expedienteId: string): Promise<TareaExpediente[]> {
        return this.tareaRepository.find({
            where: { expedienteId },
            relations: ['responsable'],
            order: { fechaVencimiento: 'ASC' }
        });
    }

    async findTareaById(id: string): Promise<TareaExpediente> {
        const tarea = await this.tareaRepository.findOne({
            where: { id },
            relations: ['responsable']
        });
        if (!tarea) throw new NotFoundException('Tarea no encontrada');
        return tarea;
    }

    async createTarea(data: Partial<TareaExpediente>): Promise<TareaExpediente> {
        const tarea = this.tareaRepository.create({
            ...data,
            fechaCreacion: new Date()
        });
        return this.tareaRepository.save(tarea);
    }

    async updateTarea(id: string, data: Partial<TareaExpediente>): Promise<TareaExpediente> {
        const tarea = await this.findTareaById(id);

        // If completing task, set completion date
        if (data.estado === 'completada' && tarea.estado !== 'completada') {
            data.fechaCompletada = new Date();
        }

        await this.tareaRepository.update(id, data);
        const updated = await this.findTareaById(id);

        // Notificar al JEFE y SECRETARIADO cuando una tarea se completa
        if (data.estado === 'completada' && tarea.estado !== 'completada') {
            this.notificarTareaCompletada(updated).catch(err =>
                this.logger.warn(`Error enviando notificación de tarea completada: ${err?.message}`)
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
            ['JEFE_GESTION_LEGAL'],
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
            relations: ['autor'],
            order: { createdAt: 'DESC' }
        });
    }

    async findNotaById(id: string): Promise<NotaExpediente> {
        const nota = await this.notaRepository.findOne({
            where: { id },
            relations: ['autor']
        });
        if (!nota) throw new NotFoundException('Nota no encontrada');
        return nota;
    }

    async createNota(data: Partial<NotaExpediente>): Promise<NotaExpediente> {
        const nota = this.notaRepository.create(data);
        return this.notaRepository.save(nota);
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
