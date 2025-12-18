import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Requerimiento } from '../entities/requerimiento.entity';
import { OrganismoControl } from '../entities/organismo-control.entity';
import { CreateRequerimientoDto } from '../dtos/create-requerimiento.dto';
import { 
    StatsRequerimientoDto, 
    OrganismoStatsDto, 
    TendenciaMensualDto,
    UpdateEstadoRequerimientoDto,
    FiltrosRequerimientoDto 
} from '../dtos/stats-requerimiento.dto';

@Injectable()
export class RequerimientoService {
    constructor(
        @InjectRepository(Requerimiento)
        private reqRepo: Repository<Requerimiento>,
        @InjectRepository(OrganismoControl)
        private organismoRepo: Repository<OrganismoControl>,
    ) { }

    // Method A: Generar Radicado Interno
    async generarRadicadoInterno(): Promise<string> {
        const year = new Date().getFullYear();
        const prefix = `OC-${year}-`;

        // Find the last record with this prefix
        const lastRecord = await this.reqRepo.findOne({
            where: { radicadoInterno: Like(`${prefix}%`) },
            order: { radicadoInterno: 'DESC' }
        });

        let sequence = 1;
        if (lastRecord) {
            const parts = lastRecord.radicadoInterno.split('-');
            if (parts.length === 3) {
                const lastSeq = parseInt(parts[2]);
                if (!isNaN(lastSeq)) {
                    sequence = lastSeq + 1;
                }
            }
        }

        // Format with 5 digits padding (standard practice, can vary)
        const paddedSeq = sequence.toString().padStart(5, '0');
        return `${prefix}${paddedSeq}`;
    }

