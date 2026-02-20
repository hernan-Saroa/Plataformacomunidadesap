
import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { TerminosService } from '../services/terminos.service';

@Controller('terminos')
export class TerminosController {
    constructor(private readonly terminosService: TerminosService) { }


    @Post('manual')
    async createManual(@Body() body: any) {
        // Defaults for manual creation
        const fechaBase = body.fechaBase ? new Date(body.fechaBase) : new Date();
        const fechaVencimiento = body.fechaVencimiento ? new Date(body.fechaVencimiento) : null;

        // Calculate days if dates exist
        let diasTermino = body.diasTermino || 0;
        if (fechaVencimiento && !diasTermino) {
            const diffTime = Math.abs(fechaVencimiento.getTime() - fechaBase.getTime());
            diasTermino = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }

        return this.terminosService.create({
            ...body,
            origenModulo: 'MANUAL',
            fechaBase,
            fechaVencimiento,
            diasTermino,
            estado: body.estado || 'PENDIENTE',
            prioridad: body.prioridad || 'MEDIA',
            tipoDias: body.tipoDias || 'CALENDARIO'
        });
    }

    @Post('sincronizar')
    async sincronizar() {
        return this.terminosService.sincronizar();
    }

    @Get(':id/documentos')
    async getDocumentos(@Param('id') id: string) {
        return this.terminosService.getDocumentos(id);
    }

    @Get('calendario')
    async getCalendario(
        @Query('start') start: string,
        @Query('end') end: string,
        @Query('responsableId') responsableId?: string
    ) {
        return this.terminosService.getCalendario(start, end, responsableId);
    }

    @Get('listado')
    async getListado(@Query('responsableId') responsableId?: string) {
        return this.terminosService.getSemaforoList(responsableId);
    }

    @Get('reportes/eficiencia')
    async getReporteEficiencia() {
        return this.terminosService.getReporteEficiencia();
    }

    @Get('reportes/carga')
    async getReporteCarga() {
        return this.terminosService.getReporteCarga();
    }

    @Get(':id')
    async getDetalle(@Param('id') id: string) {
        return this.terminosService.findOne(id);
    }

    // Stub for documents - in a real scenario we would query the specific service based on origin
    @Get(':id/documentos-asociados')
    async getDocumentosAsociados(@Param('id') id: string) {
        // Logic to fetch documents from origin would go here
        // For now returning empty or mocked data to satisfy the endpoint requirement
        return [];
    }
}


