import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO para registrar el reintegro de una comisión pagada por avance.
 * Historia de Usuario: [RF-PAG-004] Etapa 8 — Gestionar reintegros por viaje no
 * realizado o menor.
 * Actor: Analista de viáticos.
 */
export class RegistrarReintegroDto {
  @ApiProperty({
    description: 'Valor reintegrado por el comisionado en pesos colombianos (COP).',
    example: 335520,
  })
  @Type(() => Number)
  @IsNumber({}, { message: 'El valor reintegrado debe ser numérico.' })
  @IsPositive({ message: 'El valor reintegrado debe ser un monto positivo mayor a cero.' })
  valorReintegrado: number;

  @ApiProperty({
    description: 'Fecha de la consignación del reintegro (YYYY-MM-DD).',
    example: '2026-10-26',
  })
  @IsDateString({}, { message: 'La fecha del reintegro debe ser una fecha válida en formato YYYY-MM-DD.' })
  @IsNotEmpty({ message: 'La fecha del reintegro es obligatoria.' })
  fechaReintegro: string;

  @ApiProperty({
    description: 'Ruta del soporte de la consignación del reintegro.',
    example: '/uploads/reintegros/0b0f4c1e/consignacion.pdf',
  })
  @IsString({ message: 'La ruta del soporte debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'El soporte de la consignación es obligatorio.' })
  @MaxLength(255, { message: 'La ruta del soporte no puede superar los 255 caracteres.' })
  soportePath: string;

  @ApiPropertyOptional({
    description: 'Observaciones del registro del reintegro.',
    example: 'Consignación realizada en la cuenta de la ESAP.',
  })
  @IsOptional()
  @IsString({ message: 'Las observaciones deben ser una cadena de texto.' })
  @MaxLength(1000, { message: 'Las observaciones no pueden superar los 1000 caracteres.' })
  observaciones?: string;
}
