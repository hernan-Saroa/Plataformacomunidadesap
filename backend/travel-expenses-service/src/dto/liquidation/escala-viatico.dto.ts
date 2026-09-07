import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  Min,
  Max,
  Length,
} from 'class-validator';

export class CreateEscalaViaticoDto {
  @IsString()
  @Length(1, 50)
  decretoVigente: string;

  @IsNumber()
  @Min(2000)
  @Max(2100)
  anoVigencia: number;

  @IsNumber()
  @Min(0)
  rangoMinimo: number;

  @IsNumber()
  @Min(0)
  rangoMaximo: number;

  @IsNumber()
  @Min(0)
  tarifaDiaria: number;
}

export class UpdateEscalaViaticoDto {
  @IsOptional()
  @IsString()
  @Length(1, 50)
  decretoVigente?: string;

  @IsOptional()
  @IsNumber()
  @Min(2000)
  @Max(2100)
  anoVigencia?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  rangoMinimo?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  rangoMaximo?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tarifaDiaria?: number;
}
