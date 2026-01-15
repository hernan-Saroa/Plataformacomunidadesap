import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RequerimientoOC, EstadoRequerimiento, UnidadTiempo, Prioridad } from '../entities/requerimiento-oc.entity';
import { OrganismoControlOC } from '../entities/organismo-control-legal.entity';
import { SolicitudInsumo, EstadoInsumo } from '../entities/solicitud-insumo.entity';
import { CorreosJuridicosService } from './correos-juridicos.service';
import { ComentariosDocumentosOCService } from './comentarios-documentos-oc.service';
import { Abogado } from '../entities/abogado.entity';
import { RespuestaBorradorOC } from '../entities/respuesta-borrador-oc.entity';

@Injectable()
export class RequerimientosOCService {
    constructor(
        @InjectRepository(RequerimientoOC)
        private readonly requerimientoRepo: Repository<RequerimientoOC>,
        @InjectRepository(OrganismoControlOC)
        private readonly organismoRepo: Repository<OrganismoControlOC>,
        @InjectRepository(SolicitudInsumo)
        private readonly insumoRepo: Repository<SolicitudInsumo>,
        @InjectRepository(Abogado)
        private readonly abogadoRepo: Repository<Abogado>,
        @InjectRepository(RespuestaBorradorOC)
        private readonly borradorRepo: Repository<RespuestaBorradorOC>,
        private readonly correosService: CorreosJuridicosService,
        private readonly comentariosService: ComentariosDocumentosOCService,
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
        const reqs = await this.requerimientoRepo.createQueryBuilder('req')
            .leftJoinAndSelect('req.organismo', 'organismo')
            .leftJoinAndSelect('req.abogadoAsignado', 'abogado') // Map to 'abogado' alias matching property name if possible, or use property name
            .loadRelationCountAndMap('req.documentosCount', 'req.documentos')
            .loadRelationCountAndMap('req.docRequerimientos', 'req.documentos', 'docReq', qb =>
                qb.where("docReq.tipoDocumento = 'oficio'")
            )
            .loadRelationCountAndMap('req.docRespuestas', 'req.documentos', 'docRes', qb =>
                qb.where("docRes.tipoDocumento IN ('respuesta', 'acuse')")
            )
            .loadRelationCountAndMap('req.docSoportes', 'req.documentos', 'docSop', qb =>
                qb.where("docSop.tipoDocumento IN ('anexo', 'evidencia', 'informe')")
            )
            .loadRelationCountAndMap('req.docInternos', 'req.documentos', 'docInt', qb =>
                qb.where("docInt.tipoDocumento NOT IN ('oficio', 'respuesta', 'acuse', 'anexo', 'evidencia', 'informe')")
            )
            .orderBy('req.fechaVencimiento', 'ASC')
            .getMany();

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
        const estadoAnterior = req.estado;

        // Validación: no cerrar sin acuse de recibo
        if (nuevoEstado === 'CERRADO' && !req.acuseReciboUrl && !req.oficioRespuestaUrl) {
            throw new Error('No se puede cerrar sin documento de respuesta o acuse de recibo');
        }

        req.estado = nuevoEstado;
        if (nuevoEstado === 'ENVIADO' || nuevoEstado === 'CERRADO') {
            req.fechaRespuesta = new Date();
        }
        const updated = await this.requerimientoRepo.save(req);

        // Log stage change to timeline
        await this.comentariosService.createComentario({
            requerimientoId: id,
            contenido: `Cambio de etapa: ${this.getEtapaLabel(estadoAnterior)} → ${this.getEtapaLabel(nuevoEstado)}`,
            tipo: 'seguimiento',
            autorNombre: 'Sistema'
        });

        return updated;
    }

    private getEtapaLabel(estado: EstadoRequerimiento): string {
        const labels: Record<EstadoRequerimiento, string> = {
            'RECIBIDO': 'Recibido',
            'EN_ANALISIS': 'En Análisis',
            'EN_RESPUESTA': 'Elaborando Respuesta',
            'ENVIADO': 'Respuesta Enviada',
            'CERRADO': 'Cerrado',
            'VENCIDO': 'Vencido'
        };
        return labels[estado] || estado;
    }

    async delete(id: string): Promise<void> {
        const req = await this.findOne(id);
        await this.requerimientoRepo.remove(req);
    }

