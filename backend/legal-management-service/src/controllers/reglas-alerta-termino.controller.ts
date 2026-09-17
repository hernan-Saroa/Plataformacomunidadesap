import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { AlertasVencimientoTerminosService } from '../services/alertas-vencimiento-terminos.service';
import { ReglasAlertaTerminoService } from '../services/reglas-alerta-termino.service';

@Controller('terminos/reglas-alerta')
export class ReglasAlertaTerminoController {
    constructor(
        private readonly reglasAlertaService: ReglasAlertaTerminoService,
        private readonly alertasVencimiento: AlertasVencimientoTerminosService,
    ) { }

    /**
     * Contrasta todos los términos pendientes contra las reglas vigentes sin esperar a la
     * corrida horaria del cron: una regla nueva de 2 días debe avisar ya de los términos que
     * hoy están a menos de 2 días, no hasta la siguiente hora en punto.
     * Va sin await para no demorar la respuesta al usuario.
     */
    private reevaluarEnSegundoPlano(reglaIdModificada?: string): void {
        this.alertasVencimiento.reevaluarPorCambioDeRegla(reglaIdModificada).catch(() => undefined);
    }

    @Get()
    async findAll() {
        return this.reglasAlertaService.findAll();
    }

    @Post()
    async create(@Body() body: any) {
        const creada = await this.reglasAlertaService.create(body);
        this.reevaluarEnSegundoPlano();
        return creada;
    }

    @Patch(':id')
    async update(@Param('id') id: string, @Body() body: any) {
        const actualizada = await this.reglasAlertaService.update(id, body);
        // Se pasa el id para borrar los envíos hechos con el umbral anterior, que si no
        // bloquearían el aviso del umbral nuevo.
        this.reevaluarEnSegundoPlano(id);
        return actualizada;
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        return this.reglasAlertaService.remove(id);
    }
}
