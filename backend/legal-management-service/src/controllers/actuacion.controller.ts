import { Controller, Get, Post, Body, Param, NotFoundException, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActuacionService } from '../services/actuacion.service';
import { Actuacion } from '../entities/actuacion.entity';
import { Expediente } from '../entities/expediente.entity';
import { LegalNotificationsService } from '../services/legal-notifications.service';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';

@Controller('expedientes/:id/actuaciones')
export class ActuacionController {
    constructor(
        private readonly actuacionService: ActuacionService,
        private readonly legalNotifications: LegalNotificationsService,
        @InjectRepository(Expediente)
        private readonly expedienteRepository: Repository<Expediente>,
    ) { }

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
        limits: { fileSize: 60 * 1024 * 1024 },
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

        const result = await this.actuacionService.registrarActuacion(id, data);

        if (file) {
            const expediente = await this.expedienteRepository.findOne({ where: { id } });
            if (expediente) {
                let modulo: 'DEFENSA_JUDICIAL' | 'JUZGAMIENTO_DISCIPLINARIO';
                if (body.modulo === 'DEFENSA_JUDICIAL' || body.modulo === 'JUZGAMIENTO_DISCIPLINARIO') {
                    modulo = body.modulo;
                } else {
                    const radicado = (expediente.radicado || '').toUpperCase();
                    const esDisciplinario =
                        expediente.jurisdiccion === 'DISCIPLINARIO' ||
                        expediente.jurisdiccion === 'Disciplinaria' ||
                        expediente.tipoProceso === 'DISCIPLINARIO' ||
                        expediente.tipoProceso === 'Disciplinario' ||
                        radicado.startsWith('PD-');
                    modulo = esDisciplinario ? 'JUZGAMIENTO_DISCIPLINARIO' : 'DEFENSA_JUDICIAL';
                }
                await this.legalNotifications.notifyDocumentoSubido({
                    modulo,
                    radicado: expediente.radicado,
                    procesoId: expediente.id,
                    nombreDocumento: file.originalname,
                    subidoPor: body.subidoPor || body.responsable || body.usuario || 'Sistema',
                });
            }
        }

        return result;
    }
}


