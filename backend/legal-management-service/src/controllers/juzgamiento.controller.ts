import { Controller, Get, Post, Body, Param, Put, Patch, Query, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
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
                id: exp.radicado, // Frontend expects "PD-2025-001" as ID
                uuid: exp.id,      // Keep internal UUID available if needed
                radicado: exp.radicado,
                etapa: exp.etapa || 'E1_AVOCAMIENTO',
                leyAplicable: exp.leyAplicable || 'Ley 1952/2019',
                investigado: exp.demandado,
                cargo: exp.cargoInvestigado,
                dependencia: exp.dependenciaInvestigado,
                tipoFalta: exp.tipoFalta,
                abogadoAsignado: exp.abogadoSustanciador,
                diasRestantes: diasRestantes,
                diasDescargos: 15,
                // Merge actuaciones and evidencias for documents list
                documentos: [...(exp.actuaciones || []), ...(exp.evidencias || [])],
                actuaciones: exp.actuaciones || [],
                evidencias: exp.evidencias || [],
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

    @Patch(':radicado')
    async update(@Param('radicado') radicado: string, @Body() data: Partial<Expediente>) {
        const expediente = await this.expedienteService.findOneByRadicado(radicado);
        if (!expediente) throw new BadRequestException('Expediente no encontrado');

        return this.expedienteService.updateExpediente(expediente.id, data);
    }

    private calculateDiasRestantes(fechaLimite?: Date): number {
        if (!fechaLimite) return 0;
        const diffTime = new Date(fechaLimite).getTime() - new Date().getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    @Post(':radicado/documentos')
    @UseInterceptors(FileInterceptor('file', {
        storage: diskStorage({
            destination: './uploads',
            filename: (req, file, cb) => {
                const randomName = Array.from(Array(32)).map(() => Math.round(Math.random() * 16).toString(16)).join('');
                return cb(null, `${randomName}${extname(file.originalname)}`);
            }
        })
    }))
    async uploadDocumento(
        @Param('radicado') radicado: string,
        @Body() body: { tipo: string; descripcion: string },
        @UploadedFile() file: any
    ) {
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }

        const expediente = await this.expedienteService.findOneByRadicado(radicado);
        if (!expediente) {
            throw new BadRequestException('Expediente no encontrado');
        }

        const contexto = body.tipo === 'EVIDENCIA' ? 'Pruebas' : body.tipo === 'DOCUMENTO' ? 'Documentos' : 'General';
        const descripcionBase = body.descripcion || file.originalname;
        const descripcionCompleta = `${descripcionBase} (Cargado desde ${contexto})`;

        // Create Actuacion as Evidence/Document
        return this.expedienteService.agregarActuacion(expediente.id, {
            tipoActuacion: body.tipo || 'DOCUMENTO', // 'EVIDENCIA' or 'DOCUMENTO'
            descripcion: descripcionCompleta,
            fechaActuacion: new Date(),
            documentoNombre: file.originalname,
            documentoUrl: `http://localhost:3008/legal/files/${file.filename}`, // Ensure absolute URL for frontend
            usuarioResponsable: 'Usuario Actual' // Mock user for now
        });
    }

    @Get(':radicado/actuaciones')
    async getActuaciones(@Param('radicado') radicado: string) {
        const expediente = await this.expedienteService.findOneByRadicado(radicado);
        if (!expediente) throw new BadRequestException('Expediente no encontrado');
        // Return sorted actuations
        return expediente.actuaciones || [];
    }

    @Get(':radicado/decisiones')
    async getDecisiones(@Param('radicado') radicado: string) {
        const expediente = await this.expedienteService.findOneByRadicado(radicado);
        if (!expediente) throw new BadRequestException('Expediente no encontrado');
        return this.expedienteService.getDecisions(expediente.id);
    }

    @Post(':radicado/decisiones')
    async createDecision(@Param('radicado') radicado: string, @Body() data: any) {
        const expediente = await this.expedienteService.findOneByRadicado(radicado);
        if (!expediente) throw new BadRequestException('Expediente no encontrado');
        return this.expedienteService.createDecision(expediente.id, data);
    }
}


