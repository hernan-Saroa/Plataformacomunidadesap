import { Injectable, ConflictException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository, Like } from 'typeorm';
import { randomBytes } from 'node:crypto';
import { extname, join } from 'node:path';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { Expediente } from '../entities/expediente.entity';
import { Actuacion } from '../entities/actuacion.entity';
import { Documento } from '../entities/documento.entity';
import { Evidencia } from '../entities/evidencia.entity';
import { DecisionDisciplinaria } from '../entities/decision-disciplinaria.entity';
import { ExcepcionProcesal, TipoExcepcion, EstadoExcepcion } from '../entities/excepcion-procesal.entity';
import { TareaExpediente } from '../entities/tarea-expediente.entity';
import { NotaExpediente } from '../entities/nota-expediente.entity';
import { Audiencia } from '../entities/audiencia.entity';
import { Acta } from '../entities/acta.entity';
import { ConfigurationsService } from './configurations.service';
import { LegalNotificationsService } from './legal-notifications.service';

@Injectable()
export class ExpedienteService {
    constructor(
        @InjectRepository(Expediente)
        private expedienteRepository: Repository<Expediente>,
        @InjectRepository(Actuacion)
        private actuacionRepository: Repository<Actuacion>,
        @InjectRepository(Documento)
        private documentoRepository: Repository<Documento>,
        @InjectRepository(DecisionDisciplinaria)
        private decisionRepository: Repository<DecisionDisciplinaria>,
        @InjectRepository(ExcepcionProcesal)
        private excepcionRepository: Repository<ExcepcionProcesal>,
        @InjectDataSource()
        private readonly dataSource: DataSource,
        private readonly configService: ConfigurationsService,
        private readonly legalNotifications: LegalNotificationsService
    ) { }

    async findOneByRadicado(radicado: string): Promise<Expediente | null> {
        const expediente = await this.expedienteRepository.findOne({
            where: { radicado },
            relations: ['evidencias', 'actors']
            // Note: actuaciones loaded manually due to loose coupling
        });

        if (expediente) {
            // Manual fetch for loose relation: Check both ID (UUID) and Radicado (String)
            expediente.actuaciones = await this.actuacionRepository.find({
                where: [
                    { expedienteId: expediente.id },
                    { expedienteId: expediente.radicado }
                ],
                order: { fechaActuacion: 'DESC' }
            });
        }
        return expediente;
    }

    async agregarActuacion(expedienteId: string, data: Partial<Actuacion>): Promise<Actuacion> {
        const expediente = await this.findOne(expedienteId);
        if (!expediente) throw new NotFoundException('Expediente no encontrado');

        const nuevaActuacion = this.actuacionRepository.create({
            ...data,
            expedienteId: expediente.id,
            fechaActuacion: new Date()
        });

        const saved = await this.actuacionRepository.save(nuevaActuacion);

        await this.expedienteRepository.update(expedienteId, {
            // UpdatedAt handled by TypeORM
        });

        return saved;
    }

    async createDecision(expedienteId: string, data: Partial<DecisionDisciplinaria>): Promise<DecisionDisciplinaria> {
        const expediente = await this.findOne(expedienteId);
        if (!expediente) throw new NotFoundException('Expediente no encontrado');

        const nuevaDecision = this.decisionRepository.create({
            ...data,
            expedienteId: expediente.id,
            fecha: new Date().toISOString()
        });

        return this.decisionRepository.save(nuevaDecision);
    }

    async getDecisions(expedienteId: string): Promise<DecisionDisciplinaria[]> {
        return this.decisionRepository.find({
            where: { expedienteId },
            order: { fecha: 'DESC' }
        });
    }

