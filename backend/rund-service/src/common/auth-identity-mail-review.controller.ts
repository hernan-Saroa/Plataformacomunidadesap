import { BadRequestException, Body, Controller, Get, Header, HttpCode, Module, Optional, Param, Post, Query, Req, ServiceUnavailableException, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { BancoDocentesRolesGuard } from '../modules/banco-docentes/banco-docentes-roles.guard';
import { RequireRundPermissions, RUND_PERMISSIONS } from '../modules/banco-docentes/rund-permissions';
import { getRequestRoleCodes } from '../modules/banco-docentes/banco-docentes-sensitive-data';
import { AuthIdentityMailReviewService } from './auth-identity-mail-review.service';
import { AuthIdentityMailReviewCloseService } from './auth-identity-mail-review-close.service';
import { AuthIdentityMailDiagnosticService } from './auth-identity-mail-diagnostic.service';
import { AuthIdentityMailValidationClient } from './auth-identity-mail-validation.client';
import { AuthIdentityMailOmissionService } from './auth-identity-mail-omission.service';

@Controller('banco-docentes/identidad/correos/revisiones')
@UseGuards(JwtAuthGuard,BancoDocentesRolesGuard)
@Roles('GESTION_PROFESORAL','SUPER_ADMIN','super_admin','ADMIN')
@RequireRundPermissions(RUND_PERMISSIONS.MANAGE)
export class AuthIdentityMailReviewController {
  constructor(private readonly reviews: AuthIdentityMailReviewService,
    @Optional() private readonly closures?: AuthIdentityMailReviewCloseService,
    @Optional() private readonly diagnostics?: AuthIdentityMailDiagnosticService,
    @Optional() private readonly omissions?: AuthIdentityMailOmissionService) {}
  private actor(req: any) {
    const id = req?.user?.sub || req?.user?.userId || req?.user?.id;
    if (typeof id !== 'string' || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id))
      throw new UnauthorizedException('La sesion no identifica al responsable.');
    return { actorId: id.toLowerCase(), roles: getRequestRoleCodes(req.user), expiresAt: req.user.exp };
  }
  private empty(body: unknown) {
    if (body !== undefined && (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length))
      throw new BadRequestException('La revision no admite campos del solicitante.');
  }
  @Get()
  @Header('Cache-Control','private, no-store')
  listar(@Query() query: unknown, @Req() req: any) { return this.reviews.listar(query,this.actor(req)); }
  @Get(':casoId')
  @Header('Cache-Control','private, no-store')
  consultar(@Param('casoId') id: string, @Req() req: any) { return this.reviews.consultar(id,this.actor(req)); }
  @Post('por-intencion/:intencionId')
  @HttpCode(200)
  @Header('Cache-Control','private, no-store')
  registrar(@Param('intencionId') id: string, @Body() body: unknown, @Req() req: any) {
    this.empty(body); return this.reviews.registrar(id,this.actor(req));
  }
  @Post('por-intencion/:intencionId/revisar-resultado-incierto')
  @HttpCode(200)
  @Header('Cache-Control','private, no-store')
  registrarIncierto(@Param('intencionId') id: string, @Body() body: unknown, @Req() req: any) {
    this.empty(body);return this.reviews.registrarIncierto(id,this.actor(req));
  }
  @Post(':casoId/asumir')
  @HttpCode(200)
  @Header('Cache-Control','private, no-store')
  asumir(@Param('casoId') id: string, @Body() body: unknown, @Req() req: any) {
    this.empty(body); return this.reviews.asumir(id,this.actor(req));
  }
  @Get(':casoId/cierre')
  @Header('Cache-Control','private, no-store')
  consultarCierre(@Param('casoId') id: string, @Req() req: any) {
    const actor=this.actor(req);if(!this.closures)throw new ServiceUnavailableException('El cierre de revision no esta disponible.');
    return this.closures.consultar(id,actor);
  }
  @Post(':casoId/cerrar')
  @HttpCode(200)
  @Header('Cache-Control','private, no-store')
  cerrar(@Param('casoId') id: string, @Body() body: unknown, @Req() req: any) {
    this.empty(body);const actor=this.actor(req);if(!this.closures)throw new ServiceUnavailableException('El cierre de revision no esta disponible.');
    return this.closures.cerrar(id,actor);
  }
  @Post('por-intencion/:intencionId/diagnosticar')
  @HttpCode(200)
  @Header('Cache-Control','private, no-store')
  diagnosticar(@Param('intencionId') id: string, @Body() body: unknown, @Req() req: any) {
    this.empty(body);const actor=this.actor(req);if(!this.diagnostics)throw new ServiceUnavailableException('El diagnostico de correo no esta disponible.');
    return this.diagnostics.diagnosticar(id,actor);
  }
  @Get('por-intencion/:intencionId/omision')
  @Header('Cache-Control','private, no-store')
  consultarOmision(@Param('intencionId') id: string, @Req() req: any) {
    const actor=this.actor(req);if(!this.omissions)throw new ServiceUnavailableException('La omision de correo no esta disponible.');
    return this.omissions.consultar(id,actor);
  }
  @Post('por-intencion/:intencionId/omitir-por-vigencia')
  @HttpCode(200)
  @Header('Cache-Control','private, no-store')
  omitirPorVigencia(@Param('intencionId') id: string, @Body() body: unknown, @Req() req: any) {
    this.empty(body);const actor=this.actor(req);if(!this.omissions)throw new ServiceUnavailableException('La omision de correo no esta disponible.');
    return this.omissions.omitir(id,actor);
  }
}

// Módulo preparatorio fuera de AppModule. Cierre auditable sin conciliación o envío.
@Module({ imports:[AuthModule],controllers:[AuthIdentityMailReviewController],
  providers:[AuthIdentityMailReviewService,AuthIdentityMailReviewCloseService,AuthIdentityMailDiagnosticService,AuthIdentityMailValidationClient,AuthIdentityMailOmissionService,BancoDocentesRolesGuard],
  exports:[AuthIdentityMailReviewService,AuthIdentityMailReviewCloseService,AuthIdentityMailDiagnosticService,AuthIdentityMailOmissionService] })
export class AuthIdentityMailReviewModule {}
