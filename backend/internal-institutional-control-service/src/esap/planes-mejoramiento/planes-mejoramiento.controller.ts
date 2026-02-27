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
  NotFoundException,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { PlanesMejoramientoService } from './planes-mejoramiento.service';
import { CreatePlanMejoramientoDto } from './dto/create-plan-mejoramiento.dto';
import { UpdatePlanMejoramientoDto } from './dto/update-plan-mejoramiento.dto';
import { CreateAccionDto } from './dto/create-accion.dto';
import { UpdateAccionDto } from './dto/update-accion.dto';
import { RegistrarAvanceDto } from './dto/registrar-avance.dto';
import { CreateRegistroSeguimientoDto } from './dto/create-registro-seguimiento.dto';
import { CreateEventoTimelineDto } from './dto/create-evento-timeline.dto';
import { RechazarPlanDto } from './dto/rechazar-plan.dto';

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
  findAll(
    @Query('estado') estado?: string,
    @Query('area') area?: string,
  ) {
    return this.planesMejoramientoService.findAll({ estado, area });
  }

  /**
   * GET /planes-mejoramiento/:id
   * Obtiene un plan por ID
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.planesMejoramientoService.findOne(id);
  }

  /**
   * GET /planes-mejoramiento/hallazgo/:hallazgoId
   * Obtiene el plan de mejoramiento de un hallazgo
   */
  @Get('hallazgo/:hallazgoId')
  findByHallazgo(@Param('hallazgoId') hallazgoId: string) {
    return this.planesMejoramientoService.findByHallazgo(hallazgoId);
  }

  /**
   * POST /planes-mejoramiento
   * Crea un nuevo plan de mejoramiento
   */
  @Post()
  create(@Body() createDto: CreatePlanMejoramientoDto) {
    return this.planesMejoramientoService.create(createDto);
  }

  /**
   * PUT /planes-mejoramiento/:id
   * Actualiza un plan de mejoramiento
   */
  @Put(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdatePlanMejoramientoDto) {
    return this.planesMejoramientoService.update(id, updateDto);
  }

  /**
   * DELETE /planes-mejoramiento/:id
   * Elimina un plan de mejoramiento
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.planesMejoramientoService.delete(id);
  }

  /**
   * POST /planes-mejoramiento/:id/aprobar
   * Aprueba un plan de mejoramiento
   */
  @Post(':id/aprobar')
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
  rechazar(@Param('id') id: string, @Body() rechazarDto: RechazarPlanDto) {
    return this.planesMejoramientoService.rechazar(id, rechazarDto.motivo_rechazo);
  }

  /**
   * GET /planes-mejoramiento/:id/seguimiento
   * Obtiene el seguimiento de un plan
   */
  @Get(':id/seguimiento')
  getSeguimiento(@Param('id') id: string) {
    return this.planesMejoramientoService.getSeguimiento(id);
  }

  /**
   * POST /planes-mejoramiento/:id/avance
   * Registra el avance de un plan (crea o actualiza seguimiento trimestral)
   */
  @Post(':id/avance')
  registrarAvance(@Param('id') id: string, @Body() avanceDto: RegistrarAvanceDto) {
    return this.planesMejoramientoService.registrarAvance(id, avanceDto);
  }

  /**
   * GET /planes-mejoramiento/:id/semaforo
   * Obtiene el semáforo de cumplimiento de un plan
   */
  @Get(':id/semaforo')
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
  createAccion(@Param('planId') planId: string, @Body() createDto: CreateAccionDto) {
    return this.planesMejoramientoService.createAccion(planId, createDto);
  }

  /**
   * PUT /planes-mejoramiento/:planId/acciones/:accionId
   * Actualiza una acción correctiva
   */
  @Put(':planId/acciones/:accionId')
  updateAccion(
    @Param('planId') planId: string,
    @Param('accionId') accionId: string,
    @Body() updateDto: UpdateAccionDto,
  ) {
    return this.planesMejoramientoService.updateAccion(planId, accionId, updateDto);
  }

  /**
   * DELETE /planes-mejoramiento/:planId/acciones/:accionId
   * Elimina una acción correctiva
   */
  @Delete(':planId/acciones/:accionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteAccion(@Param('planId') planId: string, @Param('accionId') accionId: string) {
    return this.planesMejoramientoService.deleteAccion(planId, accionId);
  }

  /**
   * POST /planes-mejoramiento/:planId/acciones/:accionId/evidencias
   * Carga evidencia en una acción (solo metadata, para URLs externas)
   */
  @Post(':planId/acciones/:accionId/evidencias')
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
}

