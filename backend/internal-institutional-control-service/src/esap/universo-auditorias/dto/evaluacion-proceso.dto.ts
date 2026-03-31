/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DTO: Crear Evaluación de Proceso
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { 
  IsString, IsNotEmpty, IsNumber, IsOptional, IsBoolean, 
  IsUUID, Min, Max, IsDateString 
} from 'class-validator';

export class CreateEvaluacionProcesoDto {
  // ═══════════════════════════════════════════════════════════════════════
  // RELACIÓN
  // ═══════════════════════════════════════════════════════════════════════

  @IsUUID()
  @IsNotEmpty()
  procesoId: string;

  // ═══════════════════════════════════════════════════════════════════════
  // ENCABEZADO
  // ═══════════════════════════════════════════════════════════════════════

  @IsNumber()
  @Min(2020)
  @Max(2100)
  vigencia: number;

  @IsDateString()
  @IsNotEmpty()
  fechaCorte: string;

  @IsString()
  @IsNotEmpty()
  dependenciaResponsable: string;

  // ═══════════════════════════════════════════════════════════════════════
  // SECCIÓN 1: RIESGOS INHERENTES
  // ═══════════════════════════════════════════════════════════════════════

  @IsOptional()
  @IsNumber()
  @Min(0)
  riesgosExtremos?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  riesgosAltos?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  riesgosModerados?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  riesgosBajos?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalRiesgos?: number;

  // ═══════════════════════════════════════════════════════════════════════
  // SECCIÓN 2: REQUERIMIENTOS ESPECIALES
  // ═══════════════════════════════════════════════════════════════════════

  @IsOptional()
  @IsBoolean()
  requerimientoComite?: boolean;

  @IsOptional()
  @IsBoolean()
  requerimientoEntesReg?: boolean;

  // ═══════════════════════════════════════════════════════════════════════
  // SECCIÓN 3: AUDITORÍA ANTERIOR
  // ═══════════════════════════════════════════════════════════════════════

  @IsOptional()
  @IsDateString()
  fechaUltimaAuditoria?: string;

  @IsOptional()
  @IsString()
  resultadoUltimaAuditoria?: string;

  // ═══════════════════════════════════════════════════════════════════════
  // SCORE C+E-M
  // ═══════════════════════════════════════════════════════════════════════

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

  // ═══════════════════════════════════════════════════════════════════════
  // CÁLCULOS DAFP
  // ═══════════════════════════════════════════════════════════════════════

  @IsOptional()
  @IsString()
  ponderacionRiesgo?: string;

  @IsOptional()
  @IsNumber()
  diasTranscurridos?: number;

  @IsOptional()
  @IsString()
  planRotacion?: string;

  @IsOptional()
  @IsNumber()
  diasRotacion?: number;

  @IsOptional()
  @IsString()
  decisionRotacion?: string;

  // ═══════════════════════════════════════════════════════════════════════
  // DECISIÓN FINAL
  // ═══════════════════════════════════════════════════════════════════════

  @IsOptional()
  @IsString()
  decisionFinal?: string;

  @IsOptional()
  @IsString()
  motivoDecision?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  prioridadRegla?: number;

  // ═══════════════════════════════════════════════════════════════════════
  // METADATOS
  // ═══════════════════════════════════════════════════════════════════════

  @IsOptional()
  @IsString()
  creadoPor?: string;
}

export class UpdateEvaluacionProcesoDto {
  @IsOptional()
  @IsNumber()
  @Min(2020)
  @Max(2100)
  vigencia?: number;

  @IsOptional()
  @IsDateString()
  fechaCorte?: string;

  @IsOptional()
  @IsString()
  dependenciaResponsable?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  riesgosExtremos?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  riesgosAltos?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  riesgosModerados?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  riesgosBajos?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalRiesgos?: number;

  @IsOptional()
  @IsBoolean()
  requerimientoComite?: boolean;

  @IsOptional()
  @IsBoolean()
  requerimientoEntesReg?: boolean;

  @IsOptional()
  @IsDateString()
  fechaUltimaAuditoria?: string;

  @IsOptional()
  @IsString()
  resultadoUltimaAuditoria?: string;

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

  @IsOptional()
  @IsString()
  ponderacionRiesgo?: string;

  @IsOptional()
  @IsNumber()
  diasTranscurridos?: number;

  @IsOptional()
  @IsString()
  planRotacion?: string;

  @IsOptional()
  @IsNumber()
  diasRotacion?: number;

  @IsOptional()
  @IsString()
  decisionRotacion?: string;

  @IsOptional()
  @IsString()
  decisionFinal?: string;

  @IsOptional()
  @IsString()
  motivoDecision?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  prioridadRegla?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
