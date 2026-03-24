import { IsString, IsEnum, IsOptional, IsObject, IsInt, Min, Max, IsBoolean, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TipoProceso } from '../entities/proceso-auditable.entity';

/** DTO anidado para evaluacionRiesgo — permite whitelist preservar criticidad, exposicion, mitigantes, scoreRiesgo */
class EvaluacionRiesgoUpdateDto {
  @IsOptional()
  @IsNumber()
  probabilidad?: number;
  @IsOptional()
  @IsNumber()
  impacto?: number;
  @IsOptional()
  @IsNumber()
  nivelControl?: number;
  @IsOptional()
  madurezControl?: string;
  @IsOptional()
  @IsObject()
  controles?: { preventivos: number; detectivos: number; correctivos: number };
  @IsOptional()
  factoresRiesgo?: string[];
  @IsOptional()
  @IsNumber()
  riesgoInherente?: number;
  @IsOptional()
  @IsNumber()
  riesgoResidual?: number;
  @IsOptional()
  nivelRiesgo?: string;
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
  @IsOptional()
  @IsBoolean()
  requerimientoComite?: boolean;
  @IsOptional()
  @IsBoolean()
  requerimientoEntesReg?: boolean;
  @IsOptional()
  @IsNumber()
  criticidad?: number;
  @IsOptional()
  @IsNumber()
  exposicion?: number;
  @IsOptional()
  @IsNumber()
  mitigantes?: number;
  @IsOptional()
  @IsNumber()
  scoreRiesgo?: number;
}

export class UpdateProcesoAuditableDto {
  @IsOptional()
  @IsString()
  codigo?: string;

  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsEnum(TipoProceso)
  tipo?: TipoProceso;

  @IsOptional()
  @IsString()
  macroproceso?: string;

  @IsOptional()
  @IsString()
  responsable?: string;

  @IsOptional()
  @IsString()
  dependencia?: string;

  @IsOptional()
  @IsString()
  territorial?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => EvaluacionRiesgoUpdateDto)
  @IsObject()
  evaluacionRiesgo?: EvaluacionRiesgoUpdateDto;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  prioridad?: number;

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

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

