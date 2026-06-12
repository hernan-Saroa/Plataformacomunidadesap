import { IsString, IsOptional, IsNumber, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export class ProgramasFiltroDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  nivelFormacion?: string;

  @IsOptional()
  @IsString()
  modalidad?: string;

  @IsOptional()
  @IsString()
  sede?: string;

  @IsOptional()
  @IsString()
  estado?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsString()
  periodoAcademico?: string;
}

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
  horasBasePorCredito?: number;

  @IsOptional()
  @IsNumber()
  horasPregradoCentral?: number;

  @IsOptional()
  @IsString()
  requisitosDeIngreso?: string;

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
  horasBasePorCredito?: number;

  @IsOptional()
  @IsNumber()
  horasPregradoCentral?: number;

  @IsOptional()
  @IsString()
  requisitosDeIngreso?: string;

  @IsOptional()
  @IsString()
  estado?: string;
}