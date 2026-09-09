import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

import { CausalDesierta } from '../../../entities/declaratoria-desierta.entity';

export const CAUSALES_DESIERTA: CausalDesierta[] = ['SIN_OFERTAS', 'SIN_OFERTAS_HABILITADAS'];

export class DeclararDesiertoDto {
  /**
   * Por qué se declara desierto.
   *
   * Las dos que el expediente sabe sustentar. Si Contratación necesita una
   * causal abierta, entra después (EFDS-1513): no se presenta como definitivo.
   */
  @ApiProperty({
    description: 'Causal de la declaratoria',
    enum: CAUSALES_DESIERTA,
  })
  @IsIn(CAUSALES_DESIERTA, {
    message: 'La causal es que no se presentó ninguna oferta o que ninguna quedó habilitada',
  })
  causal: CausalDesierta;

  /**
   * La motivación del acto.
   *
   * Obligatoria y con largo mínimo: la declaratoria desierta es un acto
   * administrativo motivado, y "no hubo ofertas" a secas no motiva nada.
   */
  @ApiProperty({ description: 'Motivación de la declaratoria' })
  @IsString()
  @IsNotEmpty({ message: 'Di por qué se declara desierto el proceso' })
  @MinLength(10, { message: 'La declaratoria desierta es un acto motivado: sustenta la decisión' })
  @MaxLength(4000)
  motivo: string;

  @ApiProperty({ description: 'Número de la resolución que declara desierto' })
  @IsString()
  @IsNotEmpty({ message: 'Di el número de la resolución' })
  @MaxLength(60)
  numeroActo: string;

  @ApiProperty({ description: 'Fecha de la resolución (YYYY-MM-DD)' })
  @IsISO8601({ strict: true }, { message: 'La fecha del acto va como YYYY-MM-DD' })
  fechaActo: string;

  /**
   * Por qué se declara desierto pese a que el comité nombró una ganadora.
   *
   * Obligatoria solo en ese caso, y el servicio la exige ahí. Mismo criterio de
   * adjudicar a alguien distinto del ganador (EFDS-1487): no se impide, se
   * exige sustentar la contradicción.
   */
  @ApiPropertyOptional({
    description: 'Justificación si el comité ya había registrado una ganadora',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  justificacion?: string;
}

export class PublicarDesiertaDto {
  @ApiProperty({ description: 'Dónde se publicó y cómo se notificó la declaratoria' })
  @IsString()
  @IsNotEmpty({ message: 'Di dónde se publicó la declaratoria' })
  @MinLength(10, { message: 'Describe la publicación: una palabra no la prueba' })
  @MaxLength(500)
  medioPublicacion: string;

  /** Cuándo se notificó, si no fue el mismo día. Sin ella se toma el registro. */
  @ApiPropertyOptional({ description: 'Fecha y hora de la notificación (ISO 8601)' })
  @IsOptional()
  @IsISO8601({ strict: true }, { message: 'La fecha de notificación va en formato ISO 8601' })
  notificadaAt?: string;
}

export class RevocarDesiertaDto {
  @ApiProperty({ description: 'Motivo de la revocatoria de la declaratoria' })
  @IsString()
  @IsNotEmpty({ message: 'Di por qué se revoca la declaratoria' })
  @MinLength(10, { message: 'Revocar una declaratoria publicada se sustenta' })
  @MaxLength(2000)
  motivo: string;
}
