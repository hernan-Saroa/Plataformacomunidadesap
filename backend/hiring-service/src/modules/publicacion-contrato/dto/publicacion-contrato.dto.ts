import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateNested,
} from 'class-validator';

import { FirmaDelMultipart, FirmaOtpDto } from '../../cierre-actividad/dto/firma-otp.dto';

/**
 * Registro de la publicacion del contrato (EFDS-1166).
 *
 * Viaja como multipart porque lleva la evidencia adjunta: sin soporte no hay
 * publicacion registrada, solo la afirmacion de que se hizo.
 */
export class PublicarContratoDto {
  /**
   * Solo la página web de la ESAP (sesión de QA del 04/11): en SECOP II el
   * contrato ya se publicó con la adjudicación. Si no llega, es la web.
   */
  @ApiPropertyOptional({ description: 'Dónde se publicó', enum: ['WEB_ESAP'], default: 'WEB_ESAP' })
  @IsOptional()
  @IsIn(['WEB_ESAP'], {
    message: 'La 8.8 es la publicación en la página web de la ESAP: SECOP II ya se publicó con la adjudicación',
  })
  destino: 'WEB_ESAP' = 'WEB_ESAP';

  /** La real, no la del registro: es la que cuenta para el plazo. */
  @ApiProperty({ description: 'Fecha real de la publicación (YYYY-MM-DD)' })
  @IsDateString({}, { message: 'La fecha de publicación debe tener el formato AAAA-MM-DD' })
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
  @FirmaDelMultipart()
  @ValidateNested()
  @Type(() => FirmaOtpDto)
  firma?: FirmaOtpDto;
}
