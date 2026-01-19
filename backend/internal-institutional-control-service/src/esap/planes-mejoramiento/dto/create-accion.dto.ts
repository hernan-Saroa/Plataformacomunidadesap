import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsEnum,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { AccionCorrectivaTipo, AccionCorrectivaEstado } from '../entities/accion-correctiva.entity';

export class CreateAccionDto {
  @IsString()
  @IsOptional()
  hallazgoId?: string;

  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @IsEnum(AccionCorrectivaTipo)
  @IsOptional()
  tipo?: AccionCorrectivaTipo;

  @IsString()
  @IsNotEmpty()
  responsable: string;

  @IsDateString()
  fechaInicio: string;

  @IsDateString()
  fechaFin: string;

  @IsString()
  @IsOptional()
  recursos?: string;

  @IsString()
  @IsOptional()
  indicador?: string;

  @IsString()
  @IsOptional()
  metaIndicador?: string;

  @IsString()
  @IsOptional()
  observaciones?: string;

  @IsEnum(AccionCorrectivaEstado)
  @IsOptional()
  estado?: AccionCorrectivaEstado;

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  porcentajeAvance?: number;
}











