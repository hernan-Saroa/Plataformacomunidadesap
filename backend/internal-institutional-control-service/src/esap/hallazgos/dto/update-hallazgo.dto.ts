import {
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { HallazgoCategoria, HallazgoEstado } from '../entities/hallazgo.entity';

class EvidenciaDto {
  @IsString()
  nombre: string;

  @IsString()
  tipo: string;

  @IsDateString()
  fecha: string;

  @IsString()
  @IsOptional()
  url?: string;
}

export class UpdateHallazgoDto {
  @IsString()
  @IsOptional()
  @MaxLength(500)
  titulo?: string;

  @IsEnum(HallazgoCategoria)
  @IsOptional()
  categoria?: HallazgoCategoria;

  @IsString()
  @IsOptional()
  tipo?: 'no-conformidad' | 'observacion' | 'oportunidad-mejora';

  @IsEnum(HallazgoEstado)
  @IsOptional()
  estado?: HallazgoEstado;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  area?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  auditoria?: string;

  @IsString()
  @IsOptional()
  auditoriaId?: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsString()
  @IsOptional()
  criterioIncumplido?: string;

  @IsArray()
  @IsOptional()
  normativaRelacionada?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EvidenciaDto)
  @IsOptional()
  evidencias?: EvidenciaDto[];

  @IsArray()
  @IsOptional()
  recomendaciones?: string[];

  @IsDateString()
  @IsOptional()
  fechaDeteccion?: string;

  @IsDateString()
  @IsOptional()
  fechaNotificacion?: string;

  @IsString()
  @IsOptional()
  responsable?: string;

  @IsDateString()
  @IsOptional()
  fechaLimiteCorreccion?: string;

  @IsString()
  @IsOptional()
  observacionesControversia?: string;
}
