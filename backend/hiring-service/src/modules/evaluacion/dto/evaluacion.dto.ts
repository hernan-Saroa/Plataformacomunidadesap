import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class ResultadoCriterioDto {
  @ApiProperty({ description: 'Criterio del catálogo que se está calificando' })
  @IsUUID('4', { message: 'Cada resultado se refiere a un criterio del catálogo' })
  criterioId: string;

  /** En los habilitantes: si la oferta sigue en carrera. */
  @ApiPropertyOptional({ description: 'Solo en criterios habilitantes' })
  @IsOptional()
  @IsBoolean({ message: 'Un criterio habilitante se cumple o no se cumple' })
  cumple?: boolean;

  /** En los ponderables: cuánto suma, hasta el máximo del criterio. */
  @ApiPropertyOptional({ description: 'Solo en criterios ponderables' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El puntaje debe ser un número' })
  @Min(0, { message: 'El puntaje no puede ser negativo' })
  puntaje?: number;

  /**
   * Lo que sustenta el juicio.
   *
   * Opcional en general y exigido por el servicio cuando el criterio no se
   * cumple: quedar fuera sin motivo escrito es lo que el oferente reclama.
   */
  @ApiPropertyOptional({ description: 'Sustento del juicio' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observacion?: string;
}

export class EvaluarOfertaDto {
  @ApiProperty({
    description: 'Dimensión que se evalúa',
    enum: ['JURIDICO', 'FINANCIERO', 'TECNICO'],
  })
  @IsIn(['JURIDICO', 'FINANCIERO', 'TECNICO'], {
    message:
      'La dimensión es JURIDICO, FINANCIERO o TECNICO. La económica se calcula sobre el valor ofertado, no se registra',
  })
  dimension: 'JURIDICO' | 'FINANCIERO' | 'TECNICO';

  /**
   * Todos los criterios de la dimensión, en una sola petición.
   *
   * Evaluar es un juicio completo sobre una dimensión y no un criterio suelto:
   * media evaluación guardada se leería como una evaluación con criterios
   * incumplidos, que no es lo mismo que una sin terminar.
   */
  @ApiProperty({ description: 'Resultado de cada criterio de la dimensión', type: [ResultadoCriterioDto] })
  @IsArray({ message: 'Los resultados deben venir como una lista' })
  @ArrayMinSize(1, { message: 'Una evaluación necesita al menos un criterio' })
  @ValidateNested({ each: true })
  @Type(() => ResultadoCriterioDto)
  resultados: ResultadoCriterioDto[];
}
