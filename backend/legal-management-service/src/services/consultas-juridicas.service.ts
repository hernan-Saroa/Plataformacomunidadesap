import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { ConsultaJuridica } from '../entities/consulta-juridica.entity';
import { ConsultaJuridicaHistorial } from '../entities/consulta-juridica-historial.entity';
import { TerminosService } from './terminos.service';
import { DiasHabilesService } from './dias-habiles.service';
import { DocumentosConsultaService } from './documentos-consulta.service';
import { NotificationClientService } from './notification-client.service';
import { LegalNotificationsService } from './legal-notifications.service';

import { OnModuleInit } from '@nestjs/common';

@Injectable()
export class ConsultasJuridicasService implements OnModuleInit {
    private readonly logger = new Logger(ConsultasJuridicasService.name);

    constructor(
        @InjectRepository(ConsultaJuridica)
        private readonly consultaRepository: Repository<ConsultaJuridica>,
        @InjectRepository(ConsultaJuridicaHistorial)
        private readonly historialRepository: Repository<ConsultaJuridicaHistorial>,
        private readonly terminosService: TerminosService,
        private readonly diasHabilesService: DiasHabilesService,
        private readonly documentosService: DocumentosConsultaService,
        private readonly notificationClient: NotificationClientService,
        private readonly legalNotifications: LegalNotificationsService
    ) { }

    async onModuleInit() {
        try {
            await this.historialRepository.query(`
                CREATE TABLE IF NOT EXISTS "legal_management"."consulta_juridica_historial" (
                    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                    "consulta_id" uuid NOT NULL,
                    "tipo_evento" character varying NOT NULL,
                    "descripcion" text NOT NULL,
                    "detalle" text,
                    "usuario" character varying,
                    "fecha" TIMESTAMP NOT NULL DEFAULT now(),
                    CONSTRAINT "PK_consulta_juridica_historial" PRIMARY KEY ("id"),
                    CONSTRAINT "FK_consulta_juridica_historial_consulta" FOREIGN KEY ("consulta_id") REFERENCES "legal_management"."consultas_juridicas"("id") ON DELETE CASCADE
                );
            `);
            console.log('Tabla legal_management.consulta_juridica_historial verificada/creada');
        } catch (error) {
            console.error('Error creando tabla historial:', error);
        }
    }

    async findAll(filtros: { asignadoKeys?: string[] } = {}): Promise<any[]> {
        const query = this.consultaRepository
            .createQueryBuilder('consulta')
            .where('consulta.estadoArchivo = :estadoArchivo', { estadoArchivo: 'ACTIVO' });

        if (filtros.asignadoKeys?.length) {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            const uuidKey = filtros.asignadoKeys.find(k => uuidRegex.test(k));
            const normalizedKeys = filtros.asignadoKeys.map(k => k.toLowerCase());
            if (uuidKey) {
                query.andWhere(
                    `(consulta.abogadoAsignadoId::text = :userId
                      OR LOWER(consulta.abogadoAsignadoNombre) IN (:...normalizedKeys)
                      OR LOWER(consulta.abogadoAsignadoNombre) = (
                          SELECT LOWER(p.nom_largo)
                          FROM auth."user" u
                          LEFT JOIN auth.personas p ON p.id_person = u.id_person
                          WHERE u.id_user::text = :userId
                          LIMIT 1
                      ))`,
                    { userId: uuidKey, normalizedKeys },
                );
            } else {
                query.andWhere(
                    'LOWER(consulta.abogadoAsignadoNombre) IN (:...normalizedKeys)',
                    { normalizedKeys },
                );
            }
        }

        const consultas = await query.orderBy('consulta.fechaRecepcion', 'DESC').getMany();

        // Return with calculated diasRestantes and prioridad
        return consultas.map(c => {
            const diasRestantes = this.calcularDiasRestantes(c.fechaMaximaRespuesta);
            const prioridad = this.calcularPrioridadAutomatica(diasRestantes);
            return {
                ...c,
                diasRestantes,
                prioridad
            };
        });
    }

