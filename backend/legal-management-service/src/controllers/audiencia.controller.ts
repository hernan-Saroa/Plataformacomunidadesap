import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { AudienciaService } from '../services/audiencia.service';
import { CreateAudienciaDto } from '../dtos/audiencia.dto';

@Controller('legal/audiencias')
export class AudienciaController {
    constructor(private readonly audienciaService: AudienciaService) { }

    @Get()
    async findAll(@Query('start') start?: string, @Query('end') end?: string) {
        const startDate = start ? new Date(start) : undefined;
        const endDate = end ? new Date(end) : undefined;
        return this.audienciaService.findAll(startDate, endDate);
    }

    @Get('dashboard')
    async getDashboardStats() {
        return this.audienciaService.getDashboardStats();
    }

    @Post()
    async create(@Body() dto: CreateAudienciaDto) {
        return this.audienciaService.create(dto);
    }
}

