import { IsString, IsNotEmpty, MinLength } from 'class-validator';

/**
 * DTO para rechazar una solicitud de ampliación de plazo
 */
export class RechazarAmpliacionPlazoDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(20, { message: 'La justificación del rechazo debe tener al menos 20 caracteres' })
  justificacion: string;
}

