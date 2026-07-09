import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { existsSync, mkdirSync, renameSync } from 'fs';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuditoriasService } from './auditorias.service';
import { HallazgosService } from '../hallazgos/hallazgos.service';
import { DocumentosService } from '../documentos/documentos.service';
import { CreateDocumentoDto } from '../documentos/dto/create-documento.dto';
import { PlanesMejoramientoService } from '../planes-mejoramiento/planes-mejoramiento.service';
import { UpdateAccionDto } from '../planes-mejoramiento/dto/update-accion.dto';
import { EvidenciasService } from '../evidencias/evidencias.service';
import { CreateEvidenciaDto } from '../evidencias/dto/create-evidencia.dto';
import { CreateAccionDto } from '../planes-mejoramiento/dto/create-accion.dto';
import { CreatePlanMejoramientoDto } from '../planes-mejoramiento/dto/create-plan-mejoramiento.dto';
import { PlanMejoramientoEstado } from '../planes-mejoramiento/entities/plan-mejoramiento.entity';

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

/**
 * Controller dedicado al portal del AUDITADO (responsable del área auditada).
 *
 * Filosofía:
 *  - Todas las rutas usan únicamente JwtAuthGuard (NO requieren permisos de
 *    `control-interno.*`), porque el auditado es un usuario funcional, no
 *    miembro de la OCI.
 *  - La autorización se realiza por *ownership*: el email/username del JWT
 *    debe coincidir con `auditoria.responsable_area_email`.
 *  - Solo se exponen auditorías que ya fueron notificadas (fase >= comunicación).
 */
@Controller('auditorias/auditado')
@UseGuards(JwtAuthGuard)
export class AuditadoController {
  constructor(
    private readonly auditoriasService: AuditoriasService,
    private readonly hallazgosService: HallazgosService,
    private readonly documentosService: DocumentosService,
    private readonly planesMejoramientoService: PlanesMejoramientoService,
    private readonly evidenciasService: EvidenciasService,
  ) {}

  private getUsuarioFromReq(req: any): { email?: string; username?: string } {
    const u = req?.user || {};
    const username = u.username ? String(u.username).trim() : undefined;
    // En ESAP el login suele usar el correo como username; auth.user no tiene columna email.
    const email = (u.email ? String(u.email).trim() : undefined) || username;
    return { email, username };
  }

