import { Controller, Get, Post, Patch, Delete, Param, Body, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ActasService } from '../services/actas.service';

@Controller('api/legal/actas')
export class ActasController {
    constructor(private readonly actasService: ActasService) { }

    @Get('expediente/:expedienteId')
    async getActas(@Param('expedienteId') expedienteId: string) {
        return this.actasService.findAllByExpediente(expedienteId);
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
        @UploadedFile() file: Express.Multer.File
    ) {
        if (!file) throw new BadRequestException('El archivo es obligatorio');

        const actaData = {
            numeroActa: body.numeroActa, // e.g. "ACTA-AUD-001-2024"
            fecha: body.fecha,
            horario: body.horario,
            duracion: body.duracion,
            lugar: body.lugar,
            presidente: body.presidente,
            participantes: body.participantes,
            resumen: body.resumen,
            decisionesTomadas: body.decisionesTomadas,
            tipo: body.tipo, // "Audiencia Inicial"
            estado: 'Programada'
        };

        return this.actasService.create(expedienteId, actaData, file);
    }

    @Patch(':id/estado')
    async updateEstado(@Param('id') id: string, @Body('estado') estado: string) {
        return this.actasService.updateEstado(id, estado);
    }

    @Delete(':id')
    async deleteActa(@Param('id') id: string) {
        return this.actasService.delete(id);
    }
}
