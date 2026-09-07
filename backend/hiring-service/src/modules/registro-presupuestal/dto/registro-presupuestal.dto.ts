import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
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
} from 'class-validator';

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
  @IsNumber({}, { message: 'El valor debe ser un numero' })
  @IsPositive({ message: 'El valor debe ser mayor que cero' })
  valor?: number;

  @ApiPropertyOptional({ description: 'Vigencia fiscal a la que se imputa' })
  @IsOptional()
  @Transform(aNumero)
  @IsInt({ message: 'La vigencia fiscal se expresa en anios' })
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
  @ApiProperty({ description: 'Numero del registro presupuestal' })
  @IsString()
  @IsNotEmpty({ message: 'El registro presupuestal necesita su numero' })
  @MaxLength(60)
  numero: string;

  @ApiProperty({ description: 'Valor comprometido en pesos' })
  @Transform(aNumero)
  @IsNumber({}, { message: 'El valor comprometido debe ser un numero' })
  @IsPositive({ message: 'El valor comprometido debe ser mayor que cero' })
  valor: number;

  @ApiProperty({ description: 'Fecha de expedicion (YYYY-MM-DD)' })
  @IsDateString({}, { message: 'La fecha de expedicion debe tener el formato YYYY-MM-DD' })
  fechaExpedicion: string;

  @ApiPropertyOptional({ description: 'Rubro presupuestal al que se imputa' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  rubro?: string;

  @ApiPropertyOptional({ description: 'Vigencia fiscal a la que se imputa' })
  @IsOptional()
  @Transform(aNumero)
  @IsInt({ message: 'La vigencia fiscal se expresa en anios' })
  @Min(2020)
  @Max(2100)
  vigenciaFiscal?: number;
}

/** Rechazo con su motivo: sin el, quien solicita no sabe que corregir. */
export class RechazarRpDto {
  @ApiProperty({ description: 'Por que no hay disponibilidad para comprometer' })
  @IsString()
  @IsNotEmpty({ message: 'Explica por que se rechaza el registro presupuestal' })
  @MinLength(10, { message: 'El motivo debe explicar el rechazo, no una palabra suelta' })
  @MaxLength(1000)
  observaciones: string;
}
