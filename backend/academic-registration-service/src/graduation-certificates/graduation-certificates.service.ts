import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, In, Raw, Repository } from 'typeorm';
import { Graduate } from './graduate.entity';
import { GraduationCertificateRequest } from './graduation-certificate-request.entity';
import { GraduationCertificate } from './graduation-certificate.entity';
import { CertificateValidation } from './certificate-validation.entity';
import { CertificateDownload } from './certificate-download.entity';
import { Signer } from './signer.entity';
import { TemplateConfig } from './template-config.entity';
import { TemplateConfigChange } from './template-config-change.entity';
import { GraduateFile } from './graduate-file.entity';
import { GraduationRequestReviewFile } from './graduation-request-review-file.entity';
import { PdfGeneratorService } from './pdf-generator.service';
import { LandingCertificateRequestDto } from './dto/landing-certificate-request.dto';
import {
  ApproveRequestDto,
  ResolveReviewApprovalDto,
  ReviewDecision,
  SubmitReviewDecisionDto,
} from './dto/approve-request.dto';
import { UpdateGraduateDto } from './dto/update-graduate.dto';
import { UpdateCertificateDto } from './dto/update-certificate.dto';
import { UpdateTemplateTextsDto } from './dto/update-template-texts.dto';
import {
  buildGraduationCertificateTemplateSnapshot,
  DEFAULT_GRADUATION_CERTIFICATE_TEMPLATE_TEXTS,
  normalizeGraduationCertificateTemplateTexts,
  parseGraduationCertificateTemplateSnapshot,
  parseGraduationCertificateTemplateTexts,
  serializeGraduationCertificateTemplateTexts,
} from './certificate-template-texts';
import {
  GraduateOracleIntegrationService,
  type OracleGraduateRecord,
} from './graduate-oracle-integration.service';
import {
  GraduateMysqlIntegrationService,
  MysqlGraduateRecord,
} from './graduate-mysql-integration.service';
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

type OrderedTokenMatchMetrics = {
  matchedCount: number;
  exactMatches: number;
  fuzzyMatches: number;
};

type GraduateSuggestion = {
  graduateId: string;
  fullName: string;
  idNumber: string;
  programName: string;
  degreeTitle: string;
  graduationDate: string | null;
  campus?: string;
  seccionalName?: string;
  score: number;
  matchedTokens: number;
  exactTokenMatches: number;
  fuzzyTokenMatches: number;
  totalGraduateTokens: number;
  totalProvidedTokens: number;
  exactGraduationDateMatch: boolean;
};