    async findOne(id: string): Promise<ConsultaJuridica> {
        const consulta = await this.consultaRepository.findOne({ where: { id } });
        if (!consulta) throw new NotFoundException('Consulta no encontrada');
        return consulta;
    }

    async create(data: Partial<ConsultaJuridica>, file?: {
        filename: string;
        path: string;
        mimetype: string;
        size: number;
        originalname: string;
    }): Promise<ConsultaJuridica> {
        // Generate radicado number - Find max radicado for current year robustly
        const year = new Date().getFullYear();
        const prefix = `CJ-${year}-`;

        // Get all radicados for this year to find the real max, avoiding string sort issues with mixed padding
        const yearConsultas = await this.consultaRepository.find({
            where: { numeroRadicado: Like(`${prefix}%`) },
            select: ['numeroRadicado']
        });

        let nextNumber = 1;
        if (yearConsultas.length > 0) {
            const numbers = yearConsultas.map(c => {
                const parts = c.numeroRadicado.split('-');
                return parseInt(parts[parts.length - 1], 10) || 0;
            });
            nextNumber = Math.max(...numbers) + 1;
        }

        const numeroRadicado = `${prefix}${String(nextNumber).padStart(4, '0')}`;

        // Calcular fecha máxima respuesta usando días HÁBILES (Ley 1437)
        const terminoDias = this.diasHabilesService.obtenerTerminoLegal(data.tipoSolicitud || 'consulta');
        const fechaMaxima = this.diasHabilesService.agregarDiasHabiles(new Date(), terminoDias);

        const nuevaConsulta = this.consultaRepository.create({
            ...data,
            numeroRadicado,
            fechaRecepcion: new Date(),
            fechaMaximaRespuesta: fechaMaxima,
            estado: data.abogadoAsignadoId ? 'asignado' : 'en_radicacion',
            fechaAsignacion: data.abogadoAsignadoId ? new Date() : undefined
        });

        const savedConsulta = await this.consultaRepository.save(nuevaConsulta);

        // Si hay archivo adjunto, crearlo en DocumentosConsulta
        if (file) {
            try {
                await this.documentosService.create({
                    consultaId: savedConsulta.id,
                    nombre: file.originalname,
                    tipoDocumento: 'adjunto',
                    descripcion: 'Documento adjunto al radicar la consulta',
                    archivoUrl: `files/${file.filename}`, // Ruta relativa compatible con sistema existente
                    archivoNombreOriginal: file.originalname,
                    tamanoBytes: file.size,
                    mimeType: file.mimetype,
                    subidoPor: data.nombreSolicitante || 'Sistema'
                });
            } catch (error) {
                console.error('Error guardando documento inicial:', error);
                // No lanzar error para no interrumpir la creación de la consulta, pero loguear
            }
        }

        // Sync with Control de Términos
        await this.terminosService.createAutomatico(
            'ASESORIA',
            savedConsulta.id,
            savedConsulta.numeroRadicado,
            data.tipoSolicitud || 'Consulta Jurídica',
            new Date(),
            data.terminoLegalDias || 30,
            data.abogadoAsignadoId // If assigned on creation
        );

        // Registro Historial Creación
        const creadoPor = data.nombreSolicitante || 'Sistema';
        await this.registrarEvento(
            savedConsulta.id,
            'CREACIÓN',
            'Consulta radicada en el sistema',
            `Radicado: ${numeroRadicado}`,
            creadoPor
        );

        await this.legalNotifications.notifyProcesoCreado({
            modulo: 'ASESORIA_JURIDICA',
            radicado: numeroRadicado,
            procesoId: savedConsulta.id,
            creadoPor,
        });

        return savedConsulta;
    }

