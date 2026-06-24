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
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, resolve as pathResolve } from 'path';
import { existsSync, mkdirSync } from 'fs';
import type { Response } from 'express';
import { Public } from '../../auth/decorators/public.decorator';

interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
}
import { PlanAnual5RolesService } from './plan-anual-5-roles.service';
import { CreatePlanAnual5RolesDto } from './dto/create-plan-anual-5-roles.dto';
import { UpdateRolPlanAnual5Dto } from './dto/update-rol-plan-anual-5.dto';
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
  async findAll(
    @Query('year') year?: string,
    /** Por defecto true: listados sin adjuntos (menor payload). Detalle: findByYear / :id */
    @Query('light') light?: string,
  ) {
    const yearNum = year ? parseInt(year, 10) : undefined;
    const lightMode = light !== 'false' && light !== '0';
    return this.service.findAll(yearNum, lightMode);
  }

  // Rutas específicas deben ir ANTES de las genéricas
  @Get('year/:year')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_ANUAL_VIEW)
  async findByYear(@Param('year') year: string) {
    const yearNum = parseInt(year, 10);
    return this.service.findByYear(yearNum);
  }

  /** Borrador del asistente "Nuevo plan" (un fila JSON por usuario). Debe ir antes de :id. */
  @Get('wizard-borrador/me')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_ANUAL_CREATE, CIP.PLAN_ANUAL_EDIT)
  async getWizardBorrador(@Req() req: any) {
    return this.service.getWizardBorrador(req.user?.userId);
  }

  @Put('wizard-borrador/me')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_ANUAL_CREATE, CIP.PLAN_ANUAL_EDIT)
  async saveWizardBorrador(
    @Body() body: { payload?: Record<string, unknown> },
    @Req() req: any,
  ) {
    return this.service.saveWizardBorrador(req.user?.userId, body?.payload ?? {});
  }

  @Delete('wizard-borrador/me')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_ANUAL_CREATE, CIP.PLAN_ANUAL_EDIT)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteWizardBorrador(@Req() req: any) {
    await this.service.deleteWizardBorrador(req.user?.userId);
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

  @Post(':id/roles')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_ANUAL_EDIT, CIP.PLAN_ANUAL_CREATE)
  @HttpCode(HttpStatus.CREATED)
  async addRol(
    @Param('id') planId: string,
    @Body() createRolDto: { nombre: string; descripcion: string; color: string; numero: number },
    @Req() req: any,
  ) {
    if (!planId || planId === 'undefined') {
      throw new BadRequestException('planId es requerido');
    }
    return this.service.addRolAdicional(planId, createRolDto, req.user?.userId);
  }

  @Put(':id/roles/:rolId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_ANUAL_EDIT)
  async updateRol(
    @Param('id') planId: string,
    @Param('rolId') rolId: string,
    @Body() updateDto: UpdateRolPlanAnual5Dto,
    @Req() req: any,
  ) {
    if (!planId || planId === 'undefined' || !rolId || rolId === 'undefined') {
      throw new BadRequestException('planId y rolId son requeridos');
    }
    return this.service.updateRol(planId, rolId, updateDto, req.user?.userId);
  }

  // Ruta genérica de actualización debe ir ANTES de las rutas con parámetros dinámicos
  @Put(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_ANUAL_EDIT, CIP.PLAN_ANUAL_APPROVE)
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

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_ANUAL_DELETE, CIP.PLAN_ANUAL_EDIT)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Req() req: any) {
    if (!id || id === 'undefined') {
      throw new BadRequestException('id es requerido');
    }
    await this.service.remove(id, req.user?.userId);
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

  @Post(':id/notificar-responsable')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_ANUAL_EDIT)
  @HttpCode(HttpStatus.OK)
  async notificarResponsable(
    @Param('id') id: string,
    @Body()
    body: {
      solicitanteNombre?: string;
      mensaje?: string;
      responsableEmail?: string;
    },
    @Req() req: any,
  ) {
    if (!id || id === 'undefined') {
      throw new BadRequestException('id es requerido');
    }
    const solicitanteNombre =
      body?.solicitanteNombre ||
      req.user?.nombre ||
      req.user?.fullName ||
      req.user?.email;
    return this.service.notificarResponsableEnvioRevision(
      id,
      req.user?.userId,
      solicitanteNombre,
      body?.mensaje,
      body?.responsableEmail,
    );
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
  @Permissions(CIP.PLAN_ANUAL_EDIT, CIP.PLAN_ANUAL_FOLLOW_UP)
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
  @Permissions(CIP.PLAN_ANUAL_EDIT, CIP.PLAN_ANUAL_FOLLOW_UP)
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

  /**
   * Sube un archivo real al servidor y devuelve metadatos para adjuntosTarea.
   * POST /plan-anual-5-roles/actividades/:actividadId/adjuntos/upload
   */
  @Post('actividades/:actividadId/adjuntos/upload')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_ANUAL_EDIT, CIP.PLAN_ANUAL_FOLLOW_UP)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = process.env.PLAN_ANUAL_UPLOAD_PATH
            || process.env.UPLOAD_PATH
            || './uploads/plan-anual/temp';
          if (!existsSync(uploadPath)) {
            mkdirSync(uploadPath, { recursive: true });
          }
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  @HttpCode(HttpStatus.CREATED)
  async uploadAdjuntoArchivo(
    @Param('actividadId') actividadId: string,
    @UploadedFile() file: MulterFile,
    @Body() body: { tareaId?: string },
    @Req() req: { user?: { username?: string; userId?: string } },
  ) {
    if (!actividadId || actividadId === 'undefined') {
      throw new BadRequestException('actividadId es requerido');
    }
    if (!file) {
      throw new BadRequestException('No se proporcionó ningún archivo');
    }
    return this.service.uploadAdjuntoArchivo(actividadId, file, {
      tareaId: body?.tareaId,
      cargadoPor: req.user?.username,
    });
  }

  @Get('adjuntos/:adjuntoId/download')
  @Public()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_ANUAL_VIEW, CIP.PLAN_ANUAL_FOLLOW_UP)
  async downloadAdjunto(@Param('adjuntoId') adjuntoId: string, @Res() res: Response) {
    if (!adjuntoId || adjuntoId === 'undefined') {
      throw new BadRequestException('adjuntoId es requerido');
    }
    const adjunto = await this.service.obtenerAdjuntoParaDescarga(adjuntoId);
    const mime = (adjunto.tipo || 'application/octet-stream').trim();
    const encodedFilename = encodeURIComponent(adjunto.nombre);
    res.setHeader('Content-Type', `${mime}; charset=utf-8`);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${adjunto.nombre}"; filename*=UTF-8''${encodedFilename}`,
    );
    if (adjunto.tamanio) {
      res.setHeader('Content-Length', String(adjunto.tamanio));
    }
    return res.sendFile(pathResolve(adjunto.rutaArchivo));
  }

  @Get('adjuntos/:adjuntoId/preview')
  @Public()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_ANUAL_VIEW, CIP.PLAN_ANUAL_FOLLOW_UP)
  async previewAdjunto(@Param('adjuntoId') adjuntoId: string, @Res() res: Response) {
    if (!adjuntoId || adjuntoId === 'undefined') {
      throw new BadRequestException('adjuntoId es requerido');
    }
    const adjunto = await this.service.obtenerAdjuntoParaDescarga(adjuntoId);
    const mime = (adjunto.tipo || '').trim().toLowerCase();
    const esImagen = mime.startsWith('image/');
    const esPdf = mime === 'application/pdf' || mime.startsWith('application/pdf');
    if (!esImagen && !esPdf) {
      throw new BadRequestException('Este tipo de archivo no se puede previsualizar');
    }
    const encodedFilename = encodeURIComponent(adjunto.nombre);
    res.setHeader('Content-Type', `${adjunto.tipo}; charset=utf-8`);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${adjunto.nombre}"; filename*=UTF-8''${encodedFilename}`,
    );
    return res.sendFile(pathResolve(adjunto.rutaArchivo));
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