    // Method B: Calcular Vencimiento (Business Days)
    calcularVencimiento(fechaRecepcionStr: string, diasPlazo: number): Date {
        let currentDate = new Date(fechaRecepcionStr);
        // Correct for timezone offset if strictly needed, but often input is YYYY-MM-DD
        // Assuming string input is "YYYY-MM-DD" and treated as UTC or local noon to avoid midnight shift issues.
        // For safety, let's treat it as noon UTC.
        currentDate = new Date(`${fechaRecepcionStr}T12:00:00Z`);

        let addedDays = 0;
        while (addedDays < diasPlazo) {
            currentDate.setDate(currentDate.getDate() + 1);
            const dayOfWeek = currentDate.getDay(); // 0 = Sun, 6 = Sat
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                addedDays++;
            }
            // Holiday check would go here if we had a holidays table
        }
        return currentDate;
    }

    // Method C: Crear Requerimiento
    async crearRequerimiento(dto: CreateRequerimientoDto): Promise<Requerimiento> {
        if (!dto.radicadoExterno) throw new BadRequestException('Radicado Externo es requerido');

        const radicadoInterno = await this.generarRadicadoInterno();

        // Default terms if not provided (Simplistic approach, ideally comes from Catalogue Entity in Phase 2)
        const diasPlazo = dto.diasPlazoOtorgado || 15;
        const fechaVencimiento = this.calcularVencimiento(dto.fechaRecepcion, diasPlazo);

        const fechaVencimientoStr = fechaVencimiento.toISOString().split('T')[0];

        const nuevoReq = this.reqRepo.create({
            ...dto,
            radicadoInterno,
            fechaVencimiento: fechaVencimientoStr,
            estado: 'EN_PREPARACION',
            prioridadCalculada: 'NORMAL' // Initial state, dashboard logic handles dynamic priority but we store snapshot
        });

        return this.reqRepo.save(nuevoReq);
    }

    async findAll(): Promise<Requerimiento[]> {
        return this.reqRepo.find({ 
            order: { auditoriaCreatedAt: 'DESC' },
            relations: ['entidad']
        });
    }

    // ============================================
    // ESTADÍSTICAS Y DASHBOARD
    // ============================================

    async getStats(): Promise<StatsRequerimientoDto> {
        const allRequerimientos = await this.reqRepo.find({ relations: ['entidad'] });
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        // Inicializar estadísticas
        const stats: StatsRequerimientoDto = {
            enPreparacion: 0,
            enRevision: 0,
            aprobado: 0,
            enviado: 0,
            cerrado: 0,
            total: allRequerimientos.length,
            prioridadCritica: 0,
            prioridadAlta: 0,
            prioridadNormal: 0,
            prioridadBaja: 0,
            tipoInformacion: 0,
            tipoAuditoria: 0,
            tipoHallazgo: 0,
            tipoAjuste: 0,
            vencidosHoy: 0,
            vencenProximos3Dias: 0,
            vencenProximos7Dias: 0,
            vencidos: 0,
            organismosMasActivos: [],
            tendenciaMensual: []
        };

        // Contadores de organismos
        const organismosMap = new Map<number, OrganismoStatsDto>();

        allRequerimientos.forEach((req) => {
            // Contar por estado
            switch (req.estado) {
                case 'EN_PREPARACION': stats.enPreparacion++; break;
                case 'EN_REVISION': stats.enRevision++; break;
                case 'APROBADO': stats.aprobado++; break;
                case 'ENVIADO': stats.enviado++; break;
                case 'CERRADO': stats.cerrado++; break;
            }

            // Contar por prioridad
            switch (req.prioridadCalculada) {
                case 'CRITICA': stats.prioridadCritica++; break;
                case 'ALTA': stats.prioridadAlta++; break;
                case 'NORMAL': stats.prioridadNormal++; break;
                case 'BAJA': stats.prioridadBaja++; break;
            }

            // Contar por tipo
            switch (req.tipoRequerimiento) {
                case 'INFORMACION': stats.tipoInformacion++; break;
                case 'AUDITORIA': stats.tipoAuditoria++; break;
                case 'HALLAZGO': stats.tipoHallazgo++; break;
                case 'AJUSTE': stats.tipoAjuste++; break;
            }

            // Alertas de vencimiento (solo para estados activos)
            if (!['CERRADO'].includes(req.estado)) {
                const fechaVenc = new Date(req.fechaVencimiento);
                fechaVenc.setHours(0, 0, 0, 0);
                const diffDays = Math.ceil((fechaVenc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

                if (diffDays < 0) {
                    stats.vencidos++;
                } else if (diffDays === 0) {
                    stats.vencidosHoy++;
                } else if (diffDays <= 3) {
                    stats.vencenProximos3Dias++;
                } else if (diffDays <= 7) {
                    stats.vencenProximos7Dias++;
                }
            }

            // Agrupar por organismo
            if (req.entidad) {
                if (!organismosMap.has(req.entidadId)) {
                    organismosMap.set(req.entidadId, {
                        organismoId: req.entidadId,
                        organismoNombre: req.entidad.nombre,
                        sigla: req.entidad.sigla,
                        totalRequerimientos: 0,
                        pendientes: 0,
                        cerrados: 0
                    });
                }
                const orgStats = organismosMap.get(req.entidadId);
                if (orgStats) {
                    orgStats.totalRequerimientos++;
                    if (req.estado === 'CERRADO') {
                        orgStats.cerrados++;
                    } else {
                        orgStats.pendientes++;
                    }
                }
            }
        });

        // Top 5 organismos más activos
        stats.organismosMasActivos = Array.from(organismosMap.values())
            .sort((a, b) => b.totalRequerimientos - a.totalRequerimientos)
            .slice(0, 5);

        // Tendencia mensual (últimos 6 meses)
        stats.tendenciaMensual = await this.calcularTendenciaMensual();

        return stats;
    }

    private async calcularTendenciaMensual(): Promise<TendenciaMensualDto[]> {
        const tendencias: TendenciaMensualDto[] = [];
        const hoy = new Date();

        for (let i = 5; i >= 0; i--) {
            const mes = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
            const mesInicio = new Date(mes.getFullYear(), mes.getMonth(), 1);
            const mesFin = new Date(mes.getFullYear(), mes.getMonth() + 1, 0);

            const mesInicioStr = mesInicio.toISOString().split('T')[0];
            const mesFinStr = mesFin.toISOString().split('T')[0];

            const recibidos = await this.reqRepo.count({
                where: {
                    fechaRecepcion: Between(mesInicioStr, mesFinStr)
                }
            });

            const cerrados = await this.reqRepo.count({
                where: {
                    fechaRecepcion: Between(mesInicioStr, mesFinStr),
                    estado: 'CERRADO'
                }
            });

            // Calcular promedio de días de respuesta (simplificado)
            const reqsCerrados = await this.reqRepo.find({
                where: {
                    fechaRecepcion: Between(mesInicioStr, mesFinStr),
                    estado: 'CERRADO'
                }
            });

            let promedioRespuestaDias = 0;
            if (reqsCerrados.length > 0) {
                const sumaDias = reqsCerrados.reduce((sum, req) => {
                    const recepcion = new Date(req.fechaRecepcion);
                    const cierre = new Date(req.updatedAt);
                    const diffMs = cierre.getTime() - recepcion.getTime();
                    const dias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                    return sum + dias;
                }, 0);
                promedioRespuestaDias = Math.round(sumaDias / reqsCerrados.length);
            }

            const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
            tendencias.push({
                mes: `${mes.getFullYear()}-${(mes.getMonth() + 1).toString().padStart(2, '0')}`,
                mesNombre: `${meses[mes.getMonth()]} ${mes.getFullYear()}`,
                totalRecibidos: recibidos,
                totalCerrados: cerrados,
                promedioRespuestaDias
            });
        }

        return tendencias;
    }

    // ============================================
    // ACTUALIZACIÓN DE ESTADO
    // ============================================

    async updateEstado(id: string, dto: UpdateEstadoRequerimientoDto): Promise<Requerimiento> {
        const requerimiento = await this.reqRepo.findOne({ where: { id }, relations: ['entidad'] });
        if (!requerimiento) {
            throw new NotFoundException(`Requerimiento con ID ${id} no encontrado`);
        }

        requerimiento.estado = dto.estado;
        
        // Actualizar prioridad dinámica basada en días restantes
        if (dto.estado !== 'CERRADO') {
            const hoy = new Date();
            const fechaVenc = new Date(requerimiento.fechaVencimiento);
            const diffDays = Math.ceil((fechaVenc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

            if (diffDays < 0) {
                requerimiento.prioridadCalculada = 'CRITICA'; // Vencido
            } else if (diffDays <= 3) {
                requerimiento.prioridadCalculada = 'CRITICA';
            } else if (diffDays <= 7) {
                requerimiento.prioridadCalculada = 'ALTA';
            } else if (diffDays <= 15) {
                requerimiento.prioridadCalculada = 'NORMAL';
            } else {
                requerimiento.prioridadCalculada = 'BAJA';
            }
        }

        return this.reqRepo.save(requerimiento);
    }

    // ============================================
    // BÚSQUEDA Y FILTROS AVANZADOS
    // ============================================

    async findWithFilters(filtros: FiltrosRequerimientoDto): Promise<Requerimiento[]> {
        const queryBuilder = this.reqRepo.createQueryBuilder('req')
            .leftJoinAndSelect('req.entidad', 'entidad');

        if (filtros.estado) {
            queryBuilder.andWhere('req.estado = :estado', { estado: filtros.estado });
        }

        if (filtros.tipoRequerimiento) {
            queryBuilder.andWhere('req.tipoRequerimiento = :tipo', { tipo: filtros.tipoRequerimiento });
        }

        if (filtros.prioridad) {
            queryBuilder.andWhere('req.prioridadCalculada = :prioridad', { prioridad: filtros.prioridad });
        }

        if (filtros.entidadId) {
            queryBuilder.andWhere('req.entidadId = :entidadId', { entidadId: filtros.entidadId });
        }

        if (filtros.usuarioAsignadoId) {
            queryBuilder.andWhere('req.usuarioAsignadoId = :usuarioId', { usuarioId: filtros.usuarioAsignadoId });
        }

        if (filtros.fechaDesde) {
            queryBuilder.andWhere('req.fechaRecepcion >= :fechaDesde', { fechaDesde: filtros.fechaDesde });
        }

        if (filtros.fechaHasta) {
            queryBuilder.andWhere('req.fechaRecepcion <= :fechaHasta', { fechaHasta: filtros.fechaHasta });
        }

        if (filtros.busqueda) {
            queryBuilder.andWhere(
                '(req.radicadoInterno LIKE :busqueda OR req.radicadoExterno LIKE :busqueda OR req.asunto LIKE :busqueda)',
                { busqueda: `%${filtros.busqueda}%` }
            );
        }

        return queryBuilder
            .orderBy('req.fechaVencimiento', 'ASC')
            .addOrderBy('req.prioridadCalculada', 'DESC')
            .getMany();
    }

    // ============================================
    // OPERACIONES ADICIONALES
    // ============================================

    async findById(id: string): Promise<Requerimiento> {
        const requerimiento = await this.reqRepo.findOne({ 
            where: { id },
            relations: ['entidad']
        });
        if (!requerimiento) {
            throw new NotFoundException(`Requerimiento con ID ${id} no encontrado`);
        }
        return requerimiento;
    }

    async getAllOrganismos(): Promise<OrganismoControl[]> {
        return this.organismoRepo.find({ 
            where: { activo: true },
            order: { nombre: 'ASC' }
        });
    }
}
