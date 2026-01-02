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
  ): Promise<Buffer> {
    // Leer plantilla HTML
    const templateHtml = fs.readFileSync(this.templatePath, 'utf-8');

    // Imágenes de encabezado y pie
    const headerImg = this.loadImageDataUrl('img_primera.png');
    const footerImg = this.loadImageDataUrl('img_segunda.png');

    // Generar código QR
    const qrCodeDataUrl = await this.generateQRCode(
      certificate.verificationCode,
    );

    // URL de validación pública
    const validationUrl = `${process.env.FRONTEND_URL || 'https://certificados.esap.edu.co'}/validar/${certificate.verificationCode}`;

    // Formatear fecha de expedición
    const fechaExpedicion = this.formatDate(certificate.issueDate);

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
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

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
    const d = new Date(date);
    const dia = d.getDate();
    const meses = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ];
    const mes = meses[d.getMonth()];
    const año = d.getFullYear();

    return `${dia} de ${mes} de ${año}`;
  }

  /**
   * Formatear fecha en formato largo
   * Ejemplo: "30 DE SEPTIEMBRE DE 2022"
   */
  private formatDateLong(date: Date | string): string {
    const d = new Date(date);
    const dia = d.getDate();
    const meses = [
      'ENERO',
      'FEBRERO',
      'MARZO',
      'ABRIL',
      'MAYO',
      'JUNIO',
      'JULIO',
      'AGOSTO',
      'SEPTIEMBRE',
      'OCTUBRE',
      'NOVIEMBRE',
      'DICIEMBRE',
    ];
    const mes = meses[d.getMonth()];
    const año = d.getFullYear();

    return `${dia} DE ${mes} DE ${año}`;
  }
}
