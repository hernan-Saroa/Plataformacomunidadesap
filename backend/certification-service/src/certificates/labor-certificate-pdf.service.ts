import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as QRCode from 'qrcode';
import puppeteer from 'puppeteer';
import { Certificate } from './certificate.entity';
import { TemplateConfigService } from './template-config.service';

type TemplateType = 'docente' | 'administrador';
type TechnicalBonusCategory = string;

type PdfOptions = {
  includeSalary?: boolean;
  includeTechnicalBonus?: boolean;
  templateType?: TemplateType;
  publicBaseUrl?: string;
  technicalBonusTemplate?: string;
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
    templateHtml: string;
    technicalBonusTemplate?: string;
  }): string {
    const { certificate, templateType, includeSalary, includeTechnicalBonus, templateHtml, technicalBonusTemplate } = params;

    const certificateExtras = certificate as Certificate & {
      cod_cargo?: string;
      codCargo?: string;
      observations?: string;
    };
    const requestObservations =
      (certificate as Certificate & { request?: { observations?: string } }).request
        ?.observations || certificateExtras.observations || '';
    const requestDepartment =
      (certificate as Certificate & { request?: { department?: string } }).request
        ?.department || '';
    const requestPositionLocation =
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
      requestData?.position_category ||
      certificate.position_category ||
      certificate.career_category ||
      '';
    const cargoTexto =
      requestData?.career_category ||
      certificate.career_category ||
      certificate.position_category ||
      '';
    const codCargoSource = this.selectPreferredCodeValue(
      requestData?.cod_cargo,
      requestData?.['codCargo'],
      (certificate as Certificate & { cod_cargo?: string }).cod_cargo,
      (certificate as Certificate & { codCargo?: string }).codCargo,
    );
    const codGradeSource = this.selectPreferredCodeValue(
      requestData?.cod_grade,
      requestData?.['codGrade'],
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
      (certificate as Certificate & { request?: { cod_cargo?: string } }).request?.cod_cargo ||
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
      requestPositionLocation ||
      certificate.position_location ||
      '';
    const grupoVariable =
      requestPositionLocation ||
      certificate.position_location ||
      '';
    const cargoDato6 = tipoVinculacion;

    const salarioBase = this.normalizeMoneyValue(certificate.monthly_salary);
    const salarioTextoBase = certificate.salary_text || '';
    const salarioEnLetras =
      includeSalary && salarioBase ? this.numeroALetras(salarioBase) : '';

    const fechaVinculacion = this.formatDate(certificate.hiring_date);
    const fechaExpedicion = this.formatDate(certificate.issue_date || new Date());
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
      '[DATO8]': includeSalary ? (salarioTextoBase || salarioEnLetras) : '',
      '[NOMBRE_EMPLEADO]': fullName,
      '[DOCUMENTO]': documentNumber,
      '[CARGO]': cargoVariable,
      '[CARGO DATO6]': cargoDato6,
      '[TIPO_DATO]': cargoDato6,
      '[GRUPO]': grupoVariableResolved,
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

    let result = this.normalizeTemplateHtml(templateHtml || '');
    result = this.replaceVariables(result, replacements);
    result = this.normalizeSpacing(result);
    result = this.normalizeParagraphStructure(result);

    if (!includeSalary) {
      result = this.stripSalarySections(result);
    }

    if (includeTechnicalBonus) {
      const bonusBase = this.normalizeMoneyValue(certificate.technical_bonus);
      if (bonusBase > 0) {
        const bonusCategory = this.normalizeTechnicalBonusCategory(
          (certificate as Certificate & {
            technical_bonus_category?: string | null;
            request?: { technical_bonus_category?: string | null };
          }).technical_bonus_category ||
            (certificate as Certificate & {
              request?: { technical_bonus_category?: string | null };
            }).request?.technical_bonus_category,
        );
        const bonusPercentage = this.calculateTechnicalBonusPercentage(
          bonusBase,
          salarioBase,
        );
        result = this.insertTechnicalBonus(
          result,
          bonusBase,
          bonusPercentage,
          bonusCategory,
          technicalBonusTemplate,
        );
      }
    }

    return this.normalizeParagraphStructure(result);
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

  private insertTechnicalBonus(
    html: string,
    bonusValue: number,
    bonusPercentage: number,
    bonusCategory?: string | null,
    customTemplate?: string,
  ): string {
    const bonusValueText = this.numeroALetras(bonusValue);
    const formattedPercentage = this.formatPercentage(bonusPercentage);
    const formattedMoney = this.formatMoney(bonusValue);
    let bonusText: string;
    if (customTemplate) {
      const rendered = customTemplate
        .replace(/\{porcentaje\}/g, formattedPercentage)
        .replace(/\{valor_letras\}/g, bonusValueText)
        .replace(/\{valor_numerico\}/g, formattedMoney);
      bonusText = `<p>${rendered}</p>`;
    } else {
      const bonusConcept = this.resolveTechnicalBonusConcept(bonusCategory);
      bonusText = `<p>Percibe una ${bonusConcept} en un porcentaje igual al (${formattedPercentage}%) sobre la asignación básica mensual de ${bonusValueText} ($${formattedMoney}) pesos m/cte.</p>`;
    }

    const expideRegex = /<(p|div|li)[^>]*>[\s\S]*?se expide[\s\S]*?<\/\1>/i;
    const bonusRegex = /<(p|div|li)[^>]*>[\s\S]*?prima\s+(?:t(?:e|\u00e9)cnica|de\s+coordinaci(?:o|\u00f3)n|coordinaci(?:o|\u00f3)n)[\s\S]*?<\/\1>/gi;
    const salaryRegex = /<(p|div|li)[^>]*>[\s\S]*?(salari|asignaci)[\s\S]*?<\/\1>/gi;

    let result = html;
    const existingBonus = result.match(bonusRegex);
    if (existingBonus && existingBonus.length > 0) {
      result = result.replace(bonusRegex, '');
    }

    const bonusParagraph = bonusText;

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
            @page { size: Letter; margin: 0; }
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
              min-height: 1056px;
              padding: 72px;
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
            .signature {
              width: auto;
              height: 60px;
              max-width: 250px;
              object-fit: contain;
              display: block;
              margin: 0 auto 12pt auto;
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
              ${contentHtml}
            </div>
            <div style="height:48pt;"></div>
            <div style="text-align: center;">
              ${signatureTag}
              <p class="signer-name">${signerName}</p>
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
      return value;
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
      'dieciseis',
      'diecisiete',
      'dieciocho',
      'diecinueve',
    ];
    const decenas = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
    const centenas = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

    if (num === 0) return 'cero';
    if (num === 100) return 'cien';

    const convertirMenorMil = (n: number): string => {
      if (n === 0) return '';
      if (n < 10) return unidades[n];
      if (n < 20) return especiales[n - 10];
      if (n < 30) return n === 20 ? 'veinte' : `veinti${unidades[n - 20]}`;
      if (n < 100) {
        const dec = Math.floor(n / 10);
        const uni = n % 10;
        return decenas[dec] + (uni > 0 ? ` y ${unidades[uni]}` : '');
      }
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
      resultado += millones === 1 ? 'un millon' : `${convertirMenorMil(millones)} millones`;
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

