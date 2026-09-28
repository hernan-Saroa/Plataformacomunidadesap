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
import JSZip from 'jszip';

const execFileAsync = promisify(execFile);

export interface ConvertedDocumentResult {
  documentUrl: string;
  documentName: string;
  documentType: string;
  documentSize: number;
  placeholdersReplaced?: string[];
}

interface WordPlaceholderReplacement {
  marker: string;
  value: string;
}

export interface ExtractedImageItem {
  src: string;
  target: string;
  rId: string;
  cx?: number;
  cy?: number;
  widthCm?: number;
  heightCm?: number;
  isBanner: boolean;
  behindDoc: boolean;
  align?: 'left' | 'center' | 'right';
}

export interface ConvertWordToPdfOptions {
  autoConfigTipo?: string;
}

export interface HeaderFooterContent {
  images: ExtractedImageItem[];
  textBlocks: string[];
}

@Injectable()
export class DocumentConversionService {
  private readonly logger = new Logger(DocumentConversionService.name);

  constructor(private readonly storageService: StorageService) {}

  async convertWordToPdf(
    documentUrl: string,
    preferredPdfName: string,
    replacements: WordPlaceholderReplacement[] = [],
    options: ConvertWordToPdfOptions = {},
  ): Promise<ConvertedDocumentResult> {
    const inputFilename = path.basename(decodeURIComponent(documentUrl));
    const inputPath = this.storageService.getFullPath(documentUrl);

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

    let conversionInputPath = inputPath;
    let replacedMarkers: string[] = [];

    try {
      if (replacements.length > 0 && inputFilename.toLowerCase().endsWith('.docx')) {
        const preparedDocument = await this.createDocxWithReplacements(
          inputPath,
          replacements,
        );

        conversionInputPath = preparedDocument.path;
        replacedMarkers = preparedDocument.replacedMarkers;
      }

      const conversionReplacedMarkers = await this.runWordToPdfConversion(
        conversionInputPath,
        outputPath,
        replacements,
        options,
      );
      replacedMarkers = Array.from(
        new Set([...replacedMarkers, ...conversionReplacedMarkers]),
      );
      const stats = await fs.stat(outputPath);

      return {
        documentUrl: `/files/${storedPdfFilename}`,
        documentName: outputDocumentName,
        documentType: 'application/pdf',
        documentSize: stats.size,
        placeholdersReplaced: replacedMarkers,
      };
    } catch (error) {
      this.logger.error(
        `No se pudo convertir el documento ${documentUrl} a PDF`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException(
        'No fue posible convertir el documento Word del auto a PDF',
      );
    } finally {
      if (conversionInputPath !== inputPath) {
        await fs.unlink(conversionInputPath).catch(() => undefined);
      }
    }
  }

  async getFileSize(documentUrl?: string | null): Promise<number | undefined> {
    if (!documentUrl) {
      return undefined;
    }

    try {
      const fullPath = this.storageService.getFullPath(documentUrl);
      const stats = await fs.stat(fullPath);
      return stats.size;
    } catch {
      return undefined;
    }
  }

  private async runWordToPdfConversion(
    inputPath: string,
    outputPath: string,
    replacements: WordPlaceholderReplacement[] = [],
    options: ConvertWordToPdfOptions = {},
  ): Promise<string[]> {
    this.logger.log(`[Conversion] Starting Word to PDF conversion for: ${inputPath}`);
    const errors: string[] = [];

    // Intentar conversión con mammoth + puppeteer (más confiable)
    try {
      this.logger.log(`[Conversion] Trying Mammoth + Puppeteer...`);
      const replacedMarkers = await this.convertWithMammothAndPuppeteer(
        inputPath,
        outputPath,
        replacements,
        options,
      );
      this.logger.log(`[Conversion] Mammoth + Puppeteer succeeded`);
      return replacedMarkers;
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
        return [];
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
      return [];
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
    replacements: WordPlaceholderReplacement[] = [],
    options: ConvertWordToPdfOptions = {},
  ): Promise<string[]> {
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
      const htmlReplacementResult = this.replaceHtmlTextPlaceholders(
        result.value,
        replacements,
      );
      const htmlContent = htmlReplacementResult.html;

      if (result.messages && result.messages.length > 0) {
        this.logger.warn(`[Mammoth] Conversion messages:`, result.messages);
      }

      this.logger.log(`[Mammoth] HTML content length: ${htmlContent.length}`);

      // Extraer encabezado y pie de página preservando dimensiones y metadatos de imágenes
      const headerContent = await this.extractHeaderContent(inputPath);
      const footerContent = await this.extractFooterContent(inputPath);

      const hasHeader =
        headerContent.images.length > 0 || headerContent.textBlocks.length > 0;
      const hasFooter =
        footerContent.images.length > 0 || footerContent.textBlocks.length > 0;

      const headerTemplate = this.buildHeaderTemplate(headerContent);
      const footerTemplate = this.buildFooterTemplate(footerContent);

      // Calcular márgenes dinámicos y proporcionales con margen de seguridad garantizado
      // Si hay banner de encabezado se necesitan 3.8cm; con logo o texto simple basta 3.0cm
      const topMargin = hasHeader
        ? headerContent.images.some((i) => i.isBanner)
          ? '3.8cm'
          : '3.0cm'
        : '2.2cm';

      // Para el pie de página, si hay banner o múltiples líneas de contacto basta 3.4cm; con pie simple 2.8cm
      const bottomMargin = hasFooter
        ? headerContent.images.some((i) => i.isBanner) ||
          footerContent.images.some((i) => i.isBanner) ||
          footerContent.textBlocks.length > 2
          ? '3.4cm'
          : '2.8cm'
        : '2.2cm';

      // Crear HTML completo con estilos limpios y protección para imágenes del cuerpo
      const fullHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            @page {
              size: A4;
            }
            *, *:before, *:after {
              box-sizing: border-box;
            }
            body {
              font-family: 'Times New Roman', Times, serif;
              font-size: 12pt;
              line-height: 1.4;
              margin: 0;
              padding: 0;
              color: #000;
              word-wrap: break-word;
              overflow-wrap: break-word;
            }
            .mammoth-style-wrapper {
              max-width: 100%;
            }
            p { 
              margin: 0 0 8pt 0; 
              text-align: justify;
              orphans: 2;
              widows: 2;
            }
            h1, h2, h3, h4, h5, h6 {
              page-break-after: avoid;
              break-after: avoid;
            }
            table { 
              border-collapse: collapse; 
              width: 100%; 
              page-break-inside: auto;
            }
            tr { 
              page-break-inside: avoid; 
              break-inside: avoid; 
            }
            td, th { 
              border: 1px solid #000; 
              padding: 4pt; 
            }
            img { 
              max-width: 100%; 
              height: auto; 
              object-fit: contain; 
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .signature-block, .signature-container, .firma-block {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
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
          '--disable-gpu',
        ],
      });

      this.logger.log(`[Mammoth] Creating page and setting content...`);
      const page = await browser.newPage();
      await page.setContent(fullHtml, { waitUntil: 'networkidle0' });

      // Generar PDF con encabezado y pie de página controlados
      this.logger.log(`[Mammoth] Generating PDF...`);
      await page.pdf({
        path: outputPath,
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: hasHeader || hasFooter,
        headerTemplate,
        footerTemplate,
        margin: {
          top: topMargin,
          right: '2cm',
          bottom: bottomMargin,
          left: '2cm',
        },
      });

      this.logger.log(`[Mammoth] PDF generated successfully at: ${outputPath}`);
      return htmlReplacementResult.replacedMarkers;
    } catch (error) {
      this.logger.error(`[Mammoth] Conversion failed:`, error);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Construye la plantilla HTML del encabezado para la exportación a PDF.
   * Soporta tanto el objeto estructurado HeaderFooterContent como llamadas con strings HTML.
   */
  buildHeaderTemplate(
    headerInput: HeaderFooterContent | string,
    headerTextHtml?: string,
  ): string {
    // Modo de compatibilidad hacia atrás si se reciben cadenas HTML
    if (typeof headerInput === 'string') {
      const headerImagesHtml = headerInput;
      const textHtml = headerTextHtml || '';
      const hasHeader = Boolean(headerImagesHtml || textHtml);
      if (!hasHeader) {
        return '<div></div>';
      }

      const headerBodyHtml = headerImagesHtml
        ? `<div style="position:relative; width:100%;">${headerImagesHtml}${
            textHtml
              ? `<div style="position:absolute; left:0; top:8px; width:100%; padding:0 2cm; box-sizing:border-box;">${textHtml}</div>`
              : ''
          }</div>`
        : `<div style="padding:0 2cm; box-sizing:border-box;">${textHtml}</div>`;

      return `<div style="width:100%; -webkit-print-color-adjust:exact; overflow:hidden;">${headerBodyHtml}</div>`;
    }

    const { images, textBlocks } = headerInput;
    if (images.length === 0 && textBlocks.length === 0) {
      return '<div></div>';
    }

    const banners = images.filter((img) => img.isBanner);
    const nonBanners = images.filter((img) => !img.isBanner);

    let bannerHtml = '';
    if (banners.length > 0) {
      bannerHtml = banners
        .map(
          (b) =>
            `<img src="${b.src}" style="display:block; width:100%; max-height:3.2cm; object-fit:contain;" />`,
        )
        .join('');
    }

    let iconsHtml = '';
    if (nonBanners.length > 0) {
      iconsHtml = `<div style="display:flex; align-items:center; gap:12px; padding:0 2cm; box-sizing:border-box; width:100%;">
        ${nonBanners
          .map((img) => {
            const w = img.widthCm
              ? `${Math.min(img.widthCm, 7).toFixed(2)}cm`
              : 'auto';
            const h = img.heightCm
              ? `${Math.min(img.heightCm, 2.5).toFixed(2)}cm`
              : '2.2cm';
            return `<img src="${img.src}" style="display:inline-block; width:${w}; max-height:${h}; height:auto; object-fit:contain;" />`;
          })
          .join('')}
      </div>`;
    }

    let textHtml = '';
    if (textBlocks.length > 0) {
      textHtml = `<div style="padding:2px 2cm; box-sizing:border-box; text-align:center; font-size:8pt; line-height:1.2;">
        ${textBlocks.map((t) => `<div>${this.escapeHtmlText(t)}</div>`).join('')}
      </div>`;
    }

    if (bannerHtml) {
      return `<div style="width:100%; -webkit-print-color-adjust:exact; overflow:hidden;">
        <div style="position:relative; width:100%;">
          ${bannerHtml}
          ${textHtml ? `<div style="position:absolute; left:0; top:6px; width:100%;">${textHtml}</div>` : ''}
          ${iconsHtml ? `<div style="position:absolute; left:0; top:6px; width:100%;">${iconsHtml}</div>` : ''}
        </div>
      </div>`;
    }

    return `<div style="width:100%; -webkit-print-color-adjust:exact; overflow:hidden;">
      ${iconsHtml}
      ${textHtml}
    </div>`;
  }

  /**
   * Construye la plantilla HTML del pie de página para la exportación a PDF.
   * Soporta tanto el objeto estructurado HeaderFooterContent como llamadas con strings HTML.
   */
  buildFooterTemplate(
    footerInput: HeaderFooterContent | string,
    footerTextHtml?: string,
  ): string {
    // Modo de compatibilidad hacia atrás si se reciben cadenas HTML
    if (typeof footerInput === 'string') {
      const footerImagesHtml = footerInput;
      const textHtml = footerTextHtml || '';
      const hasFooter = Boolean(footerImagesHtml || textHtml);
      if (!hasFooter) {
        return '<div></div>';
      }

      const footerPageNumberHtml =
        '<div style="text-align:center; font-size:7pt; line-height:1.2; margin-bottom:2px; color:#555;">Página <span class="pageNumber"></span> de <span class="totalPages"></span></div>';

      const footerBodyHtml = footerImagesHtml
        ? `<div style="position:relative; width:100%;">${footerImagesHtml}<div style="position:absolute; left:0; top:4px; width:100%; padding:0 2cm; box-sizing:border-box;">${textHtml}</div></div>`
        : `<div style="padding:0 2cm; box-sizing:border-box;">${textHtml}</div>`;

      return `<div style="width:100%; font-size:7pt; -webkit-print-color-adjust:exact; padding-bottom:2mm;">${footerPageNumberHtml}${footerBodyHtml}</div>`;
    }

    const { images, textBlocks } = footerInput;
    if (images.length === 0 && textBlocks.length === 0) {
      return '<div></div>';
    }

    const banners = images.filter((img) => img.isBanner);
    const nonBanners = images.filter((img) => !img.isBanner);

    const pageNumberHtml = `<div style="text-align:right; font-size:7pt; color:#444; margin-bottom:2px;">
      Página <span class="pageNumber"></span> de <span class="totalPages"></span>
    </div>`;

    let bannerHtml = '';
    if (banners.length > 0) {
      bannerHtml = banners
        .map(
          (b) =>
            `<img src="${b.src}" style="display:block; width:100%; max-height:1.8cm; object-fit:contain;" />`,
        )
        .join('');
    }

    let iconsHtml = '';
    if (nonBanners.length > 0) {
      iconsHtml = `<div style="display:flex; align-items:center; justify-content:flex-end; gap:8px; flex-wrap:wrap;">
        ${nonBanners
          .map((img) => {
            const w = img.widthCm
              ? `${Math.min(img.widthCm, 4.5).toFixed(2)}cm`
              : 'auto';
            const h = img.heightCm
              ? `${Math.min(img.heightCm, 1.6).toFixed(2)}cm`
              : '1.4cm';
            return `<img src="${img.src}" style="display:inline-block; width:${w}; max-height:${h}; height:auto; object-fit:contain;" />`;
          })
          .join('')}
      </div>`;
    }

    let textHtml = '';
    if (textBlocks.length > 0) {
      textHtml = `<div style="text-align:left; font-size:7pt; line-height:1.2; color:#333;">
        ${textBlocks.map((t) => `<div>${this.escapeHtmlText(t)}</div>`).join('')}
      </div>`;
    }

    // Caso 1: Tiene un banner de fondo (como la plantilla institucional ESAP con "www.esap.edu.co" a la derecha)
    if (bannerHtml) {
      return `<div style="width:100%; font-size:7pt; -webkit-print-color-adjust:exact; padding-bottom:2mm;">
        <div style="padding:0 2cm; box-sizing:border-box;">${pageNumberHtml}</div>
        <div style="position:relative; width:100%;">
          ${bannerHtml}
          <div style="position:absolute; left:0; top:2px; width:100%; padding:0 2cm; box-sizing:border-box; display:flex; justify-content:space-between; align-items:flex-end;">
            <div>${textHtml}</div>
            <div>${iconsHtml}</div>
          </div>
        </div>
      </div>`;
    }

    // Caso 2: Sin banner de fondo, pero con íconos o texto institucional
    return `<div style="width:100%; font-size:7pt; -webkit-print-color-adjust:exact; padding:0 2cm 2mm 2cm; box-sizing:border-box;">
      ${pageNumberHtml}
      <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
        <div style="flex:1;">${textHtml}</div>
        ${iconsHtml ? `<div>${iconsHtml}</div>` : ''}
      </div>
    </div>`;
  }

  private escapePowerShellString(value: string): string {
    return value.replace(/'/g, "''");
  }

  private async extractHeaderContent(
    inputPath: string,
  ): Promise<HeaderFooterContent> {
    return this.extractPartContent(inputPath, /^word\/header\d*\.xml$/i);
  }

  private async extractFooterContent(
    inputPath: string,
  ): Promise<HeaderFooterContent> {
    return this.extractPartContent(inputPath, /^word\/footer\d*\.xml$/i);
  }

  private async extractPartContent(
    inputPath: string,
    partRegex: RegExp,
  ): Promise<HeaderFooterContent> {
    try {
      const docxBuffer = await fs.readFile(inputPath);
      const zip = await JSZip.loadAsync(docxBuffer);

      const matchingFiles = Object.keys(zip.files).filter((fileName) =>
        partRegex.test(fileName),
      );

      const images: ExtractedImageItem[] = [];
      const textBlocks: string[] = [];
      const seenMediaPaths = new Set<string>();
      const seenText = new Set<string>();

      for (const xmlFile of matchingFiles) {
        const partXml = await zip.file(xmlFile)?.async('string');
        if (!partXml) {
          continue;
        }

        const relsPath = `word/_rels/${path.basename(xmlFile)}.rels`;
        const relsXml = await zip.file(relsPath)?.async('string');
        const relsMap = new Map<string, string>();
        if (relsXml) {
          const relRegex =
            /<Relationship\b[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"[^>]*\/?>/g;
          let relMatch: RegExpExecArray | null;
          while ((relMatch = relRegex.exec(relsXml)) !== null) {
            relsMap.set(relMatch[1], relMatch[2]);
          }
        }

        // 1. Extraer imágenes de DrawingML (<w:drawing>)
        const drawingRegex = /<w:drawing\b[^>]*>([\s\S]*?)<\/w:drawing>/g;
        let drawingMatch: RegExpExecArray | null;

        while ((drawingMatch = drawingRegex.exec(partXml)) !== null) {
          const dXml = drawingMatch[1];
          const blipMatch = /<a:blip\b[^>]*r:embed="([^"]+)"/g.exec(dXml);
          if (!blipMatch) {
            continue;
          }

          const rId = blipMatch[1];
          const target = relsMap.get(rId);
          if (!target) {
            continue;
          }

          const mediaPath = path.posix.normalize(`word/${target}`);
          if (seenMediaPaths.has(mediaPath)) {
            continue;
          }
          seenMediaPaths.add(mediaPath);

          const mediaFile = zip.file(mediaPath);
          if (!mediaFile) {
            continue;
          }

          const mimeType = this.getImageMimeType(mediaPath);
          if (!mimeType) {
            this.logger.warn(
              `[Conversion] Imagen con formato no soportado para vista web: ${mediaPath}`,
            );
            continue;
          }

          const mediaBuffer = await mediaFile.async('nodebuffer');
          const extMatch =
            /<wp:extent\b[^>]*cx="(\d+)"\b[^>]*cy="(\d+)"/g.exec(dXml) ||
            /<a:ext\b[^>]*cx="(\d+)"\b[^>]*cy="(\d+)"/g.exec(dXml);

          const cx = extMatch ? parseInt(extMatch[1], 10) : undefined;
          const cy = extMatch ? parseInt(extMatch[2], 10) : undefined;

          let widthCm = cx ? cx / 360000 : undefined;
          let heightCm = cy ? cy / 360000 : undefined;

          // Fallback a dimensiones del buffer si no vienen en XML
          if (!widthCm || !heightCm) {
            const dims = this.parseImageDimensionsFromBuffer(mediaBuffer);
            if (dims) {
              widthCm = (dims.width / 96) * 2.54;
              heightCm = (dims.height / 96) * 2.54;
            }
          }

          const behindDoc = /behindDoc="1"/i.test(dXml);

          let align: 'left' | 'center' | 'right' = 'left';
          if (/<wp:align\b[^>]*>right<\/wp:align>/i.test(dXml)) {
            align = 'right';
          } else if (/<wp:align\b[^>]*>center<\/wp:align>/i.test(dXml)) {
            align = 'center';
          }

          const isBanner = Boolean(
            (widthCm && widthCm >= 15.0) ||
              (widthCm &&
                heightCm &&
                widthCm / heightCm >= 3.5 &&
                widthCm >= 12.0),
          );

          images.push({
            src: `data:${mimeType};base64,${mediaBuffer.toString('base64')}`,
            target: mediaPath,
            rId,
            cx,
            cy,
            widthCm,
            heightCm,
            isBanner,
            behindDoc,
            align,
          });
        }

        // 2. Extraer imágenes VML heredadas (<w:pict>)
        const vmlRegex = /<v:shape\b[^>]*>([\s\S]*?)<\/v:shape>/g;
        let vmlMatch: RegExpExecArray | null;

        while ((vmlMatch = vmlRegex.exec(partXml)) !== null) {
          const vXml = vmlMatch[0];
          const imgMatch = /<v:imagedata\b[^>]*r:id="([^"]+)"/g.exec(vXml);
          if (!imgMatch) {
            continue;
          }

          const rId = imgMatch[1];
          const target = relsMap.get(rId);
          if (!target) {
            continue;
          }

          const mediaPath = path.posix.normalize(`word/${target}`);
          if (seenMediaPaths.has(mediaPath)) {
            continue;
          }
          seenMediaPaths.add(mediaPath);

          const mediaFile = zip.file(mediaPath);
          if (!mediaFile) {
            continue;
          }

          const mimeType = this.getImageMimeType(mediaPath);
          if (!mimeType) {
            continue;
          }

          const mediaBuffer = await mediaFile.async('nodebuffer');
          const styleMatch = /style="([^"]+)"/i.exec(vXml);
          let widthCm: number | undefined;
          let heightCm: number | undefined;

          if (styleMatch) {
            const style = styleMatch[1];
            const wMatch = /width:\s*([\d.]+)(pt|in|cm|px)/i.exec(style);
            const hMatch = /height:\s*([\d.]+)(pt|in|cm|px)/i.exec(style);

            if (wMatch) {
              const val = parseFloat(wMatch[1]);
              const unit = wMatch[2].toLowerCase();
              if (unit === 'pt') widthCm = (val * 2.54) / 72;
              else if (unit === 'in') widthCm = val * 2.54;
              else if (unit === 'cm') widthCm = val;
              else if (unit === 'px') widthCm = (val * 2.54) / 96;
            }

            if (hMatch) {
              const val = parseFloat(hMatch[1]);
              const unit = hMatch[2].toLowerCase();
              if (unit === 'pt') heightCm = (val * 2.54) / 72;
              else if (unit === 'in') heightCm = val * 2.54;
              else if (unit === 'cm') heightCm = val;
              else if (unit === 'px') heightCm = (val * 2.54) / 96;
            }
          }

          if (!widthCm || !heightCm) {
            const dims = this.parseImageDimensionsFromBuffer(mediaBuffer);
            if (dims) {
              widthCm = (dims.width / 96) * 2.54;
              heightCm = (dims.height / 96) * 2.54;
            }
          }

          const isBanner = Boolean(
            (widthCm && widthCm >= 15.0) ||
              (widthCm &&
                heightCm &&
                widthCm / heightCm >= 3.5 &&
                widthCm >= 12.0),
          );

          images.push({
            src: `data:${mimeType};base64,${mediaBuffer.toString('base64')}`,
            target: mediaPath,
            rId,
            widthCm,
            heightCm,
            isBanner,
            behindDoc: false,
            align: 'left',
          });
        }

        // 3. Extraer párrafos de texto (excluyendo números de página aislados)
        const paragraphRegex = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g;
        let paragraphMatch: RegExpExecArray | null;

        while ((paragraphMatch = paragraphRegex.exec(partXml)) !== null) {
          const paragraphXml = paragraphMatch[1];
          const textRegex = /<w:t\b[^>]*>([^<]*)<\/w:t>/g;
          let textMatch: RegExpExecArray | null;
          let paragraphText = '';

          while ((textMatch = textRegex.exec(paragraphXml)) !== null) {
            paragraphText += textMatch[1];
          }

          const decodedText = this.decodeXmlEntities(paragraphText).trim();
          if (!decodedText) {
            continue;
          }

          // Evitar duplicación de números de página que Puppeteer inyecta dinámicamente
          if (
            /^p[áa]gina\s*\d*\s*de\s*\d*$/i.test(decodedText) ||
            /^\d+\s*de\s*\d+$/i.test(decodedText)
          ) {
            continue;
          }

          if (!seenText.has(decodedText)) {
            seenText.add(decodedText);
            textBlocks.push(decodedText);
          }
        }
      }

