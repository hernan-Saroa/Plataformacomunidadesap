import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UseGuards,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { AuditoriasService } from './auditorias.service';
import { HallazgosService } from '../hallazgos/hallazgos.service';
import { PlanesMejoramientoService } from '../planes-mejoramiento/planes-mejoramiento.service';
import { CreateAuditoriaDto } from './dto/create-auditoria.dto';
import { UpdateAuditoriaDto } from './dto/update-auditoria.dto';
import { CreateNotaDto } from './dto/create-nota.dto';
import { UpdateNotaDto } from './dto/update-nota.dto';
import { SolicitarAmpliacionPlazoDto } from './dto/solicitar-ampliacion-plazo.dto';
import { AprobarAmpliacionPlazoDto } from './dto/aprobar-ampliacion-plazo.dto';
import { RechazarAmpliacionPlazoDto } from './dto/rechazar-ampliacion-plazo.dto';
import { FinalizarAuditoriaDto } from './dto/finalizar-auditoria.dto';
import { FaseAuditoria, EstadoKanban } from './entities/auditoria.entity';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { ControlInternoPermissions as CIP } from '../../common/permissions.constants';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtService } from '@nestjs/jwt';

@Controller('auditorias')
export class AuditoriasController {
  constructor(
    private readonly auditoriasService: AuditoriasService,
    private readonly hallazgosService: HallazgosService,
    private readonly planesMejoramientoService: PlanesMejoramientoService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * GET /esap/auditorias/jefes-control-interno
   * Obtiene la lista de IDs de usuarios con roles de Jefe OCI o Administrador
   */
  @Get('jefes-control-interno')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_VIEW)
  async getJefesControlInterno() {
    return this.auditoriasService.obtenerJefesControlInterno();
  }

  /**
   * Helper para extraer usuario del token de forma opcional
   * Si el token está presente y es válido, retorna el usuario
   * Si no está presente o es inválido, retorna null sin lanzar error
   */
  private extractUserFromToken(req: any): any | null {
    try {
      const token = this.extractJwtFromRequest(req);
      if (!token) {
        return null;
      }

      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET || 'esap-super-secret-jwt-key-2024',
      });

      // Extraer códigos de roles si vienen como objetos con 'code'
      let roles = payload.roles;
      
      if (Array.isArray(roles) && roles.length > 0) {
        if (typeof roles[0] === 'string') {
          // Ya son códigos, usar directamente
          roles = roles;
        } else if (typeof roles[0] === 'object' && roles[0]?.code) {
          // Son objetos, extraer códigos
          roles = roles.map((r: any) => r.code);
        }
      }

