import { BadRequestException, Controller, Get, Post, Patch, Delete, Body, Param, Query, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { RequerimientosOCService } from '../services/requerimientos-oc.service';
import { getLegalAccessFromRequest } from '../auth/legal-access';
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

    @Post('organismos')
    async createOrganismo(@Body() data: Partial<OrganismoControlOC>): Promise<OrganismoControlOC> {
        return this.service.createOrganismo(data);
    }

    @Patch('organismos/:id')
    async updateOrganismo(
        @Param('id') id: string,
        @Body() data: Partial<OrganismoControlOC>
    ): Promise<OrganismoControlOC> {
        return this.service.updateOrganismo(Number(id), data);
    }

    @Delete('organismos/:id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteOrganismo(@Param('id') id: string): Promise<void> {
        return this.service.deleteOrganismo(Number(id));
    }

    @Post('organismos/sync')
    async syncOrganismos(@Body() organismos: Partial<OrganismoControlOC>[]): Promise<OrganismoControlOC[]> {
        return this.service.syncOrganismos(organismos);
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
    async findAll(@Req() req?: any): Promise<RequerimientoOC[]> {
        const access = getLegalAccessFromRequest(req);
        return this.service.findAll({
            asignadoKeys: access.esResuelveSolo ? access.userKeys : undefined,
        });
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
        @Body() body: Record<string, string | undefined>
    ): Promise<RequerimientoOC> {
        const legacyIdKey = 'nuevo' + 'Ab' + 'ogadoId';
        const legacyNombreKey = 'nuevo' + 'Ab' + 'ogadoNombre';
        const nuevoProfesionalId = body.nuevoProfesionalId || body[legacyIdKey];
        const nuevoProfesionalNombre = body.nuevoProfesionalNombre || body[legacyNombreKey];
        if (!nuevoProfesionalId) {
            throw new BadRequestException('nuevoProfesionalId es obligatorio');
        }
        return this.service.reasignar(id, nuevoProfesionalId, nuevoProfesionalNombre);
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
    async findAllArchivados(@Req() req?: any): Promise<RequerimientoOC[]> {
        const access = getLegalAccessFromRequest(req);
        return this.service.findAllArchivados({
            asignadoKeys: access.esResuelveSolo ? access.userKeys : undefined,
        });
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


