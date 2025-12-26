import { Controller, Get, Post, Body, Param, Put, Query } from '@nestjs/common';
import { ExpedienteService } from '../services/expediente.service';
import { Expediente } from '../entities/expediente.entity';

@Controller('terminos')
export class TerminosController {
    constructor(private readonly expedienteService: ExpedienteService) { }

    @Get()
    async findAll(@Query('search') search?: string) {
        // 1. Obtener expedientes de tipo Términos e Informes
        const rawExpedientes = await this.expedienteService.listarExpedientes({
            jurisdiccion: 'TERMINOS_INFORMES',
            search
        });

        // 2. Mapear al formato frontend (SolicitudInforme)
        return rawExpedientes.map(exp => {
            const diasRestantes = this.calculateDiasRestantes(exp.fechaLimiteEtapa);

            return {
                id: exp.id, // O radicado si prefieren
                etapa: exp.etapa || 'RECIBIDA',
                tipoInforme: exp.tipoSolicitud || 'General',
                enteSolicitante: exp.demandante, // Mapeado a demandante
                radicadoExterno: exp.radicadoExterno,
                asunto: exp.asunto || '',
                descripcion: exp.hechos || '',
                responsable: exp.abogadoSustanciador, // Mapeado a responsable
                fechaSolicitud: exp.fechaRadicacion,
                fechaVencimiento: exp.fechaLimiteEtapa,
                diasTotales: 15, // Mock o calculado
                diasRestantes: diasRestantes,
                datosRequeridos: exp.datosRequeridos ? JSON.parse(exp.datosRequeridos) : [],
                documentos: exp.actuaciones || []
            };
        });
    }

    @Post()
    async create(@Body() data: Partial<Expediente> & { datosRequeridos?: string[] }) {
        // Transformar datos específicos antes de guardar
        const expedienteData: Partial<Expediente> = {
            ...data,
            jurisdiccion: 'TERMINOS_INFORMES',
            tipoProceso: 'Solicitud Informe',
            etapa: 'RECIBIDA',
            // Mapeos inversos
            demandante: data.demandante || data['enteSolicitante'],
            fechaRadicacion: new Date(),
            // Serializar array si viene del front
            datosRequeridos: data.datosRequeridos ? JSON.stringify(data.datosRequeridos) : undefined
        };

        return this.expedienteService.crearExpediente(expedienteData);
    }

    private calculateDiasRestantes(fechaLimite?: Date): number {
        if (!fechaLimite) return 0;
        const diffTime = new Date(fechaLimite).getTime() - new Date().getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
}
