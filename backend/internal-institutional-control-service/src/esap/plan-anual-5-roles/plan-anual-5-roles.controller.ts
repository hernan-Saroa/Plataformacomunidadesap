import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Res,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UseGuards,
  Req,
} from '@nestjs/common';
import type { Response } from 'express';
import { PlanAnual5RolesService } from './plan-anual-5-roles.service';
import { CreatePlanAnual5RolesDto } from './dto/create-plan-anual-5-roles.dto';
import { CreateActividadDto } from './dto/create-actividad.dto';
import { CreateAdjuntoDto } from './dto/create-adjunto.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { ControlInternoPermissions as CIP } from '../../common/permissions.constants';

@Controller('plan-anual-5-roles')
export class PlanAnual5RolesController {
  constructor(private readonly service: PlanAnual5RolesService) {}

  // ============ ENDPOINTS PÚBLICOS (Solo lectura) ============
  
  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_ANUAL_VIEW)
  async findAll(@Query('year') year?: string) {
    const yearNum = year ? parseInt(year, 10) : undefined;
    return this.service.findAll(yearNum);
  }

  // Rutas específicas deben ir ANTES de las genéricas
  @Get('year/:year')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_ANUAL_VIEW)
  async findByYear(@Param('year') year: string) {
    const yearNum = parseInt(year, 10);
    return this.service.findByYear(yearNum);
  }

  @Get(':planId/roles')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_ANUAL_VIEW)
  async getRoles(@Param('planId') planId: string) {
    if (!planId || planId === 'undefined') {
      throw new BadRequestException('planId es requerido');
    }
    return this.service.getRoles(planId);
  }

  @Get(':id/export/excel')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_ANUAL_EXPORT)
  async exportExcel(@Param('id') id: string, @Res() res: Response) {
    if (!id || id === 'undefined') {
      throw new BadRequestException('id es requerido');
    }
    const { buffer, nombre } = await this.service.exportExcel(id);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${nombre}"`);
    res.send(buffer);
  }

  @Get(':id/export/pdf')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_ANUAL_EXPORT)
  async exportPdf(@Param('id') id: string) {
    if (!id || id === 'undefined') {
      throw new BadRequestException('id es requerido');
    }
    return this.service.findOne(id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_ANUAL_VIEW)
  async findOne(@Param('id') id: string) {
    if (!id || id === 'undefined') {
      throw new BadRequestException('id es requerido');
    }
    return this.service.findOne(id);
  }

  // ============ ENDPOINTS PROTEGIDOS (Requieren permisos específicos) ============

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_ANUAL_CREATE)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDto: CreatePlanAnual5RolesDto, @Req() req: any) {
    return this.service.create(createDto, req.user?.userId);
  }

  // Ruta genérica de actualización debe ir ANTES de las rutas con parámetros dinámicos
  @Put(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_ANUAL_EDIT)
  async update(
    @Param('id') id: string,
    @Body() updateDto: Partial<CreatePlanAnual5RolesDto>,
    @Req() req: any,
  ) {
    if (!id || id === 'undefined') {
      throw new BadRequestException('id es requerido');
    }
    return this.service.update(id, updateDto, req.user?.userId);
  }

  // Endpoint especial para aprobar - requiere permiso específico
  @Put(':id/aprobar')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_ANUAL_APPROVE)
  async aprobar(
    @Param('id') id: string,
    @Body() body: { observaciones?: string },
    @Req() req: any,
  ) {
    if (!id || id === 'undefined') {
      throw new BadRequestException('id es requerido');
    }
    return this.service.update(id, { estado: 'aprobado', ...body }, req.user?.userId);
  }

  // Endpoint especial para activar - requiere permiso específico
  @Put(':id/activar')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_ANUAL_ACTIVATE)
  async activar(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    if (!id || id === 'undefined') {
      throw new BadRequestException('id es requerido');
    }
    return this.service.update(id, { estado: 'activo' }, req.user?.userId);
  }

  // Rutas específicas de actividades
  @Post(':rolId/actividades')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_ANUAL_EDIT, CIP.PLAN_ANUAL_CREATE)
  @HttpCode(HttpStatus.CREATED)
  async addActividad(
    @Param('rolId') rolId: string,
    @Body() createDto: CreateActividadDto,
    @Req() req: any,
  ) {
    return this.service.addActividad(rolId, createDto, req.user?.userId);
  }

  @Put('actividades/:actividadId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_ANUAL_EDIT)
  async updateActividad(
    @Param('actividadId') actividadId: string,
    @Body() updateDto: Partial<CreateActividadDto>,
    @Req() req: any,
  ) {
    return this.service.updateActividad(actividadId, updateDto, req.user?.userId);
  }

  // Asignar auditor a actividad
  @Put('actividades/:actividadId/asignar')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_ANUAL_ASSIGN)
  async asignarAuditor(
    @Param('actividadId') actividadId: string,
    @Body() body: { auditorId: string },
    @Req() req: any,
  ) {
    return this.service.updateActividad(actividadId, { auditorId: body.auditorId }, req.user?.userId);
  }

  @Delete('actividades/:actividadId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_ANUAL_DELETE, CIP.PLAN_ANUAL_EDIT)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteActividad(@Param('actividadId') actividadId: string, @Req() req: any) {
    await this.service.deleteActividad(actividadId, req.user?.userId);
  }

  // Métodos auxiliares para validar permisos
  private tienePermisoCrearPlan(user: any): boolean {
    // Validar rol del usuario
    const rolesPermitidos = [
      'Jefe OTIC', 
      'Jefe OCI', 
      'JEFE_CONTROL_INTERNO',  // Código del rol equivalente a Jefe OCI
      'JEFE_OCI',               // Código alternativo del rol
      'super_admin', 
      'admin', 
      'administrator'
    ];
    
    // Extraer el rol - puede ser string o objeto
    let userRole = user.rol || user.role || user.roles?.[0];
    let userRoleCode: string | undefined;
    let userRoleName: string | undefined;
    
    // Si el rol es un objeto, extraer el code y name
    if (userRole && typeof userRole === 'object') {
      userRoleCode = userRole.code;
      userRoleName = userRole.name;
    }
    
    // Normalizar a strings en minúsculas para comparación
    const userRoleCodeLower = userRoleCode?.toLowerCase() || '';
    const userRoleNameLower = userRoleName?.toLowerCase() || '';
    const userRoleLower = (typeof userRole === 'string' ? userRole : userRoleCode || userRoleName || '').toLowerCase();
    
    // Verificar si el rol del usuario coincide con alguno de los roles permitidos
    // Verificar tanto por código como por nombre
    return rolesPermitidos.some(rol => {
      const rolLower = rol.toLowerCase();
      
      // Comparación exacta por código
      if (userRoleCodeLower === rolLower) return true;
      
      // Comparación por nombre que contenga el rol permitido
      if (userRoleNameLower.includes(rolLower)) return true;
      
      // Casos especiales para Jefe OCI
      if (rolLower === 'jefe oci' || rolLower === 'jefe_oci') {
        return (
          userRoleCodeLower === 'jefe_control_interno' ||
          userRoleCodeLower === 'jefe_oci' ||
          userRoleNameLower.includes('jefe de control interno') ||
          userRoleNameLower.includes('jefe oci')
        );
      }
      
      // Comparación genérica por inclusión
      return userRoleLower.includes(rolLower);
    });
  }

  private tienePermisoEditarPlan(user: any): boolean {
    // Similar validación para editar
    return this.tienePermisoCrearPlan(user);
  }

  private puedeAprobarPlan(user: any): boolean {
    // Extraer el rol - puede ser string o objeto
    let userRole = user.rol || user.role || user.roles?.[0];
    let userRoleCode: string | undefined;
    let userRoleName: string | undefined;
    
    // Si el rol es un objeto, extraer el code y name
    if (userRole && typeof userRole === 'object') {
      userRoleCode = userRole.code;
      userRoleName = userRole.name;
    }
    
    // Normalizar a strings en minúsculas para comparación
    const userRoleCodeLower = userRoleCode?.toLowerCase() || '';
    const userRoleNameLower = userRoleName?.toLowerCase() || '';
    
    // Verificar si es Jefe OCI (incluyendo JEFE_CONTROL_INTERNO y JEFE_OCI) o Admin
    const esJefeOCI = (
      userRoleCodeLower === 'jefe_control_interno' ||
      userRoleCodeLower === 'jefe_oci' ||
      userRoleNameLower.includes('jefe de control interno') ||
      userRoleNameLower.includes('jefe oci')
    );
    
    const esAdmin = (
      userRoleCodeLower.includes('admin') ||
      userRoleNameLower.includes('admin')
    );
    
    return esJefeOCI || esAdmin;
  }

  // ============ ENDPOINT DE INDICADORES (US-003) ============
  
  @Get(':planId/indicadores')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_ANUAL_VIEW, CIP.PLAN_ANUAL_FOLLOW_UP)
  async getIndicadores(@Param('planId') planId: string) {
    if (!planId || planId === 'undefined') {
      throw new BadRequestException('planId es requerido');
    }
    return this.service.getIndicadores(planId);
  }

  // ============ ENDPOINTS DE ADJUNTOS ============

  @Get('actividades/:actividadId/adjuntos')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_ANUAL_VIEW)
  async getAdjuntos(@Param('actividadId') actividadId: string) {
    if (!actividadId || actividadId === 'undefined') {
      throw new BadRequestException('actividadId es requerido');
    }
    return this.service.getAdjuntos(actividadId);
  }

  @Post('actividades/:actividadId/adjuntos')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_ANUAL_EDIT)
  @HttpCode(HttpStatus.CREATED)
  async addAdjunto(
    @Param('actividadId') actividadId: string,
    @Body() createDto: CreateAdjuntoDto,
  ) {
    if (!actividadId || actividadId === 'undefined') {
      throw new BadRequestException('actividadId es requerido');
    }
    return this.service.addAdjunto(actividadId, createDto);
  }

  @Delete('adjuntos/:adjuntoId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_ANUAL_DELETE, CIP.PLAN_ANUAL_EDIT)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAdjunto(@Param('adjuntoId') adjuntoId: string) {
    if (!adjuntoId || adjuntoId === 'undefined') {
      throw new BadRequestException('adjuntoId es requerido');
    }
    await this.service.deleteAdjunto(adjuntoId);
  }

  // ═════════════════════════════════════════════════════════════════════════
  // ENDPOINTS: VINCULACIÓN CON AUDITORÍAS - Rol 4 (Evaluación y Seguimiento)
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Obtiene el cumplimiento del programa de auditorías para un año
   * GET /plan-anual-5-roles/auditorias/cumplimiento/:año
   */
  @Get('auditorias/cumplimiento/:año')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_ANUAL_VIEW, CIP.PLAN_ANUAL_FOLLOW_UP)
  async getCumplimientoAuditorias(@Param('año') año: string) {
    const añoNum = parseInt(año, 10);
    if (isNaN(añoNum) || añoNum < 2000 || añoNum > 2100) {
      throw new BadRequestException('Año inválido');
    }
    return this.service.getCumplimientoAuditorias(añoNum);
  }

  /**
   * Configura una actividad para cálculo automático de auditorías
   * POST /plan-anual-5-roles/auditorias/configurar
   */
  @Post('auditorias/configurar')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_ANUAL_EDIT)
  @HttpCode(HttpStatus.OK)
  async configurarActividadAuditorias(
    @Body() body: { actividadId: string; año: number },
    @Req() req: any,
  ) {
    if (!body.actividadId) {
      throw new BadRequestException('actividadId es requerido');
    }
    if (!body.año || body.año < 2000 || body.año > 2100) {
      throw new BadRequestException('Año inválido');
    }
    return this.service.configurarActividadAuditorias(
      body.actividadId,
      body.año,
      req.user?.userId
    );
  }

  /**
   * Obtiene las auditorías vinculadas a una actividad
   * GET /plan-anual-5-roles/actividades/:actividadId/auditorias
   */
  @Get('actividades/:actividadId/auditorias')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_ANUAL_VIEW)
  async getAuditoriasVinculadas(@Param('actividadId') actividadId: string) {
    if (!actividadId || actividadId === 'undefined') {
      throw new BadRequestException('actividadId es requerido');
    }
    return this.service.getAuditoriasVinculadas(actividadId);
  }

  /**
   * Recalcula manualmente el cumplimiento de auditorías
   * POST /plan-anual-5-roles/auditorias/recalcular/:año
   */
  @Post('auditorias/recalcular/:año')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_ANUAL_EDIT)
  @HttpCode(HttpStatus.OK)
  async recalcularCumplimientoAuditorias(@Param('año') año: string) {
    const añoNum = parseInt(año, 10);
    if (isNaN(añoNum) || añoNum < 2000 || añoNum > 2100) {
      throw new BadRequestException('Año inválido');
    }
    return this.service.recalcularCumplimientoAuditorias(añoNum);
  }
}

