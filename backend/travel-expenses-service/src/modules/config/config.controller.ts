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
  Query,
} from '@nestjs/common';
import { Request } from 'express';
import { ConfigService } from './config.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/permissions.guard';
import { Permissions } from '../../common/permissions.decorator';
import {
  CreateCampoFormularioDto,
  UpdateCampoFormularioDto,
} from '../../dto/config/campo-formulario.dto';
import {
  CreateConfigTipoComisionadoDto,
  UpdateConfigTipoComisionadoDto,
} from '../../dto/config/config-tipo-comisionado.dto';
import {
  CreateTipoDocumentoSoporteDto,
  UpdateTipoDocumentoSoporteDto,
} from '../../dto/config/tipo-documento-soporte.dto';

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

@Controller('parametrizacion')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  @Get('campos-formulario')
  obtenerCamposFormulario() {
    return this.configService.obtenerCamposFormulario();
  }

  @Get('campos-formulario/:clave')
  async obtenerCampoPorClave(@Param('clave') clave: string) {
    const campo = await this.configService.obtenerCampoPorClave(clave);
    if (!campo) {
      return { message: 'Campo no encontrado', campo: null };
    }
    return campo;
  }

  private obtenerUsuarioModificador(req: AuthenticatedRequest): string {
    return req?.user?.username || (req?.user as any)?.email || req?.user?.userId || 'Administrador del Sistema';
  }

  @Post('campos-formulario')
  @Permissions('travel_expenses:manage_config')
  crearCampoFormulario(
    @Body() dto: CreateCampoFormularioDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const usuario = this.obtenerUsuarioModificador(req);
    return this.configService.crearCampoFormulario(dto, usuario);
  }

  @Put('campos-formulario/:clave')
  @Permissions('travel_expenses:manage_config')
  actualizarCampoFormulario(
    @Param('clave') clave: string,
    @Body() dto: UpdateCampoFormularioDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const usuario = this.obtenerUsuarioModificador(req);
    return this.configService.actualizarCampoFormulario(clave, dto, usuario);
  }

  @Delete('campos-formulario/:clave')
  @Permissions('travel_expenses:manage_config')
  eliminarCampoFormulario(
    @Param('clave') clave: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const usuario = this.obtenerUsuarioModificador(req);
    return this.configService.eliminarCampoFormulario(clave, usuario);
  }

  @Get('tipos-documento-soporte')
  obtenerTiposDocumentoSoporte(
    @Query('incluirInactivos') incluirInactivos?: string,
  ) {
    const todos = incluirInactivos === 'true' || incluirInactivos === '1';
    return this.configService.obtenerTodosTiposDocumentoSoporte(todos);
  }

  @Post('tipos-documento-soporte')
  @Permissions('travel_expenses:manage_config')
  crearTipoDocumentoSoporte(
    @Body() dto: CreateTipoDocumentoSoporteDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const usuario = this.obtenerUsuarioModificador(req);
    return this.configService.crearTipoDocumentoSoporte(dto, usuario);
  }

  @Put('tipos-documento-soporte/:codigo')
  @Permissions('travel_expenses:manage_config')
  actualizarTipoDocumentoSoporte(
    @Param('codigo') codigo: string,
    @Body() dto: UpdateTipoDocumentoSoporteDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const usuario = this.obtenerUsuarioModificador(req);
    return this.configService.actualizarTipoDocumentoSoporte(codigo, dto, usuario);
  }

  @Delete('tipos-documento-soporte/:codigo')
  @Permissions('travel_expenses:manage_config')
  eliminarTipoDocumentoSoporte(
    @Param('codigo') codigo: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const usuario = this.obtenerUsuarioModificador(req);
    return this.configService.eliminarTipoDocumentoSoporte(codigo, usuario);
  }

  @Get('config-tipo-comisionado')
  obtenerTodasConfiguraciones() {
    return this.configService.obtenerTodasConfiguraciones();
  }

  @Get('config-tipo-comisionado/default')
  async obtenerConfiguracionPorDefecto() {
    return this.configService.obtenerConfiguracionPorDefecto();
  }

  @Get('config-tipo-comisionado/formulario/:codigo')
  async obtenerConfiguracionPorCodigoFormulario(
    @Param('codigo') codigo: string,
  ) {
    const config =
      await this.configService.obtenerConfiguracionPorCodigoFormulario(codigo);
    if (!config) {
      return {
        message: 'Configuración no encontrada para el formulario',
        codigo,
        config: null,
      };
    }
    return config;
  }

  @Get('config-tipo-comisionado/:tipo')
  async obtenerConfiguracionPorTipo(@Param('tipo') tipo: string) {
    const config = await this.configService.obtenerConfiguracionPorTipo(tipo);
    if (!config) {
      return {
        message: 'Configuración no encontrada para el tipo',
        tipo,
        config: null,
      };
    }
    return config;
  }

  @Post('config-tipo-comisionado')
  @Permissions('travel_expenses:manage_config')
  crearConfigTipoComisionado(
    @Body() dto: CreateConfigTipoComisionadoDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const usuario = this.obtenerUsuarioModificador(req);
    return this.configService.crearConfigTipoComisionado(dto, usuario);
  }

  @Put('config-tipo-comisionado/:tipo')
  @Permissions('travel_expenses:manage_config')
  actualizarConfigTipoComisionado(
    @Param('tipo') tipo: string,
    @Body() dto: UpdateConfigTipoComisionadoDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const usuario = this.obtenerUsuarioModificador(req);
    return this.configService.actualizarConfigTipoComisionado(tipo, dto, usuario);
  }

  @Get('resumen')
  obtenerResumen() {
    return this.configService.obtenerResumenParametrizacion();
  }
}
