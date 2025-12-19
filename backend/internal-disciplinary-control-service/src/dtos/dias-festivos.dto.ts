import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsDateString,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TipoFestivo } from '../entities/dia-festivo.entity';

export class CreateFestivoDto {
  @IsDateString()
  @IsNotEmpty()
  fecha: string;

  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @IsEnum(TipoFestivo)
  tipo: TipoFestivo;

  @IsOptional()
  @IsString()
  territorio?: string;
}

export class UpdateFestivoDto {
  @IsOptional()
  @IsDateString()
  fecha?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsEnum(TipoFestivo)
  tipo?: TipoFestivo;

  @IsOptional()
  @IsString()
  territorio?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

export class ListarFestivosDto {
  @IsOptional()
  @IsEnum(TipoFestivo)
  tipo?: TipoFestivo;

  @IsOptional()
  @IsString()
  territorio?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  year?: number;

  @IsOptional()
  @IsDateString()
  fechaDesde?: string;

  @IsOptional()
  @IsDateString()
  fechaHasta?: string;
}

