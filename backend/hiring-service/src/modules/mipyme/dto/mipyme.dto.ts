import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
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
