import {
  IsString,
  IsInt,
  IsBoolean,
  IsArray,
  IsOptional,
  IsEnum,
  Min,
  Max,
  ArrayMinSize,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { RolOCIG } from '../entities/configuracion-profesional-ocig.entity';

// Mapa de valores frontend → enum backend
const ROL_MAP: Record<string, RolOCIG> = {
  'Jefe OCI':       RolOCIG.JEFE_OCIG,
  'Jefe OCIG':      RolOCIG.JEFE_OCIG,
  'Auditor Sénior': RolOCIG.AUDITOR_SENIOR,
  'Auditor Senior': RolOCIG.AUDITOR_SENIOR,
  'Auditor':        RolOCIG.AUDITOR,
  'Auditor Júnior': RolOCIG.AUDITOR_JUNIOR,
  'Auditor Junior': RolOCIG.AUDITOR_JUNIOR,
  'Apoyo Técnico':  RolOCIG.APOYO_TECNICO,
  'Apoyo Tecnico':  RolOCIG.APOYO_TECNICO,
  'Profesional OCI': RolOCIG.AUDITOR,
  'Profesional DCI': RolOCIG.AUDITOR,
};

export class CreateConfiguracionProfesionalOCIGDto {
  // Acepta UUID (nuevo) o string numérico legacy — se guarda tal cual en VARCHAR(36)
  @Transform(({ value }) => String(value ?? '').trim())
  @IsString()
  idTercero: string;

  // Acepta tanto rolOcig como rolOCI (alias del frontend)
  @Transform(({ value, obj }) => {
    const raw = value ?? obj['rolOCI'] ?? '';
    return ROL_MAP[raw] ?? raw;
  })
  @IsEnum(RolOCIG)
  rolOcig: RolOCIG;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  especialidades?: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(15)
  capacidadMaximaAuditorias?: number;

  @IsOptional()
  @IsInt()
  @Min(20)
  @Max(250)
  horasMensualesDisponibles?: number;

  @IsOptional()
  @IsBoolean()
  puedeSerLider?: boolean;

  @IsOptional()
  @IsString()
  observaciones?: string;
}

export class UpdateConfiguracionProfesionalOCIGDto {
  @IsOptional()
  @Transform(({ value, obj }) => {
    const raw = value ?? obj['rolOCI'] ?? undefined;
    if (!raw) return undefined;
    return ROL_MAP[raw] ?? raw;
  })
  @IsEnum(RolOCIG)
  rolOcig?: RolOCIG;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  especialidades?: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(15)
  capacidadMaximaAuditorias?: number;

  @IsOptional()
  @IsInt()
  @Min(20)
  @Max(250)
  horasMensualesDisponibles?: number;

  @IsOptional()
  @IsBoolean()
  puedeSerLider?: boolean;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @IsOptional()
  @IsString()
  observaciones?: string;
}

export class ConfiguracionProfesionalOCIGResponseDto {
  id: string;
  idTercero: string;
  rolOcig: RolOCIG;
  especialidades: string[];
  capacidadMaximaAuditorias: number;
  horasMensualesDisponibles: number;
  puedeSerLider: boolean;
  activo: boolean;
  fechaAsignacion: Date;
  observaciones?: string;
  createdAt: Date;
  updatedAt: Date;

  // Datos adicionales del profesional (enriched from auth.personas)
  nombre?: string;
  email?: string;
  identificacion?: string;
  roles?: string[];
}
