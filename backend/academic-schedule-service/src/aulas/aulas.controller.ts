import { Controller, Get, Param, Post } from '@nestjs/common';

import { AulasService } from './aulas.service.js';

/**
 * Aulas y disponibilidad de espacio — EFDS-1374.
 *
 * La disponibilidad respeta RN-07: día y hora de lo ocupado, nunca qué grupo lo
 * ocupa. La garantía está en el servicio (no selecciona esos campos), no aquí.
 */
@Controller('aulas')
export class AulasController {
  constructor(private readonly aulas: AulasService) {}

  /** GET /aulas — catálogo de aulas (datos provisionales, C-4). */
  @Get()
  async listar() {
    return { success: true, data: await this.aulas.listar() };
  }

  /** GET /aulas/:codigo/disponibilidad — franjas ocupadas: solo día y hora. */
  @Get(':codigo/disponibilidad')
  async disponibilidad(@Param('codigo') codigo: string) {
    return { success: true, data: await this.aulas.disponibilidad(codigo) };
  }

  /** POST /aulas/publicar/:idGrupo — publica la oferta; exige aula en toda franja. */
  @Post('publicar/:idGrupo')
  async publicar(@Param('idGrupo') idGrupo: string) {
    return { success: true, data: await this.aulas.publicarGrupo(idGrupo) };
  }
}
