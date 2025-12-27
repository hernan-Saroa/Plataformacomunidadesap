import { Controller, Get, Post, Body, Param, Put, Query } from '@nestjs/common';
import { ExpedienteService } from '../services/expediente.service';
import { Expediente } from '../entities/expediente.entity';

@Controller('juzgamiento')
export class JuzgamientoController {
    constructor(private readonly expedienteService: ExpedienteService) { }

    @Get()
    async findAll(@Query('search') search?: string) {
        // 1. Obtener expedientes disciplinarios
        const rawExpedientes = await this.expedienteService.listarExpedientes({
            jurisdiccion: 'DISCIPLINARIO',
            search
        });

        // 2. Mapear al formato Kanban requerido por el frontend
        return rawExpedientes.map(exp => {
            const diasRestantes = this.calculateDiasRestantes(exp.fechaLimiteEtapa);

            return {
                id: exp.id,
                radicado: exp.radicado,
                etapa: exp.etapa || 'E1_AVOCAMIENTO', // Default
                leyAplicable: exp.leyAplicable || 'Ley 1952/2019',
                investigado: exp.demandado, // En disciplinario 'demandado' es el investigado
                cargo: exp.cargoInvestigado,
                abogadoAsignado: exp.abogadoSustanciador,
                diasRestantes: diasRestantes,
                diasDescargos: 15, // Mock/Configurable
                documentos: exp.actuaciones || [], // Simplificado
                actuaciones: exp.actuaciones || [],
                hechos: exp.hechos || '',
                // Semáforo logic is usually frontend, but we pass necessary data
            };
        });
    }

    @Post()
    async create(@Body() data: Partial<Expediente>) {
        return this.expedienteService.crearExpediente({
            ...data,
            jurisdiccion: 'DISCIPLINARIO',
            tipoProceso: 'Disciplinario',
            etapa: 'E1_AVOCAMIENTO'
        });
    }

    private calculateDiasRestantes(fechaLimite?: Date): number {
        if (!fechaLimite) return 0;
        const diffTime = new Date(fechaLimite).getTime() - new Date().getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
}
