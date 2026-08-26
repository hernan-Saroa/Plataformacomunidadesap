import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import { resolve, sep } from 'path';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Raw, Repository } from 'typeorm';
import { CertificateRequest } from './certificate-request.entity';
import { Certificate } from './certificate.entity';
import { Signer } from './signer.entity';
import { CertificateTemplate } from './certificate-template.entity';
import { CertificateValidation } from './certificate-validation.entity';
import { CertificateGeneratorService } from './certificate-generator.service';
import { LaborCertificatePdfService } from './labor-certificate-pdf.service';
import { TemplateConfigService } from './template-config.service';
import {
  LaborOracleIntegrationService,
  type LaborOracleSuggestedRequest,
} from './labor-oracle-integration.service';
import {
  TechnicalBonusAssignment,
  type TechnicalBonusCategory,
} from './technical-bonus-assignment.entity';
import {
  TechnicalBonusTemplate,
  DEFAULT_DYNAMIC_TECHNICAL_BONUS_TEMPLATE,
  DEFAULT_TECHNICAL_BONUS_TEMPLATES,
  type TechnicalBonusTemplateCategory,
} from './technical-bonus-template.entity';
import {
  CertificateCorrectionRequest,
  type CertificateCorrectionEvidence,
  type CertificateCorrectionTraceEvent,
} from './certificate-correction-request.entity';
import { LaborFunctionsService } from './labor-functions.service';
import {
  findDuplicateLaborFunctions,
  normalizeLaborFunctionText,
  parseLaborFunctionsRaw,
} from './labor-functions.utils';

type TemplateType = 'docente' | 'administrador';

type SendLaborCertificateOptions = {
  includeSalary?: boolean;
  includeTechnicalBonus?: boolean;
  includeFunctions?: boolean;
  templateType?: 'docente' | 'administrador';
  publicBaseUrl?: string;
  to?: string;
  correctionMessage?: string;
  correctionRequestNumber?: string;
  correctionEvidenceCount?: number;
  additionalAttachments?: OutboundEmailAttachment[];
};

type OutboundEmailAttachment = {
  filename: string;
  contentBase64: string;
  contentType: string;
};

type CorrectionReviewer = {
  id?: string;
  name?: string;
  email?: string;
};

export type CorrectedCertificateData = {
  full_name?: string;
  document_type?: string;
  id_number?: string;
  career_category?: string;
  position_category?: string;
  position_location?: string;
  department?: string;
  cod_cargo?: string;
  cod_grade?: string;
  encargo_type?: string;
  campus?: string;
  hiring_date?: string;
  monthly_salary?: number | string;
  salary_text?: string;
  technical_bonus?: number | string;
  include_salary?: boolean | string;
  include_technical_bonus?: boolean | string;
  include_functions?: boolean | string;
  functions?: unknown;
  resolution_description?: string;
};

// En desarrollo/QA puede redirigirse todo correo a una cuenta segura. En el
// ambiente productivo se habilita el destinatario real con
// CERTIFICATION_EMAIL_SAFE_MODE=false.
const CERTIFICATION_EMAIL_SAFE_MODE =
  String(process.env.CERTIFICATION_EMAIL_SAFE_MODE ?? 'true').toLowerCase() !==
  'false';
const CERTIFICATION_EMAIL_SAFE_RECIPIENT =
  process.env.CERTIFICATION_EMAIL_SAFE_RECIPIENT || 'pruebasesap@gmail.com';

type GeoLookupResult = {
  city?: string;
  region?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  isp?: string;
};

type ValidationGeoContext = {
  geoCountry?: string;
  geoRegion?: string;
  geoCity?: string;
  geoTimezone?: string;
  geoLatitude?: string;
  geoLongitude?: string;
};

type SearchTechnicalBonusCandidate = {
  requestId: string;
  fullName: string;
  idNumber: string;
  status: string;
};

type UpsertTechnicalBonusPayload = {
  category: string;
  idNumber: string;
  fullName?: string;
  requestId?: string;
  percentage: number;
  updatedBy?: string;
};

type UpdateTechnicalBonusPayload = {
  percentage: number;
  updatedBy?: string;
};

type BulkTechnicalBonusRowPayload = {
  rowNumber?: number;
  fullName?: string;
  idNumber?: string;
  percentage?: number | string;
};

type BulkTechnicalBonusPayload = {
  category: string;
  rows: BulkTechnicalBonusRowPayload[];
  updatedBy?: string;
};

type TechnicalBonusCategoryPayload = {
  code?: string;
  category?: string;
  label?: string;
  description?: string;
  templateText?: string;
  template_text?: string;
  isActive?: boolean;
  is_active?: boolean;
  displayOrder?: number;
  display_order?: number;
  updatedBy?: string;
};

type ResolvedTechnicalBonusItem = {
  assignmentId: string;
  category: TechnicalBonusCategory;
  label: string;
  percentage: number;
  value: number;
  templateText: string;
  displayOrder: number;
};

type OracleRequestSyncResult = {
  enabled: boolean;
  found: boolean;
  synced: boolean;
  created: number;
  updated: number;
  unchanged: number;
};

@Injectable()
export class CertificatesService {
  private readonly logger = new Logger(CertificatesService.name);
  private readonly emailFormatRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  private readonly geoCache = new Map<string, { expiresAt: number; value: GeoLookupResult | null }>();
  private readonly geoCacheTtlMs = 1000 * 60 * 60 * 6;
  private readonly geoCacheMissTtlMs = 1000 * 60 * 15;

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

