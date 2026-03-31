import { IsString, IsOptional, IsIn, MinLength } from 'class-validator';

export class RegistrarVerificacionOciDto {
  @IsString()
  @IsIn(['cumplida', 'parcial', 'incumplida'])
  estadoVerificacionOci: 'cumplida' | 'parcial' | 'incumplida';

  @IsString()
  @MinLength(1, { message: 'La evidencia verificada es obligatoria' })
  evidenciaVerificada: string;

  @IsString()
  @IsOptional()
  observacionOci?: string;
}
