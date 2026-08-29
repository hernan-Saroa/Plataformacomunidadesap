import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { TerminoProcesal } from '../entities/termino-procesal.entity';
import { Expediente } from '../entities/expediente.entity';
import { ConsultaJuridica } from '../entities/consulta-juridica.entity';
import { RequerimientoOC } from '../entities/requerimiento-oc.entity';
import type { LegalAccess } from '../auth/legal-access';
import { ProcesoCoactivo } from '../entities/proceso-coactivo.entity';
import { Actuacion } from '../entities/actuacion.entity';
import { LegalNotificationsService } from './legal-notifications.service';
import { SequenceService } from './sequence.service';

@Injectable()
export class TerminosService {
    private readonly logger = new Logger(TerminosService.name);

    constructor(
        @InjectRepository(TerminoProcesal)
        private terminoRepository: Repository<TerminoProcesal>,
        @InjectRepository(Expediente)
        private expedienteRepository: Repository<Expediente>,
        @InjectRepository(ConsultaJuridica)
        private consultaRepository: Repository<ConsultaJuridica>,
        @InjectRepository(RequerimientoOC)
        private requerimientoOCRepository: Repository<RequerimientoOC>,
        @InjectRepository(ProcesoCoactivo)
        private procesoCoactivoRepository: Repository<ProcesoCoactivo>,
        @InjectRepository(Actuacion)
        private actuacionRepository: Repository<Actuacion>,
        @InjectDataSource()
        private readonly dataSource: DataSource,
        private readonly legalNotifications: LegalNotificationsService,
        private readonly sequenceService: SequenceService,
    ) { }

