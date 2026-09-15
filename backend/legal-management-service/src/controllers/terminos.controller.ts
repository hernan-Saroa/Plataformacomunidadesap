
import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Res, UseInterceptors, UploadedFile, BadRequestException, Req } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import type { Response } from 'express';
import { TerminosService } from '../services/terminos.service';
import { AlertasVencimientoTerminosService } from '../services/alertas-vencimiento-terminos.service';
import { getLegalAccessFromRequest } from '../auth/legal-access';

// Colombia no maneja horario de verano, así que el offset es fijo todo el año.
const OFFSET_BOGOTA = '-05:00';
const SOLO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * El formulario envía `<input type="date">`, es decir "YYYY-MM-DD" sin hora. `new Date()`
 * lo interpreta como medianoche UTC, que en Bogotá cae el DÍA ANTERIOR a las 7pm: un término
 * creado para vencer hoy quedaba guardado como vencido desde ayer. Se ancla al huso de Bogotá:
 * el vencimiento al final del día (se tiene plazo hasta terminar esa fecha) y la fecha base al inicio.
 */
function parseFechaBogota(valor: string | Date, momento: 'inicio' | 'fin'): Date {
    if (valor instanceof Date) return valor;
    const texto = String(valor).trim();
    if (!SOLO_FECHA.test(texto)) return new Date(texto);
    const hora = momento === 'fin' ? '23:59:59.999' : '00:00:00.000';
    return new Date(`${texto}T${hora}${OFFSET_BOGOTA}`);
}

@Controller('terminos')
export class TerminosController {
    constructor(
        private readonly terminosService: TerminosService,
        private readonly alertasVencimiento: AlertasVencimientoTerminosService,
    ) { }

    /**
     * Evalúa el término recién creado/editado contra las reglas de alerta sin esperar a la
     * corrida horaria del cron. Va sin await (igual que las demás notificaciones del flujo)
     * para no demorar la respuesta al usuario.
     */
    private evaluarAlertasEnSegundoPlano(
        terminoId: string,
        opciones?: { rearmar?: 'personalizada' | 'todas' },
    ): void {
        this.alertasVencimiento.verificarTerminoInmediato(terminoId, opciones).catch(() => undefined);
    }


    @Post('manual')
    async createManual(@Body() body: any) {
        // Normalizar origenModulo: el frontend puede mandar 'DEFENSA_JUDICIAL' pero la BD
        // espera el código corto ('DEFENSA'). Mapeamos todos los posibles alias.
        const MODULO_MAP: Record<string, string> = {
            'DEFENSA_JUDICIAL': 'DEFENSA',
            'DEFENSA': 'DEFENSA',
            'JUZGAMIENTO': 'JUZGAMIENTO',
            'JUZGAMIENTO_DISCIPLINARIO': 'JUZGAMIENTO',
            'ASESORIA': 'ASESORIA',
            'ASESORIA_JURIDICA': 'ASESORIA',
            'ORGANOS_CONTROL': 'ORGANOS_CONTROL',
            'PROCESOS_COACTIVOS': 'PROCESOS_COACTIVOS',
            'MANUAL': 'MANUAL',
        };
        const origenModulo = MODULO_MAP[body.origenModulo] || body.origenModulo || 'MANUAL';

        // Limpiar campos UUID: strings vacías y el centinela "sin-asignar" del selector
        // de responsable deben ser null para evitar error de Postgres (columna uuid).
        const responsableId = body.responsableId && body.responsableId.trim() !== '' && body.responsableId !== 'sin-asignar' ? body.responsableId : null;
        const referenciaId  = body.referenciaId  && body.referenciaId.trim()  !== '' ? body.referenciaId  : null;

        const fechaBase = body.fechaBase ? parseFechaBogota(body.fechaBase, 'inicio') : new Date();
        const fechaVencimiento = body.fechaVencimiento ? parseFechaBogota(body.fechaVencimiento, 'fin') : null;

        let diasTermino = body.diasTermino || 0;
        if (fechaVencimiento && !diasTermino) {
            const diffTime = Math.abs(fechaVencimiento.getTime() - fechaBase.getTime());
            diasTermino = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }

        const creado = await this.terminosService.create({
            ...body,
            origenModulo,
            responsableId,
            referenciaId,
            fechaBase,
            fechaVencimiento,
            diasTermino,
            estado: body.estado || 'PENDIENTE',
            prioridad: body.prioridad || 'MEDIA',
            tipoDias: body.tipoDias || 'CALENDARIO'
        });

        this.evaluarAlertasEnSegundoPlano(creado.id);
        return creado;
    }

    @Post('sincronizar')
    async sincronizar() {
        return this.terminosService.sincronizar();
    }

    @Get(':id/documentos')
    async getDocumentos(@Param('id') id: string) {
        return this.terminosService.getDocumentos(id);
    }

