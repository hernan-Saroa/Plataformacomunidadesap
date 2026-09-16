import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsIn,
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

import { TipoPiezaAudiencia } from '../../../entities/audiencia-adjudicacion.entity';

/**
 * Los números llegan como texto dentro del multipart —la petición trae también
 * la evidencia— y `FormData` no distingue tipos.
 */
const aNumero = ({ value }: { value: unknown }) => {
  if (value === '' || value === null || value === undefined) return undefined;
  const numero = Number(value);
  return Number.isNaN(numero) ? value : numero;
};

export class CelebrarAudienciaDto {
  /**
   * Cuándo se celebró, con hora.
   *
   * A diferencia de los términos en días hábiles, una audiencia ocurre a una
   * hora concreta y así consta en el acta.
   */
  @ApiProperty({ description: 'Fecha y hora en que se celebró la audiencia (ISO 8601)' })
  @IsISO8601({ strict: true }, { message: 'La fecha de la audiencia va en formato ISO 8601' })
  celebradaAt: string;

  @ApiProperty({ description: 'Quién presidió la audiencia, tal como firma el acta' })
  @IsString()
  @IsNotEmpty({ message: 'Di quién presidió la audiencia' })
  @MaxLength(200)
  presididaPor: string;

  @ApiPropertyOptional({ description: 'Resumen de lo que ocurrió en la audiencia' })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  resumen?: string;
}

export class CargarPiezaAudienciaDto {
  @ApiProperty({ enum: ['GRABACION', 'OBSERVACION', 'ANEXO'] })
  @IsIn(['GRABACION', 'OBSERVACION', 'ANEXO'], {
    message: 'Di qué es: una grabación, una observación con su respuesta, o un anexo',
  })
  tipo: TipoPiezaAudiencia;

  @ApiProperty({ description: 'Qué es lo que se está cargando' })
  @IsString()
  @IsNotEmpty({ message: 'Describe la pieza: una lista de archivos sin decir cuál es cuál no documenta nada' })
  @MaxLength(300)
  descripcion: string;
}

export class AbrirSobreDto {
  @ApiProperty({ description: 'Oferta cuyo sobre económico se abre' })
  @IsUUID('4', { message: 'La oferta se identifica con el id de la que registró el proceso' })
  oferenteId: string;

  /**
   * Lo que traía el sobre.
   *
   * No pisa el valor que la oferta declaró al presentarse: son dos hechos
   * distintos, y que no coincidan es justamente lo que hay que poder ver.
   */
  @ApiProperty({ description: 'Valor que traía el sobre económico' })
  @Transform(aNumero)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El valor del sobre debe ser un número' })
  @Min(0.01, { message: 'El valor del sobre tiene que ser mayor que cero' })
  valorOfertado: number;

  @ApiPropertyOptional({ description: 'Lo que haya que anotar sobre la apertura' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observacion?: string;
}

export class AnularAudienciaDto {
  @ApiProperty({ description: 'Motivo de la anulación de la audiencia' })
  @IsString()
  @IsNotEmpty({ message: 'Di por qué se anula la audiencia' })
  @MinLength(10, { message: 'El motivo de la anulación tiene que explicarse' })
  @MaxLength(1000)
  motivo: string;
}
