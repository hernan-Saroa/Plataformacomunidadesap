import { Controller, Get, Post, Body, Param, NotFoundException } from '@nestjs/common';
import { PlanesMejoramientoService } from '../services/planes-mejoramiento.service';

@Controller('api/v1/planes-mejoramiento')
export class PlanesMejoramientoController {
    constructor(private readonly planesService: PlanesMejoramientoService) { }

    @Get()
    findAll() {
        return this.planesService.findAll();
    }

    @Post()
    create(@Body() body: any) {
        // Basic validation could be done here or with DTOs.
        // Body should match Entity Partial
        return this.planesService.create(body);
    }

    @Get('riesgos-disponibles')
    getRiesgos() {
        return this.planesService.getRiesgosParaSeleccion();
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
    @Post(':id/update') // Using Post but acting as Patch/Put for simplicity or conform to existing style
    update(@Param('id') id: string, @Body() body: any) {
        return this.planesService.update(id, body);
    }
}
