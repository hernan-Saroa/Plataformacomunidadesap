import { IsString, Length, IsOptional } from 'class-validator';

export class UploadDocumentoDto {
  @IsString()
  @Length(1, 50)
  tipoDocumento: string;

  @IsString()
  @Length(1, 255)
  nombreArchivoOriginal: string;

  @IsString()
  @Length(1, 255)
  nombreArchivoSeguro: string;

  @IsString()
  @Length(1, 512)
  urlRepositorio: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  tipoMime?: string;
}
