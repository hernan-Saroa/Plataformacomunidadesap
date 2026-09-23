import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator';

import { FirmaOtpDto } from '../../cierre-actividad/dto/firma-otp.dto';

export class PublicarDefinitivoDto {
  /**
   * Dónde y cómo se publicó.
   *
   * No hay integración con SECOP II: lo que prueba la publicación es este texto
   * más el soporte que se adjunta, igual que en el traslado del preliminar.
   */
  @ApiProperty({ description: 'Dónde se publicó el informe definitivo' })
  @IsString()
  @IsNotEmpty({ message: 'Di dónde se publicó el informe definitivo' })
  @MinLength(10, { message: 'Describe la publicación: una palabra no la prueba' })
  @MaxLength(500)
  medioPublicacion: string;

  /** Solo si la 7.3 quedó configurada con `EXIGE_FIRMA` (EFDS-2070). */
  @ApiPropertyOptional({ description: 'Evidencia de la firma OTP, si la actividad la exige' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? JSON.parse(value) : value))
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
