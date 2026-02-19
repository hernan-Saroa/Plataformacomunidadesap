import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Raw, Repository } from 'typeorm';
import { CertificateRequest } from './certificate-request.entity';
import { Certificate } from './certificate.entity';
import { Signer } from './signer.entity';
import { CertificateTemplate } from './certificate-template.entity';
import { CertificateValidation } from './certificate-validation.entity';
import { CertificateGeneratorService } from './certificate-generator.service';
import { LaborCertificatePdfService } from './labor-certificate-pdf.service';
import { TemplateConfigService } from './template-config.service';

type TemplateType = 'docente' | 'administrador';

type SendLaborCertificateOptions = {
  includeSalary?: boolean;
  includeTechnicalBonus?: boolean;
  templateType?: 'docente' | 'administrador';
  publicBaseUrl?: string;
  to?: string;
};

@Injectable()
export class CertificatesService {
  private readonly logger = new Logger(CertificatesService.name);

  private resolveNotificationsBaseUrl() {
    const direct =
      process.env.NOTIFICATIONS_SERVICE_URL || process.env.NOTIFICATION_SERVICE_URL;
    if (direct) {
      return direct.replace(/\/$/, '');
    }
    // Acceso directo dentro de la red Docker; si corres local sin Docker puedes
    // sobreescribir con NOTIFICATION(S)_SERVICE_URL
    return 'http://notifications-service:3009';
  }

  private normalizeTemplateText(value: string): string {
    const base = String(value || '').toLowerCase();
    const normalized = typeof base.normalize === 'function' ? base.normalize('NFD') : base;
    return normalized
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private resolveTemplateTypeFromText(value: string): TemplateType {
    const text = this.normalizeTemplateText(value);
    if (!text) {
      return 'administrador';
    }
    return /\bdocen\w*\b|\bdoc\b/.test(text) ? 'docente' : 'administrador';
  }

  private resolveTemplateTypeFromRequest(request: CertificateRequest): TemplateType {
    const raw = `${request?.position_category || ''} ${request?.career_category || ''}`;
    return this.resolveTemplateTypeFromText(raw);
  }

  private resolveTemplateTypeFromCertificate(certificate: Certificate): TemplateType {
    const raw = `${certificate?.position_category || ''} ${certificate?.career_category || ''}`;
    return this.resolveTemplateTypeFromText(raw);
  }

  private normalizeDateOnly(value?: Date | string | null): Date | null {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) return null;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private resolveEmploymentStatusByDates(
    hiringDate?: Date | string | null,
    endDate?: Date | string | null,
  ): 'ACTIVO' | 'INACTIVO' {
    const start = this.normalizeDateOnly(hiringDate);
    const end = this.normalizeDateOnly(endDate);
    const today = this.normalizeDateOnly(new Date());

    if (!start || !today) return 'INACTIVO';
    if (today < start) return 'INACTIVO';
    if (!end) return 'ACTIVO';
    return today <= end ? 'ACTIVO' : 'INACTIVO';
  }

  private normalizeEmploymentStatus(statusRaw?: string | null): 'ACTIVO' | 'INACTIVO' | null {
    const status = String(statusRaw || '').trim().toUpperCase();
    if (!status) return null;
    if (status === 'A' || status === 'ACTIVO' || status === 'ACTIVE') return 'ACTIVO';
    if (status === 'I' || status === 'INACTIVO' || status === 'INACTIVE') return 'INACTIVO';
    return null;
  }

  private resolveEmploymentStatus(
    hiringDate?: Date | string | null,
    endDate?: Date | string | null,
    statusRaw?: string | null,
  ): 'ACTIVO' | 'INACTIVO' {
    const statusByDate = this.resolveEmploymentStatusByDates(hiringDate, endDate);
    const statusByCode = this.normalizeEmploymentStatus(statusRaw);

    // Regla de negocio: status (A/I) es la fuente principal y la fecha valida como respaldo.
    if (statusByCode) {
      return statusByCode;
    }

    return statusByDate;
  }

  private resolveStatusForPersistence(
    statusRaw?: string | null,
    hiringDate?: Date | string | null,
    endDate?: Date | string | null,
  ): string {
    const explicitStatus = String(statusRaw || '').trim();
    if (explicitStatus) {
      return explicitStatus.toUpperCase();
    }
    return this.resolveEmploymentStatusByDates(hiringDate, endDate) === 'ACTIVO' ? 'A' : 'I';
  }

  private normalizeEncargoType(value?: string | null): 'E' | 'N' | null {
    const normalized = String(value || '').trim().toUpperCase();
    if (!normalized) {
      return null;
    }

    // La data puede venir como "E", "N" o textos como "Encargo".
    if (normalized === 'E' || normalized.startsWith('E')) {
      return 'E';
    }
    if (normalized === 'N' || normalized.startsWith('N')) {
      return 'N';
    }
    return null;
  }

  private selectPreferredRequestForCertificate(requests: CertificateRequest[]): CertificateRequest | null {
    if (!requests.length) {
      return null;
    }

    // Prioridad 1: contratos activos.
    const activeRequests = requests.filter(
      (request) =>
        this.resolveEmploymentStatus(request.hiring_date, request.request_date, request.status) === 'ACTIVO',
    );

    // Prioridad 2 dentro de activos: tipo "E" (encargo).
    const activeWithEncargo = activeRequests.filter(
      (request) => this.normalizeEncargoType(request.observations) === 'E',
    );

    if (activeWithEncargo.length) {
      return activeWithEncargo[0];
    }

    if (activeRequests.length) {
      return activeRequests[0];
    }

    // Fallback: mantener comportamiento previo tomando el registro mas reciente.
    return requests[0];
  }

  private async ensureTemplateSnapshotForCertificate(certificate: Certificate): Promise<Certificate> {
    const cert = certificate as Certificate & {
      template_snapshot?: any;
      template_type?: string;
      template_version?: string;
    };

    if (cert.template_snapshot) {
      return certificate;
    }

    const templateType = (cert.template_type as TemplateType) || this.resolveTemplateTypeFromCertificate(certificate);
    const config = await this.templateConfigService.getActiveConfig(templateType);
    if (!config) {
      return certificate;
    }

    const patch = {
      template_snapshot: config,
      template_type: templateType,
      template_version: config.version || null,
    };

    await this.certificateRepo.update(certificate.id, patch);
    Object.assign(certificate, patch);
    return certificate;
  }

  private async ensureTemplateSnapshots(certificates: Certificate[]): Promise<void> {
    const missing = certificates.filter((cert) => !(cert as any)?.template_snapshot);
    if (!missing.length) {
      return;
    }

    const typesNeeded = new Set<TemplateType>();
    for (const cert of missing) {
      const templateType =
        ((cert as any)?.template_type as TemplateType) || this.resolveTemplateTypeFromCertificate(cert);
      typesNeeded.add(templateType);
    }

    const configByType = new Map<TemplateType, any>();
    for (const type of typesNeeded) {
      const config = await this.templateConfigService.getActiveConfig(type);
      if (config) {
        configByType.set(type, config);
      }
    }

    await Promise.all(
      missing.map(async (cert) => {
        const templateType =
          ((cert as any)?.template_type as TemplateType) || this.resolveTemplateTypeFromCertificate(cert);
        const config = configByType.get(templateType);
        if (!config) return;
        const patch = {
          template_snapshot: config,
          template_type: templateType,
          template_version: config.version || null,
        };
        await this.certificateRepo.update(cert.id, patch);
        Object.assign(cert, patch);
      }),
    );
  }

  constructor(
    @InjectRepository(CertificateRequest)
    private requestRepo: Repository<CertificateRequest>,
    @InjectRepository(Certificate)
    private certificateRepo: Repository<Certificate>,
    @InjectRepository(Signer)
    private signerRepo: Repository<Signer>,
    @InjectRepository(CertificateTemplate)
    private templateRepo: Repository<CertificateTemplate>,
    @InjectRepository(CertificateValidation)
    private validationRepo: Repository<CertificateValidation>,
    private certificateGenerator: CertificateGeneratorService,
    private laborPdfService: LaborCertificatePdfService,
    private templateConfigService: TemplateConfigService,
  ) {}

  // ============================================
  // CERTIFICATE REQUESTS
  // ============================================

  async findAllSolicitudes() {
    return await this.requestRepo.find({
      order: { request_date: 'DESC' },
    });
  }

  /**
   * Solicita al notifications-service que envíe el código por email.
   */
  private async enviarCodigoPorEmail(destinatario: string, codigo: string) {
    if (!destinatario) {
      this.logger.warn('No se pudo enviar el código: destinatario vacío');
      return;
    }

    const baseUrl = this.resolveNotificationsBaseUrl();
    const url = `${baseUrl}/api/v1/emails/validation-code`;
    this.logger.debug(`Llamando al servicio: ${url}`);
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: destinatario, code: codigo }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new Error(`Notifications service error (${response.status}): ${errorBody || 'sin detalle'}`);
    }

