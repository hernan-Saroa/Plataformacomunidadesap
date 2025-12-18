import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsEnum,
  Min,
  Max,
  IsArray,
} from 'class-validator';

export class CreateRegistroSeguimientoDto {
  @IsString()
  @IsNotEmpty()
  accionDescripcion: string;

  @IsInt()
  @Min(1)
  accionesProgramadas: number;

  @IsInt()
  @Min(0)
  accionesImplementadas: number;

  @IsEnum(['SI', 'NO', 'PARCIAL'])
  controlesImplementados: 'SI' | 'NO' | 'PARCIAL';

  @IsEnum(['SI', 'NO'])
  hallazgoSeRepite: 'SI' | 'NO';

  @IsString()
  @IsOptional()
  observaciones?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  evidencias?: string[];
}











