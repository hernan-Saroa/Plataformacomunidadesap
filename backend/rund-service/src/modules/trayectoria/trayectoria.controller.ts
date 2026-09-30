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
import { TrayectoriaService } from './trayectoria.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/permissions.guard';
import { RequirePermissions } from '../../auth/auth.decorators';

@ApiTags('Trayectoria Académica y Méritos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('trayectoria')
export class TrayectoriaController {
  constructor(private readonly trayectoriaService: TrayectoriaService) {}

  // ================= FORMACION =================
  @Get('docente/:idDocente/formacion')
  @RequirePermissions('rund.view')
  @ApiOperation({ summary: 'Obtener formación académica del docente' })
  async getFormaciones(@Param('idDocente') idDocente: string) {
    return this.trayectoriaService.getFormacionesByDocente(idDocente);
  }

  @Post('docente/:idDocente/formacion')
  @RequirePermissions('rund.edit')
  @ApiOperation({ summary: 'Agregar título o formación académica' })
  async addFormacion(@Param('idDocente') idDocente: string, @Body() data: any) {
    return this.trayectoriaService.addFormacion(idDocente, data);
  }

  @Put('formacion/:idFormacion')
  @RequirePermissions('rund.edit')
  @ApiOperation({ summary: 'Actualizar título o formación académica' })
  async updateFormacion(@Param('idFormacion') idFormacion: string, @Body() data: any) {
    return this.trayectoriaService.updateFormacion(idFormacion, data);
  }

  @Delete('formacion/:idFormacion')
  @RequirePermissions('rund.edit')
  @ApiOperation({ summary: 'Eliminar título o formación académica' })
  async deleteFormacion(@Param('idFormacion') idFormacion: string) {
    return this.trayectoriaService.deleteFormacion(idFormacion);
  }

  // ================= EXPERIENCIA =================
  @Get('docente/:idDocente/experiencia')
  @RequirePermissions('rund.view')
  @ApiOperation({ summary: 'Obtener experiencia docente y profesional' })
  async getExperiencias(@Param('idDocente') idDocente: string) {
    return this.trayectoriaService.getExperienciasByDocente(idDocente);
  }

  @Post('docente/:idDocente/experiencia')
  @RequirePermissions('rund.edit')
  @ApiOperation({ summary: 'Agregar experiencia laboral o docente' })
  async addExperiencia(@Param('idDocente') idDocente: string, @Body() data: any) {
    return this.trayectoriaService.addExperiencia(idDocente, data);
  }

  @Put('experiencia/:idExperiencia')
  @RequirePermissions('rund.edit')
  @ApiOperation({ summary: 'Actualizar experiencia laboral o docente' })
  async updateExperiencia(@Param('idExperiencia') idExperiencia: string, @Body() data: any) {
    return this.trayectoriaService.updateExperiencia(idExperiencia, data);
  }

  @Delete('experiencia/:idExperiencia')
  @RequirePermissions('rund.edit')
  @ApiOperation({ summary: 'Eliminar experiencia laboral o docente' })
  async deleteExperiencia(@Param('idExperiencia') idExperiencia: string) {
    return this.trayectoriaService.deleteExperiencia(idExperiencia);
  }

  // ================= PRODUCCION =================
  @Get('docente/:idDocente/produccion')
  @RequirePermissions('rund.view')
  @ApiOperation({ summary: 'Obtener producción intelectual e investigación' })
  async getProducciones(@Param('idDocente') idDocente: string) {
    return this.trayectoriaService.getProduccionesByDocente(idDocente);
  }

  @Post('docente/:idDocente/produccion')
  @RequirePermissions('rund.edit')
  @ApiOperation({ summary: 'Agregar producción intelectual' })
  async addProduccion(@Param('idDocente') idDocente: string, @Body() data: any) {
    return this.trayectoriaService.addProduccion(idDocente, data);
  }

  @Put('produccion/:idProduccion')
  @RequirePermissions('rund.edit')
  @ApiOperation({ summary: 'Actualizar producción intelectual' })
  async updateProduccion(@Param('idProduccion') idProduccion: string, @Body() data: any) {
    return this.trayectoriaService.updateProduccion(idProduccion, data);
  }

  @Delete('produccion/:idProduccion')
  @RequirePermissions('rund.edit')
  @ApiOperation({ summary: 'Eliminar producción intelectual' })
  async deleteProduccion(@Param('idProduccion') idProduccion: string) {
    return this.trayectoriaService.deleteProduccion(idProduccion);
  }
}
