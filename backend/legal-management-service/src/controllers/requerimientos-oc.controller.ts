import { Controller, Get, Post, Patch, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { RequerimientosOCService } from '../services/requerimientos-oc.service';
import { RequerimientoOC } from '../entities/requerimiento-oc.entity';
import type { EstadoRequerimiento } from '../entities/requerimiento-oc.entity';
import { OrganismoControlOC } from '../entities/organismo-control-legal.entity';
import { SolicitudInsumo } from '../entities/solicitud-insumo.entity';
import { RespuestaBorradorOC } from '../entities/respuesta-borrador-oc.entity';
import { TipoRequerimientoOC } from '../entities/tipo-requerimiento-oc.entity';

@Controller('requerimientos-oc')
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
    // TIPOS DE REQUERIMIENTO (Catálogo)
    // ============================================
    @Get('tipos-requerimiento')
    async getTiposRequerimiento(): Promise<TipoRequerimientoOC[]> {
        return this.service.findAllTiposRequerimiento();
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
    async create(@Body() data: Partial<RequerimientoOC> & { creadoPor?: string; usuario?: string }): Promise<RequerimientoOC> {
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

    @Patch(':id/reasignar')
    async reasignar(
        @Param('id') id: string,
        @Body('nuevoAbogadoId') nuevoAbogadoId: string,
        @Body('nuevoAbogadoNombre') nuevoAbogadoNombre?: string
    ): Promise<RequerimientoOC> {
        return this.service.reasignar(id, nuevoAbogadoId, nuevoAbogadoNombre);
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

    // ============================================
    // ENVIAR RESPUESTA FORMAL
    // ============================================
    @Post(':id/response')
    async enviarRespuesta(
        @Param('id') id: string,
        @Body() data: {
            destinatarioEmail: string;
            asunto: string;
            cuerpoMensaje: string;
            tipoRespuesta: string;
            destinatarioNombre?: string;
            destinatarioCargo?: string;
        }
    ): Promise<{ success: boolean; message: string }> {
        return this.service.enviarRespuesta(id, data);
    }

    // ============================================
    // BORRADORES DE RESPUESTA
    // ============================================
    @Get(':id/borrador')
    async getBorrador(@Param('id') id: string): Promise<RespuestaBorradorOC | null> {
        return this.service.getBorrador(id);
    }

    @Post(':id/borrador')
    async upsertBorrador(
        @Param('id') id: string,
        @Body() data: Partial<RespuestaBorradorOC>
    ): Promise<RespuestaBorradorOC> {
        return this.service.upsertBorrador(id, data);
    }

    // ============================================
    // SISTEMA DE ARCHIVO
    // ============================================
    @Get('archivados/list')
    async findAllArchivados(): Promise<RequerimientoOC[]> {
        return this.service.findAllArchivados();
    }

    @Patch(':id/archivar')
    async archivar(
        @Param('id') id: string,
        @Body() body: { motivo: string; usuario: string }
    ): Promise<RequerimientoOC> {
        return this.service.archivar(id, body);
    }

    @Patch(':id/restaurar')
    async restaurar(
        @Param('id') id: string,
        @Body() body: { usuario: string }
    ): Promise<RequerimientoOC> {
        return this.service.restaurar(id, body.usuario);
    }

    @Delete(':id/permanente')
    @HttpCode(HttpStatus.NO_CONTENT)
    async eliminarPermanente(
        @Param('id') id: string,
        @Query('usuario') usuario: string,
        @Query('motivo') motivo: string
    ): Promise<void> {
        return this.service.eliminarPermanente(id, usuario, motivo);
    }
}


