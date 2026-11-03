import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

import { FirmaDelMultipart, FirmaOtpDto } from '../../cierre-actividad/dto/firma-otp.dto';

/**
 * Los campos llegan por multipart junto con el soporte, así que todo entra como
 * texto: `"true"` no es `true` hasta que alguien lo convierte.
 */
const aBooleano = () =>
  Transform(({ value }) => (typeof value === 'string' ? value === 'true' : value));

/**
 * Lo que presentó un interesado (127, revisión de QA de EFDS-1151).
 *
 * Una fila por interesado y no por observación: el detalle ya queda en los
 * archivos, y transcribirlo punto por punto agregaba trabajo sin trazabilidad.
 */
export class RegistrarObservacionDto {
  @ApiPropertyOptional({ description: 'El interesado tal como aparece en SECOP II' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  presentadoPor?: string;

  @ApiPropertyOptional({ description: 'NIT o cédula del interesado' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  identificacion?: string;

  @ApiPropertyOptional({
    description: 'Fecha de presentación (YYYY-MM-DD); si no se dice, hoy',
    example: '2026-08-14',
  })
  @IsOptional()
  @IsISO8601({ strict: true }, { message: 'La fecha debe tener formato YYYY-MM-DD' })
  fechaPresentacion?: string;

  @ApiPropertyOptional({ description: 'Asunto, si se quiere distinguir' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  asunto?: string;

  @ApiProperty({ description: 'Observación general del interesado, en texto libre' })
  @IsString()
  @IsNotEmpty({ message: 'Escribe la observación general del interesado' })
  contenido: string;
}

export class ResponderObservacionDto {
  @ApiProperty({ description: 'Respuesta de la entidad a la observación' })
  @IsString()
  @IsNotEmpty({ message: 'La respuesta no puede ir vacía' })
  respuesta: string;

  /**
   * Se pide siempre y no se deduce del texto: es lo que justifica una adenda
   * posterior y lo que muestra si la observación sirvió de algo.
   */
  @ApiPropertyOptional({
    description: 'Si llevó a modificar el pliego. Informativo: no se exige (127)',
    example: false,
  })
  @IsOptional()
  @aBooleano()
  @IsBoolean({ message: 'Indica si la observación modificó el pliego' })
  modificoPliego?: boolean;

  /** Solo si la 5.6 quedó configurada con `EXIGE_FIRMA` (EFDS-2070). */
  @ApiPropertyOptional({ description: 'Evidencia de la firma OTP, si la actividad la exige' })
  @IsOptional()
  @ValidateNested()
  @Type(() => FirmaOtpDto)
  firma?: FirmaOtpDto;
}

/** Solo si la 5.6 quedó configurada con `EXIGE_FIRMA` (EFDS-2070). */
/** Una sola respuesta para todos los interesados pendientes (127). */
export class ResponderTodasDto {
  @ApiPropertyOptional({ description: 'Nota sobre el documento de respuestas' })
  @IsOptional()
  @IsString()
  respuesta?: string;

  @ApiPropertyOptional({ description: 'Si las observaciones llevaron a modificar el pliego. Informativo' })
  @IsOptional()
  @aBooleano()
  @IsBoolean({ message: 'Indica si las observaciones modificaron el pliego' })
  modificoPliego?: boolean;

  @ApiPropertyOptional({ description: 'Evidencia de la firma OTP, si la actividad la exige' })
  @IsOptional()
  @FirmaDelMultipart()
  @ValidateNested()
  @Type(() => FirmaOtpDto)
  firma?: FirmaOtpDto;
}

export class CerrarSinObservacionesDto {
  @ApiPropertyOptional({ description: 'Evidencia de la firma OTP, si la actividad la exige' })
  @IsOptional()
  @ValidateNested()
  @Type(() => FirmaOtpDto)
  firma?: FirmaOtpDto;
}
