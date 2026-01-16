import { IsString, IsNotEmpty, IsOptional, MinLength } from 'class-validator';

/**
 * DTO para aprobar o rechazar una solicitud de ampliación de plazo
 */
export class AprobarAmpliacionPlazoDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @MinLength(10, { message: 'Los comentarios deben tener al menos 10 caracteres' })
  comentarios?: string;
}

