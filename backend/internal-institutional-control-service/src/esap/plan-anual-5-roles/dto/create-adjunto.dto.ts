import { IsNotEmpty, IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateAdjuntoDto {
  @IsNotEmpty()
  @IsString()
  nombre!: string;

  @IsOptional()
  @IsString()
  tipo?: string;

  @IsOptional()
  @IsNumber()
  tamanio?: number;

  @IsOptional()
  @IsString()
  cargadoPor?: string;

  @IsOptional()
  @IsNumber()
  cargadoPorId?: number;

  @IsOptional()
  @IsString()
  rutaArchivo?: string;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsString()
  hashArchivo?: string;
}
