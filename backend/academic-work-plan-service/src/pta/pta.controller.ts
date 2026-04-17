import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'node:fs';
import { Public } from '../auth/public.decorator';
import { PtaService } from './pta.service';

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
 * - Gateway: /pta/api/v1/pta/...  -> service: http://localhost:3003/pta/...
 */
@Public()
@Controller('pta')
export class PtaController {
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
  async getCatalogoTerritoriales() {
    const data = await this.ptaService.getCatalogoTerritoriales();
    return { success: true, data, total: data.length };
  }

  @Get('catalogos/cetaps')
  async getCatalogoCetaps(@Query() query: any) {
    const data = await this.ptaService.getCatalogoCetaps(query);
    return { success: true, data, total: data.length };
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

  @Post('catalogos/calcular-horas-programables')
  calcularHorasProgramables(@Body() body: any) {
    const total_horas = this.ptaService.calcHorasProgramables({
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
    const data = await this.ptaService.getPTAsByDocente(docenteId, periodo);
    return { success: true, data };
  }

  @Get('id/:id')
  async getById(@Param('id') id: string) {
    const data = await this.ptaService.getPTAById(id);
    return { success: true, data };
  }

  @Post('save')
  async save(@Body() body: any) {
    const data = await this.ptaService.savePTA(body || {});
    return { success: true, data };
  }

  @Post(':ptaId/estado')
  async updateEstado(@Param('ptaId') ptaId: string, @Body() body: any) {
    const result = await this.ptaService.updatePTAStatus(ptaId, body || {});
    return { success: true, ...result };
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
  async saveConfiguracion(@Body() body: any) {
    const rules = body?.rules ?? body;
    const data = await this.ptaService.saveConfiguracionPTAGlobal(rules);
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
  enviarAprobacion(@Param('ptaId') ptaId: string, @Body() body: any) {
    return { success: true, data: { ptaId, ...body } };
  }

  @Get(':ptaId/aprobaciones-jefatura')
  getAprobacionesJefatura(@Param('ptaId') ptaId: string) {
    return { success: true, data: { ptaId, aprobaciones: [] } };
  }

  @Post(':ptaId/firma-digital')
  firmaDigital(@Param('ptaId') ptaId: string, @Body() body: any) {
    return { success: true, data: { ptaId, ...body } };
  }

  // ─────────────────────────────
  // Firma electrónica OTP (legacy)
  // ─────────────────────────────
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
    const data = await this.ptaService.getMisSolicitudesPTA(docenteId);
    return { success: true, data };
  }

  @Patch('solicitudes/:solicitudId/resolver')
  async resolverSolicitud(@Param('solicitudId') solicitudId: string, @Body() body: any) {
    const data = await this.ptaService.resolverSolicitudPTA(solicitudId, body || {});
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
  getReporteSeguimiento(@Query() _query: any) {
    return { success: true, data: null };
  }

  @Get('dashboard/kpis')
  getDashboardKpis(@Query() _query: any) {
    return { success: true, data: null };
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
        horas: { docencia: 0, investigacion: 0, extension: 0, complementarias: 0, academico_admin: 0, total: 0 },
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
  getSyncStatus() {
    return { success: true, data: { connected: true, last_sync: new Date().toISOString(), pending: 0 } };
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
  getRUNDDocente(@Param('docenteId') docenteId: string) {
    return { success: true, data: { docenteId, resumen: null } };
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
  getRecentEvents(@Query() _query: any) {
    return { success: true, data: [] };
  }

  @Post('events/mark-read')
  markEventsRead(@Body() _body: any) {
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
}
