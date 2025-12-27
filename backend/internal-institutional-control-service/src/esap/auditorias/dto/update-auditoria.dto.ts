import {
  IsString,
  IsEnum,
  IsDateString,
  IsInt,
  IsOptional,
  Min,
  Max,
  IsBoolean,
  IsArray,
} from 'class-validator';
import { 
  TipoAuditoria, 
  FaseAuditoria, 
  PrioridadAuditoria,
  EstadoKanban,
  SemaforoColor,
  TipoKanban,
  PrioridadKanban,
  RiesgoKanban
} from '../entities/auditoria.entity';

export class UpdateAuditoriaDto {
  @IsString()
  @IsOptional()
  nombre?: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsEnum(TipoAuditoria)
  @IsOptional()
  tipo?: TipoAuditoria;

  @IsEnum(FaseAuditoria)
  @IsOptional()
  fase?: FaseAuditoria;

  @IsString()
  @IsOptional()
  territorial?: string;

  @IsString()
  @IsOptional()
  sede?: string;

  @IsString()
  @IsOptional()
  responsable?: string;

  @IsDateString()
  @IsOptional()
  fechaInicio?: string;

  @IsDateString()
  @IsOptional()
  fechaFin?: string;

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  progreso?: number;

  @IsEnum(PrioridadAuditoria)
  @IsOptional()
  prioridad?: PrioridadAuditoria;

  @IsInt()
  @Min(0)
  @IsOptional()
  hallazgos?: number;

  // Campos del Kanban
  @IsEnum(EstadoKanban)
  @IsOptional()
  estadoKanban?: EstadoKanban;

  @IsEnum(RiesgoKanban)
  @IsOptional()
  riesgoKanban?: RiesgoKanban;

  @IsEnum(SemaforoColor)
  @IsOptional()
  semaforo?: SemaforoColor;

  @IsEnum(TipoKanban)
  @IsOptional()
  tipoKanban?: TipoKanban;

  @IsEnum(PrioridadKanban)
  @IsOptional()
  prioridadKanban?: PrioridadKanban;

  @IsString()
  @IsOptional()
  areaObjetivo?: string;

  @IsBoolean()
  @IsOptional()
  permiteCambiarObjetivos?: boolean;

  @IsString()
  @IsOptional()
  calificacionRiesgo?: string;

  @IsString()
  @IsOptional()
  ultimaActuacion?: string;

  @IsInt()
  @IsOptional()
  diasRestantes?: number;

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  porcentajeTiempo?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  totalDocumentos?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  totalInformes?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  totalTareas?: number;

  @IsBoolean()
  @IsOptional()
  actividadesCompletas?: boolean;

  @IsInt()
  @Min(0)
  @IsOptional()
  actividadesPendientes?: number;

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
  alcance?: string;

  @IsString()
  @IsOptional()
  procesoAuditado?: string;

  @IsString()
  @IsOptional()
  responsableAreaNombre?: string;

  @IsString()
  @IsOptional()
  responsableAreaCargo?: string;

  @IsString()
  @IsOptional()
  responsableAreaEmail?: string;

  @IsDateString()
  @IsOptional()
  fechaReunionApertura?: string;

  @IsString()
  @IsOptional()
  observacionesAdicionales?: string;

  // Objetivos (se actualizan por separado)
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  objetivos?: string[];

  // Criterios (se actualizan por separado)
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  criterios?: string[];

  // Estado de checkboxes de actividades (JSON)
  @IsOptional()
  checklistCompletados?: Record<string, boolean>;
}
