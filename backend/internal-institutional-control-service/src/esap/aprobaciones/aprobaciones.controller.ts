import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { ControlInternoPermissions as CIP } from '../../common/permissions.constants';
import { AprobacionesService } from './aprobaciones.service';
import { CreateAprobacionDto } from './dto/create-aprobacion.dto';
import { AprobarDto } from './dto/aprobar.dto';
import { RechazarDto } from './dto/rechazar.dto';

@Controller('aprobaciones')
export class AprobacionesController {
  constructor(private readonly aprobacionesService: AprobacionesService) {}

  /**
   * POST /esap/aprobaciones
   * Crear una nueva solicitud de aprobación
   */
  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.APROBACION_CREATE)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createAprobacionDto: CreateAprobacionDto) {
    return this.aprobacionesService.create(createAprobacionDto);
  }

  /**
   * GET /esap/aprobaciones
   * Listar todas las aprobaciones con filtros opcionales
   */
  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.APROBACION_VIEW)
  findAll(
    @Query('estado') estado?: string,
    @Query('tipo') tipo?: string,
    @Query('prioridad') prioridad?: string,
  ) {
    return this.aprobacionesService.findAll({ estado, tipo, prioridad });
  }

  /**
   * GET /esap/aprobaciones/pendientes
   * Obtener solo aprobaciones pendientes
   */
  @Get('pendientes')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.APROBACION_VIEW)
  findPendientes() {
    return this.aprobacionesService.findPendientes();
  }

  /**
   * GET /esap/aprobaciones/estadisticas
   * Obtener estadísticas de aprobaciones
   */
  @Get('estadisticas')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.APROBACION_VIEW)
  getEstadisticas() {
    return this.aprobacionesService.getEstadisticas();
  }

  /**
   * GET /esap/aprobaciones/:id
   * Obtener una aprobación por ID
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.APROBACION_VIEW)
  findOne(@Param('id') id: string) {
    return this.aprobacionesService.findOne(id);
  }

  /**
   * POST /esap/aprobaciones/:id/aprobar
   * Aprobar una solicitud
   */
  @Post(':id/aprobar')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_APPROVE)
  aprobar(
    @Param('id') id: string,
    @Body() aprobarDto: AprobarDto,
    // TODO: Obtener usuario del token JWT cuando esté implementado
    // @CurrentUser() user: User,
  ) {
    return this.aprobacionesService.aprobar(id, aprobarDto /*, user.email */);
  }

  /**
   * POST /esap/aprobaciones/:id/rechazar
   * Rechazar una solicitud
   */
  @Post(':id/rechazar')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_APPROVE)
  rechazar(
    @Param('id') id: string,
    @Body() rechazarDto: RechazarDto,
    // TODO: Obtener usuario del token JWT cuando esté implementado
    // @CurrentUser() user: User,
  ) {
    return this.aprobacionesService.rechazar(id, rechazarDto /*, user.email */);
  }

  /**
   * PUT /esap/aprobaciones/:id
   * Actualizar una aprobación
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.APROBACION_EDIT)
  update(@Param('id') id: string, @Body() updateData: Partial<CreateAprobacionDto>) {
    return this.aprobacionesService.update(id, updateData);
  }

  /**
   * DELETE /esap/aprobaciones/:id
   * Eliminar una aprobación
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.APROBACION_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.aprobacionesService.remove(id);
  }
}

