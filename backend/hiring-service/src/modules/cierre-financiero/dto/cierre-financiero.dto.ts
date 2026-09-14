import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Registro del pago final y la liberacion del saldo (EFDS-1173).
 *
 * Viaja como multipart porque puede llevar el soporte del cierre: mientras no
 * exista la integracion con KLIC, es la unica prueba de que se tramito.
 */
export class CerrarFinancieramenteDto {
  @ApiProperty({ description: 'Referencia con la que salio el pago final' })
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
}

/** Reversion del cierre vigente. */
export class RevertirCierreDto {
  @ApiProperty({ description: 'Por que se revierte el cierre financiero' })
  @IsString()
  @IsNotEmpty({ message: 'Explica por que se revierte el cierre financiero' })
  @MinLength(10, {
    message: 'El saldo pudo reintegrarse al presupuesto: sustenta por que se revierte',
  })
  @MaxLength(1000)
  motivo: string;
}
