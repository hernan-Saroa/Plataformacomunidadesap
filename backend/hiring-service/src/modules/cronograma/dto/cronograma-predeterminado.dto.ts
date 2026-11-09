import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

import { ETAPAS_DEL_CRONOGRAMA } from '../cronograma-etapas';

/** Una fila del cronograma predeterminado de una modalidad (140). */
export class FilaPredeterminadaDto {
  @ApiPropertyOptional({ description: 'Numeral de la actividad del flujo; una propia va sin él' })
  @IsOptional()
  @IsString()
  @Matches(/^\d+\.\d+(\.\d+)?$/, { message: 'El numeral de la actividad no es válido' })
  numeral?: string | null;

  @ApiPropertyOptional({ description: 'Nombre de la actividad propia' })
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'El nombre de la actividad va hasta 200 caracteres' })
  nombre?: string | null;

  @ApiPropertyOptional({ description: 'Etapa (5 a 10) de la actividad propia' })
  @IsOptional()
  @IsIn([...ETAPAS_DEL_CRONOGRAMA], { message: 'Una actividad propia va en una de las etapas 5 a 10' })
  etapa?: number | null;

  @ApiPropertyOptional({ description: 'Día en que empieza, contado desde el día cero' })
  @IsOptional()
  @IsInt({ message: 'El día de inicio es un número entero' })
  @Min(0)
  @Max(730)
  diaInicio?: number | null;

  @ApiProperty({ description: 'Día en que debe estar cumplida, contado desde el día cero' })
  @IsInt({ message: 'El día de fin es un número entero' })
  @Min(0, { message: 'El día de fin va de 0 a 730' })
  @Max(730, { message: 'El día de fin va de 0 a 730' })
  diaFin: number;

  @ApiPropertyOptional({ description: 'Si los días son hábiles o calendario', enum: ['HABILES', 'CALENDARIO'] })
  @IsOptional()
  @IsIn(['HABILES', 'CALENDARIO'], { message: 'Los días son hábiles o calendario' })
  tipoDias?: string | null;

  @ApiPropertyOptional({ description: 'Cuántos días antes del fin se avisa' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(90)
  diasAntes?: number | null;

  @ApiPropertyOptional({ description: 'A quién se avisa', isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4)
  @IsString({ each: true })
  avisarA?: string[] | null;

  @ApiPropertyOptional({ description: 'Por dónde se avisa', enum: ['CAMPANA', 'CORREO', 'AMBOS'] })
  @IsOptional()
  @IsIn(['CAMPANA', 'CORREO', 'AMBOS'], { message: 'El canal es campanita, correo o ambos' })
  canal?: string | null;

  @ApiPropertyOptional({ description: 'Correos adicionales', isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  correos?: string[] | null;

  @ApiPropertyOptional({ description: 'Observación' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  nota?: string | null;
}

export class GuardarPredeterminadoDto {
  /** Todo el predeterminado de la modalidad de una vez: lo que no viene se quita. */
  @ApiProperty({ type: [FilaPredeterminadaDto] })
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => FilaPredeterminadaDto)
  filas: FilaPredeterminadaDto[];
}
