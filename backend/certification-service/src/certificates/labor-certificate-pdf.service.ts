import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as QRCode from 'qrcode';
import puppeteer from 'puppeteer';
import { Certificate } from './certificate.entity';
import { TemplateConfigService } from './template-config.service';

type TemplateType = 'docente' | 'administrador';
type TechnicalBonusCategory = string;

type TechnicalBonusRenderItem = {
  category?: string | null;
  label?: string | null;
  percentage: number;
  value: number;
  templateText?: string | null;
  displayOrder?: number;
};

type PdfOptions = {
  includeSalary?: boolean;
  includeTechnicalBonus?: boolean;
  includeFunctions?: boolean;
  templateType?: TemplateType;
  publicBaseUrl?: string;
  technicalBonusTemplate?: string;
};

export type LaborCertificateTemplateVariable = {
  code: string;
  label: string;
  value: string;
  source_fields: string[];
};

const TEMPLATE_VARIABLE_META: Record<string, { label: string; sourceFields: string[] }> = {
  '[DATO1]': { label: 'Nombre del empleado', sourceFields: ['full_name'] },
  '[DATO2]': { label: 'Número de documento', sourceFields: ['id_number'] },
  '[DATO3]': { label: 'Tipo de vinculación', sourceFields: ['position_category'] },
  '[DATO4]': { label: 'Fecha de vinculación', sourceFields: ['hiring_date'] },
  '[DATO5]': { label: 'Cargo', sourceFields: ['career_category'] },
  '[DATO6]': { label: 'Dato adicional de ubicación', sourceFields: ['department', 'position_location'] },
  '[DATO7]': { label: 'Dependencia', sourceFields: ['department'] },
  '[DATO8]': { label: 'Salario en letras calculado', sourceFields: ['monthly_salary', 'include_salary'] },
  '[NOMBRE_EMPLEADO]': { label: 'Nombre del empleado', sourceFields: ['full_name'] },
  '[TIPO_DOCUMENTO]': { label: 'Tipo de documento', sourceFields: ['document_type'] },
  '[TIPO_DOCUMENTO_CORTO]': { label: 'Código del documento', sourceFields: ['document_type'] },
  '[DOCUMENTO]': { label: 'Número de documento', sourceFields: ['id_number'] },
  '[CARGO]': { label: 'Cargo calculado', sourceFields: ['career_category', 'cod_cargo', 'cod_grade', 'encargo_type'] },
  '[CARGO DATO6]': { label: 'Tipo de vinculación', sourceFields: ['position_category'] },
  '[TIPO_DATO]': { label: 'Tipo de vinculación', sourceFields: ['position_category'] },
  '[GRUPO]': { label: 'Grupo o ubicación', sourceFields: ['position_location'] },
  '[SEDE]': { label: 'Sede', sourceFields: ['campus'] },
  '[UBICACIÓN]': { label: 'Dependencia', sourceFields: ['department'] },
  '[UBICACION]': { label: 'Dependencia', sourceFields: ['department'] },
  '[DEPENDENCIA]': { label: 'Dependencia', sourceFields: ['department'] },
  '[DEPENDENCIA_PADRE]': { label: 'Dependencia padre', sourceFields: ['cod_cargo'] },
  '[FECHA_INICIO]': { label: 'Fecha de vinculación', sourceFields: ['hiring_date'] },
  '[FECHA_FIN]': { label: 'Fecha de finalización', sourceFields: [] },
  '[SALARIO]': { label: 'Salario mensual', sourceFields: ['monthly_salary', 'include_salary'] },
  '[SALARIO_LETRAS]': { label: 'Salario en letras calculado', sourceFields: ['monthly_salary', 'include_salary'] },
  '[PRIMA_TECNICA]': { label: 'Prima técnica calculada', sourceFields: ['technical_bonus', 'include_technical_bonus'] },
  '[FUNCIONES]': { label: 'Funciones laborales', sourceFields: ['functions_snapshot', 'include_functions'] },
  '[FECHA_EXPEDICION_COMPLETA]': { label: 'Fecha de expedición', sourceFields: [] },
  '[CIUDAD_EXPEDICION]': { label: 'Ciudad de expedición', sourceFields: [] },
};

const templateVariableSourceFields = (
  code: string,
  templateType: TemplateType,
): string[] => {
  if (code === '[CARGO]') {
    return templateType === 'docente'
      ? ['career_category', 'cod_cargo', 'encargo_type']
      : ['career_category', 'cod_cargo', 'cod_grade', 'encargo_type'];
  }
  if (code === '[DATO5]' && templateType === 'docente') {
    return ['career_category', 'position_category', 'position_location', 'department'];
  }
  if (code === '[DATO6]') {
    return templateType === 'docente'
      ? ['department', 'position_location', 'campus']
      : [];
  }
  return TEMPLATE_VARIABLE_META[code]?.sourceFields || [];
};

@Injectable()
export class LaborCertificatePdfService {
  private readonly defaultTypographyFont = 'Arial Narrow, Arial, sans-serif';

  constructor(private readonly templateConfigService: TemplateConfigService) {}

