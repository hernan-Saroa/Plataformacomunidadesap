import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as QRCode from 'qrcode';
import puppeteer from 'puppeteer';
import { GraduationCertificate } from './graduation-certificate.entity';

@Injectable()
export class PdfGeneratorService {
  private templatePath = this.resolveTemplatePath();

  private resolveTemplatePath(): string {
    const filename = 'certificado-graduado.html';
    const candidates = [
      path.join(__dirname, 'templates', filename),
      path.join(process.cwd(), 'src', 'graduation-certificates', 'templates', filename),
      path.join(process.cwd(), 'dist', 'graduation-certificates', 'templates', filename),
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
    // Leer plantilla HTML
    const templateHtml = fs.readFileSync(this.templatePath, 'utf-8');

    // Imágenes de encabezado y pie
    const headerImg = this.loadImageDataUrl('img_primera.png');
    const footerImg = this.loadImageDataUrl('img_segunda.png');

    // URL de validación pública
    const baseUrl = frontendBaseUrl || process.env.FRONTEND_URL || 'https://certificados.esap.edu.co';
    const validationUrl = `${baseUrl}/verificar-certificado/${certificate.verificationCode}`;

    // Generar código QR con la URL completa
    const qrCodeDataUrl = await this.generateQRCode(validationUrl);

    // Formatear fecha de expedición
    const fechaExpedicion = this.formatDate(certificate.issueDate || new Date());

    // Formatear lugar y fecha de expedición del título
    const lugarFechaExpedicion = `${certificate.campus || 'Bogotá'} (${certificate.campus?.toUpperCase() || 'BOYACÁ'}) ${this.formatDateLong(certificate.graduationDate)}`;

    // Reemplazar variables en la plantilla
    const htmlContent = templateHtml
      .replace(/{{CODIGO_VALIDACION}}/g, certificate.verificationCode)
      .replace(/{{FECHA_EXPEDICION}}/g, fechaExpedicion)
      .replace(/{{TITULO_OTORGADO}}/g, certificate.degreeTitle)
      .replace(/{{NOMBRE_COMPLETO}}/g, certificate.fullName)
      .replace(/{{NUMERO_DOCUMENTO}}/g, `CC ${certificate.idNumber}`)
      .replace(/{{LUGAR_FECHA_EXPEDICION}}/g, lugarFechaExpedicion)
      .replace(/{{REGISTRO_FOLIO}}/g, certificate.actaNumber || 'N/A')
      .replace(/{{QR_CODE_URL}}/g, qrCodeDataUrl)
      .replace(/{{URL_VALIDACION}}/g, validationUrl)
      .replace(/{{HEADER_IMG}}/g, headerImg)
      .replace(/{{FOOTER_IMG}}/g, footerImg);

    // Generar PDF con Puppeteer
    const executablePath =
      process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_PATH;
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      ...(executablePath ? { executablePath } : {}),
    });

    const page = await browser.newPage();
    // Usar 'load' o 'domcontentloaded' es mas rapido y evita timeouts si hay recursos externos lentos
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
   * Generar código QR como Data URL
   */
  private async generateQRCode(data: string): Promise<string> {
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(data, {
        width: 200,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      return qrCodeDataUrl;
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

  /**
   * Formatear fecha en formato español
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
    }).format(d).toUpperCase();
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
