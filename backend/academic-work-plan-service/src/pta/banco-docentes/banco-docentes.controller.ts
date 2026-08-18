import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, Param, Post, Put, Query, Req, UploadedFile, UseInterceptors, UseGuards, Logger } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage, diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';
import { randomUUID } from 'crypto';
import * as xlsx from 'xlsx';
import { BancoDocentesService } from './banco-docentes.service';
import { DocumentTypeValidatorService } from './document-type-validator.service';
import { sanitizeDeepStrings } from '../utils/text-sanitizer';
import { Public } from '../../auth/public.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { BancoDocentesRolesGuard } from './banco-docentes-roles.guard';
import {
  canViewRundSensitiveData,
  findRundSensitiveFields,
  getRequestRoleCodes,
  protectRundSensitiveData,
} from './banco-docentes-sensitive-data';

@Controller(['banco-docentes', 'pta/banco-docentes'])
@UseGuards(BancoDocentesRolesGuard)
export class BancoDocentesController {
  private readonly logger = new Logger(BancoDocentesController.name);

  constructor(
    private readonly service: BancoDocentesService,
    private readonly docTypeValidator: DocumentTypeValidatorService,
  ) { }

  private requestActor(req: any): { actorId: string; roles: string[]; ip?: string; fullAccess: boolean } {
    const roles = getRequestRoleCodes(req?.user);
    const forwarded = req?.headers?.['x-forwarded-for'];
    const ip = String(Array.isArray(forwarded) ? forwarded[0] : forwarded || req?.ip || req?.socket?.remoteAddress || '')
      .split(',')[0]
      .trim() || undefined;
    return {
      actorId: String(req?.user?.userId || req?.user?.email || req?.user?.username || 'SISTEMA'),
      roles,
      ip,
      fullAccess: canViewRundSensitiveData(req?.user),
    };
  }

  private async protectSensitiveResponse<T>(payload: T, req: any, endpoint: string): Promise<T> {
    const context = this.requestActor(req);
    const records = Array.isArray(payload) ? payload : [payload];
    await this.service.logSensitiveDataAccess(records
      .filter(Boolean)
      .map((record: any) => ({
        docenteId: String(record?.docente_id || record?.docenteId || record?.id || ''),
        actorId: context.actorId,
        roles: context.roles,
        fields: findRundSensitiveFields(record),
        endpoint,
        fullAccess: context.fullAccess,
        ip: context.ip,
      })));

    if (Array.isArray(payload)) {
      return payload.map((record: any) => protectRundSensitiveData(record, context.fullAccess)) as T;
    }
    return protectRundSensitiveData(payload, context.fullAccess);
  }

  private async assertOwnProfileForDocente(docenteId: string, periodoCarga: string | undefined, req: any): Promise<void> {
    const roles = getRequestRoleCodes(req?.user);
    const isDocente = roles.includes('DOCENTE');
    const canReadOtherProfiles = roles.some((role) => ['GESTION_PROFESORAL', 'SUPER_ADMIN', 'ADMIN'].includes(role));
    if (!isDocente || canReadOtherProfiles) return;

    const authenticatedProfile = await this.service.getById(String(req?.user?.userId || ''), periodoCarga);
    if (!authenticatedProfile?.docente_id || authenticatedProfile.docente_id !== docenteId) {
      throw new ForbiddenException('El docente solo puede consultar su propio perfil RUND.');
    }
  }

