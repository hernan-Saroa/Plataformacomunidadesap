import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  Min,
  Max,
  Length,
} from 'class-validator';

export class CreateTarifaRegionalExcepcionDto {
  @IsString()
  @Length(1, 100)
  departamento: string;

  @IsBoolean()
  esNuevoDepartamento: boolean;

  @IsNumber()
  @Min(0)
  tarifaDiaria: number;

  @IsOptional()
  @IsString()
  @Length(0, 100)
  decretoReferencia?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

export class UpdateTarifaRegionalExcepcionDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  departamento?: string;

  @IsOptional()
  @IsBoolean()
  esNuevoDepartamento?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tarifaDiaria?: number;

  @IsOptional()
  @IsString()
  @Length(0, 100)
  decretoReferencia?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
