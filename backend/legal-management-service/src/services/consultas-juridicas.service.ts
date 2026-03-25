import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { ConsultaJuridica } from '../entities/consulta-juridica.entity';
import { ConsultaJuridicaHistorial } from '../entities/consulta-juridica-historial.entity';
import { TerminosService } from './terminos.service';
import { DiasHabilesService } from './dias-habiles.service';
import { DocumentosConsultaService } from './documentos-consulta.service';

import { OnModuleInit } from '@nestjs/common';

@Injectable()
export class ConsultasJuridicasService implements OnModuleInit {
    constructor(
        @InjectRepository(ConsultaJuridica)
        private readonly consultaRepository: Repository<ConsultaJuridica>,
        @InjectRepository(ConsultaJuridicaHistorial)
        private readonly historialRepository: Repository<ConsultaJuridicaHistorial>,
        private readonly terminosService: TerminosService,
        private readonly diasHabilesService: DiasHabilesService,
        private readonly documentosService: DocumentosConsultaService
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

    async findAll(): Promise<any[]> {
        const consultas = await this.consultaRepository.find({
            where: { estadoArchivo: 'ACTIVO' },
            relations: ['abogadoAsignado'],
            order: { fechaRecepcion: 'DESC' }
        });

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
        const consulta = await this.consultaRepository.findOne({
            where: { id },
            relations: ['abogadoAsignado']
        });
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
            estado: 'en_radicacion'
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
        await this.registrarEvento(
            savedConsulta.id,
            'CREACIÓN',
            'Consulta radicada en el sistema',
            `Radicado: ${numeroRadicado}`,
            data.nombreSolicitante || 'Sistema'
        );

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

    async updateRespuesta(id: string, respuesta: string, enviar: boolean, usuario: string = 'Sistema'): Promise<ConsultaJuridica> {
        const consulta = await this.findOne(id);
        const estadoAnterior = consulta.estado;

        consulta.respuesta = respuesta;

        if (enviar) {
            consulta.fechaRespuesta = new Date();
            consulta.estado = 'respondido';
            consulta.tipoRespuesta = consulta.tipoRespuesta || 'favorable'; // Default si no se especifica

            // Log events for send action
            await this.registrarEvento(
                id,
                'RESPUESTA',
                'Respuesta enviada (desde editor)',
                'Respuesta enviada directamente desde el editor de texto',
                'Sistema' // TODO: Pass user here if possible
            );

            if (estadoAnterior !== consulta.estado) {
                await this.registrarEvento(
                    id,
                    'CAMBIO_ETAPA',
                    `Cambio de etapa: ${estadoAnterior} -> ${consulta.estado}`,
                    'Cierre automático por envío de respuesta',
                    'Sistema'
                );
            }
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

    async getArchivadas(): Promise<ConsultaJuridica[]> {
        return this.consultaRepository.find({
            where: [
                { estadoArchivo: 'ARCHIVADO' },
                { estadoArchivo: 'ELIMINADO' }
            ],
            relations: ['abogadoAsignado'],
            order: { fechaArchivo: 'DESC' }
        });
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
            where: { id },
            relations: ['abogadoAsignado']
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
