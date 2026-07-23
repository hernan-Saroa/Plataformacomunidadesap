import {
    Controller,
    Get,
    Post,
    Delete,
    Param,
    Query,
    Body,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { BorradoresCorreosService } from '../services/borradores-correos.service';
import { BorradorCorreo, BorradorAdjunto } from '../entities/borrador-correo.entity';

// DTO como clase (compatibilidad con decoradores de Nest).
export class UpsertBorradorBodyDto {
    id?: string;
    usuarioId: string;
    usuarioNombre?: string;
    buzon?: string;
    para?: string[];
    cc?: string[];
    cco?: string[];
    asunto?: string;
    cuerpo?: string;
    adjuntos?: BorradorAdjunto[];
    solicitarAcuse?: boolean;
}

/**
 * Borradores de correos del Centro de Comunicaciones (Redactar Correo).
 * Privados por usuario. Ruta pública: /legal/api/v1/borradores-correos
 */
@Controller('borradores-correos')
export class BorradoresCorreosController {
    constructor(private readonly borradoresService: BorradoresCorreosService) { }

    /** Lista los borradores del usuario indicado. */
    @Get()
    async findAll(@Query('usuarioId') usuarioId: string): Promise<BorradorCorreo[]> {
        return this.borradoresService.findByUsuario(usuarioId);
    }

    @Get(':id')
    async getById(@Param('id') id: string): Promise<BorradorCorreo> {
        return this.borradoresService.getById(id);
    }

    /** Crea o actualiza (upsert) un borrador. */
    @Post()
    @HttpCode(HttpStatus.OK)
    async upsert(@Body() body: UpsertBorradorBodyDto): Promise<BorradorCorreo> {
        return this.borradoresService.upsert(body);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    async remove(
        @Param('id') id: string,
        @Query('usuarioId') usuarioId?: string,
    ): Promise<{ success: boolean }> {
        return this.borradoresService.remove(id, usuarioId);
    }
}
