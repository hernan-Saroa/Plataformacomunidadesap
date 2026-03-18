import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateDisciplinaryProcessTaskDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  titulo: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsString()
  @IsIn(['alta', 'media', 'baja'])
  prioridad: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  etapa?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  responsableNombre?: string;

  @IsDateString()
  @IsNotEmpty()
  fechaVencimiento: string;

  @IsOptional()
  @IsString()
  observaciones?: string;
}

export class UpdateDisciplinaryProcessTaskStatusDto {
  @IsBoolean()
  completada: boolean;
}
