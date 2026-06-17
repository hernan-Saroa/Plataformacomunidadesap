import {
  Controller,
  Post,
  Get,
  UseInterceptors,
  UploadedFile,
  Query,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AsignaturasImportService } from './asignaturas-import.service';
import { ExcelParserService } from './parsers/excel-parser.service';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller(['asignaturas-import', 'pta/asignaturas-import'])
@UseGuards(RolesGuard)
@Roles('GESTION_PROFESORAL', 'SUPER_ADMIN', 'super_admin')
export class AsignaturasImportController {
  constructor(private readonly importService: AsignaturasImportService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Query('dry_run') dryRunQuery?: string,
    @Query('periodo_codigo') periodCodigoQuery?: string,
    @Query('omit_errors') omitErrorsQuery?: string,
    @Req() req?: any,
  ) {
    if (!file) {
      throw new BadRequestException('Se requiere un archivo Excel en el campo "file".');
    }

    // PRERREQUISITO: Verificar que la estructura geográfica esté cargada
    try {
      const authUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
      const response = await fetch(`${authUrl}/estructura-import/status`);
      if (response.ok) {
        const statusData = await response.json();
        if (!statusData.isReady) {
          throw new BadRequestException(
            `Prerrequisito fallido: La estructura geográfica no está completa. Faltan DTs o CETAPs. (DTs: ${statusData.direcciones_territoriales}/17, CETAPs: ${statusData.cetaps}/288)`
          );
        }
      }
    } catch (e: any) {
      if (e instanceof BadRequestException) throw e;
      console.warn(`No se pudo verificar el estado de la estructura geográfica: ${e.message}`);
    }

    const dryRun = dryRunQuery === 'true';
    const omitErrors = omitErrorsQuery === 'true';
    const periodCodigo = periodCodigoQuery || '2025-2';
    const user = req?.user; // Extraído por JwtAuthGuard

    return this.importService.importCatalog(file.buffer, dryRun, periodCodigo, user, omitErrors);
  }

  @Post('validate')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async validate(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Query('periodo_codigo') periodCodigoQuery?: string,
  ) {
    if (!file) {
      throw new BadRequestException('Se requiere un archivo Excel en el campo "file".');
    }

    const periodCodigo = periodCodigoQuery || '2025-2';
    // Validate es equivalente a dry_run = true
    return this.importService.importCatalog(file.buffer, true, periodCodigo);
  }

  @Get('last-import')
  async getLastImport(@Query('periodo_codigo') periodCodigoQuery?: string) {
    const periodCodigo = periodCodigoQuery || '2025-2';
    return this.importService.getLastImport(periodCodigo);
  }
}
