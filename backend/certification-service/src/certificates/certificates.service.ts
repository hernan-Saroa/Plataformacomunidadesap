import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CertificateRequest } from './certificate-request.entity';
import { Certificate } from './certificate.entity';
import { Signer } from './signer.entity';
import { CertificateTemplate } from './certificate-template.entity';
import { CertificateValidation } from './certificate-validation.entity';
import { CertificateGeneratorService } from './certificate-generator.service';
import * as nodemailer from 'nodemailer';

@Injectable()
export class CertificatesService {
  private readonly logger = new Logger(CertificatesService.name);
  private mailTransporter: nodemailer.Transporter | null = null;

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
   * Enviar código por email si hay configuración SMTP.
   */
  private async enviarCodigoPorEmail(destinatario: string, codigo: string) {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) {
      this.logger.warn('SMTP no configurado, no se envía email. Variables requeridas: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM');
      return;
    }

    if (!this.mailTransporter) {
      this.mailTransporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT),
        secure: Number(SMTP_PORT) === 465,
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS,
        },
      });
    }

    const mailOptions = {
      from: SMTP_FROM,
      to: destinatario,
      subject: 'Código de validación - Certificado Laboral ESAP',
      text: `Tu código de validación es: ${codigo}\n\nEste código es válido por un tiempo limitado.`,
      html: `
        <div style="font-family: 'Inter', Arial, sans-serif; background: #f5f7fb; padding: 24px; color: #1f2937;">
          <table width="100%" cellspacing="0" cellpadding="0" style="max-width: 520px; border: 1px solid #0b68d1; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 25px rgba(0,0,0,0.3);">
            <tr>
              <td style="background: linear-gradient(135deg, #003DA5 0%, #0b68d1 100%); padding: 18px 24px; color: #ffffff; font-weight: 700; font-size: 18px;">
                Certificados ESAP
              </td>
            </tr>
            <tr>
              <td style="padding: 24px 24px 8px 24px; font-size: 16px; font-weight: 600; color: #111827;">
                Código de validación
              </td>
            </tr>
            <tr>
              <td style="padding: 0 24px 12px 24px; font-size: 14px; color: #4b5563; line-height: 1.6;">
                Usa este código para validar tu solicitud de certificado. Es válido por tiempo limitado.
              </td>
            </tr>
            <tr>
              <td style="padding: 0 24px 18px 24px; text-align: center;">
                <div style="display: inline-block; background: #f0f7ff; color: #0b68d1; font-weight: 800; font-size: 24px; letter-spacing: 2px; padding: 12px 40px; border-radius: 10px; border: 2px solid #d7e9ff;">
                  ${codigo}
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 24px 18px 24px; font-size: 13px; color: #6b7280;">
                Si no solicitaste este código, puedes ignorar este mensaje.
              </td>
            </tr>
            <tr>
              <td style="padding: 15px 24px; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb;">
                ESAP - Escuela Superior de Administración Pública
              </td>
            </tr>
          </table>
        </div>
      `,
    };

    await this.mailTransporter.sendMail(mailOptions);
    this.logger.log(`Código de validación enviado a ${destinatario}`);
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
    const request = this.requestRepo.create(data);
    return await this.requestRepo.save(request);
  }

  async updateSolicitud(id: string, data: Partial<CertificateRequest>) {
    await this.requestRepo.update(id, data);
    return await this.findSolicitudById(id);
  }

  // ============================================
  // CERTIFICATES
  // ============================================

  async findAllCertificados() {
    const certificates = await this.certificateRepo.find({
      order: { issue_date: 'DESC' },
    });

    // Agregar el conteo de validaciones para cada certificado
    const certificatesWithCount = await Promise.all(
      certificates.map(async (cert) => {
        const validationCount = await this.validationRepo.count({
          where: { certificate_id: cert.id },
        });
        return {
          ...cert,
          validation_count: validationCount,
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
  }) {
    const safePage = Math.max(params.page || 1, 1);
    const safeLimit = Math.min(Math.max(params.limit || 10, 1), 10);
    const skip = (safePage - 1) * safeLimit;

    const qb = this.certificateRepo.createQueryBuilder('cert');

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

    qb.orderBy('cert.issue_date', 'DESC');

    const [certificates, total] = await qb.skip(skip).take(safeLimit).getManyAndCount();

    const certificatesWithCount = await Promise.all(
      certificates.map(async (cert) => {
        const validationCount = await this.validationRepo.count({
          where: { certificate_id: cert.id },
        });
        return {
          ...cert,
          validation_count: validationCount,
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
      salary_text: request.salary_text,
      department: request.department,
      campus: request.campus,
      issue_date: new Date(),
      issuance_timestamp: new Date(),
      signer_name: signer.full_name,
      signer_position: signer.position,
      signer_department: signer.department,
      status: 'VALID',
    });

    const saved = await this.certificateRepo.save(certificate);

    // Update request status
    await this.updateSolicitud(request.id, { status: 'COMPLETED' });

    return saved;
  }

  // ============================================
  // VALIDATIONS
  // ============================================

  private mapValidationToDTO(validation: CertificateValidation) {
    const ua = (validation.user_agent || '').toLowerCase();
    const isMobile = ua.includes('mobile') || ua.includes('android') || ua.includes('iphone');
    const isTablet = ua.includes('ipad') || ua.includes('tablet');
    const deviceType = isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop';

    let sistemaOperativo = 'Desconocido';
    if (ua.includes('windows')) sistemaOperativo = 'Windows';
    else if (ua.includes('android')) sistemaOperativo = 'Android';
    else if (ua.includes('mac os') || ua.includes('macos')) sistemaOperativo = 'macOS';
    else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) sistemaOperativo = 'iOS';
    else if (ua.includes('linux')) sistemaOperativo = 'Linux';

    let navegador = 'Desconocido';
    if (ua.includes('chrome')) navegador = 'Chrome';
    else if (ua.includes('safari')) navegador = 'Safari';
    else if (ua.includes('firefox')) navegador = 'Firefox';
    else if (ua.includes('edge')) navegador = 'Edge';

    const resultado = (validation.result || 'VALID').toUpperCase();
    const resultadoNormalizado =
      resultado === 'REVOKED' || resultado === 'EXPIRED' || resultado === 'INVALID'
        ? 'fallida'
        : 'exitosa';

    const ciudad = validation.city || validation.location || 'Desconocido';
    const pais = validation.country || 'Desconocido';

    return {
      id: validation.id,
      timestamp: validation.validation_date,
      resultado: resultadoNormalizado,
      dispositivo: {
        tipo: deviceType,
        sistemaOperativo,
        navegador,
        version: '',
      },
      ubicacion: {
        ip: validation.ip_address || '0.0.0.0',
        pais,
        ciudad,
        latitud: validation.latitude ?? undefined,
        longitud: validation.longitude ?? undefined,
        proveedor: validation.isp || undefined,
      },
      detalles: validation.result,
    };
  }

  private normalizeIp(ip?: string): string | null {
    if (!ip) return null;
    const trimmed = ip.split(',')[0]?.trim();
    if (!trimmed) return null;
    let normalized = trimmed;

    if (normalized.startsWith('[') && normalized.includes(']')) {
      normalized = normalized.slice(1, normalized.indexOf(']'));
    }

    normalized = normalized.replace(/^::ffff:/i, '');

    if (/^\\d+\\.\\d+\\.\\d+\\.\\d+:\\d+$/.test(normalized)) {
      normalized = normalized.split(':')[0];
    }

    return normalized || null;
  }

  private isPrivateIp(ip: string): boolean {
    if (!ip) return true;
    const lower = ip.toLowerCase();
    if (lower === '::1' || lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe80')) {
      return true;
    }

    const parts = ip.split('.').map((part) => Number(part));
    if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
      return false;
    }

    const [a, b] = parts;
    if (a === 10 || a === 127) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;

    return false;
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
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);
      const response = await fetch(`https://ipwho.is/${encodeURIComponent(normalizedIp)}`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) return null;
      const data = await response.json();
      if (!data || data.success === false) return null;

      return {
        city: data.city || undefined,
        region: data.region || undefined,
        country: data.country || undefined,
        latitude: typeof data.latitude === 'number' ? data.latitude : undefined,
        longitude: typeof data.longitude === 'number' ? data.longitude : undefined,
        isp: data.connection?.isp || undefined,
      };
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
        if (!validation.city && !validation.country && validation.ip_address) {
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
        : geo?.city || geo?.country || undefined;

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

    // Formatear fecha de vinculacion
    const fechaVinculacion = this.certificateGenerator.formatFechaTexto(
      new Date(certificado.hiring_date),
    );

    // Formatear fecha de expedicion
    const fechaExpedicion = this.certificateGenerator.formatFechaTexto(
      new Date(certificado.issue_date),
    );

    // Formatear salario
    const salarioNumero = `($${certificado.monthly_salary.toLocaleString('es-CO')})`;
    const salarioTexto = this.certificateGenerator.numeroATexto(certificado.monthly_salary);

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
    const solicitud = await this.requestRepo.findOne({
      where: { id_number: documento },
    });

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
    // Buscar la solicitud
    const solicitud = await this.requestRepo.findOne({
      where: { id_number: documento },
    });

    if (!solicitud) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    // Validar codigo y vigencia
    if (!solicitud.validation_code || !solicitud.validation_expires_at) {
      throw new BadRequestException('No se ha generado un codigo de validacion para esta solicitud');
    }

    if (solicitud.validation_code !== codigo) {
      throw new BadRequestException('Codigo de validacion incorrecto');
    }

    if (new Date(solicitud.validation_expires_at) < new Date()) {
      throw new BadRequestException('El codigo de validacion ha expirado. Solicita uno nuevo.');
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

