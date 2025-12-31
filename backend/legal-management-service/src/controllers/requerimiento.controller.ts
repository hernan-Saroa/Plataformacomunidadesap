import { Controller, Post, Body, Get, Patch, Param, Query } from '@nestjs/common';
import { RequerimientoService } from '../services/requerimiento.service';
import { CreateRequerimientoDto } from '../dtos/create-requerimiento.dto';
import { UpdateEstadoRequerimientoDto, FiltrosRequerimientoDto } from '../dtos/stats-requerimiento.dto';

@Controller('legal/oc')
export class RequerimientoController {
    constructor(private readonly reqService: RequerimientoService) { }

    // ============================================
    // ENDPOINTS DE REQUERIMIENTOS
    // ============================================

    /**
     * POST /api/oc/requerimientos
     * Crear un nuevo requerimiento
     */
    @Post('requerimientos')
    async create(@Body() dto: CreateRequerimientoDto) {
        return this.reqService.crearRequerimiento(dto);
    }

    /**
     * GET /api/oc/requerimientos
     * Listar todos los requerimientos
     */
    @Get('requerimientos')
    async findAll() {
        return this.reqService.findAll();
    }

    /**
     * GET /api/oc/requerimientos/stats
     * Obtener estadísticas para el dashboard
     */
    @Get('requerimientos/stats')
    async getStats() {
        return this.reqService.getStats();
    }

    /**
     * GET /api/oc/requerimientos/:id
     * Obtener un requerimiento por ID
     */
    @Get('requerimientos/:id')
    async findById(@Param('id') id: string) {
        return this.reqService.findById(id);
    }

    /**
     * PATCH /api/oc/requerimientos/:id/estado
     * Actualizar el estado de un requerimiento
     */
    @Patch('requerimientos/:id/estado')
    async updateEstado(
        @Param('id') id: string,
        @Body() dto: UpdateEstadoRequerimientoDto
    ) {
        return this.reqService.updateEstado(id, dto);
    }

    /**
     * POST /api/oc/requerimientos/search
     * Búsqueda avanzada con filtros
     */
    @Post('requerimientos/search')
    async search(@Body() filtros: FiltrosRequerimientoDto) {
        return this.reqService.findWithFilters(filtros);
    }

    // ============================================
    // ENDPOINTS DE ORGANISMOS DE CONTROL
    // ============================================

    /**
     * GET /api/oc/organismos
     * Listar todos los organismos de control activos
     */
    @Get('organismos')
    async getAllOrganismos() {
        return this.reqService.getAllOrganismos();
    }
}
