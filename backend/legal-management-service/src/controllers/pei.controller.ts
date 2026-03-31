import { Controller, Get, Post, Body, Param, Put, Patch, Delete, Res } from '@nestjs/common';
import type { Response } from 'express';
import { PeiService } from '../services/pei.service';

@Controller('pei')
export class PeiController {
    constructor(private readonly peiService: PeiService) { }

    @Get('dashboard')
    async getDashboard() {
        return this.peiService.getDashboard();
    }

    @Get('archivados')
    async getArchivados() {
        return this.peiService.getArchivados();
    }

    @Post('indicador')
    async createIndicador(@Body() body: any) {
        return this.peiService.createIndicador(body);
    }

    @Get('indicador/:id')
    async getIndicador(@Param('id') id: number) {
        return this.peiService.findOne(id);
    }

    @Put('indicador/:id')
    async updateIndicador(@Param('id') id: number, @Body() body: any) {
        return this.peiService.updateIndicador(id, body);
    }

    @Post('indicador/:id/avance')
    async registrarAvance(
        @Param('id') id: number,
        @Body() body: { valor: number; observaciones?: string; usuarioId?: string }
    ) {
        return this.peiService.registrarAvance(id, body.valor, body.observaciones, body.usuarioId);
    }

    @Patch('indicador/:id/archivar')
    async archivar(@Param('id') id: number) {
        return this.peiService.archivar(id);
    }

    @Patch('indicador/:id/restaurar')
    async restaurar(@Param('id') id: number) {
        return this.peiService.restaurar(id);
    }

    @Delete('indicador/:id')
    async eliminar(@Param('id') id: number) {
        return this.peiService.eliminar(id);
    }

    @Get('export/zip')
    async exportZip(@Res() res: Response) {
        const archive = await this.peiService.exportIndicatorsToZip();
        res.set('Content-Type', 'application/zip');
        res.set('Content-Disposition', 'attachment; filename=indicadores_pei.zip');

        // Pipe the archive to the response
        archive.pipe(res);
    }
}


