import { IsString, IsNotEmpty, IsDateString, IsInt, Min } from 'class-validator';

export class AmpliarPlazoDto {
  @IsString()
  @IsNotEmpty()
  justificacion: string;

  @IsDateString()
  @IsNotEmpty()
  fechaLimiteNueva: string;

  @IsInt()
  @Min(1)
  duracionDiasNueva: number;

  @IsString()
  @IsNotEmpty()
  autorizadoPor: string;
}

