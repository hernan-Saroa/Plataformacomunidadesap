import { IsString, Length, IsIn } from 'class-validator';

export class UploadDocumentoDto {
  @IsString()
  @Length(1, 50)
  @IsIn(['CDP', 'RUT', 'CERT_BANCARIA', 'SEGURIDAD_SOCIAL', 'CONTRATO_SECOP'])
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
}
