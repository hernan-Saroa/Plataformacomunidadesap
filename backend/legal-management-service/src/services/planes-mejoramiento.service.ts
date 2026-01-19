import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { PlanMejoramiento, PlanEvidencia, PlanSeguimiento, PlanComentario } from '../entities/planes-mejoramiento.entity';
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
        private dataSource: DataSource
    ) { }

    async findAll() {
        // We purposefully create a query builder to join with Risks manually if needed, 
        // or we can fetch simple and map. 
        // Let's try to join if 'origen_id' matches 'riesgo.id'.
        // Since we don't have a direct relation property in the Entity for 'origenId' to 'Riesgo' (it's logical), 
        // we can do a secondary fetch or a raw join.
        // Let's do a raw left join for performance to get the Risk Title.

        const planes = await this.planRepo.find({
            order: { createdAt: 'DESC' },
            relations: ['evidencias', 'seguimientos', 'comentarios']
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
            relations: ['evidencias', 'seguimientos', 'comentarios']
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

    async addEvidencia(planId: string, data: Partial<PlanEvidencia>) {
        await this.findOne(planId); // Verify exists
        const evidencia = this.evidenciaRepo.create({ ...data, planId });
        return this.evidenciaRepo.save(evidencia);
    }

    async addSeguimiento(planId: string, data: { descripcionAvance: string; porcentajeReportado: number; usuarioId?: string }) {
        const plan = await this.findOne(planId);

        // Create tracking record
        const seguimiento = this.seguimientoRepo.create({ ...data, planId });
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
}
