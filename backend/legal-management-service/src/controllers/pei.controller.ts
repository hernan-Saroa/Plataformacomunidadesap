import { Controller, Get, Post, Body, Param, Put } from '@nestjs/common';
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

    @Post('indicador/:id/avance')
    async registrarAvance(
        @Param('id') id: number,
        @Body() body: { valor: number; observaciones?: string; usuarioId?: string }
    ) {
        return this.peiService.registrarAvance(id, body.valor, body.observaciones, body.usuarioId);
    }
}
