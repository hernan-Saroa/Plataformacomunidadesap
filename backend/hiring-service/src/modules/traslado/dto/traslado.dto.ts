import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { FirmaOtpDto } from '../../cierre-actividad/dto/firma-otp.dto';

export class GenerarInformeDto {
  /**
   * Nota que la entidad quiere dejar en el informe además del resultado.
   *
   * Opcional: el informe se sostiene con lo que el comité entregó. Sirve para
   * lo que el gestor necesite advertir —una modalidad sin puntaje, una oferta
   * retirada— sin tener que rehacer el documento del comité.
   */
  @ApiPropertyOptional({ description: 'Observación de la entidad sobre el informe' })
  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'La observación del informe no puede pasar de 2000 caracteres' })
  observacion?: string;
}

export class TrasladarInformeDto {
  /**
   * Dónde y cómo se publicó.
   *
   * No hay integración con SECOP II: lo que prueba la publicación es este texto
   * más el soporte que se adjunta, igual que en la publicación del pliego.
   */
  @ApiProperty({ description: 'Dónde se publicó el informe y cómo se notificó' })
  @IsString()
  @IsNotEmpty({ message: 'Di dónde se publicó el informe: es lo que prueba el traslado' })
  @MinLength(10, { message: 'Describe la publicación: una palabra no prueba el traslado' })
  @MaxLength(500)
  medioPublicacion: string;

  /** Solo si la 6.4 quedó configurada con `EXIGE_FIRMA` (EFDS-2070). */
  @ApiPropertyOptional({ description: 'Evidencia de la firma OTP, si la actividad la exige' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? JSON.parse(value) : value))
  @ValidateNested()
  @Type(() => FirmaOtpDto)
  firma?: FirmaOtpDto;
}

export class AnularInformeDto {
  /**
   * Por qué se anula.
   *
   * Obligatorio: un informe anulado sin motivo deja el expediente con dos
   * informes y sin explicación de por qué hubo que rehacerlo.
   */
  @ApiProperty({ description: 'Motivo de la anulación del informe' })
  @IsString()
  @IsNotEmpty({ message: 'Di por qué se anula el informe' })
  @MinLength(10, { message: 'El motivo de la anulación tiene que explicarse' })
  @MaxLength(1000)
  motivo: string;
}
