import { Controller, Get, Post, Put, Body, Param, Req, HttpCode, HttpStatus, Res, StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import { CertificatesService } from './certificates.service';
import { CertificateRequest } from './certificate-request.entity';

@Controller('certificates')
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  // ============================================
  // SOLICITUDES DE CERTIFICADO
  // ============================================

  @Get('solicitudes')
  async getAllSolicitudes() {
    return await this.certificatesService.findAllSolicitudes();
  }

  @Get('solicitudes/:id')
  async getSolicitudById(@Param('id') id: string) {
    return await this.certificatesService.findSolicitudById(id);
  }

  @Get('solicitudes/person/:personId')
  async getSolicitudesByPersonId(@Param('personId') personId: string) {
    return await this.certificatesService.findSolicitudesByPersonId(personId);
  }

  @Post('solicitudes')
  @HttpCode(HttpStatus.CREATED)
  async createSolicitud(@Body() data: Partial<CertificateRequest>) {
    return await this.certificatesService.createSolicitud(data);
  }

  @Put('solicitudes/:id')
  async updateSolicitud(
    @Param('id') id: string,
    @Body() data: Partial<CertificateRequest>,
  ) {
    return await this.certificatesService.updateSolicitud(id, data);
  }

  // ============================================
  // CERTIFICADOS
  // ============================================

  @Get('certificados')
  async getAllCertificados() {
    return await this.certificatesService.findAllCertificados();
  }

  // IMPORTANTE: Esta ruta debe ir ANTES de certificados/:id para evitar conflictos
  @Get('certificados/verify/:codigo')
  async verifyCertificado(
    @Param('codigo') codigo: string,
    @Req() req: any,
  ) {
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');
    return await this.certificatesService.registrarValidacion(codigo, ip, userAgent);
  }

  // Obtener historial de validaciones sin registrar una nueva
  @Get('certificados/:codigo/validations')
  async getValidationHistory(@Param('codigo') codigo: string) {
    return await this.certificatesService.obtenerHistorialValidaciones(codigo);
  }

  @Post('certificados/generate/:solicitudId')
  @HttpCode(HttpStatus.CREATED)
  async generateCertificado(@Param('solicitudId') solicitudId: string) {
    return await this.certificatesService.createCertificado(solicitudId);
  }

  @Get('certificados/:id/download-docx')
  async downloadCertificadoDocx(
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const buffer = await this.certificatesService.generateCertificadoDocx(id);

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="Certificado_Laboral_${id}.docx"`,
    });

    return new StreamableFile(buffer);
  }

  @Get('certificados/:id')
  async getCertificadoById(@Param('id') id: string) {
    return await this.certificatesService.findCertificadoById(id);
  }

  // ============================================
  // FIRMANTES
  // ============================================

  @Get('firmantes')
  async getAllFirmantes() {
    return await this.certificatesService.findAllFirmantes();
  }

  @Get('firmantes/principal')
  async getFirmantePrincipal() {
    return await this.certificatesService.findFirmantePrincipal();
  }

  // ============================================
  // PLANTILLAS
  // ============================================

  @Get('plantillas/:tipo')
  async getPlantillaActiva(@Param('tipo') tipo: string) {
    return await this.certificatesService.findPlantillaActiva(tipo);
  }

  // ============================================
  // AUTOSERVICIO - SOLICITUD DE CERTIFICADOS
  // ============================================

  @Post('autoservicio/verificar-documento')
  @HttpCode(HttpStatus.OK)
  async verificarDocumento(@Body() data: { documento: string }) {
    return await this.certificatesService.verificarDocumentoPorSolicitud(data.documento);
  }

  @Post('autoservicio/generar-codigo')
  @HttpCode(HttpStatus.OK)
  async generarCodigoValidacion(@Body() data: { documento: string }) {
    try {
      return await this.certificatesService.generarCodigoValidacion(data.documento);
    } catch (error) {
      console.error('❌ Error en generarCodigoValidacion:', error);
      throw error;
    }
  }

  @Post('autoservicio/validar-codigo')
  @HttpCode(HttpStatus.CREATED)
  async validarCodigoYGenerar(@Body() data: { documento: string; codigo: string }) {
    return await this.certificatesService.validarCodigoYGenerarCertificado(
      data.documento,
      data.codigo,
    );
  }
}
