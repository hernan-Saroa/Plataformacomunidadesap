import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RequerimientoOC, EstadoRequerimiento, UnidadTiempo, Prioridad } from '../entities/requerimiento-oc.entity';
import { OrganismoControlOC } from '../entities/organismo-control-legal.entity';
import { SolicitudInsumo, EstadoInsumo } from '../entities/solicitud-insumo.entity';
import { CorreosJuridicosService } from './correos-juridicos.service';
import { ComentariosDocumentosOCService } from './comentarios-documentos-oc.service';
import { RespuestaBorradorOC } from '../entities/respuesta-borrador-oc.entity';
import { TipoRequerimientoOC } from '../entities/tipo-requerimiento-oc.entity';
import { DiasHabilesService } from './dias-habiles.service';
import { LegalNotificationsService } from './legal-notifications.service';

@Injectable()
export class RequerimientosOCService {
    constructor(
        @InjectRepository(RequerimientoOC)
        private readonly requerimientoRepo: Repository<RequerimientoOC>,
        @InjectRepository(OrganismoControlOC)
        private readonly organismoRepo: Repository<OrganismoControlOC>,
        @InjectRepository(SolicitudInsumo)
        private readonly insumoRepo: Repository<SolicitudInsumo>,
        @InjectRepository(RespuestaBorradorOC)
        private readonly borradorRepo: Repository<RespuestaBorradorOC>,
        @InjectRepository(TipoRequerimientoOC)
        private readonly tipoRequerimientoRepo: Repository<TipoRequerimientoOC>,
        private readonly correosService: CorreosJuridicosService,
        private readonly comentariosService: ComentariosDocumentosOCService,
        private readonly diasHabilesService: DiasHabilesService,
        private readonly legalNotifications: LegalNotificationsService,
    ) { }

    // ============================================
    // ORGANISMOS (Catálogo)
    // ============================================
    async findAllOrganismos(): Promise<OrganismoControlOC[]> {
        return this.organismoRepo.find({ order: { nombre: 'ASC' } });
    }

    async createOrganismo(data: Partial<OrganismoControlOC>): Promise<OrganismoControlOC> {
        const organismo = this.organismoRepo.create({
            ...data,
            correos: data.correos ?? [],
        });
        return this.organismoRepo.save(organismo);
    }

    async updateOrganismo(id: number, data: Partial<OrganismoControlOC>): Promise<OrganismoControlOC> {
        const organismo = await this.organismoRepo.findOne({ where: { id } });
        if (!organismo) throw new NotFoundException(`Organismo ${id} no encontrado`);
        Object.assign(organismo, data);
        return this.organismoRepo.save(organismo);
    }

    async deleteOrganismo(id: number): Promise<void> {
        const organismo = await this.organismoRepo.findOne({ where: { id } });
        if (!organismo) throw new NotFoundException(`Organismo ${id} no encontrado`);
        organismo.activo = false;
        await this.organismoRepo.save(organismo);
    }

    async syncOrganismos(organismos: Partial<OrganismoControlOC>[]): Promise<OrganismoControlOC[]> {
        const results: OrganismoControlOC[] = [];
        for (const org of organismos) {
            if (org.id) {
                const existing = await this.organismoRepo.findOne({ where: { id: org.id } });
                if (existing) {
                    Object.assign(existing, { ...org, correos: org.correos ?? existing.correos });
                    results.push(await this.organismoRepo.save(existing));
                    continue;
                }
            }
            const nuevo = this.organismoRepo.create({ ...org, correos: org.correos ?? [] });
            results.push(await this.organismoRepo.save(nuevo));
        }
        return results;
    }

    // ============================================
    // TIPOS DE REQUERIMIENTO (Catálogo)
    // ============================================
    async findAllTiposRequerimiento(): Promise<TipoRequerimientoOC[]> {
        return this.tipoRequerimientoRepo.find({ where: { activo: true }, order: { orden: 'ASC' } });
    }