    /** Resuelve nombres reales de usuario (auth.user/personas) a partir de ids, para no exponer UUIDs crudos como "responsable". */
    private async resolveNombresDesdeAuth(ids: (string | null | undefined)[]): Promise<Map<string, string>> {
        const filteredIds = [...new Set(ids.filter((id): id is string => !!id))];
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
        } catch (error) {
            this.logger.warn(`No se pudieron resolver nombres desde auth: ${(error as any)?.message || error}`);
            return new Map();
        }
    }

    /** Resuelve responsableNombre a partir de responsableId cuando el caller no lo mandó ya resuelto. */
    private async backfillResponsableNombre(data: { responsableId?: string | null; responsableNombre?: string | null }): Promise<void> {
        if (!data.responsableId || data.responsableNombre) return;
        const nombres = await this.resolveNombresDesdeAuth([data.responsableId]);
        data.responsableNombre = nombres.get(data.responsableId) || null;
    }

    /**
     * Autocorrección en lectura: cualquier término con responsableId pero sin responsableNombre
     * (registros guardados antes de este fix, o casos donde la resolución en create()/update()
     * falló por un error transitorio de BD) se resuelve aquí y se persiste en segundo plano, para
     * que quede corregido de forma permanente sin depender de que alguien vuelva a editar el
     * término. Sin esto, un término ya roto en BD seguiría mostrando "Sin asignar" para siempre.
     */
    private async autocompletarResponsables(terminos: TerminoProcesal[]): Promise<void> {
        const pendientes = terminos.filter((t) => t.responsableId && !t.responsableNombre);
        if (pendientes.length === 0) return;

        const nombres = await this.resolveNombresDesdeAuth(pendientes.map((t) => t.responsableId));
        const actualizaciones: Promise<any>[] = [];

        for (const termino of pendientes) {
            const nombre = nombres.get(termino.responsableId as string);
            if (nombre) {
                termino.responsableNombre = nombre;
                actualizaciones.push(this.terminoRepository.update(termino.id, { responsableNombre: nombre }));
            }
        }

        if (actualizaciones.length > 0) {
            Promise.all(actualizaciones).catch((err) =>
                this.logger.warn(`No se pudo persistir el autocompletado de responsables: ${err?.message}`),
            );
        }
    }

    /** Extrae la línea "Programación: ..." que ModalNuevoTermino agrega a observaciones al crear vencimientos recurrentes. */
    private extraerPeriodicidadTexto(observaciones?: string | null): string | undefined {
        const match = observaciones?.match(/Programación: ([^\n·]+(?:·[^\n]+)?)/);
        return match ? match[1].trim() : undefined;
    }

    /** Dispara (sin bloquear el flujo) la notificación de asignación cuando un término queda con responsable nuevo o reasignado. */
    private notificarAsignacionResponsable(termino: TerminoProcesal, esReasignacion: boolean): void {
        if (!termino.responsableId) return;
        this.legalNotifications.notifyResponsableAsignadoTermino({
            terminoId: termino.id,
            responsableId: termino.responsableId,
            nombreActuacion: termino.nombreActuacion,
            numeroRadicado: termino.numeroRadicado,
            fechaBase: termino.fechaBase,
            fechaVencimiento: termino.fechaVencimiento,
            periodicidadTexto: this.extraerPeriodicidadTexto(termino.observaciones),
            esReasignacion,
        }).catch((err) => this.logger.warn(`No se pudo notificar asignación de responsable del término ${termino.id}: ${err?.message}`));
    }

    async create(data: Partial<TerminoProcesal>): Promise<TerminoProcesal> {
        // Si no viene referenciaId pero sí numeroRadicado, intentamos resolverlo
        // consultando el módulo correspondiente. Esto es necesario porque la columna
        // referencia_id es NOT NULL en BD, y además permite linkear el término al
        // registro real para enriquecer dashboards/queries posteriores.
        if (!data.referenciaId && data.numeroRadicado && data.origenModulo) {
            try {
                const radicado = data.numeroRadicado;
                let resolved: { id: string } | null = null;

                switch (data.origenModulo) {
                    case 'DEFENSA':
                    case 'JUZGAMIENTO':
                        resolved = await this.expedienteRepository.findOne({
                            where: { radicado },
                            select: ['id'],
                        });
                        break;
                    case 'ASESORIA':
                        resolved = await this.consultaRepository.findOne({
                            where: { numeroRadicado: radicado },
                            select: ['id'],
                        });
                        break;
                    case 'ORGANOS_CONTROL':
                        resolved = await this.requerimientoOCRepository.findOne({
                            where: { radicadoInterno: radicado },
                            select: ['id'],
                        });
                        break;
                    case 'PROCESOS_COACTIVOS':
                        resolved = await this.procesoCoactivoRepository.findOne({
                            where: { radicado },
                            select: ['id'],
                        });
                        break;
                }

                if (resolved?.id) {
                    data.referenciaId = resolved.id;
                }
            } catch (err) {
                this.logger.warn(`No se pudo resolver referenciaId para ${data.numeroRadicado} (${data.origenModulo}): ${(err as any)?.message}`);
            }
        }

        // Fallback: si todavía no hay referenciaId y la BD lo requiere NOT NULL,
        // generamos un UUID v4 random para no romper la inserción. El término
        // queda creado pero sin link directo (queda solo el numeroRadicado como referencia textual).
        if (!data.referenciaId) {
            data.referenciaId = this.generateUuidV4();
        }

        // Los términos creados desde otros módulos (createAutomatico) ya traen su propio
        // radicado (expediente, consulta, etc.). Los términos manuales de este submódulo no
        // tienen radicado propio, así que se les asigna un consecutivo legible para poder
        // identificarlos en listados y calendario en vez de mostrar el UUID crudo.
        if (!data.numeroRadicado) {
            data.numeroRadicado = await this.sequenceService.generateRadicado('TERM');
        }

        await this.backfillResponsableNombre(data);

        const termino = this.terminoRepository.create(data);
        const guardado = await this.terminoRepository.save(termino);
        this.notificarAsignacionResponsable(guardado, false);
        return guardado;
    }

    private generateUuidV4(): string {
        // RFC4122 v4 — Postgres acepta este formato como uuid válido.
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    }



    async createAutomatico(
        origen: 'DEFENSA' | 'JUZGAMIENTO' | 'ASESORIA' | 'MANUAL' | 'ORGANOS_CONTROL' | 'PROCESOS_COACTIVOS',
        referenciaId: string,
        radicado: string,
        nombreActuacion: string,
        fechaBase: Date,
        diasTermino: number,
        responsableId?: string,
        responsableNombre?: string,
        tipoDias: 'HABILES' | 'CALENDARIO' | 'HORAS' = 'HABILES',
        fechaVencimientoExplicita?: Date,
        observaciones?: string
    ): Promise<TerminoProcesal> {
        let vencimiento: Date;

        if (fechaVencimientoExplicita) {
            vencimiento = new Date(fechaVencimientoExplicita);
        } else {
            const safeDias = diasTermino > 0 ? diasTermino : 5;
            vencimiento = new Date(fechaBase);
            if (tipoDias === 'CALENDARIO') {
                vencimiento.setDate(vencimiento.getDate() + safeDias);
            } else if (tipoDias === 'HORAS') {
                vencimiento.setHours(vencimiento.getHours() + safeDias);
            } else {
                let daysAdded = 0;
                while (daysAdded < safeDias) {
                    vencimiento.setDate(vencimiento.getDate() + 1);
                    const day = vencimiento.getDay();
                    if (day !== 0 && day !== 6) {
                        daysAdded++;
                    }
                }
            }
        }

        const alertaPreventiva = new Date(vencimiento);
        alertaPreventiva.setDate(vencimiento.getDate() - 5);

        const alertaCritica = new Date(vencimiento);
        alertaCritica.setDate(vencimiento.getDate() - 2);

        // Check if exists to update
        let termino = await this.terminoRepository.findOne({ where: { referenciaId, origenModulo: origen } });
        const responsableAnterior = termino?.responsableId ?? null;

        if (termino) {
            termino.numeroRadicado = radicado;
            termino.nombreActuacion = nombreActuacion;
            termino.fechaBase = fechaBase;
            termino.diasTermino = diasTermino;
            termino.tipoDias = tipoDias;
            termino.fechaVencimiento = vencimiento;
            termino.fechaAlertaPreventiva = alertaPreventiva;
            termino.fechaAlertaCritica = alertaCritica;
            termino.responsableId = responsableId || null;
            termino.responsableNombre = responsableNombre || null;
            
            // BUG FIX 11: Solo asignamos observaciones si viene algo nuevo de la sincronización 
            // y el término actual no tiene observaciones, para NO SOBRESCRIBIR adjuntos ni comentarios del usuario.
            if (observaciones && !termino.observaciones) {
                termino.observaciones = observaciones;
            }
        } else {
            termino = this.terminoRepository.create({
                origenModulo: origen,
                referenciaId,
                numeroRadicado: radicado,
                nombreActuacion,
                fechaBase,
                diasTermino: diasTermino || 0,
                tipoDias,
                fechaVencimiento: vencimiento,
                fechaAlertaPreventiva: alertaPreventiva,
                fechaAlertaCritica: alertaCritica,
                estado: 'PENDIENTE',
                prioridad: 'MEDIA',
                responsableId: responsableId || null,
                responsableNombre: responsableNombre || null,
                observaciones: observaciones || null
            });
        }

        const guardado = await this.terminoRepository.save(termino);

        if (guardado.responsableId && guardado.responsableId !== responsableAnterior) {
            this.notificarAsignacionResponsable(guardado, !!responsableAnterior);
        }

        return guardado;
    }

    async findAll(filtros: any): Promise<TerminoProcesal[]> {
        const query = this.terminoRepository.createQueryBuilder('termino');

        if (filtros.responsableId) {
            query.andWhere('termino.responsableId = :responsableId', { responsableId: filtros.responsableId });
        }

        if (filtros.responsableKeys?.length) {
            const responsableUuidKeys = filtros.responsableKeys.filter((key: string) =>
                /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key),
            );
            const normalizedKeys = filtros.responsableKeys.map((key: string) => key.toLowerCase());
            if (responsableUuidKeys.length) {
                query.andWhere(
                    '(termino.responsableId IN (:...responsableUuidKeys) OR LOWER(termino.responsableNombre) IN (:...normalizedKeys))',
                    { responsableUuidKeys, normalizedKeys },
                );
            } else {
                query.andWhere('LOWER(termino.responsableNombre) IN (:...normalizedKeys)', { normalizedKeys });
            }
        }

        if (filtros.estado) {
            query.andWhere('termino.estado = :estado', { estado: filtros.estado });
        }

        query.orderBy('termino.fechaVencimiento', 'ASC');

        const terminos = await query.getMany();
        await this.autocompletarResponsables(terminos);
        return terminos;
    }

    async getCalendario(start: string, end: string, filtros: { responsableId?: string; responsableKeys?: string[] } | string = {}): Promise<any[]> {
        const resolvedFiltros = typeof filtros === 'string' ? { responsableId: filtros } : filtros;
        const query = this.terminoRepository.createQueryBuilder('termino')
            .where('termino.fechaVencimiento BETWEEN :start AND :end', {
                start: new Date(start),
                end: new Date(end)
            });

        if (resolvedFiltros.responsableId) {
            query.andWhere('termino.responsableId = :responsableId', { responsableId: resolvedFiltros.responsableId });
        }

        if (resolvedFiltros.responsableKeys?.length) {
            const responsableUuidKeys = resolvedFiltros.responsableKeys.filter((key) =>
                /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key),
            );
            const normalizedKeys = resolvedFiltros.responsableKeys.map((key) => key.toLowerCase());
            if (responsableUuidKeys.length) {
                query.andWhere(
                    '(termino.responsableId IN (:...responsableUuidKeys) OR LOWER(termino.responsableNombre) IN (:...normalizedKeys))',
                    { responsableUuidKeys, normalizedKeys },
                );
            } else {
                query.andWhere('LOWER(termino.responsableNombre) IN (:...normalizedKeys)', { normalizedKeys });
            }
        }

        const terminos = await query.getMany();

        return terminos.map(t => ({
            id: t.id,
            title: `${t.numeroRadicado || ''} - ${t.nombreActuacion}`,
            start: t.fechaVencimiento,
            color: this.getSemaforoColor(t),
            extendedProps: {
                estado: t.estado,
                prioridad: t.prioridad,
                origen: t.origenModulo
            }
        }));
    }

    async getSemaforoList(filtros: { responsableId?: string; responsableKeys?: string[] } | string = {}): Promise<any[]> {
        const resolvedFiltros = typeof filtros === 'string' ? { responsableId: filtros } : filtros;
        // Auto-sincronizar al consultar el listado para tener datos actualizados
        // try {
        //     await this.sincronizar();
        // } catch (err) {
        //     this.logger.warn('Error en sincronización automática:', err);
        //     // Continuar aunque falle la sincronización
        // }

        const terminos = await this.findAll(resolvedFiltros);

        return terminos.map(t => {
            const now = new Date();
            const vencimiento = new Date(t.fechaVencimiento);
            const diffTime = vencimiento.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            return {
                ...t,
                calculo: {
                    diasRestantes: diffDays,
                    semaforo: this.getSemaforoColor(t, diffDays)
                }
            };
        });
    }

    async findOne(id: string): Promise<TerminoProcesal> {
        const termino = await this.terminoRepository.findOne({ where: { id } });
        if (!termino) throw new NotFoundException('Término no encontrado');
        await this.autocompletarResponsables([termino]);
        return termino;
    }

    async update(id: string, data: any): Promise<TerminoProcesal> {
        const termino = await this.findOne(id);
        
        // Si viene un comentario nuevo, lo concatenamos de forma segura
        if (data.nuevoComentario) {
            const prefix = termino.observaciones ? '\n\n---\n' : '';
            termino.observaciones = (termino.observaciones || '') + prefix + data.nuevoComentario;
            delete data.nuevoComentario;
        }

        // Ya no dejamos que sobrescriban observaciones por completo si viene el comentario
        if (data.observaciones && data.nuevoComentario) {
            delete data.observaciones;
        }

        const responsableCambio = 'responsableId' in data && data.responsableId !== termino.responsableId;
        const habiaResponsablePrevio = !!termino.responsableId;

        if (responsableCambio) {
            if (data.responsableId && !data.responsableNombre) {
                await this.backfillResponsableNombre(data);
            } else if (!data.responsableId) {
                data.responsableNombre = null;
            }
        }

        Object.assign(termino, data);
        const guardado = await this.terminoRepository.save(termino);

        if (responsableCambio && guardado.responsableId) {
            this.notificarAsignacionResponsable(guardado, habiaResponsablePrevio);
        }

        return guardado;
    }

    async remove(id: string): Promise<void> {
        const termino = await this.findOne(id);
        // Soft delete para evitar que la función sincronizar() lo vuelva a crear
        termino.estado = 'ELIMINADO';
        await this.terminoRepository.save(termino);
    }

    // NEW: Generate PDF Report
    async generarPDF(id: string): Promise<Buffer> {
        const termino = await this.findOne(id);
        const PDFDocument = require('pdfkit');
        
        return new Promise<Buffer>((resolve, reject) => {
            const doc = new PDFDocument({ margin: 50 });
            const buffers: Buffer[] = [];
            
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);

            // Header
            doc.fontSize(16).font('Helvetica-Bold').text('ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA - ESAP', { align: 'center' });
            doc.fontSize(14).text('TÉRMINO / INFORME', { align: 'center' });
            doc.moveDown(2);

            // General Info
            doc.fontSize(12).font('Helvetica-Bold').text('INFORMACIÓN GENERAL').moveDown(0.5);
            doc.font('Helvetica').fontSize(10);
            doc.text(`ID Término: ${termino.id}`);
            doc.text(`Radicado: ${termino.numeroRadicado || 'N/A'}`);
            doc.text(`Módulo Origen: ${termino.origenModulo}`);
            doc.text(`Estado: ${termino.estado}`);
            doc.moveDown();

            // Responsable
            doc.font('Helvetica-Bold').text('RESPONSABLE ESAP').moveDown(0.5);
            doc.font('Helvetica').text(termino.responsableNombre || termino.responsableId || 'Sin asignar');
            doc.moveDown();

            // Dates & Deadlines
            doc.font('Helvetica-Bold').text('PLAZOS Y VENCIMIENTOS').moveDown(0.5);
            doc.font('Helvetica');
            doc.text(`Fecha Base: ${termino.fechaBase ? new Date(termino.fechaBase).toLocaleDateString() : 'N/A'}`);
            doc.text(`Fecha Vencimiento: ${termino.fechaVencimiento ? new Date(termino.fechaVencimiento).toLocaleDateString() : 'N/A'}`);
            doc.text(`Días Término: ${termino.diasTermino} ${termino.tipoDias}`);
            doc.moveDown();

            // Asunto
            doc.font('Helvetica-Bold').text('ASUNTO').moveDown(0.5);
            doc.font('Helvetica').text(termino.nombreActuacion || 'N/A');
            doc.moveDown();

            // Observaciones
            if (termino.observaciones) {
                doc.font('Helvetica-Bold').text('NOTAS Y COMENTARIOS').moveDown(0.5);
                doc.font('Helvetica').text(termino.observaciones);
                doc.moveDown();
            }

            // Footer
            doc.moveDown(2);
            doc.fontSize(8).text(`Documento generado el: ${new Date().toLocaleDateString('es-CO')} a las ${new Date().toLocaleTimeString('es-CO')}`, { align: 'center' });
            doc.text('Sistema SIGL - Gestión Legal ESAP', { align: 'center' });

            doc.end();
        });
    }

    // NEW: Get associated documents
    async getDocumentos(id: string): Promise<any[]> {
        const termino = await this.findOne(id);
        const docs: any[] = [];

        if ((termino.origenModulo === 'DEFENSA' || termino.origenModulo === 'JUZGAMIENTO') && termino.referenciaId) {
            const expediente = await this.expedienteRepository.findOne({
                where: { id: termino.referenciaId },
                relations: ['documentos'] // Removed 'actuaciones'
            });

            if (expediente) {
                // 1. Documentos via Relation
                if (expediente.documentos) {
                    expediente.documentos.forEach(d => docs.push({
                        nombre: d.nombre,
                        tipo: d.tipo,
                        url: d.archivoUrl,
                        fecha: d.fechaDocumento || d.createdAt
                    }));
                }

                // 2. Documentos from Actuaciones (Fetch Manually Hybrid)
                const actuaciones = await this.actuacionRepository.find({
                    where: [
                        { expedienteId: expediente.id },
                        { expedienteId: expediente.radicado }
                    ]
                });
                if (actuaciones) {
                    actuaciones.forEach(a => {
                        if (a.documentoUrl) {
                            docs.push({
                                nombre: a.documentoNombre || `Actuación ${a.tipoActuacion}`,
                                tipo: 'ACTUACION',
                                url: a.documentoUrl,
                                fecha: a.fechaActuacion
                            });
                        }
                    });
                }

                // 3. Documentos Iniciales (Legacy Strings)
                if (expediente.documentosInicialesUrls) {
                    expediente.documentosInicialesUrls.forEach((url, i) => {
                        docs.push({
                            nombre: `Documento Inicial ${i + 1}`,
                            tipo: 'INICIAL',
                            url: url,
                            fecha: expediente.fechaRadicacion
                        });
                    });
                }
            }
        }

        if (termino.origenModulo === 'ASESORIA' && termino.referenciaId) {
            const consulta = await this.consultaRepository.findOne({
                where: { id: termino.referenciaId }
            });
            if (consulta && consulta.documentoRespuestaUrl) {
                docs.push({
                    nombre: 'Respuesta Consulta',
                    tipo: 'RESPUESTA',
                    url: consulta.documentoRespuestaUrl,
                    fecha: consulta.fechaRespuesta
                });
            }
        }

        if (termino.origenModulo === 'ORGANOS_CONTROL' && termino.referenciaId) {
            const req = await this.requerimientoOCRepository.findOne({ where: { id: termino.referenciaId } });
            if (req) {
                if (req.archivoAdjuntoUrl) {
                    docs.push({
                        nombre: 'Requerimiento Inicial',
                        tipo: 'REQUERIMIENTO',
                        url: req.archivoAdjuntoUrl,
                        fecha: req.fechaRecepcion
                    });
                }
                if (req.oficioRespuestaUrl) {
                    docs.push({
                        nombre: 'Oficio Respuesta',
                        tipo: 'RESPUESTA',
                        url: req.oficioRespuestaUrl,
                        fecha: req.fechaRespuesta
                    });
                }
                if (req.acuseReciboUrl) {
                    docs.push({
                        nombre: 'Acuse de Recibo',
                        tipo: 'ACUSE',
                        url: req.acuseReciboUrl,
                        fecha: req.fechaRespuesta
                    });
                }
            }
        }

        // 5. Parse Documentos Lógicos from Observaciones
        if (termino.observaciones) {
            const matches = termino.observaciones.match(/\[ARCHIVO_ADJUNTO\](.*)/g);
            if (matches) {
                matches.forEach(m => {
                    const parts = m.replace('[ARCHIVO_ADJUNTO] ', '').split('|');
                    if (parts.length >= 4) {
                        docs.push({
                            nombre: parts[0],
                            tipo: 'ADJUNTO_TERMINO',
                            url: `files/${parts[1]}`,
                            fecha: new Date(parts[3])
                        });
                    }
                });
            }
        }

        return docs;
    }

    // Notes stored inline in observaciones using [NOTA] markers
    async getNotas(id: string, access?: LegalAccess): Promise<any[]> {
        const termino = await this.findOne(id);
        if (!termino.observaciones) return [];
        const matches = termino.observaciones.match(/\[NOTA\] [^\n]*/g) || [];
        const notas = matches.map(m => {
            const parts = m.replace('[NOTA] ', '').split('|');
            return {
                texto: parts[0] || '',
                usuario: parts[1] || 'Sistema',
                fecha: parts[2] ? new Date(parts[2]) : new Date(),
                usuarioId: parts[3] || null,
            };
        }).reverse(); // most recent first

        if (access?.esResuelveSolo) {
            return notas.filter(nota => nota.usuarioId && nota.usuarioId === access.userId);
        }

        return notas;
    }

    async addNota(id: string, texto: string, usuario: string = 'Sistema', usuarioId?: string): Promise<any> {
        const termino = await this.findOne(id);
        const safeTexto = texto.replace(/\r?\n/g, ' ').replace(/\|/g, '/');
        const safeUsuario = usuario.replace(/\r?\n/g, ' ').replace(/\|/g, '/');
        const fecha = new Date();
        const marker = `\n[NOTA] ${safeTexto}|${safeUsuario}|${fecha.toISOString()}|${usuarioId || ''}`;
        termino.observaciones = (termino.observaciones || '') + marker;
        await this.terminoRepository.save(termino);
        return { texto: safeTexto, usuario: safeUsuario, fecha, usuarioId: usuarioId || null };
    }

    // NEW: Add Document logic without altering schema
    async addDocumentoLogico(id: string, file: Express.Multer.File): Promise<any> {
        const termino = await this.findOne(id);
        const metadata = `\n[ARCHIVO_ADJUNTO] ${file.originalname}|${file.filename}|${(file.size/1024).toFixed(2)} KB|${new Date().toISOString()}`;
        termino.observaciones = (termino.observaciones || '') + metadata;
        await this.terminoRepository.save(termino);
        return {
            nombre: file.originalname,
            tipo: 'ADJUNTO_TERMINO',
            url: `files/${file.filename}`,
            fecha: new Date(),
            tamaño: `${(file.size/1024).toFixed(2)} KB`
        };
    }

    async getReporteEficiencia(): Promise<any> {
        const total = await this.terminoRepository.count();
        const vencidos = await this.terminoRepository.count({ where: { estado: 'VENCIDO' } });
        const cumplidos = await this.terminoRepository.count({ where: { estado: 'CUMPLIDO' } });

        return {
            total,
            vencidos,
            cumplidos,
            eficiencia: total > 0 ? (cumplidos / total) * 100 : 0
        };
    }

    async getReporteCarga(): Promise<any> {
        return this.terminoRepository.createQueryBuilder('termino')
            .select('termino.responsableId', 'responsableId')
            .addSelect('COUNT(termino.id)', 'total')
            .groupBy('termino.responsableId')
            .getRawMany();
    }

    private getSemaforoColor(termino: TerminoProcesal, diasRestantes?: number): string {
        if (termino.estado === 'CUMPLIDO') return 'green';
        if (termino.estado === 'VENCIDO') return 'red';

        if (diasRestantes === undefined) {
            const now = new Date();
            const vencimiento = new Date(termino.fechaVencimiento);
            const diffTime = vencimiento.getTime() - now.getTime();
            diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }

        if (diasRestantes <= 1) return 'red';
        if (diasRestantes <= 5) return 'yellow';
        return 'green';
    }

    async sincronizar(): Promise<{ total: number; nuevos: number; detalles?: any }> {
        let nuevos = 0;
        this.logger.log('Iniciando sincronización de términos...');

        // 1. Defensa y Juzgamiento (Expedientes)
        const expedientes = await this.expedienteRepository.find();
        const nombresAbogados = await this.resolveNombresDesdeAuth(expedientes.map(e => e.abogadoSustanciador));

        for (const exp of expedientes) {
            const abogadoNombre = (exp.abogadoSustanciador && nombresAbogados.get(exp.abogadoSustanciador))
                || exp.abogadoSustanciador
                || 'Sin asignar';
            // Fallback chain for "Hechos"
            const hechos = exp.hechos || exp.pretensionDemandante || exp.asunto || 'Sin descripción detallada';

            // A: Término de Vencimiento (General / Defensa)
            const hasVencimiento = !!exp.fechaVencimientoTermino;
            const hasDias = (exp.terminoProcesalDias && exp.terminoProcesalDias > 0);

            if ((hasVencimiento || hasDias) && exp.estado !== 'FALLO' && exp.estado !== 'ARCHIVADO') {
                this.logger.debug(`[DEFENSA] Sincronizando ${exp.radicado}: Profesional=${abogadoNombre}`);

                // Calculate vencimiento if missing
                let fechaVenc: Date | undefined = exp.fechaVencimientoTermino;
                if (!fechaVenc && hasDias) {
                    // Calculate based on radication + days (simplified, ideally use business days logic from createAutomatico but here we pass raw params)
                    // Actually createAutomatico handles calculation if we pass explicit undefined? 
                    // No, createAutomatico takes `fechaVencimientoExplicita`. If we pass undefined, it uses `diasTermino`.
                    fechaVenc = undefined;
                }

                await this.createAutomatico(
                    'DEFENSA',
                    exp.id,
                    exp.radicado || exp.id,
                    exp.asunto || 'Vencimiento de Término',
                    exp.fechaRadicacion || new Date(),
                    exp.terminoProcesalDias || 5, // Default to 5 if 0/undefined but handled above
                    undefined,
                    abogadoNombre,
                    'HABILES',
                    fechaVenc, // Pass undefined if dynamic
                    `[Defensa] ${hechos}`
                );
                nuevos++;
            } else if (exp.radicado === '110013335002202500125') {
                this.logger.warn(`[DEFENSA] SKIPPING ${exp.radicado}: hasVencimiento=${hasVencimiento}, hasDias=${hasDias}, Estado=${exp.estado}`);
            }

            // B: Juzgamiento Disciplinario - Sincroniza todo expediente disciplinario
            // Ya no requiere fechaLimiteEtapa - calcula automáticamente si no existe
            const esDisciplinario = exp.jurisdiccion === 'Disciplinaria' || exp.etapa;
            const noEsDefensa = !hasVencimiento && !hasDias; // No fue procesado como Defensa
            const estadoActivo = exp.estado !== 'FALLO' && exp.estado !== 'ARCHIVADO' && exp.estado !== 'CERRADO';

            if (esDisciplinario && estadoActivo) {
                const descripcionEtapa = exp.etapa ? `Etapa: ${exp.etapa}` : 'Proceso Disciplinario';

                // Calcular fecha de vencimiento si no existe
                let fechaVenc: Date | undefined = exp.fechaLimiteEtapa;
                let diasDefault = 30; // Por defecto 30 días hábiles para procesos disciplinarios

                if (!fechaVenc) {
                    // Si tiene terminoProcesalDias, usarlo; si no, usar default de 30 días
                    diasDefault = exp.terminoProcesalDias && exp.terminoProcesalDias > 0
                        ? exp.terminoProcesalDias
                        : 30;
                    // fechaVenc undefined = createAutomatico calculará basado en fechaBase + dias
                }

                this.logger.debug(`[JUZGAMIENTO] Sincronizando ${exp.radicado}: Etapa=${exp.etapa}, Profesional=${abogadoNombre}, Dias=${diasDefault}`);

                await this.createAutomatico(
                    'JUZGAMIENTO',
                    exp.id,
                    exp.radicado || exp.id,
                    descripcionEtapa,
                    exp.fechaRadicacion || new Date(),
                    diasDefault,
                    undefined,
                    abogadoNombre,
                    'HABILES',
                    fechaVenc,
                    `[Juzgamiento] ${exp.etapa || 'Disciplinario'}. ${hechos}`
                );
                nuevos++;
            }
        }

        // 2. Asesoria Jurídica
        const consultas = await this.consultaRepository.find();
        const nombresAsesoria = await this.resolveNombresDesdeAuth(consultas.map(c => c.abogadoAsignadoId));
        for (const cons of consultas) {
            const responsableUUID = cons.abogadoAsignadoId || undefined;
            const responsableNombre = cons.abogadoAsignadoNombre
                || (cons.abogadoAsignadoId && nombresAsesoria.get(cons.abogadoAsignadoId))
                || cons.abogadoAsignadoId
                || 'Sin asignar';
            const descripcion = cons.descripcion || cons.materiaJuridica || 'Consulta Jurídica sin descripción';

            const hasFecha = !!cons.fechaMaximaRespuesta;
            const hasDias = (cons.terminoLegalDias && cons.terminoLegalDias > 0);

            if ((hasFecha || hasDias) && cons.estado !== 'respondido' && cons.estado !== 'cerrado') {

                let fechaLimite: Date | undefined = cons.fechaMaximaRespuesta;

                // Fallback calculation
                if (!fechaLimite && hasDias) {
                    // Logic: fechaRecepcion + days
                    // For now passing undefined to createAutomatico which should use daysTermino relative to base date
                    fechaLimite = undefined;
                }

                this.logger.debug(`[ASESORIA] Sincronizando ${cons.numeroRadicado}: Profesional=${responsableNombre}, Dias=${cons.terminoLegalDias}`);

                await this.createAutomatico(
                    'ASESORIA',
                    cons.id,
                    cons.numeroRadicado || cons.id,
                    cons.tipoSolicitud || 'Solicitud Asesoría',
                    cons.fechaRecepcion || new Date(),
                    cons.terminoLegalDias || 15,
                    responsableUUID,
                    responsableNombre,
                    'HABILES',
                    fechaLimite,
                    `[Asesoría] ${descripcion}`
                );
                nuevos++;
            } else {
                this.logger.warn(`[ASESORIA] SKIPPING ${cons.numeroRadicado}: Estado=${cons.estado}, HasFecha=${hasFecha}`);
            }
        }

        // 3. Órganos de Control
        const requerimientosOC = await this.requerimientoOCRepository.find();

        this.logger.log(`[ORGANOS_CONTROL] Encontrados ${requerimientosOC.length} requerimientos para procesar.`);

        const nombresOC = await this.resolveNombresDesdeAuth(requerimientosOC.map(r => r.abogadoAsignadoId));

        for (const req of requerimientosOC) {
            const responsableUUID = req.abogadoAsignadoId || undefined;
            const responsableNombre = req.funcionarioResponsable
                || (req.abogadoAsignadoId && nombresOC.get(req.abogadoAsignadoId))
                || req.abogadoAsignadoId
                || 'Sin asignar';
            const descripcion = req.descripcion || 'Requerimiento Ente de Control';

            // Additional logging to debug specific Skipping reasons
            const hasVencimiento = !!req.fechaVencimiento;
            const validEstado = req.estado !== 'CERRADO' && req.estado !== 'ENVIADO';

            this.logger.debug(`[ORGANOS_CONTROL] Procesando ${req.radicadoInterno}: Vencimiento=${req.fechaVencimiento}, Estado=${req.estado}, Valido=${validEstado}`);

            if (req.fechaVencimiento && validEstado) {
                this.logger.debug(`[ORGANOS_CONTROL] Sincronizando ${req.radicadoInterno}...`);
                await this.createAutomatico(
                    'ORGANOS_CONTROL',
                    req.id,
                    req.radicadoInterno || req.radicadoExterno || 'REQ-OC',
                    req.tipoRequerimiento || 'Requerimiento',
                    req.fechaRecepcion || new Date(),
                    req.plazoOtorgado || 0,
                    responsableUUID,
                    responsableNombre,
                    req.unidadTiempo === 'DIAS_CALENDARIO' ? 'CALENDARIO' : req.unidadTiempo === 'HORAS' ? 'HORAS' : 'HABILES', // Map unit time
                    req.fechaVencimiento,
                    `[OC] ${req.asunto}. ${descripcion}`
                );
                nuevos++;
            } else {
                this.logger.warn(`[ORGANOS_CONTROL] SKIPPING ${req.radicadoInterno}: HasVencimiento=${hasVencimiento}, Estado=${req.estado}`);
            }
        }

        // 4. Procesos Coactivos
        const procesosCoactivos = await this.procesoCoactivoRepository.find();

        this.logger.log(`[PROCESOS_COACTIVOS] Encontrados ${procesosCoactivos.length} procesos para procesar.`);

        for (const proc of procesosCoactivos) {
            const responsableNombre = proc.responsable || 'Sin asignar';

            // El proceso coactivo tiene fecha de vencimiento en la obligación
            const fechaVencimiento = proc.obligacion?.fechaVencimiento
                ? new Date(proc.obligacion.fechaVencimiento)
                : null;

            const estadoActivo = proc.estado !== 'LIQUIDACION';

            if (fechaVencimiento && estadoActivo) {
                this.logger.debug(`[PROCESOS_COACTIVOS] Sincronizando ${proc.radicado}...`);

                await this.createAutomatico(
                    'PROCESOS_COACTIVOS',
                    proc.id,
                    proc.radicado || `COA-${proc.id.substring(0, 8)}`,
                    `Cobro Coactivo - ${proc.obligacion?.concepto || 'Obligación'}`,
                    proc.fechaCreacion || new Date(),
                    30, // Default 30 días para coactivos
                    undefined,
                    responsableNombre,
                    'CALENDARIO',
                    fechaVencimiento,
                    `[Coactivo] Deudor: ${proc.deudor?.nombre || 'N/A'}. Valor: $${proc.obligacion?.valor?.toLocaleString() || 0}`
                );
                nuevos++;
            } else {
                this.logger.warn(`[PROCESOS_COACTIVOS] SKIPPING ${proc.radicado}: Vencimiento=${fechaVencimiento}, Estado=${proc.estado}`);
            }
        }

        this.logger.log(`Sincronización finalizada. Procesados: ${nuevos}`);

        return {
            total: expedientes.length + consultas.length + requerimientosOC.length + procesosCoactivos.length,
            nuevos,
            detalles: {
                expedientes: expedientes.length,
                consultas: consultas.length,
                requerimientosOC: requerimientosOC.length,
                procesosCoactivos: procesosCoactivos.length
            }
        };
    }
}
