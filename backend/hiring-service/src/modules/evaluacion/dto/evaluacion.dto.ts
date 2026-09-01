import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
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
 * el informe— y `FormData` no distingue tipos. Se convierten antes de validar;
 * sin esto `IsNumber` rechazaría siempre. Vacío es "no viene", no cero: un
 * puntaje en blanco significa que la modalidad no puntúa, no que sacó cero.
 */
const aNumero = ({ value }: { value: unknown }) => {
  if (value === '' || value === null || value === undefined) return undefined;
  const numero = Number(value);
  return Number.isNaN(numero) ? value : numero;
};

export class RegistrarResultadoDto {
  @ApiProperty({ description: 'Oferta que el comité eligió como ganadora' })
  @IsUUID('4', { message: 'La ganadora se identifica con el id de la oferta registrada' })
  oferenteId: string;

  /**
   * La nota que reporta el comité, sobre el total que él mismo usó.
   *
   * Opcionales porque no toda modalidad puntúa —en mínima cuantía suele bastar
   * con el menor precio que cumple—, y siempre las dos juntas: el servicio
   * rechaza una sin la otra, porque un 85 sin saber sobre cuánto no dice nada.
   */
  @ApiPropertyOptional({ description: 'Puntaje obtenido por la ganadora' })
  @IsOptional()
  @Transform(aNumero)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El puntaje obtenido debe ser un número' })
  @Min(0, { message: 'El puntaje obtenido no puede ser negativo' })
  puntajeObtenido?: number;

  @ApiPropertyOptional({ description: 'Puntaje máximo de la escala que aplicó el comité' })
  @IsOptional()
  @Transform(aNumero)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El puntaje máximo debe ser un número' })
  @Min(0.01, { message: 'El puntaje máximo tiene que ser mayor que cero' })
  puntajeMaximo?: number;

  /**
   * El valor por el que se evalúa la ganadora.
   *
   * Puede no ser el que el oferente presentó: una corrección aritmética del
   * comité cambia la cifra sin reescribir la oferta.
   */
  @ApiPropertyOptional({ description: 'Valor evaluado de la oferta ganadora' })
  @IsOptional()
  @Transform(aNumero)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El valor evaluado debe ser un número' })
  @Min(0.01, { message: 'El valor evaluado tiene que ser mayor que cero' })
  valorEvaluado?: number;

  /**
   * Por qué esa y no otra.
   *
   * Obligatoria y con largo mínimo: es lo que el traslado del informe (6.4) le
   * muestra a los oferentes que no ganaron, y "cumple" no explica nada.
   */
  @ApiProperty({ description: 'Por qué el comité eligió esa oferta' })
  @IsString()
  @IsNotEmpty({ message: 'Explica por qué el comité eligió esa oferta' })
  @MinLength(20, {
    message: 'La justificación tiene que explicar la decisión, no una palabra suelta',
  })
  @MaxLength(4000)
  justificacion: string;
}

export class RectificarResultadoDto {
  @ApiProperty({ description: 'Por qué se rectifica el resultado registrado' })
  @IsString()
  @IsNotEmpty({ message: 'Explica por qué se rectifica el resultado' })
  @MinLength(10, { message: 'El motivo debe explicar la rectificación, no una palabra suelta' })
  @MaxLength(1000)
  motivo: string;
}

export class CargarEvidenciaDto {
  /** Qué es el archivo: una lista de adjuntos sin decir cuál es cuál no sustenta nada. */
  @ApiProperty({ description: 'Qué documento se está cargando' })
  @IsString()
  @IsNotEmpty({ message: 'Dí qué documento estás cargando' })
  @Type(() => String)
  @MaxLength(300)
  descripcion: string;
}