      return {
        userId: payload.sub,
        username: payload.username,
        roles: roles || [],
        role: roles && roles.length > 0 ? roles[0] : payload.role,
        email: payload.email,
      };
    } catch (error) {
      // Si el token es inválido o expirado, simplemente retornar null
      // No lanzar error para permitir acceso sin autenticación
      return null;
    }
  }

  private extractJwtFromRequest(req: any): string | null {
    const authHeader = req.headers?.authorization;
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    const cookieHeader = req.headers?.cookie;
    if (typeof cookieHeader !== 'string') {
      return null;
    }

    const cookiePart = cookieHeader
      .split(';')
      .map((part: string) => part.trim())
      .find((part: string) => part.startsWith('esap_access_token='));

    if (!cookiePart) {
      return null;
    }

    const token = cookiePart.split('=').slice(1).join('=');
    if (!token) {
      return null;
    }

    try {
      return decodeURIComponent(token);
    } catch {
      return token;
    }
  }

  /**
   * GET /esap/auditorias
   * Obtiene todas las auditorías con filtros opcionales
   */
  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_VIEW)
  findAll(
    @Query('tipo') tipo?: string,
    @Query('fase') fase?: string,
    @Query('prioridad') prioridad?: string,
    @Query('territorial') territorial?: string,
    @Query('search') search?: string,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
    @Query('planAnualId') planAnualId?: string,
    @Query('planAnualVigencia') planAnualVigencia?: string,
    @Query('vinculadaPlanAnual') vinculadaPlanAnual?: string,
    @Query('year') year?: string,
    @Query('light') light?: string,
    @Query('activasOnly') activasOnly?: string,
  ) {
    const vigenciaNum =
      planAnualVigencia && planAnualVigencia !== 'undefined'
        ? parseInt(planAnualVigencia, 10)
        : undefined;
    const yearNum =
      year && year !== 'undefined' ? parseInt(year, 10) : undefined;
    const lightMode = light !== 'false' && light !== '0';
    const soloActivas = activasOnly !== 'false' && activasOnly !== '0';
    return this.auditoriasService.findAll({
      tipo,
      fase,
      prioridad,
      territorial,
      search,
      fechaDesde,
      fechaHasta,
      planAnualId,
      planAnualVigencia: vigenciaNum != null && !Number.isNaN(vigenciaNum) ? vigenciaNum : undefined,
      vinculadaPlanAnual: vinculadaPlanAnual === 'true' || vinculadaPlanAnual === '1',
      year: yearNum != null && !Number.isNaN(yearNum) ? yearNum : undefined,
      light: lightMode,
      activasOnly: soloActivas,
    });
  }

  /**
   * GET /esap/auditorias/estadisticas
   * Obtiene estadísticas generales de auditorías
   */
  @Get('estadisticas')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_VIEW)
  getEstadisticas() {
    return this.auditoriasService.getEstadisticas();
  }

  /**
   * GET /esap/auditorias/fase/:fase
   * Obtiene auditorías por fase (útil para Kanban)
   */
  @Get('fase/:fase')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_VIEW)
  findByFase(@Param('fase') fase: FaseAuditoria) {
    return this.auditoriasService.findByFase(fase);
  }


  /**
   * POST /esap/auditorias/:id/notas
   * Crea una nueva nota para una auditoría
   */
  @Post(':id/notas')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_EDIT)
  @HttpCode(HttpStatus.CREATED)
  createNota(@Param('id') id: string, @Body() createDto: CreateNotaDto) {
    return this.auditoriasService.createNota(id, createDto);
  }

  /**
   * PATCH /esap/auditorias/:id/notas/:notaId
   * Actualiza una nota existente
   */
  @Patch(':id/notas/:notaId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_EDIT)
  updateNota(
    @Param('id') id: string,
    @Param('notaId') notaId: string,
    @Body() updateDto: UpdateNotaDto,
  ) {
    return this.auditoriasService.updateNota(id, notaId, updateDto);
  }

  /**
   * DELETE /esap/auditorias/:id/notas/:notaId
   * Elimina una nota (soft delete)
   */
  @Delete(':id/notas/:notaId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_DELETE, CIP.AUDITORIA_EDIT)
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteNota(@Param('id') id: string, @Param('notaId') notaId: string) {
    return this.auditoriasService.deleteNota(id, notaId);
  }

  /**
   * PATCH /esap/auditorias/:id/notas/:notaId/importante
   * Marca o desmarca una nota como importante
   */
  @Patch(':id/notas/:notaId/importante')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_EDIT)
  toggleImportanteNota(@Param('id') id: string, @Param('notaId') notaId: string) {
    return this.auditoriasService.toggleImportanteNota(id, notaId);
  }

  /**
   * POST /auditorias/:id/aprobar
   * Aprueba una auditoría
   */
  @Post(':id/aprobar')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_APPROVE)
  @HttpCode(HttpStatus.OK)
  aprobar(
    @Param('id') id: string, 
    @Body() body: { 
      comentarios?: string;
      usuarioId?: number;
      usuarioNombre?: string;
    }
  ) {
    return this.auditoriasService.aprobarAuditoria(
      id, 
      body.comentarios,
      body.usuarioId,
      body.usuarioNombre
    );
  }

  /**
   * POST /auditorias/:id/rechazar
   * Rechaza una auditoría
   */
  @Post(':id/rechazar')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_APPROVE)
  @HttpCode(HttpStatus.OK)
  rechazar(@Param('id') id: string, @Body() body: { justificacion: string }) {
    if (!body.justificacion || body.justificacion.trim().length < 20) {
      throw new BadRequestException('La justificación debe tener al menos 20 caracteres');
    }
    return this.auditoriasService.rechazarAuditoria(id, body.justificacion);
  }

  /**
   * POST /auditorias/:id/modificacion
   * Solicita modificación de una auditoría
   */
  @Post(':id/modificacion')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_EDIT)
  @HttpCode(HttpStatus.OK)
  solicitarModificacion(@Param('id') id: string, @Body() body: { observaciones: string }) {
    if (!body.observaciones || body.observaciones.trim().length < 20) {
      throw new BadRequestException('Las observaciones deben tener al menos 20 caracteres');
    }
    return this.auditoriasService.solicitarModificacionAuditoria(id, body.observaciones);
  }

  /**
   * GET /esap/auditorias/kanban/all
   * Obtiene todas las auditorías para el Kanban con todas las relaciones
   */
  @Get('kanban/all')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_VIEW)
  findAllKanban() {
    return this.auditoriasService.findAllKanban();
  }

  /**
   * GET /esap/auditorias/kanban/archivadas
   * Obtiene todas las auditorías archivadas para el Kanban
   */
  @Get('kanban/archivadas')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_VIEW)
  findAllKanbanArchivadas() {
    return this.auditoriasService.findAllKanbanArchivadas();
  }

  /**
   * GET /esap/auditorias/personas/all
   * Retorna todas las personas de auth.personas (máx 50, orden alfabético).
   * Pensado para precargar el selector «Responsable del Área Auditada» al abrir el formulario.
   */
  @Get('personas/all')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_VIEW)
  async getAllPersonas(@Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    return this.auditoriasService.getAllPersonas(parsedLimit > 0 ? parsedLimit : 50);
  }

  /**
   * GET /esap/auditorias/personas/buscar
   * Busca una persona por número de identificación
   * Retorna el ID_TERCERO que se usa como FK
   */
  @Get('personas/buscar')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_VIEW)
  async buscarPersona(@Query('numeroIdentificacion') numeroIdentificacion: string) {
    if (!numeroIdentificacion) {
      throw new BadRequestException('El número de identificación es requerido');
    }
    
    const persona = await this.auditoriasService.buscarPersonaPorNumeroIdentificacion(numeroIdentificacion);
    
    if (!persona) {
      throw new BadRequestException(`No se encontró una persona con el número de identificación: ${numeroIdentificacion}`);
    }
    
    return persona;
  }

  /**
   * GET /esap/auditorias/personas/disponibles
   * Obtiene todas las personas disponibles para ser auditores
   */
  @Get('personas/disponibles')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_VIEW)
  async obtenerPersonasDisponibles() {
    return this.auditoriasService.obtenerPersonasDisponibles();
  }

  /**
   * GET /esap/auditorias/personas/search?q=...
   * Búsqueda libre en auth.personas por nombre, email o identificación.
   * Pensado para autocompletar el "responsable del área auditada" al crear
   * una auditoría.
   */
  @Get('personas/search')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_VIEW)
  async searchPersonas(@Query('q') q?: string) {
    if (!q || q.trim().length < 2) {
      throw new BadRequestException(
        'El parámetro q es obligatorio y debe tener al menos 2 caracteres',
      );
    }
    return this.auditoriasService.searchPersonasByText(q);
  }

  /**
   * GET /esap/auditorias/codigo/:codigo
   * Busca una auditoría por código
   */
  @Get('codigo/:codigo')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_VIEW)
  findByCodigo(@Param('codigo') codigo: string) {
    return this.auditoriasService.findByCodigo(codigo);
  }

  /**
   * GET /esap/auditorias/:id/hallazgos
   * Obtiene todos los hallazgos de una auditoría
   */
  @Get(':id/hallazgos')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_VIEW)
  getHallazgosByAuditoria(@Param('id') id: string) {
    return this.hallazgosService.findByAuditoria(id);
  }

  /**
   * GET /auditorias/:id/notas
   * Obtiene todas las notas de una auditoría
   */
  @Get(':id/notas')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_VIEW)
  getNotasByAuditoria(@Param('id') id: string) {
    return this.auditoriasService.getNotasByAuditoria(id);
  }

  /**
   * GET /auditorias/:id/resumen-ejecutivo-cierre
   * Resumen para el Informe de Cierre (Sección 2)
   */
  @Get(':id/resumen-ejecutivo-cierre')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_VIEW)
  getResumenEjecutivoCierre(@Param('id') id: string) {
    return this.auditoriasService.getResumenEjecutivoCierre(id);
  }

  /**
   * PATCH /auditorias/:id/informe-cierre
   * Guarda borrador de lecciones aprendidas y recomendaciones
   */
  @Patch(':id/informe-cierre')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_EDIT)
  updateInformeCierre(
    @Param('id') id: string,
    @Body() body: { leccionesAprendidas?: string; recomendacionesFuturasAuditorias?: string },
  ) {
    return this.auditoriasService.updateInformeCierre(id, body);
  }

  /**
   * POST /auditorias/:id/aprobar-informe-cierre
   * Aprueba el Informe de Cierre (Jefe OCI). Valida que todas las acciones estén verificadas.
   */
  @Post(':id/aprobar-informe-cierre')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_APPROVE)
  @HttpCode(HttpStatus.OK)
  async aprobarInformeCierre(
    @Param('id') id: string,
    @Body() body: { aprobadoPor?: string; aprobadoPorId?: number | string },
    @Req() req: any,
  ) {
    const planes = await this.planesMejoramientoService.findByAuditoriaId(id);
    let totalAcciones = 0;
    let verificadas = 0;
    for (const plan of planes) {
      const acciones = plan.acciones || [];
      totalAcciones += acciones.length;
      verificadas += acciones.filter(
        (a: any) =>
          a.estadoVerificacionOci && !['', 'sin_verificar'].includes(String(a.estadoVerificacionOci)),
      ).length;
    }
    if (totalAcciones > 0 && verificadas < totalAcciones) {
      throw new BadRequestException(
        `Debe verificar todas las acciones del plan de mejoramiento antes de aprobar el informe de cierre (${verificadas}/${totalAcciones} verificadas).`,
      );
    }
    const aprobadoPor = body.aprobadoPor || this.extractUserFromToken(req)?.username || 'Jefe OCI';
    const aprobadoPorId = body.aprobadoPorId ?? this.extractUserFromToken(req)?.userId;
    return this.auditoriasService.aprobarInformeCierre(id, aprobadoPor, aprobadoPorId);
  }

  /**
   * GET /auditorias/:id/comunicacion/estado
   * Estado del flujo de comunicación para la UI
   */
  @Get(':id/comunicacion/estado')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_VIEW)
  async getEstadoComunicacion(@Param('id') id: string) {
    const [hallazgos, auditoria] = await Promise.all([
      this.hallazgosService.findByAuditoria(id),
      this.auditoriasService.findOne(id),
    ]);
    // Informe preliminar generado = ningún hallazgo en borrador (incluye 0 hallazgos)
    const hayEnBorrador = hallazgos.some((h: any) => (h.estado || '').toLowerCase() === 'borrador');
    const informePreliminarGenerado = !hayEnBorrador;
    const hayControversiasPendientes = await this.hallazgosService.hayControversiasPendientes(id);
    const todosCerrados = hallazgos.length === 0 || hallazgos.every((h: any) =>
      ['aceptado', 'ratificado', 'modificado', 'retirado', 'cerrado'].includes(h.estado),
    );
    const checklist = (auditoria as any).checklistCompletados || {};
    const informeFinalGenerado = !!checklist.informeFinalGenerado;
    const informeEjecutivoGenerado = !!checklist.informeEjecutivoGenerado;
    return {
      informePreliminarGenerado,
      informeFinalGenerado,
      informeEjecutivoGenerado,
      hayControversiasPendientes,
      puedeGenerarInformeFinal: !hayControversiasPendientes && todosCerrados,
      conteo: {
        pendiente: hallazgos.filter((h: any) => h.estado === 'notificado').length,
        aceptado: hallazgos.filter((h: any) => h.estado === 'aceptado').length,
        enControversia: hallazgos.filter((h: any) => h.estado === 'en-controversia').length,
      },
    };
  }

  /**
   * GET /auditorias/:id
   * Obtiene una auditoría por ID
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_VIEW)
  findOne(@Param('id') id: string) {
    return this.auditoriasService.findOne(id);
  }

  /**
   * POST /esap/auditorias
   * Crea una nueva auditoría
   */
  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_CREATE)
  create(@Body() createDto: CreateAuditoriaDto) {
    return this.auditoriasService.create(createDto);
  }

  /**
   * PATCH /esap/auditorias/:id
   * Actualiza una auditoría existente
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_EDIT)
  update(@Param('id') id: string, @Body() updateDto: UpdateAuditoriaDto) {
    return this.auditoriasService.update(id, updateDto);
  }

  /**
   * PUT /esap/auditorias/:id
   * Actualiza una auditoría existente (alias de PATCH)
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_EDIT)
  updatePut(@Param('id') id: string, @Body() updateDto: UpdateAuditoriaDto) {
    return this.auditoriasService.update(id, updateDto);
  }

  /**
   * PATCH /esap/auditorias/:id/progreso
   * Actualiza el progreso de una auditoría
   */
  @Patch(':id/progreso')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_EDIT)
  updateProgreso(
    @Param('id') id: string,
    @Body('progreso') progreso: number,
  ) {
    return this.auditoriasService.updateProgreso(id, progreso);
  }

  /**
   * PATCH /esap/auditorias/:id/fase
   * Actualiza la fase de una auditoría
   */
  @Patch(':id/fase')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_EDIT)
  updateFase(
    @Param('id') id: string,
    @Body('fase') fase: FaseAuditoria,
  ) {
    return this.auditoriasService.updateFase(id, fase);
  }

  /**
   * PATCH /esap/auditorias/:id/estado-kanban
   * Actualiza el estado Kanban de una auditoría (para drag & drop)
   * Acepta tanto valores en español ('Plan Anual', 'Planeación') como normalizados
   * IMPORTANTE: No permite cambiar a 'Finalizada' directamente (usar endpoint /finalizar)
   */
  @Patch(':id/estado-kanban')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_EDIT)
  updateEstadoKanban(
    @Param('id') id: string,
    @Body('estadoKanban') estadoKanban: string,
  ) {
    return this.auditoriasService.updateEstadoKanban(id, estadoKanban);
  }

  /**
   * POST /esap/auditorias/:id/finalizar
   * Finaliza una auditoría con documento de cierre obligatorio
   * Requiere cargar matriz/formato de cierre (archivo multipart)
   */
  @Post(':id/finalizar')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_EDIT)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = process.env.UPLOAD_PATH || './uploads/auditorias/cierre';
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
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
      fileFilter: (req, file, cb) => {
        const allowedTypes = [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
        ];
        if (allowedTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Solo se permiten archivos PDF, Word o Excel'), false);
        }
      },
    }),
  )
  finalizarAuditoria(
    @Param('id') id: string,
    @UploadedFile() file: any,
    @Body() body: any,
  ) {
    if (!file) {
      throw new BadRequestException(
        'El documento de cierre es obligatorio para finalizar la auditoría',
      );
    }
    return this.auditoriasService.finalizarAuditoriaConArchivo(
      id,
      file,
      body.observaciones || '',
      body.finalizadaPor || 'Sistema',
      body.finalizadaPorId ? parseInt(body.finalizadaPorId, 10) : null,
    );
  }

  /**
   * POST /auditorias/:id/informe-final/generar
   * Marca informe final como generado (persiste en checklist)
   */
  @Post(':id/informe-final/generar')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_EDIT)
  async generarInformeFinal(@Param('id') id: string) {
    await this.auditoriasService.update(id, {
      checklistCompletados: { informeFinalGenerado: true },
    });
    try {
      await this.auditoriasService.notificarInformeFinalGenerado(id);
    } catch (notifErr) {
      console.error('[AuditoriasController] Error notificando informe final al auditado:', notifErr.message);
    }
    return {
      generado: true,
      mensaje:
        'Informe Final generado. Se notificó al área auditada para formular el plan de mejoramiento (30 días hábiles).',
    };
  }

  /**
   * POST /auditorias/:id/informe-ejecutivo/generar
   * Marca informe ejecutivo como generado (persiste en checklist)
   */
  @Post(':id/informe-ejecutivo/generar')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_EDIT)
  async generarInformeEjecutivo(@Param('id') id: string) {
    await this.auditoriasService.update(id, {
      checklistCompletados: { informeEjecutivoGenerado: true },
    });
    return { generado: true, mensaje: 'Informe Ejecutivo generado' };
  }

  /**
   * POST /auditorias/:id/informe-preliminar/generar
   * Genera informe preliminar y notifica al área (actualiza hallazgos a NOTIFICADO)
   */
  @Post(':id/informe-preliminar/generar')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_EDIT)
  async generarInformePreliminar(@Param('id') id: string) {
    const { count, total } = await this.hallazgosService.notificarHallazgosAuditoria(id);
    let mensaje: string;
    if (count > 0) {
      mensaje = `Informe preliminar generado. ${count} hallazgo(s) notificado(s) al área auditada. Período de 10 días hábiles iniciado.`;
    } else if (total > 0) {
      mensaje = `Informe preliminar generado. Los ${total} hallazgo(s) ya estaban notificados o procesados (aceptados/ratificados).`;
    } else {
      mensaje = 'Informe preliminar generado. No hay hallazgos registrados en esta auditoría.';
    }
    return {
      generado: true,
      hallazgosNotificados: count,
      mensaje,
    };
  }

  /**
   * POST /esap/auditorias/:id/hallazgos/incrementar
   * Incrementa el contador de hallazgos
   */
  @Post(':id/hallazgos/incrementar')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_EDIT)
  incrementarHallazgos(@Param('id') id: string) {
    return this.auditoriasService.incrementarHallazgos(id);
  }

  /**
   * POST /esap/auditorias/:id/hallazgos/decrementar
   * Decrementa el contador de hallazgos
   */
  @Post(':id/hallazgos/decrementar')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_EDIT)
  decrementarHallazgos(@Param('id') id: string) {
    return this.auditoriasService.decrementarHallazgos(id);
  }

  /**
   * DELETE /esap/auditorias/:id
   * Elimina una auditoría
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.auditoriasService.delete(id);
  }

  /**
   * POST /esap/auditorias/:id/ampliar-plazo/solicitar
   * Solicita ampliación de plazo de una auditoría en curso
   * RN-031.2: Solo Auditor Líder asignado a la auditoría puede solicitar
   */
  @Post(':id/ampliar-plazo/solicitar')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_EDIT)
  @HttpCode(HttpStatus.OK)
  solicitarAmpliacionPlazo(
    @Param('id') id: string,
    @Body() solicitarDto: SolicitarAmpliacionPlazoDto,
    @Req() req: any,
  ) {
    console.log('📝 [Controller] Solicitar ampliación plazo - ID:', id);
    console.log('📝 [Controller] Request body:', JSON.stringify(solicitarDto, null, 2));
    
    // Intentar extraer usuario del token si está presente (opcional)
    // Si req.user existe (de un guard previo), usarlo; sino, intentar extraer del token
    let user = req.user || null;
    if (!user) {
      user = this.extractUserFromToken(req);
    }
    
    console.log('📝 [Controller] User extraído:', user ? JSON.stringify(user, null, 2) : 'null');
    
    const userId = user?.userId || null;
    const userRoles = user?.roles || (user?.role ? [user.role] : []);
    
    return this.auditoriasService.solicitarAmpliacionPlazo(
      id, 
      solicitarDto, 
      userId,
      userRoles
    );
  }

  /**
   * POST /esap/auditorias/:id/ampliar-plazo/aprobar
   * Aprueba una solicitud de ampliación de plazo
   * RN-031.3: Solo Jefe de Control Interno o Administrador pueden aprobar
   */
  @Post(':id/ampliar-plazo/aprobar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('JEFE_CONTROL_INTERNO', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  aprobarAmpliacionPlazo(
    @Param('id') id: string,
    @Body() aprobarDto: AprobarAmpliacionPlazoDto,
    @Req() req: any,
  ) {
    const user = req.user;
    return this.auditoriasService.aprobarAmpliacionPlazo(
      id, 
      aprobarDto, 
      user.userId,
      user.roles || [user.role]
    );
  }

  /**
   * POST /esap/auditorias/:id/ampliar-plazo/rechazar
   * Rechaza una solicitud de ampliación de plazo
   * RN-031.3: Solo Jefe de Control Interno o Administrador pueden rechazar
   */
  @Post(':id/ampliar-plazo/rechazar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('JEFE_CONTROL_INTERNO', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  rechazarAmpliacionPlazo(
    @Param('id') id: string,
    @Body() rechazarDto: RechazarAmpliacionPlazoDto,
    @Req() req: any,
  ) {
    const user = req.user;
    return this.auditoriasService.rechazarAmpliacionPlazo(
      id, 
      rechazarDto, 
      user.userId,
      user.roles || [user.role]
    );
  }

  /**
   * GET /esap/auditorias/ampliar-plazo/pendientes
   * Obtiene todas las solicitudes de ampliación de plazo pendientes
   * Útil para que el Jefe OCI vea todas las solicitudes que requieren aprobación
   */
  @Get('ampliar-plazo/pendientes')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_VIEW)
  getSolicitudesAmpliacionPendientes() {
    return this.auditoriasService.getSolicitudesAmpliacionPendientes();
  }

  /**
   * GET /esap/auditorias/:id/historial
   * Obtiene el historial completo de cambios de una auditoría
   */
  @Get(':id/historial')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_VIEW)
  getHistorialAuditoria(@Param('id') id: string) {
    return this.auditoriasService.getHistorialAuditoria(id);
  }
}












