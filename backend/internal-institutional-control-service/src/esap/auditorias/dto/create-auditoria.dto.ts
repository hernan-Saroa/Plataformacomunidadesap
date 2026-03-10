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
  IsIn,
} from 'class-validator';
import { TipoAuditoria, FaseAuditoria, PrioridadAuditoria, EstadoKanban } from '../entities/auditoria.entity';

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

  // ═══════════════════════════════════════════════════════════════════
  // CRONOGRAMA DE 3 ETAPAS: Planeación → Ejecución → Comunicación
  // ═══════════════════════════════════════════════════════════════════
  
  // ETAPA 1: PLANEACIÓN
  @IsDateString()
  @IsNotEmpty()
  fechaInicio: string; // Inicio de Planeación (= fechaInicioPlaneacion)

  @IsDateString()
  @IsOptional()
  fechaFinPlaneacion?: string; // Fin de Planeación

  // ETAPA 2: EJECUCIÓN
  @IsDateString()
  @IsOptional()
  fechaInicioEjecucion?: string; // Inicio de Ejecución

  @IsDateString()
  @IsOptional()
  fechaFinEjecucion?: string; // Fin de Ejecución

  // ETAPA 3: COMUNICACIÓN
  @IsDateString()
  @IsOptional()
  fechaInicioComunicacion?: string; // Inicio de Comunicación

  @IsDateString()
  @IsNotEmpty()
  fechaFin: string; // Fin de Comunicación (fin de auditoría) = fechaFinComunicacion

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

  // Estado inicial del Kanban (cualquier string, se valida contra etapas del tablero en el servicio)
  @IsOptional()
  @IsString()
  estadoKanban?: string;
}












