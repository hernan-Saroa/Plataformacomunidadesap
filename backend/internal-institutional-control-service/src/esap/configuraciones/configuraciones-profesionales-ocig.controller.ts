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
  ParseIntPipe,
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
   * Buscar personas candidatas de auth.personas que pueden ser configuradas como profesionales OCIG
   * Devuelve personas que AÚN NO están en configuracion_profesionales_ocig
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
    @Param('idTercero', ParseIntPipe) idTercero: number,
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
    @Param('idTercero', ParseIntPipe) idTercero: number,
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
    @Param('idTercero', ParseIntPipe) idTercero: number,
  ): Promise<void> {
    return this.service.removeByIdTercero(idTercero);
  }
}
