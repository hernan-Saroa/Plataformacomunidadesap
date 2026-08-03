import { Controller, Get, Post, Body, Param, NotFoundException, UseInterceptors, UploadedFile, BadRequestException, Req, Delete } from '@nestjs/common';
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
import { getLegalAccessFromRequest } from '../auth/legal-access';

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
        
        let parsedMetadata: any = {};
        if (body.metadata) {
            if (typeof body.metadata === 'string') {
                try {
                    parsedMetadata = JSON.parse(body.metadata);
                } catch (e) {
                    parsedMetadata = {};
                }
            } else if (typeof body.metadata === 'object') {
                parsedMetadata = { ...body.metadata };
            }
        }

        let documentosAsociados: string[] = [];
        if (body.documentosAsociados) {
            if (typeof body.documentosAsociados === 'string') {
                try {
                    documentosAsociados = JSON.parse(body.documentosAsociados);
                } catch (e) {
                    if (body.documentosAsociados.includes(',')) {
                        documentosAsociados = body.documentosAsociados.split(',').map((s: string) => s.trim());
                    } else {
                        documentosAsociados = [body.documentosAsociados];
                    }
                }
            } else if (Array.isArray(body.documentosAsociados)) {
                documentosAsociados = body.documentosAsociados;
            }
        } else if (parsedMetadata.documentosAsociados) {
            documentosAsociados = parsedMetadata.documentosAsociados;
        }

        parsedMetadata.documentosAsociados = documentosAsociados;

        const data: Partial<Actuacion> = {
            ...body,
            usuarioResponsable: body.responsable || 'Sistema',
            metadata: {
                ...parsedMetadata,
                estado: body.estado || 'Registrado',
                observaciones: body.observaciones || ''
            },
            documentoUrl: file ? `/uploads/${file.filename}` : undefined,
            documentoNombre: file ? file.originalname : undefined
        };

        const result = await this.actuacionService.registrarActuacion(id, data);

        // Cargar expediente si es necesario para notificaciones
        const necesitaExpediente = file || body.tipoActuacion === 'NOTA_INTERNA';
        if (necesitaExpediente) {
            const expediente = await this.expedienteRepository.findOne({
                where: { id },
                select: ['id', 'radicado', 'jurisdiccion', 'tipoProceso', 'abogadoSustanciador'],
            });
            if (expediente) {
                const radicado = (expediente.radicado || '').toUpperCase();
                const esDisciplinario =
                    expediente.jurisdiccion === 'DISCIPLINARIO' ||
                    expediente.jurisdiccion === 'Disciplinaria' ||
                    expediente.tipoProceso === 'DISCIPLINARIO' ||
                    expediente.tipoProceso === 'Disciplinario' ||
                    radicado.startsWith('PD-');
                const modulo: 'DEFENSA_JUDICIAL' | 'JUZGAMIENTO_DISCIPLINARIO' =
                    (body.modulo === 'DEFENSA_JUDICIAL' || body.modulo === 'JUZGAMIENTO_DISCIPLINARIO')
                        ? body.modulo
                        : esDisciplinario ? 'JUZGAMIENTO_DISCIPLINARIO' : 'DEFENSA_JUDICIAL';

                if (file) {
                    await this.legalNotifications.notifyDocumentoSubido({
                        modulo,
                        radicado: expediente.radicado,
                        procesoId: expediente.id,
                        nombreDocumento: file.originalname,
                        subidoPor: body.subidoPor || body.responsable || body.usuario || 'Sistema',
                    });
                }

                if (body.tipoActuacion === 'NOTA_INTERNA' && expediente.abogadoSustanciador) {
                    const autorNombre = body.responsable || body.usuario || body.autorNombre || 'Un usuario';
                    const moduloVista = esDisciplinario ? 'juzgamiento' : 'defensa-judicial';
                    this.legalNotifications.notifyObservacionAgregada({
                        radicado: expediente.radicado,
                        procesoId: expediente.id,
                        abogadoId: expediente.abogadoSustanciador,
                        autorNombre,
                        moduloVista,
                    }).catch(() => {});
                }
            }
        }

        return result;
    }

    @Post(':actuacionId/enviar-otp')
    async enviarOtp(
        @Param('actuacionId') actuacionId: string,
        @Req() req?: any
    ) {
        const access = getLegalAccessFromRequest(req);
        const email = access.userEmail || 'sistema@esap.edu.co';
        const name = access.userName || 'Usuario';
        return this.actuacionService.enviarOtp(actuacionId, email, name);
    }

    @Post(':actuacionId/verificar-otp')
    async verificarOtp(
        @Param('actuacionId') actuacionId: string,
        @Body('otp') otp: string
    ) {
        return this.actuacionService.verificarOtp(actuacionId, otp);
    }

    @Post(':actuacionId/autorizar')
    @UseInterceptors(FileInterceptor('file', {
        storage: diskStorage({
            destination: (req, file, cb) => {
                const dir = './uploads/signatures';
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
        limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
        fileFilter: (req, file, cb) => {
            if (!file.mimetype.startsWith('image/')) {
                return cb(new BadRequestException('Solo se permiten archivos de imagen para la firma'), false);
            }
            cb(null, true);
        }
    }))
    async autorizar(
        @Param('actuacionId') actuacionId: string,
        @Body('otp') otp: string,
        @UploadedFile() file: any,
        @Req() req?: any
    ) {
        const access = getLegalAccessFromRequest(req);
        const email = access.userEmail || 'sistema@esap.edu.co';
        const name = access.userName || 'Usuario';
        return this.actuacionService.autorizarActuacion(actuacionId, otp, file, email, name);
    }

    @Post(':actuacionId/autorizar-por-documentos')
    async autorizarPorDocumentos(
        @Param('actuacionId') actuacionId: string,
        @Req() req?: any
    ) {
        const access = getLegalAccessFromRequest(req);
        const email = access.userEmail || 'sistema@esap.edu.co';
        const name = access.userName || 'Usuario';
        return this.actuacionService.autorizarPorDocumentosFirmados(actuacionId, email, name);
    }

    @Post(':actuacionId/devolver')
    async devolver(
        @Param('actuacionId') actuacionId: string,
        @Body('observaciones') observaciones: string,
        @Body('skipStageUpdate') skipStageUpdate?: boolean,
        @Req() req?: any
    ) {
        const access = getLegalAccessFromRequest(req);
        const email = access.userEmail || 'sistema@esap.edu.co';
        const name = access.userName || 'Usuario';
        return this.actuacionService.devolverActuacion(actuacionId, observaciones, email, name, !!skipStageUpdate);
    }

    @Delete(':actuacionId')
    async eliminar(
        @Param('actuacionId') actuacionId: string
    ): Promise<{ message: string }> {
        await this.actuacionService.eliminarActuacion(actuacionId);
        return { message: 'Actuación eliminada con éxito' };
    }
}


