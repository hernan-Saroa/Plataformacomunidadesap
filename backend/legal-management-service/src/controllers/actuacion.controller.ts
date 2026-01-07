import { Controller, Get, Post, Body, Param, NotFoundException, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ActuacionService } from '../services/actuacion.service';
import { Actuacion } from '../entities/actuacion.entity';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('legal/expedientes/:id/actuaciones')
export class ActuacionController {
    constructor(private readonly actuacionService: ActuacionService) { }

    @Get()
    async listar(@Param('id') id: string): Promise<Actuacion[]> {
        return this.actuacionService.listarPorExpediente(id);
    }

    @Post()
    @UseInterceptors(FileInterceptor('file', {
        storage: diskStorage({
            destination: './uploads',
            filename: (req, file, cb) => {
                const randomName = Array.from(Array(32)).map(() => Math.round(Math.random() * 16).toString(16)).join('');
                return cb(null, `${randomName}${extname(file.originalname)}`);
            }
        })
    }))
    async registrar(
        @Param('id') id: string,
        @Body() body: any,
        @UploadedFile() file?: any
    ): Promise<Actuacion> {
        const data: Partial<Actuacion> = {
            ...body,
            documentoUrl: file ? `/uploads/${file.filename}` : undefined,
            documentoNombre: file ? file.originalname : undefined
        };
        console.log('ActuacionController.registrar payload:', { id, body, file: file ? file.originalname : 'no-file', data });
        return this.actuacionService.registrarActuacion(id, data);
    }
}

