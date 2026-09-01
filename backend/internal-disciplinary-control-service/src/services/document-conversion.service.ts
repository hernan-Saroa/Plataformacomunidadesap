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

@Injectable()
export class DocumentConversionService {
  private readonly logger = new Logger(DocumentConversionService.name);

  constructor(private readonly storageService: StorageService) {}

  async convertWordToPdf(
    documentUrl: string,
    preferredPdfName: string,
    replacements: WordPlaceholderReplacement[] = [],
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

      // Mammoth no lee word/header*.xml ni word/footer*.xml (solo word/document.xml),
      // así que el membrete y el pie de página insertados como encabezado/pie de
      // Word se pierden en la conversión. Se extraen aparte (imágenes y texto) y
      // se inyectan como encabezado/pie de página REALES de Puppeteer, para que
      // queden fijos en el margen y se repitan en todas las páginas, tal como en
      // el documento original (antes se anteponían al cuerpo y salían en línea a
      // mitad de página, en desorden).
      const headerContent = await this.extractHeaderContent(inputPath);
      const footerContent = await this.extractFooterContent(inputPath);

      // El membrete y el pie de ESAP son imágenes tipo "banner" que ocupan todo el
      // ancho de la página (el logo queda a la izquierda; "www.esap.edu.co" a la
      // derecha). Se renderizan a ancho completo, no centradas ni encogidas.
      const headerImagesHtml = headerContent.images
        .map((src) => `<img src="${src}" style="display:block; width:100%;" />`)
        .join('');
      const headerTextHtml = headerContent.textBlocks
        .map(
          (texto) =>
            `<div style="text-align:center; font-size:8pt; line-height:1.3;">${this.escapeHtmlText(texto)}</div>`,
        )
        .join('');
      const footerImagesHtml = footerContent.images
        .map((src) => `<img src="${src}" style="display:block; width:100%;" />`)
        .join('');
      const footerTextHtml = footerContent.textBlocks
        .map(
          (texto) =>
            `<div style="text-align:left; font-size:7pt; line-height:1.3;">${this.escapeHtmlText(texto)}</div>`,
        )
        .join('');

      const hasHeader = headerImagesHtml.length > 0 || headerTextHtml.length > 0;
      const hasFooter = footerImagesHtml.length > 0 || footerTextHtml.length > 0;

      // Puppeteer no hereda los estilos de la página en las plantillas de
      // encabezado/pie y fija un tamaño de fuente diminuto por defecto: se fuerzan
      // los estilos en línea y se deja padding lateral igual al margen del cuerpo.
      // El "Página X de Y" del pie original es un campo de Word (no <w:t>), así que
      // no lo trae la extracción: se reconstruye con los contadores de Puppeteer.
      const footerPageNumberHtml =
        '<div style="text-align:center; font-size:7pt; line-height:1.3;">Página <span class="pageNumber"></span> de <span class="totalPages"></span></div>';

      // La imagen del membrete va a sangre (ancho completo). El texto del pie
      // (dirección) se superpone sobre el banner por la izquierda, como en el
      // documento original; si no hay imagen, simplemente se apila.
      const headerTemplate = hasHeader
        ? `<div style="width:100%; -webkit-print-color-adjust:exact;">${headerImagesHtml}${
            headerTextHtml
              ? `<div style="padding:1mm 2cm 0; box-sizing:border-box;">${headerTextHtml}</div>`
              : ''
          }</div>`
        : '<div></div>';
      const footerBodyHtml = footerImagesHtml
        ? `<div style="position:relative; width:100%;">${footerImagesHtml}<div style="position:absolute; left:0; top:0; width:100%; padding:0 2cm; box-sizing:border-box;">${footerTextHtml}</div></div>`
        : `<div style="padding:0 2cm; box-sizing:border-box;">${footerTextHtml}</div>`;
      const footerTemplate = hasFooter
        ? `<div style="width:100%; font-size:7pt; -webkit-print-color-adjust:exact;">${footerPageNumberHtml}${footerBodyHtml}</div>`
        : '<div></div>';

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

      // Generar PDF. Cuando hay membrete/pie se activa displayHeaderFooter y se
      // amplía el margen superior/inferior para que las plantillas quepan sin
      // solaparse con el cuerpo.
      this.logger.log(`[Mammoth] Generating PDF...`);
      await page.pdf({
        path: outputPath,
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: hasHeader || hasFooter,
        headerTemplate,
        footerTemplate,
        margin: {
          top: hasHeader ? '3.8cm' : '2cm',
          right: '2cm',
          // El pie institucional es alto (banner a ancho completo + varias líneas
          // de dirección superpuestas): necesita un margen inferior generoso o se
          // recorta. Debe coincidir con el yPosition de la firma en
          // pdf-modifier.service para que no se solapen.
          bottom: hasFooter ? '4cm' : '2cm',
          left: '2cm'
        }
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

  private escapePowerShellString(value: string): string {
    return value.replace(/'/g, "''");
  }

  private async extractHeaderContent(
    inputPath: string,
  ): Promise<{ images: string[]; textBlocks: string[] }> {
    try {
      const docxBuffer = await fs.readFile(inputPath);
      const zip = await JSZip.loadAsync(docxBuffer);

      const headerFiles = Object.keys(zip.files).filter((fileName) =>
        /^word\/header\d*\.xml$/i.test(fileName),
      );

      const images: string[] = [];
      const textBlocks: string[] = [];
      const seenMediaPaths = new Set<string>();
      const seenText = new Set<string>();

      for (const headerFile of headerFiles) {
        const headerXml = await zip.file(headerFile)?.async('string');
        if (!headerXml) {
          continue;
        }

        const relsPath = `word/_rels/${path.basename(headerFile)}.rels`;
        const relsXml = await zip.file(relsPath)?.async('string');

        const relsMap = new Map<string, string>();
        if (relsXml) {
          const relRegex = /<Relationship\b[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"[^>]*\/?>/g;
          let relMatch: RegExpExecArray | null;

          while ((relMatch = relRegex.exec(relsXml)) !== null) {
            relsMap.set(relMatch[1], relMatch[2]);
          }

          const embedRegex = /r:embed="([^"]+)"/g;
          let embedMatch: RegExpExecArray | null;

          while ((embedMatch = embedRegex.exec(headerXml)) !== null) {
            const target = relsMap.get(embedMatch[1]);
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
                `[Conversion] Imagen de encabezado con formato no soportado para vista web: ${mediaPath}`,
              );
              continue;
            }

            const mediaBuffer = await mediaFile.async('nodebuffer');
            images.push(`data:${mimeType};base64,${mediaBuffer.toString('base64')}`);
          }
        }

        // Mammoth tampoco lee el texto del encabezado (ej. dirección, NIT, datos de
        // contacto de la institución debajo del logo). Se extrae párrafo por párrafo.
        const paragraphRegex = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g;
        let paragraphMatch: RegExpExecArray | null;

        while ((paragraphMatch = paragraphRegex.exec(headerXml)) !== null) {
          const paragraphXml = paragraphMatch[1];
          const textRegex = /<w:t\b[^>]*>([^<]*)<\/w:t>/g;
          let textMatch: RegExpExecArray | null;
          let paragraphText = '';

          while ((textMatch = textRegex.exec(paragraphXml)) !== null) {
            paragraphText += textMatch[1];
          }

          const decodedText = this.decodeXmlEntities(paragraphText).trim();
          if (decodedText && !seenText.has(decodedText)) {
            seenText.add(decodedText);
            textBlocks.push(decodedText);
          }
        }
      }

      return { images, textBlocks };
    } catch (error) {
      this.logger.warn(
        `[Conversion] No se pudo extraer el contenido del encabezado del documento: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return { images: [], textBlocks: [] };
    }
  }

  private async extractFooterContent(
    inputPath: string,
  ): Promise<{ images: string[]; textBlocks: string[] }> {
    try {
      const docxBuffer = await fs.readFile(inputPath);
      const zip = await JSZip.loadAsync(docxBuffer);

      const footerFiles = Object.keys(zip.files).filter((fileName) =>
        /^word\/footer\d*\.xml$/i.test(fileName),
      );

      const images: string[] = [];
      const textBlocks: string[] = [];
      const seenMediaPaths = new Set<string>();
      const seenText = new Set<string>();

      for (const footerFile of footerFiles) {
        const footerXml = await zip.file(footerFile)?.async('string');
        if (!footerXml) {
          continue;
        }

        const relsPath = `word/_rels/${path.basename(footerFile)}.rels`;
        const relsXml = await zip.file(relsPath)?.async('string');

        const relsMap = new Map<string, string>();
        if (relsXml) {
          const relRegex = /<Relationship\b[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"[^>]*\/?>/g;
          let relMatch: RegExpExecArray | null;

          while ((relMatch = relRegex.exec(relsXml)) !== null) {
            relsMap.set(relMatch[1], relMatch[2]);
          }

          const embedRegex = /r:embed="([^"]+)"/g;
          let embedMatch: RegExpExecArray | null;

          while ((embedMatch = embedRegex.exec(footerXml)) !== null) {
            const target = relsMap.get(embedMatch[1]);
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
                `[Conversion] Imagen de pie de página con formato no soportado para vista web: ${mediaPath}`,
              );
              continue;
            }

            const mediaBuffer = await mediaFile.async('nodebuffer');
            images.push(`data:${mimeType};base64,${mediaBuffer.toString('base64')}`);
          }
        }

        // Igual que con el encabezado, Mammoth no lee el texto del pie de página
        // (ej. dirección, notas legales, numeración) del word/footer*.xml.
        const paragraphRegex = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g;
        let paragraphMatch: RegExpExecArray | null;

        while ((paragraphMatch = paragraphRegex.exec(footerXml)) !== null) {
          const paragraphXml = paragraphMatch[1];
          const textRegex = /<w:t\b[^>]*>([^<]*)<\/w:t>/g;
          let textMatch: RegExpExecArray | null;
          let paragraphText = '';

          while ((textMatch = textRegex.exec(paragraphXml)) !== null) {
            paragraphText += textMatch[1];
          }

          const decodedText = this.decodeXmlEntities(paragraphText).trim();
          if (decodedText && !seenText.has(decodedText)) {
            seenText.add(decodedText);
            textBlocks.push(decodedText);
          }
        }
      }

      return { images, textBlocks };
    } catch (error) {
      this.logger.warn(
        `[Conversion] No se pudo extraer el contenido del pie de página del documento: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return { images: [], textBlocks: [] };
    }
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
