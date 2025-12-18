import { IsString, IsNotEmpty, IsEnum, IsNumber, IsOptional, IsObject, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { TipoProceso, NivelRiesgo } from '../entities/proceso-auditable.entity';

class EvaluacionRiesgoDto {
  @IsNumber()
  @Min(1)
  @Max(3)
  probabilidad: number;

  @IsNumber()
  @Min(1)
  @Max(3)
  impacto: number;

  @IsNumber()
  @Min(1)
  @Max(3)
  nivelControl: number;

  @IsOptional()
  @IsString()
  madurezControl?: string;

  @IsOptional()
  @IsObject()
  controles?: {
    preventivos: number;
    detectivos: number;
    correctivos: number;
  };

  @IsOptional()
  factoresRiesgo?: string[];
}

export class CreateProcesoAuditableDto {
  @IsString()
  @IsNotEmpty()
  codigo: string;

  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @IsEnum(TipoProceso)
  tipo: TipoProceso;

  @IsString()
  @IsNotEmpty()
  macroproceso: string;

  @IsString()
  @IsNotEmpty()
  responsable: string;

  @IsString()
  @IsNotEmpty()
  dependencia: string;

  @IsOptional()
  @IsString()
  territorial?: string;

  @ValidateNested()
  @Type(() => EvaluacionRiesgoDto)
  @IsObject()
  evaluacionRiesgo: EvaluacionRiesgoDto;

  @IsString()
  @IsNotEmpty()
  frecuenciaAuditoria: string;

  @IsOptional()
  ultimaAuditoria?: string;

  @IsOptional()
  proximaAuditoria?: string;
}

