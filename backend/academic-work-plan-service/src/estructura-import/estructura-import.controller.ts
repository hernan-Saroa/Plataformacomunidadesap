import { Controller, Post, UseInterceptors, UploadedFile, Query, BadRequestException, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { EstructuraImportService } from './estructura-import.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/v1/estructura-import')
@UseGuards(JwtAuthGuard)
export class EstructuraImportController {
  constructor(private readonly importService: EstructuraImportService) {}

  @Post('upload-geografico')
  @UseInterceptors(FileInterceptor('file'))
  async uploadGeografico(
    @UploadedFile() file: Express.Multer.File,
    @Query('dry_run') dryRun?: string
  ) {
    if (!file) {
      throw new BadRequestException('El archivo de carga es requerido');
    }

    const isDryRun = dryRun === 'true';
    return await this.importService.processGeograficoUpload(file.buffer, isDryRun);
  }
}
