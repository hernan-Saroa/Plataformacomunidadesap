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
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { ControlInternoPermissions as CIP } from '../../common/permissions.constants';
import { NotificacionesService } from './notificaciones.service';
import { NotificacionesAutomaticasService } from './notificaciones-automaticas.service';
import { CreateNotificacionDto } from './dto/create-notificacion.dto';

@Controller('notificaciones')
export class NotificacionesController {
  constructor(
    private readonly notificacionesService: NotificacionesService,
    private readonly notificacionesAutomaticasService: NotificacionesAutomaticasService,
  ) {}

  /**
   * GET /notificaciones/usuario/:usuarioId
   * Obtiene todas las notificaciones de un usuario
   */
  @Get('usuario/:usuarioId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_VIEW)
  findByUsuario(
    @Param('usuarioId') usuarioId: string,
    @Query('estado') estado?: string,
    @Query('tipo') tipo?: string,
    @Query('leida') leida?: string,
    @Query('prioridad') prioridad?: string,
  ) {
    return this.notificacionesService.findByUsuario(usuarioId, {
      estado,
      tipo,
      leida: leida === 'true' ? true : leida === 'false' ? false : undefined,
      prioridad,
    });
  }

  /**
   * GET /notificaciones/usuario/:usuarioId/no-leidas
   * Obtiene notificaciones no leídas
   */
  @Get('usuario/:usuarioId/no-leidas')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_VIEW)
  getNoLeidas(@Param('usuarioId') usuarioId: string) {
    return this.notificacionesService.getNoLeidas(usuarioId);
  }

  /**
   * GET /notificaciones/usuario/:usuarioId/conteo
   * Obtiene el conteo de notificaciones no leídas
   */
  @Get('usuario/:usuarioId/conteo')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_VIEW)
  getConteoNoLeidas(@Param('usuarioId') usuarioId: string) {
    return this.notificacionesService.getConteoNoLeidas(usuarioId);
  }

  /**
   * POST /notificaciones
   * Crea una nueva notificación
   */
  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_VIEW)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createDto: CreateNotificacionDto) {
    return this.notificacionesService.create(createDto);
  }

  /**
   * PUT /notificaciones/:id/leida
   * Marca una notificación como leída
   */
  @Put(':id/leida')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_VIEW)
  marcarLeida(@Param('id') id: string, @Body() body: { usuarioId: string }) {
    return this.notificacionesService.marcarLeida(id, body.usuarioId);
  }

  /**
   * PUT /notificaciones/usuario/:usuarioId/todas-leidas
   * Marca todas las notificaciones como leídas
   */
  @Put('usuario/:usuarioId/todas-leidas')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_VIEW)
  marcarTodasLeidas(@Param('usuarioId') usuarioId: string) {
    return this.notificacionesService.marcarTodasLeidas(usuarioId);
  }

  /**
   * PUT /notificaciones/:id/archivar
   * Archiva una notificación
   */
  @Put(':id/archivar')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_VIEW)
  archivar(@Param('id') id: string, @Body() body: { usuarioId: string }) {
    return this.notificacionesService.archivar(id, body.usuarioId);
  }

  /**
   * DELETE /notificaciones/:id
   * Elimina una notificación
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_VIEW)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Body() body: { usuarioId: string }) {
    return this.notificacionesService.delete(id, body.usuarioId);
  }

  /**
   * GET /notificaciones/preferencias/:usuarioId
   * Obtiene las preferencias de notificación
   */
  @Get('preferencias/:usuarioId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_VIEW)
  getPreferencias(@Param('usuarioId') usuarioId: string) {
    return this.notificacionesService.getPreferencias(usuarioId);
  }

  /**
   * PUT /notificaciones/preferencias/:usuarioId
   * Actualiza las preferencias de notificación
   */
  @Put('preferencias/:usuarioId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_VIEW)
  updatePreferencias(
    @Param('usuarioId') usuarioId: string,
    @Body() preferencias: any,
  ) {
    return this.notificacionesService.updatePreferencias(usuarioId, preferencias);
  }

  /**
   * GET /notificaciones/debug/:usuarioId
   * Endpoint de debug para verificar conversión de usuarioId
   */
  @Get('debug/:usuarioId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_VIEW)
  async debugUsuario(@Param('usuarioId') usuarioId: string) {
    return this.notificacionesService.debugUsuario(usuarioId);
  }

  /**
   * GET /notificaciones/todas
   * Obtiene TODAS las notificaciones (solo para super administradores/admins)
   */
  @Get('todas')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_VIEW)
  obtenerTodas(
    @Query('estado') estado?: string,
    @Query('tipo') tipo?: string,
    @Query('leida') leida?: string,
    @Query('prioridad') prioridad?: string,
  ) {
    return this.notificacionesService.findAll({
      estado,
      tipo,
      leida: leida === 'true' ? true : leida === 'false' ? false : undefined,
      prioridad,
    });
  }

  /**
   * POST /notificaciones/ejecutar-job-automatico
   * Ejecuta manualmente el job de notificaciones automáticas (para pruebas)
   */
  @Post('ejecutar-job-automatico')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_VIEW)
  @HttpCode(HttpStatus.OK)
  async ejecutarJobAutomatico() {
    try {
      const resultado = await this.notificacionesAutomaticasService.ejecutarNotificacionesAutomaticas();
      return {
        success: true,
        message: 'Job ejecutado correctamente',
        resultado: {
          notificacionesEnviadas: resultado.notificacionesEnviadas,
          notificacionesError: resultado.notificacionesError,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error al ejecutar el job',
        error: error.message,
      };
    }
  }

  /**
   * GET /notificaciones/debug-datos
   * Endpoint de debug para ver qué datos encuentra el sistema
   */
  @Get('debug-datos')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_VIEW)
  async debugDatos() {
    try {
      return await this.notificacionesAutomaticasService.debugDatos();
    } catch (error) {
      return {
        error: true,
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      };
    }
  }

  /**
   * POST /notificaciones/disparar-evento
   * Dispara un evento de notificación que resuelve destinatarios y canales en el backend
   */
  @Post('disparar-evento')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_VIEW)
  @HttpCode(HttpStatus.OK)
  async dispararEvento(@Body() body: { 
    eventoCode: string;
    context: any;
  }) {
    return this.notificacionesService.dispararEvento(body.eventoCode, body.context);
  }

  /**
   * GET /notificaciones/condiciones-disparo
   * Obtiene la lista de condiciones de disparo desde la base de datos
   */
  @Get('condiciones-disparo')
  @UseGuards(JwtAuthGuard)
  async getCondicionesDisparo() {
    return this.notificacionesService.getCondicionesDisparo();
  }
}

