import {
    Controller,
    Get,
    Post,
    Delete,
    Param,
    Query,
    Body,
    Res,
    HttpCode,
    HttpStatus,
    BadRequestException,
    UploadedFile,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { PlantillasService } from '../services/plantillas.service';
import type { Response } from 'express';

const WORD_MIME_TYPES = [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/msword', // .doc
];

@Controller('plantillas')
export class PlantillasController {
    constructor(private readonly plantillasService: PlantillasService) {}

    /**
     * Upload a Word template
     * POST /plantillas
     */
    @Post()
    @UseInterceptors(
        FileInterceptor('archivo', {
            storage: memoryStorage(),
            limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
        }),
    )
    async create(
        @UploadedFile() file: Express.Multer.File,
        @Body() body: any,
    ) {
        if (!file) throw new BadRequestException('Se requiere un archivo Word (.docx)');

        if (!WORD_MIME_TYPES.includes(file.mimetype) && !file.originalname.match(/\.(docx?|doc)$/i)) {
            throw new BadRequestException('Solo se permiten archivos Word (.doc, .docx)');
        }

        const { categoria, nombre, subidoPor } = body;
        if (!categoria) throw new BadRequestException('El campo categoria es requerido');

        const contenidoBase64 = file.buffer.toString('base64');

        return this.plantillasService.create({
            nombre: nombre || file.originalname,
            categoria,
            nombreOriginal: file.originalname,
            mimeType: file.mimetype,
            tamano: file.size,
            contenidoBase64,
            subidoPor: subidoPor || undefined,
        });
    }

    /**
     * List templates, optionally filtered by categoria
     * GET /plantillas?categoria=actas
     */
    @Get()
    async findAll(@Query('categoria') categoria?: string) {
        return this.plantillasService.findAll(categoria);
    }

    /**
     * Download a template file
     * GET /plantillas/:id/download
     */
    @Get(':id/download')
    async download(@Param('id') id: string, @Res() res: Response) {
        const plantilla = await this.plantillasService.findOne(id);

        const buffer = Buffer.from(plantilla.contenidoBase64, 'base64');
        const ext = plantilla.nombreOriginal.split('.').pop() || 'docx';
        const filename = encodeURIComponent(plantilla.nombreOriginal);

        res.set({
            'Content-Type': plantilla.mimeType || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'Content-Disposition': `attachment; filename*=UTF-8''${filename}; filename="${filename}"`,
            'Content-Length': buffer.length.toString(),
        });

        res.end(buffer);
    }

    /**
     * Delete a template
     * DELETE /plantillas/:id
     */
    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async delete(@Param('id') id: string) {
        await this.plantillasService.delete(id);
    }
}
