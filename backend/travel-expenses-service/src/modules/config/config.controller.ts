import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Req, Query } from '@nestjs/common';
import { Request } from 'express';
import { ConfigService } from './config.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/permissions.guard';
import { Permissions } from '../../common/permissions.decorator';
import { CreateCampoFormularioDto, UpdateCampoFormularioDto } from '../../dto/config/campo-formulario.dto';
import { CreateConfigTipoComisionadoDto, UpdateConfigTipoComisionadoDto } from '../../dto/config/config-tipo-comisionado.dto';

interface AuthenticatedRequest extends Request {
  user?: { userId: string; roles?: string[]; role?: string; permissions?: string[] };
}

@Controller('parametrizacion')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  @Get('campos-formulario')
  @Permissions('travel_expenses:read')
  obtenerCamposFormulario() {
    return this.configService.obtenerCamposFormulario();
  }

  @Get('campos-formulario/:clave')
  @Permissions('travel_expenses:read')
  async obtenerCampoPorClave(@Param('clave') clave: string) {
    const campo = await this.configService.obtenerCampoPorClave(clave);
    if (!campo) {
      return { message: 'Campo no encontrado', campo: null };
    }
    return campo;
  }

  @Post('campos-formulario')
  @Permissions('travel_expenses:manage_config')
  crearCampoFormulario(@Body() dto: CreateCampoFormularioDto) {
    return this.configService.crearCampoFormulario(dto);
  }

  @Put('campos-formulario/:clave')
  @Permissions('travel_expenses:manage_config')
  actualizarCampoFormulario(@Param('clave') clave: string, @Body() dto: UpdateCampoFormularioDto) {
    return this.configService.actualizarCampoFormulario(clave, dto);
  }

  @Delete('campos-formulario/:clave')
  @Permissions('travel_expenses:manage_config')
  eliminarCampoFormulario(@Param('clave') clave: string) {
    return this.configService.eliminarCampoFormulario(clave);
  }

  @Get('tipos-documento-soporte')
  @Permissions('travel_expenses:read')
  obtenerTiposDocumentoSoporte() {
    return this.configService.obtenerTodosTiposDocumentoSoporte();
  }

  @Get('config-tipo-comisionado')
  @Permissions('travel_expenses:read')
  obtenerTodasConfiguraciones() {
    return this.configService.obtenerTodasConfiguraciones();
  }

  @Get('config-tipo-comisionado/default')
  @Permissions('travel_expenses:read')
  async obtenerConfiguracionPorDefecto() {
    return this.configService.obtenerConfiguracionPorDefecto();
  }

  @Get('config-tipo-comisionado/formulario/:codigo')
  @Permissions('travel_expenses:read')
  async obtenerConfiguracionPorCodigoFormulario(@Param('codigo') codigo: string) {
    const config = await this.configService.obtenerConfiguracionPorCodigoFormulario(codigo);
    if (!config) {
      return { message: 'Configuración no encontrada para el formulario', codigo, config: null };
    }
    return config;
  }

  @Get('config-tipo-comisionado/:tipo')
  @Permissions('travel_expenses:read')
  async obtenerConfiguracionPorTipo(@Param('tipo') tipo: string) {
    const config = await this.configService.obtenerConfiguracionPorTipo(tipo);
    if (!config) {
      return { message: 'Configuración no encontrada para el tipo', tipo, config: null };
    }
    return config;
  }

  @Post('config-tipo-comisionado')
  @Permissions('travel_expenses:manage_config')
  crearConfigTipoComisionado(@Body() dto: CreateConfigTipoComisionadoDto) {
    return this.configService.crearConfigTipoComisionado(dto);
  }

  @Put('config-tipo-comisionado/:tipo')
  @Permissions('travel_expenses:manage_config')
  actualizarConfigTipoComisionado(@Param('tipo') tipo: string, @Body() dto: UpdateConfigTipoComisionadoDto) {
    return this.configService.actualizarConfigTipoComisionado(tipo, dto);
  }

  @Get('resumen')
  @Permissions('travel_expenses:read')
  obtenerResumen() {
    return this.configService.obtenerResumenParametrizacion();
  }
}
