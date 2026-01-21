import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Raw, Repository } from 'typeorm';
import { Graduate } from './graduate.entity';
import { GraduationCertificateRequest } from './graduation-certificate-request.entity';
import { GraduationCertificate } from './graduation-certificate.entity';
import { CertificateValidation } from './certificate-validation.entity';
import { CertificateDownload } from './certificate-download.entity';
import { Signer } from './signer.entity';
import { PdfGeneratorService } from './pdf-generator.service';
import { LandingCertificateRequestDto } from './dto/landing-certificate-request.dto';
import { ApproveRequestDto } from './dto/approve-request.dto';
import { UpdateGraduateDto } from './dto/update-graduate.dto';
import { UpdateCertificateDto } from './dto/update-certificate.dto';
import * as nodemailer from 'nodemailer';
import * as geoip from 'geoip-lite';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

@Injectable()
export class GraduationCertificatesService {
  constructor(
    @InjectRepository(Graduate)
    private graduateRepository: Repository<Graduate>,
    @InjectRepository(GraduationCertificateRequest)
    private requestRepository: Repository<GraduationCertificateRequest>,
    @InjectRepository(GraduationCertificate)
    private certificateRepository: Repository<GraduationCertificate>,
    @InjectRepository(CertificateValidation)
    private validationRepository: Repository<CertificateValidation>,
    @InjectRepository(CertificateDownload)
    private downloadRepository: Repository<CertificateDownload>,
    @InjectRepository(Signer)
    private signerRepository: Repository<Signer>,
    private pdfGeneratorService: PdfGeneratorService,
  ) {}

  private readonly logger = new Logger(GraduationCertificatesService.name);
  private mailTransporter: nodemailer.Transporter | null = null;

  private resolveNotificationsBaseUrl() {
    const direct =
      process.env.NOTIFICATIONS_SERVICE_URL || process.env.NOTIFICATION_SERVICE_URL;
    if (direct) {
      return direct.replace(/\/$/, '');
    }
    if (process.env.NODE_ENV !== 'production') {
      return 'http://localhost:3009';
    }
    return 'http://notifications-service:3009';
  }

  /**
   * AUTOSERVICIO: Verificar si un graduado existe en la base de datos
   */
  async verificarGraduado(
    idNumber: string,
    idIssueDate?: string,
    graduationDate?: string,
    lastName?: string,
  ) {
    const normalizedIdNumber = (idNumber || '').replace(/\D+/g, '');
    const issueDate = idIssueDate ? this.normalizeDateString(idIssueDate) : null;
    const gradDate = graduationDate ? this.normalizeDateString(graduationDate) : null;
    if (idIssueDate && !issueDate) {
      throw new BadRequestException('Fecha de expedici?n inv?lida');
    }
    if (graduationDate && !gradDate) {
      throw new BadRequestException('Fecha de graduaci?n inv?lida');
    }

    const where: any = {
      status: 'ACTIVE',
    };

    if (normalizedIdNumber) {
      where.idNumber = Raw(
        (alias) => `REPLACE(REPLACE(REPLACE(${alias}, '.', ''), '-', ''), ' ', '') = :idNumber`,
        { idNumber: normalizedIdNumber },
      );
    } else {
      where.idNumber = idNumber.trim();
    }

    const lastNameNormalized = lastName ? this.normalizeName(lastName) : '';
    const graduate = await this.findGraduateMatch(where, {
      lastNameNormalized,
      issueDate,
      gradDate,
    });

    if (!graduate) {
      return {
        existe: false,
        mensaje: 'No se encontr? un graduado con esos datos',
      };
    }

    return {
      existe: true,
      graduado: graduate,
      mensaje: 'Graduado encontrado',
    };
  }

  /**
   * AUTOSERVICIO: Generar código de validación
   */
  async generarCodigoValidacion(
    idNumber: string,
    idIssueDate?: string,
    graduationDate?: string,
    lastName?: string,
  ) {
    // Verificar que el graduado existe
    const verificacion = await this.verificarGraduado(
      idNumber,
      idIssueDate,
      graduationDate,
      lastName,
    );
    if (!verificacion.existe) {
      throw new NotFoundException('No se encontró un graduado con esos datos');
    }

    const graduate = verificacion.graduado;

    if (!graduate) {
      throw new NotFoundException('Graduado no encontrado');
    }

    // Generar código de 6 dígitos
    const validationCode = Math.floor(
      100000 + Math.random() * 900000,
    ).toString();

    // Calcular expiración (5 minutos)
    const validationExpiresAt = new Date();
    validationExpiresAt.setMinutes(validationExpiresAt.getMinutes() + 5);

    // Generar número de solicitud único
    const requestNumber = await this.generateRequestNumber();

    // Crear solicitud
    const request = this.requestRepository.create({
      requestNumber,
      requesterType: 'GRADUATE',
      graduateId: graduate.id,
      idNumber: graduate.idNumber,
      idIssueDate: graduate.idIssueDate,
      fullName: graduate.fullName,
      programName: graduate.programName,
      graduationDate: graduate.graduationDate,
      requesterName: graduate.fullName,
      requesterEmail: graduate.email,
      requesterPhone: graduate.phone,
      certificateType: 'STANDARD',
      validationCode,
      validationExpiresAt,
      isValidated: false,
      status: 'PENDING',
    });

    await this.requestRepository.save(request);

    // TODO: Enviar email con código de validación
    // await this.emailService.sendValidationCode(graduate.email, validationCode);

    return {
      mensaje: 'Código de validación enviado exitosamente',
      email: graduate.email,
      codigoTest:
        process.env.NODE_ENV === 'development' ? validationCode : undefined,
    };
  }

