import { Controller, Get, Post, Body, Param, Put, Patch, Delete, Query, UseInterceptors, UploadedFile, BadRequestException, NotFoundException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ExpedienteService } from '../services/expediente.service';
import { Expediente } from '../entities/expediente.entity';
import { TareasNotasService } from '../services/tareas-notas.service';
import { LegalNotificationsService } from '../services/legal-notifications.service';

@Controller('juzgamiento')
export class JuzgamientoController {
    constructor(
        private readonly expedienteService: ExpedienteService,
        private readonly tareasNotasService: TareasNotasService,
        private readonly legalNotifications: LegalNotificationsService
    ) { }

    @Get()
    async findAll(@Query('search') search?: string) {
        // 1. Obtener expedientes disciplinarios
        const rawExpedientes = await this.expedienteService.listarExpedientes({
            jurisdiccion: 'DISCIPLINARIO',
            search
        });

        // 2. Mapear al formato Kanban requerido por el frontend
        return rawExpedientes.map(exp => {
            const diasRestantes = this.calculateDiasRestantes(exp.fechaLimiteEtapa, exp.fechaPrescripcion);

            return {
                id: exp.radicado, // Frontend expects "PD-2025-001" as ID
                uuid: exp.id,      // Keep internal UUID available if needed
                radicado: exp.radicado,
                etapa: exp.etapa || 'E1_AVOCAMIENTO',
                leyAplicable: exp.leyAplicable || 'Ley 1952/2019',
                investigado: exp.demandado,
                cargo: exp.cargoInvestigado,
                dependencia: exp.dependenciaInvestigado,
                tipoFalta: exp.tipoFalta,
                abogadoAsignado: exp.abogadoSustanciador,
                diasRestantes: diasRestantes,
                diasDescargos: 15,
                // Merge actuaciones and evidencias for documents list
                documentos: [...(exp.actuaciones || []), ...(exp.evidencias || [])],
                actuaciones: exp.actuaciones || [],
                evidencias: exp.evidencias || [],
                hechos: exp.hechos || '',
                procesosAnexados: (exp.procesosAnexados || []).map(a => ({
                    id: a.radicado,
                    uuid: a.id,
                    radicado: a.radicado,
                    investigado: a.demandado,
                    tipoFalta: a.tipoFalta,
                    etapa: a.etapa || 'E1_AVOCAMIENTO',
                    estado: a.estado
                })),
                procesoPrincipalId: exp.procesoPrincipalId || null,
                // Semáforo logic is usually frontend, but we pass necessary data
            };
        });
    }

    @Get(':radicado')
    async findOne(@Param('radicado') radicado: string) {
        const exp = await this.expedienteService.findOneByRadicado(radicado);
        if (!exp) throw new NotFoundException('Expediente disciplinario no encontrado');

        const diasRestantes = this.calculateDiasRestantes(exp.fechaLimiteEtapa);

        return {
            id: exp.radicado, // Frontend expects "PD-2025-001" as ID
            uuid: exp.id,
            radicado: exp.radicado,
            etapa: exp.etapa || 'E1_AVOCAMIENTO',
            leyAplicable: exp.leyAplicable || 'Ley 1952/2019',
            investigado: exp.demandado,
            cargo: exp.cargoInvestigado,
            dependencia: exp.dependenciaInvestigado,
            tipoFalta: exp.tipoFalta,
            abogadoAsignado: exp.abogadoSustanciador,
            diasRestantes: diasRestantes,
            diasDescargos: 15,
            documentos: [...(exp.actuaciones || []), ...(exp.evidencias || [])],
            actuaciones: exp.actuaciones || [],
            evidencias: exp.evidencias || [],
            hechos: exp.hechos || '',
            procesosAnexados: (exp.procesosAnexados || []).map((a: any) => ({
                id: a.radicado,
                uuid: a.id,
                radicado: a.radicado,
                investigado: a.demandado,
                tipoFalta: a.tipoFalta,
                etapa: a.etapa || 'E1_AVOCAMIENTO',
                estado: a.estado
            })),
            procesoPrincipalId: exp.procesoPrincipalId || null,
        };
    }

