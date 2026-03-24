import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsInt,
  Min,
  Max,
  IsDateString,
  MaxLength,
} from 'class-validator';
import {
  EstadoTarea,
  PrioridadTarea,
  FaseTarea,
} from '../entities/tarea-auditoria.entity';

export class CreateTareaAuditoriaDto {
  @IsUUID()
  auditoriaId!: string;

  @IsString()
  @MaxLength(255)
  titulo!: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsEnum(EstadoTarea)
  estado?: EstadoTarea;

  @IsOptional()
  @IsEnum(PrioridadTarea)
  prioridad?: PrioridadTarea;

  @IsOptional()
  @IsEnum(FaseTarea)
  fase?: FaseTarea;

  @IsUUID()
  responsableId!: string;

  @IsString()
  @MaxLength(255)
  responsableNombre!: string;

  @IsOptional()
  @IsDateString()
  fechaVencimiento?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  progreso?: number;

  @IsOptional()
  @IsString()
  notas?: string;
}
