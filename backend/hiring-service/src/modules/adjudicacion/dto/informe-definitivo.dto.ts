import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

/** Los números llegan como texto en el multipart; vacío es «no viene». */
const aNumero = ({ value }: { value: unknown }) => {
  if (value === '' || value === null || value === undefined) return undefined;
  const numero = Number(value);
  return Number.isNaN(numero) ? value : numero;
};

import { FirmaDelMultipart, FirmaOtpDto } from '../../cierre-actividad/dto/firma-otp.dto';

export class GenerarDefinitivoDto {
  /**
   * La oferta que gana (EFDS-1157).
   *
   * La evaluación de la 6.3 es preliminar y no nombra ganadora: se decide aquí,
   * con las fórmulas ya aplicadas y las observaciones resueltas. Obligatoria la
   * primera vez; al actualizar, sin ella se conserva la que había.
   */
  @ApiPropertyOptional({ description: 'Oferta ganadora según el informe definitivo' })
  @IsOptional()
  @IsUUID('4', { message: 'La ganadora se identifica con el id de la oferta registrada' })
  oferenteId?: string;

  /**
   * El valor por el que se evalúa la ganadora.
   *
   * Puede no ser el que presentó: una corrección aritmética cambia la cifra
   * sin reescribir la oferta. Sin él se toma el valor ofertado.
   */
  @ApiPropertyOptional({ description: 'Valor evaluado de la oferta ganadora' })
  @IsOptional()
  @Transform(aNumero)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El valor evaluado debe ser un número' })
  @Min(0.01, { message: 'El valor evaluado tiene que ser mayor que cero' })
  valorEvaluado?: number;

  @ApiPropertyOptional({ description: 'Por qué esa oferta' })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  justificacion?: string;

  /**
   * Por qué se actualiza (EFDS-1159).
   *
   * La primera versión no lo lleva. Actualizar sí: el informe cambia después
   * de la audiencia, y el historial tiene que decir qué lo movió.
   */
  @ApiPropertyOptional({ description: 'Motivo de la actualización del informe' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  motivo?: string;
}

export class PublicarDefinitivoDto {
  /**
   * Dónde quedó publicado en SECOP (EFDS-1159).
   *
   * No hay integración con SECOP II: lo que prueba la publicación es el enlace
   * más el soporte que se adjunta.
   */
  @ApiProperty({ description: 'Enlace de la publicación en SECOP' })
  @IsUrl(
    { require_protocol: true, protocols: ['http', 'https'] },
    { message: 'El enlace de la publicación tiene que ser una dirección completa, con https://' },
  )
  @MaxLength(1000)
  enlace: string;

  /** Solo si la 7.2 quedó configurada con `EXIGE_FIRMA` (EFDS-2070). */
  @ApiPropertyOptional({ description: 'Evidencia de la firma OTP, si la actividad la exige' })
  @IsOptional()
  @FirmaDelMultipart()
  @ValidateNested()
  @Type(() => FirmaOtpDto)
  firma?: FirmaOtpDto;
}

export class AnularDefinitivoDto {
  @ApiProperty({ description: 'Motivo de la anulación del informe definitivo' })
  @IsString()
  @IsNotEmpty({ message: 'Di por qué se anula el informe definitivo' })
  @MinLength(10, { message: 'El motivo de la anulación tiene que explicarse' })
  @MaxLength(1000)
  motivo: string;
}
