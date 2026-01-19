import { IsEnum, IsString, IsOptional } from 'class-validator';
import { EstadoValidacion } from '../entities/evidencia-documento.entity';

export class ValidarEvidenciaDto {
  @IsEnum(EstadoValidacion)
  estadoValidacion: EstadoValidacion;

  @IsString()
  @IsOptional()
  observacionesValidacion?: string;
}