    // ============================================
    // REQUERIMIENTOS
    // ============================================
    async findAll(filtros: { asignadoKeys?: string[] } = {}): Promise<RequerimientoOC[]> {
        const query = this.requerimientoRepo.createQueryBuilder('req')
            // .leftJoinAndSelect('req.organismo', 'organismo') // Relación eliminada para soportar IDs string locales
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
            .where("(req.estadoArchivo IS NULL OR req.estadoArchivo = 'ACTIVO')")
            .orderBy('req.fechaVencimiento', 'ASC');

        if (filtros.asignadoKeys?.length) {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            const uuidKeys = filtros.asignadoKeys.filter((key) => uuidRegex.test(key));
            const normalizedKeys = filtros.asignadoKeys.map((key) => key.toLowerCase());

            if (uuidKeys.length) {
                query.andWhere(
                    `(req.abogado_asignado_id::text IN (:...uuidKeys)
                      OR req.abogado_asignado_id::text IN (
                          SELECT u.public_id::text
                          FROM auth."user" u
                          WHERE u.id_user::text IN (:...uuidKeys)
                      )
                      OR LOWER(req.funcionarioResponsable) IN (:...normalizedKeys)
                      OR LOWER(req.funcionarioResponsable) IN (
                          SELECT LOWER(p.nom_largo)
                          FROM auth."user" u
                          LEFT JOIN auth.personas p ON p.id_person = u.id_person
                          WHERE u.id_user::text IN (:...uuidKeys)
                      ))`,
                    { uuidKeys, normalizedKeys },
                );
            } else {
                query.andWhere(
                    'LOWER(req.funcionarioResponsable) IN (:...normalizedKeys)',
                    { normalizedKeys },
                );
            }
        }

        const reqs = await query.getMany();
        return reqs.map(r => this.calcularDiasRestantes(r));
    }

    async findAllArchivados(filtros: { asignadoKeys?: string[] } = {}): Promise<RequerimientoOC[]> {
        const query = this.requerimientoRepo.createQueryBuilder('req')
            .where("req.estadoArchivo = 'ARCHIVADO' OR req.estadoArchivo = 'ELIMINADO'");
        
        if (filtros.asignadoKeys?.length) {
            const normalizedKeys = filtros.asignadoKeys.map((key) => key.toLowerCase());
            query.andWhere(
                '(req.abogado_asignado_id::text IN (:...asignadoKeys) OR LOWER(req.funcionarioResponsable) IN (:...normalizedKeys))',
                { asignadoKeys: filtros.asignadoKeys, normalizedKeys },
            );
        }

        const reqs = await query.orderBy('req.fechaArchivo', 'DESC').getMany();

        return reqs;
    }

    async findOne(id: string): Promise<RequerimientoOC> {
        const req = await this.requerimientoRepo.findOne({ where: { id } });
        if (!req) throw new NotFoundException(`Requerimiento ${id} no encontrado`);
        return this.calcularDiasRestantes(req);
    }

