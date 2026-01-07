import { Controller, Get, Post, Patch, Delete, Param, Body, UploadedFile, UseInterceptors, Res, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { AutosService } from '../services/autos.service';
import type { Response } from 'express';

@Controller('legal/autos')
export class AutosController {
    constructor(private readonly autosService: AutosService) { }

    @Get('expediente/:radicado/download-zip')
    async downloadAll(@Param('radicado') radicado: string, @Res() res: Response) {
        try {
            const autos = await this.autosService.findAllByExpediente(radicado);
            const autosConArchivo = autos.filter(a => a.archivoUrl);

            if (!autosConArchivo || autosConArchivo.length === 0) {
                res.status(404).json({ message: 'No hay autos con archivos para descargar' });
                return;
            }

            const archiver = require('archiver');
            const path = require('path');
            const fs = require('fs');

            res.set({
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename=autos_${radicado.replace(/[^a-zA-Z0-9]/g, '_')}.zip`,
            });

            const archive = archiver('zip', { zlib: { level: 9 } });

            archive.on('error', (err: Error) => {
                console.error('Error en archiver:', err);
                if (!res.headersSent) {
                    res.status(500).json({ message: 'Error al crear el archivo ZIP' });
                }
            });

            archive.pipe(res);

            for (const auto of autosConArchivo) {
                if (auto.archivoUrl) {
                    let filePath: string;
                    // Handle different URL formats
                    if (auto.archivoUrl.includes('/legal/files/')) {
                        const filename = auto.archivoUrl.split('/legal/files/').pop();
                        filePath = path.join(process.cwd(), 'uploads', filename);
                    } else {
                        // Assume it might be a direct filename or relative path
                        filePath = path.join(process.cwd(), 'uploads', path.basename(auto.archivoUrl));
                    }

                    if (fs.existsSync(filePath)) {
                        const fileName = auto.archivoNombre || `auto_${auto.numero}_${auto.id.substring(0, 8)}.pdf`;
                        archive.file(filePath, { name: fileName });
                    }
                }
            }

            await archive.finalize();

        } catch (error) {
            console.error('Error generando ZIP de autos:', error);
            if (!res.headersSent) {
                res.status(500).json({ message: 'Error al generar el archivo ZIP' });
            }
        }
    }

    @Get('expediente/:radicado')
    async getAutos(@Param('radicado') radicado: string) {
        return this.autosService.findAllByExpediente(radicado);
    }

    @Post(':radicado')
    @UseInterceptors(FileInterceptor('file', {
        storage: diskStorage({
            destination: './uploads',
            filename: (req, file, cb) => {
                const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
                cb(null, `${randomName}${extname(file.originalname)}`);
            }
        })
    }))
    async createAuto(
        @Param('radicado') radicado: string,
        @Body() body: any,
        @UploadedFile() file: Express.Multer.File
    ) {
        if (!file) throw new BadRequestException('El archivo del auto es obligatorio');

        // Body comes as strings from FormData, basic parsing might be needed for non-string types
        const autoData = {
            tipo: body.tipo,
            numero: body.numero,
            fechaAuto: new Date(body.fechaAuto),
            juzgado: body.juzgado,
            resumen: body.resumen,
            estado: 'Pendiente'
        };

        return this.autosService.create(radicado, autoData, file);
    }

    @Patch(':id/estado')
    async updateEstado(@Param('id') id: string, @Body('estado') estado: string) {
        return this.autosService.updateEstado(id, estado);
    }

    @Delete(':id')
    async deleteAuto(@Param('id') id: string) {
        return this.autosService.delete(id);
    }


}

