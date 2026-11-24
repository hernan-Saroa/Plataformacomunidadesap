import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Res, HttpStatus, Req, UploadedFiles, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import type { Response } from 'express';
import { RiesgosService } from '../services/riesgos.service';
import { RiesgoSeguimientosService, type ArchivoSubido, type QuienRegistra } from '../services/riesgo-seguimientos.service';
import { getLegalAccessFromRequest } from '../auth/legal-access';
import { Riesgo } from '../entities/riesgo.entity';
import type { EtapaRiesgo, ZonaRiesgo } from '../entities/riesgo.entity';

const MAX_EVIDENCIAS = 10;

// El tamaño y el tipo se validan en el servicio con el límite parametrizable (system_configurations);
// aquí solo se fija un techo duro para no aceptar cargas desproporcionadas.
const EVIDENCIAS_STORAGE = {
    storage: diskStorage({
        destination: './uploads',
        filename: (_req, file, cb) => {
            const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
            cb(null, `${randomName}${extname(file.originalname)}`);
        },
    }),
    limits: { fileSize: 200 * 1024 * 1024 },
};

@Controller('riesgos')
export class RiesgosController {
    constructor(
        private readonly riesgosService: RiesgosService,
        private readonly seguimientosService: RiesgoSeguimientosService,
    ) { }

    // ============================================
    // CRUD
    // ============================================
    @Get()
    async findAll(@Req() req?: any): Promise<Riesgo[]> {
        const access = getLegalAccessFromRequest(req);
        return this.riesgosService.findAll({
            asignadoKeys: access.esResuelveSolo ? access.userKeys : undefined,
        });
    }

    @Get('estadisticas')
    async getEstadisticas() {
        return this.riesgosService.getEstadisticas();
    }

    @Get('export/contabilidad')
    async getReporteContabilidad(@Res() res: Response) {
        try {
            const pdfBuffer = await this.riesgosService.generarReporteContabilidadPDF();

            res.set({
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="Reporte_Contabilidad_Riesgos_${new Date().getTime()}.pdf"`,
                'Content-Length': pdfBuffer.length
            });

            res.send(pdfBuffer);
        } catch (error) {
            console.error('Error generando reporte PDF:', error);
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Error generando reporte' });
        }
    }

    @Patch(':id/provision')
    async actualizarProvision(
        @Param('id') id: string,
        @Body('cuantiaEstimada') cuantiaEstimada: number
    ) {
        return this.riesgosService.actualizarProvision(id, cuantiaEstimada);
    }

    @Get(':id')
    async findOne(@Param('id') id: string): Promise<Riesgo> {
        return this.riesgosService.findOne(id);
    }

    @Post()
    async create(@Body() body: Partial<Riesgo>): Promise<Riesgo> {
        return this.riesgosService.create(body);
    }

    @Patch(':id')
    async update(@Param('id') id: string, @Body() body: Partial<Riesgo>): Promise<Riesgo> {
        return this.riesgosService.update(id, body);
    }

    @Delete(':id')
    async delete(@Param('id') id: string): Promise<void> {
        return this.riesgosService.delete(id);
    }

    // ============================================
    // OPERACIONES ESPECÍFICAS
    // ============================================
    @Patch(':id/etapa')
    async cambiarEtapa(
        @Param('id') id: string,
        @Body('etapa') etapa: string
    ): Promise<Riesgo> {
        return this.riesgosService.cambiarEtapa(id, etapa as EtapaRiesgo);
    }

    @Patch(':id/archivar')
    async archivar(
        @Param('id') id: string,
        @Body('motivo') motivo?: string
    ): Promise<Riesgo> {
        return this.riesgosService.archivar(id, motivo);
    }

    @Get('archivados/all')
    async findArchived(): Promise<Riesgo[]> {
        return this.riesgosService.findArchived();
    }

    @Patch(':id/restaurar')
    async restaurar(@Param('id') id: string): Promise<Riesgo> {
        return this.riesgosService.restaurar(id);
    }

    @Patch(':id/eliminar')
    async marcarEliminado(
        @Param('id') id: string,
        @Body('motivo') motivo?: string
    ): Promise<Riesgo> {
        return this.riesgosService.marcarEliminado(id, motivo);
    }

    @Delete(':id/permanente')
    async eliminarPermanente(@Param('id') id: string): Promise<void> {
        return this.riesgosService.eliminarPermanente(id);
    }

    // ============================================
    // FILTROS
    // ============================================
    @Get('por-proceso/:proceso')
    async findByProceso(@Param('proceso') proceso: string): Promise<Riesgo[]> {
        return this.riesgosService.findByProceso(proceso);
    }

    @Get('por-zona/:zona')
    async findByZona(@Param('zona') zona: string): Promise<Riesgo[]> {
        return this.riesgosService.findByZona(zona as ZonaRiesgo);
    }

    @Get(':id/historial')
    async getHistorial(@Param('id') id: string) {
        return this.riesgosService.getHistorial(id);
    }

    // ============================================
    // SEGUIMIENTO CUATRIMESTRAL DE CONTROLES (EFDS-2416)
    // ============================================
    @Get(':id/seguimientos')
    async getSeguimientos(@Param('id') id: string, @Query('vigencia') vigencia?: string) {
        const anio = vigencia ? Number(vigencia) : undefined;
        if (vigencia && !Number.isInteger(anio)) throw new BadRequestException('La vigencia debe ser un año');
        return this.seguimientosService.listar(id, anio);
    }

    @Post(':id/controles/:controlId/seguimientos')
    @UseInterceptors(FilesInterceptor('evidencias', MAX_EVIDENCIAS, EVIDENCIAS_STORAGE))
    async crearSeguimiento(
        @Param('id') id: string,
        @Param('controlId') controlId: string,
        @Body() body: Record<string, unknown>,
        @UploadedFiles() files: Express.Multer.File[] = [],
        @Req() req?: any,
    ) {
        return this.seguimientosService.crear(id, controlId, body, this.aArchivos(files), this.quienRegistra(req));
    }

    @Patch(':id/seguimientos/:seguimientoId')
    @UseInterceptors(FilesInterceptor('evidencias', MAX_EVIDENCIAS, EVIDENCIAS_STORAGE))
    async actualizarSeguimiento(
        @Param('id') id: string,
        @Param('seguimientoId') seguimientoId: string,
        @Body() body: Record<string, unknown>,
        @UploadedFiles() files: Express.Multer.File[] = [],
        @Req() req?: any,
    ) {
        const archivos = this.aArchivos(files);
        let conservar: string[] | null = null;
        if (typeof body.evidenciasConservar === 'string') {
            try {
                const parsed = JSON.parse(body.evidenciasConservar);
                if (Array.isArray(parsed)) conservar = parsed.map(String);
            } catch {
                throw new BadRequestException('evidenciasConservar debe ser un arreglo JSON');
            }
        }
        return this.seguimientosService.actualizar(id, seguimientoId, body, archivos, conservar, this.quienRegistra(req));
    }

    private aArchivos(files: Express.Multer.File[] = []): ArchivoSubido[] {
        return files.map(f => ({ originalname: f.originalname, filename: f.filename, size: f.size }));
    }

    private quienRegistra(req?: any): QuienRegistra {
        const access = getLegalAccessFromRequest(req);
        return { userId: access.userId, userName: access.userName };
    }
}
