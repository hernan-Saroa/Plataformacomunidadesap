import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

import { DestinoPublicacionActa } from '../../../entities/publicacion-acta.entity';

/**
 * Registro de la publicacion del acta (EFDS-1174).
 *
 * Viaja como multipart porque la evidencia es obligatoria: sin soporte no hay
 * publicacion registrada, solo la afirmacion de que se hizo.
 */
export class PublicarActaDto {
  @ApiProperty({
    description: 'Donde se publico el acta',
    enum: ['SECOP_II', 'WEB_ESAP'],
  })
  @IsIn(['SECOP_II', 'WEB_ESAP'], { message: 'El destino debe ser SECOP_II o WEB_ESAP' })
  destino: DestinoPublicacionActa;

  @ApiProperty({ description: 'Fecha real de la publicacion (YYYY-MM-DD)' })
  @IsDateString({}, { message: 'La fecha de publicacion debe tener el formato YYYY-MM-DD' })
  fechaPublicacion: string;

  @ApiPropertyOptional({ description: 'Numero con el que quedo publicada en SECOP II' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  secopNumero?: string;

  @ApiPropertyOptional({ description: 'Enlace de la publicacion' })
  @IsOptional()
  @IsUrl({}, { message: 'El enlace de la publicacion debe ser una URL valida' })
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
}

/** Reapertura de un expediente ya archivado. */
export class ReabrirExpedienteDto {
  @ApiProperty({ description: 'Por que se reabre el expediente' })
  @IsString()
  @IsNotEmpty({ message: 'Explica por que se reabre el expediente' })
  @MinLength(10, {
    message: 'El expediente ya se declaro completo ante entes de control: sustenta la reapertura',
  })
  @MaxLength(1000)
  motivo: string;
}
