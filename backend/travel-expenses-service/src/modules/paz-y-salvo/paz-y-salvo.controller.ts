import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req, StreamableFile, UseGuards } from '@nestjs/common';
import { IsString, IsUUID, Matches } from 'class-validator';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/permissions.guard';
import { Permissions } from '../../common/permissions.decorator';
import { PazYSalvoService, UsuarioFirma } from './paz-y-salvo.service';

export class SolicitarPazYSalvoDto { @IsUUID() comisionadoId: string; }
export class FirmarPazYSalvoDto { @IsString() @Matches(/^\d{6}$/) code: string; }
type Peticion = Request & { user: UsuarioFirma };

@Controller('paz-y-salvos')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('travel_expenses:paz_y_salvo.manage')
export class PazYSalvoController {
  constructor(private readonly service: PazYSalvoService) {}

  @Get('personas')
  buscar(@Query('q') q = '') { return this.service.buscarPersonas(q); }

  @Get('personas/:id')
  persona(@Param('id', ParseUUIDPipe) id: string, @Req() req: Peticion) {
    return this.service.consultarPersona(id, req.user);
  }

  @Post()
  solicitar(@Body() dto: SolicitarPazYSalvoDto, @Req() req: Peticion) {
    return this.service.solicitar(dto.comisionadoId, req.user);
  }

  @Get(':id')
  detalle(@Param('id', ParseUUIDPipe) id: string, @Req() req: Peticion) {
    return this.service.detalle(id, req.user);
  }

  @Post(':id/otp')
  otp(@Param('id', ParseUUIDPipe) id: string, @Req() req: Peticion) {
    return this.service.solicitarOtp(id, req.user, this.credenciales(req));
  }

  @Post(':id/firmar')
  firmar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: FirmarPazYSalvoDto, @Req() req: Peticion) {
    return this.service.firmar(id, dto.code, req.user, this.credenciales(req));
  }

  @Get(':id/archivo')
  async archivo(@Param('id', ParseUUIDPipe) id: string, @Req() req: Peticion) {
    return new StreamableFile(await this.service.descargar(id, req.user), {
      type: 'application/pdf', disposition: `attachment; filename="paz-y-salvo-${id}.pdf"`,
    });
  }

  private credenciales(req: Peticion) {
    return { ...(req.headers.authorization ? { authorization: req.headers.authorization } : {}),
      ...(req.headers.cookie ? { cookie: req.headers.cookie } : {}) };
  }
}
