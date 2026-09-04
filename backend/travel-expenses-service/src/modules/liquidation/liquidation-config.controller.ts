import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { LiquidationConfigService } from './liquidation-config.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/permissions.guard';
import { Permissions } from '../../common/permissions.decorator';
import {
  CreateEscalaViaticoDto,
  UpdateEscalaViaticoDto,
} from '../../dto/liquidation/escala-viatico.dto';
import {
  CreateTarifaInvestigadorDto,
  UpdateTarifaInvestigadorDto,
} from '../../dto/liquidation/tarifa-investigador.dto';
import {
  CreateTarifaRegionalExcepcionDto,
  UpdateTarifaRegionalExcepcionDto,
} from '../../dto/liquidation/tarifa-regional-excepcion.dto';
import { UpdateLiquidationParamsDto } from '../../dto/liquidation/liquidation-params.dto';

@Controller('liquidation/config')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LiquidationConfigController {
  constructor(private readonly configService: LiquidationConfigService) {}

  // ==================== ESCALAS ====================

  @Get('escalas')
  @Permissions('travel_expenses:read')
  obtenerEscalas() {
    return this.configService.obtenerEscalas();
  }

  @Post('escalas')
  @Permissions('travel_expenses:manage_config')
  crearEscala(@Body() dto: CreateEscalaViaticoDto) {
    return this.configService.crearEscala(dto);
  }

  @Put('escalas/:id')
  @Permissions('travel_expenses:manage_config')
  actualizarEscala(
    @Param('id') id: string,
    @Body() dto: UpdateEscalaViaticoDto,
  ) {
    return this.configService.actualizarEscala(Number(id), dto);
  }

  @Delete('escalas/:id')
  @Permissions('travel_expenses:manage_config')
  async eliminarEscala(@Param('id') id: string) {
    return this.configService.eliminarEscala(Number(id));
  }

  // ==================== TARIFAS INVESTIGADOR ====================

  @Get('tarifas-investigadores')
  @Permissions('travel_expenses:read')
  obtenerTarifasInvestigadores() {
    return this.configService.obtenerTarifasInvestigadores();
  }

  @Post('tarifas-investigadores')
  @Permissions('travel_expenses:manage_config')
  crearTarifaInvestigador(@Body() dto: CreateTarifaInvestigadorDto) {
    return this.configService.crearTarifaInvestigador(dto);
  }

  @Put('tarifas-investigadores/:id')
  @Permissions('travel_expenses:manage_config')
  actualizarTarifaInvestigador(
    @Param('id') id: string,
    @Body() dto: UpdateTarifaInvestigadorDto,
  ) {
    return this.configService.actualizarTarifaInvestigador(Number(id), dto);
  }

  @Delete('tarifas-investigadores/:id')
  @Permissions('travel_expenses:manage_config')
  async eliminarTarifaInvestigador(@Param('id') id: string) {
    return this.configService.eliminarTarifaInvestigador(Number(id));
  }

  // ==================== EXCEPCIONES REGIONALES ====================

  @Get('excepciones-regionales')
  @Permissions('travel_expenses:read')
  obtenerExcepcionesRegionales() {
    return this.configService.obtenerExcepcionesRegionales();
  }

  @Get('catalogo-departamentos')
  @Permissions('travel_expenses:read')
  obtenerCatalogoDepartamentos() {
    return this.configService.obtenerCatalogoDepartamentos();
  }

  @Post('excepciones-regionales')
  @Permissions('travel_expenses:manage_config')
  crearExcepcionRegional(@Body() dto: CreateTarifaRegionalExcepcionDto) {
    return this.configService.crearExcepcionRegional(dto);
  }

  @Put('excepciones-regionales/:id')
  @Permissions('travel_expenses:manage_config')
  actualizarExcepcionRegional(
    @Param('id') id: string,
    @Body() dto: UpdateTarifaRegionalExcepcionDto,
  ) {
    return this.configService.actualizarExcepcionRegional(Number(id), dto);
  }

  @Delete('excepciones-regionales/:id')
  @Permissions('travel_expenses:manage_config')
  async eliminarExcepcionRegional(@Param('id') id: string) {
    return this.configService.eliminarExcepcionRegional(Number(id));
  }

  // ==================== PARÁMETROS GLOBALES ====================

  @Get('parametros')
  @Permissions('travel_expenses:read')
  obtenerParametros() {
    return this.configService.obtenerParametros();
  }

  @Put('parametros')
  @Permissions('travel_expenses:manage_config')
  actualizarParametros(@Body() dto: UpdateLiquidationParamsDto) {
    return this.configService.actualizarParametrosLote(dto);
  }
}