    async crearExpediente(data: Partial<Expediente>, creadoPor: string = 'Sistema'): Promise<Expediente> {
        if (data.radicado) {
            const existing = await this.expedienteRepository.findOne({ where: { radicado: data.radicado } });
            if (existing) {
                throw new ConflictException(`El radicado ${data.radicado} ya existe.`);
            }
        }

        if (!data.estado) data.estado = 'ACTIVO';
        if (!data.etapaProcesal) data.etapaProcesal = 'RADICACION';

        if (data.fechaNotificacion && data.terminoProcesalDias) {
            const fechaNotif = new Date(data.fechaNotificacion);
            const tipoConteo = data.tipoConteoTermino || 'HABILES';

            if (tipoConteo === 'CALENDARIO') {
                const vencimiento = new Date(fechaNotif);
                vencimiento.setDate(vencimiento.getDate() + Number(data.terminoProcesalDias));
                data.fechaVencimientoTermino = vencimiento;
            } else if (tipoConteo === 'HORAS') {
                const vencimiento = new Date(fechaNotif);
                vencimiento.setHours(vencimiento.getHours() + Number(data.terminoProcesalDias));
                data.fechaVencimientoTermino = vencimiento;
            } else {
                data.fechaVencimientoTermino = this.addBusinessDays(fechaNotif, Number(data.terminoProcesalDias));
            }
        }

        if (!data.fechaPrescripcion && (data.jurisdiccion === 'DISCIPLINARIO' || data.jurisdiccion === 'Disciplinaria' || data.tipoProceso === 'DISCIPLINARIO')) {
            try {
                const config = await this.configService.findByKey('prescripcion_juzgamiento');
                const years = config?.value?.years ?? 5;
                const baseDate = data.fechaRadicacion ? new Date(data.fechaRadicacion) : new Date();
                const fechaPrescripcion = new Date(baseDate);
                fechaPrescripcion.setFullYear(fechaPrescripcion.getFullYear() + years);
                data.fechaPrescripcion = fechaPrescripcion;
                Logger.log(`[ExpedienteService] Asignada fecha_prescripcion automática (${years} años): ${fechaPrescripcion.toISOString()}`);
            } catch (error) {
                Logger.warn('[ExpedienteService] No se pudo calcular fecha_prescripcion automáticamente', error);
            }
        }

        const nuevoExpediente = this.expedienteRepository.create(data);
        const saved = await this.expedienteRepository.save(nuevoExpediente);

        // Persistir como Documentos del expediente los archivos cargados en campos adicionales
        // (llegan como base64 dentro de camposAdicionales). Así aparecen en la pestaña de Documentos.
        // Reemplaza el base64 pesado por metadata liviana en camposAdicionales.
        try {
            await this.persistirDocumentosCamposAdicionales(saved, creadoPor);
        } catch (err: any) {
            Logger.warn(`[ExpedienteService] Falló persistencia de documentos de campos adicionales: ${err?.message || err}`);
        }

        const esDisciplinario =
            saved.jurisdiccion === 'DISCIPLINARIO' ||
            saved.jurisdiccion === 'Disciplinaria' ||
            saved.tipoProceso === 'DISCIPLINARIO' ||
            saved.tipoProceso === 'Disciplinario';
        const modulo = esDisciplinario ? 'JUZGAMIENTO_DISCIPLINARIO' : 'DEFENSA_JUDICIAL';

        // Notificaciones en segundo plano: NO deben bloquear la respuesta del POST.
        // Antes esto se hacía con await y, si el notifications-service estaba caído/lento,
        // cada llamada esperaba hasta el timeout de axios (~3s), retrasando varios segundos
        // la creación visible para el usuario. Ahora se disparan sin bloquear (fire-and-forget).
        void (async () => {
            try {
                await this.legalNotifications.notifyProcesoCreado({
                    modulo,
                    radicado: saved.radicado,
                    procesoId: saved.id,
                    creadoPor,
                });

                if (saved.abogadoSustanciador) {
                    await this.legalNotifications.notifyProfesionalAsignado({
                        modulo,
                        radicado: saved.radicado,
                        procesoId: saved.id,
                        abogadoId: saved.abogadoSustanciador,
                        asignadoPor: creadoPor,
                        esReasignacion: false,
                    });
                }
            } catch (err: any) {
                Logger.warn(`[ExpedienteService] Notificación de creación falló (no bloqueante): ${err?.message || err}`);
            }
        })();

        return saved;
    }

    /**
     * Extrae los archivos cargados (base64) en `camposAdicionales` y los persiste como
     * Documentos del expediente, para que aparezcan en la pestaña de Documentos.
     * Luego reemplaza el base64 pesado por metadata liviana dentro de camposAdicionales.
     */
    private async persistirDocumentosCamposAdicionales(expediente: Expediente, creadoPor: string): Promise<void> {
        const campos = expediente.camposAdicionales as Record<string, any> | undefined | null;
        if (!campos || typeof campos !== 'object') return;

        const uploadsDir = join(process.cwd(), 'uploads');
        if (!existsSync(uploadsDir)) {
            mkdirSync(uploadsDir, { recursive: true });
        }

        let huboCambios = false;
        const camposLimpios: Record<string, any> = {};

        for (const [key, val] of Object.entries(campos)) {
            const esArray = Array.isArray(val);
            const docs: any[] = esArray
                ? val
                : (val && typeof val === 'object' && val.base64 ? [val] : []);

            if (docs.length === 0) {
                camposLimpios[key] = val;
                continue;
            }

            const docsResultantes: any[] = [];
            for (const doc of docs) {
                if (doc && typeof doc === 'object' && doc.base64 && doc.nombre && doc.esNuevo) {
                    try {
                        const base64Str = String(doc.base64);
                        const comma = base64Str.indexOf(',');
                        const soloBase64 = comma >= 0 ? base64Str.slice(comma + 1) : base64Str;
                        const buffer = Buffer.from(soloBase64, 'base64');
                        const filename = `${randomBytes(16).toString('hex')}${extname(doc.nombre) || ''}`;
                        writeFileSync(join(uploadsDir, filename), buffer);

                        const documento = this.documentoRepository.create({
                            expedienteId: expediente.id,
                            nombre: doc.nombre,
                            tipo: 'DATO_ADICIONAL',
                            categoria: 'documentos',
                            subidoPor: creadoPor || 'Sistema (Campo Dinámico)',
                            archivoUrl: `files/${filename}`,
                            archivoNombreOriginal: doc.nombre,
                            archivoMimeType: doc.tipoMime || undefined,
                            archivoTamano: doc.tamano ?? buffer.length,
                        });
                        await this.documentoRepository.save(documento);

                        // Metadata liviana para no dejar el base64 dentro de camposAdicionales (JSON pesado).
                        docsResultantes.push({
                            nombre: doc.nombre,
                            tipoMime: doc.tipoMime,
                            tamano: doc.tamano ?? buffer.length,
                            cargado: true,
                        });
                        huboCambios = true;
                    } catch (err: any) {
                        Logger.warn(`[ExpedienteService] No se pudo persistir documento "${doc.nombre}" del campo "${key}": ${err?.message || err}`);
                        docsResultantes.push(doc); // conservar tal cual si falla
                    }
                } else {
                    docsResultantes.push(doc);
                }
            }

            camposLimpios[key] = esArray ? docsResultantes : (docsResultantes[0] ?? val);
        }

        if (huboCambios) {
            expediente.camposAdicionales = camposLimpios;
            await this.expedienteRepository.save(expediente);
        }
    }

