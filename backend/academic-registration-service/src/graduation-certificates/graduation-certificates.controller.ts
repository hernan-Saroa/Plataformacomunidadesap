import {
  Controller,
  Get,
  Post,
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
import type { Request, Response } from 'express';

@Controller('academic-registration/api/v1/certificates')
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
  @HttpCode(HttpStatus.OK)
  async verificarGraduado(
    @Body() body: { idNumber: string; idIssueDate: string },
  ) {
    return await this.service.verificarGraduado(
      body.idNumber,
      body.idIssueDate,
    );
  }

  /**
   * POST /academic-registration/api/v1/certificates/autoservicio/solicitar-certificado
   * Enviar solicitud desde landing; valida al graduado y envía el certificado si existe
   */
  @Post('autoservicio/solicitar-certificado')
  @HttpCode(HttpStatus.OK)
  async solicitarCertificado(@Body() body: LandingCertificateRequestDto) {
    return await this.service.solicitarCertificadoLanding(body);
  }

  /**
   * POST /academic-registration/api/v1/certificates/autoservicio/generar-codigo
   * Generar código de validación y enviar por email
   */
  @Post('autoservicio/generar-codigo')
  @HttpCode(HttpStatus.OK)
  async generarCodigoValidacion(
    @Body() body: { idNumber: string; idIssueDate: string },
  ) {
    return await this.service.generarCodigoValidacion(
      body.idNumber,
      body.idIssueDate,
    );
  }

  /**
   * POST /academic-registration/api/v1/certificates/autoservicio/validar-codigo
   * Validar código y generar certificado automáticamente
   */
  @Post('autoservicio/validar-codigo')
  @HttpCode(HttpStatus.OK)
  async validarCodigoYGenerarCertificado(
    @Body() body: { idNumber: string; idIssueDate: string; codigo: string },
  ) {
    return await this.service.validarCodigoYGenerarCertificado(
      body.idNumber,
      body.idIssueDate,
      body.codigo,
    );
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
  @HttpCode(HttpStatus.OK)
  async validarPorQR(
    @Body() body: { verificationCode: string },
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    return await this.service.validarPorQR(
      body.verificationCode,
      ipAddress,
      userAgent,
    );
  }

  /**
   * POST /academic-registration/api/v1/certificates/validacion/numero
   * Validar un certificado por número de certificado
   */
  @Post('validacion/numero')
  @HttpCode(HttpStatus.OK)
  async validarPorNumero(
    @Body() body: { certificateNumber: string },
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    return await this.service.validarPorNumero(
      body.certificateNumber,
      ipAddress,
      userAgent,
    );
  }

  /**
   * GET /academic-registration/api/v1/certificates/validacion/estadisticas
   * Obtener estadísticas públicas de certificados
   */
  @Get('validacion/estadisticas')
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
  @HttpCode(HttpStatus.OK)
  async registrarDescarga(
    @Body() body: { certificateId: string },
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress;
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
   * GET /academic-registration/api/v1/certificates/:id/pdf
   * Descargar PDF del certificado
   */
  @Get(':id/pdf')
  async descargarPDF(@Param('id') id: string, @Res() res: Response) {
    const pdfBuffer = await this.service.getCertificatePDF(id);

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
}
