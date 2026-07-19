
import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ComentariosCorreoService } from '../services/comentarios-correo.service';

@Controller('correos')
export class ComentariosCorreoController {
    constructor(private readonly comentariosService: ComentariosCorreoService) { }

    @Get(':correoId/comentarios')
    async findAll(@Param('correoId') correoId: string) {
        return this.comentariosService.findAll(correoId);
    }

    @Post(':correoId/comentarios')
    async create(
        @Param('correoId') correoId: string,
        @Body() body: any
    ) {
        return this.comentariosService.create({
            correoId,
            mensaje: body.mensaje,
            usuario: body.usuario || 'Sistema',
            cargo: body.cargo || 'Funcionario'
        });
    }
}
