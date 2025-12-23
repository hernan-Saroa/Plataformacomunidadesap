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
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TerminoEstado } from '../entities/termino-procesal.entity';

export class CreateTerminoDto {
  @IsString({ message: 'procesoId must be a string' })
  @IsNotEmpty({ message: 'procesoId must not be empty' })
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, {
    message: 'procesoId must be a valid UUID',
  })
  procesoId: string;

  @IsString()
  @IsNotEmpty()
  actuacion: string;

  @IsString({ message: 'responsableId must be a string' })
  @IsNotEmpty({ message: 'responsableId must not be empty' })
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, {
    message: 'responsableId must be a valid UUID',
  })
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
  @IsString({ message: 'responsableId must be a string' })
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, {
    message: 'responsableId must be a valid UUID',
  })
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
  @IsString({ message: 'procesoId must be a string' })
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, {
    message: 'procesoId must be a valid UUID',
  })
  procesoId?: string;

  @IsOptional()
  @IsString({ message: 'responsableId must be a string' })
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, {
    message: 'responsableId must be a valid UUID',
  })
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

