import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { ReglasAlertaTerminoService } from '../services/reglas-alerta-termino.service';

@Controller('terminos/reglas-alerta')
export class ReglasAlertaTerminoController {
    constructor(private readonly reglasAlertaService: ReglasAlertaTerminoService) { }

    @Get()
    async findAll() {
        return this.reglasAlertaService.findAll();
    }

    @Post()
    async create(@Body() body: any) {
        return this.reglasAlertaService.create(body);
    }

    @Patch(':id')
    async update(@Param('id') id: string, @Body() body: any) {
        return this.reglasAlertaService.update(id, body);
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        return this.reglasAlertaService.remove(id);
    }
}
