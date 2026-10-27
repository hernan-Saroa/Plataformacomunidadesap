import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsIn,
  IsDateString,
  IsNumber,
} from 'class-validator';

export class CreateTrdDto {
  @IsString()
  @IsNotEmpty()
  version: string;

  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsIn(['TRD', 'TVD'])
  tipo: 'TRD' | 'TVD';

  @IsDateString()
  @IsNotEmpty()
  fechaInicio: string;

  @IsDateString()
  @IsOptional()
  fechaFin?: string | null;

  @IsString()
  @IsNotEmpty()
  actoAdministrativo: string;

  @IsString()
  @IsNotEmpty()
  convalidacionEstado: string;

  @IsString()
  @IsOptional()
  descripcion?: string | null;

  @IsBoolean()
  @IsOptional()
  activo?: boolean;

  @IsBoolean()
  @IsOptional()
  esVigente?: boolean;
}

export class UpdateTrdDto {
  @IsString()
  @IsOptional()
  version?: string;

  @IsString()
  @IsOptional()
  nombre?: string;

  @IsString()
  @IsIn(['TRD', 'TVD'])
  @IsOptional()
  tipo?: 'TRD' | 'TVD';

  @IsDateString()
  @IsOptional()
  fechaInicio?: string;

  @IsDateString()
  @IsOptional()
  fechaFin?: string | null;

  @IsString()
  @IsOptional()
  actoAdministrativo?: string;

  @IsString()
  @IsOptional()
  convalidacionEstado?: string;

  @IsString()
  @IsOptional()
  descripcion?: string | null;

  @IsBoolean()
  @IsOptional()
  activo?: boolean;

  @IsBoolean()
  @IsOptional()
  esVigente?: boolean;
}

export class CreateTrdSerieSubserieDto {
  @IsNumber()
  @IsOptional()
  trdId?: number;

  @IsString()
  @IsNotEmpty()
  codigoDependencia: string;

  @IsString()
  @IsOptional()
  nombreDependencia?: string;

  @IsString()
  @IsNotEmpty()
  codigoSerie: string;

  @IsString()
  @IsNotEmpty()
  nombreSerie: string;

  @IsString()
  @IsNotEmpty()
  codigoSubserie: string;

  @IsString()
  @IsNotEmpty()
  nombreSubserie: string;

  @IsString()
  @IsOptional()
  codigoIdentificacionExpediente?: string | null;

  @IsString()
  @IsOptional()
  modulo?: string;

  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}

export class UpdateTrdSerieSubserieDto {
  @IsString()
  @IsOptional()
  codigoDependencia?: string;

  @IsString()
  @IsOptional()
  nombreDependencia?: string;

  @IsString()
  @IsOptional()
  codigoSerie?: string;

  @IsString()
  @IsOptional()
  nombreSerie?: string;

  @IsString()
  @IsOptional()
  codigoSubserie?: string;

  @IsString()
  @IsOptional()
  nombreSubserie?: string;

  @IsString()
  @IsOptional()
  codigoIdentificacionExpediente?: string | null;

  @IsString()
  @IsOptional()
  modulo?: string;

  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}
