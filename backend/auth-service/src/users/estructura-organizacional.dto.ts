import { IsString, IsOptional, IsNumber, MaxLength, IsEmail, IsBoolean, IsArray, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

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
  @IsNumber()
  idUbiSeccional?: number;

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
  @IsNumber()
  idUbiSeccional?: number;

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
  @IsNumber()
  idGeopolitica?: number;

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
  @IsNumber()
  idGeopolitica?: number;

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

// ==================== DEPENDENCIA DTOs (transversal) ====================

/**
 * DTO para crear una dependencia en la tabla maestra
 * `auth.dependencias`. Los campos base (codDependencia, nomDependencia)
 * son obligatorios; el resto son opcionales.
 *
 * Esta API es transversal: la consumen el módulo de viáticos (cupo
 * presupuestal de tiquetes), el de estructura organizacional, control
 * interno, etc.
 */
export class CreateDependenciaDto {
  @IsString()
  @MaxLength(20, { message: 'El código de dependencia no puede exceder 20 caracteres' })
  codDependencia: string;

  @IsString()
  @MaxLength(250, { message: 'El nombre de dependencia no puede exceder 250 caracteres' })
  nomDependencia: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  dirDependencia?: string;

  @IsOptional()
  @IsEmail({}, { message: 'El email institucional no es válido' })
  @MaxLength(250)
  dirEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  urlDependencia?: string;

  @IsOptional()
  @IsNumber()
  idGeopolitica?: number;

  @IsOptional()
  @IsNumber()
  idSede?: number;

  @IsOptional()
  @IsNumber()
  idCargo?: number;

  @IsOptional()
  @IsNumber()
  idTercero?: number;

  @IsOptional()
  @IsNumber()
  tipUnidad?: number;

  @IsOptional()
  @IsString()
  @MaxLength(6)
  genTipUnidad?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

export class UpdateDependenciaDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  codDependencia?: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  nomDependencia?: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  dirDependencia?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(250)
  dirEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  urlDependencia?: string;

  @IsOptional()
  @IsNumber()
  idGeopolitica?: number;

  @IsOptional()
  @IsNumber()
  idSede?: number;

  @IsOptional()
  @IsNumber()
  idCargo?: number;

  @IsOptional()
  @IsNumber()
  idTercero?: number;

  @IsOptional()
  @IsNumber()
  tipUnidad?: number;

  @IsOptional()
  @IsString()
  @MaxLength(6)
  genTipUnidad?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

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

export class BulkToggleSedePeriodStatusDto {
  @IsString()
  @IsNotEmpty()
  periodoCodigo: string;

  @IsBoolean()
  activo: boolean;

  // Opcional: si se omite, aplica a TODAS las sedes del catálogo.
  // @Type fuerza la conversión de cada elemento a número (los ids llegan como
  // string porque la columna id_sede es bigint).
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsNumber({}, { each: true })
  idSedes?: number[];
}