    /** Fecha límite a partir de la cual aplica Ley 1952/2019 */
    private readonly LEY_1952_DESDE = new Date('2021-06-30T00:00:00.000Z');

    /** Determina la ley aplicable según la fecha de los hechos */
    private calcularLeyAplicable(fechaHechos?: string | Date): string {
        if (!fechaHechos) return 'Ley 1952 de 2019'; // Por defecto la más reciente
        const fecha = new Date(fechaHechos);
        return fecha < this.LEY_1952_DESDE ? 'Ley 734 de 2002' : 'Ley 1952 de 2019';
    }

    @Post()
    async create(@Body() data: Partial<Expediente> & { fechaHechos?: string; creadoPor?: string; usuario?: string }) {
        // Auto-generar radicado PD-YYYY-NNNNN si no viene en el body
        if (!data.radicado) {
            const year = new Date().getFullYear();
            const prefix = `PD-${year}-`;
            const allExpedientes = await this.expedienteService.listarExpedientes({
                jurisdiccion: 'DISCIPLINARIO'
            });
            let maxSeq = 0;
            for (const exp of allExpedientes) {
                if (exp.radicado && exp.radicado.startsWith(prefix)) {
                    const parts = exp.radicado.split('-');
                    if (parts.length === 3) {
                        const seq = parseInt(parts[2], 10);
                        if (seq > maxSeq) maxSeq = seq;
                    }
                }
            }
            data.radicado = `${prefix}${String(maxSeq + 1).padStart(5, '0')}`;
        }

        // Calcular ley aplicable según fecha de los hechos
        const leyAplicable = this.calcularLeyAplicable(data.fechaHechos);

        const creadoPor = data.creadoPor || data.usuario || 'Sistema';
        return this.expedienteService.crearExpediente({
            ...data,
            jurisdiccion: 'DISCIPLINARIO',
            tipoProceso: 'Disciplinario',
            etapa: 'E1_AVOCAMIENTO',
            leyAplicable,
            fechaHechos: data.fechaHechos ? new Date(data.fechaHechos) : undefined,
        }, creadoPor);
    }

    @Patch(':radicado')
    async update(@Param('radicado') radicado: string, @Body() data: Partial<Expediente>) {
        const expediente = await this.expedienteService.findOneByRadicado(radicado);
        if (!expediente) throw new BadRequestException('Expediente no encontrado');

        return this.expedienteService.updateExpediente(expediente.id, data);
    }

    private calculateDiasRestantes(fechaLimiteEtapa?: Date, fechaPrescripcion?: Date): number {
        const fecha = fechaLimiteEtapa ?? fechaPrescripcion;
        if (!fecha) return 0;
        const diffTime = new Date(fecha).getTime() - new Date().getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    @Post(':radicado/documentos')
    @UseInterceptors(FileInterceptor('file', {
        storage: diskStorage({
            destination: './uploads',
            filename: (req, file, cb) => {
                const randomName = Array.from(Array(32)).map(() => Math.round(Math.random() * 16).toString(16)).join('');
                return cb(null, `${randomName}${extname(file.originalname)}`);
            }
        })
    }))
    async uploadDocumento(
        @Param('radicado') radicado: string,
        @Body() body: { tipo: string; descripcion: string; subidoPor?: string; usuario?: string },
        @UploadedFile() file: any
    ) {
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }

        const expediente = await this.expedienteService.findOneByRadicado(radicado);
        if (!expediente) {
            throw new BadRequestException('Expediente no encontrado');
        }

        const tipoUpper = (body.tipo || 'DOCUMENTO').toUpperCase();
        // Mapear tipo a tipoActuacion y descripción
        const esEvidencia = tipoUpper.includes('EVIDENCIA') || tipoUpper === 'PRUEBAS';
        const contexto = esEvidencia ? 'Pruebas' : tipoUpper === 'OTROS' ? 'Otros Documentos' : 'Documentos';
        const descripcionBase = body.descripcion || file.originalname;
        const descripcionCompleta = `${descripcionBase} (Cargado desde ${contexto})`;
        const subidoPor = body.subidoPor || body.usuario || 'Usuario Actual';

        // Create Actuacion as Evidence/Document
        // tipoActuacion guarda el tipo original para mapeo en frontend
        const actuacion = await this.expedienteService.agregarActuacion(expediente.id, {
            tipoActuacion: tipoUpper, // Guardar tipo original: 'OTROS', 'PRUEBAS', 'EVIDENCIA', etc.
            descripcion: descripcionCompleta,
            fechaActuacion: new Date(),
            documentoNombre: file.originalname,
            documentoUrl: `files/${file.filename}`, // Ruta relativa - frontend construye la URL absoluta
            usuarioResponsable: subidoPor
        });

        await this.legalNotifications.notifyDocumentoSubido({
            modulo: 'JUZGAMIENTO_DISCIPLINARIO',
            radicado: expediente.radicado,
            procesoId: expediente.id,
            nombreDocumento: file.originalname,
            subidoPor,
        });

        return actuacion;
    }

