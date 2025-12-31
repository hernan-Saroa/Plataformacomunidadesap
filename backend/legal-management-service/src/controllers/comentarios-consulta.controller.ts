
import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ComentariosConsultaService } from '../services/comentarios-consulta.service';

@Controller('legal/consultas-juridicas')
export class ComentariosConsultaController {
    constructor(private readonly comentariosService: ComentariosConsultaService) { }

    @Get(':consultaId/comentarios')
    async findAll(@Param('consultaId') consultaId: string) {
        return this.comentariosService.findAll(consultaId);
    }

    @Post(':consultaId/comentarios')
    async create(
        @Param('consultaId') consultaId: string,
        @Body() body: any
    ) {
        return this.comentariosService.create({
            consultaId,
            mensaje: body.mensaje,
            usuario: body.usuario || 'Sistema',
            cargo: body.cargo || 'Funcionario'
        });
    }
}
