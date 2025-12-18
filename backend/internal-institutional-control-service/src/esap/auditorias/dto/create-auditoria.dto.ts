import {
  IsString,
  IsEnum,
  IsDateString,
  IsInt,
  IsNotEmpty,
  Min,
  Max,
  IsOptional,
} from 'class-validator';
import { TipoAuditoria, FaseAuditoria, PrioridadAuditoria } from '../entities/auditoria.entity';

export class CreateAuditoriaDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

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
}












