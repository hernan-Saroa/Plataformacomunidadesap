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
  IsUUID,
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

  @IsString()
  @IsOptional()
  tipo?: string; // Cambiado de TipoAuditoria a string para permitir tipos personalizados

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
  fechaInicio?: string; // Inicio de Planeación

  @IsDateString()
  @IsOptional()
  fechaFinPlaneacion?: string; // Fin de Planeación / Inicio de Ejecución

  @IsDateString()
  @IsOptional()
  fechaFinEjecucion?: string; // Fin de Ejecución / Inicio de Comunicación

  @IsDateString()
  @IsOptional()
  fechaFin?: string; // Fin de Comunicación (fin de auditoría)

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

  @IsOptional()
  auditorLiderId?: string | number;

  @IsOptional()
  auditorAsignadoId?: string | number;

  @IsOptional()
  supervisorAsignadoId?: string | number;

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

  // Metadata del programa anual (JSONB flexible)
  @IsOptional()
  programaAnualMetadata?: any;

  // Campos de archivo
  @IsBoolean()
  @IsOptional()
  archivada?: boolean;

  @IsDateString()
  @IsOptional()
  fechaArchivo?: string;

  @IsBoolean()
  @IsOptional()
  activa?: boolean;
}
