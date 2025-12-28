import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RequerimientoOC, EstadoRequerimiento, UnidadTiempo, Prioridad } from '../entities/requerimiento-oc.entity';
import { OrganismoControlOC } from '../entities/organismo-control-legal.entity';
import { SolicitudInsumo, EstadoInsumo } from '../entities/solicitud-insumo.entity';

@Injectable()
export class RequerimientosOCService {
    constructor(
        @InjectRepository(RequerimientoOC)
        private readonly requerimientoRepo: Repository<RequerimientoOC>,
        @InjectRepository(OrganismoControlOC)
        private readonly organismoRepo: Repository<OrganismoControlOC>,
        @InjectRepository(SolicitudInsumo)
        private readonly insumoRepo: Repository<SolicitudInsumo>,
    ) { }

    // ============================================
    // ORGANISMOS (Catálogo)
    // ============================================
    async findAllOrganismos(): Promise<OrganismoControlOC[]> {
        return this.organismoRepo.find({ where: { activo: true }, order: { nombre: 'ASC' } });
    }

    // ============================================
    // REQUERIMIENTOS
    // ============================================
    async findAll(): Promise<RequerimientoOC[]> {
        const reqs = await this.requerimientoRepo.find({
            relations: ['organismo', 'abogadoAsignado'],
            order: { fechaVencimiento: 'ASC' }
        });
        return reqs.map(r => this.calcularDiasRestantes(r));
    }

    async findOne(id: string): Promise<RequerimientoOC> {
        const req = await this.requerimientoRepo.findOne({
            where: { id },
            relations: ['organismo', 'abogadoAsignado']
        });
        if (!req) throw new NotFoundException(`Requerimiento ${id} no encontrado`);
        return this.calcularDiasRestantes(req);
    }

    async create(data: Partial<RequerimientoOC>): Promise<RequerimientoOC> {
        // Generar radicado interno automático
        const year = new Date().getFullYear();
        const count = await this.requerimientoRepo.count();
        data.radicadoInterno = `REQ-OC-${year}-${String(count + 1).padStart(4, '0')}`;

        // Calcular fecha de vencimiento si no viene
        if (!data.fechaVencimiento && data.fechaRecepcion && data.plazoOtorgado) {
            data.fechaVencimiento = this.calcularFechaVencimiento(
                new Date(data.fechaRecepcion),
                data.plazoOtorgado,
                data.unidadTiempo || 'DIAS_HABILES'
            );
        }

        // Calcular prioridad automáticamente basándose en el tiempo
        if (data.fechaVencimiento && data.plazoOtorgado) {
            data.prioridad = this.calcularPrioridadAutomatica(data.plazoOtorgado, data.unidadTiempo || 'DIAS_HABILES');
        }

        const req = this.requerimientoRepo.create(data);
        return this.requerimientoRepo.save(req);
    }

    async update(id: string, data: Partial<RequerimientoOC>): Promise<RequerimientoOC> {
        const req = await this.findOne(id);
        Object.assign(req, data);
        return this.requerimientoRepo.save(req);
    }

    async cambiarEstado(id: string, nuevoEstado: EstadoRequerimiento): Promise<RequerimientoOC> {
        const req = await this.findOne(id);

        // Validación: no cerrar sin acuse de recibo
        if (nuevoEstado === 'CERRADO' && !req.acuseReciboUrl && !req.oficioRespuestaUrl) {
            throw new Error('No se puede cerrar sin documento de respuesta o acuse de recibo');
        }

        req.estado = nuevoEstado;
        if (nuevoEstado === 'ENVIADO' || nuevoEstado === 'CERRADO') {
            req.fechaRespuesta = new Date();
        }
        return this.requerimientoRepo.save(req);
    }

    async delete(id: string): Promise<void> {
        const req = await this.findOne(id);
        await this.requerimientoRepo.remove(req);
    }

    // ============================================
    // SOLICITUDES DE INSUMOS (Delegación)
    // ============================================
    async findInsumosByRequerimiento(requerimientoId: string): Promise<SolicitudInsumo[]> {
        return this.insumoRepo.find({
            where: { requerimientoId },
            order: { fechaSolicitud: 'DESC' }
        });
    }

    async createInsumo(requerimientoId: string, data: Partial<SolicitudInsumo>): Promise<SolicitudInsumo> {
        await this.findOne(requerimientoId); // Validar que existe
        data.requerimientoId = requerimientoId;
        const insumo = this.insumoRepo.create(data);
        return this.insumoRepo.save(insumo);
    }

    async responderInsumo(id: string, data: { documentosEntregadosUrl: string; comentarioRespuesta?: string; respondidoPor: string }): Promise<SolicitudInsumo> {
        const insumo = await this.insumoRepo.findOne({ where: { id } });
        if (!insumo) throw new NotFoundException(`Solicitud de insumo ${id} no encontrada`);

        insumo.documentosEntregadosUrl = data.documentosEntregadosUrl;
        insumo.comentarioRespuesta = data.comentarioRespuesta || '';
        insumo.respondidoPor = data.respondidoPor;
        insumo.fechaRespuesta = new Date();
        insumo.estado = 'ENTREGADO';

        return this.insumoRepo.save(insumo);
    }

    // ============================================
    // HELPERS
    // ============================================
    private calcularDiasRestantes(req: RequerimientoOC): RequerimientoOC {
        if (!req.fechaVencimiento) {
            req.diasRestantes = 0;
            return req;
        }

        const ahora = new Date();
        const vencimiento = new Date(req.fechaVencimiento);

        if (req.unidadTiempo === 'HORAS') {
            const diffHoras = Math.ceil((vencimiento.getTime() - ahora.getTime()) / (1000 * 60 * 60));
            req.diasRestantes = diffHoras; // En horas
        } else if (req.unidadTiempo === 'DIAS_CALENDARIO') {
            const diffDias = Math.ceil((vencimiento.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24));
            req.diasRestantes = diffDias;
        } else {
            // DIAS_HABILES - simplificado
            const diffDias = Math.ceil((vencimiento.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24));
            req.diasRestantes = Math.round(diffDias * 5 / 7); // Aproximación
        }

        return req;
    }

    private calcularFechaVencimiento(fechaRecepcion: Date, plazo: number, unidad: UnidadTiempo): Date {
        const fecha = new Date(fechaRecepcion);

        if (unidad === 'HORAS') {
            fecha.setHours(fecha.getHours() + plazo);
        } else if (unidad === 'DIAS_CALENDARIO') {
            fecha.setDate(fecha.getDate() + plazo);
        } else {
            // DIAS_HABILES - agregar días saltando fines de semana
            let diasAgregados = 0;
            while (diasAgregados < plazo) {
                fecha.setDate(fecha.getDate() + 1);
                const dia = fecha.getDay();
                if (dia !== 0 && dia !== 6) diasAgregados++;
            }
        }

        return fecha;
    }

    private calcularPrioridadAutomatica(plazo: number, unidad: UnidadTiempo): Prioridad {
        // Convertir a días equivalentes
        let diasEquivalentes = plazo;
        if (unidad === 'HORAS') {
            diasEquivalentes = Math.ceil(plazo / 24);
        }
        // DIAS_CALENDARIO y DIAS_HABILES se tratan igual para prioridad

        // Asignar prioridad basándose en días disponibles
        if (diasEquivalentes <= 3) return 'CRITICA';
        if (diasEquivalentes <= 7) return 'ALTA';
        if (diasEquivalentes <= 15) return 'NORMAL';
        return 'BAJA';
    }
}
