import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsDateString,
  IsUUID,
  ValidateNested,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AccionDto {
  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @IsString()
  @IsOptional()
  tipo?: 'correctiva' | 'preventiva' | 'mejora';

  @IsString()
  @IsNotEmpty()
  responsable: string;

  @IsDateString()
  fechaInicio: string;

  @IsDateString()
  fechaFin: string;

  @IsString()
  @IsOptional()
  recursos?: string;

  @IsString()
  @IsOptional()
  indicador?: string;

  @IsString()
  @IsOptional()
  metaIndicador?: string;

  @IsString()
  @IsOptional()
  observaciones?: string;
}

export class CreatePlanMejoramientoDto {
  @IsString()
  @IsOptional()
  @MaxLength(500)
  titulo?: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  objetivos?: string[];

  @IsUUID()
  @IsOptional()
  hallazgoId?: string;

  @IsString()
  @IsOptional()
  hallazgoCodigo?: string;

  @IsUUID()
  @IsOptional()
  auditoriaId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  areaResponsable: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  responsableImplementacion: string;

  @IsDateString()
  fechaLimite: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AccionDto)
  @IsOptional()
  acciones?: AccionDto[];
}