    @Get(':radicado/actuaciones')
    async getActuaciones(@Param('radicado') radicado: string) {
        const expediente = await this.expedienteService.findOneByRadicado(radicado);
        if (!expediente) throw new BadRequestException('Expediente no encontrado');
        // Return sorted actuations
        return expediente.actuaciones || [];
    }

    @Post(':radicado/actuaciones')
    @UseInterceptors(FileInterceptor('file', {
        storage: diskStorage({
            destination: './uploads',
            filename: (req, file, cb) => {
                const randomName = Array.from(Array(32)).map(() => Math.round(Math.random() * 16).toString(16)).join('');
                return cb(null, `${randomName}${extname(file.originalname)}`);
            }
        })
    }))
    async createActuacion(
        @Param('radicado') radicado: string,
        @Body() body: { tipoActuacion: string; descripcion: string; fechaActuacion?: string; usuario?: string; subidoPor?: string },
        @UploadedFile() file?: any
    ) {
        const expediente = await this.expedienteService.findOneByRadicado(radicado);
        if (!expediente) {
            throw new BadRequestException('Expediente no encontrado');
        }

        const subidoPor = body.subidoPor || body.usuario || 'Usuario Actual';
        const actuacionData: any = {
            tipoActuacion: body.tipoActuacion || 'ACTUACION',
            descripcion: body.descripcion,
            fechaActuacion: body.fechaActuacion ? new Date(body.fechaActuacion) : new Date(),
            usuarioResponsable: subidoPor
        };

        // Si hay archivo, agregar info del documento
        if (file) {
            actuacionData.documentoNombre = file.originalname;
            actuacionData.documentoUrl = `files/${file.filename}`;
        }

        const actuacion = await this.expedienteService.agregarActuacion(expediente.id, actuacionData);

        if (file) {
            await this.legalNotifications.notifyDocumentoSubido({
                modulo: 'JUZGAMIENTO_DISCIPLINARIO',
                radicado: expediente.radicado,
                procesoId: expediente.id,
                nombreDocumento: file.originalname,
                subidoPor,
            });
        }

        return actuacion;
    }

    @Get(':radicado/decisiones')
    async getDecisiones(@Param('radicado') radicado: string) {
        const expediente = await this.expedienteService.findOneByRadicado(radicado);
        if (!expediente) throw new BadRequestException('Expediente no encontrado');
        return this.expedienteService.getDecisions(expediente.id);
    }

    @Post(':radicado/decisiones')
    async createDecision(@Param('radicado') radicado: string, @Body() data: any) {
        const expediente = await this.expedienteService.findOneByRadicado(radicado);
        if (!expediente) throw new BadRequestException('Expediente no encontrado');
        return this.expedienteService.createDecision(expediente.id, data);
    }

    // ==================== EXCEPCIONES PROCESALES ====================

    @Get(':radicado/excepciones')
    async getExcepciones(@Param('radicado') radicado: string) {
        const expediente = await this.expedienteService.findOneByRadicado(radicado);
        if (!expediente) throw new BadRequestException('Expediente no encontrado');
        return this.expedienteService.getExcepciones(expediente.id);
    }

