import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { HallazgoCategoria, HallazgoEstado } from '../entities/hallazgo.entity';

class EvidenciaDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsNotEmpty()
  tipo: string;

  @IsDateString()
  fecha: string;

  @IsString()
  @IsOptional()
  url?: string;
}

export class CreateHallazgoDto {
  @IsString()
  @IsOptional()
  @MaxLength(500)
  titulo?: string;

  @IsEnum(HallazgoCategoria)
  categoria: HallazgoCategoria;

  @IsString()
  @IsOptional()
  tipo?: 'no-conformidad' | 'observacion' | 'oportunidad-mejora';

  @IsEnum(HallazgoEstado)
  @IsOptional()
  estado?: HallazgoEstado;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  area: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  auditoria: string;

  @IsString()
  @IsOptional()
  auditoriaId?: string;

  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @IsString()
  @IsNotEmpty()
  criterioIncumplido: string;

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
  fechaDeteccion: string;

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

