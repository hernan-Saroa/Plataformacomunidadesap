import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

import { FirmaDelMultipart, FirmaOtpDto } from '../../cierre-actividad/dto/firma-otp.dto';

/**
 * Actividad 4.2 · el CDP que el área carga, con el certificado en el multipart.
 *
 * Llega como texto: un multipart no tiene números ni objetos, así que el
 * valor, la vigencia y la firma se convierten antes de validarlos.
 */
export class CargarCdpDto {
  @ApiProperty({ description: 'Rubro presupuestal que afecta', example: 'A-02-02-02-008' })
  @IsString()
  @IsNotEmpty({ message: 'El rubro presupuestal es obligatorio' })
  @MaxLength(160)
  rubro: string;

  @ApiProperty({ description: 'Número del CDP asignado por la Dirección Financiera', example: 'CDP-2026-0451' })
  @IsString()
  @IsNotEmpty({ message: 'El número del CDP es obligatorio' })
  @MaxLength(60)
  numero: string;

  @ApiProperty({ description: 'Valor efectivamente certificado, en pesos', example: 45000000 })
  @Transform(({ value }) => (typeof value === 'string' && value.trim() !== '' ? Number(value) : value))
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El valor debe ser un número' })
  @Min(1, { message: 'El valor del CDP debe ser mayor que cero' })
  valor: number;

  @ApiProperty({ description: 'Fecha de expedición (YYYY-MM-DD)', example: '2026-08-06' })
  @IsISO8601({ strict: true }, { message: 'La fecha debe tener formato YYYY-MM-DD' })
  fechaExpedicion: string;

  @ApiPropertyOptional({ description: 'Vigencia fiscal a la que se imputa', example: 2026 })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() !== '' ? Number(value) : value))
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

/**
 * El área registra un CDP que ya tiene (multipart con el soporte).
 *
 * Los mismos datos que exige un certificado expedido —la restricción
 * `cdp_expedido_completo` y la del rubro—, porque queda EXPEDIDO: un registro
 * a medias no es un CDP gestionado.
 */
export class RegistrarCdpExistenteDto {
  @ApiProperty({ description: 'Número del CDP', example: 'CDP-2026-0451' })
  @IsString()
  @IsNotEmpty({ message: 'El número del CDP es obligatorio' })
  @MaxLength(60)
  numero: string;

  @ApiProperty({ description: 'Valor certificado, en pesos', example: 45000000 })
  @Transform(({ value }) => (typeof value === 'string' && value.trim() !== '' ? Number(value) : value))
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El valor debe ser un número' })
  @Min(1, { message: 'El valor del CDP debe ser mayor que cero' })
  valor: number;

  @ApiProperty({ description: 'Rubro presupuestal que afecta', example: 'A-02-02-02-008' })
  @IsString()
  @IsNotEmpty({ message: 'El rubro presupuestal es obligatorio' })
  @MaxLength(160)
  rubro: string;

  @ApiProperty({ description: 'Fecha de expedición (YYYY-MM-DD)', example: '2026-08-06' })
  @IsISO8601({ strict: true }, { message: 'La fecha debe tener formato YYYY-MM-DD' })
  fechaExpedicion: string;

  @ApiPropertyOptional({ description: 'Vigencia fiscal a la que se imputa', example: 2026 })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() !== '' ? Number(value) : value))
  @IsInt()
  @Min(2000)
  vigenciaFiscal?: number;
}

/** Configuración: si una modalidad exige el CDP antes de radicar el estudio previo. */
export class GuardarCdpAntesDeRadicarDto {
  @ApiProperty({ description: 'Si el estudio previo exige el CDP cargado para enviarse' })
  @IsBoolean()
  obligatorio: boolean;

  @ApiPropertyOptional({ description: 'De dónde sale la regla' })
  @IsOptional()
  @IsString()
  fundamento?: string;

  @ApiPropertyOptional({ description: 'Si la Dirección de Contratación ya confirmó la regla' })
  @IsOptional()
  @IsBoolean()
  confirmado?: boolean;
}