    private addBusinessDays(startDate: Date, days: number): Date {
        let currentDate = new Date(startDate);
        let addedDays = 0;
        while (addedDays < days) {
            currentDate.setDate(currentDate.getDate() + 1);
            const day = currentDate.getDay();
            if (day !== 0 && day !== 6) {
                addedDays++;
            }
        }
        return currentDate;
    }

    private shiftBusinessDays(date: Date, delta: number): Date {
        const result = new Date(date);
        if (delta === 0) return result;
        const step = delta > 0 ? 1 : -1;
        let remaining = Math.abs(delta);
        while (remaining > 0) {
            result.setDate(result.getDate() + step);
            const day = result.getDay();
            if (day !== 0 && day !== 6) remaining--;
        }
        return result;
    }

    async renombrarTipoProceso(nombreAnterior: string, nombreNuevo: string): Promise<{ updated: number }> {
        const result = await this.expedienteRepository
            .createQueryBuilder()
            .update()
            .set({ tipoProceso: nombreNuevo })
            .where('tipo_proceso = :nombreAnterior', { nombreAnterior })
            .execute();
        return { updated: result.affected ?? 0 };
    }

    async recalcularPlazosPorTipoProceso(tipoProceso: string, deltaDias: number): Promise<{ updated: number }> {
        if (deltaDias === 0) return { updated: 0 };

        const expedientes = await this.expedienteRepository.find({ where: { tipoProceso } });
        let updated = 0;

        for (const exp of expedientes) {
            if (!exp.fechaVencimientoTermino) continue;

            const nuevaFecha = exp.tipoConteoTermino === 'CALENDARIO'
                ? (() => { const d = new Date(exp.fechaVencimientoTermino); d.setDate(d.getDate() + deltaDias); return d; })()
                : exp.tipoConteoTermino === 'HORAS'
                ? (() => { const d = new Date(exp.fechaVencimientoTermino); d.setHours(d.getHours() + deltaDias); return d; })()
                : this.shiftBusinessDays(new Date(exp.fechaVencimientoTermino), deltaDias);

            await this.expedienteRepository.update(exp.id, {
                fechaVencimientoTermino: nuevaFecha,
                terminoProcesalDias: Math.max(1, (exp.terminoProcesalDias || 0) + deltaDias),
            });
            updated++;
        }

        return { updated };
    }