    async update(id: string, data: Partial<ConsultaJuridica>): Promise<ConsultaJuridica> {
        const consulta = await this.findOne(id);
        const updateData: any = { ...data };

        // If assigning abogado for the first time, update estado and fechaAsignacion
        if (data.abogadoAsignadoId && !consulta.abogadoAsignadoId) {
            updateData.fechaAsignacion = new Date();
            if (consulta.estado === 'en_radicacion') {
                updateData.estado = 'asignado';
            }
            // Log Assignment
            await this.registrarEvento(
                id,
                'ASIGNACIÓN',
                'Abogado asignado a la consulta',
                `Abogado ID: ${data.abogadoAsignadoId}`,
                'Sistema'
            );
        } else if (data.abogadoAsignadoId && data.abogadoAsignadoId !== consulta.abogadoAsignadoId) {
            // Reassignment
            await this.registrarEvento(
                id,
                'REASIGNACIÓN',
                'Cambio de abogado asignado',
                `Nuevo Abogado ID: ${data.abogadoAsignadoId}`,
                'Sistema'
            );
        }

        // Use update() instead of save() to avoid TypeORM relation issues
        await this.consultaRepository.update(id, updateData);
        return this.findOne(id);
    }

    async updateEstado(id: string, estado: string, usuario: string = 'Sistema', estadoNombre?: string): Promise<ConsultaJuridica> {
        const consulta = await this.findOne(id);
        const estadoAnterior = consulta.estado;
        consulta.estado = estado;

        // Usar el nombre legible si se proporciona, de lo contrario usar el ID
        const nombreEstado = estadoNombre || estado;
        const nombreEstadoAnterior = estadoAnterior || 'Sin estado';

        await this.registrarEvento(
            id,
            'CAMBIO_ETAPA',
            `Cambio de etapa: ${nombreEstadoAnterior} -> ${nombreEstado}`,
            `Nueva etapa: ${nombreEstado}`,
            usuario
        );

        return this.consultaRepository.save(consulta);
    }

    async responder(id: string, respuestaData: {
        numeroOficioRespuesta?: string;
        tipoRespuesta: string;
        documentoRespuestaUrl?: string | null;
        observaciones?: string;
    }, usuario: string = 'Sistema'): Promise<ConsultaJuridica> {
        const consulta = await this.findOne(id);

        const estadoAnterior = consulta.estado;
        consulta.tipoRespuesta = respuestaData.tipoRespuesta;
        consulta.numeroOficioRespuesta = respuestaData.numeroOficioRespuesta ?? consulta.numeroOficioRespuesta;
        consulta.documentoRespuestaUrl = respuestaData.documentoRespuestaUrl ?? consulta.documentoRespuestaUrl;
        consulta.observaciones = respuestaData.observaciones ?? consulta.observaciones;
        consulta.fechaRespuesta = new Date();
        consulta.estado = 'respondido'; // 'respondido' is often mapped to 'ENVIADA' or similar in frontend logic, verify if consistency needed

        // Log Respuesta event
        await this.registrarEvento(
            id,
            'RESPUESTA',
            'Respuesta oficial emitida',
            `Oficio: ${respuestaData.numeroOficioRespuesta || 'N/A'}, Tipo: ${respuestaData.tipoRespuesta}`,
            usuario
        );

        // Log Stage Change event if it changed
        if (estadoAnterior !== consulta.estado) {
            await this.registrarEvento(
                id,
                'CAMBIO_ETAPA',
                `Cambio de etapa: ${estadoAnterior} -> ${consulta.estado}`,
                'Cierre automático por envío de respuesta',
                usuario
            );
        }

        return this.consultaRepository.save(consulta);
    }

    async updateRespuesta(id: string, respuesta: string, enviar: boolean, usuario: string = 'Sistema', destinatariosAdicionales?: string[]): Promise<ConsultaJuridica> {
        const consulta = await this.findOne(id);
        const estadoAnterior = consulta.estado;

        consulta.respuesta = respuesta;

        if (destinatariosAdicionales && destinatariosAdicionales.length > 0) {
            consulta.destinatariosAdicionales = JSON.stringify(destinatariosAdicionales);
        }

        if (enviar) {
            consulta.fechaRespuesta = new Date();
            consulta.estado = 'respondido';
            consulta.tipoRespuesta = consulta.tipoRespuesta || 'favorable';

            const usuarioLog = usuario || 'Sistema';
            await this.registrarEvento(
                id,
                'RESPUESTA',
                'Respuesta enviada (desde editor)',
                'Respuesta enviada directamente desde el editor de texto',
                usuarioLog
            );

            if (estadoAnterior !== consulta.estado) {
                await this.registrarEvento(
                    id,
                    'CAMBIO_ETAPA',
                    `Cambio de etapa: ${estadoAnterior} -> ${consulta.estado}`,
                    'Cierre automático por envío de respuesta',
                    usuarioLog
                );
            }
        }

        return this.consultaRepository.save(consulta);
    }

