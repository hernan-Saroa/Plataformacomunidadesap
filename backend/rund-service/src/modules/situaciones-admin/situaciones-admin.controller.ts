import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SituacionesAdminService } from './situaciones-admin.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/permissions.guard';
import { RequirePermissions } from '../../auth/auth.decorators';
import { CurrentUser, AuthenticatedUser } from '../../auth/current-user.decorator';

@ApiTags('Situaciones Administrativas y Novedades')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('situaciones-admin')
export class SituacionesAdminController {
  constructor(private readonly situacionesService: SituacionesAdminService) {}

  @Get('docente/:idDocente')
  @RequirePermissions('rund.view')
  @ApiOperation({ summary: 'Obtener historial de situaciones administrativas del docente' })
  async getByDocente(@Param('idDocente') idDocente: string) {
    return this.situacionesService.findAllByDocente(idDocente);
  }

  @Get('docente/:idDocente/vigentes')
  @RequirePermissions('rund.view')
  @ApiOperation({ summary: 'Obtener situaciones administrativas actualmente vigentes' })
  async getActiveByDocente(@Param('idDocente') idDocente: string) {
    return this.situacionesService.findActiveByDocente(idDocente);
  }

  @Post('docente/:idDocente')
  @RequirePermissions('rund.admin')
  @ApiOperation({ summary: 'Registrar novedad o situación administrativa' })
  async create(
    @Param('idDocente') idDocente: string,
    @Body() data: any,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.situacionesService.create(idDocente, data, user?.id);
  }

  @Put(':id')
  @RequirePermissions('rund.admin')
  @ApiOperation({ summary: 'Actualizar novedad o situación administrativa' })
  async update(@Param('id') id: string, @Body() data: any) {
    return this.situacionesService.update(id, data);
  }

  @Delete(':id')
  @RequirePermissions('rund.admin')
  @ApiOperation({ summary: 'Eliminar situación administrativa' })
  async remove(@Param('id') id: string) {
    return this.situacionesService.remove(id);
  }
}
