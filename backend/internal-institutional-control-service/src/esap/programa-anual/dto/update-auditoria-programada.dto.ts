import { IsString, IsDateString, IsInt, IsEnum, IsBoolean, IsOptional, IsObject, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { TipoAuditoriaProgramada, PrioridadAuditoriaProgramada, NivelRiesgo } from '../entities/auditoria-programada.entity';

class EtapaUpdateDto {
  @IsOptional()
  @IsDateString()
  fechaInicio?: string;

  @IsOptional()
  @IsDateString()
  fechaFin?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  duracionDias?: number;

  @IsOptional()
  @IsString()
  estado?: string;
}

class EtapasUpdateDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => EtapaUpdateDto)
  planeacion?: EtapaUpdateDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => EtapaUpdateDto)
  ejecucion?: EtapaUpdateDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => EtapaUpdateDto)
  comunicacion?: EtapaUpdateDto;
}

/**
 * DTO para actualizar una auditoría programada
 * Todos los campos son opcionales para permitir actualizaciones parciales
 */
export class UpdateAuditoriaProgramadaDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsEnum(TipoAuditoriaProgramada)
  tipo?: TipoAuditoriaProgramada;

  @IsOptional()
  @IsString()
  alcance?: string;

  @IsOptional()
  @IsString()
  procesoAuditar?: string;

  @IsOptional()
  @IsString()
  auditorLider?: string;

  @IsOptional()
  @IsObject()
  equipoAuditor?: {
    auditores?: string[];
    profesionalesEspecializados?: string[];
    profesionalesUniversitarios?: string[];
    tecnicos?: string[];
  };

  @IsOptional()
  @IsDateString()
  fechaInicioPlaneada?: string;

  @IsOptional()
  @IsDateString()
  fechaFinPlaneada?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  duracionDias?: number;

  @IsOptional()
  @IsEnum(PrioridadAuditoriaProgramada)
  prioridad?: PrioridadAuditoriaProgramada;

  @IsOptional()
  @IsEnum(NivelRiesgo)
  riesgoInherente?: NivelRiesgo;

  @IsOptional()
  @IsBoolean()
  esTerritorial?: boolean;

  @IsOptional()
  @IsString()
  territorial?: string;

  @IsOptional()
  @IsBoolean()
  esEspecial?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => EtapasUpdateDto)
  etapas?: EtapasUpdateDto;
}
