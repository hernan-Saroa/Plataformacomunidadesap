import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Logger,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Request } from 'express';
import { AnyFilesInterceptor, FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'node:fs';
import { Public } from '../auth/public.decorator';
import { PtaService } from './pta.service';
import { PtaAuthGuard } from './auth/pta-auth.guard';

const ensureDir = (dir: string) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const buildDiskStorage = (folder: string, prefix: string) =>
  diskStorage({
    destination: (_req, _file, cb) => {
      const uploadDir = join(process.cwd(), 'uploads', folder);
      ensureDir(uploadDir);
      cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const ext = extname(file.originalname || '').toLowerCase() || '';
      cb(null, `${prefix}-${uniqueSuffix}${ext}`);
    },
  });

/**
 * Controlador PTA (migración inicial a Nest).
 *
 * Nota: por ahora responde con stubs compatibles con el frontend para evitar 404s
 * mientras se implementa la lógica real (DB/Prisma, reglas, workflows, etc).
 *
 * Base URL via Gateway:
 * - Gateway: /pta/api/v1/...  -> service: http://localhost:3003/...
 *
 * En desarrollo local directo el cliente llama al microservicio sin prefijo:
 * - Direct: http://localhost:3003/todos
 */
@Public()
@Controller()
export class PtaController {
  private readonly logger = new Logger(PtaController.name);

  constructor(private readonly ptaService: PtaService) {}

  // ─────────────────────────────
  // Catálogos
  // ─────────────────────────────
  @Get('catalogos/programas')
  async getCatalogoProgramas() {
    const data = await this.ptaService.getCatalogoProgramas();
    return { success: true, data, total: data.length };
  }

  @Get('catalogos/asignaturas')
  async getCatalogoAsignaturas(@Query() query: any) {
    const data = await this.ptaService.getCatalogoAsignaturas(query);
    return { success: true, data, total: data.length };
  }

  @Get('catalogos/territoriales')
  async getCatalogoTerritoriales(@Query('periodo') periodo?: string) {
    const data = await this.ptaService.getCatalogoTerritoriales(periodo);
    return { success: true, data, total: data.length };
  }

  @Get('catalogos/cetaps')
  async getCatalogoCetaps(@Query() query: any) {
    const data = await this.ptaService.getCatalogoCetaps(query);
    return { success: true, data, total: data.length };
  }

  // CETAPs filtrados por programa (via oferta_cetap_programa)
  @Get('catalogos/cetaps-por-programa')
  async getCetapsPorPrograma(@Query() query: any) {
    const data = await this.ptaService.getCetapsPorPrograma(query);
    return { success: true, data, total: data.length };
  }

  // Programas ofertados en un CETAP/Sede (acepta auth.sedes.id_sede)
  @Get('catalogos/programas-por-sede')
  async getProgramasPorSede(@Query() query: any) {
    const data = await this.ptaService.getProgramasPorSede(query);
    return { success: true, data, total: data.length };
  }

  // Cupos estimados para una combinación CETAP + Programa
  @Get('catalogos/oferta-cetap')
  async getOfertaCetap(@Query() query: any) {
    const data = await this.ptaService.getOfertaCetapPrograma(query);
    return { success: true, data };
  }

  @Get('catalogos/roles-investigacion')
  async getCatalogoRolesInvestigacion() {
    const data = await this.ptaService.getCatalogoRolesInvestigacion();
    return { success: true, data };
  }

  @Get('catalogos/actividades/extension')
  async getCatalogoActividadesExtension() {
    const data = await this.ptaService.getCatalogoActividadesExtension();
    return { success: true, data };
  }

  @Get('catalogos/secciones/extension')
  async getCatalogoSeccionesExtension() {
    const data = await this.ptaService.getCatalogoSeccionesExtension();
    return { success: true, data };
  }

  @Get('catalogos/actividades/investigacion')
  async getCatalogoActividadesInvestigacion() {
    const data = await this.ptaService.getCatalogoActividadesInvestigacion();
    return { success: true, data };
  }

  @Get('catalogos/actividades/complementarias')
  async getCatalogoActividadesComplementarias() {
    const data = await this.ptaService.getCatalogoActividadesComplementarias();
    return { success: true, data };
  }

  @Get('catalogos/actividades/academico-admin')
  async getCatalogoActividadesAcademicoAdmin() {
    const data = await this.ptaService.getCatalogoActividadesAcademicoAdmin();
    return { success: true, data };
  }

  // Catálogo agrupado por sección (Complementarias unificado: docencia + académico-admin).
  @Get('catalogos/actividades/complementarias-secciones')
  async getCatalogoComplementariasSecciones() {
    const data = await this.ptaService.getCatalogoComplementariasAgrupado();
    return { success: true, data };
  }

  @Post('catalogos/calcular-horas-programables')
  async calcularHorasProgramables(@Body() body: any) {
    const total_horas = await this.ptaService.calcHorasProgramables({
      tipo_vinculacion: body?.tipo_vinculacion,
      dedicacion: body?.dedicacion,
      semanas_vinculacion: body?.semanas_vinculacion,
    });
    return { success: true, data: { total_horas, semanas_vinculacion: body?.semanas_vinculacion ?? null } };
  }

  // ─────────────────────────────
  // Oferta / Docentes
  // ─────────────────────────────
  @Get('docentes-disponibles')
  async getDocentesDisponibles(@Query() query: any) {
    const data = await this.ptaService.getDocentesDisponibles(query);
    return { success: true, data };
  }

  @Get('oferta-academica')
  async getOfertaAcademica(@Query() query: any) {
    const data = await this.ptaService.getOfertaAcademica(query);
    return { success: true, data };
  }

  @Post('oferta-academica')
  saveOfertaAcademica(@Body() body: any) {
    return { success: true, data: body ?? null };
  }

  @Get('asignaciones-docentes')
  getAsignacionesDocentes(@Query() _query: any) {
    return { success: true, data: [] };
  }

  @Post('asignaciones-docentes')
  saveAsignacionDocente(@Body() body: any) {
    return { success: true, data: body ?? null };
  }

  // ─────────────────────────────
  // PTA CRUD / workflow
  // ─────────────────────────────
  @Get('todos')
  async getAll(@Query() query: any) {
    const data = await this.ptaService.getAllPTAs(query);
    return { success: true, data };
  }

  @Get('mis-ptas/:docenteId')
  async getMis(@Param('docenteId') docenteId: string, @Query('periodo') periodo?: string) {
    try {
      const data = await this.ptaService.getPTAsByDocente(docenteId, periodo);
      return { success: true, data };
    } catch (error: any) {
      this.logger.warn(`getPTAsByDocente failed for docente ${docenteId}: ${error.message}`);
      return { success: true, data: [] };
    }
  }

  @Get('id/:id')
  async getById(@Param('id') id: string) {
    const data = await this.ptaService.getPTAById(id);
    return { success: true, data };
  }

  @Post('save')
  @UseInterceptors(
    // El front envía multipart/form-data cuando hay archivos de resolución de
    // investigación (campos con nombres variables: inv_proyecto_resolucion,
    // inv_actividad_N_resolucion). Sin este interceptor, NestJS no parsea el body
    // multipart y se pierden TODOS los datos del PTA (quedaba en 0 horas).
    AnyFilesInterceptor({
      storage: buildDiskStorage('pta-resoluciones', 'pta-resolucion'),
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
  )
  async save(@Body() body: any, @UploadedFiles() files: any[], @Req() req: Request) {
    // En multipart el payload real viene como string JSON en el campo "payload".
    // En application/json, body ya es el objeto completo.
    let payload: any = body || {};
    if (typeof payload.payload === 'string') {
      try {
        payload = JSON.parse(payload.payload);
      } catch {
        // Si no se puede parsear, conservar el body tal cual para no romper el flujo.
      }
    }

    // Mapear los archivos subidos de vuelta a su actividad por nombre de campo.
    if (Array.isArray(files) && files.length > 0) {
      for (const f of files) {
        const url = `/uploads/pta-resoluciones/${f.filename}`;
        if (f.fieldname === 'inv_proyecto_resolucion') {
          payload.investigacion_proyecto = {
            ...(payload.investigacion_proyecto || {}),
            resolucion_archivo_url: url,
            resolucion_nombre: f.originalname,
          };
        } else {
          const m = /^inv_actividad_(\d+)_resolucion$/.exec(f.fieldname || '');
          if (m && Array.isArray(payload.investigacion_actividades)) {
            const idx = Number(m[1]);
            if (payload.investigacion_actividades[idx]) {
              payload.investigacion_actividades[idx] = {
                ...payload.investigacion_actividades[idx],
                resolucion_archivo_url: url,
                resolucion_nombre: f.originalname,
              };
            }
          }
        }
      }
    }

    // Fallback: si el front no envió docente_id (userPersonId vacío en el portal),
    // usar el usuario autenticado que el gateway inyecta en x-user-id. fetchAuthDocenteInfo
    // acepta tanto id_person/id_tercero como id_user como clave de búsqueda.
    const hasDocente = payload.docente_id || payload.docenteId || payload?.docente?.id || payload?.docente?.personaId;
    if (!hasDocente && !payload._adminEdit) {
      const headerUserId = (req.headers['x-user-id'] as string) || '';
      if (headerUserId) payload.docente_id = headerUserId;
    }
    const data = await this.ptaService.savePTA(payload);
    return { success: true, data };
  }

  @Post(':ptaId/estado')
  @UseGuards(PtaAuthGuard)
  async updateEstado(@Param('ptaId') ptaId: string, @Body() body: any, @Req() req: Request) {
    // Las acciones de aprobación/devolución se autorizan server-side con req.ptaAuth.
    const result = await this.ptaService.updatePTAStatus(ptaId, body || {}, req.ptaAuth);
    return { success: true, ...result };
  }

  @Get(':ptaId/aprobaciones-jefatura')
  async getAprobacionesJefatura(@Param('ptaId') ptaId: string) {
    const data = await this.ptaService.getAprobacionesJefatura(ptaId);
    return { success: true, data };
  }

  @Delete(':ptaId')
  async delete(@Param('ptaId') ptaId: string) {
    const data = await this.ptaService.deletePTA(ptaId);
    return { success: true, data };
  }

  @Get('estadisticas')
  async getEstadisticas(@Query() query: any) {
    const periodo = query?.periodo ? String(query.periodo) : undefined;
    const data = await this.ptaService.getEstadisticas(periodo);
    return { success: true, data, periodo: periodo || null };
  }

  @Get('configuracion')
  async getConfiguracion() {
    const data = await this.ptaService.getConfiguracionPTAGlobal();
    return { success: true, data };
  }

  @Post('configuracion')
  async saveConfiguracion(@Body() body: any, @Req() req: Request) {
    const rules = body?.rules ?? body;
    const userId = (req.headers['x-user-id'] as string) || 'admin';
    const data = await this.ptaService.saveConfiguracionPTAGlobal(rules, userId);
    return { success: true, data };
  }

  // Purga manual de PTAs vencidos (no aprobados dentro del plazo configurado).
  // El barrido también corre de forma automática (perezosa) al listar PTAs.
  @Post('mantenimiento/purgar-vencidos')
  async purgarVencidos() {
    const data = await this.ptaService.purgarPtasVencidos();
    return { success: true, data };
  }

  @Get('concertacion')
  getConcertacion(@Query() _query: any) {
    return { success: true, data: [] };
  }

  @Post('precarga')
  crearPrecarga(@Body() body: any) {
    return { success: true, data: body ?? null };
  }

  @Post('seed')
  async seed() {
    const data = await this.ptaService.seedPTAs();
    return { success: true, data };
  }

  @Post(':ptaId/notificar')
  notificar(@Param('ptaId') ptaId: string, @Body() body: any) {
    return { success: true, data: { ptaId, ...body } };
  }

  @Post(':ptaId/respuesta-docente')
  responderDocente(@Param('ptaId') ptaId: string, @Body() body: any) {
    return { success: true, data: { ptaId, ...body } };
  }

  @Post(':ptaId/concertacion/comentario')
  comentarioConcertacion(@Param('ptaId') ptaId: string, @Body() body: any) {
    return { success: true, data: { ptaId, ...body } };
  }

  @Post(':ptaId/concertacion/cerrar')
  cerrarConcertacion(@Param('ptaId') ptaId: string, @Body() body: any) {
    return { success: true, data: { ptaId, ...body } };
  }

  @Post(':ptaId/concertacion/escalar')
  escalarConcertacion(@Param('ptaId') ptaId: string, @Body() body: any) {
    return { success: true, data: { ptaId, ...body } };
  }

  @Post(':ptaId/enviar-aprobacion')
  @UseGuards(PtaAuthGuard)
  async enviarAprobacion(@Param('ptaId') ptaId: string, @Body() body: any, @Req() req: Request) {
    // El docente envía su propio PTA a aprobación (estado explícito, sin acción de
    // aprobador), por lo que no dispara la autorización por nivel; el guard solo
    // garantiza que exista una sesión válida.
    const result = await this.ptaService.updatePTAStatus(ptaId, {
      ...(body || {}),
      estado: 'Pendiente Jefatura',
      actorId: body?.actorId || body?.enviado_por || req.ptaAuth?.userId || (req.headers['x-user-id'] as string),
      actorRol: body?.actorRol || 'Docente',
      sistemaOrigen: body?.sistemaOrigen || 'portal',
    }, req.ptaAuth);
    return { success: true, ...result };
  }

  // (implementación real arriba, este stub fue reemplazado)

  @Post(':ptaId/firma-digital')
  firmaDigital(@Param('ptaId') ptaId: string, @Body() body: any) {
    return { success: true, data: { ptaId, ...body } };
  }

  // ─────────────────────────────
  // Firma electrónica OTP (legacy)
  // ─────────────────────────────
  @Post('firma-docente/request-code')
  async requestFirmaDocenteCode(@Body() body: any, @Req() req: Request) {
    // Fallback al usuario autenticado (x-user-id) cuando el front no envía docenteId.
    const docenteId = body?.docenteId || (req.headers['x-user-id'] as string) || '';
    const data = await this.ptaService.requestFirmaDocenteOtp({
      ptaId: body?.ptaId,
      docenteId,
      periodo: body?.periodo,
      etapaLabel: body?.etapaLabel,
    });
    return { success: true, message: 'Código enviado al correo registrado.', data };
  }

  @Post('firma-docente/verify-code')
  verifyFirmaDocenteCode(@Body() body: any) {
    const data = this.ptaService.verifyFirmaDocenteOtp({
      verificationId: body?.verificationId,
      code: body?.code,
    });
    return { success: true, ...data };
  }

  // Firma del aprobador/concertador: envía el OTP al correo del usuario que aprueba.
  @Post('firma-aprobador/request-code')
  async requestFirmaAprobadorCode(@Body() body: any, @Req() req: Request) {
    // Fallback al usuario autenticado (x-user-id) cuando el front no envía userId.
    const userId = body?.userId || (req.headers['x-user-id'] as string) || '';
    const data = await this.ptaService.requestFirmaAprobadorOtp({
      ptaId: body?.ptaId,
      userId,
      periodo: body?.periodo,
      etapaLabel: body?.etapaLabel,
    });
    return { success: true, message: 'Código enviado al correo registrado.', data };
  }

  @Post(':id/generate-otp')
  generateOtp(@Param('id') id: string) {
    const data = this.ptaService.generateOtp(id);
    return { success: true, message: 'Código generado. Válido por 5 minutos.', ...data };
  }

  @Post(':id/verify-otp')
  verifyOtp(@Param('id') id: string, @Body() body: any) {
    this.ptaService.verifyOtp(id, String(body?.otp || ''), { consume: true });
    return { success: true, verified: true };
  }

  @Post(':id/sign')
  async signWithOtp(@Param('id') id: string, @Body() body: any) {
    const data = await this.ptaService.signWithOtp(id, { otp: String(body?.otp || ''), nuevoEstado: body?.nuevoEstado });
    return { success: true, message: 'Aprobación / Firma exitosa', data };
  }

  // ─────────────────────────────
  // Evidencias
  // ─────────────────────────────
  @Get('evidencias/ptas')
  async getPtasConEvidencias(@Query('periodo') periodo?: string) {
    const data = await this.ptaService.getAllPtasConEvidencias(periodo);
    return { success: true, data };
  }

  @Get(':ptaId/evidencias')
  async getEvidencias(@Param('ptaId') ptaId: string) {
    const data = await this.ptaService.getEvidenciasPTA(ptaId);
    return { success: true, data };
  }

  @Post(':ptaId/evidencias/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: buildDiskStorage('pta-evidencias', 'pta-evidencia'),
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
  )
  uploadEvidencia(@UploadedFile() file: any) {
    if (!file) return { success: false, message: 'No se recibió archivo' };
    const fileUrl = `/uploads/pta-evidencias/${file.filename}`;
    return {
      success: true,
      data: {
        url: fileUrl,
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
      },
    };
  }

  @Post(':ptaId/evidencias')
  async crearEvidencia(@Param('ptaId') ptaId: string, @Body() body: any) {
    const data = await this.ptaService.registrarEvidenciaPTA(ptaId, body || {});
    return { success: true, data };
  }

  @Delete(':ptaId/evidencias/:evidenciaId')
  async eliminarEvidencia(@Param('ptaId') ptaId: string, @Param('evidenciaId') evidenciaId: string) {
    const data = await this.ptaService.eliminarEvidenciaPTA(ptaId, evidenciaId);
    return { success: true, data };
  }

  @Patch(':ptaId/evidencias/:evidenciaId/revision')
  async revisarEvidencia(@Param('ptaId') ptaId: string, @Param('evidenciaId') evidenciaId: string, @Body() body: any) {
    const data = await this.ptaService.revisarEvidenciaPTA(ptaId, evidenciaId, body || {});
    return { success: true, data };
  }

  // Alias para compatibilidad con el frontend (PATCH /evidencias/:id).
  @Patch(':ptaId/evidencias/:evidenciaId')
  async revisarEvidenciaAlias(@Param('ptaId') ptaId: string, @Param('evidenciaId') evidenciaId: string, @Body() body: any) {
    const data = await this.ptaService.revisarEvidenciaPTA(ptaId, evidenciaId, body || {});
    return { success: true, data };
  }

  // ─────────────────────────────
  // Solicitudes
  // ─────────────────────────────
  @Get('solicitudes')
  async getSolicitudes(@Query() query: any) {
    const data = await this.ptaService.getSolicitudesPTA({ estado: query?.estado });
    return { success: true, data };
  }

  @Post('solicitudes')
  async crearSolicitud(@Body() body: any) {
    const data = await this.ptaService.crearSolicitudPTA(body || {});
    return { success: true, data };
  }

  @Get('solicitudes/docente/:docenteId')
  async getSolicitudesDocente(@Param('docenteId') docenteId: string) {
    try {
      const data = await this.ptaService.getMisSolicitudesPTA(docenteId);
      return { success: true, data };
    } catch (error: any) {
      this.logger.warn(`getMisSolicitudesPTA failed for docente ${docenteId}: ${error.message}`);
      return { success: true, data: [] };
    }
  }

  @Patch('solicitudes/:solicitudId/resolver')
  @UseGuards(PtaAuthGuard)
  async resolverSolicitud(@Param('solicitudId') solicitudId: string, @Body() body: any, @Req() req: Request) {
    // HU-12: resolver (aprobar/denegar) solicitudes de PTA requiere el permiso
    // `pta.backoffice.solicitudes` (o ser aprobador integral / superusuario). Así el
    // seguimiento de estas solicitudes queda gobernado por roles y permisos.
    const auth = req.ptaAuth;
    const autorizado = !!auth && (auth.isSuperUser || auth.approvesAll || auth.permissions?.has('pta.backoffice.solicitudes'));
    if (!autorizado) {
      throw new ForbiddenException('No tiene permiso para gestionar solicitudes de PTA (pta.backoffice.solicitudes).');
    }
    // La identidad de quien resuelve proviene del token (integridad de auditoría).
    const payload = { ...(body || {}), resueltoPor: auth?.name || body?.resueltoPor };
    const data = await this.ptaService.resolverSolicitudPTA(solicitudId, payload);
    return { success: true, data };
  }

  @Patch('solicitudes/:solicitudId/leida')
  @HttpCode(200)
  async marcarLeida(@Param('solicitudId') solicitudId: string) {
    const data = await this.ptaService.marcarSolicitudLeida(solicitudId);
    return { success: true, data };
  }

  @Post('solicitudes/upload')
  @UseInterceptors(
    FilesInterceptor('files', 5, {
      storage: buildDiskStorage('pta-solicitudes', 'pta-solicitud'),
      limits: { files: 5, fileSize: 10 * 1024 * 1024 },
    }),
  )
  uploadSolicitudFiles(@UploadedFiles() files: any[]) {
    if (!files || files.length === 0) return { success: false, message: 'No se recibieron archivos' };
    const uploaded = files.map((f) => ({
      url: `/uploads/pta-solicitudes/${f.filename}`,
      nombre: f.originalname,
      tipo: String(f.originalname || '').split('.').pop(),
      tamanio: f.size,
    }));
    return { success: true, data: uploaded };
  }

  // ─────────────────────────────
  // Preferencias / user-data
  // ─────────────────────────────
  @Get('user-data/:userId')
  async getUserData(@Param('userId') userId: string) {
    const data = await this.ptaService.getPTAUserData(userId);
    return { success: true, data };
  }

  @Post('user-data/:userId')
  async saveUserData(@Param('userId') userId: string, @Body() body: any) {
    const data = await this.ptaService.savePTAUserData(userId, body || {});
    return { success: true, data };
  }

  // ─────────────────────────────
  // Reportes / dashboards / sync
  // ─────────────────────────────
  @Get('reportes/nacional')
  getReporteNacional(@Query() _query: any) {
    return {
      success: true,
      data: {
        resumenNacional: {
          totalDocentes: 0,
          totalAprobados: 0,
          totalPendientes: 0,
          porcentajeAvanceGlobal: 0,
          territorialesActivas: 0,
          totalTerritoriales: 0,
          totalHorasProgramadas: 0,
        },
        reportePorTerritorial: [],
        reportePorPrograma: [],
      },
    };
  }

  @Get('territorial/:nombre')
  getTerritorialDetalle(@Param('nombre') nombre: string, @Query() _query: any) {
    return { success: true, data: { territorial: nombre, total: 0 } };
  }

  @Get('reportes/seguimiento')
  async getReporteSeguimiento(@Query() query: any) {
    const data = await this.ptaService.getReporteSeguimiento(query);
    return { success: true, data };
  }

  @Get('dashboard/kpis')
  async getDashboardKpis(@Query() query: any) {
    const data = await this.ptaService.getDashboardKPIs(query?.periodo);
    return { success: true, data };
  }

  @Get('dashboard/directivo')
  getDashboardDirectivo(@Query() _query: any) {
    return {
      success: true,
      data: {
        total: 0,
        scorecards: { pctAprobacion: 0, aprobados: 0, enProceso: 0, rechazados: 0, borradores: 0, devueltos: 0 },
        alertas: { bloqueados7d: 0, escalados: 0, concertacionActiva: 0 },
        dedicacion: { tc: 0, mt: 0, cat: 0 },
        horas: { docencia: 0, investigacion: 0, extension: 0, complementarias: 0, total: 0 },
        terRanking: [],
        atencionInmediata: [],
        historialReciente: [],
      },
    };
  }

  @Get('auditoria')
  getAuditoria(@Query() _query: any) {
    return { success: true, data: [] };
  }

  @Get('workflow/analytics')
  getWorkflowAnalytics(@Query() _query: any) {
    return { success: true, data: null };
  }

  @Get('sync/status')
  async getSyncStatus() {
    const data = await this.ptaService.getSyncStatus();
    return { success: true, data };
  }

  @Get('sync/mappings')
  getSyncMappings(@Query() _query: any) {
    return { success: true, data: {} };
  }

  @Post('sync/mappings')
  saveSyncMapping(@Body() body: any) {
    return { success: true, data: body ?? null };
  }

  @Post('sync/asignaturas/import')
  bulkImportAsignaturas(@Body() body: any) {
    return { success: true, data: { imported: 0, ...body } };
  }

  @Get('sync/asignaturas/export-url')
  getExportAsignaturasUrl() {
    return { success: true, data: { url: '' } };
  }

  @Get('sync/audit-log')
  getSyncAuditLog(@Query() _query: any) {
    return { success: true, data: [] };
  }

  @Post('sync/audit-log')
  logSyncAuditEvent(@Body() body: any) {
    return { success: true, data: body ?? null };
  }

  @Post('sync/asignaturas/custom')
  saveCustomAsignaturas(@Body() body: any) {
    return { success: true, data: body ?? null };
  }

  @Delete('sync/asignaturas/custom/:id')
  deleteCustomAsignatura(@Param('id') id: string) {
    return { success: true, data: { id } };
  }

  @Get('sync/health')
  getSyncHealth() {
    return { success: true, data: { status: 'ok' } };
  }

  @Post('sync/auto-resolve')
  autoResolveSync(@Body() body: any) {
    return { success: true, data: body ?? null };
  }

  @Get('sync/validate')
  validateSync() {
    return { success: true, data: { ok: true } };
  }

  @Get('sync/change-alerts')
  getChangeAlerts() {
    return { success: true, data: [] };
  }

  @Post('sync/change-alerts/dismiss')
  dismissChangeAlerts(@Body() body: any) {
    return { success: true, data: body ?? null };
  }

  @Get('sync/health/history')
  getHealthHistory() {
    return { success: true, data: [] };
  }

  @Post('sync/health/history')
  recordHealthHistory(@Body() body: any) {
    return { success: true, data: body ?? null };
  }

  @Post('reconciliation/preview')
  getReconciliationPreview(@Body() body: any) {
    return { success: true, data: { preview: null, ...body } };
  }

  @Post('reconciliation/apply')
  applyReconciliation(@Body() body: any) {
    return { success: true, data: { applied: false, ...body } };
  }

  // ─────────────────────────────
  // Integraciones externas (stubs)
  // ─────────────────────────────
  @Get('rund/docente/:docenteId')
  async getRUNDDocente(@Param('docenteId') docenteId: string) {
    const data = await this.ptaService.getRUNDDocente(docenteId);
    return { success: true, data };
  }

  @Post('rund/docente/:docenteId/sync-documents')
  async syncRUNDDocuments(@Param('docenteId') docenteId: string, @Body() body: any) {
    const data = await this.ptaService.syncRUNDDocuments(docenteId, body?.documentos || []);
    return { success: true, data };
  }

  @Get('rund/resumen')
  getRUNDResumen(@Query() _query: any) {
    return { success: true, data: null };
  }

  // ─────────────────────────────
  // Operaciones masivas (stubs)
  // ─────────────────────────────
  @Post('masivo/generar-ptas')
  generarPTAsMasivos(@Body() body: any) {
    return { success: true, data: { generated: 0, ...body } };
  }

  @Post('masivo/notificar-docentes')
  notificarDocentesMasivo(@Body() body: any) {
    return { success: true, data: { notified: 0, ...body } };
  }

  @Get('events/recent')
  async getRecentEvents(@Query() query: any) {
    const data = await this.ptaService.getRecentEvents(query);
    return { success: true, data };
  }

  @Post('events/mark-read')
  async markEventsRead(@Body() body: any) {
    await this.ptaService.markEventsRead(body?.event_ids || [], body?.sistema || 'backoffice');
    return { success: true };
  }

  // ─────────────────────────────
  // Notificaciones (stubs)
  // ─────────────────────────────
  @Get('notifications/preferences')
  getNotificationPreferences(@Query() _query: any) {
    return { success: true, data: null };
  }

  @Put('notifications/preferences')
  saveNotificationPreferences(@Body() _body: any) {
    return { success: true };
  }

  @Get('notifications/history/unified')
  getNotificationHistoryUnified(@Query() _query: any) {
    return { success: true, data: { notifications: [], stats: {} } };
  }

  // Reportes auxiliares (stubs)
  @Get('reportes/alertas-dismissed')
  getAlertasDismissed(@Query() _query: any) {
    return { success: true, data: [] };
  }

  @Post('reportes/alertas-dismissed')
  saveAlertasDismissed(@Body() _body: any) {
    return { success: true };
  }

  @Get('reportes/schedules')
  getReportSchedules(@Query() _query: any) {
    return { success: true, data: [] };
  }

  @Post('reportes/schedules')
  saveReportSchedule(@Body() _body: any) {
    return { success: true };
  }

  @Delete('reportes/schedules/:scheduleId')
  deleteReportSchedule(@Param('scheduleId') scheduleId: string) {
    return { success: true, data: { scheduleId } };
  }

  @Patch('reportes/schedules/:scheduleId/toggle')
  toggleReportSchedule(@Param('scheduleId') scheduleId: string, @Body() body: any) {
    return { success: true, data: { scheduleId, ...body } };
  }

  @Post('reportes/scheduler/execute')
  executeScheduler(@Body() body: any) {
    return { success: true, data: body ?? null };
  }

  @Post('reportes/scheduler/execute/:scheduleId')
  executeSingleSchedule(@Param('scheduleId') scheduleId: string) {
    return { success: true, data: { scheduleId } };
  }

  @Get('reportes/scheduler/history')
  getSchedulerHistory(@Query() _query: any) {
    return { success: true, data: [] };
  }

  @Delete('reportes/scheduler/history')
  clearSchedulerHistory() {
    return { success: true };
  }

  @Get(':ptaId/componentes-aprobacion')
  async getComponentesAprobacion(@Param('ptaId') ptaId: string) {
    const data = await this.ptaService.getComponentesAprobacion(ptaId);
    return { success: true, data };
  }

  @Post(':ptaId/aprobar-componente')
  @UseGuards(PtaAuthGuard)
  async aprobarComponente(@Param('ptaId') ptaId: string, @Body() body: any, @Req() req: Request) {
    // La autorización real (qué componentes puede aprobar) proviene de req.ptaAuth,
    // resuelto server-side desde los permisos del usuario. NO se confía en el body.
    const data = await this.ptaService.aprobarComponente(ptaId, body, req.ptaAuth);
    return { success: true, data };
  }
}
