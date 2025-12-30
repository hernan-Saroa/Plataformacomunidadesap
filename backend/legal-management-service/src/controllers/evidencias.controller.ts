import { Controller, Get, Post, Patch, Delete, Param, Body, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { EvidenciasService } from '../services/evidencias.service';

@Controller('api/legal/evidencias')
export class EvidenciasController {
    constructor(private readonly evidenciasService: EvidenciasService) { }

    @Get('expediente/:expedienteId')
    async getEvidencias(@Param('expedienteId') expedienteId: string) {
        return this.evidenciasService.findAllByExpediente(expedienteId);
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

        // Get file extension from original filename
        const fileExt = file.originalname.split('.').pop()?.toLowerCase() || 'pdf';

        const evidenciaData = {
            descripcion: body.descripcion,
            aportadoPor: body.aportadoPor,
            tipo: body.tipo,
            prioridad: body.prioridad,
            estado: 'En Revisión',
            archivoNombre: body.nombre || file.originalname, // Use custom name or fallback to filename
            tipoArchivo: fileExt // Store the actual file extension
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
