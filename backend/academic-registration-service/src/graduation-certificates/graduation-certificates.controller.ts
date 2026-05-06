import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
  Res,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { GraduationCertificatesService } from './graduation-certificates.service';
import { LandingCertificateRequestDto } from './dto/landing-certificate-request.dto';
import { SearchGraduateCandidatesDto } from './dto/search-graduate-candidates.dto';
import type {
  ApproveRequestDto,
  ResolveReviewApprovalDto,
  SubmitReviewDecisionDto,
} from './dto/approve-request.dto';
import type { UpdateCertificateDto } from './dto/update-certificate.dto';
import type { UpdateTemplateTextsDto } from './dto/update-template-texts.dto';
import type { Request, Response } from 'express';
import { Public } from '../auth/public.decorator';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';

type ValidationGeoContext = {
  geoCountry?: string;
  geoRegion?: string;
  geoCity?: string;
  geoTimezone?: string;
};

type AuthenticatedRequest = Request & {
  user?: {
    roles?: unknown[];
    permissions?: unknown[];
    internalService?: boolean;
  };
};

const FINAL_REVIEW_DECISION_PERMISSIONS = [
  'graduates.edit',
  'graduates.export',
  'graduates.verify_certificate',
  'graduates-certificates.solicitude.aprobar',
  'graduates-certificates.certificates.view',
  'graduates-certificates.certificates.edit',
  'graduates-certificates.certificates.export',
  'graduates-certificates.solicitude.rechazar',
  'graduates-certificates.certificates.reenviar',
];
const REVIEW_WORK_PERMISSIONS = [
  'graduates-certificates.solicitude.review',
];
const APPROVE_REQUEST_PERMISSION =
  'graduates-certificates.solicitude.aprobar';
const REJECT_REQUEST_PERMISSION =
  'graduates-certificates.solicitude.rechazar';

const normalizeRoleCode = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

const getNormalizedRoles = (roles: unknown[] | undefined): Set<string> => {
  const normalized = new Set<string>();

  for (const role of roles || []) {
    if (typeof role === 'string') {
      normalized.add(normalizeRoleCode(role));
      continue;
    }

    if (role && typeof role === 'object') {
      const candidate = role as { code?: string; name?: string };
      if (candidate.code) normalized.add(normalizeRoleCode(candidate.code));
      if (candidate.name) normalized.add(normalizeRoleCode(candidate.name));
    }
  }

  return normalized;
};

const normalizePermissionCode = (value: string): string =>
  value.trim().toLowerCase();

const addPermissionCandidate = (normalized: Set<string>, value: unknown) => {
  if (typeof value === 'string' && value.trim()) {
    normalized.add(normalizePermissionCode(value));
    return;
  }

  if (value && typeof value === 'object') {
    const candidate = value as { code?: string };
    if (candidate.code) {
      normalized.add(normalizePermissionCode(candidate.code));
    }
  }
};

const getNormalizedPermissions = (
  user: AuthenticatedRequest['user'],
): Set<string> => {
  const normalized = new Set<string>();

  for (const permission of user?.permissions || []) {
    addPermissionCandidate(normalized, permission);
  }

  for (const role of user?.roles || []) {
    if (role && typeof role === 'object') {
      const candidate = role as { permissions?: unknown[] };
      if (Array.isArray(candidate.permissions)) {
        candidate.permissions.forEach((permission) =>
          addPermissionCandidate(normalized, permission),
        );
      }
    }
  }

  return normalized;
};

const assertCanMakeFinalReviewDecision = (req: AuthenticatedRequest) => {
  if (req.user?.internalService) {
    return;
  }

  const roles = getNormalizedRoles(req.user?.roles);
  if (roles.has('SUPER_ADMIN')) {
    return;
  }

  const permissions = getNormalizedPermissions(req.user);
  if (
    FINAL_REVIEW_DECISION_PERMISSIONS.every((permission) =>
      permissions.has(permission),
    )
  ) {
    return;
  }

  throw new ForbiddenException(
    'Se requieren los permisos minimos de jefe de Registro Academico para emitir la decision final.',
  );
};

const hasPermission = (
  req: AuthenticatedRequest,
  permissionCode: string,
): boolean => {
  if (req.user?.internalService) return true;

  const roles = getNormalizedRoles(req.user?.roles);
  if (roles.has('SUPER_ADMIN')) return true;

  return getNormalizedPermissions(req.user).has(permissionCode);
};

