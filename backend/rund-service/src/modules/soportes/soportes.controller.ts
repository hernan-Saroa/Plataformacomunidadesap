import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SoportesService } from './soportes.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/permissions.guard';
import { RequirePermissions } from '../../auth/auth.decorators';
import { CurrentUser, AuthenticatedUser } from '../../auth/current-user.decorator';

@ApiTags('Soportes y Validación Documental RUND')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('soportes')
export class SoportesController {
  constructor(private readonly soportesService: SoportesService) {}

  @Get('docente/:idDocente')
  @RequirePermissions('rund.view')
  @ApiOperation({ summary: 'Obtener expediente de soportes documentales del docente' })
  async findByDocente(@Param('idDocente') idDocente: string) {
    return this.soportesService.findByDocente(idDocente);
  }

  @Post()
  @RequirePermissions('rund.edit')
  @ApiOperation({ summary: 'Registrar nuevo soporte documental' })
  async create(@Body() data: any) {
    return this.soportesService.create(data);
  }

  @Patch(':id/validar')
  @RequirePermissions('rund.validate')
  @ApiOperation({ summary: 'Validar (Aprobar/Rechazar/Observar) un soporte documental' })
  async validate(
    @Param('id') id: string,
    @Body('estadoValidacion') estadoValidacion: 'APROBADO' | 'RECHAZADO' | 'OBSERVADO',
    @Body('observaciones') observaciones?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.soportesService.validateSoporte(id, estadoValidacion, observaciones, user?.id);
  }

  @Delete(':id')
  @RequirePermissions('rund.edit')
  @ApiOperation({ summary: 'Eliminar soporte documental' })
  async delete(@Param('id') id: string) {
    return this.soportesService.delete(id);
  }
}
