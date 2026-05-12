import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, IsNull, Not } from 'typeorm';
import { PlanMejoramiento, PlanEvidencia, PlanSeguimiento, PlanComentario } from '../entities/planes-mejoramiento.entity';
import { PlanHallazgo } from '../entities/plan-hallazgo.entity';
import { Riesgo } from '../entities/riesgo.entity';
import { Abogado } from '../entities/abogado.entity';

@Injectable()
export class PlanesMejoramientoService {
    constructor(
        @InjectRepository(PlanMejoramiento)
        private planRepo: Repository<PlanMejoramiento>,
        @InjectRepository(PlanEvidencia)
        private evidenciaRepo: Repository<PlanEvidencia>,
        @InjectRepository(PlanSeguimiento)
        private seguimientoRepo: Repository<PlanSeguimiento>,
        @InjectRepository(PlanComentario)
        private comentarioRepo: Repository<PlanComentario>,
        @InjectRepository(PlanHallazgo)
        private hallazgoRepo: Repository<PlanHallazgo>,
        private dataSource: DataSource
    ) { }

    // ==================== Bug 5c: HALLAZGOS / ACCIONES DE MEJORA ====================

    /**
     * Recalcula el `avancePorcentaje` del plan a partir de sus hallazgos.
     * Regla: si NO hay hallazgos, no cambiamos el avance (lo siguen manejando los seguimientos).
     * Si HAY hallazgos, el avance del plan = promedio del avance de sus hallazgos.
     * Esto garantiza que el plan no llegue a 100% hasta que TODOS los hallazgos
     * estén en 100%.
     */
    private async recalcularAvancePlanDesdeHallazgos(planId: string): Promise<void> {
        const hallazgos = await this.hallazgoRepo.find({ where: { planId } });
        if (hallazgos.length === 0) return;
        const suma = hallazgos.reduce((acc, h) => acc + Number(h.porcentajeAvance || 0), 0);
        const promedio = Math.round(suma / hallazgos.length);
        const plan = await this.planRepo.findOneBy({ id: planId });
        if (plan) {
            plan.avancePorcentaje = promedio;
            await this.planRepo.save(plan);
        }
    }

    async getHallazgos(planId: string) {
        return this.hallazgoRepo.find({
            where: { planId },
            order: { createdAt: 'ASC' },
        });
    }

    async createHallazgo(planId: string, data: {
        nombre: string;
        descripcion?: string;
        porcentajeAvance?: number;
        createdBy?: string;
        file?: Express.Multer.File;
    }) {
        await this.findOne(planId);
        if (!data.nombre || !data.nombre.trim()) {
            throw new NotFoundException('El nombre del hallazgo es obligatorio');
        }
        const porcentaje = Math.max(0, Math.min(100, Number(data.porcentajeAvance ?? 0)));

        const hallazgo = this.hallazgoRepo.create({
            planId,
            nombre: data.nombre.trim(),
            descripcion: data.descripcion?.trim() ?? null as any,
            porcentajeAvance: porcentaje,
            createdBy: data.createdBy ?? 'Sistema',
            archivoUrl: data.file ? `files/${data.file.filename}` : null as any,
            archivoNombre: data.file?.originalname ?? null as any,
            archivoMime: data.file?.mimetype ?? null as any,
        });
        const saved = await this.hallazgoRepo.save(hallazgo);
        await this.recalcularAvancePlanDesdeHallazgos(planId);
        return saved;
    }

    async updateHallazgo(hallazgoId: string, data: {
        nombre?: string;
        descripcion?: string;
        porcentajeAvance?: number;
        file?: Express.Multer.File;
    }) {
        const hallazgo = await this.hallazgoRepo.findOneBy({ id: hallazgoId });
        if (!hallazgo) throw new NotFoundException('Hallazgo no encontrado');

        if (data.nombre !== undefined && data.nombre.trim()) hallazgo.nombre = data.nombre.trim();
        if (data.descripcion !== undefined) hallazgo.descripcion = data.descripcion?.trim() ?? null as any;
        if (data.porcentajeAvance !== undefined) {
            hallazgo.porcentajeAvance = Math.max(0, Math.min(100, Number(data.porcentajeAvance)));
        }
        if (data.file) {
            hallazgo.archivoUrl = `files/${data.file.filename}`;
            hallazgo.archivoNombre = data.file.originalname;
            hallazgo.archivoMime = data.file.mimetype;
        }
        const saved = await this.hallazgoRepo.save(hallazgo);
        await this.recalcularAvancePlanDesdeHallazgos(hallazgo.planId);
        return saved;
    }

