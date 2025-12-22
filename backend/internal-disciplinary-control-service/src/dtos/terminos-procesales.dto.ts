import {
  IsString,
  IsUUID,
  IsOptional,
  IsNotEmpty,
  IsInt,
  Min,
  Max,
  IsDateString,
  IsEnum,
  IsBoolean,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TerminoEstado } from '../entities/termino-procesal.entity';

export class CreateTerminoDto {
  @IsUUID()
  @IsNotEmpty()
  procesoId: string;

  @IsString()
  @IsNotEmpty()
  actuacion: string;

  @IsUUID()
  @IsNotEmpty()
  responsableId: string;

  @IsDateString()
  @IsNotEmpty()
  fechaInicio: string;

  @IsInt()
  @Min(1)
  @Max(180)
  diasHabiles: number;
}

export class UpdateTerminoDto {
  @IsOptional()
  @IsString()
  actuacion?: string;

  @IsOptional()
  @IsUUID()
  responsableId?: string;

  @IsOptional()
  @IsDateString()
  fechaInicio?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(180)
  diasHabiles?: number;
}

export class MarcarCumplidoDto {
  @IsDateString()
  @IsNotEmpty()
  fechaCumplimiento: string;

  @IsOptional()
  @IsString()
  observaciones?: string;
}

export class ListarTerminosDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number;

  @IsOptional()
  @IsEnum(TerminoEstado)
  estado?: TerminoEstado;

  @IsOptional()
  @IsUUID()
  procesoId?: string;

  @IsOptional()
  @IsUUID()
  responsableId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsDateString()
  fechaDesde?: string;

  @IsOptional()
  @IsDateString()
  fechaHasta?: string;
}

export class RecalcularTerminosDto {
  // Puede estar vacío, solo dispara el recálculo
}