  private normalizeBoolean(value: unknown, fallback: boolean): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (['true', '1', 'si', 'yes', 'y'].includes(normalized)) return true;
      if (['false', '0', 'no', 'n'].includes(normalized)) return false;
    }
    return fallback;
  }

  private async getValidationCountsByCertificateIds(
    certificateIds: string[],
  ): Promise<Map<string, number>> {
    const uniqueIds = Array.from(new Set(certificateIds.filter(Boolean)));
    if (!uniqueIds.length) return new Map();

    const validationRows = await this.validationRepo
      .createQueryBuilder('validation')
      .select('validation.certificate_id', 'certificate_id')
      .addSelect('COUNT(validation.id)', 'count')
      .where('validation.certificate_id IN (:...certificateIds)', {
        certificateIds: uniqueIds,
      })
      .groupBy('validation.certificate_id')
      .getRawMany<{ certificate_id: string; count: string }>();

    return new Map(
      validationRows.map((row) => [
        row.certificate_id,
        Number.parseInt(row.count, 10) || 0,
      ]),
    );
  }

  private sanitizeIdNumber(value?: string | null): string {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const digits = raw.replace(/\D+/g, '');
    if (digits) return digits;
    return raw.replace(/\s+/g, '').toUpperCase();
  }

  private normalizeLaborDocumentType(
    value?: string | null,
    options: { strict?: boolean } = {},
  ): 'CC' | 'CE' | 'PP' | null {
    const raw = String(value || '').trim().toUpperCase();
    if (!raw) return null;

    if (raw === 'TI') {
      if (options.strict) {
        throw new BadRequestException(
          'La Tarjeta de Identidad (TI) no esta habilitada para certificados laborales. Usa un documento de mayor de edad.',
        );
      }
      return null;
    }

    if (raw === 'CC' || raw === 'CE') {
      return raw;
    }

    if (raw === 'PP' || raw === 'PA' || raw === 'PAS') {
      return 'PP';
    }

    if (options.strict) {
      throw new BadRequestException(
        'Tipo de documento invalido. Usa CC, CE o PP.',
      );
    }

    return null;
  }

  private toNullableText(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    const text = String(value).trim();
    return text || null;
  }

  private toDateOnlyKey(value?: Date | string | null): string {
    const date = this.normalizeDateOnly(value);
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private buildOracleGeneratedRequestNumber(
    idNumber: string,
    index: number,
  ): string {
    const suffix =
      `${Date.now().toString(36)}${index ? `-${index}` : ''}`.toUpperCase();
    const documentSuffix = idNumber.slice(-18);
    return `FNC-${documentSuffix}-${suffix}`.slice(0, 50);
  }

  private compareRequestValue(
    key: keyof CertificateRequest,
    current: unknown,
    next: unknown,
  ): boolean {
    if (
      key === 'hiring_date' ||
      key === 'request_date' ||
      key === 'validation_expires_at'
    ) {
      return (
        this.toDateOnlyKey(current as Date | string | null) ===
        this.toDateOnlyKey(next as Date | string | null)
      );
    }

    if (key === 'monthly_salary') {
      return (
        this.roundToTwoDecimals(
          this.parseNumericValue(current as string | number | null),
        ) ===
        this.roundToTwoDecimals(
          this.parseNumericValue(next as string | number | null),
        )
      );
    }

    return String(current ?? '').trim() === String(next ?? '').trim();
  }

  private hasRequestChanges(
    existing: CertificateRequest,
    payload: Partial<CertificateRequest>,
  ): boolean {
    return (Object.keys(payload) as Array<keyof CertificateRequest>).some(
      (key) => {
        if (payload[key] === undefined) return false;
        return !this.compareRequestValue(key, existing[key], payload[key]);
      },
    );
  }

  private async findLocalRequestsByDocument(
    documento: string,
  ): Promise<CertificateRequest[]> {
    const documentoTrim = String(documento || '').trim();
    const idNumber = this.sanitizeIdNumber(documentoTrim);
    const qb = this.requestRepo
      .createQueryBuilder('request')
      .orderBy(
        'COALESCE(request.request_date, request.hiring_date, request.created_at)',
        'DESC',
      )
      .addOrderBy('request.hiring_date', 'DESC')
      .addOrderBy('request.created_at', 'DESC');

    if (idNumber) {
      qb.where(
        `REPLACE(REPLACE(REPLACE(request.id_number, '.', ''), '-', ''), ' ', '') = :idNumber`,
        { idNumber },
      );
    } else {
      qb.where('request.id_number = :documento', { documento: documentoTrim });
    }

    return await qb.getMany();
  }

  private findMatchingLocalRequestForOracle(
    suggested: LaborOracleSuggestedRequest,
    localRequests: CertificateRequest[],
    usedRequestIds: Set<string>,
  ): CertificateRequest | null {
    const candidates = localRequests.filter(
      (request) => !usedRequestIds.has(request.id),
    );
    if (!candidates.length) {
      return null;
    }

    const suggestedCodCargo = this.normalizePersistedCodeValue(
      suggested.cod_cargo,
      suggested.cod_grade,
    );
    const suggestedCodGrade = this.normalizePersistedCodeValue(
      suggested.cod_grade,
    );
    const suggestedObservation = this.normalizeEncargoType(
      suggested.observations,
    );
    const suggestedCareer = this.normalizeTemplateText(
      suggested.career_category || '',
    );
    const suggestedPosition = this.normalizeTemplateText(
      suggested.position_category || '',
    );

    const sameCodes = (request: CertificateRequest) => {
      const requestCodCargo = this.normalizePersistedCodeValue(
        request.cod_cargo,
        request.cod_grade,
      );
      const requestCodGrade = this.normalizePersistedCodeValue(
        request.cod_grade,
      );
      return (
        !!suggestedCodCargo &&
        requestCodCargo === suggestedCodCargo &&
        (!suggestedCodGrade || requestCodGrade === suggestedCodGrade)
      );
    };

    const exactByCodeAndObservation = candidates.find((request) => {
      if (!sameCodes(request)) return false;
      if (!suggestedObservation) return true;
      return (
        this.normalizeEncargoType(request.observations) === suggestedObservation
      );
    });
    if (exactByCodeAndObservation) {
      return exactByCodeAndObservation;
    }

    const samePosition = candidates.find((request) => {
      const career = this.normalizeTemplateText(request.career_category || '');
      const position = this.normalizeTemplateText(
        request.position_category || '',
      );
      const sameObservation =
        !suggestedObservation ||
        this.normalizeEncargoType(request.observations) ===
          suggestedObservation;
      return (
        !!suggestedCareer &&
        !!suggestedPosition &&
        career === suggestedCareer &&
        position === suggestedPosition &&
        sameObservation
      );
    });
    if (samePosition) {
      return samePosition;
    }

    return candidates.length === 1 ? candidates[0] : null;
  }

  private buildOracleRequestPayload(
    suggested: LaborOracleSuggestedRequest,
    requestedDocument: string,
    existing: CertificateRequest | null,
    index: number,
  ): Partial<CertificateRequest> {
    const idNumber = this.sanitizeIdNumber(
      suggested.id_number || existing?.id_number || requestedDocument,
    );
    if (!idNumber) {
      throw new BadRequestException(
        'Oracle encontro el documento, pero no entrego un numero de identificacion valido.',
      );
    }

    const fullName =
      this.toNullableText(suggested.full_name) ||
      this.toNullableText(existing?.full_name);
    if (!fullName) {
      throw new BadRequestException(
        `Oracle encontro el documento ${idNumber}, pero no entrego el nombre completo.`,
      );
    }

    const hiringDate =
      this.normalizeDateOnly(suggested.hiring_date) ||
      this.normalizeDateOnly(existing?.hiring_date);
    if (!hiringDate) {
      throw new BadRequestException(
        `Oracle encontro el documento ${idNumber}, pero no entrego FECHA_INGRESO.`,
      );
    }

    const requestDate =
      this.normalizeDateOnly(suggested.request_date) ||
      this.normalizeDateOnly(existing?.request_date) ||
      new Date();
    const monthlySalary =
      suggested.monthly_salary !== null &&
      suggested.monthly_salary !== undefined
        ? this.roundToTwoDecimals(
            this.parseNumericValue(suggested.monthly_salary),
          )
        : this.roundToTwoDecimals(
            this.parseNumericValue(existing?.monthly_salary),
          );
    const status = this.resolveStatusForPersistence(
      suggested.status || existing?.status,
      hiringDate,
      requestDate,
    );

    const payload: Partial<CertificateRequest> = {
      full_name: fullName,
      id_number: idNumber,
      career_category:
        this.toNullableText(suggested.career_category) ||
        this.toNullableText(existing?.career_category) ||
        'NO REGISTRADO',
      hiring_date: hiringDate,
      position_category:
        this.toNullableText(suggested.position_category) ||
        this.toNullableText(existing?.position_category) ||
        'NO REGISTRADO',
      position_location:
        this.toNullableText(suggested.position_location) ??
        this.toNullableText(existing?.position_location) ??
        undefined,
      monthly_salary: monthlySalary,
      salary_text:
        this.toNullableText(suggested.salary_text) ??
        this.toNullableText(existing?.salary_text) ??
        undefined,
      department:
        this.toNullableText(suggested.department) ??
        this.toNullableText(existing?.department) ??
        undefined,
      cod_cargo:
        this.normalizePersistedCodeValue(
          suggested.cod_cargo,
          suggested.cod_grade,
        ) ??
        this.normalizePersistedCodeValue(
          existing?.cod_cargo,
          existing?.cod_grade,
        ),
      cod_grade:
        this.normalizePersistedCodeValue(suggested.cod_grade) ??
        this.normalizePersistedCodeValue(existing?.cod_grade),
      base_position_code:
        this.normalizeRenderedCargoCode(
          suggested.base_position_code || suggested.cod_cargo,
          suggested.cod_grade,
        ) ?? existing?.base_position_code,
      hierarchical_level:
        this.toNullableText(suggested.hierarchical_level) ??
        existing?.hierarchical_level ??
        undefined,
      position_name:
        this.toNullableText(suggested.position_name) ??
        existing?.position_name ??
        undefined,
      organization_department:
        this.toNullableText(suggested.organization_department) ??
        existing?.organization_department ??
        undefined,
      internal_group:
        this.toNullableText(suggested.internal_group) ??
        existing?.internal_group ??
        undefined,
      cost_center:
        this.toNullableText(suggested.cost_center) ??
        existing?.cost_center ??
        undefined,
      email:
        this.toNullableText(suggested.email) ??
        this.toNullableText(existing?.email) ??
        undefined,
      phone:
        this.toNullableText(suggested.phone) ??
        this.toNullableText(existing?.phone) ??
        undefined,
      status,
      request_date: requestDate,
      observations:
        this.toNullableText(suggested.observations) ??
        this.toNullableText(existing?.observations) ??
        undefined,
    };

    if (!existing) {
      payload.request_number =
        suggested.request_number ||
        this.buildOracleGeneratedRequestNumber(idNumber, index);
      payload.person_id = suggested.person_id || undefined;
    }

    return payload;
  }

  private async upsertLocalRequestFromOracle(
    suggested: LaborOracleSuggestedRequest,
    requestedDocument: string,
    existing: CertificateRequest | null,
    index: number,
  ): Promise<{
    request: CertificateRequest;
    action: 'created' | 'updated' | 'unchanged';
  }> {
    const payload = this.buildOracleRequestPayload(
      suggested,
      requestedDocument,
      existing,
      index,
    );

    if (!existing) {
      const request = this.requestRepo.create(payload);
      return {
        request: await this.requestRepo.save(request),
        action: 'created',
      };
    }

    const {
      request_number: _requestNumber,
      person_id: _personId,
      ...updatePayload
    } = payload;
    if (!this.hasRequestChanges(existing, updatePayload)) {
      return { request: existing, action: 'unchanged' };
    }

    Object.assign(existing, updatePayload);
    return {
      request: await this.requestRepo.save(existing),
      action: 'updated',
    };
  }

  private async syncRequestsFromOracle(
    documento: string,
  ): Promise<OracleRequestSyncResult> {
    if (!this.laborOracleIntegrationService.isEnabled()) {
      return {
        enabled: false,
        found: false,
        synced: false,
        created: 0,
        updated: 0,
        unchanged: 0,
      };
    }

    const oracleRequests =
      await this.laborOracleIntegrationService.findSuggestedRequestsByDocument(
        documento,
        20,
      );

    if (!oracleRequests.length) {
      return {
        enabled: true,
        found: false,
        synced: false,
        created: 0,
        updated: 0,
        unchanged: 0,
      };
    }

    const localRequests = await this.findLocalRequestsByDocument(documento);
    const usedRequestIds = new Set<string>();
    const result: OracleRequestSyncResult = {
      enabled: true,
      found: true,
      synced: false,
      created: 0,
      updated: 0,
      unchanged: 0,
    };

    for (const [index, suggested] of oracleRequests.entries()) {
      const existing = this.findMatchingLocalRequestForOracle(
        suggested,
        localRequests,
        usedRequestIds,
      );
      if (existing) {
        usedRequestIds.add(existing.id);
      }

      const sync = await this.upsertLocalRequestFromOracle(
        suggested,
        documento,
        existing,
        index,
      );
      if (sync.action === 'created') {
        result.created += 1;
        localRequests.push(sync.request);
      } else if (sync.action === 'updated') {
        result.updated += 1;
      } else {
        result.unchanged += 1;
      }
    }

    result.synced = result.created > 0 || result.updated > 0;
    return result;
  }

  /**
   * Sincroniza una persona desde la vista Oracle FNC (la misma fuente dinamica
   * y en linea que consume la solicitud de certificado laboral) hacia la base
   * local de solicitudes, para que la gestion de prima tecnica encuentre
   * usuarios que aun no existen localmente pero si en la vista online.
   *
   * Es best-effort a proposito: si la integracion Oracle esta deshabilitada o
   * la consulta falla, se registra la advertencia y se conserva intacto el
   * comportamiento con datos locales, evitando bloquear la gestion de prima.
   */
  private async syncTechnicalBonusPersonFromOracle(
    document: string,
  ): Promise<void> {
    const documento = String(document || '').trim();
    if (!documento) {
      return;
    }

    try {
      await this.syncRequestsFromOracle(documento);
    } catch (error: any) {
      this.logger.warn(
        `No se pudo sincronizar la persona ${documento} desde Oracle FNC para prima tecnica: ${
          error?.message || error
        }`,
      );
    }
  }

  private normalizeTechnicalBonusCategoryCode(
    value?: string | null,
  ): TechnicalBonusCategory {
    const normalized = this.normalizeTemplateText(value || '')
      .replace(/\s+/g, '_')
      .toUpperCase();

    if (normalized === 'DIRECTIVO') return 'DIRECTIVOS';
    if (normalized === 'COORDINADOR') return 'COORDINADORES';

    if (!normalized || normalized.length < 2 || normalized.length > 80) {
      throw new BadRequestException(
        'El codigo de la prima debe tener entre 2 y 80 caracteres.',
      );
    }

    if (!/^[A-Z0-9_]+$/.test(normalized)) {
      throw new BadRequestException(
        'El codigo de la prima solo puede usar letras, numeros y guion bajo.',
      );
    }

    return normalized;
  }

  private getTechnicalBonusDefaultTemplate(category: string): string {
    return (
      DEFAULT_TECHNICAL_BONUS_TEMPLATES[
        category as keyof typeof DEFAULT_TECHNICAL_BONUS_TEMPLATES
      ] || DEFAULT_DYNAMIC_TECHNICAL_BONUS_TEMPLATE
    );
  }

  private getTechnicalBonusDefaultLabel(category: string): string {
    if (category === 'DIRECTIVOS') return 'Directivos';
    if (category === 'COORDINADORES') return 'Coordinadores';
    return category
      .toLowerCase()
      .split('_')
      .filter(Boolean)
      .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
      .join(' ');
  }

  private getTechnicalBonusDefaultDescription(category: string): string {
    if (category === 'DIRECTIVOS') {
      return 'Gestion de porcentajes para directivos.';
    }
    if (category === 'COORDINADORES') {
      return 'Gestion de porcentajes para coordinadores.';
    }
    return 'Gestion de porcentajes para esta prima.';
  }

  private mapTechnicalBonusCategory(item: TechnicalBonusTemplate) {
    const category = item.category;
    return {
      id: item.id,
      category,
      label: item.label || this.getTechnicalBonusDefaultLabel(category),
      description:
        item.description || this.getTechnicalBonusDefaultDescription(category),
      template_text:
        item.template_text || this.getTechnicalBonusDefaultTemplate(category),
      default_template_text: this.getTechnicalBonusDefaultTemplate(category),
      display_order: Number(item.display_order || 0),
      is_system: Boolean(item.is_system),
      is_active: item.is_active !== false,
      created_at: item.created_at ?? null,
      updated_at: item.updated_at ?? null,
      updated_by: item.updated_by ?? null,
    };
  }

  private async ensureDefaultTechnicalBonusCategories(): Promise<void> {
    const defaults: Array<{
      category: 'DIRECTIVOS' | 'COORDINADORES';
      label: string;
      description: string;
      displayOrder: number;
    }> = [
      {
        category: 'DIRECTIVOS',
        label: 'Directivos',
        description: 'Gestion de porcentajes para directivos.',
        displayOrder: 10,
      },
      {
        category: 'COORDINADORES',
        label: 'Coordinadores',
        description: 'Gestion de porcentajes para coordinadores.',
        displayOrder: 20,
      },
    ];

    for (const defaultItem of defaults) {
      const existing = await this.technicalBonusTemplateRepo.findOne({
        where: { category: defaultItem.category },
      });

      if (!existing) {
        await this.technicalBonusTemplateRepo.save(
          this.technicalBonusTemplateRepo.create({
            category: defaultItem.category,
            label: defaultItem.label,
            description: defaultItem.description,
            template_text:
              DEFAULT_TECHNICAL_BONUS_TEMPLATES[defaultItem.category],
            display_order: defaultItem.displayOrder,
            is_system: true,
            is_active: true,
          }),
        );
        continue;
      }

      let changed = false;
      if (!existing.label) {
        existing.label = defaultItem.label;
        changed = true;
      }
      if (!existing.description) {
        existing.description = defaultItem.description;
        changed = true;
      }
      if (!existing.display_order) {
        existing.display_order = defaultItem.displayOrder;
        changed = true;
      }
      if (!existing.is_system) {
        existing.is_system = true;
        changed = true;
      }
      if (existing.is_active === false) {
        existing.is_active = true;
        changed = true;
      }
      if (changed) {
        await this.technicalBonusTemplateRepo.save(existing);
      }
    }
  }

  private async getTechnicalBonusCategoryRecord(
    value?: string | null,
    options: { activeOnly?: boolean } = {},
  ): Promise<TechnicalBonusTemplate> {
    const category = this.normalizeTechnicalBonusCategoryCode(value);
    await this.ensureDefaultTechnicalBonusCategories();

    const record = await this.technicalBonusTemplateRepo.findOne({
      where: { category },
    });

    if (!record) {
      throw new BadRequestException(
        'La prima seleccionada no existe. Creala primero en la configuracion de prima tecnica y/o coordinacion.',
      );
    }

    if (options.activeOnly !== false && record.is_active === false) {
      throw new BadRequestException('La prima seleccionada esta inactiva.');
    }

    return record;
  }

  private mapTechnicalBonusAssignment(item: TechnicalBonusAssignment) {
    return {
      id: item.id,
      category: item.category,
      request_id: item.request_id,
      full_name: item.full_name,
      id_number: item.id_number,
      percentage: Number(item.percentage || 0),
      created_by: item.created_by,
      updated_by: item.updated_by,
      created_at: item.created_at,
      updated_at: item.updated_at,
    };
  }

  private parseNumericValue(value?: string | number | null): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : 0;
    }

    const normalized = String(value)
      .trim()
      .replace(/\s+/g, '')
      .replace(',', '.');
    if (!normalized) return 0;

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private roundToTwoDecimals(value: number): number {
    return Number(value.toFixed(2));
  }

  private resolveTechnicalBonusAmount(
    monthlySalaryRaw: string | number | null | undefined,
    percentageRaw: string | number | null | undefined,
  ): number {
    const monthlySalary = this.parseNumericValue(monthlySalaryRaw);
    const percentage = this.parseNumericValue(percentageRaw);

    if (monthlySalary <= 0 || percentage <= 0) {
      return 0;
    }

    return this.roundToTwoDecimals(monthlySalary * (percentage / 100));
  }

  private async resolveTechnicalBonusForRequest(
    request?: Pick<CertificateRequest, 'id_number' | 'monthly_salary'> | null,
  ): Promise<{
    available: boolean;
    percentage: number;
    value: number;
    category: TechnicalBonusCategory | null;
    assignmentId: string | null;
    items: ResolvedTechnicalBonusItem[];
    totalPercentage: number;
    totalValue: number;
  }> {
    const idNumber = this.sanitizeIdNumber(request?.id_number || '');
    if (!idNumber) {
      return {
        available: false,
        percentage: 0,
        value: 0,
        category: null,
        assignmentId: null,
        items: [],
        totalPercentage: 0,
        totalValue: 0,
      };
    }

    const assignments = await this.technicalBonusRepo.find({
      where: {
        id_number: Raw(
          (alias) =>
            `REPLACE(REPLACE(REPLACE(${alias}, '.', ''), '-', ''), ' ', '') = :idNumber`,
          { idNumber },
        ),
      },
      order: { updated_at: 'DESC' },
    });

    if (!assignments.length) {
      return {
        available: false,
        percentage: 0,
        value: 0,
        category: null,
        assignmentId: null,
        items: [],
        totalPercentage: 0,
        totalValue: 0,
      };
    }

    const categories = Array.from(
      new Set(assignments.map((item) => item.category).filter(Boolean)),
    );
    const templateRecords = categories.length
      ? await this.technicalBonusTemplateRepo.find({
          where: { category: In(categories) },
        })
      : [];
    const templateByCategory = new Map(
      templateRecords.map((item) => [item.category, item]),
    );

    const items = assignments
      .map((assignment): ResolvedTechnicalBonusItem | null => {
        const template = templateByCategory.get(assignment.category);
        if (template && template.is_active === false) {
          return null;
        }

        const percentage = this.roundToTwoDecimals(
          this.parseNumericValue(assignment.percentage),
        );
        const value = this.resolveTechnicalBonusAmount(
          request?.monthly_salary,
          percentage,
        );
        if (percentage <= 0 || value <= 0) {
          return null;
        }

        const category = assignment.category;
        return {
          assignmentId: assignment.id,
          category,
          label: template?.label || this.getTechnicalBonusDefaultLabel(category),
          percentage,
          value,
          templateText:
            template?.template_text || this.getTechnicalBonusDefaultTemplate(category),
          displayOrder: Number(template?.display_order ?? 100),
        };
      })
      .filter((item): item is ResolvedTechnicalBonusItem => Boolean(item))
      .sort((left, right) => {
        if (left.displayOrder !== right.displayOrder) {
          return left.displayOrder - right.displayOrder;
        }
        const labelCompare = left.label.localeCompare(right.label, 'es');
        if (labelCompare !== 0) return labelCompare;
        return left.category.localeCompare(right.category, 'es');
      });

    if (!items.length) {
      return {
        available: false,
        percentage: 0,
        value: 0,
        category: null,
        assignmentId: null,
        items: [],
        totalPercentage: 0,
        totalValue: 0,
      };
    }

    const totalPercentage = this.roundToTwoDecimals(
      items.reduce((sum, item) => sum + item.percentage, 0),
    );
    const totalValue = this.roundToTwoDecimals(
      items.reduce((sum, item) => sum + item.value, 0),
    );
    const primary = items[0];

    return {
      available: true,
      percentage: totalPercentage,
      value: totalValue,
      category: primary.category,
      assignmentId: primary.assignmentId,
      items,
      totalPercentage,
      totalValue,
    };
  }

  private serializeTechnicalBonusItems(items: ResolvedTechnicalBonusItem[]) {
    return items.map((item) => ({
      assignment_id: item.assignmentId,
      assignmentId: item.assignmentId,
      category: item.category,
      label: item.label,
      percentage: item.percentage,
      value: item.value,
      template_text: item.templateText,
      templateText: item.templateText,
      display_order: item.displayOrder,
      displayOrder: item.displayOrder,
    }));
  }

  private extractExceptionMessage(error: any, fallback: string): string {
    const response =
      error && typeof error.getResponse === 'function'
        ? error.getResponse()
        : undefined;

    if (typeof response === 'string' && response.trim()) {
      return response.trim();
    }

    if (response && typeof response === 'object') {
      const message = (response as any).message;
      if (Array.isArray(message) && message.length) {
        const first = String(message[0] || '').trim();
        if (first) return first;
      }
      if (typeof message === 'string' && message.trim()) {
        return message.trim();
      }
    }

    const message = String(error?.message || '').trim();
    return message || fallback;
  }

  private resolveTemplateTypeFromText(value: string): TemplateType {
    const text = this.normalizeTemplateText(value);
    if (!text) {
      return 'administrador';
    }
    return /\bdocen\w*\b|\bdoc\b/.test(text) ? 'docente' : 'administrador';
  }

  private resolveTemplateTypeFromRequest(
    request: CertificateRequest,
  ): TemplateType {
    const raw = `${request?.position_category || ''} ${request?.career_category || ''}`;
    return this.resolveTemplateTypeFromText(raw);
  }

  private resolveTemplateTypeFromCertificate(
    certificate: Certificate,
  ): TemplateType {
    const raw = `${certificate?.position_category || ''} ${certificate?.career_category || ''}`;
    return this.resolveTemplateTypeFromText(raw);
  }

  private normalizePersistedCodeValue(
    value?: string | number | null,
    relatedGrade?: string | number | null,
  ): string | undefined {
    if (value === undefined) return undefined;
    if (value === null) return undefined;

    const raw = String(value).trim();
    if (!raw) return '';

    const digits = raw.replace(/\D+/g, '');
    if (!digits) return raw;

    if (typeof value === 'number') {
      const gradeDigits = String(relatedGrade ?? '').replace(/\D+/g, '');
      const compactTargetLength = 4 + gradeDigits.length;
      if (
        gradeDigits &&
        digits.endsWith(gradeDigits) &&
        digits.length < compactTargetLength
      ) {
        return digits.padStart(compactTargetLength, '0');
      }
    }

    return digits;
  }

  private normalizeRenderedCargoCode(
    value?: string | number | null,
    relatedGrade?: string | number | null,
  ): string | undefined {
    const normalized = this.normalizePersistedCodeValue(value, relatedGrade);
    if (!normalized || /^0+$/.test(normalized) || normalized.length <= 4) {
      return normalized;
    }
    return normalized.slice(0, 4);
  }

  private selectPreferredNormalizedCodeValue(
    ...pairs: Array<{
      value?: string | number | null;
      relatedGrade?: string | number | null;
    }>
  ): string | undefined {
    const normalized = pairs
      .map(
        ({ value, relatedGrade }) =>
          this.normalizePersistedCodeValue(value, relatedGrade) || '',
      )
      .filter(Boolean);

    if (!normalized.length) {
      return undefined;
    }

    return normalized.sort((left, right) => {
      if (left.length !== right.length) {
        return right.length - left.length;
      }
      const leftHasLeadingZero = left.startsWith('0') ? 1 : 0;
      const rightHasLeadingZero = right.startsWith('0') ? 1 : 0;
      return rightHasLeadingZero - leftHasLeadingZero;
    })[0];
  }

  private selectCompatibleRequestsForCodeSelection(
    selectedRequest: CertificateRequest,
    requests: CertificateRequest[],
  ): CertificateRequest[] {
    const selectedCareer = this.normalizeTemplateText(
      selectedRequest.career_category || '',
    );
    const selectedPosition = this.normalizeTemplateText(
      selectedRequest.position_category || '',
    );
    const selectedGrade = this.normalizePersistedCodeValue(
      selectedRequest.cod_grade,
    );

    const compatible = requests.filter((request) => {
      if (request.id === selectedRequest.id) {
        return true;
      }

      const sameCareer =
        !!selectedCareer &&
        this.normalizeTemplateText(request.career_category || '') ===
          selectedCareer;
      const samePosition =
        !!selectedPosition &&
        this.normalizeTemplateText(request.position_category || '') ===
          selectedPosition;
      const requestGrade = this.normalizePersistedCodeValue(request.cod_grade);
      const sameGrade =
        !selectedGrade || !requestGrade || requestGrade === selectedGrade;

      return sameCareer && samePosition && sameGrade;
    });

    return compatible.length ? compatible : [selectedRequest];
  }

  private normalizeDateOnly(value?: Date | string | null): Date | null {
    if (!value) return null;

    if (typeof value === 'string') {
      const raw = value.trim();
      if (!raw) return null;

      const ymdMatch = raw.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})(?:\s+.*)?$/);
      if (ymdMatch) {
        const [, year, month, day] = ymdMatch;
        return this.dateOnlyFromParts(Number(year), Number(month), Number(day));
      }

      const dmyMatch = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s+.*)?$/);
      if (dmyMatch) {
        const [, day, month, year] = dmyMatch;
        return this.dateOnlyFromParts(Number(year), Number(month), Number(day));
      }
    }

    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) return null;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
  }

  private dateOnlyFromParts(year: number, month: number, day: number): Date | null {
    const date = new Date(year, month - 1, day, 12, 0, 0);
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }

    return date;
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

  private normalizeEmploymentStatus(
    statusRaw?: string | null,
  ): 'ACTIVO' | 'INACTIVO' | null {
    const status = String(statusRaw || '')
      .trim()
      .toUpperCase();
    if (!status) return null;
    if (status === 'A' || status === 'ACTIVO' || status === 'ACTIVE')
      return 'ACTIVO';
    if (status === 'I' || status === 'INACTIVO' || status === 'INACTIVE')
      return 'INACTIVO';
    return null;
  }

  private resolveEmploymentStatus(
    hiringDate?: Date | string | null,
    endDate?: Date | string | null,
    statusRaw?: string | null,
  ): 'ACTIVO' | 'INACTIVO' {
    const statusByDate = this.resolveEmploymentStatusByDates(
      hiringDate,
      endDate,
    );
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
    return this.resolveEmploymentStatusByDates(hiringDate, endDate) === 'ACTIVO'
      ? 'A'
      : 'I';
  }

  private normalizeEncargoType(value?: string | null): 'E' | 'N' | null {
    const normalized = String(value || '')
      .trim()
      .toUpperCase();
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

  private isPrimaryAdministrativeAct(
    positionCategory?: string | null,
  ): boolean {
    const normalized = this.normalizeTemplateText(positionCategory || '');
    if (!normalized) {
      return false;
    }

    return (
      normalized.includes('cra administrativa') ||
      normalized.includes('carrera administrativa')
    );
  }

  private sortRequestsBySelectionDate(
    requests: CertificateRequest[],
  ): CertificateRequest[] {
    const toTimestamp = (value?: Date | string | null): number => {
      if (!value) return Number.NEGATIVE_INFINITY;
      const timestamp =
        value instanceof Date ? value.getTime() : new Date(value).getTime();
      return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp;
    };
    const getPrimaryTimestamp = (request: CertificateRequest): number =>
      toTimestamp(
        request.request_date || request.hiring_date || request.created_at,
      );

    return requests
      .map((request, originalIndex) => ({ request, originalIndex }))
      .sort((left, right) => {
        const requestDateDifference =
          getPrimaryTimestamp(right.request) -
          getPrimaryTimestamp(left.request);
        if (requestDateDifference !== 0) return requestDateDifference;

        const hiringDateDifference =
          toTimestamp(right.request.hiring_date) -
          toTimestamp(left.request.hiring_date);
        if (hiringDateDifference !== 0) return hiringDateDifference;

        const createdAtDifference =
          toTimestamp(right.request.created_at) -
          toTimestamp(left.request.created_at);
        if (createdAtDifference !== 0) return createdAtDifference;

        return left.originalIndex - right.originalIndex;
      })
      .map(({ request }) => request);
  }

  private selectPreferredRequestForCertificate(
    requests: CertificateRequest[],
  ): CertificateRequest | null {
    if (!requests.length) {
      return null;
    }

    const orderedRequests = this.sortRequestsBySelectionDate(requests);

    // Prioridad 1: contratos activos.
    const activeRequests = orderedRequests.filter(
      (request) =>
        this.resolveEmploymentStatus(
          request.hiring_date,
          request.request_date,
          request.status,
        ) === 'ACTIVO',
    );

    // Prioridad 2 dentro de activos: encargos vigentes.
    // Si existe un encargo activo, debe ser la base del certificado.
    const activeEncargoRequests = activeRequests.filter(
      (request) => this.normalizeEncargoType(request.observations) === 'E',
    );

    if (activeEncargoRequests.length) {
      return activeEncargoRequests[0];
    }

    // Prioridad 3 dentro de activos: contrato base (no encargo).
    const activeWithoutEncargo = activeRequests.filter(
      (request) => this.normalizeEncargoType(request.observations) !== 'E',
    );

    // Desempate controlado: si existen varios activos sin encargo,
    // priorizar el registro principal de carrera administrativa.
    const primaryAdministrativeActiveWithoutEncargo =
      activeWithoutEncargo.filter((request) =>
        this.isPrimaryAdministrativeAct(request.position_category),
      );

    if (primaryAdministrativeActiveWithoutEncargo.length) {
      return primaryAdministrativeActiveWithoutEncargo[0];
    }

    if (activeWithoutEncargo.length) {
      return activeWithoutEncargo[0];
    }

    if (activeRequests.length) {
      return activeRequests[0];
    }

    // Fallback: mantener comportamiento previo tomando el registro mas reciente.
    return orderedRequests[0];
  }

  private selectSalarySourceForCertificate(
    selectedRequest: CertificateRequest | null,
    requests: CertificateRequest[],
  ): CertificateRequest | null {
    if (!selectedRequest || !requests.length) {
      return null;
    }

    const selectedIsActive =
      this.resolveEmploymentStatus(
        selectedRequest.hiring_date,
        selectedRequest.request_date,
        selectedRequest.status,
      ) === 'ACTIVO';
    const selectedIsEncargo =
      this.normalizeEncargoType(selectedRequest.observations) === 'E';

    // Solo aplicar salario de encargo cuando el contrato principal es activo y no encargo.
    if (!selectedIsActive || selectedIsEncargo) {
      return null;
    }

    const activeEncargo = this.sortRequestsBySelectionDate(requests).filter(
      (request) => {
        if (request.id === selectedRequest.id) {
          return false;
        }
        const isActive =
          this.resolveEmploymentStatus(
            request.hiring_date,
            request.request_date,
            request.status,
          ) === 'ACTIVO';
        const isEncargo =
          this.normalizeEncargoType(request.observations) === 'E';
        return isActive && isEncargo;
      },
    );

    if (!activeEncargo.length) {
      return null;
    }

    return activeEncargo[0];
  }

  private selectHiringDateSourceForCertificate(
    selectedRequest: CertificateRequest,
    requests: CertificateRequest[],
  ): CertificateRequest {
    const activeWithoutEncargo = this.sortRequestsBySelectionDate(
      requests,
    ).filter((request) => {
      const isActive =
        this.resolveEmploymentStatus(
          request.hiring_date,
          request.request_date,
          request.status,
        ) === 'ACTIVO';
      const isEncargo = this.normalizeEncargoType(request.observations) === 'E';
      return isActive && !isEncargo;
    });

    const primaryAdministrativeActiveWithoutEncargo =
      activeWithoutEncargo.filter((request) =>
        this.isPrimaryAdministrativeAct(request.position_category),
      );

    return (
      primaryAdministrativeActiveWithoutEncargo[0] ||
      activeWithoutEncargo[0] ||
      selectedRequest
    );
  }

  private mergeRequestWithSalarySource(
    selectedRequest: CertificateRequest,
    salarySource: CertificateRequest | null,
    relatedRequests: CertificateRequest[] = [selectedRequest],
  ): CertificateRequest {
    const hiringDateSource = this.selectHiringDateSourceForCertificate(
      selectedRequest,
      relatedRequests,
    );
    const mergedBase =
      !salarySource || salarySource.id === selectedRequest.id
        ? {
            ...selectedRequest,
            hiring_date: hiringDateSource.hiring_date,
          }
        : {
            ...selectedRequest,
            hiring_date: hiringDateSource.hiring_date,
            monthly_salary: salarySource.monthly_salary,
            salary_text:
              salarySource.salary_text ?? selectedRequest.salary_text,
          };

    const compatibleRequests = this.selectCompatibleRequestsForCodeSelection(
      mergedBase,
      relatedRequests,
    );
    const preferredCodGrade = this.selectPreferredNormalizedCodeValue(
      ...compatibleRequests.map((request) => ({
        value: request.cod_grade,
      })),
    );
    const preferredCodCargo = this.selectPreferredNormalizedCodeValue(
      ...compatibleRequests.map((request) => ({
        value: request.cod_cargo,
        relatedGrade: request.cod_grade || preferredCodGrade,
      })),
    );

    return {
      ...mergedBase,
      cod_cargo: preferredCodCargo ?? mergedBase.cod_cargo,
      cod_grade: preferredCodGrade ?? mergedBase.cod_grade,
    };
  }

  private applyRequestContextToCertificate(
    certificate: Certificate,
    requests: CertificateRequest[],
  ): Certificate {
    if (!requests.length) {
      return certificate;
    }

    const cert = certificate as Certificate & {
      request?: CertificateRequest | null;
    };
    const baseRequest =
      cert.request ||
      requests.find((request) => request.id === certificate.request_id) ||
      this.selectPreferredRequestForCertificate(requests);

    if (!baseRequest) {
      return certificate;
    }

    const salarySource = this.selectSalarySourceForCertificate(
      baseRequest,
      requests,
    );
    const requestContext = this.mergeRequestWithSalarySource(
      baseRequest,
      salarySource,
      requests,
    );

    cert.request = cert.request
      ? ({ ...cert.request, ...requestContext } as CertificateRequest)
      : requestContext;

    if (requestContext.cod_cargo) {
      cert.cod_cargo = requestContext.cod_cargo;
    }
    if (requestContext.cod_grade) {
      cert.cod_grade = requestContext.cod_grade;
    }

    return cert;
  }

  private async hydrateCertificatesRequestContext(
    certificates: Certificate[],
  ): Promise<void> {
    if (!certificates.length) {
      return;
    }

    const idNumbers = Array.from(
      new Set(
        certificates
          .map((certificate) =>
            this.sanitizeIdNumber(
              (
                certificate as Certificate & {
                  request?: { id_number?: string };
                }
              ).request?.id_number || certificate.id_number,
            ),
          )
          .filter(Boolean),
      ),
    );

    if (!idNumbers.length) {
      return;
    }

    const requests = await this.requestRepo
      .createQueryBuilder('request')
      .where(
        `REPLACE(REPLACE(REPLACE(request.id_number, '.', ''), '-', ''), ' ', '') IN (:...idNumbers)`,
        { idNumbers },
      )
      .orderBy(
        'COALESCE(request.request_date, request.hiring_date, request.created_at)',
        'DESC',
      )
      .addOrderBy('request.hiring_date', 'DESC')
      .addOrderBy('request.created_at', 'DESC')
      .getMany();

    if (!requests.length) {
      return;
    }

    const requestsByIdNumber = new Map<string, CertificateRequest[]>();
    for (const request of requests) {
      const idNumber = this.sanitizeIdNumber(request.id_number);
      if (!idNumber) {
        continue;
      }
      const bucket = requestsByIdNumber.get(idNumber);
      if (bucket) {
        bucket.push(request);
      } else {
        requestsByIdNumber.set(idNumber, [request]);
      }
    }

    for (const certificate of certificates) {
      const idNumber = this.sanitizeIdNumber(
        (certificate as Certificate & { request?: { id_number?: string } })
          .request?.id_number || certificate.id_number,
      );
      if (!idNumber) {
        continue;
      }
      const relatedRequests = requestsByIdNumber.get(idNumber) || [];
      this.applyRequestContextToCertificate(certificate, relatedRequests);
    }
  }

  private async ensureTemplateSnapshotForCertificate(
    certificate: Certificate,
  ): Promise<Certificate> {
    const cert = certificate as Certificate & {
      template_snapshot?: any;
      template_type?: string;
      template_version?: string;
    };

    if (cert.template_snapshot) {
      return certificate;
    }

    const templateType =
      (cert.template_type as TemplateType) ||
      this.resolveTemplateTypeFromCertificate(certificate);
    const config =
      await this.templateConfigService.getActiveConfig(templateType);
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

  private async ensureTemplateSnapshots(
    certificates: Certificate[],
  ): Promise<void> {
    const missing = certificates.filter(
      (cert) => !(cert as any)?.template_snapshot,
    );
    if (!missing.length) {
      return;
    }

    const typesNeeded = new Set<TemplateType>();
    for (const cert of missing) {
      const templateType =
        ((cert as any)?.template_type as TemplateType) ||
        this.resolveTemplateTypeFromCertificate(cert);
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
          ((cert as any)?.template_type as TemplateType) ||
          this.resolveTemplateTypeFromCertificate(cert);
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
    @InjectRepository(TechnicalBonusAssignment)
    private technicalBonusRepo: Repository<TechnicalBonusAssignment>,
    @InjectRepository(TechnicalBonusTemplate)
    private technicalBonusTemplateRepo: Repository<TechnicalBonusTemplate>,
    @InjectRepository(CertificateCorrectionRequest)
    private correctionRequestRepo: Repository<CertificateCorrectionRequest>,
    private certificateGenerator: CertificateGeneratorService,
    private laborPdfService: LaborCertificatePdfService,
    private templateConfigService: TemplateConfigService,
    private laborOracleIntegrationService: LaborOracleIntegrationService,
    private laborFunctionsService: LaborFunctionsService,
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

    const destinatarioSeguro =
      this.resolveOutboundEmailRecipient(destinatario);
    const baseUrl = this.resolveNotificationsBaseUrl();
    const url = `${baseUrl}/api/v1/emails/validation-code`;
    this.logger.debug(`Llamando al servicio: ${url}`);
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: destinatarioSeguro, code: codigo }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new Error(
        `Notifications service error (${response.status}): ${errorBody || 'sin detalle'}`,
      );
    }

    this.logger.log(
      `Solicitud de envío de código enviada a notifications-service para ${destinatarioSeguro}`,
    );
  }

  private normalizarCorreo(email?: string | null): string {
    return typeof email === 'string' ? email.trim() : '';
  }

  private tieneFormatoCorreoValido(email?: string | null): boolean {
    const correoNormalizado = this.normalizarCorreo(email);
    if (!correoNormalizado || correoNormalizado.toLowerCase() === 'n/a') {
      return false;
    }
    return this.emailFormatRegex.test(correoNormalizado);
  }

  private resolveOutboundEmailRecipient(requestedRecipient: string): string {
    if (!CERTIFICATION_EMAIL_SAFE_MODE) {
      return requestedRecipient;
    }
    this.logger.warn(
      `Modo seguro de correo activo: destinatario redirigido a ${CERTIFICATION_EMAIL_SAFE_RECIPIENT}`,
    );
    return CERTIFICATION_EMAIL_SAFE_RECIPIENT;
  }

  private buildLaborEmailHtml(
    certificate: Certificate,
    recipientName?: string,
    correctionMessage?: string,
    correctionRequestNumber?: string,
    correctionEvidenceCount = 0,
  ): string {
    const nombre = this.escapeEmailHtml(recipientName || certificate.full_name || 'usuario');
    const consecutivo = this.escapeEmailHtml(certificate.certificate_number || 'ESAP');
    const solicitud = this.escapeEmailHtml(correctionRequestNumber || '');
    const isCorrection = Boolean(correctionRequestNumber || correctionMessage);
    const evidenceLabel = correctionEvidenceCount === 1 ? '1 evidencia de la decisión' : `${correctionEvidenceCount} evidencias de la decisión`;
    const correctionMessageBlock = correctionMessage
      ? `<table width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;margin-bottom:16px;">
          <tr><td style="padding:14px 16px;font-size:13px;color:#065f46;line-height:1.6;"><strong>Descripción de la decisión</strong><br>${this.escapeEmailHtml(correctionMessage)}</td></tr>
        </table>`
      : '';
    const requestRow = solicitud
      ? `<tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;"><span style="font-size:12px;color:#6b7280;">Número de solicitud</span><br><span style="font-size:14px;font-weight:700;color:#003DA5;">${solicitud}</span></td></tr>`
      : '';
    const evidenceText = correctionEvidenceCount > 0
      ? ` También encontrarás adjunta${correctionEvidenceCount === 1 ? '' : 's'} ${evidenceLabel}.`
      : '';
    return `
      <div style="font-family: Arial,'Helvetica Neue',sans-serif; background-color: #f0f4f8; padding: 32px 16px; margin: 0;">
        <table width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center">
          <table cellspacing="0" cellpadding="0" border="0" style="max-width:560px;width:100%;background-color:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #dde3ed;">
            <tr>
              <td style="background-image:linear-gradient(135deg,#003DA5 0%,#1565C0 100%);background-color:#003DA5;padding:0;">
                <table width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr><td style="height:4px;background-color:#34D399;font-size:0;line-height:0;">&nbsp;</td></tr>
                  <tr><td style="padding:22px 28px 18px 28px;">
                    <table width="100%" cellspacing="0" cellpadding="0" border="0"><tr>
                      <td><div style="font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;">ESAP</div><div style="font-size:10px;color:rgba(255,255,255,0.7);margin-top:2px;letter-spacing:0.8px;text-transform:uppercase;">Certificados Laborales</div></td>
                      <td align="right"><span style="background-color:rgba(52,211,153,0.25);color:#ffffff;font-size:11px;font-weight:600;padding:4px 12px;border-radius:20px;">${isCorrection ? 'Corrección aprobada' : 'Documento listo'}</span></td>
                    </tr></table>
                  </td></tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 28px 8px 28px;">
                <h1 style="margin:0 0 6px 0;font-size:22px;font-weight:700;color:#111827;">${isCorrection ? 'Tu solicitud de corrección fue aprobada' : 'Tu certificado laboral está listo'}</h1>
                <p style="margin:0 0 24px 0;font-size:14px;color:#6b7280;line-height:1.6;">Hola <strong style="color:#374151;">${nombre}</strong>, ${isCorrection ? 'finalizamos la revisión y adjuntamos el certificado laboral corregido con la plantilla institucional correspondiente.' : 'adjuntamos a este correo el certificado laboral que solicitaste a la ESAP.'}</p>
                ${correctionMessageBlock}
                <table width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;margin-bottom:16px;">
                  <tr><td style="padding:16px 20px;">
                    <p style="margin:0 0 12px 0;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.6px;">Detalle del documento</p>
                    <table width="100%" cellspacing="0" cellpadding="0" border="0">
                      ${requestRow}
                      <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;">
                        <span style="font-size:12px;color:#6b7280;">Número de certificado</span><br>
                        <span style="font-size:15px;font-weight:700;color:#111827;">${consecutivo}</span>
                      </td></tr>
                      <tr><td style="padding:8px 0;">
                        <span style="font-size:12px;color:#6b7280;">Tipo de certificado</span><br>
                        <span style="font-size:14px;font-weight:600;color:#374151;">Certificado Laboral — ESAP</span>
                      </td></tr>
                    </table>
                  </td></tr>
                </table>
                <table width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;margin-bottom:24px;">
                   <tr><td style="padding:12px 16px;font-size:13px;color:#15803d;line-height:1.5;">&#10003; ${isCorrection ? 'El certificado PDF corregido' : 'El archivo PDF'} se encuentra adjunto en este correo.${evidenceText}</td></tr>
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
  }

  private async enviarCertificadoLaboralPorEmail(
    certificate: Certificate,
    options: SendLaborCertificateOptions = {},
  ): Promise<{ to: string }> {
    const destinatarioSolicitado = (
      options.to ||
      certificate.request?.email ||
      ''
    ).trim();
    if (!destinatarioSolicitado) {
      throw new BadRequestException(
        'No hay un email registrado para enviar el certificado',
      );
    }
    const destinatario = this.resolveOutboundEmailRecipient(
      destinatarioSolicitado,
    );

    const includeSalaryPersisted = this.normalizeBoolean(
      (certificate as Certificate & { include_salary?: boolean | null })
        .include_salary,
      true,
    );
    const includeTechnicalBonusPersisted = this.normalizeBoolean(
      (
        certificate as Certificate & {
          include_technical_bonus?: boolean | null;
        }
      ).include_technical_bonus,
      false,
    );
    const includeSalary = this.normalizeBoolean(
      options.includeSalary,
      includeSalaryPersisted,
    );
    const includeTechnicalBonus = includeSalary
      ? this.normalizeBoolean(
          options.includeTechnicalBonus,
          includeTechnicalBonusPersisted,
        )
      : false;
    // Las funciones pertenecen al certificado emitido y a su snapshot. Nunca
    // se recalculan ni se apagan al descargar, corregir o reenviar el documento.
    const includeFunctions = this.normalizeBoolean(
      certificate.include_functions,
      false,
    );

    let technicalBonusTemplate: string | undefined;
    if (includeTechnicalBonus) {
      const snapshotTemplate = (certificate as Certificate & {
        template_snapshot?: any;
      }).template_snapshot?.technicalBonusTemplate;
      if (snapshotTemplate) {
        technicalBonusTemplate = snapshotTemplate;
      }
      // Sin snapshot (certificados anteriores): el PDF service usa el texto hardcoded
    }

    const attachment = await this.laborPdfService.generateCertificatePdf(
      certificate,
      {
        includeSalary,
        includeTechnicalBonus,
        includeFunctions,
        templateType: options.templateType,
        publicBaseUrl: options.publicBaseUrl,
        technicalBonusTemplate,
      },
    );

    const baseUrl = this.resolveNotificationsBaseUrl();
    const url = `${baseUrl}/api/v1/emails/send-with-attachment`;
    const subject = options.correctionRequestNumber
      ? `Corrección aprobada ${options.correctionRequestNumber} - Certificado Laboral ESAP`
      : `Certificado Laboral ESAP - ${certificate.certificate_number}`;
    const text = options.correctionMessage
      ? `Adjuntamos tu certificado laboral ${certificate.certificate_number}. Resultado de la revisión: ${options.correctionMessage}`
      : `Adjuntamos tu certificado laboral ${certificate.certificate_number}.`;

    const payload = {
      to: destinatario,
      subject,
      text,
      html: this.buildLaborEmailHtml(
        certificate,
        certificate.full_name,
        options.correctionMessage,
        options.correctionRequestNumber,
        options.correctionEvidenceCount,
      ),
      attachmentName: attachment.filename,
      attachmentBase64: attachment.buffer.toString('base64'),
      attachmentContentType: 'application/pdf',
      additionalAttachments: options.additionalAttachments || [],
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new Error(
        `Notifications service error (${response.status}): ${errorBody || 'sin detalle'}`,
      );
    }

    this.logger.log(`Certificado laboral enviado a ${destinatario}`);
    return { to: destinatario };
  }

  async generateCertificadoPdfBufferById(
    id: string,
    options: { publicBaseUrl?: string } = {},
  ): Promise<{ buffer: Buffer; filename: string }> {
    const certificate = await this.certificateRepo.findOne({
      where: { id },
      relations: ['request'],
    });

    if (!certificate) {
      throw new NotFoundException(`Certificado con ID ${id} no encontrado`);
    }

    await this.hydrateCertificatesRequestContext([certificate]);
    await this.ensureTemplateSnapshotForCertificate(certificate);

    const includeSalary = this.normalizeBoolean(
      (certificate as Certificate & { include_salary?: boolean | null }).include_salary,
      true,
    );
    const includeTechnicalBonus = includeSalary
      ? this.normalizeBoolean(
          (certificate as Certificate & { include_technical_bonus?: boolean | null }).include_technical_bonus,
          false,
        )
      : false;
    const includeFunctions = this.normalizeBoolean(
      certificate.include_functions,
      false,
    );

    let technicalBonusTemplate: string | undefined;
    if (includeTechnicalBonus) {
      const snapshotTemplate = (certificate as Certificate & { template_snapshot?: any }).template_snapshot?.technicalBonusTemplate;
      if (snapshotTemplate) {
        technicalBonusTemplate = snapshotTemplate;
      }
    }

    return this.laborPdfService.generateCertificatePdf(certificate, {
      includeSalary,
      includeTechnicalBonus,
      includeFunctions,
      technicalBonusTemplate,
      publicBaseUrl: options.publicBaseUrl,
    });
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

    await this.hydrateCertificatesRequestContext([certificate]);
    await this.ensureTemplateSnapshotForCertificate(certificate);

    const result = await this.enviarCertificadoLaboralPorEmail(
      certificate,
      options,
    );

    return {
      mensaje: `Certificado reenviado a ${result.to}`,
      email: result.to,
    };
  }

  // ============================================
  // CORRECCIONES DE CERTIFICADOS LABORALES
  // ============================================

  private addBusinessDays(start: Date, businessDays: number): Date {
    const result = new Date(start);
    result.setHours(12, 0, 0, 0);
    let added = 0;
    while (added < businessDays) {
      result.setDate(result.getDate() + 1);
      const day = result.getDay();
      const holidays = this.getColombianHolidays(result.getFullYear());
      if (day !== 0 && day !== 6 && !holidays.has(this.localDateKey(result))) added += 1;
    }
    return result;
  }

  private localDateKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  private nextMonday(date: Date): Date {
    const result = new Date(date);
    const daysUntilMonday = (8 - result.getDay()) % 7;
    result.setDate(result.getDate() + daysUntilMonday);
    return result;
  }

  private easterSunday(year: number): Date {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day, 12, 0, 0);
  }

  private getColombianHolidays(year: number): Set<string> {
    const holidays = new Set<string>();
    const add = (date: Date) => holidays.add(this.localDateKey(date));
    const fixed = (month: number, day: number) => new Date(year, month - 1, day, 12, 0, 0);
    const addObservedMonday = (month: number, day: number) => add(this.nextMonday(fixed(month, day)));
    const addEasterOffset = (offset: number) => {
      const date = this.easterSunday(year);
      date.setDate(date.getDate() + offset);
      add(date);
    };

    add(fixed(1, 1));
    addObservedMonday(1, 6);
    addObservedMonday(3, 19);
    addEasterOffset(-3); // Jueves Santo
    addEasterOffset(-2); // Viernes Santo
    add(fixed(5, 1));
    addEasterOffset(43); // Ascensión, trasladada al lunes
    addEasterOffset(64); // Corpus Christi, trasladado al lunes
    addEasterOffset(71); // Sagrado Corazón, trasladado al lunes
    addObservedMonday(6, 29);
    add(fixed(7, 20));
    add(fixed(8, 7));
    addObservedMonday(8, 15);
    addObservedMonday(10, 12);
    addObservedMonday(11, 1);
    addObservedMonday(11, 11);
    add(fixed(12, 8));
    add(fixed(12, 25));
    return holidays;
  }

  private buildCorrectionRequestNumber(): string {
    const now = new Date();
    const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const unique = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
      .toUpperCase()
      .slice(-9);
    return `COR-${date}-${unique}`;
  }

  private correctionEvidenceFromFiles(files: any[] = []): CertificateCorrectionEvidence[] {
    return files.map((file) => ({
      originalName: String(file.originalname || 'evidencia'),
      storedName: String(file.filename || ''),
      mimeType: String(file.mimetype || 'application/octet-stream'),
      size: Number(file.size || 0),
      relativePath: String(file.path || '').replace(/\\/g, '/'),
    }));
  }

  private correctionEmailAttachmentsFromFiles(files: any[] = []): OutboundEmailAttachment[] {
    return files.map((file) => ({
      filename: String(file.originalname || 'evidencia').replace(/["\r\n]/g, '_').slice(0, 255),
      contentBase64: readFileSync(String(file.path)).toString('base64'),
      contentType: String(file.mimetype || 'application/octet-stream'),
    }));
  }

  private correctionEmailAttachmentsFromEvidence(
    evidence: CertificateCorrectionEvidence[] = [],
  ): OutboundEmailAttachment[] {
    const resolutionRoot = resolve(
      process.cwd(),
      'private-uploads',
      'certificate-corrections',
      'resolution',
    );

    return evidence.map((item) => {
      const absolutePath = resolve(process.cwd(), String(item.relativePath || ''));
      const belongsToResolutionDirectory =
        absolutePath === resolutionRoot ||
        absolutePath.startsWith(`${resolutionRoot}${sep}`);
      if (!belongsToResolutionDirectory || !existsSync(absolutePath)) {
        throw new BadRequestException(
          `No se puede reenviar la corrección porque la evidencia ${item.originalName || ''} ya no está disponible.`,
        );
      }

      return {
        filename: String(item.originalName || 'evidencia')
          .replace(/["\r\n]/g, '_')
          .slice(0, 255),
        contentBase64: readFileSync(absolutePath).toString('base64'),
        contentType: String(item.mimeType || 'application/octet-stream'),
      };
    });
  }

  private certificateCorrectionSnapshot(certificate: Certificate) {
    return {
      id: certificate.id,
      certificate_number: certificate.certificate_number,
      verification_code: certificate.verification_code,
      full_name: certificate.full_name,
      document_type: certificate.document_type,
      id_number: certificate.id_number,
      career_category: certificate.career_category,
      hiring_date: certificate.hiring_date,
      position_category: certificate.position_category,
      position_location: certificate.position_location,
      monthly_salary: Number(certificate.monthly_salary || 0),
      technical_bonus: Number(certificate.technical_bonus || 0),
      include_salary: certificate.include_salary,
      include_technical_bonus: certificate.include_technical_bonus,
      include_functions: certificate.include_functions,
      functions_snapshot: certificate.functions_snapshot,
      salary_text: certificate.salary_text,
      department: certificate.department,
      cod_cargo: certificate.cod_cargo,
      cod_grade: certificate.cod_grade,
      encargo_type:
        certificate.encargo_type ??
        this.normalizeEncargoType(certificate.request?.observations),
      campus: certificate.campus,
      issue_date: certificate.issue_date,
      signer_name: certificate.signer_name,
      signer_position: certificate.signer_position,
      signer_department: certificate.signer_department,
    };
  }

  private correctionTraceEvent(
    event: Omit<CertificateCorrectionTraceEvent, 'id' | 'occurred_at'> & { occurred_at?: Date | string },
  ): CertificateCorrectionTraceEvent {
    return {
      ...event,
      id: randomUUID(),
      occurred_at: new Date(event.occurred_at || new Date()).toISOString(),
    };
  }

  private appendCorrectionTrace(
    request: CertificateCorrectionRequest,
    event: CertificateCorrectionTraceEvent,
  ) {
    request.traceability = [
      ...(Array.isArray(request.traceability) ? request.traceability : []),
      event,
    ];
  }

  private correctionChanges(
    original: Record<string, unknown>,
    corrected: Record<string, unknown>,
  ) {
    const fields: Array<[string, string]> = [
      ['full_name', 'Nombre completo'],
      ['document_type', 'Tipo de documento'],
      ['id_number', 'Número de documento'],
      ['career_category', 'Cargo'],
      ['position_category', 'Tipo de vinculación'],
      ['hiring_date', 'Fecha de vinculación'],
      ['cod_cargo', 'Código de cargo'],
      ['cod_grade', 'Grado'],
      ['encargo_type', 'Indicador de encargo'],
      ['department', 'Dependencia'],
      ['position_location', 'Grupo o ubicación'],
      ['campus', 'Sede'],
      ['include_salary', 'Inclusión del salario'],
      ['monthly_salary', 'Salario mensual'],
      ['salary_text', 'Salario en letras'],
      ['include_technical_bonus', 'Inclusión de prima'],
      ['technical_bonus', 'Prima técnica o de coordinación'],
      ['include_functions', 'Inclusión de funciones'],
      ['functions_snapshot', 'Funciones laborales'],
    ];
    const comparable = (field: string, value: unknown) => {
      if (field === 'functions_snapshot') {
        const functions = this.correctionFunctionDescriptions(value, false);
        return functions.length
          ? `${functions.length} función${functions.length === 1 ? '' : 'es'}: ${functions
              .map((description, index) => `${index + 1}. ${description}`)
              .join(' | ')}`
          : 'Sin funciones';
      }
      if (value instanceof Date) return value.toISOString().slice(0, 10);
      if (typeof value === 'number') return String(value);
      if (typeof value === 'boolean') return value ? 'Sí' : 'No';
      const raw = String(value ?? '').trim();
      return /^\d{4}-\d{2}-\d{2}/.test(raw) ? raw.slice(0, 10) : raw;
    };
    return fields.flatMap(([field, label]) => {
      const before = comparable(field, original[field]);
      const after = comparable(field, corrected[field]);
      return before === after ? [] : [{ field, label, before, after }];
    });
  }

  private correctionResponse(request: CertificateCorrectionRequest) {
    const exposeEvidence = (items: CertificateCorrectionEvidence[] = []) =>
      items.map((item, index) => ({
        index,
        originalName: item.originalName,
        mimeType: item.mimeType,
        size: item.size,
      }));

    return {
      ...request,
      submitted_evidence: exposeEvidence(request.submitted_evidence),
      resolution_evidence: exposeEvidence(request.resolution_evidence),
    };
  }

  async createCertificateCorrectionRequest(
    data: {
      certificateId?: string;
      verificationCode?: string;
      description?: string;
    },
    files: any[] = [],
  ) {
    const certificateId = String(data.certificateId || '').trim();
    const verificationCode = String(data.verificationCode || '').trim();
    const description = String(data.description || '').trim();

    if (!certificateId || !verificationCode) {
      throw new BadRequestException('No fue posible identificar el certificado. Vuelve a generarlo e intenta nuevamente.');
    }
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(certificateId)) {
      throw new BadRequestException('El identificador del certificado no es válido.');
    }
    if (description.length < 20 || description.length > 2000) {
      throw new BadRequestException('La descripción debe tener entre 20 y 2.000 caracteres.');
    }
    if (files.length > 3) {
      throw new BadRequestException('Puedes adjuntar máximo tres archivos.');
    }

    const certificate = await this.certificateRepo.findOne({
      where: { id: certificateId },
      relations: ['request'],
    });
    if (!certificate || certificate.verification_code !== verificationCode) {
      throw new NotFoundException('El certificado indicado no existe o su código de validación no coincide.');
    }
    if (certificate.status !== 'VALID') {
      throw new BadRequestException('Solo se pueden solicitar correcciones de certificados vigentes.');
    }

    const existing = await this.correctionRequestRepo.findOne({
      where: {
        certificate_id: certificate.id,
        status: In(['PENDING', 'IN_REVIEW']),
      },
      order: { created_at: 'DESC' },
    });
    if (existing) {
      throw new ConflictException(
        `Ya existe una solicitud de corrección abierta para este certificado (${existing.request_number}).`,
      );
    }

    const requesterEmail = this.normalizarCorreo(certificate.request?.email);
    if (!requesterEmail || !this.tieneFormatoCorreoValido(requesterEmail)) {
      throw new BadRequestException('El certificado no tiene un correo registrado válido para recibir la respuesta.');
    }

    const dueDate = this.addBusinessDays(new Date(), 15);
    const request = this.correctionRequestRepo.create({
      request_number: this.buildCorrectionRequestNumber(),
      certificate_id: certificate.id,
      status: 'PENDING',
      description,
      requester_name: certificate.full_name,
      requester_email: requesterEmail,
      submitted_evidence: this.correctionEvidenceFromFiles(files),
      certificate_snapshot: this.certificateCorrectionSnapshot(certificate),
      due_date: dueDate,
      reviewed_by_id: null,
      reviewed_by_name: null,
      reviewed_by_email: null,
      review_started_at: null,
      resolution_description: null,
      resolution_evidence: [],
      corrected_data: null,
      traceability: [
        this.correctionTraceEvent({
          type: 'REQUEST_CREATED',
          title: 'Solicitud de corrección recibida',
          description,
          status: 'PENDING',
          actor_name: certificate.full_name,
          actor_email: requesterEmail,
          actor_role: 'SOLICITANTE',
          metadata: {
            certificate_id: certificate.id,
            certificate_number: certificate.certificate_number,
            due_date: this.localDateKey(dueDate),
            evidence_count: files.length,
          },
        }),
      ],
      resolved_at: null,
    });
    let saved: CertificateCorrectionRequest;
    try {
      saved = await this.correctionRequestRepo.save(request);
    } catch (error: any) {
      if (error?.code === '23505' || error?.driverError?.code === '23505') {
        throw new ConflictException('Ya existe una solicitud de corrección abierta para este certificado.');
      }
      throw error;
    }
    return {
      id: saved.id,
      request_number: saved.request_number,
      status: saved.status,
      due_date: saved.due_date,
      message: 'Tu solicitud de corrección fue enviada exitosamente.',
      business_days: 15,
    };
  }

  async listCertificateCorrectionRequests(params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(params.limit) || 10));
    const query = this.correctionRequestRepo
      .createQueryBuilder('correction')
      .leftJoinAndSelect('correction.certificate', 'certificate')
      .leftJoinAndSelect('certificate.request', 'certificateRequest')
      .addSelect(
        `CASE correction.status WHEN 'PENDING' THEN 0 WHEN 'IN_REVIEW' THEN 1 ELSE 2 END`,
        'correction_status_priority',
      );

    const status = String(params.status || '').trim().toUpperCase();
    if (status && status !== 'ALL') {
      query.andWhere('correction.status = :status', { status });
    }
    const search = String(params.search || '').trim();
    if (search) {
      query.andWhere(
        `(correction.request_number ILIKE :search
          OR correction.requester_name ILIKE :search
          OR correction.requester_email ILIKE :search
          OR certificate.certificate_number ILIKE :search
          OR certificate.id_number ILIKE :search)`,
        { search: `%${search}%` },
      );
    }

    const [items, total] = await query
      .orderBy('correction_status_priority', 'ASC')
      .addOrderBy('correction.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      // `data` is intentionally avoided here: the shared frontend ApiClient
      // unwraps that key and would discard the pagination metadata.
      items: items.map((item) => this.correctionResponse(item)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async getCertificateCorrectionStats() {
    const rows = await this.correctionRequestRepo
      .createQueryBuilder('correction')
      .select('correction.status', 'status')
      .addSelect('COUNT(correction.id)', 'count')
      .groupBy('correction.status')
      .getRawMany<{ status: string; count: string }>();
    const counts = Object.fromEntries(rows.map((row) => [row.status, Number(row.count) || 0]));
    const overdue = await this.correctionRequestRepo
      .createQueryBuilder('correction')
      .where("correction.status IN ('PENDING', 'IN_REVIEW')")
      .andWhere('correction.due_date < CURRENT_DATE')
      .getCount();
    return {
      total: Object.values(counts).reduce((sum, value) => sum + value, 0),
      pending: counts.PENDING || 0,
      in_review: counts.IN_REVIEW || 0,
      approved: counts.APPROVED || 0,
      rejected: counts.REJECTED || 0,
      overdue,
    };
  }

  async getCertificateCorrectionRequest(id: string) {
    const request = await this.correctionRequestRepo.findOne({
      where: { id },
      relations: ['certificate', 'certificate.request'],
    });
    if (!request) throw new NotFoundException('Solicitud de corrección no encontrada.');
    await this.ensureTemplateSnapshotForCertificate(request.certificate);
    return this.correctionResponse(request);
  }

  async previewCertificateCorrectionRequest(
    id: string,
    input: CorrectedCertificateData,
  ) {
    const request = await this.correctionRequestRepo.findOne({
      where: { id },
      relations: ['certificate', 'certificate.request'],
    });
    if (!request) throw new NotFoundException('Solicitud de corrección no encontrada.');
    await this.ensureTemplateSnapshotForCertificate(request.certificate);
    const patch = this.normalizeCorrectedCertificateData(request.certificate, input || {});
    const previewCertificate = Object.assign(
      new Certificate(),
      request.certificate,
      patch,
    );
    return this.laborPdfService.buildCertificatePreview(previewCertificate, {
      includeSalary: previewCertificate.include_salary,
      includeTechnicalBonus: previewCertificate.include_technical_bonus,
      includeFunctions: previewCertificate.include_functions,
    });
  }

  async startCertificateCorrectionReview(id: string, reviewer: CorrectionReviewer) {
    const request = await this.correctionRequestRepo.findOne({ where: { id } });
    if (!request) throw new NotFoundException('Solicitud de corrección no encontrada.');
    if (request.status === 'APPROVED' || request.status === 'REJECTED') {
      return this.getCertificateCorrectionRequest(id);
    }
    if (request.status === 'PENDING') {
      request.status = 'IN_REVIEW';
      request.review_started_at = new Date();
      this.appendCorrectionTrace(
        request,
        this.correctionTraceEvent({
          type: 'REVIEW_STARTED',
          title: 'Revisión iniciada por el coordinador',
          description: 'El caso fue abierto y quedó en revisión por el equipo de Certificados Laborales.',
          status: 'IN_REVIEW',
          actor_name: reviewer.name || 'Coordinador Certificados Laborales',
          actor_email: reviewer.email || null,
          actor_role: 'COORDINADOR',
          metadata: {},
        }),
      );
    }
    request.reviewed_by_id = reviewer.id || request.reviewed_by_id;
    request.reviewed_by_name = reviewer.name || request.reviewed_by_name || 'Coordinador Certificados Laborales';
    request.reviewed_by_email = reviewer.email || request.reviewed_by_email;
    await this.correctionRequestRepo.save(request);
    return this.getCertificateCorrectionRequest(id);
  }

  private correctionFunctionDescriptions(
    value: unknown,
    strict: boolean,
  ): string[] {
    let parsed = value;
    if (typeof parsed === 'string') {
      const trimmed = parsed.trim();
      if (/^[\[{]/.test(trimmed)) {
        try {
          parsed = JSON.parse(trimmed);
        } catch {
          if (strict) {
            throw new BadRequestException(
              'No fue posible interpretar la lista de funciones. Revisa el contenido e intenta nuevamente.',
            );
          }
        }
      }
    }

    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      parsed = (parsed as { functions?: unknown }).functions ?? [];
    }

    let descriptions: string[];
    if (Array.isArray(parsed)) {
      descriptions = parsed.map((item, index) => {
        const raw =
          typeof item === 'string'
            ? item
            : String(
                (item as { description?: unknown; text?: unknown; function?: unknown })
                  ?.description ??
                  (item as { text?: unknown })?.text ??
                  (item as { function?: unknown })?.function ??
                  '',
              );
        const description = raw
          .replace(/^\s*(?:funci[oó]n\s*)?\d{1,3}\s*[.)-]\s*/i, '')
          .replace(/[\u0000-\u001f\u007f\u00a0]+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        if (strict && !description) {
          throw new BadRequestException(`La función ${index + 1} está vacía.`);
        }
        return description;
      });
    } else {
      descriptions = parseLaborFunctionsRaw(parsed).map((description) =>
        description
          .replace(/[\u0000-\u001f\u007f\u00a0]+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim(),
      );
    }

    descriptions = descriptions.filter(Boolean);
    if (!strict) return descriptions;

    if (!descriptions.length) {
      throw new BadRequestException(
        'Agrega al menos una función o desmarca la opción de incluir funciones.',
      );
    }
    if (descriptions.length > 100) {
      throw new BadRequestException('Puedes incluir máximo 100 funciones por certificado.');
    }
    const invalidIndex = descriptions.findIndex(
      (description) => description.length < 3 || description.length > 2000,
    );
    if (invalidIndex >= 0) {
      throw new BadRequestException(
        `La función ${invalidIndex + 1} debe tener entre 3 y 2.000 caracteres.`,
      );
    }
    if (descriptions.join('\n').length > 50000) {
      throw new BadRequestException(
        'El contenido total de las funciones supera el máximo permitido de 50.000 caracteres.',
      );
    }
    const duplicates = findDuplicateLaborFunctions(descriptions);
    if (duplicates.length) {
      const detail = duplicates
        .map(
          (duplicate) =>
            `la función ${duplicate.duplicateOrdinal} repite la función ${duplicate.originalOrdinal}: «${duplicate.description.slice(0, 140)}${duplicate.description.length > 140 ? '…' : ''}»`,
        )
        .join('; ');
      throw new BadRequestException(
        `Hay funciones duplicadas: ${detail}. Elimina las repetidas antes de continuar.`,
      );
    }
    return descriptions;
  }

  private correctedFunctionsSnapshot(
    certificate: Certificate,
    input: CorrectedCertificateData,
    includeFunctions: boolean,
  ) {
    const originalSnapshot = certificate.functions_snapshot;
    if (!includeFunctions) return originalSnapshot ?? null;

    const hasFunctionsInput = Object.prototype.hasOwnProperty.call(
      input,
      'functions',
    );
    const functions = this.correctionFunctionDescriptions(
      hasFunctionsInput ? input.functions : originalSnapshot,
      true,
    );
    const currentFunctions = this.correctionFunctionDescriptions(
      originalSnapshot,
      false,
    );
    const unchanged =
      currentFunctions.length === functions.length &&
      currentFunctions.every(
        (description, index) =>
          normalizeLaborFunctionText(description) ===
          normalizeLaborFunctionText(functions[index]),
      );
    if (unchanged && originalSnapshot) return originalSnapshot;

    let snapshotBase: Record<string, unknown> = {};
    if (originalSnapshot && typeof originalSnapshot === 'object') {
      snapshotBase = { ...(originalSnapshot as Record<string, unknown>) };
    } else if (typeof originalSnapshot === 'string') {
      try {
        const parsed = JSON.parse(originalSnapshot);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          snapshotBase = { ...parsed };
        }
      } catch {
        snapshotBase = {};
      }
    }

    return {
      ...snapshotBase,
      correction_source: 'CERTIFICATE_CORRECTION',
      corrected_at: new Date().toISOString(),
      functions: functions.map((description, index) => ({
        ordinal: index + 1,
        description,
      })),
    };
  }

  private normalizeCorrectedCertificateData(
    certificate: Certificate,
    input: CorrectedCertificateData,
  ): Partial<Certificate> {
    const text = (value: unknown, field: string, maxLength: number, required = false) => {
      const normalized = String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
      if (required && !normalized) throw new BadRequestException(`${field} es obligatorio.`);
      if (normalized.length > maxLength) throw new BadRequestException(`${field} supera el máximo de ${maxLength} caracteres.`);
      if (/[<>]/.test(normalized)) throw new BadRequestException(`${field} contiene caracteres no permitidos.`);
      return normalized;
    };
    const money = (value: unknown, field: string) => {
      const parsed = Number(value);
      if (!Number.isFinite(parsed) || parsed < 0 || parsed > 9999999999) {
        throw new BadRequestException(`${field} debe ser un valor numérico válido.`);
      }
      if (!Number.isInteger(parsed)) {
        throw new BadRequestException(`${field} debe expresarse en pesos enteros, sin decimales.`);
      }
      return parsed;
    };
    const hiringDate = this.normalizeDateOnly(input.hiring_date || certificate.hiring_date);
    if (!hiringDate) {
      throw new BadRequestException('La fecha de vinculación no es válida.');
    }
    const includeSalary = this.normalizeBoolean(input.include_salary, certificate.include_salary);
    const includeTechnicalBonus = includeSalary
      ? this.normalizeBoolean(input.include_technical_bonus, certificate.include_technical_bonus)
      : false;
    const includeFunctions = this.normalizeBoolean(
      input.include_functions,
      this.normalizeBoolean(certificate.include_functions, false),
    );
    const functionsSnapshot = this.correctedFunctionsSnapshot(
      certificate,
      input,
      includeFunctions,
    );
    const currentEncargoType =
      certificate.encargo_type ??
      this.normalizeEncargoType(certificate.request?.observations) ??
      'N';
    const encargoType = this.normalizeEncargoType(
      input.encargo_type ?? currentEncargoType,
    );
    if ('encargo_type' in input && !encargoType) {
      throw new BadRequestException('El indicador de encargo debe ser E o N.');
    }
    const renderedCargoCode = this.normalizeRenderedCargoCode(
      input.cod_cargo ?? certificate.cod_cargo,
      input.cod_grade ?? certificate.cod_grade,
    );

    return {
      full_name: text(input.full_name ?? certificate.full_name, 'El nombre', 255, true) as string,
      document_type: this.normalizeLaborDocumentType(input.document_type ?? certificate.document_type, { strict: true }),
      id_number: text(input.id_number ?? certificate.id_number, 'El documento', 50, true) as string,
      career_category: text(input.career_category ?? certificate.career_category, 'El cargo', 100, true) as string,
      position_category: text(input.position_category ?? certificate.position_category, 'El tipo de vinculación', 100, true) as string,
      position_location: text(input.position_location ?? certificate.position_location, 'La ubicación del cargo', 150),
      department: text(input.department ?? certificate.department, 'La dependencia', 255),
      cod_cargo: text(renderedCargoCode, 'El código del cargo', 255),
      cod_grade: text(input.cod_grade ?? certificate.cod_grade, 'El grado', 255),
      encargo_type: encargoType || 'N',
      campus: text(input.campus ?? certificate.campus, 'La sede', 100),
      hiring_date: hiringDate,
      monthly_salary: money(input.monthly_salary ?? certificate.monthly_salary, 'El salario'),
      // Campo heredado: se conserva por compatibilidad, pero el texto visible se
      // calcula siempre desde monthly_salary en el renderizador institucional.
      salary_text: text(certificate.salary_text, 'El salario en letras', 255),
      technical_bonus: money(input.technical_bonus ?? certificate.technical_bonus ?? 0, 'La prima técnica'),
      include_salary: includeSalary,
      include_technical_bonus: includeTechnicalBonus,
      include_functions: includeFunctions,
      functions_snapshot: functionsSnapshot,
      issue_date: new Date(),
      issuance_timestamp: new Date(),
      is_corrected: true,
      last_corrected_at: new Date(),
    };
  }

  async approveCertificateCorrectionRequest(
    id: string,
    input: CorrectedCertificateData,
    reviewer: CorrectionReviewer,
    files: any[] = [],
  ) {
    const request = await this.correctionRequestRepo.findOne({
      where: { id },
      relations: ['certificate', 'certificate.request'],
    });
    if (!request) throw new NotFoundException('Solicitud de corrección no encontrada.');
    if (!['PENDING', 'IN_REVIEW'].includes(request.status)) {
      throw new ConflictException('Esta solicitud ya fue resuelta.');
    }

    const resolutionDescription = String(input?.resolution_description || '').trim();
    if (resolutionDescription.length < 20 || resolutionDescription.length > 1000) {
      throw new BadRequestException('La descripción de la aprobación debe tener entre 20 y 1.000 caracteres.');
    }
    if (files.length > 2) throw new BadRequestException('Puedes adjuntar máximo dos imágenes.');
    const immutableOriginalSnapshot = request.certificate_snapshot || {};
    const originalSnapshot = {
      ...immutableOriginalSnapshot,
      include_functions: Object.prototype.hasOwnProperty.call(
        immutableOriginalSnapshot,
        'include_functions',
      )
        ? immutableOriginalSnapshot.include_functions
        : request.certificate.include_functions,
      functions_snapshot: Object.prototype.hasOwnProperty.call(
        immutableOriginalSnapshot,
        'functions_snapshot',
      )
        ? immutableOriginalSnapshot.functions_snapshot
        : request.certificate.functions_snapshot,
      cod_cargo: this.normalizeRenderedCargoCode(
        (immutableOriginalSnapshot.cod_cargo as string | number | null | undefined) ??
          request.certificate.cod_cargo,
        (immutableOriginalSnapshot.cod_grade as string | number | null | undefined) ??
          request.certificate.cod_grade,
      ),
      encargo_type:
        this.normalizeEncargoType(
          (immutableOriginalSnapshot.encargo_type as string | null | undefined) ??
            request.certificate.encargo_type ??
            request.certificate.request?.observations,
        ) ?? 'N',
    };
    const patch = this.normalizeCorrectedCertificateData(request.certificate, input || {});
    Object.assign(request.certificate, patch);
    await this.ensureTemplateSnapshotForCertificate(request.certificate);
    const correctedSnapshot = this.certificateCorrectionSnapshot(request.certificate);
    request.resolution_evidence = this.correctionEvidenceFromFiles(files);
    const decisionAttachments = this.correctionEmailAttachmentsFromFiles(files);

    // El envío es obligatorio: el caso solo se resuelve cuando el PDF corregido
    // fue aceptado por el servicio institucional de notificaciones.
    const sent = await this.enviarCertificadoLaboralPorEmail(request.certificate, {
      to: request.requester_email,
      correctionMessage: resolutionDescription,
      correctionRequestNumber: request.request_number,
      correctionEvidenceCount: request.resolution_evidence.length,
      additionalAttachments: decisionAttachments,
    });

    await this.certificateRepo.save(request.certificate);
    if (!request.review_started_at) {
      request.review_started_at = new Date();
      this.appendCorrectionTrace(
        request,
        this.correctionTraceEvent({
          type: 'REVIEW_STARTED',
          title: 'Revisión iniciada por el coordinador',
          description: 'El caso fue tomado para revisión antes de registrar la decisión.',
          status: 'IN_REVIEW',
          actor_name: reviewer.name || 'Coordinador Certificados Laborales',
          actor_email: reviewer.email || null,
          actor_role: 'COORDINADOR',
          metadata: {},
        }),
      );
    }
    request.status = 'APPROVED';
    request.reviewed_by_id = reviewer.id || null;
    request.reviewed_by_name = reviewer.name || 'Coordinador Certificados Laborales';
    request.reviewed_by_email = reviewer.email || null;
    request.resolution_description = resolutionDescription;
    request.corrected_data = correctedSnapshot;
    request.resolved_at = new Date();
    this.appendCorrectionTrace(
      request,
      this.correctionTraceEvent({
        type: 'CERTIFICATE_SENT',
        title: 'Certificado corregido y enviado',
        description: resolutionDescription,
        status: 'APPROVED',
        occurred_at: request.resolved_at,
        actor_name: request.reviewed_by_name,
        actor_email: request.reviewed_by_email,
        actor_role: 'COORDINADOR',
        metadata: {
          certificate_number: request.certificate.certificate_number,
          requested_recipient: request.requester_email,
          recipient: sent.to,
          delivery_status: 'SENT',
           evidence_count: request.resolution_evidence.length,
           changes: this.correctionChanges(originalSnapshot, correctedSnapshot),
        },
      }),
    );
    await this.correctionRequestRepo.save(request);

    return {
      ...this.correctionResponse(request),
      message: 'El certificado corregido fue enviado exitosamente.',
      email: sent.to,
      email_sent: true,
    };
  }

  async resendApprovedCertificateCorrectionRequest(
    id: string,
    reviewer: CorrectionReviewer,
    options: { publicBaseUrl?: string } = {},
  ) {
    const request = await this.correctionRequestRepo.findOne({
      where: { id },
      relations: ['certificate', 'certificate.request'],
    });
    if (!request) {
      throw new NotFoundException('Solicitud de corrección no encontrada.');
    }
    if (request.status !== 'APPROVED') {
      throw new ConflictException(
        'Solo se pueden reenviar certificados de solicitudes corregidas y aprobadas.',
      );
    }
    if (!request.certificate || request.certificate.status !== 'VALID') {
      throw new BadRequestException(
        'El certificado corregido ya no está vigente y no puede reenviarse.',
      );
    }
    if (!this.tieneFormatoCorreoValido(request.requester_email)) {
      throw new BadRequestException(
        'La solicitud no tiene un correo registrado válido para realizar el reenvío.',
      );
    }

    await this.ensureTemplateSnapshotForCertificate(request.certificate);
    const approvedData = request.corrected_data ||
      this.certificateCorrectionSnapshot(request.certificate);
    const approvedCertificate = Object.assign(
      new Certificate(),
      request.certificate,
      approvedData,
      {
        id: request.certificate.id,
        request: request.certificate.request,
        template_snapshot: request.certificate.template_snapshot,
      },
    );
    const decisionEvidence = this.correctionEmailAttachmentsFromEvidence(
      request.resolution_evidence || [],
    );
    const sent = await this.enviarCertificadoLaboralPorEmail(
      approvedCertificate,
      {
        to: request.requester_email,
        publicBaseUrl: options.publicBaseUrl,
        correctionMessage: request.resolution_description || undefined,
        correctionRequestNumber: request.request_number,
        correctionEvidenceCount: decisionEvidence.length,
        additionalAttachments: decisionEvidence,
      },
    );

    this.appendCorrectionTrace(
      request,
      this.correctionTraceEvent({
        type: 'CERTIFICATE_RESENT',
        title: 'Certificado corregido reenviado',
        description:
          'Se reenvió al solicitante el certificado y la respuesta aprobada, sin modificar la decisión registrada.',
        status: 'APPROVED',
        actor_name:
          reviewer.name ||
          request.reviewed_by_name ||
          'Coordinador Certificados Laborales',
        actor_email: reviewer.email || request.reviewed_by_email,
        actor_role: 'COORDINADOR',
        metadata: {
          certificate_number: approvedCertificate.certificate_number,
          requested_recipient: request.requester_email,
          recipient: sent.to,
          delivery_status: 'SENT',
          evidence_count: decisionEvidence.length,
          resend: true,
        },
      }),
    );
    await this.correctionRequestRepo.save(request);

    return {
      ...this.correctionResponse(request),
      message: 'El certificado corregido fue reenviado exitosamente.',
      email: sent.to,
      email_sent: true,
    };
  }

  private escapeEmailHtml(value: string): string {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private buildCorrectionRejectionEmailHtml(
    request: CertificateCorrectionRequest,
    evidenceCount: number,
  ): string {
    const requestNumber = this.escapeEmailHtml(request.request_number);
    const certificateNumber = this.escapeEmailHtml(
      request.certificate?.certificate_number || 'Certificado laboral ESAP',
    );
    const requesterName = this.escapeEmailHtml(request.requester_name || 'usuario');
    const reason = this.escapeEmailHtml(request.resolution_description || '');
    const evidenceNotice = evidenceCount > 0
      ? `<table width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-top:16px;"><tr><td style="padding:13px 16px;font-size:13px;color:#475569;line-height:1.5;">Se adjunt${evidenceCount === 1 ? 'ó una evidencia' : `aron ${evidenceCount} evidencias`} que respalda${evidenceCount === 1 ? '' : 'n'} la decisión.</td></tr></table>`
      : '';

    return `<div style="font-family:Arial,'Helvetica Neue',sans-serif;background:#f0f4f8;padding:32px 16px;margin:0"><table width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center"><table cellspacing="0" cellpadding="0" border="0" style="max-width:560px;width:100%;background:#fff;border:1px solid #dde3ed;border-radius:10px;overflow:hidden"><tr><td style="height:4px;background:#ef4444;font-size:0;line-height:0">&nbsp;</td></tr><tr><td style="background:#003DA5;padding:20px 28px"><table width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td><div style="font-size:20px;font-weight:800;color:#fff">ESAP</div><div style="font-size:10px;color:#bfdbfe;margin-top:2px;letter-spacing:.8px;text-transform:uppercase">Certificados Laborales</div></td><td align="right"><span style="background:#fee2e2;color:#991b1b;font-size:11px;font-weight:700;padding:5px 12px;border-radius:20px">Solicitud no aprobada</span></td></tr></table></td></tr><tr><td style="padding:30px 28px 8px"><h1 style="margin:0 0 8px;font-size:22px;color:#111827">Resultado de tu solicitud de corrección</h1><p style="margin:0 0 22px;font-size:14px;color:#64748b;line-height:1.6">Hola <strong style="color:#334155">${requesterName}</strong>, finalizamos la revisión de la información y las evidencias remitidas.</p><table width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:16px"><tr><td style="padding:14px 16px"><span style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase">Solicitud</span><br><strong style="font-size:14px;color:#003DA5">${requestNumber}</strong><br><span style="display:inline-block;margin-top:9px;font-size:12px;color:#64748b">Certificado ${certificateNumber}</span></td></tr></table><table width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#fff1f2;border:1px solid #fecdd3;border-radius:8px"><tr><td style="padding:15px 16px;font-size:13px;color:#9f1239;line-height:1.65"><strong>Descripción de la decisión</strong><br>${reason}</td></tr></table>${evidenceNotice}<p style="margin:22px 0 14px;font-size:13px;color:#64748b;line-height:1.6">Esta respuesta y sus soportes quedan registrados en la trazabilidad de la solicitud.</p></td></tr><tr><td style="padding:14px 28px 18px;background:#f8fafc;border-top:1px solid #e2e8f0"><p style="margin:0;font-size:12px;color:#94a3b8">ESAP — Escuela Superior de Administración Pública</p></td></tr></table></td></tr></table></div>`;
  }

  private async sendCorrectionRejectionEmail(
    request: CertificateCorrectionRequest,
    files: any[] = [],
  ) {
    const to = this.resolveOutboundEmailRecipient(request.requester_email);
    const attachments = this.correctionEmailAttachmentsFromFiles(files);
    const payload = {
      to,
      subject: `Corrección no aprobada ${request.request_number} - Certificados Laborales ESAP`,
      text: `Tu solicitud de corrección ${request.request_number} fue revisada y no fue aprobada. Descripción: ${request.resolution_description || ''}`,
      html: this.buildCorrectionRejectionEmailHtml(request, attachments.length),
      attachments,
    };
    const response = await fetch(`${this.resolveNotificationsBaseUrl()}/api/v1/emails/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`Notifications service error (${response.status})`);
    return { to };
  }

  async rejectCertificateCorrectionRequest(
    id: string,
    description: string,
    files: any[],
    reviewer: CorrectionReviewer,
  ) {
    const reason = String(description || '').trim();
    if (reason.length < 20 || reason.length > 2000) {
      throw new BadRequestException('El motivo del rechazo debe tener entre 20 y 2.000 caracteres.');
    }
    if (files.length > 2) throw new BadRequestException('Puedes adjuntar máximo dos imágenes.');

    const request = await this.correctionRequestRepo.findOne({
      where: { id },
      relations: ['certificate'],
    });
    if (!request) throw new NotFoundException('Solicitud de corrección no encontrada.');
    if (!['PENDING', 'IN_REVIEW'].includes(request.status)) {
      throw new ConflictException('Esta solicitud ya fue resuelta.');
    }

    if (!request.review_started_at) {
      request.review_started_at = new Date();
      this.appendCorrectionTrace(
        request,
        this.correctionTraceEvent({
          type: 'REVIEW_STARTED',
          title: 'Revisión iniciada por el coordinador',
          description: 'El caso fue tomado para revisión antes de registrar la decisión.',
          status: 'IN_REVIEW',
          actor_name: reviewer.name || 'Coordinador Certificados Laborales',
          actor_email: reviewer.email || null,
          actor_role: 'COORDINADOR',
          metadata: {},
        }),
      );
    }
    request.status = 'REJECTED';
    request.reviewed_by_id = reviewer.id || null;
    request.reviewed_by_name = reviewer.name || 'Coordinador Certificados Laborales';
    request.reviewed_by_email = reviewer.email || null;
    request.resolution_description = reason;
    request.resolution_evidence = this.correctionEvidenceFromFiles(files);
    request.resolved_at = new Date();

    // Igual que en la aprobación, la decisión solo queda resuelta cuando el
    // servicio institucional acepta el correo y todos sus soportes.
    const notification = await this.sendCorrectionRejectionEmail(request, files);
    const notifiedRecipient = notification.to;

    this.appendCorrectionTrace(
      request,
      this.correctionTraceEvent({
        type: 'REQUEST_REJECTED',
        title: 'Solicitud rechazada',
        description: reason,
        status: 'REJECTED',
        occurred_at: request.resolved_at,
        actor_name: request.reviewed_by_name,
        actor_email: request.reviewed_by_email,
        actor_role: 'COORDINADOR',
        metadata: {
          requested_recipient: request.requester_email,
          recipient: notifiedRecipient,
          delivery_status: 'SENT',
          evidence_count: request.resolution_evidence.length,
        },
      }),
    );
    await this.correctionRequestRepo.save(request);

    return {
      ...this.correctionResponse(request),
      message: 'La solicitud fue rechazada y quedó registrada.',
      email_sent: true,
    };
  }

  async getCertificateCorrectionEvidence(
    id: string,
    kind: 'submitted' | 'resolution',
    index: number,
  ) {
    const request = await this.correctionRequestRepo.findOne({ where: { id } });
    if (!request) throw new NotFoundException('Solicitud de corrección no encontrada.');
    const evidence = kind === 'submitted' ? request.submitted_evidence : request.resolution_evidence;
    const file = evidence?.[index];
    if (!file) throw new NotFoundException('Evidencia no encontrada.');
    return file;
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
        const existingName = this.normalizeTemplateText(
          existing.full_name || '',
        );
        if (incomingName && existingName && incomingName !== existingName) {
          throw new BadRequestException(
            `El documento ${rawIdNumber} ya está registrado a nombre de ${existing.full_name}. Verifica el número de documento.`,
          );
        }
      }
    }

    const status = this.resolveStatusForPersistence(
      data.status,
      data.hiring_date,
      data.request_date,
    );
    const requestPayload: Partial<CertificateRequest> = {
      ...data,
      document_type:
        'document_type' in data
          ? this.normalizeLaborDocumentType(data.document_type, {
              strict: true,
            })
          : undefined,
      cod_cargo: this.normalizePersistedCodeValue(
        data.cod_cargo,
        data.cod_grade,
      ),
      cod_grade: this.normalizePersistedCodeValue(data.cod_grade),
      status,
    };
    const request = this.requestRepo.create(requestPayload);
    return await this.requestRepo.save(request);
  }

  async updateSolicitud(id: string, data: Partial<CertificateRequest>) {
    const patch: Partial<CertificateRequest> = { ...data };
    if ('document_type' in data) {
      patch.document_type = this.normalizeLaborDocumentType(data.document_type, {
        strict: true,
      });
    }
    if ('cod_cargo' in data) {
      patch.cod_cargo = this.normalizePersistedCodeValue(
        data.cod_cargo,
        data.cod_grade,
      );
    }
    if ('cod_grade' in data) {
      patch.cod_grade = this.normalizePersistedCodeValue(data.cod_grade);
    }
    if ('status' in data) {
      const existing = await this.requestRepo.findOne({ where: { id } });
      const hiringDate = data.hiring_date ?? existing?.hiring_date ?? null;
      const requestDate = data.request_date ?? existing?.request_date ?? null;
      patch.status = this.resolveStatusForPersistence(
        data.status,
        hiringDate,
        requestDate,
      );
    } else if ('hiring_date' in data || 'request_date' in data) {
      const existing = await this.requestRepo.findOne({ where: { id } });
      const currentStatus = String(existing?.status || '').trim();
      if (!currentStatus) {
        const hiringDate = data.hiring_date ?? existing?.hiring_date ?? null;
        const requestDate = data.request_date ?? existing?.request_date ?? null;
        patch.status = this.resolveStatusForPersistence(
          undefined,
          hiringDate,
          requestDate,
        );
      }
    }
    await this.requestRepo.update(id, patch);
    return await this.findSolicitudById(id);
  }

  // ============================================
  // TECHNICAL BONUS (PRIMA TECNICA)
  // ============================================

  async listTechnicalBonusCategories(options: { includeInactive?: boolean } = {}) {
    await this.ensureDefaultTechnicalBonusCategories();
    const records = await this.technicalBonusTemplateRepo.find({
      order: {
        display_order: 'ASC',
        label: 'ASC',
        category: 'ASC',
      },
    });

    return records
      .filter((item) => options.includeInactive || item.is_active !== false)
      .map((item) => this.mapTechnicalBonusCategory(item));
  }

  async createTechnicalBonusCategory(payload: TechnicalBonusCategoryPayload) {
    await this.ensureDefaultTechnicalBonusCategories();

    const label = String(payload.label || '').replace(/\s+/g, ' ').trim();
    if (!label || label.length < 3 || label.length > 120) {
      throw new BadRequestException(
        'El nombre de la prima debe tener entre 3 y 120 caracteres.',
      );
    }

    const category = this.normalizeTechnicalBonusCategoryCode(
      payload.code || payload.category || label,
    );

    const existing = await this.technicalBonusTemplateRepo.findOne({
      where: { category },
    });
    if (existing) {
      throw new BadRequestException('Ya existe una prima con ese nombre o codigo.');
    }

    const templateText = String(
      payload.templateText ||
        payload.template_text ||
        DEFAULT_DYNAMIC_TECHNICAL_BONUS_TEMPLATE,
    ).trim();
    if (!templateText) {
      throw new BadRequestException('El texto de la plantilla no puede estar vacio.');
    }

    const description =
      String(payload.description || '').replace(/\s+/g, ' ').trim() || null;
    const displayOrderRaw = Number(
      payload.displayOrder ?? payload.display_order ?? 100,
    );
    const displayOrder = Number.isFinite(displayOrderRaw)
      ? Math.trunc(displayOrderRaw)
      : 100;
    const updatedBy = String(payload.updatedBy || '').trim() || null;

    const saved = await this.technicalBonusTemplateRepo.save(
      this.technicalBonusTemplateRepo.create({
        category,
        label,
        description,
        template_text: templateText,
        display_order: displayOrder,
        is_system: false,
        is_active: true,
        updated_by: updatedBy,
      }),
    );

    return this.mapTechnicalBonusCategory(saved);
  }

  async updateTechnicalBonusCategory(
    categoryRaw: string,
    payload: TechnicalBonusCategoryPayload,
  ) {
    const record = await this.getTechnicalBonusCategoryRecord(categoryRaw, {
      activeOnly: false,
    });

    const label = String(payload.label ?? '').replace(/\s+/g, ' ').trim();
    if (Object.prototype.hasOwnProperty.call(payload, 'label')) {
      if (!label || label.length < 3 || label.length > 120) {
        throw new BadRequestException(
          'El nombre de la prima debe tener entre 3 y 120 caracteres.',
        );
      }
      record.label = label;
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'description')) {
      record.description =
        String(payload.description || '').replace(/\s+/g, ' ').trim() || null;
    }

    const templateText = String(
      payload.templateText ?? payload.template_text ?? '',
    ).trim();
    if (
      Object.prototype.hasOwnProperty.call(payload, 'templateText') ||
      Object.prototype.hasOwnProperty.call(payload, 'template_text')
    ) {
      if (!templateText) {
        throw new BadRequestException(
          'El texto de la plantilla no puede estar vacio.',
        );
      }
      record.template_text = templateText;
    }

    if (
      Object.prototype.hasOwnProperty.call(payload, 'displayOrder') ||
      Object.prototype.hasOwnProperty.call(payload, 'display_order')
    ) {
      const displayOrderRaw = Number(
        payload.displayOrder ?? payload.display_order,
      );
      if (!Number.isFinite(displayOrderRaw)) {
        throw new BadRequestException('El orden de visualizacion no es valido.');
      }
      record.display_order = Math.trunc(displayOrderRaw);
    }

    if (
      Object.prototype.hasOwnProperty.call(payload, 'isActive') ||
      Object.prototype.hasOwnProperty.call(payload, 'is_active')
    ) {
      const nextActive = this.normalizeBoolean(
        payload.isActive ?? payload.is_active,
        record.is_active !== false,
      );
      if (record.is_system && !nextActive) {
        throw new BadRequestException(
          'Las primas base no se pueden desactivar.',
        );
      }
      record.is_active = nextActive;
    }

    record.updated_by = String(payload.updatedBy || '').trim() || null;

    const saved = await this.technicalBonusTemplateRepo.save(record);
    return this.mapTechnicalBonusCategory(saved);
  }

  async deleteTechnicalBonusCategory(categoryRaw: string) {
    const record = await this.getTechnicalBonusCategoryRecord(categoryRaw, {
      activeOnly: false,
    });

    if (record.is_system) {
      throw new BadRequestException('Las primas base no se pueden eliminar.');
    }

    const assignments = await this.technicalBonusRepo.count({
      where: { category: record.category },
    });
    if (assignments > 0) {
      throw new BadRequestException(
        'No se puede eliminar una prima con usuarios asignados.',
      );
    }

    await this.technicalBonusTemplateRepo.remove(record);
    return {
      category: record.category,
      deleted: true as const,
    };
  }

  async searchTechnicalBonusCandidates(
    query: string,
    limit = 10,
  ): Promise<SearchTechnicalBonusCandidate[]> {
    const normalizedQuery = String(query || '').trim();
    if (!normalizedQuery || normalizedQuery.length < 2) {
      return [];
    }

    const safeLimit = Math.min(Math.max(limit || 10, 1), 200);
    const searchTerm = `%${normalizedQuery.toLowerCase()}%`;
    const idNeedle = normalizedQuery.replace(/\D+/g, '');

    // Cuando el operador busca por numero de documento, primero sincroniza esa
    // persona desde la vista Oracle FNC (fuente dinamica) para que aparezca en
    // los resultados aunque todavia no exista en la base local de solicitudes.
    // La coincidencia en Oracle es por documento completo, por eso se exige un
    // minimo de digitos y asi se evitan consultas innecesarias con fragmentos.
    if (idNeedle.length >= 5) {
      await this.syncTechnicalBonusPersonFromOracle(idNeedle);
    }

    const qb = this.requestRepo.createQueryBuilder('request');
    qb.orderBy(
      'COALESCE(request.request_date, request.updated_at, request.created_at)',
      'DESC',
    )
      .addOrderBy('request.updated_at', 'DESC')
      .addOrderBy('request.created_at', 'DESC')
      .take(safeLimit * 4);

    if (idNeedle) {
      qb.where('LOWER(request.full_name) LIKE :searchTerm', {
        searchTerm,
      }).orWhere(
        `REPLACE(REPLACE(REPLACE(request.id_number, '.', ''), '-', ''), ' ', '') LIKE :idNeedle`,
        {
          idNeedle: `%${idNeedle}%`,
        },
      );
    } else {
      qb.where('LOWER(request.full_name) LIKE :searchTerm', { searchTerm });
    }

    const matches = await qb.getMany();

    const uniqueByDoc = new Map<string, CertificateRequest>();
    for (const request of matches) {
      const normalizedId = this.sanitizeIdNumber(request.id_number);
      const key = normalizedId || String(request.id_number || '').trim();
      if (!key || uniqueByDoc.has(key)) {
        continue;
      }
      uniqueByDoc.set(key, request);
    }

    return Array.from(uniqueByDoc.values())
      .slice(0, safeLimit)
      .map((request) => ({
        requestId: request.id,
        fullName: request.full_name,
        idNumber: this.sanitizeIdNumber(request.id_number) || request.id_number,
        status: String(request.status || '').trim(),
      }));
  }

  async listTechnicalBonusAssignments(categoryRaw: string) {
    const categoryRecord = await this.getTechnicalBonusCategoryRecord(
      categoryRaw,
    );
    const category = categoryRecord.category;
    const assignments = await this.technicalBonusRepo.find({
      where: { category },
      order: {
        updated_at: 'DESC',
        full_name: 'ASC',
      },
    });

    return assignments.map((item) => this.mapTechnicalBonusAssignment(item));
  }

  async upsertTechnicalBonusAssignment(payload: UpsertTechnicalBonusPayload) {
    const categoryRecord = await this.getTechnicalBonusCategoryRecord(
      payload.category,
    );
    const category = categoryRecord.category;
    const idNumber = this.sanitizeIdNumber(payload.idNumber);
    const percentageRaw = Number(payload.percentage);

    if (!idNumber) {
      throw new BadRequestException(
        'El numero de identificacion es obligatorio.',
      );
    }

    if (
      !Number.isFinite(percentageRaw) ||
      percentageRaw <= 0 ||
      percentageRaw > 100
    ) {
      throw new BadRequestException(
        'El porcentaje debe ser mayor a 0 y menor o igual a 100.',
      );
    }

    const percentage = Number(percentageRaw.toFixed(2));

    // Consulta la fuente dinamica (Oracle FNC) igual que la solicitud de
    // certificado laboral: si la persona solo existe en la vista en linea, la
    // trae a la base local antes de resolver la asignacion de prima tecnica.
    await this.syncTechnicalBonusPersonFromOracle(idNumber);

    let request: CertificateRequest | null = null;
    if (payload.requestId) {
      request = await this.requestRepo.findOne({
        where: { id: payload.requestId },
      });
    }

    if (!request) {
      request = await this.requestRepo.findOne({
        where: {
          id_number: Raw(
            (alias) =>
              `REPLACE(REPLACE(REPLACE(${alias}, '.', ''), '-', ''), ' ', '') = :idNumber`,
            { idNumber },
          ),
        },
        order: {
          request_date: 'DESC',
          updated_at: 'DESC',
          created_at: 'DESC',
        },
      });
    }

    if (!request) {
      throw new NotFoundException(
        'No se encontro la persona en la base de datos de solicitudes laborales (usuarios con contrato laboral).',
      );
    }

    if (String(request.status || '').trim() !== 'A') {
      throw new BadRequestException(
        'Este usuario no cuenta con contratos activos. No es posible asignarle prima técnica y/o coordinación.',
      );
    }

    const fullName = String(payload.fullName || request.full_name || '').trim();
    if (!fullName) {
      throw new BadRequestException('El nombre completo es obligatorio.');
    }

    const updatedBy = String(payload.updatedBy || '').trim() || null;
    let assignment = await this.technicalBonusRepo.findOne({
      where: { category, id_number: idNumber },
    });
    const isUpdate = Boolean(assignment);

    if (!assignment) {
      assignment = this.technicalBonusRepo.create({
        category,
        request_id: request.id,
        full_name: fullName,
        id_number: idNumber,
        percentage,
        created_by: updatedBy,
        updated_by: updatedBy,
      });
    } else {
      assignment.request_id = request.id;
      assignment.full_name = fullName;
      assignment.percentage = percentage;
      assignment.updated_by = updatedBy;
      if (!assignment.created_by && updatedBy) {
        assignment.created_by = updatedBy;
      }
    }

    const saved = await this.technicalBonusRepo.save(assignment);

    return {
      ...this.mapTechnicalBonusAssignment(saved),
      action: isUpdate ? 'updated' : 'created',
    };
  }

  async bulkUpsertTechnicalBonusAssignments(
    payload: BulkTechnicalBonusPayload,
  ) {
    const categoryRecord = await this.getTechnicalBonusCategoryRecord(
      payload.category,
    );
    const category = categoryRecord.category;
    const rows = Array.isArray(payload.rows) ? payload.rows : [];
    const updatedBy = String(payload.updatedBy || '').trim() || undefined;

    if (!rows.length) {
      throw new BadRequestException(
        'Debes enviar al menos una fila para la carga masiva.',
      );
    }

    if (rows.length > 1000) {
      throw new BadRequestException(
        'La carga masiva permite maximo 1000 filas por archivo.',
      );
    }

    const seenDocumentRows = new Map<string, number>();
    const results: Array<{
      rowNumber: number;
      status: 'success' | 'error';
      id_number?: string;
      full_name?: string;
      percentage?: number;
      action?: 'created' | 'updated';
      message: string;
      record?: any;
    }> = [];

    let created = 0;
    let updated = 0;
    let failed = 0;

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index] || {};
      const parsedRowNumber = Number(row.rowNumber);
      const rowNumber =
        Number.isFinite(parsedRowNumber) && parsedRowNumber > 0
          ? Math.trunc(parsedRowNumber)
          : index + 2;

      const idNumber = this.sanitizeIdNumber(row.idNumber);
      const fullName = String(row.fullName || '').trim() || undefined;
      const percentageValue = String(row.percentage ?? '')
        .replace(',', '.')
        .trim();
      const percentage = Number(percentageValue);

      try {
        if (!idNumber) {
          throw new BadRequestException(
            'Numero de documento vacio o invalido.',
          );
        }

        const duplicateRowNumber = seenDocumentRows.get(idNumber);
        if (duplicateRowNumber) {
          throw new BadRequestException(
            `Documento repetido en el archivo. Ya fue incluido en la fila ${duplicateRowNumber}.`,
          );
        }
        seenDocumentRows.set(idNumber, rowNumber);

        if (
          !Number.isFinite(percentage) ||
          percentage <= 0 ||
          percentage > 100
        ) {
          throw new BadRequestException(
            'El porcentaje debe ser mayor a 0 y menor o igual a 100.',
          );
        }

        const record = await this.upsertTechnicalBonusAssignment({
          category,
          idNumber,
          percentage,
          updatedBy,
        });

        if (record.action === 'created') {
          created += 1;
        } else {
          updated += 1;
        }

        results.push({
          rowNumber,
          status: 'success',
          id_number: record.id_number,
          full_name: record.full_name,
          percentage: record.percentage,
          action: record.action === 'created' ? 'created' : 'updated',
          message:
            record.action === 'created'
              ? 'Registro creado correctamente.'
              : 'Registro actualizado correctamente.',
          record,
        });
      } catch (error: any) {
        failed += 1;
        results.push({
          rowNumber,
          status: 'error',
          id_number: idNumber || undefined,
          full_name: fullName,
          message: this.extractExceptionMessage(
            error,
            'Error inesperado al procesar la fila.',
          ),
        });
      }
    }

    const success = rows.length - failed;
    return {
      category,
      summary: {
        total: rows.length,
        success,
        failed,
        created,
        updated,
      },
      results,
    };
  }

  async updateTechnicalBonusAssignment(
    id: string,
    payload: UpdateTechnicalBonusPayload,
  ) {
    const recordId = String(id || '').trim();
    if (!recordId) {
      throw new BadRequestException('El id del registro es obligatorio.');
    }

    const percentageRaw = Number(payload.percentage);
    if (
      !Number.isFinite(percentageRaw) ||
      percentageRaw <= 0 ||
      percentageRaw > 100
    ) {
      throw new BadRequestException(
        'El porcentaje debe ser mayor a 0 y menor o igual a 100.',
      );
    }
    const percentage = Number(percentageRaw.toFixed(2));

    const assignment = await this.technicalBonusRepo.findOne({
      where: { id: recordId },
    });

    if (!assignment) {
      throw new NotFoundException(
        'No se encontro el registro de Prima Tecnica.',
      );
    }

    const updatedBy = String(payload.updatedBy || '').trim() || null;
    assignment.percentage = percentage;
    assignment.updated_by = updatedBy;
    if (!assignment.created_by && updatedBy) {
      assignment.created_by = updatedBy;
    }

    const saved = await this.technicalBonusRepo.save(assignment);
    return {
      ...this.mapTechnicalBonusAssignment(saved),
      action: 'updated' as const,
    };
  }

  async deleteTechnicalBonusAssignment(id: string) {
    const recordId = String(id || '').trim();
    if (!recordId) {
      throw new BadRequestException('El id del registro es obligatorio.');
    }

    const assignment = await this.technicalBonusRepo.findOne({
      where: { id: recordId },
    });

    if (!assignment) {
      throw new NotFoundException(
        'No se encontro el registro de Prima Tecnica.',
      );
    }

    await this.technicalBonusRepo.remove(assignment);

    return {
      id: assignment.id,
      category: assignment.category,
      full_name: assignment.full_name,
      id_number: assignment.id_number,
      deleted: true as const,
    };
  }

  async deleteTechnicalBonusAssignmentsByCategory(categoryRaw: string) {
    const category = await this.getTechnicalBonusCategoryRecord(categoryRaw, {
      activeOnly: false,
    });

    const result = await this.technicalBonusRepo.delete({
      category: category.category,
    });

    return {
      category: category.category,
      deleted_count: result.affected || 0,
    };
  }

  // ============================================
  // TECHNICAL BONUS TEMPLATES
  // ============================================

  async getTechnicalBonusTemplate(categoryRaw: string) {
    const record = await this.getTechnicalBonusCategoryRecord(categoryRaw, {
      activeOnly: false,
    });
    const category = record.category as TechnicalBonusTemplateCategory;
    const templateText =
      record.template_text || this.getTechnicalBonusDefaultTemplate(category);
    return {
      category,
      label: record.label || this.getTechnicalBonusDefaultLabel(category),
      description:
        record.description || this.getTechnicalBonusDefaultDescription(category),
      template_text: templateText,
      default_template_text: this.getTechnicalBonusDefaultTemplate(category),
      is_system: Boolean(record.is_system),
      is_active: record.is_active !== false,
      updated_at: record.updated_at ?? null,
      updated_by: record.updated_by ?? null,
    };
  }

  async updateTechnicalBonusTemplate(
    categoryRaw: string,
    templateText: string,
    updatedBy?: string,
  ) {
    const record = await this.getTechnicalBonusCategoryRecord(categoryRaw, {
      activeOnly: false,
    });
    const category = record.category as TechnicalBonusTemplateCategory;
    const raw = String(templateText || '').trim();
    if (!raw) {
      throw new BadRequestException('El texto de la plantilla no puede estar vacío.');
    }

    record.template_text = raw;
    record.updated_by = updatedBy || null;

    const saved = await this.technicalBonusTemplateRepo.save(record);
    return {
      category: saved.category,
      label: saved.label || this.getTechnicalBonusDefaultLabel(saved.category),
      description:
        saved.description ||
        this.getTechnicalBonusDefaultDescription(saved.category),
      template_text: saved.template_text,
      default_template_text: this.getTechnicalBonusDefaultTemplate(saved.category),
      is_system: Boolean(saved.is_system),
      is_active: saved.is_active !== false,
      updated_at: saved.updated_at,
      updated_by: saved.updated_by,
    };
  }

  // ============================================
  // CERTIFICATES
  // ============================================

  async findAllCertificados() {
    const certificates = await this.certificateRepo.find({
      relations: ['request'],
      order: { issue_date: 'DESC' },
    });

    await this.hydrateCertificatesRequestContext(certificates);
    await this.ensureTemplateSnapshots(certificates);

    // Agregar el conteo de validaciones para cada certificado
    const validationCounts = await this.getValidationCountsByCertificateIds(
      certificates.map((cert) => cert.id),
    );

    const certificatesWithCount = certificates.map((cert) => {
      const employmentStatus = this.resolveEmploymentStatus(
        cert.request?.hiring_date || cert.hiring_date,
        cert.request?.request_date,
        cert.request?.status,
      );
      return {
        ...cert,
        email: cert.request?.email,
        validation_count: validationCounts.get(cert.id) || 0,
        employment_status: employmentStatus,
      };
    });

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
    forExport?: boolean;
  }) {
    const safePage = Math.max(params.page || 1, 1);
    const maxLimit = params.forExport ? 1000 : 10;
    const defaultLimit = params.forExport ? maxLimit : 10;
    const safeLimit = Math.min(Math.max(params.limit || defaultLimit, 1), maxLimit);
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
      qb.andWhere('cert.career_category = :tipo', {
        tipo: params.tipoVinculacion,
      });
    }

    if (params.fechaDesde) {
      const desde = new Date(params.fechaDesde);
      if (!isNaN(desde.getTime())) {
        desde.setHours(0, 0, 0, 0);
        qb.andWhere(
          'COALESCE(cert.issue_date, cert.created_at) >= :fechaDesde',
          {
            fechaDesde: desde,
          },
        );
      }
    }

    if (params.fechaHasta) {
      const hasta = new Date(params.fechaHasta);
      if (!isNaN(hasta.getTime())) {
        hasta.setHours(23, 59, 59, 999);
        qb.andWhere(
          'COALESCE(cert.issue_date, cert.created_at) <= :fechaHasta',
          {
            fechaHasta: hasta,
          },
        );
      }
    }

    qb.addSelect(
      'COALESCE(cert.issuance_timestamp, cert.created_at)',
      'sort_issuance_date',
    )
      .addSelect(
        'COALESCE(cert.issue_date, cert.created_at)',
        'sort_issue_date',
      )
      .orderBy('sort_issuance_date', 'DESC')
      .addOrderBy('sort_issue_date', 'DESC')
      .addOrderBy('cert.created_at', 'DESC');

    const [certificates, total] = await qb
      .skip(skip)
      .take(safeLimit)
      .getManyAndCount();

    await this.hydrateCertificatesRequestContext(certificates);
    await this.ensureTemplateSnapshots(certificates);

    const validationCounts = await this.getValidationCountsByCertificateIds(
      certificates.map((cert) => cert.id),
    );

    const certificatesWithCount = certificates.map((cert) => {
      const employmentStatus = this.resolveEmploymentStatus(
        cert.request?.hiring_date || cert.hiring_date,
        cert.request?.request_date,
        cert.request?.status,
      );
      return {
        ...cert,
        email: cert.request?.email,
        validation_count: validationCounts.get(cert.id) || 0,
        employment_status: employmentStatus,
      };
    });

    const [totalEmitidos, activos, revocados, expirados, escaneosQR] =
      await Promise.all([
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
      relations: ['request'],
    });
    if (!certificate) {
      throw new NotFoundException(`Certificado con ID ${id} no encontrado`);
    }
    await this.hydrateCertificatesRequestContext([certificate]);
    await this.ensureTemplateSnapshotForCertificate(certificate);
    return certificate;
  }

  async findCertificadoByCodigoVerificacion(codigo: string) {
    const codigoTrim = (codigo || '').trim();
    const codigoSinEspacios = codigoTrim.replace(/\s+/g, '');
    // Buscar sin importar mayusculas/minusculas
    const certificate = await this.certificateRepo
      .createQueryBuilder('certificate')
      .where('UPPER(certificate.verification_code) = UPPER(:codigo)', {
        codigo: codigoTrim,
      })
      .orWhere('UPPER(certificate.certificate_number) = UPPER(:codigo)', {
        codigo: codigoTrim,
      })
      .orWhere(
        "UPPER(REPLACE(certificate.certificate_number, ' ', '')) = UPPER(:codigoSinEspacios)",
        { codigoSinEspacios },
      )
      .getOne();

    if (!certificate) {
      throw new NotFoundException(
        `Certificado con codigo ${codigoTrim} no encontrado`,
      );
    }
    await this.hydrateCertificatesRequestContext([certificate]);
    return certificate;
  }

  async createCertificado(
    solicitudId: string,
    options: {
      includeSalary?: boolean;
      includeTechnicalBonus?: boolean;
      includeFunctions?: boolean;
    } = {},
  ) {
    const requestById = await this.findSolicitudById(solicitudId);
    const relatedRequests = await this.requestRepo
      .createQueryBuilder('request')
      .where('request.id_number = :documento', {
        documento: requestById.id_number,
      })
      .orderBy(
        'COALESCE(request.request_date, request.hiring_date, request.created_at)',
        'DESC',
      )
      .addOrderBy('request.hiring_date', 'DESC')
      .addOrderBy('request.created_at', 'DESC')
      .getMany();

    const preferredRequest =
      this.selectPreferredRequestForCertificate(relatedRequests) || requestById;
    const salarySource = this.selectSalarySourceForCertificate(
      preferredRequest,
      relatedRequests,
    );
    const request = this.mergeRequestWithSalarySource(
      preferredRequest,
      salarySource,
      relatedRequests,
    );
    const signer = await this.signerRepo.findOne({
      where: { is_primary: true, is_active: true },
    });

    if (!signer) {
      throw new NotFoundException(
        'No se encontra un firmante principal activo',
      );
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
      const config =
        await this.templateConfigService.getActiveConfig(templateType);
      if (config) {
        templateSnapshot = config;
        templateVersion = config.version || null;
      }
    } catch (error) {
      this.logger.warn(
        `No se pudo cargar la plantilla activa (${templateType}): ${error?.message || error}`,
      );
    }

    const includeSalary = this.normalizeBoolean(options.includeSalary, true);
    const includeTechnicalBonus = includeSalary
      ? this.normalizeBoolean(options.includeTechnicalBonus, false)
      : false;
    const includeFunctions = this.normalizeBoolean(
      options.includeFunctions,
      false,
    );
    const requestDocumentType =
      this.normalizeLaborDocumentType(
        requestById.document_type || request.document_type,
      ) || undefined;
    const technicalBonus = await this.resolveTechnicalBonusForRequest(request);

    if (includeTechnicalBonus && !technicalBonus.available) {
      throw new BadRequestException(
        'No tienes Prima Tecnica registrada en este momento. No es posible incluirla en el certificado.',
      );
    }

    const laborFunctions = includeFunctions
      ? await this.laborFunctionsService.resolveForRequest(request)
      : null;
    if (includeFunctions && !laborFunctions?.available) {
      const detail =
        laborFunctions?.reason === 'AMBIGUOUS'
          ? 'Hay más de una matriz posible para el código del cargo. Talento Humano debe completar la dependencia o el grupo interno antes de emitirlo.'
          : 'No hay una matriz de funciones asociada al código y grado de tu cargo.';
      throw new BadRequestException(
        `${detail} No es posible incluir funciones en este certificado.`,
      );
    }

    const functionsSnapshot = laborFunctions?.available
      ? {
          profile_id: laborFunctions.profile?.id,
          matched_at: new Date().toISOString(),
          position_code: laborFunctions.profile?.position_code,
          grade_code: laborFunctions.profile?.grade_code,
          combined_code: laborFunctions.profile?.combined_code,
          hierarchical_level: laborFunctions.profile?.hierarchical_level,
          position_name: laborFunctions.profile?.position_name,
          department_name: laborFunctions.profile?.department_name,
          internal_group: laborFunctions.profile?.internal_group,
          cost_center: laborFunctions.profile?.cost_center,
          functions: laborFunctions.functions,
        }
      : null;

    const technicalBonusesSnapshot = includeTechnicalBonus
      ? this.serializeTechnicalBonusItems(technicalBonus.items)
      : [];

    if (includeTechnicalBonus && technicalBonusesSnapshot.length) {
      const primaryBonus = technicalBonusesSnapshot[0];
      templateSnapshot = {
        ...(templateSnapshot || {}),
        technicalBonuses: technicalBonusesSnapshot,
        technicalBonusTemplate: primaryBonus.template_text,
        technicalBonusCategory: primaryBonus.category,
        technicalBonusCategoryLabel: primaryBonus.label,
      };
    }

    const certificate = this.certificateRepo.create({
      verification_code,
      certificate_number,
      request_id: request.id,
      full_name: request.full_name,
      id_number: request.id_number,
      document_type: requestDocumentType,
      career_category: request.career_category,
      hiring_date: request.hiring_date,
      position_category: request.position_category,
      position_location: request.position_location,
      monthly_salary: request.monthly_salary,
      technical_bonus: technicalBonus.value,
      technical_bonus_category: technicalBonus.category,
      technical_bonuses: technicalBonusesSnapshot,
      include_salary: includeSalary,
      include_technical_bonus: includeTechnicalBonus,
      include_functions: includeFunctions,
      functions_snapshot: functionsSnapshot,
      salary_text: request.salary_text,
      department: request.department,
      cod_cargo: request.cod_cargo,
      cod_grade: request.cod_grade || undefined,
      encargo_type: this.normalizeEncargoType(request.observations),
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
    const savedWithRequest = await this.certificateRepo.findOne({
      where: { id: saved.id },
      relations: ['request'],
    });
    return savedWithRequest || saved;
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

  private normalizeGeoText(value?: string | null): string | undefined {
    const raw = String(value || '').trim();
    if (!raw) return undefined;

    let normalized = raw;
    try {
      normalized = decodeURIComponent(raw.replace(/\+/g, ' ')).trim();
    } catch {
      normalized = raw;
    }

    if (!normalized) return undefined;
    if (
      /^(unknown|desconocido|n\/a|na|null|undefined|localhost|local)$/i.test(
        normalized,
      )
    ) {
      return undefined;
    }
    if (/^(xx|t1)$/i.test(normalized)) {
      return undefined;
    }
    return normalized;
  }

  private normalizeGeoNumber(value?: string | number | null): number | undefined {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : undefined;
    }

    const normalized = String(value || '').trim().replace(',', '.');
    if (!normalized) return undefined;

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private normalizeGeoPayload(
    geo?: GeoLookupResult | null,
  ): GeoLookupResult | null {
    if (!geo) return null;

    const city = this.normalizeGeoText(geo.city);
    const region = this.normalizeGeoText(geo.region);
    const country = this.normalizeGeoText(geo.country);
    const isp = this.normalizeGeoText(geo.isp);
    const latitude =
      typeof geo.latitude === 'number' && Number.isFinite(geo.latitude)
        ? geo.latitude
        : undefined;
    const longitude =
      typeof geo.longitude === 'number' && Number.isFinite(geo.longitude)
        ? geo.longitude
        : undefined;

    if (
      !city &&
      !region &&
      !country &&
      latitude === undefined &&
      longitude === undefined
    ) {
      return null;
    }

    return {
      city,
      region,
      country,
      latitude,
      longitude,
      isp,
    };
  }

  private resolveGeoFromContext(
    context?: ValidationGeoContext,
  ): GeoLookupResult | null {
    if (!context) return null;
    return this.normalizeGeoPayload({
      city: context.geoCity,
      region: context.geoRegion,
      country: context.geoCountry,
      latitude: this.normalizeGeoNumber(context.geoLatitude),
      longitude: this.normalizeGeoNumber(context.geoLongitude),
    });
  }

  private mergeGeoSources(
    primary?: GeoLookupResult | null,
    fallback?: GeoLookupResult | null,
  ): GeoLookupResult | null {
    return this.normalizeGeoPayload({
      city: primary?.city || fallback?.city,
      region: primary?.region || fallback?.region,
      country: primary?.country || fallback?.country,
      latitude: primary?.latitude ?? fallback?.latitude,
      longitude: primary?.longitude ?? fallback?.longitude,
      isp: primary?.isp || fallback?.isp,
    });
  }

  private getGeoLookupTimeoutMs(): number {
    const raw = Number(
      process.env.GEOLOOKUP_TIMEOUT_MS ||
        process.env.GEO_LOOKUP_TIMEOUT_MS ||
        3500,
    );
    if (!Number.isFinite(raw)) return 3500;
    return Math.min(10000, Math.max(1200, Math.round(raw)));
  }

  private mapValidationToDTO(validation: CertificateValidation) {
    const uaInfo = this.parseUserAgentInfo(validation.user_agent);

    const resultado = (validation.result || 'VALID').toUpperCase();
    const resultadoNormalizado =
      resultado === 'REVOKED' ||
      resultado === 'EXPIRED' ||
      resultado === 'INVALID'
        ? 'fallida'
        : resultado === 'SUSPICIOUS' || resultado === 'WARNING'
          ? 'sospechosa'
          : 'exitosa';

    const locationRaw = String(validation.location || '').trim();
    const locationParts = locationRaw
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
    const locationSingle =
      locationParts.length === 1 ? locationParts[0] : undefined;
    const cityFromLocation =
      locationParts.length > 1 ? locationParts[0] : undefined;
    const countryFromLocation =
      locationParts.length > 1 ? locationParts.slice(1).join(', ') : undefined;
    const locationLooksLikeCountryCode =
      Boolean(locationSingle) && /^[A-Za-z]{2,3}$/.test(String(locationSingle));
    const ciudad =
      validation.city ||
      validation.region ||
      cityFromLocation ||
      (!locationLooksLikeCountryCode ? locationSingle : undefined) ||
      'Desconocido';
    const pais =
      validation.country ||
      countryFromLocation ||
      (locationLooksLikeCountryCode
        ? String(locationSingle).toUpperCase()
        : '') ||
      'Desconocido';

    const normalizedIp =
      this.normalizeIp(validation.ip_address || '') ||
      validation.ip_address ||
      '0.0.0.0';

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

  private async fetchJsonWithTimeout(
    url: string,
    timeoutMs = 3500,
  ): Promise<any | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'esap-certification-service/1.0',
        },
      });
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

    const now = Date.now();
    const cached = this.geoCache.get(normalizedIp);
    if (cached && cached.expiresAt > now) {
      return cached.value;
    }
    if (cached) {
      this.geoCache.delete(normalizedIp);
    }

    const timeoutMs = this.getGeoLookupTimeoutMs();

    try {
      const ipWho = await this.fetchJsonWithTimeout(
        `https://ipwho.is/${encodeURIComponent(normalizedIp)}`,
        timeoutMs,
      );
      const fromIpWho = this.normalizeGeoPayload(
        ipWho && ipWho.success !== false
          ? {
              city: ipWho.city || undefined,
              region: ipWho.region || undefined,
              country: ipWho.country || undefined,
              latitude:
                typeof ipWho.latitude === 'number' ? ipWho.latitude : undefined,
              longitude:
                typeof ipWho.longitude === 'number'
                  ? ipWho.longitude
                  : undefined,
              isp: ipWho.connection?.isp || undefined,
            }
          : null,
      );
      if (fromIpWho) {
        this.geoCache.set(normalizedIp, {
          expiresAt: now + this.geoCacheTtlMs,
          value: fromIpWho,
        });
        return fromIpWho;
      }

      const ipApiCo = await this.fetchJsonWithTimeout(
        `https://ipapi.co/${encodeURIComponent(normalizedIp)}/json/`,
        timeoutMs,
      );
      const fromIpApiCo = this.normalizeGeoPayload(
        ipApiCo && !ipApiCo.error
          ? {
              city: ipApiCo.city || undefined,
              region: ipApiCo.region || undefined,
              country: ipApiCo.country_name || ipApiCo.country || undefined,
              latitude:
                typeof ipApiCo.latitude === 'number'
                  ? ipApiCo.latitude
                  : Number(ipApiCo.latitude) || undefined,
              longitude:
                typeof ipApiCo.longitude === 'number'
                  ? ipApiCo.longitude
                  : Number(ipApiCo.longitude) || undefined,
              isp: ipApiCo.org || undefined,
            }
          : null,
      );
      if (fromIpApiCo) {
        this.geoCache.set(normalizedIp, {
          expiresAt: now + this.geoCacheTtlMs,
          value: fromIpApiCo,
        });
        return fromIpApiCo;
      }

      const ipInfo = await this.fetchJsonWithTimeout(
        `https://ipinfo.io/${encodeURIComponent(normalizedIp)}/json`,
        timeoutMs,
      );
      const [rawLat, rawLng] = String(ipInfo?.loc || '')
        .split(',')
        .map((part) => part.trim());
      const fromIpInfo = this.normalizeGeoPayload(
        ipInfo
          ? {
              city: ipInfo.city || undefined,
              region: ipInfo.region || undefined,
              country: ipInfo.country || undefined,
              latitude: rawLat ? Number(rawLat) : undefined,
              longitude: rawLng ? Number(rawLng) : undefined,
              isp: ipInfo.org || undefined,
            }
          : null,
      );
      if (fromIpInfo) {
        this.geoCache.set(normalizedIp, {
          expiresAt: now + this.geoCacheTtlMs,
          value: fromIpInfo,
        });
        return fromIpInfo;
      }

      const geoFallback = this.normalizeGeoPayload(null);
      this.geoCache.set(normalizedIp, {
        expiresAt: now + this.geoCacheMissTtlMs,
        value: geoFallback,
      });
      return geoFallback;
    } catch (error) {
      this.logger.warn(
        `No se pudo resolver geolocalizacion para IP ${ip}: ${error?.message || error}`,
      );
      this.geoCache.set(normalizedIp, {
        expiresAt: now + this.geoCacheMissTtlMs,
        value: null,
      });
      return null;
    }
  }

  private async obtenerHistorialValidacionesPorCertificado(
    certificateId: string,
  ) {
    const validaciones = await this.validationRepo.find({
      where: { certificate_id: certificateId },
      order: { validation_date: 'DESC' },
    });

    const mapped = await Promise.all(
      validaciones.map(async (validation) => {
        if (
          (!validation.city || !validation.country) &&
          validation.ip_address
        ) {
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

  async registrarValidacion(
    codigoVerificacion: string,
    ip?: string,
    userAgent?: string,
    geoContext?: ValidationGeoContext,
  ) {
    const certificate =
      await this.findCertificadoByCodigoVerificacion(codigoVerificacion);

    // Determine validation result based on certificate status
    let result = 'VALID';
    if (certificate.status === 'REVOKED') {
      result = 'REVOKED';
    } else if (certificate.status === 'EXPIRED') {
      result = 'EXPIRED';
    }

    const normalizedIp =
      this.normalizeIp(ip || '') ||
      this.normalizeSingleIp(ip || '') ||
      String(ip || '').trim() ||
      undefined;
    const geoFromHeader = this.resolveGeoFromContext(geoContext);
    const geoFromIp = await this.resolveGeoFromIp(normalizedIp);
    const geo = this.mergeGeoSources(geoFromHeader, geoFromIp);
    if (!geo && normalizedIp && !this.isPrivateIp(normalizedIp)) {
      this.logger.warn(
        `Validacion sin geolocalizacion para IP publica ${normalizedIp}`,
      );
    }
    const location =
      geo?.city && geo?.country
        ? `${geo.city}, ${geo.country}`
        : geo?.region && geo?.country
          ? `${geo.region}, ${geo.country}`
          : geo?.city || geo?.region || geo?.country || undefined;

    const validation = this.validationRepo.create({
      certificate_id: certificate.id,
      validation_date: new Date(),
      ip_address: normalizedIp,
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

    const historial = await this.obtenerHistorialValidacionesPorCertificado(
      certificate.id,
    );
    const requestContext = certificate.request_id
      ? await this.requestRepo.findOne({
          where: { id: certificate.request_id },
        })
      : null;
    const requestPayload = requestContext
      ? {
          observations: requestContext.observations,
          cod_cargo: requestContext.cod_cargo,
          cod_grade: requestContext.cod_grade,
          department: requestContext.department,
          position_location: requestContext.position_location,
        }
      : undefined;

    return {
      ...certificate,
      observations: requestContext?.observations || undefined,
      request: requestPayload,
      validation_history: historial,
      validation_count: historial.length,
    };
  }

  async obtenerHistorialValidaciones(codigoVerificacion: string) {
    const certificate =
      await this.findCertificadoByCodigoVerificacion(codigoVerificacion);
    const historial = await this.obtenerHistorialValidacionesPorCertificado(
      certificate.id,
    );

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
      throw new NotFoundException(
        `Certificado con ID ${certificadoId} no encontrado`,
      );
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
      const raw =
        typeof value === 'string'
          ? value.replace(/[^\d.-]/g, '')
          : String(value);
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
    const documentoTrim = (documento || '').trim();
    const oracleSync = await this.syncRequestsFromOracle(documentoTrim);

    if (oracleSync.enabled && !oracleSync.found) {
      return {
        existe: false,
        mensaje:
          'No se encontro ningun registro con este documento en Oracle FNC',
        fuente: 'oracle',
        oracleSync,
      };
    }

    const solicitudes = await this.findLocalRequestsByDocument(documentoTrim);

    const solicitudBase =
      this.selectPreferredRequestForCertificate(solicitudes);

    if (!solicitudBase) {
      return {
        existe: false,
        mensaje: 'No se encontro ningun registro con este documento',
        fuente: oracleSync.enabled ? 'oracle' : 'postgres',
        oracleSync,
      };
    }

    const salarySource = this.selectSalarySourceForCertificate(
      solicitudBase,
      solicitudes,
    );
    const solicitud = this.mergeRequestWithSalarySource(
      solicitudBase,
      salarySource,
      solicitudes,
    );

    const technicalBonus =
      await this.resolveTechnicalBonusForRequest(solicitud);
    const laborFunctions =
      await this.laborFunctionsService.resolveForRequest(solicitud);
    const solicitudResponse = {
      ...solicitud,
      technical_bonus_available: technicalBonus.available,
      technical_bonus_percentage: technicalBonus.percentage,
      technical_bonus_value: technicalBonus.value,
      technical_bonus_category: technicalBonus.category,
      technical_bonus_assignment_id: technicalBonus.assignmentId,
      technical_bonuses: this.serializeTechnicalBonusItems(technicalBonus.items),
      functions_available: laborFunctions.available,
      functions_count: laborFunctions.count,
      functions_match_status: laborFunctions.reason,
    };

    // Verificar si ya tiene un certificado generado
    const certificadoExistente = await this.certificateRepo.findOne({
      where: { request_id: solicitud.id },
      relations: ['request'],
    });

    if (certificadoExistente) {
      await this.ensureTemplateSnapshotForCertificate(certificadoExistente);
      return {
        existe: true,
        tieneCertificado: true,
        mensaje: 'Ya tienes un certificado generado',
        solicitud: solicitudResponse,
        certificado: certificadoExistente,
        fuente: oracleSync.enabled ? 'oracle' : 'postgres',
        oracleSync,
        technical_bonus_available: technicalBonus.available,
        technical_bonus_percentage: technicalBonus.percentage,
        technical_bonus_value: technicalBonus.value,
        technical_bonus_category: technicalBonus.category,
        technical_bonuses: this.serializeTechnicalBonusItems(technicalBonus.items),
        functions_available: laborFunctions.available,
        functions_count: laborFunctions.count,
        functions_match_status: laborFunctions.reason,
      };
    }

    return {
      existe: true,
      tieneCertificado: false,
      mensaje: 'Documento encontrado, puedes solicitar tu certificado',
      solicitud: solicitudResponse,
      fuente: oracleSync.enabled ? 'oracle' : 'postgres',
      oracleSync,
      technical_bonus_available: technicalBonus.available,
      technical_bonus_percentage: technicalBonus.percentage,
      technical_bonus_value: technicalBonus.value,
      technical_bonus_category: technicalBonus.category,
      technical_bonuses: this.serializeTechnicalBonusItems(technicalBonus.items),
      functions_available: laborFunctions.available,
      functions_count: laborFunctions.count,
      functions_match_status: laborFunctions.reason,
    };
  }

  /**
   * Generar codigo de validacion
   * En produccion: enviar email
   * En local: devolver codigo fijo
   */
  async generarCodigoValidacion(documento: string, documentType?: string) {
    const verificacion = await this.verificarDocumentoPorSolicitud(documento);
    const normalizedDocumentType = this.normalizeLaborDocumentType(
      documentType,
      { strict: true },
    );

    if (!verificacion.existe) {
      throw new NotFoundException('Documento no encontrado en el sistema');
    }

    // Verificar que solicitud existe
    if (!verificacion.solicitud) {
      throw new BadRequestException(
        'Error al recuperar informacion de la solicitud',
      );
    }

    const employmentStatus = this.resolveEmploymentStatus(
      verificacion.solicitud.hiring_date,
      verificacion.solicitud.request_date,
      verificacion.solicitud.status,
    );
    if (employmentStatus === 'INACTIVO') {
      throw new BadRequestException(
        'Si tu certificado no se encuentra disponible o tienes inquietudes, escribenos a talento.humano@esap.edu.co.',
      );
    }

    const emailDestino = this.normalizarCorreo(verificacion.solicitud.email);
    if (emailDestino && !this.tieneFormatoCorreoValido(emailDestino)) {
      throw new BadRequestException(
        'El correo registrado no tiene un formato valido. No fue enviado el codigo de validacion.',
      );
    }

    // Generar codigo de 6 digitos
    const codigoValidacion = Math.floor(
      100000 + Math.random() * 900000,
    ).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

    // Guardar el codigo y expiracion en la solicitud
    await this.requestRepo.update(verificacion.solicitud.id, {
      validation_code: codigoValidacion,
      validation_expires_at: expiresAt,
      ...(normalizedDocumentType
        ? { document_type: normalizedDocumentType }
        : {}),
    });

    if (normalizedDocumentType) {
      (verificacion.solicitud as CertificateRequest).document_type =
        normalizedDocumentType;
    }

    // Enviar email si hay configuracion SMTP
    try {
      await this.enviarCodigoPorEmail(
        emailDestino,
        codigoValidacion,
      );
    } catch (err) {
      this.logger.warn(
        `No se pudo enviar el codigo por email: ${err?.message || err}`,
      );
    }

    return {
      mensaje: 'Codigo de validacion generado',
      email: emailDestino,
      // Devolver datos del empleado para mostrar en el frontend
      solicitud: {
        full_name: verificacion.solicitud.full_name,
        id_number: verificacion.solicitud.id_number,
        document_type:
          normalizedDocumentType ||
          (verificacion.solicitud as CertificateRequest).document_type ||
          undefined,
        email: emailDestino,
        status: verificacion.solicitud.status,
        employment_status: employmentStatus,
        career_category: verificacion.solicitud.career_category,
        hiring_date: verificacion.solicitud.hiring_date,
        position_category: verificacion.solicitud.position_category,
        position_location: verificacion.solicitud.position_location,
        monthly_salary: verificacion.solicitud.monthly_salary,
        department: verificacion.solicitud.department,
        cod_cargo: verificacion.solicitud.cod_cargo,
        cod_grade: verificacion.solicitud.cod_grade,
        campus: verificacion.solicitud.campus,
        observations: verificacion.solicitud.observations,
        technical_bonus_available: this.normalizeBoolean(
          (verificacion.solicitud as any).technical_bonus_available,
          false,
        ),
        technical_bonus_percentage: this.roundToTwoDecimals(
          this.parseNumericValue(
            (verificacion.solicitud as any).technical_bonus_percentage,
          ),
        ),
        technical_bonus_value: this.roundToTwoDecimals(
          this.parseNumericValue(
            (verificacion.solicitud as any).technical_bonus_value,
          ),
        ),
        technical_bonus_category:
          (verificacion.solicitud as any).technical_bonus_category || null,
        technical_bonuses:
          (verificacion.solicitud as any).technical_bonuses || [],
        functions_available: this.normalizeBoolean(
          (verificacion.solicitud as any).functions_available,
          false,
        ),
        functions_count: Number(
          (verificacion.solicitud as any).functions_count || 0,
        ),
        functions_match_status:
          (verificacion.solicitud as any).functions_match_status || 'NOT_FOUND',
      },
    };
  }

  /**
   * Validar codigo y generar certificado
   */
  async validarCodigoYGenerarCertificado(
    documento: string,
    codigo: string,
    options: {
      documentType?: string;
      includeSalary?: boolean;
      includeTechnicalBonus?: boolean;
      includeFunctions?: boolean;
    } = {},
  ) {
    const documentoTrim = (documento || '').trim();
    const codigoTrim = (codigo || '').trim();
    const normalizedDocumentType = this.normalizeLaborDocumentType(
      options.documentType,
      { strict: true },
    );
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
      throw new BadRequestException(
        'No se ha generado un codigo de validacion para esta solicitud',
      );
    }

    if (new Date(solicitud.validation_expires_at) < new Date()) {
      throw new BadRequestException(
        'El codigo de validacion ha expirado. Solicita uno nuevo.',
      );
    }

    const employmentStatus = this.resolveEmploymentStatus(
      solicitud.hiring_date,
      solicitud.request_date,
      solicitud.status,
    );
    if (employmentStatus === 'INACTIVO') {
      throw new BadRequestException(
        'Si tu certificado no se encuentra disponible o tienes inquietudes, escribenos a talento.humano@esap.edu.co.',
      );
    }

    if (
      normalizedDocumentType &&
      solicitud.document_type !== normalizedDocumentType
    ) {
      solicitud.document_type = normalizedDocumentType;
      await this.requestRepo.save(solicitud);
    }

    // Generar el certificado
    const includeSalary = this.normalizeBoolean(options.includeSalary, true);
    const includeTechnicalBonus = includeSalary
      ? this.normalizeBoolean(options.includeTechnicalBonus, false)
      : false;
    const includeFunctions = this.normalizeBoolean(
      options.includeFunctions,
      false,
    );
    const nuevoCertificado = await this.createCertificado(solicitud.id, {
      includeSalary,
      includeTechnicalBonus,
      includeFunctions,
    });

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