  @Get()
  @Roles('GESTION_PROFESORAL', 'SUPER_ADMIN', 'super_admin', 'ADMIN')
  async list(
    @Query('territorial') territorial?: string,
    @Query('dedicacion') dedicacion?: string,
    @Query('vinculacion') vinculacion?: string,
    @Query('estado') estado?: string,
    @Query('search') search?: string,
    @Query('periodoCarga') periodoCarga?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Req() req?: any,
  ) {
    const result = await this.service.list({
      territorial,
      dedicacion,
      vinculacion,
      estado,
      search,
      periodoCarga,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
    // Devolvemos items + paginación en el nivel raíz (sin wrapper "data")
    // para que el apiClient del shell no desenvuelva y descarte total/pages.
    const items = await this.protectSensitiveResponse(result.data, req, 'BANCO_DOCENTES_LISTADO');
    return { success: true, items, total: result.total, page: result.page, pages: result.pages, limit: result.limit };
  }

  // ═══════════════════════════════════════════════════════════════════
  // RUTAS ESTÁTICAS — DEBEN ir ANTES de @Get(':id') para evitar
  // que NestJS capture "invitaciones", "stats", etc. como :id
  // ═══════════════════════════════════════════════════════════════════

  @Get('stats')
  @Roles('GESTION_PROFESORAL', 'SUPER_ADMIN', 'super_admin', 'ADMIN')
  async stats(
    @Query('territorial') territorial?: string,
    @Query('dedicacion') dedicacion?: string,
    @Query('vinculacion') vinculacion?: string,
    @Query('estado') estado?: string,
    @Query('periodoCarga') periodoCarga?: string,
  ) {
    return { success: true, data: await this.service.getStats({ territorial, dedicacion, vinculacion, estado, periodoCarga }) };
  }

  @Get('invitaciones')
  async getInvitaciones() {
    const result = await this.service.getInvitaciones();
    return { success: true, data: result };
  }

  /** BR-055 — Soportes próximos a vencer */
  @Get('soportes/proximos-vencer')
  async soportesProximosVencer(@Query('dias') dias?: string) {
    const result = await this.service.getSoportesProximosVencer(dias ? parseInt(dias, 10) : 30);
    return { success: true, data: result };
  }

  /** BR-052 — Validar unicidad de documento y correo */
  @Post('validar-unicidad')
  @Roles('GESTION_PROFESORAL', 'SUPER_ADMIN', 'super_admin', 'ADMIN')
  async validarUnicidad(
    @Body() body: { documentNumber: string; correoInstitucional: string; excludeDocenteId?: string },
    @Req() req: any,
  ) {
    const result = await this.service.validarUnicidad(body.documentNumber, body.correoInstitucional, body.excludeDocenteId);
    const duplicados = await this.protectSensitiveResponse(result.duplicados, req, 'VALIDAR_UNICIDAD_RUND');
    return { success: true, data: { ...result, duplicados } };
  }

  /**
   * ADMIN — Reparación masiva de soportes RUND → Carpeta Digital.
   * Recorre todos los docentes y sincroniza los archivos en disco con la DB (RundSoporteCampo).
   * Ejecutar UNA SOLA VEZ para corregir registros históricos sin id_documento_carpeta.
   * Solo accesible por SUPER_ADMIN.
   */
  @Post('admin/sync-all-soportes')
  @Public()
  // @Roles('SUPER_ADMIN', 'super_admin')
  async syncAllSoportes() {
    const result = await this.service.repararSoportesMasivo();
    return { success: true, data: result };
  }

  /**
   * ADMIN — Diagnóstico de sincronización para un docente específico.
   * Devuelve cuántos soportes tiene en DB vs. cuántos archivos existen en disco.
   */
  @Get('admin/sync-check/:docenteId')
  @Roles('SUPER_ADMIN', 'super_admin', 'GESTION_PROFESORAL')
  async syncCheck(@Param('docenteId') docenteId: string) {
    const result = await this.service.syncCheckDocente(docenteId);
    return { success: true, data: result };
  }



  /** §6.3 / BR-059 — Tarjeta RUND por persona (para Carpeta Digital).
   *  Requiere autenticación y limita al docente a consultar su propio perfil. */
  @Get('by-persona/:personaId/tarjeta-rund')
  @Roles('DOCENTE', 'GESTION_PROFESORAL', 'SUPER_ADMIN', 'super_admin', 'ADMIN')
  async getTarjetaRUNDByPersona(
    @Param('personaId') personaId: string,
    @Query('periodoCarga') periodoCarga?: string,
    @Req() req?: any,
  ) {
    const result = await this.service.getTarjetaRUNDByPersona(personaId, periodoCarga);
    if (!result) return { success: false, data: null, message: 'No es docente RUND' };
    await this.assertOwnProfileForDocente(String(result.docenteId || ''), periodoCarga, req);
    return { success: true, data: await this.protectSensitiveResponse(result, req, 'TARJETA_RUND_POR_PERSONA') };
  }

  /** BR-053 — Detectar posible duplicado por nombre + fecha nacimiento */
  @Post('detectar-duplicado')
  @Roles('GESTION_PROFESORAL', 'SUPER_ADMIN', 'super_admin', 'ADMIN')
  async detectarDuplicado(
    @Body() body: { nombreCompleto: string; fechaNacimiento: string },
    @Req() req: any,
  ) {
    const fecha = body.fechaNacimiento ? new Date(body.fechaNacimiento) : null;
    const result = await this.service.detectarPosibleDuplicado(body.nombreCompleto, fecha);
    const posiblesDuplicados = await this.protectSensitiveResponse(
      result.posiblesDuplicados,
      req,
      'DETECTAR_DUPLICADO_RUND',
    );
    return { success: true, data: { ...result, posiblesDuplicados } };
  }

  @Post('invitaciones')
  async createInvitacion(@Body('correoInstitucional') correoInstitucional: string) {
    if (!correoInstitucional) return { success: false, message: 'correoInstitucional is required' };
    const result = await this.service.createInvitacion(correoInstitucional);
    return { success: true, data: result };
  }

  @Post('bulk')
  @Roles('GESTION_PROFESORAL', 'SUPER_ADMIN', 'super_admin', 'ADMIN')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async bulkUpload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: any,
    @Query('dry_run') dryRunQuery?: string,
    @Query('omit_errors') omitErrorsQuery?: string,
    @Query('periodo_carga') periodoCargaQuery?: string,
  ) {
    let rows: any[] = [];
    const dryRun = dryRunQuery === 'true';
    const omitErrors = omitErrorsQuery === 'true';
    let periodoCargaFromFile: string | null = null;

    if (file) {
      const workbook = xlsx.read(file.buffer, { type: 'buffer', cellDates: true });
      
      // Find the correct sheet containing the data (ignoring README, DICCIONARIO, etc.)
      const sheetName = workbook.SheetNames.find(name => 
        name.toUpperCase().includes('CARGA') || 
        name.toUpperCase().includes('DOCENTES') || 
        name.toUpperCase().includes('DATOS')
      ) || workbook.SheetNames[0];
      
      const sheet = workbook.Sheets[sheetName];
      const matrix = xlsx.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: null, raw: false });
      const titleText = matrix.slice(0, 2).flat().filter(Boolean).join(' ');
      const periodMatch = titleText.match(/\b20\d{2}\s*[-_]\s*[12]\b/);
      periodoCargaFromFile = periodMatch ? periodMatch[0].replace(/\s+/g, '') : null;

      const normalizeHeader = (value: unknown) => String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase();
      const headerRowIndex = matrix.findIndex((row) => {
        const keys = new Set((row || []).map(normalizeHeader));
        return (keys.has('DOCUMENTOIDENTIDAD') || keys.has('DOCUMENTO') || keys.has('DOCUMENTODEIDENTIDAD'))
          && (keys.has('NOMBRECOMPLETO') || keys.has('NOMBRE'))
          && (keys.has('VINCULACION') || keys.has('TIPOVINCULACION'));
      });

      if (headerRowIndex >= 0) {
        const headers = (matrix[headerRowIndex] || []).map((header) => String(header || '').trim());
        rows = matrix.slice(headerRowIndex + 1)
          .filter((row) => (row || []).some((cell) => cell !== null && cell !== undefined && String(cell).trim() !== ''))
          .map((row, idx) => {
            const record: Record<string, any> = { __sourceRowNumber: headerRowIndex + idx + 2 };
            headers.forEach((header, colIdx) => {
              if (header) record[header] = row?.[colIdx] ?? null;
            });
            return record;
          });
      } else {
        rows = xlsx.utils.sheet_to_json(sheet, { defval: null });
      }
      
      rows = sanitizeDeepStrings(rows) as any[];
    } else if (body?.rows) {
      rows = Array.isArray(body.rows) ? body.rows : [];
    } else {
      return { success: false, message: 'Se requiere un archivo Excel o un array de rows en el body.' };
    }