    async deleteHallazgo(hallazgoId: string) {
        const hallazgo = await this.hallazgoRepo.findOneBy({ id: hallazgoId });
        if (!hallazgo) throw new NotFoundException('Hallazgo no encontrado');
        const planId = hallazgo.planId;
        await this.hallazgoRepo.remove(hallazgo);
        await this.recalcularAvancePlanDesdeHallazgos(planId);
        return { ok: true };
    }

    async findAll() {
        // We purposefully create a query builder to join with Risks manually if needed, 
        // or we can fetch simple and map. 
        // Let's try to join if 'origen_id' matches 'riesgo.id'.
        // Since we don't have a direct relation property in the Entity for 'origenId' to 'Riesgo' (it's logical), 
        // we can do a secondary fetch or a raw join.
        // Let's do a raw left join for performance to get the Risk Title.

        const planes = await this.planRepo.find({
            where: { archivedAt: IsNull() },
            order: { createdAt: 'DESC' },
            relations: ['evidencias', 'seguimientos', 'comentarios', 'hallazgos']
        });

        // Enhance with Risk Title if origin is RIESGO
        // We can't easily join without a relation in TypeORM query builder unless we map it.
        // Let's just fetch all risks for now (assuming not millions) or fetch individually.
        // Better: Fetch IDs.
        const riskIds = planes.filter(p => p.origen === 'RIESGO' && p.origenId).map(p => p.origenId);
        const abogadoIds = planes.filter(p => p.responsableId).map(p => p.responsableId);

        console.log('Fetching names for Abogado IDs:', abogadoIds); // Debug Log

        let riskMap = new Map();
        let abogadoMap = new Map();

        if (riskIds.length > 0) {
            const risks = await this.dataSource.getRepository(Riesgo).findBy({ id: In(riskIds) });
            riskMap = new Map(risks.map(r => [r.id, r.nombre]));
        }

        if (abogadoIds.length > 0) {
            const abogados = await this.dataSource.getRepository(Abogado).findBy({ id: In(abogadoIds) });
            abogadoMap = new Map(abogados.map(a => [a.id, a.nombreCompleto]));
        }

        return planes.map(p => {
            const respNombre = abogadoMap.get(p.responsableId);
            return {
                ...p,
                riesgoTitulo: p.origen === 'RIESGO' ? riskMap.get(p.origenId) : null,
                responsableNombre: respNombre || 'Sin Asignar'
            };
        });

        return planes;
    }

    async create(data: Partial<PlanMejoramiento>) {
        // Validate Origen
        if (data.origen === 'RIESGO' && data.origenId) {
            const exists = await this.dataSource.getRepository(Riesgo).findOneBy({ id: data.origenId });
            if (!exists) throw new NotFoundException(`Riesgo ${data.origenId} no existe`);
        }

        // Generate Code (PM-YYYY-XXX)
        const count = await this.planRepo.count();
        const year = new Date().getFullYear();
        const sequence = String(count + 1).padStart(3, '0');
        data.codigo = `PM-${year}-${sequence}`;

        const nuevo = this.planRepo.create(data);
        return this.planRepo.save(nuevo);
    }

    async findOne(id: string) {
        const plan = await this.planRepo.findOne({
            where: { id },
            relations: ['evidencias', 'seguimientos', 'comentarios', 'hallazgos']
        });
        if (!plan) throw new NotFoundException(`Plan ${id} no encontrado`);

        // Lookup responsable name - first try abogado, then entity field
        let responsableNombre = plan.responsableNombre || 'Sin Asignar';
        if (plan.responsableId) {
            const abogado = await this.dataSource.getRepository(Abogado).findOneBy({ id: plan.responsableId });
            if (abogado) responsableNombre = abogado.nombreCompleto;
        }

        // Attach Risk Info
        let riesgoTitulo: string | null = null;
        if (plan.origen === 'RIESGO' && plan.origenId) {
            const risk = await this.dataSource.getRepository(Riesgo).findOneBy({ id: plan.origenId });
            if (risk) riesgoTitulo = risk.nombre;
        }

        // Map seguimientos to include createdAt as fechaReporte
        const seguimientosConFecha = plan.seguimientos?.map(s => ({
            ...s,
            createdAt: s.fechaReporte
        })) || [];

        return {
            ...plan,
            responsableNombre,
            riesgoTitulo,
            seguimientos: seguimientosConFecha
        };
    }

    async getDocumentos(planId: string): Promise<PlanEvidencia[]> {
        return this.evidenciaRepo.find({
            where: { planId },
            order: { createdAt: 'DESC' }
        });
    }

    async uploadDocumento(planId: string, file: Express.Multer.File, titulo: string, uploadedBy?: string): Promise<PlanEvidencia> {
        await this.findOne(planId); // Verify exists
        const evidencia = this.evidenciaRepo.create({
            planId,
            titulo: titulo || file.originalname,
            urlArchivo: file.filename,
            tipoArchivo: file.mimetype,
            uploadedBy: uploadedBy || 'Sistema'
        });
        return this.evidenciaRepo.save(evidencia);
    }

