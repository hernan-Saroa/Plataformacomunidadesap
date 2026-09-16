import { Body, Controller, ForbiddenException, Get, Header, HttpCode, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { RundPtaJwtGuard } from './rund-pta-consulta.controller';
import { BancoDocentesRolesGuard } from './banco-docentes-roles.guard';
import { RequireRundPermissions, RUND_PERMISSIONS } from './rund-permissions';
import { Roles } from '../../auth/decorators/roles.decorator';
import { rundRequestActor } from './rund-access-audit';
import { RundExtraccionService } from './rund-extraccion.service';

@Controller(['banco-docentes/:id/extracciones','pta/banco-docentes/:id/extracciones'])
@UseGuards(RundPtaJwtGuard, BancoDocentesRolesGuard)
@Roles('GESTION_PROFESORAL','SUPER_ADMIN')
@RequireRundPermissions(RUND_PERMISSIONS.EDIT, RUND_PERMISSIONS.MANAGE)
export class RundExtraccionController {
  constructor(private readonly service: RundExtraccionService) {}
  private actor(req: any) {
    const actor = rundRequestActor(req);
    // Los fragmentos del PDF pueden contener datos sensibles: misma restricción
    // que la visualización del documento original, sin excepciones por ser LLM.
    if (!actor.fullAccess) throw new ForbiddenException('La revisión de extracciones requiere acceso al documento original (GGP).');
    return actor;
  }
  @Get()
  @Header('Cache-Control', 'private, no-store')
  async list(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: any) {
    return { success:true, data:await this.service.list(id,this.actor(req)) };
  }
  @Post('documentos/:documentId')
  @HttpCode(202)
  async enqueue(@Param('id', new ParseUUIDPipe()) id: string, @Param('documentId', new ParseUUIDPipe()) doc: string, @Req() req: any) {
    return { success:true, data:await this.service.enqueue(id,doc,this.actor(req)) };
  }
  @Post('sugerencias/:suggestionId/descartar')
  async discard(@Param('id', new ParseUUIDPipe()) id: string, @Param('suggestionId', new ParseUUIDPipe()) suggestion: string, @Body() body: any, @Req() req: any) {
    return { success:true, data:await this.service.discard(id,suggestion,body?.motivo,this.actor(req)) };
  }
}