      return { images, textBlocks };
    } catch (error) {
      this.logger.warn(
        `[Conversion] No se pudo extraer el contenido del documento (${partRegex}): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return { images: [], textBlocks: [] };
    }
  }

  private parseImageDimensionsFromBuffer(
    buffer: Buffer,
  ): { width: number; height: number } | null {
    try {
      // Detección PNG (IHDR chunk en bytes 16 a 24)
      if (
        buffer.length > 24 &&
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47
      ) {
        const width = buffer.readUInt32BE(16);
        const height = buffer.readUInt32BE(20);
        return { width, height };
      }

      // Detección JPEG (Marcadores SOF0/SOF2)
      if (buffer.length > 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
        let offset = 2;
        while (offset < buffer.length) {
          if (buffer[offset] !== 0xff) break;
          const marker = buffer[offset + 1];
          if (marker === 0xc0 || marker === 0xc2) {
            const height = buffer.readUInt16BE(offset + 5);
            const width = buffer.readUInt16BE(offset + 7);
            return { width, height };
          }
          const len = buffer.readUInt16BE(offset + 2);
          offset += 2 + len;
        }
      }
    } catch {
      // ignore
    }
    return null;
  }


  private decodeXmlEntities(value: string): string {
    return value
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&');
  }

  private getImageMimeType(fileName: string): string | null {
    const ext = path.extname(fileName).toLowerCase();

    switch (ext) {
      case '.png':
        return 'image/png';
      case '.jpg':
      case '.jpeg':
        return 'image/jpeg';
      case '.gif':
        return 'image/gif';
      case '.bmp':
        return 'image/bmp';
      case '.svg':
        return 'image/svg+xml';
      default:
        // Formatos como .emf/.wmf (metarchivos de Windows) no son renderizables
        // como <img> en un navegador/Chromium headless.
        return null;
    }
  }

  private async createDocxWithReplacements(
    inputPath: string,
    replacements: WordPlaceholderReplacement[],
  ): Promise<{ path: string; replacedMarkers: string[] }> {
    const docxBuffer = await fs.readFile(inputPath);
    const zip = await JSZip.loadAsync(docxBuffer);
    const replacedMarkers = new Set<string>();
    const xmlFiles = Object.keys(zip.files).filter((fileName) =>
      /^word\/.*\.xml$/i.test(fileName),
    );

    for (const fileName of xmlFiles) {
      const file = zip.file(fileName);
      if (!file) {
        continue;
      }

      let xml = await file.async('string');
      let changed = false;

      for (const replacement of replacements) {
        const replacedXml = this.replaceWordTextPlaceholder(
          xml,
          replacement.marker,
          replacement.value,
        );

        if (replacedXml !== xml) {
          xml = replacedXml;
          changed = true;
          replacedMarkers.add(replacement.marker);
        }
      }

      if (changed) {
        zip.file(fileName, xml);
      }
    }

    if (replacedMarkers.size === 0) {
      return { path: inputPath, replacedMarkers: [] };
    }

    const outputPath = path.join(
      path.dirname(inputPath),
      `${path.parse(inputPath).name}-prepared-${Date.now()}.docx`,
    );
    const outputBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    await fs.writeFile(outputPath, outputBuffer);

    return { path: outputPath, replacedMarkers: Array.from(replacedMarkers) };
  }

  private replaceWordTextPlaceholder(
    xml: string,
    marker: string,
    value: string,
  ): string {
    const textNodeRegex = /<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g;
    const textNodes: Array<{
      contentStart: number;
      contentEnd: number;
      text: string;
      fullStart: number;
      fullEnd: number;
    }> = [];

    let fullText = '';
    let match: RegExpExecArray | null;

    while ((match = textNodeRegex.exec(xml)) !== null) {
      const contentStart = match.index + match[0].indexOf(match[1]);
      const contentEnd = contentStart + match[1].length;
      const fullStart = fullText.length;
      fullText += match[1];
      textNodes.push({
        contentStart,
        contentEnd,
        text: match[1],
        fullStart,
        fullEnd: fullText.length,
      });
    }

    const occurrences: number[] = [];
    let searchFrom = 0;
    let markerIndex = fullText.indexOf(marker, searchFrom);

    while (markerIndex !== -1) {
      occurrences.push(markerIndex);
      searchFrom = markerIndex + marker.length;
      markerIndex = fullText.indexOf(marker, searchFrom);
    }

    if (occurrences.length === 0) {
      return xml;
    }

    const escapedValue = this.escapeXmlText(value);
    const updates: Array<{ start: number; end: number; text: string }> = [];

    for (const occurrenceStart of occurrences) {
      const occurrenceEnd = occurrenceStart + marker.length;
      const startNodeIndex = textNodes.findIndex(
        (node) =>
          occurrenceStart >= node.fullStart && occurrenceStart < node.fullEnd,
      );
      const endNodeIndex = textNodes.findIndex(
        (node) => occurrenceEnd > node.fullStart && occurrenceEnd <= node.fullEnd,
      );

      if (startNodeIndex === -1 || endNodeIndex === -1) {
        continue;
      }

      const startNode = textNodes[startNodeIndex];
      const endNode = textNodes[endNodeIndex];
      const startOffset = occurrenceStart - startNode.fullStart;
      const endOffset = occurrenceEnd - endNode.fullStart;

      if (startNodeIndex === endNodeIndex) {
        updates.push({
          start: startNode.contentStart,
          end: startNode.contentEnd,
          text:
            startNode.text.slice(0, startOffset) +
            escapedValue +
            startNode.text.slice(endOffset),
        });
        continue;
      }

      updates.push({
        start: startNode.contentStart,
        end: startNode.contentEnd,
        text: startNode.text.slice(0, startOffset) + escapedValue,
      });

      for (let index = startNodeIndex + 1; index < endNodeIndex; index += 1) {
        updates.push({
          start: textNodes[index].contentStart,
          end: textNodes[index].contentEnd,
          text: '',
        });
      }

      updates.push({
        start: endNode.contentStart,
        end: endNode.contentEnd,
        text: endNode.text.slice(endOffset),
      });
    }

    return updates
      .sort((a, b) => b.start - a.start)
      .reduce(
        (currentXml, update) =>
          currentXml.slice(0, update.start) +
          update.text +
          currentXml.slice(update.end),
        xml,
      );
  }

  private replaceHtmlTextPlaceholders(
    html: string,
    replacements: WordPlaceholderReplacement[],
  ): { html: string; replacedMarkers: string[] } {
    let nextHtml = html;
    const replacedMarkers = new Set<string>();

    for (const replacement of replacements) {
      const variants = [
        replacement.marker,
        this.escapeHtmlText(replacement.marker),
        replacement.marker.replace(/ /g, '&nbsp;'),
        this.escapeHtmlText(replacement.marker).replace(/ /g, '&nbsp;'),
      ];

      for (const variant of variants) {
        if (!variant || !nextHtml.includes(variant)) {
          continue;
        }

        nextHtml = nextHtml
          .split(variant)
          .join(this.escapeHtmlText(replacement.value));
        replacedMarkers.add(replacement.marker);
      }
    }

    return { html: nextHtml, replacedMarkers: Array.from(replacedMarkers) };
  }

  private escapeXmlText(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  private escapeHtmlText(value: string): string {
    return this.escapeXmlText(value).replace(/"/g, '&quot;');
  }
}
