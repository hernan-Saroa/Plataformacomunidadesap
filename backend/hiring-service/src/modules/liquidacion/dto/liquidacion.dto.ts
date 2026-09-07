import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

import { TipoLiquidacion } from '../../../entities/acta-liquidacion.entity';

export const TIPOS_LIQUIDACION: TipoLiquidacion[] = ['BILATERAL', 'UNILATERAL'];

/**
 * Elaboracion del acta de liquidacion (EFDS-1172).
 *
 * Viaja como multipart porque lleva el acta firmada y, si se declara, el
 * soporte del paz y salvo.
 */
export class LiquidarDto {
  @ApiProperty({ description: 'De comun acuerdo o por acto de la entidad', enum: TIPOS_LIQUIDACION })
  @IsIn(TIPOS_LIQUIDACION, {
    message: 'La liquidacion es bilateral, de comun acuerdo, o unilateral, por acto de la entidad',
  })
  tipo: TipoLiquidacion;

  @ApiProperty({ description: 'Fecha del acta o de la resolucion (YYYY-MM-DD)' })
  @IsDateString({}, { message: 'La fecha del acta debe tener el formato YYYY-MM-DD' })
  fechaActa: string;

  /** Multipart manda todo como texto: hay que convertirlo antes de validar. */
  @ApiPropertyOptional({ description: 'Si las partes quedan a paz y salvo' })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  pazYSalvo?: boolean;

  @ApiPropertyOptional({ description: 'Salvedades y observaciones del acta' })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  observaciones?: string;
}

/** Anulacion del acta vigente para rehacerla. */
export class AnularLiquidacionDto {
  @ApiProperty({ description: 'Por que se anula el acta de liquidacion' })
  @IsString()
  @IsNotEmpty({ message: 'Explica por que se anula el acta de liquidacion' })
  @MinLength(10, { message: 'El acta cierra el contrato: sustenta por que se anula' })
  @MaxLength(1000)
  motivo: string;
}
