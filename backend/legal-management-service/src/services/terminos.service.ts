
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TerminoProcesal } from '../entities/termino-procesal.entity';
import { Expediente } from '../entities/expediente.entity';
import { ConsultaJuridica } from '../entities/consulta-juridica.entity';

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
    ) { }

    async create(data: Partial<TerminoProcesal>): Promise<TerminoProcesal> {
        const termino = this.terminoRepository.create(data);
        return this.terminoRepository.save(termino);
    }

    async createManual(data: any): Promise<TerminoProcesal> {
        const fechaBase = new Date();
        const dias = 10;

        return this.createAutomatico(
            'MANUAL',
            'MANUAL-' + Date.now(),
            data.numeroRadicado || 'S/N',
            data.nombreActuacion,
            fechaBase,
            dias,
            data.responsableId,
            undefined, // responsableNombre
            'HABILES',
            undefined,
            data.observaciones
        );
    }

    async createAutomatico(
        origen: 'DEFENSA' | 'JUZGAMIENTO' | 'ASESORIA' | 'MANUAL',
        referenciaId: string,
        radicado: string,
        nombreActuacion: string,
        fechaBase: Date,
        diasTermino: number,
        responsableId?: string,
        responsableNombre?: string,
        tipoDias: 'HABILES' | 'CALENDARIO' = 'HABILES',
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
            termino.observaciones = observaciones || null;
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

        return this.terminoRepository.save(termino);
    }

    async findAll(filtros: any): Promise<TerminoProcesal[]> {
        const query = this.terminoRepository.createQueryBuilder('termino');

        if (filtros.responsableId) {
            query.andWhere('termino.responsableId = :responsableId', { responsableId: filtros.responsableId });
        }

        if (filtros.estado) {
            query.andWhere('termino.estado = :estado', { estado: filtros.estado });
        }

        query.orderBy('termino.fechaVencimiento', 'ASC');

        return query.getMany();
    }

    async getCalendario(start: string, end: string, responsableId?: string): Promise<any[]> {
        const query = this.terminoRepository.createQueryBuilder('termino')
            .where('termino.fechaVencimiento BETWEEN :start AND :end', {
                start: new Date(start),
                end: new Date(end)
            });

        if (responsableId) {
            query.andWhere('termino.responsableId = :responsableId', { responsableId });
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

    async getSemaforoList(responsableId?: string): Promise<any[]> {
        const terminos = await this.findAll({ responsableId, estado: 'PENDIENTE' });

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
        return termino;
    }

    // NEW: Get associated documents
    async getDocumentos(id: string): Promise<any[]> {
        const termino = await this.findOne(id);
        const docs: any[] = [];

        if (termino.origenModulo === 'DEFENSA' || termino.origenModulo === 'JUZGAMIENTO') {
            const expediente = await this.expedienteRepository.findOne({
                where: { id: termino.referenciaId },
                relations: ['documentos', 'actuaciones'] // Fetch real relations
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

                // 2. Documentos from Actuaciones
                if (expediente.actuaciones) {
                    expediente.actuaciones.forEach(a => {
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

        if (termino.origenModulo === 'ASESORIA') {
            const consulta = await this.consultaRepository.findOne({
                where: { id: termino.referenciaId },
                relations: ['abogadoAsignado']
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

        return docs;
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

    async sincronizar(): Promise<{ total: number; nuevos: number }> {
        let nuevos = 0;
        this.logger.log('Iniciando sincronización de términos...');

        // 1. Defensa y Juzgamiento (Expedientes)
        const expedientes = await this.expedienteRepository.find();

        for (const exp of expedientes) {
            const abogadoNombre = exp.abogadoSustanciador || 'Sin asignar';
            // Fallback chain for "Hechos"
            const hechos = exp.hechos || exp.pretensionDemandante || exp.asunto || 'Sin descripción detallada';

            // A: Término de Vencimiento (General / Defensa)
            const hasVencimiento = !!exp.fechaVencimientoTermino;
            const hasDias = (exp.terminoProcesalDias && exp.terminoProcesalDias > 0);

            if ((hasVencimiento || hasDias) && exp.estado !== 'FALLO' && exp.estado !== 'ARCHIVADO') {
                this.logger.debug(`[DEFENSA] Sincronizando ${exp.radicado}: Abogado=${abogadoNombre}`);

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

            // B: Fin de Etapa (Juzgamiento Disciplinario)
            if (exp.fechaLimiteEtapa) {
                // If it has 'etapa', it is likely Juzgamiento
                const descripcionEtapa = exp.etapa ? `Fin Etapa: ${exp.etapa}` : 'Vencimiento Etapa Procesal';
                this.logger.debug(`[JUZGAMIENTO] Sincronizando ${exp.radicado}: Etapa=${exp.etapa}, Abogado=${abogadoNombre}`);
                await this.createAutomatico(
                    'JUZGAMIENTO',
                    exp.id,
                    exp.radicado || exp.id,
                    descripcionEtapa,
                    new Date(), // Base date for stage might be start of stage? Using now as fallback or last update
                    0,
                    undefined,
                    abogadoNombre,
                    'HABILES',
                    exp.fechaLimiteEtapa,
                    `[Juzgamiento] ${exp.etapa || ''}. ${hechos}`
                );
                nuevos++;
            }
        }

        // 2. Asesoria Jurídica
        const consultas = await this.consultaRepository.find({ relations: ['abogadoAsignado'] });
        for (const cons of consultas) {
            const responsableUUID = cons.abogadoAsignadoId || undefined;
            const responsableNombre = cons.abogadoAsignado?.nombreCompleto || 'Sin asignar';
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

                this.logger.debug(`[ASESORIA] Sincronizando ${cons.numeroRadicado}: Abogado=${responsableNombre}, Dias=${cons.terminoLegalDias}`);

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

        this.logger.log(`Sincronización finalizada. Procesados: ${nuevos}`);
        return { total: expedientes.length + consultas.length, nuevos };
    }
}
