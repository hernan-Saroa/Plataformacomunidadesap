import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { execFile } from 'child_process';
import { existsSync } from 'fs';
import * as fs from 'fs/promises';
import * as path from 'path';
import { promisify } from 'util';
import { buildStoredFileName, StorageService } from './storage.service';
import * as mammoth from 'mammoth';
import puppeteer from 'puppeteer';

const execFileAsync = promisify(execFile);

export interface ConvertedDocumentResult {
  documentUrl: string;
  documentName: string;
  documentType: string;
  documentSize: number;
}

@Injectable()
export class DocumentConversionService {
  private readonly logger = new Logger(DocumentConversionService.name);

  constructor(private readonly storageService: StorageService) {}

  async convertWordToPdf(
    documentUrl: string,
    preferredPdfName: string,
  ): Promise<ConvertedDocumentResult> {
    const inputFilename = path.basename(documentUrl);
    const inputPath = this.storageService.getFullPath(inputFilename);

    this.logger.log(`[Conversion] Converting document: ${documentUrl} (${inputFilename})`);

    if (!existsSync(inputPath)) {
      this.logger.error(`[Conversion] Input file not found: ${inputPath}`);
      throw new InternalServerErrorException(
        `No se encontro el documento fuente del auto: ${documentUrl}`,
      );
    }

    // Validar que sea un archivo DOCX
    const stats = await fs.stat(inputPath);
    this.logger.log(`[Conversion] File exists, size: ${stats.size} bytes`);

    if (stats.size === 0) {
      throw new InternalServerErrorException('El archivo DOCX está vacío');
    }

    if (stats.size > 50 * 1024 * 1024) { // 50MB
      throw new InternalServerErrorException('El archivo DOCX es demasiado grande (máx. 50MB)');
    }

    const outputDocumentName = preferredPdfName.toLowerCase().endsWith('.pdf')
      ? preferredPdfName
      : `${preferredPdfName}.pdf`;
    const storedPdfFilename = buildStoredFileName(outputDocumentName);
    const outputPath = this.storageService.getFullPath(storedPdfFilename);

    try {
      await this.runWordToPdfConversion(inputPath, outputPath);
      const stats = await fs.stat(outputPath);

      return {
        documentUrl: `/files/${storedPdfFilename}`,
        documentName: outputDocumentName,
        documentType: 'application/pdf',
        documentSize: stats.size,
      };
    } catch (error) {
      this.logger.error(
        `No se pudo convertir el documento ${documentUrl} a PDF`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException(
        'No fue posible convertir el documento Word del auto a PDF',
      );
    }
  }

  async getFileSize(documentUrl?: string | null): Promise<number | undefined> {
    if (!documentUrl) {
      return undefined;
    }

    try {
      const filename = path.basename(documentUrl);
      const fullPath = this.storageService.getFullPath(filename);
      const stats = await fs.stat(fullPath);
      return stats.size;
    } catch {
      return undefined;
    }
  }

  private async runWordToPdfConversion(
    inputPath: string,
    outputPath: string,
  ): Promise<void> {
    this.logger.log(`[Conversion] Starting Word to PDF conversion for: ${inputPath}`);
    const errors: string[] = [];

    // Intentar conversión con mammoth + puppeteer (más confiable)
    try {
      this.logger.log(`[Conversion] Trying Mammoth + Puppeteer...`);
      await this.convertWithMammothAndPuppeteer(inputPath, outputPath);
      this.logger.log(`[Conversion] Mammoth + Puppeteer succeeded`);
      return;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`[Conversion] Mammoth + Puppeteer failed: ${errorMsg}`);
      errors.push(`Mammoth+Puppeteer: ${errorMsg}`);
    }

    if (process.platform === 'win32') {
      try {
        this.logger.log(`[Conversion] Trying Word COM...`);
        await this.convertWithWordCom(inputPath, outputPath);
        this.logger.log(`[Conversion] Word COM succeeded`);
        return;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.error(`[Conversion] Word COM failed: ${errorMsg}`);
        errors.push(`Word COM: ${errorMsg}`);
      }
    }

    try {
      this.logger.log(`[Conversion] Trying LibreOffice...`);
      await this.convertWithLibreOffice(inputPath, outputPath);
      this.logger.log(`[Conversion] LibreOffice succeeded`);
      return;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`[Conversion] LibreOffice failed: ${errorMsg}`);
      errors.push(`LibreOffice: ${errorMsg}`);
    }

