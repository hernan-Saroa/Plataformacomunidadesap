import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

import { TipoSoportePago } from '../../../entities/pago-contrato.entity';
import { FirmaOtpDto } from '../../cierre-actividad/dto/firma-otp.dto';

export const TIPOS_SOPORTE: TipoSoportePago[] = [
  'SEGURIDAD_SOCIAL',
  'RUT',
  'CERTIFICACION_BANCARIA',
  'OTRO',
];

/**
 * Radicacion de la cuenta de cobro (EFDS-1170).
 *
 * Viaja como multipart porque lleva los dos documentos que el criterio de la
 * historia exige: la factura y el informe de actividades.
 */
export class RadicarPagoDto {
  @ApiProperty({ description: 'Inicio del periodo que se cobra (YYYY-MM-DD)' })
  @IsDateString({}, { message: 'El inicio del periodo debe tener el formato YYYY-MM-DD' })
  periodoDesde: string;

  @ApiProperty({ description: 'Fin del periodo que se cobra (YYYY-MM-DD)' })
  @IsDateString({}, { message: 'El fin del periodo debe tener el formato YYYY-MM-DD' })
  periodoHasta: string;

  /** Multipart manda todo como texto: hay que convertirlo antes de validar. */
  @ApiProperty({ description: 'Valor cobrado, en pesos' })
  @Type(() => Number)
  @IsNumber({}, { message: 'El valor cobrado debe ser un número' })
  @IsPositive({ message: 'El valor cobrado debe ser mayor que cero' })
  valor: number;
}

/** Aval del supervisor sobre una cuenta radicada. */
export class AvalarPagoDto {
  @ApiPropertyOptional({ description: 'Observación del supervisor al avalar' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observacion?: string;
}

/** Devolucion al contratista para que corrija. */
export class DevolverPagoDto {
  @ApiProperty({ description: 'Que debe corregir el contratista' })
  @IsString()
  @IsNotEmpty({ message: 'Di qué debe corregir el contratista' })
  @MinLength(10, {
    message: 'El motivo dice qué corregir: sin eso la devolución no le sirve al contratista',
  })
  @MaxLength(1000)
  motivo: string;
}

/** Tramite del pago por la Direccion Financiera. */
export class TramitarPagoDto {
  @ApiProperty({ description: 'Referencia con la que se tramitó el pago' })
  @IsString()
  @IsNotEmpty({ message: 'Registra la referencia con la que se tramitó el pago' })
  @MaxLength(120)
  referenciaPago: string;

  /** Solo si la 9.4 quedó configurada con `EXIGE_FIRMA` (EFDS-2070). */
  @ApiPropertyOptional({ description: 'Evidencia de la firma OTP, si la actividad la exige' })
  @IsOptional()
  @ValidateNested()
  @Type(() => FirmaOtpDto)
  firma?: FirmaOtpDto;
}

/** Anulacion de una cuenta que no debio radicarse. */
export class AnularPagoDto {
  @ApiProperty({ description: 'Por qué se anula la cuenta de cobro' })
  @IsString()
  @IsNotEmpty({ message: 'Explica por qué se anula la cuenta de cobro' })
  @MinLength(10, { message: 'El motivo explica el salto en el consecutivo del contrato' })
  @MaxLength(1000)
  motivo: string;
}

/** Soporte que acompana la cuenta de cobro. */
export class CargarSoporteDto {
  @ApiProperty({ description: 'Que documento se adjunta', enum: TIPOS_SOPORTE })
  @IsIn(TIPOS_SOPORTE, {
    message: 'El soporte es seguridad social, RUT, certificación bancaria u otro',
  })
  tipo: TipoSoportePago;

  @ApiPropertyOptional({ description: 'Detalle del soporte, útil sobre todo en OTRO' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  descripcion?: string;
}
