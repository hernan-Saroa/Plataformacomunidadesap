import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { FirmaOtpDto } from '../../cierre-actividad/dto/firma-otp.dto';

/**
 * Elaboracion del informe final (EFDS-1171).
 *
 * Viaja como multipart porque lleva el informe firmado: sin el hay un balance,
 * no un informe.
 */
export class ElaborarInformeFinalDto {
  @ApiProperty({ description: 'Fecha del informe (YYYY-MM-DD)' })
  @IsDateString({}, { message: 'La fecha del informe debe tener el formato YYYY-MM-DD' })
  fechaElaboracion: string;

  /**
   * Lo que la liquidacion lee sin abrir el archivo, asi que se le exige
   * sustancia: una palabra suelta no dice como se ejecuto el contrato.
   */
  @ApiProperty({ description: 'Conclusión del supervisor sobre la ejecución' })
  @IsString()
  @IsNotEmpty({ message: 'Escribe la conclusión sobre la ejecución del contrato' })
  @MinLength(20, {
    message: 'La conclusión sustenta la liquidación: resume cómo se ejecutó el contrato',
  })
  @MaxLength(4000)
  conclusion: string;

  /** Solo si la 10.1 quedó configurada con `EXIGE_FIRMA` (EFDS-2070). */
  @ApiPropertyOptional({ description: 'Evidencia de la firma OTP, si la actividad la exige' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? JSON.parse(value) : value))
  @ValidateNested()
  @Type(() => FirmaOtpDto)
  firma?: FirmaOtpDto;
}

/** Un entregable del consolidado. */
export class AgregarEntregableDto {
  @ApiProperty({ description: 'Qué se entregó' })
  @IsString()
  @IsNotEmpty({ message: 'Describe el entregable' })
  @MaxLength(500)
  descripcion: string;

  /** Nula cuando el entregable se pacto y no se cumplio. */
  @ApiPropertyOptional({ description: 'Cuándo se recibió (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString({}, { message: 'La fecha de entrega debe tener el formato YYYY-MM-DD' })
  fechaEntrega?: string;

  @ApiPropertyOptional({ description: 'Observación sobre el entregable' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observacion?: string;
}

/** Anulacion del informe vigente para rehacerlo. */
export class AnularInformeFinalDto {
  @ApiProperty({ description: 'Por qué se anula el informe final' })
  @IsString()
  @IsNotEmpty({ message: 'Explica por qué se anula el informe final' })
  @MinLength(10, { message: 'El informe soporta la liquidación: sustenta por qué se anula' })
  @MaxLength(1000)
  motivo: string;
}