  /**
   * AUTOSERVICIO: Procesar la solicitud enviada desde la landing
   */
  async solicitarCertificadoLanding(
    dto: LandingCertificateRequestDto,
    frontendBaseUrl?: string,
  ) {
    const normalizedIdNumber = (dto.idNumber || '').replace(/\D+/g, '');
    const issueDate = dto.idIssueDate ? this.normalizeDateString(dto.idIssueDate) : null;
    const gradDate = dto.graduationDate ? this.normalizeDateString(dto.graduationDate) : null;
    const lastNameNormalized = dto.lastName ? this.normalizeName(dto.lastName) : '';
    const requesterName = (dto.requesterName || '').trim();
    const requesterEmail = (dto.requesterEmail || '').trim();

    if (dto.idIssueDate && !issueDate) {
      throw new BadRequestException('Fecha de expedici?n inv?lida');
    }
    if (dto.graduationDate && !gradDate) {
      throw new BadRequestException('Fecha de graduaci?n inv?lida');
    }

    this.logger.debug(
      `Solicitud landing: idNumber=${dto.idNumber?.trim()} idIssueDate=${dto.idIssueDate || 'N/A'} normalizada=${issueDate || 'N/A'}`,
    );

    const where: any = {
      status: 'ACTIVE',
    };

    if (normalizedIdNumber) {
      where.idNumber = Raw(
        (alias) => `REPLACE(REPLACE(REPLACE(${alias}, '.', ''), '-', ''), ' ', '') = :idNumber`,
        { idNumber: normalizedIdNumber },
      );
    } else {
      where.idNumber = dto.idNumber.trim();
    }

    const graduate = await this.findGraduateMatch(where, {
      lastNameNormalized,
      issueDate,
      gradDate,
    });

    if (!graduate) {
      this.logger.warn(
        `Graduado no encontrado para idNumber=${dto.idNumber?.trim()} idIssueDate=${issueDate || 'N/A'}`,
      );
    }

    const requestNumber = await this.generateRequestNumber();
    const parsedIssueDate = dto.idIssueDate ? this.parseDate(dto.idIssueDate) : undefined;
    const idIssueDate = graduate?.idIssueDate ?? parsedIssueDate ?? undefined;

    const requestPayload: DeepPartial<GraduationCertificateRequest> = {
      requestNumber,
      requesterType: this.normalizeRequesterType(dto.requesterType),
      graduateId: graduate?.id,
      idNumber: dto.idNumber,
      idIssueDate,
      fullName: graduate?.fullName || requesterName || dto.requesterName,
      programName: graduate?.programName || dto.programName || 'No disponible',
      graduationDate:
        graduate?.graduationDate ||
        this.parseDate(dto.graduationDate) ||
        new Date(),
      requesterName: requesterName || dto.requesterName,
      requesterEmail: requesterEmail || dto.requesterEmail,
      requesterPhone: dto.requesterPhone,
      companyName: dto.companyName,
      certificateType: 'STANDARD',
      validationCode: undefined,
      validationExpiresAt: undefined,
      isValidated: false,
      status: graduate ? 'PROCESSING' : 'PENDING',
      manualReview: !graduate,
      observations: graduate
        ? 'Solicitud automática desde la landing de certificados'
        : 'Solicitud de revisión manual: graduado no localizado',
    };

    const request = this.requestRepository.create(requestPayload);

    await this.requestRepository.save(request);

    if (!graduate) {
      return {
        existe: false,
        mensaje:
          'No encontramos un graduado activo con esos datos. Se creó la solicitud para revisión manual (48-72h).',
      };
    }

    request.graduate = graduate;
    request.isValidated = true;
    request.validationDate = new Date();
    request.validationExpiresAt = new Date();
    request.status = 'VALIDATED';
    await this.requestRepository.save(request);

    const certificate = await this.generateCertificate(request);

    request.status = 'COMPLETED';
    request.completionDate = new Date();
    await this.requestRepository.save(request);

    try {
      await this.notifyCertificateDelivery(
        requesterEmail || dto.requesterEmail,
        certificate,
        frontendBaseUrl,
      );
    } catch (error) {
      this.logger.warn(
        `Certificado generado, pero no se pudo enviar el email para solicitud ${request.requestNumber}: ${error?.message || error}`,
      );
    }

    return {
      existe: true,
      mensaje: `Certificado generado y enviado a ${dto.requesterEmail}`,
      certificado: certificate,
    };
  }

  /**
   * AUTOSERVICIO: Validar código y generar certificado
   */
  async validarCodigoYGenerarCertificado(
    idNumber: string,
    idIssueDate: string | undefined,
    codigo: string,
  ) {
    // Buscar solicitud pendiente
    const request = await this.requestRepository.findOne({
      where: {
        idNumber,
        validationCode: codigo,
        status: 'PENDING',
      },
      relations: ['graduate'],
    });

    if (!request) {
      throw new BadRequestException(
        'Código inválido o solicitud no encontrada',
      );
    }

    // Verificar que el código no ha expirado
    if (new Date() > request.validationExpiresAt) {
      throw new BadRequestException('El código de validación ha expirado');
    }

    // Marcar como validado
    request.isValidated = true;
    request.validationDate = new Date();
    request.status = 'VALIDATED';
    await this.requestRepository.save(request);

    // Generar certificado
    const certificate = await this.generateCertificate(request);

    // Marcar solicitud como completada
    request.status = 'COMPLETED';
    request.completionDate = new Date();
    await this.requestRepository.save(request);

    return {
      mensaje: 'Certificado generado exitosamente',
      certificado: certificate,
    };
  }

