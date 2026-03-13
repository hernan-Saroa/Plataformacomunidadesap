
import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Res, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import type { Response } from 'express';
import { TerminosService } from '../services/terminos.service';

@Controller('terminos')
export class TerminosController {
    constructor(private readonly terminosService: TerminosService) { }


    @Post('manual')
    async createManual(@Body() body: any) {
        // Defaults for manual creation
        const fechaBase = body.fechaBase ? new Date(body.fechaBase) : new Date();
        const fechaVencimiento = body.fechaVencimiento ? new Date(body.fechaVencimiento) : null;

        // Calculate days if dates exist
        let diasTermino = body.diasTermino || 0;
        if (fechaVencimiento && !diasTermino) {
            const diffTime = Math.abs(fechaVencimiento.getTime() - fechaBase.getTime());
            diasTermino = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }

        return this.terminosService.create({
            ...body,
            origenModulo: body.origenModulo || 'MANUAL',
            fechaBase,
            fechaVencimiento,
            diasTermino,
            estado: body.estado || 'PENDIENTE',
            prioridad: body.prioridad || 'MEDIA',
            tipoDias: body.tipoDias || 'CALENDARIO'
        });
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
        @Query('responsableId') responsableId?: string
    ) {
        return this.terminosService.getCalendario(start, end, responsableId);
    }

    @Get('listado')
    async getListado(@Query('responsableId') responsableId?: string) {
        return this.terminosService.getSemaforoList(responsableId);
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
        return this.terminosService.update(id, body);
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        return this.terminosService.remove(id);
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


