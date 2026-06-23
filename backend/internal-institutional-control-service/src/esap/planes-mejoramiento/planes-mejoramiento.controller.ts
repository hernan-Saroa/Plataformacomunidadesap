import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  NotFoundException,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { ControlInternoPermissions as CIP } from '../../common/permissions.constants';
import { PlanesMejoramientoService } from './planes-mejoramiento.service';
import { CreatePlanMejoramientoDto } from './dto/create-plan-mejoramiento.dto';
import { UpdatePlanMejoramientoDto } from './dto/update-plan-mejoramiento.dto';
import { CreateAccionDto } from './dto/create-accion.dto';
import { UpdateAccionDto } from './dto/update-accion.dto';
import { RegistrarAvanceDto } from './dto/registrar-avance.dto';
import { CreateRegistroSeguimientoDto } from './dto/create-registro-seguimiento.dto';
import { CreateEventoTimelineDto } from './dto/create-evento-timeline.dto';
import { RechazarPlanDto } from './dto/rechazar-plan.dto';
import { RegistrarVerificacionOciDto } from './dto/registrar-verificacion-oci.dto';

// Tipo para el archivo subido
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

@Controller('planes-mejoramiento')
export class PlanesMejoramientoController {
  constructor(private readonly planesMejoramientoService: PlanesMejoramientoService) {}

