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
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO para la creación y registro de la Obligación en SIIF Nación.
 * Historia de Usuario: [RF-PAG-001] Etapa 8 — Crear obligación según modalidad de pago.
 * Actor: Analista de Viáticos.
 * Estado: COMPROMETIDA ➔ OBLIGADA (Lista para desembolso por Tesorería).
 */
export class CrearObligacionDto {
  @ApiProperty({
    description: 'Número oficial de la obligación generado en SIIF Nación por el analista.',
    example: 'OBL-2026-00481',
  })
  @IsString({ message: 'El número de obligación debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'El número de obligación en SIIF Nación es obligatorio.' })
  @MaxLength(100, { message: 'El número de obligación no puede superar los 100 caracteres.' })
  numeroObligacion: string;

  @ApiProperty({
    description: 'Fecha en la que se generó la obligación en SIIF Nación (formato YYYY-MM-DD).',
    example: '2026-10-25',
  })
  @IsDateString({}, { message: 'La fecha de la obligación debe ser una fecha válida (YYYY-MM-DD).' })
  @IsNotEmpty({ message: 'La fecha de la obligación es obligatoria.' })
  fechaObligacion: string;

  @ApiProperty({
    description: 'Valor total de la obligación en pesos colombianos (COP).',
    example: 850000,
  })
  @Type(() => Number)
  @IsNumber({}, { message: 'El valor de la obligación debe ser numérico.' })
  @IsPositive({ message: 'El valor de la obligación debe ser un valor positivo mayor a 0.' })
  valorObligacion: number;

  @ApiPropertyOptional({
    description: 'Modalidad de pago confirmada para la obligación (AVANCE o RECONOCIMIENTO_POSTERIOR).',
    enum: ['AVANCE', 'RECONOCIMIENTO_POSTERIOR'],
    example: 'AVANCE',
  })
  @IsOptional()
  @IsString()
  @IsIn(['AVANCE', 'RECONOCIMIENTO_POSTERIOR'], {
    message: 'La modalidad de pago debe ser AVANCE o RECONOCIMIENTO_POSTERIOR.',
  })
  modalidadPago?: string;

  @ApiPropertyOptional({
    description: 'Observaciones o concepto presupuestal de la obligación en SIIF Nación.',
    example: 'Obligación expedida en SIIF Nación conforme al RP 2026-10-25_RP_48920.',
  })
  @IsOptional()
  @IsString()
  observacionesObligacion?: string;

  @ApiPropertyOptional({
    description: 'Ruta o URL del soporte PDF / comprobante de la obligación expedida en SIIF.',
    example: 'uploads/obligaciones/2026/obl-00481.pdf',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  soporteObligacionPath?: string;
}
