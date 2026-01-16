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
} from '@nestjs/common';
import { NotificacionesService } from './notificaciones.service';
import { CreateNotificacionDto } from './dto/create-notificacion.dto';

@Controller('notificaciones')
export class NotificacionesController {
  constructor(private readonly notificacionesService: NotificacionesService) {}

  /**
   * GET /notificaciones/usuario/:usuarioId
   * Obtiene todas las notificaciones de un usuario
   */
  @Get('usuario/:usuarioId')
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
  getNoLeidas(@Param('usuarioId') usuarioId: string) {
    return this.notificacionesService.getNoLeidas(usuarioId);
  }

  /**
   * GET /notificaciones/usuario/:usuarioId/conteo
   * Obtiene el conteo de notificaciones no leídas
   */
  @Get('usuario/:usuarioId/conteo')
  getConteoNoLeidas(@Param('usuarioId') usuarioId: string) {
    return this.notificacionesService.getConteoNoLeidas(usuarioId);
  }

  /**
   * POST /notificaciones
   * Crea una nueva notificación
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createDto: CreateNotificacionDto) {
    return this.notificacionesService.create(createDto);
  }

  /**
   * PUT /notificaciones/:id/leida
   * Marca una notificación como leída
   */
  @Put(':id/leida')
  marcarLeida(@Param('id') id: string, @Body() body: { usuarioId: string }) {
    return this.notificacionesService.marcarLeida(id, body.usuarioId);
  }

  /**
   * PUT /notificaciones/usuario/:usuarioId/todas-leidas
   * Marca todas las notificaciones como leídas
   */
  @Put('usuario/:usuarioId/todas-leidas')
  marcarTodasLeidas(@Param('usuarioId') usuarioId: string) {
    return this.notificacionesService.marcarTodasLeidas(usuarioId);
  }

  /**
   * PUT /notificaciones/:id/archivar
   * Archiva una notificación
   */
  @Put(':id/archivar')
  archivar(@Param('id') id: string, @Body() body: { usuarioId: string }) {
    return this.notificacionesService.archivar(id, body.usuarioId);
  }

  /**
   * DELETE /notificaciones/:id
   * Elimina una notificación
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Body() body: { usuarioId: string }) {
    return this.notificacionesService.delete(id, body.usuarioId);
  }

  /**
   * GET /notificaciones/preferencias/:usuarioId
   * Obtiene las preferencias de notificación
   */
  @Get('preferencias/:usuarioId')
  getPreferencias(@Param('usuarioId') usuarioId: string) {
    return this.notificacionesService.getPreferencias(usuarioId);
  }

  /**
   * PUT /notificaciones/preferencias/:usuarioId
   * Actualiza las preferencias de notificación
   */
  @Put('preferencias/:usuarioId')
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
  async debugUsuario(@Param('usuarioId') usuarioId: string) {
    return this.notificacionesService.debugUsuario(usuarioId);
  }

  /**
   * GET /notificaciones/todas
   * Obtiene TODAS las notificaciones (solo para super administradores/admins)
   */
  @Get('todas')
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
}

