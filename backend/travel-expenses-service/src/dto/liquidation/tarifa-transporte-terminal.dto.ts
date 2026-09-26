import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  Min,
  MaxLength,
} from 'class-validator';

export class CreateTarifaTransporteTerminalDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  departamento?: string;

  @IsOptional()
  @IsNumber()
  departamentoId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  ciudad?: string;

  @IsString()
  @MaxLength(150)
  ciudadAeropuerto: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  valorMaximo: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

export class UpdateTarifaTransporteTerminalDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  departamento?: string;

  @IsOptional()
  @IsNumber()
  departamentoId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  ciudad?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  ciudadAeropuerto?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  valorMaximo?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
