import { Controller, Get, Post, Patch, Delete, Param, Body, UploadedFile, UseInterceptors, BadRequestException, Res } from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { EvidenciasService } from '../services/evidencias.service';

@Controller('evidencias')
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
                'Content-Disposition': `attachment; filename=Evidencias_${expedienteId.replace(/[^a-zA-Z0-9]/g, '_')}.zip`,
            });

            const archive = archiver('zip', { zlib: { level: 9 } });

            archive.on('error', (err: Error) => {
                console.error('Error en archiver:', err);
                res.status(500).json({ message: 'Error al crear el archivo ZIP' });
            });

            archive.pipe(res);

            for (const ev of evidencias) {
                console.log(`[ZIP] Procesando evidencia ID: ${ev.id}`);
                console.log(`[ZIP] archivoUrl: "${ev.archivoUrl}"`);
                console.log(`[ZIP] archivoNombre: "${ev.archivoNombre}"`);

                if (ev.archivoUrl) {
                    let filename: string;

                    // Extraer el nombre del archivo de diferentes formatos de URL
                    if (ev.archivoUrl.includes('/files/')) {
                        filename = ev.archivoUrl.split('/files/').pop() || '';
                    } else if (ev.archivoUrl.startsWith('files/')) {
                        filename = ev.archivoUrl.replace('files/', '');
                    } else {
                        filename = path.basename(ev.archivoUrl);
                    }

                    console.log(`[ZIP] Filename extraído: "${filename}"`);

                    const filePath = path.join(process.cwd(), 'uploads', filename);
                    console.log(`[ZIP] Path completo: "${filePath}"`);

                    if (fs.existsSync(filePath)) {
                        // Obtener la extensión del archivo real
                        const fileExt = path.extname(filename);
                        // Usar el nombre personalizado pero asegurar que tenga la extensión correcta
                        let displayName = ev.archivoNombre || filename;
                        // Si displayName no tiene extensión, agregar la del archivo real
                        if (!path.extname(displayName)) {
                            displayName = displayName + fileExt;
                        }
                        archive.file(filePath, { name: displayName });
                        console.log(`[ZIP] ✅ Añadiendo archivo: ${filePath} como "${displayName}"`);
                    } else {
                        console.log(`[ZIP] ❌ Archivo NO encontrado: ${filePath}`);
                    }
                } else {
                    console.log(`[ZIP] ⚠️ Evidencia sin archivoUrl`);
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
            estado: 'Pendiente',
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



