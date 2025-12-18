import { IsString, IsNotEmpty, IsUUID, IsDateString, IsInt, IsEnum, IsBoolean, IsOptional, IsObject, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { TipoAuditoriaProgramada, PrioridadAuditoriaProgramada, NivelRiesgo } from '../entities/auditoria-programada.entity';

class EtapaDto {
  @IsDateString()
  fechaInicio: string;

  @IsDateString()
  fechaFin: string;

  @IsInt()
  @Min(1)
  duracionDias: number;

  @IsString()
  estado: string;
}

class EtapasDto {
  @ValidateNested()
  @Type(() => EtapaDto)
  planeacion: EtapaDto;

  @ValidateNested()
  @Type(() => EtapaDto)
  ejecucion: EtapaDto;

  @ValidateNested()
  @Type(() => EtapaDto)
  comunicacion: EtapaDto;
}

export class CreateAuditoriaProgramadaDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsUUID()
  @IsNotEmpty()
  procesoId: string;

  @IsString()
  @IsNotEmpty()
  procesoCodigo: string;

  @IsString()
  @IsNotEmpty()
  procesoNombre: string;

  @IsEnum(TipoAuditoriaProgramada)
  tipo: TipoAuditoriaProgramada;

  @IsString()
  @IsNotEmpty()
  alcance: string;

  @IsString()
  @IsNotEmpty()
  procesoAuditar: string;

  @IsString()
  @IsNotEmpty()
  auditorLider: string;

  @IsObject()
  equipoAuditor: {
    auditores: string[];
    profesionalesEspecializados: string[];
    profesionalesUniversitarios: string[];
    tecnicos: string[];
  };

  @IsDateString()
  fechaInicioPlaneada: string;

  @IsDateString()
  fechaFinPlaneada: string;

  @IsInt()
  @Min(1)
  duracionDias: number;

  @IsEnum(PrioridadAuditoriaProgramada)
  prioridad: PrioridadAuditoriaProgramada;

  @IsEnum(NivelRiesgo)
  riesgoInherente: NivelRiesgo;

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
  @IsString()
  solicitadaPor?: string;

  @IsOptional()
  @IsString()
  motivoEspecial?: string;

  @ValidateNested()
  @Type(() => EtapasDto)
  etapas: EtapasDto;

  @IsDateString()
  fechaLimiteOriginal: string;

  @IsOptional()
  @IsUUID()
  programaAnualId?: string;
}

