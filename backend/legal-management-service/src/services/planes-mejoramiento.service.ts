import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, IsNull, Not } from 'typeorm';
import { PlanMejoramiento, PlanEvidencia, PlanSeguimiento, PlanComentario } from '../entities/planes-mejoramiento.entity';
import { PlanHallazgo } from '../entities/plan-hallazgo.entity';
import { Riesgo } from '../entities/riesgo.entity';
import {
    calcularAvancePorFasePhva,
    calcularCumplimientoPlan,
    calcularPesosAcciones,
    determinarEstadoPlanPorCumplimiento,
    esUuidValido,
    etiquetaFasePhva,
    normalizarEstadoAccion,
    normalizarFasePhva,
} from '../utils/planes-mejoramiento-phva.util';

export interface TrazabilidadCumplimiento {
    planId: string;
    planAvanceAnterior: number;
    planAvanceActual: number;
    planEstadoAnterior: string;
    planEstadoActual: string;
    totalAcciones: number;
    accionesEjecutadas: number;
}

@Injectable()
export class PlanesMejoramientoService implements OnModuleInit {
    private readonly logger = new Logger(PlanesMejoramientoService.name);

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

    async onModuleInit(): Promise<void> {
        try {
            await this.dataSource.query(
                'ALTER TABLE legal_management.planes_mejoramiento DROP CONSTRAINT IF EXISTS planes_mejoramiento_origen_check;',
            );
            await this.dataSource.query(`
                ALTER TABLE legal_management.planes_hallazgos
                    ADD COLUMN IF NOT EXISTS fase_phva VARCHAR(20) NOT NULL DEFAULT 'PLANEAR',
                    ADD COLUMN IF NOT EXISTS peso_porcentual NUMERIC(5,2) NOT NULL DEFAULT 0,
                    ADD COLUMN IF NOT EXISTS estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
                    ADD COLUMN IF NOT EXISTS responsable VARCHAR(255),
                    ADD COLUMN IF NOT EXISTS fecha_limite DATE,
                    ADD COLUMN IF NOT EXISTS fecha_ejecucion TIMESTAMP WITH TIME ZONE;
            `);
        } catch (error) {
            this.logger.warn(
                `No se pudo verificar la estructura de planes_mejoramiento en arranque: ${error instanceof Error ? error.message : String(error)}`,
            );
        }
    }

    // ==================== Bug 5c & Bug 2418: HALLAZGOS / ACCIONES DE MEJORA (PHVA) ====================

    private formatearHallazgo(h: PlanHallazgo) {
        const estado = normalizarEstadoAccion(h.estado, h.porcentajeAvance);
        return {
            ...h,
            fasePhva: normalizarFasePhva(h.fasePhva) ?? 'PLANEAR',
            pesoPorcentual: Number(h.pesoPorcentual || 0),
            estado,
            porcentajeAvance: estado === 'EJECUTADA' ? 100 : Number(h.porcentajeAvance || 0),
        };
    }

    private ordenarHallazgos(hallazgos: PlanHallazgo[]): PlanHallazgo[] {
        return [...hallazgos].sort((a, b) => {
            const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            if (ta !== tb) return ta - tb;
            return String(a.id || '').localeCompare(String(b.id || ''));
        });
    }