    async listarExpedientes(filtros: { estado?: string; jurisdiccion?: string; search?: string; abogadoSustanciadorKeys?: string[] }): Promise<any[]> {
        try {
            const queryBuilder = this.expedienteRepository.createQueryBuilder('expediente');
            queryBuilder.leftJoinAndSelect('expediente.evidencias', 'evidencias');
            queryBuilder.leftJoinAndSelect('expediente.actors', 'actors');
            queryBuilder.leftJoinAndSelect('expediente.procesosAnexados', 'procesosAnexados', "procesosAnexados.estado_archivo = 'ACTIVO'");
            queryBuilder.leftJoinAndSelect('procesosAnexados.actors', 'procesosAnexadosActors');

            // Solo mostrar expedientes activos en el Kanban (no archivados ni eliminados)
            queryBuilder.andWhere("expediente.estadoArchivo = 'ACTIVO'");

            // No mostrar expedientes anexados como tarjetas independientes en el Kanban
            queryBuilder.andWhere("expediente.procesoPrincipalId IS NULL");

            queryBuilder.addSelect((subQuery) => {
                return subQuery
                    .select("COUNT(doc.id)", "count")
                    .from(Documento, "doc")
                    .where("doc.expedienteId = expediente.id");
            }, "conteo_docs");

            if (filtros.estado) {
                queryBuilder.andWhere('expediente.estado = :estado', { estado: filtros.estado });
            }

            if (filtros.jurisdiccion) {
                queryBuilder.andWhere('expediente.jurisdiccion = :jurisdiccion', { jurisdiccion: filtros.jurisdiccion });
            }

            if (filtros.search) {
                queryBuilder.andWhere('(expediente.radicado ILIKE :search OR expediente.demandante ILIKE :search OR expediente.demandado ILIKE :search)', { search: `%${filtros.search}%` });
            }

            if (filtros.abogadoSustanciadorKeys?.length) {
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                const uuidKey = filtros.abogadoSustanciadorKeys.find(k => uuidRegex.test(k));
                const normalizedKeys = filtros.abogadoSustanciadorKeys.map(k => k.toLowerCase());
                if (uuidKey) {
                    queryBuilder.andWhere(
                        `(LOWER(expediente.abogadoSustanciador) IN (:...normalizedKeys)
                          OR LOWER(expediente.abogadoSustanciador) = (
                              SELECT LOWER(u.public_id::text)
                              FROM auth."user" u
                              WHERE u.id_user::text = :userId
                              LIMIT 1
                          )
                          OR LOWER(expediente.abogadoSustanciador) = (
                              SELECT LOWER(p.nom_largo)
                              FROM auth."user" u
                              LEFT JOIN auth.personas p ON p.id_person = u.id_person
                              WHERE u.id_user::text = :userId
                              LIMIT 1
                          ))`,
                        { normalizedKeys, userId: uuidKey },
                    );
                } else {
                    queryBuilder.andWhere(
                        'LOWER(expediente.abogadoSustanciador) IN (:...normalizedKeys)',
                        { normalizedKeys },
                    );
                }
            }

            const { entities, raw } = await queryBuilder.orderBy('expediente.createdAt', 'DESC').getRawAndEntities();

            const profesionalIds = [...new Set(entities.map((entity) => entity.abogadoSustanciador).filter(Boolean))];
            const profesionalesMap = await this.resolveProfesionalesDesdeAuth(profesionalIds);

            return entities.map((entity) => {
                const rawRow = raw.find(r => r.expediente_id === entity.id);
                const count = rawRow ? Number(rawRow.conteo_docs) : 0;
                entity.documentosCount = count;
                if (!entity.actuaciones) entity.actuaciones = [];
                const abogadoId = entity.abogadoSustanciador || null;
                const abogadoAuth = abogadoId ? profesionalesMap.get(abogadoId) : undefined;
                return {
                    ...entity,
                    abogadoAsignado: {
                        id: abogadoId,
                        nombre: abogadoAuth?.nombre ?? 'Sin asignar',
                        identificacion: abogadoAuth?.identificacion ?? '',
                    },
                };
            });
        } catch (error) {
            Logger.error(`[ExpedienteService] Error en listarExpedientes: ${error?.message || error}`, error?.stack);
            throw error;
        }
    }

    private async resolveProfesionalesDesdeAuth(ids: string[]): Promise<Map<string, { nombre: string; identificacion: string }>> {
        const filteredIds = ids.filter(Boolean);
        if (filteredIds.length === 0) return new Map();

        try {
            const rows = await this.dataSource.query(
                `SELECT
                    u.id_user::text AS id_user,
                    u.public_id::text AS public_id,
                    COALESCE(p.nom_largo, u.username, u.id_user::text) AS nombre,
                    COALESCE(p.num_identificacion::text, p.dir_email, u.username, '') AS identificacion
                 FROM auth."user" u
                 LEFT JOIN auth.personas p ON p.id_person = u.id_person
                 WHERE u.id_user::text = ANY($1)
                    OR u.public_id::text = ANY($1)`,
                [filteredIds],
            );

            const map = new Map<string, { nombre: string; identificacion: string }>();
            for (const row of rows) {
                const value = {
                    nombre: row.nombre || 'Sin asignar',
                    identificacion: row.identificacion || '',
                };
                if (row.id_user) map.set(row.id_user, value);
                if (row.public_id) map.set(row.public_id, value);
            }
            return map;
        } catch (error) {
            Logger.warn(`[ExpedienteService] No se pudieron resolver profesionales desde auth: ${error?.message || error}`);
            return new Map();
        }
    }

