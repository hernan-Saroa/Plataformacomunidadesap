import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { codigosDeRol, PermisosGuard, RequierePermisos } from '../auth/permisos.guard';
import { ConfiguracionService, PERMISO_GESTIONAR, UsuarioConsola } from './configuracion.service';
import { ActualizarEventoDto, ActualizarModuloDto } from './dto/configuracion.dto';

/**
 * Consola de configuración de notificaciones (EFDS-2406). A través del gateway:
 * /notificaciones/api/v1/configuracion/... Solo entra quien tenga el permiso
 * "Configuración de Notificaciones" en Roles y Permisos (RN1, CA7).
 */
@Controller('configuracion')
@UseGuards(JwtAuthGuard, PermisosGuard)
@RequierePermisos(PERMISO_GESTIONAR)
export class ConfiguracionController {
  constructor(private readonly configuracion: ConfiguracionService) {}

  /** Qué mostrar: lo consulta la pantalla antes de pintar; no exige el permiso. */
  @Get('permisos')
  @RequierePermisos()
  permisos(@Req() req: any) {
    return this.configuracion.permisosDe(codigosDeRol(req.user?.roles));
  }

  @Get('modulos')
  modulos() {
    return this.configuracion.listarModulos();
  }

  @Patch('modulos/:codigo')
  actualizarModulo(@Param('codigo') codigo: string, @Body() dto: ActualizarModuloDto, @Req() req: any) {
    return this.configuracion.actualizarModulo(codigo, dto, usuarioDe(req));
  }

  @Get('modulos/:codigo/eventos')
  eventos(@Param('codigo') codigo: string) {
    return this.configuracion.listarEventos(codigo);
  }

  @Patch('eventos/:clave')
  actualizarEvento(@Param('clave') clave: string, @Body() dto: ActualizarEventoDto, @Req() req: any) {
    return this.configuracion.actualizarEvento(clave, dto, usuarioDe(req));
  }

  @Post('eventos/:clave/prueba')
  prueba(@Param('clave') clave: string, @Req() req: any) {
    return this.configuracion.enviarPrueba(clave, usuarioDe(req));
  }

  @Get('historial')
  historial(@Query('limite') limite?: string) {
    return this.configuracion.listarHistorial(limite ? parseInt(limite, 10) : 100);
  }

  @Get('omitidas')
  omitidas(@Query('limite') limite?: string, @Query('modulo') modulo?: string) {
    return this.configuracion.listarOmitidas(limite ? parseInt(limite, 10) : 100, modulo || undefined);
  }
}

function usuarioDe(req: any): UsuarioConsola {
  return {
    userId: String(req?.user?.userId || ''),
    username: req?.user?.username,
    email: req?.user?.email,
    roles: req?.user?.roles,
  };
}
