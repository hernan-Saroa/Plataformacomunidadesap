import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Expediente } from '../entities/expediente.entity';
import { Actuacion } from '../entities/actuacion.entity';
import { Documento } from '../entities/documento.entity';
import { Evidencia } from '../entities/evidencia.entity';
import { DecisionDisciplinaria } from '../entities/decision-disciplinaria.entity';
import { ExcepcionProcesal, TipoExcepcion, EstadoExcepcion } from '../entities/excepcion-procesal.entity';

@Injectable()
export class ExpedienteService {
    constructor(
        @InjectRepository(Expediente)
        private expedienteRepository: Repository<Expediente>,
        @InjectRepository(Actuacion)
        private actuacionRepository: Repository<Actuacion>,
        @InjectRepository(DecisionDisciplinaria)
        private decisionRepository: Repository<DecisionDisciplinaria>,
        @InjectRepository(ExcepcionProcesal)
        private excepcionRepository: Repository<ExcepcionProcesal>
    ) { }

    async findOneByRadicado(radicado: string): Promise<Expediente | null> {
        return this.expedienteRepository.findOne({
            where: { radicado },
            relations: ['actuaciones', 'evidencias'],
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

        await this.expedienteRepository.update(expedienteId, {
            // UpdatedAt handled by TypeORM
        });

        return saved;
    }

    async createDecision(expedienteId: string, data: Partial<DecisionDisciplinaria>): Promise<DecisionDisciplinaria> {
        const expediente = await this.findOne(expedienteId);
        if (!expediente) throw new NotFoundException('Expediente no encontrado');

        const nuevaDecision = this.decisionRepository.create({
            ...data,
            expedienteId: expediente.id,
            fecha: new Date().toISOString()
        });

        return this.decisionRepository.save(nuevaDecision);
    }

    async getDecisions(expedienteId: string): Promise<DecisionDisciplinaria[]> {
        return this.decisionRepository.find({
            where: { expedienteId },
            order: { fecha: 'DESC' }
        });
    }

    async crearExpediente(data: Partial<Expediente>): Promise<Expediente> {
        if (data.radicado) {
            const existing = await this.expedienteRepository.findOne({ where: { radicado: data.radicado } });
            if (existing) {
                throw new ConflictException(`El radicado ${data.radicado} ya existe.`);
            }
        }

        if (!data.estado) data.estado = 'ACTIVO';
        if (!data.etapaProcesal) data.etapaProcesal = 'RADICACION';

        if (data.fechaNotificacion && data.terminoProcesalDias) {
            const fechaNotif = new Date(data.fechaNotificacion);
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
            if (day !== 0 && day !== 6) {
                addedDays++;
            }
        }
        return currentDate;
    }

    async listarExpedientes(filtros: { estado?: string; jurisdiccion?: string; search?: string }): Promise<Expediente[]> {
        const queryBuilder = this.expedienteRepository.createQueryBuilder('expediente');
        queryBuilder.leftJoinAndSelect('expediente.actuaciones', 'actuaciones');
        queryBuilder.leftJoinAndSelect('expediente.evidencias', 'evidencias');

        queryBuilder.addSelect((subQuery) => {
            return subQuery
                .select("COUNT(doc.id)", "count")
                .from(Documento, "doc")
                .where("doc.expedienteId = expediente.id");
        }, "conteo_docs");

        if (filtros.estado) {
            queryBuilder.andWhere('expediente.estado = :estado', { estado: filtros.estado });
        }

        if (filtros.jurisdiccion) {
            queryBuilder.andWhere('expediente.jurisdiccion = :jurisdiccion', { jurisdiccion: filtros.jurisdiccion });
        }

        if (filtros.search) {
            queryBuilder.andWhere('(expediente.radicado ILIKE :search OR expediente.demandante ILIKE :search OR expediente.demandado ILIKE :search)', { search: `%${filtros.search}%` });
        }

        const { entities, raw } = await queryBuilder.orderBy('expediente.createdAt', 'DESC').getRawAndEntities();

        return entities.map((entity) => {
            const rawRow = raw.find(r => r.expediente_id === entity.id);
            const count = rawRow ? Number(rawRow.conteo_docs) : 0;
            entity.documentosCount = count;
            return entity;
        });
    }

    async updateExpediente(id: string, data: Partial<Expediente>): Promise<Expediente> {
        await this.expedienteRepository.update(id, data);
        const updated = await this.findOne(id);
        if (!updated) throw new Error('Expediente no encontrado post-update');
        return updated;
    }

    async findOne(id: string): Promise<Expediente | null> {
        return this.expedienteRepository.findOne({
            where: { id },
            relations: ['actuaciones', 'evidencias'],
            order: {
                actuaciones: {
                    fechaActuacion: 'DESC'
                }
            }
        });
    }

    // ==================== EXCEPCIONES PROCESALES ====================

    async getExcepciones(expedienteId: string): Promise<ExcepcionProcesal[]> {
        return this.excepcionRepository.find({
            where: { expedienteId },
            order: { fechaPresentacion: 'DESC' }
        });
    }

    async createExcepcion(expedienteId: string, data: {
        tipo: TipoExcepcion;
        descripcion: string;
        fundamento?: string;
        presentadoPor?: string;
    }): Promise<ExcepcionProcesal> {
        const expediente = await this.findOne(expedienteId);
        if (!expediente) throw new NotFoundException('Expediente no encontrado');

        const nuevaExcepcion = this.excepcionRepository.create({
            ...data,
            expedienteId: expediente.id,
            estado: 'PENDIENTE',
            fechaPresentacion: new Date().toISOString().split('T')[0]
        });

        return this.excepcionRepository.save(nuevaExcepcion);
    }

    async resolverExcepcion(excepcionId: string, data: {
        estado: EstadoExcepcion;
        resolucion: string;
    }): Promise<ExcepcionProcesal> {
        const excepcion = await this.excepcionRepository.findOne({ where: { id: excepcionId } });
        if (!excepcion) throw new NotFoundException('Excepción no encontrada');

        excepcion.estado = data.estado;
        excepcion.resolucion = data.resolucion;
        excepcion.fechaResolucion = new Date().toISOString().split('T')[0];

        return this.excepcionRepository.save(excepcion);
    }
}