const assertHasAnyPermission = (
  req: AuthenticatedRequest,
  permissionCodes: string[],
  message: string,
) => {
  if (permissionCodes.some((permissionCode) => hasPermission(req, permissionCode))) {
    return;
  }

  throw new ForbiddenException(message);
};

const assertHasPermission = (
  req: AuthenticatedRequest,
  permissionCode: string,
  message: string,
) => assertHasAnyPermission(req, [permissionCode], message);

const assertCanResolveApprovalDecision = (
  req: AuthenticatedRequest,
  body: ResolveReviewApprovalDto,
) => {
  if (body?.finalDecision === true) {
    assertCanMakeFinalReviewDecision(req);
    return;
  }

  if (body?.decision === 'REJECTED') {
    assertHasPermission(
      req,
      REJECT_REQUEST_PERMISSION,
      'Se requiere permiso para rechazar solicitudes de revision.',
    );
    return;
  }

  if (body?.decision === 'OBSERVATION') {
    assertHasAnyPermission(
      req,
      [APPROVE_REQUEST_PERMISSION, REJECT_REQUEST_PERMISSION],
      'Se requiere permiso de aprobador para devolver solicitudes con observacion.',
    );
    return;
  }

  assertHasPermission(
    req,
    APPROVE_REQUEST_PERMISSION,
    'Se requiere permiso para aprobar solicitudes de revision.',
  );
};

const isIpLike = (value: string): boolean => {
  if (!value) return false;
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(value)) return true;
  return value.includes(':');
};

const normalizeSingleIp = (raw?: string): string | null => {
  if (!raw) return null;
  let normalized = String(raw).trim();
  if (!normalized) return null;

  if (normalized.toLowerCase().startsWith('for=')) {
    normalized = normalized.slice(4).trim();
  }

  normalized = normalized.replace(/^"+|"+$/g, '');
  normalized = normalized.split(';')[0]?.trim() || normalized;

  if (normalized.startsWith('[') && normalized.includes(']')) {
    normalized = normalized.slice(1, normalized.indexOf(']'));
  }

  normalized = normalized.replace(/^::ffff:/i, '');

  if (/^\d+\.\d+\.\d+\.\d+:\d+$/.test(normalized)) {
    normalized = normalized.split(':')[0];
  }

  if (!isIpLike(normalized)) return null;
  return normalized || null;
};

const isPrivateIp = (ip: string): boolean => {
  if (!ip) return true;
  const lower = ip.toLowerCase();
  if (
    lower === '::1' ||
    lower === '::' ||
    lower.startsWith('fc') ||
    lower.startsWith('fd') ||
    lower.startsWith('fe80')
  ) {
    return true;
  }

  const parts = ip.split('.').map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return false;
  }

  const [a, b] = parts;
  if (a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;

  return false;
};

