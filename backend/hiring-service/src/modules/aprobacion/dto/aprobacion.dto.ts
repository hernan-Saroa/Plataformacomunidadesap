import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/** Lo que acompaña a la decisión sobre una actividad. */
export class DecidirAprobacionDto {
  @ApiPropertyOptional({
    description:
      'Qué debe corregirse. Obligatorias al devolver —sin ellas quien la trabajó no sabe qué cambiar— y opcionales al aprobar.',
    example: 'Falta el análisis del sector: el estudio de mercado solo trae dos cotizaciones.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observaciones?: string;
}
