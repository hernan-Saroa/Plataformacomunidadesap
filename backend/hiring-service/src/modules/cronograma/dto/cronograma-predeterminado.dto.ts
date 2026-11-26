import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsString, Matches, MaxLength, ValidateNested } from 'class-validator';

import { ETAPAS_DEL_CRONOGRAMA } from '../cronograma-etapas';

/** Una actividad propia que sale por defecto en el cronograma (140). */
export class PropiaPredeterminadaDto {
  @ApiProperty({ description: 'Nombre de la actividad propia' })
  @IsString()
  @MaxLength(200, { message: 'El nombre de la actividad va hasta 200 caracteres' })
  nombre: string;

  @ApiProperty({ description: 'Etapa (5 a 10) en que va' })
  @IsIn([...ETAPAS_DEL_CRONOGRAMA], { message: 'Una actividad propia va en una de las etapas 5 a 10' })
  etapa: number;
}

/** Qué etapas y actividades salen por defecto en el cronograma de la modalidad (144). */
export class GuardarPredeterminadoDto {
  @ApiProperty({ description: 'Etapas macro que salen', isArray: true, type: Number })
  @IsArray()
  @ArrayMaxSize(6)
  @IsIn([...ETAPAS_DEL_CRONOGRAMA], { each: true, message: 'Las etapas del cronograma van de la 5 a la 10' })
  etapas: number[];

  @ApiProperty({ description: 'Numerales de las actividades del flujo que salen', isArray: true, type: String })
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  @Matches(/^\d+\.\d+(\.\d+)?$/, { each: true, message: 'El numeral de la actividad no es válido' })
  numerales: string[];

  @ApiProperty({ type: [PropiaPredeterminadaDto] })
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => PropiaPredeterminadaDto)
  propias: PropiaPredeterminadaDto[];
}
