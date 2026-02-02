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
        const expediente = await this.expedienteRepository.findOne({
            where: { radicado },
            relations: ['actuaciones', 'evidencias', 'actors'],
            order: {
                actuaciones: {
                    fechaActuacion: 'DESC'
                }
            }
        });

        if (expediente) {
            // Manual fetch for loose relation: Check both ID (UUID) and Radicado (String)
            expediente.actuaciones = await this.actuacionRepository.find({
                where: [
                    { expedienteId: expediente.id },
                    { expedienteId: expediente.radicado }
                ],
                order: { fechaActuacion: 'DESC' }
            });
        }
        return expediente;
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
        // queryBuilder.leftJoinAndSelect('expediente.actuaciones', 'actuaciones'); // Removed due to loose coupling
        queryBuilder.leftJoinAndSelect('expediente.evidencias', 'evidencias');
        queryBuilder.leftJoinAndSelect('expediente.actors', 'actors');

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

        // Populate actuaciones manually
        // Optimization: Fetch all needed actuaciones in one query
        const ids = entities.map(e => e.id);
        const radicados = entities.map(e => e.radicado).filter(r => r); // Filter out null/undefined radicados

        if (ids.length > 0) {
            const query = this.actuacionRepository.createQueryBuilder('act')
                .where('act.expedienteId IN (:...ids)', { ids });

            if (radicados.length > 0) {
                query.orWhere('act.expedienteId IN (:...radicados)', { radicados });
            }

            const allActuaciones = await query.orderBy('act.fechaActuacion', 'DESC').getMany();

            entities.forEach(entity => {
                // Attach if it matches either ID or Radicado
                entity.actuaciones = allActuaciones.filter(a =>
                    a.expedienteId === entity.id || a.expedienteId === entity.radicado
                );
            });
        }

        return entities.map((entity) => {
            const rawRow = raw.find(r => r.expediente_id === entity.id);
            const count = rawRow ? Number(rawRow.conteo_docs) : 0;
            entity.documentosCount = count;
            if (!entity.actuaciones) entity.actuaciones = [];
            return entity;
        });
    }

    async updateExpediente(id: string, data: Partial<Expediente>): Promise<Expediente> {
        // 1. Obtener estado actual
        const currentExpediente = await this.findOne(id);
        if (!currentExpediente) throw new NotFoundException('Expediente no encontrado');

        // 2. Detectar cambios relevantes (Etapa / Estado)
        if (data.etapaProcesal && data.etapaProcesal !== currentExpediente.etapaProcesal) {
            // Crear actuación automática
            await this.agregarActuacion(id, {
                tipoActuacion: 'CAMBIO_ETAPA',
                descripcion: `Cambio de etapa: ${currentExpediente.etapaProcesal} -> ${data.etapaProcesal}`,
                fechaActuacion: new Date(),
                usuarioResponsable: 'Sistema' // O idealmente el usuario del request si se pasa
            });
        }

        if (data.estado && data.estado !== currentExpediente.estado) {
            await this.agregarActuacion(id, {
                tipoActuacion: 'CAMBIO_ESTADO',
                descripcion: `Cambio de estado: ${currentExpediente.estado} -> ${data.estado}`,
                fechaActuacion: new Date(),
                usuarioResponsable: 'Sistema'
            });
        }

        // 3. Actualizar
        await this.expedienteRepository.update(id, data);
        const updated = await this.findOne(id);
        if (!updated) throw new Error('Expediente no encontrado post-update');
        return updated;
    }

    async findOne(id: string): Promise<Expediente | null> {
        // Validation: If ID is not a UUID, return null immediately to avoid DB errors
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(id)) {
            return null;
        }

        const expediente = await this.expedienteRepository.findOne({
            where: { id },
            relations: ['actuaciones', 'evidencias', 'actors'],
            order: {
                actuaciones: {
                    fechaActuacion: 'DESC'
                }
            }
        });

        if (expediente) {
            // Manual fetch for loose relation: Check both ID (UUID) and Radicado (String)
            expediente.actuaciones = await this.actuacionRepository.find({
                where: [
                    { expedienteId: id },          // Check UUID
                    { expedienteId: expediente.radicado } // Check Radicado
                ],
                order: { fechaActuacion: 'DESC' }
            });
        }
        return expediente;
    }

    async findOneOrCreateFromDisciplinaryProcess(id: string): Promise<Expediente> {
        // First, try to find in legal_management
        let expediente = await this.findOne(id);
        if (expediente) return expediente;

        // If not found, check if it's a disciplinary process
        const disciplinaryProcess = await this.expedienteRepository.query(`
            SELECT dp.id, dp."radicadoProceso", dn."disciplinable"->>'nombre' as demandado, dn."disciplinable"->>'dependencia' as dependencia
            FROM internal_disciplinary_control.disciplinary_processes dp
            JOIN internal_disciplinary_control.disciplinary_news dn ON dp."newsId" = dn.id
            WHERE dp.id = $1
        `, [id]);

        if (disciplinaryProcess.length === 0) {
            throw new NotFoundException('Expediente no encontrado');
        }

        const process = disciplinaryProcess[0];

        // Create the expediente in legal_management
        const newExpediente = await this.crearExpediente({
            id: process.id,
            radicado: process.radicadoProceso,
            jurisdiccion: 'DISCIPLINARIO',
            tipoProceso: 'DISCIPLINARIO',
            demandante: 'ESAP',
            demandado: process.demandado || 'Desconocido',
            estado: 'ACTIVO',
            fechaRadicacion: new Date(),
            dependenciaInvestigado: process.dependencia || 'Desconocida',
            etapaProcesal: 'INDAGACION_PREVIA'
        });

        return newExpediente;
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

    async deleteExpediente(id: string): Promise<void> {
        const result = await this.expedienteRepository.delete(id);
        if (result.affected === 0) {
            throw new NotFoundException(`Expediente con ID ${id} no encontrado`);
        }
    }
}
