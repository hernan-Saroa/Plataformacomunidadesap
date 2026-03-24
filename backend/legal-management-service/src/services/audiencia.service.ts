import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Audiencia } from '../entities/audiencia.entity';
import { CreateAudienciaDto, AudienciaDTO } from '../dtos/audiencia.dto';
import { Abogado } from '../entities/abogado.entity';
import { Expediente } from '../entities/expediente.entity';

import { ActuacionService } from './actuacion.service';

@Injectable()
export class AudienciaService {
    private readonly logger = new Logger(AudienciaService.name);

    constructor(
        @InjectRepository(Audiencia)
        private audienciaRepo: Repository<Audiencia>,
        @InjectRepository(Abogado)
        private abogadoRepo: Repository<Abogado>,
        @InjectRepository(Expediente)
        private expedienteRepo: Repository<Expediente>,
        private actuacionService: ActuacionService,
    ) { }

    async update(id: string, data: any): Promise<Audiencia> {
        const audiencia = await this.audienciaRepo.findOne({
            where: { id },
            relations: ['expediente', 'abogado']
        });
        if (!audiencia) throw new NotFoundException('Audiencia no encontrada');

        const previousDate = audiencia.fechaHoraInicio;

        // Actualizar campos básicos
        Object.assign(audiencia, {
            tipo: data.tipo || audiencia.titulo,
            titulo: data.titulo || audiencia.titulo,
            fechaHoraInicio: data.fechaHoraInicio ? new Date(data.fechaHoraInicio) : audiencia.fechaHoraInicio,
            duracionMinutos: data.duracionMinutos || audiencia.duracionMinutos,
            modalidad: data.modalidad || audiencia.modalidad,
            ubicacion: data.ubicacion || audiencia.ubicacion,
            linkReunion: data.linkReunion || audiencia.linkReunion,
            notasPreparacion: data.notasPreparacion || audiencia.notasPreparacion,
            abogadoId: data.abogadoId || audiencia.abogadoId,
            estado: data.estado || audiencia.estado
        });

        // Appending to historial if reassignment
        if (data.motivoReasignacion) {
            const nuevoEvento = {
                fechaOriginal: previousDate,
                fechaNueva: audiencia.fechaHoraInicio,
                motivo: data.motivoReasignacion,
                detalle: data.detalleReasignacion,
                registradoPor: 'Usuario Sistema',
                fechaRegistro: new Date().toISOString()
            };
            audiencia.historial = [...(audiencia.historial || []), nuevoEvento];
        }

        const saved = await this.audienciaRepo.save(audiencia);

        // LOG DE REASIGNACIÓN (Si viene el motivo)
        if (data.motivoReasignacion) {
            await this.actuacionService.registrarEventoAutomatico(
                audiencia.expedienteId,
                'AUDIENCIA REASIGNADA',
                `Audiencia: ${saved.titulo}\nReasignada por: ${data.motivoReasignacion}.\nNueva fecha: ${new Date(saved.fechaHoraInicio).toLocaleString()}.\nDetalle: ${data.detalleReasignacion || 'Sin detalle adicional'}`,
                'AUDIENCIA',
                saved.id,
                { ...data, tipoEvento: 'REASIGNACION' },
                saved.abogado?.nombreCompleto || 'Sistema'
            );
        }

        return saved;
    }

    async delete(id: string): Promise<void> {
        const audiencia = await this.audienciaRepo.findOne({
            where: { id },
            relations: ['abogado']
        });

        if (!audiencia) {
            throw new NotFoundException('Audiencia no encontrada');
        }

        await this.audienciaRepo.remove(audiencia);

        // LOG DE ELIMINACIÓN
        await this.actuacionService.registrarEventoAutomatico(
            audiencia.expedienteId,
            'AUDIENCIA ELIMINADA',
            `Se ha eliminado la audiencia: ${audiencia.titulo}.\nFecha original: ${new Date(audiencia.fechaHoraInicio).toLocaleString()}`,
            'AUDIENCIA',
            audiencia.id, // ID might be kept in log even if entity is gone, or use null
            { tipoEvento: 'ELIMINACION', titulo: audiencia.titulo },
            'Usuario Sistema' // TODO: Get info if possible
        );
    }

