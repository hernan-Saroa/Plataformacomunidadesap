import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
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

  /**
   * AUTOSERVICIO: Verificar si un graduado existe en la base de datos
   */
  async verificarGraduado(idNumber: string, idIssueDate: string) {
    const issueDate = this.normalizeDateString(idIssueDate);
    if (!issueDate) {
      throw new BadRequestException('Fecha de expedición inválida');
    }

    const graduate = await this.graduateRepository.findOne({
      where: {
        idNumber: idNumber.trim(),
        idIssueDate: Raw((alias) => `${alias} = :issueDate`, { issueDate }),
        status: 'ACTIVE',
      },
    });

    if (!graduate) {
      return {
        existe: false,
        mensaje: 'No se encontró un graduado con esos datos',
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
  async generarCodigoValidacion(idNumber: string, idIssueDate: string) {
    // Verificar que el graduado existe
    const verificacion = await this.verificarGraduado(idNumber, idIssueDate);
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
  async solicitarCertificadoLanding(dto: LandingCertificateRequestDto) {
    const issueDate = this.normalizeDateString(dto.idIssueDate);

    if (!issueDate) {
      throw new BadRequestException('Fecha de expedición inválida');
    }

    this.logger.debug(
      `Solicitud landing: idNumber=${dto.idNumber?.trim()} idIssueDate=${dto.idIssueDate} normalizada=${issueDate}`,
    );

    const graduate = await this.graduateRepository.findOne({
      where: {
        idNumber: dto.idNumber.trim(),
        idIssueDate: Raw((alias) => `${alias} = :issueDate`, { issueDate }),
        status: 'ACTIVE',
      },
    });

    if (!graduate) {
      this.logger.warn(
        `Graduado no encontrado para idNumber=${dto.idNumber?.trim()} idIssueDate=${issueDate}`,
      );
    }

    const requestNumber = await this.generateRequestNumber();
    const requestPayload: DeepPartial<GraduationCertificateRequest> = {
      requestNumber,
      requesterType: this.normalizeRequesterType(dto.requesterType),
      graduateId: graduate?.id,
      idNumber: dto.idNumber,
      fullName: graduate?.fullName || dto.requesterName,
      programName: graduate?.programName || dto.programName || 'No disponible',
      graduationDate:
        graduate?.graduationDate ||
        this.parseDate(dto.graduationDate) ||
        new Date(),
      requesterName: dto.requesterName,
      requesterEmail: dto.requesterEmail,
      requesterPhone: dto.requesterPhone,
      companyName: dto.companyName,
      certificateType: 'STANDARD',
      validationCode: undefined,
      validationExpiresAt: undefined,
      isValidated: false,
      status: graduate ? 'PROCESSING' : 'PENDING',
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

    await this.notifyCertificateDelivery(dto.requesterEmail, certificate);

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
    idIssueDate: string,
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
  private async generateCertificate(request: GraduationCertificateRequest) {
    const graduate = request.graduate;

    // Obtener firmante principal
    const signer = await this.signerRepository.findOne({
      where: { isPrimary: true, isActive: true },
    });

    if (!signer) {
      throw new NotFoundException('No se encontró un firmante activo');
    }

    // Generar número de certificado único
    const certificateNumber = await this.generateCertificateNumber();

    // Generar código de verificación único (QR)
    const verificationCode = await this.generateVerificationCode();

    // Crear certificado
    const certificate = this.certificateRepository.create({
      requestId: request.id,
      graduateId: graduate?.id,
      certificateNumber,
      verificationCode,
      fullName: request.fullName,
      idNumber: request.idNumber,
      programName: request.programName,
      programType: graduate?.programType || 'Pregrado',
      degreeTitle: graduate?.degreeTitle || request.programName,
      graduationDate: request.graduationDate,
      diplomaNumber: graduate?.diplomaNumber,
      actaNumber: graduate?.actaNumber,
      campus: graduate?.campus,
      signerName: signer.fullName,
      signerPosition: signer.position,
      signatureUrl: signer.signatureUrl,
      status: 'VALID',
      issueDate: new Date(),
      createdBy: 'SYSTEM',
    });

    await this.certificateRepository.save(certificate);

    // Generar PDF del certificado
    try {
      const pdfBuffer =
        await this.pdfGeneratorService.generateCertificatePDF(certificate);
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
      // No lanzar error, el certificado ya está creado
    }

    return certificate;
  }

  /**
   * Obtener PDF de un certificado
   */
  async getCertificatePDF(id: string): Promise<Buffer> {
    const certificate = await this.certificateRepository.findOne({
      where: { id },
    });

    if (!certificate) {
      throw new NotFoundException('Certificado no encontrado');
    }

    if (certificate.pdfFilename) {
      // Leer PDF del sistema de archivos
      const storagePath =
        process.env.STORAGE_PATH || './uploads/graduation-certificates';
      const fs = require('fs');
      const path = require('path');
      const pdfFilePath = path.join(storagePath, certificate.pdfFilename);

      if (fs.existsSync(pdfFilePath)) {
        return fs.readFileSync(pdfFilePath);
      }
    }

    // Si no existe el PDF, generarlo en tiempo real
    return await this.pdfGeneratorService.generateCertificatePDF(certificate);
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
      const validation = this.validationRepository.create({
        certificateId: certificate.id,
        ipAddress,
        userAgent,
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
      const validation = this.validationRepository.create({
        certificateId: certificate.id,
        ipAddress,
        userAgent,
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

  private normalizeRequesterType(input?: string): 'GRADUATE' | 'COMPANY' {
    if (input && input.toUpperCase() === 'COMPANY') {
      return 'COMPANY';
    }
    return 'GRADUATE';
  }

  private notifyCertificateDelivery(
    email: string,
    certificate: GraduationCertificate,
  ): Promise<void> {
    this.logger.log(
      `Preparando envío del certificado ${certificate.certificateNumber} a ${email}`,
    );
    this.logger.debug(`Documento almacenado en ${certificate.pdfUrl}`);
    // TODO: conectar con correo real o proveedor de notificaciones
    return Promise.resolve();
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
   * ADMIN: Listar todas las solicitudes
   */
  async listarSolicitudes() {
    return await this.requestRepository.find({
      relations: ['graduate'],
      order: { requestDate: 'DESC' },
    });
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
}
