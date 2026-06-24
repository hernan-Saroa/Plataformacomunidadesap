import {
  Controller,
  Get,
  Post,
  UseInterceptors,
  UploadedFile,
  Query,
  BadRequestException,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { EstructuraImportService } from './estructura-import.service';

@Controller('estructura-import')
export class EstructuraImportController {
  constructor(private readonly importService: EstructuraImportService) {}

  @Post('upload-geografico')
  @UseInterceptors(FileInterceptor('file'))
  async uploadGeografico(
    @UploadedFile() file: any,
    @Query('dry_run') dryRun: string = 'false',
    @Query('skip_invalid') skipInvalid: string = 'false',
    @Query('periodo') periodo?: string,
  ) {
    if (!file) {
      throw new BadRequestException('Archivo no proporcionado');
    }
    const isDryRun = dryRun === 'true' || dryRun === '1';
    const isSkipInvalid = skipInvalid === 'true' || skipInvalid === '1';
    return this.importService.importGeografico(file.buffer, isDryRun, isSkipInvalid, undefined, periodo);
  }

  @Get('status')
  async getStatus() {
    return this.importService.getStatus();
  }

  @Get('template')
  downloadTemplate(@Res() response: Response) {
    const buffer = this.importService.getTemplateBuffer();
    response.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    response.setHeader(
      'Content-Disposition',
      'attachment; filename="Plantilla_Estructura_Geografica_ESAP.xlsx"',
    );
    response.send(buffer);
  }
}
