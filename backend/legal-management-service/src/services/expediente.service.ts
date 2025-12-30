import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Expediente } from '../entities/expediente.entity';
import { Actuacion } from '../entities/actuacion.entity';
import { Documento } from '../entities/documento.entity';

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
        queryBuilder.leftJoinAndSelect('expediente.actuaciones', 'actuaciones');

        // Subquery EXPLÍCITA para contar documentos reales
        // Usamos el nombre de la tabla y schema si es necesario, pero usando Entity class es mejor
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

        // Al usar addSelect con propiedades raw, getMany las ignora y solo devuelve entity.
        // Tenemos que usar getRawAndEntities o mapear manualmente si forzamos la propiedad.
        // Pero getMany() NO puebla propiedades que no son columnas.
        // El truco de loadRelationCountAndMap era ese.
        // Si uso addSelect, debo usar getRawAndEntities().

        const { entities, raw } = await queryBuilder.orderBy('expediente.createdAt', 'DESC').getRawAndEntities();

        // Mapear el conteo desde raw a la entidad
        return entities.map((entity) => {
            // Buscar en raw usando el ID del expediente.
            // TypeORM suele devolver 'expediente_id' para 'expediente.id' en raw results.
            const rawRow = raw.find(r => r.expediente_id === entity.id);

            // Si no lo encuentra por expediente_id, intentamos buscar una propiedad que contenga el conteo y coincidencia
            // Pero conteo_docs vendrá en todas las filas del group

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