    async updateExpediente(id: string, data: Partial<Expediente>): Promise<Expediente> {
        // 1. Obtener estado actual
        const currentExpediente = await this.findOne(id);
        if (!currentExpediente) throw new NotFoundException('Expediente no encontrado');

        // 2. Detectar cambios relevantes (Etapa / Estado)
        if (data.etapaProcesal && data.etapaProcesal !== currentExpediente.etapaProcesal) {
            // Crear actuación automática
            await this.agregarActuacion(id, {
                tipoActuacion: 'CAMBIO_ETAPA',
                descripcion: `Cambio de etapa: ${currentExpediente.etapaProcesal} -> ${data.etapaProcesal}`,
                fechaActuacion: new Date(),
                usuarioResponsable: 'Sistema' // O idealmente el usuario del request si se pasa
            });

            // Auto-autorizar actuaciones pendientes
            try {
                const pendingActuaciones = await this.actuacionRepository.find({
                    where: [
                        { expedienteId: currentExpediente.id },
                        { expedienteId: currentExpediente.radicado }
                    ]
                });
                for (const act of pendingActuaciones) {
                    if (act.metadata && act.metadata.estadoAutorizacion === 'PENDIENTE') {
                        act.metadata.estadoAutorizacion = 'AUTORIZADO';
                        act.metadata.estado = 'Completado';
                        act.metadata.firmadoPor = 'Aprobación General';
                        act.metadata.fechaFirma = new Date().toISOString();
                        delete act.metadata.otp;
                        delete act.metadata.otpExpiry;
                        await this.actuacionRepository.save(act);
                    }
                }
            } catch (err) {
                Logger.error(`Error auto-autorizando actuaciones en cambio de etapa: ${err?.message || err}`);
            }
        }

        if (data.estado && data.estado !== currentExpediente.estado) {
            await this.agregarActuacion(id, {
                tipoActuacion: 'CAMBIO_ESTADO',
                descripcion: `Cambio de estado: ${currentExpediente.estado} -> ${data.estado}`,
                fechaActuacion: new Date(),
                usuarioResponsable: 'Sistema'
            });
        }

        // 2b. Detectar reasignación de abogado
        let nuevoProfesionalId: string | undefined;
        if (data.abogadoSustanciador && data.abogadoSustanciador !== currentExpediente.abogadoSustanciador) {
            nuevoProfesionalId = data.abogadoSustanciador;
            const abogadoAnterior = currentExpediente.abogadoSustanciador;
            if (abogadoAnterior) {
                // Append to abogadosAnteriores (deduplicated)
                const anteriores = currentExpediente.abogadosAnteriores || [];
                if (!anteriores.includes(abogadoAnterior)) {
                    anteriores.push(abogadoAnterior);
                }
                data.abogadosAnteriores = anteriores;
            }
        }

        // 3. Actualizar
        await this.expedienteRepository.update(id, data);
        const updated = await this.findOne(id);
        if (!updated) throw new Error('Expediente no encontrado post-update');

        // Notificar al nuevo abogado si hubo reasignación
        if (nuevoProfesionalId) {
            const esDisciplinario =
                updated.jurisdiccion === 'DISCIPLINARIO' ||
                updated.jurisdiccion === 'Disciplinaria' ||
                updated.tipoProceso === 'DISCIPLINARIO' ||
                updated.tipoProceso === 'Disciplinario';
            const modulo = esDisciplinario ? 'JUZGAMIENTO_DISCIPLINARIO' : 'DEFENSA_JUDICIAL';

            await this.legalNotifications.notifyProfesionalAsignado({
                modulo,
                radicado: updated.radicado,
                procesoId: updated.id,
                abogadoId: nuevoProfesionalId,
                asignadoPor: 'Sistema',
                esReasignacion: true,
            });
        }

        return updated;
    }

    async findOne(id: string): Promise<Expediente | null> {
        // Validation: If ID is not a UUID, return null immediately to avoid DB errors
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(id)) {
            return null;
        }

        const expediente = await this.expedienteRepository.findOne({
            where: { id },
            relations: ['evidencias', 'actors', 'procesosAnexados', 'procesosAnexados.actors']
            // Note: actuaciones loaded manually due to loose coupling
        });

