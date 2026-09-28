import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { DestinoPublicacionActa } from '../../../entities/publicacion-acta.entity';
import { FirmaOtpDto } from '../../cierre-actividad/dto/firma-otp.dto';

/**
 * Registro de la publicacion del acta (EFDS-1174).
 *
 * Viaja como multipart porque la evidencia es obligatoria: sin soporte no hay
 * publicacion registrada, solo la afirmacion de que se hizo.
 */
export class PublicarActaDto {
  @ApiProperty({
    description: 'Dónde se publicó el acta',
    enum: ['SECOP_II', 'WEB_ESAP'],
  })
  @IsIn(['SECOP_II', 'WEB_ESAP'], { message: 'El destino debe ser SECOP_II o WEB_ESAP' })
  destino: DestinoPublicacionActa;

  @ApiProperty({ description: 'Fecha real de la publicación (YYYY-MM-DD)' })
  @IsDateString({}, { message: 'La fecha de publicación debe tener el formato YYYY-MM-DD' })
  fechaPublicacion: string;

  @ApiPropertyOptional({ description: 'Número con el que quedó publicada en SECOP II' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  secopNumero?: string;

  @ApiPropertyOptional({ description: 'Enlace de la publicación' })
  @IsOptional()
  @IsUrl({}, { message: 'El enlace de la publicación debe ser una URL válida' })
  @MaxLength(500)
  secopUrl?: string;
}

/** Archivo del expediente contractual. */
export class ArchivarExpedienteDto {
  /**
   * Opcional mientras no exista la integracion con Active Document: hay
   * expedientes que se archivan antes de que el gestor documental devuelva el
   * radicado, y exigirlo dejaria el proceso abierto por un tramite ajeno.
   */
  @ApiPropertyOptional({ description: 'Radicado del archivo en Active Document' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  radicadoActiveDocument?: string;

  @ApiPropertyOptional({ description: 'Observaciones del archivo' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observaciones?: string;

  /** Solo si la 10.4 quedó configurada con `EXIGE_FIRMA` (EFDS-2070). */
  @ApiPropertyOptional({ description: 'Evidencia de la firma OTP, si la actividad la exige' })
  @IsOptional()
  @ValidateNested()
  @Type(() => FirmaOtpDto)
  firma?: FirmaOtpDto;
}

/** Reapertura de un expediente ya archivado. */
export class ReabrirExpedienteDto {
  @ApiProperty({ description: 'Por qué se reabre el expediente' })
  @IsString()
  @IsNotEmpty({ message: 'Explica por qué se reabre el expediente' })
  @MinLength(10, {
    message: 'El expediente ya se declaró completo ante entes de control: sustenta la reapertura',
  })
  @MaxLength(1000)
  motivo: string;
}
