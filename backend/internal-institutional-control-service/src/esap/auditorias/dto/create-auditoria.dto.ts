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
  IsUUID,
} from 'class-validator';
import { TipoAuditoria, FaseAuditoria, PrioridadAuditoria } from '../entities/auditoria.entity';

export class CreateAuditoriaDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsString()
  @IsNotEmpty()
  tipo: string; // Cambiado de TipoAuditoria a string para permitir tipos personalizados

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

  // Campos OBLIGATORIOS según modelo OCIG: Área y Proceso deben estar asociados
  @IsString()
  @IsNotEmpty({ message: 'El Área Responsable es obligatoria según el modelo OCIG' })
  areaObjetivo: string;

  @IsString()
  @IsNotEmpty({ message: 'El Proceso Auditado es obligatorio según el modelo OCIG' })
  procesoAuditado: string;

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

  @IsOptional()
  auditorLiderId?: string | number;

  @IsOptional()
  auditorAsignadoId?: string | number;

  @IsOptional()
  supervisorAsignadoId?: string | number;

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

  // Metadata del programa anual (periodicidad, vinculación, hitos, etc.)
  @IsOptional()
  programaAnualMetadata?: any;
}