    /**
     * Recalcula los pesos porcentuales de todas las acciones del plan (suma exacta = 100%,
     * ajuste de decimales en la última acción), actualiza el porcentaje de cumplimiento del plan
     * y cambia el estado automáticamente a CERRADO (Completado) al alcanzar 100%, o vuelve a
     * EN_EJECUCION si baja de 100%. Registra un evento en Timeline (`planes_seguimientos`).
     */
    private async recalcularPesosYCumplimientoPlan(
        planId: string,
        opciones?: {
            descripcionEvento?: (ctx: TrazabilidadCumplimiento & { pesosRecalculados: Map<string, number> }) => string;
            usuarioId?: string;
        },
    ): Promise<{ trazabilidad: TrazabilidadCumplimiento; hallazgos: PlanHallazgo[] }> {
        const hallazgosOrdenados = this.ordenarHallazgos(
            await this.hallazgoRepo.find({ where: { planId } }),
        );
        const pesos = calcularPesosAcciones(hallazgosOrdenados.length);
        const pesosRecalculados = new Map<string, number>();

        for (let i = 0; i < hallazgosOrdenados.length; i++) {
            const h = hallazgosOrdenados[i];
            h.pesoPorcentual = pesos[i];
            const estadoNormalizado = normalizarEstadoAccion(h.estado, h.porcentajeAvance);
            h.estado = estadoNormalizado;
            h.porcentajeAvance = estadoNormalizado === 'EJECUTADA' ? 100 : 0;
            pesosRecalculados.set(h.id, pesos[i]);
        }

        if (hallazgosOrdenados.length > 0) {
            await this.hallazgoRepo.save(hallazgosOrdenados);
        }

        const plan = await this.planRepo.findOneBy({ id: planId });
        if (!plan) throw new NotFoundException(`Plan ${planId} no encontrado`);

        const planAvanceAnterior = Number(plan.avancePorcentaje || 0);
        const planEstadoAnterior = plan.estado || 'ABIERTO';

        const cumplimiento = calcularCumplimientoPlan(hallazgosOrdenados);
        const nuevoEstado = determinarEstadoPlanPorCumplimiento(planEstadoAnterior, cumplimiento);

        plan.avancePorcentaje = cumplimiento.porcentaje;
        plan.estado = nuevoEstado;
        if (nuevoEstado === 'CERRADO' && planEstadoAnterior !== 'CERRADO') {
            plan.fechaCierreReal = new Date();
        } else if (nuevoEstado !== 'CERRADO' && planEstadoAnterior === 'CERRADO') {
            plan.fechaCierreReal = null as any;
        }

        await this.planRepo.save(plan);

        const trazabilidad: TrazabilidadCumplimiento = {
            planId,
            planAvanceAnterior,
            planAvanceActual: cumplimiento.porcentaje,
            planEstadoAnterior,
            planEstadoActual: nuevoEstado,
            totalAcciones: cumplimiento.total,
            accionesEjecutadas: cumplimiento.ejecutadas,
        };

        if (opciones?.descripcionEvento) {
            const baseDescripcion = opciones.descripcionEvento({ ...trazabilidad, pesosRecalculados });
            let sufijoEstado = '';
            if (nuevoEstado === 'CERRADO' && planEstadoAnterior !== 'CERRADO') {
                sufijoEstado = ' — Plan completado automáticamente (100%).';
            } else if (nuevoEstado !== 'CERRADO' && planEstadoAnterior === 'CERRADO') {
                sufijoEstado = ' — Plan reabierto a En Ejecución.';
            }
            const seguimiento = this.seguimientoRepo.create({
                planId,
                descripcionAvance: `${baseDescripcion}${sufijoEstado}`,
                porcentajeReportado: cumplimiento.porcentaje,
                usuarioId: esUuidValido(opciones.usuarioId) ? opciones.usuarioId : undefined,
            });
            await this.seguimientoRepo.save(seguimiento);
        }

        return { trazabilidad, hallazgos: hallazgosOrdenados };
    }

    async getHallazgos(planId: string) {
        const hallazgos = this.ordenarHallazgos(
            await this.hallazgoRepo.find({ where: { planId } }),
        );

        // Compatibilidad con registros legados sin peso asignado
        if (hallazgos.length > 0) {
            const sumaPesos = hallazgos.reduce((acc, h) => acc + Number(h.pesoPorcentual || 0), 0);
            if (Math.abs(sumaPesos - 100) > 0.01) {
                const { hallazgos: normalizados } = await this.recalcularPesosYCumplimientoPlan(planId);
                return normalizados.map((h) => this.formatearHallazgo(h));
            }
        }

        return hallazgos.map((h) => this.formatearHallazgo(h));
    }

