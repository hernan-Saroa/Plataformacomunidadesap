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
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

import { TipoLiquidacion } from '../../../entities/acta-liquidacion.entity';
import { FirmaOtpDto } from '../../cierre-actividad/dto/firma-otp.dto';

export const TIPOS_LIQUIDACION: TipoLiquidacion[] = ['BILATERAL', 'UNILATERAL'];

/**
 * Elaboracion del acta de liquidacion (EFDS-1172).
 *
 * Viaja como multipart porque lleva el acta firmada y, si se declara, el
 * soporte del paz y salvo.
 */
export class LiquidarDto {
  @ApiProperty({ description: 'De común acuerdo o por acto de la entidad', enum: TIPOS_LIQUIDACION })
  @IsIn(TIPOS_LIQUIDACION, {
    message: 'La liquidación es bilateral, de común acuerdo, o unilateral, por acto de la entidad',
  })
  tipo: TipoLiquidacion;

  @ApiProperty({ description: 'Fecha del acta o de la resolución (YYYY-MM-DD)' })
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

  /** Solo si la 10.2 quedó configurada con `EXIGE_FIRMA` (EFDS-2070). */
  @ApiPropertyOptional({ description: 'Evidencia de la firma OTP, si la actividad la exige' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? JSON.parse(value) : value))
  @ValidateNested()
  @Type(() => FirmaOtpDto)
  firma?: FirmaOtpDto;
}

/** Anulacion del acta vigente para rehacerla. */
export class AnularLiquidacionDto {
  @ApiProperty({ description: 'Por qué se anula el acta de liquidación' })
  @IsString()
  @IsNotEmpty({ message: 'Explica por qué se anula el acta de liquidación' })
  @MinLength(10, { message: 'El acta cierra el contrato: sustenta por qué se anula' })
  @MaxLength(1000)
  motivo: string;
}
