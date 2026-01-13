
import { Controller, Get, Param, Res, NotFoundException, Query } from '@nestjs/common';
import type { Response } from 'express';
import { join, extname } from 'path';
import { existsSync, createReadStream } from 'fs';

@Controller('files')
export class FilesController {
    @Get(':filename')
    getFile(@Param('filename') filename: string, @Res() res: Response) {
        const path = join(process.cwd(), 'uploads', filename);

        if (!existsSync(path)) {
            throw new NotFoundException('Archivo no encontrado');
        }

        // Forzar mime type correcto si es PDF
        if (filename.toLowerCase().endsWith('.pdf')) {
            res.setHeader('Content-Type', 'application/pdf');
        }
        res.sendFile(path);
    }

    @Get('download/:filename')
    downloadFile(
        @Param('filename') filename: string,
        @Query('name') originalName: string,
        @Res() res: Response
    ) {
        const path = join(process.cwd(), 'uploads', filename);

        if (!existsSync(path)) {
            throw new NotFoundException('Archivo no encontrado');
        }

        // Usar nombre original si se proporciona, sino el nombre del archivo
        const downloadName = originalName || filename;

        // Forzar descarga con Content-Disposition: attachment
        res.download(path, downloadName, (err) => {
            if (err) {
                console.error('Error en descarga:', err);
            }
        });
    }
}
