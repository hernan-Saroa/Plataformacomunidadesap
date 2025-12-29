import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Expediente } from '../entities/expediente.entity';
import { Actuacion } from '../entities/actuacion.entity';

@Injectable()
export class ExpedienteService {
    constructor(
        @InjectRepository(Expediente)
        private expedienteRepository: Repository<Expediente>,
        @InjectRepository(Actuacion)
        private actuacionRepository: Repository<Actuacion>,
    ) { }

    // ... (existing methods like crearExpediente)

    async findOneByRadicado(radicado: string): Promise<Expediente | null> {
        return this.expedienteRepository.findOne({
            where: { radicado },
            relations: ['actuaciones'],
            order: {
                actuaciones: {
                    fechaActuacion: 'DESC'
                }
            }
        });
    }

    async agregarActuacion(expedienteId: string, data: Partial<Actuacion>): Promise<Actuacion> {
        const expediente = await this.findOne(expedienteId);
        if (!expediente) throw new NotFoundException('Expediente no encontrado');

        const nuevaActuacion = this.actuacionRepository.create({
            ...data,
            expedienteId: expediente.id,
            fechaActuacion: new Date()
        });

        const saved = await this.actuacionRepository.save(nuevaActuacion);

        // Update expediente ultima actuacion fields if needed
        await this.expedienteRepository.update(expedienteId, {
            // UpdatedAt handled by TypeORM
        });

        return saved;
    }

    // ... (rest of methods)

    async crearExpediente(data: Partial<Expediente>): Promise<Expediente> {
        // Validar radicado único
        if (data.radicado) {
            const existing = await this.expedienteRepository.findOne({ where: { radicado: data.radicado } });
            if (existing) {
                throw new ConflictException(`El radicado ${data.radicado} ya existe.`);
            }
        }

        // Mapeo automático de campos adicionales
        // Calcular estado inicial/etapa si no vienen
        if (!data.estado) data.estado = 'ACTIVO';
        if (!data.etapaProcesal) data.etapaProcesal = 'RADICACION';

        // Calcular Fecha Vencimiento (Días Hábiles)
        if (data.fechaNotificacion && data.terminoProcesalDias) {
            const fechaNotif = new Date(data.fechaNotificacion);
            // El término comienza a contar desde el día siguiente hábil, simplificamos a sumar días hábiles
            data.fechaVencimientoTermino = this.addBusinessDays(fechaNotif, Number(data.terminoProcesalDias));
        }

        const nuevoExpediente = this.expedienteRepository.create(data);
        return this.expedienteRepository.save(nuevoExpediente);
    }

    private addBusinessDays(startDate: Date, days: number): Date {
        let currentDate = new Date(startDate);
        let addedDays = 0;
        while (addedDays < days) {
            currentDate.setDate(currentDate.getDate() + 1);
            const day = currentDate.getDay();
            if (day !== 0 && day !== 6) { // 0=Sun, 6=Sat
                addedDays++;
            }
        }
        return currentDate;
    }

    async listarExpedientes(filtros: { estado?: string; jurisdiccion?: string; search?: string }): Promise<Expediente[]> {
        const queryBuilder = this.expedienteRepository.createQueryBuilder('expediente');
        queryBuilder.leftJoinAndSelect('expediente.actuaciones', 'actuaciones'); // Eager load for lists too if needed

        if (filtros.estado) {
            queryBuilder.andWhere('expediente.estado = :estado', { estado: filtros.estado });
        }

        if (filtros.jurisdiccion) {
            queryBuilder.andWhere('expediente.jurisdiccion = :jurisdiccion', { jurisdiccion: filtros.jurisdiccion });
        }

        if (filtros.search) {
            queryBuilder.andWhere('(expediente.radicado ILIKE :search OR expediente.demandante ILIKE :search OR expediente.demandado ILIKE :search)', { search: `%${filtros.search}%` });
        }

        return queryBuilder.orderBy('expediente.createdAt', 'DESC').getMany();
    }

    async updateExpediente(id: string, data: Partial<Expediente>): Promise<Expediente> {
        await this.expedienteRepository.update(id, data);
        const updated = await this.findOne(id);
        if (!updated) throw new Error('Expediente no encontrado post-update');
        return updated;
    }

    async findOne(id: string): Promise<Expediente | null> {
        // Incluir actuaciones
        return this.expedienteRepository.findOne({
            where: { id },
            relations: ['actuaciones'],
            order: {
                actuaciones: {
                    fechaActuacion: 'DESC' // Más recientes primero
                }
            }
        });
    }
}
