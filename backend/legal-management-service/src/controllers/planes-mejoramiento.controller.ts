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
        })
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

    @Post(':id/seguimiento')
    addSeguimiento(@Param('id') id: string, @Body() body: any) {
        return this.planesService.addSeguimiento(id, body);
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
}
