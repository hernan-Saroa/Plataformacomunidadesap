import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const DIMENSIONES = ['JURIDICO', 'FINANCIERO', 'TECNICO', 'ECONOMICO'];
const TIPOS = ['HABILITANTE', 'PONDERABLE'];

export class CrearCriterioDto {
  /**
   * Nula significa que el criterio aplica a todas las modalidades.
   *
   * Se admite el vacío además del nulo porque un `<select>` sin selección
   * manda cadena vacía, y rechazar ahí obligaría a la pantalla a traducir.
   */
  @ApiPropertyOptional({
    description: 'Modalidad a la que aplica. Vacío o nulo: aplica a todas',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  modalidad?: string | null;

  @ApiProperty({ description: 'Dimensión de la evaluación', enum: DIMENSIONES })
  @IsIn(DIMENSIONES, {
    message: 'La dimensión es JURIDICO, FINANCIERO, TECNICO o ECONOMICO',
  })
  dimension: 'JURIDICO' | 'FINANCIERO' | 'TECNICO' | 'ECONOMICO';

  @ApiProperty({ description: 'Habilitante deja pasar; ponderable suma', enum: TIPOS })
  @IsIn(TIPOS, {
    message:
      'El tipo es HABILITANTE, que decide si la oferta sigue en carrera, o PONDERABLE, que suma puntaje',
  })
  tipo: 'HABILITANTE' | 'PONDERABLE';

  @ApiProperty({ description: 'Cómo se llama el criterio en el pliego' })
  @IsString()
  @MinLength(3, { message: 'El nombre del criterio es lo que ve el evaluador: no puede ir vacío' })
  @MaxLength(200)
  nombre: string;

  @ApiPropertyOptional({ description: 'Qué se verifica exactamente' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  descripcion?: string;

  /** Solo en los ponderables; el servicio rechaza la combinación incoherente. */
  @ApiPropertyOptional({ description: 'Puntaje máximo. Solo en criterios ponderables' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El puntaje máximo debe ser un número' })
  @Min(0.01, { message: 'Un ponderable con puntaje cero no pondera nada' })
  puntajeMaximo?: number | null;

  @ApiPropertyOptional({ description: 'Posición en la lista que ve el evaluador' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El orden es un número entero' })
  @Min(0)
  orden?: number;

  @ApiPropertyOptional({ description: 'De dónde sale el criterio: norma, pliego o mesa de trabajo' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  fundamento?: string;

  /**
   * Solo lo marca quien ratifica, no quien redacta.
   *
   * Se admite al crear porque la Dirección de Contratación puede estar
   * transcribiendo un criterio que ya viene ratificado, pero por omisión un
   * criterio nace sin confirmar.
   */
  @ApiPropertyOptional({ description: 'Si la Dirección de Contratación ya lo ratificó' })
  @IsOptional()
  @IsBoolean()
  confirmado?: boolean;
}

/**
 * Todo opcional: la pantalla manda solo lo que el usuario tocó.
 *
 * La dimensión, el tipo y la modalidad se pueden corregir mientras nadie haya
 * evaluado con el criterio; el servicio es quien conoce esa condición.
 */
export class ActualizarCriterioDto {
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  modalidad?: string | null;

  @ApiPropertyOptional({ enum: DIMENSIONES })
  @IsOptional()
  @IsIn(DIMENSIONES, {
    message: 'La dimensión es JURIDICO, FINANCIERO, TECNICO o ECONOMICO',
  })
  dimension?: 'JURIDICO' | 'FINANCIERO' | 'TECNICO' | 'ECONOMICO';

  @ApiPropertyOptional({ enum: TIPOS })
  @IsOptional()
  @IsIn(TIPOS, { message: 'El tipo es HABILITANTE o PONDERABLE' })
  tipo?: 'HABILITANTE' | 'PONDERABLE';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'El nombre del criterio es lo que ve el evaluador: no puede ir vacío' })
  @MaxLength(200)
  nombre?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  descripcion?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El puntaje máximo debe ser un número' })
  @Min(0.01, { message: 'Un ponderable con puntaje cero no pondera nada' })
  puntajeMaximo?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El orden es un número entero' })
  @Min(0)
  orden?: number;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  fundamento?: string | null;

  /**
   * Sin decir nada, editar un criterio lo deja sin confirmar.
   *
   * La confirmación es sobre un texto y una cifra concretos, no sobre la fila:
   * cambiar el puntaje y conservar la marca presentaría como ratificado algo
   * que la Dirección de Contratación no vio.
   */
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  confirmado?: boolean;
}

export class CambiarActivoCriterioDto {
  @ApiProperty({ description: 'False retira el criterio de las evaluaciones nuevas' })
  @IsBoolean({ message: 'Indique si el criterio queda activo o no' })
  activo: boolean;
}
