import { Type } from 'class-transformer';
import {
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class SolicitarProrrogaDto {
  /**
   * Días que se agregan al plazo.
   *
   * El tope no es caprichoso: una prórroga de más de mil días no es una
   * prórroga sino un contrato nuevo, y atajar el dedazo aquí evita que alguien
   * extienda tres años lo que quería extender treinta días.
   */
  @Type(() => Number)
  @IsInt({ message: 'Los días de prórroga deben ser un número entero' })
  @Min(1, { message: 'La prórroga debe agregar al menos un día' })
  @Max(1095, { message: 'Una prórroga de más de tres años no es una prórroga' })
  diasProrroga: number;

  /**
   * La justificación técnica que exige RF-MOD-02.
   *
   * Se piden veinte caracteres por la misma razón que en el reporte de
   * incumplimiento: «se necesita más tiempo» no le sirve a quien aprueba.
   */
  @IsString()
  @MinLength(20, {
    message: 'La justificación técnica debe explicar por qué se necesita la prórroga',
  })
  justificacion: string;

  /** Desde cuándo corre el tiempo adicional. */
  @IsISO8601({}, { message: 'La fecha de efecto debe tener formato AAAA-MM-DD' })
  fechaEfecto: string;
}

export class AprobarModificacionDto {
  /** Nota de quien aprueba. Opcional: el acto administrativo ya la sustenta. */
  @IsOptional()
  @IsString()
  observacion?: string;
}

export class RechazarModificacionDto {
  /**
   * Por qué se niega.
   *
   * Obligatorio: quien pidió la prórroga tiene que saber qué corregir para
   * volver a pedirla, y el expediente tiene que explicar por qué el contrato
   * venció sin extenderse.
   */
  @IsString()
  @MinLength(10, { message: 'Explica por qué se niega la prórroga' })
  motivo: string;
}
