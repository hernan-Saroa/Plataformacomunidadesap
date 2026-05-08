import { Controller, Get, Post, Patch, Delete, Body, Param, NotFoundException, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { PlanesMejoramientoService } from '../services/planes-mejoramiento.service';

@Controller('planes-mejoramiento')
export class PlanesMejoramientoController {
    constructor(private readonly planesService: PlanesMejoramientoService) { }

    @Get()
    findAll() {
        return this.planesService.findAll();
    }

    @Post()
    create(@Body() body: any) {
        return this.planesService.create(body);
    }

    @Get('riesgos-disponibles')
    getRiesgos() {
        return this.planesService.getRiesgosParaSeleccion();
    }

    @Get('archivados/all')
    getArchivados() {
        return this.planesService.getArchivados();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.planesService.findOne(id);
    }

    @Get(':id/documentos')
    getDocumentos(@Param('id') id: string) {
        return this.planesService.getDocumentos(id);
    }

    @Post(':id/documentos')
    @UseInterceptors(FileInterceptor('file', {
        storage: diskStorage({
            destination: './uploads',
            filename: (req, file, cb) => {
                const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
                cb(null, `${randomName}${extname(file.originalname)}`);
            }
        }),
        // Bug 4: límite explícito de 200MB. Nginx (250m) y bodyParser (250mb) ya soportan este tamaño.
        limits: { fileSize: 200 * 1024 * 1024 }
    }))
    async uploadDocumento(
        @Param('id') id: string,
        @Body() body: any,
        @UploadedFile() file: Express.Multer.File
    ) {
        if (!file) throw new BadRequestException('El archivo es obligatorio');
        return this.planesService.uploadDocumento(id, file, body.titulo, body.uploadedBy);
    }

    @Post(':id/evidencias')
    addEvidencia(@Param('id') id: string, @Body() body: any) {
        return this.planesService.addEvidencia(id, body);
    }

    /**
     * Bug 5: registra un avance y opcionalmente sube un documento de soporte en
     * la misma transacción. Acepta multipart/form-data con campo `file` opcional.
     */
    @Post(':id/seguimiento')
    @UseInterceptors(FileInterceptor('file', {
        storage: diskStorage({
            destination: './uploads',
            filename: (req, file, cb) => {
                const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
                cb(null, `${randomName}${extname(file.originalname)}`);
            }
        }),
        limits: { fileSize: 200 * 1024 * 1024 }
    }))
    addSeguimiento(
        @Param('id') id: string,
        @Body() body: any,
        @UploadedFile() file?: Express.Multer.File,
    ) {
        return this.planesService.addSeguimiento(id, {
            descripcionAvance: body.descripcionAvance,
            porcentajeReportado: Number(body.porcentajeReportado),
            usuarioId: body.usuarioId,
            file,
            tituloDocumento: body.titulo,
            uploadedBy: body.uploadedBy,
        });
    }

    @Post(':id/comentarios')
    addComentario(@Param('id') id: string, @Body() body: any) {
        return this.planesService.addComentario(id, body);
    }

    // New Endpoint for Drag & Drop / General Updates
    @Post(':id/update')
    update(@Param('id') id: string, @Body() body: any) {
        return this.planesService.update(id, body);
    }

    @Patch(':id/archivar')
    archivar(@Param('id') id: string) {
        return this.planesService.archivar(id);
    }

    @Patch(':id/restaurar')
    restaurar(@Param('id') id: string) {
        return this.planesService.restaurar(id);
    }

    @Delete(':id')
    eliminar(@Param('id') id: string) {
        return this.planesService.eliminar(id);
    }

    // ============================================================
    // Bug 5c: Hallazgos / Acciones de Mejora
    // ============================================================
    @Get(':id/hallazgos')
    getHallazgos(@Param('id') id: string) {
        return this.planesService.getHallazgos(id);
    }

    @Post(':id/hallazgos')
    @UseInterceptors(FileInterceptor('file', {
        storage: diskStorage({
            destination: './uploads',
            filename: (req, file, cb) => {
                const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
                cb(null, `${randomName}${extname(file.originalname)}`);
            }
        }),
        limits: { fileSize: 200 * 1024 * 1024 }
    }))
    createHallazgo(
        @Param('id') id: string,
        @Body() body: { nombre: string; descripcion?: string; porcentajeAvance?: number | string; createdBy?: string },
        @UploadedFile() file?: Express.Multer.File,
    ) {
        return this.planesService.createHallazgo(id, {
            nombre: body.nombre,
            descripcion: body.descripcion,
            porcentajeAvance: body.porcentajeAvance != null ? Number(body.porcentajeAvance) : 0,
            createdBy: body.createdBy,
            file,
        });
    }

    @Patch('hallazgos/:hallazgoId')
    @UseInterceptors(FileInterceptor('file', {
        storage: diskStorage({
            destination: './uploads',
            filename: (req, file, cb) => {
                const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
                cb(null, `${randomName}${extname(file.originalname)}`);
            }
        }),
        limits: { fileSize: 200 * 1024 * 1024 }
    }))
    updateHallazgo(
        @Param('hallazgoId') hallazgoId: string,
        @Body() body: { nombre?: string; descripcion?: string; porcentajeAvance?: number | string },
        @UploadedFile() file?: Express.Multer.File,
    ) {
        return this.planesService.updateHallazgo(hallazgoId, {
            nombre: body.nombre,
            descripcion: body.descripcion,
            porcentajeAvance: body.porcentajeAvance != null ? Number(body.porcentajeAvance) : undefined,
            file,
        });
    }

    @Delete('hallazgos/:hallazgoId')
    deleteHallazgo(@Param('hallazgoId') hallazgoId: string) {
        return this.planesService.deleteHallazgo(hallazgoId);
    }
}
