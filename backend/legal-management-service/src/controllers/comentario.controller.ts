import { Controller, Get, Post, Delete, Param, Body } from '@nestjs/common';
import { ComentarioService } from '../services/comentario.service';
import { CreateComentarioDto } from '../dtos/comentario.dto';

@Controller('expedientes')
export class ComentarioController {
    constructor(private readonly comentarioService: ComentarioService) { }

    @Get(':expedienteId/comentarios')
    async findAll(@Param('expedienteId') expedienteId: string) {
        return this.comentarioService.findByExpediente(expedienteId);
    }

    @Post(':expedienteId/comentarios')
    async create(
        @Param('expedienteId') expedienteId: string,
        @Body() dto: CreateComentarioDto
    ) {
        return this.comentarioService.create(expedienteId, dto);
    }

    // Path matches the frontend service: DELETE /expedientes/comentarios/:id
    @Delete('comentarios/:id')
    async delete(@Param('id') id: string) {
        await this.comentarioService.delete(id);
        return { message: 'Comentario eliminado' };
    }
}