    async enviarAJefe(id: string, respuesta: string, usuario: string = 'Sistema', destinatariosAdicionales?: string[]): Promise<ConsultaJuridica> {
        const consulta = await this.findOne(id);
        const estadoAnterior = consulta.estado;

        consulta.respuesta = respuesta;
        consulta.estado = 'pendiente_revision_jefe';
        consulta.comentarioDevolucionJefe = null as any;

        if (destinatariosAdicionales && destinatariosAdicionales.length > 0) {
            consulta.destinatariosAdicionales = JSON.stringify(destinatariosAdicionales);
        }

        await this.registrarEvento(
            id,
            'ENVIADO_A_JEFE',
            'Respuesta enviada al jefe para revisión',
            `Borrador enviado por: ${usuario}`,
            usuario
        );

        if (estadoAnterior !== consulta.estado) {
            await this.registrarEvento(
                id,
                'CAMBIO_ETAPA',
                `Cambio de etapa: ${estadoAnterior} -> pendiente_revision_jefe`,
                'Pendiente aprobación del jefe',
                usuario
            );
        }

        const saved = await this.consultaRepository.save(consulta);

        // Notificar al jefe de gestión legal (in-app + email)
        this.notificarJefeRevisionPendiente(saved, usuario).catch(err =>
            this.logger.warn(`Error enviando notificación al jefe: ${err?.message}`)
        );

        return saved;
    }