    async create(data: Partial<RequerimientoOC>): Promise<RequerimientoOC> {
        try {
            // Generar radicado interno automático de forma robusta
            const year = new Date().getFullYear();
            const prefix = `REQ-OC-${year}-`;

            // Buscar el último radicado de este año para incrementar
            const qb = this.requerimientoRepo.createQueryBuilder('req');
            qb.select('MAX(req.radicadoInterno)', 'max');
            qb.where('req.radicadoInterno LIKE :prefix', { prefix: `${prefix}%` });

            const result = await qb.getRawOne();
            const maxRadicado = result ? result.max : null;

            let nextNumber = 1;
            if (maxRadicado) {
                // Extraer el número final: REQ-OC-2025-0005 -> 5
                const parts = maxRadicado.split('-');
                const numPart = parts[parts.length - 1];
                nextNumber = parseInt(numPart) + 1;
            }

            data.radicadoInterno = `${prefix}${String(nextNumber).padStart(4, '0')}`;

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
            const saved = await this.requerimientoRepo.save(req);

            await this.legalNotifications.notifyProcesoCreado({
                modulo: 'ORGANOS_CONTROL',
                radicado: saved.radicadoInterno,
                procesoId: saved.id,
                creadoPor: (data as any).creadoPor || (data as any).usuario || 'Sistema',
            });

            return saved;
        } catch (error) {
            console.error('Error creando Requerimiento OC:', error);
            // Re-throw con mensaje más claro si es constraint violation
            if (error.code === '23505') { // Postgres unique violation
                throw new Error('Error de duplicidad: Ya existe un requerimiento con este radicado interno. Por favor intente nuevamente.');
            }
            throw error;
        }
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

    async reasignar(id: string, nuevoAbogadoId: string, nuevoAbogadoNombre?: string): Promise<RequerimientoOC> {
        // 1. Get current requerimiento
        const req = await this.findOne(id);
        const responsableAnterior = req.funcionarioResponsable || req.abogadoAsignadoId || 'Sin asignar';

        // 2. Resolve lawyer name from auth-service data sent by the frontend.
        //    Assignments are auth user ids, not records from legal_management.abogados.
        const nuevoResponsable = nuevoAbogadoNombre || nuevoAbogadoId;

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

        // El correo ya fue enviado por el frontend con los adjuntos vía Graph.
        // Aquí solo registramos el estado y la trazabilidad.
        req.estado = 'ENVIADO';
        req.fechaRespuesta = new Date();
        await this.requerimientoRepo.save(req);

        await this.comentariosService.createComentario({
            requerimientoId,
            contenido: `Respuesta enviada a: ${data.destinatarioEmail}`,
            tipo: 'seguimiento',
            autorNombre: 'Sistema'
        });

        return {
            success: true,
            message: `Requerimiento marcado como ENVIADO. Respuesta registrada para ${data.destinatarioEmail}.`
        };
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
            // DIAS_HABILES - usar servicio robusto (Ley 1437)
            return this.diasHabilesService.agregarDiasHabiles(fecha, plazo);
        }

        return fecha;
    }

    // ============================================
    // SISTEMA DE ARCHIVO
    // ============================================
    async archivar(id: string, data: { motivo: string; usuario: string }): Promise<RequerimientoOC> {
        const req = await this.findOne(id);
        req.estadoArchivo = 'ARCHIVADO';
        req.fechaArchivo = new Date();
        req.usuarioArchivo = data.usuario;
        req.motivoArchivo = data.motivo;
        req.estado = 'CERRADO'; // Al archivar, se cierra automáticamente si no lo estaba

        await this.comentariosService.createComentario({
            requerimientoId: id,
            contenido: `Requerimiento archivado. Motivo: ${data.motivo}`,
            tipo: 'seguimiento',
            autorNombre: data.usuario
        });

        return this.requerimientoRepo.save(req);
    }

    async restaurar(id: string, usuario: string): Promise<RequerimientoOC> {
        const req = await this.findOne(id);
        req.estadoArchivo = 'ACTIVO';
        req.fechaArchivo = null;
        req.usuarioArchivo = null;
        req.motivoArchivo = null;

        // Al restaurar, devolvemos al estado inicial para que aparezca en el tablero
        req.estado = 'RECIBIDO';

        await this.comentariosService.createComentario({
            requerimientoId: id,
            contenido: 'Requerimiento restaurado del archivo',
            tipo: 'seguimiento',
            autorNombre: usuario
        });

        return this.requerimientoRepo.save(req);
    }

    async eliminarPermanente(id: string, usuario: string, motivo: string): Promise<void> {
        const req = await this.findOne(id);

        // Si ya está eliminado (soft delete), procedemos a borrarlo físicamente (hard delete)
        if (req.estadoArchivo === 'ELIMINADO') {
            await this.requerimientoRepo.delete(id);
            return;
        }

        // Si no, hacemos Soft Delete (marcar como ELIMINADO para auditoría)
        req.estadoArchivo = 'ELIMINADO';
        req.fechaArchivo = new Date();
        req.usuarioArchivo = usuario;
        req.motivoArchivo = motivo;

        await this.requerimientoRepo.save(req);
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
