import { IsString, Length, IsOptional, Allow } from 'class-validator';

export class UploadDocumentoDto {
  @IsString()
  @Length(1, 50)
  tipoDocumento: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  tipoMime?: string;

  @IsOptional()
  @IsString()
  nombreArchivoOriginal?: string;

  @IsOptional()
  @IsString()
  nombreArchivoSeguro?: string;

  @IsOptional()
  @IsString()
  urlRepositorio?: string;

  // El archivo real llega vía @UploadedFile() (multer) y se adjunta al DTO en
  // el controlador. @Allow() lo incluye en la whitelist para no romper con el
  // ValidationPipe global (forbidNonWhitelisted: true).
  @Allow()
  file?: any;
}
