import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { FirmaOtpDto } from '../../cierre-actividad/dto/firma-otp.dto';

/**
 * Registro del pago final y la liberacion del saldo (EFDS-1173).
 *
 * Viaja como multipart porque puede llevar el soporte del cierre: mientras no
 * exista la integracion con KLIC, es la unica prueba de que se tramito.
 */
export class CerrarFinancieramenteDto {
  @ApiProperty({ description: 'Referencia con la que salió el pago final' })
  @IsString()
  @IsNotEmpty({ message: 'Registra la referencia del pago final' })
  @MaxLength(120)
  referenciaPagoFinal: string;

  @ApiProperty({ description: 'Fecha del pago final (YYYY-MM-DD)' })
  @IsDateString({}, { message: 'La fecha del pago final debe tener el formato YYYY-MM-DD' })
  fechaPagoFinal: string;

  @ApiPropertyOptional({ description: 'Observaciones del cierre financiero' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observaciones?: string;

  /** Solo si la 10.3 quedó configurada con `EXIGE_FIRMA` (EFDS-2070). */
  @ApiPropertyOptional({ description: 'Evidencia de la firma OTP, si la actividad la exige' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? JSON.parse(value) : value))
  @ValidateNested()
  @Type(() => FirmaOtpDto)
  firma?: FirmaOtpDto;
}

/** Reversion del cierre vigente. */
export class RevertirCierreDto {
  @ApiProperty({ description: 'Por qué se revierte el cierre financiero' })
  @IsString()
  @IsNotEmpty({ message: 'Explica por qué se revierte el cierre financiero' })
  @MinLength(10, {
    message: 'El saldo pudo reintegrarse al presupuesto: sustenta por qué se revierte',
  })
  @MaxLength(1000)
  motivo: string;
}