  /**
   * Generar certificado de graduado
   */
  private async generateCertificate(
    request: GraduationCertificateRequest,
    frontendBaseUrl?: string,
  ) {
    const graduate = request.graduate;

    // Obtener firmante principal
    const signer = await this.signerRepository.findOne({
      where: { isPrimary: true, isActive: true },
    });

    if (!signer) {
      throw new NotFoundException('No se encontro un firmante activo');
    }

    const requestExtras = request as {
      programType?: string;
      degreeTitle?: string;
      campus?: string;
      seccionalName?: string;
      diplomaNumber?: string;
      actaNumber?: string;
    };

    // Generar numero de certificado unico
    const certificateNumber = await this.generateCertificateNumber();

    // Generar codigo de verificacion unico (QR)
    const verificationCode = await this.generateVerificationCode();

    const diplomaNumber =
      graduate?.diplomaNumber ||
      requestExtras.diplomaNumber ||
      (await this.generateDiplomaNumber());
    const actaNumber =
      graduate?.actaNumber ||
      requestExtras.actaNumber ||
      (await this.generateActaNumber());

    // Crear certificado
    const certificate = this.certificateRepository.create({
      requestId: request.id,
      graduateId: graduate?.id,
      certificateNumber,
      verificationCode,
      fullName: request.fullName,
      idNumber: request.idNumber,
      programName: request.programName,
      programType: graduate?.programType || requestExtras.programType || 'Pregrado',
      degreeTitle: graduate?.degreeTitle || requestExtras.degreeTitle || request.programName,
      graduationDate: request.graduationDate,
      diplomaNumber,
      actaNumber,
      campus: graduate?.campus || requestExtras.campus,
      seccionalName: graduate?.seccionalName || requestExtras.seccionalName,
      signerName: signer.fullName,
      signerPosition: signer.position,
      signatureUrl: signer.signatureUrl,
      status: 'VALID',
      issueDate: new Date(),
      createdBy: 'SYSTEM',
    });

    await this.certificateRepository.save(certificate);

    if (graduate && (!graduate.diplomaNumber || !graduate.actaNumber)) {
      const updates: Partial<Graduate> = {};
      if (!graduate.diplomaNumber) updates.diplomaNumber = diplomaNumber;
      if (!graduate.actaNumber) updates.actaNumber = actaNumber;
      Object.assign(graduate, updates);
      await this.graduateRepository.save(graduate);
    }

    // Generar PDF del certificado
    try {
      const pdfBuffer =
        await this.pdfGeneratorService.generateCertificatePDF(certificate, frontendBaseUrl);
      // Guardar el PDF en el sistema de archivos o S3
      const storagePath =
        process.env.STORAGE_PATH || './uploads/graduation-certificates';
      const fs = require('fs');
      const path = require('path');

      // Crear directorio si no existe
      if (!fs.existsSync(storagePath)) {
        fs.mkdirSync(storagePath, { recursive: true });
      }

      const pdfFileName = `${certificate.certificateNumber}.pdf`;
      const pdfFilePath = path.join(storagePath, pdfFileName);

      fs.writeFileSync(pdfFilePath, pdfBuffer);

      // Actualizar certificado con la ruta del PDF
      certificate.pdfFilename = pdfFileName;
      certificate.pdfUrl = `/uploads/graduation-certificates/${pdfFileName}`;
      await this.certificateRepository.save(certificate);
    } catch (error) {
      console.error('Error generando PDF:', error);
      // No lanzar error, el certificado ya esta creado
    }

    return certificate;
  }

  /**
   * Obtener PDF de un certificado
   */
  async getCertificatePDF(id: string, frontendBaseUrl?: string): Promise<Buffer> {
    const certificate = await this.certificateRepository.findOne({
      where: { id },
    });

    if (!certificate) {
      throw new NotFoundException('Certificado no encontrado');
    }

    const pdfFilename =
      certificate.pdfFilename ||
      (certificate.pdfUrl ? path.basename(certificate.pdfUrl) : undefined);

    if (pdfFilename) {
      // Leer PDF del sistema de archivos si ya existe
      const pdfFilePath = this.resolveExistingPdfPath(pdfFilename);
      if (pdfFilePath) {
        return fs.readFileSync(pdfFilePath);
      }

      this.logger.warn(
        `PDF no encontrado en disco para certificado ${certificate.id} (filename=${pdfFilename})`,
      );
    }

    // Si no existe el PDF, generarlo en tiempo real
    try {
      return await this.pdfGeneratorService.generateCertificatePDF(
        certificate,
        frontendBaseUrl,
      );
    } catch (error) {
      this.logger.error(
        `Error generando PDF en tiempo real para certificado ${certificate.id}`,
        error instanceof Error ? error.stack : `${error}`,
      );
      throw new InternalServerErrorException(
        'No se pudo generar el PDF del certificado',
      );
    }
  }


  /**
   * ADMIN: Reenviar certificado por email al solicitante
   */
  async reenviarCertificado(id: string, frontendBaseUrl?: string) {
    const certificate = await this.certificateRepository.findOne({
      where: { id },
      relations: ['request'],
    });

    if (!certificate) {
      throw new NotFoundException('Certificado no encontrado');
    }

    let requesterEmail: string | undefined = certificate.request?.requesterEmail;
    if (!requesterEmail) {
      const request = await this.requestRepository.findOne({
        where: { id: certificate.requestId },
      });
      requesterEmail = request?.requesterEmail;
    }

    if (!requesterEmail) {
      throw new BadRequestException('No hay un email de solicitante asociado');
    }

    await this.sendCertificateEmail(requesterEmail, certificate, frontendBaseUrl);

    return {
      mensaje: `Certificado reenviado a ${requesterEmail}`,
      email: requesterEmail,
    };
  }

