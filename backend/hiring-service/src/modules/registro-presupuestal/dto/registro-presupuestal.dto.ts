import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { FirmaDelMultipart, FirmaOtpDto } from '../../cierre-actividad/dto/firma-otp.dto';

/**
 * Los numeros llegan como texto cuando la peticion viaja como multipart —la
 * expedicion lleva el soporte adjunto—, asi que se convierten antes de validar.
 */
const aNumero = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() !== '' ? Number(value) : value;

/** Radicacion de la solicitud ante la Direccion Financiera. */
export class SolicitarRpDto {
  @ApiPropertyOptional({ description: 'Rubro presupuestal al que se imputa' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  rubro?: string;

  @ApiPropertyOptional({
    description: 'Valor a comprometer. Si se omite se toma el del contrato.',
  })
  @IsOptional()
  @Transform(aNumero)
  @IsNumber({}, { message: 'El valor debe ser un número' })
  @IsPositive({ message: 'El valor debe ser mayor que cero' })
  valor?: number;

  @ApiPropertyOptional({ description: 'Vigencia fiscal a la que se imputa' })
  @IsOptional()
  @Transform(aNumero)
  @IsInt({ message: 'La vigencia fiscal se expresa en años' })
  @Min(2020)
  @Max(2100)
  vigenciaFiscal?: number;
}

/**
 * Expedicion del registro presupuestal.
 *
 * El numero y la fecha no son opcionales: son lo que hace verificable el
 * compromiso ante los entes de control.
 */
export class ExpedirRpDto {
  @ApiProperty({ description: 'Número del registro presupuestal' })
  @IsString()
  @IsNotEmpty({ message: 'El registro presupuestal necesita su número' })
  @MaxLength(60)
  numero: string;

  @ApiProperty({ description: 'Valor comprometido en pesos' })
  @Transform(aNumero)
  @IsNumber({}, { message: 'El valor comprometido debe ser un número' })
  @IsPositive({ message: 'El valor comprometido debe ser mayor que cero' })
  valor: number;

  @ApiProperty({ description: 'Fecha de expedición (YYYY-MM-DD)' })
  @IsDateString({}, { message: 'La fecha de expedición debe tener el formato YYYY-MM-DD' })
  fechaExpedicion: string;

  @ApiPropertyOptional({ description: 'Rubro presupuestal al que se imputa' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  rubro?: string;

  @ApiPropertyOptional({ description: 'Vigencia fiscal a la que se imputa' })
  @IsOptional()
  @Transform(aNumero)
  @IsInt({ message: 'La vigencia fiscal se expresa en años' })
  @Min(2020)
  @Max(2100)
  vigenciaFiscal?: number;

  /** Solo si la 8.3 quedo configurada con `EXIGE_FIRMA` (EFDS-2070). */
  @ApiPropertyOptional({ description: 'Evidencia de la firma OTP, si la actividad la exige' })
  @IsOptional()
  @FirmaDelMultipart()
  @ValidateNested()
  @Type(() => FirmaOtpDto)
  firma?: FirmaOtpDto;
}

/** Rechazo con su motivo: sin el, quien solicita no sabe que corregir. */
export class RechazarRpDto {
  @ApiProperty({ description: 'Por qué no hay disponibilidad para comprometer' })
  @IsString()
  @IsNotEmpty({ message: 'Explica por qué se rechaza el registro presupuestal' })
  @MinLength(10, { message: 'El motivo debe explicar el rechazo, no una palabra suelta' })
  @MaxLength(1000)
  observaciones: string;
}

/**
 * El RP ya expedido, como lo entregó la Dirección Financiera (revisión de QA
 * de EFDS-1163): el abogado lo solicita por el canal de siempre y solo carga
 * el resultado, igual que el CDP desde la 103.
 */
export class CargarRpDto {
  @ApiPropertyOptional({
    description: 'Rubro presupuestal; si no se dice, el del CDP',
    example: 'A-02-02-02-008',
  })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  rubro?: string;

  @ApiProperty({ description: 'Número del RP', example: 'RP-2026-0123' })
  @IsString()
  @IsNotEmpty({ message: 'El número del RP es obligatorio' })
  @MaxLength(60)
  numero: string;

  @ApiProperty({ description: 'Valor comprometido, en pesos', example: 45000000 })
  @Transform(aNumero)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El valor debe ser un número' })
  @IsPositive({ message: 'El valor del RP debe ser mayor que cero' })
  valor: number;

  @ApiProperty({ description: 'Fecha de expedición (YYYY-MM-DD)', example: '2026-10-20' })
  @IsDateString({}, { message: 'La fecha debe tener formato YYYY-MM-DD' })
  fechaExpedicion: string;

  @ApiPropertyOptional({ description: 'Vigencia fiscal', example: 2026 })
  @IsOptional()
  @Transform(aNumero)
  @IsInt()
  @Min(2000)
  vigenciaFiscal?: number;

  @ApiPropertyOptional({ description: 'Evidencia de la firma OTP, si la actividad la exige' })
  @IsOptional()
  @FirmaDelMultipart()
  @ValidateNested()
  @Type(() => FirmaOtpDto)
  firma?: FirmaOtpDto;
}