    async createHallazgo(planId: string, data: {
        nombre: string;
        descripcion?: string;
        porcentajeAvance?: number;
        fasePhva?: string;
        estado?: string;
        responsable?: string;
        fechaLimite?: string;
        createdBy?: string;
        usuarioId?: string;
        file?: Express.Multer.File;
    }) {
        await this.findOne(planId);
        if (!data.nombre || !data.nombre.trim()) {
            throw new BadRequestException('El nombre de la acción es obligatorio');
        }
        const fasePhva = normalizarFasePhva(data.fasePhva);
        if (!fasePhva) {
            throw new BadRequestException(
                'La fase PHVA es obligatoria y debe ser Planear, Hacer, Verificar o Actuar',
            );
        }

        const estado = normalizarEstadoAccion(data.estado, data.porcentajeAvance);
        const porcentaje = estado === 'EJECUTADA' ? 100 : 0;
        const fechaLimiteLimpia = data.fechaLimite && data.fechaLimite.trim() ? data.fechaLimite.trim() : null;

        const hallazgo = this.hallazgoRepo.create({
            planId,
            nombre: data.nombre.trim(),
            descripcion: data.descripcion?.trim() || (null as any),
            fasePhva,
            estado,
            porcentajeAvance: porcentaje,
            pesoPorcentual: 0,
            responsable: data.responsable?.trim() || null,
            fechaLimite: fechaLimiteLimpia,
            fechaEjecucion: estado === 'EJECUTADA' ? new Date() : null,
            createdBy: data.createdBy ?? 'Sistema',
            archivoUrl: data.file ? `files/${data.file.filename}` : (null as any),
            archivoNombre: data.file?.originalname ?? (null as any),
            archivoMime: data.file?.mimetype ?? (null as any),
        });
        const saved = await this.hallazgoRepo.save(hallazgo);

        const { trazabilidad, hallazgos } = await this.recalcularPesosYCumplimientoPlan(planId, {
            usuarioId: data.usuarioId,
            descripcionEvento: (ctx) => {
                const peso = ctx.pesosRecalculados.get(saved.id) ?? 0;
                const sufijo = estado === 'EJECUTADA' ? ' (Ejecutada)' : ' (Pendiente)';
                return `Acción creada [${etiquetaFasePhva(fasePhva)}]: "${saved.nombre}"${sufijo} · Peso asignado: ${peso}% · Cumplimiento del plan: ${ctx.planAvanceAnterior}% → ${ctx.planAvanceActual}%`;
            },
        });

        const actualizado = hallazgos.find((h) => h.id === saved.id) ?? saved;
        return {
            ...this.formatearHallazgo(actualizado),
            trazabilidad,
        };
    }

    async cambiarEstadoHallazgo(hallazgoId: string, data: {
        estado?: string;
        ejecutada?: boolean;
        usuarioId?: string;
        usuarioNombre?: string;
    }) {
        const hallazgo = await this.hallazgoRepo.findOneBy({ id: hallazgoId });
        if (!hallazgo) throw new NotFoundException('Acción no encontrada');

        const estadoAnterior = normalizarEstadoAccion(hallazgo.estado, hallazgo.porcentajeAvance);
        let nuevoEstado: 'PENDIENTE' | 'EJECUTADA';
        if (typeof data.ejecutada === 'boolean') {
            nuevoEstado = data.ejecutada ? 'EJECUTADA' : 'PENDIENTE';
        } else if (data.estado) {
            const limpio = data.estado.trim().toUpperCase();
            if (limpio !== 'EJECUTADA' && limpio !== 'PENDIENTE') {
                throw new BadRequestException('Estado inválido. Use EJECUTADA o PENDIENTE');
            }
            nuevoEstado = limpio;
        } else {
            nuevoEstado = estadoAnterior === 'EJECUTADA' ? 'PENDIENTE' : 'EJECUTADA';
        }

        hallazgo.estado = nuevoEstado;
        hallazgo.porcentajeAvance = nuevoEstado === 'EJECUTADA' ? 100 : 0;
        hallazgo.fechaEjecucion = nuevoEstado === 'EJECUTADA' ? new Date() : null;

        await this.hallazgoRepo.save(hallazgo);

        const faseEtiqueta = etiquetaFasePhva(hallazgo.fasePhva);
        const { trazabilidad, hallazgos } = await this.recalcularPesosYCumplimientoPlan(hallazgo.planId, {
            usuarioId: data.usuarioId,
            descripcionEvento: (ctx) => {
                const peso = ctx.pesosRecalculados.get(hallazgo.id) ?? Number(hallazgo.pesoPorcentual || 0);
                const actor = data.usuarioNombre ? ` por ${data.usuarioNombre}` : '';
                if (nuevoEstado === 'EJECUTADA') {
                    return `Acción ejecutada [${faseEtiqueta}]: "${hallazgo.nombre}" (+${peso}%)${actor} · Cumplimiento: ${ctx.planAvanceAnterior}% → ${ctx.planAvanceActual}%`;
                }
                return `Acción reabierta [${faseEtiqueta}]: "${hallazgo.nombre}" (-${peso}%)${actor} · Cumplimiento: ${ctx.planAvanceAnterior}% → ${ctx.planAvanceActual}%`;
            },
        });

        const actualizado = hallazgos.find((h) => h.id === hallazgo.id) ?? hallazgo;
        return {
            ...this.formatearHallazgo(actualizado),
            trazabilidad,
        };
    }

