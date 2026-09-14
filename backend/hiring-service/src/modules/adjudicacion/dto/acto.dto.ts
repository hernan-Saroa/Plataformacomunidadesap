import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/**
 * Los números llegan como texto dentro del multipart —la petición trae también
 * la resolución firmada— y `FormData` no distingue tipos.
 */
const aNumero = ({ value }: { value: unknown }) => {
  if (value === '' || value === null || value === undefined) return undefined;
  const numero = Number(value);
  return Number.isNaN(numero) ? value : numero;
};

export class AdjudicarDto {
  @ApiProperty({ description: 'Oferta a la que se adjudica' })
  @IsUUID('4', { message: 'El adjudicatario se identifica con el id de su oferta' })
  oferenteId: string;

  @ApiProperty({ description: 'Número de la resolución de adjudicación' })
  @IsString()
  @IsNotEmpty({ message: 'Di el número de la resolución' })
  @MaxLength(60)
  numeroActo: string;

  @ApiProperty({ description: 'Fecha de la resolución (YYYY-MM-DD)' })
  @IsISO8601({ strict: true }, { message: 'La fecha del acto va como YYYY-MM-DD' })
  fechaActo: string;

  /**
   * Por cuánto se adjudica.
   *
   * Puede no ser el valor ofertado ni el evaluado: el acto puede adjudicar por
   * un valor ajustado, y lo que obliga a la entidad es lo que dice el acto.
   */
  @ApiProperty({ description: 'Valor por el que se adjudica' })
  @Transform(aNumero)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El valor adjudicado debe ser un número' })
  @Min(0.01, { message: 'El valor adjudicado tiene que ser mayor que cero' })
  valorAdjudicado: number;

  /**
   * Por qué se adjudica a una oferta distinta de la que ganó la evaluación.
   *
   * Obligatoria solo en ese caso, y el servicio la exige ahí. Lo normal es que
   * se adjudique a la ganadora del informe definitivo; apartarse de eso es
   * legítimo —el ganador que no firma, por ejemplo— pero no puede pasar sin que
   * quede dicho por qué.
   */
  @ApiPropertyOptional({ description: 'Justificación si el adjudicatario no es la ganadora' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  justificacion?: string;
}

export class PublicarActoDto {
  @ApiProperty({ description: 'Dónde se publicó y cómo se notificó el acto' })
  @IsString()
  @IsNotEmpty({ message: 'Di dónde se publicó el acto de adjudicación' })
  @MinLength(10, { message: 'Describe la publicación: una palabra no la prueba' })
  @MaxLength(500)
  medioPublicacion: string;

  /**
   * Cuándo se notificó al adjudicatario, si no fue el mismo día.
   *
   * Opcional: cuando no viene, se toma el instante del registro.
   */
  @ApiPropertyOptional({ description: 'Fecha y hora de la notificación (ISO 8601)' })
  @IsOptional()
  @IsISO8601({ strict: true }, { message: 'La fecha de notificación va en formato ISO 8601' })
  notificadoAt?: string;
}

export class RevocarActoDto {
  @ApiProperty({ description: 'Motivo de la revocatoria del acto' })
  @IsString()
  @IsNotEmpty({ message: 'Di por qué se revoca el acto de adjudicación' })
  @MinLength(10, { message: 'Revocar un acto notificado se sustenta' })
  @MaxLength(2000)
  motivo: string;
}
