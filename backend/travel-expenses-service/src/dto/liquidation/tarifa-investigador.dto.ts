import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  Min,
  Length,
} from 'class-validator';

export class CreateTarifaInvestigadorDto {
  @IsString()
  @Length(1, 50)
  categoriaInvestigador: string;

  @IsNumber()
  @Min(0)
  tarifaDiaria: number;
}

export class UpdateTarifaInvestigadorDto {
  @IsOptional()
  @IsString()
  @Length(1, 50)
  categoriaInvestigador?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tarifaDiaria?: number;
}