    this.logger.log(`Solicitud de envío de código enviada a notifications-service para ${destinatario}`);
  }

  private buildLaborEmailHtml(certificate: Certificate, recipientName?: string): string {
    const nombre = recipientName || certificate.full_name || 'usuario';
    const consecutivo = certificate.certificate_number || 'ESAP';
    return `
      <div style="font-family: 'Inter', Arial, sans-serif; background: #f5f7fb; padding: 24px; color: #1f2937;">
        <table width="100%" cellspacing="0" cellpadding="0" style="max-width: 520px; border: 1px solid #0b68d1; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 25px rgba(0,0,0,0.3);">
          <tr>
            <td style="background: linear-gradient(135deg, #003DA5 0%, #0b68d1 100%); padding: 18px 24px; color: #ffffff; font-weight: 700; font-size: 18px;">
              Certificados ESAP
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 24px 8px 24px; font-size: 16px; font-weight: 600; color: #111827;">
              Certificado laboral
            </td>
          </tr>
          <tr>
            <td style="padding: 0 24px 12px 24px; font-size: 14px; color: #4b5563; line-height: 1.6;">
              Hola ${nombre}, adjuntamos tu certificado laboral solicitado.
            </td>
          </tr>
          <tr>
            <td style="padding: 0 24px 18px 24px; font-size: 13px; color: #6b7280;">
              Certificado: <strong>${consecutivo}</strong>
            </td>
          </tr>
          <tr>
            <td style="padding: 15px 24px; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb;">
              ESAP - Escuela Superior de Administracion Publica
            </td>
          </tr>
        </table>
      </div>
    `;
  }

  private async enviarCertificadoLaboralPorEmail(
    certificate: Certificate,
    options: SendLaborCertificateOptions = {},
  ): Promise<{ to: string }> {
    const destinatario = (options.to || certificate.request?.email || '').trim();
    if (!destinatario) {
      throw new BadRequestException('No hay un email registrado para enviar el certificado');
    }

    const attachment = await this.laborPdfService.generateCertificatePdf(certificate, {
      includeSalary: options.includeSalary,
      includeTechnicalBonus: options.includeTechnicalBonus,
      templateType: options.templateType,
      publicBaseUrl: options.publicBaseUrl,
    });

    const baseUrl = this.resolveNotificationsBaseUrl();
    const url = `${baseUrl}/api/v1/emails/send-with-attachment`;
    const subject = `Certificado Laboral ESAP - ${certificate.certificate_number}`;
    const text = `Adjuntamos tu certificado laboral ${certificate.certificate_number}.`;

    const payload = {
      to: destinatario,
      subject,
      text,
      html: this.buildLaborEmailHtml(certificate, certificate.full_name),
      attachmentName: attachment.filename,
      attachmentBase64: attachment.buffer.toString('base64'),
      attachmentContentType: 'application/pdf',
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new Error(`Notifications service error (${response.status}): ${errorBody || 'sin detalle'}`);
    }

    this.logger.log(`Certificado laboral enviado a ${destinatario}`);
    return { to: destinatario };
  }

  async reenviarCertificadoLaboral(
    id: string,
    options: SendLaborCertificateOptions = {},
  ): Promise<{ mensaje: string; email: string }> {
    const certificate = await this.certificateRepo.findOne({
      where: { id },
      relations: ['request'],
    });

    if (!certificate) {
      throw new NotFoundException(`Certificado con ID ${id} no encontrado`);
    }

    await this.ensureTemplateSnapshotForCertificate(certificate);

    const result = await this.enviarCertificadoLaboralPorEmail(certificate, options);

    return {
      mensaje: `Certificado reenviado a ${result.to}`,
      email: result.to,
    };
  }

  async findSolicitudById(id: string) {
    const request = await this.requestRepo.findOne({
      where: { id },
    });
    if (!request) {
      throw new NotFoundException(`Solicitud con ID ${id} no encontrada`);
    }
    return request;
  }

  async findSolicitudesByPersonId(personId: string) {
    return await this.requestRepo.find({
      where: { person_id: personId },
      order: { request_date: 'DESC' },
    });
  }

  async createSolicitud(data: Partial<CertificateRequest>) {
    const rawIdNumber = (data.id_number || '').trim();
    if (rawIdNumber) {
      const normalizedIdNumber = rawIdNumber.replace(/\D+/g, '');
      const existing = await this.requestRepo.findOne({
        where: normalizedIdNumber
          ? {
              id_number: Raw(
                (alias) =>
                  `REPLACE(REPLACE(REPLACE(${alias}, '.', ''), '-', ''), ' ', '') = :idNumber`,
                { idNumber: normalizedIdNumber },
              ),
            }
          : { id_number: rawIdNumber },
        order: { request_date: 'DESC' },
      });

      if (existing) {
        const incomingName = this.normalizeTemplateText(data.full_name || '');
        const existingName = this.normalizeTemplateText(existing.full_name || '');
        if (incomingName && existingName && incomingName !== existingName) {
          throw new BadRequestException(
            `El documento ${rawIdNumber} ya está registrado a nombre de ${existing.full_name}. Verifica el número de documento.`,
          );
        }
      }
    }

    const status = this.resolveStatusForPersistence(data.status, data.hiring_date, data.request_date);
    const request = this.requestRepo.create({
      ...data,
      status,
    });
    return await this.requestRepo.save(request);
  }

  async updateSolicitud(id: string, data: Partial<CertificateRequest>) {
    const patch: Partial<CertificateRequest> = { ...data };
    if ('status' in data) {
      const existing = await this.requestRepo.findOne({ where: { id } });
      const hiringDate = data.hiring_date ?? existing?.hiring_date ?? null;
      const requestDate = data.request_date ?? existing?.request_date ?? null;
      patch.status = this.resolveStatusForPersistence(data.status, hiringDate, requestDate);
    } else if ('hiring_date' in data || 'request_date' in data) {
      const existing = await this.requestRepo.findOne({ where: { id } });
      const currentStatus = String(existing?.status || '').trim();
      if (!currentStatus) {
        const hiringDate = data.hiring_date ?? existing?.hiring_date ?? null;
        const requestDate = data.request_date ?? existing?.request_date ?? null;
        patch.status = this.resolveStatusForPersistence(undefined, hiringDate, requestDate);
      }
    }
    await this.requestRepo.update(id, patch);
    return await this.findSolicitudById(id);
  }

  // ============================================
  // CERTIFICATES
  // ============================================

  async findAllCertificados() {
    const certificates = await this.certificateRepo.find({
      relations: ['request'],
      order: { issue_date: 'DESC' },
    });

    await this.ensureTemplateSnapshots(certificates);

    // Agregar el conteo de validaciones para cada certificado
    const certificatesWithCount = await Promise.all(
      certificates.map(async (cert) => {
        const employmentStatus = this.resolveEmploymentStatus(
          cert.request?.hiring_date || cert.hiring_date,
          cert.request?.request_date,
          cert.request?.status,
        );
        const validationCount = await this.validationRepo.count({
          where: { certificate_id: cert.id },
        });
        return {
          ...cert,
          email: cert.request?.email,
          validation_count: validationCount,
          employment_status: employmentStatus,
        };
      }),
    );

    return certificatesWithCount;
  }

  async findCertificadosPaginados(params: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
    cargo?: string;
    tipoVinculacion?: string;
    fechaDesde?: string;
    fechaHasta?: string;
  }) {
    const safePage = Math.max(params.page || 1, 1);
    const safeLimit = Math.min(Math.max(params.limit || 10, 1), 10);
    const skip = (safePage - 1) * safeLimit;

    const qb = this.certificateRepo.createQueryBuilder('cert');
    qb.leftJoinAndSelect('cert.request', 'request');

    if (params.search) {
      const term = `%${params.search.toLowerCase()}%`;
      qb.andWhere(
        `(LOWER(cert.full_name) LIKE :term OR LOWER(cert.id_number) LIKE :term OR LOWER(cert.certificate_number) LIKE :term OR LOWER(cert.position_category) LIKE :term OR LOWER(cert.career_category) LIKE :term)`,
        { term },
      );
    }

    if (params.status) {
      const statusMap: Record<string, string> = {
        activo: 'VALID',
        revocado: 'REVOKED',
        expirado: 'EXPIRED',
        valid: 'VALID',
        revoked: 'REVOKED',
        expired: 'EXPIRED',
      };
      const normalized = params.status.toLowerCase();
      const mappedStatus = statusMap[normalized];
      if (mappedStatus) {
        qb.andWhere('cert.status = :status', { status: mappedStatus });
      }
    }

    if (params.cargo) {
      qb.andWhere('cert.position_category = :cargo', { cargo: params.cargo });
    }

    if (params.tipoVinculacion) {
      qb.andWhere('cert.career_category = :tipo', { tipo: params.tipoVinculacion });
    }

    if (params.fechaDesde) {
      const desde = new Date(params.fechaDesde);
      if (!isNaN(desde.getTime())) {
        desde.setHours(0, 0, 0, 0);
        qb.andWhere('COALESCE(cert.issue_date, cert.created_at) >= :fechaDesde', {
          fechaDesde: desde,
        });
      }
    }

    if (params.fechaHasta) {
      const hasta = new Date(params.fechaHasta);
      if (!isNaN(hasta.getTime())) {
        hasta.setHours(23, 59, 59, 999);
        qb.andWhere('COALESCE(cert.issue_date, cert.created_at) <= :fechaHasta', {
          fechaHasta: hasta,
        });
      }
    }

    qb
      .addSelect('COALESCE(cert.issuance_timestamp, cert.created_at)', 'sort_issuance_date')
      .addSelect('COALESCE(cert.issue_date, cert.created_at)', 'sort_issue_date')
      .orderBy('sort_issuance_date', 'DESC')
      .addOrderBy('sort_issue_date', 'DESC')
      .addOrderBy('cert.created_at', 'DESC');

    const [certificates, total] = await qb.skip(skip).take(safeLimit).getManyAndCount();

    await this.ensureTemplateSnapshots(certificates);

    const certificatesWithCount = await Promise.all(
      certificates.map(async (cert) => {
        const employmentStatus = this.resolveEmploymentStatus(
          cert.request?.hiring_date || cert.hiring_date,
          cert.request?.request_date,
          cert.request?.status,
        );
        const validationCount = await this.validationRepo.count({
          where: { certificate_id: cert.id },
        });
        return {
          ...cert,
          email: cert.request?.email,
          validation_count: validationCount,
          employment_status: employmentStatus,
        };
      }),
    );

    const [totalEmitidos, activos, revocados, expirados, escaneosQR] = await Promise.all([
      this.certificateRepo.count(),
      this.certificateRepo.count({ where: { status: 'VALID' } }),
      this.certificateRepo.count({ where: { status: 'REVOKED' } }),
      this.certificateRepo.count({ where: { status: 'EXPIRED' } }),
      this.validationRepo.count(),
    ]);

    return {
      items: certificatesWithCount,
      total,
      limit: safeLimit,
      page: safePage,
      stats: {
        totalEmitidos,
        certificadosActivos: activos,
        certificadosRevocados: revocados,
        certificadosExpirados: expirados,
        escaneosQR,
      },
    };
  }

  async findCertificadoById(id: string) {
    const certificate = await this.certificateRepo.findOne({
      where: { id },
    });
    if (!certificate) {
      throw new NotFoundException(`Certificado con ID ${id} no encontrado`);
    }
    await this.ensureTemplateSnapshotForCertificate(certificate);
    return certificate;
  }

  async findCertificadoByCodigoVerificacion(codigo: string) {
    const codigoTrim = (codigo || '').trim();
    const codigoSinEspacios = codigoTrim.replace(/\s+/g, '');
    // Buscar sin importar mayusculas/minusculas
    const certificate = await this.certificateRepo
      .createQueryBuilder('certificate')
      .where('UPPER(certificate.verification_code) = UPPER(:codigo)', { codigo: codigoTrim })
      .orWhere('UPPER(certificate.certificate_number) = UPPER(:codigo)', { codigo: codigoTrim })
      .orWhere("UPPER(REPLACE(certificate.certificate_number, ' ', '')) = UPPER(:codigoSinEspacios)", { codigoSinEspacios })
      .getOne();

    if (!certificate) {
      throw new NotFoundException(`Certificado con codigo ${codigoTrim} no encontrado`);
    }
    return certificate;
  }

  async createCertificado(solicitudId: string) {
    const request = await this.findSolicitudById(solicitudId);
    const signer = await this.signerRepo.findOne({
      where: { is_primary: true, is_active: true },
    });

    if (!signer) {
      throw new NotFoundException('No se encontrИ un firmante principal activo');
    }

    // Generate unique verification code
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10).toUpperCase();
    const verification_code = `QR-CERT-${timestamp}-${random}`;

    // Generate certificate number (simplified)
    const count = await this.certificateRepo.count();
    const certificate_number = `12_620_700_20_CD ${String(count + 1).padStart(3, '0')}`;

    const templateType = this.resolveTemplateTypeFromRequest(request);
    let templateSnapshot: any = null;
    let templateVersion: string | null = null;
    try {
      const config = await this.templateConfigService.getActiveConfig(templateType);
      if (config) {
        templateSnapshot = config;
        templateVersion = config.version || null;
      }
    } catch (error) {
      this.logger.warn(`No se pudo cargar la plantilla activa (${templateType}): ${error?.message || error}`);
    }

    const certificate = this.certificateRepo.create({
      verification_code,
      certificate_number,
      request_id: request.id,
      full_name: request.full_name,
      id_number: request.id_number,
      career_category: request.career_category,
      hiring_date: request.hiring_date,
      position_category: request.position_category,
      position_location: request.position_location,
      monthly_salary: request.monthly_salary,
      technical_bonus: Number(request.monthly_salary || 0) * 0.2,
      salary_text: request.salary_text,
      department: request.department,
      cod_cargo: request.cod_cargo,
      cod_grade: request.cod_grade || undefined,
      campus: request.campus,
      issue_date: new Date(),
      issuance_timestamp: new Date(),
      signer_name: signer.full_name,
      signer_position: signer.position,
      signer_department: signer.department,
      template_snapshot: templateSnapshot,
      template_type: templateType,
      template_version: templateVersion,
      status: 'VALID',
    });

    const saved = await this.certificateRepo.save(certificate);
    return saved;
  }

  // ============================================
  // VALIDATIONS
  // ============================================

  private parseUserAgentInfo(userAgent?: string | null): {
    deviceType: 'desktop' | 'mobile' | 'tablet';
    sistemaOperativo: string;
    navegador: string;
    version: string;
  } {
    const ua = String(userAgent || '').trim();
    const uaLower = ua.toLowerCase();

    const isTablet = /(ipad|tablet)/i.test(ua);
    const isMobile = /(mobile|iphone|android)/i.test(ua);
    const deviceType: 'desktop' | 'mobile' | 'tablet' = isTablet
      ? 'tablet'
      : isMobile
        ? 'mobile'
        : 'desktop';

    let sistemaOperativo = 'Desconocido';
    if (/(iphone|ipad|ipod|ios)/i.test(ua)) sistemaOperativo = 'iOS';
    else if (/android/i.test(ua)) sistemaOperativo = 'Android';
    else if (/windows/i.test(ua)) sistemaOperativo = 'Windows';
    else if (/(mac os|macos|macintosh)/i.test(ua)) sistemaOperativo = 'macOS';
    else if (/linux/i.test(ua)) sistemaOperativo = 'Linux';

    let navegador = 'Desconocido';
    let version = '';

    const browserPatterns: Array<{ regex: RegExp; name: string }> = [
      { regex: /(edg|edge|edgios|edga)\/([\d.]+)/i, name: 'Edge' },
      { regex: /(opr|opera)\/([\d.]+)/i, name: 'Opera' },
      { regex: /firefox\/([\d.]+)/i, name: 'Firefox' },
      { regex: /fxios\/([\d.]+)/i, name: 'Firefox' },
      { regex: /crios\/([\d.]+)/i, name: 'Chrome' },
      { regex: /chrome\/([\d.]+)/i, name: 'Chrome' },
      { regex: /version\/([\d.]+).*safari/i, name: 'Safari' },
      { regex: /safari\/([\d.]+)/i, name: 'Safari' },
    ];

    for (const pattern of browserPatterns) {
      const match = ua.match(pattern.regex);
      if (match) {
        navegador = pattern.name;
        version = (match[2] || match[1] || '').trim();
        break;
      }
    }

    // Fallback defensivo para UAs no estandar.
    if (navegador === 'Desconocido') {
      if (uaLower.includes('postman')) {
        navegador = 'Postman';
      } else if (uaLower.includes('insomnia')) {
        navegador = 'Insomnia';
      }
    }

    return {
      deviceType,
      sistemaOperativo,
      navegador,
      version,
    };
  }

  private mapValidationToDTO(validation: CertificateValidation) {
    const uaInfo = this.parseUserAgentInfo(validation.user_agent);

    const resultado = (validation.result || 'VALID').toUpperCase();
    const resultadoNormalizado =
      resultado === 'REVOKED' || resultado === 'EXPIRED' || resultado === 'INVALID'
        ? 'fallida'
        : resultado === 'SUSPICIOUS' || resultado === 'WARNING'
          ? 'sospechosa'
          : 'exitosa';

    const locationRaw = String(validation.location || '').trim();
    const locationParts = locationRaw
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
    const ciudad =
      validation.city ||
      validation.region ||
      locationParts[0] ||
      'Desconocido';
    const pais =
      validation.country ||
      (locationParts.length > 1 ? locationParts.slice(1).join(', ') : '') ||
      'Desconocido';

    const normalizedIp = this.normalizeIp(validation.ip_address || '') || validation.ip_address || '0.0.0.0';

    return {
      id: validation.id,
      timestamp: validation.validation_date,
      resultado: resultadoNormalizado,
      dispositivo: {
        tipo: uaInfo.deviceType,
        sistemaOperativo: uaInfo.sistemaOperativo,
        navegador: uaInfo.navegador,
        version: uaInfo.version,
      },
      ubicacion: {
        ip: normalizedIp,
        pais,
        ciudad,
        latitud: validation.latitude ?? undefined,
        longitud: validation.longitude ?? undefined,
        proveedor: validation.isp || undefined,
      },
      detalles: validation.result,
    };
  }

  private isIpLike(value: string): boolean {
    if (!value) return false;
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(value)) return true;
    return value.includes(':');
  }

  private normalizeSingleIp(raw?: string): string | null {
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

    if (!this.isIpLike(normalized)) return null;
    return normalized || null;
  }

  private normalizeIp(ip?: string): string | null {
    if (!ip) return null;

    const candidates = String(ip)
      .split(',')
      .map((item) => this.normalizeSingleIp(item))
      .filter((item): item is string => Boolean(item));

    if (!candidates.length) return null;

    const publicIp = candidates.find((candidate) => !this.isPrivateIp(candidate));
    return publicIp || candidates[0];
  }

  private isPrivateIp(ip: string): boolean {
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
  }

  private async fetchJsonWithTimeout(url: string, timeoutMs = 2500): Promise<any | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async resolveGeoFromIp(ip?: string): Promise<{
    city?: string;
    region?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
    isp?: string;
  } | null> {
    const normalizedIp = this.normalizeIp(ip || '');
    if (!normalizedIp || this.isPrivateIp(normalizedIp)) return null;

    try {
      const ipWho = await this.fetchJsonWithTimeout(
        `https://ipwho.is/${encodeURIComponent(normalizedIp)}`,
      );
      if (ipWho && ipWho.success !== false) {
        const geo = {
          city: ipWho.city || undefined,
          region: ipWho.region || undefined,
          country: ipWho.country || undefined,
          latitude: typeof ipWho.latitude === 'number' ? ipWho.latitude : undefined,
          longitude: typeof ipWho.longitude === 'number' ? ipWho.longitude : undefined,
          isp: ipWho.connection?.isp || undefined,
        };
        if (geo.city || geo.region || geo.country) {
          return geo;
        }
      }

      const ipApiCo = await this.fetchJsonWithTimeout(
        `https://ipapi.co/${encodeURIComponent(normalizedIp)}/json/`,
      );
      if (ipApiCo && !ipApiCo.error) {
        const latitude =
          typeof ipApiCo.latitude === 'number'
            ? ipApiCo.latitude
            : Number(ipApiCo.latitude) || undefined;
        const longitude =
          typeof ipApiCo.longitude === 'number'
            ? ipApiCo.longitude
            : Number(ipApiCo.longitude) || undefined;
        const geo = {
          city: ipApiCo.city || undefined,
          region: ipApiCo.region || undefined,
          country: ipApiCo.country_name || ipApiCo.country || undefined,
          latitude,
          longitude,
          isp: ipApiCo.org || undefined,
        };
        if (geo.city || geo.region || geo.country) {
          return geo;
        }
      }

      return null;
    } catch (error) {
      this.logger.warn(`No se pudo resolver geolocalizacion para IP ${ip}: ${error?.message || error}`);
      return null;
    }
  }

  private async obtenerHistorialValidacionesPorCertificado(certificateId: string) {
    const validaciones = await this.validationRepo.find({
      where: { certificate_id: certificateId },
      order: { validation_date: 'DESC' },
    });

    const mapped = await Promise.all(
      validaciones.map(async (validation) => {
        if ((!validation.city || !validation.country) && validation.ip_address) {
          const geo = await this.resolveGeoFromIp(validation.ip_address);
          if (geo) {
            validation.city = geo.city || validation.city;
            validation.country = geo.country || validation.country;
            validation.region = geo.region || validation.region;
            validation.latitude = geo.latitude ?? validation.latitude;
            validation.longitude = geo.longitude ?? validation.longitude;
            validation.isp = geo.isp || validation.isp;
            validation.location =
              geo.city && geo.country
                ? `${geo.city}, ${geo.country}`
                : validation.location;
            await this.validationRepo.save(validation);
          }
        }
        return this.mapValidationToDTO(validation);
      }),
    );

    return mapped;
  }

  async registrarValidacion(codigoVerificacion: string, ip?: string, userAgent?: string) {
    const certificate = await this.findCertificadoByCodigoVerificacion(codigoVerificacion);

    // Determine validation result based on certificate status
    let result = 'VALID';
    if (certificate.status === 'REVOKED') {
      result = 'REVOKED';
    } else if (certificate.status === 'EXPIRED') {
      result = 'EXPIRED';
    }

    const geo = await this.resolveGeoFromIp(ip);
    const location =
      geo?.city && geo?.country
        ? `${geo.city}, ${geo.country}`
        : geo?.region && geo?.country
          ? `${geo.region}, ${geo.country}`
          : geo?.city || geo?.region || geo?.country || undefined;

    const validation = this.validationRepo.create({
      certificate_id: certificate.id,
      validation_date: new Date(),
      ip_address: this.normalizeIp(ip || '') || ip,
      user_agent: userAgent,
      location,
      country: geo?.country,
      region: geo?.region,
      city: geo?.city,
      latitude: geo?.latitude,
      longitude: geo?.longitude,
      isp: geo?.isp,
      result: result,
    });

    await this.validationRepo.save(validation);

    const historial = await this.obtenerHistorialValidacionesPorCertificado(certificate.id);

    return {
      ...certificate,
      validation_history: historial,
      validation_count: historial.length,
    };
  }

  async obtenerHistorialValidaciones(codigoVerificacion: string) {
    const certificate = await this.findCertificadoByCodigoVerificacion(codigoVerificacion);
    const historial = await this.obtenerHistorialValidacionesPorCertificado(certificate.id);

    return {
      certificate_id: certificate.id,
      verification_code: certificate.verification_code,
      certificate_number: certificate.certificate_number,
      status: certificate.status,
      validation_count: historial.length,
      validation_history: historial,
    };
  }

  // ============================================
  // SIGNERS
  // ============================================

  async findAllFirmantes() {
    return await this.signerRepo.find({
      where: { is_active: true },
    });
  }

  async findFirmantePrincipal() {
    return await this.signerRepo.findOne({
      where: { is_primary: true, is_active: true },
    });
  }

  // ============================================
  // TEMPLATES
  // ============================================

  async findPlantillaActiva(tipoCertificado: string) {
    return await this.templateRepo.findOne({
      where: { certificate_type: tipoCertificado, is_active: true },
      order: { version: 'DESC' },
    });
  }

  // ============================================
  // GENERATE DOCX
  // ============================================

  async generateCertificadoDocx(certificadoId: string): Promise<Buffer> {
    // Buscar el certificado
    const certificado = await this.certificateRepo.findOne({
      where: { id: certificadoId },
    });

    if (!certificado) {
      throw new NotFoundException(`Certificado con ID ${certificadoId} no encontrado`);
    }

    const normalizarFecha = (valor: Date | string) => {
      if (!valor) return null;
      if (valor instanceof Date) {
        return new Date(
          valor.getUTCFullYear(),
          valor.getUTCMonth(),
          valor.getUTCDate(),
          12,
          0,
          0,
        );
      }
      const match = valor.match(/^(\\d{4})-(\\d{2})-(\\d{2})$/);
      if (match) {
        const year = Number(match[1]);
        const month = Number(match[2]) - 1;
        const day = Number(match[3]);
        return new Date(year, month, day, 12, 0, 0);
      }
      const parsed = new Date(valor);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    };

    // Formatear fecha de vinculacion
    const fechaVinculacionDate = normalizarFecha(certificado.hiring_date);
    const fechaVinculacion = this.certificateGenerator.formatFechaTexto(
      fechaVinculacionDate || new Date(),
    );

    // Formatear fecha de expedicion
    const fechaExpedicionDate = normalizarFecha(certificado.issue_date);
    const fechaExpedicion = this.certificateGenerator.formatFechaTexto(
      fechaExpedicionDate || new Date(),
    );

    const normalizarMonto = (value?: string | number | null) => {
      if (value === null || value === undefined) return 0;
      const raw = typeof value === 'string' ? value.replace(/[^\d.-]/g, '') : String(value);
      const parsed = Number(raw);
      if (!Number.isFinite(parsed)) return 0;
      return Math.round(parsed);
    };

    const formatearMonto = (value?: string | number | null) =>
      normalizarMonto(value).toLocaleString('es-CO', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });

    // Formatear salario
    const salarioBase = normalizarMonto(certificado.monthly_salary);
    const salarioNumero = `($${formatearMonto(salarioBase)})`;
    const salarioTexto = this.certificateGenerator.numeroATexto(salarioBase);

    // Generar el documento DOCX
    const buffer = await this.certificateGenerator.generateCertificate({
      consecutivo: certificado.certificate_number,
      nombreCompleto: certificado.full_name,
      numeroDocumento: certificado.id_number,
      tipoVinculacion: certificado.career_category,
      fechaVinculacion: fechaVinculacion,
      categoria: certificado.position_category,
      ubicacion: certificado.department || 'Bogota D.C.',
      salarioNumero: salarioNumero,
      salarioTexto: salarioTexto,
      fechaExpedicion: fechaExpedicion,
      firmante: certificado.signer_name || 'ALBA LUCIA MARIN ZULUAGA',
    });

    return buffer;
  }

  // ============================================
  // AUTOSERVICIO - SOLICITUD DE CERTIFICADOS
  // ============================================

  /**
   * Verificar si un documento existe en las solicitudes
   * y si ya tiene un certificado generado
   */
  async verificarDocumentoPorSolicitud(documento: string) {
    // Buscar la solicitud por numero de documento
    const documentoTrim = (documento || '').trim();
    const solicitudes = await this.requestRepo
      .createQueryBuilder('request')
      .where('request.id_number = :documento', { documento: documentoTrim })
      .orderBy('COALESCE(request.hiring_date, request.request_date, request.created_at)', 'DESC')
      .addOrderBy('request.request_date', 'DESC')
      .addOrderBy('request.created_at', 'DESC')
      .getMany();

    const solicitud = this.selectPreferredRequestForCertificate(solicitudes);

    if (!solicitud) {
      return {
        existe: false,
        mensaje: 'No se encontro ningun registro con este documento',
      };
    }

    // Verificar si ya tiene un certificado generado
    const certificadoExistente = await this.certificateRepo.findOne({
      where: { request_id: solicitud.id },
    });

    if (certificadoExistente) {
      await this.ensureTemplateSnapshotForCertificate(certificadoExistente);
      return {
        existe: true,
        tieneCertificado: true,
        mensaje: 'Ya tienes un certificado generado',
        solicitud: solicitud,
        certificado: certificadoExistente,
      };
    }

    return {
      existe: true,
      tieneCertificado: false,
      mensaje: 'Documento encontrado, puedes solicitar tu certificado',
      solicitud: solicitud,
    };
  }

  /**
   * Generar codigo de validacion
   * En produccion: enviar email
   * En local: devolver codigo fijo
   */
  async generarCodigoValidacion(documento: string) {
    const verificacion = await this.verificarDocumentoPorSolicitud(documento);

    if (!verificacion.existe) {
      throw new NotFoundException('Documento no encontrado en el sistema');
    }

    // Verificar que solicitud existe
    if (!verificacion.solicitud) {
      throw new BadRequestException('Error al recuperar informacion de la solicitud');
    }

    const employmentStatus = this.resolveEmploymentStatus(
      verificacion.solicitud.hiring_date,
      verificacion.solicitud.request_date,
      verificacion.solicitud.status,
    );
    if (employmentStatus === 'INACTIVO') {
      throw new BadRequestException('Actualmente no tienes un contrato activo en la ESAP.');
    }

    // Generar codigo de 6 digitos
    const codigoValidacion = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

    // Guardar el codigo y expiracion en la solicitud
    await this.requestRepo.update(verificacion.solicitud.id, {
      validation_code: codigoValidacion,
      validation_expires_at: expiresAt,
    });

    // Enviar email si hay configuracion SMTP
    try {
      await this.enviarCodigoPorEmail(verificacion.solicitud.email, codigoValidacion);
    } catch (err) {
      this.logger.warn(`No se pudo enviar el codigo por email: ${err?.message || err}`);
    }

    return {
      mensaje: 'Codigo de validacion generado',
      email: verificacion.solicitud.email,
      // Devolver datos del empleado para mostrar en el frontend
      solicitud: {
        full_name: verificacion.solicitud.full_name,
        id_number: verificacion.solicitud.id_number,
        email: verificacion.solicitud.email,
        status: verificacion.solicitud.status,
        employment_status: employmentStatus,
        career_category: verificacion.solicitud.career_category,
        hiring_date: verificacion.solicitud.hiring_date,
        position_category: verificacion.solicitud.position_category,
        position_location: verificacion.solicitud.position_location,
        monthly_salary: verificacion.solicitud.monthly_salary,
        department: verificacion.solicitud.department,
        campus: verificacion.solicitud.campus,
      },
    };
  }

  /**
   * Validar codigo y generar certificado
   */
  async validarCodigoYGenerarCertificado(documento: string, codigo: string) {
    const documentoTrim = (documento || '').trim();
    const codigoTrim = (codigo || '').trim();
    // Buscar la solicitud por documento + codigo para evitar conflictos con multiples solicitudes
    const solicitud = await this.requestRepo.findOne({
      where: { id_number: documentoTrim, validation_code: codigoTrim },
      order: { validation_expires_at: 'DESC', updated_at: 'DESC' },
    });

    if (!solicitud) {
      throw new BadRequestException('Codigo de validacion incorrecto');
    }

    // Validar vigencia
    if (!solicitud.validation_expires_at) {
      throw new BadRequestException('No se ha generado un codigo de validacion para esta solicitud');
    }

    if (new Date(solicitud.validation_expires_at) < new Date()) {
      throw new BadRequestException('El codigo de validacion ha expirado. Solicita uno nuevo.');
    }

    const employmentStatus = this.resolveEmploymentStatus(
      solicitud.hiring_date,
      solicitud.request_date,
      solicitud.status,
    );
    if (employmentStatus === 'INACTIVO') {
      throw new BadRequestException('Actualmente no tienes un contrato activo en la ESAP.');
    }

    // Generar el certificado
    const nuevoCertificado = await this.createCertificado(solicitud.id);

    // Limpia el codigo y expiracion en la solicitud
    await this.requestRepo.update(solicitud.id, {
      validation_code: null,
      validation_expires_at: null,
    });

    return {
      mensaje: 'Certificado generado exitosamente',
      certificado: nuevoCertificado,
    };
  }
}
