import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Audiencia } from '../entities/audiencia.entity';
import { CreateAudienciaDto, AudienciaDTO } from '../dtos/audiencia.dto';
import { Abogado } from '../entities/abogado.entity';
import { Expediente } from '../entities/expediente.entity';

import { ActuacionService } from './actuacion.service';

@Injectable()
export class AudienciaService {
    constructor(
        @InjectRepository(Audiencia)
        private audienciaRepo: Repository<Audiencia>,
        @InjectRepository(Abogado)
        private abogadoRepo: Repository<Abogado>,
        @InjectRepository(Expediente)
        private expedienteRepo: Repository<Expediente>,
        private actuacionService: ActuacionService,
    ) { }

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

        return saved;
    }

    async findAll(start?: Date, end?: Date): Promise<AudienciaDTO[]> {
        const where: any = {};
        if (start && end) {
            where.fechaHoraInicio = Between(start, end);
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
            nombreInvestigado: a.expediente ? a.expediente.demandante : 'N/A', // Assuming demandante is 'Investigado' based on previous context
            abogadoId: a.abogadoId,
            nombreAbogado: a.abogado ? a.abogado.nombreCompleto : 'N/A'
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
