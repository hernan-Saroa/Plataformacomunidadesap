import {
  IsString,
  IsEnum,
  IsInt,
  IsBoolean,
  IsOptional,
  Min,
  Max,
  Length,
} from 'class-validator';

export class UpdateInformeLeyDto {
  @IsString()
  @IsOptional()
  @Length(1, 50)
  codigo?: string;

  @IsString()
  @IsOptional()
  @Length(1, 500)
  nombre?: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsString()
  @IsOptional()
  normativa?: string;

  @IsEnum(['financiero', 'administrativo', 'contractual', 'talento-humano', 'transparencia', 'control'])
  @IsOptional()
  categoria?: 'financiero' | 'administrativo' | 'contractual' | 'talento-humano' | 'transparencia' | 'control';

  @IsEnum(['mensual', 'bimestral', 'trimestral', 'cuatrimestral', 'semestral', 'anual'])
  @IsOptional()
  periodicidad?: 'mensual' | 'bimestral' | 'trimestral' | 'cuatrimestral' | 'semestral' | 'anual';

  @IsInt()
  @Min(1)
  @Max(31)
  @IsOptional()
  diaPresentacion?: number;

  @IsString()
  @IsOptional()
  @Length(1, 500)
  entidadDestino?: string;

  @IsString()
  @IsOptional()
  @Length(1, 255)
  responsable?: string;

  @IsString()
  @IsOptional()
  @Length(1, 255)
  area?: string;

  @IsString()
  @IsOptional()
  @Length(1, 255)
  areaResponsable?: string;

  @IsBoolean()
  @IsOptional()
  tienePlantilla?: boolean;

  @IsString()
  @IsOptional()
  @Length(0, 500)
  urlPlantilla?: string;

  @IsBoolean()
  @IsOptional()
  requiereAprobacion?: boolean;

  @IsInt()
  @Min(1)
  @Max(90)
  @IsOptional()
  diasAnticipacionAlerta?: number;

  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}