    async reasignar(id: string, nuevoAbogadoId: string): Promise<RequerimientoOC> {
        // 1. Get current requerimiento
        const req = await this.findOne(id);
        const responsableAnterior = req.funcionarioResponsable || req.abogadoAsignado?.nombreCompleto || 'Sin asignar';

        // 2. Fetch the new lawyer directly from DB
        const nuevoAbogado = await this.abogadoRepo.findOne({ where: { id: nuevoAbogadoId } });
        if (!nuevoAbogado) {
            throw new NotFoundException(`Abogado ${nuevoAbogadoId} no encontrado`);
        }
        const nuevoResponsable = nuevoAbogado.nombreCompleto;

        // 3. Update the requerimiento with new lawyer ID AND name
        await this.requerimientoRepo.update(id, {
            abogadoAsignadoId: nuevoAbogadoId,
            funcionarioResponsable: nuevoResponsable
        });

        // 4. Log to timeline
        await this.comentariosService.createComentario({
            requerimientoId: id,
            contenido: `Reasignación: ${responsableAnterior} → ${nuevoResponsable}`,
            tipo: 'seguimiento',
            autorNombre: 'Sistema'
        });

        // 5. Return updated requerimiento
        return this.findOne(id);
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
        const req = await this.findOne(requerimientoId); // Validar que existe
        data.requerimientoId = requerimientoId;
        const insumo = this.insumoRepo.create(data);
        const savedInsumo = await this.insumoRepo.save(insumo);

        // Enviar notificación por correo si hay email destino
        if (data.emailDestino) {
            try {
                const asunto = `SOLICITUD DE INSUMO URGENTE - Requerimiento ${req.radicadoExterno || req.radicadoInterno}`;
                const cuerpo = `
                    <h3>Solicitud de Insumo Jurídico</h3>
                    <p>Se ha generado una solicitud de insumo para el requerimiento asociado al radicado <strong>${req.radicadoExterno || req.radicadoInterno}</strong>.</p>
                    <p><strong>Área Solicitante:</strong> Gestión Jurídica</p>
                    <p><strong>Descripción:</strong> ${data.descripcionSolicitud}</p>
                    <p><strong>Fecha Límite Interna:</strong> ${data.fechaVencimientoInterna ? new Date(data.fechaVencimientoInterna).toLocaleDateString() : 'Por definir'}</p>
                    <br>
                    <p>Por favor gestionar esta solicitud a la mayor brevedad posible.</p>
                `;

                await this.correosService.sendEmail({
                    to: data.emailDestino,
                    subject: asunto,
                    body: cuerpo
                });
            } catch (error) {
                console.error('Error enviando notificación de insumo:', error);
                // No fallamos la transacción, solo logueamos el error de correo
            }
        }

        return savedInsumo;
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
    // ENVIAR RESPUESTA FORMAL
    // ============================================
    async enviarRespuesta(requerimientoId: string, data: {
        destinatarioEmail: string;
        asunto: string;
        cuerpoMensaje: string;
        tipoRespuesta: string;
        destinatarioNombre?: string;
        destinatarioCargo?: string;
    }): Promise<{ success: boolean; message: string }> {
        const req = await this.findOne(requerimientoId);

        try {
            // Enviar correo vía Microsoft Graph
            await this.correosService.sendEmail({
                to: data.destinatarioEmail,
                subject: data.asunto,
                body: data.cuerpoMensaje,
            });

            // Actualizar estado del requerimiento
            req.estado = 'ENVIADO';
            req.fechaRespuesta = new Date();
            await this.requerimientoRepo.save(req);

            return {
                success: true,
                message: `Respuesta enviada exitosamente a ${data.destinatarioEmail}. El requerimiento ha cambiado a estado ENVIADO.`
            };
        } catch (error) {
            console.error('Error enviando respuesta:', error);
            return {
                success: false,
                message: `Error al enviar respuesta: ${error.message || 'Error desconocido'}`
            };
        }
    }

    // ============================================
    // BORRADORES DE RESPUESTA
    // ============================================
    async getBorrador(requerimientoId: string): Promise<RespuestaBorradorOC | null> {
        return this.borradorRepo.findOne({
            where: { requerimientoId }
        });
    }

    async upsertBorrador(requerimientoId: string, data: Partial<RespuestaBorradorOC>): Promise<RespuestaBorradorOC> {
        let borrador = await this.borradorRepo.findOne({
            where: { requerimientoId }
        });

        if (borrador) {
            // Actualizar existente
            Object.assign(borrador, data);
            borrador.updatedAt = new Date();
        } else {
            // Crear nuevo
            borrador = this.borradorRepo.create({
                ...data,
                requerimientoId
            });
        }

        return this.borradorRepo.save(borrador);
    }

    async deleteBorrador(requerimientoId: string): Promise<void> {
        await this.borradorRepo.delete({ requerimientoId });
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
