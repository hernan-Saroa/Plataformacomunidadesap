import { BadRequestException, Body, Controller, Get, Header, HttpCode, Module, Param, Post, Query, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/auth.decorators';
import { RUND_BANK_PERMISSIONS } from '../auth/rund-permission-catalog';
import { AuthIdentityReviewService } from './auth-identity-review.service';

@UseGuards(JwtAuthGuard,PermissionsGuard)
@RequirePermissions(RUND_BANK_PERMISSIONS.MANAGE)
@Controller('banco-docentes/identidad/revisiones')
export class AuthIdentityReviewController {
  constructor(private readonly reviews:AuthIdentityReviewService) {}
  @Get()
  @Header('Cache-Control','private, no-store')
  listar(@Query() query:unknown) {return this.reviews.listar(query);}
  @Get(':casoId')
  @Header('Cache-Control','private, no-store')
  consultar(@Param('casoId') id:string) {return this.reviews.consultar(id);}
  @Post(':casoId/asumir')
  @HttpCode(200)
  @Header('Cache-Control','private, no-store')
  asumir(@Param('casoId') id:string,@Body() body:unknown,@Req() req:any) {
    if(body!==undefined&&(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).length))
      throw new BadRequestException('La asignacion no admite campos del solicitante.');
    const actor=req?.user?.sub||req?.user?.userId||req?.user?.id;
    if(typeof actor!=='string'||!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(actor))throw new UnauthorizedException('La sesion no identifica un responsable.');
    return this.reviews.asumir(id,actor);
  }
}

// Preparacion inactiva; ninguna decision de cierre o borrado de identidad se expone.
@Module({imports:[AuthModule],controllers:[AuthIdentityReviewController],providers:[AuthIdentityReviewService],exports:[AuthIdentityReviewService]})
export class AuthIdentityReviewModule {}