  /**
   * VALIDACIÓN PÚBLICA: Validar certificado por código QR
   */
  async validarPorQR(
    verificationCode: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const certificate = await this.certificateRepository.findOne({
      where: { verificationCode },
    });

    let result: string;
    let valid = false;

    if (!certificate) {
      result = 'NOT_FOUND';
    } else if (certificate.status === 'REVOKED') {
      result = 'REVOKED';
    } else if (certificate.status === 'EXPIRED') {
      result = 'EXPIRED';
    } else {
      result = 'VALID';
      valid = true;
    }

    // Registrar validación
    if (certificate) {
      const location = this.resolveLocation(ipAddress) ?? undefined;
      const validation = this.validationRepository.create({
        certificateId: certificate.id,
        ipAddress,
        userAgent,
        location,
        result,
      });
      await this.validationRepository.save(validation);
    }

    return {
      valido: valid,
      certificado: certificate,
      mensaje: this.getValidationMessage(result),
      resultado: result,
    };
  }

  /**
   * VALIDACIÓN PÚBLICA: Validar certificado por número
   */
  async validarPorNumero(
    certificateNumber: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const certificate = await this.certificateRepository.findOne({
      where: { certificateNumber },
    });

    let result: string;
    let valid = false;

    if (!certificate) {
      result = 'NOT_FOUND';
    } else if (certificate.status === 'REVOKED') {
      result = 'REVOKED';
    } else if (certificate.status === 'EXPIRED') {
      result = 'EXPIRED';
    } else {
      result = 'VALID';
      valid = true;
    }

    // Registrar validación
    if (certificate) {
      const location = this.resolveLocation(ipAddress) ?? undefined;
      const validation = this.validationRepository.create({
        certificateId: certificate.id,
        ipAddress,
        userAgent,
        location,
        result,
      });
      await this.validationRepository.save(validation);
    }

    return {
      valido: valid,
      certificado: certificate,
      mensaje: this.getValidationMessage(result),
      resultado: result,
    };
  }