    private async notificarJefeRevisionPendiente(consulta: ConsultaJuridica, enviador: string): Promise<void> {
        const radicado = consulta.numeroRadicado || consulta.id;
        const linkConsulta = `${process.env.FRONTEND_URL || 'http://localhost:4200'}/gestion-legal/asesoria-juridica`;

        const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                <h2 style="color: #003DA5;">Respuesta Pendiente de Revisión - Asesoría Jurídica</h2>
                <p>El abogado <strong>${enviador}</strong> ha enviado una respuesta para su revisión y aprobación.</p>

                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #eee; width: 35%;"><strong>Radicado:</strong></td>
                        <td style="padding: 10px; border-bottom: 1px solid #eee;">${radicado}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Solicitante:</strong></td>
                        <td style="padding: 10px; border-bottom: 1px solid #eee;">${consulta.nombreSolicitante || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Materia Jurídica:</strong></td>
                        <td style="padding: 10px; border-bottom: 1px solid #eee;">${consulta.materiaJuridica || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Enviado por:</strong></td>
                        <td style="padding: 10px; border-bottom: 1px solid #eee;">${enviador}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px;"><strong>Fecha:</strong></td>
                        <td style="padding: 10px;">${new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })}</td>
                    </tr>
                </table>

                <p>Por favor ingrese a la plataforma para revisar la respuesta y aprobarla o devolverla con comentarios.</p>

                <div style="text-align: center; margin-top: 30px;">
                    <a href="${linkConsulta}" style="background-color: #003DA5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Revisar Respuesta</a>
                </div>

                <p style="font-size: 12px; color: #666; margin-top: 30px;">
                    Este es un mensaje automatizado desde la Plataforma Integrada ESAP. Por favor, no responda a este correo.
                </p>
            </div>
        `;

        await this.notificationClient.notifyByRoles(
            ['JEFE_GESTION_LEGAL'],
            {
                tipo_notificacion: 'RESPUESTA_PENDIENTE_REVISION',
                titulo: 'Respuesta pendiente de revisión',
                mensaje: `${enviador} ha enviado la respuesta del radicado ${radicado} para su revisión y aprobación.`,
                descripcion_corta: `Radicado ${radicado} pendiente de aprobación`,
                icono: 'FileCheck',
                color: '#F59E0B',
                prioridad: 'Alta',
                categoria: 'gestion-legal',
                tiene_accion: true,
                texto_boton_accion: 'Revisar respuesta',
                url_accion: linkConsulta,
                datos_adicionales: {
                    consultaId: consulta.id,
                    numeroRadicado: radicado,
                    enviado_por: enviador,
                    solicitante: consulta.nombreSolicitante,
                    materiaJuridica: consulta.materiaJuridica
                }
            },
            {
                subject: `Revisión pendiente: Radicado ${radicado} - Asesoría Jurídica`,
                html: emailHtml
            }
        );

        this.logger.log(`Notificación de revisión pendiente enviada al jefe — Radicado: ${radicado}, Enviado por: ${enviador}`);
    }

    async aprobarRespuesta(id: string, usuario: string = 'Sistema', destinatariosAdicionales?: string[]): Promise<ConsultaJuridica> {
        const consulta = await this.findOne(id);
        const estadoAnterior = consulta.estado;

        consulta.estado = 'respondido';
        consulta.fechaRespuesta = new Date();
        consulta.tipoRespuesta = consulta.tipoRespuesta || 'favorable';
        consulta.comentarioDevolucionJefe = null as any;

        if (destinatariosAdicionales && destinatariosAdicionales.length > 0) {
            consulta.destinatariosAdicionales = JSON.stringify(destinatariosAdicionales);
        }

        await this.registrarEvento(
            id,
            'RESPUESTA',
            'Respuesta aprobada y enviada por el jefe',
            `Enviada por: ${usuario}`,
            usuario
        );

        if (estadoAnterior !== consulta.estado) {
            await this.registrarEvento(
                id,
                'CAMBIO_ETAPA',
                `Cambio de etapa: ${estadoAnterior} -> respondido`,
                'Aprobada y enviada al solicitante',
                usuario
            );
        }

        return this.consultaRepository.save(consulta);
    }

    async devolverRespuesta(id: string, comentario: string, usuario: string = 'Sistema'): Promise<ConsultaJuridica> {
        const consulta = await this.findOne(id);
        const estadoAnterior = consulta.estado;

        consulta.estado = 'devuelta_por_jefe';
        consulta.comentarioDevolucionJefe = comentario;

        await this.registrarEvento(
            id,
            'DEVUELTA_POR_JEFE',
            'Respuesta devuelta al abogado por el jefe',
            `Motivo: ${comentario}`,
            usuario
        );

        if (estadoAnterior !== consulta.estado) {
            await this.registrarEvento(
                id,
                'CAMBIO_ETAPA',
                `Cambio de etapa: ${estadoAnterior} -> devuelta_por_jefe`,
                'Requiere correcciones del abogado',
                usuario
            );
        }

        return this.consultaRepository.save(consulta);
    }

    async delete(id: string): Promise<void> {
        const consulta = await this.findOne(id);
        await this.consultaRepository.remove(consulta);
    }

    /**
     * Calcula días hábiles restantes hasta la fecha máxima de respuesta
     * Usa días HÁBILES según Ley 1437 de 2011 (excluye fines de semana y festivos)
     */
    calcularDiasRestantes(fechaMaxima: Date | null): number {
        if (!fechaMaxima) return 30; // Default if no date set
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        const fechaMax = new Date(fechaMaxima);
        fechaMax.setHours(0, 0, 0, 0);

        // Si ya venció, retornar días negativos (también en días hábiles)
        if (fechaMax < hoy) {
            return -this.diasHabilesService.calcularDiasHabiles(fechaMax, hoy);
        }

        // Calcular días hábiles restantes
        return this.diasHabilesService.calcularDiasHabiles(hoy, fechaMax);
    }

    // Calcular prioridad automáticamente basándose en días restantes
    calcularPrioridadAutomatica(diasRestantes: number): string {
        if (diasRestantes <= 3) return 'alta';      // Crítico
        if (diasRestantes <= 7) return 'media';     // Urgente
        return 'baja';                               // Normal
    }

    // --- Historial Methods ---

    async registrarEvento(consultaId: string, tipo: string, descripcion: string, detalle: string = '', usuario: string = 'Sistema'): Promise<void> {
        const evento = this.historialRepository.create({
            consultaId,
            tipoEvento: tipo,
            descripcion,
            detalle,
            usuario,
            fecha: new Date()
        });
        await this.historialRepository.save(evento);
    }

    async getHistorial(consultaId: string): Promise<ConsultaJuridicaHistorial[]> {
        return this.historialRepository.find({
            where: { consultaId },
            order: { fecha: 'DESC' }
        });
    }

    // --- Métodos de Archivo y Eliminación ---

    async getArchivadas(filtros: { asignadoKeys?: string[] } = {}): Promise<ConsultaJuridica[]> {
        const query = this.consultaRepository
            .createQueryBuilder('consulta')
            .where('consulta.estadoArchivo IN (:...estadosArchivo)', {
                estadosArchivo: ['ARCHIVADO', 'ELIMINADO'],
            });

        if (filtros.asignadoKeys?.length) {
            const normalizedKeys = filtros.asignadoKeys.map((key) => key.toLowerCase());
            query.andWhere(
                '(consulta.abogadoAsignadoId IN (:...asignadoKeys) OR LOWER(consulta.abogadoAsignadoNombre) IN (:...normalizedKeys))',
                { asignadoKeys: filtros.asignadoKeys, normalizedKeys },
            );
        }

        return query.orderBy('consulta.fechaArchivo', 'DESC').getMany();
    }

    async archivar(id: string, motivo: string, usuario: string): Promise<ConsultaJuridica> {
        const consulta = await this.findOne(id);

        consulta.estadoArchivo = 'ARCHIVADO';
        consulta.fechaArchivo = new Date();
        consulta.usuarioArchivo = usuario;
        consulta.motivoArchivo = motivo;

        await this.registrarEvento(
            id,
            'ARCHIVADO',
            'Consulta archivada',
            `Motivo: ${motivo}`,
            usuario
        );

        return this.consultaRepository.save(consulta);
    }

    async eliminarSoft(id: string, motivo: string, usuario: string): Promise<ConsultaJuridica> {
        const consulta = await this.findOne(id);

        consulta.estadoArchivo = 'ELIMINADO';
        consulta.fechaArchivo = new Date();
        consulta.usuarioArchivo = usuario;
        consulta.motivoArchivo = motivo;

        await this.registrarEvento(
            id,
            'ELIMINADO_SOFT',
            'Consulta movida a papelera',
            `Motivo: ${motivo}`,
            usuario
        );

        return this.consultaRepository.save(consulta);
    }

    async restaurar(id: string, usuario: string): Promise<ConsultaJuridica> {
        // Buscar incluso si está archivado/eliminado
        const consulta = await this.consultaRepository.findOne({
            where: { id }
        });

        if (!consulta) throw new NotFoundException('Consulta no encontrada');

        const estadoAnterior = consulta.estadoArchivo;
        consulta.estadoArchivo = 'ACTIVO';
        consulta.fechaArchivo = null as any;
        consulta.usuarioArchivo = null as any;
        consulta.motivoArchivo = null as any;

        await this.registrarEvento(
            id,
            'RESTAURADO',
            'Consulta restaurada',
            `Restaurada desde estado: ${estadoAnterior}`,
            usuario
        );

        return this.consultaRepository.save(consulta);
    }

    async eliminarPermanente(id: string): Promise<void> {
        const consulta = await this.consultaRepository.findOne({ where: { id } });
        if (!consulta) throw new NotFoundException('Consulta no encontrada');

        // Eliminar historial relacionado primero (cascade debería manejarlo pero por seguridad)
        // await this.historialRepository.delete({ consultaId: id });

        await this.consultaRepository.remove(consulta);
    }
}
