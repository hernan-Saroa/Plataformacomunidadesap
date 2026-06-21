import { IsString, IsOptional, IsNumber, MaxLength, IsEmail, IsBoolean, IsArray, IsNotEmpty } from 'class-validator';

// ==================== SECCIONAL DTOs ====================

export class CreateSeccionalDto {
  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'El código de seccional no puede exceder 20 caracteres' })
  codSeccional?: string;

  @IsString()
  @MaxLength(100, { message: 'El nombre de seccional no puede exceder 100 caracteres' })
  nomSeccional: string;

  @IsOptional()
  @IsNumber()
  ordenVisualizacion?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

export class UpdateSeccionalDto {
  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'El código de seccional no puede exceder 20 caracteres' })
  codSeccional?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'El nombre de seccional no puede exceder 100 caracteres' })
  nomSeccional?: string;

  @IsOptional()
  @IsNumber()
  ordenVisualizacion?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

// ==================== SEDE DTOs ====================

export class CreateSedeDto {
  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'El código de sede no puede exceder 20 caracteres' })
  codSede?: string;

  @IsString()
  @MaxLength(50, { message: 'El nombre de sede no puede exceder 50 caracteres' })
  nomSede: string;

  @IsOptional()
  @IsNumber()
  idSeccional?: number;

  @IsOptional()
  @IsString()
  tipo?: string;

  @IsOptional()
  @IsNumber()
  latitud?: number;

  @IsOptional()
  @IsNumber()
  longitud?: number;

  @IsOptional()
  @IsString()
  @MaxLength(30, { message: 'El estado no puede exceder 30 caracteres' })
  sedeAct?: string;
}

export class UpdateSedeDto {
  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'El código de sede no puede exceder 20 caracteres' })
  codSede?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'El nombre de sede no puede exceder 50 caracteres' })
  nomSede?: string;

  @IsOptional()
  @IsNumber()
  idSeccional?: number;

  @IsOptional()
  @IsString()
  tipo?: string;

  @IsOptional()
  @IsNumber()
  latitud?: number;

  @IsOptional()
  @IsNumber()
  longitud?: number;

  @IsOptional()
  @IsString()
  @MaxLength(30, { message: 'El estado no puede exceder 30 caracteres' })
  sedeAct?: string;
}

// ==================== ASIGNACIÓN DE USUARIOS DTOs ====================

export class AsignarUsuariosDto {
  @IsArray()
  @IsNotEmpty({ each: true })
  ids: string[];

  @IsString()
  @IsNotEmpty()
  territorialId: string;

  @IsString()
  @IsOptional()
  cetapId?: string;
}

export class ToggleSedePeriodStatusDto {
  @IsString()
  @IsNotEmpty()
  periodoCodigo: string;

  @IsBoolean()
  activo: boolean;
}