  /**
   * Utilidades privadas
   */
  private async generateRequestNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.requestRepository.count();
    const sequence = (count + 1).toString().padStart(4, '0');
    return `GC-${year}-${sequence}`;
  }
  private async generateCertificateNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.certificateRepository.count();
    const sequence = (count + 1).toString().padStart(4, '0');
    return `CERT-GR-${year}-${sequence}`;
  }

  private async generateDiplomaNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.certificateRepository.count();
    const sequence = (count + 1).toString().padStart(6, '0');
    return `DIPL-${year}-${sequence}`;
  }

  private async generateActaNumber(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const count = await this.certificateRepository.count();
    const sequence = (count + 1).toString().padStart(3, '0');
    return `ACTA-${year}-${month}-${sequence}`;
  }

  private async generateVerificationCode(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.certificateRepository.count();
    const sequence = (count + 1).toString().padStart(4, '0');
    const random = Math.random().toString(36).substring(2, 12);
    return `QR-GR-${year}-${sequence}-${random}`;
  }

  private getValidationMessage(result: string): string {
    const messages = {
      VALID: 'El certificado es válido y auténtico',
      REVOKED: 'El certificado ha sido revocado y no tiene validez',
      EXPIRED: 'El certificado ha expirado',
      NOT_FOUND: 'No se encontró el certificado',
    };
    return messages[result] || 'Estado desconocido';
  }

  private normalizeName(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private async findGraduateMatch(
    where: Record<string, any>,
    options: {
      lastNameNormalized?: string;
      issueDate?: string | null;
      gradDate?: string | null;
    },
  ): Promise<Graduate | null> {
    const graduates = await this.graduateRepository.find({ where });
    if (!graduates.length) {
      return null;
    }
    let candidates = graduates;

    if (options.lastNameNormalized) {
      const lastNameMatches = candidates.filter((graduate) =>
        this.matchesLastName(graduate.fullName, options.lastNameNormalized || ''),
      );
      if (!lastNameMatches.length) {
        return null;
      }
      candidates = lastNameMatches;
    }

    if (options.gradDate) {
      const gradDateMatches = candidates.filter(
        (graduate) =>
          this.normalizeDateString(graduate.graduationDate) === options.gradDate,
      );
      if (!gradDateMatches.length) {
        return null;
      }
      candidates = gradDateMatches;
    }

    const scored = candidates.map((graduate) => {
      let score = 0;
      if (
        options.issueDate &&
        this.normalizeDateString(graduate.idIssueDate) === options.issueDate
      ) {
        score += 1;
      }
      if (
        options.gradDate &&
        this.normalizeDateString(graduate.graduationDate) === options.gradDate
      ) {
        score += 1;
      }
      return { graduate, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0]?.graduate || candidates[0] || null;
  }

  private matchesLastName(fullName: string, lastNameNormalized: string): boolean {
    if (!lastNameNormalized) return true;
    const normalizedFullName = this.normalizeName(fullName);
    return normalizedFullName.includes(lastNameNormalized);
  }

  private normalizeRequesterType(input?: string): 'GRADUATE' | 'COMPANY' {
    if (input && input.toUpperCase() === 'COMPANY') {
      return 'COMPANY';
    }
    return 'GRADUATE';
  }

  private notifyCertificateDelivery(
    email: string,
    certificate: GraduationCertificate,
    frontendBaseUrl?: string,
  ): Promise<void> {
    return this.sendCertificateEmail(email, certificate, frontendBaseUrl);
  }

  private getMailTransporter() {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) {
      this.logger.warn(
        'SMTP no configurado, no se envía email. Variables requeridas: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM',
      );
      return null;
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

    return this.mailTransporter;
  }

  private async resolveCertificatePdf(
    certificate: GraduationCertificate,
    frontendBaseUrl?: string,
  ) {
    if (frontendBaseUrl) {
      const buffer =
        await this.pdfGeneratorService.generateCertificatePDF(
          certificate,
          frontendBaseUrl,
        );
      return {
        filename: `${certificate.certificateNumber}.pdf`,
        content: buffer,
      };
    }

    if (certificate.pdfFilename) {
      const storagePath =
        process.env.STORAGE_PATH || './uploads/graduation-certificates';
      const pdfFilePath = path.join(storagePath, certificate.pdfFilename);
      if (fs.existsSync(pdfFilePath)) {
        return {
          filename: certificate.pdfFilename,
          content: fs.readFileSync(pdfFilePath),
        };
      }
    }

    const buffer =
      await this.pdfGeneratorService.generateCertificatePDF(certificate);
    return {
      filename: `${certificate.certificateNumber}.pdf`,
      content: buffer,
    };
  }

  private async sendCertificateEmail(
    email: string,
    certificate: GraduationCertificate,
    frontendBaseUrl?: string,
  ): Promise<void> {
    this.logger.log(
      `Preparando reenvio del certificado ${certificate.certificateNumber} a ${email}`,
    );

    if (!email) {
      this.logger.warn('No se pudo enviar el certificado: email vacio');
      return;
    }

    const baseUrl = this.resolveNotificationsBaseUrl();
    const url = `${baseUrl}/api/v1/emails/send-with-attachment`;

    const validationUrl = `${
      frontendBaseUrl ||
      process.env.FRONTEND_URL ||
      'https://certificados.esap.edu.co'
    }/verificar-certificado/${certificate.verificationCode}`;

    const attachment = await this.resolveCertificatePdf(
      certificate,
      frontendBaseUrl,
    );
    const payload = {
      to: email,
      subject: `Certificado de verificacion de titulo - ${certificate.certificateNumber}`,
      text: `Adjunto encontraras el certificado de verificacion de titulo solicitado.\n\nCodigo de verificacion: ${certificate.verificationCode}\nURL de validacion: ${validationUrl}`,
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
                Certificado de verificacion de titulo
              </td>
            </tr>
            <tr>
              <td style="padding: 0 24px 12px 24px; font-size: 14px; color: #4b5563; line-height: 1.6;">
                Adjunto encontraras el certificado de verificacion de titulo solicitado.
              </td>
            </tr>
            <tr>
              <td style="padding: 0 24px 12px 24px; font-size: 14px; color: #4b5563;">
                <strong>Codigo de verificacion:</strong> ${certificate.verificationCode}
              </td>
            </tr>
            <tr>
              <td style="padding: 0 24px 18px 24px; font-size: 14px; color: #4b5563;">
                <strong>URL de validacion:</strong> <a href="${validationUrl}" style="color: #0b68d1;">${validationUrl}</a>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 24px 18px 24px; font-size: 13px; color: #6b7280;">
                Archivo adjunto: <strong>${attachment.filename}</strong>
              </td>
            </tr>
            <tr>
              <td style="padding: 15px 24px; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb;">
                ESAP - Escuela Superior de Administracion Publica
              </td>
            </tr>
          </table>
        </div>
      `,
      attachmentName: attachment.filename,
      attachmentBase64: attachment.content.toString('base64'),
      attachmentContentType: 'application/pdf',
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      this.logger.warn(
        `No se pudo enviar el certificado por email: ${response.status} ${errorBody}`,
      );
      throw new Error(
        `Notifications service error (${response.status}): ${errorBody || 'sin detalle'}`,
      );
    }

    this.logger.log(`Certificado enviado a ${email}`);
  }

  private normalizeDateString(value?: string | Date): string | null {
    if (!value) {
      return null;
    }
    if (value instanceof Date) {
      return value.toISOString().slice(0, 10);
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      return trimmed;
    }

    if (trimmed.includes('/')) {
      const [dayRaw, monthRaw, yearRaw] = trimmed
        .split('/')
        .map((segment) => segment.trim());
      if (!dayRaw || !monthRaw || !yearRaw) {
        return null;
      }
      const day = Number(dayRaw);
      const month = Number(monthRaw) - 1;
      const year = Number(yearRaw);
      const parsed = new Date(year, month, day, 12, 0, 0);
      if (isNaN(parsed.getTime())) {
        return null;
      }
      return parsed.toISOString().slice(0, 10);
    }

    const parsed = new Date(trimmed);
    if (isNaN(parsed.getTime())) {
      return null;
    }

    return parsed.toISOString().slice(0, 10);
  }

  private parseDate(value?: string | Date): Date | null {
    if (!value) {
      return null;
    }
    if (value instanceof Date) {
      return value;
    }

    const normalized = this.normalizeDateString(value);
    if (!normalized) {
      return null;
    }

    const [yearRaw, monthRaw, dayRaw] = normalized.split('-');
    const year = Number(yearRaw);
    const month = Number(monthRaw) - 1;
    const day = Number(dayRaw);
    const parsed = new Date(year, month, day, 12, 0, 0);
    if (isNaN(parsed.getTime())) {
      return null;
    }

    return parsed;
  }

  /**
   * ADMIN: Listar todos los graduados
   */
  async listarGraduados() {
    return await this.graduateRepository.find({
      order: { graduationDate: 'DESC' },
    });
  }

  /**
   * ADMIN: Obtener un graduado por ID
   */
  async obtenerGraduado(id: string) {
    const graduate = await this.graduateRepository.findOne({ where: { id } });
    if (!graduate) {
      throw new NotFoundException('Graduado no encontrado');
    }
    return graduate;
  }

  /**
   * ADMIN: Buscar graduado por cédula
   */
  async buscarGraduadoPorCedula(idNumber: string) {
    const graduate = await this.graduateRepository.findOne({
      where: { idNumber: idNumber.trim() },
    });
    if (!graduate) {
      throw new NotFoundException('Graduado no encontrado');
    }
    return graduate;
  }

  /**
   * ADMIN: Actualizar graduado
   */
  async actualizarGraduado(id: string, payload: UpdateGraduateDto) {
    const graduate = await this.graduateRepository.findOne({ where: { id } });
    if (!graduate) {
      throw new NotFoundException('Graduado no encontrado');
    }

    const update: Partial<Graduate> = {};
    if (payload.fullName !== undefined) {
      update.fullName = payload.fullName.trim();
    }
    if (payload.idNumber !== undefined) {
      update.idNumber = payload.idNumber.trim();
    }
    if (payload.email !== undefined) {
      update.email = payload.email;
    }
    if (payload.phone !== undefined) {
      update.phone = payload.phone;
    }
    if (payload.programId !== undefined) {
      update.programId = payload.programId;
    }
    if (payload.programName !== undefined) {
      update.programName = payload.programName;
    }
    if (payload.programType !== undefined) {
      update.programType = payload.programType;
    }
    if (payload.degreeTitle !== undefined) {
      update.degreeTitle = payload.degreeTitle;
    }
    if (payload.diplomaNumber !== undefined) {
      update.diplomaNumber = payload.diplomaNumber;
    }
    if (payload.actaNumber !== undefined) {
      update.actaNumber = payload.actaNumber;
    }
    if (payload.resolutionNumber !== undefined) {
      update.resolutionNumber = payload.resolutionNumber;
    }
    if (payload.status !== undefined) {
      update.status = payload.status;
    }
    if (payload.isVerified !== undefined) {
      update.isVerified = payload.isVerified;
    }
    if (payload.campus !== undefined) {
      update.campus = payload.campus;
    }
    if (payload.idIssueDate !== undefined) {
      update.idIssueDate = this.parseDate(payload.idIssueDate) ?? graduate.idIssueDate;
    }
    if (payload.enrollmentDate !== undefined) {
      update.enrollmentDate = this.parseDate(payload.enrollmentDate) ?? graduate.enrollmentDate;
    }
    if (payload.graduationDate !== undefined) {
      update.graduationDate = this.parseDate(payload.graduationDate) ?? graduate.graduationDate;
    }
    if (payload.ceremonyDate !== undefined) {
      update.ceremonyDate = this.parseDate(payload.ceremonyDate) ?? graduate.ceremonyDate;
    }
    if (payload.seccionalName !== undefined) {
      update.seccionalName = payload.seccionalName.trim();
    }

    Object.assign(graduate, update);
    return await this.graduateRepository.save(graduate);
  }

  /**
   * ADMIN: Actualizar certificado
   */
  async actualizarCertificado(id: string, payload: UpdateCertificateDto) {
    const certificate = await this.certificateRepository.findOne({
      where: { id },
    });
    if (!certificate) {
      throw new NotFoundException('Certificado no encontrado');
    }

    const update: Partial<GraduationCertificate> = {};
    if (payload.fullName !== undefined) {
      update.fullName = payload.fullName.trim();
    }
    if (payload.idNumber !== undefined) {
      update.idNumber = payload.idNumber.trim();
    }
    if (payload.programName !== undefined) {
      update.programName = payload.programName;
    }
    if (payload.programType !== undefined) {
      update.programType = payload.programType;
    }
    if (payload.degreeTitle !== undefined) {
      update.degreeTitle = payload.degreeTitle;
    }
    if (payload.diplomaNumber !== undefined) {
      update.diplomaNumber = payload.diplomaNumber;
    }
    if (payload.actaNumber !== undefined) {
      update.actaNumber = payload.actaNumber;
    }
    if (payload.campus !== undefined) {
      update.campus = payload.campus;
    }
    if (payload.seccionalName !== undefined) {
      update.seccionalName = payload.seccionalName.trim();
    }
    if (payload.status !== undefined) {
      update.status = payload.status;
    }
    if (payload.graduationDate !== undefined) {
      update.graduationDate =
        this.parseDate(payload.graduationDate) ?? certificate.graduationDate;
    }
    if (payload.issueDate !== undefined) {
      update.issueDate =
        this.parseDate(payload.issueDate) ?? certificate.issueDate;
    }
    if (payload.expiryDate !== undefined) {
      update.expiryDate =
        this.parseDate(payload.expiryDate) ?? certificate.expiryDate;
    }

    Object.assign(certificate, update);
    const saved = await this.certificateRepository.save(certificate);

    if (certificate.requestId) {
      const request = await this.requestRepository.findOne({
        where: { id: certificate.requestId },
      });
      if (request) {
        if (payload.fullName !== undefined) request.fullName = payload.fullName.trim();
        if (payload.idNumber !== undefined) request.idNumber = payload.idNumber.trim();
        if (payload.programName !== undefined) request.programName = payload.programName;
        if (payload.requesterName !== undefined) {
          request.requesterName = payload.requesterName.trim();
        }
        if (payload.requesterEmail !== undefined) {
          request.requesterEmail = payload.requesterEmail.trim();
        }
        if (payload.requesterPhone !== undefined) {
          request.requesterPhone = payload.requesterPhone.trim();
        }
        if (payload.graduationDate !== undefined) {
          request.graduationDate =
            this.parseDate(payload.graduationDate) ?? request.graduationDate;
        }
        await this.requestRepository.save(request);
      }
    }

    return saved;
  }

  /**
   * ADMIN: Listar todas las solicitudes
   */
  async listarSolicitudes() {
    return await this.requestRepository.find({
      relations: ['graduate'],
      order: { requestDate: 'DESC' },
    });
  }

  /**
   * ADMIN: Obtener una solicitud por ID
   */
  async obtenerSolicitud(id: string) {
    const request = await this.requestRepository.findOne({
      where: { id },
      relations: ['graduate'],
    });

    if (!request) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    return request;
  }

  /**
   * ADMIN: Listar solicitudes de revisión manual (graduados no encontrados)
   */
  async listarSolicitudesRevision() {
    return await this.requestRepository.find({
      where: { manualReview: true },
      relations: ['graduate'],
      order: { requestDate: 'DESC' },
    });
  }

  /**
   * ADMIN: Marcar solicitud en revisión
   */
  async marcarEnRevision(
    id: string,
    reviewerName?: string,
    reviewerId?: string,
  ) {
    const request = await this.requestRepository.findOne({
      where: { id },
      relations: ['graduate'],
    });

    if (!request) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    request.status = 'PROCESSING';
    request.reviewerName = reviewerName || request.reviewerName;
    request.reviewedBy = reviewerId || request.reviewedBy;

    return await this.requestRepository.save(request);
  }

  /**
   * ADMIN: Aprobar solicitud y generar certificado
   */
  async aprobarSolicitud(
    id: string,
    payload: ApproveRequestDto,
    frontendBaseUrl?: string,
  ) {
    const request = await this.requestRepository.findOne({
      where: { id },
      relations: ['graduate'],
    });

    if (!request) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    const reviewNotes = (payload?.reviewNotes || 'Aprobado por revision manual').trim();

    if (payload?.fullName) {
      request.fullName = payload.fullName.trim();
    }
    if (payload?.idNumber) {
      request.idNumber = payload.idNumber.trim();
    }
    if (payload?.programName) {
      request.programName = payload.programName;
    }
    if (payload?.graduationDate !== undefined) {
      request.graduationDate =
        this.parseDate(payload.graduationDate) ?? request.graduationDate;
    }
    if (payload?.programType) {
      (request as { programType?: string }).programType = payload.programType;
    }
    if (payload?.degreeTitle) {
      (request as { degreeTitle?: string }).degreeTitle = payload.degreeTitle;
    }
    if (payload?.campus) {
      (request as { campus?: string }).campus = payload.campus;
    }
    if (payload?.seccionalName) {
      (request as { seccionalName?: string }).seccionalName =
        payload.seccionalName.trim();
    }

    const graduate =
      request.graduate ||
      (await this.graduateRepository.findOne({
        where: { idNumber: request.idNumber, status: 'ACTIVE' },
      }));

    if (graduate) {
      const graduateUpdate: Partial<Graduate> = {};
      if (payload?.fullName !== undefined) graduateUpdate.fullName = payload.fullName.trim();
      if (payload?.idNumber !== undefined) graduateUpdate.idNumber = payload.idNumber.trim();
      if (payload?.email !== undefined) graduateUpdate.email = payload.email;
      if (payload?.phone !== undefined) graduateUpdate.phone = payload.phone;
      if (payload?.programName !== undefined) graduateUpdate.programName = payload.programName;
      if (payload?.programType !== undefined) graduateUpdate.programType = payload.programType;
      if (payload?.degreeTitle !== undefined) graduateUpdate.degreeTitle = payload.degreeTitle;
      if (payload?.graduationDate !== undefined) {
        graduateUpdate.graduationDate =
          this.parseDate(payload.graduationDate) ?? graduate.graduationDate;
      }
      if (payload?.campus !== undefined) graduateUpdate.campus = payload.campus;
      if (payload?.seccionalName !== undefined) {
        graduateUpdate.seccionalName = payload.seccionalName.trim();
      }

      if (Object.keys(graduateUpdate).length > 0) {
        Object.assign(graduate, graduateUpdate);
        await this.graduateRepository.save(graduate);
      }

      request.graduate = graduate;
      request.graduateId = graduate.id;
    }

    request.isValidated = true;
    request.validationDate = new Date();
    request.status = 'COMPLETED';
    request.reviewedAt = new Date();
    request.reviewNotes = reviewNotes;
    request.reviewResolution = 'graduate_found';
    request.reviewerName = payload?.reviewerName || request.reviewerName;
    request.reviewedBy = payload?.reviewerId || request.reviewedBy;
    request.completionDate = new Date();

    await this.requestRepository.save(request);

    const certificate = await this.generateCertificate(request);

    const deliveryEmail = request.requesterEmail || payload?.email;
    if (deliveryEmail && !request.requesterEmail) {
      request.requesterEmail = deliveryEmail;
      await this.requestRepository.save(request);
    }

    if (deliveryEmail) {
      try {
        await this.notifyCertificateDelivery(
          deliveryEmail,
          certificate,
          frontendBaseUrl,
        );
      } catch (error) {
        this.logger.warn(
          `Solicitud aprobada, pero no se pudo enviar el email para ${request.requestNumber}: ${error?.message || error}`,
        );
      }
    }

    return {
      request,
      certificate,
    };
  }

  /**
   * ADMIN: Rechazar solicitud de revisión
   */
  async rechazarSolicitud(
    id: string,
    reason: string,
    reviewerName?: string,
    reviewerId?: string,
    frontendBaseUrl?: string,
  ) {
    const request = await this.requestRepository.findOne({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    request.status = 'REJECTED';
    request.reviewedAt = new Date();
    request.reviewNotes = reason;
    request.reviewResolution = 'graduate_not_found';
    request.rejectionReason = reason;
    request.reviewerName = reviewerName || request.reviewerName;
    request.reviewedBy = reviewerId || request.reviewedBy;
    request.completionDate = new Date();

    await this.requestRepository.save(request);

    this.logger.log(
      `Solicitud ${request.requestNumber} rechazada. Notificar a ${request.requesterEmail}`,
    );

    await this.sendRejectionEmail(request, frontendBaseUrl);

    return request;
  }

  private async sendRejectionEmail(
    request: GraduationCertificateRequest,
    frontendBaseUrl?: string,
  ): Promise<void> {
    const email = request.requesterEmail;
    if (!email) {
      this.logger.warn(
        `No se pudo notificar el rechazo para solicitud ${request.requestNumber}: email vacio`,
      );
      return;
    }

    const baseUrl = this.resolveNotificationsBaseUrl();
    const url = `${baseUrl}/api/v1/emails/send`;
    const portalUrl =
      frontendBaseUrl ||
      process.env.FRONTEND_URL ||
      'https://certificados.esap.edu.co';

    const subject = `Solicitud de certificado rechazada - ${request.requestNumber}`;
    const text =
      `Tu solicitud ${request.requestNumber} fue rechazada.\n` +
      (request.rejectionReason
        ? `Motivo: ${request.rejectionReason}\n`
        : '') +
      `Puedes realizar una nueva solicitud en ${portalUrl}.`;

    const html = `
      <div style="font-family: 'Inter', Arial, sans-serif; background: #f5f7fb; padding: 24px; color: #1f2937;">
        <table width="100%" cellspacing="0" cellpadding="0" style="max-width: 520px; border: 1px solid #ef4444; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 25px rgba(0,0,0,0.3);">
          <tr>
            <td style="background: linear-gradient(135deg, #b91c1c 0%, #ef4444 100%); padding: 18px 24px; color: #ffffff; font-weight: 700; font-size: 18px;">
              Certificados ESAP
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 24px 8px 24px; font-size: 16px; font-weight: 600; color: #111827;">
              Solicitud rechazada
            </td>
          </tr>
          <tr>
            <td style="padding: 0 24px 12px 24px; font-size: 14px; color: #4b5563; line-height: 1.6;">
              Tu solicitud <strong>${request.requestNumber}</strong> fue rechazada.
            </td>
          </tr>
          ${
            request.rejectionReason
              ? `<tr><td style="padding: 0 24px 12px 24px; font-size: 14px; color: #4b5563;"><strong>Motivo:</strong> ${request.rejectionReason}</td></tr>`
              : ''
          }
          <tr>
            <td style="padding: 0 24px 18px 24px; font-size: 14px; color: #4b5563;">
              Si deseas intentar de nuevo, puedes hacer una nueva solicitud desde <a href="${portalUrl}" style="color: #0b68d1;">${portalUrl}</a>.
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

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: email,
        subject,
        text,
        html,
      }),
    });

    if (!response.ok) {
      let errorBody = '';
      try {
        errorBody = await response.text();
      } catch (_) {
        errorBody = '';
      }
      this.logger.warn(
        `No se pudo enviar el rechazo por email: ${response.status} ${errorBody}`,
      );
      throw new Error(
        `Notifications service error (${response.status}): ${errorBody || 'sin detalle'}`,
      );
    }

    this.logger.log(`Notificacion de rechazo enviada a ${email}`);
  }

  /**
   * ADMIN: Listar todos los certificados
   */
  async listarCertificados() {
    return await this.certificateRepository.find({
      relations: ['graduate', 'request'],
      order: { issueDate: 'DESC' },
    });
  }

  /**
   * ADMIN: Listar validaciones de certificados (QR)
   */
  async listarValidaciones(certificateId?: string) {
    const where = certificateId ? { certificateId } : {};
    return await this.validationRepository.find({
      where,
      order: { validationDate: 'DESC' },
    });
  }

  /**
   * ADMIN: Listar descargas de certificados
   */
  async listarDescargas(certificateId?: string) {
    const where = certificateId ? { certificateId } : {};
    return await this.downloadRepository.find({
      where,
      order: { downloadDate: 'DESC' },
    });
  }

  /**
   * PUBLICO: Registrar descarga de certificado
   */
  async registrarDescarga(
    certificateId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const certificate = await this.certificateRepository.findOne({
      where: { id: certificateId },
    });

    if (!certificate) {
      throw new NotFoundException('Certificado no encontrado');
    }

    const download = this.downloadRepository.create({
      certificateId,
      ipAddress,
      userAgent,
    });

    await this.downloadRepository.save(download);

    return { mensaje: 'Descarga registrada' };
  }

  private resolveLocation(ipAddress?: string): string | null {
    if (!ipAddress) {
      return null;
    }

    const trimmed = ipAddress.trim().replace(/^::ffff:/, '');

    if (!trimmed || trimmed === '::1' || trimmed === '127.0.0.1') {
      return 'Localhost';
    }

    if (this.isPrivateIpv4(trimmed)) {
      return 'Red privada';
    }

    const geo = geoip.lookup(trimmed);
    if (!geo) {
      return null;
    }

    const parts = [geo.city, geo.region, geo.country].filter(Boolean);
    return parts.length ? parts.join(', ') : null;
  }

  private isPrivateIpv4(ip: string): boolean {
    const octets = ip.split('.').map((part) => Number(part));
    if (octets.length !== 4 || octets.some((value) => Number.isNaN(value))) {
      return false;
    }

    const [a, b] = octets;
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    return false;
  }

  private resolveExistingPdfPath(pdfFilename: string): string | null {
    const storagePath = process.env.STORAGE_PATH;
    const candidates = [
      storagePath ? path.join(storagePath, pdfFilename) : null,
      path.join(process.cwd(), 'uploads', 'graduation-certificates', pdfFilename),
      path.join(
        process.cwd(),
        'backend',
        'academic-registration-service',
        'uploads',
        'graduation-certificates',
        pdfFilename,
      ),
      path.join(
        __dirname,
        '..',
        '..',
        'uploads',
        'graduation-certificates',
        pdfFilename,
      ),
    ].filter((candidate): candidate is string => Boolean(candidate));

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }

    return null;
  }
}









