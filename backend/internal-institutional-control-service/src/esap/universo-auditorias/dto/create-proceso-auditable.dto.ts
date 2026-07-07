import { IsString, IsNotEmpty, IsEnum, IsNumber, IsOptional, IsObject, ValidateNested, Min, Max, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { NivelRiesgo } from '../entities/proceso-auditable.entity';

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
  @IsNumber()
  riesgoInherente?: number;

  @IsOptional()
  @IsNumber()
  riesgoResidual?: number;

  @IsOptional()
  @IsEnum(NivelRiesgo)
  nivelRiesgo?: NivelRiesgo;

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

  // Campos DAFP para distribución de riesgos
  @IsOptional()
  @IsNumber()
  riesgosExtremos?: number;

  @IsOptional()
  @IsNumber()
  riesgosAltos?: number;

  @IsOptional()
  @IsNumber()
  riesgosModerados?: number;

  @IsOptional()
  @IsNumber()
  riesgosBajos?: number;

  @IsOptional()
  @IsNumber()
  totalRiesgos?: number;

  // Requerimientos especiales DAFP
  @IsOptional()
  @IsBoolean()
  requerimientoComite?: boolean;

  @IsOptional()
  @IsBoolean()
  requerimientoEntesReg?: boolean;

  // Score C+E-M (modelo simplificado 0-15)
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  criticidad?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  exposicion?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  mitigantes?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(15)
  scoreRiesgo?: number;
}

export class CreateProcesoAuditableDto {
  @IsString()
  @IsNotEmpty()
  codigo: string;

  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsString()
  @IsNotEmpty()
  tipo: string;

  @IsOptional()
  @IsString()
  tipoProcesoId?: string;

  @IsString()
  @IsNotEmpty()
  macroproceso: string;

  @IsOptional()
  unidadesAuditables?: { id: string; nombre: string; descripcion?: string }[];

  @IsOptional()
  @IsString()
  responsable?: string;

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

  @IsOptional()
  @IsString()
  frecuenciaAuditoria?: string;

  @IsOptional()
  ultimaAuditoria?: string;

  @IsOptional()
  @IsString()
  resultadoUltimaAuditoria?: string;

  @IsOptional()
  proximaAuditoria?: string;
}
