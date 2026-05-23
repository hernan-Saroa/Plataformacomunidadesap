import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { ControlInternoPermissions as CIP } from '../../common/permissions.constants';
import { ConfiguracionesProfesionalesOCIGService } from './configuraciones-profesionales-ocig.service';
import {
  CreateConfiguracionProfesionalOCIGDto,
  UpdateConfiguracionProfesionalOCIGDto,
  ConfiguracionProfesionalOCIGResponseDto,
} from './dto/configuracion-profesional-ocig.dto';

@Controller('configuraciones/profesionales-ocig')
export class ConfiguracionesProfesionalesOCIGController {
  constructor(
    private readonly service: ConfiguracionesProfesionalesOCIGService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.CONFIG_MANAGE)
  async findAll(
    @Query('includeInactive') includeInactive?: string,
  ): Promise<ConfiguracionProfesionalOCIGResponseDto[]> {
    return this.service.findAll(includeInactive === 'true');
  }

  /**
   * Roles OCIG para configurar el equipo operativo (roles auth con permisos del módulo CI).
   */
  @Get('roles-ocig')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.CONFIG_MANAGE)
  async getRolesOCIG(): Promise<Array<{ name: string; description: string }>> {
    return this.service.getRolesOCIG();
  }

  /**
   * Obtener especialidades OCIG disponibles desde la BD
   */
  @Get('especialidades')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.CONFIG_MANAGE)
  async getEspecialidades(): Promise<Array<{ id: number; nombre: string; descripcion: string }>> {
    return this.service.getEspecialidadesOCIG();
  }

  /**
   * Personas candidatas: usuario activo con permiso en el módulo control-interno
   * que aún no están en configuracion_profesionales_ocig (activos).
   */
  @Get('candidatos')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.CONFIG_MANAGE)
  async buscarCandidatos(
    @Query('busqueda') busqueda?: string,
  ): Promise<any[]> {
    return this.service.buscarPersonasCandidatas(busqueda);
  }

  @Get('lideres')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.CONFIG_MANAGE)
  async findLideresPotenciales(): Promise<
    ConfiguracionProfesionalOCIGResponseDto[]
  > {
    return this.service.findLideresPotenciales();
  }

  /**
   * Comité de aprobación del PAI: personas con permiso plan-anual.approve.
   */
  @Get('aprobadores-plan-anual')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(
    CIP.PLAN_ANUAL_VIEW,
    CIP.PLAN_ANUAL_CREATE,
    CIP.PLAN_ANUAL_EDIT,
    CIP.PLAN_ANUAL_APPROVE,
  )
  async buscarAprobadoresPlanAnual(
    @Query('busqueda') busqueda?: string,
  ): Promise<any[]> {
    return this.service.buscarAprobadoresPlanAnual(busqueda);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.CONFIG_MANAGE)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ConfiguracionProfesionalOCIGResponseDto> {
    return this.service.findOne(id);
  }

  @Get('tercero/:idTercero')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.CONFIG_MANAGE)
  async findByIdTercero(
    @Param('idTercero') idTercero: string,
  ): Promise<ConfiguracionProfesionalOCIGResponseDto | null> {
    return this.service.findByIdTercero(idTercero);
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.CONFIG_MANAGE)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createDto: CreateConfiguracionProfesionalOCIGDto,
  ): Promise<ConfiguracionProfesionalOCIGResponseDto> {
    return this.service.create(createDto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.CONFIG_MANAGE)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateConfiguracionProfesionalOCIGDto,
  ): Promise<ConfiguracionProfesionalOCIGResponseDto> {
    return this.service.update(id, updateDto);
  }

  @Put('tercero/:idTercero')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.CONFIG_MANAGE)
  async updateByIdTercero(
    @Param('idTercero') idTercero: string,
    @Body() updateDto: UpdateConfiguracionProfesionalOCIGDto,
  ): Promise<ConfiguracionProfesionalOCIGResponseDto> {
    return this.service.updateByIdTercero(idTercero, updateDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.CONFIG_MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.service.remove(id);
  }

  @Delete('tercero/:idTercero')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.CONFIG_MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeByIdTercero(
    @Param('idTercero') idTercero: string,
  ): Promise<void> {
    return this.service.removeByIdTercero(idTercero);
  }
}
