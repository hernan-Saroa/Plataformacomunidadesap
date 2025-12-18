import { IsInt, IsString, IsNotEmpty, IsDateString, IsOptional, Min, Max } from 'class-validator';

export class CreateSeguimientoDto {
  @IsInt()
  @Min(1)
  @Max(4)
  trimestre: number;

  @IsInt()
  año: number;

  @IsDateString()
  fechaInicio: string;

  @IsDateString()
  fechaFin: string;

  @IsDateString()
  @IsOptional()
  fechaSeguimiento?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  avanceGlobal?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  porcentajeCumplimiento?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  porcentajeEfectividad?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  accionesRevisadas?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  accionesTotales?: number;

  @IsOptional()
  @IsString()
  observacionesGenerales?: string;
}

