import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class SolicitarCdpDto {
  @ApiProperty({ description: 'Rubro presupuestal contra el que se solicita', example: 'A-02-02-02-008' })
  @IsString()
  @IsNotEmpty({ message: 'El rubro presupuestal es obligatorio' })
  @MaxLength(160)
  rubro: string;

  /**
   * Se pide aunque el valor definitivo lo fije la Financiera al expedir: sin
   * una cifra, la verificación de disponibilidad no tiene contra qué mirar.
   */
  @ApiProperty({ description: 'Valor que se solicita respaldar, en pesos', example: 45000000 })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El valor debe ser un número' })
  @Min(1, { message: 'El valor solicitado debe ser mayor que cero' })
  valor: number;

  @ApiPropertyOptional({ description: 'Vigencia fiscal a la que se imputa', example: 2026 })
  @IsOptional()
  @IsInt({ message: 'La vigencia debe ser un año' })
  @Min(2000)
  vigenciaFiscal?: number;

  @ApiPropertyOptional({ description: 'Observaciones de la solicitud' })
  @IsOptional()
  @IsString()
  observaciones?: string;
}

export class ExpedirCdpDto {
  @ApiProperty({ description: 'Número del CDP asignado por la Dirección Financiera', example: 'CDP-2026-0451' })
  @IsString()
  @IsNotEmpty({ message: 'El número del CDP es obligatorio' })
  @MaxLength(60)
  numero: string;

  @ApiProperty({ description: 'Valor efectivamente certificado, en pesos', example: 45000000 })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El valor debe ser un número' })
  @Min(1, { message: 'El valor del CDP debe ser mayor que cero' })
  valor: number;

  @ApiProperty({ description: 'Fecha de expedición (YYYY-MM-DD)', example: '2026-08-06' })
  @IsISO8601({ strict: true }, { message: 'La fecha debe tener formato YYYY-MM-DD' })
  fechaExpedicion: string;

  @ApiPropertyOptional({ description: 'Vigencia fiscal a la que se imputa', example: 2026 })
  @IsOptional()
  @IsInt()
  @Min(2000)
  vigenciaFiscal?: number;
}

export class RechazarCdpDto {
  /**
   * Obligatorio: sin motivo, el área solicitante no sabe si corregir el rubro,
   * esperar a la siguiente vigencia o reducir el alcance del proceso.
   */
  @ApiProperty({ description: 'Motivo del rechazo' })
  @IsString()
  @IsNotEmpty({ message: 'El motivo del rechazo es obligatorio' })
  observaciones: string;
}
