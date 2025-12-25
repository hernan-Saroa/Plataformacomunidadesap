import { Controller, Get, Post, Delete, Param, Body } from '@nestjs/common';
import { ComentarioService } from '../services/comentario.service';
import { CreateComentarioDto } from '../dtos/comentario.dto';

@Controller('api/legal/expedientes/:expedienteId/comentarios')
export class ComentarioController {
    constructor(private readonly comentarioService: ComentarioService) { }

    @Get()
    async findAll(@Param('expedienteId') expedienteId: string) {
        return this.comentarioService.findByExpediente(expedienteId);
    }

    @Post()
    async create(
        @Param('expedienteId') expedienteId: string,
        @Body() dto: CreateComentarioDto
    ) {
        return this.comentarioService.create(expedienteId, dto);
    }

    @Delete(':id')
    async delete(@Param('id') id: string) {
        await this.comentarioService.delete(id);
        return { message: 'Comentario eliminado' };
    }
}
