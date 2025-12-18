import {
  IsString,
  IsOptional,
  IsArray,
  IsDateString,
  IsUUID,
  ValidateNested,
  MaxLength,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PlanMejoramientoEstado } from '../entities/plan-mejoramiento.entity';

class AccionDto {
  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsString()
  @IsOptional()
  tipo?: 'correctiva' | 'preventiva' | 'mejora';

  @IsString()
  @IsOptional()
  responsable?: string;

  @IsDateString()
  @IsOptional()
  fechaInicio?: string;

  @IsDateString()
  @IsOptional()
  fechaFin?: string;

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

export class UpdatePlanMejoramientoDto {
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
  @IsOptional()
  @MaxLength(255)
  areaResponsable?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  responsableImplementacion?: string;

  @IsDateString()
  @IsOptional()
  fechaLimite?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AccionDto)
  @IsOptional()
  acciones?: AccionDto[];

  @IsEnum(PlanMejoramientoEstado)
  @IsOptional()
  estado?: PlanMejoramientoEstado;

  @IsString()
  @IsOptional()
  observacionesAprobacion?: string;

  @IsString()
  @IsOptional()
  motivoRechazo?: string;

}











