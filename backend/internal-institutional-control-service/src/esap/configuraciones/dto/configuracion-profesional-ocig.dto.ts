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
import { RolOCIG } from '../entities/configuracion-profesional-ocig.entity';

export class CreateConfiguracionProfesionalOCIGDto {
  @IsInt()
  idTercero: number;

  @IsEnum(RolOCIG)
  rolOcig: RolOCIG;

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  especialidades: string[];

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
  idTercero: number;
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
}
