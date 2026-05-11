import { IsString, IsOptional, IsNumber, IsObject } from 'class-validator';

export class CreateProgramaDto {
  @IsString()
  codigo: string;

  @IsString()
  nombre: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  nivelFormacion?: string;

  @IsOptional()
  @IsString()
  facultad?: string;

  @IsOptional()
  @IsString()
  modalidad?: string;

  @IsOptional()
  @IsNumber()
  duracion?: number;

  @IsOptional()
  @IsNumber()
  creditos?: number;

  @IsOptional()
  @IsNumber()
  costoMatricula?: number;

  @IsOptional()
  @IsString()
  requisitosDeIngreso?: string;

  @IsOptional()
  @IsString()
  jornada?: string;

  @IsOptional()
  @IsString()
  sede?: string;

  @IsOptional()
  @IsObject()
  registroCalificado?: any;

  @IsOptional()
  @IsString()
  perfilEgresado?: string;

  @IsOptional()
  @IsString()
  estado?: string;
}

export class UpdateProgramaDto {
  @IsOptional()
  @IsString()
  codigo?: string;

  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  nivelFormacion?: string;

  @IsOptional()
  @IsString()
  facultad?: string;

  @IsOptional()
  @IsString()
  modalidad?: string;

  @IsOptional()
  @IsNumber()
  duracion?: number;

  @IsOptional()
  @IsNumber()
  creditos?: number;

  @IsOptional()
  @IsNumber()
  costoMatricula?: number;

  @IsOptional()
  @IsString()
  requisitosDeIngreso?: string;

  @IsOptional()
  @IsString()
  jornada?: string;

  @IsOptional()
  @IsString()
  sede?: string;

  @IsOptional()
  @IsObject()
  registroCalificado?: any;

  @IsOptional()
  @IsString()
  perfilEgresado?: string;

  @IsOptional()
  @IsString()
  estado?: string;
}