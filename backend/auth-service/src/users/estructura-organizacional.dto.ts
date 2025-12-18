import { IsString, IsOptional, IsNumber, MaxLength, IsEmail, IsBoolean } from 'class-validator';

// ==================== SECCIONAL DTOs ====================

export class CreateSeccionalDto {
  @IsOptional()
  @IsString()
  @MaxLength(5, { message: 'El código de seccional no puede exceder 5 caracteres' })
  codSeccional?: string;

  @IsString()
  @MaxLength(100, { message: 'El nombre de seccional no puede exceder 100 caracteres' })
  nomSeccional: string;

  @IsOptional()
  @IsNumber()
  idUbiSeccional?: number;
}

export class UpdateSeccionalDto {
  @IsOptional()
  @IsString()
  @MaxLength(5, { message: 'El código de seccional no puede exceder 5 caracteres' })
  codSeccional?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'El nombre de seccional no puede exceder 100 caracteres' })
  nomSeccional?: string;

  @IsOptional()
  @IsNumber()
  idUbiSeccional?: number;
}

// ==================== SEDE DTOs ====================

export class CreateSedeDto {
  @IsOptional()
  @IsString()
  @MaxLength(5, { message: 'El código de sede no puede exceder 5 caracteres' })
  codSede?: string;

  @IsString()
  @MaxLength(50, { message: 'El nombre de sede no puede exceder 50 caracteres' })
  nomSede: string;

  @IsOptional()
  @IsNumber()
  idGeopolitica?: number;

  @IsOptional()
  @IsNumber()
  idSeccional?: number;

  @IsOptional()
  @IsString()
  @MaxLength(250, { message: 'La dirección no puede exceder 250 caracteres' })
  dirSede?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'El teléfono no puede exceder 50 caracteres' })
  telSede?: string;

  @IsOptional()
  @IsEmail({}, { message: 'El email debe tener un formato válido' })
  @MaxLength(100, { message: 'El email no puede exceder 100 caracteres' })
  emailSede?: string;

  @IsOptional()
  @IsNumber()
  capacidadEstudiantes?: number;

  @IsOptional()
  @IsNumber()
  capacidadDocentes?: number;

  @IsOptional()
  @IsString()
  @MaxLength(30, { message: 'El estado no puede exceder 30 caracteres' })
  sedeAct?: string;

  @IsOptional()
  @IsBoolean()
  permiteInscripciones?: boolean;

  @IsOptional()
  @IsBoolean()
  permiteMatriculas?: boolean;

  @IsOptional()
  @IsBoolean()
  visiblePortal?: boolean;

  @IsOptional()
  @IsString()
  observaciones?: string;
}

export class UpdateSedeDto {
  @IsOptional()
  @IsString()
  @MaxLength(5, { message: 'El código de sede no puede exceder 5 caracteres' })
  codSede?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'El nombre de sede no puede exceder 50 caracteres' })
  nomSede?: string;

  @IsOptional()
  @IsNumber()
  idGeopolitica?: number;

  @IsOptional()
  @IsNumber()
  idSeccional?: number;

  @IsOptional()
  @IsString()
  @MaxLength(250, { message: 'La dirección no puede exceder 250 caracteres' })
  dirSede?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'El teléfono no puede exceder 50 caracteres' })
  telSede?: string;

  @IsOptional()
  @IsEmail({}, { message: 'El email debe tener un formato válido' })
  @MaxLength(100, { message: 'El email no puede exceder 100 caracteres' })
  emailSede?: string;

  @IsOptional()
  @IsNumber()
  capacidadEstudiantes?: number;

  @IsOptional()
  @IsNumber()
  capacidadDocentes?: number;

  @IsOptional()
  @IsString()
  @MaxLength(30, { message: 'El estado no puede exceder 30 caracteres' })
  sedeAct?: string;

  @IsOptional()
  @IsBoolean()
  permiteInscripciones?: boolean;

  @IsOptional()
  @IsBoolean()
  permiteMatriculas?: boolean;

  @IsOptional()
  @IsBoolean()
  visiblePortal?: boolean;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
