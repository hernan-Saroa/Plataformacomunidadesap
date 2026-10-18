import { BadRequestException, Body, Controller, Get, Header, HttpCode, HttpException, Module, Optional, Param, Post, Req, ServiceUnavailableException, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { BancoDocentesRolesGuard } from '../modules/banco-docentes/banco-docentes-roles.guard';
import { RequireRundPermissions, RUND_PERMISSIONS } from '../modules/banco-docentes/rund-permissions';
import { canViewRundSensitiveData, getRequestRoleCodes } from '../modules/banco-docentes/banco-docentes-sensitive-data';
import { AuthIdentityRequestModule } from './auth-identity-request.service';
import { AuthIdentityCoordinationModule } from './auth-identity-coordination.service';
import { AuthIdentityValidationModule } from './auth-identity-validation.client';
import { RundCatalogosModule } from './rund-catalogos.client';
import { AuthIdentityManualEntryService } from './auth-identity-manual-entry.service';
import { AuthIdentityExecutionModule } from './auth-identity-execution.service';
import { AuthIdentityManualExecutionService } from './auth-identity-manual-execution.service';
import { AuthIdentityManualCaptureService } from './auth-identity-manual-capture.service';
import { AuthIdentityManualAbandonService } from './auth-identity-manual-abandon.service';
import { AuthIdentityManualCloseService } from './auth-identity-manual-close.service';
import { AuthIdentityManualMailStatusService } from './auth-identity-manual-mail-status.service';
import { AuthIdentityManualPreviewService } from './auth-identity-manual-preview.service';

@Controller('banco-docentes/identidad/solicitudes-manuales')
@UseGuards(JwtAuthGuard,BancoDocentesRolesGuard)
@Roles('GESTION_PROFESORAL','SUPER_ADMIN','super_admin','ADMIN')
@RequireRundPermissions(RUND_PERMISSIONS.MANAGE)
export class AuthIdentityManualEntryController {
  constructor(private readonly entries:AuthIdentityManualEntryService,@Optional() private readonly executions?:AuthIdentityManualExecutionService,
    @Optional() private readonly captures?:AuthIdentityManualCaptureService,@Optional() private readonly abandonments?:AuthIdentityManualAbandonService,
    @Optional() private readonly closures?:AuthIdentityManualCloseService,
    @Optional() private readonly mailStatuses?:AuthIdentityManualMailStatusService,
    @Optional() private readonly previews?:AuthIdentityManualPreviewService) {}
  private async response(work:()=>Promise<unknown>) {
    try{return await work();}catch(error){
      if(error instanceof HttpException)throw error;
      // Un QueryFailedError puede contener el formulario en parameters; no entregarlo al logger HTTP.
      throw new ServiceUnavailableException('No fue posible confirmar la preparacion manual.');
    }
  }
  private actor(req:any) {
    const id=req?.user?.sub||req?.user?.userId||req?.user?.id;
    if(typeof id!=='string'||!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id))throw new UnauthorizedException('La sesion no identifica al operador.');
    return {actorId:id.toLowerCase(),roles:getRequestRoleCodes(req.user),fullAccess:canViewRundSensitiveData(req.user),ip:req.ip};
  }
  @Post('previsualizar')
  @HttpCode(200)
  @Header('Cache-Control','private, no-store')
  previsualizar(@Body() body:unknown,@Req() req:any){
    if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).length!==1||!Object.prototype.hasOwnProperty.call(body,'formulario'))
      throw new BadRequestException('Se requiere exclusivamente el formulario manual.');
    const actor=this.actor(req);return this.response(()=>{
      if(!this.previews)throw new ServiceUnavailableException('La previsualizacion manual no esta disponible.');
      return this.previews.previsualizar({...actor,expiresAt:req?.user?.exp},(body as {formulario:unknown}).formulario);
    });
  }
  @Post(':solicitudId/preparar')
  @HttpCode(200)
  @Header('Cache-Control','private, no-store')
  preparar(@Param('solicitudId') id:string,@Body() body:any,@Req() req:any) {
    if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).length!==1||!Object.prototype.hasOwnProperty.call(body,'formulario'))
      throw new BadRequestException('Se requiere exclusivamente el formulario manual.');
    const actor=this.actor(req);return this.response(()=>this.entries.preparar(id,actor,body.formulario));
  }
  @Post(':solicitudId/reanudar-preparacion')
  @HttpCode(200)
  @Header('Cache-Control','private, no-store')
  reanudar(@Param('solicitudId') id:string,@Body() body:unknown,@Req() req:any) {
    if(body!==undefined&&(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).length))throw new BadRequestException('La recuperacion no admite campos.');
    const actor=this.actor(req);return this.response(()=>this.entries.reanudar(id,actor.actorId));
  }
  @Get(':solicitudId')
  @Header('Cache-Control','private, no-store')
  consultar(@Param('solicitudId') id:string,@Req() req:any) {const actor=this.actor(req);return this.response(()=>this.entries.consultar(id,actor.actorId));}
  @Post(':solicitudId/ejecutar')
  @HttpCode(200)
  @Header('Cache-Control','private, no-store')
  ejecutar(@Param('solicitudId') id:string,@Body() body:unknown,@Req() req:any) {
    if(body!==undefined&&(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).length))throw new BadRequestException('La ejecucion no admite campos.');
    const actor=this.actor(req);
    return this.response(()=>{
      if(!this.executions)throw new ServiceUnavailableException('La ejecucion manual no esta disponible.');
      return this.executions.ejecutar(id,{...actor,expiresAt:req?.user?.exp});
    });
  }
  @Get(':solicitudId/ejecucion')
  @Header('Cache-Control','private, no-store')
  consultarEjecucion(@Param('solicitudId') id:string,@Req() req:any) {
    const actor=this.actor(req);return this.response(()=>{
      if(!this.executions)throw new ServiceUnavailableException('La ejecucion manual no esta disponible.');
      return this.executions.consultar(id,actor.actorId);
    });
  }
  @Get(':solicitudId/captura')
  @Header('Cache-Control','private, no-store')
  revisarCaptura(@Param('solicitudId') id:string,@Req() req:any) {
    const actor=this.actor(req);return this.response(()=>{
      if(!this.captures)throw new ServiceUnavailableException('La revision manual no esta disponible.');
      return this.captures.consultar(id,{...actor,expiresAt:req?.user?.exp});
    });
  }
  @Post(':solicitudId/abandonar')
  @HttpCode(200)
  @Header('Cache-Control','private, no-store')
  abandonar(@Param('solicitudId') id:string,@Body() body:unknown,@Req() req:any) {
    if(body!==undefined&&(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).length))throw new BadRequestException('El abandono no admite campos.');
    const actor=this.actor(req);return this.response(()=>{
      if(!this.abandonments)throw new ServiceUnavailableException('El abandono manual no esta disponible.');
      return this.abandonments.abandonar(id,{...actor,expiresAt:req?.user?.exp});
    });
  }
  @Get(':solicitudId/abandono')
  @Header('Cache-Control','private, no-store')
  consultarAbandono(@Param('solicitudId') id:string,@Req() req:any) {
    const actor=this.actor(req);return this.response(()=>{
      if(!this.abandonments)throw new ServiceUnavailableException('El abandono manual no esta disponible.');
      return this.abandonments.consultar(id,{...actor,expiresAt:req?.user?.exp});
    });
  }
  @Post(':solicitudId/cerrar')
  @HttpCode(200)
  @Header('Cache-Control','private, no-store')
  cerrar(@Param('solicitudId') id:string,@Body() body:unknown,@Req() req:any) {
    if(body!==undefined&&(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).length))throw new BadRequestException('El cierre no admite campos.');
    const actor=this.actor(req);return this.response(()=>{
      if(!this.closures)throw new ServiceUnavailableException('El cierre manual no esta disponible.');
      return this.closures.cerrar(id,{...actor,expiresAt:req?.user?.exp});
    });
  }
  @Get(':solicitudId/cierre')
  @Header('Cache-Control','private, no-store')
  consultarCierre(@Param('solicitudId') id:string,@Req() req:any) {
    const actor=this.actor(req);return this.response(()=>{
      if(!this.closures)throw new ServiceUnavailableException('El cierre manual no esta disponible.');
      return this.closures.consultar(id,{...actor,expiresAt:req?.user?.exp});
    });
  }
  @Get(':solicitudId/correo')
  @Header('Cache-Control','private, no-store')
  consultarCorreo(@Param('solicitudId') id:string,@Req() req:any) {
    const actor=this.actor(req);return this.response(()=>{
      if(!this.mailStatuses)throw new ServiceUnavailableException('La consulta de correo manual no esta disponible.');
      return this.mailStatuses.consultar(id,{...actor,expiresAt:req?.user?.exp});
    });
  }
}

// Fuera de AppModule: activar exige cerrar correo, revisiones y aceptacion.
@Module({imports:[AuthModule,AuthIdentityRequestModule,AuthIdentityCoordinationModule,AuthIdentityValidationModule,RundCatalogosModule,AuthIdentityExecutionModule],
  controllers:[AuthIdentityManualEntryController],providers:[AuthIdentityManualEntryService,AuthIdentityManualExecutionService,AuthIdentityManualCaptureService,AuthIdentityManualAbandonService,AuthIdentityManualCloseService,AuthIdentityManualMailStatusService,AuthIdentityManualPreviewService,BancoDocentesRolesGuard]})
export class AuthIdentityManualEntryModule {}