    if (rows.length === 0) {
      return { success: false, message: 'El archivo no contiene filas de datos.' };
    }

    // Validación estructural: verificar que sea un archivo de docentes
    const sampleKeys = Object.keys(rows[0]).join(' ').toUpperCase();
    const isDocentesFile = (sampleKeys.includes('DOCUMENT') || sampleKeys.includes('IDENTIFICACI')) 
      && sampleKeys.includes('NOMBRE') 
      && sampleKeys.includes('VINCULACI');

    if (!isDocentesFile) {
      return { 
        success: false, 
        message: 'Archivo equivocado o estructura inválida. No se detectaron las columnas mínimas obligatorias (Documento, Nombre, Vinculación). Asegúrese de utilizar la plantilla del Banco de Docentes.' 
      };
    }

    // Los duplicados se manejarán dentro del servicio bulkUpsert para no bloquear el archivo completo.

    // rejectExisting: false — El Excel del RUND es la fuente de verdad: re-subirlo debe
    // ACTUALIZAR los docentes ya existentes (p.ej. corregir sus horas), no rechazarlos.
    // Antes iba en true, por lo que un docente ya cargado se rechazaba y su bolsa de horas
    // (HORAS_PTA) nunca se actualizaba, quedando el PTA con el valor viejo (800 en vez de
    // 720). Los duplicados DENTRO del mismo archivo sí se siguen bloqueando en bulkUpsert.
    const result = await this.service.bulkUpsert(rows, {
      rejectExisting: false,
      dryRun,
      omitErrors,
      periodoCarga: periodoCargaQuery || periodoCargaFromFile || undefined,
    });
    return { success: true, data: result };
  }

  @Post('sync-auth')
  async syncAuth() {
    const authUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
    const result = await this.service.syncToAuthService(authUrl);
    return { success: true, data: result };
  }

  @Post('sync-from-auth')
  async syncFromAuth() {
    const authUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
    const result = await this.service.syncFromAuthService(authUrl);
    return { success: true, data: result };
  }

  // ═══════════════════════════════════════════════════════════════════
  // Autogestión (Canal 3) — Endpoints públicos
  // ═══════════════════════════════════════════════════════════════════

  @Public()
  @Post('otp/request')
  async requestOtp(@Body('email') email: string) {
    if (!email) return { success: false, message: 'email is required' };
    try {
      const result = await this.service.requestOtpByEmail(email);
      return result;
    } catch (e: any) {
      return { success: false, message: e.message || 'Error al procesar la solicitud' };
    }
  }

  @Public()
  @Post('otp/validate')
  async validateOtp(@Body('email') email: string, @Body('otp') otp: string) {
    if (!email || !otp) return { success: false, message: 'email and otp are required' };
    try {
      const result = await this.service.verifyOtpForEmail(email, otp);
      return result;
    } catch (e: any) {
      return { success: false, message: e.message || 'Código inválido o expirado' };
    }
  }

  @Public()
  @Get('drafts/:token')
  async getDraft(@Param('token') token: string) {
    const result = await this.service.getDraft(token);
    return { success: true, data: result };
  }

  @Public()
  @Get('autogestion/me/:token')
  async getMyInfo(@Param('token') token: string) {
    const result = await this.service.getAutogestionInfo(token);
    return { success: true, data: result };
  }

  @Public()
  @Put('drafts/:token')
  async saveDraft(@Param('token') token: string, @Body() body: any) {
    const result = await this.service.saveDraft(token, body);
    return { success: true, data: result };
  }

  @Public()
  @Post('submit/:token')
  async submitFromToken(@Param('token') token: string, @Body() body: any) {
    const result = await this.service.submitFromToken(token, body);
    return { success: true, data: result };
  }

  // ═══════════════════════════════════════════════════════════════════
  // RUTAS DINÁMICAS (:id) — DEBEN ir AL FINAL para no capturar
  // rutas estáticas como "invitaciones", "stats", "soportes", etc.
  // ═══════════════════════════════════════════════════════════════════

  @Post(':id/validacion-documental/batch')
  @Roles('GESTION_PROFESORAL', 'SUPER_ADMIN', 'super_admin')
  async saveValidacionBatch(
    @Param('id') id: string,
    @Body() body: any
  ) {
    if (!body.validaciones || !Array.isArray(body.validaciones)) {
      return { success: false, message: 'Se requiere un arreglo de validaciones' };
    }
    const result = await this.service.saveValidacionDocumentalBatch(id, body.validaciones);
    return result;
  }

  @Get(':id')
  @Roles('DOCENTE', 'GESTION_PROFESORAL', 'SUPER_ADMIN', 'super_admin', 'ADMIN')
  async getById(
    @Param('id') id: string,
    @Query('periodoCarga') periodoCarga: string | undefined,
    @Req() req: any,
  ) {
    const data = await this.service.getById(id, periodoCarga);
    const roleCodes = getRequestRoleCodes(req?.user);
    const managementRoles = new Set(['GESTION_PROFESORAL', 'SUPER_ADMIN', 'ADMIN']);
    const isManager = roleCodes.some((role: string) => managementRoles.has(role));
    if (!isManager && roleCodes.includes('DOCENTE')) {
      const authenticatedProfile = await this.service.getById(String(req?.user?.userId || ''), periodoCarga);
      if (!data?.persona_id || data.persona_id !== authenticatedProfile?.persona_id) {
        throw new ForbiddenException('El docente solo puede consultar su propio perfil RUND.');
      }
    }
    return { success: true, data: await this.protectSensitiveResponse(data, req, 'PERFIL_RUND_POR_ID') };
  }

  @Post()
  @Roles('GESTION_PROFESORAL', 'SUPER_ADMIN', 'super_admin', 'ADMIN')
  async create(@Body() body: any, @Req() req: any) {
    const actorId = req?.user?.userId || req?.user?.email || body.actorId || body.cargadoPor || 'SISTEMA';
    const result = await this.service.upsertDocente(
      { ...body, actorId, cargadoPor: actorId, canal_origen: 'MODAL' },
      { rejectExisting: true },
    );
    await this.service.logAudit({
      docenteId: result.docenteId,
      bloque: 'GENERAL',
      accion: 'CREAR',
      actorId,
      canalOrigen: 'MODAL',
      metadata: { periodoCarga: body.periodoCarga || body.periodo_carga || null },
    });
    return { success: true, data: result };
  }

  @Put(':id')
  @Roles('GESTION_PROFESORAL', 'SUPER_ADMIN', 'super_admin', 'ADMIN')
  async update(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    const actorId = req?.user?.userId || req?.user?.email || body.actorId || body.cargadoPor || 'SISTEMA';
    const result = await this.service.updateDocente(id, { ...body, actorId, cargadoPor: actorId });
    return { success: true, data: result };
  }

  @Put(':id/estado')
  @Roles('GESTION_PROFESORAL', 'SUPER_ADMIN', 'super_admin', 'ADMIN')
  async cambiarEstado(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    const actorId = req?.user?.userId || req?.user?.email || body.actorId || body.cargadoPor || 'SISTEMA';
    const result = await this.service.cambiarEstado(id, { ...body, actorId });
    return { success: true, data: result };
  }

  @Delete(':id')
  @Roles('GESTION_PROFESORAL', 'SUPER_ADMIN', 'super_admin', 'ADMIN')
  async toggleEstado(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    const actorId = req?.user?.userId || req?.user?.email || body?.actorId || body?.cargadoPor || 'SISTEMA';
    const result = await this.service.cambiarEstado(id, { ...(body || {}), actorId });
    return { success: true, data: result };
  }

  /** BR-044 — Obtener estados de aprobación por bloque */
  @Get(':id/bloques')
  @Public()
  async getBloques(@Param('id') id: string) {
    try {
      const result = await this.service.getBloques(id);
      return { success: true, data: result };
    } catch (e: any) {
      return { success: true, data: [], message: e.message };
    }
  }

  /** BR-043 — Aprobar un bloque (maker-checker) */
  @Post(':id/bloques/:bloque/aprobar')
  @Roles('GESTION_PROFESORAL', 'SUPER_ADMIN', 'super_admin')
  async aprobarBloque(
    @Param('id') id: string,
    @Param('bloque') bloque: string,
    @Body('aprobadorId') aprobadorId: string,
  ) {
    if (!aprobadorId) return { success: false, message: 'aprobadorId es requerido' };
    const result = await this.service.aprobarBloque(id, bloque, aprobadorId);
    return { success: true, data: result };
  }

  /** BR-045 — Devolver un bloque con observación obligatoria */
  @Post(':id/bloques/:bloque/devolver')
  @Roles('GESTION_PROFESORAL', 'SUPER_ADMIN', 'super_admin')
  async devolverBloque(
    @Param('id') id: string,
    @Param('bloque') bloque: string,
    @Body('aprobadorId') aprobadorId: string,
    @Body('observacion') observacion: string,
  ) {
    if (!aprobadorId) return { success: false, message: 'aprobadorId es requerido' };
    const result = await this.service.devolverBloque(id, bloque, aprobadorId, observacion);
    return { success: true, data: result };
  }

  // BR-039 — Vincular un soporte a un bloque
  @Post(':id/bloques/:bloque/soportes')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const docenteId = req.params.id || 'desconocido';
        const docenteNombre = req.body.docenteNombre ? String(req.body.docenteNombre).replace(/[^a-zA-Z0-9 -]/g, '').trim().toUpperCase() : docenteId;
        const uploadPath = `./uploads/carpeta-digital/${docenteNombre}/RUND`;
        if (!fs.existsSync(uploadPath)) {
          fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
        cb(null, `${randomName}${extname(file.originalname)}`);
      }
    })
  }))
  @Public()
  // @Roles('DOCENTE', 'GESTION_PROFESORAL', 'SUPER_ADMIN', 'super_admin')
  async vincularSoporte(
    @Param('id') id: string,
    @Param('bloque') bloque: string,
    @Body() body: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    try {
      if (['soporte_edicion_perfil', 'soporte_cambio_estado_perfil'].includes(body.tipoSoporte)) {
        const allowedMimeTypes = new Set(['application/pdf', 'image/jpeg', 'image/png']);
        if (!file) {
          throw new BadRequestException('La gestion del perfil requiere un archivo de soporte.');
        }
        if (!allowedMimeTypes.has(file.mimetype) || file.size > 10 * 1024 * 1024) {
          if ((file as any).path && fs.existsSync((file as any).path)) {
            fs.unlinkSync((file as any).path);
          }
          throw new BadRequestException('El soporte del perfil debe ser PDF, JPG o PNG y pesar maximo 10 MB.');
        }
      }
      let validacionTipo: any = undefined;
      if (file) {
        body.nombreArchivo = file.originalname;
        const docenteId = id || 'desconocido';
        const docenteNombre = body.docenteNombre ? String(body.docenteNombre).replace(/[^a-zA-Z0-9 -]/g, '').trim().toUpperCase() : docenteId;
        body.documentoCarpetaId = `/pta/api/v1/uploads/carpeta-digital/${docenteNombre}/RUND/${file.filename}`;

        // Validación SOFT de tipo de documento: escanea el PDF y compara contra
        // palabras clave derivadas del código de soporte (+ nombre/descripción si vienen).
        // No bloquea la carga; adjunta el veredicto a la respuesta para avisar al usuario.
        validacionTipo = await this.docTypeValidator.validate({
          filePath: (file as any).path,
          originalName: file.originalname,
          soporteCode: body.tipoSoporte,
          expectedName: body.tipoNombre,
          expectedDescription: body.tipoDescripcion,
        });
        if (validacionTipo.validated && !validacionTipo.matched) {
          this.logger.warn(`[RUND] Soporte "${body.tipoSoporte}" del docente ${id}: posible tipo incorrecto (${validacionTipo.reason})`);
        }
      }
      const result = await this.service.vincularSoporte(id, bloque, body);
      // validacionTipo se EMBEBE en data porque el apiClient del shell desenvuelve
      // {success, data} y descartaría cualquier campo hermano de data.
      const data = (result && typeof result === 'object' && !Array.isArray(result))
        ? { ...result, validacionTipo }
        : { resultado: result, validacionTipo };
      return { success: true, data };
    } catch (e: any) {
      return { success: false, error: e.message, stack: e.stack };
    }
  }

  /** BR-047 — Verificar estado de activación del registro */
  @Get(':id/activacion')
  async verificarActivacion(@Param('id') id: string) {
    const result = await this.service.verificarActivacion(id);
    return { success: true, data: result };
  }

  /** §6.3 / BR-059 — Tarjeta RUND para Carpeta Digital */
  @Get(':id/tarjeta-rund')
  @Roles('DOCENTE', 'GESTION_PROFESORAL', 'SUPER_ADMIN', 'super_admin', 'ADMIN')
  async getTarjetaRUND(@Param('id') id: string, @Req() req: any) {
    try {
      const result = await this.service.getTarjetaRUND(id);
      await this.assertOwnProfileForDocente(String(result.docenteId || ''), result.periodoCarga, req);
      return { success: true, data: await this.protectSensitiveResponse(result, req, 'TARJETA_RUND_POR_ID') };
    } catch (e: any) {
      if (e instanceof ForbiddenException) throw e;
      return { success: false, data: null, message: e.message };
    }
  }

  /** BR-056 — Log inmutable de auditoría del docente */
  @Get(':id/auditoria')
  @Roles('GESTION_PROFESORAL', 'SUPER_ADMIN', 'super_admin')
  async getAuditoria(@Param('id') id: string) {
    try {
      const result = await this.service.getAuditoria(id);
      return { success: true, data: result };
    } catch (e: any) {
      return { success: true, data: [], message: e.message };
    }
  }

  /** Temporary endpoint to fix DB */
  @Get('reparar-soportes-db')
  @Public()
  async repararSoportes() {
    const result = await this.service.repararSoportesMasivo();
    return { success: true, data: result };
  }
}
