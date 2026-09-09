import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

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
  @ApiProperty({ description: 'Conclusion del supervisor sobre la ejecucion' })
  @IsString()
  @IsNotEmpty({ message: 'Escribe la conclusion sobre la ejecucion del contrato' })
  @MinLength(20, {
    message: 'La conclusion sustenta la liquidacion: resume como se ejecuto el contrato',
  })
  @MaxLength(4000)
  conclusion: string;
}

/** Un entregable del consolidado. */
export class AgregarEntregableDto {
  @ApiProperty({ description: 'Que se entrego' })
  @IsString()
  @IsNotEmpty({ message: 'Describe el entregable' })
  @MaxLength(500)
  descripcion: string;

  /** Nula cuando el entregable se pacto y no se cumplio. */
  @ApiPropertyOptional({ description: 'Cuando se recibio (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString({}, { message: 'La fecha de entrega debe tener el formato YYYY-MM-DD' })
  fechaEntrega?: string;

  @ApiPropertyOptional({ description: 'Observacion sobre el entregable' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observacion?: string;
}

/** Anulacion del informe vigente para rehacerlo. */
export class AnularInformeFinalDto {
  @ApiProperty({ description: 'Por que se anula el informe final' })
  @IsString()
  @IsNotEmpty({ message: 'Explica por que se anula el informe final' })
  @MinLength(10, { message: 'El informe soporta la liquidacion: sustenta por que se anula' })
  @MaxLength(1000)
  motivo: string;
}
