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
import { GraduateFile } from './graduate-file.entity';
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

type ValidationGeoContext = {
  geoCountry?: string;
  geoRegion?: string;
  geoCity?: string;
  geoTimezone?: string;
};

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
    @InjectRepository(GraduateFile)
    private graduateFileRepository: Repository<GraduateFile>,
    private pdfGeneratorService: PdfGeneratorService,
  ) { }

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
      graduateEmail: graduate.email,
      graduatePhone: graduate.phone,
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
    const graduateLastName = (dto.lastName || '').trim();
    const companyName = (dto.companyName || '').trim();
    const companyNit = (dto.companyNit || '').trim();
    const contactPerson = (dto.contactPerson || '').trim();
    const normalizedRequesterType = this.normalizeRequesterType(dto.requesterType);

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
      requesterType: normalizedRequesterType,
      graduateId: graduate?.id,
      idNumber: dto.idNumber,
      idIssueDate,
      fullName:
        this.getPreferredGraduateFullName(graduate) || requesterName || dto.requesterName,
      graduateLastName: graduateLastName || undefined,
      graduateEmail: graduate?.email,
      graduatePhone: graduate?.phone,
      programName: graduate?.programName || dto.programName || 'No disponible',
      graduationDate:
        graduate?.graduationDate ||
        this.parseDate(dto.graduationDate) ||
        new Date(),
      requesterName: requesterName || dto.requesterName,
      requesterEmail: requesterEmail || dto.requesterEmail,
      requesterPhone: dto.requesterPhone,
      companyName: companyName || dto.companyName,
      companyNit: companyNit || dto.companyNit,
      contactPerson: contactPerson || dto.contactPerson,
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

    if (normalizedRequesterType === 'COMPANY') {
      const graduateEmail = (graduate?.email || request.graduateEmail || '').trim();
      if (!graduateEmail) {
        this.logger.warn(
          `Solicitud ${request.requestNumber}: no se pudo notificar al graduado porque no tiene email registrado`,
        );
      } else {
        try {
          await this.sendGraduateCompanyNotificationEmail({
            graduateEmail,
            graduateName: graduate?.fullName || request.fullName,
            companyName: companyName || request.companyName || requesterName || 'Empresa solicitante',
            companyNit: companyNit || 'No informado',
            contactPerson: contactPerson || 'No informado',
            contactEmail: requesterEmail || dto.requesterEmail,
            requestDate: request.requestDate || new Date(),
            certificateNumber: certificate.certificateNumber,
          });
        } catch (error) {
          this.logger.warn(
            `Solicitud ${request.requestNumber}: no se pudo enviar la notificacion al graduado: ${error?.message || error}`,
          );
        }
      }
    }

    return {
      existe: true,
      mensaje: `Certificado generado y enviado a ${dto.requesterEmail}`,
      certificado: certificate,
    };
  }

  /**
   * AUTOSERVICIO: Consultar empresa por NIT (datos.gov.co)
   */
  async buscarEmpresaPorNit(nit: string) {
    const trimmedNit = (nit || '').trim();
    if (!trimmedNit) {
      throw new BadRequestException('El NIT es obligatorio');
    }

    const normalizedNit = trimmedNit.replace(/\D+/g, '');
    if (!normalizedNit) {
      throw new BadRequestException('El NIT no es válido');
    }

    const baseUrl =
      process.env.DATOS_GOV_COMPANIES_URL ||
      'https://www.datos.gov.co/resource/c82u-588k.json';
    const token = process.env.DATOS_GOV_APP_TOKEN;

    const params = new URLSearchParams();
    params.set(
      '$select',
      'razon_social,numero_identificacion,nit,digito_verificacion',
    );
    params.set('$limit', '1');
    params.set(
      '$where',
      `numero_identificacion='${normalizedNit}' OR nit='${normalizedNit}'`,
    );
    if (token) {
      params.set('$$app_token', token);
    }

    const url = `${baseUrl}?${params.toString()}`;

    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          Accept: 'application/json',
        },
      });
    } catch (error) {
      this.logger.error(
        `Error consultando datos.gov.co para NIT ${normalizedNit}: ${error?.message || error}`,
      );
      throw new InternalServerErrorException(
        'No se pudo consultar la empresa en este momento',
      );
    }

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      this.logger.warn(
        `Consulta datos.gov.co fallida (${response.status}): ${errorBody}`,
      );
      throw new InternalServerErrorException(
        'No se pudo consultar la empresa en este momento',
      );
    }

    const data = (await response.json()) as Array<Record<string, any>>;
    const item = Array.isArray(data) ? data[0] : undefined;

    if (!item || !item.razon_social) {
      return {
        found: false,
        nit: normalizedNit,
      };
    }

    return {
      found: true,
      razonSocial: item.razon_social,
      nit: item.numero_identificacion || item.nit || normalizedNit,
      digitoVerificacion: item.digito_verificacion || '',
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
      requestExtras.diplomaNumber || (await this.generateDiplomaNumber());
    const registroFolioLibro = this.buildRegistroFolioLibro(graduate);
    const actaNumber = registroFolioLibro || requestExtras.actaNumber || 'N/A';

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
      if (!graduate.actaNumber && actaNumber !== 'N/A') {
        updates.actaNumber = actaNumber;
      }
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
      relations: ['graduate'],
    });

    if (!certificate) {
      throw new NotFoundException('Certificado no encontrado');
    }

    let shouldRegenerate = false;
    const registroFolioLibro = this.buildRegistroFolioLibro(certificate.graduate);
    if (registroFolioLibro && certificate.actaNumber !== registroFolioLibro) {
      certificate.actaNumber = registroFolioLibro;
      await this.certificateRepository.save(certificate);
      shouldRegenerate = true;
    }

    const pdfFilename =
      certificate.pdfFilename ||
      (certificate.pdfUrl ? path.basename(certificate.pdfUrl) : undefined);

    if (pdfFilename && !shouldRegenerate && !frontendBaseUrl) {
      // Leer PDF del sistema de archivos si ya existe
      const pdfFilePath = this.resolveExistingPdfPath(pdfFilename);
      if (pdfFilePath) {
        return fs.readFileSync(pdfFilePath);
      }

      this.logger.warn(
        `PDF no encontrado en disco para certificado ${certificate.id} (filename=${pdfFilename})`,
      );
    }

    // Si no existe el PDF o se requiere actualizarlo, generarlo en tiempo real
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

    // Si no está en la relación cargada, buscar la solicitud completa
    if (!requesterEmail) {
      const request = await this.requestRepository.findOne({
        where: { id: certificate.requestId },
      });
      requesterEmail = request?.requesterEmail;

      // Intentar fallback con email del graduado si no hay email de solicitante
      if (!requesterEmail && request?.graduateEmail) {
        requesterEmail = request.graduateEmail;
      }
    }

    if (!requesterEmail) {
      throw new BadRequestException('No hay un email de solicitante asociado ni se encontró email del graduado');
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
    userAgent?: string | string[],
    geoContext?: ValidationGeoContext,
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

    // Registrar validacion
    if (certificate) {
      const normalizedIp = this.normalizeIpAddress(ipAddress);
      const normalizedUserAgent = this.normalizeUserAgent(userAgent);
      const location =
        this.resolveLocation(normalizedIp, geoContext) ?? undefined;
      const validation = this.validationRepository.create({
        certificateId: certificate.id,
        ipAddress: normalizedIp,
        userAgent: normalizedUserAgent,
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
    userAgent?: string | string[],
    geoContext?: ValidationGeoContext,
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

    // Registrar validacion
    if (certificate) {
      const normalizedIp = this.normalizeIpAddress(ipAddress);
      const normalizedUserAgent = this.normalizeUserAgent(userAgent);
      const location =
        this.resolveLocation(normalizedIp, geoContext) ?? undefined;
      const validation = this.validationRepository.create({
        certificateId: certificate.id,
        ipAddress: normalizedIp,
        userAgent: normalizedUserAgent,
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
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private tokenizeName(value: string): string[] {
    return this.normalizeName(value)
      .split(' ')
      .map((token) => token.trim())
      .filter(Boolean);
  }

  private splitFullName(fullName?: string): { firstName: string; lastName: string } {
    const safeName = (fullName || '').trim();
    if (!safeName) {
      return { firstName: '', lastName: '' };
    }
    const parts = safeName.split(/\s+/);
    if (parts.length === 1) {
      return { firstName: parts[0], lastName: '' };
    }
    return {
      firstName: parts.slice(0, -1).join(' '),
      lastName: parts.slice(-1).join(' '),
    };
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
        this.matchesLastName(graduate, options.lastNameNormalized || ''),
      );
      // Regla de seguridad: si se aporta nombre para validación, debe coincidir
      // según la regla de palabras en orden.
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
      // Si la fecha de grado no coincide exactamente, conservar candidatos por cédula.
      if (gradDateMatches.length) {
        candidates = gradDateMatches;
      }
    }

    const scored = candidates.map((graduate) => {
      let score = 0;
      if (
        options.lastNameNormalized &&
        this.matchesLastName(graduate, options.lastNameNormalized || '')
      ) {
        score += 2;
      }
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
        score += 2;
      }
      return { graduate, score };
    });

    scored.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      const aGrad = this.parseDate(a.graduate.graduationDate)?.getTime() || 0;
      const bGrad = this.parseDate(b.graduate.graduationDate)?.getTime() || 0;
      return bGrad - aGrad;
    });

    const bestScore = scored[0]?.score ?? 0;
    const hasAdditionalCriteria = Boolean(
      options.lastNameNormalized || options.gradDate || options.issueDate,
    );

    // Si el usuario sí envió datos de verificación adicionales y ninguno coincide,
    // exigir revisión manual.
    if (hasAdditionalCriteria && bestScore === 0) {
      return null;
    }

    // Si existe mas de un graduado con la misma cédula y no hay ningún
    // criterio adicional que permita desempatar, devolver null para revisión manual.
    if (scored.length > 1 && bestScore === 0) {
      return null;
    }

    // Si hay empate en el mejor puntaje entre múltiples graduados, no decidir automáticamente.
    if (scored.length > 1 && scored[0]?.score === scored[1]?.score) {
      return null;
    }

    return scored[0]?.graduate || candidates[0] || null;
  }

  private getGraduateNameVariants(graduate: Graduate): string[] {
    const fullName = (graduate.fullName || '').trim();
    const composedFromParts = `${(graduate.firstName || '').trim()} ${(graduate.lastName || '').trim()}`.trim();
    // Priorizar siempre nombre armado por first_name + last_name.
    // full_name puede venir desordenado desde integraciones.
    if (composedFromParts) {
      return [composedFromParts];
    }
    if (fullName) {
      return [fullName];
    }
    return [];
  }

  private getPreferredGraduateFullName(graduate?: Graduate | null): string {
    if (!graduate) return '';
    const composedFromParts = `${(graduate.firstName || '').trim()} ${(graduate.lastName || '').trim()}`.trim();
    if (composedFromParts) {
      return composedFromParts;
    }
    return (graduate.fullName || '').trim();
  }

  private matchesLastName(graduate: Graduate, lastNameNormalized: string): boolean {
    if (!lastNameNormalized) return true;

    const providedTokens = this.tokenizeName(lastNameNormalized);

    // Regla de negocio solicitada: mínimo 2 palabras para validar nombre.
    if (providedTokens.length < 2) {
      return false;
    }

    const nameVariants = this.getGraduateNameVariants(graduate);
    if (!nameVariants.length) return false;

    for (const nameVariant of nameVariants) {
      const fullNameTokens = this.tokenizeName(nameVariant);
      if (!fullNameTokens.length || providedTokens.length > fullNameTokens.length) {
        continue;
      }

      // Debe coincidir en orden, permitiendo palabras intermedias.
      let cursor = 0;
      let allFound = true;
      for (const token of providedTokens) {
        let foundAt = -1;
        for (let i = cursor; i < fullNameTokens.length; i += 1) {
          if (fullNameTokens[i] === token) {
            foundAt = i;
            break;
          }
        }

        if (foundAt === -1) {
          allFound = false;
          break;
        }

        cursor = foundAt + 1;
      }

      if (allFound) {
        return true;
      }
    }

    return false;
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
    reviewNotes?: string,
  ): Promise<void> {
    return this.sendCertificateEmail(
      email,
      certificate,
      frontendBaseUrl,
      reviewNotes,
    );
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

      // Guardar el PDF regenerado con la URL correcta en disco para futuras descargas
      try {
        const storagePath =
          process.env.STORAGE_PATH || './uploads/graduation-certificates';

        // Crear directorio si no existe (por si acaso)
        if (!fs.existsSync(storagePath)) {
          fs.mkdirSync(storagePath, { recursive: true });
        }

        const pdfFilename = `${certificate.certificateNumber}.pdf`;
        const pdfFilePath = path.join(storagePath, pdfFilename);

        fs.writeFileSync(pdfFilePath, buffer);

        // Actualizar registro si es necesario (aunque ya debería tener el nombre)
        if (!certificate.pdfFilename) {
          certificate.pdfFilename = pdfFilename;
          certificate.pdfUrl = `/uploads/graduation-certificates/${pdfFilename}`;
          await this.certificateRepository.save(certificate);
        }

        this.logger.log(`PDF regenerado y actualizado en disco: ${pdfFilePath}`);
      } catch (err) {
        this.logger.warn(`No se pudo guardar el PDF regenerado en disco: ${err}`);
      }

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
    reviewNotes?: string,
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

    const validationUrl = `${frontendBaseUrl ||
      process.env.FRONTEND_URL ||
      'https://certificados.esap.edu.co'
      }/verificar-certificado/${certificate.verificationCode}`;

    const trimmedReviewNotes = (reviewNotes || '').trim();
    const reviewNotesText = trimmedReviewNotes
      ? `\nNotas de revision: ${trimmedReviewNotes}`
      : '';
    const safeReviewNotes = trimmedReviewNotes
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    const attachment = await this.resolveCertificatePdf(
      certificate,
      frontendBaseUrl,
    );
    const payload = {
      to: email,
      subject: `Certificado de verificacion de titulo - ${certificate.certificateNumber}`,
      text: `Adjunto encontraras el certificado de verificacion de titulo solicitado.\n\nCodigo de verificacion: ${certificate.verificationCode}\nURL de validacion: ${validationUrl}${reviewNotesText}`,
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
            ${trimmedReviewNotes
          ? `<tr>
              <td style="padding: 0 24px 18px 24px; font-size: 14px; color: #4b5563;">
                <strong>Notas de revision:</strong>
                <div style="margin-top: 6px; white-space: pre-line;">${safeReviewNotes}</div>
              </td>
            </tr>`
          : ''
        }
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

  private async sendGraduateCompanyNotificationEmail(data: {
    graduateEmail: string;
    graduateName: string;
    companyName: string;
    companyNit?: string;
    contactPerson?: string;
    contactEmail?: string;
    requestDate?: Date;
    certificateNumber?: string;
  }): Promise<void> {
    const graduateEmail = (data.graduateEmail || '').trim();
    if (!graduateEmail) {
      this.logger.warn('No se pudo enviar la notificacion al graduado: email vacio');
      return;
    }

    const safe = (value: string) =>
      value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const companyName = data.companyName || 'Empresa solicitante';
    const companyNit = data.companyNit || 'No informado';
    const contactPerson = data.contactPerson || 'No informado';
    const contactEmail = data.contactEmail || 'No informado';
    const certificateNumber = data.certificateNumber || 'N/A';
    const requestDate = data.requestDate || new Date();

    let formattedDate = requestDate.toISOString();
    try {
      const datePart = requestDate.toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const timePart = requestDate.toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
      });
      formattedDate = `${datePart} ${timePart}`;
    } catch (_) {
      formattedDate = requestDate.toISOString();
    }

    const subject = `Notificacion de solicitud de certificado - ${companyName}`;
    const text =
      `Hola ${data.graduateName || 'graduado'},\n` +
      `La empresa ${companyName} (NIT ${companyNit}) solicito un certificado de egresado a tu nombre.\n` +
      `Fecha y hora de la solicitud: ${formattedDate}.\n` +
      `Persona de contacto: ${contactPerson}.\n` +
      `Correo de contacto: ${contactEmail}.\n` +
      `Numero de certificado: ${certificateNumber}.\n` +
      'Si no reconoces esta solicitud, por favor comunicate con ESAP.';

    const safeGraduateName = safe(data.graduateName || 'Graduado');
    const safeCompanyName = safe(companyName);
    const safeCompanyNit = safe(companyNit);
    const safeContactPerson = safe(contactPerson);
    const safeContactEmail = safe(contactEmail);
    const safeCertificateNumber = safe(certificateNumber);
    const safeFormattedDate = safe(formattedDate);

    const html = `
      <div style="font-family: 'Inter', Arial, sans-serif; background: #f5f7fb; padding: 24px; color: #1f2937;">
        <table width="100%" cellspacing="0" cellpadding="0" style="max-width: 520px; border: 1px solid #0b68d1; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 25px rgba(0,0,0,0.3);">
          <tr>
            <td style="background: linear-gradient(135deg, #003DA5 0%, #0b68d1 100%); padding: 18px 24px; color: #ffffff; font-weight: 700; font-size: 18px;">
              Certificados ESAP
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 24px 8px 24px; font-size: 16px; font-weight: 600; color: #111827;">
              Notificacion de solicitud de certificado
            </td>
          </tr>
          <tr>
            <td style="padding: 0 24px 12px 24px; font-size: 14px; color: #4b5563; line-height: 1.6;">
              Hola <strong>${safeGraduateName}</strong>, una empresa solicito un certificado de egresado a tu nombre.
            </td>
          </tr>
          <tr>
            <td style="padding: 0 24px 12px 24px; font-size: 14px; color: #4b5563;">
              <strong>Empresa:</strong> ${safeCompanyName}
            </td>
          </tr>
          <tr>
            <td style="padding: 0 24px 12px 24px; font-size: 14px; color: #4b5563;">
              <strong>NIT:</strong> ${safeCompanyNit}
            </td>
          </tr>
          <tr>
            <td style="padding: 0 24px 12px 24px; font-size: 14px; color: #4b5563;">
              <strong>Persona de contacto:</strong> ${safeContactPerson}
            </td>
          </tr>
          <tr>
            <td style="padding: 0 24px 12px 24px; font-size: 14px; color: #4b5563;">
              <strong>Correo de contacto:</strong> ${safeContactEmail}
            </td>
          </tr>
          <tr>
            <td style="padding: 0 24px 12px 24px; font-size: 14px; color: #4b5563;">
              <strong>Fecha y hora:</strong> ${safeFormattedDate}
            </td>
          </tr>
          <tr>
            <td style="padding: 0 24px 18px 24px; font-size: 14px; color: #4b5563;">
              <strong>Numero de certificado:</strong> ${safeCertificateNumber}
            </td>
          </tr>
          <tr>
            <td style="padding: 0 24px 18px 24px; font-size: 13px; color: #6b7280;">
              Si no reconoces esta solicitud, por favor contacta a ESAP para verificar la informacion.
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

    const baseUrl = this.resolveNotificationsBaseUrl();
    const url = `${baseUrl}/api/v1/emails/send`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: graduateEmail,
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
        `No se pudo enviar la notificacion al graduado: ${response.status} ${errorBody}`,
      );
      throw new Error(
        `Notifications service error (${response.status}): ${errorBody || 'sin detalle'}`,
      );
    }

    this.logger.log(`Notificacion enviada al graduado ${graduateEmail}`);
  }

  private buildRegistroFolioLibro(graduate?: Graduate): string | null {
    if (!graduate) {
      return null;
    }

    const numRegistro = (graduate.numRegistro || '').trim();
    const numFolio = (graduate.numFolio || '').trim();
    const numLibro = (graduate.numLibro || '').trim();

    if (numRegistro && numFolio && numLibro) {
      return `${numRegistro}-${numFolio}-${numLibro}`;
    }

    const parts = [numRegistro, numFolio, numLibro].filter(Boolean);
    if (parts.length > 0) {
      return parts.join('-');
    }

    return null;
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
    return await this.graduateRepository
      .createQueryBuilder('graduate')
      .loadRelationCountAndMap('graduate.filesCount', 'graduate.files')
      .orderBy('graduate.graduationDate', 'DESC')
      .getMany();
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

  async listarArchivosGraduado(id: string) {
    const graduate = await this.graduateRepository.findOne({ where: { id } });
    if (!graduate) {
      throw new NotFoundException('Graduado no encontrado');
    }
    const files = await this.graduateFileRepository.find({
      where: { graduateId: id },
      order: { uploadedAt: 'DESC' },
    });
    return files.map((file) => ({
      ...file,
      url: `/uploads/graduate-files/${file.storedName}`,
    }));
  }

  async subirArchivosGraduado(
    id: string,
    files: Express.Multer.File[],
    uploadedBy?: string,
  ) {
    const graduate = await this.graduateRepository.findOne({ where: { id } });
    if (!graduate) {
      throw new NotFoundException('Graduado no encontrado');
    }
    if (!files || files.length === 0) {
      throw new BadRequestException('No se recibieron archivos para cargar');
    }
    if (files.length > 5) {
      throw new BadRequestException('Solo se permiten máximo 5 archivos');
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

    const invalidFile = files.find((file) => {
      const ext = path.extname(file.originalname || '').toLowerCase();
      return !(allowedExtensions.has(ext) || allowedMimeTypes.has(file.mimetype));
    });
    if (invalidFile) {
      throw new BadRequestException(
        'Solo se permiten archivos PDF, Word, Excel o imágenes',
      );
    }

    const records = files.map((file) =>
      this.graduateFileRepository.create({
        graduateId: graduate.id,
        originalName: file.originalname,
        storedName: file.filename,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        uploadedBy: uploadedBy || undefined,
      }),
    );

    const saved = await this.graduateFileRepository.save(records);
    return saved.map((file) => ({
      ...file,
      url: `/uploads/graduate-files/${file.storedName}`,
    }));
  }

  async eliminarArchivoGraduado(graduateId: string, fileId: string) {
    const file = await this.graduateFileRepository.findOne({
      where: { id: fileId, graduateId },
    });
    if (!file) {
      throw new NotFoundException('Archivo no encontrado');
    }

    const filePath = path.join(process.cwd(), 'uploads', 'graduate-files', file.storedName);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (error) {
        this.logger.warn(`No se pudo eliminar el archivo fisico ${filePath}: ${error}`);
      }
    }

    await this.graduateFileRepository.delete({ id: fileId });
    return { mensaje: 'Archivo eliminado correctamente' };
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
    const hasNameParts =
      payload.firstName !== undefined || payload.lastName !== undefined;
    if (hasNameParts) {
      if (payload.firstName !== undefined) {
        update.firstName = payload.firstName.trim();
      }
      if (payload.lastName !== undefined) {
        update.lastName = payload.lastName.trim();
      }
      const nextFirstName =
        update.firstName !== undefined ? update.firstName : graduate.firstName || '';
      const nextLastName =
        update.lastName !== undefined ? update.lastName : graduate.lastName || '';
      const combinedName = `${nextFirstName} ${nextLastName}`.trim();
      if (combinedName) {
        update.fullName = combinedName;
      }
    } else if (payload.fullName !== undefined) {
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
    if (payload.numActa !== undefined) {
      update.numActa = payload.numActa;
    }
    if (payload.numFolio !== undefined) {
      update.numFolio = payload.numFolio;
    }
    if (payload.numLibro !== undefined) {
      update.numLibro = payload.numLibro;
    }
    if (payload.numRegistro !== undefined) {
      update.numRegistro = payload.numRegistro;
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
        if (payload.graduateEmail !== undefined) {
          request.graduateEmail = payload.graduateEmail.trim();
        }
        if (payload.graduatePhone !== undefined) {
          request.graduatePhone = payload.graduatePhone.trim();
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
    frontendBaseUrl?: string,
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
    const updatedRequest = await this.requestRepository.save(request);

    try {
      await this.sendUnderReviewEmail(updatedRequest, frontendBaseUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Solicitud ${updatedRequest.requestNumber}: no se pudo enviar aviso de revision a ${updatedRequest.requesterEmail || 'sin email'} (${message})`,
      );
    }

    return updatedRequest;
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
    if (payload?.email !== undefined) {
      request.graduateEmail = payload.email.trim();
    }
    if (payload?.phone !== undefined) {
      request.graduatePhone = payload.phone.trim();
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

    const normalizedIdNumber = (request.idNumber || '').replace(/\D+/g, '');
    const programName = (request.programName || '').trim();
    const normalizedProgramName = programName.toLowerCase();
    const graduateWhere = normalizedIdNumber
      ? {
        idNumber: Raw(
          (alias) =>
            `REPLACE(REPLACE(REPLACE(${alias}, '.', ''), '-', ''), ' ', '') = :idNumber`,
          { idNumber: normalizedIdNumber },
        ),
      }
      : { idNumber: request.idNumber.trim() };
    const programWhere = programName
      ? Raw((alias) => `LOWER(${alias}) = :programName`, { programName: normalizedProgramName })
      : undefined;
    const graduateLookupWhere = programWhere
      ? { ...graduateWhere, programName: programWhere }
      : graduateWhere;

    let graduate =
      request.graduate ||
      (await this.graduateRepository.findOne({
        where: graduateLookupWhere,
      }));

    if (
      request.manualReview &&
      graduate &&
      (!request.graduateId || request.graduateId !== graduate.id)
    ) {
      throw new BadRequestException(
        'Ya existe un graduado con este documento y programa. Verifica si la solicitud es duplicada.',
      );
    }

    if (graduate) {
      const graduateUpdate: Partial<Graduate> = {};
      if (payload?.fullName !== undefined) graduateUpdate.fullName = payload.fullName.trim();
      if (payload?.idNumber !== undefined) graduateUpdate.idNumber = payload.idNumber.trim();
      if (payload?.email !== undefined) graduateUpdate.email = payload.email;
      if (payload?.phone !== undefined) graduateUpdate.phone = payload.phone;
      if (payload?.programName !== undefined) graduateUpdate.programName = payload.programName;
      if (payload?.programType !== undefined) graduateUpdate.programType = payload.programType;
      if (payload?.degreeTitle !== undefined) graduateUpdate.degreeTitle = payload.degreeTitle;
      if (payload?.numRegistro !== undefined) graduateUpdate.numRegistro = payload.numRegistro;
      if (payload?.numFolio !== undefined) graduateUpdate.numFolio = payload.numFolio;
      if (payload?.numLibro !== undefined) graduateUpdate.numLibro = payload.numLibro;
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
    } else {
      const fullName = (payload?.fullName || request.fullName || '').trim();
      const { firstName, lastName } = this.splitFullName(fullName);
      const programName = payload?.programName || request.programName || 'No disponible';
      const programType =
        payload?.programType ||
        (request as { programType?: string }).programType ||
        'Pregrado';
      const degreeTitle =
        payload?.degreeTitle ||
        (request as { degreeTitle?: string }).degreeTitle ||
        programName;
      const graduationDate =
        this.parseDate(payload?.graduationDate) ?? request.graduationDate ?? new Date();
      const campus =
        payload?.campus || (request as { campus?: string }).campus || undefined;
      const seccionalName =
        payload?.seccionalName || (request as { seccionalName?: string }).seccionalName;

      const reviewerName = payload?.reviewerName || request.reviewerName;
      const createdGraduate = this.graduateRepository.create({
        personId: randomUUID(),
        programId: randomUUID(),
        fullName: fullName || request.fullName,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        idNumber: request.idNumber,
        idIssueDate: request.idIssueDate,
        email: payload?.email?.trim() || request.graduateEmail,
        phone: payload?.phone?.trim() || undefined,
        programName,
        programType,
        graduationDate,
        degreeTitle,
        campus,
        seccionalName: seccionalName?.trim() || undefined,
        numRegistro: payload?.numRegistro?.trim() || undefined,
        numFolio: payload?.numFolio?.trim() || undefined,
        numLibro: payload?.numLibro?.trim() || undefined,
        status: 'ACTIVE',
        isVerified: true,
        createdBy: reviewerName ? `manual_review:${reviewerName}` : 'manual_review',
      });

      graduate = await this.graduateRepository.save(createdGraduate);
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
          reviewNotes,
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

  private async sendUnderReviewEmail(
    request: GraduationCertificateRequest,
    frontendBaseUrl?: string,
  ): Promise<void> {
    const email = (request.requesterEmail || '').trim();
    if (!email) {
      this.logger.warn(
        `No se pudo notificar inicio de revision para solicitud ${request.requestNumber}: email vacio`,
      );
      return;
    }

    const baseUrl = this.resolveNotificationsBaseUrl();
    const url = `${baseUrl}/api/v1/emails/send`;
    const safe = (value: string) =>
      value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const requesterName = (
      request.requesterName ||
      request.fullName ||
      'Solicitante'
    ).trim();
    const requestNumber = (request.requestNumber || 'N/A').trim();
    const idNumber = (request.idNumber || '').trim();
    const updateDate = new Date();

    let formattedUpdateDate = updateDate.toISOString();
    try {
      const datePart = updateDate.toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const timePart = updateDate.toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
      });
      formattedUpdateDate = `${datePart} ${timePart}`;
    } catch (_) {
      formattedUpdateDate = updateDate.toISOString();
    }

    const subject = `Actualizacion de solicitud en revision - ${requestNumber}`;
    const text =
      `Hola ${requesterName},\n` +
      `Tu solicitud ${requestNumber} avanzo al estado En revision.\n` +
      `Documento consultado: ${idNumber || 'No informado'}.\n` +
      `Fecha de actualizacion: ${formattedUpdateDate}.\n\n` +
      `Nuestro equipo se encuentra validando la informacion. Te notificaremos el siguiente avance al mismo correo.`;

    const safeRequesterName = safe(requesterName);
    const safeRequestNumber = safe(requestNumber);
    const safeIdNumber = safe(idNumber || 'No informado');
    const safeFormattedUpdateDate = safe(formattedUpdateDate);

    const html = `
      <div style="font-family: 'Inter', Arial, sans-serif; background: #f5f7fb; padding: 24px; color: #1f2937;">
        <table width="100%" cellspacing="0" cellpadding="0" style="max-width: 520px; border: 1px solid #0b68d1; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 25px rgba(0,0,0,0.3);">
          <tr>
            <td style="background: linear-gradient(135deg, #003DA5 0%, #0b68d1 100%); padding: 18px 24px; color: #ffffff; font-weight: 700; font-size: 18px;">
              Certificados ESAP
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 24px 8px 24px; font-size: 16px; font-weight: 600; color: #111827;">
              Actualizacion de solicitud de revision
            </td>
          </tr>
          <tr>
            <td style="padding: 0 24px 12px 24px; font-size: 14px; color: #4b5563; line-height: 1.6;">
              Hola <strong>${safeRequesterName}</strong>, tu solicitud avanzo en el proceso.
            </td>
          </tr>
          <tr>
            <td style="padding: 0 24px 12px 24px; font-size: 14px; color: #4b5563;">
              <strong>Solicitud:</strong> ${safeRequestNumber}
            </td>
          </tr>
          <tr>
            <td style="padding: 0 24px 12px 24px; font-size: 14px; color: #4b5563;">
              <strong>Estado actual:</strong> En revision
            </td>
          </tr>
          <tr>
            <td style="padding: 0 24px 12px 24px; font-size: 14px; color: #4b5563;">
              <strong>Documento consultado:</strong> ${safeIdNumber}
            </td>
          </tr>
          <tr>
            <td style="padding: 0 24px 12px 24px; font-size: 14px; color: #4b5563;">
              <strong>Fecha de actualizacion:</strong> ${safeFormattedUpdateDate}
            </td>
          </tr>
          <tr>
            <td style="padding: 0 24px 18px 24px; font-size: 14px; color: #4b5563; line-height: 1.6;">
              Nuestro equipo se encuentra validando la informacion. Te notificaremos el siguiente avance al mismo correo.
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
      throw new Error(
        `Notifications service error (${response.status}): ${errorBody || 'sin detalle'}`,
      );
    }

    this.logger.log(
      `Notificacion de inicio de revision enviada a ${email} para solicitud ${requestNumber}`,
    );
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
          ${request.rejectionReason
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
    userAgent?: string | string[],
  ) {
    const certificate = await this.certificateRepository.findOne({
      where: { id: certificateId },
    });

    if (!certificate) {
      throw new NotFoundException('Certificado no encontrado');
    }

    const download = this.downloadRepository.create({
      certificateId,
      ipAddress: this.normalizeIpAddress(ipAddress),
      userAgent: this.normalizeUserAgent(userAgent),
    });

    await this.downloadRepository.save(download);

    return { mensaje: 'Descarga registrada' };
  }

  private resolveLocation(
    ipAddress?: string,
    geoContext?: ValidationGeoContext,
  ): string | null {
    const fromContext = this.resolveLocationFromContext(geoContext);
    if (fromContext) {
      return fromContext;
    }

    const normalizedIp = this.normalizeIpAddress(ipAddress);
    if (!normalizedIp) {
      return null;
    }

    if (normalizedIp === '::1' || normalizedIp === '127.0.0.1') {
      return 'Localhost';
    }

    if (this.isPrivateIp(normalizedIp)) {
      return 'Red privada';
    }

    const geo = geoip.lookup(normalizedIp);
    if (!geo) {
      return null;
    }

    const parts = [geo.city, geo.region, geo.country].filter(Boolean);
    return parts.length ? parts.join(', ') : null;
  }

  private resolveLocationFromContext(context?: ValidationGeoContext): string | null {
    if (!context) {
      return null;
    }

    const city = this.normalizeGeoText(context.geoCity);
    const region = this.normalizeGeoText(context.geoRegion);
    const country = this.normalizeGeoText(context.geoCountry);

    const parts = [city, region, country].filter(Boolean);
    return parts.length ? parts.join(', ') : null;
  }

  private normalizeGeoText(value?: string): string | undefined {
    const normalized = String(value || '').trim();
    if (!normalized) return undefined;
    if (
      /^(unknown|desconocido|n\/a|na|null|undefined|localhost|local|xx|t1)$/i.test(
        normalized,
      )
    ) {
      return undefined;
    }
    return normalized;
  }

  private normalizeUserAgent(userAgent?: string | string[]): string | undefined {
    if (Array.isArray(userAgent)) {
      const first = userAgent.find((item) => String(item || '').trim());
      const trimmed = String(first || '').trim();
      return trimmed || undefined;
    }

    const trimmed = String(userAgent || '').trim();
    return trimmed || undefined;
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

  private normalizeIpAddress(ipAddress?: string): string | undefined {
    if (!ipAddress) return undefined;

    const candidates = String(ipAddress)
      .split(',')
      .map((item) => this.normalizeSingleIp(item))
      .filter((item): item is string => Boolean(item));

    if (!candidates.length) return undefined;

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

    const octets = ip.split('.').map((part) => Number(part));
    if (octets.length !== 4 || octets.some((value) => Number.isNaN(value))) {
      return false;
    }

    const [a, b] = octets;
    if (a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a === 198 && (b === 18 || b === 19)) return true;
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