    async create(dto: CreateAudienciaDto): Promise<Audiencia> {
        const expediente = await this.expedienteRepo.findOne({ where: { id: dto.expedienteId } });
        if (!expediente) throw new NotFoundException('Expediente no encontrado');

        const abogado = await this.abogadoRepo.findOne({ where: { id: dto.abogadoId } });
        if (!abogado) throw new NotFoundException('Abogado no encontrado');

        // Conflict Validation
        const end = new Date(new Date(dto.fechaHoraInicio).getTime() + dto.duracionMinutos * 60000);

        // Basic overlap check: (StartA <= EndB) and (EndA >= StartB)
        const conflicto = await this.audienciaRepo.createQueryBuilder('a')
            .where('a.abogado_id = :aid', { aid: dto.abogadoId })
            .andWhere('a.fecha_hora_inicio < :end', { end })
            .andWhere("a.fecha_hora_inicio + (a.duracion_minutos || ' minutes')::interval > :start", { start: dto.fechaHoraInicio })
            .getOne();

        if (conflicto) {
            throw new BadRequestException('El abogado ya tiene una audiencia en ese horario');
        }

        const audiencia = this.audienciaRepo.create(dto);
        const saved = await this.audienciaRepo.save(audiencia);

        // REGISTRO AUTOMÁTICO EN HISTORIAL UNIFICADO
        await this.actuacionService.registrarEventoAutomatico(
            dto.expedienteId,
            'AUDIENCIA PROGRAMADA',
            `Audiencia: ${dto.titulo} (${dto.modalidad}). Fecha: ${new Date(dto.fechaHoraInicio).toLocaleString()}`,
            'AUDIENCIA',
            saved.id,
            {
                modalidad: dto.modalidad,
                ubicacion: dto.ubicacion,
                linkReunion: dto.linkReunion,
                duracionMinutos: dto.duracionMinutos
            },
            abogado.nombreCompleto
        );

        // ENVIAR NOTIFICACIÓN AL ENCARGADO
        if (abogado.email) {
            try {
                const mailPayload = {
                    to: abogado.email,
                    subject: `Nueva audiencia programada: ${dto.titulo}`,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                            <h2 style="color: #003DA5;">Notificación de Audiencia Programada</h2>
                            <p>Estimado(a) <strong>${abogado.nombreCompleto}</strong>,</p>
                            <p>Se le informa que ha sido asignado(a) a una nueva audiencia en el expediente <strong>${expediente.radicado || expediente.id}</strong>.</p>
                            
                            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                                <tr>
                                    <td style="padding: 10px; border-bottom: 1px solid #eee; width: 30%;"><strong>Título:</strong></td>
                                    <td style="padding: 10px; border-bottom: 1px solid #eee;">${dto.titulo}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Fecha y Hora:</strong></td>
                                    <td style="padding: 10px; border-bottom: 1px solid #eee;">${new Date(dto.fechaHoraInicio).toLocaleString('es-CO')}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Modalidad:</strong></td>
                                    <td style="padding: 10px; border-bottom: 1px solid #eee;">${dto.modalidad}</td>
                                </tr>
                                ${dto.ubicacion ? `
                                <tr>
                                    <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Lugar:</strong></td>
                                    <td style="padding: 10px; border-bottom: 1px solid #eee;">${dto.ubicacion}</td>
                                </tr>` : ''}
                                ${dto.linkReunion ? `
                                <tr>
                                    <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Enlace virtual:</strong></td>
                                    <td style="padding: 10px; border-bottom: 1px solid #eee;"><a href="${dto.linkReunion}" style="color: #003DA5;">Vincularse con este enlace</a></td>
                                </tr>` : ''}
                            </table>
                            
                            <p style="font-size: 12px; color: #666; margin-top: 30px;">
                                Este es un mensaje automatizado desde la Plataforma Integrada ESAP. Por favor, no responda a este correo.
                            </p>
                        </div>
                    `
                };

                // Síncrono esperado para notificar status al front
                const res = await fetch('http://localhost:3009/api/v1/emails/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(mailPayload)
                });

                if (!res.ok) {
                    this.logger.error(`Fallo envío notificación HTTP ${res.status}`);
                    (saved as any)._notificationError = true;
                } else {
                    this.logger.log(`Notificación de audiencia enviada a ${abogado.email}`);
                    (saved as any)._notificationError = false;
                }
            } catch (err) {
                this.logger.error('Error estructurando o enviando notificación al abogado', err);
                (saved as any)._notificationError = true;
            }
        }

        return saved;
    }

    async findAll(start?: Date, end?: Date, expedienteId?: string): Promise<AudienciaDTO[]> {
        const where: any = {};
        if (start && end) {
            where.fechaHoraInicio = Between(start, end);
        }
        if (expedienteId) {
            where.expedienteId = expedienteId;
        }

        const audiencias = await this.audienciaRepo.find({
            where,
            relations: ['expediente', 'abogado'],
            order: { fechaHoraInicio: 'ASC' }
        });

        return audiencias.map(a => ({
            id: a.id,
            titulo: a.titulo,
            fechaHoraInicio: a.fechaHoraInicio,
            duracionMinutos: a.duracionMinutos,
            modalidad: a.modalidad,
            ubicacion: a.ubicacion,
            linkReunion: a.linkReunion,
            estado: a.estado,
            notasPreparacion: a.notasPreparacion,
            expedienteId: a.expedienteId,
            radicado: a.expediente ? a.expediente.radicado : 'N/A',
            nombreInvestigado: a.expediente ? a.expediente.demandante : 'N/A',
            abogadoId: a.abogadoId,
            nombreAbogado: a.abogado ? a.abogado.nombreCompleto : 'N/A',
            historial: a.historial || [] // Include historial
        }));
    }

    async getDashboardStats() {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);

        const audienciasHoy = await this.audienciaRepo.count({
            where: { fechaHoraInicio: Between(startOfDay, endOfDay) }
        });

        const estaSemana = await this.audienciaRepo.count({
            where: { fechaHoraInicio: Between(startOfWeek, endOfWeek) }
        });

        const totalVirtuales = await this.audienciaRepo.count({ where: { modalidad: 'VIRTUAL' } });
        const totalPresenciales = await this.audienciaRepo.count({ where: { modalidad: 'PRESENCIAL' } });

        return { audienciasHoy, estaSemana, totalVirtuales, totalPresenciales };
    }
}
