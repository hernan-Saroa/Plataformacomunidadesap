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
 * DTO para procesar el desembolso y pago de comisiones en Tesorería.
 * Historia de Usuario: [RF-PAG-003] Etapa 8 — Tesorería y desembolso.
 * Actor: Tesorería / Pagador.
 * Estado resultante: OBLIGADA ➔ PAGADA.
 */
export class ProcesarPagoDto {
  @ApiProperty({
    description: 'Fecha efectiva en la que se realizó el desembolso o pago al comisionado (YYYY-MM-DD).',
    example: '2026-10-26',
  })
  @IsDateString({}, { message: 'La fecha de pago debe ser una fecha válida en formato YYYY-MM-DD.' })
  @IsNotEmpty({ message: 'La fecha de pago es obligatoria.' })
  fechaPago: string;

  @ApiProperty({
    description: 'Valor total pagado/desembolsado al comisionado en pesos colombianos (COP).',
    example: 850000,
  })
  @Type(() => Number)
  @IsNumber({}, { message: 'El valor pagado debe ser numérico.' })
  @IsPositive({ message: 'El valor pagado debe ser un monto positivo mayor a cero.' })
  valorPagado: number;

  @ApiPropertyOptional({
    description: 'Ruta o URL del soporte de desembolso / comprobante de egreso del pago.',
    example: 'uploads/pagos/2026/comprobante-egreso-8920.pdf',
  })
  @IsOptional()
  @IsString({ message: 'La ruta del soporte de pago debe ser una cadena de texto.' })
  @MaxLength(255, { message: 'La ruta del soporte no puede superar los 255 caracteres.' })
  soportePagoPath?: string;

  @ApiPropertyOptional({
    description: 'Alias de la ruta del soporte de desembolso.',
    example: 'uploads/pagos/2026/soporte-desembolso-8920.pdf',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  soporteDesembolsoPath?: string;

  @ApiPropertyOptional({
    description: 'Número oficial de orden de pago o número de comprobante SIIF Nación generado.',
    example: 'OP-SIIF-2026-98124',
  })
  @IsOptional()
  @IsString({ message: 'El número de orden de pago debe ser una cadena de texto.' })
  @MaxLength(100, { message: 'El número de orden de pago no puede superar los 100 caracteres.' })
  numeroOrdenPago?: string;

  @ApiPropertyOptional({
    description: 'Alias para número de comprobante de pago.',
    example: 'COMP-PAGO-98124',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  comprobantePago?: string;

  @ApiPropertyOptional({
    description: 'Observaciones o detalles adicionales registrados por Tesorería durante el desembolso.',
    example: 'Transferencia interbancaria ejecutada conforme a orden de pago SIIF Nación.',
  })
  @IsOptional()
  @IsString({ message: 'Las observaciones de pago deben ser texto.' })
  observacionesPago?: string;

  @ApiPropertyOptional({
    description: 'Modalidad de pago confirmada para el desembolso (AVANCE o RECONOCIMIENTO_POSTERIOR).',
    enum: ['AVANCE', 'RECONOCIMIENTO_POSTERIOR'],
    example: 'AVANCE',
  })
  @IsOptional()
  @IsString()
  @IsIn(['AVANCE', 'RECONOCIMIENTO_POSTERIOR'], {
    message: 'La modalidad de pago debe ser AVANCE o RECONOCIMIENTO_POSTERIOR.',
  })
  modalidadPago?: string;
}
