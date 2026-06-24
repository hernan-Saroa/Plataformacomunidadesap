import { Controller, Get, Post, Put, Delete, Body, Param, Req, Query, HttpCode, HttpStatus, Res, StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import { CertificatesService } from './certificates.service';
import { CertificateRequest } from './certificate-request.entity';
import { Public } from '../auth/public.decorator';

@Controller('certificates')
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  private resolveRequestUsername(req: any): string {
    const headerUser = req?.headers?.['x-user-username'];
    const normalizedHeaderUser = Array.isArray(headerUser)
      ? String(headerUser[0] || '').trim()
      : String(headerUser || '').trim();
    return normalizedHeaderUser || req?.user?.username || '';
  }

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
  // PRIMA TECNICA
  // ============================================

  @Get('technical-bonus/search')
  async searchTechnicalBonusCandidates(
    @Query('query') query?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? Number.parseInt(limit, 10) : 10;
    return await this.certificatesService.searchTechnicalBonusCandidates(query || '', parsedLimit);
  }

  @Get('technical-bonus/categories')
  async getTechnicalBonusCategories(
    @Query('includeInactive') includeInactive?: string,
  ) {
    return await this.certificatesService.listTechnicalBonusCategories({
      includeInactive: ['true', '1', 'si', 'yes'].includes(
        String(includeInactive || '').trim().toLowerCase(),
      ),
    });
  }

  @Post('technical-bonus/categories')
  async createTechnicalBonusCategory(
    @Body()
    body: {
      code?: string;
      category?: string;
      label?: string;
      description?: string;
      templateText?: string;
      template_text?: string;
      updatedBy?: string;
    },
    @Req() req: any,
  ) {
    return await this.certificatesService.createTechnicalBonusCategory({
      ...body,
      updatedBy: body.updatedBy || this.resolveRequestUsername(req),
    });
  }

  @Put('technical-bonus/categories/:category')
  async updateTechnicalBonusCategory(
    @Param('category') category: string,
    @Body()
    body: {
      label?: string;
      description?: string;
      templateText?: string;
      template_text?: string;
      isActive?: boolean;
      is_active?: boolean;
      displayOrder?: number;
      display_order?: number;
      updatedBy?: string;
    },
    @Req() req: any,
  ) {
    return await this.certificatesService.updateTechnicalBonusCategory(
      category,
      {
        ...body,
        updatedBy: body.updatedBy || this.resolveRequestUsername(req),
      },
    );
  }

  @Delete('technical-bonus/categories/:category/assignments')
  async deleteTechnicalBonusAssignmentsByCategory(
    @Param('category') category: string,
  ) {
    return await this.certificatesService.deleteTechnicalBonusAssignmentsByCategory(
      category,
    );
  }

  @Delete('technical-bonus/categories/:category')
  async deleteTechnicalBonusCategory(@Param('category') category: string) {
    return await this.certificatesService.deleteTechnicalBonusCategory(category);
  }

  @Get('technical-bonus')
  async getTechnicalBonusAssignments(@Query('category') category?: string) {
    return await this.certificatesService.listTechnicalBonusAssignments(category || '');
  }

  @Post('technical-bonus')
  async upsertTechnicalBonusAssignment(
    @Body()
    body: {
      category: string;
      idNumber: string;
      fullName?: string;
      requestId?: string;
      percentage: number;
      updatedBy?: string;
    },
    @Req() req: any,
  ) {
    return await this.certificatesService.upsertTechnicalBonusAssignment({
      ...body,
      updatedBy: body.updatedBy || this.resolveRequestUsername(req),
    });
  }

  @Post('technical-bonus/bulk')
  async bulkUpsertTechnicalBonusAssignments(
    @Body()
    body: {
      category: string;
      rows: Array<{
        rowNumber?: number;
        fullName?: string;
        idNumber?: string;
        percentage?: number | string;
      }>;
      updatedBy?: string;
    },
    @Req() req: any,
  ) {
    return await this.certificatesService.bulkUpsertTechnicalBonusAssignments({
      ...body,
      updatedBy: body.updatedBy || this.resolveRequestUsername(req),
    });
  }

  @Put('technical-bonus/:id')
  async updateTechnicalBonusAssignment(
    @Param('id') id: string,
    @Body()
    body: {
      percentage: number;
      updatedBy?: string;
    },
    @Req() req: any,
  ) {
    return await this.certificatesService.updateTechnicalBonusAssignment(id, {
      percentage: body.percentage,
      updatedBy: body.updatedBy || this.resolveRequestUsername(req),
    });
  }

  @Delete('technical-bonus/:id')
  async deleteTechnicalBonusAssignment(@Param('id') id: string) {
    return await this.certificatesService.deleteTechnicalBonusAssignment(id);
  }

  @Get('technical-bonus/template/:category')
  async getTechnicalBonusTemplate(@Param('category') category: string) {
    return await this.certificatesService.getTechnicalBonusTemplate(category);
  }

  @Put('technical-bonus/template/:category')
  async updateTechnicalBonusTemplate(
    @Param('category') category: string,
    @Body() body: { template_text: string; updatedBy?: string },
    @Req() req: any,
  ) {
    return await this.certificatesService.updateTechnicalBonusTemplate(
      category,
      body.template_text,
      body.updatedBy || this.resolveRequestUsername(req),
    );
  }

  // ============================================
  // CERTIFICADOS
  // ============================================

  @Get('certificados')
  async getAllCertificados(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('cargo') cargo?: string,
    @Query('tipoVinculacion') tipoVinculacion?: string,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
    @Query('forExport') forExport?: string,
  ) {
    const parsedPage = page ? Number.parseInt(page, 10) : undefined;
    const parsedLimit = limit ? Number.parseInt(limit, 10) : undefined;
    const isExportRequest = ['true', '1', 'si', 'yes', 'y'].includes(
      String(forExport || '').trim().toLowerCase(),
    );
    const hasFilters = Boolean(search || status || cargo || tipoVinculacion || fechaDesde || fechaHasta);
    const hasPagination = Number.isFinite(parsedPage) || Number.isFinite(parsedLimit) || hasFilters || isExportRequest;

    if (hasPagination) {
      return await this.certificatesService.findCertificadosPaginados({
        page: Number.isFinite(parsedPage) ? parsedPage as number : 1,
        limit: Number.isFinite(parsedLimit) ? parsedLimit as number : 10,
        search,
        status,
        cargo,
        tipoVinculacion,
        fechaDesde,
        fechaHasta,
        forExport: isExportRequest,
      });
    }

    return await this.certificatesService.findAllCertificados();
  }

  // IMPORTANTE: Esta ruta debe ir ANTES de certificados/:id para evitar conflictos
  @Public()
  @Get('certificados/verify/:codigo')
  async verifyCertificado(
    @Param('codigo') codigo: string,
    @Req() req: any,
  ) {
    const forwarded = req.headers?.['x-forwarded-for'];
    const standardForwarded = req.headers?.forwarded;
    const realIp = req.headers?.['x-real-ip'];
    const cfConnectingIp = req.headers?.['cf-connecting-ip'];
    const clientIpHeader = req.headers?.['x-client-ip'];
    const parseIpHeader = (value?: string | string[]) => {
      const raw = Array.isArray(value) ? value.join(',') : value || '';
      return String(raw)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    };

    const ipCandidates = [
      ...parseIpHeader(forwarded),
      ...parseIpHeader(standardForwarded),
      ...parseIpHeader(cfConnectingIp),
      ...parseIpHeader(realIp),
      ...parseIpHeader(clientIpHeader),
      ...(Array.isArray(req.ips) ? req.ips.map((item: any) => String(item || '').trim()) : []),
      typeof req.ip === 'string' ? req.ip.trim() : '',
      typeof req.connection?.remoteAddress === 'string' ? req.connection.remoteAddress.trim() : '',
      typeof req.socket?.remoteAddress === 'string' ? req.socket.remoteAddress.trim() : '',
    ].filter(Boolean);

    const parseSingleHeader = (value?: string | string[]) => {
      const raw = Array.isArray(value) ? value.find((item) => String(item || '').trim()) : value;
      const parsed = String(raw || '').trim();
      return parsed || undefined;
    };

    const pickHeader = (...headerNames: string[]) => {
      for (const headerName of headerNames) {
        const value = parseSingleHeader(req.headers?.[headerName]);
        if (value) return value;
      }
      return undefined;
    };

    const ip = ipCandidates.join(',');
    const userAgent = req.get('user-agent');
    const geoContext = {
      geoCountry: pickHeader(
        'cf-ipcountry',
        'x-vercel-ip-country',
        'x-country',
        'x-country-code',
        'x-geo-country',
      ),
      geoRegion: pickHeader(
        'x-vercel-ip-country-region',
        'x-region',
        'x-geo-region',
      ),
      geoCity: pickHeader(
        'x-vercel-ip-city',
        'x-city',
        'x-geo-city',
      ),
      geoTimezone: pickHeader(
        'x-vercel-ip-timezone',
        'x-timezone',
        'x-geo-timezone',
      ),
      geoLatitude: pickHeader(
        'x-vercel-ip-latitude',
        'x-latitude',
        'x-geo-latitude',
        'x-client-latitude',
      ),
      geoLongitude: pickHeader(
        'x-vercel-ip-longitude',
        'x-longitude',
        'x-geo-longitude',
        'x-client-longitude',
      ),
    };
    return await this.certificatesService.registrarValidacion(codigo, ip, userAgent, geoContext);
  }

  // Obtener historial de validaciones sin registrar una nueva
  @Public()
  @Get('certificados/:codigo/validations')
  async getValidationHistory(@Param('codigo') codigo: string) {
    return await this.certificatesService.obtenerHistorialValidaciones(codigo);
  }

  @Post('certificados/generate/:solicitudId')
  @HttpCode(HttpStatus.CREATED)
  async generateCertificado(@Param('solicitudId') solicitudId: string) {
    return await this.certificatesService.createCertificado(solicitudId);
  }

  @Get('certificados/:id/pdf')
  async getCertificadoPdf(
    @Param('id') id: string,
    @Query('publicBaseUrl') publicBaseUrl: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { buffer, filename } = await this.certificatesService.generateCertificadoPdfBufferById(
      id,
      { publicBaseUrl },
    );
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
    });
    return new StreamableFile(buffer);
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

  @Post('certificados/:id/reenviar')
  @Public()
  @HttpCode(HttpStatus.OK)
  async reenviarCertificadoLaboral(
    @Param('id') id: string,
    @Body()
    body?: {
      includeSalary?: boolean;
      includeTechnicalBonus?: boolean;
      templateType?: 'docente' | 'administrador';
      publicBaseUrl?: string;
      to?: string;
    },
  ) {
    return await this.certificatesService.reenviarCertificadoLaboral(id, body || {});
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
  @Public()
  @HttpCode(HttpStatus.OK)
  async verificarDocumento(@Body() data: { documento: string }) {
    return await this.certificatesService.verificarDocumentoPorSolicitud(data.documento);
  }

  @Post('autoservicio/generar-codigo')
  @Public()
  @HttpCode(HttpStatus.OK)
  async generarCodigoValidacion(
    @Body() data: { documento: string; documentType?: string },
  ) {
    try {
      return await this.certificatesService.generarCodigoValidacion(
        data.documento,
        data.documentType,
      );
    } catch (error) {
      console.error('❌ Error en generarCodigoValidacion:', error);
      throw error;
    }
  }

  @Post('autoservicio/validar-codigo')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  async validarCodigoYGenerar(
    @Body()
    data: {
      documento: string;
      codigo: string;
      documentType?: string;
      includeSalary?: boolean;
      includeTechnicalBonus?: boolean;
    },
  ) {
    return await this.certificatesService.validarCodigoYGenerarCertificado(
      data.documento,
      data.codigo,
      {
        documentType: data.documentType,
        includeSalary: data.includeSalary,
        includeTechnicalBonus: data.includeTechnicalBonus,
      },
    );
  }
}
