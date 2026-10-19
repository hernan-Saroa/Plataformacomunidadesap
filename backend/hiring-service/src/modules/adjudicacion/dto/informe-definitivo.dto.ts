import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator';

import { FirmaDelMultipart, FirmaOtpDto } from '../../cierre-actividad/dto/firma-otp.dto';

export class PublicarDefinitivoDto {
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
