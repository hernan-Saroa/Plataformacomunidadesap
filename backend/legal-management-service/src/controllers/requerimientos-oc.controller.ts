import { Controller, Get, Post, Patch, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { RequerimientosOCService } from '../services/requerimientos-oc.service';
import { RequerimientoOC } from '../entities/requerimiento-oc.entity';
import type { EstadoRequerimiento } from '../entities/requerimiento-oc.entity';
import { OrganismoControlOC } from '../entities/organismo-control-legal.entity';
import { SolicitudInsumo } from '../entities/solicitud-insumo.entity';

@Controller('api/legal/requerimientos-oc')
export class RequerimientosOCController {
    constructor(private readonly service: RequerimientosOCService) { }

    // ============================================
    // ORGANISMOS (Catálogo)
    // ============================================
    @Get('organismos')
    async getOrganismos(): Promise<OrganismoControlOC[]> {
        return this.service.findAllOrganismos();
    }

    // ============================================
    // REQUERIMIENTOS
    // ============================================
    @Get()
    async findAll(): Promise<RequerimientoOC[]> {
        return this.service.findAll();
    }

    @Get(':id')
    async findOne(@Param('id') id: string): Promise<RequerimientoOC> {
        return this.service.findOne(id);
    }

    @Post()
    async create(@Body() data: Partial<RequerimientoOC>): Promise<RequerimientoOC> {
        return this.service.create(data);
    }

    @Patch(':id')
    async update(@Param('id') id: string, @Body() data: Partial<RequerimientoOC>): Promise<RequerimientoOC> {
        return this.service.update(id, data);
    }

    @Patch(':id/estado')
    async cambiarEstado(
        @Param('id') id: string,
        @Body('estado') estado: string
    ): Promise<RequerimientoOC> {
        return this.service.cambiarEstado(id, estado as EstadoRequerimiento);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async delete(@Param('id') id: string): Promise<void> {
        return this.service.delete(id);
    }

    // ============================================
    // SOLICITUDES DE INSUMOS (Delegación)
    // ============================================
    @Get(':id/insumos')
    async getInsumos(@Param('id') id: string): Promise<SolicitudInsumo[]> {
        return this.service.findInsumosByRequerimiento(id);
    }

    @Post(':id/insumos')
    async createInsumo(
        @Param('id') id: string,
        @Body() data: Partial<SolicitudInsumo>
    ): Promise<SolicitudInsumo> {
        return this.service.createInsumo(id, data);
    }

    @Patch('insumos/:insumoId/responder')
    async responderInsumo(
        @Param('insumoId') insumoId: string,
        @Body() data: { documentosEntregadosUrl: string; comentarioRespuesta?: string; respondidoPor: string }
    ): Promise<SolicitudInsumo> {
        return this.service.responderInsumo(insumoId, data);
    }
}
