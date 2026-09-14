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
 * Cierre definitivo del contrato (EFDS-1175).
 *
 * Viaja como multipart porque puede llevar el soporte del cierre —la
 * certificacion de la aseguradora, por ejemplo—, que es opcional.
 */
export class CerrarDefinitivamenteDto {
  @ApiProperty({ description: 'Fecha del cierre definitivo (YYYY-MM-DD)' })
  @IsDateString({}, { message: 'La fecha del cierre debe tener el formato YYYY-MM-DD' })
  fechaCierre: string;

  @ApiPropertyOptional({ description: 'Observaciones del cierre definitivo' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observaciones?: string;
}

/** Reversion del cierre definitivo vigente. */
export class RevertirCierreDefinitivoDto {
  @ApiProperty({ description: 'Por que se revierte el cierre definitivo' })
  @IsString()
  @IsNotEmpty({ message: 'Explica por que se revierte el cierre definitivo' })
  @MinLength(10, {
    message: 'El contrato se declaro cerrado en firme: sustenta por que se reabre',
  })
  @MaxLength(1000)
  motivo: string;
}
