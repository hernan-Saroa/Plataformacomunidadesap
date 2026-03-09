import { Injectable, ConflictException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Expediente } from '../entities/expediente.entity';
import { Actuacion } from '../entities/actuacion.entity';
import { Documento } from '../entities/documento.entity';
import { Evidencia } from '../entities/evidencia.entity';
import { DecisionDisciplinaria } from '../entities/decision-disciplinaria.entity';
import { ExcepcionProcesal, TipoExcepcion, EstadoExcepcion } from '../entities/excepcion-procesal.entity';
import { TareaExpediente } from '../entities/tarea-expediente.entity';
import { NotaExpediente } from '../entities/nota-expediente.entity';
import { Audiencia } from '../entities/audiencia.entity';
import { Acta } from '../entities/acta.entity';
import { ConfigurationsService } from './configurations.service';

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
        private excepcionRepository: Repository<ExcepcionProcesal>,
        private readonly configService: ConfigurationsService
    ) { }

    async findOneByRadicado(radicado: string): Promise<Expediente | null> {
        const expediente = await this.expedienteRepository.findOne({
            where: { radicado },
            relations: ['evidencias', 'actors']
            // Note: actuaciones loaded manually due to loose coupling
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
            const tipoConteo = data.tipoConteoTermino || 'HABILES';

            if (tipoConteo === 'CALENDARIO') {
                const vencimiento = new Date(fechaNotif);
                vencimiento.setDate(vencimiento.getDate() + Number(data.terminoProcesalDias));
                data.fechaVencimientoTermino = vencimiento;
            } else {
                data.fechaVencimientoTermino = this.addBusinessDays(fechaNotif, Number(data.terminoProcesalDias));
            }
        }

        if (!data.fechaPrescripcion && (data.jurisdiccion === 'DISCIPLINARIO' || data.jurisdiccion === 'Disciplinaria' || data.tipoProceso === 'DISCIPLINARIO')) {
            try {
                const config = await this.configService.findByKey('prescripcion_juzgamiento');
                const years = config?.value?.years ?? 5;
                const baseDate = data.fechaRadicacion ? new Date(data.fechaRadicacion) : new Date();
                const fechaPrescripcion = new Date(baseDate);
                fechaPrescripcion.setFullYear(fechaPrescripcion.getFullYear() + years);
                data.fechaPrescripcion = fechaPrescripcion;
                Logger.log(`[ExpedienteService] Asignada fecha_prescripcion automática (${years} años): ${fechaPrescripcion.toISOString()}`);
            } catch (error) {
                Logger.warn('[ExpedienteService] No se pudo calcular fecha_prescripcion automáticamente', error);
            }
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
        queryBuilder.leftJoinAndSelect('expediente.procesosAnexados', 'procesosAnexados', "procesosAnexados.estadoArchivo = 'ACTIVO'");
        queryBuilder.leftJoinAndSelect('procesosAnexados.actors', 'procesosAnexadosActors');

        // Solo mostrar expedientes activos en el Kanban (no archivados ni eliminados)
        queryBuilder.andWhere("expediente.estadoArchivo = 'ACTIVO'");

        // No mostrar expedientes anexados como tarjetas independientes en el Kanban
        queryBuilder.andWhere("expediente.procesoPrincipalId IS NULL");

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
            relations: ['evidencias', 'actors', 'procesosAnexados', 'procesosAnexados.actors']
            // Note: actuaciones loaded manually due to loose coupling
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

            // Filter out archived/deleted procesos anexados
            if (expediente.procesosAnexados) {
                expediente.procesosAnexados = expediente.procesosAnexados.filter(p => p.estadoArchivo === 'ACTIVO');
            }
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

    // ==================== MÉTODOS DE ARCHIVO/ELIMINADO ====================

    /**
     * Obtener expedientes archivados y eliminados
     */
    async getExpedientesArchivados(): Promise<Expediente[]> {
        return this.expedienteRepository.find({
            where: [
                { estadoArchivo: 'ARCHIVADO' },
                { estadoArchivo: 'ELIMINADO' }
            ],
            order: { fechaArchivo: 'DESC' },
            relations: ['actors']
        });
    }

    /**
     * Archivar un expediente (permanece en BD pero sale del Kanban)
     * También archiva en cascada todos sus procesos anexados.
     */
    async archivarExpediente(id: string, motivo: string, usuario: string): Promise<Expediente> {
        const expediente = await this.expedienteRepository.findOne({
            where: { id },
            relations: ['procesosAnexados']
        });

        if (!expediente) throw new NotFoundException(`Expediente con ID ${id} no encontrado`);

        const fechaArchivo = new Date();

        // Archivar el expediente principal
        expediente.estadoArchivo = 'ARCHIVADO';
        expediente.fechaArchivo = fechaArchivo;
        expediente.usuarioArchivo = usuario;
        expediente.motivoArchivo = motivo;

        await this.expedienteRepository.save(expediente);

        // Archivar en cascada los procesos anexados
        if (expediente.procesosAnexados && expediente.procesosAnexados.length > 0) {
            for (const anexado of expediente.procesosAnexados) {
                anexado.estadoArchivo = 'ARCHIVADO';
                anexado.fechaArchivo = fechaArchivo;
                anexado.usuarioArchivo = usuario;
                anexado.motivoArchivo = `Archivado en cascada junto con proceso principal ${expediente.radicado}: ${motivo}`;
                await this.expedienteRepository.save(anexado);

                await this.agregarActuacion(anexado.id, {
                    tipoActuacion: 'ARCHIVO_CASCADA',
                    descripcion: `El expediente fue archivado automáticamente al archivar su proceso principal (${expediente.radicado}).`,
                    usuarioResponsable: usuario
                });
            }
        }

        return expediente;
    }

    /**
     * Eliminar un expediente (soft delete - va a papelera)
     * También elimina en cascada todos sus procesos anexados.
     */
    async eliminarExpedienteSoft(id: string, motivo: string, usuario: string): Promise<Expediente> {
        const expediente = await this.expedienteRepository.findOne({
            where: { id },
            relations: ['procesosAnexados']
        });

        if (!expediente) throw new NotFoundException(`Expediente con ID ${id} no encontrado`);

        const fechaArchivo = new Date();

        // Eliminar lógicamente el expediente principal
        expediente.estadoArchivo = 'ELIMINADO';
        expediente.fechaArchivo = fechaArchivo;
        expediente.usuarioArchivo = usuario;
        expediente.motivoArchivo = motivo;

        await this.expedienteRepository.save(expediente);

        // Eliminar lógicamente en cascada los procesos anexados
        if (expediente.procesosAnexados && expediente.procesosAnexados.length > 0) {
            for (const anexado of expediente.procesosAnexados) {
                anexado.estadoArchivo = 'ELIMINADO';
                anexado.fechaArchivo = fechaArchivo;
                anexado.usuarioArchivo = usuario;
                anexado.motivoArchivo = `Eliminado en cascada junto con proceso principal ${expediente.radicado}: ${motivo}`;
                await this.expedienteRepository.save(anexado);

                await this.agregarActuacion(anexado.id, {
                    tipoActuacion: 'ELIMINACION_CASCADA',
                    descripcion: `El expediente fue eliminado lógicamente de forma automática al eliminar su proceso principal (${expediente.radicado}).`,
                    usuarioResponsable: usuario
                });
            }
        }

        return expediente;
    }

    /**
     * Restaurar un expediente archivado o eliminado al Kanban
     * También restaura en cascada sus procesos anexados directamente vinculados a él en el mismo momento.
     */
    async restaurarExpediente(id: string): Promise<Expediente> {
        const expediente = await this.expedienteRepository.findOne({
            where: { id },
            relations: ['procesosAnexados']
        });

        if (!expediente) throw new NotFoundException(`Expediente con ID ${id} no encontrado`);

        // Restaurar expediente principal
        expediente.estadoArchivo = 'ACTIVO';
        expediente.fechaArchivo = null as any;
        expediente.usuarioArchivo = null as any;
        expediente.motivoArchivo = null as any;

        await this.expedienteRepository.save(expediente);

        // Restaurar en cascada
        if (expediente.procesosAnexados && expediente.procesosAnexados.length > 0) {
            for (const anexado of expediente.procesosAnexados) {
                // Solo restaurar si estaban archivados/eliminados
                if (anexado.estadoArchivo !== 'ACTIVO') {
                    anexado.estadoArchivo = 'ACTIVO';
                    anexado.fechaArchivo = null as any;
                    anexado.usuarioArchivo = null as any;
                    anexado.motivoArchivo = null as any;
                    await this.expedienteRepository.save(anexado);

                    await this.agregarActuacion(anexado.id, {
                        tipoActuacion: 'RESTAURACION_CASCADA',
                        descripcion: `El expediente fue restaurado automáticamente al restaurar su proceso principal (${expediente.radicado}).`,
                        usuarioResponsable: 'Sistema'
                    });
                }
            }
        }

        return expediente;
    }

    /**
     * Anexar un expediente a otro (proceso principal)
     */
    async anexarExpediente(anexadoId: string, principalId: string, usuario: string): Promise<Expediente> {
        const principal = await this.findOne(principalId);
        if (!principal) throw new NotFoundException(`Expediente principal con ID ${principalId} no encontrado`);

        const anexado = await this.expedienteRepository.findOne({
            where: { id: anexadoId },
            relations: ['procesosAnexados']
        });
        if (!anexado) throw new NotFoundException(`Expediente a anexar con ID ${anexadoId} no encontrado`);

        if (anexado.procesosAnexados && anexado.procesosAnexados.length > 0) {
            throw new ConflictException(`El expediente ${anexado.radicado} ya tiene procesos anexados, no puede ser anexado a otro proceso.`);
        }

        if (anexado.procesoPrincipalId) {
            throw new ConflictException(`El expediente ${anexado.radicado} ya está anexado a otro proceso`);
        }

        if (anexadoId === principalId) {
            throw new ConflictException(`No se puede anexar un expediente a sí mismo`);
        }

        anexado.procesoPrincipalId = principalId;
        await this.expedienteRepository.save(anexado);

        // Registrar actuación en ambos
        await this.agregarActuacion(principalId, {
            tipoActuacion: 'ANEXO_PROCESO',
            descripcion: `Se ha anexado el proceso ${anexado.radicado} a este expediente.`,
            usuarioResponsable: usuario
        });

        await this.agregarActuacion(anexadoId, {
            tipoActuacion: 'ANEXO_PROCESO',
            descripcion: `Este proceso ha sido anexado al expediente ${principal.radicado}.`,
            usuarioResponsable: usuario
        });

        const updated = await this.findOne(principalId);
        if (!updated) throw new Error('Expediente no encontrado post-update');
        return updated;
    }

    /**
     * Desanexar un expediente de su proceso principal
     */
    async desanexarExpediente(anexadoId: string, usuario: string): Promise<Expediente> {
        const anexado = await this.expedienteRepository.findOne({ where: { id: anexadoId } });
        if (!anexado) throw new NotFoundException(`Expediente con ID ${anexadoId} no encontrado`);

        const principalId = anexado.procesoPrincipalId;
        if (!principalId) {
            throw new ConflictException(`El expediente ${anexado.radicado} no está anexado a ningún proceso`);
        }

        const principal = await this.findOne(principalId);

        anexado.procesoPrincipalId = null as any; // TypeORM trick for nullable with non-optional property
        await this.expedienteRepository.save(anexado);

        // Registrar actuación en ambos
        if (principal) {
            await this.agregarActuacion(principalId, {
                tipoActuacion: 'DESANEXO_PROCESO',
                descripcion: `Se ha desanexado el proceso ${anexado.radicado} de este expediente.`,
                usuarioResponsable: usuario
            });
        }

        await this.agregarActuacion(anexadoId, {
            tipoActuacion: 'DESANEXO_PROCESO',
            descripcion: `Este proceso ha sido desanexado de su expediente principal.`,
            usuarioResponsable: usuario
        });

        // Retornamos el principal para que el frontend recargue la vista del principal sin el anexado
        const updated = await this.findOne(principalId);
        return updated as Expediente;
    }

    /**
     * Eliminar permanentemente un expediente de la BD.
     * Elimina en cascada todas las entidades hijas asociadas dentro de una transacción.
     */
    async eliminarPermanente(id: string): Promise<void> {
        const expediente = await this.expedienteRepository.findOne({ where: { id } });
        if (!expediente) throw new NotFoundException(`Expediente con ID ${id} no encontrado`);

        // Solo se puede eliminar permanentemente si ya está en estado ELIMINADO
        if (expediente.estadoArchivo !== 'ELIMINADO') {
            throw new ConflictException('Solo se pueden eliminar permanentemente expedientes que estén en estado ELIMINADO');
        }

        const logger = new Logger('ExpedienteService');
        logger.log(`Eliminando permanentemente expediente ${id} y todas sus relaciones...`);

        await this.expedienteRepository.manager.transaction(async (manager) => {
            // 1. Entidades con @ManyToOne FK al expediente SIN onDelete CASCADE
            await manager.delete(TareaExpediente, { expedienteId: id });
            await manager.delete(NotaExpediente, { expedienteId: id });
            await manager.delete(Evidencia, { expedienteId: id });
            await manager.delete(Audiencia, { expedienteId: id });
            await manager.delete(Acta, { expedienteId: id });
            await manager.delete(DecisionDisciplinaria, { expedienteId: id });
            await manager.delete(ExcepcionProcesal, { expedienteId: id });

            // 2. Actuaciones (loose coupling - sin FK formal en BD)
            await manager.delete(Actuacion, { expedienteId: id });

            // 3. Oficios (sin relación ORM formal, solo columna plana)
            await manager
                .createQueryBuilder()
                .delete()
                .from('legal_management.oficios_enviados')
                .where('expediente_id = :id', { id })
                .execute();

            // 4. Correos jurídicos (desvincular, no borrar — los correos pueden pertenecer a otros contextos)
            //    Usamos SQL raw porque CorreoJuridico no mapea expediente_id como propiedad TypeORM
            await manager.query(
                `UPDATE legal_management.correos_juridicos SET expediente_id = NULL WHERE expediente_id = $1`,
                [id]
            );

            // 5. Finalmente eliminar el expediente
            //    Actor, Documento, Comentario, Auto se borran por ON DELETE CASCADE en BD
            await manager.delete(Expediente, { id });

            logger.log(`Expediente ${id} eliminado permanentemente con éxito.`);
        });
    }

    async deleteExpediente(id: string): Promise<void> {
        const result = await this.expedienteRepository.delete(id);
        if (result.affected === 0) {
            throw new NotFoundException(`Expediente con ID ${id} no encontrado`);
        }
    }
}
