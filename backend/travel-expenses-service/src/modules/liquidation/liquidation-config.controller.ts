import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
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
  CreateTarifaTransporteTerminalDto,
  UpdateTarifaTransporteTerminalDto,
} from '../../dto/liquidation/tarifa-transporte-terminal.dto';
import { UpdateLiquidationParamsDto } from '../../dto/liquidation/liquidation-params.dto';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    username?: string;
    email?: string;
    roles?: string[];
    role?: string;
    permissions?: string[];
  };
}

@Controller('liquidation/config')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LiquidationConfigController {
  constructor(private readonly configService: LiquidationConfigService) {}

  private obtenerUsuarioModificador(req: AuthenticatedRequest): string {
    return req?.user?.username || (req?.user as any)?.email || req?.user?.userId || 'Administrador del Sistema';
  }

  // ==================== ESCALAS ====================

  @Get('escalas')
  obtenerEscalas() {
    return this.configService.obtenerEscalas();
  }

  @Post('escalas')
  @Permissions('travel_expenses:manage_config')
  crearEscala(
    @Body() dto: CreateEscalaViaticoDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const usuario = this.obtenerUsuarioModificador(req);
    return this.configService.crearEscala(dto, usuario);
  }

  @Put('escalas/:id')
  @Permissions('travel_expenses:manage_config')
  actualizarEscala(
    @Param('id') id: string,
    @Body() dto: UpdateEscalaViaticoDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const usuario = this.obtenerUsuarioModificador(req);
    return this.configService.actualizarEscala(Number(id), dto, usuario);
  }

  @Delete('escalas/:id')
  @Permissions('travel_expenses:manage_config')
  async eliminarEscala(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const usuario = this.obtenerUsuarioModificador(req);
    return this.configService.eliminarEscala(Number(id), usuario);
  }

  // ==================== TARIFAS INVESTIGADOR ====================

  @Get('tarifas-investigadores')
  obtenerTarifasInvestigadores() {
    return this.configService.obtenerTarifasInvestigadores();
  }

  @Post('tarifas-investigadores')
  @Permissions('travel_expenses:manage_config')
  crearTarifaInvestigador(
    @Body() dto: CreateTarifaInvestigadorDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const usuario = this.obtenerUsuarioModificador(req);
    return this.configService.crearTarifaInvestigador(dto, usuario);
  }

  @Put('tarifas-investigadores/:id')
  @Permissions('travel_expenses:manage_config')
  actualizarTarifaInvestigador(
    @Param('id') id: string,
    @Body() dto: UpdateTarifaInvestigadorDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const usuario = this.obtenerUsuarioModificador(req);
    return this.configService.actualizarTarifaInvestigador(Number(id), dto, usuario);
  }

  @Delete('tarifas-investigadores/:id')
  @Permissions('travel_expenses:manage_config')
  async eliminarTarifaInvestigador(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const usuario = this.obtenerUsuarioModificador(req);
    return this.configService.eliminarTarifaInvestigador(Number(id), usuario);
  }

  @Get('catalogo-departamentos')
  obtenerCatalogoDepartamentos() {
    return this.configService.obtenerCatalogoDepartamentos();
  }

  // ==================== TARIFAS TRANSPORTE TERMINALES AÉREOS ====================

  @Get('tarifas-transporte-terminal')
  obtenerTarifasTransporteTerminal() {
    return this.configService.obtenerTarifasTransporteTerminal();
  }

  @Post('tarifas-transporte-terminal')
  @Permissions('travel_expenses:manage_config')
  crearTarifaTransporteTerminal(
    @Body() dto: CreateTarifaTransporteTerminalDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const usuario = this.obtenerUsuarioModificador(req);
    return this.configService.crearTarifaTransporteTerminal(dto, usuario);
  }

  @Put('tarifas-transporte-terminal/:id')
  @Permissions('travel_expenses:manage_config')
  actualizarTarifaTransporteTerminal(
    @Param('id') id: string,
    @Body() dto: UpdateTarifaTransporteTerminalDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const usuario = this.obtenerUsuarioModificador(req);
    return this.configService.actualizarTarifaTransporteTerminal(Number(id), dto, usuario);
  }

  @Delete('tarifas-transporte-terminal/:id')
  @Permissions('travel_expenses:manage_config')
  async eliminarTarifaTransporteTerminal(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const usuario = this.obtenerUsuarioModificador(req);
    return this.configService.eliminarTarifaTransporteTerminal(Number(id), usuario);
  }

  // ==================== PARÁMETROS GLOBALES ====================

  @Get('parametros')
  obtenerParametros() {
    return this.configService.obtenerParametros();
  }

  @Put('parametros')
  @Permissions('travel_expenses:manage_config')
  actualizarParametros(
    @Body() dto: UpdateLiquidationParamsDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const usuario = this.obtenerUsuarioModificador(req);
    return this.configService.actualizarParametrosLote(dto, usuario);
  }
}
