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
 * Suscripcion del acta de inicio (EFDS-1167).
 *
 * Viaja como multipart porque lleva el acta adjunta: sin ella hubo una reunion,
 * no un inicio.
 */
export class SuscribirActaInicioDto {
  /** Cuando se reunieron las partes. */
  @ApiProperty({ description: 'Fecha de la reunion de inicio (YYYY-MM-DD)' })
  @IsDateString({}, { message: 'La fecha de la reunion debe tener el formato YYYY-MM-DD' })
  fechaReunion: string;

  /**
   * Desde cuando corre el plazo. Va aparte de la reunion porque el acta puede
   * pactar que la ejecucion empiece otro dia.
   */
  @ApiProperty({ description: 'Fecha desde la que corre el plazo (YYYY-MM-DD)' })
  @IsDateString({}, { message: 'La fecha de inicio debe tener el formato YYYY-MM-DD' })
  fechaInicio: string;

  /** La matriz pide en 9.1 constancia de quienes socializaron el alcance. */
  @ApiPropertyOptional({ description: 'Quienes asistieron a la reunion' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  asistentes?: string;

  @ApiPropertyOptional({ description: 'Alcance, cronograma y entregables acordados' })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  compromisos?: string;
}

/** Anulacion del acta vigente para suscribir otra. */
export class AnularActaInicioDto {
  @ApiProperty({ description: 'Por que se anula el acta' })
  @IsString()
  @IsNotEmpty({ message: 'Explica por que se anula el acta de inicio' })
  @MinLength(10, {
    message: 'El acta fijo la fecha desde la que corre el plazo: sustenta por que se anula',
  })
  @MaxLength(1000)
  motivo: string;
}
