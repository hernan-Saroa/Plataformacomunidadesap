import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { TasaReferenciaService, CreateTasaReferenciaDto } from '../services/tasa-referencia.service';

@Controller('api/tasas-referencia')
export class TasaReferenciaController {
    constructor(private readonly tasaReferenciaService: TasaReferenciaService) { }

    @Get()
    async findAll(
        @Query('anio') anio?: string,
        @Query('mes') mes?: string,
        @Query('tipoTasa') tipoTasa?: string
    ) {
        if (anio && mes) {
            return this.tasaReferenciaService.findByPeriod(Number(anio), Number(mes), tipoTasa);
        }
        return this.tasaReferenciaService.findAll();
    }

    @Post()
    async create(@Body() createDto: CreateTasaReferenciaDto) {
        return this.tasaReferenciaService.create(createDto);
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() updateDto: Partial<CreateTasaReferenciaDto>) {
        return this.tasaReferenciaService.update(id, updateDto);
    }

    @Delete(':id')
    async delete(@Param('id') id: string) {
        return this.tasaReferenciaService.delete(id);
    }
}