        if (expediente) {
            // Manual fetch for loose relation: Check both ID (UUID) and Radicado (String)
            expediente.actuaciones = await this.actuacionRepository.find({
                where: [
                    { expedienteId: id },          // Check UUID
                    { expedienteId: expediente.radicado } // Check Radicado
                ],
                order: { fechaActuacion: 'DESC' }
            });

            // Filter out archived/deleted procesos anexados
            if (expediente.procesosAnexados) {
                expediente.procesosAnexados = expediente.procesosAnexados.filter(p => p.estadoArchivo === 'ACTIVO');
            }
        }
        return expediente;
    }

    async findOneOrCreateFromDisciplinaryProcess(id: string): Promise<Expediente> {
        // First, try to find in legal_management
        let expediente = await this.findOne(id);
        if (expediente) return expediente;

        // If not found, check if it's a disciplinary process
        const disciplinaryProcess = await this.expedienteRepository.query(`
            SELECT dp.id, dp."radicadoProceso", dn."disciplinable"->>'nombre' as demandado, dn."disciplinable"->>'dependencia' as dependencia
            FROM internal_disciplinary_control.disciplinary_processes dp
            JOIN internal_disciplinary_control.disciplinary_news dn ON dp."newsId" = dn.id
            WHERE dp.id = $1
        `, [id]);

        if (disciplinaryProcess.length === 0) {
            throw new NotFoundException('Expediente no encontrado');
        }

        const process = disciplinaryProcess[0];

        // Create the expediente in legal_management
        const newExpediente = await this.crearExpediente({
            id: process.id,
            radicado: process.radicadoProceso,
            jurisdiccion: 'DISCIPLINARIO',
            tipoProceso: 'DISCIPLINARIO',
            demandante: 'ESAP',
            demandado: process.demandado || 'Desconocido',
            estado: 'ACTIVO',
            fechaRadicacion: new Date(),
            dependenciaInvestigado: process.dependencia || 'Desconocida',
            etapaProcesal: 'INDAGACION_PREVIA'
        });

        return newExpediente;
    }

    // ==================== EXCEPCIONES PROCESALES ====================

    async getExcepciones(expedienteId: string): Promise<ExcepcionProcesal[]> {
        return this.excepcionRepository.find({
            where: { expedienteId },
            order: { fechaPresentacion: 'DESC' }
        });
    }

    async createExcepcion(expedienteId: string, data: {
        tipo: TipoExcepcion;
        descripcion: string;
        fundamento?: string;
        presentadoPor?: string;
    }): Promise<ExcepcionProcesal> {
        const expediente = await this.findOne(expedienteId);
        if (!expediente) throw new NotFoundException('Expediente no encontrado');

        const nuevaExcepcion = this.excepcionRepository.create({
            ...data,
            expedienteId: expediente.id,
            estado: 'PENDIENTE',
            fechaPresentacion: new Date().toISOString().split('T')[0]
        });

        return this.excepcionRepository.save(nuevaExcepcion);
    }

    async resolverExcepcion(excepcionId: string, data: {
        estado: EstadoExcepcion;
        resolucion: string;
    }): Promise<ExcepcionProcesal> {
        const excepcion = await this.excepcionRepository.findOne({ where: { id: excepcionId } });
        if (!excepcion) throw new NotFoundException('Excepción no encontrada');

        excepcion.estado = data.estado;
        excepcion.resolucion = data.resolucion;
        excepcion.fechaResolucion = new Date().toISOString().split('T')[0];

        return this.excepcionRepository.save(excepcion);
    }

    // ==================== MÉTODOS DE ARCHIVO/ELIMINADO ====================

    /**
     * Obtener expedientes archivados y eliminados
     */
    async getExpedientesArchivados(filtros: { abogadoSustanciadorKeys?: string[] } = {}): Promise<Expediente[]> {
        const query = this.expedienteRepository
            .createQueryBuilder('expediente')
            .leftJoinAndSelect('expediente.actors', 'actors')
            .where('expediente.estadoArchivo IN (:...estadosArchivo)', {
                estadosArchivo: ['ARCHIVADO', 'ELIMINADO'],
            });

        if (filtros.abogadoSustanciadorKeys?.length) {
            const normalizedKeys = filtros.abogadoSustanciadorKeys.map((key) => key.toLowerCase());
            query.andWhere(
                '(expediente.abogadoSustanciador IN (:...abogadoSustanciadorKeys) OR LOWER(expediente.abogadoSustanciador) IN (:...normalizedKeys))',
                { abogadoSustanciadorKeys: filtros.abogadoSustanciadorKeys, normalizedKeys },
            );
        }

        return query.orderBy('expediente.fechaArchivo', 'DESC').getMany();
    }

    /**
     * Archivar un expediente (permanece en BD pero sale del Kanban)
     * También archiva en cascada todos sus procesos anexados.
     */
    async archivarExpediente(id: string, motivo: string, usuario: string): Promise<Expediente> {
        const expediente = await this.expedienteRepository.findOne({
            where: { id },
            relations: ['procesosAnexados']
        });

        if (!expediente) throw new NotFoundException(`Expediente con ID ${id} no encontrado`);

        const fechaArchivo = new Date();

        // Archivar el expediente principal
        expediente.estadoArchivo = 'ARCHIVADO';
        expediente.fechaArchivo = fechaArchivo;
        expediente.usuarioArchivo = usuario;
        expediente.motivoArchivo = motivo;

        await this.expedienteRepository.save(expediente);

        // Archivar en cascada los procesos anexados
        if (expediente.procesosAnexados && expediente.procesosAnexados.length > 0) {
            for (const anexado of expediente.procesosAnexados) {
                anexado.estadoArchivo = 'ARCHIVADO';
                anexado.fechaArchivo = fechaArchivo;
                anexado.usuarioArchivo = usuario;
                anexado.motivoArchivo = `Archivado en cascada junto con proceso principal ${expediente.radicado}: ${motivo}`;
                await this.expedienteRepository.save(anexado);

                await this.agregarActuacion(anexado.id, {
                    tipoActuacion: 'ARCHIVO_CASCADA',
                    descripcion: `El expediente fue archivado automáticamente al archivar su proceso principal (${expediente.radicado}).`,
                    usuarioResponsable: usuario
                });
            }
        }

        return expediente;
    }

    /**
     * Eliminar un expediente (soft delete - va a papelera)
     * También elimina en cascada todos sus procesos anexados.
     */
    async eliminarExpedienteSoft(id: string, motivo: string, usuario: string): Promise<Expediente> {
        const expediente = await this.expedienteRepository.findOne({
            where: { id },
            relations: ['procesosAnexados']
        });

        if (!expediente) throw new NotFoundException(`Expediente con ID ${id} no encontrado`);

        const fechaArchivo = new Date();

        // Eliminar lógicamente el expediente principal
        expediente.estadoArchivo = 'ELIMINADO';
        expediente.fechaArchivo = fechaArchivo;
        expediente.usuarioArchivo = usuario;
        expediente.motivoArchivo = motivo;

        await this.expedienteRepository.save(expediente);

        // Eliminar lógicamente en cascada los procesos anexados
        if (expediente.procesosAnexados && expediente.procesosAnexados.length > 0) {
            for (const anexado of expediente.procesosAnexados) {
                anexado.estadoArchivo = 'ELIMINADO';
                anexado.fechaArchivo = fechaArchivo;
                anexado.usuarioArchivo = usuario;
                anexado.motivoArchivo = `Eliminado en cascada junto con proceso principal ${expediente.radicado}: ${motivo}`;
                await this.expedienteRepository.save(anexado);

                await this.agregarActuacion(anexado.id, {
                    tipoActuacion: 'ELIMINACION_CASCADA',
                    descripcion: `El expediente fue eliminado lógicamente de forma automática al eliminar su proceso principal (${expediente.radicado}).`,
                    usuarioResponsable: usuario
                });
            }
        }

        return expediente;
    }

    /**
     * Restaurar un expediente archivado o eliminado al Kanban
     * También restaura en cascada sus procesos anexados directamente vinculados a él en el mismo momento.
     */
    async restaurarExpediente(id: string): Promise<Expediente> {
        const expediente = await this.expedienteRepository.findOne({
            where: { id },
            relations: ['procesosAnexados']
        });

        if (!expediente) throw new NotFoundException(`Expediente con ID ${id} no encontrado`);

        // Restaurar expediente principal
        expediente.estadoArchivo = 'ACTIVO';
        expediente.fechaArchivo = null as any;
        expediente.usuarioArchivo = null as any;
        expediente.motivoArchivo = null as any;

        await this.expedienteRepository.save(expediente);

        // Restaurar en cascada
        if (expediente.procesosAnexados && expediente.procesosAnexados.length > 0) {
            for (const anexado of expediente.procesosAnexados) {
                // Solo restaurar si estaban archivados/eliminados
                if (anexado.estadoArchivo !== 'ACTIVO') {
                    anexado.estadoArchivo = 'ACTIVO';
                    anexado.fechaArchivo = null as any;
                    anexado.usuarioArchivo = null as any;
                    anexado.motivoArchivo = null as any;
                    await this.expedienteRepository.save(anexado);

                    await this.agregarActuacion(anexado.id, {
                        tipoActuacion: 'RESTAURACION_CASCADA',
                        descripcion: `El expediente fue restaurado automáticamente al restaurar su proceso principal (${expediente.radicado}).`,
                        usuarioResponsable: 'Sistema'
                    });
                }
            }
        }

        return expediente;
    }

    /**
     * Anexar un expediente a otro (proceso principal)
     */
    async anexarExpediente(anexadoId: string, principalId: string, usuario: string): Promise<Expediente> {
        const principal = await this.findOne(principalId);
        if (!principal) throw new NotFoundException(`Expediente principal con ID ${principalId} no encontrado`);

        const anexado = await this.expedienteRepository.findOne({
            where: { id: anexadoId },
            relations: ['procesosAnexados']
        });
        if (!anexado) throw new NotFoundException(`Expediente a anexar con ID ${anexadoId} no encontrado`);

        if (anexado.procesosAnexados && anexado.procesosAnexados.length > 0) {
            throw new ConflictException(`El expediente ${anexado.radicado} ya tiene procesos anexados, no puede ser anexado a otro proceso.`);
        }

        if (anexado.procesoPrincipalId) {
            throw new ConflictException(`El expediente ${anexado.radicado} ya está anexado a otro proceso`);
        }

        if (anexadoId === principalId) {
            throw new ConflictException(`No se puede anexar un expediente a sí mismo`);
        }

        anexado.procesoPrincipalId = principalId;
        await this.expedienteRepository.save(anexado);

        // Registrar actuación en ambos
        await this.agregarActuacion(principalId, {
            tipoActuacion: 'ANEXO_PROCESO',
            descripcion: `Se ha anexado el proceso ${anexado.radicado} a este expediente.`,
            usuarioResponsable: usuario
        });

        await this.agregarActuacion(anexadoId, {
            tipoActuacion: 'ANEXO_PROCESO',
            descripcion: `Este proceso ha sido anexado al expediente ${principal.radicado}.`,
            usuarioResponsable: usuario
        });

        const updated = await this.findOne(principalId);
        if (!updated) throw new Error('Expediente no encontrado post-update');

        const esDisciplinario =
            updated.jurisdiccion === 'DISCIPLINARIO' ||
            updated.jurisdiccion === 'Disciplinaria' ||
            updated.tipoProceso === 'DISCIPLINARIO' ||
            updated.tipoProceso === 'Disciplinario';
        const modulo = esDisciplinario ? 'JUZGAMIENTO_DISCIPLINARIO' : 'DEFENSA_JUDICIAL';

        await this.legalNotifications.notifyProcesoAnexado({
            modulo,
            radicadoAnexado: anexado.radicado,
            radicadoPrincipal: updated.radicado,
            procesoPrincipalId: updated.id,
            anexadoPor: usuario,
        });

        await this.legalNotifications.notifyProfesionalesProcesoAnexado({
            modulo,
            radicadoAnexado: anexado.radicado,
            radicadoPrincipal: updated.radicado,
            procesoPrincipalId: updated.id,
            procesoAnexadoId: anexado.id,
            anexadoPor: usuario,
            abogadoPrincipalId: updated.abogadoSustanciador ?? undefined,
            abogadoAnexadoId: anexado.abogadoSustanciador ?? undefined,
        });

        return updated;
    }

    /**
     * Desanexar un expediente de su proceso principal
     */
    async desanexarExpediente(anexadoId: string, usuario: string): Promise<Expediente> {
        const anexado = await this.expedienteRepository.findOne({ where: { id: anexadoId } });
        if (!anexado) throw new NotFoundException(`Expediente con ID ${anexadoId} no encontrado`);

        const principalId = anexado.procesoPrincipalId;
        if (!principalId) {
            throw new ConflictException(`El expediente ${anexado.radicado} no está anexado a ningún proceso`);
        }

        const principal = await this.findOne(principalId);

        anexado.procesoPrincipalId = null as any; // TypeORM trick for nullable with non-optional property
        await this.expedienteRepository.save(anexado);

        // Registrar actuación en ambos
        if (principal) {
            await this.agregarActuacion(principalId, {
                tipoActuacion: 'DESANEXO_PROCESO',
                descripcion: `Se ha desanexado el proceso ${anexado.radicado} de este expediente.`,
                usuarioResponsable: usuario
            });
        }

        await this.agregarActuacion(anexadoId, {
            tipoActuacion: 'DESANEXO_PROCESO',
            descripcion: `Este proceso ha sido desanexado de su expediente principal.`,
            usuarioResponsable: usuario
        });

        // Retornamos el principal para que el frontend recargue la vista del principal sin el anexado
        const updated = await this.findOne(principalId);
        return updated as Expediente;
    }

    /**
     * Eliminar permanentemente un expediente de la BD.
     * Elimina en cascada todas las entidades hijas asociadas dentro de una transacción.
     */
    async eliminarPermanente(id: string): Promise<void> {
        const expediente = await this.expedienteRepository.findOne({ where: { id } });
        if (!expediente) throw new NotFoundException(`Expediente con ID ${id} no encontrado`);

        // Solo se puede eliminar permanentemente si ya está en estado ELIMINADO
        if (expediente.estadoArchivo !== 'ELIMINADO') {
            throw new ConflictException('Solo se pueden eliminar permanentemente expedientes que estén en estado ELIMINADO');
        }

        const logger = new Logger('ExpedienteService');
        logger.log(`Eliminando permanentemente expediente ${id} y todas sus relaciones...`);

        await this.expedienteRepository.manager.transaction(async (manager) => {
            // 1. Entidades con @ManyToOne FK al expediente SIN onDelete CASCADE
            await manager.delete(TareaExpediente, { expedienteId: id });
            await manager.delete(NotaExpediente, { expedienteId: id });
            await manager.delete(Evidencia, { expedienteId: id });
            await manager.delete(Audiencia, { expedienteId: id });
            await manager.delete(Acta, { expedienteId: id });
            await manager.delete(DecisionDisciplinaria, { expedienteId: id });
            await manager.delete(ExcepcionProcesal, { expedienteId: id });

            // 2. Actuaciones (loose coupling - sin FK formal en BD)
            await manager.delete(Actuacion, { expedienteId: id });

            // 3. Oficios (sin relación ORM formal, solo columna plana)
            await manager
                .createQueryBuilder()
                .delete()
                .from('legal_management.oficios_enviados')
                .where('expediente_id = :id', { id })
                .execute();

            // 4. Correos jurídicos (desvincular, no borrar — los correos pueden pertenecer a otros contextos)
            //    Usamos SQL raw porque CorreoJuridico no mapea expediente_id como propiedad TypeORM
            await manager.query(
                `UPDATE legal_management.correos_juridicos SET expediente_id = NULL WHERE expediente_id = $1`,
                [id]
            );

            // 5. Finalmente eliminar el expediente
            //    Actor, Documento, Comentario, Auto se borran por ON DELETE CASCADE en BD
            await manager.delete(Expediente, { id });

            logger.log(`Expediente ${id} eliminado permanentemente con éxito.`);
        });
    }

    async deleteExpediente(id: string): Promise<void> {
        const result = await this.expedienteRepository.delete(id);
        if (result.affected === 0) {
            throw new NotFoundException(`Expediente con ID ${id} no encontrado`);
        }
    }
}