    async updateHallazgo(hallazgoId: string, data: {
        nombre?: string;
        descripcion?: string;
        porcentajeAvance?: number;
        fasePhva?: string;
        estado?: string;
        responsable?: string;
        fechaLimite?: string;
        usuarioId?: string;
        usuarioNombre?: string;
        file?: Express.Multer.File;
    }) {
        const hallazgo = await this.hallazgoRepo.findOneBy({ id: hallazgoId });
        if (!hallazgo) throw new NotFoundException('Acción no encontrada');

        const estadoAnterior = normalizarEstadoAccion(hallazgo.estado, hallazgo.porcentajeAvance);

        if (data.nombre !== undefined) {
            if (!data.nombre.trim()) {
                throw new BadRequestException('El nombre de la acción no puede estar vacío');
            }
            hallazgo.nombre = data.nombre.trim();
        }
        if (data.descripcion !== undefined) {
            hallazgo.descripcion = data.descripcion?.trim() || (null as any);
        }
        if (data.fasePhva !== undefined) {
            const fase = normalizarFasePhva(data.fasePhva);
            if (!fase) {
                throw new BadRequestException(
                    'La fase PHVA debe ser Planear, Hacer, Verificar o Actuar',
                );
            }
            hallazgo.fasePhva = fase;
        }
        if (data.responsable !== undefined) {
            hallazgo.responsable = data.responsable?.trim() || null;
        }
        if (data.fechaLimite !== undefined) {
            hallazgo.fechaLimite = data.fechaLimite && data.fechaLimite.trim() ? data.fechaLimite.trim() : null;
        }
        if (data.estado !== undefined || data.porcentajeAvance !== undefined) {
            const nuevoEstado = normalizarEstadoAccion(data.estado, data.porcentajeAvance);
            hallazgo.estado = nuevoEstado;
            hallazgo.porcentajeAvance = nuevoEstado === 'EJECUTADA' ? 100 : 0;
            if (nuevoEstado === 'EJECUTADA' && estadoAnterior !== 'EJECUTADA') {
                hallazgo.fechaEjecucion = new Date();
            } else if (nuevoEstado === 'PENDIENTE') {
                hallazgo.fechaEjecucion = null;
            }
        }
        if (data.file) {
            hallazgo.archivoUrl = `files/${data.file.filename}`;
            hallazgo.archivoNombre = data.file.originalname;
            hallazgo.archivoMime = data.file.mimetype;
        }
        await this.hallazgoRepo.save(hallazgo);

        const estadoNuevo = normalizarEstadoAccion(hallazgo.estado, hallazgo.porcentajeAvance);
        const faseEtiqueta = etiquetaFasePhva(hallazgo.fasePhva);
        const cambioEstado = estadoNuevo !== estadoAnterior;

        const { trazabilidad, hallazgos } = await this.recalcularPesosYCumplimientoPlan(hallazgo.planId, {
            usuarioId: data.usuarioId,
            descripcionEvento: cambioEstado
                ? (ctx) => {
                    const peso = ctx.pesosRecalculados.get(hallazgo.id) ?? Number(hallazgo.pesoPorcentual || 0);
                    if (estadoNuevo === 'EJECUTADA') {
                        return `Acción ejecutada [${faseEtiqueta}]: "${hallazgo.nombre}" (+${peso}%) · Cumplimiento: ${ctx.planAvanceAnterior}% → ${ctx.planAvanceActual}%`;
                    }
                    return `Acción reabierta [${faseEtiqueta}]: "${hallazgo.nombre}" (-${peso}%) · Cumplimiento: ${ctx.planAvanceAnterior}% → ${ctx.planAvanceActual}%`;
                }
                : undefined,
        });

        const actualizado = hallazgos.find((h) => h.id === hallazgo.id) ?? hallazgo;
        return {
            ...this.formatearHallazgo(actualizado),
            trazabilidad,
        };
    }

