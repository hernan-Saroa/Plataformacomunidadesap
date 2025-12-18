import { Controller, Get, Post, Put, Body, Query, BadRequestException, Param } from '@nestjs/common';
import { ExpedienteService } from '../services/expediente.service';
import { Expediente } from '../entities/expediente.entity';

@Controller('api/legal/expedientes')
export class ExpedienteController {
    constructor(private readonly expedienteService: ExpedienteService) { }

    @Get()
    async listar(
        @Query('estado') estado?: string,
        @Query('jurisdiccion') jurisdiccion?: string,
        @Query('search') search?: string,
    ): Promise<Expediente[]> {
        return this.expedienteService.listarExpedientes({ estado, jurisdiccion, search });
    }

    @Get(':id')
    async obtener(@Param('id') id: string): Promise<Expediente | null> {
        return this.expedienteService.findOne(id);
    }

    @Put(':id')
    async actualizar(@Param('id') id: string, @Body() data: Partial<Expediente>): Promise<Expediente> {
        return this.expedienteService.updateExpediente(id, data);
    }

    @Post()
    async crear(@Body() data: Partial<Expediente>): Promise<Expediente> {
        if (!data.radicado) {
            throw new BadRequestException('El radicado es obligatorio');
        }
        return this.expedienteService.crearExpediente(data);
    }
}
