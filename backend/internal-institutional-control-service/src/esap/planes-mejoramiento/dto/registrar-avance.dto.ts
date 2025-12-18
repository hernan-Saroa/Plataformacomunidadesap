import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Min,
  Max,
} from 'class-validator';

export class RegistrarAvanceDto {
  @IsDateString()
  fecha: string;

  @IsInt()
  @Min(1)
  @Max(4)
  @IsOptional()
  trimestre?: number;

  @IsInt()
  @IsOptional()
  año?: number;

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  avanceGlobal?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  accionesRevisadas?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  accionesTotales?: number;

  @IsString()
  @IsOptional()
  observaciones?: string;
}