    async addEvidencia(planId: string, data: Partial<PlanEvidencia>) {
        await this.findOne(planId); // Verify exists
        const evidencia = this.evidenciaRepo.create({ ...data, planId });
        return this.evidenciaRepo.save(evidencia);
    }

    async addSeguimiento(planId: string, data: {
        descripcionAvance: string;
        porcentajeReportado: number;
        usuarioId?: string;
        file?: Express.Multer.File;
        tituloDocumento?: string;
        uploadedBy?: string;
    }) {
        const plan = await this.findOne(planId);

        // Bug 5: si vino archivo adjunto, lo guardamos como evidencia/documento
        // del plan ANTES de crear el seguimiento, para que el avance quede atado
        // a su soporte en la misma transacción lógica.
        if (data.file) {
            const evidencia = this.evidenciaRepo.create({
                planId,
                titulo: data.tituloDocumento || data.file.originalname,
                urlArchivo: data.file.filename,
                tipoArchivo: data.file.mimetype,
                uploadedBy: data.uploadedBy || data.usuarioId || 'Sistema',
            });
            await this.evidenciaRepo.save(evidencia);
        }

        // Create tracking record (sin propagar el File)
        const seguimiento = this.seguimientoRepo.create({
            descripcionAvance: data.descripcionAvance,
            porcentajeReportado: data.porcentajeReportado,
            usuarioId: data.usuarioId,
            planId,
        });
        await this.seguimientoRepo.save(seguimiento);

        // Update Plan percentage
        // Logic: Simple update or incremental? Requirement says "Actualiza el campo avance_porcentaje".
        // Usually "avance_porcentaje" in Plan is the *current* total status.
        // The "porcentaje_reportado" in Seguimiento might be "what is the progress NOW" or "how much I advanced".
        // Assuming 'porcentajeReportado' is the NEW TOTAL percentage.

        plan.avancePorcentaje = data.porcentajeReportado;

        // Auto-close suggestion
        if (plan.avancePorcentaje >= 100) {
            // plan.estado = 'CERRADO'; // Only suggestion or auto? "sugiere cambiar estado". Let's keep it open but maybe frontend suggests.
            // Re-reading: "sugiere cambiar estado a CERRADO". 
            // Let's not auto-close in backend to keep user control, or maybe update status if it logic dictates. 
            // Let's leave it manual for now unless requested.
            // Or we can set a flag.
        }

        // Update plan with new percentage
        const planEntity = await this.planRepo.findOneBy({ id: planId });
        if (!planEntity) throw new NotFoundException('Plan no encontrado al actualizar porcentaje');

        planEntity.avancePorcentaje = data.porcentajeReportado;
        return this.planRepo.save(planEntity);
    }

    async addComentario(planId: string, data: { mensaje: string; usuarioId?: string }) {
        await this.findOne(planId);
        const comentario = this.comentarioRepo.create({ ...data, planId });
        return this.comentarioRepo.save(comentario);
    }

    // Helper for Frontend Dropdown
    async getRiesgosParaSeleccion() {
        // Only Active Risks?
        return this.dataSource.getRepository(Riesgo).find({
            select: ['id', 'nombre', 'zonaInherente']
        });
    }

    async update(id: string, data: Partial<PlanMejoramiento>) {
        const plan = await this.findOne(id);
        if (!plan) throw new NotFoundException('Plan no encontrado');

        // Simple update
        Object.assign(plan, data);
        return this.planRepo.save(plan);
    }

    // ==================== ARCHIVADO ====================
    async getArchivados() {
        return this.planRepo.find({
            where: { archivedAt: Not(IsNull()) },
            relations: ['evidencias', 'seguimientos', 'comentarios'],
            order: { createdAt: 'DESC' },
        });
    }

    async archivar(id: string) {
        const planEntity = await this.planRepo.findOneBy({ id });
        if (!planEntity) throw new NotFoundException(`Plan ${id} no encontrado`);

        planEntity.archivedAt = new Date();
        planEntity.archivedBy = 'System';
        planEntity.archiveReason = 'Archivado manualmente';

        return this.planRepo.save(planEntity);
    }

    async restaurar(id: string) {
        const planEntity = await this.planRepo.findOneBy({ id });
        if (!planEntity) throw new NotFoundException(`Plan ${id} no encontrado`);

        planEntity.archivedAt = null;
        planEntity.archivedBy = null;
        planEntity.archiveReason = null;

        return this.planRepo.save(planEntity);
    }

    async eliminar(id: string) {
        const planEntity = await this.planRepo.findOneBy({ id });
        if (!planEntity) throw new NotFoundException(`Plan ${id} no encontrado`);
        await this.planRepo.remove(planEntity);
    }
}
