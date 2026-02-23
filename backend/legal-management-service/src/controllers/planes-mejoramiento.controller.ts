import { Controller, Get, Post, Patch, Delete, Body, Param, NotFoundException } from '@nestjs/common';
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
