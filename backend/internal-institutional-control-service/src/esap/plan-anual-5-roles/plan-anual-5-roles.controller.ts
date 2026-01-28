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
  BadRequestException,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { PlanAnual5RolesService } from './plan-anual-5-roles.service';
import { CreatePlanAnual5RolesDto } from './dto/create-plan-anual-5-roles.dto';
import { CreateActividadDto } from './dto/create-actividad.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('plan-anual-5-roles')
export class PlanAnual5RolesController {
  constructor(private readonly service: PlanAnual5RolesService) {}

  // ============ ENDPOINTS PÚBLICOS (Solo lectura) ============
  
  @Get()
  async findAll(@Query('year') year?: string) {
    const yearNum = year ? parseInt(year, 10) : undefined;
    return this.service.findAll(yearNum);
  }

  // Rutas específicas deben ir ANTES de las genéricas
  @Get('year/:year')
  async findByYear(@Param('year') year: string) {
    const yearNum = parseInt(year, 10);
    return this.service.findByYear(yearNum);
  }

  @Get(':planId/roles')
  async getRoles(@Param('planId') planId: string) {
    if (!planId || planId === 'undefined') {
      throw new BadRequestException('planId es requerido');
    }
    return this.service.getRoles(planId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    if (!id || id === 'undefined') {
      throw new BadRequestException('id es requerido');
    }
    return this.service.findOne(id);
  }

  // ============ ENDPOINTS PROTEGIDOS (Requieren autenticación) ============

  @Post()
  // @UseGuards(JwtAuthGuard) // Temporalmente deshabilitado
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDto: CreatePlanAnual5RolesDto, @Req() req: any) {
    // Validación de roles temporalmente deshabilitada
    // const user = req.user;
    // 
    // if (!user || !this.tienePermisoCrearPlan(user)) {
    //   throw new ForbiddenException('No tienes permisos para crear Plan Anual. Se requiere rol de Jefe OTIC, Jefe OCI o Administrador.');
    // }

    // Pasar usuarioId al servicio para auditoría (temporalmente undefined)
    return this.service.create(createDto, req.user?.userId);
  }

  // Ruta genérica de actualización debe ir ANTES de las rutas con parámetros dinámicos
  @Put(':id')
  // @UseGuards(JwtAuthGuard) // Temporalmente deshabilitado
  async update(
    @Param('id') id: string,
    @Body() updateDto: Partial<CreatePlanAnual5RolesDto>,
    @Req() req: any,
  ) {
    if (!id || id === 'undefined') {
      throw new BadRequestException('id es requerido');
    }
    
    const user = req.user;
    
    // Validaciones de rol temporalmente deshabilitadas
    // // Si se está aprobando el plan, verificar que sea Jefe OCI o Admin
    // if (updateDto.estado === 'aprobado') {
    //   if (!this.puedeAprobarPlan(user)) {
    //     throw new ForbiddenException('Solo el Jefe OCI o Administradores pueden aprobar planes anuales.');
    //   }
    // } else if (!this.tienePermisoEditarPlan(user)) {
    //   throw new ForbiddenException('No tienes permisos para editar Plan Anual.');
    // }

    return this.service.update(id, updateDto, user?.userId);
  }

  // Rutas específicas de actividades deben ir DESPUÉS de las genéricas
  @Post(':rolId/actividades')
  // @UseGuards(JwtAuthGuard) // Temporalmente deshabilitado
  @HttpCode(HttpStatus.CREATED)
  async addActividad(
    @Param('rolId') rolId: string,
    @Body() createDto: CreateActividadDto,
    @Req() req: any,
  ) {
    const user = req.user;
    return this.service.addActividad(rolId, createDto, user?.userId);
  }

  @Put('actividades/:actividadId')
  // @UseGuards(JwtAuthGuard) // Temporalmente deshabilitado
  async updateActividad(
    @Param('actividadId') actividadId: string,
    @Body() updateDto: Partial<CreateActividadDto>,
    @Req() req: any,
  ) {
    const user = req.user;
    return this.service.updateActividad(actividadId, updateDto, user?.userId);
  }

  @Delete('actividades/:actividadId')
  // @UseGuards(JwtAuthGuard) // Temporalmente deshabilitado
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteActividad(@Param('actividadId') actividadId: string, @Req() req: any) {
    const user = req.user;
    await this.service.deleteActividad(actividadId, user?.userId);
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
  async getIndicadores(@Param('planId') planId: string) {
    if (!planId || planId === 'undefined') {
      throw new BadRequestException('planId es requerido');
    }
    return this.service.getIndicadores(planId);
  }
}

