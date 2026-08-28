import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { TravelExpensesService } from './travel-expenses.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/permissions.guard';
import { Permissions } from '../../common/permissions.decorator';
import { CreateSolicitudDto } from '../../dto/create-solicitud.dto';
import { UploadDocumentoDto } from '../../dto/upload-documento.dto';
import { getClientIp } from '../../common/ip.util';

interface AuthenticatedRequest extends Request {
  user?: { userId: string; roles?: string[] };
}

const SUPER_ADMIN_ROLES = [
  'ADMIN',
  'SUPER_ADMIN',
  'ADMINISTRATIVO',
  'Super Administrador',
  'SUPER_ADMINISTRADOR',
  'super_administrador',
];

function isSuperAdmin(user: AuthenticatedRequest['user']): boolean {
  if (!user?.roles?.length) return false;
  return user.roles.some((role) => {
    if (typeof role !== 'string') return false;
    const normalized = role.toUpperCase().replace(/\s+/g, '_');
    return SUPER_ADMIN_ROLES.includes(normalized) || SUPER_ADMIN_ROLES.includes(role.toUpperCase());
  });
}

@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TravelExpensesController {
  constructor(private readonly service: TravelExpensesService) {}

  @Get('solicitudes')
  obtenerSolicitudes(@Req() req: AuthenticatedRequest) {
    const usuarioId = req.user?.userId;
    const superAdmin = isSuperAdmin(req.user);
    return this.service.obtenerSolicitudes(usuarioId, superAdmin);
  }

  @Get('comisionados/:documento')
  consultarComisionado(@Param('documento') documento: string) {
    return this.service.consultarComisionado(documento);
  }

  @Post('requests')
  @Permissions('travel_expenses:create_request')
  crearSolicitud(@Body() dto: CreateSolicitudDto, @Req() req: AuthenticatedRequest) {
    const usuarioAutenticado = req.user?.userId;
    if (usuarioAutenticado) {
      dto.creadoPorUsuarioId = usuarioAutenticado;
    }
    if (!dto.ipRegistroHabeasData) {
      dto.ipRegistroHabeasData = getClientIp(req);
    }
    return this.service.crearSolicitud(dto);
  }

  @Post('requests/:id/documentos')
  @Permissions('travel_expenses:create_request')
  subirDocumento(
    @Param('id') id: string,
    @Body() dto: UploadDocumentoDto,
  ) {
    return this.service.subirDocumento(id, dto);
  }
}
