import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { AbogadoService } from '../services/abogado.service';
import { CreateAbogadoDto } from '../dtos/abogado.dto';

// @UseGuards(JwtAuthGuard) // Assuming Auth is handled globally or per user request
@Controller('api/legal/abogados')
export class AbogadoController {
    constructor(private readonly abogadoService: AbogadoService) { }

    @Get()
    async getDashboard() {
        return this.abogadoService.findAllDashboard();
    }

    @Post()
    async create(@Body() dto: CreateAbogadoDto) {
        return this.abogadoService.create(dto);
    }
}

@Controller('api/legal/stats')
export class AbogadoStatsController {
    constructor(private readonly abogadoService: AbogadoService) { }

    @Get('general')
    async getGeneralStats() {
        // Reusing dashboard logic for now or implementing specific aggregation
        // For speed, let's just aggregate the dashboard result
        const all = await this.abogadoService.findAllDashboard();
        const avgSuccess = all.reduce((acc, curr) => acc + curr.tasaExito, 0) / (all.length || 1);

        return {
            totalAbogados: all.length,
            totalExpedientesAsignados: all.reduce((acc, curr) => acc + curr.totalExpedientes, 0),
            promedioExito: Math.round(avgSuccess)
        };
    }
}
