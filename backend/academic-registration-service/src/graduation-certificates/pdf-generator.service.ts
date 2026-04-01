import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import * as QRCode from 'qrcode';
import puppeteer from 'puppeteer';
import { GraduationCertificate } from './graduation-certificate.entity';
import { TemplateConfig } from './template-config.entity';
import {
  DEFAULT_GRADUATION_CERTIFICATE_TEMPLATE_TEXTS,
  GraduationCertificateTemplateSnapshot,
  GraduationCertificateTemplateTexts,
  parseGraduationCertificateTemplateSnapshot,
  parseGraduationCertificateTemplateTexts,
} from './certificate-template-texts';

@Injectable()
export class PdfGeneratorService {
  constructor(
    @InjectRepository(TemplateConfig)
    private templateConfigRepository: Repository<TemplateConfig>,
  ) {}

  private templatePath = this.resolveTemplatePath();

  private resolveTemplatePath(): string {
    const filename = 'certificado-graduado.html';
    const candidates = [
      path.join(__dirname, 'templates', filename),
      path.join(
        process.cwd(),
        'src',
        'graduation-certificates',
        'templates',
        filename,
      ),
      path.join(
        process.cwd(),
        'dist',
        'graduation-certificates',
        'templates',
        filename,
      ),
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }

    return candidates[0];
  }

