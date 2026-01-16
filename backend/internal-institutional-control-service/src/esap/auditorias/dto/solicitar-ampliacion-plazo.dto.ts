import { IsString, IsNotEmpty, IsDateString, MinLength } from 'class-validator';

/**
 * DTO para solicitar ampliación de plazo de una auditoría en curso
 */
export class SolicitarAmpliacionPlazoDto {
  @IsDateString()
  @IsNotEmpty()
  nuevaFechaFin: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(20, { message: 'La justificación debe tener al menos 20 caracteres' })
  justificacion: string;
}

