
import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { TerminosService } from '../services/terminos.service';

@Controller('api/legal/terminos')
export class TerminosController {
    constructor(private readonly terminosService: TerminosService) { }

    @Post('manual')
    async createManual(@Body() data: any) {
        return this.terminosService.createManual(data);
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
