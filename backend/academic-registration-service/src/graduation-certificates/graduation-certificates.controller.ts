import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { GraduationCertificatesService } from './graduation-certificates.service';
import { LandingCertificateRequestDto } from './dto/landing-certificate-request.dto';
import type { ApproveRequestDto } from './dto/approve-request.dto';
import type { UpdateCertificateDto } from './dto/update-certificate.dto';
import type { Request, Response } from 'express';
import { Public } from '../auth/public.decorator';

type ValidationGeoContext = {
  geoCountry?: string;
  geoRegion?: string;
  geoCity?: string;
  geoTimezone?: string;
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
    ...(Array.isArray(req.ips) ? req.ips.map((item) => String(item || '').trim()) : []),
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

const pickHeader = (req: Request, ...headerNames: string[]): string | undefined => {
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
  @Post('autoservicio/solicitar-certificado')
  @Public()
  @HttpCode(HttpStatus.OK)
  async solicitarCertificado(
    @Body() body: LandingCertificateRequestDto,
    @Req() req: Request,
  ) {
    const origin = typeof req.headers.origin === 'string' ? req.headers.origin : undefined;
    const referer = typeof req.headers.referer === 'string' ? req.headers.referer : undefined;
    let frontendBaseUrl = origin;
    if (!frontendBaseUrl && referer) {
      try {
        frontendBaseUrl = new URL(referer).origin;
      } catch (_) {
        frontendBaseUrl = undefined;
      }
    }

    return await this.service.solicitarCertificadoLanding(body, frontendBaseUrl);
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
   * Listar solicitudes de revisi?n manual
   */
  @Get('solicitudes/revision')
  async listarSolicitudesRevision() {
    return await this.service.listarSolicitudesRevision();
  }

  /**
   * GET /academic-registration/api/v1/certificates/solicitudes/:id
   * Obtener solicitud por ID
   */
  @Get('solicitudes/:id')
  async obtenerSolicitud(@Param('id') id: string) {
    return await this.service.obtenerSolicitud(id);
  }

  /**
   * POST /academic-registration/api/v1/certificates/solicitudes/:id/en-revision
   * Marcar solicitud como en revisión
   */
  @Post('solicitudes/:id/en-revision')
  @HttpCode(HttpStatus.OK)
  async marcarEnRevision(
    @Param('id') id: string,
    @Body() body: { reviewerName?: string; reviewerId?: string },
  ) {
    return await this.service.marcarEnRevision(
      id,
      body.reviewerName,
      body.reviewerId,
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
    @Req() req: Request,
  ) {
    const origin = typeof req.headers.origin === 'string' ? req.headers.origin : undefined;
    const referer = typeof req.headers.referer === 'string' ? req.headers.referer : undefined;
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
    @Body() body: { reason: string; reviewerName?: string; reviewerId?: string },
    @Req() req: Request,
  ) {
    const origin = typeof req.headers.origin === 'string' ? req.headers.origin : undefined;
    const referer = typeof req.headers.referer === 'string' ? req.headers.referer : undefined;
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
  async descargarPDF(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const origin = typeof req.headers.origin === 'string' ? req.headers.origin : undefined;
    const referer = typeof req.headers.referer === 'string' ? req.headers.referer : undefined;
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
  async reenviarCertificado(
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const origin = typeof req.headers.origin === 'string' ? req.headers.origin : undefined;
    const referer = typeof req.headers.referer === 'string' ? req.headers.referer : undefined;
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
