import { Controller, Get, Post, Body, Param, NotFoundException, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ActuacionService } from '../services/actuacion.service';
import { Actuacion } from '../entities/actuacion.entity';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';

@Controller('expedientes/:id/actuaciones')
export class ActuacionController {
    constructor(private readonly actuacionService: ActuacionService) { }

    @Get()
    async listar(@Param('id') id: string): Promise<Actuacion[]> {
        return this.actuacionService.listarPorExpediente(id);
    }

    @Post()
    @UseInterceptors(FileInterceptor('file', {
        storage: diskStorage({
            destination: (req, file, cb) => {
                const dir = './uploads';
                if (!existsSync(dir)) {
                    mkdirSync(dir, { recursive: true });
                }
                cb(null, dir);
            },
            filename: (req, file, cb) => {
                const randomName = Array.from(Array(32)).map(() => Math.round(Math.random() * 16).toString(16)).join('');
                return cb(null, `${randomName}${extname(file.originalname)}`);
            }
        }),
        fileFilter: (req, file, cb) => {
            if (file.mimetype !== 'application/pdf') {
                return cb(new BadRequestException('Solo se permiten archivos PDF'), false);
            }
            cb(null, true);
        }
    }))
    async registrar(
        @Param('id') id: string,
        @Body() body: any,
        @UploadedFile() file?: any
    ): Promise<Actuacion> {
        console.log('--- NUEVA ACTUACION ---');
        console.log('ID Expediente:', id);
        console.log('Body recibido:', body);
        console.log('Archivo recibido:', file);
        
        const data: Partial<Actuacion> = {
            ...body,
            usuarioResponsable: body.responsable || 'Sistema',
            metadata: {
                ...body.metadata,
                estado: body.estado || 'Registrado',
                observaciones: body.observaciones || ''
            },
            documentoUrl: file ? `/uploads/${file.filename}` : undefined,
            documentoNombre: file ? file.originalname : undefined
        };

        return this.actuacionService.registrarActuacion(id, data);
    }
}


