import {
    Controller,
    Get,
    Post,
    Delete,
    Param,
    Body,
    Query,
    Res,
    UploadedFiles,
    UseInterceptors,
    HttpCode,
    HttpStatus,
    BadRequestException
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { OficiosService, CreateOficioDto } from '../services/oficios.service';
import type { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

@Controller('oficios')
export class OficiosController {
    constructor(private readonly oficiosService: OficiosService) { }

    /**
     * Create and optionally send an oficio
     * POST /oficios
     */
    @Post()
    @UseInterceptors(FilesInterceptor('archivos', 5, {
        storage: diskStorage({
            destination: './uploads',
            filename: (req, file, cb) => {
                const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
                cb(null, `oficio_${randomName}${extname(file.originalname)}`);
            }
        }),
        limits: { fileSize: 10 * 1024 * 1024 } // 10MB per file
    }))
    async create(
        @Body() body: any,
        @UploadedFiles() files: Express.Multer.File[]
    ) {
        // Parse body (FormData comes as strings)
        const dto: CreateOficioDto = {
            numero: body.numero,
            expedienteId: body.expedienteId,
            modulo: body.modulo,
            asunto: body.asunto,
            destinatario: body.destinatario,
            destinatarioEmail: body.destinatarioEmail,
            contenido: body.contenido,
            contenidoHtml: body.contenidoHtml,
            firma: body.firma,
            plantilla: body.plantilla,
            enviar: body.enviar === 'true' || body.enviar === true
        };

        if (!dto.numero || !dto.expedienteId || !dto.asunto || !dto.destinatario || !dto.contenido) {
            throw new BadRequestException('Campos requeridos: numero, expedienteId, asunto, destinatario, contenido');
        }

        return this.oficiosService.create(dto, files);
    }

    /**
     * Get oficios by expediente
     * GET /oficios/expediente/:expedienteId
     */
    @Get('expediente/:expedienteId')
    async getByExpediente(
        @Param('expedienteId') expedienteId: string,
        @Query('modulo') modulo?: string
    ) {
        return this.oficiosService.findByExpediente(expedienteId, modulo);
    }

    /**
     * Download all oficios as ZIP
     * GET /oficios/expediente/:expedienteId/download-zip
     */
    @Get('expediente/:expedienteId/download-zip')
    async downloadZip(
        @Param('expedienteId') expedienteId: string,
        @Query('modulo') modulo: string,
        @Res() res: Response
    ) {
        try {
            const oficios = await this.oficiosService.getOficiosForZip(expedienteId, modulo);

            if (!oficios || oficios.length === 0) {
                res.status(404).json({ message: 'No hay oficios con archivos para descargar' });
                return;
            }

            const archiver = require('archiver');

            res.set({
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename=Oficios_${expedienteId.replace(/[^a-zA-Z0-9]/g, '_')}.zip`,
            });

            const archive = archiver('zip', { zlib: { level: 9 } });

            archive.on('error', (err: Error) => {
                console.error('Error en archiver:', err);
                if (!res.headersSent) {
                    res.status(500).json({ message: 'Error al crear el archivo ZIP' });
                }
            });

            archive.pipe(res);

            // Add oficio documents to archive
            for (const oficio of oficios) {
                if (oficio.archivosAdjuntos && oficio.archivosAdjuntos.length > 0) {
                    for (const adjunto of oficio.archivosAdjuntos) {
                        let filePath: string;

                        // Handle different URL formats
                        if (adjunto.url.includes('/legal/files/')) {
                            const filename = adjunto.url.split('/legal/files/').pop() || '';
                            filePath = path.join(process.cwd(), 'uploads', filename);
                        } else {
                            filePath = path.join(process.cwd(), 'uploads', path.basename(adjunto.url));
                        }

                        if (fs.existsSync(filePath)) {
                            const fileName = `${oficio.numero}_${adjunto.nombre}`;
                            archive.file(filePath, { name: fileName });
                        }
                    }
                }
            }

            await archive.finalize();

        } catch (error) {
            console.error('Error generando ZIP de oficios:', error);
            if (!res.headersSent) {
                res.status(500).json({ message: 'Error al generar el archivo ZIP' });
            }
        }
    }

    /**
     * Get single oficio
     * GET /oficios/:id
     */
    @Get(':id')
    async getById(@Param('id') id: string) {
        return this.oficiosService.findOne(id);
    }

    /**
     * Delete oficio
     * DELETE /oficios/:id
     */
    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async delete(@Param('id') id: string) {
        await this.oficiosService.delete(id);
    }
}