    @Post(':radicado/excepciones')
    async createExcepcion(@Param('radicado') radicado: string, @Body() data: any) {
        const expediente = await this.expedienteService.findOneByRadicado(radicado);
        if (!expediente) throw new BadRequestException('Expediente no encontrado');
        return this.expedienteService.createExcepcion(expediente.id, data);
    }

    @Patch('excepciones/:id/resolver')
    async resolverExcepcion(@Param('id') id: string, @Body() data: any) {
        return this.expedienteService.resolverExcepcion(id, data);
    }

    // ==================== TAREAS DEL EXPEDIENTE ====================

    @Get(':radicado/tareas')
    async getTareas(@Param('radicado') radicado: string) {
        const expediente = await this.expedienteService.findOneByRadicado(radicado);
        if (!expediente) throw new BadRequestException('Expediente no encontrado');
        return this.tareasNotasService.findTareasByExpediente(expediente.id);
    }

    @Post(':radicado/tareas')
    async createTarea(
        @Param('radicado') radicado: string,
        @Body() body: any
    ) {
        const expediente = await this.expedienteService.findOneByRadicado(radicado);
        if (!expediente) throw new BadRequestException('Expediente no encontrado');
        return this.tareasNotasService.createTarea({
            expedienteId: expediente.id,
            titulo: body.titulo,
            descripcion: body.descripcion,
            fechaVencimiento: body.fechaVencimiento ? new Date(body.fechaVencimiento) : undefined,
            prioridad: body.prioridad || 'media',
            estado: body.estado || 'pendiente',
            responsableNombre: body.responsableNombre,
            creadoPor: body.creadoPor
        });
    }

    @Patch(':radicado/tareas/:tareaId')
    async updateTarea(
        @Param('tareaId') tareaId: string,
        @Body() body: any
    ) {
        return this.tareasNotasService.updateTarea(tareaId, body);
    }

    @Delete(':radicado/tareas/:tareaId')
    async deleteTarea(@Param('tareaId') tareaId: string) {
        await this.tareasNotasService.deleteTarea(tareaId);
        return { message: 'Tarea eliminada' };
    }

    // ==================== NOTAS DEL EXPEDIENTE ====================

    @Get(':radicado/notas')
    async getNotas(@Param('radicado') radicado: string) {
        const expediente = await this.expedienteService.findOneByRadicado(radicado);
        if (!expediente) throw new BadRequestException('Expediente no encontrado');
        return this.tareasNotasService.findNotasByExpediente(expediente.id);
    }

    @Post(':radicado/notas')
    async createNota(
        @Param('radicado') radicado: string,
        @Body() body: any
    ) {
        const expediente = await this.expedienteService.findOneByRadicado(radicado);
        if (!expediente) throw new BadRequestException('Expediente no encontrado');
        return this.tareasNotasService.createNota({
            expedienteId: expediente.id,
            contenido: body.contenido,
            tipo: body.tipo || 'general',
            autorNombre: body.autorNombre
        });
    }

    // ==================== ANEXAR / DESANEXAR PROCESOS DISCIPLINARIOS ====================

    @Post(':radicado/anexar')
    async anexar(
        @Param('radicado') radicado: string,
        @Body() body: { principalRadicado: string; usuario?: string }
    ) {
        const anexado = await this.expedienteService.findOneByRadicado(radicado);
        if (!anexado) throw new BadRequestException('Expediente a anexar no encontrado');

        const principal = await this.expedienteService.findOneByRadicado(body.principalRadicado);
        if (!principal) throw new BadRequestException('Expediente principal no encontrado');

        return this.expedienteService.anexarExpediente(anexado.id, principal.id, body.usuario || 'Sistema');
    }

    @Post(':radicado/desanexar')
    async desanexar(
        @Param('radicado') radicado: string,
        @Body() body: { usuario?: string }
    ) {
        const expediente = await this.expedienteService.findOneByRadicado(radicado);
        if (!expediente) throw new BadRequestException('Expediente no encontrado');

        return this.expedienteService.desanexarExpediente(expediente.id, body.usuario || 'Sistema');
    }
}