  /**
   * GET /planes-mejoramiento
   * Lista todos los planes de mejoramiento con filtros opcionales
   */
  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_MEJORAMIENTO_VIEW)
  findAll(
    @Query('estado') estado?: string,
    @Query('area') area?: string,
    @Query('planAnualVigencia') planAnualVigencia?: string,
  ) {
    const vigenciaNum =
      planAnualVigencia != null && planAnualVigencia !== ''
        ? parseInt(planAnualVigencia, 10)
        : undefined;
    return this.planesMejoramientoService.findAll({
      estado,
      area,
      planAnualVigencia:
        vigenciaNum != null && !Number.isNaN(vigenciaNum) ? vigenciaNum : undefined,
    });
  }

  /**
   * POST /planes-mejoramiento/sync-rol4-tareas?vigencia=2026
   * Backfill de tareas de seguimiento Rol 4 (actividad planes de mejoramiento).
   */
  @Post('sync-rol4-tareas')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_MEJORAMIENTO_EDIT)
  syncRol4Tareas(@Query('vigencia') vigencia?: string) {
    const año = vigencia ? parseInt(vigencia, 10) : new Date().getFullYear();
    if (Number.isNaN(año)) {
      throw new BadRequestException('Parámetro vigencia inválido');
    }
    return this.planesMejoramientoService.sincronizarTareasRol4Vigencia(año);
  }

  /**
   * GET /planes-mejoramiento/auditoria/:auditoriaId
   * Obtiene los planes de una auditoría para verificación OCI (Cierre - Sección 1)
   */
  @Get('auditoria/:auditoriaId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_MEJORAMIENTO_VIEW)
  findByAuditoriaId(@Param('auditoriaId') auditoriaId: string) {
    return this.planesMejoramientoService.findByAuditoriaId(auditoriaId);
  }

  /**
   * GET /planes-mejoramiento/:id
   * Obtiene un plan por ID
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_MEJORAMIENTO_VIEW)
  findOne(@Param('id') id: string) {
    return this.planesMejoramientoService.findOne(id);
  }

  /**
   * GET /planes-mejoramiento/hallazgo/:hallazgoId
   * Obtiene el plan de mejoramiento de un hallazgo
   */
  @Get('hallazgo/:hallazgoId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_MEJORAMIENTO_VIEW)
  findByHallazgo(@Param('hallazgoId') hallazgoId: string) {
    return this.planesMejoramientoService.findByHallazgo(hallazgoId);
  }

  /**
   * POST /planes-mejoramiento
   * Crea un nuevo plan de mejoramiento
   */
  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_MEJORAMIENTO_CREATE)
  create(@Body() createDto: CreatePlanMejoramientoDto) {
    return this.planesMejoramientoService.create(createDto);
  }

  /**
   * PUT /planes-mejoramiento/:id
   * Actualiza un plan de mejoramiento
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_MEJORAMIENTO_EDIT)
  update(@Param('id') id: string, @Body() updateDto: UpdatePlanMejoramientoDto) {
    return this.planesMejoramientoService.update(id, updateDto);
  }

  /**
   * DELETE /planes-mejoramiento/:id
   * Elimina un plan de mejoramiento
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_MEJORAMIENTO_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.planesMejoramientoService.delete(id);
  }

  /**
   * POST /planes-mejoramiento/:id/aprobar
   * Aprueba un plan de mejoramiento
   */
  @Post(':id/aprobar')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_MEJORAMIENTO_APPROVE)
  aprobar(
    @Param('id') id: string,
    @Body() body: { observaciones?: string; aprobadoPor?: string },
  ) {
    return this.planesMejoramientoService.aprobar(id, body.observaciones, body.aprobadoPor);
  }

  /**
   * POST /planes-mejoramiento/:id/rechazar
   * Rechaza un plan de mejoramiento
   */
  @Post(':id/rechazar')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_MEJORAMIENTO_APPROVE)
  rechazar(@Param('id') id: string, @Body() rechazarDto: RechazarPlanDto) {
    return this.planesMejoramientoService.rechazar(id, rechazarDto.motivo_rechazo);
  }

  /**
   * GET /planes-mejoramiento/:id/seguimiento
   * Obtiene el seguimiento de un plan
   */
  @Get(':id/seguimiento')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_MEJORAMIENTO_VIEW)
  getSeguimiento(@Param('id') id: string) {
    return this.planesMejoramientoService.getSeguimiento(id);
  }

  /**
   * POST /planes-mejoramiento/:id/avance
   * Registra el avance de un plan (crea o actualiza seguimiento trimestral)
   */
  @Post(':id/avance')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_MEJORAMIENTO_FOLLOW_UP)
  registrarAvance(@Param('id') id: string, @Body() avanceDto: RegistrarAvanceDto) {
    return this.planesMejoramientoService.registrarAvance(id, avanceDto);
  }

  /**
   * GET /planes-mejoramiento/:id/semaforo
   * Obtiene el semáforo de cumplimiento de un plan
   */
  @Get(':id/semaforo')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_MEJORAMIENTO_VIEW)
  async getSemaforo(@Param('id') id: string) {
    const plan = await this.planesMejoramientoService.findOne(id);
    // Calcular cumplimiento promedio
    const cumplimiento = plan.acciones && plan.acciones.length > 0
      ? Math.round(plan.acciones.reduce((sum, a) => sum + a.porcentajeAvance, 0) / plan.acciones.length)
      : 0;
    
    // Determinar color del semáforo
    let color: 'verde' | 'amarillo' | 'rojo' = 'verde';
    if (cumplimiento < 50) {
      color = 'rojo';
    } else if (cumplimiento < 80) {
      color = 'amarillo';
    }

    return {
      planId: plan.id,
      planCodigo: plan.codigo,
      cumplimiento,
      estado: plan.estado,
      color,
      accionesTotal: plan.acciones?.length || 0,
      accionesCompletadas: plan.acciones?.filter(a => a.estado === 'completada' || a.estado === 'implementada').length || 0,
    };
  }

  /**
   * POST /planes-mejoramiento/:planId/acciones
   * Crea una acción correctiva en un plan
   */
  @Post(':planId/acciones')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_MEJORAMIENTO_EDIT)
  createAccion(@Param('planId') planId: string, @Body() createDto: CreateAccionDto) {
    return this.planesMejoramientoService.createAccion(planId, createDto);
  }

  /**
   * PUT /planes-mejoramiento/:planId/acciones/:accionId
   * Actualiza una acción correctiva
   */
  @Put(':planId/acciones/:accionId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_MEJORAMIENTO_EDIT)
  updateAccion(
    @Param('planId') planId: string,
    @Param('accionId') accionId: string,
    @Body() updateDto: UpdateAccionDto,
  ) {
    return this.planesMejoramientoService.updateAccion(planId, accionId, updateDto);
  }

  /**
   * PATCH /planes-mejoramiento/:planId/acciones/:accionId/verificacion-oci
   * Registra la verificación OCI de una acción (Cierre - Sección 1). Inmutable tras registrar.
   */
  @Patch(':planId/acciones/:accionId/verificacion-oci')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_MEJORAMIENTO_EDIT)
  registrarVerificacionOci(
    @Param('planId') planId: string,
    @Param('accionId') accionId: string,
    @Body() dto: RegistrarVerificacionOciDto,
    @Req() req?: any,
  ) {
    const userId = req?.user?.sub ? Number(req.user.sub) : undefined;
    return this.planesMejoramientoService.registrarVerificacionOci(planId, accionId, dto, userId);
  }

  /**
   * DELETE /planes-mejoramiento/:planId/acciones/:accionId
   * Elimina una acción correctiva
   */
  @Delete(':planId/acciones/:accionId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_MEJORAMIENTO_EDIT)
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteAccion(@Param('planId') planId: string, @Param('accionId') accionId: string) {
    return this.planesMejoramientoService.deleteAccion(planId, accionId);
  }

  /**
   * POST /planes-mejoramiento/:planId/acciones/:accionId/evidencias
   * Carga evidencia en una acción (solo metadata, para URLs externas)
   */
  @Post(':planId/acciones/:accionId/evidencias')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_MEJORAMIENTO_EDIT)
  async cargarEvidencia(
    @Param('planId') planId: string,
    @Param('accionId') accionId: string,
    @Body() evidencia: {
      nombre: string;
      tipo: string;
      url: string;
      fecha?: string;
    },
  ) {
    const plan = await this.planesMejoramientoService.findOne(planId);
    const accion = plan.acciones.find((a) => a.id === accionId);
    
    if (!accion) {
      throw new NotFoundException(`Acción con ID ${accionId} no encontrada`);
    }

    const nuevaEvidencia = {
      id: Date.now().toString(),
      nombre: evidencia.nombre,
      tipo: evidencia.tipo,
      url: evidencia.url,
      fecha: evidencia.fecha || new Date().toISOString(),
      validado: false,
    };

    const evidencias = [...(accion.evidencias || []), nuevaEvidencia];

    return this.planesMejoramientoService.updateAccion(planId, accionId, {
      evidencias,
    } as any);
  }

  /**
   * POST /planes-mejoramiento/:planId/acciones/:accionId/evidencias/upload
   * Sube archivo de evidencia y lo asocia a la acción (multipart/form-data)
   */
  @Post(':planId/acciones/:accionId/evidencias/upload')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_MEJORAMIENTO_EDIT)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = process.env.UPLOAD_PATH || './uploads/evidencias/acciones';
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
      limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    }),
  )
  async subirEvidenciaArchivo(
    @Param('planId') planId: string,
    @Param('accionId') accionId: string,
    @UploadedFile() file: MulterFile,
    @Body() body: { descripcion?: string; subidoPor?: string },
  ) {
    if (!file) {
      throw new BadRequestException('No se proporcionó ningún archivo');
    }

    const plan = await this.planesMejoramientoService.findOne(planId);
    const accion = plan.acciones.find((a) => a.id === accionId);
    
    if (!accion) {
      throw new NotFoundException(`Acción con ID ${accionId} no encontrada en el plan ${planId}`);
    }

    // Crear nueva evidencia con datos del archivo
    const nuevaEvidencia = {
      id: Date.now().toString(),
      nombre: file.originalname,
      tipo: file.mimetype,
      url: `/uploads/evidencias/acciones/${file.filename}`,
      fecha: new Date().toISOString(),
      validado: false,
      tamanio: file.size,
      descripcion: body.descripcion || '',
      subidoPor: body.subidoPor || 'system',
    };

    const evidencias = [...(accion.evidencias || []), nuevaEvidencia];

    const accionActualizada = await this.planesMejoramientoService.updateAccion(planId, accionId, {
      evidencias,
    } as any);

    return {
      success: true,
      message: 'Evidencia cargada exitosamente',
      evidencia: nuevaEvidencia,
      accion: accionActualizada,
    };
  }

  /**
   * POST /planes-mejoramiento/:planId/acciones/:accionId/evidencias/:evidenciaId/validar
   * Valida una evidencia de una acción
   */
  @Post(':planId/acciones/:accionId/evidencias/:evidenciaId/validar')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_MEJORAMIENTO_FOLLOW_UP)
  async validarEvidencia(
    @Param('planId') planId: string,
    @Param('accionId') accionId: string,
    @Param('evidenciaId') evidenciaId: string,
    @Body() data: { validado: boolean; validadoPor?: string },
  ) {
    const plan = await this.planesMejoramientoService.findOne(planId);
    const accion = plan.acciones.find((a) => a.id === accionId);
    
    if (!accion) {
      throw new NotFoundException(`Acción con ID ${accionId} no encontrada`);
    }

    const evidencias = (accion.evidencias || []).map((ev) => {
      if (ev.id === evidenciaId) {
        return {
          ...ev,
          validado: data.validado,
          validadoPor: data.validadoPor,
          fechaValidacion: data.validado ? new Date().toISOString() : undefined,
        };
      }
      return ev;
    });

    return this.planesMejoramientoService.updateAccion(planId, accionId, { evidencias } as any);
  }

  /**
   * POST /planes-mejoramiento/:planId/seguimientos/:seguimientoId/registros
   * Crea un registro de seguimiento para una acción
   */
  @Post(':planId/seguimientos/:seguimientoId/registros')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_MEJORAMIENTO_FOLLOW_UP)
  createRegistroSeguimiento(
    @Param('planId') planId: string,
    @Param('seguimientoId') seguimientoId: string,
    @Body() body: CreateRegistroSeguimientoDto & { accionId: string },
  ) {
    return this.planesMejoramientoService.createRegistroSeguimiento(
      planId,
      seguimientoId,
      body.accionId,
      body,
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ENDPOINTS PARA EVENTOS DEL TIMELINE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * GET /planes-mejoramiento/:planId/eventos
   * Obtiene todos los eventos del timeline de un plan
   */
  @Get(':planId/eventos')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_MEJORAMIENTO_VIEW)
  async getEventosTimeline(@Param('planId') planId: string) {
    try {
      const eventos = await this.planesMejoramientoService.getEventosTimeline(planId);
      return {
        success: true,
        eventos,
      };
    } catch (error) {
      throw new NotFoundException(error.message);
    }
  }

  /**
   * POST /planes-mejoramiento/:planId/eventos
   * Crea un nuevo evento en el timeline
   */
  @Post(':planId/eventos')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_MEJORAMIENTO_EDIT)
  async createEventoTimeline(
    @Param('planId') planId: string,
    @Body() createDto: CreateEventoTimelineDto,
  ) {
    try {
      const evento = await this.planesMejoramientoService.createEventoTimeline(planId, createDto);
      return {
        success: true,
        evento,
      };
    } catch (error) {
      throw new NotFoundException(error.message);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ENDPOINTS DE SEGUIMIENTO, EVALUACIÓN Y CIERRE
  // Fuente: spec-plan-mejoramiento-seguimiento §5.4
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * POST /planes-mejoramiento/acciones/:accionId/evidencias-seguimiento
   * Carga evidencia formal (auditado). Tabla evidencia_accion.
   */
  @Post('acciones/:accionId/evidencias-seguimiento')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_MEJORAMIENTO_EDIT)
  cargarEvidenciaFormal(
    @Param('accionId') accionId: string,
    @Body() body: {
      archivoRef: string;
      archivoNombre: string;
      archivoTipo?: string;
      archivoTamanio?: number;
      descripcion?: string;
      cargadaPorId: string;
      cargadaPorNombre?: string;
    },
  ) {
    return this.planesMejoramientoService.cargarEvidenciaAccion(accionId, body);
  }

  /**
   * GET /planes-mejoramiento/acciones/:accionId/evidencias-seguimiento
   * Lista evidencias formales de una acción.
   */
  @Get('acciones/:accionId/evidencias-seguimiento')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_MEJORAMIENTO_VIEW)
  listarEvidenciasFormal(@Param('accionId') accionId: string) {
    return this.planesMejoramientoService.listarEvidenciasAccion(accionId);
  }

  /**
   * PUT /planes-mejoramiento/evidencias/:evidenciaId/calificacion
   * Califica evidencia (Aceptado / Con Observaciones). Solo auditor.
   */
  @Put('evidencias/:evidenciaId/calificacion')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_MEJORA_VALIDAR_EVIDENCIA)
  calificarEvidenciaFormal(
    @Param('evidenciaId') evidenciaId: string,
    @Body() body: {
      calificacion: 'aceptado' | 'con_observaciones';
      comentarios?: string;
      solicitaNuevaEvidencia?: boolean;
      calificadaPorId: string;
      calificadaPorNombre?: string;
    },
  ) {
    return this.planesMejoramientoService.calificarEvidencia(evidenciaId, body);
  }

  /**
   * PUT /planes-mejoramiento/acciones/:accionId/seguimiento-emfo
   * Registra cumplimiento por acción (cantidad implementada → cálculo automático).
   */
  @Put('acciones/:accionId/seguimiento-emfo')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_MEJORA_SEGUIMIENTO)
  registrarSeguimientoEmfo(
    @Param('accionId') accionId: string,
    @Body() body: {
      cantidadImplementada: number;
      observacionCumplimiento?: string;
      responsableSeguimiento?: string;
    },
  ) {
    return this.planesMejoramientoService.registrarSeguimientoAccion(accionId, body);
  }

  /**
   * PUT /planes-mejoramiento/acciones/:accionId/efectividad
   * Registra efectividad (dos criterios SI/NO → cálculo automático).
   */
  @Put('acciones/:accionId/efectividad')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_MEJORA_SEGUIMIENTO)
  registrarEfectividadAccion(
    @Param('accionId') accionId: string,
    @Body() body: {
      evaluarAplicacionControles: boolean;
      validarSituacionNoRepitio: boolean;
      observacionEfectividad?: string;
    },
  ) {
    return this.planesMejoramientoService.registrarEfectividad(accionId, body);
  }

  /**
   * GET /planes-mejoramiento/:planId/alertas
   * Lista alertas generadas para un plan.
   */
  @Get(':planId/alertas')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_MEJORAMIENTO_VIEW)
  getAlertasPlan(@Param('planId') planId: string) {
    return this.planesMejoramientoService.getAlertas(planId);
  }

  /**
   * POST /planes-mejoramiento/:planId/generar-alertas
   * Genera alertas nuevas evaluando condiciones actuales.
   */
  @Post(':planId/generar-alertas')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_MEJORA_SEGUIMIENTO)
  generarAlertasPlan(@Param('planId') planId: string) {
    return this.planesMejoramientoService.generarAlertas(planId);
  }

  /**
   * PUT /planes-mejoramiento/:planId/cierre
   * Cierra un plan de mejoramiento.
   */
  @Put(':planId/cierre')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_MEJORA_CERRAR)
  cerrarPlanMejoramiento(
    @Param('planId') planId: string,
    @Body() body: {
      cerradoPorId: string;
      cerradoPorNombre?: string;
      observacionesCierre?: string;
    },
  ) {
    return this.planesMejoramientoService.cerrarPlan(planId, body);
  }

  /**
   * PUT /planes-mejoramiento/:planId/archivo
   * Archiva el expediente (índice electrónico).
   */
  @Put(':planId/archivo')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_MEJORA_CERRAR)
  archivarExpedientePlan(
    @Param('planId') planId: string,
    @Body() body: { indiceElectronicoRef: string },
  ) {
    return this.planesMejoramientoService.archivarExpediente(planId, body);
  }

  /**
   * GET /planes-mejoramiento/:planId/cierre
   * Obtiene el estado de cierre de un plan.
   */
  @Get(':planId/cierre')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_MEJORAMIENTO_VIEW)
  getCierrePlan(@Param('planId') planId: string) {
    return this.planesMejoramientoService.getCierre(planId);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SEGUIMIENTO PERIÓDICO (RF-SG-09 / EM-PT-002 act. 5 y 7)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * GET /planes-mejoramiento/:planId/seguimientos
   * Lista los seguimientos periódicos de un plan.
   */
  @Get(':planId/seguimientos')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_MEJORAMIENTO_VIEW)
  getSeguimientosPlan(@Param('planId') planId: string) {
    return this.planesMejoramientoService.getSeguimientosPlan(planId);
  }

  /**
   * POST /planes-mejoramiento/:planId/seguimientos
   * Registra un seguimiento periódico manual + informe (RF-SG-10).
   */
  @Post(':planId/seguimientos')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_MEJORA_SEGUIMIENTO)
  registrarSeguimiento(
    @Param('planId') planId: string,
    @Body() body: {
      periodicidad: 'TRIMESTRAL' | 'SEMESTRAL';
      tipoControl: 'INTERNO' | 'ENTE_EXTERNO';
      fechaCorte: string;
      responsableId: string;
      responsableNombre?: string;
      resumen?: string;
      informeRef?: string;
    },
  ) {
    return this.planesMejoramientoService.registrarSeguimientoPeriodico(planId, body);
  }
}