type OracleGraduateSyncResult = {
  enabled: boolean;
  found: boolean;
  synced: boolean;
  created: number;
  updated: number;
  unchanged: number;
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
    @InjectRepository(TemplateConfig)
    private templateConfigRepository: Repository<TemplateConfig>,
    @InjectRepository(TemplateConfigChange)
    private templateConfigChangeRepository: Repository<TemplateConfigChange>,
    @InjectRepository(GraduateFile)
    private graduateFileRepository: Repository<GraduateFile>,
    @InjectRepository(GraduationRequestReviewFile)
    private reviewFileRepository: Repository<GraduationRequestReviewFile>,
    private pdfGeneratorService: PdfGeneratorService,
    private graduateMysqlIntegrationService: GraduateMysqlIntegrationService,
    private graduateOracleIntegrationService: GraduateOracleIntegrationService,
  ) {}

  private readonly logger = new Logger(GraduationCertificatesService.name);
  private readonly manualReviewExpirationBusinessDays = 15;
  private mailTransporter: nodemailer.Transporter | null = null;

  private resolveNotificationsBaseUrl() {
    const direct =
      process.env.NOTIFICATIONS_SERVICE_URL ||
      process.env.NOTIFICATION_SERVICE_URL;
    if (direct) {
      return direct.replace(/\/$/, '');
    }
    if (process.env.NODE_ENV !== 'production') {
      return 'http://localhost:3009';
    }
    return 'http://notifications-service:3009';
  }

  private toNullableText(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    const text = String(value).trim();
    return text || null;
  }

  private getMojibakeScore(value: string) {
    return (value.match(/[ÃÂ�]/g) || []).length;
  }

  private normalizeOriginalFileName(value?: string | null) {
    const original =
      path
        .basename(String(value || 'archivo'))
        .replace(/[\u0000-\u001F\u007F]/g, '')
        .trim() || 'archivo';

    if (!this.getMojibakeScore(original)) {
      return original;
    }

    const decoded = Buffer.from(original, 'latin1').toString('utf8').trim();
    if (
      decoded &&
      !decoded.includes('�') &&
      this.getMojibakeScore(decoded) < this.getMojibakeScore(original)
    ) {
      return decoded;
    }

    return original;
  }

  private normalizeReviewFilesForResponse<
    T extends { reviewFiles?: GraduationRequestReviewFile[] },
  >(item: T) {
    if (Array.isArray(item.reviewFiles)) {
      item.reviewFiles.forEach((file) => {
        file.originalName = this.normalizeOriginalFileName(file.originalName);
      });
    }
    return item;
  }

  private appendReviewTimeline(
    request: GraduationCertificateRequest,
    entry: {
      type: string;
      label: string;
      notes?: string;
      actorId?: string;
      actorName?: string;
      actorEmail?: string;
      createdAt?: Date;
    },
  ) {
    const currentTimeline = Array.isArray(request.reviewTimeline)
      ? request.reviewTimeline
      : [];

    request.reviewTimeline = [
      ...currentTimeline,
      {
        type: entry.type,
        label: entry.label,
        ...(entry.notes ? { notes: entry.notes } : {}),
        ...(entry.actorId ? { actorId: entry.actorId } : {}),
        ...(entry.actorName ? { actorName: entry.actorName } : {}),
        ...(entry.actorEmail ? { actorEmail: entry.actorEmail } : {}),
        createdAt: (entry.createdAt || new Date()).toISOString(),
      },
    ];
  }

  private getTimelineFileCount(notes?: string) {
    const match = String(notes || '').match(/(\d+)/);
    return match ? Number(match[1]) || 0 : 0;
  }

  private appendOrMergeReviewFileUploadTimeline(
    request: GraduationCertificateRequest,
    entry: {
      fileCount: number;
      actorName?: string;
      actorEmail?: string;
      createdAt?: Date;
    },
  ) {
    const currentTimeline = Array.isArray(request.reviewTimeline)
      ? request.reviewTimeline
      : [];
    const lastEvent = currentTimeline[currentTimeline.length - 1];
    const now = entry.createdAt || new Date();
    const lastEventTime = lastEvent?.createdAt
      ? new Date(lastEvent.createdAt).getTime()
      : Number.NaN;
    const sameActor =
      (lastEvent?.actorEmail || '') === (entry.actorEmail || '') &&
      (lastEvent?.actorName || '') === (entry.actorName || '');
    const withinUploadWindow =
      !Number.isNaN(lastEventTime) &&
      Math.abs(now.getTime() - lastEventTime) <= 15 * 60 * 1000;

    if (
      lastEvent?.type === 'review_files_uploaded' &&
      sameActor &&
      withinUploadWindow
    ) {
      const nextTimeline = [...currentTimeline];
      const nextCount =
        this.getTimelineFileCount(lastEvent.notes) + entry.fileCount;
      nextTimeline[nextTimeline.length - 1] = {
        ...lastEvent,
        label: 'Archivos de soporte cargados',
        notes: `${nextCount} archivo(s) adjunto(s)`,
        createdAt: now.toISOString(),
      };
      request.reviewTimeline = nextTimeline;
      return;
    }

    this.appendReviewTimeline(request, {
      type: 'review_files_uploaded',
      label: 'Archivos de soporte cargados',
      notes: `${entry.fileCount} archivo(s) adjunto(s)`,
      actorName: entry.actorName,
      actorEmail: entry.actorEmail,
      createdAt: now,
    });
  }

  private buildReviewPayload(payload: ApproveRequestDto) {
    const keys: Array<keyof ApproveRequestDto> = [
      'fullName',
      'idNumber',
      'email',
      'phone',
      'programName',
      'programType',
      'degreeTitle',
      'graduationDate',
      'campus',
      'seccionalName',
      'numRegistro',
      'numFolio',
      'numLibro',
    ];

    const reviewPayload: Record<string, unknown> = {};
    for (const key of keys) {
      const value = payload[key];
      if (value === undefined || value === null) continue;
      reviewPayload[key] =
        value instanceof Date ? value.toISOString() : String(value).trim();
    }

    return reviewPayload;
  }

  private buildApprovePayloadFromReview(
    request: GraduationCertificateRequest,
    fallbackReason?: string,
  ): ApproveRequestDto {
    const savedPayload =
      request.reviewPayload && typeof request.reviewPayload === 'object'
        ? (request.reviewPayload as Record<string, unknown>)
        : {};

    return {
      reviewNotes:
        request.reviewRecommendationReason ||
        request.reviewNotes ||
        fallbackReason ||
        'Aprobado por revision manual',
      reviewerName: request.reviewSubmittedByName || request.reviewerName,
      reviewerId: request.reviewSubmittedBy || request.reviewedBy,
      publicNotificationNotes: fallbackReason ?? '',
      fullName: this.toNullableText(savedPayload.fullName) || undefined,
      idNumber: this.toNullableText(savedPayload.idNumber) || undefined,
      email: this.toNullableText(savedPayload.email) || undefined,
      phone: this.toNullableText(savedPayload.phone) || undefined,
      programName: this.toNullableText(savedPayload.programName) || undefined,
      programType: this.toNullableText(savedPayload.programType) || undefined,
      degreeTitle: this.toNullableText(savedPayload.degreeTitle) || undefined,
      graduationDate:
        this.toNullableText(savedPayload.graduationDate) || undefined,
      campus: this.toNullableText(savedPayload.campus) || undefined,
      seccionalName:
        this.toNullableText(savedPayload.seccionalName) || undefined,
      numRegistro: this.toNullableText(savedPayload.numRegistro) || undefined,
      numFolio: this.toNullableText(savedPayload.numFolio) || undefined,
      numLibro: this.toNullableText(savedPayload.numLibro) || undefined,
    };
  }

  private getReviewDecisionLabel(decision: ReviewDecision) {
    switch (decision) {
      case 'APPROVED':
        return 'Concepto del revisor: aprobar';
      case 'REJECTED':
        return 'Concepto del revisor: rechazar';
      case 'OBSERVATION':
        return 'Concepto del revisor: observacion';
      default:
        return 'Concepto del revisor';
    }
  }

  private compareGraduateValue(
    key: keyof Graduate,
    current: unknown,
    next: unknown,
  ): boolean {
    if (
      key === 'idIssueDate' ||
      key === 'enrollmentDate' ||
      key === 'graduationDate' ||
      key === 'ceremonyDate'
    ) {
      return (
        this.normalizeDateString(current as Date | string | undefined) ===
        this.normalizeDateString(next as Date | string | undefined)
      );
    }

    return String(current ?? '').trim() === String(next ?? '').trim();
  }

  private hasGraduateChanges(
    graduate: Graduate,
    payload: Partial<Graduate>,
  ): boolean {
    return (Object.keys(payload) as Array<keyof Graduate>).some((key) => {
      if (payload[key] === undefined) return false;
      return !this.compareGraduateValue(key, graduate[key], payload[key]);
    });
  }

  private findMatchingGraduateForOracleRecord(
    record: OracleGraduateRecord,
    graduates: Graduate[],
    usedGraduateIds: Set<string>,
  ): Graduate | null {
    const candidates = graduates.filter(
      (graduate) => !usedGraduateIds.has(graduate.id),
    );
    if (!candidates.length) return null;

    const diplomaNumber = this.toNullableText(record.diplomaNumber);
    if (diplomaNumber) {
      const byDiploma = candidates.find(
        (graduate) =>
          this.normalizeName(graduate.diplomaNumber || '') ===
          this.normalizeName(diplomaNumber),
      );
      if (byDiploma) return byDiploma;
    }

    const numRegistro = this.toNullableText(record.numRegistro);
    const numFolio = this.toNullableText(record.numFolio);
    const numLibro = this.toNullableText(record.numLibro);
    if (numRegistro || numFolio || numLibro) {
      const byRegistration = candidates.find(
        (graduate) =>
          (!numRegistro ||
            String(graduate.numRegistro || '').trim() === numRegistro) &&
          (!numFolio || String(graduate.numFolio || '').trim() === numFolio) &&
          (!numLibro || String(graduate.numLibro || '').trim() === numLibro),
      );
      if (byRegistration) return byRegistration;
    }

    const graduationDate = this.normalizeDateString(
      record.graduationDate || '',
    );
    const programName = this.normalizeName(record.programName || '');
    if (graduationDate && programName) {
      const byProgramAndDate = candidates.find(
        (graduate) =>
          this.normalizeDateString(graduate.graduationDate) ===
            graduationDate &&
          this.normalizeName(graduate.programName || '') === programName,
      );
      if (byProgramAndDate) return byProgramAndDate;
    }

    return candidates.length === 1 ? candidates[0] : null;
  }

  private buildGraduatePayloadFromOracle(
    record: OracleGraduateRecord,
    existing?: Graduate | null,
    source = 'oracle:sinu',
  ): Partial<Graduate> | null {
    const idNumber = this.toNullableText(record.idNumber);
    const fullName =
      this.toNullableText(record.fullName) ||
      this.toNullableText(existing?.fullName);
    const programName =
      this.toNullableText(record.programName) ||
      this.toNullableText(existing?.programName);
    const graduationDate =
      this.parseDate(record.graduationDate || undefined) ||
      existing?.graduationDate;

    if (!idNumber || !fullName || !programName || !graduationDate) {
      this.logger.warn(
        `Registro Oracle SINU incompleto para sincronizar graduado: documento=${idNumber || 'N/A'}`,
      );
      return null;
    }

    const firstName = this.toNullableText(record.firstName);
    const lastName = this.toNullableText(record.lastName);
    const programType =
      this.toNullableText(record.programType) ||
      this.toNullableText(existing?.programType) ||
      'Pregrado';
    const degreeTitle =
      this.toNullableText(record.degreeTitle) ||
      this.toNullableText(existing?.degreeTitle) ||
      programName;

    const payload: Partial<Graduate> = {
      fullName,
      firstName: firstName ?? existing?.firstName,
      lastName: lastName ?? existing?.lastName,
      idNumber,
      email: this.toNullableText(record.email) ?? existing?.email,
      phone: this.toNullableText(record.phone) ?? existing?.phone,
      programName,
      programType,
      graduationDate,
      degreeTitle,
      diplomaNumber:
        this.toNullableText(record.diplomaNumber) ?? existing?.diplomaNumber,
      actaNumber: this.toNullableText(record.numActa) ?? existing?.actaNumber,
      numActa: this.toNullableText(record.numActa) ?? existing?.numActa,
      numFolio: this.toNullableText(record.numFolio) ?? existing?.numFolio,
      numLibro: this.toNullableText(record.numLibro) ?? existing?.numLibro,
      numRegistro:
        this.toNullableText(record.numRegistro) ?? existing?.numRegistro,
      campus: this.toNullableText(record.campus) ?? existing?.campus,
      seccionalName:
        this.toNullableText(record.territorial) ?? existing?.seccionalName,
      status: 'ACTIVE',
      isVerified: true,
      updatedBy: source,
    };

    if (!existing) {
      payload.personId = randomUUID();
      payload.programId = randomUUID();
      payload.enrollmentDate = graduationDate;
      payload.createdBy = source;
    }

    return payload;
  }

  private mapMysqlRecordToOracle(
    record: MysqlGraduateRecord,
  ): OracleGraduateRecord {
    return {
      idNumber: String(record.IDENTIFICACION || ''),
      firstName: null,
      lastName: null,
      fullName: record.ESTUDIANTE,
      email: null,
      personalEmail: null,
      phone: null,
      programCode: null,
      programName: record.TITULO,
      programType: null,
      degreeTitle: record.TITULO,
      territorial: null,
      campus: null,
      numLibro: record.LIBRO,
      numFolio: null,
      numRegistro: record.REGISTRO,
      diplomaNumber: record.DIPLOMA,
      graduationDate: record.FECHAREGISTRO,
      numActa: record.ACTA,
    };
  }

  private async upsertGraduateFromOracle(
    record: OracleGraduateRecord,
    existing?: Graduate | null,
    source = 'oracle:sinu',
  ): Promise<{
    graduate: Graduate | null;
    action: 'created' | 'updated' | 'unchanged' | 'skipped';
  }> {
    const payload = this.buildGraduatePayloadFromOracle(
      record,
      existing,
      source,
    );
    if (!payload) {
      return { graduate: null, action: 'skipped' };
    }

    if (!existing) {
      const graduate = this.graduateRepository.create(payload);
      return {
        graduate: await this.graduateRepository.save(graduate),
        action: 'created',
      };
    }

    const {
      personId: _personId,
      programId: _programId,
      createdBy: _createdBy,
      ...updatePayload
    } = payload;
    if (!this.hasGraduateChanges(existing, updatePayload)) {
      return { graduate: existing, action: 'unchanged' };
    }

    Object.assign(existing, updatePayload);
    return {
      graduate: await this.graduateRepository.save(existing),
      action: 'updated',
    };
  }

  private async syncGraduatesFromOracleByIdNumber(
    idNumber: string,
  ): Promise<OracleGraduateSyncResult> {
    if (!this.graduateOracleIntegrationService.isEnabled()) {
      return {
        enabled: false,
        found: false,
        synced: false,
        created: 0,
        updated: 0,
        unchanged: 0,
      };
    }

    const oracleGraduates =
      await this.graduateOracleIntegrationService.findGraduatesByDocument(
        idNumber,
        100,
      );
    if (!oracleGraduates.length) {
      return {
        enabled: true,
        found: false,
        synced: false,
        created: 0,
        updated: 0,
        unchanged: 0,
      };
    }

    const localGraduates = await this.findActiveGraduatesByIdNumber(idNumber);
    const usedGraduateIds = new Set<string>();
    const result: OracleGraduateSyncResult = {
      enabled: true,
      found: true,
      synced: false,
      created: 0,
      updated: 0,
      unchanged: 0,
    };

    for (const record of oracleGraduates) {
      const existing = this.findMatchingGraduateForOracleRecord(
        record,
        localGraduates,
        usedGraduateIds,
      );
      if (existing) {
        usedGraduateIds.add(existing.id);
      }

      const sync = await this.upsertGraduateFromOracle(record, existing);
      if (sync.action === 'created') {
        result.created += 1;
        if (sync.graduate) {
          localGraduates.push(sync.graduate);
        }
      } else if (sync.action === 'updated') {
        result.updated += 1;
      } else if (sync.action === 'unchanged') {
        result.unchanged += 1;
      }
    }

    result.synced = result.created > 0 || result.updated > 0;
    return result;
  }

  private async syncGraduatesFromMysqlByIdNumber(
    idNumber: string,
  ): Promise<OracleGraduateSyncResult> {
    if (!this.graduateMysqlIntegrationService.isEnabled()) {
      return {
        enabled: false,
        found: false,
        synced: false,
        created: 0,
        updated: 0,
        unchanged: 0,
      };
    }

    const mysqlGraduates =
      await this.graduateMysqlIntegrationService.findGraduatesByDocument(
        idNumber,
        100,
      );
    
    if (!mysqlGraduates.length) {
      return {
        enabled: true,
        found: false,
        synced: false,
        created: 0,
        updated: 0,
        unchanged: 0,
      };
    }

    const localGraduates = await this.findActiveGraduatesByIdNumber(idNumber);
    const usedGraduateIds = new Set<string>();
    const result: OracleGraduateSyncResult = {
      enabled: true,
      found: true,
      synced: false,
      created: 0,
      updated: 0,
      unchanged: 0,
    };

    for (const mysqlRecord of mysqlGraduates) {
      const record = this.mapMysqlRecordToOracle(mysqlRecord);
      const existing = this.findMatchingGraduateForOracleRecord(
        record,
        localGraduates,
        usedGraduateIds,
      ) ?? undefined;

      if (existing) {
        usedGraduateIds.add(existing.id);
      }

      const sync = await this.upsertGraduateFromOracle(
        record,
        existing,
        'mysql:graduados',
      );
      if (sync.action === 'created') {
        result.created += 1;
        if (sync.graduate) {
          localGraduates.push(sync.graduate);
        }
      } else if (sync.action === 'updated') {
        result.updated += 1;
      } else if (sync.action === 'unchanged') {
        result.unchanged += 1;
      }
    }

    result.synced = result.created > 0 || result.updated > 0;
    return result;
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
    const issueDate = idIssueDate
      ? this.normalizeDateString(idIssueDate)
      : null;
    const gradDate = graduationDate
      ? this.normalizeDateString(graduationDate)
      : null;
    if (idIssueDate && !issueDate) {
      throw new BadRequestException('Fecha de expedición inválida');
    }
    if (graduationDate && !gradDate) {
      throw new BadRequestException('Fecha de graduación inválida');
    }

    const oracleSync = await this.syncGraduatesFromOracleByIdNumber(idNumber);

    if (oracleSync.enabled && !oracleSync.found) {
      return {
        existe: false,
        fuente: 'oracle-sinu',
        oracleSync,
        mensaje: 'No se encontró un graduado con esos datos en Oracle SINU',
      };
    }

    const where: any = {
      status: 'ACTIVE',
    };

    if (normalizedIdNumber) {
      where.idNumber = Raw(
        (alias) =>
          `REPLACE(REPLACE(REPLACE(${alias}, '.', ''), '-', ''), ' ', '') = :idNumber`,
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
        fuente: oracleSync.enabled ? 'oracle-sinu' : 'postgres',
        oracleSync,
        mensaje: 'No se encontró un graduado con esos datos',
      };
    }

    return {
      existe: true,
      graduado: graduate,
      fuente: oracleSync.enabled ? 'oracle-sinu' : 'postgres',
      oracleSync,
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
   * AUTOSERVICIO: Buscar coincidencias por cédula y similitud de nombre
   */
  async buscarCoincidenciasGraduado(
    idNumber: string,
    graduationDate?: string,
    lastName?: string,
  ) {
    const gradDate = graduationDate
      ? this.normalizeDateString(graduationDate)
      : null;
    if (graduationDate && !gradDate) {
      throw new BadRequestException('Fecha de graduación inválida');
    }

    const disabledSync: OracleGraduateSyncResult = {
      enabled: false,
      found: false,
      synced: false,
      created: 0,
      updated: 0,
      unchanged: 0,
    };
    const mysqlSync = await this.syncGraduatesFromMysqlByIdNumber(idNumber);
    let oracleSync = disabledSync;

    if (!mysqlSync.found) {
      oracleSync = await this.syncGraduatesFromOracleByIdNumber(idNumber);
    }

    const graduates = await this.findActiveGraduatesByIdNumber(idNumber);
    const fuente = mysqlSync.found
      ? 'mysql'
      : oracleSync.found
        ? 'oracle-sinu'
        : 'postgres';

    if (!graduates.length) {
      return {
        hasMatches: false,
        totalMatches: 0,
        suggestions: [],
        fuente,
        mysqlSync,
        oracleSync,
        message: 'No encontramos graduados activos con ese número de documento.',
      };
    }

    const suggestions = this.buildGraduateSuggestions(
      graduates,
      lastName,
      gradDate,
    ).slice(0, 3);

    return {
      hasMatches: suggestions.length > 0,
      totalMatches: graduates.length,
      suggestions,
      fuente,
      mysqlSync,
      oracleSync,
      message:
        'Selecciona la persona correcta para continuar con la generación del certificado.',
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
    const issueDate = dto.idIssueDate
      ? this.normalizeDateString(dto.idIssueDate)
      : null;
    const gradDate = dto.graduationDate
      ? this.normalizeDateString(dto.graduationDate)
      : null;
    const lastNameNormalized = dto.lastName
      ? this.normalizeName(dto.lastName)
      : '';
    const requesterName = (dto.requesterName || '').trim();
    const requesterEmail = (dto.requesterEmail || '').trim();
    const graduateLastName = (dto.lastName || '').trim();
    const companyName = (dto.companyName || '').trim();
    const companyNit = (dto.companyNit || '').trim();
    const contactPerson = (dto.contactPerson || '').trim();
    const normalizedRequesterType = this.normalizeRequesterType(
      dto.requesterType,
    );

    if (dto.idIssueDate && !issueDate) {
      throw new BadRequestException('Fecha de expedición inválida');
    }
    if (dto.graduationDate && !gradDate) {
      throw new BadRequestException('Fecha de graduación inválida');
    }

    this.logger.debug(
      `Solicitud landing: idNumber=${dto.idNumber?.trim()} idIssueDate=${dto.idIssueDate || 'N/A'} normalizada=${issueDate || 'N/A'}`,
    );

    const selectedGraduateId = (dto.selectedGraduateId || '').trim();
    let graduate: Graduate | null = null;

    if (selectedGraduateId) {
      graduate = await this.graduateRepository.findOne({
        where: {
          id: selectedGraduateId,
          status: 'ACTIVE',
        },
      });

      if (!graduate) {
        throw new BadRequestException(
          'El graduado seleccionado no existe o ya no está disponible',
        );
      }

      const selectedDocumentNumber = (graduate.idNumber || '').replace(
        /\D+/g,
        '',
      );
      if (
        normalizedIdNumber &&
        selectedDocumentNumber &&
        selectedDocumentNumber !== normalizedIdNumber
      ) {
        throw new BadRequestException(
          'La selección no coincide con el número de documento ingresado',
        );
      }
    } else {
      await this.syncGraduatesFromOracleByIdNumber(dto.idNumber);

      const where: any = {
        status: 'ACTIVE',
      };

      if (normalizedIdNumber) {
        where.idNumber = Raw(
          (alias) =>
            `REPLACE(REPLACE(REPLACE(${alias}, '.', ''), '-', ''), ' ', '') = :idNumber`,
          { idNumber: normalizedIdNumber },
        );
      } else {
        where.idNumber = dto.idNumber.trim();
      }

      graduate = await this.findGraduateMatch(where, {
        lastNameNormalized,
        issueDate,
        gradDate,
      });
    }

    if (!graduate) {
      this.logger.warn(
        `Graduado no encontrado para idNumber=${dto.idNumber?.trim()} idIssueDate=${issueDate || 'N/A'}`,
      );

      await this.expireOverdueManualReviewRequests();
      const activeManualReview =
        await this.findActiveManualReviewRequestByIdNumber(dto.idNumber);
      if (activeManualReview) {
        throw new ConflictException(
          'Ya registramos una solicitud de revisión manual para esta cédula y todavía se encuentra en proceso.',
        );
      }
    }

    const requestNumber = await this.generateRequestNumber();
    const parsedIssueDate = dto.idIssueDate
      ? this.parseDate(dto.idIssueDate)
      : undefined;
    const idIssueDate = graduate?.idIssueDate ?? parsedIssueDate ?? undefined;

    const requestPayload: DeepPartial<GraduationCertificateRequest> = {
      requestNumber,
      requesterType: normalizedRequesterType,
      graduateId: graduate?.id,
      idNumber: dto.idNumber,
      idIssueDate,
      fullName:
        this.getPreferredGraduateFullName(graduate) ||
        requesterName ||
        dto.requesterName,
      graduateLastName: graduateLastName || undefined,
      graduateEmail: graduate?.email,
      graduatePhone: graduate?.phone,
      programName: graduate?.programName || dto.programName || 'No disponible',
      graduationDate:
        graduate?.graduationDate || this.parseDate(dto.graduationDate) || null,
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
      const graduateEmail = (
        graduate?.email ||
        request.graduateEmail ||
        ''
      ).trim();
      if (!graduateEmail) {
        this.logger.warn(
          `Solicitud ${request.requestNumber}: no se pudo notificar al graduado porque no tiene email registrado`,
        );
      } else {
        try {
          await this.sendGraduateCompanyNotificationEmail({
            graduateEmail,
            graduateName: graduate?.fullName || request.fullName,
            companyName:
              companyName ||
              request.companyName ||
              requesterName ||
              'Empresa solicitante',
            companyNit: companyNit || request.companyNit,
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
    const graduationDate = request.graduationDate;
    const certificateFullName = this.resolveCertificateFullName(
      request,
      graduate,
      request.fullName,
    );

    if (!graduationDate) {
      throw new BadRequestException(
        'La fecha de grado es obligatoria para generar el certificado.',
      );
    }

    // Obtener firmante principal
    const signer = await this.signerRepository.findOne({
      where: { isPrimary: true, isActive: true },
    });

    if (!signer) {
      throw new NotFoundException('No se encontró un firmante activo');
    }

    const requestExtras = request as {
      programType?: string;
      degreeTitle?: string;
      campus?: string;
      seccionalName?: string;
      diplomaNumber?: string;
      actaNumber?: string;
    };

    // Generar número de certificado único
    const certificateNumber = await this.generateCertificateNumber();

    // Generar código de verificación único (QR)
    const verificationCode = await this.generateVerificationCode();

    const diplomaNumber =
      requestExtras.diplomaNumber || (await this.generateDiplomaNumber());
    const registroFolioLibro = this.buildRegistroFolioLibro(graduate);
    const actaNumber = registroFolioLibro || requestExtras.actaNumber || 'N/A';
    const activeTemplateConfig =
      await this.getOrCreateCertificateTemplateConfig();
    const templateSnapshot = this.buildCertificateTemplateSnapshot(
      activeTemplateConfig,
      frontendBaseUrl,
    );

    // Crear certificado
    const certificate = this.certificateRepository.create({
      requestId: request.id,
      graduateId: graduate?.id,
      certificateNumber,
      verificationCode,
      fullName: certificateFullName,
      idNumber: request.idNumber,
      programName: request.programName,
      programType:
        graduate?.programType || requestExtras.programType || 'Pregrado',
      degreeTitle:
        graduate?.degreeTitle ||
        requestExtras.degreeTitle ||
        request.programName,
      graduationDate,
      diplomaNumber,
      actaNumber,
      campus: graduate?.campus || requestExtras.campus,
      seccionalName: graduate?.seccionalName || requestExtras.seccionalName,
      signerName: signer.fullName,
      signerPosition: signer.position,
      signatureUrl: signer.signatureUrl,
      templateSnapshot,
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
      const pdfBuffer = await this.pdfGeneratorService.generateCertificatePDF(
        certificate,
        frontendBaseUrl,
      );
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
  async getCertificatePDF(
    id: string,
    frontendBaseUrl?: string,
  ): Promise<Buffer> {
    const certificate = await this.certificateRepository.findOne({
      where: { id },
      relations: ['graduate'],
    });

    if (!certificate) {
      throw new NotFoundException('Certificado no encontrado');
    }

    let shouldRegenerate = false;
    const registroFolioLibro = this.buildRegistroFolioLibro(
      certificate.graduate,
    );
    if (registroFolioLibro && certificate.actaNumber !== registroFolioLibro) {
      certificate.actaNumber = registroFolioLibro;
      await this.certificateRepository.save(certificate);
      shouldRegenerate = true;
    }

    const pdfFilename =
      certificate.pdfFilename ||
      (certificate.pdfUrl ? path.basename(certificate.pdfUrl) : undefined);

    if (pdfFilename && !shouldRegenerate) {
      const storedPdf = this.getStoredCertificatePdf(certificate);
      if (storedPdf) {
        return storedPdf.content;
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
      relations: ['request', 'graduate'],
    });

    if (!certificate) {
      throw new NotFoundException('Certificado no encontrado');
    }

    await this.syncAutomaticCertificateFullName(
      certificate,
      certificate.request,
      certificate.graduate,
    );

    let requesterEmail: string | undefined =
      certificate.request?.requesterEmail;

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
      throw new BadRequestException(
        'No hay un email de solicitante asociado ni se encontró email del graduado',
      );
    }

    await this.sendCertificateEmail(
      requesterEmail,
      certificate,
      frontendBaseUrl,
    );

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

  private async findActiveGraduatesByIdNumber(
    idNumber: string,
  ): Promise<Graduate[]> {
    const normalizedIdNumber = (idNumber || '').replace(/\D+/g, '');
    const trimmedIdNumber = (idNumber || '').trim();

    if (!normalizedIdNumber && !trimmedIdNumber) {
      return [];
    }

    const where: Record<string, any> = {
      status: 'ACTIVE',
    };

    if (normalizedIdNumber) {
      where.idNumber = Raw(
        (alias) =>
          `REPLACE(REPLACE(REPLACE(${alias}, '.', ''), '-', ''), ' ', '') = :idNumber`,
        { idNumber: normalizedIdNumber },
      );
    } else {
      where.idNumber = trimmedIdNumber;
    }

    return this.graduateRepository.find({ where });
  }

  private async findActiveManualReviewRequestByIdNumber(
    idNumber: string,
  ): Promise<GraduationCertificateRequest | null> {
    await this.expireOverdueManualReviewRequests();

    const normalizedIdNumber = (idNumber || '').replace(/\D+/g, '');
    const trimmedIdNumber = (idNumber || '').trim();

    if (!normalizedIdNumber && !trimmedIdNumber) {
      return null;
    }

    const query = this.requestRepository
      .createQueryBuilder('request')
      .where('request.manualReview = :manualReview', { manualReview: true })
      .andWhere('request.status IN (:...statuses)', {
        statuses: ['PENDING', 'PROCESSING'],
      });

    if (normalizedIdNumber) {
      query.andWhere(
        `REPLACE(REPLACE(REPLACE(request.idNumber, '.', ''), '-', ''), ' ', '') = :idNumber`,
        { idNumber: normalizedIdNumber },
      );
    } else {
      query.andWhere('request.idNumber = :idNumber', {
        idNumber: trimmedIdNumber,
      });
    }

    return query.orderBy('request.requestDate', 'DESC').getOne();
  }

  private splitFullName(fullName?: string): {
    firstName: string;
    lastName: string;
  } {
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
          this.normalizeDateString(graduate.graduationDate) ===
          options.gradDate,
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
    const composedFromParts =
      `${(graduate.firstName || '').trim()} ${(graduate.lastName || '').trim()}`.trim();
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
    const composedFromParts =
      `${(graduate.firstName || '').trim()} ${(graduate.lastName || '').trim()}`.trim();
    if (composedFromParts) {
      return composedFromParts;
    }
    return (graduate.fullName || '').trim();
  }

  private resolveCertificateFullName(
    request?: GraduationCertificateRequest | null,
    graduate?: Graduate | null,
    fallbackFullName?: string | null,
  ): string {
    const safeFallback = (fallbackFullName || request?.fullName || '').trim();
    if (request?.manualReview) {
      return safeFallback;
    }

    const graduateFullName = (graduate?.fullName || '').trim();
    return graduateFullName || safeFallback;
  }

  private async syncAutomaticCertificateFullName(
    certificate: GraduationCertificate,
    request?: GraduationCertificateRequest | null,
    graduate?: Graduate | null,
  ): Promise<void> {
    const resolvedFullName = this.resolveCertificateFullName(
      request,
      graduate,
      certificate.fullName,
    );
    const currentFullName = (certificate.fullName || '').trim();

    if (!resolvedFullName || resolvedFullName === currentFullName) {
      return;
    }

    certificate.fullName = resolvedFullName;
    Object.assign(certificate, {
      pdfFilename: null,
      pdfUrl: null,
    });
    await this.certificateRepository.save(certificate);
  }

  private buildGraduateSuggestions(
    graduates: Graduate[],
    providedName?: string,
    gradDate?: string | null,
  ): GraduateSuggestion[] {
    const providedTokens = this.tokenizeName(providedName || '');

    return graduates
      .map((graduate) => {
        const fullName = this.getPreferredGraduateFullName(graduate);
        const graduateTokens = this.tokenizeName(fullName);
        const orderedMetrics = this.getOrderedTokenMatchMetrics(
          providedTokens,
          graduateTokens,
        );
        const exactGraduationDateMatch = Boolean(
          gradDate &&
            this.normalizeDateString(graduate.graduationDate) === gradDate,
        );
        const shorterLength =
          providedTokens.length && graduateTokens.length
            ? Math.min(providedTokens.length, graduateTokens.length)
            : 0;
        const fullOrderedOverlap =
          shorterLength > 0 && orderedMetrics.matchedCount === shorterLength;

        let score = 100;

        if (providedTokens.length) {
          score += orderedMetrics.matchedCount * 20;
          score += orderedMetrics.exactMatches * 10;
          score += orderedMetrics.fuzzyMatches * 6;
          if (fullOrderedOverlap) {
            score += 20;
          }
        }

        if (exactGraduationDateMatch) {
          score += 15;
        }

        return {
          graduateId: graduate.id,
          fullName,
          idNumber: graduate.idNumber,
          programName: graduate.programName,
          degreeTitle: graduate.degreeTitle,
          graduationDate: this.normalizeDateString(graduate.graduationDate),
          campus: graduate.campus,
          seccionalName: graduate.seccionalName,
          score,
          matchedTokens: orderedMetrics.matchedCount,
          exactTokenMatches: orderedMetrics.exactMatches,
          fuzzyTokenMatches: orderedMetrics.fuzzyMatches,
          totalGraduateTokens: graduateTokens.length,
          totalProvidedTokens: providedTokens.length,
          exactGraduationDateMatch,
        };
      })
      .sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score;
        }
        if (
          Number(right.exactGraduationDateMatch) !==
          Number(left.exactGraduationDateMatch)
        ) {
          return (
            Number(right.exactGraduationDateMatch) -
            Number(left.exactGraduationDateMatch)
          );
        }
        if (right.matchedTokens !== left.matchedTokens) {
          return right.matchedTokens - left.matchedTokens;
        }
        if (right.exactTokenMatches !== left.exactTokenMatches) {
          return right.exactTokenMatches - left.exactTokenMatches;
        }

        const leftGrad =
          this.parseDate(left.graduationDate || undefined)?.getTime() || 0;
        const rightGrad =
          this.parseDate(right.graduationDate || undefined)?.getTime() || 0;

        return rightGrad - leftGrad;
      });
  }

  private getOrderedTokenMatchMetrics(
    providedTokens: string[],
    graduateTokens: string[],
  ): OrderedTokenMatchMetrics {
    if (!providedTokens.length || !graduateTokens.length) {
      return {
        matchedCount: 0,
        exactMatches: 0,
        fuzzyMatches: 0,
      };
    }

    const dp: OrderedTokenMatchMetrics[][] = Array.from(
      { length: providedTokens.length + 1 },
      () =>
        Array.from({ length: graduateTokens.length + 1 }, () => ({
          matchedCount: 0,
          exactMatches: 0,
          fuzzyMatches: 0,
        })),
    );

    for (
      let providedIndex = providedTokens.length - 1;
      providedIndex >= 0;
      providedIndex -= 1
    ) {
      for (
        let graduateIndex = graduateTokens.length - 1;
        graduateIndex >= 0;
        graduateIndex -= 1
      ) {
        let bestMatch = dp[providedIndex + 1][graduateIndex];
        bestMatch = this.pickBetterOrderedTokenMatch(
          bestMatch,
          dp[providedIndex][graduateIndex + 1],
        );

        const comparison = this.compareNameTokens(
          providedTokens[providedIndex],
          graduateTokens[graduateIndex],
        );

        if (comparison.isMatch) {
          const nextMatch = dp[providedIndex + 1][graduateIndex + 1];
          bestMatch = this.pickBetterOrderedTokenMatch(bestMatch, {
            matchedCount: nextMatch.matchedCount + 1,
            exactMatches: nextMatch.exactMatches + (comparison.isExact ? 1 : 0),
            fuzzyMatches: nextMatch.fuzzyMatches + (comparison.isExact ? 0 : 1),
          });
        }

        dp[providedIndex][graduateIndex] = bestMatch;
      }
    }

    return dp[0][0];
  }

  private pickBetterOrderedTokenMatch(
    current: OrderedTokenMatchMetrics,
    candidate: OrderedTokenMatchMetrics,
  ): OrderedTokenMatchMetrics {
    if (candidate.matchedCount !== current.matchedCount) {
      return candidate.matchedCount > current.matchedCount
        ? candidate
        : current;
    }
    if (candidate.exactMatches !== current.exactMatches) {
      return candidate.exactMatches > current.exactMatches
        ? candidate
        : current;
    }
    if (candidate.fuzzyMatches !== current.fuzzyMatches) {
      return candidate.fuzzyMatches < current.fuzzyMatches
        ? candidate
        : current;
    }

    return current;
  }

  private compareNameTokens(
    leftToken: string,
    rightToken: string,
  ): { isMatch: boolean; isExact: boolean } {
    if (!leftToken || !rightToken) {
      return { isMatch: false, isExact: false };
    }

    if (leftToken === rightToken) {
      return { isMatch: true, isExact: true };
    }

    if (Math.min(leftToken.length, rightToken.length) < 4) {
      return { isMatch: false, isExact: false };
    }

    const maxLength = Math.max(leftToken.length, rightToken.length);
    const allowedDistance = maxLength >= 8 ? 2 : 1;
    const distance = this.calculateLevenshteinDistance(leftToken, rightToken);

    if (distance <= allowedDistance) {
      return { isMatch: true, isExact: false };
    }

    return { isMatch: false, isExact: false };
  }

  private calculateLevenshteinDistance(left: string, right: string): number {
    if (left === right) {
      return 0;
    }

    const rows = left.length + 1;
    const cols = right.length + 1;
    const matrix: number[][] = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => 0),
    );

    for (let row = 0; row < rows; row += 1) {
      matrix[row][0] = row;
    }

    for (let col = 0; col < cols; col += 1) {
      matrix[0][col] = col;
    }

    for (let row = 1; row < rows; row += 1) {
      for (let col = 1; col < cols; col += 1) {
        const substitutionCost = left[row - 1] === right[col - 1] ? 0 : 1;
        matrix[row][col] = Math.min(
          matrix[row - 1][col] + 1,
          matrix[row][col - 1] + 1,
          matrix[row - 1][col - 1] + substitutionCost,
        );
      }
    }

    return matrix[rows - 1][cols - 1];
  }

  private matchesLastName(
    graduate: Graduate,
    lastNameNormalized: string,
  ): boolean {
    if (!lastNameNormalized) return true;

    const providedTokens = this.tokenizeName(lastNameNormalized);

    // Regla de negocio solicitada: mínimo 2 palabras para validar nombre.
    if (!providedTokens.length) {
      return false;
    }

    const nameVariants = this.getGraduateNameVariants(graduate);
    if (!nameVariants.length) return false;

    for (const nameVariant of nameVariants) {
      const fullNameTokens = this.tokenizeName(nameVariant);
      if (!fullNameTokens.length) {
        continue;
      }

      const shorterLength = Math.min(
        providedTokens.length,
        fullNameTokens.length,
      );
      const metrics = this.getOrderedTokenMatchMetrics(
        providedTokens,
        fullNameTokens,
      );

      if (shorterLength > 0 && metrics.matchedCount === shorterLength) {
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
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } =
      process.env;
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
    const storedPdf = this.getStoredCertificatePdf(certificate);
    if (storedPdf) {
      return storedPdf;
    }

    const buffer = await this.pdfGeneratorService.generateCertificatePDF(
      certificate,
      frontendBaseUrl,
    );

    const filename =
      certificate.pdfFilename || `${certificate.certificateNumber}.pdf`;

    try {
      const storagePath =
        process.env.STORAGE_PATH || './uploads/graduation-certificates';

      if (!fs.existsSync(storagePath)) {
        fs.mkdirSync(storagePath, { recursive: true });
      }

      const pdfFilePath = path.join(storagePath, filename);
      fs.writeFileSync(pdfFilePath, buffer);

      if (certificate.pdfFilename !== filename || !certificate.pdfUrl) {
        certificate.pdfFilename = filename;
        certificate.pdfUrl = `/uploads/graduation-certificates/${filename}`;
        await this.certificateRepository.save(certificate);
      }
    } catch (err) {
      this.logger.warn(`No se pudo guardar el PDF regenerado en disco: ${err}`);
    }

    return {
      filename,
      content: buffer,
    };

    /*

    const filename =
      certificate.pdfFilename || `${certificate.certificateNumber}.pdf`;

    try {
      const storagePath =
        process.env.STORAGE_PATH || './uploads/graduation-certificates';

      if (!fs.existsSync(storagePath)) {
        fs.mkdirSync(storagePath, { recursive: true });
      }

      const pdfFilePath = path.join(storagePath, filename);

        fs.writeFileSync(pdfFilePath, buffer);

        // Actualizar registro si es necesario (aunque ya debería tener el nombre)
        if (!certificate.pdfFilename) {
          certificate.pdfFilename = pdfFilename;
          certificate.pdfUrl = `/uploads/graduation-certificates/${pdfFilename}`;
          await this.certificateRepository.save(certificate);
        }

        this.logger.log(
          `PDF regenerado y actualizado en disco: ${pdfFilePath}`,
        );
      } catch (err) {
        this.logger.warn(
          `No se pudo guardar el PDF regenerado en disco: ${err}`,
        );
      }

      return {
        filename: `${certificate.certificateNumber}.pdf`,
        content: buffer,
      };
    }

    if (certificate.pdfFilename) {
      const pdfFilePath = this.resolveExistingPdfPath(certificate.pdfFilename);
      if (pdfFilePath) {
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
    */
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
      this.logger.warn('No se pudo enviar el certificado: email vacío');
      return;
    }

    const baseUrl = this.resolveNotificationsBaseUrl();
    const url = `${baseUrl}/api/v1/emails/send-with-attachment`;

    const validationUrl = `${this.resolveCertificateValidationBaseUrl(
      certificate,
      frontendBaseUrl,
    )}/verificar-certificado/${certificate.verificationCode}`;

    const trimmedReviewNotes = (reviewNotes || '').trim();
    const publicReviewNotesText = trimmedReviewNotes
      ? `\nNotas del jefe: ${trimmedReviewNotes}`
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
      subject: `Certificado de verificación de título - ${certificate.certificateNumber}`,
      text: `Adjunto encontraras el certificado de verificacion de titulo solicitado.\n\nCodigo de verificacion: ${certificate.verificationCode}\nURL de validacion: ${validationUrl}${publicReviewNotesText}`,
      html: `
        <div style="font-family: Arial,'Helvetica Neue',sans-serif; background-color: #f0f4f8; padding: 32px 16px; margin: 0;">
          <table width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center">
            <table cellspacing="0" cellpadding="0" border="0" style="max-width:560px;width:100%;background-color:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #dde3ed;">
              <tr>
                <td style="background-image:linear-gradient(135deg,#003DA5 0%,#1565C0 100%);background-color:#003DA5;padding:0;">
                  <table width="100%" cellspacing="0" cellpadding="0" border="0">
                    <tr><td style="height:4px;background-color:#818CF8;font-size:0;line-height:0;">&nbsp;</td></tr>
                    <tr><td style="padding:22px 28px 18px 28px;">
                      <table width="100%" cellspacing="0" cellpadding="0" border="0"><tr>
                        <td><div style="font-size:20px;font-weight:800;color:#ffffff;">ESAP</div><div style="font-size:10px;color:rgba(255,255,255,0.7);margin-top:2px;letter-spacing:0.8px;text-transform:uppercase;">Registro Académico</div></td>
                        <td align="right"><span style="background-color:rgba(255,255,255,0.18);color:#ffffff;font-size:11px;font-weight:600;padding:4px 12px;border-radius:20px;">Verificación de Título</span></td>
                      </tr></table>
                    </td></tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:32px 28px 8px 28px;">
                  <h1 style="margin:0 0 6px 0;font-size:22px;font-weight:700;color:#111827;">Certificado de verificación de título</h1>
                  <p style="margin:0 0 24px 0;font-size:14px;color:#6b7280;line-height:1.6;">Adjunto encontrarás el certificado solicitado. Guarda los siguientes datos para futuras consultas o validaciones.</p>
                  <table width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;margin-bottom:16px;">
                    <tr><td style="padding:16px 20px;">
                      <p style="margin:0 0 12px 0;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.6px;">Datos de verificación</p>
                      <table width="100%" cellspacing="0" cellpadding="0" border="0">
                        <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;">
                          <span style="font-size:12px;color:#6b7280;">Código de verificación</span><br>
                          <span style="font-size:15px;font-weight:700;color:#1d4ed8;letter-spacing:1px;">${certificate.verificationCode}</span>
                        </td></tr>
                        <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;">
                          <span style="font-size:12px;color:#6b7280;">URL de validación</span><br>
                          <a href="${validationUrl}" style="font-size:13px;color:#2563eb;text-decoration:underline;">${validationUrl}</a>
                        </td></tr>
                        <tr><td style="padding:8px 0;">
                          <span style="font-size:12px;color:#6b7280;">Archivo adjunto</span><br>
                          <span style="font-size:14px;font-weight:600;color:#374151;">${attachment.filename}</span>
                        </td></tr>
                      </table>
                    </td></tr>
                  </table>
                  ${
                    trimmedReviewNotes
                      ? `<table width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#fffbeb;border:1px solid #fde68a;border-radius:8px;margin-bottom:16px;"><tr><td style="padding:14px 16px;"><p style="margin:0 0 4px 0;font-size:11px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.5px;">Notas del jefe</p><p style="margin:0;font-size:13px;color:#78350f;white-space:pre-line;line-height:1.6;">${safeReviewNotes}</p></td></tr></table>`
                      : ''
                  }
                </td>
              </tr>
              <tr>
                <td style="padding:14px 28px 18px 28px;background-color:#f8fafc;border-top:1px solid #e2e8f0;">
                  <p style="margin:0;font-size:12px;color:#9ca3af;">ESAP — Escuela Superior de Administración Pública</p>
                  
                </td>
              </tr>
            </table>
          </td></tr></table>
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
      this.logger.warn(
        'No se pudo enviar la notificación al graduado: email vacío',
      );
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
    const companyNit = (data.companyNit || '').trim();
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
    const nitTextLine = companyNit ? `NIT: ${companyNit}.\n` : '';
    const text =
      `Hola ${data.graduateName || 'graduado'},\n` +
      `La empresa ${companyName} solicito un certificado de egresado a tu nombre.\n` +
      nitTextLine +
      `Fecha y hora de la solicitud: ${formattedDate}.\n` +
      `Persona de contacto: ${contactPerson}.\n` +
      `Correo de contacto: ${contactEmail}.\n` +
      `Número de certificado: ${certificateNumber}.\n` +
      'Si no reconoces esta solicitud, por favor comunicate con ESAP.';

    const safeGraduateName = safe(data.graduateName || 'Graduado');
    const safeCompanyName = safe(companyName);
    const safeCompanyNit = companyNit ? safe(companyNit) : '';
    const safeContactPerson = safe(contactPerson);
    const safeContactEmail = safe(contactEmail);
    const safeCertificateNumber = safe(certificateNumber);
    const safeFormattedDate = safe(formattedDate);
    const nitHtmlRow = companyNit
      ? `<tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;"><span style="font-size:12px;color:#6b7280;">NIT</span><br><span style="font-size:14px;font-weight:600;color:#374151;">${safeCompanyNit}</span></td></tr>`
      : '';

    const html = `
      <div style="font-family: Arial,'Helvetica Neue',sans-serif; background-color: #f0f4f8; padding: 32px 16px; margin: 0;">
        <table width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center">
          <table cellspacing="0" cellpadding="0" border="0" style="max-width:560px;width:100%;background-color:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #dde3ed;">
            <tr>
              <td style="background-image:linear-gradient(135deg,#003DA5 0%,#1565C0 100%);background-color:#003DA5;padding:0;">
                <table width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr><td style="height:4px;background-color:#FCD34D;font-size:0;line-height:0;">&nbsp;</td></tr>
                  <tr><td style="padding:22px 28px 18px 28px;">
                    <table width="100%" cellspacing="0" cellpadding="0" border="0"><tr>
                      <td><div style="font-size:20px;font-weight:800;color:#ffffff;">ESAP</div><div style="font-size:10px;color:rgba(255,255,255,0.7);margin-top:2px;letter-spacing:0.8px;text-transform:uppercase;">Registro Académico</div></td>
                      <td align="right"><span style="background-color:rgba(252,211,77,0.25);color:#ffffff;font-size:11px;font-weight:600;padding:4px 12px;border-radius:20px;">Aviso de solicitud</span></td>
                    </tr></table>
                  </td></tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 28px 8px 28px;">
                <h1 style="margin:0 0 6px 0;font-size:22px;font-weight:700;color:#111827;">Una empresa solicitó tu certificado</h1>
                <p style="margin:0 0 24px 0;font-size:14px;color:#6b7280;line-height:1.6;">Hola <strong style="color:#374151;">${safeGraduateName}</strong>, te informamos que una empresa solicitó verificar tu información de egresado de la ESAP.</p>
                <table width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;margin-bottom:16px;">
                  <tr><td style="padding:16px 20px;">
                    <p style="margin:0 0 12px 0;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.6px;">Datos de la solicitud</p>
                    <table width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;"><span style="font-size:12px;color:#6b7280;">Empresa</span><br><span style="font-size:14px;font-weight:700;color:#111827;">${safeCompanyName}</span></td></tr>
                      ${nitHtmlRow}
                      <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;"><span style="font-size:12px;color:#6b7280;">Persona de contacto</span><br><span style="font-size:14px;font-weight:600;color:#374151;">${safeContactPerson}</span></td></tr>
                      <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;"><span style="font-size:12px;color:#6b7280;">Correo de contacto</span><br><span style="font-size:14px;color:#374151;">${safeContactEmail}</span></td></tr>
                      <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;"><span style="font-size:12px;color:#6b7280;">Fecha y hora</span><br><span style="font-size:14px;color:#374151;">${safeFormattedDate}</span></td></tr>
                      <tr><td style="padding:8px 0;"><span style="font-size:12px;color:#6b7280;">Número de certificado</span><br><span style="font-size:15px;font-weight:700;color:#1d4ed8;">${safeCertificateNumber}</span></td></tr>
                    </table>
                  </td></tr>
                </table>
                <table width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#fffbeb;border:1px solid #fde68a;border-radius:8px;margin-bottom:24px;">
                  <tr><td style="padding:12px 16px;font-size:13px;color:#92400e;line-height:1.5;">&#9888; Si no reconoces esta solicitud, contacta a ESAP para verificar la información.</td></tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 28px 18px 28px;background-color:#f8fafc;border-top:1px solid #e2e8f0;">
                <p style="margin:0;font-size:12px;color:#9ca3af;">ESAP — Escuela Superior de Administración Pública</p>
                
              </td>
            </tr>
          </table>
        </td></tr></table>
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

  private resolveTemplateUpdatedBy(updatedBy?: string): string {
    const actor = String(updatedBy || '').trim();
    return actor || 'Sistema';
  }

  private resolveCertificatePublicBaseUrl(frontendBaseUrl?: string): string {
    const raw =
      String(frontendBaseUrl || '').trim() ||
      String(process.env.FRONTEND_URL || '').trim() ||
      'https://certificados.esap.edu.co';

    return raw.replace(/\/$/, '');
  }

  private resolveCertificateValidationBaseUrl(
    certificate: GraduationCertificate,
    frontendBaseUrl?: string,
  ): string {
    const snapshot = parseGraduationCertificateTemplateSnapshot(
      certificate.templateSnapshot,
    );

    return (
      snapshot?.validationBaseUrl ||
      this.resolveCertificatePublicBaseUrl(frontendBaseUrl)
    );
  }

  private buildCertificateTemplateSnapshot(
    config: TemplateConfig,
    frontendBaseUrl?: string,
  ) {
    const hasElectronicSignature =
      Boolean(config.signatureUrlOverride?.trim()) &&
      Boolean(config.signerNameOverride?.trim());

    return buildGraduationCertificateTemplateSnapshot({
      id: config.id,
      version: config.version,
      updatedAt: config.updatedAt,
      validationBaseUrl: this.resolveCertificatePublicBaseUrl(frontendBaseUrl),
      typographyFont: config.typographyFont,
      signerId: config.signerId,
      institutionLogoUrl: config.institutionLogoUrl,
      institutionLogoFilename: config.institutionLogoFilename,
      signerNameOverride: config.signerNameOverride,
      signatureUrlOverride: config.signatureUrlOverride,
      signatureFilenameOverride: config.signatureFilenameOverride,
      signerTitleOverride: hasElectronicSignature
        ? config.signerTitleOverride
        : DEFAULT_GRADUATION_CERTIFICATE_TEMPLATE_TEXTS.signerTitle,
      certificateContentHtml: config.certificateContentHtml,
    });
  }

  private async getOrCreateCertificateTemplateConfig(): Promise<TemplateConfig> {
    const existing = await this.templateConfigRepository.findOne({
      where: { isActive: true },
      order: { updatedAt: 'DESC', id: 'DESC' },
    });

    if (existing) {
      let changed = false;

      if (
        !parseGraduationCertificateTemplateTexts(
          existing.certificateContentHtml,
        )
      ) {
        existing.certificateContentHtml =
          serializeGraduationCertificateTemplateTexts(
            DEFAULT_GRADUATION_CERTIFICATE_TEMPLATE_TEXTS,
          );
        changed = true;
      }

      if (!existing.signerTitleOverride?.trim()) {
        existing.signerTitleOverride =
          DEFAULT_GRADUATION_CERTIFICATE_TEMPLATE_TEXTS.signerTitle;
        changed = true;
      }

      if (changed) {
        existing.updatedBy = existing.updatedBy || 'Sistema';
        await this.templateConfigRepository.save(existing);
      }

      return existing;
    }

    const signer = await this.signerRepository.findOne({
      where: { isPrimary: true, isActive: true },
    });

    const created = this.templateConfigRepository.create({
      signerId: signer?.id,
      typographyFont: 'Arial Narrow, Arial, sans-serif',
      signerTitleOverride:
        DEFAULT_GRADUATION_CERTIFICATE_TEMPLATE_TEXTS.signerTitle,
      certificateContentHtml: serializeGraduationCertificateTemplateTexts(
        DEFAULT_GRADUATION_CERTIFICATE_TEMPLATE_TEXTS,
      ),
      version: '1.0.0',
      status: 'published',
      createdBy: 'Sistema',
      updatedBy: 'Sistema',
      isActive: true,
    });

    return this.templateConfigRepository.save(created);
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

  private isBusinessDay(date: Date): boolean {
    const day = date.getDay();
    return day !== 0 && day !== 6;
  }

  private getManualReviewExpirationDate(requestDate?: Date | string | null) {
    if (!requestDate) {
      return null;
    }

    const deadline = new Date(requestDate);
    if (Number.isNaN(deadline.getTime())) {
      return null;
    }

    let addedBusinessDays = 0;
    while (addedBusinessDays < this.manualReviewExpirationBusinessDays) {
      deadline.setDate(deadline.getDate() + 1);
      if (this.isBusinessDay(deadline)) {
        addedBusinessDays += 1;
      }
    }

    deadline.setHours(23, 59, 59, 999);
    return deadline;
  }

  private isManualReviewExpirable(request: GraduationCertificateRequest) {
    return (
      request.manualReview &&
      ['PENDING', 'PROCESSING'].includes((request.status || '').toUpperCase())
    );
  }

  private isManualReviewExpired(
    request: GraduationCertificateRequest,
    now = new Date(),
  ) {
    if (!this.isManualReviewExpirable(request)) {
      return false;
    }

    const expiresAt = this.getManualReviewExpirationDate(request.requestDate);
    return !!expiresAt && now.getTime() > expiresAt.getTime();
  }

  private async expireManualReviewRequestIfNeeded(
    request: GraduationCertificateRequest,
    now = new Date(),
  ) {
    if (!this.isManualReviewExpired(request, now)) {
      return request;
    }

    request.status = 'EXPIRED';
    request.reviewedAt = request.reviewedAt || now;
    request.completionDate = request.completionDate || now;
    request.reviewResolution = request.reviewResolution || 'expired';
    request.reviewNotes =
      request.reviewNotes ||
      `Solicitud vencida automaticamente por superar ${this.manualReviewExpirationBusinessDays} dias habiles sin resolucion.`;

    return this.requestRepository.save(request);
  }

  private async expireOverdueManualReviewRequests(now = new Date()) {
    const activeRequests = await this.requestRepository.find({
      where: [
        { manualReview: true, status: 'PENDING' },
        { manualReview: true, status: 'PROCESSING' },
      ],
    });

    const expired = activeRequests.filter((request) =>
      this.isManualReviewExpired(request, now),
    );

    if (!expired.length) {
      return;
    }

    await Promise.all(
      expired.map((request) =>
        this.expireManualReviewRequestIfNeeded(request, now),
      ),
    );
  }

  private ensureManualReviewRequestIsActionable(
    request: GraduationCertificateRequest,
  ) {
    if ((request.status || '').toUpperCase() === 'EXPIRED') {
      throw new BadRequestException(
        'La solicitud expiro por superar los 15 dias habiles de revision. Crea una nueva solicitud para continuar.',
      );
    }
  }

  /**
   * ADMIN: Listar todos los graduados
   */
  async listarGraduados() {
    return await this.graduateRepository
      .createQueryBuilder('graduate')
      .loadRelationCountAndMap('graduate.filesCount', 'graduate.files')
      .orderBy('graduate.createdAt', 'DESC')
      .addOrderBy('graduate.graduationDate', 'DESC')
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
      originalName: this.normalizeOriginalFileName(file.originalName),
      url: `/uploads/graduate-files/${file.storedName}`,
    }));
  }

  async obtenerArchivoGraduadoParaDescarga(graduateId: string, fileId: string) {
    const file = await this.graduateFileRepository.findOne({
      where: { id: fileId, graduateId },
    });
    if (!file) {
      throw new NotFoundException('Archivo no encontrado');
    }

    const storageDir = path.join(process.cwd(), 'uploads', 'graduate-files');
    let filePath = path.join(storageDir, file.storedName);

    if (!fs.existsSync(filePath)) {
      try {
        const storedNameLower = file.storedName.toLowerCase();
        const matchedFile = fs
          .readdirSync(storageDir)
          .find((entry) => entry.toLowerCase() === storedNameLower);

        if (matchedFile) {
          filePath = path.join(storageDir, matchedFile);
        }
      } catch (error) {
        this.logger.warn(
          `No se pudo inspeccionar carpeta de archivos de graduados (${storageDir}): ${error}`,
        );
      }
    }

    if (!fs.existsSync(filePath)) {
      this.logger.warn(
        `Archivo fisico no encontrado para graduateId=${graduateId}, fileId=${fileId}, storedName=${file.storedName}`,
      );
      throw new NotFoundException('Archivo no encontrado en almacenamiento');
    }

    file.originalName = this.normalizeOriginalFileName(file.originalName);
    return { file, filePath };
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
      return !(
        allowedExtensions.has(ext) || allowedMimeTypes.has(file.mimetype)
      );
    });
    if (invalidFile) {
      throw new BadRequestException(
        'Solo se permiten archivos PDF, Word, Excel o imágenes',
      );
    }

    const records = files.map((file) =>
      this.graduateFileRepository.create({
        graduateId: graduate.id,
        originalName: this.normalizeOriginalFileName(file.originalname),
        storedName: file.filename,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        uploadedBy: uploadedBy || undefined,
      }),
    );

    const saved = await this.graduateFileRepository.save(records);
    return saved.map((file) => ({
      ...file,
      originalName: this.normalizeOriginalFileName(file.originalName),
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

    const filePath = path.join(
      process.cwd(),
      'uploads',
      'graduate-files',
      file.storedName,
    );
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (error) {
        this.logger.warn(
          `No se pudo eliminar el archivo fisico ${filePath}: ${error}`,
        );
      }
    }

    await this.graduateFileRepository.delete({ id: fileId });
    return { mensaje: 'Archivo eliminado correctamente' };
  }

  /**
   * ADMIN: Buscar graduado por cédula
   */
  async listarArchivosRevisionSolicitud(requestId: string) {
    const request = await this.requestRepository.findOne({
      where: { id: requestId },
    });
    if (!request) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    const files = await this.reviewFileRepository.find({
      where: { requestId },
      order: { uploadedAt: 'DESC' },
    });

    return files.map((file) => ({
      ...file,
      originalName: this.normalizeOriginalFileName(file.originalName),
      url: `/uploads/graduation-review-files/${file.storedName}`,
    }));
  }

  async obtenerArchivoRevisionSolicitudParaDescarga(
    requestId: string,
    fileId: string,
  ) {
    const file = await this.reviewFileRepository.findOne({
      where: { id: fileId, requestId },
    });
    if (!file) {
      throw new NotFoundException('Archivo no encontrado');
    }

    const storageDir = path.join(
      process.cwd(),
      'uploads',
      'graduation-review-files',
    );
    const filePath = path.join(storageDir, file.storedName);

    if (!fs.existsSync(filePath)) {
      this.logger.warn(
        `Archivo fisico de revision no encontrado para requestId=${requestId}, fileId=${fileId}, storedName=${file.storedName}`,
      );
      throw new NotFoundException('Archivo no encontrado en almacenamiento');
    }

    file.originalName = this.normalizeOriginalFileName(file.originalName);
    return { file, filePath };
  }

  async eliminarArchivoRevisionSolicitud(requestId: string, fileId: string) {
    const request = await this.requestRepository.findOne({
      where: { id: requestId },
    });
    if (!request) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    await this.expireManualReviewRequestIfNeeded(request);
    this.ensureManualReviewRequestIsActionable(request);

    if (
      [
        'PENDING_APPROVAL',
        'PENDING_HEAD_APPROVAL',
        'APPROVED_FINAL',
        'REJECTED_FINAL',
      ].includes(
        request.approvalStatus || '',
      )
    ) {
      throw new BadRequestException(
        'No se pueden modificar archivos en el estado actual de la solicitud',
      );
    }

    const file = await this.reviewFileRepository.findOne({
      where: { id: fileId, requestId },
    });
    if (!file) {
      throw new NotFoundException('Archivo no encontrado');
    }

    const filePath = path.join(
      process.cwd(),
      'uploads',
      'graduation-review-files',
      file.storedName,
    );

    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (error) {
        this.logger.warn(
          `No se pudo eliminar el archivo fisico de revision ${filePath}: ${error}`,
        );
      }
    }

    await this.reviewFileRepository.delete({ id: fileId, requestId });
    return { mensaje: 'Archivo eliminado correctamente' };
  }

  async subirArchivosRevisionSolicitud(
    requestId: string,
    files: Express.Multer.File[],
    uploadedBy?: string,
    uploadedByEmail?: string,
  ) {
    const request = await this.requestRepository.findOne({
      where: { id: requestId },
    });
    if (!request) {
      throw new NotFoundException('Solicitud no encontrada');
    }
    await this.expireManualReviewRequestIfNeeded(request);
    this.ensureManualReviewRequestIsActionable(request);
    if (
      [
        'PENDING_APPROVAL',
        'PENDING_HEAD_APPROVAL',
        'APPROVED_FINAL',
        'REJECTED_FINAL',
      ].includes(
        request.approvalStatus || '',
      )
    ) {
      throw new BadRequestException(
        'No se pueden cargar archivos en el estado actual de la solicitud',
      );
    }
    if (!files || files.length === 0) {
      throw new BadRequestException('No se recibieron archivos para cargar');
    }

    const existingCount = await this.reviewFileRepository.count({
      where: { requestId },
    });
    if (existingCount + files.length > 5) {
      throw new BadRequestException('Solo se permiten maximo 5 archivos');
    }

    const records = files.map((file) =>
      this.reviewFileRepository.create({
        requestId,
        originalName: this.normalizeOriginalFileName(file.originalname),
        storedName: file.filename,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        uploadedBy: uploadedBy || undefined,
      }),
    );

    const saved = await this.reviewFileRepository.save(records);
    this.appendOrMergeReviewFileUploadTimeline(request, {
      fileCount: saved.length,
      actorName: uploadedBy,
      actorEmail: uploadedByEmail,
    });
    await this.requestRepository.save(request);

    return saved.map((file) => ({
      ...file,
      originalName: this.normalizeOriginalFileName(file.originalName),
      url: `/uploads/graduation-review-files/${file.storedName}`,
    }));
  }

  private async copyReviewFilesToGraduate(
    requestId: string,
    graduateId: string,
    uploadedBy?: string,
  ) {
    const reviewFiles = await this.reviewFileRepository.find({
      where: { requestId },
      order: { uploadedAt: 'ASC' },
    });

    if (!reviewFiles.length) {
      return [];
    }

    const sourceDir = path.join(
      process.cwd(),
      'uploads',
      'graduation-review-files',
    );
    const targetDir = path.join(process.cwd(), 'uploads', 'graduate-files');
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const records: GraduateFile[] = [];
    for (const file of reviewFiles) {
      const sourcePath = path.join(sourceDir, file.storedName);
      if (!fs.existsSync(sourcePath)) {
        this.logger.warn(
          `Archivo de revision no encontrado al copiar a graduado: ${sourcePath}`,
        );
        continue;
      }

      const ext = path.extname(file.storedName || file.originalName || '');
      const targetName = `graduate-review-${Date.now()}-${Math.round(
        Math.random() * 1e9,
      )}${ext}`;
      const targetPath = path.join(targetDir, targetName);
      fs.copyFileSync(sourcePath, targetPath);

      records.push(
        this.graduateFileRepository.create({
          graduateId,
          originalName: this.normalizeOriginalFileName(file.originalName),
          storedName: targetName,
          mimeType: file.mimeType,
          sizeBytes: file.sizeBytes,
          uploadedBy: uploadedBy || file.uploadedBy || undefined,
        }),
      );
    }

    return records.length ? this.graduateFileRepository.save(records) : [];
  }

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
        update.firstName !== undefined
          ? update.firstName
          : graduate.firstName || '';
      const nextLastName =
        update.lastName !== undefined
          ? update.lastName
          : graduate.lastName || '';
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
      update.idIssueDate =
        this.parseDate(payload.idIssueDate) ?? graduate.idIssueDate;
    }
    if (payload.enrollmentDate !== undefined) {
      update.enrollmentDate =
        this.parseDate(payload.enrollmentDate) ?? graduate.enrollmentDate;
    }
    if (payload.graduationDate !== undefined) {
      update.graduationDate =
        this.parseDate(payload.graduationDate) ?? graduate.graduationDate;
    }
    if (payload.ceremonyDate !== undefined) {
      update.ceremonyDate =
        this.parseDate(payload.ceremonyDate) ?? graduate.ceremonyDate;
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
        if (payload.fullName !== undefined)
          request.fullName = payload.fullName.trim();
        if (payload.idNumber !== undefined)
          request.idNumber = payload.idNumber.trim();
        if (payload.programName !== undefined)
          request.programName = payload.programName;
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

  async obtenerConfiguracionPlantillaCertificado() {
    const config = await this.getOrCreateCertificateTemplateConfig();
    const parsedTexts =
      parseGraduationCertificateTemplateTexts(config.certificateContentHtml) ||
      DEFAULT_GRADUATION_CERTIFICATE_TEMPLATE_TEXTS;
    const effectiveSignerTitle =
      config.signerTitleOverride ||
      parsedTexts.signerTitle ||
      DEFAULT_GRADUATION_CERTIFICATE_TEMPLATE_TEXTS.signerTitle;
    const hasSignature =
      Boolean(config.signatureUrlOverride?.trim()) &&
      Boolean(config.signerNameOverride?.trim()) &&
      Boolean(effectiveSignerTitle.trim());
    const signerTitleForEditing = hasSignature
      ? effectiveSignerTitle
      : DEFAULT_GRADUATION_CERTIFICATE_TEMPLATE_TEXTS.signerTitle;

    return {
      id: config.id,
      version: config.version,
      status: config.status,
      updatedAt: config.updatedAt,
      updatedBy: config.updatedBy,
      electronicSignature: {
        enabled: hasSignature,
        signerName: config.signerNameOverride || '',
        signatureUrl: config.signatureUrlOverride || '',
        signatureFilename: config.signatureFilenameOverride || '',
      },
      texts: normalizeGraduationCertificateTemplateTexts({
        ...parsedTexts,
        signerTitle: signerTitleForEditing,
      }),
    };
  }

  async actualizarTextosPlantillaCertificado(payload: UpdateTemplateTextsDto) {
    const config = await this.getOrCreateCertificateTemplateConfig();
    const currentTexts =
      parseGraduationCertificateTemplateTexts(config.certificateContentHtml) ||
      DEFAULT_GRADUATION_CERTIFICATE_TEMPLATE_TEXTS;
    const nextTexts = normalizeGraduationCertificateTemplateTexts({
      ...currentTexts,
      ...payload,
    });
    if (payload.electronicSignatureEnabled === false) {
      nextTexts.signerTitle =
        DEFAULT_GRADUATION_CERTIFICATE_TEMPLATE_TEXTS.signerTitle;
    }
    const actor = this.resolveTemplateUpdatedBy(payload.updatedBy);

    const previousSerialized = serializeGraduationCertificateTemplateTexts(
      normalizeGraduationCertificateTemplateTexts({
        ...currentTexts,
        signerTitle: config.signerTitleOverride || currentTexts.signerTitle,
      }),
    );
    const nextSerialized =
      serializeGraduationCertificateTemplateTexts(nextTexts);

    config.certificateContentHtml = nextSerialized;
    config.signerTitleOverride = nextTexts.signerTitle;

    const previousSignature = {
      enabled:
        Boolean(config.signatureUrlOverride?.trim()) &&
        Boolean(config.signerNameOverride?.trim()),
      signerName: config.signerNameOverride || '',
      signatureUrl: config.signatureUrlOverride || '',
      signatureFilename: config.signatureFilenameOverride || '',
    };

    if (
      typeof payload.electronicSignatureEnabled === 'boolean' ||
      payload.signatureImageDataUrl !== undefined
    ) {
      await this.applyElectronicSignatureConfig(config, payload);
    }

    config.status = 'published';
    config.isActive = true;
    config.updatedBy = actor;

    if (config.version) {
      const [majorRaw = '1', minorRaw = '0', patchRaw = '0'] = String(
        config.version,
      ).split('.');
      const major = Number.parseInt(majorRaw, 10) || 1;
      const minor = Number.parseInt(minorRaw, 10) || 0;
      const patch = Number.parseInt(patchRaw, 10) || 0;
      config.version = `${major}.${minor}.${patch + 1}`;
    } else {
      config.version = '1.0.1';
    }

    await this.templateConfigRepository.save(config);

    const nextSignature = {
      enabled:
        Boolean(config.signatureUrlOverride?.trim()) &&
        Boolean(config.signerNameOverride?.trim()),
      signerName: config.signerNameOverride || '',
      signatureUrl: config.signatureUrlOverride || '',
      signatureFilename: config.signatureFilenameOverride || '',
    };

    await this.templateConfigChangeRepository.save(
      this.templateConfigChangeRepository.create({
        templateConfigId: config.id,
        changeType: 'UPDATED_TEXTS',
        fieldChanged: 'certificate_template_texts',
        oldValue: JSON.stringify({
          texts: previousSerialized,
          electronicSignature: previousSignature,
        }),
        newValue: JSON.stringify({
          texts: nextSerialized,
          electronicSignature: nextSignature,
        }),
        changedBy: actor,
        observations:
          'Actualizacion de textos de la plantilla de verificacion de titulos',
      }),
    );

    return this.obtenerConfiguracionPlantillaCertificado();
  }

  async restablecerTextosPlantillaCertificado(updatedBy?: string) {
    const config = await this.getOrCreateCertificateTemplateConfig();
    const actor = this.resolveTemplateUpdatedBy(updatedBy);
    const currentTexts =
      parseGraduationCertificateTemplateTexts(config.certificateContentHtml) ||
      DEFAULT_GRADUATION_CERTIFICATE_TEMPLATE_TEXTS;
    const previousSerialized = serializeGraduationCertificateTemplateTexts(
      normalizeGraduationCertificateTemplateTexts({
        ...currentTexts,
        signerTitle: config.signerTitleOverride || currentTexts.signerTitle,
      }),
    );
    const previousSignature = {
      enabled:
        Boolean(config.signatureUrlOverride?.trim()) &&
        Boolean(config.signerNameOverride?.trim()),
      signerName: config.signerNameOverride || '',
      signatureUrl: config.signatureUrlOverride || '',
      signatureFilename: config.signatureFilenameOverride || '',
    };
    const nextSerialized = serializeGraduationCertificateTemplateTexts(
      DEFAULT_GRADUATION_CERTIFICATE_TEMPLATE_TEXTS,
    );

    config.certificateContentHtml = nextSerialized;
    config.signerTitleOverride =
      DEFAULT_GRADUATION_CERTIFICATE_TEMPLATE_TEXTS.signerTitle;
    config.signatureUrlOverride = null;
    config.signatureFilenameOverride = null;
    config.signerNameOverride = null;
    config.status = 'published';
    config.isActive = true;
    config.updatedBy = actor;
    config.version = config.version || '1.0.0';

    await this.templateConfigRepository.save(config);

    await this.templateConfigChangeRepository.save(
      this.templateConfigChangeRepository.create({
        templateConfigId: config.id,
        changeType: 'RESET_TEXTS',
        fieldChanged: 'certificate_template_texts',
        oldValue: JSON.stringify({
          texts: previousSerialized,
          electronicSignature: previousSignature,
        }),
        newValue: JSON.stringify({
          texts: nextSerialized,
          electronicSignature: {
            enabled: false,
            signerName: '',
            signatureUrl: '',
            signatureFilename: '',
          },
        }),
        changedBy: actor,
        observations:
          'Restablecimiento de textos predeterminados de la plantilla de verificacion de titulos',
      }),
    );

    return this.obtenerConfiguracionPlantillaCertificado();
  }

  private async applyElectronicSignatureConfig(
    config: TemplateConfig,
    payload: UpdateTemplateTextsDto,
  ) {
    if (payload.electronicSignatureEnabled === false) {
      config.signatureUrlOverride = null;
      config.signatureFilenameOverride = null;
      config.signerNameOverride = null;
      config.signerTitleOverride =
        DEFAULT_GRADUATION_CERTIFICATE_TEMPLATE_TEXTS.signerTitle;
      return;
    }

    const signerName = String(payload.signerName || '').trim();
    const signerTitle = String(
      payload.signerTitle ??
        config.signerTitleOverride ??
        DEFAULT_GRADUATION_CERTIFICATE_TEMPLATE_TEXTS.signerTitle,
    ).trim();
    const hasExistingSignature = Boolean(config.signatureUrlOverride?.trim());
    const hasIncomingSignature = Boolean(payload.signatureImageDataUrl?.trim());

    if (!signerName) {
      throw new BadRequestException(
        'El nombre del firmante es obligatorio cuando la firma electronica esta activa.',
      );
    }
    if (signerName.length > 255) {
      throw new BadRequestException(
        'El nombre del firmante no puede superar 255 caracteres.',
      );
    }
    if (!signerTitle) {
      throw new BadRequestException(
        'El cargo del firmante es obligatorio cuando la firma electronica esta activa.',
      );
    }
    if (signerTitle.length > 255) {
      throw new BadRequestException(
        'El cargo del firmante no puede superar 255 caracteres.',
      );
    }
    if (!hasExistingSignature && !hasIncomingSignature) {
      throw new BadRequestException(
        'La imagen de la firma es obligatoria cuando la firma electronica esta activa.',
      );
    }

    config.signerNameOverride = signerName;
    config.signerTitleOverride = signerTitle;

    if (hasIncomingSignature) {
      const storedSignature = this.normalizeTemplateSignatureImage(
        payload.signatureImageDataUrl!,
        payload.signatureFilename,
      );
      config.signatureUrlOverride = storedSignature.dataUrl;
      config.signatureFilenameOverride = storedSignature.filename;
    }
  }

  private normalizeTemplateSignatureImage(
    dataUrl: string,
    originalFilename?: string,
  ): { dataUrl: string; filename: string } {
    const match = String(dataUrl || '').match(
      /^data:(image\/png|image\/jpe?g);base64,([A-Za-z0-9+/=\r\n]+)$/i,
    );
    if (!match) {
      throw new BadRequestException(
        'La firma debe ser una imagen PNG o JPEG valida.',
      );
    }

    const mimeType = match[1].toLowerCase();
    const base64 = match[2].replace(/\s/g, '');
    const buffer = Buffer.from(base64, 'base64');
    if (!buffer.length || buffer.length > 2 * 1024 * 1024) {
      throw new BadRequestException(
        'La imagen de la firma debe pesar maximo 2 MB.',
      );
    }

    const extension = mimeType === 'image/png' ? 'png' : 'jpg';
    const safeBaseName = path
      .basename(originalFilename || 'firma-electronica')
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);
    const filename = `${safeBaseName || 'firma-electronica'}.${extension}`;

    return {
      dataUrl: `data:${mimeType};base64,${base64}`,
      filename,
    };
  }

  /**
   * ADMIN: Listar todas las solicitudes
   */
  async listarSolicitudes() {
    await this.expireOverdueManualReviewRequests();

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
      relations: ['graduate', 'reviewFiles'],
    });

    if (!request) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    const currentRequest = await this.expireManualReviewRequestIfNeeded(request);
    return this.normalizeReviewFilesForResponse(currentRequest);
  }

  /**
   * ADMIN: Listar solicitudes de revisión manual (graduados no encontrados)
   */
  async listarSolicitudesRevision() {
    await this.expireOverdueManualReviewRequests();

    const requests = await this.requestRepository.find({
      where: { manualReview: true },
      relations: ['graduate', 'reviewFiles'],
      order: { updatedAt: 'DESC', requestDate: 'DESC' },
    });

    return requests.map((request) =>
      this.normalizeReviewFilesForResponse(request),
    );
  }

  async listarSolicitudesAprobacion() {
    await this.expireOverdueManualReviewRequests();

    const requests = await this.requestRepository.find({
      where: {
        manualReview: true,
        approvalStatus: In([
          'PENDING_APPROVAL',
          'PENDING_HEAD_APPROVAL',
          'APPROVED_FINAL',
          'REJECTED_FINAL',
          'OBSERVATION',
          'HEAD_OBSERVATION',
        ]),
      },
      relations: ['graduate', 'reviewFiles'],
      order: { updatedAt: 'DESC', reviewSubmittedAt: 'DESC', requestDate: 'DESC' },
    });

    return requests.map((request) =>
      this.normalizeReviewFilesForResponse(request),
    );
  }

  async contarSolicitudesAprobacionPendientes(stage?: string) {
    await this.expireOverdueManualReviewRequests();
    const normalizedStage = (stage || '').trim().toLowerCase();
    const pendingStatuses =
      normalizedStage === 'head'
        ? ['PENDING_HEAD_APPROVAL']
        : ['PENDING_APPROVAL', 'HEAD_OBSERVATION'];

    return {
      count: await this.requestRepository.count({
        where: {
          manualReview: true,
          approvalStatus: In(pendingStatuses),
        },
      }),
    };
  }

  async enviarDecisionRevision(
    id: string,
    payload: SubmitReviewDecisionDto,
  ) {
    const request = await this.requestRepository.findOne({
      where: { id },
      relations: ['graduate', 'reviewFiles'],
    });

    if (!request) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    await this.expireManualReviewRequestIfNeeded(request);
    this.ensureManualReviewRequestIsActionable(request);

    const decision = payload?.decision;
    if (!['APPROVED', 'REJECTED'].includes(decision)) {
      throw new BadRequestException('Decision de revision invalida');
    }

    const reason = (
      payload.reason ||
      payload.reviewNotes ||
      (decision === 'APPROVED'
        ? 'Concepto favorable del revisor'
        : 'Concepto registrado por el revisor')
    ).trim();
    if (!reason) {
      throw new BadRequestException('Las notas de revision son obligatorias');
    }

    const reviewPayload = this.buildReviewPayload(payload);
    const now = new Date();

    request.status = 'PROCESSING';
    request.approvalStatus = 'PENDING_APPROVAL';
    request.reviewRecommendation = decision;
    request.reviewRecommendationReason = reason;
    request.reviewPayload = reviewPayload;
    request.reviewSubmittedAt = now;
    request.reviewSubmittedBy = payload.reviewerId || request.reviewedBy;
    request.reviewSubmittedByName =
      payload.reviewerName || request.reviewerName;
    request.reviewedAt = now;
    request.reviewedBy = payload.reviewerId || request.reviewedBy;
    request.reviewerName = payload.reviewerName || request.reviewerName;
    request.reviewNotes = reason;
    request.reviewResolution =
      decision === 'APPROVED'
        ? 'graduate_found'
        : 'graduate_not_found';
    request.approverDecision = null;
    request.approverNotes = null;
    request.approvedAt = null;
    request.approvedBy = null;
    request.approverName = null;
    request.headDecision = null;
    request.headNotes = null;
    request.headReviewedAt = null;
    request.headReviewedBy = null;
    request.headReviewerName = null;

    this.appendReviewTimeline(request, {
      type: 'review_decision_submitted',
      label: this.getReviewDecisionLabel(decision),
      notes: reason,
      actorId: payload.reviewerId,
      actorName: payload.reviewerName,
      actorEmail: payload.reviewerEmail,
      createdAt: now,
    });

    return await this.requestRepository.save(request);
  }

  async resolverDecisionAprobador(
    id: string,
    payload: ResolveReviewApprovalDto,
    frontendBaseUrl?: string,
  ) {
    const request = await this.requestRepository.findOne({
      where: { id },
      relations: ['graduate', 'reviewFiles'],
    });

    if (!request) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    await this.expireManualReviewRequestIfNeeded(request);
    this.ensureManualReviewRequestIsActionable(request);

    const decision = payload?.decision;
    if (!['APPROVED', 'REJECTED', 'OBSERVATION'].includes(decision)) {
      throw new BadRequestException('Decision de aprobacion invalida');
    }

    const reason = (payload.reason || '').trim();
    const now = new Date();
    const isFinalDecision = payload?.finalDecision === true;
    if (
      !isFinalDecision &&
      (decision === 'REJECTED' || decision === 'OBSERVATION') &&
      !reason
    ) {
      throw new BadRequestException('Debes registrar una justificacion para esta decision');
    }

    if (!isFinalDecision) {
      if (
        !['PENDING_APPROVAL', 'HEAD_OBSERVATION'].includes(
          request.approvalStatus || '',
        )
      ) {
        throw new BadRequestException(
          'La solicitud no esta pendiente de gestion por aprobador',
        );
      }

      request.approverDecision = decision;
      request.approverNotes = reason || payload.reason || null;
      request.approvedAt = now;
      request.approvedBy = payload.approverId || request.approvedBy;
      request.approverName = payload.approverName || request.approverName;
      request.headDecision = null;
      request.headNotes = null;
      request.headReviewedAt = null;
      request.headReviewedBy = null;
      request.headReviewerName = null;

      this.appendReviewTimeline(request, {
        type: 'approver_decision',
        label:
          decision === 'APPROVED'
            ? 'Preaprobacion del aprobador'
            : decision === 'REJECTED'
              ? 'Prerechazo del aprobador'
              : 'Observacion del aprobador al revisor',
        notes: reason || undefined,
        actorId: payload.approverId,
        actorName: payload.approverName,
        actorEmail: payload.approverEmail,
        createdAt: now,
      });

      request.status = 'PROCESSING';
      request.approvalStatus =
        decision === 'OBSERVATION' ? 'OBSERVATION' : 'PENDING_HEAD_APPROVAL';

      return await this.requestRepository.save(request);
    }

    if (request.approvalStatus !== 'PENDING_HEAD_APPROVAL') {
      throw new BadRequestException(
        'La solicitud no tiene un concepto del aprobador pendiente de decision final',
      );
    }

    request.headDecision = decision;
    request.headNotes = reason || payload.reason || null;
    request.headReviewedAt = now;
    request.headReviewedBy = payload.approverId || request.headReviewedBy;
    request.headReviewerName = payload.approverName || request.headReviewerName;

    this.appendReviewTimeline(request, {
      type: 'head_decision',
      label:
        decision === 'APPROVED'
          ? 'Aprobacion final del jefe'
          : decision === 'REJECTED'
            ? 'Rechazo final del jefe'
            : 'Observacion del jefe al aprobador',
      notes: reason || undefined,
      actorId: payload.approverId,
      actorName: payload.approverName,
      actorEmail: payload.approverEmail,
      createdAt: now,
    });

    if (decision === 'OBSERVATION') {
      request.status = 'PROCESSING';
      request.approvalStatus = 'HEAD_OBSERVATION';
      return await this.requestRepository.save(request);
    }

    if (decision === 'REJECTED') {
      await this.requestRepository.save(request);

      const rejected = await this.rechazarSolicitud(
        id,
        reason,
        payload.approverName || request.headReviewerName || undefined,
        payload.approverId || request.headReviewedBy || undefined,
        frontendBaseUrl,
      );
      rejected.approvalStatus = 'REJECTED_FINAL';
      rejected.headDecision = decision;
      rejected.headNotes = reason;
      rejected.headReviewedAt = now;
      rejected.headReviewedBy = payload.approverId || rejected.headReviewedBy;
      rejected.headReviewerName =
        payload.approverName || rejected.headReviewerName;
      this.appendReviewTimeline(rejected, {
        type: 'final_rejection_notified',
        label: 'Rechazo final notificado al solicitante',
        notes: reason,
        actorId: payload.approverId,
        actorName: payload.approverName,
        actorEmail: payload.approverEmail,
      });
      return await this.requestRepository.save(rejected);
    }

    await this.requestRepository.save(request);

    const approved = await this.aprobarSolicitud(
      id,
      this.buildApprovePayloadFromReview(request, reason),
      frontendBaseUrl,
    );
    approved.request.approvalStatus = 'APPROVED_FINAL';
    approved.request.headDecision = decision;
    approved.request.headNotes = reason || null;
    approved.request.headReviewedAt = now;
    approved.request.headReviewedBy =
      payload.approverId || approved.request.headReviewedBy;
    approved.request.headReviewerName =
      payload.approverName || approved.request.headReviewerName;
    this.appendReviewTimeline(approved.request, {
      type: 'certificate_generated',
      label: 'Certificado generado y enviado al solicitante',
      notes: reason || undefined,
      actorId: payload.approverId,
      actorName: payload.approverName,
      actorEmail: payload.approverEmail,
    });

    await this.requestRepository.save(approved.request);
    if (approved.request.graduateId) {
      await this.copyReviewFilesToGraduate(
        approved.request.id,
        approved.request.graduateId,
        payload.approverName || request.reviewSubmittedByName || undefined,
      );
    }

    return approved;
  }

  /**
   * ADMIN: Marcar solicitud en revisión
   */
  async marcarEnRevision(
    id: string,
    reviewerName?: string,
    reviewerId?: string,
    reviewerEmail?: string,
    frontendBaseUrl?: string,
  ) {
    const request = await this.requestRepository.findOne({
      where: { id },
      relations: ['graduate'],
    });

    if (!request) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    await this.expireManualReviewRequestIfNeeded(request);
    this.ensureManualReviewRequestIsActionable(request);

    request.status = 'PROCESSING';
    request.reviewerName = reviewerName || request.reviewerName;
    request.reviewedBy = reviewerId || request.reviewedBy;
    this.appendReviewTimeline(request, {
      type: 'review_started',
      label: 'Solicitud enviada a revision',
      actorId: reviewerId,
      actorName: reviewerName,
      actorEmail: reviewerEmail,
    });
    const updatedRequest = await this.requestRepository.save(request);

    try {
      await this.sendUnderReviewEmail(updatedRequest, frontendBaseUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Solicitud ${updatedRequest.requestNumber}: no se pudo enviar aviso de revisión a ${updatedRequest.requesterEmail || 'sin email'} (${message})`,
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

    await this.expireManualReviewRequestIfNeeded(request);
    this.ensureManualReviewRequestIsActionable(request);

    const reviewNotes = (
      payload?.reviewNotes || 'Aprobado por revisión manual'
    ).trim();

    const publicNotificationNotes =
      payload?.publicNotificationNotes !== undefined
        ? (payload.publicNotificationNotes || '').trim()
        : reviewNotes;

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
      ? Raw((alias) => `LOWER(${alias}) = :programName`, {
          programName: normalizedProgramName,
        })
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
      if (payload?.fullName !== undefined)
        graduateUpdate.fullName = payload.fullName.trim();
      if (payload?.idNumber !== undefined)
        graduateUpdate.idNumber = payload.idNumber.trim();
      if (payload?.email !== undefined) graduateUpdate.email = payload.email;
      if (payload?.phone !== undefined) graduateUpdate.phone = payload.phone;
      if (payload?.programName !== undefined)
        graduateUpdate.programName = payload.programName;
      if (payload?.programType !== undefined)
        graduateUpdate.programType = payload.programType;
      if (payload?.degreeTitle !== undefined)
        graduateUpdate.degreeTitle = payload.degreeTitle;
      if (payload?.numRegistro !== undefined)
        graduateUpdate.numRegistro = payload.numRegistro;
      if (payload?.numFolio !== undefined)
        graduateUpdate.numFolio = payload.numFolio;
      if (payload?.numLibro !== undefined)
        graduateUpdate.numLibro = payload.numLibro;
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
      request.graduationDate =
        request.graduationDate ?? graduate.graduationDate;
    } else {
      const fullName = (payload?.fullName || request.fullName || '').trim();
      const { firstName, lastName } = this.splitFullName(fullName);
      const programName =
        payload?.programName || request.programName || 'No disponible';
      const programType =
        payload?.programType ||
        (request as { programType?: string }).programType ||
        'Pregrado';
      const degreeTitle =
        payload?.degreeTitle ||
        (request as { degreeTitle?: string }).degreeTitle ||
        programName;
      const graduationDate =
        this.parseDate(payload?.graduationDate) ?? request.graduationDate;

      if (!graduationDate) {
        throw new BadRequestException(
          'La fecha de grado es obligatoria para aprobar una solicitud de revisión manual.',
        );
      }
      const campus =
        payload?.campus || (request as { campus?: string }).campus || undefined;
      const seccionalName =
        payload?.seccionalName ||
        (request as { seccionalName?: string }).seccionalName;
      const enrollmentDate = new Date();
      enrollmentDate.setHours(12, 0, 0, 0);

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
        enrollmentDate,
        graduationDate,
        degreeTitle,
        campus,
        seccionalName: seccionalName?.trim() || undefined,
        numRegistro: payload?.numRegistro?.trim() || undefined,
        numFolio: payload?.numFolio?.trim() || undefined,
        numLibro: payload?.numLibro?.trim() || undefined,
        status: 'ACTIVE',
        isVerified: true,
        createdBy: reviewerName
          ? `manual_review:${reviewerName}`
          : 'manual_review',
      });

      graduate = await this.graduateRepository.save(createdGraduate);
      request.graduate = graduate;
      request.graduateId = graduate.id;
      request.graduationDate = graduationDate;
    }

    if (!request.graduationDate) {
      throw new BadRequestException(
        'La fecha de grado es obligatoria para aprobar una solicitud de revisión manual.',
      );
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
    this.appendReviewTimeline(request, {
      type: 'manual_review_approved',
      label: 'Solicitud aprobada por revision manual',
      notes: reviewNotes,
      actorId: payload?.reviewerId,
      actorName: payload?.reviewerName || request.reviewerName,
    });

    await this.requestRepository.save(request);

    const certificate = await this.generateCertificate(
      request,
      frontendBaseUrl,
    );

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
          publicNotificationNotes,
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

    await this.expireManualReviewRequestIfNeeded(request);
    this.ensureManualReviewRequestIsActionable(request);

    request.status = 'REJECTED';
    request.reviewedAt = new Date();
    request.reviewNotes = reason;
    request.reviewResolution = 'graduate_not_found';
    request.rejectionReason = reason;
    request.reviewerName = reviewerName || request.reviewerName;
    request.reviewedBy = reviewerId || request.reviewedBy;
    request.completionDate = new Date();
    this.appendReviewTimeline(request, {
      type: 'manual_review_rejected',
      label: 'Solicitud rechazada por revision manual',
      notes: reason,
      actorId: reviewerId,
      actorName: reviewerName || request.reviewerName,
    });

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
        `No se pudo notificar inicio de revisión para solicitud ${request.requestNumber}: email vacío`,
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

    const subject = `Actualización de solicitud en revisión - ${requestNumber}`;
    const text =
      `Hola ${requesterName},\n` +
      `Tu solicitud ${requestNumber} avanzó al estado En revisión.\n` +
      `Documento consultado: ${idNumber || 'No informado'}.\n` +
      `Fecha de actualización: ${formattedUpdateDate}.\n\n` +
      `Nuestro equipo se encuentra validando la informacion. Te notificaremos el siguiente avance al mismo correo.`;

    const safeRequesterName = safe(requesterName);
    const safeRequestNumber = safe(requestNumber);
    const safeIdNumber = safe(idNumber || 'No informado');
    const safeFormattedUpdateDate = safe(formattedUpdateDate);

    const html = `
      <div style="font-family: Arial,'Helvetica Neue',sans-serif; background-color: #f0f4f8; padding: 32px 16px; margin: 0;">
        <table width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center">
          <table cellspacing="0" cellpadding="0" border="0" style="max-width:560px;width:100%;background-color:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #dde3ed;">
            <tr>
              <td style="background-image:linear-gradient(135deg,#003DA5 0%,#1565C0 100%);background-color:#003DA5;padding:0;">
                <table width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr><td style="height:4px;background-color:#FCD34D;font-size:0;line-height:0;">&nbsp;</td></tr>
                  <tr><td style="padding:22px 28px 18px 28px;">
                    <table width="100%" cellspacing="0" cellpadding="0" border="0"><tr>
                      <td><div style="font-size:20px;font-weight:800;color:#ffffff;">ESAP</div><div style="font-size:10px;color:rgba(255,255,255,0.7);margin-top:2px;letter-spacing:0.8px;text-transform:uppercase;">Registro Académico</div></td>
                      <td align="right"><span style="background-color:rgba(252,211,77,0.25);color:#ffffff;font-size:11px;font-weight:600;padding:4px 12px;border-radius:20px;">En revisión</span></td>
                    </tr></table>
                  </td></tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 28px 8px 28px;">
                <h1 style="margin:0 0 6px 0;font-size:22px;font-weight:700;color:#111827;">Tu solicitud está siendo revisada</h1>
                <p style="margin:0 0 24px 0;font-size:14px;color:#6b7280;line-height:1.6;">Hola <strong style="color:#374151;">${safeRequesterName}</strong>, tu solicitud avanzó en el proceso. Nuestro equipo está validando la información.</p>
                <table width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;margin-bottom:16px;">
                  <tr><td style="padding:16px 20px;">
                    <p style="margin:0 0 12px 0;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.6px;">Estado de la solicitud</p>
                    <table width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;"><span style="font-size:12px;color:#6b7280;">Número de solicitud</span><br><span style="font-size:15px;font-weight:700;color:#111827;">${safeRequestNumber}</span></td></tr>
                      <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;"><span style="font-size:12px;color:#6b7280;">Estado actual</span><br><span style="font-size:14px;font-weight:600;color:#d97706;">&#9679; En revisión</span></td></tr>
                      <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;"><span style="font-size:12px;color:#6b7280;">Documento consultado</span><br><span style="font-size:14px;color:#374151;">${safeIdNumber}</span></td></tr>
                      <tr><td style="padding:8px 0;"><span style="font-size:12px;color:#6b7280;">Fecha de actualización</span><br><span style="font-size:14px;color:#374151;">${safeFormattedUpdateDate}</span></td></tr>
                    </table>
                  </td></tr>
                </table>
                <table width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#fffbeb;border:1px solid #fde68a;border-radius:8px;margin-bottom:24px;">
                  <tr><td style="padding:12px 16px;font-size:13px;color:#92400e;line-height:1.5;">&#128336; Te notificaremos el siguiente avance al mismo correo electrónico.</td></tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 28px 18px 28px;background-color:#f8fafc;border-top:1px solid #e2e8f0;">
                <p style="margin:0;font-size:12px;color:#9ca3af;">ESAP — Escuela Superior de Administración Pública</p>
                
              </td>
            </tr>
          </table>
        </td></tr></table>
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
      `Notificación de inicio de revisión enviada a ${email} para solicitud ${requestNumber}`,
    );
  }

  private async sendRejectionEmail(
    request: GraduationCertificateRequest,
    frontendBaseUrl?: string,
  ): Promise<void> {
    const email = request.requesterEmail;
    if (!email) {
      this.logger.warn(
        `No se pudo notificar el rechazo para solicitud ${request.requestNumber}: email vacío`,
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
      (request.rejectionReason ? `Motivo: ${request.rejectionReason}\n` : '') +
      `Puedes realizar una nueva solicitud en ${portalUrl}.`;

    const html = `
      <div style="font-family: Arial,'Helvetica Neue',sans-serif; background-color: #f0f4f8; padding: 32px 16px; margin: 0;">
        <table width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center">
          <table cellspacing="0" cellpadding="0" border="0" style="max-width:560px;width:100%;background-color:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #fecaca;">
            <tr>
              <td style="background-image:linear-gradient(135deg,#991B1B 0%,#DC2626 100%);background-color:#991B1B;padding:0;">
                <table width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr><td style="height:4px;background-color:#FCA5A5;font-size:0;line-height:0;">&nbsp;</td></tr>
                  <tr><td style="padding:22px 28px 18px 28px;">
                    <table width="100%" cellspacing="0" cellpadding="0" border="0"><tr>
                      <td><div style="font-size:20px;font-weight:800;color:#ffffff;">ESAP</div><div style="font-size:10px;color:rgba(255,255,255,0.7);margin-top:2px;letter-spacing:0.8px;text-transform:uppercase;">Registro Académico</div></td>
                      <td align="right"><span style="background-color:rgba(255,255,255,0.18);color:#ffffff;font-size:11px;font-weight:600;padding:4px 12px;border-radius:20px;">Solicitud rechazada</span></td>
                    </tr></table>
                  </td></tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 28px 8px 28px;">
                <h1 style="margin:0 0 6px 0;font-size:22px;font-weight:700;color:#111827;">Tu solicitud fue rechazada</h1>
                <p style="margin:0 0 24px 0;font-size:14px;color:#6b7280;line-height:1.6;">Lamentamos informarte que la solicitud <strong style="color:#374151;">${request.requestNumber}</strong> no pudo ser aprobada.</p>
                <table width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;margin-bottom:16px;">
                  <tr><td style="padding:16px 20px;">
                    <p style="margin:0 0 12px 0;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.6px;">Detalle de la solicitud</p>
                    <table width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr><td style="padding:8px 0;${request.rejectionReason ? 'border-bottom:1px solid #f1f5f9;' : ''}"><span style="font-size:12px;color:#6b7280;">Número de solicitud</span><br><span style="font-size:15px;font-weight:700;color:#111827;">${request.requestNumber}</span></td></tr>
                      ${
                        request.rejectionReason
                          ? `<tr><td style="padding:8px 0;"><span style="font-size:12px;color:#6b7280;">Motivo del rechazo</span><br><span style="font-size:14px;color:#374151;line-height:1.5;">${request.rejectionReason}</span></td></tr>`
                          : ''
                      }
                    </table>
                  </td></tr>
                </table>
                <table width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#fef2f2;border:1px solid #fecaca;border-radius:8px;margin-bottom:24px;">
                  <tr><td style="padding:12px 16px;font-size:13px;color:#991b1b;line-height:1.5;">Si deseas intentar de nuevo, puedes hacer una nueva solicitud desde <a href="${portalUrl}" style="color:#dc2626;font-weight:600;">${portalUrl}</a></td></tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 28px 18px 28px;background-color:#f8fafc;border-top:1px solid #e2e8f0;">
                <p style="margin:0;font-size:12px;color:#9ca3af;">ESAP — Escuela Superior de Administración Pública</p>
                
              </td>
            </tr>
          </table>
        </td></tr></table>
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

  private resolveLocationFromContext(
    context?: ValidationGeoContext,
  ): string | null {
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

  private normalizeUserAgent(
    userAgent?: string | string[],
  ): string | undefined {
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

    const publicIp = candidates.find(
      (candidate) => !this.isPrivateIp(candidate),
    );
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
      path.join(
        process.cwd(),
        'uploads',
        'graduation-certificates',
        pdfFilename,
      ),
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

  private getStoredCertificatePdf(
    certificate: GraduationCertificate,
  ): { filename: string; content: Buffer } | null {
    const pdfFilename =
      certificate.pdfFilename ||
      (certificate.pdfUrl ? path.basename(certificate.pdfUrl) : undefined);

    if (!pdfFilename) {
      return null;
    }

    const pdfFilePath = this.resolveExistingPdfPath(pdfFilename);
    if (!pdfFilePath) {
      return null;
    }

    return {
      filename: pdfFilename,
      content: fs.readFileSync(pdfFilePath),
    };
  }
}
