import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DocentesService } from './docentes.service';
import { CreateDocenteDto } from './dto/create-docente.dto';
import { UpdateDocenteDto } from './dto/update-docente.dto';
import { FilterDocenteDto } from './dto/filter-docente.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/permissions.guard';
import { RequirePermissions } from '../../auth/auth.decorators';
import { CurrentUser, AuthenticatedUser } from '../../auth/current-user.decorator';

@ApiTags('Docentes RUND')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('docentes')
export class DocentesController {
  constructor(private readonly docentesService: DocentesService) {}

  @Get()
  @RequirePermissions('rund.view')
  @ApiOperation({ summary: 'Consultar listado paginado y filtrado de docentes RUND' })
  async findAll(@Query() filter: FilterDocenteDto) {
    return this.docentesService.findAll(filter);
  }

  @Get(':id')
  @RequirePermissions('rund.view')
  @ApiOperation({ summary: 'Obtener información 360 de un docente por ID' })
  async findById(@Param('id') id: string) {
    return this.docentesService.findById(id);
  }

  @Get('documento/:numeroDocumento')
  @RequirePermissions('rund.view')
  @ApiOperation({ summary: 'Consultar docente por número de documento' })
  async findByDocumento(@Param('numeroDocumento') numeroDocumento: string) {
    return this.docentesService.findByDocumento(numeroDocumento);
  }

  @Post()
  @RequirePermissions('rund.create')
  @ApiOperation({ summary: 'Registrar un nuevo docente en el RUND' })
  async create(
    @Body() createDto: CreateDocenteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.docentesService.create(createDto, user?.id);
  }

  @Put(':id')
  @RequirePermissions('rund.edit')
  @ApiOperation({ summary: 'Actualizar perfil general del docente' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateDocenteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.docentesService.update(id, updateDto, user?.id);
  }

  @Patch(':id/estado')
  @RequirePermissions('rund.admin')
  @ApiOperation({ summary: 'Cambiar el estado oficial en el RUND' })
  async changeEstado(
    @Param('id') id: string,
    @Body('estado') estado: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.docentesService.changeEstado(id, estado, user?.id);
  }

  @Delete(':id')
  @RequirePermissions('rund.admin')
  @ApiOperation({ summary: 'Desactivar docente del RUND' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.docentesService.remove(id, user?.id);
    return { success: true, message: 'Docente desactivado correctamente' };
  }
}
