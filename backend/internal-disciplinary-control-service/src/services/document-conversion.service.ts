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

    if (!existsSync(inputPath)) {
      throw new InternalServerErrorException(
        `No se encontro el documento fuente del auto: ${documentUrl}`,
      );
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
    const errors: string[] = [];

    if (process.platform === 'win32') {
      try {
        await this.convertWithWordCom(inputPath, outputPath);
        return;
      } catch (error) {
        errors.push(
          `Word COM: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    try {
      await this.convertWithLibreOffice(inputPath, outputPath);
      return;
    } catch (error) {
      errors.push(
        `LibreOffice: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

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

  private escapePowerShellString(value: string): string {
    return value.replace(/'/g, "''");
  }
}
