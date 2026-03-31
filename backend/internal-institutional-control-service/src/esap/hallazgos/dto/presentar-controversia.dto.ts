import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class PresentarControversiaDto {
  @IsString()
  @IsNotEmpty()
  argumentos: string;

  /** Nombre del archivo (se envía junto con el archivo en multipart) */
  @IsOptional()
  @IsString()
  nombreArchivo?: string;
}
