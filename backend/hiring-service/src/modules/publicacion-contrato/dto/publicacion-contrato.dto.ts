import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateNested,
} from 'class-validator';

import { FirmaOtpDto } from '../../cierre-actividad/dto/firma-otp.dto';

/**
 * Registro de la publicacion del contrato (EFDS-1166).
 *
 * Viaja como multipart porque lleva la evidencia adjunta: sin soporte no hay
 * publicacion registrada, solo la afirmacion de que se hizo.
 */
export class PublicarContratoDto {
  /**
   * La historia habla de SECOP II y la matriz de la pagina web de la ESAP. Se
   * pide el destino en vez de suponer cual de las dos manda.
   */
  @ApiProperty({ description: 'Dónde se publicó', enum: ['SECOP_II', 'WEB_ESAP'] })
  @IsIn(['SECOP_II', 'WEB_ESAP'], {
    message: 'El destino de la publicación es SECOP_II o WEB_ESAP',
  })
  destino: 'SECOP_II' | 'WEB_ESAP';

  /** La real, no la del registro: es la que cuenta para el plazo. */
  @ApiProperty({ description: 'Fecha real de la publicación (YYYY-MM-DD)' })
  @IsDateString({}, { message: 'La fecha de publicación debe tener el formato YYYY-MM-DD' })
  fechaPublicacion: string;

  @ApiPropertyOptional({ description: 'Número del proceso en SECOP II' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  secopNumero?: string;

  @ApiPropertyOptional({ description: 'Enlace a la publicación' })
  @IsOptional()
  @IsUrl({}, { message: 'El enlace de la publicación no tiene un formato válido' })
  secopUrl?: string;

  /** Solo si la 8.8 quedo configurada con `EXIGE_FIRMA` (EFDS-2070). */
  @ApiPropertyOptional({ description: 'Evidencia de la firma OTP, si la actividad la exige' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? JSON.parse(value) : value))
  @ValidateNested()
  @Type(() => FirmaOtpDto)
  firma?: FirmaOtpDto;
}