  /**
   * Generar PDF del certificado de graduado
   */
  async generateCertificatePDF(
    certificate: GraduationCertificate,
    frontendBaseUrl?: string,
  ): Promise<Buffer> {
    const templateHtml = fs.readFileSync(this.templatePath, 'utf-8');
    const templateSnapshot = this.getTemplateSnapshot(certificate);
    const templateTexts =
      templateSnapshot?.texts || (await this.getTemplateTexts(certificate));

    const headerImg = this.loadImageDataUrl('img_primera.png');
    const footerImg = this.loadImageDataUrl('img_segunda.png');

    const baseUrl =
      templateSnapshot?.validationBaseUrl ||
      frontendBaseUrl ||
      process.env.FRONTEND_URL ||
      'https://certificados.esap.edu.co';
    const validationUrl = `${baseUrl}/verificar-certificado/${certificate.verificationCode}`;

    const qrCodeDataUrl = await this.generateQRCode(validationUrl);
    const fechaExpedicion = this.formatDate(
      certificate.issueDate || new Date(),
    );
    const lugarFechaExpedicion = `${certificate.campus || 'Bogota'} (${certificate.campus?.toUpperCase() || 'BOGOTA'}) ${this.formatDateLong(certificate.graduationDate)}`;

    const htmlContent = templateHtml
      .replace(/{{CODIGO_VALIDACION}}/g, certificate.verificationCode)
      .replace(
        /{{CITY_DATE_PREFIX}}/g,
        this.escapeHtml(templateTexts.cityDatePrefix),
      )
      .replace(/{{FECHA_EXPEDICION}}/g, fechaExpedicion)
      .replace(
        /{{INSTITUTION_TITLE}}/g,
        this.escapeHtml(templateTexts.institutionTitle),
      )
      .replace(
        /{{CERTIFICATE_TITLE}}/g,
        this.escapeHtml(templateTexts.certificateTitle),
      )
      .replace(/{{ADDRESSEE}}/g, this.escapeHtml(templateTexts.addressee))
      .replace(
        /{{INTRO_PARAGRAPH}}/g,
        this.formatMultilineText(templateTexts.introParagraph),
      )
      .replace(
        /{{LABEL_DEGREE_TITLE}}/g,
        this.escapeHtml(templateTexts.degreeLabel),
      )
      .replace(/{{TITULO_OTORGADO}}/g, this.escapeHtml(certificate.degreeTitle))
      .replace(
        /{{LABEL_GRADUATE_NAME}}/g,
        this.escapeHtml(templateTexts.graduateNameLabel),
      )
      .replace(/{{NOMBRE_COMPLETO}}/g, this.escapeHtml(certificate.fullName))
      .replace(
        /{{LABEL_DOCUMENT_NUMBER}}/g,
        this.escapeHtml(templateTexts.documentLabel),
      )
      .replace(/{{NUMERO_DOCUMENTO}}/g, this.escapeHtml(`CC ${certificate.idNumber}`))
      .replace(
        /{{LABEL_ISSUE_PLACE_DATE}}/g,
        this.escapeHtml(templateTexts.issuePlaceDateLabel),
      )
      .replace(
        /{{LUGAR_FECHA_EXPEDICION}}/g,
        this.escapeHtml(lugarFechaExpedicion),
      )
      .replace(
        /{{LABEL_REGISTRY}}/g,
        this.escapeHtml(templateTexts.registryLabel),
      )
      .replace(
        /{{REGISTRO_FOLIO}}/g,
        this.escapeHtml(certificate.actaNumber || 'N/A'),
      )
      .replace(
        /{{CLOSING_TEXT}}/g,
        this.formatMultilineText(templateTexts.closingText),
      )
      .replace(
        /{{SIGNER_TITLE}}/g,
        this.formatMultilineText(templateTexts.signerTitle),
      )
      .replace(/{{QR_CODE_URL}}/g, qrCodeDataUrl)
      .replace(
        /{{VALIDATION_MESSAGE}}/g,
        this.formatMultilineText(templateTexts.validationMessage),
      )
      .replace(/{{URL_VALIDACION}}/g, validationUrl)
      .replace(/{{HEADER_IMG}}/g, headerImg)
      .replace(/{{FOOTER_IMG}}/g, footerImg);

    const executablePath =
      process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_PATH;
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      ...(executablePath ? { executablePath } : {}),
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'load', timeout: 60000 });

    const pdfOutput = await page.pdf({
      format: 'Letter',
      printBackground: true,
      margin: {
        top: '0.5cm',
        right: '0.5cm',
        bottom: '0.5cm',
        left: '0.5cm',
      },
    });

    await browser.close();

    return Buffer.from(pdfOutput);
  }

  /**
   * Generar codigo QR como Data URL
   */
  private async generateQRCode(data: string): Promise<string> {
    try {
      return await QRCode.toDataURL(data, {
        width: 200,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
    } catch (error) {
      console.error('Error generando QR Code:', error);
      return '';
    }
  }

  private loadImageDataUrl(filename: string): string {
    const candidates = [
      path.join(process.cwd(), 'uploads', 'graduation-certificates', filename),
      path.join(
        process.cwd(),
        'backend',
        'academic-registration-service',
        'uploads',
        'graduation-certificates',
        filename,
      ),
      path.join(
        process.cwd(),
        'src',
        'graduation-certificates',
        'templates',
        filename,
      ),
      path.join(__dirname, 'templates', filename),
    ];

    const filePath = candidates.find((candidate) => fs.existsSync(candidate));
    if (!filePath) {
      return '';
    }

    const buffer = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
    return `data:${mime};base64,${buffer.toString('base64')}`;
  }

  private async getTemplateTexts(
    certificate: GraduationCertificate,
  ): Promise<GraduationCertificateTemplateTexts> {
    const snapshot = this.getTemplateSnapshot(certificate);
    if (snapshot?.texts) {
      return snapshot.texts;
    }

    const activeConfig = await this.templateConfigRepository.findOne({
      where: { isActive: true },
      order: { updatedAt: 'DESC', id: 'DESC' },
    });

    if (!activeConfig) {
      return DEFAULT_GRADUATION_CERTIFICATE_TEMPLATE_TEXTS;
    }

    const parsedTexts =
      parseGraduationCertificateTemplateTexts(
        activeConfig.certificateContentHtml,
      ) || DEFAULT_GRADUATION_CERTIFICATE_TEMPLATE_TEXTS;

    return {
      ...parsedTexts,
      signerTitle:
        activeConfig.signerTitleOverride || parsedTexts.signerTitle,
    };
  }

  private getTemplateSnapshot(
    certificate: GraduationCertificate,
  ): GraduationCertificateTemplateSnapshot | null {
    const certificateWithTemplate = certificate as GraduationCertificate & {
      templateSnapshot?: GraduationCertificateTemplateSnapshot | string | null;
      template_snapshot?: GraduationCertificateTemplateSnapshot | string | null;
    };
    return parseGraduationCertificateTemplateSnapshot(
      certificateWithTemplate.templateSnapshot ??
        certificateWithTemplate.template_snapshot,
    );
  }

  private escapeHtml(value: string): string {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private formatMultilineText(value: string): string {
    return this.escapeHtml(value).replace(/\r?\n/g, '<br/>');
  }

  /**
   * Formatear fecha en formato espanol
   * Ejemplo: "24 de Diciembre de 2025"
   */
  private formatDate(date: Date | string): string {
    const d = this.toSafeDate(date);
    return new Intl.DateTimeFormat('es-CO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'America/Bogota',
    }).format(d);
  }

  /**
   * Formatear fecha en formato largo
   * Ejemplo: "30 DE SEPTIEMBRE DE 2022"
   */
  private formatDateLong(date: Date | string): string {
    const d = this.toSafeDate(date);
    return new Intl.DateTimeFormat('es-CO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'America/Bogota',
    })
      .format(d)
      .toUpperCase();
  }

  private toSafeDate(value: Date | string): Date {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split('-').map((part) => Number(part));
      return new Date(year, month - 1, day, 12, 0, 0);
    }

    const d = new Date(value);
    if (
      d.getHours() === 0 &&
      d.getMinutes() === 0 &&
      d.getSeconds() === 0 &&
      d.getMilliseconds() === 0
    ) {
      d.setHours(12, 0, 0, 0);
    }
    return d;
  }
}
