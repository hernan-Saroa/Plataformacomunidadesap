import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { AudienciaService } from '../services/audiencia.service';
import { CreateAudienciaDto } from '../dtos/audiencia.dto';

@Controller('audiencias')
export class AudienciaController {
    constructor(private readonly audienciaService: AudienciaService) { }

    @Get()
    @Get()
    async findAll(
        @Query('start') start?: string,
        @Query('end') end?: string,
        @Query('expedienteId') expedienteId?: string
    ) {
        const startDate = start ? new Date(start) : undefined;
        const endDate = end ? new Date(end) : undefined;
        return this.audienciaService.findAll(startDate, endDate, expedienteId);
    }

    @Get('dashboard')
    async getDashboardStats() {
        return this.audienciaService.getDashboardStats();
    }

    @Post()
    async create(@Body() dto: CreateAudienciaDto) {
        return this.audienciaService.create(dto);
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() dto: any) {
        return this.audienciaService.update(id, dto);
    }

    @Delete(':id')
    async delete(@Param('id') id: string) {
        return this.audienciaService.delete(id);
    }
}


