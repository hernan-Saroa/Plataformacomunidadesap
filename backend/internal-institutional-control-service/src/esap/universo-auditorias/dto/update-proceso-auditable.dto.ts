import { IsString, IsEnum, IsOptional, IsObject, IsInt, Min, Max } from 'class-validator';
import { TipoProceso } from '../entities/proceso-auditable.entity';

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
  @IsObject()
  evaluacionRiesgo?: {
    probabilidad: number;
    impacto: number;
    nivelControl: number;
    madurezControl?: string;
    controles?: {
      preventivos: number;
      detectivos: number;
      correctivos: number;
    };
    factoresRiesgo?: string[];
    // Campos DAFP
    riesgoInherente?: number;
    riesgoResidual?: number;
    nivelRiesgo?: string;
    riesgosExtremos?: number;
    riesgosAltos?: number;
    riesgosModerados?: number;
    riesgosBajos?: number;
    totalRiesgos?: number;
    requerimientoComite?: boolean;
    requerimientoEntesReg?: boolean;
  };

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
}

