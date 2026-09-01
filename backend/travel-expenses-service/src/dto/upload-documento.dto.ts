import { IsString, Length, IsOptional } from 'class-validator';

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

  file?: any;
}
