import { IsDateString, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateDisciplinaryProcessActuacionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  tipo: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  etapa?: string;

  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  responsableNombre: string;

  @IsDateString()
  @IsNotEmpty()
  fechaActuacion: string;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
