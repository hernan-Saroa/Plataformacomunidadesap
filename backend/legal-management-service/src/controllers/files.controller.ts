
import { Controller, Get, Param, Res, NotFoundException } from '@nestjs/common';
import type { Response } from 'express';
import { join } from 'path';
import { existsSync, createReadStream } from 'fs';

@Controller('api/legal/files')
export class FilesController {
    @Get(':filename')
    getFile(@Param('filename') filename: string, @Res() res: Response) {
        const path = join(process.cwd(), 'uploads', filename);

        if (!existsSync(path)) {
            throw new NotFoundException('Archivo no encontrado');
        }

        const file = createReadStream(path);
        file.pipe(res);
    }
}
