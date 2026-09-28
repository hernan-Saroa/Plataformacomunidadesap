import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';

import { FirmaOtpDto } from '../../cierre-actividad/dto/firma-otp.dto';

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

  /**
   * Solo al aprobar y solo si la actividad quedó configurada con
   * `EXIGE_FIRMA` (EFDS-2070). Es la firma de quien aprueba, distinta de la de
   * quien envió.
   */
  @ApiPropertyOptional({ description: 'Evidencia de la firma OTP, si la actividad la exige' })
  @IsOptional()
  @ValidateNested()
  @Type(() => FirmaOtpDto)
  firma?: FirmaOtpDto;
}
