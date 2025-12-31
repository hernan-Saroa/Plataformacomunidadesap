import { Controller, Get, Post, Body, Param, Put, Res } from '@nestjs/common';
import type { Response } from 'express';
import { PeiService } from '../services/pei.service';

@Controller('api/legal/pei')
export class PeiController {
    constructor(private readonly peiService: PeiService) { }

    @Get('dashboard')
    async getDashboard() {
        return this.peiService.getDashboard();
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

    @Get('export/zip')
    async exportZip(@Res() res: Response) {
        const archive = await this.peiService.exportIndicatorsToZip();
        res.set('Content-Type', 'application/zip');
        res.set('Content-Disposition', 'attachment; filename=indicadores_pei.zip');

        // Pipe the archive to the response
        archive.pipe(res);
    }
}
