
import { Controller, Get, Param, Res, NotFoundException } from '@nestjs/common';
import type { Response } from 'express';
import { join, extname } from 'path';
import { existsSync, createReadStream } from 'fs';

@Controller('api/legal/files')
export class FilesController {
    @Get(':filename')
    getFile(@Param('filename') filename: string, @Res() res: Response) {
        const path = join(process.cwd(), 'uploads', filename);

        if (!existsSync(path)) {
            throw new NotFoundException('Archivo no encontrado');
        }

        // Use sendFile to handle mime types and content-disposition automatically
        res.sendFile(path);
    }

    @Get('download/:filename')
    downloadFile(@Param('filename') filename: string, @Res() res: Response) {
        const path = join(process.cwd(), 'uploads', filename);

        if (!existsSync(path)) {
            throw new NotFoundException('Archivo no encontrado');
        }

        // Forzar descarga con Content-Disposition: attachment
        res.download(path, filename, (err) => {
            if (err) {
                console.error('Error en descarga:', err);
            }
        });
    }
}