  private sanitizeTypographyFont(value?: string | null): string {
    const raw = String(value || '').trim();
    if (!raw) return this.defaultTypographyFont;
    const sanitized = raw
      .replace(/[\r\n\t]/g, ' ')
      .replace(/[{}<>;`$]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!sanitized || /url\(|@import|expression|javascript:/i.test(sanitized)) {
      return this.defaultTypographyFont;
    }
    return sanitized;
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

  private normalizeTechnicalBonusCategory(
    value?: string | null,
  ): TechnicalBonusCategory | null {
    const normalized = String(value || '').trim().toUpperCase();
    return normalized || null;
  }

  private resolveTechnicalBonusConcept(category?: string | null): string {
    const normalized = this.normalizeTechnicalBonusCategory(category);
    if (normalized === 'COORDINADORES') return 'prima de coordinación';
    if (normalized === 'DIRECTIVOS') return 'prima técnica';
    return 'prima técnica y/o coordinación';
  }

  async generateCertificatePdf(
    certificate: Certificate,
    options: PdfOptions = {},
  ): Promise<{ filename: string; buffer: Buffer }> {
    const certificateWithTemplate = certificate as Certificate & {
      template_snapshot?: any;
      template_type?: string;
    };
    const snapshot = certificateWithTemplate.template_snapshot;
    const templateType =
      snapshot?.templateType ||
      snapshot?.template_type ||
      (certificateWithTemplate.template_type as TemplateType) ||
      options.templateType ||
      this.resolveTemplateType(certificate);
    const includeSalaryPersisted = this.normalizeBoolean(
      (certificate as Certificate & { include_salary?: boolean | null }).include_salary,
      true,
    );
    const includeTechnicalBonusPersisted = this.normalizeBoolean(
      (certificate as Certificate & { include_technical_bonus?: boolean | null }).include_technical_bonus,
      false,
    );
    const includeSalary = this.normalizeBoolean(options.includeSalary, includeSalaryPersisted);
    const includeTechnicalBonus = includeSalary
      ? this.normalizeBoolean(options.includeTechnicalBonus, includeTechnicalBonusPersisted)
      : false;
    const includeFunctions = this.normalizeBoolean(
      options.includeFunctions,
      this.normalizeBoolean(certificate.include_functions, false),
    );

    const config = snapshot || await this.templateConfigService.getActiveConfig(templateType);
    const typographyFont = this.sanitizeTypographyFont(
      config?.typography?.font || config?.typographyFont,
    );

    const logoDataUrl = await this.resolveAssetDataUrl(config?.logo?.url);
    const signatureDataUrl = await this.resolveAssetDataUrl(
      config?.firmante?.firmaDigitalUrl || config?.firmante?.firmaUrl,
    );

    const contentHtml = this.buildCertificateContent({
      certificate,
      templateType,
      includeSalary,
      includeTechnicalBonus,
      includeFunctions,
      templateHtml: config?.certificateContentHtml || '',
      technicalBonusTemplate: options.technicalBonusTemplate,
    });

    const verificationCode =
      (certificate as Certificate & { verification_code?: string }).verification_code ||
      certificate.certificate_number ||
      '';
    const frontendBaseUrl = options.publicBaseUrl || this.resolveFrontendBaseUrl();
    const verificationUrl = verificationCode
      ? `${frontendBaseUrl}/verificar-certificado/${encodeURIComponent(verificationCode)}`
      : frontendBaseUrl;
    const qrCodeDataUrl = await this.generateQrCodeDataUrl(verificationUrl);

    const html = this.buildHtml({
      certificate,
      contentHtml,
      cargoTitle: config?.cargoTitle || '',
      typographyFont,
      logoDataUrl,
      signatureDataUrl,
      qrCodeDataUrl,
      signerName:
        config?.firmante?.nombreCompleto ||
        config?.firmante?.nombre ||
        certificate.signer_name ||
        '',
    });

    const buffer = await this.renderPdf(html);
    const safeName = (certificate.full_name || 'Certificado_Laboral')
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^\w-]/g, '');
    const filename = `Certificado_Laboral_${safeName}_${certificate.certificate_number}.pdf`;

    return { filename, buffer };
  }

  async buildCertificatePreview(
    certificate: Certificate,
    options: PdfOptions = {},
  ): Promise<{
    content_html: string;
    body_content_html: string;
    closing_content_html: string;
    cargo_title: string;
    typography_font: string;
    signer_name: string;
    signer_position: string;
    template_type: TemplateType;
    template_version: string | null;
    certificate_number: string;
    template_variables: LaborCertificateTemplateVariable[];
  }> {
    const certificateWithTemplate = certificate as Certificate & {
      template_snapshot?: any;
      template_type?: string;
    };
    const snapshot = certificateWithTemplate.template_snapshot;
    const templateType =
      snapshot?.templateType ||
      snapshot?.template_type ||
      (certificateWithTemplate.template_type as TemplateType) ||
      options.templateType ||
      this.resolveTemplateType(certificate);
    const includeSalary = this.normalizeBoolean(
      options.includeSalary,
      this.normalizeBoolean(certificate.include_salary, true),
    );
    const includeTechnicalBonus = includeSalary
      ? this.normalizeBoolean(
          options.includeTechnicalBonus,
          this.normalizeBoolean(certificate.include_technical_bonus, false),
        )
      : false;
    const includeFunctions = this.normalizeBoolean(
      options.includeFunctions,
      this.normalizeBoolean(certificate.include_functions, false),
    );
    const config = snapshot || await this.templateConfigService.getActiveConfig(templateType);
    let templateVariables: LaborCertificateTemplateVariable[] = [];
    const contentHtml = this.buildCertificateContent({
      certificate,
      templateType,
      includeSalary,
      includeTechnicalBonus,
      includeFunctions,
      templateHtml: config?.certificateContentHtml || '',
      technicalBonusTemplate:
        options.technicalBonusTemplate || config?.technicalBonusTemplate,
      highlightVariables: true,
      collectTemplateVariables: (variables) => {
        templateVariables = variables;
      },
    });
    const closingContent = this.splitCertificateClosingContent(contentHtml);

    return {
      content_html: contentHtml,
      body_content_html: closingContent.bodyHtml,
      closing_content_html: closingContent.closingHtml,
      cargo_title: String(config?.cargoTitle || ''),
      typography_font: this.sanitizeTypographyFont(
        config?.typography?.font || config?.typographyFont,
      ),
      signer_name: String(
        config?.firmante?.nombreCompleto ||
        config?.firmante?.nombre ||
        certificate.signer_name ||
        '',
      ),
      signer_position: String(
        config?.firmante?.cargo || certificate.signer_position || '',
      ),
      template_type: templateType,
      template_version: config?.version ? String(config.version) : null,
      certificate_number: String(certificate.certificate_number || ''),
      template_variables: templateVariables,
    };
  }

  private resolveTemplateType(certificate: Certificate): TemplateType {
    const rawText = `${certificate.position_category || ''} ${certificate.career_category || ''}`;
    const text = rawText
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!text) {
      return 'administrador';
    }
    const isDocente = /\bdocen\w*\b|\bdoc\b/.test(text);
    return isDocente ? 'docente' : 'administrador';
  }

  private resolveFrontendBaseUrl(): string {
    return (
      process.env.PUBLIC_FRONTEND_URL ||
      process.env.FRONTEND_URL ||
      process.env.FRONTEND_BASE_URL ||
      'https://esap.edu.co'
    );
  }

  private normalizeMoneyValue(value?: string | number | null): number {
    if (value === null || value === undefined) return 0;
    const raw =
      typeof value === 'string' ? value.replace(/[^\d.-]/g, '') : String(value);
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return 0;
    return Math.round(parsed);
  }

  private formatMoney(value?: string | number | null): string {
    return this.normalizeMoneyValue(value).toLocaleString('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }

  private calculateTechnicalBonusPercentage(
    bonusValue: number,
    salaryBase: number,
  ): number {
    if (!Number.isFinite(bonusValue) || !Number.isFinite(salaryBase)) return 0;
    if (bonusValue <= 0 || salaryBase <= 0) return 0;
    return Number(((bonusValue / salaryBase) * 100).toFixed(2));
  }

  private formatPercentage(value: number): string {
    if (!Number.isFinite(value) || value <= 0) return '0';
    return value.toLocaleString('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  }

  private getTechnicalBonusSnapshotItems(certificate: Certificate): any[] {
    const cert = certificate as Certificate & {
      technical_bonuses?: any[] | null;
      technicalBonuses?: any[] | null;
      template_snapshot?: any;
      templateSnapshot?: any;
    };
    const direct = Array.isArray(cert.technical_bonuses)
      ? cert.technical_bonuses
      : Array.isArray(cert.technicalBonuses)
        ? cert.technicalBonuses
        : null;
    if (direct?.length) {
      return direct;
    }

    const snapshotItems =
      cert.template_snapshot?.technicalBonuses ||
      cert.template_snapshot?.technical_bonuses ||
      cert.templateSnapshot?.technicalBonuses ||
      cert.templateSnapshot?.technical_bonuses;
    return Array.isArray(snapshotItems) ? snapshotItems : [];
  }

  private resolveTechnicalBonusItems(
    certificate: Certificate,
    salaryBase: number,
    fallbackTemplate?: string,
  ): TechnicalBonusRenderItem[] {
    const snapshotItems = this.getTechnicalBonusSnapshotItems(certificate);

    const items = snapshotItems
      .map((item): TechnicalBonusRenderItem | null => {
        const percentage = this.parseBonusPercentage(item);
        const value = this.parseBonusValue(item, salaryBase, percentage);
        if (percentage <= 0 || value <= 0) return null;
        return {
          category: item?.category || item?.technical_bonus_category || null,
          label: item?.label || item?.categoryLabel || null,
          percentage,
          value,
          templateText:
            item?.template_text ||
            item?.templateText ||
            item?.technicalBonusTemplate ||
            fallbackTemplate ||
            null,
          displayOrder: Number(item?.display_order ?? item?.displayOrder ?? 100),
        };
      })
      .filter((item): item is TechnicalBonusRenderItem => Boolean(item))
      .sort((left, right) => {
        const leftOrder = Number.isFinite(left.displayOrder || 0)
          ? Number(left.displayOrder || 0)
          : 100;
        const rightOrder = Number.isFinite(right.displayOrder || 0)
          ? Number(right.displayOrder || 0)
          : 100;
        if (leftOrder !== rightOrder) return leftOrder - rightOrder;
        const labelCompare = String(left.label || '').localeCompare(
          String(right.label || ''),
          'es',
        );
        if (labelCompare !== 0) return labelCompare;
        return String(left.category || '').localeCompare(
          String(right.category || ''),
          'es',
        );
      });

    if (items.length) {
      return items;
    }

    const legacyValue = this.normalizeMoneyValue(certificate.technical_bonus);
    if (legacyValue <= 0) {
      return [];
    }

    const legacyCategory = this.normalizeTechnicalBonusCategory(
      (certificate as Certificate & {
        technical_bonus_category?: string | null;
        request?: { technical_bonus_category?: string | null };
      }).technical_bonus_category ||
        (certificate as Certificate & {
          request?: { technical_bonus_category?: string | null };
        }).request?.technical_bonus_category,
    );

    return [
      {
        category: legacyCategory,
        percentage: this.calculateTechnicalBonusPercentage(
          legacyValue,
          salaryBase,
        ),
        value: legacyValue,
        templateText: fallbackTemplate || null,
        displayOrder: 100,
      },
    ];
  }

  private parseBonusPercentage(item: any): number {
    const raw =
      item?.percentage ??
      item?.porcentaje ??
      item?.technical_bonus_percentage ??
      item?.technicalBonusPercentage;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return 0;
    return Number(parsed.toFixed(2));
  }

  private parseBonusValue(
    item: any,
    salaryBase: number,
    percentage: number,
  ): number {
    const explicitValue =
      item?.value ??
      item?.amount ??
      item?.technical_bonus_value ??
      item?.technicalBonusValue;
    const normalizedValue = this.normalizeMoneyValue(explicitValue);
    if (normalizedValue > 0) {
      return normalizedValue;
    }
    if (salaryBase <= 0 || percentage <= 0) {
      return 0;
    }
    return this.normalizeMoneyValue(salaryBase * (percentage / 100));
  }

  private normalizeCodeValue(value?: string | number | null): string {
    if (value === null || value === undefined) return '';
    const raw = String(value).trim();
    if (!raw) return '';
    const digits = raw.replace(/\D+/g, '');
    return digits || raw.replace(/\s+/g, '');
  }

  private selectPreferredCodeValue(
    ...values: Array<string | number | null | undefined>
  ): string {
    const normalized = values
      .map((value) => this.normalizeCodeValue(value))
      .filter(Boolean);

    if (!normalized.length) {
      return '';
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

  private truncateCargoCode(value: string): string {
    if (!value || value.length <= 4 || this.isZeroValue(value)) {
      return value;
    }
    return value.slice(0, 4);
  }

  private normalizeSpaces(value?: string | null): string {
    return String(value || '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private normalizeSearchText(value?: string | null): string {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private normalizeEncargoType(value?: string | null): 'E' | 'N' | null {
    const normalized = String(value || '').trim().toUpperCase();
    if (!normalized) return null;
    if (normalized === 'E' || normalized.startsWith('E')) return 'E';
    if (normalized === 'N' || normalized.startsWith('N')) return 'N';
    return null;
  }

  private appendEncargoSuffix(cargo: string, encargoType: 'E' | 'N' | null): string {
    const base = this.normalizeSpaces(cargo);
    if (!base || base === 'N/A' || encargoType !== 'E') {
      return base;
    }
    if (/\(\s*E\s*\)$/i.test(base)) {
      return base.replace(/\(\s*E\s*\)$/i, '(E)');
    }
    if (/\sE$/i.test(base)) {
      return base.replace(/\sE$/i, ' (E)');
    }
    return `${base} (E)`;
  }

  private isZeroValue(value: string): boolean {
    return Boolean(value) && /^0+$/.test(value);
  }

  private areEquivalentTemplateValues(a?: string | null, b?: string | null): boolean {
    const left = this.normalizeSearchText(this.normalizeSpaces(a));
    const right = this.normalizeSearchText(this.normalizeSpaces(b));
    if (!left || !right) return false;
    return left === right;
  }

  private buildCargoVariable(
    careerCategory?: string | null,
    codCargo?: string | number | null,
    codGrade?: string | number | null,
    options?: {
      templateType?: TemplateType;
      includeCodeLabel?: boolean;
      codeLabel?: string;
      observations?: string | null;
      encargoFlag?: string | null;
    },
  ): string {
    const careerRaw = this.normalizeSpaces(careerCategory);
    const encargoType = this.normalizeEncargoType(
      options?.observations ?? options?.encargoFlag,
    );
    const leadingMatch = careerRaw.match(/^(\d+)\s+(.+)$/);
    const leadingCode = this.normalizeCodeValue(leadingMatch?.[1]);
    let baseText = this.normalizeSpaces(leadingMatch ? leadingMatch[2] : careerRaw);
    const gradeMatch = careerRaw.match(/\bgrado\s*(\d{1,2})\b/i);
    const gradeFromText = this.normalizeCodeValue(gradeMatch?.[1]);
    baseText = this.normalizeSpaces(baseText.replace(/\bgrado\s*\d{1,2}\b/gi, ''));

    let inferredCode = '';
    let inferredGrade = '';
    const compactAdminMatch = baseText.match(/^(.*?)(?:\s+)?(\d{4})(\d{2})$/);
    if (compactAdminMatch && /[A-Za-z\u00C0-\u00FF]/.test(compactAdminMatch[1] || '')) {
      inferredCode = compactAdminMatch[2];
      inferredGrade = compactAdminMatch[3];
      baseText = this.normalizeSpaces(compactAdminMatch[1]);
    } else {
      const trailingCodeMatch = baseText.match(
        /^(.*?)(?:\s+)?(?:c[oó]digo\s+)?(\d{4,5})$/i,
      );
      if (trailingCodeMatch && /[A-Za-z\u00C0-\u00FF]/.test(trailingCodeMatch[1] || '')) {
        inferredCode = trailingCodeMatch[2];
        baseText = this.normalizeSpaces(trailingCodeMatch[1]);
      }
    }

    let codCargoRaw =
      this.normalizeCodeValue(codCargo) || leadingCode || inferredCode;
    let codGradeRaw =
      this.normalizeCodeValue(codGrade) || gradeFromText || inferredGrade;

    const isNoDefinido = /no\s+definido/i.test(careerRaw);
    const cargoIsZero = this.isZeroValue(codCargoRaw);
    const gradeIsZero = this.isZeroValue(codGradeRaw);

    if (isNoDefinido && cargoIsZero && gradeIsZero) {
      return 'No Definido';
    }

    const resolvedTemplate: TemplateType =
      options?.templateType ||
      (/\bdocen\w*\b|\bdoc\b/.test(
        this.normalizeSearchText(`${careerRaw} ${baseText}`),
      )
        ? 'docente'
        : 'administrador');

    if (
      codCargoRaw &&
      codGradeRaw &&
      codCargoRaw.length > codGradeRaw.length &&
      codCargoRaw.endsWith(codGradeRaw)
    ) {
      const cargoSoloCodigo =
        codCargoRaw.length >= 4
          ? codCargoRaw.slice(0, 4)
          : codCargoRaw.slice(0, -codGradeRaw.length);
      if (cargoSoloCodigo.length >= 3) {
        codCargoRaw = cargoSoloCodigo;
      }
    }

    if (
      resolvedTemplate !== 'docente' &&
      !codGradeRaw &&
      /^\d{5,6}$/.test(codCargoRaw) &&
      /[A-Za-z\u00C0-\u00FF]/.test(baseText || careerRaw)
    ) {
      codGradeRaw = codCargoRaw.slice(-2);
      codCargoRaw = codCargoRaw.slice(0, 4);
    }

    codCargoRaw = this.truncateCargoCode(codCargoRaw);

    const baseFinal =
      baseText ||
      this.normalizeSpaces(
        careerRaw
          .replace(/^\d+\s+/, '')
          .replace(/\bgrado\s*\d{1,2}\b/gi, ''),
      ) ||
      careerRaw;

    const includeCodeLabel = options?.includeCodeLabel === true;
    const codeLabel = options?.codeLabel || 'Codigo';
    const parts: string[] = [];
    if (baseFinal) parts.push(baseFinal);
    if (codCargoRaw && !new RegExp(`\\b${codCargoRaw}\\b`).test(baseFinal)) {
      parts.push(includeCodeLabel ? `${codeLabel} ${codCargoRaw}` : codCargoRaw);
    }
    if (resolvedTemplate !== 'docente' && (codGradeRaw || gradeIsZero)) {
      parts.push(`Grado ${codGradeRaw || '0'}`);
    }

    return this.appendEncargoSuffix(
      this.normalizeSpaces(parts.join(' ')) || careerRaw || 'N/A',
      encargoType,
    );
  }

  private async generateQrCodeDataUrl(value: string): Promise<string | null> {
    if (!value) return null;
    try {
      return await QRCode.toDataURL(value, {
        width: 198,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
    } catch (error) {
      return null;
    }
  }

  private async resolveAssetDataUrl(assetUrl?: string | null): Promise<string | null> {
    if (!assetUrl) {
      return null;
    }

    if (/^https?:\/\//i.test(assetUrl)) {
      return assetUrl;
    }

    const cleaned = assetUrl.replace(/^\/+/, '');
    const candidates = [
      path.join(process.cwd(), cleaned),
      path.join(process.cwd(), 'backend', 'certification-service', cleaned),
      path.join(__dirname, '..', '..', cleaned),
      path.join(__dirname, '..', '..', '..', cleaned),
    ];

    const filePath = candidates.find((candidate) => fs.existsSync(candidate));
    if (!filePath) {
      return assetUrl;
    }

    const buffer = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const mime =
      ext === '.png'
        ? 'image/png'
        : ext === '.jpg' || ext === '.jpeg'
          ? 'image/jpeg'
          : 'application/octet-stream';

    return `data:${mime};base64,${buffer.toString('base64')}`;
  }

  private buildCertificateContent(params: {
    certificate: Certificate;
    templateType: TemplateType;
    includeSalary: boolean;
    includeTechnicalBonus: boolean;
    includeFunctions?: boolean;
    templateHtml: string;
    technicalBonusTemplate?: string;
    highlightVariables?: boolean;
    collectTemplateVariables?: (variables: LaborCertificateTemplateVariable[]) => void;
  }): string {
    const { certificate, templateType, includeSalary, includeTechnicalBonus, templateHtml, technicalBonusTemplate } = params;
    const includeFunctions = this.normalizeBoolean(
      params.includeFunctions,
      this.normalizeBoolean(certificate.include_functions, false),
    );

    const certificateExtras = certificate as Certificate & {
      cod_cargo?: string;
      codCargo?: string;
      observations?: string;
      encargo_type?: string | null;
      is_corrected?: boolean;
    };
    const preferCorrectedCertificate = certificateExtras.is_corrected === true;
    const requestObservations =
      certificateExtras.encargo_type ??
      (certificate as Certificate & { request?: { observations?: string } }).request
        ?.observations ??
      certificateExtras.observations ??
      '';
    const requestDepartment = preferCorrectedCertificate
      ? certificate.department || ''
      :
      (certificate as Certificate & { request?: { department?: string } }).request
        ?.department || '';
    const requestPositionLocation = preferCorrectedCertificate
      ? certificate.position_location || ''
      :
      (certificate as Certificate & { request?: { position_location?: string } }).request
        ?.position_location || '';

    const fullName = certificate.full_name || '';
    const documentNumber = certificate.id_number || '';
    const requestData = (certificate as Certificate & {
      request?: {
        career_category?: string;
        position_category?: string;
        cod_cargo?: string;
        cod_grade?: string;
      };
    }).request;
    // Match frontend mapping: tipo vinculacion from position_category, cargo from career_category.
    const tipoVinculacion =
      (preferCorrectedCertificate ? certificate.position_category : requestData?.position_category) ||
      certificate.position_category ||
      certificate.career_category ||
      '';
    const cargoTexto =
      (preferCorrectedCertificate ? certificate.career_category : requestData?.career_category) ||
      certificate.career_category ||
      certificate.position_category ||
      '';
    const codCargoSource = this.selectPreferredCodeValue(
      preferCorrectedCertificate ? certificateExtras.cod_cargo : requestData?.cod_cargo,
      preferCorrectedCertificate ? certificateExtras.codCargo : requestData?.['codCargo'],
      (certificate as Certificate & { cod_cargo?: string }).cod_cargo,
      (certificate as Certificate & { codCargo?: string }).codCargo,
    );
    const codGradeSource = this.selectPreferredCodeValue(
      preferCorrectedCertificate ? (certificate as any).cod_grade : requestData?.cod_grade,
      preferCorrectedCertificate ? (certificate as any).codGrade : requestData?.['codGrade'],
      (certificate as Certificate & { cod_grade?: string }).cod_grade,
      (certificate as Certificate & { codGrade?: string }).codGrade,
    );
    const cargoVariable =
      this.buildCargoVariable(cargoTexto, codCargoSource, codGradeSource, {
        templateType,
        includeCodeLabel: true,
        codeLabel: 'Codigo',
        observations: requestObservations,
      }) ||
      cargoTexto ||
      tipoVinculacion ||
      '';
    const grado = certificate.position_location || '';
    const dependenciaHijo = requestDepartment || certificate.department || '';
    const dependenciaPadre =
      (preferCorrectedCertificate ? certificateExtras.cod_cargo : (certificate as Certificate & { request?: { cod_cargo?: string } }).request?.cod_cargo) ||
      certificateExtras.cod_cargo ||
      certificateExtras.codCargo ||
      '';

    const ubicacion =
      dependenciaHijo ||
      certificate.position_location ||
      certificate.campus ||
      dependenciaPadre ||
      '';
    const ubicacionCargo = dependenciaHijo || certificate.position_location || ubicacion;

    const cargoPlantilla =
      templateType === 'docente'
        ? cargoTexto && tipoVinculacion &&
          cargoTexto.toLowerCase() === tipoVinculacion.toLowerCase()
          ? (grado || dependenciaHijo || cargoTexto)
          : (cargoTexto || grado || tipoVinculacion || dependenciaHijo || '')
        : (cargoTexto || grado || tipoVinculacion || '');

    const dato6 = templateType === 'docente' ? ubicacionCargo : requestObservations;
    const dato7 =
      requestDepartment ||
      certificate.department ||
      '';
    const grupoVariable =
      requestPositionLocation ||
      certificate.position_location ||
      '';
    const cargoDato6 = tipoVinculacion;

    const salarioBase = this.normalizeMoneyValue(certificate.monthly_salary);
    const salarioEnLetras =
      includeSalary && salarioBase ? this.numeroALetras(salarioBase) : '';

    const fechaVinculacion = this.formatDate(certificate.hiring_date);
    const fechaExpedicion = this.formatDate(certificate.issue_date || new Date());
    const documentTypeCode = String(certificate.document_type || 'CC').trim().toUpperCase();
    const documentTypeLabel = this.formatDocumentType(documentTypeCode);
    const hasGrupoVariable = /\[GRUPO\]/i.test(templateHtml || '');
    const hasDependenciaVariable = /\[DEPENDENCIA\]/i.test(templateHtml || '');
    const shouldHideGrupo =
      hasGrupoVariable &&
      hasDependenciaVariable &&
      this.areEquivalentTemplateValues(grupoVariable, dato7);
    const grupoVariableResolved = shouldHideGrupo ? '' : grupoVariable;

    const replacements: Record<string, string> = {
      '[DATO1]': fullName,
      '[DATO2]': documentNumber,
      '[DATO3]': tipoVinculacion,
      '[DATO4]': fechaVinculacion,
      '[DATO5]': cargoPlantilla,
      '[DATO6]': dato6,
      '[DATO7]': dato7,
      '[DATO8]': includeSalary ? salarioEnLetras : '',
      '[NOMBRE_EMPLEADO]': fullName,
      '[TIPO_DOCUMENTO]': documentTypeLabel,
      '[TIPO_DOCUMENTO_CORTO]': documentTypeCode,
      '[DOCUMENTO]': documentNumber,
      '[CARGO]': cargoVariable,
      '[CARGO DATO6]': cargoDato6,
      '[TIPO_DATO]': cargoDato6,
      '[GRUPO]': grupoVariableResolved,
      '[SEDE]': certificate.campus || '',
      '[UBICACIÓN]': dato7,
      '[UBICACION]': dato7,
      '[DEPENDENCIA]': dato7,
      '[DEPENDENCIA_PADRE]': dependenciaPadre,
      '[FECHA_INICIO]': fechaVinculacion,
      '[FECHA_FIN]': 'la actualidad',
      '[SALARIO]': includeSalary && salarioBase
        ? `($${this.formatMoney(salarioBase)})`
        : '',
      '[SALARIO_LETRAS]': includeSalary ? salarioEnLetras : '',
      '[FECHA_EXPEDICION_COMPLETA]': fechaExpedicion,
      '[CIUDAD_EXPEDICION]': 'Bogota D.C.',
    };

    const bonusItems = includeTechnicalBonus
      ? this.resolveTechnicalBonusItems(
          certificate,
          salarioBase,
          technicalBonusTemplate,
        )
      : [];
    const laborFunctions = includeFunctions
      ? this.resolveLaborFunctions(certificate)
      : [];
    const activeTemplateVariables: LaborCertificateTemplateVariable[] = Object.entries(replacements)
      .filter(([code]) => templateHtml.includes(code))
      .map(([code, value]) => ({
        code,
        label: TEMPLATE_VARIABLE_META[code]?.label || code.slice(1, -1),
        value: value || '',
        source_fields: templateVariableSourceFields(code, templateType),
      }));
    if (bonusItems.length) {
      activeTemplateVariables.push({
        code: '[PRIMA_TECNICA]',
        label: TEMPLATE_VARIABLE_META['[PRIMA_TECNICA]'].label,
        value: bonusItems
          .map((bonus) => `${this.formatPercentage(bonus.percentage)}% · $${this.formatMoney(bonus.value)}`)
          .join(' + '),
        source_fields: templateVariableSourceFields('[PRIMA_TECNICA]', templateType),
      });
    }
    if (laborFunctions.length) {
      activeTemplateVariables.push({
        code: '[FUNCIONES]',
        label: TEMPLATE_VARIABLE_META['[FUNCIONES]'].label,
        value: laborFunctions
          .map((item, index) => `${index + 1}. ${item.description}`)
          .join('\n'),
        source_fields: templateVariableSourceFields('[FUNCIONES]', templateType),
      });
    }
    params.collectTemplateVariables?.(activeTemplateVariables);

    const replacementsForRender = params.highlightVariables
      ? Object.fromEntries(
          Object.entries(replacements).map(([code, value]) => [
            code,
            templateHtml.includes(code) && value ? `<mark>${value}</mark>` : value,
          ]),
        )
      : replacements;

    let result = this.normalizeTemplateHtml(templateHtml || '');
    result = this.prepareLaborFunctionsTemplate(
      result,
      laborFunctions.length > 0,
    );
    result = this.replaceVariables(result, replacementsForRender);
    result = this.normalizeSpacing(result);
    result = this.normalizeParagraphStructure(result);

    if (!includeSalary) {
      result = this.stripSalarySections(result);
    }

    if (bonusItems.length) {
      result = this.insertTechnicalBonuses(
        result,
        bonusItems,
        params.highlightVariables === true,
      );
    }

    result = this.normalizeParagraphStructure(result);
    if (laborFunctions.length) {
      const tokenResult = this.replaceLaborFunctionsToken(
        result,
        laborFunctions,
        params.highlightVariables === true,
      );
      result = tokenResult.replaced
        ? tokenResult.html
        : this.insertLaborFunctions(
            result,
            laborFunctions,
            params.highlightVariables === true,
          );
    } else {
      result = this.removeLaborFunctionsToken(result);
    }

    return result;
  }

  private formatDocumentType(value?: string | null): string {
    const normalized = String(value || '').trim().toUpperCase();
    if (normalized === 'CE') return 'cédula de extranjería';
    if (normalized === 'PP') return 'pasaporte';
    return 'cédula de ciudadanía';
  }

  private normalizeTemplateHtml(html: string): string {
    let result = html;

    result = result.replace(/bg-yellow-200/g, '');
    result = result.replace(/\s*contenteditable="false"/g, '');
    result = result.replace(/\sclass=""/g, '');
    result = result.replace(/&nbsp;/g, ' ');
    result = result.replace(/text-align\s*:\s*justify;?/gi, 'text-align: justify;');
    result = result.replace(/text-indent\s*:\s*[^;"']+;?/gi, 'text-indent: 0;');
    result = result.replace(/margin-(left|right)\s*:\s*[^;"']+;?/gi, '');
    result = result.replace(/padding-(left|right)\s*:\s*[^;"']+;?/gi, '');
    result = result.replace(/\sstyle="\s*"/gi, '');

    // Preserve bold text applied by the editor.
    result = result.replace(
      /<span([^>]*?(font-weight\s*:\s*bold|font\s*:\s*[^;]*\s700|class="[^"]*font-bold[^"]*")[^>]*)>([\s\S]*?)<\/span>/gi,
      '<b>$3</b>',
    );

    // Normalize spans that wrap variable tokens.
    result = result.replace(
      /<span[^>]*(variable-token|px-2|py-1)[^>]*>([\s\S]*?)<\/span>/gi,
      '<span style="padding:0;margin:0;font-weight:inherit;">$2</span>',
    );

    // Remove spans that only wrap variables with no useful styling.
    result = result.replace(
      /<span(?![^>]*(font-weight|font-bold|variable-token|underline|italic|text-))[^>]*>(\[[^\]]+\])<\/span>/gi,
      '$2',
    );

    result = result.replace(/<span[^>]*><\/span>/g, '');
    result = result.replace(/\s*contenteditable="[^"]*"/g, '');

    return result;
  }

  private replaceVariables(html: string, replacements: Record<string, string>): string {
    let result = html;
    for (const [variable, value] of Object.entries(replacements)) {
      const escaped = variable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      result = result.replace(new RegExp(escaped, 'g'), value || '');
    }
    return result;
  }

  private normalizeSpacing(html: string): string {
    let result = html;
    result = result.replace(/&nbsp;/g, ' ');
    result = result.replace(/<\/b>(?=[A-Za-z0-9])/g, '</b> ');
    result = result.replace(/([A-Za-z0-9])<b>/g, '$1 <b>');
    result = result.replace(/\s{2,}/g, ' ');
    result = result.replace(/\s+([.,;:])/g, '$1');
    return result;
  }

  private normalizeParagraphStructure(html: string): string {
    if (!html) {
      return html;
    }

    let result = html.replace(/\r\n?/g, '\n').replace(/&nbsp;/g, ' ');
    result = result.replace(
      /<(\/)?(p|div|li|ul|ol|section|article|blockquote)\b[^>]*>/gi,
      '\n',
    );
    result = result.replace(/<br\s*\/?>/gi, '\n');
    result = result.replace(/[ \t]+\n/g, '\n').replace(/\n[ \t]+/g, '\n');

    const paragraphs = result
      .split(/\n+/)
      .map((segment) => segment.trim())
      .filter(Boolean);

    if (!paragraphs.length) {
      return '';
    }

    return paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join('');
  }

  private stripSalarySections(html: string): string {
    if (!html) {
      return html;
    }

    const keywordRegex = /(salari|asignaci)/i;

    let result = html.replace(
      /<(p|li)([^>]*)>([\s\S]*?)<\/\1>/gi,
      (match, _tag, _attrs, body) => {
        const text = body.replace(/<[^>]+>/g, ' ');
        return keywordRegex.test(text) ? '' : match;
      },
    );

    result = result.replace(
      /<div([^>]*)>([\s\S]*?)<\/div>/gi,
      (match, _attrs, body) => {
        const hasBlock = /<(p|div|li|ul|ol|table|tr|td)\b/i.test(body);
        const text = body.replace(/<[^>]+>/g, ' ');
        return keywordRegex.test(text) && !hasBlock ? '' : match;
      },
    );

    result = result.replace(/<p[^>]*>\s*<\/p>/gi, '');
    result = result.replace(/<div[^>]*>\s*<\/div>/gi, '');
    result = result.replace(/<li[^>]*>\s*<\/li>/gi, '');

    return result;
  }

  private insertTechnicalBonuses(
    html: string,
    bonuses: TechnicalBonusRenderItem[],
    highlightVariables = false,
  ): string {
    const bonusParagraph = bonuses
      .map((bonus) =>
        this.renderTechnicalBonusParagraph(bonus, highlightVariables),
      )
      .filter(Boolean)
      .join('');

    if (!bonusParagraph) {
      return html;
    }

    const expideRegex = /<(p|div|li)[^>]*>[\s\S]*?se expide[\s\S]*?<\/\1>/i;
    const bonusRegex = /<(p|div|li)[^>]*>[\s\S]*?\bprima\b(?=[\s\S]*?(porcentaje|asignaci|mensual|m\/cte|pesos))[\s\S]*?<\/\1>/gi;
    const salaryRegex = /<(p|div|li)[^>]*>[\s\S]*?(salari|asignaci)[\s\S]*?<\/\1>/gi;

    let result = html;
    const existingBonus = result.match(bonusRegex);
    if (existingBonus && existingBonus.length > 0) {
      result = result.replace(bonusRegex, '');
    }

    let lastSalaryMatch: RegExpExecArray | null = null;
    let match: RegExpExecArray | null = null;
    while ((match = salaryRegex.exec(result)) !== null) {
      lastSalaryMatch = match;
    }

    if (lastSalaryMatch && lastSalaryMatch.index !== undefined) {
      const insertAt = lastSalaryMatch.index + lastSalaryMatch[0].length;
      return `${result.slice(0, insertAt)}${bonusParagraph}${result.slice(insertAt)}`;
    }

    if (expideRegex.test(result)) {
      return result.replace(expideRegex, `${bonusParagraph}$&`);
    }

    return `${result}${bonusParagraph}`;
  }

  private resolveLaborFunctions(
    certificate: Certificate,
  ): Array<{ ordinal: number; description: string }> {
    const certificateWithFunctions = certificate as Certificate & {
      functions_snapshot?: any;
      functionsSnapshot?: any;
    };
    let snapshot =
      certificateWithFunctions.functions_snapshot ??
      certificateWithFunctions.functionsSnapshot ??
      null;
    if (typeof snapshot === 'string') {
      try {
        snapshot = JSON.parse(snapshot);
      } catch {
        return [];
      }
    }
    const rawFunctions = Array.isArray(snapshot)
      ? snapshot
      : Array.isArray(snapshot?.functions)
        ? snapshot.functions
        : [];
    const seen = new Set<string>();
    return rawFunctions
      .map((item: any, index: number) => ({
        ordinal: Math.max(1, Number(item?.ordinal ?? item?.order ?? index + 1) || index + 1),
        description: String(
          typeof item === 'string'
            ? item
            : item?.description ?? item?.text ?? item?.function ?? '',
        )
          .replace(/\u00a0/g, ' ')
          .replace(/\s+/g, ' ')
          .trim(),
      }))
      .filter((item) => {
        const key = item.description
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, ' ')
          .trim();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((left, right) => left.ordinal - right.ordinal);
  }

  private escapeHtml(value: string): string {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private buildPageFooterTemplate(): string {
    return `
      <div style="width:100%; padding:0 54pt; display:flex; align-items:center; justify-content:center; gap:5px; color:#64748b; font-family:Arial,sans-serif; font-size:7pt; line-height:1; white-space:nowrap;">
        <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
      </div>
    `;
  }

  private renderLaborFunctions(
    functions: Array<{ ordinal: number; description: string }>,
    highlightVariables = false,
  ): string {
    const list = this.renderLaborFunctionsList(functions, highlightVariables);
    if (!list) return '';
    return `<section class="labor-functions-section"><p class="labor-functions-legal-intro">Conforme lo establece <em>el Manual Espec\u00EDfico de Funciones y Competencias Laborales de los empleos de la planta de personal administrativo de la Escuela Superior de Administraci\u00F3n P\u00FAblica \u2013 ESAP -.</em></p><p class="labor-functions-title">Las funciones para el cargo de son:</p>${list}</section>`;
  }

  private renderLaborFunctionsList(
    functions: Array<{ ordinal: number; description: string }>,
    highlightVariables = false,
  ): string {
    if (!functions.length) return '';
    const items = functions
      .map((item) => {
        const description = this.escapeHtml(
          this.repairCommonMojibake(item.description),
        );
        const rendered = highlightVariables
          ? `<mark class="labor-function-preview-highlight">${description}</mark>`
          : description;
        return `<li class="labor-function-item">${rendered}</li>`;
      })
      .join('');
    return `<ol class="labor-functions-list">${items}</ol>`;
  }

  private prepareLaborFunctionsTemplate(
    html: string,
    showFunctions: boolean,
  ): string {
    return html.replace(
      /<section\b(?=[^>]*\bdata-functions-template=["']true["'])[^>]*>([\s\S]*?)<\/section>/gi,
      (_match, body: string) => (showFunctions ? body : ''),
    );
  }

  private replaceLaborFunctionsToken(
    html: string,
    functions: Array<{ ordinal: number; description: string }>,
    highlightVariables = false,
  ): { html: string; replaced: boolean } {
    const list = this.renderLaborFunctionsList(functions, highlightVariables);
    let replaced = false;
    let result = html.replace(/<p>([\s\S]*?)<\/p>/gi, (paragraph, body: string) => {
      const text = body.replace(/<[^>]+>/g, '').trim();
      if (!/^\[FUNCIONES\]$/i.test(text)) return paragraph;
      replaced = true;
      return list;
    });

    if (!replaced && /\[FUNCIONES\]/i.test(result)) {
      result = result.replace(/\[FUNCIONES\]/gi, list);
      replaced = true;
    }

    return { html: result, replaced };
  }

  private removeLaborFunctionsToken(html: string): string {
    return html
      .replace(/<p>([\s\S]*?)<\/p>/gi, (paragraph, body: string) =>
        /^\[FUNCIONES\]$/i.test(body.replace(/<[^>]+>/g, '').trim())
          ? ''
          : paragraph,
      )
      .replace(/\[FUNCIONES\]/gi, '');
  }

  private insertLaborFunctions(
    html: string,
    functions: Array<{ ordinal: number; description: string }>,
    highlightVariables = false,
  ): string {
    const section = this.renderLaborFunctions(functions, highlightVariables);
    if (!section) return html;

    const compensationRegex = /<(p|div)\b[^>]*>(?:(?!<\/\1>)[\s\S])*?(salari|asignaci|\bprima\b)(?:(?!<\/\1>)[\s\S])*?<\/\1>/i;
    const compensationMatch = compensationRegex.exec(html);
    if (compensationMatch?.index !== undefined) {
      return `${html.slice(0, compensationMatch.index)}${section}${html.slice(compensationMatch.index)}`;
    }

    const issueRegex = /<(p|div)\b[^>]*>(?:(?!<\/\1>)[\s\S])*?se expide(?:(?!<\/\1>)[\s\S])*?<\/\1>/i;
    const issueMatch = issueRegex.exec(html);
    if (issueMatch?.index !== undefined) {
      return `${html.slice(0, issueMatch.index)}${section}${html.slice(issueMatch.index)}`;
    }

    return `${html}${section}`;
  }

  private repairCommonMojibake(value: string): string {
    return String(value || '')
      .replace(/\u00c3\u0081/g, 'Á')
      .replace(/\u00c3\u0089/g, 'É')
      .replace(/\u00c3\u008d/g, 'Í')
      .replace(/\u00c3\u0093/g, 'Ó')
      .replace(/\u00c3\u009a/g, 'Ú')
      .replace(/\u00c3\u0091/g, 'Ñ')
      .replace(/\u00c3\u00a1/g, 'á')
      .replace(/\u00c3\u00a9/g, 'é')
      .replace(/\u00c3\u00ad/g, 'í')
      .replace(/\u00c3\u00b3/g, 'ó')
      .replace(/\u00c3\u00ba/g, 'ú')
      .replace(/\u00c3\u00b1/g, 'ñ')
      .replace(/\u00c2\u00bf/g, '¿')
      .replace(/\u00c2\u00a1/g, '¡');
  }

  private normalizeTechnicalBonusAmountOrder(value: string): string {
    return String(value || '')
      .replace(
        /\{valor_letras\}\s*(\(\s*\$?\s*\{valor_numerico\}\s*\))/gi,
        '$1 {valor_letras}',
      )
      .replace(
        /\{valor_letras\}\s*(\$\s*\{valor_numerico\})/gi,
        '$1 {valor_letras}',
      );
  }

  private renderTechnicalBonusParagraph(
    bonus: TechnicalBonusRenderItem,
    highlightVariables = false,
  ): string {
    const bonusValueText = this.numeroALetras(bonus.value);
    const formattedPercentage = this.formatPercentage(bonus.percentage);
    const formattedMoney = this.formatMoney(bonus.value);
    const highlight = (value: string) =>
      highlightVariables && value ? `<mark>${value}</mark>` : value;
    const customTemplate = this.normalizeTechnicalBonusAmountOrder(
      this.repairCommonMojibake(String(bonus.templateText || '').trim()),
    );

    if (customTemplate) {
      const rendered = customTemplate
        .replace(/\{porcentaje\}/g, highlight(formattedPercentage))
        .replace(/\{valor_letras\}/g, highlight(bonusValueText))
        .replace(/\{valor_numerico\}/g, highlight(formattedMoney));
      return `<p>${rendered}</p>`;
    }

    const bonusConcept = this.resolveTechnicalBonusConcept(bonus.category);
    return this.repairCommonMojibake(
      `<p>Percibe una ${bonusConcept} en un porcentaje igual al ${highlight(`(${formattedPercentage}%)`)} sobre la asignación básica mensual de ${highlight(`($${formattedMoney})`)} ${highlight(bonusValueText)} pesos m/cte.</p>`,
    );
  }

  private splitCertificateClosingContent(contentHtml: string): {
    bodyHtml: string;
    closingHtml: string;
  } {
    const html = String(contentHtml || '');
    const findIssueBlock = (tag: 'p' | 'div') => {
      const pattern = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi');
      let match: RegExpExecArray | null = null;

      while ((match = pattern.exec(html)) !== null) {
        const plainText = match[0]
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;|&#160;/gi, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .toLocaleLowerCase('es');
        if (plainText.includes('se expide')) {
          return match;
        }
      }

      return null;
    };

    const issueBlock = findIssueBlock('p') || findIssueBlock('div');
    if (!issueBlock || issueBlock.index === undefined) {
      return { bodyHtml: html, closingHtml: '' };
    }

    return {
      bodyHtml: html.slice(0, issueBlock.index).trim(),
      // Cualquier contenido institucional posterior también pertenece al cierre.
      closingHtml: html.slice(issueBlock.index).trim(),
    };
  }

  private buildHtml(params: {
    certificate: Certificate;
    contentHtml: string;
    cargoTitle: string;
    typographyFont: string;
    logoDataUrl?: string | null;
    signatureDataUrl?: string | null;
    qrCodeDataUrl?: string | null;
    signerName: string;
  }): string {
    const {
      certificate,
      contentHtml,
      cargoTitle,
      typographyFont,
      logoDataUrl,
      signatureDataUrl,
      qrCodeDataUrl,
      signerName,
    } = params;
    const closingContent = this.splitCertificateClosingContent(contentHtml);
    const effectiveTypographyFont = this.sanitizeTypographyFont(typographyFont);
    const cargoTitleHtml = (cargoTitle || '').replace(/\n/g, '<br/>');
    const logoTag = logoDataUrl
      ? `<img src="${logoDataUrl}" alt="Logo ESAP" class="logo" />`
      : '';
    const signatureTag = signatureDataUrl
      ? `<img src="${signatureDataUrl}" alt="Firma digital" class="signature" />`
      : '<div style="height:60pt;"></div>';
    const qrTag = qrCodeDataUrl
      ? `<img src="${qrCodeDataUrl}" alt="Codigo QR" class="qr-code" />`
      : '';

    return `
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="UTF-8" />
          <style>
            /*
             * La primera página conserva el encabezado original y todas las
             * hojas reservan una franja inferior exclusiva para la paginación.
             * Las continuaciones reciben además una zona segura superior.
             */
            @page { size: Letter; margin: 40px 0 56px 0; }
            @page :first { margin: 0 0 56px 0; }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 0;
              background: #ffffff;
              font-family: ${effectiveTypographyFont};
              color: #000000;
            }
            .certificate, .certificate * {
              font-family: ${effectiveTypographyFont} !important;
            }
            .certificate {
              position: relative;
              width: 816px;
              /* 1056px de la hoja menos los 56px reservados a la paginación. */
              min-height: 1000px;
              padding: 72px 72px 0 72px;
            }
            .logo {
              position: absolute;
              top: 20px;
              left: 0;
              width: auto;
              height: auto;
              max-width: 300px;
              max-height: 100px;
              object-fit: contain;
            }
            .consecutivo {
              text-align: left;
              font-size: 12pt;
              margin-top: 50pt;
              margin-bottom: 12pt;
              line-height: 1.15;
            }
            .cargo-title {
              text-align: center;
              margin: 0;
              font-size: 12pt;
              font-weight: bold;
              line-height: 1.15;
            }
            .section-title {
              text-align: center;
              font-size: 12pt;
              font-weight: bold;
              margin: 0;
            }
            .certificate-content-block p,
            .certificate-content-block div,
            .certificate-content-block li {
              margin: 0 0 12pt 0;
              text-align: justify;
              text-align-last: left;
              text-indent: 0;
              letter-spacing: normal;
            }
            .certificate-content-block p:last-child,
            .certificate-content-block div:last-child,
            .certificate-content-block li:last-child {
              margin-bottom: 0;
            }
            .certificate-content-block span {
              letter-spacing: normal;
              padding: 0;
              margin: 0;
            }
            .labor-functions-section {
              margin: 0 0 12pt 0;
            }
            .certificate-content-block .labor-functions-legal-intro {
              margin: 0 0 12pt 0;
            }
            .certificate-content-block .labor-functions-title {
              margin: 0 0 8pt 0;
              page-break-after: avoid;
              break-after: avoid;
            }
            .labor-functions-list {
              margin: 0 0 12pt 0;
              padding: 0 0 0 20pt;
              list-style-position: outside;
              list-style-type: decimal;
            }
            .certificate-content-block .labor-functions-list .labor-function-item {
              margin: 0 0 8pt 0;
              padding-left: 3pt;
              text-align: justify;
              text-align-last: left;
              line-height: 1.5;
              page-break-inside: avoid;
              break-inside: avoid;
              orphans: 3;
              widows: 3;
            }
            .certificate-content-block .labor-functions-list .labor-function-item:last-child {
              margin-bottom: 0;
            }
            .signature {
              width: auto;
              height: 60px;
              max-width: 250px;
              object-fit: contain;
              display: block;
              margin: 0 auto 12pt auto;
            }
            .certificate-signature-block {
              text-align: center;
            }
            .certificate-closing-block {
              position: relative;
              /*
               * Si el cierre salta a una hoja nueva, esta separación evita que
               * el párrafo de expedición quede pegado al margen superior. Si
               * permanece en la misma hoja, conserva una transición natural
               * respecto del último párrafo o función.
               */
              padding-top: 28px;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .certificate-signature-spacer {
              height: 48pt;
            }
            .certificate-final-footer-reserve {
              /* Mantiene fecha, firma y nombre lejos del pie institucional final. */
              height: 172px;
            }
            .signer-name {
              margin: 0;
              font-size: 12pt;
              font-weight: bold;
              line-height: 1.15;
              text-align: center;
            }
            .footer-left {
              position: absolute;
              bottom: 40px;
              left: 72px;
              width: 250px;
              font-size: 7pt;
              line-height: 1.3;
              font-family: ${effectiveTypographyFont};
            }
            .footer-right {
              position: absolute;
              bottom: 40px;
              right: 72px;
              text-align: right;
              display: flex;
              flex-direction: column;
              align-items: flex-end;
              gap: 6px;
              font-size: 12pt;
              color: #0066cc;
              font-family: ${effectiveTypographyFont};
            }
            .qr-code {
              width: 99px;
              height: 99px;
              border: 1px solid #e5e7eb;
              padding: 4px;
              background: #ffffff;
              object-fit: contain;
            }
          </style>
        </head>
        <body>
          <div class="certificate">
            ${logoTag}
            <div class="consecutivo">${certificate.certificate_number}</div>
            <div style="height:24pt;"></div>
            <div style="height:12pt;"></div>
            <div class="cargo-title">${cargoTitleHtml}</div>
            <div style="height:24pt;"></div>
            <div style="height:24pt;"></div>
            <div class="section-title">HACE CONSTAR</div>
            <div style="height:12pt;"></div>
            <div class="certificate-content-block" style="text-align: justify; line-height: 1.5; font-size: 12pt;">
              ${closingContent.bodyHtml}
            </div>
            <div class="certificate-closing-block">
              ${closingContent.closingHtml ? `<div class="certificate-content-block certificate-issue-block" style="text-align: justify; line-height: 1.5; font-size: 12pt;">${closingContent.closingHtml}</div>` : ''}
              <div class="certificate-signature-spacer"></div>
              <div class="certificate-signature-block">
                ${signatureTag}
                <p class="signer-name">${signerName}</p>
              </div>
              <div class="certificate-final-footer-reserve" aria-hidden="true"></div>
            </div>
            <div class="footer-left">
              <p style="margin:0 0 2px 0;">Sede principal</p>
              <p style="margin:0 0 2px 0;">Calle 44 # 53 - 37, CAN, Bogota D.C.</p>
              <p style="margin:0 0 2px 0;">Codigo postal: 111321</p>
              <p style="margin:0 0 2px 0;">Linea conmutador PBX: 018000 423713</p>
              <p style="margin:0;">Linea nacional gratuita PBX: 018000 423713</p>
            </div>
            <div class="footer-right">
              ${qrTag}
              <div style="font-size: 8pt; color: #0066cc; max-width: 99px; line-height: 1.4; text-align: center;">Escanee el código QR para verificar el certificado</div>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private async renderPdf(html: string): Promise<Buffer> {
    const executablePath =
      process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_PATH;
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      ...(executablePath ? { executablePath } : {}),
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdfOutput = await page.pdf({
        format: 'Letter',
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: '<div></div>',
        footerTemplate: this.buildPageFooterTemplate(),
        margin: {
          top: '0cm',
          right: '0cm',
          bottom: '0cm',
          left: '0cm',
        },
      });

      return Buffer.from(pdfOutput);
    } finally {
      await browser.close();
    }
  }

  private formatDate(value?: Date | string | null): string {
    const date = this.toSafeDate(value);
    return new Intl.DateTimeFormat('es-CO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'America/Bogota',
    }).format(date);
  }

  private toSafeDate(value?: Date | string | null): Date {
    if (!value) {
      return new Date();
    }
    if (value instanceof Date) {
      const cloned = new Date(value.getTime());
      if (
        cloned.getUTCHours() === 0 &&
        cloned.getUTCMinutes() === 0 &&
        cloned.getUTCSeconds() === 0 &&
        cloned.getUTCMilliseconds() === 0
      ) {
        cloned.setUTCHours(12, 0, 0, 0);
      }
      return cloned;
    }
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split('-').map((part) => Number(part));
      return new Date(year, month - 1, day, 12, 0, 0);
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return new Date();
    }
    if (
      parsed.getHours() === 0 &&
      parsed.getMinutes() === 0 &&
      parsed.getSeconds() === 0 &&
      parsed.getMilliseconds() === 0
    ) {
      parsed.setHours(12, 0, 0, 0);
    }
    return parsed;
  }