    this.logger.error(`[Conversion] All conversion methods failed. Errors: ${errors.join(' | ')}`);
    throw new Error(errors.join(' | '));
  }

  private async convertWithWordCom(
    inputPath: string,
    outputPath: string,
  ): Promise<void> {
    const escapedInput = this.escapePowerShellString(inputPath);
    const escapedOutput = this.escapePowerShellString(outputPath);
    const script = [
      "$ErrorActionPreference='Stop'",
      `$inputPath='${escapedInput}'`,
      `$outputPath='${escapedOutput}'`,
      '$word=$null',
      '$document=$null',
      'try {',
      '  $word = New-Object -ComObject Word.Application',
      '  $word.Visible = $false',
      '  $word.DisplayAlerts = 0',
      '  $document = $word.Documents.Open($inputPath, $false, $true)',
      '  $document.ExportAsFixedFormat($outputPath, 17)',
      '} finally {',
      '  if ($document -ne $null) {',
      '    $document.Close([ref]$false) | Out-Null',
      '    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($document) | Out-Null',
      '  }',
      '  if ($word -ne $null) {',
      '    $word.Quit()',
      '    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null',
      '  }',
      '  [GC]::Collect()',
      '  [GC]::WaitForPendingFinalizers()',
      '}',
    ].join('; ');

    await execFileAsync(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        script,
      ],
      {
        windowsHide: true,
        timeout: 120000,
        maxBuffer: 10 * 1024 * 1024,
      },
    );

    if (!existsSync(outputPath)) {
      throw new Error('Microsoft Word no genero el PDF de salida');
    }
  }

  private async convertWithLibreOffice(
    inputPath: string,
    outputPath: string,
  ): Promise<void> {
    const outputDir = path.dirname(outputPath);
    const tempInputPath = path.join(
      outputDir,
      `${path.parse(outputPath).name}${path.extname(inputPath)}`,
    );
    const generatedPdfPath = path.join(
      outputDir,
      `${path.parse(tempInputPath).name}.pdf`,
    );
    const candidates =
      process.platform === 'win32'
        ? [
            'soffice.exe',
            'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
            'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
          ]
        : ['soffice', 'libreoffice'];

    await fs.copyFile(inputPath, tempInputPath);

    try {
      let lastError: unknown;

      for (const candidate of candidates) {
        try {
          await execFileAsync(
            candidate,
            [
              '--headless',
              '--convert-to',
              'pdf:writer_pdf_Export',
              '--outdir',
              outputDir,
              tempInputPath,
            ],
            {
              windowsHide: true,
              timeout: 120000,
              maxBuffer: 10 * 1024 * 1024,
            },
          );

          if (!existsSync(generatedPdfPath)) {
            continue;
          }

          if (generatedPdfPath !== outputPath) {
            await fs.rename(generatedPdfPath, outputPath);
          }

          return;
        } catch (error) {
          lastError = error;
        }
      }

      throw lastError instanceof Error
        ? lastError
        : new Error('LibreOffice no genero el PDF de salida');
    } finally {
      await fs.unlink(tempInputPath).catch(() => undefined);
      if (generatedPdfPath !== outputPath) {
        await fs.unlink(generatedPdfPath).catch(() => undefined);
      }
    }
  }

  private async convertWithMammothAndPuppeteer(
    inputPath: string,
    outputPath: string,
  ): Promise<void> {
    let browser;
    try {
      this.logger.log(`[Mammoth] Starting conversion: ${inputPath} -> ${outputPath}`);

      // Verificar que el archivo existe
      if (!existsSync(inputPath)) {
        throw new Error(`Input file does not exist: ${inputPath}`);
      }

      // Leer el archivo DOCX
      this.logger.log(`[Mammoth] Reading DOCX file...`);
      const docxBuffer = await fs.readFile(inputPath);
      this.logger.log(`[Mammoth] File size: ${docxBuffer.length} bytes`);

      // Convertir DOCX a HTML usando Mammoth
      this.logger.log(`[Mammoth] Converting DOCX to HTML...`);
      const result = await mammoth.convertToHtml({ buffer: docxBuffer });
      const htmlContent = result.value;

      if (result.messages && result.messages.length > 0) {
        this.logger.warn(`[Mammoth] Conversion messages:`, result.messages);
      }

      this.logger.log(`[Mammoth] HTML content length: ${htmlContent.length}`);

      // Crear HTML completo con estilos básicos
      const fullHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: 'Times New Roman', Times, serif;
              font-size: 12pt;
              line-height: 1.5;
              margin: 2cm;
            }
            .mammoth-style-wrapper {
              max-width: 100%;
            }
            /* Estilos adicionales para mejor compatibilidad */
            p { margin: 0 0 10pt 0; }
            table { border-collapse: collapse; width: 100%; }
            td, th { border: 1px solid #000; padding: 4pt; }
          </style>
        </head>
        <body>
          <div class="mammoth-style-wrapper">
            ${htmlContent}
          </div>
        </body>
        </html>
      `;

      // Convertir HTML a PDF usando puppeteer
      this.logger.log(`[Mammoth] Launching Puppeteer...`);
      browser = await puppeteer.launch({
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      });

      this.logger.log(`[Mammoth] Creating page and setting content...`);
      const page = await browser.newPage();
      await page.setContent(fullHtml, { waitUntil: 'networkidle0' });

      // Generar PDF
      this.logger.log(`[Mammoth] Generating PDF...`);
      await page.pdf({
        path: outputPath,
        format: 'A4',
        printBackground: true,
        margin: {
          top: '2cm',
          right: '2cm',
          bottom: '2cm',
          left: '2cm'
        }
      });

      this.logger.log(`[Mammoth] PDF generated successfully at: ${outputPath}`);

    } catch (error) {
      this.logger.error(`[Mammoth] Conversion failed:`, error);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  private escapePowerShellString(value: string): string {
    return value.replace(/'/g, "''");
  }
}
