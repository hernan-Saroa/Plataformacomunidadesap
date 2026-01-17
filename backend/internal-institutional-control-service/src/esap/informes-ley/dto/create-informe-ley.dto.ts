import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsInt,
  IsBoolean,
  IsOptional,
  Min,
  Max,
  Length,
} from 'class-validator';

export class CreateInformeLeyDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  codigo: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 500)
  nombre: string;

  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @IsString()
  @IsOptional()
  normativa?: string;

  @IsEnum(['financiero', 'administrativo', 'contractual', 'talento-humano', 'transparencia', 'control'])
  @IsNotEmpty()
  categoria: 'financiero' | 'administrativo' | 'contractual' | 'talento-humano' | 'transparencia' | 'control';

  @IsEnum(['mensual', 'bimestral', 'trimestral', 'cuatrimestral', 'semestral', 'anual'])
  @IsNotEmpty()
  periodicidad: 'mensual' | 'bimestral' | 'trimestral' | 'cuatrimestral' | 'semestral' | 'anual';

  @IsInt()
  @Min(1)
  @Max(31)
  @IsNotEmpty()
  diaPresentacion: number;

  @IsOptional()
  @IsString()
  @Length(1, 500)
  entidadDestino?: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  responsable: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  area: string;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  areaResponsable?: string;

  @IsOptional()
  @IsBoolean()
  tienePlantilla?: boolean;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  urlPlantilla?: string;

  @IsOptional()
  @IsBoolean()
  requiereAprobacion?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(90)
  diasAnticipacionAlerta?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