  private numeroALetras(num: number): string {
    const unidades = ['', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
    const especiales = [
      'diez',
      'once',
      'doce',
      'trece',
      'catorce',
      'quince',
      'dieciséis',
      'diecisiete',
      'dieciocho',
      'diecinueve',
    ];
    const decenas = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
    const veintenas = ['', 'veintiún', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve'];
    const centenas = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

    if (num === 0) return 'cero';
    if (num === 100) return 'cien';

    const convertirMenorMil = (n: number): string => {
      if (n === 0) return '';
      if (n < 10) return unidades[n];
      if (n < 20) return especiales[n - 10];
      if (n < 30) return n === 20 ? 'veinte' : veintenas[n - 20];
      if (n < 100) {
        const dec = Math.floor(n / 10);
        const uni = n % 10;
        return decenas[dec] + (uni > 0 ? ` y ${unidades[uni]}` : '');
      }
      if (n === 100) return 'cien';
      if (n < 1000) {
        const cent = Math.floor(n / 100);
        const resto = n % 100;
        return centenas[cent] + (resto > 0 ? ` ${convertirMenorMil(resto)}` : '');
      }
      return '';
    };

    let resultado = '';
    let restante = Math.floor(num);

    if (restante >= 1000000) {
      const millones = Math.floor(restante / 1000000);
      resultado += millones === 1 ? 'un millón' : `${convertirMenorMil(millones)} millones`;
      restante %= 1000000;
      if (restante > 0) resultado += ' ';
    }

    if (restante >= 1000) {
      const miles = Math.floor(restante / 1000);
      resultado += miles === 1 ? 'mil' : `${convertirMenorMil(miles)} mil`;
      restante %= 1000;
      if (restante > 0) resultado += ' ';
    }

    if (restante > 0) {
      resultado += convertirMenorMil(restante);
    }

    return resultado.trim();
  }
}

