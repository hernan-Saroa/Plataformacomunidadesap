import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsInt,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';

export class CreateReglaAlertaDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsInt()
  @Min(1)
  @Max(30)
  diasAnticipacion: number;

  @IsBoolean()
  activa: boolean;

  @IsBoolean()
  enviarEmail: boolean;

  @IsBoolean()
  mostrarPanel: boolean;

  @IsOptional()
  @IsString()
  descripcion?: string;
}

export class UpdateReglaAlertaDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  diasAnticipacion?: number;

  @IsOptional()
  @IsBoolean()
  activa?: boolean;

  @IsOptional()
  @IsBoolean()
  enviarEmail?: boolean;

  @IsOptional()
  @IsBoolean()
  mostrarPanel?: boolean;

  @IsOptional()
  @IsString()
  descripcion?: string;
}