    async deleteHallazgo(hallazgoId: string, usuarioId?: string, usuarioNombre?: string) {
        const hallazgo = await this.hallazgoRepo.findOneBy({ id: hallazgoId });
        if (!hallazgo) throw new NotFoundException('Acción no encontrada');
        const planId = hallazgo.planId;
        const nombreEliminado = hallazgo.nombre;
        const faseEtiqueta = etiquetaFasePhva(hallazgo.fasePhva);
        await this.hallazgoRepo.remove(hallazgo);
        const { trazabilidad } = await this.recalcularPesosYCumplimientoPlan(planId, {
            usuarioId,
            descripcionEvento: (ctx) => {
                const actor = usuarioNombre ? ` por ${usuarioNombre}` : '';
                return `Acción eliminada [${faseEtiqueta}]: "${nombreEliminado}"${actor} · Pesos recalculados (${ctx.totalAcciones} acciones) · Cumplimiento: ${ctx.planAvanceAnterior}% → ${ctx.planAvanceActual}%`;
            },
        });
        return { ok: true, trazabilidad };
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
        const responsableIds = planes.filter(p => p.responsableId).map(p => p.responsableId);

        let riskMap = new Map();
        let responsableMap = new Map<string, string>();

        if (riskIds.length > 0) {
            const risks = await this.dataSource.getRepository(Riesgo).findBy({ id: In(riskIds) });
            riskMap = new Map(risks.map(r => [r.id, r.nombre]));
        }

        if (responsableIds.length > 0) {
            responsableMap = await this.resolveResponsablesDesdeAuth(responsableIds);
        }

        return planes.map(p => {
            const respNombre = p.responsableId ? responsableMap.get(p.responsableId) : null;
            const hallazgosOrdenados = this.ordenarHallazgos(p.hallazgos || []).map((h) => this.formatearHallazgo(h));
            const seguimientosOrdenados = [...(p.seguimientos || [])]
                .sort((a, b) => new Date(b.fechaReporte).getTime() - new Date(a.fechaReporte).getTime())
                .map((s) => ({ ...s, createdAt: s.fechaReporte, porcentajeReportado: Number(s.porcentajeReportado || 0) }));
            return {
                ...p,
                avancePorcentaje: Number(p.avancePorcentaje || 0),
                hallazgos: hallazgosOrdenados,
                seguimientos: seguimientosOrdenados,
                avancePorFase: calcularAvancePorFasePhva(hallazgosOrdenados),
                riesgoTitulo: p.origen === 'RIESGO' ? riskMap.get(p.origenId) : null,
                responsableNombre: respNombre || p.responsableNombre || 'Sin Asignar'
            };
        });
    }