    @Get('calendario')
    async getCalendario(
        @Query('start') start: string,
        @Query('end') end: string,
        @Query('responsableId') responsableId?: string,
        @Req() req?: any,
    ) {
        const access = getLegalAccessFromRequest(req);
        return this.terminosService.getCalendario(start, end, {
            responsableId: access.esResuelveSolo ? undefined : responsableId,
            responsableKeys: access.esResuelveSolo ? access.userKeys : undefined,
        });
    }

    @Get('listado')
    async getListado(
        @Query('responsableId') responsableId?: string,
        @Query('estado') estado?: string,
        @Req() req?: any,
    ) {
        const access = getLegalAccessFromRequest(req);
        return this.terminosService.getSemaforoList({
            responsableId: access.esResuelveSolo ? undefined : responsableId,
            responsableKeys: access.esResuelveSolo ? access.userKeys : undefined,
            estado,
        });
    }

    @Get('reportes/eficiencia')
    async getReporteEficiencia() {
        return this.terminosService.getReporteEficiencia();
    }

    @Get('reportes/carga')
    async getReporteCarga() {
        return this.terminosService.getReporteCarga();
    }

    @Get(':id')
    async getDetalle(@Param('id') id: string) {
        return this.terminosService.findOne(id);
    }

    @Patch(':id')
    async update(@Param('id') id: string, @Body() body: any) {
        // Cualquier cambio que mueva el "cuándo avisar" debe contrastarse de una contra la
        // fecha de vencimiento, en vez de esperar a la próxima corrida del cron:
        //   - la fecha de vencimiento en sí ⇒ plazo nuevo, se reevalúan TODOS los umbrales;
        //   - la anticipación personalizada ⇒ solo se reevalúa ese umbral propio.
        // Estos campos solo llegan cuando el usuario los edita explícitamente, así que su
        // sola presencia en el body basta como señal.
        const cambioFechaVencimiento = 'fechaVencimiento' in body;
        const configuroAlertaPersonalizada = 'horasAnticipacionAlertaPersonalizada' in body;
        const rearmar = cambioFechaVencimiento
            ? ('todas' as const)
            : configuroAlertaPersonalizada
                ? ('personalizada' as const)
                : undefined;
        // Limpiar UUIDs vacíos y el centinela "sin-asignar" para evitar error de Postgres
        if (body.responsableId !== undefined && (!body.responsableId || body.responsableId.trim() === '' || body.responsableId === 'sin-asignar')) {
            body.responsableId = null;
        }
        if (body.referenciaId !== undefined && (!body.referenciaId || body.referenciaId.trim() === '')) {
            body.referenciaId = null;
        }
        if (body.fechaVencimiento) {
            body.fechaVencimiento = parseFechaBogota(body.fechaVencimiento, 'fin');
        }
        if (body.fechaBase) {
            body.fechaBase = parseFechaBogota(body.fechaBase, 'inicio');
        }
        const actualizado = await this.terminosService.update(id, body);
        this.evaluarAlertasEnSegundoPlano(id, { rearmar });
        return actualizado;
    }

    @Delete(':id')
    async remove(@Param('id') id: string, @Query('permanente') permanente?: string) {
        return this.terminosService.remove(id, permanente === 'true');
    }

    @Get(':id/exportar/pdf')
    async exportarPDF(@Param('id') id: string, @Res() res: Response) {
        try {
            const pdfBuffer = await this.terminosService.generarPDF(id);
            res.set({
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="Termino_${id}_${new Date().getTime()}.pdf"`,
                'Content-Length': pdfBuffer.length
            });
            res.send(pdfBuffer);
        } catch (error) {
            console.error('Error generando PDF de término:', error);
            res.status(500).send('Error al generar el documento PDF');
        }
    }

    @Get(':id/notas')
    async getNotas(@Param('id') id: string, @Req() req?: any) {
        return this.terminosService.getNotas(id, getLegalAccessFromRequest(req));
    }

    @Post(':id/notas')
    async addNota(@Param('id') id: string, @Body() body: { texto: string; usuario?: string; usuarioId?: string }, @Req() req?: any) {
        const access = getLegalAccessFromRequest(req);
        return this.terminosService.addNota(id, body.texto, body.usuario || 'Sistema', access.userId || body.usuarioId);
    }

    @Post(':id/upload-documento')
    @UseInterceptors(FileInterceptor('file', {
        storage: diskStorage({
            destination: './uploads',
            filename: (req, file, cb) => {
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                const ext = extname(file.originalname);
                cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
            }
        })
    }))
    async uploadDocumento(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
        if (!file) throw new BadRequestException('No se adjuntó ningún archivo');
        return this.terminosService.addDocumentoLogico(id, file);
    }

    // Stub for documents - in a real scenario we would query the specific service based on origin
    @Get(':id/documentos-asociados')
    async getDocumentosAsociados(@Param('id') id: string) {
        // Logic to fetch documents from origin would go here
        // For now returning empty or mocked data to satisfy the endpoint requirement
        return [];
    }
}


