import { Controller, Get, Post, Patch, Delete, Param, Body, UploadedFile, UseInterceptors, BadRequestException, Res } from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ActasService } from '../services/actas.service';

@Controller('actas')
export class ActasController {
    constructor(private readonly actasService: ActasService) { }

    // Specific routes first
    @Get('expediente/:expedienteId')
    async getActas(@Param('expedienteId') expedienteId: string) {
        return this.actasService.findAllByExpediente(expedienteId);
    }

    @Get('expediente/:expedienteId/download-zip')
    async descargarZip(@Param('expedienteId') expedienteId: string, @Res() res: Response) {
        try {
            const actas = await this.actasService.findAllByExpediente(expedienteId);

            // Filter only actas with files (firmadas)
            const actasConArchivo = actas.filter(a => a.archivoUrl);

            if (!actasConArchivo || actasConArchivo.length === 0) {
                res.status(404).json({ message: 'No hay actas firmadas para descargar' });
                return;
            }

            const archiver = require('archiver');
            const path = require('path');
            const fs = require('fs');

            res.set({
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename=Actas_${expedienteId.replace(/[^a-zA-Z0-9]/g, '_')}.zip`,
            });

            const archive = archiver('zip', { zlib: { level: 9 } });

            archive.on('error', (err: Error) => {
                console.error('Error en archiver:', err);
                res.status(500).json({ message: 'Error al crear el archivo ZIP' });
            });

            archive.pipe(res);

            for (const acta of actasConArchivo) {
                if (acta.archivoUrl) {
                    let filename: string;

                    // Extraer el nombre del archivo de diferentes formatos de URL
                    if (acta.archivoUrl.includes('/files/')) {
                        filename = acta.archivoUrl.split('/files/').pop() || '';
                    } else if (acta.archivoUrl.startsWith('files/')) {
                        filename = acta.archivoUrl.replace('files/', '');
                    } else {
                        filename = path.basename(acta.archivoUrl);
                    }

                    const filePath = path.join(process.cwd(), 'uploads', filename);

                    if (fs.existsSync(filePath)) {
                        // Obtener la extensión del archivo real
                        const fileExt = path.extname(filename);
                        // Usar el nombre personalizado pero asegurar que tenga la extensión correcta
                        let displayName = acta.archivoNombre || `acta_${acta.numeroActa || acta.id}${fileExt}`;

                        // Si displayName no tiene extensión, agregar la del archivo real
                        if (!path.extname(displayName)) {
                            displayName = displayName + fileExt;
                        }

                        archive.file(filePath, { name: displayName });
                        console.log(`[ZIP-Actas] Añadiendo: ${filePath} como ${displayName}`);
                    } else {
                        console.log(`[ZIP-Actas] Archivo no encontrado: ${filePath}`);
                    }
                }
            }

            await archive.finalize();

        } catch (error) {
            console.error('Error generando ZIP de actas:', error);
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
    async createActa(
        @Param('expedienteId') expedienteId: string,
        @Body() body: any,
        @UploadedFile() file?: Express.Multer.File
    ) {
        // File is now optional - acta can be created without it
        const actaData = {
            numeroActa: body.numeroActa,
            fecha: body.fecha,
            horario: body.horario,
            duracion: body.duracion,
            lugar: body.lugar,
            presidente: body.presidente,
            participantes: body.participantes,
            resumen: body.resumen,
            decisionesTomadas: body.decisionesTomadas,
            tipo: body.tipo,
            estado: file ? (body.estado || 'Firmada') : 'Programada' // If file uploaded, it's signed
        };

        return this.actasService.create(expedienteId, actaData, file);
    }

    @Patch(':id/estado')
    async updateEstado(@Param('id') id: string, @Body('estado') estado: string) {
        return this.actasService.updateEstado(id, estado);
    }

    @Patch(':id/archivo')
    @UseInterceptors(FileInterceptor('file', {
        storage: diskStorage({
            destination: './uploads',
            filename: (req, file, cb) => {
                const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
                cb(null, `${randomName}${extname(file.originalname)}`);
            }
        })
    }))
    async uploadArchivo(
        @Param('id') id: string,
        @UploadedFile() file: Express.Multer.File
    ) {
        if (!file) throw new BadRequestException('El archivo es obligatorio');
        return this.actasService.uploadArchivo(id, file);
    }

    @Delete(':id')
    async deleteActa(@Param('id') id: string) {
        return this.actasService.delete(id);
    }
}