    async create(data: Partial<PlanMejoramiento>) {
        // Validate Origen
        if (data.origen === 'RIESGO' && data.origenId) {
            const exists = await this.dataSource.getRepository(Riesgo).findOneBy({ id: data.origenId });
            if (!exists) throw new NotFoundException(`Riesgo ${data.origenId} no existe`);
        }

        // Generate Code (PM-YYYY-XXX) si no viene uno único
        if (!data.codigo || !data.codigo.trim()) {
            const count = await this.planRepo.count();
            const year = new Date().getFullYear();
            const sequence = String(count + 1).padStart(3, '0');
            data.codigo = `PM-${year}-${sequence}`;
        } else {
            data.codigo = data.codigo.trim();
            const existente = await this.planRepo.findOneBy({ codigo: data.codigo });
            if (existente) {
                const year = new Date().getFullYear();
                const suffix = String(Date.now()).slice(-4);
                data.codigo = `${data.codigo}-${year}-${suffix}`;
            }
        }

        // Normalizar estado al conjunto permitido en BD
        const estadosPermitidos = new Set(['ABIERTO', 'EN_EJECUCION', 'VENCIDO', 'CERRADO']);
        if (!data.estado || !estadosPermitidos.has(String(data.estado).toUpperCase())) {
            data.estado = data.estado === 'COMPLETADO' ? 'CERRADO' : 'EN_EJECUCION';
        } else {
            data.estado = String(data.estado).toUpperCase();
        }

        const nuevo = this.planRepo.create(data);
        return this.planRepo.save(nuevo);
    }

    async findOne(id: string) {
        const plan = await this.planRepo.findOne({
            where: { id },
            relations: ['evidencias', 'seguimientos', 'comentarios', 'hallazgos']
        });
        if (!plan) throw new NotFoundException(`Plan ${id} no encontrado`);

        // Lookup responsable name from auth, then entity field
        let responsableNombre = plan.responsableNombre || 'Sin Asignar';
        if (plan.responsableId) {
            const responsables = await this.resolveResponsablesDesdeAuth([plan.responsableId]);
            responsableNombre = responsables.get(plan.responsableId) || responsableNombre;
        }

        // Attach Risk Info
        let riesgoTitulo: string | null = null;
        if (plan.origen === 'RIESGO' && plan.origenId) {
            const risk = await this.dataSource.getRepository(Riesgo).findOneBy({ id: plan.origenId });
            if (risk) riesgoTitulo = risk.nombre;
        }

        const hallazgosOrdenados = this.ordenarHallazgos(plan.hallazgos || []).map((h) => this.formatearHallazgo(h));

        // Map seguimientos to include createdAt as fechaReporte (más recientes primero)
        const seguimientosConFecha = [...(plan.seguimientos || [])]
            .sort((a, b) => new Date(b.fechaReporte).getTime() - new Date(a.fechaReporte).getTime())
            .map(s => ({
                ...s,
                porcentajeReportado: Number(s.porcentajeReportado || 0),
                createdAt: s.fechaReporte
            }));

        return {
            ...plan,
            avancePorcentaje: Number(plan.avancePorcentaje || 0),
            responsableNombre,
            riesgoTitulo,
            hallazgos: hallazgosOrdenados,
            avancePorFase: calcularAvancePorFasePhva(hallazgosOrdenados),
            seguimientos: seguimientosConFecha
        };
    }

    private async resolveResponsablesDesdeAuth(ids: string[]): Promise<Map<string, string>> {
        const filteredIds = [...new Set(ids.filter(Boolean))];
        if (filteredIds.length === 0) return new Map();

        try {
            const rows = await this.dataSource.query(
                `SELECT
                    u.id_user::text AS id_user,
                    u.public_id::text AS public_id,
                    COALESCE(p.nom_largo, u.username, u.id_user::text) AS nombre
                 FROM auth."user" u
                 LEFT JOIN auth.personas p ON p.id_person = u.id_person
                 WHERE u.id_user::text = ANY($1)
                    OR u.public_id::text = ANY($1)`,
                [filteredIds],
            );

            const map = new Map<string, string>();
            for (const row of rows) {
                if (row.id_user) map.set(row.id_user, row.nombre);
                if (row.public_id) map.set(row.public_id, row.nombre);
            }
            return map;
        } catch {
            return new Map();
        }
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