const parseIpHeader = (value?: string | string[]): string[] => {
  const raw = Array.isArray(value) ? value.join(',') : value || '';
  return String(raw)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const getClientIp = (req: Request): string | undefined => {
  const candidates = [
    ...parseIpHeader(req.headers['x-forwarded-for']),
    ...parseIpHeader(req.headers.forwarded),
    ...parseIpHeader(req.headers['cf-connecting-ip']),
    ...parseIpHeader(req.headers['x-real-ip']),
    ...parseIpHeader(req.headers['x-client-ip']),
    ...(Array.isArray(req.ips)
      ? req.ips.map((item) => String(item || '').trim())
      : []),
    typeof req.ip === 'string' ? req.ip.trim() : '',
    req.socket?.remoteAddress || '',
  ]
    .map((candidate) => normalizeSingleIp(candidate))
    .filter((candidate): candidate is string => Boolean(candidate));

  if (!candidates.length) {
    return undefined;
  }

  const publicIp = candidates.find((candidate) => !isPrivateIp(candidate));
  return publicIp || candidates[0];
};

const pickHeader = (
  req: Request,
  ...headerNames: string[]
): string | undefined => {
  for (const headerName of headerNames) {
    const value = req.headers[headerName];
    const parsed = Array.isArray(value)
      ? value.find((item) => String(item || '').trim())
      : value;
    const trimmed = String(parsed || '').trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return undefined;
};

const getGeoContext = (req: Request): ValidationGeoContext => {
  const geoCountry = pickHeader(
    req,
    'cf-ipcountry',
    'x-vercel-ip-country',
    'x-country',
    'x-country-code',
    'x-geo-country',
  );
  const geoRegion = pickHeader(
    req,
    'x-vercel-ip-country-region',
    'x-region',
    'x-geo-region',
  );
  const geoCity = pickHeader(req, 'x-vercel-ip-city', 'x-city', 'x-geo-city');
  const geoTimezone = pickHeader(
    req,
    'x-vercel-ip-timezone',
    'x-timezone',
    'x-geo-timezone',
  );

  return {
    ...(geoCountry ? { geoCountry } : {}),
    ...(geoRegion ? { geoRegion } : {}),
    ...(geoCity ? { geoCity } : {}),
    ...(geoTimezone ? { geoTimezone } : {}),
  };
};

const getFrontendBaseUrl = (req: Request): string | undefined => {
  const origin =
    typeof req.headers.origin === 'string' ? req.headers.origin : undefined;
  const referer =
    typeof req.headers.referer === 'string' ? req.headers.referer : undefined;
  if (origin) return origin;
  if (!referer) return undefined;
  try {
    return new URL(referer).origin;
  } catch (_) {
    return undefined;
  }
};

@Controller('certificates')
export class GraduationCertificatesController {
  constructor(private readonly service: GraduationCertificatesService) {}

  /**
   * ====================================
   * ENDPOINTS DE AUTOSERVICIO (Públicos)
   * ====================================
   */

  /**
   * POST /academic-registration/api/v1/certificates/autoservicio/verificar-graduado
   * Verificar si un graduado existe en la base de datos
   */
  @Post('autoservicio/verificar-graduado')
  @Public()
  @HttpCode(HttpStatus.OK)
  async verificarGraduado(
    @Body()
    body: {
      idNumber: string;
      idIssueDate?: string;
      graduationDate?: string;
      lastName?: string;
    },
  ) {
    return await this.service.verificarGraduado(
      body.idNumber,
      body.idIssueDate,
      body.graduationDate,
      body.lastName,
    );
  }

  /**
   * POST /academic-registration/api/v1/certificates/autoservicio/solicitar-certificado
   * Enviar solicitud desde landing; valida al graduado y envía el certificado si existe
   */
  /**
   * POST /academic-registration/api/v1/certificates/autoservicio/buscar-coincidencias
   * Buscar coincidencias por cédula y similitud de nombre para selección asistida
   */
  @Post('autoservicio/buscar-coincidencias')
  @Public()
  @HttpCode(HttpStatus.OK)
  async buscarCoincidencias(@Body() body: SearchGraduateCandidatesDto) {
    return await this.service.buscarCoincidenciasGraduado(
      body.idNumber,
      body.graduationDate,
      body.lastName,
    );
  }

  /**
   * POST /academic-registration/api/v1/certificates/autoservicio/solicitar-certificado
   * Enviar solicitud desde landing; valida al graduado y envía el certificado si existe
   */
  @Post('autoservicio/solicitar-certificado')
  @Public()
  @HttpCode(HttpStatus.OK)
  async solicitarCertificado(
    @Body() body: LandingCertificateRequestDto,
    @Req() req: Request,
  ) {
    const origin =
      typeof req.headers.origin === 'string' ? req.headers.origin : undefined;
    const referer =
      typeof req.headers.referer === 'string' ? req.headers.referer : undefined;
    let frontendBaseUrl = origin;
    if (!frontendBaseUrl && referer) {
      try {
        frontendBaseUrl = new URL(referer).origin;
      } catch (_) {
        frontendBaseUrl = undefined;
      }
    }

    return await this.service.solicitarCertificadoLanding(
      body,
      frontendBaseUrl,
    );
  }

  /**
   * POST /academic-registration/api/v1/certificates/autoservicio/generar-codigo
   * Generar código de validación y enviar por email
   */
  @Post('autoservicio/generar-codigo')
  @Public()
  @HttpCode(HttpStatus.OK)
  async generarCodigoValidacion(
    @Body()
    body: {
      idNumber: string;
      idIssueDate?: string;
      graduationDate?: string;
      lastName?: string;
    },
  ) {
    return await this.service.generarCodigoValidacion(
      body.idNumber,
      body.idIssueDate,
      body.graduationDate,
      body.lastName,
    );
  }

  /**
   * POST /academic-registration/api/v1/certificates/autoservicio/validar-codigo
   * Validar código y generar certificado automáticamente
   */
  @Post('autoservicio/validar-codigo')
  @Public()
  @HttpCode(HttpStatus.OK)
  async validarCodigoYGenerarCertificado(
    @Body() body: { idNumber: string; idIssueDate?: string; codigo: string },
  ) {
    return await this.service.validarCodigoYGenerarCertificado(
      body.idNumber,
      body.idIssueDate,
      body.codigo,
    );
  }

  /**
   * GET /academic-registration/api/v1/certificates/autoservicio/empresa
   * Consultar empresa por NIT (datos.gov.co)
   */
  @Public()
  @Get('autoservicio/empresa')
  @HttpCode(HttpStatus.OK)
  async buscarEmpresaPorNit(@Query('nit') nit: string) {
    return await this.service.buscarEmpresaPorNit(nit);
  }

  /**
   * ====================================
   * ENDPOINTS DE VALIDACIÓN PÚBLICA
   * ====================================
   */

  /**
   * POST /academic-registration/api/v1/certificates/validacion/qr
   * Validar un certificado por su código QR
   */
  @Post('validacion/qr')
  @Public()
  @HttpCode(HttpStatus.OK)
  async validarPorQR(
    @Body() body: { verificationCode: string },
    @Req() req: Request,
  ) {
    const ipAddress = getClientIp(req);
    const userAgent = req.headers['user-agent'];
    const geoContext = getGeoContext(req);

    return await this.service.validarPorQR(
      body.verificationCode,
      ipAddress,
      userAgent,
      geoContext,
    );
  }

  /**
   * POST /academic-registration/api/v1/certificates/validacion/numero
   * Validar un certificado por número de certificado
   */
  @Post('validacion/numero')
  @Public()
  @HttpCode(HttpStatus.OK)
  async validarPorNumero(
    @Body() body: { certificateNumber: string },
    @Req() req: Request,
  ) {
    const ipAddress = getClientIp(req);
    const userAgent = req.headers['user-agent'];
    const geoContext = getGeoContext(req);

    return await this.service.validarPorNumero(
      body.certificateNumber,
      ipAddress,
      userAgent,
      geoContext,
    );
  }

  /**
   * GET /academic-registration/api/v1/certificates/validacion/estadisticas
   * Obtener estadísticas públicas de certificados
   */
  @Get('validacion/estadisticas')
  @Public()
  async obtenerEstadisticas() {
    // TODO: Implementar estadísticas
    return {
      totalCertificados: 0,
      certificadosValidos: 0,
      certificadosRevocados: 0,
      validacionesRealizadas: 0,
    };
  }

  /**
   * GET /academic-registration/api/v1/certificates/validaciones
   * Listar validaciones de certificados (QR)
   */
  @Get('validaciones')
  async listarValidaciones(@Query('certificateId') certificateId?: string) {
    return await this.service.listarValidaciones(certificateId);
  }

  /**
   * GET /academic-registration/api/v1/certificates/descargas
   * Listar descargas de certificados
   */
  @Get('descargas')
  async listarDescargas(@Query('certificateId') certificateId?: string) {
    return await this.service.listarDescargas(certificateId);
  }

  /**
   * POST /academic-registration/api/v1/certificates/descargas
   * Registrar una descarga de certificado
   */
  @Post('descargas')
  @Public()
  @HttpCode(HttpStatus.OK)
  async registrarDescarga(
    @Body() body: { certificateId: string },
    @Req() req: Request,
  ) {
    const ipAddress = getClientIp(req);
    const userAgent = req.headers['user-agent'];

    return await this.service.registrarDescarga(
      body.certificateId,
      ipAddress,
      userAgent,
    );
  }

  /**
   * ====================================
   * ENDPOINTS DE ADMINISTRACIÓN
   * ====================================
   */

  /**
   * GET /academic-registration/api/v1/certificates/solicitudes
   * Listar todas las solicitudes de certificados
   */
  @Get('solicitudes')
  async listarSolicitudes() {
    return await this.service.listarSolicitudes();
  }

  /**
   * GET /academic-registration/api/v1/certificates/solicitudes/revision
   * Listar solicitudes de revisión manual
   */
  @Get('solicitudes/revision')
  async listarSolicitudesRevision() {
    return await this.service.listarSolicitudesRevision();
  }

  /**
   * GET /academic-registration/api/v1/certificates/solicitudes/aprobacion
   * Listar conceptos de revision pendientes de aprobacion final
   */
  @Get('solicitudes/aprobacion')
  async listarSolicitudesAprobacion() {
    return await this.service.listarSolicitudesAprobacion();
  }

  /**
   * GET /academic-registration/api/v1/certificates/solicitudes/aprobacion/pendientes-count
   * Contar conceptos pendientes de aprobacion final
   */
  @Get('solicitudes/aprobacion/pendientes-count')
  async contarSolicitudesAprobacionPendientes(@Query('stage') stage?: string) {
    return await this.service.contarSolicitudesAprobacionPendientes(stage);
  }

  /**
   * GET /academic-registration/api/v1/certificates/solicitudes/:id
   * Obtener solicitud por ID
   */
  @Get('solicitudes/:id')
  async obtenerSolicitud(@Param('id') id: string) {
    return await this.service.obtenerSolicitud(id);
  }

  @Get('solicitudes/:id/revision-files')
  async listarArchivosRevisionSolicitud(@Param('id') id: string) {
    return await this.service.listarArchivosRevisionSolicitud(id);
  }

  @Get('solicitudes/:id/revision-files/:fileId/download')
  async descargarArchivoRevisionSolicitud(
    @Param('id') id: string,
    @Param('fileId') fileId: string,
    @Res() res: Response,
  ) {
    const { file, filePath } =
      await this.service.obtenerArchivoRevisionSolicitudParaDescarga(
        id,
        fileId,
      );
    const safeName = (file.originalName || 'archivo').replace(/"/g, '');
    const encodedName = encodeURIComponent(safeName);

    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${safeName}"; filename*=UTF-8''${encodedName}`,
    );

    return res.sendFile(filePath);
  }

  @Delete('solicitudes/:id/revision-files/:fileId')
  async eliminarArchivoRevisionSolicitud(
    @Param('id') id: string,
    @Param('fileId') fileId: string,
  ) {
    return await this.service.eliminarArchivoRevisionSolicitud(id, fileId);
  }

  @Post('solicitudes/:id/revision-files')
  @UseInterceptors(
    FilesInterceptor('files', 5, {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const uploadDir = join(
            process.cwd(),
            'uploads',
            'graduation-review-files',
          );
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }
          cb(null, uploadDir);
        },
        filename: (_req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `review-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        try {
          assertHasAnyPermission(
            _req as AuthenticatedRequest,
            REVIEW_WORK_PERMISSIONS,
            'Se requiere permiso para trabajar solicitudes de revision.',
          );
        } catch (error) {
          return cb(error as Error, false);
        }

        const allowedExtensions = new Set([
          '.pdf',
          '.doc',
          '.docx',
          '.xls',
          '.xlsx',
          '.png',
          '.jpg',
          '.jpeg',
          '.webp',
        ]);
        const allowedMimeTypes = new Set([
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'image/png',
          'image/jpeg',
          'image/webp',
        ]);
        const ext = extname(file.originalname || '').toLowerCase();
        const isAllowed =
          allowedExtensions.has(ext) || allowedMimeTypes.has(file.mimetype);
        if (!isAllowed) {
          return cb(new Error('Tipo de archivo no permitido'), false);
        }
        cb(null, true);
      },
      limits: {
        files: 5,
        fileSize: 10 * 1024 * 1024,
      },
    }),
  )
  async subirArchivosRevisionSolicitud(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: AuthenticatedRequest,
    @Body('uploadedBy') uploadedBy?: string,
    @Body('uploadedByEmail') uploadedByEmail?: string,
  ) {
    assertHasAnyPermission(
      req,
      REVIEW_WORK_PERMISSIONS,
      'Se requiere permiso para trabajar solicitudes de revision.',
    );

    if (!files || files.length === 0) {
      throw new BadRequestException('No se recibieron archivos');
    }
    return await this.service.subirArchivosRevisionSolicitud(
      id,
      files,
      uploadedBy,
      uploadedByEmail,
    );
  }

  /**
   * POST /academic-registration/api/v1/certificates/solicitudes/:id/en-revision
   * Marcar solicitud como en revisión
   */
  @Post('solicitudes/:id/en-revision')
  @HttpCode(HttpStatus.OK)
  async marcarEnRevision(
    @Param('id') id: string,
    @Body()
    body: { reviewerName?: string; reviewerId?: string; reviewerEmail?: string },
    @Req() req: AuthenticatedRequest,
  ) {
    assertHasAnyPermission(
      req,
      REVIEW_WORK_PERMISSIONS,
      'Se requiere permiso para iniciar la revision de solicitudes.',
    );

    return await this.service.marcarEnRevision(
      id,
      body.reviewerName,
      body.reviewerId,
      body.reviewerEmail,
      getFrontendBaseUrl(req),
    );
  }

  /**
   * POST /academic-registration/api/v1/certificates/solicitudes/:id/decision-revision
   * Enviar concepto del revisor para aprobacion final
   */
  @Post('solicitudes/:id/decision-revision')
  @HttpCode(HttpStatus.OK)
  async enviarDecisionRevision(
    @Param('id') id: string,
    @Body() body: SubmitReviewDecisionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    assertHasAnyPermission(
      req,
      REVIEW_WORK_PERMISSIONS,
      'Se requiere permiso para enviar decisiones de revision.',
    );

    return await this.service.enviarDecisionRevision(id, body);
  }

  /**
   * POST /academic-registration/api/v1/certificates/solicitudes/:id/resolver-aprobacion
   * Resolver aprobacion final del concepto enviado por el revisor
   */
  @Post('solicitudes/:id/resolver-aprobacion')
  @HttpCode(HttpStatus.OK)
  async resolverDecisionAprobador(
    @Param('id') id: string,
    @Body() body: ResolveReviewApprovalDto,
    @Req() req: AuthenticatedRequest,
  ) {
    assertCanResolveApprovalDecision(req, body);

    return await this.service.resolverDecisionAprobador(
      id,
      body,
      getFrontendBaseUrl(req),
    );
  }

  /**
   * POST /academic-registration/api/v1/certificates/solicitudes/:id/aprobar
   * Aprobar solicitud y generar certificado
   */
  @Post('solicitudes/:id/aprobar')
  @HttpCode(HttpStatus.OK)
  async aprobarSolicitud(
    @Param('id') id: string,
    @Body() body: ApproveRequestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    assertHasPermission(
      req,
      APPROVE_REQUEST_PERMISSION,
      'Se requiere permiso para aprobar solicitudes de revision.',
    );

    const origin =
      typeof req.headers.origin === 'string' ? req.headers.origin : undefined;
    const referer =
      typeof req.headers.referer === 'string' ? req.headers.referer : undefined;
    let frontendBaseUrl = origin;
    if (!frontendBaseUrl && referer) {
      try {
        frontendBaseUrl = new URL(referer).origin;
      } catch (_) {
        frontendBaseUrl = undefined;
      }
    }

    return await this.service.aprobarSolicitud(id, body, frontendBaseUrl);
  }

  /**
   * POST /academic-registration/api/v1/certificates/solicitudes/:id/rechazar
   * Rechazar solicitud de revisión
   */
  @Post('solicitudes/:id/rechazar')
  @HttpCode(HttpStatus.OK)
  async rechazarSolicitud(
    @Param('id') id: string,
    @Body()
    body: { reason: string; reviewerName?: string; reviewerId?: string },
    @Req() req: AuthenticatedRequest,
  ) {
    assertHasPermission(
      req,
      REJECT_REQUEST_PERMISSION,
      'Se requiere permiso para rechazar solicitudes de revision.',
    );

    const origin =
      typeof req.headers.origin === 'string' ? req.headers.origin : undefined;
    const referer =
      typeof req.headers.referer === 'string' ? req.headers.referer : undefined;
    let frontendBaseUrl = origin;
    if (!frontendBaseUrl && referer) {
      try {
        frontendBaseUrl = new URL(referer).origin;
      } catch (_) {
        frontendBaseUrl = undefined;
      }
    }

    return await this.service.rechazarSolicitud(
      id,
      body.reason,
      body.reviewerName,
      body.reviewerId,
      frontendBaseUrl,
    );
  }

  /**
   * GET /academic-registration/api/v1/certificates
   * Listar todos los certificados emitidos
   */
  @Get()
  async listarCertificados() {
    return await this.service.listarCertificados();
  }

  /**
   * GET /academic-registration/api/v1/certificates/graduados
   * Listar todos los graduados
   */
  @Get('graduados')
  async listarGraduados() {
    return await this.service.listarGraduados();
  }

  /**
   * GET /academic-registration/api/v1/certificates/template-config
   * Obtiene la configuracion editable de textos para el certificado academico
   */
  @Get('template-config')
  async obtenerConfiguracionPlantilla() {
    return await this.service.obtenerConfiguracionPlantillaCertificado();
  }

  /**
   * POST /academic-registration/api/v1/certificates/template-config/texts
   * Actualiza los textos de la plantilla del certificado academico
   */
  @Post('template-config/texts')
  @HttpCode(HttpStatus.OK)
  async actualizarTextosPlantilla(
    @Body() payload: UpdateTemplateTextsDto,
  ) {
    return await this.service.actualizarTextosPlantillaCertificado(payload);
  }

  /**
   * POST /academic-registration/api/v1/certificates/template-config/reset
   * Restablece la plantilla editable a sus textos predeterminados
   */
  @Post('template-config/reset')
  @HttpCode(HttpStatus.OK)
  async restablecerTextosPlantilla(
    @Body() body: { updatedBy?: string },
  ) {
    return await this.service.restablecerTextosPlantillaCertificado(
      body?.updatedBy,
    );
  }

  /**
   * GET /academic-registration/api/v1/certificates/:id
   * Obtener un certificado por ID
   */
  @Get(':id')
  async obtenerCertificado(@Param('id') id: string) {
    // TODO: Implementar
    return { message: 'Endpoint en desarrollo' };
  }

  /**
   * PUT /academic-registration/api/v1/certificates/:id
   * Actualizar datos del certificado
   */
  @Put(':id')
  async actualizarCertificado(
    @Param('id') id: string,
    @Body() payload: UpdateCertificateDto,
  ) {
    return await this.service.actualizarCertificado(id, payload);
  }

  /**
   * GET /academic-registration/api/v1/certificates/:id/pdf
   * Descargar PDF del certificado
   */
  @Get(':id/pdf')
  @Public()
  async descargarPDF(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const origin =
      typeof req.headers.origin === 'string' ? req.headers.origin : undefined;
    const referer =
      typeof req.headers.referer === 'string' ? req.headers.referer : undefined;
    let frontendBaseUrl = origin;
    if (!frontendBaseUrl && referer) {
      try {
        frontendBaseUrl = new URL(referer).origin;
      } catch (_) {
        frontendBaseUrl = undefined;
      }
    }

    const pdfBuffer = await this.service.getCertificatePDF(id, frontendBaseUrl);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="certificado-${id}.pdf"`,
    );
    res.send(pdfBuffer);
  }

  /**
   * POST /academic-registration/api/v1/certificates/:id/revocar
   * Revocar un certificado
   */
  @Post(':id/revocar')
  async revocarCertificado(
    @Param('id') id: string,
    @Body() body: { razon: string },
  ) {
    // TODO: Implementar revocación
    return { message: 'Endpoint en desarrollo' };
  }

  /**
   * POST /academic-registration/api/v1/certificates/:id/reenviar
   * Reenviar certificado por email al solicitante
   */
  @Post(':id/reenviar')
  @HttpCode(HttpStatus.OK)
  async reenviarCertificado(@Param('id') id: string, @Req() req: Request) {
    const origin =
      typeof req.headers.origin === 'string' ? req.headers.origin : undefined;
    const referer =
      typeof req.headers.referer === 'string' ? req.headers.referer : undefined;
    let frontendBaseUrl = origin;
    if (!frontendBaseUrl && referer) {
      try {
        frontendBaseUrl = new URL(referer).origin;
      } catch (_) {
        frontendBaseUrl = undefined;
      }
    }

    return await this.service.reenviarCertificado(id, frontendBaseUrl);
  }
}
