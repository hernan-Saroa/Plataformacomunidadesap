import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

/** Los campos llegan por multipart, así que todo entra como texto. */
const aBooleano = () =>
  Transform(({ value }) => (typeof value === 'string' ? value === 'true' : value));

export class RegistrarManifestacionDto {
  @ApiProperty({ description: 'Razón social de la MIPYME' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre de la MIPYME es obligatorio' })
  @MaxLength(200)
  nombre: string;

  /**
   * Obligatoria, a diferencia de la de una observación: de contar cuántas
   * MIPYME distintas manifestaron interés depende la decisión, y sin
   * identificación no hay forma de saber si dos son la misma.
   */
  @ApiProperty({ description: 'NIT de la MIPYME', example: '900123456-1' })
  @IsString()
  @IsNotEmpty({ message: 'La identificación es obligatoria para no contar dos veces la misma' })
  @MaxLength(60)
  identificacion: string;

  @ApiProperty({ description: 'Fecha de presentación (YYYY-MM-DD)', example: '2026-08-12' })
  @IsISO8601({ strict: true }, { message: 'La fecha debe tener formato YYYY-MM-DD' })
  fechaPresentacion: string;
}

/**
 * Cambio de una de las dos condiciones (EFDS-1393).
 *
 * Va por JSON y no por multipart: aquí no hay soporte que adjuntar, el
 * fundamento es texto. Por eso tampoco lleva `aBooleano`.
 */
export class GuardarCondicionMipymeDto {
  @ApiProperty({ description: 'Valor de la condición', example: 300 })
  @IsNumber({}, { message: 'El valor debe ser un número' })
  @IsPositive({ message: 'El valor debe ser mayor que cero' })
  valor: number;

  /**
   * Solo la lleva el tope. El mínimo de manifestaciones es un conteo, y darle
   * unidad sugeriría que se puede expresar en salarios mínimos.
   */
  @ApiPropertyOptional({
    description: 'Unidad del tope: SMMLV o PESOS. No aplica al mínimo de manifestaciones',
    enum: ['SMMLV', 'PESOS'],
  })
  @IsOptional()
  @IsIn(['SMMLV', 'PESOS'], { message: 'La unidad debe ser SMMLV o PESOS' })
  unidad?: 'SMMLV' | 'PESOS';

  /**
   * De dónde sale la cifra. Importa especialmente en el tope: el decreto lo
   * expresa en dólares y cualquier equivalente aquí es una derivación.
   */
  @ApiPropertyOptional({
    description: 'Norma o acta que respalda la cifra',
    example: 'Decreto 1082 de 2015, art. 2.2.1.2.4.2.2',
  })
  @IsOptional()
  @IsString()
  fundamento?: string;

  @ApiPropertyOptional({
    description: 'Marca la cifra como validada por la Dirección de Contratación',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  confirmado?: boolean;
}

export class DecidirLimitacionDto {
  @ApiProperty({ description: 'Si la convocatoria queda limitada a MIPYME', example: true })
  @aBooleano()
  @IsBoolean({ message: 'Indica si la convocatoria queda limitada' })
  limitado: boolean;

  /**
   * Obligatorio solo cuando la decisión se aparta del cálculo. Apartarse es
   * legítimo —la entidad decide, no el sistema—, pero hacerlo sin dejar
   * constancia deja el expediente sin explicación.
   */
  @ApiPropertyOptional({
    description: 'Motivo, exigido cuando la decisión difiere de lo que arrojan las condiciones',
  })
  @IsOptional()
  @IsString()
  motivo?: string;
}
