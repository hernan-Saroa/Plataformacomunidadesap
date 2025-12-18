import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { TemplateConfigService } from './template-config.service';

@Controller('certificates/template-config')
export class TemplateConfigController {
  constructor(private readonly templateConfigService: TemplateConfigService) {}

  /**
   * GET /certificates/template-config
   * Obtiene la configuración activa de la plantilla
   */
  @Get()
  async getConfig(@Query('tipo') tipo?: string) {
    return await this.templateConfigService.getActiveConfig(tipo || 'docente');
  }

  /**
   * POST /certificates/template-config/signer-name
   * Actualiza el nombre del firmante
   */
  @Post('signer-name')
  @HttpCode(HttpStatus.OK)
  async updateSignerName(
    @Body() data: { signerName: string; updatedBy?: string },
    @Query('tipo') tipo?: string,
  ) {
    return await this.templateConfigService.updateSignerName(
      data.signerName,
      data.updatedBy || 'Usuario',
      tipo || 'docente',
    );
  }

  /**
   * POST /certificates/template-config/upload-signature
   * Sube y actualiza la imagen de firma
   */
  @Post('upload-signature')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/signatures',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `signature-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png)$/)) {
          return cb(new Error('Solo se permiten imágenes PNG, JPG o JPEG'), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: 2 * 1024 * 1024, // 2MB máximo
      },
    }),
  )
  async uploadSignature(
    @UploadedFile() file: any,
    @Body('updatedBy') updatedBy?: string,
    @Query('tipo') tipo?: string,
  ) {
    if (!file) {
      throw new Error('No se recibió ningún archivo');
    }

    const signatureUrl = `/uploads/signatures/${file.filename}`;

    return await this.templateConfigService.updateSignature(
      signatureUrl,
      updatedBy || 'Usuario',
      tipo || 'docente',
      { filename: file.originalname, size: `${Math.round(file.size / 1024)} KB` },
    );
  }

  /**
   * POST /certificates/template-config/upload-logo
   * Sube y actualiza el logo de la entidad
   */
  @Post('upload-logo')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/logos',
        filename: (_req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `logo-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png)$/)) {
          return cb(new Error('Solo se permiten imágenes PNG, JPG o JPEG'), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: 2 * 1024 * 1024, // 2MB máximo
      },
    }),
  )
  async uploadLogo(
    @UploadedFile() file: any,
    @Body('updatedBy') updatedBy?: string,
    @Query('tipo') tipo?: string,
  ) {
    if (!file) {
      throw new Error('No se recibió ningún archivo');
    }

    const logoUrl = `/uploads/logos/${file.filename}`;
    const fileSize = `${Math.round(file.size / 1024)} KB`;

    return await this.templateConfigService.updateLogo(
      logoUrl,
      file.originalname,
      fileSize,
      updatedBy || 'Usuario',
      tipo || 'docente',
    );
  }

  /**
   * POST /certificates/template-config/reset-logo
   * Restablece el logo al predeterminado
   */
  @Post('reset-logo')
  @HttpCode(HttpStatus.OK)
  async resetLogo(@Body('updatedBy') updatedBy?: string, @Query('tipo') tipo?: string) {
    return await this.templateConfigService.resetLogo(
      updatedBy || 'Usuario',
      tipo || 'docente',
    );
  }

  /**
   * POST /certificates/template-config/reset-signature
   * Quita la firma (queda vacio)
   */
  @Post('reset-signature')
  @HttpCode(HttpStatus.OK)
  async resetSignature(@Body('updatedBy') updatedBy?: string, @Query('tipo') tipo?: string) {
    return await this.templateConfigService.clearSignature(
      updatedBy || 'Usuario',
      tipo || 'docente',
    );
  }

  /**
   * GET /certificates/template-config/change-history
   * Obtiene el historial de cambios de la configuración
   */
  @Get('change-history')
  async getChangeHistory(@Query('tipo') tipo?: string) {
    return await this.templateConfigService.getChangeHistory(tipo || 'docente');
  }

  /**
   * POST /certificates/template-config/content
   * Actualiza el contenido de la plantilla (tipografía, título del cargo, contenido HTML)
   */
  @Post('content')
  @HttpCode(HttpStatus.OK)
  async updateContent(
    @Body()
    data: {
      typographyFont?: string;
      cargoTitle?: string;
      certificateContentHtml?: string;
      updatedBy?: string;
    },
    @Query('tipo') tipo?: string,
  ) {
    return await this.templateConfigService.updateTemplateContent(
      {
        typographyFont: data.typographyFont,
        cargoTitle: data.cargoTitle,
        certificateContentHtml: data.certificateContentHtml,
      },
      data.updatedBy || 'Usuario',
      tipo || 'docente',
    );
  }
}
