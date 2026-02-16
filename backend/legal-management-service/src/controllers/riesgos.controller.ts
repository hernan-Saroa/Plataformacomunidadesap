import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Res, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { RiesgosService } from '../services/riesgos.service';
import { Riesgo } from '../entities/riesgo.entity';
import type { EtapaRiesgo, ZonaRiesgo } from '../entities/riesgo.entity';

@Controller('riesgos')
export class RiesgosController {
    constructor(private readonly riesgosService: RiesgosService) { }

    // ============================================
    // CRUD
    // ============================================
    @Get()
    async findAll(): Promise<Riesgo[]> {
        return this.riesgosService.findAll();
    }

    @Get('estadisticas')
    async getEstadisticas() {
        return this.riesgosService.getEstadisticas();
    }

    @Get('export/contabilidad')
    async getReporteContabilidad(@Res() res: Response) {
        try {
            const pdfBuffer = await this.riesgosService.generarReporteContabilidadPDF();

            res.set({
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="Reporte_Contabilidad_Riesgos_${new Date().getTime()}.pdf"`,
                'Content-Length': pdfBuffer.length
            });

            res.send(pdfBuffer);
        } catch (error) {
            console.error('Error generando reporte PDF:', error);
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Error generando reporte' });
        }
    }

    @Patch(':id/provision')
    async actualizarProvision(
        @Param('id') id: string,
        @Body('cuantiaEstimada') cuantiaEstimada: number
    ) {
        return this.riesgosService.actualizarProvision(id, cuantiaEstimada);
    }

    @Get(':id')
    async findOne(@Param('id') id: string): Promise<Riesgo> {
        return this.riesgosService.findOne(id);
    }

    @Post()
    async create(@Body() body: Partial<Riesgo>): Promise<Riesgo> {
        return this.riesgosService.create(body);
    }

    @Patch(':id')
    async update(@Param('id') id: string, @Body() body: Partial<Riesgo>): Promise<Riesgo> {
        return this.riesgosService.update(id, body);
    }

    @Delete(':id')
    async delete(@Param('id') id: string): Promise<void> {
        return this.riesgosService.delete(id);
    }

    // ============================================
    // OPERACIONES ESPECÍFICAS
    // ============================================
    @Patch(':id/etapa')
    async cambiarEtapa(
        @Param('id') id: string,
        @Body('etapa') etapa: string
    ): Promise<Riesgo> {
        return this.riesgosService.cambiarEtapa(id, etapa as EtapaRiesgo);
    }

    @Patch(':id/archivar')
    async archivar(
        @Param('id') id: string,
        @Body('motivo') motivo?: string
    ): Promise<Riesgo> {
        return this.riesgosService.archivar(id, motivo);
    }

    @Get('archivados/all')
    async findArchived(): Promise<Riesgo[]> {
        return this.riesgosService.findArchived();
    }

    @Patch(':id/restaurar')
    async restaurar(@Param('id') id: string): Promise<Riesgo> {
        return this.riesgosService.restaurar(id);
    }

    @Delete(':id/permanente')
    async eliminarPermanente(@Param('id') id: string): Promise<void> {
        return this.riesgosService.eliminarPermanente(id);
    }

    // ============================================
    // FILTROS
    // ============================================
    @Get('por-proceso/:proceso')
    async findByProceso(@Param('proceso') proceso: string): Promise<Riesgo[]> {
        return this.riesgosService.findByProceso(proceso);
    }

    @Get('por-zona/:zona')
    async findByZona(@Param('zona') zona: string): Promise<Riesgo[]> {
        return this.riesgosService.findByZona(zona as ZonaRiesgo);
    }

    @Get(':id/historial')
    async getHistorial(@Param('id') id: string) {
        return this.riesgosService.getHistorial(id);
    }
}




