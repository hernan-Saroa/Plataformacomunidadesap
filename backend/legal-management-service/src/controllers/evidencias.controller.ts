import { Controller, Get, Post, Patch, Delete, Param, Body, UploadedFile, UseInterceptors, BadRequestException, Res } from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { EvidenciasService } from '../services/evidencias.service';

@Controller('legal/evidencias')
export class EvidenciasController {
    constructor(private readonly evidenciasService: EvidenciasService) { }

    // Specific routes first
    @Get('expediente/:expedienteId')
    async getEvidencias(@Param('expedienteId') expedienteId: string) {
        return this.evidenciasService.findAllByExpediente(expedienteId);
    }

    @Get('expediente/:expedienteId/download-zip')
    async descargarZip(@Param('expedienteId') expedienteId: string, @Res() res: Response) {
        try {
            const evidencias = await this.evidenciasService.findAllByExpediente(expedienteId);

            if (!evidencias || evidencias.length === 0) {
                res.status(404).json({ message: 'No hay evidencias para descargar' });
                return;
            }

            const archiver = require('archiver');
            const path = require('path');
            const fs = require('fs');

            res.set({
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename=evidencias_${expedienteId.replace(/[^a-zA-Z0-9]/g, '_')}.zip`,
            });

            const archive = archiver('zip', { zlib: { level: 9 } });

            archive.on('error', (err: Error) => {
                console.error('Error en archiver:', err);
                res.status(500).json({ message: 'Error al crear el archivo ZIP' });
            });

            archive.pipe(res);

            for (const ev of evidencias) {
                if (ev.archivoUrl) {
                    let filePath: string;
                    if (ev.archivoUrl.includes('/legal/files/')) {
                        const filename = ev.archivoUrl.split('/legal/files/').pop();
                        filePath = path.join(process.cwd(), 'uploads', filename);
                    } else {
                        filePath = path.join(process.cwd(), 'uploads', ev.archivoUrl);
                    }

                    if (fs.existsSync(filePath)) {
                        const fileName = ev.archivoNombre || path.basename(filePath);
                        archive.file(filePath, { name: fileName });
                    }
                }
            }

            await archive.finalize();

        } catch (error) {
            console.error('Error generando ZIP de evidencias:', error);
            res.status(500).json({ message: 'Error al generar el archivo ZIP' });
        }
    }

    @Post(':expedienteId')
    @UseInterceptors(FileInterceptor('file', {
        storage: diskStorage({
            destination: './uploads',
            filename: (req, file, cb) => {
                const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
                cb(null, `${randomName}${extname(file.originalname)}`);
            }
        })
    }))
    async createEvidencia(
        @Param('expedienteId') expedienteId: string,
        @Body() body: any,
        @UploadedFile() file: Express.Multer.File
    ) {
        if (!file) throw new BadRequestException('El archivo es obligatorio');

        const fileExt = file.originalname.split('.').pop()?.toLowerCase() || 'pdf';

        const evidenciaData = {
            descripcion: body.descripcion,
            aportadoPor: body.aportadoPor,
            tipo: body.tipo,
            prioridad: body.prioridad,
            estado: 'En Revisión',
            archivoNombre: body.nombre || file.originalname,
            tipoArchivo: fileExt
        };

        return this.evidenciasService.create(expedienteId, evidenciaData, file);
    }

    @Patch(':id/estado')
    async updateEstado(@Param('id') id: string, @Body('estado') estado: string) {
        return this.evidenciasService.updateEstado(id, estado);
    }

    @Delete(':id')
    async deleteEvidencia(@Param('id') id: string) {
        return this.evidenciasService.delete(id);
    }
}