  private toDateOnly(value: Date | string): string {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return new Date().toISOString().split('T')[0];
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private addDays(value: Date | string, days: number): string {
    const date = value instanceof Date ? new Date(value) : new Date(value);
    if (Number.isNaN(date.getTime())) {
      date.setTime(Date.now());
    }
    date.setDate(date.getDate() + days);
    return this.toDateOnly(date);
  }

  /**
   * GET /auditorias/auditado/mis-auditorias
   * Lista las auditorías en las que el usuario autenticado figura como
   * responsable del área auditada.
   */
  @Get('mis-auditorias')
  async findMisAuditorias(@Req() req: any) {
    const { email, username } = this.getUsuarioFromReq(req);
    return this.auditoriasService.findMisAuditoriasByUsuario({
      email,
      username,
    });
  }

  /**
   * GET /auditorias/auditado/:id/planes-mejoramiento
   * Planes de mejoramiento vinculados a la auditoría (solo si el JWT es el responsable del área).
   */
  @Get(':id/planes-mejoramiento')
  async findMisPlanesMejoramiento(@Param('id') auditoriaId: string, @Req() req: any) {
    const usuario = this.getUsuarioFromReq(req);
    await this.auditoriasService.assertAuditadoOwnership(auditoriaId, usuario);
    return this.planesMejoramientoService.findByAuditoriaId(auditoriaId);
  }

  /**
   * POST /auditorias/auditado/:id/planes-mejoramiento
   * El auditado crea el borrador inicial del plan de mejoramiento de su auditoría.
   * No requiere permiso OCI; la autorización se hace por ownership.
   */
  @Post(':id/planes-mejoramiento')
  @HttpCode(HttpStatus.CREATED)
  async crearMiPlanMejoramiento(
    @Param('id') auditoriaId: string,
    @Body() body: Partial<CreatePlanMejoramientoDto>,
    @Req() req: any,
  ) {
    const usuario = this.getUsuarioFromReq(req);
    const auditoria = await this.auditoriasService.assertAuditadoOwnership(auditoriaId, usuario);

    const checklist = (auditoria as any).checklistCompletados || {};
    if (!checklist.informeFinalGenerado) {
      throw new BadRequestException(
        'El plan de mejoramiento solo puede crearse después de generar el Informe Final.',
      );
    }

    const fechaBase =
      (auditoria as any).fechaFinalizacion ||
      (auditoria as any).fechaFin ||
      new Date();

    const dto: CreatePlanMejoramientoDto = {
      titulo:
        body?.titulo ||
        `Plan de Mejoramiento - ${auditoria.codigo || auditoria.nombre || 'Auditoría'}`,
      descripcion:
        body?.descripcion ||
        'Plan de mejoramiento formulado por el área auditada a partir del Informe Final.',
      objetivos: Array.isArray(body?.objetivos) && body.objetivos.length > 0
        ? body.objetivos
        : ['Formular y ejecutar acciones correctivas para los hallazgos aceptados, ratificados o modificados.'],
      auditoriaId,
      areaResponsable:
        body?.areaResponsable ||
        auditoria.areaObjetivo ||
        auditoria.procesoAuditado ||
        auditoria.sede ||
        'Área auditada',
      responsableImplementacion:
        body?.responsableImplementacion ||
        auditoria.responsableAreaEmail ||
        auditoria.responsableAreaNombre ||
        usuario.username ||
        usuario.email ||
        'Auditado',
      fechaLimite: body?.fechaLimite || this.addDays(fechaBase, 30),
      acciones: body?.acciones,
    };

    return this.planesMejoramientoService.create(dto);
  }

  /**
   * POST /auditorias/auditado/:id/planes/:planId/acciones
   * El auditado (líder del proceso) propone/formula sus propias acciones correctivas.
   * Solo permitido si el plan está en BORRADOR o REVISION (no APROBADO).
   * Según Ley 87/1993 + EM-PT-002: el auditado tiene 5 días hábiles para formular.
   */
  @Post(':id/planes/:planId/acciones')
  @HttpCode(HttpStatus.CREATED)
  async crearMiAccionPlan(
    @Param('id') auditoriaId: string,
    @Param('planId') planId: string,
    @Body() body: CreateAccionDto,
    @Req() req: any,
  ) {
    const usuario = this.getUsuarioFromReq(req);
    await this.auditoriasService.assertAuditadoOwnership(auditoriaId, usuario);

    const plan = await this.planesMejoramientoService.findOne(planId);
    if (plan.auditoriaId !== auditoriaId) {
      throw new ForbiddenException('El plan de mejoramiento no pertenece a esta auditoría');
    }

    // Bloquear si el plan ya fue aprobado — el auditado no puede agregar acciones post-aprobación
    const estadosEditables: string[] = [
      PlanMejoramientoEstado.BORRADOR,
      PlanMejoramientoEstado.REVISION,
      PlanMejoramientoEstado.RECHAZADO,
    ];
    if (!estadosEditables.includes(plan.estado)) {
      throw new ForbiddenException(
        `No se pueden agregar acciones: el plan está en estado "${plan.estado}". ` +
        `Solo se permite en estado BORRADOR, REVISION o RECHAZADO (formulación).`,
      );
    }

    // Asignar el responsable como el usuario autenticado si no se especifica
    const dto: CreateAccionDto = {
      ...body,
      responsable: body.responsable || usuario.username || usuario.email || 'Auditado',
    };

    return this.planesMejoramientoService.createAccion(planId, dto);
  }

  /**
   * PATCH /auditorias/auditado/:id/planes/:planId/enviar-revision
   * El auditado envía el plan a revisión por parte de la OCI.
   * Permitido si el plan está en BORRADOR o RECHAZADO (para reenviar tras correcciones).
   */
  @Patch(':id/planes/:planId/enviar-revision')
  @HttpCode(HttpStatus.OK)
  async enviarPlanRevision(
    @Param('id') auditoriaId: string,
    @Param('planId') planId: string,
    @Req() req: any,
  ) {
    const usuario = this.getUsuarioFromReq(req);
    await this.auditoriasService.assertAuditadoOwnership(auditoriaId, usuario);
    const plan = await this.planesMejoramientoService.findOne(planId);
    if (plan.auditoriaId !== auditoriaId) {
      throw new ForbiddenException('El plan de mejoramiento no pertenece a esta auditoría');
    }
    const estadosPermitidos = [PlanMejoramientoEstado.BORRADOR, PlanMejoramientoEstado.RECHAZADO];
    if (!estadosPermitidos.includes(plan.estado)) {
      throw new BadRequestException(
        `Solo se puede enviar a revisión un plan en estado BORRADOR o RECHAZADO. Estado actual: "${plan.estado}".`,
      );
    }

    // Validar que exista al menos una acción por cada hallazgo aceptado, ratificado o modificado.
    const hallazgos = await this.hallazgosService.findByAuditoria(auditoriaId);
    const hallazgosRequeridos = hallazgos.filter((h) =>
      ['aceptado', 'ratificado', 'modificado'].includes(String(h.estado || '').toLowerCase()),
    );

    const getHallazgoIdFromAccion = (accion: any): string | null => {
      if (!accion) return null;
      if (accion.hallazgoId) return String(accion.hallazgoId);
      if (accion.hallazgo_id) return String(accion.hallazgo_id);
      if (accion.hallazgo && typeof accion.hallazgo === 'object') {
        return String(accion.hallazgo.id);
      }
      if (accion.hallazgo && typeof accion.hallazgo === 'string') {
        return String(accion.hallazgo);
      }
      return null;
    };

    const hallazgosFaltantes = hallazgosRequeridos.filter((h) => {
      const tieneAccion = plan.acciones?.some((a) => getHallazgoIdFromAccion(a) === h.id);
      return !tieneAccion;
    });

    if (hallazgosFaltantes.length > 0) {
      const codigos = hallazgosFaltantes.map((h) => h.codigo).join(', ');
      throw new BadRequestException(
        `Para enviar el plan de mejoramiento a revisión, debe registrar al menos una acción correctiva por cada hallazgo aceptado, ratificado o modificado. Faltan acciones para los hallazgos: ${codigos}.`,
      );
    }

    return this.planesMejoramientoService.update(planId, { estado: PlanMejoramientoEstado.REVISION });
  }

  /**
   * PUT /auditorias/auditado/:id/planes/:planId/acciones/:accionId
   * Editar campos de formulación de una acción (descripción, responsable, fechas, indicador).
   * Solo permitido si el plan está en BORRADOR o REVISION (no aprobado).
   */
  @Put(':id/planes/:planId/acciones/:accionId')
  async editarMiAccionPlan(
    @Param('id') auditoriaId: string,
    @Param('planId') planId: string,
    @Param('accionId') accionId: string,
    @Body() body: Pick<UpdateAccionDto, 'descripcion' | 'responsable' | 'fechaInicio' | 'fechaFin' | 'indicador' | 'metaIndicador' | 'hallazgoId'>,
    @Req() req: any,
  ) {
    const usuario = this.getUsuarioFromReq(req);
    await this.auditoriasService.assertAuditadoOwnership(auditoriaId, usuario);
    const plan = await this.planesMejoramientoService.findOne(planId);
    if (plan.auditoriaId !== auditoriaId) {
      throw new ForbiddenException('El plan no pertenece a esta auditoría');
    }
    const estadosEditables: string[] = [
      PlanMejoramientoEstado.BORRADOR,
      PlanMejoramientoEstado.REVISION,
      PlanMejoramientoEstado.RECHAZADO,
    ];
    if (!estadosEditables.includes(plan.estado)) {
      throw new ForbiddenException(
        `No se puede editar: el plan está en estado "${plan.estado}". Solo se permite en BORRADOR, REVISION o RECHAZADO.`,
      );
    }
    return this.planesMejoramientoService.updateAccion(planId, accionId, body as UpdateAccionDto);
  }

  /**
   * DELETE /auditorias/auditado/:id/planes/:planId/acciones/:accionId
   * Eliminar una acción del plan. Solo permitido en BORRADOR o REVISION.
   */
  @Delete(':id/planes/:planId/acciones/:accionId')
  @HttpCode(HttpStatus.OK)
  async eliminarMiAccionPlan(
    @Param('id') auditoriaId: string,
    @Param('planId') planId: string,
    @Param('accionId') accionId: string,
    @Req() req: any,
  ) {
    const usuario = this.getUsuarioFromReq(req);
    await this.auditoriasService.assertAuditadoOwnership(auditoriaId, usuario);
    const plan = await this.planesMejoramientoService.findOne(planId);
    if (plan.auditoriaId !== auditoriaId) {
      throw new ForbiddenException('El plan no pertenece a esta auditoría');
    }
    const estadosEditables: string[] = [
      PlanMejoramientoEstado.BORRADOR,
      PlanMejoramientoEstado.REVISION,
      PlanMejoramientoEstado.RECHAZADO,
    ];
    if (!estadosEditables.includes(plan.estado)) {
      throw new ForbiddenException(
        `No se puede eliminar: el plan está en estado "${plan.estado}".`,
      );
    }
    return this.planesMejoramientoService.deleteAccion(planId, accionId);
  }

  /**
   * PATCH /auditorias/auditado/:id/planes/:planId/acciones/:accionId
   * El auditado actualiza avance u observaciones de una acción de SU plan (sin permisos OCI).
   */
  @Patch(':id/planes/:planId/acciones/:accionId')
  async updateMiAccionPlan(
    @Param('id') auditoriaId: string,
    @Param('planId') planId: string,
    @Param('accionId') accionId: string,
    @Body() body: Pick<UpdateAccionDto, 'observaciones' | 'porcentajeAvance' | 'estado'>,
    @Req() req: any,
  ) {
    const usuario = this.getUsuarioFromReq(req);
    await this.auditoriasService.assertAuditadoOwnership(auditoriaId, usuario);
    const plan = await this.planesMejoramientoService.findOne(planId);
    if (plan.auditoriaId !== auditoriaId) {
      throw new ForbiddenException('El plan de mejoramiento no pertenece a esta auditoría');
    }
    const dto: UpdateAccionDto = {
      observaciones: body.observaciones,
      porcentajeAvance: body.porcentajeAvance,
      estado: body.estado,
    };
    return this.planesMejoramientoService.updateAccion(planId, accionId, dto);
  }

  /**
   * GET /auditorias/auditado/:id/planes/:planId/acciones/:accionId/evidencias
   * Lista las evidencias subidas para una acción correctiva del plan del auditado.
   */
  @Get(':id/planes/:planId/acciones/:accionId/evidencias')
  async listEvidenciasAccion(
    @Param('id') auditoriaId: string,
    @Param('planId') planId: string,
    @Param('accionId') accionId: string,
    @Req() req: any,
  ) {
    const usuario = this.getUsuarioFromReq(req);
    await this.auditoriasService.assertAuditadoOwnership(auditoriaId, usuario);
    const plan = await this.planesMejoramientoService.findOne(planId);
    if (plan.auditoriaId !== auditoriaId) {
      throw new ForbiddenException('El plan de mejoramiento no pertenece a esta auditoría');
    }
    return this.evidenciasService.findByAccion(accionId);
  }

  /**
   * POST /auditorias/auditado/:id/planes/:planId/acciones/:accionId/evidencias
   * El auditado sube una evidencia vinculada a una acción de su plan de mejoramiento.
   * Solo requiere JwtAuthGuard (NO permisos OCI); la autorización es por ownership.
   */
  @Post(':id/planes/:planId/acciones/:accionId/evidencias')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const uploadPath = process.env.UPLOAD_PATH
            ? `${process.env.UPLOAD_PATH}/evidencias/temp`
            : './uploads/evidencias/temp';
          if (!existsSync(uploadPath)) {
            mkdirSync(uploadPath, { recursive: true });
          }
          cb(null, uploadPath);
        },
        filename: (_req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
    }),
  )
  @HttpCode(HttpStatus.CREATED)
  async uploadEvidenciaAccion(
    @Param('id') auditoriaId: string,
    @Param('planId') planId: string,
    @Param('accionId') accionId: string,
    @UploadedFile() file: MulterFile,
    @Body() body: any,
    @Req() req: any,
  ) {
    const usuario = this.getUsuarioFromReq(req);

    // 1. Ownership: el JWT debe ser el responsable del área auditada
    await this.auditoriasService.assertAuditadoOwnership(auditoriaId, usuario);

    // 2. El plan debe pertenecer a esta auditoría
    const plan = await this.planesMejoramientoService.findOne(planId);
    if (plan.auditoriaId !== auditoriaId) {
      throw new ForbiddenException('El plan de mejoramiento no pertenece a esta auditoría');
    }

    if (!file) {
      throw new BadRequestException('No se proporcionó ningún archivo');
    }

    const createDto: CreateEvidenciaDto = {
      nombre: body.nombre || file.originalname,
      descripcion: body.descripcion,
      tipoDocumento: body.tipoDocumento,
      accionCorrectivaId: accionId,
      // Las demás vinculaciones se omiten intencionalmente (solo una permitida)
    };

    const subidoPor = usuario.username || usuario.email || 'Auditado';
    return this.evidenciasService.create(file, createDto, subidoPor);
  }

  /**
   * GET /auditorias/auditado/:id
   * Detalle completo de una de mis auditorías.
   */
  @Get(':id')
  async findMiAuditoria(@Param('id') id: string, @Req() req: any) {
    const usuario = this.getUsuarioFromReq(req);
    await this.auditoriasService.assertAuditadoOwnership(id, usuario);
    return this.auditoriasService.findOne(id);
  }

  /**
   * GET /auditorias/auditado/:id/hallazgos
   * Hallazgos de una de mis auditorías.
   */
  @Get(':id/hallazgos')
  async findMisHallazgos(@Param('id') id: string, @Req() req: any) {
    const usuario = this.getUsuarioFromReq(req);
    await this.auditoriasService.assertAuditadoOwnership(id, usuario);
    const hallazgos = await this.hallazgosService.findByAuditoria(id);
    // Filtrar los hallazgos en estado Borrador para que no los vea el área auditada
    return hallazgos.filter(h => (h.estado || '').toLowerCase() !== 'borrador');
  }

  /**
   * GET /auditorias/auditado/:id/documentos
   * Documentos asociados a una de mis auditorías.
   */
  @Get(':id/documentos')
  async findMisDocumentos(@Param('id') id: string, @Req() req: any) {
    const usuario = this.getUsuarioFromReq(req);
    await this.auditoriasService.assertAuditadoOwnership(id, usuario);
    return this.documentosService.findAll({ auditoriaId: id });
  }

  /**
   * GET /auditorias/auditado/:id/comunicacion/estado
   * Estado del flujo de comunicación visible al auditado.
   */
  @Get(':id/comunicacion/estado')
  async getEstadoComunicacion(@Param('id') id: string, @Req() req: any) {
    const usuario = this.getUsuarioFromReq(req);
    await this.auditoriasService.assertAuditadoOwnership(id, usuario);

    const [hallazgos, auditoria] = await Promise.all([
      this.hallazgosService.findByAuditoria(id),
      this.auditoriasService.findOne(id),
    ]);

    const hayEnBorrador = hallazgos.some(
      (h: any) => (h.estado || '').toLowerCase() === 'borrador',
    );
    const informePreliminarGenerado = !hayEnBorrador;
    const hayControversiasPendientes =
      await this.hallazgosService.hayControversiasPendientes(id);
    const checklist = (auditoria as any).checklistCompletados || {};
    const informeFinalGenerado = !!checklist.informeFinalGenerado;
    const informeEjecutivoGenerado = !!checklist.informeEjecutivoGenerado;

    return {
      informePreliminarGenerado,
      informeFinalGenerado,
      informeEjecutivoGenerado,
      hayControversiasPendientes,
      conteo: {
        pendiente: hallazgos.filter((h: any) => h.estado === 'notificado').length,
        aceptado: hallazgos.filter((h: any) => h.estado === 'aceptado').length,
        enControversia: hallazgos.filter(
          (h: any) => h.estado === 'en-controversia',
        ).length,
      },
    };
  }

  /**
   * POST /auditorias/auditado/:id/documentos
   * Subida de un documento (p.ej. evidencia anexa a una controversia)
   * por parte del auditado. El backend valida ownership de la auditoría
   * antes de aceptar el archivo.
   */
  @Post(':id/documentos')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const uploadPath = process.env.UPLOAD_PATH || './uploads/control-interno';
          if (!existsSync(uploadPath)) {
            mkdirSync(uploadPath, { recursive: true });
          }
          cb(null, uploadPath);
        },
        filename: (_req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      limits: {
        fileSize: 50 * 1024 * 1024,
      },
    }),
  )
  @HttpCode(HttpStatus.CREATED)
  async uploadDocumento(
    @Param('id') auditoriaId: string,
    @UploadedFile() file: MulterFile,
    @Body() body: any,
    @Req() req: any,
  ) {
    const usuario = this.getUsuarioFromReq(req);
    await this.auditoriasService.assertAuditadoOwnership(auditoriaId, usuario);

    if (!file) {
      throw new BadRequestException('No se proporcionó ningún archivo');
    }

    const createDto: CreateDocumentoDto = {
      nombre: body.nombre || file.originalname,
      descripcion: body.descripcion,
      tipoDocumento: body.tipoDocumento as any,
      etapa: body.etapa as any,
      auditoriaId,
      hallazgoId: body.hallazgoId || undefined,
      planMejoramientoId: body.planMejoramientoId || undefined,
      nombreArchivo: file.originalname,
      tipoMime: file.mimetype,
      tamanioBytes: file.size,
      subidoPor: usuario.username || usuario.email || 'Auditado',
      hashArchivo: undefined,
    };

    const rutaFinal = this.documentosService.generarRutaArchivo(
      file.originalname,
      auditoriaId,
      createDto.etapa,
    );

    const path = require('path');
    const dir = path.dirname(rutaFinal);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    renameSync(file.path, rutaFinal);

    return this.documentosService.create(createDto, rutaFinal);
  }

  /**
   * POST /auditorias/auditado/:id/hallazgos/:hallazgoId/aceptar
   * El auditado acepta un hallazgo notificado.
   */
  @Post(':id/hallazgos/:hallazgoId/aceptar')
  @HttpCode(HttpStatus.OK)
  async aceptarHallazgo(
    @Param('id') auditoriaId: string,
    @Param('hallazgoId') hallazgoId: string,
    @Req() req: any,
  ) {
    const usuario = this.getUsuarioFromReq(req);
    await this.auditoriasService.assertAuditadoOwnership(auditoriaId, usuario);

    const hallazgo = await this.hallazgosService.findOne(hallazgoId);
    if (hallazgo.auditoriaId !== auditoriaId) {
      throw new BadRequestException(
        'El hallazgo no pertenece a la auditoría indicada',
      );
    }

    return this.hallazgosService.aceptar(hallazgoId);
  }

  /**
   * POST /auditorias/auditado/:id/hallazgos/:hallazgoId/controversia
   * El auditado presenta controversia (con documento ya subido previamente).
   */
  @Post(':id/hallazgos/:hallazgoId/controversia')
  @HttpCode(HttpStatus.OK)
  async presentarControversia(
    @Param('id') auditoriaId: string,
    @Param('hallazgoId') hallazgoId: string,
    @Body()
    body: { argumentos: string; documentoId: string; documentoNombre: string },
    @Req() req: any,
  ) {
    const usuario = this.getUsuarioFromReq(req);
    await this.auditoriasService.assertAuditadoOwnership(auditoriaId, usuario);

    const hallazgo = await this.hallazgosService.findOne(hallazgoId);
    if (hallazgo.auditoriaId !== auditoriaId) {
      throw new BadRequestException(
        'El hallazgo no pertenece a la auditoría indicada',
      );
    }

    const { argumentos, documentoId, documentoNombre } = body || ({} as any);
    if (!documentoId || !documentoNombre) {
      throw new BadRequestException(
        'documentoId y documentoNombre son obligatorios (subir archivo primero)',
      );
    }

    return this.hallazgosService.presentarControversia(
      hallazgoId,
      argumentos,
      documentoId,
      documentoNombre,
    );
  }
}
