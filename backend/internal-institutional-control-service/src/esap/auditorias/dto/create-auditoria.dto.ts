import {
  IsString,
  IsEnum,
  IsDateString,
  IsInt,
  IsNotEmpty,
  Min,
  Max,
  IsOptional,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { TipoAuditoria, FaseAuditoria, PrioridadAuditoria } from '../entities/auditoria.entity';

export class CreateAuditoriaDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsEnum(TipoAuditoria)
  @IsNotEmpty()
  tipo: TipoAuditoria;

  @IsEnum(FaseAuditoria)
  @IsOptional()
  fase?: FaseAuditoria;

  @IsString()
  @IsNotEmpty()
  territorial: string;

  @IsString()
  @IsNotEmpty()
  sede: string;

  @IsString()
  @IsNotEmpty()
  responsable: string;

  @IsDateString()
  @IsNotEmpty()
  fechaInicio: string;

  @IsDateString()
  @IsNotEmpty()
  fechaFin: string;

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  progreso?: number;

  @IsEnum(PrioridadAuditoria)
  @IsOptional()
  prioridad?: PrioridadAuditoria;

  // Campos adicionales del formulario
  @IsString()
  @IsOptional()
  areaObjetivo?: string;

  @IsString()
  @IsOptional()
  procesoAuditado?: string;

  @IsString()
  @IsOptional()
  alcance?: string;

  @IsString()
  @IsOptional()
  metodologia?: string;

  @IsString()
  @IsOptional()
  nivelRiesgo?: string;

  @IsString()
  @IsOptional()
  calificacionRiesgo?: string;

  @IsString()
  @IsOptional()
  presupuestoEstimado?: string;

  @IsInt()
  @IsOptional()
  auditorLiderId?: number;

  @IsInt()
  @IsOptional()
  auditorAsignadoId?: number;

  @IsInt()
  @IsOptional()
  supervisorAsignadoId?: number;

  @IsString()
  @IsOptional()
  responsableAreaNombre?: string;

  @IsString()
  @IsOptional()
  responsableAreaCargo?: string;

  @IsString()
  @IsOptional()
  responsableAreaEmail?: string;

  @IsString()
  @IsOptional()
  observacionesAdicionales?: string;

  // Arrays - se guardarán en tablas relacionadas después
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  objetivos?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  criteriosAuditoria?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  normatividadAplicable?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  riesgosIdentificados?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  controlesAplicar?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  equipoAuditores?: string[];
}












